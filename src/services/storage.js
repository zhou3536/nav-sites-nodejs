import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import config from '../config.js';

const BOOKMARKS_FILE = path.join(config.DATA_DIR, 'bookmarks.json');
const ICO_DIR = path.join(config.DATA_DIR, 'ico');

/**
 * 确保数据目录及初始化文件就绪
 */
export async function initStorage() {
  if (!fsSync.existsSync(config.DATA_DIR)) {
    await fs.mkdir(config.DATA_DIR, { recursive: true });
  }
  if (!fsSync.existsSync(ICO_DIR)) {
    await fs.mkdir(ICO_DIR, { recursive: true });
  }

  if (!fsSync.existsSync(BOOKMARKS_FILE)) {
    const testJsonPath = path.join(config.PUBLIC_DIR, 'test.json');
    let initialData = '[]';
    if (fsSync.existsSync(testJsonPath)) {
      try {
        initialData = await fs.readFile(testJsonPath, 'utf-8');
      } catch (e) {
        console.warn('Failed to read test.json, fallback to empty array', e);
      }
    }
    await fs.writeFile(BOOKMARKS_FILE, initialData, 'utf-8');
  }
}

/**
 * 获取所有书签数据
 * @returns {Promise<Array>}
 */
export async function getBookmarks() {
  try {
    const data = await fs.readFile(BOOKMARKS_FILE, 'utf-8');
    return data ? JSON.parse(data) : [];
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * 原子保存书签数据
 * @param {Array} bookmarks
 */
export async function saveBookmarks(bookmarks) {
  const tmpFile = path.join(config.DATA_DIR, `.bookmarks.json.${Date.now()}`);
  await fs.writeFile(tmpFile, JSON.stringify(bookmarks, null, 2), 'utf-8');
  await fs.rename(tmpFile, BOOKMARKS_FILE);
}

/**
 * 删除指定前缀（如书签 ID）关联的所有图标文件
 * @param {string} prefix
 */
export async function deleteIconsByPrefix(prefix) {
  try {
    const files = await fs.readdir(ICO_DIR);
    const matched = files.filter(f => f.startsWith(prefix));
    await Promise.all(
      matched.map(f => fs.unlink(path.join(ICO_DIR, f)).catch(() => {}))
    );
  } catch (err) {
    console.error('Error deleting icons by prefix:', err);
  }
}

export { ICO_DIR, BOOKMARKS_FILE };
