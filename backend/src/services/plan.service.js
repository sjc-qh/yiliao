import { pool, withTransaction } from "../config/db.js";
import { formatDate, formatDateTime, formatDurationMinutes } from "../utils/date.js";
import {
  appError,
  ensurePositiveInt,
  getActiveAssignmentByElder,
  recalculateDailyPlanStatus,
  summarizePlanStatus,
} from "./common.service.js";

function normalizeTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    level_tag: row.level_tag || "",
    duration_days: Number(row.duration_days || 0),
    status: Number(row.status || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getDailyPlanRow(elderId, planDate, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, elder_id, assignment_id, template_id, template_day_no, plan_date, source_type, status, created_at, updated_at
     FROM daily_plans
     WHERE elder_id = ? AND plan_date = ?
     LIMIT 1`,
    [elderId, planDate],
  );
  return rows[0] || null;
}

async function loadTodayPlanItems(dailyPlanId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, template_item_id, video_id, title_snapshot, order_no, suggested_duration_seconds,
            repeat_count, status, completed_at, carried_from_item_id, created_at
     FROM daily_plan_items
     WHERE daily_plan_id = ?
     ORDER BY order_no ASC, id ASC`,
    [dailyPlanId],
  );
  return rows.map((item) => ({
    id: item.id,
    template_item_id: item.template_item_id,
    video_id: item.video_id,
    title: item.title_snapshot,
    order_no: Number(item.order_no || 0),
    suggested_duration_seconds: Number(item.suggested_duration_seconds || 0),
    repeat_count: Number(item.repeat_count || 0),
    status: item.status,
    completed_at: item.completed_at,
    carried_from_item_id: item.carried_from_item_id,
    created_at: item.created_at,
  }));
}

async function buildTodayPlanSummary(plan, connection = pool) {
  const items = await loadTodayPlanItems(plan.id, connection);
  const trainingList = items.map((item) => ({
    id: String(item.id),
    title: item.title,
    duration: formatDurationMinutes(item.suggested_duration_seconds),
    order: item.order_no,
    completed: item.status === "completed",
    current: false,
  }));
  const completedCount = trainingList.filter((item) => item.completed).length;
  const totalCount = trainingList.length;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const currentIndex = trainingList.findIndex((item) => !item.completed);
  if (currentIndex >= 0) {
    trainingList[currentIndex].current = true;
  }

  return {
    date: formatDate(plan.plan_date),
    totalDuration: formatDurationMinutes(
      items.reduce((sum, item) => sum + Number(item.suggested_duration_seconds || 0), 0),
    ),
    completedCount,
    totalCount,
    progress,
    trainingList,
  };
}

async function buildTodayPlanDetail(plan, connection = pool) {
  const items = await loadTodayPlanItems(plan.id, connection);
  return {
    id: plan.id,
    elder_id: plan.elder_id,
    assignment_id: plan.assignment_id,
    template_id: plan.template_id,
    template_day_no: Number(plan.template_day_no || 0),
    plan_date: formatDate(plan.plan_date),
    source_type: plan.source_type,
    status: summarizePlanStatus(items.map((item) => item.status)),
    items: items.map((item) => ({
      id: item.id,
      template_item_id: item.template_item_id,
      video_id: item.video_id,
      title: item.title,
      order_no: item.order_no,
      suggested_duration_seconds: item.suggested_duration_seconds,
      repeat_count: item.repeat_count,
      status: item.status,
      carried_from_item_id: item.carried_from_item_id,
      completed_at: item.completed_at,
    })),
  };
}

