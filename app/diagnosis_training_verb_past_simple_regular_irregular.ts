import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const PAST_SIMPLE_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre Past Simple regular/irregular verbs ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về Past Simple regular/irregular verbs này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan Past Simple regular/irregular verbs ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu Past Simple regular/irregular verbs açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie Past Simple regular/irregular verbs nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? PAST_SIMPLE_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'regular + ed',
  'irregular past',
  'y -> ied',
  'double consonant + ed',
  'past time marker',
  'present simple',
];

const MODEL = tri(
  'Если действие уже случилось, английский должен показать прошлое прямо в глаголе. Иногда это просто -ed: work -> worked. Иногда форма отдельная: go -> went, see -> saw, buy -> bought.',
  'Якщо дія вже сталася, англійська має показати минуле прямо в дієслові. Іноді це просто -ed: work -> worked. Іноді форма окрема: go -> went, see -> saw, buy -> bought.',
  'Si la accion ya ocurrio, el ingles muestra el pasado en el verbo. A veces es -ed: work -> worked. A veces es una forma especial: go -> went, see -> saw, buy -> bought.',
  {
    'pt-BR': 'Se a ação já aconteceu, o inglês precisa mostrar o passado diretamente no verbo. Às vezes é só -ed: work -> worked. Às vezes a forma é especial: go -> went, see -> saw, buy -> bought.',
    vi: 'Nếu hành động đã xảy ra, tiếng Anh phải thể hiện quá khứ ngay trong động từ. Đôi khi chỉ thêm -ed: work -> worked. Đôi khi có dạng riêng: go -> went, see -> saw, buy -> bought.',
    id: 'Jika aksi sudah terjadi, bahasa Inggris harus menunjukkan masa lalu langsung pada verbanya. Kadang cukup -ed: work -> worked. Kadang bentuknya khusus: go -> went, see -> saw, buy -> bought.',
    tr: 'Eylem zaten olduysa İngilizce geçmiş zamanı doğrudan fiilde göstermelidir. Bazen sadece -ed gelir: work -> worked. Bazen biçim ayrıdır: go -> went, see -> saw, buy -> bought.',
    pl: 'Jeśli czynność już się wydarzyła, angielski musi pokazać przeszłość bezpośrednio w czasowniku. Czasem wystarczy -ed: work -> worked. Czasem forma jest osobna: go -> went, see -> saw, buy -> bought.',
  },
);

