# Phraseman — аудит и новая модель монетизации

Дата: 12 сентября 2026  
Статус: стратегический аудит; 12.09.2026 выполнены первые точечные исправления Phase 0  
Область: активное мобильное приложение, подписка Plus, paywall, энергия, жемчужины, руны, карточки, обучение, социальные и игровые контуры  
Исключение: законсервированный AI Tutor не входит ни в карту продукта, ни в рекомендации, ни в симуляцию.

## 1. Короткий вердикт

Проблема Phraseman не в недостаточном количестве ограничений. Проблема в том, что текущая монетизация не образует понятную систему:

1. Основной курс из 32 уроков открыт бесплатно целиком, но часть старого UI продолжает говорить про «три бесплатных урока» и «Plus откроет уроки».
2. Самые сильные активные причины купить Plus — безлимитная энергия, говорение, карточные тренировки, создание контента, «Мои ошибки» и глубокая статистика — почти не дают бесплатному пользователю пережить ценность до paywall.
3. Реальные товары за жемчужины разбросаны по отдельным экранам. Красивый общий магазин существует только как DEV-макет; его покупки ничего не списывают и ничего не выдают.
4. Жемчужины одновременно продаются за деньги и щедро выдаются бесплатно. Без source/sink-аналитики нельзя понять, покупает ли кто-нибудь валюту ради конкретной пользы или бесплатные выдачи полностью закрывают спрос.
5. В paywall-контуре семь дизайнов, но отсутствует сквозная причинная связь `экспозиция → попытка → подтверждённый платёж RevenueCat`. Живая админка способна назвать «победителя» по статистически ненадёжным данным.
6. В исходной версии Plus рекламировал Personal Plan, хотя новые пользователи уже не могут его создать. В follow-up это обещание заменено на реально доступную безлимитную энергию во всех девяти локалях.

Главная рекомендация: не делать free-версию мучительной. Сделать её полезной, но ограниченной по глубине и темпу. Пользователь должен сначала почувствовать результат, затем встретить честный контекстный предел. Plus продаёт непрерывный ритм, глубину практики и понимание собственного прогресса. Жемчужины продают единичные, понятные и детерминированные учебные возможности.

Целевая архитектура:

- **Free** — полноценный основной курс, ежедневная привычка и небольшой образец каждой ключевой механики.
- **Plus** — безлимитный темп, полная практика, глубокая диагностика, неограниченное создание и несколько языков.
- **Жемчужины** — разовые учебные пропуски, восстановление, официальные наборы, сезонный доступ и подарки; не суррогат подписки и не случайная косметика.
- **Руны** — только заработанная игровая валюта для progression-усилений, не канал реальных денег.

## 2. Что именно проверено

- Навигация и пользовательские маршруты.
- Learning V1 и текущий factory-native Learning V2.
- Карточки, наборы и четыре режима тренировки.
- Голосовые ответы и speaking.
- Статистика, ошибки, streak, экзамены, достижения и коллекции.
- Arena, League/Club, друзья, подарки, referrals и Season Pass.
- Энергия, жемчужины, руны, их источники и реальные траты.
- Все активные subscription/paywall-поверхности и RevenueCat-покупка.
- Remote Config и админские переключатели Free/Plus.
- Аналитика, экспериментальная рандомизация, warehouse и privacy/consent.
- Синтетическая модель: 500 персон × 3 888 конфигураций = 1 944 000 оценок.

Ограничение аудита: репозиторий не содержит актуального production snapshot для conversion, trial-to-paid, ARPU, LTV, churn, retention и pearl buyer rate. Поэтому симуляция ранжирует гипотезы и показывает компромиссы, но не является прогнозом.

Внешний ориентир, а не цель Phraseman: RevenueCat в State of Subscription Apps 2026 показывает медиану D35 download-to-paid 3,1% для Education на iOS и большой разрыв между iOS и Google Play. Значит один общий benchmark без разделения по платформе вводит в заблуждение: [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps/).

## 3. Полная карта активного продукта

### 3.1. Главный каркас

Пять пользовательских вкладок:

1. Главная.
2. Уроки.
3. Арена.
4. Друзья.
5. Настройки.

Доказательство: `app/(tabs)/_layout.tsx:457-462`.

### 3.2. Главная

- Профиль и уведомления.
- Серия, уровень, XP и недельная активность.
- Быстрый вход в уроки и карточки.
- Балансы жемчужин и рун, спины и подарки.
- Продолжение последнего урока или «Мои ошибки».
- Цель и сундук лиги.
- Фраза дня.
- Видео Phraseman/Lingman.
- Опросы, квесты, награды, ответы поддержки.
- Offline/no-data и ручное обновление.
- Freeze/revive и streak-risk офферы.

Основной источник: `app/(tabs)/home.tsx`.

### 3.3. Learning V2

Текущий публичный экран уроков по умолчанию ведёт в factory-native V2. В локальном release:

- урок 1 — 56 сессий;
- урок 2 — 56 сессий;
- урок 3 — 18 сессий;
- всего — 130 выпущенных сессий;
- карта рассчитана на 32 × 56, остальное пока unreleased/placeholders.

Активные типы заданий:

- сборка фразы;
- выбор по аудио;
- аудиодиктант;
- контекстный grammar gap;
- speed match;
- scripted repeat/compare.

Есть три интро-шага, word-first карточки, локальное аудио, сохранение фраз, voice-control, три попытки, руны за качество, энергия на старт сессии, звёзды и локальный прогресс.

Источник: `modules/learning-v2/content/factory_native/README.md`, `app/learning_v2_direct_session_player_v1.tsx:187-193`, `app/learning-v2/session/[id].tsx`.

Контент полноценно написан на RU/UK; остальные шесть interface locales получают явный RU fallback. Это важно для pricing/localization: наличие интерфейсной локали не означает локализованную ценность курса.

### 3.4. Learning V1 и экзамены

- Основной смешанный урок: word bank или ручной ввод, auto-check, auto-advance, аудио и голосовой ответ.
- Слова: тренировка, словарь, части речи, аудио, награды.
- Неправильные глаголы: Dictionary/Learn/Write.
- Предлоги: отдельный drill.
- Теория с примерами и интерактивами.
- Диагностический тест: 20 вопросов, оценка уровня и рекомендации.
- Level checks A1/A2/B1/B2: 30 вопросов, 70% pass, одна энергия, награда за первый проход.
- Финальный экзамен: 50 вопросов, 60 минут, одна энергия, prerequisite по курсу и level checks, сертификат от 80%.

Все 32 основных урока бесплатны: `app/main_course_access.ts:1-9`, `app/monetization_policy.ts:24-37`.

