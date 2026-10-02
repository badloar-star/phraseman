# Task packet: Account V2 — Пакет 8I: дозаливка затёртого 8G облачного progress (только отсутствующие ключи)

Governance-ID: TG-41E8B2DA2340
Governance-ID: TG-689D0CB59045
Status: In progress
Owner: Claude session (Account V2, /loop); решение координатора §67 (предложение §AV2-9)

## Outcome

До выкладки фикса 8G (caf7b9889) `progressMigrateSnapshot` с пустым снимком заменял `progress` целиком (у ~527 аккаунтов с маркером — зона риска). Самовосстановления нет (§AV2-9): серверные ключи уроков возвращаются только при новом прохождении, клиентские не переотправляются из-за снимка синхронизации. Данные живы на телефонах, где приложение стоит.

1. **Сервер:** новый callable `progressReseedMissing` (functions/src, рядом с progress_events.ts):
   - вход — снимок клиента (тот же формат и валидация/лимиты, что у `progressMigrateSnapshot`/`buildMigrationPatch`);
   - пишет ТОЛЬКО ключи, которых НЕТ в облачном `progress` (точечные пути `progress.<ключ>` в транзакции; существующие не трогает, понижение невозможно); пустой результат → ничего не пишет;
   - не чаще раза в сутки на аккаунт (отметка `progressReseedAt` в документе пользователя, читается в той же транзакции; второй вызов в сутки → отказ `rate_limited` без записи);
   - лимит размера снимка/числа ключей; только авторизованный владелец своего uid; App Check НЕ включать (пломба);
   - лог `[PROGRESS-RESEED] decision=… snapshot_keys=… existing_keys=… written_keys=…` без uid;
   - экспорт в functions/src/index.ts (не деплоить — выкладка координатора).
   - Проверить firestore.rules: `progressReseedAt` не должен быть записываемым клиентом (если users/{id} разрешает клиенту писать произвольные корневые поля — добавить в блок-лист) и учесть корневую перепись полей 8A (`accounts_v2_root_fields` census/guard — новое корневое поле внести в контракт/guard) и Джарвис-контракт, если касается.
2. **Клиент 2.0:** при restore, если `progressServerAuthoritative === true` И в облаке нет ключей уроков, а локально есть (признак затирания) → ОДИН вызов `progressReseedMissing` с локальным снимком (тот же сборщик, что для миграции) + сброс КЛИЕНТСКИХ ключей из `cloud_last_sync_snapshot_v1`, чтобы `doSyncToCloud` переотправил карточки/библиотеку. Локальная отметка «дозаливка сделана» (не повторять); при отказе/ошибке — лог с причиной, без повторов в цикле. Лог `[PROGRESS-RESEED]` без uid. Без UI.

## Scope

functions/src (новый модуль + index.ts экспорт + тесты), firestore.rules (только если нужно закрыть `progressReseedAt`), контракт корневых полей 8A при необходимости, app/cloud_sync.ts (только ветка restore/вызов), functionsClient-обёртка вызова, тесты. Out of scope: деплой, прод, App Check, изменение progressMigrateSnapshot.

## Architecture

Отдельный callable с узкой семантикой «добавить отсутствующее»; клиент зовёт однократно по признаку затирания.

## Security and privacy

Тот же уровень доверия к снимку клиента, что у исходной миграции; понижения и перезапись невозможны; лимиты размера и частоты; логи без uid. Новых категорий данных нет (политика конфиденциальности не меняется).

## Technical debt

Accept temporarily: аккаунты, у которых телефон с данными утерян, не восстанавливаются (бэкапов до 02.10 нет).

## Verification

Тесты сервера: «существующий ключ не перезаписан», «понижение невозможно», «пишутся только отсутствующие», «пустой результат — нет записи», «второй вызов за сутки — отказ без записи», «чужой uid / без auth — отказ», «лимит размера»; маска записи Admin SDK (как в 8G: только `progress.<ключ>`). Клиент: признак затирания → один вызов + сброс клиентских ключей снимка; без признака — нет вызова; повтор не происходит; ошибка логируется. Мутации, затронутые тесты по одному, независимое ревью.

## Rollback

git revert; убрать экспорт; бэкап `.tmp_pkg8i_backup/`.

## Итог исполнителя (2026-10-02)

**Сделано (без коммита, без деплоя).**

