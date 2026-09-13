import path from 'node:path';
import config from '../config.js';
import { createToken, verifyToken } from '../utils/crypto.js';

/**
 * 认证与会话续期中间件
 */
export function authMiddleware(req, res, next) {
  const urlPath = req.path;

  // 放行静态关键资源与登录相关接口
  if (
    urlPath.includes('/login') ||
    urlPath.includes('/logout') ||
    urlPath.startsWith('/ico') ||
    urlPath === '/sty.css' ||
    urlPath === '/favicon.ico'
  ) {
    return next();
  }

  const token = req.cookies[config.COOKIE_NAME];
  const isValid = verifyToken(token);

  if (isValid === '1') {
    return next();
  }

  if (isValid === '2') {
    // 续期 7 天
    const newToken = createToken();
    res.cookie(config.COOKIE_NAME, newToken, {
      maxAge: config.COOKIE_DAYS * 86400 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return next();
  }

  // 未登录处理：若是 API 请求返回 401 JSON，若是页面请求返回 401 并输出 login.html
  if (req.xhr || req.headers.accept?.includes('application/json') || urlPath.startsWith('/bookmarks')) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // 与原版一致：返回 401 并展示 login.html
  res.status(401).sendFile(path.join(config.PUBLIC_DIR, 'login.html'));
}
