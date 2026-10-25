# Task packet: индонезийское «Coba lagi sebentar lagi» → «Coba lagi nanti» (Переводчик, координатор 25.10)

Governance-ID: TG-EEEF6E47F1B5
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Подсказка «Сейчас недоступно. Попробуй снова чуть позже» в индонезийском звучала «Belum tersedia sekarang. Coba lagi sebentar lagi» —
двойное «lagi» подряд режет слух. Правка: «Belum tersedia sekarang. Coba lagi nanti». Фраза живёт в двух местах и должна совпадать:
`components/lesson_prep/prep_cta_copy.ts` (`hintUnavailable`, кнопка «Продолжить» Главной) и `app/(tabs)/lessons.tsx` ~3547 (вкладка «Уроки»).

## Scope

In scope: одна строка id в двух файлах. Out of scope: остальные языки (верны).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- `lessons.tsx` правится другими сессиями — коммит только моего хунка через `--patch`.

## Verification

Разбор файлов babel; `scan_untranslated_ui`.

## Rollback

`git revert <коммит>`.
