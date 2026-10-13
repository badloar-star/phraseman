# Task packet: последние 9 неполных переводов храповика + проход зоны Ядра по кириллице вне переводов

Governance-ID: TG-709A99B59759
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 13.10; храповик `config/i18n-design-zone-baseline.json` (incomplete 9 → 0)

## Outcome

Сообщения об ошибках (скрыть/вернуть ошибку, сохранить настройку, включить заморозку, убрать/сохранить карточку) — на
всех 9 языках; потолок incomplete = 0. Проход зоны Ядра: видимые пользователю тексты сервера/логики без перевода —
список и исправление там, где перевод на 9 языков есть или пишется сейчас; учебный контент не трогается.

## Scope

In scope: `app/mistake_practice_session.tsx`, `app/settings_edu.tsx`, `app/streak_stats.tsx`, `components/AddToFlashcard.tsx`
(те же объекты переводов), baseline храповика; затем файлы зоны Ядра по сканеру. Out of scope: учебный контент, чужие зоны.

## Architecture

No architecture change: ключи 'pt-BR'/vi/id/tr/pl в существующих объектах.

## Security and privacy

Не касается.

## Technical debt

- Accept temporarily: переводы носителем не проверены.

## Verification

Сканер (incomplete 0), `tests/i18n_design_zone_ratchet.test.mjs`, контракты затронутых экранов.

## Rollback

Откат коммита.
