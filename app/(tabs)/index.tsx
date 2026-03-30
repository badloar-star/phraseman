import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Alert, Dimensions, Animated, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import { LESSON_NAMES_RU, LESSON_NAMES_UK } from '../../constants/lessons';
import { DEV_MODE } from '../config';
import { hapticTap } from '../../hooks/use-haptics';
import { loadAllMedals, getMedalTier, getExamMedalTier, MEDAL_DOT_COLOR, getEarnedDots, type MedalTier } from '../medal_utils';

const LESSON_TOTAL = 32;

// ── CEFR палитры (не зависят от темы) ─────────────────────────────────────────
const PALETTE: Record<string, string[]> = {
  A1: ['#88D4A0','#78C892','#68BC84','#58B076','#48A468','#38985A','#288C4C','#18803E'],
  A2: ['#80C8E8','#6DBCDE','#5AB0D4','#47A4CA','#3498C0','#218CB6','#0E80AC','#007AA2','#006E98','#00628E'],
  B1: ['#F2CA54','#EAC046','#E2B638','#DAAC2A','#D2A21C','#CA980E','#C28E00','#BA8400','#B27A00','#AA7000'],
  B2: ['#F09050','#E87840','#E06030','#D84820'],
};

const EXAM_META: Record<string, { bg: string; accent: string; icon: string }> = {
  A1: { bg: '#1A7A40', accent: '#A8F0C0', icon: 'school-outline' },
  A2: { bg: '#0A5A8C', accent: '#A0D8F0', icon: 'school-outline' },
  B1: { bg: '#7A5800', accent: '#F8DC80', icon: 'school-outline' },
  B2: { bg: '#1C1200', accent: '#FFD700', icon: 'trophy'          },
};

function bookPalette(num: number): string {
  let key: string; let idx: number;
  if      (num <= 8)  { key = 'A1'; idx = num - 1;  }
  else if (num <= 18) { key = 'A2'; idx = num - 9;  }
  else if (num <= 28) { key = 'B1'; idx = num - 19; }
  else                { key = 'B2'; idx = num - 29; }
  return PALETTE[key][Math.min(idx, PALETTE[key].length - 1)];
}

// ── Overlapping medal dots ────────────────────────────────────────────────────
function MedalDots({ dots }: { dots: string[] }) {
  if (dots.length === 0) return null;
  const DOT = 16;
  const OFFSET = 10; // overlap amount
  const totalW = DOT + (dots.length - 1) * OFFSET;
  return (
    <View style={{ width: totalW, height: DOT }}>
      {dots.map((key, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: i * OFFSET,
          width: DOT, height: DOT, borderRadius: DOT / 2,
          backgroundColor: MEDAL_DOT_COLOR[key] ?? '#888',
          borderWidth: 1.5,
          borderColor: 'rgba(0,0,0,0.25)',
          zIndex: dots.length - i,
        }} />
      ))}
    </View>
  );
}

