/**
 * js/core/stp-model.js
 * Spanning Tree Protocol (IEEE 802.1D) Model and BPDU Simulator.
 *
 * PURE LOGIC — NO DOM, NO STYLES.
 * Conforms to SPEC Section 6 and Section 9.
 *
 * TICK SEMANTICS & PROTOCOL OVERVIEW:
 * -----------------------------------
 * 1. Bridge ID:
 *    A tuple (priority, mac). Priority defaults to 32768 (configurable in steps of 4096).
 *    MAC is a 6-byte hexadecimal string (e.g. "00:1A:2B:00:00:01").
 *    Comparison: Priority is compared first (numeric ascending, lower wins).
 *    If priorities tie, MAC is compared lexicographically (string ascending, lower wins).
 *
 * 2. Root Election & Shortest Paths (computeAnalytic):
 *    - In each connected component formed by non-failed links, the switch with the
 *      lowest Bridge ID is elected as the Root Bridge.
 *    - Path costs from the root to all other switches are computed via Dijkstra's algorithm.
 *    - Root Port of non-root switch u: the port on the link providing the lowest path cost
 *      to the root. Tie-breaks: 1) lower neighbor Bridge ID, 2) lower link ID.
 *    - Designated Port per link (u, v): designated for the endpoint with lower path cost
 *      to root. Tie-break: lower Bridge ID.
 *    - Blocked Ports: any port that is neither a Root Port nor a Designated Port is BLOCKED.
 *    - Active Links: links where neither end is blocked (i.e. one end is Designated and
 *      the other end is a Root Port).
 *
 * 3. Distributed BPDU Simulator (BPDUSimulator):
 *    - BPDU: { rootId, costToRoot, senderId, senderLinkId }
 *    - Initial state: each switch considers itself root (cost 0, rootPort null).
 *    - Synchronous discrete ticks (one tick = one hop):
 *      Phase A (Transmission): Switches transmit BPDUs out of non-failed links where
 *        they are designated (or not-yet-decided).
 *      Phase B (Arrival): Messages arrive at neighbors. The received vector cost
 *        increases by the link cost at the receiver.
 *      Phase C (Evaluation): Each switch updates its best path to root among its
 *        connected non-failed ports and self. Port roles (designated, root, blocked) update.
 *      Phase D (Convergence): When a tick produces 0 state changes across all switches,
 *        converged() becomes true. State exactly matches computeAnalytic.
 *
 * 4. Aggregated Frame Flooding Model (FrameFlooding):
 *    - State: inFlight[directedLinkId] (copies currently in transit along that directed link).
 *    - Host injects 1 frame into switch S1 (or specified switch), which sends 1 copy out
 *      each of its active links.
 *    - Tick (1 hop):
 *      1. Arriving frames are added to destination switch's totalDelivered[v].
 *      2. Switch v forwards incoming copies out of EVERY active link connected to v EXCEPT
 *         the link the frame arrived on.
 *      3. All counters are clamped at 1e12 ("> 1 trillion").
 *    - With STP OFF: copies multiply exponentially (broadcast storm).
 *    - With STP ON: each switch receives exactly 1 copy; in-flight reaches 0 in <= diameter hops.
 */

