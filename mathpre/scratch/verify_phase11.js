const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9265',
    '--window-size=1366,768',
    'file:///C:/Projects/mathpre/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1200));
    const targets = await new Promise((res, rej) => {
      http.get('http://127.0.0.1:9265/json', r => {
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

    const consoleErrors = [];
    const devAssertions = [];
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.method === 'Runtime.consoleAPICalled') {
        const text = m.params.args.map(a => a.value || a.description).join(' ');
        if (m.params.type === 'error') {
          consoleErrors.push(text);
        } else if (m.params.type === 'assert') {
          devAssertions.push(text);
        }
      }
      if (m.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(m.params.exceptionDetails.text + ' ' + (m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : ''));
      }
    });

    await send('Runtime.enable');
    await send('DOM.enable');

    async function evaluate(expr) {
      const res = await send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result.result.value;
    }

    console.log('--- Initializing Slide 13 ---');
    await evaluate(`
      const s13 = document.getElementById('s13');
      s13.scrollIntoView();
      NG.slides.s13.init(s13);
    `);
    await new Promise(r => setTimeout(r, 500));

    // Check overflow at 1366x768
    const overflowInfo = await evaluate(`
      (() => {
        const s13 = document.getElementById('s13');
        return {
          clientHeight: s13.clientHeight,
          scrollHeight: s13.scrollHeight,
          diff: s13.scrollHeight - s13.clientHeight,
          overflowY: s13.scrollHeight > s13.clientHeight
        };
      })()
    `);
    console.log('1. Overflow check at 1366x768:', overflowInfo);

    // Check DOM elements exist
    const domCheck = await evaluate(`
      (() => ({
        switchesCount: document.querySelectorAll('#s13 .s13-node').length,
        linksCount: document.querySelectorAll('#s13 .s13-edge').length,
        hostExists: Boolean(document.querySelector('#s13 .s13-host-node')),
        toolbarExists: Boolean(document.querySelector('#s13 .s13-toolbar')),
        bridgeTableRows: document.querySelectorAll('#s13 #s13-bridge-tbody tr').length
      }))()
    `);
    console.log('2. DOM elements check:', domCheck);

    // Test 3: Default run OFF + Send frame -> exponential growth and storm stamp
    console.log('3. Testing Broadcast Storm with STP OFF...');
    // Set speed to 2.5x to quickly run all 12 hops
    await evaluate(`
      const slider = document.getElementById('s13-speed');
      slider.value = '2.5';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      document.getElementById('s13-btn-send-frame').click();
    `);
    // 12 ticks * (550 / 2.5 = 220ms) = 2640ms
    await new Promise(r => setTimeout(r, 3800));
    const stormState = await evaluate(`
      (() => ({
        inFlight: document.getElementById('s13-cnt-flight').textContent,
        delivered: document.getElementById('s13-cnt-delivered').textContent,
        stampVisible: document.getElementById('s13-storm-stamp').style.display !== 'none',
        stampText: document.querySelector('#s13 .s13-stamp-text').textContent
      }))()
    `);
    console.log('   Storm result:', stormState);

    // Test 4: Toggle STP ON -> cleanly clears storm and elects S1
    console.log('4. Testing Toggle STP ON & Election...');
    await evaluate(`document.getElementById('s13-btn-stp-on').click();`);
    await new Promise(r => setTimeout(r, 2000));
    const stpState = await evaluate(`
      (() => {
        const s1G = document.querySelector('#s13 .s13-node[data-id="S1"]');
        return {
          rootCrownS1: s1G.querySelector('.s13-node-circle.root') !== null,
          activeEdges: document.querySelectorAll('#s13 .s13-edge.active').length,
          blockedEdges: document.querySelectorAll('#s13 .s13-edge.blocked').length,
          status: document.getElementById('s13-status-msg').textContent,
          stampHidden: document.getElementById('s13-storm-stamp').style.display === 'none'
        };
      })()
    `);
    console.log('   STP State:', stpState);

    // Test 5: Send frame with STP ON -> each switch lights up, exactly 1 copy
    console.log('5. Testing Send frame with STP ON...');
    await evaluate(`document.getElementById('s13-btn-send-frame').click();`);
    await new Promise(r => setTimeout(r, 2000));
    const singleFrameState = await evaluate(`
      (() => ({
        flight: document.getElementById('s13-cnt-flight').textContent,
        delivered: document.getElementById('s13-cnt-delivered').textContent,
        status: document.getElementById('s13-status-msg').textContent
      }))()
    `);
    console.log('   Single Frame Delivery:', singleFrameState);

    // Test 6: Cutting each active tree link in turn
    console.log('6. Testing cutting active links & reconvergence...');
    const activeTreeLinks = ['L12', 'L23', 'L25', 'L45', 'L61'];
    for (const lid of activeTreeLinks) {
      await evaluate(`document.getElementById('s13-btn-reset').click();`);
      await new Promise(r => setTimeout(r, 400));
      await evaluate(`document.getElementById('s13-btn-stp-on').click();`);
      await new Promise(r => setTimeout(r, 800));

      // Click link lid to cut
      await evaluate(`
        document.getElementById('s13-btn-cut-link').click();
        const edge = document.querySelector('#s13 [data-link="${lid}"].s13-edge');
        edge.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      `);
      await new Promise(r => setTimeout(r, 3400));

      const cutRes = await evaluate(`
        (() => ({
          status: document.getElementById('s13-status-msg').textContent,
          activeCount: document.querySelectorAll('#s13 .s13-edge.active').length
        }))()
      `);
      console.log('   Cut link ' + lid + ':', cutRes);
    }

    // Test 7: Changing S4 priority to 4096
    console.log('7. Testing Changing S4 priority to 4096...');
    await evaluate(`document.getElementById('s13-btn-reset').click();`);
    await new Promise(r => setTimeout(r, 400));
    await evaluate(`document.getElementById('s13-btn-stp-on').click();`);
    await new Promise(r => setTimeout(r, 800));

    // Open S4 popover and click make root
    await evaluate(`
      const s4Node = document.querySelector('#s13 .s13-node[data-id="S4"]');
      s4Node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.getElementById('s13-pri-make-root').click();
    `);
    await new Promise(r => setTimeout(r, 1800));

    const s4PriState = await evaluate(`
      (() => {
        const s4G = document.querySelector('#s13 .s13-node[data-id="S4"]');
        const s1G = document.querySelector('#s13 .s13-node[data-id="S1"]');
        return {
          status: document.getElementById('s13-status-msg').textContent,
          s4Crown: s4G.querySelector('.s13-node-circle.root') !== null,
          s1Crown: s1G.querySelector('.s13-node-circle.root') !== null,
          s4Priority: document.getElementById('s13-node-pri-S4').textContent
        };
      })()
    `);
    console.log('   S4 Priority State:', s4PriState);

    // Check console errors
    console.log('Console Errors:', consoleErrors);
    console.log('Failed Dev Assertions:', devAssertions);

    ws.close();
    chrome.kill();
    process.exit(consoleErrors.length > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test script error:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();
