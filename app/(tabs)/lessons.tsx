import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Dimensions, Animated, useWindowDimensions, Image, DeviceEventEmitter,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import { LinearGradient } from 'expo-linear-gradient';
import { lessonNamesForLang } from '../../constants/lessons';
import { triLang } from '../../constants/i18n';
import { DEV_MODE } from '../config';
import { hapticTap } from '../../hooks/use-haptics';
import { getExamMedalTier, getEarnedDots } from '../medal_utils';
import { prefetchLessonMenuCache } from '../lesson_menu';
import ReportErrorButton from '../../components/ReportErrorButton';
import ThemedChoiceModal from '../../components/ThemedChoiceModal';
import { effectiveLessonStarScore } from '../lesson_star_score';
import EnergyBar from '../../components/EnergyBar';

/** Снимок UI списку уроків: survives remount між сесіями таба (див. `_layout.tsx` lazy tabs). */
type LessonsUiCache = {
  scores: number[];
  progCounts: number[];
  passCounts: number[];
  examBestPcts: Record<string, number>;
  examPassCounts: Record<string, number>;
  examResults: Record<string, { pct: number; passed: boolean }>;
  placementLevel: string;
  persistedUnlocked: number[];
  noLimits: boolean;
};

let lessonsUiSessionCache: LessonsUiCache | null = null;

/**
 * Единый стиль карточек списка уроков (как «Туман» / «Графит»).
 * Объявлено на уровне модуля (не внутри компонента): имя начинается с `use` — внутри функции
 * Metro/Hermes + Fast Refresh иногда дают «Property 'useSketchLessonVisual' doesn't exist».
 */
export const useSketchLessonVisual = true;

// ── Список уроков: один стиль «Туман / Графит» (мягкие заливки + чернила) во всех темах приложения ──
const PALETTE_SKETCH: Record<string, string> = {
  A1: '#B8DFC8',
  A2: '#A8CCE8',
  B1: '#EDD89A',
  B2: '#E8B8A0',
};

const EXAM_META_SKETCH: Record<string, { bg: string; accent: string; icon: string }> = {
  A1: { bg: '#4A564E', accent: '#F2F6F3', icon: 'school-outline' },
  A2: { bg: '#3D4E5C', accent: '#EAF0F5', icon: 'school-outline' },
  B1: { bg: '#5A4F3A', accent: '#FAF6EC', icon: 'school-outline' },
  B2: { bg: '#3A3630', accent: '#F5F2EC', icon: 'trophy' },
};

function cefrKey(num: number): string {
  if (num <= 8)  return 'A1';
  if (num <= 18) return 'A2';
  if (num <= 28) return 'B1';
  return 'B2';
}

function bookPalette(num: number): string {
  return PALETTE_SKETCH[cefrKey(num)];
}

function darkenHex(hex: string, factor = 0.45): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

function lightenHex(hex: string, factor = 1.3): string {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor));
  return `rgb(${r},${g},${b})`;
}

// ── Medal images ────────────────────────────────────────────────────────────
const MEDAL_IMAGES: Record<string, any> = {
  bronze:  require('../../assets/images/levels/bronza.webp'),
  silver:  require('../../assets/images/levels/serebro.webp'),
  gold:    require('../../assets/images/levels/zoloto.webp'),
  ruby:    require('../../assets/images/levels/rubin.webp'),
  emerald: require('../../assets/images/levels/izumrud.webp'),
  diamond: require('../../assets/images/levels/almaz.webp'),
};

function MedalDots({ dots }: { dots: string[] }) {
  if (dots.length === 0) return null;
  const SIZE = 22;
  const OFFSET = 14;
  const totalW = SIZE + (dots.length - 1) * OFFSET;
  return (
    <View style={{ width: totalW, height: SIZE }}>
      {dots.map((key, i) => (
        <Image
          key={i}
          source={MEDAL_IMAGES[key]}
          style={{
            position: 'absolute',
            left: i * OFFSET,
            width: SIZE,
            height: SIZE,
            zIndex: dots.length - i,
          }}
          resizeMode="contain"
        />
      ))}
    </View>
  );
}

