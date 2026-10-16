/**
 * Number Ten — match two digits that are EQUAL (7·7) or ADD UP TO 10 (3·7).
 *
 * One rule function (`canPair`) decides everything: tile highlighting, accepting a
 * move, hints and the "no moves" check all call it, so the game can never accept
 * 2+8 in one place and reject 1+9 in another.
 *
 * Two tiles are connected when every cell between them is already cleared along:
 *   - reading order (left→right, wrapping to the next row),
 *   - the same column,
 *   - a diagonal.
 * "+" appends the remaining digits to the end (limited per level).
 * Fully cleared rows disappear.
 *
 * Levels are generated so that they can ALWAYS be cleared using reading-order moves
 * alone, without using "+": pairs are inserted around balanced blocks, so removing them
 * in reverse order always works.
 */
import { hashString, mulberry32, randInt, type Rng } from './rng';

export const COLS = 9;

export interface Cell {
  id: number;
  v: number | null;
}

export interface TenLevel {
  level: number;
  cells: Cell[];
  adds: number;
  /** reference solution (cell ids, in removal order) */
  solution: [number, number][];
}

export interface TenState {
  cells: Cell[];
  nextId: number;
  adds: number;
  addsUsed: number;
  score: number;
}

export const isMatchValue = (a: number, b: number) => a === b || a + b === 10;

/** Index-based connectivity check over the current flat grid. */
export function connected(cells: Cell[], i: number, j: number): boolean {
  if (i === j) return false;
  const a = Math.min(i, j);
  const b = Math.max(i, j);
  // 1) reading order (covers same-row neighbours and the row wrap)
  let clear = true;
  for (let k = a + 1; k < b; k++) {
    if (cells[k].v !== null) {
      clear = false;
      break;
    }
  }
  if (clear) return true;
  const ra = Math.floor(a / COLS);
  const ca = a % COLS;
  const rb = Math.floor(b / COLS);
  const cb = b % COLS;
  const dr = rb - ra;
  const dc = cb - ca;
  let step = 0;
  if (dc === 0) step = COLS; // vertical
  else if (dr === dc) step = COLS + 1; // diagonal ↘
  else if (dr === -dc) step = COLS - 1; // diagonal ↙
  else return false;
  for (let k = a + step; k < b; k += step) if (cells[k].v !== null) return false;
  return true;
}

/** THE rule. Used by the UI, the hint and the move check. */
export function canPair(cells: Cell[], i: number, j: number): boolean {
  const x = cells[i]?.v;
  const y = cells[j]?.v;
  if (x == null || y == null || i === j) return false;
  return isMatchValue(x, y) && connected(cells, i, j);
}

export type Reject = 'value' | 'blocked' | null;
/** Why a pair was refused (for a clear message). */
export function whyNot(cells: Cell[], i: number, j: number): Reject {
  const x = cells[i]?.v;
  const y = cells[j]?.v;
  if (x == null || y == null) return 'blocked';
  if (!isMatchValue(x, y)) return 'value';
  if (!connected(cells, i, j)) return 'blocked';
  return null;
}

export function partnersOf(cells: Cell[], i: number): number[] {
  const out: number[] = [];
  for (let j = 0; j < cells.length; j++) if (canPair(cells, i, j)) out.push(j);
  return out;
}

export function anyMove(cells: Cell[]): [number, number] | null {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].v === null) continue;
    for (let j = i + 1; j < cells.length; j++) if (canPair(cells, i, j)) return [i, j];
  }
  return null;
}

export function countMoves(cells: Cell[]): number {
  let n = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].v === null) continue;
    for (let j = i + 1; j < cells.length; j++) if (canPair(cells, i, j)) n++;
  }
  return n;
}

