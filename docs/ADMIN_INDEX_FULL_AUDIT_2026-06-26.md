# Полный аудит admin/index.html — 2026-06-26

Объект: `admin/index.html`, админка PhraseMan на сайте.

## Короткий диагноз

Админка сейчас не сломана одной кнопкой. Она выросла как один большой накопитель всех рычагов: управление приложением, пользователи, модерация, деньги, UGC, арена, диагностика, пуши, архивы, справка и QA живут в одном HTML-файле.

Факты по текущему файлу:

- 30 220 строк.
- 1.71 MB один HTML-файл.
- 41 контейнер вкладок `tab-*` плюс отдельная страница `testers.html`.
- 311 кнопок.
- 223 кнопки со встроенным `style`.
- 234 кнопки с inline `onclick`.
- 240 полей формы: 145 `input`, 64 `select`, 31 `textarea`.

Главная UX-проблема: интерфейс заставляет помнить карту админки, а не решать задачу. Главная техническая проблема: все экраны, стили, обработчики, модалки, справка и часть дублирующей логики находятся в одном документе.

## Что в админке уже хорошо

- Есть вход через Google и проверка admin claim.
- Есть хеш-навигация, прямые ссылки на вкладки.
- Есть поиск по пользователю в шапке.
- Есть поиск по разделам.
- Есть группировка вкладок на уровне JS: `Core`, `People`, `Revenue`, `Content & delivery`, `Arena`, `Diagnostics`.
- Есть мобильный drawer для меню.
- Большая часть опасных действий требует confirm modal.
- Есть audit log и remote config history.
- Есть пульт управления, где собраны живые флаги без релиза.

Но всё это наложено поверх старой структуры. Поэтому оно улучшает симптомы, но не лечит главный хаос.

## Главные проблемы

### 1. Навигация перегружена

Верхнее/левое меню содержит слишком много пунктов:

`control-panel`, `overview`, `mod-queue`, `ideas`, `users`, `analytics`, `openai-budget`, `reports`, `website-inbox`, `user-reports`, `explain-reports`, `explain-cache`, `compass`, `ban-list`, `premium`, `vip`, `cancel-surveys`, `review-promo`, `app-messages`, `onboarding-qa`, `remote-config`, `paywall-ab`, `alerts`, `ugc-purchases`, `refunds`, `archive`, `audit`, `ops-log`, `community-packs`, `card-packs`, `daily-phrases`, `clubs`, `league-chat`, `arena-ranks`, `arena-live`, `arena-bets`, `arena-rooms`, `referrals`, `app-health`, `push-notify`, `changelog-0608`.

Проблема не только в количестве. В одном уровне меню смешаны:

- ежедневные рабочие задачи;
- аварийные рычаги;
- маркетинг;
- финансы;
- контент;
- модерация;
- диагностика;
- архивы;
- QA;
- исторические записи.

Итог: “Audit archive” получает такой же вес, как “Пульт управления”, “Push” и “Users”.

### 2. Кнопки без единой системы

Сейчас одинаковые действия оформлены по-разному:

- `Обновить`, `Перечитать`, `Refresh`, `Загрузить`, `Ответы` — все означают примерно “перезагрузить данные”, но выглядят и называются по-разному.
- `Сохранить`, `Сохранить всё`, `Сохранить функции`, `Сохранить текст`, `Сохранить и включить` — нет единой иерархии primary/secondary.
- Опасные действия иногда хорошо выделены красным, но рядом есть action-кнопки с похожей визуальной силой.
- Многие кнопки используют emoji как основной icon language, из-за чего профессиональная админка выглядит шумно.

Нужна система:

- Primary: одно главное действие на экране.
- Secondary: безопасное действие.
- Ghost/link: переходы.
- Danger: удаление, бан, force-finish, hard block, deactivate.
- Toggle: бинарные флаги.
- Segmented control: режимы внутри раздела.
- Icon-only только с tooltip/aria-label.

### 3. Цвета перегружены и не кодируют смысл стабильно

Самые частые цвета:

