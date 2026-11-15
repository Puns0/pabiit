const { spawn } = require('child_process');
const http = require('http');

async function auditAllGraphBounds() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9334',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9334/json', r => {
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

  const slideCount = await evaluate(`document.querySelectorAll('#deck > .slide').length`);
  console.log(`Auditing graph bounds across ${slideCount} slides...`);

  for (let i = 0; i < slideCount; i++) {
    const slideId = await evaluate(`
      (() => {
        const deckEl = document.getElementById('deck');
        const s = document.querySelectorAll('#deck > .slide')[${i}];
        deckEl.scrollTop = s.offsetTop;
        s.classList.add('in-view');
        if (NG.slides && NG.slides[s.id] && NG.slides[s.id].init) {
          NG.slides[s.id].init(s);
        }
        return s.id;
      })()
    `);
    await new Promise(r => setTimeout(r, 300));

    const check = await evaluate(`
      (() => {
        const s = document.getElementById('${slideId}');
        // Find all SVGs and their container elements
        const svgs = Array.from(s.querySelectorAll('svg')).filter(svg => {
          // Ignore heading underline and icon svgs
          return !svg.classList.contains('heading-underline-svg') && svg.clientWidth > 50 && svg.clientHeight > 50;
        });

        const issues = [];
        svgs.forEach((svg, svgIdx) => {
          const svgRect = svg.getBoundingClientRect();
          const container = svg.parentElement;
          const contRect = container.getBoundingClientRect();

          // Check nodes inside this svg
          // Nodes can be .graph-node, circle, [data-id], .s13-node, etc.
          const nodeCircles = Array.from(svg.querySelectorAll('.graph-node circle, .s13-node circle, .real-device-item circle, [data-node] circle'));
          
          nodeCircles.forEach(circle => {
            const cr = circle.getBoundingClientRect();
            // Check if circle is clipped by container
            const diffBottom = cr.bottom - contRect.bottom;
            const diffTop = contRect.top - cr.top;
            const diffRight = cr.right - contRect.right;
            const diffLeft = contRect.left - cr.left;

            if (diffBottom > 1 || diffTop > 1 || diffRight > 1 || diffLeft > 1) {
              issues.push({
                svgIdx,
                circle: circle.getAttribute('data-id') || circle.parentElement.getAttribute('data-id') || circle.parentElement.getAttribute('data-node') || 'circle',
                diffBottom: diffBottom > 1 ? diffBottom : 0,
                diffTop: diffTop > 1 ? diffTop : 0,
                diffRight: diffRight > 1 ? diffRight : 0,
                diffLeft: diffLeft > 1 ? diffLeft : 0
              });
            }
          });
        });

        return {
          slideId: '${slideId}',
          svgCount: svgs.length,
          issues: issues
        };
      })()
    `);

    if (check.issues.length > 0) {
      console.log(`[FAIL: Node clipped in ${check.slideId}]`, check.issues);
    } else {
      console.log(`[PASS: ${check.slideId}] ${check.svgCount} SVGs in bounds.`);
    }
  }

  ws.close();
  chrome.kill();
}

auditAllGraphBounds();
