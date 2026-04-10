import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  ScrollView,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient'; // Import registerXP
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { updateMultipleTaskProgress } from './daily_tasks';
import { IRREGULAR_VERBS_BY_LESSON, IrregularVerb } from './irregular_verbs_data';
import { registerXP } from './xp_manager';

export { IRREGULAR_VERB_COUNT_BY_LESSON, LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';

const REQUIRED = 3;
const POINTS_PER_VERB = 3;
export const GLOBAL_IRREGULAR_KEY = 'irregular_verbs_global';

// ── Mini hexagon ──────────────────────────────────────────────────────────────
function MiniHex({ filled, size = 16 }: { filled: boolean; size?: number }) {
  const { theme: t } = useTheme();
  const w = size; const h = w * 0.866; const tip = w / 4; const mid = w / 2;
  const c = filled ? t.correct : t.bgSurface2;
  return (
    <View style={{ flexDirection: 'row', width: w, height: h }}>
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderRightWidth: tip, borderTopColor:'transparent', borderBottomColor:'transparent', borderRightColor: c, marginRight: -1 }} />
      <View style={{ width: mid + 2, height: h, backgroundColor: c }} />
      <View style={{ width: 0, height: 0, borderTopWidth: h/2, borderBottomWidth: h/2, borderLeftWidth: tip, borderTopColor:'transparent', borderBottomColor:'transparent', borderLeftColor: c, marginLeft: -1 }} />
    </View>
  );
}

// ── Learn Tab (One-form-at-a-time tap mechanic) ────────────────────────────────
type BtnState = 'idle' | 'correct' | 'wrong';

const FORM_SEQ = ['past', 'pp', 'base'] as const;
type FormKey = typeof FORM_SEQ[number];

const FORM_META: Record<FormKey, { label: string; color: string; bg: string }> = {
  base: { label: 'V1 · Base form', color: '#4CAF50', bg: 'rgba(76,175,80,0.14)' },
  past: { label: 'V2 · Past Simple', color: '#4A9EFF', bg: 'rgba(74,158,255,0.14)' },
  pp:   { label: 'V3 · Past Participle', color: '#C084FC', bg: 'rgba(192,132,252,0.14)' },
};

const DISTRACTOR_POOL = ['went', 'gone', 'did', 'done', 'was', 'been', 'got', 'taken', 'came', 'seen', 'knew', 'told', 'kept', 'left', 'ran', 'made', 'said', 'gave'];

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function make4Options(correct: string, verb: IrregularVerb, allVerbs: IrregularVerb[]): string[] {
  const pool: string[] = [];
  allVerbs.forEach(v => {
    if (v.base !== verb.base) pool.push(v.base, v.past, v.pp);
  });
  const candidates = [...new Set([...pool, ...DISTRACTOR_POOL])].filter(w => w !== correct);
  const distractors = shuffleArr(candidates).slice(0, 3);
  return shuffleArr([correct, ...distractors]);
}

