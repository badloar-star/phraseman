# Перепрогон красных тестов зоны Темы (Ядро → Темы, RED_TESTS «Перепрогон 12.10 вечер»)

Governance-ID: TG-58DF6DACDEDC
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (сообщение Ядра по заданию координатора)

## Outcome
Четыре красных теста зоны Тем снова зелёные: три сторожа исходников (flashcards_speaking, flashcards_training_setup, manage_subscription) пере-сверены по diff и перепиннены только там, где менялись не-бизнес-куски; устаревший сторож иконок режимов «Midnight» заменён проверкой, что старых ассетов и ссылок на них нет.

## Scope
tests/flashcards_speaking_liquid_glass_source_contract.test.mjs, tests/flashcards_training_setup_liquid_glass_source_contract.test.mjs, tests/manage_subscription_liquid_glass_source_contract.test.mjs, tests/midnight_flashcards_mode_icon_assets.test.ts. Код приложения не меняется.

## Architecture
Хеши защищённого рантайма пересчитываются после сверки diff коммитов с прошлой привязки (06096d151): flashcards_speaking_session — d1b10af11 (старт «Правда/ложь» у Plus) и 41443be48 (украинские тексты); flashcards_training_setup — 8fd8adbab (журнал [FLASHCARDS-SESSION]); manage_subscription — d35cf5cec (английский интерфейс) и 41443be48 (украинские тексты). Тест иконок: папка assets/images/flashcards/mode_icons удалена ещё в checkpoint 96c32bb97 (Карточки 2.0 не рисуют тематические плитки хаба).

## Security and privacy
Только тесты.

## Technical debt
Хеши — ручная сверка по diff; если правка прячет бизнес-логику за «текстом», сторож её не отличит от перевода — поэтому каждое перепиннивание описывается комментарием «зачем» с хешами коммитов.

## Verification
Каждый из четырёх файлов отдельно по слоту; пересверка diff перед перепином.

## Rollback
git revert.
