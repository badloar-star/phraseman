import {
  isV2OwnerEpisodeConfirmationV1,
  materializeV2OwnerEpisodeConfirmationV1,
  parseV2OwnerEpisodeConfirmationV1,
} from "./v2_owner_episode_confirmation_v1";
import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";

const hash = (value: string) => value.repeat(64);
const input = Object.freeze({
  planFingerprint: hash("a"),
  courseContractFingerprint: hash("b"),
  stageId: "v2s2:activity:episode-1",
  episodeId: "episode-1",
  ownerInputFingerprint: hash("c"),
  activityAssemblyFingerprint: hash("d"),
  stageReviewFingerprint: hash("e"),
  ownerIdentityFingerprint: hash("f"),
  confirmedAtIso: "2026-08-13T14:00:00.000Z",
  reason: "Owner reviewed all twelve sessions and confirms this exact draft.",
  contentClass: "production_candidate" as const,
});

describe("Learning V2 owner episode confirmation", () => {
  it("creates only an authority-free single-owner two-step confirmation", () => {
    const result = materializeV2OwnerEpisodeConfirmationV1(input);
    expect(result).toMatchObject({
      confirmationMode: "single_owner_explicit_two_step_confirmation",
      makerCheckerAuthority: "none_single_owner_mode",
      humanConfirmationAuthority: "unverified_structural_confirmation_claim",
      publicationDecisionAuthority: "none",
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(isV2OwnerEpisodeConfirmationV1(result)).toBe(true);
    expect(isV2OwnerEpisodeConfirmationV1({ ...result })).toBe(false);
  });

  it("deterministically binds the exact reviewed subject and reason", () => {
    const first = materializeV2OwnerEpisodeConfirmationV1(input);
    const second = materializeV2OwnerEpisodeConfirmationV1(input);
    expect(second.confirmationFingerprint).toBe(first.confirmationFingerprint);
    expect(
      materializeV2OwnerEpisodeConfirmationV1({
        ...input,
        reason: `${input.reason} Confirmed.`,
      }).confirmationFingerprint,
    ).not.toBe(first.confirmationFingerprint);
  });

  it("rehydrates only the exact canonical receipt against the same subject", () => {
    const receipt = materializeV2OwnerEpisodeConfirmationV1(input);
    expect(
      parseV2OwnerEpisodeConfirmationV1(canonicalJsonV1(receipt), input)
        .confirmationFingerprint,
    ).toBe(receipt.confirmationFingerprint);
    expect(() =>
      parseV2OwnerEpisodeConfirmationV1(canonicalJsonV1(receipt), {
        ...input,
        stageReviewFingerprint: hash("1"),
      }),
    ).toThrow("v2_owner_episode_confirmation_invalid");
  });

  it("blocks neutral fixtures from owner confirmation", () => {
    expect(() =>
      materializeV2OwnerEpisodeConfirmationV1({
        ...input,
        contentClass: "neutral_test_fixture",
      }),
    ).toThrow("v2_owner_episode_confirmation_invalid");
  });

  it.each([
    ["cross stage", { stageId: "../episode" }],
    ["control text", { reason: "Owner\u202e confirmation" }],
    ["invalid time", { confirmedAtIso: "2026-08-13" }],
    ["authority injection", { releaseAuthority: true }],
  ])("rejects %s", (_label, mutation) => {
    expect(() =>
      materializeV2OwnerEpisodeConfirmationV1({
        ...input,
        ...mutation,
      } as typeof input),
    ).toThrow("v2_owner_episode_confirmation_invalid");
  });

  it("invalidates the confirmation identity when the reviewed stage changes", () => {
    const first = materializeV2OwnerEpisodeConfirmationV1(input);
    const changed = materializeV2OwnerEpisodeConfirmationV1({
      ...input,
      stageReviewFingerprint: hash("1"),
    });
    expect(changed.confirmationFingerprint).not.toBe(
      first.confirmationFingerprint,
    );
  });
});
