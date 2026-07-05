/**
 * «Разговорный клуб» — каталог голосовых миссий (specs/speaking-club.md).
 * Волна 1: Акт I «Разминка» — миссии 1–8 поверх грамматики уроков 1–8 (A1).
 * Миссия N открывается после прохождения урока N; целевые фразы берутся из
 * контента урока в рантайме (missionTargetPhrases), а не дублируются здесь.
 *
 * Сервер контента не знает (как в диалогах): role/setting/persona/goalEn/
 * objectives/targetPhrases клиент шлёт в speakingClubSend сам.
 */
import { getCourseLevelForLesson, type CourseLevel } from './course_levels';
import { getLessonData } from './lesson_data_all';
import type { DialogObjective, DialogTemperament } from './ai_dialog_scenarios';
import type { RuntimeStudyTarget } from './target_storage_keys';

export const CLUB_ACT1_MISSION_COUNT = 8;

/** Сколько фраз урока миссия требует произнести (спека §2: 3–4). */
export const MISSION_TARGET_PHRASE_COUNT = 3;

/** Фразы длиннее этого в устной миссии неудобны — берём следующую по списку. */
const MAX_SPEAKABLE_PHRASE_CHARS = 60;

export interface ClubMission {
  id: string;
  lessonId: number;
  icon: string;
  titleRu: string;
  titleUk: string;
  goalRu: string;
  goalUk: string;
  /** Роль/сеттинг/персона — формат scenario-промпта движка диалогов. */
  role: string;
  setting: string;
  persona: string;
  goalEn: string;
  /** Сценарные под-цели (фразовые phrase_N добавляются отдельно в рантайме). */
  objectives: DialogObjective[];
  temperament: DialogTemperament;
}

export function missionCefr(mission: ClubMission): CourseLevel {
  return getCourseLevelForLesson(mission.lessonId);
}

/**
 * Акт I: тёплые управляемые разминки. Персонажи ведут разговор сами и терпят
 * всё (patience high/warm) — это первые голосовые шаги ученика 40+/50+.
 */
