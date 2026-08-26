// ═══════════════════════════════════════════════════════════════════════════
// flashcards_listening_session.tsx — НОВЫЙ режим «Слушание» MVP (Cards 2.0 E10,
// §3.8 мастер-плана — киллер-фича, главный запрос заказчика).
//
// Плеер: большой PhraseCard с автофлипом синхронно с озвучкой сторон, прогресс,
// ⏮ ⏯ ⏭, кнопка режима озвучки, степпер паузы «подумать» (1/2/3/5с), тумблер
// повтора набора. Foreground only + expo-keep-awake.
//
// cards-2.1 (SPEC_2_1 §7):
//  - §7.1 эквалайзер `ListeningEqualizer` — полосы «дышат» во время озвучки и
//    опадают на паузе; только transform: scaleY на UI-потоке Reanimated;
//  - §7.2 четыре чипа порядка озвучки заменены ОДНОЙ кнопкой с выпадающим
//    списком (`ListeningModePicker`), сохранение в fc_listening_prefs_v1 то же;
//  - §6 ?deck= принимает СПИСОК наборов (parseDeckParams + loadDeckCardsMulti),
//    пустой список → сохранённые карточки.
//
// Драйвит чистая state machine (flashcards/listening_machine.ts):
//  - speak через useAudio().speak с onDone-коллбеком (сигнатура SpeakOpts);
//  - НА КАЖДЫЙ speak — отменяемый setTimeout-watchdog max(4с, слов×0.6с/rate+2с):
//    onDone на Android/web периодически не стреляет (§3.8 п.9 критики);
//  - любой выход → STOP: Speech.stop() + очистка всех таймеров, машина глохнет;
//  - голоса — фолбэк-цепочки tts_voices (uk → ru → «текст без озвучки» с бейджем).
//
// Аудио-политика §5: duckOthers + playsInSilentMode на время сессии (Spotify
// приглушается, silent-mode iOS озвучивает), mixWithOthers обратно на выходе.
// SFX correct/incorrect в слушании выключены — только речь + tick между карточками.
//
// Финал → SessionResultScreen (сколько карточек прослушано).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { setAudioModeAsync } from 'expo-audio';
import { useTheme } from '../components/ThemeContext';
import { useEnergy, useEnergySessionIntent } from '../components/EnergyContext';
import NoEnergyModal from '../components/NoEnergyModal';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SkeletonBlock from '../components/SkeletonShimmer';
import ReportErrorButton from '../components/ReportErrorButton';
import { triLang } from '../constants/i18n';
import { inferExpoSpeechLanguage, useAudio } from '../hooks/use-audio';
import { flashcardContentLang } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import PhraseCard, { useFcReduceMotion } from './flashcards/PhraseCard';
import DeckPickerSheet, { type DeckSheetOption } from './flashcards/DeckPickerSheet';
import { loadFcDeckOptions } from './flashcards/deck_options';
import SessionResultScreen from './flashcards/SessionResultScreen';
import { fcHaptic, playSfx } from './flashcards/SoundService';
import { safeRouterBack } from './navigation_back';
import { deckRefKey, loadDeckCardsMulti, parseDeckParams, type DeckRef } from './flashcards/deck_sources';
import { isValidSessionSize, FC_DEFAULT_SESSION_SIZE, getLastPreset, presetDeckIds, type FcModePreset } from './flashcards/mode_prefs';
import { deckRouteParam, decksCountLabel, SOLO_DECK_ID } from './flashcards/deck_selection';
import ListeningEqualizer from './flashcards/ListeningEqualizer';
import ListeningModePicker from './flashcards/ListeningModePicker';
import {
  ListeningMachine,
  LISTENING_DEFAULT_PAUSE_SEC,
  LISTENING_ORDERS,
  LISTENING_PAUSE_CHOICES_SEC,
  type ListeningCard,
  type ListeningEffect,
  type ListeningOrder,
  type ListeningSide,
} from './flashcards/listening_machine';
import { resolveVoiceForLang, ttsLangFromLocale, type FcTtsLang, type ResolvedVoice } from './flashcards/tts_voices';
import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';
import SessionAttemptsRecoveryModal from '../components/session_attempts/SessionAttemptsRecoveryModal';
import { useSessionAttempts } from '../hooks/useSessionAttempts';
import { captureAccountGeneration } from './account_generation';
import { makeFeedbackAttemptId } from './feedback_attempt_identity';
import { SESSION_ATTEMPTS_MOTION } from '../constants/motionHybrid';

/** Акцент режима «Слушание» (words #4A9EFF / phrases #40C080 / arena #E05050). */
const ACCENT = '#9C6ADE';
const CARD_MIN_H = 300;

// ── Настройки fc_listening_prefs_v1 (§1 мастер-плана) ────────────────────────
const LISTENING_PREFS_KEY = 'fc_listening_prefs_v1';

type ListeningPrefs = { order: ListeningOrder; pauseSec: number; loop: boolean };
const DEFAULT_PREFS: ListeningPrefs = {
  order: 'en_ru',
  pauseSec: LISTENING_DEFAULT_PAUSE_SEC,
  loop: false,
};

