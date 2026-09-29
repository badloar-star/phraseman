# Отчёт Claude — ночь 29–30.09.2026 (перенос дизайна PhraseMan 2.0 Liquid Glass)

Точка входа: HANDOVER_CLAUDE_2026-09-29.md (папка макетов `C:\Users\badlo\Documents\Codex\2026-09-26\new-chat-2\outputs\PhraseMan-Liquid-Glass\`).
Пакет задачи: `docs/work/tasks/2026-09-29_liquid_glass_night_transfer.md`.

## Указания владельца в этой сессии
- Главная и хаб «Карточки» утверждены — НЕ менять (в памяти: home-screen-frozen).
- Всё остальное — с макетов 1 в 1.
- Таббар: без подписей, иконки крупнее и по центру (сделано).

## Сделано и закоммичено (исходники; на устройстве смотрел на эмуляторе Pixel_8)
| Пакет | Коммит | Тесты | Эмулятор |
|---|---|---|---|
| Таббар без подписей, иконки 28 | c94aa653f | v2_tab_bar 3/3 | да, виден |
| Корень «Настройки» PRF-01 (+ SettingsGlassRows) | bcb41f875 | 27/27 + sage_porcelain 4/4 | да, виден |
| Пейвол вне онбординга: только A и D, сравнение Free/Plus по группам | b2d266fa6, f2b702ed8 | 4+11+9 = 24/24 | да (вариант A виден) |
| Шпиль: скрытая вкладка + главный экран башни (замок выключен) | 3e525984c | 8/8 + tab_page_model 4/4 | нет: вкладка скрыта по умолчанию |

## В работе на момент записи
«Нет энергии» (NoEnergyModal), шторка уведомлений + системные сообщения (AppMessagesInbox, GlobalBroadcast, PersonalAdminMessage), окно регистрации + IntroFullAccess.

## BLOCKED-OWNER (без тебя нельзя)
1. «Из видео» пусто: наборы создаются только публикацией ролика или админ-функцией `adminBackfillVideoPacks` — её никто не запускал. Запуск = запись в боевую базу.
2. «Безлимит» в сравнении Plus (по макету) против кода: свои карточки 1500 на язык (`app/flashcards/custom_card_access.ts`), AI-разбор ошибок — клиент режет до 3/день (`app/use_mistake_explain.ts`), тренировки — нужен regression-тест. Тексты пейвола нельзя выпускать до решения.
3. Строка «Сценарии диалогов: 51 активный» в пейволе — по коду каталог диалогов V2 открывается по рангу, не по Plus; нужна сверка.
4. Purchase-marker до открытия магазина (открытые P1-гонки) — не внедрён.
5. Шпиль: включение для людей (remote-ключ `spire_tab_enabled` + `config/spire_v1.enabled`), пакеты B/D/E (комната, игра-ступень, тур, итог недели), энергия ступени PM-274, вопрос про Privacy Policy для показа участников комнаты. `spireJoinRoom` на сервере не проверяет флаг — клиент его не вызывает.
6. Публичный coinRank друзей/участников — нужна серверная схема.
7. Онбординг-ветка A/D теряет `isOnboarding` в вызове `ctaLabelFor` (`paywall_cta_scope_contract` 1 fail) — код онбординга не трогал.

## Устаревшие тесты (падали не из-за этой работы)
- `tab_bar_motion_accessibility_contract`, `tabbar_scroll_chrome_contract` (ждут старый `_layout.tsx`).
- `referral_screens_contract` (EntitlementExpiredHost), `settings_locale_runtime`, `promo_codes_ui_contract`, `sage_porcelain_picker_contract`, `gustav_surface_target_switch`, `paywall_new_variants_contract`, `paywall_entry_callsite_registry_contract`, `premium_modal_entitlement_behavior` (окружение).

## Не проверено нативно
Крупный шрифт, короткие экраны, все 13 тем, iOS, Шпиль на устройстве, покупка/restore (не вызывались).

## Замечания 🟡
- Пейвол: «€3,33 / мес · €0.11 в день» — запятая и точка в одной строке (формат идёт из существующей логики цен).
- Настройки: «Язык изучения» показан без нажатия (PRF-23 не активировать); модалки аккаунта/ника в `settings.tsx` недостижимы (мёртвый код).
- Трекер `APP_TRANSFER_TRACKER.md` занижает готовность ряда окон (UndoDeleteSnackbar, AiConsentSheetModalHybrid, SoftContextualUpsellCard, AiLimitUpsellCard, MistakeEli5Modal) — по коду уже на LG.
- Инвентарь окон: `OVERLAY_INVENTORY_2026-09-29.md`, план Шпиля: `SPIRE_PLAN_2026-09-29.md` (папка макетов).

## Следующая точка остановки
Дождаться результатов второй волны → проверить на эмуляторе → коммит; затем волна 3 из инвентаря: CollectibleDropModal, AchievementNotifModal, ExplainSheet (classic по умолчанию!), ReportErrorButton/ExplainReportButton (30 экранов), PremiumCelebration/EntitlementExpired, DialogWhy/GoalsSheet, PackCommentsSheet, NicknameEdit/DeleteAccount/Logout, ReleaseNotes legacy.
