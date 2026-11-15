
PROJECT SPEC: "Computer Network Design Using Spanning Trees"
Interactive web presentation. Single source of truth for all build phases.

================================================================
1. WHAT WE ARE BUILDING
================================================================
A single-page, scroll-driven, interactive web presentation for a college Mathematics course (2nd-year CSE, Graphs chapter). Topic statement: "Computer Network Design Using Spanning Trees".
- Shown on a classroom projector from a laptop, OFFLINE, opened by double-clicking index.html.
- Pattern for every slide: a SHORT plain-words explanation, then a LIVE DEMO. Maths stays rigorous: slides 9 (proofs) and 10 (complexity) are real content, not decoration.
- Presented by a team of 3. NOTHING in the deck may say who presents what.
- Visual theme: "graph-paper notebook" (cream paper, faint grid, ink-black lines, one hot vermilion accent). NEVER dark or navy.

================================================================
2. HARD RULES (apply in every phase)
================================================================
H1  Vanilla HTML + CSS + JavaScript only. No frameworks, bundlers, npm, or runtime CDN dependencies.
H2  Must work from file://. So: NO ES modules (no import/export, no type="module"), no fetch() of local files, no service workers. Use classic <script src> files; each file is an IIFE that attaches to the global namespace window.NG.
H3  Fonts: bundle .woff2 files in assets/fonts/ if they can be downloaded; otherwise rely on the fallback stacks in section 4. Layout must not break with fallback fonts.
H4  Light theme only. Forbidden: dark/navy/black backgrounds, purple-to-blue gradients, glassmorphism, neon glows, emoji. Icons = inline SVG.
H5  No text anywhere saying who presents which slide or any team-role split. Member names appear only on slide 1, read from js/config.js.
H6  Maths correctness: use ONLY the formulas, statements and numbers given in section 8. Do not invent extra mathematical claims, history or statistics.
H7  Every interactive widget has: a Reset button, touch/pen support via Pointer Events, no console errors, sane behaviour on edge cases (empty graph, 1 node, disconnected graph).
H8  Performance: target 60 fps. Slides initialise lazily when within one viewport of the screen; requestAnimationFrame loops pause when a slide is not visible.
H9  Accessibility: body text >= 18px at 1366x768; headings 44-64px at 1920x1080; aria-labels on all controls; honour prefers-reduced-motion (plus a manual toggle); never rely on colour alone (also use dashes, icons, labels).
H10 Layout: designed at 1920x1080; must work from 1366x768 to 2560x1440. Each slide fits exactly one viewport (100dvh), no inner page scrolling. Landscape desktop only; if viewport width < 900px show a polite "Please open on a laptop or larger screen" overlay.
H11 No lorem ipsum, no TODO stubs in finished slides, no "coming soon". Placeholder text is allowed ONLY in js/config.js (team names, college, faculty).

