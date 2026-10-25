// Стор-сборка: заглушка app/dev_home_scene_facts.ts. Факты «Сцены» Главной не подменяются.
export const DEV_HOME_SCENE_FACT_STATES = [] as const;
export function isDevHomeSceneFactState(): boolean { return false; }
export function setDevHomeSceneFacts(): boolean { return false; }
export function getDevHomeSceneFacts(): null { return null; }
export function subscribeDevHomeSceneFacts(): () => void { return () => undefined; }
export default function __RouteShim() { return null; }
