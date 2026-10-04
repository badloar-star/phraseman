# Task packet: первые ассеты 2.0 на Главной (assets/images/v2art/{dark,light})

Governance-ID: TG-D3C2F85C7735
Governance-ID: TG-0481C5FDEF7A
Status: In progress
Owner: сессия «2 · Дизайн»; приказ владельца через координатора 04.10 «первые ассеты готовы, вшивай»
Related epic/enabler: ТЕМЫ 2.0, ASSETS_V2_PROMPTS.md

## Outcome

Плитки «Уроки», «Диалоги», «Карточки», карточка «Продолжить обучение» / «Мои ошибки» и «Фраза дня» показывают
новые предметы 2.0: светлые темы — light, тёмные и градиентные — dark. Вёрстка Главной прежняя.

## Scope

In scope: `app/(tabs)/home.tsx` (источники картинок), `components/home/v2/HomeV2ContinueCard.tsx` (подгонка
широкой картинки внутри прежнего блока), `components/DailyPhraseCard.tsx` (источник картинки).
Out of scope: «Сегодня» — у блока сейчас нет картинки, добавить = менять вёрстку (ждёт макета/координатора);
реестр и генератор ассетов (сессия 4); удаление старых ассетов.

## Architecture

No architecture change: источники берутся из реестра `resolveThemedArt` (кэш по имени и яркости).

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: `app/theme/themed_art_assets.generated.ts` с новыми файлами пока не закоммичен сессией 4 —
  до её коммита реестр отдаёт прежние картинки этих мест (запасные).

## Verification

typecheck, сторожа home/daily phrase/layout_stability; съёмка Главной сессией 6.

## Rollback

`git revert` коммита.
