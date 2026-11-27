import { initSearch } from './search.js';
import { initBookmarkModal } from './modal.js';

// ── State & Cache ──
const CACHE_KEY = 'bookmarks_cache';
let bookmarks = [];
let dragSrcId = null;

function saveCache() {
    localStorage.setItem(CACHE_KEY, JSON.stringify(bookmarks));
}

// ── Shared Helpers ──
let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

async function apiFetch(path, opts = {}, loader = true) {
    if (loader) window.addLoader(document.body);
    try {
        const fetchOpts = {
            headers: { 'Content-Type': 'application/json' },
            ...opts,
        };
        if (fetchOpts.body !== undefined) {
            fetchOpts.body = JSON.stringify(fetchOpts.body);
        }
        const r = await fetch(path, fetchOpts);
        if (!r.ok) throw new Error(await r.text());
        return r.json();
    } finally {
        if (loader) window.removeLoader(document.body);
    }
}

function domainOf(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return url;
    }
}

function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Bookmarks CRUD & Rendering ──
async function loadBookmarks() {
    // 启动时优先读取本地缓存渲染网页，加速网页渲染
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
        try {
            bookmarks = JSON.parse(cachedData);
            render();
        } catch (e) {
            bookmarks = [];
            console.error('解析本地缓存失败', e);
        }
    }

    try {
        const netData = await apiFetch('/bookmarks', {}, false);
        const netDataStr = JSON.stringify(netData);
        if (netDataStr !== cachedData) {
            bookmarks = netData;
            saveCache();
            render();
        }
    } catch (e) {
        if (!cachedData) {
            showToast('加载失败');
        } else {
            console.warn('网络数据获取失败，当前处于离线缓存模式', e);
        }
    }
}

async function delBookmark(id) {
    if (!id) return;
    const bm = bookmarks.find((b) => b.id === id);
    if (!bm) return;
    if (!confirm('确认删除' + bm.name)) return;
    try {
        await apiFetch('/del_bookmark', { method: 'POST', body: { id } });
        bookmarks = bookmarks.filter((b) => b.id !== id);
        saveCache();
        render();
        showToast('已删除');
    } catch {
        showToast('删除失败');
    }
}

function render() {
    const grid = document.getElementById('bookmarks-grid');
    grid.innerHTML = '';

    bookmarks.forEach((bm) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = bm.id;
        card.draggable = true;
        card.innerHTML = `
                  <div class="card-body">
                    <img src="${bm.icon || 'favicon.ico'}"/>
                    <div class="card-name">${esc(bm.name)}</div>
                    <div class="card-url">${esc(domainOf(bm.url))}</div>
                  </div>`;

        // left click → open
        card.addEventListener('click', () => window.open(bm.url, '_blank'));

        // right click → context menu
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const edit = document.createElement('div');
            edit.textContent = '编辑';
            edit.addEventListener('click', () => modal.openEditModal(bm));

            const del = document.createElement('div');
            del.textContent = '删除';
            del.addEventListener('click', () => delBookmark(bm.id));

            const rect = { top: e.clientY - 1, bottom: e.clientY + 1, left: e.clientX };
            window.showMenu(rect, [edit, del]);
        });

        card.addEventListener('dragstart', (e) => {
            dragSrcId = bm.id;
            setTimeout(() => card.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.card').forEach((c) => c.classList.remove('drag-over'));
            card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', async (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            if (dragSrcId === bm.id) return;
            const srcIdx = bookmarks.findIndex((b) => b.id === dragSrcId);
            const dstIdx = bookmarks.findIndex((b) => b.id === bm.id);
            const reordered = [...bookmarks];
            const [moved] = reordered.splice(srcIdx, 1);
            reordered.splice(dstIdx, 0, moved);
            const bookmarksBackup = [...bookmarks];
            bookmarks = reordered;
            render();
            try {
                const o = bookmarks.map((item) => ({ id: item.id }));
                await apiFetch('/bookmarks', { method: 'PUT', body: { o } });
                saveCache();
            } catch {
                showToast('排序保存失败');
                bookmarks = [...bookmarksBackup];
                render();
            }
        });

        grid.appendChild(card);
    });

    const addCard = document.createElement('div');
    addCard.innerHTML = '<div class="line"></div><div class="line line2"></div>'
    addCard.className = 'card add';
    addCard.addEventListener('click', modal.openAddModal);
    grid.appendChild(addCard);
}

// ── Bootstrap ──
initSearch({ showToast });
const modal = initBookmarkModal({
    apiFetch,
    showToast,
    onSaved(updatedBookmarks) {
        bookmarks = updatedBookmarks;
        saveCache();
        render();
    },
});

loadBookmarks();
