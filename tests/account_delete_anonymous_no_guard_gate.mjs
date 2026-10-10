import fs from 'node:fs';

// зачем (10.10, пакет aa-guest-server-delete, TG-20707BD701DC): прежнее правило «гостю замок
// удаления не пишем» оставляло гостя без ключа — запрос на удаление его серверных данных
// падал с proof_missing и не уходил никогда. Теперь сторож охраняет обратное: замок пишется
// и гостю (best-effort), а без замка гость удаляется прямым вызовом, а не постановкой без ключа.
const source = fs.readFileSync(
  new URL('../app/auth_provider.ts', import.meta.url),
  'utf8',
);

if (/let pendingDeleteLock = isProvablyAnonymousAccount\s*\?\s*null/s.test(source)) {
  throw new Error('guest deletion must try to write the delete lock (its key drives server-side deletion)');
}
if (!/let pendingDeleteLock = await withLocalStepDeadline\(\s*\(\) => persistAccountDeletePendingAuth\(/s.test(source)) {
  throw new Error('delete lock must be written for every account kind, bounded by the local deadline');
}
if (!/delete:anon_server=direct reason=no_lock/.test(source) || !/startCloudDeletionDirect\(/.test(source)) {
  throw new Error('a guest without a delete lock must fall back to the direct server deletion call');
}
if (!/getAuth\(\)\?\.currentUser\?\.uid === lock!\.providerUid\s*\) return retryGuestServerDeletionOnce\(lock!\);/s.test(source)) {
  throw new Error('a restarted guest with a live session must retry server deletion once, without waiting for provider retirement');
}

console.log('PASS anonymous account deletion guard gate');
