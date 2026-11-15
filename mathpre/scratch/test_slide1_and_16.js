const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function testSlide1And16() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9351',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9351/json', r => {
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
    if (res.result && res.result.exceptionDetails) {
      console.error('Eval error:', res.result.exceptionDetails);
    }
    return res.result && res.result.result ? res.result.result.value : undefined;
  }

  await evaluate(`
    document.documentElement.classList.add('reduced-motion');
    NG.deck.reducedMotion = true;
  `);

  const slideCount = await evaluate(`document.querySelectorAll('#deck > .slide').length`);
  console.log('Total slides in DOM:', slideCount);

  // Check Slide 1 details
  await evaluate(`NG.deck.goTo(0);`);
  await new Promise(r => setTimeout(r, 300));
  const s01Info = await evaluate(`
    (() => {
      const s01 = document.getElementById('s01');
      const frame = s01.querySelector('.s01-template-frame');
      const imgs = Array.from(s01.querySelectorAll('img')).map(img => ({
        src: img.getAttribute('src'),
        loaded: img.complete && img.naturalWidth > 0,
        w: img.naturalWidth,
        h: img.naturalHeight,
        rect: {
          w: Math.round(img.getBoundingClientRect().width),
          h: Math.round(img.getBoundingClientRect().height)
        }
      }));
      return {
        slideH: s01.clientHeight,
        scrollH: s01.scrollHeight,
        frameH: frame ? frame.offsetHeight : 0,
        overflow: s01.scrollHeight - s01.clientHeight,
        images: imgs
      };
    })()
  `);
  console.log('Slide 1 Check:', s01Info);

  // Screenshot Slide 1
  const snap1 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/snap_slide1_new.png', Buffer.from(snap1.result.data, 'base64'));
  console.log('Saved scratch/snap_slide1_new.png');

  // Check Slide 16 details (last slide)
  await evaluate(`NG.deck.goTo(${slideCount - 1});`);
  await new Promise(r => setTimeout(r, 300));
  const s16Info = await evaluate(`
    (() => {
      const s16 = document.getElementById('s16');
      const thankYou = s16.querySelector('.s16-thank-you');
      const brand = s16.querySelector('.s16-brand');
      const counter = document.querySelector('.slide-counter');
      return {
        id: s16.id,
        slideH: s16.clientHeight,
        scrollH: s16.scrollHeight,
        overflow: s16.scrollHeight - s16.clientHeight,
        thankYouText: thankYou ? thankYou.textContent : '',
        thankYouFontSize: thankYou ? getComputedStyle(thankYou).fontSize : '',
        brandText: brand ? brand.textContent : '',
        brandFontSize: brand ? getComputedStyle(brand).fontSize : '',
        counterText: counter ? counter.textContent : ''
      };
    })()
  `);
  console.log('Slide 16 Check:', s16Info);

  // Screenshot Slide 16
  const snap16 = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('scratch/snap_slide16_new.png', Buffer.from(snap16.result.data, 'base64'));
  console.log('Saved scratch/snap_slide16_new.png');

  ws.close();
  chrome.kill();
}

testSlide1And16();

