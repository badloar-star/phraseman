/**
 * Тихие повторы быстрой фазы удаления аккаунта (новые окна, вариант Б).
 *
 * зачем (правило владельца 22.09 «удаление не имеет права не пройти», окон об удалении не показывать НИКОГДА;
 * решение координатора 25.10): отказ быстрой фазы — замок не записался, идёт чужой переход, прошлая попытка ещё
 * стирает — случается ДО точки невозврата (аккаунт не изменён). Вместо окна «Не получилось» пробуем ещё раз сами,
 * несколько раз с паузами. Не вышло — окно удаления остаётся открытым, человек в своём аккаунте (не думает, что
 * удалён), причина — в журнал. Сбой ПОСЛЕ точки невозврата (сеть, сервер) досылает замок удаления при запуске и
 * перед входом (ensureFreshPostDeletionIdentity) — это отдельный, уже существующий путь.
 */
import type { DeleteAccountHandoff } from './auth_provider';

let quietRetryDelaysMs: readonly number[] = [700, 1_800];

/** Только для тестов. */
export function setAccountDeleteHandoffRetryDelaysForTest(delays: readonly number[]): void {
  quietRetryDelaysMs = delays;
}

const pause = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && code) return code.slice(0, 60);
  return error instanceof Error ? error.name.slice(0, 60) : typeof error;
}

export async function retryAccountDeleteHandoffQuietly(
  attempt: () => Promise<DeleteAccountHandoff>,
  mode: string,
): Promise<DeleteAccountHandoff> {
  for (let index = 0; ; index += 1) {
    let result: DeleteAccountHandoff;
    try {
      result = await attempt();
    } catch (error) {
      // зачем (запрет немого catch): исключение быстрой фазы — тот же отказ до точки невозврата, повторяем.
      console.warn(`[ACCOUNT-DELETE-UI] handoff_threw attempt=${index + 1} mode=${mode} code=${errorCode(error)}`);
      result = { ok: false, reason: `threw:${errorCode(error)}` };
    }
    if (result.ok) {
      if (index > 0) console.log(`[ACCOUNT-DELETE-UI] handoff_recovered attempt=${index + 1} mode=${mode}`);
      return result;
    }
    const delay = quietRetryDelaysMs[index];
    if (delay === undefined) {
      console.warn(`[ACCOUNT-DELETE-UI] handoff_gave_up attempts=${index + 1} mode=${mode} reason=${result.reason}`); // guard-ok: итог с причиной
      return result;
    }
    console.log(`[ACCOUNT-DELETE-UI] handoff_retry attempt=${index + 2} afterMs=${delay} mode=${mode} reason=${result.reason}`);
    await pause(delay);
  }
}
