import { EPISODE_01_SESSION_11_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_11_v1';
import { assertAuthoredSessionContract } from '../modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1';

test('session 11 keeps the I/you inversion contract', () => assertAuthoredSessionContract(EPISODE_01_SESSION_11_SOURCE, 11, 'phrases', 'question_inversion'));
