import {
  DIALOGUE_V2_STUDY_TARGETS,
  type DialogueV2StudyTarget,
} from './dialogue_v2_language_pack_contract';

export type DialogueV2FreeformSelection = Readonly<{
  studyTarget: DialogueV2StudyTarget;
}>;

/**
 * Parses the complete public selection for a Dialogue V2 freeform thread.
 * Everything else (identity, entitlement, persona, memory and model inputs)
 * is server authority and cannot be selected at this boundary.
 */
export function parseDialogueV2FreeformSelection(
  value: unknown,
): DialogueV2FreeformSelection | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 1 || keys[0] !== 'studyTarget') return null;
    const studyTarget = descriptors.studyTarget;
    if (!studyTarget?.enumerable
      || !('value' in studyTarget)
      || typeof studyTarget.value !== 'string'
      || !(DIALOGUE_V2_STUDY_TARGETS as readonly string[]).includes(studyTarget.value)) {
      return null;
    }
    return Object.freeze({ studyTarget: studyTarget.value as DialogueV2StudyTarget });
  } catch {
    return null;
  }
}
