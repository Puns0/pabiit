const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function captureSlideScreenshots() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9345',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9345/json', r => {
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

  await evaluate(`
    document.documentElement.classList.add('reduced-motion');
    NG.deck.reducedMotion = true;
  `);

  // Slide 3
  await evaluate(`NG.deck.goTo(2);`);
  await new Promise(r => setTimeout(r, 400));
  const snapS03 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/screenshot_s03.png', Buffer.from(snapS03.result.data, 'base64'));
  console.log('Saved scratch/screenshot_s03.png');

  // Slide 1
  await evaluate(`NG.deck.goTo(0);`);
  await new Promise(r => setTimeout(r, 400));
  const snapS01 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/screenshot_s01.png', Buffer.from(snapS01.result.data, 'base64'));
  console.log('Saved scratch/screenshot_s01.png');

  ws.close();
  chrome.kill();
}

captureSlideScreenshots();

