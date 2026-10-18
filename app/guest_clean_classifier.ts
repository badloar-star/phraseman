/**
 * Классификатор ключей гостя для проверки «чистый ли гость» перед входом в существующий аккаунт.
 *
 * зачем (координатор 15.10, «переустановил → окно смены аккаунта»): свежий гость после онбординга
 * считался «с прогрессом» из-за значений по умолчанию (аватар 1, рамка plain, серия 1, дата
 * установки…), и каждый переустановивший видел лишнее окно смены аккаунта. Каждый «грязный» ключ размечается
 * default | service | progress; гость «чист», если нет ни одного progress (решение в local_account_data.ts).
 *
 * Правило безопасности: при СОМНЕНИИ — progress. Лишнее окно лучше молча потерянного прогресса.
 */

import {
  CUSTOMIZATION_SELECTION_HEAD_PREFIX,
  CUSTOMIZATION_SELECTION_OPERATION_PREFIX,
  CUSTOMIZATION_SELECTION_OUTBOX_PREFIX,
  CUSTOMIZATION_SELECTION_QUARANTINE_PREFIX,
} from '../constants/customization_storage_keys';

export type GuestCleanKind = 'default' | 'service' | 'progress';

/** Значения, которые свежая установка пишет сама, без действий человека. */
const DEFAULT_VALUES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['streak_count', new Set(['1'])],
  ['unlocked_lessons', new Set(['[1]'])],
  ['legacy_free_lesson_cap_v1', new Set(['3'])],
]);

/**
 * Ответы онбординга и внешний вид, выбранные гостем (ник, аватар, рамка, уровень, цель, язык): не прогресс.
 * зачем (координатор 15.10): человек входит в СВОЙ существующий аккаунт — профиль аккаунта главнее, гостевой ник не жалко.
 * Вход в НОВЫЙ аккаунт этой проверкой не решается — там данные гостя переезжают как раньше.
 */
// Аура — тоже выбор гостя (координатор 15.10, R15c); владение аурой (avatar_aura_owned_v1 …) остаётся прогрессом.
const GUEST_CHOICE_KEYS: ReadonlySet<string> = new Set(['user_profile', 'user_avatar', 'user_frame', 'user_avatar_aura']);

/** Служебные следы установки: не прогресс человека, при входе их не жалко. */
const SERVICE_KEYS: ReadonlySet<string> = new Set([
  'install_date',
  'energy_state',
  'phraseman_foreground_usage_ms_v1',
  'phraseman_foreground_daily_ms_v1',
  'stable_auth_link_cache_v1',
  'cloud_migration_v1',
  'legacy_free_lesson_migration_v1',
  // зачем (прогон Сверки r15_1015): снимок последнего синка — копия уже отправленных значений (аватар, рамка, серия);
  // настоящий прогресс проверяется по своим ключам, сам снимок ничего не несёт.
  'cloud_last_sync_snapshot_v1',
  // зачем (R15d, прогон Сверки ff21fefa4): метка «createdAt уже записан в облако» ('1') — служебная. Инвентаризация 15.10:
  // ключей хранилища с префиксом cloud_ ровно три — cloud_migration_v1, cloud_last_sync_snapshot_v1 и этот.
  'cloud_created_at_synced_v1',
  'friends_push_v1',
]);

/** Дни активности { anchor, bits }: не больше одного дня (сегодня) — след установки, не прогресс. */
function isSingleActiveDay(value: string): boolean {
  const parsed = parseJson(value, 'active_days_v1') as { bits?: unknown } | undefined;
  return typeof parsed?.bits === 'string' && parsed.bits.split('').filter((bit) => bit === '1').length <= 1;
}

/** Основа достижений v2 у свежей установки: баланс 0, без оплат и возвращения, не больше одного дня. */
function isEmptyFoundationProgress(value: string): boolean {
  const parsed = parseJson(value, 'achievement_foundation_progress_v2') as {
    maxEligibleShardBalance?: unknown; activeDates?: unknown; comeback?: unknown; paidAccess?: { plus?: unknown; pro?: unknown };
  } | undefined;
  return parsed?.maxEligibleShardBalance === 0
    && Array.isArray(parsed.activeDates) && parsed.activeDates.length <= 1
    && parsed.comeback === null
    && parsed.paidAccess?.plus === false && parsed.paidAccess?.pro === false;
}

