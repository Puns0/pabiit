const { spawn } = require('child_process');
const http = require('http');

async function testPerformance() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9326',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1200));
    const targets = await new Promise((res, rej) => {
      http.get('http://127.0.0.1:9326/json', r => {
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

    console.log('=== VERIFYING SPEC PERFORMANCE REQUIREMENTS ===');

    // 1. Slide 2: n=24
    console.log('1. Slide 2: n=24 performance check...');
    const s02Perf = await evaluate(`
      (() => {
        const s02 = document.getElementById('s02');
        NG.slides.s02.init(s02);
        const slider = document.getElementById('s02-slider');
        const t0 = performance.now();
        slider.value = 24;
        slider.dispatchEvent(new Event('input'));
        const t1 = performance.now();
        return {
          n: slider.value,
          updateDurationMs: parseFloat((t1 - t0).toFixed(2)),
          meshEdgesCount: document.getElementById('s02-stat-mesh-count')?.textContent
        };
      })()
    `);
    console.log('Slide 2 result:', s02Perf);

    // 2. Slide 8b: 30 buildings
    console.log('2. Slide 8b: Campus Network Designer with 30 buildings...');
    const s08bPerf = await evaluate(`
      (() => {
        const s08b = document.getElementById('s08b');
        NG.slides.s08b.init(s08b);
        const buildings = NG.slides.s08b.getBuildings();
        buildings.length = 0;
        for (let i = 0; i < 30; i++) {
          buildings.push({
            id: 'b' + (i + 1),
            name: 'Building ' + (i + 1),
            x: 60 + (i % 6) * 160 + (Math.random() * 10),
            y: 60 + Math.floor(i / 6) * 90 + (Math.random() * 10)
          });
        }
        const t0 = performance.now();
        NG.slides.s08b.rebuild();
        const t1 = performance.now();
        const graph = NG.slides.s08b.getGraph();
        return {
          buildingsCount: buildings.length,
          candidateEdgesCount: graph ? graph.m() : 0,
          rebuildGraphDurationMs: parseFloat((t1 - t0).toFixed(2))
        };
      })()
    `);
    console.log('Slide 8b 30 buildings result:', s08bPerf);

    // 3. Slide 10: V=30 dense graph race
    console.log('3. Slide 10: V=30 dense graph race...');
    const s10Perf = await evaluate(`
      (() => {
        const s10 = document.getElementById('s10');
        NG.slides.s10.init(s10);
        const sliderV = document.getElementById('s10-slider-v');
        sliderV.value = 30;
        sliderV.dispatchEvent(new Event('input'));
        const sliderDensity = document.getElementById('s10-slider-density');
        sliderDensity.value = 90;
        sliderDensity.dispatchEvent(new Event('input'));
        const t0 = performance.now();
        const btnStart = document.getElementById('s10-btn-start');
        btnStart.click();
        const t1 = performance.now();
        return {
          V: 30,
          densityPercent: 90,
          raceComputationMs: parseFloat((t1 - t0).toFixed(2)),
          kruskalExamined: document.getElementById('s10-k-examined')?.textContent,
          primExamined: document.getElementById('s10-p-examined')?.textContent
        };
      })()
    `);
    console.log('Slide 10 result:', s10Perf);

    // 4. Slide 13: storm simulation
    console.log('4. Slide 13: STP Broadcast storm simulation...');
    const s13Perf = await evaluate(`
      (() => {
        const s13 = document.getElementById('s13');
        NG.slides.s13.init(s13);
        const btnSend = document.getElementById('s13-btn-send-frame');
        const t0 = performance.now();
        btnSend.click();
        const t1 = performance.now();
        return {
          clickResponseMs: parseFloat((t1 - t0).toFixed(2)),
          activeTimersCount: NG.slides.s13._activeTimers?.length
        };
      })()
    `);
    console.log('Slide 13 result:', s13Perf);

    // 5. Check pause() on inactive slides
    console.log('5. Slide lifecycle pause() verification...');
    const pauseResults = await evaluate(`
      (() => {
        NG.slides.s13.pause();
        const s13TimersLeft = NG.slides.s13._activeTimers.length;

        NG.slides.s14.pause();
        let s14Running = 0;
        for (let k in NG.slides.s14._activeAnims) {
          if (NG.slides.s14._activeAnims[k].running) s14Running++;
        }

        NG.slides.s15.pause();
        const s15Running = NG.slides.s15._running;

        NG.slides.s08b.pause();
        const s08bPlaying = NG.slides.s08b.getStepper() ? (NG.slides.s08b.getStepper()._timer !== null) : false;

        return {
          s13ActiveTimersAfterPause: s13TimersLeft,
          s14ActiveAnimsAfterPause: s14Running,
          s15CanvasRunningAfterPause: s15Running,
          s08bStepperPlayingAfterPause: s08bPlaying
        };
      })()
    `);
    console.log('Lifecycle pause results:', pauseResults);

    ws.close();
    chrome.kill();
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

testPerformance();
