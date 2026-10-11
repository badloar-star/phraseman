# Task packet: сканер непереведённых строк считал логи [THUMB] текстом интерфейса (412 → 415)

Governance-ID: TG-F2E5C095C230
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10).

## Outcome
`scripts/scan_untranslated_ui.mjs` отказывает: 415 против базы 412. Три новые строки — причины в вызовах
`traceThumbMissing(...)` (лог `[THUMB]`, коммит 40f96c292: `app/flashcards/VideoPackRow.tsx` ×2,
`components/home/v2/HomeV2VideoRail.tsx` ×1). `traceThumbMissing` (`app/thumb_trace.ts`) только пишет `console.warn` и
возвращает null — на экран ничего не выводит. Сканер знал только `console.*` / `DebugLogger.*`. Добавить помощник в
распознавание логов; базу НЕ повышать.

## Scope
In: `scripts/scan_untranslated_ui.mjs` (распознавание лог-вызова). Out: база, файлы [THUMB].

## Architecture
Расширение регулярки DIAGNOSTIC_LOG_CALL явным именем помощника (не маской — чтобы UI-строки не просочились).

## Security and privacy
Без данных.

## Technical debt
Новые помощники логов с текстом — дописывать в тот же список.

## Verification
Сканер: 412 = база (зелёный); сравнение со срезом базы 29fa741d6 — новых строк нет.

## Rollback
`git revert`.