/** Толерантный парсинг настроек (битое/чужое — дефолт). Экспорт для тестов. */
export function parseListeningPrefs(raw: string | null | undefined): ListeningPrefs {
  if (!raw || !raw.trim()) return DEFAULT_PREFS;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return DEFAULT_PREFS;
    const order = LISTENING_ORDERS.includes(p.order as ListeningOrder)
      ? (p.order as ListeningOrder)
      : DEFAULT_PREFS.order;
    const pauseSec = (LISTENING_PAUSE_CHOICES_SEC as readonly number[]).includes(p.pauseSec as number)
      ? (p.pauseSec as number)
      : DEFAULT_PREFS.pauseSec;
    return { order, pauseSec, loop: p.loop === true };
  } catch {
    return DEFAULT_PREFS;
  }
}

function saveListeningPrefs(prefs: ListeningPrefs): void {
  // Merge с сырым значением: не затираем будущие поля (rate/voiceId — E13)
  void AsyncStorage.getItem(LISTENING_PREFS_KEY)
    .then((raw) => {
      let base: Record<string, unknown> = {};
      try {
        const p = raw ? JSON.parse(raw) : null;
        if (p && typeof p === 'object' && !Array.isArray(p)) base = p as Record<string, unknown>;
      } catch {}
      return AsyncStorage.setItem(LISTENING_PREFS_KEY, JSON.stringify({ ...base, ...prefs }));
    })
    .catch(() => {});
}

