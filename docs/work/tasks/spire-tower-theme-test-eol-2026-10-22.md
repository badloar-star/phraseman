# Тест темы башни Пика: чтение исходников через нормализацию окончаний строк (сторож source_guard_eol_normalized_contract)

Governance-ID: TG-DAAE95E4EE26
Owner: 3 · МАКЕТЫ · Date: 2026-10-22 · Source: 11 · РЕВИЗОР («source_guard_eol_normalized_contract красный из-за
tests/spire_tower_scene_theme.test.ts (последняя правка твоя, 7125e983d) — нужно читать через normalizeEol / readSource»).

## Outcome
- tests/spire_tower_scene_theme.test.ts читает исходники с заменой CRLF → LF: проверка «в коде без hex-литералов» (split по «\n»)
  одинаково работает на рабочей копии в CRLF и LF; сторож EOL снова зелёный.

## Scope
- Одна строка: помощник read() в тесте — fs.readFileSync(…, 'utf8').replace(/\r\n/g, '\n'). Проверки теста не меняются.

## Architecture
- Как во всех сторожах исходников проекта (tests/helpers/read_source.ts); сам помощник не импортирую — у теста свой путь от
  __dirname, смысл тот же.

## Security and privacy
- Не затронуты (только тест).

## Technical debt
- Нет нового долга: строка разделения по «\n» в тесте осталась, но теперь работает на нормализованном тексте.

## Verification
- Через слот: tests/spire_tower_scene_theme.test.ts и tests/source_guard_eol_normalized_contract.test.ts.

## Rollback
- git revert коммита (сторож EOL снова покраснеет).
