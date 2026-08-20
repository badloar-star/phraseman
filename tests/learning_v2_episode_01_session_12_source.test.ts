import { EPISODE_01_SESSION_12_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_12_v1';
import { assertAuthoredSessionContract } from '../modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1';

test('session 12 keeps self questions within introduced material', () => assertAuthoredSessionContract(EPISODE_01_SESSION_12_SOURCE, 12, 'phrases'));
