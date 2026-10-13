# Админка 2.0 — инвентаризация для переписывания (13.10, только чтение)

Решение владельца 13.10: админку переписываем ПОСЛЕ выхода 2.0 (не в R1). Удаление из кода и Firebase — только по ответам владельца и только после релиза; необратимое удаление данных запускает сам владелец.
Источник: обход агента-исследователя по коду (admin/v2/legacy.html, functions/src, functions/lib, firestore.rules, firebase.json) + ранее: evidence/ADMIN_2_0_CLEANUP.md, PM-232, PM-230, PM-221.

## РЕШЕНИЯ ВЛАДЕЛЬЦА (13.10, ~10:40–10:50)
- УБРАТЬ совсем (админка + код + база, после релиза; удаление данных запускает владелец): Идеи пользователей; Компас и Подсказки главной; Арена и Лиги (старые); Осколки, A/B пейвола, старая экономика.
- ОСТАВИТЬ: Телеграм-оплаты; Сайт и подарочные сертификаты; Око Саурона / Дайджест / SOC2 (собрать в раздел «Для владельца»). Бета-тестеры — НЕ выбран → кандидат на удаление (уточнить).
- ДОБАВИТЬ в первую очередь: Шпиль; Диалоги; Уроки V2 — выпуск и откат; Монеты и наборы сообщества.
- БЕЗОПАСНОСТЬ: подтверждение опасных действий вводом слова/uid; серверный журнал «кто что нажал»; роли для помощников (починить «Управление доступом»). Предпросмотр «кому уйдёт» — не выбран (можно добавить позже).

## Устройство
- Боевая админка — один файл admin/v2/legacy.html (54 238 строк, 3,7 МБ, ~65 панелей tab-*, switchTab стр. 22254, меню 11579–11639, ADMIN_TAB_KEYS 17955, SECTION_META 50581). Хостинг target admin = admin/v2. iframe: testers.html, beta_testers.html, site.html.
- Корневая admin/* (кроме v2) не хостится — старые копии. admin/v2/full.html читает plan_content_telemetry_events, продюсера нет.
- functions-admin/index.ts не подключена в firebase.json.

## Разделы — статус
Живое: Оценки, Пульт управления (есть мёртвые ключи), Overview, Диагностика, Users, Ошибки контента, Жалобы на пользователей (награда в старом формате спины/руны/жемчуг), Safety/Age/Compliance, Explain reports/cache, Ban list, Архив, App Health, Plus (Real/Admin), Plus Radar, Промокоды, Подарочные сертификаты, Cancel surveys, Опрос Plus, UGC purchases («осколки» в подписях), Remote Config (часть ключей мёртвые), YouTube-каталог, Видео (фразы + тайм-коды), Опросы (часть про XP/Арену), Плашки и сообщения, Опрос дня, Фразы дня, V2 Генератор, Контент Spire, Community, Рефералы/рулетка, Push, Имейлы, Сайт: обращения, Gmail-поддержка, Онбординг, Откуда узнали, Analytics, OpenAI budget.
Внутреннее (не фича приложения): Око Саурона/Jarvis, Планы, Устав, Дайджест, SOC 2, Журнал аудита/операций, Тёплые инстансы, Alerts.
Похоже мёртвое: Идеи (скрыты в приложении PM-171), Компас, Подсказки главной (home_hints не читается), A/B paywall (D78), Управление доступом (adminAccess* не существуют — сломано), Refunds-осколки (D70), full.html.
Неясно: Телеграм оплаты, Бета тестеры (аура удалена D108), Сайт (веб-продажи knowly-www), Очередь модерации.

## Нет в админке (есть в приложении 2.0)
Spire: просмотр групп/недель/ошибок кронов/инцидентов. Dialogs V2: сценарии, сессии, память, жалобы. Learning V2: релиз/откат/печать курса (~25 готовых функций без UI). Наборы сообщества: модерация комментариев, продажи за руны, почта продавца. Монеты/руны: журнал, ранг, выдача рун, coinReconcileV1. Темы. Друзья/«подтолкнуть», уведомления, биография, энергия. Ключи RC без UI: soft_upsell_* ×5, weekly_review_ai_v2_enabled, onboarding_ab_*, auth_link_cache_ttl_ms, boot_restore_defer_enabled, paywall_reference_prices, compass_voice_fallback_*. Account V2: outbox, deletion jobs, миграция.

## Кандидаты на чистку (проверять вручную)
- 43 callable без вызовов (часть — недоделанный UI Learning V2, не мусор); ~35 вызываются только скриптами/тестами (Идеи ×8, spin/referral/plans/…); Арена: adminArenaConfigSet, adminArenaPublication* ×4 — решение владельца (D74/D78).
- Коллекции в firestore.rules без упоминаний в коде: arena_*, league_*, quest_*, shard_*, coin_migrations/exchange, pearls_to_coins_migrations, max_voice_*, compass_*, quiz_explain*, content_studio_* ×5, agent_* ~21, pronunciation_score_* ×3 и др.
- Только functions/src: arena_v2_* ~30, league_groups, tournament*, botProfiles, arena_rooms*, shard_log, level_spin_* — код-сирота (D91: чистить после релиза).

## Что админка меняет в приложении вживую (remote_config/app → app/remote_flags.ts)
Рубильники: техработы (баннер/блок), принудительное обновление, ai_global_disable, accounts_v2_*, phone_state_*, spire_tab_enabled + config/spire_v1, energy_mistake_charge, видео/YouTube, рефералы/рулетка, intro_full_access, онбординг (шаги/пропуск).
Деньги: gate_*_premium, lifetime_button_enabled, paywall_reviews_enabled, promo_banner_*, discount_offer_*, промокоды, сертификаты.
Рассылки/награды: app_messages, глобальная модалка с наградой, push, выдача монет/дней Plus, награда за жалобу, квоты ИИ-диалога.
Контент: фразы/опрос дня, опросы, video_phrase_sets, модерация наборов, бан/предупреждения.
Мёртвые ключи в админке: speaking_enabled, explain_enabled, ideas_enabled, numeric_energy_v2, free_lesson_limit, max_energy, gate_ai_text_tutor, energy_recovery_interval_ms, paywall_v2_pct, lifetime_button_enabled (дефолт расходится, LIFETIME_SALE_RETIRED), gate_arena/avatar_auras/mastery_premium.

## Предложения (агент + координатор)
Безопасность: починить или убрать «Управление доступом»; запретить прямую запись remote_config/* и config/accounts_v2 из браузера (только через callable с аудитом); admin_log писать только сервером; прямые deleteDoc → callable с причиной; подтверждение вводом слова/uid для необратимых и массовых действий + предпросмотр «кому уйдёт»; CSP без unsafe-inline/unpkg, библиотеки локально с SRI, убрать 127.0.0.1:43817.
Удобство: убрать мёртвое; добавить недостающие ключи в Пульт и выровнять дефолты; сгруппировать ~55 пунктов меню, внутреннее — в «Для владельца»; подключить релиз/откат Learning V2 и просмотр Spire-недель.
Стоимость/скорость: обновить ADMIN_FIRESTORE_COST_AUDIT; проверить loadUsers/loadArchive/loadOpsLog; разбить legacy.html на модули с кэшем (сейчас no-store на 3,7 МБ при каждом заходе); убрать дубли файлов.
