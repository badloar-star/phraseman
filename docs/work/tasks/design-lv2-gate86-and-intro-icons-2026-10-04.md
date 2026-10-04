# Task packet: сторож карты LV2 (строки 86–95) + вступительные экраны по макету

Governance-ID: TG-25D1043FA086
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2, LANES.md)
Related epic/enabler: гейт «приложение = макет», очередь координатора 04.10

## Outcome

1) Сторож `tests/learning_v2_legacy_lessons_entry_2026_09_12_gate.ts` проходит и сторожит реальный контракт карты
«Главы» (LearningV2ChaptersCourse), а не удалённой карты LearningV2PulseCourse (0855385c2).
2) Вступительные экраны разделов показывают то, что на макете (картинка или значок); где макета нет — вопрос координатору.

## Scope

In scope: строки 86–95 сторожа; `app/feature_intro_assets.ts` и экран вступления — только после сверки с макетом.
Out of scope: Карточки, Мои ошибки, Темы, макеты docs/design/v2-app, сервер, логика показа вступлений.

## Architecture

No architecture change: правка утверждений теста и (позже) источника картинки вступления.

## Security and privacy

Не затрагивает данные, авторизацию и сторонние сервисы.

## Technical debt

- Pay now: сторож больше не ссылается на удалённую карту.

## Verification

`npx tsx tests/learning_v2_legacy_lessons_entry_2026_09_12_gate.ts` → PASS; коммит через временный индекс,
сразу после коммита `git log -1 --format=%s` и `git show --name-only HEAD`.

## Rollback

`git revert` коммита; данные не затрагиваются.
