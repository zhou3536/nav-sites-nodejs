import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { ICO_DIR } from './storage.js';

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 抓取目标网站的 Favicon 并持久化保存到本地 ico 目录
 * @param {{ id: string, url: string }} bookmark
 * @returns {Promise<string>} 'ico/filename.ext' 或 ''
 */
export async function getIcon(bookmark) {
  const targetUrl = bookmark.url;

  try {
    const urlObj = new URL(targetUrl);
    let iconUrl = null;
    let iconResponse = null;

    // ==========================================
    // 阶段 1：尝试请求目标网页并使用 cheerio 解析 HTML
    // ==========================================
    try {
      const pageResponse = await fetchWithTimeout(targetUrl, {
        headers: { 'User-Agent': DEFAULT_UA },
        redirect: 'follow',
      });

      if (pageResponse.ok) {
        const html = await pageResponse.text();
        const $ = cheerio.load(html);

        // 优先查找带有 icon 属性的 link 标签
        const linkEl = $('link[rel*="icon"]').first();
        const href = linkEl.attr('href');

        if (href) {
          iconUrl = new URL(href, targetUrl).href;
        }

        if (iconUrl) {
          const res = await fetchWithTimeout(iconUrl, {
            headers: { 'User-Agent': DEFAULT_UA },
            redirect: 'follow',
          });
          if (res.ok) {
            iconResponse = res;
          }
        }
      }
    } catch (e) {
      // HTML 解析失败，继续尝试兜底策略
    }

    // ==========================================
    // 阶段 2：如果阶段 1 失败，尝试 Google Favicon API
    // ==========================================
    if (!iconResponse) {
      try {
        const domain = urlObj.origin + urlObj.pathname;
        const googleApi = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
        const res = await fetchWithTimeout(googleApi);
        if (res.ok) {
          iconResponse = res;
          iconUrl = googleApi;
        }
      } catch (e) {
        // Google API 失败
      }
    }

    // ==========================================
    // 阶段 3：如果依然失败，尝试网站根目录 /favicon.ico
    // ==========================================
    if (!iconResponse) {
      try {
        const fallbackUrl = `${urlObj.origin}/favicon.ico`;
        const res = await fetchWithTimeout(fallbackUrl, {
          headers: { 'User-Agent': DEFAULT_UA },
          redirect: 'follow',
        });
        if (res.ok) {
          iconResponse = res;
          iconUrl = fallbackUrl;
        }
      } catch (e) {
        // 根路径 favicon 失败
      }
    }

    if (!iconResponse) {
      return '';
    }

    // ==========================================
    // 阶段 4：解析文件类型并保存到本地
    // ==========================================
    let contentType = iconResponse.headers.get('Content-Type') || 'image/x-icon';
    contentType = contentType.split(';')[0].trim().toLowerCase();

    let extension = 'ico';
    if (contentType.includes('svg')) {
      extension = 'svg';
    } else if (contentType.includes('png')) {
      extension = 'png';
    } else if (contentType.includes('gif')) {
      extension = 'gif';
    } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      extension = 'jpg';
    } else if (iconUrl) {
      const extMatch = iconUrl.match(/\.(svg|png|ico|gif|jpg|jpeg)(?:\?|$)/i);
      if (extMatch) {
        extension = extMatch[1].toLowerCase();
      }
    }

    const randomStr = Math.random().toString(36).substring(2, 6);
    const fileName = `${bookmark.id}${randomStr}.${extension}`;
    const filePath = path.join(ICO_DIR, fileName);

    const arrayBuffer = await iconResponse.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    return `ico/${fileName}`;
  } catch (err) {
    console.error(`Error fetching icon for ${bookmark.url}:`, err);
    return '';
  }
}
