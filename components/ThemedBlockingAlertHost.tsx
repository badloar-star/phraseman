import React, { memo, useEffect, useReducer } from 'react';
import ThemedChoiceModal from './ThemedChoiceModal';
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
    <ThemedChoiceModal
      visible={visible}
      title={head?.title ?? ''}
      message={head?.message ?? ''}
      choices={
        head
          ? [{ label: head.okLabel, onPress: () => {} }]
          : []
      }
      onRequestClose={() => {
        resolveThemedBlockingAlertHead();
      }}
    />
  );
}

export default memo(ThemedBlockingAlertHost);
