// Стор-сборка: заглушка app/dev_overlays_off.ts. Окна не гасятся; снимок стабилен ('0:0', как у настоящего модуля в сторе).
export function subscribeDevOverlays(): () => void { return () => undefined; }
export function setDevOverlaysOff(): boolean { return false; }
export function isDevOverlaysOff(): boolean { return false; }
export function requestDevOverlayRecheck(): void { return undefined; }
export function getDevOverlaysSnapshot(): string { return '0:0'; }
