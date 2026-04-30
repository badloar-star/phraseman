import React, { useEffect, useReducer } from 'react';
import ThemedChoiceModal from './ThemedChoiceModal';
import {
  getThemedBlockingAlertHead,
  resolveThemedBlockingAlertHead,
  subscribeThemedBlockingAlertQueue,
} from '../app/themed_blocking_alert_queue';

/**
 * Рендерит очередь инфо-алертов из themed_blocking_alert_queue (модерация и т.п.).
 */
export default function ThemedBlockingAlertHost() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribeThemedBlockingAlertQueue(() => bump()), []);
  const head = getThemedBlockingAlertHead();
  return (
    <ThemedChoiceModal
      visible={head != null}
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
