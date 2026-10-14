# Task packet: волна 20:30 — свайп шторок (8 + 5 fallback + 3 слабые), dev-маршрут моментов, починка сторожа бесконечных анимаций (14.10)

Governance-ID: TG-B10121E001EF
Governance-ID: TG-BD6E7402B878
Governance-ID: TG-C03DD27D37D4
Governance-ID: TG-6A68EB57D1F6
Governance-ID: TG-A3FE2353CC11
Governance-ID: TG-35D1134F2350
Governance-ID: TG-811879DB5D46
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по решению координатора
Related epic/enabler: [sheet-swipe-follow-finger-2026-10-14.md](sheet-swipe-follow-finger-2026-10-14.md), [moments-v3-peak-m01-m03-2026-10-14.md](moments-v3-peak-m01-m03-2026-10-14.md), PM-302

## Outcome

Координатор 14.10: «крестик-тест закончен — вноси в окно 20:30–20:35 одной волной»: (1) шторки с «ручкой» получают свайп вниз тем же путём, что крестик: 8 с обычной раскладкой — лист едет за пальцем, 5 с `position:absolute` — fallback без следования (PM-302), 3 «слабые» (запасные ветки); (2) dev-маршрут `app/dev_moments_preview.tsx` — вход для Сверки без Ядра; (3) сторож `r1_code_defects_batch1` dialogs-007/008 (строка пилюли энергии брифинга после намеренного `solidBolt` из f68ef4c79) и `MomentDown`: бесконечное кольцо «тапни» под охраной (сторож perf_freeze_contract «keeps infinite animations guarded» был красным из-за моего `withRepeat(…, -1)`). После коммита — ссылки Сверке: 3 момента × 3 темы со склейкой и шторки (тянется за пальцем, список прокручивается).

## Scope

In scope: подключение `SheetSwipeClose`/`SheetSwipeRoot` к 15 файлам (Режим Карточек, друг-добавить, жалобы ×2, фраза дня, входящие, визитка «О себе»/«Про» + её Modal-хост, опрос VIP, shop, панель ошибок, лист карточки набора, YouTube-каналы), скрытие ручки в `HybridSheetShell` при `dismissDisabled`, `MomentDown` (охрана анимации), новый маршрут + `constants/devRoutes.ts` + `router.ctx.js` + реестр маршрутов + исключение сканера + сторож маршрута, сторож «ручка ⇒ свайп».

Out of scope: пейвол Plus (Авторизация), общие оболочки со встроенным свайпом, переделка 5 fallback-шторок на обычную раскладку (PM-302 после R1).

## Architecture

Жест — только в зоне ручка+шапка (112 dp), закон >88 px / >900, закрытие тем же обработчиком, что крестик; лист едет внешним Animated-слоем со своим `translateY`, внутренние transform шторки не трогаются; `follow={false}` — только для листов с `position:absolute`. Маршрут моментов — по образцу `dev_spire_preview`: только `ENABLE_DEV_TOOLS && !IS_STORE_RELEASE`, иначе редирект; в стор-сборке исключён регуляркой `router.ctx.js`. Охрана бесконечной анимации — по закону `perf_freeze_contract` (экран в фокусе и приложение в активном состоянии).

## Security and privacy

Данных не касается. Свайп выключен (`enabled=false`, ручка скрыта) при отправке жалоб, сохранении «О себе», покупке в «Про». Маршрут моментов — моки без сети.

## Technical debt

Pay now: сторож бесконечных анимаций (мой долг после 7c7b491ba). Accept temporarily: 5 шторок без следования — PM-302, владелец Дизайн, срок после R1.

## Verification

`npm run test:one` по сторожам (`sheet_handle_implies_swipe_contract`, `perf_freeze_contract`, `spire_moments_v3_contract`, `store_release_*`, сторож маршрута) и затронутым шторкам; кадры и свайп на эмуляторе — Сверка.

## Rollback

git revert коммита волны.
