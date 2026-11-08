import test from 'node:test';
import assert from 'node:assert/strict';
import { createGrid, solve, randomize, MinHeap, WALL, MUD, ALGORITHMS } from '../src/algorithms.js';

const rng = (seed) => { let s = seed; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32; };

// independent reference: Bellman-Ford on the grid
function reference({ rows, cols, cells }, start, goal) {
  const d = new Array(rows * cols).fill(Infinity);
  d[start] = 0;
  for (let it = 0, changed = true; changed && it < rows * cols; it++) {
    changed = false;
    for (let id = 0; id < d.length; id++) {
      if (d[id] === Infinity) continue;
      const r = (id / cols) | 0, c = id % cols;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        const n = nr * cols + nc;
        if (cells[n] !== WALL && d[id] + cells[n] < d[n]) { d[n] = d[id] + cells[n]; changed = true; }
      }
    }
  }
  return d[goal];
}

function assertValidPath({ cols, cells }, res, start, goal) {
  assert.equal(res.path[0], start);
  assert.equal(res.path.at(-1), goal);
  for (let i = 1; i < res.path.length; i++) {
    const a = res.path[i - 1], b = res.path[i];
    assert.equal(Math.abs(a - b) === 1 || Math.abs(a - b) === cols, true, 'steps must be adjacent');
    assert.notEqual(cells[b], WALL);
  }
}

test('heap pops in sorted order', () => {
  const h = new MinHeap(), r = rng(1), vals = Array.from({ length: 200 }, () => Math.floor(r() * 1000));
  vals.forEach((v, i) => h.push(v, i));
  const out = [];
  while (h.size) out.push(h.pop()[0]);
  assert.deepEqual(out, [...vals].sort((a, b) => a - b));
});

test('every algorithm finds a valid path on an open grid', () => {
  const g = createGrid(10, 10);
  for (const algo of Object.keys(ALGORITHMS)) {
    const res = solve(algo, g, 0, 99);
    assert.equal(res.found, true, algo);
    assertValidPath(g, res, 0, 99);
  }
});

test('BFS, Dijkstra and A* give the shortest path on an open grid', () => {
  const g = createGrid(10, 10);
  for (const algo of ['bfs', 'dijkstra', 'astar']) assert.equal(solve(algo, g, 0, 99).cost, 18, algo);
});

test('Dijkstra and A* match the reference on random weighted grids', () => {
  const r = rng(42);
  for (let t = 0; t < 60; t++) {
    const g = createGrid(12, 12);
    randomize(g, [0, 143], 0.25, 0.15, r);
    const want = reference(g, 0, 143);
    for (const algo of ['dijkstra', 'astar']) {
      const res = solve(algo, g, 0, 143);
      assert.equal(res.found, want !== Infinity, `${algo} found`);
      if (res.found) { assert.equal(res.cost, want, `${algo} cost`); assertValidPath(g, res, 0, 143); }
    }
  }
});

test('BFS is optimal in steps when there is no mud', () => {
  const r = rng(7);
  for (let t = 0; t < 40; t++) {
    const g = createGrid(12, 12);
    randomize(g, [0, 143], 0.3, 0, r);
    assert.equal(solve('bfs', g, 0, 143).cost, solve('dijkstra', g, 0, 143).cost);
  }
});

test('all algorithms report no path when the goal is walled off', () => {
  const g = createGrid(6, 6);
  g.cells[1] = WALL; g.cells[6] = WALL; // boxes in cell 0 (top-left)
  for (const algo of Object.keys(ALGORITHMS)) assert.equal(solve(algo, g, 0, 35).found, false, algo);
});

test('start equals goal', () => {
  assert.deepEqual(solve('astar', createGrid(3, 3), 4, 4).path, [4]);
});

test('A* explores fewer cells than Dijkstra in open space', () => {
  const g = createGrid(30, 30);
  assert.ok(solve('astar', g, 0, 899).visited < solve('dijkstra', g, 0, 899).visited);
});

test('unknown algorithm throws', () => {
  assert.throws(() => solve('nope', createGrid(2, 2), 0, 3));
});
