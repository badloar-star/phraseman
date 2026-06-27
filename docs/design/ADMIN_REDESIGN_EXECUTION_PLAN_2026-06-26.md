# План полной переделки админки Phraseman

Дата: 2026-06-26  
Главный источник правил: `docs/design/ADMIN_UI_BIBLE.md`  
Макет направления: `docs/design/admin-redesign-mockup-2026-06-26.html`  
Аудит маршрутизации разделов: `docs/design/ADMIN_V2_SECTION_ROUTING_AUDIT_2026-06-26.md`  
Матрица legacy-переноса: `docs/design/ADMIN_V2_LEGACY_MIGRATION_MATRIX_2026-06-27.md`  
Аудит legacy-кнопок: `docs/design/ADMIN_V2_LEGACY_BUTTON_FUNCTION_AUDIT_2026-06-27.md`  
Аудит legacy-функций: `docs/design/ADMIN_V2_LEGACY_FUNCTION_TRANSFER_AUDIT_2026-06-27.md`  
Финальный readiness report: `docs/design/ADMIN_V2_FINAL_READINESS_REPORT_2026-06-27.md`  
Текущий объект: `admin/index.html`

## Прогресс реализации v2

Обновлено: 2026-06-27.

- Готова отдельная v2-оболочка: `admin/v2/index.html`, `admin/v2/styles/admin.css`, `admin/v2/scripts/admin-core.js`, `admin/v2/scripts/admin-router.js`, `admin/v2/scripts/admin-firebase.js`.
- `Application` уже умеет manual update modal отдельно от force update, promo banner, maintenance и Flag Registry через preview/audit-safe форму.
- `Campaigns` показывает live campaigns, audience rules, scheduled changes, global alerts, campaign tasks, Campaign Wizard и query contract. Campaign Wizard теперь работает как read-only workflow checklist: message, audience, delivery rules, preview, approval and schedule.
- `Team` показывает current access, permission matrix, approval requests, scheduled changes, team registry, audit coverage и query contract. Статусы приведены к понятным словам: `нужен вход`, `контракт`, `пусто`, `ошибка`.
- `Diagnostics` получил Global alerts: алерты собираются из уже загруженных remote config, Diagnostics, Team и Campaigns без нового realtime presence-потока.
- `Users` получил User Activity Timeline summary: количество событий, источники, последний сигнал и ошибки источников над лентой.
- `Money` получил Money safety policy: refund, VIP grant/revoke, paywall publish и sensitive data правила видны до любых write-действий.
- `Content` получил Publish policy: daily phrases, card packs, explain cache и source health показывают правила preview/approval/audit до публикации.
- `Community` получил Live signals: UGC, League, Arena и Data safety собираются только из существующих Firestore-источников и не рисуют фейковый онлайн.
- `Diagnostics` получил Migration coverage: 42 legacy-вкладки, 314 старых кнопок и 306 inline onclick разложены по новым разделам со статусами `В v2`, `Workflow`, `Fallback`.
- Для legacy-функций добавлен detail workflow: новый раздел, риск, статус, safe workflow и fallback-ссылка в старую админку.
- Добавлен Native completion board: все бывшие `Fallback`-направления получили v2-дом. Текущий migration status: `33` в v2, `9` workflow, `0` fallback.
- Добавлен Safe write workflows board: опасные действия (`remote-config`, push/in-app, ban, paywall, content publish, arena bets) не пишут напрямую и идут через preview, permission, approval, audit и rollback.
- Добавлен Button/function audit: `314` legacy-кнопок проверяются скриптом `node scripts/admin-legacy-button-audit.mjs`; v2 показывает основные проблемные зоны и gate перед переносом.
- Добавлен Function transfer board: `626` legacy-функций, `119` пишущих функций и `110` связанных write-действий разложены на native lane, guarded write, backend contract и inspect before move.
- Добавлен Launch readiness: Admin v2 готов как основной рабочий вход; старый `admin/index.html` оставлен только как архивный аварийный доступ для сверки.
- `Environment switcher` показывает выбранный UI-контекст, сохраняет его локально и явно показывает реальный Firebase project `phraseman-ea0b3`.
- Левое меню больше не содержит фейковые статичные счетчики. Бейджи скрыты до реальной загрузки данных и появляются только от вычисленных источников.
- Визуальная карта онлайн-пользователей полностью отменена: UI-раздел и отдельная presence-инфраструктура удалены из плана и реализации.
- Все новые интерактивные элементы должны проходить tooltip-гейт. Единственное допустимое исключение - `skip-link` для доступности.

