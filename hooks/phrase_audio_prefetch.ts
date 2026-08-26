// ════════════════════════════════════════════════════════════════════════════
// phrase_audio_prefetch.ts — фоновая докачка озвучки ПАЧКОЙ для экрана.
//
// зачем: раньше клип фразы качался в момент нажатия — с таймаутом 4.5 с, и если
// не успел, фраза звучала роботом expo-speech. Слышно это именно на ПЕРВЫХ
// фразах урока, то есть в самый заметный момент. Владелец попросил качать
// пачками: зашёл в урок 1 — все его фразы подтянулись фоном, первые сразу.
//
// Что это НЕ делает: не экономит деньги. Firebase Storage берёт за отданные
// гигабайты, а не за число запросов, поэтому пачка стоит столько же, сколько те
// же файлы поштучно (и чуть дороже — качается и то, что человек не дослушал).
// Выигрыш здесь в отклике, а не в счёте.
//
// Правила, ради которых модуль отдельный:
//   • очередь одна на приложение — уход с экрана отменяет прошлую пачку, две
//     пачки одновременно не воюют за сеть;
//   • первые CRITICAL_HEAD клипов качаются вперёд остальных: пока человек
//     читает задание, начало урока уже на диске;
//   • на мобильном интернете качается только голова пачки — уважаем лимитный
//     тариф, остальное подтянется по ходу обычным путём;
//   • сеть уступается интерфейсу через withBackgroundNetworkLease: фоновая
//     докачка не должна тормозить живые запросы экрана;
//   • ошибки глотаются молча — это предзагрузка, её отсутствие не поломка:
//     обычный путь скачает клип по нажатию.
// ════════════════════════════════════════════════════════════════════════════
import { getNetStatus } from '../app/net_status';
import { withBackgroundNetworkLease } from '../app/interactive_network_quiet';
import { getPlayablePhraseAudioUrl } from '../modules/audio/phrase_audio_lookup';
import { ensurePhraseAudioCached } from './phrase_audio_player';

// Сколько клипов гарантированно тянем первыми. Пять — примерно столько человек
// успевает пройти, пока читает условие задания.
const CRITICAL_HEAD = 5;
// На мобильном ограничиваемся головой: 50 клипов урока ≈ 2.1 МБ, и молча
// потратить это на чужом лимитном тарифе — неуважительно.
const CELLULAR_LIMIT = 8;
// Одновременных загрузок. Столько же, сколько в предзагрузке Learning V2:
// больше — заметно отбирает канал у интерактивных запросов.
const CONCURRENCY = 3;
// Потолок на пачку: страховка от «раздел на тысячу фраз» — словарь, например,
// это 992 слова. Качаем начало (человек идёт по порядку), остальное подтянется
// обычным путём по нажатию.
const MAX_BATCH = 120;
// Потолок по трафику. Одного счётчика файлов мало: клипы разные — слово ~8 КБ,
// длинная фраза квиза до 129 КБ, и 120 тяжёлых клипов дали бы ~15 МБ фоном без
// ведома человека. Оцениваем по среднему размеру корпуса (44 КБ) и режем пачку
// по объёму раньше, чем по счётчику.
const AVG_CLIP_BYTES = 44 * 1024;
const MAX_BATCH_BYTES = 3 * 1024 * 1024;
const MAX_BATCH_BY_BYTES = Math.floor(MAX_BATCH_BYTES / AVG_CLIP_BYTES);

export type PhraseAudioPrefetchHandle = Readonly<{
  cancel: () => void;
  /** Сколько клипов реально поставлено в очередь. */
  planned: number;
  /** Сколько фраз раздела НЕ попало в пачку из-за потолка. Никакого молчаливого
   *  усечения: вызывающий код видит, что предзагружен не весь раздел. */
  truncated: number;
}>;

type NetInfoLike = Readonly<{
  fetch: () => Promise<Readonly<{
    type?: string | null;
    isConnectionExpensive?: boolean | null;
  }>>;
}>;

let activeGeneration = 0;

function loadNetInfo(load: () => unknown = () => require('@react-native-community/netinfo')): NetInfoLike | null {
  try {
    const mod = load() as Readonly<{ default?: NetInfoLike; fetch?: NetInfoLike['fetch'] }>;
    if (mod?.default?.fetch) return mod.default;
    if (typeof mod?.fetch === 'function') return mod as NetInfoLike;
  } catch {
    // NetInfo недоступен (тесты, web) — трактуем как «сеть не дорогая».
  }
  return null;
}

/**
 * Дорогое ли соединение. Неизвестно — считаем НЕ дорогим: иначе на любом
 * устройстве без NetInfo предзагрузка молча выключится и смысл пропадёт.
 */
