import type { TopicAccent } from './lesson_data_types';
import { homeSceneFromOklch, homeSceneOklchOf } from '../components/home/v2/scene/home_scene_tokens';
import { themeRoleAlpha } from '../components/theme_role_colors';

/**
 * Акцент темы раздела «Теория» — оттенок ТЕКУЩЕЙ темы приложения, а не своя палитра.
 *
 * зачем (решение владельца 28.10 через координатора: «Теория — в цвет темы приложения, грамматические темы различаются оттенком от акцента, а не своей палитрой»;
 * снято прежнее пожелание «у каждой темы свой уникальный цвет» — таблица из 22 фиксированных цветов, 76 литералов, удалена; её читателей не было): тема урока
 * получает акцент из акцента текущей темы со сдвигом тона на TOPIC_HUE_STEP_DEG за каждую следующую тему цикла из TOPIC_HUE_CYCLE. Насыщенность не ниже
 * TOPIC_MIN_CHROMA (у серой темы темы остаются различимы), светлота подбирается отдельно под тёмную карточку (accent) и светлую (accentOnLight): текст ≥ 4,5:1.
 * Страж — tests/theory_topic_accents_theme.test.ts (все темы × уроки 1–32).
 */
export const TOPIC_HUE_STEP_DEG = 30;
export const TOPIC_HUE_CYCLE = 8;
export const TOPIC_MIN_CHROMA = 0.075;
export const TOPIC_MAX_CHROMA = 0.16;
/** Светлота акцента: на тёмной карточке светлый тон, на светлой — глубокий (контраст ≥ 4,5 проверяет страж). */
export const TOPIC_LIGHTNESS = { dark: 0.8, light: 0.43 } as const;

const HEX6 = /^#([0-9a-f]{6})$/i;
/** Оттенок запасного варианта, если акцент темы не hex: нейтральный сине-серый. */
const FALLBACK_HUE = 250;

const hexOf = (c: readonly number[]): string => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/**
 * Акцент темы урока `lessonId` для акцента темы приложения `themeAccent` (#rrggbb).
 * Приоритет: явный topicAccent экрана → производный от темы. Мемоизации не нужно: вызывается раз на экран.
 */
export function getTopicAccent(lessonId: number | undefined, explicit?: TopicAccent, themeAccent = ''): TopicAccent {
  if (explicit) return explicit;
  const m = HEX6.exec(themeAccent);
  const n = m ? parseInt(m[1], 16) : 0;
  const [, c, h] = m ? homeSceneOklchOf([(n >> 16) & 255, (n >> 8) & 255, n & 255]) : [0, 0, FALLBACK_HUE];
  const chroma = Math.max(TOPIC_MIN_CHROMA, Math.min(TOPIC_MAX_CHROMA, c));
  const index = lessonId != null && lessonId > 0 ? (lessonId - 1) % TOPIC_HUE_CYCLE : 0;
  const hue = (h + index * TOPIC_HUE_STEP_DEG) % 360;
  const accent = hexOf(homeSceneFromOklch(TOPIC_LIGHTNESS.dark, chroma, hue));
  return { accent, soft: themeRoleAlpha(accent, 0.1), accentOnLight: hexOf(homeSceneFromOklch(TOPIC_LIGHTNESS.light, chroma, hue)) };
}

/**
 * Уроки, контент которых переписан на новую интерактивную теорию
 * (theory_content_lessonN.ts). Кнопка «Теория» для них ведёт на новый экран
 * (/hint → LessonTheoryNew). Сейчас готовы ВСЕ уроки 1-32.
 */
export const INTERACTIVE_THEORY_LESSONS: ReadonlySet<number> = new Set<number>(
  Array.from({ length: 32 }, (_, i) => i + 1),
);

/** Готов ли урок к показу через новый интерактивный экран теории. */
export function isInteractiveTheoryLesson(lessonId: number): boolean {
  return INTERACTIVE_THEORY_LESSONS.has(lessonId);
}

/**
 * Цвет акцента темы под конкретную поверхность.
 * зачем: единственная точка выбора «тёмный фон → accent, светлый → accentOnLight»,
 * чтобы экраны не решали это каждый по-своему и не забывали про светлые темы.
 */
export function getTopicAccentColor(pal: TopicAccent, isLightSurface: boolean): string {
  return isLightSurface ? pal.accentOnLight : pal.accent;
}
