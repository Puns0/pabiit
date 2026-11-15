const { spawn } = require('child_process');
const http = require('http');

async function run() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9266',
    '--window-size=1366,768',
    'file:///C:/Projects/mathpre/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1200));
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

    const consoleErrors = [];
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.method === 'Runtime.consoleAPICalled') {
        const text = m.params.args.map(a => a.value || a.description).join(' ');
        if (m.params.type === 'error') {
          consoleErrors.push(text);
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

    console.log('=== VERIFYING SLIDE 14 ===');
    await evaluate(`
      const s14 = document.getElementById('s14');
      s14.scrollIntoView();
      NG.slides.s14.init(s14);
    `);
    await new Promise(r => setTimeout(r, 400));

    // Check overflow on s14
    const s14Overflow = await evaluate(`
      (() => {
        const el = document.getElementById('s14');
        return {
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          diff: el.scrollHeight - el.clientHeight,
          overflowY: el.scrollHeight > el.clientHeight
        };
      })()
    `);
    console.log('1. Slide 14 overflow (1366x768):', s14Overflow);

    // Check card count and titles/sentences
    const s14Cards = await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('#s14 .s14-card'));
        return cards.map(c => ({
          type: c.getAttribute('data-card'),
          tabIndex: c.tabIndex,
          title: c.querySelector('.s14-card-title')?.textContent.trim(),
          desc: c.querySelector('.s14-card-desc')?.textContent.trim(),
          hasSvg: Boolean(c.querySelector('.s14-mini-svg'))
        }));
      })()
    `);
    console.log('2. Slide 14 cards count:', s14Cards.length);
    console.log('Cards details:', s14Cards);

    // Test card hover & focus animation triggers
    const s14AnimCheck = await evaluate(`
      (() => {
        const campusCard = document.querySelector('#s14 .s14-card[data-card="campus"]');
        const powerCard = document.querySelector('#s14 .s14-card[data-card="power"]');
        
        campusCard.dispatchEvent(new MouseEvent('mouseenter'));
        const campusRunning = Boolean(NG.slides.s14._activeAnims['campus']?.running);
        
        powerCard.dispatchEvent(new FocusEvent('focus'));
        const powerRunning = Boolean(NG.slides.s14._activeAnims['power']?.running);
        
        campusCard.dispatchEvent(new MouseEvent('mouseleave'));
        const campusStopped = !NG.slides.s14._activeAnims['campus'];
        
        powerCard.dispatchEvent(new FocusEvent('blur'));
        const powerStopped = !NG.slides.s14._activeAnims['power'];
        
        return {
          campusStarted: campusRunning,
          campusStopped: campusStopped,
          powerStarted: powerRunning,
          powerStopped: powerStopped
        };
      })()
    `);
    console.log('3. Slide 14 hover & focus animation check:', s14AnimCheck);

    console.log('\n=== VERIFYING SLIDE 15 ===');
    await evaluate(`
      const s15 = document.getElementById('s15');
      s15.scrollIntoView();
      NG.slides.s15.init(s15);
    `);
    await new Promise(r => setTimeout(r, 400));

    // Check overflow on s15
    const s15Overflow = await evaluate(`
      (() => {
        const el = document.getElementById('s15');
        return {
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          diff: el.scrollHeight - el.clientHeight,
          overflowY: el.scrollHeight > el.clientHeight
        };
      })()
    `);
    console.log('4. Slide 15 overflow (1366x768):', s15Overflow);

    // Check Takeaways list
    const takeaways = await evaluate(`
      (() => {
        const items = Array.from(document.querySelectorAll('#s15 .s15-takeaways-list li'));
        return items.map(li => li.textContent.trim());
      })()
    `);
    console.log('5. Slide 15 Takeaways count:', takeaways.length);
    console.log('Takeaways:', takeaways);

    // Check Formula strip
    const formulas = await evaluate(`
      (() => {
        const pills = Array.from(document.querySelectorAll('#s15 .s15-formula-pill'));
        return pills.map(p => p.textContent.trim());
      })()
    `);
    console.log('6. Slide 15 Formula strip:', formulas);

    // Check References list
    const references = await evaluate(`
      (() => {
        const refs = Array.from(document.querySelectorAll('#s15 .s15-ref-list li'));
        return refs.map(r => r.textContent.trim());
      })()
    `);
    console.log('7. Slide 15 References:', references);

    // Check Config bindings
    const configCheck = await evaluate(`
      (() => ({
        names: document.getElementById('s15-hero-names')?.textContent.trim(),
        college: document.getElementById('s15-hero-college')?.textContent.trim()
      }))()
    `);
    console.log('8. Slide 15 Config readings:', configCheck);

    // Check Drift Canvas running
    const canvasCheck = await evaluate(`
      (() => ({
        running: NG.slides.s15._running,
        nodeCount: NG.slides.s15._nodes?.length,
        width: NG.slides.s15._width,
        height: NG.slides.s15._height
      }))()
    `);
    console.log('9. Slide 15 Drifting canvas:', canvasCheck);

    // Check button smooth scroll
    const buttonCheck = await evaluate(`
      (() => {
        const btn = document.getElementById('s15-btn-campus');
        return Boolean(btn);
      })()
    `);
    console.log('10. Slide 15 Campus button exists:', buttonCheck);

    console.log('\n=== CONSOLE ERRORS & CRITICAL CHECKS ===');
    console.log('Console errors:', consoleErrors);

    ws.close();
    chrome.kill();
  } catch (err) {
    console.error('Fatal test error:', err);
    chrome.kill();
    process.exit(1);
  }
}

run();

