/**
 * Одна загрузка ленты видео Главной на время её выполнения.
 *
 * зачем (Сверка 02:15, HOME-COLD_cold3: video:start ×2 — 2 405 и 4 289 мс, video:resolved ×2, второй alive:false):
 * эффект ленты перезапускается, когда меняется focusTick / homeRuntimeActive / studyTarget, а прежний запуск не
 * останавливался — обе цепочки (импорт модуля → кэш → сеть) шли до конца. Теперь повторный запуск, пока цепочка
 * идёт, только подписывается на её результат; подписчик, ушедший при размонтировании, ничего не получает.
 * После завершения следующий запуск (новый фокус) идёт как раньше.
 */
export type HomeVideoLoadSource = 'cache' | 'network';

export type HomeVideoLoadListener<TSnapshot> = (snapshot: TSnapshot, source: HomeVideoLoadSource) => void;

export type HomeVideoLoadPipeline<TSnapshot> = Readonly<{
  /** joined=true — цепочка уже шла, новый запуск лишь подписался. */
  run(
    listener: HomeVideoLoadListener<TSnapshot>,
    start: (emit: HomeVideoLoadListener<TSnapshot>) => Promise<void>,
  ): Readonly<{ joined: boolean; unsubscribe: () => void }>;
  isRunning(): boolean;
}>;

export function createHomeVideoLoadPipeline<TSnapshot>(): HomeVideoLoadPipeline<TSnapshot> {
  let running: Promise<void> | null = null;
  const listeners = new Set<HomeVideoLoadListener<TSnapshot>>();
  const emit: HomeVideoLoadListener<TSnapshot> = (snapshot, source) => {
    for (const listener of [...listeners]) listener(snapshot, source);
  };
  return {
    run(listener, start) {
      listeners.add(listener);
      const unsubscribe = () => { listeners.delete(listener); };
      if (running) return { joined: true, unsubscribe };
      const current = Promise.resolve()
        .then(() => start(emit))
        .finally(() => {
          if (running === current) running = null;
        });
      running = current;
      // Ошибки цепочки обрабатывает сам start (лог + статус); здесь только не даём им стать необработанными.
      current.catch((error: unknown) => {
        console.warn('[HOME-COLD] video:pipeline_error', error instanceof Error ? error.message : String(error)); // guard-ok: catch логируется
      });
      return { joined: false, unsubscribe };
    },
    isRunning: () => running !== null,
  };
}
