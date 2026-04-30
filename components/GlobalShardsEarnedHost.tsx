import React, { useCallback, useEffect, useRef, useState } from 'react';
import { onAppEvent } from '../app/events';
import { labelForShardModalReason } from '../app/shard_earn_ui';
import { useLang } from './LangContext';
import ShardsEarnedModal from './ShardsEarnedModal';

type Queued = { amount: number; reason: string };

/**
 * Единая ShardsEarnedModal по всему приложению (слушает shards_earned).
 */
export default function GlobalShardsEarnedHost() {
  const { lang } = useLang();
  const [active, setActive] = useState<Queued | null>(null);
  const queueRef = useRef<Queued[]>([]);
  const activeRef = useRef<Queued | null>(null);
  activeRef.current = active;

  const pump = useCallback(() => {
    if (activeRef.current) return;
    const next = queueRef.current.shift();
    if (next) setActive(next);
  }, []);

  const handleClose = useCallback(() => {
    setActive(null);
    setTimeout(pump, 80);
  }, [pump]);

  useEffect(() => {
    const sub = onAppEvent('shards_earned', (p) => {
      if (!p.amount || p.amount <= 0) return;
      const reason =
        p.reasonText?.trim()
        || labelForShardModalReason(p.reasonKey, lang);
      queueRef.current.push({ amount: p.amount, reason });
      pump();
    });
    return () => sub.remove();
  }, [lang, pump]);

  return (
    <ShardsEarnedModal
      key={active ? `${active.amount}|${active.reason.slice(0, 80)}` : 'idle'}
      visible={!!active}
      amount={active?.amount ?? 0}
      reason={active?.reason ?? ''}
      onClose={handleClose}
    />
  );
}
