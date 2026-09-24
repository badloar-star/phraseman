# Preflight для любой задачи
Task ID: <PM-NNN>. Реальная модель/effort: <из клиента>. Изменения приложения пока запрещены.

Прочитай BIBLE → STATE → DECISIONS → task → spec → actual code. Пройди callers и существующую очередь. Покажи source SHA, точный scope и исключения. Для каждого acceptance укажи способ проверки.

Карточка влияния: Firestore reads/writes/deletes/index reads; Functions/Storage/сеть/AI; разовые и постоянные операции; JS/UI/persistence/memory/release bundle; jobs/listeners/timers; queue owner/priority/dedupe/TTL/cancel/retry; диагностика и админка; migration/backward compatibility/rollback. Не ставь нули вместо unknown. Не придумывай текущую стоимость по количеству импортов. Новые расходы и фоновые механизмы требуют согласования.

Найденное вне scope перечисли отдельно. В конце — GO для ограниченного выполнения либо BLOCKED с точным нерешённым условием, не самовольная реализация.
