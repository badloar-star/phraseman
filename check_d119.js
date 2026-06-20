// Systematic check of gavan day 119

const issues = [];

// All Spanish texts to audit
const esTexts = [
  { loc: 'intro[0].title.es', text: 'Situación del día' },
  { loc: 'intro[0].body.es', text: 'La semana pasada te enfermaste y te quedaste en casa. Hoy un compañero te pregunta dónde estabas. Hay que contar sobre el resfriado: cuándo te enfermaste, cómo te sentiste, qué hiciste.' },
  { loc: 'intro[0].examples[0].gloss.es', text: 'La semana pasada tuve un resfriado.' },
  { loc: 'intro[0].examples[1].gloss.es', text: 'Me quedé en casa y descansé.' },
  { loc: 'intro[1].title.es', text: 'Cómo hablar del pasado' },
  { loc: 'intro[1].body.es', text: 'Cuando cuentas algo que ya pasó, el verbo cambia de forma. Los verbos regulares añaden -ed: stay — stayed, rest — rested. Los irregulares se aprenden aparte: have — had, feel — felt, take — took.' },
  { loc: 'intro[1].examples[0].gloss.es', text: 'El lunes me sentí fatal.' },
  { loc: 'intro[1].examples[1].gloss.es', text: 'Ella tomaba medicina cada mañana.' },
  { loc: 'intro[2].title.es', text: 'Palabras del día' },
  { loc: 'intro[2].body.es', text: 'Hoy aprendemos palabras para hablar de enfermedades: cold (resfriado), stayed (me quedé), felt (me sentí), terrible (terrible), rested (descansé), took (tomé). Todas aparecen en las frases del día.' },
  { loc: 'intro[2].examples[0].gloss.es', text: 'Tuve un resfriado fuerte.' },
  { loc: 'intro[2].examples[1].gloss.es', text: 'Me sentí mucho mejor después de descansar.' },
  { loc: 'phrases[0].meaning.es', text: 'La semana pasada tuve un resfriado.' },
  { loc: 'phrases[1].meaning.es', text: 'Me quedé en casa y descansé.' },
  { loc: 'phrases[2].meaning.es', text: 'Me sentí fatal durante dos días.' },
  { loc: 'phrases[3].meaning.es', text: 'Ella tomó medicamento cada cuatro horas.' },
  { loc: 'phrases[4].meaning.es', text: 'Mi médico me dijo que descansara.' },
  { loc: 'phrases[5].meaning.es', text: 'Llamé a mi oficina y expliqué todo.' },
  { loc: 'phrases[0].explanation.title.es', text: 'Cómo decir que estuviste enfermo' },
  { loc: 'phrases[1].explanation.title.es', text: 'Dos acciones en el pasado' },
  { loc: 'phrases[2].explanation.title.es', text: 'Contar cómo te sentiste mal' },
  { loc: 'phrases[3].explanation.title.es', text: 'Hablar del tratamiento' },
  { loc: 'phrases[4].explanation.title.es', text: 'Lo que dijo el médico' },
  { loc: 'phrases[5].explanation.title.es', text: 'Avisar al trabajo sobre la enfermedad' },
  { loc: 'phrases[0].explanation.rule.es', text: 'Have en pasado es had. «I had a cold» = tuve un resfriado.' },
  { loc: 'phrases[1].explanation.rule.es', text: 'Stay→stayed, rest→rested: los verbos regulares añaden -ed en pasado.' },
  { loc: 'phrases[2].explanation.rule.es', text: 'Feel en pasado es felt. «I felt terrible» = me sentí fatal.' },
  { loc: 'phrases[3].explanation.rule.es', text: 'Take en pasado es took. «Took medicine» = tomó medicamento.' },
  { loc: 'phrases[4].explanation.rule.es', text: 'Tell en pasado es told. «My doctor told me» = mi médico me dijo.' },
  { loc: 'phrases[5].explanation.rule.es', text: 'Call→called, explain→explained: ambos son regulares y añaden -ed.' },
  { loc: 'phrases[0].explanation.why.es', text: 'Es un verbo irregular; hay que memorizar su forma pasada.' },
  { loc: 'phrases[1].explanation.why.es', text: 'La regla del -ed funciona con la mayoría de verbos y es fácil de recordar.' },
  { loc: 'phrases[2].explanation.why.es', text: 'Felt es una forma irregular; memorízala como palabra independiente.' },
  { loc: 'phrases[3].explanation.why.es', text: 'Take es uno de los verbos irregulares más comunes; su forma es esencial.' },
  { loc: 'phrases[4].explanation.why.es', text: 'Told es la forma irregular de tell; muy útil en narraciones.' },
  { loc: 'phrases[5].explanation.why.es', text: 'Los verbos regulares con -ed son la forma más simple de hablar del pasado.' },
  { loc: 'phrases[0].explanation.commonMistake.es', text: 'No digas «I have had a cold last week»; last week exige pasado simple.' },
  { loc: 'phrases[1].explanation.commonMistake.es', text: 'No digas «I stay at home» para el pasado; usa stayed.' },
  { loc: 'phrases[2].explanation.commonMistake.es', text: 'No digas «I feeled terrible»; feel no tiene forma con -ed.' },
  { loc: 'phrases[3].explanation.commonMistake.es', text: 'No digas «She taked medicine»; la regla del -ed no aplica aquí.' },
  { loc: 'phrases[4].explanation.commonMistake.es', text: 'No digas «My doctor telled me»; tell no añade -ed.' },
  { loc: 'phrases[5].explanation.commonMistake.es', text: 'No digas «I call my office yesterday»; usa called.' },
];

