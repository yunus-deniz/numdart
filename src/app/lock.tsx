/** Equation Lock (Denklem Kilidi): turn the dials so the equation hits the target and the vault opens. */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { evaluate, generateLock, goldFor, hasDuplicates, isOpen, starsForLock, type LockOp } from '../engine/lock';
import { Confetti } from '../components/Confetti';
import { Btn, H, IconBtn, P, Screen, Sheet } from '../components/ui';
import { lockStore } from '../lib/state';
import { useStore } from '../lib/store';
import { fonts, NUM_SCALE, useTheme } from '../lib/theme';
import { haptic, sound } from '../lib/feedback';
import { maybeShowInterstitial } from '../lib/ads';
import { requestReward } from '../lib/rewards';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
const GOLD = '#F59E0B';
const STEEL = '#334155';

export default function LockScreen() {
  const { level } = useStore(lockStore);
  // Re-mount per level so every vault starts with fresh local state.
  return <LockGame key={level} level={level} />;
}

function LockGame({ level }: { level: number }) {
  const c = useTheme();
  const { t } = useTranslation();
  const prog = useStore(lockStore);
  const L = useMemo(() => generateLock(level), [level]);
  const slots = L.ops.length + 1;

  const saved = prog.current && prog.current.level === level ? prog.current : null;
  const [dials, setDials] = useState<number[]>(() => saved?.dials ?? (L.distinct ? Array.from({ length: slots }, (_, k) => k) : new Array(slots).fill(0)));
  const [tries, setTries] = useState(saved?.tries ?? 0);
  const [hinted, setHinted] = useState(saved?.hinted ?? false);
  const [won, setWon] = useState(false);
  const [msg, setMsg] = useState('');
  const [sheet, setSheet] = useState(false);
  const [rules, setRules] = useState(!prog.rulesSeen);
  const [confetti, setConfetti] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [doorOpen, setDoorOpen] = useState(false);

  const persist = (d: number[], tr: number, h: boolean) =>
    lockStore.set((p) => ({ ...p, current: { level, dials: d, tries: tr, hinted: h } }));

  const value = evaluate(dials, L.ops);
  const dup = L.distinct && hasDuplicates(dials);

  // Shake when the lock refuses.
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  // Door swings open on a win.
  const door = useSharedValue(0);
  const doorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: door.value * 460 }, { rotate: `${door.value * 8}deg` }],
  }));
  const handle = useSharedValue(0);
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${handle.value * 270}deg` }] }));
  useEffect(() => {
    if (shakeKey === 0) return;
    shake.set(
      withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [shakeKey, shake]);
  useEffect(() => {
    if (won) handle.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [won, handle]);
  useEffect(() => {
    if (doorOpen) door.value = withSpring(1, { damping: 14, stiffness: 90 });
  }, [doorOpen, door]);

  const turn = (i: number, dir: 1 | -1) => {
    if (won) return;
    const d = dials.slice();
    d[i] = (d[i] + dir + 10) % 10;
    setDials(d);
    setMsg('');
    persist(d, tries, hinted);
    sound('tap');
    haptic.tap();
  };

  const tryOpen = () => {
    if (won) return;
    const n = tries + 1;
    if (isOpen(dials, L)) {
      setTries(n);
      setWon(true);
      const stars = starsForLock(n);
      const gold = goldFor(level, stars);
      lockStore.set((p) => ({
        ...p,
        maxLevel: Math.max(p.maxLevel, level + 1),
        stars: { ...p.stars, [level]: Math.max(p.stars[level] ?? 0, stars) },
        gold: p.gold + gold,
        current: null,
      }));
      sound('win');
      haptic.success();
      setTimeout(() => {
        setDoorOpen(true);
        setConfetti((x) => x + 1);
      }, 420);
      setTimeout(() => setSheet(true), 1300);
      return;
    }
    setTries(n);
    persist(dials, n, hinted);
    sound('error');
    haptic.error();
    setShakeKey((k) => k + 1);
    setMsg(dup ? t('lockDup') : t('lockWrong', { v: value ?? '?', t: L.target }));
  };

  const showHint = async () => {
    if (won) return;
    // reveal the first dial that is not yet correct
    const i = L.solution.findIndex((d, k) => dials[k] !== d);
    if (i < 0) return;
    const ok = await requestReward('lock-hint');
    if (!ok) return;
    const d = dials.slice();
    d[i] = L.solution[i];
    setDials(d);
    setHinted(true);
    persist(d, tries, true);
    setMsg(t('lockHintMsg', { i: i + 1, d: L.solution[i] }));
    sound('pop');
  };

  const nextLevel = async () => {
    setSheet(false);
    await maybeShowInterstitial(level);
    lockStore.set((p) => ({ ...p, level: level + 1, current: null }));
  };

  const closeRules = () => {
    setRules(false);
    lockStore.set((p) => ({ ...p, rulesSeen: true }));
  };

  const stars = won ? starsForLock(tries) : 0;
  const earned = won ? goldFor(level, stars) : 0;
  const nowText = value === null ? t('lockInvalid') : t('lockNow', { v: value });
  const close = value !== null && !dup && Math.abs(value - L.target) <= Math.max(2, Math.round(L.target * 0.05));
  const dialW = slots >= 5 ? 40 : slots === 4 ? 50 : 62;

  return (
    <Screen>
      {/* Top bar */}
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
        <IconBtn label="←" a11y={t('back')} onPress={goBack} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.uiBold, fontSize: 17, color: c.text }}>
            {t('lockTitle')} · {t('levelShort', { n: level })}
          </Text>
        </View>
        <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.numSemi, fontSize: 15, color: GOLD, marginRight: 2 }}>
          🪙{prog.gold}
        </Text>
        <IconBtn label="?" a11y={t('lockRulesTitle')} onPress={() => setRules(true)} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
        {/* The vault */}
        <Animated.View style={shakeStyle}>
          <View style={{ borderRadius: 28, backgroundColor: '#0B1220', padding: 10, borderBottomWidth: 6, borderBottomColor: '#020617', overflow: 'hidden' }}>
            {/* gold waiting behind the door */}
            <View style={{ position: 'absolute', left: 10, right: 10, top: 10, bottom: 10, borderRadius: 22, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 64 }}>💰</Text>
              <Text style={{ fontFamily: fonts.num, fontSize: 22, color: GOLD, marginTop: 6 }}>{won ? `+${earned}` : ''}</Text>
            </View>

            <Animated.View style={[{ borderRadius: 22, backgroundColor: STEEL, padding: 16, borderWidth: 3, borderColor: '#475569' }, doorStyle]}>
              {/* rivets */}
              {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, k) => (
                <View key={k} style={{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#64748B', ...pos }} />
              ))}

              {/* target plate */}
              <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <Animated.View style={[{ width: 34, height: 34, borderRadius: 17, borderWidth: 4, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' }, handleStyle]}>
                  <View style={{ width: 4, height: 18, backgroundColor: GOLD, borderRadius: 2 }} />
                </Animated.View>
                <View style={{ backgroundColor: '#0F172A', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 6, borderWidth: 2, borderColor: GOLD }}>
                  <Text maxFontSizeMultiplier={NUM_SCALE} accessibilityLabel={`= ${L.target}`} style={{ fontFamily: fonts.num, fontSize: 40, color: GOLD }}>
                    = {L.target}
                  </Text>
                </View>
              </View>

              {/* dials */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, flexWrap: 'nowrap' }}>
                {dials.map((d, i) => (
                  <React.Fragment key={i}>
                    <Dial
                      value={d}
                      width={dialW}
                      bad={dup && dials.indexOf(d) !== i ? true : dup && dials.lastIndexOf(d) !== i}
                      solved={won}
                      onUp={() => turn(i, 1)}
                      onDown={() => turn(i, -1)}
                      a11y={`${i + 1}: ${d}`}
                    />
                    {i < L.ops.length && <OpSign op={L.ops[i]} />}
                  </React.Fragment>
                ))}
              </View>

              {/* live value */}
              <Text
                maxFontSizeMultiplier={NUM_SCALE}
                style={{ textAlign: 'center', marginTop: 14, fontFamily: fonts.numSemi, fontSize: 16, color: won ? '#5EEAD4' : close ? '#FCD34D' : '#CBD5E1' }}
              >
                {won ? t('lockWin', { n: level }) : nowText}
              </Text>
              {L.distinct && !won && (
                <Text style={{ textAlign: 'center', marginTop: 4, fontFamily: fonts.ui, fontSize: 12, color: dup ? '#FDA4AF' : '#94A3B8' }}>
                  {t('lockDup')}
                </Text>
              )}
            </Animated.View>
          </View>
        </Animated.View>

        {/* Message */}
        <View style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
          <Text numberOfLines={2} style={{ fontFamily: fonts.uiSemi, fontSize: 14, color: msg ? c.far : c.text2, textAlign: 'center' }}>
            {msg}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 8 }}>
        {won ? (
          <Btn flex kind="primary" label={t('lockNext')} onPress={nextLevel} />
        ) : (
          <>
            <Btn small label={`💡 ${t('lockHint')}`} onPress={showHint} style={{ flex: 1 }} />
            <Btn kind="accent" label={`🔓 ${t('lockOpen')}`} onPress={tryOpen} style={{ flex: 2 }} />
          </>
        )}
      </View>

      {confetti > 0 && <Confetti key={confetti} burst={confetti} />}

      <Sheet visible={sheet} onClose={() => setSheet(false)}>
        <Text style={{ fontSize: 40, textAlign: 'center', letterSpacing: 4 }}>{'⭐'.repeat(stars) + '☆'.repeat(3 - stars)}</Text>
        <H c={c}>{t('lockWin', { n: level })}</H>
        <Animated.Text entering={ZoomIn.duration(350)} style={{ textAlign: 'center', fontFamily: fonts.num, fontSize: 28, color: GOLD }}>
          🪙 {t('lockGold', { g: earned })}
        </Animated.Text>
        <Btn kind="primary" label={t('lockNext')} onPress={nextLevel} />
      </Sheet>

      <Sheet visible={rules} onClose={closeRules}>
        <H c={c}>{t('lockRulesTitle')}</H>
        <P c={c}>🔢 {t('lockRule1')}</P>
        <P c={c}>✖️ {t('lockRule2')}</P>
        <P c={c}>⭐ {t('lockRule3')}</P>
        <Btn kind="primary" label={t('tenGotIt')} onPress={closeRules} />
      </Sheet>
    </Screen>
  );
}

function Dial({
  value,
  width,
  bad,
  solved,
  onUp,
  onDown,
  a11y,
}: {
  value: number;
  width: number;
  bad: boolean;
  solved: boolean;
  onUp: () => void;
  onDown: () => void;
  a11y: string;
}) {
  const bump = useSharedValue(0);
  useEffect(() => {
    bump.value = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 140 }));
  }, [value, bump]);
  const numStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + bump.value * 0.12 }] }));
  const arrow = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${a11y} ${label}`} style={({ pressed }) => ({ height: 34, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
      <Text allowFontScaling={false} style={{ color: '#E2E8F0', fontSize: 18 }}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={{ width, alignItems: 'center' }}>
      {arrow('▲', onUp)}
      <View
        style={{
          width,
          height: width * 1.15,
          borderRadius: 12,
          backgroundColor: solved ? '#0D9488' : '#F8FAFC',
          borderWidth: 3,
          borderColor: bad ? '#F43F5E' : solved ? '#5EEAD4' : '#94A3B8',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottomWidth: 6,
        }}
      >
        <Animated.Text allowFontScaling={false} style={[{ fontFamily: fonts.num, fontSize: width * 0.62, color: solved ? '#fff' : '#0F172A' }, numStyle]}>
          {value}
        </Animated.Text>
      </View>
      {arrow('▼', onDown)}
    </View>
  );
}

function OpSign({ op }: { op: LockOp }) {
  return (
    <Text allowFontScaling={false} style={{ fontFamily: fonts.num, fontSize: 22, color: '#FCD34D', marginHorizontal: 3 }}>
      {op}
    </Text>
  );
}
