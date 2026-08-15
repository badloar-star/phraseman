import { getContractionFor } from '../app/lesson1_smart_options';
import { normalize, isCorrectAnswer, toAmE } from '../constants/contractions';

describe('getContractionFor — expansion → contraction lookup', () => {
  // Already existing pairs (regression)
  it('I + am → I\'m', () => expect(getContractionFor('I', 'am')).toBe("I\'m"));
  it('he + is → he\'s', () => expect(getContractionFor('he', 'is')).toBe("he\'s"));
  it('she + is → she\'s', () => expect(getContractionFor('she', 'is')).toBe("she\'s"));
  it('it + is → it\'s', () => expect(getContractionFor('it', 'is')).toBe("it\'s"));
  it('we + are → we\'re', () => expect(getContractionFor('we', 'are')).toBe("we\'re"));
  it('they + are → they\'re', () => expect(getContractionFor('they', 'are')).toBe("they\'re"));
  it('you + are → you\'re', () => expect(getContractionFor('you', 'are')).toBe("you\'re"));
  it('I + will → I\'ll', () => expect(getContractionFor('I', 'will')).toBe("I\'ll"));
  it('we + will → we\'ll', () => expect(getContractionFor('we', 'will')).toBe("we\'ll"));
  it('do + not → don\'t', () => expect(getContractionFor('do', 'not')).toBe("don\'t"));
  it('does + not → doesn\'t', () => expect(getContractionFor('does', 'not')).toBe("doesn\'t"));
  it('did + not → didn\'t', () => expect(getContractionFor('did', 'not')).toBe("didn\'t"));
  it('will + not → won\'t', () => expect(getContractionFor('will', 'not')).toBe("won\'t"));
  it('is + not → isn\'t', () => expect(getContractionFor('is', 'not')).toBe("isn\'t"));
  it('are + not → aren\'t', () => expect(getContractionFor('are', 'not')).toBe("aren\'t"));
  it('there + is → there\'s', () => expect(getContractionFor('there', 'is')).toBe("there\'s"));

  // Newly added pairs
  it('what + is → what\'s', () => expect(getContractionFor('what', 'is')).toBe("what\'s"));
  it('who + is → who\'s', () => expect(getContractionFor('who', 'is')).toBe("who\'s"));
  it('must + not → mustn\'t', () => expect(getContractionFor('must', 'not')).toBe("mustn\'t"));
  it('need + not → needn\'t', () => expect(getContractionFor('need', 'not')).toBe("needn\'t"));
  it('might + not → mightn\'t', () => expect(getContractionFor('might', 'not')).toBe("mightn\'t"));
  it('let + us → let\'s', () => expect(getContractionFor('let', 'us')).toBe("let\'s"));
  it('it + will → it\'ll', () => expect(getContractionFor('it', 'will')).toBe("it\'ll"));

  // Case-insensitive
  it('He + is → he\'s (capital)', () => expect(getContractionFor('He', 'is')).toBe("he\'s"));
  it('What + is → what\'s (capital)', () => expect(getContractionFor('What', 'is')).toBe("what\'s"));
  it('There + is → there\'s (capital)', () => expect(getContractionFor('There', 'is')).toBe("there\'s"));

  // No contraction cases
  it('am + not → null (amn\'t не существует)', () => expect(getContractionFor('am', 'not')).toBeNull());
  it('there + are → null (there\'re не используется)', () => expect(getContractionFor('there', 'are')).toBeNull());
});

describe('normalize — contraction validation', () => {
  it('normalizes it\'ll to it will', () => {
    expect(normalize("It\'ll work")).toBe('it will work');
  });

  it('normalizes mightn\'t to might not', () => {
    expect(normalize("We mightn\'t finish on time.")).toBe('we might not finish on time');
  });

  it('normalizes let\'s to let us', () => {
    expect(normalize("Let's discuss this plan.")).toBe('let us discuss this plan');
    expect(isCorrectAnswer(
      "Let's hide those expensive gifts under that big fir-tree",
      'Let us hide those expensive gifts under that big fir-tree.',
    )).toBe(true);
  });

  it('NFKC: fullwidth letters and period match plain ASCII after normalize', () => {
    expect(normalize('If we go.')).toBe('if we go');
  });

  it('unifies em dash to hyphen before comparison', () => {
    expect(normalize('first—second')).toBe('first-second');
  });

  it('strips ellipsis and trailing colon/spaces', () => {
    expect(normalize('wait…  ')).toBe('wait');
    expect(normalize('note:  ')).toBe('note');
  });
});

