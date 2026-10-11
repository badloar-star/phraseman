/**
 * Слияние «по каждому полю — больше» при восстановлении из облака (пп.9–11 решения координатора 11.10).
 *
 * зачем: статистика (user_stats_v1), время в приложении (общее и по дням) и daily_stats только растут,
 * но в ветке «облако главнее» облако писало их целиком — накопленное между синком и восстановлением пропадало.
 * Правило: числа — максимум; объекты — по каждому ключу рекурсивно (для daily_stats это «максимум внутри
 * каждой даты»); ключ есть только с одной стороны — берём его; разные типы — облако.
 * Тратимые значения (заморозки, бонус входа) сюда НЕ подключать — у них максимум означал бы подарок.
 * Битое облако → локальное; битое локальное → облако, как было.
 */
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function parse(raw: string | null | undefined): { ok: true; value: Json } | { ok: false } {
  if (raw === null || raw === undefined || raw === '') return { ok: false };
  try {
    return { ok: true, value: JSON.parse(raw) as Json };
  } catch {
    // зачем: битое значение не роняет восстановление — сторону выбирает вызывающий.
    return { ok: false };
  }
}

const isPlainObject = (value: Json): value is { [key: string]: Json } =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function maxDeep(local: Json, cloud: Json): Json {
  if (typeof local === 'number' && typeof cloud === 'number') {
    return Number.isFinite(local) && local > cloud ? local : cloud;
  }
  if (isPlainObject(local) && isPlainObject(cloud)) {
    const merged: { [key: string]: Json } = { ...cloud };
    for (const [key, localValue] of Object.entries(local)) {
      merged[key] = key in cloud ? maxDeep(localValue, cloud[key]) : localValue;
    }
    return merged;
  }
  return cloud;
}

export function mergeNumericMaxRestoreValue(localRaw: string | null | undefined, cloudRaw: string): string {
  const cloud = parse(cloudRaw);
  const local = parse(localRaw);
  if (!cloud.ok) return localRaw ?? cloudRaw;
  if (!local.ok) return cloudRaw;
  const merged = maxDeep(local.value, cloud.value);
  return merged === cloud.value ? cloudRaw : JSON.stringify(merged);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
