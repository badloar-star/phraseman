const phrases = [
  {
    id: 'gavan_d126_p1',
    english: 'She speaks English very well.',
    words: [
      {text:'She', pos:'pronoun', d:['Her','He','They','We','It']},
      {text:'speaks', pos:'verb', d:['speak','spoken','spoke','speaking','talked']},
      {text:'English', pos:'noun', d:['French','Spanish','Italian','German','Russian']},
      {text:'very', pos:'adverb', d:['quite','so','too','much','always']},
      {text:'well', pos:'adverb', d:['good','fast','hard','fine','wide']}
    ],
    rule: {
      ru: 'Когда говоришь о «он» или «она» — добавляй -s к слову-действию.',
      uk: 'Коли говориш про «він» або «вона» — додавай -s до слова-дії.',
      es: 'Cuando hablas de «él» o «ella», añade -s al verbo.'
    },
    why: {
      ru: 'Это правило для «он/она» в настоящем времени. Без -s звучит неправильно.',
      uk: 'Це правило для «він/вона» у теперішньому часі. Без -s звучить неправильно.',
      es: 'Es la regla para «él/ella» en presente. Sin la -s suena incorrecto.'
    }
  },
  {
    id: 'gavan_d126_p2',
    english: 'We went to the market yesterday.',
    words: [
      {text:'We', pos:'pronoun', d:['They','She','He','I','You']},
      {text:'went', pos:'verb', d:['go','goes','gone','going','came']},
      {text:'to', pos:'preposition', d:['at','in','on','by','from']},
      {text:'the', pos:'article', d:['a','an','this','that','some']},
      {text:'market', pos:'noun', d:['store','park','school','office','library']},
      {text:'yesterday', pos:'adverb', d:['today','tomorrow','always','never','soon']}
    ],
    rule: {
      ru: '«Went» — особая форма слова «go» для прошедшего времени.',
      uk: '«Went» — особлива форма слова «go» для минулого часу.',
      es: '«Went» es la forma especial de «go» para hablar del pasado.'
    },
    why: {
      ru: 'Некоторые слова меняются не по правилу — их нужно просто запомнить.',
      uk: 'Деякі слова змінюються не за правилом — їх треба просто запам\'ятати.',
      es: 'Algunos verbos cambian sin regla: hay que memorizarlos.'
    }
  },
  {
    id: 'gavan_d126_p3',
    english: 'You can call me any time.',
    words: [
      {text:'You', pos:'pronoun', d:['We','She','He','They','I']},
      {text:'can', pos:'modal', d:['must','should','will','could','may']},
      {text:'call', pos:'verb', d:['calls','calling','called','write','meet']},
      {text:'me', pos:'pronoun', d:['him','her','them','us','you']},
      {text:'any', pos:'determiner', d:['every','some','no','this','that']},
      {text:'time', pos:'noun', d:['day','night','moment','week','hour']}
    ],
    rule: {
      ru: '«Can» показывает, что что-то возможно или разрешено. После него — простое слово-действие.',
      uk: '«Can» показує, що щось можливо або дозволено. Після нього — просте слово-дія.',
      es: '«Can» indica que algo es posible o está permitido. Después va el verbo en forma simple.'
    },
    why: {
      ru: 'Это слово даёт разрешение или говорит о возможности — очень нужно в речи.',
      uk: 'Це слово дає дозвіл або говорить про можливість — дуже потрібне в мові.',
      es: 'Esta palabra da permiso o habla de posibilidad: es muy útil al hablar.'
    }
  },
  {
    id: 'gavan_d126_p4',
    english: 'My friend knew the right answer.',
    words: [
      {text:'My', pos:'pronoun', d:['His','Her','Our','Your','Their']},
      {text:'friend', pos:'noun', d:['sister','teacher','neighbor','partner','colleague']},
      {text:'knew', pos:'verb', d:['know','known','knows','thought','said']},
      {text:'the', pos:'article', d:['a','an','this','that','some']},
      {text:'right', pos:'adjective', d:['wrong','good','easy','hard','short']},
      {text:'answer', pos:'noun', d:['question','word','idea','plan','name']}
    ],
    rule: {
      ru: '«Knew» — прошедшая форма слова «know». Оно не меняется по правилу.',
      uk: '«Knew» — минула форма слова «know». Воно не змінюється за правилом.',
      es: '«Knew» es la forma pasada de «know». No sigue la regla general.'
    },
    why: {
      ru: 'Нельзя сказать «knowed» — это слово меняется особым образом.',
      uk: 'Не можна сказати «knowed» — це слово змінюється особливим чином.',
      es: 'No se puede decir «knowed»: este verbo tiene forma especial.'
    }
  },
  {
    id: 'gavan_d126_p5',
    english: 'I should review my notes today.',
    words: [
      {text:'I', pos:'pronoun', d:['You','We','She','He','They']},
      {text:'should', pos:'modal', d:['can','must','will','may','could']},
      {text:'review', pos:'verb', d:['read','write','study','check','open']},
      {text:'my', pos:'pronoun', d:['his','her','our','your','their']},
      {text:'notes', pos:'noun', d:['books','words','pages','tasks','lessons']},
      {text:'today', pos:'adverb', d:['yesterday','tomorrow','always','never','soon']}
    ],
    rule: {
      ru: '«Should» говорит о том, что было бы хорошо сделать. После него — простое слово-действие.',
      uk: '«Should» говорить про те, що було б добре зробити. Після нього — просте слово-дія.',
      es: '«Should» indica lo que sería bueno hacer. Después va el verbo en forma simple.'
    },
    why: {
      ru: 'Это мягкий совет, не приказ. Очень полезно в разговоре.',
      uk: 'Це м\'яка порада, не наказ. Дуже корисно в розмові.',
      es: 'Es un consejo suave, no una orden. Muy útil en la conversación.'
    }
  },
  {
    id: 'gavan_d126_p6',
    english: 'He often reads books in English.',
    words: [
      {text:'He', pos:'pronoun', d:['She','They','We','I','You']},
      {text:'often', pos:'adverb', d:['never','always','sometimes','rarely','soon']},
      {text:'reads', pos:'verb', d:['read','reading','write','writes','study']},
      {text:'books', pos:'noun', d:['notes','articles','stories','letters','pages']},
      {text:'in', pos:'preposition', d:['at','on','by','for','with']},
      {text:'English', pos:'noun', d:['French','Spanish','Italian','German','Russian']}
    ],
    rule: {
      ru: 'Когда говоришь о «он» — добавляй -s. Слово «часто» стоит перед словом-действием.',
      uk: 'Коли говориш про «він» — додавай -s. Слово «часто» стоїть перед словом-дією.',
      es: 'Cuando hablas de «él», añade -s. La palabra «con frecuencia» va antes del verbo.'
    },
    why: {
      ru: 'Это описание регулярного действия. Порядок слов в таких фразах фиксированный.',
      uk: 'Це опис регулярної дії. Порядок слів у таких фразах фіксований.',
      es: 'Describes una acción habitual. El orden de las palabras es fijo en estas frases.'
    }
  }
];

