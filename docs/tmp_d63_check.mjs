// Checker for day 63 draft
const phrases = [
  {id:'voyazh_d63_phrase_1',english:'Can I join this tour?',
   meaning:{ru:'Можно мне присоединиться к этой экскурсии?',uk:'Можна мені приєднатися до цієї екскурсії?',es:'¿Puedo unirme a esta excursión?'},
   constructions:['modals','wh-questions'],
   explanation:{
     title:{ru:'Просьба разрешения',uk:'Прохання дозволу',es:'Pedir permiso'},
     rule:{ru:'Can I + глагол — вежливый способ попросить разрешения.',uk:'Can I + дієслово — ввічливий спосіб попросити дозволу.',es:'Can I + verbo: manera educada de pedir permiso.'},
     why:{ru:'Can I делает вопрос мягким и вежливым, не грубым.',uk:'Can I робить питання м\'яким і ввічливим, не грубим.',es:'Can I hace la pregunta amable y educada, no brusca.'},
     commonMistake:{ru:'Не говори May I join — слишком формально для туристической ситуации.',uk:'Не кажи May I join — надто формально для туристичної ситуації.',es:'No digas May I join: es demasiado formal para esta situación.'}
   }},
  {id:'voyazh_d63_phrase_2',english:'When does the tour start?',
   meaning:{ru:'Когда начинается экскурсия?',uk:'Коли починається екскурсія?',es:'¿Cuándo empieza la excursión?'},
   constructions:['wh-questions'],
   explanation:{
     title:{ru:'Вопрос о времени начала',uk:'Питання про час початку',es:'Pregunta sobre la hora de inicio'},
     rule:{ru:'When does + существительное + глагол — спрашиваешь, когда что-то происходит.',uk:'When does + іменник + дієслово — питаєш, коли щось відбувається.',es:'When does + sustantivo + verbo: preguntas cuándo ocurre algo.'},
     why:{ru:'Does нужно, чтобы вопрос прозвучал правильно с he/she/it.',uk:'Does потрібно, щоб питання прозвучало правильно з he/she/it.',es:'Does es necesario para que la pregunta suene bien con he/she/it.'},
     commonMistake:{ru:'Не говори When the tour starts? — без does вопрос неверный.',uk:'Не кажи When the tour starts? — без does питання неправильне.',es:'No digas When the tour starts: sin does la pregunta es incorrecta.'}
   }},
  {id:'voyazh_d63_phrase_3',english:'Where can we meet the guide?',
   meaning:{ru:'Где мы можем встретить гида?',uk:'Де ми можемо зустріти гіда?',es:'¿Dónde podemos encontrar al guía?'},
   constructions:['modals','wh-questions'],
   explanation:{
     title:{ru:'Вопрос о месте встречи',uk:'Питання про місце зустрічі',es:'Pregunta sobre el lugar de encuentro'},
     rule:{ru:'Where can we + глагол — спрашиваешь о месте, добавляя can для возможности.',uk:'Where can we + дієслово — питаєш про місце, додаючи can для можливості.',es:'Where can we + verbo: preguntas por el lugar añadiendo can para posibilidad.'},
     why:{ru:'Where и can вместе дают точный вопрос о месте и возможности.',uk:'Where і can разом дають точне питання про місце і можливість.',es:'Where y can juntos dan una pregunta precisa sobre lugar y posibilidad.'},
     commonMistake:{ru:'Не путай Where с When — Where о месте, When о времени.',uk:'Не плутай Where з When — Where про місце, When про час.',es:'No confundas Where con When: Where es lugar, When es tiempo.'}
   }},
  {id:'voyazh_d63_phrase_4',english:'How long does the tour last?',
   meaning:{ru:'Сколько длится экскурсия?',uk:'Скільки триває екскурсія?',es:'¿Cuánto dura la excursión?'},
   constructions:['wh-questions'],
   explanation:{
     title:{ru:'Спрашиваем о длительности',uk:'Питаємо про тривалість',es:'Preguntamos por la duración'},
     rule:{ru:'How long does + существительное + last — стандартный вопрос о продолжительности.',uk:'How long does + іменник + last — стандартне питання про тривалість.',es:'How long does + sustantivo + last: pregunta estándar sobre la duración.'},
     why:{ru:'How long — готовое сочетание для вопроса о времени или длине.',uk:'How long — готове поєднання для питання про час або довжину.',es:'How long es una combinación fija para preguntar por tiempo o longitud.'},
     commonMistake:{ru:'Не говори How much time lasts — порядок слов неверный.',uk:'Не кажи How much time lasts — порядок слів неправильний.',es:'No digas How much time lasts: el orden de las palabras es incorrecto.'}
   }},
  {id:'voyazh_d63_phrase_5',english:'Can you speak more slowly please?',
   meaning:{ru:'Можете говорить помедленнее, пожалуйста?',uk:'Можете говорити повільніше, будь ласка?',es:'¿Puede hablar más despacio, por favor?'},
   constructions:['modals'],
   explanation:{
     title:{ru:'Просьба говорить медленнее',uk:'Прохання говорити повільніше',es:'Pedir que hablen más despacio'},
     rule:{ru:'Can you + глагол — вежливая просьба к другому человеку что-то сделать.',uk:'Can you + дієслово — ввічливе прохання до іншої людини щось зробити.',es:'Can you + verbo: petición educada a otra persona para que haga algo.'},
     why:{ru:'Please в конце делает просьбу мягкой и приятной.',uk:'Please в кінці робить прохання м\'яким і приємним.',es:'Please al final hace la petición más amable y agradable.'},
     commonMistake:{ru:'Не говори Can you to speak — после can глагол без to.',uk:'Не кажи Can you to speak — після can дієслово без to.',es:'No digas Can you to speak: después de can el verbo va sin to.'}
   }},
  {id:'voyazh_d63_phrase_6',english:'What time does it finish?',
   meaning:{ru:'В какое время это заканчивается?',uk:'О котрій годині це закінчується?',es:'¿A qué hora termina?'},
   constructions:['wh-questions'],
   explanation:{
     title:{ru:'Вопрос о времени окончания',uk:'Питання про час закінчення',es:'Pregunta sobre la hora de fin'},
     rule:{ru:'What time does + it + глагол — спрашиваешь точное время конца события.',uk:'What time does + it + дієслово — питаєш точний час кінця події.',es:'What time does + it + verbo: preguntas la hora exacta del final.'},
     why:{ru:'What time точнее чем When — ожидаешь услышать конкретный час.',uk:'What time точніше ніж When — очікуєш почути конкретну годину.',es:'What time es más preciso que When: esperas escuchar una hora concreta.'},
     commonMistake:{ru:'Не говори What time it finishes? — does нужен для правильного порядка.',uk:'Не кажи What time it finishes? — does потрібен для правильного порядку.',es:'No digas What time it finishes: does es necesario para el orden correcto.'}
   }}
];

