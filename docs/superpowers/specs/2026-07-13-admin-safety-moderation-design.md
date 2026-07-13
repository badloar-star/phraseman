# Admin Safety & Moderation Center — дизайн

Дата: 2026-07-13
Статус: утверждено в рамках ранее одобренной программы Admin v2

## Цель

Перенести пять legacy-возможностей `user-reports`, `safety-flags`, `age-consent`, `compliance-radar` и `ban-list` в единый нативный центр безопасности и модерации без потери функций. Новый центр должен исправить частичные прямые записи из браузера, разрозненные источники состояния блокировки, чрезмерно широкие права чтения и юридически вводящие в заблуждение выводы старого compliance radar.

Генерация новых языков и контента в этот пакет не входит.

## Выбранный вариант

Рассмотрены три варианта:

1. **Единый Safety & Moderation Center — выбран.** Один маршрут `#safety-moderation` внутри категории «Пользователи» объединяет пять legacy-возможностей и существующий Report Center. Это сохраняет семь верхнеуровневых категорий Admin UI Bible и даёт единый профиль пользователя, RBAC, аудит и workflow.
2. **Расширить только Report Center.** Проще по коду, но смешивает продуктовые репорты, угрозы жизни, согласия и блокировки в одной очереди без ясной информационной архитектуры.
3. **Оставить legacy и поставить серверный адаптер.** Быстрее, но сохраняет дублированный интерфейс, две конфликтующие реализации ban list и ненадёжную навигацию.

## Информационная архитектура

Маршрут `#safety-moderation` находится внутри «Пользователи» и содержит семь внутренних представлений:

1. **Обзор** — доступность источников, открытые очереди, незавершённые операции и расхождения проекций без сырого чувствительного текста.
2. **Жалобы пользователей** — `user_reports`, фильтры статуса/причины, поиск UID, профиль, CSV и допустимые действия.
3. **Сигналы безопасности** — `safety_flags`, категории, open/handled, просмотр чувствительных деталей с отдельным аудитом, одиночная и массовая обработка.
4. **Возраст и согласия** — агрегаты `user_consents`: возрастные группы, analytics consent, legal acceptance, платформа, давность и качество данных.
5. **Политика и доказательства** — наблюдаемые факты, качество evidence и расхождения между заявленной политикой и runtime; без автоматического юридического вердикта.
6. **Блокировки** — глобальные блокировки, поиск, сортировка, ручная блокировка/разблокировка, источник истины и состояние проекций.
7. **Другие отчёты** — сохранённый Report Center со всеми существующими источниками, ответами, статусами и фильтрами.

Legacy deep links должны открывать соответствующее внутреннее представление:

| Старый hash | Новое представление |
|---|---|
| `#user-reports` | Жалобы пользователей |
| `#safety-flags` | Сигналы безопасности |
| `#age-consent` | Возраст и согласия |
| `#compliance-radar` | Политика и доказательства |
| `#ban-list` | Блокировки |
| `#report-center`, `#reports` | Другие отчёты |

Все пять capability становятся `native` с `nativeRoute: 'safety-moderation'`. Ожидаемое покрытие после миграции: `59 total / 36 native / 23 fallback`.

## UX-контракт

- Один спокойный заголовок и одна главная кнопка в текущем контексте.
- На ширине 375 px внутренние представления выбираются одним доступным `select`/компактным меню, а не семью тесными кнопками.
- На 768/1024/1440 px используется компактная навигация представлений и data-dense таблицы; на мобильной ширине строки превращаются в карточки.
- Только SVG-иконки; без emoji. У каждой кнопки есть понятная подпись, `title`, фокус с клавиатуры и корректные `aria-*`.
- Ярко-зелёные кнопки и бейджи используют тёмный текст.
- Для каждого источника обязательны `loading`, `empty`, `ready`, `partial` и `error`; ограниченная выборка никогда не называется полной.
- Опасные действия открывают preview с точным объектом, причиной, последствиями, способом восстановления и требуемым подтверждением.
- Сырые сообщения safety не дублируются в профиле и не показываются в списке; полный текст открывается только оператору с правом и оставляет audit event просмотра.

## Серверная архитектура

Backend разделяется на:

- `admin_safety_moderation_core.ts` — чистые типы, allowlist-проекции, фильтры, агрегаты, fingerprints, CSV-защита и compliance evidence без Firestore;
- `admin_safety_moderation.ts` — strict App Check, RBAC, Firestore queries, snapshots, preview/apply/approval/history/audit;
- `admin_global_ban_core.ts` — общий атомарный enforcement для Safety Center, профиля, Report Center и Help Board;
- существующий `admin_reports_center.ts` — только безопасные недеструктивные источники; `user_reports` переводятся на новый command path.

Browser Admin v2 не читает и не пишет `user_reports`, `safety_flags`, `user_consents`, `banned_users` или `user_warnings` напрямую.

## Read-модель и snapshots

`adminGetSafetyModerationWorkspace` принимает `view`, нормализованные фильтры, `uid`, `pageSize`, `cursor`, `snapshotId` и `exportCsv`.

