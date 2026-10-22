# Огонёк серии и метки событий друзей — в оттенки темы

Governance-ID: TG-20634D6C8A37

## Outcome
Владелец кнопками (через координатора): «огонёк серии — В ОТТЕНОК ТЕМЫ; метки событий друзей (FriendEventMarker) — В ТЕМУ. Исключений нет». Огонёк серии и «ноль энергии» на сцене Главной больше не персиковые (#FFD9D0 / #FFB4A3), а очень светлые оттенки акцента выбранной темы. Метка события друзей красится токенами темы вместо фарфор/графит/бирюза/янтарь.

## Scope
In scope: `HomeSceneStage.tsx`, `HomeSceneEnergy.tsx`, новый `home_scene_warm_tone.ts`, `FriendEventMarker.tsx`, тесты (`scene_contrast_audit`, `friend_event_icon_contract`).
Out of scope: огонь в «Сегодня» (`TodaySceneView.tsx` — незакоммиченные правки 3 · МАКЕТЫ), моменты серии (иллюстрация), тень шторки экзамена (файл 2 · ДИЗАЙН).

## Architecture
`homeSceneWarmTone(accentHex)` → `{ flame, low }`: оттенок акцента, светлота 0,92 / 0,88, насыщенность ниже акцента; кэш по акценту. Метка: фон `g.opaqueCard`, кольцо и точка `g.accentGraphic`, значок и счётчик `g.text`, тень `g.dropShadow`, чернила молнии `g.ctaFillInk`.

## Security and privacy
Данных не касается.

## Technical debt
`TodaySceneView.tsx` ещё держит `#FFD9D0` — подключить `homeSceneWarmTone` после коммита 3 · МАКЕТЫ.

## Verification
Аудит контраста сцен (огонёк и ноль энергии ≥ 4,5 во всех темах × оформлениях × день/вечер), контракт метки друзей, контракты Главной.

## Rollback
Вернуть константы цветов.
