// ═══════════════════════════════════════════════════════════════════════════
// DialogsSceneHub.tsx — «Сцена» в боевом хабе «Диалоги» на настоящих данных, с настоящими действиями.
//
// зачем (координатор 22.10: подключение за флагом DIALOGS_SCENE_V2_ENABLED): шапка хаба (название, подпись, энергия, остаток) заменяется сценой; каталог под ней остаётся прежним.
// Данные — use_dialogs_scene_hub (один источник каталога с контейнером). Действия по состоянию:
//   «Начать / Продолжить / Ещё диалог / Пройти ещё раз», круглая кнопка — брифинг следующего диалога (как тап по карточке: замер, прогрев сессии, переход);
//   «Plus снимает лимит» — premium_modal с контекстом dialog_limit; «Повторить» (нет сети) — перечитать кэш каталога;
//   «Включить AI-диалоги» — брифинг следующего диалога: согласие запрашивает уже существующий гейт, сцена его не записывает и экран согласия не трогает.
// Нет каталога для сцены (язык без проверенных диалогов) — рисуется прежняя шапка из пропса `fallback`.
// ═══════════════════════════════════════════════════════════════════════════
import { useRouter } from 'expo-router';
import React, { memo, useCallback } from 'react';
import { View } from 'react-native';

import { markDialogueV2OptimisticTap } from '../../../app/dialogue_v2_optimistic_trace';
import { prestartDialogueV2TextSession } from '../../../app/dialogue_v2_turn_client';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import EnergyBar from '../../EnergyBar';
import { useLang } from '../../LangContext';
import { useStudyTarget } from '../../StudyTargetContext';
import { V2IconButton } from '../../v2/V2Kit';
import DialogsScene from './DialogsScene';
import type { DialogsSceneState } from './dialogs_scene_state';
import { useDialogsSceneHub } from './use_dialogs_scene_hub';

const LOG = '[DIALOGS-SCENE]';

type Props = Readonly<{
  /** Прежняя шапка хаба — когда сцене нечего показать. */
  fallback: React.ReactNode;
  onBack: () => void;
  backLabel: string;
}>;

function DialogsSceneHub({ fallback, onBack, backLabel }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const hub = useDialogsSceneHub();
  const next = hub.model.next;

  const openBriefing = useCallback((scenarioId: string) => {
    // зачем: тот же путь, что у тапа по карточке каталога (DialogsTabContent): замер, прогрев сессии фоном, переход на брифинг
    const supported = studyTarget === 'en' || studyTarget === 'es' || studyTarget === 'fr' || studyTarget === 'de';
    markDialogueV2OptimisticTap('hub_tap', scenarioId, { status: 'available', prestart: supported, studyTarget: String(studyTarget), via: 'scene' });
    if (supported) prestartDialogueV2TextSession({ studyTarget, scenarioId });
    router.push({ pathname: '/dialogue_v2_briefing', params: { scenarioId } } as never);
  }, [router, studyTarget]);

  const openPlus = useCallback(() => {
    router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogue_v2_hub_scene' } } as never);
  }, [router]);

  const act = useCallback((state: DialogsSceneState, via: 'cta' | 'round') => {
    if (state === 'limit' || (via === 'round' && state === 'low')) { openPlus(); return; }
    if (state === 'offline') {
      // зачем (аудит кнопок 22.10, F2): «Повторить» реально перепроверяет сеть (NetInfo.refresh) и перечитывает каталог; пока идёт проверка, повторный тап хук игнорирует с причиной в журнале
      console.log(LOG, 'retry', JSON.stringify({ reason: 'offline_retry_tap', hasNext: next !== null, via })); // guard-ok: одна строка на тап
      void hub.retry();
      return;
    }
    if (!next) {
      console.warn(LOG, 'action:ignored', JSON.stringify({ state, via, reason: 'no_next_dialog' })); // guard-ok: ранний выход называет причину
      return;
    }
    openBriefing(next.id);
  }, [hub, next, openBriefing, openPlus]);

  const onCta = useCallback((state: DialogsSceneState) => act(state, 'cta'), [act]);
  const onRound = useCallback((state: DialogsSceneState) => act(state, 'round'), [act]);

  if (!hub.ready) return <>{fallback}</>;
  return (
    <View testID="dialogs-scene-hub">
      <DialogsScene
        lang={lang}
        input={hub.input}
        dialog={next ? next.info : null}
        following={next ? next.info : null}
        quotaTotal={hub.quotaTotal}
        resetDate={hub.resetDate}
        voicePerDay={hub.voicePerDay}
        personaId={next ? next.personaId : null}
        topInset={insets.top + 8}
        topStart={<V2IconButton testID="ai-dialog-home-back" icon="chevron-back" accessibilityLabel={backLabel} onPress={onBack} />}
        topEnd={<EnergyBar size={30} glass solidBolt />}
        onCta={onCta}
        onRound={onRound}
      />
    </View>
  );
}

export default memo(DialogsSceneHub);
