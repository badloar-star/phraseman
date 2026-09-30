// ═══ Визитка «Про»: состояние на телефоне + кэш своего текста (D114) ══════════
// зачем: вынесено из app/profile_card_pro_v1.ts, чтобы public_profile_snapshot мог
// читать «Про» без цикла импортов (покупка сама вызывает синхронизацию профиля).
// Где живёт: AsyncStorage `profile_card_pro_v1:<owner>` и `profile_card_bio_cache_v1:<owner>`
// под account-local префиксами cloud_sync (путешествуют и стираются вместе с аккаунтом).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DebugLogger } from './debug-logger';
import { isProfileCardProStyle, PROFILE_CARD_DEFAULT_PRO_STYLE, type ProfileCardProStyle } from './profile_card_styles';
import { PROFILE_CARD_LEVEL_KEY } from './profile_card_system';

const LOG = '[PROFILE-CARD]';

export const PROFILE_CARD_PRO_PREFIX = 'profile_card_pro_v1:';
export const PROFILE_CARD_BIO_CACHE_PREFIX = 'profile_card_bio_cache_v1:';

export type ProfileCardProStateV1 = Readonly<{
  schemaVersion: 'profile-card-pro.v1';
  ownerStableId: string;
  owned: boolean;
  style: ProfileCardProStyle | null;
  purchase: Readonly<{ operationId: string; price: number; atMs: number; style: ProfileCardProStyle }> | null;
}>;

export function profileCardProStateKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('profile_card_owner_invalid');
  return `${PROFILE_CARD_PRO_PREFIX}${encodeURIComponent(owner)}`;
}

export function profileCardBioCacheKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('profile_card_owner_invalid');
  return `${PROFILE_CARD_BIO_CACHE_PREFIX}${encodeURIComponent(owner)}`;
}

export function emptyProfileCardProState(ownerStableId: string): ProfileCardProStateV1 {
  return Object.freeze({
    schemaVersion: 'profile-card-pro.v1' as const,
    ownerStableId,
    owned: false,
    style: null,
    purchase: null,
  });
}

/**
 * Разбор записи. Пустая запись = «Про» нет (честный дефолт). Битая или чужая запись —
 * исключение: молча показать «нет Про» человеку, заплатившему 10 000, хуже явного
 * отказа с логом (так же устроен ранг монеты).
 */
export function parseProfileCardProState(raw: string | null, ownerStableId: string): ProfileCardProStateV1 {
  if (raw === null) return emptyProfileCardProState(ownerStableId);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    DebugLogger.warn(LOG, `pro parse: не JSON ${JSON.stringify({ owner: ownerStableId, error: String(error) })}`);
    throw new Error('profile_card_pro_state_corrupt');
  }
  const v = parsed as Partial<ProfileCardProStateV1>;
  const purchaseOk = v?.purchase === null || (
    !!v?.purchase
    && typeof v.purchase.operationId === 'string'
    && Number.isSafeInteger(v.purchase.price) && v.purchase.price > 0
    && Number.isSafeInteger(v.purchase.atMs) && v.purchase.atMs >= 0
    && isProfileCardProStyle(v.purchase.style)
  );
  if (!v || typeof v !== 'object'
    || v.schemaVersion !== 'profile-card-pro.v1'
    || v.ownerStableId !== ownerStableId
    || typeof v.owned !== 'boolean'
    || !(v.style === null || isProfileCardProStyle(v.style))
    || !purchaseOk
    || (v.owned && !v.style)) {
    DebugLogger.warn(LOG, `pro parse: запись не прошла проверку ${JSON.stringify({ owner: ownerStableId, owned: v?.owned, style: v?.style })}`);
    throw new Error('profile_card_pro_state_corrupt');
  }
  return v as ProfileCardProStateV1;
}

// ── Кэш в памяти + подписчики: визитка обновляется в тот же кадр, что и списание ──
export type ProfileCardProView = Readonly<{ owned: boolean; style: ProfileCardProStyle | null }>;
const proCache = new Map<string, ProfileCardProView>();
const bioCache = new Map<string, string>();
const listeners = new Set<(ownerStableId: string) => void>();

function notify(ownerStableId: string): void {
  listeners.forEach((listener) => {
    try {
      listener(ownerStableId);
    } catch (error) {
      DebugLogger.warn(LOG, `подписчик бросил исключение ${JSON.stringify({ error: String(error) })}`);
    }
  });
}

