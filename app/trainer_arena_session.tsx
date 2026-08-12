// ═══════════════════════════════════════════════════════════════════════════
// trainer_arena_session.tsx — Сессия арены: 4 варианта ответа
// Тот же интерфейс что в арене — вопрос с пропуском + 4 кнопки.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
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
import SessionResultScreen from './flashcards/SessionResultScreen';
import {
  autoSpeakAfterSfx,
  cancelPendingFcTts,
  fcHaptic,
  setFcTtsSpeaker,
} from './flashcards/SoundService';
import { awardSessionStars, type AwardStarsOutcome } from './flashcards/stars_system';
import {
  requeueAfterMistake,
  summarizeSession,
  type SessionAnswerEvent,
  type SessionOutcomeSummary,
} from './flashcards/session_queue';

type BtnState = 'idle' | 'correct' | 'wrong';

/** Cards 2.0 E5: XP +5/верный ответ (паритет с review, §3.6 мастер-плана). */
const XP_PER_CORRECT = 5;
const ACCENT = '#E05050';

export default function TrainerArenaSession() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { speak, stop: stopSpeech } = useAudio();

  // E9: инъекция реального TTS в очередь SoundService (SFX → 120мс → TTS);
  // на выходе — отменить отложенную речь и заглушить текущую.
  useEffect(() => {
    setFcTtsSpeaker(speak);
    return () => {
      setFcTtsSpeaker(null);
      cancelPendingFcTts();
      stopSpeech();
    };
  }, [speak, stopSpeech]);

  const [items, setItems] = useState<TrainerItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [btnStates, setBtnStates] = useState<BtnState[]>(['idle', 'idle', 'idle', 'idle']);
  const [locked, setLocked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const flashAnim = useRef(new Animated.Value(1)).current;
  // E5: каркас результата — кэп повторов, журнал ответов, звёзды/XP
  const [repeatCounts, setRepeatCounts] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    summary: SessionOutcomeSummary;
    outcome: AwardStarsOutcome | null;
    xp: number;
  } | null>(null);
  const eventsRef = useRef<SessionAnswerEvent[]>([]);
  const finishingRef = useRef(false);
  const cardShownAtRef = useRef(Date.now());

  useEffect(() => {
    void (async () => {
      // Дневной лимит тренера (§4): free — 1 сессия/день на весь тренер, премиум — безлимит
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
      const loaded = await getDueItems('arena', 15);
      if (loaded.length === 0) { setDone(true); setLoading(false); return; }
      if (!premium) void markFreeSessionUsed();
      setItems(loaded);
      cardShownAtRef.current = Date.now();
      setLoading(false);
    })();
  }, [router]);

  const finishSession = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const summary = summarizeSession(eventsRef.current);
    // Звёзды (§4: тренер; выбор из 4 → порог 3★ choice 5с)
    let outcome: AwardStarsOutcome | null = null;
    if (summary.total > 0) {
      outcome = await awardSessionStars('trainer', {
        correct: summary.correct,
        total: summary.total,
        avgAnswerSec: summary.avgAnswerSec,
        inputKind: 'choice',
      }).catch(() => null);
    }
    // XP +5/верный, одним начислением в финале
    let xp = summary.correct * XP_PER_CORRECT;
    if (xp > 0) {
      try {
        const r = await registerXP(xp, 'trainer_answer', '', lang);
        xp = r.finalDelta;
      } catch {}
    }
    setResult({ summary, outcome, xp });
    setDone(true);
  }, [lang]);

  const flash = useCallback((ok: boolean) => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.5, duration: 80, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [flashAnim]);

  const pick = useCallback(async (optIdx: number) => {
    if (locked) return;
    const item = items[current];
    if (!item?.arenaQuestion) return;

    setLocked(true);
    const correctAnswer = item.arenaQuestion.correct;
    const options = item.arenaQuestion.options;
    const isOk = options[optIdx] === correctAnswer;

    const newStates: BtnState[] = options.map((opt, i) => {
      if (opt === correctAnswer) return 'correct';
      if (i === optIdx && !isOk) return 'wrong';
      return 'idle';
    });
    setBtnStates(newStates);

    // E9: SFX → 120мс → автоозвучка полной EN-фразы (пропуск «___» заполняется
    // правильным ответом — ключ арены хранит вопрос с пропуском); хаптика §5
    const fullSentence = item.arenaQuestion.question.replace(/_+/g, correctAnswer);
    fcHaptic(isOk ? 'correct' : 'wrong');
    autoSpeakAfterSfx(fullSentence, {
      sfx: isOk ? 'correct' : 'incorrect',
      language: 'en-US',
    });
    if (isOk) {
      setCorrect(c => c + 1);
    } else {
      setWrong(c => c + 1);
    }
    flash(isOk);
    eventsRef.current.push({
      key: item.key,
      correct: isOk,
      ms: Date.now() - cardShownAtRef.current,
    });

    // «Ошибка → в конец очереди», максимум 2 повтора карточки (§3.5)
    let nextItems = items;
    if (!isOk) {
      const rq = requeueAfterMistake(items, item, item.key, repeatCounts);
      nextItems = rq.queue;
      setItems(rq.queue);
      setRepeatCounts(rq.repeatCounts);
    }

    await markTrainerResult(item.key, 'arena', isOk);

    setTimeout(() => {
      const next = current + 1;
      if (next >= nextItems.length) {
        void finishSession();
      } else {
        setCurrent(next);
        setBtnStates(['idle', 'idle', 'idle', 'idle']);
        setLocked(false);
        cardShownAtRef.current = Date.now();
      }
    }, isOk ? 700 : 1100);
  }, [locked, items, current, flash, repeatCounts, finishSession]);

  // «Добить: Ещё учу (N)» — второй раунд по ошибочным вопросам
  const handleRetryWrong = useCallback(() => {
    if (!result) return;
    const learn = new Set(result.summary.learnKeys);
    const seen = new Set<string>();
    const retry: TrainerItem[] = [];
    for (const it of items) {
      if (learn.has(it.key) && !seen.has(it.key)) {
        seen.add(it.key);
        retry.push(it);
      }
    }
    if (retry.length === 0) return;
    eventsRef.current = [];
    finishingRef.current = false;
    setRepeatCounts({});
    setItems(retry);
    setCurrent(0);
    setCorrect(0);
    setWrong(0);
    setBtnStates(['idle', 'idle', 'idle', 'idle']);
    setLocked(false);
    setResult(null);
    setDone(false);
    cardShownAtRef.current = Date.now();
  }, [result, items]);

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
    const summary = result?.summary ?? summarizeSession(eventsRef.current);
    return (
      <SessionResultScreen
        correct={summary.correct}
        wrong={summary.wrong}
        xpGained={result?.xp ?? 0}
        outcome={result?.outcome ?? null}
        learnLeft={summary.learnKeys.length}
        onRetryWrong={summary.learnKeys.length > 0 ? handleRetryWrong : undefined}
        onDone={() => { hapticTap(); router.back(); }}
        accentColor={ACCENT}
      />
    );
  }

  const item = items[current];
  const q = item?.arenaQuestion;
  if (!q) return null;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => { hapticTap(); router.back(); }} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: t.textPrimary, fontSize: f.body }]}>
              {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' })}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption }}>
              {current + 1} / {items.length}
            </Text>
          </View>

          {/* Прогресс */}
          <View style={[styles.progressBar, { backgroundColor: t.bgSurface }]}>
            <View style={[styles.progressFill, {
              backgroundColor: '#E05050',
              width: `${(current / items.length) * 100}%`,
            }]} />
          </View>

          <View style={{ flex: 1, padding: 16, gap: 16, justifyContent: 'center' }}>
            {/* Правило/тема (если есть) */}
            {q.rule ? (
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600', textAlign: 'center' }}>
                {q.rule}
              </Text>
            ) : null}

            {/* Вопрос */}
            <Animated.View style={[
              styles.questionBox,
              { backgroundColor: t.bgCard, borderColor: t.border, opacity: flashAnim },
            ]}>
              <Text style={[styles.questionText, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                {q.question}
              </Text>
            </Animated.View>

            {/* Варианты */}
            <View style={{ gap: 10 }}>
              {q.options.map((opt, i) => {
                const state = btnStates[i];
                let bg = t.bgCard;
                let bc = t.border;
                let tc = t.textPrimary;
                if (state === 'correct') { bg = '#40C080' + '22'; bc = '#40C080'; tc = '#40C080'; }
                if (state === 'wrong')   { bg = '#E05050' + '22'; bc = '#E05050'; tc = '#E05050'; }
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => void pick(i)}
                    disabled={locked}
                    style={[styles.optionBtn, { backgroundColor: bg, borderColor: bc }]}
                  >
                    <Text style={[styles.optionText, { color: tc, fontSize: f.body }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
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
  progressBar: { height: 4, borderRadius: 2, marginHorizontal: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  questionBox: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  questionText: { fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  optionBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  optionText: { fontWeight: '700' },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  doneTitle: { fontWeight: '800', marginBottom: 24, textAlign: 'center' },
  doneStats: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 32,
    width: '100%',
  },
  doneStat: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  doneBtn: { borderRadius: 16, paddingHorizontal: 48, paddingVertical: 14 },
  doneBtnText: { color: '#fff', fontWeight: '800' },
});