export const CLUB_MISSIONS: readonly ClubMission[] = [
  {
    id: 'club_1',
    lessonId: 1,
    icon: '👋',
    titleRu: 'Новый сосед',
    titleUk: 'Новий сусід',
    goalRu: 'Познакомься: скажи, кто ты, откуда и чем занимаешься',
    goalUk: 'Познайомся: скажи, хто ти, звідки і чим займаєшся',
    role: 'a friendly new neighbour',
    setting: 'the hallway of your apartment building, you just met your new neighbour',
    persona: 'Your name is Emma. You just moved in, you are warm and a little chatty, and you love meeting new people.',
    goalEn: 'introduce yourself: say who you are, where you are from and what you do',
    objectives: [
      { id: 'greet_introduce', labelRu: 'Поздороваться и представиться', en: 'greet the neighbour and say your name' },
      { id: 'say_origin', labelRu: 'Сказать, откуда ты', en: 'say where you are from' },
    ],
    temperament: { patience: 'high', warmth: 'warm' },
  },
  {
    id: 'club_2',
    lessonId: 2,
    icon: '🎭',
    titleRu: 'Угадай, кто я',
    titleUk: 'Вгадай, хто я',
    goalRu: 'Игра: задавай вопросы «Are you…?» и отвечай «I’m not…»',
    goalUk: 'Гра: став питання «Are you…?» і відповідай «I’m not…»',
    role: 'a playful quiz host running a guessing game',
    setting: 'a fun radio guessing game: the host pretends to be a famous profession and the learner guesses',
    persona: 'Your name is Max. You are a cheerful game host: you picked a secret everyday profession (like a cook or a driver) and the learner must guess it with yes/no questions.',
    goalEn: 'ask several "Are you...?" questions to guess the secret profession, and answer the host\'s questions with "I am" / "I\'m not"',
    objectives: [
      { id: 'ask_are_you', labelRu: 'Задать вопрос «Are you…?»', en: 'ask at least one "Are you...?" question' },
      { id: 'guess_answer', labelRu: 'Угадать, кто ведущий', en: 'guess the host\'s secret profession' },
    ],
    temperament: { patience: 'high', warmth: 'warm' },
  },
  {
    id: 'club_3',
    lessonId: 3,
    icon: '🎙️',
    titleRu: 'Мой обычный день',
    titleUk: 'Мій звичайний день',
    goalRu: 'Расскажи подкастеру о своём обычном дне',
    goalUk: 'Розкажи подкастеру про свій звичайний день',
    role: 'a curious podcast host interviewing an interesting guest',
    setting: 'a cozy podcast studio, an episode about how ordinary people spend their day',
    persona: 'Your name is Lily. You host a small podcast about everyday life and you are genuinely curious about your guest\'s daily routine.',
    goalEn: 'tell the host about your usual day: when you get up, what you do, what you like',
    objectives: [
      { id: 'morning', labelRu: 'Рассказать про утро', en: 'say what you do in the morning' },
      { id: 'like_activity', labelRu: 'Назвать любимое занятие', en: 'say one thing you like or love doing' },
    ],
    temperament: { patience: 'high', warmth: 'warm' },
  },
  {
    id: 'club_4',
    lessonId: 4,
    icon: '☕',
    titleRu: 'Мы такие разные',
    titleUk: 'Ми такі різні',
    goalRu: 'Сравни привычки с коллегой: чего ты НЕ делаешь',
    goalUk: 'Порівняй звички з колегою: чого ти НЕ робиш',
    role: 'a friendly new colleague on a coffee break',
    setting: 'the office kitchen during a coffee break, you are getting to know each other\'s habits',
    persona: 'Your name is Tom. You are an easy-going colleague who loves comparing habits: you drink a lot of coffee, you don\'t watch TV, and you find differences funny.',
    goalEn: 'compare daily habits: say at least two things you don\'t do, and react to the colleague\'s habits',
    objectives: [
      { id: 'dont_habit', labelRu: 'Сказать, чего ты не делаешь', en: 'say something you don\'t do using don\'t/doesn\'t' },
      { id: 'ask_habit', labelRu: 'Спросить про привычку коллеги', en: 'ask the colleague about one of their habits' },
    ],
    temperament: { patience: 'high', warmth: 'warm' },
  },
  {
    id: 'club_5',
    lessonId: 5,
    icon: '🚆',
    titleRu: 'Попутчик в поезде',
    titleUk: 'Попутник у потязі',
    goalRu: 'Разговори попутчика: задавай вопросы «Do you…?»',
    goalUk: 'Розговори попутника: став питання «Do you…?»',
    role: 'a friendly traveller sitting next to the learner on a train',
    setting: 'a long train ride, two passengers passing the time with small talk',
    persona: 'Your name is Anna. You are a relaxed traveller with many hobbies (books, cooking, walking). You enjoy answering questions but you also ask some back.',
    goalEn: 'keep the small talk going by asking the traveller several "Do you...?" questions about hobbies and life',
    objectives: [
      { id: 'ask_do_you', labelRu: 'Задать два вопроса «Do you…?»', en: 'ask at least two "Do you...?" questions' },
      { id: 'answer_back', labelRu: 'Ответить на встречный вопрос', en: 'answer one of the traveller\'s questions about yourself' },
    ],
    temperament: { patience: 'high', warmth: 'warm' },
  },
  {
    id: 'club_6',
    lessonId: 6,
    icon: '🗺️',
    titleRu: 'Расспроси гида',
    titleUk: 'Розпитай гіда',
    goalRu: 'Узнай у гида всё: What? Where? When?',
    goalUk: 'Дізнайся в гіда все: What? Where? When?',
    role: 'a local city guide meeting a tourist',
    setting: 'the central square of a beautiful old town, the start of a walking tour',
    persona: 'Your name is Diego. You are a proud local guide who knows every street. You answer briefly and warmly and love good questions.',
    goalEn: 'ask the guide several wh-questions (what, where, when, how) about the town, food and places to see',
    objectives: [
      { id: 'ask_where', labelRu: 'Спросить «Where…?» про место', en: 'ask a "Where...?" question about a place' },
      { id: 'ask_what_when', labelRu: 'Спросить «What…?» или «When…?»', en: 'ask a "What...?" or "When...?" question' },
    ],
    temperament: { patience: 'high', warmth: 'warm' },
  },
  {
    id: 'club_7',
    lessonId: 7,
    icon: '🧳',
    titleRu: 'Собираем чемодан',
    titleUk: 'Збираємо валізу',
    goalRu: 'Обсуди с другом, что у вас есть для поездки',
    goalUk: 'Обговори з другом, що у вас є для поїздки',
    role: 'a travel buddy packing for a weekend trip together',
    setting: 'your friend\'s living room the evening before a short trip, two open suitcases',
    persona: 'Your name is Sam. You are a slightly disorganized but cheerful friend: you always forget things and keep checking what you both have.',
    goalEn: 'discuss what you have and what you don\'t have for the trip using "I have" / "I don\'t have"',
    objectives: [
      { id: 'say_have', labelRu: 'Сказать, что у тебя есть', en: 'say at least two things you have' },
      { id: 'say_missing', labelRu: 'Сказать, чего у тебя нет', en: 'say one thing you don\'t have' },
    ],
    temperament: { patience: 'high', warmth: 'warm' },
  },
  {
    id: 'club_8',
    lessonId: 8,
    icon: '📅',
    titleRu: 'Договоримся о встрече',
    titleUk: 'Домовимось про зустріч',
    goalRu: 'Найди с другом время: on Monday, at seven, in the morning',
    goalUk: 'Знайди з другом час: on Monday, at seven, in the morning',
    role: 'an old friend trying to schedule a coffee meetup',
    setting: 'a phone call: two friends with busy weeks trying to find a time to meet',
    persona: 'Your name is Kate. You are a warm but busy friend: several evenings are taken, so you suggest and reject times until one fits.',
    goalEn: 'agree on a day and time to meet, using time prepositions like "on Monday", "at seven", "in the evening"',
    objectives: [
      { id: 'suggest_time', labelRu: 'Предложить день и время', en: 'suggest a specific day and time to meet' },
      { id: 'confirm_meet', labelRu: 'Подтвердить встречу', en: 'confirm the final day and time' },
    ],
    temperament: { patience: 'high', warmth: 'warm' },
  },
];