Ответ включает:

- allowlist-проекцию элементов;
- агрегаты и coverage;
- состояние каждого источника `ready | partial | error`;
- `capturedAtMs`, `nextCursor`, `snapshotId`;
- CSV только при наличии export permission.

Снимок:

- привязан к `actorUid`, permission scope, view, фильтрам и `definitionVersion`;
- имеет TTL 30 минут;
- используется повторно для пагинации и CSV, чтобы экран и экспорт не расходились;
- недоступен через Firestore rules;
- не хранит полный raw safety conversation; чувствительные детали загружаются отдельным callable и не входят в CSV.

Каждый ограниченный запрос возвращает честный coverage: просмотрено документов, лимит, причина partial и время среза.

## Compliance: только факты и качество доказательств

Старый radar заменяется на «Политика и доказательства».

Запрещено:

- определять ЕС/ЕЭЗ или иную юрисдикцию по языку интерфейса;
- считать `analyticsConsent: denied` нарушением;
- выводить «соответствует GDPR/COPPA», «юридически безопасно» или автоматический «юридический риск»;
- выдавать клиентский timestamp или редактируемый клиентом consent-документ за надёжный юридический журнал.

Разрешено показывать только наблюдаемые признаки:

- `granted | denied | unknown | invalid | stale`;
- возрастную группу, наличие legal acceptance, платформу, версию политики/условий, если она реально записана;
- полноту и давность данных;
- policy/runtime mismatch, например текст «16+» при отсутствии runtime-ограничения;
- отсутствие необходимых доказательств: страна/юрисдикция, guardian relationship, purpose-specific legal basis и серверный append-only ledger.

`user_consents` маркируется как `client-reported legacy telemetry`. Юридический вывод всегда остаётся внешним решением после утверждения политики и профильной проверки.

## Права доступа

Добавляются permissions:

- `users.moderation.read` — безопасные жалобы и блокировки;
- `users.moderation.safety.read` — списки safety flags;
- `users.moderation.sensitive.read` — полный чувствительный текст с аудитом;
- `users.moderation.aggregate.read` — возраст/compliance агрегаты без документов пользователей;
- `users.moderation.export` — PII/CSV;
- `users.moderation.write` — warning, статусы и обработка safety;
- `users.moderation.identity.write` — rename;
- `users.moderation.ban.write` — глобальный ban/unban;
- `users.moderation.approve` — second-admin approval опасных действий;
- `users.moderation.restore` — допустимый CAS rollback.

Матрица ролей:

| Возможность | Support | Moderator | Analyst | Admin/Owner |
|---|---:|---:|---:|---:|
| Жалобы и безопасные статусы | Да | Да | Только агрегаты | Да |
| Safety flags | Нет | Да | Только агрегаты | Да |
| Полный чувствительный текст | Нет | Да, с аудитом | Нет | Да, с аудитом |
| Age/compliance агрегаты | Нет | Нет | Да | Да |
| CSV с PII | Нет | Нет | Нет | Да |
| Warning | Нет | Да | Нет | Да |
| Rename | Нет | Нет | Нет | Да |
| Ban/unban | Нет | Нет | Нет | Да |
| Second approval | Нет | Нет | Нет | Да |

## Контракт изменений

Любая запись проходит `preview → apply`:

- обязательные `reason`, `previewId`, `requestId`, source fingerprint и confirmation;
- apply повторно проверяет App Check, текущую роль, actor, TTL и неизменность цели;
- idempotency сравнивает `actorUid + operation + request fingerprint`;
- dangerous ban/unban/identity actions требуют одобрения другого owner/admin;
- история неизменяема; восстановление — новая операция, а не редактирование старой истории.

Поддерживаемые операции:

- `report_set_status`, `report_archive_bulk`;
- `report_warn` — warning и `reviewed` атомарно; предупреждение честно обозначается необратимым при текущем клиентском протоколе;
- `report_rename` — единая nickname-транзакция с `name_index`, `users`, `leaderboard`, `public_profiles`; restore только если новое имя всё ещё текущее, а старое свободно;
- `safety_set_disposition`, `safety_handle_bulk` — `handled`, disposition, note, handledBy, server timestamp;
- `user_ban`, `user_unban` — атомарное изменение глобального источника истины и проекций;
- `restore_operation` — только compare-and-set и только для обратимых операций.

Массовые глобальные блокировки не входят в пакет. Bulk status/handle использует серверный manifest, максимум 400 целей и возобновляемые чанки. Частичный результат отображается явно.

## Блокировки и проекции

`banned_users/{canonicalUid}` — runtime source of truth. `users.banned`, отсутствие/наличие `leaderboard` и chat restrictions — отдельные проекции/ограничения, отображаемые как `consistent | inconsistent | unavailable`.

Ban:

- в одной серверной транзакции создаёт `banned_users`, выставляет `users.banned`, сохраняет private before-state leaderboard, удаляет leaderboard и при наличии source report ставит ему `banned`;
- не создаёт и не снимает независимый `league_chat_bans`, если действие явно не является chat restriction;
- не допускает статус жалобы `banned`, если глобальная блокировка не завершилась.

