# Task packet: community.html — победил packs-simple.html (04.10), вернуть версию daad65a97

Governance-ID: TG-AA006FBD3C36
Status: In progress
Owner: сессия «3 · Макеты» по решению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

Конфликт двух образцов владельца (community.html 29.09 против packs-simple.html 04.10, под замком) решён координатором в пользу более позднего и запертого: для вкладок и каталога код прав. `community.html` восстановлен в версии daad65a97, строки community-006/007/020/025 возвращены к разметке после daad65a97 с пометкой «код = packs-simple 04.10; владельцу подтвердить», журнал и COMMUNITY_CODE_GAP_R1.md отражают решение. Мера успеха: community.html равен blob из daad65a97; число строк реестра прежнее.

## Scope

In scope: docs/design/v2-app/community.html (восстановление), docs/phraseman-2.0/MOCKUPS_ALIGNED_TO_CODE_R1.md, docs/phraseman-2.0/COMMUNITY_CODE_GAP_R1.md (пометка решения), registries/visual_parity.json (строки community-006/007/020/025 по id).

Out of scope: код приложения; страницы под замком.

## Architecture

No architecture change: документация и образцы.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: конфликт двух образцов владельца зафиксирован, утром владелец подтверждает одним словом.

## Verification

`git hash-object docs/design/v2-app/community.html` равен `git rev-parse daad65a97:docs/design/v2-app/community.html`; число строк реестра прежнее.

## Rollback

Откат коммита.
