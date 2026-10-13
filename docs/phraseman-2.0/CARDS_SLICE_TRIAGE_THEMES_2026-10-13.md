# Срез Карточек (Темы) — разбор по коду 13.10

Governance-ID: TG-9183D61B2C88

Исходные данные: PARITY_R1_SLICES_2026-10-13.md, раздел «Макеты + Темы» — 51 расхождение. Разбор по реестру visual_parity.json (без кадров, правило Ядра).

## кадр на uk — пересъёмка на ru (Сверка) — 8
cards-018, cards-019, cards-022, cards-054, cards-066, cards-section-029, cards-v2-051, cards-v2-052

## не то состояние / нужен шаг или подмена в ссылке (Темы+Авторизация, часть сделана 86e845aee) — 31
cards-022, cards-053, cards-054, cards-057, cards-058, cards-059, cards-064, cards-065, cards-066, cards-071, cards-079, cards-gap-024, cards-gap-038, cards-gap-040, cards-section-013, cards-section-014, cards-section-016, cards-section-021, cards-section-029, cards-section-039, cards-section-052, cards-v2-006, cards-v2-010, cards-v2-035, cards-v2-036, cards-v2-040, cards-v2-046, cards-v2-049, community-011, community-018, community-019

## образец≠код — «образец к коду» (Макеты) — 16
cards-035, cards-076, cards-gap-011, cards-gap-027, cards-gap-028, cards-gap-032, cards-gap-033, cards-gap-036, cards-gap-039, cards-section-038, cards-section-046, cards-v2-016, cards-v2-037, community-011, community-018, community-019

## данные фикстуры другие — не дефект кода — 14
cards-065, cards-076, cards-079, cards-gap-023, cards-gap-040, cards-section-038, cards-section-046, cards-section-052, cards-v2-006, cards-v2-035, cards-v2-036, cards-v2-037, cards-v2-040, cards-v2-049

## вёрстка (проверено) — 5
cards-gap-023, cards-gap-024, cards-section-013, cards-section-014, cards-v2-016

## клавиатура ОС на кадре — hidekb — 5
cards-022, cards-046, cards-064, cards-section-052, cards-v2-040

## без пометок — 1
cards-v2-032

## Дефекты КОДА, найденные и исправленные

- Пилюля лимита «осталось/лимит» → «использовано/лимит» (D174, cards-section-056) — три места, коммит «fix(cards): пилюля лимита…».
- Кнопка «В моих наборах» переносилась на две строки (cards-section-014, cards-v2-016) — flex 1.25 против «Тренировать», коммит «fix(cards): кнопка «В моих наборах» шире…».
- «1 колонка вместо 2» (cards-018/019, section-014/038, v2-006/010…): масштаб переживает перезапуск; cards=demo/custom50/demo_published/notranslation уже сбрасывают его (resetCardsViewPrefs, Макеты e68b81502) — кадры старше правки, нужна пересъёмка.

## Ждёт данных (сперва логи)

- cards-gap-023/024: меню фильтра «поднято на уровень шапки» — в FlashcardsFilterDropdown `top: 56` без insets; уже стоит лог [FILTER-MENU] (y меню в окне, insets.top). Правку делать по строке лога со свежего кадра (если y < insets.top + высота шапки → top: insets.top + 56, как у меню действий CollectionHeader).
- cards-053/057/058/059/054: нужна подмена «чужой набор + отклики» (+ меню у своего комментария) — запрос Ядру; 058/059 — только подмена результата отправки (запись в прод без «да» владельца не снимать).
