import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { fonts, NUM_SCALE, useTheme } from '../lib/theme';

export interface TileProps {
  value: number | null;
  size: number;
  order: number; // 0 = not selected, 1..3 = selection order
  popping: boolean;
  over: boolean;
  frozen: boolean;
  pulse: boolean;
  onPress: () => void;
  testID?: string;
}

export const BoardTile = React.memo(function BoardTile({ value, size, order, popping, over, frozen, pulse, onPress, testID }: TileProps) {
  const c = useTheme();
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    press.value = withTiming(order > 0 ? 1 : 0, { duration: 90 });
  }, [order, press]);

  useEffect(() => {
    if (popping) scale.value = withSequence(withTiming(1.08, { duration: 130 }), withTiming(0, { duration: 230 }));
    else scale.value = 1;
  }, [popping, scale]);

  useEffect(() => {
    if (over) {
      shake.value = withSequence(
        withTiming(-7, { duration: 50 }),
        withTiming(7, { duration: 60 }),
        withTiming(-5, { duration: 60 }),
        withTiming(4, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [over, shake]);

  useEffect(() => {
    if (pulse && !popping) {
      scale.value = withRepeat(withSequence(withTiming(1.07, { duration: 420 }), withTiming(1, { duration: 420 })), -1);
    } else if (!popping) {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 100 });
    }
  }, [pulse, popping, scale]);

  const anim = useAnimatedStyle(() => ({
    opacity: popping ? Math.min(1, scale.value + 0.2) : 1,
    transform: [{ translateX: shake.value }, { translateY: press.value * 2 }, { scale: scale.value }],
  }));

  if (value === null) {
    return <View style={{ width: size, height: size, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, opacity: 0.6 }} />;
  }

  const selected = order > 0;
  let face = c.surface;
  let lip = c.lip;
  let fg = c.text;
  if (selected) {
    face = c.primary;
    lip = c.dark ? '#3730A3' : '#3730A3';
    fg = c.onPrimary;
  }
  if (over) {
    face = c.far;
    lip = '#9F1239';
    fg = '#FFFFFF';
  }
  if (popping) {
    face = c.exact;
    lip = '#115E59';
    fg = '#FFFFFF';
  }
  if (frozen) {
    face = c.frost;
    lip = c.dark ? '#0B2540' : '#BFDBFE';
    fg = c.text2;
  }
  const lipH = selected ? 2 : 4;
  const label = frozen ? t('a11yFrozen', { v: value }) : t('a11yTile', { v: value }) + (selected ? `, ${t('a11ySelected')}` : '');

  return (
    <Pressable testID={testID} onPress={onPress} disabled={frozen || popping} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled: frozen }}>
      <Animated.View style={[{ width: size, height: size }, anim]}>
        <View style={{ flex: 1, borderRadius: 16, backgroundColor: lip, paddingBottom: lipH }}>
          <View
            style={{
              flex: 1,
              borderRadius: 16,
              backgroundColor: face,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: selected || popping || over ? 0 : 1,
              borderColor: c.border,
            }}
          >
            <Text
              maxFontSizeMultiplier={NUM_SCALE}
              style={{ fontFamily: fonts.num, fontSize: Math.round(size * 0.38), color: fg, fontVariant: ['tabular-nums'] }}
            >
              {value}
            </Text>
            {selected && (
              <Text style={{ position: 'absolute', top: 4, right: 8, color: fg, fontSize: 12, letterSpacing: 1 }}>{'•'.repeat(order)}</Text>
            )}
            {frozen && <Text style={{ position: 'absolute', top: 3, right: 6, fontSize: 13 }}>❄</Text>}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});
