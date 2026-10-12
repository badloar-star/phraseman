# Task packet: копии «Тень» к образцам под замком + составные кадры cards-008/010/012

Governance-ID: TG-DFB28E054627
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md), SHADOW_STYLE_SPEC.md

## Outcome

Рядом с четырьмя образцами под замком владельца (mistakes-panel, cards-section, cards-gallery, packs-simple), нарисованными в старой подаче (кольцо, диагональ, кромки), лежат копии *.shadow.html: тот же состав, тексты, раскладка и номера телефонов, меняется только подача по SHADOW_STYLE_SPEC (плашки с тенью, без кольца и кромок). Начать с mistakes-panel, затем cards-section. Оригиналы и их lock.json не меняются. В блок A MOCKUPS_ALIGNED_TO_CODE_R1.md записано «копии «Тень» к образцам под замком — на утверждение». Плюс по составным кадрам cards-008/010/012 зарегистрирован кадр (время и хэш по файлу) и выставлены вердикты.

## Scope

In scope: docs/design/v2-app/shadow-skin.css (новый), mistakes-panel.shadow.html, cards-section.shadow.html (и по возможности cards-gallery.shadow.html, packs-simple.shadow.html) — новые файлы; docs/phraseman-2.0/MOCKUPS_ALIGNED_TO_CODE_R1.md; registries/visual_parity.json (cards-008/010/012 по id).

Out of scope: изменение оригиналов под замком и *.lock.json; код приложения.

## Architecture

No architecture change: макеты и документация. Копия = оригинал + подключённый стиль-слой shadow-skin.css (переопределяет только фон, тень и обводки контейнеров).

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: после утверждения владельцем привязки строк переедут на копии; до этого оригиналы остаются эталоном состава.

## Verification

Копии открываются в браузере и визуально без колец и кромок; число телефонов и тексты те же; sha оригиналов совпадает с lock.json; число строк реестра прежнее.

## Rollback

Удалить новые файлы / откат коммита.
