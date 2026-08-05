import type { TopicAccent } from './lesson_data_types';

/**
 * Уникальный цвет у каждой темы раздела «Теория» (пожелание владельца).
 *
 * Семантика остаётся общей и берётся из темы приложения:
 *   success / correct = зелёный, danger / wrong = красный, warning = жёлтый.
 * Здесь — ТОЛЬКО topic-accent (то, что мы учим): пилюли формулы, tone:'accent',
 * активные элементы интерактива.
 *
 * Контраст доведён до AAA (≥7:1 для текста на тёмном фоне карточки #171A21).
 * Ни один accent НЕ совпадает с danger (#DC5050) и success (#3CB478) —
 * см. assertNoSemanticClash ниже (вызывается в dev).
 *
 * ВАЖНО: поле `accent` считалось ТОЛЬКО под тёмную карточку. На светлой
 * поверхности оно даёт 1.8–2.5:1 (норма 4.5) — текст не читается. Для светлых
 * тем берём `accentOnLight`: тот же оттенок, затемнён до AA на #FCFDF9/#FFFFFF/
 * #F0FAFF/#F0F1EC/#E1E5DC. Выбирать через getTopicAccentColor(pal, isLight).
 */
export const TOPIC_ACCENTS: Record<number, TopicAccent> = {
  // To Be — синий
  1: { accent: '#5EA3FF', soft: 'rgba(94,163,255,0.10)', accentOnLight: '#1D5FC4' },
  2: { accent: '#5EA3FF', soft: 'rgba(94,163,255,0.10)', accentOnLight: '#1D5FC4' },
  // Present Simple (I/he + -s) — чайно-зелёный (отличён от success-зелёного)
  3: { accent: '#34C2C2', soft: 'rgba(52,194,194,0.10)', accentOnLight: '#17706F' },
  4: { accent: '#34C2C2', soft: 'rgba(52,194,194,0.10)', accentOnLight: '#17706F' },
  // Вопросы Do/Does — фиолетовый
  5: { accent: '#B68CFF', soft: 'rgba(182,140,255,0.10)', accentOnLight: '#6D3FC4' },
  6: { accent: '#B68CFF', soft: 'rgba(182,140,255,0.10)', accentOnLight: '#6D3FC4' },
  // Have/Has — индиго
  7: { accent: '#8AA0FF', soft: 'rgba(138,160,255,0.10)', accentOnLight: '#4356C4' },
  8: { accent: '#8AA0FF', soft: 'rgba(138,160,255,0.10)', accentOnLight: '#4356C4' },
  // There is/are — бирюзовый
  9: { accent: '#4FD1C5', soft: 'rgba(79,209,197,0.10)', accentOnLight: '#177067' },
  // Модальные can/should/must — янтарный
  10: { accent: '#F4B452', soft: 'rgba(244,180,82,0.10)', accentOnLight: '#8A5A12' },
  // Неправильные глаголы — коралл
  11: { accent: '#FF8E72', soft: 'rgba(255,142,114,0.10)', accentOnLight: '#AE3A22' },
  12: { accent: '#FF8E72', soft: 'rgba(255,142,114,0.10)', accentOnLight: '#AE3A22' },
  // Past Simple — тёплый персик
  13: { accent: '#F2A65A', soft: 'rgba(242,166,90,0.10)', accentOnLight: '#8C5214' },
  14: { accent: '#F2A65A', soft: 'rgba(242,166,90,0.10)', accentOnLight: '#8C5214' },
  // Артикли a/an/the — розовый
  15: { accent: '#F08FB8', soft: 'rgba(240,143,184,0.10)', accentOnLight: '#A83A6E' },
  16: { accent: '#F08FB8', soft: 'rgba(240,143,184,0.10)', accentOnLight: '#A83A6E' },
  // Present Continuous — небесно-голубой
  17: { accent: '#62C3FF', soft: 'rgba(98,195,255,0.10)', accentOnLight: '#175E8A' },
  18: { accent: '#62C3FF', soft: 'rgba(98,195,255,0.10)', accentOnLight: '#175E8A' },
  // Future will / going to — лавандовый
  19: { accent: '#A98CFF', soft: 'rgba(169,140,255,0.10)', accentOnLight: '#5F44C4' },
  20: { accent: '#A98CFF', soft: 'rgba(169,140,255,0.10)', accentOnLight: '#5F44C4' },
  // Сравнения / прилагательные — мятный
  21: { accent: '#5BD6A8', soft: 'rgba(91,214,168,0.10)', accentOnLight: '#1C7154' },
  22: { accent: '#5BD6A8', soft: 'rgba(91,214,168,0.10)', accentOnLight: '#1C7154' },
};

/** Fallback-акцент, если урока нет в реестре. */
export const DEFAULT_TOPIC_ACCENT: TopicAccent = {
  accent: '#5EA3FF',
  soft: 'rgba(94,163,255,0.10)',
  accentOnLight: '#1D5FC4',
};

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

/** Семантические цвета, с которыми accent НЕ должен совпадать. */
const SEMANTIC_GUARD = {
  danger: '#dc5050',
  success: '#3cb478',
};

/**
 * Возвращает уникальный цвет темы по lessonId.
 * Приоритет: явный topicAccent экрана → реестр → дефолт.
 */
export function getTopicAccent(
  lessonId: number | undefined,
  explicit?: TopicAccent,
): TopicAccent {
  if (explicit) return explicit;
  if (lessonId != null && TOPIC_ACCENTS[lessonId]) return TOPIC_ACCENTS[lessonId];
  return DEFAULT_TOPIC_ACCENT;
}

/**
 * Dev-проверка: ни один accent не сливается с danger/success.
 * Вызывать в __DEV__ при загрузке, чтобы ловить регрессии палитры.
 */
export function assertNoSemanticClash(): string[] {
  const problems: string[] = [];
  for (const [id, pal] of Object.entries(TOPIC_ACCENTS)) {
    const a = pal.accent.toLowerCase();
    if (a === SEMANTIC_GUARD.danger || a === SEMANTIC_GUARD.success) {
      problems.push(`Урок ${id}: accent ${pal.accent} совпадает с семантическим цветом`);
    }
  }
  return problems;
}

/** Светлые поверхности, на которых живёт теория (карточки светлых тем). */
const LIGHT_SURFACES = ['#FCFDF9', '#FFFFFF', '#F0FAFF', '#DCE1D8', '#E1E5DC'] as const;
const AA_TEXT = 4.5;

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Dev-проверка: accentOnLight читается на всех светлых карточках.
 * зачем: базовые accent'ы писались под тёмный фон, и на светлой теме текст
 * пропадал. Страж ловит регрессию при добавлении новой темы урока.
 */
export function assertLightAccentContrast(): string[] {
  const problems: string[] = [];
  for (const [id, pal] of Object.entries(TOPIC_ACCENTS)) {
    for (const surface of LIGHT_SURFACES) {
      const ratio = contrastRatio(pal.accentOnLight, surface);
      if (ratio < AA_TEXT) {
        problems.push(
          `Урок ${id}: accentOnLight ${pal.accentOnLight} на ${surface} даёт ${ratio.toFixed(2)}:1 (нужно ${AA_TEXT})`,
        );
      }
    }
  }
  return problems;
}
