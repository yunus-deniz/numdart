/**
 * Equation Lock (Denklem Kilidi): turn the dials so that  d1 op d2 op d3 … = target.
 * Normal precedence (× ÷ before + −). Division must be exact. From level 6 on,
 * every dial must show a different digit. Levels are deterministic per level number.
 */
import { mulberry32, pick, randInt, type Rng } from './rng';

export type LockOp = '+' | '−' | '×' | '÷';

export interface LockLevel {
  level: number;
  ops: LockOp[]; // length = slots - 1
  target: number;
  distinct: boolean;
  /** one valid answer (for hints) */
  solution: number[];
  /** how many dial settings open the lock */
  solutions: number;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function slotsFor(level: number): number {
  return Math.min(5, 2 + Math.floor((level - 1) / 3));
}

export function opsFor(level: number): LockOp[] {
  if (level <= 2) return ['+'];
  if (level <= 5) return ['+', '−'];
  if (level <= 9) return ['+', '−', '×'];
  return ['+', '−', '×', '÷'];
}

export function distinctFor(level: number): boolean {
  return level >= 6;
}

/** Value of the expression, or null if invalid (division not exact / by zero). */
export function evaluate(digits: number[], ops: LockOp[]): number | null {
  // first pass: × and ÷
  const terms: number[] = [digits[0]];
  const addOps: LockOp[] = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const d = digits[i + 1];
    if (op === '×') terms[terms.length - 1] *= d;
    else if (op === '÷') {
      const a = terms[terms.length - 1];
      if (d === 0 || a % d !== 0) return null;
      terms[terms.length - 1] = a / d;
    } else {
      addOps.push(op);
      terms.push(d);
    }
  }
  let v = terms[0];
  for (let i = 0; i < addOps.length; i++) v = addOps[i] === '+' ? v + terms[i + 1] : v - terms[i + 1];
  return v;
}

export function hasDuplicates(digits: number[]): boolean {
  return new Set(digits).size !== digits.length;
}

export function isOpen(digits: number[], L: Pick<LockLevel, 'ops' | 'target' | 'distinct'>): boolean {
  if (L.distinct && hasDuplicates(digits)) return false;
  return evaluate(digits, L.ops) === L.target;
}

/** Brute-force count of opening combinations (max 10^5 checks). */
export function countSolutions(
  slots: number,
  ops: LockOp[],
  target: number,
  distinct: boolean,
  stopAfter = Infinity,
): { count: number; first: number[] | null } {
  let count = 0;
  let first: number[] | null = null;
  const cur = new Array(slots).fill(0);
  const rec = (i: number) => {
    if (count > stopAfter) return;
    if (i === slots) {
      if (distinct && hasDuplicates(cur)) return;
      if (evaluate(cur, ops) === target) {
        count++;
        if (!first) first = cur.slice();
      }
      return;
    }
    for (const d of DIGITS) {
      cur[i] = d;
      rec(i + 1);
    }
  };
  rec(0);
  return { count, first };
}

function randomDigits(rng: Rng, n: number, distinct: boolean): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const d = randInt(rng, 1, 9);
    if (distinct && out.includes(d)) continue;
    out.push(d);
  }
  return out;
}

/** Fewer solutions = harder. Early levels may be generous, later ones tight. */
function maxSolutionsFor(level: number): number {
  if (level <= 2) return 9;
  if (level <= 5) return 12;
  if (level <= 9) return 10;
  if (level <= 15) return 8;
  return 5;
}

export function generateLock(level: number): LockLevel {
  const rng = mulberry32(level * 2654435761 + 97);
  const slots = slotsFor(level);
  const pool = opsFor(level);
  const distinct = distinctFor(level);
  const cap = maxSolutionsFor(level);
  let best: LockLevel | null = null;
  for (let attempt = 0; attempt < 80; attempt++) {
    const ops: LockOp[] = Array.from({ length: slots - 1 }, () => pick(rng, pool));
    // make sure the newest operator actually appears once it is introduced
    const newest = pool[pool.length - 1];
    if (level > 2 && !ops.includes(newest)) ops[randInt(rng, 0, ops.length - 1)] = newest;
    const digits = randomDigits(rng, slots, distinct);
    const target = evaluate(digits, ops);
    if (target === null || target < 0 || target > 999) continue;
    const { count, first } = countSolutions(slots, ops, target, distinct, best ? best.solutions : 60);
    if (!first) continue;
    const cand: LockLevel = { level, ops, target, distinct, solution: first, solutions: count };
    if (count <= cap) return cand;
    if (!best || count < best.solutions) best = cand;
  }
  // fallback: tightest one we saw (always exists in practice)
  return best ?? { level, ops: ['+'], target: 9, distinct: false, solution: [4, 5], solutions: 10 };
}

/** 1 try → 3★, 2–3 tries → 2★, more → 1★. Gold = stars × (level bonus). */
export function starsForLock(tries: number): number {
  return tries <= 1 ? 3 : tries <= 3 ? 2 : 1;
}

export function goldFor(level: number, stars: number): number {
  return stars * (5 + Math.floor(level / 3));
}
