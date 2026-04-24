import mysql from "mysql2/promise";
import dotenv from "dotenv";
import process from "node:process";

dotenv.config();

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = '${columnName}'`,
  );
  return rows[0].count > 0;
}

async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND INDEX_NAME = '${indexName}'`,
  );
  return rows[0].count > 0;
}

async function dropIndexIfExists(connection, tableName, indexName) {
  if (await indexExists(connection, tableName, indexName)) {
    await connection.execute(`DROP INDEX ${indexName} ON ${tableName}`);
  }
}

async function addIndexIfMissing(connection, tableName, indexName, indexDefinition) {
  if (!(await indexExists(connection, tableName, indexName))) {
    await connection.execute(`ALTER TABLE ${tableName} ADD ${indexDefinition}`);
  }
}

async function addColumnIfMissing(connection, tableName, columnName, columnDefinition) {
  if (!(await columnExists(connection, tableName, columnName))) {
    await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "elderlyrehab",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function ensurePositiveInt(value, defaultValue) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return defaultValue;
  }
  return Math.floor(n);
}

function ensureBooleanInt(value, defaultValue) {
  if (value === "true" || value === true || value === 1) {
    return 1;
  }
  if (value === "false" || value === false || value === 0) {
    return 0;
  }
  return defaultValue ?? 1;
}

function appError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function loadVideoCategories(videoIds, connection = pool) {
  const map = new Map();
  if (!videoIds.length) {
    return map;
  }

  const placeholders = videoIds.map(() => "?").join(",");
  const [rows] = await connection.query(
    `SELECT vc.video_id, c.id, c.name
     FROM training_video_categories vc
     JOIN training_categories c ON c.id = vc.category_id
     WHERE vc.video_id IN (${placeholders})
     ORDER BY c.sort_no ASC, c.id ASC`,
    videoIds,
  );

  for (const row of rows) {
    if (!map.has(row.video_id)) {
      map.set(row.video_id, []);
    }
    map.get(row.video_id).push({ id: row.id, name: row.name });
  }
  return map;
}

async function buildVideoList(rows, connection = pool) {
  const categoryMap = await loadVideoCategories(rows.map((item) => item.id), connection);
  return rows.map((row) => normalizeVideo(row, categoryMap.get(row.id) || []));
}

async function validateCategoryIds(categoryIds, connection) {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw appError(400, "至少选择一个分类");
  }

  const ids = categoryIds.map((item) => ensurePositiveInt(item, 0)).filter((item) => item > 0);
  if (!ids.length) {
    throw appError(400, "分类参数无效");
  }

  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await connection.query(
    `SELECT id, status
     FROM training_categories
     WHERE id IN (${placeholders})`,
    ids,
  );

  if (rows.length !== ids.length) {
    throw appError(400, "存在无效分类");
  }
  if (rows.some((item) => Number(item.status) !== 1)) {
    throw appError(400, "视频只能关联启用状态的分类");
  }

  return ids;
}

function applyDurationTag(sqlParts, params, durationTag, alias = "v") {
  if (durationTag === "short") {
    sqlParts.push(`AND ${alias}.duration_seconds <= 300`);
  } else if (durationTag === "medium") {
    sqlParts.push(`AND ${alias}.duration_seconds BETWEEN 301 AND 600`);
  } else if (durationTag === "long") {
    sqlParts.push(`AND ${alias}.duration_seconds > 600`);
  }
  return { sqlParts, params };
}

