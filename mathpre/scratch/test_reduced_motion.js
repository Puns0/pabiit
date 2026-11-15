const { spawn } = require('child_process');
const http = require('http');

async function testReducedMotion() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9327',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1200));
    const targets = await new Promise((res, rej) => {
      http.get('http://127.0.0.1:9327/json', r => {
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

    console.log('=== TESTING REDUCED MOTION TOGGLE (M KEY) ===');
    const rmTest = await evaluate(`
      (() => {
        const initial = document.documentElement.classList.contains('reduced-motion');
        // Press 'm'
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
        const afterM = document.documentElement.classList.contains('reduced-motion');
        // Press 'm' again
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
        const afterSecondM = document.documentElement.classList.contains('reduced-motion');
        
        // Turn ON for sim test
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
        
        // Test stepping on Slide 7
        const s07 = document.getElementById('s07');
        NG.slides.s07.init(s07);
        const btnStep = document.getElementById('s07-btn-step');
        btnStep.click();
        const step1Accepted = document.getElementById('s07-stat-accepted')?.textContent;
        btnStep.click();
        const step2Accepted = document.getElementById('s07-stat-accepted')?.textContent;

        return {
          initial,
          afterM,
          afterSecondM,
          simWorksUnderReducedMotion: {
            step1Accepted,
            step2Accepted
          }
        };
      })()
    `);
    console.log('Reduced motion test result:', rmTest);

    ws.close();
    chrome.kill();
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

testReducedMotion();

