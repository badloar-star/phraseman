// Стор-сборка: заглушка app/dev_hub_bus.ts. DEV-хаба нет (DevHubSheetGate в сторе ничего не рисует).
export function requestOpenDevHub(): void { return undefined; }
export function subscribeOpenDevHub(): () => void { return () => undefined; }
export default function __RouteShim() { return null; }
