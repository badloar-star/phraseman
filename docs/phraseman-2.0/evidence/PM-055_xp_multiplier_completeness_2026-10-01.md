# PM-055 — полнота удаления множителей опыта и бустов (аудит ядра, 2026-10-01)

Критерий PM-055-A1: «Убраны покупки, выдача, расчёт, UI, кеш и notifications».
Метод: поиск по коду клиента и сервера (app, components, hooks, modules, functions/src) по токенам
`xp_?boost|xpmultiplier|xp_multiplier|double_?xp|xp_2x|boost_?xp|xp_bank|multiplier.*xp|xpBoost`,
затем чтение каждого попадания. Пробы: `tests/xp_boost_tokens_compat_only.probe.ts` (PASS, 3182 файла,
попадания только в 6 файлах совместимости; список дополнен `app/retired_account_local_keys.ts`, 01.10), `pm055_xp_multiplier_runtime_retirement`, `pm055_xp_surface_retirement` (PASS, пачка 3).

## Множители ОПЫТА (XP) — по измерениям

| Измерение | Результат | Где проверено |
|---|---|---|
| Покупки | Нет: ни одного продукта/цены с XP-бустом | токены в магазине/пейволе — 0 попаданий |
| Выдача | Нет: серверный каталог подарков уровня не выдаёт XP/щит/лигобуст; старые XP-подарки удаляются без компенсации (владелец 01.10; перевод в монеты выключен) | `app/gifts_to_coins_table_v1.ts` (только перевод), сервер level-gift (проба PASS) |
| Расчёт | Нет: XP-множителя в начислении нет | `xp_multiplier` в рабочем коде — 0; поле `gift_xp_multiplier` только в списках стирания/описи |
| UI | Нет вызовов: `ResultsSequence` умеет показывать `multipliers`, но ни один экран их не передаёт (0 вызывающих) | grep `multipliers:` / `multiplier: {` вне компонента — 0 |
| Кеш | Старые ключи `gift_xp_bank_v1`, `gift_xp_multiplier`, `club_gift_free_boost_v1` стираются с аккаунтом | `RETIRED_2_0_ECONOMY_ACCOUNT_LOCAL_KEYS` в `app/retired_account_local_keys.ts` (реэкспорт из `app/cloud_sync.ts`) |
| Notifications | Нет типов уведомлений про XP-буст/множитель | токены в user_notifications (клиент/сервер) — 0 |

Остатки, не являющиеся множителями опыта: `comboMultiplier` в Блице (очки серии внутри одной игры),
`tierThresholdMultiplier` у Джарвиса (пороги аналитики), `ARENA_DAILY_MULTIPLIERS` в
`functions/src/arena_stars_v3.ts` (модуль-зависимость пула Шпиля, CLAUDE.md: не трогать),
звуки `multiplierReveal/multiplierUpgrade` в `feedback_kit` (не вызываются с XP).

**Вывод по XP: A1 выполнен по всем шести измерениям.**

## «Супер-воскресенье» (буст МОНЕТ ×2) — снято решением D147 (b053c3ac4)

`modules/economy/super_sunday_runes.ts`: `SUPER_SUNDAY_MULTIPLIER = 2` — по воскресеньям (UTC)
монеты за занятия удваиваются. Живое: используется в `learning_v2_direct_session_player_v1.tsx`,
`practice_rune_settlement.ts`, `mistake_practice_rewards.ts`, `level_spin_star_grants.ts`,
`learning_session_rune_reward_composite_v1.ts`, `mistake_correction_wallet_composite.ts`.
В `03_DECISIONS.md` решения про него нет. Это не множитель опыта, но это «буст» из заголовка
задачи. Нужно решение: оставить как часть экономики монет 2.0 или снять. До решения
ничего не меняется (вопрос Q87 координатору).
