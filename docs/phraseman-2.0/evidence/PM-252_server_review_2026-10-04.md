# PM-252 — review сервера: удаление, лимиты, диагностика, расходы (2026-10-04, Ядро)

Только чтение: код `functions/src` и `app/`, `gcloud functions list` (548 развёрнутых), `count()` по `users` = **5598**. Разбор вели три read-only разведчика; ключевые места проверены вручную (помечено ✔), остальное — по их отчёту с file:line. Неизвестное — «unknown», не 0.

## 1. Удаление аккаунта (account_delete.ts)

Покрыто широко: деревья `users/{stable|auth}` рекурсивно, ~100 коллекций по полю, collection-group (сообщения, реакции, голоса, уведомления), друзья у других людей, email-контакты (анонимизация), лиги/клубы (анонимизация). Журналы удаления хранятся намеренно (только хеши). Хранилище файлов (Storage) персональных путей не имеет — удалять нечего.

**🔴 Не чистится при удалении (персональные данные остаются):**
| Коллекция | Что лежит | Где пишется |
|---|---|---|
| `user_warnings` | uid, имя, текст предупреждения админа | admin_user_operations.ts:285 |
| `explain_report_entries` | stableUid/authUid, свободный комментарий, ответ ученика | explain/explain_reports.ts:168, :240 |
| `explain_reports/{hash}` | reporters[stableUid], lastReporterStableUid | explain_reports.ts:191, :263 |
| `spire_groups` | members.{stableUid} с отображаемым именем | spire_groups.ts:148, :276-309 |
| `top_helpers/{uid}` | публичная проекция «Топ хелперов» | report_replies.ts:402 |
| `friend_pairs` | пары stableId | friends_together.ts:289 |
| `premium_dialog_billing` / `_quotas` / `_rate_limits` | uid/authUid в каждом вызове | premium_dialog.ts:252-300, :1417, :1861 |
| `client_report_rate_limits`, `explain_report_rate_limits`, `spire_task_report_reservations` | оба uid | client_reports.ts:556, :730; explain_reports.ts:164 |
| `banned_users/{uid}`, `users_dedup_archive/{uid}` | uid (бан — возможно намеренно против обхода; архив — копия профиля) | admin_user_operations.ts:303, :373 |
| unknown: `dialogue_v2_sessions`, `*_billing` ИИ, `account_authority_*` (AccountV2) | возможно uid/хеш | — |

Мягкие отказы: если чтение email из Auth упало (`account_delete.ts:621`), `website_contact_inbox` и `email_contacts` молча пропускаются, а удаление считается завершённым.

## 2. Лимиты и логи причин (функции, доступные любому вошедшему)

Глобально `maxInstances: 10` (index.ts:27) — защита процессора, не лимит на человека.

**🔴 Без лимита на человека:**
- `promoCodeRedeem` (promo_codes.ts:182) — перебор кодов без ограничения, неверный код = тихий `ok:false`. Самый высокий риск злоупотребления.
- `friendLookupUser` (friend_lookup.ts) — без лимита и логов, перечисление пользователей.
- `friendEnsureMyCode`, `friendsGetProfiles` (пакетное чтение профилей), `progressSubmitEvent`, `progressMigrateSnapshot`, `referralSpin`/`referralClaimSpin` (только баланс), опросы, `emailUnsubscribe` (HTTP без авторизации и без maxInstances).

**🟡 Чтение бана «молча открывает»:** `.catch(() => null)` на `banned_users` в friend_codes.ts:74 и leaderboard.ts:125 — при сбое чтения забаненный проходит.

**🟡 Немые отказы в платных ИИ:** `explainChoice` (0 логов на всю функцию), `dialogueV2SessionStart` / `FreeformSessionStart` / `FreeformSessionTurn` / `PreparedBotVoiceResolve` (0 логов на отказах), `ai_globally_disabled` без лога в premium_dialog.ts:1121, premium_dialog_review.ts:610, mistake_explain.ts:887; `releaseMonthlyQuota(...).catch(() => undefined)` в dialogue_v2_turn_production_callable.ts:~829 — неудавшийся возврат квоты не виден (человек теряет попытку молча). Файлы без логов при многих отказах: community_packs.ts (52 throw / 2 лога), promo_codes.ts (18/2), practice_rune_grant.ts, onboarding_funnel.ts, leaderboard.ts, vip_survey.ts, settings_poll_vote.ts, feedback_entries.ts.

