import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import config from './config.js';
import { initStorage, ICO_DIR } from './services/storage.js';
import { authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import bookmarksRouter from './routes/bookmarks.js';

const app = express();

// 1. 基础中间件
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 2. 静态图标服务（对应原 Cloudflare R2 /ico/*）
app.use('/ico', express.static(ICO_DIR, {
  maxAge: '30d',
  etag: true,
}));

// 3. 认证路由（放行 /login, /logout）
app.use(authRouter);

// 4. 全局认证拦截中间件
app.use(authMiddleware);

// 5. 业务 API 路由
app.use(bookmarksRouter);

// 6. 前端静态页面与资源托管
app.use(express.static(config.PUBLIC_DIR, {
  maxAge: '10m',
  etag: true,
}));

// 7. 兜底路由
app.get('*', (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
});

// 初始化存储并启动服务
async function startServer() {
  try {
    await initStorage();
    app.listen((config.HOST, config.PORT), () => {
      console.log(`[Nav-Sites] Server is running on http://${config.HOST}:${config.PORT}`);
      console.log(`[Nav-Sites] Username: ${config.USERNAME}`);
    });
  } catch (err) {
    console.error('[Nav-Sites] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
