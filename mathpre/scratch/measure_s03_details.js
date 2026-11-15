const { spawn } = require('child_process');
const http = require('http');

async function measureExactS03() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9346',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9346/json', r => {
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
    NG.deck.goTo(2);
  `);
  await new Promise(r => setTimeout(r, 300));

  const details = await evaluate(`
    (() => {
      const realCont = document.getElementById('s03-real-canvas');
      const abstractCont = document.getElementById('s03-abstract-canvas');
      const realBox = realCont.getBoundingClientRect();
      const abstractBox = abstractCont.getBoundingClientRect();

      const realF = realCont.querySelector('[data-node="F"]');
      const realFCircle = realF.querySelector('circle').getBoundingClientRect();
      const realFText = realF.querySelector('text:last-child').getBoundingClientRect();

      const abstractF = abstractCont.querySelector('[data-id="F"]');
      const abstractFCircle = abstractF.querySelector('circle').getBoundingClientRect();

      return {
        realBox: { top: realBox.top, bottom: realBox.bottom, height: realBox.height },
        abstractBox: { top: abstractBox.top, bottom: abstractBox.bottom, height: abstractBox.height },
        realF: {
          circleBottom: realFCircle.bottom,
          circleMarginBottom: Math.round(realBox.bottom - realFCircle.bottom),
          textBottom: realFText.bottom,
          textMarginBottom: Math.round(realBox.bottom - realFText.bottom)
        },
        abstractF: {
          circleBottom: abstractFCircle.bottom,
          circleMarginBottom: Math.round(abstractBox.bottom - abstractFCircle.bottom)
        }
      };
    })()
  `);

  console.log('Slide 3 Exact Node F Margins:', details);
  ws.close();
  chrome.kill();
}

measureExactS03();