### 3.5. Карточки

Пользовательские поверхности:

- hub;
- сохранённые карточки;
- официальные, community и собственные наборы;
- создание/редактирование карточки;
- создание и публикация набора;
- открытие набора;
- setup и игровые сессии.

Четыре активные тренировки:

1. Blitz — выбор переводов за 60 секунд.
2. Speaking — произношение с повторными попытками.
3. Правда/ложь.
4. «Вспомни и напиши».

Пассивный `/flashcards_audio` больше не является режимом и перенаправляет в hub.

Текущие ограничения:

- free видит первые 20 сохранённых карточек;
- создание новой карточки и нового набора требует Plus;
- старые созданные элементы после downgrade остаются доступными для просмотра, редактирования и удаления;
- community-каталог бесплатный;
- официальные наборы могут стоить жемчужины;
- тренировки по умолчанию Plus-gated; прямой route-bypass Blitz закрыт 12.09.2026.

Источники: `app/flashcards/free_limit.ts`, `app/creator_access.ts`, `app/flashcards/training_entry.ts`, `app/flashcards_blitz_session.tsx`.

### 3.6. «Мои ошибки»

- Собирает ошибки из уроков, карточек и плановых контуров.
- Длина 5/10/15/все.
- Recognition, guided и production упражнения: choice, gap, ordered tokens, typing, listening, scripted speech.
- Одна энергия на старт.
- XP, звёзды и руны за исправление.
- Скрытие и восстановление ошибок.
- Сейчас требует Premium.

### 3.7. Arena и League/Club

Arena:

- quick, ranked, friend duel и Today/ghost при наличии сервера;
- пять типов заданий;
- ежедневные цели;
- ранги, история, review, приглашения и Season Pass;
- quick/ranked дают руны; friend/series не начисляют банковскую награду.

League/Club:

- недельный leaderboard, повышение/понижение;
- публичные профили и лайки;
- общий сундук, countdown и правила;
- личные очки live, удалённые данные кэшируются на шесть часов;
- групповой boost;
- вход в Season Pass.

### 3.8. Друзья и community

- Поиск, заявки, добавление и удаление друзей.
- Публичные карточки профиля.
- High-five/лайки.
- Подарки за жемчужины.
- Дуэли и study invite.
- Friend quests: совместная цель, XP и жемчужины.
- Referrals.
- «Вместе»: общие дни, уровни, руны, nudge и недельный сундук по remote flag.

### 3.9. Статистика, серия и мета-прогресс

- Базовая серия, лучший streak, уровень, XP и общие показатели — free.
- Недельные графики, 365-day heatmap, сравнения и percentiles — визуально закрыты Plus.
- Phrase analytics — premium-разбор слабых тем и фраз.
- Freeze: первый для Plus бесплатен, последующие стоят 10 жемчужин.
- Revive: 15–100 жемчужин в зависимости от длины потерянной серии.
- Wager: ставка 1/2/3/5/8/15 жемчужин; текущая награда — XP, жемчужный выигрыш равен нулю.
- Achievements, collectibles, level gifts и reward spin.

### 3.10. Остальные активные функции

- Фраза дня: meaning quiz, literal/meaning/explanation, аудио, сохранение, 50 XP.
- Уведомления и reward claim.
- Опросы с наградой.
- Видео и плейлисты, inline YouTube, напоминание о премьере, фразы из видео.
- Ideas/catalog.
- Support report.
- Feature guide.
- Promo codes.
- Referrals/roulette.
- Темы.
- Avatar/customization.
- Настройки обучения, озвучки, haptics и уведомлений.
- Account linking, logout, delete account, privacy/consent.

### 3.11. Personal Plan

Функционально это большой продукт: пять планов на 12–20 недель, daily tasks, теория, диктант, pronunciation, recall, quiz, статистика и слабые места.

Но коммерчески он уже не является активным обещанием для новых пользователей:

- grandfather cutoff — 20 августа 2026;
- новый пользователь не может создать план;
- полный sunset — 20 октября 2026;
- после sunset routes возвращают в Lessons.

Источник: `app/personal_plan_sunset.ts:3-18`, `app/personal_plan.tsx:428-463`.

## 4. Текущая матрица Free / Plus / жемчужины

| Поверхность | Free сейчас | Plus сейчас | Жемчужины/руны |
|---|---|---|---|
| Основные уроки 1–32 | Все открыты | Те же уроки | Энергия ограничивает темп |
| Learning V2 | Выпущенные сессии открыты в рамках прогресса/энергии | Безлимит энергии и Plus-механики | Руны за качество |
| Энергия | База 5, +1/30 мин, 1 на старт активности | Безлимит | Жемчужина за недостающую единицу |
| V1 speaking | По умолчанию paywall | Открыто | Нет понятного разового продукта |
| Карточки — хранение | Первые 20 | Без лимита | Официальные паки за жемчужины |
| Карточки — создание | Новое закрыто | Безлимитное создание | Нет разового workshop-credit |
| Карточные тренировки | Закрыты route-level gate, включая прямой Blitz | Открыты | Нет разового training-pass |
| «Мои ошибки» | Закрыто | Открыто | Нет разового lab-pass |
| Статистика | Базовые числа | Deep stats/heatmap/percentiles | Нет |
| Несколько языков | Первый язык | Дополнительные | UI выбора сейчас отключён |
| Темы | Indigo/Sage | Olive | Пять тем по 200, Gold reward |
| Streak | База free | Freeze benefit | Freeze/revive/wager |
| Season Pass | Покупка входа за 250, левая линия | Та же покупка, обе линии | 250 жемчужин |
| Community packs | Просмотр и добавление free | То же | User-generated free |
| Arena/League/Friends | Основные социальные контуры | Отдельные преимущества | Gifts/boosts/season |
| Диагностика/экзамены | Доступны, часть тратит энергию | Без пауз по энергии | Награды за первый pass |
| Фраза дня/видео | Free | То же | XP/сохранение |
| Personal Plan | Только допустимый grandfathered-контур | То же + исходный access | Sunset 20.10.2026 |

Примечание: значения Remote Config в репозитории — defaults, не доказательство текущего production-документа.

## 5. P1/P2-проблемы, которые нужно закрыть до роста

### P1. Plus продавал недоступный Personal Plan — исправлено 12.09.2026

`app/main_course_plus_copy.ts` перечисляет «Личный план занятий» как одно из трёх главных преимуществ Plus. Новые пользователи не могут получить этот план, а весь контур скоро исчезнет. Это риск возвратов, негативных отзывов и претензий к честности оффера.

