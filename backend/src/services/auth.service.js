import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

export async function login(payload) {
  const { account, password } = payload;
  
  if (!account || !password) {
    throw new Error('账号和密码不能为空');
  }

  const [users] = await pool.execute(
    'SELECT * FROM users WHERE account = ? AND status = 1',
    [account]
  );//g///

  if (users.length === 0) {
    throw new Error('账号不存在或已禁用');
  }

  const user = users[0];
  
  // 临时允许测试账号使用简单密码
  let isValidPassword = false;
  
  // 测试账号使用固定密码 123456
  if (['admin', 'elder1', 'child1'].includes(account) && password === '123456') {
    isValidPassword = true;
  } else {
    isValidPassword = await bcrypt.compare(password, user.password_hash);
  }

  if (!isValidPassword) {
    throw new Error('密码错误');
  }

  const token = jwt.sign(
    { id: user.id, account: user.account, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      account: user.account,
      user_name: user.user_name,
      role: user.role
    }
  };
}

export async function register(payload) {
  const { account, password, user_name, role, gender, phone, age } = payload;

  if (!account || !password || !user_name || !role) {
    throw new Error('账号、密码、姓名和角色不能为空');
  }

  if (!['elder', 'child', 'admin'].includes(role)) {
    throw new Error('角色无效');
  }

  const [existingUsers] = await pool.execute(
    'SELECT id FROM users WHERE account = ?',
    [account]
  );

  if (existingUsers.length > 0) {
    throw new Error('账号已存在');
  }

  const password_hash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    'INSERT INTO users (account, password_hash, user_name, role, gender, phone, age, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [account, password_hash, user_name, role, gender || null, phone || null, age || null, 1]
  );//gai///

  return {
    user: {
      id: result.insertId,
      account,
      user_name,
      role
    }
  };
}

export async function getProfile(userId) {
  const [users] = await pool.execute(
    'SELECT id, account, user_name, role, gender, phone, age, created_at FROM users WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw new Error('用户不存在');
  }
  
  const user = users[0];
  
  return {
    id: user.id,
    account: user.account,
    user_name: user.user_name,
    role: user.role,
    gender: user.gender,
    phone: user.phone,
    age: user.age,
    created_at: user.created_at
  };
}

export async function updateProfile(userId, payload) {
  const { user_name, gender, phone, age } = payload;
  
  const [result] = await pool.execute(
    'UPDATE users SET user_name = ?, gender = ?, phone = ?, age = ? WHERE id = ?',
    [user_name, gender, phone, age, userId]
  );
  
  if (result.affectedRows === 0) {
    throw new Error('用户不存在');
  }
  
  return { message: '个人资料更新成功' };
}

export async function changePassword(userId, payload) {
  const { oldPassword, newPassword } = payload;
  
  // 获取当前用户信息
  const [users] = await pool.execute(
    'SELECT password_hash FROM users WHERE id = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw new Error('用户不存在');
  }
  
  const user = users[0];
  
  // 验证旧密码
  const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
  if (!isValidPassword) {
    throw new Error('原密码错误');
  }
  
  // 更新新密码
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  
  const [result] = await pool.execute(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [newPasswordHash, userId]
  );
  
  if (result.affectedRows === 0) {
    throw new Error('用户不存在');
  }
  
  return { message: '密码修改成功' };
}

export async function searchElders(name) {
  if (!name) {
    throw new Error('搜索条件不能为空');
  }
  
  const query = `
    SELECT id, user_name as name, account,status
    FROM users
    WHERE role = 'elder' 
      AND (user_name LIKE ? OR account LIKE ?)
      AND (status = 1 OR status = "1" OR status = "active")
    ORDER BY created_at DESC
    LIMIT 10
  `;//g///
  
  const [users] = await pool.execute(query, [`%${name}%`, `%${name}%`]);
  
  return users;
}

export async function createBinding(payload) {
  const { elderId, childId, isPrimary } = payload;
  
  if (!elderId || !childId) {
    throw new Error('老人ID和子女ID不能为空');
  }
  
  // 检查老人角色
  const [elderUsers] = await pool.execute(`
    SELECT id, role FROM users WHERE id = ?
  `, [elderId]);
  
  if (elderUsers.length === 0 || elderUsers[0].role !== 'elder') {
    throw new Error('老人ID必须属于老人角色');
  }
  
  // 检查子女角色
  const [childUsers] = await pool.execute(`
    SELECT id, role FROM users WHERE id = ?
  `, [childId]);
  
  if (childUsers.length === 0 || childUsers[0].role !== 'child') {
    throw new Error('子女ID必须属于子女角色');
  }
  
  // 检查是否已存在绑定关系
  const [existingBindings] = await pool.execute(`
    SELECT id FROM elder_child_bindings WHERE elder_id = ? AND child_id = ?
  `, [elderId, childId]);
  
  if (existingBindings.length > 0) {
    throw new Error('同一对绑定不能重复创建');
  }
  
  // 如果是主联系人，先将其他绑定设为非主联系人
  if (isPrimary) {
    await pool.execute(`
      UPDATE elder_child_bindings
      SET is_primary = 0
      WHERE elder_id = ?
    `, [elderId]);
  }
  
  // 创建绑定关系
  const [result] = await pool.execute(`
    INSERT INTO elder_child_bindings (elder_id, child_id, is_primary)
    VALUES (?, ?, ?)
  `, [elderId, childId, isPrimary ? 1 : 0]);
  
  return {
    id: result.insertId,
    elderId,
    childId,
    isPrimary: isPrimary ? 1 : 0
  };
}
