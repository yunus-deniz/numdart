/**
 * Daily Classic: 6 numbers + a target. Players combine two cards with + − × ÷.
 * Generation is fully on-device and deterministic from the local date.
 */
import { hashString, mulberry32, shuffle, type Rng } from './rng';
import { puzzleNumber, weekdayOf } from './dates';

export type Op = '+' | '−' | '×' | '÷';
export const OPS: Op[] = ['+', '−', '×', '÷'];

export const LARGE_NUMBERS = [25, 50, 75, 100] as const;
export const SMALL_DECK: number[] = Array.from({ length: 20 }, (_, i) => (i % 10) + 1);

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTY: Record<Difficulty, { large: number; small: number; min: number; max: number }> = {
  easy: { large: 2, small: 4, min: 100, max: 500 },
  medium: { large: 1, small: 5, min: 101, max: 999 },
  hard: { large: 0, small: 6, min: 300, max: 999 },
};

/** a op b for the player. Returns null when the move is not allowed. */
export function applyOp(a: number, op: Op, b: number): number | null {
  switch (op) {
    case '+':
      return a + b;
    case '−':
      return a - b > 0 ? a - b : null;
    case '×':
      return a * b;
    case '÷':
      return b !== 0 && a % b === 0 ? a / b : null;
  }
}

// ───────────────────────────── Solver ─────────────────────────────

export type Operand = { kind: 'start'; index: number } | { kind: 'step'; step: number };
export interface SolutionStep {
  a: Operand;
  op: Op;
  b: Operand;
  av: number;
  bv: number;
  result: number;
}

type Deriv = { leaf: number } | { am: number; av: number; bm: number; bv: number; op: Op };

interface SolveTable {
  numbers: number[];
  /** reachable value → derivation, per subset mask (using every number of the mask exactly once) */
  reach: Map<number, Deriv>[];
}

const popcount = (m: number) => {
  let c = 0;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
};

/**
 * Subset DP. Identity operations (×1, ÷1) and non-positive / fractional
 * intermediates are excluded, as the spec requires.
 */
export function buildSolveTable(numbers: number[]): SolveTable {
  const n = numbers.length;
  const full = (1 << n) - 1;
  const reach: Map<number, Deriv>[] = new Array(full + 1);
  // Reuse work for masks with identical multisets (duplicate small numbers are common).
  const byKey = new Map<string, number>();
  const keyOf = (mask: number) => {
    const v: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) v.push(numbers[i]);
    return v.sort((x, y) => x - y).join(',');
  };
  const masks: number[] = [];
  for (let m = 1; m <= full; m++) masks.push(m);
  masks.sort((x, y) => popcount(x) - popcount(y));

  for (const mask of masks) {
    if (popcount(mask) === 1) {
      const i = Math.log2(mask);
      reach[mask] = new Map([[numbers[i], { leaf: i }]]);
      continue;
    }
    const key = keyOf(mask);
    const twin = byKey.get(key);
    if (twin !== undefined) {
      // Same multiset as an already-solved mask: values are identical; derivations
      // are remapped lazily in extractSteps via `twinOf`.
      reach[mask] = remapTwin(reach, twin, mask, numbers);
      continue;
    }
    byKey.set(key, mask);
    const out = new Map<number, Deriv>();
    const low = mask & -mask;
    // A contains the lowest bit → each unordered split visited once.
    for (let a = (mask - 1) & mask; a > 0; a = (a - 1) & mask) {
      if (!(a & low)) continue;
      const b = mask ^ a;
      if (!b) continue;
      const ra = reach[a];
      const rb = reach[b];
      for (const x of ra.keys()) {
        for (const y of rb.keys()) {
          const hi = x >= y ? x : y;
          const lo = x >= y ? y : x;
          const hm = x >= y ? a : b;
          const lm = x >= y ? b : a;
          let r = hi + lo;
          if (!out.has(r)) out.set(r, { am: hm, av: hi, bm: lm, bv: lo, op: '+' });
          if (lo !== 1) {
            r = hi * lo;
            if (!out.has(r)) out.set(r, { am: hm, av: hi, bm: lm, bv: lo, op: '×' });
            if (hi % lo === 0) {
              r = hi / lo;
              if (!out.has(r)) out.set(r, { am: hm, av: hi, bm: lm, bv: lo, op: '÷' });
            }
          }
          if (hi !== lo) {
            r = hi - lo;
            if (!out.has(r)) out.set(r, { am: hm, av: hi, bm: lm, bv: lo, op: '−' });
          }
        }
      }
    }
    reach[mask] = out;
  }
  return { numbers, reach };
}

