
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const SESSION_COOKIE_NAME = 'auth';

const { COOKIE_SECRET, USERNAME, PASSWORD, SESSION_DURATION_DAY = 1 } = process.env;
if (!COOKIE_SECRET || !USERNAME || !PASSWORD) {
    console.log('请在.env文件设置 COOKIE_SECRET | USERNAME | PASSWORD ');
    process.exit(1);
}
const SESSION_DURATION_MS = SESSION_DURATION_DAY * 24 * 3600000;
console.log('.env', USERNAME, PASSWORD);

const setSessionCookie = (res) => {
    res.cookie(SESSION_COOKIE_NAME,
        {
            user: USERNAME,
            createdAt: Date.now()
        },
        {
            maxAge: SESSION_DURATION_MS,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            signed: true,
            sameSite: 'Lax'
        }
    );
};


// --- 认证中间件和路由处理函数 ---
const authenticateMiddleware = (req, res, next) => {

    if (req.path.includes('login')) {
        return next();
    };
    if (req.path.includes('logout')) {
        return next();
    };

    // 检查是否存在用户 ID Cookie
    const sessionCookie = req.signedCookies[SESSION_COOKIE_NAME];
    if (sessionCookie && sessionCookie.user) {
        const { user, createdAt } = sessionCookie;
        const age = Date.now() - (createdAt || 0);
        if (user === USERNAME && age < SESSION_DURATION_MS) {
            if (age > SESSION_DURATION_MS / 2) { setSessionCookie(res) }
            return next();
        }
    };
    if (req.path.endsWith('.html') || req.path.endsWith('/')) {
        const originalPath = encodeURIComponent(req.originalUrl);
        return res.redirect(`/login.html?from=${originalPath}`);
    };
    res.status(401).json({ message: '请登录后重试' });
};

// 登录路由处理函数
const postlogin = async (req, res) => {
    const { username, password } = req.body;
    const ok = username === USERNAME && password === PASSWORD;

    if (!ok) return res.status(401).json({ message: '用户名或密码不正确' });

    if (ok) {
        setSessionCookie(res);
        return res.status(200).json({ message: '登录成功' });
    }
};

// 登出路由处理函数
const postlogout = (req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME, {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
    });
    return res.status(200).json({ message: '退出成功' });
};

//初始化
export const initializeAuth = (app) => {

    app.use(cookieParser(COOKIE_SECRET));
    app.use(authenticateMiddleware);
    app.post('/login', postlogin);
    app.post('/logout', postlogout);
};