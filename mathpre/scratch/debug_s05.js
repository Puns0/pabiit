const { spawn } = require('child_process');
const http = require('http');

async function debugS05Layout() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9312',
    '--window-size=1366,768',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9312/json', r => {
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
      const left = document.querySelector('#s05 .s05-left');
      const right = document.querySelector('#s05 .s05-right');
      const leftCards = Array.from(left.children).map(c => ({
        class: c.className,
        offsetHeight: c.offsetHeight
      }));
      const rightChildren = Array.from(right.children).map(c => ({
        class: c.className,
        offsetHeight: c.offsetHeight
      }));
      return {
        left: { offsetHeight: left.offsetHeight, scrollHeight: left.scrollHeight, children: leftCards },
        right: { offsetHeight: right.offsetHeight, scrollHeight: right.scrollHeight, children: rightChildren }
      };
    })()`,
    returnByValue: true
  });
  console.log('[s05 internal layout breakdown]:', JSON.stringify(res.result.result.value, null, 2));
  ws.close();
  chrome.kill();
}
debugS05Layout();

