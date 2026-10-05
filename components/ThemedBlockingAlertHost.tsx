import React, { memo, useEffect, useReducer } from 'react';
import { GlassAlertDialog } from './v2/GlassAlertDialog';
import {
  getThemedBlockingAlertHead,
  resolveThemedBlockingAlertHead,
  subscribeThemedBlockingAlertQueue,
} from '../app/themed_blocking_alert_queue';
import { useOverlayVisible } from './OverlayArbiter';

/**
 * Рендерит очередь инфо-алертов из themed_blocking_alert_queue (модерация и т.п.).
 */
function ThemedBlockingAlertHost() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeThemedBlockingAlertQueue(() => bump()), []);
  const head = getThemedBlockingAlertHead();
  const visible = useOverlayVisible('themedAlert', head != null);
  return (
    // зачем (Сверка overlays-runtime, 05.10): инфо-окно с одной «OK» — по центру (`.or-alert`), а не шторкой выбора.
    <GlassAlertDialog
      visible={visible}
      title={head?.title ?? ''}
      message={head?.message || undefined}
      actions={head ? [{ label: head.okLabel, onPress: () => { resolveThemedBlockingAlertHead(); } }] : []}
      onRequestClose={() => {
        resolveThemedBlockingAlertHead();
      }}
    />
  );
}

export default memo(ThemedBlockingAlertHost);
