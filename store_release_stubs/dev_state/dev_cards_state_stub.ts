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
export function setDevPackDraft(): boolean { return false; }
export function getDevPackDraft(): null { return null; }
export const DEV_PACK_DRAFTS = [] as const;
export function setDevLessonIntroSkip(): boolean { return false; }
export function isDevLessonIntroSkip(): boolean { return false; }
// зачем (Авторизация 12.10, cards-v2-038/039): цель ответа «Правды/лжи» и «Напиши» в стор-сборке не подменяется
export function getDevAnswerTarget(): null { return null; }
// зачем (Авторизация 12.10, cards-gap-025): «публикация отправлена» в стор-сборке не подменяется
export function setDevPublishOk(): boolean { return false; }
export function isDevPublishOk(): boolean { return false; }
// зачем (Макеты cards-061, 13.10): заполненная новая карточка в стор-сборке не подменяется
export const DEV_CARD_DRAFTS = [] as const;
export function setDevCardDraft(): boolean { return false; }
export function getDevCardDraft(): null { return null; }
