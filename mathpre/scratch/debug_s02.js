const { spawn } = require('child_process');
const http = require('http');

async function debugSlide(slideId, width, height) {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9311',
    `--window-size=${width},${height}`,
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9311/json', r => {
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
      const cs = getComputedStyle(s);
      const children = Array.from(s.children).map(c => ({
        tag: c.tagName,
        class: c.className,
        offsetHeight: c.offsetHeight,
        scrollHeight: c.scrollHeight,
        clientHeight: c.clientHeight,
        marginTop: getComputedStyle(c).marginTop,
        marginBottom: getComputedStyle(c).marginBottom
      }));
      return {
        clientHeight: s.clientHeight,
        scrollHeight: s.scrollHeight,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        rowGap: cs.rowGap,
        children
      };
    })()`,
    returnByValue: true
  });
  console.log(`[${slideId} at ${width}x${height}] Breakdown:`, JSON.stringify(res.result.result.value, null, 2));
  ws.close();
  chrome.kill();
}

async function run() {
  await debugSlide('s02', 1366, 768);
  await debugSlide('s03', 1366, 768);
  await debugSlide('s05', 1366, 768);
}
run();
