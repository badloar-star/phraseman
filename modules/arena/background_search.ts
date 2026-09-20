/**
 * Фоновый поиск соперника: очередь Арены живёт ДОЛЬШЕ экрана поиска.
 *
 * зачем (владелец 2026-09-20): «сделай так чтобы соперник продолжал искаться
 * даже если выйти и зайти в другой раздел, а когда найдётся — показать тостик
 * с кнопкой принять или отклонить, и если отклонить, то поиск должен
 * остановиться».
 *
 * До этой правки владельцем очереди был экран `app/arena_matchmaking.tsx`:
 * requestId, heartbeat, срок бота и сдача жили в его рефах и умирали вместе с
 * ним, а уход с экрана отменял очередь. Теперь владелец — этот модуль. Он
 * намеренно НЕ содержит React: состояние переживает любое перемонтирование,
 * а экраны и тост — всего лишь подписчики.
 *
 * Чего этот модуль НЕ делает, и это осознанно:
 *  • не трогает энергию — она считается снаружи (проверка на входе, списание
 *    при принятии матча); модулю нельзя знать про кошелёк;
 *  • не рисует; всё видимое — в `ArenaOpponentFoundHost` и на экране поиска;
 *  • не решает за человека: найденный матч ждёт явного «Принять».
 *
 * Логи: единый префикс `[ARENA-BGSEARCH]` — вся цепочка вытаскивается одним
 * поиском (правило владельца «сперва логи, потом починка»).
 */
import {
  ARENA_QUICK_FALLBACK_MAX_MS,
  ARENA_RANKED_FALLBACK_MAX_MS,
  ARENA_RANKED_HEARTBEAT_MS,
  type ArenaQueueMode,
} from './contract';
import type { ArenaStudyTarget } from './target_registry';

/**
 * Окно согласия принадлежит СЕРВЕРУ (`ARENA_V2_ACCEPT_MS = 12_000`).
 *
 * зачем (владелец 2026-09-20, выбор «12 секунд»): владелец сперва назвал 15, но
 * сервер держит найденный матч 12 — на 13-й секунде `arenaV2MatchAccept`
 * отвечает `accept_timeout`, и человек жал бы живую с виду кнопку впустую.
 * Значение здесь — только ЗАПАСНОЕ: настоящий срок всегда приходит в
 * `stateDeadlineAtMs` найденного матча, и тост считает по нему. Константа
 * нужна лишь тогда, когда сервер срок не прислал (старый документ, обрезанный
 * ответ) — иначе отсчёт было бы не от чего вести.
 */
export const ARENA_ACCEPT_WINDOW_FALLBACK_MS = 12_000;

/**
 * Пауза перед повтором запроса бота после отказа сервера.
 *
 * зачем: отказы тут почти всегда временные («часы забежали», моргнула сеть), и
 * повтор стоит один вызов — держим паузу короткой. Но НЕ нулевой: без неё
 * повтор уходил в тот же кадр и превращался в шторм вызовов платной функции.
 */
export const ARENA_BOT_RETRY_MS = 1_500;

export type ArenaBackgroundSearchPhase =
  /** Поиска нет. */
  | 'idle'
  /** Очередь живёт, соперник ещё не найден. */
  | 'searching'
  /** Приложение свёрнуто: таймеры остановлены, очередь не тронута. */
  | 'paused'
  /** Соперник найден, ждём решения человека. */
  | 'found'
  /** Поиск закончен (отказ, отмена, молчание, неудача). */
  | 'stopped';

export type ArenaBackgroundSearchStopReason =
  | 'cancelled'
  | 'declined'
  | 'accept_timeout'
  | 'accepted'
  | 'no_opponent'
  | 'insufficient_energy'
  | 'account_changed';

export type ArenaBackgroundSearchFound = Readonly<{
  matchId: string;
  /** Абсолютный серверный срок решения. Тост считает отсчёт ТОЛЬКО по нему. */
  acceptDeadlineAtMs: number;
  opponentName?: string;
  opponentAvatar?: string;
  opponentStars?: number;
}>;

export type ArenaBackgroundSearchState = Readonly<{
  phase: ArenaBackgroundSearchPhase;
  mode: ArenaQueueMode | null;
  studyTarget: ArenaStudyTarget | null;
  requestId: string | null;
  /** Момент подтверждения очереди сервером; до него секундомер стоит на нуле. */
  startedAtMs: number | null;
  found: ArenaBackgroundSearchFound | null;
  stopReason: ArenaBackgroundSearchStopReason | null;
}>;