- `#2a2a3a` — 210 раз.
- `#4ade80` — 165 раз.
- `#888` — 149 раз.
- `#f87171` — 148 раз.
- `#fbbf24` — 133 раза.
- `#9ca3af` — 122 раза.
- `#e5e7eb` — 120 раз.
- `#a78bfa` — 119 раз.

Палитра фактически стала “темный slate + много зеленого/красного/желтого/фиолетового”. Это нормально для статусов, но плохо для навигации и команд: глаз перестает понимать, что главное.

Проблемы:

- Слишком много inline-цветов, значит невозможно быстро поменять тему.
- Фиолетовый используется и как акцент, и как системный цвет, и как кнопка.
- Зеленый часто означает success/read/refresh/enabled, но иногда это просто “обновить”.
- Желтый используется и для warning, и для important, и для promotion.
- Вкладки иногда имеют собственные special styles, которые потом переписываются clean skin CSS.

Решение: токены, а не ручные цвета.

Пример новой системы:

- Background: `#0f1216`.
- Surface: `#161a20`.
- Surface raised: `#1d232b`.
- Border: `#2c3440`.
- Text: `#f3f5f7`.
- Muted: `#9aa4b2`.
- Primary: `#38bdf8`.
- Success dark: `#14532d`, success text `#86efac`.
- Danger: `#f43f5e`.
- Warning: `#f59e0b`.
- VIP/revenue accent: `#d8b4fe`.

Правило проекта про зеленые поверхности сохранять: если поверхность ярко-зеленая/салатовая, текст должен быть темный, не белый.

### 4. Производительность и загрузка

Важно: в текущем файле есть функция `adminWarmAdminData()`, которая умеет прогревать много вкладок, но я не нашел ее вызова. Значит сейчас главный стартовый тормоз не обязательно в автопрогреве всех данных.

Реальные проблемы:

- 1.71 MB HTML приходит сразу.
- Все вкладки и справка уже в DOM.
- Большая справка “что делает каждая кнопка” встроена прямо в основной HTML.
- Много inline JS/HTML усложняет парсинг и поддержку.
- При открытии отдельных вкладок есть дорогие запросы: users, league chat, clubs, archive, reports, user reports, UGC purchases, cancel surveys, daily phrases, arena.
- Часть вкладок грузит сотни документов.

Старый документ `docs/ADMIN_FIRESTORE_COST_AUDIT.md` уже правильно указывает самые дорогие места: `loadUsers`, `loadLeagueChatAdmin`, `loadClubsData`, `loadArchive`, `loadReports`, `loadUserReports`, `loadUgcPurchases`, `loadCancelSurveys`.

Нужно:

- разбить админку на модули;
- lazy import экранов;
- не держать всё в DOM;
- вынести Help в отдельный docs/help JSON или отдельную страницу;
- paging по 50-100 записей;
- `admin_user_index/{uid}` для списка пользователей;
- режимы League Chat грузить по одному, не пачкой;
- Archive открывать только с фильтром и лимитом.

## Карта вкладок: что оставить, убрать, перенести

