import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard, Platform,
  ScrollView,
  Text, TextInput, TouchableOpacity,
  TouchableWithoutFeedback,
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

// ── useKeyboardHeight ─────────────────────────────────────────────────────────
function useKeyboardHeight() {
  const [kbH, setKbH] = useState(0);
  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEv, e => setKbH(e.endCoordinates.height));
    const h = Keyboard.addListener(hideEv, () => setKbH(0));
    return () => { s.remove(); h.remove(); };
  }, []);
  return kbH;
}

// ── Learn Tab ─────────────────────────────────────────────────────────────────
type Feedback = 'idle' | 'correct' | 'wrong';

function LearnTab({ verbs, lang, initCounts, onUpdate }: {
  verbs: IrregularVerb[];
  lang: 'ru' | 'uk';
  initCounts: Record<string, number>;
  onUpdate: (base: string, count: number) => void;
}) {
  const { theme: t, f } = useTheme();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const kbH = useKeyboardHeight();

  const [queue, setQueue] = useState<IrregularVerb[]>(() => [...verbs]);
  const [pos, setPos] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('idle');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({ ...initCounts });
  const [learnedCnt, setLearnedCnt] = useState(0);
  const [totalPts, setTotalPts] = useState(0);
  const [allDone, setAllDone] = useState(verbs.length === 0);
  const [userName, setUserName] = useState('');
  const [pendingNext, setPendingNext] = useState<{ queue: IrregularVerb[]; pos: number } | null>(null);
  const locked = useRef(false);

  const xpToastAnim = useRef(new Animated.Value(0)).current;
  const [xpToastVisible, setXpToastVisible] = useState(false);

  const showXpToast = useCallback(() => {
    xpToastAnim.setValue(0);
    setXpToastVisible(true);
    Animated.sequence([
      Animated.timing(xpToastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(xpToastAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setXpToastVisible(false));
  }, [xpToastAnim]);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
  }, []);

  const goNext = useCallback((newQueue: IrregularVerb[], nextPos: number) => {
    if (newQueue.length === 0) { setAllDone(true); return; }
    setQueue(newQueue);
    setPos(nextPos % newQueue.length);
    setInput('');
    setFeedback('idle');
    setCorrectAnswer('');
    locked.current = false;
    // Keep keyboard open by refocusing
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleNext = useCallback(() => {
    if (!pendingNext) return;
    setPendingNext(null);
    goNext(pendingNext.queue, pendingNext.pos);
  }, [pendingNext, goNext]);

  const handleSubmit = useCallback(async () => {
    if (!queue.length || locked.current || feedback !== 'idle') return;
    const verb = queue[pos % queue.length];
    if (!verb) return;
    locked.current = true;

    const typed = input.trim().toLowerCase();
    const currentCount = counts[verb.base] ?? 0;
    const askForm0 = currentCount === 0 ? 'past' : currentCount === 1 ? 'pp' : 'base';
    const correct = askForm0 === 'past' ? verb.past.toLowerCase()
                  : askForm0 === 'pp'   ? verb.pp.toLowerCase()
                  : verb.base.toLowerCase();

    if (typed === correct) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      const newCount = (counts[verb.base] ?? 0) + 1;
      const newCounts = { ...counts, [verb.base]: newCount };
      setCounts(newCounts);
      onUpdate(verb.base, newCount);
      AsyncStorage.getItem(GLOBAL_IRREGULAR_KEY).then(raw => {
        const g: Record<string, number> = raw ? JSON.parse(raw) : {};
        g[verb.base] = newCount;
        AsyncStorage.setItem(GLOBAL_IRREGULAR_KEY, JSON.stringify(g));
      });
      setFeedback('correct');
      if (newCount >= REQUIRED) {
        setLearnedCnt(c => c + 1);
        showXpToast(); // Show toast for XP
        updateMultipleTaskProgress([{ type: 'verb_learned' }, { type: 'daily_active' }]); // Update daily tasks
        if (userName) { await registerXP(POINTS_PER_VERB, 'verb_learned', userName, lang); setTotalPts(p => p + POINTS_PER_VERB); }
        const nq = [...queue]; nq.splice(pos % nq.length, 1);
        setPendingNext({ queue: nq, pos });
      } else {
        const nq = [...queue]; const rem = nq.splice(pos % nq.length, 1)[0]; nq.push(rem);
        setPendingNext({ queue: nq, pos: pos % Math.max(nq.length, 1) });
      }
    } else {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
      setFeedback('wrong');
      setCorrectAnswer(askForm0 === 'past' ? verb.past : askForm0 === 'pp' ? verb.pp : verb.base);
      const nq = [...queue]; const rem = nq.splice(pos % nq.length, 1)[0]; nq.push(rem);
      setPendingNext({ queue: nq, pos: pos % Math.max(nq.length, 1) });
    }
  }, [queue, pos, input, counts, feedback, userName, lang, onUpdate, showXpToast]);

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
        <Text style={{ color: '#fff', fontSize: f.h2, fontWeight: '700' }}>{lang === 'uk' ? '← До уроку' : '← К уроку'}</Text>
      </TouchableOpacity>
    </View>
  );

  const verb = queue[pos % Math.max(queue.length, 1)];
  if (!verb) return null;

  const count = counts[verb.base] ?? 0;
  const askForm = count === 0 ? 'past' : count === 1 ? 'pp' : 'base';
  const borderC = feedback === 'correct' ? t.correct : feedback === 'wrong' ? t.wrong : t.border;
  const bgC    = feedback === 'correct' ? t.correctBg : feedback === 'wrong' ? (t as any).wrongBg ?? 'rgba(255,68,68,0.12)' : t.bgCard;
  const textC  = feedback === 'correct' ? t.correct : feedback === 'wrong' ? t.wrong : t.textPrimary;

  const isIdle = feedback === 'idle';

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* XP Toast */}
      {xpToastVisible && (
        <Animated.View style={{
          position: 'absolute',
          bottom: 120,
          alignSelf: 'center',
          zIndex: 999,
          backgroundColor: '#FFC800',
          borderRadius: 20,
          paddingHorizontal: 20,
          paddingVertical: 10,
          opacity: xpToastAnim,
          transform: [{
            translateY: xpToastAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>+3 XP</Text>
        </Animated.View>
      )}

      {/* Verb card area */}
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10 }}>

          {/* Progress */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: t.textMuted, fontSize: f.label }}>
                {learnedCnt} / {verbs.length} {lang === 'uk' ? 'вивчено' : 'выучено'}
              </Text>
              <Text style={{ color: learnedCnt > 0 ? t.correct : t.textMuted, fontSize: f.label, fontWeight: '600' }}>
                {Math.min(Math.round((learnedCnt / Math.max(verbs.length, 1)) * 100), 100)}%
              </Text>
            </View>
            <View style={{ height: 5, backgroundColor: t.border, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.min((learnedCnt / Math.max(verbs.length, 1)) * 100, 100)}%` as any, backgroundColor: t.correct, borderRadius: 3 }} />
            </View>
          </View>

          {/* Round badge + hex dots */}
          {(() => {
            const formCfg = askForm === 'past'
              ? { label: lang === 'uk' ? 'Форма 2 · Past Simple' : 'Форма 2 · Past Simple', color: '#4A9EFF', bg: 'rgba(74,158,255,0.14)', icon: 'pencil-outline' as const }
              : askForm === 'pp'
              ? { label: lang === 'uk' ? 'Форма 3 · Past Participle' : 'Форма 3 · Past Participle', color: '#C084FC', bg: 'rgba(192,132,252,0.14)', icon: 'create-outline' as const }
              : { label: lang === 'uk' ? 'Форма 1 · Інфінітив' : 'Форма 1 · Инфинитив', color: t.correct, bg: t.correctBg, icon: 'flash-outline' as const };
            return (
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: formCfg.bg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: formCfg.color + '50' }}>
                  <Ionicons name={formCfg.icon} size={13} color={formCfg.color} />
                  <Text style={{ color: formCfg.color, fontSize: f.label, fontWeight: '700', letterSpacing: 0.3 }}>{formCfg.label}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[0, 1, 2].map(i => <MiniHex key={i} filled={count > i} size={22} />)}
                </View>
              </View>
            );
          })()}

          {/* Verb display — centered */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>

            {/* Translation */}
            <Text style={{ color: t.textGhost, fontSize: f.body, textAlign: 'center' }}>
              {lang === 'uk' ? verb.uk : verb.ru}
            </Text>

            {/* Forms chain */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {(['base', 'past', 'pp'] as const).map((form, i) => {
                const isTarget = askForm === form;
                const isKnown = (form === 'base' && count >= 2 && askForm !== 'base')
                  || (form === 'past' && count >= 1)
                  || (form === 'pp' && count >= 2);
                const showValue = !isTarget || feedback !== 'idle';
                const value = form === 'base' ? verb.base : form === 'past' ? verb.past : verb.pp;
                return (
                  <React.Fragment key={form}>
                    {i > 0 && <Text style={{ color: t.textGhost, fontSize: f.body }}>→</Text>}
                    <View style={{
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      backgroundColor: isTarget ? (feedback === 'correct' ? t.correctBg : feedback === 'wrong' ? 'rgba(240,84,84,0.12)' : t.bgSurface) : 'transparent',
                      borderWidth: isTarget ? 1 : 0,
                      borderColor: isTarget ? (feedback === 'correct' ? t.correct : feedback === 'wrong' ? t.wrong : t.border) : 'transparent',
                    }}>
                      <Text style={{
                        fontSize: isTarget ? 32 : 20,
                        fontWeight: isTarget ? '500' : '300',
                        color: isTarget
                          ? (feedback === 'correct' ? t.correct : feedback === 'wrong' ? t.wrong : t.textPrimary)
                          : (isKnown ? t.textSecond : t.textGhost),
                        letterSpacing: isTarget ? 1 : 0,
                      }}>
                        {showValue ? value : '___'}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>

            {/* Correct answer hint on wrong */}
            {feedback === 'wrong' && correctAnswer ? (
              <View style={{ alignItems: 'center', gap: 2, backgroundColor: 'rgba(240,84,84,0.10)', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8 }}>
                <Text style={{ color: t.textGhost, fontSize: f.sub }}>{lang === 'uk' ? 'Правильно:' : 'Правильно:'}</Text>
                <Text style={{ color: t.correct, fontSize: f.h2, fontWeight: '700' }}>{correctAnswer}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Input + button */}
      <View style={{
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' && kbH > 0 ? kbH + 8 : 16,
        paddingTop: 10,
        gap: 8,
        borderTopWidth: 0.5,
        borderTopColor: t.border,
        backgroundColor: t.bgPrimary,
      }}>
        <View style={{ borderRadius: 16, borderWidth: 2, backgroundColor: bgC, borderColor: borderC }}>
          <TextInput
            ref={inputRef}
            autoFocus
            value={input}
            onChangeText={v => { if (isIdle) setInput(v); }}
            onSubmitEditing={() => { if (!isIdle) handleNext(); else handleSubmit(); }}
            returnKeyType={isIdle ? 'done' : 'next'}
            blurOnSubmit={false}
            placeholder={askForm === 'past' ? 'past simple...' : askForm === 'pp' ? 'past participle...' : 'infinitive...'}
            placeholderTextColor={t.textGhost}
            autoCapitalize="none"
            autoCorrect={false}
            editable={isIdle}
            style={{
              color: textC,
              fontSize: f.h2,
              fontWeight: '600',
              textAlign: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
            }}
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: isIdle ? t.accent : t.bgSurface,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: isIdle ? 0 : 1,
            borderColor: t.border,
          }}
          onPress={() => { hapticTap(); if (!isIdle) handleNext(); else handleSubmit(); }}
          activeOpacity={0.8}
        >
          <Text style={{ color: isIdle ? (t as any).correctText ?? '#1A2400' : t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
            {isIdle
              ? (lang === 'uk' ? 'Перевірити' : 'Проверить')
              : (lang === 'uk' ? 'Далі →' : 'Дальше →')}
          </Text>
        </TouchableOpacity>
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
