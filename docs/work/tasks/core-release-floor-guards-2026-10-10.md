# Task packet: оставшиеся красные сторожа релизного пола — политика, интро-картинки, устная тренировка карточек

Governance-ID: TG-516D9E6E1A15
Status: In progress (координатор 10.10: «бери, это часть релизного пола»)
Owner: сессия 1 · ЯДРО

## Outcome

- legal_document_liquid_glass: хэши политики (en, en_ios) после осознанных правок fe079cd49, 15feb3642 (04.10)
  и 472f8715e (10.10, недельные монеты Шпиля). Зеркала app/legal байт-в-байт совпадают; условия не менялись.
- feature_intro_asset_alpha_quality / universal_palette — удалены. Картинки интро снесены вместе с их показом в
  общем снимке 30.09 (efe19ae9d): FeatureIntroStage больше не рисует Image, 126 файлов удалены из git.
  Сторожа охраняли несуществующие ассеты (0 из 13). Отсутствие ссылок на ассеты ловит сборщик.
- flashcards_speaking_liquid_glass: f371d6122 (итог тренировки по cards-section) добавил в экран время раунда и
  список ошибок — только показ, квоты, попытки и озвучка не тронуты. Счётчик 34→35, хэши приняты после чтения диффа.

## Scope

tests/legal_document_liquid_glass_source_contract.test.mjs, tests/flashcards_speaking_liquid_glass_source_contract.test.mjs,
удаление tests/feature_intro_asset_alpha_quality.test.cjs и tests/feature_intro_asset_universal_palette.test.cjs.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Нет.

## Verification

legal 8/8, flashcards_speaking 6/6; удалённые тесты нигде не перечислены (package.json, конфиг тестов, scripts).

## Rollback

git revert коммита.
