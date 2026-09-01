/**
 * Разовая миграция: закрытие долга удалённой модалки поздравления.
 *
 * зачем (владелец, 2026-09-01): полноэкранная модалка повышения уровня удалена.
 * Бонус +100 XP за уровень выдавался ТОЛЬКО по кнопке «Готово» в этой модалке,
 * и у людей в durable-очереди (PENDING_LEVEL_SPIN_LEVEL_UP_QUEUE_KEY) остались
 * непоказанные уровни — именно они всплывали как «был 40, поздравляем, уровень
 * 13». Просто стереть очередь значит забрать у человека уже заработанный бонус.
 *
 * Решение владельца: за УЖЕ ВИСЯЩИЕ уровни бонус выплатить один раз (как долг),
 * очередь стереть, а на будущее бонус за уровень не начислять вовсе.
 *
 * Спины при этом не трогаем: они начислялись отдельно и раньше показа
 * (grantLocalLevelSpinsForAccount в enqueueAuthoritativeLevelSpinLevels), уже
 * лежат в кошельке и никуда не денутся.
 *
 * Выплата идёт через тот же durable outbox, что и раньше: он idempotent по
 * eventId (`level_up:<level>:bonus`), поэтому повторный запуск миграции или
 * падение на полпути не задвоят опыт.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import { persistLevelUpBonusIntent } from './level_up_bonus_outbox';
import { PENDING_LEVEL_SPIN_LEVEL_UP_QUEUE_KEY } from './level_up_storage_keys';

/** Метка «долг закрыт» — по аккаунту, чтобы миграция шла ровно один раз. */
const RETIREMENT_DONE_KEY = 'level_up_modal_retired_debt_settled_v1';

const LOG = '[LEVELUP-RETIRE]';

function queueKey(owner: string): string {
  return `${PENDING_LEVEL_SPIN_LEVEL_UP_QUEUE_KEY}:${encodeURIComponent(owner)}`;
}

function doneKey(owner: string): string {
  return `${RETIREMENT_DONE_KEY}:${encodeURIComponent(owner)}`;
}

function parseLevels(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed
      .map(Number)
      .filter((level) => Number.isInteger(level) && level >= 2 && level <= 60))]
      .sort((a, b) => a - b);
  } catch (error) {
    // Немой catch запрещён: битая очередь должна назвать себя, иначе долг
    // «просто не выплатился» и никто не узнает почему.
    console.warn(`${LOG} queue unreadable, treating as empty`, error);
    return [];
  }
}

/**
 * Закрыть долг по бонусам за уровень и стереть очередь показов.
 *
 * Безопасно звать на каждом старте: после первого успеха ставит метку и выходит
 * одним чтением ключа.
 *
 * @param lang язык для текста начисления опыта
 * @returns сколько уровней ушло в выплату (0 — долга не было или уже закрыт)
 */
export async function settleRetiredLevelUpModalDebt(lang: Lang): Promise<number> {
  const token = captureAccountGeneration();
  const owner = token.stableId;
  if (!owner || !isCurrentAccountGeneration(token, owner)) {
    console.log(`${LOG} skip: no current account`, { hasOwner: !!owner });
    return 0;
  }

  const alreadyDone = await AsyncStorage.getItem(doneKey(owner));
  if (alreadyDone === 'true') return 0;

  const levels = await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return null;
    return parseLevels(await AsyncStorage.getItem(queueKey(owner)));
  });

  if (levels === null) {
    console.log(`${LOG} skip: account changed while reading queue`);
    return 0;
  }

  console.log(`${LOG} settling`, { owner: owner.slice(0, 6), levels });

  // Сначала интенты (durable, idempotent), только потом стираем очередь: крах
  // между шагами максимум повторит миграцию, но не потеряет бонус.
  let persisted = 0;
  for (const level of levels) {
    if (!isCurrentAccountGeneration(token, owner)) {
      console.log(`${LOG} abort: account changed mid-settle`, { level, persisted });
      return persisted;
    }
    const ok = await persistLevelUpBonusIntent(level, lang);
    if (!ok) {
      console.warn(`${LOG} intent not persisted, keeping queue for retry`, { level });
      return persisted;
    }
    persisted += 1;
  }

  const cleared = await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(token, owner)) return false;
    await AsyncStorage.multiSet([
      [queueKey(owner), JSON.stringify([])],
      [doneKey(owner), 'true'],
    ]);
    return true;
  });

  console.log(`${LOG} done`, { persisted, cleared });
  return persisted;
}

export const __levelUpModalRetirementTestKeys = {
  RETIREMENT_DONE_KEY,
  queueKey,
  doneKey,
} as const;
