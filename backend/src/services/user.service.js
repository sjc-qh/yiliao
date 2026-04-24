import bcrypt from "bcryptjs";

import { pool } from "../config/db.js";
import {
  appError,
  ensureBooleanInt,
  ensurePositiveInt,
  ensureUserExists,
  ensureUserRole,
  normalizeUser,
} from "./common.service.js";

export async function createUser(payload) {
  const account = String(payload.account || "").trim();
  const password = String(payload.password || "");
  const userName = String(payload.user_name || payload.userName || "").trim();
  const role = String(payload.role || "").trim();

  if (!account || !password || !userName || !role) {
    throw appError(400, "账号、密码、姓名和角色不能为空");
  }
  if (!["elder", "child", "admin"].includes(role)) {
    throw appError(400, "角色无效");
  }

  const [existingRows] = await pool.execute("SELECT id FROM users WHERE account = ? LIMIT 1", [account]);
  if (existingRows.length) {
    throw appError(409, "账号已存在");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const gender = payload.gender ? String(payload.gender).trim() : null;
  const phone = payload.phone ? String(payload.phone).trim() : null;
  const age = payload.age ? Number.parseInt(String(payload.age), 10) : null;
  const status = ensureBooleanInt(payload.status, 1);

  const [result] = await pool.execute(
    `INSERT INTO users (account, password_hash, user_name, role, gender, phone, age, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [account, passwordHash, userName, role, gender, phone, age, status],
  );

  const user = await ensureUserExists(result.insertId);
  return normalizeUser(user);
}

export async function listUsers(query = {}) {
  const sql = [
    `SELECT id, account, user_name, role, gender, phone, age, status, created_at, updated_at
     FROM users
     WHERE 1 = 1`,
  ];
  const params = [];

  if (query.role) {
    sql.push("AND role = ?");
    params.push(String(query.role).trim());
  }
  if (query.status !== undefined && query.status !== "") {
    sql.push("AND status = ?");
    params.push(ensureBooleanInt(query.status, 1));
  }
  if (query.account) {
    sql.push("AND account LIKE ?");
    params.push(`%${String(query.account).trim()}%`);
  }

  sql.push("ORDER BY created_at DESC, id DESC");
  const [rows] = await pool.execute(sql.join(" "), params);
  return rows.map(normalizeUser);
}

export async function updateUserStatus(operatorUserId, userId, status) {
  const operator = await ensureUserExists(operatorUserId);
  const targetId = ensurePositiveInt(userId, 0);
  const nextStatus = status === "active" ? 1 : 0;

  if (!targetId) {
    throw appError(400, "用户ID无效");
  }
  if (operator.id === targetId && nextStatus === 0) {
    throw appError(400, "不能禁用当前登录管理员");
  }

  const [result] = await pool.execute(
    "UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?",
    [nextStatus, targetId],
  );
  if (!result.affectedRows) {
    throw appError(404, "用户不存在");
  }
  const user = await ensureUserExists(targetId);
  return normalizeUser(user);
}

export async function ensureElderUser(userId) {
  return ensureUserRole(userId, "elder");
}

export async function ensureChildUser(userId) {
  return ensureUserRole(userId, "child");
}
