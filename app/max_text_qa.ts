export type MaxTextQaStatus = 'pass' | 'fail' | 'manual_review';

export type MaxTextQaClientEvent =
  | {
      type: 'response.create';
      response: {
        instructions?: string;
        output_modalities: ['text'];
      };
    }
  | {
      type: 'conversation.item.create';
      item: {
        type: 'message';
        role: 'user';
        content: [{ type: 'input_text'; text: string }];
      };
    };

export type MaxTextQaModelReply = {
  text: string;
  functionCalls?: readonly string[];
};

export interface MaxTextQaTransport {
  send(event: MaxTextQaClientEvent): void;
  receive(): Promise<MaxTextQaModelReply>;
}

export type MaxTextQaTurn = {
  speaker: 'learner' | 'max';
  text: string;
  functionCalls?: readonly string[];
};

export type MaxTextQaTranscript = {
  id: string;
  turns: MaxTextQaTurn[];
};

export type MaxTextQaCase = {
  id: string;
  greetingInstructions: string;
  learnerTurns: readonly string[];
};

export type MaxTextQaCheck = {
  status: MaxTextQaStatus;
  detail: string;
};

export type MaxTextQaReport = {
  id: string;
  checks: {
    maxStarts: MaxTextQaCheck;
    proactiveOpening: MaxTextQaCheck;
    noWaitLanguage: MaxTextQaCheck;
    maxSentenceLimit: MaxTextQaCheck;
    maxQuestionLimit: MaxTextQaCheck;
    learnerTalkShare: MaxTextQaCheck;
    endCallAfterRequest: MaxTextQaCheck;
    semanticTeachingQuality: MaxTextQaCheck;
  };
};

export type MaxTextQaExpectations = {
  requiredOpeningTerms?: readonly string[];
  endRequestPatterns?: readonly RegExp[];
};

/**
 * Turns raw Realtime server events into one auditable text reply. It records
 * tool names but never executes them; QA must not be able to end a real call.
 */
export class MaxTextQaResponseCollector {
  private text = '';
  private readonly functionCalls = new Set<string>();

  push(event: Record<string, unknown>): MaxTextQaModelReply | null {
    const type = typeof event.type === 'string' ? event.type : '';
    if (type === 'response.output_text.delta') {
      if (typeof event.delta === 'string') this.text += event.delta;
      return null;
    }

    if (type === 'response.output_text.done') {
      if (!this.text && typeof event.text === 'string') this.text = event.text;
      return null;
    }

    if (type === 'response.function_call_arguments.done') {
      if (typeof event.name === 'string' && event.name) this.functionCalls.add(event.name);
      return null;
    }

    if (type === 'response.output_item.done') {
      const item = asRecord(event.item);
      if (item?.type === 'function_call' && typeof item.name === 'string' && item.name) {
        this.functionCalls.add(item.name);
      }
      return null;
    }

    if (type !== 'response.done') return null;

    const fallbackText = extractResponseText(event);
    const reply: MaxTextQaModelReply = {
      text: this.text || fallbackText,
      ...(this.functionCalls.size > 0
        ? { functionCalls: [...this.functionCalls] }
        : {}),
    };
    this.text = '';
    this.functionCalls.clear();
    return reply;
  }
}

const WAIT_LANGUAGE_PATTERNS = [
  /\bi(?:'|’)ll (?:just )?wait\b/i,
  /\bi will (?:just )?wait\b/i,
  /\bi(?:'|’)m waiting\b/i,
  /\btake your time\b/i,
  /\bwhen you(?:'re| are) ready\b/i,
  /я подожду/i,
  /я жду/i,
  /не торопись/i,
  /когда будешь готов(?:а)?/i,
  /я зачекаю/i,
  /коли будеш готов(?:а)?/i,
  /cuando estés list[oa]/i,
  /cuando est[ée]s preparad[oa]/i,
  /quando estiver pront[oa]/i,
  /quando (?:você |voc[êe] )?estiver preparad[oa]/i,
  /khi bạn sẵn sàng/i,
  /kalau kamu sudah siap/i,
  /ketika kamu siap/i,
  /hazır olduğunda/i,
  /hazır olunca/i,
  /kiedy będziesz gotow(?:y|a)/i,
  /jak będziesz gotow(?:y|a)/i,
] as const;

const UNPUNCTUATED_QUESTION_START = /^(?:(?:who|what|when|where|why|how|is|are|am|do|does|did|can|could|would|will|have|has|was|were)\b|(?:кто|что|когда|где|почему|зачем|как|ты|вы|он|она|они|можно|можешь|можете|хто|що|коли|де|чому|навіщо|як|ти|ви|чи|qué|quién|cuándo|dónde|por qué|cómo|estás|eres|tienes|puedes|o que|quem|quando|onde|por que|como|você|está|tem|pode|ai|gì|khi nào|ở đâu|tại sao|như thế nào|bạn|siapa|apa|kapan|di mana|mengapa|bagaimana|apakah|bisakah|kamu|kim|ne|ne zaman|nerede|neden|nasıl|sen|siz|mısın|misin|kto|co|kiedy|gdzie|dlaczego|jak|czy|możesz|jesteś)(?:\s|$))/iu;

export function createMaxTextQaOpeningEvent(
  greetingInstructions: string,
): MaxTextQaClientEvent {
  return {
    type: 'response.create',
    response: {
      instructions: greetingInstructions,
      output_modalities: ['text'],
    },
  };
}

export function createMaxTextQaUserEvent(text: string): MaxTextQaClientEvent {
  return {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text }],
    },
  };
}

