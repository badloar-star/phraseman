// зачем (§126, баг «урок закрывается после 2–6 верных ответов и уходит на главную», iPhone iOS 26.7, Plus, 03.10): сперва логи,
// потом починка. Каждый выход с экрана урока пишет запись [LESSON-EXIT] с причиной и значением, решившим ветку; размонтирование
// без парной записи выхода = внешняя причина (router.replace из корневого лейаута, сброс навигации). Для пользователей из
// релиза запись уходит и в activity (при согласии на аналитику), в консоль — console.warn (log/info в release вырезаны).
import { trackActivity } from './app_activity';

export type LessonExitTraceData = Readonly<Record<string, string | number | boolean | null | undefined>>;

export function formatLessonExitTrace(reason: string, data: LessonExitTraceData): string {
  const parts = Object.entries(data).map(([key, value]) => `${key}=${String(value)}`);
  return `[LESSON-EXIT] ${reason} ${parts.join(' ')}`.trim();
}

export function traceLessonExit(reason: string, data: LessonExitTraceData = {}): void {
  console.warn(formatLessonExitTrace(reason, data));
  void trackActivity(`lesson:exit_trace`, {
    feature: 'navigation',
    screen: 'lesson1',
    result: 'info',
    writeToFirestore: true,
    tags: { reason, ...data },
  }).catch((error: unknown) => {
    console.warn('[LESSON-EXIT] trackActivity:catch', error instanceof Error ? error.message : String(error));
  });
}
