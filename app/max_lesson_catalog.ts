// ═══════════════════════════════════════════════════════════════════════════
// max_lesson_catalog.ts — витрина уроков раздела «Уроки с МАКСом».
//
// зачем (владелец 2026-08-31): «уроки, чему там юзер научится, это всё в
// разделе макс». Сервер уже знает 78 речевых целей и ведёт по ним ученика
// (functions/src/max_voice_can_do_goals.ts), но клиент их НЕ ЗНАЛ и показать
// список не мог. Здесь — минимальная витрина: id урока, уровень, тема и
// название на языке интерфейса. Ни фраз, ни грамматики, ни сцен: они живут на
// сервере, ученику в каталоге не нужны, а бандл дорог (правило бандл-диеты).
//
// ⚠️ Порядок и id обязаны совпадать с серверным CAN_DO_GOALS. Сторож —
// tests/max_lesson_catalog_contract.test.ts: он сверяет id и уровни с сервером
// и падает, если каталог разошёлся. Разошёлся — чинить каталог, а не сторожа:
// иначе ученик увидит урок, которого нет, либо не увидит существующий.
//
// Звёзды (0–3) сюда НЕ входят — они приходят с сервера в превью
// (catalogMastery), потому что это прогресс конкретного ученика.
// ═══════════════════════════════════════════════════════════════════════════

import type { Lang } from '../constants/i18n';

export type MaxLessonLevel = 'A1' | 'A2' | 'B1' | 'B2';

/**
 * Темы каталога (решение владельца 2026-08-31): поездка, работа, быт, общение.
 * 'basics' — опорные уроки без бытового сюжета (числа, время, прошедшее время):
 * они нужны всем и ни в одну из четырёх тем честно не ложатся, поэтому прячем
 * их за «Основы», а не приписываем чужой теме ради красивой цифры.
 */
export type MaxLessonTopic = 'travel' | 'work' | 'daily' | 'social' | 'basics';

export interface MaxLessonCatalogItem {
  id: string;
  level: MaxLessonLevel;
  topic: MaxLessonTopic;
}

/**
 * 78 уроков в том же порядке, что и на сервере: A1 ×20, A2 ×22, B1 ×18, B2 ×18.
 * Порядок значим — по нему строится «рекомендуемый следующий урок».
 */
