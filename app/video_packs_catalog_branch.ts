// зачем (владелец, журнал п.85(2)): на экране «Из видео» три РАЗНЫХ исхода были склеены в один скелет → «Сейчас недоступно»:
// «загрузка идёт», «настоящая ошибка сети» и «наборов из видео просто нет». Пустой ответ сети (он кэшируется как пустой) считался «ожиданием»
// и гонял до трёх принудительных чтений Firestore, после чего писал «Сейчас недоступно». Теперь ветка выбирается явно, одной чистой функцией:
//   loading — скелет, пока реально идёт ПЕРВАЯ загрузка без кэша (или тихие повторы после сбоя, максимум ~12 с);
//   error   — «Сейчас недоступно» только когда загрузка/повторы исчерпаны при настоящем сбое, не при пустом ответе;
//   empty   — «Пока пусто»: ответ получен (из памяти/диска/сети), наборов из видео ноль (или ноль на выбранном языке);
//   not_found — «Ничего не нашли»: ответ на поиск человека; list — есть что показать.
// Чистый модуль без react-native: ветка и причина для лога [VIDEO-EMPTY] проверяются в node.

export type VideoCatalogLoadStateLite = 'loading' | 'ready' | 'error';

export type VideoCatalogBranch = 'list' | 'empty' | 'loading' | 'error' | 'not_found';

export type VideoCatalogBranchInput = Readonly<{
  loadState: VideoCatalogLoadStateLite;
  /** Наборов из видео в каталоге до фильтров поиска и языка. */
  packsCount: number;
  /** Наборов после поиска, сортировки и языка. */
  visibleCount: number;
  searching: boolean;
  /** Тихие повторы/потолок загрузки исчерпаны. */
  exhausted: boolean;
}>;

export type VideoCatalogBranchResult = Readonly<{
  branch: VideoCatalogBranch;
  /** Значение, которое решило ветку, — для журнала [VIDEO-EMPTY] (не голое true/false). */
  reason:
    | 'rows_visible'
    | 'search_no_match'
    | 'first_load_no_cache'
    | 'load_failed_retrying'
    | 'load_failed_exhausted'
    | 'ceiling_exhausted'
    | 'answer_zero_packs'
    | 'answer_zero_for_language';
}>;

export function videoCatalogBranch(input: VideoCatalogBranchInput): VideoCatalogBranchResult {
  const { loadState, packsCount, visibleCount, searching, exhausted } = input;
  if (searching && visibleCount === 0) return { branch: 'not_found', reason: 'search_no_match' };
  if (visibleCount > 0) return { branch: 'list', reason: 'rows_visible' };
  // дальше: строк нет и человек не ищет
  if (loadState === 'ready') {
    return { branch: 'empty', reason: packsCount > 0 ? 'answer_zero_for_language' : 'answer_zero_packs' };
  }
  if (loadState === 'error') {
    return exhausted
      ? { branch: 'error', reason: 'load_failed_exhausted' }
      : { branch: 'loading', reason: 'load_failed_retrying' };
  }
  return exhausted
    ? { branch: 'error', reason: 'ceiling_exhausted' }
    : { branch: 'loading', reason: 'first_load_no_cache' };
}

/** Нужны ли тихие повторы: только пока ждём загрузку или после сбоя; пустой ответ повторов НЕ запускает (ноль лишних чтений Firestore). */
export function videoCatalogWaiting(loadState: VideoCatalogLoadStateLite, packsCount: number, searching: boolean): boolean {
  return !searching && packsCount === 0 && (loadState === 'loading' || loadState === 'error');
}

/**
 * Первый кадр: память модуля уже знает ответ (даже пустой) — решение известно сразу, сети не ждём. null — ответа ещё не было → загрузка.
 */
export function initialVideoCatalogLoadState(peeked: readonly unknown[] | null): Readonly<{ loadState: VideoCatalogLoadStateLite; source: 'memory_cache' | 'none' }> {
  return peeked === null ? { loadState: 'loading', source: 'none' } : { loadState: 'ready', source: 'memory_cache' };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
