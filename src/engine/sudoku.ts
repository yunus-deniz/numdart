/**
 * Sudoku generator + helpers.
 * Sizes: 4×4 (2×2 boxes), 5×5 (jigsaw regions), 6×6 (2×3 boxes), 9×9 (3×3 boxes).
 * Levels: easy / medium / hard / extreme.
 * Every generated puzzle has exactly one solution. Deterministic per seed.
 */
import { mulberry32, shuffle, type Rng } from './rng';

export type SudokuSize = 4 | 5 | 6 | 9;
export type SudokuLevel = 'easy' | 'medium' | 'hard' | 'extreme';
export type SudokuMode = `${SudokuSize}-${SudokuLevel}`;

export const SUDOKU_SIZES: SudokuSize[] = [4, 5, 6, 9];
export const SUDOKU_LEVELS: SudokuLevel[] = ['easy', 'medium', 'hard', 'extreme'];
export const SUDOKU_MODES: SudokuMode[] = SUDOKU_SIZES.flatMap((s) => SUDOKU_LEVELS.map((l) => `${s}-${l}` as SudokuMode));

export interface SudokuPuzzle {
  n: number; // 4, 5, 6 or 9
  /** region id (0..n-1) for every cell — boxes, or jigsaw shapes for 5×5 */
  region: number[];
  puzzle: number[]; // 0 = empty
  solution: number[];
}

export const isKidsSize = (n: number) => n < 9;

export function parseMode(mode: string): { size: SudokuSize; level: SudokuLevel } {
  // legacy modes from the first Sudoku release
  if (mode === 'mini4') return { size: 4, level: 'medium' };
  if (mode === 'mini6') return { size: 6, level: 'medium' };
  if (mode === 'easy' || mode === 'medium' || mode === 'hard') return { size: 9, level: mode };
  const [s, l] = mode.split('-');
  const size = (SUDOKU_SIZES as number[]).includes(Number(s)) ? (Number(s) as SudokuSize) : 4;
  const level = (SUDOKU_LEVELS as string[]).includes(l) ? (l as SudokuLevel) : 'easy';
  return { size, level };
}

export const modeOf = (size: SudokuSize, level: SudokuLevel): SudokuMode => `${size}-${level}`;
export const normalizeMode = (mode: string): SudokuMode => {
  const { size, level } = parseMode(mode);
  return modeOf(size, level);
};

/** 5×5 has no rectangular boxes, so it uses five jigsaw shapes (verified solvable). */
const JIGSAW5 = '0011100011233332234422444';

function boxRegions(n: number, boxR: number, boxC: number): number[] {
  const out: number[] = [];
  const perRow = n / boxC;
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    out.push(Math.floor(r / boxR) * perRow + Math.floor(c / boxC));
  }
  return out;
}

export function regionsFor(n: number): number[] {
  if (n === 4) return boxRegions(4, 2, 2);
  if (n === 5) return JIGSAW5.split('').map(Number);
  if (n === 6) return boxRegions(6, 2, 3);
  return boxRegions(9, 3, 3);
}

/** How many numbers stay on the board (more = easier). The generator stops early if it can't go lower. */
const GIVENS: Record<SudokuSize, Record<SudokuLevel, number>> = {
  4: { easy: 10, medium: 8, hard: 6, extreme: 4 },
  5: { easy: 15, medium: 12, hard: 9, extreme: 7 },
  6: { easy: 22, medium: 18, hard: 14, extreme: 11 },
  9: { easy: 40, medium: 32, hard: 26, extreme: 22 },
};

function peersOf(n: number, region: number[]): number[][] {
  const peers: number[][] = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    const s = new Set<number>();
    for (let k = 0; k < n; k++) {
      s.add(r * n + k);
      s.add(k * n + c);
    }
    for (let j = 0; j < n * n; j++) if (region[j] === region[i]) s.add(j);
    s.delete(i);
    peers.push([...s]);
  }
  return peers;
}

const peerCache = new Map<string, number[][]>();
function peers(n: number, region: number[]) {
  const k = `${n}:${region.join('')}`;
  let p = peerCache.get(k);
  if (!p) {
    p = peersOf(n, region);
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
export function countSolutions(grid0: number[], n: number, region: number[], limit = 2): number {
  const P = peers(n, region);
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

function fillGrid(rng: Rng, n: number, region: number[]): number[] {
  const P = peers(n, region);
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

export function generateSudoku(mode: string, seed: number): SudokuPuzzle {
  const { size, level } = parseMode(mode);
  const rng = mulberry32(seed ^ 0x5d0c);
  const n = size;
  const region = regionsFor(n);
  const solution = fillGrid(rng, n, region);
  const puzzle = solution.slice();
  const target = GIVENS[size][level];
  let filled = n * n;
  for (const i of shuffle(rng, [...Array(n * n).keys()])) {
    if (filled <= target) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, n, region, 2) !== 1) puzzle[i] = keep;
    else filled--;
  }
  return { n, region, puzzle, solution };
}

/** Indices whose value clashes with a peer (same row / column / region). */
export function conflicts(grid: number[], n: number, region: number[]): Set<number> {
  const P = peers(n, region);
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

export function samePeerGroup(a: number, b: number, n: number, region: number[]): boolean {
  return a === b || peers(n, region)[a].includes(b);
}

/** 0 mistakes → 3★, 1–2 → 2★, more → 1★. */
export function starsForSudoku(mistakes: number): number {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
}