## Цель

Переделать админку в простую, быструю и понятную рабочую панель:

- 7 крупных разделов вместо длинного списка вкладок;
- единые кнопки, поля, модалки, таблицы и подсказки;
- иконка плюс текст почти везде;
- подробный tooltip у каждой кнопки;
- никакого визуального мусора и случайных цветов;
- никакие плашки и панели не перекрывают контент;
- редкие и опасные функции спрятаны в понятные места, но не удалены;
- массовые действия идут через preview, confirm, audit log и быстрый off switch.

Главная проверка из библии:

> Новый сотрудник должен понять: что включено, что будет после нажатия и где отменить.

## Нельзя нарушать

- Не удалять существующий функционал без отдельного прямого запроса.
- Не менять backend-контракты без необходимости.
- Не ломать текущую админку во время миграции.
- Не добавлять новые кнопки без tooltip.
- Не добавлять новые экраны вне 7 категорий.
- Не использовать emoji как UI-иконки.
- Не делать внутренние ключи главным текстом интерфейса.
- Не переносить опасные действия без confirm/audit.

## Текущее состояние

Факты по текущему `admin/index.html`:

- примерно 30 348 строк;
- примерно 314 кнопок;
- десятки вкладок и подэкранов;
- много inline-style;
- много inline `onclick`;
- часть кнопок без подробного tooltip;
- часть иконок сделана emoji;
- много функций живут в одном HTML-файле;
- меню перегружено и заставляет помнить расположение функций.

Вывод: безопасная стратегия - параллельная новая оболочка с постепенным переносом функций, а не мгновенная перепись монолита.

## Стратегия миграции

### Выбранный путь

Создать новую админскую оболочку рядом со старой:

- `admin/v2/index.html` - новая оболочка;
- `admin/v2/styles/admin.css` - дизайн-система;
- `admin/v2/scripts/admin-core.js` - общие утилиты;
- `admin/v2/scripts/admin-api.js` - общие Firebase/admin операции;
- `admin/v2/scripts/admin-router.js` - навигация и lazy loading;
- `admin/v2/scripts/components/*.js` - компоненты;
- `admin/v2/scripts/pages/*.js` - страницы разделов.

Старый `admin/index.html` остается рабочим до конца миграции. Новая админка сначала доступна как отдельный вход, потом становится основной.

### Почему так

- меньше риск сломать продакшен-инструменты;
- можно переносить по одному разделу;
- можно сравнивать старый и новый экран;
- можно быстро откатиться;
- можно проверять каждую функцию отдельно.

## Обязательные модули после внешнего ресерча

После ресерча Duolingo for Schools, Google Play Console, App Store Connect, Firebase, LaunchDarkly, Braze, OneSignal, Stripe, Shopify, Contentful и release-health подходов в v2.0 должны быть запланированы дополнительные модули.

### Добавить в v2.0 roadmap

- Team & permissions
- Approval requests
- Scheduled changes
- Progressive rollout
- Flag registry
- Flag lifecycle
- Campaign wizard
- Audience builder
- Frequency caps
- Quiet hours
- Control group
- Release health
- User activity timeline
- Campaign analytics
- Content tasks
- Global alerts
- Saved views
- Environment switcher
- Rollback center
- Query contract для каждого раздела
- Section routing audit перед переносом каждой вкладки

### Как это влияет на этапы

