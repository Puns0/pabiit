const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function snap() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9352',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise(res => http.get('http://127.0.0.1:9352/json', r => {
    let s = ''; r.on('data', c => s += c); r.on('end', () => res(JSON.parse(s)));
  }));
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (m, p={}) => new Promise(res => {
    const cur = id++;
    const onm = e => { const msg = JSON.parse(e.data); if (msg.id === cur) { ws.removeEventListener('message', onm); res(msg); } };
    ws.addEventListener('message', onm);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });
  await send('Runtime.enable');
  await send('Page.enable');

  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Slide 14 Tab 2
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const deck = document.getElementById('deck');
        const s = document.getElementById('s12');
        deck.scrollTop = s.offsetTop;
        s.classList.add('in-view');
        NG.slides.s12.init(s);
        NG.slides.s12.switchTab(2);
        s.querySelectorAll('.reveal').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
      })()
    `
  });
  await new Promise(r => setTimeout(r, 400));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/shot_s12_tab2_1920.png', Buffer.from(shot.result.data, 'base64'));

  // Slide 14 Tab 3
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        NG.slides.s12.switchTab(3);
      })()
    `
  });
  await new Promise(r => setTimeout(r, 400));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/shot_s12_tab3_1920.png', Buffer.from(shot.result.data, 'base64'));

  // 2560x1440
  await send('Emulation.setDeviceMetricsOverride', {
    width: 2560,
    height: 1440,
    deviceScaleFactor: 1,
    mobile: false
  });
  const slides = ['s03', 's11', 's12'];
  for (const sid of slides) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const deck = document.getElementById('deck');
          const s = document.getElementById('${sid}');
          deck.scrollTop = s.offsetTop;
          s.classList.add('in-view');
          if (NG.slides && NG.slides['${sid}'] && NG.slides['${sid}'].init) {
            NG.slides['${sid}'].init(s);
          }
          if ('${sid}' === 's12') NG.slides.s12.switchTab(1);
          s.querySelectorAll('.reveal').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
        })()
      `
    });
    await new Promise(r => setTimeout(r, 400));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/shot_${sid}_2560.png`, Buffer.from(shot.result.data, 'base64'));
  }

  // 1366x768
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false
  });
  for (const sid of slides) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const deck = document.getElementById('deck');
          const s = document.getElementById('${sid}');
          deck.scrollTop = s.offsetTop;
          s.classList.add('in-view');
          if (NG.slides && NG.slides['${sid}'] && NG.slides['${sid}'].init) {
            NG.slides['${sid}'].init(s);
          }
          if ('${sid}' === 's12') NG.slides.s12.switchTab(1);
          s.querySelectorAll('.reveal').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
        })()
      `
    });
    await new Promise(r => setTimeout(r, 400));
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`scratch/shot_${sid}_1366.png`, Buffer.from(shot.result.data, 'base64'));
  }

  console.log('All extra screenshots saved.');
  ws.close();
  chrome.kill();
}
snap();
