# Task packet: тесты удаления аккаунта — коммит 6A-тестов и обновление устаревшей проверки RevenueCat Phase 2 (Q47)

Governance-ID: TG-81EEDBF46F96
Status: Done (56/56 зелёные; мутация tx.set→tx.update поймана)
Owner: Claude session (Account V2, /loop) по просьбе координатора (Q47)

## Outcome

1. `functions/src/account_delete.test.ts` — незакоммиченные тесты Пакета 6A (встраивание V2 в конвейер удаления; 55 зелёных) закоммитить: координатор не может выложить группу удаления, пока дерево грязное.
2. `functions/src/account_delete_revenuecat_phase2.test.ts` — проверка «creates a permanent hashed denial receipt atomically with deletion enqueue» ищет буквальную строку `const permanentDenialRef = db.collection(...)` / `tx.set(permanentDenialRef`, а реализация в `account_delete_job.ts` уже есть, но в другом виде: `denialRefs = frozenClosure.map(... db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(identity)))`, чтение и `tx.set(denialRef, {...permanentDenial, identityHash})` внутри того же `db.runTransaction`, без перезаписи существующего отказа. Обновить проверку под фактическую форму, сохранив смысл: отказ создаётся в той же транзакции, что постановка удаления, по хэшу, не перезаписывается.

## Scope

Только два тестовых файла. Код удаления не меняется.

## Architecture

Структурная проверка исходника (как и прежде), но по устойчивым признакам: коллекция, `.doc(accountDeletePermanentDenialId(`, `tx.set(denialRef`, всё внутри тела `runTransaction`, есть пропуск существующего (`denialSnapshots[index].exists`).

## Security and privacy

Без изменений поведения; проверка по-прежнему стережёт постоянный отказ после удаления.

## Technical debt

Accept temporarily: структурные проверки исходника хрупки к переименованиям — заменить поведенческим тестом транзакции при следующей правке удаления.


## Verification

Оба файла зелёные по одному прогону; мутация: убрать `tx.set(denialRef` из job — тест красный.

## Rollback

git revert коммита.
