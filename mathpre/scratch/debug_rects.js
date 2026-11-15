const { spawn } = require('child_process');
const http = require('http');

async function debugRects(slideId) {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9341',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9341/json', r => {
      let s = ''; r.on('data', c => s += c); r.on('end', () => res(JSON.parse(s)));
    }).on('error', rej);
  });
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  function send(method, params = {}) {
    return new Promise(resolve => {
      const cur = id++;
      const onm = e => {
        const m = JSON.parse(e.data);
        if (m.id === cur) { ws.removeEventListener('message', onm); resolve(m); }
      };
      ws.addEventListener('message', onm);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });
  }
  await send('Runtime.enable');

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result && res.result.result ? res.result.result.value : undefined;
  }

  function serializeRect(r) {
    if (!r) return null;
    return {
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      width: r.width,
      height: r.height
    };
  }

  const res = await evaluate(`
    (() => {
      function rObj(r) {
        if (!r) return null;
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
      }
      const s = document.getElementById('${slideId}');
      const deckEl = document.getElementById('deck');
      deckEl.scrollTop = s.offsetTop;
      s.classList.add('in-view');
      NG.slides.${slideId}.init(s);

      const canvas = s.querySelector('.graph-svg').parentElement;
      const svg = s.querySelector('.graph-svg');
      const circleG = svg.querySelector('[data-id="G"] circle');

      const cRect = canvas.getBoundingClientRect();
      const gRect = circleG ? circleG.getBoundingClientRect() : null;

      return {
        canvas: rObj(cRect),
        svg: rObj(svg.getBoundingClientRect()),
        circleG: rObj(gRect),
        diffBottom: gRect ? gRect.bottom - cRect.bottom : null
      };
    })()
  `);
  console.log('Rects for ' + slideId + ':', JSON.stringify(res, null, 2));
  ws.close();
  chrome.kill();
}

debugRects('s04');
