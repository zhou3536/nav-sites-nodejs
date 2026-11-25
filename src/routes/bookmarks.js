import express from 'express';
import { getBookmarks, saveBookmarks, deleteIconsByPrefix } from '../services/storage.js';
import { getIcon, saveIcon } from '../services/favicon.js';

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

// PUT /bookmarks - 重排序
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


router.post('/bookmark', async (req, res) => {
  try {
    const bookmarks = await getBookmarks();
    const { id, name, url, icon } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'name and url required' });
    }

    let i;
    if (id) {
      i = bookmarks.findIndex(b => b.id === id);
      if (i === -1) return res.status(404).json({ error: 'not found' });
      bookmarks[i].name = name.trim();
    } else {
      i = bookmarks.length;
      const newBookmark = {
        id: Date.now().toString(),
        name: name.trim(),
      };
      bookmarks.push(newBookmark);
    }
    if (icon) {
      bookmarks[i].url = url.trim();
      if (id) await deleteIconsByPrefix(id);
      bookmarks[i].icon = await saveIcon(icon,bookmarks[i].id);
    } else if (bookmarks[i].url !== url) {
      bookmarks[i].url = url.trim();
      if (id) await deleteIconsByPrefix(id);
      bookmarks[i].icon = await getIcon(bookmarks[i]);
    }

    await saveBookmarks(bookmarks);
    return res.json(bookmarks);

  } catch (err) {
    console.error('Error updating bookmark:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});


// DELETE 删除书签
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
