# Task packet: Account Authority 2.0 — этап S1d: время правки «из будущего» (часы устройства спешат)

Governance-ID: TG-4AC6243A1836
Governance-ID: TG-725B5CCD0733
Status: Planned
Owner: Claude session (Account Authority 2.0)

## Outcome

Решение координатора (§121: «S1d разрешён по рекомендации»). Сейчас (S1c, 0c8d05b6f) общее правило времени правки карточки `app/card_edit_time.ts` (`cardTimestamp`/`cardEditTime`/`compareCardEditTimes`, запас `ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS` = 1 ч) принимает любое время > 0. Устройство, у которого часы ушли вперёд больше чем на час, побеждает во всех конфликтах (8E `decideCardConflict` и S1b `pickCardVersion`, оба режима), пока остальные не догонят.

Правило: время правки, которое больше `now + запас`, считается **неизвестным** (`time_unknown`): в 8E → `keep_local` (как сейчас при отсутствии времени), в S1b active → локальная, в S1b restore → облачная. `now` — передаётся параметром (чистая функция; по умолчанию `Date.now()` в точке вызова, не внутри общего правила), чтобы тесты были детерминированы.

## Scope
`app/card_edit_time.ts`, его потребители `app/accounts_v2_hydration_conflicts.ts` (8E) и `app/flashcard_pages_read_result.ts` (S1b/S1c) — только передача `now`; тесты `tests/card_edit_time.test.ts`, `tests/account_v2_stale_local_8e.test.ts`, `tests/flashcard_pages_read_result.test.ts`, `tests/flashcard_pages_pre_write_merge.test.ts`. Чужие хунки не трогать.

## Architecture
Одна чистая функция времени правки + сравнение с запасом и верхней границей `now + запас`; 8E и S1b — её потребители.

## Security and privacy
Нет новых данных; логи — только коды причин.

## Technical debt
Нет. Это закрывает последний открытый вопрос по часам (S1c).

## Verification
RED→GREEN: время из будущего (> now + 1 ч) у одной стороны → `time_unknown` в обоих потребителях; ровно на границе; обе стороны из будущего; 8E — прежние решения для нормальных времён без изменений (его старые тесты зелёные без правки, кроме явно добавленных кейсов «будущее»). Мутации ≥3, тайпчек, независимое ревью до APPROVE.

## Rollback
git revert.

## Итог исполнителя S1d (2026-10-04)

Правило: время правки карточки больше now + запас (1 ч) — «неизвестно» (time_unknown); ровно now + запас — ещё время. 8E → keep_local, S1b active → локальная, S1b restore → облачная. now = null / не целое > 0 → отсечки нет (прежнее поведение).

Правки (без коммита, без индекса):
- app/card_edit_time.ts — шапка (снят абзац «будущее не отсекается»); новая notFromFuture(time, now); compareCardEditTimes(local, remote, now) — третий параметр обязателен (number | null).
- app/accounts_v2_hydration_conflicts.ts — decideCardConflict(..., now = null); в applyHydratedCardConflicts одно now на проход из snapshot.nowMs (часы гидрации), без часов — console.warn «hydrate card_conflict future_check=off reason=now_unknown»; передача now в decideCardConflict.
- app/flashcard_pages_read_result.ts — pickCardVersion(local, remote, mode, now) (now обязателен); mergeLockedFlashcardsWithPages: options.now?, по умолчанию Date.now() один раз на объединение; defaultFlashcardLocalReplace — Date.now() один раз на замену.
- ВНЕ заявленного Scope: modules/account-session-v2/account_v2_hydration.ts — HydrationSnapshot.nowMs? и nowMs: ports.nowMs() в снимке для applyLocal. Причина: тестовое T = 1.8e12 лежит в будущем относительно настоящих часов (~103 дня), поэтому Date.now() в пути 8E ломал бы старые тесты 8E (их править запрещено). Часы гидрации (порт nowMs, в тестах T + 10 ч) — правильный и детерминированный источник «сейчас» для 8E. Прямые вызовы applyHydratedCardConflicts / decideCardConflict без часов (старые тесты) — без отсечки.
- cloud_sync.ts НЕ тронут (его вызовы mergeLockedFlashcardsWithPages получают Date.now() по умолчанию).

