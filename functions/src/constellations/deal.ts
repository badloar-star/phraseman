// ════════════════════════════════════════════════════════════════════════════
// constellations/deal.ts — выдача вопросов раунда (спек A2/D3/D5/D6).
//
// Источник v1: кэш constellation_quizzes (status ready), при нехватке —
// бесшовный fallback на банк arena_questions того же уровня (D3). Правильный
// индекс НИКОГДА не уходит в клиентские доки: публичная часть — в
// constellation_players, correct+rule — только в constellation_server (D6).
//
// Варианты перемешиваются сидированно (matchId+round+qid): у обоих дуэлянтов
// ОДИН И ТОТ ЖЕ порядок вариантов — честная скорость.
// Дедуп по содержанию — тот же приём, что в matchmaking.ts (фикс «одинаковые
// вопросы в матче»); анти-повторы игрока (D5) — коллекция constellation_recent.
// ════════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { createSeededRand } from './hex';
import type { DealtQuestionPublic } from './store_types';

const db = admin.firestore();

export interface DealtQuestion {
  public: DealtQuestionPublic;
  correctIndex: number;
  rule: string;
}

interface RawQuestion {
  id: string;
  question: string;
  options: string[];
  correctText: string;
  rule: string;
  level: string;
}

/** Ключ дедупа по видимому содержанию (как questionContentKey в matchmaking.ts). */
function contentKey(q: { question: string; options: string[]; correctText: string }): string {
  const text = q.question.trim().toLowerCase();
  if (text === '') return '';
  const opts = q.options.map((o) => String(o).trim().toLowerCase()).sort().join('¦');
  return `${text}||${opts}||${q.correctText.trim().toLowerCase()}`;
}

function parseRaw(id: string, data: Record<string, unknown>): RawQuestion | null {
  const question = typeof data.question === 'string' ? data.question : '';
  const options = Array.isArray(data.options) ? data.options.map((o) => String(o)) : [];
  const correctText = typeof data.correct === 'string' ? data.correct : '';
  if (!question || options.length < 2 || !correctText) return null;
  if (!options.some((o) => o.trim() === correctText.trim())) return null;
  const rule = typeof data.rule === 'string'
    ? data.rule
    : typeof data.explanation === 'string' ? data.explanation : '';
  const level = typeof data.level === 'string' ? data.level : '';
  return { id, question, options, correctText, rule, level };
}

async function fetchFromCache(level: string, limit: number): Promise<RawQuestion[]> {
  // rand-пивот (12.2): без него .limit всегда брал одни и те же первые N доков
  // кэша → повторы. Берём случайное окно и оборачиваемся при нехватке.
  const pivot = Math.random();
  const base = () => db.collection('constellation_quizzes')
    .where('status', '==', 'ready')
    .where('level', '==', level);
  try {
    const [snapA, snapB] = await Promise.all([
      base().where('rand', '>=', pivot).orderBy('rand').limit(limit).get(),
      base().where('rand', '<', pivot).orderBy('rand').limit(limit).get(),
    ]);
    let docs = [...snapA.docs, ...snapB.docs];
    // Страховка на документы без поля rand (старый кэш) — добираем простым запросом.
    if (docs.length < limit) {
      const plain = await base().limit(limit).get();
      docs = [...docs, ...plain.docs];
    }
    const out: RawQuestion[] = [];
    const seenIds = new Set<string>();
    for (const doc of docs) {
      if (seenIds.has(doc.id)) continue;
      seenIds.add(doc.id);
      const data = doc.data() as Record<string, unknown>;
      // Кэш хранит correctIndex; нормализуем к correctText для общего пути.
      const options = Array.isArray(data.options) ? data.options.map((o) => String(o)) : [];
      const ci = typeof data.correctIndex === 'number' ? data.correctIndex : -1;
      if (options.length >= 2 && ci >= 0 && ci < options.length) {
        const parsed = parseRaw(doc.id, { ...data, correct: options[ci] });
        if (parsed) out.push(parsed);
      }
    }
    return out;
  } catch {
    return []; // кэша может не быть вовсе — банк подхватит
  }
}

/** Банк arena_questions по rand-пивоту (равномерное покрытие, как pickQuestions). */
async function fetchFromBank(level: string, limit: number): Promise<RawQuestion[]> {
  const pivot = Math.random();
  const [snapA, snapB] = await Promise.all([
    db.collection('arena_questions')
      .where('level', '==', level)
      .where('rand', '>=', pivot)
      .orderBy('rand')
      .limit(limit)
      .get(),
    db.collection('arena_questions')
      .where('level', '==', level)
      .where('rand', '<', pivot)
      .orderBy('rand')
      .limit(limit)
      .get(),
  ]);
  let docs = [...snapA.docs, ...snapB.docs];
  if (docs.length < limit) {
    // Страховка на документы без поля rand (см. matchmaking.pickQuestions).
    const plain = await db.collection('arena_questions')
      .where('level', '==', level)
      .limit(limit)
      .get();
    docs = [...docs, ...plain.docs];
  }
  const out: RawQuestion[] = [];
  for (const doc of docs) {
    const parsed = parseRaw(doc.id, doc.data() as Record<string, unknown>);
    if (parsed) out.push(parsed);
  }
  return out;
}

