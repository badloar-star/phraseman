# Task packet: скорость Карточек — журнал [CARDS-PERF] и аудит списков (Сохранённые 64+, каталог, хаб, галерея)

Governance-ID: TG-94BBD5F2C379
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10), правило владельца «оптимизация всегда»
Related epic/enabler: docs/phraseman-2.0/R1_CARDS_OPTIMISTIC_UI.md, раздел «скорость»

## Outcome

1. Dev-журнал `[CARDS-PERF]`: перерисовки плиток галереи и строк каталога за прокрутку, число шагов окна, время до первого кадра списка.
2. Аудит по коду: виртуализация, memo, стабильные колбэки, размеры превью, лишние setState в прокрутке; дешёвое — правка отдельным коммитом, дорогое — строкой в R1_CARDS_OPTIMISTIC_UI.md.

## Scope

In scope: components/cards-grid/cardsPerfLog.ts (новый), CardsGallery.tsx, app/flashcards/CollectionGalleryView.tsx, FlashcardsCategoryHub.tsx (только счётчики), тест, документ.
Out of scope: смена раскладки, картинок и визуала.

## Architecture

No architecture change: счётчики только в dev, в сторе пустышки.

## Security and privacy

Данных не касается: журнал печатает числа и id набора.

## Technical debt

Pay now: нет замеров скорости списков.

## Verification

Тест-сторож по исходникам, срез типов, замер на эмуляторе по чистому гостю (скролл «Сохранённые» 64+).

## Rollback

Откат коммитов.
