# Task packet: тексты ошибок диалогов по макету u31 — подключение (5 · ВХОД)

Governance-ID: TG-B4A82F625D4E
Status: Done — 38 из 39 наборов (красный чужой dialogue_v2_plus_tools), типы чистые
Owner: 5 · ВХОД И АККАУНТ (решение координатора 24.10; строки — 10 · ПЕРЕВОДЧИК, dialog-session-errors-u31-copy-2026-10-24.md, cbe0a3f59)

## Outcome

Сбой хода в сценарном диалоге и «Свободном разговоре» показывает тексты макета u31: нет сети → C18 «Нет связи. Проверь интернет и
попробуй ещё раз.», сервис недоступен → C19 «Сервис диалогов временно недоступен. Сообщение не отправлено. Попробуй ещё раз.»,
устройство не распознаёт речь → C15 «Распознавание речи не работает на этом устройстве». Везде «Повторить».

## Scope

- app/dialogue_v2_session_coaching_labels.ts — networkError (новая), serviceError и voiceUnavailable — тексты u31 (ru…pl; fr/de прежние).
- app/dialogue_v2_session.tsx — причина network → networkError.
- app/dialogue_v2_freeform_client.ts, app/dialogue_v2_freeform.tsx — причина network (коды unavailable / deadline-exceeded)
  отдельно от сбоя сервиса; плашка берёт те же подписи.

## Architecture

Подписи — одна таблица dialogueV2SessionCoachingLabels для обоих экранов. Причина сбоя определяется кодом ошибки вызова.

## Security and privacy

Новых данных нет.

## Technical debt

fr/de для новых строк — у Переводчика (сейчас прежние строки / английский запасной).

## Verification

babel.parseSync, тесты диалогов, «ты»-сторож, срез типов.

## Rollback

git revert коммита.
