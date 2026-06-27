import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { hapticTap } from '../hooks/use-haptics';
import { getTrainerPremiumItemsForPlan, type TrainerQueue } from './trainer_store';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import {
  readTrainerPlanTaskContext,
  type TrainerPlanTaskRouteParams,
} from './trainer_plan_task_route';

function routeForQueue(queue: TrainerQueue): '/trainer_words_session' | '/trainer_phrases_session' | '/trainer_arena_session' {
  if (queue === 'words') return '/trainer_words_session';
  if (queue === 'arena') return '/trainer_arena_session';
  return '/trainer_phrases_session';
}

export default function TrainerPlanSession() {
  const router = useRouter();
  const params = useLocalSearchParams<TrainerPlanTaskRouteParams>();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f } = useTheme();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const context = readTrainerPlanTaskContext({
        mode: params.mode,
        planDayIndex: params.planDayIndex,
        planId: params.planId,
        planInstanceId: params.planInstanceId,
        planTaskId: params.planTaskId,
        planTrainerTask: params.planTrainerTask,
        requiredItems: params.requiredItems,
      });
      if (!context.taskId) {
        // Транзитный экран: уходим на тренер «вместо» себя, поэтому помечаем replace —
        // иначе этот пустой роут остаётся в честном стеке и «назад» из тренера вернёт сюда.
        markNextNavigationAsReplace();
        router.replace('/trainer' as any);
        return;
      }

      const items = await getTrainerPremiumItemsForPlan(
        context.planInstanceId,
        context.mode,
        Math.max(context.requiredItems, 12),
        studyTarget,
      ).catch(() => []);
      if (cancelled) return;

      const firstQueue = items[0]?.queue;
      if (!firstQueue) {
        setFailed(true);
        return;
      }

      // Этот экран — чистый редиректор на реальную сессию тренера. Свапаем себя
      // через replace + пометку, иначе trainer_plan_session остаётся в стеке и
      // «назад» из сессии возвращает сюда → бесконечный re-redirect в сессию.
      markNextNavigationAsReplace();
      router.replace({
        pathname: routeForQueue(firstQueue),
        params: {
          mode: context.mode,
          planTrainerTask: '1',
          requiredItems: String(context.requiredItems),
          planTaskId: context.taskId,
          planInstanceId: context.planInstanceId,
          planId: context.planId,
          planDayIndex: String(context.dayIndex),
        },
      } as any);
    })();
    return () => { cancelled = true; };
  }, [
    params.mode,
    params.planDayIndex,
    params.planId,
    params.planInstanceId,
    params.planTaskId,
    params.planTrainerTask,
    params.requiredItems,
    router,
    studyTarget,
  ]);

  if (failed) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="sparkles-outline" size={38} color={t.textMuted} />
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
            Нет готовых ошибок для тренировки
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>
            Задание появится снова, когда в маршруте накопится свежий материал.
          </Text>
          <TouchableOpacity
            onPress={() => { hapticTap(); safeRouterBack(router, '/personal_plan' as any); }}
            style={{ marginTop: 22, backgroundColor: t.accent, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#07110A', fontSize: f.sub, fontWeight: '900' }}>К плану</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />
      </SafeAreaView>
    </ScreenGradient>
  );
}
