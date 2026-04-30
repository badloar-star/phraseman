/**
 * Подписи к модалке осколков по reasonKey (RU / UK / ES).
 */
import type { ShardSource } from './shards_system';
import type { Lang } from '../constants/i18n';

const LABELS: Record<string, { ru: string; uk: string; es: string }> = {
  lesson_first: {
    ru: 'Первое прохождение урока',
    uk: 'Перше проходження уроку',
    es: 'Primera vez que completas la lección',
  },
  lesson_perfect: {
    ru: 'Идеальный урок (0 ошибок)',
    uk: 'Ідеальний урок (0 помилок)',
    es: 'Lección perfecta (0 errores)',
  },
  lesson_quiz_passed: {
    ru: 'Зачёт в уровневом экзамене',
    uk: 'Залік у рівневому іспиті',
    es: 'Aprobaste el examen de nivel',
  },
  lesson_completed: {
    ru: 'Урок/раздел полностью завершён',
    uk: 'Урок/розділ повністю завершено',
    es: 'Lección o sección completada',
  },
  streak_7: {
    ru: '7-дневный стрик',
    uk: '7-денний стрік',
    es: 'Racha de 7 días',
  },
  streak_30: {
    ru: '30 дней стрика подряд',
    uk: '30 днів стріку поспіль',
    es: '30 días de racha seguida',
  },
  arena_win: {
    ru: 'Победа в Арене',
    uk: 'Перемога в Арені',
    es: 'Victoria en la Arena',
  },
  arena_10_wins: {
    ru: 'Каждые 10 побед в Арене',
    uk: 'Кожні 10 перемог в Арені',
    es: 'Cada 10 victorias en la Arena',
  },
  arena_rank_up_streak: {
    ru: 'Повышение ранга (серия из 3+ побед)',
    uk: 'Підвищення рангу (серія з 3+ перемог)',
    es: 'Subida de rango (3+ victorias seguidas)',
  },
  daily_tasks_all: {
    ru: 'Все 3 ежедневных задания выполнены',
    uk: 'Усі 3 щоденні завдання виконано',
    es: 'Las 3 tareas del día completadas',
  },
  topic_completed: {
    ru: 'Все уроки темы пройдены',
    uk: 'Усі уроки теми пройдено',
    es: 'Todos los temas de la lección hechos',
  },
  exam_excellent: {
    ru: 'Экзамен 90% и выше (единоразово)',
    uk: 'Іспит 90% і вище (одноразово)',
    es: 'Examen ≥90 % (una vez)',
  },
  diagnostic_test: {
    ru: 'Диагностический тест (единоразово)',
    uk: 'Діагностичний тест (одноразово)',
    es: 'Test de diagnóstico (una vez)',
  },
  lessons_5_perfect: {
    ru: '5 уроков подряд без ошибок',
    uk: '5 уроків поспіль без помилок',
    es: '5 lecciones seguidas sin fallos',
  },
  level_gift: {
    ru: 'Подарок за уровень',
    uk: 'Подарунок за рівень',
    es: 'Regalo por subir de nivel',
  },
  level_premium_gift: {
    ru: 'Премиум‑подарок за уровень',
    uk: 'Преміум‑подарунок за рівень',
    es: 'Regalo Premium por nivel',
  },
  release_wave_bonus: {
    ru: 'Бонус за обновление (волна релиза)',
    uk: 'Бонус за оновлення (хвиля релізу)',
    es: 'Bonificación por actualización',
  },
  remote_shard_reward: {
    ru: 'Спасибо за помощь — мы начислили осколки',
    uk: 'Дякуємо за допомогу — ми нарахували осколки',
    es: 'Gracias por ayudar: te hemos dado fragmentos',
  },
  streak_wager_win: {
    ru: 'Выигрыш в стрик‑турнире',
    uk: 'Виграш у стрік‑турнірі',
    es: 'Victoria en el torneo de racha',
  },
  club_boost_refund: {
    ru: 'Возврат осколков (буст клуба)',
    uk: 'Повернення осколків (буст клубу)',
    es: 'Devolución de fragmentos (boost del club)',
  },
  achievement_shard: {
    ru: 'Награда за достижение',
    uk: 'Нагорода за досягнення',
    es: 'Recompensa por logro',
  },
  preposition_drill_perfect: {
    ru: 'Тренажёр предлогов без ошибок',
    uk: 'Тренажер прийменників без помилок',
    es: 'Práctica de preposiciones sin errores',
  },
  generic_raw: {
    ru: 'Получено осколков',
    uk: 'Отримано осколків',
    es: 'Fragmentos obtenidos',
  },
};

function pickLabel(row: { ru: string; uk: string; es: string }, lang: Lang): string {
  if (lang === 'uk') return row.uk;
  if (lang === 'es') return row.es;
  return row.ru;
}

export function labelForShardModalReason(key: string | undefined, lang: Lang): string {
  if (!key) {
    return pickLabel(LABELS.generic_raw, lang);
  }
  const row = LABELS[key];
  if (row) return pickLabel(row, lang);
  return key;
}

/** Склейка из нескольких типов наград за урок (одна модалка). */
export function formatLessonShardBatchReason(keys: ShardSource[], lang: Lang): string {
  const unique = [...new Set(keys)];
  if (unique.length === 0) {
    return pickLabel(LABELS.generic_raw, lang);
  }
  if (unique.length === 1) {
    return labelForShardModalReason(unique[0], lang);
  }
  const sep = ' · ';
  const parts = unique.map((k) => labelForShardModalReason(k, lang));
  return parts.join(sep);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