export const MAX_LESSON_CATALOG: readonly MaxLessonCatalogItem[] = Object.freeze([
  // ── A1 ──
  { id: 'a1_greet', level: 'A1', topic: 'social' },
  { id: 'a1_intro', level: 'A1', topic: 'social' },
  { id: 'a1_ask_name', level: 'A1', topic: 'social' },
  { id: 'a1_family', level: 'A1', topic: 'social' },
  { id: 'a1_numbers_age', level: 'A1', topic: 'basics' },
  { id: 'a1_time_days', level: 'A1', topic: 'basics' },
  { id: 'a1_daily_routine', level: 'A1', topic: 'basics' },
  { id: 'a1_likes', level: 'A1', topic: 'social' },
  { id: 'a1_order_cafe', level: 'A1', topic: 'daily' },
  { id: 'a1_ask_price', level: 'A1', topic: 'daily' },
  { id: 'a1_shopping_basic', level: 'A1', topic: 'daily' },
  { id: 'a1_directions', level: 'A1', topic: 'travel' },
  { id: 'a1_transport', level: 'A1', topic: 'travel' },
  { id: 'a1_hotel_checkin', level: 'A1', topic: 'travel' },
  { id: 'a1_help', level: 'A1', topic: 'social' },
  { id: 'a1_weather', level: 'A1', topic: 'social' },
  { id: 'a1_food_basic', level: 'A1', topic: 'daily' },
  { id: 'a1_home', level: 'A1', topic: 'basics' },
  { id: 'a1_can_cant', level: 'A1', topic: 'basics' },
  { id: 'a1_phone_basic', level: 'A1', topic: 'work' },
  // ── A2 ──
  { id: 'a2_past_day', level: 'A2', topic: 'basics' },
  { id: 'a2_past_irregular', level: 'A2', topic: 'basics' },
  { id: 'a2_plans', level: 'A2', topic: 'social' },
  { id: 'a2_invite', level: 'A2', topic: 'social' },
  { id: 'a2_restaurant', level: 'A2', topic: 'daily' },
  { id: 'a2_complain_order', level: 'A2', topic: 'daily' },
  { id: 'a2_doctor', level: 'A2', topic: 'daily' },
  { id: 'a2_pharmacy', level: 'A2', topic: 'daily' },
  { id: 'a2_shopping_return', level: 'A2', topic: 'daily' },
  { id: 'a2_travel_airport', level: 'A2', topic: 'travel' },
  { id: 'a2_lost', level: 'A2', topic: 'travel' },
  { id: 'a2_describe_people', level: 'A2', topic: 'social' },
  { id: 'a2_compare', level: 'A2', topic: 'daily' },
  { id: 'a2_hobbies', level: 'A2', topic: 'social' },
  { id: 'a2_now', level: 'A2', topic: 'basics' },
  { id: 'a2_appointment', level: 'A2', topic: 'work' },
  { id: 'a2_work_basic', level: 'A2', topic: 'work' },
  { id: 'a2_opinion', level: 'A2', topic: 'social' },
  { id: 'a2_advice_ask', level: 'A2', topic: 'social' },
  { id: 'a2_house_rules', level: 'A2', topic: 'daily' },
  { id: 'a2_story_short', level: 'A2', topic: 'social' },
  { id: 'a2_phone_call', level: 'A2', topic: 'work' },
  // ── B1 ──
  { id: 'b1_experience', level: 'B1', topic: 'social' },
  { id: 'b1_narrate', level: 'B1', topic: 'social' },
  { id: 'b1_conditionals', level: 'B1', topic: 'basics' },
  { id: 'b1_complain_polite', level: 'B1', topic: 'daily' },
  { id: 'b1_job_interview', level: 'B1', topic: 'work' },
  { id: 'b1_agree_disagree', level: 'B1', topic: 'social' },
  { id: 'b1_plans_future', level: 'B1', topic: 'basics' },
  { id: 'b1_describe_place', level: 'B1', topic: 'travel' },
  { id: 'b1_health_habits', level: 'B1', topic: 'daily' },
  { id: 'b1_phrasal', level: 'B1', topic: 'basics' },
  { id: 'b1_explain_problem', level: 'B1', topic: 'daily' },
  { id: 'b1_apologise', level: 'B1', topic: 'work' },
  { id: 'b1_persuade', level: 'B1', topic: 'daily' },
  { id: 'b1_reported', level: 'B1', topic: 'basics' },
  { id: 'b1_passive', level: 'B1', topic: 'basics' },
  { id: 'b1_small_talk_pro', level: 'B1', topic: 'social' },
  { id: 'b1_feelings', level: 'B1', topic: 'social' },
  { id: 'b1_presentation', level: 'B1', topic: 'work' },
  // ── B2 ──
  { id: 'b2_qualify_claim', level: 'B2', topic: 'social' },
  { id: 'b2_nuanced_opinion', level: 'B2', topic: 'social' },
  { id: 'b2_extended_argument', level: 'B2', topic: 'work' },
  { id: 'b2_concession', level: 'B2', topic: 'social' },
  { id: 'b2_hypothetical', level: 'B2', topic: 'basics' },
  { id: 'b2_negotiate', level: 'B2', topic: 'work' },
  { id: 'b2_meeting', level: 'B2', topic: 'work' },
  { id: 'b2_presentation', level: 'B2', topic: 'work' },
  { id: 'b2_interview_advanced', level: 'B2', topic: 'work' },
  { id: 'b2_rephrase_clarify', level: 'B2', topic: 'social' },
  { id: 'b2_resolve_misunderstanding', level: 'B2', topic: 'social' },
  { id: 'b2_formality_register', level: 'B2', topic: 'work' },
  { id: 'b2_story_nuanced', level: 'B2', topic: 'social' },
  { id: 'b2_problem_solution', level: 'B2', topic: 'work' },
  { id: 'b2_news_discussion', level: 'B2', topic: 'social' },
  { id: 'b2_collocation', level: 'B2', topic: 'work' },
  { id: 'b2_phrasal_nuance', level: 'B2', topic: 'basics' },
  { id: 'b2_spontaneous_long_turn', level: 'B2', topic: 'work' },
]);

