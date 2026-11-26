let sh = JSON.parse(localStorage.getItem('sh_data') || '[]');
// ── Config ──
// const ENGINES = {
//     bing: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
//     google: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
//     baidu: q => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`,
// };

// ── State ──
let bookmarks = [];
let activeEngineIndex = Number(localStorage.getItem('engine')) || 0;
let ctxTarget = null;   // bookmark id of right-clicked card
let editingId = null;   // null = add mode, string = edit mode
let dragSrcId = null;

// ── Local Cache Helper ──
const CACHE_KEY = 'bookmarks_cache';
function saveCache() {
    localStorage.setItem(CACHE_KEY, JSON.stringify(bookmarks));
}

const ENGINES = [
    { name: 'bing', url: 'https://www.bing.com/search?q=' },
    { name: 'baidu', url: 'https://www.baidu.com/s?wd=' },
    { name: 'google', url: 'https://www.google.com/search?q=' },
];
const enginePill = document.getElementById('engine-pill');
const enginePills = document.getElementById('engine-pills');
const Engine = ENGINES[activeEngineIndex];
if (!Engine) activeEngineIndex = 0;
enginePill.style.cssText = `--bgc:url('/img/${ENGINES[activeEngineIndex].name}.webp')`;
enginePill.addEventListener('click', () => {
    enginePills.classList.toggle('active');
    hideSuggestions();
});
document.addEventListener('click', (e) => {
    if (e.target === enginePill) return;
    enginePills.classList.remove('active');
});
ENGINES.forEach((item, index) => {
    const div = document.createElement('div');
    div.style.cssText = `--bgc:url('/img/${item.name}.webp')`;
    enginePills.append(div);
    div.addEventListener('click', () => {
        enginePill.style.cssText = `--bgc:url('/img/${item.name}.webp')`;
        activeEngineIndex = index;
        localStorage.setItem('engine', activeEngineIndex);
    });
});


function doSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) {
        showToast('请输入搜索内容');
        return;
    };
    window.open(ENGINES[activeEngineIndex].url + q, '_blank');
    let index = sh.indexOf(q);
    if (index !== -1) sh.splice(index, 1);
    sh.push(q);
    if (sh.length > 10) sh.shift();
    localStorage.setItem('sh_data', JSON.stringify(sh));
}

document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
});

// ── API ──
async function apiFetch(path, opts = {}, loader = true) {
    if (loader) window.addLoader(document.body);
    opts.body = JSON.stringify(opts.body);
    const r = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
    });
    if (loader) window.removeLoader(document.body);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

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
        const apiPath = '/bookmarks';
        const netData = await apiFetch(apiPath, '', false);
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

function domainOf(url) {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
}

