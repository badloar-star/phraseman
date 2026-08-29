import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getCanonicalUserId } from './user_id_policy';
import { getStableId } from './stable_id';
import { ensureStableAuthLinkForStableId } from './cloud_sync';
import { callReferralEnsureMyCode, isReferralCloudEnabled } from './referral_cloud';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { DebugLogger } from './debug-logger';

const LEGACY_REFERRAL_KEY = 'user_referral_code';
const LEGACY_REFERRAL_OWNER_KEY = 'user_referral_code_owner_v1';
const REFERRAL_KEY_PREFIX = 'user_referral_code_v2';

type ReferralCodeScope = Readonly<{
  token: AccountGenerationToken;
  accountKey: string;
  stableId: string;
  storageKey: string;
}>;

export function referralCodeStorageKey(stableId: string): string {
  return `${REFERRAL_KEY_PREFIX}:${encodeURIComponent(stableId.trim())}`;
}

function referralCodeLegacyMigrationKey(stableId: string): string {
  return `${REFERRAL_KEY_PREFIX}:legacy-checked:${encodeURIComponent(stableId.trim())}`;
}

function referralCodeScopeIsCurrent(scope: ReferralCodeScope): boolean {
  return accountScopeKey(scope.token) === scope.accountKey
    && isCurrentAccountGeneration(scope.token, scope.stableId);
}

async function currentReferralCodeScope(): Promise<ReferralCodeScope | null> {
  const stableId = String(await getStableId().catch(() => '')).trim();
  const token = captureAccountGeneration();
  const currentAccountKey = accountScopeKey(token);
  if (!stableId || !currentAccountKey || !isCurrentAccountGeneration(token, stableId)) return null;
  return {
    token,
    accountKey: currentAccountKey,
    stableId,
    storageKey: referralCodeStorageKey(stableId),
  };
}

function normalizeReferralCode(value: string | null | undefined): string | null {
  const code = String(value ?? '').trim().toUpperCase();
  return code.length >= 4 ? code : null;
}

async function migrateLegacyReferralCode(scope: ReferralCodeScope): Promise<string | null> {
  const migrationKey = referralCodeLegacyMigrationKey(scope.stableId);
  const alreadyChecked = await AsyncStorage.getItem(migrationKey).catch(() => null);
  if (!referralCodeScopeIsCurrent(scope) || alreadyChecked === '1') return null;
  const pairs = await AsyncStorage.multiGet([LEGACY_REFERRAL_KEY, LEGACY_REFERRAL_OWNER_KEY]);
  if (!referralCodeScopeIsCurrent(scope)) return null;
  const legacyCode = normalizeReferralCode(
    pairs.find(([key]) => key === LEGACY_REFERRAL_KEY)?.[1],
  );
  const legacyOwner = String(
    pairs.find(([key]) => key === LEGACY_REFERRAL_OWNER_KEY)?.[1] ?? '',
  ).trim();
  const safelyOwnedCode = legacyOwner === scope.stableId ? legacyCode : null;
  if (safelyOwnedCode) await AsyncStorage.setItem(scope.storageKey, safelyOwnedCode);
  if (!referralCodeScopeIsCurrent(scope)) return null;
  // Plain legacy codes carry no owner. They are deliberately discarded and
  // reloaded from the server instead of being guessed onto the current account.
  await AsyncStorage.multiRemove([LEGACY_REFERRAL_KEY, LEGACY_REFERRAL_OWNER_KEY]);
  await AsyncStorage.setItem(migrationKey, '1');
  return referralCodeScopeIsCurrent(scope) ? safelyOwnedCode : null;
}

async function readReferralCodeForScope(scope: ReferralCodeScope): Promise<string | null> {
  const stored = normalizeReferralCode(await AsyncStorage.getItem(scope.storageKey));
  if (!referralCodeScopeIsCurrent(scope)) return null;
  return stored ?? migrateLegacyReferralCode(scope);
}

function randomLocalReferralSuffix(): string {
  const bytes = new Uint8Array(4);
  Crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s.slice(0, 6).toUpperCase();
}

/**
 * С облаком: только серверный код (без «левого» локального, который не в referral_codes).
 * Без облака (Expo Go): локальный код с crypto-суффиксом.
 */
export async function generateReferralCode(name: string): Promise<string> {
  try {
    const scope = await currentReferralCodeScope();
    if (!scope) return '';
    if (isReferralCloudEnabled()) {
      const sid = await getCanonicalUserId();
      if (sid === scope.stableId && referralCodeScopeIsCurrent(scope)) {
        // Серверная referralEnsureMyCode требует auth_links/{authUid} (assertAuthStableLink).
        // У анонимного юзера на свежей установке линка ещё нет — без этого вызова CF падает
        // с LINK_ACCOUNT_REQUIRED, код возвращается пустым и в /friends зияет дыра в тексте.
        // Все остальные серверные пути (друзья/лидерборд/подарки/пуши) линкуются ТАК ЖЕ перед
        // вызовом — referral был единственным, кто это пропускал.
        await ensureStableAuthLinkForStableId(sid).catch(() => false);
        if (!referralCodeScopeIsCurrent(scope)) return '';
        try {
          const { code } = await callReferralEnsureMyCode(sid);
          const normalized = normalizeReferralCode(code);
          if (normalized && referralCodeScopeIsCurrent(scope)) {
            await AsyncStorage.setItem(scope.storageKey, normalized);
            return referralCodeScopeIsCurrent(scope) ? normalized : '';
          }
        } catch (e) {
      // линк ещё не готов (медленная сеть) — добьём ретраем в friends.tsx useEffect
      DebugLogger.error('referral_system:normalized', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      }
      return '';
    }

    const existing = await readReferralCodeForScope(scope);
    if (existing) return existing;

    const base = name.replace(/\s+/g, '').toUpperCase().slice(0, 4) || 'USER';
    const code = `${base}${randomLocalReferralSuffix()}`;

    if (!referralCodeScopeIsCurrent(scope)) return '';
    await AsyncStorage.setItem(scope.storageKey, code);
    return referralCodeScopeIsCurrent(scope) ? code : '';
  } catch {
    return '';
  }
}

/** Для «Поделиться»: не показывать пустую ссылку, пока нет кода (вход + ensure в облаке). */
export async function hasReferralCodeReady(): Promise<boolean> {
  const c = await getReferralCode();
  return typeof c === 'string' && c.trim().length >= 4;
}

/** Возвращает сохранённый реферальный код пользователя */
export async function getReferralCode(): Promise<string | null> {
  try {
    const scope = await currentReferralCodeScope();
    if (!scope) return null;
    return await readReferralCodeForScope(scope);
  } catch {
    return null;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
