import { EPISODE_01_SESSION_15_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_15_v1';
import { assertAuthoredSessionContract } from '../modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1';

test('session 15 is spoken recall for I and you only', () => assertAuthoredSessionContract(EPISODE_01_SESSION_15_SOURCE, 15, 'voice'));
