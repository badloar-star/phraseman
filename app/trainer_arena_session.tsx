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
import TapScale from '../components/TapScale';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ScreenGradient from '../components/ScreenGradient';
import ReportErrorButton from '../components/ReportErrorButton';
import BounceView from '../components/BounceView';
import ContentWrap from '../components/ContentWrap';
import CompassDepthSurface from '../components/CompassDepthSurface';
import GradientProgressBar from '../components/GradientProgressBar';
import { screenTextOnGradient } from '../constants/theme';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useCorrectSound } from '../hooks/use-correct-sound';
import { useSpeakAnswer } from '../hooks/use-speak-answer';
import {
  getCachedDueItems,
  getDueItems,
  getTrainerPremiumItemsForPlanQueue,
  markTrainerResult,
  type TrainerItem,
} from './trainer_store';
import { updateMultipleTaskProgress, type TaskType } from './daily_tasks';
import { consumeTrainerSessionEntry, hasReservedTrainerSessionEntrySync } from './trainer_session';
import { isFeatureFreeForEveryone } from './feature_gates';
import { getVerifiedPremiumStatus } from './premium_guard';
import { logTrainerDirectGateBlocked } from './firebase';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import TrainerSessionReport from './trainer_session_report';
import { checkAchievements } from './achievements';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import { shuffle } from './utils_shuffle';
import {
  markTrainerPlanTaskCompleted,
  readTrainerPlanTaskContext,
  type TrainerPlanTaskRouteParams,
} from './trainer_plan_task_route';

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
  const params = useLocalSearchParams<TrainerPlanTaskRouteParams>();
  const { theme: t, f, themeMode } = useTheme();
  const isCompassTheme = false;
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const trainerGateOpen = trainerSessionContentAvailableForTarget(studyTarget);
  const { playCorrect } = useCorrectSound();
  const { speakAnswer } = useSpeakAnswer();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const planTrainerContext = useMemo(() => readTrainerPlanTaskContext({
    mode: params.mode,
    planDayIndex: params.planDayIndex,
    planId: params.planId,
    planInstanceId: params.planInstanceId,
    planTaskId: params.planTaskId,
    planTrainerTask: params.planTrainerTask,
    requiredItems: params.requiredItems,
  }), [
    params.mode,
    params.planDayIndex,
    params.planId,
    params.planInstanceId,
    params.planTaskId,
    params.planTrainerTask,
    params.requiredItems,
  ]);
  const instantItems = useMemo(
    () => !planTrainerContext.taskId && hasReservedTrainerSessionEntrySync('/trainer_arena_session', studyTarget)
      ? shuffleArenaOptions(getCachedDueItems('arena', 15, studyTarget))
      : [],
    [planTrainerContext.taskId, studyTarget],
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
  const planTrainerCompletionTracked = useRef(false);

  useEffect(() => {
    void (async () => {
      if (!trainerGateOpen) {
        setAccessReady(true);
        setLoading(false);
        return;
      }
      if (planTrainerContext.taskId) {
        const planAllowed = isFeatureFreeForEveryone('smart_trainer') || await getVerifiedPremiumStatus();
        if (!planAllowed) {
          logTrainerDirectGateBlocked('/trainer_arena_session');
          // Снимаем экран тренажёра со стека «назад»: при закрытии пейвола
          // возврат сюда снова упёрся бы в этот же гейт → пейвол открывался бы
          // заново «на месте» бесконечно. Уходим на реальный предыдущий экран.
          markNextNavigationAsReplace();
          router.replace({ pathname: '/premium_modal', params: { context: 'smart_trainer', source: 'smart_trainer_lock' } } as any);
          return;
        }
      } else {
        const allowed = await consumeTrainerSessionEntry('/trainer_arena_session', studyTarget);
        // «Пульт»: если режимы тренера переведены в «Фри» — дневной лимит снят для всех.
        if (!allowed && !isFeatureFreeForEveryone('trainer_modes')) {
          logTrainerDirectGateBlocked('/trainer_arena_session');
          // см. коммент выше: убираем тренажёр из стека, чтобы «назад» с пейвола
          // не вернулось на исчерпанный лимит и не открыло пейвол снова.
          markNextNavigationAsReplace();
          router.replace({ pathname: '/premium_modal', params: { context: 'trainer_limit' } } as any);
          return;
        }
      }
      setAccessReady(true);
      const loaded = planTrainerContext.taskId
        ? await getTrainerPremiumItemsForPlanQueue(
            planTrainerContext.planInstanceId,
            planTrainerContext.mode,
            'arena',
            planTrainerContext.requiredItems,
            studyTarget,
          )
        : await getDueItems('arena', 15, studyTarget);
      if (loaded.length === 0) { setDone(true); setLoading(false); return; }
      setItems(shuffleArenaOptions(loaded));
      setLoading(false);
    })();
  }, [planTrainerContext, router, studyTarget, trainerGateOpen]);

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
      playCorrect();
      speakAnswer(item.key, studyTarget);
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
  }, [locked, items, current, correct, wrong, flash, studyTarget, playCorrect, speakAnswer]);

  useEffect(() => {
    if (!done || !planTrainerContext.taskId || planTrainerCompletionTracked.current) return;
    planTrainerCompletionTracked.current = true;
    void markTrainerPlanTaskCompleted(planTrainerContext, studyTarget);
  }, [done, planTrainerContext, studyTarget]);

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
            <BounceView style={{ flex: 1 }}>
            <TrainerSessionReport
              queue="arena"
              correct={correct}
              wrong={wrong}
              total={items.length || correct + wrong}
              accent="#E05050"
              onDone={() => { hapticTap(); safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any); }}
              onPracticeMore={() => { hapticTap(); router.replace('/trainer' as any); }}
            />
            </BounceView>
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
          <BounceView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.headerRow}>
            <TapScale onPress={() => safeRouterBack(router, planTrainerContext.taskId ? '/personal_plan' as any : '/trainer' as any)} style={{ padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={sx.primary} />
            </TapScale>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ReportErrorButton
                variant="icon-flag"
                screen="trainer_arena"
                dataId={`trainer_arena_${item?.key ?? 'unknown'}`}
                dataText={`${q.question} | ${q.options.join(' / ')} | ✓ ${q.correct}`}
                accessibilityLabel="Сообщить об ошибке в вопросе"
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.bgCard }}
              />
            </View>
          </View>

          {/* Прогресс */}
          <GradientProgressBar
            progress={items.length > 0 ? current / items.length : 0}
            accent={isCompassTheme ? COMPASS_RICH.champagne : '#E05050'}
            style={styles.progressBar}
          />

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
              isCompassTheme && compassShadow(2),
              {
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineStrong : 'transparent',
                borderWidth: 0,
                borderRadius: isCompassTheme ? 10 : 18,
                opacity: flashAnim,
                overflow: isCompassTheme ? 'hidden' : 'visible',
              },
            ]}>
              {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
              <Text style={[styles.questionText, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                {q.question}
              </Text>
            </Animated.View>

            {/* Варианты */}
            <View style={{ gap: 10 }}>
              {q.options.map((opt, i) => {
                const state = btnStates[i];
                let bg = isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard;
                let bc = isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border;
                let tc = t.textPrimary;
                if (state === 'correct') { bg = isCompassTheme ? COMPASS_RICH.washStrong : '#40C080' + '22'; bc = isCompassTheme ? COMPASS_RICH.hairlineStrong : '#40C080'; tc = isCompassTheme ? COMPASS_RICH.champagne : '#40C080'; }
                if (state === 'wrong')   { bg = isCompassTheme ? COMPASS_RICH.copperWash : '#E05050' + '22'; bc = isCompassTheme ? COMPASS_RICH.copper : '#E05050'; tc = isCompassTheme ? COMPASS_RICH.peach : '#E05050'; }
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => void pick(i)}
                    disabled={locked}
                    style={[styles.optionBtn, isCompassTheme && compassShadow(state === 'idle' ? 1 : 2), { backgroundColor: bg, borderColor: bc, borderWidth: 0, borderRadius: isCompassTheme ? 9 : 18, overflow: isCompassTheme ? 'hidden' : 'visible' }]}
                  >
                    {isCompassTheme ? <CompassDepthSurface radius={9} selected={state !== 'idle'} quiet={state === 'idle'} /> : null}
                    <Text style={[styles.optionText, { color: tc, fontSize: f.body }]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          </BounceView>
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
  progressBar: { marginHorizontal: 16 },
  questionBox: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  questionText: { fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  optionBtn: {
    borderRadius: 14,
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
    borderWidth: 0,
    overflow: 'hidden',
    marginBottom: 32,
    width: '100%',
  },
  doneStat: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  doneBtn: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, width: '100%' },
  doneBtnText: { color: '#fff', fontWeight: '800' },
});
