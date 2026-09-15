import { callExplainPhrase } from './explain_phrase_client';
import { isAiExplainConsentGranted } from './ai_explain_consent';
import { getNetStatus } from './net_status';
import type { MistakePracticeSessionEntry } from '../modules/mistake-practice/session';

/**
 * Предгенерация объяснений для сессии ошибок.
 *
 * зачем (владелец 2026-09-14): «все сгенерированные тексты должны быть готовы
 * ВСЕГДА до того, как юзер откроет раздел, чтобы он не ждал». Разбор КОНКРЕТНОГО
 * промаха предгенерировать нельзя — он ключуется ответом ученика, которого ещё
 * нет. Зато объяснение самой фразы (`explainPhrase`) от ответа не зависит и
 * кэшируется на сервере глобально: прогреваем его для всей очереди сессии, пока
 * человек отвечает на первое задание. Промахнулся — текст уже на устройстве.
 *
 * Экономия: строго последовательно, с паузой, не больше PREWARM_LIMIT фраз за
 * сессию; кэш-хит стоит $0, поэтому вторая сессия по тем же фразам бесплатна.
 * Всё фоном: ни один экран этого не ждёт.
 */

/** Сколько фраз греем за одну сессию: дальше человек обычно не доходит за раз. */
export const MISTAKE_PREWARM_LIMIT = 8;
/** Пауза между прогревами — чтобы не занимать сеть на первом кадре задания. */
const PREWARM_GAP_MS = 900;
/** Не греем, пока человек ещё смотрит первое задание меньше этого времени. */
const PREWARM_START_DELAY_MS = 1200;

type PrewarmDeps = Readonly<{
  explain?: typeof callExplainPhrase;
  isOnline?: () => boolean;
  hasConsent?: () => boolean;
  sleep?: (ms: number) => Promise<void>;
}>;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

/** Уникальные фразы очереди в порядке показа — по одной на mistakeId. */
export function mistakePrewarmTargets(
  queue: readonly MistakePracticeSessionEntry[],
  limit = MISTAKE_PREWARM_LIMIT,
): readonly Readonly<{ phrase: string; meaning: string }>[] {
  const seen = new Set<string>();
  const out: Array<Readonly<{ phrase: string; meaning: string }>> = [];
  for (const entry of queue) {
    const phrase = entry.exercise.correctAnswer.trim();
    if (!phrase || seen.has(phrase)) continue;
    seen.add(phrase);
    out.push(Object.freeze({ phrase, meaning: entry.exercise.prompt.trim() }));
    if (out.length >= limit) break;
  }
  return Object.freeze(out);
}

const prewarmedSessions = new Set<string>();

/**
 * Прогрев очереди. Возвращает, сколько фраз реально ушло в прогрев (0 — офлайн,
 * нет согласия на ИИ, уже грели эту сессию или греть нечего).
 */
export async function prewarmMistakeSessionExplanations(input: Readonly<{
  sessionId: string;
  queue: readonly MistakePracticeSessionEntry[];
  studyTarget: string;
  interfaceLang: string;
}>, deps: PrewarmDeps = {}): Promise<number> {
  const isOnline = deps.isOnline ?? (() => getNetStatus() === 'online');
  const hasConsent = deps.hasConsent ?? isAiExplainConsentGranted;
  const explain = deps.explain ?? callExplainPhrase;
  const sleep = deps.sleep ?? defaultSleep;

  if (prewarmedSessions.has(input.sessionId)) {
    console.log('[MISTAKES-PREWARM] skip already-warmed', JSON.stringify({ sessionId: input.sessionId.slice(-12) }));
    return 0;
  }
  if (!hasConsent()) {
    console.log('[MISTAKES-PREWARM] skip consent-not-granted');
    return 0;
  }
  if (!isOnline()) {
    console.log('[MISTAKES-PREWARM] skip offline');
    return 0;
  }
  const targets = mistakePrewarmTargets(input.queue);
  if (targets.length === 0) {
    console.log('[MISTAKES-PREWARM] skip empty-queue');
    return 0;
  }
  prewarmedSessions.add(input.sessionId);

  await sleep(PREWARM_START_DELAY_MS);
  let warmed = 0;
  const startedAt = Date.now();
  for (const target of targets) {
    try {
      await explain({
        phraseEn: target.phrase,
        phraseMeaning: target.meaning,
        lang: input.interfaceLang,
        studyTarget: input.studyTarget,
      });
      warmed += 1;
    } catch (error: unknown) {
      // зачем: прогрев — необязательная роскошь, но молчать нельзя: без лога
      // «объяснения всегда грузятся дольше» выглядело бы как норма.
      console.warn('[MISTAKES-PREWARM] phrase:catch', JSON.stringify({
        message: error instanceof Error ? error.message : String(error),
      }));
    }
    if (!isOnline()) {
      console.log('[MISTAKES-PREWARM] stop went-offline', JSON.stringify({ warmed }));
      break;
    }
    await sleep(PREWARM_GAP_MS);
  }
  console.log('[MISTAKES-PREWARM] done', JSON.stringify({ warmed, of: targets.length, ms: Date.now() - startedAt }));
  return warmed;
}

/** Только для тестов: забыть, какие сессии уже грелись. */
export function __resetMistakePrewarmForTests(): void {
  prewarmedSessions.clear();
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
