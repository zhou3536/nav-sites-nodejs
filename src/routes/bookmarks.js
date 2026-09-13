import express from 'express';
import { getBookmarks, saveBookmarks, deleteIconsByPrefix } from '../services/storage.js';
import { getIcon } from '../services/favicon.js';

const router = express.Router();

// GET /bookmarks
router.get('/bookmarks', async (req, res) => {
  try {
    const bookmarks = await getBookmarks();
    res.json(bookmarks);
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /bookmarks - 添加书签
router.post('/bookmarks', async (req, res) => {
  try {
    const { name, url } = req.body || {};
    if (!name || !url) {
      return res.status(400).json({ error: 'name and url required' });
    }

    const bookmarks = await getBookmarks();
    const newBookmark = {
      id: Date.now().toString(),
      name: name.trim(),
      url: url.trim(),
    };

    newBookmark.icon = await getIcon(newBookmark);
    bookmarks.push(newBookmark);
    await saveBookmarks(bookmarks);

    return res.status(201).json(newBookmark);
  } catch (err) {
    console.error('Error adding bookmark:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// PUT /bookmarks - 重排序 (array) 或 编辑单项 ({id, name, url})
router.put('/bookmarks', async (req, res) => {
  try {
    const body = req.body;
    const bookmarks = await getBookmarks();

    // 批量重排序：body 为数组
    if (Array.isArray(body)) {
      if (bookmarks.length !== body.length) {
        return res.status(400).json({ error: 'data error' });
      }
      const s1 = bookmarks.map(obj => JSON.stringify(obj)).sort().join();
      const s2 = body.map(obj => JSON.stringify(obj)).sort().join();
      if (s1 !== s2) {
        return res.status(400).json({ error: 'data error' });
      }

      await saveBookmarks(body);
      return res.json({ ok: true });
    }

    // 编辑单项书签
    const { id, name, url } = body || {};
    if (!id || !name || !url) {
      return res.status(400).json({ error: 'id, name and url required' });
    }

    const idx = bookmarks.findIndex(b => b.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'not found' });
    }

    bookmarks[idx].name = name.trim();
    if (bookmarks[idx].url !== url.trim()) {
      await deleteIconsByPrefix(id);
      bookmarks[idx].url = url.trim();
      bookmarks[idx].icon = await getIcon(bookmarks[idx]);
    }

    await saveBookmarks(bookmarks);
    return res.json(bookmarks[idx]);
  } catch (err) {
    console.error('Error updating bookmark:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// DELETE /bookmarks?id=xxx - 删除书签
router.delete('/bookmarks', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ error: 'id required' });
    }

    const bookmarks = await getBookmarks();
    await deleteIconsByPrefix(id);

    const filtered = bookmarks.filter(b => b.id !== id);
    await saveBookmarks(filtered);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting bookmark:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
