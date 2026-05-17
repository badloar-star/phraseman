import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, useWindowDimensions, Image, } from 'react-native';
import { useRouter } from 'expo-router';
import { usePremium } from '../../components/PremiumContext';
import { lessonPaywallContext, requiresPremiumForLesson, resolveLessonAccess } from '../monetization_policy';
import { useTabNav } from '../TabContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../components/ThemeContext';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import { LinearGradient } from 'expo-linear-gradient';
import { lessonNamesForLang } from '../../constants/lessons';
import { triLang } from '../../constants/i18n';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldCardGradient, goldCefrAccent, goldShadow } from '../../constants/goldTheme';
import GoldBevel from '../../components/GoldBevel';
import { DEV_MODE } from '../config';
import { hapticTap } from '../../hooks/use-haptics';
import { getExamMedalTier, getEarnedDots, normalizeLessonPassCount } from '../medal_utils';
import { prefetchLessonMenuCache } from '../lesson_menu';
import ReportErrorButton from '../../components/ReportErrorButton';
import ThemedChoiceModal from '../../components/ThemedChoiceModal';
import { effectiveLessonStarScore } from '../lesson_star_score';
import EnergyBar from '../../components/EnergyBar';
import { getCourseLevelForLesson, getCourseLevelIndex, getPreviousCourseLevel, type CourseLevel, } from '../course_levels';
/** Снимок UI списку уроків: survives remount між сесіями таба (див. `_layout.tsx` lazy tabs). */
type LessonsUiCache = {
    scores: number[];
    progCounts: number[];
    passCounts: number[];
    examBestPcts: Record<string, number>;
    examPassCounts: Record<string, number>;
    examResults: Record<string, {
        pct: number;
        passed: boolean;
    }>;
    persistedUnlocked: number[];
    noLimits: boolean;
};
let lessonsUiSessionCache: LessonsUiCache | null = null;
/**
 * Единый стиль карточек списка уроков (как «Туман» / «Графит»).
 * Объявлено на уровне модуля (не внутри компонента): имя начинается с `use` — внутри функции
 * Metro/Hermes + Fast Refresh иногда дают «Property 'useSketchLessonVisual' doesn\'t exist».
 */