Исправление: Personal Plan убран из главного Plus sales copy и заменён на «Безлимитную энергию» во всех девяти локалях. Заодно закрыта английская локализация обычного и win-back paywall copy; layout и стили paywall не менялись.

### P1. Старый lesson-complete copy противоречит бесплатному курсу

В `app/lesson_complete.tsx:190-210,671-673` остались обещания «Plus откроет уроки» и «3 бесплатных урока». Фактически все 32 урока бесплатны.

Решение: любой post-lesson upsell должен честно говорить: курс остаётся бесплатным; Plus открывает глубину практики и снимает паузы.

### P1. Blitz обходил Plus — исправлено 12.09.2026

Setup/Recall/Speaking проверяют entitlement, а `app/flashcards_blitz_session.tsx` проверяет только колоду и энергию. Прямой deep link запускает полный Blitz у free-пользователя.

Исправление: в прямой Blitz добавлен fail-closed route-level access guard. При отказе или отзыве доступа не загружается колода, не стартуют раунд и таймер, не выдаются руны; поздно подтверждённый расход энергии компенсируется идемпотентным refund.

### P1. Админка показывает переключатели, которые не управляют runtime

- Lessons 1–32 всегда открыты до проверки remote gate.
- Stats в нескольких местах использует прямой `hasPremiumAccess`.
- Mastery намеренно free.
- Aura решается по item entitlement.
- `personal_plan` и `extra_languages` отсутствуют в панели, хотя есть в feature registry.

Решение: либо сделать переключатель реальной единственной точкой управления, либо удалить ложный control и описать фиксированную политику. Для monetization-экспериментов ложный control особенно опасен.

### P1. Магазин utility-товаров не является продуктом

`/shop` доступен только из DEV-центра. Его buy-handler проверяет баланс и показывает toast, но не выполняет composite debit/grant. Товары из `shop_catalog.ts` нельзя считать действующими sinks.

Решение: не публиковать текущий макет как есть. Сначала определить production-каталог, для каждого товара создать атомарную idempotent operation с точным grant, затем вывести один понятный вход из кошелька жемчужин и из контекстных shortage-моментов.

### P1. Control plane не поддерживает новую энергию 100

Runtime и админка жёстко ограничивают `max_energy` значением 5. Дополнительно default regen расходится: приложение — 30 минут, админка — 10 минут.

Решение: проектировать новую шкалу как новую версию контракта, а не менять число в старом поле. Нужны отдельные cost per activity, recovery rate, cap, refill offer и migration.

### P1. Экспериментальный контур не умеет доказать revenue winner

- Админка не публикует обязательный experiment passport и стирает его `merge:false`.
- Warehouse видит exposure, но не связывает его с server-confirmed RevenueCat transaction.
- Живая админка сама считает односторонний тест уже при 30 показах и может написать «смело катить», игнорируя серверный verdict с минимумом 300.
- Нет SRM, поправки за множественные сравнения, фиксированного окна и maturity.

Решение: запретить автоматический winner до сквозного `experiment_id/exposure_id → purchase_attempt_id → entitlement → webhook receipt`.

### P2. Неправильные paywall-context

- `season_pass_lane` отсутствует в каноническом наборе и падает в generic.
- `personal_plan` также не является каноническим PremiumContext.

Решение: Season Pass получает собственный честный оффер про вторую дорожку. Personal Plan больше не должен быть acquisition paywall-context.

### P2. Swipe может показать paywall подписчику на холодном входе

Редирект срабатывает до разрешения entitlement hydration.

Решение: fail-closed access resolution без ложного paywall для уже платящего пользователя.

### P2. Remote-цена streak freeze не применяется

Remote Config содержит цену, но runtime жёстко списывает 10.

Решение: один источник истины для UI и composite operation.

## 6. Аудит paywall

### Что уже сделано хорошо

- Цена и trial читаются из стора, а не выдумываются в production UI.
- Entitlement выдаётся после store/RevenueCat confirmation.
- Restore использует тот же канонический access check.
- Есть честные disclosure об автопродлении и отмене.
- Есть monthly/yearly, а lifetime скрыт флагом.
- Есть context-specific copy, impression UUID, plan selection, CTA, purchase lifecycle, close и exit offer.
- Soft upsell имеет session cap и семидневный cooldown.
- Stable ID фиксирует вариант для пользователя.
- Отказ/continue free существует; жёсткого захвата интерфейса нет.

### Что мешает конверсии

Ограничение владельца: визуальный дизайн существующих paywall A–G фиксирован. В следующих экспериментах меняются только момент и контекст показа, source и тексты; layout, тарифные карточки, CTA, анимации и стили остаются без изменений.

1. **Семь paywall-дизайнов — это не семь гипотез.** A–G одновременно меняют layout, плановую архитектуру, copy и framing. Даже если один выиграет, непонятно почему.
2. **Default A/B/C = 33/33/34 помечен `legacy_unmeasured`.** Это трафик без пригодного причинного измерения.
3. **Onboarding paywall появляется до полноценного product aha.** Для soft freemium лучше сравнить его с paywall после первой завершённой полезной сессии.
4. **Сильные фичи полностью закрыты.** Пользователь читает обещание speaking/stats/training, но не всегда успевает почувствовать их ценность.
5. **Пост-lesson контекст хранит старую семантику «free lessons complete».** Даже при новом честном copy event taxonomy продолжает путать продукт.
6. **Нет персонализированного value proof.** Paywall знает context, но не показывает, что именно пользователь уже сделал: сохранённые карточки, исправленные ошибки, серию, время практики.

### Новое правило показа

Показывать paywall только в одном из четырёх моментов:

1. После aha-момента — мягкое предложение, не блокировка.
2. При достижении понятного лимита — контекстный hard/soft gate.
3. При повторном запросе дорогой функции — после бесплатной пробы.
4. При высокой подтверждённой вовлечённости — персонализированный upgrade summary.

Не показывать:

- сразу после ошибки;
- несколько раз за одну сессию;
- после явного отказа до cooldown;
- в момент потери прогресса;
- с ложным countdown;
- с заранее выбранной подпиской без ясного disclosure.

Google Play прямо требует прозрачности условий и запрещает deceptive/manipulative purchase experience; подписка должна давать устойчивую повторяющуюся ценность: [Google Play subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en).

## 7. Аудит жемчужин

### 7.1. Что реально продаётся

IAP-паки:

- 35 жемчужин;
- 92;
- 210;
- 500.

Store price динамический. Источник: `app/shards_shop_catalog.ts:16-21`.

### 7.2. Реальные sinks

