# Два моих сторожа читают исходники через normalizeEol

Governance-ID: TG-C0AE569844BC

## Outcome
11 · РЕВИЗОР: `source_guard_eol_normalized_contract` красный — `tests/notification_center_tones_theme.test.ts` и `tests/profile_card_art_ink_theme.test.ts` читают исходники без нормализации концов строк; на CRLF многострочные проверки падают ложно. Читаем через `normalizeEol`.

## Scope
In scope: две строки чтения и один импорт в каждом из двух тестов.
Out of scope: смысл проверок, другие сторожа.

## Architecture
`normalizeEol` из `tests/helpers/read_source.ts` оборачивает `fs.readFileSync(..., 'utf8')`; остальная цепочка (`replace` комментариев, поиск литералов) без изменений.

## Security and privacy
Данных не касается.

## Technical debt
Нет нового долга: убирается расхождение с общим правилом сторожей по концам строк.

## Verification
`npm run test:one` по обоим тестам и по `source_guard_eol_normalized_contract`.

## Rollback
Вернуть прямое чтение файла.
