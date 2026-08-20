import { EPISODE_01_SESSION_16_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_16_v1';
import { assertAuthoredSessionContract } from '../modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1';

test('session 16 is a no-new-grammar checkpoint', () => assertAuthoredSessionContract(EPISODE_01_SESSION_16_SOURCE, 16, 'checkpoint'));