| Вкладка | Вердикт | Куда в новой админке | Комментарий |
| --- | --- | --- | --- |
| `control-panel` | Оставить и сделать главной | Пульт | Главный экран. Нужно разбить на карточки: App state, Update, Maintenance, Promo, Premium, AI, Weekly boons. |
| `overview` | Оставить, но переделать | Сегодня | Сейчас слишком общо. Должен быть рабочий dashboard: что требует действия сегодня. |
| `mod-queue` | Оставить и поднять | Очереди | Должен заменить россыпь reports/user reports/community queue. |
| `ideas` | Перенести | Growth/Feedback | Не ежедневная вкладка. Показывать badge только при новых идеях. |
| `users` | Оставить | Пользователи | Нужен быстрый поиск, легкий индекс, профиль справа. Убрать лишние колонки. |
| `analytics` | Спрятать глубже | Аналитика | Не должна быть рядом с операционными кнопками. |
| `openai-budget` | Оставить | Система/Расходы | Важный контроль затрат, но не top-level для каждого дня. |
| `reports` | Слить | Очереди | В новой структуре это тип очереди “Content reports”. |
| `website-inbox` | Слить | Очереди/Support | Нужен в едином inbox. |
| `user-reports` | Слить | Очереди | Тип очереди “User reports”. |
| `explain-reports` | Слить | Очереди/AI quality | Не top-level. |
| `explain-cache` | Перенести | AI tools | Нужно искать/удалять кэш, но не в главном меню. |
| `compass` | Перенести | Пульт/Features | Это feature control, а не отдельный главный раздел. |
| `ban-list` | Оставить | Пользователи/Moderation | Лучше как подстраница Users + Moderation. |
| `premium` | Слить | Пользователи/Revenue | Сейчас дублирует Users/VIP. |
| `vip` | Слить | Пользователи/Revenue | Оставить как фильтр/операцию, не отдельный top-level. |
| `cancel-surveys` | Перенести | Revenue/Feedback | Нужно для продукта, но не ежедневная навигация. |
| `review-promo` | Переименовать | Campaigns/VIP survey | Название путает: review-promo vs VIP survey. |
| `app-messages` | Оставить | Сообщения | Важный центр коммуникаций. |
| `onboarding-qa` | Спрятать | QA/Labs | Это не рабочая админка. |
| `remote-config` | Спрятать за Advanced | Пульт/Advanced | Нужно, но опасно и перегружено. |
| `paywall-ab` | Оставить | Revenue/Experiments | Хорошо как подстраница монетизации. |
| `alerts` | Перенести | System/Notifications | Настройка админских уведомлений. |
| `ugc-purchases` | Перенести | Revenue/UGC | Не top-level. |
| `refunds` | Оставить как очередь | Revenue/Refunds | Важно, но внутри Revenue. |
| `archive` | Спрятать | System/Archive | Не top-level. |
| `audit` | Спрятать | System/Audit | Нужно для расследований. |
| `ops-log` | Спрятать | System/Ops | Нужно для диагностики. |
| `community-packs` | Оставить | Content/UGC | Но внутри Content. |
| `card-packs` | Оставить | Content/Official packs | Внутри Content. |
| `daily-phrases` | Оставить | Content/Daily | Внутри Content. |
| `clubs` | Перенести | Arena/Leagues | Не рядом с Users. |
| `league-chat` | Оставить | Moderation/Arena chat | Важно, но как очередь/arena subpage. |
| `arena-ranks` | Перенести | Arena | Не top-level. |
| `arena-live` | Оставить | Arena/Live | Важно при инцидентах. |
| `arena-bets` | Перенести | Arena/Economy | Редкая настройка. |
| `arena-rooms` | Перенести | Arena/Rooms | Редкая диагностика. |
| `referrals` | Перенести | Growth | Не top-level. |
| `app-health` | Оставить | System/Health | Важно для аварий. |
| `push-notify` | Оставить | Сообщения/Push | Важный communication center. |
| `changelog-0608` | Убрать из nav | Archive/docs | Это исторический документ, не рабочая вкладка. |
| `testers.html` | Перенести | QA/Testers | Не верхний пункт рабочей админки. |

## Аудит кнопок по группам

В файле 311 кнопок, поэтому ниже аудит не как 311 строк, а как рабочие группы. Это полезнее: большинство проблем повторяются системно.

### Глобальная шапка

Кнопки:

- `?` Help.
- `Sign out`.
- UID/name lookup input.

Проблемы:

- Help открывает огромную модалку, которая сама стала вторым меню.
- `?` без текстовой подписи для такой важной справки слабый affordance.
- `Sign out` выглядит как второстепенный disabled-серый элемент.
- Поиск пользователя в шапке полезный, но конкурирует с поиском разделов.

Решение:

- Заменить Help на `Docs`/`?` в правом utility menu.
- Добавить command palette: `Ctrl/Cmd+K`: пользователь, раздел, действие.
- Шапка должна показывать только: глобальный поиск, текущий статус, account menu.

### Пульт управления

Кнопки/контролы:

- Feature toggles.
- `Перечитать сырое значение`.
- `Сохранить версию и ссылки`.
- `Создать / обновить код`.
- `Обновить список`.
- `Сохранить баннер`.
- `Все бесплатно`.
- `Сбросить к порогу`.
- `Все премиум`.
- `Сохранить всё`.
- `Перечитать`.
- `Сохранить расписание`.
- `Дефолт`.
- `Сохранить` AI.
- `Бюджет OpenAI`.
- `Сохранить функции`.
- `Сохранить текст` maintenance.
- `Открыть` shortcuts.

