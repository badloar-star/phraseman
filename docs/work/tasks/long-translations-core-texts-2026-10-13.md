# Task packet: длинные переводы (R1_LONG_TRANSLATIONS, отчёт Сверки №5) — тексты Ядра; paywalls-009/010 — условие показа

Governance-ID: TG-9A2423A1E18C
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 ~13:05; docs/phraseman-2.0/R1_LONG_TRANSLATIONS_2026-10-13.md

## Outcome

- «Добить: Ещё учу (N)» (app/lesson_complete.tsx, app/dialogue_v2_completion.tsx): короче pt-BR/pl/id/tr — не длиннее en
  («Finalizar: Aprendendo», «Dokończ: Uczę się», «Tuntaskan: Belajar», «Bitir: Öğreniyorum»).
- Бейдж «Опрос» в «Новостях» (components/AppMessagesInbox.tsx): id «Jajak pendapat» → «Survei» (как в остальных строках опроса).
- «Активность отмечена» (components/profile-card/usePlayerProfileSocial.ts): в общую таблицу PC + PC_MORE — все 9 языков
  (раньше pt-BR/vi/id/tr/pl падали на английский).
- paywalls-009/010: кадр робота 07:47 снят ДО db61aa3e4 (09:36) — переснять той же ссылкой; условия и строка журнала — Сверке.

## Scope

In scope: тексты в 4 файлах + PC_MORE. Out of scope: вёрстка кнопок.

## Architecture

No architecture change.

## Security and privacy

Нет.

## Technical debt

- Переводы машинные (носителем не вычитаны), как и остальные строки дня.

## Verification

Точечные тесты строк (i18n-сторожа), babel-проверка.

## Rollback

Откат коммита.
