// зачем (аудит Optimistic UI экрана тем, координатор 15.10): смена темы/оформления/насыщенности меняет локальное состояние мгновенно, а запись на диск шла фоном БЕЗ повтора и БЕЗ отката —
// при сбое записи человек видел новую тему до перезапуска, а после перезапуска тема молча возвращалась. Здесь: один повтор, откат к последнему сохранённому значению, понятное сообщение
// и защита от гонок (поздний сбой старой записи не откатывает более новый выбор). Модуль чистый: запись, откат и сообщение приходят снаружи — проверяется тестом.
export type ThemePersistKind = 'theme' | 'appearance' | 'intensity';

type Deps = Readonly<{
  /** Запись выбора на диск. */
  write: (kind: ThemePersistKind, value: string) => Promise<unknown>;
  /** Вернуть выбор на экране (после повторного сбоя). */
  rollback: (kind: ThemePersistKind, value: string) => void;
  /** Сообщить человеку, что выбор не сохранился. */
  notifyFailure: (kind: ThemePersistKind) => void;
  retryDelayMs?: number;
  log?: (message: string, data: Record<string, unknown>) => void;
  now?: () => number;
}>;

export type ThemePersister = Readonly<{
  /** Выбор уже применён на экране; сохранить фоном. previous — значение до выбора (запасной откат). */
  commit: (kind: ThemePersistKind, value: string, previous: string) => void;
  /** Значение, которое точно лежит на диске (после чтения при старте). */
  setPersisted: (kind: ThemePersistKind, value: string) => void;
}>;

export const THEME_PERSIST_RETRY_MS = 700;

export function createThemePersister(deps: Deps): ThemePersister {
  const seq: Record<ThemePersistKind, number> = { theme: 0, appearance: 0, intensity: 0 };
  const persisted: Partial<Record<ThemePersistKind, string>> = {};
  const delay = deps.retryDelayMs ?? THEME_PERSIST_RETRY_MS;
  const log = deps.log ?? (() => undefined);
  const now = deps.now ?? Date.now;

  const attempt = (kind: ThemePersistKind, value: string, previous: string, mySeq: number, n: number, startedAt: number): void => {
    let pending: Promise<unknown>;
    try {
      pending = deps.write(kind, value);
    } catch (error) {
      pending = Promise.reject(error);
    }
    pending.then(() => {
      if (mySeq === seq[kind]) persisted[kind] = value;
      log('write_ok', { kind, value, attempt: n + 1, ms: now() - startedAt, newer: mySeq !== seq[kind] });
    }, (error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      if (n === 0) {
        log('write_failed_retry', { kind, value, reason, retryInMs: delay });
        // зачем (аудит Optimistic UI, координатор 15.10, дыра №3): отложенный повтор старого выбора не должен перезаписать на диске более новый (тап A, сбой, тап B, повтор A затирал B)
        setTimeout(() => {
          if (mySeq !== seq[kind]) {
            log('write_retry_skipped_stale', { kind, value, note: 'есть более новый выбор — повтор старого не пишем' });
            return;
          }
          attempt(kind, value, previous, mySeq, 1, startedAt);
        }, delay);
        return;
      }
      if (mySeq !== seq[kind]) {
        log('write_failed_stale', { kind, value, reason, note: 'есть более новый выбор — не откатываем' });
        return;
      }
      const back = persisted[kind] ?? previous;
      log('write_failed_rollback', { kind, from: value, to: back, reason });
      deps.rollback(kind, back);
      deps.notifyFailure(kind);
    });
  };

  return {
    commit(kind, value, previous) {
      seq[kind] += 1;
      log('commit', { kind, from: previous, to: value, optimistic: true, seq: seq[kind] });
      attempt(kind, value, previous, seq[kind], 0, now());
    },
    setPersisted(kind, value) {
      persisted[kind] = value;
    },
  };
}
