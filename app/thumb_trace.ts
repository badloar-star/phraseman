// ════════════════════════════════════════════════════════════════════════════
// thumb_trace.ts — журнал [THUMB]: почему превью роликов бывают пустыми.
//
// зачем (координатор 12.10, правило «сперва логи, потом починка»): на кадрах Сверки пустые серые плитки на двух разных поверхностях
// (cards-028 «Все ролики» и лента «Видео» на Главной). Общая точка — загрузка миниатюры с i.ytimg.com. Этот модуль добавляет к каждому
// `expo-image` обработчики и пишет в журнал: поверхность, id ролика, адрес, откуда пришла картинка (кэш памяти / диск / сеть), время загрузки,
// при ошибке — текст ошибки и КОД ответа сервера (одноразовая проверка адреса HEAD-запросом, раз за запуск на адрес).
// Саму загрузку не меняет. Чинить — только по фактам из этого журнала. Журнал смотреть: .expo/metro-console.log, строка `[THUMB]`.
// ════════════════════════════════════════════════════════════════════════════
import type { ImageErrorEventData, ImageLoadEventData } from 'expo-image';

const TAG = '[THUMB]';
/** Потолок проверки адреса при ошибке: медленная сеть не должна копить висящие запросы. */
const PROBE_TIMEOUT_MS = 6000;

export type ThumbSurface = 'home_video_rail' | 'video_pack_card' | 'video_pack_plain';

const startedAt = new Map<string, number>();
const reported = new Set<string>();
const probed = new Set<string>();

/** Публичный адрес картинки без параметров запроса: в журнал идут хост и путь, не больше. */
function safeUrl(url: string | null | undefined): string {
  if (!url) return '(пусто)';
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch (error) {
    return `(не разобрать: ${error instanceof Error ? error.name : typeof error})`;
  }
}

function once(kind: string, key: string): boolean {
  const full = `${kind}|${key}`;
  if (reported.has(full)) return false;
  reported.add(full);
  return true;
}

/** Адрес пуст ещё до загрузки: плитка будет пустой, и это не сеть. */
export function traceThumbMissing(surface: ThumbSurface, id: string, reason: string): null {
  // зачем null, а не void: вызывается прямо в разметке (`{url ? <Image/> : traceThumbMissing(...)}`), где void не принимается как ребёнок.
  if (once('missing', `${surface}|${id}`)) {
    console.warn(`${TAG} ${surface} id=${id} url=(пусто) причина=${reason} — превью не запрашивается`); // guard-ok: ранний выход называет причину
  }
  return null;
}

async function probeStatus(surface: ThumbSurface, id: string, url: string): Promise<void> {
  if (probed.has(url)) return;
  probed.add(url);
  const started = Date.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS) : null;
  try {
    const response = await fetch(url, { method: 'HEAD', signal: controller?.signal });
    console.log(`${TAG} probe ${surface} id=${id} url=${safeUrl(url)} http=${response.status} type=${response.headers.get('content-type') ?? '-'} ${Date.now() - started}мс`); // guard-ok: итог проверки
  } catch (error) {
    console.warn(`${TAG} probe ${surface} id=${id} url=${safeUrl(url)} сети_нет=${error instanceof Error ? `${error.name}: ${error.message}` : String(error)} ${Date.now() - started}мс`); // guard-ok: catch называет причину
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Обработчики для `<Image>` (expo-image): onLoadStart / onLoad / onError. Разворачивать в пропсы: `{...thumbTrace('home_video_rail', video.id, video.thumbnailUrl)}`.
 * Каждое событие по каждому адресу пишется один раз за запуск — журнал не засоряется перерисовками списка.
 */
export function thumbTrace(surface: ThumbSurface, id: string, url: string | null | undefined): {
  onLoadStart: () => void;
  onLoad: (event: ImageLoadEventData) => void;
  onError: (event: ImageErrorEventData) => void;
} {
  const key = `${surface}|${id}|${url ?? ''}`;
  return {
    onLoadStart: () => {
      if (!once('start', key)) return;
      startedAt.set(key, Date.now());
      console.log(`${TAG} start ${surface} id=${id} url=${safeUrl(url)}`); // guard-ok: вход загрузки
    },
    onLoad: (event) => {
      if (!once('load', key)) return;
      const ms = startedAt.has(key) ? Date.now() - (startedAt.get(key) as number) : -1;
      console.log(`${TAG} load ${surface} id=${id} url=${safeUrl(url)} источник=${event.cacheType === 'none' ? 'сеть' : event.cacheType === 'memory' ? 'кэш-память' : 'кэш-диск'} ${event.source.width}x${event.source.height} ${event.source.mediaType ?? '-'} ${ms}мс`); // guard-ok: итог загрузки
    },
    onError: (event) => {
      if (!once('error', key)) return;
      const ms = startedAt.has(key) ? Date.now() - (startedAt.get(key) as number) : -1;
      console.warn(`${TAG} error ${surface} id=${id} url=${safeUrl(url)} ошибка=${String(event?.error ?? '').slice(0, 240)} ${ms}мс`); // guard-ok: onError называет причину
      if (url) void probeStatus(surface, id, url);
    },
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
