const { spawn } = require('child_process');
const http = require('http');

async function measureS03() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9330',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9330/json', r => {
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

  const res = await evaluate(`
    (() => {
      const s03 = document.getElementById('s03');
      s03.scrollIntoView();
      NG.slides.s03.init(s03);

      const realBox = document.querySelectorAll('#s03 .s03-sub-diagram')[0];
      const realSvg = document.getElementById('s03-real-svg');
      const realF = realSvg ? realSvg.querySelector('[data-node="F"] circle') : null;
      const realFText = realSvg ? realSvg.querySelector('[data-node="F"] text:last-child') : null;

      const abstractBox = document.querySelectorAll('#s03 .s03-sub-diagram')[1];
      const abstractSvg = document.querySelector('#s03-abstract-canvas svg');
      const abstractF = abstractSvg ? abstractSvg.querySelector('[data-id="F"] circle') : null;

      const realB = realBox ? realBox.getBoundingClientRect().bottom : 0;
      const realFC = realF ? realF.getBoundingClientRect().bottom : 0;
      const realFT = realFText ? realFText.getBoundingClientRect().bottom : 0;

      const absB = abstractBox ? abstractBox.getBoundingClientRect().bottom : 0;
      const absFC = abstractF ? abstractF.getBoundingClientRect().bottom : 0;

      return {
        realBoxBottom: realB,
        realFCircleBottom: realFC,
        realFTextBottom: realFT,
        realFCircleDiff: realFC - realB,
        realFTextDiff: realFT - realB,

        abstractBoxBottom: absB,
        abstractFCircleBottom: absFC,
        abstractFCircleDiff: absFC - absB
      };
    })()
  `);
  console.log('Measurement results (1920x1080):', res);
  ws.close();
  chrome.kill();
}
measureS03();
