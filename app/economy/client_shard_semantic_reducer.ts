import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AVATAR_AURA_OWNED_KEY,
  CUSTOM_AVATAR_OWNED_KEY,
} from '../../constants/customization_storage_keys';
import { flashcardsOwnedPacksKey, storageStudyTarget } from '../target_storage_keys';
import type { ClientShardGrant, ClientShardLocalWrite } from './client_shard_operation_ledger';
import { coerceEnergyStateV2, createFullEnergyState } from '../energy_state_v2';
import { ENERGY_PERMANENT_CAPACITY_LIMIT } from '../energy_contract';

export const CLIENT_SHARD_SEMANTIC_PAID_PREFIX = 'client_shard_semantic_paid_v1:';

function semanticPaidKey(ownerStableId: string, kind: string, subjectId: string): string {
  return `${CLIENT_SHARD_SEMANTIC_PAID_PREFIX}${encodeURIComponent(ownerStableId)}:${kind}:${subjectId}`;
}

export async function markPortableClientShardGrantPaid(
  ownerStableId: string,
  grant: ClientShardGrant,
): Promise<void> {
  if (!isValidPortableClientShardGrant(grant)) return;
  await AsyncStorage.setItem(semanticPaidKey(ownerStableId, grant.kind, grant.subjectId), '1');
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function jsonObject(raw: string | null): Record<string, unknown> {
  try {
    return objectValue(raw ? JSON.parse(raw) : {});
  } catch (error: unknown) {
    // зачем (8C-2): немой catch запрещён — битый список владения виден в логе (без значений).
    console.warn(`[ECONOMY] reducer owned_object_unparseable kind=${error instanceof Error ? error.name : typeof error}`);
    return {};
  }
}

/**
 * Closed cross-device materializer. It is called only while the account and
 * storage locks are held, so its read/merge/write cannot erase a concurrent
 * local purchase. Cloud data never chooses an AsyncStorage key.
 */
export async function reducePortableClientShardGrant(
  grant: ClientShardGrant,
  createdAtMs: number,
  ownerStableId: string,
): Promise<ClientShardSemanticReduction> {
  const paidKey = semanticPaidKey(ownerStableId, grant.kind, grant.subjectId);
  const alreadyPaid = await AsyncStorage.getItem(paidKey) === '1';
  const reduction = await materializePortableClientShardGrant(
    grant,
    createdAtMs,
    ownerStableId,
    paidKey,
  );
  // зачем: раньше флаг «оплачено» безусловно завершал операцию с пустым writes.
  // Если товар при этом НЕ лежал на диске (список перезаписан гонкой, чистка
  // кэша, откат AsyncStorage), покупка становилась невосстановимой: жемчужины
  // списаны, флаг стоит, а набора нет — отсюда «карточки не покупаются».
  // Теперь флаг не короткое замыкание, а лишь признак «повторно не списывать»:
  // материализацию считаем всегда, а already-satisfied у вызывающего означает
  // «запиши writes, баланс не трогай» (client_shard_operation_ledger.ts) —
  // ровно то, что нужно для до-выдачи уже оплаченного товара.
  if (alreadyPaid && reduction.status === 'materialized') {
    return { status: 'already-satisfied', writes: reduction.writes };
  }
  return reduction;
}

async function materializePortableClientShardGrant(
  grant: ClientShardGrant,
  createdAtMs: number,
  ownerStableId: string,
  paidKey: string,
): Promise<ClientShardSemanticReduction> {
  const payload = objectValue(grant.payload);
  switch (grant.kind) {
    case 'official_card_pack': {
      const target = storageStudyTarget(payload.studyTarget === 'fr' ? 'fr' : 'en');
      const key = flashcardsOwnedPacksKey(target);
      const raw = await AsyncStorage.getItem(key);
      let owned: string[] = [];
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        owned = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
      } catch (error: unknown) {
        // зачем (8C-2): битый список наборов не отменяет оплаченную выдачу, но причина обязана быть видна.
        console.warn(`[ECONOMY] reducer owned_packs_unparseable kind=${error instanceof Error ? error.name : typeof error}`);
        owned = [];
      }
      if (owned.includes(grant.subjectId)) return { status: 'already-satisfied', writes: [[paidKey, '1']] };
      return { status: 'materialized', writes: [
        [key, JSON.stringify([...new Set([...owned, grant.subjectId])])],
        [paidKey, '1'],
      ] };
    }
    case 'custom_avatar':
    case 'avatar_aura': {
      const key = grant.kind === 'custom_avatar' ? CUSTOM_AVATAR_OWNED_KEY : AVATAR_AURA_OWNED_KEY;
      const owned = jsonObject(await AsyncStorage.getItem(key));
      const ownedValue = grant.kind === 'custom_avatar' ? String(payload.ownedValue ?? 'owned') : true;
      if (owned[grant.subjectId] !== undefined) return { status: 'already-satisfied', writes: [[paidKey, '1']] };
      return { status: 'materialized', writes: [
        [key, JSON.stringify({ ...owned, [grant.subjectId]: ownedValue })],
        [paidKey, '1'],
      ] };
    }
    case 'lesson_pearl_unlock': {
      // зачем (владелец 2026-09-17): урок курса, открытый за 100 жемчужин —
      // НАВСЕГДА и ровно один. Список склеивается ЗДЕСЬ, под замком леджера:
      // read-modify-write в вызывающем коде дал бы классический lost update —
      // две покупки подряд затирали бы друг друга, и оплаченный урок исчезал.
      const storageKey = String(payload.storageKey ?? '');
      const lessonId = Math.floor(Number(payload.lessonId) || 0);
      if (!storageKey.startsWith('lessons_pearl_unlocked_v1') || lessonId < 2 || lessonId > 32) {
        return { status: 'unsupported', writes: [] };
      }
      const currentRaw = await AsyncStorage.getItem(storageKey);
      let current: number[] = [];
      try {
        const parsed = currentRaw ? JSON.parse(currentRaw) : [];
        current = Array.isArray(parsed)
          ? parsed.filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 32)
          : [];
      } catch (error: unknown) {
        // Немой catch запрещён (правило владельца): битый список не отменяет
        // оплаченную выдачу — начинаем с пустого и урок всё равно запишем, но
        // причина обязана быть видна, иначе потеря чужих купленных уроков
        // пройдёт молча.
        console.warn(
          '[LESSON-UNLOCK] reducer:purchased_list_unreadable',
          JSON.stringify({ storageKey, lessonId, reason: String(error) }),
        );
        current = [];
      }
      // paidKey обязателен, как во всех portable-кейсах выше: без него флаг
      // «оплачено» не встаёт, право не переносится на другое устройство и
      // защита от повторного списания слабеет. Мой кейс был единственным,
      // который его не писал (найдено аудитом 2026-09-17).
      if (current.includes(lessonId)) {
        return { status: 'already-satisfied', writes: [[paidKey, '1']] };
      }
      const next = Array.from(new Set([...current, lessonId])).sort((a, b) => a - b);
      return {
        status: 'materialized',
        writes: [[storageKey, JSON.stringify(next)], [paidKey, '1']],
      };
    }
    default:
      return { status: 'unsupported', writes: [] };
  }
}