Сервер — новый модуль `functions/src/progress_reseed_missing.ts`, callable `progressReseedMissing` (опции `HOT_CALLABLE_OPTIONS`, как у миграции; App Check не включён):
- вход — снимок клиента `{ stableId, progress }`; лимиты ДО любых чтений: ≤1000 ключей, ключ ≤200 знаков, значение ≤20 000, всего ≤256 КБ → `invalid-argument snapshot_too_large`; не объект → пустой снимок (как у миграции); вложенные значения отбрасываются;
- владелец — `resolveStableUidForAuth(..., { requireKnownIdentity: true })` (тот же путь, что у `progressMigrateSnapshot`); без auth → `unauthenticated`;
- в одной транзакции читается `users/{stableUid}`: нет документа → `user_missing`; нет `progressServerAuthoritative === true` → `not_authoritative` (затирание 8G возможно только у прошедших миграцию); `progressReseedAt` моложе суток (или в будущем) → `rate_limited` (ошибка `resource-exhausted`, без записи);
- «отсутствует» = ключа нет в облачном `progress` вовсе (ключ со значением `null` считается существующим); значения проходят тот же `buildMigrationPatch`, что у миграции (только структурные ключи уроков: `lessonN_cellIndex`, `lessonN_progress`, fr-варианты; `best_score`/`pass_count`/серия остаются в карантине — уровень доверия не выше исходного);
- запись только при непустом patch: `tx.set(userRef, { progress: patch, progressReseedAt: serverTimestamp }, { merge: true })` → маска Admin SDK ровно `progress.<ключ>` + `progressReseedAt` (доказано в тесте на `@google-cloud/firestore`, как в 8G); пустой результат → ничего не пишется;
- лог `[PROGRESS-RESEED] decision=… snapshot_keys=… existing_keys=… written_keys=… user_exists=… server_auth=…`, без uid;
- экспорт в `functions/src/index.ts`. `progressMigrateSnapshot` не тронут.

Клиент 2.0:
- `app/progress_events_client.ts`: `detectProgressReseedNeed(stableId, cloudProgress)` — признак затирания: в облаке 0 ключей уроков (по тем же регуляркам, что переносит миграция), локально ≥1 ненулевой; сначала дешёвая проверка облака (локальное хранилище не читается, если в облаке уроки есть), затем локальная отметка `progress_reseed_missing_done_v1:<stableId>`, затем тот же сборщик снимка `readLocalProgressSnapshot`; попытка помечается в памяти процесса — повтора в цикле нет. `submitProgressReseed(stableId, snapshot)` — один вызов, никогда не бросает; отметка «сделано» ставится на ответ сервера, на `rate_limited` и на постоянный отказ (`permission-denied`/`invalid-argument`/…); на сбой сети — нет (повтор только со следующего запуска). Логи `[PROGRESS-RESEED]` без uid.
- `app/cloud_sync.ts`: `maybeReseedWipedProgressAfterRestore` вызывается в `restoreAndMigrateFromCloudResult` сразу после `applyRestoreFromUserDoc` (обёрнут в try/catch с логом — restore никогда не падает от дозаливки). Порядок: проверка флага и `phoneStateOwnsCore` → детектор → проверка смены аккаунта → сброс из `cloud_last_sync_snapshot_v1` КЛИЕНТСКИХ ключей, которых нет в облачном progress (серверные не трогаются) → сетевой вызов fire-and-forget (restore и первый кадр сервер не ждут). Без UI.

**Правила и корневые поля.**
- `firestore.rules`: `users/{id}` разрешает владельцу писать произвольные корневые поля → `progressReseedAt` добавлен в `hasNoProgressAuthorityMarkerWrites` и `newDocHasNoProgressAuthorityMarkerWrites` (иначе клиент стёр бы отметку и обошёл суточный лимит).
- 8A: перепись по коду (`scripts/accounts_v2_root_fields_code_census.cjs`) видит новое поле (`progressReseedAt ← functions/src/progress_reseed_missing.ts`, unresolved = 0); поле внесено в правило `r.progress_markers` (`keep_in_place`, OD20) в `functions/src/accounts_v2_migration/inventory.ts`. Сторож `root_fields_census_guard.test.ts` — 13/13 зелёный.
- 🟡 `root_fields_dry_run.test.ts` красный независимо от 8I: ждёт ≥65 корневых полей, перепись сейчас даёт 63 вместе с новым `progressReseedAt` (без него было бы 62 — кто-то убрал писателей). Не трогал (чужой порог); нужно решение, кому поправить.
- Джарвис: читатели `functions/src/jarvis/*` не читают `progressMigrat*`/`progressReseedAt` — контракт не затронут. Триггер `usersWriteRouter` (рефералка/VIP) реагирует только на премиум — дозаливка его не задевает.

