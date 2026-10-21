import { useColorScheme } from 'react-native';
import { settingsStore } from './state';
import { useStore } from './store';

export interface Palette {
  dark: boolean;
  bg: string;
  surface: string;
  lip: string;
  bigCard: string;
  bigLip: string;
  primary: string;
  accent: string;
  exact: string;
  near: string;
  far: string;
  text: string;
  text2: string;
  border: string;
  frost: string;
  onPrimary: string;
}

export const light: Palette = {
  dark: false,
  bg: '#F8F6F0',
  surface: '#FFFFFF',
  lip: '#E2DEC9',
  bigCard: '#EEF2FF',
  bigLip: '#C7D2FE',
  primary: '#4F46E5',
  accent: '#EA580C',
  exact: '#0D9488',
  near: '#D97706',
  far: '#E11D48',
  text: '#1E293B',
  text2: '#64748B',
  border: '#E7E3D4',
  frost: '#DBEAFE',
  onPrimary: '#FFFFFF',
};

export const dark: Palette = {
  dark: true,
  bg: '#0F172A',
  surface: '#1E293B',
  lip: '#090D16',
  bigCard: '#1E1B4B',
  bigLip: '#4F46E5',
  primary: '#6366F1',
  accent: '#F97316',
  exact: '#14B8A6',
  near: '#F59E0B',
  far: '#F43F5E',
  text: '#F8FAFC',
  text2: '#94A3B8',
  border: '#334155',
  frost: '#1E3A5F',
  onPrimary: '#FFFFFF',
};

export function useTheme(): Palette {
  const sys = useColorScheme();
  const { theme } = useStore(settingsStore);
  const isDark = theme === 'dark' || (theme === 'system' && sys === 'dark');
  return isDark ? dark : light;
}

export const fonts = {
  num: 'SpaceGrotesk_700Bold',
  numSemi: 'SpaceGrotesk_600SemiBold',
  ui: 'PlusJakartaSans_500Medium',
  uiSemi: 'PlusJakartaSans_600SemiBold',
  uiBold: 'PlusJakartaSans_700Bold',
};

/** Large-text cap for numbers, target and top bar. */
export const NUM_SCALE = 1.15;
export const MAX_W = 480;
