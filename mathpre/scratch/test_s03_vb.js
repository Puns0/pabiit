const { spawn } = require('child_process');
const http = require('http');

async function testS03WithViewBox() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9333',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9333/json', r => {
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

      const svgs = document.querySelectorAll('#s03 .s03-canvas-area svg');
      svgs.forEach(svg => {
        svg.style.maxHeight = '100%';
        svg.style.maxWidth = '100%';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';
        svg.setAttribute('viewBox', '0 0 440 260');
      });

      const abstractBox = document.querySelectorAll('#s03 .s03-sub-diagram')[1];
      const abstractSvg = document.querySelector('#s03-abstract-canvas svg');
      const abstractF = abstractSvg.querySelector('[data-id="F"] circle');

      const absB = abstractBox.getBoundingClientRect().bottom;
      const absFC = abstractF.getBoundingClientRect().bottom;

      return {
        abstractBoxBottom: absB,
        abstractFCircleBottom: absFC,
        abstractFCircleMarginFromBottom: absB - absFC
      };
    })()
  `);
  console.log('Result with viewBox 0 0 440 260:', res);
  ws.close();
  chrome.kill();
}
testS03WithViewBox();

