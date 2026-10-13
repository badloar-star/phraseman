# Task packet: все уроки Learning V2 бесплатны в R1; скрипт переводов опроса — вход через gcloud (ADC)

Governance-ID: TG-B3DDE2BFFE9A
Status: In progress
Owner: Ядро (сессия 1)
Related: владелец 13.10 09:50 (Q11 «ВСЕ уроки V2 бесплатно»), координатор (Q18-1 «ок» на ADC, Q18-2 «ок» на переводы по одному исполнителю)

## Outcome

- app/learning_v2_access_policy.ts: learningV2LessonRequiresPremium всегда false, журнал [V2-ACCESS] free=all; замок «Уроки 3+ в Plus»
  больше не срабатывает (ветка denied:plus в lessons.tsx остаётся мёртвой без вреда). Тест доступа — под решение.
- scripts/apply_shard_survey_translations.mjs: вход applicationDefault() вместо файла ключа; языки — все недостающие из черновика.

## Scope

In scope: app/learning_v2_access_policy.ts, tests/learning_v2_free_access_contract.test.ts, scripts/apply_shard_survey_translations.mjs,
черновик переводов опроса. Out of scope: прочий код Learning V2 (Codex), запись в прод без сводки сухого прогона.

## Architecture

No architecture change.

## Security and privacy

Файл ключа сервис-аккаунта не читается; вход — учётка gcloud владельца. Данные пользователей не меняются.

## Technical debt

- Подсказка «Уроки 3+ доступны в Plus» и ветка denied:plus в lessons.tsx — мёртвые, убрать после R1 вместе с решением о платности V2.

## Verification

learning_v2_free_access_contract; сухой прогон скрипта переводов (сводка координатору).

## Rollback

Откат коммита (лимит 2 урока вернётся).
