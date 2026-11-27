import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import config from './config.js';
import { initStorage, ICO_DIR ,} from './services/storage.js';
import { initializeAuth } from './auth.js';
import bookmarksRouter from './routes/bookmarks.js';

const app = express();

// 1. 基础中间件
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// 认证路由（放行 /login, /logout）
initializeAuth(app);

// 静态文件服务 
app.use('/ico', express.static(ICO_DIR, {
  maxAge: '30d',
  etag: true,
}));

app.use('/img', express.static(config.PUBLIC_IMG, {
  maxAge: '30d',
  etag: true,
}));

app.use(express.static(config.PUBLIC_DIR, {
  maxAge: '10m',
  etag: true,
}));

// 业务 API 路由
app.use(bookmarksRouter);

// 兜底404路由
app.get('*', (req, res) => {
  res.status(404).send('404 Not Found');
});

// 初始化存储并启动服务
async function startServer() {
  try {
    await initStorage();
    app.listen((config.HOST, config.PORT), () => {
      console.log(`[Nav-Sites] Server is running on http://${config.HOST}:${config.PORT}`);
    });
  } catch (err) {
    console.error('[Nav-Sites] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
