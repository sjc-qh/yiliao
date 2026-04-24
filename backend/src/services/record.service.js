import { pool, withTransaction } from "../config/db.js";
import {
  endOfDay,
  formatDate,
  formatDateTime,
  formatDurationMinutes,
  getWeekdayLabel,
  startOfDay,
} from "../utils/date.js";
import {
  appError,
  ensureBindingExists,
  ensurePositiveInt,
  getTodayTrainingSummary,
  recalculateDailyPlanStatus,
} from "./common.service.js";

const TARGET_MINUTES_PER_DAY = 40;

function mapRecordListRows(rows) {
  const groupedMap = new Map();
  const todayKey = formatDate(new Date());
  let todayTotalMinutes = 0;
  const todayDetails = [];

  for (const row of rows) {
    const dateKey = formatDate(row.start_time);
    if (!groupedMap.has(dateKey)) {
      groupedMap.set(dateKey, {
        date: dateKey,
        dayOfWeek: getWeekdayLabel(row.start_time),
        trainings: [],
      });
    }

    const targetSeconds = Number(row.suggested_duration_seconds || row.duration_seconds || 0);
    const actualSeconds = Number(row.actual_duration_seconds || 0);
    const completionRate = targetSeconds > 0 ? Math.min(100, Math.round((actualSeconds / targetSeconds) * 100)) : 0;
    const training = {
      id: row.id,
      title: row.title,
      duration: formatDurationMinutes(actualSeconds),
      completed: Number(row.completed || 0) === 1,
      targetDuration: Math.max(1, Math.round(targetSeconds / 60)),
      actualDuration: Math.max(0, Math.round(actualSeconds / 60)),
      completionRate,
      source: row.source,
    };
    groupedMap.get(dateKey).trainings.push(training);

    if (dateKey === todayKey) {
      todayTotalMinutes += training.actualDuration;
      todayDetails.push({
        title: training.title,
        duration: training.actualDuration,
      });
    }
  }

  const records = Array.from(groupedMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  const todayDurationPercentage = todayDetails.map((item) => ({
    title: item.title,
    duration: item.duration,
    percentage: todayTotalMinutes > 0 ? Math.round((item.duration / todayTotalMinutes) * 100) : 0,
  }));

  return {
    records,
    stats: {
      todayTotalMinutes,
      todayCompletionRate:
        TARGET_MINUTES_PER_DAY > 0 ? Math.round((todayTotalMinutes / TARGET_MINUTES_PER_DAY) * 100) : 0,
      todayDurationPercentage,
      targetMinutesPerDay: TARGET_MINUTES_PER_DAY,
    },
  };
}

async function queryTrainingRecordRows(elderId, days, connection = pool) {
  const safeDays = Math.min(ensurePositiveInt(days, 7), 365);
  const startDate = startOfDay(new Date());
  startDate.setDate(startDate.getDate() - (safeDays - 1));
  const endDate = endOfDay(new Date());

  const [rows] = await connection.execute(
    `SELECT tr.id, tr.start_time, tr.end_time, tr.actual_duration_seconds, tr.completed, tr.source,
            tr.daily_plan_id, tr.daily_plan_item_id, v.id AS video_id, v.title, v.duration_seconds,
            dpi.suggested_duration_seconds
     FROM training_records tr
     JOIN training_videos v ON v.id = tr.video_id
     LEFT JOIN daily_plan_items dpi ON dpi.id = tr.daily_plan_item_id
     WHERE tr.elder_id = ? AND tr.start_time BETWEEN ? AND ?
     ORDER BY tr.start_time DESC, tr.id DESC`,
    [elderId, formatDateTime(startDate), formatDateTime(endDate)],
  );

  return rows;
}

export async function listElderTrainingRecords(elderId, days = 7) {
  const rows = await queryTrainingRecordRows(elderId, days);
  return mapRecordListRows(rows);
}

export async function createTrainingRecord(elderId, payload) {
  const videoId = ensurePositiveInt(payload.video_id || payload.videoId, 0);
  const dailyPlanItemId = ensurePositiveInt(payload.daily_plan_item_id || payload.dailyPlanItemId, 0) || null;
  const explicitDailyPlanId = ensurePositiveInt(payload.daily_plan_id || payload.dailyPlanId, 0) || null;
  const actualDurationSeconds = Math.max(1, Number.parseInt(String(payload.actual_duration_seconds || 0), 10) || 0);
  const completed = payload.completed === true || payload.completed === 1;
  const source = String(payload.source || "free_training");
  const startTime = payload.start_time ? new Date(payload.start_time) : new Date();
  const endTime = payload.end_time ? new Date(payload.end_time) : new Date();

  if (!videoId) {
    throw appError(400, "视频ID不能为空");
  }

  return withTransaction(async (connection) => {
    const [videoRows] = await connection.execute(
      "SELECT id, status FROM training_videos WHERE id = ? LIMIT 1",
      [videoId],
    );
    const video = videoRows[0];
    if (!video || Number(video.status) !== 1) {
      throw appError(404, "视频不存在");
    }

    let dailyPlanId = explicitDailyPlanId;
    let planItem = null;
    if (dailyPlanItemId) {
      const [itemRows] = await connection.execute(
        `SELECT dpi.id, dpi.daily_plan_id, dp.elder_id
         FROM daily_plan_items dpi
         JOIN daily_plans dp ON dp.id = dpi.daily_plan_id
         WHERE dpi.id = ?
         LIMIT 1`,
        [dailyPlanItemId],
      );
      planItem = itemRows[0];
      if (!planItem || Number(planItem.elder_id) !== Number(elderId)) {
        throw appError(403, "计划项不存在或无权访问");
      }
      dailyPlanId = planItem.daily_plan_id;
    }

    const [result] = await connection.execute(
      `INSERT INTO training_records (
         elder_id, daily_plan_id, daily_plan_item_id, video_id, start_time, end_time,
         actual_duration_seconds, completed, source, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        elderId,
        dailyPlanId,
        dailyPlanItemId,
        videoId,
        formatDateTime(startTime),
        formatDateTime(endTime),
        actualDurationSeconds,
        completed ? 1 : 0,
        source,
      ],
    );

    if (completed && planItem) {
      await connection.execute(
        `UPDATE daily_plan_items
         SET status = 'completed', completed_at = NOW()
         WHERE id = ?`,
        [dailyPlanItemId],
      );
      await recalculateDailyPlanStatus(dailyPlanId, connection);
    }

    return { id: result.insertId };
  });
}

export async function startTrainingRecord(elderId, payload) {
  const videoId = ensurePositiveInt(payload.video_id || payload.videoId, 0);
  const dailyPlanItemId = ensurePositiveInt(payload.daily_plan_item_id || payload.dailyPlanItemId, 0) || null;
  const dailyPlanId = ensurePositiveInt(payload.daily_plan_id || payload.dailyPlanId, 0) || null;
  const source = String(payload.source || "free_training");
  const startTime = payload.start_time ? new Date(payload.start_time) : new Date();

  if (!videoId) {
    throw appError(400, "视频ID不能为空");
  }

  const [result] = await pool.execute(
    `INSERT INTO training_records (
       elder_id, daily_plan_id, daily_plan_item_id, video_id, start_time, end_time,
       actual_duration_seconds, completed, source, created_at
     ) VALUES (?, ?, ?, ?, ?, NULL, 0, 0, ?, NOW())`,
    [elderId, dailyPlanId, dailyPlanItemId, videoId, formatDateTime(startTime), source],
  );
  return { id: result.insertId };
}

export async function finishTrainingRecord(elderId, recordId, payload) {
  const id = ensurePositiveInt(recordId, 0);
  if (!id) {
    throw appError(400, "训练记录ID无效");
  }

  return withTransaction(async (tx) => {
    const [rows] = await tx.execute(
      `SELECT id, elder_id, daily_plan_id, daily_plan_item_id
       FROM training_records
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    const record = rows[0];
    if (!record || Number(record.elder_id) !== Number(elderId)) {
      throw appError(404, "训练记录不存在");
    }

    const completed = payload.completed === true || payload.completed === 1 ? 1 : 0;
    const endTime = payload.end_time ? new Date(payload.end_time) : new Date();
    const duration = Math.max(
      1,
      Number.parseInt(String(payload.actual_duration_seconds || payload.actualDurationSeconds || 0), 10) || 0,
    );

    await tx.execute(
      `UPDATE training_records
       SET end_time = ?, actual_duration_seconds = ?, completed = ?
       WHERE id = ?`,
      [formatDateTime(endTime), duration, completed, id],
    );

    if (completed && record.daily_plan_item_id) {
      await tx.execute(
        `UPDATE daily_plan_items
         SET status = 'completed', completed_at = NOW()
         WHERE id = ?`,
        [record.daily_plan_item_id],
      );
      if (record.daily_plan_id) {
        await recalculateDailyPlanStatus(record.daily_plan_id, tx);
      }
    }

    return { id, completed };
  });
}

async function getTrainingRecordDetailInternal(elderId, recordId) {
  const id = ensurePositiveInt(recordId, 0);
  const [rows] = await pool.execute(
    `SELECT tr.id, tr.elder_id, tr.daily_plan_id, tr.daily_plan_item_id, tr.video_id, tr.start_time, tr.end_time,
            tr.actual_duration_seconds, tr.completed, tr.source,
            tv.title AS video_title,
            dp.plan_date, dp.status AS daily_plan_status, dp.template_day_no,
            dpi.order_no, dpi.status AS daily_plan_item_status, dpi.suggested_duration_seconds, dpi.repeat_count
     FROM training_records tr
     JOIN training_videos tv ON tv.id = tr.video_id
     LEFT JOIN daily_plans dp ON dp.id = tr.daily_plan_id
     LEFT JOIN daily_plan_items dpi ON dpi.id = tr.daily_plan_item_id
     WHERE tr.id = ? AND tr.elder_id = ?
     LIMIT 1`,
    [id, elderId],
  );
  const row = rows[0];
  if (!row) {
    throw appError(404, "训练记录不存在");
  }

  return {
    id: row.id,
    videoId: row.video_id,
    videoTitle: row.video_title,
    source: row.source,
    completed: Number(row.completed || 0),
    startTime: row.start_time,
    endTime: row.end_time,
    actualDurationSeconds: Number(row.actual_duration_seconds || 0),
    dailyPlan: row.daily_plan_id
      ? {
          id: row.daily_plan_id,
          planDate: formatDate(row.plan_date),
          status: row.daily_plan_status,
          templateDayNo: Number(row.template_day_no || 0),
        }
      : null,
    dailyPlanItem: row.daily_plan_item_id
      ? {
          id: row.daily_plan_item_id,
          orderNo: Number(row.order_no || 0),
          status: row.daily_plan_item_status,
          suggestedDurationSeconds: Number(row.suggested_duration_seconds || 0),
          repeatCount: Number(row.repeat_count || 0),
        }
      : null,
  };
}

export async function getElderTrainingRecordDetail(elderId, recordId) {
  return getTrainingRecordDetailInternal(elderId, recordId);
}

export async function getChildTrainingRecordDetail(childId, elderId, recordId) {
  await ensureBindingExists(childId, elderId);
  return getTrainingRecordDetailInternal(elderId, recordId);
}

async function buildTrainingTrend(elderId, days = 7) {
  const safeDays = Math.min(ensurePositiveInt(days, 7), 365);
  const start = startOfDay(new Date());
  start.setDate(start.getDate() - (safeDays - 1));
  const end = endOfDay(new Date());

  const [recordRows] = await pool.execute(
    `SELECT DATE(start_time) AS record_date, COUNT(*) AS record_count, SUM(actual_duration_seconds) AS total_duration
     FROM training_records
     WHERE elder_id = ? AND start_time BETWEEN ? AND ?
     GROUP BY DATE(start_time)`,
    [elderId, formatDateTime(start), formatDateTime(end)],
  );
  const [planRows] = await pool.execute(
    `SELECT plan_date, status
     FROM daily_plans
     WHERE elder_id = ? AND plan_date BETWEEN ? AND ?`,
    [elderId, formatDate(start), formatDate(end)],
  );

  const recordMap = new Map(
    recordRows.map((row) => [
      formatDate(row.record_date),
      {
        recordCount: Number(row.record_count || 0),
        durationSeconds: Number(row.total_duration || 0),
      },
    ]),
  );
  const planMap = new Map(planRows.map((row) => [formatDate(row.plan_date), row.status]));

  const points = [];
  let trainedDays = 0;
  let completedPlanDays = 0;
  let totalDurationSeconds = 0;

  for (let i = 0; i < safeDays; i += 1) {
    const dateValue = new Date(start);
    dateValue.setDate(start.getDate() + i);
    const date = formatDate(dateValue);
    const record = recordMap.get(date) || { recordCount: 0, durationSeconds: 0 };
    const completedPlan = planMap.get(date) === "completed";
    const trained = record.recordCount > 0;

    if (trained) {
      trainedDays += 1;
    }
    if (completedPlan) {
      completedPlanDays += 1;
    }
    totalDurationSeconds += record.durationSeconds;

    points.push({
      date,
      trained,
      recordCount: record.recordCount,
      completedPlan,
      durationSeconds: record.durationSeconds,
    });
  }

  return {
    elderId,
    range: {
      startDate: formatDate(start),
      endDate: formatDate(end),
    },
    points,
    summary: {
      trainedDays,
      completedPlanDays,
      totalDurationSeconds,
    },
  };
}

export async function getElderTrainingTrend(elderId, days = 7) {
  return buildTrainingTrend(elderId, days);
}

export async function listChildTrainingRecords(childId, elderId, days = 7) {
  await ensureBindingExists(childId, elderId);
  return listElderTrainingRecords(elderId, days);
}

export async function getChildTrainingTrend(childId, elderId, days = 7) {
  await ensureBindingExists(childId, elderId);
  return buildTrainingTrend(elderId, days);
}

export async function getChildWeeklySummary(childId, elderId) {
  await ensureBindingExists(childId, elderId);
  const trend = await buildTrainingTrend(elderId, 7);
  return {
    elderId,
    range: trend.range,
    summary: trend.summary,
  };
}

export async function getChildTodaySummary(childId, elderId) {
  await ensureBindingExists(childId, elderId);
  const summary = await getTodayTrainingSummary(pool, elderId);
  return {
    elderId,
    ...summary,
  };
}

export async function getRecentTrainingRecords(elderId, limit = 3) {
  const safeLimit = Math.min(ensurePositiveInt(limit, 3), 20);
  const [rows] = await pool.query(
    `SELECT tr.id, tr.start_time, tr.actual_duration_seconds, tr.completed, tv.title
     FROM training_records tr
     JOIN training_videos tv ON tv.id = tr.video_id
     WHERE tr.elder_id = ?
     ORDER BY tr.start_time DESC, tr.id DESC
     LIMIT ?`,
    [elderId, safeLimit],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: formatDate(row.start_time),
    duration: formatDurationMinutes(row.actual_duration_seconds),
    completed: Number(row.completed || 0) === 1,
  }));
}
