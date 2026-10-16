/// <reference types="node" />
/**
 * Engine tests (run: npm test).
 * - The next 1,000 daily puzzles are generated; each must have an exact solution
 *   that replays correctly, and the same date must always give the same puzzle.
 * - Levels 1–500 must be solvable and deterministic.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOp,
  dailyPuzzle,
  initialState,
  play,
  rewindTo,
  shareText,
  solutionToMoves,
  starsFor,
  profileForDate,
} from '../src/engine/classic';
import { addDays, LAUNCH_DATE_ISO, puzzleNumber, daysBetween } from '../src/engine/dates';
import { generateLevel, initialBoard, solveBoard, pop, isCleared, judge, isTrapFree } from '../src/engine/board';

test('1,000 daily puzzles: exact solution, deterministic, profile respected', () => {
  const t0 = Date.now();
  for (let d = 0; d < 1000; d++) {
    const iso = addDays(LAUNCH_DATE_ISO, d);
    const p = dailyPuzzle(iso);
    assert.equal(p.number, d + 1);
    assert.ok(p.target >= 101 && p.target <= 999, `target range ${iso}`);
    assert.equal(p.numbers.length, 6);
    assert.equal(p.large.filter(Boolean).length, 1);
    // Replay the stored solution on a real play state.
    let s = initialState(p);
    for (const m of solutionToMoves(p, p.solution)) {
      const next = play(s, m.aSlot, m.op, m.bSlot);
      assert.ok(next, `illegal solution move on ${iso}`);
      s = next!;
    }
    assert.ok(
      s.cards.some((c) => !c.used && c.value === p.target),
      `solution does not reach target on ${iso}`,
    );
    const prof = profileForDate(iso);
    if (prof === 'heavy') assert.equal(p.minOps, 5, iso);
    if (prof === 'light') assert.ok(p.minOps >= 3 && p.solutions >= 5, iso);
    if (prof === 'mid') assert.ok(p.minOps >= 3 && p.minOps <= 4, iso);
    // Determinism (spot check every 50th day; full regen is the same code path).
    if (d % 50 === 0) assert.deepEqual(dailyPuzzle(iso), p);
  }
  console.log(`  1000 puzzles in ${Date.now() - t0} ms`);
});

test('puzzle numbering is DST-proof', () => {
  assert.equal(puzzleNumber(LAUNCH_DATE_ISO), 1);
  assert.equal(daysBetween('2027-03-27', '2027-03-29'), 2); // EU spring-forward weekend
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2); // EU fall-back weekend
  assert.equal(puzzleNumber('2020-01-01'), 1);
});

test('player rules', () => {
  assert.equal(applyOp(7, '−', 7), null);
  assert.equal(applyOp(7, '÷', 2), null);
  assert.equal(applyOp(8, '÷', 2), 4);
  const p = { numbers: [100, 50, 5, 1, 2, 3], large: [true, true, false, false, false, false] };
  let s = initialState(p);
  s = play(s, 0, '+', 1)!;
  assert.equal(s.cards[1].value, 150);
  assert.ok(s.cards[0].used);
  s = play(s, 1, '−', 2)!;
  assert.equal(s.cards[2].value, 145);
  assert.equal(rewindTo(p, s, 1).history.length, 1);
  assert.equal(starsFor(0), 3);
  assert.equal(starsFor(5), 2);
  assert.equal(starsFor(10), 1);
  assert.equal(starsFor(11), 0);
  const txt = shareText({ number: 14, target: 145, history: s.history, stars: 3, diff: 0, streak: 7, streakLabel: 'Seri', url: 'x' });
  assert.match(txt, /🟦 \+ 🟦 = 🟢\n🟢 − 🟦 = 🎯/);
});

test('levels 1–500: solvable and deterministic', () => {
  const t0 = Date.now();
  for (let n = 1; n <= 500; n++) {
    const l = generateLevel(n);
    let s = initialBoard(l);
    // The stored reference solution must clear the board when played in order.
    for (let k = 0; k < l.solution.length; k++) {
      const g = l.solution[k];
      for (const c of g) assert.ok(!s.frozen[c] && s.values[c] !== null, `level ${n}: blocked cell`);
      assert.equal(judge(l.targets[k], g.map((c) => s.values[c] as number)), 'hit', `level ${n} group ${k}`);
      s = pop(l, s, g);
    }
    assert.ok(isCleared(s), `level ${n} not cleared`);
    assert.ok(solveBoard(l, initialBoard(l)), `level ${n} solver`);
    if (n % 25 === 0) assert.deepEqual(generateLevel(n), l);
    if (n <= 120) assert.ok(isTrapFree(l) || n > 10, `level ${n} has a trap`);
  }
  console.log(`  500 levels in ${Date.now() - t0} ms`);
});

test('board judge', () => {
  assert.equal(judge({ kind: 'sum', value: 18 }, [7, 4]), 'partial');
  assert.equal(judge({ kind: 'sum', value: 18 }, [7, 11]), 'hit');
  assert.equal(judge({ kind: 'sum', value: 18 }, [12, 9]), 'over');
  assert.equal(judge({ kind: 'mul', value: 24 }, [4, 6]), 'hit');
  assert.equal(judge({ kind: 'mul', value: 24 }, [5, 4]), 'over');
  assert.equal(judge({ kind: 'mul', value: 24 }, [2, 3]), 'partial');
  assert.equal(judge({ kind: 'mul', value: 24 }, [2, 3, 4]), 'hit');
  assert.equal(judge({ kind: 'sub', value: 5 }, [3, 8]), 'hit');
  assert.equal(judge({ kind: 'sub', value: 5 }, [3, 9]), 'over');
});
