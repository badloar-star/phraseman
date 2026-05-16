# Admin Firestore Cost Audit

Дата: 2026-05-14

## Что уже переведено в режим экономии

| Зона | Было | Стало | Экономия |
| --- | ---: | ---: | --- |
| Старт админки | `loadUsers()` сразу: `users limit(400)` + весь `arena_profiles` + `banned_users` | пользователи грузятся только при открытии `Users`, `Analytics`, `Premium` | минус ~800+ document reads на каждый вход в админку |
| Badges вкладок | ~3586+ document reads за один пересчет | `getCountFromServer()` count-агрегации, обычно ~20-25 billed reads/пересчет | минус примерно 99% на бейджах |
| Badges timer | каждые 120 сек | каждые 600 сек | минус 80% фоновых обновлений |
| Двойной пересчет badges на старте | `switchTab()` + `startAdminApp()` | один forced пересчет | минус один полный пересчет |
| App Health activity | `app_activity limit(500)` автоматически | lazy button `Load activity`, `limit(150)` | минус 500 reads на обычный старт App Health |

Пример: открытая админка раньше могла стоить до ~108k reads/час только на бейджах. После правки фоновые бейджи должны быть порядка сотен reads/час, а не десятков тысяч.

## Самые дорогие места после экономии

| Место | Когда срабатывает | Примерная цена сейчас | Почему дорого | Что делать дальше |
| --- | --- | ---: | --- | --- |
| `loadAppHealth()` | стартовая вкладка App Health | до 500 reads | читает `app_errors 500`; activity теперь по кнопке | server-side period filter + limit 250 |
| `loadUsers()` | только при Users/Analytics/Premium | ~400 + all `arena_profiles` + all `banned_users` | читает полные user-доки со всеми JSON-полями | сделать `admin_user_index/{uid}` с коротким набором полей |
| `loadLeagueChatAdmin()` | Чат лиг | до 1500 reads | queue/reports/messages/groups/bans пачками | грузить только активный режим, комнаты и архив по кнопке |
| `loadClubsData()` | Лиги | all `league_groups` | все недели и все группы | по умолчанию текущая неделя, архив недель по кнопке |
| `loadArchive()` | Архив | 1000 reads | `user_reports 500` + `error_reports 500` | заменить на query по статусам `archived/fixed/banned` с лимитом 100 |
| `loadAppActivity()` | кнопка Load activity | 150 reads | routine `navigation:screen_view` мало полезен | можно удалить полностью |
| `loadReports()` | Репорты | 500 reads | вся пачка error_reports | оставить, но добавить пагинацию 100 + Load more |
| `loadUserReports()` | Жалобы | 500 reads | вся пачка user_reports | пагинация 100 + status filter server-side |
| `loadUgcPurchases()` | Покупки UGC | 500 reads | история покупок | пагинация 100 |
| `loadCancelSurveys()` | Cancel surveys | 500 reads | все анкеты | пагинация 100 |
| `loadCardPacks()` | Card packs | 300 reads | все паки | норм, можно оставить |
| `loadArenaLive()` | Арена Live | 650 reads | queue/sessions/rooms | уже устойчиво; можно уменьшить лимиты |

## Важное про карточки пользователей

Firestore billing считает document reads, а не поля. Если мы просто уберем колонку из таблицы, reads не уменьшатся: один `users/{uid}` все равно стоит 1 read. Но удаление лишних полей из админского списка уменьшит payload, парсинг JSON и лаги. Реальная экономия по reads появится, если:

1. Не читать `users` на старте. Уже сделано.
2. Читать не `users`, а короткий индекс `admin_user_index/{uid}`.
3. Полный `users/{uid}` грузить только при клике в профиль.

## Поля из user cards / users list

