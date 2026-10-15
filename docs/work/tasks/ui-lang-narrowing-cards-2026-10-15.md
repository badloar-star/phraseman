# Task packet: интерфейс Карточек и каталога сообщества получает урезанный язык (ru/uk/es) — передать язык интерфейса (R07, #9/#9b)

Governance-ID: TG-ED2FA9A3A37C
Status: In progress
Owner: сессия «Специалист по переводам» (координатор 15.10, аудит docs/work/tasks/button-audit-cards-video-2026-10-15.md #9, #9b)
Related epic/enabler: R07 — все языки должны быть доступны

## Outcome

Человек с интерфейсом en/pt-BR/vi/id/tr/pl видит в «Сохранённом» («Удалено · Вернуть», «К списку», подписи, пустое состояние) и в каталоге
сообщества («Нет сети», «Повторить», «Ничего не нашли», «Продолжить создание набора», жалоба на набор) свой язык, а не русский.
Плюс список всех мест в приложении, где язык интерфейса сводится к ru/uk/es.

## Scope

In scope: `app/flashcards_packs.tsx` (`hubCategoryLang` → язык интерфейса), `app/flashcards/CollectionListView.tsx` и
`app/flashcards/CollectionDeckView.tsx` (тип пропа `lang` → `Lang`; содержимое карточек по-прежнему по `cardContentLang`),
`app/flashcards_collection.tsx` (только `lang=` у списка, колоды, пустого состояния и плашек отмены — своими ханками, файл изменён чужой работой).
Out of scope: `CollectionGalleryView.tsx` — его `lang` идёт и в содержимое карточек, и файл правится другой сессией (в список координатору).

## Architecture

Разделение уже есть: `strLang` (интерфейс) и `cardContentLang` (язык перевода карточек). Правка — передавать `strLang` туда, где `lang`
используется только для подписей; компоненты и так содержат тексты на 9 языках (`triLang`).

## Security and privacy

Не применимо.

## Technical debt

- `CollectionGalleryView` смешивает язык интерфейса и язык содержимого в одном пропе — Contain: в список координатору, владелец — Дизайн/Карточки;
  выход — отдельный проп `cardContentLang`, как у списка и колоды.

## Verification

Тесты карточек/каталога и сторожа i18n через slot.sh; numstat при коммите — только свои строки (патч для flashcards_collection.tsx).

## Rollback

`git revert` коммита.