function countWords(str) {
  return str.split(/\s+/).filter(x => x.length > 0).length;
}

console.log('=== RULE/WHY WORD COUNTS ===');
phrases.forEach(p => {
  ['ru','uk','es'].forEach(lang => {
    const rc = countWords(p.rule[lang]);
    const wc = countWords(p.why[lang]);
    const rFlag = rc > 24 ? ' *** OVER 24 ***' : '';
    const wFlag = wc > 24 ? ' *** OVER 24 ***' : '';
    console.log(`${p.id} rule.${lang}: ${rc}${rFlag}  | "${p.rule[lang]}"`);
    console.log(`${p.id}  why.${lang}: ${wc}${wFlag}  | "${p.why[lang]}"`);
  });
});

console.log('\n=== MULTIWORD IN words[].text ===');
phrases.forEach(p => {
  p.words.forEach(w => {
    if (w.text.includes(' ')) {
      console.log(`MULTIWORD: ${p.id} word="${w.text}"`);
    }
  });
});

console.log('\n=== BRAK DISTRACTOR ANALYSIS ===');
// For each phrase, check each distractor slot: if substituting distractor still yields a grammatically valid English sentence
// Manual analysis for each problematic slot:

// p1: "She speaks English very well."
// slot 'well' distractors: good/fast/hard/fine/wide
// "She speaks English very fast." -> VALID English! BRAK
// "She speaks English very hard." -> valid but unusual
// "She speaks English very good." -> ungrammatical (good vs well), not BRAK
// "She speaks English very fine." -> unusual/not standard
// "She speaks English very wide." -> NOT valid
console.log('p1 slot "well": distractor "fast" -> "She speaks English very fast." = VALID BRAK');

