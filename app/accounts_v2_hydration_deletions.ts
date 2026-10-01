import type { HydratedCard } from '../modules/account-session-v2/account_v2_hydration';
import { isStudyTarget, type StudyTarget } from './study_target';
import { flashcardsSwipeMemoryKey } from './target_storage_keys';

/*
 * Account V2, Пакет 7D (TG-7768603E99DD) — удалённые карточки не воскресают.
 *
 * зачем: гидрация 6G была add-only. Карточка возвращалась, если:
 *  (а) удалена на телефоне до V2 → перенос старого облака принёс её в V2 → гидрация добавила;
 *  (б) выход/вход с включённым выключателем 7A → старый restore из устаревшего облака вернул
 *      карточки, удалённые уже при V2 (на сервере V2 они — tombstone);
 *  (в) удалена на другом устройстве (tombstone V2), а здесь ещё лежит.
 *
 * ГЛАВНЫЙ ЗАКОН: удаление побеждает ТОЛЬКО если оно свежее последней известной правки.
 * Время неизвестно хоть с одной стороны — оставляем (никаких удалений «на всякий случай»).
 *  - Правка ЛОКАЛЬНОЙ карточки = max(addedAt, lastSeenAt памяти свайпов). Память
 *    нечитаема / времён нет → неизвестно → оставить.
 *  - Удаление: tombstone V2 → время последнего изменения сущности по часам сервера
 *    (после tombstone сущность не меняется); журнал → время удаления по часам телефона.
 *    Есть оба — берём более позднее.
 *  - Журнал против ЖИВОЙ карточки сервера (её нет / есть локально): журнал побеждает, если
 *    сущность менялась последний раз раньше удаления (updatedAtMs < T), ИЛИ сущность записана
 *    ровно один раз (revision 1: перенос или создание) и все её времена (addedAt, srs) раньше T.
 *    Иначе сервер свежее (правка на другом устройстве) → карточка возвращается, запись журнала снимается.
 *  - Победа журнала над живой карточкой сервера → tombstone в V2 (иначе следующая новая
 *    установка снова её получит).
 * Наборы библиотеки: в приложении НЕТ удаления набора человеком (покупки не снимаются) —
 * воскрешать нечего; tombstone набора локально не применяется (это была бы потеря покупки).
 * Расхождение часов телефона и сервера — допущение (задокументировано в пакете).
 * Логи [ACCOUNT-V2] — решение и причина, без id карточек (в id сохранённых есть текст фразы).
 */

const LOG = '[ACCOUNT-V2]';
const TRAINING_PREFIX: Readonly<Record<'saved' | 'custom', string>> = Object.freeze({ saved: 'saved:all:', custom: 'custom:all:' });

type Counts = Record<string, number>;
type List = 'saved' | 'custom';

