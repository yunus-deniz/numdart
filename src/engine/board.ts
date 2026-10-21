/**
 * Board Clear (main mode). Tiles on a fixed grid, a queue of targets.
 * Select 2–3 tiles whose result equals the active target → they pop.
 * Levels are generated in reverse (groups first), so each one is solvable.
 */
import { hashString, mulberry32, randInt, shuffle, type Rng } from './rng';

export type TargetKind = 'sum' | 'mul' | 'sub';
export interface Target {
  kind: TargetKind;
  value: number;
}

export interface Level {
  level: number;
  cols: number;
  rows: number;
  /** cell values, row-major */
  cells: number[];
  /** frozen at start: unlock when an orthogonal neighbour pops */
  frozen: boolean[];
  targets: Target[];
  /** reference solution: cell groups in target order */
  solution: number[][];
}

export interface BoardState {
  values: (number | null)[];
  frozen: boolean[];
  targetIndex: number;
}

export function initialBoard(l: Level): BoardState {
  return { values: l.cells.slice(), frozen: l.frozen.slice(), targetIndex: 0 };
}

export function targetLabel(t: Target): string {
  if (t.kind === 'mul') return `×${t.value}`;
  if (t.kind === 'sub') return `−${t.value}`;
  return String(t.value);
}

export const OP_SYMBOL: Record<TargetKind, string> = { sum: '+', mul: '×', sub: '−' };

/** Result of combining the selected values for a target kind. */
export function combine(kind: TargetKind, vals: number[]): number {
  if (vals.length === 0) return 0;
  if (kind === 'sum') return vals.reduce((a, b) => a + b, 0);
  if (kind === 'mul') return vals.reduce((a, b) => a * b, 1);
  if (vals.length === 1) return vals[0];
  return Math.abs(vals[0] - vals[1]);
}

export type SelectionStatus = 'partial' | 'hit' | 'over';

/** Judge a (partial) selection against the active target. */
export function judge(t: Target, vals: number[]): SelectionStatus {
  const n = vals.length;
  if (n === 0) return 'partial';
  const r = combine(t.kind, vals);
  switch (t.kind) {
    case 'sum':
      if (n >= 2 && r === t.value) return 'hit';
      if (r > t.value || (n === 1 && r === t.value) || n >= 3) return 'over';
      return 'partial';
    case 'mul':
      if (n >= 2 && r === t.value) return 'hit';
      if (r > t.value || n >= 3 || (n === 2 && t.value % r !== 0)) return 'over';
      return 'partial';
    case 'sub':
      if (n === 1) return 'partial';
      return r === t.value ? 'hit' : 'over';
  }
}

/** Human formula for the live capsule, e.g. "7 + 4 = 11". */
export function formula(kind: TargetKind, vals: number[]): string {
  if (vals.length === 0) return '';
  if (vals.length === 1) return String(vals[0]);
  if (kind === 'sub') {
    const [a, b] = vals[0] >= vals[1] ? [vals[0], vals[1]] : [vals[1], vals[0]];
    return `${a} − ${b} = ${a - b}`;
  }
  return `${vals.join(` ${OP_SYMBOL[kind]} `)} = ${combine(kind, vals)}`;
}

export function neighbours(cols: number, rows: number, i: number): number[] {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out: number[] = [];
  if (r > 0) out.push(i - cols);
  if (r < rows - 1) out.push(i + cols);
  if (c > 0) out.push(i - 1);
  if (c < cols - 1) out.push(i + 1);
  return out;
}

export function canSelect(s: BoardState, i: number): boolean {
  return s.values[i] !== null && !s.frozen[i];
}

/** Pop the given cells and advance the target queue. */
export function pop(l: Level, s: BoardState, cells: number[]): BoardState {
  const values = s.values.slice();
  const frozen = s.frozen.slice();
  for (const c of cells) values[c] = null;
  for (const c of cells) for (const nb of neighbours(l.cols, l.rows, c)) frozen[nb] = false;
  return { values, frozen, targetIndex: s.targetIndex + 1 };
}

export function isCleared(s: BoardState): boolean {
  return s.values.every((v) => v === null);
}

// ───────────────────────────── Solver ─────────────────────────────

