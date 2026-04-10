import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList, ScrollView,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddToFlashcard from '../components/AddToFlashcard';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient'; // Import registerXP
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { updateMultipleTaskProgress } from './daily_tasks';
import { loadSettings } from './settings_edu';
import { registerXP } from './xp_manager';

const { width: _SW } = Dimensions.get('window');
const width = Math.min(_SW, 640);
const POINTS_PER_VERB = 3;
const REQUIRED = 3;

// ТОЛЬКО НЕПРАВИЛЬНЫЕ ГЛАГОЛЫ, встречающиеся впервые в данном уроке.
// Если в уроке нет новых неправильных глаголов — раздела нет.
const VERBS_BY_LESSON: Record<number, [string,string,string,string,string][]> = {
  1: [
    ['be',         'was/were',   'been',        'быть',                 'бути'],
    ['have',       'had',        'had',         'иметь',                'мати'],
    ['do',         'did',        'done',        'делать',               'робити'],
    ['go',         'went',       'gone',        'идти / ехать',         'іти / їхати'],
    ['see',        'saw',        'seen',        'видеть',               'бачити'],
    ['say',        'said',       'said',        'говорить / сказать',   'казати / сказати'],
  ],
  2: [
    ['get',        'got',        'got/gotten',  'получать',             'отримувати'],
    ['make',       'made',       'made',        'делать / создавать',   'робити / створювати'],
  ],
  3: [
    ['know',       'knew',       'known',       'знать',                'знати'],
    ['think',      'thought',    'thought',     'думать',               'думати'],
    ['take',       'took',       'taken',       'брать',                'брати'],
    ['come',       'came',       'come',        'приходить',            'приходити'],
    ['buy',        'bought',     'bought',      'покупать',             'купувати'],
    ['understand', 'understood', 'understood',  'понимать',             'розуміти'],
  ],
  6: [
    ['find',       'found',      'found',       'находить',             'знаходити'],
    ['lose',       'lost',       'lost',        'терять',               'губити'],
    ['mean',       'meant',      'meant',       'означать',             'означати'],
    ['cost',       'cost',       'cost',        'стоить',               'коштувати'],
  ],
  7: [
    ['sell',       'sold',       'sold',        'продавать',            'продавати'],
    ['keep',       'kept',       'kept',        'хранить / держать',    'тримати'],
    ['give',       'gave',       'given',       'давать',               'давати'],
  ],
  8: [
    ['leave',      'left',       'left',        'уходить / уезжать',    'іти / виїжджати'],
    ['begin',      'began',      'begun',       'начинать',             'починати'],
  ],
  9: [
    ['stand',      'stood',      'stood',       'стоять',               'стояти'],
  ],
  10: [
    ['speak',      'spoke',      'spoken',      'говорить (на языке)',  'говорити (мовою)'],
    ['read',       'read',       'read',        'читать',               'читати'],
    ['write',      'wrote',      'written',     'писать',               'писати'],
    ['hear',       'heard',      'heard',       'слышать',              'чути'],
  ],
  12: [
    ['run',        'ran',        'run',         'бежать',               'бігти'],
    ['eat',        'ate',        'eaten',       'есть (кушать)',         'їсти'],
  ],
  14: [
    ['grow',       'grew',       'grown',       'расти',                'рости'],
    ['become',     'became',     'become',      'становиться',          'ставати'],
    ['feel',       'felt',       'felt',        'чувствовать',          'відчувати'],
  ],
  15: [
    ['forget',     'forgot',     'forgotten',   'забывать',             'забувати'],
    ['meet',       'met',        'met',         'встречать',            'зустрічати'],
    ['learn',      'learnt',     'learnt',      'учить / узнавать',     'вчити / дізнаватися'],
    ['teach',      'taught',     'taught',      'учить (кого-то)',      'навчати'],
  ],
  16: [
    ['put',        'put',        'put',         'класть / ставить',     'класти / ставити'],
    ['set',        'set',        'set',         'устанавливать',        'встановлювати'],
    ['break',      'broke',      'broken',      'ломать',               'ламати'],
  ],
  17: [
    ['sing',       'sang',       'sung',        'петь',                 'співати'],
    ['drive',      'drove',      'driven',      'водить (машину)',       'водити'],
  ],
  18: [
    ['choose',     'chose',      'chosen',      'выбирать',             'вибирати'],
  ],
  19: [
    ['hang',       'hung',       'hung',        'вешать',               'вішати'],
  ],
  21: [
    ['bring',      'brought',    'brought',     'приносить',            'приносити'],
  ],
  23: [
    ['build',      'built',      'built',       'строить',              'будувати'],
  ],
  25: [
    ['sleep',      'slept',      'slept',       'спать',                'спати'],
  ],
  26: [
    ['win',        'won',        'won',         'побеждать / выигрывать', 'перемагати'],
  ],
  27: [
    ['tell',       'told',       'told',        'говорить (кому-то)',   'говорити (комусь)'],
  ],
  28: [
    ['hurt',       'hurt',       'hurt',        'причинять боль',       'заподіювати біль'],
    ['cut',        'cut',        'cut',         'резать / порезаться',  'різати / порізатися'],
  ],
  29: [
    ['drink',      'drank',      'drunk',       'пить',                 'пити'],
  ],
};

