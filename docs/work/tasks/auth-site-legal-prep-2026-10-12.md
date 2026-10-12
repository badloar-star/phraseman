# Task packet: сайт knowly-www к одной выкладке владельцем — страница удаления, сверка политики/условий, блок выкладки

Governance-ID: TG-C69998FF3440
Status: Done (выкладка — владелец, блок Г)
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10; сайт НЕ выкладывать — только подготовить)
Related epic/enabler: выпуск в сторы 17.10; STORE_PRIVACY_FORMS_R1.md §3, §4.2, §4.8

## Outcome

Владелец одной командой выкладывает сайт, и после этого опубликованные страницы совпадают с политикой и кодом: страница удаления
(knowly-www/legal/data-deletion) говорит про 14 дней на восстановление для входа через Google/Apple и про гостя (восстановления нет,
серверные данные — не позднее конца 14 дней) ровно как политика §20 и код (ACCOUNT_DELETE_GRACE_MS = 14 дней); privacy и terms в
knowly-www совпадают с legal/ (October 12, 2026); в DEPLOY_MORNING_2026-10-13.md — блок «Г: сайт» с командой выкладки и проверкой.

## Scope

In scope: knowly-www/legal/data-deletion/index.html (если страница собирается скриптом — правка источника и пересборка),
сверка knowly-www/legal/privacy, privacy-ios, terms с legal/*.json; docs/phraseman-2.0/DEPLOY_MORNING_2026-10-13.md — блок Г.

Out of scope: выкладка (firebase deploy) — владелец; правка текста политики.

## Architecture

No architecture change: статические страницы сайта и документ.

## Security and privacy

Текст страницы удаления приводится в соответствие с политикой — без новых обещаний; персональных данных нет.

## Technical debt

- Pay now: расхождение страницы удаления с §20.

## Verification

Сравнение текста страницы с §20; сверка дат и содержимого privacy/terms; команда выкладки — по .firebaserc/firebase.json.

## Rollback

`git revert`; на опубликованный сайт не влияет до выкладки.
