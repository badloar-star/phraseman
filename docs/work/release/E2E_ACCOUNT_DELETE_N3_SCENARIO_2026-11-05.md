Governance-ID: TG-9148CC673C38

# Сквозное удаление аккаунта №3: сценарий для «Эмулятора» (05.11, №171)

Сервер удаления выложен в бою 05.11: accountdeletemine-00068, accountdeleteworker-00041, accountdeleteretrycron-00035 (в нём этап `auth_extra_closure` = закрытие лишних записей входа Apple/Google/e-mail). Сам я ничего не удаляю: удаление нажимает исполнитель на AVD Pixel_8, аккаунт №3, **№1 не трогать**.

## 0. Условия до начала (проверить и написать «Ядру»)
1. Вход на AVD выполнен аккаунтом №3 (через Google). Записать, каким способом входили.
2. На аккаунте ненулевой прогресс: есть монеты, хотя бы один пройденный урок, имя профиля. Записать числа до удаления (монеты, XP, пройденные уроки) для сверки восстановления.
3. Телефон в сети, Metro не обязателен. Логи: `adb logcat -s ReactNativeJS` в файл, фильтры ниже.
4. Написать «Ядру»: «запускаю удаление №3, время ЧЧ:ММ». Ядро в этот момент читает серверные логи.

## 1. Действия на устройстве
1. Настройки → Аккаунт → «Удалить аккаунт» → подтвердить (по макету экрана удаления).
2. Дождаться экрана после удаления (выход на онбординг/вход). Записать время и скриншот.
3. Не закрывать приложение 60 секунд.

## 2. Что должно быть в журнале телефона
Фильтры: `[ACCOUNT-DELETE-UI]`, `[ACCOUNT-GONE]`, `[AUTH-RETIRED]`.
- `[ACCOUNT-DELETE-UI]` — нажатие, вызов, результат (без `error_`).
- `[ACCOUNT-GONE]` — шаги `reset_start` … завершение, без `result: error_*`.
- Нет `account_delete_pending` ошибок на этапе входа сразу после удаления (допустимы только как предупреждения).

## 3. Что должно быть на сервере (читает «Ядро», команда ниже)
Облачные функции, регион us-central1:
- `accountDeleteMine` (вызывается телефоном): запись `account_deletion_jobs/{jobId}`, стадии `closure_fenced` → `closure_committed` → `credential_safe`; лог тегом `[ACCOUNT-DELETE-ENQUEUE]`.
- `accountDeleteWorker` (триггер на запись задачи): стадии удаления по порядку: `accounts_v2_receipt`, `permanent_denials`, `collect_peers`, `direct_docs`, `arena_sessions_and_match_history`, `arena_v2_matches_and_members`, `arena_season_entries`, `friend_duels_anonymize`, `field_matches`, `collection_group_matches`, `email_matches`, `promo_resolved_matches`, `email_contacts`, `league_groups`, `arena_club_events`, `activity_like_stats`, `explain_reports_reporters`, `spire_ladder_scrub`, `spire_groups_members`, `banned_users_hash`, `friend_gift_daily_limits`, `merge_identity_records`, `account_authority_purge`, `accounts_v2_purge`, `tombstone`, **`auth_extra_closure`**. Каждая стадия пишет в лог `[ACCOUNT-DELETE]` с временем; провал одной не должен ронять остальные.
- `accountDeleteRetryCron` (каждые 120 минут, подбирает задачи с `nextAttemptAtMs` или истёкшей арендой): в окне теста его вмешательство НЕ ожидается; если задача застряла, он повторит через ≤ 2 часа. Если по логам cron взял задачу в окне теста — это сигнал о застрявшей стадии, сообщить.

Команда чтения логов (Ядро):
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name=("accountdeletemine" OR "accountdeleteworker" OR "accountdeleteretrycron") AND timestamp>="<время начала>"' --project phraseman-ea0b3 --limit=200 --format="value(timestamp,resource.labels.service_name,textPayload)"
```

## 4. Что проверить в Firestore после удаления (Ядро, только чтение)
- `account_deletion_jobs/{jobId}`: стадия итоговая (завершено), счётчик ошибок 0, нет `failedStage`.
- `account_deletion_tombstones/{stableUid}`: есть (держится ограниченный срок).
- `users/{stableUid}`: документа нет (если пользователь не восстановил аккаунт).
- Подколлекции `users/{stableUid}/*` пусты: `friends`, `energy_gifts` (после выкладки подарка), `friend_lesson_invites`.
- Auth: основной пользователь удалён; лишние записи входа с тем же e-mail (Apple/Google/e-mail) закрыты стадией `auth_extra_closure`. Журнал стадии содержит хэши/коды, не адреса.
- Журнал администрирования не содержит ошибок уровня ERROR.

## 5. Повторный вход после удаления
1. Войти тем же способом (Google №3).
2. Ожидание: создаётся ЧИСТЫЙ аккаунт без прежнего прогресса и без сообщения «ожидает удаления» дольше положенного окна. Если показан запрос на восстановление (`[ACCOUNT-RESTORE]`) — это путь A10 (восстановление), его проверять отдельным прогоном.
3. Сверить числа из п. 0.2: у нового аккаунта они нулевые, у восстановленного прежние.

## 6. Критерии «зелёный / красный»
Зелёный: все стадии воркера выполнены, `auth_extra_closure` без ошибок, повторный вход даёт чистый аккаунт, в телефонном журнале нет `error_*`. Красный: любой `result: error_*`, задача застряла на стадии дольше 5 минут, повторный вход упирается в `account_delete_pending` дольше окна, либо остались записи входа.
При красном: ничего не чинить «вслепую», прислать «Ядру» фрагменты журнала (телефон и сервер) и время, разбор по правилу «сперва логи».

## 7. Откат / восстановление данных тестового аккаунта (A10)
После теста восстановить №3 по сценарию A10 (экран восстановления) в окне, пока действует срок удержания. Если окно упущено, аккаунт №3 создаётся заново и наполняется данными для следующих прогонов.