Тесты (RED: падение компиляции по новой сигнатуре → GREEN):
- tests/card_edit_time.test.ts — 27/27 (существующие сравнения получили явный NOW; новые: граница для обеих сторон, далёкое будущее у одной/обеих, без часов; паритет 8E/S1b +3 кейса; оба потребителя на будущем).
- tests/account_v2_stale_local_8e.test.ts — 13/13; старая часть файла байт-в-байт прежняя (cmp префикса 12819 байт), дописан describe «время правки из будущего (S1d)»: 4 кейса (чистая функция ×2, гидрация: будущее → keep_local, граница → apply_server).
- tests/flashcard_pages_read_result.test.ts — 45/45 (хелперы передают now: T + 10 ч; новый describe S1d — 4 кейса, включая Date.now по умолчанию).
- tests/flashcard_pages_pre_write_merge.test.ts — 21/21 (в двух describe с T часы устройства подменены на T + 10 ч).
- Соседи гидрации без правок: account_v2_hydration_6g_v2 25/25, account_v2_card_resurrection_7d 21/21, account_v2_producer_6f_v2 27/27.

Мутации (все убиты, восстановление cmp ok): M1 «<=» → «<» на границе (card 2, 8E 2, read 1 упали); M2 будущее не отсекается (5/3/3); M3 отсечка только облака (4/1/1); M4 отсечка только локальной (4/2/3); M5 объединение игнорирует options.now (read 3); M6 гидрация не кладёт часы в снимок (8E 3). В первом прогоне восстановление дважды не прошло (файл удерживался другим процессом) — мутанты M2/M5 найдены и сняты, файлы сверены с эталоном; M3/M4 перепрогнаны чисто.

Тайпчек: полный — код 0, ошибок TS 0, без нехватки памяти.
Копии до правок: .tmp_aa_s1d_backup/ (исходники) и .tmp_aa_s1d_backup/after/ (эталон после правок).
Нужно: независимое ревью до APPROVE; решение координатора по выходу за Scope (account_v2_hydration.ts).

## S1d раунд 2 — по ревью (REQUEST_CHANGES), 2026-10-04
Выход за Scope (account_v2_hydration.ts — часы гидрации в снимке) принят AA: в продакшене порт nowMs задан (account_v2_client_session.ts:172/474), проверено ревьюером.
1. **Сломан tests/flashcard_pages_restore_lock.test.ts** (~174): тестовое T=1.8e12 на ~103 дня впереди реальных часов, cloud_sync берёт Date.now() → обе версии «из будущего». Зафиксировать часы в тесте (fake timers с setSystemTime(T + 10 ч) или подмена Date.now) — тест не должен зависеть от реальной даты. Найти и так же зафиксировать ВСЕ тесты карточек с T в будущем (поиск 1_800_000_000_000 / 1.8e12 в tests/ рядом с mergeLocked/pickCardVersion/decideFlashcardPagesPreWrite/applyHydratedCardConflicts).
2. **Отстающие часы на пути записи 8N (active)** — безопасная для данных сторона (решение AA, координатор уведомлён): если `time_unknown` вызван отсечкой будущего у ОБЛАЧНОЙ стороны — карточку НЕ писать поверх облака: в страницы идёт облачная версия, на телефоне остаётся локальная (как keep_local в 8E); лог `merge_conflicts … remote_future_kept=N`. Если отсечено будущее у ЛОКАЛЬНОЙ стороны (свои часы спешат) — прежнее правило по режиму. Тесты: телефон с отстающими часами не перезаписывает свежую облачную правку; телефон со спешащими часами не побеждает.
3. **tests/flashcards_force_sync_pages.test.ts** падает из-за НАШИХ правок S2d (ebc1a860d: `return false` → `return refuse('flashcards_upload_failed')` в forceSyncToCloud) — обновить проверку текста теста под новую форму, сохранив смысл «выгрузка карточек не удалась → отказ». Это наш долг S2d.
Затем прогнать ВСЕ тесты карточек по одному: card_edit_time, account_v2_stale_local_8e, flashcard_pages_read_result, flashcard_pages_pre_write_merge, flashcard_pages_restore_lock, flashcards_force_sync_pages, flashcard_pages_fingerprint_wipe, account_v2_hydration_6g_v2, account_v2_card_resurrection_7d.


## Итог исполнителя S1d — раунд 2 (2026-10-04)

Governance-ID: TG-725B5CCD0733. Без коммита, без индекса, без stash/worktree, без деплоя. cloud_sync.ts не тронут.

