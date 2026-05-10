/**
 * Подписи к модалке осколков по reasonKey (RU / UK / ES).
 */
import type { ShardSource } from './shards_system';
import type { Lang } from '../constants/i18n';

const LABELS: Record<string, { ru: string; uk: string; es: string }> = {
  lesson_first: {
    ru: 'Первый урок покорён — держи блестящий бонус',
    uk: 'Перший урок підкорено — тримай блискучий бонус',
    es: 'Primera lección completada: brillo extra para ti',
  },
  lesson_perfect: {
    ru: 'Идеально: ни одной ошибки, заслуженная награда',
    uk: 'Ідеально: жодної помилки — заслужена нагорода',
    es: 'Perfecto: sin fallos; recompensa merecida',
  },
  lesson_quiz_passed: {
    ru: 'Зачёт сдан — знания закреплены, осколки твои',
    uk: 'Залік здано — знання закріплені, осколки твої',
    es: 'Examen de nivel superado: conocimiento asegurado',
  },
  lesson_completed: {
    ru: 'Раздел закрыт полностью — приз за упорство',
    uk: 'Розділ закрито повністю — приз за наполегливість',
    es: 'Sección cerrada al completo: premio por constancia',
  },
  streak_7: {
    ru: '7 дней подряд — редкая регулярность, редкий бонус',
    uk: '7 днів поспіль — рідкісна регулярність, рідкісний бонус',
    es: '7 días seguidos: constancia que merece brillo extra',
  },
  streak_30: {
    ru: '30 дней цепочки подряд — настоящая дисциплина заслужила сияние',
    uk: '30 днів стріку — справжня дисципліна заслуговує сяйва',
    es: '30 días de racha: disciplina que brilla',
  },
  arena_win: {
    ru: 'Победа на Арене — славный бой, славная награда',
    uk: 'Перемога на Арені — славний бій, славна нагорода',
    es: 'Victoria en la Arena: combate limpio, premio a la altura',
  },
  arena_match_wager_win: {
    ru: 'Ставка сыграла — победа на Арене с двойным вкусом',
    uk: 'Ставка зіграла — перемога на Арені з подвійним смаком',
    es: 'Apuesta ganada en la Arena: victoria con sabor a oro',
  },
  arena_10_wins: {
    ru: '10 побед — серия мастера, бонус по традиции',
    uk: '10 перемог — серія майстра, бонус за традицією',
    es: '10 victorias: racha de maestría, bonus clásico',
  },
  arena_rank_up_streak: {
    ru: 'Ранг выше после серии побед — заслуженный взлёт',
    uk: 'Ранг вище після серії перемог — заслужений зліт',
    es: 'Subiste de rango tras una racha: ascenso merecido',
  },
  daily_tasks_all: {
    ru: 'Три дневных задания закрыты — день прожит с пользой',
    uk: 'Три денні завдання закриті — день прожитий з користю',
    es: 'Las 3 tareas del día: jornada redonda',
  },
  topic_completed: {
    ru: 'Вся тема пройдена — большой рывок, большой приз',
    uk: 'Уся тема пройдена — великий ривок, великий приз',
    es: 'Tema completado: gran salto, gran recompensa',
  },
  exam_excellent: {
    ru: 'Экзамен на отлично — золотой стандарт знаний',
    uk: 'Іспит на відмінно — золотий стандарт знань',
    es: 'Examen excelente: estándar de oro',
  },
  diagnostic_test: {
    ru: 'Диагностика пройдена — отправная точка с бонусом',
    uk: 'Діагностика пройдена — відправна точка з бонусом',
    es: 'Test de diagnóstico: punto de partida con regalo',
  },
  lessons_5_perfect: {
    ru: 'Пять идеальных уроков подряд — клуб перфекционистов',
    uk: 'П’ять ідеальних уроків поспіль — клуб перфекціоністів',
    es: '5 lecciones perfectas seguidas: club de precisión',
  },
  level_gift: {
    ru: 'Новый уровень — небольшой подарок за рост',
    uk: 'Новий рівень — невеликий подарунок за зростання',
    es: 'Nuevo nivel: un regalo por tu progreso',
  },
  level_premium_gift: {
    ru: 'Премиум‑подарок за уровень — только для тех, кто идёт вперёд',
    uk: 'Преміум-подарунок за рівень — лише для тих, хто рухається вперед',
    es: 'Regalo Premium por subir: para quien no se detiene',
  },
  release_wave_bonus: {
    ru: 'Бонус обновления — спасибо, что обновился',
    uk: 'Бонус оновлення — дякуємо, що оновився',
    es: 'Bonificación por actualizar: gracias por estar al día',
  },
  remote_shard_reward: {
    ru: 'Команда начислила осколки — твоя помощь не забыта',
    uk: 'Команда нарахувала осколки — твоя допомога не забута',
    es: 'Fragmentos del equipo: tu ayuda cuenta',
  },
  streak_wager_win: {
    ru: 'Турнир на цепочку выигран — ставка окупилась с лихвой',
    uk: 'Стрік-турнір виграно — ставка окупилася з лихвою',
    es: 'Torneo de racha ganado: la apuesta rindió de sobra',
  },
  club_boost_refund: {
    ru: 'Возврат осколков за буст клуба',
    uk: 'Повернення осколків за буст клубу',
    es: 'Devolución de fragmentos (boost del club)',
  },
  achievement_shard: {
    ru: 'Достижение разблокировано — приз на полку почёта',
    uk: 'Досягнення розблоковано — приз на полицю пошани',
    es: 'Logro desbloqueado: premio para la vitrina',
  },
  preposition_drill_perfect: {
    ru: 'Тренажёр предлогов без единой ошибки',
    uk: 'Тренажер прийменників без жодної помилки',
    es: 'Preposiciones a la perfección',
  },
  generic_raw: {
    ru: 'Начисление осколков знаний',
    uk: 'Нарахування осколків знань',
    es: 'Fragmentos acreditados',
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