// Высоты элементов (должны точно совпадать с реальным рендером)
const HEADER_H  = 66;  // ListHeader
const CEFR_H    = 52;  // CEFR divider item
const BOOK_H    = 66;  // высота книги
const LESSON_H  = BOOK_H + 5;  // marginTop:5 + BOOK_H
const EXAM_H    = 78 + 8;      // examH + marginTop:8

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function LessonsTab() {
  const router          = useRouter();
  const { goHome }      = useTabNav();
  const { theme: t, f, themeMode } = useTheme();
  const cardText = 'rgba(255,255,255,0.65)';
  const cardTitle = 'rgba(255,255,255,0.95)';
  const { lang }        = useLang();
  const isUK            = lang === 'uk';
  const { height: SCREEN_H } = useWindowDimensions();
  const VIEWPORT_H = SCREEN_H - 90; // approx tab bar + status bar

  const [scores,         setScores]         = useState<number[]>(new Array(32).fill(0));
  const [passCounts,     setPassCounts]     = useState<number[]>(new Array(32).fill(0));
  const [examBestPcts,   setExamBestPcts]   = useState<Record<string, number>>({});
  const [examPassCounts, setExamPassCounts] = useState<Record<string, number>>({});
  const [placementLevel, setPlacementLevel] = useState<string>('A1');
  const [examResults,    setExamResults]    = useState<Record<string, { pct: number; passed: boolean }>>({});
  const scrollRef  = useRef<any>(null);
  const scrollY    = useRef(new Animated.Value(0)).current;
  const { activeIdx, focusTick } = useTabNav();

  useEffect(() => {
    if (activeIdx === 1 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [activeIdx]);

  useEffect(() => { loadScores(); }, []);
  useEffect(() => { loadScores(); }, [focusTick]);
  useEffect(() => { if (activeIdx === 1) loadScores(); }, [activeIdx]);

  const loadScores = () => {
    AsyncStorage.getItem('placement_level').then(pl => { if (pl) setPlacementLevel(pl); });
    Promise.all(
      Array.from({ length: 32 }, (_, i) => i).map(async i => {
        try {
          const saved = await AsyncStorage.getItem(`lesson${i + 1}_progress`);
          if (!saved) return 0;
          const p: string[] = JSON.parse(saved);
          if (p.length === 0) return 0;
          return p.filter(x => x === 'correct' || x === 'replay_correct').length / p.length * 5;
        } catch { return 0; }
      })
    ).then(setScores);
    // Pass counts for lesson gem dots
    Promise.all(
      Array.from({ length: 32 }, (_, i) =>
        AsyncStorage.getItem(`lesson${i + 1}_pass_count`).then(v => parseInt(v || '0') || 0)
      )
    ).then(setPassCounts);

    Promise.all(['A1','A2','B1','B2'].map(async lvl => {
      const [pctRaw, passedRaw, bestRaw, examPassRaw] = await Promise.all([
        AsyncStorage.getItem(`level_exam_${lvl}_pct`),
        AsyncStorage.getItem(`level_exam_${lvl}_passed`),
        AsyncStorage.getItem(`level_exam_${lvl}_best_pct`),
        AsyncStorage.getItem(`level_exam_${lvl}_pass_count`),
      ]);
      return {
        lvl,
        pct:       parseInt(pctRaw    || '0') || 0,
        passed:    passedRaw === '1',
        bestPct:   parseInt(bestRaw   || '0') || 0,
        examPass:  parseInt(examPassRaw || '0') || 0,
      };
    })).then(results => {
      const map:     Record<string, { pct: number; passed: boolean }> = {};
      const bestMap: Record<string, number> = {};
      const passMap: Record<string, number> = {};
      results.forEach(r => {
        map[r.lvl]     = { pct: r.pct, passed: r.passed };
        bestMap[r.lvl] = r.bestPct;
        passMap[r.lvl] = r.examPass;
      });
      setExamResults(map);
      setExamBestPcts(bestMap);
      setExamPassCounts(passMap);
    });
  };

  const lessons = isUK ? LESSON_NAMES_UK : LESSON_NAMES_RU;

  const unlockedLessons = useMemo(() => {
    if (DEV_MODE) return new Array(32).fill(true);
    const LEVEL_ORDER = ['A1','A2','B1','B2','C1','C2'];
    const plIdx = LEVEL_ORDER.indexOf(placementLevel);
    const blockAll45 = (from: number, to: number) =>
      scores.slice(from - 1, to).every(s => s >= 4.5);
    const u = new Array(32).fill(false);
    u[0] = true;
    for (let i = 1; i < 32; i++) {
      const num = i + 1;
      if      (num === 9)  u[i] = blockAll45(1, 8);
      else if (num === 19) u[i] = blockAll45(9, 18);
      else if (num === 29) u[i] = blockAll45(19, 28);
      else                 u[i] = u[i - 1] && scores[i - 1] >= 2.5;
    }
    return u;
  }, [scores, placementLevel]);

  type ListItem =
    | { kind: 'header'; label: string; color: string }
    | { kind: 'lesson'; index: number; name: string }
    | { kind: 'exam';   level: string };

  const listData: ListItem[] = useMemo(() => {
    const data: ListItem[] = [];
    const HEADERS: [number, string, string][] = [
      [1,  'A1', PALETTE.A1[4]],
      [9,  'A2', PALETTE.A2[4]],
      [19, 'B1', PALETTE.B1[4]],
      [29, 'B2', PALETTE.B2[2]],
    ];
    lessons.forEach((name, idx) => {
      const num = idx + 1;
      const hdr = HEADERS.find(([n]) => n === num);
      if (hdr) data.push({ kind: 'header', label: hdr[1], color: hdr[2] });
      data.push({ kind: 'lesson', index: idx, name });
      if (num === 8 || num === 18 || num === 28 || num === 32) {
        const lvl = num <= 8 ? 'A1' : num <= 18 ? 'A2' : num <= 28 ? 'B1' : 'B2';
        data.push({ kind: 'exam', level: lvl });
      }
    });
    return data;
  }, [lessons]);

  // ── Per-item scale animations based on scroll position ───────────────────
  const itemAnims = useMemo(() => {
    let y = HEADER_H;
    return listData.map(item => {
      const absY = y;
      let h: number;
      if      (item.kind === 'header') h = CEFR_H;
      else if (item.kind === 'lesson') h = LESSON_H;
      else                             h = EXAM_H;
      y += h;

      if (item.kind === 'header') return null;

      const itemCenterY = absY + h / 2;
      const peakScroll  = itemCenterY - VIEWPORT_H / 2;
      const scale = scrollY.interpolate({
        inputRange:  [peakScroll - 140, peakScroll, peakScroll + 140],
        outputRange: [1, 1.04, 1],
        extrapolate: 'clamp',
      });
      return scale;
    });
  }, [listData, VIEWPORT_H]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScreenGradient>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={1}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, paddingBottom: 6 }}>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}
            onPress={() => { hapticTap(); goHome(); }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '700' }}>
            {isUK ? 'Уроки' : 'Уроки'}
          </Text>
        </View>

        {/* Items */}
        {listData.map((item, i) => {
          const scaleAnim = itemAnims[i];

          // ── CEFR divider ─────────────────────────────────────────────
          if (item.kind === 'header') {
            return (
              <View key={`h-${item.label}`} style={{ paddingLeft: 14, paddingTop: 14, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: item.color }} />
                <Text style={{ color: item.color, fontSize: f.label, fontWeight: '800', letterSpacing: 1.4 }}>
                  {item.label}
                </Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: item.color + '30' }} />
              </View>
            );
          }

          // ── Exam card ────────────────────────────────────────────────
          if (item.kind === 'exam') {
            const { level: lvl } = item;
            const meta     = EXAM_META[lvl];
            const [from, to] = lvl === 'A1' ? [1,8] : lvl === 'A2' ? [9,18] : lvl === 'B1' ? [19,28] : [29,32];
            const allDone  = DEV_MODE || scores.slice(from - 1, to).every(s => s >= 4.5);
            const result   = examResults[lvl];
            const isB2     = lvl === 'B2';
            const examMedal = getExamMedalTier(examBestPcts[lvl] ?? 0);
            const examPass  = examPassCounts[lvl] ?? 0;
            const examDots  = getEarnedDots(examMedal, examPass);

            const label = isUK
              ? (isB2 ? 'Екзамен' : `Залік ${lvl}`)
              : (isB2 ? 'Экзамен' : `Экзамен ${lvl}`);

            const subLine = result
              ? (result.passed
                  ? (isUK ? `✅ Здано — ${result.pct}%` : `✅ Сдан — ${result.pct}%`)
                  : (isUK ? `✗ ${result.pct}%` : `✗ ${result.pct}%`))
              : allDone
                ? (isUK ? 'Натисни щоб почати' : 'Нажми чтобы начать')
                : (isUK ? `Завершіть усі уроки ${lvl} на 4.5+` : `Завершите все уроки ${lvl} на 4.5+`);

            return (
              <Animated.View key={`e-${lvl}`} style={{ marginTop: 8, transform: [{ scale: scaleAnim ?? 1 }] }}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => {
                    hapticTap();
                    if (allDone) router.push({ pathname: '/level_exam', params: { level: lvl } });
                    else Alert.alert(
                      isUK ? 'Недоступно' : 'Недоступно',
                      isUK ? `Спочатку пройдіть всі уроки ${lvl} з оцінкою 4.5+` : `Сначала пройдите все уроки ${lvl} с оценкой 4.5+`
                    );
                  }}
                  style={{
                    height: 78,
                    flexDirection: 'row',
                    backgroundColor: meta.bg,
                    opacity: allDone ? 1 : 0.5,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 4 }}>
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: meta.accent + '30' }} />
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5, backgroundColor: meta.accent + '30' }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons
                        name={result?.passed ? 'checkmark-circle' : allDone ? (meta.icon as any) : 'lock-closed-outline'}
                        size={isB2 ? 26 : 22}
                        color={meta.accent}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: meta.accent, fontSize: isB2 ? f.h2 : f.bodyLg, fontWeight: '800' }} maxFontSizeMultiplier={1}>
                          {label}
                        </Text>
                        <Text style={{ color: meta.accent + 'AA', fontSize: f.sub, marginTop: 1 }} maxFontSizeMultiplier={1}>
                          {subLine}
                        </Text>
                      </View>
                      {allDone && <Ionicons name="chevron-forward" size={16} color={meta.accent + '80'} />}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          }

          // ── Lesson book ──────────────────────────────────────────────
          const { index, name } = item;
          const num        = index + 1;
          const score      = scores[index];
          const passCount  = passCounts[index] ?? 0;
          const isUnlocked = unlockedLessons[index];
          const bg         = bookPalette(num);
          const medalDots  = getEarnedDots(getMedalTier(score), passCount);

          return (
            <Animated.View key={`l-${num}`} style={{ marginTop: 5, transform: [{ scale: scaleAnim ?? 1 }] }}>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => {
                  hapticTap();
                  if (isUnlocked) {
                    router.push({ pathname: '/lesson_menu', params: { id: num } });
                  } else {
                    const isLevelStart = num === 9 || num === 19 || num === 29;
                    const prevLevel = num <= 18 ? 'A1' : num <= 28 ? 'A2' : 'B1';
                    Alert.alert(
                      isUK ? 'Урок заблоковано' : 'Урок заблокирован',
                      isLevelStart
                        ? (isUK ? `Завершіть усі уроки ${prevLevel} на 4.5+` : `Завершите все уроки ${prevLevel} на 4.5+`)
                        : (isUK ? `Пройдіть урок ${num - 1} з оцінкою 2.5+` : `Пройдите урок ${num - 1} с оценкой 2.5+`)
                    );
                  }
                }}
                style={{
                  height: BOOK_H,
                  flexDirection: 'row',
                  backgroundColor: bg,
                  opacity: isUnlocked ? 1 : 0.42,
                  overflow: 'hidden',
                }}
              >
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ color: cardText, fontSize: f.label, fontWeight: '700', letterSpacing: 0.7 }} maxFontSizeMultiplier={1}>
                      {isUK ? 'УРОК' : 'УРОК'} {num}
                    </Text>
                    {isUnlocked && medalDots.length > 0 && (
                      <MedalDots dots={medalDots} />
                    )}
                    {!isUnlocked && (
                      <Ionicons name="lock-closed" size={12} color={cardText} />
                    )}
                  </View>
                  <Text style={{ color: cardTitle, fontSize: f.body, fontWeight: '700' }} numberOfLines={1} maxFontSizeMultiplier={1}>
                    {name}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </ScreenGradient>
  );
}