const intro = [
  {kind:'context',
   title:{ru:'Ты у входа в музей',uk:'Ти біля входу в музей',es:'Estás en la entrada del museo'},
   body:{ru:'Ты видишь группу туристов с гидом. Ты хочешь пойти с ними. Надо спросить разрешения и узнать детали.',uk:'Ти бачиш групу туристів з гідом. Ти хочеш піти з ними. Треба запитати дозволу і дізнатися деталі.',es:'Ves un grupo de turistas con guía. Quieres ir con ellos. Hay que pedir permiso y conocer los detalles.'},
   examples:[{en:'Can I join this tour?',gloss:{ru:'Можно мне присоединиться к этой экскурсии?',uk:'Можна мені приєднатися до цієї екскурсії?',es:'¿Puedo unirme a esta excursión?'}}]
  },
  {kind:'grammar',
   title:{ru:'Can — слово-ключ для просьбы',uk:'Can — слово-ключ для прохання',es:'Can: la palabra clave para pedir permiso'},
   body:{ru:'Слово can ставишь в самое начало вопроса — и сразу ясно, что ты просишь разрешения или спрашиваешь о возможности. После can всегда идёт глагол без изменений.',uk:'Слово can ставиш на самий початок питання — і одразу ясно, що ти просиш дозволу або питаєш про можливість. Після can завжди йде дієслово без змін.',es:'La palabra can va al principio de la pregunta y muestra que pides permiso o preguntas por una posibilidad. Después de can siempre va el verbo sin cambios.'},
   examples:[
     {en:'Can I join this tour?',gloss:{ru:'Можно мне присоединиться к этой экскурсии?',uk:'Чи можна мені приєднатися до цієї екскурсії?',es:'¿Puedo unirme a esta excursión?'}},
     {en:'Can we start now?',gloss:{ru:'Можем ли мы начать сейчас?',uk:'Чи можемо ми почати зараз?',es:'¿Podemos empezar ahora?'}}
   ]
  },
  {kind:'grammar',
   title:{ru:'When — спрашиваем о времени',uk:'When — питаємо про час',es:'When: preguntamos por el tiempo'},
   body:{ru:'Слово when стоит первым в вопросе, когда хочешь узнать время. Дальше идёт вспомогательное слово и остальная часть вопроса.',uk:'Слово when стоїть першим у питанні, коли хочеш дізнатися час. Далі йде допоміжне слово і решта питання.',es:'La palabra when va al principio cuando quieres saber el tiempo. Luego vienen el auxiliar y el resto de la pregunta.'},
   examples:[
     {en:'When does it start?',gloss:{ru:'Когда это начинается?',uk:'Коли це починається?',es:'¿Cuándo empieza?'}},
     {en:'When can we go?',gloss:{ru:'Когда мы можем идти?',uk:'Коли ми можемо йти?',es:'¿Cuándo podemos ir?'}}
   ]
  }
];

