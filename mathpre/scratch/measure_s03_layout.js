const { spawn } = require('child_process');
const http = require('http');

async function measureS03() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9342',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9342/json', r => {
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

  await evaluate(`NG.deck.goTo(2);`);
  await new Promise(r => setTimeout(r, 200));

  const s03Metrics = await evaluate(`
    (() => {
      const s03 = document.getElementById('s03');
      const row = s03.querySelector('.s03-diagrams-row');
      const bottom = s03.querySelector('.s03-bottom-panel');
      const rightCol = s03.querySelector('.s03-right-col');
      const leftCol = s03.querySelector('.s03-left-col');
      return {
        slideHeight: s03.clientHeight,
        slideScrollHeight: s03.scrollHeight,
        rowHeight: row ? row.offsetHeight : 0,
        bottomHeight: bottom ? bottom.offsetHeight : 0,
        rightColHeight: rightCol ? rightCol.offsetHeight : 0,
        leftColHeight: leftCol ? leftCol.offsetHeight : 0,
        diff: s03.scrollHeight - s03.clientHeight
      };
    })()
  `);
  console.log('s03 at 1920x1080:', s03Metrics);

  ws.close();
  chrome.kill();
}

measureS03();

