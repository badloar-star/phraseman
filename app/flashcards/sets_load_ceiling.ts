// sets_load_ceiling.ts — потолок ожидания каталога «Наборы» (Сообщество → Наборы, flashcards_packs).
// зачем (Сверка 24.10 через координатора: «раздел „Наборы" показывает только серые заглушки без текста и не выходит из них»):
// заглушки держатся, пока loadHubMarket не завершится. Без сети запрос Firestore может не ответить вовсе — обещание висит,
// флаг «каталог пришёл» не ставится, и тихий повтор (catalogGate) снова прячет экран под заглушки. Потолок гарантирует выход:
// пришло → список; пусто → пустое состояние; ошибка/потолок → обычное пустое состояние и тихий повтор (правило владельца 18.10:
// без экрана «Нет сети»). Запрос не отменяется — если ответ придёт позже, список обновится сам. Журнал [SETS-LOAD].

/** Сколько ждём каталог, прежде чем выйти из заглушек. */
export const SETS_LOAD_CEILING_MS = 12_000;

export type SetsLoadOutcome = 'done' | 'error' | 'ceiling';

const LOG = '[SETS-LOAD]';

/**
 * Ждёт загрузку каталога не дольше `ms`. Всегда разрешается (никогда не бросает) и ровно один раз зовёт `onSettled`
 * с исходом: 'done' — загрузка завершилась, 'error' — упала (причина в журнале), 'ceiling' — не ответила за `ms`.
 */
export function awaitSetsLoadWithCeiling(
  load: () => Promise<unknown>,
  onSettled: (outcome: SetsLoadOutcome) => void,
  opts: Readonly<{ reason: string; ms?: number; now?: () => number }>,
): Promise<SetsLoadOutcome> {
  const ms = opts.ms ?? SETS_LOAD_CEILING_MS;
  const now = opts.now ?? Date.now;
  const startedAt = now();
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return new Promise<SetsLoadOutcome>((resolve) => {
    const finish = (outcome: SetsLoadOutcome, detail: string) => {
      if (settled) {
        console.log(`${LOG} late ${outcome} reason=${opts.reason} after=${now() - startedAt}ms — заглушки уже сняты, список обновится сам`); // guard-ok: поздний ответ
        return;
      }
      settled = true;
      if (timer) clearTimeout(timer);
      console.log(`${LOG} settle outcome=${outcome} reason=${opts.reason} ms=${now() - startedAt}${detail ? ` ${detail}` : ''}`); // guard-ok: итог ожидания каталога
      onSettled(outcome);
      resolve(outcome);
    };
    console.log(`${LOG} start reason=${opts.reason} ceilingMs=${ms}`); // guard-ok: вход
    timer = setTimeout(() => finish('ceiling', `каталог не ответил за ${ms}ms — выходим из заглушек`), ms);
    let pending: Promise<unknown>;
    try {
      pending = load();
    } catch (error) {
      finish('error', `sync_throw=${error instanceof Error ? error.name : typeof error}`);
      return;
    }
    pending.then(
      () => finish('done', ''),
      (error: unknown) => finish('error', `reason=${error instanceof Error ? `${error.name}:${error.message}` : String(error)}`),
    );
  });
}
