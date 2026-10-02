# Task packet: Account V2 — Пакет 8H-2: старое поле `progress.flashcards_v1` больше не затеняет страницы карточек

Governance-ID: TG-34452C699F17
Governance-ID: TG-4EB376DEE47B (сессия исполнителя 8H-2, тот же пакет)
Governance-ID: TG-3DEB11F13B78 (доработка по ревью I-1, тот же пакет)
Status: In progress
Owner: Claude session (Account V2, /loop); решение координатора §67 (B + C)

## Outcome

1. **(B) Клиент.** После УСПЕШНОЙ записи страниц карточек (`writeFlashcardPages` в `doSyncToCloud`, app/cloud_sync.ts) в том же патче документа ставить `progress.<выгруженный ключ> = null` (сейчас ключ просто выкидывается из патча и старое значение живёт вечно). Restore тогда видит null → читает страницы. Только при успехе страниц; при сбое записи страниц — прежнее поведение (список в документ).
   - СНАЧАЛА проверить правила `users/{id}` в firestore.rules на эмуляторе Firestore (или существующим rules-тестом): разрешена ли запись `null` в `progress.flashcards_v1`/др. выгружаемые ключи. Если запрещена — правка правил в этом же пакете (минимальная, только эти ключи → null) + rules-тест.
   - Снимок синхронизации должен остаться согласованным (ключ «выгружен» → не гонять null каждый раз: записать один раз, дальше не повторять — например, помнить в снимке/маркере, что поле обнулено).
   - Лог `[LEGACY-V2-SYNC] doc_field_cleared key=…` (без uid).
2. **(C) Сухой подсчёт** (только чтение, без записи): скрипт `scripts/flashcards_doc_field_census.mjs` — агрегат `count()` аккаунтов, у которых в документе ещё есть непустое `progress.flashcards_v1` (и родственные выгружаемые ключи, если есть). Без аргументов — план без сети; прод — только `--project=<id> --owner-command="…"`; `--write/--fix` → код 2. Сам прогон по проду НЕ запускать. Исполнение `functions/scripts/migrate_flashcards_to_pages.js` — только командой владельца (не в этом пакете).
3. **🟡 Тест 7A и CRLF.** В `tests/accounts_v2_legacy_sync_switch.test.ts` структурные проверки нормализуют `\r\n → \n` перед поиском (2 красных теста станут зелёными).
4. Переименовать в логе 8H `decision=write` → `decision=kept` (смысл — «не вырезан выключателем»), по ревью.

## Scope

app/cloud_sync.ts (только ветка записи страниц/патч документа), app/flashcards_cloud_pages.ts при необходимости, app/accounts_v2_legacy_sync_switch.ts (лог), firestore.rules (только если null запрещён), тесты, scripts/flashcards_doc_field_census.mjs (+ тест). Out of scope: прод, деплой правил, запуск migrate-скрипта.

## Architecture

Документ перестаёт быть вторым источником списка карточек: после успешной выгрузки поле документа = null, единственный источник — страницы.

## Security and privacy

Новых данных нет; удаляется устаревшая копия уже хранимых карточек (данные остаются в страницах). Логи без uid/текста.

## Technical debt

Accept temporarily: у аккаунтов, которые не синхронизируются клиентом 2.0, поле остаётся до прогона C командой владельца.

## Verification

RED→GREEN: «после успешной записи страниц в патче progress.flashcards_v1 = null», «при сбое страниц поле пишется как раньше», «restore после очистки читает страницы», «null не отправляется повторно»; rules-тест на эмуляторе Firestore; мутации; затронутые тесты по одному (`npm run test:one`); независимое ревью.

## Rollback

git revert; правила — прежняя версия; бэкап `.tmp_pkg8h2_backup/`.

## Итог исполнителя (2026-10-02)

**Что изменено**
1. (B) `app/cloud_sync.ts` → `doSyncToCloud`: после УСПЕШНОЙ записи страниц (`writeFlashcardPages` вернул не null) ключ попадает в `flashcardDocFieldsToClear`, и в ТОМ ЖЕ точечном патче ставится `progressPatch[key] = null`. Сбой страниц — прежнее поведение (список едет в документ), ключ помечается `flashcardDocFieldsSentToDoc`. Ветка «список не менялся с прошлого синка» поле не трогает (страниц в этот такт не писали).
   - Повтор null не шлётся: после успешной записи документа в снимок `cloud_last_sync_snapshot_v1` кладётся маркер `__doc_field_cleared::<ключ>` = '1'; маркер переносится между синками и снимается, если список уехал в документ. Restore и force-sync перезаписывают снимок целиком → маркер пропадает → максимум ОДНА лишняя запись null при следующей записи страниц (самоисцеляется).
   - Логи: `[LEGACY-V2-SYNC] doc_field_cleared key=…` (после успешной записи документа), `[LEGACY-V2-SYNC] doc_field_clear_skipped key=… reason=already_cleared`. Без uid и содержимого.
   - Чистая логика вынесена в новый `app/flashcards_doc_field_clear.ts` (`decideFlashcardDocField`, `buildFlashcardDocFieldMarkers`), т.к. `app/flashcards_cloud_pages.ts` содержит чужие незакоммиченные правки — его не трогал (сверено побайтно с бэкапом).
