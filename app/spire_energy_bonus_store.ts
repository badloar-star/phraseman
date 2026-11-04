/**
 * зачем (владелец 04.11, «энергия от Пика»): бонус к запасу энергии (0..11) = лиги Пика, набранные после выхода правила.
 * Источник истины — сервер (leaderboard.spireEnergyDeltas, приходит в ответе spireJoinRoom). Здесь — локальная копия:
 * память для первого кадра + AsyncStorage (ключ ходит в облачную синхронизацию общего профиля, переживает переустановку).
 * Нет значения → 0 → запас прежние 5 (поведение «до выхода правила»). Чтений Firebase нет.
 * Логи [SPIRE-ENERGY]: откуда пришло значение, что изменилось.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPIRE_ENERGY_BONUS_CAP } from './energy_contract';

export const SPIRE_ENERGY_BONUS_KEY = 'spire_energy_bonus_v1';

let bonus = 0;
let hydrated = false;
let hydrating: Promise<number> | null = null;
const listeners = new Set<(next: number) => void>();

function clampBonus(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(SPIRE_ENERGY_BONUS_CAP, Math.trunc(n))) : 0;
}

export function getSpireEnergyBonus(): number {
  return bonus;
}

export function subscribeSpireEnergyBonus(listener: (next: number) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Один раз читает локальную копию; повторные вызовы мгновенны. Не бросает. */
export function hydrateSpireEnergyBonus(): Promise<number> {
  if (hydrated) return Promise.resolve(bonus);
  if (hydrating) return hydrating;
  hydrating = AsyncStorage.getItem(SPIRE_ENERGY_BONUS_KEY)
    .then((raw) => {
      // свежее значение с сервера могло прийти раньше чтения диска — не затираем его
      if (!hydrated) {
        bonus = Math.max(bonus, clampBonus(raw));
        hydrated = true;
        console.log('[SPIRE-ENERGY] hydrate', JSON.stringify({ raw, bonus })); // guard-ok: источник значения
      }
      return bonus;
    })
    .catch((error: unknown) => {
      hydrated = true;
      console.warn('[SPIRE-ENERGY] hydrate:failed → бонус 0', error instanceof Error ? error.message : String(error));
      return bonus;
    })
    .finally(() => { hydrating = null; });
  return hydrating;
}

/** Серверное значение (spireJoinRoom). Меняет память сразу (оптимистично), пишет на диск фоном, будит подписчиков. */
export function setSpireEnergyBonus(next: unknown, source: string): void {
  const value = clampBonus(next);
  hydrated = true;
  if (value === bonus) {
    console.log('[SPIRE-ENERGY] set:unchanged', JSON.stringify({ source, bonus })); // guard-ok: ранний выход с причиной
    return;
  }
  const previous = bonus;
  bonus = value;
  console.log('[SPIRE-ENERGY] set', JSON.stringify({ source, previous, next: value })); // guard-ok: смена бонуса
  AsyncStorage.setItem(SPIRE_ENERGY_BONUS_KEY, String(value)).catch((error: unknown) => {
    console.warn('[SPIRE-ENERGY] persist:failed', error instanceof Error ? error.message : String(error));
  });
  listeners.forEach((listener) => {
    try { listener(value); } catch (error) { console.warn('[SPIRE-ENERGY] listener:failed', error instanceof Error ? error.message : String(error)); }
  });
}

/** Сброс при смене аккаунта (память; диск стирается общей чисткой ключей аккаунта). */
export function resetSpireEnergyBonusForAccountSwitch(): void {
  bonus = 0;
  hydrated = false;
  hydrating = null;
  listeners.forEach((listener) => listener(0));
}

/** Только для тестов. */
export function __resetSpireEnergyBonusForTests(): void {
  bonus = 0;
  hydrated = false;
  hydrating = null;
  listeners.clear();
}