**Тесты (по одному файлу, по тексту вывода).**
- `functions/src/progress_reseed_missing.test.ts` — 21/21: существующий ключ не перезаписан (даже если в снимке выше); понижение невозможно; пишутся только отсутствующие (и только переносимые миграцией); `null` = существует; пустой снимок / «нечего дописать» — без записи; суточный лимит (моложе суток, в будущем, старше суток); `not_authoritative`/`user_missing`; маска Admin SDK; лимиты (ключи, значение, общий размер); без auth; чужой uid; лимит до чтений; запись в `users/{stableUid}` + лог без uid; пустой результат; второй вызов за сутки → `resource-exhausted rate_limited` без записи; проводка (опции без App Check, `requireKnownIdentity`, экспорт, правила, инвентарь 8A).
- `tests/progress_reseed_missing_client.test.ts` — 9/9: признак → снимок, повтор в процессе запрещён; облако с уроками → локальное не читается; локально нули → нет; отметка → нет; успех — ровно один вызов `progressReseedMissing` + отметка; сбой сети — причина в логе, отметки нет; `rate_limited` и постоянный отказ — отметка.
- `tests/progress_reseed_restore_hook.test.ts` — 5/5: признак → один вызов + сброс клиентских ключей снимка (серверные/совпадающие остаются); без признака — нет вызова, снимок не тронут; не авторитетный — детектор не зовётся; смена аккаунта — ни сброса, ни вызова; проводка restore (после apply, в try/catch).
- Соседние: 8G 7/7, census guard 13/13, inventory 40/40, firestore_rules_security 155/155, cloud_sync_lesson_union_restore 18/18, cloud_sync_rules_blocklist_mirror_contract 4/4, streak_server_sync_daily 4/4, cloud_restore_attempt 1/1; root_fields_dry_run 4/5 (см. 🟡 выше, не от 8I).
- Проверка типов только по изменённым файлам (функции: модуль, тест, inventory; приложение: progress_events_client, cloud_sync) — 0 ошибок.

**Мутации (14/14 убиты, каждый файл восстановлен побайтно, sha256 сверен):** M1 «только отсутствующие» (6 упало), M2 суточный лимит (2), M3 только авторитетные (1), M4 лимит ключей (1), M5 auth (1), M6 пустой patch не пишется (5), M7 правило `progressReseedAt` (1), M8 инвентарь 8A (1), M9 без повтора в процессе (1), M10 облако с уроками (1), M11 отметка (3), M12 сброс только клиентских ключей (1), M13 проводка restore (1), M14 смена аккаунта (1).

**Изменённые файлы.**
- новые: `functions/src/progress_reseed_missing.ts`, `functions/src/progress_reseed_missing.test.ts`, `tests/progress_reseed_missing_client.test.ts`, `tests/progress_reseed_restore_hook.test.ts`;
- правки (чужих незакоммиченных правок в них не было, окончания строк сохранены): `functions/src/index.ts`, `firestore.rules`, `functions/src/accounts_v2_migration/inventory.ts`, `app/progress_events_client.ts`, `app/cloud_sync.ts`;
- этот пакет (итог). Бэкап оригиналов — `.tmp_pkg8i_backup/`.

**Порядок выкладки:** 1) функции (`progressReseedMissing`) вместе с `firestore.rules` (блок-лист `progressReseedAt`); 2) только потом клиент 2.0. Клиент раньше функций не опасен: ответ `not-found`/`unimplemented` считается сбоем (без отметки), и вызов повторится со следующего запуска — но лишние вызовы каждый запуск у затронутых, поэтому функции первыми.

**Ограничения.** Сервер возвращает только структурные ключи уроков (как миграция); `best_score`/`pass_count`/экзамены не восстанавливаются — по замыслу (карантин). Клиентские ключи (карточки, библиотека и пр.) уезжают обычным `doSyncToCloud` после сброса снимка; если карточки уже в `flashcard_pages`, синк один раз перезапишет страницы. Независимое ревью — за координатором.

### Доработка по ревью (C-1, C-2) — 2026-10-02, TG-689D0CB59045

