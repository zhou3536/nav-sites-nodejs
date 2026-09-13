import path from 'node:path';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import { initStorage, getBookmarks, saveBookmarks, ICO_DIR } from './src/services/storage.js';
import { getIcon } from './src/services/favicon.js';

// 默认并发抓取数（避免瞬间请求过多被目标站点拒绝）
const CONCURRENCY = 3;

/**
 * 安全删除指定旧图标文件
 */
async function removeOldIconFile(oldIconPath) {
  if (!oldIconPath) return;
  try {
    const fileName = path.basename(oldIconPath);
    const fullPath = path.join(ICO_DIR, fileName);
    if (fsSync.existsSync(fullPath)) {
      await fs.unlink(fullPath);
    }
  } catch (err) {
    // 忽略删除旧文件时的偶发错误
  }
}

async function main() {
  console.log('========================================');
  console.log('       批量重新获取收藏网站图标');
  console.log('========================================\n');

  await initStorage();
  const bookmarks = await getBookmarks();

  if (!bookmarks || bookmarks.length === 0) {
    console.log('bookmarks.json 为空或未包含任何书签，已退出。');
    return;
  }

  const total = bookmarks.length;
  console.log(`共读取到 ${total} 个收藏，开始重新获取图标 (并发数: ${CONCURRENCY})...\n`);

  let successCount = 0;
  let failedCount = 0;
  let currentIndex = 0;

  // 简易异步并发池
  async function worker() {
    while (true) {
      const idx = currentIndex++;
      if (idx >= total) break;

      const bm = bookmarks[idx];
      const seq = `[${idx + 1}/${total}]`;
      console.log(`${seq} 正在获取: ${bm.name} (${bm.url}) ...`);

      const oldIcon = bm.icon;
      try {
        const newIcon = await getIcon(bm);
        if (newIcon) {
          // 获取成功，若新图标文件名与旧的不一致，删除旧文件
          if (oldIcon && oldIcon !== newIcon) {
            await removeOldIconFile(oldIcon);
          }
          bm.icon = newIcon;
          successCount++;
          console.log(`  ✔ 成功 -> ${newIcon}`);
        } else {
          failedCount++;
          console.log(`  ✖ 失败 -> 未能抓取到有效图标 (保留原图标: ${oldIcon || '无'})`);
        }
      } catch (err) {
        failedCount++;
        console.log(`  ✖ 出错 -> ${err.message} (保留原图标: ${oldIcon || '无'})`);
      }
    }
  }

  // 启动并发 Worker
  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
  await Promise.all(workers);

  // 写回 bookmarks.json
  console.log('\n正在保存更新后的 bookmarks.json ...');
  await saveBookmarks(bookmarks);

  console.log('\n========================================');
  console.log('抓取完成统计：');
  console.log(`  - 总计收藏数: ${total}`);
  console.log(`  - 成功更新数: ${successCount}`);
  console.log(`  - 抓取失败数: ${failedCount}`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('执行出错:', err);
  process.exit(1);
});
