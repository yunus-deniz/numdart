import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { fonts } from '../lib/theme';

export interface BurstSpec {
  key: number;
  x: number;
  y: number;
  text: string;
  color: string;
  big?: boolean;
}

function Spark({ angle, color, t }: { angle: number; color: string; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = 6 + t.value * 30;
    return {
      opacity: 1 - t.value,
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: 1 - t.value * 0.5 }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: -4, top: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />;
}

/** "10!" floating up from the matched pair, with a ring of sparks. */
export function MatchBurst({ x, y, text, color, big }: Omit<BurstSpec, 'key'>) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: big ? 1100 : 750, easing: Easing.out(Easing.cubic) });
  }, [t, big]);
  const label = useAnimatedStyle(() => ({
    opacity: t.value < 0.7 ? 1 : (1 - t.value) / 0.3,
    transform: [{ translateY: -t.value * (big ? 60 : 42) }, { scale: 0.7 + Math.min(1, t.value * 3) * 0.4 }],
  }));
  const N = big ? 14 : 8;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y }}>
      {Array.from({ length: N }, (_, i) => (
        <Spark key={i} angle={(i / N) * Math.PI * 2} color={color} t={t} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: -80, width: 160, top: -18, alignItems: 'center' }, label]}>
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: fonts.num,
            fontSize: big ? 26 : 20,
            color,
            textShadowColor: 'rgba(0,0,0,0.25)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}
        >
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}
