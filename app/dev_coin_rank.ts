/**
 * DEV-подмена ранга монеты для ПОКАЗА: `dev_state?coinRank=N` (0..19) / `coinRank=off`.
 *
 * зачем (координатор 12.10): у анонимного гостя ранг 0, а все диалоги каталога требуют ранг 1…6 («Откроется на ранге N») — Сверка не может войти ни в
 * один диалог и снять кадры внутри них. Подменяется ТОЛЬКО значение, которое возвращает хук useMyCoinRank (память процесса). Монеты, ранг в
 * хранилище и в облаке НЕ пишутся — ранг синхронизируемый (та же причина, по которой cards=* работают только на госте).
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда null, а установка отклоняется. Перезапуск приложения сбрасывает.
 * Лог: [DEV-STATE] coinRank override=N.
 */
import { IS_STORE_RELEASE } from './config';

const MAX_RANK = 19;
let override: number | null = null;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить (0..19) или снять (null). В стор-сборке — отказ с логом, значение не меняется. Возвращает true, если применено. */
export function setDevCoinRankOverride(rank: number | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] coinRank: отклонено — не dev-сборка', { rank }); // guard-ok: ранний выход логируется
    return false;
  }
  if (rank !== null && (!Number.isInteger(rank) || rank < 0 || rank > MAX_RANK)) {
    console.warn(`[DEV-STATE] coinRank: отклонено — ранг вне 0..${MAX_RANK}`, { rank }); // guard-ok: ранний выход логируется
    return false;
  }
  override = rank;
  console.log(rank === null ? '[DEV-STATE] coinRank override=off' : `[DEV-STATE] coinRank override=${rank} (только показ, монеты и ранг не пишутся)`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Подменённый ранг или null. В стор-сборке всегда null. */
export function getDevCoinRankOverride(): number | null {
  return devAvailable() ? override : null;
}

// ───────────────────── Баланс монет для показа и удержание повышения (Авторизация 12.10, coins-001/003/004) ─────────────────────
// зачем: у гостя 0 монет — кадров «кошелёк 12 480» и «повышение — готово/ожидание» не снять. `coins=N` подменяет ТОЛЬКО показанный баланс на экранах
// «Монеты» и «Повысить ранг»; кошелёк в хранилище и облаке не меняется. При подменённом балансе настоящее повышение отказывает до сервера
// (хук повышения ранга в hooks/; имя файла не пишем — сторож dev_coin_rank запрещает тут ключи и модули хранения) — иначе тап списал бы настоящие монеты. `coinupgrade=hold` держит «Проверяем повышение…» без сервера.
const MAX_DEV_BALANCE = 10_000_000;
let balanceOverride: number | null = null;
let upgradeHold = false;

/** Баланс для показа (0..10 000 000) или снять (null). В стор-сборке — отказ с логом. */
export function setDevCoinBalanceOverride(balance: number | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] coins: отклонено — не dev-сборка', { balance }); // guard-ok: ранний выход логируется
    return false;
  }
  if (balance !== null && (!Number.isInteger(balance) || balance < 0 || balance > MAX_DEV_BALANCE)) {
    console.warn(`[DEV-STATE] coins: отклонено — баланс вне 0..${MAX_DEV_BALANCE}`, { balance }); // guard-ok: ранний выход логируется
    return false;
  }
  balanceOverride = balance;
  console.log(balance === null ? '[DEV-STATE] coins override=off' : `[DEV-STATE] coins override=${balance} (только показ; повышение ранга при подмене отказывает)`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Подменённый баланс для показа или null. В стор-сборке всегда null. */
export function getDevCoinBalanceOverride(): number | null {
  return devAvailable() ? balanceOverride : null;
}

export function setDevCoinUpgradeHold(on: boolean): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] coinupgrade: отклонено — не dev-сборка'); // guard-ok: ранний выход логируется
    return false;
  }
  upgradeHold = on;
  console.log(`[DEV-STATE] coinupgrade=${on ? 'hold' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** `coinupgrade=hold`: повышение висит в «Проверяем повышение…», сервер не вызывается. В стор-сборке всегда false. */
export function isDevCoinUpgradeHold(): boolean {
  return devAvailable() && upgradeHold;
}

/** Только для тестов. */
export function resetDevCoinStateForTests(): void {
  override = null;
  balanceOverride = null;
  upgradeHold = false;
}