export const useSketchLessonVisual = true;
const USE_ELITE_LESSONS_MAP = true;
// ── Список уроков: один стиль «Туман / Графит» (мягкие заливки + чернила) во всех темах приложения ──
const PALETTE_SKETCH: Record<string, string> = {
    A1: '#B8DFC8',
    A2: '#A8CCE8',
    B1: '#EDD89A',
    B2: '#E8B8A0',
};
const EXAM_META_SKETCH: Record<string, {
    bg: string;
    accent: string;
    icon: string;
}> = {
    A1: { bg: '#4A564E', accent: '#F2F6F3', icon: 'school-outline' },
    A2: { bg: '#3D4E5C', accent: '#EAF0F5', icon: 'school-outline' },
    B1: { bg: '#5A4F3A', accent: '#FAF6EC', icon: 'school-outline' },
    B2: { bg: '#3A3630', accent: '#F5F2EC', icon: 'trophy' },
};
function cefrKey(num: number): string {
    if (num <= 8)
        return 'A1';
    if (num <= 18)
        return 'A2';
    if (num <= 28)
        return 'B1';
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
    bronze: require('../../assets/images/levels/bronza.webp'),
    silver: require('../../assets/images/levels/serebro.webp'),
    gold: require('../../assets/images/levels/zoloto.webp'),
    ruby: require('../../assets/images/levels/rubin.webp'),
    emerald: require('../../assets/images/levels/izumrud.webp'),
    diamond: require('../../assets/images/levels/almaz.webp'),
};
function MedalDots({ dots }: {
    dots: string[];
}) {
    if (dots.length === 0)
        return null;
    const SIZE = 22;
    const OFFSET = 14;
    const totalW = SIZE + (dots.length - 1) * OFFSET;
    return (<View style={{ width: totalW, height: SIZE }}>
      {dots.map((key, i) => (<Image key={i} source={MEDAL_IMAGES[key]} style={{
                position: 'absolute',
                left: i * OFFSET,
                width: SIZE,
                height: SIZE,
                zIndex: dots.length - i,
            }} resizeMode="contain"/>))}
    </View>);
}
// Высоты элементов (должны точно совпадать с реальным рендером)
const HEADER_H = 66; // ListHeader
const CEFR_H = 52; // CEFR divider item
const BOOK_H = 72; // высота книги
const LESSON_H = BOOK_H + 5; // marginTop:5 + BOOK_H
const EXAM_H = 78 + 8; // examH + marginTop:8
// ── Главный компонент ─────────────────────────────────────────────────────────
export default function LessonsTab() {
    const router = useRouter();
    const { goHome } = useTabNav();
    const { theme: t, f, themeMode } = useTheme();
    const isGoldTheme = themeMode === 'gold';
    const goldBright = GOLD_RICH.champagne;
    const goldAntique = GOLD_RICH.agedGold;
    const goldHairline = GOLD_RICH.hairline;
    const goldSurface = GOLD_RICH.blackPiano;
    const screenTitleColor = t.textPrimary;
    const { lang, s } = useLang();
    const { height: SCREEN_H } = useWindowDimensions();
    const VIEWPORT_H = SCREEN_H - 90; // approx tab bar + status bar
    const boot = lessonsUiSessionCache;
    const [noLimits, setNoLimits] = useState(() => boot?.noLimits ?? false);
    const { isPremium } = usePremium();
    const [scores, setScores] = useState<number[]>(() => boot?.scores ?? new Array(32).fill(0));
    const [progCounts, setProgCounts] = useState<number[]>(() => boot?.progCounts ?? new Array(32).fill(0));
    const [passCounts, setPassCounts] = useState<number[]>(() => boot?.passCounts ?? new Array(32).fill(0));
    const [examBestPcts, setExamBestPcts] = useState<Record<string, number>>(() => boot?.examBestPcts ?? {});
    const [examPassCounts, setExamPassCounts] = useState<Record<string, number>>(() => boot?.examPassCounts ?? {});
    // persistedUnlocked — это список уроков, ранее открытых через unlockLesson()
    // (после прохождения предыдущего на ★2.5+, покупки премиума, сдачи зачёта).
    // Используется как safety-net, чтобы юзер после restore из облака или просто
    // апдейта не терял уже открытые уроки, если у него best_score < 2.5
    // (медаль не сохранена) и lesson{N}_progress пропал (он не в SYNC_KEYS).
    const [persistedUnlocked, setPersistedUnlocked] = useState<number[]>(() => boot?.persistedUnlocked ?? []);
    const [examResults, setExamResults] = useState<Record<string, {
        pct: number;
        passed: boolean;
    }>>(() => boot?.examResults ?? {});
    const scrollRef = useRef<any>(null);
    const scrollY = useRef(new Animated.Value(0)).current;
    const { activeIdx, focusTick } = useTabNav();
    const [gateModal, setGateModal] = useState<null | {
        kind: 'exam';
        level: string;
    } | {
        kind: 'lesson';
        prevNum: number;
    } | {
        kind: 'levelGate';
        level: string;
        prevLevel: string;
    } | {
        kind: 'premium';
        lessonNum: number;
    }>(null);
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
            const [noLimitsRaw, unlockedRaw] = await Promise.all([
                AsyncStorage.getItem('tester_no_limits'),
                AsyncStorage.getItem('unlocked_lessons'),
            ]);
            const nextNoLimits = noLimitsRaw === 'true';
            let nextPersisted: number[] = [];
            if (unlockedRaw) {
                try {
                    const arr = JSON.parse(unlockedRaw);
                    nextPersisted = Array.isArray(arr) ? arr.filter((n: unknown) => typeof n === 'number') : [];
                }
                catch {
                    nextPersisted = [];
                }
            }
            const lessonResults = await Promise.all(Array.from({ length: 32 }, (_, i) => i).map(async (i) => {
                try {
                    const n = i + 1;
                    const [bestRaw, progRaw] = await Promise.all([
                        AsyncStorage.getItem(`lesson${n}_best_score`),
                        AsyncStorage.getItem(`lesson${n}_progress`),
                    ]);
                    const { score, correctCount } = effectiveLessonStarScore(bestRaw, progRaw);
                    return { score, correct: correctCount };
                }
                catch {
                    return { score: 0, correct: 0 };
                }
            }));
            const nextScores = lessonResults.map(r => r.score);
            const nextProg = lessonResults.map(r => r.correct);
            const nextPass = await Promise.all(Array.from({ length: 32 }, (_, i) => AsyncStorage.getItem(`lesson${i + 1}_pass_count`).then(v => normalizeLessonPassCount(parseInt(v || '0', 10) || 0, nextScores[i] ?? 0))));
            const examRows = await Promise.all(['A1', 'A2', 'B1', 'B2'].map(async (lvl) => {
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
            const nextExamResults: Record<string, {
                pct: number;
                passed: boolean;
            }> = {};
            const nextBest: Record<string, number> = {};
            const nextExamPass: Record<string, number> = {};
            examRows.forEach(r => {
                nextExamResults[r.lvl] = { pct: r.pct, passed: r.passed };
                nextBest[r.lvl] = r.bestPct;
                nextExamPass[r.lvl] = r.examPass;
            });
            if (!mountedRef.current)
                return;
            setNoLimits(nextNoLimits);
            setPersistedUnlocked(nextPersisted);
            setScores(nextScores);
            setProgCounts(nextProg);
            setPassCounts(nextPass);
            setExamResults(nextExamResults);
            setExamBestPcts(nextBest);
            setExamPassCounts(nextExamPass);
            lessonsUiSessionCache = {
                scores: nextScores,
                progCounts: nextProg,
                passCounts: nextPass,
                examBestPcts: nextBest,
                examPassCounts: nextExamPass,
                examResults: nextExamResults,
                persistedUnlocked: nextPersisted,
                noLimits: nextNoLimits,
            };
        }
        catch {
            /* ignore */
        }
    }, []);
    useEffect(() => {
        void loadScores();
    }, [focusTick, loadScores]);
    /** Свайп/тап на вкладку «Уроки» — те же кейсы, где layout focus не збільшує focusTick */
    useEffect(() => {
        if (activeIdx === 1)
            void loadScores();
    }, [activeIdx, loadScores]);
    const lessons = lessonNamesForLang(lang);
    const premiumReachableLevelIndex = useMemo(() => {
        let idx = getCourseLevelIndex('A1');
        if (examResults.A1?.passed)
            idx = Math.max(idx, getCourseLevelIndex('A2'));
        if (examResults.A2?.passed)
            idx = Math.max(idx, getCourseLevelIndex('B1'));
        if (examResults.B1?.passed || examResults.B2?.passed)
            idx = Math.max(idx, getCourseLevelIndex('B2'));
        for (let i = 0; i < 32; i++) {
            const lessonNum = i + 1;
            if ((scores[i] ?? 0) > 0 || (progCounts[i] ?? 0) > 0 || (passCounts[i] ?? 0) > 0) {
                idx = Math.max(idx, getCourseLevelIndex(getCourseLevelForLesson(lessonNum)));
            }
        }
        for (const lessonNum of persistedUnlocked) {
            idx = Math.max(idx, getCourseLevelIndex(getCourseLevelForLesson(lessonNum)));
        }
        return idx;
    }, [examResults, passCounts, persistedUnlocked, progCounts, scores]);
    const unlockedLessons = useMemo(() => {
        if (DEV_MODE || noLimits)
            return new Array(32).fill(true);
        const u = new Array(32).fill(false);
        if (isPremium) {
            for (let i = 0; i < 32; i++) {
                const levelIdx = getCourseLevelIndex(getCourseLevelForLesson(i + 1));
                u[i] = levelIdx <= premiumReachableLevelIndex;
            }
            return u;
        }
        // Free sample: lessons 1-3 are available, everything after that is a Premium gate.
        for (let i = 0; i < Math.min(3, u.length); i++)
            u[i] = true;
        return u;
    }, [noLimits, isPremium, premiumReachableLevelIndex]);
    type ListItem = {
        kind: 'header';
        label: string;
        color: string;
    } | {
        kind: 'lesson';
        index: number;
        name: string;
    } | {
        kind: 'exam';
        level: string;
    };
    const listData: ListItem[] = useMemo(() => {
        const data: ListItem[] = [];
        const HEADERS: [
            number,
            string,
            string
        ][] = [
            [1, 'A1', bookPalette(1)],
            [9, 'A2', bookPalette(9)],
            [19, 'B1', bookPalette(19)],
            [29, 'B2', bookPalette(29)],
        ];
        lessons.forEach((name, idx) => {
            const num = idx + 1;
            const hdr = HEADERS.find(([n]) => n === num);
            if (hdr)
                data.push({ kind: 'header', label: hdr[1], color: hdr[2] });
            data.push({ kind: 'lesson', index: idx, name });
            if (num === 8 || num === 18 || num === 28 || num === 32) {
                const lvl = num <= 8 ? 'A1' : num <= 18 ? 'A2' : num <= 28 ? 'B1' : 'B2';
                data.push({ kind: 'exam', level: lvl });
            }
        });
        return data;
    }, [lessons]);
    const currentLessonNum = useMemo(() => {
        const idx = unlockedLessons.findIndex((unlocked, i) => unlocked && (progCounts[i] ?? 0) < 50);
        return idx >= 0 ? idx + 1 : null;
    }, [progCounts, unlockedLessons]);
    // ── Per-item scale animations based on scroll position ───────────────────
    const itemAnims = useMemo(() => {
        let y = HEADER_H;
        return listData.map(item => {
            const absY = y;
            let h: number;
            if (item.kind === 'header')
                h = CEFR_H;
            else if (item.kind === 'lesson')
                h = LESSON_H;
            else
                h = EXAM_H;
            y += h;
            if (item.kind === 'header')
                return null;
            const itemCenterY = absY + h / 2;
            const peakScroll = itemCenterY - VIEWPORT_H / 2;
            const scale = scrollY.interpolate({
                inputRange: [peakScroll - 140, peakScroll, peakScroll + 140],
                outputRange: [1, 1.04, 1],
                extrapolate: 'clamp',
            });
            return scale;
        });
    }, [listData, scrollY, VIEWPORT_H]);
    // ── Render ────────────────────────────────────────────────────────────────
    return (<>
    <ScreenGradient>
      <Animated.ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} scrollEventThrottle={1} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }],
        // Fabric + native-driver on ScrollView can crash with animated node
        // connect/disconnect races during rapid remount/navigation.
        { useNativeDriver: false })} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, paddingBottom: 6 }}>
          <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bgCard, borderWidth: 0.5, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 }} onPress={() => { hapticTap(); goHome(); }}>
            <Ionicons name="chevron-back" size={20} color={t.textPrimary}/>
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
            <Text style={{ color: screenTitleColor, fontSize: f.numMd, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {s.tabs.lessons}
            </Text>
          </View>
          <View style={{ flexShrink: 0 }}>
            <EnergyBar size={30}/>
          </View>
        </View>

        {/* Items */}
        {listData.map((item, i) => {
            const scaleAnim = itemAnims[i];
            // ── CEFR divider ─────────────────────────────────────────────
            if (item.kind === 'header') {
                const isPremiumLevel = !isPremium && !DEV_MODE && item.label !== 'A1';
                const goldLevel = goldCefrAccent(item.label);
                const headerAccent = isGoldTheme ? goldLevel.accent : item.color;
                const headerWash = isGoldTheme
                    ? goldLevel.wash
                    :
                        item.color + '33';
                const headerLineColor = isGoldTheme
                    ? GOLD_RICH.hairlineQuiet
                    :
                        item.color + '30';
                if (USE_ELITE_LESSONS_MAP) {
                    return (<View key={`h-${item.label}`} style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 7 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: headerWash, borderWidth: isGoldTheme ? 1 : 1.5, borderColor: headerAccent }}>
                      <Text style={{ color: headerAccent, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8 }}>
                        {item.label}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: screenTitleColor, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
                        {triLang(lang, {
                            ru: `Глава ${item.label}`,
                            uk: `Глава ${item.label}`,
                            es: `Capítulo ${item.label}`,
                            'pt-BR': `Capítulo ${item.label}`,
                            vi: `Chương ${item.label}`,
                            id: `Bab ${item.label}`,
                            tr: `Bölüm ${item.label}`,
                            pl: `Rozdział ${item.label}`,
                        })}
                      </Text>
                    </View>
                    {isPremiumLevel && <Ionicons name="lock-closed" size={14} color={headerAccent} style={{ opacity: 0.75 }}/>}
                  </View>
                </View>);
                }
                return (<View key={`h-${item.label}`} style={{ paddingLeft: 22, paddingTop: 14, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: headerAccent }}/>
                <Text style={{ color: headerAccent, fontSize: f.label, fontWeight: '800', letterSpacing: 1.4 }}>
                  {item.label}
                </Text>
                {isPremiumLevel && (<Ionicons name="lock-closed" size={12} color={headerAccent} style={{ opacity: 0.7 }}/>)}
                <View style={{ flex: 1, height: 0.5, backgroundColor: headerLineColor }}/>
              </View>);
            }
            // ── Exam card ────────────────────────────────────────────────
            if (item.kind === 'exam') {
                const { level: lvl } = item;
                const sketchMeta = EXAM_META_SKETCH[lvl];
                const goldLevel = goldCefrAccent(lvl);
                const meta = isGoldTheme
                    ? { bg: goldSurface, accent: goldLevel.accent, icon: sketchMeta.icon }
                    :
                        sketchMeta;
                const [from, to] = lvl === 'A1' ? [1, 8] : lvl === 'A2' ? [9, 18] : lvl === 'B1' ? [19, 28] : [29, 32];
                const scoreReady = scores.slice(from - 1, to).every(s => s >= 4.5);
                const examLevel = lvl as CourseLevel;
                const examLevelIdx = getCourseLevelIndex(examLevel);
                const premiumExamAvailable = isPremium && examLevelIdx <= premiumReachableLevelIndex;
                const examPremiumRequired = !isPremium && !DEV_MODE && !noLimits && requiresPremiumForLesson(to);
                const allDone = !examPremiumRequired && (DEV_MODE || noLimits || premiumExamAvailable || scoreReady);
                const prevExamLevel = getPreviousCourseLevel(examLevel);
                const result = examResults[lvl];
                const isB2 = lvl === 'B2';
                const examMedal = getExamMedalTier(examBestPcts[lvl] ?? 0);
                const examPass = examPassCounts[lvl] ?? 0;
                const examDots = getEarnedDots(examMedal, examPass);
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
                        : examPremiumRequired
                            ? triLang(lang, {
                                ru: 'Откроется с Premium',
                                uk: 'Відкриється з Premium',
                                es: 'Se abre con Premium',
                                'pt-BR': 'Abre com Premium',
                                vi: 'Mở với Premium',
                                id: 'Terbuka dengan Premium',
                                tr: 'Premium ile açılır',
                                pl: 'Otwiera się z Premium',
                            })
                            : isPremium && prevExamLevel
                                ? (lang === 'uk'
                                    ? `Спочатку залік ${prevExamLevel}`
                                    : lang === 'es'
                                        ? `Primero el examen ${prevExamLevel}`
                                        : `Сначала зачёт ${prevExamLevel}`)
                                : (lang === 'uk'
                                    ? `Завершіть усі уроки ${lvl} на 4.5+`
                                    : lang === 'es'
                                        ? `Completa todas las lecciones de ${lvl} con nota mínima de 4,5`
                                        : `Завершите все уроки ${lvl} на 4.5+`);
                return (<Animated.View key={`e-${lvl}`} style={{ marginTop: 8, transform: [{ scale: scaleAnim ?? 1 }], ...(isGoldTheme ? goldShadow(allDone ? 2 : 1) : {}), ...({}) }}>
                <TouchableOpacity activeOpacity={0.82} onPress={() => {
                        hapticTap();
                        const firstLessonByLevel = lvl === 'A1' ? 1 : lvl === 'A2' ? 9 : lvl === 'B1' ? 19 : 29;
                        if (examPremiumRequired) {
                            setGateModal({ kind: 'premium', lessonNum: requiresPremiumForLesson(firstLessonByLevel) ? firstLessonByLevel : to });
                        }
                        else if (allDone) {
                            router.push({ pathname: '/level_exam', params: { level: lvl } });
                        }
                        else if (isPremium && prevExamLevel) {
                            setGateModal({ kind: 'levelGate', level: lvl, prevLevel: prevExamLevel });
                        }
                        else {
                            setGateModal({ kind: 'exam', level: lvl });
                        }
                    }} style={{
                        height: 78,
                        marginHorizontal: isGoldTheme ? 14 : 0,
                        borderRadius: isGoldTheme ? 14 : 0,
                        borderWidth: isGoldTheme ? 1 : 0,
                        borderColor: isGoldTheme
                            ? (allDone ? GOLD_RICH.hairlineStrong : GOLD_RICH.hairlineQuiet)
                            :
                                'transparent',
                        flexDirection: 'row',
                        backgroundColor: meta.bg,
                        opacity: allDone ? 1 : isPremium ? 0.38 : 0.5,
                        overflow: 'hidden',
                    }}>
                  {isGoldTheme && (<LinearGradient colors={allDone ? goldLevel.card : goldCardGradient('muted')} locations={GOLD_SURFACE_LOCATIONS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}/>)}
                  {false}
                  {false}
                  {isGoldTheme && <GoldBevel radius={14} intensity={allDone ? 'strong' : 'quiet'}/>}
                  <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 4 }}>
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isGoldTheme ? 1 : 1.5, backgroundColor: isGoldTheme ? GOLD_RICH.hairlineStrong : meta.accent + '30' }}/>
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: isGoldTheme ? 1 : 1.5, backgroundColor: isGoldTheme ? GOLD_RICH.hairlineDark : meta.accent + '30' }}/>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name={result?.passed ? 'checkmark-circle' : allDone || isPremium ? (meta.icon as any) : 'lock-closed-outline'} size={isB2 ? 26 : 22} color={meta.accent}/>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: meta.accent, fontSize: isB2 ? f.h2 : f.bodyLg, fontWeight: '800' }} maxFontSizeMultiplier={1}>
                          {label}
                        </Text>
                        <Text style={{ color: meta.accent + 'AA', fontSize: f.sub, marginTop: 1 }} maxFontSizeMultiplier={1}>
                          {subLine}
                        </Text>
                      </View>
                      {examDots.length > 0 && <MedalDots dots={examDots}/>}
                      {allDone && <Ionicons name="chevron-forward" size={16} color={meta.accent + '80'}/>}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>);
            }
            // ── Lesson book ──────────────────────────────────────────────
            const { index, name } = item;
            const num = index + 1;
            const isUnlocked = unlockedLessons[index];
            const bg = bookPalette(num);
            const darkBg = darkenHex(bg, 0.42);
            const progPct = Math.min(100, Math.round((progCounts[index] ?? 0) / 50 * 100));
            const isComplete = progPct >= 100;
            const isCurrent = currentLessonNum === num;
            const lessonLevel = getCourseLevelForLesson(num);
            const lessonGoldLevel = goldCefrAccent(lessonLevel);
            const prevLessonLevel = getPreviousCourseLevel(lessonLevel);
            const levelLockedByExam = isPremium && !isUnlocked && !DEV_MODE && !noLimits;
            const premiumRequired = !isPremium && !DEV_MODE && !noLimits && requiresPremiumForLesson(num);
            const lockedCardHasLightFill = !isUnlocked && progPct > 0 && premiumRequired;
            const cardRadius = isGoldTheme ? 14 : USE_ELITE_LESSONS_MAP ? 18 : 16;
            const lessonTextColor = isGoldTheme
                ? (isUnlocked ? t.textPrimary : 'rgba(247,241,228,0.44)')
                :
                    !isUnlocked
                        ? levelLockedByExam
                            ? 'rgba(255,255,255,0.42)'
                            : (lockedCardHasLightFill ? 'rgba(42,34,24,0.76)' : 'rgba(255,255,255,0.35)')
                        : useSketchLessonVisual
                            ? 'rgba(22,28,26,0.94)'
                            : 'rgba(255,255,255,0.97)';
            const lessonMetaColor = isGoldTheme
                ? (isUnlocked ? t.textMuted : 'rgba(184,173,146,0.36)')
                :
                    !isUnlocked
                        ? levelLockedByExam
                            ? 'rgba(255,255,255,0.30)'
                            : (lockedCardHasLightFill ? 'rgba(42,34,24,0.62)' : 'rgba(255,255,255,0.30)')
                        : useSketchLessonVisual
                            ? 'rgba(42,48,44,0.62)'
                            : 'rgba(255,255,255,0.70)';
            return (<Animated.View key={`l-${num}`} style={{
                    marginTop: 5,
                    marginHorizontal: 14,
                    borderRadius: cardRadius,
                    transform: [{ scale: scaleAnim ?? 1 }],
                    shadowColor: isGoldTheme ? '#000' : useSketchLessonVisual ? '#2A2620' : '#000',
                    shadowOffset: { width: 0, height: isCurrent ? 7 : isUnlocked ? 4 : 2 },
                    shadowOpacity: USE_ELITE_LESSONS_MAP
                        ? (isCurrent ? 0.20 : isUnlocked ? 0.11 : 0.05)
                        : useSketchLessonVisual ? (isUnlocked ? 0.14 : 0.08) : (isUnlocked ? 0.28 : 0.15),
                    shadowRadius: USE_ELITE_LESSONS_MAP
                        ? (isCurrent ? 14 : isUnlocked ? 9 : 4)
                        : useSketchLessonVisual ? (isUnlocked ? 10 : 5) : (isUnlocked ? 8 : 4),
                    elevation: isCurrent ? 8 : isUnlocked ? 6 : 2,
                    ...(isGoldTheme ? goldShadow(isCurrent ? 2 : 1) : {}),
                    ...({}),
                }}>
              <TouchableOpacity testID={`lessons-row-${num}`} activeOpacity={0.82} onPress={() => {
                    hapticTap();
                    const access = resolveLessonAccess({
                        lessonId: num,
                        unlocked: isUnlocked,
                        isPremium,
                        devMode: DEV_MODE,
                        noLimits,
                    });
                    if (access === 'available') {
                        // Navigation must be instant; prefetch runs in background.
                        void prefetchLessonMenuCache(num);
                        router.push({ pathname: '/lesson_menu', params: { id: num } });
                    }
                    else if (access === 'premium_required') {
                        setGateModal({ kind: 'premium', lessonNum: num });
                    }
                    else if (levelLockedByExam && prevLessonLevel) {
                        setGateModal({ kind: 'levelGate', level: lessonLevel, prevLevel: prevLessonLevel });
                    }
                    else {
                        setGateModal({ kind: 'lesson', prevNum: num - 1 });
                    }
                }} style={{
                    height: BOOK_H,
                    borderRadius: cardRadius,
                    overflow: 'hidden',
                    borderWidth: isGoldTheme ? 1 : USE_ELITE_LESSONS_MAP ? 1 : useSketchLessonVisual && isUnlocked ? 1.5 : 0,
                    borderColor: isGoldTheme
                        ? (isCurrent ? GOLD_RICH.hairlineStrong : isUnlocked ? goldHairline : GOLD_RICH.hairlineQuiet)
                        :
                            USE_ELITE_LESSONS_MAP
                                ? (isCurrent ? 'rgba(255,255,255,0.38)' : isUnlocked ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)')
                                : useSketchLessonVisual && isUnlocked ? 'rgba(55,48,38,0.28)' : 'transparent',
                }}>
                {/* Card background */}
                {isUnlocked ? (<LinearGradient colors={isGoldTheme
                        ? (isCurrent ? goldCardGradient('selected') : lessonGoldLevel.card)
                        :
                            [darkenHex(bg, 0.52), darkBg, darkenHex(bg, 0.38)]} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}/>) : levelLockedByExam ? (<LinearGradient colors={isGoldTheme
                        ? goldCardGradient('muted')
                        :
                            [darkenHex(bg, 0.46), darkenHex(bg, 0.40), darkenHex(bg, 0.34)]} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: isGoldTheme ? 0.62 : 0.44 }}/>) : (<LinearGradient colors={isGoldTheme ? GOLD_GRADIENTS.mutedPanel : ['#1c1c1e', '#242426', '#1a1a1c']} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}/>)}
                {isGoldTheme && <GoldBevel radius={cardRadius} intensity={isCurrent ? 'strong' : isUnlocked ? 'normal' : 'quiet'}/>}
                {false}
                {/* Progress fill — left-to-right gradient bg → lightenHex(bg) */}
                {progPct > 0 && (<LinearGradient colors={isGoldTheme
                        ? [goldAntique, goldBright, lessonGoldLevel.accent] as [
                            string,
                            string,
                            string
                        ]
                        :
                            [bg, lightenHex(bg, 1.28)]} locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{
                        position: 'absolute',
                        left: 0, top: 0, bottom: 0,
                        width: `${progPct}%`,
                        opacity: isGoldTheme ? (levelLockedByExam ? 0.16 : 0.22) : levelLockedByExam ? 0.28 : 1,
                        borderTopLeftRadius: cardRadius,
                        borderBottomLeftRadius: cardRadius,
                        borderTopRightRadius: isComplete ? cardRadius : 0,
                        borderBottomRightRadius: isComplete ? cardRadius : 0,
                    }}/>)}
                {/* Subtle inner highlight on filled part top edge */}
                {progPct > 0 && (<View style={{
                        position: 'absolute', left: 0, top: 0,
                        width: `${progPct}%`, height: 1.5,
                        backgroundColor: isGoldTheme ? GOLD_RICH.hairlineStrong : useSketchLessonVisual ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)',
                        opacity: levelLockedByExam ? 0.24 : 1,
                        borderTopLeftRadius: cardRadius,
                        borderTopRightRadius: isComplete ? cardRadius : 0,
                    }}/>)}

                {/* Content */}
                <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 18 }}>
                  {USE_ELITE_LESSONS_MAP && isCurrent && (<View style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: isGoldTheme ? lessonGoldLevel.accent : 'rgba(255,255,255,0.62)' }}/>)}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{
                    color: lessonMetaColor,
                    fontSize: f.label,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                }} maxFontSizeMultiplier={1}>
                      {triLang(lang, {
                    ru: `УРОК ${num}`,
                    uk: `УРОК ${num}`,
                    es: `LECCIÓN ${num}`,
                    'pt-BR': `LIÇÃO ${num}`,
                    vi: `BÀI ${num}`,
                    id: `PELAJARAN ${num}`,
                    tr: `DERS ${num}`,
                    pl: `LEKCJA ${num}`,
                })}
                    </Text>
                    {/* Right side: percentage / lock */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {!isUnlocked
                    ? premiumRequired
                        ? <Ionicons name="lock-closed" size={14} color={isGoldTheme ? GOLD_RICH.hairlineStrong : lockedCardHasLightFill ? 'rgba(42,34,24,0.36)' : 'rgba(255,255,255,0.35)'}/>
                        : null
                    : USE_ELITE_LESSONS_MAP && isComplete
                        ? <Ionicons name="checkmark-circle" size={18} color={isGoldTheme ? lessonGoldLevel.accent : useSketchLessonVisual ? 'rgba(26,32,28,0.76)' : 'rgba(255,255,255,0.86)'}/>
                        : progPct > 0
                            ? (<Text style={{
                                    color: isGoldTheme
                                        ? (isComplete ? goldBright : t.textMuted)
                                        :
                                            useSketchLessonVisual
                                                ? (isComplete ? 'rgba(26,32,28,0.92)' : 'rgba(42,48,44,0.78)')
                                                : (isComplete ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)'),
                                    fontSize: f.label,
                                    fontWeight: '800',
                                }} maxFontSizeMultiplier={1}>
                              {progPct}%
                            </Text>)
                            : null}
                    </View>
                  </View>
                  <Text style={{
                    color: lessonTextColor,
                    fontSize: f.body,
                    fontWeight: '700',
                }} numberOfLines={1} maxFontSizeMultiplier={1}>
                    {name}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>);
        })}
        <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#ffffff', opacity: 0.15, letterSpacing: 0.5 }}>
            {triLang(lang, { ru: '· · ·', uk: '· · ·', es: '· · ·', 'pt-BR': '· · ·', vi: '· · ·', id: '· · ·', tr: '· · ·', pl: '· · ·' })}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#ffffff', opacity: 0.2, marginTop: 8 }}>
            {triLang(lang, { ru: 'Продолжение скоро', uk: 'Продовження незабаром', es: 'Próximamente', 'pt-BR': 'Continuação em breve', vi: 'Sắp có tiếp', id: 'Segera hadir', tr: 'Devamı yakında', pl: 'Ciąg dalszy wkrótce' })}
          </Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ReportErrorButton screen="lessons_tab" dataId="lessons_list" dataText={triLang(lang, {
            ru: 'Список уроков',
            uk: 'Список уроків',
            es: 'Lista de lecciones',
            'pt-BR': 'Lista de lições',
            vi: 'Danh sách bài học',
            id: 'Daftar pelajaran',
            tr: 'Ders listesi',
            pl: 'Lista lekcji',
        })}/>
        </View>
      </Animated.ScrollView>
    </ScreenGradient>
    <ThemedChoiceModal visible={gateModal !== null} title={gateModal?.kind === 'exam'
            ? triLang(lang, { ru: 'Недоступно', uk: 'Недоступно', es: 'No disponible', 'pt-BR': 'Indisponível', vi: 'Không khả dụng', id: 'Tidak tersedia', tr: 'Kullanılamaz', pl: 'Niedostępne' })
            : gateModal?.kind === 'premium'
                ? triLang(lang, {
                    ru: 'Premium',
                    uk: 'Premium',
                    es: 'Premium',
                    'pt-BR': 'Premium',
                    vi: 'Premium',
                    id: 'Premium',
                    tr: 'Premium',
                    pl: 'Premium',
                })
                : gateModal?.kind === 'levelGate'
                    ? triLang(lang, {
                        ru: 'Уровень пока закрыт',
                        uk: 'Рівень поки закритий',
                        es: 'Nivel bloqueado',
                        'pt-BR': 'Nível bloqueado',
                        vi: 'Cấp độ đang khóa',
                        id: 'Level masih terkunci',
                        tr: 'Seviye şimdilik kilitli',
                        pl: 'Poziom jest zablokowany',
                    })
                    : gateModal?.kind === 'lesson'
                        ? triLang(lang, {
                            ru: 'Урок заблокирован',
                            uk: 'Урок заблоковано',
                            es: 'Lección bloqueada',
                            'pt-BR': 'Lição bloqueada',
                            vi: 'Bài học bị khóa',
                            id: 'Pelajaran terkunci',
                            tr: 'Ders kilitli',
                            pl: 'Lekcja zablokowana',
                        })
                        : ''} message={gateModal?.kind === 'exam'
            ? (lang === 'uk'
                ? `Спочатку пройдіть всі уроки ${gateModal.level} з оцінкою 4.5+`
                : lang === 'es'
                    ? `Primero completa todas las lecciones de ${gateModal.level} con nota mínima de 4,5`
                    : `Сначала пройдите все уроки ${gateModal.level} с оценкой 4.5+`)
            : gateModal?.kind === 'levelGate'
                ? (lang === 'uk'
                    ? `Щоб відкрити рівень ${gateModal.level}, спочатку складіть залік ${gateModal.prevLevel}.`
                    : lang === 'es'
                        ? `Para abrir el nivel ${gateModal.level}, primero supera el examen de ${gateModal.prevLevel}.`
                        : `Чтобы открыть уровень ${gateModal.level}, сначала сдайте зачёт ${gateModal.prevLevel}.`)
                : gateModal?.kind === 'lesson'
                    ? (lang === 'uk'
                        ? `Пройдіть урок ${gateModal.prevNum} з оцінкою 2.5+`
                        : lang === 'es'
                            ? `Completa la lección ${gateModal.prevNum} con nota mínima de 2,5`
                            : `Пройдите урок ${gateModal.prevNum} с оценкой 2.5+`)
                    : gateModal?.kind === 'premium'
                        ? triLang(lang, {
                            ru: 'Этот урок входит в Premium.',
                            uk: 'Цей урок входить до Premium.',
                            es: 'Esta lección forma parte de Premium.',
                            'pt-BR': 'Esta lição faz parte do Premium.',
                            vi: 'Bài học này thuộc Premium.',
                            id: 'Pelajaran ini termasuk Premium.',
                            tr: 'Bu ders Premium kapsamındadır.',
                            pl: 'Ta lekcja jest częścią Premium.',
                        })
                        : ''} choices={gateModal?.kind === 'premium'
            ? [
                {
                    label: triLang(lang, { ru: 'Получить Premium', uk: 'Отримати Premium', es: 'Obtener Premium', 'pt-BR': 'Obter Premium', vi: 'Nhận Premium', id: 'Dapatkan Premium', tr: 'Premium al', pl: 'Zdobądź Premium' }),
                    variant: 'primary' as const,
                    onPress: () => {
                        const doneSoFar = scores.filter(score => score > 0).length;
                        router.push({
                            pathname: '/premium_modal',
                            params: {
                                context: lessonPaywallContext(gateModal.lessonNum),
                                lessons_done: String(doneSoFar),
                            },
                        } as any);
                    },
                },
                {
                    label: triLang(lang, { ru: 'Пока нет', uk: 'Поки ні', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdilik hayır', pl: 'Jeszcze nie' }),
                    variant: 'secondary' as const,
                    onPress: () => { },
                },
            ]
            : [{ label: triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido', 'pt-BR': 'Entendi', vi: 'Đã hiểu', id: 'Mengerti', tr: 'Anladım', pl: 'Rozumiem' }), onPress: () => { } }]} onRequestClose={() => setGateModal(null)}/>
    </>);
}
