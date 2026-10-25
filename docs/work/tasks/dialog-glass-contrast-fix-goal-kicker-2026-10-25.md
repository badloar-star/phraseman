# Task packet: контраст «Исправить» и надзаголовка цели в диалогах (5 · ВХОД, по замеру 4 · ТЕМЫ)

Governance-ID: TG-62A2BCA3F729
Status: In progress
Owner: 5 · ВХОД И АККАУНТ (поручение координатора 25.10, данные — docs/work/cards-dialogs-contrast-2026-10-25.md от 4 · ТЕМЫ)

## Outcome

components/dialogs/glass/DialogueGlassSessionParts.tsx: (1) подпись кнопки «Исправить» (fixButtonText) — glass.secondary на
glass.buttonFill давала 2,67:1 (122 из 174 сочетаний тем, все светлые) → glass.text, как у replyActionText (мин. 5,73:1);
(2) надзаголовок цели (goalKicker) — glass.secondary на glassTone(text, 0.08) давал 4,08:1 в 7 светлых градиентных на «Максимуме»
→ glass.text (11,57:1). Только цвет текста, вёрстка и размеры прежние.

## Scope

Две строки цвета в одном файле. Только JS (обновление по воздуху).

## Architecture

Токен глубже по той же шкале темы (text вместо secondary) — как уже сделано у соседней кнопки ответа (replyActionText).

## Security and privacy

Нет.

## Technical debt

Иерархия: надзаголовок становится того же цвета, что текст цели; различие держится весом и размером (13/600 против текста цели).

## Verification

Разбор файла; тесты диалогов по месту; замеры контраста — документ ТЕМ.

## Rollback

git revert.