- Пополнение энергии: 1 жемчужина за каждую недостающую единицу.
- Темы: 200.
- Аватар/restyle и ауры — существуют, но не рассматриваются как будущая основа спроса.
- Карточка профиля: 200/450/800/1400/2400.
- Подарки друзьям: 8/30.
- League boosts: 20/30/40/45.
- Streak freeze: 10.
- Streak revive: 15–100.
- Streak wager: 1/2/3/5/8/15.
- Official card packs.
- Season Pass: 250.

### 7.3. Faucets

- Daily Journey суммарно выдаёт 900 за 50 дней.
- Reward spins могут выдавать 5–1000.
- Friend quests дают по 10 участникам.
- Season Pass возвращает 12 по free-линии и до 210 по Plus-линии.
- Жемчужины приходят из экзаменов, сундуков, опросов, bug-report reward и других наград.

Следствие: жемчужины не являются «валютой, которую можно купить только за деньги». Экономика должна считать отдельно earned, purchased, granted/compensation balances и их фактические sink-cohorts.

### 7.4. Почему их сейчас мало смысла покупать

- Нет одной видимой витрины реальных utility-товаров.
- Самые частые дешёвые траты легко покрываются бесплатными выдачами.
- Крупные траты в основном косметические или далеко от основного learning loop.
- Пользователь не видит заранее: «что я куплю первым».
- Нет first-spend latency, sink utilization и repeat-purchase аналитики.
- Wager забирает жемчужины, но возвращает только XP — слабая и потенциально разочаровывающая ценность.
- Season Pass сочетает вход за жемчужины и дополнительную Plus-дорожку — double monetization требует особенно ясного объяснения.

### 7.5. Предлагаемый production-каталог

Цены ниже — стартовые гипотезы для A/B, не финальный прайс.

| Товар | Предлагаемая роль | Стартовый диапазон |
|---|---|---:|
| Energy refill | Немедленно продолжить сессию | динамически, эквивалент 8–20 за полный refill новой шкалы |
| Mistake Lab ticket | Одна полноценная сессия «Мои ошибки» | 12–20 |
| Speaking pack | Пять дополнительных speaking-сессий | 20–30 |
| Training pass | Десять дополнительных карточных тренировок | 15–25 |
| Workshop credit | Создать один дополнительный pack или пакет карточек сверх free-квоты | 15–25 |
| Focus Day | 24 часа без energy-пауз + все practice-моды | 45–60 |
| Official learning pack | Постоянный тематический набор | текущие 80 как контроль |
| Season premium track | Одна сезонная premium-дорожка без подписки | текущие 250 как контроль |
| Friend gift | Shield или совместный learning boost | текущие 8/30 как контроль |
| Streak recovery | Freeze/revive с прозрачной ценой | текущие 10 и 15–100 как контроль |

Лучший принцип: каждый товар должен отвечать на вопрос «какой учебный результат я получу сейчас?».

Для каждого товара обязательна одна durable composite operation с точным grant и стабильным idempotency key. Нельзя сначала списать, а потом отдельно попытаться выдать товар.

### 7.6. Что не делать основой жемчужин

- случайные ауры;
- paid loot-box как главный sink;
- продажа результата экзамена;
- pay-to-win boost в рейтинговой Arena/League;
- искусственная потеря прогресса ради продажи восстановления;
- срок сгорания купленной валюты.

Если случайные покупки вообще остаются, Apple и Google требуют заранее раскрывать odds. Apple также указывает, что купленная IAP-валюта не должна истекать: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

## 8. Рекомендованная новая матрица

| Фича | Free | Plus | Жемчужины | Обоснование |
|---|---|---|---|---|
| 32 основных урока | Полностью | То же | Нет | Курс — acquisition и trust engine |
| Энергия 100 | 4–6 эквивалентных learning blocks в день | Безлимит | refill | Темп, а не правильность ответа |
| Карточки — хранение | 20 | Безлимит | Нет | Существующий понятный cap |
| Карточные тренировки | 3 коротких в день | Безлимит | training pass | Пользователь сначала чувствует пользу |
| Speaking | 1 короткая проба в день | Безлимит | speaking pack | Premium value становится доказуемой |
| Создание | 10 карточек + 1 pack | Безлимит/bulk | workshop credit | Free создаёт community supply |
| Публикация community pack | Free после quality threshold | То же + удобства | Нет | Network effect нельзя душить paywall |
| «Мои ошибки» | Preview + одна mini-session в неделю | Безлимит и полная длина | lab ticket | Сильный return-to-learn trigger |
| Базовая статистика | Free | — | Нет | Показывает прогресс и ценность |
| Deep stats/weak patterns/percentiles | Teaser | Полностью | Нет | Один из лучших subscription pillars |
| Диагностика и экзамены | Free, energy-limited | Без пауз | refill | Нельзя продавать образовательную честность |
| Первый язык | Free | — | Нет | Полноценный продукт |
| Дополнительные языки | Нет | Да | Можно тестировать permanent language unlock отдельно | Сильная recurring value только при реально выпущенном контенте |
| Arena/League core | Free | Convenience, не победа | Social gifts, не pay-to-win | Честность соревнования |
| Season Pass | Free track действительно free | Premium track включён | 250 за один сезон без Plus | Убирает stacked payment |
| Achievements/collectibles | Free | Expanded presentation | Не основа | Retention loop |
| Фраза дня/видео | Free | То же | Нет | Daily return и top-of-funnel value |
| Темы/customization | Текущий mixed catalog | Plus subset | Permanent items | Дополнительный, не основной доход |
| Personal Plan | Не продавать | Не продавать | Нет | Sunset |

## 9. Энергия 100: рабочая модель

Не переносить старые «5 сердец» линейно в «100 единиц». Сначала определить learning blocks:

- короткая карточная тренировка — 10–15;
- стандартная V1/V2-сессия — 20–25;
- длинный экзамен или Mistake Lab — 25–35;
- бесплатное восстановление должно давать 4–6 осмысленных блоков в сутки;
- Plus — `∞`, без визуального счёта;
- wrong answer никогда не списывает энергию;
- failed start/refund остаётся обязательным;
- refill-цена показывается до подтверждения и зависит от фактически недостающего количества.

Первый реальный тест:

- Control: эквивалент 6 блоков/сутки.
- Variant: эквивалент 4 блоков/сутки.
- Primary: server-confirmed revenue per eligible new user на D35/D60.
- Secondary: trial start, Plus conversion, pearl refill conversion.
- Guardrails: D1/D7/D30 retention, completed learning sessions, energy-block rate, refunds, support complaints.

Вариант «2 блока» симуляция оценила как лучший по сырому давлению на подписку, но он ухудшает удержание и потому не рекомендуется как default.

## 10. Симуляция 500 персон

### 10.1. Персоны

По 50 вариантов каждого сегмента:

