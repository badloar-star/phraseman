import { EPISODE_01_SESSION_17_SOURCE } from '../modules/learning-v2/content/source/episode_01_session_17_v1';
import { assertEpisode01Session17To24Contract } from '../modules/learning-v2/content/source/episode_01_sessions_17_24_support_v1';

test('session 17 keeps the third-person pronouns and is contract', () => assertEpisode01Session17To24Contract(EPISODE_01_SESSION_17_SOURCE, 17, 'words_then_phrases', ['third_person_pronoun', 'third_person_singular']));
