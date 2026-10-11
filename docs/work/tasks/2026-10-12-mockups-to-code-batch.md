# Task packet: образцы приведены к коду — фон Шпиля, Диалоги, Карточки

Governance-ID: TG-85F9F6646D3B
Governance-ID: TG-D9D39B4BF999
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

Образцы Шпиля (spire.html, spire-gaps-states.html) берут фон по токенам темы «Затмение» (graphite: bg #0C0D10, bgTop #181A1F) вместо #0C0C0D / #151516. Образцы Диалогов и Карточек приведены к коду по спискам предсверки Дизайна (dialogs: 6 строк «править МАКЕТ», 901030898; Карточки: CARDS_PENDING_PRECHECK_R1.md, cdb8b264d). Мера успеха: перечисленные строки реестра сверяются без устаревших отличий, число строк реестра прежнее.

## Scope

In scope: docs/design/v2-app/spire.html, spire-gaps-states.html, dialogs.html, cards-states.html, cards-v2.html (не cards-section.html), community.html (вкладки «Шпиль · Друзья · Наборы», каталог наборов, «Друзья» — по R1_CODE_DEFECTS_FROM_PARITY.md, ab83fa6db), registries/visual_parity.json (привязки, вердикты и классы остатка diffs по id).

Out of scope: код приложения; страницы под замком владельца (cards-section, cards-gallery, mistakes-panel, packs-simple lock-файлы).

## Architecture

No architecture change: образцы и реестр — документация/макеты.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: образец следует коду; расхождения-дефекты кода идут координатору.

## Verification

Правки образцов смотрятся в браузере; реестр правится по id через reg_edit.sh под замком, число строк не уменьшается.

## Rollback

Откат коммита образцов/реестра.
