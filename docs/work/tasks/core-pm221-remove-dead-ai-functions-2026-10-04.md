# Task packet: PM-221-A1 — удалить мёртвые statsInsightsGenerate и weeklyReviewGenerate

Governance-ID: TG-94EA8E61CB15
Governance-ID: TG-94EA8E61CB15
Status: Done — решение координатора 04.10 (техника)
Owner: Ядро

## Outcome
Функции без экспорта в functions/src/index.ts и без вызова из клиента (PM-221: needs-owner-decision). Решение координатора — удалить код (история в git остаётся). После удаления карта PM-221 не имеет функций «на решение», A1 закрыт.

## Scope
- Удалить: functions/src/stats_insights.ts, functions/src/weekly_review.ts и их тесты (stats_insights.test.ts, weekly_review.test.ts, weekly_review_prompt_security.test.ts, weekly_review_transactions.test.ts).
- Поправить наши сторожа, которые читают эти файлы: functions/src/premium_access_callsites.test.ts, functions/src/pm229_server_silent_catch.test.ts (база немых catch).
- Пересобрать карту PM-221 и отметить A1 в карточке.
Не трогаю: значения 'weekly_review'/'stats_insights' в типе фич ИИ и ключи конфигов (их могут читать админка и конфиг OpenAI-джобов — безвредны); scripts/gustav_* (зона Codex) — сообщаю координатору.

## Architecture
Ничего не деплоится и не выкладывается; в облаке этих функций не было в коде экспорта.

## Security and privacy
Удаление кода ИИ-функций, которые не вызывались; данных не касается.

## Technical debt
Ручной сторож Codex scripts/gustav_brain_gate.mjs (AI-GATE-003 и проверка stats_insights) после удаления сообщит «missing source file» — снять эти проверки в зоне Codex.

## Verification
tsc functions; тесты functions по затронутым сторожам; генератор и probe PM-221.

## Rollback
git revert коммита (файлы вернутся из истории).
