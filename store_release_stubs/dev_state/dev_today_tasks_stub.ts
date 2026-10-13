// Стор-сборка: заглушка app/dev_today_tasks.ts. Задание «Пик» в «Сегодня» не подменяется.
export function subscribeDevTodayTasks(): () => void { return () => undefined; }
export function setDevTodayTaskSpire(): boolean { return false; }
export function getDevTodayTaskSpire(): boolean { return false; }
export default function __RouteShim() { return null; }
