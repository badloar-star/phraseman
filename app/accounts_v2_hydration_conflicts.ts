import type {
  HydratedCard,
  HydrationSnapshot,
  LocalMirrorOverride,
} from '../modules/account-session-v2/account_v2_hydration';
import { canonicalJson, normalizeCardFieldsForSync } from '../modules/account-session-v2/account_sync_producer_plan';
import { ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS } from './accounts_v2_hydration_deletions';
import { isStudyTarget, type StudyTarget } from './study_target';

/*
 * Account V2, Пакет 8E (TG-473FE4DBA2C3) — старая локальная копия не перезаписывает
 * правку с другого устройства.
 *
 * зачем: гидрация засевала зеркало серверной версией карточки, а применение было
 * add-only (существующую на телефоне карточку не трогало). Если на телефоне лежала
 * СТАРАЯ версия, первый снимок приложения видел разницу «локально ≠ зеркало» и слал
 * старый текст как правку со свежей базой — сервер принимал, правка другого устройства
 * терялась. Теперь для карточек, уже лежащих на телефоне, решаем «чья версия свежее»
 * ДО любых записей приложения:
 *   сервер свежее (≥ запаса по часам) → серверные поля применяются локально (зеркало
 *     и так серверное — снимок пуст);
 *   локальная свежее (≥ запаса)       → у человека ничего не меняем, зеркало остаётся
 *     серверным — первый снимок отправит локальную правку (она и есть последняя);
 *   неизвестно / в пределах запаса     → у человека ничего не меняем и ничего не шлём:
 *     зеркало засевается локальной копией. Ничего не теряется: локальная версия у
 *     человека, серверная — на сервере; следующая правка любой стороны уйдёт обычным путём.
 * Время правки (часы устройств): max(updatedAt (7E), addedAt) — только содержимое
 * карточки. SRS (свайпы) сюда не входит: у SRS своё правило по updatedAtMs, и свайп —
 * не правка текста. Запас по часам — тот же, что для удалений (7E): часы разных устройств.
 * Сравнение версий — в нормализации 8B (производные поля приложения не конфликт).
 * Только карточки, чьё зеркало засеяла ЭТА гидрация (производитель не вёл их раньше).
 * Логи [ACCOUNT-V2] hydrate card_conflict — решение и причина, без id и текста.
 */

const LOG = '[ACCOUNT-V2]';
const SRS_FIELDS = new Set(['srs', 'srsPolicy']);

type Counts = Record<string, number>;
type List = 'saved' | 'custom';
export type ConflictDecision = 'same' | 'apply_server' | 'send_local' | 'keep_local';
export type ConflictVerdict = Readonly<{ decision: ConflictDecision; reason: string }>;

function time(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function contentTime(fields: Readonly<Record<string, unknown>>): number | null {
  const known = [time(fields.updatedAt), time(fields.addedAt)].filter((value): value is number => value !== null);
  return known.length === 0 ? null : Math.max(...known);
}

/** Поля карточки для сравнения версий: без SRS, в нормализации 8B. */
export function comparableCardFields(target: string, list: List, card: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(card)) {
    if (!SRS_FIELDS.has(name) && value !== undefined) fields[name] = value;
  }
  return normalizeCardFieldsForSync(target, list, fields);
}

/** Чья версия свежее (чистая функция). */
export function decideCardConflict(
  target: string, list: List, server: Readonly<Record<string, unknown>>, local: Readonly<Record<string, unknown>>,
): ConflictVerdict {
  const serverFields = comparableCardFields(target, list, server);
  const localFields = comparableCardFields(target, list, local);
  if (canonicalJson(serverFields) === canonicalJson(localFields)) return { decision: 'same', reason: 'equal' };
  const serverTime = contentTime(serverFields);
  const localTime = contentTime(localFields);
  if (serverTime === null || localTime === null) return { decision: 'keep_local', reason: 'time_unknown' };
  if (serverTime - localTime >= ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS) return { decision: 'apply_server', reason: 'server_newer' };
  if (localTime - serverTime >= ACCOUNTS_V2_DELETION_CLOCK_MARGIN_MS) return { decision: 'send_local', reason: 'local_newer' };
  return { decision: 'keep_local', reason: 'within_clock_margin' };
}

type LocalCard = Readonly<Record<string, unknown> & { id: string }>;

export type ConflictPorts = Readonly<{
  readLocal: (target: StudyTarget, list: List) => Promise<readonly LocalCard[] | null>;
  replaceLocal: (target: StudyTarget, list: List, replace: (card: LocalCard) => Record<string, unknown> | null) => Promise<number>;
}>;

