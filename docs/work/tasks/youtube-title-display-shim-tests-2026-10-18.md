# Task packet: app/youtube_title_display.ts — route-shim и тесты (замечание Ревизора по ef7879a33)

Governance-ID: TG-FBD1DD92833E
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

1. expo-router больше не предупреждает о маршруте без экрана: в `app/youtube_title_display.ts` — `export default` заглушка, как у соседей (`app/flashcards/video_card_save_core.ts`).
2. Тесты закрепляют поведение: `cleanYoutubeTitle` («| |», «||», края, двойные пробелы, обычный заголовок не меняется) и `premiereCountdownText` (0 дней не печатается, 0 часов при 0 днях не печатается, дни есть — часы печатаются даже 0, секунды по запросу, ru/uk/en/tr/vi, неразрывный пробел).

## Scope

In scope: `app/youtube_title_display.ts` (только заглушка), новый `tests/youtube_title_display.test.ts`.

Out of scope: перенос в utils/ (заглушка дешевле и не трогает 4 импорта), сами тексты.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Модуль остаётся в app/ с заглушкой, как десятки соседних — Accept: перенос всех чистых модулей из app/ — отдельная задача.

## Verification

- `babel.parseSync`;
- новый тест через светофор (`npm run test:one`).

## Rollback

`git revert <коммит>`.
