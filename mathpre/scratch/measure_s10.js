const { spawn } = require('child_process');
const http = require('http');

async function test() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9265',
    '--window-size=1366,768',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9265/json', r => {
      let s = ''; r.on('data', c => s += c); r.on('end', () => res(JSON.parse(s)));
    }).on('error', rej);
  });
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  function send(m, p = {}) {
    return new Promise(res => {
      const cur = id++;
      const onm = e => {
        const msg = JSON.parse(e.data);
        if (msg.id === cur) { ws.removeEventListener('message', onm); res(msg); }
      };
      ws.addEventListener('message', onm);
      ws.send(JSON.stringify({ id: cur, method: m, params: p }));
    });
  }
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 600));
  await send('Runtime.evaluate', { expression: 'NG.deck.goTo(10)' });
  await new Promise(r => setTimeout(r, 600));

  const res = await send('Runtime.evaluate', {
    expression: `(function() {
      var s = document.getElementById('s10');
      var leftCard = s.querySelector('.s10-table-card');
      var rightCard = s.querySelector('.s10-race-card');
      var children = Array.from(s.children).map(c => ({ tag: c.tagName, cls: c.className, h: c.offsetHeight, mt: window.getComputedStyle(c).marginTop, mb: window.getComputedStyle(c).marginBottom }));
      var leftChildren = Array.from(leftCard.children).map(c => ({ tag: c.tagName, cls: c.className, h: c.offsetHeight }));
      var rightChildren = Array.from(rightCard.children).map(c => ({ tag: c.tagName, cls: c.className, h: c.offsetHeight }));
      return {
        sClientH: s.clientHeight,
        sScrollH: s.scrollHeight,
        sPadding: window.getComputedStyle(s).padding,
        children: children,
        leftCardH: leftCard.offsetHeight,
        rightCardH: rightCard.offsetHeight,
        leftChildren: leftChildren,
        rightChildren: rightChildren
      };
    })()`,
    returnByValue: true
  });
  console.log('Measurements:', JSON.stringify(res.result.result.value, null, 2));
  ws.close();
  chrome.kill();
}
test();