/** Valid groups (2 or 3 selectable cells) that hit target t in state s. */
export function validGroups(s: BoardState, t: Target): number[][] {
  const avail: number[] = [];
  s.values.forEach((v, i) => {
    if (v !== null && !s.frozen[i]) avail.push(i);
  });
  const out: number[][] = [];
  const v = (i: number) => s.values[i] as number;
  for (let x = 0; x < avail.length; x++) {
    for (let y = x + 1; y < avail.length; y++) {
      const a = avail[x];
      const b = avail[y];
      if (judge(t, [v(a), v(b)]) === 'hit') out.push([a, b]);
      if (t.kind === 'sub') continue;
      for (let z = y + 1; z < avail.length; z++) {
        const c = avail[z];
        if (combine(t.kind, [v(a), v(b), v(c)]) === t.value && judge(t, [v(a), v(b)]) !== 'hit') out.push([a, b, c]);
      }
    }
  }
  return out;
}

/**
 * Finds a full clearing sequence from state s, or null if the board is locked.
 * Memoised on (remaining-cells mask, target index); 16 cells → instant.
 */
export function solveBoard(l: Level, s: BoardState): number[][] | null {
  const memo = new Map<number, boolean>();
  const T = l.targets.length;
  const rec = (st: BoardState, path: number[][]): number[][] | null => {
    const remaining = st.values.reduce<number>((n, v) => n + (v === null ? 0 : 1), 0);
    const left = T - st.targetIndex;
    if (left === 0) return remaining === 0 ? path : null;
    if (remaining < 2 * left || remaining > 3 * left) return null;
    let mask = 0;
    st.values.forEach((v, i) => {
      if (v !== null) mask |= 1 << i;
    });
    const key = mask * 64 + st.targetIndex;
    if (memo.get(key) === false) return null;
    for (const g of validGroups(st, l.targets[st.targetIndex])) {
      const r = rec(pop(l, st, g), [...path, g]);
      if (r) return r;
    }
    memo.set(key, false);
    return null;
  };
  return rec(s, []);
}

/** Number of valid first moves that lead to a locked board (planning "traps"). */
export function countTraps(l: Level, s: BoardState): { moves: number; traps: number } {
  const groups = validGroups(s, l.targets[s.targetIndex]);
  let traps = 0;
  for (const g of groups) if (!solveBoard(l, pop(l, s, g))) traps++;
  return { moves: groups.length, traps };
}

/** True when no sequence of correct picks can ever lock the board (checked over all reachable states). */
export function isTrapFree(l: Level): boolean {
  const seen = new Set<string>();
  const stack: BoardState[] = [initialBoard(l)];
  while (stack.length) {
    const s = stack.pop()!;
    const t = l.targets[s.targetIndex];
    if (!t) continue;
    const key = s.values.join(',') + '|' + s.targetIndex;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const g of validGroups(s, t)) {
      const n = pop(l, s, g);
      if (!solveBoard(l, n)) return false;
      stack.push(n);
    }
  }
  return true;
}

// ───────────────────────────── Level design ─────────────────────────────

interface LevelParams {
  cols: number;
  rows: number;
  /** allowed number of 3-tile groups (empty = any) */
  triples?: number[];
  tileMin: number;
  tileMax: number;
  tMin: number;
  tMax: number;
  mul: number; // probability a 2/3-group is multiplication
  sub: number; // probability a 2-group is subtraction
  frozen: number;
  minTraps: number;
  /** cap for gentle levels */
  maxTraps?: number;
}

/** Hand-tuned curve for levels 2–30 (level 1 is fully scripted). */
const HAND: Record<number, Partial<LevelParams>> = {
  // Levels 2–10 are trap-free: any correct pick keeps the board solvable.
  2: { cols: 3, rows: 2, triples: [2], tileMax: 9, tMin: 10, tMax: 20, maxTraps: 0 },
  3: { cols: 4, rows: 2, triples: [2], tileMax: 9, tMin: 10, tMax: 24, maxTraps: 0 },
  4: { cols: 4, rows: 2, triples: [2], tileMax: 9, tMin: 10, tMax: 24, maxTraps: 0 },
  5: { cols: 4, rows: 2, triples: [2], tileMax: 9, tMin: 10, tMax: 26, maxTraps: 0 },
  6: { cols: 4, rows: 2, triples: [2], tileMax: 9, tMin: 10, tMax: 26, maxTraps: 0 },
  7: { cols: 4, rows: 2, triples: [2], tileMax: 12, tMin: 12, tMax: 30, maxTraps: 0 },
  8: { cols: 4, rows: 2, triples: [2], tileMax: 12, tMin: 12, tMax: 30, maxTraps: 0 },
  9: { cols: 4, rows: 2, triples: [2], tileMax: 12, tMin: 10, tMax: 28, maxTraps: 0 },
  10: { cols: 4, rows: 2, triples: [2], tileMax: 15, tMin: 12, tMax: 30, maxTraps: 0 },
};

