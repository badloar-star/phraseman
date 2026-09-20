import { getScenarioById, type DialogScenario } from './ai_dialog_scenarios';
import { DIALOGUE_LANGUAGE_PACKS } from './dialogue_language_packs';
import { resolveDialogueStudyTarget } from './dialogue_language_registry';

/** Resolve before mounting any component that owns energy/network effects. */
export function resolveDialogueRouteScenario(
  params: { scenarioId?: unknown; lessonId?: unknown },
  rawTarget: unknown,
  buildLesson?: (lessonId: number) => DialogScenario | null,
): DialogScenario | null {
  const target = resolveDialogueStudyTarget(rawTarget);
  if (!target || typeof params.scenarioId !== 'string') return null;
  const id = params.scenarioId.trim();
  if (!id) return null;
  let scenario = getScenarioById(id);
  if (!scenario && target === 'en' && typeof params.lessonId === 'string' && /^[1-9]\d*$/.test(params.lessonId)) {
    const lesson = buildLesson?.(Number(params.lessonId));
    if (lesson?.id === id) scenario = lesson;
  }
  if (!scenario || !scenario.active) return null;
  if (target !== 'en' && !Object.prototype.hasOwnProperty.call(DIALOGUE_LANGUAGE_PACKS[target]?.scenarios ?? {}, id)) return null;
  return scenario;
}

export default function DialogueRouteScenarioShim() { return null; }
