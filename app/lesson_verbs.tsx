import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAudio } from '../hooks/use-audio';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList, ScrollView,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddToFlashcard from '../components/AddToFlashcard';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { triLang, type Lang } from '../constants/i18n';
import { useTheme } from '../components/ThemeContext';
import { useEnergy } from '../components/EnergyContext';
import LessonEnergyLightning from '../components/LessonEnergyLightning';
import NoEnergyModal from '../components/NoEnergyModal';
import { hapticError, hapticTap } from '../hooks/use-haptics';
import { updateMultipleTaskProgress } from './daily_tasks';
import { loadSettings } from './settings_edu';
import { registerXP } from './xp_manager';

const { width: _SW } = Dimensions.get('window');
const width = Math.min(_SW, 640);
const POINTS_PER_VERB = 3;
const REQUIRED = 3;

type VerbTuple = readonly [string, string, string, string, string, string];

function verbTranslation(lang: Lang, v: VerbTuple): string {
  if (lang === 'uk') return v[4];
  if (lang === 'es') return v[5];
  return v[3];
}

// ТОЛЬКО НЕПРАВИЛЬНЫЕ ГЛАГОЛЫ, встречающиеся впервые в данном уроке.
// Если в уроке нет новых неправильных глаголов — раздела нет.
// Кортежи: англ., Past, PP, RU, UK, ES (глосса для носителя испанского).
const VERBS_BY_LESSON: Record<number, VerbTuple[]> = {
  1: [
    ['be',         'was/were',   'been',        'быть',                 'бути',           'ser / estar'],
    ['have',       'had',        'had',         'иметь',                'мати',           'tener'],
    ['do',         'did',        'done',        'делать',               'робити',         'hacer'],
    ['go',         'went',       'gone',        'идти / ехать',         'іти / їхати',    'ir'],
    ['see',        'saw',        'seen',        'видеть',               'бачити',         'ver'],
    ['say',        'said',       'said',        'говорить / сказать',   'казати / сказати', 'decir'],
  ],
  2: [
    ['get',        'got',        'got/gotten',  'получать',             'отримувати',     'conseguir / obtener'],
    ['make',       'made',       'made',        'делать / создавать',   'робити / створювати', 'hacer'],
  ],
  3: [
    ['know',       'knew',       'known',       'знать',                'знати',          'saber / conocer'],
    ['think',      'thought',    'thought',     'думать',               'думати',         'pensar'],
    ['take',       'took',       'taken',       'брать',                'брати',          'tomar'],
    ['come',       'came',       'come',        'приходить',            'приходити',      'venir'],
    ['buy',        'bought',     'bought',      'покупать',             'купувати',       'comprar'],
    ['understand', 'understood', 'understood',  'понимать',             'розуміти',       'entender'],
  ],
  6: [
    ['find',       'found',      'found',       'находить',             'знаходити',      'encontrar'],
    ['lose',       'lost',       'lost',        'терять',               'губити',         'perder'],
    ['mean',       'meant',      'meant',       'означать',             'означати',       'significar'],
    ['cost',       'cost',       'cost',        'стоить',               'коштувати',      'costar'],
  ],
  7: [
    ['sell',       'sold',       'sold',        'продавать',            'продавати',      'vender'],
    ['keep',       'kept',       'kept',        'хранить / держать',    'тримати',        'guardar / mantener'],
    ['give',       'gave',       'given',       'давать',               'давати',         'dar'],
  ],
  8: [
    ['leave',      'left',       'left',        'уходить / уезжать',    'іти / виїжджати', 'irse'],
    ['begin',      'began',      'begun',       'начинать',             'починати',       'empezar / comenzar'],
  ],
  9: [
    ['stand',      'stood',      'stood',       'стоять',               'стояти',         'estar de pie'],
  ],
  10: [
    ['speak',      'spoke',      'spoken',      'говорить (на языке)',  'говорити (мовою)', 'hablar (un idioma)'],
    ['read',       'read',       'read',        'читать',               'читати',         'leer'],
    ['write',      'wrote',      'written',     'писать',               'писати',         'escribir'],
    ['hear',       'heard',      'heard',       'слышать',              'чути',           'oír / escuchar'],
  ],
  12: [
    ['run',        'ran',        'run',         'бежать',               'бігти',          'correr'],
    ['eat',        'ate',        'eaten',       'есть (кушать)',         'їсти',           'comer'],
  ],
  14: [
    ['grow',       'grew',       'grown',       'расти',                'рости',          'crecer'],
    ['become',     'became',     'become',      'становиться',          'ставати',        'convertirse / llegar a ser'],
    ['feel',       'felt',       'felt',        'чувствовать',          'відчувати',      'sentir'],
  ],
  15: [
    ['forget',     'forgot',     'forgotten',   'забывать',             'забувати',       'olvidar'],
    ['meet',       'met',        'met',         'встречать',            'зустрічати',     'conocer / encontrarse'],
    ['learn',      'learned',    'learned',     'учить / узнавать',     'вчити / дізнаватися', 'aprender / enterarse'],
    ['teach',      'taught',     'taught',      'учить (кого-то)',      'навчати',        'enseñar'],
  ],
  16: [
    ['put',        'put',        'put',         'класть / ставить',     'класти / ставити', 'poner'],
    ['set',        'set',        'set',         'устанавливать',        'встановлювати',  'colocar / establecer'],
    ['break',      'broke',      'broken',      'ломать',               'ламати',         'romper'],
  ],
  17: [
    ['sing',       'sang',       'sung',        'петь',                 'співати',        'cantar'],
    ['drive',      'drove',      'driven',      'водить (машину)',       'водити',         'conducir'],
  ],
  18: [
    ['choose',     'chose',      'chosen',      'выбирать',             'вибирати',       'elegir'],
  ],
  19: [
    ['hang',       'hung',       'hung',        'вешать',               'вішати',         'colgar'],
  ],
  21: [
    ['bring',      'brought',    'brought',     'приносить',            'приносити',      'traer'],
  ],
  23: [
    ['build',      'built',      'built',       'строить',              'будувати',       'construir'],
  ],
  25: [
    ['sleep',      'slept',      'slept',       'спать',                'спати',          'dormir'],
  ],
  26: [
    ['win',        'won',        'won',         'побеждать / выигрывать', 'перемагати',   'ganar'],
  ],
  27: [
    ['tell',       'told',       'told',        'говорить (кому-то)',   'говорити (комусь)', 'decir (a alguien)'],
  ],
  28: [
    ['hurt',       'hurt',       'hurt',        'причинять боль',       'заподіювати біль', 'hacer daño / lastimar'],
    ['cut',        'cut',        'cut',         'резать / порезаться',  'різати / порізатися', 'cortar / cortarse'],
  ],
  29: [
    ['drink',      'drank',      'drunk',       'пить',                 'пити',           'beber'],
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
  allVerbs: VerbTuple[],
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
  verb: VerbTuple;
  step: Step;
  options: string[];
  correctCount: number;
}

function buildVerbCard(
  verb: VerbTuple,
  step: Step,
  correctCount: number,
  allVerbs: VerbTuple[]
): VerbCard {
  const colIdx = step === 'past' ? 1 : 2;
  return { verb, step, options: makeVerbOptions(verb[colIdx], allVerbs, colIdx), correctCount };
}

function buildQueue(
  verbs: VerbTuple[],
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
  verbs: VerbTuple[];
  learnedVerbs: string[];
  learnedVerbCounts: Record<string,number>;
  speechRate: number;
}) {
  const { theme: t, f } = useTheme();
  const { s, lang } = useLang();
  const vs = s.verbs;

  return (
    <FlatList
      data={verbs}
      keyExtractor={(_, i) => i.toString()}
      contentContainerStyle={{ paddingBottom: 20 }}
      renderItem={({ item }) => {
        const verbCount = learnedVerbCounts[item[0]] ?? 0;
        const learned = verbCount >= REQUIRED;
        return (
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: t.border }}>
            <ScrollView
              horizontal
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator
              contentContainerStyle={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 14,
              }}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: verbCount > 0 ? t.correct : t.border, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0, marginTop: 2 }}>
                {learned
                  ? <Ionicons name="checkmark" size={12} color={t.correct} />
                  : verbCount > 0
                    ? <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.min((verbCount / REQUIRED) * 100, 100)}%` as any, backgroundColor: t.correctBg }} />
                    : null
                }
              </View>
              <View style={{ flexShrink: 0 }}>
                <Text style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '700' }}>{item[0]}</Text>
              </View>
              <View style={{ flexShrink: 0 }}>
                <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: 1 }}>{vs.past}</Text>
                <Text style={{ color: t.textPrimary, fontWeight: '600', fontSize: 14 }}>{item[1]}</Text>
              </View>
              <View style={{ flexShrink: 0 }}>
                <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: 1 }}>{vs.pp}</Text>
                <Text style={{ color: t.textPrimary, fontWeight: '600', fontSize: 14 }}>{item[2]}</Text>
              </View>
              <View style={{ flexShrink: 0, paddingRight: 8 }}>
                <Text style={{ color: t.textMuted, fontSize: 13 }}>{verbTranslation(lang, item)}</Text>
              </View>
              <View style={{ flexShrink: 0 }}>
                <AddToFlashcard en={`${item[0]} / ${item[1]} / ${item[2]}`} ru={item[3]} uk={item[4]} source="verb" />
              </View>
            </ScrollView>
          </View>
        );
      }}
    />
  );
}

// ── ТРЕНИРОВКА ───────────────────────────────────────────────────────────────
function Training({ verbs, storageKey, initialCounts, initialPendingPP, onCountUpdate, storageHydrated }: {
  verbs: VerbTuple[];
  storageKey: string;
  initialCounts: Record<string,number>;
  initialPendingPP: Set<string>;
  onCountUpdate: (verb: string, count: number) => void;
  /** After AsyncStorage merge — rebuild queue once so progress matches disk */
  storageHydrated: boolean;
}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t } = useTheme();
  const { s, lang } = useLang();
  const router = useRouter();
  const vs = s.verbs;

  const { energy: currentEnergy, isUnlimited: testerEnergyDisabled, formattedTime: recoveryTimeText, spendOne } = useEnergy();
  const currentEnergyRef = useRef(currentEnergy);
  const testerEnergyDisabledRef = useRef(testerEnergyDisabled);
  const spendOneRef = useRef(spendOne);
  const energyFormattedTimeRef = useRef(recoveryTimeText);
  useEffect(() => { currentEnergyRef.current = currentEnergy; }, [currentEnergy]);
  useEffect(() => { testerEnergyDisabledRef.current = testerEnergyDisabled; }, [testerEnergyDisabled]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);
  useEffect(() => { energyFormattedTimeRef.current = recoveryTimeText; }, [recoveryTimeText]);

  const [showNoEnergyModal, setShowNoEnergyModal] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const showEnergyEmptyFeedbackRef = useRef<() => void>(() => {});
  const showEnergyEmptyFeedback = useCallback(() => {
    setShowNoEnergyModal(true);
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setShowNoEnergyModal(false);
        router.back();
      });
    }, 2500);
  }, [toastAnim, router]);
  useEffect(() => { showEnergyEmptyFeedbackRef.current = showEnergyEmptyFeedback; }, [showEnergyEmptyFeedback]);

  const [queue,      setQueue]      = useState<VerbCard[]>(() => buildQueue(verbs, initialCounts, initialPendingPP));
  const [qIdx,       setQIdx]       = useState(0);
  const [chosen,     setChosen]     = useState<string | null>(null);
  const [dotCount,   setDotCount]   = useState(0);
  const [learnedCnt, setLearnedCnt] = useState(() =>
    Math.min(Object.values(initialCounts).filter(c => c >= REQUIRED).length, verbs.length)
  );
  const appliedStorageRef = useRef(false);
  useEffect(() => {
    if (!storageHydrated || appliedStorageRef.current) return;
    appliedStorageRef.current = true;
    const next = buildQueue(verbs, initialCounts, initialPendingPP);
    setQueue(next);
    setLearnedCnt(Math.min(Object.values(initialCounts).filter(c => c >= REQUIRED).length, verbs.length));
    setQIdx(0);
    setChosen(null);
    locked.current = false;
  }, [storageHydrated, verbs, initialCounts, initialPendingPP]);
  const [totalPts,   setTotalPts]   = useState(0);
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
  }, [current]);

  const handleChoice = (opt: string) => {
    if (locked.current || chosen !== null || !current) return;
    // Блокируем если энергия кончилась
    if (!testerEnergyDisabledRef.current && currentEnergyRef.current <= 0) {
      showEnergyEmptyFeedbackRef.current();
      return;
    }
    locked.current = true;

    setChosen(opt);
    const correctAnswer = current.step === 'past' ? current.verb[1] : current.verb[2];
    const isRight = opt === correctAnswer;

    if (!isRight && hapticsOn) {
      void hapticError();
    }
    if (isRight && voiceOut) {
      speakAudio(current.step === 'past' ? current.verb[1] : current.verb[2]);
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

          // Тратим энергию при ошибке
          if (!testerEnergyDisabledRef.current) {
            const energyBefore = currentEnergyRef.current;
            spendOneRef.current().then(success => {
              if (success && energyBefore === 1) {
                setTimeout(() => { showEnergyEmptyFeedbackRef.current(); }, 800);
              }
            }).catch(() => {});
          }
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
              // Only write if new value is higher — protects progress during replay sessions
              if ((counts[current.verb[0]] ?? 0) < REQUIRED) {
                counts[current.verb[0]] = REQUIRED;
                AsyncStorage.setItem(storageKey + '_verbs', JSON.stringify(counts));
                onCountUpdate(current.verb[0], REQUIRED);
              }
            });

            if (userName) {
              registerXP(POINTS_PER_VERB, 'verb_learned', userName, lang).catch(() => {});
              updateMultipleTaskProgress([{ type: 'verb_learned' }, { type: 'daily_active' }]);
              setTotalPts(p => p + POINTS_PER_VERB);
            }

            setTimeout(() => {
              newQueue.splice(pos, 1);
              const newLearned = Math.min(learnedCnt + 1, verbs.length);

              if (newQueue.length === 0) {
                setLearnedCnt(newLearned);
                setQueue(newQueue);
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
              // Only write if new value is higher — protects progress during replay sessions
              if ((counts[current.verb[0]] ?? 0) < newCount) {
                counts[current.verb[0]] = newCount;
                AsyncStorage.setItem(storageKey + '_verbs', JSON.stringify(counts));
                onCountUpdate(current.verb[0], newCount);
              }
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

          // Тратим энергию при ошибке
          if (!testerEnergyDisabledRef.current) {
            const energyBefore = currentEnergyRef.current;
            spendOneRef.current().then(success => {
              if (success && energyBefore === 1) {
                setTimeout(() => { showEnergyEmptyFeedbackRef.current(); }, 800);
              }
            }).catch(() => {});
          }
        }

        setChosen(null);
        locked.current = false;
      }
    }, 900);
  };

  if (queue.length === 0) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 30 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="checkmark-done-outline" size={36} color={t.correct} />
      </View>
      <Text style={{ color: t.textPrimary, fontSize: 22, fontWeight: '700' }}>
        {triLang(lang, {
          ru: 'Все выучено!',
          uk: 'Все вивчено!',
          es: '¡Has aprendido todas las formas!',
        })}
      </Text>
      <Text style={{ color: t.textMuted, fontSize: 15 }}>
        {triLang(lang, {
          ru: `Выучено: ${verbs.length} / ${verbs.length}`,
          uk: `Вивчено: ${verbs.length} / ${verbs.length}`,
          es: `Aprendidos: ${verbs.length} / ${verbs.length}`,
        })}
      </Text>
      {totalPts > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.correctBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Ionicons name="star" size={16} color={t.correct} />
          <Text style={{ color: t.correct, fontSize: 16, fontWeight: '700' }}>{s.words.plusPoints(totalPts)}</Text>
        </View>
      )}
      <TouchableOpacity
        style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 10 }}
        onPress={() => {
          setQueue(buildQueue(verbs, {}));
          setQIdx(0); setChosen(null); setLearnedCnt(0); setTotalPts(0);
          locked.current = false;
        }}
      >
        <Text style={{ color: t.correctText, fontSize: 17, fontWeight: '600' }}>{vs.repeat}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 }}
        onPress={() => { hapticTap(); router.back(); }}
      >
        <Text style={{ color: t.correctText, fontSize: 17, fontWeight: '700' }}>
          {triLang(lang, { ru: '← К уроку', uk: '← До уроку', es: '← Volver a la lección' })}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!current) return null;

  const correctAnswer = current.step === 'past' ? current.verb[1] : current.verb[2];
  const translation   = verbTranslation(lang, current.verb);

  const stepLabel = current.step === 'past' ? vs.guessPast : vs.guessPP;
  const pastHintLabel = `${vs.past}: `;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
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
            {triLang(lang, {
              ru: `Выучено: ${Math.min(learnedCnt, verbs.length)} / ${verbs.length}`,
              uk: `Вивчено: ${Math.min(learnedCnt, verbs.length)} / ${verbs.length}`,
              es: `Aprendidos: ${Math.min(learnedCnt, verbs.length)} / ${verbs.length}`,
            })}
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

    {/* No energy toast */}
    {showNoEnergyModal && (
      <Animated.View pointerEvents="none" style={{ position:'absolute', bottom:30, left:20, right:20, opacity:toastAnim, transform:[{translateY:toastAnim.interpolate({inputRange:[0,1],outputRange:[20,0]})}], zIndex:999 }}>
        <View style={{ backgroundColor:t.bgCard, borderRadius:16, padding:14, flexDirection:'row', alignItems:'center', gap:10, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.25, shadowRadius:10, elevation:10, borderWidth:1, borderColor:t.wrong+'55' }}>
          <Text style={{ fontSize:22 }}>⚡</Text>
          <View style={{ flex:1 }}>
            <Text style={{ color:t.textPrimary, fontSize:15, fontWeight:'700' }}>
              {triLang(lang, { ru: 'Энергия закончилась', uk: 'Енергія закінчилась', es: 'Sin energía' })}
            </Text>
            {!!energyFormattedTimeRef.current && (
              <Text style={{ color:t.textSecond, fontSize:12, marginTop:2 }}>
                {lang === 'es'
                  ? `Se recuperará en ${energyFormattedTimeRef.current}`
                  : lang === 'uk'
                    ? `Відновиться через ${energyFormattedTimeRef.current}`
                    : `Восстановится через ${energyFormattedTimeRef.current}`}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    )}
    </View>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function LessonVerbs() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { s } = useLang();
  const { energy, maxEnergy, isUnlimited: energyUnlimited } = useEnergy();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(id || '1', 10);
  const verbs = VERBS_BY_LESSON[lessonId] || VERBS_BY_LESSON[1];
  const hasIrregular = LESSONS_WITH_IRREGULAR_VERBS.has(lessonId);
  const vs = s.verbs;
  const storageKey = `lesson${lessonId}`;

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);
  const [mode,         setMode]         = useState<Mode>('train');
  /** Без энергии — вкладка «Список»; уроки только с тренировкой — модалка при открытии */
  useEffect(() => {
    if (energyUnlimited || energy > 0) {
      setNoEnergyModalOpen(false);
      return;
    }
    if (hasIrregular) setMode('list');
    else setNoEnergyModalOpen(true);
  }, [energyUnlimited, energy, hasIrregular]);
  const [learnedVerbCounts, setLearnedVerbCounts] = useState<Record<string,number>>({});
  const learnedVerbs = Object.keys(learnedVerbCounts).filter(k => learnedVerbCounts[k] >= REQUIRED);
  const [pendingPP, setPendingPP] = useState<Set<string>>(new Set());
  const [listSpeechRate, setListSpeechRate] = useState(0.9);
  const [storageHydrated, setStorageHydrated] = useState(false);

  useEffect(() => {
    setStorageHydrated(false);
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
      setListSpeechRate(cfg.speechRate ?? 0.9);
      setStorageHydrated(true);
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
        <LessonEnergyLightning energyCount={energy} maxEnergy={maxEnergy} shouldShake={false} />
      </View>

      <View style={{ flex: 1 }}>
        {mode === 'train'
          ? <Training
            key={storageKey}
            verbs={verbs}
            storageKey={storageKey}
            storageHydrated={storageHydrated}
            initialCounts={learnedVerbCounts}
            initialPendingPP={pendingPP}
            onCountUpdate={(verb, count) => setLearnedVerbCounts(prev => ({ ...prev, [verb]: count }))}
          />
          : <VerbList verbs={verbs} learnedVerbs={learnedVerbs} learnedVerbCounts={learnedVerbCounts} speechRate={listSpeechRate} />}
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
              onPress={() => {
                if (key === 'train') {
                  if (!energyUnlimited && energy <= 0) {
                    setNoEnergyModalOpen(true);
                    return;
                  }
                }
                setMode(key);
              }}
            >
              <Ionicons name={icon as any} size={20} color={isActive ? t.textSecond : t.textGhost} />
              <Text style={{ color: isActive ? t.textSecond : t.textGhost, fontSize: 14, fontWeight: '500' }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </ContentWrap>

      <NoEnergyModal visible={noEnergyModalOpen} onClose={() => setNoEnergyModalOpen(false)} />
      </ScreenGradient>
    </SafeAreaView>
  );
}
