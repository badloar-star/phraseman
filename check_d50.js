
const issues = [];

// ---- Data ----
const topic = {ru:'Спросить как добраться',uk:'Запитати як дістатися',es:'Preguntar cómo llegar'};
const outcome = {
  ru:'Ты умеешь спросить и объяснить дорогу по-английски в городе',
  uk:'Ти вмієш запитати та пояснити дорогу по-англійськи в місті',
  es:'Puedes preguntar y explicar cómo llegar a un lugar en inglés'
};

const intro = [
  {
    kind:'tip',
    title:{ru:'Как спрашивают дорогу',uk:'Як запитують дорогу',es:'Cómo se pregunta el camino'},
    body:{
      ru:'В английском вопрос о дороге начинается с «How do I get to...» — это значит «Как мне добраться до...». Вопрос вежливый и подходит для любого незнакомца.',
      uk:'В англійській мові питання про дорогу починається з «How do I get to...» — це означає «Як мені дістатися до...». Питання ввічливе і підходить для будь-якого незнайомця.',
      es:'En inglés, la pregunta sobre cómo llegar a un lugar empieza con «How do I get to...», que significa «¿Cómo llego a...?». Es una pregunta educada para cualquier desconocido.'
    },
    examples:[{en:'How do I get to the station?',gloss:{ru:'Как мне добраться до станции?',uk:'Як мені дістатися до станції?',es:'¿Cómo llego a la estación?'}}]
  },
  {
    kind:'tip',
    title:{ru:'Где находится — простой вопрос',uk:'Де знаходиться — просте питання',es:'Dónde está — una pregunta sencilla'},
    body:{
      ru:'«Where is...?» — самый короткий способ спросить, где что-то находится. Его понимают везде и всегда готовы ответить.',
      uk:'«Where is...?» — найкоротший спосіб запитати, де щось знаходиться. Його розуміють скрізь і завжди готові відповісти.',
      es:'«Where is...?» es la forma más corta de preguntar dónde está algo. Se entiende en todas partes y la gente siempre está lista para responder.'
    },
    examples:[{en:'Where is the bus stop?',gloss:{ru:'Где автобусная остановка?',uk:'Де автобусна зупинка?',es:'¿Dónde está la parada de autobús?'}}]
  },
  {
    kind:'tip',
    title:{ru:'Уточнить расстояние и время',uk:'Уточнити відстань і час',es:'Aclarar la distancia y el tiempo'},
    body:{
      ru:'Чтобы понять, далеко ли идти, спроси «How far is it?» — это «Далеко ли это?». А «How long does it take?» — «Сколько времени это займёт?».',
      uk:'Щоб зрозуміти, чи далеко йти, запитай «How far is it?» — це «Чи далеко це?». А «How long does it take?» — «Скільки часу це займе?».',
      es:'Para saber si está lejos, pregunta «How far is it?», que significa «¿Está lejos?». Y «How long does it take?» significa «¿Cuánto tiempo se tarda?».'
    },
    examples:[{en:'How long does it take by bus?',gloss:{ru:'Сколько времени ехать на автобусе?',uk:'Скільки часу їхати на автобусі?',es:'¿Cuánto tiempo se tarda en autobús?'}}]
  }
];