function render() {
    const grid = document.getElementById('bookmarks-grid');
    grid.innerHTML = '';

    bookmarks.forEach(bm => {
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
        card.addEventListener('contextmenu', e => {
            e.preventDefault();
            const edit = document.createElement('div');
            edit.textContent = '编辑';
            edit.addEventListener('click', () => edit_bookmark(bm.id))
            const del = document.createElement('div');
            del.textContent = '删除';
            del.addEventListener('click', () => del_bookmark(bm.id))


            const rect = { top: e.clientY - 1, bottom: e.clientY + 1, left: e.clientX };
            showMenu(rect, [edit, del])
            // ctxTarget = bm.id;
            // showCtx(e.clientX, e.clientY);
        });

        card.addEventListener('dragstart', e => {
            dragSrcId = bm.id;
            setTimeout(() => card.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        card.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
            card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', async e => {
            e.preventDefault();
            card.classList.remove('drag-over');
            if (dragSrcId === bm.id) return;
            const srcIdx = bookmarks.findIndex(b => b.id === dragSrcId);
            const dstIdx = bookmarks.findIndex(b => b.id === bm.id);
            const reordered = [...bookmarks];
            const [moved] = reordered.splice(srcIdx, 1);
            reordered.splice(dstIdx, 0, moved);
            const bookmarks_bk = [...bookmarks]
            bookmarks = reordered;
            render();
            try {
                const o = bookmarks.map(item => ({ id: item.id }));
                await apiFetch('/bookmarks', { method: 'PUT', body: { o } });
                saveCache();
            } catch {
                showToast('排序保存失败');
                bookmarks = [...bookmarks_bk];
                render();
            }
        });

        grid.appendChild(card);
    });
    const card2 = document.createElement('div');
    card2.className = 'card card2';
    card2.addEventListener('click', addNewBM);
    grid.appendChild(card2);
}

function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Context Menu ──
const ctxMenu = document.getElementById('ctx-menu');

function showCtx(x, y) {
    ctxMenu.style.display = 'block';
    // keep inside viewport
    const mw = ctxMenu.offsetWidth || 140;
    const mh = ctxMenu.offsetHeight || 90;
    ctxMenu.style.left = Math.min(x, window.innerWidth - mw - 8) + 'px';
    ctxMenu.style.top = Math.min(y, window.innerHeight - mh - 8) + 'px';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') { hideCtx(); closeModal(); } });

async function edit_bookmark(id) {
    if (!id) return;
    const bm = bookmarks.find(b => b.id === id);
    if (!bm) return;
    editingId = bm.id;
    document.getElementById('modal-title').textContent = '编辑网站';
    document.getElementById('modal-name').value = bm.name;
    document.getElementById('modal-url').value = bm.url;
    openModal();
};

async function del_bookmark(id) {
    if (!id) return;
    const bm = bookmarks.find(b => b.id === id);
    const confirm_1 = confirm('确认删除' + bm.name)
    if (!confirm_1) return;
    try {
        await apiFetch('/del_bookmark', { method: 'POST', body: { id } });
        bookmarks = bookmarks.filter(b => b.id !== id);
        saveCache(); // 同步本地缓存
        render();
        showToast('已删除');
    } catch { showToast('删除失败'); }
};

// ── Add button ──
function addNewBM() {
    editingId = null;
    document.getElementById('modal-title').textContent = '添加网站';
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-url').value = 'https://';
    openModal();
};

// ── Modal ──
const modal_overlay = document.getElementById('modal-overlay');
const uploadIcon = document.getElementById('uploadIcon');
const manualIconSection = document.getElementById('manual-icon-section');
const iconFileInput = document.getElementById('modal-icon-file');
const iconPickBtn = document.getElementById('modal-icon-pick');
const cropperWorkspace = document.getElementById('cropper-workspace');
const cropperImg = document.getElementById('cropper-img');
const cropperPreview = document.getElementById('cropper-preview');
let cropperInstance = null;
let iconObjectUrl = null;

function destroyCropper() {
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    if (iconObjectUrl) {
        URL.revokeObjectURL(iconObjectUrl);
        iconObjectUrl = null;
    }
    cropperImg.removeAttribute('src');
    cropperPreview.innerHTML = '';
    cropperWorkspace.classList.remove('active');
}

function resetIconUploader() {
    uploadIcon.checked = false;
    manualIconSection.classList.remove('open');
    iconFileInput.value = '';
    destroyCropper();
}

uploadIcon.addEventListener('change', () => {
    if (uploadIcon.checked) {
        manualIconSection.classList.add('open');
    } else {
        manualIconSection.classList.remove('open');
    }
});

iconPickBtn.addEventListener('click', () => {
    iconFileInput.value = '';
    iconFileInput.click();
});

iconFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件');
        iconFileInput.value = '';
        return;
    }

    destroyCropper();
    iconObjectUrl = URL.createObjectURL(file);
    cropperWorkspace.classList.add('active');
    cropperImg.onload = () => {
        cropperImg.onload = null;
        cropperInstance = new Cropper(cropperImg, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            minContainerWidth: 120,
            minContainerHeight: 120,
            preview: '#cropper-preview',
            guides: true,
            center: true,
            highlight: true,
            background: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
        });
    };
    cropperImg.src = iconObjectUrl;
});

function openModal() {
    resetIconUploader();
    modal_overlay.classList.add('show');
    setTimeout(() => document.getElementById('modal-name').focus(), 50);
}

function closeModal() {
    modal_overlay.classList.remove('show');
    resetIconUploader();
    editingId = null;
}

document.getElementById('modal-cancel').addEventListener('click', closeModal);

