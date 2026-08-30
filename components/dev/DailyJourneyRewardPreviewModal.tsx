import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import type { DailyJourneyGiftOccurrenceV1 } from '../../app/daily_journey_gift_inbox';
import { emitAppEvent } from '../../app/events';
import DailyJourneyRevealScene, {
  type DailyJourneyRevealSceneHandle,
  type DailyJourneyRevealTarget,
} from '../daily_journey/DailyJourneyRevealScene';
import { measureDailyJourneyRevealTarget } from '../daily_journey/dailyJourneyRevealTargetBridge';
import { normalizeDailyJourneyDay, type DailyJourneyRewardPayload } from './dailyJourneyRewardPreviewModel';

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
  reward: _reward,
  targetRect,
  day,
  run,
  onLanded,
  onDeliveryComplete,
  onDelivered,
}: Props) {
  const sceneRef = useRef<DailyJourneyRevealSceneHandle | null>(null);
  // зачем: цель полёта замеряется ДО показа сцены и фиксируется на весь run —
  // если отдать targetPoint позже, сцена перезапустила бы хореографию
  // (у её эффекта в зависимостях startFlight, который зависит от цели).
  const [stage, setStage] = useState<{ targetPoint: DailyJourneyRevealTarget | null } | null>(null);
  const landedOccurrenceRef = useRef<string | null>(null);
  const completedRunRef = useRef<number | null>(null);
  const deliveryDay = occurrence?.day ?? day;

  useEffect(() => {
    if (!visible) {
      setStage(null);
      return undefined;
    }
    let alive = true;
    const directTarget = targetRectToPoint(targetRect);
    const measuredTarget = directTarget ? Promise.resolve(directTarget) : measureDailyJourneyRevealTarget();
    void measuredTarget.then((targetPoint) => {
      // Экран под Modal уже не скроллится — точка стабильна до конца полёта.
      if (alive) setStage({ targetPoint });
    });
    return () => {
      alive = false;
    };
  }, [run, targetRect, visible]);

  useEffect(() => {
    if (!visible) return;
    landedOccurrenceRef.current = null;
    completedRunRef.current = null;
  }, [run, visible]);

  const skipToDelivery = useCallback(() => {
    sceneRef.current?.skipToDelivery();
  }, []);

  const handleDelivered = useCallback(() => {
    // зачем (спека, п. 5.8): landing acknowledgement — главная по событию
    // пульсирует карточку «Статистика» и перечитывает inbox подарков.
    emitAppEvent('daily_journey_delivered', {
      day: normalizeDailyJourneyDay(deliveryDay),
      occurrenceId: occurrence?.operationId ?? null,
    });
    if (occurrence && landedOccurrenceRef.current !== occurrence.operationId) {
      landedOccurrenceRef.current = occurrence.operationId;
      onLanded?.(occurrence.operationId);
    }
    if (completedRunRef.current === run) return;
    completedRunRef.current = run;
    onDeliveryComplete?.();
    onDelivered?.();
  }, [deliveryDay, occurrence, onDelivered, onDeliveryComplete, onLanded, run]);

  const sceneVisible = visible && stage !== null;
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
          run={run}
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
