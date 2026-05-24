// ═══════════════════════════════════════════════════════════════════════════
// trainer_arena_session.tsx — Сессия арены: 4 варианта ответа
// Тот же интерфейс что в арене — вопрос с пропуском + 4 кнопки.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { screenTextOnGradient } from '../constants/theme';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import {
  getCachedDueItems,
  getDueItems,
  markTrainerResult,
  type TrainerItem,
} from './trainer_store';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import { consumeTrainerSessionEntry, hasReservedTrainerSessionEntrySync } from './trainer_session';
import { logTrainerDirectGateBlocked } from './firebase';
import { safeRouterBack } from './navigation_back';
import TrainerSessionReport from './trainer_session_report';
import { checkAchievements } from './achievements';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import { shuffle } from './utils_shuffle';

type BtnState = 'idle' | 'correct' | 'wrong';

function shuffleArenaOptions(items: TrainerItem[]): TrainerItem[] {
  return items.map((item) => item.arenaQuestion
    ? {
      ...item,
      arenaQuestion: {
        ...item.arenaQuestion,
        options: shuffle(item.arenaQuestion.options),
      },
    }
    : item);
}

export default function TrainerArenaSession() {
  const router = useRouter();
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const trainerGateOpen = trainerSessionContentAvailableForTarget(studyTarget);
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const instantItems = useMemo(
    () => hasReservedTrainerSessionEntrySync('/trainer_arena_session', studyTarget)
      ? shuffleArenaOptions(getCachedDueItems('arena', 15, studyTarget))
      : [],
    [studyTarget],
  );

  const [items, setItems] = useState<TrainerItem[]>(() => instantItems);
  const [current, setCurrent] = useState(0);
  const [btnStates, setBtnStates] = useState<BtnState[]>(['idle', 'idle', 'idle', 'idle']);
  const [locked, setLocked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(instantItems.length === 0);
  const [accessReady, setAccessReady] = useState(instantItems.length > 0);
  const flashAnim = useRef(new Animated.Value(1)).current;
  const dailySessionTracked = useRef(false);

  useEffect(() => {
    void (async () => {
      if (!trainerGateOpen) {
        setAccessReady(true);
        setLoading(false);
        return;
      }
      const allowed = await consumeTrainerSessionEntry('/trainer_arena_session', studyTarget);
      if (!allowed) {
        logTrainerDirectGateBlocked('/trainer_arena_session');
        router.replace({ pathname: '/premium_modal', params: { context: 'trainer_limit' } } as any);
        return;
      }
      setAccessReady(true);
      const loaded = await getDueItems('arena', 15, studyTarget);
      if (loaded.length === 0) { setDone(true); setLoading(false); return; }
      setItems(shuffleArenaOptions(loaded));
      setLoading(false);
    })();
  }, [router, studyTarget, trainerGateOpen]);

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

    if (isOk) {
      hapticSuccess();
      setCorrect(c => c + 1);
    } else {
      hapticError();
      setWrong(c => c + 1);
    }
    flash(isOk);

    await markTrainerResult(item.key, 'arena', isOk, studyTarget);
    const nextCorrect = correct + (isOk ? 1 : 0);
    const nextWrong = wrong + (isOk ? 0 : 1);
    const updates: { type: TaskType; increment: number }[] = [];
    if (!dailySessionTracked.current) {
      dailySessionTracked.current = true;
      updates.push({ type: 'recall_session', increment: 1 });
    }
    if (isOk) {
      updates.push({ type: 'recall_answers', increment: 1 });
      updates.push({ type: 'trainer_arena', increment: 1 });
      checkAchievements({ type: 'trainer_correct', correct: 1, studyTarget }).catch(() => {});
    }

    setTimeout(() => {
      const next = current + 1;
      if (next >= items.length) {
        if (items.length >= 5 && nextWrong === 0) updates.push({ type: 'recall_perfect', increment: 1 });
        checkAchievements({
          type: 'trainer_session_result',
          correct: nextCorrect,
          wrong: nextWrong,
          total: items.length,
          studyTarget,
        }).catch(() => {});
        setDone(true);
      } else {
        setCurrent(next);
        setBtnStates(['idle', 'idle', 'idle', 'idle']);
        setLocked(false);
      }
      if (updates.length > 0) updateMultipleTaskProgress(updates, { studyTarget }).catch(() => {});
    }, isOk ? 700 : 1100);
  }, [locked, items, current, correct, wrong, flash, studyTarget]);

  if (!accessReady || loading) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />
      </ScreenGradient>
    );
  }

  if (!trainerGateOpen) {
    const copy = frenchTrainerGateCopy(lang);
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="lock-closed-outline" size={38} color={sx.muted} />
          <Text style={{ color: sx.primary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
            {copy.title}
          </Text>
          <Text style={{ color: sx.muted, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            {copy.body}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/trainer' as any)} style={{ marginTop: 22, backgroundColor: '#E05050', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}>
            <Text style={{ color: '#fff', fontSize: f.sub, fontWeight: '900' }}>{copy.action}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (done) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <TrainerSessionReport
              queue="arena"
              correct={correct}
              wrong={wrong}
              total={items.length || correct + wrong}
              accent="#E05050"
              onDone={() => { hapticTap(); safeRouterBack(router, '/trainer' as any); }}
              onPracticeMore={() => { hapticTap(); router.replace('/trainer' as any); }}
            />
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
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
            <TouchableOpacity onPress={() => { hapticTap(); safeRouterBack(router, '/trainer' as any); }} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TouchableOpacity>
            <Text style={{ color: sx.muted, fontSize: f.caption }}>
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
              <Text style={{ color: sx.muted, fontSize: f.caption, fontWeight: '600', textAlign: 'center' }}>
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
  doneBtn: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, width: '100%' },
  doneBtnText: { color: '#fff', fontWeight: '800' },
});