// CHECK 1: ? without inverted ¿
console.log('=== CHECK 1: question marks ===');
esTexts.forEach(function(item) {
  if (item.text.indexOf('?') !== -1 && item.text.indexOf('¿') === -1) {
    console.log('ISSUE: missing ¿ at ' + item.loc + ': ' + item.text);
    issues.push({ type: 'missing_inverted_question', loc: item.loc, text: item.text });
  }
});

// CHECK 2: accent issues
console.log('\n=== CHECK 2: accent issues ===');
esTexts.forEach(function(item) {
  var text = item.text;
  // unaccented 'como' when it should be interrogative/exclamative
  if (/\bcomo\b/i.test(text) && text.indexOf('cómo') === -1) {
    console.log('como/cómo check at ' + item.loc + ': ' + text);
  }
  // unaccented 'cuando'
  if (/\bcuando\b/i.test(text) && text.indexOf('cuándo') === -1) {
    console.log('cuando/cuándo check at ' + item.loc + ': ' + text);
  }
  // 'mas' without accent (could be conjunction or 'more')
  if (/\bmas\b/.test(text)) {
    console.log('mas/más check at ' + item.loc + ': ' + text);
  }
  // 'solo' without accent (adverb = only)
  if (/\bsolo\b/i.test(text)) {
    console.log('solo check at ' + item.loc + ': ' + text);
  }
  // 'aun' vs 'aún'
  if (/\baun\b/i.test(text) && text.indexOf('aún') === -1) {
    console.log('aun/aún check at ' + item.loc + ': ' + text);
  }
});

