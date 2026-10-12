// Стор-сборка: заглушка app/dev_robot_no_cloud.ts. Флага нет — тумблеры всегда сохраняют и пишут в облако, как в продукте.
export function setDevRobotNoCloud(): boolean { return false; }
export function isDevRobotNoCloud(): boolean { return false; }
export function noteRobotNoCloudSkip(): void {}
export function resetDevRobotNoCloudForTests(): void {}
export default function __RouteShim() { return null; }
