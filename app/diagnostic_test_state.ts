/**
 * Сессионный peek-кеш чисел готовности к экзамену для экрана диагностики
 * (app/diagnostic_test.tsx). Без него examLessonsDone/examReadiness.percent
 * стартуют с 0 (useState(0)) и после AsyncStorage-подгрузки «прыгают» на
 * реальное значение — видимый скачок на первом кадре. Кешируем последний
 * известный снимок в модульной переменной (переживает ремаунты экрана в
 * рамках одного JS-процесса, как peekHomeScreenHydration/peekEnergy) и читаем
 * её синхронно в useState-инициализаторах. Если кеша ещё нет (первый показ
 * экрана в этом процессе) — отдаём null, и экран рисует скелетон вместо числа
 * вместо ложного нуля.
 */
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type DiagnosticReadinessPeek = {
  examLessonsDone: number;
  examReadinessPercent: number;
};

let peekByTarget: Partial<Record<string, DiagnosticReadinessPeek>> = {};

export function peekDiagnosticReadiness(studyTarget?: RuntimeStudyTarget): DiagnosticReadinessPeek | null {
  return peekByTarget[storageStudyTarget(studyTarget)] ?? null;
}

export function rememberDiagnosticExamLessonsDone(done: number, studyTarget?: RuntimeStudyTarget): void {
  const key = storageStudyTarget(studyTarget);
  const current = peekByTarget[key];
  peekByTarget[key] = { examLessonsDone: done, examReadinessPercent: current?.examReadinessPercent ?? 0 };
}

export function rememberDiagnosticExamReadinessPercent(percent: number, studyTarget?: RuntimeStudyTarget): void {
  const key = storageStudyTarget(studyTarget);
  const current = peekByTarget[key];
  peekByTarget[key] = { examLessonsDone: current?.examLessonsDone ?? 0, examReadinessPercent: percent };
}

/* expo-router: не регистрировать утилиту как экран */
export default function __DiagnosticTestStateRouteShim() {
  return null;
}
