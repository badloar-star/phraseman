# Приёмка .accent для intro_cards_hub/intro_cards_swipe и заказ Codex: пересдача intro_legacy_lessons, значки рангов Шпиля

Governance-ID: TG-065012D5DA8D
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (решения координатора 12.10: импорт intro_cards_hub/swipe, пересдача intro_legacy_lessons, ранги Шпиля — знамя 19, вариант B)

## Outcome
1) Вырезанные из основы слои `.accent` для `intro_cards_hub` и `intro_cards_swipe` (тёмное и светлое) приняты в `assets` штатной приёмкой с `--skip intro_legacy_lessons,lessons,dialogs`; 4 строки этих предметов убраны из `ACCENT_MISALIGNED_DEBT`; тесты арта зелёные, сторож не ослаблен. 2) В заказ Codex (`ART_STYLE_FOR_CODEX/S2_CLAY_FULL_SET_ORDER.md`) вписана пересдача `intro_legacy_lessons` с цифрами отказа сторожа и заказ шести значков рангов Шпиля `spire_rank_1…6` (форма 19 «знамя», шевроны — слой accent). Код Шпиля НЕ трогается до прихода картинок.

## Scope
Файлы `assets/images/v2art/{dark,light}/intro_cards_hub|intro_cards_swipe.accent.webp`, `scripts/gen_themed_art_assets.mjs` (список долга), документ заказа. Приёмка перегенерирует `themed_art_assets.generated.ts` штатным генератором (состав слотов не меняется).

## Architecture
Штатная приёмка `import_art_style`: сжатие ≤ 400 КБ, `[THEMED-ART-GUARD]` (альфа + `accent_misaligned` против основы из assets), резервная копия заменяемого в `_backup`, затем генератор слотов. Долг сторожа — только уменьшается.

## Security and privacy
Только картинки и текст заказа; данные пользователей, права и сеть не затрагиваются.

## Technical debt
`intro_legacy_lessons` (оба режима) остаётся в долге до пересдачи Codex; подключение значков рангов в экраны Шпиля — после прихода файлов.

## Verification
`import_art_style --dry-run` перед записью; `gen_themed_art_assets --check`; тесты `themed_art`, `themed_art_guard`, `home_art_accent_layers`, `themed_art_clay_accent_contrast`, `import_art_style`, `accent_alignment_guard` — по слоту светофора.

## Rollback
Заменённые файлы в `ART_STYLE_FOR_CODEX/_backup/S2_clay_accentfix-<время>/`; `git revert` коммита возвращает файлы и список долга; текст заказа — отдельным коммитом.