export function createMaxTextQaFollowupEvent(): MaxTextQaClientEvent {
  return {
    type: 'response.create',
    response: { output_modalities: ['text'] },
  };
}

export async function runMaxTextQaCase(
  transport: MaxTextQaTransport,
  testCase: MaxTextQaCase,
): Promise<MaxTextQaTranscript> {
  const turns: MaxTextQaTurn[] = [];

  transport.send(createMaxTextQaOpeningEvent(testCase.greetingInstructions));
  turns.push(replyToTurn(await transport.receive()));

  for (const learnerText of testCase.learnerTurns) {
    turns.push({ speaker: 'learner', text: learnerText });
    transport.send(createMaxTextQaUserEvent(learnerText));
    transport.send(createMaxTextQaFollowupEvent());
    turns.push(replyToTurn(await transport.receive()));
  }

  return { id: testCase.id, turns };
}

export function evaluateMaxTextQaTranscript(
  transcript: MaxTextQaTranscript,
  expectations: MaxTextQaExpectations = {},
): MaxTextQaReport {
  const maxTurns = transcript.turns.filter((turn) => turn.speaker === 'max');
  const firstTurn = transcript.turns.find((turn) => turn.text.trim().length > 0);
  const opening = firstTurn?.speaker === 'max' ? firstTurn : undefined;
  const requiredTerms = expectations.requiredOpeningTerms ?? [];

  const waitFindings = maxTurns.flatMap((turn, turnIndex) =>
    WAIT_LANGUAGE_PATTERNS
      .filter((pattern) => pattern.test(turn.text))
      .map((pattern) => `MAX turn ${turnIndex + 1}: ${pattern.source}`),
  );
  const sentenceFindings = maxTurns
    .map((turn, index) => ({ index, count: countSentences(turn.text) }))
    .filter(({ count }) => count > 3);
  const questionFindings = maxTurns
    .map((turn, index) => ({ index, count: countQuestions(turn.text) }))
    .filter(({ count }) => count > 1);

  const learnerChars = transcript.turns
    .filter((turn) => turn.speaker === 'learner')
    .reduce((sum, turn) => sum + compactLength(turn.text), 0);
  const maxChars = maxTurns.reduce((sum, turn) => sum + compactLength(turn.text), 0);
  const talkTotal = learnerChars + maxChars;
  const learnerShare = talkTotal === 0 ? 0 : learnerChars / talkTotal;

  return {
    id: transcript.id,
    checks: {
      maxStarts: check(
        opening !== undefined,
        opening ? 'MAX owns the first non-empty turn.' : 'The learner speaks before MAX.',
      ),
      proactiveOpening: evaluateOpening(opening, requiredTerms),
      noWaitLanguage: check(
        waitFindings.length === 0,
        waitFindings.length === 0
          ? 'No passive waiting phrase found.'
          : waitFindings.join('; '),
      ),
      maxSentenceLimit: check(
        sentenceFindings.length === 0,
        sentenceFindings.length === 0
          ? 'Every MAX turn has at most three sentences.'
          : sentenceFindings
            .map(({ index, count }) => `MAX turn ${index + 1}: ${count} sentences`)
            .join('; '),
      ),
      maxQuestionLimit: check(
        questionFindings.length === 0,
        questionFindings.length === 0
          ? 'Every MAX turn has at most one question.'
          : questionFindings
            .map(({ index, count }) => `MAX turn ${index + 1}: ${count} questions`)
            .join('; '),
      ),
      learnerTalkShare: check(
        learnerShare > 0.5,
        `Learner text share is ${(learnerShare * 100).toFixed(1)}%.`,
      ),
      endCallAfterRequest: evaluateEndCall(transcript, expectations.endRequestPatterns ?? []),
      semanticTeachingQuality: {
        status: 'manual_review',
        detail: 'Teaching accuracy, usefulness, and adaptation require a human review of the transcript.',
      },
    },
  };
}

