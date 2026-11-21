import express from 'express';
import { getBookmarks, saveBookmarks, deleteIconsByPrefix } from '../services/storage.js';
import { getIcon } from '../services/favicon.js';

const router = express.Router();

// GET /bookmarks
router.get('/bookmarks', async (req, res) => {
  try {
    const bookmarks = await getBookmarks();
    res.setHeader('Cache-Control', 'no-store');
    res.json(bookmarks);
  } catch (err) {
    console.error('Error fetching bookmarks:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /bookmarks - 添加书签
router.post('/add_bookmark', async (req, res) => {
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
    const bookmarks = await getBookmarks();
    const { o } = req.body;

    if (!o || bookmarks.length !== o.length) {
      return res.status(400).json({ error: 'data error' });
    }

    const orderMap = new Map(o.map((item, index) => [item.id, index]));
    bookmarks.sort((a, b) => {
      const indexA = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
      const indexB = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
      return indexA - indexB;
    });
    await saveBookmarks(bookmarks);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error updating bookmark:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});


router.post('/edt_bookmark', async (req, res) => {
  try {
    const bookmarks = await getBookmarks();
    const { id, name, url } = req.body;
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
router.post('/del_bookmark', async (req, res) => {
  try {
    const { id } = req.body;
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