const phrases = [
  {
    id:'impuls_d50_p1',english:'How do I get to the centre?',
    meaning:{ru:'Как мне добраться до центра?',uk:'Як мені дістатися до центру?',es:'¿Cómo llego al centro?'},
    constructions:['wh-questions','present-simple'],
    explanation:{
      title:{ru:'Спрашиваем дорогу',uk:'Запитуємо дорогу',es:'Preguntamos el camino'},
      rule:{ru:'«How do I get to...» — вопрос о способе добраться куда-то.',uk:'«How do I get to...» — питання про спосіб дістатися кудись.',es:'«How do I get to...» es una pregunta sobre cómo llegar a algún lugar.'},
      why:{ru:'«How» начинает вопрос о способе, «do I» показывает вопрос в настоящем времени.',uk:'«How» починає питання про спосіб, «do I» показує питання в теперішньому часі.',es:'«How» inicia la pregunta sobre el modo, «do I» indica el presente.'},
      commonMistake:{ru:'Не говори «How I get» — нужно вспомогательное «do»: «How do I get».',uk:'Не кажи «How I get» — потрібне допоміжне «do»: «How do I get».',es:'No digas «How I get» — se necesita el auxiliar «do»: «How do I get».'}
    }
  },
  {
    id:'impuls_d50_p2',english:'Where is the nearest bus stop?',
    meaning:{ru:'Где ближайшая автобусная остановка?',uk:'Де найближча автобусна зупинка?',es:'¿Dónde está la parada de autobús más cercana?'},
    constructions:['wh-questions','present-simple'],
    explanation:{
      title:{ru:'Ищем остановку',uk:'Шукаємо зупинку',es:'Buscamos la parada'},
      rule:{ru:'«Where is...» — вопрос о местонахождении чего-либо.',uk:'«Where is...» — питання про місцезнаходження чогось.',es:'«Where is...» es una pregunta sobre la ubicación de algo.'},
      why:{ru:'«Nearest» значит «самый близкий» — так уточняем, что нужна ближайшая остановка.',uk:'«Nearest» означає «найближчий» — так уточнюємо, що потрібна найближча зупинка.',es:'«Nearest» significa «el más cercano» — así aclaramos que queremos la parada más próxima.'},
      commonMistake:{ru:'Не говори «Where is nearest» — нужен артикль: «Where is the nearest».',uk:'Не кажи «Where is nearest» — потрібен артикль: «Where is the nearest».',es:'No digas «Where is nearest» — se necesita el artículo: «Where is the nearest».'}
    }
  },
  {
    id:'impuls_d50_p3',english:'Does this bus go to the centre?',
    meaning:{ru:'Этот автобус едет до центра?',uk:'Цей автобус їде до центру?',es:'¿Este autobús va al centro?'},
    constructions:['present-simple'],
    explanation:{
      title:{ru:'Проверяем маршрут',uk:'Перевіряємо маршрут',es:'Comprobamos la ruta'},
      rule:{ru:'«Does this ... go to...?» — спрашиваем, идёт ли транспорт в нужное место.',uk:'«Does this ... go to...?» — запитуємо, чи їде транспорт у потрібне місце.',es:'«Does this ... go to...?» — preguntamos si el transporte va a nuestro destino.'},
      why:{ru:'«Does» нужно для вопроса, когда говорим о «he/she/it» — то есть об автобусе.',uk:'«Does» потрібне для питання, коли говоримо про «he/she/it» — тобто про автобус.',es:'«Does» se usa para preguntas cuando hablamos de «he/she/it» — en este caso, el autobús.'},
      commonMistake:{ru:'Не говори «Do this bus» — автобус — это «it», нужно «Does this bus».',uk:'Не кажи «Do this bus» — автобус — це «it», потрібно «Does this bus».',es:'No digas «Do this bus» — el autobús es «it», se necesita «Does this bus».'}
    }
  },
  {
    id:'impuls_d50_p4',english:'How long does it take by metro?',
    meaning:{ru:'Сколько времени ехать на метро?',uk:'Скільки часу їхати на метро?',es:'¿Cuánto tiempo se tarda en metro?'},
    constructions:['wh-questions','present-simple'],
    explanation:{
      title:{ru:'Спрашиваем о времени',uk:'Запитуємо про час',es:'Preguntamos sobre el tiempo'},
      rule:{ru:'«How long does it take» — вопрос о том, сколько времени займёт что-то.',uk:'«How long does it take» — питання про те, скільки часу займе щось.',es:'«How long does it take» es una pregunta sobre cuánto tiempo tarda algo.'},
      why:{ru:'«By metro» значит «на метро» — так говорим о виде транспорта без артикля.',uk:'«By metro» означає «на метро» — так кажемо про вид транспорту без артикля.',es:'«By metro» significa «en metro» — así hablamos del medio de transporte sin artículo.'},
      commonMistake:{ru:'Не говори «How long take» — нужно «How long does it take».',uk:'Не кажи «How long take» — потрібно «How long does it take».',es:'No digas «How long take» — se necesita «How long does it take».'}
    }
  },
  {
    id:'impuls_d50_p5',english:'Do I need to change trains?',
    meaning:{ru:'Мне нужно делать пересадку?',uk:'Мені потрібно робити пересадку?',es:'¿Necesito hacer transbordo?'},
    constructions:['present-simple','wh-questions'],
    explanation:{
      title:{ru:'Пересадка или нет',uk:'Пересадка чи ні',es:'Transbordo o no'},
      rule:{ru:'«Do I need to...» — спрашиваем, нужно ли нам что-то делать.',uk:'«Do I need to...» — запитуємо, чи потрібно нам щось робити.',es:'«Do I need to...» — preguntamos si necesitamos hacer algo.'},
      why:{ru:'«Change trains» значит «сделать пересадку на поезде/метро» — стандартное выражение.',uk:'«Change trains» означає «зробити пересадку на потязі/метро» — стандартний вираз.',es:'«Change trains» significa «hacer transbordo en tren/metro» — es una expresión habitual.'},
      commonMistake:{ru:'Не говори «change the train» — без артикля: «change trains».',uk:'Не кажи «change the train» — без артикля: «change trains».',es:'No digas «change the train» — sin artículo: «change trains».'}
    }
  },
  {
    id:'impuls_d50_p6',english:'Which way do I turn here?',
    meaning:{ru:'В какую сторону мне повернуть здесь?',uk:'В який бік мені повернути тут?',es:'¿En qué dirección giro aquí?'},
    constructions:['wh-questions','present-simple'],
    explanation:{
      title:{ru:'Уточняем направление',uk:'Уточнюємо напрямок',es:'Aclaramos la dirección'},
      rule:{ru:'«Which way do I...» — спрашиваем, в каком направлении двигаться.',uk:'«Which way do I...» — запитуємо, в якому напрямку рухатися.',es:'«Which way do I...» — preguntamos en qué dirección moverse.'},
      why:{ru:'«Which way» значит «в какую сторону» — помогает уточнить поворот налево или направо.',uk:'«Which way» означає «в який бік» — допомагає уточнити поворот ліворуч або праворуч.',es:'«Which way» significa «en qué dirección» — ayuda a aclarar si hay que girar a la izquierda o a la derecha.'},
      commonMistake:{ru:'Не говори «What way» — для выбора из вариантов используй «Which way».',uk:'Не кажи «What way» — для вибору з варіантів використовуй «Which way».',es:'No digas «What way» — para elegir entre opciones se usa «Which way».'}
    }
  }
];

