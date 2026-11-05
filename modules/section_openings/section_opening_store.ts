// section_opening_store.ts — отметки и очередь окон «Открытие разделов»: память процесса + AsyncStorage (только телефон, сеть 0).
//
// зачем (координатор 04.11): «показано» — один раз на раздел и аккаунт. Отметка в памяти ставится сразу при показе, на диск — фоном;
// непоказанное после убийства приложения вернётся в очередь на следующем запуске (отметка пишется при показе, не при решении).
// Ключ лежит в уже стираемом семействе `story_events_v1:` (app/cloud_sync WIPE_ONLY_ACCOUNT_KEY_PREFIXES): стирается при выходе
// и удалении аккаунта без правки общего списка. Журнал [SECTION-OPENING]; ни один catch не молчит.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration, subscribeAccountGeneration } from '../../app/account_generation';
import {
  EMPTY_MARKS, decideSectionOpenings, markShown, parseMarks, serializeMarks,
  type SectionOpeningFacts, type SectionOpeningId, type SectionOpeningMarks,
} from './section_opening_core';

const LOG = '[SECTION-OPENING]';
export const SECTION_OPENING_KEY_PREFIX = 'story_events_v1:section_openings';
export const sectionOpeningKey = (owner: string): string => `${SECTION_OPENING_KEY_PREFIX}:${owner}`;

/** Чем закрыли окно: «Пропустить», кнопка раздела (CTA) или «Назад»/системный жест. */
export type SectionOpeningDismissSource = 'skip' | 'cta' | 'back';
// зачем (владелец 05.11 «ЭТО ИСТОРИЯ»): pending — сколько окон осталось в очереди после текущего: сегментная полоска истории показывает всю очередь (Ранг · Видео · Диалоги)
export type SectionOpeningSnapshot = Readonly<{ owner: string | null; current: SectionOpeningId | null; pending: number }>;
const EMPTY_SNAPSHOT: SectionOpeningSnapshot = Object.freeze({ owner: null, current: null, pending: 0 });

let owner: string | null = null;
let marks: SectionOpeningMarks = EMPTY_MARKS;
let loaded = false;
let loading: Promise<void> | null = null;
let current: SectionOpeningId | null = null;
let pending: SectionOpeningId[] = [];
// зачем (координатор 05.11, «тап слева — предыдущий кадр»): закрытые в этой «истории» кадры, чтобы вернуться назад
let history: SectionOpeningId[] = [];
let snapshot: SectionOpeningSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

const reasonOf = (error: unknown): string => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));
const short = (id: string | null): string => (id ? `${id.slice(0, 6)}…` : '—');

function currentOwner(): string | null {
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId ? token.stableId : null;
}

function publish(): void {
  if (snapshot.owner === owner && snapshot.current === current && snapshot.pending === pending.length) return; // зачем: та же картина — без перерисовок
  snapshot = { owner, current, pending: pending.length };
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn(LOG, 'listener_failed', reasonOf(error)); // guard-ok: слушатель не должен ломать остальных
    }
  });
}

function resetForNewOwner(next: string | null): void {
  owner = next;
  marks = EMPTY_MARKS;
  loaded = false;
  loading = null;
  current = null;
  pending = [];
  history = [];
  publish();
}

async function ensureLoaded(forOwner: string): Promise<void> {
  if (loaded && owner === forOwner) return;
  if (owner !== forOwner) resetForNewOwner(forOwner);
  if (!loading) {
    loading = AsyncStorage.getItem(sectionOpeningKey(forOwner))
      .then((raw) => {
        if (owner !== forOwner) return; // зачем: за время чтения сменился аккаунт — чужие отметки не берём
        const parsed = parseMarks(raw);
        if (raw !== null && parsed === null) console.warn(LOG, 'marks_corrupt — считаем, что отметок нет', short(forOwner)); // guard-ok: причина
        marks = parsed ?? EMPTY_MARKS;
        loaded = true;
        console.log(LOG, 'marks_loaded', JSON.stringify({ owner: short(forOwner), seeded: marks.seeded, seen: marks.seen })); // guard-ok: загрузка
      })
      .catch((error: unknown) => {
        // зачем: не прочли отметки — НЕ показываем окна (лучше пропустить, чем показать второй раз или потоком старому пользователю)
        console.warn(LOG, 'marks_read_failed — окон не будет', reasonOf(error)); // guard-ok: catch с причиной
      })
      .finally(() => { loading = null; });
  }
  await loading;
}

