import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { emitAppEvent } from './events';
import { peekStableId } from './stable_id';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';

const FALLBACK_NICKNAME_PREFIX = 'Phraseman';
/** Метка «имя X уже успешно записано в серверный name_index». Ключ — само имя. */
const NAME_INDEX_SYNCED_KEY = 'name_index_synced_for_v1';
const GENERATED_NAME_CONFIRMED_KEY = 'generated_name_confirmed_v1';
export const GENERATED_NICKNAME_PENDING_KEY = 'generated_nickname_pending_v1';
let pendingNicknameFlight: Promise<void> | null = null;
let pendingNicknameRetry: ReturnType<typeof setTimeout> | null = null;
let pendingNicknameAppStateSub: { remove: () => void } | null = null;
let pendingNicknameRetryAttempt = 0;
const PENDING_NICKNAME_RETRY_DELAYS_MS = [5_000, 15_000, 45_000] as const;

export function createRandomNickname(now = Date.now(), random = Math.random()): string {
  const rand = Math.floor(Math.max(0, Math.min(0.99999, random)) * 90_000) + 10_000;
  const suffix = String((Math.abs(Math.trunc(now)) + rand) % 100_000).padStart(5, '0');
  return `${FALLBACK_NICKNAME_PREFIX} ${suffix}`;
}

/**
 * Гарантирует, что серверный name_index содержит запись для текущего имени.
 *
 * Раньше запись в индекс шла ТОЛЬКО при смене имени (finalName !== stored) и «отправил
 * и забыл» с молчаливым .catch — если та единственная попытка срывалась (офлайн, auth
 * не готов, имя «занято»), юзер навсегда выпадал из поиска по нику. Теперь:
 *  • пытаемся при КАЖДОМ вызове, пока имя не помечено как успешно засинканное;
 *  • ждём результат и по статусу решаем, помечать ли синк (retry на следующем запуске);
 *  • 'ok'/'taken' → имя в индексе есть (свой слот либо чужой живой) → метим синк;
 *    'error'/'cooldown' → НЕ метим → повтор при следующем ensureLocalNickname.
 * Best-effort: любые исключения не должны ломать вызывающий код.
 *
 * ВАЖНО про source: 'onboarding' передаём ТОЛЬКО при реальной смене/первой установке
 * имени (justChanged) — на сервере source:'onboarding' каждый раз ПЕРЕВЫДАЁТ бесплатную
 * смену ника (grantsFreeChange, leaderboard.ts:269). Повторная сверка того же имени с
 * этим source возвращала бы юзеру бесплатную смену после каждого переименования в
 * настройках, обнуляя 14-дневный кулдаун. Без source настоящий первый сет всё равно
 * получит бесплатную смену через isInitialNameSet на сервере.
 */
async function reconcileNameIndex(name: string, oldName: string, justChanged: boolean): Promise<void> {
  const target = name.trim();
  if (target.length < 2) return;
  try {
    const alreadySynced = (await AsyncStorage.getItem(NAME_INDEX_SYNCED_KEY).catch(() => null))?.trim();
    if (alreadySynced === target) return;

    const { reserveNameDetailed } = await import('./firestore_leaderboard');
    const { status } = await reserveNameDetailed(
      target,
      oldName.trim(),
      justChanged ? { source: 'onboarding' } : {},
    );
    // 'ok' — наш слот; 'taken' — имя принадлежит живому владельцу (возможно, нам же на
    // другом устройстве), в индексе оно ЕСТЬ. В обоих случаях дальше ретраить незачем.
    if (status === 'ok' || status === 'taken') {
      await AsyncStorage.setItem(NAME_INDEX_SYNCED_KEY, target).catch(() => {});
    }
    // 'error' / 'cooldown' — метку не ставим: повтор при следующем запуске.
  } catch {
    /* best-effort; повтор при следующем ensureLocalNickname */
  }
}

export async function ensureLocalNickname(candidate?: string | null): Promise<string> {
  const trimmedCandidate = String(candidate ?? '').trim();
  const stored = (await AsyncStorage.getItem('user_name').catch(() => null))?.trim() ?? '';
  const finalName = trimmedCandidate || stored || createRandomNickname();

  const justChanged = finalName !== stored;
  if (justChanged) {
    await AsyncStorage.setItem('user_name', finalName);
    // Имя изменилось → прежняя метка синка недействительна.
    await AsyncStorage.removeItem(NAME_INDEX_SYNCED_KEY).catch(() => {});
  }

  // Пытаемся довести имя до серверного индекса при каждом запуске, пока не подтвердится.
  // Не блокирует критический путь: ensureLocalNickname уже вызывается вне рендера.
  await reconcileNameIndex(finalName, stored, justChanged);

  return finalName;
}

/**
 * @param baseName имя из аккаунта (Apple/Google), если вошли. Сервер выдаст «Имя N»
 *   с порядковым номером — третий Виталий станет «Виталий 3». Без имени — случайный ник.
 *   Уже подтверждённый ник не перегенерируется: повторный вызов вернёт его как есть.
 */
