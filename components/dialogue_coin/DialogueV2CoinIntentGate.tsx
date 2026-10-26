/**
 * Сторож хоста намерений монет за диалог (R50) в корне приложения.
 *
 * зачем (координатор 26.10): флаг dialogue_coin_intent_host_enabled ВЫКЛ по умолчанию — тогда здесь ничего не грузится и
 * не читается с диска: рендер null, тяжёлый хост (копилка) не импортируется. Флаг перечитывается при новом намерении, при
 * возврате приложения и дважды после старта (снимок «Пульта» может приехать позже первого кадра). Хост грузится лениво
 * внутри тихой ловушки ошибок: сбой хоста не роняет корень (урок 04ec8cd30 — ошибка на уровне модуля в корне уронила всех).
 */
import React, { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { getRemoteBool } from '../../app/remote_flags';
import { subscribeDialogueV2CoinIntents } from '../../app/dialogue_v2_coin_intents';

const FLAG = 'dialogue_coin_intent_host_enabled' as const;
const RECHECK_AFTER_START_MS = [3_000, 15_000] as const;
const DialogueV2CoinIntentHost = lazy(() => import('./DialogueV2CoinIntentHost'));

class SilentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(error: unknown): void {
    console.warn('[COINS-EARN] dialog-gate: хост упал — намерения ждут до перезапуска (монеты не потеряны, они на диске)', error instanceof Error ? error.message : String(error)); // guard-ok: ловушка пишет причину
  }
  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

export default function DialogueV2CoinIntentGate() {
  const [on, setOn] = useState(() => getRemoteBool(FLAG));
  useEffect(() => {
    const recheck = (): void => setOn(getRemoteBool(FLAG));
    const unsubscribe = subscribeDialogueV2CoinIntents(recheck);
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') recheck(); });
    const timers = RECHECK_AFTER_START_MS.map((ms) => setTimeout(recheck, ms));
    return () => {
      unsubscribe();
      appState.remove();
      timers.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => {
    console.log(`[COINS-EARN] dialog-gate: флаг ${FLAG}=${on} → хост ${on ? 'смонтирован' : 'не грузится'}`); // guard-ok: одна строка на смену флага
  }, [on]);
  if (!on) return null;
  return (
    <SilentBoundary>
      <Suspense fallback={null}>
        <DialogueV2CoinIntentHost />
      </Suspense>
    </SilentBoundary>
  );
}
