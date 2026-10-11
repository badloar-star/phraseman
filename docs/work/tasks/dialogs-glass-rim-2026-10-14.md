# Диалоги: стеклянная кромка карточек и окна подсказки по токенам темы

Governance-ID: TG-193CFA43B4BB
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (приказ владельца «все замечания поправить», DIFF_BURNDOWN: dialogs-014, dialogs-017)
Related epic/enabler: coin-cost-card-rim-fix-rows-tone-2026-10-14.md

## Outcome

Карточки брифинга/каталога/итога диалогов (`dialogueGlassCardStyle`) и окно подсказки (`DialogHintModal`) получают светлую кромку сверху, тонкое кольцо и тень из токенов темы (`bevelHi`, `hairlineSoft`, `dropShadow`) — «стекло» макета `--lg-rim`, а не плоская тёмная плита.

## Scope

In scope: `components/dialogs/glass/DialogueGlassKit.tsx` (`dialogueGlassCardStyle`), `components/dialogs/DialogHintModal.tsx` (стиль карточки окна). Out of scope: вёрстка, кнопки, пузыри ленты.

## Architecture

Внутренние (`inset`) тени `boxShadow` рисуются поверх заливки и не меняют размеры; цвета — только токены.

## Security and privacy

Не применимо.

## Technical debt

Остальные замечания (`dialogs-003/006` полосы фона, `dialogs-007` белая кнопка — зависит от ползунка темы) — отдельно по кадрам.

## Verification

Синтаксис, контракты диалогов (`node --test`), ратчет цветов.

## Rollback

`git revert` коммита.