Unban:

- удаляет `banned_users` и снимает `users.banned`;
- восстанавливает leaderboard только из сохранённого before-state и только если текущая запись отсутствует/не изменилась согласно CAS;
- никогда не обещает восстановление, если безопасного before-state нет;
- не снимает независимый chat ban.

Перед включением записи центр формирует read-only reconciliation по `banned_users`, `users.banned`, leaderboard и chat restrictions.

## Совместимость Report Center, профиля и Help Board

- Все существующие источники, reply-функции, статусы и фильтры Report Center сохраняются в «Другие отчёты».
- `adminUpdateReportStatus` запрещает `source: user_reports`, чтобы не обходить новый command workflow.
- Жалоба и safety flag ведут в профиль по canonical UID; профиль возвращает компактные агрегаты и deep link обратно с UID-фильтром.
- Профиль не дублирует raw safety text.
- Старый `helpBoardAdminModerate` не выполняет `ban_author`; legacy UI направляет в Safety Center с UID и source context. Hide/restore/delete/restrict/unrestrict остаются без изменений.
- Один и тот же UID и ban state должны одинаково отображаться в Safety Center, профиле и Report Center.

## Legacy cutover и Firestore rules

Cutover выполняется поэтапно:

1. Индексы, серверные read-модели, snapshots, previews, operations и history.
2. Native UI и production smoke при совместимых legacy rules.
3. Пять legacy-вкладок превращаются в статические архивные экраны со ссылкой в v2; archive mode не читает чувствительные коллекции.
4. Прямые legacy loaders/mutations и две конфликтующие ban-list реализации становятся fail-closed adapters или удаляются после доказанной замены; пользовательская функция при этом сохраняется в v2.
5. Rules ужесточаются только после проверки мобильных путей.

Rules после cutover:

- новые admin snapshot/preview/history/operation коллекции — `allow read, write: if false`;
- `user_reports`, `safety_flags` — admin browser read/write запрещены;
- `banned_users` — browser write запрещён, own-user read сохраняется после identity/emulator теста;
- `user_warnings` — browser write запрещён, read только владельцу после проверки совместимости установленного приложения;
- `user_consents` — admin browser read запрещён; owner client write временно сохраняется до отдельного callable + adoption gate;
- будущий consent callable обязан использовать App Check, canonical UID, allowlist, server timestamps и append-only `consent_events`.

## Проверка и выпуск

Backend:

- allowlist и отсутствие лишнего PII;
- truthful `ready/partial/error`;
- отсутствие language→jurisdiction и ложных consent verdicts;
- RBAC всех ролей;
- strict App Check, actor-bound snapshot/cursor, TTL и CSV formula injection;
- actor-bound idempotency, replay, stale preview и target drift;
- resumable bulk и partial results;
- warning, nickname collision, ban/unban, projection reconciliation и CAS restore;
- rules emulator для чужих warnings, прямых reports/flags/consent writes и server-only коллекций.

Frontend:

- все пять capability native и registry `59/36/23`;
- все legacy aliases открывают правильное представление;
- нет legacy iframe или прямого Firestore SDK;
- permission map совпадает с backend;
- loading/empty/error/partial, keyboard, focus restoration, tooltips и 375 px;
- deep links между Profile, Report Center и Safety Center.

Порядок deploy:

1. Firestore indexes и ожидание `Ready`.
2. Targeted Functions deploy.
3. Canary smoke под Owner, Admin, Moderator, Support и Analyst.
4. `npm run hosting:admin`.
5. Проверка snapshot↔CSV, audit/operation IDs, double apply и profile links.
6. Отдельный rules deploy.
7. Повтор отрицательных browser SDK проверок.
8. Consent write cutover — отдельная стадия после adoption gate.

До deploy требуется финальный advisor review с `DECISION: APPROVED`.

## Критерии завершения

- Пять legacy capability доступны в одном нативном центре без потери функций.
- Legacy для них статический, read-only и не получает чувствительные данные.
- Все записи идут через strict App Check, RBAC, preview/apply, actor-bound idempotency и audit.
- Compliance не классифицирует юрисдикцию по языку и отказ от analytics как нарушение.
- Ban source/projections согласованы; независимые chat bans не стираются.
- CSV совпадает со снимком экрана и защищён от формул.
- Registry показывает `59/36/23`, focused tests и production smoke сохранены как evidence.

## Находки и предложения

- `ENFORCE_APP_CHECK` в части старых functions по умолчанию выключен. Новый центр и затрагиваемые Report/Profile callables должны использовать literal `enforceAppCheck: true`.
- Тексты возрастной политики и runtime сейчас расходятся. Центр показывает это как mismatch, но не делает юридический вывод.
- Текущие consent-документы не являются append-only журналом доказательств; серверный ledger нужен отдельным совместимым этапом.
- Полное закрытие чтения `user_warnings` требует проверки старых мобильных версий, потому что приложение сейчас читает коллекцию напрямую.
- Для snapshot/history нужен TTL/retention без хранения сырого safety conversation.
