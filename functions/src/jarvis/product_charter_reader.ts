/**
 * Чтение устава продукта для Джарвиса: база — источник, файл — запасной.
 *
 * зачем такой порядок (решение владельца, 2026-08-16): устав правится в
 * админке, значит база всегда свежее файла. Но если база недоступна или устав
 * ещё не заполнен, Джарвис обязан работать — просто по файлу product.md.
 * Молчание вместо знания вернуло бы ровно ту проблему, ради которой всё это
 * затевалось: ответы, собранные из кусков исходного кода.
 *
 * зачем кэш на процесс: устав читают ВСЕ департаменты одного прогона. Без
 * кэша это восемь одинаковых чтений Firestore за утро вместо одного.
 * Экземпляр функции живёт минуты, а устав меняется раз в месяц — риск отдать
 * слегка устаревший текст ничтожен рядом с восьмикратной платой.
 */
import { PRODUCT_CHARTER_DOC, parseProductCharter, renderProductCharter } from './product_charter';

/** Сколько живёт кэш. Меньше, чем интервал правок, но больше одного прогона. */
export const PRODUCT_CHARTER_CACHE_MS = 10 * 60 * 1_000;

interface CacheEntry {
  readonly text: string;
  readonly expiresAtMs: number;
}

let cache: CacheEntry | null = null;

/** Сбрасывает кэш. Только для тестов. */
export function __resetProductCharterCacheForTests(): void {
  cache = null;
}

export interface ProductCharterSource {
  /** Читает документ устава. Возвращает null, если его нет или база недоступна. */
  readCharterDoc: () => Promise<unknown>;
  /** Запасной текст из файла знания. */
  readFallback: () => string;
  nowMs: number;
}

/**
 * Отдаёт текст устава для промпта.
 *
 * зачем не бросать наверх: сбой чтения устава не должен ронять утренний
 * прогон Джарвиса целиком. Хуже знать меньше, чем не отработать вовсе.
 */
export async function loadProductCharterText(source: ProductCharterSource): Promise<string> {
  if (cache && cache.expiresAtMs > source.nowMs) return cache.text;

  let text = '';
  try {
    const charter = parseProductCharter(await source.readCharterDoc());
    text = renderProductCharter(charter);
  } catch {
    text = '';
  }
  if (!text) text = source.readFallback();

  // зачем кэшировать и пустой результат: если устав не заполнен, повторять
  // чтение на каждый департамент бессмысленно — ответ тот же.
  cache = { text, expiresAtMs: source.nowMs + PRODUCT_CHARTER_CACHE_MS };
  return text;
}

export { PRODUCT_CHARTER_DOC };
