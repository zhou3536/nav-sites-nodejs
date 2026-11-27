const ENGINES = [
    { name: '必应', image: 'bing', url: 'https://www.bing.com/search?q=' },
    { name: '百度', image: 'baidu', url: 'https://www.baidu.com/s?wd=' },
    { name: 'Google', image: 'google', url: 'https://www.google.com/search?q=' },
];

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

export function initSearch({ showToast }) {
    let sh = JSON.parse(localStorage.getItem('sh_data') || '[]');
    let activeEngineIndex = Number(localStorage.getItem('engine')) || 0;
    let currentSugIndex = -1;

    const searchInput = document.getElementById('search-input');
    const sugList = document.getElementById('suggestion-list');
    const searchBtn = document.getElementById('search-btn');
    const enginePill = document.getElementById('engine-pill');
    const enginePills = document.getElementById('engine-pills');
    const cleanBtn = document.getElementById('clean-btn');

    if (!ENGINES[activeEngineIndex]) activeEngineIndex = 0;

    // ── Search Engine Selector ──
    enginePill.style.cssText = `--bgc:url('/img/${ENGINES[activeEngineIndex].image}.png')`;
    enginePill.addEventListener('click', () => {
        enginePills.classList.toggle('active');
        hideSuggestions();
    });

    ENGINES.forEach((item, index) => {
        const div = document.createElement('div');
        div.textContent = item.name;
        div.style.cssText = `--bgc:url('/img/${item.image}.png')`;
        enginePills.append(div);
        div.addEventListener('click', () => {
            enginePill.style.cssText = `--bgc:url('/img/${item.image}.png')`;
            activeEngineIndex = index;
            localStorage.setItem('engine', activeEngineIndex);
            enginePills.classList.remove('active');
        });
    });

    // ── Search Execution & History ──
    function doSearch() {
        const q = searchInput.value.trim();
        if (!q) {
            showToast('请输入搜索内容');
            return;
        }
        window.open(ENGINES[activeEngineIndex].url + q, '_blank');
        const index = sh.indexOf(q);
        if (index !== -1) sh.splice(index, 1);
        sh.push(q);
        if (sh.length > 10) sh.shift();
        localStorage.setItem('sh_data', JSON.stringify(sh));
    }

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
    });

    // ── Search Suggestions (Baidu JSONP & History) ──
    function getSuggestions(query) {
        if (!query) {
            hideSuggestions();
            cleanBtn.style.display = 'none';
            return;
        }
        cleanBtn.style.display = 'block';
        const script = document.createElement('script');
        script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=window.baiduCallback`;
        document.body.appendChild(script);
        document.body.removeChild(script);
    }

    window.baiduCallback = function (data) {
        const suggestions = data.s;
        if (suggestions.length > 0) {
            renderSuggestions(suggestions);
        } else {
            hideSuggestions();
        }
    };

    function renderSuggestions(list, isHistory = false) {
        if (list.length === 0) return;
        sugList.innerHTML = '';
        list.slice(0, 10).forEach((item) => {
            const li = document.createElement('li');
            li.textContent = item;
            li.addEventListener('click', () => {
                searchInput.value = item;
                doSearch();
                hideSuggestions();
            });
            if (isHistory) {
                const del = document.createElement('div');
                del.className = 'delsh';
                del.textContent = '×';
                del.addEventListener('click', (e) => {
                    e.stopPropagation();
                    li.remove();
                    const index = sh.indexOf(item);
                    if (index !== -1) sh.splice(index, 1);
                    if (sh.length === 0) hideSuggestions();
                    localStorage.setItem('sh_data', JSON.stringify(sh));
                });
                li.appendChild(del);
            }
            sugList.appendChild(li);
        });
        sugList.classList.add('active');
        currentSugIndex = -1;
    }

    function hideSuggestions() {
        sugList.classList.remove('active');
        sugList.innerHTML = '';
    }

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

    searchInput.addEventListener('input', debounce((e) => {
        getSuggestions(e.target.value.trim());
    }, 300));

    searchInput.addEventListener('click', (e) => {
        enginePills.classList.remove('active');
        const q = e.target.value.trim();
        if (q) {
            getSuggestions(q);
        } else {
            renderSuggestions(sh.toReversed(), true);
        }
    });

    cleanBtn.addEventListener('click', () => {
        searchInput.value = '';
        getSuggestions();
        renderSuggestions(sh.toReversed(), true);
    });

    searchInput.addEventListener('keydown', (e) => {
        const items = sugList.querySelectorAll('li');
        if (sugList.classList.contains('active') && items.length > 0) {
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

    document.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.search-box')) return;
        hideSuggestions();
        enginePills.classList.remove('active');
    });
}
