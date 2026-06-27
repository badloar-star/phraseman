# Admin v2 section routing audit

Дата: 2026-06-26  
Источник правил: `docs/design/ADMIN_UI_BIBLE.md`  
Файл проверки: `admin/index.html`

## Зачем этот документ

Перед переносом в админку v2 нужно понять, где старые вкладки живут неправильно:

- что должно быть в "Приложение";
- что должно быть в "Пользователи";
- что относится к "Деньги";
- что относится к "Контент";
- что относится к "Комьюнити";
- что должно уйти в "Диагностика";
- что не должно торчать в первом меню.

Старый `admin/index.html` уже имеет группы `Core`, `People`, `Revenue`, `Content & delivery`, `Arena`, `Diagnostics`, но этого мало. Некоторые вкладки смешивают разные типы данных и должны быть разложены аккуратнее.

## Главные проблемы текущей маршрутизации

### 1. Diagnostics смешан с Core

Сейчас `app-health` в `ADMIN_TAB_GROUPS` лежит в `core`, хотя по смыслу это диагностика и release health.

Правильно для v2:

- App Health -> Диагностика / Health
- Release Health -> Диагностика / Release Health
- Global alerts -> Обзор + Диагностика

### 2. Ops log смешивает разные журналы

Сейчас `ops-log` читает:

- `admin_log`
- `error_reports`
- `user_reports`

Это удобно как быстрый snapshot, но по смыслу это три разных типа событий:

- admin/audit changes;
- content bug reports;
- user moderation reports.

Правильно для v2:

- Audit log: только кто что изменил в админке.
- Ops log: операционные события и системные действия.
- Reports inbox: входящие репорты, которые требуют обработки.
- Archive: обработанные/закрытые события.

### 3. Reports разнесены без понятной модели

Сейчас есть:

- `reports`
- `user-reports`
- `explain-reports`
- `website-inbox`
- `community_pack_reports`
- `league_chat_reports`

Проблема: все называется "reports", но это разные рабочие очереди.

Правильно для v2:

- Контент / Content reports: ошибки уроков, переводов, аудио, объяснений.
- Пользователи / User reports: жалобы на пользователей.
- Комьюнити / Chat reports: жалобы на чат, лиги, UGC.
- Диагностика / System reports: технические ошибки.
- Support / Site inbox: сообщения с сайта.

### 4. Archive и Audit archive не должны быть верхним уровнем

Сейчас `archive` и `changelog-0608` видны как обычные вкладки.

Правильно для v2:

- Archive -> Диагностика / Archive
- Audit archive -> Диагностика / Archive / Legacy audits

Они не должны конкурировать с ежедневными рабочими разделами.

### 5. OpenAI budget находится в Revenue, но по смыслу это AI Ops

Сейчас `openai-budget` лежит в `revenue`.

Правильно для v2:

- если это расходы на AI-инфраструктуру: Диагностика / AI Ops / Budget;
- если это настройка платной функции Theo: Приложение / AI features;
- если это влияет на монетизацию: Деньги / AI cost analytics, но не в основном revenue.

В v2 нужна явная категория: `AI Ops`.

### 6. Alerts сейчас слишком общий раздел

`alerts` должен стать не вкладкой с разрозненными настройками, а системой `Global alerts`.

Правильно для v2:

- алерты видны на Overview;
- полный список в Диагностика / Global alerts;
- каждый alert имеет severity, owner, suggested action, source link, mute until.

### 7. Arena и League частично разделены

Сейчас есть:

- `clubs`
- `league-chat`
- `arena-ranks`
- `arena-live`
- `arena-bets`
- `arena-rooms`

Правильно для v2:

- Комьюнити / Лиги
- Комьюнити / Чаты
- Комьюнити / Арена


## Таблица миграции текущих вкладок

