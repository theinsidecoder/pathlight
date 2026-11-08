// Prints the comparison table used in the README.   Run: node examples/compare.js
import { createGrid, solve, WALL, MUD, ALGORITHMS } from '../src/algorithms.js';

const C = 40, R = 22, at = (r, c) => r * C + c;
const start = at(11, 6), goal = at(11, 33);

function table(title, grid) {
  console.log(`\n${title}`);
  console.log('algorithm'.padEnd(22), 'visited'.padStart(8), 'path len'.padStart(9), 'cost'.padStart(6));
  for (const [key, name] of Object.entries(ALGORITHMS)) {
    const r = solve(key, grid, start, goal);
    console.log(name.padEnd(22), String(r.visited).padStart(8), String(r.path.length).padStart(9), String(r.cost).padStart(6));
  }
}

table('Open board', createGrid(R, C));

const g = createGrid(R, C);
for (let r = 3; r < 19; r++) g.cells[at(r, 20)] = WALL;
for (let r = 6; r < 16; r++) g.cells[at(r, 14)] = WALL;
for (let c = 14; c <= 24; c++) g.cells[at(6, c)] = WALL;
for (let r = 8; r < 14; r++) for (let c = 22; c < 30; c++) g.cells[at(r, c)] = MUD;
table('Walls + a patch of mud', g);