(function () {
  'use strict';

  window.NG = window.NG || {};

  var NG = window.NG;

  /* ================================================================
     1. DATA CONSTRUCTORS & COMPARATORS
     ================================================================ */

  /**
   * Switch constructor.
   * @param {string|object} id - Switch ID (e.g. 'S1') or options object.
   * @param {string} [name] - Human-readable label (e.g. 'Switch 1').
   * @param {number} [priority=32768] - STP priority (default 32768).
   * @param {string} [mac='00:00:00:00:00:00'] - MAC address string.
   * @param {number} [x=0] - X coordinate in viewBox.
   * @param {number} [y=0] - Y coordinate in viewBox.
   */
  function Switch(id, name, priority, mac, x, y) {
    if (typeof id === 'object' && id !== null) {
      var opts = id;
      this.id = String(opts.id);
      this.name = opts.name ? String(opts.name) : this.id;
      this.priority = typeof opts.priority === 'number' ? opts.priority : 32768;
      this.mac = opts.mac ? String(opts.mac) : '00:00:00:00:00:00';
      this.x = typeof opts.x === 'number' ? opts.x : 0;
      this.y = typeof opts.y === 'number' ? opts.y : 0;
    } else {
      this.id = String(id);
      this.name = name ? String(name) : this.id;
      this.priority = typeof priority === 'number' ? priority : 32768;
      this.mac = mac ? String(mac) : '00:00:00:00:00:00';
      this.x = typeof x === 'number' ? x : 0;
      this.y = typeof y === 'number' ? y : 0;
    }
  }

  /**
   * Link constructor.
   * @param {string|object} id - Link ID (e.g. 'L12') or options object.
   * @param {string} [a] - Endpoint A switch ID.
   * @param {string} [b] - Endpoint B switch ID.
   * @param {number} [cost=19] - STP link cost (e.g. 4 for 1 Gbps, 19 for 100 Mbps).
   * @param {boolean} [failed=false] - Whether link is currently failed / cut.
   */
  function Link(id, a, b, cost, failed) {
    if (typeof id === 'object' && id !== null) {
      var opts = id;
      this.id = String(opts.id);
      this.a = String(opts.a);
      this.b = String(opts.b);
      this.cost = typeof opts.cost === 'number' ? opts.cost : 19;
      this.failed = !!opts.failed;
    } else {
      this.id = String(id);
      this.a = String(a);
      this.b = String(b);
      this.cost = typeof cost === 'number' ? cost : 19;
      this.failed = !!failed;
    }
  }

  /**
   * Compare two Bridge IDs.
   * Priority is compared first (numeric ascending, lower wins).
   * If priority ties, MAC is compared lexicographically (string ascending, lower wins).
   * @param {object} a - Switch or Bridge ID { priority, mac }.
   * @param {object} b - Switch or Bridge ID { priority, mac }.
   * @returns {number} Negative if a < b, 0 if a == b, positive if a > b.
   */
  function compareBridgeId(a, b) {
    var pA = (a && typeof a.priority === 'number') ? a.priority : 32768;
    var pB = (b && typeof b.priority === 'number') ? b.priority : 32768;
    if (pA !== pB) return pA - pB;

    var mA = String((a && (a.mac || a.id)) || '');
    var mB = String((b && (b.mac || b.id)) || '');
    if (mA < mB) return -1;
    if (mA > mB) return 1;
    return 0;
  }

  /**
   * Compare two STP path vectors.
   * Vector: { rootId, cost, senderId, linkId }
   * 1. Root Bridge ID (lower wins)
   * 2. Path cost to root (lower wins)
   * 3. Sender Bridge ID (lower wins)
   * 4. Sender Link ID (lexicographic ascending, lower wins)
   */
  function compareVectors(v1, v2, switchMap) {
    var r1 = switchMap[v1.rootId];
    var r2 = switchMap[v2.rootId];
    var cmpRoot = compareBridgeId(r1, r2);
    if (cmpRoot !== 0) return cmpRoot;

    if (v1.cost !== v2.cost) return v1.cost - v2.cost;

    var s1 = switchMap[v1.senderId];
    var s2 = switchMap[v2.senderId];
    var cmpSender = compareBridgeId(s1, s2);
    if (cmpSender !== 0) return cmpSender;

    var l1 = String(v1.linkId || '');
    var l2 = String(v2.linkId || '');
    if (l1 < l2) return -1;
    if (l1 > l2) return 1;
    return 0;
  }

  /* ================================================================
     2. ANALYTIC COMPUTATION (computeAnalytic)
     ================================================================ */

  /**
   * Compute exact IEEE 802.1D Spanning Tree Protocol state analytically.
   * Handles arbitrary connected or disconnected topologies with failed links.
   *
   * @param {Array<Switch>} switches
   * @param {Array<Link>} links
   * @returns {object} {
   *   root: string,                // Overall primary root ID
   *   roots: Array<string>,        // Roots for each connected component
   *   rootPortLink: object,        // switchId -> linkId (or null for roots)
   *   pathCost: object,            // switchId -> cost to component root
   *   designated: Array<{linkId, switchId}>, // Designated port per non-failed link
   *   blocked: Array<{linkId, switchId}>,    // Blocked port per non-failed link
   *   activeLinks: Array<string>   // Links with no blocked ports
   * }
   */
  function computeAnalytic(switches, links) {
    var switchMap = {};
    for (var i = 0; i < switches.length; i++) {
      switchMap[switches[i].id] = switches[i];
    }

    var adj = {};
    for (var j = 0; j < switches.length; j++) {
      adj[switches[j].id] = [];
    }

    for (var k = 0; k < links.length; k++) {
      var link = links[k];
      if (!link.failed && switchMap[link.a] && switchMap[link.b]) {
        adj[link.a].push({ to: link.b, link: link });
        adj[link.b].push({ to: link.a, link: link });
      }
    }

    // Identify connected components over non-failed links
    var visited = {};
    var components = [];
    for (var sIdx = 0; sIdx < switches.length; sIdx++) {
      var sId = switches[sIdx].id;
      if (!visited[sId]) {
        var comp = [];
        var queue = [sId];
        visited[sId] = true;
        while (queue.length > 0) {
          var u = queue.shift();
          comp.push(u);
          var neighbors = adj[u];
          for (var nIdx = 0; nIdx < neighbors.length; nIdx++) {
            var v = neighbors[nIdx].to;
            if (!visited[v]) {
              visited[v] = true;
              queue.push(v);
            }
          }
        }
        components.push(comp);
      }
    }

    var roots = [];
    var rootPortLink = {};
    var pathCost = {};
    var designated = [];
    var blocked = [];
    var activeLinks = [];

    // Solve STP for each connected component
    for (var cIdx = 0; cIdx < components.length; cIdx++) {
      var compNodes = components[cIdx];

      // Elect root: lowest Bridge ID in component
      var compRoot = switchMap[compNodes[0]];
      for (var cNodeIdx = 1; cNodeIdx < compNodes.length; cNodeIdx++) {
        var candSwitch = switchMap[compNodes[cNodeIdx]];
        if (compareBridgeId(candSwitch, compRoot) < 0) {
          compRoot = candSwitch;
        }
      }
      roots.push(compRoot.id);

      // Dijkstra from compRoot over non-failed links
      var dist = {};
      var unvisited = {};
      for (var dIdx = 0; dIdx < compNodes.length; dIdx++) {
        var node = compNodes[dIdx];
        dist[node] = Infinity;
        unvisited[node] = true;
      }
      dist[compRoot.id] = 0;

      var unvisitedCount = compNodes.length;
      while (unvisitedCount > 0) {
        var uBest = null;
        var minD = Infinity;
        for (var uKey in unvisited) {
          if (dist[uKey] < minD) {
            minD = dist[uKey];
            uBest = uKey;
          }
        }
        if (uBest === null || minD === Infinity) break;
        delete unvisited[uBest];
        unvisitedCount--;

        var uNeighbors = adj[uBest];
        for (var unIdx = 0; unIdx < uNeighbors.length; unIdx++) {
          var nbr = uNeighbors[unIdx];
          var vId = nbr.to;
          if (unvisited[vId]) {
            var alt = dist[uBest] + nbr.link.cost;
            if (alt < dist[vId]) {
              dist[vId] = alt;
            }
          }
        }
      }

      for (var pcIdx = 0; pcIdx < compNodes.length; pcIdx++) {
        var cId = compNodes[pcIdx];
        pathCost[cId] = dist[cId];
      }
      rootPortLink[compRoot.id] = null;

      // Determine Root Port for each non-root switch in component
      for (var rpIdx = 0; rpIdx < compNodes.length; rpIdx++) {
        var swId = compNodes[rpIdx];
        if (swId === compRoot.id) continue;

        var bestLink = null;
        var bestPathCost = Infinity;
        var bestNeighbor = null;

        var swEdges = adj[swId];
        for (var eIdx = 0; eIdx < swEdges.length; eIdx++) {
          var edge = swEdges[eIdx];
          var nbrId = edge.to;
          var totalCostThroughLink = dist[nbrId] + edge.link.cost;

          if (totalCostThroughLink < bestPathCost) {
            bestPathCost = totalCostThroughLink;
            bestLink = edge.link;
            bestNeighbor = switchMap[nbrId];
          } else if (totalCostThroughLink === bestPathCost) {
            // Tie-break 1: lower neighbor Bridge ID
            var cmpNbr = compareBridgeId(switchMap[nbrId], bestNeighbor);
            if (cmpNbr < 0) {
              bestPathCost = totalCostThroughLink;
              bestLink = edge.link;
              bestNeighbor = switchMap[nbrId];
            } else if (cmpNbr === 0) {
              // Tie-break 2: lower link ID
              if (String(edge.link.id).localeCompare(String(bestLink.id)) < 0) {
                bestLink = edge.link;
                bestNeighbor = switchMap[nbrId];
              }
            }
          }
        }
        rootPortLink[swId] = bestLink ? bestLink.id : null;
      }
    }

    // Global primary root: lowest Bridge ID across all switches
    var overallRoot = switches.length > 0 ? switches[0] : null;
    for (var orIdx = 1; orIdx < switches.length; orIdx++) {
      if (compareBridgeId(switches[orIdx], overallRoot) < 0) {
        overallRoot = switches[orIdx];
      }
    }

    // Determine Designated and Blocked ports for each non-failed link
    for (var lIdx = 0; lIdx < links.length; lIdx++) {
      var l = links[lIdx];
      if (l.failed) continue;

      var swA = switchMap[l.a];
      var swB = switchMap[l.b];
      if (!swA || !swB) continue;

      var costA = pathCost[swA.id];
      var costB = pathCost[swB.id];

      var desSwitch, otherSwitch;
      if (costA < costB) {
        desSwitch = swA;
        otherSwitch = swB;
      } else if (costB < costA) {
        desSwitch = swB;
        otherSwitch = swA;
      } else {
        // Tie-break: endpoint with lower Bridge ID
        if (compareBridgeId(swA, swB) < 0) {
          desSwitch = swA;
          otherSwitch = swB;
        } else {
          desSwitch = swB;
          otherSwitch = swA;
        }
      }

      designated.push({ linkId: l.id, switchId: desSwitch.id });

      // If other endpoint's root port is this link, it is Root Port (forwarding).
      // Otherwise it is BLOCKED.
      if (rootPortLink[otherSwitch.id] === l.id) {
        activeLinks.push(l.id);
      } else {
        blocked.push({ linkId: l.id, switchId: otherSwitch.id });
      }
    }

    return {
      root: overallRoot ? overallRoot.id : null,
      roots: roots,
      rootPortLink: rootPortLink,
      pathCost: pathCost,
      designated: designated,
      blocked: blocked,
      activeLinks: activeLinks
    };
  }

  /* ================================================================
     3. DEFAULT TOPOLOGY (Slide 13)
     ================================================================ */

  /**
   * Returns the canonical 6-switch STP topology for Slide 13.
   *
   * Network Architecture:
   * - 6 switches S1..S6 configured in a ring with 2 cross-links (S1-S4 and S2-S5),
   *   making 8 links total.
   * - Default priorities: 32768 for all switches.
   * - MAC addresses: "00:1A:2B:00:00:01" through "00:1A:2B:00:00:06".
   *   S1 has the lowest MAC address, so S1 is elected root.
   *
   * Chosen Link Costs {4, 19}:
   * - Ring links:
   *     L12: S1-S2, cost 4
   *     L23: S2-S3, cost 4
   *     L34: S3-S4, cost 19
   *     L45: S4-S5, cost 4
   *     L56: S5-S6, cost 19
   *     L61: S6-S1, cost 4
   * - Cross links:
   *     L14: S1-S4, cost 19
   *     L25: S2-S5, cost 4
   *
   * Mathematical Path Costs from Root S1:
   * - S1: cost 0
   * - S2: cost 4 (via L12)
   * - S6: cost 4 (via L61)
   * - S3: cost 8 (via L12 -> L23)
   * - S5: cost 8 (via L12 -> L25)
   * - S4: cost 12 (via L12 -> L25 -> L45, beating direct L14=19 and L34=27)
   *
   * Result:
   * - Active Tree Links (5): L12, L61, L23, L25, L45. (Exactly n - 1 = 5).
   * - Blocked Links (3): L14, L34, L56. (Exactly 8 - 5 = 3).
   * - Blocked Ports: S4 on L14, S4 on L34, S5 on L56.
   * - Completely tie-free unique shortest-path tree!
   *
   * @returns {{ switches: Array<Switch>, links: Array<Link> }}
   */
  function defaultTopology() {
    var switches = [
      new Switch({ id: 'S1', name: 'Switch 1', priority: 32768, mac: '00:1A:2B:00:00:01', x: 220, y: 110 }),
      new Switch({ id: 'S2', name: 'Switch 2', priority: 32768, mac: '00:1A:2B:00:00:02', x: 580, y: 110 }),
      new Switch({ id: 'S3', name: 'Switch 3', priority: 32768, mac: '00:1A:2B:00:00:03', x: 700, y: 260 }),
      new Switch({ id: 'S4', name: 'Switch 4', priority: 32768, mac: '00:1A:2B:00:00:04', x: 580, y: 410 }),
      new Switch({ id: 'S5', name: 'Switch 5', priority: 32768, mac: '00:1A:2B:00:00:05', x: 220, y: 410 }),
      new Switch({ id: 'S6', name: 'Switch 6', priority: 32768, mac: '00:1A:2B:00:00:06', x: 100, y: 260 })
    ];

    var links = [
      new Link({ id: 'L12', a: 'S1', b: 'S2', cost: 4, failed: false }),
      new Link({ id: 'L23', a: 'S2', b: 'S3', cost: 4, failed: false }),
      new Link({ id: 'L34', a: 'S3', b: 'S4', cost: 19, failed: false }),
      new Link({ id: 'L45', a: 'S4', b: 'S5', cost: 4, failed: false }),
      new Link({ id: 'L56', a: 'S5', b: 'S6', cost: 19, failed: false }),
      new Link({ id: 'L61', a: 'S6', b: 'S1', cost: 4, failed: false }),
      new Link({ id: 'L14', a: 'S1', b: 'S4', cost: 19, failed: false }),
      new Link({ id: 'L25', a: 'S2', b: 'S5', cost: 4, failed: false })
    ];

    return { switches: switches, links: links };
  }

  /* ================================================================
     4. BPDU SIMULATOR (BPDUSimulator)
     ================================================================ */

  /**
   * Discrete-tick message-passing BPDU simulator.
   * Simulates IEEE 802.1D STP convergence hop-by-hop.
   *
   * @param {Array<Switch>} switches
   * @param {Array<Link>} links
   */
  function BPDUSimulator(switches, links) {
    this.switches = switches;
    this.links = links;
    this.switchMap = {};
    for (var i = 0; i < switches.length; i++) {
      this.switchMap[switches[i].id] = switches[i];
    }
    this.linkMap = {};
    for (var j = 0; j < links.length; j++) {
      this.linkMap[links[j].id] = links[j];
    }

    this._buildAdj();
    this.reset();
  }

  BPDUSimulator.prototype._buildAdj = function () {
    this.adj = {};
    for (var i = 0; i < this.switches.length; i++) {
      this.adj[this.switches[i].id] = [];
    }
    for (var j = 0; j < this.links.length; j++) {
      var l = this.links[j];
      if (this.switchMap[l.a] && this.switchMap[l.b]) {
        this.adj[l.a].push({ to: l.b, link: l });
        this.adj[l.b].push({ to: l.a, link: l });
      }
    }
  };

  /**
   * Reset simulation state. Every switch claims itself as root.
   */
  BPDUSimulator.prototype.reset = function () {
    this.state = {};
    for (var i = 0; i < this.switches.length; i++) {
      var s = this.switches[i];
      this.state[s.id] = {
        rootId: s.id,
        costToRoot: 0,
        rootPortId: null,
        portRoles: {}, // linkId -> 'designated' | 'root' | 'blocked'
        portBpdus: {}  // linkId -> last received BPDU
      };

      var edges = this.adj[s.id] || [];
      for (var eIdx = 0; eIdx < edges.length; eIdx++) {
        var lId = edges[eIdx].link.id;
        this.state[s.id].portRoles[lId] = edges[eIdx].link.failed ? 'blocked' : 'designated';
      }
    }

    this.tickCount = 0;
    this._converged = false;
  };

  /**
   * Cut a link (mark failed) and reset simulation to trigger re-election.
   */
  BPDUSimulator.prototype.cutLink = function (linkId) {
    var l = this.linkMap[linkId];
    if (l) {
      l.failed = true;
      this.reset();
    }
  };

  /**
   * Repair a link (unmark failed) and reset simulation.
   */
  BPDUSimulator.prototype.repairLink = function (linkId) {
    var l = this.linkMap[linkId];
    if (l) {
      l.failed = false;
      this.reset();
    }
  };

  /**
   * Set switch priority and reset simulation.
   */
  BPDUSimulator.prototype.setPriority = function (switchId, priority) {
    var s = this.switchMap[switchId];
    if (s) {
      s.priority = priority;
      this.reset();
    }
  };

  /**
   * Whether the simulator has converged to steady state.
   */
  BPDUSimulator.prototype.converged = function () {
    return this._converged;
  };

  /**
   * Advance simulation by one tick.
   * @returns {object} { tick, events, updates, converged }
   */
  BPDUSimulator.prototype.step = function () {
    if (this._converged) {
      return { tick: this.tickCount, events: [], updates: [], converged: true };
    }

    this.tickCount++;
    var events = [];
    var messages = [];

    // 1. Transmit BPDUs out of designated ports on non-failed links
    for (var i = 0; i < this.switches.length; i++) {
      var s = this.switches[i];
      var st = this.state[s.id];
      var edges = this.adj[s.id] || [];

      for (var eIdx = 0; eIdx < edges.length; eIdx++) {
        var edge = edges[eIdx];
        var l = edge.link;
        if (l.failed) continue;

        if (st.portRoles[l.id] === 'designated') {
          var bpdu = {
            rootId: st.rootId,
            costToRoot: st.costToRoot,
            senderId: s.id,
            senderLinkId: l.id
          };
          messages.push({ from: s.id, to: edge.to, linkId: l.id, bpdu: bpdu });
          events.push({ type: 'bpdu', from: s.id, to: edge.to, linkId: l.id, bpdu: bpdu });
        }
      }
    }

    // 2. Deliver BPDUs to neighbors
    for (var mIdx = 0; mIdx < messages.length; mIdx++) {
      var msg = messages[mIdx];
      var toState = this.state[msg.to];
      if (toState) {
        toState.portBpdus[msg.linkId] = msg.bpdu;
      }
    }

    // 3. Process incoming BPDUs and update switch state
    var anyChanged = false;
    var updates = [];

    for (var sIdx = 0; sIdx < this.switches.length; sIdx++) {
      var sw = this.switches[sIdx];
      var swState = this.state[sw.id];
      var oldRoot = swState.rootId;
      var oldCost = swState.costToRoot;
      var oldRootPort = swState.rootPortId;

      // Candidate 0: self as root
      var bestVec = { rootId: sw.id, cost: 0, senderId: sw.id, linkId: null };

      // Evaluate candidates from all non-failed ports
      var swEdges = this.adj[sw.id] || [];
      for (var seIdx = 0; seIdx < swEdges.length; seIdx++) {
        var e = swEdges[seIdx];
        var linkObj = e.link;
        if (linkObj.failed) continue;

        var recBpdu = swState.portBpdus[linkObj.id];
        if (recBpdu) {
          var candVec = {
            rootId: recBpdu.rootId,
            cost: recBpdu.costToRoot + linkObj.cost,
            senderId: recBpdu.senderId,
            linkId: linkObj.id
          };
          if (compareVectors(candVec, bestVec, this.switchMap) < 0) {
            bestVec = candVec;
          }
        }
      }

      swState.rootId = bestVec.rootId;
      swState.costToRoot = bestVec.cost;
      swState.rootPortId = bestVec.linkId;

      // Update port roles
      for (var peIdx = 0; peIdx < swEdges.length; peIdx++) {
        var pEdge = swEdges[peIdx];
        var pLink = pEdge.link;
        var pId = pLink.id;

        if (pLink.failed) {
          swState.portRoles[pId] = 'blocked';
          continue;
        }

        var portBpdu = swState.portBpdus[pId];
        if (!portBpdu) {
          swState.portRoles[pId] = 'designated';
          continue;
        }

        var myOutVec = {
          rootId: swState.rootId,
          cost: swState.costToRoot,
          senderId: sw.id,
          linkId: pId
        };
        var nbrVec = {
          rootId: portBpdu.rootId,
          cost: portBpdu.costToRoot,
          senderId: portBpdu.senderId,
          linkId: portBpdu.senderLinkId
        };

        var cmp = compareVectors(myOutVec, nbrVec, this.switchMap);
        if (cmp < 0) {
          swState.portRoles[pId] = 'designated';
        } else {
          if (swState.rootPortId === pId) {
            swState.portRoles[pId] = 'root';
          } else {
            swState.portRoles[pId] = 'blocked';
          }
        }
      }

      if (swState.rootId !== oldRoot || swState.costToRoot !== oldCost || swState.rootPortId !== oldRootPort) {
        anyChanged = true;
        var logText = swState.rootId === sw.id
          ? sw.id + ' considers itself Root Bridge (priority ' + sw.priority + ')'
          : sw.id + ' hears a better root: ' + swState.rootId + ' (cost ' + swState.costToRoot + ')';

        updates.push({
          switchId: sw.id,
          oldRoot: oldRoot,
          newRoot: swState.rootId,
          oldCost: oldCost,
          newCost: swState.costToRoot,
          oldRootPort: oldRootPort,
          newRootPort: swState.rootPortId,
          text: logText
        });
      }
    }

    if (!anyChanged && this.tickCount > 1) {
      this._converged = true;
    }

    return {
      tick: this.tickCount,
      events: events,
      updates: updates,
      converged: this._converged
    };
  };

  /**
   * Run simulation until converged or maxTicks reached.
   * @param {number} [maxTicks=100]
   * @returns {number} Ticks taken.
   */
  BPDUSimulator.prototype.runToConvergence = function (maxTicks) {
    var limit = typeof maxTicks === 'number' ? maxTicks : 100;
    while (!this._converged && this.tickCount < limit) {
      this.step();
    }
    return this.tickCount;
  };

  /**
   * Return a snapshot of the current state.
   */
  BPDUSimulator.prototype.getState = function () {
    var copy = {};
    for (var k in this.state) {
      var s = this.state[k];
      copy[k] = {
        rootId: s.rootId,
        costToRoot: s.costToRoot,
        rootPortId: s.rootPortId,
        portRoles: Object.assign({}, s.portRoles)
      };
    }
    return copy;
  };

  /* ================================================================
     5. AGGREGATED FRAME FLOODING MODEL (FrameFlooding)
     ================================================================ */

  var MAX_COUNTER = 1e12; // 1 trillion clamp for display

  /**
   * Frame flooding simulator tracking aggregated frame counts without per-frame objects.
   *
   * @param {Array<Switch>} switches
   * @param {Array<Link>} links
   * @param {Array<string>} [activeLinkIds] - IDs of forwarding links. If omitted, all non-failed links.
   */
  function FrameFlooding(switches, links, activeLinkIds) {
    this.switches = switches;
    this.links = links;
    this.switchMap = {};
    for (var i = 0; i < switches.length; i++) {
      this.switchMap[switches[i].id] = switches[i];
    }
    this.linkMap = {};
    for (var j = 0; j < links.length; j++) {
      this.linkMap[links[j].id] = links[j];
    }

    this.setActiveLinks(activeLinkIds || links.map(function (l) { return l.id; }));
    this.reset();
  }

  FrameFlooding.prototype.setActiveLinks = function (activeLinkIds) {
    this.activeSet = {};
    if (Array.isArray(activeLinkIds)) {
      for (var i = 0; i < activeLinkIds.length; i++) {
        this.activeSet[activeLinkIds[i]] = true;
      }
    }
  };

  FrameFlooding.prototype.reset = function () {
    this.inFlight = {}; // key: 'linkId:from->to' -> count
    this.totalDelivered = {};
    for (var i = 0; i < this.switches.length; i++) {
      this.totalDelivered[this.switches[i].id] = 0;
    }
    this.ticks = 0;
  };

  /**
   * Inject 1 frame at specified switch (default 'S1').
   * Switch sends 1 copy out each of its active links.
   */
  FrameFlooding.prototype.injectFrame = function (switchId) {
    var src = switchId || (this.switches[0] ? this.switches[0].id : 'S1');
    this.reset();
    this.totalDelivered[src] = 1;

    for (var i = 0; i < this.links.length; i++) {
      var l = this.links[i];
      if (!this.activeSet[l.id] || l.failed) continue;

      if (l.a === src) {
        var k1 = l.id + ':' + l.a + '->' + l.b;
        this.inFlight[k1] = 1;
      } else if (l.b === src) {
        var k2 = l.id + ':' + l.b + '->' + l.a;
        this.inFlight[k2] = 1;
      }
    }

    return {
      inFlight: Object.assign({}, this.inFlight),
      totalDelivered: Object.assign({}, this.totalDelivered),
      totalInFlight: this.getTotalInFlight(),
      ticks: this.ticks
    };
  };

  /**
   * Advance frame flooding by one hop tick.
   */
  FrameFlooding.prototype.tick = function () {
    this.ticks++;
    var nextInFlight = {};
    var arrivals = 0;

    for (var key in this.inFlight) {
      var count = this.inFlight[key];
      if (!count || count <= 0) continue;

      var colonIdx = key.indexOf(':');
      var lid = key.substring(0, colonIdx);
      var dir = key.substring(colonIdx + 1).split('->');
      var v = dir[1];

      // Arrival at destination switch v
      var curDeliv = this.totalDelivered[v] || 0;
      this.totalDelivered[v] = Math.min(MAX_COUNTER, curDeliv + count);
      arrivals += count;

      // Replicate to all other active links incident to v except arriving link lid
      for (var lIdx = 0; lIdx < this.links.length; lIdx++) {
        var l = this.links[lIdx];
        if (!this.activeSet[l.id] || l.failed || l.id === lid) continue;

        var outKey = null;
        if (l.a === v) {
          outKey = l.id + ':' + l.a + '->' + l.b;
        } else if (l.b === v) {
          outKey = l.id + ':' + l.b + '->' + l.a;
        }

        if (outKey) {
          var curOut = nextInFlight[outKey] || 0;
          nextInFlight[outKey] = Math.min(MAX_COUNTER, curOut + count);
        }
      }
    }

    this.inFlight = nextInFlight;

    return {
      inFlight: Object.assign({}, this.inFlight),
      totalDelivered: Object.assign({}, this.totalDelivered),
      totalInFlight: this.getTotalInFlight(),
      arrivals: arrivals,
      ticks: this.ticks
    };
  };

  FrameFlooding.prototype.getTotalInFlight = function () {
    var sum = 0;
    for (var k in this.inFlight) {
      sum += this.inFlight[k];
    }
    return Math.min(MAX_COUNTER, sum);
  };

  FrameFlooding.prototype.getTotalDelivered = function () {
    var sum = 0;
    for (var s in this.totalDelivered) {
      sum += this.totalDelivered[s];
    }
    return Math.min(MAX_COUNTER, sum);
  };

  /* ================================================================
     6. STANDALONE HELPER FUNCTIONS
     ================================================================ */

  function cutLink(links, linkId) {
    for (var i = 0; i < links.length; i++) {
      if (links[i].id === linkId) {
        links[i].failed = true;
        return true;
      }
    }
    return false;
  }

  function repairLink(links, linkId) {
    for (var i = 0; i < links.length; i++) {
      if (links[i].id === linkId) {
        links[i].failed = false;
        return true;
      }
    }
    return false;
  }

  function setPriority(switches, switchId, priority) {
    for (var i = 0; i < switches.length; i++) {
      if (switches[i].id === switchId) {
        switches[i].priority = priority;
        return true;
      }
    }
    return false;
  }

  /* ================================================================
     EXPOSE TO GLOBAL NAMESPACE
     ================================================================ */

  NG.STP = {
    Switch: Switch,
    Link: Link,
    compareBridgeId: compareBridgeId,
    computeAnalytic: computeAnalytic,
    defaultTopology: defaultTopology,
    BPDUSimulator: BPDUSimulator,
    FrameFlooding: FrameFlooding,
    cutLink: cutLink,
    repairLink: repairLink,
    setPriority: setPriority
  };

})();
