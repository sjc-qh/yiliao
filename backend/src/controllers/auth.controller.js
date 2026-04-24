import * as authService from '../services/auth.service.js';

export async function login(req, res) {
  try {
    const result = await authService.login(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(401).json({ success: false, error: error.message || '登录失败' });
  }
}

export async function register(req, res) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(400).json({ error: error.message || '注册失败' });
  }
}

export async function getProfile(req, res) {
  try {
    const result = await authService.getProfile(req.user.id);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(404).json({ success: false, error: error.message || '用户不存在' });
  }
}

export async function updateProfile(req, res) {
  try {
    const result = await authService.updateProfile(req.user.id, req.body);
    res.json({
      success: true,
      message: '个人资料更新成功'
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(400).json({ success: false, error: error.message || '更新失败' });
  }
}

export async function changePassword(req, res) {
  try {
    const result = await authService.changePassword(req.user.id, req.body);
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(400).json({ success: false, error: error.message || '密码修改失败' });
  }
}

export async function searchElders(req, res) {
  try {
    const result = await authService.searchElders(req.query.name);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('搜索老人错误:', error);
    res.status(400).json({ success: false, error: error.message || '搜索失败' });
  }
}

export async function createBinding(req, res) {
  try {
    const result = await authService.createBinding(req.body);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('创建绑定关系错误:', error);
    res.status(400).json({ success: false, error: error.message || '创建绑定失败' });
  }
}
