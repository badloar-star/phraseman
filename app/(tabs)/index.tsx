import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Dimensions, Animated, useWindowDimensions, Image, DeviceEventEmitter,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { loadAllMedals, getMedalTier, getExamMedalTier, MEDAL_DOT_COLOR, getEarnedDots, type MedalTier } from '../medal_utils';
import { prefetchLessonMenuCache } from '../lesson_menu';
import ThemedChoiceModal from '../../components/ThemedChoiceModal';
import { effectiveLessonStarScore } from '../lesson_star_score';
import EnergyBar from '../../components/EnergyBar';

const LESSON_TOTAL = 32;

// ── CEFR палитры (не зависят от темы) ─────────────────────────────────────────
// Один цвет на уровень — все уроки внутри A1/A2/B1/B2 одного оттенка
const PALETTE: Record<string, string> = {
  A1: '#5DB87A',  // светло-зелёный
  A2: '#3A90C4',  // средний синий
  B1: '#C08A00',  // насыщенный янтарный
  B2: '#C04A18',  // тёмный оранжево-красный
};

const EXAM_META: Record<string, { bg: string; accent: string; icon: string }> = {
  A1: { bg: '#1A7A40', accent: '#A8F0C0', icon: 'school-outline' },
  A2: { bg: '#0A5A8C', accent: '#A0D8F0', icon: 'school-outline' },
  B1: { bg: '#7A5800', accent: '#F8DC80', icon: 'school-outline' },
  B2: { bg: '#1C1200', accent: '#FFD700', icon: 'trophy'          },
};

const EXAM_META_OCEAN: Record<string, { bg: string; accent: string; icon: string }> = {
  A1: { bg: '#2A88CC', accent: '#C0E4FF', icon: 'school-outline' },
  A2: { bg: '#1868B0', accent: '#A8D4F8', icon: 'school-outline' },
  B1: { bg: '#0E4A90', accent: '#90B8E8', icon: 'school-outline' },
  B2: { bg: '#082060', accent: '#6898D0', icon: 'trophy'          },
};

const EXAM_META_SAKURA: Record<string, { bg: string; accent: string; icon: string }> = {
  A1: { bg: '#C05880', accent: '#FFD0E4', icon: 'school-outline' },
  A2: { bg: '#A03870', accent: '#F8B8D4', icon: 'school-outline' },
  B1: { bg: '#802060', accent: '#F0A0C8', icon: 'school-outline' },
  B2: { bg: '#500840', accent: '#E888B8', icon: 'trophy'          },
};

// Прогрессия от менее насыщенного (A1) к очень тёмному (B2) — белый текст читается на всех
const PALETTE_OCEAN: Record<string, string> = {
  A1: '#2A88CC',  // насыщенный голубой
  A2: '#1868B0',  // средний синий
  B1: '#0E4A90',  // тёмный синий
  B2: '#082060',  // очень тёмный синий
};
const PALETTE_SAKURA: Record<string, string> = {
  A1: '#C04880',  // насыщенный розовый
  A2: '#A03070',  // средний малиновый
  B1: '#7A1858',  // тёмный
  B2: '#500840',  // очень тёмный сливовый
};

function cefrKey(num: number): string {
  if (num <= 8)  return 'A1';
  if (num <= 18) return 'A2';
  if (num <= 28) return 'B1';
  return 'B2';
}