async function createDailyPlanFromAssignment(elderId, connection = pool) {
  const today = formatDate(new Date());
  const existingPlan = await getDailyPlanRow(elderId, today, connection);
  if (existingPlan) {
    return existingPlan;
  }

  const assignment = await getActiveAssignmentByElder(elderId, connection);
  if (!assignment) {
    return null;
  }

  const [previousPlanRows] = await connection.execute(
    `SELECT id
     FROM daily_plans
     WHERE elder_id = ? AND plan_date < ?
     ORDER BY plan_date DESC, id DESC
     LIMIT 1`,
    [elderId, today],
  );

  let carryItems = [];
  if (previousPlanRows[0]) {
    const [pendingItems] = await connection.execute(
      `SELECT id, template_item_id, video_id, title_snapshot, suggested_duration_seconds, repeat_count
       FROM daily_plan_items
       WHERE daily_plan_id = ? AND status = 'pending'
       ORDER BY order_no ASC, id ASC`,
      [previousPlanRows[0].id],
    );
    carryItems = pendingItems;
  }

  let sourceType = "carry_only";
  let templateDayNo = 0;
  let templateItems = [];
  let shouldAdvanceAssignment = false;

  if (!carryItems.length && Number(assignment.next_day_no || 0) <= Number(assignment.duration_days || 0)) {
    const [templateRows] = await connection.execute(
      `SELECT pti.id, pti.video_id, pti.order_no, pti.suggested_duration_seconds, pti.repeat_count, tv.title
       FROM plan_template_items pti
       JOIN training_videos tv ON tv.id = pti.video_id
       WHERE pti.template_id = ? AND pti.day_no = ?
       ORDER BY pti.order_no ASC, pti.id ASC`,
      [assignment.template_id, assignment.next_day_no],
    );
    templateItems = templateRows;
    if (templateItems.length) {
      sourceType = "template";
      templateDayNo = Number(assignment.next_day_no || 0);
      shouldAdvanceAssignment = true;
    }
  }

  if (!carryItems.length && !templateItems.length) {
    return null;
  }

  return withTransaction(async (tx) => {
    const [result] = await tx.execute(
      `INSERT INTO daily_plans (
         elder_id, assignment_id, template_id, template_day_no, plan_date, source_type, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [elderId, assignment.id, assignment.template_id, templateDayNo, today, sourceType],
    );

    let orderNo = 1;
    for (const item of carryItems) {
      await tx.execute(
        `INSERT INTO daily_plan_items (
           daily_plan_id, template_item_id, video_id, title_snapshot, order_no,
           suggested_duration_seconds, repeat_count, status, carried_from_item_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
        [
          result.insertId,
          item.template_item_id,
          item.video_id,
          item.title_snapshot,
          orderNo,
          item.suggested_duration_seconds,
          item.repeat_count,
          item.id,
        ],
      );
      orderNo += 1;
    }

    for (const item of templateItems) {
      await tx.execute(
        `INSERT INTO daily_plan_items (
           daily_plan_id, template_item_id, video_id, title_snapshot, order_no,
           suggested_duration_seconds, repeat_count, status, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          result.insertId,
          item.id,
          item.video_id,
          item.title,
          orderNo,
          item.suggested_duration_seconds,
          item.repeat_count,
        ],
      );
      orderNo += 1;
    }

    if (shouldAdvanceAssignment) {
      await tx.execute(
        `UPDATE elder_plan_assignments
         SET next_day_no = next_day_no + 1, last_plan_date = ?, updated_at = NOW()
         WHERE id = ?`,
        [today, assignment.id],
      );
    }

    return getDailyPlanRow(elderId, today, tx);
  });
}

export async function getTodayPlanSummary(elderId) {
  const today = formatDate(new Date());
  const plan = (await getDailyPlanRow(elderId, today)) || (await createDailyPlanFromAssignment(elderId));
  if (!plan) {
    const [videoRows] = await pool.execute(
      `SELECT id, title, duration_seconds FROM training_videos WHERE status = 1 ORDER BY id ASC LIMIT 40`,
    );
    const defaultTrainingList = videoRows.map((video, index) => ({
      id: String(video.id),
      title: video.title,
      duration: formatDurationMinutes(video.duration_seconds),
      order: index + 1,
      completed: false,
      current: false,
    }));
    const totalSeconds = videoRows.reduce((sum, v) => sum + Number(v.duration_seconds || 0), 0);
    return {
      date: today,
      totalDuration: formatDurationMinutes(totalSeconds),
      completedCount: 0,
      totalCount: videoRows.length,
      progress: 0,
      trainingList: defaultTrainingList,
    };
  }
  return buildTodayPlanSummary(plan);
}

export async function getTodayPlanDetail(elderId) {
  const today = formatDate(new Date());
  const plan = (await getDailyPlanRow(elderId, today)) || (await createDailyPlanFromAssignment(elderId));
  if (!plan) {
    return null;
  }
  return buildTodayPlanDetail(plan);
}

export async function generateTodayPlan(elderId) {
  const plan = await getTodayPlanDetail(elderId);
  if (!plan) {
    throw appError(404, "当前没有可生成的计划");
  }
  return plan;
}

export async function activateTodayTemplate(elderId) {
  const today = formatDate(new Date());
  const plan = await getDailyPlanRow(elderId, today);
  if (!plan) {
    throw appError(404, "今日计划不存在");
  }
  if (plan.source_type !== "carry_only") {
    throw appError(400, "当前计划无需单独开启模板训练");
  }

  const currentItems = await loadTodayPlanItems(plan.id);
  if (currentItems.some((item) => item.status === "pending")) {
    throw appError(400, "请先处理完顺延项，再开启今日模板训练");
  }

  const assignment = await getActiveAssignmentByElder(elderId);
  if (!assignment) {
    throw appError(404, "未找到生效中的模板分配");
  }
  if (Number(assignment.next_day_no || 0) > Number(assignment.duration_days || 0)) {
    throw appError(400, "当前模板已无可用的后续训练日");
  }

  return withTransaction(async (tx) => {
    const [templateRows] = await tx.execute(
      `SELECT pti.id, pti.video_id, pti.order_no, pti.suggested_duration_seconds, pti.repeat_count, tv.title
       FROM plan_template_items pti
       JOIN training_videos tv ON tv.id = pti.video_id
       WHERE pti.template_id = ? AND pti.day_no = ?
       ORDER BY pti.order_no ASC, pti.id ASC`,
      [assignment.template_id, assignment.next_day_no],
    );
    if (!templateRows.length) {
      throw appError(400, "当前模板日没有配置训练项");
    }

    // 顺延项计划在首次进入时不会自动叠加当天模板项。这里等老人主动确认后，再把当天模板项追加进去。
    let orderNo = currentItems.length + 1;
    for (const item of templateRows) {
      await tx.execute(
        `INSERT INTO daily_plan_items (
           daily_plan_id, template_item_id, video_id, title_snapshot, order_no,
           suggested_duration_seconds, repeat_count, status, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [
          plan.id,
          item.id,
          item.video_id,
          item.title,
          orderNo,
          item.suggested_duration_seconds,
          item.repeat_count,
        ],
      );
      orderNo += 1;
    }

    await tx.execute(
      `UPDATE daily_plans
       SET source_type = 'mixed', template_day_no = ?, status = 'in_progress', updated_at = NOW()
       WHERE id = ?`,
      [assignment.next_day_no, plan.id],
    );

    await tx.execute(
      `UPDATE elder_plan_assignments
       SET next_day_no = next_day_no + 1, last_plan_date = ?, updated_at = NOW()
       WHERE id = ?`,
      [today, assignment.id],
    );

    const nextPlan = await getDailyPlanRow(elderId, today, tx);
    return buildTodayPlanDetail(nextPlan, tx);
  });
}

export async function completeTodayPlanItem(elderId, itemId) {
  const id = ensurePositiveInt(itemId, 0);
  if (!id) {
    throw appError(400, "计划项ID无效");
  }

  return withTransaction(async (tx) => {
    const [rows] = await tx.execute(
      `SELECT dpi.id, dpi.daily_plan_id
       FROM daily_plan_items dpi
       JOIN daily_plans dp ON dp.id = dpi.daily_plan_id
       WHERE dpi.id = ? AND dp.elder_id = ?
       LIMIT 1`,
      [id, elderId],
    );
    const item = rows[0];
    if (!item) {
      throw appError(404, "计划项不存在");
    }

    await tx.execute(
      `UPDATE daily_plan_items
       SET status = 'completed', completed_at = NOW()
       WHERE id = ?`,
      [id],
    );
    await recalculateDailyPlanStatus(item.daily_plan_id, tx);

    const [planRows] = await tx.execute(
      "SELECT * FROM daily_plans WHERE id = ? LIMIT 1",
      [item.daily_plan_id],
    );
    return buildTodayPlanDetail(planRows[0], tx);
  });
}

export async function skipTodayPlanItem(elderId, itemId) {
  const id = ensurePositiveInt(itemId, 0);
  if (!id) {
    throw appError(400, "计划项ID无效");
  }

  return withTransaction(async (tx) => {
    const [rows] = await tx.execute(
      `SELECT dpi.id, dpi.daily_plan_id
       FROM daily_plan_items dpi
       JOIN daily_plans dp ON dp.id = dpi.daily_plan_id
       WHERE dpi.id = ? AND dp.elder_id = ?
       LIMIT 1`,
      [id, elderId],
    );
    const item = rows[0];
    if (!item) {
      throw appError(404, "计划项不存在");
    }

    await tx.execute(
      `UPDATE daily_plan_items
       SET status = 'skipped', completed_at = NOW()
       WHERE id = ?`,
      [id],
    );
    await recalculateDailyPlanStatus(item.daily_plan_id, tx);

    const [planRows] = await tx.execute(
      "SELECT * FROM daily_plans WHERE id = ? LIMIT 1",
      [item.daily_plan_id],
    );
    return buildTodayPlanDetail(planRows[0], tx);
  });
}

export async function listTemplates(query = {}) {
  const sql = [
    `SELECT id, name, description, level_tag, duration_days, status, created_at, updated_at
     FROM plan_templates
     WHERE 1 = 1`,
  ];
  const params = [];
  if (query.status !== undefined && query.status !== "") {
    sql.push("AND status = ?");
    params.push(Number.parseInt(String(query.status), 10) || 0);
  }
  if (query.keyword) {
    sql.push("AND name LIKE ?");
    params.push(`%${String(query.keyword).trim()}%`);
  }
  sql.push("ORDER BY created_at DESC, id DESC");

  const [rows] = await pool.execute(sql.join(" "), params);
  return rows.map(normalizeTemplate);
}

export async function createTemplate(payload) {
  const name = String(payload.name || "").trim();
  if (!name) {
    throw appError(400, "模板名称不能为空");
  }
  const durationDays = ensurePositiveInt(payload.duration_days || payload.durationDays, 0);
  if (!durationDays) {
    throw appError(400, "模板天数不能为空");
  }

  const [result] = await pool.execute(
    `INSERT INTO plan_templates (name, description, level_tag, duration_days, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      name,
      String(payload.description || "").trim() || null,
      String(payload.level_tag || payload.levelTag || "").trim() || null,
      durationDays,
      payload.status === 0 ? 0 : 1,
    ],
  );
  return getTemplateDetail(result.insertId);
}

export async function getTemplateDetail(templateId) {
  const id = ensurePositiveInt(templateId, 0);
  if (!id) {
    throw appError(400, "模板ID无效");
  }

  const [rows] = await pool.execute("SELECT * FROM plan_templates WHERE id = ? LIMIT 1", [id]);
  if (!rows[0]) {
    throw appError(404, "模板不存在");
  }
  const [itemRows] = await pool.execute(
    `SELECT pti.*, tv.title AS video_title
     FROM plan_template_items pti
     JOIN training_videos tv ON tv.id = pti.video_id
     WHERE pti.template_id = ?
     ORDER BY pti.day_no ASC, pti.order_no ASC, pti.id ASC`,
    [id],
  );

  return {
    ...normalizeTemplate(rows[0]),
    items: itemRows.map((item) => ({
      id: item.id,
      template_id: item.template_id,
      day_no: Number(item.day_no || 0),
      order_no: Number(item.order_no || 0),
      video_id: item.video_id,
      video_title: item.video_title,
      suggested_duration_seconds: Number(item.suggested_duration_seconds || 0),
      repeat_count: Number(item.repeat_count || 0),
      created_at: item.created_at,
    })),
  };
}

export async function updateTemplate(templateId, payload) {
  const id = ensurePositiveInt(templateId, 0);
  if (!id) {
    throw appError(400, "模板ID无效");
  }

  const durationDays = ensurePositiveInt(payload.duration_days || payload.durationDays, 0);
  await pool.execute(
    `UPDATE plan_templates
     SET name = ?, description = ?, level_tag = ?, duration_days = ?, status = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      String(payload.name || "").trim(),
      String(payload.description || "").trim() || null,
      String(payload.level_tag || payload.levelTag || "").trim() || null,
      durationDays,
      payload.status === 0 ? 0 : 1,
      id,
    ],
  );
  return getTemplateDetail(id);
}

