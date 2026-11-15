const { spawn } = require('child_process');
const http = require('http');

async function analyzeFounders() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9350',
    '--window-size=900,400',
    'file:///C:/Projects/mathpre/scratch/founders_test.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9350/json', r => {
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

  const analysis = await evaluate(`
    (() => {
      const imgs = document.querySelectorAll('img');
      const out = {};
      imgs.forEach((img, i) => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        let whitePixels = 0, orangePixels = 0;
        for (let j = 0; j < data.length; j += 16) {
          const r = data[j], g = data[j+1], b = data[j+2];
          rSum += r; gSum += g; bSum += b; count++;
          if (r > 200 && g > 200 && b > 200) whitePixels++;
          if (r > 180 && g > 60 && g < 150 && b < 60) orangePixels++;
        }
        out[img.src.split('/').pop()] = {
          avgR: Math.round(rSum/count),
          avgG: Math.round(gSum/count),
          avgB: Math.round(bSum/count),
          whitePct: Math.round((whitePixels/count)*100),
          orangePct: Math.round((orangePixels/count)*100)
        };
      });
      return out;
    })()
  `);

  console.log('Image Color Analysis:', analysis);
  ws.close();
  chrome.kill();
}

analyzeFounders();

