import { pool, withTransaction } from "../config/db.js";
import {
  appError,
  ensureBindingExists,
  ensurePositiveInt,
  normalizeUser,
} from "./common.service.js";
import { ensureChildUser, ensureElderUser } from "./user.service.js";

export async function createBinding(payload) {
  const elderId = ensurePositiveInt(payload.elder_id || payload.elderId, 0);
  const childId = ensurePositiveInt(payload.child_id || payload.childId, 0);
  const relationType = String(payload.relation_type || payload.relationType || "").trim();
  const isPrimary = payload.is_primary === 1 || payload.isPrimary === 1 ? 1 : 0;

  if (!elderId || !childId) {
    throw appError(400, "绑定参数不完整");
  }

  await ensureElderUser(elderId);
  await ensureChildUser(childId);

  const [existingRows] = await pool.execute(
    "SELECT id FROM elder_child_bindings WHERE elder_id = ? AND child_id = ? LIMIT 1",
    [elderId, childId],
  );
  if (existingRows.length) {
    throw appError(409, "绑定关系已存在");
  }

  return withTransaction(async (tx) => {
    if (isPrimary) {
      await tx.execute(
        "UPDATE elder_child_bindings SET is_primary = 0 WHERE elder_id = ?",
        [elderId],
      );
    }

    const [result] = await tx.execute(
      `INSERT INTO elder_child_bindings (elder_id, child_id, relation_type, is_primary, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [elderId, childId, relationType || null, isPrimary],
    );

    const [rows] = await tx.execute(
      `SELECT *
       FROM elder_child_bindings
       WHERE id = ?`,
      [result.insertId],
    );
    return rows[0];
  });
}

export async function listBindings(query = {}) {
  const sql = [
    `SELECT b.*, e.account AS elder_account, e.user_name AS elder_name, e.status AS elder_status,
            c.account AS child_account, c.user_name AS child_name, c.status AS child_status
     FROM elder_child_bindings b
     JOIN users e ON e.id = b.elder_id
     JOIN users c ON c.id = b.child_id
     WHERE 1 = 1`,
  ];
  const params = [];

  if (query.elder_id || query.elderId) {
    sql.push("AND b.elder_id = ?");
    params.push(ensurePositiveInt(query.elder_id || query.elderId, 0));
  }
  if (query.child_id || query.childId) {
    sql.push("AND b.child_id = ?");
    params.push(ensurePositiveInt(query.child_id || query.childId, 0));
  }
  sql.push("ORDER BY b.created_at DESC, b.id DESC");

  const [rows] = await pool.execute(sql.join(" "), params);
  return rows.map((row) => ({
    id: row.id,
    relation_type: row.relation_type,
    is_primary: Number(row.is_primary || 0),
    created_at: row.created_at,
    elder: {
      id: row.elder_id,
      account: row.elder_account,
      user_name: row.elder_name,
      status: Number(row.elder_status || 0),
      role: "elder",
    },
    child: {
      id: row.child_id,
      account: row.child_account,
      user_name: row.child_name,
      status: Number(row.child_status || 0),
      role: "child",
    },
  }));
}

export async function deleteBinding(bindingId) {
  const id = ensurePositiveInt(bindingId, 0);
  const [result] = await pool.execute("DELETE FROM elder_child_bindings WHERE id = ?", [id]);
  if (!result.affectedRows) {
    throw appError(404, "绑定关系不存在");
  }
  return { success: true };
}

export async function listChildElders(childId) {
  const [rows] = await pool.execute(
    `SELECT b.id AS binding_id, b.relation_type, b.is_primary, e.id, e.account, e.user_name, e.role, e.gender, e.phone, e.age, e.status, e.created_at, e.updated_at
     FROM elder_child_bindings b
     JOIN users e ON e.id = b.elder_id
     WHERE b.child_id = ?
     ORDER BY b.is_primary DESC, b.id ASC`,
    [childId],
  );

  return rows.map((row) => ({
    binding_id: row.binding_id,
    relation_type: row.relation_type,
    is_primary: Number(row.is_primary || 0),
    elder: normalizeUser(row),
  }));
}

export async function ensureChildOwnsElder(childId, elderId) {
  return ensureBindingExists(childId, elderId);
}
