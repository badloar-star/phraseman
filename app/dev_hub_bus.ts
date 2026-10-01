// dev_hub_bus.ts — открыть Dev Hub с любого экрана (только дев-сборка).
//
// зачем (владелец 01.10): «в дев добавь кнопку вход в дев хаб в настройки в самый верх».
// Dev Hub живёт в таббаре (_layout.tsx, setDevHubVisible), а «Настройки» грузятся отдельно
// и до него не дотягиваются. Маленькая шина без зависимостей: экран зовёт openDevHub(),
// таббар подписан и показывает шторку.

type Listener = () => void;
const listeners = new Set<Listener>();

export function requestOpenDevHub(source: string): void {
  if (listeners.size === 0) {
    console.warn('[DEV-HUB] open requested but no host is mounted', { source });
    return;
  }
  console.log('[DEV-HUB] open requested', { source });
  listeners.forEach((listener) => listener());
}

export function subscribeOpenDevHub(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/* expo-router route shim: модуль утилит не должен считаться экраном */
export default function __RouteShim() { return null; }