/** Map the derivations of `src` mask onto `dst` mask that has the same multiset. */
function remapTwin(reach: Map<number, Deriv>[], src: number, dst: number, numbers: number[]): Map<number, Deriv> {
  // Build index mapping src-bit → dst-bit with equal values.
  const n = numbers.length;
  const srcIdx: number[] = [];
  const dstIdx: number[] = [];
  for (let i = 0; i < n; i++) {
    if (src & (1 << i)) srcIdx.push(i);
    if (dst & (1 << i)) dstIdx.push(i);
  }
  srcIdx.sort((x, y) => numbers[x] - numbers[y] || x - y);
  dstIdx.sort((x, y) => numbers[x] - numbers[y] || x - y);
  const map = new Map<number, number>();
  srcIdx.forEach((s, k) => map.set(s, dstIdx[k]));
  const mapMask = (m: number) => {
    let r = 0;
    for (let i = 0; i < n; i++) if (m & (1 << i)) r |= 1 << map.get(i)!;
    return r;
  };
  const out = new Map<number, Deriv>();
  for (const [v, d] of reach[src]) {
    if ('leaf' in d) out.set(v, { leaf: map.get(d.leaf)! });
    else out.set(v, { am: mapMask(d.am), av: d.av, bm: mapMask(d.bm), bv: d.bv, op: d.op });
  }
  // Sub-masks referenced by remapped derivations must exist with the same derivation
  // values; they do, because every sub-multiset was solved earlier (smaller popcount).
  return out;
}

/** Ordered list of steps that builds `value` from `mask`. */
export function extractSteps(table: SolveTable, mask: number, value: number): SolutionStep[] {
  const steps: SolutionStep[] = [];
  const walk = (m: number, v: number): Operand => {
    const d = table.reach[m].get(v);
    if (!d) throw new Error(`no derivation for ${v} in mask ${m}`);
    if ('leaf' in d) return { kind: 'start', index: d.leaf };
    const a = walk(d.am, d.av);
    const b = walk(d.bm, d.bv);
    steps.push({ a, op: d.op, b, av: d.av, bv: d.bv, result: v });
    return { kind: 'step', step: steps.length - 1 };
  };
  walk(mask, value);
  return steps;
}

export interface TargetInfo {
  /** fewest numbers needed (ops = size − 1) */
  minSize: number;
  /** distinct sub-multisets of the 6 numbers from which the target is exactly reachable */
  solutions: number;
  /** mask achieving minSize */
  bestMask: number;
}

export function analyzeTargets(table: SolveTable, min: number, max: number): Map<number, TargetInfo> {
  const n = table.numbers.length;
  const full = (1 << n) - 1;
  const info = new Map<number, TargetInfo>();
  const seenKeys = new Set<string>();
  for (let m = 1; m <= full; m++) {
    const vals: number[] = [];
    for (let i = 0; i < n; i++) if (m & (1 << i)) vals.push(table.numbers[i]);
    const key = vals.sort((x, y) => x - y).join(',');
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const size = vals.length;
    for (const v of table.reach[m].keys()) {
      if (v < min || v > max) continue;
      const cur = info.get(v);
      if (!cur) info.set(v, { minSize: size, solutions: 1, bestMask: m });
      else {
        cur.solutions++;
        if (size < cur.minSize) {
          cur.minSize = size;
          cur.bestMask = m;
        }
      }
    }
  }
  return info;
}

