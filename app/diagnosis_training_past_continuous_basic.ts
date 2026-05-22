import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const PAST_CONT_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre Past Continuous ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về Past Continuous này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan Past Continuous ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu Past Continuous açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie Past Continuous nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? PAST_CONT_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'was + verb-ing',
  'were + verb-ing',
  'at 8 yesterday',
  'while',
  'past process',
  'past simple',
  'interrupted action',
];

const SMART_CONTRAST = [
  'was + verb-ing',
  'were + verb-ing',
  'at 8 yesterday',
  'while',
  'past process',
  'past simple',
];

const MODEL = tri(
  'Past Continuous нужен, когда ты показываешь процесс в конкретный момент прошлого: I was working at 8. She was sleeping when I called. С I, he, she, it обычно берем was. С you, we, they обычно берем were. После was или were действие получает -ing: was working, were waiting.',
  'Past Continuous потрібен, коли ти показуєш процес у конкретний момент минулого: I was working at 8. She was sleeping when I called. З I, he, she, it зазвичай беремо was. З you, we, they зазвичай беремо were. Після was або were дія отримує -ing: was working, were waiting.',
  'Past Continuous muestra un proceso en un momento del pasado: I was working at 8. Usa was con I/he/she/it y were con you/we/they. Despues de was o were usa -ing.',
  {
    'pt-BR': 'Past Continuous é usado quando você mostra um processo em um momento específico do passado: I was working at 8. She was sleeping when I called. Com I, he, she, it, normalmente usamos was. Com you, we, they, normalmente usamos were. Depois de was ou were, a ação recebe -ing: was working, were waiting.',
    vi: 'Past Continuous được dùng khi bạn diễn tả một quá trình tại một thời điểm cụ thể trong quá khứ: I was working at 8. She was sleeping when I called. Với I, he, she, it thường dùng was. Với you, we, they thường dùng were. Sau was hoặc were, động từ thêm -ing: was working, were waiting.',
    id: 'Past Continuous dipakai saat kamu menunjukkan proses pada saat tertentu di masa lalu: I was working at 8. She was sleeping when I called. Dengan I, he, she, it biasanya gunakan was. Dengan you, we, they biasanya gunakan were. Setelah was atau were, kata kerja mendapat -ing: was working, were waiting.',
    tr: 'Past Continuous geçmişte belirli bir anda süren bir süreci gösterirken gerekir: I was working at 8. She was sleeping when I called. I, he, she, it ile genelde was kullanırız. You, we, they ile genelde were kullanırız. Was veya were sonrasında eylem -ing alır: was working, were waiting.',
    pl: 'Past Continuous jest potrzebny, gdy pokazujesz proces w konkretnym momencie przeszłości: I was working at 8. She was sleeping when I called. Z I, he, she, it zwykle używamy was. Z you, we, they zwykle używamy were. Po was albo were czynność dostaje -ing: was working, were waiting.',
  },
);

const PAST_CONT_SKILL_ES: Record<string, string> = {
  i_was_working: 'Con I usa was; at 8 yesterday pide proceso pasado.',
  she_was_sleeping: 'Con she usa was; sleeping muestra el proceso.',
  they_were_waiting: 'Con they usa were; waiting lleva -ing.',
  we_were_watching: 'Con we usa were; at that moment pide proceso.',
  were_with_they: 'Con they usa were, no was.',
  it_was_raining: 'Con it usa was; raining muestra un proceso largo.',
  was_having_at_time: 'At 9 last night pide proceso: was having.',
  no_missing_was: 'No puede faltar was antes de working.',
  no_base_after_were: 'Despues de were usa waiting, no wait.',
  negative_wasnt_working: "Con I en negativo usa wasn't + -ing.",
  question_were_you_working: 'En pregunta con you, were va primero.',
  negative_werent_waiting: "Con they en negativo usa weren't + -ing.",
  mixed_was_were_pair: 'I usa was; they usa were; ambos necesitan -ing.',
  mixed_process_vs_completed: 'Hecho pasado = worked; proceso en un momento = was working.',
  mixed_sentence_correction: 'She usa was sleeping; they usa were watching.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = PAST_CONT_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? PAST_CONT_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function pastContEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = PAST_CONT_SKILL_ES[input.targetSkill] ?? 'Comprueba was/were y la forma -ing.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(correct: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди момент прошлого: at 8 yesterday, at that moment, when I called.',
      'Спочатку знайди момент минулого: at 8 yesterday, at that moment, when I called.',
      'Primero encuentra el momento pasado: at 8 yesterday, at that moment, when I called.',
    ),
    tri(
      'Потом реши, кто делает действие: I/she/he/it берут was, you/we/they берут were.',
      'Потім виріши, хто робить дію: I/she/he/it беруть was, you/we/they беруть were.',
      'Luego elige was o were segun la persona.',
    ),
    tri(
      'Если это процесс в тот момент, после was/were поставь действие с -ing.',
      'Якщо це процес у той момент, після was/were постав дію з -ing.',
      'Si es un proceso en ese momento, usa -ing despues de was/were.',
    ),
    tri(
      `Нужный вариант здесь: ${correct}.`,
      `Потрібний варіант тут: ${correct}.`,
      `La respuesta aqui es: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Проверь was/were и -ing. Здесь нужно: ${correct}.`,
    `Майже. Перевір was/were і -ing. Тут потрібно: ${correct}.`,
    `Casi. Revisa was/were y -ing. Usa: ${correct}.`,
  );
}

