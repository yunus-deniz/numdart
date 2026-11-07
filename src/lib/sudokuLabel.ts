import { parseMode, type SudokuLevel } from '../engine/sudoku';

const LEVEL_KEY: Record<SudokuLevel, string> = { easy: 'sudEasy', medium: 'sudMedium', hard: 'sudHard', extreme: 'sudExtreme' };

export const levelLabel = (t: (k: string) => string, l: SudokuLevel) => t(LEVEL_KEY[l]);

/** e.g. "5×5 · Kolay" */
export function modeLabel(t: (k: string) => string, m: string) {
  const { size, level } = parseMode(m);
  return `${size}×${size} · ${levelLabel(t, level)}`;
}