async function isExpensiveConnection(netInfo: NetInfoLike | null): Promise<boolean> {
  if (!netInfo) return false;
  try {
    const state = await netInfo.fetch();
    if (state?.isConnectionExpensive === true) return true;
    return state?.type === 'cellular';
  } catch {
    return false;
  }
}

export type PhraseAudioPrefetchPlan = Readonly<{
  items: readonly { text: string; url: string }[];
  /** Сколько фраз отброшено потолком пачки. >0 — часть раздела не предзагружена. */
  truncated: number;
}>;

/** Убираем дубли и то, для чего в карте нет клипа — качать нечего. */
function planUrls(texts: readonly string[]): PhraseAudioPrefetchPlan {
  const cap = Math.min(MAX_BATCH, MAX_BATCH_BY_BYTES);
  const seen = new Set<string>();
  const items: { text: string; url: string }[] = [];
  let considered = 0;

  for (const text of texts) {
    if (typeof text !== 'string' || !text.trim()) continue;
    const url = getPlayablePhraseAudioUrl(text);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    considered += 1;
    if (items.length < cap) items.push({ text, url });
  }

  return Object.freeze({ items, truncated: Math.max(0, considered - items.length) });
}

/**
 * Скачать фоном озвучку для списка фраз экрана.
 *
 * Порядок списка ЗНАЧИМ: первые элементы качаются раньше, поэтому передавайте
 * фразы в том порядке, в каком человек их встретит.
 *
 * Вызов не ждут: функция возвращает handle с cancel() — дёрните его при уходе
 * с экрана, иначе пачка продолжит занимать сеть уже ненужными файлами.
 */
export function prefetchPhraseAudio(
  texts: readonly string[],
  options: Readonly<{ netInfo?: NetInfoLike | null }> = {},
): PhraseAudioPrefetchHandle {
  // План строим ДО смены поколения. Иначе пустой вызов (экран отрисовался
  // раньше, чем пришли фразы) молча обрывал бы уже идущую полезную пачку —
  // качать нечего, а прошлую очередь мы при этом убили.
  const plan = planUrls(texts);
  if (plan.items.length === 0 || getNetStatus() === 'offline') {
    return Object.freeze({ cancel: () => {}, planned: 0, truncated: plan.truncated });
  }

  // Новая пачка обесценивает прошлую: экран сменился — прошлые файлы не нужны.
  activeGeneration += 1;
  const generation = activeGeneration;
  const isCurrent = () => generation === activeGeneration;

  void (async () => {
    const netInfo = options.netInfo !== undefined ? options.netInfo : loadNetInfo();
    const expensive = await isExpensiveConnection(netInfo);
    if (!isCurrent()) return;

    const queue = expensive ? plan.items.slice(0, CELLULAR_LIMIT) : plan.items;

    // Голова — последовательно и вне лизинга: это то, что человек услышит
    // первым, ей нельзя ждать в общей фоновой очереди.
    const head = queue.slice(0, CRITICAL_HEAD);
    for (const item of head) {
      if (!isCurrent() || getNetStatus() === 'offline') return;
      // Падение одного клипа не должно останавливать пачку и тем более всплывать
      // наружу: это предзагрузка, её отсутствие не поломка — обычный путь
      // скачает клип по нажатию.
      await ensurePhraseAudioCached(item.text, item.url).catch(() => false);
    }

    const tail = queue.slice(CRITICAL_HEAD);
    if (tail.length === 0 || !isCurrent()) return;

    // Хвост — уже настоящий фон: уступает дорогу интерактивным запросам.
    try {
      await withBackgroundNetworkLease('phrase-audio.prefetch', async (lease) => {
        let cursor = 0;
        const workers = Array.from({ length: Math.min(CONCURRENCY, tail.length) }, async () => {
          while (cursor < tail.length) {
            const item = tail[cursor];
            cursor += 1;
            if (!isCurrent() || lease.signal.aborted || getNetStatus() === 'offline') return;
            // Как и в голове: упавший клип не должен уносить с собой воркер,
            // иначе один сетевой сбой обрывает остаток очереди.
            await ensurePhraseAudioCached(item.text, item.url).catch(() => false);
          }
        });
        await Promise.all(workers);
      });
    } catch {
      // Лизинг отменён (экран запросил тишину сети) — это штатный исход.
    }
  })();

  return Object.freeze({
    cancel: () => {
      if (generation === activeGeneration) activeGeneration += 1;
    },
    planned: plan.items.length,
    truncated: plan.truncated,
  });
}

/** Отменить текущую пачку, ничего не начиная новой. */
export function cancelPhraseAudioPrefetch(): void {
  activeGeneration += 1;
}
