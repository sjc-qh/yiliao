import { pool } from "../config/db.js";
import { endOfDay, formatDate, formatDateTime, startOfDay } from "../utils/date.js";

export function appError(status, message) {
  return { status, message };
}

export function ensurePositiveInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function ensureBooleanInt(value, fallback = 0) {
  if (value === true || value === 1 || value === "1") {
    return 1;
  }
  if (value === false || value === 0 || value === "0") {
    return 0;
  }
  return fallback;
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
    status: user.status === 1 ? "active" : "inactive",
    created_at: user.created_at || undefined,
    updated_at: user.updated_at || undefined,
  };
}

export function summarizePlanStatus(statuses) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
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

export async function getUserById(userId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, account, password_hash, user_name, role, gender, phone, age, status, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

export async function ensureUserExists(userId, connection = pool) {
  const user = await getUserById(userId, connection);
  if (!user) {
    throw appError(404, "用户不存在");
  }
  return user;
}

export async function ensureUserRole(userId, role, connection = pool) {
  const user = await ensureUserExists(userId, connection);
  if (user.role !== role) {
    throw appError(400, `用户角色必须为 ${role}`);
  }
  return user;
}

export async function ensureBindingExists(childId, elderId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT id, elder_id, child_id, relation_type, is_primary, created_at
     FROM elder_child_bindings
     WHERE child_id = ? AND elder_id = ?
     LIMIT 1`,
    [childId, elderId],
  );
  if (!rows[0]) {
    throw appError(403, "未找到有效的老人绑定关系");
  }
  return rows[0];
}

export async function ensureNotificationOwnership(userId, notificationId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT n.id, n.receiver_id, nr.id AS receipt_id, nr.is_read
     FROM notifications n
     JOIN notification_receipts nr ON nr.notification_id = n.id AND nr.user_id = ?
     WHERE n.id = ?
     LIMIT 1`,
    [userId, notificationId],
  );
  if (!rows[0]) {
    throw appError(404, "提醒不存在");
  }
  return rows[0];
}

export async function getActiveAssignmentByElder(elderId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT a.id, a.elder_id, a.template_id, a.start_date, a.next_day_no, a.status, a.last_plan_date, a.completed_at,
            t.name AS template_name, t.duration_days
     FROM elder_plan_assignments a
     JOIN plan_templates t ON t.id = a.template_id
     WHERE a.elder_id = ? AND a.status = 1
     ORDER BY a.id DESC
     LIMIT 1`,
    [elderId],
  );
  return rows[0] || null;
}

export async function recalculateDailyPlanStatus(dailyPlanId, connection = pool) {
  const [statusRows] = await connection.execute(
    "SELECT status FROM daily_plan_items WHERE daily_plan_id = ?",
    [dailyPlanId],
  );
  const planStatus = summarizePlanStatus(statusRows.map((item) => item.status));
  await connection.execute(
    "UPDATE daily_plans SET status = ?, updated_at = NOW() WHERE id = ?",
    [planStatus, dailyPlanId],
  );
  return planStatus;
}

export async function getTodayTrainingSummary(connection, elderId) {
  const today = formatDate(new Date());
  const [planRows] = await connection.execute(
    `SELECT id, plan_date, status, source_type, template_day_no
     FROM daily_plans
     WHERE elder_id = ? AND plan_date = ?
     LIMIT 1`,
    [elderId, today],
  );
  const plan = planRows[0] || null;

  let itemRows = [];
  if (plan) {
    const [rows] = await connection.execute(
      `SELECT id, status
       FROM daily_plan_items
       WHERE daily_plan_id = ?`,
      [plan.id],
    );
    itemRows = rows;
  }

  const [recordRows] = await connection.execute(
    `SELECT id, start_time, actual_duration_seconds
     FROM training_records
     WHERE elder_id = ? AND start_time BETWEEN ? AND ?
     ORDER BY start_time DESC, id DESC`,
    [elderId, formatDateTime(startOfDay(new Date())), formatDateTime(endOfDay(new Date()))],
  );

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
    plan_item_total: itemRows.length,
    pending_count: itemRows.filter((item) => item.status === "pending").length,
    completed_count: itemRows.filter((item) => item.status === "completed").length,
    skipped_count: itemRows.filter((item) => item.status === "skipped").length,
    total_duration_seconds: recordRows.reduce(
      (sum, row) => sum + Number(row.actual_duration_seconds || 0),
      0,
    ),
    last_training_time: recordRows[0]?.start_time || null,
  };
}
