import type { SessionSource } from "./session_shard_from_source_v1";

const SESSION_LOADERS: readonly (() => SessionSource)[] = Object.freeze([
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_01_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_01_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_02_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_02_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_03_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_03_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_04_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_04_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_05_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_05_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_06_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_06_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_07_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_07_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_08_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_08_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_09_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_09_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_10_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_10_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_11_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_11_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_12_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_12_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_13_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_13_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_14_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_14_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_15_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_15_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_16_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_16_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_17_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_17_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_18_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_18_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_19_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_19_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_20_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_20_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_21_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_21_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_22_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_22_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_23_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_23_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_24_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_24_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_25_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_25_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_26_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_26_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_27_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_27_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_28_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_28_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_29_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_29_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_30_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_30_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_31_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_31_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_32_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_32_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_33_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_33_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_34_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_34_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_35_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_35_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_36_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_36_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_37_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_37_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_38_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_38_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_39_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_39_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_40_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_40_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_41_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_41_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_42_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_42_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_43_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_43_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_44_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_44_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_45_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_45_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_46_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_46_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_47_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_47_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_48_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_48_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_49_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_49_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_50_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_50_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_51_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_51_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_52_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_52_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_53_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_53_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_54_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_54_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_55_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_55_SOURCE,
  () =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    (require("./episode_02_session_56_v1") as Record<string, SessionSource>)
      .EPISODE_02_SESSION_56_SOURCE,
]);

const loadedSources = new Map<number, SessionSource>();

/** Narrow Lesson 2 accessor: materializes only the requested authored source. */
export function authoredLearningV2Episode02SessionSource(
  ordinal: number,
): SessionSource | null {
  const cached = loadedSources.get(ordinal);
  if (cached) return cached;
  const loader = SESSION_LOADERS[ordinal - 1];
  if (!loader) return null;
  const source = loader();
  loadedSources.set(ordinal, source);
  return source;
}
