// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
//
// Чистая логика выбора без нативных зависимостей (легко тестируется):
//  - NoRepeatDeck — перемешанная колода вариантов. Вариант НИКОГДА не звучит два раза подряд, в том числе
//    на стыке колод (первый вариант новой колоды обязан отличаться от последнего из прошлой).
//  - StreakBook — шаги серий (верные ответы подряд растут, ошибка сбрасывает).

import { SOUND_V2_CATALOG, type SoundV2EventId } from './catalog';

export type RandomSource = () => number;

export class NoRepeatDeck {
  private queue: number[] = [];
  private last = -1;

  constructor(
    private readonly size: number,
    private readonly rng: RandomSource,
  ) {}

  /** Следующий вариант (с нуля). Никогда не равен предыдущему, если вариантов больше одного. */
  draw(): number {
    this.ensure();
    const next = this.queue.shift() as number;
    this.last = next;
    return next;
  }

  /** Какой вариант выпадет следующим — не меняя колоду. Нужен для прогрева плеера заранее. */
  peek(): number {
    this.ensure();
    return this.queue[0];
  }

  /** Последний выпавший вариант (-1, если колода ещё не тянулась). */
  get lastDrawn(): number {
    return this.last;
  }

  private ensure(): void {
    if (this.queue.length > 0) return;
    const size = Math.max(1, this.size);
    const next = Array.from({ length: size }, (_, i) => i);
    for (let i = size - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      const swap = next[i];
      next[i] = next[j];
      next[j] = swap;
    }
    // Стык колод: первый вариант новой колоды не должен совпасть с последним из прошлой.
    if (size > 1 && next[0] === this.last) {
      const k = 1 + Math.min(size - 2, Math.floor(this.rng() * (size - 1)));
      const swap = next[0];
      next[0] = next[k];
      next[k] = swap;
    }
    this.queue = next;
  }
}

export class StreakBook {
  private readonly steps = new Map<SoundV2EventId, number>();

  /** Текущий шаг серии (с нуля). У несерийных событий всегда 0. */
  get(event: SoundV2EventId): number {
    return this.steps.get(event) ?? 0;
  }

  /** Шаг вперёд: серия растёт до последнего шага и держится (кольцо дня идёт по кругу). Возвращает новый шаг. */
  advance(event: SoundV2EventId): number {
    const entry = SOUND_V2_CATALOG[event];
    if (entry.steps <= 1) return 0;
    const current = this.get(event);
    const next = entry.cycle ? (current + 1) % entry.steps : Math.min(current + 1, entry.steps - 1);
    this.steps.set(event, next);
    return next;
  }

  reset(event: SoundV2EventId): void {
    this.steps.delete(event);
  }

  resetAll(): void {
    this.steps.clear();
  }

  resetMany(events: readonly SoundV2EventId[]): void {
    for (const event of events) this.steps.delete(event);
  }
}
