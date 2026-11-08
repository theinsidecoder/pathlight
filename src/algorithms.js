// Pathlight core: five pathfinding algorithms on one tiny framework.
//
// Big idea: every algorithm below is the SAME loop. Only the "frontier"
// (the to-do list of cells) changes:
//   BFS      -> a Queue            (oldest first)
//   DFS      -> a Stack            (newest first)
//   Dijkstra -> a Heap by  g       (cheapest-so-far first)
//   A*       -> a Heap by  g + h   (cheapest-so-far + guess to goal)
//   Greedy   -> a Heap by  h       (closest-looking first)

export const WALL = 0, OPEN = 1, MUD = 5; // cell value = cost to step onto it (0 = blocked)

export const ALGORITHMS = {
  bfs: 'Breadth-First Search',
  dfs: 'Depth-First Search',
  dijkstra: "Dijkstra's Algorithm",
  astar: 'A* Search',
  greedy: 'Greedy Best-First',
};

export function createGrid(rows, cols) {
  return { rows, cols, cells: new Uint8Array(rows * cols).fill(OPEN) };
}

export function randomize(grid, protect = [], density = 0.25, mudDensity = 0.08, rand = Math.random) {
  for (let i = 0; i < grid.cells.length; i++) {
    const x = rand();
    grid.cells[i] = x < density ? WALL : x < density + mudDensity ? MUD : OPEN;
  }
  for (const id of protect) grid.cells[id] = OPEN;
}

// ---- frontiers: all expose push(key, id), pop() -> [key, id], size ----
export class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(key, id) {
    const a = this.a;
    a.push([key, id]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}
class Queue {
  constructor() { this.a = []; this.h = 0; }
  get size() { return this.a.length - this.h; }
  push(k, id) { this.a.push([k, id]); }
  pop() { return this.a[this.h++]; }
}
class Stack {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(k, id) { this.a.push([k, id]); }
  pop() { return this.a.pop(); }
}

function* neighbors({ rows, cols, cells }, id) {
  const r = (id / cols) | 0, c = id % cols;
  if (r > 0 && cells[id - cols] !== WALL) yield id - cols;
  if (c < cols - 1 && cells[id + 1] !== WALL) yield id + 1;
  if (r < rows - 1 && cells[id + cols] !== WALL) yield id + cols;
  if (c > 0 && cells[id - 1] !== WALL) yield id - 1;
}

/**
 * Generator: yields {type:'visit'|'frontier', id} for animation and
 * returns {found, path, cost, visited} when finished.
 */
export function* search(algo, grid, start, goal) {
  if (!(algo in ALGORITHMS)) throw new Error(`Unknown algorithm: ${algo}`);
  const { rows, cols, cells } = grid;
  const N = rows * cols;
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const seen = new Uint8Array(N);

  const gr = (goal / cols) | 0, gc = goal % cols;
  const h = (id) => Math.abs(((id / cols) | 0) - gr) + Math.abs((id % cols) - gc); // Manhattan guess
  const key =
    algo === 'dijkstra' ? (id) => dist[id]
    : algo === 'astar' ? (id) => dist[id] + h(id)
    : algo === 'greedy' ? h
    : () => 0;
  const frontier = algo === 'bfs' ? new Queue() : algo === 'dfs' ? new Stack() : new MinHeap();
  const discoverOnce = algo === 'bfs' || algo === 'dfs' || algo === 'greedy';

  dist[start] = 0;
  frontier.push(key(start), start);
  let visited = 0;

  while (frontier.size) {
    const [, id] = frontier.pop();
    if (seen[id]) continue; // stale heap entry
    seen[id] = 1;
    visited++;
    yield { type: 'visit', id };
    if (id === goal) break;
    for (const nb of neighbors(grid, id)) {
      if (seen[nb]) continue;
      const nd = dist[id] + cells[nb];
      if (discoverOnce ? dist[nb] === Infinity : nd < dist[nb]) {
        dist[nb] = nd;
        prev[nb] = id;
        frontier.push(key(nb), nb);
        yield { type: 'frontier', id: nb };
      }
    }
  }

  const path = [];
  let cost = 0;
  if (seen[goal]) {
    for (let at = goal; at !== -1; at = prev[at]) path.push(at);
    path.reverse();
    for (let i = 1; i < path.length; i++) cost += cells[path[i]];
  }
  return { found: !!seen[goal], path, cost, visited };
}

/** Run to completion without animation. */
export function solve(algo, grid, start, goal) {
  const it = search(algo, grid, start, goal);
  for (let r = it.next(); ; r = it.next()) if (r.done) return r.value;
}
