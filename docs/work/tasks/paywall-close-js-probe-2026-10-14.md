# Task packet: [PAYWALL-CLOSE-JS] — кто держит JS ~1,5 с после крестика пейвола из Настроек (координатор 14.10, цель < 200 мс)

Governance-ID: TG-CB36E8F84AA8
Governance-ID: TG-90FD92298FE0
Status: In progress — логи готовы, внести в окно 21:30 (после «№5 готов» Сверки) или 22:00
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Факт, TAP-LAT Сверки 14.10 (`evidence/paywall_close_taplat/pcf1..3`):

Закрытие из Настроек:
- обработчик → коммит 409–594 мс;
- коммит → кадр 478–1564 мс;
- корневой Profiler «stack» 3–4 раза, по 1,1–1,7 с;
- панели вкладок дешёвые: tab:settings ≤ 561 мс.

Открытие: «stack» 2 раза по ~1,0–1,2 с.

Путь Диалогов быстрый: коммит → кадр 81–103 мс.

Неизвестно, кто внутри «stack» дорог:
- экран пейвола (PaywallPlusScreen перерисовывается при закрытии);
- или обёртка `(tabs)/_layout`: перелистыватель на 5 страниц, перерисовка на возврат фокуса.

Шаг 1 — логи, только под флагом `EXPO_PUBLIC_TAP_LATENCY_TRACE=1`, без флага — пустышки:
- Profiler `screen:premium_modal` вокруг экрана пейвола (`app/premium_modal.tsx`);
- Profiler `layout:tabs` вокруг всей разметки вкладок (`app/(tabs)/_layout.tsx`, через уже существующий TabRenderProbe).

Шаг 2 — по фактам: кто ест время, туда и правка.

## Scope

In scope: две обёртки Profiler.
Out of scope: починка до фактов.

## Architecture

Тот же обработчик `createTapLatencyProfilerHandler()` из `app/tap_latency_trace.ts`. Без флага он `undefined`, и дети рисуются как есть — ноль стоимости.

## Security and privacy

Только имена поддеревьев и миллисекунды.

## Technical debt

- Временная трассировка — снять после починки (флаг и так выключен в релизе).

## Verification

- Сверка: крестик ×3 из Настроек с флагом.
- Смотреть строки `[TAP-LAT] ↳ рендеры: stack … screen:premium_modal … layout:tabs …`.

## Rollback

`git revert`.
