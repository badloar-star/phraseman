import type { SessionSource } from './session_shard_from_source_v1';
import { ES_EPISODE_01_SESSION_01_INTRO } from './es_episode_01_session_01_intro_v1';
import { ES_EPISODE_01_SESSION_01_PHRASES } from './es_episode_01_session_01_phrases_v1';

/**
 * Испанский курс, эпизод 1, сессия 1 — собранный источник.
 *
 * Отдельный packageId и targetLanguage: 'es' — это то, что делает контур
 * независимым. Английский курс использует 'learning-v2-en-v1'/'en' и о
 * существовании этого файла не знает.
 *
 * Тип сессии — `phrases` (позиция 1 в главе, «новое» по ритму главы из
 * docs/v2/LESSON_DESIGN_RULES.ru.md правило 8). Слоты 1-3 привязаны к
 * вопросам интро, 4-15 — практика.
 */
export const ES_EPISODE_01_SESSION_01_SOURCE: SessionSource = Object.freeze({
  packageId: 'learning-v2-es-v1',
  targetLanguage: 'es',
  episodeOrdinal: 1,
  requiredSessionOrdinal: 1,
  canDoOutcomeId: 'obj-es-e01-say-how-i-am',
  generationInputFingerprint: 'authored-es-e01-s01-v1',
  title: {
    ru: 'Как дела и где ты',
    uk: 'Як справи і де ти',
    es: '¿Cómo estás?',
    en: 'How you are and where you are',
    'pt-BR': 'Como você está e onde está',
    vi: 'Bạn thế nào và đang ở đâu',
    id: 'Apa kabar dan di mana kamu',
    tr: 'Nasılsın ve neredesin',
    pl: 'Jak się masz i gdzie jesteś',
  },
  summary: {
    ru: 'Одно слово отвечает и на «как ты», и на «где ты».',
    uk: 'Одне слово відповідає і на «як ти», і на «де ти».',
    es: 'Una sola palabra responde cómo estás y dónde estás.',
    en: 'One word answers both how you are and where you are.',
    'pt-BR': 'Uma palavra responde como você está e onde está.',
    vi: 'Một từ trả lời cả “bạn thế nào” và “bạn ở đâu”.',
    id: 'Satu kata menjawab “apa kabar” sekaligus “di mana kamu”.',
    tr: 'Tek kelime hem nasıl olduğunu hem nerede olduğunu söyler.',
    pl: 'Jedno słowo odpowiada i jak się masz, i gdzie jesteś.',
  },
  learningGoal: {
    ru: 'Сказать о своём состоянии и месте, спросить об этом собеседника.',
    uk: 'Сказати про свій стан і місце, запитати про це співрозмовника.',
    es: 'Decir cómo estás y dónde estás, y preguntárselo a otra persona.',
    en: 'Say how and where you are, and ask the other person the same.',
    'pt-BR': 'Dizer como e onde você está, e perguntar o mesmo à outra pessoa.',
    vi: 'Nói bạn thế nào và đang ở đâu, và hỏi người khác điều đó.',
    id: 'Mengatakan keadaan dan tempat Anda, serta menanyakannya kepada lawan bicara.',
    tr: 'Nasıl ve nerede olduğunuzu söylemek, aynısını karşınızdakine sormak.',
    pl: 'Powiedzieć, jak i gdzie jesteś, i zapytać o to rozmówcę.',
  },
  introPages: ES_EPISODE_01_SESSION_01_INTRO,
  phrases: ES_EPISODE_01_SESSION_01_PHRASES,
});
