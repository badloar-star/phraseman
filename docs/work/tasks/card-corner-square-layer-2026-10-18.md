# Task packet: острые углы за скруглёнными плашками

Governance-ID: TG-27953722BBEE
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: владелец через координатора 18.10 — «на всех плашках слева сверху и справа снизу торчит острый угол — убрать отовсюду»

## Outcome

За скруглёнными плашками нет квадратных слоёв: углы плашек чистые во всех местах, где лежит цветная дымка темы (ThemeGlassSmoke) и блик карточки Друзей; тени контейнеров не обрезаны.

## Scope

In scope: components/v2/ThemeGlassSmoke.tsx (проп radius, обрезка только своей обёртки), вызовы в components/settings/SettingsGlassRows.tsx, components/friends/FriendsGlassKit.tsx, app/settings_themes.tsx, components/lessons/LessonMenuGlass.tsx; блик FriendsCard.

Out of scope: цвета дымки и плашек, тени, вёрстка.

## Architecture

No architecture change: слой дымки сам скругляет и обрезает себя (обёртка absoluteFill с borderRadius + overflow hidden); контейнер по-прежнему без overflow, тень не режется.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Pay now: слой без радиуса полагался на обрезку контейнера, которой нет со времён стиля «Тень» (12.10).

## Verification

Журнал [CARD-CORNER]; снимки углов в увеличении до/после на эмуляторе (замок emu_lock.sh); точечные тесты.

## Rollback

`git revert`.
