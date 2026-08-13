// ═══════════════════════════════════════════════════════════════════════════
// flashcards_listening_session.tsx — НОВЫЙ режим «Слушание» MVP (Cards 2.0 E10,
// §3.8 мастер-плана — киллер-фича, главный запрос заказчика).
//
// Плеер: большой PhraseCard с автофлипом синхронно с озвучкой сторон, прогресс,
// ⏮ ⏯ ⏭, кнопка режима озвучки, степпер паузы «подумать» (1/2/3/5с), тумблер
// повтора колоды. Foreground only + expo-keep-awake.
//
// cards-2.1 (SPEC_2_1 §7):
//  - §7.1 эквалайзер `ListeningEqualizer` — полосы «дышат» во время озвучки и
//    опадают на паузе; только transform: scaleY на UI-потоке Reanimated;
//  - §7.2 четыре чипа порядка озвучки заменены ОДНОЙ кнопкой с выпадающим
//    списком (`ListeningModePicker`), сохранение в fc_listening_prefs_v1 то же;
//  - §6 ?deck= принимает СПИСОК колод (parseDeckParams + loadDeckCardsMulti),
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
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { setAudioModeAsync } from 'expo-audio';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang } from '../constants/i18n';
import { inferExpoSpeechLanguage, useAudio } from '../hooks/use-audio';
import { flashcardContentLang } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import PhraseCard from './flashcards/PhraseCard';
import SessionResultScreen from './flashcards/SessionResultScreen';
import { fcHaptic, playSfx } from './flashcards/SoundService';
import { deckRefKey, loadDeckCardsMulti, parseDeckParams, type DeckRef } from './flashcards/deck_sources';
import { isValidSessionSize, FC_DEFAULT_SESSION_SIZE } from './flashcards/mode_prefs';
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

