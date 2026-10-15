import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v2';

/**
 * Один push-токен устройства — один владелец.
 *
 * зачем (координатор 15.10, ревью Авторизации (Б) к 414bb1713): выход из аккаунта A в офлайне не снимал токен из
 * users/{A}, а клиент после выхода стереть его уже не может (правила пускают только владельца). Когда на том же телефоне
 * B регистрирует токен, тот же токен оказывался в двух документах — пуши A (серия, Шпиль, напоминания) приходили человеку B.
 * Обработчик в общем триггере users/{userId} (users_write_router — без новой инвокации): на СМЕНУ токена в документе —
 * один запрос where('expoPushToken','==',token).limit(10) и снятие поля у остальных документов. Запись без смены токена
 * выходит сразу, без чтений. Повтор триггера безопасен: второй проход ничего не найдёт.
 */
export const PUSH_TOKEN_FIELD = 'expoPushToken';
const DEDUPE_QUERY_LIMIT = 10;

type UserDoc = Record<string, unknown> | undefined;

/** Токен, который надо снять у остальных, или null (не менялся / пусто / не строка). Чистая функция. */
export function pushTokenToDedupe(before: UserDoc, after: UserDoc): string | null {
  const next = after?.[PUSH_TOKEN_FIELD];
  if (typeof next !== 'string') return null;
  const token = next.trim();
  if (token.length < 10 || token.length > 400) return null;
  return before?.[PUSH_TOKEN_FIELD] === next ? null : token;
}

export type PushTokenDedupeDeps = Readonly<{
  findHolders: (token: string, limit: number) => Promise<string[]>;
  clearToken: (userId: string, token: string) => Promise<boolean>;
}>;

function adminDeps(): PushTokenDedupeDeps {
  const users = admin.firestore().collection('users');
  return {
    findHolders: async (token, limit) => (await users.where(PUSH_TOKEN_FIELD, '==', token).limit(limit).get()).docs.map((doc) => doc.id),
    // снимаем, только если в документе всё ещё ЭТОТ токен (тот владелец мог уже записать новый)
    // guard-ok: снятие поля токена под транзакцией с проверкой «всё ещё этот токен»; держателей обычно 0–1 (лимит 10)
    clearToken: async (userId, token) => admin.firestore().runTransaction(async (tx) => {
      const ref = users.doc(userId);
      const snap = await tx.get(ref);
      if (snap.get(PUSH_TOKEN_FIELD) !== token) return false;
      tx.update(ref, { [PUSH_TOKEN_FIELD]: admin.firestore.FieldValue.delete() }); // guard-ok: токен устройства, не прогресс; транзакция
      return true;
    }),
  };
}

export async function dedupePushTokenForUser(userId: string, token: string, deps: PushTokenDedupeDeps): Promise<{ found: number; cleared: number }> {
  const holders = (await deps.findHolders(token, DEDUPE_QUERY_LIMIT)).filter((id) => id !== userId);
  let cleared = 0;
  for (const holder of holders) {
    if (await deps.clearToken(holder, token)) cleared += 1;
  }
  return { found: holders.length, cleared };
}

export async function handlePushTokenDedupeUsersWrite(
  event: Parameters<Parameters<typeof functions.firestore.onDocumentWritten>[1]>[0],
  deps: PushTokenDedupeDeps = adminDeps(),
): Promise<void> {
  const before = event.data?.before.exists ? event.data?.before.data() : undefined;
  const after = event.data?.after.exists ? event.data?.after.data() : undefined;
  const token = pushTokenToDedupe(before, after);
  if (token === null) return;
  const userId = String(event.params.userId);
  const result = await dedupePushTokenForUser(userId, token, deps);
  if (result.found > 0) {
    // без токена и полных id — только счётчики и короткая метка владельца
    console.log(JSON.stringify({ event: 'push_token_dedupe', userId: userId.slice(0, 12), found: result.found, cleared: result.cleared }));
  }
}
