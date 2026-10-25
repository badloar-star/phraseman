# Task packet: прототип экзамена v2 — 8 размеров текста по храповику D145

Governance-ID: TG-E9C70B2ACE98
Status: In progress
Owner: 3 · МАКЕТЫ (просьба Learning V2, коммит экрана 759b1b0b6)

## Outcome

В экране экзамена v2 по храповику D145 сменились 8 размеров текста (межстрочные прежние). Прототип должен совпасть с кодом,
иначе склейка Сверки расходится: .hint 12,5→13, .alt 14→13, .tp .r 14→13, .link 15→16, .mist .p 15→16, .mist .y 15→16,
.mist .c 17→16, .epr .n 15→16.

## Scope

In scope: docs/design/v2-app/chapter-exam-v2-prototype.html (+ артефакт PYJfpbH1Upz9KCLngxVyG9), этот пакет.
Out of scope: код экрана экзамена, банк заданий, межстрочные.

## Architecture

No architecture change. Меняются только 8 значений font-size в шаблоне прототипа; сборка build_exam_proto.cjs прежняя.

## Security and privacy

Макет, данных нет.

## Technical debt

- None known — значения взяты из коммита экрана, других расхождений не заявлено.

## Verification

Grep по собранной странице: 8 селекторов с новыми размерами, межстрочные без изменений; страница открывается без ошибок консоли.

## Rollback

Вернуть прежнюю страницу из git — приложение не меняется.