export function subscribeProfileCardPro(listener: (ownerStableId: string) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function peekProfileCardPro(ownerStableId: string | null | undefined): ProfileCardProView | null {
  const owner = ownerStableId?.trim();
  return owner ? proCache.get(owner) ?? null : null;
}

export function peekProfileCardBio(ownerStableId: string | null | undefined): string | null {
  const owner = ownerStableId?.trim();
  return owner ? bioCache.get(owner) ?? null : null;
}

export function publishProfileCardPro(ownerStableId: string, state: ProfileCardProStateV1): void {
  proCache.set(ownerStableId, Object.freeze({ owned: state.owned, style: state.style })); // guard-ok: Map в памяти процесса
  notify(ownerStableId);
}

/** Прочитать «Про» с диска. Битая запись → null + лог (визитка покажется обычной без выдумки). */
/**
 * зачем (владелец 30.09: «Да, всем купившим»): кто покупал уровни СТАРОЙ визитки
 * (profile_card_level ≥ 1), получает «Про» бесплатно. Стиль — по умолчанию, сменить
 * можно бесплатно в любой момент. Выдача пишется один раз; дальше обычная запись «Про».
 */
async function grantProForLegacyCardBuyer(ownerStableId: string): Promise<ProfileCardProStateV1 | null> {
  const rawLevel = await AsyncStorage.getItem(PROFILE_CARD_LEVEL_KEY);
  const level = Math.floor(Number(rawLevel ?? 0));
  if (!Number.isFinite(level) || level < 1) return null;
  const granted: ProfileCardProStateV1 = Object.freeze({
    schemaVersion: 'profile-card-pro.v1' as const,
    ownerStableId,
    owned: true,
    style: PROFILE_CARD_DEFAULT_PRO_STYLE,
    purchase: null,
  });
  await AsyncStorage.setItem(profileCardProStateKey(ownerStableId), JSON.stringify(granted));
  DebugLogger.info(LOG, `legacy grant: старая визитка уровня ${level} → «Про» ${JSON.stringify({ owner: ownerStableId, style: granted.style })}`);
  return granted;
}

export async function readProfileCardPro(ownerStableId: string): Promise<ProfileCardProView | null> {
  try {
    const raw = await AsyncStorage.getItem(profileCardProStateKey(ownerStableId));
    const state = raw === null
      ? (await grantProForLegacyCardBuyer(ownerStableId)) ?? parseProfileCardProState(null, ownerStableId)
      : parseProfileCardProState(raw, ownerStableId);
    const view = Object.freeze({ owned: state.owned, style: state.style });
    proCache.set(ownerStableId, view); // guard-ok: Map в памяти процесса
    return view;
  } catch (error) {
    DebugLogger.warn(LOG, `pro read: не удалось прочитать ${JSON.stringify({ owner: ownerStableId, error: String(error) })}`);
    return null;
  }
}

/** Свой текст из локального кэша (для мгновенного первого кадра своей визитки). */
export async function readProfileCardBioCache(ownerStableId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(profileCardBioCacheKey(ownerStableId));
    const text = typeof raw === 'string' ? raw : null;
    if (text !== null) bioCache.set(ownerStableId, text); // guard-ok: Map в памяти процесса
    return text;
  } catch (error) {
    DebugLogger.warn(LOG, `bio cache read: сбой ${JSON.stringify({ owner: ownerStableId, error: String(error) })}`);
    return null;
  }
}

/** Кладёт свой текст в кэш и будит подписчиков (optimistic: ДО ответа сервера). */
export function publishProfileCardBio(ownerStableId: string, text: string): void {
  bioCache.set(ownerStableId, text); // guard-ok: Map в памяти процесса
  notify(ownerStableId);
}

/** Сохраняет подтверждённый сервером текст в кэш на диске. */
export async function persistProfileCardBioCache(ownerStableId: string, text: string): Promise<void> {
  try {
    await AsyncStorage.setItem(profileCardBioCacheKey(ownerStableId), text);
  } catch (error) {
    DebugLogger.warn(LOG, `bio cache write: сбой ${JSON.stringify({ owner: ownerStableId, error: String(error) })}`);
  }
}

/** Для public_profile_snapshot: что проецировать в публичную визитку. */
export async function readProfileCardProForProjection(
  ownerStableId: string,
): Promise<{ profileCardPro: boolean; profileCardStyle?: ProfileCardProStyle }> {
  const view = await readProfileCardPro(ownerStableId);
  if (!view?.owned || !view.style) return { profileCardPro: false };
  return { profileCardPro: true, profileCardStyle: view.style };
}
