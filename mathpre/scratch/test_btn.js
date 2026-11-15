const { spawn } = require('child_process');
const http = require('http');

async function testClick() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9267',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9267/json', r => {
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
      const s15 = document.getElementById('s15');
      NG.slides.s15.init(s15);
      const btn = document.getElementById('s15-btn-campus');
      let scrolledTarget = null;
      let scrollOpts = null;
      const s08b = document.getElementById('s08b');
      const orig = s08b.scrollIntoView;
      s08b.scrollIntoView = function(opts) {
        scrolledTarget = 's08b';
        scrollOpts = opts;
        if (orig) orig.call(this, opts);
      };
      btn.click();
      return { scrolledTarget, scrollOpts };
    })()`,
    returnByValue: true
  });
  console.log('Button click test result:', res.result.result.value);
  ws.close();
  chrome.kill();
}
testClick();

