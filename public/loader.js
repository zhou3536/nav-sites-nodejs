
function injectLoaderStyles() {
    const STYLE_ID = 'custom-loader-style';
    if (document.getElementById(STYLE_ID)) return;

    const css = `
            .loader {
                position: absolute;
                top: calc(45% - 1.25em);
                left: calc(50% - 1.25em);
                width: 2.5em;
                transform-origin: center;
                animation: rotate4 1.5s linear infinite;
                z-index: 99999;
                pointer-events: none;
            }

            .loader circle {
                fill: none;
                stroke-width: 3.5;
                stroke-dasharray: 1, 200;
                stroke-dashoffset: 0;
                stroke-linecap: round;
                /* 同时执行线条伸缩动画(dash4) 和 颜色渐变动画(colorChange) */
                animation: dash4 1.5s ease-in-out infinite, colorChange 6s ease-in-out infinite;
            }

            /* 旋转动画 */
            @keyframes rotate4 {
                100% {
                    transform: rotate(360deg);
                }
            }

            /* 伸缩动画 */
            @keyframes dash4 {
                0% {
                    stroke-dasharray: 1, 200;
                    stroke-dashoffset: 0;
                }
                50% {
                    stroke-dasharray: 90, 200;
                    stroke-dashoffset: -35px;
                }
                100% {
                    stroke-dashoffset: -125px;
                }
            }

            /* 颜色渐变流动动画（可自由替换你喜欢的颜色） */
            @keyframes colorChange {
                0%, 100% {
                    stroke: #4285F4; /* Google 蓝 */
                }
                25% {
                    stroke: #EA4335; /* Google 红 */
                }
                50% {
                    stroke: #FBBC05; /* Google 黄 */
                }
                75% {
                    stroke: #34A853; /* Google 绿 */
                }
            }
        `;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.append(style);
}
injectLoaderStyles();
// 2. 添加 Loader
function addLoader(el, c) {
    if (!el) return;
    if (c === 'c') el.innerText = '';
    if (el.querySelector(':scope > .loader')) return;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'loader');
    svg.setAttribute('viewBox', '25 25 50 50');

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', '20');
    circle.setAttribute('cy', '50');
    circle.setAttribute('cx', '50');

    svg.append(circle);

    const computedStyle = window.getComputedStyle(el);
    if (computedStyle.position === 'static') {
        el.style.position = 'relative';
    }

    el.append(svg);
}

// 3. 移除 Loader
function removeLoader(el) {
    if (!el) return;
    const loader = el.querySelector(':scope > .loader');
    if (loader) {
        loader.remove();
    }
}

