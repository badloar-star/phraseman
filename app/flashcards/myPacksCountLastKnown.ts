/**
 * «Последний известный» счёт плитки «Мои наборы» на хабе Карточек — только для показа ДО точного числа.
 *
 * зачем (координатор 11.10, Optimistic UI / правило владельца): точный счёт (myPacksCountCache.ts) живёт 15 с и намеренно
 * не хранится на диске — после паузы или холодного старта плитка оставалась пустой, пока не догрузится каталог, а при
 * возврате на «тёплый» хаб (гейт HUB_FOCUS_WARM_TTL_MS) — пустой до следующего полного входа. Здесь лежит последнее
 * увиденное число (из точного снимка «Моих наборов» или из локального счёта хаба): оно показывается мгновенно, а точное
 * или локальное значение после загрузки его уточняет. Ключ — цель обучения + аккаунт: чужое число другому аккаунту не
 * показывается. Это ПРИБЛИЗИТЕЛЬНОЕ число для подписи плитки; решения («хаб новичка») по нему не принимаются.
 *
 * Экономия: ни одного запроса к сети и Firestore — только память и один небольшой ключ AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RuntimeStudyTarget } from '../target_storage_keys';

const STORAGE_KEY = 'fc_my_packs_count_last_known_v1';
const MAX_ENTRIES = 8;
const LOG = '[HUB-TILES]';

const known = new Map<string, number>();
let hydration: Promise<void> | null = null;

const keyOf = (studyTarget: RuntimeStudyTarget | string, userId: string | null): string => `${String(studyTarget)}|${userId ?? ''}`;

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 100000;

/** Синхронно: последнее известное число для этой цели и аккаунта или null. */
export function peekLastKnownMyPacksCount(studyTarget: RuntimeStudyTarget | string, userId: string | null): number | null {
  const value = known.get(keyOf(studyTarget, userId));
  return value === undefined ? null : value;
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...known.entries()]));
  } catch (error) {
    // зачем: не немой catch — без записи число просто не переживёт перезапуск, хаб при этом работает.
    console.warn(`${LOG} mine:last-known persist FAILED — ${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина в лог
  }
}

/** Запомнить число (из точного снимка или локального счёта). Повтор того же числа ничего не пишет. */
export function rememberLastKnownMyPacksCount(studyTarget: RuntimeStudyTarget | string, userId: string | null, count: number): void {
  if (!isCount(count)) {
    console.warn(`${LOG} mine:last-known отклонено — не число набора: ${String(count)}`); // guard-ok: ранний выход логируется
    return;
  }
  const key = keyOf(studyTarget, userId);
  if (known.get(key) === count) return;
  known.delete(key); // зачем: свежее — в конец, старое вытесняется первым
  known.set(key, count);
  while (known.size > MAX_ENTRIES) {
    const oldest = known.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    known.delete(oldest);
  }
  void persist();
}

/** Один раз поднять сохранённые числа с диска. То, что уже есть в памяти, новее диска — не затираем. */
export function hydrateLastKnownMyPacksCount(): Promise<void> {
  if (!hydration) {
    hydration = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          console.warn(`${LOG} mine:last-known hydrate: не список — игнорируем`); // guard-ok: ранний выход логируется
          return;
        }
        for (const entry of parsed) {
          if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !isCount(entry[1])) continue;
          if (!known.has(entry[0])) known.set(entry[0], entry[1]);
        }
      } catch (error) {
        console.warn(`${LOG} mine:last-known hydrate FAILED — ${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина в лог
      }
    })();
  }
  return hydration;
}

/** Только для тестов. */
export function __resetLastKnownMyPacksCountForTests(): void {
  known.clear();
  hydration = null;
}
