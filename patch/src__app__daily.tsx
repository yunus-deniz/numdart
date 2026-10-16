/**
 * 6-number classic (🎯 tab), two modes:
 *  - Daily: same puzzle worldwide per local date, streak + share.
 *  - Unlimited: endless puzzles; tap the target (or "New puzzle") for another one.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  applyOp,
  closest,
  initialState,
  OPS,
  play,
  rewindTo,
  shareText,
  solutionToMoves,
  starsFor,
  unusedStartSlots,
  type Op,
  type PlayState,
  type SolutionStep,
} from '../engine/classic';
import { localDateISO } from '../engine/dates';
import { NumberCard, OpButton } from '../components/NumberCard';
import { Confetti } from '../components/Confetti';
import { Btn, H, IconBtn, P, Screen, Sheet } from '../components/ui';
import {
  clockRolledBack,
  dailyStore,
  emptyRecord,
  liveStreak,
  nextUnlimited,
  recordFinish,
  statsStore,
  touchDate,
  unlimitedStore,
  type DailyRecord,
  type UnlimitedDifficulty,
} from '../lib/state';
import { useStore } from '../lib/store';
import { fonts, NUM_SCALE, useTheme } from '../lib/theme';
import { haptic, sound } from '../lib/feedback';
import { requestReward } from '../lib/rewards';
import { formatHMS, getDailyPuzzle, getUnlimitedPuzzle, msUntilLocalMidnight } from '../lib/dailyPuzzle';
import { PLAY_URL } from '../lib/config';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
type Mode = 'daily' | 'unlimited';

export default function DailyScreen() {
  const daily = useStore(dailyStore);
  const [today] = useState(localDateISO);
  // Must be computed before touchDate() moves the high-water mark.
  const [rolledBack] = useState(() => clockRolledBack(today));
  useEffect(() => touchDate(today), [today]);
  // Today's daily already done → open straight into Unlimited.
  const [mode, setMode] = useState<Mode>(() => (dailyStore.get().records[today]?.finished ? 'unlimited' : 'daily'));
  if (!daily.tutorialDone) return <Tutorial onDone={() => dailyStore.set((d) => ({ ...d, tutorialDone: true }))} />;
  return mode === 'daily' ? (
    <DailyMode today={today} rolledBack={rolledBack} onMode={setMode} />
  ) : (
    <UnlimitedMode today={today} onMode={setMode} />
  );
}

function opName(t: (k: string) => string, op: Op) {
  return op === '+' ? t('opPlus') : op === '−' ? t('opMinus') : op === '×' ? t('opTimes') : t('opDiv');
}

// ───────────────────────────── Shared top bar ─────────────────────────────

function TopBar({ mode, onMode, right }: { mode: Mode; onMode: (m: Mode) => void; right: React.ReactNode }) {
  const c = useTheme();
  const { t } = useTranslation();
  const seg = (m: Mode, label: string) => (
    <Pressable
      key={m}
      onPress={() => {
        if (m !== mode) {
          sound('tap');
          onMode(m);
        }
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: m === mode }}
      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: m === mode ? c.primary : 'transparent' }}
    >
      <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.uiBold, fontSize: 14, color: m === mode ? '#fff' : c.text2 }}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
      <IconBtn label="←" a11y={t('back')} onPress={goBack} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: c.border }}>
          {seg('daily', t('modeDaily'))}
          {seg('unlimited', t('modeUnlimited'))}
        </View>
      </View>
      {right}
    </View>
  );
}

// ───────────────────────────── Daily mode ─────────────────────────────

function DailyMode({ today, rolledBack, onMode }: { today: string; rolledBack: boolean; onMode: (m: Mode) => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  const p = useMemo(() => getDailyPuzzle(today), [today]);
  const daily = useStore(dailyStore);
  const stats = useStore(statsStore);
  const rec: DailyRecord = daily.records[today] ?? emptyRecord();
  const streak = liveStreak(stats, today);
  const saveRec = (patch: Partial<DailyRecord>) =>
    dailyStore.set((d) => ({ ...d, records: { ...d.records, [today]: { ...(d.records[today] ?? emptyRecord()), ...patch } } }));
  const [left, setLeft] = useState(msUntilLocalMidnight());
  useEffect(() => {
    const id = setInterval(() => setLeft(msUntilLocalMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const onShare = async (history: PlayState['history']) => {
    const r = dailyStore.get().records[today] ?? rec;
    const text = shareText({
      number: p.number,
      target: p.target,
      history,
      stars: r.stars,
      diff: r.diff,
      streak: liveStreak(statsStore.get(), today),
      streakLabel: t('streak'),
      url: PLAY_URL,
    });
    try {
      await Share.share({ message: text });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <ClassicGame
      key={`daily-${today}`}
      puzzle={p}
      rec={rec}
      saveRec={saveRec}
      initialMsg={rolledBack ? t('clockBack') : ''}
      onFinished={(s, d) => {
        if (!rolledBack) recordFinish(today, s, d);
      }}
      topBar={
        <TopBar
          mode="daily"
          onMode={onMode}
          right={
            <>
              <Text maxFontSizeMultiplier={NUM_SCALE} accessibilityLabel={`${t('streak')} ${streak}`} style={{ fontFamily: fonts.numSemi, fontSize: 16, color: c.text, marginRight: 2 }}>
                🔥{streak}
              </Text>
              <IconBtn label="📊" a11y={t('stats')} onPress={() => router.push('/stats')} />
            </>
          }
        />
      }
      targetCaption={t('dailyN', { n: p.number })}
      finishedBar={(openSheet) => (
        <>
          <Btn flex small label={t('seeResult')} onPress={openSheet} />
          <Btn style={{ flex: 1.4 }} small kind="primary" label={t('continueUnlimited')} onPress={() => onMode('unlimited')} />
        </>
      )}
      sheet={({ rec: r, history, reveal, close }) => (
        <>
          <Text style={{ fontSize: 40, textAlign: 'center', letterSpacing: 4 }}>{'⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars)}</Text>
          <H c={c}>{r.diff === 0 ? t('exactHit') : t('diffText', { d: r.diff })}</H>
          <Btn kind="primary" label={t('share')} onPress={() => onShare(history)} />
          <SolutionOrReveal revealed={r.revealed} steps={p.solution} onReveal={reveal} />
          <Btn
            label={t('continueUnlimited')}
            onPress={() => {
              close();
              onMode('unlimited');
            }}
          />
          <P c={c} center>
            {t('nextIn', { t: formatHMS(left) })}
          </P>
        </>
      )}
    />
  );
}

// ───────────────────────────── Unlimited mode ─────────────────────────────

const DIFFS: UnlimitedDifficulty[] = ['easy', 'medium', 'hard'];

function UnlimitedMode({ today, onMode }: { today: string; onMode: (m: Mode) => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  const u = useStore(unlimitedStore);
  // First open (or after a reset): pick a fresh puzzle.
  useEffect(() => {
    if (!unlimitedStore.get().seed) nextUnlimited();
  }, []);
  const seed = u.seed || 1;
  const p = useMemo(() => getUnlimitedPuzzle(seed, u.difficulty), [seed, u.difficulty]);
  const saveRec = (patch: Partial<DailyRecord>) => unlimitedStore.set((s) => ({ ...s, record: { ...s.record, ...patch } }));
  const diffLabel = (d: UnlimitedDifficulty) => (d === 'easy' ? t('diffEasy') : d === 'medium' ? t('diffMedium') : t('diffHard'));
  const newPuzzle = (d?: UnlimitedDifficulty) => {
    sound('undo');
    haptic.tap();
    nextUnlimited(d);
  };
  const dailyDone = !!dailyStore.get().records[today]?.finished;

  return (
    <ClassicGame
      key={`unl-${seed}-${u.difficulty}`}
      puzzle={p}
      rec={u.record}
      saveRec={saveRec}
      initialMsg={t('tapTargetNew')}
      onFinished={(_s, d) => unlimitedStore.set((s) => ({ ...s, played: s.played + 1, exact: s.exact + (d === 0 ? 1 : 0) }))}
      onTargetPress={() => newPuzzle()}
      topBar={
        <TopBar
          mode="unlimited"
          onMode={onMode}
          right={
            <>
              <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.numSemi, fontSize: 15, color: c.text, marginRight: 2 }}>
                ✓{u.exact}
              </Text>
              <IconBtn label="📊" a11y={t('stats')} onPress={() => router.push('/stats')} />
            </>
          }
        />
      }
      targetCaption={
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DIFFS.map((d) => (
            <Pressable
              key={d}
              onPress={() => d !== u.difficulty && newPuzzle(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: d === u.difficulty }}
              hitSlop={4}
              style={{ paddingHorizontal: 9, paddingVertical: 2, borderRadius: 8, backgroundColor: d === u.difficulty ? c.accent : 'transparent' }}
            >
              <Text style={{ fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1, color: d === u.difficulty ? '#fff' : c.text2 }}>
                {diffLabel(d).toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      }
      unfinishedExtra={<Btn flex small label={t('newShort')} a11y={t('newPuzzle')} onPress={() => newPuzzle()} />}
      finishedBar={() => (
        <>
          {!dailyDone && <Btn flex small label={t('modeDaily')} onPress={() => onMode('daily')} />}
          <Btn style={{ flex: 1.6 }} small kind="primary" label={t('nextPuzzle')} onPress={() => newPuzzle()} />
        </>
      )}
      sheet={({ rec: r, reveal, close }) => (
        <>
          <Text style={{ fontSize: 40, textAlign: 'center', letterSpacing: 4 }}>{'⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars)}</Text>
          <H c={c}>{r.diff === 0 ? t('exactHit') : t('diffText', { d: r.diff })}</H>
          <Btn
            kind="primary"
            label={t('nextPuzzle')}
            onPress={() => {
              close();
              newPuzzle();
            }}
          />
          <SolutionOrReveal revealed={r.revealed} steps={p.solution} onReveal={reveal} />
          <P c={c} center>
            {t('unlimitedScore', { n: u.exact })}
          </P>
        </>
      )}
    />
  );
}

function SolutionOrReveal({ revealed, steps, onReveal }: { revealed: boolean; steps: SolutionStep[]; onReveal: () => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  if (!revealed) return <Btn label={t('seeBest')} onPress={onReveal} />;
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border }}>
      <Text style={{ fontFamily: fonts.uiBold, color: c.text2, fontSize: 12, marginBottom: 4 }}>{t('bestSolution')}</Text>
      {steps.map((s, i) => (
        <Text key={i} style={{ fontFamily: fonts.numSemi, fontSize: 16, color: c.text, direction: 'ltr' }}>
          {i + 1}. {s.av} {s.op} {s.bv} = {s.result}
        </Text>
      ))}
    </View>
  );
}

// ───────────────────────────── The game itself (shared by both modes) ─────────────────────────────

interface ClassicGameProps {
  puzzle: { numbers: number[]; large: boolean[]; target: number; solution: SolutionStep[] };
  rec: DailyRecord;
  saveRec: (patch: Partial<DailyRecord>) => void;
  onFinished: (stars: number, diff: number) => void;
  topBar: React.ReactNode;
  targetCaption: React.ReactNode;
  initialMsg?: string;
  onTargetPress?: () => void;
  unfinishedExtra?: React.ReactNode;
  finishedBar: (openSheet: () => void) => React.ReactNode;
  sheet: (a: { rec: DailyRecord; history: PlayState['history']; reveal: () => void; close: () => void }) => React.ReactNode;
}

function ClassicGame({
  puzzle: p,
  rec,
  saveRec,
  onFinished,
  topBar,
  targetCaption,
  initialMsg = '',
  onTargetPress,
  unfinishedExtra,
  finishedBar,
  sheet: renderSheet,
}: ClassicGameProps) {
  const c = useTheme();
  const { t } = useTranslation();
  const [ps, setPs] = useState<PlayState>(() => rewindTo(p, { cards: [], history: rec.history }, rec.history.length));
  const [aSlot, setA] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [bounce, setBounce] = useState({ slot: -1, k: 0 });
  const [faded, setFaded] = useState<number[]>(() => (rec.hintLevel >= 2 && rec.history.length <= 1 ? unusedStartSlots(p, p.solution) : []));
  const [msg, setMsg] = useState(rec.history.length ? '' : initialMsg);
  const [sheet, setSheet] = useState(false);
  const [burst, setBurst] = useState(0);
  const [pending, setPending] = useState(false);
  const doneRef = useRef(rec.finished);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const finished = rec.finished;
  const near = closest(ps, p.target);
  const diff = near?.diff ?? 999;
  const stars = starsFor(diff);

  const applyState = (next: PlayState) => {
    setPs(next);
    saveRec({ history: next.history });
  };

  const finish = (st: PlayState, s: number, d: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    saveRec({ finished: true, stars: s, diff: d, history: st.history });
    onFinished(s, d);
    setPending(false);
    setA(null);
    setOp(null);
    setMsg('');
    setFaded([]);
    if (d === 0) {
      setBurst((b) => b + 1);
      sound('win');
      haptic.success();
    } else {
      sound('pop');
      haptic.pop();
    }
    timers.current.push(setTimeout(() => setSheet(true), d === 0 ? 700 : 150));
  };

  const doMove = (a: number, o: Op, b: number) => {
    const next = play(ps, a, o, b);
    if (!next) {
      haptic.error();
      sound('error');
      return;
    }
    applyState(next);
    setA(null);
    setOp(null);
    setMsg('');
    setBounce((x) => ({ slot: b, k: x.k + 1 }));
    sound('pop');
    haptic.pop();
    if (next.cards[b].value === p.target) {
      setPending(true);
      timers.current.push(setTimeout(() => finish(next, 3, 0), 400));
    }
  };

  const onCard = (i: number) => {
    if (finished || pending) return;
    const card = ps.cards[i];
    if (card.used) return;
    if (aSlot === null) {
      setA(i);
      sound('tap');
      haptic.tap();
    } else if (aSlot === i) {
      setA(null);
      setOp(null);
      sound('tap');
    } else if (op === null) {
      setA(i);
      sound('tap');
      haptic.tap();
    } else doMove(aSlot, op, i);
  };

  const onOp = (o: Op) => {
    if (finished || pending || aSlot === null) return;
    setOp(op === o ? null : o);
    sound('tap');
    haptic.tap();
  };

  const rewind = (k: number) => {
    if (finished || pending) return;
    applyState(rewindTo(p, ps, k));
    setA(null);
    setOp(null);
    setFaded([]);
    sound('undo');
  };

  const onHint = async () => {
    if (finished || pending) return;
    if (rec.hintLevel >= 2) {
      setMsg(t('hintMax'));
      return;
    }
    if (!(await requestReward('daily-hint'))) return;
    const moves = solutionToMoves(p, p.solution);
    const s = play(initialState(p), moves[0].aSlot, moves[0].op, moves[0].bSlot)!;
    applyState(s);
    setA(null);
    setOp(null);
    setBounce((x) => ({ slot: moves[0].bSlot, k: x.k + 1 }));
    const lvl = rec.hintLevel + 1;
    saveRec({ hintLevel: lvl, history: s.history });
    sound('undo');
    if (lvl === 1) setMsg(t('hintStep1'));
    else {
      setFaded(unusedStartSlots(p, p.solution));
      const st = p.solution[1];
      setMsg(t('hintStep2', { s: `${st.av} ${st.op} ${st.bv}` }));
    }
  };

  const A = aSlot !== null ? ps.cards[aSlot] : null;
  const nearColor = diff === 0 ? c.exact : diff <= 5 ? c.near : diff <= 10 ? c.far : c.text2;

  return (
    <Screen>
      {topBar}

      {/* Target */}
      <View style={{ height: 96, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ height: 22, justifyContent: 'center', marginBottom: 2 }}>
          {typeof targetCaption === 'string' ? (
            <Text style={{ fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 2, color: c.text2 }}>
              {t('target')} · {targetCaption.toUpperCase()}
            </Text>
          ) : (
            targetCaption
          )}
        </View>
        <Pressable
          onPress={onTargetPress && !pending ? onTargetPress : undefined}
          disabled={!onTargetPress || pending}
          accessibilityRole={onTargetPress ? 'button' : undefined}
          accessibilityLabel={t('a11yTarget', { t: p.target }) + (onTargetPress ? `. ${t('newPuzzle')}` : '')}
        >
          {({ pressed }) => (
            <View
              style={{
                minWidth: 120,
                height: 64,
                paddingHorizontal: 16,
                borderRadius: 16,
                borderWidth: 3,
                borderColor: c.accent,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale: pressed ? 0.96 : 1 }],
              }}
            >
              <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.num, fontSize: 36, color: c.text, fontVariant: ['tabular-nums'] }}>
                {p.target}
              </Text>
              {onTargetPress && <Text style={{ position: 'absolute', top: 2, right: 6, fontSize: 13, color: c.accent }}>↻</Text>}
            </View>
          )}
        </Pressable>
      </View>

      {/* Closest indicator / message */}
      <View style={{ height: 26, alignItems: 'center', justifyContent: 'center' }}>
        {msg ? (
          <Text numberOfLines={2} style={{ fontFamily: fonts.uiSemi, fontSize: 13, color: c.primary, textAlign: 'center' }}>
            {msg}
          </Text>
        ) : near ? (
          <Text style={{ fontFamily: fonts.uiSemi, fontSize: 14, color: nearColor }}>
            {diff === 0 ? t('exactHit') : t('closest', { v: near.value, d: diff })} {'⭐'.repeat(stars)}
          </Text>
        ) : null}
      </View>

      {/* History: fixed 4-line area */}
      <View style={{ height: 4 * 28 + 8, marginTop: 4, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 4, direction: 'ltr' }}>
        <ScrollView ref={(r) => r?.scrollToEnd({ animated: false })}>
          {ps.history.map((m, i) => (
            <View key={i} style={{ height: 28, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontFamily: fonts.numSemi, fontSize: 16, color: c.text, fontVariant: ['tabular-nums'] }}>
                {i + 1}. {m.a} {m.op} {m.b} = <Text style={{ color: m.result === p.target ? c.exact : c.text }}>{m.result}</Text>
              </Text>
              {!finished && (
                <Pressable onPress={() => rewind(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('a11yRemove', { n: i + 1 })}>
                  <Text style={{ color: c.text2, fontSize: 16, paddingHorizontal: 6 }}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}
          {!finished && ps.history.length < 5 && (
            <View style={{ height: 28, justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.numSemi, fontSize: 16, color: c.text2 }}>
                {ps.history.length + 1}. {A ? `${A.value} ${op ?? ''}` : '_'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <View style={{ flex: 1, minHeight: 8 }} />

      {/* Cards 3×2 */}
      <View style={{ gap: 12 }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 12 }}>
            {[0, 1, 2].map((col) => {
              const i = row * 3 + col;
              const card = ps.cards[i];
              const dim = !!(A && op && i !== aSlot && !card.used && applyOp(A.value, op, card.value) === null);
              return (
                <NumberCard
                  key={i}
                  value={card.value}
                  used={card.used}
                  made={card.made}
                  large={card.large}
                  selected={aSlot === i}
                  dim={dim || (finished && card.value !== p.target)}
                  faded={faded.includes(i) && !card.made}
                  bounceKey={bounce.slot === i ? bounce.k : 0}
                  onPress={() => onCard(i)}
                  testID={`card-${i}`}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Operators (always LTR) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, direction: 'ltr' }}>
        {OPS.map((o) => (
          <OpButton key={o} op={o} label={opName(t, o)} active={op === o} disabled={aSlot === null || finished} onPress={() => onOp(o)} />
        ))}
      </View>

      {/* Bottom bar */}
      <View style={{ height: 56, flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 8, alignItems: 'center' }}>
        {finished ? (
          finishedBar(() => setSheet(true))
        ) : (
          <>
            <Btn flex small label={t('undoBtn')} disabled={ps.history.length === 0 || pending} onPress={() => rewind(ps.history.length - 1)} />
            {unfinishedExtra ?? <Btn flex small label={t('hintBtn')} disabled={pending} onPress={onHint} />}
            {unfinishedExtra && <Btn style={{ flex: 0.6 }} small label="💡" a11y={t('hintBtn')} disabled={pending} onPress={onHint} />}
            <Btn
              style={{ flex: 1.45 }}
              small
              kind={stars === 3 ? 'exact' : 'primary'}
              label={t('submit', { s: stars })}
              disabled={pending}
              onPress={() => finish(ps, stars, diff)}
            />
          </>
        )}
      </View>

      <Sheet visible={sheet} onClose={() => setSheet(false)}>
        {renderSheet({
          rec,
          history: ps.history,
          reveal: async () => {
            if (await requestReward('reveal-solution')) saveRec({ revealed: true });
          },
          close: () => setSheet(false),
        })}
      </Sheet>
      <Confetti burst={burst} />
    </Screen>
  );
}

// ───────────────────────────── Tutorial (~15 s, learn by playing) ─────────────────────────────

const TUT = { numbers: [100, 50, 5], large: [true, true, false] };

function Tutorial({ onDone }: { onDone: () => void }) {
  const c = useTheme();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [ps, setPs] = useState<PlayState>(() => initialState(TUT));
  const [aSlot, setA] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [bounce, setBounce] = useState({ slot: -1, k: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const target = step === 0 ? 150 : 145;
  const stepStart = useRef<PlayState>(initialState(TUT));

  const onCard = (i: number) => {
    if (step > 1 || ps.cards[i].used || (step === 0 && i === 2)) return;
    if (aSlot === null || op === null) {
      setA(aSlot === i ? null : i);
      setOp(null);
      sound('tap');
      haptic.tap();
      return;
    }
    const next = play(ps, aSlot, op, i);
    setA(null);
    setOp(null);
    if (!next) {
      sound('error');
      haptic.error();
      return;
    }
    setPs(next);
    setBounce((x) => ({ slot: i, k: x.k + 1 }));
    if (next.cards[i].value === target) {
      sound(step === 0 ? 'pop' : 'win');
      haptic.success();
      timers.current.push(
        setTimeout(() => {
          stepStart.current = next;
          setStep(step + 1);
        }, 550),
      );
    } else {
      sound('error');
      haptic.error();
      timers.current.push(setTimeout(() => setPs(stepStart.current), 600));
    }
  };

  return (
    <Screen>
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
        <IconBtn label="←" a11y={t('back')} onPress={goBack} />
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: fonts.uiBold, fontSize: 17, color: c.text }}>{t('daily')}</Text>
        <View style={{ width: 40 }} />
      </View>
      {step < 2 ? (
        <View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 2, color: c.text2, marginBottom: 4 }}>{t('target')}</Text>
            <View style={{ minWidth: 120, height: 64, borderRadius: 16, borderWidth: 3, borderColor: c.accent, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.num, fontSize: 36, color: c.text }}>{target}</Text>
            </View>
          </View>
          <P c={c} center color={c.primary}>
            {step === 0 ? t('tut1') : t('tut2')}
          </P>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {ps.cards.map((card, i) => (
              <NumberCard
                key={i}
                value={card.value}
                used={card.used}
                made={card.made}
                large={card.large}
                selected={aSlot === i}
                dim={false}
                faded={false}
                hidden={step === 0 && i === 2}
                bounceKey={bounce.slot === i ? bounce.k : 0}
                onPress={() => onCard(i)}
                testID={`tcard-${i}`}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', direction: 'ltr' }}>
            {OPS.map((o) => (
              <OpButton
                key={o}
                op={o}
                label={opName(t, o)}
                active={op === o}
                disabled={aSlot === null}
                onPress={() => {
                  if (aSlot === null) return;
                  setOp(op === o ? null : o);
                  sound('tap');
                }}
              />
            ))}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
          <H c={c}>{t('tut3Title')}</H>
          {[t('tut3a'), t('tut3b'), t('tut3c')].map((s) => (
            <Text key={s} style={{ fontFamily: fonts.uiSemi, fontSize: 18, color: c.text, textAlign: 'center' }}>
              {s}
            </Text>
          ))}
          <P c={c} center>
            {t('tut3d')}
          </P>
          <Btn kind="primary" label={t('startDaily')} onPress={onDone} style={{ marginTop: 12 }} />
        </View>
      )}
    </Screen>
  );
}