function LearnTab({ verbs, lang, initCounts, onUpdate }: {
  verbs: IrregularVerb[];
  lang: 'ru' | 'uk';
  initCounts: Record<string, number>;
  onUpdate: (base: string, count: number) => void;
}) {
  const { theme: t, f } = useTheme();
  const router = useRouter();

  const [queue, setQueue] = useState<IrregularVerb[]>(() => [...verbs]);
  const [pos, setPos] = useState(0);
  // step: 0=ask past, 1=ask pp, 2=ask base (mirrors original FORM_SEQ order)
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({ ...initCounts });
  const [learnedCnt, setLearnedCnt] = useState(0);
  const [totalPts, setTotalPts] = useState(0);
  const [allDone, setAllDone] = useState(verbs.length === 0);
  const [userName, setUserName] = useState('');

  const [options, setOptions] = useState<string[]>([]);
  const [btnStates, setBtnStates] = useState<BtnState[]>(['idle', 'idle', 'idle', 'idle']);
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering');
  const [feedbackCorrect, setFeedbackCorrect] = useState(true);
  const [hadErrorThisVerb, setHadErrorThisVerb] = useState(false);

  const xpToastAnim = useRef(new Animated.Value(0)).current;
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const locked = useRef(false);

  const showXpToast = useCallback(() => {
    xpToastAnim.setValue(0);
    setXpToastVisible(true);
    Animated.sequence([
      Animated.timing(xpToastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(xpToastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setXpToastVisible(false));
  }, [xpToastAnim]);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
  }, []);

  const buildStep = useCallback((verb: IrregularVerb, stepIdx: number) => {
    const form = FORM_SEQ[stepIdx];
    const correct = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;
    setOptions(make4Options(correct, verb, verbs));
    setBtnStates(['idle', 'idle', 'idle', 'idle']);
    setPhase('answering');
    locked.current = false;
  }, [verbs]);

  const initVerb = useCallback((verb: IrregularVerb) => {
    setStep(0);
    setHadErrorThisVerb(false);
    buildStep(verb, 0);
  }, [buildStep]);

  useEffect(() => {
    if (queue.length > 0) initVerb(queue[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goNextVerb = useCallback((curQueue: IrregularVerb[], curPos: number) => {
    if (curQueue.length === 0) { setAllDone(true); return; }
    setPos(curPos % curQueue.length);
    setQueue(curQueue);
    initVerb(curQueue[curPos % curQueue.length]);
  }, [initVerb]);

  const handleTap = useCallback(async (word: string, btnIdx: number) => {
    if (locked.current || phase !== 'answering') return;
    locked.current = true;

    const verb = queue[pos % Math.max(queue.length, 1)];
    if (!verb) return;
    const form = FORM_SEQ[step];
    const correct = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;
    const isCorrect = word === correct;

    // Show feedback on buttons
    const newStates: BtnState[] = options.map((opt, i) => {
      if (opt === correct) return 'correct';
      if (i === btnIdx && !isCorrect) return 'wrong';
      return 'idle';
    });
    setBtnStates(newStates);
    setFeedbackCorrect(isCorrect);
    setPhase('feedback');

    if (isCorrect) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } else {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      setHadErrorThisVerb(true);
    }

    // Advance after short delay
    setTimeout(async () => {
      const nextStep = step + 1;
      if (nextStep < FORM_SEQ.length) {
        // Next form of same verb
        setStep(nextStep);
        buildStep(verb, nextStep);
      } else {
        // Verb complete
        const newCount = 3;
        const newCounts = { ...counts, [verb.base]: newCount };
        setCounts(newCounts);
        onUpdate(verb.base, newCount);
        AsyncStorage.getItem(GLOBAL_IRREGULAR_KEY).then(raw => {
          const g: Record<string, number> = raw ? JSON.parse(raw) : {};
          g[verb.base] = newCount;
          AsyncStorage.setItem(GLOBAL_IRREGULAR_KEY, JSON.stringify(g));
        });
        setLearnedCnt(c => c + 1);
        if (!hadErrorThisVerb && isCorrect) {
          showXpToast();
          updateMultipleTaskProgress([{ type: 'verb_learned' }, { type: 'daily_active' }]);
          if (userName) { try { await registerXP(POINTS_PER_VERB, 'verb_learned', userName, lang); } catch {} setTotalPts(p => p + POINTS_PER_VERB); }
        }
        const nq = [...queue];
        nq.splice(pos % nq.length, 1);
        goNextVerb(nq, pos % Math.max(nq.length - 1, 1));
      }
    }, isCorrect ? 600 : 900);
  }, [phase, queue, pos, step, options, counts, hadErrorThisVerb, userName, lang, onUpdate, showXpToast, buildStep, goNextVerb]);

  if (allDone) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 20 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="checkmark-done-outline" size={36} color={t.correct} />
      </View>
      <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '700' }}>
        {lang === 'uk' ? 'Всі дієслова вивчено!' : 'Все глаголы выучены!'}
      </Text>
      <Text style={{ color: t.textMuted, fontSize: f.bodyLg }}>{learnedCnt} / {verbs.length}</Text>
      {totalPts > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, backgroundColor: t.correctBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Ionicons name="star" size={16} color={t.correct} />
          <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '700' }}>+{totalPts} {lang === 'uk' ? 'очок' : 'очков'}</Text>
        </View>
      )}
      <TouchableOpacity
        style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 }}
        onPress={() => router.back()}
      >
        <Text style={{ color: (t as any).correctText ?? '#1A2400', fontSize: f.h2, fontWeight: '700' }}>{lang === 'uk' ? '← До уроку' : '← К уроку'}</Text>
      </TouchableOpacity>
    </View>
  );

  const verb = queue[pos % Math.max(queue.length, 1)];
  if (!verb) return null;

  const form = FORM_SEQ[step];
  const meta = FORM_META[form];
  const correctAnswer = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;

  // Context chain — show known forms, blank for current
  const chainForms: { key: FormKey; value: string; isTarget: boolean }[] = [
    { key: 'base', value: verb.base, isTarget: form === 'base' },
    { key: 'past', value: verb.past, isTarget: form === 'past' },
    { key: 'pp',   value: verb.pp,   isTarget: form === 'pp'   },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* XP Toast */}
      {xpToastVisible && (
        <Animated.View style={{
          position: 'absolute', top: 50, alignSelf: 'center', zIndex: 999,
          backgroundColor: '#FFC800', borderRadius: 20,
          paddingHorizontal: 18, paddingVertical: 8,
          opacity: xpToastAnim,
          transform: [{ translateY: xpToastAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
        }}>
          <Text style={{ color: '#000', fontSize: 15, fontWeight: '800' }}>+3 XP ⚡</Text>
        </Animated.View>
      )}

      {/* ── Top card area ── */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, justifyContent: 'space-between' }}>

        {/* Progress */}
        <View style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: t.textMuted, fontSize: f.label }}>
              {learnedCnt} / {verbs.length} {lang === 'uk' ? 'вивчено' : 'выучено'}
            </Text>
            <Text style={{ color: learnedCnt > 0 ? t.correct : t.textMuted, fontSize: f.label, fontWeight: '600' }}>
              {Math.min(Math.round((learnedCnt / Math.max(verbs.length, 1)) * 100), 100)}%
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: t.border, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.min((learnedCnt / Math.max(verbs.length, 1)) * 100, 100)}%` as any, backgroundColor: t.correct, borderRadius: 2 }} />
          </View>
        </View>

        {/* Card */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          {/* Form badge */}
          <View style={{ backgroundColor: meta.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: meta.color + '60' }}>
            <Text style={{ color: meta.color, fontSize: f.label, fontWeight: '700', letterSpacing: 0.4 }}>{meta.label}</Text>
          </View>

          {/* Translation */}
          <Text style={{ color: t.textGhost, fontSize: f.body, textAlign: 'center' }}>
            {lang === 'uk' ? verb.uk : verb.ru}
          </Text>

          {/* Chain with blank */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {chainForms.map((cf, i) => (
              <React.Fragment key={cf.key}>
                {i > 0 && <Text style={{ color: t.textGhost, fontSize: f.bodyLg }}>→</Text>}
                {cf.isTarget ? (
                  <View style={{
                    borderBottomWidth: 2,
                    borderBottomColor: phase === 'feedback'
                      ? (feedbackCorrect ? meta.color : t.wrong)
                      : meta.color,
                    paddingHorizontal: 8, paddingBottom: 2, minWidth: 60, alignItems: 'center',
                  }}>
                    <Text style={{
                      color: phase === 'feedback'
                        ? (feedbackCorrect ? meta.color : t.wrong)
                        : meta.color,
                      fontSize: f.h1, fontWeight: '700', letterSpacing: 0.5,
                    }}>
                      {phase === 'feedback' ? correctAnswer : '?'}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '400' }}>{cf.value}</Text>
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Step dots */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {FORM_SEQ.map((_, i) => (
              <View key={i} style={{
                width: i === step ? 20 : 8, height: 8, borderRadius: 4,
                backgroundColor: i < step ? t.correct : i === step ? meta.color : t.border,
              }} />
            ))}
          </View>
        </View>
      </View>

      {/* ── Bottom buttons (sticky, thumb zone) ── */}
      <View style={{
        paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12,
        gap: 10,
        borderTopWidth: 0.5, borderTopColor: t.border,
        backgroundColor: t.bgPrimary,
      }}>
        {[options.slice(0, 2), options.slice(2, 4)].map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 10 }}>
            {row.map((word, colIdx) => {
              const idx = rowIdx * 2 + colIdx;
              const state = btnStates[idx];
              const bg = state === 'correct' ? t.correctBg
                       : state === 'wrong'   ? 'rgba(240,84,84,0.15)'
                       : t.bgCard;
              const border = state === 'correct' ? t.correct
                           : state === 'wrong'   ? t.wrong
                           : t.border;
              const color = state === 'correct' ? t.correct
                          : state === 'wrong'   ? t.wrong
                          : t.textPrimary;
              return (
                <TouchableOpacity
                  key={idx}
                  disabled={phase !== 'answering'}
                  onPress={() => { hapticTap(); handleTap(word, idx); }}
                  activeOpacity={0.75}
                  style={{
                    flex: 1, paddingVertical: 16, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: bg, borderWidth: 1.5, borderColor: border,
                  }}
                >
                  <Text style={{ color, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
                    {word}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Dictionary Tab ────────────────────────────────────────────────────────────
const COL = { base: 130, past: 110, pp: 130, tr: 160 };
const TABLE_W = COL.base + COL.past + COL.pp + COL.tr + 32;

function DictTab({ allVerbs, globalCounts, lang, onStartLearn }: {
  allVerbs: IrregularVerb[];
  globalCounts: Record<string, number>;
  lang: 'ru' | 'uk';
  onStartLearn: () => void;
}) {
  const { theme: t, f } = useTheme();
  const isUK = lang === 'uk';
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
      <TouchableOpacity
        onPress={onStartLearn}
        style={{ margin: 16, marginBottom: 12, backgroundColor: t.bgCard, borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: t.border, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
      >
        <Ionicons name="pencil-outline" size={18} color={t.textSecond} />
        <Text style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '600' }}>
          {isUK ? 'Почати тренування' : 'Начать тренировку'}
        </Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        <View style={{ minWidth: TABLE_W }}>
          <View style={{ flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Text style={{ width: COL.base, color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{isUK ? 'Основа' : 'Основа'}</Text>
            <Text style={{ width: COL.past, color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>Past</Text>
            <Text style={{ width: COL.pp,   color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>Past Part.</Text>
            <Text style={{ width: COL.tr,   color: t.textMuted, fontSize: f.label, fontWeight: '600' }}>{isUK ? 'Переклад' : 'Перевод'}</Text>
          </View>

          {allVerbs.map(verb => {
            const count = globalCounts[verb.base] ?? 0;
            const learned = count >= REQUIRED;
            return (
              <View key={verb.base} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
                <View style={{ width: COL.base, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[0, 1, 2].map(i => <MiniHex key={i} filled={count > i} size={9} />)}
                  </View>
                  <Text style={{ color: learned ? t.correct : t.textPrimary, fontSize: f.body, fontWeight: '600' }} numberOfLines={1}>{verb.base}</Text>
                </View>
                <Text style={{ width: COL.past, color: t.textSecond, fontSize: f.body }} numberOfLines={1}>{verb.past}</Text>
                <Text style={{ width: COL.pp,   color: t.textSecond, fontSize: f.body }} numberOfLines={1}>{verb.pp}</Text>
                <Text style={{ width: COL.tr,   color: t.textMuted,  fontSize: f.sub  }} numberOfLines={1}>{isUK ? verb.uk : verb.ru}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function LessonIrregularVerbs() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(id || '1', 10);
  const allVerbs = IRREGULAR_VERBS_BY_LESSON[lessonId] || [];

  const [tab, setTab] = useState<'dict' | 'learn'>('dict');
  const [globalCounts, setGlobalCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(GLOBAL_IRREGULAR_KEY).then(raw => {
      try { setGlobalCounts(raw ? JSON.parse(raw) : {}); } catch {}
      setLoaded(true);
    });
  }, []);

  const verbsToLearn = allVerbs.filter(v => (globalCounts[v.base] ?? 0) < REQUIRED);
  const title = lang === 'uk' ? 'Неправильні дієслова' : 'Неправильные глаголы';

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <TouchableOpacity onPress={() => { hapticTap(); Keyboard.dismiss(); router.back(); }}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '600' }}>{lessonId}. {title}</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={{ flex: 1 }}>
            {loaded && (tab === 'learn'
              ? <LearnTab
                  verbs={verbsToLearn}
                  lang={lang}
                  initCounts={globalCounts}
                  onUpdate={(base, count) => setGlobalCounts(prev => ({ ...prev, [base]: count }))}
                />
              : <DictTab
                  allVerbs={allVerbs}
                  globalCounts={globalCounts}
                  lang={lang}
                  onStartLearn={() => setTab('learn')}
                />
            )}
          </View>

          {/* Tab bar — Словарь first, Учить second */}
          <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: t.border }}>
            {(['dict', 'learn'] as const).map(key => {
              const isActive = tab === key;
              const label = key === 'dict'
                ? (lang === 'uk' ? 'Словник' : 'Словарь')
                : (lang === 'uk' ? 'Учити' : 'Учить');
              const icon: any = key === 'dict'
                ? (isActive ? 'list' : 'list-outline')
                : (isActive ? 'flash' : 'flash-outline');
              return (
                <TouchableOpacity key={key}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8, borderTopWidth: isActive ? 2 : 0, borderTopColor: t.textSecond }}
                  onPress={() => { Keyboard.dismiss(); setTab(key); }}
                >
                  <Ionicons name={icon} size={20} color={isActive ? t.textSecond : t.textGhost} />
                  <Text style={{ color: isActive ? t.textSecond : t.textGhost, fontSize: f.body, fontWeight: '500' }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