// Fisher-Yates: единое перемешивание карточек.
function shuffleArr<T>(a: readonly T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

type ResultState = { listened: number };

// ── Экран ────────────────────────────────────────────────────────────────────
export default function FlashcardsListeningSession() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { speak, stop: stopSpeech } = useAudio();
  const params = useLocalSearchParams<{ deck?: string; size?: string }>();
  const [attemptSessionId] = useState(makeFeedbackAttemptId);
  const accountToken = useMemo(() => captureAccountGeneration(), []);
  const attempts = useSessionAttempts({
    token: accountToken,
    sessionId: `flashcard-listening:${attemptSessionId}`,
    initialQuestionId: 'flashcard-listening:loading',
  });
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const technicalOutcomeSequenceRef = useRef(0);
  const attemptsModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (attemptsModalTimerRef.current) clearTimeout(attemptsModalTimerRef.current);
  }, []);

  // Не гасить экран на время сессии (§3.8: foreground only, expo-keep-awake)
  useKeepAwake();

  // cards-2.1 (§6): ?deck= — СПИСОК наборов (`saved,custom,pack:abc`). Пустой/мусор → сохранённые.
  const deckRefs = useMemo<DeckRef[]>(() => {
    const parsed = parseDeckParams(params.deck);
    return parsed.length > 0 ? parsed : [{ kind: 'saved' }];
  }, [params.deck]);
  /** Ключ списка наборов — стабильная зависимость эффекта загрузки (массив пересоздаётся). */
  const deckKey = useMemo(() => deckRefs.map(deckRefKey).join(','), [deckRefs]);
  const requestedSessionSize = useMemo(() => {
    const raw = Array.isArray(params.size) ? params.size[0] : params.size;
    if (raw === 'preset') return null;
    const n = raw ? parseInt(raw, 10) : NaN;
    return isValidSessionSize(n) ? n : FC_DEFAULT_SESSION_SIZE;
  }, [params.size]);
  const [presetSessionSize, setPresetSessionSize] = useState<number | null>(null);
  useEffect(() => {
    if (requestedSessionSize !== null) return;
    let cancelled = false;
    void getLastPreset('listening').then((preset) => {
      if (!cancelled) setPresetSessionSize(preset?.size ?? FC_DEFAULT_SESSION_SIZE);
    }).catch(() => {
      if (!cancelled) setPresetSessionSize(FC_DEFAULT_SESSION_SIZE);
    });
    return () => {
      cancelled = true;
    };
  }, [requestedSessionSize]);
  const sessionSize = requestedSessionSize ?? presetSessionSize ?? FC_DEFAULT_SESSION_SIZE;
  const sessionSizeReady = requestedSessionSize !== null || presetSessionSize !== null;
  const contentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);

  const [loading, setLoading] = useState(true);
  // Старт сессии «Слушать» = 1 ⚡ (владелец 2026-08-23: единая экономика).
  const {
    confirmSpendOne: confirmListenEnergy,
    refundOne: refundListenEnergy,
    acknowledgeSessionStart,
  } = useEnergy();
  const listeningEnergyIntent = useEnergySessionIntent(
    'flashcards_listening',
    deckKey || 'saved',
    attemptSessionId,
  );
  const [noEnergyOpen, setNoEnergyOpen] = useState(false);
  const listeningEntryChargedRef = useRef(false);
  const [cards, setCards] = useState<ListeningCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [phase, setPhase] = useState<'playing' | 'paused'>('playing');
  /** Прямо сейчас звучит речь — эквалайзер «дышит» только под неё (§7.1). */
  const [speaking, setSpeaking] = useState(false);
  const [listened, setListened] = useState(0);
  const [noVoiceSide, setNoVoiceSide] = useState<ListeningSide | null>(null);
  const [order, setOrder] = useState<ListeningOrder>(DEFAULT_PREFS.order);
  const [pauseSec, setPauseSec] = useState<number>(DEFAULT_PREFS.pauseSec);
  const [loop, setLoop] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  /**
   * FIX (владелец, 2026-08-13): «в разделе «Слушать» нет выбора и отмечания
   * наборов». Мультивыбор жил только за долгим тапом по пункту таббара и был
   * недостижим. Теперь тот же `DeckPickerSheet` (mode='listening') открывается
   * прямо из шапки слушания — и автоматически, если слушать оказалось нечего.
   */
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [deckOptions, setDeckOptions] = useState<DeckSheetOption[]>([]);
  const [deckPreset, setDeckPreset] = useState<FcModePreset | null>(null);
  const reduceMotion = useFcReduceMotion();

  const machineRef = useRef<ListeningMachine | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenedRef = useRef(0);
  const finishedRef = useRef(false);
  const prefsRef = useRef<ListeningPrefs>(DEFAULT_PREFS);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);
  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current) {
      clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  }, []);

  // ── Финал: все карточки прослушаны, повтор выключен (§3.8) ────────────────
  const handleFinish = useCallback((cardsListened: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearWatchdog();
    clearGapTimer();
    setSpeaking(false);
    stopSpeech();
    setResult({ listened: cardsListened });
  }, [clearWatchdog, clearGapTimer, stopSpeech]);

  // ── Исполнение эффектов машины (через ref — машина создаётся один раз) ────
  const executeEffect = useCallback(
    (e: ListeningEffect) => {
      switch (e.kind) {
        case 'card':
          setCardIndex(e.index);
          setNoVoiceSide(null);
          break;
        case 'flip':
          setFlipped(e.flipped);
          break;
        case 'tick':
          // §5: смена карточки в слушании — тихий tick; correct/incorrect выключены
          playSfx('tick');
          break;
        case 'no_voice':
          setNoVoiceSide(e.side);
          setSpeaking(false);
          attempts.registerVerdict({
            answerAttemptId: `${attemptSessionId}:no-voice:${e.side}:${technicalOutcomeSequenceRef.current++}`,
            verdict: 'technical_error',
          });
          break;
        case 'speak': {
          clearWatchdog();
          setSpeaking(true);
          const token = e.token;
          // Watchdog ОБЯЗАТЕЛЕН (§3.8): onDone может не стрельнуть — глушим и едем дальше
          watchdogRef.current = setTimeout(() => {
            watchdogRef.current = null;
            stopSpeech();
            machineRef.current?.send({ type: 'WATCHDOG_FIRE', token });
          }, e.watchdogMs);
          speak(e.text, e.rate, {
            language: e.lang,
            onDone: () => {
              clearWatchdog();
              machineRef.current?.send({ type: 'SPEAK_DONE', token });
            },
            // Ошибка движка = «сторона отзвучала»: ждать watchdog незачем.
            // onStopped НЕ слушаем — его вызывает наш же Speech.stop() перед
            // следующим utterance (ложный «done» ломал бы порядок).
            onError: () => {
              clearWatchdog();
              attempts.registerVerdict({
                answerAttemptId: `${attemptSessionId}:tts-error:${token}:${technicalOutcomeSequenceRef.current++}`,
                verdict: 'technical_error',
              });
              machineRef.current?.send({ type: 'SPEAK_DONE', token });
            },
          });
          break;
        }
        case 'gap': {
          clearGapTimer();
          setSpeaking(false);
          const token = e.token;
          gapTimerRef.current = setTimeout(() => {
            gapTimerRef.current = null;
            machineRef.current?.send({ type: 'GAP_DONE', token });
          }, e.ms);
          break;
        }
        case 'stop_speech':
          clearWatchdog();
          clearGapTimer();
          setSpeaking(false);
          stopSpeech();
          break;
        case 'progress':
          listenedRef.current = e.listened;
          setListened(e.listened);
          break;
        case 'done':
          handleFinish(e.cardsListened);
          break;
      }
    },
    [attemptSessionId, attempts.registerVerdict, speak, stopSpeech, clearWatchdog, clearGapTimer, handleFinish],
  );
  const executeEffectRef = useRef(executeEffect);
  executeEffectRef.current = executeEffect;

  // ── Аудио-режим §5: duckOthers + silent-mode на сессию, mixWithOthers назад ─
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
    return () => {
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
    };
  }, []);

  // ── Загрузка карточек + голосов, создание машины, автостарт ───────────────
  useEffect(() => {
    if (!sessionSizeReady) return;
    let cancelled = false;
    let createdMachine: ListeningMachine | null = null;
    let chargedOperationId: string | null = null;
    let entryGranted = false;
    void (async () => {
      const [pool, rawPrefs] = await Promise.all([
        // cards-2.1 (§6): несколько наборов одной объединённой подборкой (дедуп по id + шаффл)
        loadDeckCardsMulti(deckRefs, contentLang, { shuffle: true }).catch(
          (): Awaited<ReturnType<typeof loadDeckCardsMulti>> => [],
        ),
        AsyncStorage.getItem(LISTENING_PREFS_KEY).catch(() => null),
      ]);
      const prefs = parseListeningPrefs(rawPrefs);
      const sessionCards = shuffleArr(pool).slice(0, sessionSize);

      // Голоса: en + уникальные языки переводов через фолбэк-цепочки (§3.8, п.8)
      const enVoice = await resolveVoiceForLang('en');
      const backLocales = sessionCards.map((c) =>
        inferExpoSpeechLanguage(c.translation, contentLang === 'es' ? 'es' : undefined),
      );
      const resolved = new Map<FcTtsLang, ResolvedVoice>();
      for (const locale of backLocales) {
        const l = ttsLangFromLocale(locale);
        if (!resolved.has(l)) resolved.set(l, await resolveVoiceForLang(l));
      }
      const listenCards: ListeningCard[] = sessionCards.map((c, i) => {
        const back = resolved.get(ttsLangFromLocale(backLocales[i]!))!;
        return {
          id: c.id,
          front: c.en,
          back: c.translation,
          frontLang: enVoice.language,
          frontAvailable: enVoice.available,
          backLang: back.language,
          backAvailable: back.available,
        };
      });
      if (cancelled) return;

      // Empty/unavailable content is not a started session and must never cost
      // energy. Resolve the playable grant first, then atomically debit it.
      if (listenCards.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }
      if (!listeningEntryChargedRef.current) {
        listeningEntryChargedRef.current = true;
        const energyResult = await confirmListenEnergy(listeningEnergyIntent);
        if (energyResult === 'spent') chargedOperationId = listeningEnergyIntent.operationId;
        if (cancelled) {
          if (chargedOperationId) {
            void refundListenEnergy(chargedOperationId, 'entry_cancelled').catch(() => {});
          }
          return;
        }
        if (energyResult === 'cancelled') {
          safeRouterBack(router, '/flashcards' as any);
          return;
        }
        if (energyResult === 'insufficient') { setNoEnergyOpen(true); setLoading(false); return; }
      }

      prefsRef.current = prefs;
      // Смена набора на том же экране (router.replace из шита выбора) —
      // прогресс сессии начинается заново, иначе индекс/счётчик тянутся из
      // прошлого набора и прогресс-бар показывает чужие числа.
      listenedRef.current = 0;
      finishedRef.current = false;
      setCardIndex(0);
      setFlipped(false);
      setListened(0);
      setPhase('playing');
      setNoVoiceSide(null);
      setCards(listenCards);
      setOrder(prefs.order);
      setPauseSec(prefs.pauseSec);
      setLoop(prefs.loop);
      setLoading(false);
      const machine = new ListeningMachine(
        listenCards,
        { order: prefs.order, pauseMs: prefs.pauseSec * 1000, loop: prefs.loop },
        (eff) => executeEffectRef.current(eff),
      );
      machineRef.current = machine;
      createdMachine = machine;
      entryGranted = true;
      if (chargedOperationId) {
        void acknowledgeSessionStart(chargedOperationId).catch(() => {});
      }
      // Небольшая задержка: экран успевает смонтироваться до первого speak
      startTimerRef.current = setTimeout(() => {
        startTimerRef.current = null;
        machine.start();
      }, 450);
    })().catch(() => {
      if (chargedOperationId && !entryGranted) {
        void refundListenEnergy(chargedOperationId, 'entry_failed').catch(() => {});
      }
      if (!cancelled) {
        setCards([]);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      if (chargedOperationId && !entryGranted) {
        void refundListenEnergy(chargedOperationId, 'entry_cancelled').catch(() => {});
      }
      // Ре-ран эффекта (смена deck/size) не должен оставлять играющую машину
      createdMachine?.send({ type: 'STOP' });
    };
    // Пересоздание машины при смене deck/size — валидный сценарий только при новом пуше роута
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acknowledgeSessionStart, contentLang, confirmListenEnergy, deckKey, listeningEnergyIntent, refundListenEnergy, router, sessionSize, sessionSizeReady]);

  // ── Выход: STOP глушит всё ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      machineRef.current?.send({ type: 'STOP' });
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
      stopSpeech();
    };
  }, [stopSpeech]);

  // ── Управление плеером ─────────────────────────────────────────────────────
  const onTogglePlay = useCallback(() => {
    const m = machineRef.current;
    if (!m) return;
    fcHaptic('tap');
    if (phase === 'playing') {
      m.send({ type: 'PAUSE' });
      setPhase('paused');
    } else {
      m.send({ type: 'RESUME' });
      setPhase('playing');
    }
  }, [phase]);

  const onSkip = useCallback((dir: 1 | -1) => {
    fcHaptic('tap');
    machineRef.current?.send({ type: dir === 1 ? 'SKIP_NEXT' : 'SKIP_PREV' });
  }, []);

  const onPickOrder = useCallback((o: ListeningOrder) => {
    fcHaptic('tap');
    setOrder(o);
    machineRef.current?.setOrder(o);
    prefsRef.current = { ...prefsRef.current, order: o };
    saveListeningPrefs(prefsRef.current);
  }, []);

  const onStepPause = useCallback((dir: 1 | -1) => {
    fcHaptic('tap');
    setPauseSec((cur) => {
      const choices = LISTENING_PAUSE_CHOICES_SEC as readonly number[];
      const idx = Math.max(0, choices.indexOf(cur));
      const next = choices[Math.min(choices.length - 1, Math.max(0, idx + dir))] ?? cur;
      machineRef.current?.setPauseMs(next * 1000);
      prefsRef.current = { ...prefsRef.current, pauseSec: next };
      saveListeningPrefs(prefsRef.current);
      return next;
    });
  }, []);

  const onToggleLoop = useCallback(() => {
    fcHaptic('tap');
    setLoop((cur) => {
      const next = !cur;
      machineRef.current?.setLoop(next);
      prefsRef.current = { ...prefsRef.current, loop: next };
      saveListeningPrefs(prefsRef.current);
      return next;
    });
  }, []);

  const leave = useCallback(() => {
    fcHaptic('tap');
    safeRouterBack(router, '/flashcards' as any);
  }, [router]);

  /**
   * Слушать нечего (набор пуст / карточек нет) → сразу предлагаем выбор
   * наборов вместо тупика с надписью. Один раз на состав набора.
   */
  const autoPickedRef = useRef(false);
  useEffect(() => {
    autoPickedRef.current = false;
  }, [deckKey]);
  useEffect(() => {
    if (loading || cards.length > 0 || result || autoPickedRef.current) return;
    autoPickedRef.current = true;
    setDeckPickerOpen(true);
  }, [loading, cards.length, result, deckKey]);

  /** Подпись кнопки выбора наборов — во все восемь локалей. */
  const pickDecksLabel = useMemo(
    () =>
      triLang(lang, {
        ru: 'Выбрать наборы',
        uk: 'Обрати набори',
        en: 'Choose packs',
        es: 'Elegir packs',
        'pt-BR': 'Escolher pacotes',
        vi: 'Chọn bộ thẻ',
        id: 'Pilih set kartu',
        tr: 'Setleri seç',
        pl: 'Wybierz zestawy',
      }),
    [lang],
  );

  // ── §6: мультивыбор наборов прямо из слушания ─────────────────────────────
  /** Список наборов грузим только при открытии шита — вход в сессию не платит. */
  useEffect(() => {
    if (!deckPickerOpen) return;
    let cancelled = false;
    void (async () => {
      const [decks, preset] = await Promise.all([
        loadFcDeckOptions('listening', lang).catch(() => [] as DeckSheetOption[]),
        getLastPreset('listening').catch(() => null),
      ]);
      if (cancelled) return;
      setDeckOptions(decks);
      setDeckPreset(preset);
    })();
    return () => {
      cancelled = true;
    };
  }, [deckPickerOpen, lang]);

  const openDeckPicker = useCallback(() => {
    fcHaptic('tap');
    // Речь на паузу: выбирать наборы под звучащую карточку неудобно.
    machineRef.current?.send({ type: 'PAUSE' });
    setPhase('paused');
    setDeckPickerOpen(true);
  }, []);

  const closeDeckPicker = useCallback(() => setDeckPickerOpen(false), []);

  /**
   * Старт с выбранными наборами: тот же экран с новым `?deck=` (replace, чтобы
   * «назад» не возвращал в сессию со старым набором). Пресет уже сохранён
   * шитом (`setLastPreset('listening', …)`).
   */
  const startWithPreset = useCallback(
    (preset: FcModePreset) => {
      setDeckPickerOpen(false);
      // Исторический псевдо-набор «Слабые» не относится к наборам карточек.
      const decks = presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID);
      const deck = deckRouteParam(decks) || 'saved';
      /**
       * Выбор не изменился — новый `?deck=` совпал бы со старым, экран бы не
       * перезапустился и остался бы стоять на паузе, в которую его поставило
       * открытие шита («нажал „Начать слушание“, а тишина»). Просто продолжаем.
       */
      if (parseDeckParams(deck).map(deckRefKey).join(',') === deckKey && preset.size === sessionSize) {
        machineRef.current?.send({ type: 'RESUME' });
        setPhase('playing');
        return;
      }
      machineRef.current?.send({ type: 'STOP' });
      router.replace({
        pathname: '/flashcards_listening_session',
        params: { deck, size: String(preset.size) },
      } as never);
    },
    [deckKey, router, sessionSize],
  );

  const deckPickerSheet = (
    <DeckPickerSheet
      visible={deckPickerOpen}
      onClose={closeDeckPicker}
      onStart={startWithPreset}
      decks={deckOptions}
      initialPreset={deckPreset}
      lang={lang}
      t={t}
      f={f}
      reduceMotion={reduceMotion}
      mode="listening"
      showsEnergyCostForPreset={(preset) => {
        const nextDeck = deckRouteParam(presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID)) || 'saved';
        return parseDeckParams(nextDeck).map(deckRefKey).join(',') !== deckKey || preset.size !== sessionSize;
      }}
    />
  );

  // ── Заголовок по набору ───────────────────────────────────────────────────
  const deckTitle = useMemo(() => {
    // cards-2.1: несколько наборов — «2 набора», один — как раньше
    if (deckRefs.length > 1) return decksCountLabel(lang, deckRefs.length);
    const deckRef = deckRefs[0]!;
    if (deckRef.kind === 'custom') return triLang(lang, {
      ru: 'Мои карточки', uk: 'Мої картки', en: 'My cards', es: 'Mis tarjetas', 'pt-BR': 'Meus cartões',
      vi: 'Thẻ của tôi', id: 'Kartu saya', tr: 'Kartlarım', pl: 'Moje fiszki',
    });
    if (deckRef.kind === 'pack') return triLang(lang, {
      ru: 'Набор карточек', uk: 'Набір карток', en: 'Card pack', es: 'Pack de tarjetas', 'pt-BR': 'Pacote de cartões',
      vi: 'Bộ thẻ', id: 'Set kartu', tr: 'Kart seti', pl: 'Zestaw fiszek',
    });
    return triLang(lang, {
      ru: 'Сохранённые', uk: 'Збережені', en: 'Saved', es: 'Guardadas', 'pt-BR': 'Salvos',
      vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane',
    });
  }, [deckRefs, lang]);
  const activeListeningCardId = cards[Math.min(cardIndex, Math.max(cards.length - 1, 0))]?.id ?? null;
  useEffect(() => {
    if (!activeListeningCardId) return;
    attempts.updateQuestion(`flashcard-listening:${activeListeningCardId}:${cardIndex}`);
  }, [activeListeningCardId, attempts.updateQuestion, cardIndex]);

  useEffect(() => {
    if (attempts.state.phase !== 'awaiting_recovery' || showAttemptsModal) return;
    machineRef.current?.send({ type: 'PAUSE' });
    setPhase('paused');
    setSpeaking(false);
    stopSpeech();
    attemptsModalTimerRef.current = setTimeout(
      () => setShowAttemptsModal(true),
      SESSION_ATTEMPTS_MOTION.exhaustedModalDelayMs,
    );
  }, [attempts.state.phase, showAttemptsModal, stopSpeech]);

  const recoverListeningAttempts = useCallback(async (source: 'gift' | 'runes') => {
    try {
      if (source === 'gift') await attempts.recoverWithGift();
      else await attempts.recoverWithRunes();
      setShowAttemptsModal(false);
      machineRef.current?.send({ type: 'RESUME' });
      setPhase('playing');
    } catch {
      // The exact machine/card position remains paused beneath the modal.
    }
  }, [attempts.recoverWithGift, attempts.recoverWithRunes]);

  const endExhaustedListeningSession = useCallback(() => {
    attempts.endAttemptsSession();
    setShowAttemptsModal(false);
    machineRef.current?.send({ type: 'STOP' });
    handleFinish(listenedRef.current);
  }, [attempts.endAttemptsSession, handleFinish]);

  // ── Рендер ─────────────────────────────────────────────────────────────────
  /**
   * зачем (владелец, 2026-08-16, «прыжки страниц»): раньше здесь во весь экран
   * центрировалось «…», а затем СКАЧКОМ появлялся весь плеер. Performance Bible
   * требует «первый кадр = финальная геометрия»: держим шапку, прогресс-бар,
   * место карточки (CARD_MIN_H) и ряд транспорта, подменяя только содержимое.
   */
  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={styles.headerRow}>
              <View style={{ padding: 4 }}>
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
                  {triLang(lang, {
                    ru: 'Слушание', uk: 'Слухання', en: 'Listening', es: 'Escucha', 'pt-BR': 'Escuta',
                    vi: 'Nghe', id: 'Menyimak', tr: 'Dinleme', pl: 'Słuchanie',
                  })}
                </Text>
                <SkeletonBlock width={120} height={f.caption} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SkeletonBlock width={44} height={f.caption} />
                <View style={{ padding: 4 }}>
                  <Ionicons name="albums-outline" size={20} color={t.textMuted} />
                </View>
                <View style={{ padding: 4 }}>
                  <Ionicons name="settings-outline" size={20} color={t.textMuted} />
                </View>
              </View>
            </View>

            <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]} />

            <View style={styles.cardArea}>
              <SkeletonBlock width="100%" height={CARD_MIN_H} borderRadius={24} />
            </View>

            <View style={styles.transportRow}>
              <SkeletonBlock width={54} height={54} borderRadius={27} />
              <SkeletonBlock width={68} height={68} borderRadius={34} />
              <SkeletonBlock width={54} height={54} borderRadius={27} />
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (result) {
    return (
      <SessionResultScreen
        correct={result.listened}
        wrong={0}
        xpGained={0}
        learnLeft={0}
        onDone={leave}
        accentColor={ACCENT}
        listeningStats
        testID="fc-listen-result"
      />
    );
  }

  if (cards.length === 0) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={leave} style={{ padding: 4 }} testID="fc-listen-back">
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, {
                  ru: 'Слушание', uk: 'Слухання', en: 'Listening', es: 'Escucha', 'pt-BR': 'Escuta',
                  vi: 'Nghe', id: 'Menyimak', tr: 'Dinleme', pl: 'Słuchanie',
                })}
              </Text>
              <View style={{ width: 32 }} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 }}>
              <Ionicons name="headset-outline" size={44} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Здесь пока нечего слушать — выберите наборы',
                  uk: 'Тут поки нема чого слухати — оберіть набори',
                  en: 'Nothing to listen to here yet — pick some packs',
                  es: 'Aún no hay nada que escuchar: elige los packs',
                  'pt-BR': 'Ainda não há o que ouvir: escolha os pacotes',
                  vi: 'Chưa có gì để nghe — hãy chọn bộ thẻ',
                  id: 'Belum ada yang bisa didengarkan — pilih set kartu',
                  tr: 'Dinlenecek bir şey yok — setleri seçin',
                  pl: 'Nie ma jeszcze czego słuchać — wybierz zestawy',
                })}
              </Text>
              <TouchableOpacity
                testID="fc-listen-pick-decks-empty"
                accessibilityLabel="qa-fc-listen-pick-decks"
                accessible
                onPress={openDeckPicker}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: t.bgSurface,
                }}
              >
                <Ionicons name="albums-outline" size={18} color={ACCENT} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                  {pickDecksLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </ContentWrap>
        </SafeAreaView>
        {deckPickerSheet}
      </ScreenGradient>
    );
  }

  const card = cards[Math.min(cardIndex, cards.length - 1)]!;
  const noVoiceBadge = (side: ListeningSide) =>
    noVoiceSide === side ? (
      <View style={[styles.noVoicePill, { backgroundColor: `${t.wrong}26` }]}>
        <Ionicons name="volume-mute-outline" size={13} color={t.wrong} />
        <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '700' }}>
          {triLang(lang, {
            ru: 'нет голоса — читаем текстом',
            uk: 'немає голосу — читаємо текстом',
            en: 'no voice — showing text instead',
            es: 'sin voz: solo texto',
            'pt-BR': 'sem voz — apenas texto',
            vi: 'không có giọng — chỉ văn bản',
            id: 'tanpa suara — hanya teks',
            tr: 'ses yok — yalnızca metin',
            pl: 'brak głosu — tylko tekst',
          })}
        </Text>
      </View>
    ) : null;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header: назад · «Слушание · набор» · N/размер */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={leave} style={{ padding: 4 }} testID="fc-listen-back">
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, {
                  ru: 'Слушание', uk: 'Слухання', en: 'Listening', es: 'Escucha', 'pt-BR': 'Escuta',
                  vi: 'Nghe', id: 'Menyimak', tr: 'Dinleme', pl: 'Słuchanie',
                })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption }} numberOfLines={1}>
                {deckTitle}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SessionAttemptsHud
                remaining={attempts.state.remainingAttempts}
                locale={lang}
                testID="fc-listen-session-attempts"
              />
              <Text style={{ color: t.textMuted, fontSize: f.caption, minWidth: 44, textAlign: 'right' }} testID="fc-listen-progress">
                {Math.min(cardIndex + 1, cards.length)} / {cards.length}
              </Text>
              {/* §6: выбор и отмечание наборов — мультивыбор, как в тренировке */}
              <TouchableOpacity
                testID="fc-listen-pick-decks"
                accessibilityLabel="qa-fc-listen-pick-decks"
                accessible
                accessibilityRole="button"
                onPress={openDeckPicker}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="albums-outline" size={20} color={t.textMuted} />
              </TouchableOpacity>
              {/* E13: шестерёнка → выбор TTS-голоса (fc_voice_prefs_v1) */}
              <TouchableOpacity
                testID="fc-listen-voice-settings"
                accessibilityLabel="qa-fc-listen-voice-settings"
                accessible
                onPress={() => {
                  fcHaptic('tap');
                  machineRef.current?.send({ type: 'PAUSE' });
                  setPhase('paused');
                  router.push('/flashcards_voice_picker' as any);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ padding: 4 }}
              >
                <Ionicons name="settings-outline" size={20} color={t.textMuted} />
              </TouchableOpacity>
              {/* зачем: слушание — единственный режим, где ошибка чаще в ОЗВУЧКЕ,
                  а не в тексте (в форме репорта для этого есть отдельная категория
                  «звук и произношение»), и сообщить о ней было негде. */}
              <ReportErrorButton
                screen="flashcards_listening"
                dataId={`flashcard_${card.id ?? 'unknown'}`}
                // зачем (аудит 2026-08-23): читались card.en/card.translation,
                // которых у ListeningCard нет (поля зовутся front/back) — в
                // жалобу уходило «EN: undefined / RU: undefined», и репорт был
                // бесполезен. Проверка типов молчала: полный tsc падал по памяти.
                dataText={`EN: ${card.front}
RU: ${card.back}`}
                variant="icon-flag"
                accessibilityLabel={triLang(lang, { ru: 'Сообщить об ошибке в карточке', uk: 'Повідомити про помилку в картці', en: 'Report an error in the card', es: 'Informar de un error en la tarjeta', 'pt-BR': 'Relatar erro no cartão', vi: 'Báo lỗi trong thẻ', id: 'Laporkan kesalahan pada kartu', tr: 'Karttaki hatayı bildir', pl: 'Zgłoś błąd w fiszce' })}
                testID="fc-listen-report"
              />
            </View>
          </View>

          {/* Тонкий прогресс-бар позиции в подборке */}
          <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: ACCENT, width: `${((cardIndex + 1) / cards.length) * 100}%` },
              ]}
            />
          </View>

          {/* Карточка с автофлипом (muted: в слушании — только речь + tick, §3.8) */}
          <View style={styles.cardArea}>
            <PhraseCard
              mode="view"
              en={card.front}
              translation={card.back}
              flipped={flipped}
              onFlip={setFlipped}
              muted
              minHeight={CARD_MIN_H}
              testID="fc-listen-card"
              renderFront={() => (
                <View style={styles.cardFace}>
                  <Text
                    maxFontSizeMultiplier={1.35}
                    numberOfLines={5}
                    style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22) + 4, fontWeight: '700', textAlign: 'center' }}
                  >
                    {card.front}
                  </Text>
                  {noVoiceBadge('front')}
                </View>
              )}
              renderBack={() => (
                <View style={styles.cardFace}>
                  <Text
                    maxFontSizeMultiplier={1.35}
                    numberOfLines={6}
                    style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22) + 1, fontWeight: '500', textAlign: 'center' }}
                  >
                    {card.back}
                  </Text>
                  {noVoiceBadge('back')}
                </View>
              )}
            />
            {/* Эквалайзер (§7.1): полосы «дышат» во время озвучки, опадают на паузе.
                Только transform: scaleY, анимация на UI-потоке Reanimated. */}
            <View style={styles.eqRow}>
              <ListeningEqualizer
                playing={phase === 'playing' && speaking}
                active={phase === 'playing'}
                barCount={7}
                color={ACCENT}
                height={34}
                testID="fc-listen-equalizer"
              />
            </View>

            {/* Прослушано (важно для loop-сессий: видно набранное) */}
            <View style={styles.listenedRow}>
              <Ionicons name="headset-outline" size={13} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }} testID="fc-listen-count">
                {triLang(lang, {
                  ru: 'Прослушано', uk: 'Прослухано', en: 'Listened', es: 'Escuchadas', 'pt-BR': 'Ouvidas',
                  vi: 'Đã nghe', id: 'Didengarkan', tr: 'Dinlenen', pl: 'Odsłuchane',
                })}: {listened}
              </Text>
            </View>
          </View>

          {/*
            Пауза «подумать» + повтор подборки. Слева — компактная КРУГЛАЯ
            кнопка режима озвучки: FIX (владелец, 2026-08-13) — раньше это была
            широкая плашка с текстом в отдельной строке над настройками, она
            съедала высоту плеера. Список вариантов раскрывается по тапу
            (та же всплывашка раздела: пружина + стаггер строк).
          */}
          <View style={styles.settingsRow}>
            <ListeningModePicker
              value={order}
              onChange={onPickOrder}
              lang={lang}
              t={t}
              f={f}
              accent={ACCENT}
            />
            <View style={[styles.pauseStepper, { backgroundColor: t.bgSurface }]}>
              <TouchableOpacity
                onPress={() => onStepPause(-1)}
                hitSlop={8}
                testID="fc-listen-pause-minus"
                style={styles.stepBtn}
              >
                <Ionicons name="remove" size={18} color={t.textPrimary} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center', minWidth: 74 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>
                  {pauseSec}{triLang(lang, {
                    ru: 'с', uk: 'с', en: 's', es: 's', 'pt-BR': 's', vi: 'g', id: 'd', tr: 'sn', pl: 's',
                  })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption - 1 }}>
                  {triLang(lang, {
                    ru: 'пауза',
                    uk: 'пауза',
                    en: 'pause',
                    es: 'pausa',
                    'pt-BR': 'pausa',
                    vi: 'tạm dừng',
                    id: 'jeda',
                    tr: 'duraklat',
                    pl: 'pauza',
                  })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onStepPause(1)}
                hitSlop={8}
                testID="fc-listen-pause-plus"
                style={styles.stepBtn}
              >
                <Ionicons name="add" size={18} color={t.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onToggleLoop}
              testID="fc-listen-loop"
              accessibilityLabel="qa-fc-listen-loop"
              accessible
              style={[
                styles.loopBtn,
                // зачем: без рамки «включено» держится заливкой (плотнее, 33) —
                // правило владельца «контейнеры без обводки».
                { backgroundColor: loop ? `${ACCENT}33` : t.bgSurface },
              ]}
            >
              <Ionicons name="repeat" size={18} color={loop ? ACCENT : t.textMuted} />
              <Text style={{ color: loop ? ACCENT : t.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: 'Повтор',
                  uk: 'Повтор',
                  en: 'Repeat',
                  es: 'Repetir',
                  'pt-BR': 'Repetir',
                  vi: 'Lặp lại',
                  id: 'Ulangi',
                  tr: 'Tekrar',
                  pl: 'Powtórz',
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Транспорт: ⏮ ⏯ ⏭ */}
          <View style={styles.transportRow}>
            <TouchableOpacity
              onPress={() => onSkip(-1)}
              testID="fc-listen-prev"
              accessibilityLabel="qa-fc-listen-prev"
              accessible
              style={[styles.sideBtn, { backgroundColor: t.bgSurface }]}
            >
              <Ionicons name="play-skip-back" size={22} color={t.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onTogglePlay}
              testID="fc-listen-play"
              accessibilityLabel="qa-fc-listen-play"
              accessible
              style={[styles.playBtn, { backgroundColor: ACCENT }]}
            >
              <Ionicons
                name={phase === 'playing' ? 'pause' : 'play'}
                size={30}
                color="#fff"
                style={phase === 'playing' ? undefined : { marginLeft: 3 }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSkip(1)}
              testID="fc-listen-next"
              accessibilityLabel="qa-fc-listen-next"
              accessible
              style={[styles.sideBtn, { backgroundColor: t.bgSurface }]}
            >
              <Ionicons name="play-skip-forward" size={22} color={t.textPrimary} />
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
      {deckPickerSheet}
      <NoEnergyModal visible={noEnergyOpen} onClose={leave} />
      <SessionAttemptsRecoveryModal
        visible={showAttemptsModal && attempts.state.phase === 'awaiting_recovery'}
        locale={lang}
        giftCount={attempts.giftCount}
        runeBalance={attempts.runeBalance ?? 0}
        busy={attempts.recoveryBusy}
        onUseGift={() => { void recoverListeningAttempts('gift'); }}
        onSpendRunes={() => { void recoverListeningAttempts('runes'); }}
        onEndSession={endExhaustedListeningSession}
      />
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontWeight: '700' },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  cardArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  cardFace: { alignItems: 'center', width: '100%', paddingVertical: 12, gap: 12 },
  noVoicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  listenedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  eqRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // space-between: круглая кнопка режима прижата ВЛЕВО, повтор — вправо,
    // степпер паузы посередине. Раньше ряд был центрирован без кнопки режима.
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  pauseStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
    marginTop: 16,
    marginBottom: 18,
  },
  sideBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
