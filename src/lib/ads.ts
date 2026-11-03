/**
 * AdMob + UMP (GDPR consent).
 * - Consent is gathered once at launch (EEA/UK/CH only; elsewhere the form is skipped).
 * - Ads are requested only when UMP says `canRequestAds`.
 * - One rewarded and one interstitial instance are kept loaded and re-loaded after each show.
 * Placement rules (spec §Gelir) live in `maybeShowInterstitial`.
 */
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  MaxAdContentRating,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { persistedStore } from './store';

const AD_UNITS = {
  rewarded: 'ca-app-pub-2331976932548666/7527199783',
  interstitial: 'ca-app-pub-2331976932548666/1625678401',
};

/** Real ad units only in release builds; Google test ads while developing. */
const unit = (k: keyof typeof AD_UNITS) =>
  __DEV__ ? (k === 'rewarded' ? TestIds.REWARDED : TestIds.INTERSTITIAL) : AD_UNITS[k];

const SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

// ───────────── Persisted ad state ─────────────
export interface AdState {
  /** set by the one-time "Ad-free" purchase (RevenueCat, coming next) */
  adsRemoved: boolean;
  lastInterstitialAt: number;
  /** levels finished since the last interstitial (Board Clear + Number Ten) */
  levelsSinceInterstitial: number;
}
export const adStore = persistedStore<AdState>('ads', {
  adsRemoved: false,
  lastInterstitialAt: 0,
  levelsSinceInterstitial: 0,
});

const INTERSTITIAL_EVERY_LEVELS = 5;
const INTERSTITIAL_MIN_GAP_MS = 4 * 60 * 1000;
const NO_INTERSTITIAL_BEFORE_LEVEL = 6; // none in the first 5 levels

// ───────────── Init + consent ─────────────
let ready = false;
let initPromise: Promise<void> | null = null;
let privacyOptionsRequired = false;

let rewarded: RewardedAd | null = null;
let interstitial: InterstitialAd | null = null;

export function initAds(): Promise<void> {
  if (!SUPPORTED) return Promise.resolve();
  initPromise ??= (async () => {
    try {
      const info = await AdsConsent.gatherConsent();
      privacyOptionsRequired = info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
      if (!info.canRequestAds) return;
    } catch {
      // Consent service unreachable (offline): fall back to whatever was stored last time.
      try {
        const info = await AdsConsent.getConsentInfo();
        privacyOptionsRequired = info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
        if (!info.canRequestAds) return;
      } catch {
        return;
      }
    }
    try {
      await mobileAds().setRequestConfiguration({ maxAdContentRating: MaxAdContentRating.G });
      await mobileAds().initialize();
      ready = true;
      preload();
    } catch {
      ready = false;
    }
  })();
  return initPromise;
}

function preload() {
  if (!ready) return;
  if (!rewarded) {
    rewarded = RewardedAd.createForAdRequest(unit('rewarded'));
    rewarded.addAdEventListener(AdEventType.ERROR, () => retryLater(() => rewarded?.load()));
  }
  rewarded.load();
  if (adStore.get().adsRemoved) return;
  if (!interstitial) {
    interstitial = InterstitialAd.createForAdRequest(unit('interstitial'));
    interstitial.addAdEventListener(AdEventType.ERROR, () => retryLater(() => interstitial?.load()));
  }
  interstitial.load();
}

function retryLater(fn: () => void) {
  setTimeout(fn, 60_000);
}

export function isPrivacyOptionsRequired() {
  return privacyOptionsRequired;
}

/** "Privacy options / ad consent" button in Settings (only shown where required). */
export async function showPrivacyOptions() {
  if (!SUPPORTED) return;
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch {
    // form not available right now
  }
}

// ───────────── Rewarded ─────────────
/**
 * Shows a rewarded ad. Resolves true when the reward was earned.
 * Resolves `null` when no ad could be shown (not loaded / no fill / offline / no consent),
 * so the caller can decide to grant the reward anyway.
 */
export function showRewarded(): Promise<boolean | null> {
  const cur = rewarded;
  if (!ready || !cur || !cur.loaded) {
    preload();
    return Promise.resolve(null);
  }
  const ad: RewardedAd = cur;
  return new Promise((resolve) => {
    let earned = false;
    const subs = [
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => done(earned)),
      ad.addAdEventListener(AdEventType.ERROR, () => done(null)),
    ];
    let finished = false;
    function done(v: boolean | null) {
      if (finished) return;
      finished = true;
      subs.forEach((off) => off());
      ad.load();
      resolve(v);
    }
    ad.show().catch(() => done(null));
  });
}

// ───────────── Interstitial ─────────────
/** Call when a level of Board Clear / Number Ten is finished (never on the Daily result). */
export async function maybeShowInterstitial(finishedLevel: number): Promise<void> {
  const s = adStore.get();
  if (s.adsRemoved) return;
  const count = s.levelsSinceInterstitial + 1;
  adStore.set((p) => ({ ...p, levelsSinceInterstitial: count }));
  if (finishedLevel < NO_INTERSTITIAL_BEFORE_LEVEL) return;
  if (count < INTERSTITIAL_EVERY_LEVELS) return;
  if (Date.now() - s.lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS) return;
  const cur = interstitial;
  if (!ready || !cur || !cur.loaded) {
    preload();
    return;
  }
  const ad: InterstitialAd = cur;
  await new Promise<void>((resolve) => {
    const subs = [
      ad.addAdEventListener(AdEventType.CLOSED, () => done()),
      ad.addAdEventListener(AdEventType.ERROR, () => done()),
    ];
    let finished = false;
    function done() {
      if (finished) return;
      finished = true;
      subs.forEach((off) => off());
      ad.load();
      resolve();
    }
    adStore.set((p) => ({ ...p, levelsSinceInterstitial: 0, lastInterstitialAt: Date.now() }));
    ad.show().catch(() => done());
  });
}