// Высоты элементов (должны точно совпадать с реальным рендером)
const HEADER_H  = 66;  // ListHeader
const CEFR_H    = 52;  // CEFR divider item
const BOOK_H    = 72;  // высота книги
const LESSON_H  = BOOK_H + 5;  // marginTop:5 + BOOK_H
const EXAM_H    = 78 + 8;      // examH + marginTop:8

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function LessonsTab() {
  const router          = useRouter();
  const { goHome }      = useTabNav();
  const { theme: t, f, themeMode } = useTheme();
  const screenTitleColor = (themeMode === 'sakura' || themeMode === 'ocean')
    ? (themeMode === 'ocean' ? 'rgba(240,252,255,0.95)' : 'rgba(255,248,252,0.95)')
    : t.textPrimary;
  const { lang, s }        = useLang();
  const { height: SCREEN_H } = useWindowDimensions();
  const VIEWPORT_H = SCREEN_H - 90; // approx tab bar + status bar

  const boot = lessonsUiSessionCache;
  const [noLimits,       setNoLimits]       = useState(() => boot?.noLimits ?? false);
  const { isPremium } = usePremium();
  const [scores,         setScores]         = useState<number[]>(() => boot?.scores ?? new Array(32).fill(0));
  const [progCounts,     setProgCounts]     = useState<number[]>(() => boot?.progCounts ?? new Array(32).fill(0));
  const [passCounts,     setPassCounts]     = useState<number[]>(() => boot?.passCounts ?? new Array(32).fill(0));
  const [examBestPcts,   setExamBestPcts]   = useState<Record<string, number>>(() => boot?.examBestPcts ?? {});
  const [examPassCounts, setExamPassCounts] = useState<Record<string, number>>(() => boot?.examPassCounts ?? {});
  const [placementLevel, setPlacementLevel] = useState<string>(() => boot?.placementLevel ?? 'A1');
  // persistedUnlocked — это список уроков, ранее открытых через unlockLesson()
  // (после прохождения предыдущего на ★2.5+, покупки премиума, сдачи зачёта).
  // Используется как safety-net, чтобы юзер после restore из облака или просто
  // апдейта не терял уже открытые уроки, если у него best_score < 2.5
  // (медаль не сохранена) и lesson{N}_progress пропал (он не в SYNC_KEYS).
  const [persistedUnlocked, setPersistedUnlocked] = useState<number[]>(() => boot?.persistedUnlocked ?? []);
  const [examResults,    setExamResults]    = useState<Record<string, { pct: number; passed: boolean }>>(
    () => boot?.examResults ?? {},
  );
  const scrollRef  = useRef<any>(null);
  const scrollY    = useRef(new Animated.Value(0)).current;
  const { activeIdx, focusTick } = useTabNav();
  const [gateModal, setGateModal] = useState<
    | null
    | { kind: 'exam'; level: string }
    | { kind: 'lesson'; prevNum: number }
    | { kind: 'levelGate'; prevLevel: string }
  >(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (activeIdx === 1 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [activeIdx]);

  const loadScores = useCallback(async () => {
    try {
      const [noLimitsRaw, plRaw, unlockedRaw] = await Promise.all([
        AsyncStorage.getItem('tester_no_limits'),
        AsyncStorage.getItem('placement_level'),
        AsyncStorage.getItem('unlocked_lessons'),
      ]);
      const nextNoLimits = noLimitsRaw === 'true';
      let nextPersisted: number[] = [];
      if (unlockedRaw) {
        try {
          const arr = JSON.parse(unlockedRaw);
          nextPersisted = Array.isArray(arr) ? arr.filter((n: unknown) => typeof n === 'number') : [];
        } catch { nextPersisted = []; }
      }
      const lessonResults = await Promise.all(
        Array.from({ length: 32 }, (_, i) => i).map(async i => {
          try {
            const n = i + 1;
            const [bestRaw, progRaw] = await Promise.all([
              AsyncStorage.getItem(`lesson${n}_best_score`),
              AsyncStorage.getItem(`lesson${n}_progress`),
            ]);
            const { score, correctCount } = effectiveLessonStarScore(bestRaw, progRaw);
            return { score, correct: correctCount };
          } catch {
            return { score: 0, correct: 0 };
          }
        }),
      );
      const nextScores = lessonResults.map(r => r.score);
      const nextProg = lessonResults.map(r => r.correct);
      const nextPass = await Promise.all(
        Array.from({ length: 32 }, (_, i) =>
          AsyncStorage.getItem(`lesson${i + 1}_pass_count`).then(v => parseInt(v || '0') || 0),
        ),
      );
      const examRows = await Promise.all(['A1', 'A2', 'B1', 'B2'].map(async lvl => {
        const [pctRaw, passedRaw, bestRaw, examPassRaw] = await Promise.all([
          AsyncStorage.getItem(`level_exam_${lvl}_pct`),
          AsyncStorage.getItem(`level_exam_${lvl}_passed`),
          AsyncStorage.getItem(`level_exam_${lvl}_best_pct`),
          AsyncStorage.getItem(`level_exam_${lvl}_pass_count`),
        ]);
        return {
          lvl,
          pct: parseInt(pctRaw || '0') || 0,
          passed: passedRaw === '1',
          bestPct: parseInt(bestRaw || '0') || 0,
          examPass: parseInt(examPassRaw || '0') || 0,
        };
      }));
      const nextExamResults: Record<string, { pct: number; passed: boolean }> = {};
      const nextBest: Record<string, number> = {};
      const nextExamPass: Record<string, number> = {};
      examRows.forEach(r => {
        nextExamResults[r.lvl] = { pct: r.pct, passed: r.passed };
        nextBest[r.lvl] = r.bestPct;
        nextExamPass[r.lvl] = r.examPass;
      });
      if (!mountedRef.current) return;
      setNoLimits(nextNoLimits);
      if (plRaw) setPlacementLevel(plRaw);
      setPersistedUnlocked(nextPersisted);
      setScores(nextScores);
      setProgCounts(nextProg);
      setPassCounts(nextPass);
      setExamResults(nextExamResults);
      setExamBestPcts(nextBest);
      setExamPassCounts(nextExamPass);
      const placementForCache = plRaw ?? lessonsUiSessionCache?.placementLevel ?? 'A1';
      lessonsUiSessionCache = {
        scores: nextScores,
        progCounts: nextProg,
        passCounts: nextPass,
        examBestPcts: nextBest,
        examPassCounts: nextExamPass,
        examResults: nextExamResults,
        placementLevel: placementForCache,
        persistedUnlocked: nextPersisted,
        noLimits: nextNoLimits,
      };
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadScores();
  }, [focusTick, loadScores]);

  /** Свайп/тап на вкладку «Уроки» — те же кейсы, где layout focus не збільшує focusTick */
  useEffect(() => {
    if (activeIdx === 1) void loadScores();
  }, [activeIdx, loadScores]);

  const lessons = lessonNamesForLang(lang);

  const unlockedLessons = useMemo(() => {
    if (DEV_MODE || noLimits) return new Array(32).fill(true);
    // Placement test pre-unlocks: A2→lessons 1-8, B1→1-18, B2→1-28
    const PLACEMENT_UNLOCK: Record<string, number> = { A1: 0, A2: 8, B1: 18, B2: 28 };
    const preUnlock = PLACEMENT_UNLOCK[placementLevel] ?? 0;
    const u = new Array(32).fill(false);
    // Pre-unlock lessons based on placement result
    for (let i = 0; i < preUnlock; i++) u[i] = true;
    if (u.length > 0) u[0] = true; // lesson 1 always unlocked
    for (let i = Math.max(1, preUnlock); i < 32; i++) {
      const num = i + 1;
      // Пограничные уроки (первые в новом уровне) открываются ТОЛЬКО через
      // unlockLesson из level_exam.tsx (после сдачи зачёта) или premium_modal.tsx
      // (для урока 19 — после покупки премиума, без зачёта A2).
      // Цепочка ★2.5 здесь НЕ применяется — иначе можно было бы перейти на
      // следующий уровень без сдачи экзамена. См. правило в lesson_lock_system.ts.
      if (num === 9 || num === 19 || num === 29) {
        // Урок 19: премиум = доступ к B1 без записи в unlocked_lessons (облако/старые билды).
        u[i] = (num === 19 && isPremium) || persistedUnlocked.includes(num);
      } else {
        // persistedUnlocked — safety-net: уважаем уже открытые уроки даже если
        // scores[i-1] < 2.5 после restore из облака без lesson{N}_progress
        // (он не в SYNC_KEYS). См. repairLessonUnlocksAfterRestore().
        u[i] = (u[i - 1] && scores[i - 1] >= 2.5) || persistedUnlocked.includes(num);
      }
    }
    // B1 (lessons 19-28) and B2 (lessons 29-32) require premium
    if (!isPremium && !DEV_MODE) {
      for (let i = 18; i < 32; i++) u[i] = false;
    }
    return u;
  }, [scores, placementLevel, noLimits, isPremium, persistedUnlocked]);

  type ListItem =
    | { kind: 'header'; label: string; color: string }
    | { kind: 'lesson'; index: number; name: string }
    | { kind: 'exam';   level: string };

  const listData: ListItem[] = useMemo(() => {
    const data: ListItem[] = [];
    const HEADERS: [number, string, string][] = [
      [1,  'A1', bookPalette(1)],
      [9,  'A2', bookPalette(9)],
      [19, 'B1', bookPalette(19)],
      [29, 'B2', bookPalette(29)],
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
    <>
    <ScreenGradient>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={1}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          // Fabric + native-driver on ScrollView can crash with animated node
          // connect/disconnect races during rapid remount/navigation.
          { useNativeDriver: false }
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, paddingBottom: 6 }}>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 }}
            onPress={() => { hapticTap(); goHome(); }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text
              style={{ color: screenTitleColor, fontSize: f.numMd, fontWeight: '700' }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {s.tabs.lessons}
            </Text>
          </View>
          <View style={{ flexShrink: 0 }}>
            <EnergyBar size={20} />
          </View>
        </View>

        {/* Items */}
        {listData.map((item, i) => {
          const scaleAnim = itemAnims[i];

          // ── CEFR divider ─────────────────────────────────────────────
          if (item.kind === 'header') {
            const isPremiumLevel = (item.label === 'B1' || item.label === 'B2') && !isPremium && !DEV_MODE;
            return (
              <View key={`h-${item.label}`} style={{ paddingLeft: 22, paddingTop: 14, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: item.color }} />
                <Text style={{ color: item.color, fontSize: f.label, fontWeight: '800', letterSpacing: 1.4 }}>
                  {item.label}
                </Text>
                {isPremiumLevel && (
                  <Ionicons name="lock-closed" size={12} color={item.color} style={{ opacity: 0.7 }} />
                )}
                <View style={{ flex: 1, height: 0.5, backgroundColor: item.color + '30' }} />
              </View>
            );
          }

          // ── Exam card ────────────────────────────────────────────────
          if (item.kind === 'exam') {
            const { level: lvl } = item;
            const meta = EXAM_META_SKETCH[lvl];
            const [from, to] = lvl === 'A1' ? [1,8] : lvl === 'A2' ? [9,18] : lvl === 'B1' ? [19,28] : [29,32];
            const allDone  = DEV_MODE || noLimits || scores.slice(from - 1, to).every(s => s >= 4.5);
            const result   = examResults[lvl];
            const isB2     = lvl === 'B2';
            const examMedal = getExamMedalTier(examBestPcts[lvl] ?? 0);
            const examPass  = examPassCounts[lvl] ?? 0;
            const examDots  = getEarnedDots(examMedal, examPass);

            const label = lang === 'uk'
              ? (isB2 ? 'Екзамен' : `Залік ${lvl}`)
              : lang === 'es'
                ? (isB2 ? 'Examen' : `Examen de ${lvl}`)
                : (isB2 ? 'Экзамен' : `Экзамен ${lvl}`);

            const subLine = result
              ? (result.passed
                  ? (lang === 'uk'
                      ? `✅ Здано — ${result.pct}%`
                      : lang === 'es'
                        ? `✅ Superado — ${result.pct}%`
                        : `✅ Сдан — ${result.pct}%`)
                  : (lang === 'uk'
                      ? `✗ ${result.pct}%`
                      : lang === 'es'
                        ? `✗ ${result.pct}%`
                        : `✗ ${result.pct}%`))
              : allDone
                ? (lang === 'uk'
                    ? 'Натисни щоб почати'
                    : lang === 'es'
                      ? 'Toca para empezar'
                      : 'Нажми чтобы начать')
                : (lang === 'uk'
                    ? `Завершіть усі уроки ${lvl} на 4.5+`
                    : lang === 'es'
                      ? `Completa todas las lecciones de ${lvl} con nota mínima de 4,5`
                      : `Завершите все уроки ${lvl} на 4.5+`);

            return (
              <Animated.View key={`e-${lvl}`} style={{ marginTop: 8, transform: [{ scale: scaleAnim ?? 1 }] }}>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => {
                    hapticTap();
                    if (!isPremium && !DEV_MODE && (lvl === 'B1' || lvl === 'B2')) {
                      const doneSoFar = scores.filter(s => s > 0).length;
                      router.push({ pathname: '/premium_modal', params: { context: 'lesson_b1', lessons_done: String(doneSoFar) } } as any);
                    } else if (allDone) {
                      router.push({ pathname: '/level_exam', params: { level: lvl } });
                    } else {
                      setGateModal({ kind: 'exam', level: lvl });
                    }
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
                      {examDots.length > 0 && <MedalDots dots={examDots} />}
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
          const isUnlocked = unlockedLessons[index];
          const bg         = bookPalette(num);
          const darkBg     = darkenHex(bg, 0.42);
          const progPct    = Math.min(100, Math.round((progCounts[index] ?? 0) / 50 * 100));
          const isComplete = progPct >= 100;
          const lockedCardHasLightFill = !isUnlocked && progPct > 0;

          return (
            <Animated.View
              key={`l-${num}`}
              style={{
                marginTop: 5,
                marginHorizontal: 14,
                borderRadius: 16,
                transform: [{ scale: scaleAnim ?? 1 }],
                shadowColor: useSketchLessonVisual ? '#2A2620' : '#000',
                shadowOffset: { width: 0, height: isUnlocked ? 4 : 2 },
                shadowOpacity: useSketchLessonVisual ? (isUnlocked ? 0.14 : 0.08) : (isUnlocked ? 0.28 : 0.15),
                shadowRadius: useSketchLessonVisual ? (isUnlocked ? 10 : 5) : (isUnlocked ? 8 : 4),
                elevation: isUnlocked ? 6 : 2,
              }}
            >
              <TouchableOpacity
                testID={`lessons-row-${num}`}
                activeOpacity={0.82}
                onPress={() => {
                  hapticTap();
                  if (isUnlocked) {
                    // Navigation must be instant; prefetch runs in background.
                    void prefetchLessonMenuCache(num);
                    router.push({ pathname: '/lesson_menu', params: { id: num } });
                  } else if (!isPremium && !DEV_MODE && num >= 19) {
                    const doneSoFar = scores.filter(s => s > 0).length;
                    router.push({ pathname: '/premium_modal', params: { context: 'lesson_b1', lessons_done: String(doneSoFar) } } as any);
                  } else if (num === 9 || num === 29) {
                    // Пограничные открываются ТОЛЬКО после сдачи зачёта прошлого уровня.
                    // Урок 19 уже отработан выше через premium-гейт (для премиум-юзера
                    // он будет открыт через unlockLesson(19) из premium_modal).
                    setGateModal({ kind: 'levelGate', prevLevel: num === 9 ? 'A1' : 'B1' });
                  } else {
                    setGateModal({ kind: 'lesson', prevNum: num - 1 });
                  }
                }}
                style={{
                  height: BOOK_H,
                  borderRadius: 16,
                  overflow: 'hidden',
                  borderWidth: useSketchLessonVisual && isUnlocked ? 1.5 : 0,
                  borderColor: useSketchLessonVisual && isUnlocked ? 'rgba(55,48,38,0.28)' : 'transparent',
                }}
              >
                {/* Card background */}
                {isUnlocked ? (
                  <LinearGradient
                    colors={[darkenHex(bg, 0.52), darkBg, darkenHex(bg, 0.38)]}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
                  />
                ) : (
                  <LinearGradient
                    colors={['#1c1c1e', '#242426', '#1a1a1c']}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
                  />
                )}
                {/* Progress fill — left-to-right gradient bg → lightenHex(bg) */}
                {progPct > 0 && (
                  <LinearGradient
                    colors={[bg, lightenHex(bg, 1.28)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      position: 'absolute',
                      left: 0, top: 0, bottom: 0,
                      width: `${progPct}%`,
                      borderTopLeftRadius: 16,
                      borderBottomLeftRadius: 16,
                      borderTopRightRadius: isComplete ? 16 : 0,
                      borderBottomRightRadius: isComplete ? 16 : 0,
                    }}
                  />
                )}
                {/* Subtle inner highlight on filled part top edge */}
                {progPct > 0 && (
                  <View style={{
                    position: 'absolute', left: 0, top: 0,
                    width: `${progPct}%`, height: 1.5,
                    backgroundColor: useSketchLessonVisual ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: isComplete ? 16 : 0,
                  }} />
                )}

                {/* Content */}
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text
                      style={{
                        color: !isUnlocked
                          ? (lockedCardHasLightFill ? 'rgba(42,34,24,0.62)' : 'rgba(255,255,255,0.30)')
                          : useSketchLessonVisual
                            ? 'rgba(42,48,44,0.62)'
                            : 'rgba(255,255,255,0.70)',
                        fontSize: f.label,
                        fontWeight: '700',
                        letterSpacing: 0.8,
                      }}
                      maxFontSizeMultiplier={1}
                    >
                      {triLang(lang, {
                        ru: `УРОК ${num}`,
                        uk: `УРОК ${num}`,
                        es: `LECCIÓN ${num}`,
                      })}
                    </Text>
                    {/* Right side: percentage / lock */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {!isUnlocked
                        ? <Ionicons name="lock-closed" size={14} color={lockedCardHasLightFill ? 'rgba(42,34,24,0.36)' : 'rgba(255,255,255,0.35)'} />
                        : progPct > 0
                          ? (
                            <Text
                              style={{
                                color: useSketchLessonVisual
                                  ? (isComplete ? 'rgba(26,32,28,0.92)' : 'rgba(42,48,44,0.78)')
                                  : (isComplete ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)'),
                                fontSize: f.label,
                                fontWeight: '800',
                              }}
                              maxFontSizeMultiplier={1}
                            >
                              {progPct}%
                            </Text>
                          )
                          : null
                      }
                    </View>
                  </View>
                  <Text
                    style={{
                      color: !isUnlocked
                        ? (lockedCardHasLightFill ? 'rgba(42,34,24,0.76)' : 'rgba(255,255,255,0.35)')
                        : useSketchLessonVisual
                          ? 'rgba(22,28,26,0.94)'
                          : 'rgba(255,255,255,0.97)',
                      fontSize: f.body,
                      fontWeight: '700',
                    }}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1}
                  >
                    {name}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ReportErrorButton
            screen="lessons_tab"
            dataId="lessons_list"
            dataText={triLang(lang, {
              ru: 'Список уроков',
              uk: 'Список уроків',
              es: 'Lista de lecciones',
            })}
          />
        </View>
      </Animated.ScrollView>
    </ScreenGradient>
    <ThemedChoiceModal
      visible={gateModal !== null}
      title={
        gateModal?.kind === 'exam'
          ? triLang(lang, { ru: 'Недоступно', uk: 'Недоступно', es: 'No disponible' })
          : gateModal?.kind === 'levelGate' || gateModal?.kind === 'lesson'
              ? triLang(lang, {
                  ru: 'Урок заблокирован',
                  uk: 'Урок заблоковано',
                  es: 'Lección bloqueada',
                })
              : ''
      }
      message={
        gateModal?.kind === 'exam'
          ? (lang === 'uk'
              ? `Спочатку пройдіть всі уроки ${gateModal.level} з оцінкою 4.5+`
              : lang === 'es'
                ? `Primero completa todas las lecciones de ${gateModal.level} con nota mínima de 4,5`
                : `Сначала пройдите все уроки ${gateModal.level} с оценкой 4.5+`)
          : gateModal?.kind === 'levelGate'
            ? (lang === 'uk'
                ? `Спочатку складіть залік ${gateModal.prevLevel}, щоб відкрити наступний рівень`
                : lang === 'es'
                  ? `Primero debes superar el examen de ${gateModal.prevLevel} para desbloquear el siguiente nivel`
                  : `Сначала сдайте зачёт ${gateModal.prevLevel}, чтобы открыть следующий уровень`)
            : gateModal?.kind === 'lesson'
              ? (lang === 'uk'
                  ? `Пройдіть урок ${gateModal.prevNum} з оцінкою 2.5+`
                  : lang === 'es'
                    ? `Completa la lección ${gateModal.prevNum} con nota mínima de 2,5`
                    : `Пройдите урок ${gateModal.prevNum} с оценкой 2.5+`)
              : ''
      }
      choices={[{ label: triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' }), onPress: () => {} }]}
      onRequestClose={() => setGateModal(null)}
    />
    </>
  );
}