## 3. Дорогие чтения Firestore (развёрнутое; 5598 users)

Цена чтения ≈ $0.06 за 100 тыс. (us-central1). Оценки — порядок величины.

| # | Где | Что | Оценка | Дешевле |
|---|---|---|---|---|
| 1 | app/_layout.tsx:1222 → app_messages.ts:1492 (клиент) | 3 запроса × до 80 док на КАЖДЫЙ возврат в приложение (force:true) | до 240 чтений × заходы × DAU — крупнейший источник | убрать force, TTL/minIntervalMs, курсор `createdAtMs > lastSeen` |
| 2 | components/AppMessagesInbox.tsx:354 | те же 240 чтений при каждом обновлении видимого инбокса (minIntervalMs 0) | × открытия | троттлинг 30–60 с + курсор |
| 3 | app/firestore_leaderboard.ts:453 | 130–480 чтений на промах кэша (кэш 3 мин) | × открытия | серверный снимок топ-100 (1 чтение), TTL 15–30 мин |
| 4 | app/community_packs/communityFirestore.ts:330-338, :280 | 100–200 чтений на открытие маркета | × открытия | агрегатный документ + кэш |
| 5 | admin_alert_dispatcher.ts:390 `adminAlertRecoveryCron` ✔ развёрнут | каждую минуту 3 запроса; `leaseUntilMs < now` может цеплять завершённые | ≥ 4,3 тыс./сутки, растёт с журналом | раз в 5 мин + фильтр по статусу |
| 6 | premium_expiry_cron.ts:209 ✔ | полный проход users раз в сутки | ~5,6 тыс./сутки | запрос по индексу `premiumExpiresAtMs <= now` |
| 7 | re_engage_push.ts:466 ✔ и premium_expiry_reminder.ts:313 ✔ | два ежедневных прохода по users с токеном | ≤ 2×5,6 тыс./сутки | один общий проход или запросы по полям |
| 8 | admin_push_jobs.ts:335 ✔ | проход по users на каждую рассылку | 5,6 тыс. × рассылки | сегмент-запрос |
| 9 | app/flashcards_cloud_pages.ts:138 | вся подколлекция страниц карточек на каждую запись | страницы × записи | манифест со счётом |
| 10 | account_delete_worker.ts:46, auth_merge.ts:1454 ✔ | лиз-запросы могут повторно читать завершённые задания | сотни/сутки | фильтр по статусу |

Отсечено: ежеминутные кроны турниров (`tournamentFillBots`, `tournamentAdvanceRooms`) и `maxVoiceWatchdog` — ✔ не экспортируются и не развёрнуты, денег не тратят.

## 4. Список правок по приоритету

1. 🔴 Удаление аккаунта: добавить в план удаления `user_warnings`, `explain_report_entries`, `explain_reports.reporters`, `spire_groups.members`, `top_helpers`, `friend_pairs`, `premium_dialog_*`, `*_rate_limits`, `spire_task_report_reservations`; решить по `banned_users` (оставить как хеш?) и `users_dedup_archive`. Проверить Privacy Policy (право на удаление).
2. 🔴 `promoCodeRedeem` — лимит попыток на человека (например, 10/час) + лог неверных кодов.
3. 🟡 Клиент: app_messages без force на каждом возврате (TTL + курсор) — крупнейшая экономия чтений.
4. 🟡 Логи причин отказов в explainChoice, dialogueV2* (старт/фриформ), `ai_globally_disabled`, возврат месячной квоты диалога.
5. 🟡 Чтение `banned_users` — fail-closed или хотя бы лог.
6. 🟡 Кроны: adminAlertRecovery раз в 5 мин; premiumExpiry по индексу; объединить ежедневные проходы.
7. 🟡 Лидерборд и маркет наборов — серверные снимки.
