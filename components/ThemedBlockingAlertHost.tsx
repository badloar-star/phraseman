import React, { memo, useEffect, useReducer } from 'react';
import { GlassAlertDialog } from './v2/GlassAlertDialog';
import {
  getThemedBlockingAlertHead,
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
  const visible = useOverlayVisible('themedAlert', head != null);
  // зачем (прогон Сверки 11.10, 🔴 окно подтверждения смены в онбординге «показано», но не видно): пишем на каждую смену
  // (окно в очереди / видно / кем занят арбитр). Ждём слот дольше секунды = кто-то держит его, это и есть причина.
  const activeOverlay = useOverlayActiveKey();
  const headTitle = head?.title ?? null;
  useEffect(() => {
    if (headTitle == null) return;
    console.log('[AUTH-SWITCH-OFFER] alert host', JSON.stringify({ title: headTitle.slice(0, 48), visible, arbiterActive: activeOverlay }));
  }, [headTitle, visible, activeOverlay]);
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