export const LESSONS_WITH_VERBS: Set<number> = new Set(Object.keys(VERBS_BY_LESSON).map(Number));

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Cross-lesson pools: все глаголы в VERBS_BY_LESSON — только неправильные
const CROSS_PAST: string[] = [...new Set(
  Object.values(VERBS_BY_LESSON).flatMap(vs => vs.map(v => v[1]))
)];
const CROSS_PP: string[] = [...new Set(
  Object.values(VERBS_BY_LESSON).flatMap(vs => vs.map(v => v[2]))
)];

// Все уроки в VERBS_BY_LESSON содержат только неправильные глаголы
export const LESSONS_WITH_IRREGULAR_VERBS: Set<number> = LESSONS_WITH_VERBS;
export const VERB_COUNT_BY_LESSON: Record<number, number> = Object.fromEntries(
  Object.entries(VERBS_BY_LESSON).map(([k, v]) => [Number(k), v.length])
);

type Mode = 'train' | 'list';
type Step = 'past' | 'pp';

function makeVerbOptions(
  correct: string,
  allVerbs: [string,string,string,string,string][],
  colIdx: number
): string[] {
  const lessonPool = fisherYates(
    [...new Set(allVerbs.map(v => v[colIdx]))].filter(v => v !== correct)
  );
  const pool = colIdx === 1 ? CROSS_PAST : CROSS_PP;
  const crossPool = fisherYates(
    pool.filter(v => v !== correct && !lessonPool.includes(v))
  );
  // Гарантируем ровно 5 дистракторов → 6 вариантов всего
  let decoys = [...lessonPool, ...crossPool].slice(0, 5);
  if (decoys.length < 5) {
    // Резервный пул: все известные формы того же типа, кроме correct и уже взятых
    const fallback = fisherYates(pool.filter(v => v !== correct && !decoys.includes(v)));
    decoys = [...decoys, ...fallback].slice(0, 5);
  }
  return fisherYates([...decoys, correct]);
}

interface VerbCard {
  verb: [string,string,string,string,string];
  step: Step;
  options: string[];
  correctCount: number;
}

function buildVerbCard(
  verb: [string,string,string,string,string],
  step: Step,
  correctCount: number,
  allVerbs: [string,string,string,string,string][]
): VerbCard {
  const colIdx = step === 'past' ? 1 : 2;
  return { verb, step, options: makeVerbOptions(verb[colIdx], allVerbs, colIdx), correctCount };
}

function buildQueue(
  verbs: [string,string,string,string,string][],
  counts: Record<string, number>,
  pendingPP: Set<string> = new Set(),
): VerbCard[] {
  const notDone = fisherYates([...verbs].filter(v => (counts[v[0]] ?? 0) < REQUIRED));
  // Глаголы где Past уже пройден — сразу показываем PP (восстановление после выхода)
  const pendingCards = notDone
    .filter(v => pendingPP.has(v[0]))
    .map(v => buildVerbCard(v, 'pp', counts[v[0]] ?? 0, verbs));
  // Остальные глаголы: чередуем Past и PP как обычно
  const normalVerbs = notDone.filter(v => !pendingPP.has(v[0]));
  const pastCards = normalVerbs.map(v => buildVerbCard(v, 'past', counts[v[0]] ?? 0, verbs));
  const ppCards   = normalVerbs.map(v => buildVerbCard(v, 'pp',   counts[v[0]] ?? 0, verbs));
  const normalQueue: VerbCard[] = [];
  const maxLen = Math.max(pastCards.length, ppCards.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < pastCards.length) normalQueue.push(pastCards[i]);
    if (i < ppCards.length)   normalQueue.push(ppCards[i]);
  }
  return [...pendingCards, ...normalQueue];
}

