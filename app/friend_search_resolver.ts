import { isValidInviteCodeLookup, normalizeInviteCodeInput } from './friend_code';
import {
  lookupUserByFriendCode,
  lookupUserByNickname,
  type InviteCodeLookupResult,
} from './firestore_friends';

export type FriendSearchResolution =
  | { kind: 'self_code'; queryType: 'code' }
  | { kind: 'found'; queryType: 'code' | 'nickname'; result: InviteCodeLookupResult }
  | { kind: 'not_found'; queryType: 'nickname' };

/**
 * A six-character query can be either a friend code or a nickname. Code lookup
 * stays first because it is the cheaper indexed path; only a miss spends the
 * nickname callable. The local self-code is handled before either network call.
 */
export async function resolveFriendSearch(
  queryRaw: string,
  ownFriendCode: string | null,
): Promise<FriendSearchResolution> {
  const query = String(queryRaw ?? '').normalize('NFKC').trim();
  const normalizedCode = normalizeInviteCodeInput(query);
  const isCode = query.length === 6 && isValidInviteCodeLookup(query);
  const normalizedOwnCode = ownFriendCode ? normalizeInviteCodeInput(ownFriendCode) : '';

  if (isCode && normalizedOwnCode && normalizedCode === normalizedOwnCode) {
    return { kind: 'self_code', queryType: 'code' };
  }

  if (isCode) {
    const codeResult = await lookupUserByFriendCode(normalizedCode);
    if (codeResult) return { kind: 'found', queryType: 'code', result: codeResult };
  }

  const nicknameResult = await lookupUserByNickname(query);
  if (nicknameResult) return { kind: 'found', queryType: 'nickname', result: nicknameResult };
  return { kind: 'not_found', queryType: 'nickname' };
}
