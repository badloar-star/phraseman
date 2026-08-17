/**
 * Чистый UI-автомат экрана MAX-звонка (паттерн `voice_equalizer_model.ts` /
 * `dialog_outcome.ts`: ноль React, детерминированные функции под jest).
 *
 * Зачем отдельный автомат: события data channel приходят out-of-order и с
 * гонками (сеть, реконнект, оптимистичный barge-in), а UI не имеет права ни
 * упасть, ни «мигнуть» невозможным состоянием. Поэтому вместо разрозненных
 * setState — таблица допустимых переходов: недопустимое событие возвращает
 * ТОТ ЖЕ объект state (no-op по ссылке, дёшево для React), и никогда throw.
 *
 * Экономика barge-in: оптимистичный своп цвета делаем локально (латентность),
 * но если сервер за ~700мс не подтвердил речь юзера (`speech_started`) —
 * `barge_in_timeout` честно откатывает в ai_speaking, чтобы UI не «врал», что
 * ИИ замолчал, пока тот продолжает говорить из jitter-буфера.
 */

/** Фазы экрана звонка. `ended`/`failed` — терминальные, из них выхода нет. */
export type MaxCallUiPhase =
  | 'connecting'
  | 'connected_greeting'
  | 'listening'
  | 'thinking'
  | 'ai_speaking'
  | 'barge_in'
  | 'reconnecting'
  | 'wrapping_up'
  | 'ended'
  | 'failed';

/** События: серверные (data channel) + клиентские (reconnect, таймеры, кнопки). */
export type MaxCallUiEvent =
  | { type: 'connected' }
  | { type: 'greeting_started' }
  | { type: 'speech_started' }
  | { type: 'speech_stopped' }
  | { type: 'response_created' }
  | { type: 'audio_out_started' }
  | { type: 'audio_out_stopped' }
  | { type: 'audio_out_cleared' }
  | { type: 'response_done' }
  | { type: 'reconnect_started' }
  | { type: 'reconnected' }
  | { type: 'wrap_up' }
  | { type: 'end' }
  | { type: 'fail'; reason: string }
  | { type: 'barge_in_optimistic' }
  | { type: 'barge_in_timeout' };

export interface MaxCallUiState {
  phase: MaxCallUiPhase;
  /** Причина провала — только в 'failed', иначе null. */
  failReason: string | null;
  /** Чьи бары красит эквалайзер: turn-taking читается периферийным зрением. */
  eqOwner: 'user' | 'ai' | 'idle';
  /**
   * Разрешён ли hint-таймер тишины. false в connecting/reconnecting/
   * wrapping_up/терминалах: подсказка во время прощания или обрыва линии
   * ломает сценарий (и жжёт токены на response, который никто не услышит).
   */
  allowHintTimer: boolean;
}

export const MAX_CALL_UI_INITIAL: MaxCallUiState = {
  phase: 'connecting',
  failReason: null,
  eqOwner: 'idle',
  allowHintTimer: false,
};

/** Фазы, где hint-таймер в принципе разрешён (взводится он только в listening). */
const HINT_ALLOWED_PHASES: readonly MaxCallUiPhase[] = [
  'connected_greeting',
  'listening',
  'thinking',
  'ai_speaking',
  'barge_in',
];

/** Активные фазы «идущего разговора» — из них валидны wrap_up и reconnect. */
const ACTIVE_PHASES: readonly MaxCallUiPhase[] = [
  'connected_greeting',
  'listening',
  'thinking',
  'ai_speaking',
  'barge_in',
  'wrapping_up',
];

function make(phase: MaxCallUiPhase, eqOwner: MaxCallUiState['eqOwner']): MaxCallUiState {
  return {
    phase,
    failReason: null,
    eqOwner,
    allowHintTimer: HINT_ALLOWED_PHASES.includes(phase),
  };
}

/**
 * Один шаг автомата. Недопустимое для текущей фазы событие → возврат `state`
 * как есть (та же ссылка): out-of-order пакет с сервера не должен ни ронять
 * UI, ни дёргать лишний рендер. Никогда не бросает.
 */