export function getClubMissionById(id: string): ClubMission | null {
  return CLUB_MISSIONS.find((m) => m.id === id) ?? null;
}

export function getClubMissionForLesson(lessonId: number): ClubMission | null {
  return CLUB_MISSIONS.find((m) => m.lessonId === lessonId) ?? null;
}

/** Текст фразы урока на ИЗУЧАЕМОМ языке (en → english, fr → french). */
function phraseTargetText(phrase: { english?: string; french?: string }, studyTarget?: RuntimeStudyTarget): string {
  const raw = studyTarget === 'fr' ? phrase.french : phrase.english;
  return String(raw ?? '').trim();
}

/**
 * Целевые фразы миссии — из контента урока в рантайме (без дублей в каталоге).
 * Берём первые MISSION_TARGET_PHRASE_COUNT «говоримых» фраз (короче
 * MAX_SPEAKABLE_PHRASE_CHARS); если коротких не хватило — добираем любыми.
 */
export function missionTargetPhrases(lessonId: number, studyTarget?: RuntimeStudyTarget): string[] {
  const all = getLessonData(lessonId)
    .map((phrase) => phraseTargetText(phrase, studyTarget))
    .filter(Boolean);
  const speakable = all.filter((p) => p.length <= MAX_SPEAKABLE_PHRASE_CHARS);
  const pool = speakable.length >= MISSION_TARGET_PHRASE_COUNT ? speakable : all;
  return pool.slice(0, MISSION_TARGET_PHRASE_COUNT);
}

/**
 * Полный список под-целей миссии для игрового конверта: сценарные + фразовые
 * `phrase_N` (сервер отмечает их в objectivesMet, когда ученик произнёс фразу).
 * Сервер режет objectives до 6 — 2 сценарных + 3 фразовых укладываются.
 */
export function buildMissionObjectives(mission: ClubMission, targetPhrases: string[]): DialogObjective[] {
  const phraseObjectives: DialogObjective[] = targetPhrases.map((phrase, i) => ({
    id: `phrase_${i + 1}`,
    labelRu: `Сказать: «${phrase}»`,
    en: `say the phrase "${phrase}" (or a very close variant)`,
  }));
  return [...mission.objectives, ...phraseObjectives];
}

/** Нормализация для локальной проверки «фраза прозвучала» (страховка конверта). */
function normalizeSpokenText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Локальная проверка: произнёс ли ученик фразу урока (подстрока по
 * нормализованному тексту его реплик). Дублирует серверный objectivesMet —
 * фраза защитана, если сработал ЛЮБОЙ из двух сигналов.
 */
export function didLearnerSayPhrase(userTurns: string[], phrase: string): boolean {
  const target = normalizeSpokenText(phrase);
  if (!target) return false;
  return userTurns.some((turn) => normalizeSpokenText(turn).includes(target));
}

export interface MissionStarsInput {
  /** Миссия дошла до финала (терминальный исход или ручное «Завершить» после ≥4 реплик). */
  completed: boolean;
  phrasesUsed: number;
  phrasesTotal: number;
  scenarioObjectivesMet: number;
  scenarioObjectivesTotal: number;
}

/**
 * Звёзды миссии (0–3): 1 — дошёл до финала; +1 — все фразы урока прозвучали;
 * +1 — все сценарные под-цели выполнены. Детеминированно и без сети.
 */
export function computeMissionStars(input: MissionStarsInput): number {
  if (!input.completed) return 0;
  let stars = 1;
  if (input.phrasesTotal > 0 && input.phrasesUsed >= input.phrasesTotal) stars += 1;
  if (input.scenarioObjectivesTotal > 0 && input.scenarioObjectivesMet >= input.scenarioObjectivesTotal) stars += 1;
  return stars;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
