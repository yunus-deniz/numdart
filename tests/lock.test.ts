/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, generateLock, isOpen, slotsFor } from '../src/engine/lock';

test('evaluate: precedence and exact division', () => {
  assert.equal(evaluate([2, 3, 4], ['+', '×']), 14);
  assert.equal(evaluate([8, 2, 3], ['÷', '−']), 1);
  assert.equal(evaluate([7, 2], ['÷']), null);
  assert.equal(evaluate([7, 0], ['÷']), null);
  assert.equal(evaluate([9, 4, 1], ['−', '−']), 4);
});

test('levels 1..60 are solvable and their stored solution opens the lock', () => {
  for (let lv = 1; lv <= 60; lv++) {
    const L = generateLock(lv);
    assert.equal(L.solution.length, slotsFor(lv));
    assert.equal(L.ops.length, slotsFor(lv) - 1);
    assert.ok(isOpen(L.solution, L), `level ${lv}`);
    assert.ok(L.solutions >= 1);
    assert.deepEqual(generateLock(lv), L, 'deterministic');
  }
});
