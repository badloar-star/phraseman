# Task packet: находки EN-прохода в моей зоне и хвосты по «Правде/лжи» (12.10)

Governance-ID: TG-06937154C8DD
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (английский интерфейс входит в R1, п.76) и по материалам Сверки (EN_PASS_FINDINGS_2026-10-12.md)
Related epic/enabler: docs/phraseman-2.0/EN_READINESS_R1.md, коммит с починкой «Правды/лжи» у Plus

## Outcome

1. Русский текст при uiLang=en: кнопка «Тренировать» (cards-007/010), заголовок редактора «Новая карточка» (cards-021), карточка «Важное от Phraseman» (settings-gap-002) — привести к 9 языкам.
2. Ссылки EN-прохода по Диалогам: шаги по тексту на en не срабатывают (хаб «Dialogues» вместо нужного состояния) — заменить на #testID.
3. Тест Блица (flashcards_blitz_access_behavior) снова зелёный: мок dev_cards_state (тянул app/config и Platform.OS).

## Scope

In scope: app/flashcards/CollectionGalleryView.tsx (подпись), редактор карточки, строка «Важное от Phraseman» (если её текст не из сида), scripts/dev_links_en_pass.py, тесты.
Out of scope: серверные тексты, контент диалогов.

## Architecture

No architecture change: подписи через существующие словари языков; тест — мок модуля.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: английский интерфейс не должен показывать русские подписи.

## Verification

Тест-сторож по исходникам, соседние тесты, срез типов, повторный EN-проход — за Сверкой.

## Rollback

Откат коммитов.
