// Стор-сборка: заглушка app/dev_animations_off.ts. Остановки анимаций нет.
export function subscribeDevAnimationsOff(): () => void { return () => undefined; }
export function setDevAnimationsOff(): boolean { return false; }
export function isDevAnimationsOff(): boolean { return false; }
