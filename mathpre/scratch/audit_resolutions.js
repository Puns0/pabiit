const { spawn } = require('child_process');
const http = require('http');

const RESOLUTIONS = [
  { w: 1366, h: 768 },
  { w: 1536, h: 864 },
  { w: 1920, h: 1080 },
  { w: 2560, h: 1440 }
];

async function checkResolution(resConfig, port) {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--window-size=${resConfig.w},${resConfig.h}`,
    'file:///C:/Projects/mathpre/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1200));
    const targets = await new Promise((res, rej) => {
      http.get(`http://127.0.0.1:${port}/json`, r => {
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

    const slideCount = await evaluate(`document.querySelectorAll('#deck > .slide').length`);
    const results = [];

    for (let i = 0; i < slideCount; i++) {
      await evaluate(`
        (() => {
          const deckEl = document.getElementById('deck');
          const slides = Array.from(document.querySelectorAll('#deck > .slide'));
          const s = slides[${i}];
          deckEl.scrollTop = s.offsetTop;
          s.classList.add('in-view');
          if (NG.slides && NG.slides[s.id] && NG.slides[s.id].init) {
            NG.slides[s.id].init(s);
          }
        })()
      `);
      await new Promise(r => setTimeout(r, 60));

      const info = await evaluate(`
        (() => {
          const slides = Array.from(document.querySelectorAll('#deck > .slide'));
          const s = slides[${i}];
          const diffY = s.scrollHeight - s.clientHeight;
          const diffX = s.scrollWidth - s.clientWidth;
          return {
            id: s.id,
            diffY: diffY,
            diffX: diffX,
            overflow: diffY > 0 || diffX > 0,
            scrollHeight: s.scrollHeight,
            clientHeight: s.clientHeight
          };
        })()
      `);
      results.push(info);
    }

    ws.close();
    chrome.kill();
    return results;
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

async function run() {
  console.log('=== MULTI-RESOLUTION VIEWPORT AUDIT ===');
  let allPass = true;
  let port = 9320;

  for (const res of RESOLUTIONS) {
    console.log(`\nTesting resolution ${res.w}x${res.h}...`);
    try {
      const results = await checkResolution(res, port++);
      let resFailures = 0;
      results.forEach(r => {
        if (r.overflow) {
          console.log(`  FAIL [${res.w}x${res.h}] Slide #${r.id}: scrollHeight=${r.scrollHeight}, clientHeight=${r.clientHeight}, diffY=${r.diffY}px, diffX=${r.diffX}px`);
          resFailures++;
          allPass = false;
        }
      });
      if (resFailures === 0) {
        console.log(`  PASS: All ${results.length} slides fit 100% within ${res.w}x${res.h} (0px overflow).`);
      }
    } catch (e) {
      console.error(`Error testing ${res.w}x${res.h}:`, e);
      allPass = false;
    }
  }

  console.log('\n===========================================');
  console.log('OVERALL MULTI-RESOLUTION RESULT:', allPass ? 'ALL PASS (100% ZERO OVERFLOW)' : 'FAILURES DETECTED');
  console.log('===========================================');
}

run();
