const { spawn } = require('child_process');
const http = require('http');

async function testH2() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9315',
    '--window-size=1366,768',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9315/json', r => {
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
      const h2_s02 = document.querySelector('#s02 h2');
      const h2_s03 = document.querySelector('#s03 h2');
      const h2_s05 = document.querySelector('#s05 h2');
      return {
        s02_h2_mb: getComputedStyle(h2_s02).marginBottom,
        s03_h2_mb: getComputedStyle(h2_s03).marginBottom,
        s05_h2_mb: getComputedStyle(h2_s05).marginBottom
      };
    })()`,
    returnByValue: true
  });
  console.log('H2 margins:', res.result.result.value);
  ws.close();
  chrome.kill();
}
testH2();

