# Ядро · входы в Plus с неизвестным source/context молча закрывали окно; сторож на пропсы компонентов (25.10)

Governance-ID: TG-C288A11A26FF
Governance-ID: TG-1D2F52FCDBD9
Governance-ID: TG-52D037074BA1
Governance-ID: TG-B205BA5A06B3
Governance-ID: TG-61B14E38E146

Дополнение 3 (Макеты 25.10): ru-тексты варианта «Не видим твой Plus» — дословно по макету (docs/design/v2-app/
paywalls-context-real.html, раздел 4): заголовок «Не видим твой Plus», подзаголовок «Если подписка уже оформлена, восстанови
покупку. Это бесплатно.». Вёрстка шторки (плитка 52, кнопки «Восстановить покупки» / «Оформить Plus» / «Не сейчас», состояния
восстановления) — в PaywallPlusScreen, который сейчас редизайнит другая сессия; Ядро её не делает, передаёт координатору.

Дополнение 2 (координатор 25.10): Сверка поймала dev-красный `unknown_paywall_source:settings_plus` — вход в Plus из Настроек.
Найти источник, внести в тот же коммит. Сторож научить разбирать условное выражение, где обе ветки — литералы контракта
(combo_lesson_gate: workshop ? 'phrase_workshop' : 'combined_lesson'). Новому контексту — прямые тексты и выгоды
(PAYWALL_COPY / PAYWALL_PLANNED_COPY / CONTEXT_BENEFITS / CONTEXT_BENEFITS_PLANNED), как у combined_lesson.

Дополнение (координатор + Ревизор 25.10: «сканер — литералы + пропы + параметры помощников»): корень — пробросы были объявлены
`string` (AiLimitUpsellCard.paywallSource/paywallContext, FlashcardsHubScreen.openTrainingPaywall(source)), поэтому проверка
типов не ловила неизвестный литерал у места вызова. Пробросы типизируются PaywallSource / PremiumContext; сторож запрещает
`string` у параметров/полей с именами paywallSource / paywallContext в любом файле.

## Outcome
Срочно от координатора (нашли Макеты). В релизе `rejectUnknown` (app/paywall_entry_contract.ts) на неизвестный source или
context закрывает окно Plus — кнопка ничего не продаёт:
1. В бою: source `ai_explain_limit_card` — «Посмотреть Plus» на карточке «разбор на сегодня закончился»
   (components/AiMistakeCard.tsx:154 → AiLimitUpsellCard.tsx:107).
2. Мой 36eba41a0: source `dialogue_v2_freeform_server` (свободный диалог, отказ сервера «нужен Plus») — в списке нет.
3. «Мастерская фраз»: context и source `phrase_workshop` (combo_lesson_gate.tsx:76, LearningV2AllLessonsList.tsx:148) —
   сейчас за флагом, добавить сразу, с текстами окна на 9 языках.
Плюс сторож, чтобы класс не повторялся.

## Scope
- app/paywall_entry_contract.ts — три source.
- app/premium_context.ts — context `phrase_workshop` (тип и список).
- Обязательные таблицы по контексту: app/paywall_context_texts.ts (тексты 9 языков), app/paywall_copy.ts (PREMIUM_HERO_ART),
  components/paywall/PaywallContextIcons.tsx (значок), components/dev/paywallDevContexts.ts (подпись dev-списка).
- tests/paywall_entry_callsite_registry_contract.test.ts — сторож видел только вызовы openPremiumPaywall и
  router.push/replace('/premium_modal'); теперь ещё JSX-атрибуты `paywallSource` / `paywallContext` (литералы) у любых
  компонентов — так прятался ai_explain_limit_card.

## Architecture
Контракт — белый список; сторож статически (TypeScript AST) обходит app/components/hooks/modules. Тексты нового контекста —
черновик Ядра по утверждённому названию «Мастерская фраз» на 9 языках из phrase_workshop_copy.ts; ждут утверждения
Переводчика. Оформление окна (цвет, значок) — по образцу «Комбинированного урока», пока Макеты не нарисуют свой.

## Security and privacy
Новых данных нет; source/context — метки воронки.

## Technical debt
Отдельно (в отчёт): при отказе сервера «нужен Plus», когда ТЕЛЕФОН считает Plus включённым, resolvePremiumModalEntry
возвращает dismiss (hasPremiumAccess) — окно закроется у такого человека даже с известным source. Нужен отдельный выбор
поведения (решение владельца/координатора).

## Verification
Сторож paywall_entry_callsite_registry + paywall_entry_contract + paywall_context_texts-тесты; разбор файлов.

## Rollback
Откат коммита — источники снова неизвестны (прежнее поведение).
