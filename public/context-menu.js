document.addEventListener('DOMContentLoaded', () => {
  const css = `
    .context-menu {
        --st: env(safe-area-inset-top, 0px);
        --sb: env(safe-area-inset-bottom, 0px);
        display: flex;
        flex-direction: column;
        visibility: hidden;
        opacity: 0;
        background-color: #fff;
        color: #333;
        position: fixed;
        left: var(--context-menu-l);
        top: var(--context-menu-t);
        bottom: var(--context-menu-b);
        transform: translateY(var(--context-menu-tf,0));
        z-index: 999;
        padding: 8px;
        border-radius: 8px;
        outline: 1px solid #bbb;
        overflow: hidden;
        transition: none;
        transform: scale(.7);
    }
    .context-menu:empty {
        display: none;
    }
    .context-menu div {
        width: 100%;
        text-align: left;
        letter-spacing: 1px;
        font-size: 16px;
        padding: 8px 12px;
        cursor: default;
        white-space: nowrap;
        background-color: transparent;
        transition: background-color 0.2s ease-in-out;
    }

    .context-menu hr {
        border: none;
        border-bottom: 1px solid #eee;
        width: 100%;
    }

    @media (pointer: fine) {
        .context-menu div:hover { background-color: #0084ff20; }
    }
        
    .context-menu.show {
        visibility: visible;
        opacity: 1;
        transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out;
        transform: none;
    }

    @media (max-width: 500px) {
      .context-menu {
          left: 0;
          right: 0;
          top: auto;
          bottom: 0;
          padding: 15px 12px;
          padding-bottom: calc(15px + var(--sb));
          border-radius: 24px 24px 0 0;
          transform: translateY(50px);
          outline: 2px solid #bbb;
      }
      .context-menu::after{
          content: '取消';
          display: block;
          padding: 20px;
          font-size: 17px;
          border-top: 1px solid #8a434330;
          color: #8a4343;
          text-align: center;
          letter-spacing: 3px;
      }
      .context-menu div {
          width: 100%;
          padding: 20px;
          font-size: 17px;
          text-align: center;
          letter-spacing: 3px;
      }
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = css;
  document.head.appendChild(styleSheet);
})


const contextMenu = document.createElement('div');
contextMenu.classList.add('context-menu');
document.body.append(contextMenu);

contextMenu.addEventListener('click', (e) => {
  // e.preventDefault();
  // e.stopPropagation();
  contextMenu.classList.remove('show');
  contextMenu.innerHTML = '';
});
function showMenu(rect, els = []) {
  contextMenu.classList.remove('show');
  contextMenu.innerHTML = '';
  els.forEach((el, i) => {
    const hr = document.createElement('hr')
    if (i > 0) contextMenu.append(hr);
    contextMenu.append(el);
  });

  const mw = contextMenu.offsetWidth;
  // const mh = contextMenu.offsetHeight;

  let x = rect.left;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const viewportMiddle = window.innerHeight / 2;
  const distTop = Math.abs(rect.top - viewportMiddle);
  const distBottom = Math.abs(rect.bottom - viewportMiddle);

  let isTop = true;
  let y = rect.bottom;
  if (distTop < distBottom) {
    isTop = false;
    y = vh - rect.top;
  };

  y = y + 6;

  if (x + mw > vw - 10) x = vw - mw - 10;
  if (x < 10) x = 10;


  // console.log(x, y);

  let sty = `
      --context-menu-${isTop ? 't' : 'b'}: ${y}px;
      --context-menu-l: ${x}px; 
      `;
  contextMenu.style.cssText = sty;
  contextMenu.classList.add('show');
}

document.addEventListener('pointerdown', (e) => {
  if (!e.target.dataset.menu && !contextMenu.contains(e.target)) {
    contextMenu.classList.remove('show');
  }
});
