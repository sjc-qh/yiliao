import { formatDate, formatDateTime, startOfDay, endOfDay } from "../utils/date.js";

export function appError(status, message, details = undefined) {
  return { status, message, details };
}

export function ensurePositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function ensureStatus(value, fallback = 1) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return parsed === 0 || parsed === 1 ? parsed : fallback;
}

export function summarizePlanStatus(statuses) {
  if (!statuses.length) {
    return "pending";
  }
  if (statuses.every((status) => status === "completed" || status === "skipped")) {
    return "completed";
  }
  if (statuses.some((status) => status !== "pending")) {
    return "in_progress";
  }
  return "pending";
}

export function normalizeUser(user) {
  return {
    id: user.id,
    account: user.account,
    user_name: user.user_name,
    role: user.role,
    gender: user.gender || undefined,
    phone: user.phone || undefined,
    age: user.age ?? undefined,
    status: user.status,
    created_at: user.created_at || undefined,
  };
}

export async function getUserById(db, userId) {
  const [rows] = await db.execute(
    `SELECT id, account, password_hash, user_name, role, gender, phone, age, status, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

export async function requireUserById(db, userId, message = "user not found") {
  const user = await getUserById(db, userId);
  if (!user) {
    throw appError(404, message);
  }
  return user;
}

export function requireRole(user, role, message) {
  if (!user || user.role !== role) {
    throw appError(400, message);
  }
}

export async function ensureBindingExists(db, childId, elderId) {
  const [rows] = await db.execute(
    `SELECT id, relation_type, is_primary, created_at
     FROM elder_child_bindings
     WHERE child_id = ? AND elder_id = ?
     LIMIT 1`,
    [childId, elderId],
  );
  return rows[0] || null;
}

export async function requireBindingExists(db, childId, elderId) {
  const binding = await ensureBindingExists(db, childId, elderId);
  if (!binding) {
    throw appError(403, "elder is not bound to current child");
  }
  return binding;
}

export async function recalcDailyPlanStatus(db, dailyPlanId) {
  const [rows] = await db.execute(
    `SELECT status
     FROM daily_plan_items
     WHERE daily_plan_id = ?`,
    [dailyPlanId],
  );
  const nextStatus = summarizePlanStatus(rows.map((item) => item.status));
  await db.execute(
    `UPDATE daily_plans
     SET status = ?, updated_at = NOW()
     WHERE id = ?`,
    [nextStatus, dailyPlanId],
  );
  return nextStatus;
}

export async function getTodayTrainingSummary(db, elderId) {
  const today = formatDate(new Date());
  const [planRows] = await db.execute(
    `SELECT id, plan_date, status, source_type, template_day_no
     FROM daily_plans
     WHERE elder_id = ? AND plan_date = ?
     LIMIT 1`,
    [elderId, today],
  );
  const plan = planRows[0] || null;

  let items = [];
  if (plan) {
    const [itemRows] = await db.execute(
      `SELECT id, status
       FROM daily_plan_items
       WHERE daily_plan_id = ?`,
      [plan.id],
    );
    items = itemRows;
  }

  const [recordRows] = await db.execute(
    `SELECT id, end_time, actual_duration_seconds, start_time
     FROM training_records
     WHERE elder_id = ? AND start_time BETWEEN ? AND ?
     ORDER BY start_time DESC, id DESC`,
    [elderId, formatDateTime(startOfDay(new Date())), formatDateTime(endOfDay(new Date()))],
  );

  const totalDurationSeconds = recordRows.reduce(
    (sum, row) => sum + Number(row.actual_duration_seconds || 0),
    0,
  );
  const lastTrainingTime = recordRows[0]?.start_time || null;

  return {
    hasPlan: Boolean(plan),
    plan: plan
      ? {
          id: plan.id,
          plan_date: formatDate(plan.plan_date),
          status: plan.status,
          source_type: plan.source_type,
          template_day_no: Number(plan.template_day_no || 0),
        }
      : null,
    plan_item_total: items.length,
    pending_count: items.filter((item) => item.status === "pending").length,
    completed_count: items.filter((item) => item.status === "completed").length,
    skipped_count: items.filter((item) => item.status === "skipped").length,
    total_duration_seconds: totalDurationSeconds,
    last_training_time: lastTrainingTime,
  };
}

export async function getTrainingTrendByDays(db, elderId, days) {
  const safeDays = Math.min(ensurePositiveInt(days, 7), 365);
  const start = startOfDay(new Date());
  start.setDate(start.getDate() - (safeDays - 1));
  const end = endOfDay(new Date());

  const [recordRows] = await db.execute(
    `SELECT DATE(start_time) AS record_date,
            COUNT(*) AS record_count,
            SUM(actual_duration_seconds) AS duration_seconds
     FROM training_records
     WHERE elder_id = ? AND start_time BETWEEN ? AND ?
     GROUP BY DATE(start_time)`,
    [elderId, formatDateTime(start), formatDateTime(end)],
  );

  const [planRows] = await db.execute(
    `SELECT plan_date, status
     FROM daily_plans
     WHERE elder_id = ? AND plan_date BETWEEN ? AND ?`,
    [elderId, formatDate(start), formatDate(end)],
  );

  const recordMap = new Map(
    recordRows.map((row) => [
      formatDate(row.record_date),
      {
        record_count: Number(row.record_count || 0),
        duration_seconds: Number(row.duration_seconds || 0),
      },
    ]),
  );
  const planMap = new Map(planRows.map((row) => [formatDate(row.plan_date), row.status]));

  const points = [];
  let trainedDays = 0;
  let completedPlanDays = 0;
  let totalDurationSeconds = 0;

  for (let i = 0; i < safeDays; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const date = formatDate(current);
    const record = recordMap.get(date) || { record_count: 0, duration_seconds: 0 };
    const completedPlan = planMap.get(date) === "completed";
    const trained = record.record_count > 0;

    if (trained) {
      trainedDays += 1;
    }
    if (completedPlan) {
      completedPlanDays += 1;
    }
    totalDurationSeconds += record.duration_seconds;

    points.push({
      date,
      trained,
      recordCount: record.record_count,
      completedPlan,
      durationSeconds: record.duration_seconds,
    });
  }

  return {
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
