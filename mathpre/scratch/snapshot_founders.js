const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function snapshotFounders() {
  fs.writeFileSync('scratch/founders_test.html', `
    <!DOCTYPE html>
    <html>
    <head><style>
      body { background: white; font-family: sans-serif; display: flex; gap: 20px; padding: 20px; }
      .box { border: 2px solid black; padding: 10px; text-align: center; }
      img { width: 150px; height: 150px; object-fit: cover; border-radius: 50%; }
    </style></head>
    <body>
      <div class="box"><h3>founder-1</h3><img src="../founder_images/founder-1.jpg"></div>
      <div class="box"><h3>founder-2</h3><img src="../founder_images/founder-2.jpeg"></div>
      <div class="box"><h3>founder-3</h3><img src="../founder_images/founder-3.webp"></div>
      <div class="box"><h3>college-logo</h3><img src="../founder_images/college-logo.jpg"></div>
    </body>
    </html>
  `);

  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9349',
    '--window-size=900,400',
    'file:///C:/Projects/mathpre/scratch/founders_test.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9349/json', r => {
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

  await new Promise(r => setTimeout(r, 500));
  const snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/founders_preview.png', Buffer.from(snap.result.data, 'base64'));
  console.log('Saved scratch/founders_preview.png');

  ws.close();
  chrome.kill();
}

snapshotFounders();

