const { spawn } = require('child_process');
const http = require('http');

const RESOLUTIONS = [
  { w: 1366, h: 768, name: '1366x768' },
  { w: 1920, h: 1080, name: '1920x1080' },
  { w: 2560, h: 1440, name: '2560x1440' }
];

async function runAudit() {
  const allResults = {};

  for (let rIdx = 0; rIdx < RESOLUTIONS.length; rIdx++) {
    const res = RESOLUTIONS[rIdx];
    const port = 9335 + rIdx;

    const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--window-size=${res.w},${res.h}`,
      'file:///C:/Projects/mathpre/index.html'
    ]);

    try {
      await new Promise(r => setTimeout(r, 1200));
      const targets = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, r => {
          let s = ''; r.on('data', c => s += c); r.on('end', () => resolve(JSON.parse(s)));
        }).on('error', reject);
      });
      const page = targets.find(t => t.type === 'page');
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise(r => ws.onopen = r);

      let msgId = 1;
      function send(method, params = {}) {
        return new Promise(resolve => {
          const cur = msgId++;
          const onm = e => {
            const m = JSON.parse(e.data);
            if (m.id === cur) { ws.removeEventListener('message', onm); resolve(m); }
          };
          ws.addEventListener('message', onm);
          ws.send(JSON.stringify({ id: cur, method, params }));
        });
      }

      await send('Runtime.enable');
      await send('Page.enable');

      async function evaluate(expr) {
        const r = await send('Runtime.evaluate', {
          expression: expr,
          returnByValue: true,
          awaitPromise: true
        });
        if (r.result && r.result.exceptionDetails) {
          console.error('Eval error in audit:', r.result.exceptionDetails);
        }
        return r.result && r.result.result ? r.result.result.value : undefined;
      }

      // Check each slide: s03, s11, s12
      const slideData = await evaluate(`
        (() => {
          const out = {};
          const slides = ['s03', 's11', 's12'];

          slides.forEach(sid => {
            const s = document.getElementById(sid);
            if (!s) return;
            s.classList.add('in-view');
            if (window.NG && NG.slides && NG.slides[sid] && NG.slides[sid].init) {
              NG.slides[sid].init(s);
            }

            const sRect = s.getBoundingClientRect();
            // Find lowest content element in slide
            const allDesc = Array.from(s.querySelectorAll('*')).filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && el.offsetParent !== null;
            });
            let maxBottom = 0;
            allDesc.forEach(el => {
              const r = el.getBoundingClientRect();
              if (r.bottom > maxBottom) maxBottom = r.bottom;
            });

            const emptyGapPx = sRect.bottom - maxBottom;
            const emptyGapPct = (emptyGapPx / window.innerHeight) * 100;

            // Check overflow and scrollable descendants
            let hasOverflow = s.scrollHeight > s.clientHeight + 2;
            const scrollableDesc = [];
            allDesc.forEach(el => {
              if (el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY === 'auto') {
                // Ignore small list overflows if designed to scroll
                scrollableDesc.push({ tag: el.tagName, cls: el.className, sh: el.scrollHeight, ch: el.clientHeight });
              }
            });

            out[sid] = {
              windowH: window.innerHeight,
              slideBottom: sRect.bottom,
              contentBottom: maxBottom,
              emptyGapPx: Math.round(emptyGapPx),
              emptyGapPct: parseFloat(emptyGapPct.toFixed(2)),
              hasOverflow,
              scrollableDesc
            };
          });

          return out;
        })()
      `);

      allResults[res.name] = slideData;

      ws.close();
      chrome.kill();
    } catch (err) {
      console.error('Error on resolution ' + res.name, err);
      try { chrome.kill(); } catch (_) {}
    }
  }

  console.log('AUDIT RESOLUTION METRICS:');
  console.log(JSON.stringify(allResults, null, 2));
}

runAudit();

