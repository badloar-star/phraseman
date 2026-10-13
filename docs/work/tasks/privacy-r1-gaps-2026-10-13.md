# Task packet: сверка политики конфиденциальности с тем, что R1 реально собирает (PRIVACY_R1_GAPS)

Governance-ID: TG-30D1050E30E0
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10; правило «Privacy Policy актуальна»)

## Outcome

docs/phraseman-2.0/PRIVACY_R1_GAPS_2026-10-13.md: пункт → покрыт/нет → предлагаемый текст правки (ru+en). Файлы политики не меняются
и ничего не публикуется — решение владельца утром.

## Scope

In scope: чтение legal/privacy_policy_en(.json, _ios.json), app/legal копий, кода (support_report, support_diagnostics, analytics_consent,
client_reports TTL, account_delete, dialogue_voice_message, speaking_recognition_options). Out of scope: правки политики, legal:sync, публикация.

## Architecture

Нет изменений кода.

## Security and privacy

Документ — только предложение; данные не меняются.

## Technical debt

- Contain: нет.

## Verification

Каждый вывод — со ссылкой на файл:строку кода и раздел политики.

## Rollback

Удалить документ.