export async function getPublicCategories() {
  const [rows] = await pool.execute(
    `SELECT c.id, c.name, c.parent_id, COUNT(DISTINCT v.id) AS video_count
     FROM training_categories c
     LEFT JOIN training_video_categories vc ON vc.category_id = c.id
     LEFT JOIN training_videos v ON v.id = vc.video_id AND v.status = 1
     WHERE c.status = 1
     GROUP BY c.id, c.name, c.parent_id
     ORDER BY c.sort_no ASC, c.id ASC`,
  );

  const flatList = rows.map((item) => ({
    id: item.id,
    name: item.name,
    parent_id: item.parent_id,
    count: Number(item.video_count || 0),
  }));

  const map = new Map();
  const roots = [];

  for (const item of flatList) {
    map.set(item.id, { ...item, children: [] });
  }

  for (const item of flatList) {
    const node = map.get(item.id);
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getAdminCategories(query = {}) {
  const sql = [
    `SELECT id, name, parent_id, sort_no, status, created_at, updated_at
     FROM training_categories
     WHERE 1 = 1`,
  ];
  const params = [];

  if (query.parentId || query.parent_id) {
    sql.push("AND parent_id = ?");
    params.push(ensurePositiveInt(query.parentId || query.parent_id, 0));
  }
  if (query.status !== undefined && query.status !== "") {
    sql.push("AND status = ?");
    params.push(ensureBooleanInt(query.status, 1));
  }

  sql.push("ORDER BY sort_no ASC, id ASC");
  const [rows] = await pool.execute(sql.join(" "), params);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    parent_id: row.parent_id,
    sort_no: Number(row.sort_no || 0),
    status: Number(row.status || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function createCategory(payload) {
  const name = String(payload.name || "").trim();
  if (!name) {
    throw appError(400, "分类名称不能为空");
  }

  const parentId = payload.parent_id ? ensurePositiveInt(payload.parent_id, 0) : null;
  const sortNo = Number.parseInt(String(payload.sort_no ?? payload.sortNo ?? 0), 10) || 0;
  const status = ensureBooleanInt(payload.status, 1);

  const [result] = await pool.execute(
    `INSERT INTO training_categories (name, parent_id, sort_no, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [name, parentId || null, sortNo, status],
  );

  return {
    id: result.insertId,
    name,
    parent_id: parentId || null,
    sort_no: sortNo,
    status,
  };
}

export async function getPublicVideos(query = {}) {
  const categoryId = ensurePositiveInt(query.category_id || query.categoryId, 0);
  const page = ensurePositiveInt(query.page, 1);
  const limit = Math.min(ensurePositiveInt(query.limit, 20), 100);
  const offset = (page - 1) * limit;
  const keyword = String(query.keyword || "").trim();
  const durationTag = String(query.durationTag || query.duration_tag || "").trim();

  const sql = [
    `SELECT DISTINCT v.id, v.title, v.cover_url, v.video_url, v.description, v.duration_seconds,
            v.caution_text, v.status, v.created_at, v.updated_at
     FROM training_videos v`,
  ];
  const params = [];
  if (categoryId > 0) {
    sql.push("JOIN training_video_categories vc ON vc.video_id = v.id");
  }
  sql.push("WHERE v.status = 1");
  if (categoryId > 0) {
    sql.push("AND vc.category_id = ?");
    params.push(categoryId);
  }
  if (keyword) {
    sql.push("AND v.title LIKE ?");
    params.push(`%${keyword}%`);
  }
  applyDurationTag(sql, params, durationTag);
  sql.push("ORDER BY v.created_at DESC, v.id DESC LIMIT ? OFFSET ?");
  params.push(limit, offset);

  const [rows] = await pool.query(sql.join(" "), params);
  return buildVideoList(rows);
}

export async function getAdminVideos(query = {}) {
  const categoryId = ensurePositiveInt(query.category_id || query.categoryId, 0);
  const page = ensurePositiveInt(query.page, 1);
  const limit = Math.min(ensurePositiveInt(query.limit, 20), 100);
  const offset = (page - 1) * limit;
  const keyword = String(query.keyword || "").trim();
  const durationTag = String(query.durationTag || query.duration_tag || "").trim();

  const sql = [
    `SELECT DISTINCT v.id, v.title, v.cover_url, v.video_url, v.description, v.duration_seconds,
            v.caution_text, v.status, v.created_at, v.updated_at
     FROM training_videos v`,
  ];
  const params = [];
  if (categoryId > 0) {
    sql.push("JOIN training_video_categories vc ON vc.video_id = v.id");
  }
  sql.push("WHERE 1 = 1");
  if (categoryId > 0) {
    sql.push("AND vc.category_id = ?");
    params.push(categoryId);
  }
  if (query.status !== undefined && query.status !== "") {
    sql.push("AND v.status = ?");
    params.push(ensureBooleanInt(query.status, 1));
  }
  if (keyword) {
    sql.push("AND v.title LIKE ?");
    params.push(`%${keyword}%`);
  }
  applyDurationTag(sql, params, durationTag);
  sql.push("ORDER BY v.created_at DESC, v.id DESC LIMIT ? OFFSET ?");
  params.push(limit, offset);

  const [rows] = await pool.query(sql.join(" "), params);
  return buildVideoList(rows);
}

export async function getPublicVideoById(videoId) {
  const id = ensurePositiveInt(videoId, 0);
  if (!id) {
    throw appError(400, "视频ID无效");
  }

  const [rows] = await pool.execute(
    `SELECT id, title, cover_url, video_url, description, duration_seconds, caution_text, status, created_at, updated_at
     FROM training_videos
     WHERE id = ? AND status = 1
     LIMIT 1`,
    [id],
  );
  if (!rows[0]) {
    throw appError(404, "视频不存在");
  }

  const categories = await loadVideoCategories([id]);
  return normalizeVideo(rows[0], categories.get(id) || []);
}

export async function getAdminVideoById(videoId) {
  const id = ensurePositiveInt(videoId, 0);
  if (!id) {
    throw appError(400, "视频ID无效");
  }

  const [rows] = await pool.execute(
    `SELECT id, title, cover_url, video_url, description, duration_seconds, caution_text, status, created_at, updated_at
     FROM training_videos
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  if (!rows[0]) {
    throw appError(404, "视频不存在");
  }

  const categories = await loadVideoCategories([id]);
  return normalizeVideo(rows[0], categories.get(id) || []);
}

export async function createVideo(payload) {
  const title = String(payload.title || "").trim();
  const videoUrl = String(payload.video_url || payload.videoURL || "").trim();
  if (!title || !videoUrl) {
    throw appError(400, "视频标题和地址不能为空");
  }

  return withTransaction(async (connection) => {
    const categoryIds = await validateCategoryIds(payload.category_ids || payload.categoryIDs || [], connection);
    const coverUrl = String(payload.cover_url || payload.coverURL || "").trim();
    const description = String(payload.description || "").trim();
    const cautionText = String(payload.caution_text || payload.cautionText || "").trim();
    const durationSeconds = ensurePositiveInt(payload.duration_seconds || payload.durationSeconds, 0);
    const status = ensureBooleanInt(payload.status, 1);

    const [result] = await connection.execute(
      `INSERT INTO training_videos (
         title, cover_url, video_url, description, duration_seconds, caution_text, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, coverUrl || null, videoUrl, description || null, durationSeconds, cautionText || null, status],
    );

    for (const categoryId of categoryIds) {
      await connection.execute(
        `INSERT INTO training_video_categories (video_id, category_id)
         VALUES (?, ?)`,
        [result.insertId, categoryId],
      );
    }

    const [rows] = await connection.execute(
      `SELECT id, title, cover_url, video_url, description, duration_seconds, caution_text, status, created_at, updated_at
       FROM training_videos
       WHERE id = ?
       LIMIT 1`,
      [result.insertId],
    );
    const categoryMap = await loadVideoCategories([result.insertId], connection);
    return normalizeVideo(rows[0], categoryMap.get(result.insertId) || []);
  });
}

export async function updateVideo(videoId, payload) {
  const id = ensurePositiveInt(videoId, 0);
  if (!id) {
    throw appError(400, "视频ID无效");
  }

  return withTransaction(async (connection) => {
    const [existingRows] = await connection.execute(
      "SELECT id FROM training_videos WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existingRows[0]) {
      throw appError(404, "视频不存在");
    }

    const title = String(payload.title || "").trim();
    const videoUrl = String(payload.video_url || payload.videoURL || payload.url || "").trim();
    const coverUrl = String(payload.cover_url || payload.coverURL || "").trim();
    const description = String(payload.description || "").trim();
    const cautionText = String(payload.caution_text || payload.cautionText || "").trim();
    const durationSeconds = ensurePositiveInt(payload.duration_seconds || payload.durationSeconds, 0);

    await connection.execute(
      `UPDATE training_videos
       SET title = COALESCE(NULLIF(?, ''), title),
           cover_url = COALESCE(NULLIF(?, ''), cover_url),
           video_url = COALESCE(NULLIF(?, ''), video_url),
           description = COALESCE(NULLIF(?, ''), description),
           duration_seconds = COALESCE(?, duration_seconds),
           caution_text = COALESCE(NULLIF(?, ''), caution_text),
           updated_at = NOW()
       WHERE id = ?`,
      [title, coverUrl, videoUrl, description, durationSeconds || null, cautionText, id],
    );

    if (payload.category_ids || payload.categoryIDs) {
      const categoryIds = await validateCategoryIds(payload.category_ids || payload.categoryIDs || [], connection);
      await connection.execute("DELETE FROM training_video_categories WHERE video_id = ?", [id]);
      for (const categoryId of categoryIds) {
        await connection.execute(
          "INSERT INTO training_video_categories (video_id, category_id) VALUES (?, ?)",
          [id, categoryId],
        );
      }
    }

    const [rows] = await connection.execute(
      `SELECT id, title, cover_url, video_url, description, duration_seconds, caution_text, status, created_at, updated_at
       FROM training_videos
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    const categoryMap = await loadVideoCategories([id], connection);
    return normalizeVideo(rows[0], categoryMap.get(id) || []);
  });
}

export async function updateVideoStatus(videoId, status) {
  const id = ensurePositiveInt(videoId, 0);
  if (!id) {
    throw appError(400, "视频ID无效");
  }

  const nextStatus = ensureBooleanInt(status, 1);
  const [result] = await pool.execute(
    "UPDATE training_videos SET status = ?, updated_at = NOW() WHERE id = ?",
    [nextStatus, id],
  );
  if (!result.affectedRows) {
    throw appError(404, "视频不存在");
  }

  return getAdminVideoById(id);
}

function normalizeVideo(row, categories) {
  return {
    id: row.id,
    title: row.title,
    cover_url: row.cover_url,
    video_url: row.video_url,
    description: row.description,
    duration_seconds: row.duration_seconds,
    caution_text: row.caution_text,
    status: row.status === 1 ? "active" : "inactive",
    created_at: row.created_at,
    updated_at: row.updated_at,
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
  };
}

async function createCoreTables(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      account VARCHAR(50) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      user_name VARCHAR(50) NOT NULL,
      role VARCHAR(20) NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_account (account)
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS elders (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(50) NOT NULL,
      gender TINYINT NOT NULL DEFAULT 1,
      age INT NOT NULL DEFAULT 0,
      phone VARCHAR(20) NOT NULL,
      id_card VARCHAR(20) NOT NULL,
      address VARCHAR(255) NULL,
      medical_history TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_phone (phone),
      UNIQUE KEY uk_id_card (id_card)
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS training_categories (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      parent_id BIGINT NULL,
      sort_no INT NOT NULL DEFAULT 0,
      status TINYINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_name (name),
      KEY idx_parent_id (parent_id),
      CONSTRAINT fk_training_categories_parent FOREIGN KEY (parent_id) REFERENCES training_categories (id) ON DELETE CASCADE
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS training_videos (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(100) NOT NULL,
      cover_url VARCHAR(255) NULL,
      video_url VARCHAR(255) NOT NULL,
      description TEXT NULL,
      duration_seconds INT NOT NULL DEFAULT 0,
      caution_text TEXT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_title (title)
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS training_video_categories (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      video_id BIGINT NOT NULL,
      category_id BIGINT NOT NULL,
      CONSTRAINT uk_video_category UNIQUE (video_id, category_id),
      CONSTRAINT fk_training_video_video FOREIGN KEY (video_id) REFERENCES training_videos (id) ON DELETE CASCADE,
      CONSTRAINT fk_training_video_category FOREIGN KEY (category_id) REFERENCES training_categories (id) ON DELETE CASCADE
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS plan_templates (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      description TEXT NULL,
      is_public TINYINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS plan_template_items (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      template_id BIGINT NOT NULL,
      video_id BIGINT NOT NULL,
      duration_seconds INT NOT NULL DEFAULT 0,
      day_no INT NOT NULL DEFAULT 1,
      order_no INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_template_day_order (template_id, day_no, order_no),
      CONSTRAINT fk_plan_template_item_template FOREIGN KEY (template_id) REFERENCES plan_templates (id) ON DELETE CASCADE,
      CONSTRAINT fk_plan_template_item_video FOREIGN KEY (video_id) REFERENCES training_videos (id) ON DELETE CASCADE
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS daily_plans (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      elder_id BIGINT NOT NULL,
      template_id BIGINT NOT NULL,
      plan_date DATE NOT NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_elder_plan_date (elder_id, plan_date),
      CONSTRAINT fk_daily_plan_elder FOREIGN KEY (elder_id) REFERENCES elders (id) ON DELETE CASCADE,
      CONSTRAINT fk_daily_plan_template FOREIGN KEY (template_id) REFERENCES plan_templates (id) ON DELETE CASCADE
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS daily_plan_items (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      daily_plan_id BIGINT NOT NULL,
      video_id BIGINT NOT NULL,
      duration_seconds INT NOT NULL DEFAULT 0,
      order_no INT NOT NULL DEFAULT 1,
      completed TINYINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_daily_plan_order (daily_plan_id, order_no),
      CONSTRAINT fk_daily_plan_item_daily_plan FOREIGN KEY (daily_plan_id) REFERENCES daily_plans (id) ON DELETE CASCADE,
      CONSTRAINT fk_daily_plan_item_video FOREIGN KEY (video_id) REFERENCES training_videos (id) ON DELETE CASCADE
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS training_records (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      elder_id BIGINT NOT NULL,
      video_id BIGINT NOT NULL,
      duration_seconds INT NOT NULL DEFAULT 0,
      completed TINYINT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_training_record_elder FOREIGN KEY (elder_id) REFERENCES elders (id) ON DELETE CASCADE,
      CONSTRAINT fk_training_record_video FOREIGN KEY (video_id) REFERENCES training_videos (id) ON DELETE CASCADE
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      key_name VARCHAR(50) NOT NULL,
      key_value VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_key_name (key_name)
    )
  `);
}

async function applyMigrations(connection) {
  await addColumnIfMissing(
    connection,
    "training_categories",
    "parent_id",
    "BIGINT NULL",
  );
  await addIndexIfMissing(
    connection,
    "training_categories",
    "idx_parent_id",
    "INDEX idx_parent_id (parent_id)",
  );
  await addIndexIfMissing(
    connection,
    "training_categories",
    "uk_name",
    "UNIQUE INDEX uk_name (name)",
  );

  await addIndexIfMissing(
    connection,
    "training_videos",
    "uk_title",
    "UNIQUE INDEX uk_title (title)",
  );

  await addIndexIfMissing(
    connection,
    "plan_template_items",
    "uk_template_day_order",
    "UNIQUE INDEX uk_template_day_order (template_id, day_no, order_no)",
  );

  await addIndexIfMissing(
    connection,
    "daily_plans",
    "uk_elder_plan_date",
    "UNIQUE INDEX uk_elder_plan_date (elder_id, plan_date)",
  );

  await addIndexIfMissing(
    connection,
    "daily_plan_items",
    "uk_daily_plan_order",
    "UNIQUE INDEX uk_daily_plan_order (daily_plan_id, order_no)",
  );
}

async function seedBaseData(connection) {
  await connection.execute(
    `INSERT INTO users (account, password_hash, user_name, role, status)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), user_name = VALUES(user_name), status = VALUES(status)`,
    ["admin", "$2a$10$rOzJqZvJ6QZ7QZ7QZ7QZ7uQZ7QZ7QZ7QZ7QZ7QZ7QZ7QZ7QZ7", "admin", "admin", 1],
  );

  // 清理训练相关数据，避免重复和外键约束
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
  await connection.execute('DELETE FROM training_records');
  await connection.execute('DELETE FROM training_video_categories');
  await connection.execute('DELETE FROM training_videos');
  await connection.execute('DELETE FROM training_categories');
  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
  
  // 重置自增ID
  await connection.execute('ALTER TABLE training_videos AUTO_INCREMENT = 1');
  await connection.execute('ALTER TABLE training_categories AUTO_INCREMENT = 1');

  const categoryData = [
    { name: "按身体部位", parentName: null, sortNo: 1 },
    { name: "颈肩腰腿痛康复", parentName: "按身体部位", sortNo: 2 },
    { name: "脖颈不适", parentName: "颈肩腰腿痛康复", sortNo: 3 },
    { name: "腰椎劳损", parentName: "颈肩腰腿痛康复", sortNo: 4 },
    { name: "肩部疼痛", parentName: "颈肩腰腿痛康复", sortNo: 5 },
    { name: "膝关节专项康复", parentName: "按身体部位", sortNo: 6 },
    { name: "膝关节骨性关节炎（膝盖老化/磨损）", parentName: "膝关节专项康复", sortNo: 7 },
    { name: "半月板损伤（膝盖内部疼痛，尤其某个点）", parentName: "膝关节专项康复", sortNo: 8 },
    { name: "髌股疼痛（膝盖前侧疼痛）", parentName: "膝关节专项康复", sortNo: 9 },
    { name: "膝关节积液（膝盖肿胀）", parentName: "膝关节专项康复", sortNo: 10 },
    { name: "韧带损伤（膝盖两侧疼痛）", parentName: "膝关节专项康复", sortNo: 11 },
    { name: "运动后膝盖损伤", parentName: "膝关节专项康复", sortNo: 12 },
    { name: "老年人膝关节僵硬无力", parentName: "膝关节专项康复", sortNo: 13 },
    { name: "踝关节与足踝康复", parentName: "按身体部位", sortNo: 14 },
    { name: "踝关节扭伤(崴脚)", parentName: "踝关节与足踝康复", sortNo: 15 },
    { name: "踝关节不稳（反复崴脚）", parentName: "踝关节与足踝康复", sortNo: 16 },
    { name: "足底筋膜炎（早上起床第一步脚后跟疼）", parentName: "踝关节与足踝康复", sortNo: 17 },
    { name: "足跟痛（脚后跟踩地疼）", parentName: "踝关节与足踝康复", sortNo: 18 },
    { name: "扁平足（走路久不适）", parentName: "踝关节与足踝康复", sortNo: 19 },
    { name: "高足弓（走路久不适）", parentName: "踝关节与足踝康复", sortNo: 20 },
    { name: "按损伤/疾病类型", parentName: null, sortNo: 21 },
    { name: "神经康复训练内容", parentName: "按损伤/疾病类型", sortNo: 22 },
    { name: "脑卒中（中风）", parentName: "神经康复训练内容", sortNo: 23 },
    { name: "脑外伤", parentName: "神经康复训练内容", sortNo: 24 },
    { name: "脊髓损伤", parentName: "神经康复训练内容", sortNo: 25 },
    { name: "帕金森病", parentName: "神经康复训练内容", sortNo: 26 },
    { name: "周围神经损伤", parentName: "神经康复训练内容", sortNo: 27 },
    { name: "骨科康复训练内容", parentName: "按损伤/疾病类型", sortNo: 28 },
    { name: "骨折", parentName: "骨科康复训练内容", sortNo: 29 },
    { name: "关节置换", parentName: "骨科康复训练内容", sortNo: 30 },
    { name: "关节炎", parentName: "骨科康复训练内容", sortNo: 31 },
    { name: "心肺康复训练内容", parentName: "按损伤/疾病类型", sortNo: 32 },
    { name: "冠心病", parentName: "心肺康复训练内容", sortNo: 33 },
    { name: "心梗术后", parentName: "心肺康复训练内容", sortNo: 34 },
    { name: "心衰", parentName: "心肺康复训练内容", sortNo: 35 },
    { name: "慢性阻塞性肺疾病COPD", parentName: "心肺康复训练内容", sortNo: 36 },
    { name: "肺部术后", parentName: "心肺康复训练内容", sortNo: 37 },
    { name: "老年康复训练内容", parentName: "按损伤/疾病类型", sortNo: 38 },
    { name: "老年人衰弱", parentName: "老年康复训练内容", sortNo: 39 },
    { name: "跌倒风险", parentName: "老年康复训练内容", sortNo: 40 },
    { name: "失能", parentName: "老年康复训练内容", sortNo: 41 },
    { name: "失智", parentName: "老年康复训练内容", sortNo: 42 },
    { name: "产后康复训练内容", parentName: "按损伤/疾病类型", sortNo: 43 },
    { name: "常用康复手段", parentName: null, sortNo: 44 },
    { name: "关节活动度训练", parentName: "常用康复手段", sortNo: 45 },
    { name: "肌力/肌耐力训练", parentName: "常用康复手段", sortNo: 46 },
    { name: "平衡、协调、步态训练", parentName: "常用康复手段", sortNo: 47 },
    { name: "核心稳定训练", parentName: "常用康复手段", sortNo: 48 },
    { name: "关节松动、肌肉放松、拉伸", parentName: "常用康复手段", sortNo: 49 },
    { name: "功能重建与回归运动", parentName: "常用康复手段", sortNo: 50 },
  ];

  // 建立分类名称到ID的映射
  const nameToId = new Map();

  // 先插入顶级分类
  for (const cat of categoryData) {
    if (cat.parentName === null) {
      const [result] = await connection.execute(
        `INSERT INTO training_categories (name, parent_id, sort_no, status, created_at, updated_at)
         VALUES (?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE sort_no = VALUES(sort_no), updated_at = NOW()`,
        [cat.name, null, cat.sortNo],
      );
      // 获取插入的ID
      const [row] = await connection.execute(
        "SELECT id FROM training_categories WHERE name = ? LIMIT 1",
        [cat.name],
      );
      if (row && row.length > 0) {
        nameToId.set(cat.name, row[0].id);
      }
    }
  }

  // 再插入子分类
  for (const cat of categoryData) {
    if (cat.parentName !== null) {
      const parentId = nameToId.get(cat.parentName);
      if (parentId) {
        await connection.execute(
          `INSERT INTO training_categories (name, parent_id, sort_no, status, created_at, updated_at)
           VALUES (?, ?, ?, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE sort_no = VALUES(sort_no), updated_at = NOW()`,
          [cat.name, parentId, cat.sortNo],
        );
        // 获取插入的ID
        const [row] = await connection.execute(
          "SELECT id FROM training_categories WHERE name = ? LIMIT 1",
          [cat.name],
        );
        if (row && row.length > 0) {
          nameToId.set(cat.name, row[0].id);
        }
      }
    }
  }

  const trainingVideos = [
    { title: "脖颈不适康复运动", category: "脖颈不适" },
    { title: "腰椎劳损康复运动", category: "腰椎劳损" },
    { title: "肩部疼痛康复运动", category: "肩部疼痛" },
    { title: "膝关节骨性关节炎康复运动", category: "膝关节骨性关节炎（膝盖老化/磨损）" },
    { title: "半月板损伤康复运动", category: "半月板损伤（膝盖内部疼痛，尤其某个点）" },
    { title: "髌股疼痛康复运动", category: "髌股疼痛（膝盖前侧疼痛）" },
    { title: "膝关节积液康复运动", category: "膝关节积液（膝盖肿胀）" },
    { title: "韧带损伤康复运动", category: "韧带损伤（膝盖两侧疼痛）" },
    { title: "运动后膝盖损伤康复运动", category: "运动后膝盖损伤" },
    { title: "老年人膝关节僵硬无力康复运动", category: "老年人膝关节僵硬无力" },
    { title: "踝关节扭伤康复运动", category: "踝关节扭伤(崴脚)" },
    { title: "踝关节不稳康复运动", category: "踝关节不稳（反复崴脚）" },
    { title: "足底筋膜炎康复运动", category: "足底筋膜炎（早上起床第一步脚后跟疼）" },
    { title: "足跟痛康复运动", category: "足跟痛（脚后跟踩地疼）" },
    { title: "扁平足康复运动", category: "扁平足（走路久不适）" },
    { title: "高足弓康复运动", category: "高足弓（走路久不适）" },
    { title: "脑卒中康复运动", category: "脑卒中（中风）" },
    { title: "脑外伤康复运动", category: "脑外伤" },
    { title: "脊髓损伤康复运动", category: "脊髓损伤" },
    { title: "帕金森病康复运动", category: "帕金森病" },
    { title: "周围神经损伤康复运动", category: "周围神经损伤" },
    { title: "骨折康复运动", category: "骨折" },
    { title: "关节置换康复运动", category: "关节置换" },
    { title: "关节炎康复运动", category: "关节炎" },
    { title: "冠心病康复运动", category: "冠心病" },
    { title: "心梗术后康复运动", category: "心梗术后" },
    { title: "心衰康复运动", category: "心衰" },
    { title: "慢性阻塞性肺疾病COPD康复运动", category: "慢性阻塞性肺疾病COPD" },
    { title: "肺部术后康复运动", category: "肺部术后" },
    { title: "老年人衰弱康复运动", category: "老年人衰弱" },
    { title: "跌倒风险康复运动", category: "跌倒风险" },
    { title: "失能康复运动", category: "失能" },
    { title: "失智康复运动", category: "失智" },
    { title: "产后康复", category: "产后康复训练内容" },
    { title: "关节活动度训练", category: "关节活动度训练" },
    { title: "肌力与肌耐力训练", category: "肌力/肌耐力训练" },
    { title: "平衡协调步态训练", category: "平衡、协调、步态训练" },
    { title: "核心稳定训练", category: "核心稳定训练" },
    { title: "关节松动肌肉放松拉伸", category: "关节松动、肌肉放松、拉伸" },
    { title: "功能重建与回归运动训练", category: "功能重建与回归运动" },
  ];

  // 删除现有视频数据
  await connection.execute('DELETE FROM training_video_categories');
  await connection.execute('DELETE FROM training_videos');
  
  // 重置视频表的自增ID
  await connection.execute('ALTER TABLE training_videos AUTO_INCREMENT = 1');
  
  for (const video of trainingVideos) {
    const categoryId = nameToId.get(video.category);
    if (categoryId) {
      await connection.execute(
        `INSERT INTO training_videos (title, description, cover_url, video_url, duration_seconds, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE updated_at = NOW()`,
        [
          video.title,
          "专业康复训练视频，帮助您恢复身体功能。",
          "https://via.placeholder.com/480x270?text=康复训练",
          "https://example.com/video.mp4",
          300
        ],
      );

      const [result] = await connection.execute(
        "SELECT id FROM training_videos WHERE title = ? LIMIT 1",
        [video.title],
      );

      if (result && result.length > 0) {
        const videoId = result[0].id;
        await connection.execute(
          `INSERT INTO training_video_categories (video_id, category_id)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE video_id = VALUES(video_id)`,
          [videoId, categoryId],
        );
      }
    }
  }
}

async function initDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "elderlyrehab",
      multipleStatements: true,
    });

    console.log("Initializing database schema...");

    await createCoreTables(connection);
    await applyMigrations(connection);
    await seedBaseData(connection);

    console.log("Database initialization completed.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}