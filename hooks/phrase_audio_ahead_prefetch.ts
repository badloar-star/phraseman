// ════════════════════════════════════════════════════════════════════════════
// phrase_audio_ahead_prefetch.ts — D48: тихая докачка озвучки ТЕКУЩЕГО и
// СЛЕДУЮЩЕГО урока V1, заранее, до входа в урок.
//
// зачем (решение владельца, docs/phraseman-2.0/PROGRESS.md D48): вход в первый
// урок долго звучал роботом expo-speech, пока клипы качались по нажатию.
// hooks/phrase_audio_prefetch.ts уже решает это ПРИ ВХОДЕ в урок — качает
// пачкой фразы этого урока. D48 идёт на шаг раньше: качает тихо в фоне ещё ДО
// того, как человек открыл урок, чтобы к моменту входа диск уже был тёплым.
//
// ПОВТОРИТЬ ЗАПРЕЩЕНО (см. память project_audio_prefetch_killed_app_speed_2026-09-22):
// прогрев озвучки Learning V2 на СТАРТЕ приложения убил скорость (7 сборок
// мусора подряд, 6+ секунд занятого потока) именно потому, что тяжёлый модуль
// был статически импортирован в _layout.tsx и запускался на первом кадре.
// Здесь модуль загружается ДИНАМИЧЕСКИ внутри таймера (см. вызов в _layout.tsx),
// таймер стартует через ~20 с ПОСЛЕ первого кадра, и работа идёт через ту же
// низкоуровневую очередь (withBackgroundNetworkLease + ensurePhraseAudioCached),
// что и остальная озвучка V1 — не создаёт нового способа тормозить старт.
//
// Что докачиваем: клипы ТЕКУЩЕГО и СЛЕДУЮЩЕГО урока (как их видит кнопка
// «Урок» на Главной — тот же сторедж-ключ lastOpenedLessonKey +
// resolveLastAvailableLessonId, что и app/(tabs)/home.tsx). Только студент
// английского — клипы озвучены EN-only (как в lesson1.tsx).
//
// Отличия от hooks/phrase_audio_prefetch.ts (докачка ПРИ входе в урок):
//   • качаем и на Wi-Fi, и на мобильном — лимит «на мобильном только 8 клипов»
//     здесь НЕ действует (владелец явно снял его для этой пачки);
//   • потолок трафика ~6 МБ на ОБЕ пачки вместе (а не 3 МБ на одну);
//   • concurrency ≤2 (а не 3) — это фон ДО намерения открыть урок, скромнее;
//   • НЕ ставит фоновую задачу ОС и не повторяется таймером — один раз за
//     запуск процесса, и всё;
//   • отменяется при уходе приложения в фон и при смене аккаунта.
// ════════════════════════════════════════════════════════════════════════════
import { AppState, type AppStateStatus } from 'react-native';
import { getNetStatus } from '../app/net_status';
import { withBackgroundNetworkLease } from '../app/interactive_network_quiet';
import { getPlayablePhraseAudioUrl } from '../modules/audio/phrase_audio_lookup';
import { ensurePhraseAudioCached, isPhraseAudioCached } from './phrase_audio_player';
import { subscribeAccountGeneration } from '../app/account_generation';
import { peekStudyTargetRaw } from '../app/app_snapshot_bootstrap';
import { DebugLogger } from '../app/debug-logger';

const LOG = '[V1-AUDIO-AHEAD]';

// зачем именно 20 с: владелец прямо потребовал НЕ на старте (инцидент D47/22.09
// про прогрев V2 на старте) — ждём, пока первый кадр давно отрисован и человек
// уже что-то успел сделать. Совпадает с порядком величины у соседних фоновых
// прогревов (achievement_art_prefetch: 3 с; здесь дольше, т.к. это вторая по
// значимости докачка, не первая).
export const AHEAD_PREFETCH_START_DELAY_MS = 20_000;
const CONCURRENCY = 2;
const AVG_CLIP_BYTES = 44 * 1024;
const MAX_TOTAL_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_CLIPS = Math.floor(MAX_TOTAL_BYTES / AVG_CLIP_BYTES);

let started = false;
let generation = 0;
let appStateSub: { remove: () => void } | null = null;
let accountSub: { remove: () => void } | null = null;

type PlannedClip = Readonly<{ text: string; url: string }>;

