# Task packet: метки «последнее место» Главной — опись хранилища, стирание при смене аккаунта, сторож без ложных ключей

Governance-ID: TG-03A9F8F6B825
Status: В работе (координатор 18.10 02:43, R132-соседний: сторож phone_state_legacy_inventory красный на HEAD)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

`guard_phone_state_legacy_inventory --check` зелёный: ложных ключей `cards`/`dialog` нет, настоящие ключи меток
описаны префиксом. Метки «последнее место» (урок V2, старый урок, диалог, набор карточек) принадлежат аккаунту:
стираются общим стиранием при выходе/смене/удалении и попадают в аварийную копию владельца (возвращаются ему же).

## Факты

- 719e4c771 добавил метки диалога и карточек: ключ `${lastOpenedLessonKey(target)}__continue_dialog|cards`.
- Сторож ищет строки внутри `AsyncStorage.multiGet/multiRemove([...])` и принял аргументы `placeKey(target, 'dialog')`
  за ключи. Метки `__continue_v2|at` (2 знака) он не видел вовсе.
- Общее стирание (wipeLocalAccountDataUnsafeBody → accountOwnedStorageKeysFrom) эти 4×5 ключей НЕ содержит: их снимает
  только подписчик onAccountOwnerChanged в home_continue_mark.ts фоновым multiRemove без ожидания.

## Scope

- app/target_storage_keys.ts: HOME_CONTINUE_MARK_PREFIX ('last_opened_lesson__continue_'), HOME_CONTINUE_MARK_KINDS
  (v2, at, dialog, cards), homeContinueMarkKey(kind, target).
- app/home_continue_mark.ts: ключи только через homeContinueMarkKey; multiGet/multiRemove получают готовый массив
  (без строк внутри вызова) — поведение и порядок те же.
- app/cloud_sync.ts accountLocalDataKeysForToday: + 4 вида × LEARNING_LANGUAGE_TARGETS.
- app/guest_clean_classifier.ts: метки — 'service' (раньше «чистый гость» их не видел вовсе; поведение входа не меняется).
- config/phone-state-legacy-inventory.v1.json: prefixRule `last_opened_lesson__continue_` (progress, device_only,
  none, personal). Не-английские ключи (`lesson_session_local_v2::…`) уже под правилом `lesson`.
- tests: ключи в описи аккаунта (стирание и копия), английский ключ = префикс + вид, классификатор — service.

## Architecture

Один построитель ключа в target_storage_keys.ts — его используют и Главная, и стирание; расхождение ключей невозможно.

## Security and privacy

Метка хранит название и маршрут последнего места — личное. Теперь она гарантированно стирается при смене аккаунта
(раньше — фоновой попыткой без проверки) и не видна следующему человеку на телефоне.

## Technical debt

Подписчик onAccountOwnerChanged в home_continue_mark.ts остаётся (чистит память процесса); его multiRemove теперь
дублирует общее стирание — безвредно.

## Verification

node scripts/guard_phone_state_legacy_inventory.mjs --check → unknownKeys=0; tests/phone_state_legacy_inventory.test.ts,
tests/guest_clean_classifier.test.ts, tests/guest_clean_handoff_matrix.test.ts, тесты Главной «Продолжить», новый тест.

## Rollback

Обратный собственный патч.