function pastContStep(input: {
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
  focusWords: string[];
}): DiagnosisTrainingStep {
  const esFeedback = pastContEsFeedback(input);
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: withEs(input.translation, esFeedback),
    teachingText: withEs(MODEL, esFeedback),
    explanationBlock: withEs(MODEL, esFeedback),
    microTask: tri(
      'Выбери фразу, где процесс в прошлом собран через was/were + -ing.',
      'Обери фразу, де процес у минулому зібраний через was/were + -ing.',
      'Elige la frase donde el proceso pasado usa was/were + -ing.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: withEs(input.correctFeedback, esFeedback),
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((option) => option !== input.correctAnswer)
        .map((option) => [option, withEs(input.wrong[option] ?? defaultWrong(input.correctAnswer), esFeedback)]),
    ),
    retryFeedback: retry(input.correctAnswer).map((item) => withEs(item, esFeedback)) as [TriText, TriText, TriText, TriText],
    fallbackExplanation: tri(
      'Коротко: нужен момент прошлого, was или were, и действие с -ing. Без was/were фраза разваливается; без -ing тоже.',
      'Коротко: потрібен момент минулого, was або were, і дія з -ing. Без was/were фраза розвалюється; без -ing теж.',
      'Version corta: hace falta un momento pasado, was o were, y el verbo con -ing: I was working, She was sleeping, They were waiting.',
    ),
    focusWords: input.focusWords,
  };
}

