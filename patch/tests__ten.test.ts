/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAdd, applyMatch, canPair, collapse, connected, generateTen, initialTen, isMatchValue, whyNot, type Cell } from '../src/engine/ten';

const grid = (vals: (number | null)[]): Cell[] => vals.map((v, id) => ({ id, v }));

test('values: every pair that makes 10 or is equal matches — no exceptions', () => {
  for (let a = 1; a <= 9; a++)
    for (let b = 1; b <= 9; b++) assert.equal(isMatchValue(a, b), a === b || a + b === 10, `${a},${b}`);
  // the user-reported worry: 1+9 must behave exactly like 2+8
  for (const [a, b] of [[1, 9], [9, 1], [2, 8], [8, 2], [3, 7], [4, 6], [5, 5]]) {
    const g = grid([a, b]);
    assert.ok(canPair(g, 0, 1), `${a}+${b} side by side`);
  }
});

test('connectivity: row, wrap, column, diagonal, blocked', () => {
  // row 0: 1 . . 9 ; cleared between → ok
  let g = grid([1, null, null, 9, 4, 4, 4, 4, 4, 4]);
  assert.ok(connected(g, 0, 3));
  g = grid([1, 5, null, 9]);
  assert.equal(whyNot(g, 0, 3), 'blocked');
  // wrap: last of row 0 with first of row 1
  g = grid([5, 5, 5, 5, 5, 5, 5, 5, 3, 7]);
  assert.ok(canPair(g, 8, 9));
  // column (index 0 and 18 with 9 cleared)
  g = grid([2, 1, 1, 1, 1, 1, 1, 1, 1, null, 1, 1, 1, 1, 1, 1, 1, 1, 8]);
  assert.ok(canPair(g, 0, 18));
  g[9] = { id: 9, v: 4 };
  assert.equal(whyNot(g, 0, 18), 'blocked');
  // diagonal ↘ (0 → 10)
  g = grid([6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4]);
  assert.ok(canPair(g, 0, 10));
  // diagonal ↙ (8 → 16)
  g = grid([1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 1, 7]);
  assert.ok(canPair(g, 8, 16));
  // not a line
  g = grid([3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 7]);
  assert.equal(whyNot(g, 0, 11), 'blocked');
});

test('collapse removes empty rows and trailing blanks', () => {
  const g = grid([1, 2, 3, 4, 5, 6, 7, 8, 9, null, null, null, null, null, null, null, null, null, 4, null]);
  const r = collapse(g);
  assert.equal(r.rows, 1);
  assert.deepEqual(r.cells.map((c) => c.v), [1, 2, 3, 4, 5, 6, 7, 8, 9, 4]);
});

test('levels 1–150: always clearable without ➕, deterministic', () => {
  for (let n = 1; n <= 150; n++) {
    const l = generateTen(n);
    let s = initialTen(l);
    for (const [a, b] of l.solution) {
      const i = s.cells.findIndex((c) => c.id === a);
      const j = s.cells.findIndex((c) => c.id === b);
      const r = applyMatch(s, i, j);
      assert.ok(r, `level ${n}: solution step blocked`);
      s = r!.state;
    }
    assert.equal(s.cells.length, 0, `level ${n} not cleared`);
    if (n % 30 === 0) assert.deepEqual(generateTen(n).cells, l.cells);
  }
});

test('➕ appends remaining digits and spends one add', () => {
  const l = generateTen(5);
  const s = initialTen(l);
  const a = applyAdd(s)!;
  assert.equal(a.cells.length, s.cells.length * 2);
  assert.equal(a.adds, s.adds - 1);
});