function persist(forOwner: string, next: SectionOpeningMarks): void {
  marks = next;
  AsyncStorage.setItem(sectionOpeningKey(forOwner), serializeMarks(next)).catch((error: unknown) => {
    console.warn(LOG, 'marks_write_failed — отметка только в памяти', reasonOf(error)); // guard-ok: catch с причиной
  });
}

/** Из хоста при каждой смене фактов. Никогда не бросает. */
export async function reconcileSectionOpenings(facts: SectionOpeningFacts): Promise<void> {
  try {
    const forOwner = currentOwner();
    if (!forOwner) {
      console.log(LOG, 'reconcile_skipped no_owner'); // guard-ok: ранний выход
      if (owner !== null) resetForNewOwner(null);
      return;
    }
    await ensureLoaded(forOwner);
    if (!loaded || owner !== forOwner) return;
    const decision = decideSectionOpenings(marks, facts);
    if (decision.nextMarks) persist(forOwner, decision.nextMarks);
    pending = decision.queue.filter((id) => id !== current);
    if (current === null && pending.length > 0) current = pending.shift() ?? null;
    console.log(LOG, 'reconcile', JSON.stringify({ reason: decision.reason, isNew: facts.isNew, open: facts.open, plus: facts.plusActive, queue: decision.queue, current })); // guard-ok: итог решения
    publish();
  } catch (error) {
    console.warn(LOG, 'reconcile_failed', reasonOf(error)); // guard-ok: сбой не должен задеть Главную
  }
}

/** Окно появилось на экране: отметка «показано» в памяти сразу, на диск — фоном. */
export function noteSectionOpeningShown(id: SectionOpeningId): void {
  try {
    if (!owner) return;
    persist(owner, markShown(marks, id));
    console.log(LOG, 'shown', JSON.stringify({ id, seen: marks.seen })); // guard-ok: показ
  } catch (error) {
    console.warn(LOG, 'shown_failed', reasonOf(error)); // guard-ok: catch с причиной
  }
}

/** Закрыто (CTA, «Пропустить», «Назад»): следующее окно очереди, если есть. */
export function dismissSectionOpening(source: SectionOpeningDismissSource = 'back'): SectionOpeningId | null {
  const closed = current;
  if (closed) history.push(closed);
  current = pending.shift() ?? null;
  if (current === null) history = []; // история кончилась — назад возвращаться некуда
  // зачем (150 №11, Maestro: «Skip закрывает?»): одна строка на закрытие — какой раздел, чем закрыли, пропуск ли это и лежит ли отметка «показано» (persisted) — значит окно
  // для этого раздела не вернётся. Отметка ставится при ПОКАЗЕ (noteSectionOpeningShown), поэтому «Пропустить» = закрыто навсегда без отдельной записи.
  console.log(LOG, 'dismissed', JSON.stringify({ event: 'dismissed', section: closed, source, skipped: source === 'skip', persisted: closed ? marks.seen.includes(closed) : null, closed, next: current })); // guard-ok: закрытие
  publish();
  return closed;
}

/** Тап слева в истории: вернуть предыдущий кадр (текущий уходит в начало очереди). false — предыдущего нет. */
export function goBackSectionOpening(): boolean {
  const previous = history.pop();
  if (!previous || current === null) { console.log(LOG, 'back_skipped', JSON.stringify({ hasPrevious: Boolean(previous), current })); return false; } // guard-ok: ранний выход называет причину
  pending.unshift(current);
  current = previous;
  console.log(LOG, 'back', JSON.stringify({ to: current, pending })); // guard-ok: переход назад в истории
  publish();
  return true;
}

export const subscribeSectionOpening = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const peekSectionOpening = (): SectionOpeningSnapshot => snapshot;

subscribeAccountGeneration(() => {
  const next = currentOwner();
  if (next !== owner) resetForNewOwner(next); // зачем: другой аккаунт — чужая очередь и чужие отметки не живут
});

export function __resetSectionOpeningForTests(): void {
  owner = null; marks = EMPTY_MARKS; loaded = false; loading = null; current = null; pending = []; history = []; snapshot = EMPTY_SNAPSHOT;
}
