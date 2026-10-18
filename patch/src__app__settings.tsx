import React from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { IconBtn, Screen } from '../components/ui';
import { settingsStore, type LangPref, type ThemePref } from '../lib/state';
import { useStore } from '../lib/store';
import { fonts, useTheme, type Palette } from '../lib/theme';
import { CONTACT_EMAIL, PRIVACY_URL } from '../lib/config';
import { resolveLang } from '../i18n';

function Row({ c, children }: { c: Palette; children: React.ReactNode }) {
  return (
    <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border }}>
      {children}
    </View>
  );
}

function Segment<T extends string>({ c, value, options, onChange }: { c: Palette; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.bg, borderRadius: 10, padding: 3, gap: 3 }}>
      {options.map(([v, label]) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          accessibilityRole="button"
          accessibilityState={{ selected: v === value }}
          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: v === value ? c.primary : 'transparent' }}
        >
          <Text style={{ fontFamily: fonts.uiSemi, fontSize: 13, color: v === value ? '#fff' : c.text }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const c = useTheme();
  const { t } = useTranslation();
  const s = useStore(settingsStore);
  const set = (patch: Partial<typeof s>) => settingsStore.set((p) => ({ ...p, ...patch }));
  const label = { fontFamily: fonts.uiSemi, fontSize: 15, color: c.text, flex: 1 } as const;
  const lang = resolveLang(s.lang);
  return (
    <Screen>
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontFamily: fonts.uiBold, fontSize: 20, color: c.text }}>{t('settings')}</Text>
        <IconBtn label="✕" a11y={t('close')} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ gap: 10, paddingVertical: 12 }}>
        <Row c={c}>
          <Text style={label}>{t('sound')}</Text>
          <Switch value={s.sound} onValueChange={(v) => set({ sound: v })} trackColor={{ true: c.primary }} accessibilityLabel={t('sound')} />
        </Row>
        <Row c={c}>
          <Text style={label}>{t('haptics')}</Text>
          <Switch value={s.haptics} onValueChange={(v) => set({ haptics: v })} trackColor={{ true: c.primary }} accessibilityLabel={t('haptics')} />
        </Row>
        <Row c={c}>
          <Text style={label}>{t('theme')}</Text>
          <Segment<ThemePref>
            c={c}
            value={s.theme}
            onChange={(v) => set({ theme: v })}
            options={[
              ['light', t('themeLight')],
              ['dark', t('themeDark')],
              ['system', t('themeSystem')],
            ]}
          />
        </Row>
        <Row c={c}>
          <Text style={label}>{t('language')}</Text>
          <Segment<LangPref>
            c={c}
            value={s.lang}
            onChange={(v) => set({ lang: v })}
            options={[
              ['tr', 'Türkçe'],
              ['en', 'English'],
              ['system', t('themeSystem')],
            ]}
          />
        </Row>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL[lang])} accessibilityRole="link">
          <Row c={c}>
            <Text style={label}>{t('privacy')}</Text>
            <Text style={{ color: c.text2, fontSize: 18 }}>›</Text>
          </Row>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Digitopia`)} accessibilityRole="link">
          <Row c={c}>
            <Text style={label}>{t('contact')}</Text>
            <Text style={{ color: c.text2, fontSize: 14 }}>{CONTACT_EMAIL}</Text>
          </Row>
        </Pressable>
        <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: c.text2, textAlign: 'center', marginTop: 12 }}>
          Digitopia · {t('version', { v: Constants.expoConfig?.version ?? '1.0.0' })}
        </Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: c.text2, textAlign: 'center' }}>{t('testBuild')}</Text>
      </ScrollView>
    </Screen>
  );
}
