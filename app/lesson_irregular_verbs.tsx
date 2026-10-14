import KitProgressFill from '../components/KitProgressFill';
import { isAttemptsStopEffect } from './session_attempts/session_attempts_stop';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Animated,
  InteractionManager,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import ContentWrap from '../components/ContentWrap';
import { stringsForLang, useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import { triLang, type Lang } from '../constants/i18n';
import type { ThemeMode } from '../constants/theme';
import { useTheme } from '../components/ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { PracticeBackButton, PracticeHeaderTitle } from '../components/practice/PracticeChrome';
import { PracticeCta, PracticeProgressRow, PracticeQuestionCard } from '../components/practice/PracticeStates';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import { useFirstQuestionEnergyGate } from '../hooks/useFirstQuestionEnergyGate';
import { canChargePreparedTrainingEntry } from './energy_contract';
import NoEnergyModal from '../components/NoEnergyModal';
import { useAudio } from '../hooks/use-audio';
import fk from './feedback/feedback_kit';
import VictoryBurst from '../components/feedback/VictoryBurst';
import V2DoneScreen, { type V2DoneError } from '../components/completion/V2DoneScreen';
import { pluralWord } from '../constants/plural';
import { verbLearnedDoneTitle, verbFormsSubtitle } from './feedback/feedback_i18n';
import { MOTION_SCALE } from '../constants/motion';
import { loadSettings } from './settings_edu';
import { IRREGULAR_VERBS_BY_LESSON, IrregularVerb, acceptedFormsFor, portionsForVerbs } from './irregular_verbs_data';
import { buildIrregularVerbOptions, ensureCompleteIrregularVerbOptions } from './irregular_verb_options';
import { irregularVerbPortionProgress } from './irregular_verb_portion_progress';
import VerbLetterBank from '../components/VerbLetterBank';
import { safeRouterBack } from './navigation_back';
import ReportErrorButton from '../components/ReportErrorButton';
import BouncyScrollView from '../components/BouncyScrollView';
import AddToFlashcard from '../components/AddToFlashcard';
import { captureCurrentAccountObjectiveAttempt } from './mistake_practice_capture';
import { normalizeMistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { withLessonRuntimeAccessBoundary } from './lesson_runtime_access_boundary';
import { irregularVerbsGlobalKey, type RuntimeStudyTarget } from './target_storage_keys';
import {
  frenchVocabularyGateCopy,
  vocabularyContentAvailableForTarget,
} from './vocabulary_target_gate';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import PracticeRuneCounter from '../components/PracticeRuneCounter';
import AnimatedCountUpText from '../components/AnimatedCountUpText';
import CoinRewardFlight from '../components/rewards/CoinRewardFlight';
import { nestedBoxShadow, plateBoxShadow } from '../components/v2/ShadowSurface';
import { usePracticeRunes } from '../hooks/usePracticeRunes';
import { useCoinRewardFlight } from '../hooks/useCoinRewardFlight';
import { readDevPracticeRunesFakeState } from './dev_practice_runes_seed';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';
import { captureAccountGeneration } from './account_generation';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { SESSION_ATTEMPTS_MOTION } from '../constants/motionHybrid';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export { IRREGULAR_VERB_COUNT_BY_LESSON, LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';

const REQUIRED = 3;
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
    base: { label: `V1 · ${sv.base}`, color: '#4CAF50', bg: 'rgba(76,175,80,0.14)' }, // theme-exempt: неправильные глаголы: цвета форм V1/V2/V3 — смысловая палитра
    past: { label: `V2 · ${sv.past}`, color: '#4A9EFF', bg: 'rgba(74,158,255,0.14)' }, // theme-exempt: неправильные глаголы: цвета форм V1/V2/V3 — смысловая палитра
    pp:   { label: `V3 · ${sv.pp}`, color: '#C084FC', bg: 'rgba(192,132,252,0.14)' }, // theme-exempt: неправильные глаголы: цвета форм V1/V2/V3 — смысловая палитра
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
  // зачем: единый переводчик проекта вместо if-лестницы (сторож i18n +
  // недостающие 5 языков раньше молча откатывались на русский).
  const present = triLang(lang, { ru: 'настоящее', uk: 'теперішнє', en: 'present', es: 'presente', 'pt-BR': 'presente', vi: 'hiện tại', id: 'sekarang', tr: 'şimdiki', pl: 'teraźniejszy' });
  const pastT = triLang(lang, { ru: 'прошлое', uk: 'минуле', en: 'past', es: 'pasado', 'pt-BR': 'passado', vi: 'quá khứ', id: 'lampau', tr: 'geçmiş', pl: 'przeszły' });
  const participle = triLang(lang, { ru: 'причастие', uk: 'дієприкметник', en: 'participle', es: 'participio', 'pt-BR': 'particípio', vi: 'phân từ', id: 'partisip', tr: 'ortaç', pl: 'imiesłów' });
  const futureWord = triLang(lang, { ru: 'будущее', uk: 'майбутнє', en: 'future', es: 'futuro', 'pt-BR': 'futuro', vi: 'tương lai', id: 'masa depan', tr: 'gelecek', pl: 'przyszły' });
  return {
    present,
    pastT,
    participle,
    future: (base) => `${futureWord}: will ${base}`,
  };
}

function initialOptionsForFirstStep(verbs: IrregularVerb[], allVerbs: IrregularVerb[]): string[] {
  if (verbs.length === 0) return [];
  const v0 = verbs[0];
  const correct = v0.past;
  return buildIrregularVerbOptions(correct, v0, allVerbs, 'past');
}

function LearnTab({ verbs, lessonVerbs, allVerbs, lang, initCounts, onUpdate, onReset, lessonId, onNoEnergy, onCancelStart, studyTarget, practiceRunCompletionOrdinal, devFakeStartRunes, devFakeStartPoints, devJumpToFinale }: {
  verbs: IrregularVerb[];
  lessonVerbs: IrregularVerb[];
  allVerbs: IrregularVerb[];
  lang: Lang;
  initCounts: Record<string, number>;
  onUpdate: (base: string, count: number) => void;
  onReset: () => void;
  lessonId?: number;
  onNoEnergy: () => void;
  onCancelStart: () => void;
  studyTarget?: RuntimeStudyTarget;
  /** Порядковый номер прохождения — растёт с каждым «Начать заново» у вызывающего. */
  practiceRunCompletionOrdinal: number;
  devFakeStartRunes?: number;
  devFakeStartPoints?: number;
  devJumpToFinale?: boolean;
}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  // зачем (реестр energy-modes-010, вердикты Макетов 7c831a193; координатор 13.10): образец energy-modes-states `verbs` — плашка идёт сразу под полосой (`.gqc` margin-top 20), варианты через 100 (`.g4`), а не по центру свободного места.
  // На экранах от 800 dp встаём по образцу; ниже — прежняя раскладка по центру (иначе четыре варианта и переключатель не помещаются).
  const { height: verbsWindowH } = useWindowDimensions();
  const verbsRoomy = verbsWindowH >= 800;
  const { theme: t, f, themeMode, liquidGlassThemeId } = useTheme();
  // зачем (владелец 2026-09-30): «Неправильные глаголы» 1:1 по макету learn.html (H1–H5, Liquid Glass); только вид.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const router = useRouter();
  const [attemptSessionId] = useState(makeFeedbackAttemptId);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  const attempts = useSessionAttempts({
    token: accountToken,
    // зачем (владелец 2026-09-15): attemptSessionId здесь делал ключ уникальным
    // при каждом входе, и сохранённые сердечки переставали находиться — экран
    // всегда начинал с 3/3. Ключ стабилен по занятию, как в lesson1.tsx.
    sessionId: `irregular-verbs:${studyTarget ?? 'en'}:${lessonId ?? 0}`,
    initialQuestionId: 'irregular-verbs:loading',
  });
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const answerAttemptSequenceRef = useRef(0);
  const attemptsModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (attemptsModalTimerRef.current) clearTimeout(attemptsModalTimerRef.current);
  }, []);
  const pack = stringsForLang(lang);
  const formMeta = formRowMeta(lang, themeMode);
  const isLightTheme = false;

  const { energyReady } = useEnergy();
  const verbsEnergyIntent = useEnergySessionIntent(
    'irregular_verbs',
    `${studyTarget ?? 'en'}:${lessonId ?? 0}`,
    attemptSessionId,
  );

  const onNoEnergyRef = useRef(onNoEnergy);
  useEffect(() => { onNoEnergyRef.current = onNoEnergy; }, [onNoEnergy]);
  const onCancelStartRef = useRef(onCancelStart);
  useEffect(() => { onCancelStartRef.current = onCancelStart; }, [onCancelStart]);

  // Старт тренировки неправильных глаголов = 1 ⚡ только при готовых упражнениях.
  // зачем: D72/D87/PM-084 — единый гейт первого вопроса: −1 один раз на попытку,
  // уход до показа первого задания → возврат.
  // зачем (D159, владелец 04.10): энергия окончательно списывается после ПЕРВОГО ОТВЕТА; вышел без ответа — возврат;
  // повторный вход в тот же раздел урока в течение 10 мин — бесплатно.
  const verbsEnergyGate = useFirstQuestionEnergyGate({
    intent: verbsEnergyIntent,
    screen: 'irregular_verbs',
    finalizeOn: 'first_answer',
    firstQuestionVisible: canChargePreparedTrainingEntry({ energyReady, hasPlayableItems: verbs.length > 0 }),
    onInsufficient: () => onNoEnergyRef.current(),
    onCancelled: () => onCancelStartRef.current(),
  });

  const [portionVerbs, setPortionVerbs] = useState<IrregularVerb[]>(() => [...verbs]);
  const [queue, setQueue] = useState<IrregularVerb[]>(() => [...verbs]);
  const [pos, setPos] = useState(0);
  // step: 0=ask past, 1=ask pp, 2=ask base (mirrors original FORM_SEQ order)
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({ ...initCounts });
  const sectionProgress = useMemo(() => irregularVerbPortionProgress(lessonVerbs, counts), [lessonVerbs, counts]);
  const hasNextPortion = !devJumpToFinale && sectionProgress.next.length > 0;
  const [learnedCnt, setLearnedCnt] = useState(0);
  // зачем (владелец, 2026-08-27): dev-режим «Проверка рун» подменяет и очки.
  const [totalPts, setTotalPts] = useState(devFakeStartPoints ?? 0);
  // зачем (владелец, 2026-08-27): «Начать заново» меняет learnTabKey, из-за
  // чего React ПЕРЕМОНТИРУЕТ этот компонент целиком (см. key={learnTabKey} у
  // вызывающего) — обычной гидратации хука при монтировании достаточно,
  // startNewCompletion() не нужен, в отличие от словаря, где финиш встроен в
  // тот же неперемонтируемый компонент.
  // зачем (аудит 2026-08-28): объявлен ВЫШЕ allDone/эффекта settle() ниже —
  // эффект читает practiceRunes.hydrating в deps, порядок объявления важен.
  const practiceRunes = usePracticeRunes({
    activity: 'irregular_verbs',
    // зачем: irregularVerbsGlobalKey — чистая функция от studyTarget (пропа),
    // не от переменной ниже — inline вместо ссылки на useMemo, объявленный
    // позже по файлу (порядок объявления здесь важен, см. комментарий выше).
    sessionKey: irregularVerbsGlobalKey(studyTarget),
    completionOrdinal: practiceRunCompletionOrdinal,
    // зачем (владелец, 2026-08-27): «Проверка рун» из DEV-хаба — настоящий
    // экран со случайным стартовым счётчиком. Параметр читает родитель.
    devFakeStartRunes,
  });
  const runeFlight = useCoinRewardFlight();
  // зачем (владелец, 2026-08-27): DEV-хаб открывает СРАЗУ экран завершения.
  const [allDone, setAllDone] = useState(devJumpToFinale || verbs.length === 0);
  const settlementPromiseRef = useRef<Promise<void> | null>(null);
  const continuationInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const [continuing, setContinuing] = useState(false);
  const [continuationFailed, setContinuationFailed] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const settlePortion = useCallback(() => {
    if (settlementPromiseRef.current) return settlementPromiseRef.current;
    const pending = practiceRunes.settle().finally(() => {
      if (settlementPromiseRef.current === pending) settlementPromiseRef.current = null;
    });
    settlementPromiseRef.current = pending;
    return pending;
  }, [practiceRunes.settle]);
  // зачем (владелец, 2026-08-27): «руны засчитываются, когда игрок дошёл до
  // экрана празднования» — здесь это переход allDone false→true.
  useEffect(() => {
    // зачем (аудит 2026-08-28): earningsRef ещё null до конца гидратации —
    // settle() тогда тихо выходит и копилка не зачитывается никогда (DEV-хаб
    // ставит allDone=true синхронно на первом рендере, раньше гидратации).
    if (allDone && !practiceRunes.hydrating) void settlePortion().catch(() => {
      if (mountedRef.current) setContinuationFailed(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, practiceRunes.hydrating, settlePortion]);
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
  // Счётчик ошибок на глагол для тренера (порог: 2 ошибки → активация)
  const irregularStorageKey = useMemo(() => irregularVerbsGlobalKey(studyTarget), [studyTarget]);
  // Уже знакомые глаголы тренируем воспроизведением; новые — узнаванием.
  const isRecallVerb = useCallback((base: string): boolean => {
    return (initCounts[base] ?? 0) >= 2;
  }, [initCounts]);
  const [letterBankKey, setLetterBankKey] = useState(0);

  const locked = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
    loadSettings().then(s => { setVoiceOut(s.voiceOut); setSpeechRate(s.speechRate); });
  }, []);

  // зачем: D140 (владелец 2026-10-01) — коллекции («Сокровищница») удалены целиком:
  // дропа карточки за закрытый раздел больше нет.

  const buildStep = useCallback((verb: IrregularVerb, stepIdx: number) => {
    const form = FORM_SEQ[stepIdx];
    const correct = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;
    setOptions(buildIrregularVerbOptions(correct, verb, allVerbs, form));
    setBtnStates(['idle', 'idle', 'idle', 'idle']);
    setPhase('answering');
    locked.current = false;
  }, [allVerbs]);

  // зачем (макет итога глаголов): «верно / ошибок / точность» и ошибки «было → верно» за порцию.
  const runCorrectRef = useRef(0);
  const runWrongRef = useRef(0);
  const runErrorsRef = useRef<V2DoneError[]>([]);
  const initVerb = useCallback((verb: IrregularVerb) => {
    setStep(0);
    hadErrorThisVerb.current = false;
    // Воспроизведение из букв = «крепкий» проход.
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
      return;
    }
    setPos(curPos % curQueue.length);
    setQueue(curQueue);
    initVerb(curQueue[curPos % curQueue.length]);
  }, [initVerb, lessonId, studyTarget]);

  const continuePortion = useCallback(async (restart = false) => {
    // новая порция — новый счёт итога
    runCorrectRef.current = 0;
    runWrongRef.current = 0;
    runErrorsRef.current = [];
    if (continuationInFlightRef.current || practiceRunes.hydrating || !allDone) return;
    const next = sectionProgress.next;
    if (!restart && next.length === 0) return;
    continuationInFlightRef.current = true;
    setContinuing(true);
    setContinuationFailed(false);
    try {
      await settlePortion();
      if (!mountedRef.current) return;
      if (!practiceRunes.startNewCompletionIfSettled()) {
        setContinuationFailed(true);
        return;
      }
      if (restart) {
        onReset();
        return;
      }
      // Keep the paid entry mounted: this is the next portion, not a new session.
      setPortionVerbs([...next]);
      setQueue([...next]);
      setPos(0);
      setLearnedCnt(0);
      setTotalPts(0);
      setLearnedBurst(null);
      setAllDone(false);
      initVerb(next[0]);
    } catch (error) {
      // зачем: запрет немого catch — причина отказа перехода к следующей порции должна быть видна.
      console.warn('[VERBS-PORTION] continue:failed', error instanceof Error ? error.message : String(error));
      if (mountedRef.current) setContinuationFailed(true);
    } finally {
      continuationInFlightRef.current = false;
      if (mountedRef.current) setContinuing(false);
    }
  }, [allDone, sectionProgress.next, practiceRunes.hydrating, practiceRunes.startNewCompletionIfSettled, settlePortion, initVerb, onReset]);

  const handleTap = useCallback(async (word: string, btnIdx: number) => {
    if (locked.current || phase !== 'answering') return;
    // зачем: 10 ⚡ уже списаны за вход, внутри энергия не тратится — блокировать
    // ответы по нулю нельзя, иначе оплаченная тренировка обрывалась бы сразу.
    locked.current = true;
    verbsEnergyGate.markAnswered();

    const verb = queue[pos % Math.max(queue.length, 1)];
    if (!verb) return;
    const form = FORM_SEQ[step];
    const correct = form === 'past' ? verb.past : form === 'pp' ? verb.pp : verb.base;
    // Принимаем и варианты формы (was|were, gotten|got) как верный ответ.
    const acceptedSet = new Set(acceptedFormsFor(verb, form).map(f => f.toLowerCase()));
    const isCorrect = acceptedSet.has(word.toLowerCase());
    const attemptEffect = attempts.registerVerdict({
      answerAttemptId: [
        attemptSessionId,
        verb.base,
        form,
        String(answerAttemptSequenceRef.current++),
      ].join(':'),
      verdict: isCorrect ? 'correct' : 'pedagogical_wrong',
    });
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
      runCorrectRef.current += 1;
      // [FeedbackKit] fk.correct даёт haptic + тёплый «дин-дон».
      fk.verdict({ correct: true });
    } else {
      fk.verdict({ correct: false });
      hadErrorThisVerb.current = true;
      runWrongRef.current += 1;
      runErrorsRef.current = [...runErrorsRef.current, { label: verb.base, was: word, ok: correct }];

      const vKey = verb.base;
      // зачем (22.09): здесь стоял замок `studyTarget === 'en' || 'fr'` — для
      // испанского и немецкого ошибка НЕ записывалась вовсе, и «Мои ошибки»
      // для них были пусты навсегда. Журнал ключуется по языку, писать можно
      // любой язык курса.
      {
        void captureCurrentAccountObjectiveAttempt({
          attemptId: `irregular:${studyTarget}:${lessonId ?? 0}:${pos}:${step}:${vKey}:${word}`,
          studyTarget: normalizeMistakeStudyTarget(studyTarget),
          verdict: 'wrong',
          objective: true,
          content: {
            sourceKind: 'irregular_verb',
            sourceId: `${vKey}:${form}`,
            canonicalTarget: correct,
            sourceMeaning: verb.ru,
            // зачем (репорт 13.10 «Находить — found»): в «Моих ошибках» не было видно, какая форма спрашивается (прошлое/причастие/основная)
            sourcePrompt: `${irregularVerbTranslation(verb, lang)} — ${form === 'past' ? verbTenseCaptions(lang).pastT : form === 'pp' ? verbTenseCaptions(lang).participle : verbTenseCaptions(lang).present}`,
            lessonId: String(lessonId ?? 0),
            distractors: activeOptions,
          },
          facet: { kind: 'form', expected: correct },
        }).catch(noteSwallowedHandler('lesson_irregular_verbs:useCallback.captureCurrentAccountObjectiveAttempt'));
      }

      // зачем: владелец 2026-08-23 — энергия НЕ тратится за ошибки. Единственная
      // трата — 10 ⚡ при входе в тренировку глаголов (эффект старта выше).
    }

    if (isAttemptsStopEffect(attemptEffect)) {
      return; // Keep the current verb form for the automatic reset.
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
        // зачем (владелец, 2026-08-27): руна — за глагол целиком, засчитанный
        // без единой ошибки по всем трём формам. Ошибка на любой форме — руны
        // не будет за этот проход глагола, ровно как и медаль/legacy reward ниже.
        if (noErrors) {
          const awarded = practiceRunes.onCorrectAnswer(verb.base);
          if (awarded > 0) runeFlight.fly(awarded);
        }
        if (noErrors) {
          // Correct — mark as learned
          // [FeedbackKit] Мини-победа «Глагол освоен» — на СУЩЕСТВУЮЩЕЕ событие
          // освоения (чистый проход всех трёх форм). Только ощущение; счёт/legacy reward ниже.
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
  }, [verbsEnergyGate, phase, queue, pos, step, options, allVerbs, counts, userName, lang, onUpdate, buildStep, goNextVerb, speakAudio, speechRate, voiceOut, irregularStorageKey, studyTarget, attempts.registerVerdict, attemptSessionId, lessonId]);

  const activeVerb = queue[pos % Math.max(queue.length, 1)];
  const activeForm = FORM_SEQ[step];
  useEffect(() => {
    if (!activeVerb) return;
    attempts.updateQuestion(`${activeVerb.base}:${activeForm}`);
  }, [activeForm, activeVerb, attempts.updateQuestion]);

  const retryCurrentVerbFormAfterSessionRuneForfeit = useCallback(() => {
    setShowAttemptsModal(false);
    setBtnStates(['idle', 'idle', 'idle', 'idle']);
    setFeedbackCorrect(true);
    setPhase('answering');
    setLetterBankKey(key => key + 1);
    locked.current = false;
  }, []);

  // зачем (2026-09-03): без hydrated автосброс молча не запускался и экран
  // намертво замирал под блокировщиком ввода после трёх ошибок.
  useSessionAttemptAutoReset({
    phase: attempts.state.phase,
    hydrated: attempts.hydrated,
    hydrationTrusted: attempts.hydrationTrusted,
    forfeitSessionRunes: practiceRunes.forfeitPendingRunes,
    restoreAttempts: attempts.restoreAfterSessionRuneForfeit,
    onRestored: retryCurrentVerbFormAfterSessionRuneForfeit,
  });

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
      {/* зачем (владелец 01.10): итог глаголов = общий экран завершения 2.0 по макету learn.html. */}
      <V2DoneScreen
        testID="irregular-verbs-complete"
        title={hasNextPortion
          ? triLang(lang, { ru: 'Порция глаголов пройдена', uk: 'Порцію дієслів пройдено', en: 'Verb batch complete', es: 'Grupo de verbos completado', 'pt-BR': 'Grupo de verbos concluído', vi: 'Đã xong nhóm động từ', id: 'Kelompok kata kerja selesai', tr: 'Fiil grubu tamamlandı', pl: 'Partia czasowników ukończona' })
          : triLang(lang, { ru: 'Все глаголы выучены', uk: 'Усі дієслова вивчено', en: 'All verbs learned', es: 'Todos los verbos aprendidos', 'pt-BR': 'Todos os verbos aprendidos', vi: 'Đã học xong mọi động từ', id: 'Semua kata kerja dipelajari', tr: 'Tüm fiiller öğrenildi', pl: 'Wszystkie czasowniki opanowane' })}
        subtitle={triLang(lang, {
          ru: `Неправильные глаголы · Урок ${lessonId ?? 0} · ${portionVerbs.length} ${pluralWord(lang, portionVerbs.length, { one: 'глагол', few: 'глагола', many: 'глаголов' })}`,
          uk: `Неправильні дієслова · Урок ${lessonId ?? 0} · ${portionVerbs.length} ${pluralWord(lang, portionVerbs.length, { one: 'дієслово', few: 'дієслова', many: 'дієслів' })}`,
          en: `Irregular verbs · Lesson ${lessonId ?? 0} · ${portionVerbs.length} verbs`,
          es: `Verbos irregulares · Lección ${lessonId ?? 0} · ${portionVerbs.length} verbos`,
          'pt-BR': `Verbos irregulares · Lição ${lessonId ?? 0} · ${portionVerbs.length} verbos`,
          vi: `Động từ bất quy tắc · Bài ${lessonId ?? 0} · ${portionVerbs.length} động từ`,
          id: `Kata kerja tak beraturan · Pelajaran ${lessonId ?? 0} · ${portionVerbs.length} kata kerja`,
          tr: `Düzensiz fiiller · Ders ${lessonId ?? 0} · ${portionVerbs.length} fiil`,
          pl: `Czasowniki nieregularne · Lekcja ${lessonId ?? 0} · ${portionVerbs.length} ${pluralWord(lang, portionVerbs.length, { one: 'czasownik', few: 'czasowniki', many: 'czasowników' })}`,
        })}
        stars={null}
        correct={runCorrectRef.current + runWrongRef.current > 0 ? runCorrectRef.current : null}
        wrong={runCorrectRef.current + runWrongRef.current > 0 ? runWrongRef.current : null}
        coinsGained={practiceRunes.runes}
        errors={runErrorsRef.current}
        feedbackSlot={continuationFailed ? (
          <Text accessibilityLiveRegion="polite" style={{ color: glass.secondary, fontSize: 13, lineHeight: 17, textAlign: 'center' }}>
            {triLang(lang, {
              ru: 'Не удалось сохранить награду. Нажми ещё раз.', uk: 'Не вдалося зберегти нагороду. Натисни ще раз.',
              en: 'Could not save the reward. Tap again.', es: 'No se pudo guardar la recompensa. Pulsa de nuevo.',
              'pt-BR': 'Não foi possível salvar a recompensa. Toque novamente.', vi: 'Chưa lưu được phần thưởng. Hãy nhấn lại.',
              id: 'Hadiah belum tersimpan. Ketuk lagi.', tr: 'Ödül kaydedilemedi. Tekrar dokunun.', pl: 'Nie udało się zapisać nagrody. Naciśnij ponownie.',
            })}
          </Text>
        ) : undefined}
        primaryLabel={hasNextPortion
          ? triLang(lang, { ru: 'Следующая порция', uk: 'Наступна порція', en: 'Next batch', es: 'Siguiente grupo', 'pt-BR': 'Próximo grupo', vi: 'Nhóm tiếp theo', id: 'Kelompok berikutnya', tr: 'Sonraki grup', pl: 'Następna partia' })
          : triLang(lang, { ru: 'К уроку', uk: 'До уроку', en: 'To the lesson', es: 'A la lección', 'pt-BR': 'Para a lição', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derse', pl: 'Do lekcji' })}
        onPrimary={() => {
          if (hasNextPortion) {
            if (continuing || practiceRunes.hydrating) return;
            void continuePortion();
            return;
          }
          safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any);
        }}
        secondaryLabel={hasNextPortion
          ? triLang(lang, { ru: 'К уроку', uk: 'До уроку', en: 'To the lesson', es: 'A la lección', 'pt-BR': 'Para a lição', vi: 'Về bài học', id: 'Ke pelajaran', tr: 'Derse', pl: 'Do lekcji' })
          : triLang(lang, { ru: 'Начать заново', uk: 'Спочатку', en: 'Start over', es: 'Desde el principio', 'pt-BR': 'Começar de novo', vi: 'Bắt đầu lại', id: 'Mulai lagi', tr: 'Baştan başla', pl: 'Od nowa' })}
        onSecondary={() => {
          if (hasNextPortion) {
            safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any);
            return;
          }
          if (continuing || practiceRunes.hydrating) return;
          void continuePortion(true);
        }}
        onClose={() => safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any)}
      />
    </>
  );

  const verb = activeVerb;
  if (!verb) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
        <View style={{ width: 61, height: 61, borderRadius: 16, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="alert-circle-outline" size={26} color={glass.text} />
        </View>
        <Text style={{ color: glass.text, fontSize: 16, lineHeight: 22, fontWeight: '600', textAlign: 'center', marginTop: 18 }}>
          {triLang(lang, {
            ru: 'Тренировка не открылась. Вернись к уроку и начни её снова.',
            uk: 'Тренування не відкрилося. Повернись до уроку і почни його знову.',
            en: "Practice didn't open. Go back to the lesson and start it again.",
            es: 'La práctica no se abrió. Vuelve a la lección y empiézala de nuevo.',
            'pt-BR': 'O treino não abriu. Volte à lição e comece de novo.',
            vi: 'Bài luyện chưa mở được. Hãy quay lại bài học và bắt đầu lại.',
            id: 'Latihan belum terbuka. Kembali ke pelajaran dan mulai lagi.',
            tr: 'Alıştırma açılmadı. Derse dön ve yeniden başla.',
            pl: 'Trening się nie otworzył. Wróć do lekcji i zacznij od nowa.',
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

  const tc = verbTenseCaptions(lang);
  const tenseByKey: Record<FormKey, string> = { base: tc.present, past: tc.pastT, pp: tc.participle };
  const feedbackTint = phase === 'feedback' ? (feedbackCorrect ? t.correct : t.wrong) : null;
  const hintText = phase === 'answering'
    ? (recallActive
      ? triLang(lang, { ru: 'Собери форму из букв', uk: 'Збери форму з літер', en: 'Build the form from letters', es: 'Forma la palabra con letras', 'pt-BR': 'Monte a forma com letras', vi: 'Ghép dạng từ các chữ cái', id: 'Susun bentuk dari huruf', tr: 'Harflerden formu oluştur', pl: 'Ułóż formę z liter' })
      : triLang(lang, { ru: 'Сначала попробуй вспомнить', uk: 'Спершу спробуй пригадати', en: 'First try to recall it', es: 'Primero intenta recordar', 'pt-BR': 'Primeiro tente lembrar', vi: 'Trước tiên hãy thử nhớ lại', id: 'Coba ingat dulu', tr: 'Önce hatırlamaya çalış', pl: 'Najpierw spróbuj przypomnieć' }))
    : ' ';

  return (
    <View style={{ flex: 1 }}>

      {/* ── Top card area ── */}
      <View style={verbsRoomy ? { paddingHorizontal: 16, paddingTop: 10 } : { flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>

        {/* Progress counter */}
        <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {triLang(lang, {
              ru: `${learnedCnt} / ${portionVerbs.length} выучено`,
              uk: `${learnedCnt} / ${portionVerbs.length} вивчено`,
              en: `${learnedCnt} / ${portionVerbs.length} learned`,
              es: `${learnedCnt} / ${portionVerbs.length} aprendidos`,
              'pt-BR': `${learnedCnt} / ${portionVerbs.length} aprendidos`,
              vi: `${learnedCnt} / ${portionVerbs.length} đã học`,
              id: `${learnedCnt} / ${portionVerbs.length} dipelajari`,
              tr: `${learnedCnt} / ${portionVerbs.length} öğrenildi`,
              pl: `${learnedCnt} / ${portionVerbs.length} opanowano`,
            })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View ref={runeFlight.counterRef} collapsable={false}>
              <PracticeRuneCounter
                runes={practiceRunes.runes}
                lang={lang}
                backgroundColor={glass.opaqueControl}
                color={glass.text}
                testID="irregular-verbs-practice-runes"
              />
            </View>
            <SessionAttemptsHud
              remaining={attempts.state.remainingAttempts} attempts={attempts}
              locale={lang}
              testID="irregular-verbs-session-attempts"
            />
          </View>
        </View>
        <PracticeProgressRow glass={glass} progress={portionVerbs.length > 0 ? learnedCnt / portionVerbs.length : 0} flush />

        {/* Card ── источник полёта рун (владелец, 2026-08-27) */}
        <View ref={runeFlight.originRef} collapsable={false} style={verbsRoomy ? { marginTop: 20 } : { flex: 1, justifyContent: 'center' }}>
          <PracticeQuestionCard glass={glass} minHeight={200} kicker={hintText} style={{ paddingBottom: 26 }}>
            {/* Translation */}
            <Text style={{ color: glass.secondary, fontSize: 22, lineHeight: 28, fontWeight: '600', textAlign: 'center', marginTop: 10 }}>
              {irregularVerbTranslation(verb, lang)}
            </Text>

            {/* Цепочка форм: подпись времени под каждой, пропуск — пунктирная ячейка (`.chain`) */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 22 }}>
              {chainForms.map((cf, i) => (
                <React.Fragment key={cf.key}>
                  {i > 0 && (
                    <View style={{ height: 48, justifyContent: 'center' }}>
                      <Ionicons name="arrow-forward" size={20} color={glass.mutedText} />
                    </View>
                  )}
                  <View style={{ alignItems: 'center' }}>
                    {cf.isTarget ? (
                      <View style={{
                        minWidth: 92, height: 48, paddingHorizontal: 12, borderRadius: 14,
                        borderWidth: 1, // shadow-ok: ячейка-пропуск `.chain .q` — пунктир / кольцо исхода ответа, не контейнер
                        borderStyle: feedbackTint ? 'solid' : 'dashed',
                        borderColor: feedbackTint ?? glass.mutedText,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ color: feedbackTint ?? glass.secondary, fontSize: 20, lineHeight: 26, fontWeight: '700' }}>
                          {phase === 'feedback' ? correctAnswer : '?'}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ height: 48, justifyContent: 'center' }}>
                        <Text style={{ color: glass.text, fontSize: 24, lineHeight: 30, fontWeight: '700' }}>{cf.value}</Text>
                      </View>
                    )}
                    <Text style={{ color: glass.mutedText, fontSize: 13, lineHeight: 17, fontWeight: '600', marginTop: 6, letterSpacing: 0.5 }}>
                      {tenseByKey[cf.key]}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </PracticeQuestionCard>
        </View>
      </View>
      {/* зачем: `.g4 { margin-top: 100px }` образца (88 + верхний отступ нижнего блока 12); на невысоком экране сжимается, но не меньше 8 */}
      {verbsRoomy ? <View style={{ height: 88, minHeight: 8, flexShrink: 1 }} /> : null}

      {/* ── Bottom: либо сборка из букв (recall), либо 4 кнопки (recognition) ── */}
      <View style={{
        paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12,
        gap: 12,
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
          <View key={rowIdx} style={{ flexDirection: 'row', gap: 12 }}>
            {row.map((word, colIdx) => {
              const idx = rowIdx * 2 + colIdx;
              const state = btnStates[idx];
              const color = state === 'correct' ? t.correct
                          : state === 'wrong'   ? t.wrong
                          : glass.text;
              const dim = phase !== 'answering' && state === 'idle';
              return (
                <Pressable
                  key={idx}
                  accessibilityRole="button"
                  accessibilityLabel={word}
                  disabled={phase !== 'answering'}
                  onPress={() => { handleTap(word, idx); }}
                  style={({ pressed }) => ({
                    flex: 1, minHeight: 56, paddingVertical: 10, paddingHorizontal: state === 'idle' ? 12 : 36, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    // зачем («Тень» 12.10): вариант `.opt` — плашка с тенью, без кромки
                    boxShadow: plateBoxShadow(glass),
                    backgroundColor: pressed ? glass.selected : glass.plateFillFrom,
                    opacity: dim ? 0.4 : 1,
                    transform: [{ scale: pressed && phase === 'answering' ? 0.98 : 1 }],
                  })}
                >
                  {state !== 'idle' && (
                    <View pointerEvents="none" style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
                      <Ionicons name={state === 'correct' ? 'checkmark' : 'close'} size={18} color={color} />
                    </View>
                  )}
                  <Text style={{ color, fontSize: 16, lineHeight: 21, fontWeight: '600', textAlign: 'center' }} maxFontSizeMultiplier={1.2}>
                    {word}
                  </Text>
                </Pressable>
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
              en: `Verb: ${verb.base} / ${verb.past} / ${verb.pp}`,
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
              en: `Target form: ${form}`,
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
              en: `Options: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              es: `Opciones: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              'pt-BR': `Opções: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              vi: `Lựa chọn: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              id: `Pilihan: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              tr: `Seçenekler: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
              pl: `Opcje: ${displayOptions.map(o=>o===correctAnswer?`[✓${o}]`:o).join(' | ')}`,
            }),
          ].join('\n')}
          style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 4 }}
          textColor={glass.secondary}
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
      {runeFlight.flight && (
        <CoinRewardFlight
          key={runeFlight.flight.key}
          from={runeFlight.flight.from}
          to={runeFlight.flight.to}
          count={runeFlight.flight.count}
          onDone={runeFlight.clearFlight}
        />
      )}
    </View>
  );
}

// ── Dictionary Tab ────────────────────────────────────────────────────────────
// зачем (владелец 2026-09-30): словарь глаголов по макету verbsDict — одна карточка-таблица
// (шапка 12px капсом, строки с тонкими разделителями), выученные приглушены; прокрутка вбок
// оставлена, чтобы длинные формы и переводы не обрезались.
const COL = { base: 104, past: 104, pp: 104, tr: 170, save: 40 };
const TABLE_W = COL.base + COL.past + COL.pp + COL.tr + COL.save + 28;

function IrregVerbsScrollTable({ glass, lang, allVerbs, globalCounts, lessonId }: {
  glass: ReturnType<typeof liquidGlassTokens>; lang: Lang;
  allVerbs: IrregularVerb[];
  globalCounts: Record<string, number>;
  lessonId?: number;
}) {
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  useEffect(() => () => { stopAudio(); }, [stopAudio]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [containerW, setContainerW] = useState(0);
  const sv = stringsForLang(lang).verbs;
  const cardW = containerW - 32;
  const canScroll = cardW > 0 && TABLE_W > cardW;
  const thumbW = canScroll ? Math.max(40, (cardW / TABLE_W) * (cardW - 32)) : 0;
  const trackW = cardW - 32;
  const thumbTranslate = canScroll
    ? scrollX.interpolate({ inputRange: [0, TABLE_W - cardW], outputRange: [0, trackW - thumbW], extrapolate: 'clamp' })
    : new Animated.Value(0);
  const headStyle = { color: glass.mutedText, fontSize: 13, lineHeight: 17, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const };

  return (
    <View onLayout={e => setContainerW(e.nativeEvent.layout.width)} style={{ position:'relative' }}>
      <View style={{
        marginHorizontal: 16, marginTop: 22, borderRadius: 20, overflow: 'hidden', paddingTop: 6,
        // зачем («Тень» 12.10): карточка-таблица — плашка с тенью без кромки; overflow hidden оставлен — клипует горизонтальную прокрутку (тень может обрезаться на iOS)
        boxShadow: plateBoxShadow(glass), backgroundColor: glass.plateFillFrom,
      }}>
      <Animated.ScrollView
        horizontal
        decelerationRate="fast"
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingHorizontal: 14 }}
      >
        <View style={{ minWidth: TABLE_W - 28 }}>
          <View style={{ flexDirection: 'row', paddingTop: 6, paddingBottom: 10 }}>
            <Text style={[headStyle, { width: COL.base }]}>{sv.base}</Text>
            <Text style={[headStyle, { width: COL.past }]}>{sv.past}</Text>
            <Text style={[headStyle, { width: COL.pp }]}>{sv.pp}</Text>
            <Text style={[headStyle, { width: COL.tr }]}>{sv.tr}</Text>
            <View style={{ width: COL.save }} />
          </View>
          {allVerbs.map((verb, rowIdx) => {
            const count = globalCounts[verb.base] ?? 0;
            const learned = count >= REQUIRED;
            const formColor = learned ? glass.secondary : glass.text;
            return (
              <View
                key={verb.base}
                style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 4, borderTopWidth: rowIdx === 0 ? 0 : StyleSheet.hairlineWidth /* guard-ok */, borderTopColor: glass.line }}
              >
                <TouchableOpacity
                  onPress={() => speakAudio(verb.base, undefined, { language: 'en-US' })}
                  activeOpacity={0.6}
                  style={{ width: COL.base, minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ color: formColor, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{verb.base}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => speakAudio(verb.past, undefined, { language: 'en-US' })}
                  activeOpacity={0.6}
                  style={{ width: COL.past, minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ color: formColor, fontSize: 16, lineHeight: 21 }}>{verb.past}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => speakAudio(verb.pp, undefined, { language: 'en-US' })}
                  activeOpacity={0.6}
                  style={{ width: COL.pp, minHeight: 44, justifyContent: 'center' }}
                >
                  <Text style={{ color: formColor, fontSize: 16, lineHeight: 21 }}>{verb.pp}</Text>
                </TouchableOpacity>
                <View style={{ width: COL.tr }}>
                  <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 17 }}>{irregularVerbTranslation(verb, lang)}</Text>
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
      </View>

      {/* Кастомный индикатор горизонтального скролла */}
      {canScroll && (
        <View style={{ height: 4, marginTop: 8, marginHorizontal: 32, backgroundColor: glass.opaqueControl, borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View style={{ height: 4, width: thumbW, borderRadius: 2, backgroundColor: glass.accentGraphic, transform: [{ translateX: thumbTranslate }] }} />
        </View>
      )}

      <ReportErrorButton
        screen="lesson_irregular_verbs"
        dataId={`irregular_verbs_list_lesson_${lessonId ?? 0}`}
        dataText={triLang(lang, {
          ru: `Список неправильных глаголов урока ${lessonId ?? ''}`,
          uk: `Список неправильних дієслів уроку ${lessonId ?? ''}`,
          en: `Irregular verb list for lesson ${lessonId ?? ''}`,
          es: `Lista de verbos irregulares de la lección ${lessonId ?? ''}`,
          'pt-BR': `Lista de verbos irregulares da lição ${lessonId ?? ''}`,
          vi: `Danh sách động từ bất quy tắc của bài ${lessonId ?? ''}`,
          id: `Daftar irregular verbs pelajaran ${lessonId ?? ''}`,
          tr: `${lessonId ?? ''}. dersin düzensiz fiil listesi`,
          pl: `Lista czasowników nieregularnych z lekcji ${lessonId ?? ''}`,
        })}
        style={{ alignSelf: 'flex-end', marginHorizontal: 16, marginTop: 8 }}
        textColor={glass.secondary}
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
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const pack = stringsForLang(lang);
  const learnedTotal = useMemo(() => allVerbs.filter(v => (globalCounts[v.base] ?? 0) >= REQUIRED).length, [allVerbs, globalCounts]);
  return (
    <BouncyScrollView decelerationRate="fast" contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Полоса выученного (макет verbsDict): «6 / 18 выучено» */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 22 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: glass.opaqueControl }}>
          <KitProgressFill ratio={allVerbs.length > 0 ? learnedTotal / allVerbs.length : 0} style={{ backgroundColor: glass.accentGraphic }} />
        </View>
        <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
          {`${learnedTotal} / ${allVerbs.length} ${triLang(lang, { ru: 'выучено', en: 'learned', uk: 'вивчено', es: 'aprendidos', 'pt-BR': 'aprendidos', vi: 'đã học', id: 'dipelajari', tr: 'öğrenildi', pl: 'opanowano' })}`}
        </Text>
      </View>

      <IrregVerbsScrollTable glass={glass} lang={lang} allVerbs={allVerbs} globalCounts={globalCounts} lessonId={lessonId} />

      {/* зачем (PM-086, владелец 2026-09-24): ценник энергии над кнопкой
          убран — расход энергии не меняется. */}
      <View style={{ marginHorizontal: 16, marginTop: 22 }}>
        <PracticeCta glass={glass} label={pack.words.listStartTraining} trailingArrow onPress={() => { fk.tap(); onStartLearn(); }} />
      </View>
    </BouncyScrollView>
  );
}

function FrenchIrregularVerbsUnavailable({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const copy = frenchVocabularyGateCopy('irregular_verbs', lang);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 40 }}>
      <View style={{ width: 61, height: 61, borderRadius: 16, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="shield-checkmark-outline" size={26} color={glass.text} />
      </View>
      <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center', marginTop: 18 }}>
        {copy.title}
      </Text>
      <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8 }}>
        {copy.body}
      </Text>
      <PracticeCta
        glass={glass}
        size="small"
        testID="lesson-irregular-verbs-french-source-gate-back"
        label={copy.action}
        onPress={onBack}
        style={{ marginTop: 22 }}
      />
    </View>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
function LessonIrregularVerbs() {
  const router = useRouter();
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const rootPack = stringsForLang(lang);
  const { energy, isUnlimited: energyUnlimited } = useEnergy();
  const { id, devRunesSeed: devRunesSeedParam, devJumpToFinale: devJumpToFinaleParam } = useLocalSearchParams<{ id: string; devRunesSeed?: string | string[]; devJumpToFinale?: string | string[] }>();
  const devJumpToFinale = (Array.isArray(devJumpToFinaleParam) ? devJumpToFinaleParam[0] : devJumpToFinaleParam) === '1';
  // зачем (владелец, 2026-08-27): DEV-хаб «Проверка рун» — настоящий экран со
  // случайным стартовым счётчиком. Диск и сеть в этом режиме не трогаются.
  const devRunesFake = useMemo(
    () => readDevPracticeRunesFakeState(devRunesSeedParam),
    [devRunesSeedParam],
  );
  const lessonId = parseInt(id || '1', 10);
  const frenchIrregularBlocked = !vocabularyContentAvailableForTarget(studyTarget, 'irregular_verbs');
  const irregularStorageKey = irregularVerbsGlobalKey(studyTarget);
  const allVerbs = frenchIrregularBlocked ? [] : (IRREGULAR_VERBS_BY_LESSON[lessonId] || []);
  const allVerbsFlat: IrregularVerb[] = frenchIrregularBlocked ? [] : Object.values(IRREGULAR_VERBS_BY_LESSON).flat();

  const [noEnergyModalOpen, setNoEnergyModalOpen] = useState(false);
  useEffect(() => {
    if (energyUnlimited || energy > 0) setNoEnergyModalOpen(false);
  }, [energyUnlimited, energy]);

  /** null = по умолчанию «Учить»; нехватку обрабатывает единый входной гейт. */
  const [userTab, setUserTab] = useState<null | 'dict' | 'learn'>(null);
  const tab: 'dict' | 'learn' = userTab !== null ? userTab : 'learn';
  const [globalCounts, setGlobalCounts] = useState<Record<string, number>>({});
  const [hydratedCountsKey, setHydratedCountsKey] = useState<string | null>(null);
  const [practiceAll, setPracticeAll] = useState(false);
  const [learnTabKey, setLearnTabKey] = useState(0);

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
      setHydratedCountsKey(irregularStorageKey);
    })();
    return () => { cancelled = true; };
  }, [irregularStorageKey, studyTarget]);

  // Порции: большие уроки учим волнами по ~6. Берём первую незавершённую порцию.
  const portions = useMemo(() => portionsForVerbs(allVerbs), [allVerbs]);
  // Первая порция, в которой остались ещё не освоенные глаголы.
  const activePortion = useMemo(() => {
    for (const portion of portions) {
      const due = portion.filter(v => (globalCounts[v.base] ?? 0) < 3);
      if (due.length > 0) return due;
    }
    return [];
  }, [globalCounts, portions]);

  // В режиме practiceAll тренируем все глаголы урока.
  const verbsForLearnTab = practiceAll ? allVerbs : activePortion;
  const title = triLang(lang, {
    ru: 'Неправильные глаголы',
    uk: 'Неправильні дієслова',
    en: rootPack.lessonMenu.verbs,
    es: rootPack.lessonMenu.verbs,
    'pt-BR': 'Verbos irregulares',
    vi: 'Động từ bất quy tắc',
    id: 'Irregular verbs',
    tr: 'Düzensiz fiiller',
    pl: 'Czasowniki nieregularne',
  });

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ContentWrap>
          {/* Шапка макета `.hd`: круглая «‹» 34/44, заголовок 20/700. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 12 }}>
            <PracticeBackButton
              glass={glass}
              color={glass.text}
              accessibilityLabel={triLang(lang, { ru: 'Назад', en: 'Back', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
              onPress={() => { fk.tap(); Keyboard.dismiss(); safeRouterBack(router, { pathname: '/lesson_menu', params: { id: String(lessonId) } } as any); }}
            />
            <PracticeHeaderTitle glass={glass} title={`${lessonId}. ${title}`} />
          </View>

          <View style={{ flex: 1 }}>
            {frenchIrregularBlocked
              ? <FrenchIrregularVerbsUnavailable
                  lang={lang}
                  onBack={() => router.replace({ pathname: '/lesson_menu', params: { id: lessonId } } as any)}
                />
              : tab === 'learn' || practiceAll
              ? hydratedCountsKey !== irregularStorageKey
                ? (
                  // зачем: скелет вместо крутилки — геометрия первого кадра = итоговая (макет wordsLoading).
                  <View testID="irregular-verbs-progress-loading" style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>
                    <PracticeProgressRow glass={glass} progress={0} flush />
                    <View style={{ marginTop: 30, minHeight: 200, borderRadius: 16, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass), alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: '60%', height: 26, borderRadius: 8, backgroundColor: glass.opaqueControl }} />
                    </View>
                  </View>
                )
                : <LearnTab
                  key={`${studyTarget}:${lessonId}:${learnTabKey}`}
                  verbs={verbsForLearnTab}
                  lessonVerbs={allVerbs}
                  allVerbs={allVerbsFlat}
                  lang={lang}
                  initCounts={globalCounts}
                  lessonId={lessonId}
                  studyTarget={studyTarget}
                  onUpdate={(base, count) => setGlobalCounts(prev => ({ ...prev, [base]: count }))}
                  practiceRunCompletionOrdinal={learnTabKey + 1}
                  devFakeStartRunes={devRunesFake?.runes}
                  devFakeStartPoints={devRunesFake?.secondary}
                  devJumpToFinale={devJumpToFinale}
                  onReset={() => {
                    setPracticeAll(true);
                    setLearnTabKey(k => k + 1);
                  }}
                  onNoEnergy={() => setNoEnergyModalOpen(true)}
                  onCancelStart={() => setUserTab('dict')}
                />
              : <DictTab
                  allVerbs={allVerbs}
                  globalCounts={globalCounts}
                  lang={lang}
                  lessonId={lessonId}
                  onStartLearn={() => {
                    setUserTab('learn');
                  }}
                />
            }
          </View>

          {/* Сегмент «Учить / Словарь» (макет `.tabbar .seg`): скругление 22, высота 44, активный — плитка-выделение. */}
          {!frenchIrregularBlocked && (
          <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12) }}>
            <View style={{ flexDirection: 'row', height: 44, padding: 3, borderRadius: 22, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) }}>
            {(['learn', 'dict'] as const).map(key => {
              const isActive = tab === key;
              const label = key === 'dict'
                ? triLang(lang, {
                    ru: 'Словарь',
                    uk: 'Словник',
                    en: rootPack.lessonMenu.vocab,
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
                    en: rootPack.words.training,
                    es: rootPack.words.training,
                    'pt-BR': 'Aprender',
                    vi: 'Học',
                    id: 'Belajar',
                    tr: 'Öğren',
                    pl: 'Ucz się',
                  });
              return (
                <Pressable key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: isActive ? glass.raisedFillFrom : 'transparent', boxShadow: isActive ? nestedBoxShadow(glass) : undefined }}
                  onPress={() => {
                    Keyboard.dismiss();
                    setUserTab(key);
                    if (key === 'dict') setPracticeAll(false);
                  }}
                >
                  <Text style={{ color: isActive ? glass.text : glass.secondary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
                </Pressable>
              );
            })}
            </View>
          </View>
          )}
        </ContentWrap>

        <NoEnergyModal variant="learn" visible={noEnergyModalOpen} onClose={() => { setNoEnergyModalOpen(false); setUserTab('dict'); setPracticeAll(false); }} activity="irregular_verbs" />
      </View>
    </ScreenGradient>
  );
}

export default withLessonRuntimeAccessBoundary(LessonIrregularVerbs);
