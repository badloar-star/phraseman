Governance-ID: TG-75A4289EFB74

# Task packet: номер сборки 149 → 150, парковка шапки Сообщества

## Outcome
По слову координатора: версия релиза 2.1.0 выходит сборкой 150. `versionCode` Android и `buildNumber` iOS поднимаются с 149 до 150, `autoIncrement` в `eas.json` остаётся `false`. Незакоммиченные контракты общей шапки Сообщества (`spire_scene_contract` изменён, `spire_single_scroll_owner_contract` не в git) паркуются: утверждённого макета нет.

## Scope
- `app.json`: `android.versionCode` и `ios.buildNumber`.
- `tests/android_aab_size_report.test.mjs`: закреплённые числа теста метаданных сборки (146 / 2.0.3 устарели).
- Парковка двух тестов в `docs/work/_parked_2_1_1/spire_shared_header/` с README «ждёт макет».
- Вне объёма: запуск EAS, версия приложения (остаётся 2.1.0).

## Architecture
No architecture change.

## Security and privacy
Не затрагивает.

## Technical debt
Contain: тест метаданных привязан к текущим числам; следующий бамп потребует правки одной пары чисел. Запаркованное возвращается по README после утверждения макета.

## Verification
Точечный запуск теста метаданных сборки, шлюза версий (`eas_production_version_gate`), `git status` по двум парковкам.

## Rollback
`git revert` коммита.
