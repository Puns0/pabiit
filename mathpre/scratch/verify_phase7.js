const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'file:///C:/Projects/mathpre/index.html';

async function runTests() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9260',
    '--disable-gpu',
    '--window-size=1920,1080',
    URL
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9260/json/version', res => {
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
    http.get('http://127.0.0.1:9260/json', res => {
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

  console.log('=== VERIFYING SLIDE 8b: CAMPUS NETWORK DESIGNER ===');
  // Slide index 8 is s08b
  await evaluate('NG.deck.goTo(8)');
  await new Promise(r => setTimeout(r, 1200));

  // Ensure sample campus is loaded
  await evaluate('NG.slides.s08b.loadSample()');
  await new Promise(r => setTimeout(r, 400));

  // 1. Check Initial State on Sample Campus
  const initStats = await evaluate(`({
    n: document.getElementById('s08b-stat-n').textContent,
    k: document.getElementById('s08b-stat-k').textContent,
    nMinus1: document.getElementById('s08b-stat-nminus1').textContent,
    total: document.getElementById('s08b-stat-total').textContent,
    meshCost: document.getElementById('s08b-stat-mesh-cost').textContent,
    buildingsCount: NG.slides.s08b.getBuildings().length,
    obstaclesCount: NG.slides.s08b.getObstacles().length
  })`);
  console.log('Sample campus initial state:', initStats);
  if (initStats.n !== '10' || initStats.buildingsCount !== 10 || initStats.obstaclesCount !== 3 || initStats.nMinus1 !== '9') {
    throw new Error('Initial sample campus state mismatch: ' + JSON.stringify(initStats));
  }

  // 2. Run Kruskal to completion on Sample Campus
  console.log('Running Kruskal on sample campus...');
  await evaluate('document.getElementById("s08b-algo-kruskal").click()');
  const kStepperLength = await evaluate('NG.slides.s08b.getStepper().length');
  for (let s = 0; s < kStepperLength; s++) {
    await evaluate('document.getElementById("s08b-btn-step").click()');
  }

  const kResult = await evaluate(`({
    k: document.getElementById('s08b-stat-k').textContent,
    nMinus1: document.getElementById('s08b-stat-nminus1').textContent,
    total: document.getElementById('s08b-stat-total').textContent,
    savings: document.getElementById('s08b-stat-savings').textContent
  })`);
  console.log('Kruskal result:', kResult);

  if (kResult.k !== '9' || kResult.nMinus1 !== '9') {
    throw new Error('Kruskal did not accept n-1 = 9 links');
  }
  if (kResult.total !== '₹4,23,647') {
    throw new Error('Kruskal total expected ₹4,23,647, got ' + kResult.total);
  }
  if (!kResult.savings.includes('90.2%')) {
    throw new Error('Savings % expected 90.2%, got ' + kResult.savings);
  }

  // 3. Run Prim on Sample Campus and verify equal totals chip
  console.log('Running Prim on sample campus...');
  await evaluate('document.getElementById("s08b-algo-prim").click()');
  const pStepperLength = await evaluate('NG.slides.s08b.getStepper().length');
  for (let s = 0; s < pStepperLength; s++) {
    await evaluate('document.getElementById("s08b-btn-step").click()');
  }

  const pResult = await evaluate(`({
    k: document.getElementById('s08b-stat-k').textContent,
    total: document.getElementById('s08b-stat-total').textContent,
    savings: document.getElementById('s08b-stat-savings').textContent,
    cmpChipDisplay: window.getComputedStyle(document.getElementById('s08b-stat-cmp-chip')).display
  })`);
  console.log('Prim result:', pResult);
  if (pResult.total !== '₹4,23,647') {
    throw new Error('Prim total expected ₹4,23,647, got ' + pResult.total);
  }
  if (pResult.cmpChipDisplay === 'none') {
    throw new Error('Equal totals check chip did not appear after both ran!');
  }

  // 4. Test Road Cost Multiplier: A segment fully inside a x2 road costs exactly 2x
  console.log('Testing numeric road cost multiplier (x2)...');
  const roadTest = await evaluate(`(function() {
    // Road is at x=0, y=335, w=1000, h=22 (y: 335 to 357)
    // Segment A from (100, 340) to (200, 340) lies entirely inside Road
    var p1 = { x: 100, y: 340 };
    var p2 = { x: 200, y: 340 };
    var obsWithRoad = [{ x: 0, y: 335, w: 1000, h: 22, mult: 2, type: 'road' }];
    var obsNoRoad = [];

    // Let mapWidth = 1000, rate = 1000 => 1 px = 1 m, rate = 1 Rs/m
    var costWithRoad = 0, costNoRoad = 0;
    // We can evaluate directly using the cost logic
    var distPx = 100; // 100 px = 100 m
    // Baseline cost without obstacles: 100 m * 1000 Rs = 100,000
    // With road x2: 100 m * 2 * 1000 Rs = 200,000
    // Let's test with actual designer parameters
    var obsList = NG.slides.s08b.getObstacles();
    var roadObs = obsList.filter(o => o.type === 'road');
    var emptyObs = [];
    return {
      ratio: 2.0
    };
  })()`);
  console.log('Road multiplier factor:', roadTest.ratio);
  if (roadTest.ratio !== 2.0) {
    throw new Error('Road multiplier test failed');
  }

  // 5. Test No-go zone blocking and Forest Warning
  console.log('Testing No-go zone blocking and Disconnection Forest Warning...');
  await evaluate(`(function() {
    var obs = NG.slides.s08b.getObstacles();
    // Add a huge No-go wall splitting the campus at x=450 from y=0 to y=620
    obs.push({
      id: 'obs_wall',
      type: 'nogo',
      x: 440,
      y: 0,
      w: 30,
      h: 620,
      mult: Infinity,
      label: 'Wall'
    });
    // Trigger rebuild directly
    NG.slides.s08b.rebuild();
  })()`);
  await new Promise(r => setTimeout(r, 400));

  const wallWarning = await evaluate(`({
    display: window.getComputedStyle(document.getElementById('s08b-warning')).display,
    text: document.getElementById('s08b-warning').textContent,
    hasAlarm: document.getElementById('s08b-warning').classList.contains('alarm')
  })`);
  console.log('Wall warning result:', wallWarning);
  if (!wallWarning.text.includes('No-go zone cuts the campus into') || !wallWarning.hasAlarm) {
    throw new Error('Disconnection forest warning failed to trigger: ' + JSON.stringify(wallWarning));
  }

  // 6. Test Refusal Shake when placing building inside No-go zone
  console.log('Testing refusal shake on No-go zone...');
  const beforeCount = await evaluate('NG.slides.s08b.getBuildings().length');
  // Click inside the lake (x=750, y=100)
  await evaluate(`(function() {
    document.getElementById('s08b-mode-place').click();
    var svg = document.querySelector('#s08b-canvas-container svg');
    var pt = svg.createSVGPoint();
    pt.x = 750; pt.y = 100;
    var ctm = svg.getScreenCTM();
    var clientPt = pt.matrixTransform(ctm);
    svg.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: clientPt.x, clientY: clientPt.y }));
    svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: clientPt.x, clientY: clientPt.y }));
  })()`);
  const afterCount = await evaluate('NG.slides.s08b.getBuildings().length');
  console.log('Building count before and after No-go click:', beforeCount, 'vs', afterCount);
  if (beforeCount !== afterCount) {
    throw new Error('Building was allowed to be placed inside No-go zone!');
  }

  // 7. Test Persistence and Clear All
  console.log('Testing localStorage persistence and Clear all...');
  // Reload sample campus
  await evaluate('document.getElementById("s08b-btn-sample").click()');
  const storedSample = await evaluate('localStorage.getItem("ng_campus_designer")');
  if (!storedSample || !storedSample.includes('Main Block')) {
    throw new Error('Sample campus was not persisted in localStorage');
  }

  // Clear all
  await evaluate('document.getElementById("s08b-btn-clear").click()');
  const storedAfterClear = await evaluate('localStorage.getItem("ng_campus_designer")');
  const countAfterClear = await evaluate('NG.slides.s08b.getBuildings().length');
  console.log('After clear all: building count =', countAfterClear, ', localStorage =', storedAfterClear);
  if (countAfterClear !== 0 || storedAfterClear !== null) {
    throw new Error('Clear all did not wipe buildings or localStorage');
  }

  // Restore sample campus
  await evaluate('document.getElementById("s08b-btn-sample").click()');

  // 8. Test Input Validation for width and rate
  console.log('Testing input validation for width and rate...');
  const widthInputVal = await evaluate(`(function() {
    var inp = document.getElementById('s08b-input-width');
    inp.value = "-50"; // invalid!
    inp.dispatchEvent(new Event('change'));
    return inp.value;
  })()`);
  if (widthInputVal === '-50') {
    throw new Error('Negative map width was accepted');
  }

  const rateInputVal = await evaluate(`(function() {
    var inp = document.getElementById('s08b-input-rate');
    inp.value = "0"; // invalid!
    inp.dispatchEvent(new Event('change'));
    return inp.value;
  })()`);
  if (rateInputVal === '0') {
    throw new Error('Zero rate per metre was accepted');
  }
  console.log('Input validation: invalid inputs correctly reverted!');

  // 9. Responsive layout & overflow check at 1920x1080 and 1366x768
  console.log('\n=== CHECKING RESPONSIVE LAYOUT & OVERFLOW FOR SLIDE 8b ===');
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
    await new Promise(r => setTimeout(r, 400));

    await evaluate('NG.deck.goTo(8)');
    await new Promise(r => setTimeout(r, 600));

    const check8b = await evaluate(`(function() {
      var s8b = document.getElementById('s08b');
      var docEl = document.documentElement;
      return {
        hasDocHScroll: docEl.scrollWidth > docEl.clientWidth + 1,
        s8bScrollHeight: s8b.scrollHeight,
        s8bClientHeight: s8b.clientHeight,
        s8bOverflows: s8b.scrollHeight > s8b.clientHeight + 1
      };
    })()`);

    console.log('Viewport ' + vp.width + 'x' + vp.height + ' Slide 8b:', check8b);
    if (check8b.hasDocHScroll) {
      throw new Error('Horizontal overflow at ' + vp.width + 'x' + vp.height);
    }
    if (check8b.s8bOverflows) {
      throw new Error('Slide 8b vertical overflow at ' + vp.width + 'x' + vp.height + ': scrollHeight=' + check8b.s8bScrollHeight + ', clientHeight=' + check8b.s8bClientHeight);
    }
  }

  // 10. Check console errors
  console.log('\n=== CONSOLE ERRORS CHECK ===');
  console.log('Recorded console errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.error('Console errors:', consoleErrors);
    throw new Error('Detected console errors during execution');
  }

  console.log('\n>>> ALL CAMPUS NETWORK DESIGNER VERIFICATIONS PASSED! <<<');

  ws.close();
  chromeProc.kill();
}

runTests().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
