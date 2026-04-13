// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════

let nodes     = {};   // { name: { x, y, name } }
let edges     = [];   // [ { from, to, weight } ]
let startNode = '';
let endNode   = '';
let algo      = 'astar';
let animDelay = 400;
let running   = false;

// Visual state (updated during animation)
let vizNodes = {};    // { name: { color, scale } }
let vizEdges = [];    // [ { from, to, color, width, dashed } ]

const SPEED_MAP  = { 1: 900, 2: 600, 3: 400, 4: 200, 5: 80 };
const SPEED_LABS = { 1: 'Very slow', 2: 'Slow', 3: 'Medium', 4: 'Fast', 5: 'Very fast' };

const ALGO_COLORS = {
  astar: '#4f46e5',
  bfs:   '#059669',
  dfs:   '#ea580c',
  ucs:   '#ca8a04',
};

const EXPLORE_COLOR = '#a78bfa';
const PATH_COLOR    = '#10b981';


// ══════════════════════════════════════════════════════════════
//  CANVAS SETUP
// ══════════════════════════════════════════════════════════════

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

function resize() {
  const area  = canvas.parentElement;
  const logH  = document.getElementById('step-log').offsetHeight;
  const headH = document.querySelector('.canvas-header').offsetHeight;
  canvas.width  = area.offsetWidth;
  canvas.height = area.offsetHeight - headH - logH;
}

window.addEventListener('resize', () => {
  resize();
  layoutNodes();
  draw();
});


// ══════════════════════════════════════════════════════════════
//  NODE MANAGEMENT
// ══════════════════════════════════════════════════════════════

function addNode(namePassed) {
  const inp  = document.getElementById('node-name');
  const name = (namePassed || inp.value).trim().toUpperCase();
  if (!name || nodes[name]) { inp.value = ''; return; }

  nodes[name] = { name, x: 0, y: 0 };
  inp.value   = '';

  layoutNodes();
  refreshChips();
  refreshSelects();
  draw();
}

function removeNode(name) {
  delete nodes[name];
  edges = edges.filter(e => e.from !== name && e.to !== name);
  if (startNode === name) startNode = '';
  if (endNode   === name) endNode   = '';

  layoutNodes();
  refreshChips();
  refreshSelects();
  draw();
}


// ══════════════════════════════════════════════════════════════
//  EDGE MANAGEMENT
// ══════════════════════════════════════════════════════════════

function addEdge() {
  const from = document.getElementById('edge-from').value.trim().toUpperCase();
  const to   = document.getElementById('edge-to').value.trim().toUpperCase();
  const w    = parseInt(document.getElementById('edge-w').value) || 1;

  if (!from || !to || from === to) return;

  if (!nodes[from] || !nodes[to]) {
    alert(`Node "${!nodes[from] ? from : to}" doesn't exist. Add it first.`);
    return;
  }

  // Prevent duplicate edges
  const isDuplicate = edges.find(
    e => (e.from === from && e.to === to) || (e.from === to && e.to === from)
  );
  if (isDuplicate) return;

  edges.push({ from, to, weight: w });

  document.getElementById('edge-from').value = '';
  document.getElementById('edge-to').value   = '';
  document.getElementById('edge-w').value    = '1';

  refreshChips();
  draw();
}

function removeEdge(i) {
  edges.splice(i, 1);
  refreshChips();
  draw();
}


// ══════════════════════════════════════════════════════════════
//  AUTO LAYOUT — circular arrangement
// ══════════════════════════════════════════════════════════════

function layoutNodes() {
  const names = Object.keys(nodes);
  if (!names.length) return;

  resize();

  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const r  = Math.min(canvas.width, canvas.height) * 0.35;

  names.forEach((n, i) => {
    const angle = (2 * Math.PI * i / names.length) - Math.PI / 2;
    nodes[n].x  = cx + r * Math.cos(angle);
    nodes[n].y  = cy + r * Math.sin(angle);
  });
}


// ══════════════════════════════════════════════════════════════
//  CHIPS + SELECTS (UI refresh)
// ══════════════════════════════════════════════════════════════

