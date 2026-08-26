# 005 — Cold tab без блокировки первого кадра

**Severity:** HIGH  
**Status:** DONE  
**Audit baseline:** `f11824104`

## Проблема

На холодном tap вкладка синхронно вызывает тяжёлый `require()` внутри того же
handler до React commit; URL sync дополнительно отложен timer tick. В swipe
холодная вкладка монтируется только после settlement.

## Исправление

- Prewarm всех deferred tab modules вне press hot path как можно раньше после
  первого безопасного paint.
- Tap обязан синхронно обновить semantic/visual active state; тяжёлый import не
  должен выполняться внутри обработчика.
- Для ещё неготового cold screen мгновенно показать непрозрачный tab shell,
  затем атомарно заменить его контентом.
- Не удалять ни одну вкладку и не менять Arena/route contracts.

## Contract / проверка

- Source contract запрещает synchronous prewarm/require и timers в tab tap path.
- Active tab всегда монтируется независимо от background bookkeeping.
- Repeat audit отдельно проверяет tap и swipe cold paths.