describe('isCorrectAnswer — punctuation and unicode confusables', () => {
  it('user without final period matches reference with period', () => {
    expect(isCorrectAnswer(
      'If this experienced specialist signs the contract we will get profit',
      'If this experienced specialist signs the contract we will get profit.',
    )).toBe(true);
  });

  it('we\'ll vs we will still matches (contraction)', () => {
    expect(isCorrectAnswer(
      "If this experienced specialist signs the contract we\'ll get profit",
      'If this experienced specialist signs the contract we will get profit.',
    )).toBe(true);
  });

  it('fullwidth trailing period on reference side', () => {
    expect(isCorrectAnswer(
      'We will go',
      'We will go\uFF0E',
    )).toBe(true);
  });

  it('accepts seldom and rarely as equivalent frequency adverbs', () => {
    expect(isCorrectAnswer(
      'We seldom go back to that old city',
      'We rarely go back to that old city',
    )).toBe(true);
    expect(isCorrectAnswer(
      'I rarely get out of this old building at night',
      'I seldom get out of this old building at night',
    )).toBe(true);
  });

  it('accepts common indefinite pronoun pairs as equivalent answers', () => {
    expect(isCorrectAnswer('somebody called me', 'someone called me')).toBe(true);
    expect(isCorrectAnswer('did anybody call you', 'did anyone call you')).toBe(true);
    expect(isCorrectAnswer('everybody helped us', 'everyone helped us')).toBe(true);
    expect(isCorrectAnswer('no one is outside', 'nobody is outside')).toBe(true);
  });
});

describe('toAmE — direct BrE → AmE', () => {
  // Spelling: -our → -or
  it('colour → color',           () => expect(toAmE('colour')).toBe('color'));
  it('colours → colors',         () => expect(toAmE('colours')).toBe('colors'));
  it('coloured → colored',       () => expect(toAmE('coloured')).toBe('colored'));
  it('favourite → favorite',     () => expect(toAmE('favourite')).toBe('favorite'));
  it('neighbour → neighbor',     () => expect(toAmE('neighbour')).toBe('neighbor'));
  it('neighbouring → neighboring', () => expect(toAmE('neighbouring')).toBe('neighboring'));
  it('behaviour → behavior',     () => expect(toAmE('behaviour')).toBe('behavior'));
  it('humour → humor',           () => expect(toAmE('humour')).toBe('humor'));

  // Spelling: -re → -er
  it('centre → center',          () => expect(toAmE('centre')).toBe('center'));
  it('theatre → theater',        () => expect(toAmE('theatre')).toBe('theater'));
  it('metre → meter',            () => expect(toAmE('metre')).toBe('meter'));

  // Spelling: -ise → -ize
  it('organise → organize',      () => expect(toAmE('organise')).toBe('organize'));
  it('organised → organized',    () => expect(toAmE('organised')).toBe('organized'));
  it('apologise → apologize',    () => expect(toAmE('apologise')).toBe('apologize'));
  it('analyse → analyze',        () => expect(toAmE('analyse')).toBe('analyze'));
  it('practise → practice',      () => expect(toAmE('practise')).toBe('practice'));
  it('practising → practicing',  () => expect(toAmE('practising')).toBe('practicing'));

  // -ence → -ense
  it('defence → defense',        () => expect(toAmE('defence')).toBe('defense'));
  it('licence → license',        () => expect(toAmE('licence')).toBe('license'));

  // -ll → -l for past forms
  it('travelled → traveled',     () => expect(toAmE('travelled')).toBe('traveled'));
  it('travelling → traveling',   () => expect(toAmE('travelling')).toBe('traveling'));
  it('cancelled → canceled',     () => expect(toAmE('cancelled')).toBe('canceled'));

  // -l → -ll for AmE base
  it('skilful → skillful',       () => expect(toAmE('skilful')).toBe('skillful'));
  it('fulfil → fulfill',         () => expect(toAmE('fulfil')).toBe('fulfill'));

  // BrE past tense -t → -ed
  it('learnt → learned',         () => expect(toAmE('learnt')).toBe('learned'));
  it('burnt → burned',           () => expect(toAmE('burnt')).toBe('burned'));
  it('spilt → spilled',          () => expect(toAmE('spilt')).toBe('spilled'));
  it('knelt → kneeled',          () => expect(toAmE('knelt')).toBe('kneeled'));
  it('leapt → leaped',           () => expect(toAmE('leapt')).toBe('leaped'));
  it('spoilt → spoiled',         () => expect(toAmE('spoilt')).toBe('spoiled'));

  // Misc spelling
  it('grey → gray',              () => expect(toAmE('grey')).toBe('gray'));
  it('programme → program',      () => expect(toAmE('programme')).toBe('program'));
  it('jewellery → jewelry',      () => expect(toAmE('jewellery')).toBe('jewelry'));
  it('aluminium → aluminum',     () => expect(toAmE('aluminium')).toBe('aluminum'));
  it('whilst → while',           () => expect(toAmE('whilst')).toBe('while'));

  // BrE-only lexis
  it('pavement → sidewalk',      () => expect(toAmE('pavement')).toBe('sidewalk'));
  it('queue → line',             () => expect(toAmE('queue')).toBe('line'));
  it('queues → lines',           () => expect(toAmE('queues')).toBe('lines'));
  it('rubbish → trash',          () => expect(toAmE('rubbish')).toBe('trash'));
  it('petrol → gasoline',        () => expect(toAmE('petrol')).toBe('gasoline'));
  it('lorry → truck',            () => expect(toAmE('lorry')).toBe('truck'));
  it('biscuit → cookie',         () => expect(toAmE('biscuit')).toBe('cookie'));
  it('aubergine → eggplant',     () => expect(toAmE('aubergine')).toBe('eggplant'));

  // Безопасность: слова с двойным значением НЕ нормализуются
  it('lift (verb) untouched',    () => expect(toAmE('i lift weights')).toBe('i lift weights'));
  it('cooker untouched',         () => expect(toAmE('pressure cooker')).toBe('pressure cooker'));
  it('chips untouched',          () => expect(toAmE('chips')).toBe('chips'));
  it('holiday untouched',        () => expect(toAmE('holiday')).toBe('holiday'));
  it('jumper untouched',         () => expect(toAmE('jumper')).toBe('jumper'));
  it('boot untouched',           () => expect(toAmE('boot')).toBe('boot'));

  // Word boundaries: substring внутри другого слова не трогать
  it('subqueueing not matched',  () => expect(toAmE('queueing')).toBe('queueing'));
  it('center already AmE',       () => expect(toAmE('center')).toBe('center'));
});

