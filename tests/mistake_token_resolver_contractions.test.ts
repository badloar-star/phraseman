// зачем (Сверка 15.10, evidence/replay_1015 p3): «she's safe» против «She is tired» записывало промахом «She» вместо «tired».
import { resolvePhraseMistakeToken } from '../app/mistake_token_resolver';

describe('слово-промах: сокращения равны полной форме', () => {
  it("«she's safe» против «She is tired» → промах «tired», выбрано «safe»", () => {
    expect(resolvePhraseMistakeToken('She is tired', "she's safe")).toMatchObject({ tokenText: 'tired', tokenIndex: 2, expected: 'tired', picked: 'safe' });
  });

  it('эталон с сокращением, ответ полной формой — то же', () => {
    expect(resolvePhraseMistakeToken("She's tired", 'she is safe')).toMatchObject({ tokenText: 'tired', tokenIndex: 1, picked: 'safe' });
  });

  it('верный ответ в другой форме сокращения — промаха нет', () => {
    expect(resolvePhraseMistakeToken('She is tired', "she's tired")).toBeUndefined();
    expect(resolvePhraseMistakeToken('I do not know', "I don't know")).toBeUndefined();
    expect(resolvePhraseMistakeToken('I cannot swim', "I can't swim")).toBeUndefined();
    expect(resolvePhraseMistakeToken('She has gone', "she's gone")).toBeUndefined();
    expect(resolvePhraseMistakeToken('She is tired', 'she’s tired')).toBeUndefined();
  });

  it('прежнее поведение без сокращений не меняется', () => {
    expect(resolvePhraseMistakeToken('Does she work here?', 'Do she work here?')).toMatchObject({ tokenText: 'Does', tokenIndex: 0, picked: 'Do' });
    expect(resolvePhraseMistakeToken('I like tea', 'I like tea')).toBeUndefined();
    expect(resolvePhraseMistakeToken('I like tea', 'I like tea too')).toMatchObject({ tokenText: 'tea', tokenIndex: 2, picked: 'too' });
    expect(resolvePhraseMistakeToken('I like tea', 'I like')).toMatchObject({ tokenText: 'tea', tokenIndex: 2, picked: undefined });
  });

  it('притяжательное не раскрывается: «John\'s» ≠ «John is»', () => {
    expect(resolvePhraseMistakeToken('John is here', "John's here")).toMatchObject({ tokenIndex: 0 });
  });
});
