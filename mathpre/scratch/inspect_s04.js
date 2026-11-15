const { spawn } = require('child_process');
const http = require('http');

async function inspectS04() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9335',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9335/json', r => {
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
      const s04 = document.getElementById('s04');
      s04.scrollIntoView();
      NG.slides.s04.init(s04);

      const svgs = Array.from(s04.querySelectorAll('svg')).map((svg, i) => {
        const cs = getComputedStyle(svg);
        const parent = svg.parentElement;
        const pCs = getComputedStyle(parent);
        return {
          idx: i,
          id: svg.id,
          class: svg.className.baseVal,
          parentClass: parent.className,
          parentId: parent.id,
          parentHeight: parent.offsetHeight,
          parentWidth: parent.offsetWidth,
          svgHeight: svg.getBoundingClientRect().height,
          svgWidth: svg.getBoundingClientRect().width,
          csHeight: cs.height,
          csWidth: cs.width,
          csMaxHeight: cs.maxHeight,
          viewBox: svg.getAttribute('viewBox')
        };
      });

      return svgs;
    })()
  `);
  console.log('SVGs in s04:', res);
  ws.close();
  chrome.kill();
}
inspectS04();

