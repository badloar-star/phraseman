// ═══════════════════════════════════════════════════════════════════════════
// flashcard_pages_rev.ts — ревизия страниц карточек: читать ли страницы при восстановлении.
//
// зачем (владелец 22.10, вопрос 27 «сначала безопасные»; карта b94ddc823 п.3; решение координатора — вариант (а),
// страховка 24 ч): страницы users/{uid}/flashcard_pages читались на каждом восстановлении (каждый старт), хотя
// меняются только когда человек правит карточки. Телефон, записав страницы, кладёт в users/{uid} поле
// flashcardPagesRev_<язык> (мс записи) — в ТОТ ЖЕ патч документа, что синк и так отправляет (на users/{userId} висит
// триггер usersWriteRouter — отдельная запись стоила бы вызова функции). Другой телефон при восстановлении сравнивает
// поле с тем, что видел сам: то же и читал меньше суток назад → страницы не читаются (0 чтений).
// Сутки — потому что 2.0.1 (143) и старше пишут страницы БЕЗ ревизии: их правки увидим не позже чем через 24 ч.
// Поля нет → читаем как раньше. Запись на диск — один общий ключ с uid внутри: чужой uid = «не видели».
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FLASHCARD_PAGES_REV_SEEN_KEY = 'flashcard_pages_rev_seen_v1';
export const FLASHCARD_PAGES_REV_SAFETY_MS = 24 * 60 * 60 * 1000;

/** Плоское поле в users/{uid}: вложенная карта при update по FieldPath затёрла бы ревизию второго языка. */
export function flashcardPagesRevField(target: string): string {
  return `flashcardPagesRev_${target}`;
}

export function buildFlashcardPagesRevPatch(targets: Iterable<string>, rev: number): Record<string, number> {
  const patch: Record<string, number> = {};
  for (const target of targets) patch[flashcardPagesRevField(target)] = rev;
  return patch;
}

export function readCloudFlashcardPagesRev(root: Readonly<Record<string, unknown>>, target: string): number {
  const value = Number(root[flashcardPagesRevField(target)]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

type SeenTarget = Readonly<{ rev: number; readAtMs: number }>;
export type FlashcardPagesRevSeen = Readonly<{ uid: string; targets: Readonly<Record<string, SeenTarget>> }>;

export type FlashcardPagesReadReason = 'locked' | 'no_cloud_rev' | 'no_local_cards' | 'not_seen' | 'rev_changed' | 'safety_24h' | 'rev_same';

export function decideFlashcardPagesRead(input: Readonly<{
  uid: string;
  target: string;
  cloudRev: number;
  seen: FlashcardPagesRevSeen | null;
  locked: boolean;
  localHasCards: boolean;
  nowMs: number;
}>): Readonly<{ read: boolean; reason: FlashcardPagesReadReason; seenRev: number | null; lastReadAgeMs: number | null }> {
  const seenTarget = input.seen && input.seen.uid === input.uid ? input.seen.targets[input.target] ?? null : null;
  const seenRev = seenTarget ? seenTarget.rev : null;
  const lastReadAgeMs = seenTarget && seenTarget.readAtMs > 0 ? input.nowMs - seenTarget.readAtMs : null;
  const base = { seenRev, lastReadAgeMs };
  if (input.locked) return { read: true, reason: 'locked', ...base };
  if (input.cloudRev <= 0) return { read: true, reason: 'no_cloud_rev', ...base };
  if (!input.localHasCards) return { read: true, reason: 'no_local_cards', ...base };
  if (!seenTarget) return { read: true, reason: 'not_seen', ...base };
  if (seenTarget.rev !== input.cloudRev) return { read: true, reason: 'rev_changed', ...base };
  if (lastReadAgeMs === null || lastReadAgeMs < 0 || lastReadAgeMs >= FLASHCARD_PAGES_REV_SAFETY_MS) {
    return { read: true, reason: 'safety_24h', ...base };
  }
  return { read: false, reason: 'rev_same', ...base };
}

export async function readFlashcardPagesRevSeen(): Promise<FlashcardPagesRevSeen | null> {
  try {
    const raw = await AsyncStorage.getItem(FLASHCARD_PAGES_REV_SEEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FlashcardPagesRevSeen>;
    if (typeof parsed.uid !== 'string' || !parsed.targets || typeof parsed.targets !== 'object') return null;
    return { uid: parsed.uid, targets: parsed.targets as Record<string, SeenTarget> };
  } catch (error) {
    console.warn('[READ-TTL]', JSON.stringify({ area: 'flashcard_pages', event: 'seen_unreadable', message: String(error).slice(0, 80) })); // guard-ok: catch называет причину
    return null;
  }
}

async function writeSeen(next: FlashcardPagesRevSeen): Promise<void> {
  await AsyncStorage.setItem(FLASHCARD_PAGES_REV_SEEN_KEY, JSON.stringify(next))
    .catch((error: unknown) => console.warn('[READ-TTL]', JSON.stringify({ area: 'flashcard_pages', event: 'seen_write_failed', message: String(error).slice(0, 80) }))); // guard-ok: catch называет причину
}

/** Восстановление прочитало страницы с сервера: запоминаем ревизию облака и время чтения. */
export async function noteFlashcardPagesRead(uid: string, target: string, cloudRev: number, nowMs = Date.now()): Promise<void> {
  const seen = await readFlashcardPagesRevSeen();
  const targets = seen && seen.uid === uid ? { ...seen.targets } : {};
  targets[target] = { rev: cloudRev, readAtMs: nowMs };
  await writeSeen({ uid, targets });
}

/**
 * Этот телефон записал страницы и ревизию: облако = его локальный список. Ревизию запоминаем, а время ЧТЕНИЯ не трогаем —
 * страховка 24 ч считается от последнего настоящего чтения (правки старых сборок без ревизии).
 */
export async function noteFlashcardPagesRevWritten(uid: string, targets: Iterable<string>, rev: number): Promise<void> {
  const seen = await readFlashcardPagesRevSeen();
  const next = seen && seen.uid === uid ? { ...seen.targets } : {};
  for (const target of targets) next[target] = { rev, readAtMs: next[target]?.readAtMs ?? 0 };
  await writeSeen({ uid, targets: next });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