/**
 * Форма значения БЕЗ самих значений — для журнала [GUEST-CLEAN]: тип, имена полей, длины массивов,
 * у чисел только знак (num0 / num+ / num-). Имена полей, похожие на идентификаторы, маскируются.
 * зачем: по одному прогону отличить «значение по умолчанию» от прогресса (например, очередь
 * монет с одной стартовой выдачей от очереди с заработанными), не печатая данные человека.
 */
export function describeGuestValueShape(raw: string | null): string {
  const value = (raw ?? '').trim();
  if (!value) return 'empty';
  try {
    return shapeOf(JSON.parse(value), 2);
  } catch (error) {
    // Не JSON — обычная строка: её форма — длина; причину отказа разбора пишем в саму форму.
    return `str${value.length}(${error instanceof SyntaxError ? 'not_json' : 'parse_error'})`;
  }
}

// Поле-идентификатор (uid, uuid, почта) маскируется; обычные длинные имена полей (maxEligibleShardBalance) — нет.
function maskFieldName(name: string): string {
  if (name.includes('@') || /[0-9a-f]{8}-[0-9a-f]{4}-/i.test(name) || (name.length >= 16 && /[0-9]/.test(name))) return '<id>';
  return name.slice(0, 24);
}

function shapeOf(node: unknown, depth: number): string {
  if (node === null) return 'null';
  if (Array.isArray(node)) {
    if (depth <= 0 || node.length === 0) return `arr${node.length}`;
    return `arr${node.length}[${shapeOf(node[0], depth - 1)}]`;
  }
  if (typeof node === 'object') {
    if (depth <= 0) return 'obj';
    const fields = Object.entries(node as Record<string, unknown>).slice(0, 12)
      .map(([name, child]) => `${maskFieldName(name)}:${shapeOf(child, depth - 1)}`);
    return `{${fields.join(',')}}`;
  }
  if (typeof node === 'number') return node === 0 ? 'num0' : node > 0 ? 'num+' : 'num-';
  if (typeof node === 'boolean') return node ? 'true' : 'false';
  return `str${String(node).length}`;
}

/**
 * Разбор значения ключа. Битая запись не доказывает «по умолчанию»: вызывающий ответит progress (окно смены останется).
 * зачем (Ревизор 15.10, правило «немых catch»): причина отказа разбора — в журнал; key — имя без идентификаторов.
 */
function parseJson(value: string, key: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`[GUEST-CLEAN] parse_failed key=${key} reason=${error instanceof Error ? error.name : typeof error} len=${value.length}`); // guard-ok: причина отказа разбора
    return undefined;
  }
}

/** Список достижений после базовой инициализации: ни одно не получено (unlockedAt пуст у всех). */
function isUnearnedAchievementList(value: string): boolean {
  const parsed = parseJson(value, 'achievements_v1');
  return Array.isArray(parsed) && parsed.every((item) => item !== null && typeof item === 'object'
    && (item as { unlockedAt?: unknown }).unlockedAt === null);
}

/** Счётчики поведения (app/user_stats.ts) без уроков, ответов и покупок — только посещения/нажатия. */
function isVisitsOnlyUserStats(value: string): boolean {
  const parsed = parseJson(value, 'user_stats_v1') as {
    lessonsStarted?: unknown; lessonsAbandoned?: unknown; answersTotal?: unknown; answersCorrect?: unknown;
    shardPackPurchases?: unknown; cardPackPurchases?: unknown;
  } | undefined;
  if (!parsed || typeof parsed !== 'object') return false;
  const zero = (n: unknown): boolean => n === undefined || n === 0;
  const empty = (m: unknown): boolean => m === undefined
    || (m !== null && typeof m === 'object' && !Array.isArray(m) && Object.keys(m).length === 0);
  return zero(parsed.lessonsStarted) && zero(parsed.lessonsAbandoned) && zero(parsed.answersTotal) && zero(parsed.answersCorrect)
    && empty(parsed.shardPackPurchases) && empty(parsed.cardPackPurchases);
}

/** Очередь операций монет телефона без единой операции. */
function isEmptyShardOutbox(value: string): boolean {
  const parsed = parseJson(value, 'client_shard_phone_state_outbox_v1') as { operationIds?: unknown; acknowledgedOperationIds?: unknown } | undefined;
  return Array.isArray(parsed?.operationIds) && parsed.operationIds.length === 0
    && Array.isArray(parsed?.acknowledgedOperationIds) && parsed.acknowledgedOperationIds.length === 0;
}

