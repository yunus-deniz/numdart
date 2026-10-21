import { dailyPuzzle, generatePuzzle, type Difficulty, type Puzzle } from '../engine/classic';
import { mmkv } from './store';

const memo = new Map<string, Puzzle>();

/** Today's puzzle, generated once per date and cached (generation is deterministic anyway). */
export function getDailyPuzzle(iso: string): Puzzle {
  const hit = memo.get(iso);
  if (hit) return hit;
  const key = `puzzle:v2:${iso}`;
  try {
    const raw = mmkv.getString(key);
    if (raw) {
      const p = JSON.parse(raw) as Puzzle;
      memo.set(iso, p);
      return p;
    }
  } catch {
    /* regenerate */
  }
  const p = dailyPuzzle(iso);
  memo.set(iso, p);
  try {
    mmkv.set(key, JSON.stringify(p));
  } catch {
    /* ignore */
  }
  return p;
}

export function msUntilLocalMidnight(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function formatHMS(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

const unlimitedMemo = new Map<string, ReturnType<typeof generatePuzzle>>();

/** An endless-mode puzzle; deterministic per (seed, difficulty) so resuming shows the same one. */
export function getUnlimitedPuzzle(seed: number, difficulty: Difficulty) {
  const key = `${seed}:${difficulty}`;
  let p = unlimitedMemo.get(key);
  if (!p) {
    p = generatePuzzle(seed, difficulty, difficulty === 'hard' ? 'heavy' : 'any');
    unlimitedMemo.set(key, p);
  }
  return p;
}
