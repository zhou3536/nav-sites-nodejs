import express from 'express';
import path from 'node:path';
import config from '../config.js';
import { createToken } from '../utils/crypto.js';

const router = express.Router();

// GET /login - 直接访问登录页面
router.get('/login', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'login.html'));
});

// POST /login - 登录接口
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username === config.USERNAME && password === config.PASSWORD) {
    const token = createToken();
    res.cookie(config.COOKIE_NAME, token, {
      maxAge: config.COOKIE_DAYS * 86400 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return res.json({ success: true });
  }

  return res.status(401).json({
    success: false,
    message: '用户名或密码错误',
  });
});

// GET /logout - 退出登录
router.get('/logout', (req, res) => {
  res.clearCookie(config.COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
  return res.redirect('/login');
});

export default router;
