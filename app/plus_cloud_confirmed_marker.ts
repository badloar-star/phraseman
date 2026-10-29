// plus_cloud_confirmed_marker.ts — «облако уже подтверждало статус Plus этого аккаунта на этом устройстве».
//
// зачем (координатор 29.10, после жалобы №8): Plus, который хранится только в облаке (оплата через Telegram-бот → VIP, промокод,
// админ-выдача), на новом устройстве ещё не доехал до телефона, а снимок профиля говорит «free» — окно покупки открывалось сразу,
// и человек мог заплатить второй раз. Отметка отличает «знаем, что Plus нет» от «ещё не спрашивали облако». Ставит её
// premium_guard после полной проверки с подтверждённым ответом; читает диспетчер окна покупки (premium_modal).
// Только локальный флаг на устройстве, в облако не уходит. Ключ по аккаунту: вход в другой аккаунт отметку не наследует.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'plus_cloud_confirmed_v1:';
const LOG = '[PLUS-CLOUD-MARK]';

/** Память процесса: stableId → true. Отсутствие ключа = ещё не читали с диска. */
const confirmedInMemory = new Map<string, boolean>();

function keyFor(stableId: string): string {
  return `${KEY_PREFIX}${stableId}`;
}

/** Синхронный взгляд: true/false — уже известно в этом процессе, null — диск ещё не читали. */
export function peekPlusCloudConfirmed(stableId: string | null): boolean | null {
  if (!stableId) return false;
  return confirmedInMemory.has(stableId) ? confirmedInMemory.get(stableId) === true : null;
}

/** Прочитать отметку (память → диск). Ошибка чтения = «не подтверждено» (окно подождёт облако, а не покажется зря). */
export async function readPlusCloudConfirmed(stableId: string | null): Promise<boolean> {
  if (!stableId) return false;
  const known = peekPlusCloudConfirmed(stableId);
  if (known !== null) return known;
  try {
    const raw = await AsyncStorage.getItem(keyFor(stableId));
    const confirmed = raw === '1';
    // зачем: запись из markPlusCloudConfirmed могла успеть, пока шло чтение, — «да» из памяти не затираем «нет» с диска
    if (confirmedInMemory.get(stableId) !== true) confirmedInMemory.set(stableId, confirmed);
    return confirmedInMemory.get(stableId) === true;
  } catch (error) {
    console.warn(`${LOG} чтение не удалось — считаем «облако не подтверждало»`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

/** Облако подтвердило статус аккаунта. Пишет на диск один раз на аккаунт и процесс. */
export function markPlusCloudConfirmed(stableId: string | null): void {
  if (!stableId) return;
  if (confirmedInMemory.get(stableId) === true) return; // зачем: уже отмечено — повторная запись на каждую проверку не нужна
  confirmedInMemory.set(stableId, true);
  console.warn(`${LOG} облако подтвердило статус на этом устройстве — окно покупки больше не ждёт облако`); // guard-ok: один раз на аккаунт
  void AsyncStorage.setItem(keyFor(stableId), '1').catch((error: unknown) => {
    console.warn(`${LOG} запись не удалась — в этом процессе отметка есть, после перезапуска окно один раз подождёт облако`, error instanceof Error ? error.message : String(error));
  });
}

/** Только для тестов. */
export function resetPlusCloudConfirmedForTests(): void {
  confirmedInMemory.clear();
}

export default function __RouteShim() { return null; }
