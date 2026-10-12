# Task packet: ответы для форм приватности сторов (Play Data safety, App Store Privacy) к выпуску 17.10

Governance-ID: TG-37C79298C06D
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10; только документы, без публикаций)
Related epic/enabler: выпуск R1 в сторы 17.10; основа — docs/phraseman-2.0/evidence/E24_store_declarations_2026-10-01.md

## Outcome

Владелец заполняет Google Play Data safety и App Store Privacy Nutrition Labels по готовому документу
`docs/phraseman-2.0/STORE_PRIVACY_FORMS_R1.md`: типы данных, обязательно/необязательно, цель, связь с пользователем, шифрование,
удаление, третьи стороны — сверено с КОДОМ (что реально уходит в сеть), а не только с текстом политики. Плюс URL удаления аккаунта
и список расхождений «форма ↔ политика ↔ код» с решением, за кем правка.

## Scope

In scope: один документ в docs/phraseman-2.0. Чтение кода (package.json, app.json, клиентские вызовы, functions/src), политики
(legal/), страницы удаления (knowly-www и опубликованная).

Out of scope: публикация форм в консолях, правка политики/сайта (владелец), правка кода.

## Architecture

No architecture change: документ.

## Security and privacy

Документ о раскрытии данных. Персональных данных пользователей не содержит.

## Technical debt

- Contain: расхождения — списком с владельцем правки.

## Verification

Каждая строка формы — со ссылкой на файл кода или раздел политики; непроверенное на устройстве помечено.

## Rollback

Документ; удалить или исправить коммитом.