function time(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function latest(...values: readonly (number | null)[]): number | null {
  const known = values.filter((value): value is number => value !== null);
  return known.length === 0 ? null : Math.max(...known);
}

export function cardEntityKey(target: string, list: List, id: string): string {
  return `${target}:${list}:${id}`;
}

/** Времена правки, известные серверу о живой карточке (addedAt поля, srs.updatedAtMs). */
export function serverCardContentTimeMs(card: HydratedCard): number | null {
  return latest(time(card.fields.addedAt), time(card.srs?.updatedAtMs));
}

export type Verdict = Readonly<{ remove: boolean; reason: string }>;

/** Журнал (удалено здесь в deletedAtMs) против живой карточки сервера. */
export function journalBeatsServerCard(deletedAtMs: number, card: HydratedCard): Verdict {
  const changed = time(card.updatedAtMs);
  if (changed !== null && changed < deletedAtMs) return { remove: true, reason: 'server_changed_before_deletion' };
  const content = serverCardContentTimeMs(card);
  if (card.revision === 1 && content !== null && content < deletedAtMs) {
    return { remove: true, reason: 'server_written_once_before_deletion' };
  }
  return { remove: false, reason: changed === null && content === null ? 'server_time_unknown' : 'server_newer' };
}

/** Последняя известная правка локальной карточки; null — неизвестно. */
export function localCardEditTimeMs(card: Readonly<{ addedAt?: unknown }>, memoryRow: unknown): number | null {
  const seen = typeof memoryRow === 'object' && memoryRow !== null ? (memoryRow as { lastSeenAt?: unknown }).lastSeenAt : undefined;
  return latest(time(card.addedAt), time(seen));
}

/** Удаление (tombstone и/или журнал) против локальной карточки. */
export function deletionBeatsLocalCard(deletedAtMs: number | null, localEditMs: number | null): Verdict {
  if (deletedAtMs === null) return { remove: false, reason: 'deletion_time_unknown' };
  if (localEditMs === null) return { remove: false, reason: 'local_edit_time_unknown' };
  return deletedAtMs > localEditMs
    ? { remove: true, reason: 'deletion_newer_than_local_edit' }
    : { remove: false, reason: 'local_edit_newer' };
}

export type DeletionPlan = Readonly<{
  /** Живые карточки сервера, которые НЕ добавлять (журнал свежее). */
  blocked: ReadonlySet<string>;
  /** Кандидаты на локальное удаление: ключ → время удаления (null — неизвестно). */
  removals: ReadonlyMap<string, number | null>;
  /** Победы журнала над живой карточкой сервера → tombstone в V2: язык → список → id. */
  tombstones: ReadonlyMap<string, readonly Readonly<{ target: StudyTarget; list: List; id: string }>[]>;
  /** Записи журнала, устаревшие (сервер свежее). */
  forget: readonly string[];
}>;

/** Чистое планирование по снимку сервера и журналу. Без хранилищ. */
export function planCardDeletions(
  cards: readonly HydratedCard[], journal: ReadonlyMap<string, number>, counts: Counts,
): DeletionPlan {
  const blocked = new Set<string>();
  const removals = new Map<string, number | null>();
  const tombstones = new Map<string, Readonly<{ target: StudyTarget; list: List; id: string }>[]>();
  const forget: string[] = [];
  const server = new Map<string, HydratedCard>();
  for (const card of cards) {
    if (!isStudyTarget(card.target)) continue;
    server.set(cardEntityKey(card.target, card.list, card.id), card);
  }
  for (const [key, card] of server) {
    const deletedHere = journal.get(key);
    if (card.deleted) {
      // (б)/(в): tombstone V2; с журналом — берём более позднее удаление.
      removals.set(key, latest(time(card.updatedAtMs), deletedHere ?? null));
      continue;
    }
    if (deletedHere === undefined) continue;
    const verdict = journalBeatsServerCard(deletedHere, card);
    console.log(`${LOG} hydrate card_deletion decision=${verdict.remove ? 'block_add' : 'allow_add'} reason=${verdict.reason} list=${card.list}`);
    if (!verdict.remove) {
      forget.push(key);
      counts.cards_journal_server_newer = (counts.cards_journal_server_newer ?? 0) + 1;
      continue;
    }
    blocked.add(key);
    removals.set(key, deletedHere);
    const target = card.target as StudyTarget;
    const group = `${target}:${card.list}`;
    // guard-ok: Map в памяти, не Firestore.
    tombstones.set(group, [...(tombstones.get(group) ?? []), { target, list: card.list, id: card.id }]);
    counts.cards_journal_blocked = (counts.cards_journal_blocked ?? 0) + 1;
  }
  // (б) без сервера: карточка из журнала вернулась старым restore, а V2 о ней не знает.
  for (const [key, deletedAtMs] of journal) {
    if (!server.has(key)) removals.set(key, deletedAtMs); // guard-ok: Map в памяти, не Firestore.
  }
  return { blocked, removals, tombstones, forget };
}

type Ports = Readonly<{
  readJournal: () => Promise<ReadonlyMap<string, number> | null>;
  forgetJournal: (keys: readonly string[]) => Promise<void>;
  readMemory: (key: string) => Promise<Readonly<Record<string, unknown>> | null>;
  removeSaved: (target: StudyTarget, decide: (card: Readonly<{ id: string; addedAt?: unknown }>) => boolean) => Promise<number>;
  removeCustom: (target: StudyTarget, decide: (card: Readonly<{ id: string; addedAt?: unknown }>) => boolean) => Promise<number>;
  produceTombstones: (target: StudyTarget, list: List, ids: readonly string[]) => boolean;
}>;

function defaultPorts(): Ports {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const journal = require('./flashcards/card_deletion_journal') as typeof import('./flashcards/card_deletion_journal');
  const memory = require('./flashcards/swipe_memory_write') as typeof import('./flashcards/swipe_memory_write');
  const flag = require('./accounts_v2_client_flag') as typeof import('./accounts_v2_client_flag');
  return {
    readJournal: journal.readCardDeletionJournal,
    forgetJournal: journal.forgetCardDeletionKeys,
    readMemory: memory.readSwipeMemoryRows,
    removeSaved: async (target, decide) => {
      const store = require('../hooks/use-flashcards') as typeof import('../hooks/use-flashcards');
      return store.removeSavedFlashcardsFromAccountsV2(target, decide);
    },
    removeCustom: async (target, decide) => {
      const store = require('./flashcards/custom_cards_store') as typeof import('./flashcards/custom_cards_store');
      let removed = 0;
      await store.updateCustomCards((current) => {
        const next = current.filter((card) => !decide(card));
        removed = current.length - next.length;
        return removed === 0 ? current : next;
      }, target);
      return removed;
    },
    produceTombstones: (target, list, ids) => {
      const owner = flag.captureAccountsV2OwnerUid();
      if (owner === null) return false;
      flag.produceAccountsV2ChangeIfEnabled(owner, () => ({ kind: 'card_tombstones', target, list, ids: [...ids] }));
      return true;
    },
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
}

class StaleDeletions extends Error {
  constructor() {
    super('hydration_stale');
    this.name = 'StaleHydration';
  }
}

async function removeLocally(
  plan: DeletionPlan, isCurrent: () => boolean, counts: Counts, ports: Ports,
): Promise<void> {
  const byTarget = new Map<StudyTarget, Map<List, Map<string, number | null>>>();
  for (const [key, deletedAtMs] of plan.removals) {
    const match = /^([^:]+):(saved|custom):(.+)$/.exec(key);
    if (match === null || !isStudyTarget(match[1])) continue;
    const target = match[1];
    const lists = byTarget.get(target) ?? new Map<List, Map<string, number | null>>();
    const ids = lists.get(match[2] as List) ?? new Map<string, number | null>();
    ids.set(match[3], deletedAtMs);
    lists.set(match[2] as List, ids);
    byTarget.set(target, lists);
  }
  for (const [target, lists] of byTarget) {
    if (!isCurrent()) throw new StaleDeletions();
    const memory = await ports.readMemory(flashcardsSwipeMemoryKey(target));
    if (memory === null) {
      // зачем: время свайпов неизвестно → правку не сравнить → ничего не убираем (лог).
      console.warn(`${LOG} hydrate card_deletion decision=keep reason=memory_unreadable`);
      counts.cards_removal_memory_unreadable = (counts.cards_removal_memory_unreadable ?? 0) + 1;
      continue;
    }
    for (const [list, ids] of lists) {
      const decide = (card: Readonly<{ id: string; addedAt?: unknown }>): boolean => {
        if (!isCurrent() || !ids.has(card.id)) return false;
        const verdict = deletionBeatsLocalCard(ids.get(card.id) ?? null, localCardEditTimeMs(card, memory[`${TRAINING_PREFIX[list]}${card.id}`]));
        console.log(`${LOG} hydrate card_deletion decision=${verdict.remove ? 'remove' : 'keep'} reason=${verdict.reason} list=${list}`);
        if (!verdict.remove) counts.cards_removal_kept = (counts.cards_removal_kept ?? 0) + 1;
        return verdict.remove;
      };
      if (!isCurrent()) throw new StaleDeletions();
      const removed = list === 'saved' ? await ports.removeSaved(target, decide) : await ports.removeCustom(target, decide);
      if (removed < 0) {
        if (!isCurrent()) throw new StaleDeletions();
        console.warn(`${LOG} hydrate card_deletion remove_failed list=${list}`);
        counts.cards_removal_failed = (counts.cards_removal_failed ?? 0) + 1;
        continue;
      }
      counts.cards_removed = (counts.cards_removed ?? 0) + removed;
    }
  }
}

/**
 * 7D: применить удаления до добавления карточек. Возвращает ключи живых карточек
 * сервера, которые НЕ добавлять. Бросает только «сменился аккаунт».
 */
export async function applyHydratedCardDeletions(
  cards: readonly HydratedCard[], isCurrent: () => boolean, counts: Counts, ports: Ports = defaultPorts(),
): Promise<ReadonlySet<string>> {
  if (!isCurrent()) throw new StaleDeletions();
  const journal = await ports.readJournal();
  if (journal === null) {
    // зачем: журнал нечитаем → как без журнала (прежнее поведение 6G), tombstone V2 работает.
    counts.cards_journal_unreadable = 1;
  }
  const plan = planCardDeletions(cards, journal ?? new Map(), counts);
  if (plan.removals.size > 0) await removeLocally(plan, isCurrent, counts, ports);
  if (!isCurrent()) throw new StaleDeletions();
  for (const group of plan.tombstones.values()) {
    const ids = group.map((item) => item.id);
    const queued = ports.produceTombstones(group[0].target, group[0].list, ids);
    if (!queued) console.warn(`${LOG} hydrate card_deletion tombstone_skip reason=no_owner list=${group[0].list} count=${ids.length}`);
    else counts.cards_tombstones_queued = (counts.cards_tombstones_queued ?? 0) + ids.length;
  }
  if (plan.forget.length > 0) await ports.forgetJournal(plan.forget);
  return plan.blocked;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