2. (C) `scripts/flashcards_doc_field_census.mjs` (+ `.test.mjs`): только `count()`-агрегаты по `progress.flashcards_v1` и `progress.flashcards_v2::fr::flashcards_v1` (не null / == '' / == '[]' → непустых). Без аргументов — план без сети; прод — только `--project=<id> --owner-command="…"`; `--write/--fix/--execute/--delete/--apply/--migrate` → код 2. По проду НЕ запускался. migrate-скрипт не запускался.
3. `tests/accounts_v2_legacy_sync_switch.test.ts`: в describe «7A switch — структура cloud_sync» исходник нормализуется `\r\n → \n` — два красных теста стали зелёными; добавлен тест «restore после очистки (поле = null) читает страницы».
4. `app/accounts_v2_legacy_sync_switch.ts`: лог `decision=write` → `decision=kept` (+ комментарий «зачем»).

**Правила (firestore.rules)**: правка НЕ понадобилась. Статически: update `users/{id}` проверяет только ИМЕНА затронутых ключей (блок-листы), типов значений `progress.*` не проверяет; ключей карточек в блок-листах нет. На эмуляторе Firestore (харнесс `@firebase/rules-unit-testing` уже был в functions/src) новый тест `functions/src/flashcards_doc_field_null_rules.emulator.test.ts`: 4/4 — владелец обнуляет оба ключа точечным update (остальной progress цел); null + обычный ключ в одном патче проходит; контроль: null + заблокированный `user_total_xp` → отказ всего update; чужой аккаунт → отказ.
Запуск: `cd functions && firebase emulators:exec --config ../firebase.json --only firestore --project demo-phraseman-flashcards-doc-field-null --log-verbosity QUIET "npx jest --config jest.emulator.config.js --runTestsByPath src/flashcards_doc_field_null_rules.emulator.test.ts --no-cache --runInBand"`.

**Тесты** (по одному, читал текст вывода):
- `tests/flashcards_doc_field_clear.test.ts` — RED: 4 упали / 8 прошли (до встройки в cloud_sync) → GREEN 12/12.
- `tests/accounts_v2_legacy_sync_switch.test.ts` — было 2 упали / 32 прошли → 35/35.
- `scripts/flashcards_doc_field_census.test.mjs` (node --test) — 3/3.
- эмулятор правил — 4/4.
- Соседи: `flashcards_cloud_pages_guard` 9/9, `cloud_sync_intro_local_only` 3/3; `cloud_sync_account_race_contract` 1 упал / 2 прошли — падение про `auth_provider.ts` (`withLocalStepDeadline`, чужие незакоммиченные правки), к 8H-2 не относится.
- Typecheck только затронутых файлов (временный tsconfig с files; 167 файлов app в графе): 0 ошибок.

**Мутации** (каждая откатана побайтно, `cmp` OK): M1 убрать `progressPatch[key] = null` → 1 тест упал; M2 игнорировать маркер (null каждый раз) → упал; M3 очищать при сбое страниц → упал; M4 не снимать маркер после отката в документ → упал; M5 не помечать `SentToDoc` → упал; M6 не писать маркер в снимок → упал; M7 restore предпочитает null-поле документа → новый restore-тест упал; M8 вернуть `decision=write` → упал; M9 census разрешает `--fix` → упал. Мутация самих правил не делалась (общий файл); вместо неё — контрольный тест на заблокированный ключ.

**Файлы**: app/cloud_sync.ts (CRLF сохранён), app/flashcards_doc_field_clear.ts (новый), app/accounts_v2_legacy_sync_switch.ts, tests/flashcards_doc_field_clear.test.ts (новый), tests/accounts_v2_legacy_sync_switch.test.ts, scripts/flashcards_doc_field_census.mjs (новый), scripts/flashcards_doc_field_census.test.mjs (новый), functions/src/flashcards_doc_field_null_rules.emulator.test.ts (новый), этот пакет (добавлена строка Governance-ID сессии исполнителя — её требует хук task_governance). firestore.rules и app/flashcards_cloud_pages.ts не тронуты. Бэкап: `.tmp_pkg8h2_backup/`.

