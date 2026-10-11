/**
 * [BOOT-RESTORE-DEFER] — отложенное восстановление из облака на холодном старте (пункт (а), координатор 11.10).
 *
 * зачем: восстановление на старте занимало 25–44 с (ожидание замков) и делило поток с первым кадром Главной. Человеку,
 * чьи локальные данные на этом телефоне уже сведены с его облаком, свежее облако может прийти на несколько секунд
 * позже без потерь (слияния 1–14 сохраняют локальное, защита «последняя запись» — свежие записи). Всем остальным —
 * как раньше.
 *
 * Когда откладываем (все условия разом, иначе прежний путь):
 *  - рубильник `remote_config_cache_v1.bools.boot_restore_defer_enabled` не false (действует со следующего старта);
 *  - онбординг пройден (`onboarding_done === '1'`);
 *  - личность чистая: дочистка удаления 'ready' и ворота восстановления входа 'proceed';
 *  - метка `boot_restore_owner_v1` равна текущему uid — это телефон уже восстанавливался ИМЕННО в этот аккаунт;
 *  - слежение за записями хранилища включено — без него защиту «последняя запись» не построить.
 * Запуск: после кадра Главной и простоя, не позже потолка (8 с), сразу — при уходе приложения в фон.
 * Перед запуском — проверка поколения аккаунта: сменился → отмена без тоста и без синка.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BootCloudRestoreOutcome } from './cloud_restore_coordinator';
import { armBootRestoreDirtyTracking, clearBootRestoreDirtyKeys, freezeBootRestoreDirtyKeys } from './boot_restore_dirty_keys';

export const BOOT_RESTORE_OWNER_KEY = 'boot_restore_owner_v1';
export const BOOT_RESTORE_DEFER_FLAG = 'boot_restore_defer_enabled';
export const BOOT_RESTORE_DEFER_CEILING_MS = 8_000;
const LOG = '[BOOT-RESTORE-DEFER]';

export type BootRestoreDeferInput = Readonly<{
  flagEnabled: boolean;
  onboardingDone: string | null;
  identityReady: boolean;
  recoveryProceed: boolean;
  ownerMark: string | null;
  stableId: string;
  mutationTracking: boolean;
}>;

export type BootRestoreDeferDecision = Readonly<{
  defer: boolean;
  reason:
    | 'flag_off' | 'onboarding_not_done' | 'identity_not_ready' | 'recovery_gate_not_proceed'
    | 'no_owner_mark' | 'owner_mismatch' | 'no_mutation_tracking' | 'deferred';
}>;

/** Чистое решение: откладывать ли восстановление. Порядок причин — от самой дешёвой проверки. */
export function decideBootRestoreDefer(input: BootRestoreDeferInput): BootRestoreDeferDecision {
  if (!input.flagEnabled) return { defer: false, reason: 'flag_off' };
  if (input.onboardingDone !== '1') return { defer: false, reason: 'onboarding_not_done' };
  if (!input.identityReady) return { defer: false, reason: 'identity_not_ready' };
  if (!input.recoveryProceed) return { defer: false, reason: 'recovery_gate_not_proceed' };
  if (!input.ownerMark) return { defer: false, reason: 'no_owner_mark' };
  if (input.ownerMark !== input.stableId) return { defer: false, reason: 'owner_mismatch' };
  if (!input.mutationTracking) return { defer: false, reason: 'no_mutation_tracking' };
  return { defer: true, reason: 'deferred' };
}

export type BootRestoreDeleteLockState = 'empty' | 'malformed' | 'active' | 'expired' | 'read_failed';

/**
 * Чиста ли личность для отсрочки.
 * зачем (Сверка 12.10, 🔴): ensureFreshPostDeletionIdentity при ОТСУТСТВИИ замка удаления (обычный пользователь) отдаёт
 * {status:'pending_auth', phase:'prepared'}, а 'ready' — только после завершённого удаления. Условие «только 'ready'»
 * делало отсрочку недостижимой. Та же пара бывает и при настоящем незавершённом удалении — поэтому смотрим на сам замок:
 * чисто, если 'ready' ИЛИ ('pending_auth' и замка нет). Любой замок или сбой его чтения — не чисто.
 */
export function bootRestoreIdentityClean(input: Readonly<{ freshStatus: string; deleteLock: BootRestoreDeleteLockState }>): boolean {
  if (input.freshStatus === 'ready') return true;
  return input.freshStatus === 'pending_auth' && input.deleteLock === 'empty';
}

/** Рубильник из сырого кэша remote_config (без сети). Нечитаемый кэш — значение по умолчанию (включено), с логом. */
export function bootRestoreDeferFlagFromCacheRaw(raw: string | null): boolean {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw) as { bools?: Record<string, unknown> };
    return parsed?.bools?.[BOOT_RESTORE_DEFER_FLAG] !== false;
  } catch (error) {
    console.warn(LOG, 'кэш рубильника не разобран — по умолчанию включено', error instanceof Error ? error.message : String(error));
    return true;
  }
}