Проблемы:

- Слишком много разнотипных рычагов на одном длинном экране.
- `Force-update` текущий не решает задачу “показать всем окно обновления независимо от версии”.
- `Promo banner` и `Maintenance banner` включаются, но в приложении их нельзя смахнуть.
- RAW JSON находится слишком высоко и забирает внимание, хотя это debug.
- Опасные действия вроде “Все бесплатно / Все премиум” стоят близко к обычным настройкам.

Решение:

- Разбить пульт на 6 карточек: App state, Update prompt, Maintenance, Promo, Premium access, AI/budget.
- У каждой карточки: статус, preview, primary action, last changed by, audit link.
- RAW/Advanced скрыть в disclosure.
- Опасные bulk actions перенести в dropdown с confirm и preview diff.

### Users

Кнопки:

- Duplicates.
- Email list.
- CSV.
- Grant shards.
- Grant VIP.
- Ban users.
- Clear selection.
- Previous/Next.
- Sort buttons inside headers.

Проблемы:

- В таблице много данных, не все нужны для ежедневной работы.
- Bulk actions появляются рядом с экспортом/поиском, хотя имеют другой риск.
- Sort buttons внутри `th` ухудшают читаемость.
- `Email list` рядом с `CSV` без объяснения риска.

Что убрать из списка:

- Theme KPI/column/filter.
- Settings icons.
- Avatar rendering в таблице.
- Flashcards/achievements/daily tasks из списка.
- Placement level из основной таблицы.

Что оставить:

- UID/name.
- lang/platform/version.
- premium/VIP.
- streak/xp/lessons count.
- last seen/updated.
- ban state.

Нужно добавить:

- Saved views: “Новые”, “Платящие”, “Проблемные”, “Старая версия”, “Без email”.
- Профиль справа, не отдельная хаотичная модалка.
- Bulk action bar снизу/сверху с явным count и confirm.

### Reports / User reports / Website support / Explain reports / Community reports

Проблема:

Это всё очереди. Сейчас они разнесены по разным вкладкам, поэтому оператору нужно знать, где искать проблему.

Решение:

Один экран `Очереди`:

- вкладки внутри: `Все`, `Контент`, `Пользователи`, `Сайт`, `ИИ`, `UGC`, `Чат лиг`;
- общий статус: New / In review / Fixed / Archived;
- единый search;
- единая карточка;
- единая кнопка “закрыть/исправлено/ответить/бан/отклонить” по типу.

### App messages / Push / Global broadcast / VIP survey

Проблема:

Коммуникации с пользователем разбросаны: app messages, push, global modal в Reports, promo banner в Control Panel, VIP survey в отдельной вкладке.

Решение:

Один раздел `Сообщения`:

- Push.
- Inbox messages.
- Global modal.
- Promo banner.
- Manual update modal.
- VIP survey campaign.
- History.
- Audience preview.

Кнопки отправки должны иметь обязательный preview и dry-run count.

### Revenue

Сейчас: premium, vip, refunds, cancel surveys, paywall-ab, ugc purchases, referrals, analytics частично.

Решение:

Один раздел `Деньги`:

- Revenue overview.
- Premium/VIP users.
- Refunds queue.
- Paywall A/B.
- Promo codes.
- UGC purchases.
- Cancel surveys.

### Arena

Сейчас: clubs, league chat, arena ranks, live, bets, rooms.

Решение:

Один раздел `Арена`:

- Live/incidents.
- Rooms.
- Ranks.
- League chat moderation.
- Bets/economy.
- Clubs/leagues.

По умолчанию грузить только Live summary. Остальное по клику.

### System

Сейчас: app-health, audit, ops-log, alerts, remote-config, archive, openai-budget.

Решение:

Один раздел `Система`:

- Health.
- OpenAI budget.
- Alerts.
- Audit log.
- Ops log.
- Remote Config Advanced.
- Archive.

## Что лишнее или не полезно в главном меню

