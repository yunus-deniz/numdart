import React, { useEffect } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { targetLabel, type Target } from '../engine/board';
import { fonts, MAX_W, NUM_SCALE, useTheme } from '../lib/theme';

export function TargetQueue({ targets, index }: { targets: Target[]; index: number }) {
  const c = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const col = (Math.min(width, MAX_W) - 32 - 88) / 2 - 10;
  const nextW = Math.min(60, Math.floor((col - 6) / 2));
  const nextH = Math.round(nextW * 0.8);
  const bump = useSharedValue(1);
  useEffect(() => {
    bump.value = withSequence(withTiming(1.12, { duration: 120 }), withTiming(1, { duration: 160 }));
  }, [index, bump]);
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));
  const active = targets[index];
  const next = targets.slice(index + 1, index + 3);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 72 }}>
      <View style={{ flex: 1 }} />
      {active ? (
        <Animated.View
          accessibilityLabel={t('a11yTarget', { t: targetLabel(active) })}
          style={[
            {
              width: 88,
              height: 64,
              borderRadius: 16,
              borderWidth: 3,
              borderColor: c.accent,
              backgroundColor: c.surface,
              alignItems: 'center',
              justifyContent: 'center',
            },
            bumpStyle,
          ]}
        >
          <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.num, fontSize: 30, color: c.text, fontVariant: ['tabular-nums'] }}>
            {targetLabel(active)}
          </Text>
        </Animated.View>
      ) : (
        <View style={{ width: 88, height: 64 }} />
      )}
      <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
        {next.map((tg, i) => (
          <View
            key={index + i + 1}
            style={{
              width: nextW,
              height: nextH,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: c.border,
              backgroundColor: c.surface,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
            }}
          >
            <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.numSemi, fontSize: Math.round(nextW * 0.32), color: c.text2, fontVariant: ['tabular-nums'] }}>
              {targetLabel(tg)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
