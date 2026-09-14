import assert from 'node:assert/strict';

import {
  createMaxTextQaFollowupEvent,
  createMaxTextQaOpeningEvent,
  createMaxTextQaUserEvent,
  evaluateMaxTextQaTranscript,
  MaxTextQaResponseCollector,
  runMaxTextQaCase,
  type MaxTextQaModelReply,
  type MaxTextQaTransport,
} from '../app/max_text_qa';

class FakeTransport implements MaxTextQaTransport {
  readonly sent: unknown[] = [];
  private readonly replies: MaxTextQaModelReply[];

  constructor(replies: MaxTextQaModelReply[]) {
    this.replies = [...replies];
  }

  send(event: unknown): void {
    this.sent.push(event);
  }

  async receive(): Promise<MaxTextQaModelReply> {
    const reply = this.replies.shift();
    assert.ok(reply, 'fake transport ran out of MAX replies');
    return reply;
  }
}

export async function runMaxTextQaGate(): Promise<void> {
  assert.deepEqual(createMaxTextQaOpeningEvent('Lead now.'), {
    type: 'response.create',
    response: {
      instructions: 'Lead now.',
      output_modalities: ['text'],
    },
  });
  assert.deepEqual(createMaxTextQaUserEvent('I am ready.'), {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'I am ready.' }],
    },
  });
  assert.deepEqual(createMaxTextQaFollowupEvent(), {
    type: 'response.create',
    response: { output_modalities: ['text'] },
  });

  const collector = new MaxTextQaResponseCollector();
  assert.equal(collector.push({ type: 'response.output_text.delta', delta: 'Say ' }), null);
  assert.equal(collector.push({ type: 'response.output_text.delta', delta: 'hello.' }), null);
  assert.equal(collector.push({
    type: 'response.function_call_arguments.done',
    name: 'end_call',
    call_id: 'call-1',
    arguments: '{}',
  }), null);
  assert.deepEqual(collector.push({ type: 'response.done', response: { output: [] } }), {
    text: 'Say hello.',
    functionCalls: ['end_call'],
  });

  const transport = new FakeTransport([
    { text: 'Today we practise introductions. Say: I am Alex. What is your name?' },
    { text: 'Good. Add where you are from.' },
    { text: 'Nice work. See you!', functionCalls: ['end_call'] },
  ]);
  const run = await runMaxTextQaCase(transport, {
    id: 'intro-01',
    greetingInstructions: 'Lead now.',
    learnerTurns: [
      'I am Dima, and I am from Kyiv. I work in product design, mostly on mobile applications. I want to speak more confidently because I often join international meetings and explain my decisions to colleagues.',
      'End the lesson now.',
    ],
  });

  assert.equal(transport.sent.length, 5);
  assert.equal((transport.sent[0] as { type: string }).type, 'response.create');
  assert.equal((transport.sent[1] as { type: string }).type, 'conversation.item.create');
  assert.equal((transport.sent[2] as { type: string }).type, 'response.create');
  assert.equal(run.turns[0]?.speaker, 'max');
  assert.equal(run.turns[1]?.speaker, 'learner');

  const report = evaluateMaxTextQaTranscript(run, {
    requiredOpeningTerms: ['practise', 'introductions', 'say'],
    endRequestPatterns: [/end the lesson/i],
  });
  assert.equal(report.checks.maxStarts.status, 'pass');
  assert.equal(report.checks.proactiveOpening.status, 'pass');
  assert.equal(report.checks.noWaitLanguage.status, 'pass');
  assert.equal(report.checks.maxSentenceLimit.status, 'pass');
  assert.equal(report.checks.maxQuestionLimit.status, 'pass');
  assert.equal(report.checks.learnerTalkShare.status, 'pass');
  assert.equal(report.checks.endCallAfterRequest.status, 'pass');
  assert.equal(report.checks.semanticTeachingQuality.status, 'manual_review');

  const badReport = evaluateMaxTextQaTranscript({
    id: 'bad-01',
    turns: [
      {
        speaker: 'max',
        text: 'I will wait. Take your time. Are you ready? What do you want?',
        functionCalls: ['end_call'],
      },
      { speaker: 'learner', text: 'Hi.' },
      { speaker: 'max', text: 'One. Two. Three. Four.' },
    ],
  }, {
    requiredOpeningTerms: ['practise'],
    endRequestPatterns: [/end the lesson/i],
  });
  assert.equal(badReport.checks.proactiveOpening.status, 'fail');
  assert.equal(badReport.checks.noWaitLanguage.status, 'fail');
  assert.equal(badReport.checks.maxSentenceLimit.status, 'fail');
  assert.equal(badReport.checks.maxQuestionLimit.status, 'fail');
  assert.equal(badReport.checks.endCallAfterRequest.status, 'fail');

  const russianWaitReport = evaluateMaxTextQaTranscript({
    id: 'wait-ru',
    turns: [{ speaker: 'max', text: 'Я подожду.' }],
  });
  assert.equal(russianWaitReport.checks.noWaitLanguage.status, 'fail');

  for (const [id, text] of [
    ['uk', 'Я зачекаю.'],
    ['es', 'Cuando estés listo, seguimos.'],
    ['pt-BR', 'Quando estiver pronto, continuamos.'],
    ['vi', 'Khi bạn sẵn sàng, chúng ta tiếp tục.'],
    ['id', 'Kalau kamu sudah siap, kita lanjut.'],
    ['tr', 'Hazır olduğunda devam ederiz.'],
    ['pl', 'Kiedy będziesz gotowy, zaczniemy.'],
  ] as const) {
    const localizedWaitReport = evaluateMaxTextQaTranscript({
      id: `wait-${id}`,
      turns: [{ speaker: 'max', text }],
    });
    assert.equal(localizedWaitReport.checks.noWaitLanguage.status, 'fail', id);
  }

  const missingConfigReport = evaluateMaxTextQaTranscript({
    id: 'missing-config',
    turns: [{ speaker: 'max', text: 'Today we practise. Say hello.' }],
  });
  assert.equal(missingConfigReport.checks.proactiveOpening.status, 'fail');
  assert.equal(missingConfigReport.checks.endCallAfterRequest.status, 'fail');

  const unpunctuatedReport = evaluateMaxTextQaTranscript({
    id: 'unpuctuated',
    turns: [{
      speaker: 'max',
      text: 'Today we practise introductions\nSay I am Lena\nAre you ready\nWhat is your name',
    }],
  }, {
    requiredOpeningTerms: ['practise', 'introductions', 'say'],
    endRequestPatterns: [/end the lesson/i],
  });
  assert.equal(unpunctuatedReport.checks.maxSentenceLimit.status, 'fail');
  assert.equal(unpunctuatedReport.checks.maxQuestionLimit.status, 'fail');

  for (const [id, text] of [
    ['ru', 'Ты готов\nКак тебя зовут'],
    ['es', 'Estás listo\nCómo te llamas'],
  ] as const) {
    const localizedQuestionReport = evaluateMaxTextQaTranscript({
      id: `questions-${id}`,
      turns: [{ speaker: 'max', text }],
    }, {
      requiredOpeningTerms: [text.split('\n')[0]],
      endRequestPatterns: [/end the lesson/i],
    });
    assert.equal(localizedQuestionReport.checks.maxQuestionLimit.status, 'fail', id);
  }

  const substringOpeningReport = evaluateMaxTextQaTranscript({
    id: 'substring-opening',
    turns: [{ speaker: 'max', text: 'Good morning. Say hello.' }],
  }, {
    requiredOpeningTerms: ['go'],
    endRequestPatterns: [/end the lesson/i],
  });
  assert.equal(substringOpeningReport.checks.proactiveOpening.status, 'fail');

  process.stdout.write('MAX TEXT QA GATE: PASS\n');
}

if (require.main === module) {
  runMaxTextQaGate().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
