const { spawn } = require('child_process');
const http = require('http');

async function findOverflowingElement(slideId, w, h) {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9313',
    `--window-size=${w},${h}`,
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9313/json', r => {
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
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const s = document.getElementById('${slideId}');
      const sRect = s.getBoundingClientRect();
      const all = Array.from(s.querySelectorAll('*'));
      const overflowing = all.map(el => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id,
          class: el.className,
          bottom: r.bottom,
          diffBottom: r.bottom - sRect.bottom,
          right: r.right,
          diffRight: r.right - sRect.right
        };
      }).filter(item => item.diffBottom > 0.5 || item.diffRight > 0.5);
      return {
        sRect,
        overflowing: overflowing.slice(0, 10)
      };
    })()`,
    returnByValue: true
  });
  console.log(`[Overflowing elements in ${slideId} at ${w}x${h}]:`, JSON.stringify(res.result.result.value, null, 2));
  ws.close();
  chrome.kill();
}

async function run() {
  await findOverflowingElement('s02', 1366, 768);
  await findOverflowingElement('s03', 1366, 768);
  await findOverflowingElement('s05', 1366, 768);
}
run();

