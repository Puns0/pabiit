/* ============================================================
   algo.js — Pure graph algorithms (no DOM, no styling)
   Single source of mathematical truth for all phases
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};

  /* ----------------------------------------------------------
     1. Disjoint-Set Union-Find with Path Compression & Rank
     ---------------------------------------------------------- */
  function UnionFind(ids) {
    this.parent = {};
    this.rank = {};

    var list = Array.isArray(ids) ? ids : (ids ? Array.from(ids) : []);
    for (var i = 0; i < list.length; i++) {
      var id = String(list[i]);
      this.parent[id] = id;
      this.rank[id] = 0;
    }
  }

  /**
   * Find root with full path compression.
   */
  UnionFind.prototype.find = function (x) {
    x = String(x);
    if (this.parent[x] === undefined) {
      this.parent[x] = x;
      this.rank[x] = 0;
      return x;
    }
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  };

  /**
   * Find root and return the full trace of visited nodes: [x, ..., root].
   */
  UnionFind.prototype.findTrace = function (x) {
    x = String(x);
    var trace = [];
    var curr = x;
    while (curr !== undefined && this.parent[curr] !== curr) {
      trace.push(curr);
      curr = this.parent[curr];
    }
    if (curr !== undefined) trace.push(curr);

    // Apply path compression
    var root = curr;
    for (var i = 0; i < trace.length - 1; i++) {
      this.parent[trace[i]] = root;
    }
    return trace;
  };

  /**
   * Union by rank. Returns true if two disjoint sets merged, false if already in same set.
   */
  UnionFind.prototype.union = function (a, b) {
    var rootA = this.find(a);
    var rootB = this.find(b);
    if (rootA === rootB) return false;

    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }
    return true;
  };

  /**
   * Returns array of connected component arrays: [[id, id, ...], ...]
   */
  UnionFind.prototype.components = function () {
    var groups = {};
    var keys = Object.keys(this.parent);
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      var r = this.find(id);
      if (!groups[r]) groups[r] = [];
      groups[r].push(id);
    }
    var res = [];
    for (var g in groups) {
      if (Object.prototype.hasOwnProperty.call(groups, g)) {
        res.push(groups[g]);
      }
    }
    return res;
  };

  /**
   * Return plain snapshots of parent and rank maps for step history.
   */
  UnionFind.prototype.snapshot = function () {
    var p = {};
    var r = {};
    for (var k in this.parent) {
      if (Object.prototype.hasOwnProperty.call(this.parent, k)) {
        p[k] = this.parent[k];
        r[k] = this.rank[k];
      }
    }
    return { parent: p, rank: r };
  };

  /* ----------------------------------------------------------
     2. Connected Components
     ---------------------------------------------------------- */
  function components(graph, opts) {
    opts = opts || {};
    var skip = opts.skipEdges ? new Set(opts.skipEdges) : null;
    var nodeIds = [];
    var nIter = graph._nodes.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      nodeIds.push(nit.value);
    }

    var uf = new UnionFind(nodeIds);
    var edgeIter = graph._edges.values();
    for (var eit = edgeIter.next(); !eit.done; eit = edgeIter.next()) {
      var e = eit.value;
      if (skip && skip.has(e.id)) continue;
      uf.union(e.u, e.v);
    }
    return uf.components();
  }

  /* ----------------------------------------------------------
     3. Connectivity, Cycles, Tree properties
     ---------------------------------------------------------- */
  function isConnected(graph) {
    if (graph.n() <= 1) return true;
    return components(graph).length <= 1;
  }

  function hasCycle(graph) {
    if (graph.n() <= 2 && graph.m() === 0) return false;
    var nodeIds = [];
    var nIter = graph._nodes.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      nodeIds.push(nit.value);
    }

    var uf = new UnionFind(nodeIds);
    var edgeIter = graph._edges.values();
    for (var eit = edgeIter.next(); !eit.done; eit = edgeIter.next()) {
      var e = eit.value;
      if (!uf.union(e.u, e.v)) {
        return true;
      }
    }
    return false;
  }

  function isTree(graph) {
    var n = graph.n();
    var m = graph.m();
    if (n === 0) return true;
    if (n === 1) return m === 0;
    if (m !== n - 1) return false;
    return isConnected(graph) && !hasCycle(graph);
  }

  /* ----------------------------------------------------------
     4. Path Finding & Cycle Detection on Added Edge
     ---------------------------------------------------------- */
  function pathInForest(graph, a, b, opts) {
    a = String(a);
    b = String(b);
    if (!graph.node(a) || !graph.node(b)) return null;
    if (a === b) return { nodes: [a], edges: [] };

    opts = opts || {};
    var only = opts.onlyEdges ? new Set(opts.onlyEdges) : null;

    var queue = [a];
    var visited = new Set([a]);
    var parentEdge = new Map(); // node -> { prevNode, edgeId }

    while (queue.length > 0) {
      var curr = queue.shift();
      if (curr === b) break;

      var nbrs = graph.neighbors(curr);
      for (var i = 0; i < nbrs.length; i++) {
        var v = nbrs[i].node.id;
        var e = nbrs[i].edge;
        if (only && !only.has(e.id)) continue;
        if (!visited.has(v)) {
          visited.add(v);
          parentEdge.set(v, { prevNode: curr, edgeId: e.id });
          queue.push(v);
        }
      }
    }

    if (!visited.has(b)) return null;

    // Reconstruct path
    var pathNodes = [b];
    var pathEdges = [];
    var currNode = b;

    while (currNode !== a) {
      var info = parentEdge.get(currNode);
      pathEdges.unshift(info.edgeId);
      pathNodes.unshift(info.prevNode);
      currNode = info.prevNode;
    }

    return { nodes: pathNodes, edges: pathEdges };
  }

  function findCycleIfAdded(graph, edgeId_or_uv, optV) {
    var u, v, addedEdgeId = null;

    if (optV !== undefined) {
      u = String(edgeId_or_uv);
      v = String(optV);
      addedEdgeId = u + v;
    } else if (typeof edgeId_or_uv === 'string') {
      var e = graph.edge(edgeId_or_uv);
      if (e) {
        u = e.u;
        v = e.v;
        addedEdgeId = e.id;
      } else if (edgeId_or_uv.length === 2 && graph.node(edgeId_or_uv[0]) && graph.node(edgeId_or_uv[1])) {
        u = edgeId_or_uv[0];
        v = edgeId_or_uv[1];
        addedEdgeId = edgeId_or_uv;
      } else if (edgeId_or_uv.indexOf('_') > 0) {
        var parts = edgeId_or_uv.split('_');
        u = parts[0];
        v = parts[1];
        addedEdgeId = edgeId_or_uv;
      } else if (edgeId_or_uv.indexOf('-') > 0) {
        var partsDash = edgeId_or_uv.split('-');
        u = partsDash[0];
        v = partsDash[1];
        addedEdgeId = edgeId_or_uv;
      }
    } else if (Array.isArray(edgeId_or_uv)) {
      u = edgeId_or_uv[0];
      v = edgeId_or_uv[1];
      addedEdgeId = u + v;
    } else if (edgeId_or_uv && typeof edgeId_or_uv === 'object') {
      u = edgeId_or_uv.u;
      v = edgeId_or_uv.v;
      addedEdgeId = edgeId_or_uv.id || (u + v);
    }

    if (!u || !v) return null;

    // Find if a path already exists between u and v
    var path = pathInForest(graph, u, v);
    if (!path) return null; // Adding this edge would NOT create a cycle

    var cycle = path.edges.slice();
    if (addedEdgeId) {
      cycle.push(addedEdgeId);
    }
    return cycle;
  }

  /* ----------------------------------------------------------
     5. Kruskal's Algorithm with Step Snapshots
     ---------------------------------------------------------- */
  function kruskalSteps(graph) {
    var steps = [];
    var nodeIds = [];
    var nIter = graph._nodes.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      nodeIds.push(nit.value);
    }

    var edges = [];
    var eIter = graph._edges.values();
    for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
      edges.push(eit.value);
    }

    // Sort edges by (w asc, id asc)
    edges.sort(function (e1, e2) {
      if (e1.w !== e2.w) return e1.w - e2.w;
      return e1.id < e2.id ? -1 : (e1.id > e2.id ? 1 : 0);
    });

    var sortedEdgeIds = edges.map(function (e) { return e.id; });
    var uf = new UnionFind(nodeIds);
    var acceptedEdges = [];
    var total = 0;
    var n = graph.n();

    // Edge case: empty graph or 1 node
    if (n <= 1) {
      var snap = uf.snapshot();
      steps.push({
        type: 'done',
        edgeId: null,
        line: 8,
        findU: null,
        findV: null,
        componentsAfter: uf.components(),
        acceptedEdges: [],
        total: 0,
        parentSnapshot: snap.parent,
        rankSnapshot: snap.rank,
        sortedEdgeIds: sortedEdgeIds,
        forest: false
      });
      return steps;
    }

    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var rootU = uf.find(edge.u);
      var rootV = uf.find(edge.v);
      var snap = uf.snapshot();

      // Step: consider
      steps.push({
        type: 'consider',
        edgeId: edge.id,
        line: 4,
        findU: rootU,
        findV: rootV,
        componentsAfter: uf.components(),
        acceptedEdges: acceptedEdges.slice(),
        total: total,
        parentSnapshot: snap.parent,
        rankSnapshot: snap.rank,
        sortedEdgeIds: sortedEdgeIds
      });

      if (rootU !== rootV) {
        uf.union(edge.u, edge.v);
        acceptedEdges.push(edge.id);
        total += edge.w;
        var afterSnap = uf.snapshot();

        // Step: accept
        steps.push({
          type: 'accept',
          edgeId: edge.id,
          line: 5,
          findU: rootU,
          findV: rootV,
          componentsAfter: uf.components(),
          acceptedEdges: acceptedEdges.slice(),
          total: total,
          parentSnapshot: afterSnap.parent,
          rankSnapshot: afterSnap.rank,
          sortedEdgeIds: sortedEdgeIds
        });

        // Terminate early as soon as n-1 edges are accepted
        if (acceptedEdges.length === n - 1) {
          break;
        }
      } else {
        // Step: reject (closes cycle)
        steps.push({
          type: 'reject',
          edgeId: edge.id,
          line: 7,
          findU: rootU,
          findV: rootV,
          componentsAfter: uf.components(),
          acceptedEdges: acceptedEdges.slice(),
          total: total,
          parentSnapshot: snap.parent,
          rankSnapshot: snap.rank,
          sortedEdgeIds: sortedEdgeIds
        });
      }
    }

    var finalSnap = uf.snapshot();
    var isForest = acceptedEdges.length < n - 1;

    // Step: done
    steps.push({
      type: 'done',
      edgeId: null,
      line: 8,
      findU: null,
      findV: null,
      componentsAfter: uf.components(),
      acceptedEdges: acceptedEdges.slice(),
      total: total,
      parentSnapshot: finalSnap.parent,
      rankSnapshot: finalSnap.rank,
      sortedEdgeIds: sortedEdgeIds,
      forest: isForest
    });

    return steps;
  }

  /* ----------------------------------------------------------
     6. Prim's Algorithm with Step Snapshots (Lazy Heap)
     ---------------------------------------------------------- */
  function primSteps(graph, startId) {
    var steps = [];
    var n = graph.n();

    if (n === 0) {
      steps.push({
        type: 'done',
        edgeId: null,
        line: 3,
        treeNodes: [],
        treeEdges: [],
        frontierEdges: [],
        heapSnapshot: [],
        total: 0,
        forest: false
      });
      return steps;
    }

    // Default startId to first node if not provided or invalid
    if (!startId || !graph.node(startId)) {
      var nIter = graph._nodes.keys();
      startId = nIter.next().value;
    }
    startId = String(startId);

    if (n === 1) {
      steps.push({
        type: 'start',
        edgeId: null,
        line: 1,
        treeNodes: [startId],
        treeEdges: [],
        frontierEdges: [],
        heapSnapshot: [],
        total: 0
      });
      steps.push({
        type: 'done',
        edgeId: null,
        line: 3,
        treeNodes: [startId],
        treeEdges: [],
        frontierEdges: [],
        heapSnapshot: [],
        total: 0,
        forest: false
      });
      return steps;
    }

    var treeNodes = [startId];
    var treeNodeSet = new Set([startId]);
    var treeEdges = [];
    var total = 0;

    // Binary Min Heap of { edgeId, w, u, v }
    var heap = [];
    function heapCompare(a, b) {
      if (a.w !== b.w) return a.w - b.w;
      return a.edgeId < b.edgeId ? -1 : (a.edgeId > b.edgeId ? 1 : 0);
    }

    function heapPush(item) {
      heap.push(item);
      var idx = heap.length - 1;
      while (idx > 0) {
        var pIdx = (idx - 1) >> 1;
        if (heapCompare(heap[idx], heap[pIdx]) < 0) {
          var tmp = heap[idx]; heap[idx] = heap[pIdx]; heap[pIdx] = tmp;
          idx = pIdx;
        } else break;
      }
    }

    function heapPop() {
      if (heap.length === 0) return null;
      var top = heap[0];
      var bottom = heap.pop();
      if (heap.length > 0) {
        heap[0] = bottom;
        var idx = 0;
        var len = heap.length;
        while (true) {
          var left = (idx << 1) + 1;
          var right = left + 1;
          var best = idx;
          if (left < len && heapCompare(heap[left], heap[best]) < 0) best = left;
          if (right < len && heapCompare(heap[right], heap[best]) < 0) best = right;
          if (best !== idx) {
            var tmp = heap[idx]; heap[idx] = heap[best]; heap[best] = tmp;
            idx = best;
          } else break;
        }
      }
      return top;
    }

    function getHeapSnapshot() {
      return heap.slice().sort(heapCompare).map(function (item) {
        return { edgeId: item.edgeId, w: item.w };
      });
    }

    function getFrontierEdges() {
      var sorted = heap.slice().sort(heapCompare);
      var set = new Set();
      var res = [];
      for (var i = 0; i < sorted.length; i++) {
        var eid = sorted[i].edgeId;
        if (!set.has(eid)) {
          set.add(eid);
          res.push(eid);
        }
      }
      return res;
    }

    // Step 1: Start
    steps.push({
      type: 'start',
      edgeId: null,
      line: 1,
      treeNodes: treeNodes.slice(),
      treeEdges: treeEdges.slice(),
      frontierEdges: [],
      heapSnapshot: [],
      total: total
    });

    // Push initial incident edges from startId
    var initNbrs = graph.neighbors(startId);
    for (var i = 0; i < initNbrs.length; i++) {
      var ne = initNbrs[i];
      heapPush({ edgeId: ne.edge.id, w: ne.edge.w, u: startId, v: ne.node.id });
    }

    // Step 2: Frontier
    steps.push({
      type: 'frontier',
      edgeId: null,
      line: 2,
      treeNodes: treeNodes.slice(),
      treeEdges: treeEdges.slice(),
      frontierEdges: getFrontierEdges(),
      heapSnapshot: getHeapSnapshot(),
      total: total
    });

    // Repeat until tree has all n vertices or heap is exhausted
    while (heap.length > 0 && treeNodes.length < n) {
      var top = heapPop();

      // Lazy deletion check: if far end is already in tree, skip it!
      if (treeNodeSet.has(top.v)) {
        steps.push({
          type: 'skip',
          edgeId: top.edgeId,
          line: 5,
          treeNodes: treeNodes.slice(),
          treeEdges: treeEdges.slice(),
          frontierEdges: getFrontierEdges(),
          heapSnapshot: getHeapSnapshot(),
          total: total
        });
        continue;
      }

      // Pick edge
      var newVertex = top.v;
      treeNodeSet.add(newVertex);
      treeNodes.push(newVertex);
      treeEdges.push(top.edgeId);
      total += top.w;

      steps.push({
        type: 'pick',
        edgeId: top.edgeId,
        line: 6,
        treeNodes: treeNodes.slice(),
        treeEdges: treeEdges.slice(),
        frontierEdges: getFrontierEdges(),
        heapSnapshot: getHeapSnapshot(),
        total: total
      });

      if (treeNodes.length === n) break;

      // Push incident edges from newly added vertex to vertices outside tree
      var nbrs = graph.neighbors(newVertex);
      var pushedAny = false;
      for (var j = 0; j < nbrs.length; j++) {
        var ne = nbrs[j];
        var otherId = ne.node.id;
        if (!treeNodeSet.has(otherId)) {
          heapPush({ edgeId: ne.edge.id, w: ne.edge.w, u: newVertex, v: otherId });
          pushedAny = true;
        }
      }

      if (pushedAny) {
        steps.push({
          type: 'frontier',
          edgeId: null,
          line: 7,
          treeNodes: treeNodes.slice(),
          treeEdges: treeEdges.slice(),
          frontierEdges: getFrontierEdges(),
          heapSnapshot: getHeapSnapshot(),
          total: total
        });
      }
    }

    var isForest = treeNodes.length < n;

    // Step: done
    steps.push({
      type: 'done',
      edgeId: null,
      line: 3,
      treeNodes: treeNodes.slice(),
      treeEdges: treeEdges.slice(),
      frontierEdges: getFrontierEdges(),
      heapSnapshot: getHeapSnapshot(),
      total: total,
      forest: isForest
    });

    return steps;
  }

  /* ----------------------------------------------------------
     7. Minimum Spanning Tree (MST)
     ---------------------------------------------------------- */
  function mst(graph) {
    var kSteps = kruskalSteps(graph);
    var doneStep = kSteps[kSteps.length - 1];
    return {
      edges: doneStep.acceptedEdges.slice(),
      total: doneStep.total,
      forest: !!doneStep.forest
    };
  }

  /* ----------------------------------------------------------
     8. Cut Property Analysis
     ---------------------------------------------------------- */
  function cut(graph, nodeSetS) {
    var sSet;
    if (nodeSetS instanceof Set) {
      sSet = nodeSetS;
    } else if (Array.isArray(nodeSetS)) {
      sSet = new Set(nodeSetS.map(String));
    } else if (nodeSetS && typeof nodeSetS === 'object') {
      sSet = new Set(Object.keys(nodeSetS));
    } else {
      sSet = new Set();
    }

    var crossing = [];
    var lightest = null;
    var minWeight = Infinity;
    var tied = false;

    var edgeIter = graph._edges.values();
    for (var eit = edgeIter.next(); !eit.done; eit = edgeIter.next()) {
      var e = eit.value;
      var uIn = sSet.has(e.u);
      var vIn = sSet.has(e.v);

      if (uIn !== vIn) {
        crossing.push(e.id);
        if (e.w < minWeight) {
          minWeight = e.w;
          lightest = e.id;
          tied = false;
        } else if (e.w === minWeight) {
          tied = true;
        }
      }
    }

    return {
      crossing: crossing,
      lightest: lightest,
      tied: tied
    };
  }

  /* ----------------------------------------------------------
     9. Dijkstra & Shortest-Path Tree
     ---------------------------------------------------------- */
  function dijkstra(graph, src) {
    src = String(src);
    var dist = new Map();
    var prevEdge = new Map();

    var nIter = graph._nodes.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      dist.set(nit.value, Infinity);
    }

    if (!graph._nodes.has(src)) {
      return { dist: dist, prevEdge: prevEdge };
    }

    dist.set(src, 0);
    var visited = new Set();
    var unvisited = new Set(graph._nodes.keys());

    while (unvisited.size > 0) {
      var u = null;
      var minDist = Infinity;
      var uIter = unvisited.values();
      for (var uit = uIter.next(); !uit.done; uit = uIter.next()) {
        var d = dist.get(uit.value);
        if (d < minDist) {
          minDist = d;
          u = uit.value;
        }
      }

      if (u === null || minDist === Infinity) break;

      unvisited.delete(u);
      visited.add(u);

      var nbrs = graph.neighbors(u);
      for (var i = 0; i < nbrs.length; i++) {
        var v = nbrs[i].node.id;
        var e = nbrs[i].edge;
        if (visited.has(v)) continue;

        var alt = minDist + e.w;
        if (alt < dist.get(v)) {
          dist.set(v, alt);
          prevEdge.set(v, e.id);
        }
      }
    }

    return { dist: dist, prevEdge: prevEdge };
  }

  function shortestPathTree(graph, src) {
    var res = dijkstra(graph, src);
    var edges = [];
    var total = 0;

    var pIter = res.prevEdge.values();
    for (var pit = pIter.next(); !pit.done; pit = pIter.next()) {
      var eId = pit.value;
      edges.push(eId);
      var e = graph.edge(eId);
      if (e) total += e.w;
    }

    return { edges: edges, total: total };
  }

  /* ----------------------------------------------------------
     10. Tarjan's Bridges Algorithm
     ---------------------------------------------------------- */
  function bridges(graph, opts) {
    opts = opts || {};
    var only = opts.onlyEdges ? new Set(opts.onlyEdges) : null;
    var bridgeList = [];
    var disc = {};
    var low = {};
    var time = 0;

    var nodeIds = [];
    var nIter = graph._nodes.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      nodeIds.push(nit.value);
    }

    function dfs(u, parentEdgeId) {
      disc[u] = low[u] = ++time;
      var nbrs = graph.neighbors(u);

      for (var i = 0; i < nbrs.length; i++) {
        var e = nbrs[i].edge;
        var v = nbrs[i].node.id;

        if (only && !only.has(e.id)) continue;
        if (e.id === parentEdgeId) continue;

        if (disc[v] !== undefined) {
          low[u] = Math.min(low[u], disc[v]);
        } else {
          dfs(v, e.id);
          low[u] = Math.min(low[u], low[v]);
          if (low[v] > disc[u]) {
            bridgeList.push(e.id);
          }
        }
      }
    }

    for (var i = 0; i < nodeIds.length; i++) {
      if (disc[nodeIds[i]] === undefined) {
        dfs(nodeIds[i], null);
      }
    }

    return bridgeList;
  }

  /* ----------------------------------------------------------
     11. Enumerate Spanning Trees (Backtracking with Union-Find)
     ---------------------------------------------------------- */
  function enumerateSpanningTrees(graph, limit) {
    limit = (typeof limit === 'number') ? limit : 5000;
    var n = graph.n();
    if (n <= 1) return [];
    if (!isConnected(graph)) return [];

    var edges = [];
    var eIter = graph._edges.values();
    for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
      edges.push(eit.value);
    }

    var m = edges.length;
    if (m < n - 1) return [];

    var nodeIds = [];
    var nIter = graph._nodes.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      nodeIds.push(nit.value);
    }

    var results = [];
    var chosen = [];

    // Lightweight Disjoint-Set with undo mechanism
    var parent = {};
    var rank = {};
    for (var i = 0; i < nodeIds.length; i++) {
      parent[nodeIds[i]] = nodeIds[i];
      rank[nodeIds[i]] = 0;
    }

    function find(x) {
      while (x !== parent[x]) {
        x = parent[x];
      }
      return x;
    }

    function search(edgeIdx, chosenCount) {
      if (results.length >= limit) return;

      if (chosenCount === n - 1) {
        results.push(chosen.slice());
        return;
      }

      var remaining = m - edgeIdx;
      if (chosenCount + remaining < n - 1) {
        return; // Pruning: not enough edges left
      }

      var edge = edges[edgeIdx];
      var rootU = find(edge.u);
      var rootV = find(edge.v);

      // Branch 1: Include edge if acyclic
      if (rootU !== rootV) {
        var changedParent = null;
        var changedRank = null;

        if (rank[rootU] < rank[rootV]) {
          parent[rootU] = rootV;
          changedParent = rootU;
        } else if (rank[rootU] > rank[rootV]) {
          parent[rootV] = rootU;
          changedParent = rootV;
        } else {
          parent[rootV] = rootU;
          rank[rootU]++;
          changedParent = rootV;
          changedRank = rootU;
        }

        chosen.push(edge.id);
        search(edgeIdx + 1, chosenCount + 1);
        chosen.pop();

        // Undo union
        parent[changedParent] = changedParent;
        if (changedRank !== null) {
          rank[changedRank]--;
        }
      }

      // Branch 2: Exclude edge
      search(edgeIdx + 1, chosenCount);
    }

    search(0, 0);
    return results;
  }

  /* ----------------------------------------------------------
     12. Kirchhoff's Matrix-Tree Theorem (Exact BigInt Bareiss)
     ---------------------------------------------------------- */
  function countSpanningTrees(graph) {
    var n = graph.n();
    if (n <= 1) return 1n;
    if (!isConnected(graph)) return 0n;

    var nodeIds = [];
    var nIter = graph._nodes.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      nodeIds.push(nit.value);
    }

    var nodeIndexMap = new Map();
    for (var i = 0; i < nodeIds.length; i++) {
      nodeIndexMap.set(nodeIds[i], i);
    }

    // Size of Laplacian cofactor matrix N = n - 1 (remove last vertex)
    var N = n - 1;
    var M = [];
    for (var i = 0; i < N; i++) {
      M[i] = [];
      for (var j = 0; j < N; j++) {
        M[i][j] = 0n;
      }
    }

    // Diagonal: degrees
    for (var i = 0; i < N; i++) {
      M[i][i] = BigInt(graph.degree(nodeIds[i]));
    }

    // Off-diagonal: -1 for incident edges
    var edgeIter = graph._edges.values();
    for (var eit = edgeIter.next(); !eit.done; eit = edgeIter.next()) {
      var e = eit.value;
      var uIdx = nodeIndexMap.get(e.u);
      var vIdx = nodeIndexMap.get(e.v);
      if (uIdx < N && vIdx < N) {
        M[uIdx][vIdx] -= 1n;
        M[vIdx][uIdx] -= 1n;
      }
    }

    // Fraction-free Bareiss Gaussian elimination
    var sign = 1n;
    var prevPivot = 1n;

    for (var k = 0; k < N; k++) {
      // Find pivot
      var pivotRow = k;
      while (pivotRow < N && M[pivotRow][k] === 0n) {
        pivotRow++;
      }
      if (pivotRow === N) {
        return 0n; // Matrix is singular -> disconnected graph
      }

      if (pivotRow !== k) {
        var tmp = M[k];
        M[k] = M[pivotRow];
        M[pivotRow] = tmp;
        sign = -sign;
      }

      var pivot = M[k][k];

      for (var i = k + 1; i < N; i++) {
        for (var j = k + 1; j < N; j++) {
          var num = pivot * M[i][j] - M[i][k] * M[k][j];
          M[i][j] = num / prevPivot; // Exact integer division
        }
      }

      prevPivot = pivot;
    }

    var det = sign * M[N - 1][N - 1];
    return det < 0n ? -det : det;
  }

  /* ----------------------------------------------------------
     13. Cayley's Formula & Mesh Edges
     ---------------------------------------------------------- */
  function cayley(n) {
    if (n <= 1) return 1n;
    var bn = BigInt(n);
    return bn ** BigInt(n - 2);
  }

  function meshEdges(n) {
    if (n <= 1) return 0;
    return Math.floor(n * (n - 1) / 2);
  }

  /* ----------------------------------------------------------
     Export API onto NG.Algo (strictly matching SPEC §6)
     ---------------------------------------------------------- */
  var Algo = {
    UnionFind: UnionFind,
    components: components,
    isConnected: isConnected,
    hasCycle: hasCycle,
    isTree: isTree,
    findCycleIfAdded: findCycleIfAdded,
    pathInForest: pathInForest,
    kruskalSteps: kruskalSteps,
    primSteps: primSteps,
    mst: mst,
    cut: cut,
    dijkstra: dijkstra,
    shortestPathTree: shortestPathTree,
    bridges: bridges,
    enumerateSpanningTrees: enumerateSpanningTrees,
    countSpanningTrees: countSpanningTrees,
    cayley: cayley,
    meshEdges: meshEdges
  };

  NG.Algo = Algo;

})();
