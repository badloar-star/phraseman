/**
 * DEV-фикстуры состояний для робот-съёмки (Maestro, сессия «Эмулятор»).
 *
 * зачем (координатор 11.10, план выпуска 20.10): робот снимает каждое состояние макета сам. Ему нужен способ одной
 * ссылкой выставить энергию, Plus, режим энергии, Шпиль, онбординг — без тапов по Dev Hub.
 *   phraseman://dev_state?energy=0&plus=off&mode=b&spire=open&onboarding=done&free=on&next=/(tabs)/home
 * Только dev-сборка: в стор-сборке маршрут вырезан router.ctx.js, а функция ничего не делает. В Firestore не пишет —
 * только локальные ключи устройства и dev-переопределения.
 * Логи: [DEV-STATE].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_STORE_RELEASE } from './config';
import { emitAppEvent } from './events';
import { devSetEnergy, setDevEnergyModeOverride } from './dev_energy_tools';
import { setDevLocalPlusOverride } from './dev_plus_controls';
import { setDevAsFreeFlag } from './dev_as_free_flag';
import { getStableId } from './stable_id';
import { setSpireTabDevOverride } from './spire_tab_flag';
import { forceRefreshSpireGatesNow } from './spire_gate_refresh';

export type DevStateRequest = Readonly<{
  energy?: number;
  mode?: 'a' | 'b' | 'server';
  plus?: 'on' | 'off';
  spire?: 'open' | 'closed';
  onboarding?: 'done' | 'pending';
  free?: 'on' | 'off';
  next?: string;
}>;

export type DevStateResult = Readonly<{ applied: Record<string, string>; skipped: Record<string, string>; next: string | null }>;

const one = (value: unknown): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : undefined;
};

/** Разбор параметров ссылки. Неизвестные значения отбрасываются (и попадают в skipped с причиной). Чистая функция. */
export function parseDevStateParams(params: Readonly<Record<string, unknown>>): { request: DevStateRequest; rejected: Record<string, string> } {
  const rejected: Record<string, string> = {};
  const request: { -readonly [K in keyof DevStateRequest]: DevStateRequest[K] } = {};
  const energy = one(params.energy);
  if (energy !== undefined) {
    const n = Number(energy);
    if (Number.isInteger(n) && n >= 0 && n <= 5) request.energy = n;
    else rejected.energy = `ожидалось 0..5, пришло ${energy}`;
  }
  const pick = <T extends string>(key: string, allowed: readonly T[]): T | undefined => {
    const value = one(params[key]);
    if (value === undefined) return undefined;
    if ((allowed as readonly string[]).includes(value)) return value as T;
    rejected[key] = `ожидалось ${allowed.join('|')}, пришло ${value}`;
    return undefined;
  };
  request.mode = pick('mode', ['a', 'b', 'server'] as const);
  request.plus = pick('plus', ['on', 'off'] as const);
  request.spire = pick('spire', ['open', 'closed'] as const);
  request.onboarding = pick('onboarding', ['done', 'pending'] as const);
  request.free = pick('free', ['on', 'off'] as const);
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  if (typeof next === 'string' && next.startsWith('/')) request.next = next;
  else if (next !== undefined) rejected.next = `маршрут должен начинаться с «/», пришло ${String(next)}`;
  return { request, rejected };
}

export function isDevStateAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Выставить состояния. Каждое — независимо: сбой одного не мешает остальным (и пишет причину). */
export async function applyDevState(request: DevStateRequest): Promise<DevStateResult> {
  const applied: Record<string, string> = {};
  const skipped: Record<string, string> = {};
  if (!isDevStateAvailable()) {
    console.warn('[DEV-STATE] refused: not a dev build'); // guard-ok: ранний выход логируется
    return { applied, skipped: { all: 'not_dev_build' }, next: null };
  }
  const step = async (key: string, value: string, run: () => Promise<boolean | void>) => {
    try {
      const ok = await run();
      if (ok === false) skipped[key] = `${value}: отказ`;
      else applied[key] = value;
    } catch (error) {
      skipped[key] = `${value}: ${error instanceof Error ? error.message : String(error)}`;
    }
  };
  if (request.mode) {
    const mode = request.mode === 'a' ? 'start_charge' : request.mode === 'b' ? 'mistake_charge' : null;
    await step('mode', request.mode, () => setDevEnergyModeOverride(mode));
  }
  if (request.energy !== undefined) await step('energy', String(request.energy), () => devSetEnergy(request.energy!));
  if (request.plus) {
    await step('plus', request.plus, async () => {
      const stableId = await getStableId();
      await setDevLocalPlusOverride(stableId, request.plus === 'on' ? 'granted' : 'removed');
    });
  }
  if (request.free) await step('free', request.free, () => setDevAsFreeFlag(request.free === 'on'));
  if (request.spire) {
    await step('spire', request.spire, async () => {
      await setSpireTabDevOverride(request.spire === 'open');
      if (request.spire === 'open') await forceRefreshSpireGatesNow();
    });
  }
  if (request.onboarding) {
    await step('onboarding', request.onboarding, async () => {
      if (request.onboarding === 'done') {
        await AsyncStorage.setItem('onboarding_done', '1');
      } else {
        await AsyncStorage.multiRemove(['onboarding_done', 'onboarding_step', 'onboarding_flow_version_v1']);
        emitAppEvent('dev_onboarding_restart');
      }
    });
  }
  const result = { applied, skipped, next: request.next ?? null };
  console.log('[DEV-STATE] applied', JSON.stringify(result));
  return result;
}