function refreshChips() {
  // Node chips
  const nc = document.getElementById('node-chips');
  nc.innerHTML = '';
  Object.keys(nodes).forEach(n => {
    const c = document.createElement('span');
    c.className = 'chip';
    c.innerHTML = `${n}<button class="chip-x" onclick="removeNode('${n}')">×</button>`;
    nc.appendChild(c);
  });

  // Edge chips
  const ec = document.getElementById('edge-chips');
  ec.innerHTML = '';
  edges.forEach((e, i) => {
    const c = document.createElement('span');
    c.className = 'chip';
    c.innerHTML = `${e.from}→${e.to} <span style="color:#6b7280;font-size:10px;">(${e.weight})</span>
                   <button class="chip-x" onclick="removeEdge(${i})">×</button>`;
    ec.appendChild(c);
  });
}

function refreshSelects() {
  const names = Object.keys(nodes);
  ['sel-start', 'sel-end'].forEach(id => {
    const sel = document.getElementById(id);
    const cur = sel.value;
    sel.innerHTML = '<option value="">-- pick --</option>';
    names.forEach(n => {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      if (n === cur) o.selected = true;
      sel.appendChild(o);
    });
  });
}


// ══════════════════════════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════════════════════════

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!Object.keys(nodes).length) {
    ctx.fillStyle    = '#9ca3af';
    ctx.font         = '14px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add nodes and edges using the panel on the left', canvas.width / 2, canvas.height / 2);
    return;
  }

  // ── Draw Edges ──
  edges.forEach(e => {
    const from = nodes[e.from];
    const to   = nodes[e.to];
    if (!from || !to) return;

    const ve    = vizEdges.find(v => (v.from === e.from && v.to === e.to) || (v.from === e.to && v.to === e.from));
    const color = ve ? ve.color : '#d1d5db';
    const width = ve ? ve.width : 2;

    // Line
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth   = width;
    ctx.setLineDash(ve && ve.dashed ? [6, 4] : []);
    ctx.stroke();
    ctx.setLineDash([]);

    // Weight badge
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle    = '#374151';
    ctx.font         = 'bold 10px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.weight, mx, my);

    // Arrowhead
    drawArrow(from.x, from.y, to.x, to.y, color, 22);
  });

  // ── Draw Nodes ──
  Object.values(nodes).forEach(n => {
    const vn  = vizNodes[n.name] || {};
    const col = vn.color || '#e5e7eb';
    const sc  = vn.scale || 1;
    const r   = 22 * sc;

    // Glow effect for active nodes
    ctx.shadowColor = col === '#e5e7eb' ? 'transparent' : col;
    ctx.shadowBlur  = col === '#e5e7eb' ? 0 : 12;

    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle   = col;
    ctx.fill();
    ctx.strokeStyle = darken(col);
    ctx.lineWidth   = 2.5;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Node label
    ctx.fillStyle    = col === '#e5e7eb' ? '#374151' : '#ffffff';
    ctx.font         = `bold ${r > 22 ? 14 : 13}px Inter, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.name, n.x, n.y);

    // START / GOAL label above node
    const isSt = n.name === startNode;
    const isEn = n.name === endNode;
    if (isSt || isEn) {
      ctx.fillStyle    = isSt ? '#065f46' : '#991b1b';
      ctx.font         = 'bold 9px Inter, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(isSt ? 'START' : 'GOAL', n.x, n.y - r - 7);
    }
  });
}

function drawArrow(x1, y1, x2, y2, color, nodeR) {
  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < nodeR * 2 + 5) return;

  const ux    = dx / len;
  const uy    = dy / len;
  const ex    = x2 - ux * nodeR;
  const ey    = y2 - uy * nodeR;
  const size  = 7;
  const angle = Math.atan2(ey - y1, ex - x1);

  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - size * Math.cos(angle - 0.4), ey - size * Math.sin(angle - 0.4));
  ctx.lineTo(ex - size * Math.cos(angle + 0.4), ey - size * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function darken(hex) {
  if (hex === '#e5e7eb') return '#9ca3af';
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)})`;
  } catch {
    return hex;
  }
}


// ══════════════════════════════════════════════════════════════
//  GRAPH HELPERS
// ══════════════════════════════════════════════════════════════

