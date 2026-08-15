/**
 * cards-2.0 (E10): ЧИСТАЯ state machine режима «Слушание» (§3.8 мастер-плана).
 * Без RN-импортов — юнит-тестируется в node (tests/fc_listening_machine.test.ts).
 *
 * Машина событийная: экран исполняет эффекты (speak/gap/flip/tick) и возвращает
 * события (SPEAK_DONE / GAP_DONE / WATCHDOG_FIRE / PAUSE / RESUME / SKIP_* / STOP).
 * Каждый асинхронный шаг получает одноразовый token — устаревшие события
 * (зависший onDone после watchdog, GAP_DONE после паузы) игнорируются молча.
 *
 * Watchdog обязателен (§3.8, п.9 критики): на Android onDone у expo-speech
 * периодически не стреляет — на каждый speak экран ставит таймер
 * `watchdogMs = max(4000, слов × 600 / rate + 2000)`, по срабатыванию —
 * Speech.stop() + WATCHDOG_FIRE → машина двигается дальше, сессия не виснет.
 *
 * Ветка «текст без озвучки» (§3.8, п.8 критики): сторона с недоступным голосом
 * (backAvailable=false после фолбэк-цепочки tts_voices) НЕ озвучивается —
 * вместо speak эффект no_voice (бейдж) + gap NO_VOICE_GAP_MS, флип сохраняется.
 */

// ── Конфиг ───────────────────────────────────────────────────────────────────

/** Порядки озвучки (§3.8): EN→перевод / перевод→EN (recall) / EN×2 / только EN. */
export type ListeningOrder = 'en_ru' | 'ru_en' | 'en_x2' | 'en_only';
export const LISTENING_ORDERS: readonly ListeningOrder[] = ['en_ru', 'ru_en', 'en_x2', 'en_only'];

/** Пауза «подумать» между сторонами, варианты §3.8: 1/2/3/5с, дефолт 2с. */
export const LISTENING_PAUSE_CHOICES_SEC = [1, 2, 3, 5] as const;
export const LISTENING_DEFAULT_PAUSE_SEC = 2;
/** Пауза между карточками (§3.8: «пауза 1с → следующая»). */
export const LISTENING_BETWEEN_CARDS_MS = 1000;
/** EN×2: второй проход медленнее (§3.8: rate 0.8). */
export const EN_X2_SECOND_RATE_MULT = 0.8;
/** «Текст без озвучки»: сторона видна визуально, gap вместо речи. */
export const NO_VOICE_GAP_MS = 1500;

export type ListeningCard = {
  /** Стабильный id (DeckCard.id) — для прогресса/наград. */
  id: string;
  /** Лицо: EN-фраза. */
  front: string;
  /** Рубашка: перевод в локали показа. */
  back: string;
  /** BCP-47 языка лица (обычно en-US). */
  frontLang: string;
  /** false — en-голоса нет (экзотика): лицо показывается без озвучки. */
  frontAvailable: boolean;
  /** BCP-47 рубашки ПОСЛЕ фолбэк-цепочки tts_voices (uk → ru-RU и т.п.). */
  backLang: string;
  /** false — голоса перевода нет даже после фолбэков → ветка «текст без озвучки». */
  backAvailable: boolean;
};

export type ListeningConfig = {
  order: ListeningOrder;
  /** Пауза «подумать» между сторонами, мс. */
  pauseMs: number;
  /** Пауза между карточками, мс. */
  betweenMs: number;
  /** Базовый rate речи (1.0 по §3.8). */
  rate: number;
  /** Повтор подборки: после последней карточки — снова первая. */
  loop: boolean;
};

export const LISTENING_DEFAULT_CONFIG: ListeningConfig = {
  order: 'en_ru',
  pauseMs: LISTENING_DEFAULT_PAUSE_SEC * 1000,
  betweenMs: LISTENING_BETWEEN_CARDS_MS,
  rate: 1.0,
  loop: false,
};

// ── Watchdog ─────────────────────────────────────────────────────────────────

