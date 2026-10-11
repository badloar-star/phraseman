# Стиль «Тень» (контейнеры без обводок): токены тени, блика и приподнятого по 23 темам

Governance-ID: TG-7FA1E6D6DE55
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (решение владельца 12.10, вариант 2 «Тень»; спека `docs/design/v2-app/SHADOW_STYLE_SPEC.md`, эталон `shadow-style-etalon.html`)
Related epic/enabler: non-text-tokens-icon-track-2026-10-12.md; слой kit правит Дизайн (`KitSurface`/`Sheen`)

## Outcome

Токены стиля «Тень» в `constants/liquidGlassSurfaceRoles.ts` для всех 23 тем × тёмное/светлое × calm/accent/max × шаги ползунка: градиент плашки, градиент выбранного/приподнятого, цвета теней (плашка, вложенное, приподнятое, мягкий второй слой), тон разделителя. Модуль-помощник `constants/liquidGlassShadowStyle.ts` отдаёт готовые массивы `boxShadow` по таблице спеки и сдвиг приподнятого. Тест: числа спеки в обоих оформлениях, тоновое отличие плашки от фона без обводки (на каждой теме), согласованность с ползунком.

## Scope

In scope: токены, помощник, тест, запись в INBOX, хэши Дизайну и координатору. Out of scope: правка `KitSurface`/`Sheen`/экранов (Дизайн), обновление сторожей обводок (`borderless_surface_*`, ledger) — отдельным шагом после решения Дизайна по слою kit.

## Architecture

Токены выводятся из готовых полей темы (`bg`, `opaqueCard`, `opaqueControl`, `text`, `shadowTint`, `isLight`) в `deriveLiquidGlassSurfaceRoles`; существующие токены не меняются. Цвет светлой тени — спековый `rgba(40,40,80)`, подмешанный к тону темы через `shadowTint` (в тёмном — чёрный). Цветная тень кнопки действия — `actionShadow(g)` от `g.accent`.

## Security and privacy

Не применимо.

## Technical debt

Тень дороже по отрисовке на слабых Android (оговорка спеки) — замер за Дизайном; тоновое отличие плашки от фона у светлых тем с низким запасом компенсируется тенью.

## Verification

Новый тест по слоту светофора; соседние наборы тем (`theme_surface_roles`, палитра, контраст).

## Rollback

`git revert` коммита.
