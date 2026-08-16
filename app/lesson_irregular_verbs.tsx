import Ionicons from '@expo/vector-icons/Ionicons';
import TapScale from '../components/TapScale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  InteractionManager,
  Keyboard,
  ScrollView,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { stringsForLang, useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { triLang, type Lang } from '../constants/i18n';
import { screenTextOnGradient, type ThemeMode } from '../constants/theme';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import { useTheme } from '../components/ThemeContext';
import XpGainBadge from '../components/XpGainBadge';
import { useEnergy } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import CollectibleDropModal from '../components/CollectibleDropModal';
import { useOverlayVisible } from '../components/OverlayArbiter';
import { maybeRollCollectibleDrop, type CollectibleDropOutcome } from './collectibles/storage';
import { useAudio } from '../hooks/use-audio';
import fk from './feedback/feedback_kit';
import VictoryBurst from '../components/feedback/VictoryBurst';
import { verbLearnedDoneTitle, verbFormsSubtitle } from './feedback/feedback_i18n';
import { MOTION_SCALE } from '../constants/motion';
import { loadSettings } from './settings_edu';
import { IRREGULAR_VERBS_BY_LESSON, IrregularVerb, acceptedFormsFor, portionsForVerbs } from './irregular_verbs_data';
import { buildIrregularVerbOptions, ensureCompleteIrregularVerbOptions } from './irregular_verb_options';
import {
  loadVerbSrs,
  recordVerbPass,
  seedSrsFromLegacyCounts,
  summarizeVerbSrs,
  daysUntilDue,
  type VerbSrsMap,
} from './irregular_verbs_srs';
import VerbLetterBank from '../components/VerbLetterBank';
import { safeRouterBack } from './navigation_back';
import { registerXP } from './xp_manager';
import { addShards } from './shards_system';
import ReportErrorButton from '../components/ReportErrorButton';
import BouncyScrollView from '../components/BouncyScrollView';
import AddToFlashcard from '../components/AddToFlashcard';
import { recordWordMistake, activateWordForTrainer } from './trainer_store';
import { logMistake } from './mistake_log';
import { openLessonGateByRuntime, shouldBlockLessonAccess } from './lesson_premium_gate';
import { irregularVerbsGlobalKey, lessonIrregularShardsGrantedKey, type RuntimeStudyTarget } from './target_storage_keys';
import {
  frenchVocabularyGateCopy,
  vocabularyContentAvailableForTarget,
} from './vocabulary_target_gate';

export { IRREGULAR_VERB_COUNT_BY_LESSON, LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';

const REQUIRED = 3;
const POINTS_PER_VERB = 3;
const safeVerbEventPart = (value: unknown, max = 60): string =>
  String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';
/** Как в «Словаре»: короткая пауза на подсветку; озвучка правильного ответа — сразу при тапе (не после таймера). */
const ANSWER_FEEDBACK_MS = { correct: 800, wrong: 400 } as const;
export const GLOBAL_IRREGULAR_KEY = irregularVerbsGlobalKey();
export const globalIrregularKeyForTarget = irregularVerbsGlobalKey;

// ── Mini hexagon ──────────────────────────────────────────────────────────────
// ── Learn Tab (One-form-at-a-time tap mechanic) ────────────────────────────────
type BtnState = 'idle' | 'correct' | 'wrong';

const FORM_SEQ = ['past', 'pp', 'base'] as const;
type FormKey = typeof FORM_SEQ[number];

function formRowMeta(lang: Lang, themeMode: ThemeMode): Record<FormKey, { label: string; color: string; bg: string }> {
  const sv = stringsForLang(lang).verbs;
  return {
    base: { label: `V1 · ${sv.base}`, color: monoIcon(themeMode, '#4CAF50'), bg: 'rgba(76,175,80,0.14)' },
    past: { label: `V2 · ${sv.past}`, color: monoIcon(themeMode, '#4A9EFF'), bg: 'rgba(74,158,255,0.14)' },
    pp:   { label: `V3 · ${sv.pp}`, color: monoIcon(themeMode, '#C084FC'), bg: 'rgba(192,132,252,0.14)' },
  };
}

/** Equivalentes en español (estándar neutro) por lemma — alineados con el sentido pedagógico de ru/uk en datos. */
const IRREGULAR_VERB_ES_BY_BASE: Record<string, string> = {
  be: 'Ser / estar',
  break: 'Romper',
  build: 'Construir',
  drink: 'Beber',
  speak: 'Hablar',
  understand: 'Entender',
  know: 'Saber / conocer',
  eat: 'Comer',
  buy: 'Comprar',
  read: 'Leer',
  come: 'Venir',
  write: 'Escribir',
  drive: 'Conducir',
  feel: 'Sentir',
  forget: 'Olvidar',
  take: 'Tomar',
  teach: 'Enseñar',
  wear: 'Llevar (puesto)',
  cost: 'Costar',
  see: 'Ver',
  pay: 'Pagar',
  sell: 'Vender',
  lose: 'Perder',
  spend: 'Gastar',
  do: 'Hacer',
  send: 'Enviar',
  go: 'Ir',
  find: 'Encontrar',
  hear: 'Oír',
  sing: 'Cantar',
  sleep: 'Dormir',
  leave: 'Salir / dejar',
  keep: 'Mantener',
  meet: 'Conocer',
  put: 'Poner',
  get: 'Conseguir',
  have: 'Tener',
  spring: 'Saltar',
  show: 'Mostrar',
  choose: 'Elegir',
  bring: 'Traer',
  make: 'Hacer',
  give: 'Dar',
  tell: 'Contar',
  say: 'Decir',
  think: 'Pensar',
  cut: 'Cortar',
  shut: 'Cerrar',
  seek: 'Buscar',
  fight: 'Pelear / luchar',
  light: 'Encender',
  sweep: 'Barrer',
  weep: 'Llorar',
  bend: 'Doblar',
  split: 'Partir',
  stink: 'Oler mal',
  kneel: 'Arrodillarse',
  spill: 'Derramar',
  deal: 'Tratar (con)',
  hang: 'Colgar',
  lay: 'Poner',
  stick: 'Pegar',
  tear: 'Rasgar',
  set: 'Colocar',
  flee: 'Huir',
  shine: 'Brillar',
  sting: 'Picar',
  strive: 'Esforzarse',
  thrive: 'Prosperar',
  cling: 'Aferrarse',
  fling: 'Arrojar',
  sling: 'Lanzar',
  let: 'Dejar',
  shrink: 'Encogerse',
  slink: 'Escabullirse',
  strew: 'Esparcir',
  slay: 'Matar',
  smite: 'Golpear',
  lie: 'Estar echado',
  stand: 'Estar de pie',
  steal: 'Robar',
  ride: 'Montar',
  forbid: 'Prohibir',
  lend: 'Prestar',
  win: 'Ganar',
  catch: 'Atrapar',
  ring: 'Sonar / llamar',
  run: 'Correr',
  burn: 'Arder',
  hold: 'Sostener',
  hurt: 'Herir',
  dwell: 'Residir',
  overcome: 'Superar',
  fly: 'Volar',
  lead: 'Guiar',
  begin: 'Empezar',
  fall: 'Caer',
  shake: 'Sacudir',
  hit: 'Golpear',
  strike: 'Golpear',
  wake: 'Despertarse',
};

function irregularVerbTranslation(verb: IrregularVerb, lang: Lang): string {
  if (lang === 'uk') return verb.uk;
  if (lang === 'es') return verb.es || IRREGULAR_VERB_ES_BY_BASE[verb.base] || verb.base;
  return verb.ru;
}

/**
 * Русские (и локализованные) подписи-времена под английскими формами глагола.
 * По просьбе пользователя: под base/past/pp — время по-русски, плюс отдельная
 * строка-пример будущего (в английском нет отдельной формы: will + base).
 * Формы: base = настоящее/инфинитив, past = прошедшее, pp = причастие.
 * Возвращаем подписи для колонок base/past/pp и строку будущего (will + base).
 */
function verbTenseCaptions(lang: Lang): {
  present: string;
  pastT: string;
  participle: string;
  future: (base: string) => string;
} {
  if (lang === 'uk') {
    return {
      present: 'теперішнє',
      pastT: 'минуле',
      participle: 'дієприкметник',
      future: (base) => `майбутнє: will ${base}`,
    };
  }
  if (lang === 'es') {
    return {
      present: 'presente',
      pastT: 'pasado',
      participle: 'participio',
      future: (base) => `futuro: will ${base}`,
    };
  }
  return {
    present: 'настоящее',
    pastT: 'прошлое',
    participle: 'причастие',
    future: (base) => `будущее: will ${base}`,
  };
}

function initialOptionsForFirstStep(verbs: IrregularVerb[], allVerbs: IrregularVerb[]): string[] {
  if (verbs.length === 0) return [];
  const v0 = verbs[0];
  const correct = v0.past;
  return buildIrregularVerbOptions(correct, v0, allVerbs, 'past');
}

function LearnTab({ verbs, allVerbs, lang, initCounts, initSrs, onUpdate, onReset, lessonId, onNoEnergy, studyTarget }: {
  verbs: IrregularVerb[];
  allVerbs: IrregularVerb[];
  lang: Lang;
  initCounts: Record<string, number>;
  initSrs: VerbSrsMap;
  onUpdate: (base: string, count: number) => void;
  onReset: () => void;
  lessonId?: number;
  onNoEnergy: () => void;
  studyTarget?: RuntimeStudyTarget;
}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { theme: t, f, themeMode } = useTheme();
  const router = useRouter();
  const pack = stringsForLang(lang);
  const formMeta = formRowMeta(lang, themeMode);
  const isLightTheme = false;
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);

  const { energy: currentEnergy, isUnlimited: testerEnergyDisabled, spendOne } = useEnergy();
  const currentEnergyRef = useRef(currentEnergy);
  const testerEnergyDisabledRef = useRef(testerEnergyDisabled);
  const spendOneRef = useRef(spendOne);
  useEffect(() => { currentEnergyRef.current = currentEnergy; }, [currentEnergy]);
  useEffect(() => { testerEnergyDisabledRef.current = testerEnergyDisabled; }, [testerEnergyDisabled]);
  useEffect(() => { spendOneRef.current = spendOne; }, [spendOne]);

  const onNoEnergyRef = useRef(onNoEnergy);
  useEffect(() => { onNoEnergyRef.current = onNoEnergy; }, [onNoEnergy]);

  const [queue, setQueue] = useState<IrregularVerb[]>(() => [...verbs]);
  const [pos, setPos] = useState(0);
  // step: 0=ask past, 1=ask pp, 2=ask base (mirrors original FORM_SEQ order)
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({ ...initCounts });
  const [learnedCnt, setLearnedCnt] = useState(0);
  const [totalPts, setTotalPts] = useState(0);
  const [allDone, setAllDone] = useState(verbs.length === 0);
  const [userName, setUserName] = useState('');
  const [voiceOut, setVoiceOut] = useState(true);
  const [speechRate, setSpeechRate] = useState(0.9);

  const [options, setOptions] = useState<string[]>(() => initialOptionsForFirstStep(verbs, allVerbs));
  const [btnStates, setBtnStates] = useState<BtnState[]>(['idle', 'idle', 'idle', 'idle']);
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering');
  const [feedbackCorrect, setFeedbackCorrect] = useState(true);
  // [FeedbackKit] Мини-победа «Глагол освоен»: показываем формы освоенного
  // глагола (base–past–part). null = скрыта; ставится при чистом проходе глагола.
  const [learnedBurst, setLearnedBurst] = useState<{ base: string; past: string; pp: string } | null>(null);
  const hadErrorThisVerb = useRef(false);
  // «Шаткий» проход: была ошибка ИЛИ глагол ещё незрелый (узнавание) — короткий SRS-интервал.
  const shakyThisVerb = useRef(false);
  // Счётчик ошибок на глагол для тренера (порог: 2 ошибки → активация)
  const verbMistakeCountRef = useRef<Record<string, number>>({});
  const irregularStorageKey = useMemo(() => irregularVerbsGlobalKey(studyTarget), [studyTarget]);
  // SRS-карта (стрик/повторения по каждой base) — обновляется по ходу сессии.
  const srsMapRef = useRef<VerbSrsMap>(initSrs);
  // Зрелые глаголы (streak ≥ 2) тренируем воспроизведением (буквы), новые — узнаванием (кнопки).
  const RECALL_STREAK_THRESHOLD = 2;
  const isRecallVerb = useCallback((base: string): boolean => {
    const st = srsMapRef.current[base.trim().toLowerCase()];
    return !!st && !st.mastered && st.streak >= RECALL_STREAK_THRESHOLD;
  }, []);
  const [letterBankKey, setLetterBankKey] = useState(0);

  const xpTranslateY = useRef(new Animated.Value(40)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const [xpToastVisible, setXpToastVisible] = useState(false);
  const [xpToastAmount, setXpToastAmount] = useState(POINTS_PER_VERB);
  const locked = useRef(false);
  const showXpToast = useCallback((amount: number = POINTS_PER_VERB) => {
    const a = Number.isFinite(amount) && amount >= 0 ? amount : POINTS_PER_VERB;
    setXpToastAmount(a);
    xpTranslateY.setValue(40);
    xpOpacity.setValue(0);
    setXpToastVisible(true);
    const easeIn = Easing.out(Easing.cubic);
    const easeOut = Easing.in(Easing.cubic);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(xpTranslateY, { toValue: 0, duration: 420, easing: easeIn, useNativeDriver: true }),
        Animated.timing(xpOpacity, { toValue: 1, duration: 400, easing: easeIn, useNativeDriver: true }),
      ]),
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(xpOpacity, { toValue: 0, duration: 480, easing: easeOut, useNativeDriver: true }),
        Animated.timing(xpTranslateY, { toValue: -12, duration: 480, easing: easeOut, useNativeDriver: true }),
      ]),
    ]).start(() => setXpToastVisible(false));
  }, [xpOpacity, xpTranslateY]);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
    loadSettings().then(s => { setVoiceOut(s.voiceOut); setSpeechRate(s.speechRate); });
  }, []);

  // ── Дроп коллекционной карточки за закрытый раздел глаголов ───────────────
  // зачем: владелец попросил шанс карточки и за закрытие неправильных глаголов.
  // Шанс/дневной кап/pity — общие с уроком, решает сервер. eventId =
  // verbs:<цель>:<урок> без дня: раздел закрывается один раз, повторный вход в
  // уже пройденный раздел карточку не даёт (леджер идемпотентен по eventId).
  const [cardDrop, setCardDrop] = useState<CollectibleDropOutcome | null>(null);
  const cardDropRolledRef = useRef(false);
  const cardDropVisible = useOverlayVisible('collectibleDrop', cardDrop != null);

  useEffect(() => {
    if (!allDone) return;
    if (cardDropRolledRef.current) return;
    cardDropRolledRef.current = true;
    void maybeRollCollectibleDrop('verbs', `${studyTarget ?? 'en'}:${lessonId ?? 0}`, { dailyScoped: false })
      .then((drop) => { if (drop) setCardDrop(drop); })
      .catch(() => {});
  }, [allDone, studyTarget, lessonId]);

  const buildStep = useCallback((verb: IrregularVerb, stepIdx: number) => {
    const form = FORM_SEQ[stepIdx];
    const correct = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;
    setOptions(buildIrregularVerbOptions(correct, verb, allVerbs, form));
    setBtnStates(['idle', 'idle', 'idle', 'idle']);
    setPhase('answering');
    locked.current = false;
  }, [allVerbs]);

  const initVerb = useCallback((verb: IrregularVerb) => {
    setStep(0);
    hadErrorThisVerb.current = false;
    // Узнавание из 4 кнопок = «шаткий» проход (можно угадать) → короткий SRS-интервал.
    // Воспроизведение из букв = «крепкий» проход.
    shakyThisVerb.current = !isRecallVerb(verb.base);
    setLetterBankKey(k => k + 1);
    buildStep(verb, 0);
  }, [buildStep, isRecallVerb]);

  // До useEffect варианты были [] → первый кадр рисовал пустой низ. useLayoutEffect + начальный state — всегда 4 кнопки.
  useLayoutEffect(() => {
    if (queue.length > 0) initVerb(queue[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goNextVerb = useCallback((curQueue: IrregularVerb[], curPos: number) => {
    if (curQueue.length === 0) {
      setAllDone(true);
      // Осколок за завершение раздела неправильных глаголов (единоразово) — глобальная модалка в _layout
      const key = lessonIrregularShardsGrantedKey(lessonId ?? 0, studyTarget);
      void AsyncStorage.getItem(key).then(done => {
        if (!done) {
          void addShards('lesson_completed', {
            eventId: `irregular:${studyTarget}:${lessonId ?? 0}:completed`,
            localWrites: [[key, '1']],
          })
            .catch(() => {});
        }
      }).catch(() => {});
      return;
    }
    setPos(curPos % curQueue.length);
    setQueue(curQueue);
    initVerb(curQueue[curPos % curQueue.length]);
  }, [initVerb, lessonId, studyTarget]);

  const handleTap = useCallback(async (word: string, btnIdx: number) => {
    if (locked.current || phase !== 'answering') return;
    // Блокируем если энергия кончилась
    if (!testerEnergyDisabledRef.current && currentEnergyRef.current <= 0) {
      onNoEnergyRef.current();
      return;
    }
    locked.current = true;

    const verb = queue[pos % Math.max(queue.length, 1)];
    if (!verb) return;
    const form = FORM_SEQ[step];
    const correct = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;
    // Принимаем и варианты формы (was|were, gotten|got) как верный ответ.
    const acceptedSet = new Set(acceptedFormsFor(verb, form).map(f => f.toLowerCase()));
    const isCorrect = acceptedSet.has(word.toLowerCase());
    const activeOptions = ensureCompleteIrregularVerbOptions(options, verb, allVerbs, form);

    // Show feedback on buttons
    const newStates: BtnState[] = activeOptions.map((opt, i) => {
      if (opt === correct) return 'correct';
      if (i === btnIdx && !isCorrect) return 'wrong';
      return 'idle';
    });
    setBtnStates(newStates);
    setFeedbackCorrect(isCorrect);
    setPhase('feedback');

    if (voiceOut) speakAudio(word, speechRate, { language: 'en-US' });

    if (isCorrect) {
      // [FeedbackKit] fk.correct даёт haptic + тёплый «дин-дон».
      fk.verdict({ correct: true });
    } else {
      fk.verdict({ correct: false });
      hadErrorThisVerb.current = true;
      shakyThisVerb.current = true;

      // Тренер: считаем ошибки на глагол; при 2-й — активируем в очереди
      const vKey = verb.base;
      logMistake(vKey, lessonId ?? 0, 'lesson_words', 'wrong_pick', {
        tokenText: correct,
        expected: correct,
        picked: word,
        rawCategory: 'irregular_verbs',
      }, studyTarget);
      const prevVerbCount = verbMistakeCountRef.current[vKey] ?? 0;
      const newVerbCount = prevVerbCount + 1;
      verbMistakeCountRef.current[vKey] = newVerbCount;
      if (newVerbCount === 2) {
        void activateWordForTrainer(vKey, verb.ru, verb.uk, lessonId ?? 0, 'irregular_verbs', undefined, studyTarget);
      } else {
        void recordWordMistake(vKey, verb.ru, verb.uk, lessonId ?? 0, 'irregular_verbs', undefined, studyTarget);
      }

      // Тратим энергию при ошибке
      if (!testerEnergyDisabledRef.current) {
        const energyBefore = currentEnergyRef.current;
        spendOneRef.current().then(success => {
          if (success && energyBefore === 1) {
            setTimeout(() => { onNoEnergyRef.current(); }, 800);
          }
        }).catch(() => {});
      }
    }

    // Advance after short delay (озвучка — сразу выше, без ожидания таймера)
    setTimeout(async () => {
      const nextStep = step + 1;
      if (nextStep < FORM_SEQ.length) {
        // Next form of same verb
        setStep(nextStep);
        buildStep(verb, nextStep);
      } else {
        // Verb complete (все 3 формы отвечены)
        const noErrors = !hadErrorThisVerb.current && isCorrect;
        // SRS: чистый проход двигает по лесенке; «шаткий» (узнавание/угадал) — короткий интервал.
        void recordVerbPass(verb.base, { clean: noErrors, shaky: shakyThisVerb.current }, studyTarget)
          .then(state => { srsMapRef.current = { ...srsMapRef.current, [verb.base.trim().toLowerCase()]: state }; })
          .catch(() => {});
        if (noErrors) {
          // Correct — mark as learned
          // [FeedbackKit] Мини-победа «Глагол освоен» — на СУЩЕСТВУЮЩЕЕ событие
          // освоения (чистый проход всех трёх форм). Только ощущение; счёт/XP ниже.
          setLearnedBurst({ base: verb.base, past: verb.past, pp: verb.pp });
          const newCount = 3;
          const newCounts = { ...counts, [verb.base]: newCount };
          setCounts(newCounts);
          onUpdate(verb.base, newCount);
          AsyncStorage.getItem(irregularStorageKey).then(raw => {
            const g: Record<string, number> = raw ? JSON.parse(raw) : {};
            g[verb.base] = newCount;
            AsyncStorage.setItem(irregularStorageKey, JSON.stringify(g));
          });
          setLearnedCnt(c => c + 1);
          registerXP(POINTS_PER_VERB, 'verb_learned', userName || '', lang, lessonId, {
            eventId: [
              'verb',
              safeVerbEventPart(studyTarget),
              String(lessonId ?? 0),
              safeVerbEventPart(verb.base, 50),
              'learned',
            ].join(':'),
            payload: {
              lessonId: lessonId ?? null,
              studyTarget,
              verb: verb.base,
            },
          })
            .then((r) => {
              const finalDelta = r?.finalDelta;
              const earned = typeof finalDelta === 'number' && Number.isFinite(finalDelta) && finalDelta >= 0
                ? finalDelta
                : POINTS_PER_VERB;
              setTotalPts(p => p + earned);
              if (earned > 0) showXpToast(earned);
            })
            .catch(() => {
              setTotalPts(p => p + POINTS_PER_VERB);
              showXpToast(POINTS_PER_VERB);
            });
          const nq = [...queue];
          nq.splice(pos % nq.length, 1);
          goNextVerb(nq, pos % Math.max(nq.length - 1, 1));
        } else {
          // Had errors — put verb back at end of queue for retry
          const nq = [...queue];
          const current = nq.splice(pos % nq.length, 1)[0];
          nq.push(current);
          goNextVerb(nq, pos % Math.max(nq.length, 1));
        }
      }
    }, isCorrect ? ANSWER_FEEDBACK_MS.correct : ANSWER_FEEDBACK_MS.wrong);
  }, [phase, queue, pos, step, options, allVerbs, counts, userName, lang, onUpdate, showXpToast, buildStep, goNextVerb, speakAudio, speechRate, voiceOut, irregularStorageKey, studyTarget]);

  const activeVerb = queue[pos % Math.max(queue.length, 1)];
  const activeForm = FORM_SEQ[step];
  // Зрелый глагол → собираем форму из букв (воспроизведение), новый → 4 кнопки (узнавание).
  const recallActive = !!activeVerb && isRecallVerb(activeVerb.base);
  const activeAcceptedForms = useMemo(
    () => activeVerb ? acceptedFormsFor(activeVerb, activeForm) : [],
    [activeVerb, activeForm],
  );
  const handleRecallSubmit = useCallback((_correct: boolean, assembled: string) => {
    // Переиспользуем общий путь обработки ответа; корректность пересчитывается внутри по acceptedForms.
    void handleTap(assembled, -1);
  }, [handleTap]);
  const displayOptions = useMemo(
    () => activeVerb ? ensureCompleteIrregularVerbOptions(options, activeVerb, allVerbs, activeForm) : options,
    [options, activeVerb, allVerbs, activeForm],
  );

  useEffect(() => {
    if (!activeVerb) return;
    const sameOptions = options.length === displayOptions.length
      && options.every((option, index) => option === displayOptions[index]);
    if (!sameOptions) setOptions(displayOptions);
  }, [activeVerb, displayOptions, options]);

  if (allDone) return (
    <>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 20 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: t.bgCard, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="checkmark-done-outline" size={36} color={t.correct} />
        </View>
        <Text style={{ color: sx.primary, fontSize: f.h1, fontWeight: '700' }}>
          {triLang(lang, {
            ru: 'Все глаголы выучены!',
            uk: 'Всі дієслова вивчено!',
            es: '¡Has aprendido todos los verbos!',
            'pt-BR': 'Todos os verbos foram aprendidos!',
            vi: 'Bạn đã học xong tất cả động từ!',
            id: 'Semua kata kerja sudah dipelajari!',
            tr: 'Tüm fiiller öğrenildi!',
            pl: 'Wszystkie czasowniki opanowane!',
          })}
        </Text>
        <Text style={{ color: sx.muted, fontSize: f.bodyLg }}>{learnedCnt} / {verbs.length}</Text>
        {totalPts > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, backgroundColor: t.correctBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Ionicons name="star" size={16} color={t.correct} />
            <Text style={{ color: t.correct, fontSize: f.bodyLg, fontWeight: '700' }}>{pack.words.plusPoints(totalPts)}</Text>
          </View>
        )}
        <TouchableOpacity
          style={{ backgroundColor: t.correct, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 }}
          onPress={() => safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any)}
        >
          <Text style={{ color: t.correctText, fontSize: f.h2, fontWeight: '700' }}>
            {triLang(lang, { ru: '← К уроку', uk: '← До уроку', es: '← Volver a la lección', 'pt-BR': '← Voltar à lição', vi: '← Về bài học', id: '← Kembali ke pelajaran', tr: '← Derse dön', pl: '← Do lekcji' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: t.bgCard, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => { fk.tap(); onReset(); }}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={18} color={t.textSecond} />
          <Text style={{ color: t.textSecond, fontSize: f.h2, fontWeight: '600' }}>
            {triLang(lang, { ru: 'Начать заново', uk: 'Спочатку', es: 'Desde el principio', 'pt-BR': 'Começar de novo', vi: 'Bắt đầu lại', id: 'Mulai lagi', tr: 'Baştan başla', pl: 'Zacznij od nowa' })}
          </Text>
        </TouchableOpacity>
      </View>
      {/* Карточка за закрытый раздел глаголов — сюрприз поверх экрана итога. */}
      <CollectibleDropModal
        outcome={cardDropVisible ? cardDrop : null}
        onClose={() => setCardDrop(null)}
        onOpenCollection={() => {
          setCardDrop(null);
          router.push('/collectibles_screen' as any);
        }}
      />
    </>
  );

  const verb = activeVerb;
  if (!verb) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center' }}>
          {triLang(lang, {
            ru: 'Что-то пошло не так. Вернись к уроку или открой вкладку «Словарь» и снова нажми «Начать тренировку».',
            uk: 'Щось пішло не так. Повернись до уроку або відкрий вкладку «Словник» і знову натисни «Почати тренування».',
            es: 'Algo salió mal. Vuelve a la lección o abre «Vocabulario» y pulsa «Empieza a practicar» otra vez.',
            'pt-BR': 'Algo deu errado. Volte à lição ou abra a aba “Vocabulário” e toque em “Começar treino” novamente.',
            vi: 'Đã có lỗi xảy ra. Hãy quay lại bài học hoặc mở tab “Từ vựng” và bấm “Bắt đầu luyện tập” lần nữa.',
            id: 'Ada yang salah. Kembali ke pelajaran atau buka tab “Kosakata” dan tekan “Mulai latihan” lagi.',
            tr: 'Bir şeyler ters gitti. Derse dön veya “Sözlük” sekmesini açıp “Alıştırmaya başla”ya tekrar dokun.',
            pl: 'Coś poszło nie tak. Wróć do lekcji albo otwórz zakładkę „Słownik” i ponownie stuknij „Rozpocznij trening”.',
          })}
        </Text>
      </View>
    );
  }

  const form = FORM_SEQ[step];
  const meta = formMeta[form];
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
          backgroundColor: isLightTheme ? '#92400E' : '#FFC800', borderRadius: 20,
          paddingHorizontal: 18, paddingVertical: 8,
          opacity: xpOpacity,
          transform: [{ translateY: xpTranslateY }],
        }}>
          <XpGainBadge
            amount={xpToastAmount}
            visible={xpToastVisible}
            noInnerAnimation
            style={{ color: isLightTheme ? '#FFF3C4' : '#000', fontSize: 16, fontWeight: '800' }}
          />
        </Animated.View>
      )}

      {/* ── Top card area ── */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, justifyContent: 'space-between' }}>

        {/* Progress counter */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: sx.muted, fontSize: f.label }}>
            {triLang(lang, {
              ru: `${learnedCnt} / ${verbs.length} выучено`,
              uk: `${learnedCnt} / ${verbs.length} вивчено`,
              es: `${learnedCnt} / ${verbs.length} aprendidos`,
              'pt-BR': `${learnedCnt} / ${verbs.length} aprendidos`,
              vi: `${learnedCnt} / ${verbs.length} đã học`,
              id: `${learnedCnt} / ${verbs.length} dipelajari`,
              tr: `${learnedCnt} / ${verbs.length} öğrenildi`,
              pl: `${learnedCnt} / ${verbs.length} opanowano`,
            })}
          </Text>
        </View>

        {/* Card */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          {/* Form badge */}
          <View style={{ backgroundColor: meta.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 0, borderColor: meta.color + '60' }}>
            <Text style={{ color: meta.color, fontSize: f.label, fontWeight: '700', letterSpacing: 0.4 }}>{meta.label}</Text>
          </View>

          {/* Режим/подсказка: «сначала попробуй вспомнить» (retrieval-first) или «впиши форму» (recall) */}
          {phase === 'answering' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons
                name={recallActive ? 'create-outline' : 'bulb-outline'}
                size={13}
                color={sx.ghost}
              />
              <Text style={{ color: sx.ghost, fontSize: f.label, fontWeight: '600' }}>
                {recallActive
                  ? triLang(lang, { ru: 'Собери форму из букв', uk: 'Збери форму з літер', es: 'Forma la palabra con letras', 'pt-BR': 'Monte a forma com letras', vi: 'Ghép dạng từ các chữ cái', id: 'Susun bentuk dari huruf', tr: 'Harflerden formu oluştur', pl: 'Ułóż formę z liter' })
                  : triLang(lang, { ru: 'Сначала попробуй вспомнить', uk: 'Спершу спробуй пригадати', es: 'Primero intenta recordar', 'pt-BR': 'Primeiro tente lembrar', vi: 'Trước tiên hãy thử nhớ lại', id: 'Coba ingat dulu', tr: 'Önce hatırlamaya çalış', pl: 'Najpierw spróbuj przypomnieć' })}
              </Text>
            </View>
          )}

          {/* Translation */}
          <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center' }}>
            {irregularVerbTranslation(verb, lang)}
          </Text>

          {/* Chain with blank */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {chainForms.map((cf, i) => (
              <React.Fragment key={cf.key}>
                {i > 0 && <Text style={{ color: sx.ghost, fontSize: f.bodyLg }}>→</Text>}
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
                  <Text style={{ color: sx.second, fontSize: f.h2, fontWeight: '400' }}>{cf.value}</Text>
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Русские подписи-времена под формами (base→past→pp) + пример будущего */}
          {(() => {
            const tc = verbTenseCaptions(lang);
            const tenseByKey: Record<FormKey, string> = {
              base: tc.present,
              past: tc.pastT,
              pp: tc.participle,
            };
            return (
              <View style={{ alignItems: 'center', gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {chainForms.map((cf, i) => (
                    <React.Fragment key={`cap-${cf.key}`}>
                      {i > 0 && <Text style={{ color: 'transparent', fontSize: f.label }}>→</Text>}
                      <Text style={{ color: sx.ghost, fontSize: f.label, minWidth: 60, textAlign: 'center' }}>
                        {tenseByKey[cf.key]}
                      </Text>
                    </React.Fragment>
                  ))}
                </View>
                <Text style={{ color: sx.ghost, fontSize: f.label }}>{tc.future(verb.base)}</Text>
              </View>
            );
          })()}

          {/* Step dots — aligned to visual chain order (base→past→pp) */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {chainForms.map((cf, i) => {
              const isDone = (FORM_SEQ.slice(0, step) as readonly string[]).includes(cf.key);
              return (
                <View key={i} style={{
                  width: cf.isTarget ? 20 : 8, height: 8, borderRadius: 4,
                  backgroundColor: isDone ? t.correct : cf.isTarget ? meta.color : sx.ghost,
                }} />
              );
            })}
          </View>
        </View>
      </View>

      {/* ── Bottom: либо сборка из букв (recall), либо 4 кнопки (recognition) ── */}
      <View style={{
        paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12,
        gap: 10,
        borderTopWidth: 0.5, borderTopColor: t.border,
        backgroundColor: t.bgPrimary,
      }}>
        {recallActive ? (
          <VerbLetterBank
            key={`${verb?.base}_${activeForm}_${letterBankKey}`}
            target={correctAnswer}
            acceptedForms={activeAcceptedForms}
            disabled={phase !== 'answering'}
            onSubmit={handleRecallSubmit}
            resetKey={`${verb?.base}_${activeForm}_${letterBankKey}`}
          />
        ) : (
        [displayOptions.slice(0, 2), displayOptions.slice(2, 4)].map((row, rowIdx) => (
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
                  onPress={() => { handleTap(word, idx); }}
                  activeOpacity={0.75}
                  style={{
                    flex: 1, paddingVertical: 16, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: bg, borderWidth: 0, borderColor: border,
                  }}
                >
                  <Text style={{ color, fontSize: f.bodyLg, fontWeight: '700', textAlign: 'center' }} numberOfLines={2} maxFontSizeMultiplier={1.2}>
                    {word}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))
        )}
      </View>

      {verb && (
        <ReportErrorButton
          screen="lesson_irregular_verbs"
          dataId={`irregular_verb_${verb.base}`}
          dataText={[
            triLang(lang, {
              ru: `Глагол: ${verb.base} / ${verb.past} / ${verb.pp}`,
              uk: `Дієслово: ${verb.base} / ${verb.past} / ${verb.pp}`,
              es: `Verbo: ${verb.base} / ${verb.past} / ${verb.pp}`,
              'pt-BR': `Verbo: ${verb.base} / ${verb.past} / ${verb.pp}`,
              vi: `Động từ: ${verb.base} / ${verb.past} / ${verb.pp}`,
              id: `Kata kerja: ${verb.base} / ${verb.past} / ${verb.pp}`,
              tr: `Fiil: ${verb.base} / ${verb.past} / ${verb.pp}`,
              pl: `Czasownik: ${verb.base} / ${verb.past} / ${verb.pp}`,
            }),
            triLang(lang, {
              ru: `Целевая форма: ${form}`,
              uk: `Цільова форма: ${form}`,
              es: `Forma objetivo: ${form}`,
              'pt-BR': `Forma alvo: ${form}`,
              vi: `Dạng mục tiêu: ${form}`,
              id: `Bentuk target: ${form}`,
              tr: `Hedef biçim: ${form}`,
              pl: `Forma docelowa: ${form}`,
            }),
            triLang(lang, {
              ru: `Варианты: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              uk: `Варіанти: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              es: `Opciones: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              'pt-BR': `Opções: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              vi: `Lựa chọn: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              id: `Pilihan: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              tr: `Seçenekler: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              pl: `Opcje: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
            }),
          ].join('\n')}
          style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 4 }}
          textColor={sx.muted}
        />
      )}

      {/* [FeedbackKit] Мини-победа «Глагол освоен» — поверх экрана тренировки,
          формы base–past–part, уходит сама/по тапу. Монтируется только на показ. */}
      <VictoryBurst
        visible={learnedBurst !== null}
        title={verbLearnedDoneTitle(lang)}
        subtitle={learnedBurst ? verbFormsSubtitle(learnedBurst.base, learnedBurst.past, learnedBurst.pp) : undefined}
        heroIcon="flash"
        celebrateSound="medal"
        autoHideMs={1600}
        onDone={() => setLearnedBurst(null)}
      />
    </View>
  );
}

// ── Dictionary Tab ────────────────────────────────────────────────────────────
const COL = { base: 130, past: 110, pp: 130, tr: 260, save: 40 };
const TABLE_W = COL.base + COL.past + COL.pp + COL.tr + COL.save + 32;

function IrregVerbsScrollTable({ t, f, lang, allVerbs, globalCounts, lessonId }: {
  t: any; f: any; lang: Lang;
  allVerbs: IrregularVerb[];
  globalCounts: Record<string, number>;
  lessonId?: number;
}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const { themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [containerW, setContainerW] = useState(0);
  const sv = stringsForLang(lang).verbs;
  const canScroll = containerW > 0 && TABLE_W > containerW;
  const thumbW = canScroll ? Math.max(40, (containerW / TABLE_W) * (containerW - 32)) : 0;
  const trackW = containerW - 32;
  const thumbTranslate = canScroll
    ? scrollX.interpolate({ inputRange: [0, TABLE_W - containerW], outputRange: [0, trackW - thumbW], extrapolate: 'clamp' })
    : new Animated.Value(0);

  return (
    <View onLayout={e => setContainerW(e.nativeEvent.layout.width)} style={{ position:'relative' }}>
      <Animated.ScrollView
        horizontal
        decelerationRate="normal"
        nestedScrollEnabled
        showsHorizontalScrollIndicator={true}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        <View style={{ minWidth: TABLE_W }}>
          <View style={{ flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: t.border }}>
            <Text style={{ width: COL.base, color: sx.muted, fontSize: f.label, fontWeight: '600' }}>{sv.base}</Text>
            <Text style={{ width: COL.past, color: sx.muted, fontSize: f.label, fontWeight: '600' }}>{sv.past}</Text>
            <Text style={{ width: COL.pp,   color: sx.muted, fontSize: f.label, fontWeight: '600' }}>{sv.pp}</Text>
            <Text style={{ width: COL.tr,   color: sx.muted, fontSize: f.label, fontWeight: '600' }}>{sv.tr}</Text>
            <View style={{ width: COL.save }} />
          </View>
          {allVerbs.map(verb => {
            const count = globalCounts[verb.base] ?? 0;
            const learned = count >= REQUIRED;
            const tc = verbTenseCaptions(lang);
            return (
              <View
                key={verb.base}
                style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: t.border }}
              >
                <TouchableOpacity
                  onPress={() => speakAudio(verb.base, undefined, { language: 'en-US' })}
                  activeOpacity={0.6}
                  style={{ width: COL.base }}
                >
                  <Text style={{ color: learned ? sx.second : sx.primary, fontSize: f.body, fontWeight: '600', flexShrink: 0 }}>{verb.base}</Text>
                  <Text style={{ color: sx.ghost, fontSize: f.label, flexShrink: 0, marginTop: 1 }}>{tc.present}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => speakAudio(verb.past, undefined, { language: 'en-US' })}
                  activeOpacity={0.6}
                  style={{ width: COL.past }}
                >
                  <Text style={{ color: sx.second, fontSize: f.body, flexShrink: 0 }}>{verb.past}</Text>
                  <Text style={{ color: sx.ghost, fontSize: f.label, flexShrink: 0, marginTop: 1 }}>{tc.pastT}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => speakAudio(verb.pp, undefined, { language: 'en-US' })}
                  activeOpacity={0.6}
                  style={{ width: COL.pp }}
                >
                  <Text style={{ color: sx.second, fontSize: f.body, flexShrink: 0 }}>{verb.pp}</Text>
                  <Text style={{ color: sx.ghost, fontSize: f.label, flexShrink: 0, marginTop: 1 }}>{tc.participle}</Text>
                </TouchableOpacity>
                <View style={{ width: COL.tr }}>
                  <Text style={{ color: sx.muted, fontSize: f.sub, flexShrink: 0 }}>{irregularVerbTranslation(verb, lang)}</Text>
                  <Text style={{ color: sx.ghost, fontSize: f.label, flexShrink: 0, marginTop: 2 }}>{tc.future(verb.base)}</Text>
                </View>
                <View style={{ width: COL.save, alignItems: 'center', justifyContent: 'center' }}>
                  <AddToFlashcard
                    en={`${verb.base} / ${verb.past} / ${verb.pp}`}
                    ru={verb.ru}
                    uk={verb.uk}
                    source="verb"
                    size={18}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </Animated.ScrollView>

      {/* Кастомный индикатор горизонтального скролла */}
      {canScroll && (
        <View style={{ height: 4, marginTop: 4, marginHorizontal: 16, backgroundColor: sx.ghost, borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View style={{ height: 4, width: thumbW, borderRadius: 2, backgroundColor: '#4A90E2', transform: [{ translateX: thumbTranslate }] }} />
        </View>
      )}

      <ReportErrorButton
        screen="lesson_irregular_verbs"
        dataId={`irregular_verbs_list_lesson_${lessonId ?? 0}`}
        dataText={triLang(lang, {
          ru: `Список неправильных глаголов урока ${lessonId ?? ''}`,
          uk: `Список неправильних дієслів уроку ${lessonId ?? ''}`,
          es: `Lista de verbos irregulares de la lección ${lessonId ?? ''}`,
          'pt-BR': `Lista de verbos irregulares da lição ${lessonId ?? ''}`,
          vi: `Danh sách động từ bất quy tắc của bài ${lessonId ?? ''}`,
          id: `Daftar irregular verbs pelajaran ${lessonId ?? ''}`,
          tr: `${lessonId ?? ''}. dersin düzensiz fiil listesi`,
          pl: `Lista czasowników nieregularnych z lekcji ${lessonId ?? ''}`,
        })}
        style={{ alignSelf: 'flex-end', marginHorizontal: 16, marginTop: 8 }}
        textColor={sx.muted}
      />

    </View>
  );
}

function DictTab({ allVerbs, globalCounts, lang, lessonId, onStartLearn }: {
  allVerbs: IrregularVerb[];
  globalCounts: Record<string, number>;
  lang: Lang;
  lessonId?: number;
  onStartLearn: () => void;
}) {
  const { theme: t, f } = useTheme();
  const pack = stringsForLang(lang);
  return (
    <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ paddingBottom: 30 }}>
      <TouchableOpacity
        onPress={onStartLearn}
        style={{ margin: 16, marginBottom: 12, backgroundColor: t.bgCard, borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
      >
        <Ionicons name="pencil-outline" size={18} color={t.textSecond} />
        <Text style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '600' }}>
          {pack.words.listStartTraining}
        </Text>
      </TouchableOpacity>

      <IrregVerbsScrollTable t={t} f={f} lang={lang} allVerbs={allVerbs} globalCounts={globalCounts} lessonId={lessonId} />
    </BouncyScrollView>
  );
}

function FrenchIrregularVerbsUnavailable({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const copy = frenchVocabularyGateCopy('irregular_verbs', lang);

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 }}>
      <View style={{ alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: t.bgCard, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="shield-checkmark-outline" size={34} color={sx.second} />
      </View>
      <Text style={{ color: sx.primary, fontSize: f.h1, fontWeight: '800', textAlign: 'center' }}>
        {copy.title}
      </Text>
      <Text style={{ color: sx.muted, fontSize: f.bodyLg, lineHeight: 24, textAlign: 'center' }}>
        {copy.body}
      </Text>
      <TouchableOpacity
        testID="lesson-irregular-verbs-french-source-gate-back"
        onPress={onBack}
        activeOpacity={0.82}
        style={{ marginTop: 8, alignSelf: 'center', backgroundColor: sx.second, borderRadius: 14, paddingHorizontal: 26, paddingVertical: 13 }}
      >
        <Text style={{ color: monoIcon(themeMode, '#06111f', MONO_ICON.onLight), fontSize: f.bodyLg, fontWeight: '800' }}>
          {copy.action}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function LessonIrregularVerbs() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const rootPack = stringsForLang(lang);
  const { energy, isUnlimited: energyUnlimited } = useEnergy();
  const canTrain = energyUnlimited || energy > 0;
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = parseInt(id || '1', 10);
  useEffect(() => {
    let cancelled = false;
    void shouldBlockLessonAccess(lessonId, studyTarget).then(blocked => {
      if (!cancelled && blocked) void openLessonGateByRuntime(router, lessonId, studyTarget);
    });
    return () => { cancelled = true; };
  }, [lessonId, router, studyTarget]);
  const frenchIrregularBlocked = !vocabularyContentAvailableForTarget(studyTarget, 'irregular_verbs');
  const irregularStorageKey = irregularVerbsGlobalKey(studyTarget);
  const allVerbs = frenchIrregularBlocked ? [] : (IRREGULAR_VERBS_BY_LESSON[lessonId] || []);
  const allVerbsFlat: IrregularVerb[] = frenchIrregularBlocked ? [] : Object.values(IRREGULAR_VERBS_BY_LESSON).flat();

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);
  useEffect(() => {
    if (energyUnlimited || energy > 0) setNoEnergyModalOpen(false);
  }, [energyUnlimited, energy]);

  /** null = по умолчанию «Словарь»; при 0 энергии нельзя остаться в «Учить» */
  const [userTab, setUserTab] = useState<null | 'dict' | 'learn'>(null);
  const tab: 'dict' | 'learn' = userTab !== null ? userTab : 'dict';
  const [globalCounts, setGlobalCounts] = useState<Record<string, number>>({});
  const [srsMap, setSrsMap] = useState<VerbSrsMap>({});
  const [practiceAll, setPracticeAll] = useState(false);
  const [learnTabKey, setLearnTabKey] = useState(0);
  // Карта SRS грузится асинхронно; до неё activePortion пуст просто из-за отсутствия
  // данных, и решать «учить нечего» нельзя — иначе повтор включится по ложной причине.

  useEffect(() => {
    if (!canTrain) {
      setUserTab(null);
      setPracticeAll(false);
    }
  }, [canTrain]);

  useLayoutEffect(() => {
    setUserTab(null);
    setPracticeAll(false);
  }, [lessonId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let counts: Record<string, number> = {};
      try {
        const raw = await AsyncStorage.getItem(irregularStorageKey);
        counts = raw ? JSON.parse(raw) : {};
      } catch { counts = {}; }
      if (cancelled) return;
      setGlobalCounts(counts);
      // SRS: грузим карту; если пусто, но есть старый count-прогресс — мягко мигрируем.
      let map = await loadVerbSrs(studyTarget);
      if (Object.keys(map).length === 0 && Object.keys(counts).length > 0) {
        map = await seedSrsFromLegacyCounts(counts, studyTarget);
      }
      if (!cancelled) setSrsMap(map);
    })();
    return () => { cancelled = true; };
  }, [irregularStorageKey, studyTarget]);

  // Порции: большие уроки учим волнами по ~6. Берём первую незавершённую порцию.
  const portions = useMemo(() => portionsForVerbs(allVerbs), [allVerbs]);
  // SRS-сводка по всему уроку: что повторять/учить сегодня.
  const lessonSummary = useMemo(
    () => summarizeVerbSrs(allVerbs.map(v => v.base), srsMap),
    [allVerbs, srsMap],
  );
  const dueBaseSet = useMemo(() => new Set(lessonSummary.dueBases.map(b => b.toLowerCase())), [lessonSummary]);

  // Первая порция, в которой есть глаголы «на сегодня» (новые или пора повторить).
  const activePortion = useMemo(() => {
    for (const portion of portions) {
      const due = portion.filter(v => dueBaseSet.has(v.base.toLowerCase()));
      if (due.length > 0) return due;
    }
    return [];
  }, [portions, dueBaseSet]);

  // В режиме practiceAll тренируем все глаголы урока (прогресс/SRS как обычно).
  const verbsForLearnTab = practiceAll ? allVerbs : activePortion;
  const title = triLang(lang, {
    ru: 'Неправильные глаголы',
    uk: 'Неправильні дієслова',
    es: rootPack.lessonMenu.verbs,
    'pt-BR': 'Verbos irregulares',
    vi: 'Động từ bất quy tắc',
    id: 'Irregular verbs',
    tr: 'Düzensiz fiiller',
    pl: 'Czasowniki nieregularne',
  });

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: sx.ghost }}>
            <TapScale onPress={() => { fk.tap(); Keyboard.dismiss(); safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any); }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TapScale>
            {/* зачем: убран авто-сжимающий пропс шрифта (запрещённый паттерн, контракт layout
                stability) — статично уменьшаем кегль до f.h3 (как в остальных хедерах проекта),
                длинные названия уроков (напр. "Неправильные глаголы") влезают в одну строку
                без сжатия. guard-ok */}
            <Text style={{ color: sx.primary, fontSize: f.h3, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 8 }} numberOfLines={1}>{lessonId}. {title}</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={{ flex: 1 }}>
            {frenchIrregularBlocked
              ? <FrenchIrregularVerbsUnavailable
                  lang={lang}
                  onBack={() => router.replace({ pathname: '/lesson_menu', params: { id: lessonId } } as any)}
                />
              : tab === 'learn' || practiceAll
              ? <LearnTab
                  key={learnTabKey}
                  verbs={verbsForLearnTab}
                  allVerbs={allVerbsFlat}
                  lang={lang}
                  initCounts={globalCounts}
                  initSrs={srsMap}
                  lessonId={lessonId}
                  studyTarget={studyTarget}
                  onUpdate={(base, count) => setGlobalCounts(prev => ({ ...prev, [base]: count }))}
                  onReset={() => {
                    setPracticeAll(true);
                    setLearnTabKey(k => k + 1);
                  }}
                  onNoEnergy={() => setNoEnergyModalOpen(true)}
                />
              : <DictTab
                  allVerbs={allVerbs}
                  globalCounts={globalCounts}
                  lang={lang}
                  lessonId={lessonId}
                  onStartLearn={() => {
                    if (!canTrain) {
                      setNoEnergyModalOpen(true);
                      return;
                    }
                    setUserTab('learn');
                  }}
                />
            }
          </View>

          {/* Tab bar — Словарь first, Учить second */}
          {!frenchIrregularBlocked && (
          <View style={{ flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: sx.ghost }}>
            {(['dict', 'learn'] as const).map(key => {
              const isActive = tab === key;
              const label = key === 'dict'
                ? triLang(lang, {
                    ru: 'Словарь',
                    uk: 'Словник',
                    es: rootPack.lessonMenu.vocab,
                    'pt-BR': 'Vocabulário',
                    vi: 'Từ vựng',
                    id: 'Kosakata',
                    tr: 'Sözlük',
                    pl: 'Słownik',
                  })
                : triLang(lang, {
                    ru: 'Учить',
                    uk: 'Учити',
                    es: rootPack.words.training,
                    'pt-BR': 'Aprender',
                    vi: 'Học',
                    id: 'Belajar',
                    tr: 'Öğren',
                    pl: 'Ucz się',
                  });
              const icon: any = key === 'dict'
                ? (isActive ? 'list' : 'list-outline')
                : (isActive ? 'flash' : 'flash-outline');
              return (
                <TouchableOpacity key={key}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8, borderTopWidth: isActive ? 2 : 0, borderTopColor: sx.second }}
                  onPress={() => {
                    Keyboard.dismiss();
                    if (key === 'learn') {
                      if (!canTrain) {
                        setNoEnergyModalOpen(true);
                        return;
                      }
                    }
                    setUserTab(key);
                    if (key === 'dict') setPracticeAll(false);
                  }}
                >
                  <Ionicons name={icon} size={20} color={isActive ? sx.primary : sx.ghost} />
                  <Text style={{ color: isActive ? sx.primary : sx.ghost, fontSize: f.body, fontWeight: '500' }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          )}
        </ContentWrap>

        <NoEnergyModal visible={noEnergyModalOpen} onClose={() => setNoEnergyModalOpen(false)} />
      </SafeAreaView>
    </ScreenGradient>
  );
}
