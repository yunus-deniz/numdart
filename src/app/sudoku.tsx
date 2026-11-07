/** Sudoku: 4×4, 5×5, 6×6 (colourful, for kids) and 9×9 — each easy / medium / hard / extreme. Endless. */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  conflicts,
  generateSudoku,
  isKidsSize,
  isSolved,
  modeOf,
  normalizeMode,
  parseMode,
  samePeerGroup,
  starsForSudoku,
  SUDOKU_LEVELS,
  SUDOKU_SIZES,
  type SudokuMode,
} from '../engine/sudoku';
import { Confetti } from '../components/Confetti';
import { Btn, H, IconBtn, P, Screen, Sheet } from '../components/ui';
import { freshSeed, sudokuStore } from '../lib/state';
import { useStore } from '../lib/store';
import { fonts, MAX_W, NUM_SCALE, useTheme } from '../lib/theme';
import { haptic, sound } from '../lib/feedback';
import { maybeShowInterstitial } from '../lib/ads';
import { requestReward } from '../lib/rewards';
import { levelLabel, modeLabel } from '../lib/sudokuLabel';

/** One bright colour per number on the kids' boards. */
const KID_NUM = ['', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#A855F7', '#EC4899'];
/** Soft tint per region on the kids' boards (light / dark). */
const KID_TINT_L = ['#FEF3C7', '#DCFCE7', '#DBEAFE', '#FCE7F3', '#EDE9FE', '#FFEDD5'];
const KID_TINT_D = ['#3B2F0B', '#0F2E1C', '#0F223F', '#3A1029', '#241A45', '#3A2210'];

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));


/** Start a brand-new puzzle (optionally in another mode). */
function newSudoku(mode?: SudokuMode) {
  const s = sudokuStore.get();
  const m = normalizeMode(mode ?? s.mode);
  const seed = freshSeed();
  const p = generateSudoku(m, seed);
  sudokuStore.set({ ...s, mode: m, seed, grid: p.puzzle.slice(), mistakes: 0, hints: 0, finished: false });
}

export default function SudokuScreen() {
  const s = useStore(sudokuStore);
  useEffect(() => {
    if (!sudokuStore.get().seed) newSudoku();
  }, []);
  if (!s.seed) return <Screen>{null}</Screen>;
  return <SudokuGame key={`${normalizeMode(s.mode)}-${s.seed}`} />;
}

