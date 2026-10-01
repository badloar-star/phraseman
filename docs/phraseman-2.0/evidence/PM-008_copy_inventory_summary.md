# PM-008 — автосбор пользовательских строк

Скрипт `docs/phraseman-2.0/tools/pm008_copy_inventory.mjs` (typescript compiler API, createSourceFile; без regex по репозиторию). Область: `app/`, `components/`, `modules/`; без tests, `modules/learning-v2/content/source`, generated/gen, dev-экранов, контент-файлов (уроки, идиомы) и файлов > 200 КБ — они в отдельных реестрах контента.

## Числа
- файлов в области: 1726; пропущено по пути: 578; пропущено по размеру: 10; удалено в рабочем дереве (не закоммичено): 18; сбоев разбора: 0
- строк всего: **19451**; с признаком риска: **734**; про удалённые разделы (арена, лига, жемчуг, руны, осколки, подарки, XP, MAX, голосовой тьютор, спины/сундуки/буст, бонусы): **140**
- по признакам: exclaim_end=178, gifts=16, officialese=43, pearl=54, long=380, max=4, spin_chest=9, arena=11, shards=16, league=3, runes=8, bonus=20
- по языкам: ru=8563, uk=4897, en=438, es=698, en?=3351, tr=789, pl=714, it=1

## Топ файлов по числу строк про удалённые разделы
| файл | строк | с риском | про удалённое |
|---|---|---|---|
| `app/level_gift_system.ts` | 125 | 21 | 21 |
| `app/achievement_copy_ru_v2.ts` | 96 | 13 | 13 |
| `app/shard_earn_ui.ts` | 36 | 14 | 13 |
| `app/flashcards/CardPackShardPaywallModal.tsx` | 56 | 12 | 12 |
| `app/achievement_catalog_v2.ts` | 77 | 8 | 8 |
| `app/paywall_copy.ts` | 1708 | 204 | 6 |
| `app/session_attempts/session_attempts_copy.ts` | 92 | 6 | 6 |
| `app/shop_catalog.ts` | 62 | 6 | 6 |
| `components/NotificationCenterButton.tsx` | 45 | 5 | 5 |
| `app/(tabs)/settings.tsx` | 261 | 8 | 4 |
| `app/feature_intro_registry.ts` | 6 | 5 | 4 |
| `app/home_hints_selected.ts` | 86 | 4 | 4 |
| `components/DoubleRewardSheet.tsx` | 22 | 4 | 4 |
| `app/avatar_showcase_copy.ts` | 35 | 3 | 3 |
| `app/_dev_cancel_flow_preview.tsx` | 49 | 2 | 2 |

## Топ файлов по числу строк с риском
| файл | строк | с риском | про удалённое |
|---|---|---|---|
| `app/paywall_copy.ts` | 1708 | 204 | 6 |
| `app/notifications.ts` | 200 | 56 | 0 |
| `app/feature_intro_sections_copy.ts` | 141 | 50 | 0 |
| `app/feature_intro_training_copy.ts` | 60 | 25 | 0 |
| `app/level_gift_system.ts` | 125 | 21 | 21 |
| `app/lesson_complete.tsx` | 117 | 18 | 0 |
| `app/home_feature_tips.ts` | 119 | 17 | 0 |
| `app/ai_dialog_briefing_copy.ts` | 53 | 16 | 0 |
| `app/shard_earn_ui.ts` | 36 | 14 | 13 |
| `app/achievement_copy_ru_v2.ts` | 96 | 13 | 13 |
| `app/flashcards/CardPackShardPaywallModal.tsx` | 56 | 12 | 12 |
| `app/main_course_plus_copy.ts` | 41 | 9 | 0 |
| `app/(tabs)/settings.tsx` | 261 | 8 | 4 |
| `app/achievement_catalog_v2.ts` | 77 | 8 | 8 |
| `app/achievement_share.ts` | 22 | 8 | 0 |

