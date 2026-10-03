# Task packet: 8T — перенос монет проигравшего победителю при серверном слиянии

Governance-ID: TG-055B9AF43074
Governance-ID: TG-E1A978DA8401
Status: Implemented — ждёт ревью и выкладки координатора
Owner: сессия «Ядро» (исполнитель), координатор — ревью, коммит и выкладка
Related epic/enabler: account-v2 merge (functions/src/auth_merge.ts), единый журнал монет (functions/src/stars_ledger.ts)

## Outcome

При серверном слиянии аккаунтов (`mergeStableAccounts`) баланс монет проигравшего `users/{loser}.stars.balance`
переходит на победителя в той же транзакции, что и скрытие проигравшего. Монеты больше не застревают на
скрытом аккаунте. Прод 03.10 (read-only): скрытых 286, с ненулевым balance — 0; чиним на будущее.
Мера: тесты «1234 → победитель +1234, проигравший 0», «12345 → 5000/5000/2345», «повтор не удваивает»,
«баланс 0 — ни одной записи», «обрыв транзакции → ничего не применено, повтор переносит ровно один раз» зелёные.

## Scope

In scope:
- `functions/src/auth_merge_stars_transfer.ts` (новый, ~200 строк): план частей, prepare/commit пары
  дебет проигравшего + кредит победителя через `prepareStarOperations`/`commitStarOperations`.
- `functions/src/auth_merge.ts`: вызов в транзакции слияния (prepare — до первой записи, commit — рядом с
  записями победителя/проигравшего), снимок документа хранится в `TransactionResolvedIdentity`.
- `functions/src/stars_ledger.ts`: две новые причины `account_merge_in` (grant) и `account_merge_out` (spend).
- Тесты: `functions/src/auth_merge_stars_transfer.test.ts` (новый), интеграционные в `auth_merge.test.ts`.

Out of scope:
- `coin_reconcile_v1.ts` (правит другой исполнитель; двойного начисления нет — сверка ищет расписку
  дорожки в книге ЛЮБОГО аккаунта семьи, а перенос переносит баланс, а не расписки спина).
- Другие пути скрытия аккаунта без слияния: `auth_identity.ts` (чистка дублей, ~стр. 1161–1353),
  `admin_user_operations.ts:393` — тот же класс бага возможен там; отдельная задача координатору.
- Поздние начисления на uid уже скрытого проигравшего (после слияния) — отдельная задача.
- Бэкфилл уже скрытых (на проде их 0 с ненулевым балансом).

## Architecture

Место: ТА ЖЕ транзакция слияния (`mergeStableAccountsTransactionally`), а не outbox-воркер. Обоснование:
- журнал разрешает по одному prepare на КАЖДЫЙ uid в транзакции (`assertSinglePrepare` ключуется по uid),
  проигравший и победитель — разные uid; все части одной стороны идут одним массивом операций;
- prepare только читает (расписки по opId) и ставится до первой записи транзакции (до кошелька минут);
- атомарность: скрытие и перенос коммитятся вместе — нет окна, когда проигравший скрыт, а монеты ещё на нём,
  и нет состояния «дебет есть, кредита нет» (обрыв отменяет всё целиком);
- outbox-воркер дал бы окно с «пропавшими» монетами, отдельную аренду и курсор частей — больше движущихся частей.

Семантика (выбрана так, чтобы перенос не был «заработком»):
- проигравший: `account_merge_out`, класс spend → `balance -= X`, `spentTotal += X` (монеты ушли с аккаунта);
- победитель: `account_merge_in`, класс grant → `balance += X`, `grantedTotal += X`, `bySource.other += X`;
  `earnedTotal`, `weekEarned`, `seasonEarned` победителя НЕ растут — перенос не двигает очки/сезон.
- Части по `STAR_OP_MAX_ABS_DELTA` (5000): 12345 → 5000, 5000, 2345.
- opId детерминирован: `account_merge:<outboxId>.<i>` (outboxId = `merge_<sha256>`), одинаков у пары
  дебет/кредит (они живут в разных книгах `users/{uid}/star_operations`). sourceKind `account_merge`,
  sourceId = outboxId. Повтор prepare даёт `already_applied`, ничего не пишет.
- Коммит только если все части обеих сторон `applied` (или все `already_applied` — тогда записей нет).
  Любой отказ/расхождение (op_conflict, insufficient, несогласованный журнал) → перенос пропускается целиком,
  слияние НЕ блокируется (иначе человек не войдёт), причина в логе `[ACCOUNT-MERGE-STARS]` и в outbox
  поле `starsTransfer` для ручного разбора.
