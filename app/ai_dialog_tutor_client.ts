/**
 * Клиент текстового урока с Максом (callable tutorTextTurn).
 *
 * зачем (владелец 2026-09-14): «весь каркас Макса перенести в особый диалог с
 * тутором… в дешёвом режиме без реального соединения». Транспорт намеренно
 * тонкий: вся защита (лимиты, safety, флаг раздела) живёт на сервере, здесь
 * только доставка и безопасный разбор ответа.
 *
 * Модуль чистый (без React): его разбирает тест, а экран получает готовую
 * структуру.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { aiOffline, AiOfflineError } from './ai_kill_switch_copy';
import {
  warmAiFunction,
  withAiCallableRetry,
  isDefinitelyNotStarted,
  aiAttemptTimeoutMs,
} from './ai_callable_resilience';
import {
  withExplainCallableTimeout,
  EXPLAIN_CALLABLE_TIMEOUT_MS,
} from './explain_callable_timeout';
import type { DialogChatTurn } from './ai_dialog_client';
import { parseAiDialogQuotaObservation } from './ai_dialog_daily_quota';
import type { Lang } from '../constants/i18n';
import type { StudyTarget } from './study_target';

const FUNCTIONS_REGION = 'us-central1';

export interface TutorTurnRequest {
  /** Реплика ученика. Пусто ТОЛЬКО на открывающем ходу: Макс говорит первым. */
  userText: string;
  history: DialogChatTurn[];
  cefr: string;
  interfaceLang: Lang;
  studyTarget: StudyTarget;
  /** Цель урока; пусто — сервер возьмёт следующую незакрытую из каталога. */
  goalId?: string;
  /** Сколько реплик Макса уже было (бюджет урока). */
  turnIndex: number;
  /**
   * Стабильный id этого урока: один на всю сессию экрана. По нему сервер
   * отличает повторный ход от нового урока, когда сохраняет память Макса.
   */
  lessonId: string;
}