- Этап "Приложение" должен включать progressive rollout, scheduled changes, release health и rollback center для update modal, banners, maintenance и flags.
- Этап "Remote config и feature flags" должен стать не сырой таблицей ключей, а Flag Registry с owner, lifecycle, risk, review date, rollback value и approvals.
- Этап "Пользователи" должен получить Activity Timeline по пользователю.
- Этап "Деньги" должен зависеть от Team & permissions и sensitive permissions.
- Этап "Контент" должен получить Tasks и publish workflow.
- Этап "Диагностика" должен получить Global alerts, Saved views, Release health и Rollback center.
- Перед переносом старой вкладки нужно сверяться с `ADMIN_V2_SECTION_ROUTING_AUDIT_2026-06-26.md`, чтобы не переносить старые ошибки категорий.
- Для `Ops Log`, `App Health`, `Reports`, `Archive`, `OpenAI budget`, `Alerts` и `Arena live` нужен отдельный query contract: какие коллекции читаем, какой limit, нужна ли пагинация, какие индексы нужны, какой fallback при missing index.

## Новая навигация

Новый первый уровень меню строго из 7 разделов:

1. Обзор
2. Приложение
3. Пользователи
4. Деньги
5. Контент
6. Комьюнити
7. Диагностика

Каждый пункт меню:

- имеет Lucide-иконку;
- имеет понятный русский текст;
- имеет активное состояние;
- имеет tooltip;
- не содержит emoji;
- не содержит внутренний ключ как главный текст.

## Карта переноса старых вкладок

### Обзор

Сюда переносим:

- `overview`
- активные кампании из `control-panel`
- последние изменения из `audit`
- критические ошибки из `app-health`
- быстрые действия: update modal, баннер, maintenance, поиск пользователя.

Первый экран должен показывать только важное сегодня.

### Приложение

Сюда переносим:

- `control-panel`
- `remote-config`
- `app-messages`
- `push-notify`
- `alerts`
- `onboarding-qa`
- часть `app-health`

Подстраницы:

- Обновление приложения
- Баннеры
- Технические работы
- Feature flags
- Remote config
- Push
- Сообщения в приложении
- Версии и сторы

Первый приоритет: `Обновление приложения`, `Баннеры`, `Технические работы`.

### Пользователи

Сюда переносим:

- `users`
- `ban-list`
- `mod-queue`
- `premium grant`
- user detail overlay
- duplicate users tools
- user analytics overlay

Подстраницы:

- Поиск пользователя
- Профиль
- Доступ и блокировки
- VIP / Premium вручную
- Жалобы
- История пользователя

### Деньги

Сюда переносим:

- `premium`
- `vip`
- `paywall-ab`
- `cancel-surveys`
- `review-promo`
- `ugc-purchases`
- `refunds`
- `referrals`
- revenue/analytics pieces

Подстраницы:

- Подписки
- Paywall
- Выгодные предложения
- Промокоды
- Возвраты
- Referrals
- Revenue-метрики

### Контент

Сюда переносим:

- `daily-phrases`
- `card-packs`
- `community-packs`
- explanation content tools
- cache/content QA where relevant

Подстраницы:

- Фразы дня
- Карточные паки
- Community packs
- Импорт
- Проверка качества
- Кэш объяснений

### Комьюнити

Сюда переносим:

- `clubs`
- `league-chat`
- `arena-ranks`
- `arena-live`
- `arena-bets`
- `arena-rooms`
- UGC moderation
- reports related to users/community

Подстраницы:

- Лиги
- Чаты
- Арена
- Комнаты
- Жалобы
- Модерация

### Диагностика

Сюда переносим:

- `audit`
- `ops-log`
- `reports`
- `website-inbox`
- `user-reports`
- `explain-reports`
- `openai-budget`
- `app-health`
- `archive`
- `changelog-0608`
- advanced repair tools

Подстраницы:

- Audit log
- Ops log
- Health
- Отчеты
- Support inbox
- OpenAI budget
- Архив
- Advanced tools

Отдельно проверяем по аудиту маршрутизации:

