/**
 * Классификатор ключей гостя для проверки «чистый ли гость» перед входом в существующий аккаунт.
 *
 * зачем (координатор 15.10, «переустановил → окно смены аккаунта»): свежий гость после онбординга
 * считался «с прогрессом» из-за значений по умолчанию (аватар 1, рамка plain, серия 1, дата
 * установки…), и каждый переустановивший видел лишнее окно смены аккаунта. Шаг 1 — только журнал:
 * каждый «грязный» ключ размечается default | service | progress, вход по-прежнему решает старое
 * правило. Шаг 2 (по фактам журнала, после ревью) — решение по этой разметке.
 *
 * Правило безопасности: при СОМНЕНИИ — progress. Лишнее окно лучше молча потерянного прогресса.
 */

export type GuestCleanKind = 'default' | 'service' | 'progress';

/** Значения, которые свежая установка пишет сама, без действий человека. */
const DEFAULT_VALUES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['user_avatar', new Set(['1'])],
  ['user_frame', new Set(['plain'])],
  ['streak_count', new Set(['1'])],
  ['unlocked_lessons', new Set(['[1]'])],
  ['legacy_free_lesson_cap_v1', new Set(['3'])],
]);

/** Служебные следы установки: не прогресс человека, при входе их не жалко. */
const SERVICE_KEYS: ReadonlySet<string> = new Set([
  'install_date',
  'energy_state',
  'phraseman_foreground_usage_ms_v1',
  'phraseman_foreground_daily_ms_v1',
  'stable_auth_link_cache_v1',
  'cloud_migration_v1',
  'legacy_free_lesson_migration_v1',
  'friends_push_v1',
]);

/** Дни активности { anchor, bits }: не больше одного дня (сегодня) — след установки, не прогресс. */
function isSingleActiveDay(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as { bits?: unknown };
    return typeof parsed?.bits === 'string' && parsed.bits.split('').filter((bit) => bit === '1').length <= 1;
  } catch {
    // Битая запись не доказывает «по умолчанию»: при сомнении — прогресс (окно смены аккаунта останется).
    return false;
  }
}

/** Основа достижений v2 у свежей установки: баланс 0, без оплат и возвращения, не больше одного дня. */
function isEmptyFoundationProgress(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as {
      maxEligibleShardBalance?: unknown; activeDates?: unknown; comeback?: unknown; paidAccess?: { plus?: unknown; pro?: unknown };
    };
    return parsed?.maxEligibleShardBalance === 0
      && Array.isArray(parsed.activeDates) && parsed.activeDates.length <= 1
      && parsed.comeback === null
      && parsed.paidAccess?.plus === false && parsed.paidAccess?.pro === false;
  } catch {
    // Битая запись не доказывает «по умолчанию»: при сомнении — прогресс (окно смены аккаунта останется).
    return false;
  }
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

export function classifyGuestCleanKey(key: string, raw: string | null): GuestCleanKind {
  const value = (raw ?? '').trim();
  const defaults = DEFAULT_VALUES.get(key);
  if (defaults) return defaults.has(value) ? 'default' : 'progress';
  if (SERVICE_KEYS.has(key)) return 'service';
  // Лимит бесплатных уроков по языку: lesson_progress_v2::<язык>::legacy_free_lesson_cap_v1 = 3 у свежей установки.
  if (key.startsWith('lesson_progress_v2::') && key.endsWith('::legacy_free_lesson_cap_v1')) return value === '3' ? 'default' : 'progress';
  if (key === 'active_days_v1') return isSingleActiveDay(value) ? 'default' : 'progress';
  if (key === 'achievement_foundation_progress_v2') return isEmptyFoundationProgress(value) ? 'default' : 'progress';
  return 'progress';
}