1. casual explorer;
2. committed learner;
3. streak builder;
4. pronunciation seeker;
5. flashcard builder;
6. social competitor;
7. collector/gamer;
8. multi-language learner;
9. returning/recovery;
10. price-sensitive learner.

У каждой персоны варьируются learning intent, habit, price sensitivity, reactance, потребность в practice/speech/stats/creation/social/variety и платформа.

### 10.2. Пространство сценариев

- Energy: 2 / 4 / 6 / adaptive 4+ blocks.
- Card practice: paid-only / 1 daily / 3 daily.
- Speaking: paid-only / weekly demo / daily demo.
- Stats: locked / preview.
- Creation: paid-only / starter quota.
- Pearls: current fragmented / learning utility / mission pass.
- Paywall: early interrupt / post-aha / contextual limit.
- Trial: 3 / 7 / 14 days.

Итого 3 888 конфигураций и 1 944 000 persona-scenario evaluations.

### 10.3. Результаты

Абсолютные проценты ниже искусственно anchored около внешнего subscription benchmark. Они не являются production forecast Phraseman. Решение принимается по относительному индексу и затем проверяется настоящим A/B.

| Модель | Plus | Индекс | Pearl buyers | D30 model | Annoyance | Решение |
|---|---:|---:|---:|---:|---:|---|
| Текущее приближение | 1,72% | 100 | 1,01% | 37,14% | 37,24% | Baseline модели |
| Максимум сырой Plus-конверсии | 2,19% | 127,3 | 1,04% | 18,33% | 41,38% | Отклонить |
| Максимум Plus при текущих guardrails | 2,18% | 126,7 | 3,05% | 44,52% | 31,11% | Рискованный test arm, не default |
| Сбалансированная revenue-модель | 1,81% | 105,2 | 4,10% | 85,14% | 14,21% | Рекомендованный north-star hypothesis |
| Максимум pearl buyers | 1,48% | 86,0 | 4,15% | 77,26% | 19,14% | Каннибализирует Plus |

Сбалансированная модель:

- 6 free learning blocks;
- 3 карточные тренировки в день;
- 1 speaking demo в день;
- free stats preview;
- starter creator quota;
- Mission Pass/учебная utility за жемчужины;
- paywall в момент конкретного лимита;
- 14-day trial.

Главный вывод симуляции: дополнительное давление даёт небольшой возможный прирост подписки, но разрушает гораздо больше будущей ценности. Большой общий revenue upside лежит в сочетании «достаточный бесплатный опыт + контекстный Plus + полезные жемчужины», а не в закрытии ещё большего числа экранов.

### 10.4. Что симуляция не знает

- реальную цену и региональный mix;
- реальную конверсию каждого paywall-context;
- retention по платформе/локали;
- эластичность энергии;
- долю earned против purchased pearls;
- фактическую частоту использования каждой фичи;
- store refunds и billing retry;
- causal effect trial length.

Поэтому она отбирает тесты, а не заменяет их.

## 11. Measurement spine перед экспериментами

Минимальная цепочка:

`feature_gate_evaluated → paywall_impression → plan_selected → purchase_attempt_started → exactly one terminal outcome → entitlement_confirmed → RevenueCat webhook`

Обязательные поля:

- `schema_version`;
- `event_id`;
- `occurred_at_ms`;
- `product_session_id`;
- opaque subject ID;
- screen, build, platform, locale, study target;
- entitlement state;
- remote-config revision;
- `experiment_id`, definition version, control, variant, exposure ID;
- creative revision;
- purchase attempt ID;
- offering/product ID;
- immutable transaction lineage.

Для жемчужин:

- store/catalog impression;
- pack click;
- purchase attempt;
- terminal result;
- webhook confirmation;
- first-spend latency;
- first sink;
- spend within 1/7/30 days;
- repeat purchase;
- breakage;
- balance bucket before/after;
- earned/purchased/granted source cohort.

Текущий analytics contract audit вернул 39 governed events, 31 called/warehoused/measured и 28 ошибок. В SQL отсутствуют четыре Arena и четыре Learning V2 события. Кроме того, найдено 81 реально вызываемое, но не governed имя после исключения законсервированной поверхности.

Privacy-плюсы: default consent denied, native Firebase collection выключена до согласия, V2 не отправляет ответы и точный timeline. Privacy-долг: при отзыве consent нет доказуемого PostHog opt-out/reset/purge; DSR/delete coverage для внешней аналитики не завершён.

## 12. Очередь настоящих A/B-тестов

Сначала AA-тест и исправление measurement spine. Затем строго по одной переменной:

| № | Гипотеза | Control | Variant | Primary | Главный guardrail |
|---:|---|---|---|---|---|
| 1 | Контекстный предел конвертирует лучше общего upsell | текущий post-aha | paywall только при конкретном limit | Revenue/exposed user | D7 retention |
| 2 | Видимый progress proof повышает upgrade | generic benefits | персональные сохранённые карточки/серия/ошибки | Trial/paid start | Close rate |
| 3 | Stats preview создаёт желание глубины | blurred/locked | базовый insight + locked detail | Stats paywall paid | Stats return rate |
| 4 | Starter creator quota усиливает supply и Plus | paid-only create | 10 cards + 1 pack | Creator→paid | Published packs |
| 5 | Free training sample продаёт unlimited | paid-only | 1 daily | Training-context paid | D7 sessions |
| 6 | Более щедрый sample лучше удерживает | 1 daily | 3 daily | Revenue/new user | D30 retention |
| 7 | Speaking proof продаёт benefit | paid-only | weekly demo | Speaking-context paid | Voice completion |
| 8 | Daily speaking ускоряет aha | weekly demo | daily demo | Revenue/new user | Cost/session |
| 9 | Energy 4 blocks лучше 6 | 6 blocks | 4 blocks | Revenue/new user | Energy-block abandonment |
| 10 | 14-day trial лучше 7 для обучения | 7 days | 14 days | First paid after maturity | Refund/churn |
| 11 | Utility catalog создаёт pearl demand | scattered sinks | contextual utility shelf | Confirmed pearl revenue | Plus conversion |
| 12 | Mission Pass даёт incremental revenue | utility shelf | Focus Day bundle | Total revenue/user | Plus cannibalization |
| 13 | Season Pass без double paywall понятнее | 250 + Plus lane | free track + Plus or 250 premium track | Season revenue/user | Refund/support |
| 14 | Первый post-lesson upsell слишком ранний | lesson 1 | after 3 completed sessions | Revenue/new user | D1/D7 retention |

Не запускать A–G одновременно. Использовать A/B, фиксировать hypothesis, allocation, MDE, sample size, analysis window, maturity, stop rule и guardrails до запуска. Не останавливать тест при первом красивом p-value.