export type ClientShardSemanticReduction = Readonly<{
  status: 'materialized' | 'already-satisfied' | 'unsupported';
  writes: readonly ClientShardLocalWrite[];
}>;

/**
 * Local business precondition + result materializer. The caller guarantees
 * that this runs inside the same owner/storage lock as the eventual debit.
 */
export async function reduceClientShardGrant(
  grant: ClientShardGrant,
  createdAtMs: number,
  requestedWrites: readonly ClientShardLocalWrite[],
  ownerStableId: string,
): Promise<ClientShardSemanticReduction> {
  if (isPortableClientShardGrantKind(grant.kind)) {
    return reducePortableClientShardGrant(grant, createdAtMs, ownerStableId);
  }
  const payload = objectValue(grant.payload);
  switch (grant.kind) {
    case 'custom_avatar_restyle': {
      const owned = jsonObject(await AsyncStorage.getItem(CUSTOM_AVATAR_OWNED_KEY));
      const desired = String(payload.ownedValue ?? '');
      if (desired && owned[grant.subjectId] === desired) return { status: 'already-satisfied', writes: [] };
      if (!desired) return { status: 'unsupported', writes: [] };
      const auxiliary = requestedWrites.filter(([key]) => key !== CUSTOM_AVATAR_OWNED_KEY);
      return {
        status: 'materialized',
        writes: [
          [CUSTOM_AVATAR_OWNED_KEY, JSON.stringify({ ...owned, [grant.subjectId]: desired })],
          ...auxiliary,
        ],
      };
    }
    case 'energy_refill': {
      // зачем (PM-081): покупка, записанная до обновления, несёт желаемый запас
      // 100–260. Потолок теперь 5, и без среза «5 >= 100» никогда не выполнилось
      // бы — повтор операции списал бы жемчуг второй раз за уже полный бак.
      const desired = Math.min(
        ENERGY_PERMANENT_CAPACITY_LIMIT,
        Math.max(0, Math.floor(Number(payload.current) || 0)),
      );
      const raw = await AsyncStorage.getItem('energy_state');
      const current = jsonObject(raw);
      const currentV2 = coerceEnergyStateV2(current, createdAtMs);
      if (currentV2.current >= desired) return { status: 'already-satisfied', writes: [] };
      return {
        status: 'materialized',
        writes: [['energy_state', JSON.stringify(createFullEnergyState(createdAtMs, desired))]],
      };
    }
    case 'streak_freeze': {
      const current = jsonObject(await AsyncStorage.getItem('streak_freeze'));
      if (current.active === true) return { status: 'already-satisfied', writes: [] };
      return {
        status: 'materialized',
        writes: [['streak_freeze', JSON.stringify({ active: true, date: grant.subjectId })]],
      };
    }
    case 'streak_revive': {
      const current = jsonObject(await AsyncStorage.getItem('streak_revive_v1'));
      if (String(current.lostAt ?? '') !== grant.subjectId) return { status: 'unsupported', writes: [] };
      if (current.used === true) return { status: 'already-satisfied', writes: [] };
      const restoredStreak = Math.max(0, Math.floor(Number(payload.restoredStreak) || 0));
      const lastActiveDate = String(payload.lastActiveDate ?? '');
      if (!restoredStreak || !/^\d{4}-\d{2}-\d{2}$/.test(lastActiveDate)) {
        return { status: 'unsupported', writes: [] };
      }
      return {
        status: 'materialized',
        writes: [
          ['streak_count', String(restoredStreak)],
          ['last_active_date', lastActiveDate],
          ['streak_revive_v1', JSON.stringify({ ...current, used: true })],
        ],
      };
    }
    case 'quota_day_pass': {
      // зачем (2026-09-13): дневной пропуск = +N попыток сверх лимита обычного
      // аккаунта в ОДНОМ окне (subjectId = `${kind}:${period}`). Один платёж на
      // окно: повтор с тем же subjectId — already-satisfied, второй раз не списываем.
      const storageKey = String(payload.storageKey ?? '');
      const extra = Math.max(0, Math.floor(Number(payload.extra) || 0));
      if (!storageKey.startsWith('revenue_quota_pass:v1:') || extra <= 0) return { status: 'unsupported', writes: [] };
      const current = jsonObject(await AsyncStorage.getItem(storageKey));
      if (Math.floor(Number(current.extra) || 0) >= extra) return { status: 'already-satisfied', writes: [] };
      return {
        status: 'materialized',
        writes: [[storageKey, JSON.stringify({ extra, subjectId: grant.subjectId, grantedAtMs: createdAtMs })]],
      };
    }
    default:
      return { status: 'unsupported', writes: [] };
  }
}

