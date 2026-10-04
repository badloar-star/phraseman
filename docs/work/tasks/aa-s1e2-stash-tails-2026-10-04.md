# Task packet: Account Authority 2.0 — этап S1e-2: хвосты ревью S1e (c0333fe6d)

Governance-ID: TG-AE5B3C60DE73
Status: Planned
Owner: Claude session (Account Authority 2.0)

## Outcome
1. Прямой тест `readOwnAccountSwitchBackupValue` (app/cloud_sync.ts) с чужим stableId в корне копии → ничего не читается (защита в глубину, мутация снятия проверки root.stableId выжила).
2. Лог `[FLASHCARD-FUTURE-STASH] future_kept_stash_wiped count=N` перед стиранием на пути presync/смены, если ключ `flashcards_force_future_kept_local_v1` не пуст и в аварийную копию не попадает (видимость редкого случая гостя с успешной выгрузкой).
3. Чистка в стэше записей чужого владельца старше 30 дней при применении (чтобы не копились до потолка 1000); лог числа.
4. Проверить, что стэш на 1000 записей с крупными карточками помещается в страницу аварийной копии (512 КБ) или режется по страницам; если нет — снизить потолок (~300) с обоснованием.

## Scope
app/flashcards_future_kept_stash.ts, app/cloud_sync.ts (только свои места), app/auth_provider.ts (только свои места), тесты.

## Architecture
Без изменений.

## Security and privacy
Нет новых данных; логи только числа.

## Technical debt
Предел LWW по клиентским часам — отдельный этап S1f (серверное время), решение координатора.

## Verification
Тесты на каждый пункт, мутации, тайпчек, PM-229, ревью.

## Rollback
git revert.
