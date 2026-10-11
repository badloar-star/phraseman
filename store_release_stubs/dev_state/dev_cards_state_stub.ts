// Стор-сборка: заглушка app/dev_cards_state.ts. Удержаний, сбоев, подстановки речи и отказов тренировки нет.
export const DEV_CARDS_HOLDS = [] as const;
export const DEV_CARDS_FAILS = [] as const;
export const DEV_SPEECH_MODES = [] as const;
export const DEV_TRAIN_GATES = [] as const;
export function setDevCardsState(): boolean { return false; }
export function isDevCardsHeld(): boolean { return false; }
export function isDevCardsFail(): boolean { return false; }
export function getDevSpeechMode(): null { return null; }
export function getDevTrainGate(): null { return null; }
export function devSpeechTranscriptFor(): null { return null; }
export function resetDevCardsStateForTests(): void {}
export default function __RouteShim() { return null; }