/**
 * Проекция звёзд спина — ТОЧНАЯ пустая заготовка: без операций, квитанций и сжатых трат, нулевой баланс на сервере,
 * нулевой номер и никаких монет «только на телефоне».
 * зачем (ревью Opus 15.10, BLOCK): видимый баланс = serverBalance + unconfirmedLocalLift + overlay; запись с
 * unconfirmedLocalLift > 0 при нулевом сервере — монеты, которых нет в облаке; при входе они стёрлись бы без копии.
 */
function isEmptySpinProjection(value: string): boolean {
  const parsed = parseJson(value, 'level_spin_star_projection_v1') as {
    operations?: unknown; acknowledged?: unknown; serverBalance?: unknown; serverEarnedTotal?: unknown;
    serverSeq?: unknown; unconfirmedLocalLift?: unknown; compactedSpendTotal?: unknown;
  } | undefined;
  const acknowledged = parsed?.acknowledged;
  return Array.isArray(parsed?.operations) && parsed.operations.length === 0
    && acknowledged !== null && typeof acknowledged === 'object' && !Array.isArray(acknowledged) && Object.keys(acknowledged).length === 0
    && parsed?.serverBalance === 0 && parsed?.serverEarnedTotal === 0 && parsed?.serverSeq === 0
    && (parsed?.unconfirmedLocalLift === undefined || parsed?.unconfirmedLocalLift === 0)
    && parsed?.compactedSpendTotal === undefined;
}

const LEARNING_V2_INDEX_MARKER_KEY_PREFIX = 'v2:required-session-local-commit-index:v1:';
const LEARNING_V2_INDEX_MARKER_VALUE_PREFIX = 'learning-v2-required-session-spool-index-legacy-scan-complete.v1:';
/** Равен LEARNING_V2_COMPLETION_RETRY_CURSOR_PREFIX (app/learning_v2_completion_retry_cursor.ts); строкой — чтобы не тянуть тяжёлый модуль, равенство сторожит тест. */
export const LEARNING_V2_COMPLETION_RETRY_CURSOR_KEY_PREFIX = 'v2:required-session-completion-scheduler:v1:';

/**
 * Маркер миграции: имя на `_migration` / `_migration_vN` и короткое скалярное значение (флаг или версия, не данные).
 * зачем (координатор 15.10, R15c): белый список по ФОРМЕ ключа — маркеры миграции появляются по языкам и версиям, точными
 * именами их не догнать. Объект/массив или длинное значение — уже не флаг: прогресс.
 */
const MIGRATION_FLAG_VALUE = /^(1|true|done|migrated|v\d+|\d{10,13})$/i;

/** Журнал ВЫБОРА оформления — ровно 4 семейства (constants/customization_storage_keys.ts), без широкого префикса. */
const CUSTOMIZATION_SELECTION_JOURNAL_PREFIXES: readonly string[] = [
  CUSTOMIZATION_SELECTION_HEAD_PREFIX,
  CUSTOMIZATION_SELECTION_OPERATION_PREFIX,
  CUSTOMIZATION_SELECTION_OUTBOX_PREFIX,
  CUSTOMIZATION_SELECTION_QUARANTINE_PREFIX,
];

function isMigrationMarker(key: string, value: string): boolean {
  // зачем (R15d, ревью Opus/Ревизор): значение — только флаг или версия (наблюдаемые: '1', 'migrated'); число вроде '1500'
  // под имя маркера больше не пройдёт как служебное.
  return /_migration(_v\d+)?$/.test(key) && MIGRATION_FLAG_VALUE.test(value);
}

