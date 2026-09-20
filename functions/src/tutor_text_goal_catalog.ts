import {
  MAX_TEXT_LANGS,
  canDoGoalById,
  pickNextGoal,
  type CanDoGoal,
  type CanDoLevel,
  type CanDoMastery,
  type LocalizedMaxText,
} from './max_voice_can_do_goals';
import type { DialogueStudyTarget } from './dialogue_ai_language_contract';

export type NativeTutorStudyTarget = Exclude<DialogueStudyTarget, 'en'>;

export interface TutorNativeGoalDescriptor {
  goalId: string;
  level: CanDoLevel;
  label: string;
}

const IDS: readonly [string, CanDoLevel][] = [
  ['a1_greet', 'A1'], ['a1_intro', 'A1'], ['a1_order_cafe', 'A1'], ['a1_directions', 'A1'],
  ['a2_plans', 'A2'], ['a2_invite', 'A2'], ['a2_restaurant', 'A2'], ['a2_doctor', 'A2'],
  ['b1_complain_polite', 'B1'], ['b1_job_interview', 'B1'], ['b1_explain_problem', 'B1'], ['b1_small_talk_pro', 'B1'],
  ['b2_nuanced_opinion', 'B2'], ['b2_negotiate', 'B2'], ['b2_meeting', 'B2'], ['b2_resolve_misunderstanding', 'B2'],
];

const LABELS: Record<NativeTutorStudyTarget, readonly string[]> = {
  es: ['Saludar y despedirse', 'Presentarse', 'Pedir en una cafetería', 'Pedir indicaciones', 'Hablar de planes', 'Invitar y responder a una invitación', 'Pedir en un restaurante', 'Hablar con el médico', 'Quejarse con cortesía', 'Participar en una entrevista de trabajo', 'Explicar un problema', 'Mantener una conversación informal', 'Expresar una opinión matizada', 'Llegar a un acuerdo', 'Dirigir una reunión', 'Resolver un malentendido'],
  fr: ['Dire bonjour et au revoir', 'Se présenter', 'Commander dans un café', 'Demander son chemin', 'Parler de ses projets', 'Inviter quelqu’un et répondre à une invitation', 'Commander un repas', 'Parler avec le médecin', 'Se plaindre poliment', 'Participer à un entretien d’embauche', 'Expliquer un problème', 'Tenir une conversation informelle', 'Exprimer une opinion nuancée', 'Trouver un compromis', 'Diriger une réunion', 'Résoudre un malentendu'],
  de: ['Jemanden begrüßen und sich verabschieden', 'Sich vorstellen', 'In einem Café bestellen', 'Nach dem Weg fragen', 'Über Pläne sprechen', 'Jemanden einladen und auf eine Einladung reagieren', 'Im Restaurant bestellen', 'Mit der Ärztin oder dem Arzt sprechen', 'Sich höflich beschweren', 'An einem Vorstellungsgespräch teilnehmen', 'Ein Problem erklären', 'Ein lockeres Gespräch führen', 'Eine differenzierte Meinung äußern', 'Einen Kompromiss finden', 'Eine Besprechung leiten', 'Ein Missverständnis klären'],
};

function descriptors(target: NativeTutorStudyTarget): readonly TutorNativeGoalDescriptor[] {
  return Object.freeze(IDS.map(([goalId, level], index) => Object.freeze({ goalId, level, label: LABELS[target][index] })));
}

export const TUTOR_NATIVE_GOAL_CATALOG: Readonly<Record<NativeTutorStudyTarget, readonly TutorNativeGoalDescriptor[]>> = Object.freeze({
  es: descriptors('es'), fr: descriptors('fr'), de: descriptors('de'),
});

export function tutorNativeGoalDescriptor(goalId: string, target: NativeTutorStudyTarget): TutorNativeGoalDescriptor | undefined {
  return TUTOR_NATIVE_GOAL_CATALOG[target].find((row) => row.goalId === goalId);
}

export function projectTutorGoalTitle(goalId: string, target: DialogueStudyTarget): LocalizedMaxText {
  const goal = canDoGoalById(goalId);
  if (!goal) throw new Error('tutor_goal_unknown');
  if (target === 'en') return goal.title;
  const descriptor = tutorNativeGoalDescriptor(goalId, target);
  if (!descriptor) throw new Error('tutor_goal_not_allowed_for_target');
  return Object.fromEntries(MAX_TEXT_LANGS.map((lang) => [lang, descriptor.label])) as unknown as LocalizedMaxText;
}

export function tutorGoalForTargetById(goalId: string, target: DialogueStudyTarget): CanDoGoal | undefined {
  const goal = canDoGoalById(goalId);
  if (!goal || (target !== 'en' && !tutorNativeGoalDescriptor(goalId, target))) return undefined;
  return target === 'en' ? goal : { ...goal, title: projectTutorGoalTitle(goalId, target) };
}

export function pickTutorGoalForTarget(
  mastery: CanDoMastery,
  level: string,
  target: DialogueStudyTarget,
  requestedGoalId = '',
): CanDoGoal | null {
  const requested = tutorGoalForTargetById(requestedGoalId, target);
  if (requested) return requested;
  if (target === 'en') return pickNextGoal(mastery, level);
  const levels: readonly CanDoLevel[] = ['A1', 'A2', 'B1', 'B2'];
  const start = Math.max(0, levels.indexOf(level as CanDoLevel));
  const allowed = TUTOR_NATIVE_GOAL_CATALOG[target];
  for (let index = start; index < levels.length; index += 1) {
    const row = allowed.find((candidate) => candidate.level === levels[index] && (mastery[candidate.goalId] ?? 0) < 3);
    if (row) return tutorGoalForTargetById(row.goalId, target) ?? null;
  }
  const revisit = allowed.find((row) => row.level === levels[start]) ?? allowed[0];
  return revisit ? tutorGoalForTargetById(revisit.goalId, target) ?? null : null;
}
