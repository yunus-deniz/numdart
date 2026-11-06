/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conflicts, countSolutions, generateSudoku, SUDOKU_MODES } from '../src/engine/sudoku';

test('every mode makes a valid, uniquely solvable puzzle', () => {
  for (const mode of SUDOKU_MODES) {
    for (let seed = 1; seed <= 8; seed++) {
      const p = generateSudoku(mode, seed);
      assert.equal(p.solution.length, p.n * p.n);
      assert.equal(conflicts(p.solution, p.n, p.boxR, p.boxC).size, 0, `${mode} solution valid`);
      p.puzzle.forEach((v, i) => v && assert.equal(v, p.solution[i]));
      assert.equal(countSolutions(p.puzzle, p.n, p.boxR, p.boxC, 2), 1, `${mode}/${seed} unique`);
      assert.deepEqual(generateSudoku(mode, seed), p);
    }
  }
});
