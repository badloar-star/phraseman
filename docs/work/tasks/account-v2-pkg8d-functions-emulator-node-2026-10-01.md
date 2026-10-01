# Task packet: Account V2 — Пакет 8D: эмулятор функций падает на admin.firestore.FieldValue

Governance-ID: TG-76E9E526A78B
Status: Done (SPEC+SECURITY APPROVE)
Owner: Claude session (Account V2, /loop)

## Outcome

Блокер 1 (квитанции E2E 2026-10-01): в Firebase Emulator функции падают `TypeError: Cannot read properties of undefined (reading 'serverTimestamp')` на `admin.firestore.FieldValue` (и `Timestamp`) — `accountDeleteEnqueue`, `authEnsureStableLink` → старая синхронизация в эмуляторе не пишет (сценарии C/I не проверить), удаление аккаунта не проходит. В обычном Node то же выражение работает. Гипотеза: firebase-tools 15.15 + node 24 (а функции объявлены под node 22?) — прокси firebase-admin эмулятора.

1. Сначала доказательства: какая версия node у functions (`functions/package.json` engines), чем запускается эмулятор, воспроизвести минимально (отдельный маленький скрипт/тест под эмулятором без телефона), найти точную причину (версия node, двойной firebase-admin в node_modules functions vs корень, способ импорта).
2. Починка с минимальным риском для прода:
   - если причина — версия node: документированный способ запускать эмулятор функций на node 22 (скрипт/инструкция в репо, без глобальных изменений машины);
   - если причина — способ импорта (`admin.firestore.FieldValue` через namespace): точечно перейти на модульный `import { FieldValue, Timestamp } from 'firebase-admin/firestore'` в затронутых функциях (это работает и в проде) — только с тестами и без изменения поведения.
3. Проверка: минимальный эмуляторный прогон (`accountDeleteEnqueue`/`authEnsureStableLink` не падают). Телефон НЕ нужен.

## Scope

functions/src (только места с admin.firestore.FieldValue/Timestamp, если причина в импорте), scripts/ (запуск эмулятора), docs. Out of scope: деплой, прод, App Check, изменение поведения функций. Внимание: `account_delete*` — группа удаления у координатора; если править там — сначала проверить, что выкладка координатора завершена/файлы свободны, и написать в инбокс.

## Architecture

Без изменения логики; только окружение или способ импорта.

## Security and privacy

Без изменений.

## Technical debt

Accept temporarily: если исправление — только скрипт запуска на node 22, кодовая база остаётся на namespace-импорте.

## Verification

Минимальный эмуляторный прогон (без телефона, Firebase Emulator Suite только на время проверки, затем остановить), затронутые functions-тесты по одному, независимое ревью.

## Rollback

git revert.

## Итог исполнителя (2026-10-01)

**Доказательства.**
- `functions/package.json` → `engines.node = "22"`, firebase.json → `runtime nodejs22`; на машине только node 24.14.0 (nvm/fnm/volta нет); эмулятор: firebase-tools 15.15.0 (глобальный), пишет «requested node 22 … Using node@24 from host».
- firebase-admin: `functions/node_modules` 13.10.0, корень 13.9.0 — эмулятор берёт из functions (одна копия в рантайме функций; двойная установка не причина).
- **Точная причина — не версия node, а прокси эмулятора.** `firebase-tools/lib/emulator/functionsEmulatorRuntime.js` → `initializeFirebaseAdminStubs` подменяет модуль `firebase-admin` объектом `Proxied`; на `admin.firestore` он отдаёт `Proxied.getOriginal(target, "firestore")`, а тот для функции без `prototype` («не конструктор») возвращает `value.bind(target)`. В firebase-admin 13 `admin.firestore` — стрелочная функция `(app) => …` (prototype нет) со статиками `FieldValue`, `Timestamp`, `FieldPath`…; у привязанной копии статиков нет. Минимальное воспроизведение в обычном node: `typeof admin.firestore.FieldValue === 'function'`, `typeof admin.firestore.bind(admin).FieldValue === 'undefined'`. На node 22 то же самое (стрелка и bind от версии node не зависят) → запуск эмулятора на node 22 НЕ помог бы.
- Переход на модульный импорт `firebase-admin/firestore` — 500 мест в ~200 файлах functions/src (в т. ч. account_delete*) — высокий риск без выгоды для прода; отвергнут.

**Починка (минимальный риск, поведение прода не меняется).** Новый `functions/src/emulator_admin_namespace_fix.ts`, импортируется ПЕРВОЙ строкой кода в `functions/src/index.ts`. Только при `FUNCTIONS_EMULATOR === "true"` и только если `admin.firestore.FieldValue` пропал: кладёт на модуль собственное свойство `firestore` — обычную функцию (есть `prototype` → прокси не делает bind) с теми же статиками, вызов делегирует исходной. Лог `[EMULATOR-ADMIN] firestore_statics_repaired`. В проде переменной нет → ничего не делает. `account_delete*` и остальные функции не тронуты.

**Проверка.**
- Unit: `functions/src/emulator_admin_namespace_fix.test.ts` — воспроизведение на копии логики `Proxied` (сверяется с исходником установленного firebase-tools), починка, «вне эмулятора — ничего», импорт первым в index → Tests: 5 passed, 5 total. Мутации 6/6 пойманы (только эмулятор, только при пропавших статиках, копирование статиков, свойство на модуле, обычная функция вместо стрелки, импорт первым).
- **Эмулятор (без телефона, demo-проект `demo-phraseman`, только default-кодбаза, временный конфиг, запущен на время проверки и остановлен):** при старте `[EMULATOR-ADMIN] firestore_statics_repaired` (статики в настоящем эмуляторе действительно пропадали); `authEnsureStableLink` → **200** `{ok:true, identityReady:true}`; `accountDeleteEnqueue` → **200** `{ok:true, status:"queued", created:true, authReleased:true, credentialSafe:true}`. RED (та же сборка, строка починки закомментирована в lib): `authEnsureStableLink` → **503 `identity_check_unavailable`**, `accountDeleteEnqueue` → 403 `stable_id_mismatch` (нет привязки). После проверки lib восстановлен, временные `.tmp_firebase_8d.json` и `functions/.env.demo-phraseman` удалены, порты эмулятора свободны.
- `app_check_sealed` 4/4; eslint новых файлов — чисто (110 предупреждений — старые, в index.ts); проверка типов functions по новым файлам — чисто.

**Замечания.**
- 🟡 `auth_identity.ts` `throwIdentityCheckUnavailable` превращает любую ошибку (здесь — TypeError) в `identity_check_unavailable` без лога причины — поэтому блокер выглядел как «нет доступа». Отдельной задачей: логировать класс ошибки (правило «немой catch»).
- Другие кодбазы (`functions-content`, `functions-max`, `functions-english-test`) не правились; если они пользуются `admin.firestore.FieldValue` в эмуляторе — та же проблема, тот же модуль.
- Для запуска эмулятора без интерактивных вопросов о параметрах нужен `functions/.env.<projectId>` (значения для 9 `defineString`) — в репо не добавлял (секретов нет, но это решение координатора).
