// зачем (владелец 05.11: «Неправильные глаголы» es/fr/de/it — в 150, по образцу английского): экран глаголов показывает перевод на языке
// интерфейса. ru/uk лежат в словарях irregular_verbs_<lang>.mjs; для остальных 7 языков интерфейса — английский перевод (решение владельца
// 05.11: в 150 для es/pt-BR/vi/id/tr/pl допустим английский текст). Сборщик кладёт его в meaning.en.
export const MEANING_EN = {
  fr: {
    'être': 'to be', avoir: 'to have', aller: 'to go', faire: 'to do, to make', pouvoir: 'can, to be able', vouloir: 'to want',
    savoir: 'to know (how)', venir: 'to come', voir: 'to see', prendre: 'to take', dire: 'to say', mettre: 'to put, to put on',
    devoir: 'must, to have to', falloir: 'to be necessary', partir: 'to leave', sortir: 'to go out', dormir: 'to sleep', lire: 'to read',
    'écrire': 'to write', boire: 'to drink', 'connaître': 'to know (someone)', ouvrir: 'to open', plaire: 'to please, to like',
    recevoir: 'to receive', comprendre: 'to understand', tenir: 'to hold', croire: 'to believe', pleuvoir: 'to rain', courir: 'to run',
  },
  es: {
    ser: 'to be (permanent)', estar: 'to be (state, place)', ir: 'to go', tener: 'to have', hacer: 'to do, to make', decir: 'to say, to tell',
    poder: 'can, to be able', querer: 'to want, to love', venir: 'to come', haber: 'to have (auxiliary); there is', dar: 'to give', ver: 'to see',
    saber: 'to know (how)', poner: 'to put', salir: 'to go out, to leave', volver: 'to return', dormir: 'to sleep', pedir: 'to ask for, to order',
    empezar: 'to begin', cerrar: 'to close', encontrar: 'to find', costar: 'to cost', llover: 'to rain', leer: 'to read', traer: 'to bring',
    conocer: 'to know (someone)', abrir: 'to open', escribir: 'to write', mostrar: 'to show', entender: 'to understand', jugar: 'to play',
    preferir: 'to prefer',
  },
  de: {
    sein: 'to be', haben: 'to have', werden: 'to become', kommen: 'to come', gehen: 'to go', fahren: 'to drive, to ride', essen: 'to eat',
    nehmen: 'to take', geben: 'to give', sehen: 'to see', lesen: 'to read', sprechen: 'to speak', helfen: 'to help', schreiben: 'to write',
    finden: 'to find', bleiben: 'to stay', stehen: 'to stand', liegen: 'to lie (be lying)', sitzen: 'to sit', trinken: 'to drink',
    schlafen: 'to sleep', tragen: 'to carry, to wear', halten: 'to hold, to stop', laden: 'to load, to charge', 'heißen': 'to be called',
    bringen: 'to bring', denken: 'to think', kennen: 'to know (someone)', wissen: 'to know (a fact)', 'können': 'can, to be able',
    'müssen': 'must, to have to', 'dürfen': 'may, to be allowed', wollen: 'to want', sollen: 'should, to be supposed to',
    'mögen': 'to like', tun: 'to do', lassen: 'to let, to leave', rufen: 'to call', anrufen: 'to phone', aufstehen: 'to get up',
    einschlafen: 'to fall asleep', aussteigen: 'to get off', einsteigen: 'to get on', beginnen: 'to begin', bekommen: 'to get, to receive',
    vergessen: 'to forget', verlieren: 'to lose', ziehen: 'to pull, to move', steigen: 'to climb, to rise', 'schließen': 'to close',
    laufen: 'to run, to walk', treffen: 'to meet', gefallen: 'to please, to like', verstehen: 'to understand', fallen: 'to fall',
  },
  it: {
    essere: 'to be', avere: 'to have', andare: 'to go', fare: 'to do, to make', stare: 'to stay, to feel', dare: 'to give', venire: 'to come',
    volere: 'to want', potere: 'can, to be able', dovere: 'must, to have to', dire: 'to say, to tell', uscire: 'to go out', bere: 'to drink',
    vedere: 'to see', sapere: 'to know (how)', rimanere: 'to remain', scrivere: 'to write', leggere: 'to read', prendere: 'to take',
    mettere: 'to put, to put on', chiudere: 'to close', aprire: 'to open', conoscere: 'to know (someone)', cadere: 'to fall', perdere: 'to lose',
    piovere: 'to rain', piacere: 'to please, to like', tenere: 'to hold', salire: 'to go up, to get on', rispondere: 'to answer',
    scegliere: 'to choose',
  },
};

// зачем: тренажёр английского экрана спрашивает ровно три ОДНОСЛОВНЫЕ формы (V1 → V2 → V3) и собирает их из букв. Для других курсов
// берём три самые нужные формы языка: fr — инфинитив / настоящее (je) / причастие; es — инфинитив / прошедшее (yo) / причастие;
// de — инфинитив / претерит (er) / Partizip II; it — инфинитив / настоящее (io) / причастие. Здесь — только исключения из правила
// автоматического вывода в сборщике (безличные глаголы и формы, которые нельзя вывести из строки forms).
export const TRAIN_OVERRIDES = {
  fr: { falloir: { past: 'faut' }, pleuvoir: { past: 'pleut' }, asseoir: { base: 'asseoir', past: 'assieds', pp: 'assis' } },
  es: { llover: { past: 'llovió' }, haber: { past: 'hube' } },
  de: {},
  it: { piacere: { past: 'piace' }, piovere: { past: 'piove' } },
};

// зачем (проверка 05.11): фразы, где форма совпала, а глагол по смыслу другой — не ставят глагол в урок и не идут в примеры.
export const EXAMPLE_EXCLUDE = {
  de: { umziehen: ['de:19:07'], fallen: ['de:22:30'] },
};

// зачем (VERBS_CHECK §5.1): fr «reçu» — и глагол, и «квитанция»; глаголом считаем только после формы avoir (j'ai reçu, tu en as reçu).
const AVOIR = ['ai', 'as', 'a', 'avons', 'avez', 'ont', 'avais', 'avait', 'avions', 'aviez', 'avaient', 'aie', 'ayez', 'aurai', 'aurais'];
export const CONTEXT_FORMS = {
  fr: Object.fromEntries(['reçu', 'reçue', 'reçus', 'reçues'].map((w) => [w, { lemma: 'recevoir', after: AVOIR }])),
};
// зачем (VERBS_CHECK §5.1): отделяемый глагол, базового которого нет в словаре — формы основы + приставка в конце части фразы.
export const SEP_FORMS = {
  de: { anfangen: { particle: 'an', forms: ['fange', 'fängst', 'fängt', 'fangt', 'fangen', 'fing', 'fingst', 'fingen', 'fingt'] } },
};