/** Remove rows that are completely cleared; drop trailing empty cells. Returns removed row count. */
export function collapse(cells: Cell[]): { cells: Cell[]; rows: number } {
  const out: Cell[] = [];
  let rows = 0;
  for (let r = 0; r * COLS < cells.length; r++) {
    const row = cells.slice(r * COLS, r * COLS + COLS);
    if (row.length === COLS && row.every((c) => c.v === null)) {
      rows++;
      continue;
    }
    out.push(...row);
  }
  // trailing cleared cells of the (partial) last row
  while (out.length && out[out.length - 1].v === null) out.pop();
  return { cells: out, rows };
}

export function isClear(cells: Cell[]): boolean {
  return cells.every((c) => c.v === null);
}

export function initialTen(l: TenLevel): TenState {
  return {
    cells: l.cells.map((c) => ({ ...c })),
    nextId: l.cells.length,
    adds: l.adds,
    addsUsed: 0,
    score: 0,
  };
}

/** Apply a match (indices). Returns the new state plus what happened, or null if illegal. */
export function applyMatch(s: TenState, i: number, j: number): { state: TenState; rows: number } | null {
  if (!canPair(s.cells, i, j)) return null;
  const cells = s.cells.map((c) => ({ ...c }));
  cells[i].v = null;
  cells[j].v = null;
  const col = collapse(cells);
  return { state: { ...s, cells: col.cells }, rows: col.rows };
}

/** "+": append the remaining digits (in order) to the end of the grid. */
export function applyAdd(s: TenState): TenState | null {
  if (s.adds <= 0) return null;
  const rest = s.cells.filter((c) => c.v !== null);
  if (!rest.length) return null;
  let id = s.nextId;
  const extra = rest.map((c) => ({ id: id++, v: c.v }));
  return { ...s, cells: [...s.cells, ...extra], nextId: id, adds: s.adds - 1, addsUsed: s.addsUsed + 1 };
}

// ───────────────────────────── Level generation ─────────────────────────────

export interface TenParams {
  pairs: number;
  adds: number;
  /** probability that a new pair wraps around an existing block instead of sitting side by side */
  wrap: number;
  /** probability that a pair is "equal" (7·7) rather than "sum 10" (3·7) */
  equal: number;
}

export function tenParams(n: number): TenParams {
  const pairs = Math.min(27, 7 + Math.floor(n * 0.9)); // 14 → 54 tiles (6 rows)
  const adds = n <= 5 ? 5 : n <= 15 ? 4 : n <= 30 ? 3 : n <= 60 ? 2 : 1;
  const wrap = Math.min(0.85, 0.15 + n * 0.025);
  const equal = Math.max(0.2, 0.45 - n * 0.006);
  return { pairs, adds, wrap, equal };
}

function makePair(rng: Rng, p: TenParams): [number, number] {
  if (rng() < p.equal) {
    const d = randInt(rng, 1, 9);
    return [d, d];
  }
  const d = randInt(rng, 1, 9);
  return rng() < 0.5 ? [d, 10 - d] : [10 - d, d];
}

/**
 * Build the digit sequence by inserting pairs. Each pair is placed either side by side, or
 * around a balanced block (a run made only of complete pairs). Removing pairs in reverse
 * insertion order is then always legal via reading-order adjacency.
 */
/** Target share of random-play attempts that clear the board: 100% early → ~35% late. */
export function tenTargetRate(n: number): number {
  if (n <= 3) return 1;
  return Math.max(0.35, 1 - (n - 3) * 0.012);
}

function buildSeq(rng: Rng, p: TenParams): number[][] {
  type Tok = { v: number; pid: number };
  const seq: Tok[] = [];
  for (let pid = 0; pid < p.pairs; pid++) {
    const [x, y] = makePair(rng, p);
    const i = randInt(rng, 0, seq.length);
    let j = i; // y goes before index j, x before index i (i <= j)
    if (rng() < p.wrap && i < seq.length) {
      // possible ends: k > i such that seq[i..k) holds only complete pairs
      const ends: number[] = [];
      const open = new Set<number>();
      for (let k = i; k < seq.length; k++) {
        const id = seq[k].pid;
        if (open.has(id)) open.delete(id);
        else open.add(id);
        if (open.size === 0) ends.push(k + 1);
      }
      if (ends.length) j = ends[Math.floor(rng() * ends.length)];
    }
    seq.splice(j, 0, { v: y, pid });
    seq.splice(i, 0, { v: x, pid });
  }
  return seq.map((t) => [t.v, t.pid]);
}

