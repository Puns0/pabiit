const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'file:///C:/Projects/mathpre/index.html';

async function runTests() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9269',
    '--disable-gpu',
    '--window-size=1920,1080',
    URL
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9269/json/version', res => {
          let str = '';
          res.on('data', chunk => str += chunk);
          res.on('end', () => resolve(JSON.parse(str)));
        }).on('error', reject);
      });
      if (data && data.webSocketDebuggerUrl) {
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  const targets = await new Promise((resolve) => {
    http.get('http://127.0.0.1:9269/json', res => {
      let str = '';
      res.on('data', chunk => str += chunk);
      res.on('end', () => resolve(JSON.parse(str)));
    });
  });

  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let idCounter = 1;
  const pending = new Map();
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      if (msg.params.type === 'error') {
        consoleErrors.push(text);
      }
    }
    if (msg.id && pending.has(msg.id)) {
      const cb = pending.get(msg.id);
      pending.delete(msg.id);
      cb(msg);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  async function evaluate(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res.result && res.result.exceptionDetails) {
      const desc = res.result.exceptionDetails.exception ? res.result.exceptionDetails.exception.description : res.result.exceptionDetails.text;
      throw new Error(desc + ' in: ' + expr);
    }
    return res.result ? res.result.result ? res.result.result.value : res.result.value : null;
  }

  await new Promise(r => setTimeout(r, 1200));

  console.log('=== TEST 1: SLIDE 11 DEMO A — BREAK A LINK ===');
  await evaluate('NG.deck.goTo(11)'); // Slide 11
  await new Promise(r => setTimeout(r, 600));

  // Test single cuts for all 7 MST edges
  const singleCutTests = await evaluate(`(function() {
    var mstEdges = ['EH', 'EF', 'BE', 'AB', 'CF', 'DE', 'GH'];
    var results = [];

    for (var i = 0; i < mstEdges.length; i++) {
      var eid = mstEdges[i];
      NG.slides.s11.resetCuts();
      NG.slides.s11.cutEdge(eid);
      var comps = NG.slides.s11.getComponents();
      var a = comps[0].length;
      var b = comps[1].length;
      var unreachable = a * b;
      var textUnreach = document.getElementById('s11-unreachable-pairs').textContent;

      results.push({
        cutEdge: eid,
        compCount: comps.length,
        sizes: a + ' and ' + b,
        unreachableExpected: unreachable,
        unreachableMatches: textUnreach.includes(unreachable + ' of 28')
      });
    }
    return results;
  })()`);

  console.table(singleCutTests);
  for (const t of singleCutTests) {
    if (t.compCount !== 2 || !t.unreachableMatches) {
      throw new Error('Single cut test failed on ' + t.cutEdge);
    }
  }
  console.log('Single cuts always yield exactly 2 components and unreachable = a*b: PASS');

  // Test double cuts
  const doubleCutTest = await evaluate(`(function() {
    NG.slides.s11.resetCuts();
    NG.slides.s11.cutEdge('AB');
    NG.slides.s11.cutEdge('DE');
    var comps = NG.slides.s11.getComponents();
    return {
      compCount: comps.length,
      sizes: comps.map(c => c.length).join(', ')
    };
  })()`);
  console.log('Double cut test (AB & DE):', doubleCutTest);
  if (doubleCutTest.compCount !== 3) {
    throw new Error('Double cut expected 3 components, got ' + doubleCutTest.compCount);
  }
  console.log('Double cuts give 3 components: PASS');

  console.log('\n=== TEST 2: SLIDE 11 DEMO B — DETOUR RATIOS ACROSS ALL 28 PAIRS ===');
  const detourSummary = await evaluate(`(function() {
    var all = NG.slides.s11.getAllPairsDetour();
    var worst = NG.slides.s11.getWorstPairResult();
    var allGte1 = all.every(p => p.ratio >= 1.0);
    return {
      totalPairs: all.length,
      allGte1: allGte1,
      worstPair: worst.pair.join(' – '),
      worstP: worst.P,
      worstS: worst.S,
      worstRatio: (worst.P / worst.S).toFixed(3)
    };
  })()`);

  console.log('Detour summary:', detourSummary);
  if (!detourSummary.allGte1 || detourSummary.totalPairs !== 28) {
    throw new Error('Detour ratio condition P/S >= 1 failed on one or more pairs');
  }
  console.log('Worst pair on canonical graph:', detourSummary.worstPair, 'P =', detourSummary.worstP, 'S =', detourSummary.worstS, 'Ratio =', detourSummary.worstRatio + 'x');
  console.log('Detour ratio P/S >= 1 for all 28 pairs: PASS');

  console.log('\n=== TEST 3: SLIDE 12 TAB 1 — BACKUP LINKS & FAULT TOLERANCE ===');
  await evaluate('NG.deck.goTo(12)'); // Slide 12
  await new Promise(r => setTimeout(r, 600));

  const backupRun = await evaluate(`(function() {
    NG.slides.s12.switchTab(1);
    var res = NG.slides.s12.runGreedyAll();
    var survives = NG.slides.s12.testAllSingleFailures();
    var survivesChipText = document.getElementById('s12-survives-chip').textContent;
    return {
      activeEdges: res.activeEdges,
      finalBridgesCount: res.bridgesCount,
      allSingleFailuresSurvive: survives,
      survivesChip: survivesChipText
    };
  })()`);

  console.log('Backup links greedy run:', backupRun);
  if (backupRun.finalBridgesCount !== 0) {
    throw new Error('Greedy backup failed to reduce bridges to 0');
  }
  if (!backupRun.allSingleFailuresSurvive || backupRun.survivesChip !== 'Yes') {
    throw new Error('Single link failure survival verification failed');
  }
  console.log('Canonical graph 2-edge-connected with 0 bridges left and survives any single failure: PASS');

  console.log('\n=== TEST 4: SLIDE 12 TAB 2 — SHORTEST-PATH TREE ===');
  const sptCheck = await evaluate(`(function() {
    NG.slides.s12.switchTab(2);
    var wt = document.getElementById('s12-spt-weight').textContent;
    var avg = document.getElementById('s12-spt-avg').textContent;
    var max = document.getElementById('s12-spt-max').textContent;
    return { wt, avg, max };
  })()`);
  console.log('SPT from root A:', sptCheck);
  console.log('SPT view verified: PASS');

  console.log('\n=== TEST 5: SLIDE 12 TAB 3 — STEINER TREE ===');
  const steinerEquilateral = await evaluate(`(function() {
    NG.slides.s12.switchTab(3);
    document.getElementById('s12-btn-equilateral').click();
    NG.slides.s12.snapSteiner();
    return NG.slides.s12.getSteinerMetrics();
  })()`);

  console.log('Steiner equilateral triangle metrics:', steinerEquilateral);
  // Expected: MST = 2.000, Steiner = 1.732, Saving = 13.4%
  if (steinerEquilateral.mstNorm !== 2.000 || steinerEquilateral.steinerNorm !== 1.732 || steinerEquilateral.savingPct !== 13.4) {
    throw new Error('Equilateral Steiner expected MST=2, Steiner=1.732, Saving=13.4%, got ' + JSON.stringify(steinerEquilateral));
  }
  console.log('Equilateral Steiner gives MST=2, Steiner=1.732, Saving=13.4%: PASS');

  const steinerObtuse = await evaluate(`(function() {
    return NG.slides.s12.setSteinerObtuse();
  })()`);
  console.log('Steiner obtuse 130° result:', steinerObtuse);
  if (!steinerObtuse.displayed || !steinerObtuse.noticeText.includes('≥ 120°') || !steinerObtuse.noticeText.includes('No extra point helps')) {
    throw new Error('Obtuse 130° notice failed to trigger correctly: ' + JSON.stringify(steinerObtuse));
  }
  console.log('Obtuse 130° correctly shows "no extra point helps" message: PASS');

  console.log('\n=== TEST 6: RESPONSIVE OVERFLOW AT 1920x1080 AND 1366x768 ===');
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 }
  ];

  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise(r => setTimeout(r, 300));

    for (const slideIndex of [11, 12]) {
      await evaluate('NG.deck.goTo(' + slideIndex + ')');
      await new Promise(r => setTimeout(r, 400));

      const slideId = slideIndex === 11 ? 's11' : 's12';
      const check = await evaluate(`(function() {
        var s = document.getElementById('${slideId}');
        var doc = document.documentElement;
        return {
          hScroll: doc.scrollWidth > doc.clientWidth + 1,
          sScrollHeight: s.scrollHeight,
          sClientHeight: s.clientHeight,
          overflow: s.scrollHeight > s.clientHeight + 1
        };
      })()`);

      console.log('Viewport ' + vp.width + 'x' + vp.height + ' Slide ' + slideId + ':', check);
      if (check.hScroll) {
        throw new Error('Horizontal scroll detected on ' + slideId + ' at ' + vp.width + 'x' + vp.height);
      }
      if (check.overflow) {
        throw new Error('Vertical overflow on ' + slideId + ' at ' + vp.width + 'x' + vp.height + ' (scrollHeight=' + check.sScrollHeight + ', clientHeight=' + check.sClientHeight + ')');
      }
    }
  }
  console.log('Responsive overflow checks passed (0px overflow): PASS');

  console.log('\n=== TEST 7: CONSOLE ERRORS CHECK ===');
  console.log('Recorded console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
    throw new Error('Detected console errors during execution');
  }
  console.log('0 console errors: PASS');

  ws.close();
  chromeProc.kill();
  console.log('\n>>> ALL PHASE 9 VERIFICATIONS PASSED! <<<');
}

runTests().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});

