import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import {
  claimDailyJourneyGift,
  readDailyJourneyGiftProjection,
  type DailyJourneyGiftInput,
  type DailyJourneyGiftOccurrenceV1,
  type DailyJourneyGiftPendingItem,
} from './daily_journey_gift_inbox';
import { DebugLogger } from './debug-logger';

/**
 * Спин никогда не ждёт в «Подарках».
 *
 * зачем (владелец, 2026-09-20, капсом): «СПИН НЕ ДОЛЖЕН ИДТИ В РАЗДЕЛ ПОДАРКИ.
 * СПИН СРАЗУ НАЧИСЛЯЕТСЯ НА СЧЕТ СПИНОВ». Аудит показал, что из всех источников
 * спина (лига, арена, квесты, level-up, урок, бонус-комбэк, отчёт) мгновенно
 * начисляли ВСЕ, кроме одного — «Ежедневного путешествия». Там между записью
 * награды в журнал и ростом счётчика стоял обязательный ручной шаг: человек
 * должен был зайти в «Подарки» и тапнуть «Использовать».
 *
 * Почему не выпилили журнал целиком, а автоклеймим: журнал — это и есть защита
 * от потери награды. `claimDailyJourneyGift` — уже существующая транзакционная
 * машина (WAL, квитанция, проверка дубля), а кредиты спина детерминированы по
 * claim-операции (`local_spin_daily_journey_<hash>_<n>`), поэтому повтор после
 * обрыва или перезапуска НЕ удваивает баланс. Если автоклейм не прошёл (упало
 * хранилище, сменился аккаунт) — occurrence остаётся в журнале и будет начислен
 * при следующем заходе. Награда не теряется ни в одном сценарии.
 */
const LOG = '[SPIN-AUTOCREDIT]';

export function isDailyJourneySpinReward(
  reward: Readonly<{ kind: string }> | null | undefined,
): boolean {
  return reward?.kind === 'spins';
}

/**
 * Начисляет спин сразу после коммита occurrence.
 *
 * Возвращает true, если начисление прошло (или уже было выполнено ранее).
 * Никогда не бросает: сбой автоклейма не имеет права уронить выдачу дня —
 * награда останется в журнале и будет подобрана миграцией.
 */
export async function autocreditDailyJourneySpin(
  occurrence: DailyJourneyGiftOccurrenceV1,
  token: AccountGenerationToken,
): Promise<boolean> {
  if (!isDailyJourneySpinReward(occurrence.reward)) return false;
  const owner = token.stableId;
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    // зачем: молчаливый отказ по неготовой личности уже сжигал награды
    // (см. boon_rewards — «подарок получил, спин не начислился»).
    DebugLogger.warn(
      'daily_journey_spin_autocredit:identity_not_ready',
      `${LOG} skip op=${occurrence.operationId} amount=${occurrence.reward.amount}`
      + ` reason=identity_not_ready owner=${owner ?? 'null'}`
      + ` currentGeneration=${String(isCurrentAccountGeneration(token, owner))}`,
    );
    return false;
  }
  try {
    const result = await claimDailyJourneyGift(occurrence.operationId, token);
    DebugLogger.info(
      'daily_journey_spin_autocredit:credited',
      `${LOG} credited op=${occurrence.operationId}`
      + ` amount=${occurrence.reward.amount} status=${result.status}`
      + ` day=${occurrence.day} cycle=${occurrence.cycle}`,
    );
    return true;
  } catch (error) {
    DebugLogger.error(
      'daily_journey_spin_autocredit:failed',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    DebugLogger.warn(
      'daily_journey_spin_autocredit:failed_detail',
      `${LOG} failed op=${occurrence.operationId} amount=${occurrence.reward.amount}`
      + ` reason=${error instanceof Error ? error.message : String(error)}`
      + ' — награда остаётся в журнале и будет начислена при следующем заходе',
    );
    return false;
  }
}

/**
 * Оборачивает инъектируемый `commit`, чтобы спин уходил на счёт сразу.
 *
 * зачем именно обёртка: `commitGift` инъецируется в ДВУХ местах
 * (`daily_journey_production_host.ts` и `app/(tabs)/home.tsx`). Общая обёртка
 * гарантирует, что оба пути ведут себя одинаково и что новая точка вызова не
 * сможет случайно вернуть спин в «Подарки».
 */
export function withDailyJourneySpinAutocredit<Token extends AccountGenerationToken>(
  commit: (input: DailyJourneyGiftInput, token: Token) => Promise<Readonly<{
    status: 'committed' | 'already_committed';
    occurrence: DailyJourneyGiftOccurrenceV1;
  }>>,
): (input: DailyJourneyGiftInput, token: Token) => Promise<Readonly<{
  status: 'committed' | 'already_committed';
  occurrence: DailyJourneyGiftOccurrenceV1;
}>> {
  return async (input, token) => {
    const committed = await commit(input, token);
    if (isDailyJourneySpinReward(committed.occurrence.reward)) {
      await autocreditDailyJourneySpin(committed.occurrence, token);
    }
    return committed;
  };
}

/**
 * Разовая миграция: начисляет спины, которые УЖЕ лежат плитками у живых людей.
 *
 * зачем (владелец 2026-09-20 выбрал «начислить автоматически при первом
 * запуске»): без этого награда, заработанная до обновления, осталась бы висеть
 * в разделе, который спины больше не показывает — то есть пропала бы с глаз.
 * Идемпотентна: повторный запуск видит occurrence уже claimed и не выдаёт
 * второй кредит.
 */
export async function autocreditPendingDailyJourneySpins(
  token: AccountGenerationToken = captureAccountGeneration(),
): Promise<Readonly<{ credited: number; failed: number }>> {
  const owner = token.stableId;
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    DebugLogger.warn(
      'daily_journey_spin_autocredit:migration_identity_not_ready',
      `${LOG} migration skip reason=identity_not_ready owner=${owner ?? 'null'}`,
    );
    return Object.freeze({ credited: 0, failed: 0 });
  }
  let pending: readonly DailyJourneyGiftPendingItem[];
  try {
    const projection = await readDailyJourneyGiftProjection(token);
    pending = projection.pending;
  } catch (error) {
    DebugLogger.warn(
      'daily_journey_spin_autocredit:migration_projection_failed',
      `${LOG} migration abort reason=${error instanceof Error ? error.message : String(error)}`,
    );
    return Object.freeze({ credited: 0, failed: 0 });
  }
  const spins = pending.filter((item) => isDailyJourneySpinReward(item.reward));
  if (spins.length === 0) return Object.freeze({ credited: 0, failed: 0 });
  let credited = 0;
  let failed = 0;
  for (const item of spins) {
    if (!isCurrentAccountGeneration(token, owner)) {
      DebugLogger.warn(
        'daily_journey_spin_autocredit:migration_account_changed',
        `${LOG} migration stop reason=account_changed credited=${credited} left=${spins.length - credited - failed}`,
      );
      break;
    }
    if (await autocreditDailyJourneySpin(item, token)) credited += 1;
    else failed += 1;
  }
  DebugLogger.info(
    'daily_journey_spin_autocredit:migration_done',
    `${LOG} migration done found=${spins.length} credited=${credited} failed=${failed}`,
  );
  return Object.freeze({ credited, failed });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