/** Random player: picks any legal move, uses "+" when stuck. 1 = cleared. */
function randomPlay(l: TenLevel, seed: number): number {
  const r = mulberry32(seed);
  let s = initialTen(l);
  for (let step = 0; step < 300; step++) {
    if (!s.cells.length) return 1;
    const mv: [number, number][] = [];
    for (let i = 0; i < s.cells.length; i++) {
      if (s.cells[i].v === null) continue;
      for (let j = i + 1; j < s.cells.length; j++) if (canPair(s.cells, i, j)) mv.push([i, j]);
    }
    if (!mv.length) {
      const a = applyAdd(s);
      if (!a) return 0;
      s = a;
      continue;
    }
    const [i, j] = mv[Math.floor(r() * mv.length)];
    s = applyMatch(s, i, j)!.state;
  }
  return 0;
}

const tenCache = new Map<number, TenLevel>();

/**
 * Deterministic level N. Every candidate is clearable by construction; among a few
 * candidates we keep the one whose random-play clear rate is closest to the target
 * for this level, so difficulty climbs smoothly.
 */
export function generateTen(n: number): TenLevel {
  const hit = tenCache.get(n);
  if (hit) return hit;
  const p = tenParams(n);
  const rng = mulberry32(hashString(`numdart-ten-${n}`));
  const target = tenTargetRate(n);
  const CAND = n <= 3 ? 1 : 5;
  const PLAYS = 10;
  let best: TenLevel | null = null;
  let bestErr = Infinity;
  for (let c = 0; c < CAND; c++) {
    const seq = buildSeq(rng, p);
    const cells = seq.map(([v], k) => ({ id: k, v }));
    const byPid = new Map<number, number[]>();
    seq.forEach(([, pid], k) => byPid.set(pid, [...(byPid.get(pid) ?? []), k]));
    // The pairs nest like brackets, so removing them from the shortest span to the
    // longest always clears whatever lies in between first.
    const solution = [...byPid.values()]
      .map(([a, b]) => [a, b] as [number, number])
      .sort((x, y) => x[1] - x[0] - (y[1] - y[0]) || x[0] - y[0]);
    const lvl: TenLevel = { level: n, cells, adds: p.adds, solution };
    if (CAND === 1) {
      best = lvl;
      break;
    }
    let wins = 0;
    for (let k = 0; k < PLAYS; k++) wins += randomPlay(lvl, n * 1000 + c * 37 + k);
    const err = Math.abs(wins / PLAYS - target);
    if (err < bestErr) {
      best = lvl;
      bestErr = err;
    }
  }
  if (tenCache.size > 6) tenCache.clear();
  tenCache.set(n, best!);
  return best!;
}

/** A hint: prefer the next step of the reference solution if still possible, else any legal move. */
export function hintMove(l: TenLevel, s: TenState): [number, number] | null {
  const idx = new Map<number, number>();
  s.cells.forEach((c, k) => {
    if (c.v !== null) idx.set(c.id, k);
  });
  for (const [a, b] of l.solution) {
    const i = idx.get(a);
    const j = idx.get(b);
    if (i !== undefined && j !== undefined && canPair(s.cells, i, j)) return [i, j];
  }
  return anyMove(s.cells);
}

export function starsForTen(addsUsed: number): number {
  return addsUsed === 0 ? 3 : addsUsed === 1 ? 2 : 1;
}