- `app-health` сейчас лежит в Core, но в v2 должен быть в Диагностике вместе с Release Health.
- `ops-log` сейчас смешивает `admin_log`, `error_reports` и `user_reports`; в v2 это нужно разделить на Audit Log, Ops Log, Reports Inbox и Archive.
- `openai-budget` сейчас лежит в Revenue, но по смыслу это `AI Ops`, если речь о расходе AI-инфраструктуры.
- `reports`, `user-reports`, `explain-reports`, `website-inbox`, `community_pack_reports` и `league_chat_reports` должны стать понятными очередями, а не одной кашей reports.
- `archive` и `changelog-0608` должны уйти из первого уровня в Diagnostics / Archive.
- `alerts` должен стать системой Global alerts с severity, owner, source link и suggested action.

## Общие компоненты v2

Перед переносом страниц нужно создать базовые компоненты.

### AdminButton

Обязательные свойства:

- `variant`: primary, secondary, ghost, danger;
- `icon`;
- `label`;
- `tooltip`;
- `ariaLabel`, если нет видимого текста;
- `loading`;
- `disabled`;
- защита от double click для async;
- единые hover/focus/pressed-состояния.

Правило: кнопка без `tooltip` не проходит приемку.

### AdminTooltip

Требования:

- работает на hover;
- работает на focus;
- не перекрывает кнопку;
- не уходит за экран;
- содержит подробное описание действия;
- не заменяет видимый label;
- для длинных объяснений открывает help-popover.

Формула текста:

1. Что делает.
2. Кого затронет.
3. Когда применится.
4. Как отменить или проверить.

### AdminField

Требования:

- label сверху;
- help-text;
- placeholder только как пример;
- error рядом с полем;
- disabled-состояние;
- технический ключ мелко вторым уровнем.

### AdminToggle

Требования:

- текст "Включено" / "Выключено";
- понятный label;
- tooltip;
- loading после клика;
- аудит изменения;
- confirm для опасных переключателей.

### AdminModal

Требования:

- фокус внутри модалки;
- Escape закрывает только безопасные модалки;
- force-модал не имеет ложной кнопки закрытия;
- один primary CTA;
- danger отдельно;
- текст без внутренних ключей.

### AdminBanner

Требования:

- занимает место в layout;
- не overlay поверх контента;
- close button;
- swipe-to-dismiss, если это пользовательская плашка;
- dismissal по `campaign_id`;
- статус и аудит.

### AdminTable

Требования:

- только нужные колонки;
- действия справа;
- поиск и фильтры сверху;
- empty/loading/error states;
- копирование длинных ID;
- virtual scroll или пагинация для больших списков.

### AdminPageHeader

Требования:

- заголовок;
- короткое описание;
- статус;
- одна главная кнопка;
- breadcrumb;
- ссылка на аудит, если страница меняет данные.

## Дизайн-система

Использовать светлый рабочий стиль из библии:

- фон: `#F6F8FB`;
- поверхность: `#FFFFFF`;
- основной текст: `#111827`;
- вторичный текст: `#64748B`;
- границы: `#DDE3EA`;
- primary: `#2563EB`;
- success: `#16A34A`;
- warning: `#D97706`;
- danger: `#DC2626`;
- info: `#0891B2`;
- focus ring: `#38BDF8`;
- радиус карточек: максимум 8 px;
- шрифт: Inter или system sans-serif;
- без декоративных градиентов;
- без вложенных карточек.

## Этапы работ

### Этап 0. Инвентаризация и защита поведения

Цель: понять все текущие функции и не потерять их.

Задачи:

- собрать список всех вкладок;
- собрать список всех кнопок;
- собрать список всех remote config ключей;
- собрать список всех опасных действий;
- отметить кнопки без tooltip;
- отметить emoji-иконки;
- отметить inline styles;
- отметить функции, которые уже имеют audit log;
- отметить функции без audit log.

Артефакты:

- `docs/design/admin-v2-inventory.md`;
- таблица "старая вкладка -> новый раздел";
- таблица "кнопка -> действие -> риск -> tooltip".

Приемка:

- ни одна старая вкладка не потеряна;
- у каждой кнопки есть будущий раздел;
- опасные действия помечены.