export const MAX_LESSON_LEVELS: readonly MaxLessonLevel[] = Object.freeze(['A1', 'A2', 'B1', 'B2']);
export const MAX_LESSON_TOPICS: readonly MaxLessonTopic[] = Object.freeze([
  'social', 'daily', 'travel', 'work', 'basics',
]);

/** Ступень освоения урока: 0 — не начат, 3 — закрыт (та же шкала, что у сервера). */
export type MaxLessonStars = 0 | 1 | 2 | 3;

export function maxLessonStars(mastery: Record<string, number>, lessonId: string): MaxLessonStars {
  const raw = mastery[lessonId];
  if (!Number.isFinite(raw)) return 0;
  const n = Math.min(3, Math.max(0, Math.floor(Number(raw))));
  return n as MaxLessonStars;
}

/**
 * Рекомендуемый урок — первый незакрытый (звёзд меньше трёх) на уровне ученика;
 * уровень пройден целиком → следующий уровень. Та же логика, что в серверном
 * pickNextGoal, чтобы подсветка в каталоге совпадала с тем, что реально начнёт
 * MAX. Ничего не блокируем: владелец выбрал «все уроки открыты сразу».
 */
export function recommendedMaxLessonId(
  mastery: Record<string, number>,
  level: string,
): string | null {
  const startIndex = Math.max(0, MAX_LESSON_LEVELS.indexOf(level as MaxLessonLevel));
  for (let i = startIndex; i < MAX_LESSON_LEVELS.length; i += 1) {
    const found = MAX_LESSON_CATALOG.find(
      (item) => item.level === MAX_LESSON_LEVELS[i] && maxLessonStars(mastery, item.id) < 3,
    );
    if (found) return found.id;
  }
  return null;
}

/** Сколько уроков закрыто полностью (3 звезды) — для шапки раздела. */
export function maxLessonsDone(mastery: Record<string, number>): number {
  let done = 0;
  for (const item of MAX_LESSON_CATALOG) if (maxLessonStars(mastery, item.id) >= 3) done += 1;
  return done;
}

// ── Названия тем на языке интерфейса ────────────────────────────────────────
// Названия САМИХ уроков приходят с сервера (там они уже локализованы на 9
// языков в CAN_DO_GOALS.title) — дублировать 78×9 строк в бандле нельзя.

const TOPIC_TITLES: Record<MaxLessonTopic, Partial<Record<Lang, string>> & { en: string }> = {
  social: {
    en: 'People', ru: 'Общение', uk: 'Спілкування', es: 'Personas', 'pt-BR': 'Pessoas',
    vi: 'Giao tiếp', id: 'Pergaulan', tr: 'İletişim', pl: 'Ludzie',
  },
  daily: {
    en: 'Everyday', ru: 'Каждый день', uk: 'Щодня', es: 'Día a día', 'pt-BR': 'Dia a dia',
    vi: 'Hằng ngày', id: 'Sehari-hari', tr: 'Günlük', pl: 'Codzienność',
  },
  travel: {
    en: 'Travel', ru: 'Поездка', uk: 'Подорож', es: 'Viajes', 'pt-BR': 'Viagem',
    vi: 'Du lịch', id: 'Perjalanan', tr: 'Seyahat', pl: 'Podróże',
  },
  work: {
    en: 'Work', ru: 'Работа', uk: 'Робота', es: 'Trabajo', 'pt-BR': 'Trabalho',
    vi: 'Công việc', id: 'Pekerjaan', tr: 'İş', pl: 'Praca',
  },
  basics: {
    en: 'Basics', ru: 'Основы', uk: 'Основи', es: 'Bases', 'pt-BR': 'Bases',
    vi: 'Nền tảng', id: 'Dasar', tr: 'Temeller', pl: 'Podstawy',
  },
};

export function maxLessonTopicTitle(topic: MaxLessonTopic, lang: Lang): string {
  const row = TOPIC_TITLES[topic];
  return row[lang] ?? row.en;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
