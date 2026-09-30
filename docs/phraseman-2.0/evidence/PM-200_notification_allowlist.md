# PM-200-A1 — allowlist уведомлений PhraseMan 2.0

Дата среза: 2026-10-01. Источники: `functions/src/*`, `functions/src/index.ts` (что реально экспортируется = задеплоено),
`functions-max/index.ts`, `app/notifications.ts`, `app/notification_tap_handler.ts`, `app/push_token_registration.ts`.
Ничего в коде не менялось — это снимок для решения «что оставить живым».

Как читать колонку «Отключение»: `pushPrefs.<ключ>` — поле в `users/{id}`; клиент сейчас зеркалит туда ТОЛЬКО
`streak` и `offers` (`app/push_token_registration.ts::updateServerPushPrefs`). Категории раздела
«Уведомления» (`NotifCategory`): streak, phrase_of_day, energy, weekly_recap, monthly_recap, offers, gifts, friends
(+ общий `master`). Ключа `league` у клиента НЕТ.

## A. Серверные push (Expo Push API)

| # | Тип (`data.type`) | Назначение | Триггер | Отключение (opt-out) | Дедуп / троттлинг | Deeplink (тап) | Статус |
|---|---|---|---|---|---|---|---|
| 1 | `streak_at_risk`, `inactive_return`, `inactive_long` (`re_engage_push.ts`, `reEngagePushCron`) | возврат пропавших, серия под угрозой | cron `0 10 * * *` UTC; серия >=3 и 20-24 ч без входа / 3-14 дней / 15-30 дней | только `streak_at_risk` уважает `pushPrefs.streak === false`; `inactive_*` НЕ имеют opt-out кроме отзыва токена (master off) | `lastReEngagePushAt` + кулдаун 2 дня; тихие часы 22-09 по поясу токена; потолок отправок за прогон | `streak_at_risk`/`inactive_*` -> `/lessons_list` | LIVE (экспорт index.ts:461) |
| 2 | `premium_expiry_reminder` (`premium_expiry_reminder.ts`, `premiumExpiryReminderCron`) | напоминание «Plus скоро истекает» | cron `0 9 * * *` UTC; платный срок через 72-96 ч | НЕТ: `pushPrefs.offers` не читается (только отзыв токена) | `lastExpiryReminderAt`, кулдаун 5 дней; тихие часы; окно ровно в сутки скана | в `notification_tap_handler.ts` кейса НЕТ -> `default` -> Главная | LIVE (index.ts ~:487) |
| 3 | `friend_nudge` (`friends_together.ts::friendsNudge`) | «Позвать» друга на занятие | callable по тапу отправителя | получатель: `users.friends_push_v1.enabled === false` (клиент пишет из категории `friends`); тихие часы по `friends_push_v1.tz` | на пару 1/день, отправитель 5/день, получатель 3/день; `notificationId = friends_together_nudge_<uid>_<day>`; `requestId` идемпотентность | `/(tabs)/friends` с `actorStableUid`/`eventId` | LIVE. Замечание: `.catch(() => {})` на отправке push (немой catch) |
| 4 | `activity_like` (`friend_activity_likes.ts`) | «даёт пять» на событие/профиль | callable по лайку | НЕТ проверки prefs (ни `friends`, ни `master`, только наличие токена) | один лайк на (отправитель, событие, день) — транзакция; `notificationId` детерминирован | `/(tabs)/friends` с `actorStableUid`/`eventId` | LIVE. Замечание: нет тихих часов и opt-out |
| 5 | `spire_week_result` (`spire_week_result_push.ts`) | итог недели Шпиля (понедельник) | внутри `spireFinalizeCron` после итогов | `pushPrefs.league === false`, но клиент `league` НЕ пишет -> на деле отключается только отзывом токена | один раз за прогон финализации; отдельного ключа дедупа нет (повторный ручной прогон крона = дубль); тихих часов нет | кейса нет -> `default` -> Главная | LIVE (через `spireFinalizeCron`, index.ts:993) |
| 6 | `spire_zone_warning` (`spire_zone_warning_push.ts`, `spireZoneWarningCron`) | «ты у края зоны» (воскресенье) | cron `every sunday 20:00` | как #5: `pushPrefs.league === false`, не зеркалится клиентом | раз в неделю по расписанию; дедупа между повторными запусками нет; тихих часов нет | кейса нет -> Главная | LIVE (index.ts:1001) |
| 7 | произвольный текст (`admin_push_jobs.ts`: `adminPushJobCreated`, `adminPushJobsCron`) | ручные/сегментные/реактивационные рассылки из админки | документ задания в Firestore + cron `every 6 hours` | нет (админ-рассылка); пользователь отключает отзывом токена | `PROCESSING_STALE_MS` 15 мин, статус задания; чанки по 100 | `action` из задания (если есть) | LIVE (index.ts:912) |
| 8 | `tournament_starting` (`tournament_start_push.ts`) | старт турнира | раньше — cron по лобби | `pushPrefs.league` | кулдаун 20 ч, тихие часы 22-09 | тап -> `break` (ничего) | RETIRED: турниры сняты с деплоя (index.ts ~:944-970, 2026-08-23/2026-09-02); модуль НЕ экспортируется. Не менять |
| 9 | напоминание «урок дня» MAX (`max_lesson_reminder_push.ts`) | напоминание от учителя MAX | почасовой cron от памяти учителя | - | - | - | SEALED: раздел MAX запломбирован 2026-09-04, файл нигде не экспортируется (ни в `functions/src/index.ts`, ни в `functions-max/index.ts`). Не менять |
| 10 | `arena_friend_*` (старые дуэли Арены) | - | - | - | - | тап -> Главная (`[D83-ARENA-RETIRED]`) | RETIRED (D83): сервер не шлёт, обработчик тапа оставлен ради старых уведомлений |

