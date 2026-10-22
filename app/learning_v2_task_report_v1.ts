// learning_v2_task_report_v1.ts — жалоба на задание нового курса (Learning V2).
// зачем (решение владельца 21.10, пункт реестра №9): кнопка жалобы в КАЖДОМ задании нового курса и для ВСЕХ, а не только для
// тестеров. Жалоба несёт урок, эпизод (занятие) и тип задания и идёт в общий раздел админки «Ошибки контента»
// (коллекция error_reports, тот же серверный путь submitClientReport). Защита от повторов: одна жалоба на задание от
// человека — idempotencyKey на сервере плюс память процесса, чтобы повтор не тратил даже вызов. При открытии задания
// ничего не читаем: стоимость — одна запись только в момент отправки.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { submitErrorReport, ERROR_REPORT_FREE_TEXT_CATEGORY, type ErrorReportResult } from './error_report';

const LOG = '[V2-TASK-REPORT]';

export type LearningV2TaskReportInputV1 = Readonly<{
  courseSessionId: string;
  lessonOrdinal: number;
  sessionOrdinal: number;
  family: string;
  interactionId: string;
  taskText: string;
  userAnswer?: string;
  comment: string;
  lang: Lang;
}>;

/** Машинный ключ для поиска в админке: урок, эпизод, тип задания и само задание. */
export function learningV2TaskReportDataIdV1(input: Pick<LearningV2TaskReportInputV1,
  'lessonOrdinal' | 'sessionOrdinal' | 'family' | 'interactionId'>): string {
  return `lv2:l${input.lessonOrdinal}:s${input.sessionOrdinal}:${input.family}:${input.interactionId}`.slice(0, 180);
}

/** Ключ «одна жалоба на задание от человека»; сервер добавляет к нему вид отчёта и stableUid. */
export function learningV2TaskReportIdempotencyKeyV1(input: Pick<LearningV2TaskReportInputV1,
  'courseSessionId' | 'interactionId'>): string {
  return `lv2-task:${input.courseSessionId}:${input.interactionId}`.slice(0, 120);
}

const reportedInThisProcess = new Set<string>();

export async function submitLearningV2TaskReportV1(input: LearningV2TaskReportInputV1): Promise<ErrorReportResult> {
  const dataId = learningV2TaskReportDataIdV1(input);
  const idempotencyKey = learningV2TaskReportIdempotencyKeyV1(input);
  if (reportedInThisProcess.has(idempotencyKey)) {
    // зачем: повтор той же жалобы в этом запуске — сервер всё равно вернул бы прежний ответ; вызов не тратим
    console.log(`${LOG} duplicate_in_process dataId=${dataId}`); // guard-ok: ранний выход пишет причину
    return 'sent';
  }
  const userName = await AsyncStorage.getItem('user_name').catch((error: unknown) => {
    console.warn(`${LOG} user_name_read_failed reason=${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  const startedAt = Date.now();
  const result = await submitErrorReport(
    {
      screen: 'learning_v2_session',
      category: ERROR_REPORT_FREE_TEXT_CATEGORY,
      dataId,
      dataText: `Урок ${input.lessonOrdinal} · Эпизод ${input.sessionOrdinal} · ${input.family}\n${input.taskText}`,
      userAnswer: input.userAnswer,
      comment: input.comment,
    },
    userName ?? '',
    input.lang,
    { idempotencyKey },
  );
  console.log(`${LOG} result=${result} dataId=${dataId} ms=${Date.now() - startedAt}`); // guard-ok: итог отправки
  if (result === 'sent') reportedInThisProcess.add(idempotencyKey);
  return result;
}

export function resetLearningV2TaskReportsForTests(): void {
  reportedInThisProcess.clear();
}

export default function __RouteShim() { return null; }
