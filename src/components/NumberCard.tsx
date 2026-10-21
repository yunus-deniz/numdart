import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { fonts, NUM_SCALE, useTheme } from '../lib/theme';

export interface NumberCardProps {
  value: number;
  used: boolean;
  made: boolean;
  large: boolean;
  selected: boolean;
  /** the move would be invalid with this card */
  dim: boolean;
  /** hint: not needed for the solution */
  faded: boolean;
  /** shown as "?" (tutorial) */
  hidden?: boolean;
  /** changes whenever this card receives a new result → springy bounce */
  bounceKey: number;
  onPress: () => void;
  testID?: string;
}

export const NumberCard = React.memo(function NumberCard(p: NumberCardProps) {
  const c = useTheme();
  const { t } = useTranslation();
  const press = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    press.value = withTiming(p.selected ? 1 : 0, { duration: 80 });
  }, [p.selected, press]);
  useEffect(() => {
    if (p.bounceKey > 0) scale.value = withSequence(withTiming(1.12, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 220 }));
  }, [p.bounceKey, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * 2 }, { scale: scale.value }] }));

  let face = p.large ? c.bigCard : c.surface;
  let lip = p.large ? c.bigLip : c.lip;
  let fg = c.text;
  let border = p.large && c.dark ? c.bigLip : c.border;
  if (p.made) border = c.exact;
  if (p.selected) {
    face = c.primary;
    lip = '#3730A3';
    fg = c.onPrimary;
    border = 'transparent';
  }
  const lipH = p.used ? 0 : p.selected ? 2 : 4;
  const opacity = p.used ? 0.25 : p.dim ? 0.35 : p.faded ? 0.4 : 1;
  const disabled = p.used || p.dim || !!p.hidden;

  return (
    <Pressable
      testID={p.testID}
      onPress={p.onPress}
      disabled={disabled}
      style={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={p.hidden ? '?' : t('a11yCard', { v: p.value }) + (p.selected ? `, ${t('a11ySelected')}` : '')}
      accessibilityState={{ selected: p.selected, disabled }}
    >
      <Animated.View style={[{ height: 76, opacity }, anim]}>
        <View style={{ flex: 1, borderRadius: 16, backgroundColor: lip, paddingBottom: lipH }}>
          <View
            style={{
              flex: 1,
              borderRadius: 16,
              backgroundColor: face,
              borderWidth: p.made && !p.selected ? 2 : 1,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.num, fontSize: 28, color: fg, fontVariant: ['tabular-nums'] }}>
              {p.hidden ? '?' : p.value}
            </Text>
            {p.made && !p.used && (
              <View style={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: p.selected ? '#fff' : c.exact }} />
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

export function OpButton({ op, active, disabled, onPress, label }: { op: string; active: boolean; disabled: boolean; onPress: () => void; label: string }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active, disabled }}>
      {({ pressed }) => (
        <View
          style={{
            width: 64,
            height: 56,
            borderRadius: 14,
            backgroundColor: active ? '#9A3412' : c.dark ? '#7C2D12' : '#C2410C',
            paddingBottom: active || pressed ? 1 : 4,
            marginTop: active || pressed ? 3 : 0,
            opacity: disabled ? 0.45 : 1,
          }}
        >
          <View style={{ flex: 1, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.num, fontSize: 28, color: '#fff', marginTop: -2 }}>
              {op}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
