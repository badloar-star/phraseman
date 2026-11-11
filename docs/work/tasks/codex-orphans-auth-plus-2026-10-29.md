# Task packet: сиротские правки Codex в разделе «Вход, онбординг, Plus/оплата» — разобрать и довести

Governance-ID: TG-12310C558CDF
Governance-ID: TG-C5F630161DDD
Governance-ID: TG-F430AD09BF5A
Governance-ID: TG-039838159A8E
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Владелец 29.10 ~11:40: «Codex ничего не делает, он давно отключён» → «Разобрать и довести». Опись Ревизора
`docs/work/handover/codex-orphans-2026-10-29.md`, раздел «Вход, онбординг, Plus/оплата»: 21 сирота + 5 «неясно» + ошибка типов
`app/language_welcome.tsx:542 markSoft`. Правило координатора: равно бою (рабочее, тесты зелёные) → коммит; не доделано → доделать с
тестами; непонятное → список владельцу; НИЧЕГО НЕ УДАЛЯТЬ.

## Scope

- Только файлы раздела из описи (пути в описи). Каждый — прочитать дифф, понять смысл, прогнать связанные тесты.
- «Неясно» (вечер 28.10: paywall_funnel/purchase и их тесты) — сначала спросить хозяина в общем канале (координатор).
- `app/language_welcome.tsx` — ошибка типов markSoft: найти, чья правка, довести или вынести владельцу.
- Чужие «живые» файлы — не трогать.

## Architecture

Коммиты по смысловым группам через scripts/safe_commit.sh с --expect; общие файлы — своими хунками (--patch).

## Security and privacy

Удаление аккаунта (functions/src/account_delete.ts) и атрибуция покупок затрагивают данные — сверить с политикой (owner-rules A),
ничего не выкладывать: деплой функций только по кнопке владельца.

## Technical debt

Что не удаётся довести — в итоговый список владельцу с причиной.

## Verification

Связанные тесты через слот (jest / node --test / functions jest без watchman), проверка типов затронутых частей.

## Rollback

git revert соответствующих коммитов; рабочие копии не удаляются.

## Решения координатора 29.10

- Воронка окна покупки v2 — в 2.0.4 не берём, только опись (отправлена координатору); правила и функцию не трогаю.
- Месячный лимит тренировок + ЭНЕРГИЯ «+1 за 30 мин» — одним коммитом «энергия 30 мин + без месячного лимита» (замок владельца 28.10,
  OWNER_LOCKS; сторож owner_locks_energy_30min_no_month_cap_2026_10_28 включается флагом — коммитит Вход, Codex отключён).
  Сервер энергию не считает (functions — только названия подсказок/рассылок). Видимые тексты берут минуты из recoveryIntervalMs
  (ENERGY_PASSIVE_UNIT_MS); «10 минут» осталось только в трёх комментариях (PaywallProofCards.tsx:339, SpireLastChanceSheet.tsx:6,
  remote_flags.ts:263) — человек их не видит.
- premium_status.ts (community_plus_until_ms) — коммитит Ядро.
- Корона Plus (plus-crown.webp, PlusMark.tsx, замены в DialogueV2PlusTools и PlusLaunchSplashView) — ОТКЛОНЕНО ВЛАДЕЛЬЦЕМ (29.10 ~12:40,
  «Оставить ромб»): не коммитить, не удалять.
- language_welcome.tsx:542 — фикс p.accentSoft ушёл в ветку в составе f79bf3785 (сессия цветов закоммитила файл целиком).
- Владелец 29.10 (через координатора): «честная статистика покупок» (воронка v2) — «Довести после 2.0.4». Задача Входа ПОСЛЕ выхода 2.0.4:
  правила → сервер → клиент одной задачей, с эмулятором правил. До того файлы воронки не трогать и в 2.0.4 не брать.
- refillToMax (координатор 29.10): проба energy_p1_safety_probe устарела — запись пополнения вынесена в app/energy_premium_refill.ts
  (persistPremiumEnergyRefill), там readBonusEnergyForMutation ВНУТРИ withStorageLock и под withAccountTransitionLock. Бага нет; проба
  перенацелена на настоящий модуль. Логи входа/выхода [ACCOUNT-LOCK] refillToMax уже есть.
- Воронка v2, полный список файлов (Сайт 29.10 передал серверную часть): app/paywall_funnel.ts, app/paywall_purchase.ts,
  components/paywall/PaywallPlusScreen.tsx, components/CleanOnboarding.tsx (trackShown), firestore.rules (схема paywall_funnel v2 —
  в общем файле с чужими правками), functions/src/paywall_receipt_attribution.ts (+test), functions/src/admin_paywall_variant_stats.ts
  (+13/-4: вариант PLUS, reconciliation, purchase_completed v2 только при совпадении с боевым чеком; +test 3/3),
  functions/src/jarvis/jarvis_data_contract_guard.test.ts (ссылка на paywall_receipt_attribution — сторож данных Джарвиса),
  tests/paywall_funnel_behavior, tests/paywall_purchase_behavior, functions/src/paywall_funnel_rules.emulator.test.ts,
  tests/paywall_receipt_attribution.test.mjs. adminGetPaywallVariantStats на бою с 04.09 — правки Codex там не было.