const save_btn = document.getElementById('modal-save')
save_btn.addEventListener('click', async () => {
    let name = document.getElementById('modal-name').value.trim();
    let url = document.getElementById('modal-url').value.trim();

    if (!name || !url) { showToast('请填写名称和网址'); return; }
    let icon = '';
    if (uploadIcon.checked) {
        if (!cropperInstance) {
            showToast('请选择并裁剪图标图片');
            return;
        }
        const canvas = cropperInstance.getCroppedCanvas({
            width: 128,
            height: 128,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        if (!canvas) {
            showToast('图标裁剪失败');
            return;
        }
        icon = canvas.toDataURL('image/png');
    }

    // auto-add https
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    save_btn.disabled = true;
    try {
        const body = { id: editingId || '', name, url, icon };
        const res = await apiFetch('/bookmark', {
            method: 'POST',
            body,
        });
        bookmarks = res;

        showToast('已更新');
        saveCache();
        render();
        closeModal();
    } catch (e) {
        console.log(e)
        showToast('保存失败');
    } finally {
        save_btn.disabled = false;
    }
});

// Enter in modal inputs
['modal-name', 'modal-url'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('modal-save').click();
    });
});

// ── Toast ──
let toastTimer;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Search Suggestions ──
const searchInput = document.getElementById('search-input');
const sugList = document.getElementById('suggestion-list');
let currentSugIndex = -1;
const cleanbtn = document.getElementById('clean-btn');
function getSuggestions(query) {
    if (!query) {
        hideSuggestions();
        cleanbtn.style.display = 'none';
        return
    };
    cleanbtn.style.display = 'block'
    const script = document.createElement('script');
    script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=window.baiduCallback`;
    document.body.appendChild(script);
    document.body.removeChild(script);
}

// 2. JSONP 回调函数
window.baiduCallback = function (data) {
    const suggestions = data.s;
    if (suggestions.length > 0) {
        renderSuggestions(suggestions);
    } else {
        hideSuggestions();
    }
};

// 3. 渲染列表
function renderSuggestions(list, b) {
    if (list.length === 0) return;
    sugList.innerHTML = '';
    list.slice(0, 10).forEach((item, index) => {
        const li = document.createElement('li');
        li.textContent = item;
        li.addEventListener('click', () => {
            searchInput.value = item;
            doSearch();
            hideSuggestions();
        });
        if (b) {
            const del = document.createElement('div');
            del.classList = 'delsh';
            del.textContent = '×';
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                li.remove();
                let index = sh.indexOf(item);
                if (index !== -1) sh.splice(index, 1);
                if (sh.length === 0) hideSuggestions();
                localStorage.setItem('sh_data', JSON.stringify(sh));
            })
            li.appendChild(del);
        }
        sugList.appendChild(li);
    });
    sugList.style.display = 'block';
    currentSugIndex = -1;
}

function hideSuggestions() {
    sugList.style.display = 'none';
    sugList.innerHTML = '';
}

// 4. 防抖处理
function debounce(fn, delay) {
    let timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, arguments), delay);
    }
}

// 5. 事件监听
searchInput.addEventListener('input', debounce((e) => {
    getSuggestions(e.target.value.trim());
}, 300));
searchInput.addEventListener('click', (e) => {
    let q = e.target.value.trim()
    if (q) {
        getSuggestions(q);
    } else {
        renderSuggestions(sh.toReversed(), true)
    }

});
cleanbtn.addEventListener('click', (e) => {
    searchInput.value = '';
    getSuggestions();
    renderSuggestions(sh.toReversed(), true)
});

// 6. 键盘导航
searchInput.addEventListener('keydown', (e) => {
    const items = sugList.querySelectorAll('li');
    if (sugList.style.display === 'block' && items.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentSugIndex = (currentSugIndex + 1) % items.length;
            updateActiveStep(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentSugIndex = (currentSugIndex - 1 + items.length) % items.length;
            updateActiveStep(items);
        }
    }
});

function updateActiveStep(items) {
    items.forEach((item, index) => {
        if (index === currentSugIndex) {
            item.classList.add('active');
            searchInput.value = item.textContent;
        } else {
            item.classList.remove('active');
        }
    });
}

// 点击空白处关闭
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
        hideSuggestions();
    }
});

loadBookmarks();