При условном baseline 1,7% и желании увидеть +20% relative lift приблизительный порядок — около 25 тысяч пользователей на вариант при 80% power и двустороннем alpha 0,05. Это лишь иллюстрация; настоящий расчёт делается после production baseline отдельно по iOS/Android и ключевым географиям.

## 13. План внедрения

### Фаза 0 — вернуть правду продукту

1. ✅ Убрать Personal Plan из Plus copy — выполнено 12.09.2026.
2. ✅ Убрать старые обещания про три бесплатных урока — выполнено 12.09.2026.
3. ✅ Закрыть Blitz route-level gate — выполнено 12.09.2026.
4. ✅ Исправить Season Pass context и cold-hydration Swipe — выполнено 12.09.2026.
5. ✅ Сделать Remote Config controls правдивыми — выполнено 12.09.2026.
6. Выделить новую energy-v2 schema вместо старого `max_energy=5`.
7. ✅ Синхронизировать streak-freeze price — выполнено 12.09.2026.
8. ✅ Не выпускать DEV-shop без реальных composite operations — оставлен явно preview-only 12.09.2026.

### Фаза 1 — measurement spine

1. Experiment passport в live admin publisher.
2. Exposure ID и purchase attempt ID.
3. Exactly-one terminal purchase outcome.
4. Связь с RevenueCat webhook и server revenue.
5. SRM/AA/maturity/guardrails.
6. V2/Arena warehouse allowlist и screen registry.
7. Полная pearl source/sink воронка.
8. Consent revoke для PostHog и DSR coverage.

### Фаза 2 — собрать baseline 2–4 недели

- Никаких крупных перестановок gates.
- Отдельно iOS/Android, locale и acquisition cohort.
- Зафиксировать D1/D7/D30, paywall funnels, trial-to-paid, refunds, LTV, energy block rate, feature usage, pearl first spend и repeat purchase.

### Фаза 3 — четыре первых теста

1. Contextual paywall vs current.
2. Stats preview.
3. Starter creator quota.
4. Training sample 1/day vs paid-only.

### Фаза 4 — energy 100 и pearl utility

- Сначала 6 vs 4 blocks.
- Затем dynamic refill.
- Затем Mistake/Speaking/Training tickets.
- Затем Focus Day/Mission Pass с обязательной проверкой каннибализации Plus.

### Фаза 5 — персонализация

Только после подтверждённых общих эффектов:

- committed learner — unlimited pace и ошибки;
- pronunciation seeker — speaking proof;
- flashcard builder — storage/creation;
- streak builder — energy/streak protection;
- multi-language — дополнительные языки только при готовом контенте;
- casual/budget-sensitive — не повышать давление, показывать мягкий one-off utility.

## 14. North-star и guardrails

Не использовать «процент купивших подписку» как единственную цель. Она вознаграждает плохую модель, которая выжимает деньги до ухода.

North-star:

**D90 server-confirmed net revenue per new eligible user**, отдельно по платформе и рынку.

Supporting:

- D35 download-to-paid;
- trial start и trial-to-paid после maturity;
- subscription renewal;
- pearl buyer rate и repeat purchase;
- first-spend latency;
- LTV 30/60/90;
- paid feature activation.

Guardrails:

- D1/D7/D30 retention;
- completed learning sessions;
- lesson and practice success;
- energy-block abandonment;
- refunds, chargebacks и support complaints;
- cancellation reason;
- App Store/Play rating;
- child/minor safety;
- Plus cannibalization by pearls;
- competitive fairness.

## 15. Находки и предложения

1. Самый большой немедленный revenue-риск — ложные обещания, а не слабое давление: Personal Plan и старый lesson copy нужно исправить первыми.
2. Самая сильная новая подписочная конструкция — «всё основное обучение бесплатно; Plus снимает паузы и открывает глубину практики».
3. Полностью закрытые speaking/training/creation мешают человеку понять ценность. Небольшой бесплатный sample вероятнее создаст желание unlimited.
4. Жемчужины уже умеют пополнять энергию; новая идея не нужна с нуля. Нужны discoverability, правильная шкала 100-energy и аналитика использования.
5. Реальный спрос на жемчужины стоит строить на Mistake Lab, Speaking, Training, Workshop и Focus Day — не на аватарках и аурах.
6. Бесплатные жемчужные faucets, особенно Daily Journey и jackpot, могут обнулять IAP-спрос. Нельзя менять их вслепую; сначала разделить source cohorts и измерить sink coverage.
7. Season Pass лучше превратить в понятный выбор: Plus открывает premium track, а 250 жемчужин дают тот же сезонный доступ без подписки. Не требовать и подписку, и валюту за одну ценность.
8. Paid randomness не должна быть основой бизнеса; если она остаётся, нужны odds и store-policy compliance.
9. Seven-way paywall contest надо остановить как метод выбора стратегии. Один тест — одна гипотеза.
10. Синтетический максимум давления дал только около +27% относительного Plus-index и уничтожил модельное удержание. Это плохая сделка.
11. Сбалансированный сценарий даёт меньший subscription lift, зато значительно повышает общий revenue potential через жемчужины и сохраняет больше будущих платёжных моментов.
12. До исправления measurement spine нельзя утверждать, какой вариант реально зарабатывает больше. Любой «победитель» сейчас — гипотеза, не факт.


---

## 16. Инвентарь функций и пейволов — freemium vNext (внедрено 2026-09-13)

Правила задачи владельца: Max AI Tutor исключён; дизайн пейволов A–G и онбординга не менялся;
в русских текстах нет слова «Free» («обычный аккаунт», «дневной лимит»); в статистике
нет отдельного PlusBadge — только замок `StatsPremiumBlur`; никакого master-флага —
каждая фича решает доступ своим `gate_<feature>_premium` + entitlement.

Легенда: **Обычный** — обычный аккаунт; **Plus** — любой verified premium (Plus/VIP/intro 72ч);
**💎** — можно ли купить/потратить жемчужины; **обход** — известный обход гейта.