function getNeighbors(name) {
  const nbrs = [];
  edges.forEach(e => {
    if (e.from === name) nbrs.push({ node: e.to,   cost: e.weight });
    if (e.to   === name) nbrs.push({ node: e.from, cost: e.weight });
  });
  return nbrs;
}

// Euclidean heuristic (scaled) for A*
function heuristic(name) {
  if (!nodes[name] || !nodes[endNode]) return 0;
  const dx = nodes[name].x - nodes[endNode].x;
  const dy = nodes[name].y - nodes[endNode].y;
  return Math.sqrt(dx * dx + dy * dy) / 80;
}

function tracePath(parent, end) {
  const path = [];
  let cur = end;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = parent[cur];
  }
  return path;
}


// ══════════════════════════════════════════════════════════════
//  ALGORITHMS
//  Each returns { explored: [{node, from}], path: [names], cost }
// ══════════════════════════════════════════════════════════════

function solve() {
  const explored   = [];
  const parent     = {};
  const costSoFar  = {};

  parent[startNode]    = undefined;
  costSoFar[startNode] = 0;

  // ── BFS ──────────────────────────────────────────────────
  if (algo === 'bfs') {
    const queue   = [startNode];
    const visited = new Set([startNode]);

    while (queue.length) {
      const cur = queue.shift();
      explored.push({ node: cur, from: parent[cur] });

      if (cur === endNode) {
        return { explored, path: tracePath(parent, endNode), cost: costSoFar[endNode] };
      }

      for (const nb of getNeighbors(cur)) {
        if (!visited.has(nb.node)) {
          visited.add(nb.node);
          parent[nb.node]   = cur;
          costSoFar[nb.node] = (costSoFar[cur] || 0) + nb.cost;
          queue.push(nb.node);
        }
      }
    }

  // ── DFS ──────────────────────────────────────────────────
  } else if (algo === 'dfs') {
    const stack   = [startNode];
    const visited = new Set();

    while (stack.length) {
      const cur = stack.pop();
      if (visited.has(cur)) continue;
      visited.add(cur);
      explored.push({ node: cur, from: parent[cur] });

      if (cur === endNode) {
        return { explored, path: tracePath(parent, endNode), cost: costSoFar[endNode] };
      }

      for (const nb of getNeighbors(cur)) {
        if (!visited.has(nb.node)) {
          parent[nb.node]    = cur;
          costSoFar[nb.node] = (costSoFar[cur] || 0) + nb.cost;
          stack.push(nb.node);
        }
      }
    }

  // ── UCS ──────────────────────────────────────────────────
  } else if (algo === 'ucs') {
    const pq      = [{ node: startNode, cost: 0 }];
    const visited = new Set();

    while (pq.length) {
      pq.sort((a, b) => a.cost - b.cost);
      const { node: cur, cost: cc } = pq.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      explored.push({ node: cur, from: parent[cur] });

      if (cur === endNode) {
        return { explored, path: tracePath(parent, endNode), cost: cc };
      }

      for (const nb of getNeighbors(cur)) {
        if (!visited.has(nb.node)) {
          const nc = cc + nb.cost;
          if (costSoFar[nb.node] === undefined || nc < costSoFar[nb.node]) {
            costSoFar[nb.node] = nc;
            parent[nb.node]    = cur;
            pq.push({ node: nb.node, cost: nc });
          }
        }
      }
    }

  // ── A* ───────────────────────────────────────────────────
 } else {
    const g      = { [startNode]: 0 };
    const f      = { [startNode]: heuristic(startNode) };
    const open   = new Set([startNode]);
    const closed = new Set();

    while (open.size) {
      const cur = [...open].reduce((a, b) => (f[a] || Infinity) < (f[b] || Infinity) ? a : b);
      explored.push({ node: cur, from: parent[cur] });

      // ── store heuristic value for display ──
      if (!vizNodes[cur]) vizNodes[cur] = {};
      const gVal = g[cur] || 0;
      const hVal = parseFloat(heuristic(cur).toFixed(2));
      const fVal = parseFloat((gVal + hVal).toFixed(2));
      vizNodes[cur].sublabel = `g:${gVal} h:${hVal} f:${fVal}`;

      if (cur === endNode) {
        return { explored, path: tracePath(parent, endNode), cost: g[endNode] };
      }

      open.delete(cur);
      closed.add(cur);

      for (const nb of getNeighbors(cur)) {
        if (closed.has(nb.node)) continue;
        const tentG = (g[cur] || 0) + nb.cost;
        if (!open.has(nb.node) || tentG < (g[nb.node] || Infinity)) {
          parent[nb.node] = cur;
          g[nb.node]      = tentG;
          f[nb.node]      = tentG + heuristic(nb.node);
          open.add(nb.node);
        }
      }
    }
  }

// ══════════════════════════════════════════════════════════════
//  ANIMATION RUNNER
// ══════════════════════════════════════════════════════════════

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runAlgo() {
  startNode = document.getElementById('sel-start').value;
  endNode   = document.getElementById('sel-end').value;

  if (!startNode || !endNode) {
    alert('Please select start and goal nodes.');
    return;
  }
  if (!Object.keys(nodes).length || edges.length === 0) {
    alert('Add at least 2 nodes and 1 edge.');
    return;
  }
  if (running) return;

  clearViz();
  running = true;
  document.getElementById('run-btn').disabled = true;
  setStatus('Searching...', 'running');

  const result = solve();
  const logEl  = document.getElementById('step-log');
  logEl.innerHTML = '';

  // ── Phase 1: Animate exploration ──────────────────────────
  for (let i = 0; i < result.explored.length; i++) {
    const step = result.explored[i];
    const acol = ALGO_COLORS[algo];

    // Highlight visited node
    vizNodes[step.node] = {
      color: step.node === startNode ? '#10b981' : step.node === endNode ? '#ef4444' : acol,
      scale: 1.15,
    };
    // Shrink back after brief pop
    setTimeout(() => {
      if (vizNodes[step.node]) vizNodes[step.node].scale = 1;
      draw();
    }, 200);

    // Highlight traversed edge (dashed = exploring)
    if (step.from) {
      vizEdges.push({ from: step.from, to: step.node, color: EXPLORE_COLOR, width: 3, dashed: true });
    }

    // Add step badge to log
    const badge = document.createElement('span');
    badge.className = 'log-step current';
    badge.textContent = `${i + 1}. Visit ${step.node}${step.from ? ' from ' + step.from : ' (start)'}`;
    logEl.appendChild(badge);
    logEl.scrollLeft = logEl.scrollWidth;

    document.getElementById('stat-exp').textContent = i + 1;
    draw();
    await wait(animDelay);

    badge.className = 'log-step'; // de-highlight old badge
  }

  await wait(300);

  // ── No path found ─────────────────────────────────────────
  if (!result.path.length) {
    setStatus(`No path found between ${startNode} and ${endNode}`, 'fail');
    running = false;
    document.getElementById('run-btn').disabled = false;
    return;
  }

  // ── Phase 2: Dim explored, reveal optimal path ────────────
  vizEdges.forEach(e => { e.color = '#e9d5ff'; e.width = 2; e.dashed = false; });
  Object.keys(vizNodes).forEach(n => {
    if (n !== startNode && n !== endNode) vizNodes[n].color = '#ddd6fe';
  });
  draw();
  await wait(300);

  // Animate the optimal path in green
  for (let i = 0; i < result.path.length - 1; i++) {
    const from = result.path[i];
    const to   = result.path[i + 1];

    const existing = vizEdges.find(
      e => (e.from === from && e.to === to) || (e.from === to && e.to === from)
    );
    if (existing) {
      existing.color  = PATH_COLOR;
      existing.width  = 5;
      existing.dashed = false;
    } else {
      vizEdges.push({ from, to, color: PATH_COLOR, width: 5 });
    }

    vizNodes[to] = { ...vizNodes[to], color: to === endNode ? '#ef4444' : PATH_COLOR, scale: 1.2 };
    setTimeout(() => {
      if (vizNodes[to]) vizNodes[to].scale = 1;
      draw();
    }, 250);

    const badge = document.createElement('span');
    badge.className = 'log-step done-path';
    badge.textContent = `Path: ${from} → ${to}`;
    logEl.appendChild(badge);
    logEl.scrollLeft = logEl.scrollWidth;

    draw();
    await wait(animDelay * 0.7);
  }

  vizNodes[startNode] = { color: '#10b981', scale: 1 };
  draw();

  document.getElementById('stat-path').textContent = result.path.length;
  document.getElementById('stat-cost').textContent = result.cost === Infinity ? '∞' : result.cost;

  setStatus(`✓ Path found: ${result.path.join(' → ')}  |  Cost: ${result.cost}`, 'success');
  running = false;
  document.getElementById('run-btn').disabled = false;
}


// ══════════════════════════════════════════════════════════════
//  UI CONTROLS
// ══════════════════════════════════════════════════════════════

function pickAlgo(a) {
  if (running) return;
  algo = a;
  document.querySelectorAll('.algo-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.algo === a)
  );
}

function setSpeed(v) {
  animDelay = SPEED_MAP[v];
  document.getElementById('spdlbl').textContent = SPEED_LABS[v];
}

function setStatus(msg, cls) {
  const el = document.getElementById('status-pill');
  el.className = 'status-pill' + (cls ? ' ' + cls : '');
  document.getElementById('status-txt').textContent = msg;
}

function clearViz() {
  if (running) return;
  vizNodes = {};
  vizEdges = [];
  document.getElementById('stat-exp').textContent  = '—';
  document.getElementById('stat-path').textContent = '—';
  document.getElementById('stat-cost').textContent = '—';
  document.getElementById('step-log').innerHTML =
    '<span class="log-placeholder">Exploration steps will appear here…</span>';
  setStatus('Add nodes and edges, then run');
  draw();
}

function clearAll() {
  if (running) return;
  nodes = {}; edges = []; startNode = ''; endNode = '';
  refreshChips();
  refreshSelects();
  clearViz();
}


// ══════════════════════════════════════════════════════════════
//  PRESETS
// ══════════════════════════════════════════════════════════════

function loadPreset(name) {
  clearAll();

  const presets = {
    simple: {
      nodes: ['A', 'B', 'C', 'D', 'E'],
      edges: [
        { f: 'A', t: 'B', w: 1 },
        { f: 'A', t: 'C', w: 4 },
        { f: 'B', t: 'C', w: 2 },
        { f: 'B', t: 'D', w: 5 },
        { f: 'C', t: 'E', w: 1 },
        { f: 'D', t: 'E', w: 1 },
      ],
      start: 'A', end: 'E',
    },
    weighted: {
      nodes: ['S', 'A', 'B', 'C', 'G'],
      edges: [
        { f: 'S', t: 'A', w: 1 },
        { f: 'S', t: 'B', w: 4 },
        { f: 'A', t: 'B', w: 2 },
        { f: 'A', t: 'C', w: 5 },
        { f: 'B', t: 'C', w: 1 },
        { f: 'B', t: 'G', w: 6 },
        { f: 'C', t: 'G', w: 2 },
      ],
      start: 'S', end: 'G',
    },
    complex: {
      nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      edges: [
        { f: 'A', t: 'B', w: 2 },
        { f: 'A', t: 'C', w: 6 },
        { f: 'B', t: 'D', w: 1 },
        { f: 'B', t: 'E', w: 3 },
        { f: 'C', t: 'F', w: 2 },
        { f: 'D', t: 'G', w: 4 },
        { f: 'E', t: 'G', w: 1 },
        { f: 'F', t: 'G', w: 5 },
        { f: 'C', t: 'D', w: 3 },
        { f: 'B', t: 'F', w: 7 },
      ],
      start: 'A', end: 'G',
    },
  };

  const p = presets[name];
  if (!p) return;

  p.nodes.forEach(n => addNode(n));

  setTimeout(() => {
    p.edges.forEach(e => {
      document.getElementById('edge-from').value = e.f;
      document.getElementById('edge-to').value   = e.t;
      document.getElementById('edge-w').value    = e.w;
      addEdge();
    });
    document.getElementById('sel-start').value = p.start;
    document.getElementById('sel-end').value   = p.end;
  }, 50);
}


// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════

resize();
draw();
loadPreset('simple');
