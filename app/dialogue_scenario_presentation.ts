import type { Lang } from '../constants/i18n';
import { aiDialogBriefingBody } from './ai_dialog_briefing_copy';
import {
  dialogScenarioGoal,
  dialogScenarioNextStepHint,
  dialogScenarioTitle,
  type DialogScenario,
} from './ai_dialog_scenarios';
import { DIALOGUE_LANGUAGE_PACKS } from './dialogue_language_packs';
import { resolveDialogueStudyTarget } from './dialogue_language_registry';

export type DialogueScenarioPresentation = Readonly<{
  title: string;
  goal: string;
  hint: string;
  briefing: string | null;
}>;

/** UI language chooses interface chrome, never the language of a native scene. */
export function dialogueScenarioPresentation(
  scenario: DialogScenario,
  studyTarget: unknown,
  interfaceLang: Lang,
): DialogueScenarioPresentation | null {
  const target = resolveDialogueStudyTarget(studyTarget);
  if (!target) return null;
  if (target === 'en') {
    return {
      title: dialogScenarioTitle(scenario, interfaceLang),
      goal: dialogScenarioGoal(scenario, interfaceLang),
      hint: dialogScenarioNextStepHint(scenario, interfaceLang),
      briefing: aiDialogBriefingBody(scenario.id, interfaceLang),
    };
  }
  const scenarios = DIALOGUE_LANGUAGE_PACKS[target]?.scenarios;
  const native = scenarios && Object.prototype.hasOwnProperty.call(scenarios, scenario.id)
    ? scenarios[scenario.id] : null;
  return native ? {
    // The legacy briefing replaces the goal/hint branch. A setting alone
    // would hide the actual learner task, so native scenes use goal + hint.
    title: native.title, goal: native.goal, hint: native.hint, briefing: null,
  } : null;
}

export default function DialoguePresentationRouteShim() { return null; }