function planClips(lessonsInOrder: readonly (readonly string[])[]): readonly PlannedClip[] {
  const seen = new Set<string>();
  const items: PlannedClip[] = [];
  for (const texts of lessonsInOrder) {
    for (const text of texts) {
      if (items.length >= MAX_TOTAL_CLIPS) return Object.freeze(items);
      if (typeof text !== 'string' || !text.trim()) continue;
      const url = getPlayablePhraseAudioUrl(text);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      items.push({ text, url });
    }
  }
  return Object.freeze(items);
}

/**
 * Тексты фраз одного урока V1, в порядке прохождения — как их строит
 * app/lesson1.tsx для своей собственной докачки при входе.
 */
async function lessonPhraseTexts(lessonId: number): Promise<readonly string[]> {
  const [{ getLessonData }, { phraseHasStudyTargetContent, phraseAnswerDisplayLine }] =
    await Promise.all([
      import('../app/lesson_data_all'),
      import('../app/phrase_target_utils'),
    ]);
  const rows = getLessonData(lessonId).filter((p) => {
    if (!p || !phraseHasStudyTargetContent(p, 'en')) return false;
    return p.words && p.words.length > 0;
  });
  // зачем uiLang='en' здесь: phraseAnswerDisplayLine использует uiLang только
  // как источник пунктуационной подсказки (см. phrase_target_utils.ts) — сам
  // текст фразы (нормализованный ключ клипа) от него не зависит. Значение —
  // не про интерфейс пользователя, а про безопасный фолбэк форматирования.
  return rows
    .map((p) => phraseAnswerDisplayLine(p, 'en', 'en'))
    .filter((line): line is string => Boolean(line));
}

/** Текущий + следующий урок так же, как их видит кнопка «Урок» на Главной. */
async function resolveCurrentAndNextLessonIds(): Promise<readonly number[] | null> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const [{ lastOpenedLessonKey }, { resolveLastAvailableLessonId }] = await Promise.all([
    import('../app/target_storage_keys'),
    import('../app/lesson_lock_system'),
  ]);
  const raw = await AsyncStorage.getItem(lastOpenedLessonKey('en'));
  const requested = raw ? parseInt(raw, 10) : 1;
  if (!Number.isFinite(requested)) return null;
  const currentId = await resolveLastAvailableLessonId(
    Math.min(32, Math.max(1, requested)),
    'en',
  );
  if (!Number.isFinite(currentId) || currentId < 1 || currentId > 32) return null;
  const nextId = currentId < 32 ? currentId + 1 : null;
  return nextId ? Object.freeze([currentId, nextId]) : Object.freeze([currentId]);
}

// зачем typeof-проверка, а не голый __DEV__: этот модуль — плагин hooks/, а не
// app/*.tsx, и юнит-тесты (не React Native babel-пресет) не определяют
// __DEV__ глобально — бросали бы ReferenceError при каждом вызове trace().
const isDevRuntime = typeof __DEV__ !== 'undefined' && __DEV__;

/** Персистентный след (DebugLogger, переживает перезапуск) + живой console.log в деве. */
function trace(event: string, detail: Readonly<Record<string, unknown>> = {}): void {
  const message = JSON.stringify({ event, ...detail });
  if (isDevRuntime) console.log(LOG, message); // guard-ok: диагностика D48, дублируется DebugLogger ниже
  DebugLogger.info(LOG, message);
}