export async function createTemplateItem(templateId, payload) {
  const id = ensurePositiveInt(templateId, 0);
  const dayNo = ensurePositiveInt(payload.day_no || payload.dayNo, 0);
  const orderNo = ensurePositiveInt(payload.order_no || payload.orderNo, 0);
  const videoId = ensurePositiveInt(payload.video_id || payload.videoId, 0);
  if (!id || !dayNo || !orderNo || !videoId) {
    throw appError(400, "模板项参数不完整");
  }

  await pool.execute(
    `INSERT INTO plan_template_items (
       template_id, day_no, order_no, video_id, suggested_duration_seconds, repeat_count, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      id,
      dayNo,
      orderNo,
      videoId,
      ensurePositiveInt(payload.suggested_duration_seconds || payload.suggestedDurationSeconds, 0) || null,
      ensurePositiveInt(payload.repeat_count || payload.repeatCount, 0) || null,
    ],
  );
  return getTemplateDetail(id);
}

export async function updateTemplateItem(templateId, itemId, payload) {
  const templateID = ensurePositiveInt(templateId, 0);
  const itemID = ensurePositiveInt(itemId, 0);
  await pool.execute(
    `UPDATE plan_template_items
     SET day_no = ?, order_no = ?, video_id = ?, suggested_duration_seconds = ?, repeat_count = ?
     WHERE id = ? AND template_id = ?`,
    [
      ensurePositiveInt(payload.day_no || payload.dayNo, 0),
      ensurePositiveInt(payload.order_no || payload.orderNo, 0),
      ensurePositiveInt(payload.video_id || payload.videoId, 0),
      ensurePositiveInt(payload.suggested_duration_seconds || payload.suggestedDurationSeconds, 0) || null,
      ensurePositiveInt(payload.repeat_count || payload.repeatCount, 0) || null,
      itemID,
      templateID,
    ],
  );
  return getTemplateDetail(templateID);
}

export async function deleteTemplateItem(templateId, itemId) {
  const templateID = ensurePositiveInt(templateId, 0);
  const itemID = ensurePositiveInt(itemId, 0);
  await pool.execute(
    "DELETE FROM plan_template_items WHERE id = ? AND template_id = ?",
    [itemID, templateID],
  );
  return { success: true };
}

export async function createAssignment(payload) {
  const elderId = ensurePositiveInt(payload.elder_id || payload.elderId, 0);
  const templateId = ensurePositiveInt(payload.template_id || payload.templateId, 0);
  const startDate = String(payload.start_date || payload.startDate || formatDate(new Date()));
  if (!elderId || !templateId) {
    throw appError(400, "分配参数不完整");
  }

  return withTransaction(async (tx) => {
    await tx.execute(
      `UPDATE elder_plan_assignments
       SET status = 0, completed_at = NOW(), updated_at = NOW()
       WHERE elder_id = ? AND status = 1`,
      [elderId],
    );

    const [result] = await tx.execute(
      `INSERT INTO elder_plan_assignments (
         elder_id, template_id, start_date, next_day_no, status, last_plan_date, completed_at, created_at, updated_at
       ) VALUES (?, ?, ?, 1, 1, NULL, NULL, NOW(), NOW())`,
      [elderId, templateId, startDate],
    );

    const [rows] = await tx.execute(
      `SELECT a.*, t.name AS template_name
       FROM elder_plan_assignments a
       JOIN plan_templates t ON t.id = a.template_id
       WHERE a.id = ?`,
      [result.insertId],
    );
    return rows[0];
  });
}

export async function listAssignments(query = {}) {
  const sql = [
    `SELECT a.*, u.user_name AS elder_name, t.name AS template_name
     FROM elder_plan_assignments a
     JOIN users u ON u.id = a.elder_id
     JOIN plan_templates t ON t.id = a.template_id
     WHERE 1 = 1`,
  ];
  const params = [];
  if (query.elder_id || query.elderId) {
    sql.push("AND a.elder_id = ?");
    params.push(ensurePositiveInt(query.elder_id || query.elderId, 0));
  }
  if (query.status !== undefined && query.status !== "") {
    sql.push("AND a.status = ?");
    params.push(Number.parseInt(String(query.status), 10) || 0);
  }
  sql.push("ORDER BY a.created_at DESC, a.id DESC");
  const [rows] = await pool.execute(sql.join(" "), params);
  return rows.map((row) => ({
    id: row.id,
    elder_id: row.elder_id,
    elder_name: row.elder_name,
    template_id: row.template_id,
    template_name: row.template_name,
    start_date: row.start_date,
    next_day_no: Number(row.next_day_no || 0),
    status: Number(row.status || 0),
    last_plan_date: row.last_plan_date,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