export function reduceMaxCallUi(state: MaxCallUiState, event: MaxCallUiEvent): MaxCallUiState {
  // Терминальные фазы поглощают всё: после ended/failed любые хвостовые
  // события сети (дозвучавший response.done, поздний reconnect) — шум.
  if (state.phase === 'ended' || state.phase === 'failed') return state;

  // Глобальные переходы — валидны из любой нетерминальной фазы.
  switch (event.type) {
    case 'fail':
      return { phase: 'failed', failReason: event.reason, eqOwner: 'idle', allowHintTimer: false };
    case 'end':
      return { phase: 'ended', failReason: null, eqOwner: 'idle', allowHintTimer: false };
    case 'reconnect_started':
      // Обрыв возможен в любой момент разговора; в connecting свой fail-путь.
      if (state.phase === 'reconnecting') return state;
      if (!ACTIVE_PHASES.includes(state.phase)) return state;
      return make('reconnecting', 'idle');
    case 'wrap_up':
      // Прощание — только из живого разговора; во время реконнекта клиент
      // перепошлёт [WRAP_UP] после восстановления линии.
      if (state.phase === 'wrapping_up' || state.phase === 'reconnecting') return state;
      if (!ACTIVE_PHASES.includes(state.phase)) return state;
      return make('wrapping_up', state.eqOwner === 'ai' ? 'ai' : 'idle');
    default:
      break;
  }

  switch (state.phase) {
    case 'connecting':
      // До connect серверных аудио-событий быть не может — всё прочее no-op.
      if (event.type === 'connected') return make('connected_greeting', 'idle');
      return state;

    case 'connected_greeting':
      switch (event.type) {
        case 'greeting_started':
        case 'audio_out_started':
          return make('connected_greeting', 'ai');
        case 'audio_out_stopped':
        case 'audio_out_cleared':
          // Аудио приветствия ДОИГРАЛО — вот теперь ход юзера.
          return make('listening', 'user');
        case 'response_done':
          // зачем: владелец 2026-08-16 — «она не даёт мне сказать: реплика не
          // успевает закончиться, снизу уже текст следующей». response.done —
          // это конец ГЕНЕРАЦИИ, аудио ещё играет из буфера (модель генерирует
          // быстрее реального времени). Уход в listening здесь взводил таймер
          // подсказки под ещё звучащую речь → response.create → цепочка реплик.
          // Пока аудио играет (eqOwner ai) — ждём output_audio_buffer.stopped.
          if (state.eqOwner === 'ai') return state;
          return make('listening', 'user');
        case 'speech_started':
          // Юзер перебил приветствие (interrupt_response включён) — его ход.
          return make('listening', 'user');
        default:
          return state;
      }

    case 'listening':
      switch (event.type) {
        case 'speech_started':
          return state.eqOwner === 'user' ? state : make('listening', 'user');
        case 'speech_stopped':
          // semantic_vad с create_response сам создаст response — ждём ИИ.
          return make('thinking', 'idle');
        case 'response_created':
          return make('thinking', 'idle');
        case 'audio_out_started':
          return make('ai_speaking', 'ai');
        default:
          return state;
      }

    case 'thinking':
      switch (event.type) {
        case 'audio_out_started':
          return make('ai_speaking', 'ai');
        case 'speech_started':
          // Юзер продолжил говорить до ответа ИИ — возвращаем ему сцену.
          return make('listening', 'user');
        case 'response_done':
          // Response без аудио (пустой/отменённый) — ход снова у юзера.
          return make('listening', 'user');
        case 'response_created':
          return state; // уже думаем — повтор не меняет ничего
        default:
          return state;
      }

    case 'ai_speaking':
      switch (event.type) {
        case 'speech_started':
          // Серверный barge-in (semantic_vad) — основной путь.
          return make('barge_in', 'user');
        case 'barge_in_optimistic':
          // Локальный оптимизм (RTT>300мс или тихий remote-трек); подтверждение
          // либо придёт speech_started'ом, либо barge_in_timeout откатит.
          return make('barge_in', 'user');
        case 'audio_out_stopped':
        case 'audio_out_cleared':
          // ИИ замолчал (хвостовой таймер 400мс — забота клиента, не автомата).
          return make('listening', 'user');
        case 'response_done':
          // Генерация кончилась, аудио ещё звучит (см. connected_greeting):
          // ход юзера начнётся с output_audio_buffer.stopped, не отсюда —
          // иначе таймер подсказки стрелял под речь ИИ и порождал новую реплику.
          return state;
        default:
          return state;
      }

    case 'barge_in':
      switch (event.type) {
        case 'speech_started':
          // Сервер подтвердил речь юзера — оптимизм оправдался, это его ход.
          return make('listening', 'user');
        case 'audio_out_cleared':
        case 'audio_out_stopped':
        case 'response_done':
          // Вывод ИИ снят — перебивание состоялось.
          return make('listening', 'user');
        case 'barge_in_timeout':
          // 700мс без серверного подтверждения: ИИ на самом деле не замолкал —
          // честный откат, чтобы цвет сцены не расходился со звуком.
          return make('ai_speaking', 'ai');
        default:
          return state;
      }

    case 'reconnecting':
      // Линия оборвана: серверные события старой сессии игнорируем целиком.
      if (event.type === 'reconnected') return make('listening', 'user');
      return state;

    case 'wrapping_up':
      // Фаза не меняется до end/fail, но эквалайзер продолжает жить: ИИ
      // договаривает прощание, юзер может ответить. Hint-таймер заблокирован.
      switch (event.type) {
        case 'audio_out_started':
          return state.eqOwner === 'ai' ? state : { ...state, eqOwner: 'ai' };
        case 'speech_started':
          return state.eqOwner === 'user' ? state : { ...state, eqOwner: 'user' };
        case 'speech_stopped':
        case 'audio_out_stopped':
        case 'audio_out_cleared':
        case 'response_done':
          return state.eqOwner === 'idle' ? state : { ...state, eqOwner: 'idle' };
        default:
          return state;
      }

    default:
      return state;
  }
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