export const PAST_CONTINUOUS_BASIC_TRAINING: DiagnosisTraining = {
  id: 'past_continuous_basic',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 42,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'Past Continuous: процесс в прошлом',
    'Past Continuous: процес у минулому',
    'Past Continuous: past process',
    {
      'pt-BR': 'Past Continuous: processo no passado',
      vi: 'Past Continuous: quá trình trong quá khứ',
      id: 'Past Continuous: proses di masa lalu',
      tr: 'Past Continuous: geçmişte süren süreç',
      pl: 'Past Continuous: proces w przeszłości',
    },
  ),
  shortTitle: tri('Was / Were + -ing', 'Was / Were + -ing', 'Was / Were + -ing', {
    'pt-BR': 'Was / Were + -ing',
    vi: 'Was / Were + -ing',
    id: 'Was / Were + -ing',
    tr: 'Was / Were + -ing',
    pl: 'Was / Were + -ing',
  }),
  shortDiagnosis: tri(
    'Ты хочешь сказать, что действие шло в тот момент, но забываешь was/were или ставишь действие без -ing.',
    'Ти хочеш сказати, що дія тривала в той момент, але забуваєш was/were або ставиш дію без -ing.',
    'Quieres decir que una accion estaba en progreso, pero olvidas was/were o la forma -ing.',
    {
      'pt-BR': 'Você quer dizer que a ação estava acontecendo naquele momento, mas esquece was/were ou usa o verbo sem -ing.',
      vi: 'Bạn muốn nói rằng hành động đang diễn ra tại thời điểm đó, nhưng quên was/were hoặc dùng động từ không có -ing.',
      id: 'Kamu ingin mengatakan bahwa tindakan sedang berlangsung saat itu, tetapi lupa was/were atau memakai kata kerja tanpa -ing.',
      tr: 'Eylemin o anda sürdüğünü söylemek istiyorsun, ama was/were kısmını unutuyor ya da eylemi -ing olmadan koyuyorsun.',
      pl: 'Chcesz powiedzieć, że czynność trwała w tamtym momencie, ale zapominasz was/were albo dajesz czasownik bez -ing.',
    },
  ),
  diagnosisText: tri(
    'Здесь ломается не смысл, а сборка. По-русски "я работал вчера" и "я работал в 8 вечера" звучат почти одинаково. В английском второе часто требует процесса: I was working at 8. Нужны две детали: was или were, потом действие с -ing.',
    'Тут ламається не сенс, а збірка. Українською "я працював учора" і "я працював о 8 вечора" звучать майже однаково. В англійській друге часто потребує процесу: I was working at 8. Потрібні дві деталі: was або were, потім дія з -ing.',
    'La idea esta bien, pero se rompe la construccion. El ingles suele marcar un proceso pasado con was/were mas -ing: I was working at 8.',
    {
      'pt-BR': 'Aqui não quebra o sentido, mas a construção. Em português, "eu trabalhei ontem" e "eu estava trabalhando às 8" podem parecer próximos. Em inglês, o segundo geralmente pede processo: I was working at 8. São duas peças: was ou were, depois a ação com -ing.',
      vi: 'Ở đây không sai về ý, mà sai ở cách dựng câu. Trong tiếng Việt, "tôi làm việc hôm qua" và "tôi đang làm việc lúc 8 giờ" có thể khá gần nhau. Trong tiếng Anh, câu thứ hai thường cần diễn tả quá trình: I was working at 8. Cần hai phần: was hoặc were, rồi động từ với -ing.',
      id: 'Di sini bukan maknanya yang rusak, melainkan susunannya. Dalam bahasa Indonesia, "saya bekerja kemarin" dan "saya sedang bekerja jam 8" bisa terasa dekat. Dalam bahasa Inggris, yang kedua sering membutuhkan proses: I was working at 8. Perlu dua bagian: was atau were, lalu kata kerja dengan -ing.',
      tr: 'Burada anlam değil, kurulum bozuluyor. Türkçede "dün çalıştım" ve "saat 8de çalışıyordum" yakın görünebilir. İngilizcede ikincisi çoğu zaman süreci ister: I was working at 8. İki parça gerekir: was veya were, sonra -ing alan eylem.',
      pl: 'Tutaj psuje się nie sens, tylko konstrukcja. Po polsku "pracowałem wczoraj" i "pracowałem o 8" mogą brzmieć podobnie. W angielskim drugie często wymaga procesu: I was working at 8. Potrzebne są dwa elementy: was albo were, potem czynność z -ing.',
    },
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    'Если речь о процессе в конкретный момент прошлого, собираем фразу через was или were и действие с -ing. С I/he/she/it обычно was. С you/we/they обычно were.',
    'Якщо йдеться про процес у конкретний момент минулого, збираємо фразу через was або were і дію з -ing. З I/he/she/it зазвичай was. З you/we/they зазвичай were.',
    'I/he/she/it + was + -ing. You/we/they + were + -ing. At 8 yesterday y at that moment suelen pedir un proceso pasado.',
    {
      'pt-BR': 'Se falamos de um processo em um momento específico do passado, montamos a frase com was ou were e a ação com -ing. Com I/he/she/it, normalmente was. Com you/we/they, normalmente were.',
      vi: 'Nếu nói về một quá trình tại một thời điểm cụ thể trong quá khứ, hãy dựng câu bằng was hoặc were và động từ thêm -ing. Với I/he/she/it thường dùng was. Với you/we/they thường dùng were.',
      id: 'Jika yang dibicarakan adalah proses pada saat tertentu di masa lalu, susun kalimat dengan was atau were dan kata kerja berakhiran -ing. Dengan I/he/she/it biasanya was. Dengan you/we/they biasanya were.',
      tr: 'Geçmişte belirli bir andaki süreçten söz ediyorsak, cümleyi was veya were ve -ing alan eylemle kurarız. I/he/she/it ile genelde was. You/we/they ile genelde were.',
      pl: 'Jeśli chodzi o proces w konkretnym momencie przeszłości, składamy frazę przez was albo were i czynność z -ing. Z I/he/she/it zwykle was. Z you/we/they zwykle were.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Past Continuous собирается через was/were + действие с -ing: I was working.',
      'С I, he, she, it обычно используем was.',
      'С you, we, they обычно используем were.',
      'Если действие шло в конкретный момент прошлого, часто нужен Past Continuous.',
      'At 8 yesterday, at that moment и while часто подсказывают процесс в прошлом.',
      'Не говори I working at 8. Нужен was: I was working at 8.',
      'Не говори I was work. После was ставим working.',
      'Не говори They were wait. Нужно They were waiting.',
      'Past Simple показывает факт: I worked yesterday.',
      'Past Continuous показывает процесс в момент: I was working at 8 yesterday.',
    ],
    uk: [
      'Past Continuous збирається через was/were + дію з -ing: I was working.',
      'З I, he, she, it зазвичай використовуємо was.',
      'З you, we, they зазвичай використовуємо were.',
      'Якщо дія тривала в конкретний момент минулого, часто потрібен Past Continuous.',
      'At 8 yesterday, at that moment і while часто підказують процес у минулому.',
      'Не кажи I working at 8. Потрібен was: I was working at 8.',
      'Не кажи I was work. Після was ставимо working.',
      'Не кажи They were wait. Потрібно They were waiting.',
      'Past Simple показує факт: I worked yesterday.',
      'Past Continuous показує процес у момент: I was working at 8 yesterday.',
    ],
    es: [
      'Past Continuous usa was/were + -ing.',
      'I, he, she, it normalmente usan was.',
      'You, we, they normalmente usan were.',
      'Un proceso en un momento concreto del pasado suele usar Past Continuous.',
      'At 8 yesterday, at that moment y while suelen apuntar a un proceso pasado.',
      'No digas I working at 8.',
      'No digas I was work.',
      'No digas They were wait.',
      'Past Simple muestra un hecho.',
      'Past Continuous muestra un proceso en un momento.',
    ],
    'pt-BR': [
      'Past Continuous usa was/were + -ing.',
      'I, he, she, it geralmente usam was.',
      'You, we, they geralmente usam were.',
      'Um processo em um momento específico do passado costuma usar Past Continuous.',
      'At 8 yesterday, at that moment e while muitas vezes apontam para um processo no passado.',
      'Não diga I working at 8.',
      'Não diga I was work.',
      'Não diga They were wait.',
      'Past Simple mostra um fato.',
      'Past Continuous mostra um processo em um momento.',
    ],
    vi: [
      'Past Continuous dùng was/were + -ing.',
      'I, he, she, it thường dùng was.',
      'You, we, they thường dùng were.',
      'Một quá trình tại một thời điểm cụ thể trong quá khứ thường dùng Past Continuous.',
      'At 8 yesterday, at that moment và while thường gợi ý quá trình trong quá khứ.',
      'Không nói I working at 8.',
      'Không nói I was work.',
      'Không nói They were wait.',
      'Past Simple chỉ một sự việc.',
      'Past Continuous chỉ quá trình tại một thời điểm.',
    ],
    id: [
      'Past Continuous memakai was/were + -ing.',
      'I, he, she, it biasanya memakai was.',
      'You, we, they biasanya memakai were.',
      'Proses pada momen tertentu di masa lalu sering memakai Past Continuous.',
      'At 8 yesterday, at that moment, dan while sering menunjuk proses di masa lalu.',
      'Jangan katakan I working at 8.',
      'Jangan katakan I was work.',
      'Jangan katakan They were wait.',
      'Past Simple menunjukkan fakta.',
      'Past Continuous menunjukkan proses pada satu momen.',
    ],
    tr: [
      'Past Continuous was/were + -ing kullanır.',
      'I, he, she, it genelde was kullanır.',
      'You, we, they genelde were kullanır.',
      'Geçmişte belirli bir anda süren süreç çoğu zaman Past Continuous kullanır.',
      'At 8 yesterday, at that moment ve while çoğu zaman geçmişteki süreci gösterir.',
      'I working at 8 deme.',
      'I was work deme.',
      'They were wait deme.',
      'Past Simple bir olguyu gösterir.',
      'Past Continuous bir andaki süreci gösterir.',
    ],
    pl: [
      'Past Continuous używa was/were + -ing.',
      'I, he, she, it zwykle używają was.',
      'You, we, they zwykle używają were.',
      'Proces w konkretnym momencie przeszłości często używa Past Continuous.',
      'At 8 yesterday, at that moment i while często wskazują proces w przeszłości.',
      'Nie mów I working at 8.',
      'Nie mów I was work.',
      'Nie mów They were wait.',
      'Past Simple pokazuje fakt.',
      'Past Continuous pokazuje proces w danym momencie.',
    ],
  },
  examples: [
    {
      en: 'I was working at 8 yesterday.',
      ru: 'Я работал вчера в 8.',
      uk: 'Я працював учора о 8.',
      es: 'Ayer a las 8 estaba trabajando.',
      'pt-BR': 'Eu estava trabalhando às 8 ontem.',
      vi: 'Hôm qua lúc 8 giờ tôi đang làm việc.',
      id: 'Saya sedang bekerja jam 8 kemarin.',
      tr: 'Dün saat 8’de çalışıyordum.',
      pl: 'Pracowałem wczoraj o 8.',
      why: tri('At 8 yesterday задаёт момент прошлого. Важен процесс: was working.', 'At 8 yesterday задає момент минулого. Важливий процес: was working.', 'At 8 yesterday da un momento pasado. Usa was working.'),
    },
    {
      en: 'She was sleeping when I called.',
      ru: 'Она спала, когда я позвонил.',
      uk: 'Вона спала, коли я подзвонив.',
      es: 'Ella estaba durmiendo cuando llame.',
      'pt-BR': 'Ela estava dormindo quando eu liguei.',
      vi: 'Cô ấy đang ngủ khi tôi gọi.',
      id: 'Dia sedang tidur ketika saya menelepon.',
      tr: 'Ben aradığımda o uyuyordu.',
      pl: 'Spała, kiedy zadzwoniłem.',
      why: tri('Сон был процессом, а звонок случился внутри него. She получает was.', 'Сон був процесом, а дзвінок стався всередині нього. She отримує was.', 'Sleeping era el proceso de fondo. She usa was.'),
    },
    {
      en: 'They were waiting outside.',
      ru: 'Они ждали снаружи.',
      uk: 'Вони чекали зовні.',
      es: 'Ellos estaban esperando afuera.',
      'pt-BR': 'Eles estavam esperando lá fora.',
      vi: 'Họ đang chờ bên ngoài.',
      id: 'Mereka sedang menunggu di luar.',
      tr: 'Dışarıda bekliyorlardı.',
      pl: 'Czekali na zewnątrz.',
      why: tri('They получает were, а wait превращается в waiting.', 'They отримує were, а wait перетворюється на waiting.', 'They usa were, y wait se convierte en waiting.'),
    },
    {
      en: 'We were watching TV at that moment.',
      ru: 'В тот момент мы смотрели телевизор.',
      uk: 'У той момент ми дивилися телевізор.',
      es: 'En ese momento estabamos viendo television.',
      'pt-BR': 'Naquele momento, estávamos assistindo TV.',
      vi: 'Lúc đó chúng tôi đang xem TV.',
      id: 'Saat itu kami sedang menonton TV.',
      tr: 'O anda televizyon izliyorduk.',
      pl: 'W tamtym momencie oglądaliśmy telewizję.',
      why: tri('At that moment просит показать процесс в прошлом.', 'At that moment просить показати процес у минулому.', 'At that moment pide un proceso en el pasado.'),
    },
    {
      en: "I wasn't listening.",
      ru: 'Я не слушал.',
      uk: 'Я не слухав.',
      es: 'Yo no estaba escuchando.',
      'pt-BR': 'Eu não estava ouvindo.',
      vi: 'Tôi đã không nghe.',
      id: 'Saya tidak sedang mendengarkan.',
      tr: 'Dinlemiyordum.',
      pl: 'Nie słuchałem.',
      why: tri('В отрицании not приклеивается к was: was not, wasn\'t.', 'У запереченні not приєднується до was: was not, wasn\'t.', "En negativa, not se une a was: wasn't."),
    },
    {
      en: 'Were you working yesterday evening?',
      ru: 'Ты работал вчера вечером?',
      uk: 'Ти працював учора ввечері?',
      es: 'Estabas trabajando ayer por la tarde?',
      'pt-BR': 'Você estava trabalhando ontem à noite?',
      vi: 'Tối qua bạn có đang làm việc không?',
      id: 'Apakah kamu sedang bekerja kemarin malam?',
      tr: 'Dün akşam çalışıyor muydun?',
      pl: 'Czy pracowałeś wczoraj wieczorem?',
      why: tri('В вопросе were выходит в начало: Were you working?', 'У питанні were виходить на початок: Were you working?', 'En una pregunta, were va primero.'),
    },
    {
      en: 'It was raining all morning.',
      ru: 'Всё утро шёл дождь.',
      uk: 'Увесь ранок ішов дощ.',
      es: 'Estuvo lloviendo toda la manana.',
      'pt-BR': 'Choveu a manhã toda.',
      vi: 'Trời mưa suốt buổi sáng.',
      id: 'Hujan turun sepanjang pagi.',
      tr: 'Bütün sabah yağmur yağıyordu.',
      pl: 'Padało przez cały ranek.',
      why: tri('Дождь был длительным процессом в прошлом: was raining.', 'Дощ був тривалим процесом у минулому: was raining.', 'La lluvia era un proceso continuo en el pasado.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты говоришь о процессе в прошлом, но собираешь фразу как обычный факт. Английский различает "I worked yesterday" и "I was working at 8".',
        'Схоже, ти говориш про процес у минулому, але збираєш фразу як звичайний факт. Англійська розрізняє "I worked yesterday" і "I was working at 8".',
        'Puede que hables de un proceso pasado, pero construyas la frase como un hecho simple.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Скелет простой: was или were плюс действие с -ing. I was working. They were waiting.',
        'Скелет простий: was або were плюс дія з -ing. I was working. They were waiting.',
        'El patron es simple: was o were mas -ing.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Главные поломки: I working, I was work, they were wait. Исправление: I was working, they were waiting.',
        'Головні поломки: I working, I was work, they were wait. Виправлення: I was working, they were waiting.',
        'Errores principales: I working, I was work, they were wait. Usa I was working y they were waiting.',
      ),
    },
  ],
  steps: [
    pastContStep({
      id: 'past_cont_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'i_was_working',
      sentence: 'I ___ working at 8 yesterday.',
      translation: tri('Я работал вчера в 8.', 'Я працював учора о 8.', 'I was working at 8 yesterday.'),
      options: ['was', 'were', 'did', 'am'],
      correctAnswer: 'was',
      correctFeedback: tri('Да. С I в этой фразе нужен was: I was working.', 'Так. З I у цій фразі потрібен was: I was working.', 'Yes. I uses was here.'),
      wrong: {
        were: tri('Were здесь не подходит к I. Нужен was: I was working.', 'Were тут не підходить до I. Потрібен was: I was working.', 'Were does not fit I here. Use was.'),
        did: tri('Did не собирает working. Для процесса в 8 нужен was: I was working.', 'Did не збирає working. Для процесу о 8 потрібен was: I was working.', 'Did does not build working here. Use was.'),
        am: tri('Am говорит о настоящем. At 8 yesterday просит прошлое: was working.', 'Am говорить про теперішнє. At 8 yesterday просить минуле: was working.', 'Am is present. At 8 yesterday needs was.'),
      },
      focusWords: ['was working', 'at 8 yesterday'],
    }),
    pastContStep({
      id: 'past_cont_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'she_was_sleeping',
      sentence: 'She ___ sleeping when I called.',
      translation: tri('Она спала, когда я позвонил.', 'Вона спала, коли я подзвонив.', 'She was sleeping when I called.'),
      options: ['was', 'were', 'did', 'is'],
      correctAnswer: 'was',
      correctFeedback: tri('Да. She получает was: She was sleeping.', 'Так. She отримує was: She was sleeping.', 'Yes. She uses was.'),
      wrong: {
        were: tri('Were здесь не подходит к she. Нужен was.', 'Were тут не підходить до she. Потрібен was.', 'Were does not fit she here. Use was.'),
        did: tri('Did sleeping не работает. Нужен блок was sleeping.', 'Did sleeping не працює. Потрібен блок was sleeping.', 'Did sleeping does not work. Use was sleeping.'),
        is: tri('Is sleeping - настоящее. When I called переносит фразу в прошлое: was sleeping.', 'Is sleeping - теперішнє. When I called переносить фразу в минуле: was sleeping.', 'Is sleeping is present. Use was sleeping.'),
      },
      focusWords: ['was sleeping', 'when I called'],
    }),
    pastContStep({
      id: 'past_cont_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'they_were_waiting',
      sentence: 'They ___ waiting outside.',
      translation: tri('Они ждали снаружи.', 'Вони чекали зовні.', 'They were waiting outside.'),
      options: ['were', 'was', 'did', 'are'],
      correctAnswer: 'were',
      correctFeedback: tri('Да. They получает were: They were waiting.', 'Так. They отримує were: They were waiting.', 'Yes. They uses were.'),
      wrong: {
        was: tri('Was здесь не подходит к they. Нужен were.', 'Was тут не підходить до they. Потрібен were.', 'Was does not fit they. Use were.'),
        did: tri('Did waiting не работает. Нужен блок were waiting.', 'Did waiting не працює. Потрібен блок were waiting.', 'Did waiting does not work. Use were waiting.'),
        are: tri('Are waiting - настоящее. Здесь нужен прошлый процесс: were waiting.', 'Are waiting - теперішнє. Тут потрібен минулий процес: were waiting.', 'Are waiting is present. Use were waiting.'),
      },
      focusWords: ['were waiting'],
    }),
    pastContStep({
      id: 'past_cont_easy_004',
      order: 4,
      difficulty: 'easy',
      targetSkill: 'we_were_watching',
      sentence: 'We ___ watching TV at that moment.',
      translation: tri('В тот момент мы смотрели телевизор.', 'У той момент ми дивилися телевізор.', 'We were watching TV at that moment.'),
      options: ['were', 'was', 'watched', 'watch'],
      correctAnswer: 'were',
      correctFeedback: tri('Да. We получает were, а at that moment просит процесс: were watching.', 'Так. We отримує were, а at that moment просить процес: were watching.', 'Yes. We uses were, and at that moment asks for a process.'),
      wrong: {
        was: tri('Was здесь не подходит к we. Нужен were.', 'Was тут не підходить до we. Потрібен were.', 'Was does not fit we. Use were.'),
        watched: tri('Watched показывает факт. В тот момент процесс шёл: were watching.', 'Watched показує факт. У той момент процес тривав: were watching.', 'Watched is a fact. Here use were watching.'),
        watch: tri('Watch не показывает прошлый процесс. Нужен блок were watching.', 'Watch не показує минулий процес. Потрібен блок were watching.', 'Watch does not show a past process. Use were watching.'),
      },
      focusWords: ['were watching', 'at that moment'],
    }),
    pastContStep({
      id: 'past_cont_contrast_001',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'were_with_they',
      sentence: 'They ___ talking while I was cooking.',
      translation: tri('Они разговаривали, пока я готовил.', 'Вони розмовляли, поки я готував.', 'They were talking while I was cooking.'),
      options: ['were', 'was', 'did', 'are'],
      correctAnswer: 'were',
      correctFeedback: tri('Да. They получает were: They were talking.', 'Так. They отримує were: They were talking.', 'Yes. They uses were.'),
      wrong: {
        was: tri('Was не подходит к they. Нужен were.', 'Was не підходить до they. Потрібен were.', 'Was does not fit they.'),
        did: tri('Did talking не работает. Нужен блок were talking.', 'Did talking не працює. Потрібен блок were talking.', 'Did talking does not work.'),
        are: tri('Are talking - настоящее. Здесь while I was cooking переносит нас в прошлое.', 'Are talking - теперішнє. Тут while I was cooking переносить нас у минуле.', 'Are talking is present. Use were talking.'),
      },
      focusWords: ['were talking', 'while'],
    }),
    pastContStep({
      id: 'past_cont_contrast_002',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'it_was_raining',
      sentence: 'It ___ raining all morning.',
      translation: tri('Всё утро шёл дождь.', 'Увесь ранок ішов дощ.', 'It was raining all morning.'),
      options: ['was', 'were', 'rained', 'rain'],
      correctAnswer: 'was',
      correctFeedback: tri('Да. It получает was, а raining показывает процесс.', 'Так. It отримує was, а raining показує процес.', 'Yes. It uses was, and raining shows a process.'),
      wrong: {
        were: tri('Were здесь не подходит к it. Нужен was.', 'Were тут не підходить до it. Потрібен was.', 'Were does not fit it. Use was.'),
        rained: tri('Rained больше звучит как факт. All morning здесь удобно показать как процесс: was raining.', 'Rained більше звучить як факт. All morning тут зручно показати як процес: was raining.', 'Rained is more like a fact. Here use was raining.'),
        rain: tri('Rain не показывает прошлое. Нужен блок was raining.', 'Rain не показує минуле. Потрібен блок was raining.', 'Rain does not show the past. Use was raining.'),
      },
      focusWords: ['was raining', 'all morning'],
    }),
    pastContStep({
      id: 'past_cont_contrast_003',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'was_having_at_time',
      sentence: 'At 9 last night, she ___ dinner.',
      translation: tri('Вчера в 9 вечера она ужинала.', 'Учора о 9 вечора вона вечеряла.', 'At 9 last night, she was having dinner.'),
      options: ['was having', 'had', 'has', 'was have'],
      correctAnswer: 'was having',
      correctFeedback: tri('Да. At 9 last night задаёт момент прошлого. Процесс: was having.', 'Так. At 9 last night задає момент минулого. Процес: was having.', 'Yes. At 9 last night gives a past moment. Use was having.'),
      wrong: {
        had: tri('Had показывает факт. Здесь важно, что действие шло в 9 вечера: was having.', 'Had показує факт. Тут важливо, що дія тривала о 9 вечора: was having.', 'Had is a fact. Here use was having.'),
        has: tri('Has не подходит к at 9 last night. Нужен прошлый процесс: was having.', 'Has не підходить до at 9 last night. Потрібен минулий процес: was having.', 'Has does not fit at 9 last night.'),
        'was have': tri('После was действие получает -ing: was having.', 'Після was дія отримує -ing: was having.', 'After was, use -ing: was having.'),
      },
      focusWords: ['at 9 last night', 'was having'],
    }),
    pastContStep({
      id: 'past_cont_contrast_004',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'no_missing_was',
      sentence: 'Choose the correct sentence.',
      translation: tri('Я работал в тот момент.', 'Я працював у той момент.', 'I was working at that moment.'),
      options: ['I was working at that moment.', 'I working at that moment.', 'I worked at that moment.', 'I was work at that moment.'],
      correctAnswer: 'I was working at that moment.',
      correctFeedback: tri('Да. Для процесса в тот момент нужен блок was working.', 'Так. Для процесу в той момент потрібен блок was working.', 'Yes. Use was working for a process at that moment.'),
      wrong: {
        'I working at that moment.': tri('Пропущен was. Нужна полная фраза: I was working at that moment.', 'Пропущено was. Потрібна повна фраза: I was working at that moment.', 'Missing was. Use I was working at that moment.'),
        'I worked at that moment.': tri('Worked звучит как факт. At that moment просит процесс: I was working.', 'Worked звучить як факт. At that moment просить процес: I was working.', 'Worked is a fact. At that moment asks for was working.'),
        'I was work at that moment.': tri('После was нужен вариант с -ing: I was working.', 'Після was потрібен варіант з -ing: I was working.', 'After was, use working.'),
      },
      focusWords: ['was working', 'at that moment'],
    }),
    pastContStep({
      id: 'past_cont_contrast_005',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'no_base_after_were',
      sentence: 'Choose the correct sentence.',
      translation: tri('Они ждали, когда я приехал.', 'Вони чекали, коли я приїхав.', 'They were waiting when I arrived.'),
      options: ['They were waiting when I arrived.', 'They were wait when I arrived.', 'They waiting when I arrived.', 'They was waiting when I arrived.'],
      correctAnswer: 'They were waiting when I arrived.',
      correctFeedback: tri('Да. They were waiting показывает процесс до момента arrived.', 'Так. They were waiting показує процес до моменту arrived.', 'Yes. They were waiting shows the process.'),
      wrong: {
        'They were wait when I arrived.': tri('После were нужен вариант с -ing: were waiting.', 'Після were потрібен варіант з -ing: were waiting.', 'After were, use were waiting.'),
        'They waiting when I arrived.': tri('Пропущен were. Нужна полная фраза: They were waiting.', 'Пропущено were. Потрібна повна фраза: They were waiting.', 'Missing were. Use They were waiting.'),
        'They was waiting when I arrived.': tri('Was не подходит к they. Нужен вариант They were waiting.', 'Was не підходить до they. Потрібен варіант They were waiting.', 'Was does not fit they. Use They were waiting.'),
      },
      focusWords: ['were waiting', 'when I arrived'],
    }),
    pastContStep({
      id: 'past_cont_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'negative_wasnt_working',
      sentence: 'I ___ listening.',
      translation: tri('Я не слушал.', 'Я не слухав.', "I wasn't listening."),
      options: ["wasn't", "weren't", "didn't", 'am not'],
      correctAnswer: "wasn't",
      correctFeedback: tri("Да. I получает was, отрицание: wasn't listening.", "Так. I отримує was, заперечення: wasn't listening.", "Yes. I uses wasn't here."),
      wrong: {
        "weren't": tri("Weren't здесь не подходит к I. Нужен wasn't.", "Weren't тут не підходить до I. Потрібен wasn't.", "Weren't does not fit I. Use wasn't."),
        "didn't": tri("Didn't listening не работает. Нужен блок wasn't listening.", "Didn't listening не працює. Потрібен блок wasn't listening.", "Didn't listening does not work. Use wasn't listening."),
        'am not': tri("Am not listening - настоящее. Здесь нужен прошлый блок: wasn't listening.", "Am not listening - теперішнє. Тут потрібен минулий блок: wasn't listening.", "Am not listening is present. Use wasn't listening."),
      },
      focusWords: ["wasn't listening"],
    }),
    pastContStep({
      id: 'past_cont_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'question_were_you_working',
      sentence: '___ you working yesterday evening?',
      translation: tri('Ты работал вчера вечером?', 'Ти працював учора ввечері?', 'Were you working yesterday evening?'),
      options: ['Were', 'Was', 'Did', 'Are'],
      correctAnswer: 'Were',
      correctFeedback: tri('Да. В вопросе Were выходит в начало: Were you working?', 'Так. У питанні Were виходить на початок: Were you working?', 'Yes. In a question, Were comes first.'),
      wrong: {
        Was: tri('С you нужен were, не was.', 'З you потрібен were, не was.', 'You uses were here, not was.'),
        Did: tri('Did you working не работает. Нужен вопрос Were you working?', 'Did you working не працює. Потрібне питання Were you working?', 'Did you working does not work.'),
        Are: tri('Are переносит вопрос в настоящее. Yesterday evening просит прошлое, поэтому нужен Were.', 'Are переносить питання в теперішнє. Yesterday evening просить минуле, тому потрібен Were.', 'Are you working is present. Use Were you working.'),
      },
      focusWords: ['were you working'],
    }),
    pastContStep({
      id: 'past_cont_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'negative_werent_waiting',
      sentence: 'They ___ waiting for us.',
      translation: tri('Они нас не ждали.', 'Вони нас не чекали.', "They weren't waiting for us."),
      options: ["weren't", "wasn't", "didn't", "aren't"],
      correctAnswer: "weren't",
      correctFeedback: tri("Да. They получает were, отрицание: weren't waiting.", "Так. They отримує were, заперечення: weren't waiting.", "Yes. They uses weren't here."),
      wrong: {
        "wasn't": tri("Wasn't здесь не подходит к they. Нужен weren't.", "Wasn't тут не підходить до they. Потрібен weren't.", "Wasn't does not fit they. Use weren't."),
        "didn't": tri("Didn't waiting не работает. Нужен блок weren't waiting.", "Didn't waiting не працює. Потрібен блок weren't waiting.", "Didn't waiting does not work. Use weren't waiting."),
        "aren't": tri("Aren't waiting - настоящее. Здесь нужен прошлый блок: weren't waiting.", "Aren't waiting - теперішнє. Тут потрібен минулий блок: weren't waiting.", "Aren't waiting is present. Use weren't waiting."),
      },
      focusWords: ["weren't waiting"],
    }),
    pastContStep({
      id: 'past_cont_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_was_were_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('я работал / они ждали', 'я працював / вони чекали', 'I was working / they were waiting'),
      options: ['I was working / They were waiting', 'I were working / They was waiting', 'I working / They waiting', 'I was work / They were wait'],
      correctAnswer: 'I was working / They were waiting',
      correctFeedback: tri('Да. I получает was working, they получает were waiting.', 'Так. I отримує was working, they отримує were waiting.', 'Yes. I was working; they were waiting.'),
      wrong: {
        'I were working / They was waiting': tri('Was/were перепутаны. Нужна пара: I was, they were.', 'Was/were переплутані. Потрібна пара: I was, they were.', 'Was/were are reversed. Use I was, they were.'),
        'I working / They waiting': tri('В обеих частях пропущены was/were: I was working, They were waiting.', 'В обох частинах пропущені was/were: I was working, They were waiting.', 'Both parts are missing was/were.'),
        'I was work / They were wait': tri('После was/were действие получает -ing: working, waiting.', 'Після was/were дія отримує -ing: working, waiting.', 'After was/were, use working and waiting.'),
      },
      focusWords: ['was working', 'were waiting'],
    }),
    pastContStep({
      id: 'past_cont_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_process_vs_completed',
      sentence: 'Choose the correct pair.',
      translation: tri('Я работал вчера / я работал вчера в 8', 'Я працював учора / я працював учора о 8', 'I worked yesterday / I was working at 8 yesterday'),
      options: ['I worked yesterday / I was working at 8 yesterday', 'I was working yesterday / I worked at 8 yesterday', 'I working yesterday / I was work at 8 yesterday', 'I did work yesterday / I did working at 8 yesterday'],
      correctAnswer: 'I worked yesterday / I was working at 8 yesterday',
      correctFeedback: tri('Да. Просто факт вчера = worked. Процесс в 8 = was working.', 'Так. Просто факт учора = worked. Процес о 8 = was working.', 'Yes. Yesterday as a fact uses worked; at 8 uses was working.'),
      wrong: {
        'I was working yesterday / I worked at 8 yesterday': tri('At 8 просит показать процесс: was working. Просто yesterday без точного момента чаще звучит как факт: worked.', 'At 8 просить показати процес: was working. Просто yesterday без точного моменту частіше звучить як факт: worked.', 'At 8 asks for a process: was working. Yesterday as a fact uses worked.'),
        'I working yesterday / I was work at 8 yesterday': tri('I working пропускает was. I was work пропускает -ing. Нужна пара worked / was working.', 'I working пропускає was. I was work пропускає -ing. Потрібна пара worked / was working.', 'Missing was and -ing. Use worked / was working.'),
        'I did work yesterday / I did working at 8 yesterday': tri('Did working не работает. Для процесса в 8 нужен was working, а для обычного факта хватит worked.', 'Did working не працює. Для процесу о 8 потрібен was working, а для звичайного факту достатньо worked.', 'Did working does not work. Use worked / was working.'),
      },
      focusWords: ['worked', 'was working at 8'],
    }),
    pastContStep({
      id: 'past_cont_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Она спала, а они смотрели телевизор.', 'Вона спала, а вони дивилися телевізор.', 'She was sleeping, and they were watching TV.'),
      options: ['She was sleeping, and they were watching TV.', 'She were sleeping, and they was watching TV.', 'She sleeping, and they watching TV.', 'She was sleep, and they were watch TV.'],
      correctAnswer: 'She was sleeping, and they were watching TV.',
      correctFeedback: tri('Да. She was sleeping, they were watching.', 'Так. She was sleeping, they were watching.', 'Yes. She was sleeping, they were watching.'),
      wrong: {
        'She were sleeping, and they was watching TV.': tri('Was/were перепутаны. Нужна пара: she was, they were.', 'Was/were переплутані. Потрібна пара: she was, they were.', 'Was/were are reversed. Use she was, they were.'),
        'She sleeping, and they watching TV.': tri('В обеих частях пропущены was/were: She was sleeping, they were watching.', 'В обох частинах пропущені was/were: She was sleeping, they were watching.', 'Both parts are missing was/were.'),
        'She was sleep, and they were watch TV.': tri('После was/were действие получает -ing: sleeping, watching.', 'Після was/were дія отримує -ing: sleeping, watching.', 'After was/were, use sleeping and watching.'),
      },
      focusWords: ['was sleeping', 'were watching'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_was_were_error',
      'was_were_agreement_error',
      'was_were_plus_base_error',
      'past_simple_instead_of_past_continuous_error',
      'ing_without_was_were_error',
      'negative_order_error',
      'question_order_error',
      'wrong_time_marker_interpretation_error',
      'process_vs_completed_action_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем момент прошлого, кто делает действие и блок was/were + -ing.', 'Звичайне пояснення: показуємо момент минулого, хто робить дію і блок was/were + -ing.', 'Explicacion normal: mostramos el momento pasado, quien hace la accion y el bloque was/were + -ing.'),
    depth2: tri('Проще: это факт в прошлом или процесс в тот момент?', 'Простіше: це факт у минулому чи процес у той момент?', 'Mas simple: hecho en el pasado o proceso en ese momento?'),
    depth3: tri('Ещё проще: просто факт в прошлом и процесс в точный момент прошлого собираются по-разному.', 'Ще простіше: просто факт у минулому і процес у точний момент минулого збираються по-різному.', 'Aun mas simple: I worked yesterday, pero I was working at 8.'),
    depth4: tri('Почти подсказка: показываем правильный блок was working или were waiting.', 'Майже підказка: показуємо правильний блок was working або were waiting.', 'Casi una pista: mostramos was working o were waiting.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Процесс в прошлом собирается так: was или were плюс -ing. I was working. They were waiting.',
        'Зупинись. Процес у минулому збирається так: was або were плюс -ing. I was working. They were waiting.',
        'Pausa. Un proceso pasado usa was o were mas -ing.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_past_process_hint_then_retry',
      card: tri(
        'Система подсветит, кто делает действие, и момент прошлого. Твоя задача - выбрать was/were и не забыть -ing.',
        'Система підсвітить, хто робить дію, і момент минулого. Твоє завдання - вибрати was/were і не забути -ing.',
        'El sistema resalta quien hace la accion y el momento pasado. Elige was/were y recuerda -ing.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери was или were, потом проверь, есть ли -ing после действия.',
        'Режим підказки: спочатку обери was або were, потім перевір, чи є -ing після дії.',
        'Modo guiado: primero elige was o were, luego comprueba -ing.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_past_cont_001',
        prompt: tri('С I в этой модели нужен was или were?', 'З I у цій моделі потрібен was чи were?', 'Con I, elige was o were?'),
        options: ['was', 'were'],
        correctIndex: 0,
        thenReturnToExerciseId: 'past_cont_easy_001',
      },
      {
        id: 'guided_past_cont_002',
        prompt: tri('С they в этой модели нужен was или were?', 'З they у цій моделі потрібен was чи were?', 'Con they, elige was o were?'),
        options: ['was', 'were'],
        correctIndex: 1,
        thenReturnToExerciseId: 'past_cont_easy_003',
      },
      {
        id: 'guided_past_cont_003',
        prompt: tri('После was/were лучше work или working?', 'Після was/were краще work чи working?', 'Despues de was/were, elige work o working?'),
        options: ['work', 'working'],
        correctIndex: 1,
        thenReturnToExerciseId: 'past_cont_contrast_004',
      },
      {
        id: 'guided_past_cont_004',
        prompt: tri('At 8 yesterday чаще просит факт или процесс в тот момент?', 'At 8 yesterday частіше просить факт чи процес у той момент?', 'At 8 yesterday normalmente pide un hecho o un proceso?'),
        options: ['факт', 'процесс'],
        correctIndex: 1,
        thenReturnToExerciseId: 'past_cont_mixed_005',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'past_continuous_basic',
    diagnosisLabel: tri('Past Continuous', 'Past Continuous', 'Past Continuous'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['was working', 'were waiting', 'was sleeping', 'were watching', 'at 8 yesterday', 'at that moment'],
    focusPatterns: [
      'i_was_working',
      'she_was_sleeping',
      'they_were_waiting',
      'we_were_watching',
      'were_with_they',
      'it_was_raining',
      'was_having_at_time',
      'no_missing_was',
      'no_base_after_were',
      'negative_wasnt_working',
      'question_were_you_working',
      'negative_werent_waiting',
      'mixed_was_were_pair',
      'mixed_process_vs_completed',
      'mixed_sentence_correction',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyEscalation: {
      start: 'easy',
      afterCorrectInRow: 3,
      next: 'contrast',
      afterCorrectInRowAtContrast: 3,
      final: 'mixed_review',
    },
  },
  analyticsEvents: {
    start: 'diagnosis_training_started',
    answer: 'diagnosis_training_answer',
    mastery: 'diagnosis_training_mastered',
    recovery: 'diagnosis_training_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'past_continuous_basic',
      contrastSet: ['was + verb-ing', 'were + verb-ing', 'past process', 'past simple'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logSubjectGroup: true,
      logBePastForm: true,
      logVerbIngForm: true,
      logTimeMarker: true,
      logProcessVsCompleted: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=past_continuous_basic',
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