// CHECK 3: distractor bug - correct word in its own distractor list
console.log('\n=== CHECK 3: distractor self-inclusion bug ===');
var allPhrases = [
  { id: 'p1', words: [
    {text:'I', distractors:['Me','My','We','He','She']},
    {text:'had', distractors:['have','has','got','took','made']},
    {text:'a', distractors:['an','the','my','some','this']},
    {text:'cold', distractors:['flu','fever','cough','pain','headache']},
    {text:'last', distractors:['next','this','every','past','previous']},
    {text:'week', distractors:['month','year','day','night','morning']}
  ]},
  { id: 'p2', words: [
    {text:'I', distractors:['He','She','We','They','My']},
    {text:'stayed', distractors:['stay','went','came','left','remained']},
    {text:'at', distractors:['in','on','to','by','near']},
    {text:'home', distractors:['work','school','bed','hospital','office']},
    {text:'and', distractors:['but','or','so','then','because']},
    {text:'rested', distractors:['rest','slept','worked','waited','walked']}
  ]},
  { id: 'p3', words: [
    {text:'I', distractors:['He','She','We','They','You']},
    {text:'felt', distractors:['feel','felt','had','looked','seemed']},
    {text:'terrible', distractors:['great','sick','tired','awful','fine']},
    {text:'for', distractors:['in','at','on','during','since']},
    {text:'two', distractors:['three','four','five','many','a']},
    {text:'days', distractors:['weeks','hours','nights','months','mornings']}
  ]},
  { id: 'p4', words: [
    {text:'She', distractors:['He','I','We','They','Her']},
    {text:'took', distractors:['take','takes','had','bought','used']},
    {text:'medicine', distractors:['water','food','tea','vitamins','tablets']},
    {text:'every', distractors:['each','all','some','any','many']},
    {text:'four', distractors:['two','three','six','eight','several']},
    {text:'hours', distractors:['days','minutes','weeks','nights','times']}
  ]},
  { id: 'p5', words: [
    {text:'My', distractors:['Her','His','Our','Their','The']},
    {text:'doctor', distractors:['nurse','friend','mother','teacher','boss']},
    {text:'told', distractors:['tell','said','asked','ordered','advised']},
    {text:'me', distractors:['him','her','us','them','you']},
    {text:'to', distractors:['for','about','not','and','that']},
    {text:'rest', distractors:['sleep','work','stay','eat','walk']}
  ]},
  { id: 'p6', words: [
    {text:'I', distractors:['He','She','We','They','My']},
    {text:'called', distractors:['call','wrote','visited','texted','emailed']},
    {text:'my', distractors:['the','our','his','her','their']},
    {text:'office', distractors:['home','doctor','school','hospital','manager']},
    {text:'and', distractors:['but','or','so','then','because']},
    {text:'explained', distractors:['explain','said','told','showed','wrote']}
  ]}
];

allPhrases.forEach(function(phrase) {
  phrase.words.forEach(function(w, i) {
    var lowerText = w.text.toLowerCase();
    var lowerDistractors = w.distractors.map(function(d) { return d.toLowerCase(); });
    if (lowerDistractors.indexOf(lowerText) !== -1) {
      console.log('CRITICAL DISTRACTOR BUG: ' + phrase.id + '.words[' + i + '] text="' + w.text + '" found in distractors: ' + JSON.stringify(w.distractors));
      issues.push({ type: 'distractor_contains_answer', loc: 'phrases.' + phrase.id + '.words[' + i + ']', text: w.text });
    }
  });
});

// CHECK 4: meaning vs rule mismatch
console.log('\n=== CHECK 4: meaning vs rule mismatch ===');
// p4: meaning.es uses "tomó" (preterite) but the action is repeated ("every four hours")
// intro[1].examples[1] same pattern uses "tomaba" (imperfect) correctly
console.log('p4 meaning.es: "Ella tomó medicamento cada cuatro horas." -- tomó=preterite but "cada cuatro horas" = repeated action, should be imperfect "tomaba"');
console.log('Contrast: intro[1].examples[1].gloss.es = "Ella tomaba medicina cada mañana" -- correctly uses imperfect');
console.log('INCONSISTENCY: same "took...every" pattern translated differently in same lesson');

// p3 rule: "I felt terrible = мне было ужасно плохо" but meaning says "Два дня я чувствовал себя ужасно"
// RU: "мне было ужасно плохо" vs "чувствовал себя ужасно" - both correct, minor phrasing diff
console.log('\np3 rule.ru says "мне было ужасно плохо" but meaning.ru says "чувствовал себя ужасно"');
console.log('  -> minor phrasing difference, both correct Russian translations');