Не push, но рядом: `webActivationReminderCron` (`web_activation_reminders.ts`, `0 10 * * *`) — это ПИСЬМО об активации
веб-покупки (2/7/14 дней после оплаты), а не уведомление; в allowlist push не входит.
`user_notifications.ts` — центр событий внутри приложения (inbox), push не отправляет сам; его пишут #3 и #4.

## B. Локальные уведомления (`app/notifications.ts`, планируются на устройстве)

| Тип (`data.type`) | Категория opt-out (`notif_prefs_v1`) | Когда | Дедуп / троттлинг | Тап |
|---|---|---|---|---|
| `reminder` (ежедневное) | `master` (время выбирает пользователь) | ежедневно в выбранное время | пересоздаётся при смене; старые id отменяются (`per_day_notif_ids`) | Главная |
| `streak_warning` | `streak` | вечером при угрозе серии | кулдаун 23 ч для немедленной отправки; общий зазор 45 мин между немедленными | Главная |
| `d1_reminder` | `master` | день 1, 20:20 | разово | Главная |
| `phrase_of_day` | `phrase_of_day` | ежедневно | один запланированный id | Главная |
| `weekly_recap` | `weekly_recap` | воскресенье 20:10 | один id | Главная |
| `monthly_recap` | `monthly_recap` | раз в месяц | один id | Главная |
| `energy_full` | `energy` | когда энергия восстановится; тихие часы 23-08 | один id, сдвиг на утро | нет кейса -> Главная |
| `intro_expiring`, `upsell_d4`, `upsell_d7`, `upsell_d14`, `paywall_abandoned`, `premium` | `offers` (зеркалится в `pushPrefs.offers`) | после триала/пейвола | `paywall_abandoned` кулдаун 23 ч; общий зазор 45 мин | `/premium_modal` (upsell/intro) либо Главная (`premium`) |
| `youtube_premiere` | `master` | на время премьеры ролика | один id на ролик (`cancelYoutubePremiereLocalNotification`) | `/lingman_videos` |
| `gift_expiring` | `gifts` | - | - | RETIRED (D09/PM-048): планировщик удалён, хвост гасится разово `retired_local_notifications.ts` (`retired_local_notifs_cancelled_v1`) |

## C. Находки для решения (код НЕ менялся)

1. Серверные push Шпиля (#5, #6) проверяют `pushPrefs.league`, но клиент это поле не пишет и в разделе
   «Уведомления» категории «Лига»/«Шпиль» нет -> у игрока нет способа отключить их, кроме системных настроек/отзыва токена.
2. `premium_expiry_reminder` (#2) не читает `pushPrefs.offers`, хотя по смыслу это «предложение/подписка».
3. `activity_like` (#4) не проверяет ни `friends`, ни тихие часы; у `friend_nudge` (#3) отправка push с немым `.catch(() => {})`.
4. `inactive_return`/`inactive_long` (#1) не имеют opt-out в разделе «Уведомления».
5. Тап по `premium_expiry_reminder`, `spire_week_result`, `spire_zone_warning` приводит на Главную по `default`; выделенного
   экрана (Plus / Шпиль) нет.
6. Повторный ручной прогон `spireFinalizeCron`/`spireZoneWarningCron` может дать дубль пуша (ключа дедупа недели нет).
