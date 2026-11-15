const { spawn } = require('child_process');
const http = require('http');

async function debugS03Details() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9331',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9331/json', r => {
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

  const res = await evaluate(`
    (() => {
      const s03 = document.getElementById('s03');
      s03.scrollIntoView();
      NG.slides.s03.init(s03);

      const abstractBox = document.querySelectorAll('#s03 .s03-sub-diagram')[1];
      const canvasArea = abstractBox.querySelector('.s03-canvas-area');
      const svg = canvasArea.querySelector('svg');
      const csSvg = getComputedStyle(svg);

      return {
        boxHeight: abstractBox.offsetHeight,
        canvasAreaHeight: canvasArea.offsetHeight,
        canvasAreaWidth: canvasArea.offsetWidth,
        svgWidth: svg.getBoundingClientRect().width,
        svgHeight: svg.getBoundingClientRect().height,
        svgAttrWidth: svg.getAttribute('width'),
        svgAttrHeight: svg.getAttribute('height'),
        svgViewBox: svg.getAttribute('viewBox'),
        svgCsWidth: csSvg.width,
        svgCsHeight: csSvg.height,
        svgCsMaxHeight: csSvg.maxHeight
      };
    })()
  `);
  console.log('S03 Details:', res);
  ws.close();
  chrome.kill();
}
debugS03Details();

