import { buildEpisode01Session17To24 } from './episode_01_sessions_17_24_support_v1';
import {
  EPISODE_01_SESSION_18_EDITORIAL_INTRO_V1,
  EPISODE_01_SESSION_18_EDITORIAL_RUNS_V1,
} from './episode_01_session_18_editorial_intro_v1';

const base = buildEpisode01Session17To24(18);

export const EPISODE_01_SESSION_18_SOURCE = Object.freeze({
  ...base,
  introPages: Object.freeze(
    base.introPages.map((page, index) => Object.freeze({
      ...page,
      body: EPISODE_01_SESSION_18_EDITORIAL_INTRO_V1[index]!,
      bodyRuns: EPISODE_01_SESSION_18_EDITORIAL_RUNS_V1[index]!,
    })),
  ),
});
