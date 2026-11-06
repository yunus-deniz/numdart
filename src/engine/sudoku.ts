/**
 * Sudoku generator + helpers for 4×4 (2×2 boxes), 6×6 (2×3 boxes) and 9×9 (3×3 boxes).
 * Every generated puzzle has exactly one solution. Deterministic per seed.
 */
import { mulberry32, shuffle, type Rng } from './rng';

export type SudokuMode = 'mini4' | 'mini6' | 'easy' | 'medium' | 'hard';
export const SUDOKU_MODES: SudokuMode[] = ['mini4', 'mini6', 'easy', 'medium', 'hard'];

export interface SudokuPuzzle {
  n: number; // 4, 6 or 9
  boxR: number; // box height
  boxC: number; // box width
  puzzle: number[]; // 0 = empty
  solution: number[];
}

export function sizeFor(mode: SudokuMode): { n: number; boxR: number; boxC: number } {
  if (mode === 'mini4') return { n: 4, boxR: 2, boxC: 2 };
  if (mode === 'mini6') return { n: 6, boxR: 2, boxC: 3 };
  return { n: 9, boxR: 3, boxC: 3 };
}

/** How many numbers stay on the board (more = easier). */
function givensFor(mode: SudokuMode): number {
  switch (mode) {
    case 'mini4':
      return 7;
    case 'mini6':
      return 18;
    case 'easy':
      return 40;
    case 'medium':
      return 32;
    case 'hard':
      return 26;
  }
}

function peersOf(n: number, boxR: number, boxC: number): number[][] {
  const peers: number[][] = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const br = r - (r % boxR);
    const bc = c - (c % boxC);
    const s = new Set<number>();
    for (let k = 0; k < n; k++) {
      s.add(r * n + k);
      s.add(k * n + c);
    }
    for (let dr = 0; dr < boxR; dr++) for (let dc = 0; dc < boxC; dc++) s.add((br + dr) * n + (bc + dc));
    s.delete(i);
    peers.push([...s]);
  }
  return peers;
}

const peerCache = new Map<string, number[][]>();
function peers(n: number, boxR: number, boxC: number) {
  const k = `${n}-${boxR}-${boxC}`;
  let p = peerCache.get(k);
  if (!p) {
    p = peersOf(n, boxR, boxC);
    peerCache.set(k, p);
  }
  return p;
}

function candidates(grid: number[], i: number, n: number, P: number[][]): number[] {
  const used = new Set<number>();
  for (const j of P[i]) if (grid[j]) used.add(grid[j]);
  const out: number[] = [];
  for (let v = 1; v <= n; v++) if (!used.has(v)) out.push(v);
  return out;
}

/** Count solutions up to `limit` (most-constrained-cell backtracking). */
export function countSolutions(grid0: number[], n: number, boxR: number, boxC: number, limit = 2): number {
  const P = peers(n, boxR, boxC);
  const grid = grid0.slice();
  let count = 0;
  const rec = (): void => {
    if (count >= limit) return;
    let best = -1;
    let bestC: number[] = [];
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) continue;
      const cs = candidates(grid, i, n, P);
      if (cs.length === 0) return;
      if (best < 0 || cs.length < bestC.length) {
        best = i;
        bestC = cs;
        if (cs.length === 1) break;
      }
    }
    if (best < 0) {
      count++;
      return;
    }
    for (const v of bestC) {
      grid[best] = v;
      rec();
      if (count >= limit) break;
    }
    grid[best] = 0;
  };
  rec();
  return count;
}

function fillGrid(rng: Rng, n: number, boxR: number, boxC: number): number[] {
  const P = peers(n, boxR, boxC);
  const grid = new Array(n * n).fill(0);
  const rec = (i: number): boolean => {
    if (i === grid.length) return true;
    for (const v of shuffle(rng, candidates(grid, i, n, P))) {
      grid[i] = v;
      if (rec(i + 1)) return true;
    }
    grid[i] = 0;
    return false;
  };
  rec(0);
  return grid;
}

export function generateSudoku(mode: SudokuMode, seed: number): SudokuPuzzle {
  const rng = mulberry32(seed ^ 0x5d0c);
  const { n, boxR, boxC } = sizeFor(mode);
  const solution = fillGrid(rng, n, boxR, boxC);
  const puzzle = solution.slice();
  const target = givensFor(mode);
  let filled = n * n;
  for (const i of shuffle(rng, [...Array(n * n).keys()])) {
    if (filled <= target) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, n, boxR, boxC, 2) !== 1) puzzle[i] = keep;
    else filled--;
  }
  return { n, boxR, boxC, puzzle, solution };
}

/** Indices whose value clashes with a peer (same row / column / box). */
export function conflicts(grid: number[], n: number, boxR: number, boxC: number): Set<number> {
  const P = peers(n, boxR, boxC);
  const bad = new Set<number>();
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue;
    for (const j of P[i]) if (grid[j] === grid[i]) bad.add(i);
  }
  return bad;
}

export function isSolved(grid: number[], solution: number[]): boolean {
  return grid.every((v, i) => v === solution[i]);
}

export function samePeerGroup(a: number, b: number, n: number, boxR: number, boxC: number): boolean {
  return a === b || peers(n, boxR, boxC)[a].includes(b);
}

/** 0 mistakes → 3★, 1–2 → 2★, more → 1★. */
export function starsForSudoku(mistakes: number): number {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}
