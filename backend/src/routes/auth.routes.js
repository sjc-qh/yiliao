import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// 认证相关路由
router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

// 公开API路由（用于子女注册时搜索老人和创建绑定）
router.get('/search-elders', authController.searchElders);
router.post('/create-binding', authController.createBinding);

export default router;
