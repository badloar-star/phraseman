import { EPISODE_01_SESSION_13_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_13_v1';
import { assertAuthoredSessionContract } from '../modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1';

test('session 13 practises only the you are contraction', () => assertAuthoredSessionContract(EPISODE_01_SESSION_13_SOURCE, 13, 'phrases', 'contraction_youre'));