export async function ensureUniqueGeneratedNickname(baseName?: string | null): Promise<string> {
  const stored = (await AsyncStorage.getItem('user_name').catch(() => null))?.trim() ?? '';
  const confirmed = (await AsyncStorage.getItem(GENERATED_NAME_CONFIRMED_KEY).catch(() => null))?.trim() ?? '';
  if (stored && confirmed === stored) return stored;
  const { generateAndReserveNickname } = await import('./firestore_leaderboard');
  const result = await generateAndReserveNickname(baseName);
  const name = result.status === 'ok' ? String(result.name ?? '').trim() : '';
  if (!name) throw new Error('nickname_reservation_unavailable');
  await AsyncStorage.multiSet([
    ['user_name', name],
    [NAME_INDEX_SYNCED_KEY, name],
    [GENERATED_NAME_CONFIRMED_KEY, name],
  ]);
  return name;
}

function schedulePendingNicknameRetry(): void {
  if (pendingNicknameRetry) return;
  if (pendingNicknameRetryAttempt >= PENDING_NICKNAME_RETRY_DELAYS_MS.length) {
    // зачем: бюджет из 3 отложенных попыток исчерпан, а AppState-слушатель раньше
    // ОСТАВАЛСЯ жить и дёргал сеть на каждый разворот приложения бесконечно
    // (аудит нагрева 2026-07-25). Снимаем слушатель; счётчик НЕ сбрасываем —
    // свежий бюджет даёт только новый запуск приложения (ensureLocalNickname).
    pendingNicknameAppStateSub?.remove();
    pendingNicknameAppStateSub = null;
    return;
  }
  if (!pendingNicknameAppStateSub) {
    pendingNicknameAppStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        if (pendingNicknameRetry) clearTimeout(pendingNicknameRetry);
        pendingNicknameRetry = null;
        return;
      }
      void resumePendingGeneratedNickname();
    });
  }
  if (AppState.currentState !== 'active') return;
  const delay = PENDING_NICKNAME_RETRY_DELAYS_MS[pendingNicknameRetryAttempt];
  pendingNicknameRetryAttempt += 1;
  pendingNicknameRetry = setTimeout(() => {
    pendingNicknameRetry = null;
    void resumePendingGeneratedNickname();
  }, delay);
}

export function cancelPendingGeneratedNicknameRetry(): void {
  if (pendingNicknameRetry) clearTimeout(pendingNicknameRetry);
  pendingNicknameRetry = null;
  pendingNicknameAppStateSub?.remove();
  pendingNicknameAppStateSub = null;
  pendingNicknameRetryAttempt = 0;
}

export function resumePendingGeneratedNickname(): Promise<void> {
  if (pendingNicknameFlight) return pendingNicknameFlight;
  pendingNicknameFlight = (async () => {
    const pending = await AsyncStorage.getItem(GENERATED_NICKNAME_PENDING_KEY).catch(() => null);
    if (!pending) {
      cancelPendingGeneratedNicknameRetry();
      return;
    }
    const accountToken = captureAccountGeneration();
    // зачем 2026-08-17 (владелец): онбординг кладёт во флаг имя из аккаунта, если
    // вошли через Apple/Google — сервер сделает из него «Имя N». Старый флаг без
    // baseName (или не-JSON) даёт прежний случайный ник — обратная совместимость.
    let baseName: string | undefined;
    try {
      const parsed = JSON.parse(pending) as { baseName?: unknown };
      const candidate = String(parsed?.baseName ?? '').trim();
      if (candidate) baseName = candidate;
    } catch { /* старый формат флага — без базового имени */ }
    const { generateAndReserveNickname } = await import('./firestore_leaderboard');
    const result = await generateAndReserveNickname(baseName);
    const name = result.status === 'ok' ? String(result.name ?? '').trim() : '';
    const resultStableId = String(result.stableId ?? '').trim();
    if (!name || !resultStableId) {
      schedulePendingNicknameRetry();
      return;
    }
    let applied = false;
    await withAccountTransitionLock(async () => {
      const stillPending = await AsyncStorage.getItem(GENERATED_NICKNAME_PENDING_KEY).catch(() => null);
      if (!stillPending || !isCurrentAccountGeneration(accountToken, resultStableId)) return;
      const activeStableId = peekStableId();
      if (resultStableId !== activeStableId) return;

      const rawProfile = await AsyncStorage.getItem('user_profile').catch(() => null);
      let profile: Record<string, unknown> = {};
      try { profile = rawProfile ? JSON.parse(rawProfile) as Record<string, unknown> : {}; } catch {}
      await AsyncStorage.multiSet([
        ['user_name', name],
        ['user_profile', JSON.stringify({ ...profile, name })],
        [NAME_INDEX_SYNCED_KEY, name],
        [GENERATED_NAME_CONFIRMED_KEY, name],
      ]);
      await AsyncStorage.removeItem(GENERATED_NICKNAME_PENDING_KEY);
      applied = true;
    });
    if (!applied) return;
    cancelPendingGeneratedNicknameRetry();
    emitAppEvent('cloud_profile_hydrated');
  })().catch(() => {
    schedulePendingNicknameRetry();
  }).finally(() => {
    pendingNicknameFlight = null;
  });
  return pendingNicknameFlight;
}
