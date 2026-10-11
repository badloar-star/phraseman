# PanelDock: временный лог [DOCK] для диагностики просвечивающей подложки

Governance-ID: TG-3E03FCA411B0
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (решение координатора 18:30, журнал 27; порядок: PanelDock → 34 → 37 → 35)
Related epic/enabler: OWNER_REQUESTS_LEDGER.md строка 27; panel-dock-solid-2026-10-11.md

## Outcome

Подробный лог `[DOCK]` в `PanelDock` (`components/mistakes-panel/PanelKit.tsx`): id темы, уровень, оформление, `bg`/`bgTop`/`bgBottom`, цвета и позиции градиента, раскладка (`onLayout`), положение в окне (`measureInWindow`), размер окна, safe-area. По цифрам — решение, как сделать подложку под кнопкой сплошной (`g.bg` или `g.bgBottom`) на всю высоту панели с safe-area.

## Scope

In scope: `PanelKit.tsx` (только `PanelDock`), запись в INBOX. Out of scope: экраны-потребители (`TrainingSetupV2`, `CollectionGalleryView`, `MyPacksV2`, `VideoSetView`, `mistakes_*`).

## Architecture

Лог пишет через `DebugLogger` (переживает перезапуск) один ряд на изменение раскладки; временная часть (подробности цветов) убирается после починки, ранние выходы и ошибки остаются.

## Security and privacy

В лог идут только цвета и размеры, данных пользователя нет.

## Technical debt

Подложка сейчас берёт `bgBottom`, экран на плоских темах — `bg`; причина просвета не установлена.

## Verification

Снимок на эмуляторе в светлой «Спокойно» вместе с Эмулятором; чтение `.expo/metro-console.log`.

## Rollback

`git revert` коммита.
