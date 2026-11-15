const { spawn } = require('child_process');
const http = require('http');

async function testScrollAndCheck() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9317',
    '--window-size=1366,768',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9317/json', r => {
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

  const results = [];
  const slideCount = await evaluate(`document.querySelectorAll('#deck > .slide').length`);

  for (let i = 0; i < slideCount; i++) {
    // Scroll directly and add in-view
    await evaluate(`
      (() => {
        const deckEl = document.getElementById('deck');
        const slides = Array.from(document.querySelectorAll('#deck > .slide'));
        const s = slides[${i}];
        deckEl.scrollTop = s.offsetTop;
        s.classList.add('in-view');
        // also initialize if needed
        if (NG.slides && NG.slides[s.id] && NG.slides[s.id].init) {
          NG.slides[s.id].init(s);
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 100));

    const check = await evaluate(`
      (() => {
        const s = document.querySelectorAll('#deck > .slide')[${i}];
        const diffY = s.scrollHeight - s.clientHeight;
        const diffX = s.scrollWidth - s.clientWidth;
        return {
          id: s.id,
          clientHeight: s.clientHeight,
          scrollHeight: s.scrollHeight,
          diffY: diffY,
          diffX: diffX,
          overflow: diffY > 0 || diffX > 0
        };
      })()
    `);
    results.push(check);
  }

  console.log('Results with in-view active:', results);
  ws.close();
  chrome.kill();
}

testScrollAndCheck();
