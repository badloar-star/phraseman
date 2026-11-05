// ═══════════════════════════════════════════════════════════════════════════
// referral_ladder_store.ts — мост «проекция доступа → история лесенки в кольце»: строка referralLastReward от PremiumContext и отметка на телефоне.
//
// зачем (Ядро и координатор 29.10): Ядро кладёт награду лесенки в тот же документ проекции, что и победу в конкурсе; PremiumContext из уже
// существующего обработчика снапшота передаёт строку сюда — без нового state и перерисовок Plus. Отметка «впервые показана / просмотрена» —
// AsyncStorage `story_referral_ladder_v1:<stableId>` (только последняя награда), ни одного запроса Firestore. Механика общая с историей
// победителю (projection_story_store.ts). Лог: [STORY-LADDER].
// ═══════════════════════════════════════════════════════════════════════════
import { createProjectionStoryStore, type ProjectionStorySnapshot } from './projection_story_store';
import { ladderStoryEventId, parseLadderStoryLocal, serializeLadderStoryLocal, type LadderStoryLocal } from './referral_ladder_story';

export type LadderStorySnapshot = ProjectionStorySnapshot<LadderStoryLocal>;

const store = createProjectionStoryStore<LadderStoryLocal>({
  log: '[STORY-LADDER]',
  field: 'referralLastReward',
  keyPrefix: 'story_referral_ladder_v1',
  parseLocal: parseLadderStoryLocal,
  serializeLocal: serializeLadderStoryLocal,
  keyOfLocal: (local) => local.key,
  eventIdOf: (local) => ladderStoryEventId(local.key),
});

/** Из обработчика снапшота access_projection/current (PremiumContext). Никогда не бросает; та же строка — без уведомлений. */
export function publishReferralLastReward(stableUid: string, value: unknown): void {
  store.publish(stableUid, value);
}

export function subscribeLadderStory(listener: () => void): () => void {
  return store.subscribe(listener);
}

export function peekLadderStory(): LadderStorySnapshot {
  return store.peek();
}

/** Первый показ на телефоне: отметка в памяти сразу (кольцо не мигает), на диск — фоном. Отсюда идут 7 дней показа. */
export function recordLadderStoryFirstShow(owner: string, key: string, atMs: number): void {
  store.recordFirstShow(owner, Object.freeze({ key, firstShownAtMs: atMs, seen: false }));
}

/** Просмотр: кольцо гаснет сразу (память), запись — фоном. Чужой id или нет отметки — пропуск с причиной. */
export function markLadderStorySeen(id: string): boolean {
  return store.markSeen(id);
}

export function __resetLadderStoryForTests(): void {
  store.reset();
}
