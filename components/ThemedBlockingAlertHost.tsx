import React, { memo, useEffect, useReducer, useRef } from 'react';
import { GlassAlertDialog } from './v2/GlassAlertDialog';
import { AccountRestoreSummaryDialog } from './account/AccountRestoreSummaryDialog';
import {
  getThemedBlockingAlertHead,
  noteThemedBlockingAlertHostState,
  resolveThemedBlockingAlertHead,
  subscribeThemedBlockingAlertQueue,
} from '../app/themed_blocking_alert_queue';
import { useOverlayActiveKey, useOverlayVisible } from './OverlayArbiter';

/**
 * Рендерит очередь инфо-алертов из themed_blocking_alert_queue (модерация и т.п.).
 */
function ThemedBlockingAlertHost() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeThemedBlockingAlertQueue(() => bump()), []);
  const head = getThemedBlockingAlertHead();
  const arbiterVisible = useOverlayVisible('themedAlert', head != null);
  // зачем (ревью Ядра 2dba22af6, координатор 13.10): окно, попросившее потолок ожидания (slotWait), по его истечении
  // показывается поверх владельца слота — иначе вход («Восстановить аккаунт?») ждал молча, пока человек не закроет чужую модалку.
  const visible = arbiterVisible || head?.forceVisible === true;
  // зачем (прогон Сверки 11.10, 🔴 окно подтверждения смены в онбординге «показано», но не видно): пишем на каждую смену
  // (окно в очереди / видно / кем занят арбитр). Ждём слот дольше секунды = кто-то держит его, это и есть причина.
  const activeOverlay = useOverlayActiveKey();
  const headTitle = head?.title ?? null;
  const forced = head?.forceVisible === true;
  useEffect(() => {
    noteThemedBlockingAlertHostState({ visible, arbiterActive: activeOverlay, headTitle });
    if (headTitle == null) return;
    console.log('[AUTH-SWITCH-OFFER] alert host', JSON.stringify({ title: headTitle.slice(0, 48), visible, forced, arbiterActive: activeOverlay }));
  }, [headTitle, visible, forced, activeOverlay]);
  // зачем (координатор 25.10, макет account-delete-variant-b §3): окно со сводкой («Восстановить аккаунт?» в новом виде).
  // Последнее окно со сводкой держим, пока оболочка доигрывает выход, — иначе при опустевшей очереди карточка пропала бы рывком.
  const lastSummaryHeadRef = useRef<typeof head>(null);
  if (head) lastSummaryHeadRef.current = head.summary ? head : null;
  const summaryHead = head?.summary ? head : head == null ? lastSummaryHeadRef.current : null;
  if (summaryHead?.summary) {
    return (
      <AccountRestoreSummaryDialog
        visible={visible && head != null}
        title={summaryHead.title}
        message={summaryHead.message}
        cells={summaryHead.summary.cells}
        actions={summaryHead.actions.map((action) => ({
          label: action.label,
          ghost: action.ghost,
          onPress: () => { resolveThemedBlockingAlertHead(action.value); },
        }))}
        onRequestClose={() => {
          resolveThemedBlockingAlertHead();
        }}
      />
    );
  }
  return (
    // зачем (Сверка overlays-runtime, 05.10): инфо-окно с одной «OK» — по центру (`.or-alert`), а не шторкой выбора.
    <GlassAlertDialog
      visible={visible}
      title={head?.title ?? ''}
      message={head?.message || undefined}
      icon={head?.icon}
      // зачем (Дизайн 05.10, 014/038/039): все кнопки окна; нажатая возвращает своё значение вызывающему.
      actions={head ? head.actions.map((action) => ({
        label: action.label,
        ghost: action.ghost,
        onPress: () => { resolveThemedBlockingAlertHead(action.value); },
      })) : []}
      onRequestClose={() => {
        resolveThemedBlockingAlertHead();
      }}
    />
  );
}

export default memo(ThemedBlockingAlertHost);
