# Task packet: тесты Learning V2 после правок контента 28.10 + es-MX в тесте речи

Governance-ID: TG-E6623F60168A
Status: In progress
Owner: Learning V2 session; координатор 28.10

## Outcome

1. tests/study_speech_locale_contract.test.ts ждёт es-MX (выбран намеренно в 82cfea233, тест не обновили).
2. Весь набор тестов Learning V2 на HEAD: какие покраснели от сегодняшних правок контента (Теория, Переводчик, порядок слов) — починены
   (ожидания под новый контент или настоящая ошибка в данных). Отчёт с цифрами.

## Scope

Тесты Learning V2 (tests/*learning_v2*, *chapter_exam*, *placement*, *season* в зоне V2); файлы Codex (factory_native generated, R2, voice
packs) не трогаю.

## Architecture

Прогон через светофор, разбор каждого FAIL: причина — контент / код / чужая работа; правка только своих ожиданий.

## Security and privacy

Нет данных.

## Technical debt

Красные из чужих зон — отчётом координатору.

## Verification

Повторный прогон после правок.

## Rollback

Revert коммитов.
