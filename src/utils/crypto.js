import crypto from 'node:crypto';
import config from '../config.js';

/**
 * 使用 HMAC-SHA256 生成签名
 * 密钥为配置的 PASSWORD
 */
export function sign(value) {
  return crypto
    .createHmac('sha256', config.PASSWORD)
    .update(value)
    .digest('hex');
}

/**
 * 创建带 7 天有效期的 Auth Token
 */
export function createToken() {
  const expires = Date.now() + config.COOKIE_DAYS * 24 * 60 * 60 * 1000;
  const payload = `auth:${expires}`;
  const sig = sign(payload);
  return `${payload}:${sig}`;
}

//校验 Token

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [prefix, expires, sig] = parts;
  if (prefix !== 'auth') return false;

  const expiresNum = parseInt(expires, 10);
  if (Number.isNaN(expiresNum) || Date.now() > expiresNum) return false;

  const payload = `${prefix}:${expires}`;
  const expectedSig = sign(payload);
  if (sig === expectedSig) {
    // 剩余时间小于 6 天时自动续期
    const needsRenewal = Date.now() > (expiresNum - 6 * 86400000);
    return needsRenewal ? '2' : '1';
  }

  return false;
}