/** Shortest exact solution for a target with the given numbers (or null). */
export function solve(numbers: number[], target: number): SolutionStep[] | null {
  const table = buildSolveTable(numbers);
  let best = -1;
  let bestSize = 99;
  for (let m = 1; m < table.reach.length; m++) {
    if (table.reach[m]?.has(target)) {
      const s = popcount(m);
      if (s < bestSize) {
        bestSize = s;
        best = m;
      }
    }
  }
  return best < 0 ? null : extractSteps(table, best, target);
}

// ───────────────────────────── Generation ─────────────────────────────

export interface Puzzle {
  dateISO: string | null;
  number: number;
  numbers: number[];
  /** indexes of large numbers inside `numbers` */
  large: boolean[];
  target: number;
  solution: SolutionStep[];
  minOps: number;
  solutions: number;
}

export type DayProfile = 'light' | 'mid' | 'heavy';
export function profileForDate(iso: string): DayProfile {
  const wd = weekdayOf(iso);
  if (wd === 1 || wd === 2) return 'light';
  if (wd === 0 || wd === 6) return 'heavy';
  return 'mid';
}

function fitsProfile(t: TargetInfo, p: DayProfile | 'any'): boolean {
  // ops = operations in the SHORTEST solution. ops ≥ 4 means at least 5 of the 6
  // numbers are needed: no "150 − 5" style two-step shortcuts.
  const ops = t.minSize - 1;
  switch (p) {
    case 'light':
      return ops >= 4 && t.solutions >= 3;
    case 'mid':
      return ops >= 4 && t.solutions >= 1;
    case 'heavy':
      return ops === 5 && t.solutions <= 3;
    case 'any':
      return ops >= 4;
  }
}

function draw(rng: Rng, d: Difficulty): { numbers: number[]; large: boolean[] } {
  const cfg = DIFFICULTY[d];
  const larges = shuffle(rng, LARGE_NUMBERS).slice(0, cfg.large);
  const smalls = shuffle(rng, SMALL_DECK).slice(0, cfg.small);
  return {
    numbers: [...larges, ...smalls],
    large: [...larges.map(() => true), ...smalls.map(() => false)],
  };
}

export function generatePuzzle(seed: number, difficulty: Difficulty, profile: DayProfile | 'any'): Omit<Puzzle, 'dateISO' | 'number'> {
  const cfg = DIFFICULTY[difficulty];
  for (let k = 0; k < 500; k++) {
    const rng = mulberry32((seed + k) >>> 0);
    const { numbers, large } = draw(rng, difficulty);
    const table = buildSolveTable(numbers);
    const info = analyzeTargets(table, cfg.min, cfg.max);
    const candidates = [...info.entries()].filter(([, t]) => fitsProfile(t, profile)).sort((a, b) => a[0] - b[0]);
    if (candidates.length === 0) continue;
    const [target, t] = candidates[Math.floor(rng() * candidates.length)];
    const solution = extractSteps(table, t.bestMask, target);
    return { numbers, large, target, solution, minOps: t.minSize - 1, solutions: t.solutions };
  }
  throw new Error('could not generate puzzle');
}

/** The daily puzzle for a local date — identical on every device. */
export function dailyPuzzle(iso: string): Puzzle {
  const p = generatePuzzle(hashString(iso), 'medium', profileForDate(iso));
  return { ...p, dateISO: iso, number: puzzleNumber(iso) };
}

// ───────────────────────────── Scoring ─────────────────────────────

export function starsFor(diff: number): 0 | 1 | 2 | 3 {
  if (diff === 0) return 3;
  if (diff <= 5) return 2;
  if (diff <= 10) return 1;
  return 0;
}

// ───────────────────────────── Play state ─────────────────────────────

export interface Card {
  value: number;
  used: boolean;
  /** produced by the player */
  made: boolean;
  large: boolean;
}

export interface Move {
  aSlot: number;
  bSlot: number;
  op: Op;
  a: number;
  b: number;
  result: number;
  aMade: boolean;
  bMade: boolean;
}

export interface PlayState {
  cards: Card[];
  history: Move[];
}

export function initialState(p: Pick<Puzzle, 'numbers' | 'large'>): PlayState {
  return {
    cards: p.numbers.map((v, i) => ({ value: v, used: false, made: false, large: p.large[i] })),
    history: [],
  };
}

