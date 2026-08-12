// ═══════════════════════════════════════════════════════════════════════════
// trainer_words_session.tsx — Сессия слов (Cards 2.0 E5+E8, §3.5–3.7 мастер-плана)
//
// Колода PhraseCard mode='grade' (стек: текущая + следующая под ней).
// Карточка показывает английское слово + перевод (верный или ложный).
// Свайп вправо / кнопка ✓ = «Верно», влево / ✕ = «Неверно».
// Каркас сессии: сегмент-прогресс, «ошибка → в конец очереди, ≤2 повторов»,
// undo последнего ответа (5с), XP +5/верный ответ, звёзды через stars_system,
// финал → SessionResultScreen. SFX/хаптика — §5 (SoundService).
//
// E8 (§3.7): параметр ?deck=saved|custom|pack:<id> — «Тренировать эту колоду»:
// источник карточек не trainer_store, а выбранная колода (deck_sources), ложные
// переводы — из этой же колоды. SRS-запись в trainer_store НЕ делается (прогресс
// сессии локален), ошибки уходят в active_recall_items с source 'custom'/'pack'
// (кастомные карточки попадают в review — замена удалённого practice). Звёзды —
// awardSessionStars('custom_deck', {cardIds}) с анти-фармом ≥10 уникальных/день.
// ?size=10|15|20 — размер сессии из пресета (fc_mode_prefs_v1, DeckPickerSheet).
// Дневной free-лимит тренера общий: deck-сессии входят в него (§4).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang } from '../constants/i18n';
import { useAudio } from '../hooks/use-audio';
import {
  getDueItems,
  markTrainerResult,
  type TrainerItem,
} from './trainer_store';
import { hasUsedFreeSessionToday, isTrainerSessionLocked, markFreeSessionUsed } from './trainer_session';
import { getVerifiedPremiumStatus } from './premium_guard';
import { actionToastTri, emitAppEvent } from './events';
import { registerXP } from './xp_manager';
import { recordMistake } from './active_recall';
import { flashcardContentLang } from './spanish_content_gate';
import { useStudyTarget } from '../components/StudyTargetContext';
import PhraseCard, { type PhraseCardGradeResult } from './flashcards/PhraseCard';
import SessionResultScreen from './flashcards/SessionResultScreen';
import {
  autoSpeakAfterSfx,
  cancelPendingFcTts,
  fcHaptic,
  setFcTtsSpeaker,
} from './flashcards/SoundService';
import { awardSessionStars, type AwardStarsOutcome } from './flashcards/stars_system';
import {
  loadDeckCards,
  mistakeSourceForDeck,
  parseDeckParam,
  pickDeckDecoy,
  type DeckCard,
  type DeckRef,
} from './flashcards/deck_sources';
import { isValidSessionSize } from './flashcards/mode_prefs';
import {
  requeueAfterMistake,
  summarizeSession,
  TRAINER_SESSION_SIZE,
  type SessionAnswerEvent,
  type SessionOutcomeSummary,
} from './flashcards/session_queue';

const ACCENT = '#4A9EFF';
const XP_PER_CORRECT = 5;
const UNDO_WINDOW_MS = 5000;
const CARD_MIN_H = 260;

// ── Подбор ложного перевода (due-очередь тренера) ────────────────────────────
function trainerItemTranslation(i: TrainerItem, lang: string): string {
  // uk-переклад з фолбеком на ru (правило з docs/FLASHCARDS_RULES.md)
  return lang === 'uk' ? (i.translationUk || i.translationRu) : i.translationRu;
}