### Этап 1. Каркас v2

Цель: создать новую оболочку без переноса всей логики.

Задачи:

- создать `admin/v2/index.html`;
- создать дизайн-токены;
- создать левое меню из 7 разделов;
- создать верхнюю панель с поиском;
- создать router;
- создать пустые страницы разделов;
- подключить Lucide icons;
- сделать tooltip-систему;
- сделать базовые компоненты кнопок, полей, бейджей и модалок.

Приемка:

- открывается новая админка;
- меню работает;
- поиск открывает разделы;
- каждая кнопка имеет tooltip;
- keyboard focus виден;
- нет горизонтального скролла на 375 px;
- визуально соответствует библии.

### Этап 2. Обзор

Цель: сделать первый экран, который показывает только важное.

Задачи:

- блок "Активно сейчас";
- блок "Требует внимания";
- быстрые действия: показать update modal, создать баннер, включить maintenance, найти пользователя;
- последние изменения из audit log;
- health summary;
- ссылки на старые экраны, пока перенос не завершен.

Приемка:

- за 10 секунд понятно, что включено;
- нет длинных таблиц;
- нет внутренних ключей как основного текста;
- все быстрые действия имеют preview/tooltip.

### Этап 3. Приложение: обновления, баннеры, maintenance

Цель: перенести самые важные рычаги, которые влияют на пользователей.

Подстраница "Обновление приложения":

- старый force-update;
- новый manual update modal;
- режим добровольный / обязательный;
- `campaign_id`;
- `target build/version`;
- store URLs;
- preview модалки;
- audit log;
- кнопка "Показать окно";
- кнопка "Выключить".

Подстраница "Баннеры":

- выгодное предложение;
- campaign_id;
- текст;
- ссылка;
- preview;
- close/swipe правила;
- статус закрытий;
- audit log.

Подстраница "Технические работы":

- soft banner;
- hard block;
- campaign_id;
- preview;
- объяснение влияния;
- быстрый off switch.

Приемка:

- все массовые действия имеют preview;
- каждый publish имеет confirm;
- optional update показывается один раз;
- force update не закрывается;
- target build скрывает модал после обновления;
- баннеры не overlay;
- закрытия хранятся по campaign_id.

### Этап 4. Remote config и feature flags

Цель: убрать хаос из флагов.

Задачи:

- сгруппировать флаги по смыслу;
- каждому флагу дать человеческое имя;
- технический ключ показывать вторым уровнем;
- добавить поиск;
- добавить фильтр "опасные";
- добавить фильтр "активные";
- добавить описание влияния;
- добавить кнопку "Открыть историю";
- для опасных флагов сделать confirm.

Приемка:

- флаг можно найти по русскому названию и ключу;
- непонятных переключателей нет;
- массовые или опасные флаги защищены;
- изменения уходят в audit log.

### Этап 5. Пользователи

Цель: сделать работу с пользователем быстрой и безопасной.

Задачи:

- единый поиск пользователя;
- понятная карточка профиля;
- вкладки внутри профиля: данные, покупки, доступ, жалобы, история;
- кнопки VIP/ban/unban/revoke с danger/confirm;
- все ID копируются;
- аналитика открывается как отдельный блок, не overlay-хаос.

Приемка:

- админ быстро находит пользователя;
- опасные действия невозможно нажать случайно;
- история действий видна рядом;
- кнопки имеют понятные tooltip.

### Этап 6. Деньги

Цель: отделить revenue-инструменты от общего шума.

Задачи:

- подписки;
- paywall;
- VIP;
- промокоды;
- выгодные предложения;
- refunds;
- referrals;
- cancel surveys.

Приемка:

- каждое денежное действие имеет confirm/audit;
- refund и revoke выделены как danger;
- paywall и offers имеют preview;
- нет смешения денег с general remote config.

### Этап 7. Контент

Цель: привести редакторские инструменты к единой структуре.

Задачи:

- фразы дня;
- card packs;
- community packs;
- explain cache;
- импорт;
- QA.

