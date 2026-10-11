/**
 * DEV-фикстуры состояний для робот-съёмки (Maestro, сессия «Эмулятор»).
 *
 * зачем (координатор 11.10, план выпуска 20.10): робот снимает каждое состояние макета сам. Ему нужен способ одной
 * ссылкой выставить энергию, Plus, режим энергии, Шпиль, онбординг — без тапов по Dev Hub.
 *   phraseman://dev_state?energy=0&plus=off&mode=b&spire=open&onboarding=done&free=on&next=/(tabs)/home
 * Дополнительно (12.10, список съёмки R1): `cards=demo_lessons|custom50`, `catalog=empty|demo`, `quota=N|exhausted|reset` (30 тренировок/мес),
 * `dquota=N|reset` (осталось N реплик диалога из 30), `vip=promo|promo_lifetime|referral|survey|idea|tester|admin|admin_lifetime|off`
 * (плашка Plus в Настройках; после неё перезапустить приложение: force-stop → start), `plus=inherit` (снять локальный override).
 * Только dev-сборка: в стор-сборке маршрут вырезан router.ctx.js, а функция ничего не делает. В Firestore не пишет —
 * только локальные ключи устройства и dev-переопределения.
 * Логи: [DEV-STATE].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_STORE_RELEASE } from './config';
import { emitAppEvent } from './events';
import { devSetEnergy, setDevEnergyModeOverride } from './dev_energy_tools';
import { getDevLocalPlusStorageKey, setDevLocalPlusOverride } from './dev_plus_controls';
import { setDevAsFreeFlag } from './dev_as_free_flag';
import { getStableId } from './stable_id';
import { setSpireTabDevOverride } from './spire_tab_flag';
import { forceRefreshSpireGatesNow } from './spire_gate_refresh';

export type DevVipKind = 'promo' | 'promo_lifetime' | 'referral' | 'survey' | 'idea' | 'tester' | 'admin' | 'admin_lifetime' | 'off';
const VIP_KINDS = ['promo', 'promo_lifetime', 'referral', 'survey', 'idea', 'tester', 'admin', 'admin_lifetime', 'off'] as const;

/**
 * Значения локального снимка VIP (app/premium_vip_storage.ts) для плашки выдачи в группе Plus Настроек. Чистая функция.
 * Названия планов — те, что разбирает settings.tsx (vipAccessTitle): promo, promo_lifetime, referral, survey_vip, idea_reward, telegram_tester, admin_vip.
 * *_lifetime — без срока окончания (vip_until = 0). off — отозвано (vip_active = false).
 */
export function vipSnapshotValuesFor(kind: DevVipKind, nowMs: number): Record<'vip_active' | 'vip_plan' | 'vip_from' | 'vip_until' | 'vip_admin_override' | 'vip_admin_grant_at', string> {
  if (kind === 'off') {
    return { vip_active: 'false', vip_plan: '', vip_from: '0', vip_until: '0', vip_admin_override: 'false', vip_admin_grant_at: '' };
  }
  const plan = { promo: 'promo', promo_lifetime: 'promo_lifetime', referral: 'referral', survey: 'survey_vip', idea: 'idea_reward', tester: 'telegram_tester', admin: 'admin_vip', admin_lifetime: 'admin_vip' }[kind];
  const lifetime = kind === 'promo_lifetime' || kind === 'admin_lifetime';
  const admin = kind === 'admin' || kind === 'admin_lifetime';
  return {
    vip_active: 'true',
    vip_plan: plan,
    vip_from: String(nowMs - 60_000),
    vip_until: lifetime ? '0' : String(nowMs + 14 * 24 * 60 * 60 * 1000),
    // зачем: 'false' в override = «отозвано» (getVipProgressState), поэтому у не-админских видов поле пустое
    vip_admin_override: admin ? 'true' : '',
    vip_admin_grant_at: admin ? new Date(nowMs).toISOString() : '',
  };
}

