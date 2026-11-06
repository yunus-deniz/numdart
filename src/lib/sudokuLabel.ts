import type { SudokuMode } from '../engine/sudoku';

export function modeLabel(t: (k: string) => string, m: SudokuMode) {
  return m === 'mini4' ? t('sudMini4') : m === 'mini6' ? t('sudMini6') : m === 'easy' ? t('sudEasy') : m === 'medium' ? t('sudMedium') : t('sudHard');
}
