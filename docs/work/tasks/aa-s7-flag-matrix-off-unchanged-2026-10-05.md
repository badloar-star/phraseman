# Task packet: Account Authority 2.0 — этап S7: выключенная система ничего не меняет

Governance-ID: TG-E7105CAE3E22
Status: Planned
Owner: Claude session 5 · АВТОРИЗАЦИЯ (Account Authority 2.0)
Related epic/enabler: docs/work/tasks/aa0-account-authority-reconciliation-2026-10-03.md, строка S7 (≈249); зависит от S1–S6 (последний 6b4adc6e4)

## Outcome
Доказательство тестами, что при выключенных воротах cutover приложение ведёт себя так же, как до Account Authority:
- **поведенческая матрица** «cutover OFF × Account V2 (`accounts_v2_client_enabled`, «Пульт») OFF/ON» для четырёх действий — вход, выход, смена аккаунта, удаление: последовательность вызовов (Firebase Auth, cloud_sync, V2-переходы, SecureStore, сеть/callables) записывается и сравнивается с эталоном старого пути; при cutover OFF ни один модуль `modules/account-authority-v2/**` не загружается (`require`), ни одного AA-callable, ни одного SecureStore-ключа AA;
- **решение по bootstrap** при V2 ON без cutover (сейчас — лишняя синхронная работа с SecureStore на старте): замерить, нужен ли он; если не нужен — убрать под воротами (холодный старт быстрее), если нужен — обосновать.
Мера успеха: матрица — живые тесты; сторож «при cutover OFF модули AA не загружаются»; запись решения по bootstrap; ноль изменений поведения при OFF.

## Scope
In: `tests/aa_s7_*`, `app/accounts_v2_client_flag.ts`, `app/auth_provider.ts` (только если найдено отличие от старого пути при OFF), `app/account_switch_quarantine.ts` (то же).
Out: включение cutover/флагов; Firebase-эмулятор (S8); Android (S9); выкладка (S10). Новый UI — нет.

## Architecture
Без изменения архитектуры: ворота cutover — константа OFF; доказательство — тесты на модульные моки (jest.mock) с журналом вызовов. Если найдено отличие OFF от старого пути — это дефект (логи `[AA-S7]` → тест → минимальная правка → security-ревью).

## Security and privacy
Цель — нулевой эффект для пользователей при OFF. Новых данных нет.

## Technical debt
Если bootstrap при V2 ON без cutover оставляем — Accept с доводом и замером; если убираем — Pay now.

## Verification
Точечные тесты со слотом светофора (один на ПК), один файл за раз; мутации ворот (включить AA при OFF, убрать проверку ворот в 2–3 местах) должны ронять сторож. Полная проверка типов — по разрешению координатора.

## Rollback
git revert тестов; при правке кода — revert коммита; ворота остаются OFF.

## Итог исполнителя S7 (2026-10-05)

**Матрица (живые тесты):** `tests/aa_s7_flag_matrix_off_unchanged.test.ts` — 28 тестов, PASS.
- `:316` — 20 ячеек «платформа (android/ios) × V2 (OFF/ON) × действие (холодный старт, вход, выход, смена, удаление)» при cutover OFF; журнал вызовов (провайдер/Firebase Auth, клиент V2, функции AA, require модулей AA, SecureStore, callables, AppState) сравнивается целиком, с порядком, с эталоном старого пути: `LEGACY_V2_OFF :213`, `LEGACY_V2_ON_ANDROID :233`, `LEGACY_V2_ON_IOS :254`; действия повторяют порядок вызовов auth_provider / account_switch_quarantine / _layout — `ACTIONS :156`; инварианты «ни следа AA» — `:280`.
- `:330` — сторож: при cutover OFF шов не делает require ни одного из 13 модулей `modules/account-authority-v2/**` (каждый замокан с журналом загрузки), нет bootstrap.
- `:344`, `:360` — bootstrap при cutover OFF: ранний выход в обоих положениях V2, лог `[AA-S7] bootstrap skip reason=cutover_off v2=on|off`, без id.
- `:371` — настоящий клиент V2 (V2 ON, cutover OFF, android): ни bootstrap AA, ни ключа SecureStore AA, ни AA-callable; старый колбэк провайдера доходит.
- `:405` — замер стоимости снятого bootstrap.
- `:493`, `:505`, `:516` — перепись загрузки AA по исходнику (см. «Отличия»).

**Найденное отличие и правка.** При V2 ON без cutover `syncAccountsV2ClientAuth` (эффект `_layout` после первого кадра) собирал production bootstrap AA. Потребителей у него при cutover OFF нет (registry читают только `getAccountAuthorityRuntime` и `ACCOUNT_AUTHORITY_PROVIDER_PORT.signOut` — функции AA, которые шов зовёт лишь при cutover ON). Замер на чистом устройстве: 6 синхронных чтений SecureStore + 1 синхронная запись + 2 асинхронных чтения + 1 асинхронная запись, все ключи `phraseman.account_authority.*`, в т.ч. **запись нового installation_id AA** — нового идентификатора на устройстве, которого на старом пути V2 не было; плюс require production adapter и нативной среды. До правки 15 тестов S7 были красными ровно на этом.
Правка (`app/accounts_v2_client_flag.ts:111–126`): ворота bootstrap — только cutover (`if (!isAccountAuthorityV2CutoverEnabled())`), лог `[AA-S7]` (в релизе один раз за процесс). Константа cutover не тронута. Решение по bootstrap: **не нужен → убран под воротами (Pay now)**. Тест S0 `tests/account_authority_app_integration.test.ts:384`, закреплявший прежнее поведение, переписан на обратное (с `// зачем`). Нужно security-ревью правки (уменьшает данные на устройстве; политику конфиденциальности менять не нужно).

**Отличие, которое НЕ дефект ворот (решение координатора/ревью):** при cutover OFF статически грузятся два модуля AA — `account_authority_anon_merge_nonce` (auth_provider, cloud_sync) и `account_authority_logger` (auth_provider). Это отдельное усиление старого входа S2b (nonce M-1), только память процесса: без SecureStore/AsyncStorage/сети/AA-callable; оно добавляет `anonMergeNonce` в существующие callables, только если сервер его выдал. Перепись закреплена тестом `:493`; любой новый статический импорт AA уронит его.

**Мутации (по одной, откат r+b, cmp с after-копией — совпадает):** M1 cutover=true → 24 упали; M2 ворота bootstrap убраны → 24; M3 холодный старт всегда в ветку AA → 11; M4 ворота входа → 10; M5 ворота выхода → 10; M6 ворота удаления AA → 6; M7 ворота «доказательства старым удалением» → 4; M8 вход передаёт authority-колбэк в старый путь → 9. Все убиты.

**Соседи (по одному файлу):** accounts_v2_client_wiring_v2 19/19, account_authority_auth_provider_wiring 8/8, aa_s6_quarantine_signout_seam 5/5, account_authority_bootstrap_contract 10/10, account_authority_app_integration 18/18. **Красный до моей правки:** `account_authority_legacy_callsite_guard` 2/31 — перепись `auth_provider.ts` (`peekStableId` 7→8, `stableIdentityReads` 19→20); `auth_provider.ts` не менялся с коммита S5 52dbac239 — расхождение пришло оттуда, не из S7.

**Не делалось:** полная проверка типов (запрещена; хук ts-cascade тоже пропустил по памяти) — правка типобезопасна (булев флаг, `typeof __DEV__`). Бэкапы: `.tmp_aa_s7_backup/before/`, `.tmp_aa_s7_backup/after/`.
