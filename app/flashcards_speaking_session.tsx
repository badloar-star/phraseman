// ═══════════════════════════════════════════════════════════════════════════
// flashcards_speaking_session.tsx — режим «Говорить» раздела «Карточки».
//
// зачем (владелец, 2026-08-17): «в разделе карточки в отработке есть тренировка
// блиц, слушать — надо ещё речь, чтобы карточки можно было отрабатывать говоря».
//
// Что это: карточка → зажал микрофон → сказал фразу по-английски → отпустил →
// оценка. Движок оценки — тот же `SpeakingPanel` (presentation="inline"),
// что стоит за кнопкой «Устно» в уроках и тренажёре фраз: пословная сверка,
// контрольный прогон, Android-путь через whisper. Свой распознаватель не пишем.
//
// Два задания (взяты из плана говорильной дорожки Learning V2,
// docs/v2/SPEAKING_TRACK_PLAN_2026-08-17.md, типы 2 и 1 — те, для которых
// у карточки есть данные):
//  • «Скажи по-английски» — на лицевой стороне ТОЛЬКО перевод, английский
//    скрыт: тренирует извлечение из головы (ядро дорожки). Подсказка — тап по
//    карточке (флип) или динамик.
//  • «Повтори за диктором» — английский показан и озвучен, человек повторяет:
//    опора полная, тренирует произношение.
// Типы 3–4 плана («собери и скажи», «одно слово убрали») требуют `words[]` с
// ролями — у карточек их нет, поэтому сюда не берём.
//
// Очередь — общее правило раздела (`session_queue`): не сдал → карточка в конец,
// максимум 2 повтора; чистая логика — flashcards/speaking_session_logic.ts.
// XP режим не даёт (как слушание/блиц: говорение — надстройка, без двойного счёта).
// Финал → SessionResultScreen (верно/ошибок/точность + «Добить»).
//
// Премиум-гейт — как у всех речевых поверхностей: `useFeatureAccess('speaking')`
// внутри `SpeakHoldButton` (без доступа → пейвол context='speaking').
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SkeletonBlock from '../components/SkeletonShimmer';
import SpeakingPanel, { buildSpeakingPanelTheme } from '../components/SpeakingPanel';
import SpeakingInlineSlot from '../components/SpeakingInlineSlot';
import SpeakingInlineResultStars from '../components/SpeakingInlineResultStars';
import { triLang } from '../constants/i18n';
import { useAudio } from '../hooks/use-audio';
import { flashcardContentLang } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import { trackEvent } from './analytics';
import { SPEECH_PRONUNCIATION_PASS_THRESHOLD } from './pronunciation_scoring_client';
import { speakingBand, speakingBandLabel } from './speaking_score_bands';
import PhraseCard, { useFcReduceMotion } from './flashcards/PhraseCard';
import DeckPickerSheet, { type DeckSheetOption } from './flashcards/DeckPickerSheet';
import { loadFcDeckOptions } from './flashcards/deck_options';
import SessionResultScreen from './flashcards/SessionResultScreen';
import SpeakHoldButton from './flashcards/SpeakHoldButton';
import { fcHaptic, playSfx } from './flashcards/SoundService';
import { safeRouterBack } from './navigation_back';
import { deckRefKey, loadDeckCardsMulti, parseDeckParams, type DeckCard, type DeckRef } from './flashcards/deck_sources';
import { isValidSessionSize, FC_DEFAULT_SESSION_SIZE, getLastPreset, presetDeckIds, type FcModePreset } from './flashcards/mode_prefs';
import { deckRouteParam, decksCountLabel, SOLO_DECK_ID } from './flashcards/deck_selection';
import {
  DEFAULT_SPEAKING_PREFS,
  FC_SPEAKING_PREFS_KEY,
  SPEAKING_AUTO_ADVANCE_MS,
  SPEAKING_TASKS,
  advanceSpeaking,
  beginSpeakingAttempt,
  cancelSpeakingAttempt,
  currentSpeakingCard,
  initialSpeakingState,
  parseSpeakingPrefs,
  scoreSpeakingAttempt,
  speakingProgress,
  speakingRetryCards,
  summarizeSpeaking,
  type SpeakingAttempt,
  type SpeakingPrefs,
  type SpeakingSessionState,
  type SpeakingTask,
} from './flashcards/speaking_session_logic';

