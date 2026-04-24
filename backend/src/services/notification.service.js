import { pool, withTransaction } from "../config/db.js";
import { formatDate } from "../utils/date.js";
import {
  appError,
  ensureBindingExists,
  ensureNotificationOwnership,
  ensurePositiveInt,
  ensureUserExists,
} from "./common.service.js";

export async function sendTrainingReminder(childId, elderId, content = "") {
  const elder = await ensureUserExists(elderId);
  const child = await ensureUserExists(childId);
  await ensureBindingExists(childId, elderId);

  if (elder.role !== "elder" || child.role !== "child") {
    throw appError(400, "提醒双方角色不正确");
  }

  const finalContent = String(content || "").trim() || `${child.user_name}提醒你今天完成康复训练`;
  const bizDate = formatDate(new Date());

  return withTransaction(async (tx) => {
    const [result] = await tx.execute(
      `INSERT INTO notifications (
         receiver_id, sender_id, sender_role, type, title, content, biz_date, related_elder_id, related_child_id, status, created_at
       ) VALUES (?, ?, 'child', 'training_reminder', ?, ?, ?, ?, ?, 1, NOW())`,
      [elderId, childId, "训练提醒", finalContent, bizDate, elderId, childId],
    );

    await tx.execute(
      `INSERT INTO notification_receipts (
         notification_id, user_id, is_read, read_at, created_at, updated_at
       ) VALUES (?, ?, 0, NULL, NOW(), NOW())`,
      [result.insertId, elderId],
    );

    return getLatestReminder(childId, elderId, tx);
  });
}

export async function getLatestReminder(childId, elderId, connection = pool) {
  await ensureBindingExists(childId, elderId, connection);

  const [rows] = await connection.execute(
    `SELECT id, title, content, biz_date, created_at
     FROM notifications
     WHERE sender_id = ? AND receiver_id = ? AND type = 'training_reminder'
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [childId, elderId],
  );

  const latest = rows[0] || null;
  return {
    has_reminder: Boolean(latest),
    latest_reminder: latest
      ? {
          id: latest.id,
          title: latest.title,
          content: latest.content,
          biz_date: latest.biz_date ? formatDate(latest.biz_date) : null,
          created_at: latest.created_at,
        }
      : null,
  };
}

export async function listElderNotifications(userId, unreadOnly = false) {
  const sql = [
    `SELECT n.id, n.title, n.content, n.type, n.biz_date, n.created_at, n.sender_id, n.sender_role,
            nr.is_read, nr.read_at,
            u.user_name AS sender_name
     FROM notifications n
     JOIN notification_receipts nr ON nr.notification_id = n.id AND nr.user_id = ?
     LEFT JOIN users u ON u.id = n.sender_id
     WHERE n.receiver_id = ? AND n.status = 1`,
  ];
  const params = [userId, userId];
  if (unreadOnly === true || unreadOnly === "true" || unreadOnly === 1 || unreadOnly === "1") {
    sql.push("AND nr.is_read = 0");
  }
  sql.push("ORDER BY nr.is_read ASC, n.created_at DESC, n.id DESC");

  const [rows] = await pool.execute(sql.join(" "), params);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    biz_date: row.biz_date ? formatDate(row.biz_date) : null,
    is_read: Number(row.is_read || 0),
    read_at: row.read_at,
    created_at: row.created_at,
    sender: {
      id: row.sender_id,
      role: row.sender_role,
      user_name: row.sender_name || "",
    },
  }));
}

export async function markNotificationRead(userId, notificationId) {
  const notification = await ensureNotificationOwnership(userId, ensurePositiveInt(notificationId, 0));
  if (Number(notification.is_read || 0) === 1) {
    return { success: true };
  }

  await pool.execute(
    `UPDATE notification_receipts
     SET is_read = 1, read_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [notification.receipt_id],
  );
  return { success: true };
}

export async function countUnreadNotifications(userId) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM notification_receipts
     WHERE user_id = ? AND is_read = 0`,
    [userId],
  );
  return Number(rows[0]?.total || 0);
}