export const ARENA_BACKGROUND_SEARCH_IDLE: ArenaBackgroundSearchState = Object.freeze({
  phase: 'idle',
  mode: null,
  studyTarget: null,
  requestId: null,
  startedAtMs: null,
  found: null,
  stopReason: null,
});

export type ArenaBackgroundSearchQueueTicket = Readonly<{
  joinedAtMs?: number;
  botDueAtMs?: number;
}>;

export type ArenaBackgroundSearchMatched = Readonly<{
  matchId: string;
  /** Серверный срок решения; отсутствует у старых документов. */
  acceptDeadlineAtMs?: number;
  opponentName?: string;
  opponentAvatar?: string;
  opponentStars?: number;
}>;

export type ArenaBackgroundSearchFindResult = Readonly<{
  queue?: ArenaBackgroundSearchQueueTicket | null;
  match?: ArenaBackgroundSearchMatched | null;
}>;

export type ArenaBackgroundSearchDeps = Readonly<{
  /** Постановка в очередь / продление той же очереди тем же requestId. */
  findMatch: (
    mode: ArenaQueueMode,
    studyTarget: ArenaStudyTarget,
    requestId: string,
  ) => Promise<ArenaBackgroundSearchFindResult>;
  /** Запрос бота по серверному сроку. */
  requestBot: (
    mode: ArenaQueueMode,
    studyTarget: ArenaStudyTarget,
    requestId: string,
  ) => Promise<ArenaBackgroundSearchMatched>;
  cancelQueue: (studyTarget: ArenaStudyTarget, requestId: string) => Promise<void>;
  /** Отказ от найденного матча: обязателен и для кнопки, и для молчания. */
  declineMatch: (matchId: string, studyTarget: ArenaStudyTarget) => Promise<void>;
  createRequestId: () => string;
  nowMs: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  log: (message: string) => void;
}>;

type Timers = Readonly<{ heartbeat: unknown; bot: unknown; accept: unknown }>;

/**
 * Единственный владелец очереди.
 *
 * Класс, а не набор функций: у поиска есть живые таймеры и подписчики, а
 * прятать их в модульных переменных значило бы сделать состояние непроверяемым
 * в тестах. Синглтон создаётся в `app/arena_background_search.ts`.
 */
export class ArenaBackgroundSearch {
  private state: ArenaBackgroundSearchState = ARENA_BACKGROUND_SEARCH_IDLE;

  private readonly listeners = new Set<(state: ArenaBackgroundSearchState) => void>();

  private timers: Timers = { heartbeat: null, bot: null, accept: null };

  /** Запрос бота в полёте: гасить поиск под ним нельзя — матч уже создаётся. */
  private botInFlight = false;

  /** Серверный срок бота (botDueAtMs - joinedAtMs), назначает только сервер. */
  private botDueDelayMs: number | null = null;

  /**
   * Не просить бота раньше этого момента.
   *
   * зачем (найдено сторожем 2026-09-20): срок бота уже в прошлом, когда сервер
   * отбил запрос (`arena_quick_bot_too_early`, моргнувшая сеть). Без этой
   * отсечки повтор ставился на 0 мс, мгновенно отбивался снова — и получался
   * шторм вызовов к платной функции, пока человек смотрит на пульс. Пауза
   * короткая: отказы здесь почти всегда временные, и ждать долго незачем.
   */
  private botRetryNotBeforeMs = 0;

  constructor(private readonly deps: ArenaBackgroundSearchDeps) {}

  getState(): ArenaBackgroundSearchState {
    return this.state;
  }

