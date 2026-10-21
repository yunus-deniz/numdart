/**
 * Tiny persisted stores on top of MMKV (local only, no account, no backend).
 * Each store is a JSON blob under one key, observable with useSyncExternalStore.
 */
import { useSyncExternalStore } from 'react';
import { createMMKV } from 'react-native-mmkv';

export const mmkv = createMMKV({ id: 'numdart' });

export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: () => void): () => void;
}

export function persistedStore<T extends object>(key: string, defaults: T): Store<T> {
  let value: T = defaults;
  try {
    const raw = mmkv.getString(key);
    if (raw) value = { ...defaults, ...JSON.parse(raw) };
  } catch {
    value = defaults;
  }
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (p: T) => T)(value) : next;
      try {
        mmkv.set(key, JSON.stringify(value));
      } catch {
        // storage is best-effort; the game keeps running in memory
      }
      listeners.forEach((l) => l());
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
