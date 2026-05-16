import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const tri = (ru: string, uk: string, es: string): TriText => ({ ru, uk, es });

const CONTRAST = [
  'turn on',
  'turn off',
  'look up',
  'look for',
  'pick up',
  'give up',
  'find out',
  'run out of',
];

function phrasalStep(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  correctFeedback: TriText;
  wrong: Record<string, TriText>;
  retry: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Смотри на пару целиком. В английском короткая частица после глагола часто меняет смысл всей фразы.',
      'Дивись на пару цілком. В англійській коротка частка після дієслова часто змінює сенс усієї фрази.',
      'Mira la pareja completa. En inglés, la partícula corta después del verbo cambia el sentido de toda la frase.',
    ),
    microTask: tri(
      'Выбери частицу, которая дает нужный смысл.',
      'Обери частку, яка дає потрібний сенс.',
      'Elige la partícula que da el sentido correcto.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(input.options
      .filter((option) => option !== input.correctAnswer)
      .map((option) => [option, input.wrong[option] ?? tri(
        `С частицей ${option} получится другой смысл. Здесь нужна пара с ${input.correctAnswer}.`,
        `З часткою ${option} вийде інший сенс. Тут потрібна пара з ${input.correctAnswer}.`,
        `Con ${option} sale otro sentido. Aquí necesitamos la pareja con ${input.correctAnswer}.`,
      )])),
    retryFeedback: [
      input.retry[0],
      input.retry[1],
      input.retry[2],
      tri(
        `Подсказка: нужная частица - ${input.correctAnswer}.`,
        `Підказка: потрібна частка - ${input.correctAnswer}.`,
        `Pista: la partícula correcta es ${input.correctAnswer}.`,
      ),
    ],
    fallbackExplanation: tri(
      'Не переводи глагол отдельно. Учим маленькие пары: turn on = включить, turn off = выключить, look up = найти в справочнике, look for = искать.',
      'Не перекладай дієслово окремо. Вчимо маленькі пари: turn on = увімкнути, turn off = вимкнути, look up = знайти у довіднику, look for = шукати.',
      'No traduzcas el verbo solo. Aprende parejas: turn on, turn off, look up, look for.',
    ),
    focusWords: input.focusWords,
  };
}

