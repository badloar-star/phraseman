# Account Recovery Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven-development for every behavior change and requesting-code-review after every GREEN packet. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Завершить автоматическое восстановление аккаунта после переустановки/смены устройства без раскрытия аккаунтов, подмены identity, смешивания прогресса и ручного вмешательства владельца.

**Architecture:** `auth_links/{providerUid}` остаётся единственным серверным якорем. Клиент отправляет только намерение; server callables проверяют Firebase provider identity, App Check, deletion guards и атомарно меняют identity. UI включается только после подтверждённого server contract и выполняет тихий account adoption через существующие generation/backup механизмы.

**Tech Stack:** React Native/Expo TypeScript, Firebase Auth, Firestore/Cloud Functions, Jest, Firebase Emulator Suite, Admin V2 JavaScript.

**Execution constraints:** не использовать Codex Goal; не делать commit/push/PR/deploy/migration/production writes; сохранять все чужие dirty changes; один writer; generated `functions/lib/**` менять только итоговой явной сборкой.

---

### Task 1: Принять server-owned identity freeze и атомарный bootstrap

**Files:**
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`
- Modify: `functions/src/auth_identity.ts`
- Modify: `functions/src/auth_identity.test.ts`

- [ ] **Step 1: Проверить RED-доказательства**

Нужны отдельные тесты на client create/update/delete identity-полей и на fresh bootstrap `(authUid=A, stableId=S)` при отсутствующих `users/S` и `auth_links/A`.

- [ ] **Step 2: Проверить минимальный транзакционный контракт**

```ts
await db.runTransaction(async (tx) => {
  const [user, link, marker, tombstone] = await tx.getAll(
    users.doc(stableId),
    authLinks.doc(authUid),
    deletionMarkers.doc(authUid),
    deletionTombstones.doc(stableId),
  );
  // marker/tombstone/conflicting identity => fail closed
  // only both identity docs absent => tx.create both server-owned shells
});
```

- [ ] **Step 3: Запустить focused GREEN**

```powershell
cd C:\appsprojects\phraseman\functions
npx jest src/auth_identity.test.ts src/auth_identity_recovery_hint.test.ts --runInBand --no-cache --no-coverage
npx tsc -p tsconfig.json --noEmit --pretty false
cd C:\appsprojects\phraseman
npx jest tests/auth_provider_stable_link.test.ts tests/account_delete_flow_contract.test.ts tests/stable_id.test.ts tests/auth_identity_anon_relink.test.ts --runInBand --no-cache
```

- [ ] **Step 4: Запустить Firestore behavioral emulator gate**

Проверить owner/browser-admin denial, Admin SDK success, обычные user updates и конкурентные bootstrap `(A1,A2)->S` / `A->(S1,S2)` на временном порту в `.codex-tmp/`.

- [ ] **Step 5: Получить независимый review**

PASS возможен только при отсутствии account takeover, resurrection, orphan shell и client-write regression.

---

### Task 2: Закрыть provider/App Check и атомарный лимит recovery-кода

**Files:**
- Modify: `functions/src/auth_recovery.test.ts`
- Modify: `functions/src/auth_recovery.ts`
- Modify: `functions/src/callable_options.ts` только при добавлении переиспользуемых sensitive options

- [ ] **Step 1: Написать RED-тесты**

```ts
it('rejects anonymous and unverified provider sessions');
it('hard-enforces App Check');
it('rejects Google-to-Apple and Apple-to-Google relink');
it('locks exactly at five attempts under 50 concurrent wrong codes');
it('consumes one correct code at most once');
```

- [ ] **Step 2: Подтвердить ожидаемый RED**

```powershell
cd C:\appsprojects\phraseman\functions
npx jest src/auth_recovery.test.ts --runInBand --no-cache --no-coverage
```

- [ ] **Step 3: Реализовать минимальный GREEN**

```ts
const provider = request.auth?.token?.firebase?.sign_in_provider;
if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
if (!['google.com', 'apple.com'].includes(String(provider))) {
  throw new HttpsError('permission-denied', 'recovery_provider_required');
}
// Transaction returns INVALID/LOCKED/SUCCESS; error mapping occurs after commit.
```

- [ ] **Step 4: Проверить GREEN и noEmit**

```powershell
npx jest src/auth_recovery.test.ts src/auth_identity.test.ts --runInBand --no-cache --no-coverage
npx tsc -p tsconfig.json --noEmit --pretty false
```

- [ ] **Step 5: Независимый review**

Проверить provider claims, rollback при ошибке, deletion marker/tombstone и отсутствие PII в fixtures/logs.

---

### Task 3: Clean-install email challenge без enumeration

**Files:**
- Modify: `functions/src/auth_recovery.test.ts`
- Modify: `functions/src/auth_recovery.ts`
- Modify: `functions/src/admin_email.ts` только для provider idempotency/outbox seam

- [ ] **Step 1: Зафиксировать публичные типы RED-тестом**

```ts
type RequestResult = { ok: true; accepted: true; challengeId: string; expiresInSec: 600 };
type ConfirmInput = { challengeId: string; code: string };
```

- [ ] **Step 2: Проверить одинаковые ответы**

Existing/missing/unverified/unlinked/send-failed selector должны иметь одинаковую форму ответа без `found`, `provider`, `maskedEmail` и target-specific errors.

- [ ] **Step 3: Реализовать opaque challenge**

Selector хранится только как server-secret HMAC; письмо отправляется только на verified Firebase Auth email с живым двусторонним `auth_links` anchor. Missing target получает indistinguishable decoy challenge.

- [ ] **Step 4: Проверить конкуренцию**

50 одинаковых `requestId` создают один challenge, одну quota reservation и один sender invocation; поздний send failure старого generation не меняет новый challenge.

- [ ] **Step 5: Независимый security review**

Проверить timing/response disclosure, quota abuse, replay и отсутствие plaintext email в Firestore.

---

### Task 4: Клиентские callable wrappers

**Files:**
- Create: `tests/auth_recovery_client.test.ts`
- Modify: `app/cloud_sync.ts`

- [ ] **Step 1: RED на request/confirm и ошибки**

Тестировать region `us-central1`, input validation, сохранение callable `code/message/details`, отсутствие сетевого вызова без auth UID и новый challenge API.

- [ ] **Step 2: Реализовать минимальные wrappers рядом с `fetchAuthRecoveryHint`**

Не менять recovery UI в этом шаге и не трогать 48 чужих строк lesson merge.

- [ ] **Step 3: Focused GREEN**

```powershell
npx jest tests/auth_recovery_client.test.ts --runInBand --no-cache
```

---

### Task 5: Тихий account adoption и recovery UI

**Files:**
- Create: `app/auth_recovery_flow.ts`
- Create: `tests/auth_recovery_flow.test.ts`
- Modify: `app/auth_provider.ts`
- Modify: `components/RegistrationPromptModal.tsx`
- Modify: `tests/registration_prompt_modal_lifecycle.test.tsx`

- [ ] **Step 1: RED на state machine и late results**

Google/Gmail показывает инструкцию и code fallback; Apple/non-Gmail сразу код; late request/confirm не меняют повторно открытую модалку; все ошибки локализованы в 8 языках.

- [ ] **Step 2: RED на adoption**

До смены stable ID создаётся emergency backup, generation инвалидируется, локальные данные другого аккаунта не вливаются, cloud restore применяется только текущему generation.

- [ ] **Step 3: Реализовать coordinator и UI**

Успех закрывает модалку молча. Accent-кнопки используют `t.correctText`; поле кода имеет one-time-code accessibility metadata.

- [ ] **Step 4: Focused GREEN и review**

Прогнать lifecycle/adoption/auth switch guards; отдельно проверить loading/error/resend/timer cleanup.

---

### Task 6: Admin V2 «Связи входа»

**Files:**
- Read first: `docs/design/ADMIN_UI_BIBLE.md`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: relevant Admin V2 contract tests

- [ ] **Step 1: RED на permission и preview/confirm**

`users.auth_repair` обязателен; support не получает действия; relink требует ровно email или providerUid, reason и idempotency key.

- [ ] **Step 2: Реализовать diagnostics/actions**

Кнопки имеют tooltips, loading/empty/error/success, preview и текстовое подтверждение; старый admin не импортируется и не вызывается.

- [ ] **Step 3: Focused Admin V2 GREEN**

Никакого `npm run hosting:admin` и никаких живых repair/relink вызовов.

---

### Task 7: Финальная проверка и handoff

**Files:**
- Update: `docs/handoffs/HANDOFF_AUTH_ACCOUNT_RECOVERY_2026-07-21.md` или новый dated continuation
- Update: `docs/reports/phraseman-threat-model.md` только после fresh evidence

- [ ] **Step 1: Fresh focused gates**

Root auth/recovery UI, Functions recovery/identity/admin, Firestore behavioral emulator, Functions noEmit и затем обычный build без параллельных процессов.

- [ ] **Step 2: Independent final review**

Отдельно проверить identity, recovery enumeration/concurrency, deletion, account switch, Premium/progress isolation и Admin permission/audit.

- [ ] **Step 3: Зафиксировать точный статус**

Разделить локально проверенное, внешне неизвестное и требующее real-device/RevenueCat/Firebase-console evidence.

- [ ] **Step 4: Остановиться перед внешними действиями**

Deploy Functions/Rules, добавление `RESEND_API_KEY`, EAS release и production smoke выполняются только после отдельной явной команды владельца.

