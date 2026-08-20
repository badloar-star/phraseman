import { EPISODE_01_SESSION_14_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_14_v1';
import { assertAuthoredSessionContract } from '../modules/learning-v2/content/source/episode_01_sessions_11_16_support_v1';

test('session 14 introduces locations only as complete complements', () => assertAuthoredSessionContract(EPISODE_01_SESSION_14_SOURCE, 14, 'words_then_phrases', 'place_noun'));