// CHECK 5: uk actually Ukrainian (not Russian)
console.log('\n=== CHECK 5: uk != ru verification ===');
var ukRuPairs = [
  { loc: 'intro[0].body',
    ru: 'На прошлой неделе ты заболел и остался дома.',
    uk: 'Минулого тижня ти захворів і залишився вдома.' },
  { loc: 'phrases[0].meaning',
    ru: 'На прошлой неделе у меня была простуда.',
    uk: 'Минулого тижня в мене була застуда.' },
  { loc: 'phrases[2].meaning',
    ru: 'Два дня я чувствовал себя ужасно.',
    uk: 'Два дні я почувався жахливо.' },
  { loc: 'phrases[3].meaning',
    ru: 'Она принимала лекарство каждые четыре часа.',
    uk: 'Вона приймала ліки кожні чотири години.' },
  { loc: 'phrases[4].meaning',
    ru: 'Мой врач сказал мне отдыхать.',
    uk: 'Мій лікар сказав мені відпочивати.' },
  { loc: 'phrases[5].meaning',
    ru: 'Я позвонил в офис и всё объяснил.',
    uk: 'Я зателефонував в офіс і все пояснив.' },
];
ukRuPairs.forEach(function(pair) {
  if (pair.ru === pair.uk) {
    console.log('COPY DETECTED: ' + pair.loc);
    issues.push({ type: 'uk_copy_of_ru', loc: pair.loc, text: pair.uk });
  } else {
    console.log('OK: ' + pair.loc);
  }
});

// CHECK 6: es != ru (structural difference, not just translation)
console.log('\n=== CHECK 6: es structural check ===');
// es should not be a word-for-word calque of ru
// spot check a few
var esSamples = [
  { loc: 'outcome.es', text: 'Puedes contar qué enfermedad tuviste y qué hiciste durante ella' },
  { loc: 'outcome.ru', text: 'Ты умеешь рассказать, чем болел и что делал во время болезни' },
];
console.log('outcome.es:', esSamples[0].text);
console.log('outcome.ru:', esSamples[1].text);
console.log('Different structure: OK');

// CHECK 7: intro[1].body.es: 'Cuando cuentas' - is 'cuando' here relative or interrogative?
// 'Cuando cuentas algo que ya pasó' -> relative 'when' = no accent needed. CORRECT.
console.log('\n=== CHECK 7: cuando in intro[1].body.es ===');
console.log('Text: "Cuando cuentas algo que ya pasó..."');
console.log('"Cuando" here = relative "when" (not interrogative) -> no accent needed. CORRECT.');

// CHECK 8: intro[1].examples[1] en vs es tense
console.log('\n=== CHECK 8: intro[1].examples[1] tense check ===');
console.log('EN: "She took medicine every morning."');
console.log('ES: "Ella tomaba medicina cada mañana." -> imperfect');
console.log('  -> Correct: "every morning" = habitual = Spanish imperfect');
console.log('BUT in p4 meaning.es: "Ella tomó medicamento cada cuatro horas."');
console.log('  -> tomó = preterite, but "every four hours" = habitual = should be "tomaba"');
console.log('  -> This is a REAL BUG: inconsistency + grammatically wrong choice');

// CHECK 9: p3 words[1] distractor issue (the main one)
console.log('\n=== SUMMARY OF KEY ISSUES ===');
console.log('1. p3.words[1]: "felt" appears in its own distractors ["feel","felt",...]');
console.log('2. p4.meaning.es: "Ella tomó" should be "Ella tomaba" (repeated action with "cada cuatro horas")');
console.log('3. Inconsistency: intro[1].examples[1].gloss.es uses correct "tomaba" but p4.meaning.es uses "tomó"');

// Additional: check for vocabulary entries
var vocabEs = [
  { word: 'cold', es: 'resfriado' },
  { word: 'stayed', es: 'me quedé' },
  { word: 'felt', es: 'me sentí' },
  { word: 'terrible', es: 'fatal' },
  { word: 'took', es: 'tomó' },
  { word: 'explained', es: 'expliqué' },
];
// "tomó" in vocabulary - ok as infinitive translation, but question is whether it's consistent
// vocabulary.took.es = "tomó" (3rd person, which is odd for a standalone translation - should be "tomó / tomé" or just infinitive "tomar")
console.log('\nVocabulary "took" translation.es = "tomó" (3rd person)');
console.log('  Vocabulary translations should be consistent in person. "took" for "she took" -> "tomó" is ok contextually');
console.log('  But compare: "stayed" -> "me quedé" (1st person), "felt" -> "me sentí" (1st person)');
console.log('  "took" -> "tomó" (3rd person) = INCONSISTENT. Should be "tomé" (1st person to match others)');
console.log('  Similarly "explained" -> "expliqué" is 1st person (correct)');

console.log('\nDone. Issues found: distractor bug + tomó/tomaba tense + vocabulary person inconsistency');
