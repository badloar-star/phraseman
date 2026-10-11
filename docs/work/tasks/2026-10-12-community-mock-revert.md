# Task packet: вернуть community.html (приказ владельца 29.09 «1 в 1») и описать расхождения кода

Governance-ID: TG-DA18B12D674E
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

Образец `community.html` возвращён к состоянию до daad65a97 (владелец 29.09 прямо сказал «1 в 1 по community.html» — код должен догонять образец, а не наоборот). Строки реестра community-006/007/020/025 и packs-simple-001 помечены дефектом кода; расхождения кода с образцом перечислены в COMMUNITY_CODE_GAP_R1.md для Дизайна; журнал MOCKUPS_ALIGNED_TO_CODE_R1.md помечает возврат. Мера успеха: образец community.html побайтно равен daad65a97^, число строк реестра прежнее.

## Scope

In scope: docs/design/v2-app/community.html (откат), docs/phraseman-2.0/COMMUNITY_CODE_GAP_R1.md (новый), docs/phraseman-2.0/MOCKUPS_ALIGNED_TO_CODE_R1.md (пометка), registries/visual_parity.json (строки по id).

Out of scope: код приложения (правит Дизайн); страницы под замком владельца.

## Architecture

No architecture change: документация и образцы.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: расхождения код ≠ утверждённый образец записаны списком для Дизайна.

## Verification

`git diff daad65a97^ -- docs/design/v2-app/community.html` пуст после отката; число строк реестра прежнее; страница открывается в браузере.

## Rollback

Откат коммита.