function bookPalette(num: number, themeMode?: string): string {
  const key = cefrKey(num);
  if (themeMode === 'ocean')  return PALETTE_OCEAN[key];
  if (themeMode === 'sakura') return PALETTE_SAKURA[key];
  return PALETTE[key];
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
  bronze:  require('../../assets/images/levels/bronza.png'),
  silver:  require('../../assets/images/levels/serebro.png'),
  gold:    require('../../assets/images/levels/zoloto.png'),
  ruby:    require('../../assets/images/levels/rubin.png'),
  emerald: require('../../assets/images/levels/izumrud.png'),
  diamond: require('../../assets/images/levels/almaz.png'),
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
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  const screenTitleColor = (themeMode === 'sakura' || themeMode === 'ocean')
    ? (themeMode === 'ocean' ? 'rgba(240,252,255,0.95)' : 'rgba(255,248,252,0.95)')
    : t.textPrimary;
  const cardText = 'rgba(255,255,255,0.70)';
  const cardTitle = 'rgba(255,255,255,0.97)';
  const { lang, s }        = useLang();
  const { height: SCREEN_H } = useWindowDimensions();
  const VIEWPORT_H = SCREEN_H - 90; // approx tab bar + status bar

  const [noLimits,       setNoLimits]       = useState(false);
  const { isPremium } = usePremium();
  const [scores,         setScores]         = useState<number[]>(new Array(32).fill(0));
  const [progCounts,     setProgCounts]     = useState<number[]>(new Array(32).fill(0));
  const [passCounts,     setPassCounts]     = useState<number[]>(new Array(32).fill(0));
  const [examBestPcts,   setExamBestPcts]   = useState<Record<string, number>>({});
  const [examPassCounts, setExamPassCounts] = useState<Record<string, number>>({});
  const [placementLevel, setPlacementLevel] = useState<string>('A1');
  // persistedUnlocked — это список уроков, ранее открытых через unlockLesson()
  // (после прохождения предыдущего на ★2.5+, покупки премиума, сдачи зачёта).
  // Используется как safety-net, чтобы юзер после restore из облака или просто
  // апдейта не терял уже открытые уроки, если у него best_score < 2.5
  // (медаль не сохранена) и lesson{N}_progress пропал (он не в SYNC_KEYS).
  const [persistedUnlocked, setPersistedUnlocked] = useState<number[]>([]);
  const [examResults,    setExamResults]    = useState<Record<string, { pct: number; passed: boolean }>>({});
  const scrollRef  = useRef<any>(null);
  const scrollY    = useRef(new Animated.Value(0)).current;
  const { activeIdx, focusTick } = useTabNav();
  const [gateModal, setGateModal] = useState<
    | null
    | { kind: 'exam'; level: string }
    | { kind: 'lesson'; prevNum: number }
    | { kind: 'levelGate'; prevLevel: string }
  >(null);

  useEffect(() => {
    if (activeIdx === 1 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [activeIdx]);

  useEffect(() => { loadScores(); }, []);
  useEffect(() => { loadScores(); }, [focusTick]);
  useEffect(() => { if (activeIdx === 1) loadScores(); }, [activeIdx]);
  useFocusEffect(useCallback(() => { loadScores(); }, []));

  const loadScores = () => {
    AsyncStorage.getItem('tester_no_limits').then(v => setNoLimits(v === 'true'));
    AsyncStorage.getItem('placement_level').then(pl => { if (pl) setPlacementLevel(pl); });
    AsyncStorage.getItem('unlocked_lessons').then(raw => {
      if (!raw) { setPersistedUnlocked([]); return; }
      try {
        const arr = JSON.parse(raw);
        setPersistedUnlocked(Array.isArray(arr) ? arr.filter((n: any) => typeof n === 'number') : []);
      } catch { setPersistedUnlocked([]); }
    });
    Promise.all(
      Array.from({ length: 32 }, (_, i) => i).map(async i => {
        try {
          const n = i + 1;
          const [bestRaw, progRaw] = await Promise.all([
            AsyncStorage.getItem(`lesson${n}_best_score`),
            AsyncStorage.getItem(`lesson${n}_progress`),
          ]);
          const { score, correctCount } = effectiveLessonStarScore(bestRaw, progRaw);
          return { score, correct: correctCount };
        } catch { return { score: 0, correct: 0 }; }
      })
    ).then(results => {
      setScores(results.map(r => r.score));
      setProgCounts(results.map(r => r.correct));
    });
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
        u[i] = persistedUnlocked.includes(num);
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
      [1,  'A1', bookPalette(1,  themeMode)],
      [9,  'A2', bookPalette(9,  themeMode)],
      [19, 'B1', bookPalette(19, themeMode)],
      [29, 'B2', bookPalette(29, themeMode)],
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
  }, [lessons, themeMode]);

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
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}
            onPress={() => { hapticTap(); goHome(); }}
          >
            <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: screenTitleColor, fontSize: f.numMd, fontWeight: '700', flex: 1 }}>
            {s.tabs.lessons}
          </Text>
          <EnergyBar size={20} />
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
            const examMetaMap = themeMode === 'ocean' ? EXAM_META_OCEAN : themeMode === 'sakura' ? EXAM_META_SAKURA : EXAM_META;
            const meta     = examMetaMap[lvl];
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
          const bg         = bookPalette(num, themeMode);
          const darkBg     = darkenHex(bg, 0.42);
          const progPct    = Math.min(100, Math.round((progCounts[index] ?? 0) / 50 * 100));
          const isComplete = progPct >= 100;

          return (
            <Animated.View
              key={`l-${num}`}
              style={{
                marginTop: 5,
                marginHorizontal: 14,
                borderRadius: 16,
                transform: [{ scale: scaleAnim ?? 1 }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: isUnlocked ? 4 : 2 },
                shadowOpacity: isUnlocked ? 0.28 : 0.15,
                shadowRadius: isUnlocked ? 8 : 4,
                elevation: isUnlocked ? 6 : 2,
              }}
            >
              <TouchableOpacity
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
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: isComplete ? 16 : 0,
                  }} />
                )}

                {/* Content */}
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: isUnlocked ? cardText : 'rgba(255,255,255,0.30)', fontSize: f.label, fontWeight: '700', letterSpacing: 0.8 }} maxFontSizeMultiplier={1}>
                      {triLang(lang, {
                        ru: `УРОК ${num}`,
                        uk: `УРОК ${num}`,
                        es: `LECCIÓN ${num}`,
                      })}
                    </Text>
                    {/* Right side: percentage or lock */}
                    {!isUnlocked
                      ? <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.35)" />
                      : progPct > 0
                        ? <Text style={{ color: isComplete ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)', fontSize: f.label, fontWeight: '800' }} maxFontSizeMultiplier={1}>
                            {progPct}%
                          </Text>
                        : null
                    }
                  </View>
                  <Text style={{ color: isUnlocked ? cardTitle : 'rgba(255,255,255,0.35)', fontSize: f.body, fontWeight: '700' }} numberOfLines={1} maxFontSizeMultiplier={1}>
                    {name}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
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
