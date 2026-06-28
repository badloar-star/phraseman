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
 */
export const TOPIC_ACCENTS: Record<number, TopicAccent> = {
  // To Be — синий
  1: { accent: '#5EA3FF', soft: 'rgba(94,163,255,0.10)' },
  2: { accent: '#5EA3FF', soft: 'rgba(94,163,255,0.10)' },
  // Present Simple (I/he + -s) — чайно-зелёный (отличён от success-зелёного)
  3: { accent: '#34C2C2', soft: 'rgba(52,194,194,0.10)' },
  4: { accent: '#34C2C2', soft: 'rgba(52,194,194,0.10)' },
  // Вопросы Do/Does — фиолетовый
  5: { accent: '#B68CFF', soft: 'rgba(182,140,255,0.10)' },
  6: { accent: '#B68CFF', soft: 'rgba(182,140,255,0.10)' },
  // Have/Has — индиго
  7: { accent: '#8AA0FF', soft: 'rgba(138,160,255,0.10)' },
  8: { accent: '#8AA0FF', soft: 'rgba(138,160,255,0.10)' },
  // There is/are — бирюзовый
  9: { accent: '#4FD1C5', soft: 'rgba(79,209,197,0.10)' },
  // Модальные can/should/must — янтарный
  10: { accent: '#F4B452', soft: 'rgba(244,180,82,0.10)' },
  // Неправильные глаголы — коралл
  11: { accent: '#FF8E72', soft: 'rgba(255,142,114,0.10)' },
  12: { accent: '#FF8E72', soft: 'rgba(255,142,114,0.10)' },
  // Past Simple — тёплый персик
  13: { accent: '#F2A65A', soft: 'rgba(242,166,90,0.10)' },
  14: { accent: '#F2A65A', soft: 'rgba(242,166,90,0.10)' },
  // Артикли a/an/the — розовый
  15: { accent: '#F08FB8', soft: 'rgba(240,143,184,0.10)' },
  16: { accent: '#F08FB8', soft: 'rgba(240,143,184,0.10)' },
  // Present Continuous — небесно-голубой
  17: { accent: '#62C3FF', soft: 'rgba(98,195,255,0.10)' },
  18: { accent: '#62C3FF', soft: 'rgba(98,195,255,0.10)' },
  // Future will / going to — лавандовый
  19: { accent: '#A98CFF', soft: 'rgba(169,140,255,0.10)' },
  20: { accent: '#A98CFF', soft: 'rgba(169,140,255,0.10)' },
  // Сравнения / прилагательные — мятный
  21: { accent: '#5BD6A8', soft: 'rgba(91,214,168,0.10)' },
  22: { accent: '#5BD6A8', soft: 'rgba(91,214,168,0.10)' },
};

/** Fallback-акцент, если урока нет в реестре. */
export const DEFAULT_TOPIC_ACCENT: TopicAccent = {
  accent: '#5EA3FF',
  soft: 'rgba(94,163,255,0.10)',
};

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
