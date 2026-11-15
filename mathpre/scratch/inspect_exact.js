const { spawn } = require('child_process');
const http = require('http');

async function inspectExact(slideId) {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9318',
    '--window-size=1366,768',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1000));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9318/json', r => {
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

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const s = document.getElementById('${slideId}');
      s.classList.add('in-view');
      const cs = getComputedStyle(s);
      return {
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        rowGap: cs.rowGap,
        children: Array.from(s.children).map(c => ({
          tag: c.tagName,
          class: c.className,
          offsetHeight: c.offsetHeight,
          scrollHeight: c.scrollHeight,
          offsetTop: c.offsetTop,
          csMarginBottom: getComputedStyle(c).marginBottom,
          subChildren: Array.from(c.children).map(sc => ({
            tag: sc.tagName,
            class: sc.className,
            offsetHeight: sc.offsetHeight,
            scrollHeight: sc.scrollHeight,
            offsetTop: sc.offsetTop
          }))
        }))
      };
    })()`,
    returnByValue: true
  });
  console.log(`[Exact breakdown of ${slideId}]:`, JSON.stringify(res.result.result.value, null, 2));
  ws.close();
  chrome.kill();
}

inspectExact('s03');
