// ═══════════════════════════════════════════════════════════════════════════
// overlay_active_mirror.ts — модульное зеркало «кто сейчас держит слот общей очереди окон».
//
// зачем (координатор 14.10, [PAYWALL-AUTO]): автоматические переходы на пейвол (апселл после повышения уровня в корневом layout)
// живут ВЫШЕ провайдера очереди окон и не могут звать useOverlayActiveKey. Без знания о держателе слота пейвол въезжал поверх окна
// итога недели или «С возвращением». OverlayArbiter пишет сюда активный ключ на каждой смене; читатели ждут освобождения слота.
// Стоимость: одна запись и обход подписчиков на смену держателя слота. Без React.
// ═══════════════════════════════════════════════════════════════════════════
let activeKey: string | null = null;
const listeners = new Set<(key: string | null) => void>();

/** OverlayArbiter: держатель слота сменился. */
export function noteOverlayActiveMirror(key: string | null): void {
  if (activeKey === key) return;
  activeKey = key;
  listeners.forEach((listener) => {
    try {
      listener(key);
    } catch (error) {
      console.warn('[OVERLAY-MIRROR] listener failed', String(error)); // guard-ok: catch пишет причину
    }
  });
}

export function getOverlayActiveMirror(): string | null {
  return activeKey;
}

/**
 * Дождаться, пока слот окон освободится. Свободен сейчас — сразу true. Не освободился за timeoutMs — false (вызывающий решает,
 * сдаться ли). cancel() снимает ожидание без вызова колбэка.
 */
export function waitForOverlaySlotFree(timeoutMs: number, onDone: (freed: boolean, waitedMs: number) => void): () => void {
  const startedAt = Date.now();
  if (activeKey === null) {
    onDone(true, 0);
    return () => undefined;
  }
  let finished = false;
  const finish = (freed: boolean) => {
    if (finished) return;
    finished = true;
    listeners.delete(listener);
    clearTimeout(timer);
    onDone(freed, Date.now() - startedAt);
  };
  const listener = (key: string | null) => { if (key === null) finish(true); };
  listeners.add(listener);
  const timer = setTimeout(() => finish(false), timeoutMs);
  return () => {
    finished = true;
    listeners.delete(listener);
    clearTimeout(timer);
  };
}
