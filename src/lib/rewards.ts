/**
 * Reward gate used by the game screens (hints, reveal solution, save streak).
 * - Ad-free owners get rewards without ads.
 * - Otherwise a rewarded ad is shown; closing it early gives no reward.
 * - If no ad can be shown (offline, no fill, no consent) the reward is granted anyway,
 *   so a player is never stuck because of the ad network.
 */
import { adStore, showRewarded } from './ads';

export type RewardKind = 'board-hint' | 'daily-hint' | 'reveal-solution' | 'save-streak' | 'lock-hint' | 'sudoku-hint';

export const ADS_ENABLED = true;

export async function requestReward(_kind: RewardKind): Promise<boolean> {
  if (adStore.get().adsRemoved) return true;
  const r = await showRewarded();
  return r !== false;
}