**C-1 (сервер, `functions/src/progress_reseed_missing.ts`).**
- Сервер сам проверяет признак затирания в той же транзакции. Если в облачном `progress` есть хотя бы один урочный ключ (те же регулярки, что в `buildMigrationPatch`: `lessonN_cellIndex` и fr-вариант, `lessonN_progress`, `lesson_progress_v2::fr::N`; любое значение, включая `null`), ответ `decision=not_wiped`, записи нет. Проверка стоит раньше суточного лимита. Дозаливка теперь однократна по существу: после первой записи облако уже «не затёрто», и изменённый клиент не может добавлять ключи раз в сутки.
- Номер урока ограничен `PROGRESS_RESEED_LIMITS.maxLessonId = 80`. Ключи с номером 0 или больше 80 отбрасываются, их число пишется в лог `out_of_range_keys=`. Готовой серверной константы числа уроков старого курса в `functions/src` нет: есть только курс Learning V2 и `clampInt(…, 0, 500)` у событий, а это не размер курса. Поэтому потолок взят по границе клиентского сборщика снимка (`progressSnapshotKeys`, уроки 1..80; основной курс — 32 урока, `MAIN_COURSE_LESSON_COUNT`), с комментарием «зачем». Худший случай одной записи: 2 языка × 80 уроков × 2 переносимых поля.
- Прежний фильтр «только отсутствующие» по `existing` после C-1 стал мёртвым кодом: урочных ключей в облаке при записи нет, а patch состоит только из них. Мутация M1 стала эквивалентной, поэтому фильтр удалён, а гарантию даёт `not_wiped` (комментарий в коде).

**C-2 (клиент, `app/progress_events_client.ts`).**
- `unauthenticated` больше не попадает в `refused`: это сбой без отметки, повтор со следующего запуска.
- Ответ `not_wiped` считается окончательным: отметка ставится, детектор больше не срабатывает, повторного вызова нет. Значение добавлено в `ProgressReseedOutcome`.

**Желательное — сделано (`app/cloud_sync.ts`).** `resetWipedClientKeysInLastSyncSnapshot` получает `isCurrent` и проверяет его после `getItem`, перед `setItem`. Если аккаунт сменился, снимок не пишется, вызова нет, в логе `skip reason=stale_account_generation stage=snapshot_reset`.

**Тесты (по одному файлу).**

| Тест | Результат | Что добавлено |
|---|---|---|
| `functions/src/progress_reseed_missing.test.ts` | 28/28 | облако с урочным ключом (4 варианта ключа) → `not_wiped` без записи; `not_wiped` раньше суточного лимита; номер урока вне диапазона отброшен (0, 81 во всех формах, 9999), в диапазоне записан; callable `not_wiped` без записи с логом. Прежние тесты переведены на «затёртое» облако без урочных ключей. |
| `tests/progress_reseed_missing_client.test.ts` | 12/12 | `unauthenticated` → `failed` без отметки; `not-found` → `failed` без отметки; `not_wiped` → отметка и детектор больше не срабатывает |
| `tests/progress_reseed_restore_hook.test.ts` | 6/6 | смена аккаунта между `getItem` и `setItem` → снимок не пишется, вызова нет |
| 8G | 7/7 | — |
| сторож переписи 8A | 13/13 | — |

Проверка типов только по изменённым файлам (функции и приложение): 0 ошибок. Красный `root_fields_dry_run` не трогал.

**Мутации, повторный прогон, каждый файл восстановлен побайтно:**
- Новые, все убиты: N1 `not_wiped` (7 упало), N2 диапазон урока целиком (1), N3 верхняя граница (1), N4 нижняя граница (1), N5 `unauthenticated` снова в постоянных отказах (1), N6 смена аккаунта перед записью снимка (1).
- Прежние M2–M14 перепрогнаны и убиты. M1 эквивалентна, проверка удалена (см. выше).

**Изменённые файлы в доработке:**
- `functions/src/progress_reseed_missing.ts`
- `functions/src/progress_reseed_missing.test.ts`
- `app/progress_events_client.ts`
- `app/cloud_sync.ts`
- `tests/progress_reseed_missing_client.test.ts`
- `tests/progress_reseed_restore_hook.test.ts`
- этот пакет (строка `Governance-ID: TG-689D0CB59045` в шапке)

Окончания строк сохранены. Порядок выкладки прежний: сначала функции и правила, потом клиент.
