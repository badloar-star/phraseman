# Полная чистка раздела MAX — опись и план (решение владельца 04.10: «Да, вычистить весь MAX»), Ядро

Только чтение: код, `gcloud functions list`, журналы вызовов с 2026-09-04. Второе мнение — Advisor (Opus).

## 1. Что уже удалено
Клиентские экраны/компоненты MAX — общим снимком efe19ae9d (30.09): `app/max_voice_flags.ts` нет, `components/max/` пуст,
плитка на Главной снята. Функции MAX в коде закомментированы (functions-max/index.ts).

## 2. Что осталось
**Сервер:**
- `functions-max/` (отдельная кодовая база `max` в firebase.json) — только маркер пломбы и закомментированные экспорты.
- `functions/src`: ~50 файлов `max_*`, `voice_minute*` + тесты.
- Jarvis: отдел `maxvoice` (maxvoice_department/fetcher/snapshot + подключение в all_departments_callables,
  jarvis_crons, all_departments_snapshot, jarvis/index, decision.ts, JF_DEPARTMENT_META в админке, контракт-сторож).
- `ai_safety.ts` / `admin_compliance.ts`: ветка MAX в журнале сигналов безопасности; `warm_instance_gauge.ts:41` (maxvoicemint).
- `scripts/guard_max_voice_privacy.mjs` (не подключён в pre-commit).

**Клиент:** `modules/voice_minutes/*` (никем не импортируется, кроме `resolveVoiceMinutePackages` в app/revenuecat_init.ts,
у которой нет вызовов); ~48 тестов `tests/max_*` и `voice_minute*` (многие ссылаются на уже удалённые модули).
**Админка:** ~11 мест в admin/v2/legacy.html (панель операций MAX, настройки MAX, вкладка отзывов max-feedback).
**Пломба:** functions/src/max_section_seal.ts, tests/max_section_sealed_contract.test.ts,
tests/admin_max_sealed_surfaces_contract.test.ts, раздел CLAUDE.md «РАЗДЕЛ MAX ЗАКОНСЕРВИРОВАН».

## 3. Живые функции в облаке (только чтение) и вызовы с 04.09
| Функция | В коде | Вызовов |
|---|---|---|
| voiceMinuteWalletMine | экспорт в index.ts | **88** — старые сборки клиента |
| adminListMaxVoiceFeedback | — | 15 (админка) |
| maxVoiceConfigAdmin, adminGetMaxVoiceOpsDashboard, submitMaxVoiceFeedback, adminGrantVoiceMinutes | нет экспорта | 0 |
Удаление функций в облаке — не мной (условие координатора): после релиза клиента без MAX — по имени.

## 4. ОСТАЁТСЯ (деньги, приватность, безопасность)
- Удаление аккаунта: стирание voice_minute_events/denials/wallets, памяти учителя, звонков и флагов — остаётся, пока данные лежат в проде.
- RevenueCat: перечень снятых продуктов (max_voice_minutes, max_subscription) — для возвратов/продлений старых покупок.
- Слияние аккаунтов: перенос кошельков минут — в нейтральный модуль.
- Правила Firestore для коллекций MAX: НЕ стирать, заменить явным `allow read, write: if false` (иначе откроются через общее админское правило).
- Индекс voice_minute_events (нужен удалению и денежному отделу Джарвиса); источник voice_minute_events в денежном отделе Джарвиса — история продаж.
- Стоп-лист облачной синхронизации `max_voice_*_outbox` в app/cloud_sync.ts — иначе старые локальные ключи уйдут в облако.
- Политика конфиденциальности: описание хранения/удаления данных голосового звонка — пока данные лежат в проде.

## 5. Порядок (каждый шаг — отдельный коммит; до шага — тесты входа/синхронизации, после — tsc)
1. **Сервер, перенос живого кода** в нейтральные модули: tutor_memory (из max_voice_tutor_memory), dialog-safety (из
   max_voice_safety) для premium_dialog_review; VOICE_FEEDBACK_COLLECTION/sanitize → feedback_entries;
   mergeVoiceMinuteWalletsInTransaction → legacy_voice_minute_wallets; проверка STOP-строки premium_dialog — перенести.
2. **Сервер, удаление:** functions-max/ + запись codebase max в firebase.json (только конфиг), functions/src max_* и
   voice_minute* (кроме экспорта voiceMinuteWalletMine — до релиза клиента), guard_max_voice_privacy, ветки MAX в
   ai_safety/admin_compliance, warm_instance_gauge.
3. **Jarvis:** снять отдел maxvoice по правилу «тронул данные — обнови Джарвиса» (snapshot, meta в админке, сторож).
4. **Клиент** (после «да» координатора; экраны сессий 2/3 не трогаю): modules/voice_minutes, resolveVoiceMinutePackages,
   тесты max_*/voice_minute*.
5. **Админка:** убрать панель операций и настройки MAX; вкладку отзывов MAX — архивный просмотр или убрать (вопрос владельцу).
6. **Пломба:** max_section_seal + 2 сторожа + раздел CLAUDE.md → один новый сторож «max_voice в коде только в
   перечне удаления данных, стоп-листе синхронизации и снятых продуктах RevenueCat».
7. **Облако (координатор, после релиза клиента):** удалить по имени 6 функций MAX.