================================================================
3. FILE STRUCTURE (create exactly this; do not rename)
================================================================
index.html
README.md
docs/SPEC.md
css/base.css          tokens, paper background, typography
css/deck.css          slide framework, nav rail, progress, transitions, overlays
css/components.css    cards, buttons, sliders, panels, tables, pseudocode, status chips
css/slides.css        per-slide layout rules (scoped by #s01 ... #s15, #s08b)
js/config.js          window.NG_CONFIG = { names:[...3], college, department, course, faculty, date }
js/core/util.js       helpers (clamp, lerp, rng with seed, formatINR, easing, debounce, el())
js/core/graph.js      NG.Graph (pure data, no DOM)
js/core/algo.js       NG.Algo (pure algorithms, no DOM)
js/core/view.js       NG.View (SVG renderer + interaction)
js/core/stepper.js    NG.Stepper (play/pause/step/back/speed over precomputed steps)
js/core/stp-model.js  NG.STP (pure model for the Spanning Tree Protocol sim)
js/deck.js            navigation, reveal animations, notes drawer, help overlay, lazy init
js/slides/s01.js ... s15.js and s08b.js   one file per slide: NG.slides.sXX = { init(root), destroy() }
tests/tests.html      in-browser test runner for core/*.js (prints PASS/FAIL)
tests/harness.html    visual playground for NG.View
assets/fonts/, assets/campus/ (optional campus-map.png placeholder + README)

Script load order in index.html: config, util, graph, algo, stepper, view, stp-model, deck, slides (s01..s15, s08b). Everything runs after DOMContentLoaded.

================================================================
4. DESIGN SYSTEM
================================================================
CSS custom properties (css/base.css :root):
--paper:#F3EBD8  --paper-2:#EBE1CA  --paper-3:#FBF6E9 (cards)
--grid-minor: rgba(60,50,30,.08)  --grid-major: rgba(60,50,30,.17)
--ink:#1C1A16  --ink-2:#4A4538  --ink-3:#8A8270
--vermilion:#E4411F  (RESERVED: accepted/chosen MST edges, primary buttons, key emphasis)
--alarm:#B80F2A  (ONLY for transient cycle-flash/error/broken link; always paired with a shake and a cross icon)
--highlighter:#FFE066  (marker-style text highlight)
Component palette (union-find components, cut sides, STP etc.), in this order:
--c1:#178A86 teal  --c2:#D49A00 mustard  --c3:#7D3C98 plum  --c4:#4E8F2F leaf  --c5:#2F6BD6 cobalt  --c6:#D6457F rose  --c7:#8B5A2B umber  --c8:#5E6B73 graphite
Fonts (with fallbacks):
Display serif: "Fraunces", "DM Serif Display", Georgia, serif
Body: "Source Sans 3", "Segoe UI", system-ui, sans-serif
Mono (weights, code, labels): "JetBrains Mono", "IBM Plex Mono", "Courier New", monospace
Handwritten margin notes (rare, <=1 per slide): "Caveat", "Segoe Print", cursive
Background: --paper with a CSS graph-paper grid made of linear-gradients: 24px minor lines, 120px major lines, plus a very faint SVG feTurbulence noise overlay (opacity <= .05). The grid shifts slightly with scroll (parallax, <= 40px total).
Surfaces: cards use --paper-3, 2px solid --ink border, 6px radius, HARD offset shadow (4px 4px 0 var(--ink)), like a sticker/notecard. Optional tape-strip decoration on some cards via CSS pseudo-element.
Buttons: ink border, paper fill, hard shadow; hover: translate(-1px,-1px) and shadow grows; active: translate(2px,2px) and shadow 0. Primary button = vermilion fill with paper-coloured text. Sliders: custom-styled, ink track, vermilion thumb.
Graph look (all graphs): node = circle r=20 fill --paper-3 stroke --ink 2.5px, label in mono bold. Edge = ink 2px round caps. Weight label = mono text on a small --paper-3 rounded pill at the edge midpoint, rotated never (always horizontal). Accepted edge = vermilion 5px. Rejected edge = --ink-3 dashed 2px with a small cross at midpoint. Candidate/frontier edge = ink-2 with animated dash-offset pulse. Faded = opacity .25.
Headings: Fraunces, with a hand-drawn SVG underline that "draws" when the slide enters. Slide number shown as a small taped label "§ 07" top-left of each slide.
HOVER effects (only where listed; do not add hover to ordinary paragraphs): definition cards and key-term chips (lift + rotate <= 1deg, and highlight the matching element in the figure), table rows (slide 5 mapping, slide 12 complexity), pseudocode lines (highlight matching step), application cards (slide 16), rail dots (tooltip with slide title).
No CSS frameworks. No gradients except the subtle paper vignette.

================================================================
5. DECK BEHAVIOUR
================================================================
Structure: <main id="deck"> with 19 <section class="slide"> elements in this order: s01, s01b, s02, s02b, s03, s04, s05, s06, s07, s08, s08b, s09, s10, s11, s12, s13, s14, s15, s16. Total: 18 main slides + 1 sub-slide (s08b). s08b is a SUB-SLIDE of slide 10 (the Campus Network Designer). Each section has data-title and data-notes (2-3 plain-words sentences for the presenter).

| Display # | Section ID | Title | Type / Description |
|:---:|:---:|:---|:---|
| 01 | s01 | Title | Hero Live Graph (Official College Template) |
| 02 | s01b | Introduction | Static Text (6 points) & SVG Star Network Notecard |
| 03 | s02 | The Problem | Text (6 points) & Interactive Mesh vs Tree Simulation |
| 04 | s02b | Objectives | Static Text Grid (6 points) & Numbered Accent Markers |
| 05 | s03 | Graph Modelling | Mapping Table, Dual Canvas & Adjacency Matrix |
| 06 | s04 | Trees | Definition, Properties & Path Finder |
| 07 | s05 | Spanning Trees | Cayley Formula & All Trees Explorer |
| 08 | s06 | Minimum Spanning Tree | Beat the Algorithm & Weight Histogram |
| 09 | s07 | Kruskal's Algorithm | Step-by-Step Visualiser & Union-Find Table |
| 10 | s08 | Prim's Algorithm | Step-by-Step Visualiser & Priority Queue Min-Heap |
| 10·b | s08b | Campus Network Designer | CAD Flagship Sub-Slide (Obstacles & Trenching) |
| 11 | s09 | Why They Work | Story Stepper, Cut & Cycle Proof Demos |
| 12 | s10 | Complexity | Story Stepper, Big Bounds & Theoretical Growth Chart |
| 13 | s11 | Limitations | Single Points of Failure & Detour Ratio Demos |
| 14 | s12 | Fixes | Backup Links, Shortest-Path Trees, Steiner Trees |
| 15 | s13 | Spanning Tree Protocol | 3-Act STP Simulation & Broadcast Storm Engine |
| 16 | s14 | Applications | 3x2 Grid with Mini Graph Animations |
| 17 | s15 | Conclusion | Six Summary Points (Notebook Markers) |
| 18 | s16 | Thank You | Minimalist Display Serif Title & PABIT Credit |

Scrolling: #deck is the scroll container, scroll-snap-type: y mandatory, each section height:100dvh, overflow:hidden.
Navigation: ArrowDown/ArrowRight/PageDown/Space = next; ArrowUp/ArrowLeft/PageUp/Shift+Space = previous; Home/End = first/last. Ignore keys when focus is inside input/select/textarea or a range slider. Right-side dot rail (19 dots, the s08b dot smaller with .sub, tooltips with slide titles, click to jump). Bottom progress bar (vermilion). Slide counter bottom-right "NN / 18" (s08b shows "10·b").
Keys: F fullscreen, N toggle presenter-notes drawer (reads data-notes, slides in from the bottom, paper style), M toggle reduced motion, ? help overlay listing shortcuts, Esc closes overlays. Deep linking: URL hash updates on slide changes (#s01b, #s02b, etc.) and navigates on direct load/hashchange.
Slide enter transition: IntersectionObserver adds .in-view when >=55% visible, removes it when <20%, so animations replay on revisit. Inside a slide, elements with .reveal rise 28px and fade in with staggered delays (80ms steps, set by --i). Headings: clip-path "ink wipe" then underline draw. Outgoing slide scales to .97 and dims to .5 opacity (scroll-linked via CSS scroll-driven animation if supported, otherwise via IntersectionObserver ratio). Numbers marked .count-up tick up from 0.
Lazy init: deck.js calls NG.slides[id].init(rootEl) the first time a slide gets within 1 viewport; calls .pause() / .resume() hooks (optional in each module) when it leaves/enters view. Wrap each init in try/catch and log with the slide id, so one broken slide never breaks the deck.
reduced motion: when active (OS setting or M key) disable parallax, stagger, wipe and replace sim animations with instant jumps (sims still work).

================================================================
6. CORE ENGINE API (build exactly these names)
================================================================
NG.Graph (pure data)
  constructor({nodes:[{id,label,x,y}], edges:[{id,u,v,w}], directed:false})
  addNode(x,y,label?)->id, removeNode(id), addEdge(u,v,w?)->id (no self-loops, no duplicates), removeEdge(id), setWeight(id,w), moveNode(id,x,y)
  edge(id), node(id), neighbors(id)->[{node,edge}], degree(id), n(), m(), clone(), toJSON()/fromJSON()
  euclid(u,v)->distance between node positions
NG.Algo (pure; input NG.Graph; never mutates it)
  UnionFind(ids): find(x) (path compression; also findTrace(x)->array of visited nodes), union(a,b) (by rank)->bool, parent map, rank map, components()->array of id arrays. Expose parent/rank snapshots for display.
  components(graph, {skipEdges:Set}) -> array of id arrays
  isConnected(graph), hasCycle(graph), isTree(graph)
  findCycleIfAdded(graph, edgeId_or_(u,v)) -> array of edge ids forming the cycle that adding the edge would create, or null
  pathInForest(graph, a, b, {onlyEdges:Set}) -> {nodes:[], edges:[]} or null
  kruskalSteps(graph) -> array of step objects:
      {type:'consider'|'accept'|'reject'|'done', edgeId, line:<pseudocode line number>, findU, findV (roots), componentsAfter (array of arrays), acceptedEdges:[ids], total, parentSnapshot, rankSnapshot, sortedEdgeIds}
      Edges sorted by (w asc, id asc). Stops as soon as n-1 edges are accepted (or edges run out for disconnected graphs: then ends with a 'done' step flagged forest:true).
  primSteps(graph, startId) -> array of steps:
      {type:'start'|'frontier'|'pick'|'skip'|'done', edgeId, line, treeNodes:[ids], treeEdges:[ids], frontierEdges:[ids sorted by w], heapSnapshot:[{edgeId,w}], total}
      Lazy-deletion binary-heap version: popping an edge whose far end is already in the tree = 'skip' step. Ties by (w, edge id).
  mst(graph) -> {edges:[ids], total, forest:boolean}   (Kruskal internally)
  cut(graph, nodeSetS) -> {crossing:[edgeIds], lightest:edgeId|null, tied:boolean}
  dijkstra(graph, src) -> {dist:Map, prevEdge:Map}
  shortestPathTree(graph, src) -> {edges:[ids], total}
  bridges(graph, {onlyEdges:Set}) -> array of edge ids (Tarjan, handles disconnected)
  enumerateSpanningTrees(graph, limit=5000) -> array of edge-id arrays  (backtracking with union-find, not brute force over all subsets if m is large)
  countSpanningTrees(graph) -> integer via Kirchhoff's matrix-tree theorem (determinant of a Laplacian cofactor; use exact BigInt fraction-free Bareiss elimination)
  cayley(n) -> BigInt n^(n-2) (n>=2; cayley(1)=1)
  meshEdges(n) -> n(n-1)/2
  eulerianNotNeeded: do NOT implement anything outside this list.
NG.Stepper
  constructor({steps, onStep(index, step, direction), intervalMs:700})
  play(), pause(), toggle(), next(), prev(), goto(i), reset(), setSpeed(multiplier 0.25..4), index, length, playing, onEnd callback. Because steps are precomputed and each step is self-contained, stepping backwards must be exact.
NG.View (SVG renderer)
  constructor(container, graph, {width, height, viewBox, draggable, showWeights, weightMode:'fixed'|'euclid', weightScale (euclid dist * scale), editableWeights, showNodeLabels, nodeRadius, padding})
  render() full redraw; update() cheap restyle
  setNodeState(id, {fill, ring, className}), setEdgeState(id, 'default'|'accepted'|'rejected'|'candidate'|'frontier'|'cut'|'faded'|'blocked'|'broken'), clearStates()
  setNodeColors(map id->colorVar) for component colouring
  drawEdgeIn(id, ms) (stroke-dashoffset draw animation), flashEdge(id,'cycle') (alarm red flash + shake + cross icon, then settles to rejected style), pulse(ids), highlightPath({nodes,edges}), halo(nodeIds,color) (soft growing blob behind nodes for Prim)
  events (assign functions): onNodeClick(id), onEdgeClick(id), onNodeDrag(id,x,y), onNodeDragEnd(id), onBackgroundClick(x,y), onEdgeHover(id|null), onNodeHover(id|null)
  nodes draggable with Pointer Events (touch-action:none on the svg), constrained to the viewBox. Edge weights recompute live when weightMode is 'euclid'.
  Layers in the SVG (bottom to top): halos, edges, weight pills, nodes, overlay (flashes, particles, cut line). Provide view.layer('overlay') for custom drawing.
  destroy()

================================================================
7. CANONICAL DEMO GRAPH (reused on slides 6, 7, 8, 9, 10, 11, 14 and as seed for 12)
================================================================
viewBox 0 0 560 420. 8 nodes:
A(120,80) B(300,50) C(480,90) D(80,230) E(260,210) F(450,240) G(170,370) H(380,360)
13 edges with DISTINCT weights (id=u+v):
EH 1, EF 2, BE 3, AB 4, AE 5, CF 6, DE 7, GH 8, AD 9, BC 10, DG 11, FH 12, CE 13
Known results (use as test expectations):
- Kruskal order of consideration: EH, EF, BE, AB, AE, CF, DE, GH (then stops). Decisions: EH accept, EF accept, BE accept, AB accept, AE REJECT (cycle A-B-E), CF accept, DE accept, GH accept. 7 edges accepted = n-1.
- MST edge set {EH, EF, BE, AB, CF, DE, GH}, total weight = 31. The MST is unique (distinct weights).
- Prim from A picks in this order: AB(4), BE(3), EH(1), EF(2), CF(6), DE(7), GH(8). Total 31.
- All 7 MST edges are bridges of the MST. Number of spanning trees: computed by countSpanningTrees must equal enumerateSpanningTrees(...).length (no hard-coded number).
Other graphs: slide 3 (s02) uses a circle layout; slide 5 (s03) uses its own small network; slide 12 (s10) uses theoretical curves; sub-slide 10b (s08b) uses the campus map.

================================================================
8. SLIDE-BY-SLIDE CONTENT AND INTERACTIONS
================================================================
Layout default: left 40% = text (title, 2-4 short statements, definition cards), right 60% = demo panel (cards with controls beneath). Keep text SHORT, written in simple words.

--- SLIDE 1: TITLE (id s01) ---
Title: "Computer Network Design Using Spanning Trees". Subtitle: "Graph Theory . Mathematics". Show names (from NG_CONFIG), college, department "CSE . 2nd Year", faculty, date.
Hero: full-width live graph. On load: nodes pop in one by one, all 28 edges of a complete graph on 8 nodes draw in faint grey, then the MST edges turn vermilion and thicken while the others fade to 0.15 opacity. Nodes draggable (MST recomputes live using NG.Algo.mst with euclid weights). Button "Replay". A small hint: "Drag a node".

--- SLIDE 2: INTRODUCTION (id s01b) ---
Title: "Introduction". Six statements revealed one by one with .reveal:
 1. "A computer network connects devices such as computers, switches, routers and servers."
 2. "Devices communicate through wired or wireless connections."
 3. "Graph Theory represents devices as vertices and communication links as edges."
 4. "A spanning tree is a connected subgraph that includes all vertices without forming any cycles."
 5. "It helps design efficient networks by reducing unnecessary connections."
 6. "Useful in campus networks, office networks and communication systems."
Layout: text on the right (~55%), one static SVG illustration on the left (~45%). Cream paper notecard holding a crisp SVG drawing of a tiny star network (central switch SW connected to 5 PCs PC1..PC5 and 1 server SV, clean ink strokes, small neat labels). Caption: "A network as a graph". Typography: body text >= 24px at 1920x1080. No simulation.

--- SLIDE 3: THE PROBLEM (id s02) ---
Text: "A college has n buildings. Connect them all with cable. Every building must reach every other. Cable is expensive. No pointless loops."
Six statements revealed one by one with .reveal:
 1. "A network must connect multiple devices or locations."
 2. "Directly connecting every pair creates redundant links."
 3. "For n devices, a full mesh requires n(n−1)/2 connections."
 4. "A spanning tree needs only n−1 connections."
 5. "The challenge: find the required connections and avoid unnecessary links." (highlighted)
 6. "Real-world goals: minimize cost, prevent loops and maintain connectivity."
Demo "Mesh vs Tree": slider n from 2 to 100 (default 8).
  Counters (animated count-up): Full mesh links = n(n-1)/2; Tree links = n-1; Wasted links = n(n-1)/2 - (n-1); "Tree uses X% of the mesh" (to 1 decimal).
  Left drawing: for n <= 24 nodes on a circle with ALL mesh edges (thin ink); right drawing: same nodes with a tree (a simple star-free path-or-spanning tree; use the MST of the circle layout by euclid distance) in vermilion. For n > 24: draw only the node ring and replace edge drawings with two horizontal bars scaled to counts and the caption "Too many lines to draw. That is the point."
  Fixed fact callout when n=100: 4950 links vs 99.
Scroll-draw: the mesh edges draw in as the slide enters.

--- SLIDE 4: OBJECTIVES (id s02b) ---
Title: "Objectives". Six statements revealed one by one with .reveal:
 1. "Model computer networks using graph theory concepts."
 2. "Understand the properties and role of spanning trees in network design."
 3. "Apply Kruskal's and Prim's algorithms to find Minimum Spanning Trees (MST)."
 4. "Compare algorithm complexity and suitability for different network sizes."
 5. "Analyze real-world limitations such as single point of failure and bottleneck links."
 6. "Study practical solutions including Spanning Tree Protocol (STP) and redundant links."
Layout: clean two-column balanced grid layout. Each objective gets a subtle notebook-style numbered marker (1..6) using warm accent colours from the design system. Typography: body text >= 24px at 1920x1080. No simulation.

--- SLIDE 5: GRAPH MODELLING (id s03) ---
Text: "Turn the network into a graph." Mapping table (hoverable rows): Router/switch -> vertex v in V; Cable between two devices -> edge e = {u,v} in E; Cost or length of the cable -> weight w(e); Whole network -> weighted graph G = (V, E, w), with w: E -> positive real numbers. Note: undirected, simple (no self-loops, no parallel edges), connected.
Demo: left = a clean illustrated "real network" (inline SVG: 6 devices drawn as small router/switch/PC icons joined by cables), right = the abstract graph of the same network. HOVER a table row, a device, or a vertex: the matching items light up in all three places. Beneath: a LIVE adjacency list AND adjacency matrix of the right graph that update as nodes are dragged (weights = round(euclid/20)) and edges are added by click-click on two nodes / removed by clicking an edge (toggle "Edit edges" button). Also live readouts: |V|, |E|, sum of weights, degree of the hovered node.

--- SLIDE 6: TREES (id s04) ---
Definition card: "A tree is a connected graph with no cycles."
Properties card (4 short lines; hovering each highlights it in the figure): (1) n vertices -> exactly n-1 edges. (2) Exactly ONE path between any two vertices. (3) Remove any edge -> it falls apart into 2 pieces. (4) Add any edge -> exactly ONE cycle appears.
Demo "Is it a tree?": the canonical graph, starting with the MST edges ON and the others OFF (hidden faint dashed). Click any edge to toggle it on/off. Live status panel: Connected: yes/no; Acyclic: yes/no; edges m vs n-1; verdict chip "TREE" (vermilion) or "NOT A TREE: reason" (e.g. "has a cycle", "disconnected", "both"). When the user adds an edge that closes a cycle: that cycle highlights and the new edge does the cycle-flash (red + cross + shake). Mode toggle "Path finder": click two vertices to highlight the unique path between them (only when graph is a tree; otherwise show "paths are not unique here" and highlight up to two different paths if they exist).
Reset button.

--- SLIDE 7: SPANNING TREES (id s05) ---
Definition card: "A spanning tree of G is a subgraph that is a tree and contains every vertex of G."
Cayley card: "The complete graph K_n has n^(n-2) spanning trees." Small table: n=3:3, 4:16, 5:125, 6:1296, 7:16807, 8:262144 (computed by NG.Algo.cayley, shown with tick-up).
Demo "Many spanning trees": canonical graph. Buttons Prev / Next / Random / Autoplay cycle through ALL spanning trees (from enumerateSpanningTrees). Show "Tree 14 of N", where N = countSpanningTrees (also display "N verified by Kirchhoff's matrix-tree theorem = enumeration count" with a green check if equal, as a small footnote). Each tree displays its total weight; the selected tree's edges are vermilion, others faded. Sort toggle: "unsorted / by weight". Highlight the current tree's weight and the minimum weight so far ("lightest tree found: 31").
Second mini widget: n slider (3 to 10) showing K_n drawn and n^(n-2) as a big number.

--- SLIDE 8: MINIMUM SPANNING TREE (id s06) ---
Definition card: "A minimum spanning tree (MST) is a spanning tree whose total weight w(T) = sum of w(e) over e in T is as small as possible."
Facts card: "If all edge weights are different, the MST is unique." "If some weights tie, there can be several MSTs, but they all have the same total weight."
Demo "Beat the algorithm": canonical graph. The user clicks edges to BUILD a spanning tree. Live: edges chosen k of n-1, current weight, status "not yet spanning / contains a cycle (blocked, the edge flashes red and is not added) / spanning tree, weight = X". When they finish a spanning tree show "Your tree: X. Best possible: 31. Gap: X-31." Buttons: Reveal MST (animates the MST in vermilion over the user's tree), Reset, "Show weight histogram": a bar histogram of the total weights of ALL spanning trees (from the enumeration) with the user's tree and the minimum marked.

--- SLIDE 9: KRUSKAL'S ALGORITHM (id s07) ---
Plain-words card: "Sort all edges from cheapest to costliest. Walk down the list. Take an edge unless it would close a loop."
Pseudocode panel (monospace, numbered, lines highlight in sync with each step; hovering a line shows a one-line tooltip):
 1  sort edges by weight
 2  T = empty set; each vertex is its own set
 3  for each edge (u,v) in sorted order:
 4      if find(u) != find(v):
 5          add (u,v) to T
 6          union(u,v)
 7      else: skip it (it would make a cycle)
 8  stop when T has n-1 edges
Demo layout: graph (centre), sorted edge list (right column: each row = edge name, weight, status chip pending/accepted/rejected; current row highlighted, finished rows greyed), union-find panel (below): shows parent[] table for each vertex and the component groups as coloured chips. Vertices coloured by component from the palette; when two components merge, their colours blend: the merged component takes the colour of the larger one with a short ripple animation along the new edge. Accepted edge: draws in vermilion. Rejected edge: cycle-flash (red, cross, shake, with the existing cycle highlighted for 600ms), then dashed grey.
Controls: Play/Pause, Step, Back, Reset, speed slider (0.25x-4x), "New random graph" (seeded; 8 nodes; connected; distinct integer weights 1-20), "Back to the example". Live: running total, edges accepted k/(n-1), step counter. Nodes draggable BEFORE a run starts (dragging resets the run). Caption below always explains the current step in plain words, e.g. "Edge AE (5): A and E are already in the same group, so adding it would make a loop. Skip."
When finished: banner "MST found. Total = 31" (for the example).

--- SLIDE 10: PRIM'S ALGORITHM (id s08) ---
Plain-words card: "Start at one vertex. Grow a single tree outward. Each time, take the cheapest edge that leaves the tree."
Pseudocode: 
 1  pick a start vertex s; tree = {s}
 2  put all edges leaving the tree into a min-heap
 3  repeat until tree has all n vertices:
 4      pop the cheapest edge (u,v) from the heap
 5      if v is already in the tree: skip it
 6      else: add v and edge (u,v) to the tree
 7           push every edge from v to a vertex outside the tree
Demo: canonical graph. Click any vertex to choose the start (default A). Tree vertices get a soft vermilion "blob" halo that grows (halo layer) and tree edges thicken; FRONTIER edges (leaving the tree) pulse with animated dashes; the chosen edge draws in vermilion. Right column: heap panel listing frontier edges sorted by weight, the top one highlighted; stale/skipped entries struck through. Controls identical to slide 9 (Play, Step, Back, Reset, speed, New random graph). Live total, vertices k/n, plain-words caption each step. Final banner "MST found. Total = 31" for the example.
Bottom strip: "Kruskal and Prim: different order, same minimum total" shows both algorithms' totals for the current graph.

--- SUB-SLIDE 10b: CAMPUS NETWORK DESIGNER (id s08b, flagship sim; full-viewport sub-slide) ---
See section 10 (separate spec).

--- SLIDE 11: WHY THEY WORK (id s09, the proof slide) ---
Redesigned for live presentation clarity:
- Left 42% = "story panel" presenting one step at a time in large text (>= 24px at 1920x1080), with small greyed one-liners for previous steps, Next/Back/Reset controls, progress dots, and a "Try it yourself" interactive mode toggle.
- Right 58% = large figure panel dynamically illustrating each step on the canonical graph.
- Three top tabs:
  1. Cut property: "The cheapest edge across any split is always safe to use." (Teal/Mustard split, cheapest crossing edge e, non-e tree T, f -> e swap proof animation, plus interactive vertex-click & line-drag cut tool).
  2. Cycle property: "The heaviest edge of a cycle is never needed." (Cobalt cycle loop, alarm-red heaviest edge e, tree split upon removing e, e -> f swap contradiction animation, plus interactive edge-click cycle tester).
  3. So the algorithms work: "Both algorithms only ever make safe moves." (Kruskal cut property, Kruskal cycle property, Prim cut property, with direct scroll links to slides 9 and 10).
- Button "Full formal proof" opens a slide-over modal drawer with the complete mathematical definitions, theorems, proofs, and corollaries.

### Slide 11, full formal proof (shown only in the drawer)
Definitions: A cut is a split of the vertex set into S and V minus S (both non-empty). An edge CROSSES the cut if one endpoint is in S and the other is not.
Theorem 1 (Cut property, general form): Let A be a set of edges contained in some MST T. Let (S, V\S) be a cut that no edge of A crosses. Let e be a lightest edge crossing the cut. Then A U {e} is contained in some MST. If e is the strictly lightest crossing edge, e is in EVERY MST.
Proof: If e is already in T we are done. Otherwise T has a unique path between the endpoints of e (they are in different sides of the cut), and that path must contain an edge f that crosses the cut. f is not in A, because no edge of A crosses the cut. Remove f from T and add e. The result T' = T - f + e is connected with n-1 edges, so it is a spanning tree. w(T') = w(T) - w(f) + w(e) <= w(T) because e is lightest crossing, w(e) <= w(f). So T' is also an MST, and it contains A U {e}. If w(e) < w(f) strictly, then w(T') < w(T), contradicting that T is minimum, so every MST contains e. QED.
Theorem 2 (Cycle property): If e is the unique heaviest edge on some cycle C of G, then no MST contains e.
Proof: Suppose an MST T contains e. Removing e from T splits T into two components. The rest of the cycle, C minus e, is a path joining the two endpoints of e, so it contains some edge f crossing between the two components. w(f) < w(e). Then T - e + f is a spanning tree with smaller weight, contradicting minimality. QED.
Corollary 1 (Kruskal is correct): Invariant: the accepted edges A are always contained in some MST. When Kruskal accepts e = (u,v), u and v are in different components. Let S = the component of u. No accepted edge crosses (S, V\S). Any lighter edge crossing this cut would have been examined earlier and accepted (its endpoints were in different components then, since components only grow and u,v are still apart). That is impossible, so e is a lightest crossing edge. By Theorem 1, A U {e} is still inside some MST. Rejected edges close a cycle in which they are the heaviest edge examined so far (all others are already accepted, so lighter or equal), so by Theorem 2 they are safe to discard (for distinct weights).
Corollary 2 (Prim is correct): At each step let S = vertices in the tree. The tree edges A do not cross (S, V\S). Prim takes a lightest edge crossing the cut, so Theorem 1 keeps A inside some MST.

--- SLIDE 12: COMPLEXITY (id s10) ---
Layout: left 45% = the story, right 55% = one large clean chart. Text at least 24px at 1920x1080. No simulation, no sliders, no race.
Left (The Story):
 Headline: "Both are fast. Which is faster depends on the graph."
 1. Kruskal card. Big bound: O(E log E). One plain line: "Kruskal spends its time sorting the edges."
 2. Prim card. Big bound: O(E log V). One plain line: "Prim spends its time picking the cheapest edge from a heap."
 3. Equivalence line: "O(E log E) and O(E log V) are the same thing, because E is at most V², so log E is at most 2 log V."
 4. VERDICT: two side-by-side cards with an icon each (hand-drawn inline SVG, never colour alone):
    - "Sparse graph (E close to V)": "Kruskal or Prim with a heap. Both take about V log V." [Use this badge]
    - "Dense graph (E close to V²)": "Prim with an adjacency matrix. It takes O(V²), which beats Kruskal's O(V² log V)." [Use this badge]
 Hovering a verdict card highlights the matching region and curves on the chart.
 Controls: Next button, Reset button, and keyboard Right Arrow stepping when active.
Right (Large Chart):
 Inline SVG drawn by hand (no libraries), fixed V = 100, x-axis E from 99 to 4950, y-axis = operations (shape only).
 Exactly three curves: Kruskal E log2(E) (vermilion), Prim with heap E log2(V) (cobalt), Prim with matrix V² (teal flat line at V² = 10,000).
 Curve labels placed at the line ends with enough spacing so nothing overlaps; stroke widths at least 3px.
 Shaded regions for "sparse" and "dense" with light paper tints and captions.
 Crossover marked at smallest integer E where V² < E log2(E) (computed in code: E=1003) with label "Matrix-Prim wins from here".
 Caption: "Theoretical growth (shape, not measured)".
 Hovering a verdict card brightens the matching region and matching curve; hovering a curve label brightens that curve.

Slide 12, full complexity table (shown only in the drawer):
Visible secondary button "Full complexity table" opens a paper-style drawer/modal (hard shadow, scrollable inside, close button and Esc):
 Kruskal: sort O(E log E) + union-find with path compression and union by rank ~ O(E alpha(V)). Total O(E log E).
 Why O(E log E) = O(E log V): E <= V^2, so log E <= 2 log V.
 Prim, binary heap + adjacency list: O(E log V).
 Prim, Fibonacci heap: O(E + V log V).
 Prim, adjacency matrix (no heap): O(V^2).
 Guidance card: Sparse graph (E close to V): Kruskal and heap-Prim both about V log V. Dense graph (E close to V^2): Prim with a matrix, O(V^2), beats Kruskal's O(V^2 log V). alpha = inverse Ackermann function, practically <= 4.

--- SLIDE 13: LIMITATIONS (id s11) ---
Two cards, in plain words:
 Card 1: "No backup. A tree has exactly n-1 edges and every edge is a bridge: cut any one and the network splits in two."
 Card 2: "It minimises TOTAL cable, not the distance between two particular machines. A short trip in the network can become a long detour in the tree."
Demo A "Break a link": canonical graph showing ONLY the MST in vermilion (others faint dashed). Click any tree edge to CUT it (cut-line effect + alarm-red cross): the network splits into two coloured components (palette colours), live readout: "components: 2", "sizes a and b", "pairs that can no longer talk: a*b of n(n-1)/2 (X%)". Click again to repair. Multiple cuts allowed (components count updates). Reset.
Demo B "Detour": click two vertices; show the path in the MST (vermilion thick) and the shortest path in the FULL graph (cobalt dashed, via dijkstra). Readout: "MST path length P, shortest path length S, detour ratio P/S". A button "Worst pair" auto-selects the pair with the biggest P/S ratio.

--- SLIDE 14: FIXES (id s12) ---
Three tabs (default tab 1), each with a short plain-words caption:
 Tab 1 "Add backup links": start from the MST; bridges are drawn as thick vermilion with a small "single point of failure" marker. Button "Add a backup link" adds, by greedy heuristic, the cheapest non-tree edge that removes at least one bridge (recompute bridges via NG.Algo.bridges), animated; repeat until no bridges (or no more edges). Live: total cost, "cost increase vs MST: +X%", "bridges left: k", "survives any single link failure: yes/no". Also a "Test a failure" mode: click any edge to cut it and show whether the network stays connected. Caption note: "Finding the cheapest set of backup links is a hard problem (NP-hard). We are using a simple greedy rule, not an optimal one."
 Tab 2 "Shortest-path tree": choose a root vertex (click). Toggle MST <-> SPT (Dijkstra from root): show both trees' total weight and the average and maximum root-to-vertex distance. Caption: "MST: cheapest cable overall. Shortest-path tree: shortest route from the root to everybody. Different goals, different trees."
 Tab 3 "Steiner tree": blank board with 3 fixed terminal points (an equilateral triangle) the user can drag, a draggable extra "Steiner point", and live lengths in plain Euclidean distance: MST on the 3 terminals (two shortest sides) vs "Steiner tree" (three segments to the extra point). Button "Snap to best point" moves the Steiner point to the Fermat point (compute by Weiszfeld iterations; if any triangle angle >= 120 degrees the best point is that vertex itself, so show "no extra point helps"). Show saving %. For the equilateral triangle with side 1: MST = 2, Steiner = sqrt(3) = 1.732 (saving 13.4%). Fact card: "In the plane, an MST is never more than 2/sqrt(3), about 1.155 times, the length of the best Steiner tree. (Du and Hwang, 1992)". Caption: "Adding a helper junction that is not a building can make the cable shorter."

--- SLIDE 15: SPANNING TREE PROTOCOL (STP) (id s13) ---
Layout: Left 36% = Story panel with 3 acts, Right 64% = Large simulation scene.
Plain-words vocabulary on slide (real terms in brackets first time only): "boss switch" (root bridge), "hello messages" (BPDUs), "switched off" link end (blocked), "working link" (forwarding). No technical jargon (bridge ID, root port, designated port, port state) appears outside the Technical details drawer.
Story Panel (3 Acts):
 - Act 1: The Problem ("Loops make network traffic multiply."): frames circulate endlessly in loops; "Send one frame" triggers exponential flooding, live counters, and "BROADCAST STORM. Network down." overlay stamp with Replay.
 - Act 2: The Fix ("Pick one tree. Switch off the rest."): "Turn STP on" triggers election animation (crowns, hello envelopes), S1 becomes boss, redundant link ends are switched off (dashed grey with alarm-red perpendicular bar and cross). Spanning tree formed (6 switches, 5 working links computed dynamically). Frame delivery delivers 1 copy per switch ("1 copy per switch. Storm avoided."). Always visible maths card links to slide 14.
 - Act 3: A Link Breaks ("A switched-off link wakes up."): Clicking any working link cuts it (midpoint alarm-red cross); switches re-elect and wake a backup link ("waking up: listening -> learning -> working" ~3s) or reports "No backup link. The network is split in two."
Choose the boss switch: Inline card under the scene (never overflows) allows selecting any switch, setting priority to 4096 or default 32768, dynamically re-routing the tree.
Technical details drawer: Slide-over reference containing IEEE 802.1D key facts, maths link, live updating bridge table, and live protocol log.
Demo: see section 9 (separate spec).

--- SLIDE 16: APPLICATIONS (id s14) ---
Six hoverable cards in a 3x2 grid; on hover each card expands slightly and plays a small live mini-graph animation (own tiny NG.View or hand-made SVG): 
 1 Campus and office LAN: connect buildings with least cable.
 2 Fibre and telecom networks: connect cities/exchanges at least trenching cost.
 3 Power grids: the original motivation, Boruvka's 1926 work on electrifying Moravia.
 4 Multicast and broadcast trees: send one copy of data along a tree to many receivers.
 5 IoT and wireless sensor meshes: low-power routing trees to a sink node.
 6 Clustering and approximation: single-linkage clustering (cut the longest MST edges) and MST-based approximation of the travelling salesman problem.
Each card: title, one plain sentence, mini animation. Cards must not state numbers or claims beyond what is written here.

--- SLIDE 17: CONCLUSION (id s15) ---
Six summary lines revealed one by one with .reveal:
 1. "A network is a weighted graph: devices are vertices, cables are edges, and cable cost is the weight."
 2. "A tree is connected with no cycles, so n vertices use exactly n−1 edges. A spanning tree reaches every vertex, and the complete graph K_n has n^(n−2) of them."
 3. "The minimum spanning tree (MST) is the spanning tree with the smallest total weight."
 4. "Kruskal (sort edges, skip cycles) and Prim (grow from one vertex) both find it, because of the cut property."
 5. "Both run in about O(E log V). Prim with an adjacency matrix, O(V²), suits dense graphs."
 6. "An MST has no backup links and does not minimise distance between two machines. Fixes are backup links, shortest-path trees and Steiner trees. STP uses a spanning tree to stop loops in real networks."
Notebook style numbered markers (1..6). No hover effects, no figures, no buttons.

--- SLIDE 18: THANK YOU (id s16) ---
Large centered "Thank You" in display serif (Fraunces). Bottom credit: "A Presentation by PABIT Cloud Services".

================================================================
9. STP SIMULATION SPEC (slide 15 demo)
================================================================
Topology: 6 switches S1..S6 in a ring with 2 extra cross-links (so there are several loops), 8 links total, each with a cost from {4,19,100... use 4 and 19 mainly}. Layout in an SVG ~ 800x520. One "Host" icon attached to S1 as sender.
Switch: {id, name, priority (default 32768; editable in steps of 4096 via click-popover), mac (fixed unique fake MAC like "00:1A:2B:00:00:01"), bridgeId = (priority, mac) compared lexicographically, lower wins}. Link: {id, a, b, cost, failed:false}.
Pure model (js/core/stp-model.js, NG.STP):
 computeAnalytic(switches, links) -> {root, rootPortLink:{switchId->linkId}, pathCost:{switchId->cost}, designated:[{linkId,switchId}], blocked:[{linkId,switchId}], activeLinks:[linkIds]}
   Root = lowest bridgeId among switches in the main connected component. Path costs = Dijkstra from root over non-failed links. Root port of a non-root switch = port toward the neighbour on its cheapest path (tie-break: lower neighbour bridgeId, then lower link id). Per link: the designated port is on the end with lower pathCost (tie: lower bridgeId). A port that is neither root nor designated is BLOCKED. A link with a blocked end carries no data frames.
 BPDU simulation: BPDU = {rootId, costToRoot, senderId, senderLinkId}. Initially every switch believes it is root. Each tick, every switch sends its best BPDU (cost increases by the link cost at the receiver) out of all non-failed links where it is designated/not-yet-decided. Receivers keep the best vector via lexicographic compare (rootId, cost, senderId, senderLinkId). Converges within ~diameter ticks. REQUIREMENT: the converged state must equal computeAnalytic; include this check in tests.
 Frame flooding model (AGGREGATED counts, no per-frame objects): state = count[directedLinkId] (copies currently travelling on that directed link). Tick: for each switch s, for each incoming directed link with count c>0: s sends c copies out of EVERY active link except the one it arrived on (blocked ports neither send nor receive); out[l'] += c. Source: host injects 1 frame into S1, which sends it out of all active links. Track totalDelivered[switch] (copies received). Clamp displayed counters at 1e12 ("> 1 trillion"). One tick = one hop (~600 ms animated).
 With STP OFF (all links active): copies grow exponentially. With STP ON (after convergence): every switch receives exactly 1 copy and traffic stops.
UI:
 Plain-words 3-Act layout (Story panel left 36%, Simulation scene right 64%).
 Acts:
  [1 The problem]: STP OFF. Ring loop highlighted. "Send one frame" triggers exponential flooding (ink -> vermilion -> alarm red load styling), counters, narrator line ("Hop N: X copies"), and "BROADCAST STORM. Network down." stamp with Replay.
  [2 The fix]: STP ON. Election animation: crowns on all switches, envelopes travel along links, S1 elected boss ("cost to boss: N" badges). Active links solid ink, redundant link ends switched off (dashed grey with alarm-red bar & cross). Frame delivery sends 1 copy to each switch ("1 copy per switch. Storm avoided.").
  [3 A link breaks]: Working links clickable with hover cue. Cutting a link triggers re-election and backup link wake-up transition ("waking up: listening, learning, working" ~3s) or reports "No backup link. The network is split in two." Buttons: "Repair link", "Reset".
 Scene Controls: Only buttons needed for current step shown ("Send one frame", "Turn STP on", "Choose the boss switch", "Repair link", "Reset"). Advanced details popover holds step hello messages, auto, and speed slider (0.5x..2.5x).
 Choose the boss: Inline card under the scene (never floating or overflowing). Selecting a switch offers "Make S... the boss" (priority 4096) and "Back to default (32768)". Re-election updates crowns, tree edges, and costs.
 Technical details drawer: Opened via "Technical details" button. Modal containing full IEEE 802.1D key facts, bridge table (switch, priority, MAC suffix, root port, role) and live protocol/BPDU log.

================================================================
10. CAMPUS NETWORK DESIGNER SPEC (sub-slide 10b)
================================================================
Full-viewport sub-slide. Left 70% = map canvas (SVG, viewBox 1000x620 on graph-paper tile with optional background image at assets/campus/campus-map.png at 55% opacity; if the file is missing, ignore silently). Right 30% = control panel and live stats card.
Toolbar modes (segmented buttons with icons): Place building | Move | Delete | Draw obstacle. Obstacle type picker: Road (cost x2), Rocky ground (cost x3), No-go zone (cable impossible). Obstacles are axis-aligned rectangles drawn by drag; they render as hatch-patterned translucent rectangles with a small label; click an obstacle in Delete mode to remove.
Buildings: click on map in Place mode to add (auto-names B1, B2... ; double-click a building to rename inline). Building = circle node with the name below. Max 30. Move mode: drag. Delete: click building or obstacle.
Cost model:
  edge length in metres = euclidean pixel distance * metresPerPixel, where metresPerPixel = mapWidthMetres / 1000 (input "Map width (metres)", default 500).
  Cost per edge = (metres outside obstacles * 1 + metres inside Road * 2 + metres inside Rocky * 3) * ratePerMetre. Compute by sampling the straight segment every 2 px and classifying the sample point (if a sample lies in overlapping obstacles take the highest multiplier). If ANY sample lies in a No-go zone the edge is BLOCKED (weight infinite, excluded from candidates).
  ratePerMetre input, default 500 (rupees). Currency formatting with en-IN grouping, symbol "₹".
Algorithm picker: Kruskal | Prim (Prim start = first placed building or the selected one). Controls: Build (animated step by step), Step, Back, Pause, Reset, speed. Uses NG.Algo with a graph made of all non-blocked pair edges (complete graph minus blocked). Edge animation matches slides 9 and 10 (accepted = vermilion, rejected = faint dashed). Cables currently chosen show their cost label in the middle ("₹12,300"); non-chosen edges are hidden unless "Show all possible links" toggle is on (thin and faint, no labels except on hover).
Live stats card (updates every step): buildings n; links used k of n-1; TOTAL COST of the network built so far; FULL-MESH cost (sum of all non-blocked pair edges) and mesh link count n(n-1)/2; "Saved X% vs full mesh" where X = (meshCost - mstCost)/meshCost*100 shown once complete; cable length in metres; a "Kruskal total = Prim total" check chip shown after both have been run on the same layout.
Warnings: n<2 -> "Place at least 2 buildings"; blocked edges disconnect the graph -> "No-go zone cuts the campus into k separate parts" and show the minimum spanning FOREST per part (components coloured). 
Buttons: "Load sample campus" (10 buildings, 3 obstacles: coordinates given below), "Clear all", "Undo last placement", "Show all possible links". State is saved to localStorage (try/catch) and restored on reload; "Clear all" also clears storage.
Sample campus (pixels on 1000x620): Main Block(500,300) Library(380,200) CSE Dept(620,200) Hostel A(140,150) Hostel B(160,440) Canteen(330,380) Auditorium(700,380) Sports Complex(860,250) Admin(500,120) Workshop(760,520). Obstacles: Road rect x0 y335 w1000 h22 (x2); Rocky rect x80 y240 w130 h110 (x3); No-go "Lake" rect x700 y80 w200 h90.
Edge cases: duplicate click on same spot; building on top of obstacle (allowed, except inside a No-go zone: refuse with a small shake); dragging during animation resets the run.

