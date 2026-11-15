const { spawn } = require('child_process');
const http = require('http');

async function main() {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9340',
    '--window-size=1920,1080',
    'file:///C:/Projects/mathpre/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1200));
    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9340/json', r => {
        let s = ''; r.on('data', c => s += c); r.on('end', () => resolve(JSON.parse(s)));
      }).on('error', reject);
    });
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise(resolve => {
        const cur = msgId++;
        const onm = e => {
          const m = JSON.parse(e.data);
          if (m.id === cur) { ws.removeEventListener('message', onm); resolve(m); }
        };
        ws.addEventListener('message', onm);
        ws.send(JSON.stringify({ id: cur, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');

    // Collect console errors
    const consoleErrors = [];
    ws.addEventListener('message', e => {
      const m = JSON.parse(e.data);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        consoleErrors.push(m.params.args.map(a => a.value || a.description).join(' '));
      }
      if (m.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(m.params.exceptionDetails.text);
      }
    });

    async function evaluate(expr) {
      const r = await send('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      if (r.result && r.result.exceptionDetails) {
        console.error('Eval error:', r.result.exceptionDetails);
      }
      return r.result && r.result.result ? r.result.result.value : undefined;
    }

    async function setViewport(w, h) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: h,
        deviceScaleFactor: 1,
        mobile: false
      });
    }

    const report = {};

    // 1. TEST RESOLUTIONS & VIEWPORT FILLING
    const resolutions = [
      { w: 1366, h: 768, name: '1366x768' },
      { w: 1920, h: 1080, name: '1920x1080' },
      { w: 2560, h: 1440, name: '2560x1440' }
    ];

    report.resolutions = {};

    for (const res of resolutions) {
      await setViewport(res.w, res.h);
      await new Promise(r => setTimeout(r, 100));

      const resData = await evaluate(`
        (() => {
          const out = {};
          ['s03', 's11', 's12'].forEach(sid => {
            const s = document.getElementById(sid);
            s.scrollIntoView();
            s.classList.add('in-view');
            if (window.NG && NG.slides && NG.slides[sid] && NG.slides[sid].init) {
              NG.slides[sid].init(s);
            }

            const sRect = s.getBoundingClientRect();
            // Find lowest content element in slide
            const allDesc = Array.from(s.querySelectorAll('*')).filter(el => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && el.offsetParent !== null;
            });
            let maxBottom = 0;
            allDesc.forEach(el => {
              const r = el.getBoundingClientRect();
              if (r.bottom > maxBottom) maxBottom = r.bottom;
            });

            // Available height inside slide (excluding top padding)
            const cs = getComputedStyle(s);
            const padBottom = parseFloat(cs.paddingBottom) || 0;
            const targetBottom = sRect.bottom - padBottom;
            const emptyGapPx = sRect.bottom - maxBottom;
            const gapBelowContent = sRect.bottom - maxBottom;
            const gapPct = (gapBelowContent / window.innerHeight) * 100;

            const hasOverflow = s.scrollHeight > s.clientHeight + 2;

            out[sid] = {
              windowH: window.innerHeight,
              slideBottom: Math.round(sRect.bottom),
              contentBottom: Math.round(maxBottom),
              gapBelowContentPx: Math.round(gapBelowContent),
              emptyGapPct: parseFloat(gapPct.toFixed(2)),
              hasOverflow,
              scrollHeight: s.scrollHeight,
              clientHeight: s.clientHeight
            };
          });
          return out;
        })()
      `);
      report.resolutions[res.name] = resData;
    }

    // 2. COMPUTED FONT SIZES AT 1920x1080
    await setViewport(1920, 1080);
    await new Promise(r => setTimeout(r, 100));

    report.fontSizes = await evaluate(`
      (() => {
        function getFs(sel) {
          const el = document.querySelector(sel);
          return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
        }

        return {
          s03_intro_title: getFs('#s03 .s03-intro-title'),
          s03_table_td: getFs('#s03 .s03-mapping-table td'),
          s03_matrix_cell: getFs('#s03 .s03-matrix-table td'),
          s03_adj_list: getFs('#s03 .s03-adj-list'),
          s03_stat_val: getFs('#s03 .s03-stat-val'),
          s03_node_text: getFs('#s03-abstract-canvas .graph-node text'),
          s03_weight_pill: getFs('#s03-abstract-canvas .graph-weight-pill text'),

          s11_card_statement: getFs('#s11 .s11-card'),
          s11_stat_num: getFs('#s11 .s11-stat-num'),
          s11_takeaway: getFs('#s11-takeaway-a'),
          s11_node_text: getFs('#s11-graph-a .graph-node text'),
          s11_weight_pill: getFs('#s11-graph-a .graph-weight-pill text'),

          s12_tab_btn: getFs('#s12 .s12-tab-btn'),
          s12_how_to_use: getFs('#s12 .s12-how-to-use'),
          s12_readout_val: getFs('#s12-cost-val'),
          s12_caption: getFs('#s12 .s12-caption-card'),
          s12_node_text: getFs('#s12-backup-graph .graph-node text'),
          s12_weight_pill: getFs('#s12-backup-graph .graph-weight-pill text')
        };
      })()
    `);

    // 3. SLIDE 5 (s03) DETAILED FUNCTIONAL AUDIT
    report.s03 = await evaluate(`
      (() => {
        const s = document.getElementById('s03');
        NG.slides.s03.init(s);

        // A. 3-way hover linking check
        const tableRow0 = document.querySelectorAll('#s03-mapping-table tbody tr')[0];
        tableRow0.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
        const devA_high = document.querySelector('.real-device-item[data-node="A"]').classList.contains('hover-linked-element');
        tableRow0.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
        const devA_clear = !document.querySelector('.real-device-item[data-node="A"]').classList.contains('hover-linked-element');

        // B. Matrix and list live update
        const vBefore = document.getElementById('s03-readout-v').textContent;
        const eBefore = document.getElementById('s03-readout-e').textContent;

        // C. Edit edges button
        const btnEdit = document.getElementById('s03-btn-edit');
        btnEdit.click();
        const editModeOn = btnEdit.textContent.includes('ON');
        btnEdit.click();
        const editModeOff = btnEdit.textContent.includes('OFF');

        // D. Check real network device label collisions with cables & weight pills
        const realSvg = document.getElementById('s03-real-svg');
        const pills = Array.from(realSvg.querySelectorAll('.device-label-pill rect')).map(r => r.getBoundingClientRect());
        const cables = Array.from(realSvg.querySelectorAll('.real-cable-item line')).map(l => l.getBoundingClientRect());
        const weightPills = Array.from(realSvg.querySelectorAll('.real-cable-item rect')).map(r => r.getBoundingClientRect());

        let labelCollisions = 0;
        pills.forEach(p => {
          cables.forEach(c => {
            // Check bounding box intersection
            if (!(p.right < c.left || p.left > c.right || p.bottom < c.top || p.top > c.bottom)) {
              labelCollisions++;
            }
          });
          weightPills.forEach(w => {
            if (!(p.right < w.left || p.left > w.right || p.bottom < w.top || p.top > w.bottom)) {
              labelCollisions++;
            }
          });
        });

        // E. Matrix cell sizes
        const firstCell = document.querySelector('#s03 .s03-matrix-table td');
        const cellRect = firstCell ? firstCell.getBoundingClientRect() : { width: 0, height: 0 };

        return {
          hoverLinksWork: devA_high && devA_clear,
          initialV: vBefore,
          initialE: eBefore,
          editModeToggleWorks: editModeOn && editModeOff,
          labelCollisions,
          matrixCellWidth: cellRect.width,
          matrixCellHeight: cellRect.height
        };
      })()
    `);

    // 4. SLIDE 13 (s11) DETAILED FUNCTIONAL AUDIT
    report.s11 = await evaluate(`
      (() => {
        const s = document.getElementById('s11');
        NG.slides.s11.init(s);

        // A. Check for black vertices in initial state
        function checkBlackCircles(container) {
          const circles = Array.from(container.querySelectorAll('.graph-node circle'));
          return circles.some(c => {
            const fill = getComputedStyle(c).fill;
            return fill === 'rgb(0, 0, 0)' || fill === '#000000';
          });
        }

        const blackInitialA = checkBlackCircles(document.getElementById('s11-graph-a'));
        const blackInitialB = checkBlackCircles(document.getElementById('s11-graph-b'));

        // B. Demo A: cut and repair
        NG.slides.s11.cutEdge('EH');
        const compsAfter1 = NG.slides.s11.getComponents().length;
        const takeaway1 = document.getElementById('s11-takeaway-a').textContent;

        NG.slides.s11.cutEdge('EF');
        const compsAfter2 = NG.slides.s11.getComponents().length;
        const takeaway2 = document.getElementById('s11-takeaway-a').textContent;

        NG.slides.s11.repairEdge('EF');
        const compsAfterRepair = NG.slides.s11.getComponents().length;

        NG.slides.s11.resetCuts();
        const compsReset = NG.slides.s11.getComponents().length;
        const takeawayReset = document.getElementById('s11-takeaway-a').textContent;

        // C. Demo B: worst pair and badges
        const worstRes = NG.slides.s11.getWorstPairResult();
        const blackAfterWorstB = checkBlackCircles(document.getElementById('s11-graph-b'));
        const badgesCount = document.querySelectorAll('#s11-graph-b .s11-node-badge').length;
        const takeawayWorst = document.getElementById('s11-takeaway-b').textContent;

        // Check node text colors in Demo B
        const nodeSelText = document.querySelector('#s11-graph-b .graph-node.node-selected-b text');
        const selTextFill = nodeSelText ? getComputedStyle(nodeSelText).fill : '';

        return {
          blackInitialA,
          blackInitialB,
          blackAfterWorstB,
          selTextFill,
          demoA: {
            compsAfter1,
            takeaway1,
            compsAfter2,
            takeaway2,
            compsAfterRepair,
            compsReset,
            takeawayReset
          },
          demoB: {
            pair: worstRes.pair,
            P: worstRes.P,
            S: worstRes.S,
            ratio: (worstRes.P / worstRes.S).toFixed(2),
            badgesCount,
            takeawayWorst
          }
        };
      })()
    `);

    // 5. SLIDE 14 (s12) DETAILED FUNCTIONAL AUDIT
    report.s12 = await evaluate(`
      (() => {
        const s = document.getElementById('s12');
        NG.slides.s12.init(s);

        // A. Check for "₹" anywhere in s12 text
        const hasRupee = s.textContent.includes('₹');

        // B. Tab 1: Bridges & Greedy All
        const initBridges = NG.slides.s12.getBridgesCount();
        const marker = document.querySelector('.bridge-marker path');
        const markerBBox = marker ? marker.getBoundingClientRect() : { width: 0, height: 0 };

        const greedyRes = NG.slides.s12.runGreedyAll();
        const survivesAll = NG.slides.s12.testAllSingleFailures();
        const costVal = document.getElementById('s12-cost-val').textContent;
        const survivesChip = document.getElementById('s12-survives-chip').textContent;

        // C. Tab 2: Switch & SPT root
        NG.slides.s12.switchTab(2);
        const sptRootVal = document.getElementById('s12-spt-root-sel').value;
        const sptNodeText = document.querySelector('#s12-spt-graph .graph-node text');
        const sptCircleFill = sptNodeText ? getComputedStyle(sptNodeText.previousElementSibling).fill : '';

        // D. Tab 3: Steiner tree metrics
        NG.slides.s12.switchTab(3);
        const steinerMetrics = NG.slides.s12.getSteinerMetrics();

        // Terminal circle radius
        const termCircle = document.querySelector('#s12-steiner-board circle');
        const termR = termCircle ? parseFloat(termCircle.getAttribute('r')) : 0;

        return {
          hasRupee,
          bridgeMarkerWidth: markerBBox.width,
          bridgeMarkerHeight: markerBBox.height,
          initBridges,
          greedyBridges: greedyRes.bridgesCount,
          survivesAll,
          costVal,
          survivesChip,
          sptCircleFill,
          steinerMetrics,
          termR
        };
      })()
    `);

    // 6. HELPER LINES WORD FOR WORD CHECK
    report.helperLines = await evaluate(`
      (() => {
        const h03_1 = document.querySelectorAll('#s03 .s03-helper-line')[0]?.textContent.trim();
        const h03_2 = document.querySelectorAll('#s03 .s03-helper-line')[1]?.textContent.trim();

        const h12_1 = document.querySelectorAll('#s12 .s12-how-to-use')[0]?.textContent.trim();
        const h12_2 = document.querySelectorAll('#s12 .s12-how-to-use')[1]?.textContent.trim();
        const h12_3 = document.querySelectorAll('#s12 .s12-how-to-use')[2]?.textContent.trim();

        return {
          h03_1,
          h03_1_match: h03_1 === "Hover a row, a device or a vertex to see the match.",
          h03_2,
          h03_2_match: h03_2 === "Row and column = vertices. A number means a cable and its weight; 0 means no cable.",

          h12_1,
          h12_1_match: h12_1 === "Press Add a backup link. Each press covers at least one weak spot.",
          h12_2,
          h12_2_match: h12_2 === "Click a vertex to choose the root, then switch between the two trees.",
          h12_3,
          h12_3_match: h12_3 === "Drag the corners. The extra junction can make the cable shorter."
        };
      })()
    `);

    report.consoleErrors = consoleErrors;

    console.log(JSON.stringify(report, null, 2));

    ws.close();
    chrome.kill();
  } catch (err) {
    console.error('Test execution error:', err);
    try { chrome.kill(); } catch (_) {}
  }
}

main();
