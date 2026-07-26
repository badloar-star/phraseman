export const V2_IDENTITY_PATTERN = "^[A-Za-z0-9._-]{1,160}$" as const;
export const V2_IDENTITY_REGEX = Object.freeze(new RegExp(V2_IDENTITY_PATTERN));

declare const V2_IDENTITY_BRAND: unique symbol;

type V2Identity<Kind extends string> = string & {
  readonly [V2_IDENTITY_BRAND]: Kind;
};

export type CourseId = V2Identity<"CourseId">;
export type SeasonId = V2Identity<"SeasonId">;
export type EpisodeId = V2Identity<"EpisodeId">;
export type SessionId = V2Identity<"SessionId">;
export type NodeId = V2Identity<"NodeId">;
export type ActivityId = V2Identity<"ActivityId">;
export type SkillId = V2Identity<"SkillId">;
export type ReleaseId = V2Identity<"ReleaseId">;

export const V2_IDENTITY_ERROR_CODES = Object.freeze({
  course: "invalid_course_id",
  season: "invalid_season_id",
  episode: "invalid_episode_id",
  node: "invalid_node_id",
  activity: "invalid_activity_id",
  skill: "invalid_skill_id",
  release: "invalid_release_id",
  duplicateActivityWithinRelease: "duplicate_activity_id_within_release",
} as const);

export type V2IdentityErrorCode =
  | (typeof V2_IDENTITY_ERROR_CODES)[keyof typeof V2_IDENTITY_ERROR_CODES]
  | typeof V2_SESSION_ID_ERROR_CODE;

export const V2_SESSION_ID_ERROR_CODE = "invalid_session_id" as const;

export class V2IdentityError extends Error {
  constructor(readonly code: V2IdentityErrorCode) {
    super(code);
    this.name = "V2IdentityError";
  }
}

const isValidV2Identity = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = V2_IDENTITY_REGEX.exec(value);
  return match?.[0] === value;
};

const parseIdentity = <Identity extends string>(
  value: unknown,
  code: V2IdentityErrorCode,
): Identity => {
  if (!isValidV2Identity(value)) throw new V2IdentityError(code);
  return value as Identity;
};

export const isCourseId = (value: unknown): value is CourseId =>
  isValidV2Identity(value);
export const isSeasonId = (value: unknown): value is SeasonId =>
  isValidV2Identity(value);
export const isEpisodeId = (value: unknown): value is EpisodeId =>
  isValidV2Identity(value);
export const isSessionId = (value: unknown): value is SessionId =>
  isValidV2Identity(value);
export const isNodeId = (value: unknown): value is NodeId =>
  isValidV2Identity(value);
export const isActivityId = (value: unknown): value is ActivityId =>
  isValidV2Identity(value);
export const isSkillId = (value: unknown): value is SkillId =>
  isValidV2Identity(value);
export const isReleaseId = (value: unknown): value is ReleaseId =>
  isValidV2Identity(value);

export const parseCourseId = (value: unknown): CourseId =>
  parseIdentity<CourseId>(value, V2_IDENTITY_ERROR_CODES.course);
export const parseSeasonId = (value: unknown): SeasonId =>
  parseIdentity<SeasonId>(value, V2_IDENTITY_ERROR_CODES.season);
export const parseEpisodeId = (value: unknown): EpisodeId =>
  parseIdentity<EpisodeId>(value, V2_IDENTITY_ERROR_CODES.episode);
export const parseSessionId = (value: unknown): SessionId =>
  parseIdentity<SessionId>(value, V2_SESSION_ID_ERROR_CODE);
export const parseNodeId = (value: unknown): NodeId =>
  parseIdentity<NodeId>(value, V2_IDENTITY_ERROR_CODES.node);
export const parseActivityId = (value: unknown): ActivityId =>
  parseIdentity<ActivityId>(value, V2_IDENTITY_ERROR_CODES.activity);
export const parseSkillId = (value: unknown): SkillId =>
  parseIdentity<SkillId>(value, V2_IDENTITY_ERROR_CODES.skill);
export const parseReleaseId = (value: unknown): ReleaseId =>
  parseIdentity<ReleaseId>(value, V2_IDENTITY_ERROR_CODES.release);

export const assertUniqueActivityIdsWithinRelease = (
  releaseId: ReleaseId,
  ids: readonly ActivityId[],
): void => {
  parseReleaseId(releaseId);

  const seen = new Set<string>();
  for (const candidate of ids) {
    const activityId = parseActivityId(candidate);
    if (seen.has(activityId)) {
      throw new V2IdentityError(
        V2_IDENTITY_ERROR_CODES.duplicateActivityWithinRelease,
      );
    }
    seen.add(activityId);
  }
};