// Fisher-Yates (паттерн trainer_words_session)
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

  // Не гасить экран на время сессии (§3.8: foreground only, expo-keep-awake)
  useKeepAwake();

  // cards-2.1 (§6): ?deck= — СПИСОК колод (`saved,custom,pack:abc`). Пустой/мусор → сохранённые.
  const deckRefs = useMemo<DeckRef[]>(() => {
    const parsed = parseDeckParams(params.deck);
    return parsed.length > 0 ? parsed : [{ kind: 'saved' }];
  }, [params.deck]);
  /** Ключ списка колод — стабильная зависимость эффекта загрузки (массив пересоздаётся). */
  const deckKey = useMemo(() => deckRefs.map(deckRefKey).join(','), [deckRefs]);
  const sessionSize = useMemo(() => {
    const raw = Array.isArray(params.size) ? params.size[0] : params.size;
    const n = raw ? parseInt(raw, 10) : NaN;
    return isValidSessionSize(n) ? n : FC_DEFAULT_SESSION_SIZE;
  }, [params.size]);
  const contentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);

  const [loading, setLoading] = useState(true);
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
    [speak, stopSpeech, clearWatchdog, clearGapTimer, handleFinish],
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

  // ── Загрузка колоды + голосов, создание машины, автостарт ─────────────────
  useEffect(() => {
    let cancelled = false;
    let createdMachine: ListeningMachine | null = null;
    void (async () => {
      const [pool, rawPrefs] = await Promise.all([
        // cards-2.1 (§6): несколько колод одной объединённой (дедуп по id + шаффл внутри)
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

      prefsRef.current = prefs;
      setCards(listenCards);
      setOrder(prefs.order);
      setPauseSec(prefs.pauseSec);
      setLoop(prefs.loop);
      setLoading(false);
      if (listenCards.length === 0) return;

      const machine = new ListeningMachine(
        listenCards,
        { order: prefs.order, pauseMs: prefs.pauseSec * 1000, loop: prefs.loop },
        (eff) => executeEffectRef.current(eff),
      );
      machineRef.current = machine;
      createdMachine = machine;
      // Небольшая задержка: экран успевает смонтироваться до первого speak
      startTimerRef.current = setTimeout(() => {
        startTimerRef.current = null;
        machine.start();
      }, 450);
    })();
    return () => {
      cancelled = true;
      // Ре-ран эффекта (смена deck/size) не должен оставлять играющую машину
      createdMachine?.send({ type: 'STOP' });
    };
    // Пересоздание машины при смене deck/size — валидный сценарий только при новом пуше роута
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey, sessionSize, contentLang]);

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
    router.back();
  }, [router]);

  // ── Заголовок по колоде (паттерн trainer_words_session E8) ────────────────
  const deckTitle = useMemo(() => {
    // cards-2.1: несколько колод — «Колод: N», одна — как раньше
    if (deckRefs.length > 1) {
      return `${triLang(lang, { ru: 'Колод', uk: 'Колод', es: 'Mazos' })}: ${deckRefs.length}`;
    }
    const deckRef = deckRefs[0]!;
    if (deckRef.kind === 'custom') return triLang(lang, { ru: 'Мои карточки', uk: 'Мої картки', es: 'Mis tarjetas' });
    if (deckRef.kind === 'pack') return triLang(lang, { ru: 'Набор карточек', uk: 'Набір карток', es: 'Pack de tarjetas' });
    return triLang(lang, { ru: 'Сохранённые', uk: 'Збережені', es: 'Guardadas' });
  }, [deckRefs, lang]);

  // ── Рендер ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: t.textMuted }}>…</Text>
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
                {triLang(lang, { ru: 'Слушание', uk: 'Слухання', es: 'Escucha' })}
              </Text>
              <View style={{ width: 32 }} />
            </View>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 }}>
              <Ionicons name="headset-outline" size={44} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'В этой колоде пока нет карточек для слушания',
                  uk: 'У цій колоді поки немає карток для слухання',
                  es: 'Este mazo aún no tiene tarjetas para escuchar',
                })}
              </Text>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const card = cards[Math.min(cardIndex, cards.length - 1)]!;
  const noVoiceBadge = (side: ListeningSide) =>
    noVoiceSide === side ? (
      <View style={[styles.noVoicePill, { backgroundColor: `${t.wrong}1A`, borderColor: `${t.wrong}66` }]}>
        <Ionicons name="volume-mute-outline" size={13} color={t.wrong} />
        <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '700' }}>
          {triLang(lang, {
            ru: 'нет голоса — читаем текстом',
            uk: 'немає голосу — читаємо текстом',
            es: 'sin voz: solo texto',
          })}
        </Text>
      </View>
    ) : null;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header: назад · «Слушание · колода» · N/размер */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={leave} style={{ padding: 4 }} testID="fc-listen-back">
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, { ru: 'Слушание', uk: 'Слухання', es: 'Escucha' })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption }} numberOfLines={1}>
                {deckTitle}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: f.caption, minWidth: 44, textAlign: 'right' }} testID="fc-listen-progress">
                {Math.min(cardIndex + 1, cards.length)} / {cards.length}
              </Text>
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
            </View>
          </View>

          {/* Тонкий прогресс-бар позиции в колоде */}
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
                {triLang(lang, { ru: 'Прослушано', uk: 'Прослухано', es: 'Escuchadas' })}: {listened}
              </Text>
            </View>
          </View>

          {/* Режим озвучки (§7.2): ОДНА кнопка + выпадающий список вместо 4 чипов */}
          <View style={styles.orderRow}>
            <ListeningModePicker
              value={order}
              onChange={onPickOrder}
              lang={lang}
              t={t}
              f={f}
              accent={ACCENT}
            />
          </View>

          {/* Пауза «подумать» + повтор колоды */}
          <View style={styles.settingsRow}>
            <View style={[styles.pauseStepper, { borderColor: t.border, backgroundColor: t.bgSurface }]}>
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
                  {pauseSec}{triLang(lang, { ru: 'с', uk: 'с', es: 's' })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption - 1 }}>
                  {triLang(lang, { ru: 'пауза', uk: 'пауза', es: 'pausa' })}
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
                {
                  borderColor: loop ? ACCENT : t.border,
                  backgroundColor: loop ? `${ACCENT}1F` : t.bgSurface,
                },
              ]}
            >
              <Ionicons name="repeat" size={18} color={loop ? ACCENT : t.textMuted} />
              <Text style={{ color: loop ? ACCENT : t.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                {triLang(lang, { ru: 'Повтор', uk: 'Повтор', es: 'Repetir' })}
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
              style={[styles.sideBtn, { borderColor: t.border, backgroundColor: t.bgSurface }]}
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
              style={[styles.sideBtn, { borderColor: t.border, backgroundColor: t.bgSurface }]}
            >
              <Ionicons name="play-skip-forward" size={22} color={t.textPrimary} />
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
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
    borderWidth: 1,
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
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: 16,
  },
  pauseStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
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
    borderWidth: 1.5,
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
    borderWidth: 1,
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
