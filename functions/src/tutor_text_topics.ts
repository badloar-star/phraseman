/**
 * tutorTextTopics — темы на выбор при входе в урок с Максом.
 *
 * зачем (владелец 2026-09-15): «открываем Макс, и он всё равно прогревается —
 * сразу должно появиться на экране сообщение (не ИИ) "выбери тему, которую
 * хочешь разобрать" и там например три подходящие темы». То есть человек НЕ
 * ждёт модель, чтобы понять, чем займётся: выбор виден сразу.
 *
 * Почему отдельный вызов, а не поле первого хода: первый ход — это генерация у
 * модели (секунды и деньги), а список тем — чистая выборка из каталога. Здесь
 * НЕТ обращения к OpenAI вообще: одно чтение памяти ученика, чтобы знать его
 * уровень и что уже закрыто. Названия целей живут только на сервере (78 целей
 * × 9 языков), дублировать их в бандл нельзя — поэтому их отдаёт сервер.
 *
 * Голосовой MAX не затронут: переиспользуется только предметный каталог целей.
 */

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolveRemoteBools } from './remote_gates';
import { asCefr } from './premium_dialog';
import {
  CAN_DO_GOALS,
  pickNextGoal,
  type CanDoGoal,
  type CanDoMastery,
} from './max_voice_can_do_goals';
import { readTutorMemory } from './max_voice_tutor_memory';

if (!admin.apps.length) admin.initializeApp();

const REGION = 'us-central1';

/** Сколько тем предлагаем. Три — прямое требование владельца. */
const TOPIC_COUNT = 3;

export interface TutorTopic {
  goalId: string;
  level: string;
  title: Record<string, string>;
  /** Мастерство 0..3: показываем, что тема уже начата. */
  mastery: number;
  /** Тема пришла из памяти как повтор, а не как новая цель. */
  review: boolean;
}

/**
 * Выбор тем: следующая незакрытая цель уровня + ещё две незакрытые за ней, а
 * последняя (если есть) — начатая, но не добитая цель на повтор.
 *
 * Чистая функция: тестируется без Firestore и без сети.
 */
export function pickTutorTopics(
  mastery: CanDoMastery,
  level: string,
  count = TOPIC_COUNT,
): TutorTopic[] {
  const out: TutorTopic[] = [];
  const taken = new Set<string>();
  const simulated: CanDoMastery = { ...mastery };

  // Новые темы: идём по каталогу так же, как это делает сам урок.
  for (let i = 0; i < count; i += 1) {
    const goal: CanDoGoal | null = pickNextGoal(simulated, level);
    if (!goal || taken.has(goal.id)) break;
    taken.add(goal.id);
    out.push({
      goalId: goal.id,
      level: goal.level,
      title: goal.title,
      mastery: mastery[goal.id] ?? 0,
      review: false,
    });
    // Помечаем закрытой только в симуляции, чтобы следующая итерация дала
    // ДРУГУЮ цель. Настоящее мастерство не трогаем.
    simulated[goal.id] = 3;
  }

  // Повтор: начатая, но не добитая цель. Ставим последней, как в макете
  // («Повторить: was / were · из памяти»).
  const review = CAN_DO_GOALS.find((g) => {
    const m = mastery[g.id] ?? 0;
    return m > 0 && m < 3 && !taken.has(g.id);
  });
  if (review) {
    out.push({
      goalId: review.id,
      level: review.level,
      title: review.title,
      mastery: mastery[review.id] ?? 0,
      review: true,
    });
  }

  return out;
}

export const tutorTextTopics = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
    memory: '256MiB',
    timeoutSeconds: 20,
  },
  async (request) => {
    if (!request.auth?.uid) {
      console.warn('[TUTOR-TOPICS] rejected', { reason: 'auth_required' });
      throw new HttpsError('unauthenticated', 'auth_required');
    }

    const db = admin.firestore();
    const authUid = request.auth.uid;
    const data = (request.data ?? {}) as { cefr?: unknown };
    const cefr = asCefr(data.cefr);

    const stableUid = await resolveStableUidForAuth(db, authUid);
    const [gates, memory] = await Promise.all([
      resolveRemoteBools(db, { ai_global_disable: false, gate_ai_text_tutor: true }),
      readTutorMemory(db, authUid, stableUid),
    ]);

    if (gates.ai_global_disable) {
      console.warn('[TUTOR-TOPICS] rejected', { reason: 'ai_globally_disabled' });
      throw new HttpsError('failed-precondition', 'ai_globally_disabled');
    }
    if (!gates.gate_ai_text_tutor) {
      console.warn('[TUTOR-TOPICS] rejected', { reason: 'tutor_text_disabled' });
      throw new HttpsError('failed-precondition', 'tutor_text_disabled');
    }

    // Уровень: что знает память ученика, иначе запрошенный клиентом.
    const level = memory.lastCefr || cefr;
    const topics = pickTutorTopics(memory.goalMastery, level);

    console.log('[TUTOR-TOPICS] ok', {
      level,
      lessonsDone: memory.callCount,
      topics: topics.map((t) => t.goalId),
      hasReview: topics.some((t) => t.review),
      learnerName: memory.preferredName ? 'set' : 'none',
    });

    return {
      ok: true,
      level,
      topics,
      /** Имя ученика для приветствия; пусто — обратимся без имени. */
      learnerName: memory.preferredName ?? '',
      /** Сколько уроков уже было: нужен текст «продолжим» вместо «начнём». */
      lessonsDone: memory.callCount,
      /** Тема, о которой договорились в прошлый раз. */
      nextTopic: memory.nextTopic,
    };
  },
);
