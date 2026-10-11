# Task packet: Optimistic UI по остальным экранам R1 — пейвол онбординга (покупка), Настройки (языки), Главная (плитки и «Продолжить»)

Governance-ID: TG-5FDA5CC01897
Status: Done
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/SPIRE_OPTIMISTIC_UI_REVIEW_R1.md, docs/phraseman-2.0/OPTIMISTIC_UI_AUDIT_R1.md

## Outcome

Таблица «есть / нет» по мгновенному отклику и откату для: покупки на пейволе (в т. ч. онбординга), смены языка интерфейса, смены языка изучения, тапов плиток Главной и карточки «Продолжить» — `docs/phraseman-2.0/R1_OPTIMISTIC_UI_REST.md`. Дешёвые закрытия в моих файлах: защита от двойного тапа на «Продолжить» и в `go()` Главной (прямой `router.push` → `nav.push`).

## Scope

In scope: чтение `app/paywall_purchase.ts`, `components/LangContext.tsx`, `components/settings/StudyLanguagePicker.tsx`, `app/settings_language.tsx`, `app/(tabs)/home.tsx`, `components/home/v2/*`; документ; правка двух вызовов навигации в `home.tsx`; обновление одного контракта.
Out of scope: вид онбординга; логика покупки (деньги) и `LangContext` — только в список замечаний; Шпиль.

## Architecture

No architecture change: два вызова переведены на уже существующий `useGuardedNav`.

## Security and privacy

Данные не затрагиваются. Покупка намеренно НЕ оптимистична: доступ Plus включается только после подтверждения магазином.

## Technical debt

Pay now: двойной тап на Главной. Остальное — списком владельцам файлов.

## Verification

`tests/home_learning_cta_contract.test.ts` и `tests/home_interaction_contract.test.ts`, срез типов при ≥4 ГБ.

## Rollback

Откат коммита.
