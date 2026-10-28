# Task packet: политика конфиденциальности — жалобы на контент и Cloudflare (озвучка)

Governance-ID: TG-E19B84D6F8EB
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Владелец кнопкой (через координатора 28.10): «внести оба абзаца».
1. Жалобы на контент («Пожаловаться»): что уходит — текст задания/реплики ИИ, ответ ученика, для диалога до 12 последних реплик (вкл. реплики
   ученика); хранение — `error_reports`, 30 дней, удаление вместе с аккаунтом. Источник абзаца: docs/work/report-flag-inventory-2026-10-28.md.
2. Cloudflare (озвучка Learning V2 через Cloudflare Worker): IP и токен входа, только для выдачи аудио, не храним, не для рекламы и
   аналитики, обработчик со ссылкой на его политику. Источник: docs/work/handover/codex-review-2026-10-28.md.

Факты сверены с кодом: `SUPPORT_REPORT_TTL_DAYS = 30` (functions/src/log_ttl.ts), `error_reports` в стирании аккаунта
(functions/src/account_delete.ts), `messages.slice(-12)` в DialogueV2SessionScreen / DialogueV2FreeformScreen.
Уточнение к абзацу Ревизора: R2/Cloudflare включается переменной сборки, которой может не быть в магазинной сборке, — «may be delivered»,
чтобы текст был верен в обоих случаях.

## Scope

- `legal/privacy_policy_en.json` и `legal/privacy_policy_en_ios.json`: §6 — абзац «Content reports»; §13 — абзац «Audio delivery
  (Cloudflare)»; §16 — строка Cloudflare в списке обработчиков; дата «Last updated: October 28, 2026».
- `npm run legal:sync` → app/legal/*.json, privacy.html, admin/oauth-privacy.html, admin/v2/oauth-privacy.html,
  knowly-www/legal/privacy/index.html, privacy-ios/index.html (все чистые на старте).
- Сторож хэшей `tests/legal_document_liquid_glass_source_contract.test.mjs` — перезакрепить.
- Других языков у политики нет (только EN) — Переводчик не нужен.

## Architecture

Нет изменений кода.

## Security and privacy

Политика приводится в соответствие с уже работающими сборами данных (жалобы) и обработчиком (Cloudflare).

## Technical debt

Выкладка сайта и oauth-страницы админки — кнопкой владельца (hosting:knowly-www, hosting:admin).

## Verification

legal:sync идемпотентен; тесты legal_* и сторож хэшей зелёные.

## Rollback

Откат коммита + legal:sync.
