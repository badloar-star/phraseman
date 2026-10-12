# Task packet: наложить дополнения политики R1 в legal/*.json и пересобрать страницы (legal:sync) — решение владельца п.81(5)

Governance-ID: TG-2524C6D7FB0A
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

docs/phraseman-2.0/handoff/legal_r1_policy_additions.patch наложен (legal/privacy_policy_en.json, _ios.json, scripts/sync-legal-html.mjs;
пункты 1–3 Ядра/Дизайна + пункт 4 Авторизации об удалении аккаунта). `npm run legal:sync` пересобрал копии в app/legal, корневые
privacy/terms, admin/oauth-privacy и knowly-www/legal/*. Выкладка хостинга — НЕ сейчас, в день релиза (владелец).

## Scope

In scope: файлы патча и выход legal:sync в репозитории. Out of scope: деплой hosting, App Store Connect.

## Architecture

legal/*.json — источник; sync-legal-html.mjs копирует в app/legal и генерирует HTML.

## Security and privacy

Текст политики приводится к фактическому поведению удаления аккаунта и функций R1 (см. handoff/legal_r1_policy_additions.md).

## Technical debt

- Contain: при новой правке политики — снова legal:sync.

## Verification

JSON разбирается; тесты политики/юридических страниц; numstat только ожидаемых файлов.

## Rollback

git revert коммита.

## Result

Наложено, legal:sync выполнен (выкладки нет). Тесты: legal_copies_sync 6/6, aa_guest_honesty 21/21, support_diagnostics_privacy 4/4,
website_privacy_consent 6/6, website_i18n 7/7, website_global_background 27/27, legal_document_liquid_glass 8/8 (закреплённые хэши политики
обновлены с пометкой п.81(5)). Страница data-deletion совпала с HEAD (текст уже был опубликован 09ffadc73).
