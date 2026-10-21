/** All persisted app state: settings, board progress, daily records, statistics. */
import { persistedStore } from './store';
import type { BoardState } from '../engine/board';
import type { Move } from '../engine/classic';
import type { TenState } from '../engine/ten';
import { addDays } from '../engine/dates';

// ───────────── Settings ─────────────
export type ThemePref = 'system' | 'light' | 'dark';
export type LangPref = 'system' | 'tr' | 'en';
export interface Settings {
  sound: boolean;
  haptics: boolean;
  theme: ThemePref;
  lang: LangPref;
}
export const settingsStore = persistedStore<Settings>('settings', {
  sound: true,
  haptics: true,
  theme: 'system',
  lang: 'system',
});

// ───────────── Board Clear progress ─────────────
export interface BoardProgress {
  level: number;
  maxLevel: number;
  /** in-progress snapshot of the current level (resume after app restart) */
  current: null | {
    level: number;
    state: BoardState;
    history: BoardState[];
    undoUsed: boolean;
  };
  /** level 4 finished → Daily tab teaser */
  dailyUnlockedHint: boolean;
}
export const boardStore = persistedStore<BoardProgress>('board', {
  level: 1,
  maxLevel: 1,
  current: null,
  dailyUnlockedHint: false,
});

// ───────────── Daily Classic ─────────────
export interface DailyRecord {
  history: Move[];
  finished: boolean;
  stars: number;
  diff: number;
  /** 0 none, 1 first step shown, 2 unneeded numbers faded */
  hintLevel: number;
  /** best solution revealed after finishing */
  revealed: boolean;
}
export interface DailyStore {
  tutorialDone: boolean;
  records: Record<string, DailyRecord>;
  /** the latest local date the app has seen; guards against clock rollback */
  lastPlayedDateISO: string | null;
}
export const dailyStore = persistedStore<DailyStore>('daily', {
  tutorialDone: false,
  records: {},
  lastPlayedDateISO: null,
});

export const emptyRecord = (): DailyRecord => ({
  history: [],
  finished: false,
  stars: 0,
  diff: 0,
  hintLevel: 0,
  revealed: false,
});

// ───────────── Statistics ─────────────
export interface Stats {
  played: number;
  exact: number;
  currentStreak: number;
  maxStreak: number;
  lastCompletedISO: string | null;
  /** index = stars (0..3) */
  dist: [number, number, number, number];
}
export const statsStore = persistedStore<Stats>('stats', {
  played: 0,
  exact: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastCompletedISO: null,
  dist: [0, 0, 0, 0],
});

/** Streak shown today: broken if the last completed day is older than yesterday. */
export function liveStreak(s: Stats, todayISO: string): number {
  if (!s.lastCompletedISO) return 0;
  if (s.lastCompletedISO === todayISO || s.lastCompletedISO === addDays(todayISO, -1)) return s.currentStreak;
  return 0;
}

/** True when the device clock appears to have been moved back. */
export function clockRolledBack(todayISO: string): boolean {
  const last = dailyStore.get().lastPlayedDateISO;
  return !!last && todayISO < last;
}

/** Record a finished day (finishing keeps the streak even without an exact hit). */
export function recordFinish(todayISO: string, stars: number, diff: number) {
  if (clockRolledBack(todayISO)) return; // no streak/stat changes on a rolled-back clock
  statsStore.set((s) => {
    if (s.lastCompletedISO === todayISO) return s;
    const cont = s.lastCompletedISO === addDays(todayISO, -1);
    const currentStreak = cont ? s.currentStreak + 1 : 1;
    const dist = s.dist.slice() as Stats['dist'];
    dist[stars] += 1;
    return {
      played: s.played + 1,
      exact: s.exact + (diff === 0 ? 1 : 0),
      currentStreak,
      maxStreak: Math.max(s.maxStreak, currentStreak),
      lastCompletedISO: todayISO,
      dist,
    };
  });
}

export function touchDate(todayISO: string) {
  dailyStore.set((d) =>
    !d.lastPlayedDateISO || todayISO > d.lastPlayedDateISO ? { ...d, lastPlayedDateISO: todayISO } : d,
  );
}

// ───────────── Unlimited Classic (endless 6-number puzzles) ─────────────
export type UnlimitedDifficulty = 'easy' | 'medium' | 'hard';
export interface UnlimitedStore {
  difficulty: UnlimitedDifficulty;
  /** 0 = pick a fresh seed on next open */
  seed: number;
  record: DailyRecord;
  played: number;
  exact: number;
}
export const unlimitedStore = persistedStore<UnlimitedStore>('unlimited', {
  difficulty: 'medium',
  seed: 0,
  record: emptyRecord(),
  played: 0,
  exact: 0,
});

export function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0 || 1;
}

/** Load a brand-new unlimited puzzle (optionally switching difficulty). */
export function nextUnlimited(difficulty?: UnlimitedDifficulty) {
  unlimitedStore.set((u) => ({ ...u, difficulty: difficulty ?? u.difficulty, seed: freshSeed(), record: emptyRecord() }));
}

// ───────────── Number Ten (match equal digits or pairs that make 10) ─────────────
export interface TenProgress {
  level: number;
  maxLevel: number;
  /** in-progress snapshot (resume after app restart) */
  current: null | {
    level: number;
    state: TenState;
    history: TenState[];
  };
  stars: Record<number, number>;
  totalScore: number;
  rulesSeen: boolean;
}
export const tenStore = persistedStore<TenProgress>('ten', {
  level: 1,
  maxLevel: 1,
  current: null,
  stars: {},
  totalScore: 0,
  rulesSeen: false,
});
