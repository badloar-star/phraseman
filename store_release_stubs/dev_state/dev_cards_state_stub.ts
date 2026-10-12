// Стор-сборка: заглушка app/dev_cards_state.ts. Удержаний, сбоев, подстановки речи и отказов тренировки нет.
export const DEV_CARDS_HOLDS = [] as const;
export const DEV_CARDS_FAILS = [] as const;
export const DEV_SPEECH_MODES = [] as const;
export const DEV_TRAIN_GATES = [] as const;
export const DEV_BLITZ_ANSWERS = [] as const;
export function setDevCardsState(): boolean { return false; }
export function isDevCardsHeld(): boolean { return false; }
export function isDevCardsFail(): boolean { return false; }
export function getDevSpeechMode(): null { return null; }
export function getDevTrainGate(): null { return null; }
export function getDevBlitzAnswer(): null { return null; }
export function describeDevCardsState(): Record<string, unknown> { return { build: 'store', active: false }; }
export function devSpeechTranscriptFor(): null { return null; }
export function resetDevCardsStateForTests(): void {}
export default function __RouteShim() { return null; }
// зачем (12.10, съёмка R1 Карточек): режим «сообщество без сети» в стор-сборке всегда выключен
export const DEV_COMMUNITY_COMMENTS = [] as const;
export function setDevCommunityState(): boolean { return false; }
export function isDevCommunityPackId(): boolean { return false; }
export function getDevCommunityPack(): null { return null; }
export function getDevCommunityOwnedIds(): readonly string[] { return []; }
export function devCommunityMarkOwned(): void {}
export function isDevCommunityOwned(): boolean { return false; }
export function isDevCommunityLiked(): boolean { return false; }
export function devCommunitySetLiked(): boolean { return false; }
export function getDevCommunityComments(): null { return null; }
export function devCommunityRecordPosted(): void {}
export const DEV_CARDS_VOICES = [] as const;
export function getDevVoices(): null { return null; }