Убрать из top-level:

- `Audit archive`.
- `Archive`.
- `Audit log`.
- `Ops log`.
- `Remote Config`.
- `Onboarding QA`.
- `Explain cache`.
- `Cancel surveys`.
- `UGC purchases`.
- `Arena bets`.
- `Arena rooms`.
- `Referrals`.
- `Compass`.
- `Premium` / `VIP` как отдельные вкладки.

Не удалить функциональность, а спрятать в правильные разделы. По проектному правилу функциональность удалять нельзя без отдельного запроса.

## Что работает неправильно или не так, как нужно

### Force update

Текущая логика:

- `force_update_enabled = true`;
- есть `min_app_version`;
- текущая версия приложения строго ниже `min_app_version`;
- есть store URL для платформы.

Только тогда `ForceUpdateGate` показывает экран.

Это не соответствует твоему требованию:

> “нажму и у пользователей появляется модал обновить приложение независимо от того есть ли обнова и какая версия”.

Нужна отдельная функция, не версия-based force-update.

### Promo/Maintenance top banners

`PromoBanner` и мягкий `MaintenanceGate`:

- рисуются absolute сверху;
- имеют z-index 9997/9998;
- не резервируют место в layout;
- не имеют swipe-to-dismiss;
- не имеют close-кнопки;
- баннер без URL не перехватывает касания, но визуально всё равно перекрывает.

Это соответствует жалобе: верхняя плашка может закрывать элементы.

### Дублирующая логика

В файле видно несколько повторных определений похожих функций, например для arena rooms и card packs: сначала русская версия, затем clean/english override ниже. Это технический долг: поведение может зависеть от порядка скрипта, а не от явной архитектуры.

### Help modal

Справка по каждой кнопке полезна, но сейчас это огромная модалка внутри той же страницы. Это усиливает ощущение “меню внутри меню”.

Нужно превратить в:

- contextual help рядом с конкретным контролом;
- отдельную страницу docs/help;
- tooltips для коротких подсказок.

## Чего не хватает

### 1. Manual update campaign

Новая функция:

- `manual_update_prompt_enabled`;
- `manual_update_prompt_campaign_id`;
- `manual_update_prompt_title_ru/uk/es/...`;
- `manual_update_prompt_body_ru/uk/es/...`;
- `manual_update_prompt_store_url_ios`;
- `manual_update_prompt_store_url_android`;
- `manual_update_prompt_audience`: all/free/premium/testers;
- `manual_update_prompt_platform`: all/ios/android;
- `manual_update_prompt_mode`: modal/banner;
- `manual_update_prompt_dismissible`: true/false;
- `manual_update_prompt_repeat`: once/per_session/until_disabled.

В приложении:

- новый `ManualUpdatePromptGate`, отдельный от `ForceUpdateGate`;
- не сравнивает версии;
- показывается при включенном флаге и новом `campaign_id`;
- кнопка `Обновить` открывает store URL;
- если `Linking.openURL` падает, показывает понятную ошибку или fallback copy link;
- пишет analytics: shown, update_pressed, dismissed, store_open_failed.

В админке:

- карточка `Обновление приложения`;
- две разные секции:
  - `Жёсткий force-update по версии`;
  - `Показать модал обновления всем сейчас`.
- кнопки: `Preview`, `Показать всем`, `Выключить`, `Тест на себе`.

### 2. Swipe dismiss для верхних плашек

Нужно:

- закрыть свайпом вверх/вбок;
- добавить маленькую кнопку закрытия;
- сохранять dismiss локально по `campaign_id`;
- для maintenance banner использовать `maintenance_banner_id`;
- для promo banner использовать `promo_banner_campaign_id`;
- если админ меняет текст/campaign_id, плашка снова может показаться.

Лучший UX:

- баннер не absolute поверх контента, а часть `TopNoticeHost`, который резервирует высоту;
- при dismiss высота анимированно схлопывается;
- на экране остается нормальный top inset.

### 3. Командная палитра

`Ctrl/Cmd+K`:

- открыть раздел;
- найти пользователя;
- создать push;
- включить maintenance;
- открыть refunds;
- открыть OpenAI budget;
- найти report по id.

