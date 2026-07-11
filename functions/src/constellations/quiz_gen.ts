// ════════════════════════════════════════════════════════════════════════════
// quiz_gen.ts — генератор вопросов «Созвездий» (Фаза 2 по ai-gen-master-index).
//
// Поток: генератор (openAiChat, JSON-режим) → код-фильтр+судья (quiz_gen_judge)
// → запись прошедших в constellation_quizzes с correctIndex ЧИСЛОМ (схема кэша).
// Кэш читает deal.ts::fetchFromCache (status='ready', level, rand, options,
// correctIndex, question). Job 'constellations' (openai_jobs_config): модель+
// кап+рубильник. Стоимость под контролем: генерим ТОЛЬКО когда запас мал (крон/
// warmQuestionCache зовут с нужным count), каждый вопрос валидируется fail-closed.
// ════════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { openAiChat } from '../explain/explain_provider';
import { resolveJobConfig, assertJobEnabled } from '../openai_jobs_config';
import { judgeQuizCandidate, type QuizCandidate } from './quiz_gen_judge';

const QUIZZES = 'constellation_quizzes';
const GEN_MAX_TOKENS = 900;
const GEN_TEMPERATURE = 0.8;
/** Просим у модели с запасом — часть отсеет грейдер. */
const OVERGEN_FACTOR = 2;

interface GeneratedRaw {
  question: string;
  options: string[];
  correctIndex: number;
}

function buildGenPrompt(level: string, count: number): string {
  return [
    `Generate ${count} multiple-choice English grammar/vocabulary questions at CEFR level ${level}.`,
    'Each question tests ONE clear point (verb form, preposition, word choice, phrasal verb, etc.).',
    'Rules:',
    '- Exactly 4 options per question, EXACTLY ONE correct.',
    '- Distractors must be plausible-but-wrong (common learner mistakes), not nonsense.',
    '- No option repeats; no "all/none of the above".',
    '- Keep the question one short sentence, use "___" for a gap where natural.',
    'Return STRICT JSON only, shape:',
    '{"questions":[{"question":"...","options":["a","b","c","d"],"correctIndex":0}]}',
  ].join('\n');
}

/** Парсит ответ генератора fail-safe: любой сбой формы → пустой список. */
export function parseGenReply(raw: string): GeneratedRaw[] {
  let obj: unknown;
  try {
    const s = String(raw ?? '').trim();
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    obj = JSON.parse(start !== -1 && end > start ? s.slice(start, end + 1) : s);
  } catch {
    return [];
  }
  const arr = (obj as { questions?: unknown })?.questions;
  if (!Array.isArray(arr)) return [];
  const out: GeneratedRaw[] = [];
  for (const q of arr) {
    const o = q as Record<string, unknown>;
    const question = typeof o.question === 'string' ? o.question : '';
    const options = Array.isArray(o.options) ? o.options.map((x) => String(x)) : [];
    const correctIndex = typeof o.correctIndex === 'number' ? o.correctIndex : -1;
    if (question && options.length > 0) out.push({ question, options, correctIndex });
  }
  return out;
}

/** FNV-хэш строки → float [0,1) для поля rand (как randFromId в банке). */
function randFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

export interface GenResult {
  requested: number;
  generated: number;   // сколько вернула модель
  accepted: number;    // сколько прошло грейдер и записано
  skipped: boolean;    // job выключен админом
}

/**
 * Генерирует до `count` валидных вопросов уровня `level` и пишет их в кэш.
 * apiKey передаётся вызывающим (крон/warm — читают секрет). Никогда не бросает
 * на сбое отдельного вопроса: невалидные тихо отсеиваются грейдером.
 */
export async function generateConstellationQuizzes(
  level: string,
  count: number,
  apiKey: string,
): Promise<GenResult> {
  const db = admin.firestore();
  const cfg = await resolveJobConfig(db, 'constellations');
  // Рубильник: выключено админом → ничего не генерим (игра берёт из банка).
  if (!cfg.enabled) return { requested: count, generated: 0, accepted: 0, skipped: true };

  const askFor = Math.max(1, Math.min(20, count * OVERGEN_FACTOR));
  let genText: string;
  try {
    const res = await openAiChat({
      apiKey,
      model: cfg.model,
      messages: [{ role: 'user', content: buildGenPrompt(level, askFor) }],
      maxTokens: GEN_MAX_TOKENS,
      temperature: GEN_TEMPERATURE,
      responseFormat: { type: 'json_object' },
    });
    genText = res.text;
  } catch (e) {
    console.warn('constellation quiz gen: provider failed', level, e);
    return { requested: count, generated: 0, accepted: 0, skipped: false };
  }

  const candidates = parseGenReply(genText);
  let accepted = 0;
  const now = Date.now();
  for (const raw of candidates) {
    if (accepted >= count) break;
    const candidate: QuizCandidate = { ...raw, level };
    const verdict = await judgeQuizCandidate(candidate, apiKey);
    if (!verdict.ok) continue; // не прошёл грейдер — в кэш НЕ пишем (fail-closed)
    // qid детерминирован от содержания (дедуп по повторной генерации того же).
    const qid = `cg_${level}_${Math.floor(randFromString(candidate.question) * 1e9).toString(36)}`;
    await db.collection(QUIZZES).doc(qid).set({
      status: 'ready',
      level,
      question: candidate.question,
      options: candidate.options,
      correctIndex: candidate.correctIndex, // ЧИСЛО (схема кэша, не текст!)
      rand: randFromString(qid),
      source: 'ai',
      createdAt: now,
    }, { merge: true });
    accepted += 1;
  }
  return { requested: count, generated: candidates.length, accepted, skipped: false };
}