const vocabulary = [
  {word:'centre',partOfSpeech:'noun',translation:{ru:'центр (города)',uk:'центр (міста)',es:'centro (de la ciudad)'},example:'How do I get to the centre?'},
  {word:'nearest',partOfSpeech:'adjective',translation:{ru:'ближайший',uk:'найближчий',es:'más cercano'},example:'Where is the nearest bus stop?'},
  {word:'metro',partOfSpeech:'noun',translation:{ru:'метро',uk:'метро',es:'metro'},example:'How long does it take by metro?'},
  {word:'trains',partOfSpeech:'noun',translation:{ru:'поезда / электрички',uk:'потяги / електрички',es:'trenes'},example:'Do I need to change trains?'},
  {word:'way',partOfSpeech:'noun',translation:{ru:'сторона, направление',uk:'бік, напрямок',es:'dirección, lado'},example:'Which way do I turn here?'},
  {word:'stop',partOfSpeech:'noun',translation:{ru:'остановка',uk:'зупинка',es:'parada'},example:'Where is the nearest bus stop?'}
];

// ---- CHECKS ----

function flag(where, problem, fix, severity='medium') {
  issues.push({where, problem, fix, severity});
}

// 1. uk/es not copies of ru
function checkNotCopy(path, ru, uk, es) {
  if (ru && uk && ru.trim() === uk.trim()) flag(path+'.uk','uk identical to ru','Rewrite in Ukrainian','high');
  if (ru && es && ru.trim() === es.trim()) flag(path+'.es','es identical to ru','Rewrite in Spanish','high');
  if (uk && es && uk.trim() === es.trim()) flag(path+'.es','es identical to uk','Rewrite in Spanish','high');
}

// 2. Spanish questions need ¿
function checkEs(path, text) {
  if (!text) return;
  const t = text.trim();
  // Sentence-level question check: if the sentence ends with ? but does NOT start with ¿
  // Split by period and check each sub-sentence
  // Actually, we need to check each standalone question
  // Look for any substring ending with ? that doesn't have a matching ¿
  const questionFragments = t.match(/[^.!]*\?/g);
  if (questionFragments) {
    questionFragments.forEach(fragment => {
      const f = fragment.trim();
      // Check if this fragment starts with ¿ or is preceded by ¿ in context
      // Find where this fragment appears in original text
      const idx = t.indexOf(f);
      const charBefore = idx > 0 ? t[idx-1] : '';
      // Check if there's a ¿ before the question word
      const contextBefore = t.substring(Math.max(0, idx-2), idx);
      if (!contextBefore.includes('¿') && !f.startsWith('¿')) {
        // It's a question fragment without ¿
        // But check: is it inside guillemets (cited English)? Skip if so.
        const posInFull = t.indexOf(f);
        const preceding = t.substring(0, posInFull);
        const openGuillemet = (preceding.match(/«/g)||[]).length;
        const closeGuillemet = (preceding.match(/»/g)||[]).length;
        if (openGuillemet === closeGuillemet) {
          // Not inside guillemets, it's a real Spanish question
          flag(path, 'Spanish question missing opening ¿ before: "'+f.substring(0,40)+'"', 'Add ¿ before the question', 'high');
        }
      }
    });
  }

  // Accent checks on key interrogatives
  const interrogatives = [
    {re:/\bComo\b/, correct:'Cómo'},
    {re:/\bcomo\b(?=[^»]*[?])/, correct:'cómo (in question context)'},
    {re:/\bDonde\b/, correct:'Dónde'},
    {re:/\bdonde\b(?=[^»]*[?])/, correct:'dónde'},
    {re:/\bCuanto\b/, correct:'Cuánto'},
    {re:/\bcuanto\b/, correct:'cuánto'},
    {re:/\bQue\b/, correct:'Qué'},
  ];
  interrogatives.forEach(({re, correct}) => {
    if (re.test(text)) {
      flag(path, 'Possible missing accent: should be '+correct, 'Add accent mark', 'medium');
    }
  });
}