  subscribe(listener: (state: ArenaBackgroundSearchState) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /**
   * Начать поиск. Повторный вызов при живом поиске НЕ создаёт вторую очередь.
   *
   * зачем: два requestId на один аккаунт — это два билета, из которых сервер
   * закроет один, а клиент будет ждать другой. Именно так рождается «поиск
   * идёт вечно». Экран поиска может монтироваться дважды (StrictMode,
   * возврат назад), поэтому защита живёт здесь, а не на экране.
   */
  start(mode: ArenaQueueMode, studyTarget: ArenaStudyTarget): ArenaBackgroundSearchState {
    if (this.state.phase === 'searching' || this.state.phase === 'paused'
      || this.state.phase === 'found') {
      this.deps.log(`[ARENA-BGSEARCH] start ignored: already ${this.state.phase} `
        + `mode=${this.state.mode} requestId=${this.state.requestId}`);
      return this.state;
    }
    const requestId = this.deps.createRequestId();
    this.botDueDelayMs = null;
    this.botInFlight = false;
    this.botRetryNotBeforeMs = 0;
    this.deps.log(`[ARENA-BGSEARCH] start mode=${mode} target=${studyTarget} requestId=${requestId}`);
    this.publish({
      phase: 'searching',
      mode,
      studyTarget,
      requestId,
      startedAtMs: null,
      found: null,
      stopReason: null,
    });
    void this.reconcile('start');
    this.armHeartbeat();
    return this.state;
  }

  /**
   * Приложение ушло в фон: таймеры глохнут, очередь на сервере не трогается.
   *
   * зачем (владелец 2026-09-20, выбор «поиск ставится на паузу»): фоновые
   * таймеры на телефоне всё равно недостоверны, а батарею жгут. Очередь при
   * этом отменять нельзя — человек вернётся и ждёт свой поиск на месте.
   */
  pause(): void {
    if (this.state.phase !== 'searching') {
      this.deps.log(`[ARENA-BGSEARCH] pause ignored: phase=${this.state.phase}`);
      return;
    }
    this.clearAllTimers();
    this.deps.log(`[ARENA-BGSEARCH] pause requestId=${this.state.requestId}`);
    this.publish({ ...this.state, phase: 'paused' });
  }

  resume(): void {
    if (this.state.phase !== 'paused') {
      this.deps.log(`[ARENA-BGSEARCH] resume ignored: phase=${this.state.phase}`);
      return;
    }
    this.deps.log(`[ARENA-BGSEARCH] resume requestId=${this.state.requestId}`);
    this.publish({ ...this.state, phase: 'searching' });
    void this.reconcile('resume');
    this.armHeartbeat();
    this.armBot();
  }

  /**
   * Остановить поиск. Единственная точка выхода — и для кнопки «Отклонить», и
   * для молчания, и для отмены, и для нехватки энергии при принятии.
   *
   * зачем: пока путей выхода было несколько, каждый забывал свою часть уборки
   * (то очередь, то матч). Здесь уборка одна и полная.
   */
  stop(reason: ArenaBackgroundSearchStopReason): void {
    const { phase, requestId, studyTarget, found } = this.state;
    if (phase === 'idle' || phase === 'stopped') {
      this.deps.log(`[ARENA-BGSEARCH] stop ignored: phase=${phase} reason=${reason}`);
      return;
    }
    this.clearAllTimers();
    this.botInFlight = false;
    this.botDueDelayMs = null;
    this.botRetryNotBeforeMs = 0;
    this.deps.log(`[ARENA-BGSEARCH] stop reason=${reason} phase=${phase} `
      + `requestId=${requestId} matchId=${found?.matchId ?? 'none'}`);

    // Найденный матч закрываем ЯВНО: на том конце может ждать живой человек.
    // 'accepted' — единственный случай, когда матч нужен дальше.
    if (found && studyTarget && reason !== 'accepted') {
      void this.deps.declineMatch(found.matchId, studyTarget).catch((error: unknown) => {
        this.deps.log(`[ARENA-BGSEARCH] decline failed matchId=${found.matchId} `
          + `reason=${reason}: ${String(error)}`);
      });
    }
    // Очередь снимаем, только если матча ещё не было: после находки билет уже
    // закрыт сервером, и повторный cancel ничего не значит.
    if (!found && requestId && studyTarget) {
      void this.deps.cancelQueue(studyTarget, requestId).catch((error: unknown) => {
        this.deps.log(`[ARENA-BGSEARCH] cancel failed requestId=${requestId}: ${String(error)}`);
      });
    }
    this.publish({
      ...ARENA_BACKGROUND_SEARCH_IDLE,
      phase: 'stopped',
      stopReason: reason,
    });
  }

  /** Человек принял матч: поиск закончен, матч остаётся жить. */
  acknowledgeAccepted(): void {
    this.stop('accepted');
  }

  /** Полный сброс до `idle` — после того как «стоп» показан человеку. */
  reset(): void {
    if (this.state.phase !== 'stopped') return;
    this.publish(ARENA_BACKGROUND_SEARCH_IDLE);
  }

  private publish(next: ArenaBackgroundSearchState): void {
    this.state = Object.freeze(next);
    this.listeners.forEach((listener) => listener(this.state));
  }

  private clearAllTimers(): void {
    if (this.timers.heartbeat !== null) this.deps.clearTimer(this.timers.heartbeat);
    if (this.timers.bot !== null) this.deps.clearTimer(this.timers.bot);
    if (this.timers.accept !== null) this.deps.clearTimer(this.timers.accept);
    this.timers = { heartbeat: null, bot: null, accept: null };
  }

  /**
   * Сверка с сервером: подтверждает очередь и подхватывает живого соперника,
   * вставшего в очередь позже. Один вызов раз в ARENA_RANKED_HEARTBEAT_MS и
   * только пока приложение на переднем плане — фонового опроса нет.
   */
  private armHeartbeat(): void {
    if (this.timers.heartbeat !== null) this.deps.clearTimer(this.timers.heartbeat);
    this.timers = {
      ...this.timers,
      heartbeat: this.deps.setTimer(() => {
        this.timers = { ...this.timers, heartbeat: null };
        if (this.state.phase !== 'searching') return;
        void this.reconcile('heartbeat');
        this.armHeartbeat();
      }, ARENA_RANKED_HEARTBEAT_MS),
    };
  }

  private async reconcile(origin: string): Promise<void> {
    const { mode, studyTarget, requestId } = this.state;
    if (!mode || !studyTarget || !requestId) {
      this.deps.log(`[ARENA-BGSEARCH] reconcile(${origin}) skipped: no active queue`);
      return;
    }
    const startedAt = this.deps.nowMs();
    try {
      const result = await this.deps.findMatch(mode, studyTarget, requestId);
      const tookMs = this.deps.nowMs() - startedAt;
      // Поиск мог кончиться, пока ответ был в пути: поздний ответ НЕ воскрешает
      // остановленный поиск и не затирает свежее состояние.
      if (this.state.requestId !== requestId) {
        this.deps.log(`[ARENA-BGSEARCH] reconcile(${origin}) stale: requestId changed `
          + `${requestId} -> ${this.state.requestId ?? 'none'}`);
        return;
      }
      if (this.state.phase === 'stopped' || this.state.phase === 'idle') {
        this.deps.log(`[ARENA-BGSEARCH] reconcile(${origin}) dropped: phase=${this.state.phase}`);
        return;
      }
      if (this.state.startedAtMs === null) {
        this.publish({ ...this.state, startedAtMs: this.deps.nowMs() });
        this.deps.log(`[ARENA-BGSEARCH] queue confirmed origin=${origin} took=${tookMs}ms`);
      }
      this.adoptBotSchedule(result.queue ?? null);
      if (result.match) {
        this.handleFound(result.match, `reconcile:${origin}`);
        return;
      }
      this.armBot();
    } catch (error) {
      // Молчащая сверка была бы невидима: heartbeat продолжает ту же очередь,
      // но причину обязан назвать (запрет немого catch).
      this.deps.log(`[ARENA-BGSEARCH] reconcile(${origin}) failed mode=${mode} `
        + `requestId=${requestId} took=${this.deps.nowMs() - startedAt}ms: ${String(error)}`);
    }
  }

  private adoptBotSchedule(ticket: ArenaBackgroundSearchQueueTicket | null): void {
    const due = Number(ticket?.botDueAtMs);
    const joined = Number(ticket?.joinedAtMs);
    if (!Number.isFinite(due) || !Number.isFinite(joined)) return;
    const capMs = this.state.mode === 'quick'
      ? ARENA_QUICK_FALLBACK_MAX_MS
      : ARENA_RANKED_FALLBACK_MAX_MS;
    // Потолок по режиму — страховка от старых билетов с длинным сроком; сам
    // момент входа бота назначает только сервер.
    this.botDueDelayMs = Math.max(0, Math.min(capMs, due - joined));
    this.deps.log(`[ARENA-BGSEARCH] bot schedule adopted due=${due - joined}ms `
      + `capped=${this.botDueDelayMs}ms mode=${this.state.mode}`);
  }

  private armBot(): void {
    if (this.state.phase !== 'searching') return;
    if (this.botDueDelayMs === null || this.botInFlight) return;
    if (this.timers.bot !== null) return;
    const startedAtMs = this.state.startedAtMs;
    if (startedAtMs === null) return;
    const fireAtMs = Math.max(
      startedAtMs + this.botDueDelayMs,
      this.botRetryNotBeforeMs,
    );
    const fireInMs = Math.max(0, fireAtMs - this.deps.nowMs());
    this.timers = {
      ...this.timers,
      bot: this.deps.setTimer(() => {
        this.timers = { ...this.timers, bot: null };
        void this.requestBot();
      }, fireInMs),
    };
  }

  private async requestBot(): Promise<void> {
    const { mode, studyTarget, requestId, phase } = this.state;
    if (phase !== 'searching' || !mode || !studyTarget || !requestId) {
      this.deps.log(`[ARENA-BGSEARCH] bot request skipped: phase=${phase}`);
      return;
    }
    this.botInFlight = true;
    const startedAt = this.deps.nowMs();
    this.deps.log(`[ARENA-BGSEARCH] bot requested mode=${mode} requestId=${requestId} `
      + `after=${startedAt - (this.state.startedAtMs ?? startedAt)}ms`);
    try {
      const match = await this.deps.requestBot(mode, studyTarget, requestId);
      this.botInFlight = false;
      if (this.state.requestId !== requestId || this.state.phase !== 'searching') {
        this.deps.log('[ARENA-BGSEARCH] bot answer dropped: search no longer current');
        return;
      }
      this.handleFound(match, 'bot');
    } catch (error) {
      this.botInFlight = false;
      // Отказ почти всегда временный (часы забежали, сеть моргнула): следующая
      // сверка попробует снова. Причину называем всегда.
      this.deps.log(`[ARENA-BGSEARCH] bot rejected mode=${mode} requestId=${requestId} `
        + `took=${this.deps.nowMs() - startedAt}ms retryInMs=${ARENA_BOT_RETRY_MS}: ${String(error)}`);
      this.botRetryNotBeforeMs = this.deps.nowMs() + ARENA_BOT_RETRY_MS;
      if (this.state.phase === 'searching') this.armBot();
    }
  }

  private handleFound(match: ArenaBackgroundSearchMatched, origin: string): void {
    this.clearAllTimers();
    const serverDeadline = Number(match.acceptDeadlineAtMs);
    /**
     * Отсчёт ведём по СЕРВЕРНОМУ сроку: он и решает, примут ли ответ.
     * Запасное окно нужно лишь когда срок не пришёл — иначе тосту было бы не
     * от чего считать, и он показал бы вечную кнопку.
     */
    const acceptDeadlineAtMs = Number.isFinite(serverDeadline) && serverDeadline > 0
      ? serverDeadline
      : this.deps.nowMs() + ARENA_ACCEPT_WINDOW_FALLBACK_MS;
    this.deps.log(`[ARENA-BGSEARCH] opponent found origin=${origin} matchId=${match.matchId} `
      + `deadlineIn=${acceptDeadlineAtMs - this.deps.nowMs()}ms `
      + `serverDeadline=${Number.isFinite(serverDeadline) ? serverDeadline : 'missing'}`);
    this.publish({
      ...this.state,
      phase: 'found',
      found: {
        matchId: match.matchId,
        acceptDeadlineAtMs,
        opponentName: match.opponentName,
        opponentAvatar: match.opponentAvatar,
        opponentStars: match.opponentStars,
      },
    });
    this.armAcceptDeadline(acceptDeadlineAtMs);
  }

  /**
   * Молчание равно отказу.
   *
   * зачем (владелец 2026-09-20): «через 15 сек сам = Отклонить, поиск
   * останавливается». Втягивать человека в матч, пока он за рулём или в
   * переписке, нельзя — это проигрыш ни за что. На том конце может ждать живой
   * соперник, и он не должен ждать дольше серверного срока.
   */
  private armAcceptDeadline(deadlineAtMs: number): void {
    this.timers = {
      ...this.timers,
      accept: this.deps.setTimer(() => {
        this.timers = { ...this.timers, accept: null };
        if (this.state.phase !== 'found') return;
        this.deps.log('[ARENA-BGSEARCH] accept window elapsed — treating silence as decline');
        this.stop('accept_timeout');
      }, Math.max(0, deadlineAtMs - this.deps.nowMs())),
    };
  }
}
