import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { mulberry32 } from '../engine/rng';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const COLORS = ['#4F46E5', '#F97316', '#14B8A6', '#F59E0B', '#F43F5E', '#6366F1'];

function Piece({ x, delay, color, size, drift, spin, height }: { x: number; delay: number; color: string; size: number; drift: number; spin: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [
      { translateX: x + drift * t.value },
      { translateY: -20 + t.value * height * 0.75 },
      { rotate: `${spin * t.value}deg` },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size * 0.5, borderRadius: 2, backgroundColor: color }, style]} />;
}

/** Short celebratory burst. Re-mount with a new `burst` key to play again. */
export function Confetti({ burst }: { burst: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => {
    const rnd = mulberry32(burst * 7919 + 17);
    return Array.from({ length: 36 }, (_, i) => ({
        key: `${burst}-${i}`,
        x: rnd() * width,
        delay: rnd() * 180,
        color: COLORS[i % COLORS.length],
        size: 8 + rnd() * 8,
        drift: (rnd() - 0.5) * 120,
        spin: (rnd() - 0.5) * 720,
      }));
  }, [burst, width]);
  if (!burst) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {pieces.map((p) => (
        <Piece {...p} key={p.key} height={height} />
      ))}
    </View>
  );
}