// 3. meaning vs rule: rule quoted pattern must relate to english phrase
function checkMeaningRule(phrase) {
  const p = phrase.id;
  const eng = phrase.english;
  const ruleru = phrase.explanation.rule.ru;
  const why = phrase.explanation.why.ru;
  const meaning = phrase.meaning.ru;

  // Extract first quoted pattern from rule
  const m = ruleru.match(/«([^»]+)»/);
  if (m) {
    const pattern = m[1].replace(/\.\.\./g, '').trim();
    const firstTwoWords = pattern.split(' ').slice(0,2).join(' ').toLowerCase();
    if (!eng.toLowerCase().includes(firstTwoWords)) {
      flag(p+'.explanation.rule',
        'Rule pattern «'+m[1]+'» does not match English phrase "'+eng+'"',
        'Align rule pattern with actual English phrase', 'high');
    }
  }

  // Check why.ru doesn't duplicate rule.ru meaning differently in a misleading way
  // p5: constructions includes 'wh-questions' but phrase is a yes/no question (Do I...)
  if (phrase.constructions.includes('wh-questions') && !eng.match(/^(What|Where|When|Who|Why|How|Which)/i)) {
    flag(p+'.constructions',
      'constructions includes "wh-questions" but "'+eng+'" is a yes/no question, not a wh-question',
      'Remove "wh-questions" from constructions; this is a yes/no question (present-simple only)', 'medium');
  }
}

// Run all checks
checkNotCopy('topic', topic.ru, topic.uk, topic.es);
checkNotCopy('outcome', outcome.ru, outcome.uk, outcome.es);

intro.forEach((tip, i) => {
  const path = 'intro['+i+']';
  checkNotCopy(path+'.title', tip.title.ru, tip.title.uk, tip.title.es);
  checkNotCopy(path+'.body', tip.body.ru, tip.body.uk, tip.body.es);
  checkEs(path+'.title.es', tip.title.es);
  checkEs(path+'.body.es', tip.body.es);
  tip.examples.forEach((ex, j) => {
    checkNotCopy(path+'.examples['+j+'].gloss', ex.gloss.ru, ex.gloss.uk, ex.gloss.es);
    checkEs(path+'.examples['+j+'].gloss.es', ex.gloss.es);
  });
});

phrases.forEach((ph) => {
  const p = ph.id;
  checkNotCopy(p+'.meaning', ph.meaning.ru, ph.meaning.uk, ph.meaning.es);
  checkEs(p+'.meaning.es', ph.meaning.es);
  checkNotCopy(p+'.explanation.title', ph.explanation.title.ru, ph.explanation.title.uk, ph.explanation.title.es);
  checkNotCopy(p+'.explanation.rule', ph.explanation.rule.ru, ph.explanation.rule.uk, ph.explanation.rule.es);
  checkNotCopy(p+'.explanation.why', ph.explanation.why.ru, ph.explanation.why.uk, ph.explanation.why.es);
  checkNotCopy(p+'.explanation.commonMistake', ph.explanation.commonMistake.ru, ph.explanation.commonMistake.uk, ph.explanation.commonMistake.es);
  checkEs(p+'.explanation.rule.es', ph.explanation.rule.es);
  checkEs(p+'.explanation.why.es', ph.explanation.why.es);
  checkEs(p+'.explanation.commonMistake.es', ph.explanation.commonMistake.es);
  checkMeaningRule(ph);
});

vocabulary.forEach((v) => {
  checkNotCopy('vocabulary.'+v.word+'.translation', v.translation.ru, v.translation.uk, v.translation.es);
});

// Additional semantic check: p5 'Do I need to change trains?' is in constructions:['present-simple','wh-questions']
// Already caught above. Also check intro title 2 es: 'Dónde está — una pregunta sencilla'
// 'Dónde' without ¿ in a title is fine (not a sentence-question)

console.log('Total issues:', issues.length);
issues.forEach((iss, i) => {
  console.log('\n#'+i, JSON.stringify(iss));
});
