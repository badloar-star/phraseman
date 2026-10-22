# Task packet: названия 112 эпизодов уроков 4–5 на 8 языков (Переводчик, координатор 22.10)

Governance-ID: TG-5857A0F9E53D
Status: Done — c3b013506 (112 × 8, проверка скриптом пройдена)
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Источник — `docs/work/tasks/episode-names-l04.json`, `episode-names-l05.json` и секции уроков 4–5 в `episode-names-rule.md`
(90b0b6935). Переводы uk, en, es, pt-BR, vi, id, tr, pl тем же правилом, что уроки 1–3 и 6: ≤ 2 слов (предлоги считаются),
крючок деталью сюжета, не дословно, без грамматики, без повторов в уроке; en не содержит слов из английских ответов своего
эпизода (`content/learning-v2-course/release/en/l0{4,5}/sNN/answers.json`, только чтение). Добавляются в
`modules/learning-v2/titles/session_titles_i18n_v1.ts` ключами «4.N», «5.N».

## Scope

In scope: 112 строк модуля переводов. Out of scope: русские названия (применяет Learning V2), подключение.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Названия — черновик автора; если владелец поменяет, переведу изменённые строки.
- Не проверено носителями.

## Verification

Скрипт проверки: 112 × 8, ≤ 2 слов, ≤ 20 знаков, кириллица только в uk, без повторов в уроке, en без слов ответа;
`babel.parseSync` модуля.

## Rollback

`git revert <коммит>`.
