const { spawn } = require('child_process');
const http = require('http');

async function test() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9346',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise(res => http.get('http://127.0.0.1:9346/json', r => {
    let s = ''; r.on('data', c => s += c); r.on('end', () => res(JSON.parse(s)));
  }));
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (m, p={}) => new Promise(res => {
    const cur = id++;
    const onm = e => { const msg = JSON.parse(e.data); if (msg.id === cur) { ws.removeEventListener('message', onm); res(msg); } };
    ws.addEventListener('message', onm);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });
  await send('Runtime.enable');
  const r = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const s = document.getElementById('s03');
        NG.slides.s03.init(s);
        const svg = document.getElementById('s03-real-svg');
        const devItems = Array.from(svg.querySelectorAll('.real-device-item'));
        const cables = Array.from(svg.querySelectorAll('.real-cable-item'));
        const collisions = [];
        devItems.forEach(d => {
          const nid = d.getAttribute('data-node');
          const pill = d.querySelector('.device-label-pill rect').getBoundingClientRect();
          cables.forEach(c => {
            const eid = c.getAttribute('data-edge');
            const line = c.querySelector('line').getBoundingClientRect();
            const rect = c.querySelector('rect').getBoundingClientRect();
            if (!(pill.right < line.left || pill.left > line.right || pill.bottom < line.top || pill.top > line.bottom)) {
              collisions.push({ nid, eid, target: 'line', pill, line });
            }
            if (!(pill.right < rect.left || pill.left > rect.right || pill.bottom < rect.top || pill.top > rect.bottom)) {
              collisions.push({ nid, eid, target: 'weightPill', pill, rect });
            }
          });
        });
        return collisions;
      })()
    `,
    returnByValue: true
  });
  console.log('Collisions details:', JSON.stringify(r.result.result.value, null, 2));
  ws.close();
  chrome.kill();
}
test();