**Порядок выкладки**: правила не менялись → деплой правил НЕ нужен; изменение только клиентское (уходит со сборкой приложения). Прогон census по проду — только командой владельца; migrate-скрипт — отдельной командой владельца.

**Найдено попутно (не чинил, вне Scope)**:
- 🔴 `forceSyncToCloud` (перенос при смене устройства) по-прежнему пишет `progress.flashcards_v1` целиком в документ (его `forceData` карточки в страницы не выгружает) — то есть заново создаёт затеняющую копию. Маркер при этом корректно сбрасывается (снимок перезаписывается), и следующая запись страниц обнулит поле снова, но до неё restore на другом устройстве увидит копию из документа. Нужен отдельный пакет.
- 💸 Если в такте изменились только карточки (других изменений, heartbeat и created_at нет), `doSyncToCloud` выходит до записи документа и снимок НЕ обновляется → страницы переписываются на каждом таком такте. 8H-2 смягчает это один раз (первый null делает патч непустым), после маркера эффект возвращается. Нужен отдельный пакет: сохранять снимок и при пустом патче, если страницы писались.
- Ветка «список не менялся» никогда не пишет страницы: если страницы однажды не записались, а следующий такт видит то же значение в снимке, ключ считается «выгруженным» без страниц (было и до 8H-2).

### Доработка по ревью (I-1)

**Проблема.** В restore (`applyRestoreFromUserDoc`, app/cloud_sync.ts) строка `if (!cloudData['flashcards_v1'] && cloudData['flashcards'])` срабатывала и на обнулённом поле (`null`): древний список вставал в pairs ПОСЛЕ значения из страниц, побеждал в multiSet, и следующий синк переписывал им настоящие страницы. Заодно найдено: то же происходило и при ОТСУТСТВУЮЩЕМ поле, если страницы были (тест 4 ниже был красным до правки).

**Правка.** Для каждого ключа запоминается, что дали страницы (`pages` / `none`); древнее `progress.flashcards` берётся, только если `flashcards_v1` в документе нет вовсе (`=== undefined`) И страницы прочитаны и пусты. Иначе — лог `[LEGACY-V2-SYNC] restore legacy_flashcards ignored doc_field=absent|null|present pages=pages|none|not_read`; при использовании — `source=legacy_flashcards legacy_len=…`. Ветки ключей: древний двойник есть только у английского `flashcards_v1`; у `flashcards_v2::fr::flashcards_v1` legacy-поля нет, его путь (поле документа → страницы) не менялся. Если страницы не читались (нет uid или V2-выключатель держит домен), древнее поле тоже не берётся.

**Тесты** (`tests/accounts_v2_legacy_sync_switch.test.ts`, +4): `null + flashcards + страницы → страницы`; `null + flashcards + страниц нет → древнее НЕ берётся`; `нет поля + нет страниц + flashcards → flashcards` (прежнее поведение); `нет поля + страницы + flashcards → страницы`. RED: 4 упали / 35 прошли → GREEN 39/39. `tests/flashcards_doc_field_clear.test.ts` 12/12. Typecheck `cloud_sync.ts` + теста — 0 ошибок. CRLF `cloud_sync.ts` сохранён.

**Мутации** (откат побайтно): вернуть falsy-проверку `!cloudData['flashcards_v1']` → 1 упал; игнорировать результат страниц → 1 упал; не запоминать источник страниц → 2 упали.

**Подсчёт.** `scripts/flashcards_doc_field_census.mjs` считает ещё непустое `progress.flashcards` (`legacy: true`, отдельный итог `legacyNonEmpty`, в `totalNonEmpty` не входит); тест обновлён — 3/3; мутация «legacy в общем итоге» → упал.

**Остаток (отдельные пакеты, здесь не делались):**
- **I-2:** `readFlashcardPages` возвращает null и при ошибке чтения, и при пустых страницах. Restore не отличает сбой сети от пустоты: при сбое и отсутствующем `flashcards_v1` древнее `progress.flashcards` будет взято и затем переписано в страницы. Нужен пакет: вернуть из чтения различимый признак ошибки и при ошибке ничего не брать.
- **forceSyncToCloud** пишет список карточек в документ (см. 🔴 выше).
- 💸 повторная запись страниц при пустом патче (см. выше).
