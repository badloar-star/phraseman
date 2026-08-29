/**
 * runes_system.ts — ЕДИНЫЙ кошелёк рун (валюта; поле `stars` в Firestore).
 *
 * зачем (владелец, 23.08): «выиграл в спине кучу рун, счётчик не изменился».
 * Расследование показало, что баланс рун жил в ТРЁХ несвязанных местах и ни одно
 * не было каноническим:
 *   1) `app/learning_v2_wallet_balance_store.ts` — кошелёк курса в подъединицах
 *      (10000 за руну), его показывал чип в шапке Уроков;
 *   2) ответ `arenaStarStore()` — только магазин Арены;
 *   3) `progress.stars` в снапшоте — сюда и пишет спин.
 * Спин клал руны в (3), пользователь смотрел на (1) — число не двигалось.
 *
 * Этот модуль — единственная точка правды для ПОКАЗА баланса рун. Он намеренно
 * НЕ дублирует логику начисления: писатель остаётся ровно один —
 * `level_spin_star_grants.ts` (это сторожит `tests/economy_constitution_contract.test.ts`,
 * см. «Spin star persistence overlays unacked composites»). Здесь только фасад:
 * синхронный peek, асинхронное чтение и событие об изменении — по образцу
 * `app/shards_system.ts` (жемчужины), чтобы экраны подключались одинаково.
 *
 * НЕ путать с звёздами-ОЦЕНКОЙ занятия (1–3 под узлом карты) и внутренней шкалой
 * сессии до 36 — это разные сущности, см. `constants/runes.ts` и
 * `docs/RUNES_RENAME_REGISTRY_2026-08-23.md`.
 */

import { getAppSnapshot, patchAppSnapshot, subscribeAppSnapshot } from './app_snapshot_store';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  waitForActiveAccountGeneration,
} from './account_generation';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { readUnifiedLevelSpinStars, peekStoredLevelSpinStarsForBoot } from './level_spin_star_grants';

export type RunesBalance = Readonly<{
  /** Сколько рун можно потратить прямо сейчас. */
  balance: number;
  /** Сколько заработано всего (соревновательный прогресс; гранты сюда не идут). */
  earnedTotal: number;
}>;

export type RunesBalanceRead = Readonly<{
  wallet: RunesBalance;
  /** `fallback` is safe to display but cannot establish a new Season baseline. */
  quality: 'durable' | 'fallback';
}>;

const EMPTY: RunesBalance = Object.freeze({ balance: 0, earnedTotal: 0 });

