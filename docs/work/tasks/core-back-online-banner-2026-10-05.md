# Task packet: system-005 — плашка «Снова в сети» по макету

Governance-ID: TG-84E011A02C39
Status: In progress (Дизайн/координатор 05.10: в system.html SYS-02 есть «Снова в сети»; план одобрен — «вход 480 мс,
~2 с, один раз на переход, анимация на UI-потоке»; лог c306451e4 подтвердил: при старте unknown→online,
wouldShowBackOnline:false — ложного показа на запуске нет)
Owner: сессия 1 · ЯДРО

## Outcome

При реальном переходе offline→online (координатор net_status шлёт только смены статуса) OfflineBanner показывает
светлую капсулу «Снова в сети» с галочкой: фон #F2F1F6, текст #0B0C0E (макет `.banner` online), 44 / r22 / поля 14 /
промежуток 10 / значок 20 / текст 16/600 (D145). Вход translateY −70→0 за 480 мс cubic-bezier(.2,1,.3,1)
(`@keyframes bin`), держится 2 с, уходит за LUM.exitMs (260) вверх с прозрачностью — Reanimated (UI-поток).
Reduce Motion — без анимации. Новый офлайн во время показа — сразу «Нет соединения». Один показ на переход.

## Scope

components/OfflineBanner.tsx; app/net_status.ts — без изменений (лог [NET-STATUS] остаётся до проверки Сверкой).

## Architecture

Состояние в том же компоненте: ключ показа на переход; без глобальных очередей (празднования/статусы не durable).

## Security and privacy

Не затрагивает.

## Technical debt

Временные логи [NET-STATUS]/[NET-BANNER] убрать после проверки Сверкой (режим полёта вкл/выкл).

## Verification

Синтаксис; сторож offline_banner_liquid_glass_source_contract; Сверка: режим полёта вкл → выкл → плашка 2 с, при
запуске — нет.

## Rollback

git revert коммита.