## Первые 40 строк про удалённые разделы (их видит пользователь, если экран достижим)
- `app/(tabs)/settings.tsx:804` [gifts] Подарок за приглашения
- `app/(tabs)/settings.tsx:1647` [pearl] Смена аккаунта отменена: незавершённое списание жемчуга нельзя переносить или пропускать. Подключись к интерне…
- `app/(tabs)/settings.tsx:1675` [pearl] Нужна проверка жемчуга
- `app/(tabs)/settings.tsx:1686` [pearl] Смена аккаунта отменена: локальная очередь жемчуга повреждена или принадлежит неизвестному аккаунту. Данные со…
- `app/_dev_cancel_flow_preview.tsx:304` [max] Остаться в MAX
- `app/_dev_cancel_flow_preview.tsx:304` [max] Залишитися в MAX
- `app/achievement_catalog_v2.ts:89` [pearl] Сто жемчужин на балансе. Маленькая подушка финансовой важности.
- `app/achievement_catalog_v2.ts:91` [pearl] Жемчужный хомяк
- `app/achievement_catalog_v2.ts:91` [pearl] Пятьсот жемчужин. Щёки не проверяли, но всё понятно.
- `app/achievement_catalog_v2.ts:92` [pearl] Четыре цифры жемчужин. Море официально завидует.
- `app/achievement_catalog_v2.ts:93` [spin_chest] Сундук перестал закрываться
- `app/achievement_catalog_v2.ts:94` [pearl] Личный жемчужный фонд
- `app/achievement_catalog_v2.ts:95` [pearl] Десять тысяч жемчужин. Экономисты просят ничего резко не покупать.
- `app/achievement_catalog_v2.ts:111` [pearl] Жемчужины пережили искушение
- `app/achievement_copy_ru_v2.ts:23` [pearl] Первая жемчужная сотня
- `app/achievement_copy_ru_v2.ts:23` [pearl] Хотя бы раз иметь 100 жемчужин на балансе.
- `app/achievement_copy_ru_v2.ts:24` [pearl] Хотя бы раз иметь 250 жемчужин на балансе.
- `app/achievement_copy_ru_v2.ts:24` [pearl] Двести пятьдесят жемчужин тихо звенят: не богатство, но уже повод идти чуть важнее.
- `app/achievement_copy_ru_v2.ts:25` [pearl] Хотя бы раз иметь 500 жемчужин на балансе.
- `app/achievement_copy_ru_v2.ts:26` [pearl] Четыре цифры жемчуга
- `app/achievement_copy_ru_v2.ts:26` [pearl] Хотя бы раз иметь 1 000 жемчужин на балансе.
- `app/achievement_copy_ru_v2.ts:27` [spin_chest] Сундук просит второй замок
- `app/achievement_copy_ru_v2.ts:27` [pearl] Хотя бы раз иметь 2 500 жемчужин на балансе.
- `app/achievement_copy_ru_v2.ts:28` [pearl] Личный жемчужный фонд
- `app/achievement_copy_ru_v2.ts:28` [pearl] Хотя бы раз иметь 5 000 жемчужин на балансе.
- `app/achievement_copy_ru_v2.ts:29` [pearl] Хотя бы раз иметь 10 000 жемчужин на балансе.
- `app/achievement_copy_ru_v2.ts:39` [pearl] Иметь максимум 10 000 жемчужин и накопить 100 активных дней.
- `app/avatar_showcase_copy.ts:46` [pearl] жемчужина
- `app/avatar_showcase_copy.ts:46` [pearl] жемчужины
- `app/avatar_showcase_copy.ts:46` [pearl] жемчужин
- `app/feature_intro_registry.ts:91` [arena] Твой выход на Арену
- `app/feature_intro_registry.ts:92` [arena] Арена
- `app/feature_intro_registry.ts:113` [arena] Открыть Арену
- `app/feature_intro_registry.ts:114` [arena] Відкрити Арену
- `app/flashcards/CardPackShardPaywallModal.tsx:213` [pearl] жемчужин
- `app/flashcards/CardPackShardPaywallModal.tsx:346` [pearl] Пополнить жемчуг
- `app/flashcards/CardPackShardPaywallModal.tsx:349` [pearl] Недостаточно жемчуга
- `app/flashcards/CardPackShardPaywallModal.tsx:354` [pearl] Пакеты жемчуга в магазине
- `app/flashcards/CardPackShardPaywallModal.tsx:355` [gifts] Набор в подарок
- `app/flashcards/CardPackShardPaywallModal.tsx:356` [gifts] Использовать подарок?

## Как владельцу решать
Файл `evidence/PM-008_copy_owner_review.csv` (UTF-8, открывается в Excel): строки с риском, колонка «решение» пустая. Сверху — строки про удалённые разделы. Заполнить «оставить / сократить / удалить» (и при «сократить» — предложенный текст).

Честные границы: «экран» определён по пути файла, а не по реальному маршруту; ключ — имя свойства рядом, а не ключ локализации (единой таблицы ключей в приложении нет); достижимость строки из релизного графа не проверялась (часть строк про удалённое — в мёртвом коде или в серверных/админских текстах).
