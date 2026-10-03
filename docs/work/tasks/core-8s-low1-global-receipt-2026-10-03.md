# Task packet: 8S-LOW1 — общая метка проведённой Spin-дорожки вне аккаунта

Governance-ID: TG-055B9AF43074
Status: In progress
Owner: сессия «Ядро» (исполнитель), координатор — ревью и коммит
Related epic/enabler: account-v2-pkg8s-coin-reconcile-merged-losers-2026-10-03 (LOW-1 ревью безопасности)

## Outcome

Spin-приз скрытого слиянием аккаунта засчитывается сверкой монет `coinReconcileV1` ровно один раз за жизнь,
даже если скрытый аккаунт A перепривязали от победителя B к победителю C (auth_identity.ts,
cleanupSiblingStableIdentityDuplicates перезаписывает canonicalStableId). Мера: тест «B сверил A → A перепривязан к C →
сверка C не начисляет» зелёный.

## Scope

In scope: functions/src/coin_reconcile_v1.ts (+ test) — корневая коллекция `coin_reconcile_receipts/{opId}`,
читается одним getAll вместе с расписками, создаётся (tx.create) в той же транзакции для начисленных дорожек;
бюджет `maxReceiptReads` учитывает +1 чтение на дорожку; сторож Джарвиса (коллекция намеренно не читается).

Out of scope: auth_merge.ts / auth_identity.ts (перепривязка остаётся), firestore.rules (уже есть корневой
catch-all deny, а файл несёт чужие незакоммиченные правки), бэкфилл меток для сверок, проведённых до этой правки.

## Architecture

Граница: метка по глобально уникальному opId (`level_spin:<requestId>.<lane>`) вне книги конкретного аккаунта.
Инвариант: дорожка считается проведённой, если есть расписка в книге любого аккаунта семьи ИЛИ общая метка.
Все чтения — до записей. Форма ответа coinReconcileV1 не меняется (клиент 1.6.24).

## Security and privacy

Коллекция только серверная: корневой `match /{document=**} { allow read, write: if false; }` в firestore.rules.
В метке — stableUid победителя (не уходит клиенту, не логируется целиком). App Check не трогаем.

## Technical debt

- Accept temporarily: сверки, проведённые на проде до этой правки, меток не имеют. Окно риска — только если
  такой победитель B уже засчитал призы скрытого A и A потом перепривязан. Владелец — координатор; закрывается
  read-only подсчётом записей coinReconcileV1 с mergedLoserCount > 0 (и при ненуле — бэкфиллом меток из
  star_operations с sourceKind=coin_reconcile_v1).

## Verification

- `cd functions && npx jest src/coin_reconcile_v1.test.ts --runInBand --watchman=false` (RED → GREEN).
- `cd functions && npx jest src/jarvis/jarvis_data_contract_guard.test.ts --runInBand --watchman=false`.
- `cd functions && npx tsc --noEmit -p .`.

## Rollback

Откат коммита: метки остаются лишними документами без читателей; начислений не отменяет, данные не теряются.