// p2: "We went to the market yesterday."
// slot 'yesterday' distractors: today/tomorrow/always/never/soon
// "We went to the market today." -> VALID with past tense! BRAK
// "We went to the market tomorrow." -> NOT valid (past+future conflict)
// "We went to the market always." -> ungrammatical word order
// "We went to the market never." -> NOT valid
// "We went to the market soon." -> NOT valid (past+future)
console.log('p2 slot "yesterday": distractor "today" -> "We went to the market today." = VALID BRAK');
// "tomorrow" - actually "we went to the market tomorrow" is NOT valid (went=past, tomorrow=future)
// BUT: native speakers sometimes say it colloquially... strict grammar: NOT valid

// p3: "You can call me any time."
// slot 'any' distractors: every/some/no/this/that
// "You can call me some time." -> VALID (sometime/some time = eventually). BRAK!
// "You can call me every time." -> marginal ("every time" needs context like "every time you want")
// "You can call me no time." -> NOT valid
// "You can call me this time." -> changes meaning but grammatically valid - BRAK!
// "You can call me that time." -> grammatically valid in context - borderline
console.log('p3 slot "any": distractor "some" -> "You can call me some time." = VALID BRAK');
console.log('p3 slot "any": distractor "this" -> "You can call me this time." = VALID BRAK (changes meaning)');

// p4: "My friend knew the right answer."
// slot 'right' distractors: wrong/good/easy/hard/short
// "My friend knew the wrong answer." -> VALID! BRAK (grammatically perfect, just different meaning)
// "My friend knew the good answer." -> valid
// "My friend knew the easy answer." -> valid
// "My friend knew the hard answer." -> valid
// "My friend knew the short answer." -> valid
console.log('p4 slot "right": distractor "wrong" -> "My friend knew the wrong answer." = VALID BRAK');
console.log('p4 slot "right": distractor "good" -> "My friend knew the good answer." = VALID BRAK');
console.log('p4 slot "right": distractor "easy" -> "My friend knew the easy answer." = VALID BRAK');
console.log('p4 slot "right": distractor "hard" -> "My friend knew the hard answer." = VALID BRAK');
console.log('p4 slot "right": distractor "short" -> "My friend knew the short answer." = VALID BRAK');

// p5: "I should review my notes today."
// slot 'notes' distractors: books/words/pages/tasks/lessons
// ALL of these are valid: "I should review my books/words/pages/tasks/lessons today." = ALL BRAK
console.log('p5 slot "notes": ALL 5 distractors (books,words,pages,tasks,lessons) produce valid sentences = ALL BRAK');
// slot 'review' distractors: read/write/study/check/open
// "I should read my notes today." -> VALID BRAK
// "I should write my notes today." -> valid
// "I should study my notes today." -> VALID BRAK
// "I should check my notes today." -> VALID BRAK
// "I should open my notes today." -> valid
console.log('p5 slot "review": distractors "read","study","check" produce valid sentences = BRAK');

// p6: "He often reads books in English."
// slot 'often' distractors: never/always/sometimes/rarely/soon
// "He never reads books in English." -> VALID BRAK
// "He always reads books in English." -> VALID BRAK
// "He sometimes reads books in English." -> VALID BRAK
// "He rarely reads books in English." -> VALID BRAK
// "He soon reads books in English." -> NOT standard
console.log('p6 slot "often": distractors "never","always","sometimes","rarely" all valid = BRAK');

// Grammar term check in partOfSpeech labels
console.log('\n=== GRAMMAR TERM / POS CHECK ===');
phrases.forEach(p => {
  p.words.forEach(w => {
    // "modal" and "determiner" are grammar terms in POS labels
    // The rule says: no grammar terms (these should not appear as teaching labels to the student)
    if (w.pos === 'modal') {
      console.log(`GRAMMAR-TERM in POS: ${p.id} word="${w.text}" pos="modal"`);
    }
    if (w.pos === 'determiner') {
      console.log(`GRAMMAR-TERM in POS: ${p.id} word="${w.text}" pos="determiner"`);
    }
  });
});