const PAST_SIMPLE_SKILL_ES: Record<string, string> = {
  regular_ed_worked: 'Yesterday marca pasado; work pasa a worked.',
  regular_ed_opened: 'La accion ya termino; open pasa a opened.',
  regular_ed_called: 'Last night marca pasado; call pasa a called.',
  irregular_go_went: 'Go no hace goed; su pasado es went.',
  irregular_see_saw: 'See en pasado es saw.',
  irregular_buy_bought: 'Buy en pasado es bought.',
  e_plus_d_lived: 'Live ya termina en e, asi que solo agrega -d: lived.',
  y_to_ied_studied: 'Study cambia y por ied: studied.',
  double_consonant_stopped: 'Stop duplica p: stopped.',
  no_present_with_yesterday: 'Con yesterday no dejes el verbo en presente.',
  no_double_past_did: 'En afirmacion normal usa went; si usas did, seria did go.',
  past_same_all_people: 'En pasado, worked no cambia con I/he/they.',
  mixed_regular_irregular_pair: 'Regular: worked. Irregular: went.',
  mixed_spelling_pair: 'Study -> studied y stop -> stopped.',
  mixed_sentence_correction: 'Con yesterday necesitas went y bought.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = PAST_SIMPLE_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? PAST_SIMPLE_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function pastSimpleEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = PAST_SIMPLE_SKILL_ES[input.targetSkill] ?? 'Busca el marcador de pasado y elige la forma pasada del verbo.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(correct: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди маркер прошлого: yesterday, last night, two days ago, in 2020.',
      'Спочатку знайди маркер минулого: yesterday, last night, two days ago, in 2020.',
      'Primero encuentra el marcador de pasado: yesterday, last night, two days ago, in 2020.',
    ),
    tri(
      'Потом реши: обычное -ed или отдельная форма.',
      'Потім виріши: звичайне -ed чи окрема форма.',
      'Luego decide: -ed regular o forma especial.',
    ),
    tri(
      'Держи пару: work -> worked, go -> went.',
      'Тримай пару: work -> worked, go -> went.',
      'Usa la pareja: work -> worked, go -> went.',
    ),
    tri(`Нужный вариант здесь: ${correct}.`, `Потрібний варіант тут: ${correct}.`, `La respuesta aqui es: ${correct}.`),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Здесь нужен вид для прошлого: ${correct}.`,
    `Майже. Тут потрібен вигляд для минулого: ${correct}.`,
    `Casi. Aqui usa la forma de pasado: ${correct}.`,
  );
}

function pastStep(input: {
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
  const esFeedback = pastSimpleEsFeedback(input);
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
      'Выбери форму для завершенного действия в прошлом.',
      'Обери форму для завершеної дії в минулому.',
      'Elige la forma para una accion terminada en el pasado.',
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
      'Если есть yesterday, last night, ago или понятный смысл "это уже случилось", не оставляй обычную настоящую форму. Нужен вид для прошлого: worked, opened, went, saw, bought.',
      'Якщо є yesterday, last night, ago або зрозумілий зміст "це вже сталося", не залишай звичайну теперішню форму. Потрібен вигляд для минулого: worked, opened, went, saw, bought.',
      'Si ves yesterday, last night, ago o el sentido "ya ocurrio", no dejes la forma de presente. Usa la forma de pasado: worked, opened, went, saw, bought.',
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PAST_SIMPLE_REGULAR_IRREGULAR_TRAINING: DiagnosisTraining = {
  id: 'verb_past_simple_regular_irregular',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 25,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'Past Simple: worked, went, bought',
    'Past Simple: worked, went, bought',
    'Past Simple: worked, went, bought',
    {
      'pt-BR': 'Past Simple: worked, went, bought',
      vi: 'Past Simple: worked, went, bought',
      id: 'Past Simple: worked, went, bought',
      tr: 'Past Simple: worked, went, bought',
      pl: 'Past Simple: worked, went, bought',
    },
  ),
  shortTitle: tri('Past Simple', 'Past Simple', 'Past Simple', {
    'pt-BR': 'Past Simple',
    vi: 'Past Simple',
    id: 'Past Simple',
    tr: 'Past Simple',
    pl: 'Past Simple',
  }),
  shortDiagnosis: tri(
    'Ты говоришь о прошлом, но оставляешь глагол как в настоящем или делаешь goed/buyed.',
    'Ти говориш про минуле, але залишаєш дієслово як у теперішньому або робиш goed/buyed.',
    'Hablas del pasado, pero dejas el verbo en presente o haces goed/buyed.',
    {
      'pt-BR': 'Você fala do passado, mas deixa o verbo como no presente ou usa formas como goed/buyed.',
      vi: 'Bạn nói về quá khứ, nhưng vẫn để động từ như hiện tại hoặc dùng các dạng như goed/buyed.',
      id: 'Kamu berbicara tentang masa lalu, tetapi membiarkan verba seperti bentuk sekarang atau memakai goed/buyed.',
      tr: 'Geçmişten söz ediyorsun ama fiili şimdiki biçimde bırakıyor ya da goed/buyed gibi biçimler yapıyorsun.',
      pl: 'Mówisz o przeszłości, ale zostawiasz czasownik jak w teraźniejszości albo tworzysz formy typu goed/buyed.',
    },
  ),
  diagnosisText: tri(
    'Проблема не в слове yesterday. Оно уже сказало, что действие в прошлом. Проблема в том, что сам глагол тоже должен перейти в прошлый вид: worked, went, saw, bought.',
    'Проблема не в слові yesterday. Воно вже сказало, що дія в минулому. Проблема в тому, що саме дієслово теж має перейти в минулий вигляд: worked, went, saw, bought.',
    'El problema no es yesterday. Esa palabra ya dice que la accion esta en el pasado. El verbo tambien necesita forma de pasado: worked, went, saw, bought.',
    {
      'pt-BR': 'O problema não está em yesterday. Essa palavra já mostrou que a ação está no passado. O próprio verbo também precisa ir para a forma passada: worked, went, saw, bought.',
      vi: 'Vấn đề không nằm ở yesterday. Từ đó đã cho biết hành động ở quá khứ. Chính động từ cũng phải chuyển sang dạng quá khứ: worked, went, saw, bought.',
      id: 'Masalahnya bukan pada kata yesterday. Kata itu sudah menunjukkan bahwa aksinya terjadi di masa lalu. Verbanya juga harus berubah ke bentuk lampau: worked, went, saw, bought.',
      tr: 'Sorun yesterday kelimesinde değil. Bu kelime eylemin geçmişte olduğunu zaten söylüyor. Fiilin kendisi de geçmiş biçime geçmeli: worked, went, saw, bought.',
      pl: 'Problem nie leży w słowie yesterday. Ono już mówi, że czynność jest w przeszłości. Sam czasownik też musi przejść do formy przeszłej: worked, went, saw, bought.',
    },
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    'В обычном утверждении Past Simple нужен один прошлый вид: I worked yesterday. She opened the door. They went home. He saw me.',
    'У звичайному твердженні Past Simple потрібен один минулий вигляд: I worked yesterday. She opened the door. They went home. He saw me.',
    'En una afirmacion normal de Past Simple, usa una forma de pasado: I worked yesterday. She opened the door. They went home. He saw me.',
    {
      'pt-BR': 'Em uma afirmação normal no Past Simple, use uma forma de passado: I worked yesterday. She opened the door. They went home. He saw me.',
      vi: 'Trong câu khẳng định Past Simple bình thường, dùng một dạng quá khứ: I worked yesterday. She opened the door. They went home. He saw me.',
      id: 'Dalam pernyataan Past Simple biasa, gunakan satu bentuk lampau: I worked yesterday. She opened the door. They went home. He saw me.',
      tr: 'Normal bir Past Simple olumlu cümlede bir geçmiş biçim kullanılır: I worked yesterday. She opened the door. They went home. He saw me.',
      pl: 'W zwykłym zdaniu twierdzącym w Past Simple użyj jednej formy przeszłej: I worked yesterday. She opened the door. They went home. He saw me.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Yesterday, last night, last week, two days ago и in 2020 часто показывают завершенное действие в прошлом.',
      'Обычные глаголы чаще получают -ed: work -> worked, open -> opened, call -> called.',
      'Если слово уже заканчивается на e, добавляем только -d: live -> lived.',
      'Если в конце согласная + y, y меняется на ied: study -> studied.',
      'В коротких словах вроде stop последняя буква может удваиваться: stop -> stopped.',
      'Некоторые формы нужно знать отдельно: go -> went, see -> saw, buy -> bought, come -> came.',
      'В обычном утверждении не делаем did went. Либо I went, либо усиленное I did go.',
      'Один и тот же прошлый вид работает с I, he, she, we, they: I worked, he worked, they worked.',
    ],
    uk: [
      'Yesterday, last night, last week, two days ago і in 2020 часто показують завершену дію в минулому.',
      'Звичайні дієслова частіше отримують -ed: work -> worked, open -> opened, call -> called.',
      'Якщо слово вже закінчується на e, додаємо тільки -d: live -> lived.',
      'Якщо в кінці приголосна + y, y змінюється на ied: study -> studied.',
      'У коротких словах на кшталт stop остання літера може подвоюватися: stop -> stopped.',
      'Деякі форми треба знати окремо: go -> went, see -> saw, buy -> bought, come -> came.',
      'У звичайному твердженні не робимо did went. Або I went, або підсилене I did go.',
      'Один і той самий минулий вигляд працює з I, he, she, we, they: I worked, he worked, they worked.',
    ],
    es: [
      'Yesterday, last night, last week, two days ago e in 2020 suelen mostrar una accion terminada en el pasado.',
      'Los verbos regulares suelen tomar -ed: work -> worked, open -> opened, call -> called.',
      'Si la palabra ya termina en e, agrega solo -d: live -> lived.',
      'Consonante + y cambia a ied: study -> studied.',
      'Palabras cortas como stop pueden duplicar la ultima letra: stop -> stopped.',
      'Algunas formas son especiales: go -> went, see -> saw, buy -> bought, come -> came.',
      'En una afirmacion normal, no digas did went. Usa I went, o el enfatico I did go.',
      'La misma forma de pasado funciona con I, he, she, we, they: I worked, he worked, they worked.',
    ],
    'pt-BR': [
      'Yesterday, last night, last week, two days ago e in 2020 muitas vezes mostram uma ação concluída no passado.',
      'Verbos regulares geralmente recebem -ed: work -> worked, open -> opened, call -> called.',
      'Se a palavra já termina em e, acrescente só -d: live -> lived.',
      'Consoante + y vira ied: study -> studied.',
      'Palavras curtas como stop podem dobrar a última letra: stop -> stopped.',
      'Algumas formas são especiais: go -> went, see -> saw, buy -> bought, come -> came.',
      'Em uma afirmação normal, não diga did went. Use I went, ou o enfático I did go.',
      'A mesma forma do passado funciona com I, he, she, we, they: I worked, he worked, they worked.',
    ],
    vi: [
      'Yesterday, last night, last week, two days ago và in 2020 thường chỉ hành động đã hoàn thành trong quá khứ.',
      'Động từ có quy tắc thường thêm -ed: work -> worked, open -> opened, call -> called.',
      'Nếu từ đã kết thúc bằng e, chỉ thêm -d: live -> lived.',
      'Phụ âm + y đổi thành ied: study -> studied.',
      'Từ ngắn như stop có thể gấp đôi chữ cái cuối: stop -> stopped.',
      'Một số dạng cần nhớ riêng: go -> went, see -> saw, buy -> bought, come -> came.',
      'Trong câu khẳng định bình thường, đừng nói did went. Dùng I went, hoặc nhấn mạnh I did go.',
      'Cùng một dạng quá khứ dùng với I, he, she, we, they: I worked, he worked, they worked.',
    ],
    id: [
      'Yesterday, last night, last week, two days ago, dan in 2020 sering menunjukkan aksi yang selesai di masa lalu.',
      'Verba beraturan biasanya memakai -ed: work -> worked, open -> opened, call -> called.',
      'Jika kata sudah berakhir dengan e, tambahkan hanya -d: live -> lived.',
      'Konsonan + y berubah menjadi ied: study -> studied.',
      'Kata pendek seperti stop bisa menggandakan huruf terakhir: stop -> stopped.',
      'Beberapa bentuk khusus harus diingat: go -> went, see -> saw, buy -> bought, come -> came.',
      'Dalam pernyataan biasa, jangan mengatakan did went. Gunakan I went, atau penekanan I did go.',
      'Bentuk lampau yang sama dipakai dengan I, he, she, we, they: I worked, he worked, they worked.',
    ],
    tr: [
      'Yesterday, last night, last week, two days ago ve in 2020 çoğu zaman geçmişte tamamlanmış eylemi gösterir.',
      'Düzenli fiiller genellikle -ed alır: work -> worked, open -> opened, call -> called.',
      'Kelime zaten e ile bitiyorsa sadece -d eklenir: live -> lived.',
      'Ünsüz + y, ied olur: study -> studied.',
      'Stop gibi kısa kelimelerde son harf iki kez yazılabilir: stop -> stopped.',
      'Bazı biçimler özeldir: go -> went, see -> saw, buy -> bought, come -> came.',
      'Normal bir cümlede did went deme. I went kullan, ya da vurgulu I did go.',
      'Aynı geçmiş biçim I, he, she, we, they ile çalışır: I worked, he worked, they worked.',
    ],
    pl: [
      'Yesterday, last night, last week, two days ago i in 2020 często pokazują zakończone działanie w przeszłości.',
      'Czasowniki regularne zwykle dostają -ed: work -> worked, open -> opened, call -> called.',
      'Jeśli słowo już kończy się na e, dodaj tylko -d: live -> lived.',
      'Spółgłoska + y zmienia się w ied: study -> studied.',
      'Krótkie słowa jak stop mogą podwajać ostatnią literę: stop -> stopped.',
      'Niektóre formy są specjalne: go -> went, see -> saw, buy -> bought, come -> came.',
      'W zwykłym zdaniu twierdzącym nie mów did went. Użyj I went, albo emfatycznego I did go.',
      'Ta sama forma przeszła działa z I, he, she, we, they: I worked, he worked, they worked.',
    ],
  },
  examples: [
    {
      en: 'I worked yesterday.',
      ru: 'Я работал вчера.',
      uk: 'Я працював учора.',
      es: 'Trabaje ayer.',
      'pt-BR': 'Trabalhei ontem.',
      vi: 'Hôm qua tôi đã làm việc.',
      id: 'Saya bekerja kemarin.',
      tr: 'Dün çalıştım.',
      pl: 'Pracowałem wczoraj.',
      why: tri('Yesterday показывает прошлое. Work получает -ed: worked.', 'Yesterday показує минуле. Work отримує -ed: worked.', 'Yesterday muestra pasado. Work toma -ed: worked.'),
    },
    {
      en: 'She opened the door.',
      ru: 'Она открыла дверь.',
      uk: 'Вона відчинила двері.',
      es: 'Ella abrio la puerta.',
      'pt-BR': 'Ela abriu a porta.',
      vi: 'Cô ấy đã mở cửa.',
      id: 'Dia membuka pintu.',
      tr: 'Kapıyı açtı.',
      pl: 'Ona otworzyła drzwi.',
      why: tri('Open получает -ed: opened.', 'Open отримує -ed: opened.', 'Open toma -ed: opened.'),
    },
    {
      en: 'They went home.',
      ru: 'Они пошли домой.',
      uk: 'Вони пішли додому.',
      es: 'Ellos fueron a casa.',
      'pt-BR': 'Eles foram para casa.',
      vi: 'Họ đã về nhà.',
      id: 'Mereka pulang.',
      tr: 'Eve gittiler.',
      pl: 'Poszli do domu.',
      why: tri('Go не становится goed. Нужна отдельная форма: went.', 'Go не стає goed. Потрібна окрема форма: went.', 'Go no se convierte en goed. La forma especial es went.'),
    },
    {
      en: 'He saw me at work.',
      ru: 'Он видел меня на работе.',
      uk: 'Він бачив мене на роботі.',
      es: 'El me vio en el trabajo.',
      'pt-BR': 'Ele me viu no trabalho.',
      vi: 'Anh ấy đã thấy tôi ở chỗ làm.',
      id: 'Dia melihat saya di tempat kerja.',
      tr: 'Beni işte gördü.',
      pl: 'Widział mnie w pracy.',
      why: tri('See в прошлом становится saw.', 'See у минулому стає saw.', 'See pasa a saw en pasado.'),
    },
    {
      en: 'We studied English last night.',
      ru: 'Мы учили английский вчера вечером.',
      uk: 'Ми вчили англійську вчора ввечері.',
      es: 'Estudiamos ingles anoche.',
      'pt-BR': 'Estudamos inglês ontem à noite.',
      vi: 'Tối qua chúng tôi đã học tiếng Anh.',
      id: 'Kami belajar bahasa Inggris tadi malam.',
      tr: 'Dün gece İngilizce çalıştık.',
      pl: 'Uczyliśmy się angielskiego wczoraj wieczorem.',
      why: tri('Study меняет y на ied: studied.', 'Study змінює y на ied: studied.', 'Study cambia y a ied: studied.'),
    },
    {
      en: 'The bus stopped suddenly.',
      ru: 'Автобус внезапно остановился.',
      uk: 'Автобус раптово зупинився.',
      es: 'El autobus se detuvo de repente.',
      'pt-BR': 'O ônibus parou de repente.',
      vi: 'Xe buýt đột ngột dừng lại.',
      id: 'Bus berhenti tiba-tiba.',
      tr: 'Otobüs aniden durdu.',
      pl: 'Autobus nagle się zatrzymał.',
      why: tri('Stop получает двойную p: stopped.', 'Stop отримує подвійну p: stopped.', 'Stop duplica p: stopped.'),
    },
    {
      en: 'I bought a new phone.',
      ru: 'Я купил новый телефон.',
      uk: 'Я купив новий телефон.',
      es: 'Compre un telefono nuevo.',
      'pt-BR': 'Comprei um telefone novo.',
      vi: 'Tôi đã mua một chiếc điện thoại mới.',
      id: 'Saya membeli ponsel baru.',
      tr: 'Yeni bir telefon aldım.',
      pl: 'Kupiłem nowy telefon.',
      why: tri('Buy в прошлом становится bought.', 'Buy у минулому стає bought.', 'Buy pasa a bought en pasado.'),
    },
    {
      en: 'She came home late.',
      ru: 'Она пришла домой поздно.',
      uk: 'Вона прийшла додому пізно.',
      es: 'Ella llego tarde a casa.',
      'pt-BR': 'Ela chegou em casa tarde.',
      vi: 'Cô ấy về nhà muộn.',
      id: 'Dia pulang terlambat.',
      tr: 'Eve geç geldi.',
      pl: 'Wróciła późno do domu.',
      why: tri('Come в прошлом становится came.', 'Come у минулому стає came.', 'Come pasa a came en pasado.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты видишь yesterday, но глагол иногда оставляешь как есть: yesterday I go, yesterday I work. Для английского этого мало.',
        'Схоже, ти бачиш yesterday, але дієслово іноді залишаєш як є: yesterday I go, yesterday I work. Для англійської цього мало.',
        'Parece que ves yesterday, pero a veces dejas el verbo igual: yesterday I go, yesterday I work. Para el ingles eso no basta.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Прошлое должно быть видно в глаголе: worked, opened, went, saw, bought.',
        'Минуле має бути видно в дієслові: worked, opened, went, saw, bought.',
        'El pasado tiene que verse en el verbo: worked, opened, went, saw, bought.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Не делай goed и buyed. У go и buy свои формы: went и bought.',
        'Не роби goed і buyed. У go і buy свої форми: went і bought.',
        'No hagas goed ni buyed. Go y buy tienen formas especiales: went y bought.',
      ),
    },
  ],
  steps: [
    pastStep({
      id: 'past_simple_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'regular_ed_worked',
      sentence: 'I ___ yesterday.',
      translation: tri('Я работал вчера.', 'Я працював учора.', 'I worked yesterday.'),
      options: ['work', 'worked', 'works', 'am working'],
      correctAnswer: 'worked',
      correctFeedback: tri('Да. Yesterday показывает прошлое. Work -> worked.', 'Так. Yesterday показує минуле. Work -> worked.', 'Yes. Yesterday shows the past. Work -> worked.'),
      wrong: {
        work: tri('Work оставляет фразу в настоящем. С yesterday нужно worked.', 'Work залишає фразу в теперішньому. З yesterday потрібно worked.', 'Work leaves the sentence in the present. With yesterday, use worked.'),
        works: tri('Works звучит как обычная привычка с he/she/it. Здесь I и прошлое: worked.', 'Works звучить як звичка з he/she/it. Тут I і минуле: worked.', 'Works sounds like a present habit with he/she/it. Here it is I and past: worked.'),
        'am working': tri('Am working звучит как процесс сейчас. Yesterday просит worked.', 'Am working звучить як процес зараз. Yesterday просить worked.', 'Am working sounds like action now. Yesterday needs worked.'),
      },
      focusWords: ['yesterday', 'worked'],
    }),
    pastStep({
      id: 'past_simple_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'regular_ed_opened',
      sentence: 'She ___ the door.',
      translation: tri('Она открыла дверь.', 'Вона відчинила двері.', 'She opened the door.'),
      options: ['open', 'opened', 'opens', 'is opening'],
      correctAnswer: 'opened',
      correctFeedback: tri('Да. Действие уже случилось. Open -> opened.', 'Так. Дія вже сталася. Open -> opened.', 'Yes. The action already happened. Open -> opened.'),
      wrong: {
        open: tri('Open не показывает прошлое. Нужен opened.', 'Open не показує минуле. Потрібно opened.', 'Open does not show the past. Use opened.'),
        opens: tri('Opens звучит как настоящее. Здесь она уже открыла дверь: opened.', 'Opens звучить як теперішній час. Тут вона вже відчинила двері: opened.', 'Opens sounds present. Here she already opened the door: opened.'),
        'is opening': tri('Is opening значит, что она открывает дверь сейчас. Здесь действие уже завершилось: opened.', 'Is opening означає, що вона відчиняє двері зараз. Тут дія вже завершилась: opened.', 'Is opening means she is opening it now. Here the action is finished: opened.'),
      },
      focusWords: ['opened'],
    }),
    pastStep({
      id: 'past_simple_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'regular_ed_called',
      sentence: 'They ___ me last night.',
      translation: tri('Они позвонили мне вчера вечером.', 'Вони подзвонили мені вчора ввечері.', 'They called me last night.'),
      options: ['call', 'called', 'calls', 'are calling'],
      correctAnswer: 'called',
      correctFeedback: tri('Да. Last night показывает прошлое. Call -> called.', 'Так. Last night показує минуле. Call -> called.', 'Yes. Last night shows the past. Call -> called.'),
      wrong: {
        call: tri('Call не показывает прошлое. Last night просит called.', 'Call не показує минуле. Last night просить called.', 'Call does not show the past. Last night needs called.'),
        calls: tri('Calls не идет с they и не показывает прошлое. Нужно called.', 'Calls не йде з they і не показує минуле. Потрібно called.', 'Calls does not go with they and does not show the past. Use called.'),
        'are calling': tri('Are calling звучит как действие сейчас. Last night просит called.', 'Are calling звучить як дія зараз. Last night просить called.', 'Are calling sounds like action now. Last night needs called.'),
      },
      focusWords: ['last night', 'called'],
    }),
    pastStep({
      id: 'past_simple_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'irregular_go_went',
      sentence: 'They ___ home.',
      translation: tri('Они пошли домой.', 'Вони пішли додому.', 'They went home.'),
      options: ['go', 'went', 'goed', 'goes'],
      correctAnswer: 'went',
      correctFeedback: tri('Да. Go в прошлом становится went.', 'Так. Go у минулому стає went.', 'Yes. Go becomes went in the past.'),
      wrong: {
        go: tri('Go не показывает прошлое. Нужна форма went.', 'Go не показує минуле. Потрібна форма went.', 'Go does not show the past. Use went.'),
        goed: tri('Goed не существует как нормальная форма. Go в прошлом: went.', 'Goed не існує як нормальна форма. Go у минулому: went.', 'Goed is not the normal form. Go in the past is went.'),
        goes: tri('Goes звучит как настоящее с he/she/it. Здесь нужно went.', 'Goes звучить як теперішній час з he/she/it. Тут потрібно went.', 'Goes sounds present with he/she/it. Use went here.'),
      },
      focusWords: ['went'],
    }),
    pastStep({
      id: 'past_simple_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'irregular_see_saw',
      sentence: 'He ___ me at work.',
      translation: tri('Он видел меня на работе.', 'Він бачив мене на роботі.', 'He saw me at work.'),
      options: ['see', 'saw', 'seed', 'sees'],
      correctAnswer: 'saw',
      correctFeedback: tri('Да. See в прошлом становится saw.', 'Так. See у минулому стає saw.', 'Yes. See becomes saw in the past.'),
      wrong: {
        see: tri('See не показывает прошлое. Нужен saw.', 'See не показує минуле. Потрібно saw.', 'See does not show the past. Use saw.'),
        seed: tri('Seed здесь не подходит. See в прошлом: saw.', 'Seed тут не підходить. See у минулому: saw.', 'Seed does not fit here. See in the past is saw.'),
        sees: tri('Sees звучит как настоящее. Здесь нужен saw.', 'Sees звучить як теперішній час. Тут потрібно saw.', 'Sees sounds present. Use saw here.'),
      },
      focusWords: ['saw'],
    }),
    pastStep({
      id: 'past_simple_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'irregular_buy_bought',
      sentence: 'I ___ a new phone.',
      translation: tri('Я купил новый телефон.', 'Я купив новий телефон.', 'I bought a new phone.'),
      options: ['buy', 'bought', 'buyed', 'buys'],
      correctAnswer: 'bought',
      correctFeedback: tri('Да. Buy в прошлом становится bought.', 'Так. Buy у минулому стає bought.', 'Yes. Buy becomes bought in the past.'),
      wrong: {
        buy: tri('Buy не показывает прошлое. Нужен bought.', 'Buy не показує минуле. Потрібно bought.', 'Buy does not show the past. Use bought.'),
        buyed: tri('Buyed здесь ошибка. Buy в прошлом: bought.', 'Buyed тут помилка. Buy у минулому: bought.', 'Buyed is wrong here. Buy in the past is bought.'),
        buys: tri('Buys звучит как настоящее с he/she/it. Здесь нужно bought.', 'Buys звучить як теперішній час з he/she/it. Тут потрібно bought.', 'Buys sounds present with he/she/it. Use bought here.'),
      },
      focusWords: ['bought'],
    }),
    pastStep({
      id: 'past_simple_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'e_plus_d_lived',
      sentence: 'We ___ there before.',
      translation: tri('Мы жили там раньше.', 'Ми жили там раніше.', 'We lived there before.'),
      options: ['live', 'lived', 'liveed', 'lives'],
      correctAnswer: 'lived',
      correctFeedback: tri('Да. Live уже заканчивается на e, поэтому lived.', 'Так. Live вже закінчується на e, тому lived.', 'Yes. Live already ends in e, so lived.'),
      wrong: {
        live: tri('Live не показывает прошлое. Before просит lived.', 'Live не показує минуле. Before просить lived.', 'Live does not show the past. Before needs lived.'),
        liveed: tri('Liveed написано лишним способом. У live уже есть e: lived.', 'Liveed написано зайвим способом. У live вже є e: lived.', 'Liveed adds too much. Live already has e: lived.'),
        lives: tri('Lives звучит как настоящее. Здесь нужно lived.', 'Lives звучить як теперішній час. Тут потрібно lived.', 'Lives sounds present. Use lived here.'),
      },
      focusWords: ['before', 'lived'],
    }),
    pastStep({
      id: 'past_simple_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'y_to_ied_studied',
      sentence: 'We ___ English last night.',
      translation: tri('Мы учили английский вчера вечером.', 'Ми вчили англійську вчора ввечері.', 'We studied English last night.'),
      options: ['study', 'studied', 'studyed', 'studies'],
      correctAnswer: 'studied',
      correctFeedback: tri('Да. Study меняет y на ied: studied.', 'Так. Study змінює y на ied: studied.', 'Yes. Study changes y to ied: studied.'),
      wrong: {
        study: tri('Study не показывает прошлое. Last night просит studied.', 'Study не показує минуле. Last night просить studied.', 'Study does not show the past. Last night needs studied.'),
        studyed: tri('Studyed написано неправильно. Нужна форма studied.', 'Studyed написано неправильно. Потрібна форма studied.', 'Studyed is spelled incorrectly. Use studied.'),
        studies: tri('Studies звучит как настоящее с he/she/it. Здесь нужно studied.', 'Studies звучить як теперішній час з he/she/it. Тут потрібно studied.', 'Studies sounds present with he/she/it. Use studied here.'),
      },
      focusWords: ['last night', 'studied'],
    }),
    pastStep({
      id: 'past_simple_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'double_consonant_stopped',
      sentence: 'The bus ___ suddenly.',
      translation: tri('Автобус внезапно остановился.', 'Автобус раптово зупинився.', 'The bus stopped suddenly.'),
      options: ['stop', 'stopped', 'stoped', 'stops'],
      correctAnswer: 'stopped',
      correctFeedback: tri('Да. Stop в прошлом обычно пишется stopped.', 'Так. Stop у минулому зазвичай пишеться stopped.', 'Yes. Stop is usually written stopped in the past.'),
      wrong: {
        stop: tri('Stop не показывает прошлое. Нужен stopped.', 'Stop не показує минуле. Потрібно stopped.', 'Stop does not show the past. Use stopped.'),
        stoped: tri('Stoped написано неправильно. Здесь нужна двойная p: stopped.', 'Stoped написано неправильно. Тут потрібна подвійна p: stopped.', 'Stoped is spelled incorrectly. Double p: stopped.'),
        stops: tri('Stops звучит как настоящее. Здесь нужно stopped.', 'Stops звучить як теперішній час. Тут потрібно stopped.', 'Stops sounds present. Use stopped here.'),
      },
      focusWords: ['stopped'],
    }),
    pastStep({
      id: 'past_simple_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'no_present_with_yesterday',
      sentence: 'Yesterday, I ___ to the shop.',
      translation: tri('Вчера я пошел в магазин.', 'Учора я пішов до магазину.', 'Yesterday, I went to the shop.'),
      options: ['go', 'went', 'goes', 'am going'],
      correctAnswer: 'went',
      correctFeedback: tri('Да. Yesterday просит прошлый вид. Go -> went.', 'Так. Yesterday просить минулий вигляд. Go -> went.', 'Yes. Yesterday needs the past form. Go -> went.'),
      wrong: {
        go: tri('Go нельзя оставлять с yesterday. Нужно went.', 'Go не можна залишати з yesterday. Потрібно went.', 'Do not leave go with yesterday. Use went.'),
        goes: tri('Goes звучит как настоящее. Yesterday просит went.', 'Goes звучить як теперішній час. Yesterday просить went.', 'Goes sounds present. Yesterday needs went.'),
        'am going': tri('Am going звучит как процесс сейчас или план. Yesterday просит went.', 'Am going звучить як процес зараз або план. Yesterday просить went.', 'Am going sounds like action now or a plan. Yesterday needs went.'),
      },
      focusWords: ['yesterday', 'went'],
    }),
    pastStep({
      id: 'past_simple_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'no_double_past_did',
      sentence: 'Choose the correct sentence.',
      translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'),
      options: ['I went home.', 'I did went home.', 'I go home yesterday.', 'I goed home.'],
      correctAnswer: 'I went home.',
      correctFeedback: tri('Да. Обычное утверждение: I went home.', 'Так. Звичайне твердження: I went home.', 'Yes. Normal statement: I went home.'),
      wrong: {
        'I did went home.': tri('Did went неправильно. Если используешь did для усиления, будет did go. Но обычная фраза здесь: I went home.', 'Did went неправильно. Якщо використовуєш did для підсилення, буде did go. Але звичайна фраза тут: I went home.', 'Did went is wrong. If you use did for emphasis, it is did go. But the normal sentence here is I went home.'),
        'I go home yesterday.': tri('Go с yesterday не подходит. Нужно I went home.', 'Go з yesterday не підходить. Потрібно I went home.', 'Go with yesterday does not fit. Use I went home.'),
        'I goed home.': tri('Goed неправильно. Go в прошлом: went.', 'Goed неправильно. Go у минулому: went.', 'Goed is wrong. Go in the past is went.'),
      },
      focusWords: ['went', 'did go'],
    }),
    pastStep({
      id: 'past_simple_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'past_same_all_people',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'),
      options: ['I worked / He worked', 'I worked / He works', 'I work / He worked', 'I did worked / He did worked'],
      correctAnswer: 'I worked / He worked',
      correctFeedback: tri('Да. В прошлом worked не меняется: I worked, he worked.', 'Так. У минулому worked не змінюється: I worked, he worked.', 'Yes. Worked does not change: I worked, he worked.'),
      wrong: {
        'I worked / He works': tri('He works звучит как настоящее. В прошлом нужно he worked.', 'He works звучить як теперішній час. У минулому потрібно he worked.', 'He works sounds present. In the past, use he worked.'),
        'I work / He worked': tri('I work звучит как настоящее. Если обе части в прошлом: I worked / He worked.', 'I work звучить як теперішній час. Якщо обидві частини в минулому: I worked / He worked.', 'I work sounds present. If both are in the past: I worked / He worked.'),
        'I did worked / He did worked': tri('Did worked неправильно. Обычная прошлая форма здесь: worked.', 'Did worked неправильно. Звичайна минула форма тут: worked.', 'Did worked is wrong. The normal past form here is worked.'),
      },
      focusWords: ['worked'],
    }),
    pastStep({
      id: 'past_simple_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_regular_irregular_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'),
      options: [
        'work -> worked / go -> went',
        'work -> work / go -> goed',
        'work -> works / go -> goes',
        'work -> did worked / go -> did went',
      ],
      correctAnswer: 'work -> worked / go -> went',
      correctFeedback: tri('Да. Work -> worked. Go -> went.', 'Так. Work -> worked. Go -> went.', 'Yes. Work -> worked. Go -> went.'),
      wrong: {
        'work -> work / go -> goed': tri('Work в прошлом получает -ed, а go не становится goed. Нужно worked / went.', 'Work у минулому отримує -ed, а go не стає goed. Потрібно worked / went.', 'Work takes -ed in the past, and go does not become goed. Use worked / went.'),
        'work -> works / go -> goes': tri('Works/goes звучит как настоящее. Для прошлого нужно worked/went.', 'Works/goes звучить як теперішній час. Для минулого потрібно worked/went.', 'Works/goes sounds present. For the past, use worked/went.'),
        'work -> did worked / go -> did went': tri('Did worked и did went неправильно. Обычные прошлые формы: worked/went.', 'Did worked і did went неправильно. Звичайні минулі форми: worked/went.', 'Did worked and did went are wrong. Normal past forms: worked/went.'),
      },
      focusWords: ['worked', 'went'],
    }),
    pastStep({
      id: 'past_simple_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_spelling_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'),
      options: [
        'study -> studied / stop -> stopped',
        'study -> studyed / stop -> stoped',
        'study -> studys / stop -> stops',
        'study -> studying / stop -> stopping',
      ],
      correctAnswer: 'study -> studied / stop -> stopped',
      correctFeedback: tri('Да. Study -> studied. Stop -> stopped.', 'Так. Study -> studied. Stop -> stopped.', 'Yes. Study -> studied. Stop -> stopped.'),
      wrong: {
        'study -> studyed / stop -> stoped': tri('Studyed и stoped написаны неправильно. Нужны studied и stopped.', 'Studyed і stoped написані неправильно. Потрібні studied і stopped.', 'Studyed and stoped are spelled incorrectly. Use studied and stopped.'),
        'study -> studys / stop -> stops': tri('Studys/stops звучит не как прошлое. Нужно studied/stopped.', 'Studys/stops звучить не як минуле. Потрібно studied/stopped.', 'Studys/stops do not sound past. Use studied/stopped.'),
        'study -> studying / stop -> stopping': tri('Studying/stopping не обычное утверждение о прошлом. Нужно studied/stopped.', 'Studying/stopping не звичайне твердження про минуле. Потрібно studied/stopped.', 'Studying/stopping is not a normal past statement. Use studied/stopped.'),
      },
      focusWords: ['studied', 'stopped'],
    }),
    pastStep({
      id: 'past_simple_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'),
      options: [
        'Yesterday, I went to the shop and bought some milk.',
        'Yesterday, I go to the shop and buy some milk.',
        'Yesterday, I goed to the shop and buyed some milk.',
        'Yesterday, I did went to the shop and did bought some milk.',
      ],
      correctAnswer: 'Yesterday, I went to the shop and bought some milk.',
      correctFeedback: tri('Да. Yesterday просит went и bought.', 'Так. Yesterday просить went і bought.', 'Yes. Yesterday needs went and bought.'),
      wrong: {
        'Yesterday, I go to the shop and buy some milk.': tri('Go/buy оставлены как в настоящем. С yesterday нужны went/bought.', 'Go/buy залишені як у теперішньому. З yesterday потрібні went/bought.', 'Go/buy are left in present form. With yesterday, use went/bought.'),
        'Yesterday, I goed to the shop and buyed some milk.': tri('Goed и buyed неправильные формы. Нужно went и bought.', 'Goed і buyed неправильні форми. Потрібно went і bought.', 'Goed and buyed are wrong forms. Use went and bought.'),
        'Yesterday, I did went to the shop and did bought some milk.': tri('Did went / did bought неправильно. Обычная фраза: went / bought.', 'Did went / did bought неправильно. Звичайна фраза: went / bought.', 'Did went / did bought is wrong. Normal sentence: went / bought.'),
      },
      focusWords: ['yesterday', 'went', 'bought'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'present_form_with_past_marker',
      'regular_past_missing_ed',
      'irregular_past_error',
      'goed_error',
      'double_past_did_error',
      'y_to_ied_error',
      'double_consonant_error',
      'wrong_person_based_past_change',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем маркер прошлого.', 'Показуємо маркер минулого.', 'Muestra el marcador de pasado.'),
    depth2: tri('Спрашиваем: обычное -ed или отдельная форма?', 'Питаємо: звичайне -ed чи окрема форма?', 'Pregunta: -ed regular o forma especial?'),
    depth3: tri('Даем пару: worked / went.', 'Даємо пару: worked / went.', 'Da la pareja: worked / went.'),
    depth4: tri('Почти подсказка: показываем нужный прошлый вид.', 'Майже підказка: показуємо потрібний минулий вигляд.', 'Casi una pista: muestra la forma pasada necesaria.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Стоп. Есть маркер прошлого? Тогда глагол тоже должен показать прошлое: worked или went.',
        'Стоп. Є маркер минулого? Тоді дієслово теж має показати минуле: worked або went.',
        'Alto. Hay marcador de pasado? Entonces el verbo tambien debe mostrar pasado: worked o went.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_regular_irregular_hint_then_retry',
      card: tri(
        'Система покажет тип слова: обычное -ed или отдельная форма. Ответ она не выбирает.',
        'Система покаже тип слова: звичайне -ed чи окрема форма. Відповідь вона не обирає.',
        'El sistema muestra el tipo: -ed regular o forma especial. No elige la respuesta.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала прошлое или настоящее, потом -ed или отдельная форма.',
        'Режим підказки: спочатку минуле чи теперішнє, потім -ed чи окрема форма.',
        'Modo guiado: primero pasado o presente, luego -ed o forma especial.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_past_simple_001',
        prompt: tri('Yesterday показывает прошлое или настоящее?', 'Yesterday показує минуле чи теперішнє?', 'Yesterday muestra pasado o presente?'),
        options: ['past', 'present'],
        correctIndex: 0,
        thenReturnToExerciseId: 'past_simple_easy_001',
      },
      {
        id: 'guided_past_simple_002',
        prompt: tri('Work в прошлом: work или worked?', 'Work у минулому: work чи worked?', 'Work en pasado: work o worked?'),
        options: ['work', 'worked'],
        correctIndex: 1,
        thenReturnToExerciseId: 'past_simple_easy_001',
      },
      {
        id: 'guided_past_simple_003',
        prompt: tri('Go в прошлом: goed или went?', 'Go у минулому: goed чи went?', 'Go en pasado: goed o went?'),
        options: ['goed', 'went'],
        correctIndex: 1,
        thenReturnToExerciseId: 'past_simple_contrast_001',
      },
      {
        id: 'guided_past_simple_004',
        prompt: tri('После did для усиления будет did went или did go?', 'Після did для підсилення буде did went чи did go?', 'Despues de did para enfasis: did went o did go?'),
        options: ['did went', 'did go'],
        correctIndex: 1,
        thenReturnToExerciseId: 'past_simple_mixed_002',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_past_simple_regular_irregular',
    diagnosisLabel: tri('Past Simple: regular / irregular', 'Past Simple: regular / irregular', 'Past Simple: regular / irregular'),
    contrastSet: CONTRAST,
    focusWords: ['yesterday', 'last night', 'worked', 'went', 'saw', 'bought'],
    focusPatterns: [
      'regular_ed_worked',
      'regular_ed_opened',
      'regular_ed_called',
      'irregular_go_went',
      'irregular_see_saw',
      'irregular_buy_bought',
      'e_plus_d_lived',
      'y_to_ied_studied',
      'double_consonant_stopped',
      'no_present_with_yesterday',
      'no_double_past_did',
      'past_same_all_people',
      'mixed_regular_irregular_pair',
      'mixed_spelling_pair',
      'mixed_sentence_correction',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: {
      start: 'easy',
      afterCorrectInRow: 3,
      next: 'contrast',
      afterCorrectInRowAtContrast: 3,
      final: 'mixed_review',
    },
  },
  analyticsEvents: {
    start: 'diagnosis_training_verb_past_simple_regular_irregular_start',
    answer: 'diagnosis_training_verb_past_simple_regular_irregular_answer',
    mastery: 'diagnosis_training_verb_past_simple_regular_irregular_mastery',
    recovery: 'diagnosis_training_verb_past_simple_regular_irregular_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'verb_past_simple_regular_irregular',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logVerbRegularity: true,
      logPastForm: true,
      logTimeMarker: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_past_simple_regular_irregular',
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