Это быстрее любого меню.

### 4. Saved views

Для Users/Queues/Revenue:

- “Новые жалобы”.
- “Старая версия приложения”.
- “VIP истекает”.
- “Платящие с ошибками”.
- “Refunds pending”.
- “Arena incidents”.

### 5. Статус изменений

На каждой опасной карточке:

- текущее состояние;
- кто менял;
- когда;
- что изменилось;
- кнопка audit history.

## Новый макет

### Общая структура

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ PhraseMan Admin     Search user/action...                Health  Account  │
├───────────────┬────────────────────────────────────────────────────────────┤
│ Сегодня       │ Today                                                     │
│ Пульт         │  Urgent queues  App status  Revenue  OpenAI  Last changes │
│ Очереди       │                                                            │
│ Пользователи  │  Quick actions:                                           │
│ Сообщения     │  [Show update modal] [Maintenance] [Create push] [Find user]│
│ Контент       │                                                            │
│ Деньги        │  Work cards:                                               │
│ Арена         │  - Reports needing action                                  │
│ Система       │  - Refunds pending                                         │
│ QA / Labs     │  - Broken app health items                                 │
└───────────────┴────────────────────────────────────────────────────────────┘
```

### Пульт

```text
Пульт

[App availability]
  Maintenance banner: off       [Edit] [Turn on]
  Hard block: off               [Emergency only]

[Update]
  Manual update modal: off      [Preview] [Show to users]
  Force update by version: off  [Configure]

[Promo]
  Promo banner: on until ...    [Edit] [Dismiss campaign] [Turn off]

[Premium / Free]
  Lessons: first N free         [Edit rules]
  Feature gates: 15 configured  [Edit]

[AI]
  Dialog model: ...             [Budget] [Edit limits]

[Weekly bonuses]
  Schedule active               [Edit]
```

### Очереди

```text
Очереди

Tabs: All | Content | User reports | Site support | AI reports | UGC | League chat
Filters: status, severity, source, assignee, date

List left:
  report cards with severity and action

Detail right:
  full context, user, history, actions
```

### Пользователи

```text
Пользователи

Saved views: All | Paying | Old app version | Banned | No email | High value
Search: UID/name/email
Table: name, lang, platform, version, premium/VIP, xp, streak, last seen
Side panel: full user profile + actions
```

### Сообщения

```text
Сообщения

Tabs: Push | In-app inbox | Global modal | Promo banner | Update modal | VIP survey | History

Every send screen:
  audience preview
  message preview
  test to self
  schedule/send
```

## Приоритеты переделки

### P0 — срочно

1. Добавить manual update modal отдельно от force-update.
2. Сделать promo/maintenance banners dismissible/swipeable.
3. Убрать `Audit archive` из top-level nav.
4. Разделить `Пульт` на карточки и спрятать RAW/advanced.
5. Нормализовать button styles: primary/secondary/danger/ghost/toggle.

### P1

1. Новый layout с 8 разделами вместо 40 вкладок.
2. Единый раздел `Очереди`.
3. Единый раздел `Сообщения`.
4. Users list через легкий индекс и paging.
5. Вынести Help из DOM.

### P2

1. Command palette.
2. Saved views.
3. Раздел QA/Labs отдельно от рабочей админки.
4. Убрать inline styles постепенно.
5. Разбить `admin/index.html` на модули.

## Что я бы НЕ делал

- Не удалять функциональность молча.
- Не пытаться “косметически перекрасить” текущую админку без новой структуры.
- Не смешивать manual update prompt с force-update по версии.
- Не оставлять promo/maintenance как absolute overlay без dismiss.
- Не держать исторические QA/audit страницы в главном меню.

## Итоговый принцип новой админки

Админка должна отвечать на вопрос: “Что мне сейчас нужно сделать?”

Не “вот все 311 кнопок”.

Новая структура:

1. Сегодня.
2. Пульт.
3. Очереди.
4. Пользователи.
5. Сообщения.
6. Контент.
7. Деньги.
8. Арена.
9. Система.
10. QA/Labs.

Все редкие и опасные вещи остаются доступными, но уходят из главного уровня.
