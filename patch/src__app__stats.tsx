import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, IconBtn } from '../components/ui';
import { boardStore, liveStreak, statsStore, tenStore, unlimitedStore } from '../lib/state';
import { useStore } from '../lib/store';
import { fonts, NUM_SCALE, useTheme } from '../lib/theme';
import { localDateISO } from '../engine/dates';

export default function StatsScreen() {
  const c = useTheme();
  const { t } = useTranslation();
  const s = useStore(statsStore);
  const b = useStore(boardStore);
  const u = useStore(unlimitedStore);
  const ten = useStore(tenStore);
  const pct = s.played ? Math.round((s.exact / s.played) * 100) : 0;
  const maxBar = Math.max(1, ...s.dist);
  const tiles: [string, string | number][] = [
    [t('played'), s.played],
    [t('successPct'), pct],
    [t('curStreak'), liveStreak(s, localDateISO())],
    [t('maxStreak'), s.maxStreak],
  ];
  return (
    <Screen>
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontFamily: fonts.uiBold, fontSize: 20, color: c.text }}>{t('stats')}</Text>
        <IconBtn label="✕" a11y={t('close')} onPress={() => router.back()} />
      </View>

      <Text style={{ fontFamily: fonts.uiBold, fontSize: 13, color: c.text2, marginTop: 12, letterSpacing: 1 }}>🎯 {t('daily').toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
        {tiles.map(([label, v]) => (
          <View key={label} style={{ flex: 1, alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border }}>
            <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.num, fontSize: 26, color: c.text }}>
              {v}
            </Text>
            <Text numberOfLines={2} style={{ fontFamily: fonts.ui, fontSize: 11, color: c.text2, textAlign: 'center', marginTop: 2 }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={{ fontFamily: fonts.uiBold, fontSize: 13, color: c.text2, marginTop: 24, letterSpacing: 1 }}>{t('starDist').toUpperCase()}</Text>
      <View style={{ marginTop: 10, gap: 8 }}>
        {[3, 2, 1, 0].map((k) => {
          const n = s.dist[k];
          const color = k === 3 ? c.exact : k === 2 ? c.near : k === 1 ? c.far : c.text2;
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLabel={`${k}★: ${n}`}>
              <Text style={{ width: 64, fontSize: 14, color: c.text }}>{k ? '⭐'.repeat(k) : '0'}</Text>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    width: `${Math.max(8, (n / maxBar) * 100)}%`,
                    backgroundColor: n ? color : c.border,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    alignItems: 'flex-end',
                  }}
                >
                  <Text style={{ color: '#fff', fontFamily: fonts.numSemi, fontSize: 13 }}>{n}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={{ fontFamily: fonts.uiBold, fontSize: 13, color: c.text2, marginTop: 24, letterSpacing: 1 }}>{t('levelsTitle').toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ fontFamily: fonts.num, fontSize: 26, color: c.text }}>{b.maxLevel}</Text>
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: c.text2 }}>{t('bestLevel')}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border, marginLeft: 8 }}>
          <Text style={{ fontFamily: fonts.num, fontSize: 26, color: c.text }}>{u.exact}</Text>
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: c.text2 }}>{t('unlimitedPlayed')}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: c.surface, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: c.border, marginLeft: 8 }}>
          <Text style={{ fontFamily: fonts.num, fontSize: 26, color: c.text }}>{ten.maxLevel}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: fonts.ui, fontSize: 11, color: c.text2 }}>{t('tenBest')}</Text>
        </View>
      </View>
    </Screen>
  );
}