function replyToTurn(reply: MaxTextQaModelReply): MaxTextQaTurn {
  return {
    speaker: 'max',
    text: reply.text,
    ...(reply.functionCalls?.length ? { functionCalls: [...reply.functionCalls] } : {}),
  };
}

function extractResponseText(event: Record<string, unknown>): string {
  const response = asRecord(event.response);
  if (!response || !Array.isArray(response.output)) return '';

  const parts: string[] = [];
  for (const output of response.output) {
    const item = asRecord(output);
    if (!item || !Array.isArray(item.content)) continue;
    for (const rawContent of item.content) {
      const content = asRecord(rawContent);
      if (!content) continue;
      if ((content.type === 'output_text' || content.type === 'text')
        && typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }
  return parts.join('');
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? value as Record<string, unknown>
    : undefined;
}

function evaluateOpening(
  opening: MaxTextQaTurn | undefined,
  requiredTerms: readonly string[],
): MaxTextQaCheck {
  if (!opening) return check(false, 'MAX did not produce the opening turn.');
  if (requiredTerms.length === 0) {
    return check(false, 'Configuration error: requiredOpeningTerms is empty.');
  }

  const normalized = normalizeSearchText(opening.text);
  const missing = requiredTerms.filter(
    (term) => !(` ${normalized} `.includes(` ${normalizeSearchText(term)} `)),
  );
  return check(
    missing.length === 0,
    missing.length === 0
      ? 'Opening contains the case goal, model, and immediate speaking cue.'
      : `Opening is missing required terms: ${missing.join(', ')}.`,
  );
}

function evaluateEndCall(
  transcript: MaxTextQaTranscript,
  endRequestPatterns: readonly RegExp[],
): MaxTextQaCheck {
  if (endRequestPatterns.length === 0) {
    return check(false, 'Configuration error: endRequestPatterns is empty.');
  }

  const requestIndex = transcript.turns.findIndex(
    (turn) => turn.speaker === 'learner'
      && endRequestPatterns.some((pattern) => testPattern(pattern, turn.text)),
  );
  const callIndexes = transcript.turns.flatMap((turn, index) =>
    turn.functionCalls?.includes('end_call') ? [index] : [],
  );

  if (requestIndex < 0) {
    return check(
      callIndexes.length === 0,
      callIndexes.length === 0
        ? 'No end request and no end_call invocation.'
        : 'end_call was invoked without a learner end request.',
    );
  }

  const earlyCall = callIndexes.some((index) => index < requestIndex);
  const laterCall = callIndexes.some((index) => index > requestIndex);
  return check(
    !earlyCall && laterCall,
    earlyCall
      ? 'end_call was invoked before the learner requested it.'
      : laterCall
        ? 'end_call was invoked after the learner request.'
        : 'Learner requested the end, but MAX did not invoke end_call.',
  );
}

function testPattern(pattern: RegExp, text: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(text);
}

function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed
    .split(/\r?\n+/)
    .filter((line) => line.trim().length > 0)
    .reduce((total, line) => {
      const endings = line.match(/[.!?]+(?=\s|$)/g);
      return total + (endings?.length ?? 1);
    }, 0);
}

function countQuestions(text: string): number {
  return text
    .split(/\r?\n+/)
    .filter((line) => line.trim().length > 0)
    .reduce((total, line) => {
      const punctuationCount = line.match(/\?/g)?.length ?? 0;
      if (punctuationCount > 0) return total + punctuationCount;
      return total + (UNPUNCTUATED_QUESTION_START.test(line.trim()) ? 1 : 0);
    }, 0);
}

function normalizeSearchText(text: string): string {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}'’]+/gu, ' ')
    .trim();
}

function compactLength(text: string): number {
  return text.replace(/\s+/g, '').length;
}

function check(passed: boolean, detail: string): MaxTextQaCheck {
  return { status: passed ? 'pass' : 'fail', detail };
}