/** §3.8: max(4с, слов × 0.6с / rate + 2с), мс. */
export function watchdogMsForSpeak(text: string, rate: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  return Math.max(4000, Math.round((words * 600) / safeRate + 2000));
}

// ── План карточки ────────────────────────────────────────────────────────────

export type ListeningSide = 'front' | 'back';

export type ListeningStep =
  | { type: 'flip'; flipped: boolean }
  | { type: 'speak'; side: ListeningSide; text: string; lang: string; rate: number; available: boolean }
  | { type: 'gap'; ms: number };

/** Последовательность шагов одной карточки для порядка озвучки (§3.8). Чистая. */
export function buildCardSteps(card: ListeningCard, cfg: ListeningConfig): ListeningStep[] {
  const front: ListeningStep = {
    type: 'speak', side: 'front', text: card.front, lang: card.frontLang, rate: cfg.rate, available: card.frontAvailable,
  };
  const back: ListeningStep = {
    type: 'speak', side: 'back', text: card.back, lang: card.backLang, rate: cfg.rate, available: card.backAvailable,
  };
  switch (cfg.order) {
    case 'ru_en':
      // recall: перевод → пауза «вспомнить» → слово (§3.8)
      return [
        { type: 'flip', flipped: true },
        back,
        { type: 'gap', ms: cfg.pauseMs },
        { type: 'flip', flipped: false },
        front,
        { type: 'gap', ms: cfg.betweenMs },
      ];
    case 'en_x2':
      // EN дважды, второй медленнее; перевод показывается визуально
      return [
        { type: 'flip', flipped: false },
        front,
        { type: 'gap', ms: cfg.pauseMs },
        { ...front, rate: cfg.rate * EN_X2_SECOND_RATE_MULT },
        { type: 'flip', flipped: true },
        { type: 'gap', ms: cfg.betweenMs },
      ];
    case 'en_only':
      return [
        { type: 'flip', flipped: false },
        front,
        { type: 'gap', ms: cfg.pauseMs },
        { type: 'flip', flipped: true },
        { type: 'gap', ms: cfg.betweenMs },
      ];
    case 'en_ru':
    default:
      return [
        { type: 'flip', flipped: false },
        front,
        { type: 'gap', ms: cfg.pauseMs },
        { type: 'flip', flipped: true },
        back,
        { type: 'gap', ms: cfg.betweenMs },
      ];
  }
}

// ── События и эффекты ────────────────────────────────────────────────────────

