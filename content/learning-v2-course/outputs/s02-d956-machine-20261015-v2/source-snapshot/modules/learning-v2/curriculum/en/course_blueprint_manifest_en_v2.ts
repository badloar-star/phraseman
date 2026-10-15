import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 } from "./course_blueprint_en_v2";

const blueprint = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2;

export const LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2 = Object.freeze({
  schemaVersion: blueprint.schemaVersion,
  fingerprint: blueprint.blueprintFingerprint,
  ownerApproval: blueprint.ownerApproval,
  lessonCount: blueprint.scope.lessons.length,
  chapterCount: blueprint.chapters.length,
  sessionPacketCount: blueprint.sessionPackets.length,
  introPlanItemCount: blueprint.sessionPackets.reduce((sum, packet) => sum + packet.introPlan.length, 0),
  activityPlanItemCount: blueprint.sessionPackets.reduce((sum, packet) => sum + packet.activityPlan.length, 0),
});