export const PHRASAL_PARTICLE_PAIR_TRAINING: DiagnosisTraining = {
  id: 'phrasal_particle_pair',
  category: 'phrasal_particle',
  version: '1.0.0',
  status: 'ready_for_mvp_review',
  priority: 37,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'Глагол + частица: учим пару целиком',
    'Дієслово + частка: вчимо пару цілком',
    'Verbo + partícula: aprende la pareja completa',
  ),
  shortTitle: tri('Глагол + частица', 'Дієслово + частка', 'Verbo + partícula'),
  shortDiagnosis: tri(
    'Ты выбираешь частицу отдельно от глагола, а смысл живет в паре целиком.',
    'Ти обираєш частку окремо від дієслова, а сенс живе в парі цілком.',
    'Eliges la partícula separada del verbo, pero el sentido está en la pareja completa.',
  ),
  diagnosisText: tri(
    'Ты путаешь пары вроде turn on, turn off, look up, look for. Ошибка не в одном слове: маленькая частица после глагола меняет смысл всей фразы.',
    'Ти плутаєш пари на кшталт turn on, turn off, look up, look for. Помилка не в одному слові: маленька частка після дієслова змінює сенс усієї фрази.',
    'Confundes parejas como turn on, turn off, look up, look for. El error no está en una sola palabra: la partícula cambia el sentido de toda la frase.',
  ),
  mentalModel: tri(
    'Держи в голове готовый блок: глагол + частица = один смысл. Сначала спроси “что именно хочу сказать?”, потом выбери пару.',
    'Тримай у голові готовий блок: дієслово + частка = один сенс. Спочатку спитай “що саме хочу сказати?”, потім обери пару.',
    'Guarda el bloque completo: verbo + partícula = un sentido. Primero pregunta qué quieres decir; luego elige la pareja.',
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Не учи turn, look, pick отдельно. Учим пары: turn on = включить, turn off = выключить, look up = найти информацию, look for = искать, pick up = поднять или забрать.',
    'Не вчи turn, look, pick окремо. Вчимо пари: turn on = увімкнути, turn off = вимкнути, look up = знайти інформацію, look for = шукати, pick up = підняти або забрати.',
    'No aprendas turn, look, pick solos. Aprende parejas: turn on, turn off, look up, look for, pick up.',
  ),
  whatUserMustLearn: {
    ru: [
      'Одна частица может полностью менять смысл пары.',
      'Turn on значит включить; turn off значит выключить.',
      'Look up значит найти информацию; look for значит искать кого-то или что-то.',
      'Pick up может значить поднять или забрать человека.',
      'Give up значит сдаться или перестать пытаться.',
      'Find out значит узнать информацию.',
      'Run out of значит, что что-то закончилось.',
    ],
    uk: [
      'Одна частка може повністю змінювати сенс пари.',
      'Turn on означає увімкнути; turn off означає вимкнути.',
      'Look up означає знайти інформацію; look for означає шукати когось або щось.',
      'Pick up може означати підняти або забрати людину.',
      'Give up означає здатися або перестати намагатися.',
      'Find out означає дізнатися інформацію.',
      'Run out of означає, що щось закінчилося.',
    ],
    es: [
      'Una partícula puede cambiar totalmente el sentido de la pareja.',
      'Turn on significa encender; turn off significa apagar.',
      'Look up significa buscar información; look for significa buscar algo o a alguien.',
      'Pick up puede significar levantar o recoger a una persona.',
      'Give up significa rendirse o dejar de intentar.',
      'Find out significa descubrir información.',
      'Run out of significa quedarse sin algo.',
    ],
  },
  examples: [
    { en: 'Please turn on the light.', ru: 'Пожалуйста, включи свет.', uk: 'Будь ласка, увімкни світло.', es: 'Por favor, enciende la luz.', why: tri('Turn on дает смысл включить.', 'Turn on дає сенс увімкнути.', 'Turn on da el sentido de encender.') },
    { en: 'Please turn off the TV.', ru: 'Пожалуйста, выключи телевизор.', uk: 'Будь ласка, вимкни телевізор.', es: 'Por favor, apaga la tele.', why: tri('Turn off дает смысл выключить.', 'Turn off дає сенс вимкнути.', 'Turn off da el sentido de apagar.') },
    { en: 'I looked up the word.', ru: 'Я нашел слово в словаре.', uk: 'Я знайшов слово у словнику.', es: 'Busqué la palabra en el diccionario.', why: tri('Look up - найти информацию.', 'Look up - знайти інформацію.', 'Look up es buscar información.') },
    { en: 'I am looking for my keys.', ru: 'Я ищу ключи.', uk: 'Я шукаю ключі.', es: 'Estoy buscando mis llaves.', why: tri('Look for - искать вещь или человека.', 'Look for - шукати річ або людину.', 'Look for es buscar algo o a alguien.') },
    { en: 'Can you pick me up at six?', ru: 'Можешь забрать меня в шесть?', uk: 'Можеш забрати мене о шостій?', es: 'Puedes recogerme a las seis?', why: tri('Pick up здесь значит забрать человека.', 'Pick up тут означає забрати людину.', 'Pick up aquí significa recoger a una persona.') },
    { en: 'Do not give up.', ru: 'Не сдавайся.', uk: 'Не здавайся.', es: 'No te rindas.', why: tri('Give up - перестать пытаться.', 'Give up - перестати намагатися.', 'Give up es rendirse.') },
    { en: 'We ran out of coffee.', ru: 'У нас закончился кофе.', uk: 'У нас закінчилася кава.', es: 'Nos quedamos sin café.', why: tri('Run out of значит, что запас закончился.', 'Run out of означає, що запас закінчився.', 'Run out of significa quedarse sin algo.') },
    { en: 'I found out the answer.', ru: 'Я узнал ответ.', uk: 'Я дізнався відповідь.', es: 'Descubrí la respuesta.', why: tri('Find out - узнать информацию.', 'Find out - дізнатися інформацію.', 'Find out es descubrir información.') },
  ],
  introBlocks: [
    {
      id: 'intro_pair',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты видишь глагол, но теряешь вторую часть пары. Из-за этого фраза получает другой смысл.',
        'Схоже, ти бачиш дієслово, але губиш другу частину пари. Через це фраза отримує інший сенс.',
        'Parece que ves el verbo, pero pierdes la segunda parte de la pareja. Así la frase cambia de sentido.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Мини-правило: не выбирай частицу на слух. Сначала выбери смысл: включить, выключить, искать, узнать, сдаться.',
        'Міні-правило: не обирай частку навмання. Спочатку обери сенс: увімкнути, вимкнути, шукати, дізнатися, здатися.',
        'Regla pequeña: no elijas la partícula al azar. Primero elige el sentido: encender, apagar, buscar, descubrir, rendirse.',
      ),
    },
    {
      id: 'intro_pairs',
      type: 'contrast',
      text: tri(
        'Пары для тренировки: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
        'Пари для тренування: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
        'Parejas para entrenar: turn on / turn off, look up / look for, pick up, give up, find out, run out of.',
      ),
    },
  ],
  steps: [
    phrasalStep({ id: 'phrasal_easy_001', order: 1, difficulty: 'easy', targetSkill: 'turn_on', sentence: 'Please turn ___ the light.', translation: tri('Пожалуйста, включи свет.', 'Будь ласка, увімкни світло.', 'Por favor, enciende la luz.'), options: ['on', 'off', 'up', 'out'], correctAnswer: 'on', correctFeedback: tri('Да. Turn on = включить.', 'Так. Turn on = увімкнути.', 'Sí. Turn on = encender.'), wrong: { off: tri('Turn off значит выключить, а здесь нужно включить.', 'Turn off означає вимкнути, а тут потрібно увімкнути.', 'Turn off es apagar; aquí necesitamos encender.'), up: tri('Turn up значит увеличить громкость или силу, не включить свет.', 'Turn up означає збільшити гучність або силу, не увімкнути світло.', 'Turn up es subir volumen o intensidad, no encender la luz.'), out: tri('Turn out дает другой смысл. Для включить свет нужна пара turn on.', 'Turn out дає інший сенс. Для увімкнути світло потрібна пара turn on.', 'Turn out da otro sentido. Para encender la luz necesitamos turn on.') }, retry: [tri('Нужен смысл включить.', 'Потрібен сенс увімкнути.', 'Necesitamos el sentido de encender.'), tri('Включить = turn on.', 'Увімкнути = turn on.', 'Encender = turn on.'), tri('Подсказка: turn on the light.', 'Підказка: turn on the light.', 'Pista: turn on the light.')], focusWords: ['turn on'] }),
    phrasalStep({ id: 'phrasal_easy_002', order: 2, difficulty: 'easy', targetSkill: 'turn_off', sentence: 'Please turn ___ the TV.', translation: tri('Пожалуйста, выключи телевизор.', 'Будь ласка, вимкни телевізор.', 'Por favor, apaga la tele.'), options: ['off', 'on', 'up', 'back'], correctAnswer: 'off', correctFeedback: tri('Да. Turn off = выключить.', 'Так. Turn off = вимкнути.', 'Sí. Turn off = apagar.'), wrong: { on: tri('Turn on значит включить. Здесь просим выключить.', 'Turn on означає увімкнути. Тут просимо вимкнути.', 'Turn on es encender. Aquí pedimos apagar.'), up: tri('Turn up значит сделать громче или сильнее.', 'Turn up означає зробити гучніше або сильніше.', 'Turn up es subir volumen o intensidad.'), back: tri('Turn back значит повернуть назад. Для телевизора здесь нужно off.', 'Turn back означає повернути назад. Для телевізора тут потрібно off.', 'Turn back es volver atrás. Aquí necesitamos off.') }, retry: [tri('Нужен смысл выключить.', 'Потрібен сенс вимкнути.', 'Necesitamos el sentido de apagar.'), tri('Выключить = turn off.', 'Вимкнути = turn off.', 'Apagar = turn off.'), tri('Подсказка: turn off the TV.', 'Підказка: turn off the TV.', 'Pista: turn off the TV.')], focusWords: ['turn off'] }),
    phrasalStep({ id: 'phrasal_easy_003', order: 3, difficulty: 'easy', targetSkill: 'look_up_information', sentence: 'I need to look ___ this word.', translation: tri('Мне нужно найти это слово в словаре.', 'Мені потрібно знайти це слово у словнику.', 'Necesito buscar esta palabra.'), options: ['up', 'for', 'at', 'after'], correctAnswer: 'up', correctFeedback: tri('Да. Look up = найти информацию.', 'Так. Look up = знайти інформацію.', 'Sí. Look up = buscar información.'), wrong: { for: tri('Look for значит искать предмет или человека. Здесь нужно найти информацию о слове.', 'Look for означає шукати річ або людину. Тут потрібно знайти інформацію про слово.', 'Look for es buscar algo o a alguien. Aquí buscamos información.'), at: tri('Look at значит смотреть на что-то.', 'Look at означає дивитися на щось.', 'Look at es mirar algo.'), after: tri('Look after значит заботиться. Это другой смысл.', 'Look after означає піклуватися. Це інший сенс.', 'Look after es cuidar. Es otro sentido.') }, retry: [tri('Нужно найти информацию.', 'Потрібно знайти інформацію.', 'Necesitamos buscar información.'), tri('Найти слово в словаре = look up.', 'Знайти слово у словнику = look up.', 'Buscar una palabra = look up.'), tri('Подсказка: look up this word.', 'Підказка: look up this word.', 'Pista: look up this word.')], focusWords: ['look up'] }),
    phrasalStep({ id: 'phrasal_easy_004', order: 4, difficulty: 'easy', targetSkill: 'look_for_search', sentence: 'I am looking ___ my keys.', translation: tri('Я ищу ключи.', 'Я шукаю ключі.', 'Estoy buscando mis llaves.'), options: ['for', 'up', 'at', 'out'], correctAnswer: 'for', correctFeedback: tri('Да. Look for = искать вещь или человека.', 'Так. Look for = шукати річ або людину.', 'Sí. Look for = buscar algo o a alguien.'), wrong: { up: tri('Look up значит найти информацию. Ключи мы ищем: look for.', 'Look up означає знайти інформацію. Ключі ми шукаємо: look for.', 'Look up es buscar información. Las llaves las buscamos con look for.'), at: tri('Look at значит смотреть на ключи, если они уже перед тобой.', 'Look at означає дивитися на ключі, якщо вони вже перед тобою.', 'Look at es mirar las llaves si ya están delante.'), out: tri('Look out значит осторожно или выглянуть. Это не поиск ключей.', 'Look out означає обережно або визирнути. Це не пошук ключів.', 'Look out significa cuidado o mirar afuera. No es buscar llaves.') }, retry: [tri('Нужен смысл искать.', 'Потрібен сенс шукати.', 'Necesitamos el sentido de buscar.'), tri('Искать ключи = look for keys.', 'Шукати ключі = look for keys.', 'Buscar llaves = look for keys.'), tri('Подсказка: looking for my keys.', 'Підказка: looking for my keys.', 'Pista: looking for my keys.')], focusWords: ['look for'] }),
    phrasalStep({ id: 'phrasal_contrast_001', order: 5, difficulty: 'contrast', targetSkill: 'pick_up_collect', sentence: 'Can you pick me ___ at six?', translation: tri('Можешь забрать меня в шесть?', 'Можеш забрати мене о шостій?', 'Puedes recogerme a las seis?'), options: ['up', 'out', 'off', 'on'], correctAnswer: 'up', correctFeedback: tri('Да. Pick up здесь значит забрать человека.', 'Так. Pick up тут означає забрати людину.', 'Sí. Pick up aquí es recoger a una persona.'), wrong: { out: tri('Pick out значит выбрать из нескольких вариантов.', 'Pick out означає вибрати з кількох варіантів.', 'Pick out es elegir entre varias opciones.'), off: tri('Pick off дает другой смысл. Забрать человека = pick up.', 'Pick off дає інший сенс. Забрати людину = pick up.', 'Pick off da otro sentido. Recoger a una persona = pick up.'), on: tri('Pick on значит придираться к кому-то. Это не забрать.', 'Pick on означає чіплятися до когось. Це не забрати.', 'Pick on es molestar a alguien. No es recoger.') }, retry: [tri('Нужен смысл забрать человека.', 'Потрібен сенс забрати людину.', 'Necesitamos recoger a una persona.'), tri('Забрать на машине = pick up.', 'Забрати машиною = pick up.', 'Recoger en coche = pick up.'), tri('Подсказка: pick me up.', 'Підказка: pick me up.', 'Pista: pick me up.')], focusWords: ['pick up'] }),
    phrasalStep({ id: 'phrasal_contrast_002', order: 6, difficulty: 'contrast', targetSkill: 'give_up_stop_trying', sentence: 'Do not give ___.', translation: tri('Не сдавайся.', 'Не здавайся.', 'No te rindas.'), options: ['up', 'out', 'away', 'back'], correctAnswer: 'up', correctFeedback: tri('Да. Give up = сдаться или перестать пытаться.', 'Так. Give up = здатися або перестати намагатися.', 'Sí. Give up = rendirse.'), wrong: { out: tri('Give out значит раздавать или перестать работать от усталости. Не сдавайся = give up.', 'Give out означає роздавати або виснажитися. Не здавайся = give up.', 'Give out es repartir o agotarse. No te rindas = give up.'), away: tri('Give away значит отдать бесплатно или раскрыть секрет.', 'Give away означає віддати безкоштовно або розкрити секрет.', 'Give away es regalar o revelar un secreto.'), back: tri('Give back значит вернуть вещь.', 'Give back означає повернути річ.', 'Give back es devolver algo.') }, retry: [tri('Нужен смысл не переставать пытаться.', 'Потрібен сенс не переставати намагатися.', 'Necesitamos no dejar de intentar.'), tri('Сдаться = give up.', 'Здатися = give up.', 'Rendirse = give up.'), tri('Подсказка: Do not give up.', 'Підказка: Do not give up.', 'Pista: Do not give up.')], focusWords: ['give up'] }),
    phrasalStep({ id: 'phrasal_contrast_003', order: 7, difficulty: 'contrast', targetSkill: 'find_out_discover', sentence: 'I want to find ___ the truth.', translation: tri('Я хочу узнать правду.', 'Я хочу дізнатися правду.', 'Quiero descubrir la verdad.'), options: ['out', 'up', 'for', 'off'], correctAnswer: 'out', correctFeedback: tri('Да. Find out = узнать или выяснить.', 'Так. Find out = дізнатися або зʼясувати.', 'Sí. Find out = descubrir o averiguar.'), wrong: { up: tri('Find up не дает нужный смысл. Узнать = find out.', 'Find up не дає потрібний сенс. Дізнатися = find out.', 'Find up no da el sentido. Descubrir = find out.'), for: tri('Find for не подходит. Искать обычно look for, а узнать правду = find out.', 'Find for не підходить. Шукати зазвичай look for, а дізнатися правду = find out.', 'Find for no encaja. Descubrir la verdad = find out.'), off: tri('Find off не нужная пара. Для узнать информацию нужна частица out.', 'Find off не потрібна пара. Для дізнатися інформацію потрібна частка out.', 'Find off no es la pareja necesaria. Para descubrir usamos out.') }, retry: [tri('Нужен смысл узнать информацию.', 'Потрібен сенс дізнатися інформацію.', 'Necesitamos descubrir información.'), tri('Узнать правду = find out the truth.', 'Дізнатися правду = find out the truth.', 'Descubrir la verdad = find out the truth.'), tri('Подсказка: find out the truth.', 'Підказка: find out the truth.', 'Pista: find out the truth.')], focusWords: ['find out'] }),
    phrasalStep({ id: 'phrasal_contrast_004', order: 8, difficulty: 'contrast', targetSkill: 'run_out_of_supply', sentence: 'We ran ___ coffee.', translation: tri('У нас закончился кофе.', 'У нас закінчилася кава.', 'Nos quedamos sin café.'), options: ['out of', 'into', 'over', 'away'], correctAnswer: 'out of', correctFeedback: tri('Да. Run out of = что-то закончилось.', 'Так. Run out of = щось закінчилося.', 'Sí. Run out of = quedarse sin algo.'), wrong: { into: tri('Run into значит встретить случайно или врезаться.', 'Run into означає зустріти випадково або врізатися.', 'Run into es encontrarse por casualidad o chocar.'), over: tri('Run over значит переехать или быстро просмотреть.', 'Run over означає переїхати або швидко переглянути.', 'Run over es atropellar o repasar rápido.'), away: tri('Run away значит убежать.', 'Run away означає втекти.', 'Run away es escapar.') }, retry: [tri('Нужен смысл запас закончился.', 'Потрібен сенс запас закінчився.', 'Necesitamos quedarse sin algo.'), tri('Закончился кофе = ran out of coffee.', 'Закінчилася кава = ran out of coffee.', 'Sin café = ran out of coffee.'), tri('Подсказка: ran out of coffee.', 'Підказка: ran out of coffee.', 'Pista: ran out of coffee.')], focusWords: ['run out of'] }),
    phrasalStep({ id: 'phrasal_mixed_001', order: 9, difficulty: 'mixed_review', targetSkill: 'put_on_clothes', sentence: 'Put ___ your jacket. It is cold.', translation: tri('Надень куртку. Холодно.', 'Одягни куртку. Холодно.', 'Ponte la chaqueta. Hace frío.'), options: ['on', 'off', 'up', 'out'], correctAnswer: 'on', correctFeedback: tri('Да. Put on = надеть одежду.', 'Так. Put on = одягнути одяг.', 'Sí. Put on = ponerse ropa.'), wrong: { off: tri('Put off значит отложить. С одеждой снять = take off, а надеть = put on.', 'Put off означає відкласти. З одягом зняти = take off, а одягнути = put on.', 'Put off es posponer. Ponerse ropa = put on.'), up: tri('Put up значит поднять или разместить. Куртку надеваем: put on.', 'Put up означає підняти або розмістити. Куртку одягаємо: put on.', 'Put up es levantar o colocar. Chaqueta = put on.'), out: tri('Put out значит погасить или вынести. Это не одежда.', 'Put out означає загасити або винести. Це не одяг.', 'Put out es apagar o sacar. No es ropa.') }, retry: [tri('Нужен смысл надеть.', 'Потрібен сенс одягнути.', 'Necesitamos ponerse ropa.'), tri('Надеть куртку = put on your jacket.', 'Одягнути куртку = put on your jacket.', 'Ponerse la chaqueta = put on your jacket.'), tri('Подсказка: Put on your jacket.', 'Підказка: Put on your jacket.', 'Pista: Put on your jacket.')], focusWords: ['put on'] }),
    phrasalStep({ id: 'phrasal_mixed_002', order: 10, difficulty: 'mixed_review', targetSkill: 'take_off_clothes', sentence: 'Take ___ your shoes before you come in.', translation: tri('Сними обувь перед тем, как войти.', 'Зніми взуття перед тим, як зайти.', 'Quítate los zapatos antes de entrar.'), options: ['off', 'on', 'up', 'out'], correctAnswer: 'off', correctFeedback: tri('Да. Take off = снять одежду или обувь.', 'Так. Take off = зняти одяг або взуття.', 'Sí. Take off = quitarse ropa o zapatos.'), wrong: { on: tri('Take on значит взять на себя задачу. Снять обувь = take off.', 'Take on означає взяти на себе завдання. Зняти взуття = take off.', 'Take on es asumir una tarea. Quitarse zapatos = take off.'), up: tri('Take up значит начать занятие или занять место.', 'Take up означає почати заняття або зайняти місце.', 'Take up es empezar una actividad u ocupar espacio.'), out: tri('Take out значит вынести или достать. С обувью здесь нужно off.', 'Take out означає винести або дістати. З взуттям тут потрібно off.', 'Take out es sacar. Con zapatos aquí necesitamos off.') }, retry: [tri('Нужен смысл снять.', 'Потрібен сенс зняти.', 'Necesitamos quitarse.'), tri('Снять обувь = take off your shoes.', 'Зняти взуття = take off your shoes.', 'Quitarse zapatos = take off your shoes.'), tri('Подсказка: Take off your shoes.', 'Підказка: Take off your shoes.', 'Pista: Take off your shoes.')], focusWords: ['take off'] }),
    phrasalStep({ id: 'phrasal_mixed_003', order: 11, difficulty: 'mixed_review', targetSkill: 'carry_on_continue', sentence: 'Please carry ___ with your work.', translation: tri('Пожалуйста, продолжай работу.', 'Будь ласка, продовжуй роботу.', 'Por favor, continúa con tu trabajo.'), options: ['on', 'out', 'off', 'up'], correctAnswer: 'on', correctFeedback: tri('Да. Carry on = продолжать.', 'Так. Carry on = продовжувати.', 'Sí. Carry on = continuar.'), wrong: { out: tri('Carry out значит выполнить план или задачу.', 'Carry out означає виконати план або завдання.', 'Carry out es realizar una tarea o plan.'), off: tri('Carry off значит справиться с чем-то сложным или унести. Здесь нужно продолжать.', 'Carry off означає впоратися зі складним або понести. Тут потрібно продовжувати.', 'Carry off tiene otro sentido. Aquí necesitamos continuar.'), up: tri('Carry up не дает нужный смысл. Продолжать = carry on.', 'Carry up не дає потрібний сенс. Продовжувати = carry on.', 'Carry up no da el sentido. Continuar = carry on.') }, retry: [tri('Нужен смысл продолжать.', 'Потрібен сенс продовжувати.', 'Necesitamos continuar.'), tri('Продолжать = carry on.', 'Продовжувати = carry on.', 'Continuar = carry on.'), tri('Подсказка: carry on with your work.', 'Підказка: carry on with your work.', 'Pista: carry on with your work.')], focusWords: ['carry on'] }),
    phrasalStep({ id: 'phrasal_mixed_004', order: 12, difficulty: 'mixed_review', targetSkill: 'fill_in_form', sentence: 'Please fill ___ this form.', translation: tri('Пожалуйста, заполни эту форму.', 'Будь ласка, заповни цю форму.', 'Por favor, rellena este formulario.'), options: ['in', 'out', 'up', 'off'], correctAnswer: 'in', correctFeedback: tri('Да. Fill in = заполнить форму.', 'Так. Fill in = заповнити форму.', 'Sí. Fill in = rellenar un formulario.'), wrong: { out: tri('Fill out тоже может значить заполнить форму, но здесь тренируем пару fill in как основной вариант.', 'Fill out теж може означати заповнити форму, але тут тренуємо пару fill in як основний варіант.', 'Fill out también puede servir, pero aquí entrenamos fill in.'), up: tri('Fill up значит наполнить до конца, например бак или стакан.', 'Fill up означає наповнити до кінця, наприклад бак або склянку.', 'Fill up es llenar por completo, como un tanque o vaso.'), off: tri('Fill off не нужная пара. Для формы здесь нужна частица in.', 'Fill off не потрібна пара. Для форми тут потрібна частка in.', 'Fill off no es la pareja necesaria. Para formulario usamos in.') }, retry: [tri('Нужен смысл заполнить форму.', 'Потрібен сенс заповнити форму.', 'Necesitamos rellenar un formulario.'), tri('Заполнить форму = fill in this form.', 'Заповнити форму = fill in this form.', 'Rellenar formulario = fill in this form.'), tri('Подсказка: fill in this form.', 'Підказка: fill in this form.', 'Pista: fill in this form.')], focusWords: ['fill in'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['turn_on_off_confusion', 'look_up_for_confusion', 'particle_meaning_unit'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем пару и смысл частицы.', 'Звичайне пояснення: показуємо пару і сенс частки.', 'Explicación normal: mostramos la pareja y el sentido de la partícula.'),
    depth2: tri('Проще: не глагол отдельно, а вся пара.', 'Простіше: не дієслово окремо, а вся пара.', 'Más simple: no el verbo solo, sino toda la pareja.'),
    depth3: tri('Сравни две пары: turn on = включить, turn off = выключить.', 'Порівняй дві пари: turn on = увімкнути, turn off = вимкнути.', 'Compara dos parejas: turn on y turn off.'),
    depth4: tri('Почти подсказка: выбери частицу под русский смысл.', 'Майже підказка: обери частку під український сенс.', 'Casi pista: elige la partícula según el sentido.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card' },
    afterThreeWrongInSameExercise: { action: 'show_pair_meaning_hint_then_retry' },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode' },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_phrasal_001', prompt: tri('Нужен смысл включить. Какая пара?', 'Потрібен сенс увімкнути. Яка пара?', 'Necesitamos encender. Qué pareja?'), options: ['turn on', 'turn off'], correctIndex: 0, thenReturnToExerciseId: 'phrasal_easy_001' },
      { id: 'guided_phrasal_002', prompt: tri('Нужен смысл искать ключи. Какая пара?', 'Потрібен сенс шукати ключі. Яка пара?', 'Necesitamos buscar llaves. Qué pareja?'), options: ['look up', 'look for'], correctIndex: 1, thenReturnToExerciseId: 'phrasal_easy_004' },
      { id: 'guided_phrasal_003', prompt: tri('Нужен смысл сдаться. Какая пара?', 'Потрібен сенс здатися. Яка пара?', 'Necesitamos rendirse. Qué pareja?'), options: ['give up', 'give back'], correctIndex: 0, thenReturnToExerciseId: 'phrasal_contrast_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'phrasal_particle',
    microDiagnosisId: 'phrasal_particle_pair',
    diagnosisLabel: tri('Глагол + частица', 'Дієслово + частка', 'Verbo + partícula'),
    contrastSet: CONTRAST,
    focusWords: ['turn on', 'turn off', 'look up', 'look for', 'pick up', 'give up', 'find out', 'run out of'],
    focusPatterns: ['turn_on', 'turn_off', 'look_up_information', 'look_for_search', 'pick_up_collect', 'give_up_stop_trying', 'find_out_discover', 'run_out_of_supply', 'put_on_clothes', 'take_off_clothes', 'carry_on_continue', 'fill_in_form'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_phrasal_particle_pair_start',
    answer: 'diagnosis_training_phrasal_particle_pair_answer',
    mastery: 'diagnosis_training_phrasal_particle_pair_mastery',
    fallback: 'diagnosis_training_phrasal_particle_pair_fallback',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'phrasal_particle',
      microDiagnosisId: 'phrasal_particle_pair',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logParticleChoice: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=phrasal_particle&microDiagnosisId=phrasal_particle_pair',
  },
  qualityChecklist: {
    hasStableId: true,
    hasCategory: true,
    hasMultilingualTitle: true,
    hasPlainDiagnosisText: true,
    hasMentalModel: true,
    hasContrastSet: true,
    hasAtLeastSixExamples: true,
    hasAtLeastTwelveExercises: true,
    hasEasyContrastMixedStructure: true,
    hasDistractorSpecificFeedback: true,
    hasRetryFeedbackLevels: true,
    hasGuidedModeForRepeatedMistakes: true,
    hasMasteryRules: true,
    hasSmartTrainerConfig: true,
    hasAnalyticsPayload: true,
    hasFallbackRoute: true,
  },
};