export type ListeningEvent =
  | { type: 'SPEAK_DONE'; token: number }
  | { type: 'WATCHDOG_FIRE'; token: number }
  | { type: 'GAP_DONE'; token: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SKIP_NEXT' }
  | { type: 'SKIP_PREV' }
  | { type: 'STOP' };

export type ListeningEffect =
  /** Показать карточку index (экран обновляет контент PhraseCard + счётчик). */
  | { kind: 'card'; index: number; total: number }
  /** Автофлип PhraseCard (анимируется контролируемым `flipped`). */
  | { kind: 'flip'; flipped: boolean }
  /** Тихий tick 30мс между карточками (§5). */
  | { kind: 'tick' }
  /** Озвучить: экран вызывает speak(text, rate, {language, onDone}) + ставит watchdog. */
  | { kind: 'speak'; token: number; side: ListeningSide; text: string; lang: string; rate: number; watchdogMs: number }
  /** Пауза: экран ставит setTimeout(ms) → GAP_DONE(token). */
  | { kind: 'gap'; token: number; ms: number }
  /** Бейдж «нет голоса» для стороны (одна карточка; сбрасывается эффектом card). */
  | { kind: 'no_voice'; side: ListeningSide }
  /** Экран обязан Speech.stop() + очистить свои таймеры (watchdog/gap). */
  | { kind: 'stop_speech' }
  /** Карточка дослушана целиком (счётчик прослушанных). */
  | { kind: 'progress'; listened: number }
  /** Карточки закончились (loop выключен) → экран финалит сессию. */
  | { kind: 'done'; cardsListened: number };

export type ListeningPhase = 'idle' | 'playing' | 'paused' | 'done' | 'stopped';

export type ListeningSnapshot = {
  phase: ListeningPhase;
  cardIndex: number;
  totalCards: number;
  /** Полностью прослушанных карточек (с повторами подборки — суммарно). */
  listened: number;
  flipped: boolean;
  config: ListeningConfig;
};

// ── Машина ───────────────────────────────────────────────────────────────────

export class ListeningMachine {
  private readonly cards: readonly ListeningCard[];
  private cfg: ListeningConfig;
  private readonly emit: (e: ListeningEffect) => void;

  private phase: ListeningPhase = 'idle';
  private cardIdx = 0;
  private stepIdx = 0;
  private listened = 0;
  private flipped = false;
  /** Одноразовый token текущего асинхронного шага; всё остальное — устаревшее. */
  private token = 0;

  constructor(
    cards: readonly ListeningCard[],
    config: Partial<ListeningConfig>,
    onEffect: (e: ListeningEffect) => void,
  ) {
    this.cards = cards;
    this.cfg = { ...LISTENING_DEFAULT_CONFIG, ...config };
    this.emit = onEffect;
  }

  get snapshot(): ListeningSnapshot {
    return {
      phase: this.phase,
      cardIndex: this.cardIdx,
      totalCards: this.cards.length,
      listened: this.listened,
      flipped: this.flipped,
      config: { ...this.cfg },
    };
  }

  start(): void {
    if (this.phase !== 'idle' || this.cards.length === 0) return;
    this.phase = 'playing';
    this.emit({ kind: 'card', index: 0, total: this.cards.length });
    this.runStep();
  }

  send(ev: ListeningEvent): void {
    if (this.phase === 'stopped' || this.phase === 'done' || this.phase === 'idle') {
      // STOP глушит всё: после него машина не тикает ни от каких событий (§тесты)
      if (this.phase === 'idle' && ev.type === 'STOP') this.phase = 'stopped';
      return;
    }
    switch (ev.type) {
      case 'SPEAK_DONE':
      case 'GAP_DONE':
        if (this.phase !== 'playing' || ev.token !== this.token) return; // устаревшее
        this.advanceStep();
        return;
      case 'WATCHDOG_FIRE':
        if (this.phase !== 'playing' || ev.token !== this.token) return;
        // Экран уже вызвал Speech.stop(); дублируем эффектом — идемпотентно
        this.emit({ kind: 'stop_speech' });
        this.advanceStep();
        return;
      case 'PAUSE':
        if (this.phase !== 'playing') return;
        this.phase = 'paused';
        this.token += 1; // инвалидируем висящие onDone/gap
        this.emit({ kind: 'stop_speech' });
        return;
      case 'RESUME':
        if (this.phase !== 'paused') return;
        this.phase = 'playing';
        this.runStep(); // текущий шаг заново (speak с начала / полный gap)
        return;
      case 'SKIP_NEXT':
        this.skip(+1);
        return;
      case 'SKIP_PREV':
        this.skip(-1);
        return;
      case 'STOP':
        this.phase = 'stopped';
        this.token += 1;
        this.emit({ kind: 'stop_speech' });
        return;
    }
  }

  /** Смена порядка озвучки на лету: текущая карточка стартует заново. */
  setOrder(order: ListeningOrder): void {
    if (this.cfg.order === order) return;
    this.cfg = { ...this.cfg, order };
    if (this.phase === 'playing' || this.phase === 'paused') {
      this.token += 1;
      this.emit({ kind: 'stop_speech' });
      this.stepIdx = 0;
      if (this.phase === 'playing') this.runStep();
      else this.applyLeadingFlips();
    }
  }

  /** Пауза между сторонами — применяется со следующего gap. */
  setPauseMs(ms: number): void {
    this.cfg = { ...this.cfg, pauseMs: Math.max(0, ms) };
  }

  setLoop(loop: boolean): void {
    this.cfg = { ...this.cfg, loop };
  }

  setRate(rate: number): void {
    this.cfg = { ...this.cfg, rate: rate > 0 ? rate : 1 };
  }

  // ── Внутреннее ─────────────────────────────────────────────────────────────

  private steps(): ListeningStep[] {
    return buildCardSteps(this.cards[this.cardIdx]!, this.cfg);
  }

  private advanceStep(): void {
    this.stepIdx += 1;
    this.runStep();
  }

  /** Исполнить текущий шаг; синхронные (flip) сворачиваются в один проход. */
  private runStep(): void {
    if (this.phase !== 'playing') return;
    const steps = this.steps();
    // Все подряд идущие флипы — синхронно
    while (this.stepIdx < steps.length && steps[this.stepIdx]!.type === 'flip') {
      const st = steps[this.stepIdx] as Extract<ListeningStep, { type: 'flip' }>;
      this.flipped = st.flipped;
      this.emit({ kind: 'flip', flipped: st.flipped });
      this.stepIdx += 1;
    }
    if (this.stepIdx >= steps.length) {
      this.completeCard();
      return;
    }
    const step = steps[this.stepIdx]!;
    this.token += 1;
    if (step.type === 'gap') {
      this.emit({ kind: 'gap', token: this.token, ms: step.ms });
      return;
    }
    if (step.type !== 'speak') return; // флипы свернуты выше — сужение типа
    // speak
    if (!step.available) {
      // «Текст без озвучки» (§3.8): сторона видна, бейдж + gap вместо речи
      this.emit({ kind: 'no_voice', side: step.side });
      this.emit({ kind: 'gap', token: this.token, ms: NO_VOICE_GAP_MS });
      return;
    }
    this.emit({
      kind: 'speak',
      token: this.token,
      side: step.side,
      text: step.text,
      lang: step.lang,
      rate: step.rate,
      watchdogMs: watchdogMsForSpeak(step.text, step.rate),
    });
  }

  /** Паузный переход на карточку: выставить только стартовый флип, не играть. */
  private applyLeadingFlips(): void {
    const steps = this.steps();
    let i = 0;
    while (i < steps.length && steps[i]!.type === 'flip') {
      const st = steps[i] as Extract<ListeningStep, { type: 'flip' }>;
      this.flipped = st.flipped;
      this.emit({ kind: 'flip', flipped: st.flipped });
      i += 1;
    }
    // stepIdx — на первом асинхронном шаге: RESUME продолжит с него.
    this.stepIdx = i;
  }

  private completeCard(): void {
    this.listened += 1;
    this.emit({ kind: 'progress', listened: this.listened });
    const isLast = this.cardIdx + 1 >= this.cards.length;
    if (isLast && !this.cfg.loop) {
      this.phase = 'done';
      this.emit({ kind: 'done', cardsListened: this.listened });
      return;
    }
    this.goToCard(isLast ? 0 : this.cardIdx + 1, true);
  }

  private skip(delta: 1 | -1): void {
    this.token += 1;
    this.emit({ kind: 'stop_speech' });
    if (delta === 1) {
      const isLast = this.cardIdx + 1 >= this.cards.length;
      if (isLast && !this.cfg.loop) {
        // ⏭ на последней без повтора — завершить (карточка НЕ засчитана: не дослушана)
        this.phase = 'done';
        this.emit({ kind: 'done', cardsListened: this.listened });
        return;
      }
      this.goToCard(isLast ? 0 : this.cardIdx + 1, true);
    } else {
      // ⏮: к предыдущей; на первой — рестарт текущей
      this.goToCard(Math.max(0, this.cardIdx - 1), false);
    }
  }

  private goToCard(index: number, tick: boolean): void {
    this.cardIdx = index;
    this.stepIdx = 0;
    if (tick) this.emit({ kind: 'tick' });
    this.emit({ kind: 'card', index, total: this.cards.length });
    if (this.phase === 'playing') this.runStep();
    else if (this.phase === 'paused') this.applyLeadingFlips();
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