function normalize(value: unknown): number {
  const n = Math.trunc(Number(value));
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

/**
 * Баланс из снапшота. Снапшот гидрируется синхронно при старте, поэтому первый
 * кадр рисуется сразу правильным числом — без «0 и прыжок» (правило стабильности
 * вёрстки из Performance Bible).
 */
function readFromSnapshot(): RunesBalance {
  const progress = getAppSnapshot().progress;
  if (!progress) return EMPTY;
  return Object.freeze({
    balance: normalize(progress.stars),
    earnedTotal: normalize(progress.starsEarnedTotal),
  });
}

/**
 * Синхронный баланс «прямо сейчас» — аналог `peekLastKnownShardsBalance()`.
 * Годится для первого кадра и для `useState`-инициализаторов: чтения с диска нет,
 * значит нет и лишнего кадра с нулём.
 */
export function peekRunesBalance(): RunesBalance {
  return readFromSnapshot();
}

/** Короткая форма, когда нужно только тратимое число. */
export function peekRunes(): number {
  return readFromSnapshot().balance;
}

/**
 * Авторитетное чтение: поднимает проекцию с диска (включая ещё не подтверждённые
 * сервером начисления) и синхронизирует снапшот. Firestore при этом НЕ читается —
 * стоимости нет.
 */
export async function getRunesBalanceRead(): Promise<RunesBalanceRead> {
  const token = captureAccountGeneration();
  const stableId = token.stableId?.trim();
  if (!stableId || !isCurrentAccountGeneration(token, stableId)) {
    return Object.freeze({ wallet: EMPTY, quality: 'fallback' });
  }
  try {
    const unified = await readUnifiedLevelSpinStars(token);
    if (!isCurrentAccountGeneration(token, stableId)) {
      return Object.freeze({ wallet: EMPTY, quality: 'fallback' });
    }
    const result = Object.freeze({
      balance: normalize(unified.balance),
      earnedTotal: normalize(unified.earnedTotal),
    });
    DebugLogger.info('runes_wallet:read_unified', JSON.stringify({
      owner: stableId.slice(0, 8),
      balance: result.balance,
      earnedTotal: result.earnedTotal,
    }));
    return Object.freeze({ wallet: result, quality: 'durable' });
  } catch {
    // Проекция битая или аккаунт сменился — показываем то, что уже в снапшоте,
    // вместо нуля: занижать баланс на глазах у пользователя хуже, чем отстать.
    // The quality marker keeps this potentially incomplete value from becoming
    // a future Season's durable wallet baseline.
    return Object.freeze({ wallet: readFromSnapshot(), quality: 'fallback' });
  }
}

/** Compatibility facade for consumers that only render the wallet. */
export async function getRunesBalance(): Promise<RunesBalance> {
  return (await getRunesBalanceRead()).wallet;
}

/**
 * Подписка на изменение баланса рун.
 *
 * Источник истины — снапшот: `publishProjection` в `level_spin_star_grants.ts`
 * патчит `progress.stars`, а `subscribeAppSnapshot` будит подписчиков. Здесь мы
 * лишь отсеиваем кадры, где руны не менялись, чтобы не будить экраны на каждое
 * несвязанное изменение снапшота (XP, серия, профиль).
 *
 * Дополнительно эмитим `runes_balance_updated` с дельтой — на нём висит анимация
 * начисления (полёт глифов футарка) на главной.
 */
export function subscribeRunesBalance(
  listener: (value: RunesBalance, delta: number) => void,
): () => void {
  return subscribeRunesSnapshot((next, previous) => {
    const delta = next.balance - previous.balance;
    listener(next, delta);
    if (delta !== 0) {
      emitAppEvent('runes_balance_updated', { balance: next.balance, delta });
    }
  });
}

/**
 * Silent canonical subscription for projections that need both balance and
 * earned-total changes without emitting the wallet animation event themselves.
 */
export function subscribeRunesSnapshot(
  listener: (value: RunesBalance, previous: RunesBalance) => void,
): () => void {
  let previous = readFromSnapshot();
  return subscribeAppSnapshot(() => {
    const next = readFromSnapshot();
    if (next.balance === previous.balance && next.earnedTotal === previous.earnedTotal) return;
    const prior = previous;
    previous = next;
    listener(next, prior);
  });
}

let runesBootPrimed = false;

function applyBootRunesPatch(bootRunes: Readonly<{ balance: number; earnedTotal: number }>): void {
  patchAppSnapshot((current) => {
    if (!current.progress) return {};
    // Диск не побеждает безусловно: пока шло чтение, спин мог начислить руны
    // и опубликовать их раньше нас — берём большее, как и buildProgressSnapshot.
    const balance = Math.max(bootRunes.balance, normalize(current.progress.stars));
    const earnedTotal = Math.max(bootRunes.earnedTotal, normalize(current.progress.starsEarnedTotal));
    if (balance === current.progress.stars && earnedTotal === current.progress.starsEarnedTotal) return {};
    return { progress: { ...current.progress, stars: balance, starsEarnedTotal: earnedTotal } };
  });
}

/**
 * Прогреть баланс рун из хранилища на старте, НЕ дожидаясь общей пачки
 * `primeAppSnapshotFromStorage` в _layout.tsx.
 *
 * зачем (владелец, 25.08: «на главной всегда показывает нули при заходе»):
 * прежний прогрев (`peekStoredLevelSpinStarsForBoot` внутри
 * `buildProgressSnapshot`) висел ВНУТРИ `Promise.race([startupLocalHydration,
 * timeout(350ms)])` в _layout.tsx — общая пачка из 15+ параллельных чтений
 * диска. На холодном старте, где диск медленнее 350мс (обычное дело на
 * Android), гонка обрывалась раньше, чем руны успевали прочитаться, и первый
 * кадр Главной уходил в peekRunes() -> 0. Та же ловушка, что чинили у энергии
 * (energy_peek_cache.ts) — здесь применяем то же лекарство: чтение стартует
 * САМО при импорте модуля, параллельно с общей пачкой, но без её таймаута.
 * Отдельного ленивого импорта грантов здесь не нужно — этот файл и так
 * статически тянет `level_spin_star_grants.ts` целиком ради
 * `readUnifiedLevelSpinStars` (см. импорт наверху), вес уже в бандле.
 */
export async function primeRunesPeekFromBoot(): Promise<void> {
  if (runesBootPrimed) return;
  // зачем (владелец, 27.08: «счётчик рун не всегда держит снапшот, иногда нули»):
  // прогрев стартует при ИМПОРТЕ модуля, то есть на самом первом тике JS — когда
  // аккаунт ещё `uninitialized` и stableId равен null (его ставит cloud_sync через
  // beginInitialAccountGeneration позже). Прежний код в этот момент молча выходил
  // и больше НИКОГДА не повторялся — то есть фикс 25.08 на холодном старте не
  // работал вовсе, и руны опять зависели от гонки 350мс, от которой уходили.
  // Ждём активации вместо выхода: ключ проекции всё равно зависит от владельца
  // (level_spin_star_projection_v1:<uid>), прочитать его раньше физически нельзя.
  let token = captureAccountGeneration();
  let stableId = token.stableId?.trim();
  if (!stableId || !isCurrentAccountGeneration(token, stableId)) {
    const activeToken = await waitForActiveAccountGeneration();
    if (runesBootPrimed || !activeToken) return;
    token = activeToken;
    stableId = activeToken.stableId?.trim();
    if (!stableId || !isCurrentAccountGeneration(token, stableId)) return;
  }
  try {
    const bootRunes = await peekStoredLevelSpinStarsForBoot(token);
    if (runesBootPrimed || !bootRunes || !isCurrentAccountGeneration(token, stableId)) return;
    runesBootPrimed = true;
    if (getAppSnapshot().progress) {
      applyBootRunesPatch(bootRunes);
      return;
    }
    // зачем: этот прогрев стартует РАНЬШЕ основного bootstrap специально (это и
    // есть цель фикса) — секции progress в снапшоте может ещё не быть вовсе.
    // Создавать её здесь нулями для streak/shards было бы новым багом того же
    // класса (чужой экран увидел бы 0 на миг). Вместо этого ждём ОДНО следующее
    // изменение снапшота (его принесёт primeAppSnapshotFromStorage секундой
    // позже) и накладываем руны сверху сразу же — раньше первого кадра, который
    // читает peekRunes() уже после этого патча.
    const unsubscribe = subscribeAppSnapshot(() => {
      if (!getAppSnapshot().progress) return;
      unsubscribe();
      applyBootRunesPatch(bootRunes);
    });
  } catch (e) {
      // Хранилище недоступно или проекция битая — обычный поток bootstrap починит это следом.
      DebugLogger.error('runes_system:unsubscribe', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// зачем: прогрев запускается САМ при первом импорте модуля (см. комментарий
// primeRunesPeekFromBoot), а не только из bootstrap-гонки. Импорт нужен рано —
// см. app/_layout.tsx рядом с EnergyProvider. Обещание намеренно не ожидается:
// чтение диска не должно задерживать сам импорт.
void primeRunesPeekFromBoot();