function pickDecoyTranslation(
  correctShown: string,
  allItems: TrainerItem[],
  lang: string,
): string {
  // Берём переводы других слов из очереди — В ТОЙ ЖЕ локали, что и показ
  // (FIX(cards-2.0): раньше decoy всегда был ru, а рендер для uk подменял его
  // на правильный uk-перевод — ложные варианты не показывались вовсе).
  const pool = allItems
    .map(i => trainerItemTranslation(i, lang))
    .filter(tr => tr && tr !== correctShown);
  if (pool.length === 0) return correctShown; // нечего взять — вернём правильный (edge case)
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Типы ─────────────────────────────────────────────────────────────────────
interface CardData {
  /** Стабильный ключ карточки в сессии (trainer: EN-слово; deck: id карточки). */
  key: string;
  /** Английское слово/фраза на лице. */
  en: string;
  shownTranslation: string;
  isCorrectTranslation: boolean;
  /** Источник trainer_store (обычная сессия) — для SRS-записи. */
  item?: TrainerItem;
  /** Источник deck-сессии (E8) — для recall-записи ошибок и анти-фарма звёзд. */
  deckCard?: DeckCard;
}

function buildCards(items: TrainerItem[], lang: string): CardData[] {
  return items.map((item) => {
    const showCorrect = Math.random() > 0.5;
    const correctShown = trainerItemTranslation(item, lang);
    const shownTranslation = showCorrect
      ? correctShown
      : pickDecoyTranslation(correctShown, items, lang);
    return {
      key: item.key,
      en: item.key,
      item,
      shownTranslation,
      isCorrectTranslation: showCorrect || shownTranslation === correctShown,
    };
  });
}

/** E8: карточки deck-сессии — та же механика, ложные переводы из этой же колоды. */
function buildDeckSessionCards(sessionCards: DeckCard[], pool: DeckCard[]): CardData[] {
  return sessionCards.map((card) => {
    const showCorrect = Math.random() > 0.5;
    const shownTranslation = showCorrect
      ? card.translation
      : pickDeckDecoy(card.translation, pool);
    return {
      key: card.id,
      en: card.en,
      deckCard: card,
      shownTranslation,
      isCorrectTranslation: showCorrect || shownTranslation === card.translation,
    };
  });
}

// Fisher-Yates
function shuffleArr<T>(a: readonly T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

type SessionResultState = {
  summary: SessionOutcomeSummary;
  outcome: AwardStarsOutcome | null;
  xp: number;
};

type LastAnswer = {
  index: number;
  key: string;
  correct: boolean;
  requeued: boolean;
};

type SegmentState = 'correct' | 'wrong';

// ── Основной экран ────────────────────────────────────────────────────────────
export default function TrainerWordsSession() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { speak, stop: stopSpeech } = useAudio();
  const params = useLocalSearchParams<{ deck?: string; size?: string }>();

  /** E8: deck-режим (?deck=saved|custom|pack:<id>); null — обычная due-очередь тренера. */
  const deckRef = useMemo<DeckRef | null>(() => parseDeckParam(params.deck), [params.deck]);
  const sessionSize = useMemo(() => {
    const raw = Array.isArray(params.size) ? params.size[0] : params.size;
    const n = raw ? parseInt(raw, 10) : NaN;
    return isValidSessionSize(n) ? n : TRAINER_SESSION_SIZE;
  }, [params.size]);
  const cardContentLang = useMemo(() => flashcardContentLang(lang, studyTarget), [lang, studyTarget]);

  const [queue, setQueue] = useState<CardData[]>([]);
  const [current, setCurrent] = useState(0);
  const [segments, setSegments] = useState<SegmentState[]>([]);
  const [repeatCounts, setRepeatCounts] = useState<Record<string, number>>({});
  const [lastAnswer, setLastAnswer] = useState<LastAnswer | null>(null);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<SessionResultState | null>(null);
  const [loading, setLoading] = useState(true);

  // Журнал ответов (для итога) и отложенные записи результатов.
  // Ничего не пишется сразу — иначе undo не смог бы откатить; флаш — в финале
  // сессии и на unmount (выход сохраняет прогресс раунда, §3.5).
  // trainer-режим → markTrainerResult (SRS тренера); deck-режим → recordMistake
  // в active_recall_items для ошибок (source 'custom'/'pack', §3.7) — SRS тренера
  // для чужих колод НЕ трогаем.
  const eventsRef = useRef<SessionAnswerEvent[]>([]);
  const pendingResultsRef = useRef<{ card: CardData; correct: boolean }[]>([]);
  const finishingRef = useRef(false);
  const flushedRef = useRef(false);
  const cardShownAtRef = useRef(Date.now());
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deckRefStable = useRef<DeckRef | null>(deckRef);
  deckRefStable.current = deckRef;

  /** Флаш отложенных результатов (финал сессии / unmount). */
  const flushPendingResults = useCallback(async (pending: { card: CardData; correct: boolean }[]) => {
    const deck = deckRefStable.current;
    if (!deck) {
      for (const r of pending) {
        await markTrainerResult(r.card.key, 'words', r.correct).catch(() => {});
      }
      return;
    }
    // Deck-сессия: уникальные ошибочные карточки → очередь review (active_recall)
    const source = mistakeSourceForDeck(deck);
    const seen = new Set<string>();
    for (const r of pending) {
      if (r.correct) continue;
      const c = r.card.deckCard;
      if (!c || seen.has(c.id)) continue;
      seen.add(c.id);
      await recordMistake(c.en, c.ru || c.translation, 0, c.uk, source, c.es).catch(() => {});
    }
  }, []);

  useEffect(() => {
    void (async () => {
      // Дневной лимит тренера (§4): free — 1 сессия/день на весь тренер (включая
      // «Тренировать эту колоду»), премиум — безлимит
      const [premium, usedToday] = await Promise.all([
        getVerifiedPremiumStatus().catch(() => false),
        hasUsedFreeSessionToday(),
      ]);
      if (isTrainerSessionLocked(premium, usedToday)) {
        emitAppEvent('action_toast', actionToastTri('info', {
          ru: 'Бесплатная сессия тренера на сегодня использована. Новая — завтра, с Премиум — без лимита.',
          uk: 'Безкоштовну сесію тренера на сьогодні використано. Нова — завтра, з Преміум — без ліміту.',
          es: 'Ya usaste la sesión gratuita de hoy. Nueva mañana; con Premium, sin límite.',
        }));
        router.replace('/trainer' as any);
        return;
      }

      let cards: CardData[] = [];
      if (deckRef) {
        // E8: колода вместо trainer_store; лимит размера сессии из пресета
        const pool = await loadDeckCards(deckRef, cardContentLang);
        const sessionCards = shuffleArr(pool).slice(0, sessionSize);
        cards = buildDeckSessionCards(sessionCards, pool);
      } else {
        const items = await getDueItems('words', sessionSize);
        cards = buildCards(items, lang);
      }
      if (cards.length === 0) { setDone(true); setLoading(false); return; }
      if (!premium) void markFreeSessionUsed();

      setQueue(cards);
      cardShownAtRef.current = Date.now();
      setLoading(false);
    })();
  }, [lang, router, deckRef, sessionSize, cardContentLang]);

  // E9: инъекция реального TTS в очередь SoundService (SFX → 120мс → TTS).
  useEffect(() => {
    setFcTtsSpeaker(speak);
    return () => {
      setFcTtsSpeaker(null);
      cancelPendingFcTts();
    };
  }, [speak]);

  // Выход посреди сессии: сохранить уже данные ответы + заглушить TTS.
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      stopSpeech();
      if (!flushedRef.current && pendingResultsRef.current.length > 0) {
        const pending = [...pendingResultsRef.current];
        pendingResultsRef.current = [];
        void flushPendingResults(pending);
      }
    };
  }, [stopSpeech, flushPendingResults]);

  const clearUndoWindow = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setLastAnswer(null);
  }, []);

  const finishSession = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearUndoWindow();

    const summary = summarizeSession(eventsRef.current);

    // Флаш результатов (SRS тренера или recall-записи deck-сессии)
    const pending = [...pendingResultsRef.current];
    pendingResultsRef.current = [];
    flushedRef.current = true;
    await flushPendingResults(pending);

    // Звёзды (§4): тренер = 'trainer'; deck-сессия = 'custom_deck' (общий кэп
    // с тренером + анти-фарм: ≥10 уникальных, не тренированных сегодня cardIds)
    let outcome: AwardStarsOutcome | null = null;
    if (summary.total > 0) {
      const deck = deckRefStable.current;
      // E12: deckKey ('saved'/'custom'/'pack:<id>') → best-звёзды колоды
      // (fc_deck_best_stars_v1) пишутся тем же вызовом awardSessionStars.
      const rawDeck = Array.isArray(params.deck) ? params.deck[0] : params.deck;
      outcome = await awardSessionStars(deck ? 'custom_deck' : 'trainer', {
        correct: summary.correct,
        total: summary.total,
        avgAnswerSec: summary.avgAnswerSec,
        inputKind: 'choice',
        ...(deck && rawDeck ? { deckKey: rawDeck } : {}),
        ...(deck
          ? { cardIds: [...new Set(pending.map((p) => p.card.deckCard?.id).filter((id): id is string => !!id))] }
          : {}),
      }).catch(() => null);
    }

    // XP: +5/верный ответ, одним начислением в финале (undo-безопасно)
    let xp = summary.correct * XP_PER_CORRECT;
    if (xp > 0) {
      try {
        const r = await registerXP(xp, 'trainer_answer', '', lang);
        xp = r.finalDelta;
      } catch {}
    }

    setResult({ summary, outcome, xp });
    setDone(true);
  }, [clearUndoWindow, lang, flushPendingResults, params.deck]);

  // ── Ответ (свайп PhraseCard или кнопки ✓/✕) ────────────────────────────────
  const handleGrade = useCallback((grade: PhraseCardGradeResult) => {
    if (done || finishingRef.current) return;
    const card = queue[current];
    if (!card) return;

    // know = «Верно» (перевод правильный), learn = «Неверно»
    const answeredCorrectly = (grade === 'know') === card.isCorrectTranslation;
    const ms = Date.now() - cardShownAtRef.current;

    // E9: SFX → 120мс → автоозвучка EN-слова (тумблер fc_autospeak_on); хаптика §5
    fcHaptic(answeredCorrectly ? 'correct' : 'wrong');
    autoSpeakAfterSfx(card.en, {
      sfx: answeredCorrectly ? 'correct' : 'incorrect',
      language: 'en-US',
    });

    eventsRef.current.push({ key: card.key, correct: answeredCorrectly, ms });
    pendingResultsRef.current.push({ card, correct: answeredCorrectly });

    // «Ошибка → в конец очереди», максимум 2 повтора карточки (чистая функция)
    let nextQueue = queue;
    let requeued = false;
    if (!answeredCorrectly) {
      const rq = requeueAfterMistake(queue, card, card.key, repeatCounts);
      nextQueue = rq.queue;
      requeued = rq.requeued;
      setQueue(rq.queue);
      setRepeatCounts(rq.repeatCounts);
    }
    setSegments(s => [...s, answeredCorrectly ? 'correct' : 'wrong']);

    // Окно undo 5с
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setLastAnswer({ index: current, key: card.key, correct: answeredCorrectly, requeued });
    undoTimerRef.current = setTimeout(() => {
      undoTimerRef.current = null;
      setLastAnswer(null);
    }, UNDO_WINDOW_MS);

    const next = current + 1;
    if (next >= nextQueue.length) {
      void finishSession();
    } else {
      setCurrent(next);
      cardShownAtRef.current = Date.now();
    }
  }, [done, queue, current, repeatCounts, finishSession]);

  // ── Undo последнего ответа (↩, 5 секунд) ───────────────────────────────────
  const handleUndo = useCallback(() => {
    const la = lastAnswer;
    if (!la || done || finishingRef.current) return;
    clearUndoWindow();
    fcHaptic('tap');
    // E9: undo глушит отложенную озвучку отменённого ответа
    cancelPendingFcTts();
    stopSpeech();

    eventsRef.current.pop();
    pendingResultsRef.current.pop();
    setSegments(s => s.slice(0, -1));
    if (la.requeued) {
      setQueue(q => q.slice(0, -1));
      setRepeatCounts(rc => {
        const used = (rc[la.key] ?? 1) - 1;
        const nextRc = { ...rc };
        if (used <= 0) delete nextRc[la.key];
        else nextRc[la.key] = used;
        return nextRc;
      });
    }
    setCurrent(la.index);
    cardShownAtRef.current = Date.now();
  }, [lastAnswer, done, clearUndoWindow, stopSpeech]);

  // ── «Добить: Ещё учу (N)» — второй раунд по ошибочным ─────────────────────
  const handleRetryWrong = useCallback(() => {
    if (!result) return;
    const learn = new Set(result.summary.learnKeys);
    const seen = new Set<string>();
    const retryCards: CardData[] = [];
    for (const c of queue) {
      if (learn.has(c.key) && !seen.has(c.key)) {
        seen.add(c.key);
        retryCards.push(c);
      }
    }
    if (retryCards.length === 0) return;

    eventsRef.current = [];
    pendingResultsRef.current = [];
    finishingRef.current = false;
    flushedRef.current = false;
    setRepeatCounts({});
    setSegments([]);
    setQueue(retryCards);
    setCurrent(0);
    setResult(null);
    setDone(false);
    cardShownAtRef.current = Date.now();
  }, [result, queue]);

  const speakCurrent = useCallback(() => {
    const card = queue[current];
    if (card) speak(card.en, undefined, { language: 'en-US' });
  }, [queue, current, speak]);

  /** Заголовок: обычная сессия — «Слова»; deck-сессия — имя колоды (§3.7). */
  const headerTitle = useMemo(() => {
    if (!deckRef) return triLang(lang, { ru: 'Слова', uk: 'Слова', es: 'Palabras' });
    if (deckRef.kind === 'saved') {
      return triLang(lang, { ru: 'Сохранённые', uk: 'Збережені', es: 'Guardadas' });
    }
    if (deckRef.kind === 'custom') {
      return triLang(lang, { ru: 'Мои карточки', uk: 'Мої картки', es: 'Mis tarjetas' });
    }
    return triLang(lang, { ru: 'Набор карточек', uk: 'Набір карток', es: 'Pack de tarjetas' });
  }, [deckRef, lang]);

  if (loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#888' }}>…</Text>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (done) {
    const summary = result?.summary ?? summarizeSession([]);
    return (
      <SessionResultScreen
        correct={summary.correct}
        wrong={summary.wrong}
        xpGained={result?.xp ?? 0}
        outcome={result?.outcome ?? null}
        learnLeft={summary.learnKeys.length}
        onRetryWrong={summary.learnKeys.length > 0 ? handleRetryWrong : undefined}
        onDone={() => { fcHaptic('tap'); router.back(); }}
        accentColor={ACCENT}
      />
    );
  }

  const card = queue[current];
  const hasNext = !!queue[current + 1];

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { fcHaptic('tap'); router.back(); }} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
              {headerTitle}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption }}>
              {Math.min(current + 1, queue.length)} / {queue.length}
            </Text>
          </View>

          {/* Сегментированный прогресс-бар: сегмент на карточку очереди (§3.5) */}
          <View style={styles.segmentsRow} testID="fc-session-progress">
            {queue.map((_, i) => {
              const state: SegmentState | 'current' | 'pending' =
                i < segments.length ? segments[i] : i === current ? 'current' : 'pending';
              const bg =
                state === 'correct' ? t.correct
                : state === 'wrong' ? '#FFA24A'
                : state === 'current' ? ACCENT
                : t.bgSurface;
              return (
                <View
                  key={i}
                  style={[styles.segment, { backgroundColor: bg, opacity: state === 'pending' ? 0.7 : 1 }]}
                />
              );
            })}
          </View>

          {/* Строка undo — высота зарезервирована, layout не прыгает */}
          <View style={styles.undoRow}>
            {lastAnswer ? (
              <TouchableOpacity
                onPress={handleUndo}
                testID="fc-undo"
                style={[styles.undoBtn, { borderColor: t.border, backgroundColor: t.bgCard }]}
              >
                <Ionicons name="arrow-undo" size={14} color={t.textMuted} />
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Вернуть', uk: 'Повернути', es: 'Deshacer' })}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Стек: следующая карточка под текущей */}
          <View style={styles.deckArea}>
            <View style={styles.stackWrap}>
              {hasNext && (
                <View
                  pointerEvents="none"
                  style={[styles.nextShell, { backgroundColor: t.bgCard, borderColor: t.border }]}
                />
              )}
              {card && (
                <PhraseCard
                  key={`${current}-${card.key}`}
                  mode="grade"
                  en={card.en}
                  flipped={false}
                  muted
                  minHeight={CARD_MIN_H}
                  onGrade={handleGrade}
                  onSpeakFront={speakCurrent}
                  gradeLabels={{
                    know: triLang(lang, { ru: 'Верно', uk: 'Вірно', es: 'Correcto' }),
                    learn: triLang(lang, { ru: 'Неверно', uk: 'Невірно', es: 'Incorrecto' }),
                  }}
                  renderFront={() => (
                    <View style={styles.cardFace}>
                      <Text style={[styles.wordEn, { color: t.textPrimary, fontSize: f.h1 }]}>
                        {card.en}
                      </Text>
                      <View style={[styles.divider, { backgroundColor: t.border }]} />
                      <Text style={[styles.wordRu, { color: t.textMuted, fontSize: f.bodyLg }]}>
                        {card.shownTranslation}
                      </Text>
                      <Text style={[styles.question, { color: t.textMuted, fontSize: f.caption }]}>
                        {triLang(lang, {
                          ru: 'Перевод верный?',
                          uk: 'Переклад правильний?',
                          es: '¿La traducción es correcta?',
                        })}
                      </Text>
                    </View>
                  )}
                  testID="fc-words-card"
                />
              )}
            </View>
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
  segmentsRow: {
    flexDirection: 'row',
    gap: 3,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  undoRow: {
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deckArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  stackWrap: { width: '100%' },
  nextShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_MIN_H + 4,
    borderRadius: 24,
    borderWidth: 1,
    opacity: 1,
    transform: [{ scale: 0.93 }, { translateY: 24 }],
  },
  cardFace: { alignItems: 'center', width: '100%', paddingVertical: 10 },
  wordEn: { fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  divider: { width: 48, height: 1, marginBottom: 16 },
  wordRu: { fontWeight: '600', textAlign: 'center' },
  question: { marginTop: 22, textAlign: 'center', fontWeight: '600' },
});
