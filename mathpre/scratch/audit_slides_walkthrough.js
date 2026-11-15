const { spawn } = require('child_process');
const http = require('http');

async function auditDeck() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9268',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1200));
    const targets = await new Promise((res, rej) => {
      http.get('http://127.0.0.1:9268/json', r => {
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
    const unhandledRejections = [];
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
      if (res.result && res.result.exceptionDetails) {
        console.error('Eval error:', res.result.exceptionDetails);
      }
      return res.result && res.result.result ? res.result.result.value : undefined;
    }

    console.log('=== CHECKING PRESENTER NOTES FOR ALL 16 SECTIONS ===');
    const notesAudit = await evaluate(`
      (() => {
        const slides = Array.from(document.querySelectorAll('#deck > .slide'));
        return slides.map(s => {
          const notes = s.getAttribute('data-notes') || '';
          const title = s.getAttribute('data-title') || '';
          const hasPresenterName = /presenter|presented by|member 1|member 2|member 3|speaker/i.test(notes);
          return {
            id: s.id,
            title: title,
            notesLength: notes.length,
            hasPresenterName: hasPresenterName,
            notesSample: notes.substring(0, 60) + '...'
          };
        });
      })()
    `);
    console.log('Notes count:', notesAudit.length);
    notesAudit.forEach(n => {
      console.log(`[Slide ${n.id}] Title: "${n.title}", Notes Len: ${n.notesLength}, Has Presenter Assignment: ${n.hasPresenterName}`);
    });

    console.log('\n=== TESTING NOTES DRAWER (N KEY) ===');
    const drawerTest = await evaluate(`
      (() => {
        const drawer = document.querySelector('.notes-drawer');
        const content = document.querySelector('.notes-content');
        // Press 'n'
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
        const isOpen = drawer.classList.contains('open');
        const textAfterN = content.textContent.trim();
        // Press 'n' again to close
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
        const isClosed = !drawer.classList.contains('open');
        return { isOpen, textAfterN: textAfterN.substring(0, 60) + '...', isClosed };
      })()
    `);
    console.log('Notes drawer test:', drawerTest);

    console.log('\n=== STEPPING THROUGH ALL 16 SLIDES WITH RESET BUTTON AUDIT ===');
    const slideResults = [];
    for (let i = 0; i < notesAudit.length; i++) {
      const slideId = notesAudit[i].id;
      // Navigate to slide
      await evaluate(`NG.deck.goTo(${i})`);
      await new Promise(r => setTimeout(r, 350));

      // Test reset buttons on this slide
      const resetTest = await evaluate(`
        (() => {
          const slide = document.getElementById('${slideId}');
          const resetBtns = Array.from(slide.querySelectorAll('button')).filter(b => /reset/i.test(b.textContent || b.id || b.className));
          let clicked = 0;
          resetBtns.forEach(b => {
            try {
              b.click();
              clicked++;
            } catch(e) {
              console.error('Error clicking reset in ${slideId}:', e);
            }
          });
          return {
            slideId: '${slideId}',
            resetBtnsFound: resetBtns.length,
            clicked: clicked
          };
        })()
      `);
      slideResults.push(resetTest);
    }
    console.log('Slide walkthrough & reset button test completed:');
    slideResults.forEach(r => console.log(`  Slide ${r.slideId}: ${r.resetBtnsFound} reset button(s) clicked successfully`));

    console.log('\n=== CONSOLE ERRORS & PROMISE REJECTIONS ===');
    console.log('Errors:', consoleErrors);

    ws.close();
    chrome.kill();
  } catch (err) {
    console.error('Audit failure:', err);
    chrome.kill();
    process.exit(1);
  }
}

auditDeck();
