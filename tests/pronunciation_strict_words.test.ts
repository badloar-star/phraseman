import { scorePronunciationTranscript } from '../app/pronunciation_scoring_core';

// зачем (владелец/координатор 15.10, «проверка речи принимает всё»): зачёт только если И процент ≥ порога,
// И все значимые слова фразы прозвучали. Длинные слова прощают 1–2 буквы (акцент), служебные слова
// (артикли, of/to) можно пропустить, лишнее слово в конце не мешает. Флаг strictWords=false — аварийный
// возврат к прежнему мягкому правилу.
describe('pronunciation scoring: strict significant-word check', () => {
  const pass = (targetText: string, transcript: string, strictWords?: boolean) =>
    scorePronunciationTranscript({ targetText, transcript, strictWords });

  it('passes the exact phrase', () => {
    const r = pass('Could you please open the window', 'could you please open the window');
    expect(r.passed).toBe(true);
    expect(r.missingWords).toEqual([]);
  });

  it('passes an accented reading with one slip in a long word', () => {
    expect(pass('I really appreciate your help', 'I really apreciate your help').passed).toBe(true);
    expect(pass('This is a beautiful restaurant', 'this is a beatiful restaurant').passed).toBe(true);
  });

  it('fails when a significant word is missing, even on a long phrase', () => {
    const r = pass('Could you please open the window for me', 'could you please the window for me');
    expect(r.passed).toBe(false);
    expect(r.missingWords).toEqual(['open']);
  });

  it('forgives a dropped article or "of/to"', () => {
    expect(pass('She does not read the news', 'she does not read news').passed).toBe(true);
    expect(pass('I want to see a cup of tea', 'I want see a cup tea').strictWordsOk).toBe(true);
  });

  it('fails a completely different phrase', () => {
    expect(pass('Where is the train station', 'I like green apples').passed).toBe(false);
  });

  it('fails an empty transcript', () => {
    const r = pass('Nice to meet you', '');
    expect(r.passed).toBe(false);
  });

  it('passes with an extra word at the end', () => {
    expect(pass('Nice to meet you', 'nice to meet you too').passed).toBe(true);
  });

  it('short words must match exactly (no ±1 letter for 3-letter words)', () => {
    const r = pass('I can see the car', 'I can see the cat');
    expect(r.passed).toBe(false);
    expect(r.missingWords).toEqual(['car']);
  });

  it('one heard word covers only one target word', () => {
    expect(pass('I need a big big box', 'I need a big box').passed).toBe(false);
  });

  it('reports OS per-word confidence for each target word (log only, no threshold yet)', () => {
    const r = scorePronunciationTranscript({
      targetText: 'Nice to meet you',
      transcript: 'nice to meet you',
      segments: [
        { segment: 'nice', confidence: 0.92 },
        { segment: 'to', confidence: 0.81 },
        { segment: 'meet', confidence: 0.33 },
        { segment: 'you', confidence: -1 },
      ],
    });
    expect(r.wordConfidence).toEqual([['nice', 0.92], ['to', 0.81], ['meet', 0.33], ['you', null]]);
    // низкая уверенность пока НЕ валит зачёт — порог включим после релиза по логам
    expect(r.passed).toBe(true);
  });

  it('word confidence is null for target words that were not heard', () => {
    const r = scorePronunciationTranscript({ targetText: 'I can see the car', transcript: 'I can see the cat', segments: [{ segment: 'cat', confidence: 0.9 }] });
    expect(r.wordConfidence?.find(([w]) => w === 'car')?.[1]).toBeNull();
  });

  it('kill switch: strictWords=false restores the old forgiving rule for one omitted word', () => {
    expect(pass('Could you please open the window for me', 'could you please the window for me', false).passed).toBe(true);
  });
});
