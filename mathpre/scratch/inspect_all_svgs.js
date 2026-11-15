const { spawn } = require('child_process');
const http = require('http');

async function inspectAllSvgs() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9336',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);
  await new Promise(r => setTimeout(r, 1200));
  const targets = await new Promise((res, rej) => {
    http.get('http://127.0.0.1:9336/json', r => {
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

  // Set reduced motion so goTo is instant
  await evaluate(`
    document.documentElement.classList.add('reduced-motion');
    NG.deck.reducedMotion = true;
  `);

  const slideCount = await evaluate(`document.querySelectorAll('#deck > .slide').length`);
  console.log(`Total slides: ${slideCount}`);

  for (let i = 0; i < slideCount; i++) {
    await evaluate(`NG.deck.goTo(${i});`);
    await new Promise(r => setTimeout(r, 200));

    const info = await evaluate(`
      (() => {
        const s = document.querySelectorAll('#deck > .slide')[${i}];
        const svgs = Array.from(s.querySelectorAll('svg')).map((svg, idx) => {
          const rect = svg.getBoundingClientRect();
          const parent = svg.parentElement;
          const pRect = parent.getBoundingClientRect();
          const nodes = Array.from(svg.querySelectorAll('.graph-node circle, .s13-node circle, .real-device-item circle, [data-node] circle')).map(c => {
            const cr = c.getBoundingClientRect();
            return {
              id: c.getAttribute('data-id') || (c.parentElement ? c.parentElement.getAttribute('data-id') || c.parentElement.getAttribute('data-node') : '') || 'circle',
              cy: c.getAttribute('cy'),
              cx: c.getAttribute('cx'),
              top: Math.round(cr.top),
              bottom: Math.round(cr.bottom),
              left: Math.round(cr.left),
              right: Math.round(cr.right)
            };
          });

          return {
            idx,
            class: svg.getAttribute('class') || '',
            parentTag: parent.tagName,
            parentId: parent.id,
            parentClass: parent.className,
            svgRect: { top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width), height: Math.round(rect.height) },
            pRect: { top: Math.round(pRect.top), bottom: Math.round(pRect.bottom), width: Math.round(pRect.width), height: Math.round(pRect.height) },
            nodeCount: nodes.length,
            nodes: nodes
          };
        });

        return {
          id: s.id,
          svgs
        };
      })()
    `);

    console.log(`Slide ${i} (${info.id}): ${info.svgs.length} SVGs`);
    info.svgs.forEach(svg => {
      if (svg.nodeCount > 0) {
        console.log(`  SVG #${svg.idx} (${svg.class}) inside ${svg.parentTag}#${svg.parentId}.${svg.parentClass}`);
        console.log(`    Parent Rect: top=${svg.pRect.top}, bottom=${svg.pRect.bottom}, w=${svg.pRect.width}, h=${svg.pRect.height}`);
        console.log(`    SVG Rect: top=${svg.svgRect.top}, bottom=${svg.svgRect.bottom}, w=${svg.svgRect.width}, h=${svg.svgRect.height}`);
        // Check if any node is outside Parent Rect
        const clipped = svg.nodes.filter(n => n.bottom > svg.pRect.bottom || n.top < svg.pRect.top || n.left < svg.pRect.left || n.right > svg.pRect.right);
        if (clipped.length > 0) {
          console.log(`    --> CLIPPED NODES (${clipped.length}):`, clipped);
        } else {
          console.log(`    --> All ${svg.nodeCount} nodes cleanly inside parent bounds!`);
        }
      }
    });
  }

  ws.close();
  chrome.kill();
}

inspectAllSvgs();

