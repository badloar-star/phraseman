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

// зачем (Ревизор/координатор 15.10, до сборки): строгая проверка не должна отказывать ВЕРНОЙ речи из-за записи —
// диакритика, сокращения, элизии fr/it, числа цифрами/словами, слитно/раздельно. Каждая нормализация симметрична:
// цель и распознанный текст проходят один и тот же путь.
describe('pronunciation scoring: no false rejects of correct speech', () => {
  const ok = (targetText: string, transcript: string) =>
    scorePronunciationTranscript({ targetText, transcript });
  const both = (a: string, b: string) => {
    expect({ t: a, h: b, passed: ok(a, b).passed, missing: ok(a, b).missingWords }).toMatchObject({ passed: true });
    expect({ t: b, h: a, passed: ok(b, a).passed, missing: ok(b, a).missingWords }).toMatchObject({ passed: true });
  };

  it('en: contractions outside the old list expand symmetrically', () => {
    both("Where's the station?", 'where is the station');
    both("How's your mother?", 'how is your mother');
    both("When's the next train?", 'when is the next train');
    both("What's your name?", 'what is your name');
    both('I cannot swim today', "I can't swim today");
    both("I won't go there", 'I will not go there');
    both("I'm ready now", 'I am ready now');
    both("Let's go home", 'let us go home');
  });

  it('es: accents and ¿¡ do not matter', () => {
    both('¿Dónde está la estación?', 'donde esta la estacion');
    both('¡Qué día tan bonito!', 'que dia tan bonito');
    both('Me gusta el café con leche', 'me gusta el cafe con leche');
    both('El niño come pan', 'el nino come pan');
  });

  it('fr: accents and elisions (with or without apostrophe)', () => {
    both("C'est l'homme de ma vie", 'c est l homme de ma vie');
    both("J'ai un café", "j'ai un cafe");
    both("Je n'aime pas ça", 'je n aime pas ca');
    both("Qu'est-ce que c'est", 'qu est ce que c est');
    both("L'été est très chaud", "l'ete est tres chaud");
  });

  it('de: umlauts and ß', () => {
    both('Die Straße ist sehr groß', 'die strasse ist sehr gross');
    both('Ich gehe über die Brücke', 'ich gehe uber die brucke');
    both('Ich gehe über die Brücke', 'ich gehe ueber die bruecke');
  });

  it('it: accents and elisions', () => {
    both("Un bicchiere dell'acqua", 'un bicchiere dell acqua');
    both('Perché è così difficile', 'perche e cosi difficile');
    both("C'è un'amica qui", 'c e un amica qui');
  });

  it('numbers: years, hundreds, ordinals, clock time', () => {
    both('I was born in 2024', 'I was born in twenty twenty four');
    both('It costs a hundred dollars', 'it costs 100 dollars');
    both('We have 250 books', 'we have two hundred fifty books');
    both('The 21st century', 'the twenty first century');
    both('My birthday is on the 13th', 'my birthday is on the thirteenth');
    both('The train leaves at 7:05', 'the train leaves at seven oh five');
  });

  it('compounds written together or apart', () => {
    both('Send me an email please', 'send me an e-mail please');
    both('I love ice cream', 'I love icecream');
  });

  it('still rejects real mistakes after the folding', () => {
    expect(ok('¿Dónde está la estación?', 'donde la estacion').passed).toBe(false);
    expect(ok('Die Straße ist sehr groß', 'die strasse ist sehr klein').passed).toBe(false);
    expect(ok("C'est l'homme de ma vie", "c'est la femme de ma vie").passed).toBe(false);
    expect(ok('I was born in 2024', 'I was born in 1990').passed).toBe(false);
    expect(ok("Where's the station?", 'where the station').passed).toBe(false);
  });
});