const issues = [];

// --- 1. UK/RU identity check (must not be exact copies) ---
console.log('\n=== CHECK 1: UK vs RU identity ===');
for (const p of phrases) {
  const fields = ['meaning', 'explanation.title', 'explanation.rule', 'explanation.why', 'explanation.commonMistake'];
  const getRu = f => { let o=p; for (const k of f.split('.')) o=o[k]; return o.ru; };
  const getUk = f => { let o=p; for (const k of f.split('.')) o=o[k]; return o.uk; };
  for (const f of fields) {
    try {
      const ru = getRu(f); const uk = getUk(f);
      if (ru === uk) console.log(`COPY! ${p.id} ${f}: "${ru}"`);
    } catch(e) {}
  }
}
for (const item of intro) {
  if (item.title.ru === item.title.uk) console.log(`COPY intro title: ${item.title.ru}`);
  if (item.body && item.body.ru === item.body.uk) console.log(`COPY intro body: ${item.body.ru}`);
}
console.log('(done)');

// --- 2. ES accent / ¿ check ---
console.log('\n=== CHECK 2: ES accents and ¿ ===');
const esStrings = [];
function collect(obj, path='') {
  if (!obj || typeof obj !== 'object') return;
  if (typeof obj.es === 'string') esStrings.push({path, text: obj.es});
  for (const [k,v] of Object.entries(obj)) collect(v, path+'.'+k);
}
collect({phrases, intro});
for (const {path, text} of esStrings) {
  if (text.includes('?') && !text.includes('¿')) {
    console.log(`MISSING ¿ [${path}]: "${text}"`);
  }
  // Check accent on cuándo/dónde/qué/cómo
  const needsAccent = [
    [/\bcuando\b/gi, 'cuándo'],
    [/\bdonde\b/gi, 'dónde'],
    [/\bque\b(?=\s+(hora|tiempo|día))/gi, 'qué'],
    [/\bcomo\b/gi, 'cómo'],
    [/\bcuanto\b/gi, 'cuánto'],
  ];
  for (const [re, correct] of needsAccent) {
    if (re.test(text)) {
      console.log(`ACCENT? [${path}]: "${text}" — check "${correct}"`);
    }
  }
}
console.log('(done)');

// --- 3. meaning vs rule sync ---
console.log('\n=== CHECK 3: meaning vs rule sync ===');
for (const p of phrases) {
  console.log(`${p.id}: ${p.english}`);
  console.log(`  meaning.ru: ${p.meaning.ru}`);
  console.log(`  rule.ru: ${p.explanation.rule.ru}`);
  // Check rule actually matches the phrase structure
  const eng = p.english;
  const rule = p.explanation.rule.ru;
  // e.g. phrase_1: "Can I + ..."  should mention Can I
  if (eng.startsWith('Can I') && !rule.includes('Can I')) console.log('  RULE MISMATCH: phrase starts with "Can I" but rule does not mention it');
  if (eng.startsWith('When') && !rule.includes('When')) console.log('  RULE MISMATCH: phrase starts with "When" but rule does not mention it');
  if (eng.startsWith('Where') && !rule.includes('Where')) console.log('  RULE MISMATCH: phrase starts with "Where" but rule does not mention it');
  if (eng.startsWith('How long') && !rule.includes('How long')) console.log('  RULE MISMATCH: phrase starts with "How long" but rule does not mention it');
  if (eng.startsWith('Can you') && !rule.includes('Can you')) console.log('  RULE MISMATCH: phrase starts with "Can you" but rule does not mention it');
  if (eng.startsWith('What time') && !rule.includes('What time')) console.log('  RULE MISMATCH: phrase starts with "What time" but rule does not mention it');
}
console.log('(done)');

