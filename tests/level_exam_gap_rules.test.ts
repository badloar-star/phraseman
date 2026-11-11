/**
 * Сторож «в пропуск подходит ровно один вариант» для экзамена уровня (владелец, U10, 11.11.2026).
 *
 * зачем: экзамен собирал «Are you ___?» с вариантами free / okay / tired и «We buy ___» с food / coffee — все варианты верны,
 * а засчитывался один. Теперь пропуск выдаётся только по правилам грамматики (app/level_exam_gap_rules.ts). Сторож держит:
 *  1) правила — на примерах владельца и на крайних случаях каждого правила;
 *  2) выдачу держит соседний сторож tests/level_exam_gap_provable_issue.test.ts.
 * Сработал — чинить отбор заданий, а не ослаблять сторожа.
 */
import { provableGap, provableGapByRule, type GapRuleInput } from '../app/level_exam_gap_rules';

const known = (): boolean => true;
const input = (sentence: string, answer: string, extra: Partial<GapRuleInput> = {}): GapRuleInput => ({
  sentence, answer, authored: [], categoryPool: [], isKnown: known, ...extra,
});
const lower = (values: readonly string[]): string[] => values.map((value) => value.toLocaleLowerCase()).sort();

describe('правила доказуемого пропуска', () => {
  it('эталон владельца: «They walk ___ the evening» → in, соблазны on / at / to', () => {
    const result = provableGap(input('They walk in the evening', 'in', { authored: ['on', 'at', 'to', 'as', 'by'] }));
    expect(result?.rule).toBe('time');
    expect(result?.answer).toBe('in');
    expect(lower(result?.distractors ?? [])).toEqual(['at', 'on', 'to']);
  });

  it('примеры владельца: смысловой пропуск не выдаётся вовсе', () => {
    // «Are you free / okay / tired?» и «We buy food / coffee» — все варианты верны, доказать единственность нечем
    expect(provableGap(input('Are you okay?', 'okay', { category: 'adjective', categoryPool: ['free', 'tired', 'okay'] }))).toBeNull();
    expect(provableGap(input('We buy food', 'food', { category: 'noun', categoryPool: ['coffee', 'food', 'English'] }))).toBeNull();
    // зато в этих же фразах есть доказуемый пропуск — согласование глагола с местоимением
    expect(provableGap(input('Are you okay?', 'Are'))).toEqual({ rule: 'be', answer: 'Are', distractors: expect.arrayContaining(['Am', 'Is']) });
  });

  it('взаимозаменяемые слова не становятся пропуском: вопросительные, he/she, предлоги места, this/that', () => {
    expect(provableGap(input('Where do you live?', 'Where'))).toBeNull();
    expect(provableGap(input('She cooked dinner yesterday', 'She'))).toBeNull();
    expect(provableGap(input('The cat is on the table', 'on'))).toBeNull();
    expect(provableGap(input('This plan is worse', 'This'))).toBeNull();
    expect(provableGap(input('She should take off shoes', 'should'))).toBeNull();
  });

  it('time: только однозначное время; «on/at weekends» и «by nine» не проходят', () => {
    expect(provableGap(input('I start work at nine', 'at'))?.distractors.map((word) => word.toLowerCase()).sort()).toEqual(['in', 'on', 'to']);
    expect(provableGap(input('They rest on Sunday', 'on'))?.rule).toBe('time');
    expect(provableGap(input('We meet in May', 'in'))?.rule).toBe('time');
    expect(provableGap(input('They meet on weekends', 'on'))).toBeNull();
    expect(provableGap(input('She lives in London', 'in'))).toBeNull();
  });

  it('subj: соблазны — только несогласованные или в форме дополнения; he/she/it друг друга не подменяют', () => {
    const result = provableGapByRule('subj', input('He has a phone', 'He', { authored: ['him', 'his', 'she'] }));
    expect(result?.answer).toBe('He');
    for (const word of lower(result?.distractors ?? [])) expect(['she', 'it', 'his']).not.toContain(word);
    expect(lower(result?.distractors ?? [])).toContain('him');
  });

  it('be / do / have / past: каждый соблазн не согласуется с соседним местоимением', () => {
    expect(lower(provableGap(input('She was writing a message', 'was'))?.distractors ?? [])).toEqual(['am', 'are', 'were']);
    expect(lower(provableGap(input('It has changed', 'has'))?.distractors ?? [])).toEqual(['am', 'are', 'have']);
    expect(lower(provableGap(input('It does not work', 'does'))?.distractors ?? [])).toEqual(['am', 'are', 'do']);
    // «I do it» — смысловой глагол: правило согласования соблазны не отсекает
    expect(provableGapByRule('do', input('I do it every day', 'do'))).toBeNull();
    // подлежащее-существительное: согласование по местоимению не применимо
    expect(provableGap(input('My parents are at work', 'are'))).toBeNull();
    // указательные согласуются как it / they — на них держится урок притяжательных («This is my phone», «Are these bags ours?»)
    expect(lower(provableGap(input('This is my phone', 'is'))?.distractors ?? [])).toEqual(expect.arrayContaining(['am', 'are']));
    expect(lower(provableGap(input('Are these bags ours?', 'Are'))?.distractors ?? [])).toEqual(expect.arrayContaining(['am', 'is']));
    expect(provableGap(input('This phone is mine', 'is'))).toBeNull();
  });

  it('art: «the» и притяжательные в соблазны не попадают; исключения по звуку учитываются', () => {
    const a = provableGap(input('I have a question', 'a', { authored: ['an', 'the', 'at'] }));
    expect(a?.rule).toBe('art');
    expect(lower(a?.distractors ?? [])).not.toContain('the');
    expect(lower(a?.distractors ?? [])).toContain('an');
    expect(provableGap(input('I have been waiting for an hour', 'an'))?.rule).toBe('art');
    expect(provableGap(input('He studies at a university', 'a'))?.rule).toBe('art');
    expect(provableGapByRule('art', input('I have a few ideas', 'a'))).toBeNull();
  });

  it('verb: основа, равная прошедшему времени, и неправильное прошедшее соблазном не становятся', () => {
    const pool = ['speak', 'speaks', 'live', 'lives', 'read', 'took', 'cost', 'costs', 'call'];
    const result = provableGap(input('She speaks English', 'speaks', { category: 'verb', categoryPool: pool }));
    expect(result?.rule).toBe('verb');
    expect(lower(result?.distractors ?? [])).toEqual(['call', 'live', 'speak']);
    // «It cost money» верно в прошедшем — пропуск не выдаётся
    expect(provableGapByRule('verb', input('It costs money', 'costs', { category: 'verb', categoryPool: pool }))).toBeNull();
  });

  it('слов вне пройденных уроков в соблазнах нет; не хватило — пропуска нет', () => {
    expect(provableGap(input('I have a question', 'a', { isKnown: (word) => ['a', 'an', 'these'].includes(word) }))).toBeNull();
  });
});
