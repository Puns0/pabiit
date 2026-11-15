const { spawn } = require('child_process');
const http = require('http');

async function test() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9266',
    '--window-size=1366,768',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9266/json', r => {
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
  await send('Runtime.evaluate', {
    expression: "NG.slides.s13.init(document.getElementById('s13'))"
  });
  await new Promise(r => setTimeout(r, 400));
  const res = await send('Runtime.evaluate', {
    expression: "(() => { const s13 = document.getElementById('s13'); return { clientHeight: s13.clientHeight, scrollHeight: s13.scrollHeight, overflow: s13.scrollHeight > s13.clientHeight, diff: s13.scrollHeight - s13.clientHeight }; })()",
    returnByValue: true
  });
  console.log('Overflow check:', res.result.result.value);
  ws.close();
  chrome.kill();
}
test();

