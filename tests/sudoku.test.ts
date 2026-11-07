/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conflicts, countSolutions, generateSudoku, normalizeMode, parseMode, SUDOKU_MODES } from '../src/engine/sudoku';

test('every size × level makes a valid, uniquely solvable puzzle', () => {
  for (const mode of SUDOKU_MODES) {
    for (let seed = 1; seed <= 5; seed++) {
      const p = generateSudoku(mode, seed);
      assert.equal(p.solution.length, p.n * p.n);
      assert.ok(p.solution.every((v) => v >= 1 && v <= p.n), `${mode} solution filled`);
      assert.equal(conflicts(p.solution, p.n, p.region).size, 0, `${mode} solution valid`);
      p.puzzle.forEach((v, i) => v && assert.equal(v, p.solution[i]));
      assert.equal(countSolutions(p.puzzle, p.n, p.region, 2), 1, `${mode}/${seed} unique`);
      assert.deepEqual(generateSudoku(mode, seed), p);
    }
  }
});

test('harder levels leave fewer numbers on the board', () => {
  for (const size of [4, 5, 6, 9]) {
    const givens = (l: string) => {
      let sum = 0;
      for (let seed = 1; seed <= 5; seed++) sum += generateSudoku(`${size}-${l}`, seed).puzzle.filter(Boolean).length;
      return sum;
    };
    assert.ok(givens('easy') > givens('medium') && givens('medium') > givens('hard') && givens('hard') >= givens('extreme'), `size ${size}`);
  }
});

test('5×5 regions have five cells each', () => {
  const p = generateSudoku('5-easy', 1);
  for (let r = 0; r < 5; r++) assert.equal(p.region.filter((x) => x === r).length, 5);
});

test('old saved modes still load', () => {
  assert.deepEqual(parseMode('mini4'), { size: 4, level: 'medium' });
  assert.deepEqual(parseMode('mini6'), { size: 6, level: 'medium' });
  assert.equal(normalizeMode('hard'), '9-hard');
  assert.equal(normalizeMode('garbage'), '4-easy');
});
