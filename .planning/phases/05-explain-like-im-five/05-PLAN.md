---
phase: 05-explain-like-im-five
plan: 05
type: execute
wave: 4
depends_on: [02, 03, 04]
files_modified:
  - functions/src/explain/README.md
  - .planning/phases/05-explain-like-im-five/DEPLOY.md
autonomous: false
requirements: [EXPLAIN-DEPLOY]

must_haves:
  truths:
    - "firestore.rules deployed (firebase deploy --only firestore:rules) BEFORE the CF goes live, so the read-only cache rule is in effect when clients first read"
    - "explainPhrase and submitExplainReport deployed POINT-TO-POINT (firebase deploy --only functions:explainPhrase,functions:submitExplainReport) — NEVER via a blanket deploy, and confirmed absent from any deploy:safe whitelist"
    - "OPENAI_API_KEY secret confirmed available to the new functions (same secret as premiumDialogSend, no new secret created)"
    - "App Check verified working end-to-end against the deployed CF, with a CONCRETE procedure in DEPLOY.md: a call WITHOUT a valid App Check token (e.g. a raw curl to the callable endpoint, or the Firebase console test) returns the unauthenticated/app-check rejection, while the real app (App Check initialized) succeeds. Document the exact check so a human can reproduce it, not just assert it."
    - "A short DEPLOY.md records the exact deploy commands, the rollout flag (EXPO_PUBLIC_EXPLAIN_ENABLED), and the rollback (flag OFF + optionally undeploy)"
    - "functions/src/explain/README.md documents the module as the seed of a future ai_content platform: how to add a new content type later (prompt + validator + fallback), what is reusable (gates/cache/budget/judge)"
  artifacts:
    - path: ".planning/phases/05-explain-like-im-five/DEPLOY.md"
      provides: "Deploy runbook: rules-first, point-to-point functions, App Check check, rollout flag, rollback"
    - path: "functions/src/explain/README.md"
      provides: "Module doc + B-platform extension guide"
  key_links:
    - from: ".planning/phases/05-explain-like-im-five/DEPLOY.md"
      to: "functions:explainPhrase, functions:submitExplainReport"
      via: "documented point-to-point deploy commands outside deploy:safe"
      pattern: "deploy --only functions:explainPhrase"
---

<objective>
Безопасно выкатить фичу и задокументировать. Правила Firestore — ПЕРВЫМИ (чтобы read-only
кэш действовал до того, как клиенты начнут читать), функции — точечным деплоем (вне deploy:safe),
проверить App Check на проде, зафиксировать rollout-флаг и rollback.

Purpose: соблюсти инвариант деплоя phraseman (CF вне deploy:safe → только point-to-point) —
у проекта уже был баг, когда функция вне whitelist не доехала. И оставить README-мост к
будущей платформе ai_content.
</objective>

<context>
Этот план `autonomous: false` — деплой на прод требует подтверждения человека.

Порядок строгий:
1. `firebase deploy --only firestore:rules` — правила раньше функций.
2. Подтвердить секрет: функции видят OPENAI_API_KEY (тот же, что premiumDialogSend).
3. `firebase deploy --only functions:explainPhrase,functions:submitExplainReport` — точечно.
   НИКАКОГО `firebase deploy --only functions` (снесёт/тронет лишнее) и не полагаться на
   deploy:safe (эти функции туда НЕ входят намеренно).
   ФУТ-ГАН: эталон репорта `submitClientReport` ЕСТЬ в deploy:safe (package.json), но наш
   `submitExplainReport` туда добавлять НЕ надо — он деплоится этой точечной командой. Не
   копировать whitelist-членство вместе с паттерном. Обе наши функции — строго point-to-point.
4. Проверить App Check на проде: запрос без валидного токена → отклонён.
5. Rollout: фича остаётся за `EXPO_PUBLIC_EXPLAIN_ENABLED` (дефолт OFF). Включать когортно.
6. Rollback: флаг OFF (мгновенно скрывает фичу у клиентов); при необходимости — undeploy функций.

README модуля (functions/src/explain/README.md) — «задел под B»: явно описать, что
gates/cache/budget/judge переиспользуемы, и как добавить новый contentType (промпт + валидатор
+ fallback) при переезде в ai_content. Это мост к идеям #1 (авто-фраза дня), #11, #12.
</context>

<acceptance>
- Правила задеплоены и активны (проверка в консоли Firebase / эмуляторе перед прод-деплоем).
- Обе функции задеплоены точечно; в логах Firebase видны explainPhrase + submitExplainReport.
- Запрос без App Check токена отклоняется (проверка).
- DEPLOY.md и README.md созданы и точны.
- Подтверждено: функции НЕ в deploy:safe (grep по конфигу/скрипту деплоя, если есть).
</acceptance>

<verification>
1. После rules-deploy — клиентская запись в phrase_explanations на проде отклоняется.
2. Первый реальный тап на проде (флаг ON для тест-аккаунта) → генерация → ready; второй
   аккаунт → мгновенный кэш-хит.
3. Проверить billing-доки на проде: расход ровно 2 вызова на новую фразу.
4. Глобальный бюджет: убедиться, что счётчик explain_global_budget/{date} растёт и при достижении
   потолка новые промахи отдают fallback (можно временно занизить cap на стейдже).
5. Rollback-проба: выключить флаг → кнопка исчезает у клиента без передеплоя функций.
</verification>
