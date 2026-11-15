const { spawn } = require('child_process');
const http = require('http');

async function checkFounders() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9348',
    '--window-size=800,600',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9348/json', r => {
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
    return res.result;
  }

  const res = await evaluate(`
    (async () => {
      const files = ['founder-1.jpg', 'founder-2.jpeg', 'founder-3.webp', 'college-logo.jpg'];
      const out = [];
      for (const f of files) {
        try {
          const img = new Image();
          img.src = 'founder_images/' + f;
          await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => resolve('err: ' + e);
          });
          out.push({ f, w: img.naturalWidth, h: img.naturalHeight });
        } catch (e) {
          out.push({ f, error: e.message });
        }
      }
      return out;
    })()
  `);

  console.log('Images info:', JSON.stringify(res, null, 2));
  ws.close();
  chrome.kill();
}

checkFounders();