| Старая вкладка | Сейчас | Куда в v2 | Комментарий |
|---|---|---|---|
| `control-panel` | Core | Приложение / Пульт | Разбить на update, banners, maintenance, flags, AI features. |
| `overview` | Core | Обзор | Оставить, но убрать длинные таблицы. |
| `analytics` | Core | Обзор + Деньги + Диагностика | Разделить продуктовые, revenue и health-метрики. |
| `app-health` | Core | Диагностика / App Health | Сейчас лежит не там. Добавить release health. |
| `openai-budget` | Revenue | Диагностика / AI Ops | Не смешивать с доходами. |
| `mod-queue` | People | Комьюнити / Модерация | Если очередь про контент/чат, не держать в People. |
| `ideas` | System fallback | Контент или Обзор / Ideas | Нужен владелец и workflow. |
| `users` | People | Пользователи / Поиск | Центральная страница пользователя. |
| `testers` | People | Пользователи / Testers | Отдельная подстраница. |
| `reports` | People | Контент / Content reports | Это контентные ошибки, не People. |
| `user-reports` | People | Пользователи / Жалобы | Оставить в Users/Moderation. |
| `explain-reports` | People | Контент / Explain reports | Это качество объяснений. |
| `website-inbox` | People | Диагностика или Support / Site inbox | Это support inbox, не People. |
| `ban-list` | People | Пользователи / Блокировки | Оставить рядом с профилями. |
| `premium` | Revenue | Деньги / Premium | Нужны permissions. |
| `vip` | Revenue | Деньги / VIP | Нужны sensitive actions. |
| `cancel-surveys` | Revenue | Деньги / Cancel surveys | Можно связать с churn analytics. |
| `review-promo` | Revenue | Деньги / VIP survey | Переименовать. |
| `referrals` | Revenue | Деньги / Referrals | Оставить. |
| `paywall-ab` | Revenue | Деньги / Paywall experiments | Добавить campaign wizard/control group. |
| `refunds` | Revenue | Деньги / Refunds | Требует approval. |
| `ugc-purchases` | Content & delivery | Деньги + Контент | Покупки UGC денежные, но связаны с контентом. Нужен cross-link. |
| `app-messages` | Content & delivery | Приложение / In-app messages | Это campaign channel. |
| `push-notify` | Content & delivery | Приложение / Push campaigns | Делать через Campaign Wizard. |
| `community-packs` | Content & delivery | Контент / Community packs | Оставить в Контент. |
| `card-packs` | Content & delivery | Контент / Card packs | Оставить. |
| `daily-phrases` | Content & delivery | Контент / Daily phrases | Оставить. |
| `explain-cache` | System fallback | Контент / Explain cache | Сейчас не указан в `ADMIN_TAB_GROUPS`, уходит в system. Исправить в v2. |
| `compass` | System fallback | Приложение или Диагностика | Нужна ревизия: если feature, в Приложение; если QA, в Диагностика. |
| `remote-config` | Diagnostics | Приложение / Feature flags | Не как сырой system-раздел, а Flag Registry. |
| `onboarding-qa` | Diagnostics | Приложение / Onboarding QA | QA, но по продуктовой зоне onboarding. |
| `alerts` | Diagnostics | Обзор + Диагностика / Global alerts | Сделать alert-системой. |
| `audit` | Diagnostics | Диагностика / Audit log | Только изменения админов. |
| `ops-log` | Diagnostics | Диагностика / Ops log | Разделить источники и saved views. |
| `archive` | Diagnostics | Диагностика / Archive | Убрать из первого уровня. |
| `changelog-0608` | Diagnostics | Диагностика / Legacy audit archive | Убрать из первого уровня. |
| `league-chat` | Arena | Комьюнити / Чат лиг | Модерация и rooms. |
| `arena-ranks` | Arena | Комьюнити / Арена / Рейтинги | Табличный режим. |
| `arena-bets` | Arena | Комьюнити / Арена / Bets | Если есть деньги/риски, добавить permissions. |
| `arena-rooms` | Arena | Комьюнити / Арена / Rooms | Оставить. |

## Проверка индексов и запросов

Перед переносом каждого раздела в v2 нужно составить query contract.

Для каждого запроса фиксировать:

- collection;
- where/orderBy/limit;
- нужен ли composite index;
- сколько документов читаем;
- есть ли пагинация;
- есть ли cache TTL;
- есть ли fallback при missing index;
- какой empty/error state показываем.

### App Health

Текущие источники:

- `app_errors`
- `app_activity`

Текущая логика:

- `app_errors`: orderBy `createdAt desc`, limit 500, paging через `startAfter`;
- `app_activity`: orderBy `createdAt desc`, limit 150;
- фильтр по severity, feature, status, search;
- KPI: status, critical, warnings, affected users, top repeat;
- есть копирование отчета для AI.

Проблемы/улучшения для v2:

- добавить Release Health: version adoption, crash-free users/sessions, error rate;
- добавить grouping by fingerprint как основную view;
- добавить saved views: Critical open, New by version, Top repeated, Affected paying users;
- добавить owner/suggested action для групп ошибок;
- `reviewed/fixed/known` должны попадать в audit log;
- проверять composite index для `status + createdAt`, `feature + createdAt`, если появятся такие запросы.

### Ops Log

Текущие источники:

- `admin_log` limit 120;
- `error_reports` limit 60;
- `user_reports` limit 60.

Проблемы/улучшения для v2:

- разделить audit events и incoming reports;
- добавить source tabs: Admin changes, System events, Content reports, User reports;
- добавить saved views: Dangerous actions, Payments, Bans, Force update, Campaign changes;
- добавить actor/adminEmail в основную строку;
- добавить entity link: user, campaign, flag, report;
- добавить rollback link, если событие откатываемое;
- не считать `error_reports` и `user_reports` как ops без понятного label.

### Audit Log

Нужно оставить только:

- кто изменил;
- что изменил;
- старое значение;
- новое значение;
- когда;
- где;
- можно ли откатить.

Не смешивать с user/content reports.

### Reports

Текущие типы reports нужно разнести:

- content reports;
- user reports;
- explain reports;
- community pack reports;
- league chat reports;
- site support inbox.

Для каждого нужен:

- owner;
- SLA;
- status;
- severity;
- source screen;
- assignee;
- bulk actions;
- archive reason.

### Archive

Archive должен быть read-mostly.

Правила:

- не грузить все архивы сразу;
- фильтры по типу;
- поиск по UID/campaign/report;
- восстановление только через confirm;
- отдельная вкладка Legacy audits для старых чеклистов.

## Что добавить в план v2

- Разделить `Diagnostics` на понятные подстраницы.
- Сделать `Global alerts` первым уровнем внутри Overview, но не отдельной вкладкой первого меню.
- Сделать `Saved views` как универсальный механизм для очередей.
- Сделать `Query Contract` обязательным для каждой страницы.
- Для `App Health` добавить release health и version adoption.
- Для `Ops Log` добавить source routing и убрать смысловую кашу.
- Для `Reports` сделать inbox-модель.
- Для `Archive` убрать все legacy-аудиты из главного меню.

## Главное правило

Старая админка была списком вкладок. v2 должна быть картой работы.

Каждый входящий сигнал должен попасть в правильную коробку:

- ошибка приложения -> App Health;
- действие админа -> Audit log;
- техническое событие -> Ops log;
- жалоба пользователя -> User reports;
- ошибка контента -> Content reports;
- сообщение с сайта -> Support inbox;
- старая запись -> Archive;
- срочная проблема -> Global alerts.