// --- 4. constructions tag check ---
console.log('\n=== CHECK 4: constructions tags ===');
// phrase_1 "Can I join this tour?" — NOT a wh-question, it's a yes/no modal
for (const p of phrases) {
  const eng = p.english;
  const c = p.constructions;
  const isWH = /^(When|Where|What|How|Why|Who)/i.test(eng);
  const isModal = /^Can /i.test(eng);
  if (!isWH && c.includes('wh-questions') && !isModal) {
    console.log(`SUSPICIOUS wh-questions tag on non-WH phrase: ${p.id} "${eng}"`);
  }
  if (eng.startsWith('Can I') && c.includes('wh-questions')) {
    console.log(`SUSPICIOUS wh-questions on yes/no question: ${p.id} "${eng}" — is this intentional?`);
  }
}
console.log('(done)');

// --- 5. distractors count (must be exactly 5) ---
console.log('\n=== CHECK 5: distractor counts ===');
for (const p of phrases) {
  for (const w of p.words) {
    if (w.distractors.length !== 5) {
      console.log(`DISTRACTOR COUNT ${w.distractors.length}!=5: ${p.id} word "${w.text}"`);
    }
  }
}
console.log('(done)');

// --- 6. ES meaning faithfulness (spot-check) ---
console.log('\n=== CHECK 6: ES meaning spot checks ===');
// phrase_3 EN: "Where can we meet the guide?"
// ES meaning: "¿Dónde podemos encontrar al guía?"
// "meet" = encontrar OR conocer; "encontrar" is ok but "conocer" might be more natural for meeting a person
// "al guía" — correct (a + el = al), guide is masculine
// phrase_5 EN: "Can you speak more slowly please?"
// ES meaning: "¿Puede hablar más despacio, por favor?"
// "Can you" -> "¿Puede usted" (formal) or "¿Puedes" (informal)
// The ES uses "Puede" (usted-formal, no pronoun) — could be intentional for tourist context, but note asymmetry with UK/RU
// phrase_4 "How long does the tour last?" -> "¿Cuánto dura la excursión?" — CORRECT (cuánto without "tiempo")
console.log('phrase_3 es meaning: ¿Dónde podemos encontrar al guía?');
console.log('  NOTE: "encontrar al guía" vs "quedar con el guía" — both fine, encontrar is acceptable');
console.log('phrase_5 es meaning: ¿Puede hablar más despacio, por favor?');
console.log('  NOTE: "Puede" = usted formal, while "Can you" is neutral. RU/UK are also formal (Можете/Можете). OK.');
console.log('phrase_4 es meaning: ¿Cuánto dura la excursión? — OK (cuánto has accent)');

// --- 7. vocabulary es accent check ---
console.log('\n=== CHECK 7: vocabulary ES translations ===');
const vocab = [
  {word:'tour',translation:{ru:'экскурсия, тур',uk:'екскурсія, тур',es:'excursión, tour'}},
  {word:'join',translation:{ru:'присоединиться',uk:'приєднатися',es:'unirse'}},
  {word:'guide',translation:{ru:'гид, экскурсовод',uk:'гід, екскурсовод',es:'guía'}},
  {word:'start',translation:{ru:'начинаться',uk:'починатися',es:'empezar'}},
  {word:'last',translation:{ru:'длиться, продолжаться',uk:'тривати',es:'durar'}},
  {word:'slowly',translation:{ru:'медленно',uk:'повільно',es:'despacio'}},
];
for (const v of vocab) {
  console.log(`${v.word}: uk="${v.translation.uk}" es="${v.translation.es}"`);
  if (v.translation.ru === v.translation.uk) console.log(`  COPY ru=uk!`);
}
console.log('(done)');

// --- 8. "slowly" word missing article in phrase_5 ---
console.log('\n=== CHECK 8: phrase_5 words — "the" missing before "guide"? (phrase 3 check) ===');
const p3 = phrases.find(p=>p.id==='voyazh_d63_phrase_3');
const wordTexts = p3.words.map(w=>w.text);
console.log('phrase_3 word texts:', wordTexts.join(' '));
// EN: "Where can we meet the guide?"
// words: Where, can, we, meet, guide  — MISSING "the"
if (!wordTexts.includes('the')) {
  console.log('MISSING WORD: "the" before "guide" in phrase_3 words array');
}
console.log('(done)');
