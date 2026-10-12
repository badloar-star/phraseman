# Task packet: пересобрать handoff/legal_r1_policy_additions.patch с пунктом 4 (удаление аккаунта), НЕ применять

Governance-ID: TG-0AE4918142EE
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

Патч = прежние правки (Ядро/Дизайн: пункты 1–3) + три абзаца пункта 4 в legal/privacy_policy_en.json и _ios.json
(кэш базы стирается при следующем запуске; автоповтор удаления гостя без сети; доска идей в перечне старых функций) +
те же два абзаца на странице data-deletion (scripts/sync-legal-html.mjs). `git apply --check` OK, НЕ применять.

## Scope

In scope: только файл патча и описание в legal_r1_policy_additions.md. legal/*.json, сайт, app/legal — НЕ трогать.

## Architecture

Патч собирается из копий HEAD во временной папке: применить прежний патч, затем мои замены строк, затем diff.

## Security and privacy

Тексты политики уточняют реальное поведение удаления; публикация — только владелец (legal:sync после «да»).

## Technical debt

- Contain: при изменении legal/*.json до применения — пересобрать патч.

## Verification

git apply --check на текущем дереве; JSON после применения в копии разбирается; все прежние ханки на месте.

## Rollback

Файл патча — документ; откат коммита.