1. **Часы в тестах.** tests/flashcard_pages_restore_lock.test.ts — в describe «8J — снятие замка…» (там оба теста с T) часы зафиксированы: Date.now = T + 10 ч (beforeEach/afterEach). Поиск по tests/ (1_800_000_000_000 рядом с mergeLocked / pickCardVersion / decideFlashcardPagesPreWrite / applyHydratedCardConflicts / restore): read_result и pre_write_merge исправлены в раунде 1 (now в опциях / подмена Date.now); 8E и 6G идут через часы гидрации (порт nowMs); 7D зовёт applyAccountsV2HydrationLocally без nowMs — отсечки нет, от даты не зависит; force_sync_pages, fingerprint_wipe, doc_field_clear, cloud_pages_guard времени правки не содержат.
2. **Отстающие часы на пути 8N (active).** app/card_edit_time.ts: экспорт isCardEditTimeFromFuture(time, now). app/flashcard_pages_read_result.ts:
   - mergeLockedFlashcardsWithPages: опция keepRemoteFromFuture и поле результата remoteFutureKept. При флаге, режиме active и победе локальной, когда ОБЛАЧНОЕ время «из будущего» (> now + запас), в объединение идёт облачная карточка, её нет в remoteWonCards (на телефоне остаётся локальная). Это действует и когда «из будущего» обе стороны: облако не затираем. Будущее только у локальной — прежнее правило режима.
   - Сводка merge_conflicts дописывает « remote_future_kept=N» только при N > 0, так что прежний формат строк не меняется.
   - decideFlashcardPagesPreWrite передаёт keepRemoteFromFuture: true; mergedAny учитывает remoteFutureKept; решение несёт remoteFutureKept.
   - finishFlashcardPagesPreWrite: при remoteFutureKept > 0 отпечаток НЕ сохраняется (лог «result=ok fingerprint=not_saved reason=remote_future_kept=N»). Иначе следующий синк счёл бы облако своим и записал бы локальную поверх; тест проверяет и второй синк.
   - restore запертых ключей в cloud_sync.ts (значение уходит в локальное хранилище) флаг не передаёт — поведение прежнее.
   - Силовой перенос (force) использует то же решение: в страницах останется облачная правка, локальная версия при смене аккаунта не выгружается поверх неё. Это сторона, безопасная для облака.
3. **tests/flashcards_force_sync_pages.test.ts** — проверка «return false;» заменена на «return refuse('flashcards_upload_failed');» плюс проверку, что помощник refuse возвращает false. Смысл тот же: выгрузка не удалась → отказ до записи документа.

Новые тесты: read_result — describe «S1d R2», 6 кейсов (отстающие часы, обе стороны из будущего, спешащие часы, без флага, две границы); pre_write_merge — 2 кейса («отстающие часы не перезаписывают свежую облачную правку» с проверкой второго синка; «спешащие часы не побеждают»); card_edit_time — граница isCardEditTimeFromFuture. RED: read_result не компилировался, в pre_write_merge 1 тест падал.

Прогон по одному (все зелёные): card_edit_time 28/28, account_v2_stale_local_8e 13/13, flashcard_pages_read_result 51/51, flashcard_pages_pre_write_merge 23/23, flashcard_pages_restore_lock 15/15, flashcards_force_sync_pages 16/16, flashcard_pages_fingerprint_wipe 2/2, account_v2_hydration_6g_v2 25/25, account_v2_card_resurrection_7d 21/21.

Мутации (все убиты; восстановление с повтором при занятом файле, cmp ok; финальная сверка трёх файлов с эталоном .tmp_aa_s1d_backup/r2_after/ — OK, следов мутантов нет):
- M7 часы в restore_lock не зафиксированы: 1 падение.
- M8 флаг игнорируется: read 2, pre_write 1.
- M9 отпечаток сохраняется: pre_write 1.
- M10 проверка не той стороны (локальной): read 2, pre_write 2.
- M11 путь 8N без флага: pre_write 1.
- M12 граница «будущего» >= вместо >: сначала ВЫЖИЛА (граница была не наблюдаема) → добавлены 2 граничных теста → card 1, read 1.

Тайпчек: полный — код 0, ошибок TS 0, без нехватки памяти. Копии до правок раунда 2: .tmp_aa_s1d_backup/r2/.
Нужно: повторное ревью до APPROVE.