async function runAheadPrefetchOnce(runGeneration: number): Promise<void> {
  const isCurrent = () => runGeneration === generation;
  // зачем проверка ЗДЕСЬ, а не только внутри: generation фиксируется в момент
  // ПЛАНИРОВАНИЯ (scheduleAheadPhraseAudioPrefetch), а не в момент срабатывания
  // таймера. Если приложение ушло в фон за эти ~20 с, cancelAheadPrefetch уже
  // сдвинул счётчик до того, как этот колбэк вообще начал работать — без этой
  // проверки isCurrent() читал бы generation, обновлённый уже ПОСЛЕ отмены, и
  // всегда видел бы «я актуален» (сравнивал бы значение само с собой).
  if (!isCurrent()) {
    trace('skip', { reason: 'cancelled_before_start' });
    return;
  }

  const studyTarget = peekStudyTargetRaw();
  if (studyTarget !== 'en') {
    trace('skip', { reason: 'study_target_not_english', studyTarget }); // ранний выход обязан называть причину
    return;
  }
  if (getNetStatus() === 'offline') {
    trace('skip', { reason: 'offline' }); // ранний выход обязан называть причину
    return;
  }

  let lessonIds: readonly number[] | null;
  try {
    lessonIds = await resolveCurrentAndNextLessonIds();
  } catch (error: unknown) {
    // Немой catch запрещён: без причины докачка молча не работала бы месяцами.
    DebugLogger.error(
      'phrase_audio_ahead_prefetch:resolve_lessons',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return;
  }
  if (!lessonIds || !isCurrent()) {
    if (!lessonIds) trace('skip', { reason: 'no_current_lesson' }); // ранний выход
    return;
  }

  let lessonsInOrder: readonly (readonly string[])[];
  try {
    lessonsInOrder = await Promise.all(lessonIds.map(lessonPhraseTexts));
  } catch (error: unknown) {
    DebugLogger.error(
      'phrase_audio_ahead_prefetch:load_phrases',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return;
  }
  if (!isCurrent()) return;

  const plan = planClips(lessonsInOrder);
  trace('planned', { lessonIds, planned: plan.length });
  if (plan.length === 0) return;

  let alreadyCached = 0;
  let downloaded = 0;
  let failed = 0;

  try {
    await withBackgroundNetworkLease('phrase-audio.ahead-prefetch', async (lease) => {
      let cursor = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, plan.length) }, async () => {
        for (;;) {
          const index = cursor;
          cursor += 1;
          if (index >= plan.length) return;
          if (!isCurrent() || lease.signal.aborted || getNetStatus() === 'offline') return;
          const item = plan[index]!;
          const wasAlreadyCached = isPhraseAudioCached(item.text, item.url);
          if (wasAlreadyCached) {
            alreadyCached += 1;
            continue;
          }
          try {
            const ok = await ensurePhraseAudioCached(item.text, item.url);
            if (ok) downloaded += 1;
            else failed += 1;
          } catch (error: unknown) {
            // Один упавший клип не должен обрывать пачку — это тихий прогрев,
            // не критичный путь. Причина обязана попасть в лог (запрет немого catch).
            failed += 1;
            trace('clip_failed', {
              reason: error instanceof Error ? error.message : String(error),
            });
          }
        }
      });
      await Promise.all(workers);
    });
  } catch (error: unknown) {
    // Лизинг могли отменить (экран запросил тишину сети) — штатный исход,
    // но причина всё равно называется, чтобы «докачка не работает» не стало
    // немым классом бага, как это уже было с V2-прогревом.
    trace('lease_ended', {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  trace('done', { lessonIds, planned: plan.length, alreadyCached, downloaded, failed });
}

function cancelAheadPrefetch(reason: string): void {
  if (generation === 0) return; // ещё не запускался
  generation += 1;
  trace('cancelled', { reason });
}

/**
 * Запускает тихую докачку через AHEAD_PREFETCH_START_DELAY_MS после первого
 * вызова. Безопасно вызывать многократно — реально стартует один раз за
 * жизнь процесса. Отменяется при уходе приложения в фон и при смене аккаунта.
 */
export function scheduleAheadPhraseAudioPrefetch(): void {
  if (started) return;
  started = true;
  generation = 1;

  try {
    appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') cancelAheadPrefetch(`app_state:${state}`);
    });
  } catch (error: unknown) {
    // Немой catch запрещён: без подписки на AppState отмена при уходе в фон
    // молча перестала бы работать, а докачка выглядела бы «просто иногда
    // тянет лишнее в фоне» — класс бага, который уже стоил кругов работы.
    DebugLogger.error(
      'phrase_audio_ahead_prefetch:app_state_subscribe',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
  }
  try {
    accountSub = subscribeAccountGeneration(() => cancelAheadPrefetch('account_generation_changed'));
  } catch (error: unknown) {
    DebugLogger.error(
      'phrase_audio_ahead_prefetch:account_subscribe',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
  }

  const scheduledGeneration = generation;
  const timer = setTimeout(() => {
    void runAheadPrefetchOnce(scheduledGeneration);
  }, AHEAD_PREFETCH_START_DELAY_MS);
  (timer as unknown as { unref?: () => void })?.unref?.();
}

/** Только для тестов: сбрасывает модульное состояние между прогонами. */
export function __resetAheadPhraseAudioPrefetchForTests(): void {
  started = false;
  generation = 0;
  appStateSub?.remove();
  appStateSub = null;
  accountSub?.remove();
  accountSub = null;
}
