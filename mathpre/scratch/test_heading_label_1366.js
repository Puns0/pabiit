const { spawn } = require('child_process');
const http = require('http');

async function testAllHeadings() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9341',
    '--window-size=1366,768',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9341/json', r => {
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
      console.error('Eval error:', res.result.exceptionDetails.exception ? res.result.exceptionDetails.exception.description : res.result.exceptionDetails.text);
    }
    return res.result && res.result.result ? res.result.result.value : undefined;
  }

  // Set reduced motion so goTo is instant
  await evaluate(`
    document.documentElement.classList.add('reduced-motion');
    NG.deck.reducedMotion = true;
  `);

  const slideCount = await evaluate(`document.querySelectorAll('#deck > .slide').length`);

  for (let i = 0; i < slideCount; i++) {
    await evaluate(`NG.deck.goTo(${i});`);
    await new Promise(r => setTimeout(r, 150));

    const check = await evaluate(`
      (() => {
        const s = document.querySelectorAll('#deck > .slide')[${i}];
        const label = s.querySelector('.slide-label');
        const h2 = s.querySelector('h2') || s.querySelector('h1');
        if (!label || !h2) return { id: s.id, missing: true };

        const lr = label.getBoundingClientRect();
        const hr = h2.getBoundingClientRect();

        const overlapX = (lr.right > hr.left) && (lr.left < hr.right);
        const overlapY = (lr.bottom > hr.top) && (lr.top < hr.bottom);

        return {
          id: s.id,
          label: label.textContent.trim(),
          overlap: overlapX && overlapY,
          labelRect: { left: Math.round(lr.left), right: Math.round(lr.right), top: Math.round(lr.top), bottom: Math.round(lr.bottom) },
          h2Rect: { left: Math.round(hr.left), right: Math.round(hr.right), top: Math.round(hr.top), bottom: Math.round(hr.bottom) },
          gapX: Math.round(hr.left - lr.right)
        };
      })()
    `);

    console.log(`Slide ${check.id} (${check.label}): overlap=${check.overlap}, gapX=${check.gapX}px [label.right=${check.labelRect ? check.labelRect.right : 0}, h2.left=${check.h2Rect ? check.h2Rect.left : 0}]`);
  }

  ws.close();
  chrome.kill();
}

testAllHeadings();
