import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import type { DailyJourneyGiftOccurrenceV1 } from '../../app/daily_journey_gift_inbox';
import { emitAppEvent } from '../../app/events';
import DailyJourneyRevealScene, {
  type DailyJourneyRevealSceneHandle,
  type DailyJourneyRevealTarget,
} from '../daily_journey/DailyJourneyRevealScene';
import { measureDailyJourneyRevealTarget } from '../daily_journey/dailyJourneyRevealTargetBridge';
import { normalizeDailyJourneyDay, type DailyJourneyRewardPayload } from '../../app/daily_journey_rewards';

// зачем: владелец заменил старую dev-модалку с кнопками решения на «супер
// премиальную» сцену DailyJourneyRevealScene (спека
// docs/superpowers/specs/2026-08-30-daily-journey-gift-inbox-design.md).
// Эта обёртка — только Modal-хост: звук, хореография и кнопка «Пропустить»
// живут в самой сцене. Android back и accessibility dismiss ведут себя как
// «Пропустить» (спека, п. 1): доставку не отменяют, а ускоряют полёт.
// Превью ничего не начисляет — durable occurrence здесь не создаётся.

export type DailyJourneyRewardDeliveryTargetRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

type Props = Readonly<{
  visible: boolean;
  /** Durable gift supplied by the production host before any reveal starts. */
  occurrence?: DailyJourneyGiftOccurrenceV1;
  /** The exact payload is accepted for hosts that retain occurrence separately. */
  reward?: DailyJourneyRewardPayload;
  /** Measured Statistics-card rect; a missing/invalid rect uses scene fallback. */
  targetRect?: DailyJourneyRewardDeliveryTargetRect | null;
  day: number;
  cycle?: number;
  run: number;
  /** Landing acknowledgement for a real committed occurrence. */
  onLanded?: (occurrenceId: string) => void;
  /** Fires once after normal or reduced-motion delivery. */
  onDeliveryComplete?: () => void;
  /** @deprecated DevHub preview compatibility; use onDeliveryComplete. */
  onDelivered?: () => void;
}>;

function targetRectToPoint(targetRect: DailyJourneyRewardDeliveryTargetRect | null | undefined): DailyJourneyRevealTarget | null {
  if (!targetRect
    || !Number.isFinite(targetRect.x)
    || !Number.isFinite(targetRect.y)
    || !Number.isFinite(targetRect.width)
    || !Number.isFinite(targetRect.height)
    || targetRect.width <= 0
    || targetRect.height <= 0) return null;
  return { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 };
}

export default function DailyJourneyRewardPreviewModal({
  visible,
  occurrence,
  reward,
  targetRect,
  day,
  cycle,
  run,
  onLanded,
  onDeliveryComplete,
  onDelivered,
}: Props) {
  const sceneRef = useRef<DailyJourneyRevealSceneHandle | null>(null);
  // зачем: цель полёта замеряется ДО показа сцены и фиксируется на весь run —
  // если отдать targetPoint позже, сцена перезапустила бы хореографию
  // (у её эффекта в зависимостях startFlight, который зависит от цели).
  const [stage, setStage] = useState<{ identity: string; targetPoint: DailyJourneyRevealTarget | null } | null>(null);
  const landedOccurrenceRef = useRef<string | null>(null);
  const completedIdentityRef = useRef<string | null>(null);
  const deliveryDay = occurrence?.day ?? day;
  const deliveryCycle = occurrence?.cycle ?? cycle ?? 1;
  const identity = occurrence ? `${run}:${occurrence.operationId}` : `preview:${run}:${deliveryDay}`;
  const callbacksRef = useRef({ occurrence, onLanded, onDeliveryComplete, onDelivered, deliveryDay });
  callbacksRef.current = { occurrence, onLanded, onDeliveryComplete, onDelivered, deliveryDay };

  // A target rect is intentionally captured once per delivery identity; a Home
  // re-measure during flight must never restart a committed sequence.
  useEffect(() => {
    if (!visible) {
      setStage(null);
      return undefined;
    }
    setStage(null);
    const abort = new AbortController();
    let alive = true;
    const directTarget = targetRectToPoint(targetRect);
    const measuredTarget = directTarget ? Promise.resolve(directTarget) : measureDailyJourneyRevealTarget(abort.signal);
    void measuredTarget.then((targetPoint) => {
      // Экран под Modal уже не скроллится — точка стабильна до конца полёта.
      if (alive) setStage({ identity, targetPoint });
    });
    return () => {
      alive = false;
      abort.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, visible]);

  useEffect(() => {
    if (!visible) return;
    landedOccurrenceRef.current = null;
    completedIdentityRef.current = null;
  }, [identity, visible]);

  const skipToDelivery = useCallback(() => {
    sceneRef.current?.skipToDelivery();
  }, []);

  const handleDelivered = useCallback(() => {
    // зачем (спека, п. 5.8): landing acknowledgement — главная по событию
    // пульсирует карточку «Статистика» и перечитывает inbox подарков.
    if (completedIdentityRef.current === identity) return;
    completedIdentityRef.current = identity;
    const current = callbacksRef.current;
    emitAppEvent('daily_journey_delivered', {
      day: normalizeDailyJourneyDay(current.deliveryDay),
      occurrenceId: current.occurrence?.operationId ?? null,
    });
    if (current.occurrence && landedOccurrenceRef.current !== current.occurrence.operationId) {
      landedOccurrenceRef.current = current.occurrence.operationId;
      current.onLanded?.(current.occurrence.operationId);
    }
    current.onDeliveryComplete?.();
    current.onDelivered?.();
  }, [identity]);

  const sceneVisible = visible && stage?.identity === identity;
  return (
    <Modal
      testID="daily-journey-preview-modal"
      visible={sceneVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={skipToDelivery}
    >
      <View style={styles.root} accessibilityViewIsModal onAccessibilityEscape={skipToDelivery}>
        <DailyJourneyRevealScene
          ref={sceneRef}
          visible={sceneVisible}
          day={deliveryDay}
          cycle={deliveryCycle}
          run={run}
          deliveryId={identity}
          reward={occurrence?.reward ?? reward}
          targetPoint={stage?.targetPoint ?? null}
          onDelivered={handleDelivered}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
