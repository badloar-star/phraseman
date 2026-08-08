import { inspectSourceRegistryCoverage, validateSourceRegistry, type SourceRegistry } from './source_registry';

export function buildLessonOutlineGrounding(registry: SourceRegistry, lessonId: number) {
  const validation = validateSourceRegistry(registry);
  if (!validation.ok) throw new Error(`source_registry_invalid:${validation.errors.join(',')}`);
  if (!inspectSourceRegistryCoverage(registry, [lessonId]).ok) throw new Error('lesson_blueprint_missing');
  const blueprintLesson = registry.lessons[String(lessonId)];
  return Object.freeze({ registryId: `${registry.blueprintId}:${registry.version}`, blueprintHash: registry.blueprintHash, blueprintLesson, evidenceIds: Object.freeze(registry.evidence.map((item) => item.evidenceId).sort()) });
}