/** Метка владельца после успешного восстановления (только если аккаунт не сменился за это время). */
export async function writeBootRestoreOwnerMark(stableId: string, stillCurrent: () => boolean): Promise<void> {
  if (!stillCurrent()) {
    console.log(LOG, JSON.stringify({ event: 'owner_mark_skip', reason: 'account_changed' }));
    return;
  }
  try {
    await AsyncStorage.setItem(BOOT_RESTORE_OWNER_KEY, stableId);
  } catch (error) {
    // зачем: без метки следующий старт просто пойдёт прежним путём — не страшно, но причина должна быть видна.
    console.warn(LOG, 'метка владельца не записалась', error instanceof Error ? error.message : String(error));
  }
}

export type DeferredBootRestoreDeps = Readonly<{
  run: () => Promise<BootCloudRestoreOutcome>;
  isAccountCurrent: () => boolean;
  whenHomePainted: (ceilingMs: number) => Promise<unknown>;
  runAfterInteractions: (cb: () => void) => void;
  subscribeBackground: (cb: () => void) => () => void;
  ceilingMs?: number;
}>;

export type DeferredStartTrigger = 'idle' | 'ceiling' | 'background' | 'sync_requested' | 'effect_disposed' | string;

const FAILED_OUTCOME: BootCloudRestoreOutcome = { status: 'failed', hasLocalAccountData: true, shouldSync: false };

/**
 * Отложенный запуск. Промис возвращается СРАЗУ — его назначают в общий cloudHydratePromise, чтобы второе место
 * запуска (runHeavyInit) не начало своё восстановление. Ничего не теряется: потолок гарантирует запуск, любой
 * сбой внутри разрешает промис как прежний провал восстановления (серия, проверки и отправка не повиснут).
 * Запрос отправки в облако во время ожидания тоже запускает восстановление (cloud_sync → requestDeferredBootRestoreStart).
 */
export function startDeferredBootRestore(deps: DeferredBootRestoreDeps): Promise<BootCloudRestoreOutcome> {
  const ceilingMs = deps.ceilingMs ?? BOOT_RESTORE_DEFER_CEILING_MS;
  const armedAt = Date.now();
  return new Promise<BootCloudRestoreOutcome>((resolve) => {
    let started = false;
    let ceilingTimer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeBackground: (() => void) | null = null;
    const finish = (outcome: BootCloudRestoreOutcome) => {
      // зачем: список «свежих» ключей и ворота отправки снимаются ДО того, как результат увидят ждущие.
      clearBootRestoreDirtyKeys();
      resolve(outcome);
    };
    const start = (trigger: DeferredStartTrigger) => {
      if (started) return;
      started = true;
      try {
        if (ceilingTimer) clearTimeout(ceilingTimer);
        unsubscribeBackground?.();
        const dirty = freezeBootRestoreDirtyKeys();
        if (!deps.isAccountCurrent()) {
          console.log(LOG, JSON.stringify({ event: 'cancel', reason: 'account_changed', trigger, waitedMs: Date.now() - armedAt }));
          // Без тоста и без синка: это уже другой аккаунт, у него свой путь восстановления.
          finish({ status: 'not_found', hasLocalAccountData: true, shouldSync: false });
          return;
        }
        console.log(LOG, JSON.stringify({ event: 'start', trigger, waitedMs: Date.now() - armedAt, dirtyKeys: dirty.count, allKeysTouched: dirty.allKeysTouched }));
        void deps.run().then((outcome) => {
          console.log(LOG, JSON.stringify({ event: 'done', trigger, status: outcome.status, shouldSync: outcome.shouldSync, totalMs: Date.now() - armedAt }));
          finish(outcome);
        }, (error: unknown) => {
          // run() координатора сам не бросает; на всякий случай — как прежний провал восстановления.
          console.warn(LOG, 'восстановление бросило', error instanceof Error ? error.message : String(error));
          finish(FAILED_OUTCOME);
        });
      } catch (error) {
        console.warn(LOG, 'старт упал — как провал восстановления', error instanceof Error ? error.message : String(error));
        finish(FAILED_OUTCOME);
      }
    };
    armBootRestoreDirtyTracking((reason) => start(reason));
    ceilingTimer = setTimeout(() => start('ceiling'), ceilingMs);
    try {
      unsubscribeBackground = deps.subscribeBackground(() => start('background'));
    } catch (error) {
      console.warn(LOG, 'подписка на уход в фон не встала — остаются простой и потолок', error instanceof Error ? error.message : String(error));
    }
    void deps.whenHomePainted(ceilingMs)
      .then(() => deps.runAfterInteractions(() => start('idle')))
      .catch((error: unknown) => {
        console.warn(LOG, 'ожидание кадра Главной упало — стартуем сейчас', error instanceof Error ? error.message : String(error));
        start('paint_wait_failed');
      });
  });
}

/* expo-router: keep this utility from being treated as a screen */
export default function __BootRestoreDeferRouteShim() {
  return null;
}
