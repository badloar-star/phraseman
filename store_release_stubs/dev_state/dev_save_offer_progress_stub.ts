// Стор-сборка: заглушка app/dev_save_offer_progress.ts. Подмены прогресса удержания нет.
export const DEV_SAVE_OFFER_PROGRESS = Object.freeze({ streak: 0, lessonsCompleted: 0 });
export function setDevSaveOfferProgress(): boolean { return false; }
export function getDevSaveOfferProgress(): null { return null; }
export type DevSaveOfferOpen = 'progress' | 'support';
export function setDevSaveOfferOpen(): boolean { return false; }
export function takeDevSaveOfferOpen(): null { return null; }
