import { buildEpisode01Session11To16 } from './episode_01_sessions_11_16_support_v1';
import {
  EPISODE_01_SESSION_16_EDITORIAL_INTRO_V1,
  EPISODE_01_SESSION_16_EDITORIAL_RUNS_V1,
} from './episode_01_session_16_editorial_intro_v1';

const base = buildEpisode01Session11To16(16);

export const EPISODE_01_SESSION_16_SOURCE = Object.freeze({
  ...base,
  introPages: Object.freeze(
    base.introPages.map((page, index) =>
      Object.freeze({
        ...page,
        body: EPISODE_01_SESSION_16_EDITORIAL_INTRO_V1[index]!,
        bodyRuns: EPISODE_01_SESSION_16_EDITORIAL_RUNS_V1[index]!,
      }),
    ),
  ),
});