/** Only durable, monotonic entitlements participate in another device's balance projection. */
export function isPortableClientShardGrantKind(kind: string): boolean {
  return new Set([
    'official_card_pack',
    'custom_avatar',
    'avatar_aura',
    // Купленный урок — долговечное монотонное право: оно обязано доехать на
    // другое устройство, иначе человек заплатил, переустановил и потерял урок.
    'lesson_pearl_unlock',
  ]).has(kind);
}

/** Full per-kind boundary: a recognized name with malformed payload is not portable. */
export function isValidPortableClientShardGrant(grant: ClientShardGrant): boolean {
  if (!isPortableClientShardGrantKind(grant.kind)) return false;
  if (!/^[A-Za-z0-9_.:-]{1,160}$/.test(grant.subjectId)) return false;
  const payload = objectValue(grant.payload);
  switch (grant.kind) {
    case 'official_card_pack':
      return payload.studyTarget === 'en' || payload.studyTarget === 'fr';
    case 'custom_avatar':
      return typeof payload.ownedValue === 'string' && payload.ownedValue.length > 0 && payload.ownedValue.length <= 160;
    case 'avatar_aura':
      return true;
    case 'lesson_pearl_unlock': {
      // subjectId = `<target>:<lessonId>` и обязан совпадать с payload —
      // расхождение означает подделанный/битый чек, такой не переносим.
      const match = /^(en|fr):(\d{1,2})$/.exec(grant.subjectId);
      if (!match) return false;
      const lessonId = Number(match[2]);
      return lessonId >= 2 && lessonId <= 32
        && Number(payload.lessonId) === lessonId
        && payload.studyTarget === match[1];
    }
    default:
      return false;
  }
}
