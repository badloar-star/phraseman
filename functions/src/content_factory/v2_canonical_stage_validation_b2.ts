import type {
  V2B2BodyValidation,
  V2B2ValidationInput,
} from "./v2_canonical_stage_validation_b2_contract";
import { validateDialogue } from "./v2_canonical_stage_validation_b2_dialogue";
import { validateSceneSet } from "./v2_canonical_stage_validation_b2_scene";
import { validateSpeakingMission } from "./v2_canonical_stage_validation_b2_speaking";

export type {
  V2B2BodyValidation,
  V2B2CandidateView,
  V2B2ProvenanceRef,
  V2B2ValidationInput,
} from "./v2_canonical_stage_validation_b2_contract";

export function validateV2B2StageBody(
  input: V2B2ValidationInput,
): V2B2BodyValidation | null {
  if (input.stage.kind === "v2_scene_set") return validateSceneSet(input);
  if (input.stage.kind === "v2_dialogue_script") return validateDialogue(input);
  if (input.stage.kind === "v2_speaking_mission")
    return validateSpeakingMission(input);
  return null;
}
