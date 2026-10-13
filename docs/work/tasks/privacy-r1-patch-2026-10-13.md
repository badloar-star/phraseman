# Task packet: готовый патч трёх правок политики конфиденциальности (не применён)

Governance-ID: TG-C0AA155B9F5A
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10; вопрос владельцу №13, f9dc43b19)

## Outcome

docs/phraseman-2.0/PRIVACY_R1_PATCH_2026-10-13.diff — git-патч П-1…П-3 из PRIVACY_R1_GAPS_2026-10-13.md (+ строка §19, дата «Last updated»)
для legal/privacy_policy_en(.json, _ios.json) и их копий app/legal/. Политика только на английском — переводы не нужны.
Патч НЕ применён: рабочая копия JSON не менялась (патч собран из HEAD в памяти), `git apply --check` проходит.
Команды применения и проверки — в PRIVACY_R1_PATCH_README_2026-10-13.md.

## Scope

In scope: файл патча и инструкция. Out of scope: применение, legal:sync, публикация — после «да» владельца.

## Architecture

Патч из HEAD-версий через difflib; правки — точные замены по якорям (каждый ровно один раз), JSON проверяется на валидность.

## Security and privacy

Только текст политики; данные не меняются.

## Technical debt

- Contain: нет.

## Verification

git apply --check; git status по legal/ и app/legal/ пустой.

## Rollback

Удалить файлы патча.
