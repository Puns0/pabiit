const { spawn } = require('child_process');
const http = require('http');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9262',
  'file:///C:/Projects/mathpre/tests/tests.html'
]);

setTimeout(async () => {
  try {
    const targets = await new Promise((res, rej) => {
      http.get('http://127.0.0.1:9262/json', r => {
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
    await new Promise(r => setTimeout(r, 600));
    const res = await send('Runtime.evaluate', {
      expression: `({
        total: document.querySelectorAll('.item-pass, .item-fail').length,
        pass: document.querySelectorAll('.item-pass').length,
        fail: document.querySelectorAll('.item-fail').length,
        statText: document.getElementById('stat-text').textContent,
        badgeText: document.getElementById('status-badge').textContent
      })`,
      returnByValue: true
    });
    console.log('Unit tests summary:', res.result.result.value);
    ws.close();
    chrome.kill();
  } catch (err) {
    console.error(err);
    chrome.kill();
    process.exit(1);
  }
}, 1000);
