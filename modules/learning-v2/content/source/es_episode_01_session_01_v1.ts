import type { SessionSource } from './session_shard_from_source_v1';
import { ES_EPISODE_01_SESSION_01_INTRO } from './es_episode_01_session_01_intro_v1';
import { ES_EPISODE_01_SESSION_01_PHRASES } from './es_episode_01_session_01_phrases_v1';

/**
 * Испанский курс, эпизод 1 «Ser: какой и кто», сессия 1 «Это легко» —
 * собранный источник.
 *
 * Тема утверждена владельцем 2026-08-23 (docs/v2/SPANISH_CURRICULUM_GRID.ru.md).
 * Заменяет прежнюю версию про estar, которая по итогам ресерча (VanPatten
 * 1985/2010) стала уроками 8 (место) и 13 (состояние).
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
  canDoOutcomeId: 'obj-es-e01-evaluate-and-react',
  generationInputFingerprint: 'authored-es-e01-s01-v2',
  title: {
    ru: 'Это легко',
    uk: 'Це легко',
    es: 'Es fácil',
    en: 'It is easy',
    'pt-BR': 'É fácil',
    vi: 'Điều này dễ',
    id: 'Ini mudah',
    tr: 'Bu kolay',
    pl: 'To jest łatwe',
  },
  summary: {
    ru: 'Одно слово открывает любую оценку — легко, правда, важно.',
    uk: 'Одне слово відкриває будь-яку оцінку — легко, правда, важливо.',
    es: 'Una sola palabra abre cualquier juicio — fácil, verdad, importante.',
    en: 'One word opens any verdict — easy, true, important.',
    'pt-BR': 'Uma palavra abre qualquer veredito — fácil, verdade, importante.',
    vi: 'Một từ mở đầu mọi nhận định — dễ, đúng, quan trọng.',
    id: 'Satu kata membuka penilaian apa pun — mudah, benar, penting.',
    tr: 'Tek kelime her yargıyı açar — kolay, doğru, önemli.',
    pl: 'Jedno słowo otwiera każdy osąd — łatwe, prawda, ważne.',
  },
  learningGoal: {
    ru: 'Оценить что-то или кого-то, согласиться и возразить.',
    uk: 'Оцінити щось або когось, погодитися і заперечити.',
    es: 'Evaluar algo o a alguien, estar de acuerdo o no.',
    en: 'Evaluate something or someone, agree and disagree.',
    'pt-BR': 'Avaliar algo ou alguém, concordar e discordar.',
    vi: 'Đánh giá điều gì đó hoặc ai đó, đồng ý và không đồng ý.',
    id: 'Menilai sesuatu atau seseorang, setuju dan tidak setuju.',
    tr: 'Bir şeyi veya birini değerlendirmek, katılmak ve katılmamak.',
    pl: 'Ocenić coś lub kogoś, zgodzić się i nie zgodzić.',
  },
  introPages: ES_EPISODE_01_SESSION_01_INTRO,
  phrases: ES_EPISODE_01_SESSION_01_PHRASES,
});
