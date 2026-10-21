import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, MAX_W, NUM_SCALE, useTheme, type Palette } from '../lib/theme';

export function Screen({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: 16 }}>{children}</View>
    </SafeAreaView>
  );
}

/** Pressable with a hard bottom "lip" instead of a blurred shadow. */
export function Btn({
  label,
  onPress,
  kind = 'surface',
  disabled,
  style,
  small,
  a11y,
  flex,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'surface' | 'primary' | 'accent' | 'exact';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  a11y?: string;
  flex?: boolean;
}) {
  const c = useTheme();
  const bg = kind === 'primary' ? c.primary : kind === 'accent' ? c.accent : kind === 'exact' ? c.exact : c.surface;
  const lip = kind === 'surface' ? c.lip : shade(bg);
  const fg = kind === 'surface' ? c.text : '#FFFFFF';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={[flex && { flex: 1 }, style]}
    >
      {({ pressed }) => (
        <View style={{ paddingBottom: pressed ? 1 : 3, marginTop: pressed ? 2 : 0, backgroundColor: lip, borderRadius: 14, opacity: disabled ? 0.4 : 1 }}>
          <View
            style={{
              backgroundColor: bg,
              borderRadius: 14,
              minHeight: small ? 40 : 48,
              paddingHorizontal: small ? 8 : 14,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: kind === 'surface' ? StyleSheet.hairlineWidth : 0,
              borderColor: c.border,
            }}
          >
            <Text
              maxFontSizeMultiplier={NUM_SCALE}
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: fg, fontFamily: fonts.uiBold, fontSize: small ? 14 : 15 }}
            >
              {label}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function IconBtn({ label, onPress, a11y, dot }: { label: string; onPress: () => void; a11y: string; dot?: boolean }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={6}
      style={({ pressed }) => ({
        minWidth: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        backgroundColor: pressed ? c.surface : 'transparent',
      })}
    >
      <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontSize: 20, color: c.text, fontFamily: fonts.uiSemi }}>
        {label}
      </Text>
      {dot && <View style={{ position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 5, backgroundColor: c.accent }} />}
    </Pressable>
  );
}

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const c = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }} onPress={onClose} accessibilityLabel="close" />
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <View style={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center', padding: 20, gap: 12 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 4 }} />
          {children}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function H({ children, c, size = 22 }: { children: React.ReactNode; c: Palette; size?: number }) {
  return <Text style={{ fontFamily: fonts.uiBold, fontSize: size, color: c.text, textAlign: 'center' }}>{children}</Text>;
}

export function P({ children, c, center, color }: { children: React.ReactNode; c: Palette; center?: boolean; color?: string }) {
  return (
    <Text style={{ fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, color: color ?? c.text2, textAlign: center ? 'center' : 'left' }}>
      {children}
    </Text>
  );
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 45);
  const g = Math.max(0, ((n >> 8) & 255) - 45);
  const b = Math.max(0, (n & 255) - 45);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
