# Патч 4: `local_progress_not_uploaded` — тихие повторы + фоновая выгрузка гостя

Governance-ID: TG-E6D1DAA0A4BE

Причина: гость с прогрессом входит в существующий аккаунт. Выгрузка `forceSyncToCloud` срывается одним сбоем, и аварийная копия тоже. Человек видит «Прогресс на месте… вход отменён».

## Что лежит готовым (`git apply 04_presync_retry.patch`)

- `app/presync_quiet_retry.ts`:
  - `presyncUploadWithQuietRetry` — повторяет выгрузку при быстром сбое (`error`). Таймаут не повторяет: ещё 20 с ожидания хуже отказа;
  - `presyncBackupWithQuietRetry` — повторяет копию при сбоях записи или проверки. Не повторяет «нельзя по состоянию устройства» (`local_progress_backup_blocked`);
  - паузы 0,6 с и 1,5 с, журнал `[SIGNIN-RETRY]`.
- `app/guest_background_upload.ts`: `maybeUploadGuestOnBackground` — гость, настоящий прогресс, не чаще раза в 6 ч, журнал `[GUEST-BG-UPLOAD]`.
- `tests/presync_quiet_retry.test.ts` — проверки обоих модулей.

## Вставка в `app/auth_provider.ts` (Авторизация; строки по дереву 18.10 ~3538–3577)

Было:

```ts
try {
  presyncUploaded = await withTimeout(forceSyncToCloud({ adoptOnIdentityMismatch: false, onRefusal: (code) => { presyncRefusal = code; } }), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'swap_presync');
} catch (e) {
  presyncErrorCode = identityErrorCode(e);
  presyncRefusal = presyncErrorCode.startsWith('timeout_') ? 'timeout' : 'error';
}
```

Стало:

```ts
// зачем (владелец 18.10 «ни один вход без ошибки»): быстрый сбой выгрузки повторяется тихо (не таймаут).
const presync = await presyncUploadWithQuietRetry(async () => {
  let refusal = 'not_uploaded';
  try {
    const uploaded = await withTimeout(forceSyncToCloud({ adoptOnIdentityMismatch: false, onRefusal: (code) => { refusal = code; } }), SIGNIN_CLOUD_SYNC_TIMEOUT_MS, 'swap_presync');
    return { uploaded, refusal, errorCode: null };
  } catch (e) {
    const code = identityErrorCode(e);
    return { uploaded: false, refusal: code.startsWith('timeout_') ? 'timeout' : 'error', errorCode: code };
  }
});
presyncUploaded = presync.uploaded;
presyncRefusal = presync.refusal;
presyncErrorCode = presync.errorCode;
```

Аварийная копия — тело `try { const saved = await saveAccountSwitchEmergencyBackup(…); … } catch …` обернуть так:

```ts
const backup = await presyncBackupWithQuietRetry(async () => {
  try {
    const saved = await saveAccountSwitchEmergencyBackup('sign_in_presync_not_uploaded_before_swap', localStableId);
    const summary = saved ? await readAccountSwitchEmergencyBackupSummary() : null;
    backupPairs = summary?.pairCount ?? null;
    backupBytes = summary?.bytes ?? null;
    if (!saved) return 'account_switch_backup_unavailable';
    if (summary?.stableId !== localStableId) return 'account_switch_backup_owner_mismatch';
    return null;
  } catch (backupError) {
    return identityErrorCode(backupError);
  }
});
backupCode = backup.backupCode;
```

Дальше код прежний: при `backupCode !== null` — прежний отказ с прежней классификацией. Если нет сети совсем, после повторов это и есть разрешённый случай «нет сети».

## Фоновая выгрузка гостя — где подключить (Авторизация; `_layout.tsx` Ядро не трогает)

В уже существующий обработчик `AppState` «ушли в фон» (рядом с другими `state === 'background'`):

```ts
void maybeUploadGuestOnBackground({
  isGuest: () => getAuth().currentUser?.isAnonymous === true,
  hasMeaningfulProgress: () => hasMeaningfulLocalAccountData(),
  upload: () => forceSyncToCloud({ adoptOnIdentityMismatch: false, skipUnchangedDocWrite: true, logPrefix: '[GUEST-BG-UPLOAD]' }),
  readLastAtMs: async () => Number(await AsyncStorage.getItem(GUEST_BACKGROUND_UPLOAD_LAST_AT_KEY)) || null,
  writeLastAtMs: (ms) => AsyncStorage.setItem(GUEST_BACKGROUND_UPLOAD_LAST_AT_KEY, String(ms)),
});
```

💸 Не чаще раза в 6 ч на гостя, только при настоящем прогрессе, без записи, если документ не изменился.

## Проверки

- `npm run test:one -- tests/presync_quiet_retry.test.ts`.
- После вставки — тесты `auth_provider*`, `account_switch_*`.