export function classifyGuestCleanKey(key: string, raw: string | null): GuestCleanKind {
  const value = (raw ?? '').trim();
  const defaults = DEFAULT_VALUES.get(key);
  if (defaults) return defaults.has(value) ? 'default' : 'progress';
  if (GUEST_CHOICE_KEYS.has(key)) return 'default';
  if (SERVICE_KEYS.has(key)) return 'service';
  // зачем (координатор 18.10): метки «последнее место» Главной (homeContinueMarkKey) вошли в опись аккаунта ради стирания и
  // копии; до этого «чистый гость» их не видел вовсе — служебный след навигации, вход ведёт себя как раньше.
  if (/(?:^|::)last_opened_lesson__continue_(?:v2|at|dialog|cards|map)$/.test(key)) return 'service';
  // Лимит бесплатных уроков по языку: lesson_progress_v2::<язык>::legacy_free_lesson_cap_v1 = 3 у свежей установки.
  if (key.startsWith('lesson_progress_v2::') && key.endsWith('::legacy_free_lesson_cap_v1')) return value === '3' ? 'default' : 'progress';
  // Маркер миграции бесплатных уроков по языку — тот же служебный след, что legacy_free_lesson_migration_v1 без префикса.
  if (key.startsWith('lesson_progress_v2::') && key.endsWith('::legacy_free_lesson_migration_v1')) return 'service';
  if (isMigrationMarker(key, value)) return 'service';
  // Снимки последнего синка (любой версии) — копия уже отправленных значений, прогресс проверяется по своим ключам.
  if (key.startsWith('cloud_last_sync_')) return 'service';
  // Отметка «X уже синхронизирован с облаком» (форма cloud_<что>_synced_vN) — служебная, только со значением-флагом '1'.
  if (/^cloud_[a-z_]+_synced_v\d+$/.test(key) && value === '1') return 'service';
  // зачем (R15d, Ревизор 15.10, R21 9a2f3e03f): журнал показанных сторис (story_events_v1:<stableId>) — служебный след показа.
  if (key.startsWith('story_events_v1:')) return 'service';
  // Журнал ВЫБОРА оформления (голова, операции, очередь отправки, карантин) — только выбор аватара/рамки/ауры:
  // по слову координатора выбор гостя — не прогресс (проверка Сверки r15b_1015: очередь отправки с одной операцией выбора).
  // Владение покупками — отдельные ключи (custom_avatar_owned_v1, avatar_aura_owned_v1 …) — остаётся прогрессом.
  // зачем (R15d, Ревизор): точные 4 семейства, а не префикс — будущий ключ с тем же началом (покупка) не станет «выбором».
  if (CUSTOMIZATION_SELECTION_JOURNAL_PREFIXES.some((prefix) => key.startsWith(prefix))) return 'default';
  if (key === 'active_days_v1') return isSingleActiveDay(value) ? 'default' : 'progress';
  if (key === 'achievement_foundation_progress_v2') return isEmptyFoundationProgress(value) ? 'default' : 'progress';
  // зачем (прогон Сверки guest_clean_relapse_1516, 15:38): у свежего гостя эти четыре ключа — пустые заготовки, а не прогресс.
  if (key === 'achievements_v1') return isUnearnedAchievementList(value) ? 'default' : 'progress';
  // зачем (эмулятор 18.10 10:39, сценарий №1): у свежего гостя achievements_state — та же пустая заготовка (все unlockedAt:null),
  // а «открыт первый урок» без прохождения — метка навигации, как unlocked_lessons=[1]. Иное значение — прогресс.
  if (key === 'achievements_state') return isUnearnedAchievementList(value) ? 'default' : 'progress';
  if (key === 'last_opened_lesson') return value === '1' ? 'default' : 'progress';
  // зачем (эмулятор 18.10 11:10, сценарий №9): счётчики поведения гостя только с посещениями разделов — аналитика, не учёба.
  if (key === 'user_stats_v1') return isVisitsOnlyUserStats(value) ? 'default' : 'progress';
  if (key.startsWith('client_shard_phone_state_outbox_v1:')) return isEmptyShardOutbox(value) ? 'default' : 'progress';
  if (key.startsWith('level_spin_star_projection_v1:')) return isEmptySpinProjection(value) ? 'default' : 'progress';
  if (key.startsWith(LEARNING_V2_INDEX_MARKER_KEY_PREFIX) && value.startsWith(LEARNING_V2_INDEX_MARKER_VALUE_PREFIX)) return 'service';
  // зачем (эмулятор 18.10 10:34, сценарий №1): планировщик завершений Learning V2 на старте пишет курсор повтора
  // ('attempt_reserved', 0 ошибок) даже у свежего гостя — проверка под замком видела «прогресс» и показывала
  // «телефон уже связан». Курсор — только расписание попыток; сами завершения живут в spool-ключах (они — прогресс).
  if (key.startsWith(LEARNING_V2_COMPLETION_RETRY_CURSOR_KEY_PREFIX)) return 'service';
  return 'progress';
}