export type DevStateRequest = Readonly<{
  energy?: number;
  mode?: 'a' | 'b' | 'server';
  plus?: 'on' | 'off' | 'inherit';
  /** Плашка доступа в группе Plus Настроек: вид выдачи (локальный снимок VIP; после неё — перезапуск приложения). */
  vip?: DevVipKind;
  /** Счётчик «N из 30 тренировок в месяц» (Free): использовано N, exhausted = 30, reset — стереть. */
  quota?: number | 'exhausted' | 'reset';
  /** Лимит реплик диалогов: осталось N из 30 (0 — «На этот месяц всё»), reset — стереть. */
  dquota?: number | 'reset';
  /** Кэш каталога сообщества: пустой (живая сеть, «Здесь появятся наборы…») или демо-наборы. */
  catalog?: 'empty' | 'demo';
  spire?: 'open' | 'closed';
  onboarding?: 'done' | 'pending';
  free?: 'on' | 'off';
  /** Карточки 2.0: наполненный аккаунт как на кадрах макета (dev_state_cards_demo.ts); demo_lessons — те же 64 с источниками для фильтра; custom50 — 50 своих карточек (лимит Free). */
  cards?: 'demo' | 'demo_lessons' | 'custom50';
  /** Слот сообщений Настроек (R1 settings-gap-007…009, 029): dev-кампания — опрос / опрос с голосом / сообщение внизу / сообщение вверху / убрать. */
  slot?: 'poll' | 'poll_voted' | 'message' | 'top' | 'off';
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
  request.plus = pick('plus', ['on', 'off', 'inherit'] as const);
  request.vip = pick('vip', VIP_KINDS);
  request.catalog = pick('catalog', ['empty', 'demo'] as const);
  const intOrWord = <W extends string>(key: string, word: readonly W[], max: number): number | W | undefined => {
    const value = one(params[key]);
    if (value === undefined) return undefined;
    if ((word as readonly string[]).includes(value)) return value as W;
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0 && n <= max) return n;
    rejected[key] = `ожидалось 0..${max} или ${word.join('|')}, пришло ${value}`;
    return undefined;
  };
  request.quota = intOrWord('quota', ['exhausted', 'reset'] as const, 30);
  request.dquota = intOrWord('dquota', ['reset'] as const, 30);
  request.spire = pick('spire', ['open', 'closed'] as const);
  request.onboarding = pick('onboarding', ['done', 'pending'] as const);
  request.free = pick('free', ['on', 'off'] as const);
  request.cards = pick('cards', ['demo', 'demo_lessons', 'custom50'] as const);
  request.slot = pick('slot', ['poll', 'poll_voted', 'message', 'top', 'off'] as const);
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
      if (request.plus === 'inherit') {
        // зачем: убрать локальный override — иначе projectDevLocalPlusOverride всегда гасит isVip/isPro и плашки выдачи не видны. Применится после перезапуска.
        await AsyncStorage.removeItem(getDevLocalPlusStorageKey(stableId));
        console.log('[DEV-STATE] plus override cleared (inherit) — перезапусти приложение'); // guard-ok: единичный лог на ссылку
        return;
      }
      await setDevLocalPlusOverride(stableId, request.plus === 'on' ? 'granted' : 'removed');
    });
  }
  if (request.vip) {
    await step('vip', request.vip, async () => {
      const stableId = await getStableId();
      const { writeVipSnapshotForAccount } = await import('./premium_vip_storage');
      // зачем: плашка выдачи видна только без dev-override (см. plus=inherit) — снимаем его вместе со снимком.
      await AsyncStorage.removeItem(getDevLocalPlusStorageKey(stableId));
      await writeVipSnapshotForAccount(stableId, vipSnapshotValuesFor(request.vip!, Date.now()));
      console.log('[DEV-STATE] vip snapshot', JSON.stringify({ kind: request.vip })); // guard-ok: единичный лог на ссылку
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
  if (request.cards === 'demo' || request.cards === 'demo_lessons') {
    await step('cards', request.cards, async () => {
      const { applyCardsDemo } = await import('./dev_state_cards_demo');
      const demo = await applyCardsDemo({ lessons: request.cards === 'demo_lessons' });
      for (const [key, reason] of Object.entries(demo.skipped)) skipped[`cards.${key}`] = reason;
      return Object.keys(demo.skipped).length === 0;
    });
  }
  // зачем (R1_SHOT_LIST «нет пути»): локальные состояния Карточек, лимитов и каталога — только ключи устройства, без записи в Firestore.
  if (request.cards === 'custom50') {
    await step('cards', 'custom50', async () => {
      const { applyCustomCards } = await import('./dev_state_cards_demo');
      await applyCustomCards();
    });
  }
  if (request.catalog) {
    await step('catalog', request.catalog, async () => {
      const { applyCatalog } = await import('./dev_state_cards_demo');
      await applyCatalog(request.catalog!);
    });
  }
  if (request.quota !== undefined) {
    await step('quota', String(request.quota), async () => {
      const { applyTrainingQuota } = await import('./dev_state_cards_demo');
      await applyTrainingQuota(await getStableId(), request.quota!);
    });
  }
  if (request.dquota !== undefined) {
    await step('dquota', String(request.dquota), async () => {
      const { applyDialogQuota } = await import('./dev_state_cards_demo');
      await applyDialogQuota(await getStableId(), request.dquota!);
    });
  }
  if (request.slot) {
    await step('slot', request.slot, async () => {
      const { devSeedSettingsMessageSlot } = await import('./app_messages');
      const seeded = await devSeedSettingsMessageSlot(request.slot!, await getStableId());
      if (!seeded.ok) throw new Error(seeded.reason);
    });
  }
  const result = { applied, skipped, next: request.next ?? null };
  console.log('[DEV-STATE] applied', JSON.stringify(result));
  return result;
}