function paramsFor(n: number): LevelParams {
  const base: LevelParams = { cols: 4, rows: 2, tileMin: 1, tileMax: 9, tMin: 10, tMax: 30, mul: 0, sub: 0, frozen: 0, minTraps: 0 };
  if (HAND[n]) return { ...base, ...HAND[n] };
  const breather = n % 5 === 1; // a gentler level after every 5th
  if (n <= 30) {
    // 11–20: 3×3; 21–30: 4×3. Tile range and targets climb slowly.
    const k = n - 11; // 0..19
    const big = n > 20;
    return {
      ...base,
      cols: big ? 4 : 3,
      rows: 3,
      tileMin: 1,
      tileMax: Math.min(25, 9 + Math.floor(k * 0.85)),
      tMin: 15,
      tMax: Math.min(80, 36 + k * 3),
      minTraps: breather ? 0 : big ? 2 : 1,
      maxTraps: breather ? 1 : undefined,
    };
  }
  if (n <= 50) {
    const big = n > 40;
    return {
      ...base,
      cols: 4,
      rows: big ? 4 : 3,
      tileMin: 1,
      tileMax: 25,
      tMin: 15,
      tMax: 100,
      mul: breather ? 0.2 : 0.35,
      minTraps: breather ? 0 : 2,
    };
  }
  // 51+: 4×4 with subtraction and frozen tiles; difficulty waves every 10 levels.
  const wave = (n - 51) % 10;
  return {
    ...base,
    cols: 4,
    rows: 4,
    tileMin: 1,
    tileMax: 30,
    tMin: 15,
    tMax: 100,
    mul: 0.3,
    sub: 0.3,
    frozen: breather ? 1 : 2 + Math.min(2, Math.floor(wave / 3)),
    minTraps: breather ? 0 : 2 + (wave > 6 ? 1 : 0),
  };
}

function makeGroup(rng: Rng, size: number, p: LevelParams, kind: TargetKind): { vals: number[]; target: Target } | null {
  for (let tries = 0; tries < 200; tries++) {
    let vals: number[];
    if (kind === 'mul') {
      const hi = size === 3 ? 5 : 12;
      vals = Array.from({ length: size }, () => randInt(rng, 2, hi));
    } else if (kind === 'sub') {
      vals = [randInt(rng, Math.max(2, p.tileMin), p.tileMax), randInt(rng, Math.max(1, p.tileMin), p.tileMax)];
    } else {
      vals = Array.from({ length: size }, () => randInt(rng, p.tileMin, p.tileMax));
    }
    const r = combine(kind, vals);
    if (kind === 'sub') {
      if (r >= 2 && r <= 20) return { vals, target: { kind, value: r } };
      continue;
    }
    if (r >= p.tMin && r <= p.tMax) return { vals, target: { kind, value: r } };
    // Early levels have tiny tiles: let pairs come in slightly under the range floor.
    if (kind === 'sum' && size === 2 && r >= Math.min(p.tMin, 10) && r <= p.tMax) return { vals, target: { kind, value: r } };
  }
  return null;
}

