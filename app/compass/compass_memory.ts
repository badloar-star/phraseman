/**
 * Компас — память (карта тем). Крыло «Память», Волна 4.1.
 *
 * Единая карта тем: каждая грамматическая тема получает статус (уверенно / крепнет /
 * ведём сюда). Растёт от ЛЮБОЙ активности любой части — потому что читает готовые
 * сигналы (мастерство POS + ошибки). Это и зеркало для ученика, и компас для мозга
 * («веди в слабую тему»).
 *
 * ВАЖНО (закон Компаса): карта — ЕДИНСТВЕННОЕ, что Компас «пишет» как свою
 * сущность. Прогресс самих частей (уроки/план/тренажёр) НЕ трогается — карта лишь
 * читает их и агрегирует. Здесь — чистая агрегация (без сайд-эффектов); сохранение
 * снимка карты (если понадобится) — задача применяющего слоя за флагом.
 *
 * ИЗОЛЯЦИЯ: строить/показывать карту только при `compassTopicMapOn()`.
 */
import type { CompassSnapshot } from './signal_bus';

/** Статус темы. «guided» = слабая, Компас ведёт сюда (не наказываем — по Библии). */
export type TopicStatus = 'confident' | 'growing' | 'guided';

export interface TopicCard {
  /** Ключ темы (POS-категория), стабильный для подписи/зова. */
  topic: string;
  status: TopicStatus;
  /** Прогресс 0..100 для полоски (из уровня мастерства). */
  progressPct: number;
}

/** Уровень мастерства, выше которого тема «уверенно». */
const CONFIDENT_LEVEL = 4;
/** Уровень, ниже которого тема «ведём сюда» (если ещё и ошибки — точно сюда). */
const GUIDED_LEVEL = 2;
/** Грубый максимум уровня для перевода в проценты. */
const MAX_LEVEL = 6;

function levelToPct(level: number): number {
  const pct = Math.round((Math.max(0, level) / MAX_LEVEL) * 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * Построить карту тем из снимка. Каждая POS-тема → карточка со статусом.
 * Тема «ведём сюда», если уровень низкий ИЛИ по ней есть свежие ошибки.
 * Карта отсортирована: слабые впереди (мозгу и ученику видно, куда идти).
 */
export function buildTopicMap(snapshot: CompassSnapshot): TopicCard[] {
  // Темы с ошибками (по категориям из фраз-ошибок) — кандидаты «ведём сюда».
  const noisyTopics = new Set<string>();
  for (const m of snapshot.mistakes) {
    if (m.topCategory) noisyTopics.add(String(m.topCategory));
  }

  const cards: TopicCard[] = snapshot.posMastery.map((entry) => {
    const topic = String(entry.category);
    const hasMistakes = noisyTopics.has(topic);
    let status: TopicStatus;
    if (entry.level >= CONFIDENT_LEVEL && !hasMistakes) {
      status = 'confident';
    } else if (entry.level <= GUIDED_LEVEL || hasMistakes) {
      status = 'guided';
    } else {
      status = 'growing';
    }
    return { topic, status, progressPct: levelToPct(entry.level) };
  });

  // Слабые впереди: guided → growing → confident; внутри — по возрастанию прогресса.
  const order: Record<TopicStatus, number> = { guided: 0, growing: 1, confident: 2 };
  return cards.sort((a, b) => order[a.status] - order[b.status] || a.progressPct - b.progressPct);
}

/** Сводка карты для блока статистики: сколько тем окрепло, сколько ведём. */
export interface TopicMapSummary {
  total: number;
  confident: number;
  growing: number;
  guided: number;
}

export function summarizeTopicMap(cards: TopicCard[]): TopicMapSummary {
  return {
    total: cards.length,
    confident: cards.filter((c) => c.status === 'confident').length,
    growing: cards.filter((c) => c.status === 'growing').length,
    guided: cards.filter((c) => c.status === 'guided').length,
  };
}