/**
 * Пул вопросов уровня: кэш → банк, дедуп по содержанию, исключение
 * недавно показанных (анти-повторы D5) и уже выданных в этом раунде.
 */
export async function fetchQuestionPool(
  level: string,
  need: number,
  excludeIds: ReadonlySet<string>,
): Promise<RawQuestion[]> {
  const fetchLimit = Math.max(need * 4, 24);
  const cache = await fetchFromCache(level, fetchLimit);
  let pool = cache.length >= need ? cache : [...cache, ...await fetchFromBank(level, fetchLimit)];

  const dedup = (src: RawQuestion[]): RawQuestion[] => {
    const seen = new Set<string>();
    const out: RawQuestion[] = [];
    for (const q of src) {
      if (excludeIds.has(q.id)) continue;
      const key = contentKey(q);
      if (key !== '' && seen.has(key)) continue;
      if (key !== '') seen.add(key);
      out.push(q);
    }
    return out;
  };

  let out = dedup(pool);
  // 12.3: если ПОСЛЕ дедупа не хватило (много исключённых/дублей) — второй проход
  // из банка большим лимитом. Раньше банк подхватывался только если cache<need,
  // а не когда после дедупа осталось меньше need.
  if (out.length < need) {
    const extra = await fetchFromBank(level, fetchLimit * 2);
    pool = [...pool, ...extra];
    out = dedup(pool);
  }
  return out;
}

/**
 * Прогрев кэша вопросов на этапе поиска (идея владельца): пока идёт подбор,
 * фоном проверяем, что для уровней матча в кэше достаточно ready-вопросов, и
 * при нехватке запускаем досыпку. Так в матче выдача — всегда мгновенное чтение
 * из кэша, никто не ждёт генерацию во время игры.
 *
 * Сейчас генерация квизов ещё не подключена (этап 12.4) — прогрев гарантирует
 * наличие через банк arena_questions (fetchFromBank). Когда появится OpenAI-
 * генерация, сюда добавится триггер догенерации до cacheTargetPerLevel.
 */
export async function warmQuestionCache(levels: readonly string[], perLevel: number): Promise<void> {
  const unique = [...new Set(levels)];
  await Promise.all(unique.map(async (level) => {
    try {
      const readyCount = await db.collection('constellation_quizzes')
        .where('status', '==', 'ready')
        .where('level', '==', level)
        .count().get()
        .then((s) => s.data().count ?? 0)
        .catch(() => 0);
      if (readyCount >= perLevel) return; // кэша хватает — греть нечего
      // Кэша мало — прогреваем банк (fetchFromBank прогревает индекс/кэш Firestore).
      // Когда будет генерация: здесь триггерить догенерацию (readyCount → perLevel).
      await fetchFromBank(level, Math.min(perLevel, 48));
    } catch {
      // прогрев best-effort — матч в любом случае возьмёт из банка на выдаче
    }
  }));
}

/**
 * Готовит вопрос к выдаче: сидированно перемешивает варианты и разделяет
 * публичную часть (в player-док) и correct+rule (в server-док).
 */
export function toDealtQuestion(raw: RawQuestion, shuffleSeed: string): DealtQuestion {
  const rand = createSeededRand(shuffleSeed);
  const options = [...raw.options];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const correctIndex = options.findIndex((o) => o.trim() === raw.correctText.trim());
  return {
    public: {
      qid: raw.id,
      question: raw.question,
      options,
      type: 'mcq',
      level: raw.level,
    },
    correctIndex: Math.max(0, correctIndex),
    rule: raw.rule,
  };
}

const RECENT_LIMIT = 200;

/** Последние показанные вопросы игрока (D5): constellation_recent/{uid}. */
export async function readRecentQids(uids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (uids.length === 0) return out;
  const refs = uids.map((uid) => db.collection('constellation_recent').doc(uid));
  const snaps = await db.getAll(...refs);
  for (const snap of snaps) {
    const qids = (snap.data() as { qids?: unknown } | undefined)?.qids;
    if (Array.isArray(qids)) for (const q of qids) out.add(String(q));
  }
  return out;
}

export async function appendRecentQids(uid: string, qids: string[]): Promise<void> {
  if (qids.length === 0) return;
  const ref = db.collection('constellation_recent').doc(uid);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prev = (snap.data() as { qids?: unknown } | undefined)?.qids;
      const list = Array.isArray(prev) ? prev.map(String) : [];
      const next = [...list, ...qids].slice(-RECENT_LIMIT);
      tx.set(ref, { qids: next, updatedAt: Date.now() });
    });
  } catch (e) {
    console.warn('appendRecentQids failed (non-fatal)', e);
  }
}