Приемка:

- publish/unpublish защищены;
- есть empty/loading/error;
- редакторы не выглядят как случайные модалки;
- длинные формы разбиты на понятные секции.

### Этап 8. Комьюнити

Цель: собрать социальные инструменты в одно место.

Задачи:

- clubs;
- league chat;
- arena;
- rooms;
- moderation;
- user reports.

Приемка:

- модерация имеет явные статусы;
- ban/warn/archive имеют confirm;
- arena tools отделены от user tools;
- опасные действия помечены и логируются.

### Этап 9. Диагностика и архив

Цель: все редкое и техническое убрать из ежедневного меню.

Задачи:

- audit log;
- ops log;
- app health;
- release health;
- global alerts;
- saved views;
- query contracts и проверка индексов;
- reports;
- support inbox;
- OpenAI budget;
- archive;
- advanced tools.

Приемка:

- диагностика доступна, но не мешает основной работе;
- `app-health` не лежит в Core;
- `ops-log` не смешивает admin actions, app errors и user reports без явных labels;
- у каждого запроса есть limit, empty/error state, pagination/cache rule и список нужных индексов;
- Release Health показывает version adoption, error rate и проблемные версии;
- Global alerts показывают owner, severity, source и suggested action;
- архивные чеклисты не занимают главный уровень;
- advanced tools имеют предупреждения и confirm.



Задачи:

- определить комнаты и их связь с рабочими разделами;
- добавить агрегированные счетчики online/activity по комнатам;
- добавить health overlay из App Health и Release Health;
- добавить campaign overlay для banners, update modal, push и in-app messages;
- добавить sample avatars без PII и без AI-генерации;
- добавить zoom/pan и фильтры по платформе, версии, языку, premium/free и проблемным зонам;
- добавить правую панель комнаты с кнопкой "Открыть рабочий экран";
- добавить performance guard: ограничение видимых аватаров, fallback на счетчики, throttle обновлений.

Приемка:

- AI tokens в рантайме не расходуются;
- карта не читает всех пользователей напрямую;
- персональные данные скрыты по умолчанию;
- за 10 секунд понятно, где сейчас пользователи и где проблема;
- любое опасное действие ведет в обычный рабочий экран с confirm/audit;

### Этап 11. Переключение основной админки

Цель: сделать v2 основной.

Задачи:

- добавить ссылку из старой админки на v2;
- добавить ссылку из v2 на старую админку на время проверки;
- пройти чеклист всех разделов;
- проверить роли доступа;
- проверить audit log;
- проверить responsive;
- включить v2 как основной вход;
- оставить старую админку как архив на короткий период.

Приемка:

- все критические функции перенесены;
- старые вкладки имеют новый дом;
- нет регрессии по update modal, баннерам, maintenance, users, audit;
- пользовательский путь администратора проще, чем был.

## Первый спринт

Первый спринт должен дать видимый результат быстро.

### Что делаем первым

1. Создать `admin/v2/`.
2. Сделать shell: левое меню, верхняя панель, 7 разделов.
3. Сделать компоненты: button, tooltip, field, toggle, badge, modal.
4. Сделать страницу "Обзор" с моковыми/живыми блоками статуса.
5. Сделать страницу "Обновление приложения" на новых компонентах.
6. Подключить существующую логику manual update / force update.
7. Сделать preview update modal.
8. Проверить hover/focus tooltips.
9. Оставить ссылку на старую админку для неперенесенных функций.

### Почему первым именно это

Это сразу решает самые больные места:

- перегруженная навигация;
- непонятные кнопки;
- update modal;
- force/optional режимы;
- preview перед публикацией;
- единый стиль.

## Технические правила реализации

### JavaScript

- переносить логику постепенно;
- не копировать весь старый файл целиком;
- общие Firebase операции вынести в `admin-api.js`;
- UI-логику держать отдельно от данных;
- inline `onclick` постепенно заменять на event listeners;
- новые страницы грузить лениво.

### CSS

