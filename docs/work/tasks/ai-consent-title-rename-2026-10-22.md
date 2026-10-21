# Task packet: заголовок экрана отключённых разговоров с ИИ — «Включите разговоры с ИИ»

Governance-ID: TG-BDA5B98EA684
Status: Готово
Owner: 5 · ВХОД И АККАУНТ (очередь координатора, ночь 21.10; переводы — 10 · ПЕРЕВОДЧИК)

## Outcome

Решение владельца 21.10: заголовок экрана «AI-диалоги выключены» заменён на «Включите разговоры с ИИ» (ru дословно)
и 8 переводов из docs/work/tasks/ai-consent-title-9-lang-2026-10-21.md.

## Scope

- app/ai_dialog_consent_gate.tsx: только строка заголовка declinedScreen. Тело экрана и подпись кнопки не тронуты
  (тело закреплено tests/ai_dialog_consent_recovery_contract.test.ts).

## Architecture

Только текст, логика и согласие не меняются.

## Security and privacy

Данные не затрагиваются.

## Technical debt

- ru на «вы», остальной экран на «ты» — вариант «Включи разговоры с ИИ» на решение владельца.
- Тело и подпись кнопки для диктора говорят «диалоги»; макеты docs/design/v2-app/dialogs.html:416 и
  dialogs-gaps-states.html:396 — зона 3 · МАКЕТЫ.
- Переводы не проверены носителями.

## Verification

babel.parseSync файла; тест ai_dialog_consent_recovery_contract через светофор.

## Rollback

`git revert <hash>`.