function buildCandidate(rng: Rng, n: number, p: LevelParams): Level | null {
  const T = p.cols * p.rows;
  // Choose how many 3-tile groups.
  const options: number[] = [];
  for (let b = 0; 3 * b <= T; b++) if ((T - 3 * b) % 2 === 0) options.push(b);
  const allowed = p.triples ? options.filter((b) => p.triples!.includes(b)) : options.filter((b) => b > 0 || T <= 6);
  const b = allowed[Math.floor(rng() * allowed.length)] ?? options[0];
  const sizes = shuffle(rng, [...Array(b).fill(3), ...Array((T - 3 * b) / 2).fill(2)] as number[]);

  const groups: { vals: number[]; target: Target }[] = [];
  for (const size of sizes) {
    let kind: TargetKind = 'sum';
    const roll = rng();
    if (size === 2 && roll < p.sub) kind = 'sub';
    else if (roll < p.sub + p.mul) kind = 'mul';
    const g = makeGroup(rng, size, p, kind) ?? makeGroup(rng, size, p, 'sum');
    if (!g) return null;
    groups.push(g);
  }
  // Place tiles randomly on the grid.
  const positions = shuffle(rng, Array.from({ length: T }, (_, i) => i));
  const cells = new Array<number>(T);
  const groupOf = new Array<number>(T);
  const solution: number[][] = [];
  let k = 0;
  groups.forEach((g, gi) => {
    const cellsOfGroup: number[] = [];
    for (const v of g.vals) {
      const pos = positions[k++];
      cells[pos] = v;
      groupOf[pos] = gi;
      cellsOfGroup.push(pos);
    }
    solution.push(cellsOfGroup);
  });
  // Frozen tiles: only in later groups, and only with a neighbour from an earlier group.
  const frozen = new Array<boolean>(T).fill(false);
  if (p.frozen > 0) {
    const eligible = shuffle(
      rng,
      Array.from({ length: T }, (_, i) => i).filter(
        (i) => groupOf[i] > 0 && neighbours(p.cols, p.rows, i).some((nb) => groupOf[nb] < groupOf[i]),
      ),
    );
    eligible.slice(0, p.frozen).forEach((i) => (frozen[i] = true));
  }
  return { level: n, cols: p.cols, rows: p.rows, cells, frozen, targets: groups.map((g) => g.target), solution };
}

const LEVEL_1: Level = {
  level: 1,
  cols: 2,
  rows: 2,
  // 6 7
  // 2 4
  cells: [6, 7, 2, 4],
  frozen: [false, false, false, false],
  targets: [
    { kind: 'sum', value: 10 },
    { kind: 'sum', value: 9 },
  ],
  solution: [
    [0, 3],
    [1, 2],
  ],
};

const levelCache = new Map<number, Level>();

/** Deterministic level: everyone sees the same Level N. Cached; call early to pre-warm the next level. */
export function generateLevel(n: number): Level {
  const hit = levelCache.get(n);
  if (hit) return hit;
  const l = buildLevel(n);
  if (levelCache.size > 8) levelCache.clear();
  levelCache.set(n, l);
  return l;
}

function buildLevel(n: number): Level {
  if (n <= 1) return LEVEL_1;
  // Every level is trap-free: no correct pick can ever lock the board.
  // Difficulty comes from bigger numbers, ×, − and frozen tiles instead.
  const p = { ...paramsFor(n), minTraps: 0, maxTraps: 0 };
  const rng = mulberry32(hashString(`numdart-level-${n}`));
  let best: Level | null = null;
  let bestTraps = -1;
  const strictNoTraps = p.maxTraps === 0;
  for (let attempt = 0; attempt < (strictNoTraps ? 400 : 60); attempt++) {
    const cand = buildCandidate(rng, n, p);
    if (!cand) continue;
    const s0 = initialBoard(cand);
    if (!solveBoard(cand, s0)) continue; // never ship an unsolvable board
    if (strictNoTraps) {
      if (isTrapFree(cand)) return cand;
      continue;
    }
    if (p.minTraps === 0 && p.maxTraps === undefined) return cand;
    const { traps, moves } = countTraps(cand, s0);
    if (p.maxTraps !== undefined && traps > p.maxTraps) continue;
    if (p.minTraps === 0) return cand;
    // Not *every* first move may be a trap; that would feel unfair.
    if (traps >= p.minTraps && traps < moves) return cand;
    if (traps > bestTraps && traps < moves) {
      best = cand;
      bestTraps = traps;
    }
  }
  if (best) return best;
  // Fallback: plain solvable board.
  for (;;) {
    const cand = buildCandidate(rng, n, { ...p, minTraps: 0 });
    if (cand && solveBoard(cand, initialBoard(cand))) return cand;
  }
}
