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

## Итог исполнителя S1e-2 (2026-10-04)

**Сделано.**
1. `readOwnAccountSwitchBackupValue` (app/cloud_sync.ts) экспортирована; прямые тесты: v2 и v3 с чужим
   stableId в корне → null (v3 — даже при подделанной под нашего странице), лог `carry_skipped other_owner`.
2. Стирание: `noteFutureKeptStashBeforeWipe(receiptOwnerStableId)` в `wipeLocalAccountDataUnsafeBody`
   сразу после `const accountKeys = await collectAccountLocalDataKeys();`. Ключ S1e не пуст и в копии
   владельца его нет → `[FLASHCARD-FUTURE-STASH] future_kept_stash_wiped count=N`. Только лог, стирание
   не останавливает; сбой проверки → `[ACC-SWITCH-WIPE] future_kept_stash_check_failed`.
3. Применение: записи ЧУЖОГО владельца старше 30 дней удаляются (и в ветке no_own_entries), лог
   `apply foreign_expired dropped=N`; свои записи этим правилом не трогаются.
4. Размер: значение ключа — одна пара копии, пара между страницами не делится (страница ≤ 512 КБ,
   иначе value_upgrade_required и смена аккаунта блокируется). 1000 богатых карточек (~2.5 КБ) ≈ 2.5 МБ —
   НЕ влезали. Потолок по числу снижен до 300, добавлен потолок по байтам 384 КБ (запас на конверт и
   соседние пары); сверх — отбрасываются самые старые, лог `cap_reached reason=count|bytes`.

**Хунки app/cloud_sync.ts (только свои):** импорт `logFutureKeptStashBeforeWipe,` в блоке
`from './flashcards_future_kept_stash'`; `export` у `readOwnAccountSwitchBackupValue`; новая
`noteFutureKeptStashBeforeWipe` перед `export async function saveAccountSwitchEmergencyBackup(`;
вызов в стирании (см. п.2). app/auth_provider.ts не менялся (стирание общее для presync и смены).

**Тесты.** Новый tests/aa_s1e2_stash_tails.test.ts — 10/10 (RED до правок: не компилировался).
Регресс: aa_s1e_force_future_kept_backup 12, flashcard_pages_fingerprint_wipe 2, aa_s2d_presync_cloud_sync 15,
aa_s2d_backup_merge_alias 9, account_switch_backup_restore 22, flashcards_force_sync_pages 16,
auth_provider_behavior 110 — зелёные. typecheck — 0 ошибок. PM-229 — PASS (silentCatch=5).

**Мутации 7/7 убиты** (каждая с проверкой запуска; восстановление cmp с повтором из
.tmp_aa_s1e2_backup/after/, финальная сверка — OK): снятие проверки root.stableId (2 failed);
снятие вызова в стирании; игнор «в копии»; снятие фильтра 30 дней; снятие записи в no_own_entries;
выключение потолка по байтам; потолок по числу 1000.

**Вопросы координатору.**
- Тот же предел в 512 КБ на одну пару касается и самого списка карточек (`flashcards_v1`): большой
  список богатых карточек делает копию невозможной (value_upgrade_required) → смена блокируется. Вне
  S1e-2; нужен ли отдельный этап?
- Индекс git сейчас помечает app/flashcards_future_kept_stash.ts и tests/aa_s1e_force_future_kept_backup.test.ts
  как удалённые (D), а файлы лежат неотслеживаемыми (содержимое = HEAD). Следующий чужой коммит может их
  удалить из репозитория — проверить перед коммитом S1e-2 (я git не трогал).
