/**
 * Reward gate. v1.0 (closed test) ships with NO ads and NO purchases, so every
 * reward is granted immediately. v1.0.1 wires this to AdMob rewarded ads + the
 * RevenueCat "Ad-free" entitlement without touching the game screens.
 */
export type RewardKind = 'board-hint' | 'daily-hint' | 'reveal-solution' | 'save-streak';

export const ADS_ENABLED = false;

export async function requestReward(_kind: RewardKind): Promise<boolean> {
  return true;
}
