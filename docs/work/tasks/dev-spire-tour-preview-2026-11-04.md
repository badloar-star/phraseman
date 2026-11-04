# Task packet: dev-вход для тура Пика (только __DEV__)

Governance-ID: TG-569CA6183CFA
Governance-ID: TG-A01C799DD81C
Status: In progress
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: none

## Outcome

Сверка не может снять тур Пика: в `dev_spire_preview` тур не монтируется, а сброс ключа `spire_tour_seen_v1` небезопасен. Состояние `?state=tour&page=1|2|3` монтирует `SpireTour` напрямую, игнорируя ключ «видел», строго под `__DEV__`.

## Scope

In scope: `app/dev_spire_preview.tsx`, необязательный проп `initialPage` у `components/spire/SpireTour.tsx`. Out of scope: тексты тура, ключ «видел», релизный маршрут.

## Architecture

No architecture change: dev-экран монтирует существующий компонент; проп по умолчанию 0, поведение тура не меняется.

## Security and privacy

Данные не затрагиваются; в релизный бандл ветка не попадает (`__DEV__`). Политика конфиденциальности не затрагивается.

## Technical debt

Нет нового долга.

## Verification

Разбор файлов, тест сторожа на `__DEV__`-ветку, существующие тесты Пика.

## Rollback

Откатить коммит: dev-состояние пропадёт.