function SudokuGame() {
  const c = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const s = useStore(sudokuStore);
  const mode = normalizeMode(s.mode);
  const { size, level } = parseMode(mode);
  const p = useMemo(() => generateSudoku(normalizeMode(s.mode), s.seed), [s.mode, s.seed]);
  const { n, region } = p;
  const grid = s.grid.length === n * n ? s.grid : p.puzzle;
  const kids = isKidsSize(n);
  const numColor = (v: number, fallback: string) => (kids ? KID_NUM[v] ?? fallback : fallback);

  const [sel, setSel] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [sheet, setSheet] = useState(false);
  const [rules, setRules] = useState(() => !sudokuStore.get().rulesSeen);
  const [confetti, setConfetti] = useState(0);

  const bad = useMemo(() => conflicts(grid, n, region), [grid, n, region]);
  const boardW = Math.min(width - 32, MAX_W - 32);
  const cell = Math.floor((boardW - 6) / n);
  const selVal = sel !== null ? grid[sel] : 0;

  const counts = useMemo(() => {
    const k = new Array(n + 1).fill(0);
    grid.forEach((v) => v && k[v]++);
    return k;
  }, [grid, n]);

  const save = (patch: Partial<typeof s>) => sudokuStore.set((x) => ({ ...x, ...patch }));

  const finish = (g: number[]) => {
    sudokuStore.set((x) => ({ ...x, grid: g, finished: true, solved: { ...x.solved, [mode]: (x.solved[mode] ?? 0) + 1 } }));
    sound('win');
    haptic.success();
    setConfetti((k) => k + 1);
    setSel(null);
    setMsg(t('sudWin'));
    setTimeout(() => setSheet(true), 900);
  };

  const put = (v: number) => {
    if (s.finished || sel === null || p.puzzle[sel]) return;
    const g = grid.slice();
    g[sel] = v;
    let mistakes = s.mistakes;
    if (v && v !== p.solution[sel]) {
      mistakes++;
      sound('error');
      haptic.error();
      setMsg(t('sudWrong'));
    } else {
      sound(v ? 'pop' : 'undo');
      haptic.tap();
      setMsg('');
    }
    save({ grid: g, mistakes });
    if (isSolved(g, p.solution)) finish(g);
  };

  const hint = async () => {
    if (s.finished) return;
    // the selected empty/wrong cell, else the first one that is not right yet
    const i = sel !== null && !p.puzzle[sel] && grid[sel] !== p.solution[sel] ? sel : grid.findIndex((v, k) => v !== p.solution[k]);
    if (i < 0) return;
    const ok = await requestReward('sudoku-hint');
    if (!ok) return;
    const g = grid.slice();
    g[i] = p.solution[i];
    save({ grid: g, hints: s.hints + 1 });
    setSel(i);
    sound('pop');
    if (isSolved(g, p.solution)) finish(g);
  };

  const next = async (mode?: SudokuMode) => {
    setSheet(false);
    if (s.finished) await maybeShowInterstitial(10);
    sound('undo');
    newSudoku(mode);
  };

  const closeRules = () => {
    setRules(false);
    sudokuStore.set((x) => ({ ...x, rulesSeen: true }));
  };

  const stars = starsForSudoku(s.mistakes);
  const doneCount = s.solved[mode] ?? 0;

  const chip = (key: string, label: string, on: boolean, onColor: string, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={() => !on && onPress()}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={4}
      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: on ? onColor : c.surface, borderWidth: 1, borderColor: on ? 'transparent' : c.border }}
    >
      <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.uiBold, fontSize: 13, color: on ? '#fff' : c.text2 }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Screen>
      {/* Top bar */}
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
        <IconBtn label="←" a11y={t('back')} onPress={goBack} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text maxFontSizeMultiplier={NUM_SCALE} style={{ fontFamily: fonts.uiBold, fontSize: 17, color: c.text }}>
            {t('sudTitle')} · ✓{doneCount}
          </Text>
        </View>
        <IconBtn label="?" a11y={t('sudRulesTitle')} onPress={() => setRules(true)} />
      </View>

      {/* Size picker: kids (4/5/6) · grown-ups (9) */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 2 }}>
        {SUDOKU_SIZES.map((z) =>
          chip(`s${z}`, `${isKidsSize(z) ? '🧒 ' : '🧑 '}${z}×${z}`, z === size, isKidsSize(z) ? '#16A34A' : c.primary, () => next(modeOf(z, level))),
        )}
      </View>
      {/* Level picker */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 }}>
        {SUDOKU_LEVELS.map((l) =>
          chip(`l${l}`, levelLabel(t, l), l === level, l === 'extreme' ? '#DC2626' : l === 'hard' ? '#EA580C' : kids ? '#16A34A' : c.primary, () => next(modeOf(size, l))),
        )}
      </View>

      {/* Status */}
      <View style={{ height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        <Text style={{ fontFamily: fonts.uiSemi, fontSize: 13, color: s.mistakes ? c.far : c.text2 }}>{t('sudMistakes', { n: s.mistakes })}</Text>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: 'right', fontFamily: fonts.uiSemi, fontSize: 13, color: s.finished ? c.exact : c.far }}>
          {msg}
        </Text>
      </View>

      {/* Board */}
      <View style={{ alignItems: 'center' }}>
        <View style={{ borderWidth: 3, borderColor: c.text, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surface }}>
          {Array.from({ length: n }, (_, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {Array.from({ length: n }, (_, col) => {
                const i = r * n + col;
                const v = grid[i];
                const given = !!p.puzzle[i];
                const isSel = sel === i;
                const related = sel !== null && samePeerGroup(sel, i, n, region);
                const sameVal = !!selVal && v === selVal;
                const wrong = !given && !!v && (v !== p.solution[i] || bad.has(i));
                const base = kids ? (c.dark ? KID_TINT_D : KID_TINT_L)[region[i] % 6] : c.surface;
                const bg = isSel ? c.primary : sameVal ? (c.dark ? '#3730A3' : '#C7D2FE') : related ? (c.dark ? '#1E293B' : kids ? '#E0E7FF' : '#EEF2FF') : base;
                const edgeR = col < n - 1 && region[i] !== region[i + 1];
                const edgeB = r < n - 1 && region[i] !== region[i + n];
                return (
                  <Pressable
                    key={col}
                    onPress={() => {
                      setSel(i);
                      sound('tap');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${r + 1}-${col + 1}: ${v || ''}`}
                    style={{
                      width: cell,
                      height: cell,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: bg,
                      borderRightWidth: col === n - 1 ? 0 : edgeR ? 2.5 : 0.5,
                      borderBottomWidth: r === n - 1 ? 0 : edgeB ? 2.5 : 0.5,
                      borderRightColor: edgeR ? c.text : c.border,
                      borderBottomColor: edgeB ? c.text : c.border,
                    }}
                  >
                    {!!v && (
                      <Text
                        allowFontScaling={false}
                        style={{
                          fontFamily: given ? fonts.num : fonts.numSemi,
                          fontSize: cell * (kids ? 0.5 : 0.56),
                          color: isSel ? '#fff' : wrong ? c.far : given ? (kids ? numColor(v, c.text) : c.text) : numColor(v, c.primary),
                        }}
                      >
                        {v}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      {/* Number pad */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
        {Array.from({ length: n }, (_, k) => k + 1).map((v) => {
          const done = counts[v] >= n;
          const w = n === 9 ? Math.floor((boardW - 8 * 6) / 9) : Math.min(64, Math.floor((boardW - (n - 1) * 8) / n));
          return (
            <Pressable key={v} onPress={() => put(v)} disabled={done || s.finished} accessibilityRole="button" accessibilityLabel={String(v)}>
              {({ pressed }) => (
                <View style={{ width: w, height: n === 9 ? 52 : 60, borderRadius: 12, backgroundColor: c.lip, paddingBottom: pressed ? 1 : 3, opacity: done ? 0.3 : 1 }}>
                  <View style={{ flex: 1, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border }}>
                    <Text allowFontScaling={false} style={{ fontFamily: fonts.num, fontSize: n === 9 ? 24 : 28, color: numColor(v, c.primary) }}>
                      {v}
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 8 }}>
        {s.finished ? (
          <Btn flex kind="primary" label={t('sudNext')} onPress={() => next()} />
        ) : (
          <>
            <Btn flex small label={`⌫ ${t('sudErase')}`} onPress={() => put(0)} />
            <Btn flex small label={`💡 ${t('sudHint')}`} onPress={hint} />
            <Btn flex small label={`↻ ${t('sudNew')}`} onPress={() => next()} />
          </>
        )}
      </View>

      {confetti > 0 && <Confetti key={confetti} burst={confetti} />}

      <Sheet visible={sheet} onClose={() => setSheet(false)}>
        <Text style={{ fontSize: 40, textAlign: 'center', letterSpacing: 4 }}>{'⭐'.repeat(stars) + '☆'.repeat(3 - stars)}</Text>
        <H c={c}>{t('sudWin')}</H>
        <P c={c} center>
          {modeLabel(t, mode)} · {t('sudMistakes', { n: s.mistakes })}
        </P>
        <Btn kind="primary" label={t('sudNext')} onPress={() => next()} />
      </Sheet>

      <Sheet visible={rules} onClose={closeRules}>
        <H c={c}>{t('sudRulesTitle')}</H>
        <P c={c}>👆 {t('sudRule1')}</P>
        <P c={c}>🔲 {t('sudRule2')}</P>
        <P c={c}>🧒 {t('sudRule3')}</P>
        <Btn kind="primary" label={t('tenGotIt')} onPress={closeRules} />
      </Sheet>
    </Screen>
  );
}
