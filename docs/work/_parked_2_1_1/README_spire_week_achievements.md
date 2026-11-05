Governance-ID: TG-F3FF1D88DA46

# Припаркованная сирота: коллекционные предметы Пика (ачивки по неделям)

Файл патча: `spire_week_achievements.patch` (применить: `git apply docs/work/_parked_2_1_1/spire_week_achievements.patch` из корня репозитория).

Что внутри: `app/spire/spire_week_result_client.ts` (проверка владельца сеанса, запись коллекционных предметов недели), `app/spire_report_client.ts` (запись вершины перед заменой недели), `tests/spire_week_wallet_merge.test.ts`.

Почему не закоммичено (решение Ядра 06.11, поручение координатора «цельно и безопасно, иначе — патч»): эти правки вызывают `app/spire/spire_achievement_client.ts` (новый, не в репозитории), который тянет `recordSpireAchievementFact` из `app/achievements.ts` (+91 строк в грязном дереве) и новые модули `modules/spire/achievement_*.ts`, `modules/achievements/spire_catalog.ts`, `activity_*` — то есть целую недоделанную фичу «коллекционные предметы Пика + достижения активности» (каталог, истории, экран). Закоммитить два файла отдельно — сломать сборку HEAD; закоммитить всю фичу за два дня до сборки без решения владельца и кадров — риск.

Что осталось в рабочем дереве как есть (не трогал): `app/spire/spire_achievement_client.ts` (новый), `modules/spire/achievement_*.ts` (новые), `app/achievements.ts`, `app/achievement_catalog_v2.ts`, `modules/spire/report_store.ts` (необязательный параметр `beforeWeekReplacement`).

Как вернуть: применить патч, затем довести фичу целиком (каталог, тесты `spire_achievement_*`, экран) и принять владельцем.
