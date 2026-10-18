/**
 * Number Ten — tap two digits that are equal (7·7) or add up to 10 (3·7) and whose path is clear.
 * Every accept/reject decision goes through canPair()/whyNot() from the engine.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import {
  anyMove,
  applyAdd,
  applyMatch,
  COLS,
  generateTen,
  hintMove,
  initialTen,
  partnersOf,
  starsForTen,
  whyNot,
  type TenLevel,
  type TenState,
} from '../engine/ten';
import { TenTile, tenColor } from '../components/TenTile';
import { MatchBurst, type BurstSpec } from '../components/MatchBurst';
import { Confetti } from '../components/Confetti';
import { Btn, H, IconBtn, P, Screen, Sheet } from '../components/ui';
import { tenStore } from '../lib/state';
import { useStore } from '../lib/store';
import { fonts, MAX_W, NUM_SCALE, useTheme } from '../lib/theme';
import { haptic, sound } from '../lib/feedback';

const GAP = 5;
const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function TenScreen() {
  const prog = useStore(tenStore);
  return <TenPlay key={prog.level} level={prog.level} />;
}

function TenPlay({ level }: { level: number }) {
  const c = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const L: TenLevel = useMemo(() => generateTen(level), [level]);
  const prog = useStore(tenStore);
  const resume = prog.current && prog.current.level === level ? prog.current : null;

  const [st, setSt] = useState<TenState>(() => resume?.state ?? initialTen(L));
  const [history, setHistory] = useState<TenState[]>(() => resume?.history ?? []);
  const [sel, setSel] = useState<number | null>(null); // cell id
  const [popping, setPopping] = useState<number[]>([]); // cell ids
  const [hint, setHint] = useState<number[]>([]); // cell ids
  const [reject, setReject] = useState<{ id: number; k: number }>({ id: -1, k: 0 });
  const [msg, setMsg] = useState('');
  const [bursts, setBursts] = useState<BurstSpec[]>([]);
  const [combo, setCombo] = useState(0);
  const [freshFrom, setFreshFrom] = useState<number>(Infinity);
  const [won, setWon] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [rules, setRules] = useState(!tenStore.get().rulesSeen);
  const [confetti, setConfetti] = useState(0);
  const lastMatch = useRef(0);
  const burstKey = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  // Pre-generate the next level so "Next" is instant.
  useEffect(() => {
    const id = setTimeout(() => generateTen(level + 1), 900);
    return () => clearTimeout(id);
  }, [level]);

  useEffect(() => {
    if (won) return;
    tenStore.set((p) => ({ ...p, current: { level, state: st, history: history.slice(-30) } }));
  }, [level, st, history, won]);

  const size = Math.min(46, Math.floor((Math.min(width, MAX_W) - 32 - GAP * (COLS - 1)) / COLS));
  const cells = st.cells;
  const idxOf = (id: number) => cells.findIndex((x) => x.id === id);
  const selIdx = sel === null ? -1 : idxOf(sel);
  const partnerIds = useMemo(() => (selIdx >= 0 ? new Set(partnersOf(cells, selIdx).map((k) => cells[k].id)) : new Set<number>()), [cells, selIdx]);
  const hasMove = useMemo(() => anyMove(cells) !== null, [cells]);
  const remaining = cells.reduce((n, x) => n + (x.v === null ? 0 : 1), 0);
  const stuck = !won && popping.length === 0 && remaining > 0 && !hasMove;
  const dead = stuck && st.adds === 0;

  const pos = (k: number) => ({ x: (k % COLS) * (size + GAP) + size / 2, y: Math.floor(k / COLS) * (size + GAP) + size / 2 });

  const addBurst = (b: Omit<BurstSpec, 'key'>) => {
    const key = burstKey.current++;
    setBursts((xs) => [...xs.slice(-8), { ...b, key }]);
    later(1200, () => setBursts((xs) => xs.filter((x) => x.key !== key)));
  };

  const stRef = useRef(st);
  useEffect(() => {
    stRef.current = st;
  }, [st]);

  const commit = (aId: number, bId: number, gained: number) => {
    const cur = stRef.current;
    const i = cur.cells.findIndex((x) => x.id === aId);
    const j = cur.cells.findIndex((x) => x.id === bId);
    const r = applyMatch(cur, i, j);
    setPopping([]);
    if (!r) return;
    let next: TenState = { ...r.state, score: cur.score + gained };
    if (r.rows > 0) {
      const bonus = 50 * r.rows;
      next = { ...next, score: next.score + bonus };
      addBurst({ x: (COLS * (size + GAP)) / 2, y: pos(Math.min(i, j)).y, text: t('tenRow', { n: bonus }), color: c.exact, big: true });
      sound('win');
      haptic.success();
    }
    if (next.cells.length === 0) {
      const stars = starsForTen(next.addsUsed);
      next = { ...next, score: next.score + 100 * stars };
      setWon(true);
      setConfetti((x) => x + 1);
      sound('win');
      haptic.success();
      const total = next.score;
      tenStore.set((p) => ({
        ...p,
        current: null,
        maxLevel: Math.max(p.maxLevel, level + 1),
        stars: { ...p.stars, [level]: Math.max(p.stars[level] ?? 0, stars) },
        totalScore: p.totalScore + total,
      }));
      later(900, () => setSheet(true));
    }
    stRef.current = next;
    setHistory((h) => [...h, cur]);
    setSt(next);
  };

  const onTile = (k: number) => {
    if (won || popping.length) return;
    const cell = cells[k];
    if (cell.v === null) return;
    setHint([]);
    if (sel === null || selIdx < 0) {
      setSel(cell.id);
      setMsg(partnersOf(cells, k).length ? '' : t('tenNoPartner', { v: cell.v }));
      sound('tap');
      haptic.tap();
      return;
    }
    if (sel === cell.id) {
      setSel(null);
      setMsg('');
      sound('tap');
      return;
    }
    const a = cells[selIdx].v as number;
    const b = cell.v;
    const why = whyNot(cells, selIdx, k);
    if (why === null) {
      // ✓ match
      const now = Date.now();
      const nextCombo = now - lastMatch.current < 2500 ? combo + 1 : 1;
      lastMatch.current = now;
      setCombo(nextCombo);
      const gained = 10 + 5 * (nextCombo - 1);
      const p1 = pos(selIdx);
      const p2 = pos(k);
      addBurst({
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        text: (a === b ? `${a} = ${b}` : '10!') + (nextCombo > 1 ? `  ×${nextCombo}` : ''),
        color: tenColor(a, c.dark),
      });
      setPopping([sel, cell.id]);
      setSel(null);
      setMsg('');
      sound('pop');
      haptic.pop();
      const aId = sel;
      const bId = cell.id;
      later(230, () => commit(aId, bId, gained));
      return;
    }
    if (why === 'value') {
      // Different family: just move the selection to the new tile (with a gentle note).
      setSel(cell.id);
      setMsg(t('tenNotTen', { a, b, s: a + b }));
      sound('tap');
      haptic.tap();
      return;
    }
    // Right numbers, but something sits between them.
    setReject((r) => ({ id: cell.id, k: r.k + 1 }));
    setMsg(t('tenBlocked'));
    sound('error');
    haptic.error();
  };

  const onAdd = () => {
    if (won || popping.length) return;
    const next = applyAdd(st);
    if (!next) return;
    setHistory((h) => [...h, st]);
    setFreshFrom(st.nextId);
    setSt(next);
    setSel(null);
    setHint([]);
    setMsg('');
    sound('undo');
    haptic.pop();
  };

  const undo = () => {
    if (!history.length || won || popping.length) return;
    setSt(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setSel(null);
    setHint([]);
    setMsg('');
    setFreshFrom(Infinity);
    sound('undo');
  };

  const restart = () => {
    setSt(initialTen(L));
    setHistory([]);
    setSel(null);
    setHint([]);
    setMsg('');
    setCombo(0);
    setFreshFrom(Infinity);
    sound('undo');
  };

  const showHint = () => {
    if (won || popping.length) return;
    const m = hintMove(L, st);
    if (!m) {
      setMsg(st.adds > 0 ? t('tenUseAdd') : t('noMoves'));
      return;
    }
    setSel(null);
    setHint([cells[m[0]].id, cells[m[1]].id]);
    setMsg('');
    sound('tap');
  };

  const nextLevel = () => {
    setSheet(false);
    tenStore.set((p) => ({ ...p, level: level + 1, current: null }));
  };

  // Caption: tutorial text on the first levels, otherwise feedback.
  let caption = msg;
  if (!caption && !won) {
    if (stuck && st.adds > 0) caption = t('tenUseAdd');
    else if (level === 1 && remaining === L.cells.length) caption = t('tenTut1');
    else if (level === 2 && history.length < 2) caption = t('tenTut2');
    else if (level === 3 && history.length < 2) caption = t('tenTut3');
  }
  if (won) caption = t('cleared');

  // Rows (keyed by their first cell id so they slide smoothly when a row disappears).
  const rows: { key: number; start: number }[] = [];
  for (let k = 0; k < cells.length; k += COLS) rows.push({ key: cells[k].id, start: k });

  const stars = starsForTen(st.addsUsed);

  return (
    <Screen>
      {/* Top bar */}
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
        <IconBtn label="←" a11y={t('back')} onPress={goBack} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.uiBold, fontSize: 17, color: c.text }}>
            {t('tenTitle')} · {t('levelShort', { n: level })}
          </Text>
        </View>
        <IconBtn label="?" a11y={t('tenRulesTitle')} onPress={() => setRules(true)} />
      </View>

      {/* Score strip */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <Pill c={c} label={t('tenScore')} value={st.score} />
        <Pill c={c} label={t('tenLeft')} value={remaining} />
        <View style={{ flex: 1 }} />
        <ComboBadge combo={combo} color={c.accent} label={t('tenCombo', { n: combo })} />
      </View>

      {/* Caption */}
      <View style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <Text numberOfLines={2} style={{ fontFamily: fonts.uiSemi, fontSize: 14, color: won ? c.exact : msg ? c.primary : c.text2, textAlign: 'center' }}>
          {caption}
        </Text>
      </View>

      {/* Grid */}
      <ScrollView style={{ flex: 1, marginTop: -16 }} contentContainerStyle={{ paddingTop: 26, paddingBottom: 12, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
        <View style={{ width: COLS * size + GAP * (COLS - 1) }}>
          {rows.map((r) => (
            <Animated.View key={r.key} layout={LinearTransition.duration(220)} exiting={FadeOut.duration(180)} style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
              {cells.slice(r.start, r.start + COLS).map((cell, off) => {
                const k = r.start + off;
                return (
                  <TenTile
                    key={cell.id}
                    v={cell.v}
                    size={size}
                    selected={sel === cell.id}
                    partner={partnerIds.has(cell.id)}
                    hinted={hint.includes(cell.id)}
                    popping={popping.includes(cell.id)}
                    rejected={reject.id === cell.id ? reject.k : 0}
                    fresh={cell.id >= freshFrom}
                    freshDelay={Math.min(600, (cell.id - freshFrom) * 14)}
                    onPress={() => onTile(k)}
                  />
                );
              })}
            </Animated.View>
          ))}
          {bursts.map((b) => (
            <MatchBurst key={b.key} x={b.x} y={b.y} text={b.text} color={b.color} big={b.big} />
          ))}
        </View>

        {dead && (
          <Animated.View entering={FadeIn} style={{ marginTop: 12, width: '100%', backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 18, gap: 10 }}>
            <Text style={{ fontFamily: fonts.uiBold, fontSize: 20, color: c.text, textAlign: 'center' }}>{t('noMoves')}</Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 14, color: c.text2, textAlign: 'center' }}>{t('tenDeadSub')}</Text>
            {history.length > 0 && <Btn kind="primary" label={t('undoLast')} onPress={undo} />}
            <Btn label={t('restart')} onPress={restart} />
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={{ height: 64, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Btn flex small label="↺" a11y={t('undoBtn')} disabled={!history.length || won} onPress={undo} />
        <Btn flex small label="↻" a11y={t('restart')} disabled={won} onPress={restart} />
        <AddButton adds={st.adds} pulse={stuck && st.adds > 0} onPress={onAdd} disabled={won || st.adds === 0} label={t('tenAdd')} />
        <Btn flex small label="💡" a11y={t('hintBtn')} disabled={won} onPress={showHint} />
      </View>

      {/* Rules */}
      <Sheet
        visible={rules}
        onClose={() => {
          setRules(false);
          tenStore.set((p) => ({ ...p, rulesSeen: true }));
        }}
      >
        <H c={c}>{t('tenRulesTitle')}</H>
        <P c={c} center>
          {t('tenRule1')}
        </P>
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
          {[
            [1, 9],
            [2, 8],
            [3, 7],
            [4, 6],
            [5, 5],
            [7, 7],
          ].map(([a, b]) => (
            <View key={`${a}${b}`} style={{ flexDirection: 'row', gap: 3, padding: 4, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
              <MiniTile v={a} />
              <MiniTile v={b} />
            </View>
          ))}
        </View>
        <P c={c} center>
          {t('tenRule2')}
        </P>
        <P c={c} center>
          {t('tenRule3')}
        </P>
        <Btn
          kind="primary"
          label={t('tenGotIt')}
          onPress={() => {
            setRules(false);
            tenStore.set((p) => ({ ...p, rulesSeen: true }));
          }}
        />
      </Sheet>

      {/* Win */}
      <Sheet visible={sheet} onClose={nextLevel}>
        <Text style={{ fontSize: 40, textAlign: 'center', letterSpacing: 4 }}>{'⭐'.repeat(stars) + '☆'.repeat(3 - stars)}</Text>
        <H c={c}>{t('tenWin', { n: level })}</H>
        <P c={c} center>
          {t('tenWinScore', { s: st.score })}
        </P>
        <Btn kind="primary" label={t('tenNext')} onPress={nextLevel} />
      </Sheet>
      <Confetti burst={confetti} />
    </Screen>
  );
}

function Pill({ c, label, value }: { c: ReturnType<typeof useTheme>; label: string; value: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: c.border }}>
      <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: c.text2 }}>{label}</Text>
      <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.num, fontSize: 16, color: c.text, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

function ComboBadge({ combo, color, label }: { combo: number; color: string; label: string }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (combo > 1) s.value = withSequence(withTiming(1.35, { duration: 110 }), withTiming(1, { duration: 160 }));
  }, [combo, s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  if (combo < 2) return null;
  return (
    <Animated.View style={[{ backgroundColor: color, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }, anim]}>
      <Text allowFontScaling={false} style={{ color: '#fff', fontFamily: fonts.num, fontSize: 15 }}>
        {label}
      </Text>
    </Animated.View>
  );
}

function AddButton({ adds, pulse, onPress, disabled, label }: { adds: number; pulse: boolean; onPress: () => void; disabled: boolean; label: string }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (pulse) s.value = withSequence(withTiming(1.12, { duration: 220 }), withTiming(1, { duration: 220 }), withTiming(1.12, { duration: 220 }), withTiming(1, { duration: 220 }));
  }, [pulse, s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[{ flex: 1.4 }, anim]}>
      <Btn small kind="accent" label={`＋ ${adds}`} a11y={`${label}: ${adds}`} disabled={disabled} onPress={onPress} />
    </Animated.View>
  );
}

function MiniTile({ v }: { v: number }) {
  const c = useTheme();
  const col = tenColor(v, c.dark);
  return (
    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: c.dark ? col + '2E' : col + '1F', borderBottomWidth: 2, borderBottomColor: col + '66', alignItems: 'center', justifyContent: 'center' }}>
      <Text allowFontScaling={false} style={{ fontFamily: fonts.num, fontSize: 16, color: col }}>
        {v}
      </Text>
    </View>
  );
}