/** Combine card in aSlot with card in bSlot. Result replaces bSlot; aSlot is marked used. */
export function play(state: PlayState, aSlot: number, op: Op, bSlot: number): PlayState | null {
  if (aSlot === bSlot) return null;
  const A = state.cards[aSlot];
  const B = state.cards[bSlot];
  if (!A || !B || A.used || B.used) return null;
  const r = applyOp(A.value, op, B.value);
  if (r === null) return null;
  const cards = state.cards.slice();
  cards[aSlot] = { ...A, used: true };
  cards[bSlot] = { value: r, used: false, made: true, large: false };
  return {
    cards,
    history: [...state.history, { aSlot, bSlot, op, a: A.value, b: B.value, result: r, aMade: A.made, bMade: B.made }],
  };
}

/** Rewind to before history line `k` (removes line k and all later lines). */
export function rewindTo(p: Pick<Puzzle, 'numbers' | 'large'>, state: PlayState, k: number): PlayState {
  let s = initialState(p);
  for (let i = 0; i < k && i < state.history.length; i++) {
    const m = state.history[i];
    s = play(s, m.aSlot, m.op, m.bSlot) ?? s;
  }
  return s;
}

/** Closest available card value to the target. */
export function closest(state: PlayState, target: number): { value: number; diff: number } | null {
  let best: { value: number; diff: number } | null = null;
  for (const c of state.cards) {
    if (c.used) continue;
    const diff = Math.abs(c.value - target);
    if (!best || diff < best.diff) best = { value: c.value, diff };
  }
  return best;
}

/**
 * Replays a solution on a fresh board, returning slot-based moves so the UI can
 * perform "show first step" hints.
 */
export function solutionToMoves(p: Pick<Puzzle, 'numbers' | 'large'>, steps: SolutionStep[]): { aSlot: number; op: Op; bSlot: number }[] {
  // Each operand resolves to the slot its value currently lives in.
  const stepSlot: number[] = [];
  const moves: { aSlot: number; op: Op; bSlot: number }[] = [];
  const slotOf = (o: Operand) => (o.kind === 'start' ? o.index : stepSlot[o.step]);
  steps.forEach((s, i) => {
    const aSlot = slotOf(s.a);
    const bSlot = slotOf(s.b);
    moves.push({ aSlot, op: s.op, bSlot });
    stepSlot[i] = bSlot;
  });
  return moves;
}

/** Start slots that the solution never touches (for the "fade unneeded numbers" hint). */
export function unusedStartSlots(p: Pick<Puzzle, 'numbers'>, steps: SolutionStep[]): number[] {
  const used = new Set<number>();
  for (const s of steps) {
    if (s.a.kind === 'start') used.add(s.a.index);
    if (s.b.kind === 'start') used.add(s.b.index);
  }
  return p.numbers.map((_, i) => i).filter((i) => !used.has(i));
}

// ───────────────────────────── Share text ─────────────────────────────

export function shareText(opts: {
  number: number;
  target: number;
  history: Move[];
  stars: number;
  diff: number;
  streak: number;
  streakLabel: string;
  url: string;
}): string {
  const { number, target, history, stars, diff, streak, streakLabel, url } = opts;
  const starLine = diff === 0 ? '⭐⭐⭐' : '⭐'.repeat(stars) + '☆'.repeat(3 - stars) + ` (±${diff})`;
  const lines = history.map((m, i) => {
    const last = i === history.length - 1;
    const sym = (made: boolean) => (made ? '🟢' : '🟦');
    let res = '🟢';
    if (m.result === target) res = '🎯';
    else if (last) res = '🟡';
    return `${sym(m.aMade)} ${m.op} ${sym(m.bMade)} = ${res}`;
  });
  // Trim anything played after the target was hit.
  const hit = lines.findIndex((l) => l.endsWith('🎯'));
  const body = hit >= 0 ? lines.slice(0, hit + 1) : lines;
  return [`Numdart #${number} 🎯 ${target}`, starLine, '', ...body, '', `🔥 ${streakLabel}: ${streak}`, url].join('\n');
}
