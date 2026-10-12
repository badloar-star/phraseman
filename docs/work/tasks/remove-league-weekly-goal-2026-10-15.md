# Удаление неиспользуемых картинок league/weekly-goal (9 файлов, 272 КБ)

Governance-ID: TG-B2C38AE0AE41
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (разрешение координатора: «ДА, удаляй отдельным коммитом после проверки тестов»)

## Outcome
Из сборки уходят 9 картинок assets/images/league/weekly-goal/<тема>.webp — на них нет ссылок ни в коде, ни в тестах (раздел Лиг удалён в 2.0, D54/D78); бандл легче на 272 КБ.

## Scope
Только удаление файлов (папка league целиком опустеет). Код не меняется.

## Architecture
Нет потребителей: поиск по путям `weekly-goal` и `images/league` в app/components/constants/hooks/modules/tests/scripts даёт 0 совпадений.

## Security and privacy
Статические картинки.

## Technical debt
Нет.

## Verification
Повторный поиск ссылок, тесты ассетов (asset_hygiene, removed_theme_assets, live_theme_contract и соседние).

## Rollback
git revert коммита.
