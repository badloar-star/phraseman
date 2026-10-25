// зачем (жалоба владельца 25.10 «в диалогах подсказки почему не относятся никак к реплике собеседника»): подсказки «Можно сказать…» —
// ответы на ПОСЛЕДНЮЮ реплику собеседника; не распознали — подсказок нет (решение координатора: лучше не показывать, чем нерелевантные).
// Сторож на 10 реплик четырёх языков, мягкий ответ «скажи на изучаемом языке» пропускается, журнал [DIALOG-HINTS] называет причину.
import {
  dialogueV2SayHintsForPartnerReply,
  lastPartnerReplyForHints,
  sayHintKindForPartnerReply,
} from '../app/dialogue_v2_say_hints_pick';
import { pickDialogueNotUnderstoodReply } from '../app/dialogue_v2_off_language';
import { readSource } from './helpers/read_source';

const TEN: ReadonlyArray<readonly [string, string, string | null]> = [
  ['en', 'Hello! How are you today?', 'howAreYou'],
  ['en', "Nice to meet you. What's your name?", 'introduce'],
  ['en', 'Hi there! What would you like to drink?', 'order'],
  ['en', 'Shall we meet at the station at six?', 'confirm'],
  ['en', 'Do you like living in the city?', 'generic'],
  ['en', 'The weather was terrible yesterday.', null],
  ['es', '¡Hola! ¿Cómo te llamas?', 'introduce'],
  ['es', '¿Qué tal si vamos al cine mañana?', 'confirm'],
  ['fr', 'Bonjour ! Comment ça va ?', 'howAreYou'],
  ['de', 'Tschüss, bis morgen!', 'goodbye'],
];

describe('подсказки по реплике собеседника — 10 реплик', () => {
  it.each(TEN)('[%s] %s → %s', (target, text, kind) => {
    expect(sayHintKindForPartnerReply(text, target)?.kind ?? null).toBe(kind);
  });

  it('распознанная реплика даёт подсказки, нераспознанная — пусто', () => {
    const shown = dialogueV2SayHintsForPartnerReply({ screen: 'scenario', studyTarget: 'en', interfaceLang: 'ru', reply: { id: 'persona_3', text: 'How are you?' } });
    expect(shown.map((hint) => hint.text)).toContain("I'm fine, thank you.");
    const hidden = dialogueV2SayHintsForPartnerReply({ screen: 'scenario', studyTarget: 'en', interfaceLang: 'ru', reply: { id: 'persona_5', text: 'The weather was terrible yesterday.' } });
    expect(hidden).toEqual([]);
    expect(dialogueV2SayHintsForPartnerReply({ screen: 'freeform', studyTarget: 'en', interfaceLang: 'ru', reply: null })).toEqual([]);
  });

  it('язык без набора (it) — пусто', () => {
    expect(sayHintKindForPartnerReply('Ciao! Come stai?', 'it')).toBeNull();
  });
});

describe('какая реплика — последняя реплика собеседника', () => {
  const nudge = pickDialogueNotUnderstoodReply('en', null).text;
  it('мягкий ответ «скажи на изучаемом языке» пропускается — отвечаем на вопрос перед ним', () => {
    const messages = [
      { id: 'persona_0', author: 'persona', text: "What's your name?" },
      { id: 'learner_2', author: 'learner', text: 'Меня зовут Аня' },
      { id: 'persona_3', author: 'persona', text: nudge },
    ];
    const picked = lastPartnerReplyForHints(messages, (m) => m.author === 'persona');
    expect(picked).toEqual({ reply: { id: 'persona_0', text: "What's your name?" }, skippedNudge: 1 });
  });
  it('реплики ученика после вопроса не мешают', () => {
    const messages = [
      { id: 'a1', author: 'assistant', text: 'Hello! How are you?' },
      { id: 'l2', author: 'learner', text: 'Fine' },
    ];
    expect(lastPartnerReplyForHints(messages, (m) => m.author === 'assistant').reply?.id).toBe('a1');
  });
});

describe('журнал и проводка', () => {
  it('[DIALOG-HINTS] пишет реплику, источник, тип, ключ, причину и показанные фразы', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    dialogueV2SayHintsForPartnerReply({ screen: 'freeform', studyTarget: 'de', interfaceLang: 'ru', reply: { id: 'a9', text: 'Wie geht es dir?' } });
    const line = log.mock.calls.find((args) => args[0] === '[DIALOG-HINTS]');
    log.mockRestore();
    expect(line).toBeDefined();
    expect(JSON.parse(String(line![1]))).toEqual(expect.objectContaining({
      screen: 'freeform', replyId: 'a9', replyText: 'Wie geht es dir?', source: 'local_by_reply', kind: 'howAreYou', key: 'wie_gehts', reason: 'matched',
    }));
  });
  it('оба маршрута берут подсказки по последней реплике собеседника, не по цели шага и не по счёту реплик', () => {
    const session = readSource('app/dialogue_v2_session.tsx');
    const freeform = readSource('app/dialogue_v2_freeform.tsx');
    expect(session).toContain("lastPartnerReplyForHints(messages, (message) => message.author === 'persona')");
    expect(freeform).toContain("lastPartnerReplyForHints(messages, (message) => message.author === 'assistant')");
    expect(session).not.toContain('dialogueV2ScenarioSayHints');
    expect(freeform).not.toContain('dialogueV2FreeformSayHints');
  });
});
