import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { fonts, useTheme } from '../lib/theme';

/** Digits that complete each other share a colour: 1·9, 2·8, 3·7, 4·6, 5·5. */
const FAMILY: Record<number, number> = { 1: 0, 9: 0, 2: 1, 8: 1, 3: 2, 7: 2, 4: 3, 6: 3, 5: 4 };
const LIGHT = ['#E11D48', '#EA580C', '#059669', '#0284C7', '#7C3AED'];
const DARK = ['#FB7185', '#FB923C', '#34D399', '#38BDF8', '#A78BFA'];

export function tenColor(v: number, dark: boolean): string {
  return (dark ? DARK : LIGHT)[FAMILY[v] ?? 4];
}

export interface TenTileProps {
  v: number | null;
  size: number;
  selected: boolean;
  /** legal partner of the selected tile */
  partner: boolean;
  /** shown by the hint */
  hinted: boolean;
  popping: boolean;
  rejected: number; // bump to shake
  fresh: boolean; // just added by "+"
  freshDelay: number;
  onPress: () => void;
}

export const TenTile = React.memo(function TenTile({ v, size, selected, partner, hinted, popping, rejected, fresh, freshDelay, onPress }: TenTileProps) {
  const c = useTheme();
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (popping) {
      scale.value = withSequence(withTiming(1.28, { duration: 120, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 200 }));
    } else if (selected) {
      cancelAnimation(scale);
      scale.value = withTiming(1.1, { duration: 110 });
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 110 });
    }
  }, [popping, selected, scale]);

  useEffect(() => {
    if (rejected) {
      shake.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 55 }),
        withTiming(-4, { duration: 55 }),
        withTiming(3, { duration: 55 }),
        withTiming(0, { duration: 45 }),
      );
    }
  }, [rejected, shake]);

  useEffect(() => {
    if (partner || hinted) {
      glow.value = withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0.25, { duration: 450 })), -1);
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: 120 });
    }
  }, [partner, hinted, glow]);

  const anim = useAnimatedStyle(() => ({
    opacity: popping ? Math.min(1, scale.value + 0.15) : 1,
    transform: [{ translateX: shake.value }, { scale: scale.value }],
  }));
  const ring = useAnimatedStyle(() => ({ opacity: glow.value }));

  if (v === null) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.border }} />
      </View>
    );
  }

  const col = tenColor(v, c.dark);
  const face = selected || popping ? col : c.dark ? col + '2E' : col + '1F';
  const fg = selected || popping ? '#FFFFFF' : col;
  const radius = Math.round(size * 0.28);

  const body = (
    <Pressable onPress={onPress} disabled={popping} accessibilityRole="button" accessibilityLabel={t('a11yTile', { v }) + (selected ? `, ${t('a11ySelected')}` : '')} accessibilityState={{ selected }}>
      <Animated.View style={[{ width: size, height: size }, anim]}>
        <View style={{ flex: 1, borderRadius: radius, backgroundColor: c.surface }}>
          <View
            style={{
              flex: 1,
              borderRadius: radius,
              backgroundColor: face,
              borderBottomWidth: 3,
              borderBottomColor: selected ? '#00000033' : col + '66',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text allowFontScaling={false} style={{ fontFamily: fonts.num, fontSize: Math.round(size * 0.52), color: fg, marginTop: -2 }}>
              {v}
            </Text>
          </View>
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: -3, top: -3, right: -3, bottom: -3, borderRadius: radius + 3, borderWidth: 2.5, borderColor: hinted ? c.accent : c.text },
            ring,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
  if (fresh) return <Animated.View entering={ZoomIn.delay(freshDelay).duration(220)}>{body}</Animated.View>;
  return body;
});
