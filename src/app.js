import { createGrid, search, randomize, ALGORITHMS, WALL, OPEN, MUD } from './algorithms.js';

const ROWS = 22, COLS = 40, CELL = 25;
const $ = (id) => document.getElementById(id);
const canvas = $('board'), ctx = canvas.getContext('2d');
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

const COLORS = {
  bg: '#0e1527', line: '#1b2540', wall: '#94a3b8', mud: '#92400e',
  frontier: '#22d3ee', visited: '#6d28d9', path: '#fde047', start: '#22c55e', goal: '#ef4444',
};
const INFO = {
  bfs: 'Explores in rings. Shortest in number of steps, but ignores mud cost.',
  dfs: 'Dives deep first. Finds a path fast, but it is usually NOT the shortest.',
  dijkstra: 'Expands the cheapest cell so far. Always optimal, even with mud.',
  astar: 'Dijkstra plus a guess toward the goal. Optimal and usually explores far less.',
  greedy: 'Only chases the goal. Very fast, but can take a bad route around walls.',
};

const at = (r, c) => r * COLS + c;
let grid = createGrid(ROWS, COLS), start = at(11, 6), goal = at(11, 33);
let overlay = new Uint8Array(ROWS * COLS); // 0 none, 1 frontier, 2 visited, 3 path
let gen = null, raf = 0, pathQ = [], visitedCount = 0, result = null;
let drag = null, paint = OPEN;

for (const [k, v] of Object.entries(ALGORITHMS)) $('algo').add(new Option(v, k));

function draw() {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = COLORS.line;
  ctx.beginPath();
  for (let c = 0; c <= COLS; c++) { ctx.moveTo(c * CELL + .5, 0); ctx.lineTo(c * CELL + .5, canvas.height); }
  for (let r = 0; r <= ROWS; r++) { ctx.moveTo(0, r * CELL + .5); ctx.lineTo(canvas.width, r * CELL + .5); }
  ctx.stroke();
  for (let id = 0; id < grid.cells.length; id++) {
    const x = (id % COLS) * CELL, y = ((id / COLS) | 0) * CELL;
    const v = grid.cells[id], o = overlay[id];
    const col = v === WALL ? COLORS.wall : o === 3 ? COLORS.path : o === 2 ? COLORS.visited
      : o === 1 ? COLORS.frontier : v === MUD ? COLORS.mud : null;
    if (col) { ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, CELL - 1, CELL - 1); }
    if (v === MUD && o) { ctx.fillStyle = COLORS.mud; ctx.fillRect(x + 9, y + 9, 8, 8); }
  }
  for (const [id, col, ch] of [[start, COLORS.start, 'S'], [goal, COLORS.goal, 'G']]) {
    const x = (id % COLS) * CELL, y = ((id / COLS) | 0) * CELL;
    ctx.fillStyle = col; ctx.fillRect(x + 1, y + 1, CELL - 1, CELL - 1);
    ctx.fillStyle = '#04121a'; ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, x + CELL / 2, y + CELL / 2 + 1);
  }
}

function setStats(status = 'Ready', res = null) {
  $('status').textContent = status;
  $('visited').textContent = res ? res.visited : visitedCount;
  $('length').textContent = res && res.found ? res.path.length : '–';
  $('cost').textContent = res && res.found ? res.cost : '–';
}

function stop() { cancelAnimationFrame(raf); gen = null; pathQ = []; }
function clearOverlay() { overlay.fill(0); visitedCount = 0; setStats(); draw(); }

function finish(res) {
  result = res;
  if (res.found) pathQ = [...res.path];
}

function tick() {
  if (gen) {
    for (let i = 0; i < +$('speed').value; i++) {
      const r = gen.next();
      if (r.done) { gen = null; finish(r.value); break; }
      overlay[r.value.id] = r.value.type === 'visit' ? 2 : 1;
      if (r.value.type === 'visit') visitedCount++;
    }
    setStats('Searching…');
  } else {
    for (let i = 0; i < 2 && pathQ.length; i++) overlay[pathQ.shift()] = 3;
  }
  draw();
  if (gen || pathQ.length) raf = requestAnimationFrame(tick);
  else setStats(result.found ? 'Path found ✔' : 'No path ✖', result);
}

function run() {
  stop(); overlay.fill(0); visitedCount = 0; result = null;
  gen = search($('algo').value, grid, start, goal);
  raf = requestAnimationFrame(tick);
}

function cellAt(e) {
  const b = canvas.getBoundingClientRect();
  const c = Math.floor(((e.clientX - b.left) / b.width) * COLS);
  const r = Math.floor(((e.clientY - b.top) / b.height) * ROWS);
  return c < 0 || r < 0 || c >= COLS || r >= ROWS ? -1 : at(r, c);
}

canvas.addEventListener('pointerdown', (e) => {
  const id = cellAt(e);
  if (id < 0) return;
  stop(); overlay.fill(0); setStats();
  canvas.setPointerCapture(e.pointerId);
  if (id === start) drag = 'start';
  else if (id === goal) drag = 'goal';
  else {
    drag = 'paint';
    const tool = $('tool').value === 'mud' ? MUD : WALL;
    paint = grid.cells[id] === tool ? OPEN : tool; // clicking an existing one erases
    grid.cells[id] = paint;
  }
  draw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const id = cellAt(e);
  if (id < 0) return;
  if (drag === 'start' && id !== goal && grid.cells[id] !== WALL) start = id;
  else if (drag === 'goal' && id !== start && grid.cells[id] !== WALL) goal = id;
  else if (drag === 'paint' && id !== start && id !== goal) grid.cells[id] = paint;
  draw();
});
for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => (drag = null));

$('run').onclick = run;
$('clearPath').onclick = () => { stop(); clearOverlay(); };
$('random').onclick = () => { stop(); randomize(grid, [start, goal]); clearOverlay(); };
$('clearBoard').onclick = () => { stop(); grid.cells.fill(OPEN); clearOverlay(); };
$('algo').onchange = () => { $('info').textContent = INFO[$('algo').value]; };
$('algo').value = 'astar';
$('info').textContent = INFO.astar;
clearOverlay();
