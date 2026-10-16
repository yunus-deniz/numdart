/** Board Clear — the main screen. Opens straight into the current level. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  canSelect,
  formula,
  generateLevel,
  initialBoard,
  isCleared,
  judge,
  pop,
  solveBoard,
  targetLabel,
  type BoardState,
  type Level,
} from '../engine/board';
import { localDateISO } from '../engine/dates';
import { BoardTile } from '../components/BoardTile';
import { TargetQueue } from '../components/TargetQueue';
import { Confetti } from '../components/Confetti';
import { Btn, IconBtn, Screen } from '../components/ui';
import { boardStore, dailyStore } from '../lib/state';
import { useStore } from '../lib/store';
import { fonts, NUM_SCALE, useTheme } from '../lib/theme';
import { haptic, sound } from '../lib/feedback';
import { requestReward } from '../lib/rewards';

const GAP = 12;

export default function BoardScreen() {
  const prog = useStore(boardStore);
  // Remount the play area per level so all transient state resets cleanly.
  return <LevelPlay key={prog.level} level={prog.level} />;
}

function LevelPlay({ level }: { level: number }) {
  const c = useTheme();
  const { t } = useTranslation();
  const L: Level = useMemo(() => generateLevel(level), [level]);
  const prog = useStore(boardStore);
  const daily = useStore(dailyStore);
  const today = localDateISO();
  const dailyPending = prog.dailyUnlockedHint && !daily.records[today]?.finished;

  const resume = prog.current && prog.current.level === level ? prog.current : null;
  const [state, setState] = useState<BoardState>(() => resume?.state ?? initialBoard(L));
  const [history, setHistory] = useState<BoardState[]>(() => resume?.history ?? []);
  const [undoUsed, setUndoUsed] = useState(() => resume?.undoUsed ?? false);
  const [sel, setSel] = useState<number[]>([]);
  const [popping, setPopping] = useState<number[]>([]);
  const [over, setOver] = useState<number[]>([]);
  const [locked, setLocked] = useState(() => (resume ? !isCleared(resume.state) && !solveBoard(L, resume.state) : false));
  const [won, setWon] = useState(false);
  const [hintGroup, setHintGroup] = useState<number[] | null>(null);
  const [burst, setBurst] = useState(0);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  // App was closed during the win animation: move on to the next level.
  useEffect(() => {
    if (resume && isCleared(resume.state)) {
      boardStore.set((p) => ({
        ...p,
        level: level + 1,
        maxLevel: Math.max(p.maxLevel, level + 1),
        current: null,
        dailyUnlockedHint: p.dailyUnlockedHint || level >= 4,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-generate the next level in the background so the transition is instant.
  useEffect(() => {
    const id = setTimeout(() => generateLevel(level + 1), 800);
    return () => clearTimeout(id);
  }, [level]);

  // Persist the in-progress level so the app resumes exactly where it was.
  useEffect(() => {
    if (won) return;
    boardStore.set((p) => ({ ...p, current: { level, state, history: history.slice(-12), undoUsed } }));
  }, [level, state, history, undoUsed, won]);

  const target = L.targets[state.targetIndex];
  const vals = sel.map((i) => state.values[i] as number);
  const busy = popping.length > 0 || over.length > 0 || won || locked;

  const commitPop = useCallback(
    (cells: number[]) => {
      const next = pop(L, state, cells);
      setHistory((h) => [...h, state]);
      setState(next);
      setSel([]);
      setPopping([]);
      setHintGroup(null);
      if (isCleared(next)) {
        setWon(true);
        setBurst((b) => b + 1);
        sound('win');
        haptic.success();
        later(1500, () => {
          boardStore.set((p) => ({
            ...p,
            level: level + 1,
            maxLevel: Math.max(p.maxLevel, level + 1),
            current: null,
            dailyUnlockedHint: p.dailyUnlockedHint || level >= 4,
          }));
        });
      } else if (!solveBoard(L, next)) {
        setLocked(true);
        haptic.error();
      }
    },
    [L, state, level],
  );

  const onTile = (i: number) => {
    if (busy || !target || !canSelect(state, i)) return;
    if (sel.includes(i)) {
      setSel(sel.filter((x) => x !== i));
      sound('tap');
      haptic.tap();
      return;
    }
    const next = [...sel, i];
    const status = judge(target, next.map((k) => state.values[k] as number));
    setSel(next);
    if (status === 'hit') {
      setPopping(next);
      sound('pop');
      haptic.pop();
      later(380, () => commitPop(next));
    } else if (status === 'over') {
      setOver(next);
      sound('error');
      haptic.error();
      later(450, () => {
        setSel([]);
        setOver([]);
      });
    } else {
      sound('tap');
      haptic.tap();
    }
  };

  // Free, unlimited "undo last move" (friendlier than the old once-per-level undo-3).
  const undoLast = () => {
    if (history.length === 0) return;
    const back = history[history.length - 1];
    setState(back);
    setHistory(history.slice(0, -1));
    setUndoUsed(true);
    setSel([]);
    setHintGroup(null);
    setLocked(!solveBoard(L, back));
    sound('undo');
  };

  const hint = async () => {
    if (!(await requestReward('board-hint'))) return;
    // Walk back to the latest snapshot that still has a solution.
    const stack = [...history, state];
    for (let k = stack.length - 1; k >= 0; k--) {
      const path = solveBoard(L, stack[k]);
      if (path) {
        setState(stack[k]);
        setHistory(stack.slice(0, k));
        setSel([]);
        setLocked(false);
        setHintGroup(path[0]);
        if (k < stack.length - 1) sound('undo');
        return;
      }
    }
  };

  const restart = () => {
    setState(initialBoard(L));
    setHistory([]);
    setSel([]);
    setLocked(false);
    setHintGroup(null);
    sound('undo');
  };

  const onLayout = (e: LayoutChangeEvent) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const tile = Math.floor(
    Math.min(L.cols * L.rows <= 6 ? 112 : 96, (area.w - GAP * (L.cols - 1)) / L.cols, (area.h - GAP * (L.rows - 1)) / L.rows),
  );

  // Scripted onboarding inside the first levels.
  const pulseCells = new Set<number>(hintGroup ?? (level === 1 && state.targetIndex === 0 && sel.length === 0 ? [0, 3] : []));
  let caption = '';
  if (won) caption = t('cleared');
  else if (sel.length) caption = '';
  else if (level === 1 && state.targetIndex === 0) caption = t('tapTwo', { t: target?.value ?? 10 });
  else if (level === 2) caption = t('pickHint');
  
  return (
    <Screen>
      {/* Top bar */}
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
        <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.uiBold, fontSize: 18, color: c.text, flex: 1 }}>
          {t('level', { n: level })}
        </Text>
        <IconBtn label="🔟" a11y="Number Ten" onPress={() => router.push('/ten')} />
        <IconBtn label="🎯" a11y={t('daily')} dot={dailyPending} onPress={() => router.push('/daily')} />
        <IconBtn label="⚙" a11y={t('settings')} onPress={() => router.push('/settings')} />
        <IconBtn label="📊" a11y={t('stats')} onPress={() => router.push('/stats')} />
      </View>
      {/* Target queue + live capsule */}
      <View style={{ marginTop: 12 }}>
        <TargetQueue targets={L.targets} index={Math.min(state.targetIndex, L.targets.length)} />
        <View style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
          {sel.length > 0 && target ? (
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: over.length ? c.far : popping.length ? c.exact : c.surface,
                borderWidth: 1,
                borderColor: over.length || popping.length ? 'transparent' : c.border,
              }}
            >
              <Text
                maxFontSizeMultiplier={NUM_SCALE}
                style={{ fontFamily: fonts.numSemi, fontSize: 16, color: over.length || popping.length ? '#fff' : c.text, fontVariant: ['tabular-nums'] }}
              >
                {formula(target.kind, vals)} / {targetLabel(target)}
              </Text>
            </View>
          ) : dailyPending && level >= 5 && !won ? (
            <Pressable onPress={() => router.push('/daily')} accessibilityRole="button">
              <View style={{ backgroundColor: c.accent, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ color: '#fff', fontFamily: fonts.uiSemi, fontSize: 14 }}>🎯 {t('dailyReady')}</Text>
              </View>
            </Pressable>
          ) : (
            <Text style={{ fontFamily: fonts.uiSemi, fontSize: 15, color: won ? c.exact : c.text2 }}>{caption}</Text>
          )}
        </View>
      </View>

      {/* Board */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 8 }} onLayout={onLayout}>
        {tile > 0 && (
          <View style={{ width: tile * L.cols + GAP * (L.cols - 1), flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
            {state.values.map((v, i) => (
              <BoardTile
                key={i}
                value={v}
                size={tile}
                order={sel.indexOf(i) + 1}
                popping={popping.includes(i)}
                over={over.includes(i)}
                frozen={!!state.frozen[i] && v !== null}
                pulse={pulseCells.has(i)}
                onPress={() => onTile(i)}
                testID={`tile-${i}`}
              />
            ))}
          </View>
        )}
        {locked && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              backgroundColor: c.bg,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.border,
              padding: 20,
              gap: 10,
            }}
          >
            <Text style={{ fontFamily: fonts.uiBold, fontSize: 22, color: c.text, textAlign: 'center' }}>{t('noMoves')}</Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 14, color: c.text2, textAlign: 'center', marginBottom: 6 }}>{t('noMovesSub')}</Text>
            {history.length > 0 && <Btn kind="primary" label={t('undoLast')} onPress={undoLast} />}
            <Btn kind="accent" label={t('hintFix')} onPress={hint} a11y={`${t('hintFix')}. ${t('hintFixSub')}`} />
            <Btn label={t('restart')} onPress={restart} />
          </View>
        )}
      </View>

      {/* Bottom bar */}
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row' }}>
          <IconBtn label="↻" a11y={t('restart')} onPress={restart} />
          {history.length > 0 && !won && <IconBtn label="↺" a11y={t('undoLast')} onPress={undoLast} />}
        </View>
        <Text style={{ fontFamily: fonts.ui, color: c.text2, fontSize: 13 }}>
          {Math.min(state.targetIndex, L.targets.length)}/{L.targets.length}
        </Text>
        <IconBtn label="💡" a11y={t('hintBtn')} onPress={hint} />
      </View>
      <Confetti burst={burst} />
    </Screen>
  );
}
