// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const VRQ_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre very/really/quite ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về very/really/quite này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan very/really/quite ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu very/really/quite açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie very/really/quite nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? VRQ_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'very + adjective',
  'really + adjective',
  'quite + adjective',
  'gradable adjective',
  'strong adjective',
  'intensifier position',
  'too vs very',
];

const VRQ_SKILL_ES: Record<string, string> = {
  very_useful_basic: 'Very da un refuerzo neutral: very useful.',
  very_fast_basic: 'Very va antes de fast: very fast.',
  very_important_basic: 'Very va antes de important: very important.',
  really_tired_conversation: 'Really suena mas conversacional: really tired.',
  really_interesting_conversation: 'Really da un tono vivo: really interesting.',
  really_good_conversation: 'Really good es una opcion natural y fuerte.',
  quite_good_moderate: 'Quite suaviza la evaluacion: quite good.',
  quite_difficult_moderate: 'Quite difficult suena mas moderado que really difficult.',
  quite_interesting_moderate: 'Quite interesting es positivo, pero suave.',
  very_vs_too_hot: 'Very hot es fuerte pero tolerable; too hot ya es problema.',
  too_hot_problem: 'Too hot to eat marca problema.',
  quite_vs_really_tone: 'Not amazing pide quite good, no really good.',
  mixed_very_really_quite: 'Los intensificadores van antes de la cualidad.',
  mixed_very_too: 'Very hot puede ser tolerable; too hot to drink no.',
  mixed_sentence_correction: 'Orden natural: really useful / quite difficult.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = VRQ_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? VRQ_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function vrqEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = VRQ_SKILL_ES[input.targetSkill] ?? 'Elige el intensificador por tono y posicion.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function makeStep(input: {
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
  clue: TriText;
  finalHint: TriText;
  focusWords: string[];
}): DiagnosisTrainingStep {
  const esFeedback = vrqEsFeedback(input);
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: withEs(input.translation, esFeedback),
    explanationBlock: tri(
      'Эти слова стоят перед качеством, но дают разный тон. Very - нейтральное "очень". Really - сильнее и разговорнее. Quite - мягкое "довольно". Too - уже перебор или проблема.',
      'Ці слова стоять перед якістю, але дають різний тон. Very - нейтральне "дуже". Really - сильніше й розмовніше. Quite - мʼяке "доволі". Too - уже перебір або проблема.',
      'Very, really y quite intensifican la palabra siguiente, pero con tonos distintos. Too marca un problema.',
    ),
    microTask: tri(
      'Выбери живой кусок: very, really, quite или too.',
      'Обери живий шматок: very, really, quite або too.',
      'Elige el bloque natural: very, really, quite o too.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: withEs(input.correctFeedback, esFeedback),
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((option) => option !== input.correctAnswer)
        .map((option) => [
          option,
          withEs(input.wrong[option] ??
            tri(
              `Почти, но здесь нужен другой кусок: ${input.correctAnswer}.`,
              `Майже, але тут потрiбен iнший шматок: ${input.correctAnswer}.`,
              `Casi. Usa: ${input.correctAnswer}.`,
            ), esFeedback),
        ]),
    ),
    retryFeedback: [
      withEs(input.clue, esFeedback),
      tri(
        'Сначала поймай оттенок. Very = просто очень. Really = живее и сильнее в разговоре. Quite = довольно, часто мягче. Too = слишком, уже есть проблема.',
        'Спочатку злови вiдтiнок. Very = просто дуже. Really = живiше й сильнiше в розмовi. Quite = доволi, часто мʼякше. Too = занадто, вже є проблема.',
        'Very = fuerza neutral. Really = mas conversacional. Quite = moderado. Too = exceso o problema.',
      ),
      tri(
        'Теперь проверь порядок: усилитель должен стоять перед словом, которое он усиливает.',
        'Тепер перевiр порядок: пiдсилювач має стояти перед словом, яке вiн пiдсилює.',
        'Ahora revisa el orden: el intensificador va antes de la palabra que modifica.',
      ),
      tri(
        'Здесь решает не перевод, а оттенок и место усилителя.',
        'Тут вирiшує не переклад, а вiдтiнок i мiсце пiдсилювача.',
        `Respuesta: ${input.correctAnswer}.`,
      ),
    ],
    fallbackExplanation: tri(
      'Сначала выбери тон: нейтрально, живее, мягче или слишком много. Потом ставь усилитель перед словом, которое он усиливает.',
      'Спочатку обери тон: нейтрально, живіше, мʼякше або занадто багато. Потім став підсилювач перед словом, яке він підсилює.',
      'Bloques: very useful, really tired, quite good, quite difficult, very hot, too hot.',
    ),
    focusWords: input.focusWords,
  };
}

