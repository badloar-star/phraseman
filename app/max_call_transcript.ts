// Чистый буфер транскрипта MAX-звонка (спека раздел 1, `max_call_transcript.ts`).
//
// Realtime API шлёт транскрипт-дельты ассистента десятки раз в секунду; если
// дёргать setState на каждую, слабые Android захлёбываются в рендерах прямо во
// время звонка. Поэтому дельты копятся здесь в мутабельном буфере (push в массив
// частей — без пересборки строки на каждый вызов), а наружу уходит один снапшот
// не чаще раза в TRANSCRIPT_FLUSH_MS и только если что-то реально изменилось.
//
// Interim-реплик юзера нет по построению: Realtime отдаёт только финальную
// транскрипцию (`conversation.item.input_audio_transcription.completed`), а
// параллельный expo-speech-recognition запрещён — драка за аудиосессию.
//
// Ноль React/native-импортов: модуль детерминирован и покрыт юнит-тестами.

export interface TranscriptTurn {
  role: 'user' | 'assistant';
  text: string;
  interrupted?: boolean;
  atMs: number;
}

/** Минимальный интервал между flush'ами наружу (один setState раз в 250мс). */
export const TRANSCRIPT_FLUSH_MS = 250;

// Внутреннее представление реплики: дельты храним массивом частей и склеиваем
// лениво — конкатенация строк на каждую дельту создавала бы мусор в горячем пути.
interface MutableTurn {
  role: 'user' | 'assistant';
  parts: string[];
  interrupted: boolean;
  closed: boolean; // completed либо interrupted: поздние дельты уже не принимаем
  atMs: number;
}

export interface TranscriptBuffer {
  pushAssistantDelta(itemId: string, delta: string): void;
  completeAssistantItem(itemId: string): void;
  /** Barge-in: оборванная реплика ИИ закрывается «—» и больше не растёт. */
  markInterrupted(itemId: string): void;
  pushUserFinal(text: string): void;
  /** Снапшот истории, если с прошлого flush прошло ≥ TRANSCRIPT_FLUSH_MS И были изменения; иначе null. */
  flushIfDue(): TranscriptTurn[] | null;
  history(): TranscriptTurn[];
  /** 'AI: …\nYou: …' — для шита с полной историей, ревью и summary. */
  fullText(): string;
}

function renderText(turn: MutableTurn): string {
  const text = turn.parts.join('');
  if (!turn.interrupted) return text;
  // Оборванную реплику показываем как в субтитрах: «…начатая фраза —».
  return text.length > 0 ? `${text} —` : '—';
}

function snapshotTurn(turn: MutableTurn): TranscriptTurn {
  const out: TranscriptTurn = { role: turn.role, text: renderText(turn), atMs: turn.atMs };
  // Поле опциональное: не тащим `interrupted: false` в каждую обычную реплику.
  if (turn.interrupted) out.interrupted = true;
  return out;
}

export function createTranscriptBuffer(now: () => number): TranscriptBuffer {
  const turns: MutableTurn[] = [];
  // itemId → реплика ассистента: дельты одного item'а должны попадать в одну
  // реплику независимо от того, что успело прийти между ними.
  const assistantByItem = new Map<string, MutableTurn>();
  let dirty = false;
  let lastFlushMs: number | null = null;

  return {
    pushAssistantDelta(itemId: string, delta: string): void {
      let turn = assistantByItem.get(itemId);
      if (turn === undefined) {
        turn = { role: 'assistant', parts: [], interrupted: false, closed: false, atMs: now() };
        assistantByItem.set(itemId, turn);
        turns.push(turn);
      }
      // Дельта после завершения/обрыва — out-of-order с сервера: игнорируем,
      // чтобы закрытая реплика (в т.ч. с «—») не «оживала» задним числом.
      if (turn.closed) return;
      if (delta.length === 0) return; // пустая дельта не считается изменением
      turn.parts.push(delta);
      dirty = true;
    },

    completeAssistantItem(itemId: string): void {
      const turn = assistantByItem.get(itemId);
      if (turn === undefined || turn.closed) return;
      turn.closed = true;
      dirty = true;
    },

    markInterrupted(itemId: string): void {
      const turn = assistantByItem.get(itemId);
      // Неизвестный item или уже закрытая реплика — no-op, не throw: события
      // data channel приходят out-of-order, транскрипт не должен от этого падать.
      if (turn === undefined || turn.closed) return;
      turn.interrupted = true;
      turn.closed = true;
      dirty = true;
    },

    pushUserFinal(text: string): void {
      turns.push({ role: 'user', parts: [text], interrupted: false, closed: true, atMs: now() });
      dirty = true;
    },

    flushIfDue(): TranscriptTurn[] | null {
      if (!dirty) return null;
      const t = now();
      if (lastFlushMs !== null && t - lastFlushMs < TRANSCRIPT_FLUSH_MS) return null;
      lastFlushMs = t;
      dirty = false;
      return turns.map(snapshotTurn);
    },

    history(): TranscriptTurn[] {
      // Всегда свежий снапшот: наружу не отдаём мутабельные внутренности.
      return turns.map(snapshotTurn);
    },

    fullText(): string {
      return turns
        .map((turn) => `${turn.role === 'assistant' ? 'AI' : 'You'}: ${renderText(turn)}`)
        .join('\n');
    },
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