| Функция | Экран / route | Точка входа | Обычный аккаунт | Plus | 💎 | Контекст пейвола | Source | Обход гейта | Устаревший текст | Тесты | Долг |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Онбординг + пейвол | `CleanOnboarding` → `onboardingPaywall` | первый запуск | «Продолжить на обычном аккаунте» | покупка/триал | — | `onboarding_plan` | `onboarding_plan` | нет | нет (Personal Plan снят) | `revenue_vnext_context_contract`, `onboarding_trial_truth_contract`, `freemium_daily_limit_copy_contract` | — |
| Уроки V1 (32) | `/lesson1`, `lessons` | вкладка «Уроки» | все 32 открыты | те же | энергия: refill | `course_after_lesson3`/`lesson_b1` (только доп. фичи Plus) | `lesson_complete_soft_upsell` | нет | нет (RVTD-001 закрыт) | `main_course_paywall_copy` | — |
| Learning V2 | `/learning-v2/*` | вкладка «Уроки» | по прогрессу/энергии | безлимит энергии | руны | — | — | — | — | Learning V2 гейты | вне задачи |
| Энергия | `EnergyContext`, `NoEnergyModal` | старт активности | 100 ед., +1/6 мин, 10/20/25 за старт | безлимит | refill по недостающему (1💎/20 ед.) | `no_energy` | `NoEnergyModal:ctx` | нет | нет | `energy_contract`, `energy_refill_contract` | RVTD-011 |
| Руны/сердечки | `runes_system`, `HomeRuneBalance` | Главная, спин | free | те же | — | — | — | — | — | runes тесты | — |
| Жемчужины (кошелёк) | `shards_system` | покупка/награды | покупка за деньги + награды | те же | sinks: refill, freeze, revive, wager, паки, темы, аватар/аура, season pass, **дневной пропуск (новое)** | — | — | — | — | `economy_constitution_contract`, `quota_day_pass_contract` | RVTD-028 |
| Серия (streak) | `streak_stats` hero | Главная/Статистика | free: серия, заморозка за 💎, revive, пари | заморозка бесплатно | freeze/revive/wager | `streak` | `home_streak` | нет | нет | `streak_freeze_price_source_contract` | — |
| Статистика — уровень/XP/серия/достижения | `/streak_stats` | вкладка | **свободно, сверху** | то же | — | — | — | — | нет | `stats_free_account_layout_contract` | — |
| Статистика — время/опыт/год | `WeekAnalyticsCard` | там же | **замок на всю карточку** (селектор неактивен) | полностью | — | `stats` | `stats_locked_card` | раньше селектор был живой — закрыто | нет | `stats_free_account_layout_contract` | — |
| Статистика — «Все показатели» | `AllMetricsFoldCard` | там же | **замок** | полностью | — | `stats` (overrideTitle) | `stats_locked_card` | раньше свободно — закрыто | нет | там же | — |
| Статистика — «Среди других» | `percentilesBlock` | там же | **замок, без PlusBadge** | полностью | — | `percentiles` | `stats_locked_card` | нет | нет | там же | — |
| Heatmap 365 / patterns / lifetime charts | внутри замков выше | там же | замок | полностью | — | `heatmap`/`patterns`/`stats` | `stats_locked_card` | нет | нет | там же | RVTD-032 (нет отдельного входа) |
| Фраза дня | Главная | Главная | free | то же | — | — | — | — | — | — | — |
| Карточки — хранение | `flashcards_*` | вкладка «Карточки» | 20 сохранённых | безлимит | паки за 💎 | `flashcard_limit` | hub sources | нет | нет | `feature_gates_premium_free` | — |
| Карточки — создание карточки | `flashcards_card_editor` | редактор | Plus (intro 72ч открывает) | безлимит | — | `flashcard_create` | `card_editor_create` | нет | нет | `paywall_copy_contract` | — |
| Наборы — создание | `community_pack_create` | «Мои наборы» | Plus | безлимит | — | `pack_create` | `pack_create` | нет | нет | там же | — |
| Наборы — публикация/marketplace | community packs | «Сообщество» | free (просмотр, добавление) | то же | паки free | — | — | — | — | community тесты | — |
| Тренировка карточек (Swipe/True-False) | `/flashcards_swipe` | hub, setup, прямой route | **3 старта/день** (общая квота) | безлимит | дневной пропуск (операция готова, CTA — RVTD-028) | `flashcard_training` | `flashcards_swipe_*` | нет | текст «в Plus» → «дневной лимит» | `flashcards_swipe_access_behavior` | — |
| Blitz | `/flashcards_blitz_session` | hub + прямой route | **та же квота, единый гейт** | безлимит | то же | `flashcard_training` | `flashcards_blitz_direct` | закрыт (Epic 2A) | нет | `flashcards_blitz_access_behavior`, `monetization_truth_and_blitz_gate_contract` | — |
| Recall / type-in | `/flashcards_recall_session` | hub + прямой | та же квота | безлимит | то же | `flashcard_training` | `flashcards_recall_direct` | нет | нет | `fc_recall_session_contract` | RVTD-020 |
| Speaking mode (карточки) | `/flashcards_speaking_session` | hub + прямой | та же квота; hold-to-talk авторизован сессией | безлимит | то же | `flashcard_training` | `flashcards_speaking_direct` | нет | нет | `flashcards_speaking_quota_unavailable_behavior` | — |
| Autoplay/аудио карточек | hub | hub | Plus | да | — | `flashcard_autoplay` | hub | нет | нет | `paywall_copy_contract` | RVTD-032 |
| «Устно» в уроках (SpeakingButton, lesson1) | уроки/тренажёр | кнопка | **3 голосовые попытки/день** | безлимит | дневной пропуск | `speaking` | `lesson_speaking` | нет (unavailable = fail-open, RVTD-029) | «Plus открывает режим» → «дневной лимит» | `speaking_daily_quota_wiring_contract`, `revenue_daily_quota` | RVTD-026, 029 |
| Hold-to-talk вне сессии | `SpeakHoldButton` | карточки | та же квота | безлимит | то же | `speaking` | `flashcards_speak_hold` | нет | нет | там же | — |
| Голосовой ввод в диалоге | `ai_dialog_session` mic | диалог | та же голосовая квота | безлимит | то же | `ai_voice_input` | `ai_dialog_voice_input` | нет | «Plus открывает микрофон» → «дневной лимит» | там же | — |
| ИИ-диалог | `/ai_dialog_briefing` → `/ai_dialog_session` | каталог, deep-link, урок | **10 реплик/день** (сервер), зеркало на входе | безлимит (abuse-cap 200 — не пользовательский лимит) | — | `dialog_limit` | `ai_dialog_direct_entry` / `ai_dialog_daily_limit` / `dialogs_catalogue` | deep-link идёт через тот же gate сессии | «входят в Plus» → «дневной лимит» | `ai_dialog_daily_limit_wiring_contract`, `ai_dialog_daily_quota` | RVTD-027 (деплой), 030 |
| Диалог — уровни выше достигнутого | каталог | каталог | замок | все уровни | — | `dialog_locked_level` | `dialogs_catalogue` | нет | нет | `ai_dialog_lifetime_gate_contract` | — |
| Разбор диалога | `DialogVerdictScreen` | после диалога | Plus | да | — | `dialog_analysis` | `dialog_analysis` | нет | нет | `premium_dialog_review` | — |
| ИИ-разбор ответа | `AiLimitUpsellCard` | уроки | дневной лимит (сервер `explain_budget`) | больше | — | `ai_explain` | `AiLimitUpsellCard:paywallContext` | нет | нет | explain тесты | — |
| Мои ошибки (mistake practice) | `/mistake_practice_session` | Главная | Plus | да | — | `mistake_practice` | — | нет | нет | `premium_motivation_gates_contract` | — |
| Mastery (повтор урока) | `mastery.ts` | урок | free (контекст недостижим) | free | — | `mastery` | — | — | текст никому не показывается | `paywall_copy_contract` | RVTD-032 |
| Уровни/достижения | `/achievements_screen` | Статистика | free | то же | — | — | — | — | — | — | — |
| Клубы/лиги | `/club_screen` | вкладка | free (кэш 6ч) | удобства | буст лиги за руны | `club` | — | нет | нет | лиги тесты | — |
| Друзья/рефералы | `/(tabs)/friends` | вкладка | free | VIP по рефералу | подарки | `referral_ended` | `referral_ended` | нет | нет | `referral_*` | — |
| Темы/аватары/ауры | `/theme_*`, `/avatar_select` | настройки | Indigo/Sage free; темы 200💎 | Olive + subset | темы/аватар/аура | `theme`/`avatar_aura` | `settings_*` | нет | нет | `customization_*` | не основа 💎 (решение) |
| Уведомления апселл | пуши | — | — | — | — | `notification_upsell` | `notification_upsell` | — | нет | `main_course_paywall_copy` | — |
| Недельный обзор | `weekly_review` | Главная | тизер | полный | — | `weekly_review` | — | нет | нет | `paywall_copy_contract` | — |
| Доп. язык | `settings language picker` | настройки | 1 язык | несколько | — | `language_add` | `settings_language_picker` | нет | нет | там же | — |
| Настройки/подписка | `/(tabs)/settings`, `/manage_subscription` | настройки | «Plus» CTA | управление | — | `generic` | `settings_premium` | нет | нет | `premium_modal_entitlement_behavior` | — |
| Season Pass | `/season_pass` | Главная | free-дорожка; премиум-дорожка за 250💎 | обе | 250 | `season_pass_lane` | `season_pass_lane` | нет | нет | `season_pass_purchase_gate_contract` | — |
| Возврат (winback/expired) | `EntitlementExpiredHost`, `_layout` | автоматически | карточка возврата | — | — | `winback`/`premium_expired`/`vip_expired`/`intro_ended` | `winback` | нет | нет | `paywall_copy_contract` | — |
| Deep-links `/paywall_a…g`, `/premium_modal` | `DirectPaywallRoute` | ссылки | только resolved-free видит A–G | dismiss | — | любой канонический | любой канонический | unknown → fail-closed | нет | `direct_paywall_route_access_behavior`, `paywall_entry_contract` | RVTD-018 |
| DEV Hub «Пейволы» | `DevHubSheet` | DEV | 36 контекстов × A–G + онбординг (`flashcard_autoplay` снят 2026-09-13) | — | — | выбранный | `dev_hub` / `onboarding_plan` | — | — | `dev_hub_paywall_contexts_contract` | — |

