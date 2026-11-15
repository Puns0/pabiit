global.window = global;
require('c:/Projects/mathpre/js/core/util.js');
require('c:/Projects/mathpre/js/core/graph.js');
require('c:/Projects/mathpre/js/core/algo.js');

const buildings = [
  { id: 'b1', name: 'Main Block', x: 500, y: 300 },
  { id: 'b2', name: 'Library', x: 380, y: 200 },
  { id: 'b3', name: 'CSE Dept', x: 620, y: 200 },
  { id: 'b4', name: 'Hostel A', x: 140, y: 150 },
  { id: 'b5', name: 'Hostel B', x: 160, y: 440 },
  { id: 'b6', name: 'Canteen', x: 330, y: 380 },
  { id: 'b7', name: 'Auditorium', x: 700, y: 380 },
  { id: 'b8', name: 'Sports Complex', x: 860, y: 250 },
  { id: 'b9', name: 'Admin', x: 500, y: 120 },
  { id: 'b10', name: 'Workshop', x: 760, y: 520 }
];

const obstacles = [
  { id: 'obs1', type: 'road', x: 0, y: 335, w: 1000, h: 22, mult: 2, label: 'Road' },
  { id: 'obs2', type: 'rocky', x: 80, y: 240, w: 130, h: 110, mult: 3, label: 'Rocky ground' },
  { id: 'obs3', type: 'nogo', x: 700, y: 80, w: 200, h: 90, mult: Infinity, label: 'Lake' }
];

const mapWidthMetres = 500;
const ratePerMetre = 500;
const metresPerPixel = mapWidthMetres / 1000; // 0.5 m/px

function computeEdgeCost(p1, p2, obstacles) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distPx = Math.hypot(dx, dy);
  if (distPx === 0) return { blocked: true, cost: 0, metres: 0 };

  const N = Math.max(1, Math.round(distPx / 2));
  const stepMetres = (distPx / N) * metresPerPixel;
  let effectiveMetres = 0;

  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const sx = p1.x + t * dx;
    const sy = p1.y + t * dy;

    let sampleMult = 1;
    for (let j = 0; j < obstacles.length; j++) {
      const obs = obstacles[j];
      if (sx >= obs.x && sx <= obs.x + obs.w && sy >= obs.y && sy <= obs.y + obs.h) {
        if (obs.type === 'nogo') {
          return { blocked: true, cost: Infinity, metres: distPx * metresPerPixel };
        }
        if (obs.mult > sampleMult) {
          sampleMult = obs.mult;
        }
      }
    }
    effectiveMetres += stepMetres * sampleMult;
  }

  const cost = Math.round(effectiveMetres * ratePerMetre);
  return { blocked: false, cost: cost, metres: Math.round(distPx * metresPerPixel) };
}

// Build graph
const g = new window.NG.Graph();
buildings.forEach(b => g.addNode(b.x, b.y, b.name, b.id));

let meshCost = 0;
let meshLinks = 0;
let totalMetresMesh = 0;

for (let i = 0; i < buildings.length; i++) {
  for (let j = i + 1; j < buildings.length; j++) {
    const b1 = buildings[i];
    const b2 = buildings[j];
    const res = computeEdgeCost(b1, b2, obstacles);
    if (!res.blocked) {
      const eid = b1.id + '_' + b2.id;
      g.addEdge(b1.id, b2.id, res.cost, eid);
      meshCost += res.cost;
      meshLinks++;
      totalMetresMesh += res.metres;
    }
  }
}

console.log('Graph built: n =', g.n(), ', m =', g.m(), ', meshCost =', meshCost, ', meshLinks =', meshLinks);

const kSteps = window.NG.Algo.kruskalSteps(g);
const kLast = kSteps[kSteps.length - 1];
console.log('Kruskal total =', kLast.total, ', accepted edges =', kLast.acceptedEdges.length);

const pSteps = window.NG.Algo.primSteps(g, 'b1');
const pLast = pSteps[pSteps.length - 1];
console.log('Prim total =', pLast.total, ', accepted edges =', pLast.treeEdges.length);

const savingsPct = ((meshCost - kLast.total) / meshCost) * 100;
console.log('Savings % =', savingsPct.toFixed(1) + '%');

