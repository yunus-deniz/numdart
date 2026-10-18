/** Home: pick one of the three games. */
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { IconBtn, Screen } from '../components/ui';
import { tenColor } from '../components/TenTile';
import { boardStore, dailyStore, tenStore } from '../lib/state';
import { useStore } from '../lib/store';
import { localDateISO } from '../engine/dates';
import { fonts, NUM_SCALE, useTheme } from '../lib/theme';
import { haptic, sound } from '../lib/feedback';

const LOGO = 'Digitopia';

export default function HomeScreen() {
  const c = useTheme();
  const { t } = useTranslation();
  const board = useStore(boardStore);
  const ten = useStore(tenStore);
  const daily = useStore(dailyStore);
  const doneToday = !!daily.records[localDateISO()]?.finished;

  const go = (href: Href) => {
    sound('tap');
    haptic.tap();
    router.push(href);
  };

  return (
    <Screen>
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
        <IconBtn label="⚙" a11y={t('settings')} onPress={() => router.push('/settings')} />
        <IconBtn label="📊" a11y={t('stats')} onPress={() => router.push('/stats')} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Logo: each letter in one of the game colours */}
        <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 22 }}>
          <View style={{ flexDirection: 'row' }} accessibilityRole="header" accessibilityLabel={LOGO}>
            {LOGO.split('').map((ch, i) => (
              <Text key={i} allowFontScaling={false} style={{ fontFamily: fonts.num, fontSize: 42, color: tenColor((i % 9) + 1, c.dark), letterSpacing: 0.5 }}>
                {ch}
              </Text>
            ))}
          </View>
          <Text style={{ fontFamily: fonts.uiSemi, fontSize: 15, color: c.text2, marginTop: 2 }}>{t('menuSub')}</Text>
        </View>

        <View style={{ gap: 14 }}>
          <GameCard
            index={0}
            color={c.primary}
            title={t('popTitle')}
            desc={t('popDesc')}
            badge={t('level', { n: board.level })}
            art={<PopArt />}
            onPress={() => go('/pop')}
          />
          <GameCard
            index={1}
            color={c.dark ? '#E11D48' : '#E11D48'}
            title={t('tenTitle')}
            desc={t('tenDesc')}
            badge={t('level', { n: ten.level })}
            art={<TenArt />}
            onPress={() => go('/ten')}
          />
          <GameCard
            index={2}
            color={c.dark ? '#0F766E' : '#0D9488'}
            title={t('targetTitle')}
            desc={t('targetDesc')}
            badge={doneToday ? t('menuDone') : t('menuReady')}
            dot={!doneToday}
            art={<TargetArt />}
            onPress={() => go('/daily')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function GameCard({
  index,
  color,
  title,
  desc,
  badge,
  dot,
  art,
  onPress,
}: {
  index: number;
  color: string;
  title: string;
  desc: string;
  badge: string;
  dot?: boolean;
  art: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 90).duration(380)}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${desc}. ${badge}`}>
        {({ pressed }) => (
          <View style={{ borderRadius: 24, backgroundColor: shade(color), paddingBottom: pressed ? 2 : 5, marginTop: pressed ? 3 : 0 }}>
            <View style={{ borderRadius: 24, backgroundColor: color, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 128, overflow: 'hidden' }}>
              {/* soft decorative circles */}
              <View style={{ position: 'absolute', right: -30, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.10)' }} />
              <View style={{ position: 'absolute', right: 40, bottom: -50, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.07)' }} />
              <View style={{ flex: 1 }}>
                <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.num, fontSize: 28, color: '#fff' }}>
                  {title}
                </Text>
                <Text numberOfLines={2} style={{ fontFamily: fonts.ui, fontSize: 14, lineHeight: 19, color: 'rgba(255,255,255,0.88)', marginTop: 2 }}>
                  {desc}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.20)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {dot && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FDE047' }} />}
                    <Text numberOfLines={1} style={{ fontFamily: fonts.uiBold, fontSize: 12, color: '#fff' }}>
                      {badge}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ width: 92, alignItems: 'center', justifyContent: 'center' }}>{art}</View>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Tiny illustrations made of real game tiles. */
function MiniTile({ v, bg, fg, size = 34, rot = 0 }: { v: string; bg: string; fg: string; size?: number; rot?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'rgba(0,0,0,0.18)',
        transform: [{ rotate: `${rot}deg` }],
      }}
    >
      <Text allowFontScaling={false} style={{ fontFamily: fonts.num, fontSize: size * 0.5, color: fg }}>
        {v}
      </Text>
    </View>
  );
}

function PopArt() {
  return (
    <View style={{ gap: 6, alignItems: 'center' }}>
      <MiniTile v="10" bg="#fff" fg="#EA580C" size={40} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <MiniTile v="6" bg="rgba(255,255,255,0.9)" fg="#4F46E5" rot={-6} />
        <MiniTile v="4" bg="rgba(255,255,255,0.9)" fg="#4F46E5" rot={6} />
      </View>
    </View>
  );
}

function TenArt() {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <MiniTile v="3" bg="#fff" fg="#059669" rot={-5} />
        <MiniTile v="7" bg="#fff" fg="#059669" rot={4} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <MiniTile v="1" bg="#fff" fg="#E11D48" rot={3} />
        <MiniTile v="9" bg="#fff" fg="#E11D48" rot={-4} />
      </View>
    </View>
  );
}

function TargetArt() {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ paddingHorizontal: 10, height: 40, borderRadius: 12, borderWidth: 3, borderColor: '#FDBA74', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Text allowFontScaling={false} style={{ fontFamily: fonts.num, fontSize: 22, color: '#0F172A' }}>
          373
        </Text>
      </View>
      <Text allowFontScaling={false} style={{ fontFamily: fonts.num, fontSize: 18, color: '#fff' }}>
        + − × ÷
      </Text>
    </View>
  );
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 50);
  const g = Math.max(0, ((n >> 8) & 255) - 50);
  const b = Math.max(0, (n & 255) - 50);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