// ── СПИСОК ──────────────────────────────────────────────────────────────────
function VerbList({ verbs, learnedVerbs, learnedVerbCounts, speechRate }: {
  verbs: [string,string,string,string,string][];
  learnedVerbs: string[];
  learnedVerbCounts: Record<string,number>;
  speechRate: number;
}) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';

  return (
    <FlatList
      data={verbs}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={{ paddingBottom: 20 }}
      renderItem={({ item }) => {
        const verbCount = learnedVerbCounts[item[0]] ?? 0;
        const learned = verbCount >= REQUIRED;
        return (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: verbCount > 0 ? t.correct : t.border, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden', flexShrink: 0 }}>
                {learned
                  ? <Ionicons name="checkmark" size={12} color={t.correct} />
                  : verbCount > 0
                    ? <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.min((verbCount / REQUIRED) * 100, 100)}%` as any, backgroundColor: t.correctBg }} />
                    : null
                }
              </View>
              <Text style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '700', flex: 1 }}>{item[0]}</Text>
              <AddToFlashcard en={`${item[0]} / ${item[1]} / ${item[2]}`} ru={item[3]} uk={item[4]} source="verb" />
            </View>
            <View style={{ flexDirection: 'row', marginLeft: 32, gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: 1 }}>Past</Text>
                <Text style={{ color: t.textPrimary, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{item[1]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: 1 }}>PP</Text>
                <Text style={{ color: t.textPrimary, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{item[2]}</Text>
              </View>
            </View>
            <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 3, marginLeft: 32 }}>{isUK ? item[4] : item[3]}</Text>
          </View>
        );
      }}
    />
  );
}

// ── ТРЕНИРОВКА ───────────────────────────────────────────────────────────────
function Training({ verbs, storageKey, initialCounts, initialPendingPP, onCountUpdate }: {
  verbs: [string,string,string,string,string][];
  storageKey: string;
  initialCounts: Record<string,number>;
  initialPendingPP: Set<string>;
  onCountUpdate: (verb: string, count: number) => void;
}) {
  const { theme: t } = useTheme();
  const { s, lang } = useLang();
  const router = useRouter();
  const vs = s.verbs;
  const isUK = lang === 'uk';

  const [queue,      setQueue]      = useState<VerbCard[]>(() => buildQueue(verbs, initialCounts, initialPendingPP));
  const [qIdx,       setQIdx]       = useState(0);
  const [chosen,     setChosen]     = useState<string | null>(null);
  const [dotCount,   setDotCount]   = useState(0);
  const [learnedCnt, setLearnedCnt] = useState(() =>
    Math.min(Object.values(initialCounts).filter(c => c >= REQUIRED).length, verbs.length)
  );
  const [totalPts,   setTotalPts]   = useState(0);
  const [allDone,    setAllDone]    = useState(false);
  const [userName,   setUserName]   = useState('');
  const [voiceOut,   setVoiceOut]   = useState(true);
  const [hapticsOn,  setHapticsOn]  = useState(true);

  const locked = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
    loadSettings().then(cfg => { setVoiceOut(cfg.voiceOut); setHapticsOn(cfg.haptics); });
  }, []);

  const current: VerbCard | undefined = queue[qIdx % Math.max(queue.length, 1)];
  React.useEffect(() => {
    if (current) setDotCount(current.correctCount);
  }, [current?.verb[0], current?.correctCount]);

  const handleChoice = (opt: string) => {
    if (locked.current || chosen !== null || !current) return;
    locked.current = true;

    setChosen(opt);
    const correctAnswer = current.step === 'past' ? current.verb[1] : current.verb[2];
    const isRight = opt === correctAnswer;

    if (!isRight && hapticsOn) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
    }
    if (isRight && voiceOut) {
      Speech.speak(current.step === 'past' ? current.verb[1] : current.verb[2], { language: 'en-US' });
    }

    setTimeout(async () => {
      const newQueue = [...queue];
      const pos = qIdx % newQueue.length;

      if (current.step === 'past') {
        if (isRight) {
          // Past correct → сохраняем что глагол ждёт PP, переходим к PP шагу
          AsyncStorage.getItem(storageKey + '_verbs_pending').then(raw => {
            const arr: string[] = raw ? JSON.parse(raw) : [];
            if (!arr.includes(current.verb[0])) arr.push(current.verb[0]);
            AsyncStorage.setItem(storageKey + '_verbs_pending', JSON.stringify(arr));
          });
          const ppCard = buildVerbCard(current.verb, 'pp', current.correctCount, verbs);
          newQueue[pos] = ppCard;
          setQueue(newQueue);
          setQIdx(qIdx);
          setChosen(null);
          locked.current = false;
        } else {
          // Past wrong → move verb to end of queue, stay on past step
          const resetCard = buildVerbCard(current.verb, 'past', current.correctCount, verbs);
          newQueue.splice(pos, 1);
          newQueue.push(resetCard);
          const nextIdx = pos >= newQueue.length ? 0 : pos;
          setQueue(newQueue);
          setQIdx(nextIdx);
          setChosen(null);
          locked.current = false;
        }
      } else {
        // PP шаг завершён (любой исход) — убираем из pendingPP
        AsyncStorage.getItem(storageKey + '_verbs_pending').then(raw => {
          const arr: string[] = raw ? JSON.parse(raw) : [];
          const filtered = arr.filter(v => v !== current.verb[0]);
          AsyncStorage.setItem(storageKey + '_verbs_pending', JSON.stringify(filtered));
        });

        if (isRight) {
          const newCount = current.correctCount + 1;

          if (newCount >= REQUIRED) {
            // Show all 3 dots lit before removing verb from queue
            setDotCount(REQUIRED);

            AsyncStorage.getItem(storageKey + '_verbs').then(saved => {
              const data = saved ? JSON.parse(saved) : {};
              const counts: Record<string,number> = Array.isArray(data) ? {} : data;
              counts[current.verb[0]] = REQUIRED;
              AsyncStorage.setItem(storageKey + '_verbs', JSON.stringify(counts));
              onCountUpdate(current.verb[0], REQUIRED);
            });

            if (userName) {
              try { await registerXP(POINTS_PER_VERB, 'verb_learned', userName, lang); } catch {}
              updateMultipleTaskProgress([{ type: 'verb_learned' }, { type: 'daily_active' }]);
              setTotalPts(p => p + POINTS_PER_VERB);
            }

            setTimeout(() => {
              newQueue.splice(pos, 1);
              const newLearned = Math.min(learnedCnt + 1, verbs.length);

              if (newQueue.length === 0) {
                setLearnedCnt(newLearned);
                setQueue(newQueue);
                setAllDone(true);
                setChosen(null);
                locked.current = false;
                return;
              }

              const nextIdx = pos >= newQueue.length ? 0 : pos;
              setLearnedCnt(newLearned);
              setQueue(newQueue);
              setQIdx(nextIdx);
              setChosen(null);
              locked.current = false;
            }, 500);
            return;
          } else {
            // Partial progress: show updated dot, then advance queue
            setDotCount(newCount);
            AsyncStorage.getItem(storageKey + '_verbs').then(saved => {
              const data = saved ? JSON.parse(saved) : {};
              const counts: Record<string,number> = Array.isArray(data) ? {} : data;
              counts[current.verb[0]] = newCount;
              AsyncStorage.setItem(storageKey + '_verbs', JSON.stringify(counts));
              onCountUpdate(current.verb[0], newCount);
            });
            const updated = buildVerbCard(current.verb, 'past', newCount, verbs);
            newQueue.splice(pos, 1);
            newQueue.push(updated);
            const nextIdx = pos >= newQueue.length ? 0 : pos;
            setTimeout(() => {
              setQueue(newQueue);
              setQIdx(nextIdx);
              setChosen(null);
              locked.current = false;
            }, 400);
            return;
          }
        } else {
          const reset = buildVerbCard(current.verb, 'past', current.correctCount, verbs);
          newQueue.splice(pos, 1);
          newQueue.push(reset);
          const nextIdx = pos >= newQueue.length ? 0 : pos;
          setQueue(newQueue);
          setQIdx(nextIdx);
        }

        setChosen(null);
        locked.current = false;
      }
    }, 900);
  };

  if (allDone || queue.length === 0) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 30 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="checkmark-done-outline" size={36} color={t.correct} />
      </View>
      <Text style={{ color: t.textPrimary, fontSize: 22, fontWeight: '700' }}>
        {isUK ? 'Все вивчено!' : 'Все выучено!'}
      </Text>
      <Text style={{ color: t.textMuted, fontSize: 15 }}>
        {isUK ? `Вивчено: ${verbs.length} / ${verbs.length}` : `Выучено: ${verbs.length} / ${verbs.length}`}
      </Text>
      {totalPts > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.correctBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Ionicons name="star" size={16} color={t.correct} />
          <Text style={{ color: t.correct, fontSize: 16, fontWeight: '700' }}>
            +{totalPts} {isUK ? 'досвіду' : 'опыта'}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={{ borderWidth: 1.5, borderColor: t.textSecond, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 10 }}
        onPress={() => {
          setQueue(buildQueue(verbs, {}));
          setQIdx(0); setChosen(null); setLearnedCnt(0); setTotalPts(0); setAllDone(false);
          locked.current = false;
        }}
      >
        <Text style={{ color: t.textSecond, fontSize: 17, fontWeight: '600' }}>{vs.repeat}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 }}
        onPress={() => { hapticTap(); router.back(); }}
      >
        <Text style={{ color: t.correctText, fontSize: 17, fontWeight: '700' }}>{isUK ? '← До уроку' : '← К уроку'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (!current) return null;

  const correctAnswer = current.step === 'past' ? current.verb[1] : current.verb[2];
  const translation   = isUK ? current.verb[4] : current.verb[3];

  const stepLabel = current.step === 'past'
    ? (isUK ? 'Минулий час від:' : 'Прошедшее время от:')
    : (isUK ? 'Третя форма від:'  : 'Третья форма от:');

  const pastHintLabel = isUK ? 'Минулий час: ' : 'Прошедшее время: ';

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >

      {/* 3 кружка */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{
            width: 22, height: 22, borderRadius: 11,
            borderWidth: 2, borderColor: dotCount > i ? t.correct : t.textSecond,
            backgroundColor: dotCount > i ? t.correct : 'transparent',
          }} />
        ))}
      </View>

      {/* Карточка */}
      <View style={{ backgroundColor: t.bgCard, borderRadius: 16, padding: 20, width: '100%', marginBottom: 20, borderWidth: 0.5, borderColor: t.border, alignItems: 'center' }}>
        <View style={{ backgroundColor: t.bgSurface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14, borderWidth: 1, borderColor: t.border }}>
          <Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>{stepLabel}</Text>
        </View>
        <Text style={{ color: t.textPrimary, fontSize: 36, fontWeight: '300', textAlign: 'center', marginBottom: 4 }}>
          {current.verb[0]}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 14 }}>{translation}</Text>

        {current.step === 'pp' && (
          <View style={{ flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: t.border, gap: 4 }}>
            <Text style={{ color: t.textMuted, fontSize: 14 }}>{pastHintLabel}</Text>
            <Text style={{ color: t.correct, fontSize: 14, fontWeight: '600' }}>{current.verb[1]}</Text>
          </View>
        )}
      </View>

      {/* 6 вариантов */}
      <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {current.options.map((opt, i) => {
          const isCorrect  = opt === correctAnswer;
          const isSelected = opt === chosen;
          let bg = t.bgCard, border = t.border, tc = t.textSecond;
          if (chosen !== null) {
            if (isCorrect)       { bg = t.correctBg; border = t.correct; tc = t.correct; }
            else if (isSelected) { bg = t.wrongBg;   border = t.wrong;   tc = t.wrong;   }
          }
          return (
            <TouchableOpacity key={i}
              style={{ width: '48%', paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, backgroundColor: bg, borderColor: border }}
              onPress={() => { hapticTap(); handleChoice(opt); }}
              activeOpacity={0.8}
              disabled={chosen !== null}
            >
              <Text style={{ color: tc, fontSize: 17, fontWeight: '500' }}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Прогресс */}
      <View style={{ width: width - 40, marginTop: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: t.textMuted, fontSize: 12 }}>
            {isUK ? `Вивчено: ${Math.min(learnedCnt, verbs.length)} / ${verbs.length}` : `Выучено: ${Math.min(learnedCnt, verbs.length)} / ${verbs.length}`}
          </Text>
          <Text style={{ color: learnedCnt > 0 ? t.correct : t.textMuted, fontSize: 12, fontWeight: '600' }}>
            {Math.min(Math.round(learnedCnt / verbs.length * 100), 100)}%
          </Text>
        </View>
        <View style={{ height: 5, backgroundColor: t.border, borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min((learnedCnt / verbs.length) * 100, 100)}%` as any, backgroundColor: t.correct, borderRadius: 3 }} />
        </View>
      </View>

    </ScrollView>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function LessonVerbs() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { s } = useLang();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(id || '1', 10);
  const verbs = VERBS_BY_LESSON[lessonId] || VERBS_BY_LESSON[1];
  const hasIrregular = LESSONS_WITH_IRREGULAR_VERBS.has(lessonId);
  const vs = s.verbs;
  const storageKey = `lesson${lessonId}`;

  const [mode,         setMode]         = useState<Mode>('train');
  const [learnedVerbCounts, setLearnedVerbCounts] = useState<Record<string,number>>({});
  const learnedVerbs = Object.keys(learnedVerbCounts).filter(k => learnedVerbCounts[k] >= REQUIRED);
  const [pendingPP, setPendingPP] = useState<Set<string>>(new Set());
  const [listSpeechRate, setListSpeechRate] = useState(1.0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(storageKey + '_verbs'),
      AsyncStorage.getItem(storageKey + '_verbs_pending'),
      loadSettings(),
    ]).then(([v, vp, cfg]) => {
      if (v) {
        const data = JSON.parse(v);
        if (Array.isArray(data)) {
          const counts: Record<string,number> = {};
          data.forEach((w: string) => { counts[w] = REQUIRED; });
          setLearnedVerbCounts(counts);
        } else {
          setLearnedVerbCounts(data);
        }
      }
      if (vp) {
        try { setPendingPP(new Set(JSON.parse(vp))); } catch {}
      }
      setListSpeechRate(cfg.speechRate ?? 1.0);
      setLoaded(true);
    });
  }, [storageKey]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }}>
      <ScreenGradient>
      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: t.textPrimary, fontSize: 16, fontWeight: '600' }}>{vs.title(lessonId)}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={{ flex: 1 }}>
        {loaded && (mode === 'train'
          ? <Training
            verbs={verbs}
            storageKey={storageKey}
            initialCounts={learnedVerbCounts}
            initialPendingPP={pendingPP}
            onCountUpdate={(verb, count) => setLearnedVerbCounts(prev => ({ ...prev, [verb]: count }))}
          />
          : <VerbList verbs={verbs} learnedVerbs={learnedVerbs} learnedVerbCounts={learnedVerbCounts} speechRate={listSpeechRate} />
        )}
      </View>

      <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: t.border }}>
        {((['train', ...(hasIrregular ? ['list'] : [])] as ('train'|'list')[])).map(key => {
          const isActive = mode === key;
          const label = key === 'train' ? vs.training : vs.list;
          const icon  = key === 'train'
            ? (isActive ? 'pencil'      : 'pencil-outline')
            : (isActive ? 'list'        : 'list-outline');
          return (
            <TouchableOpacity key={key}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderTopWidth: isActive ? 2 : 0, borderTopColor: t.textSecond }}
              onPress={() => setMode(key)}
            >
              <Ionicons name={icon as any} size={20} color={isActive ? t.textSecond : t.textGhost} />
              <Text style={{ color: isActive ? t.textSecond : t.textGhost, fontSize: 14, fontWeight: '500' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </ContentWrap>
      </ScreenGradient>
    </SafeAreaView>
  );
}
