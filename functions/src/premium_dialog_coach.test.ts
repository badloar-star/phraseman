/**
 * Поля тренера в конверте хода: «почему так», перевод, готовые ответы, поправка.
 *
 * зачем (владелец 2026-09-14, редизайн Диалогов): шторка «Почему так» обязана
 * открываться мгновенно — «пусть не будет долгой генерации, а будет всё сразу».
 * Это достигается только тем, что поля приезжают ТЕМ ЖЕ вызовом, что и реплика.
 * Тест сторожит и форму конверта, и то, что старый конверт (без полей тренера)
 * по-прежнему разбирается — иначе выкат клиента раньше функций убил бы диалоги.
 */

import {
  parseGameEnvelope,
  sanitizeCoach,
  buildScenarioSystemPrompt,
  parseHowToSayVariants,
} from './premium_dialog';

describe('coach envelope (редизайн Диалогов 2026-09-14)', () => {
  const full = JSON.stringify({
    reply: 'Sure! [[Would you like]] it hot or iced?',
    mood: 80,
    objectivesMet: ['order_drink'],
    outcome: 'ongoing',
    characterReaction: '',
    coachTips: [],
    note: 'Would you like — вежливее, чем do you want.',
    translation: 'Конечно! Хотите горячий или со льдом?',
    suggestions: ['Hot, please.', 'Iced, please.'],
    userFix: { corrected: 'Do you have anything without sugar?', note: 'Нужно слово anything.' },
  });

  it('вытаскивает все четыре поля тренера', () => {
    const out = parseGameEnvelope(full);
    expect(out).not.toBeNull();
    expect(out!.coach).not.toBeNull();
    expect(out!.coach!.note).toContain('вежливее');
    expect(out!.coach!.translation).toContain('Хотите горячий');
    expect(out!.coach!.suggestions).toEqual(['Hot, please.', 'Iced, please.']);
    expect(out!.coach!.userFix).toEqual({
      corrected: 'Do you have anything without sugar?',
      note: 'Нужно слово anything.',
    });
  });

  it('старый конверт без полей тренера разбирается как раньше, coach = null', () => {
    const out = parseGameEnvelope('{"reply":"What size?","mood":80,"outcome":"ongoing"}');
    expect(out).not.toBeNull();
    expect(out!.reply).toBe('What size?');
    expect(out!.coach).toBeNull();
  });

  it('userFix без corrected отбрасывается (нечего показывать ученику)', () => {
    const coach = sanitizeCoach({ userFix: { note: 'что-то' }, note: 'why' });
    expect(coach).not.toBeNull();
    expect(coach!.userFix).toBeNull();
  });

  it('снимает [[маркеры]] из готовых ответов — их вставляют в поле ввода как есть', () => {
    const coach = sanitizeCoach({ suggestions: ['[[Hot]], please.', '', 'Iced, please.'] });
    expect(coach!.suggestions).toEqual(['Hot, please.', 'Iced, please.']);
  });

  it('держит не больше трёх готовых ответов', () => {
    const coach = sanitizeCoach({ suggestions: ['a', 'b', 'c', 'd', 'e'] });
    expect(coach!.suggestions).toHaveLength(3);
  });

  it('пустой объект даёт null — кнопка «Почему так» не показывается', () => {
    expect(sanitizeCoach({})).toBeNull();
    expect(sanitizeCoach({ suggestions: [] })).toBeNull();
  });

  it('обрезанный JSON не ломает разбор: reply есть, coach нет', () => {
    const out = parseGameEnvelope('{"reply":"Sure, what size?","mood":80,"not');
    expect(out!.reply).toBe('Sure, what size?');
    expect(out!.truncated).toBe(true);
    expect(out!.coach ?? null).toBeNull();
  });

  it('терминальный ход просят держать коротким — конверт должен влезть целиком', () => {
    // зачем: при обрезке JSON теряется turnState, то есть ИСХОД диалога —
    // ученик закрыл все цели, а экран молча продолжает сцену.
    const prompt = buildScenarioSystemPrompt('A2', {
      objectives: [{ id: 'order_drink', en: 'order a drink' }],
    });
    expect(prompt).toContain('On a terminal turn keep the coach fields below SHORT');
  });

  it('игровой промпт просит поля тренера и держит их в одном JSON с репликой', () => {
    const prompt = buildScenarioSystemPrompt('A2', {
      objectives: [{ id: 'order_drink', en: 'order a drink' }],
    });
    expect(prompt).toContain('COACH FIELDS');
    expect(prompt).toContain('"note"');
    expect(prompt).toContain('"translation"');
    expect(prompt).toContain('"suggestions"');
    expect(prompt).toContain('"userFix"');
    // Один JSON-объект на ход: две генерации убили бы мгновенность шторки.
    expect(prompt).toContain('respond with a single JSON object');
  });
});

/**
 * «Как сказать…» — перевод НАОБОРОТ (родной → изучаемый) с вариантами.
 * зачем: без парсера, терпимого к формату, любая вольность модели (не JSON,
 * markdown-список) превращалась бы в пустой экран вместо готовых фраз.
 */
describe('parseHowToSayVariants', () => {
  it('разбирает JSON-массив с подсказками', () => {
    const out = parseHowToSayVariants(
      '[{"text":"Do you have anything without sugar?","hint":"вежливо, в кафе"},{"text":"Is this sugar-free?","hint":"про конкретный напиток"}]',
    );
    expect(out).toEqual([
      { text: 'Do you have anything without sugar?', hint: 'вежливо, в кафе' },
      { text: 'Is this sugar-free?', hint: 'про конкретный напиток' },
    ]);
  });

  it('снимает ```json-ограждения', () => {
    const out = parseHowToSayVariants('```json\n[{"text":"To go, please."}]\n```');
    expect(out).toEqual([{ text: 'To go, please.', hint: '' }]);
  });

  it('терпит массив голых строк', () => {
    const out = parseHowToSayVariants('["Hot, please.","Iced, please."]');
    expect(out.map((v) => v.text)).toEqual(['Hot, please.', 'Iced, please.']);
  });

  it('терпит объект с полем variants', () => {
    const out = parseHowToSayVariants('{"variants":[{"text":"Thanks a lot."}]}');
    expect(out).toEqual([{ text: 'Thanks a lot.', hint: '' }]);
  });

  it('фолбэк на построчный разбор, если модель ответила не JSON', () => {
    const out = parseHowToSayVariants('1. Hot, please.\n2. Iced, please.');
    expect(out.map((v) => v.text)).toEqual(['Hot, please.', 'Iced, please.']);
  });

  it('держит не более двух вариантов', () => {
    const out = parseHowToSayVariants('["a","b","c","d"]');
    expect(out).toHaveLength(2);
  });

  it('пустой ответ даёт пустой список, не бросая', () => {
    expect(parseHowToSayVariants('')).toEqual([]);
    expect(parseHowToSayVariants('   ')).toEqual([]);
  });
});
