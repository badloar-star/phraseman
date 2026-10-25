# Task packet: контраст Карточек — свайп «удалить» и видео-наборы (две правки по замеру Тем)

Governance-ID: TG-1560FCFAADF3
Status: In progress
Owner: 2 · ДИЗАЙН (по поручению координатора; замер — 4 · ТЕМЫ, `docs/work/cards-dialogs-contrast-2026-10-25.md`)
Related epic/enabler: docs/work/season-home-contrast-2026-10-25.md (аналогичная правка карточки эпизода)

## Outcome

В Карточках во всех 174 сочетаниях тем нет пар «текст/значок на фоне» ниже порога: свайп «удалить» (было 2,77 во всех темах) и значки/длительность/полоска видео-наборов на светлом кадре (было 3,36 в 87 из 174).

## Scope

In scope: `app/flashcards/CollectionListView.tsx` (фон `dangerFill`, значок и подпись `dangerInk`), `app/flashcards/VideoSetView.tsx` (play, длительность, дорожка прогресса → `scrimStrong`), `app/flashcards/VideoPackRow.tsx` (дорожка `largeProgress` → `scrimStrong`), тест-сторож.
Out of scope: остальные экраны Карточек (проходят), новые токены, вид и размеры элементов.

## Architecture

Только замена цветов на существующие токены темы: `dangerFill/dangerInk` (пара ≥ 4,5, `liquidGlassButtonTokens`), `scrimStrong` (`liquidGlassPaletteRoles`: тёмный rgba(0,0,0,.80), светлый rgba(20,22,28,.70)) под белым `mediaInk`. Литерал `LV2_BAD` в свайпе уходит.

## Security and privacy

Не затрагивается.

## Technical debt

Замер воспроизводится скриптом `scripts/cards_dialogs_contrast_measure.ts` (4 · ТЕМЫ) — после правки перегнать.

## Verification

Тест-сторож исходников (токены вместо литерала/mediaScrim), соседние тесты Карточек, `npm run typecheck`, замер контраста скриптом Тем.

## Rollback

Откат одного коммита.
