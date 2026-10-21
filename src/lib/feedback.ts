/** Sound + haptics, both respecting the user's settings. */
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { settingsStore } from './state';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  undo: require('../../assets/sounds/undo.wav'),
  win: require('../../assets/sounds/win.wav'),
  error: require('../../assets/sounds/error.wav'),
};
export type SoundName = keyof typeof SOURCES;

let players: Partial<Record<SoundName, AudioPlayer>> = {};
let ready = false;

export function initSounds() {
  if (ready) return;
  ready = true;
  try {
    // Respect the phone's silent switch and mix with the user's music.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    (Object.keys(SOURCES) as SoundName[]).forEach((k) => {
      players[k] = createAudioPlayer(SOURCES[k]);
    });
  } catch {
    players = {};
  }
}

export function sound(name: SoundName) {
  if (!settingsStore.get().sound) return;
  const p = players[name];
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch {
    /* ignore */
  }
}

const canBuzz = Platform.OS !== 'web';

export const haptic = {
  tap() {
    if (canBuzz && settingsStore.get().haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  pop() {
    if (canBuzz && settingsStore.get().haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  success() {
    if (canBuzz && settingsStore.get().haptics)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error() {
    if (canBuzz && settingsStore.get().haptics)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