- Потолок частей в одной транзакции: 100 (500 000 монет, 200 расписок) — запас до лимита 500 записей
  при 64 линиях премиума. Выше потолка: переносятся первые 100 частей, остаток остаётся на проигравшем,
  фиксируется в `starsTransfer.remainder` + error-лог (на проде таких балансов нет).

## Security and privacy

Сервер (Admin SDK); клиент в `star_operations` писать не может (`firestore.rules`: `allow write: if false`).
Перенос не создаёт монет: сумма дебета = сумме кредита по построению, инвариант журнала проверяется на обеих
сторонах. Новых полей с персональными данными нет; в логах — первые 8 символов uid. Политика конфиденциальности
не затрагивается (данные не собираются заново, переносится существующий баланс). App Check не трогаем.

## Technical debt

- Contain: остаток выше потолка 100 частей — лог + `starsTransfer.remainder` в outbox; выход: воркер-добор,
  если на проде появится хоть один такой случай.
- Accept temporarily (владелец — координатор, пересмотр при следующем пакете аккаунтов): другие пути скрытия
  (`auth_identity.ts`, `admin_user_operations.ts`) не переносят монеты.
- Джарвис: `functions/src/jarvis/*` не читает `stars`/`star_operations` и причины журнала — контракт не меняется.

## Verification

- `cd functions && npx jest src/auth_merge_stars_transfer.test.ts src/auth_merge.test.ts src/stars_ledger.test.ts
  src/auth_merge_flashcard_lists.test.ts src/auth_merge_revenuecat_phase2.test.ts --runInBand --watchman=false`
- `npx tsc --noEmit -p .` (ошибки account_authority* — чужие).
- После выкладки: логи `[ACCOUNT-MERGE-STARS]` в Cloud Logging на ближайших слияниях.

## Rollback

Откат кода — слияние снова не трогает `stars`. Уже проведённые переносы остаются корректными записями журнала
(расписки на обеих сторонах, инвариант выполнен) — откатывать данные не нужно.

## Evidence (03.10)

- RED: новый модуль отсутствовал (TS2307), 3 интеграционных теста слияния падали (95 прежних зелёные).
- GREEN: auth_merge_stars_transfer 12/12, auth_merge 98/98 (95 + 3 новых), auth_merge_flashcard_lists 25, auth_merge_revenuecat_phase2 2, stars_ledger, practice_rune_grant, referral_spin_coins, сторож Джарвиса — зелёные.
- learning_v2_stars_ledger.test.ts: 2 падения (ждут already_applied, получают rejected) существовали ДО этой правки: заглушка расписки { seq: 7 } не проходит isSameOperationReceipt; к 8T не относится.
- Проверка типов: без новых ошибок (account_authority* — чужие).

## Независимое ревью (Ядро, 2026-10-03)

- **Код-ревью (Sonnet): APPROVE.** Тесты: auth_merge_stars_transfer 12/12, auth_merge 98/98, stars_ledger 34/34. learning_v2_stars_ledger 16/18 — два падения ДО 8T: diff stars_ledger.ts чисто аддитивный (две причины + строки STAR_OP_CLASS/STAR_OP_SOURCE). Отдельная задача.
- **Безопасность (Opus): PASS с замечаниями.** Двойного начисления, минуса и половинчатого списания нет. Записей в худшем случае ~410 из 500. Рассуждение «сверка coinReconcileV1 + перенос баланса не дают двойного» подтверждено.
- **Отложено координатору:**
  - M-1 (старая проблема, 8T повышает ставку): метка `anon_merge_claim` не привязана к вызывающему (auth_identity.ts:2271-2302, auth_merge.ts:722-727) — одноразовый nonce, хранить sha256, гасить после использования.
  - L-1: монеты на дублях, скрытых `cleanupLegacyAuthIdentityDuplicates` (auth_identity.ts:~1258) и admin_user_operations.ts:393, и поздние начисления на скрытый uid — не переносятся; нужен учёт «скрытый с stars.balance>0» или досылка `.late.<seq>`.
  - L-2: остаток >500k — только `starsTransfer.remainder` в outbox, нужен сигнал/процесс.
  - I-1: повтор слияния с другим `now` даёт `op_conflict` → skipped с console.error (безопасно, но выглядит как сбой в логе).

## I-1 закрыт (Ядро, 03.10, после выкладки)
Повтор слияния с другим now (op_conflict на всех частях обеих сторон) → `console.warn ... replay_op_conflict (повтор, безопасно)` вместо error; прочие неувязки остаются error. Тест +1 (13/13), мутация «убрать ветку» → тест падает.