export const MODIFIER_VERY_REALLY_QUITE_TRAINING: DiagnosisTraining = {
  id: 'modifier_very_really_quite',
  category: 'modifier',
  version: '1.0.0',
  status: 'active',
  priority: 35,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'Very / Really / Quite: оттенки усиления',
    'Very / Really / Quite: відтінки підсилення',
    'Very / Really / Quite',
    {
      'pt-BR': 'Very / Really / Quite: tons de intensidade',
      vi: 'Very / Really / Quite: sắc thái nhấn mạnh',
      id: 'Very / Really / Quite: nuansa penekanan',
      tr: 'Very / Really / Quite: vurgu tonları',
      pl: 'Very / Really / Quite: odcienie wzmocnienia',
    },
  ),
  shortTitle: tri('Very / Really / Quite', 'Very / Really / Quite', 'Very / Really / Quite', {
    'pt-BR': 'Very / Really / Quite',
    vi: 'Very / Really / Quite',
    id: 'Very / Really / Quite',
    tr: 'Very / Really / Quite',
    pl: 'Very / Really / Quite',
  }),
  shortDiagnosis: tri(
    'Ты знаешь very, really и quite, но выбираешь их как одно и то же "очень". Из-за этого фраза звучит либо слишком резко, либо неестественно.',
    'Ти знаєш very, really i quite, але обираєш їх як одне й те саме "дуже". Через це фраза звучить або занадто рiзко, або неприродно.',
    'Tratas very, really y quite como si fueran la misma palabra, y por eso se rompe el tono.',
    {
      'pt-BR': 'Você conhece very, really e quite, mas escolhe todos como se fossem o mesmo "muito". Por isso a frase soa forte demais ou pouco natural.',
      vi: 'Bạn biết very, really và quite, nhưng chọn chúng như cùng một từ "rất". Vì vậy câu nghe quá mạnh hoặc không tự nhiên.',
      id: 'Kamu tahu very, really, dan quite, tetapi memilihnya seolah semuanya berarti "sangat". Akibatnya, kalimat terdengar terlalu keras atau tidak alami.',
      tr: 'Very, really ve quite kelimelerini biliyorsun, ama hepsini aynı "çok" gibi seçiyorsun. Bu yüzden cümle ya fazla sert ya da doğal olmayan şekilde duyuluyor.',
      pl: 'Znasz very, really i quite, ale wybierasz je jak jedno i to samo "bardzo". Przez to zdanie brzmi albo zbyt ostro, albo nienaturalnie.',
    },
  ),
  diagnosisText: tri(
    'Проблема не в том, что ты не знаешь перевод. Проблема в оттенке. Very useful - спокойно и нейтрально. Really useful - живее, как в разговоре. Quite useful - положительно, но мягче. А too useful уже звучит как перебор, будто полезности стало слишком много.',
    'Проблема не в тому, що ти не знаєш переклад. Проблема у вiдтiнку. Very useful - спокiйно й нейтрально. Really useful - живiше, як у розмовi. Quite useful - позитивно, але мʼякше. А too useful вже звучить як перебiр, нiби корисностi стало забагато.',
    'El problema no es la traduccion, sino el matiz. Very useful es neutral. Really useful suena mas conversacional. Quite useful es positivo, pero mas suave. Too useful ya suena como exceso.',
    {
      'pt-BR': 'O problema não é saber a tradução. O problema é o tom. Very useful soa calmo e neutro. Really useful soa mais vivo, como numa conversa. Quite useful é positivo, mas mais suave. Too useful já soa como excesso, como se a utilidade fosse demais.',
      vi: 'Vấn đề không phải là bạn không biết bản dịch. Vấn đề nằm ở sắc thái. Very useful nghe bình tĩnh và trung tính. Really useful nghe sinh động hơn, như trong hội thoại. Quite useful là tích cực nhưng nhẹ hơn. Too useful lại nghe như quá mức, như thể sự hữu ích đã quá nhiều.',
      id: 'Masalahnya bukan kamu tidak tahu terjemahannya. Masalahnya ada pada nuansa. Very useful terdengar tenang dan netral. Really useful terdengar lebih hidup, seperti percakapan. Quite useful positif, tetapi lebih lembut. Too useful sudah terdengar berlebihan, seolah kegunaannya terlalu banyak.',
      tr: 'Sorun çeviriyi bilmemek değil. Sorun tonda. Very useful sakin ve nötr duyulur. Really useful konuşmadaki gibi daha canlı duyulur. Quite useful olumlu ama daha yumuşaktır. Too useful ise artık aşırılık gibi, faydalılık fazla olmuş gibi duyulur.',
      pl: 'Problem nie polega na tym, że nie znasz tłumaczenia. Problem tkwi w odcieniu. Very useful brzmi spokojnie i neutralnie. Really useful brzmi żywiej, jak w rozmowie. Quite useful jest pozytywne, ale łagodniejsze. Too useful brzmi już jak przesada, jakby użyteczności było za dużo.',
    },
  ),
  mentalModel: tri(
    'Не переводи все как "очень". Выбирай настроение фразы. Very - обычное усиление. Really - живое усиление. Quite - осторожная положительная оценка. Too - проблема или перебор.',
    'Не перекладай усе як "дуже". Обирай настрiй фрази. Very - звичайне пiдсилення. Really - живе пiдсилення. Quite - обережна позитивна оцiнка. Too - проблема або перебiр.',
    'No traduzcas todo como "muy". Elige el tono: neutral, conversacional, mas suave o excesivo.',
    {
      'pt-BR': 'Não traduza tudo como "muito". Escolha o clima da frase. Very é intensificação comum. Really é intensificação mais viva. Quite é uma avaliação positiva cuidadosa. Too indica problema ou excesso.',
      vi: 'Đừng dịch tất cả thành "rất". Hãy chọn cảm giác của câu. Very là nhấn mạnh thông thường. Really là nhấn mạnh sinh động. Quite là đánh giá tích cực nhưng dè dặt. Too là vấn đề hoặc quá mức.',
      id: 'Jangan terjemahkan semuanya sebagai "sangat". Pilih suasana kalimatnya. Very adalah penekanan biasa. Really adalah penekanan yang lebih hidup. Quite adalah penilaian positif yang hati-hati. Too berarti masalah atau berlebihan.',
      tr: 'Her şeyi "çok" diye çevirme. Cümlenin havasını seç. Very normal vurgu verir. Really canlı vurgu verir. Quite temkinli olumlu değerlendirmedir. Too sorun ya da aşırılık gösterir.',
      pl: 'Nie tłumacz wszystkiego jako "bardzo". Wybieraj nastrój zdania. Very to zwykłe wzmocnienie. Really to żywe wzmocnienie. Quite to ostrożna pozytywna ocena. Too oznacza problem albo przesadę.',
    },
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Very обычно просто усиливает. Really звучит живее. Quite часто смягчает оценку. Too показывает, что качества уже слишком много и появилась проблема.',
    'Very зазвичай просто підсилює. Really звучить живіше. Quite часто помʼякшує оцінку. Too показує, що якості вже занадто багато і зʼявилася проблема.',
    'Bloques: very useful, really tired, quite good, quite difficult. Very hot es fuerte; too hot es un problema.',
    {
      'pt-BR': 'Very geralmente apenas intensifica. Really soa mais vivo. Quite muitas vezes suaviza a avaliação. Too mostra que a qualidade já passou do ponto e virou um problema.',
      vi: 'Very thường chỉ nhấn mạnh. Really nghe sinh động hơn. Quite thường làm đánh giá nhẹ hơn. Too cho thấy mức độ đã quá nhiều và trở thành vấn đề.',
      id: 'Very biasanya hanya memperkuat. Really terdengar lebih hidup. Quite sering melembutkan penilaian. Too menunjukkan bahwa kualitasnya sudah terlalu banyak dan menjadi masalah.',
      tr: 'Very genellikle sadece güçlendirir. Really daha canlı duyulur. Quite çoğu zaman değerlendirmeyi yumuşatır. Too, özelliğin artık fazla olduğunu ve sorun oluştuğunu gösterir.',
      pl: 'Very zwykle po prostu wzmacnia. Really brzmi żywiej. Quite często łagodzi ocenę. Too pokazuje, że cechy jest już za dużo i pojawił się problem.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Very звучит нейтрально: very useful, very fast, very important.',
      'Really звучит живее и разговорнее: really useful, really tired, really interesting.',
      'Quite часто делает оценку мягче: quite good, quite difficult, quite interesting.',
      'Very не равно too. Very hot - очень горячий. Too hot - слишком горячий, есть проблема.',
      'Не говори very much useful. Нормально: very useful.',
      'Не говори really much tired. Нормально: really tired.',
      'Не говори quite much difficult. Нормально: quite difficult.',
      'Не ставь усилитель после слова: не useful very, а very useful.',
    ],
    uk: [
      'Very звучить нейтрально: very useful, very fast, very important.',
      'Really звучить живiше й розмовнiше: really useful, really tired, really interesting.',
      'Quite часто робить оцiнку мʼякшою: quite good, quite difficult, quite interesting.',
      'Very не дорiвнює too. Very hot - дуже гарячий. Too hot - занадто гарячий, є проблема.',
      'Не кажи very much useful. Нормально: very useful.',
      'Не кажи really much tired. Нормально: really tired.',
      'Не кажи quite much difficult. Нормально: quite difficult.',
      'Не став пiдсилювач пiсля слова: не useful very, а very useful.',
    ],
    es: [
      'Very suena neutral: very useful.',
      'Really suena mas conversacional: really tired.',
      'Quite suele suavizar: quite good.',
      'Very no es too: very hot frente a too hot.',
      'Di very useful, no very much useful.',
      'Di really tired, no really much tired.',
    ],
    'pt-BR': [
      'Very é neutro: very useful.',
      'Really é mais conversacional: really tired.',
      'Quite costuma ser mais suave: quite good.',
      'Very não é too: very hot vs too hot.',
      'Use very useful, não very much useful.',
      'Use really tired, não really much tired.',
    ],
    vi: [
      'Very trung tính: very useful.',
      'Really tự nhiên hơn trong hội thoại: really tired.',
      'Quite thường nhẹ hơn: quite good.',
      'Very không giống too: very hot và too hot.',
      'Dùng very useful, không dùng very much useful.',
      'Dùng really tired, không dùng really much tired.',
    ],
    id: [
      'Very bersifat netral: very useful.',
      'Really lebih percakapan: really tired.',
      'Quite sering lebih lembut: quite good.',
      'Very bukan too: very hot vs too hot.',
      'Gunakan very useful, bukan very much useful.',
      'Gunakan really tired, bukan really much tired.',
    ],
    tr: [
      'Very nötrdür: very useful.',
      'Really daha konuşma dilindedir: really tired.',
      'Quite çoğu zaman daha yumuşaktır: quite good.',
      'Very, too değildir: very hot vs too hot.',
      'Very useful kullan, very much useful değil.',
      'Really tired kullan, really much tired değil.',
    ],
    pl: [
      'Very jest neutralne: very useful.',
      'Really jest bardziej potoczne: really tired.',
      'Quite często brzmi łagodniej: quite good.',
      'Very to nie too: very hot vs too hot.',
      'Używaj very useful, nie very much useful.',
      'Używaj really tired, nie really much tired.',
    ],
  },
  examples: [
    {
      en: 'This lesson is very useful.',
      ru: 'Этот урок очень полезный.',
      uk: 'Цей урок дуже корисний.',
      es: 'Esta leccion es muy util.',
      'pt-BR': 'Esta lição é muito útil.',
      vi: 'Bài học này rất hữu ích.',
      id: 'Pelajaran ini sangat berguna.',
      tr: 'Bu ders çok faydalı.',
      pl: 'Ta lekcja jest bardzo przydatna.',
      why: tri('Very useful - нейтральное усиление.', 'Very useful - нейтральне пiдсилення.', 'Very useful es un refuerzo neutral.'),
    },
    {
      en: 'This lesson is really useful.',
      ru: 'Этот урок реально полезный.',
      uk: 'Цей урок реально корисний.',
      es: 'Esta leccion es realmente util.',
      'pt-BR': 'Esta lição é realmente útil.',
      vi: 'Bài học này thật sự hữu ích.',
      id: 'Pelajaran ini benar-benar berguna.',
      tr: 'Bu ders gerçekten faydalı.',
      pl: 'Ta lekcja jest naprawdę przydatna.',
      why: tri('Really useful звучит живее и разговорнее.', 'Really useful звучить живiше й розмовнiше.', 'Really useful suena mas conversacional.'),
    },
    {
      en: 'The lesson was quite good.',
      ru: 'Урок был довольно хорошим.',
      uk: 'Урок був доволi хорошим.',
      es: 'La leccion fue bastante buena.',
      'pt-BR': 'A lição foi bem boa.',
      vi: 'Bài học khá hay.',
      id: 'Pelajarannya cukup bagus.',
      tr: 'Ders oldukça iyiydi.',
      pl: 'Lekcja była całkiem dobra.',
      why: tri('Quite good - положительно, но без сильного восторга.', 'Quite good - позитивно, але без сильного захвату.', 'Quite good es positivo, pero mas suave.'),
    },
    {
      en: 'I am really tired.',
      ru: 'Я реально устал.',
      uk: 'Я реально втомився.',
      es: 'Estoy realmente cansado.',
      'pt-BR': 'Estou realmente cansado.',
      vi: 'Tôi thật sự mệt.',
      id: 'Saya benar-benar lelah.',
      tr: 'Gerçekten yorgunum.',
      pl: 'Jestem naprawdę zmęczony.',
      why: tri('Really tired звучит естественно в живой речи.', 'Really tired звучить природно в живiй мовi.', 'Really tired suena natural en conversacion.'),
    },
    {
      en: 'The test was quite difficult.',
      ru: 'Тест был довольно сложным.',
      uk: 'Тест був доволi складним.',
      es: 'El examen fue bastante dificil.',
      'pt-BR': 'O teste foi bem difícil.',
      vi: 'Bài kiểm tra khá khó.',
      id: 'Tesnya cukup sulit.',
      tr: 'Test oldukça zordu.',
      pl: 'Test był dość trudny.',
      why: tri('Quite difficult звучит мягче, чем really difficult.', 'Quite difficult звучить мʼякше, нiж really difficult.', 'Quite difficult suena mas suave que really difficult.'),
    },
    {
      en: 'The coffee is very hot, but I can drink it.',
      ru: 'Кофе очень горячий, но я могу его пить.',
      uk: 'Кава дуже гаряча, але я можу її пити.',
      es: 'El cafe esta muy caliente, pero puedo beberlo.',
      'pt-BR': 'O café está muito quente, mas consigo beber.',
      vi: 'Cà phê rất nóng, nhưng tôi vẫn uống được.',
      id: 'Kopinya sangat panas, tetapi saya bisa meminumnya.',
      tr: 'Kahve çok sıcak ama içebilirim.',
      pl: 'Kawa jest bardzo gorąca, ale mogę ją pić.',
      why: tri('Very hot - сильная оценка, но не обязательно проблема.', 'Very hot - сильна оцiнка, але не обовʼязково проблема.', 'Very hot es fuerte, pero no necesariamente un problema.'),
    },
    {
      en: 'The coffee is too hot to drink.',
      ru: 'Кофе слишком горячий, чтобы его пить.',
      uk: 'Кава занадто гаряча, щоб її пити.',
      es: 'El cafe esta demasiado caliente para beberlo.',
      'pt-BR': 'O café está quente demais para beber.',
      vi: 'Cà phê quá nóng để uống.',
      id: 'Kopinya terlalu panas untuk diminum.',
      tr: 'Kahve içilemeyecek kadar sıcak.',
      pl: 'Kawa jest zbyt gorąca, żeby ją pić.',
      why: tri('Too hot - уже проблема.', 'Too hot - уже проблема.', 'Too hot ya es un problema.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Здесь ломается не грамматика, а тон. Very, really, quite и too стоят рядом, но звучат по-разному.',
        'Тут ламається не граматика, а тон. Very, really, quite i too стоять поруч, але звучать по-рiзному.',
        'Aqui falla el tono, no solo la gramatica. Very, really, quite y too estan cerca, pero suenan distinto.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Запомни четыре пары: very useful, really tired, quite good, too hot.',
        'Запамʼятай чотири пари: very useful, really tired, quite good, too hot.',
        'Recuerda cuatro pares: very useful, really tired, quite good, too hot.',
      ),
    },
    {
      id: 'intro_tone_scale',
      type: 'contrast',
      text: tri(
        'Держи шкалу тона: very просто усиливает, really звучит эмоциональнее, quite делает мягче или осторожнее, too уже показывает проблему.',
        'Тримай шкалу тону: very просто підсилює, really звучить емоційніше, quite робить мʼякше або обережніше, too вже показує проблему.',
        'Escala de tono: very intensifica, really suena mas emocional, quite suaviza y too normalmente muestra un problema.',
      ),
    },
  ],
  steps: [
    makeStep({
      id: 'modifier_vrq_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'very_useful_basic',
      sentence: 'This tool is ___ useful.',
      translation: tri('Этот инструмент очень полезный.', 'Цей iнструмент дуже корисний.', 'This tool is very useful.'),
      options: ['very', 'very much', 'many', 'too many'],
      correctAnswer: 'very',
      correctFeedback: tri('Да. Очень полезный = very useful.', 'Так. Дуже корисний = very useful.', 'Yes. Very useful.'),
      wrong: {
        'very much': tri('Very much useful звучит лишним. Нужен короткий блок very useful.', 'Very much useful звучить зайвим. Потрiбен короткий блок very useful.', 'Use very useful.'),
        many: tri('Many не усиливает useful. Нужен блок very useful.', 'Many не пiдсилює useful. Потрiбен блок very useful.', 'Use very useful.'),
        'too many': tri('Too many не ставится перед useful. Нормально: very useful.', 'Too many не ставиться перед useful. Нормально: very useful.', 'Use very useful.'),
      },
      clue: tri('Просто "очень полезный" - very useful.', 'Просто "дуже корисний" - very useful.', 'Very useful.'),
      finalHint: tri('Фраза: This tool is very useful.', 'Фраза: This tool is very useful.', 'Sentence: This tool is very useful.'),
      focusWords: ['very useful', 'very'],
    }),
    makeStep({
      id: 'modifier_vrq_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'very_fast_basic',
      sentence: 'She speaks ___ fast.',
      translation: tri('Она говорит очень быстро.', 'Вона говорить дуже швидко.', 'She speaks very fast.'),
      options: ['very', 'very much', 'many', 'fast very'],
      correctAnswer: 'very',
      correctFeedback: tri('Да. Очень быстро = very fast.', 'Так. Дуже швидко = very fast.', 'Yes. Very fast.'),
      wrong: {
        'very much': tri('Very much fast не звучит нормально. Нужен блок very fast.', 'Very much fast не звучить нормально. Потрiбен блок very fast.', 'Use very fast.'),
        many: tri('Many не работает с fast. Нужен блок very fast.', 'Many не працює з fast. Потрiбен блок very fast.', 'Use very fast.'),
        'fast very': tri('Very стоит перед fast: very fast.', 'Very стоїть перед fast: very fast.', 'Use very fast.'),
      },
      clue: tri('Усилитель ставим перед fast.', 'Пiдсилювач ставимо перед fast.', 'Put very before fast.'),
      finalHint: tri('Фраза: She speaks very fast.', 'Фраза: She speaks very fast.', 'Sentence: She speaks very fast.'),
      focusWords: ['very fast', 'very'],
    }),
    makeStep({
      id: 'modifier_vrq_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'very_important_basic',
      sentence: 'This is ___ important.',
      translation: tri('Это очень важно.', 'Це дуже важливо.', 'This is very important.'),
      options: ['very', 'much', 'many', 'important very'],
      correctAnswer: 'very',
      correctFeedback: tri('Да. Очень важно = very important.', 'Так. Дуже важливо = very important.', 'Yes. Very important.'),
      wrong: {
        much: tri('Much important не звучит естественно. Нужен блок very important.', 'Much important не звучить природно. Потрiбен блок very important.', 'Use very important.'),
        many: tri('Many не подходит к important. Нужен блок very important.', 'Many не пасує до important. Потрiбен блок very important.', 'Use very important.'),
        'important very': tri('Very не ставят после important. Нормально: very important.', 'Very не ставлять пiсля important. Нормально: very important.', 'Use very important.'),
      },
      clue: tri('Очень важно = very important.', 'Дуже важливо = very important.', 'Very important.'),
      finalHint: tri('Фраза: This is very important.', 'Фраза: This is very important.', 'Sentence: This is very important.'),
      focusWords: ['very important'],
    }),
    makeStep({
      id: 'modifier_vrq_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'really_tired_conversation',
      sentence: 'I am ___ tired today.',
      translation: tri('Я сегодня реально устал.', 'Я сьогоднi реально втомився.', 'I am really tired today.'),
      options: ['really', 'really much', 'many', 'tired really'],
      correctAnswer: 'really',
      correctFeedback: tri('Да. Живой разговорный блок: really tired.', 'Так. Живий розмовний блок: really tired.', 'Yes. Really tired.'),
      wrong: {
        'really much': tri('Really much tired звучит перегруженно. Нужен короткий блок really tired.', 'Really much tired звучить перевантажено. Потрiбен короткий блок really tired.', 'Use really tired.'),
        many: tri('Many не усиливает tired. Нужен блок really tired.', 'Many не пiдсилює tired. Потрiбен блок really tired.', 'Use really tired.'),
        'tired really': tri('Really стоит перед tired: really tired.', 'Really стоїть перед tired: really tired.', 'Use really tired.'),
      },
      clue: tri('Реально устал = really tired.', 'Реально втомився = really tired.', 'Really tired.'),
      finalHint: tri('Фраза: I am really tired today.', 'Фраза: I am really tired today.', 'Sentence: I am really tired today.'),
      focusWords: ['really tired', 'really'],
    }),
    makeStep({
      id: 'modifier_vrq_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'really_interesting_conversation',
      sentence: 'The idea is ___ interesting.',
      translation: tri('Идея реально интересная.', 'Iдея реально цiкава.', 'The idea is really interesting.'),
      options: ['really', 'really much', 'many', 'interesting really'],
      correctAnswer: 'really',
      correctFeedback: tri('Да. Really interesting звучит живее, чем сухое very interesting.', 'Так. Really interesting звучить живiше, нiж сухе very interesting.', 'Yes. Really interesting.'),
      wrong: {
        'really much': tri('Лишнее слово после really перегружает фразу. Нужен короткий разговорный усилитель перед качеством.', 'Зайве слово пiсля really перевантажує фразу. Потрiбен короткий розмовний пiдсилювач перед якiстю.', 'Use really interesting.'),
        many: tri('Many не подходит к interesting. Нужен блок really interesting.', 'Many не пасує до interesting. Потрiбен блок really interesting.', 'Use really interesting.'),
        'interesting really': tri('Порядок обратный: сначала усилитель, потом качество. После слова его не ставим.', 'Порядок зворотний: спочатку пiдсилювач, потiм якiсть. Пiсля слова його не ставимо.', 'Use really interesting.'),
      },
      clue: tri('Если хочешь живее, бери really interesting.', 'Якщо хочеш живiше, бери really interesting.', 'Really interesting.'),
      finalHint: tri('Фраза: The idea is really interesting.', 'Фраза: The idea is really interesting.', 'Sentence: The idea is really interesting.'),
      focusWords: ['really interesting'],
    }),
    makeStep({
      id: 'modifier_vrq_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'really_good_conversation',
      sentence: 'Your answer is ___ good.',
      translation: tri('Твой ответ реально хороший.', 'Твоя вiдповiдь реально хороша.', 'Your answer is really good.'),
      options: ['really', 'really much', 'many', 'good really'],
      correctAnswer: 'really',
      correctFeedback: tri('Да. Really good - живой сильный вариант.', 'Так. Really good - живий сильний варiант.', 'Yes. Really good.'),
      wrong: {
        'really much': tri('Really much good не звучит естественно. Нормально: really good.', 'Really much good не звучить природно. Нормально: really good.', 'Use really good.'),
        many: tri('Many не подходит к good. Нужен блок really good.', 'Many не пасує до good. Потрiбен блок really good.', 'Use really good.'),
        'good really': tri('Really стоит перед good: really good.', 'Really стоїть перед good: really good.', 'Use really good.'),
      },
      clue: tri('Реально хороший = really good.', 'Реально хороший = really good.', 'Really good.'),
      finalHint: tri('Фраза: Your answer is really good.', 'Фраза: Your answer is really good.', 'Sentence: Your answer is really good.'),
      focusWords: ['really good'],
    }),
    makeStep({
      id: 'modifier_vrq_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'quite_good_moderate',
      sentence: 'The lesson was ___ good.',
      translation: tri('Урок был довольно хорошим.', 'Урок був доволi хорошим.', 'The lesson was quite good.'),
      options: ['quite', 'too', 'many', 'good quite'],
      correctAnswer: 'quite',
      correctFeedback: tri('Да. Довольно хороший, без сильного восторга = quite good.', 'Так. Доволi хороший, без сильного захвату = quite good.', 'Yes. Quite good.'),
      wrong: {
        too: tri('Too good не передает здесь "довольно хороший". Нужен мягкий блок quite good.', 'Too good не передає тут "доволi хороший". Потрiбен мʼякий блок quite good.', 'Use quite good.'),
        many: tri('Many не подходит к good. Нужен блок quite good.', 'Many не пасує до good. Потрiбен блок quite good.', 'Use quite good.'),
        'good quite': tri('Quite стоит перед good: quite good.', 'Quite стоїть перед good: quite good.', 'Use quite good.'),
      },
      clue: tri('Довольно хороший = quite good.', 'Доволi хороший = quite good.', 'Quite good.'),
      finalHint: tri('Фраза: The lesson was quite good.', 'Фраза: The lesson was quite good.', 'Sentence: The lesson was quite good.'),
      focusWords: ['quite good', 'quite'],
    }),
    makeStep({
      id: 'modifier_vrq_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'quite_difficult_moderate',
      sentence: 'The test was ___ difficult.',
      translation: tri('Тест был довольно сложным.', 'Тест був доволi складним.', 'The test was quite difficult.'),
      options: ['quite', 'too', 'many', 'difficult quite'],
      correctAnswer: 'quite',
      correctFeedback: tri('Да. Довольно сложный = quite difficult.', 'Так. Доволi складний = quite difficult.', 'Yes. Quite difficult.'),
      wrong: {
        too: tri('Too difficult значит "слишком сложный", уже проблема. Здесь мягче: quite difficult.', 'Too difficult означає "занадто складний", уже проблема. Тут мʼякше: quite difficult.', 'Use quite difficult.'),
        many: tri('Many не подходит к difficult. Нужен блок quite difficult.', 'Many не пасує до difficult. Потрiбен блок quite difficult.', 'Use quite difficult.'),
        'difficult quite': tri('Порядок обратный: мягкий усилитель ставим перед качеством, а не после него.', 'Порядок зворотний: мʼякий пiдсилювач ставимо перед якiстю, а не пiсля неї.', 'Use quite difficult.'),
      },
      clue: tri('Довольно сложный = quite difficult.', 'Доволi складний = quite difficult.', 'Quite difficult.'),
      finalHint: tri('Фраза: The test was quite difficult.', 'Фраза: The test was quite difficult.', 'Sentence: The test was quite difficult.'),
      focusWords: ['quite difficult'],
    }),
    makeStep({
      id: 'modifier_vrq_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'quite_interesting_moderate',
      sentence: 'The article was ___ interesting.',
      translation: tri('Статья была довольно интересной.', 'Стаття була доволi цiкавою.', 'The article was quite interesting.'),
      options: ['quite', 'too', 'many', 'interesting quite'],
      correctAnswer: 'quite',
      correctFeedback: tri('Да. Довольно интересная = quite interesting.', 'Так. Доволi цiкава = quite interesting.', 'Yes. Quite interesting.'),
      wrong: {
        too: tri('Too interesting звучит как перебор. Здесь нужна мягкая оценка: quite interesting.', 'Too interesting звучить як перебiр. Тут потрiбна мʼяка оцiнка: quite interesting.', 'Use quite interesting.'),
        many: tri('Many не подходит к interesting. Нужен блок quite interesting.', 'Many не пасує до interesting. Потрiбен блок quite interesting.', 'Use quite interesting.'),
        'interesting quite': tri('Порядок обратный: сначала мягкий усилитель, потом качество. После слова он звучит сломанно.', 'Порядок зворотний: спочатку мʼякий пiдсилювач, потiм якiсть. Пiсля слова вiн звучить зламано.', 'Use quite interesting.'),
      },
      clue: tri('Довольно интересная = quite interesting.', 'Доволi цiкава = quite interesting.', 'Quite interesting.'),
      finalHint: tri('Фраза: The article was quite interesting.', 'Фраза: The article was quite interesting.', 'Sentence: The article was quite interesting.'),
      focusWords: ['quite interesting'],
    }),
    makeStep({
      id: 'modifier_vrq_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'very_vs_too_hot',
      sentence: 'The soup is ___ hot, but I can eat it.',
      translation: tri('Суп очень горячий, но я могу его есть.', 'Суп дуже гарячий, але я можу його їсти.', 'The soup is very hot, but I can eat it.'),
      options: ['very', 'too', 'many', 'very much'],
      correctAnswer: 'very',
      correctFeedback: tri('Да. Если можно есть, это very hot, а не too hot.', 'Так. Якщо можна їсти, це very hot, а не too hot.', 'Yes. Very hot.'),
      wrong: {
        too: tri('Too hot обычно значит, что уже есть проблема. Здесь суп горячий, но его можно есть: very hot.', 'Too hot зазвичай означає, що вже є проблема. Тут суп гарячий, але його можна їсти: very hot.', 'Use very hot.'),
        many: tri('Many не подходит к hot. Нужен блок very hot.', 'Many не пасує до hot. Потрiбен блок very hot.', 'Use very hot.'),
        'very much': tri('Very much hot не нужно. Нормально: very hot.', 'Very much hot не потрiбно. Нормально: very hot.', 'Use very hot.'),
      },
      clue: tri('Горячий, но терпимо = very hot.', 'Гарячий, але терпимо = very hot.', 'Very hot.'),
      finalHint: tri('Фраза: The soup is very hot, but I can eat it.', 'Фраза: The soup is very hot, but I can eat it.', 'Sentence: The soup is very hot, but I can eat it.'),
      focusWords: ['very hot', 'too hot'],
    }),
    makeStep({
      id: 'modifier_vrq_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'too_hot_problem',
      sentence: 'The soup is ___ hot to eat.',
      translation: tri('Суп слишком горячий, чтобы его есть.', 'Суп занадто гарячий, щоб його їсти.', 'The soup is too hot to eat.'),
      options: ['too', 'very', 'many', 'too much'],
      correctAnswer: 'too',
      correctFeedback: tri('Да. Слишком горячий, чтобы есть = too hot to eat.', 'Так. Занадто гарячий, щоб їсти = too hot to eat.', 'Yes. Too hot to eat.'),
      wrong: {
        very: tri('Very hot не показывает невозможность. Здесь есть проблема: too hot to eat.', 'Very hot не показує неможливiсть. Тут є проблема: too hot to eat.', 'Use too hot to eat.'),
        many: tri('Many не подходит к hot. Нужен блок too hot.', 'Many не пасує до hot. Потрiбен блок too hot.', 'Use too hot.'),
        'too much': tri('Too much hot не звучит нормально. Нужен короткий блок too hot.', 'Too much hot не звучить нормально. Потрiбен короткий блок too hot.', 'Use too hot.'),
      },
      clue: tri('Слишком горячий, чтобы есть = too hot to eat.', 'Занадто гарячий, щоб їсти = too hot to eat.', 'Too hot to eat.'),
      finalHint: tri('Фраза: The soup is too hot to eat.', 'Фраза: The soup is too hot to eat.', 'Sentence: The soup is too hot to eat.'),
      focusWords: ['too hot', 'too hot to'],
    }),
    makeStep({
      id: 'modifier_vrq_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'quite_vs_really_tone',
      sentence: 'The film was ___ good, but not amazing.',
      translation: tri('Фильм был довольно хорошим, но не потрясающим.', 'Фiльм був доволi хорошим, але не вражаючим.', 'The film was quite good, but not amazing.'),
      options: ['quite', 'really', 'too', 'good very'],
      correctAnswer: 'quite',
      correctFeedback: tri('Да. Положительно, но не восторг = quite good.', 'Так. Позитивно, але не захват = quite good.', 'Yes. Quite good.'),
      wrong: {
        really: tri('Really good звучит сильнее. Здесь фраза мягче: quite good.', 'Really good звучить сильнiше. Тут фраза мʼякша: quite good.', 'Use quite good.'),
        too: tri('Too good не значит "довольно хороший" в этой фразе. Нужен блок quite good.', 'Too good не означає "доволi хороший" у цiй фразi. Потрiбен блок quite good.', 'Use quite good.'),
        'good very': tri('Very не ставится после good. По смыслу здесь quite good.', 'Very не ставиться пiсля good. За змiстом тут quite good.', 'Use quite good.'),
      },
      clue: tri('Хорошо, но не потрясающе = quite good.', 'Добре, але не вражаюче = quite good.', 'Quite good.'),
      finalHint: tri('Фраза: The film was quite good, but not amazing.', 'Фраза: The film was quite good, but not amazing.', 'Sentence: The film was quite good, but not amazing.'),
      focusWords: ['quite good', 'really good'],
    }),
    makeStep({
      id: 'modifier_vrq_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_very_really_quite',
      sentence: 'Choose the best pair.',
      translation: tri('Очень полезно / реально устал / довольно сложно', 'Дуже корисно / реально втомився / доволi складно', 'Very useful / really tired / quite difficult'),
      options: [
        'very useful / really tired / quite difficult',
        'useful very / tired really / difficult quite',
        'many useful / much tired / many difficult',
        'very useful / really much tired / quite much difficult',
      ],
      correctAnswer: 'very useful / really tired / quite difficult',
      correctFeedback: tri('Да. Здесь все три усилителя стоят перед качеством и дают нужный оттенок.', 'Так. Тут усi три пiдсилювачi стоять перед якiстю i дають потрiбний вiдтiнок.', 'Yes. Natural chunks.'),
      wrong: {
        'useful very / tired really / difficult quite': tri('Усилитель стоит после слова. Нормально: very useful / really tired / quite difficult.', 'Пiдсилювач стоїть пiсля слова. Нормально: very useful / really tired / quite difficult.', 'Use very useful / really tired / quite difficult.'),
        'many useful / much tired / many difficult': tri('Здесь не считаем предметы и не говорим о количестве. Нужны короткие усилители качества.', 'Тут не рахуємо предмети i не говоримо про кiлькiсть. Потрiбнi короткi пiдсилювачi якостi.', 'Use very useful / really tired / quite difficult.'),
        'very useful / really much tired / quite much difficult': tri('После разговорного или мягкого усилителя не добавляем лишнее much. Фраза должна быть короче.', 'Пiсля розмовного або мʼякого пiдсилювача не додаємо зайве much. Фраза має бути коротшою.', 'Use really tired / quite difficult.'),
      },
      clue: tri('Три живых куска: нейтрально, разговорно, мягко. Во всех трех усилитель идет перед качеством.', 'Три живi шматки: нейтрально, розмовно, мʼяко. В усiх трьох пiдсилювач iде перед якiстю.', 'Three chunks.'),
      finalHint: tri('Ответ: very useful / really tired / quite difficult.', 'Вiдповiдь: very useful / really tired / quite difficult.', 'Answer: very useful / really tired / quite difficult.'),
      focusWords: ['very useful', 'really tired', 'quite difficult'],
    }),
    makeStep({
      id: 'modifier_vrq_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_very_too',
      sentence: 'Choose the correct pair.',
      translation: tri('Очень горячий, но можно пить / слишком горячий, нельзя пить', 'Дуже гарячий, але можна пити / занадто гарячий, не можна пити', 'Very hot but drinkable / too hot to drink'),
      options: [
        'very hot, but I can drink it / too hot to drink',
        'too hot, but I can drink it / very hot to drink',
        'hot very, but I can drink it / hot too to drink',
        'many hot, but I can drink it / too much hot to drink',
      ],
      correctAnswer: 'very hot, but I can drink it / too hot to drink',
      correctFeedback: tri('Да. Very hot - просто сильно. Too hot - уже проблема.', 'Так. Very hot - просто сильно. Too hot - уже проблема.', 'Yes. Very hot is strong; too hot is a problem.'),
      wrong: {
        'too hot, but I can drink it / very hot to drink': tri('Если можно пить, лучше very hot. Если нельзя пить, нужен блок too hot to drink.', 'Якщо можна пити, краще very hot. Якщо не можна пити, потрiбен блок too hot to drink.', 'Use very hot / too hot to drink.'),
        'hot very, but I can drink it / hot too to drink': tri('Very и too стоят перед hot: very hot, too hot.', 'Very i too стоять перед hot: very hot, too hot.', 'Use very hot / too hot.'),
        'many hot, but I can drink it / too much hot to drink': tri('Many hot и too much hot не звучат нормально. Нужны very hot / too hot.', 'Many hot i too much hot не звучать нормально. Потрiбнi very hot / too hot.', 'Use very hot / too hot.'),
      },
      clue: tri('Терпимо = very hot. Нельзя пить = too hot to drink.', 'Терпимо = very hot. Не можна пити = too hot to drink.', 'Very hot vs too hot.'),
      finalHint: tri('Ответ: very hot, but I can drink it / too hot to drink.', 'Вiдповiдь: very hot, but I can drink it / too hot to drink.', 'Answer: very hot, but I can drink it / too hot to drink.'),
      focusWords: ['very hot', 'too hot'],
    }),
    makeStep({
      id: 'modifier_vrq_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Выбери естественное предложение.', 'Обери природне речення.', 'Choose the natural sentence.'),
      options: [
        'The course is really useful, but the last test was quite difficult.',
        'The course is useful really, but the last test was difficult quite.',
        'The course is many useful, but the last test was much difficult.',
        'The course is really much useful, but the last test was quite much difficult.',
      ],
      correctAnswer: 'The course is really useful, but the last test was quite difficult.',
      correctFeedback: tri('Да. Сначала идет усилитель, потом качество: так фраза звучит естественно.', 'Так. Спочатку йде пiдсилювач, потiм якiсть: так фраза звучить природно.', 'Yes. Really useful / quite difficult.'),
      wrong: {
        'The course is useful really, but the last test was difficult quite.': tri('Really и quite стоят не там. Нормально: really useful / quite difficult.', 'Really i quite стоять не там. Нормально: really useful / quite difficult.', 'Use really useful / quite difficult.'),
        'The course is many useful, but the last test was much difficult.': tri('Many useful и much difficult не звучат нормально. Нужны really useful / quite difficult.', 'Many useful i much difficult не звучать нормально. Потрiбнi really useful / quite difficult.', 'Use really useful / quite difficult.'),
        'The course is really much useful, but the last test was quite much difficult.': tri('Здесь лишнее much после усилителей. Оставляем короткий разговорный и мягкий вариант: really useful / quite difficult.', 'Тут зайве much пiсля пiдсилювачiв. Залишаємо короткий розмовний i мʼякий варiант.', 'Use really useful / quite difficult.'),
      },
      clue: tri('Курс реально полезный, тест довольно сложный: really useful / quite difficult.', 'Курс реально корисний, тест доволi складний: really useful / quite difficult.', 'Really useful / quite difficult.'),
      finalHint: tri('Фраза: The course is really useful, but the last test was quite difficult.', 'Фраза: The course is really useful, but the last test was quite difficult.', 'Sentence: The course is really useful, but the last test was quite difficult.'),
      focusWords: ['really useful', 'quite difficult'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'very_much_useful_error',
      'really_much_tired_error',
      'quite_much_difficult_error',
      'too_instead_of_very_error',
      'intensifier_after_word_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri(
      'Сначала показываем разницу в оттенке: very, really, quite или too.',
      'Спочатку показуємо рiзницю у вiдтiнку: very, really, quite або too.',
      'Primero mira la diferencia de tono.',
    ),
    depth2: tri(
      'Если ошибка повторяется, даем готовые пары: very useful, really tired, quite good, too hot.',
      'Якщо помилка повторюється, даємо готовi пари: very useful, really tired, quite good, too hot.',
      'Luego usa bloques ya preparados.',
    ),
    depth3: tri(
      'Еще проще: very = просто очень, really = живее, quite = мягче, too = проблема.',
      'Ще простiше: very = просто дуже, really = живiше, quite = мʼякше, too = проблема.',
      'Mas simple: neutral, conversacional, mas suave, problema.',
    ),
    depth4: tri(
      'Почти подсказка: прямо возвращаем к нужному блоку.',
      'Майже пiдказка: прямо повертаємо до потрiбного блоку.',
      'Casi respuesta: vuelve al bloque necesario.',
    ),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись на секунду. Very useful. Really tired. Quite good. Too hot. Это четыре разных настроения фразы.',
        'Зупинись на секунду. Very useful. Really tired. Quite good. Too hot. Це чотири рiзнi настрої фрази.',
        'Pausa: very useful, really tired, quite good, too hot. Son cuatro tonos distintos.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_tone_hint_then_retry',
      card: tri(
        'Система покажет, нужен ли нейтральный, живой, мягкий или проблемный оттенок, а потом вернет к полной фразе.',
        'Система покаже, потрiбен нейтральний, живий, мʼякий чи проблемний вiдтiнок, а потiм поверне до повної фрази.',
        'La pista mostrara si necesitas tono neutral, vivo, suave o problematico, y luego volveras a la frase.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбираем смысл, потом возвращаемся к фразе.',
        'Режим пiдказки: спочатку обираємо сенс, потiм повертаємося до фрази.',
        'Modo guiado: primero eliges el sentido y despues vuelves a la frase.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_modifier_vrq_001',
        prompt: tri('Very обычно значит нейтральное усиление или проблему?', 'Very зазвичай означає нейтральне підсилення чи проблему?', 'Very normalmente significa refuerzo neutral o problema?'),
        options: ['neutral strength', 'a problem'],
        correctIndex: 0,
        thenReturnToExerciseId: 'modifier_vrq_easy_001',
      },
      {
        id: 'guided_modifier_vrq_002',
        prompt: tri('Фраза с really здесь звучит более книжно или более разговорно?', 'Фраза з really тут звучить бiльш книжно чи бiльш розмовно?', 'Really tired suena mas escrito o mas conversacional?'),
        options: ['more written', 'more conversational'],
        correctIndex: 1,
        thenReturnToExerciseId: 'modifier_vrq_contrast_001',
      },
      {
        id: 'guided_modifier_vrq_003',
        prompt: tri('Quite good обычно мягче или сильнее, чем really good?', 'Quite good зазвичай мʼякше чи сильнiше, нiж really good?', 'Quite good normalmente es mas suave o mas fuerte que really good?'),
        options: ['softer', 'stronger'],
        correctIndex: 0,
        thenReturnToExerciseId: 'modifier_vrq_contrast_004',
      },
      {
        id: 'guided_modifier_vrq_004',
        prompt: tri('Too hot обычно значит сильно, но нормально, или уже проблема?', 'Too hot зазвичай означає сильно, але нормально, чи вже проблема?', 'Too hot normalmente significa fuerte pero tolerable, o ya un problema?'),
        options: ['strong but okay', 'already a problem'],
        correctIndex: 1,
        thenReturnToExerciseId: 'modifier_vrq_mixed_001',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'modifier',
    microDiagnosisId: 'modifier_very_really_quite',
    diagnosisLabel: tri('Very / Really / Quite', 'Very / Really / Quite', 'Very / Really / Quite'),
    contrastSet: CONTRAST,
    difficultyLevel: 2,
    focusWords: ['very useful', 'really tired', 'quite good', 'quite difficult', 'very hot', 'too hot'],
    focusPatterns: [
      'very_useful_neutral',
      'really_tired_conversation',
      'quite_good_soft',
      'quite_difficult_soft',
      'very_vs_too_hot',
      'wrong_really_much',
      'wrong_quite_much',
      'position_before_word',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyEscalation: {
      start: 'easy',
      afterCorrectInRow: 2,
      next: 'contrast',
      afterCorrectInRowAtContrast: 3,
      final: 'mixed_review',
    },
  },
  analyticsEvents: {
    start: 'diagnosis_training_modifier_very_really_quite_start',
    answer: 'diagnosis_training_modifier_very_really_quite_answer',
    mastery: 'diagnosis_training_modifier_very_really_quite_mastery',
    recovery: 'diagnosis_training_modifier_very_really_quite_recovery',
    smartTrainerUnlocked: 'diagnosis_training_modifier_very_really_quite_smart_trainer_unlocked',
    payload: {
      category: 'modifier',
      microDiagnosisId: 'modifier_very_really_quite',
      contrastSet: CONTRAST,
      priority: 35,
    },
  },
  routing: {
    appScreen: 'ProblemCoach',
    webPath: '/problem-coach/modifier/very-really-quite',
    deepLink: 'phraseman://problem-coach/modifier/very-really-quite',
    diagnosisTrainerRoute: '/problem_coach?category=modifier&microDiagnosisId=modifier_very_really_quite',
    smartTrainerRoute: '/smart_trainer?source=diagnosis_training&microDiagnosisId=modifier_very_really_quite',
  },
  qualityChecklist: {
    hasContrastiveMinimalPairs: true,
    hasDistractorSpecificFeedback: true,
    hasNegativeTransferWarning: true,
    hasMicroDiagnosis: true,
    hasAdaptiveFeedback: true,
    hasSmartTrainerUnlock: true,
  },
};
