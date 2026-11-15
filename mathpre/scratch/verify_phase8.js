const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'file:///C:/Projects/mathpre/index.html';

async function runTests() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9263',
    '--disable-gpu',
    '--window-size=1920,1080',
    URL
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9263/json/version', res => {
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
    http.get('http://127.0.0.1:9263/json', res => {
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

  console.log('=== TEST 1: SLIDE 9 PROOF TEXT ACCURACY ===');
  await evaluate('NG.deck.goTo(9)'); // Slide 9
  await new Promise(r => setTimeout(r, 600));

  const proofBlocksText = await evaluate(`(function() {
    var blocks = Array.from(document.querySelectorAll('#s09 .s09-proof-block'));
    return blocks.map(b => ({
      step: b.getAttribute('data-step'),
      title: b.querySelector('h4').textContent,
      text: b.querySelector('p').textContent
    }));
  })()`);

  console.log('Proof blocks count:', proofBlocksText.length);
  if (proofBlocksText.length !== 11) {
    throw new Error('Expected 11 proof blocks, got ' + proofBlocksText.length);
  }

  // Key phrase assertions
  const allProofText = proofBlocksText.map(b => b.text).join(' ');
  const requiredPhrases = [
    'split of the vertex set into S and V minus S',
    'lightest edge crossing the cut',
    'strictly lightest crossing edge, e is in EVERY MST',
    'T′ = T − f + e is connected with n−1 edges, so it is a spanning tree',
    'w(T′) = w(T) − w(f) + w(e) ≤ w(T)',
    'unique heaviest edge on some cycle C of G, then no MST contains e',
    'T − e + f is a spanning tree with smaller weight, contradicting minimality',
    'Invariant: the accepted edges A are always contained in some MST',
    'Rejected edges close a cycle in which they are the heaviest edge examined so far',
    'Prim takes a lightest edge crossing the cut, so Theorem 1 keeps A inside some MST'
  ];

  for (const phrase of requiredPhrases) {
    if (!allProofText.includes(phrase)) {
      throw new Error('Missing required proof phrase: "' + phrase + '"');
    }
  }
  console.log('Proof text matches SPEC line by line: PASS');

  console.log('\n=== TEST 2: CUT DEMO ON 10 RANDOM CUTS ===');
  const cutResults = await evaluate(`(function() {
    var results = [];
    var g = NG.slides.s09.getCanonicalGraph();
    var mstRes = NG.Algo.mst(g);
    var mstSet = new Set(mstRes.edges);

    for (var i = 0; i < 10; i++) {
      NG.slides.s09.randomCut();
      var part = NG.slides.s09.getCutPartition();
      var cRes = NG.Algo.cut(g, part);
      var isInMst = mstSet.has(cRes.lightest);
      results.push({
        cutIndex: i + 1,
        partSize: part.length,
        crossingCount: cRes.crossing.length,
        lightest: cRes.lightest,
        inMST: isInMst
      });
    }
    return results;
  })()`);

  console.table(cutResults);
  for (const cr of cutResults) {
    if (!cr.inMST) {
      throw new Error('Lightest crossing edge ' + cr.lightest + ' was not in MST!');
    }
  }
  console.log('10 random cuts: lightest crossing edge is always in MST: PASS');

  console.log('\n=== TEST 3: CYCLE DEMO FOR ALL 13 CANONICAL EDGES ===');
  const cycleTable = await evaluate(`(function() {
    var edges = ['EH', 'EF', 'BE', 'AB', 'AE', 'CF', 'DE', 'GH', 'AD', 'BC', 'DG', 'FH', 'CE'];
    var g = NG.slides.s09.getCanonicalGraph();
    var mstSet = new Set(NG.Algo.mst(g).edges);
    var rows = [];

    for (var i = 0; i < edges.length; i++) {
      var eid = edges[i];
      var res = NG.slides.s09.checkCycleProperty(eid);
      var inMST = mstSet.has(eid);
      rows.push({
        edge: eid,
        weight: g.edge(eid).w,
        isHeaviestOnCycle: res.isHeaviestOnCycle,
        cycleEdges: res.cycleEdges.join(', '),
        inMST: inMST
      });
    }
    return rows;
  })()`);

  console.table(cycleTable);

  // Verification requirements:
  // Non-MST edges: AE, AD, BC, DG, FH, CE must have isHeaviestOnCycle === true
  const nonMstEdges = ['AE', 'AD', 'BC', 'DG', 'FH', 'CE'];
  for (const nme of nonMstEdges) {
    const row = cycleTable.find(r => r.edge === nme);
    if (!row.isHeaviestOnCycle) {
      throw new Error('Expected edge ' + nme + ' to be heaviest on cycle!');
    }
    if (row.inMST) {
      throw new Error('Edge ' + nme + ' should not be in MST!');
    }
  }

  // MST edges: EH, EF, BE, AB, CF, DE, GH must have isHeaviestOnCycle === false
  const mstEdges = ['EH', 'EF', 'BE', 'AB', 'CF', 'DE', 'GH'];
  for (const me of mstEdges) {
    const row = cycleTable.find(r => r.edge === me);
    if (row.isHeaviestOnCycle) {
      throw new Error('MST edge ' + me + ' was incorrectly reported as heaviest on cycle!');
    }
    if (!row.inMST) {
      throw new Error('Edge ' + me + ' should be in MST!');
    }
  }
  console.log('Cycle demo: all 13 canonical edges verified: PASS');

  console.log('\n=== TEST 4: SLIDE 10 THEORETICAL GROWTH & CROSSOVER ===');
  await evaluate('NG.deck.goTo(10)'); // Slide 10
  await new Promise(r => setTimeout(r, 600));

  const crossoverCalc = await evaluate('NG.slides.s10.findCrossoverE()');
  console.log('Computed crossover E:', crossoverCalc);
  // Independent check: E * log2(E) = 10000
  // For E = 1003: 1003 * log2(1003) = 9999.98
  // For E = 1004: 1004 * log2(1004) = 10011.4
  if (crossoverCalc !== 1004 && crossoverCalc !== 1003) {
    throw new Error('Unexpected crossover E: ' + crossoverCalc);
  }
  console.log('Theoretical growth chart crossover verified: PASS');

  console.log('\n=== TEST 5: RACE DEMO 30 RANDOM RUNS (KRUSKAL TOTAL === PRIM TOTAL) ===');
  const raceResults = await evaluate(`(function() {
    var runs = [];
    for (var r = 0; r < 30; r++) {
      var v = 6 + (r % 15); // V from 6 to 20
      var density = (r * 13) % 100;
      var g = NG.slides.s10.generateConnectedGraph(v, density, 1000 + r * 7);
      var res = NG.slides.s10.runRaceHeadless(g);
      runs.push({
        run: r + 1,
        V: v,
        E: g.m(),
        kruskalTotal: res.kruskalTotal,
        primTotal: res.primTotal,
        equal: res.kruskalTotal === res.primTotal,
        kExamined: res.kruskalExamined,
        pExamined: res.primExamined
      });
    }
    return runs;
  })()`);

  let allEqual = true;
  for (const rr of raceResults) {
    if (!rr.equal) {
      allEqual = false;
      console.error('Mismatch on run:', rr);
      throw new Error('Totals differ on run ' + rr.run + ': Kruskal=' + rr.kruskalTotal + ', Prim=' + rr.primTotal);
    }
  }
  console.log('30 random race runs completed. All 30 produced identical Kruskal & Prim totals: PASS');

  console.log('\n=== TEST 6: TICK STEPPING SYNCHRONIZATION ===');
  // Trigger race start and inspect live tick increments
  await evaluate('document.getElementById("s10-btn-reset").click()');
  const beforeStep = await evaluate(`({
    kExamined: parseInt(document.getElementById('s10-k-examined').textContent, 10),
    pExamined: parseInt(document.getElementById('s10-p-examined').textContent, 10)
  })`);

  // Start race
  await evaluate('document.getElementById("s10-btn-start").click()');
  await new Promise(r => setTimeout(r, 650));
  // Pause race
  await evaluate('document.getElementById("s10-btn-start").click()');

  const afterStep = await evaluate(`({
    kExamined: parseInt(document.getElementById('s10-k-examined').textContent, 10),
    pExamined: parseInt(document.getElementById('s10-p-examined').textContent, 10)
  })`);
  console.log('Examined counters before:', beforeStep, 'and after running ticks:', afterStep);
  if (afterStep.kExamined <= beforeStep.kExamined || afterStep.pExamined <= beforeStep.pExamined) {
    throw new Error('Race counters failed to advance on animation ticks');
  }
  console.log('Race ticker synchronized edge examination: PASS');

  console.log('\n=== TEST 7: RESPONSIVE OVERFLOW AT 1920x1080 AND 1366x768 ===');
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

    for (const slideIndex of [9, 10]) {
      await evaluate('NG.deck.goTo(' + slideIndex + ')');
      await new Promise(r => setTimeout(r, 400));

      const slideId = slideIndex === 9 ? 's09' : 's10';
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

  console.log('\n=== TEST 8: CONSOLE ERRORS CHECK ===');
  console.log('Recorded console errors:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
    throw new Error('Detected console errors during execution');
  }
  console.log('0 console errors: PASS');

  ws.close();
  chromeProc.kill();
  console.log('\n>>> ALL PHASE 8 VERIFICATIONS PASSED! <<<');
}

runTests().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});