| Поле / UI | Источник | Read cost | Payload/CPU | Нужность | Рекомендация |
| --- | --- | ---: | --- | --- | --- |
| UID | doc id | 0 extra | низко | нужно | оставить |
| Имя | `progress.user_name` | 0 extra | низко | нужно | оставить |
| XP / Level | `progress.user_total_xp` | 0 extra | низко | нужно | оставить |
| Streak | `progress.streak_count` | 0 extra | низко | нужно | оставить |
| Уроки `x/32` | `progress.unlocked_lessons` JSON | 0 extra | средне | полезно | в индекс писать только count |
| Тема | `progress.app_theme` | 0 extra | низко | почти бесполезно | можно убрать колонку/filter/KPI |
| Язык | `progress.lang/app_lang` | 0 extra | низко | нужно для support/UA/RU | оставить |
| Платформа | `progress.device_platform` | 0 extra | низко | нужно | оставить |
| Версия | `progress.app_version` | 0 extra | низко | нужно | оставить |
| Уровень знаний | `progress.placement_level` | 0 extra | низко | редко нужно | можно скрыть в таблице, оставить в detail |
| Premium | `progress.premium_plan/expiry` | 0 extra | низко | нужно | оставить |
| Email | `linkedAuth.email/provider` | 0 extra | средне | нужно для support | оставить |
| Настройки icons | `progress.user_settings` JSON | 0 extra | средне | почти бесполезно | убрать из таблицы |
| Shards | root `shards` | 0 extra | низко | нужно для выдачи/экономики | оставить |
| Updated | root `updatedAt` | 0 extra | низко | нужно | оставить |
| Avatar/frame | `user_avatar`, `user_avatar_frame` | 0 extra | средне | визуально, не admin-critical | можно заменить на level circle |
| Flashcards count | `progress.flashcards` JSON | 0 extra | высоко | редко нужно | убрать из list, detail по клику |
| Achievements | `progress.achievements_state` JSON | 0 extra | высоко | редко нужно | убрать из list/analytics, detail по клику |
| League state | `progress.league_state_v3` JSON | 0 extra | средне | дублируется вкладкой Лиги | убрать из users list |
| Daily tasks | `progress.daily_tasks_progress` JSON | 0 extra | средне | debug only | убрать из analytics/list |
| User stats commerce | `progress.user_stats_v1` JSON | 0 extra | высоко | полезно только для analytics | вынести в отдельную вкладку/агрегат |
| Haptics/font/onboarding | progress fields | 0 extra | низко | почти бесполезно | скрыть из list, detail only |

## Что можно безопасно убрать/спрятать из админки

| Кандидат | Где | Экономия reads | Экономия payload/CPU | Риск |
| --- | --- | ---: | ---: | --- |
| `Recent Activity` из App Health | `app_activity` | до 500 на App Health | средняя | низкий: это noisy telemetry |
| Theme KPI/Theme column/filter | Users stats/table | 0 reads | низкая | низкий |
| Settings icons | Users table | 0 reads | средняя, если перестать парсить `user_settings` в list | низкий |
| Avatar rendering | Users table | 0 reads | средняя | низкий |
| Placement level column | Users table | 0 reads | низкая | низкий |
| Flashcards average/card count analytics | Analytics | 0 reads сейчас, но высокий payload из `flashcards` | высокая при admin index | средний |
| Achievements average | Analytics | 0 reads сейчас, но высокий payload из `achievements_state` | высокая при admin index | средний |
| Daily quiz/tasks today | Analytics | 0 reads сейчас, но JSON parse | средняя | средний |
| Full commerce bars from `user_stats_v1` | Analytics | 0 reads сейчас, но большой payload | высокая | средний: можно заменить агрегатом |
| Archive tab as default full scan | Archive | до 1000 при открытии | высокая | низкий, если оставить Load more |
| League chat archive mode preload | Чат лиг | до 600 messages + 600 groups | высокая | низкий, если грузить архив по кнопке |
| Ban-list full collection in badges | badges | уже count, не docs | низкая | оставить |

## Самый сильный следующий шаг

Создать `admin_user_index/{uid}`:

```ts
{
  name,
  xp,
  streak,
  lessonsCount,
  lang,
  platform,
  appVersion,
  premiumPlan,
  premiumExpiry,
  shards,
  updatedAt,
  linkedAuthProvider,
  linkedAuthEmail,
  banned,
  arenaRankSummary
}
```

Тогда Users list читает легкие документы, а полный `users/{uid}` открывается только в detail. Reads останутся примерно теми же на список, но payload и браузерная нагрузка упадут сильно. Если дополнительно делать server-side filters/pagination по индексу, можно уйти от `400 + arena_profiles all` к `50-100 reads` на страницу.

## Минимальная безопасная стратегия

1. Оставить текущие экономичные badges.
2. Оставить lazy users load.
3. Убрать `app_activity` из автозагрузки App Health.
4. Сделать `admin_user_index`.
5. Перевести Users на paging `limit(100)` + Load more.
6. Перевести League Chat / Clubs / Archive на lazy submodes.
