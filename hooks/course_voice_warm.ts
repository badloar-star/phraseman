// ════════════════════════════════════════════════════════════════════════════
// course_voice_warm.ts — точечная подкачка записей озвучки заранее.
//
// зачем (владелец 11.11.2026, про Пик и фразу дня: «а загрузка этих фраз как будет происходить?»; раньше про курс:
// «чтобы юзеры не ждали загрузку, а она воспроизводилась сразу… но при этом не в бандле»): запись фразы дня и
// записи заданий Пика «на слух» лежат на сервере. Если качать их в момент нажатия, первое проигрывание идёт с
// задержкой, а при медленной сети фраза звучит голосом телефона. Здесь они скачиваются на диск заранее: фраза дня —
// когда карточка показана, задания Пика — когда ступень подготовлена, до первого задания.
//
// Почему не hooks/phrase_audio_prefetch.ts: там очередь одна на приложение и новая пачка ОТМЕНЯЕТ прошлую (экран
// урока сменился — прошлые файлы не нужны). Подкачка одной фразы дня с Главной убивала бы пачку урока.
// Здесь своя маленькая очередь по одному файлу, ничего не отменяет.
//
// Сети нет, записи нет, файл не скачался — не поломка: фраза прозвучит обычным путём (скачивание по нажатию
// или голос телефона). Причина пропуска пишется в журнал.
// ════════════════════════════════════════════════════════════════════════════
import { getNetStatus } from '../app/net_status';
import { courseVoiceLangFromLocale } from '../modules/audio/course_voice_key';
import { getPlayablePhraseAudioUrl } from '../modules/audio/phrase_audio_lookup';
import { ensurePhraseAudioCached } from './phrase_audio_player';

const TAG = '[COURSE-VOICE-WARM]';
/** Потолок на один вызов: ступень Пика — до десятка заданий, запас на будущее; ≈13 КБ на запись. */
const MAX_PER_CALL = 24;

const queued = new Set<string>();
let chain: Promise<void> = Promise.resolve();

/**
 * Поставить записи фраз на скачивание. Возвращает, сколько файлов поставлено в очередь.
 * `locale` — язык речи или язык обучения ('de-DE', 'de'); язык без записей → 0.
 */
export function warmCourseVoice(source: string, texts: readonly unknown[], locale: string | null | undefined): number {
  // зачем (проверка перед сборками 11.11): подкачка зовётся внутри подготовки ступени Пика — её сбой не имеет права
  // закрыть вход на ступень или уронить карточку фразы дня; причина — в журнал, фраза прозвучит обычным путём
  try {
    return planWarm(source, texts, locale);
  } catch (error: unknown) {
    console.warn(`${TAG} подкачка не запущена`, JSON.stringify({ source, error: error instanceof Error ? error.message : String(error) })); // guard-ok: причина, по которой запись не подкачана заранее
    return 0;
  }
}

function planWarm(source: string, texts: readonly unknown[], locale: string | null | undefined): number {
  const lang = courseVoiceLangFromLocale(locale);
  if (lang === null) return 0;
  if (getNetStatus() === 'offline') {
    console.warn(`${TAG} пропуск: нет сети`, JSON.stringify({ source, lang, texts: texts.length })); // guard-ok: причина, по которой запись не подкачана заранее
    return 0;
  }
  let planned = 0;
  for (const raw of texts) {
    if (planned >= MAX_PER_CALL) break;
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text) continue;
    const url = getPlayablePhraseAudioUrl(text, lang);
    if (!url || queued.has(url)) continue;
    queued.add(url);
    planned += 1;
    chain = chain.then(async () => {
      try {
        const ok = await ensurePhraseAudioCached(text, url);
        // зачем: неудачу не запоминаем как «уже качали» — следующий показ попробует снова
        if (!ok) { queued.delete(url); console.warn(`${TAG} запись не скачалась`, JSON.stringify({ source, lang, chars: text.length })); } // guard-ok: причина тишины записи
      } catch (error: unknown) {
        queued.delete(url);
        console.warn(`${TAG} скачивание упало`, JSON.stringify({ source, lang, chars: text.length, error: error instanceof Error ? error.message : String(error) })); // guard-ok: причина тишины записи
      }
    });
  }
  return planned;
}

/** Пауза перед подкачкой с Главной: первый кадр и его запросы идут раньше одной фоновой записи. */
const SOON_DELAY_MS = 1500;

/**
 * То же, но чуть позже — для экранов первого кадра (карточка фразы дня на Главной).
 * зачем отдельная функция: в самой карточке таймеры запрещены её сторожем (движение карточки — только одноразовые
 * анимации), поэтому отсрочка живёт здесь. Отменять её незачем: одна запись ≈15 КБ пригодится и после ухода с экрана.
 */
export function warmCourseVoiceSoon(source: string, texts: readonly unknown[], locale: string | null | undefined): void {
  setTimeout(() => { warmCourseVoice(source, texts, locale); }, SOON_DELAY_MS);
}

/** Только для тестов: сброс очереди. */
export async function __resetCourseVoiceWarmForTests(): Promise<void> {
  await chain;
  queued.clear();
  chain = Promise.resolve();
}
