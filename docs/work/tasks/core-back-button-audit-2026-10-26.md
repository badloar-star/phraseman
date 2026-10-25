# Ядро · аудит кнопки «назад» на всех экранах (ночь 25→26.10)

Governance-ID: TG-03C9A99A4B85
Governance-ID: TG-E7CD81D4BB85
Status: In progress
Owner: 1 · ЯДРО (координатор: приказ владельца «последовательность кнопки назад на всех экранах, подэкранах и т. д.»)
Related epic/enabler: screen-back-button-one-place-2026-10-22.md (5 · ВХОД: ScreenBackButton, сторож, база 80 → 36)

## Outcome
Отчёт `docs/work/back-button-audit-2026-10-26.md`: для каждого маршрута app/** и экранов-модалок —
- есть ли видимая «назад», каким компонентом, где стоит;
- куда реально ведёт (safeRouterBack c fallback / router.back / replace / dismiss) и куда должна по реестру ролей
  (`navigationFallbackForPath`);
- системная «назад» Android (BackHandler) и свайп iOS (`gestureEnabled`);
- владелец зоны.

Отдельно — петли, выход не туда, экраны без «назад», нестандартные кнопки. Владельцы чинят по зонам, раздаёт координатор.

## Scope
In scope:
- скрипт сканирования (только чтение исходников) и отчёт;
- расширение сторожа: экран-маршрут без «назад» и с «назад» мимо `safeRouterBack` — в базу, база только уменьшается;
- журналы [BACK-NAV] там, где поведение неясно по коду.

Out of scope: перевод экранов на ScreenBackButton (волны владельцев зон), эмулятор.

## Architecture
Общий компонент уже есть — `components/v2/ScreenBackButton.tsx` (позиция по kit.css: слева 20, круг 48, верх =
безопасный верх). Правило переходов — `safeRouterBack(router, fallback)` с реестром ролей `app/navigation_back.ts`.
Новый компонент не нужен. Нужно довести правило «каждый не-корневой экран: ScreenBackButton + safeRouterBack», и чтобы
fallback экрана совпадал с реестром.

## Security and privacy
Данных не касается.

## Technical debt
База непереведённых экранов (36 на 25.10) — долг 5 · ВХОД, гасится волнами. Новые находки аудита идут в отчёт и базу
нового сторожа (только уменьшается).

## Verification
Скрипт детерминирован (повторный прогон даёт тот же отчёт). Сторож-тест на базе; screen_back_button_contract и
navigation_back* — зелёные.

## Rollback
Документы и сторож — откат коммита.
