import type { LearningV2TelemetryDescriptor } from '../modules/learning-v2/telemetry';

/**
 * Транспорт телеметрии курса — точная копия паттерна Арены
 * (`app/arena_telemetry.ts`): ленивый импорт аналитики, ошибки глотаются.
 *
 * зачем: отправка статистики не имеет права ни задержать учебный экран, ни
 * уронить его. Поэтому никакого await на вызывающей стороне и никакого throw.
 */
export function trackLearningV2Telemetry(
  descriptor: LearningV2TelemetryDescriptor,
): void {
  void import('./analytics')
    .then(({ trackEvent }) => trackEvent(descriptor.event as never, descriptor.params as never))
    .catch(() => {});
}