function defaultPorts(): ConflictPorts {
  /* eslint-disable @typescript-eslint/no-require-imports */
  return {
    readLocal: async (target, list) => {
      if (list === 'saved') {
        const store = require('../hooks/use-flashcards') as typeof import('../hooks/use-flashcards');
        return (await store.loadFlashcards(target)) as unknown as LocalCard[];
      }
      const store = require('./flashcards/custom_cards_store') as typeof import('./flashcards/custom_cards_store');
      return (await store.listCustomCards(target)) as unknown as LocalCard[];
    },
    replaceLocal: async (target, list, replace) => {
      if (list === 'saved') {
        const store = require('../hooks/use-flashcards') as typeof import('../hooks/use-flashcards');
        return store.replaceSavedFlashcardsFromAccountsV2(target, (card) => replace(card as unknown as LocalCard) as never);
      }
      const store = require('./flashcards/custom_cards_store') as typeof import('./flashcards/custom_cards_store');
      let replaced = 0;
      await store.updateCustomCards((current) => {
        let changed = false;
        const next = current.map((card) => {
          const replacement = replace(card as unknown as LocalCard);
          if (replacement === null) return card;
          changed = true;
          replaced += 1;
          return replacement as unknown as typeof card;
        });
        return changed ? next : current;
      }, target);
      return replaced;
    },
  };
  /* eslint-enable @typescript-eslint/no-require-imports */
}

class StaleConflicts extends Error {
  constructor() {
    super('hydration_stale');
    this.name = 'StaleHydration';
  }
}

type Pending = Readonly<{ server: HydratedCard; judged: string }>;

/**
 * 8E: решить конфликты версий для карточек, уже лежащих на телефоне. Вызывается ПЕРВЫМ
 * шагом применения (до любых записей, которые запускают снимки производителя).
 * Бросает только «сменился аккаунт».
 */
export async function applyHydratedCardConflicts(
  snapshot: HydrationSnapshot, isCurrent: () => boolean, counts: Counts, ports: ConflictPorts = defaultPorts(),
): Promise<void> {
  const access = snapshot.mirror;
  if (access === undefined || access.seeded.size === 0) return;
  const groups = new Map<string, HydratedCard[]>();
  for (const card of snapshot.cards) {
    const key = `${card.target}:${card.list}`;
    if (card.deleted || !isStudyTarget(card.target) || !access.seeded.has(`${key}:${card.id}`)) continue;
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  const overrides: LocalMirrorOverride[] = [];
  const toApply = new Map<string, Map<string, Pending>>();
  for (const [key, cards] of groups) {
    if (!isCurrent()) throw new StaleConflicts();
    const target = cards[0].target as StudyTarget;
    const list = cards[0].list;
    const local = await ports.readLocal(target, list); // guard-ok: локальное хранилище, не Firestore
    if (local === null) {
      console.warn(`${LOG} hydrate card_conflict skip reason=local_unreadable list=${list}`);
      continue;
    }
    const byId = new Map(local.map((card) => [card.id, card]));
    for (const server of cards) {
      const mine = byId.get(server.id);
      if (mine === undefined) continue;
      const verdict = decideCardConflict(target, list, server.fields, mine);
      if (verdict.decision === 'same') continue;
      console.log(`${LOG} hydrate card_conflict decision=${verdict.decision} reason=${verdict.reason} list=${list}`);
      counts[`cards_conflict_${verdict.decision}`] = (counts[`cards_conflict_${verdict.decision}`] ?? 0) + 1;
      if (verdict.decision === 'keep_local') {
        overrides.push({ entityId: `${key}:${server.id}`, fields: comparableCardFields(target, list, mine) });
      } else if (verdict.decision === 'apply_server') {
        const pending = toApply.get(key) ?? new Map<string, Pending>();
        pending.set(server.id, { server, judged: canonicalJson(comparableCardFields(target, list, mine)) });
        toApply.set(key, pending);
      }
    }
  }
  // зачем: зеркало из локальной копии — до любых записей приложения (иначе их снимок успел бы
  // отправить старое как правку).
  if (overrides.length > 0) {
    if (!isCurrent()) throw new StaleConflicts();
    await access.seedFromLocal(overrides);
  }
  for (const [key, pending] of toApply) {
    if (!isCurrent()) throw new StaleConflicts();
    const [target, list] = key.split(':') as [StudyTarget, List];
    const replaced = await ports.replaceLocal(target, list, (card) => {
      const item = pending.get(card.id);
      if (item === undefined || !isCurrent()) return null;
      // зачем: человек успел изменить карточку после решения — его правка новее, не трогаем.
      if (canonicalJson(comparableCardFields(target, list, card)) !== item.judged) {
        console.warn(`${LOG} hydrate card_conflict apply_skip reason=local_changed_since_decision list=${list}`);
        return null;
      }
      const fields = { ...item.server.fields };
      if (typeof fields.id !== 'string') fields.id = card.id;
      return fields;
    });
    if (replaced < 0) {
      if (!isCurrent()) throw new StaleConflicts();
      console.warn(`${LOG} hydrate card_conflict apply_failed list=${list}`);
      counts.cards_conflict_apply_failed = (counts.cards_conflict_apply_failed ?? 0) + 1;
      continue;
    }
    counts.cards_conflict_applied = (counts.cards_conflict_applied ?? 0) + replaced;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