### 16.1. Принятые policy (решение этой задачи)

1. Обычный аккаунт: карточные тренировки — 3 старта/день (все режимы вместе); голосовые попытки — 3/день (уроки, hold-to-talk, голосовой ввод диалога вместе); ИИ-диалог — 10 реплик/день (серверный кап `freeDailyReplies`, админ регулирует, 0 = Plus обязателен).
2. Plus/VIP/intro: без дневных лимитов; серверный `premiumDailyReplies` (200) — защита от абьюза, не пользовательский лимит.
3. «Фри» в Пульте (`gate_<feature>_premium=false`) снимает лимит для всех — как в Epic 2A; отдельного master-флага нет.
4. Жемчужины: refill энергии по недостающему, streak freeze/revive, wager, паки, темы, season pass и **дневной пропуск** (+3 попытки на окно: тренировки 15💎, голос 20💎 — стартовая гипотеза для A/B). Ауры/аватары — не основа спроса.
5. Энергия: 100 единиц, +1 за 6 минут, старты 10/20/25, ролик ускоряет восстановление (6 мин→36 с на единицу во время просмотра), Plus — безлимит без визуального счёта.
6. Статистика: уровень/XP/серия/достижения свободны и сверху; вся аналитика — целиком под `StatsPremiumBlur`, без PlusBadge, без живых переключателей.
8. Темы оформления (владелец 2026-09-13): ценников в жемчуге нет; «Индиго» и «Нефрит» бесплатны, все остальные открывает Plus, «Золото» — награда лиги; купленные ранее темы остаются у владельцев; приз спина «тема» берёт кандидатов с полки Plus.
9. Ауры: премиальна только Plus-аура; остальные покупаются за 120 жемчужин (`AVATAR_AURA_BUY_COST`), пейвол открывается только с Plus-ауры.
7. Тексты: контекст исчерпания говорит «дневной лимит исчерпан», объясняет норму обычного аккаунта и что Plus снимает лимит; «Free» в русском не используется.


### 16.2. Макеты для ревью владельца (2026-09-13)

`docs/monetization/PHRASEMAN_PAYWALL_MOCKUPS_2026-09-13.html` — 64 экрана в теме Indigo:
лимит голоса (3 состояния), диалог (3), хаб карточек (3), четыре контекста исчерпания,
лист «дневной пропуск» (4 состояния), статистика обычного аккаунта и Plus, пейволы A–G,
все 36 контекстов с живыми глифами и текстами из кода, DEV Hub. Каждый экран помечен
«в коде» / «предложение».

Решения владельца по макету (2026-09-13, второй круг): точки остатка у «Устно» и на
кнопке тренировки — оставить; кольцо реплик в шапке диалога — всегда; дневной пропуск —
нижний лист, максимально простой; цены 15/20 жемчужин — принять; заголовок
`dialog_locked_level` → «Диалоги уровней выше — в Plus». Замечания: лист докупки и лист
«Готово» переделаны (тон вместо обводок, без галочки-в-кружке, фон — реальный экран);
онбординг-пейвол и хаб карточек в макете теперь повторяют настоящие экраны;
`flashcard_autoplay` удалён из кода (контекстов 36); темы — без ценников, все в Plus;
ауры — премиальна только Plus-аура «Солнечный Владыка», остальные 36 за 120 жемчужин
(в коде так и было, ошибка была в подписи макета).
