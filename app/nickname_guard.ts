import AsyncStorage from '@react-native-async-storage/async-storage';

const FALLBACK_NICKNAME_PREFIX = 'Phraseman';
/** Метка «имя X уже успешно записано в серверный name_index». Ключ — само имя. */
const NAME_INDEX_SYNCED_KEY = 'name_index_synced_for_v1';

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