- все цвета через токены;
- без inline-style в новых экранах;
- hover/focus/disabled/loading состояния обязательны;
- z-index шкала фиксированная;
- motion уважает `prefers-reduced-motion`.

### HTML

- семантичные кнопки и формы;
- label для полей;
- aria-label для icon-only;
- role/dialog для модалок;
- не использовать emoji для UI-иконок.

## Tooltip-стандарт

Каждая кнопка v2 обязана иметь подробный tooltip.

Пример для update:

Кнопка: "Показать окно"  
Tooltip: "Создаст активную campaign manual update. Пользователи увидят окно после загрузки remote config. Если задан target build/version, окно исчезнет после обновления. Отключить можно на этой странице."

Пример для danger:

Кнопка: "Выключить для всех"  
Tooltip: "Остановит текущую campaign для всех пользователей. Изменение применится после обновления remote config и попадет в audit log. Перед выключением откроется подтверждение."

## Приемка каждого перенесенного экрана

Экран готов только если:

- находится в одной из 7 категорий;
- имеет заголовок и короткое описание;
- имеет один главный CTA;
- все кнопки имеют tooltip;
- все icon-only кнопки имеют aria-label;
- все поля имеют label;
- опасные действия имеют confirm;
- массовые действия имеют preview;
- есть loading/empty/error;
- есть audit log для изменений;
- цвета проходят контраст;
- focus виден;
- проверены ширины 375/768/1024/1440 px;
- технические ключи показаны вторым уровнем;
- элементы не перекрывают друг друга.

## Проверки после каждого этапа

- открыть экран в браузере;
- проверить hover tooltip;
- проверить keyboard Tab;
- проверить 375 px;
- проверить 1440 px;
- проверить отсутствие горизонтального скролла;
- проверить console errors;
- проверить, что старый сценарий все еще работает;
- проверить audit log для изменяющих действий.

## Риски

### Риск: потерять старую функцию

Защита:

- сначала inventory;
- старая админка остается доступной;
- карта "старая вкладка -> новый раздел";
- миграция по одному экрану.

### Риск: v2 станет таким же перегруженным

Защита:

- 7 разделов максимум;
- новые функции только через категорию;
- редкое в Advanced/Archive;
- одна главная кнопка на экран;
- Definition of Done из библии.

### Риск: кнопки будут понятны только разработчику

Защита:

- человеческий label;
- технический ключ вторым уровнем;
- подробный tooltip;
- preview для массовых действий.

### Риск: новый дизайн красивый, но медленный

Защита:

- lazy loading страниц;
- тяжелые таблицы по запросу;
- virtual scroll / pagination;
- минимум DOM на первом экране.

### Риск: экран выглядит готовым, но не подключен

Защита:

- operational audit в Diagnostics;
- `40/40` v2 actions должны иметь handlers;
- `9/9` route targets должны вести на существующие страницы;
- каждый Firestore source должен показывать loading, empty, ready, permission denied или index/rules error;
- browser writes, запрещенные Firestore rules, остаются guarded и указывают на server-side flow.

Контрольный документ: `docs/design/ADMIN_V2_OPERATIONAL_AUDIT_2026-06-27.md`.

## Итоговый порядок

1. Инвентаризация старой админки.
2. Новый v2 shell.
3. Единые компоненты.
4. Обзор.
5. Обновление приложения.
6. Баннеры и maintenance.
7. Remote config и flags.
8. Пользователи.
9. Деньги.
10. Контент.
11. Комьюнити.
12. Диагностика.
13. Финальная проверка.
14. Переключение v2 как основной админки.

## Решение на сейчас

Начинать нужно с этапа 0 и этапа 1.

Первый реальный кодовый шаг:

- создать `admin/v2/index.html`;
- создать `admin/v2/styles/admin.css`;
- создать `admin/v2/scripts/admin-core.js`;
- создать 7 пустых разделов;
- создать компоненты кнопки и tooltip;
- перенести первый живой экран "Обновление приложения".

После этого можно открыть новую админку в браузере и уже на ней переносить остальные функции по очереди.
