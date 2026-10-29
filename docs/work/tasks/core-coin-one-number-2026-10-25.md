# Ядро 25.10 — одно число монет во всех плашках

Governance-ID: TG-919C56FFA797
Governance-ID: TG-649CEB0DD69A

Поручение координатора 25.10 (🔴 до флагов 08:00). Сверка, экзамен, офлайн: Главная 690, плашка «Обучения» 1000, Главная+Пик 1110.

## Outcome
1. Логи `[COIN-DIVERGENCE] display` у каждой плашки: экран, показано, снимок, ожидающие Пика, последнее чтение с диска, итог одного источника, совпало ли. Плюс `[COIN-DIVERGENCE] durable_vs_snapshot`, когда чтение с диска разошлось со снимком.
2. Одно число: все плашки рисуют `peekDisplayedRunes()` и подписаны на `subscribeDisplayedRunes()` (runes_system, закон 1cd4ec19e). Чтение с диска (`getRunesBalanceRead`) остаётся толчком восстановления, но не выводится на экран напрямую.
3. Вариант A для Пика (монеты ступени сразу при итоге, снятие при save_failed) — в файлах Моментов (spire_pending_coins / use_spire_game); число берётся из того же источника.

## Scope
app/runes_system.ts, app/(tabs)/home.tsx (две плашки: старая и сцена), app/(tabs)/lessons.tsx, components/RuneBalanceChip.tsx, components/completion/V2DoneScreen.tsx, V2DoneChain.tsx, app/shop.tsx (только лог). Проверки трат (хватает ли на покупку) — по тратимому балансу, не трогаются.

## Architecture
Один источник показа в runes_system: снимок + ожидающие Пика своего владельца. Журнал — дедупликация по (экран, показано), без uid.

## Security and privacy
Журнал без uid и без сумм кошелька сервера сверх уже логируемых; новых данных нет.

## Technical debt
Временная трассировка `display` после диагноза сокращается до строк расхождения (`agree=false`).

## Verification
Тест: три плашки (Главная, «Обучение», чип) показывают одно число при офлайн-ожидающих; сторож исходников — ни одна плашка не рисует getRunesBalance().balance / peekRunes() напрямую.

## Rollback
Revert коммита.