/** Акцент режима (words #4A9EFF / phrases #40C080 / listening #9C6ADE / blitz #FF8A3D). */
const ACCENT = '#22B8A8';
const CARD_MIN_H = 260;

// ── Настройки fc_speaking_prefs_v1 (парсинг — в speaking_session_logic) ──────
function saveSpeakingPrefs(prefs: SpeakingPrefs): void {
  void AsyncStorage.getItem(FC_SPEAKING_PREFS_KEY)
    .then((raw) => {
      let base: Record<string, unknown> = {};
      try {
        const p = raw ? JSON.parse(raw) : null;
        if (p && typeof p === 'object' && !Array.isArray(p)) base = p as Record<string, unknown>;
      } catch {}
      return AsyncStorage.setItem(FC_SPEAKING_PREFS_KEY, JSON.stringify({ ...base, ...prefs }));
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

type ResultState = { correct: number; wrong: number; learnLeft: number };

const TITLE = {
  ru: 'Говорить', uk: 'Говорити', es: 'Hablar', 'pt-BR': 'Falar',
  vi: 'Nói', id: 'Bicara', tr: 'Konuş', pl: 'Mów',
} as const;

// ── Экран ────────────────────────────────────────────────────────────────────
export default function FlashcardsSpeakingSession() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { speak, stop: stopSpeech } = useAudio();
  const params = useLocalSearchParams<{ deck?: string; size?: string }>();

  // Сессия говорения — руки заняты, экран не гасим (как в слушании).
  useKeepAwake();

  const deckRefs = useMemo<DeckRef[]>(() => {
    const parsed = parseDeckParams(params.deck);
    return parsed.length > 0 ? parsed : [{ kind: 'saved' }];
  }, [params.deck]);
  const deckKey = useMemo(() => deckRefs.map(deckRefKey).join(','), [deckRefs]);
  const sessionSize = useMemo(() => {
    const raw = Array.isArray(params.size) ? params.size[0] : params.size;
    const n = raw ? parseInt(raw, 10) : NaN;
    return isValidSessionSize(n) ? n : FC_DEFAULT_SESSION_SIZE;
  }, [params.size]);
  const contentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);
  const reduceMotion = useFcReduceMotion();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SpeakingSessionState>(() => initialSpeakingState([]));
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [task, setTask] = useState<SpeakingTask>(DEFAULT_SPEAKING_PREFS.task);
  const [flipped, setFlipped] = useState(false);
  /** Микрофон зажат прямо сейчас — SpeakingPanel слушает. */
  const [holdActive, setHoldActive] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [deckOptions, setDeckOptions] = useState<DeckSheetOption[]>([]);
  const [deckPreset, setDeckPreset] = useState<FcModePreset | null>(null);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);
  /** Ключ монтирования панели: новая попытка → свежая панель (без хвостов прошлой). */
  const attemptKeyRef = useRef(0);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const card = currentSpeakingCard(session);
  const progress = speakingProgress(session);
  const phase = session.phase;

  // ── Загрузка карточек + настроек ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [pool, rawPrefs] = await Promise.all([
        loadDeckCardsMulti(deckRefs, contentLang, { shuffle: true }).catch((): DeckCard[] => []),
        AsyncStorage.getItem(FC_SPEAKING_PREFS_KEY).catch(() => null),
      ]);
      if (cancelled) return;
      const prefs = parseSpeakingPrefs(rawPrefs);
      const cards = shuffleArr(pool).slice(0, sessionSize);
      finishedRef.current = false;
      clearAdvanceTimer();
      setTask(prefs.task);
      setFlipped(false);
      setHoldActive(false);
      setResult(null);
      setSession(initialSpeakingState(cards));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // deckRefs пересоздаётся на каждый рендер; deckKey — стабильный ключ того же списка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey, sessionSize, contentLang, clearAdvanceTimer]);

  // ── Финал ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !session.finished || session.queue.length === 0 || finishedRef.current) return;
    finishedRef.current = true;
    stopSpeech();
    const summary = summarizeSpeaking(session);
    setResult({ correct: summary.correct, wrong: summary.wrong, learnLeft: summary.learnKeys.length });
  }, [loading, session, stopSpeech]);

  // ── Выход: глушим речь и таймеры ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearAdvanceTimer();
      stopSpeech();
    };
  }, [clearAdvanceTimer, stopSpeech]);

  const speakCard = useCallback(
    (c: DeckCard | null) => {
      if (!c) return;
      speak(c.en, undefined, { language: 'en-US' });
    },
    [speak],
  );

  /**
   * «Повтори за диктором»: эталон звучит сам при появлении карточки —
   * в этом смысл задания (опора полная). В «Скажи по-английски» — тишина:
   * подсказка только по запросу.
   */
  const cardId = card?.id ?? null;
  useEffect(() => {
    if (loading || !cardId || task !== 'repeat' || phase !== 'idle') return;
    const c = sessionRef.current.queue[sessionRef.current.index];
    if (!c || c.id !== cardId) return;
    // Небольшая пауза: экран/флип успевают встать до речи.
    const timer = setTimeout(() => speakCard(c), 350);
    return () => clearTimeout(timer);
    // Озвучиваем один раз на карточку, не на каждую смену фазы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, cardId, task]);

  // ── Микрофон: удержание → панель слушает; отпускание → панель оценивает ───
  const onHoldStart = useCallback(() => {
    const s = sessionRef.current;
    if (s.finished || !currentSpeakingCard(s)) return;
    clearAdvanceTimer();
    // Эталон не должен попасть в микрофон (панель тоже глушит, но лучше сразу).
    stopSpeech();
    if (s.phase !== 'live') attemptKeyRef.current += 1;
    setSession((cur) => beginSpeakingAttempt(cur));
    setHoldActive(true);
  }, [clearAdvanceTimer, stopSpeech]);

  const onHoldEnd = useCallback(() => {
    setHoldActive(false);
  }, []);

  const goNext = useCallback((opts?: { skip?: boolean }) => {
    clearAdvanceTimer();
    stopSpeech();
    setFlipped(false);
    setSession((cur) => advanceSpeaking(cur, opts));
  }, [clearAdvanceTimer, stopSpeech]);

  const onScore = useCallback(
    (attempt: SpeakingAttempt) => {
      const s = sessionRef.current;
      if (s.phase !== 'live') return;
      setHoldActive(false);
      setSession((cur) => scoreSpeakingAttempt(cur, attempt));
      // Раскрываем английский — и на зачёте (подтверждение), и на промахе (учимся).
      setFlipped(task === 'recall');
      if (attempt.passed) {
        fcHaptic('correct');
        playSfx('correct');
        void trackEvent('speaking_attempt_passed', { source: 'flashcards', score: attempt.score });
        clearAdvanceTimer();
        advanceTimerRef.current = setTimeout(() => {
          advanceTimerRef.current = null;
          goNext();
        }, SPEAKING_AUTO_ADVANCE_MS);
      } else {
        fcHaptic('wrong');
        playSfx('incorrect');
      }
    },
    [task, clearAdvanceTimer, goNext],
  );

  /** Панель закрылась сама (отказ движка / «нет речи») — ждём удержания снова. */
  const onPanelClose = useCallback(() => {
    setHoldActive(false);
    setSession((cur) => cancelSpeakingAttempt(cur));
  }, []);

  const onRetry = useCallback(() => {
    fcHaptic('tap');
    clearAdvanceTimer();
    setFlipped(false);
    setSession((cur) => (cur.phase === 'scored' ? { ...cur, phase: 'idle', attempt: null } : cur));
  }, [clearAdvanceTimer]);

  const onPickTask = useCallback((next: SpeakingTask) => {
    fcHaptic('tap');
    stopSpeech();
    setTask(next);
    setFlipped(false);
    saveSpeakingPrefs({ task: next });
  }, [stopSpeech]);

  const leave = useCallback(() => {
    fcHaptic('tap');
    safeRouterBack(router, '/flashcards' as never);
  }, [router]);

  /** «Добить»: второй раунд только по несданным карточкам, тот же экран. */
  const onRetryWrong = useCallback(() => {
    const cards = speakingRetryCards(sessionRef.current);
    if (cards.length === 0) return;
    finishedRef.current = false;
    clearAdvanceTimer();
    setResult(null);
    setFlipped(false);
    setHoldActive(false);
    setSession(initialSpeakingState(cards));
  }, [clearAdvanceTimer]);

  // ── Выбор наборов из самого режима (как в слушании/блице) ─────────────────
  const autoPickedRef = useRef(false);
  useEffect(() => {
    autoPickedRef.current = false;
  }, [deckKey]);
  useEffect(() => {
    if (loading || session.queue.length > 0 || result || autoPickedRef.current) return;
    autoPickedRef.current = true;
    setDeckPickerOpen(true);
  }, [loading, session.queue.length, result, deckKey]);

  useEffect(() => {
    if (!deckPickerOpen) return;
    let cancelled = false;
    void (async () => {
      const [decks, preset] = await Promise.all([
        loadFcDeckOptions('speaking', lang).catch(() => [] as DeckSheetOption[]),
        getLastPreset('speaking').catch(() => null),
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
    stopSpeech();
    setDeckPickerOpen(true);
  }, [stopSpeech]);
  const closeDeckPicker = useCallback(() => setDeckPickerOpen(false), []);

  const startWithPreset = useCallback(
    (preset: FcModePreset) => {
      setDeckPickerOpen(false);
      const decks = presetDeckIds(preset).filter((d) => d !== SOLO_DECK_ID);
      const deck = deckRouteParam(decks) || 'saved';
      if (parseDeckParams(deck).map(deckRefKey).join(',') === deckKey && preset.size === sessionSize) return;
      router.replace({
        pathname: '/flashcards_speaking_session',
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
      mode="speaking"
    />
  );

  const deckTitle = useMemo(() => {
    if (deckRefs.length > 1) return decksCountLabel(lang, deckRefs.length);
    const deckRef = deckRefs[0]!;
    if (deckRef.kind === 'custom') return triLang(lang, {
      ru: 'Мои карточки', uk: 'Мої картки', es: 'Mis tarjetas', 'pt-BR': 'Meus cartões',
      vi: 'Thẻ của tôi', id: 'Kartu saya', tr: 'Kartlarım', pl: 'Moje fiszki',
    });
    if (deckRef.kind === 'pack') return triLang(lang, {
      ru: 'Набор карточек', uk: 'Набір карток', es: 'Pack de tarjetas', 'pt-BR': 'Pacote de cartões',
      vi: 'Bộ thẻ', id: 'Set kartu', tr: 'Kart seti', pl: 'Zestaw fiszek',
    });
    return triLang(lang, {
      ru: 'Сохранённые', uk: 'Збережені', es: 'Guardadas', 'pt-BR': 'Salvos',
      vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane',
    });
  }, [deckRefs, lang]);

  const labels = useMemo(
    () => ({
      title: triLang(lang, TITLE),
      recall: triLang(lang, {
        ru: 'Скажи по-английски', uk: 'Скажи англійською', es: 'Dilo en inglés',
        'pt-BR': 'Diga em inglês', vi: 'Nói bằng tiếng Anh', id: 'Ucapkan dalam bahasa Inggris',
        tr: 'İngilizce söyle', pl: 'Powiedz po angielsku',
      }),
      repeat: triLang(lang, {
        ru: 'Повтори за диктором', uk: 'Повтори за диктором', es: 'Repite al locutor',
        'pt-BR': 'Repita o locutor', vi: 'Nhắc lại theo giọng đọc', id: 'Tirukan pembaca',
        tr: 'Spikeri tekrar et', pl: 'Powtórz za lektorem',
      }),
      holdIdle: triLang(lang, {
        ru: 'Зажми и говори', uk: 'Затисни й говори', es: 'Mantén y habla',
        'pt-BR': 'Segure e fale', vi: 'Giữ và nói', id: 'Tahan dan bicara',
        tr: 'Basılı tut ve konuş', pl: 'Przytrzymaj i mów',
      }),
      holdLive: triLang(lang, {
        ru: 'Слушаю…', uk: 'Слухаю…', es: 'Escuchando…', 'pt-BR': 'Ouvindo…',
        vi: 'Đang nghe…', id: 'Mendengarkan…', tr: 'Dinliyorum…', pl: 'Słucham…',
      }),
      holdAgain: triLang(lang, {
        ru: 'Зажми — скажи ещё раз', uk: 'Затисни — скажи ще раз', es: 'Mantén y repite',
        'pt-BR': 'Segure e repita', vi: 'Giữ và nói lại', id: 'Tahan dan ulangi',
        tr: 'Basılı tut, tekrar söyle', pl: 'Przytrzymaj i powtórz',
      }),
      next: triLang(lang, {
        ru: 'Дальше', uk: 'Далі', es: 'Siguiente', 'pt-BR': 'Próximo',
        vi: 'Tiếp', id: 'Lanjut', tr: 'Sonraki', pl: 'Dalej',
      }),
      skip: triLang(lang, {
        ru: 'Пропустить', uk: 'Пропустити', es: 'Saltar', 'pt-BR': 'Pular',
        vi: 'Bỏ qua', id: 'Lewati', tr: 'Atla', pl: 'Pomiń',
      }),
      retry: triLang(lang, {
        ru: 'Ещё раз', uk: 'Ще раз', es: 'Otra vez', 'pt-BR': 'De novo',
        vi: 'Thử lại', id: 'Lagi', tr: 'Tekrar', pl: 'Jeszcze raz',
      }),
      listen: triLang(lang, {
        ru: 'Послушать', uk: 'Послухати', es: 'Escuchar', 'pt-BR': 'Ouvir',
        vi: 'Nghe', id: 'Dengar', tr: 'Dinle', pl: 'Posłuchaj',
      }),
      pickDecks: triLang(lang, {
        ru: 'Выбрать наборы', uk: 'Обрати набори', es: 'Elegir packs',
        'pt-BR': 'Escolher pacotes', vi: 'Chọn bộ thẻ', id: 'Pilih set kartu',
        tr: 'Setleri seç', pl: 'Wybierz zestawy',
      }),
      empty: triLang(lang, {
        ru: 'Здесь пока нечего говорить — выберите наборы',
        uk: 'Тут поки нема чого говорити — оберіть набори',
        es: 'Aún no hay nada que decir: elige los packs',
        'pt-BR': 'Ainda não há o que falar: escolha os pacotes',
        vi: 'Chưa có gì để nói — hãy chọn bộ thẻ',
        id: 'Belum ada yang bisa diucapkan — pilih set kartu',
        tr: 'Söylenecek bir şey yok — setleri seçin',
        pl: 'Nie ma jeszcze czego mówić — wybierz zestawy',
      }),
      spokenCount: triLang(lang, {
        ru: 'Сказано', uk: 'Сказано', es: 'Dichas', 'pt-BR': 'Ditas',
        vi: 'Đã nói', id: 'Diucapkan', tr: 'Söylenen', pl: 'Powiedziane',
      }),
    }),
    [lang],
  );

  const panelTheme = useMemo(() => buildSpeakingPanelTheme(t), [t]);

  // ── Рендер ─────────────────────────────────────────────────────────────────
  const header = (interactive: boolean) => (
    <View style={styles.headerRow}>
      {interactive ? (
        <TouchableOpacity
          onPress={leave}
          style={{ padding: 4 }}
          testID="fc-speak-back"
          accessibilityRole="button"
          accessibilityLabel="qa-fc-speak-back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </View>
      )}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>{labels.title}</Text>
        {interactive ? (
          <Text style={{ color: t.textMuted, fontSize: f.caption }} numberOfLines={1}>{deckTitle}</Text>
        ) : (
          <SkeletonBlock width={120} height={f.caption} />
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {interactive ? (
          <Text style={{ color: t.textMuted, fontSize: f.caption, minWidth: 44, textAlign: 'right' }} testID="fc-speak-progress">
            {progress.position} / {progress.total}
          </Text>
        ) : (
          <SkeletonBlock width={44} height={f.caption} />
        )}
        <TouchableOpacity
          testID="fc-speak-pick-decks"
          accessibilityLabel="qa-fc-speak-pick-decks"
          accessible
          accessibilityRole="button"
          onPress={openDeckPicker}
          disabled={!interactive}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ padding: 4 }}
        >
          <Ionicons name="albums-outline" size={20} color={t.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Performance Bible: первый кадр = финальная геометрия. На загрузке держим
   * шапку, прогресс, место карточки, слот панели и транспортный ряд.
   */
  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            {header(false)}
            <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]} />
            <View style={styles.cardArea}>
              <SkeletonBlock width="100%" height={CARD_MIN_H} borderRadius={24} />
            </View>
            <SpeakingInlineSlot style={styles.inlineSlot} />
            <View style={styles.taskRow}>
              <SkeletonBlock width="100%" height={40} borderRadius={14} />
            </View>
            <View style={styles.transportRow}>
              <SkeletonBlock width={54} height={54} borderRadius={27} />
              <SkeletonBlock width={98} height={98} borderRadius={49} />
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
        correct={result.correct}
        wrong={result.wrong}
        xpGained={0}
        learnLeft={result.learnLeft}
        onRetryWrong={result.learnLeft > 0 ? onRetryWrong : undefined}
        onDone={leave}
        accentColor={ACCENT}
        testID="fc-speak-result"
      />
    );
  }

  if (session.queue.length === 0) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            {header(true)}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 }}>
              <Ionicons name="mic-outline" size={44} color={t.textGhost} />
              <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }}>{labels.empty}</Text>
              <TouchableOpacity
                testID="fc-speak-pick-decks-empty"
                accessibilityLabel="qa-fc-speak-pick-decks"
                accessible
                onPress={openDeckPicker}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, backgroundColor: t.bgSurface,
                }}
              >
                <Ionicons name="albums-outline" size={18} color={ACCENT} />
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{labels.pickDecks}</Text>
              </TouchableOpacity>
            </View>
          </ContentWrap>
        </SafeAreaView>
        {deckPickerSheet}
      </ScreenGradient>
    );
  }

  const front = task === 'recall' ? card?.translation ?? '' : card?.en ?? '';
  const back = task === 'recall' ? card?.en ?? '' : card?.translation ?? '';
  const attempt = session.attempt;
  const band = attempt ? speakingBand(attempt.score, SPEECH_PRONUNCIATION_PASS_THRESHOLD) : null;
  const holdLabel = holdActive ? labels.holdLive : phase === 'scored' ? labels.holdAgain : phase === 'live' ? '' : labels.holdIdle;
  const spoken = session.events.filter((e) => e.correct).length;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {header(true)}

          <View style={[styles.progressTrack, { backgroundColor: t.bgSurface }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: ACCENT, width: `${(progress.position / progress.total) * 100}%` },
              ]}
            />
          </View>

          {/* Карточка: тап — подсмотреть/вернуть; динамик — эталон вслух. */}
          <View style={styles.cardArea}>
            <PhraseCard
              mode="view"
              en={front}
              translation={back}
              flipped={flipped}
              onFlip={setFlipped}
              onSpeakFront={() => { fcHaptic('tap'); speakCard(card); }}
              onSpeakBack={() => { fcHaptic('tap'); speakCard(card); }}
              minHeight={CARD_MIN_H}
              disabled={holdActive}
              testID="fc-speak-card"
              renderFront={() => (
                <View style={styles.cardFace}>
                  <Text
                    maxFontSizeMultiplier={1.35}
                    numberOfLines={5}
                    style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22) + 2, fontWeight: '700', textAlign: 'center' }}
                  >
                    {front}
                  </Text>
                </View>
              )}
              renderBack={() => (
                <View style={styles.cardFace}>
                  <Text
                    maxFontSizeMultiplier={1.35}
                    numberOfLines={6}
                    style={{ color: t.textPrimary, fontSize: (f.h1 ?? 22) + 2, fontWeight: task === 'recall' ? '700' : '500', textAlign: 'center' }}
                  >
                    {back}
                  </Text>
                </View>
              )}
            />
            <View style={styles.spokenRow}>
              <Ionicons name="mic-outline" size={13} color={t.textMuted} />
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }} testID="fc-speak-count">
                {labels.spokenCount}: {spoken}
              </Text>
            </View>
          </View>

          {/* Слот панели говорения — одна геометрия во всех состояниях. */}
          <SpeakingInlineSlot style={styles.inlineSlot}>
            {phase === 'live' && card ? (
              <SpeakingPanel
                key={`${card.id}:${attemptKeyRef.current}`}
                targetText={card.en}
                lang={lang}
                theme={panelTheme}
                presentation="inline"
                holdActive={holdActive}
                onScore={onScore}
                onClose={onPanelClose}
              />
            ) : phase === 'scored' && attempt && band ? (
              <View style={[styles.resultCard, { backgroundColor: t.bgCard }]} testID="fc-speak-attempt-result">
                <SpeakingInlineResultStars result={attempt} theme={panelTheme} testID="fc-speak-stars" />
                <Text
                  style={{ color: attempt.passed ? t.correct : t.textPrimary, fontSize: f.sub, fontWeight: '800', textAlign: 'center' }}
                  numberOfLines={2}
                >
                  {speakingBandLabel(band, lang)}
                </Text>
                {!attempt.passed ? (
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      testID="fc-speak-retry"
                      accessibilityRole="button"
                      accessibilityLabel={labels.retry}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      onPress={onRetry}
                      style={[styles.resultBtn, { backgroundColor: `${ACCENT}22` }]}
                    >
                      <Ionicons name="refresh" size={16} color={ACCENT} />
                      <Text style={{ color: ACCENT, fontSize: f.caption, fontWeight: '800' }}>{labels.retry}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="fc-speak-next"
                      accessibilityRole="button"
                      accessibilityLabel={labels.next}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      onPress={() => { fcHaptic('tap'); goNext(); }}
                      style={[styles.resultBtn, { backgroundColor: t.bgSurface }]}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{labels.next}</Text>
                      <Ionicons name="arrow-forward" size={16} color={t.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ) : null}
          </SpeakingInlineSlot>

          {/* Тип задания — сегмент из двух: тон, не обводка. */}
          <View style={[styles.taskRow, { backgroundColor: t.bgSurface }]} testID="fc-speak-task">
            {SPEAKING_TASKS.map((option) => {
              const active = option === task;
              return (
                <TouchableOpacity
                  key={option}
                  testID={`fc-speak-task-${option}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onPickTask(option)}
                  disabled={holdActive}
                  style={[styles.taskChip, { backgroundColor: active ? `${ACCENT}33` : 'transparent' }]}
                >
                  <Ionicons
                    name={option === 'recall' ? 'bulb-outline' : 'repeat-outline'}
                    size={15}
                    color={active ? ACCENT : t.textMuted}
                  />
                  <Text
                    numberOfLines={1}
                    style={{ color: active ? ACCENT : t.textMuted, fontSize: f.caption, fontWeight: '800' }}
                  >
                    {option === 'recall' ? labels.recall : labels.repeat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Транспорт: пропустить · зажми-и-говори · послушать */}
          <View style={styles.transportRow}>
            <TouchableOpacity
              onPress={() => { fcHaptic('tap'); goNext({ skip: phase !== 'scored' }); }}
              disabled={holdActive}
              testID="fc-speak-skip"
              accessibilityLabel="qa-fc-speak-skip"
              accessibilityHint={phase === 'scored' ? labels.next : labels.skip}
              accessibilityRole="button"
              accessibilityState={{ disabled: holdActive }}
              accessible
              style={[styles.sideBtn, { backgroundColor: t.bgSurface, opacity: holdActive ? 0.5 : 1 }]}
            >
              <Ionicons name="play-skip-forward" size={22} color={t.textPrimary} />
            </TouchableOpacity>
            <SpeakHoldButton
              accent={ACCENT}
              listening={holdActive}
              disabled={!card}
              reduceMotion={reduceMotion}
              onHoldStart={onHoldStart}
              onHoldEnd={onHoldEnd}
              label={holdLabel}
            />
            <TouchableOpacity
              onPress={() => { fcHaptic('tap'); speakCard(card); }}
              disabled={holdActive}
              testID="fc-speak-listen"
              accessibilityLabel="qa-fc-speak-listen"
              accessibilityHint={labels.listen}
              accessibilityRole="button"
              accessibilityState={{ disabled: holdActive }}
              accessible
              style={[styles.sideBtn, { backgroundColor: t.bgSurface, opacity: holdActive ? 0.5 : 1 }]}
            >
              <Ionicons name="volume-high" size={22} color={t.textPrimary} />
            </TouchableOpacity>
          </View>
        </ContentWrap>
      </SafeAreaView>
      {deckPickerSheet}
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
  progressTrack: { height: 4, borderRadius: 2, marginHorizontal: 16, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  cardArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  cardFace: { alignItems: 'center', width: '100%', paddingVertical: 12, gap: 12 },
  spokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  inlineSlot: { paddingHorizontal: 24 },
  resultCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  resultActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  resultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  taskRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  taskChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginTop: 10,
    marginBottom: 14,
  },
  sideBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
