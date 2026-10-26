# Ядро · «Нет сети» на Главной при живой сети (владелец 26.10, скрин эмулятора)

Governance-ID: TG-2B4F8A7C2C5B
Governance-ID: TG-08E456E99D81
Status: In progress
Owner: 1 · ЯДРО

## Outcome
Строка «Нет сети» под шапкой «Сцены» Главной показывается только при подтверждённом отсутствии сети: `isConnected === false`
сразу, или `isInternetReachable === false` дольше 5 с; `null`/неизвестно = сеть есть; при возврате сети убирается сразу.
Короткий провал пробы NetInfo (эмулятор, портал Wi-Fi, медленная проба) плашку не включает. Журнал `[NET-BANNER]` показывает,
что решило: снимок NetInfo, ветку, сколько держится «недоступно», показ/скрытие и сколько плашка была на экране.

## Scope
In scope: `components/home/v2/scene/home_net_banner_step.ts` (чистое решение со временем, без импортов RN — тестируется без
моков), `components/home/v2/scene/use_home_scene_offline.ts` (хук + журнал), новый тест
`tests/home_net_banner_debounce_2026_10_26.test.ts`.
Out of scope: глобальный баннер `components/OfflineBanner.tsx` (свой probe в `app/net_status.ts`, текст другой), «Диалоги»
(уже не блокируют по reachable, 22.10), каталог карточек и очередь зовов (тот же шаблон — отмечено координатору).

## Architecture
Чистая функция `homeNetBannerStep(prev, snapshot, nowMs)` → `{ offline, unreachableSinceMs, recheckInMs, reason }`.
Хук держит последний снимок; когда решение «ждём 5 с», ставит один таймер на перепроверку тем же снимком. Новых запросов
в сеть нет: NetInfo отдаёт состояние системы.

## Security and privacy
Не касается данных: в журнал идут только флаги NetInfo и тип подключения.

## Technical debt
Каталог (`app/flashcards/useCatalogOffline.ts`) и очередь зовов (`app/friends_together/nudge_queue.ts`) всё ещё считают
`isInternetReachable === false` офлайном сразу — отдельная задача по слову координатора.

## Verification
Тест: null/unknown → сеть есть; reachable=false < 5 с → нет плашки, ≥ 5 с → плашка; connected=false → сразу; возврат →
сразу убрана; дребезг false/true/false не копит время. Проверка типов приложения на затронутых файлах.

## Rollback
Откат коммита.
