/**
 * lessons_pearl_unlock.ts — разблокировка отдельного урока за жемчужины.
 *
 * зачем (владелец, 2026-09-17): курс снова открывается по порядку, но у
 * человека должен быть выход, если он не хочет проходить предыдущий урок —
 * открыть нужный урок за 100 жемчужин НАВСЕГДА. Это НЕ пейвол: Plus здесь ни
 * при чём, платит внутриигровая валюта.
 *
 * Правила владельца, зашитые здесь:
 *  • покупка открывает РОВНО один урок и НЕ считается его прохождением —
 *    следующий за купленным по-прежнему требует бронзы или своей покупки;
 *  • купить можно ЛЮБОЙ закрытый урок, прыгать по курсу не запрещено;
 *  • куплено — навсегда: право переносится между устройствами (portable grant).
 *
 * Economy Constitution: ОДНА композитная операция «дебет + grant» через
 * commitShardCompositeOperation с идемпотентностью по стабильному operationId.
 * Никакого spend-first/grant-later: двойной тап и поздний ответ сети не могут
 * списать жемчуг дважды (образец — app/quota_day_pass.ts).
 */
import { commitShardCompositeOperation, semanticShardOperationId } from './shards_system';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { isMainCourseLesson, isAlwaysOpenLesson } from './main_course_access';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
// Чтение списка и имя ключа живут в лёгком модуле без зависимости от экономики —
// его импортируют проверки доступа, которые грузит Главная.
import { purchasedLessonsKey } from './lessons_pearl_unlock_storage';

export {
  PURCHASED_LESSONS_KEY_PREFIX,
  isLessonPurchasedWithPearls,
  purchasedLessonsKey,
  readPurchasedLessons,
} from './lessons_pearl_unlock_storage';

/** Цена одного урока. Решение владельца 2026-09-17. */
export const LESSON_PEARL_UNLOCK_PRICE = 100;

// зачем: подробная трасса нужна при разборе («сперва логи»), но в проде она
// стоит работы на каждом вызове. Голый __DEV__ падает в тестах — читаем через
// globalThis (класс бага project_dev_guard_bare_dev_global_jest).
const IS_DEV_RUNTIME: boolean = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

export type LessonPearlUnlockFailReason =
  | 'invalid_lesson'
  | 'always_open'
  | 'insufficient_shards'
  | 'stale_account'
  | 'persist_failed';

export type LessonPearlUnlockResult =
  | Readonly<{ ok: true; spent: number; lessonId: number; alreadyOwned: boolean }>
  | Readonly<{ ok: false; reason: LessonPearlUnlockFailReason }>;

/**
 * Покупает доступ к одному уроку.
 *
 * Идемпотентность: operationId детерминирован по уроку и цели обучения, так что
 * повтор (двойной тап, ретрай, второе устройство) возвращает тот же чек и не
 * списывает повторно — статус `already-satisfied`.
 */
export async function buyLessonWithPearls(params: Readonly<{
  lessonId: number;
  studyTarget?: RuntimeStudyTarget;
}>): Promise<LessonPearlUnlockResult> {
  const { lessonId, studyTarget } = params;
  const target = storageStudyTarget(studyTarget);
  if (IS_DEV_RUNTIME) console.log('[LESSON-UNLOCK] buy:in', JSON.stringify({ lessonId, target, price: LESSON_PEARL_UNLOCK_PRICE }));

  if (!isMainCourseLesson(lessonId)) {
    console.warn('[LESSON-UNLOCK] buy:out invalid_lesson', JSON.stringify({ lessonId }));
    return { ok: false, reason: 'invalid_lesson' };
  }
  if (isAlwaysOpenLesson(lessonId)) {
    // Урок 1 открыт всегда — продавать его было бы обманом.
    console.warn('[LESSON-UNLOCK] buy:out always_open', JSON.stringify({ lessonId }));
    return { ok: false, reason: 'always_open' };
  }

  const subjectId = `${target}:${lessonId}`;
  const storageKey = purchasedLessonsKey(studyTarget);
  try {
    const operationId = await semanticShardOperationId('lesson_pearl_unlock', subjectId);
    const purchase = await commitShardCompositeOperation({
      operationId,
      amount: LESSON_PEARL_UNLOCK_PRICE,
      reason: 'lesson_pearl_unlock',
      grant: { kind: 'lesson_pearl_unlock', subjectId, payload: { storageKey, lessonId, studyTarget: target } },
      // Список уроков склеивается внутри замка редьюсером: он читает текущий
      // список и дописывает урок. Здесь localWrites не нужны — иначе гонка
      // двух покупок затёрла бы чужой урок (класс бага «read-modify-write»).
      // Пустой localWrites допустим ровно потому, что commitShardCompositeOperation
      // сам ставит semanticResult: true (см. debit_exact_result_required в
      // client_shard_operation_ledger) — дублировать флаг здесь нельзя, его нет
      // в CommitShardCompositeOperationInput.
      localWrites: [],
    });
    if (IS_DEV_RUNTIME) console.log('[LESSON-UNLOCK] buy:commit', JSON.stringify({
      lessonId,
      status: purchase.status,
      reason: (purchase as { reason?: unknown }).reason ?? null,
    }));

    if (purchase.status === 'insufficient') return { ok: false, reason: 'insufficient_shards' };
    if (purchase.status === 'failed') {
      const reason = (purchase as { reason?: string }).reason;
      return {
        ok: false,
        reason: reason === 'stale_account_generation' ? 'stale_account' : 'persist_failed',
      };
    }

    // Баланс жемчужин леджер публикует сам (`shards_balance_updated`);
    // это — сигнал экрану уроков перечитать список без перезахода.
    emitAppEvent('lesson_pearl_unlock_granted', { lessonId, studyTarget: target });
    if (IS_DEV_RUNTIME) console.log('[LESSON-UNLOCK] buy:out ok', JSON.stringify({ lessonId, already: purchase.status === 'already-satisfied' }));
    return {
      ok: true,
      spent: LESSON_PEARL_UNLOCK_PRICE,
      lessonId,
      alreadyOwned: purchase.status === 'already-satisfied',
    };
  } catch (error: unknown) {
    DebugLogger.error(
      'lessons_pearl_unlock:buy',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
    return { ok: false, reason: 'persist_failed' };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