describe('isCorrectAnswer — BrE answer accepted as AmE', () => {
  it('user types "colour" when correct is "color" → accepted', () => {
    expect(isCorrectAnswer('I love this colour', 'I love this color')).toBe(true);
  });

  it('user picks "favourite" when correct is "favorite" → accepted', () => {
    expect(isCorrectAnswer(
      'My favourite book is here',
      'My favorite book is here',
    )).toBe(true);
  });

  it('user types "theatre" when correct is "theater" → accepted', () => {
    expect(isCorrectAnswer('We went to the theatre', 'We went to the theater')).toBe(true);
  });

  it('user picks "pavement" when correct is "sidewalk" → accepted', () => {
    expect(isCorrectAnswer(
      'Do not throw it on the pavement.',
      'Do not throw it on the sidewalk.',
    )).toBe(true);
  });

  it('user picks "queue" when correct is "line" → accepted', () => {
    expect(isCorrectAnswer(
      'I am standing in a queue',
      'I am standing in a line',
    )).toBe(true);
  });

  it('user types "learnt" when correct is "learned" → accepted', () => {
    expect(isCorrectAnswer('She learnt French', 'She learned French')).toBe(true);
  });

  it('user types "cancelled" when correct is "canceled" → accepted', () => {
    expect(isCorrectAnswer(
      'They cancelled the meeting',
      'They canceled the meeting',
    )).toBe(true);
  });

  it('user types "organised" when correct is "organized" → accepted', () => {
    expect(isCorrectAnswer(
      'He organised the trip',
      'He organized the trip',
    )).toBe(true);
  });

  it('reverse direction: user types AmE when correct stored in BrE → accepted', () => {
    expect(isCorrectAnswer(
      'My favorite color',
      'My favourite colour',
    )).toBe(true);
  });

  it('different word completely → still wrong', () => {
    expect(isCorrectAnswer('I love this house', 'I love this color')).toBe(false);
  });

  it('non-AmE-related typo → still wrong', () => {
    expect(isCorrectAnswer('I luve this color', 'I love this color')).toBe(false);
  });

  // Lesson L18p36: word bank token is "Please," but canonical answer strips comma per slot.
  it('comma on first word chip vs canonical without comma → accepted', () => {
    const canon = 'Please confirm that important booking via that official link';
    const assembled = 'Please, confirm that important booking via that official link.';
    expect(isCorrectAnswer(assembled, canon)).toBe(true);
  });

  // Регресс 2026-07-20: юзер собрал "I am Anna" из плиток "listen & build" (impuls_d3_p1),
  // канон хранится как "I'm Anna."
  // сравнивал через свою нормализацию без раскрытия сокращений и засчитывал ошибку.
  it('expanded contraction from listen-build tiles matches contracted canonical answer', () => {
    expect(isCorrectAnswer('I am Anna', "I'm Anna.")).toBe(true);
    expect(isCorrectAnswer("It's not clear", 'It is not clear.')).toBe(true);
  });
});
