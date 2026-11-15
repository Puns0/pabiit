/* ============================================================
   graph.js — Pure graph data structure (no DOM, no styling)
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};

  /**
   * Pure graph data model.
   * By default undirected. Enforces:
   *  - No self-loops (u !== v)
   *  - No duplicate edges between the same pair of vertices
   */
  function Graph(opts) {
    opts = opts || {};
    this.directed = !!opts.directed;
    this._nodes = new Map(); // id -> { id, label, x, y }
    this._edges = new Map(); // id -> { id, u, v, w }
    this._nodeSeq = 0;
    this._edgeSeq = 0;

    // Fast pair index for duplicate checking: key(u, v) -> edgeId
    this._pairIndex = new Map();

    if (Array.isArray(opts.nodes)) {
      for (var i = 0; i < opts.nodes.length; i++) {
        var n = opts.nodes[i];
        this.addNode(n.x, n.y, n.label, n.id);
      }
    }

    if (Array.isArray(opts.edges)) {
      for (var j = 0; j < opts.edges.length; j++) {
        var e = opts.edges[j];
        this.addEdge(e.u, e.v, e.w, e.id);
      }
    }
  }

  Graph.prototype._pairKey = function (u, v) {
    if (this.directed) {
      return u + '->' + v;
    }
    return u < v ? u + '--' + v : v + '--' + u;
  };

  /**
   * Add a node at (x, y) with optional label and optional explicit id.
   * Returns node id.
   */
  Graph.prototype.addNode = function (x, y, label, explicitId) {
    var id;
    if (explicitId !== undefined && explicitId !== null) {
      id = String(explicitId);
    } else if (label !== undefined && label !== null && !this._nodes.has(String(label))) {
      id = String(label);
    } else {
      do {
        id = 'n' + (++this._nodeSeq);
      } while (this._nodes.has(id));
    }

    var nodeObj = {
      id: id,
      label: (label !== undefined && label !== null) ? String(label) : id,
      x: typeof x === 'number' ? x : 0,
      y: typeof y === 'number' ? y : 0
    };

    this._nodes.set(id, nodeObj);
    return id;
  };

  /**
   * Remove a node and all its incident edges.
   */
  Graph.prototype.removeNode = function (id) {
    id = String(id);
    if (!this._nodes.has(id)) return false;

    // Remove all edges connected to this node
    var edgesToRemove = [];
    var edgesIter = this._edges.values();
    for (var it = edgesIter.next(); !it.done; it = edgesIter.next()) {
      var e = it.value;
      if (e.u === id || e.v === id) {
        edgesToRemove.push(e.id);
      }
    }

    for (var i = 0; i < edgesToRemove.length; i++) {
      this.removeEdge(edgesToRemove[i]);
    }

    this._nodes.delete(id);
    return true;
  };

  /**
   * Add an edge between u and v with optional weight w and optional explicit id.
   * Enforces no self-loops and no duplicate edges.
   * Returns edge id, or null if invalid / duplicate.
   */
  Graph.prototype.addEdge = function (u, v, w, explicitId) {
    u = String(u);
    v = String(v);

    // Rule 1: No self-loops
    if (u === v) return null;

    // Verify endpoints exist
    if (!this._nodes.has(u) || !this._nodes.has(v)) {
      return null;
    }

    // Rule 2: No duplicate edges
    var pKey = this._pairKey(u, v);
    if (this._pairIndex.has(pKey)) {
      return null; // Duplicate edge rejected
    }

    var id;
    if (explicitId !== undefined && explicitId !== null) {
      id = String(explicitId);
    } else {
      // Default id format: e.g. 'u+v' if single letters or 'u_v'
      var defaultCandidate = u + v;
      if (!this._edges.has(defaultCandidate)) {
        id = defaultCandidate;
      } else {
        do {
          id = 'e' + (++this._edgeSeq);
        } while (this._edges.has(id));
      }
    }

    var weight = (typeof w === 'number' && !isNaN(w)) ? w : 1;

    var edgeObj = {
      id: id,
      u: u,
      v: v,
      w: weight
    };

    this._edges.set(id, edgeObj);
    this._pairIndex.set(pKey, id);
    return id;
  };

  /**
   * Remove an edge by its id.
   */
  Graph.prototype.removeEdge = function (id) {
    id = String(id);
    var e = this._edges.get(id);
    if (!e) return false;

    var pKey = this._pairKey(e.u, e.v);
    this._pairIndex.delete(pKey);
    this._edges.delete(id);
    return true;
  };

  /**
   * Set the weight of an existing edge.
   */
  Graph.prototype.setWeight = function (id, w) {
    id = String(id);
    var e = this._edges.get(id);
    if (!e) return false;
    e.w = (typeof w === 'number' && !isNaN(w)) ? w : 1;
    return true;
  };

  /**
   * Move a node to new coordinates.
   */
  Graph.prototype.moveNode = function (id, x, y) {
    id = String(id);
    var n = this._nodes.get(id);
    if (!n) return false;
    n.x = x;
    n.y = y;
    return true;
  };

  /**
   * Retrieve edge object by id.
   */
  Graph.prototype.edge = function (id) {
    return this._edges.get(String(id)) || null;
  };

  /**
   * Retrieve node object by id.
   */
  Graph.prototype.node = function (id) {
    return this._nodes.get(String(id)) || null;
  };

  /**
   * Return array of incident neighbors: [{ node: nodeObj, edge: edgeObj }]
   */
  Graph.prototype.neighbors = function (id) {
    id = String(id);
    var res = [];
    if (!this._nodes.has(id)) return res;

    var edgesIter = this._edges.values();
    for (var it = edgesIter.next(); !it.done; it = edgesIter.next()) {
      var e = it.value;
      if (e.u === id) {
        var nv = this._nodes.get(e.v);
        if (nv) res.push({ node: nv, edge: e });
      } else if (!this.directed && e.v === id) {
        var nu = this._nodes.get(e.u);
        if (nu) res.push({ node: nu, edge: e });
      }
    }
    return res;
  };

  /**
   * Return degree of node (number of incident edges).
   */
  Graph.prototype.degree = function (id) {
    id = String(id);
    var deg = 0;
    var edgesIter = this._edges.values();
    for (var it = edgesIter.next(); !it.done; it = edgesIter.next()) {
      var e = it.value;
      if (e.u === id || (!this.directed && e.v === id)) {
        deg++;
      }
    }
    return deg;
  };

  /**
   * Number of vertices |V|.
   */
  Graph.prototype.n = function () {
    return this._nodes.size;
  };

  /**
   * Number of edges |E|.
   */
  Graph.prototype.m = function () {
    return this._edges.size;
  };

  /**
   * Deep copy the graph.
   */
  Graph.prototype.clone = function () {
    var raw = this.toJSON();
    return new Graph(raw);
  };

  /**
   * Serialize graph to plain JSON object.
   */
  Graph.prototype.toJSON = function () {
    var nodes = [];
    var edges = [];

    var nIter = this._nodes.values();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      var n = nit.value;
      nodes.push({ id: n.id, label: n.label, x: n.x, y: n.y });
    }

    var eIter = this._edges.values();
    for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
      var e = eit.value;
      edges.push({ id: e.id, u: e.u, v: e.v, w: e.w });
    }

    return {
      nodes: nodes,
      edges: edges,
      directed: this.directed
    };
  };

  /**
   * Populate graph from JSON object.
   */
  Graph.prototype.fromJSON = function (data) {
    this._nodes.clear();
    this._edges.clear();
    this._pairIndex.clear();
    this.directed = !!data.directed;

    if (Array.isArray(data.nodes)) {
      for (var i = 0; i < data.nodes.length; i++) {
        var n = data.nodes[i];
        this.addNode(n.x, n.y, n.label, n.id);
      }
    }

    if (Array.isArray(data.edges)) {
      for (var j = 0; j < data.edges.length; j++) {
        var e = data.edges[j];
        this.addEdge(e.u, e.v, e.w, e.id);
      }
    }
    return this;
  };

  /**
   * Static factory to create graph from JSON.
   */
  Graph.fromJSON = function (data) {
    return new Graph(data);
  };

  /**
   * Compute Euclidean distance between two nodes (by id or node object).
   */
  Graph.prototype.euclid = function (u, v) {
    var nu = (typeof u === 'object' && u !== null) ? u : this.node(u);
    var nv = (typeof v === 'object' && v !== null) ? v : this.node(v);
    if (!nu || !nv) return 0;
    var dx = nu.x - nv.x;
    var dy = nu.y - nv.y;
    return Math.hypot(dx, dy);
  };

  NG.Graph = Graph;

})();
