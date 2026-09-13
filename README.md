# 个人导航网站 (Node.js 版) 

基于 **Node.js (Express) + 本地持久化存储** 的个人导航网站，支持拖拽排序、网站增删改查、自动抓取 favicon 图标、Cookie 认证会话（带自动续期）。

---

## ✨ 特性

- 🚀 **单服务架构**：单端口同时托管后端 API 与前端静态资源，无需依赖任何云函数。
- 📦 **零外部数据库依赖**：使用本地原子写入的 JSON 文件与本地目录存储，开箱即用。
- 🛡️ **安全鉴权**：HMAC-SHA256 签名 Cookie 认证，支持 7 天自动滑动续期及防篡改校验。
- 🎨 **自动抓取 Favicon**：网页 HTML 解析（Cheerio） → Google API → 根路径 favicon 三级兜底策略。
- 🐳 **Docker 容器化**：提供轻量 Alpine 容器支持与 Docker Compose 配置，挂载数据目录即可持久化。

---

## 📁 目录结构

```text
nav-sites-nodejs/
├── data/                     # 数据持久化目录（自动生成）
│   ├── bookmarks.json        # 书签数据
│   └── ico/                  # 抓取到的网站图标
├── public/                   # 前端静态资源
│   ├── index.html            # 导航主页
│   ├── login.html            # 登录页
│   ├── sty.css               # 样式文件
│   └── favicon.ico           # 站点图标
├── src/                      # 后端源码
│   ├── server.js             # 服务入口
│   ├── config.js             # 配置管理
│   ├── middleware/auth.js    # 认证中间件
│   ├── routes/               # API 路由 (/login, /logout, /bookmarks)
│   ├── services/storage.js   # 存储服务
│   ├── services/favicon.js   # Favicon 抓取服务
│   └── utils/crypto.js       # 加密签名工具
├── .env.example              # 环境变量示例
├── Dockerfile                # Docker 镜像构建文件
├── docker-compose.yml        # Docker Compose 编排
└── package.json
```

---

## 🚀 快速开始

### 1. 本地运行

#### 环境要求
- Node.js >= 18.0.0

#### 安装依赖
```bash
npm install
```

#### 配置环境变量
复制 `.env.example` 为 `.env` 并按需修改密码：
```bash
cp .env.example .env
```

`.env` 常用参数：
| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `PORT` | 服务监听端口 | `3000` |
| `AUTH_USERNAME` | 登录用户名 | `admin` |
| `AUTH_PASSWORD` | 登录密码 | `admin123` |
| `DATA_DIR` | 持久化数据保存目录 | `./data` |

#### 启动服务
```bash
# 开发模式（文件变动自动热重启）
npm run dev

# 生产模式
npm start
```

启动后在浏览器打开：`http://localhost:3000`

---

### 2. Docker 部署

#### 使用 Docker Compose（推荐）

```bash
# 启动容器
docker compose up -d

# 查看日志
docker compose logs -f
```

#### 使用原生 Docker 命令
```bash
# 1. 构建镜像
docker build -t nav-sites:latest .

# 2. 运行容器（挂载本地 ./data 目录以持久化保存数据）
docker run -d \
  --name nav-sites \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e AUTH_USERNAME=admin \
  -e AUTH_PASSWORD=your_password \
  --restart unless-stopped \
  nav-sites:latest
```

---

## 📡 API 接口

| Method | 路径 | 权限 | 功能 |
| :--- | :--- | :--- | :--- |
| `GET` | `/login` | 公开 | 打开登录界面 |
| `POST` | `/login` | 公开 | 用户登录（设置 HttpOnly Cookie） |
| `GET` | `/logout` | 公开 | 退出登录并清除 Cookie |
| `GET` | `/ico/:name` | 公开 | 访问缓存的网站 Favicon 图标 |
| `GET` | `/bookmarks` | 需登录 | 获取全部书签列表 |
| `POST` | `/bookmarks` | 需登录 | 添加新书签并自动抓取 Favicon |
| `PUT` | `/bookmarks` | 需登录 | 拖拽重排序（传入数组）或更新单项（传入对象） |
| `DELETE`| `/bookmarks?id=xxx` | 需登录 | 删除书签及关联图标 |

---

## 💾 数据备份与迁移

所有用户数据与缓存图标均保存在 `data/` 目录下：
- `data/bookmarks.json`：书签清单
- `data/ico/`：图标文件

迁移或备份时，仅需打包拷贝 `data/` 目录即可。
