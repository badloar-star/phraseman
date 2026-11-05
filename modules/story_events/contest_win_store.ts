// ═══════════════════════════════════════════════════════════════════════════
// contest_win_store.ts — мост «проекция доступа → история победителю в кольце»: строка contestLastWin от PremiumContext и отметка на телефоне.
//
// зачем (Ядро и координатор 29.10): PremiumContext уже слушает users/{uid}/access_projection/current; из обработчика снапшота он одной строкой
// передаёт сюда поле contestLastWin — без нового state в контексте и без перерисовок потребителей Plus. Отметка «впервые показана / просмотрена»
// лежит в AsyncStorage `story_contest_win_v1:<stableId>` (только последняя победа) — ни одного чтения или записи Firestore.
// Сама механика — общая с историей лесенки (projection_story_store.ts); здесь — поле, ключ отметки и формат истории победителю.
// Лог: [STORY-CONTEST] — что пришло из проекции, загрузка и запись отметки, сбои (ни одного немого catch).
// ═══════════════════════════════════════════════════════════════════════════
import { contestWinEventId, parseContestWinLocal, serializeContestWinLocal, type ContestWinLocal } from './contest_win_story';
import { createProjectionStoryStore, type ProjectionStorySnapshot } from './projection_story_store';

export type ContestWinSnapshot = ProjectionStorySnapshot<ContestWinLocal>;

const store = createProjectionStoryStore<ContestWinLocal>({
  log: '[STORY-CONTEST]',
  field: 'contestLastWin',
  keyPrefix: 'story_contest_win_v1',
  parseLocal: parseContestWinLocal,
  serializeLocal: serializeContestWinLocal,
  keyOfLocal: (local) => local.monthId,
  eventIdOf: (local) => contestWinEventId(local.monthId),
});

/**
 * Вызывается из обработчика снапшота access_projection/current (PremiumContext). Никогда не бросает: сбой здесь не должен задеть Plus.
 * Та же строка того же аккаунта — без уведомлений (ни одной лишней перерисовки).
 */
export function publishContestLastWin(stableUid: string, value: unknown): void {
  store.publish(stableUid, value);
}

export function subscribeContestWin(listener: () => void): () => void {
  return store.subscribe(listener);
}

export function peekContestWin(): ContestWinSnapshot {
  return store.peek();
}

/** Первый показ на телефоне: отметка в памяти сразу (кольцо не мигает), на диск — фоном. Отсюда идут 7 дней показа. */
export function recordContestWinFirstShow(owner: string, monthId: string, atMs: number): void {
  store.recordFirstShow(owner, Object.freeze({ monthId, firstShownAtMs: atMs, seen: false }));
}

/** Просмотр: кольцо гаснет сразу (память), запись — фоном. Чужой id или нет отметки — пропуск с причиной. */
export function markContestWinSeen(id: string): boolean {
  return store.markSeen(id);
}

export function __resetContestWinForTests(): void {
  store.reset();
}
