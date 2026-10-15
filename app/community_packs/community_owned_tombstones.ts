// ═══════════════════════════════════════════════════════════════════════════
// community_owned_tombstones.ts — надгробия «убрано из моих» для наборов сообщества (легаси-синк).
//
// зачем (R47, координатор 15.10, Ревизор: accounts_v2_client_enabled = false, в релизе работает легаси-синк, а он склеивает
// community_owned_pack_ids_v1 ОБЪЕДИНЕНИЕМ — убранный набор возвращался при входе, переустановке и на втором устройстве).
// Значение по id: n = время*2, +1 если «убрано». Слияние при восстановлении — максимум по id (OWNED_UNION_RESTORE_BASE_KEYS):
// позднее событие побеждает, повторное добавление после удаления (чётное, позже) снимает скрытие.
// Надгробие только ПРЯЧЕТ id из списка «моих»; права на купленный набор (flashcards_owned_packs_v1) не трогает — повторное добавление платного без оплаты.
// Журнал: [MY-PACKS] tombstone.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flashcardsCommunityOwnedTombstonesKey } from '../target_storage_keys';
import type { RuntimeStudyTarget } from '../target_storage_keys';

export type OwnedTombstones = Readonly<Record<string, number>>;

export function parseOwnedTombstones(raw: string | null): OwnedTombstones {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) out[id] = Math.floor(value);
    }
    return out;
  } catch (error: unknown) {
    console.warn(`[MY-PACKS] tombstone parse FAILED reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя разбора
    return {};
  }
}

export function isTombstoneRemoved(value: number | undefined): boolean {
  return value !== undefined && value % 2 === 1;
}

/** Убирает из списка id, у которых победившее событие — «убрано». */
export function hideRemovedOwnedIds(ids: readonly string[], tombstones: OwnedTombstones): string[] {
  return ids.filter((id) => !isTombstoneRemoved(tombstones[id]));
}

export async function loadOwnedTombstones(studyTarget?: RuntimeStudyTarget): Promise<OwnedTombstones> {
  try {
    return parseOwnedTombstones(await AsyncStorage.getItem(flashcardsCommunityOwnedTombstonesKey(studyTarget)));
  } catch (error: unknown) {
    console.warn(`[MY-PACKS] tombstone read FAILED reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина сбоя чтения
    return {};
  }
}

/** Новое значение для id: строго позже существующего, чётность — по событию (убрано/добавлено). */
export function nextTombstoneValue(existing: number | undefined, removed: boolean, nowMs: number): number {
  const lastMs = existing === undefined ? 0 : Math.floor(existing / 2);
  const ms = Math.max(nowMs, existing === undefined ? 0 : lastMs + 1);
  return ms * 2 + (removed ? 1 : 0);
}

/** Пишет событие (убрано/добавлено) для id; возвращает записанное значение. */
export async function stampOwnedTombstone(id: string, removed: boolean, studyTarget?: RuntimeStudyTarget): Promise<number> {
  const current = await loadOwnedTombstones(studyTarget);
  const value = nextTombstoneValue(current[id], removed, Date.now());
  await AsyncStorage.setItem(flashcardsCommunityOwnedTombstonesKey(studyTarget), JSON.stringify({ ...current, [id]: value }));
  console.log(`[MY-PACKS] tombstone stamp pack=${id} removed=${removed} value=${value} before=${String(current[id])}`); // guard-ok: запись события
  return value;
}