/** Id урока на одну сессию экрана. Локальный, в аналитику не уходит. */
export function newTutorLessonId(): string {
  return `tt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Действия учителя, приехавшие вместе с репликой (см. сервер: TutorTextTools). */
export interface TutorTools {
  /** Фраза на доску над чатом; null — доски в этом ходу нет. */
  board: { text: string; meaning: string } | null;
  /** Оценка попытки ученика произнести целевую фразу. */
  phraseResult: { text: string; ok: boolean } | null;
  /** Новый уровень мастерства цели 0..3; null — без изменений. */
  goalMastery: number | null;
  /** Домашка на следующий раз (на закрывающем ходу). */
  homework: string[];
  /** Тема следующего урока. */
  nextTopic: string;
  /** Урок завершён. */
  lessonComplete: boolean;
}

export interface TutorGoalInfo {
  id: string;
  level: string;
  /** Локализованные названия цели из каталога MAX (ключ — код языка). */
  title: Record<string, string>;
  mastery: number;
}

export interface TutorTurnResponse {
  ok: boolean;
  reply: string;
  tools: TutorTools;
  /** Подсказки к реплике Макса: «почему так», перевод, рекомендации. */
  coach: unknown;
  goal: TutorGoalInfo | null;
  remainingQuota: number;
  resetAtMs: number;
  quotaVersion: number;
  model: string;
}

export const EMPTY_TUTOR_TOOLS: TutorTools = {
  board: null,
  phraseResult: null,
  goalMastery: null,
  homework: [],
  nextTopic: '',
  lessonComplete: false,
};

function str(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

/**
 * Разбирает инструменты из ответа сервера. Никогда не бросает: сервер уже их
 * очистил, но клиент не обязан этому верить — битое поле не должно ронять урок.
 */
export function parseTutorTools(raw: unknown): TutorTools {
  if (!raw || typeof raw !== 'object') return EMPTY_TUTOR_TOOLS;
  const record = raw as Record<string, unknown>;

  const rawBoard = record.board && typeof record.board === 'object'
    ? (record.board as Record<string, unknown>)
    : null;
  const boardText = rawBoard ? str(rawBoard.text, 160) : '';

  const rawPhrase = record.phraseResult && typeof record.phraseResult === 'object'
    ? (record.phraseResult as Record<string, unknown>)
    : null;
  const phraseText = rawPhrase ? str(rawPhrase.text, 160) : '';

  const masteryValue = Number(record.goalMastery);
  const goalMastery = Number.isFinite(masteryValue)
    ? Math.max(0, Math.min(3, Math.round(masteryValue)))
    : null;

  return {
    board: boardText ? { text: boardText, meaning: rawBoard ? str(rawBoard.meaning, 200) : '' } : null,
    phraseResult: phraseText ? { text: phraseText, ok: rawPhrase?.ok === true } : null,
    goalMastery,
    homework: Array.isArray(record.homework)
      ? record.homework.map((item) => str(item, 160)).filter((item) => item.length > 0).slice(0, 3)
      : [],
    nextTopic: str(record.nextTopic, 140),
    lessonComplete: record.lessonComplete === true,
  };
}

/** Название цели на языке интерфейса; фолбэк — английское. */
export function tutorGoalTitle(goal: TutorGoalInfo | null, lang: Lang): string {
  if (!goal) return '';
  return str(goal.title?.[lang], 140) || str(goal.title?.en, 140);
}

/**
 * Прогрев инстанса урока. У функции minInstances: 0, а первый ход урока —
 * это ровно тот момент, когда человек ждёт Макса с пустым экраном.
 * Никогда не бросает — вызывать через `void`.
 */
export function warmTutorTextTurn(studyTarget: StudyTarget): void {
  void warmAiFunction('tutorTextTurn', async () => {
    await initFirebaseAppCheckIfAvailable().catch(() => {});
    const fn = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'tutorTextTurn');
    return fn({ warmupPing: true, studyTarget });
  });
}

/**
 * Один ход урока. Повтор — только когда сервер гарантированно не начал работу:
 * ход списывает дневную реплику, и слепой повтор по таймауту снял бы вторую.
 */
export async function callTutorTextTurn(req: TutorTurnRequest): Promise<TutorTurnResponse> {
  if (aiOffline()) throw new AiOfflineError();

  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<TutorTurnRequest, Record<string, unknown>>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'tutorTextTurn',
  );
  const res = await withAiCallableRetry(
    (attempt) => withExplainCallableTimeout(
      fn(req),
      'tutorTextTurn',
      aiAttemptTimeoutMs(EXPLAIN_CALLABLE_TIMEOUT_MS, attempt),
    ),
    { label: 'tutorTextTurn', shouldRetry: isDefinitelyNotStarted },
  );

  const parsed = parseTutorTurnResponse(res.data);
  if (!parsed) throw new Error('tutor_response_invalid');
  return parsed;
}

export function parseTutorTurnResponse(input: unknown): TutorTurnResponse | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const data = input as Record<string, unknown>;
  const quota = parseAiDialogQuotaObservation(data);
  if (!quota) return null;
  const rawGoal = data.goal && typeof data.goal === 'object'
    ? (data.goal as Record<string, unknown>)
    : null;

  return {
    ok: data.ok === true,
    reply: str(data.reply, 1200),
    tools: parseTutorTools(data.tools),
    // Разбирает экран тем же parseDialogCoach, что и обычный диалог: контракт
    // подсказок один на оба экрана.
    coach: data.coach ?? null,
    goal: rawGoal
      ? {
          id: str(rawGoal.id, 40),
          level: str(rawGoal.level, 4),
          title: (rawGoal.title && typeof rawGoal.title === 'object'
            ? rawGoal.title
            : {}) as Record<string, string>,
          mastery: Math.max(0, Math.min(3, Math.round(Number(rawGoal.mastery) || 0))),
        }
      : null,
    remainingQuota: quota.remainingQuota,
    resetAtMs: quota.resetAtMs,
    quotaVersion: quota.quotaVersion,
    model: str(data.model, 60),
  };
}

/** Тема на выбор при входе в урок (callable tutorTextTopics). */
export interface TutorTopic {
  goalId: string;
  level: string;
  title: Record<string, string>;
  mastery: number;
  /** Повтор начатой темы, а не новая цель. */
  review: boolean;
}

export interface TutorTopicsResponse {
  ok: boolean;
  level: string;
  topics: TutorTopic[];
  learnerName: string;
  lessonsDone: number;
  nextTopic: string;
}

/**
 * Темы на выбор. Отдельный дешёвый вызов БЕЗ модели: человек видит выбор сразу,
 * не дожидаясь генерации первого хода (прямое требование владельца 2026-09-15).
 * Никогда не бросает на разборе: пустой список — экран покажет «начнём сами».
 */
export async function callTutorTextTopics(cefr: string, studyTarget: StudyTarget): Promise<TutorTopicsResponse> {
  if (aiOffline()) throw new AiOfflineError();
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<{ cefr: string; studyTarget: StudyTarget }, Record<string, unknown>>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'tutorTextTopics',
  );
  const res = await withExplainCallableTimeout(
    fn({ cefr, studyTarget }),
    'tutorTextTopics',
    EXPLAIN_CALLABLE_TIMEOUT_MS,
  );
  const data = (res.data ?? {}) as Record<string, unknown>;
  const rawTopics = Array.isArray(data.topics) ? data.topics : [];
  return {
    ok: data.ok === true,
    level: str(data.level, 4),
    topics: rawTopics
      .map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
          goalId: str(row.goalId, 40),
          level: str(row.level, 4),
          title: (row.title && typeof row.title === 'object' ? row.title : {}) as Record<string, string>,
          mastery: Math.max(0, Math.min(3, Math.round(Number(row.mastery) || 0))),
          review: row.review === true,
        };
      })
      .filter((topic) => topic.goalId.length > 0)
      .slice(0, 6),
    learnerName: str(data.learnerName, 60),
    lessonsDone: Math.max(0, Math.floor(Number(data.lessonsDone) || 0)),
    nextTopic: str(data.nextTopic, 140),
  };
}

/** Название темы на языке интерфейса; фолбэк — английское. */
export function tutorTopicTitle(topic: TutorTopic, lang: Lang): string {
  return str(topic.title?.[lang], 140) || str(topic.title?.en, 140);
}

/** Раздел выключен флагом (сервер ответил tutor_text_disabled). */
export function isTutorDisabledError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase();
  return message.includes('tutor_text_disabled');
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
