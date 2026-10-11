# Task packet: непрерывная сверка паритета — вердикты по свежим кадрам

Governance-ID: TG-561370D57EF4
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

Для каждого свежего кадра Сверки в evidence/parity выставлен вердикт в реестре visual_parity.json: match, если всё совпало и гейт пропускает, иначе diff с классами остатка. Мера успеха: строки перечисленных id получили вердикт, число строк реестра прежнее.

## Scope

In scope: docs/phraseman-2.0/registries/visual_parity.json (строки по id, через замок), вспомогательные файлы вердиктов в C:/Temp/claude.

Out of scope: код приложения; образцы под замком владельца.

## Architecture

No architecture change: реестр и документация.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: расхождения-дефекты кода передаются координатору списком.

## Verification

Число строк реестра прежнее; match выставляется только если гейт пропускает (кадр новее кода, хэш совпадает).

## Rollback

Откат коммита.
