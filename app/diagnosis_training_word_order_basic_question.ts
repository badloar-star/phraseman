import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const QUESTION_ORDER_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre ordem básica em perguntas ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về trật tự từ trong câu hỏi này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan urutan kata dasar dalam pertanyaan ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu temel soru kelime sırası açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie podstawowego szyku słów w pytaniu nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? QUESTION_ORDER_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'do questions',
  'does questions',
  'did questions',
  'be questions',
  'modal questions',
  'question words',
  'subject-auxiliary inversion',
];

const SMART_CONTRAST = ['do questions', 'does questions', 'did questions', 'be questions', 'modal questions', 'question words'];

const option = (text: string) => ({ id: text, text });

const QUESTION_ORDER_SKILL_ES: Record<string, string> = {
  do_you_work: 'Una accion normal con you suele empezar con Do.',
  do_they_live: 'Con they y una accion normal, usa Do.',
  statement_vs_question_order: 'No basta la entonacion: la pregunta necesita Do delante.',
  does_she_work_base: 'Con she, usa Does y deja el verbo en forma base.',
  does_no_s: 'Does ya lleva la marca de tercera persona; no agregues -s al verbo.',
  did_base_verb: 'Did lleva el pasado; el verbo vuelve a la forma base.',
  where_do_you_live: 'Where va primero, pero dentro de la pregunta aun necesitas do.',
  where_are_you: 'Con are, no agregues do; are se mueve delante de you.',
  can_question: 'Can se mueve delante por si solo; no agregues do.',
  did_yesterday: 'Yesterday apunta al pasado: usa Did + verbo base.',
  is_at_home: 'At home describe estado/lugar, asi que usa Is.',
  will_future: 'Tomorrow apunta al futuro: Will va delante.',
  what_did_buy: 'What va primero; did lleva el pasado y buy queda base.',
  what_can_do: 'Con can, el orden es What can you do?',
  why_did_leave: 'Why va primero; did lleva el pasado y leave queda base.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = QUESTION_ORDER_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? QUESTION_ORDER_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function questionEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = QUESTION_ORDER_SKILL_ES[input.targetSkill] ?? 'Primero decide si la pregunta usa do/does/did, be o can/will/should.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

const DEFAULT_RETRY: [TriText, TriText, TriText, TriText] = [
  tri(
    'Сначала посмотри, что делает фраза: действие, состояние или возможность. От этого зависит первое слово вопроса.',
    'Спочатку подивись, що робить фраза: дія, стан чи можливість. Від цього залежить перше слово питання.',
    'Primero mira que expresa la frase: accion, estado o posibilidad. Eso decide la primera palabra.',
  ),
  tri(
    'Если это обычное действие, чаще всего нужен do, does или did.',
    'Якщо це звичайна дія, найчастіше потрібне do, does або did.',
    'Para una accion normal, normalmente necesitas do, does o did.',
  ),
  tri(
    'Если во фразе уже есть am/is/are или can/will/should, это слово само выходит вперед.',
    'Якщо у фразі вже є am/is/are або can/will/should, це слово саме виходить уперед.',
    'Si la frase ya tiene am/is/are o can/will/should, esa palabra se mueve delante.',
  ),
  tri(
    'Почти подсказка: держи готовые модели Do you work? Are you ready? Can you help?',
    'Майже підказка: тримай готові моделі Do you work? Are you ready? Can you help?',
    'Casi una pista: guarda los modelos Do you work? Are you ready? Can you help?',
  ),
];

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь нужен другой порядок слов. Нормальный вопрос: ${correct}`,
    `Тут потрібен інший порядок слів. Нормальне питання: ${correct}`,
    `Usa otro orden de pregunta: ${correct}`,
  );
}

function step(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  options: string[];
  correctAnswer: string;
  correctFeedback: TriText;
  wrong?: Record<string, TriText>;
  retryFeedback?: [TriText, TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  const esFeedback = questionEsFeedback({
    targetSkill: input.targetSkill,
    correctAnswer: input.correctAnswer,
    focusWords: input.focusWords,
  });

  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: withEs(input.translation, esFeedback),
    explanationBlock: tri(
      'В английском вопросе часто нельзя просто сказать утверждение с вопросительной интонацией. Нужно вынести вперед do, does, did, am, is, are, can или will.',
      'В англійському питанні часто не можна просто сказати твердження з питальною інтонацією. Потрібно винести вперед do, does, did, am, is, are, can або will.',
      esFeedback,
    ),
    microTask: tri(
      'Выбери вариант, который звучит как нормальный английский вопрос.',
      'Обери варіант, який звучить як нормальне англійське питання.',
      'Elige la opcion que suena como una pregunta normal en ingles.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map(option),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((item) => item === input.correctAnswer),
    correctFeedback: withEs(input.correctFeedback, esFeedback),
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((item) => item !== input.correctAnswer)
        .map((item) => [item, withEs(input.wrong?.[item] ?? defaultWrong(input.correctAnswer), esFeedback)]),
    ),
    retryFeedback: (input.retryFeedback ?? DEFAULT_RETRY).map((item) => withEs(item, esFeedback)) as [TriText, TriText, TriText, TriText],
    fallbackExplanation: tri(
      'Быстрая проверка: обычное действие получает do/does/did. Например: Do you speak English? Does he like coffee? What did you buy? Слова am/is/are и can/will/should выходят вперед сами: Where are you? What can you do? Вопросительное слово ставим в самое начало.',
      'Швидка перевірка: звичайна дія отримує do/does/did. Слова am/is/are і can/will/should виходять уперед самі. Питальне слово ставимо на самий початок.',
      esFeedback,
    ),
    focusWords: input.focusWords,
  };
}

export const WORD_ORDER_BASIC_QUESTION_TRAINING: DiagnosisTraining = {
  id: 'word_order_basic_question',
  category: 'syntax',
  version: '1.0.0',
  status: 'active',
  priority: 32,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Вопросы: Do you work? / Are you ready?', 'Питання: Do you work? / Are you ready?', 'Preguntas: Do you work? / Are you ready?', {
    'pt-BR': 'Perguntas: Do you work? / Are you ready?',
    vi: 'Câu hỏi: Do you work? / Are you ready?',
    id: 'Pertanyaan: Do you work? / Are you ready?',
    tr: 'Sorular: Do you work? / Are you ready?',
    pl: 'Pytania: Do you work? / Are you ready?',
  }),
  shortTitle: tri('Порядок в вопросах', 'Порядок у питаннях', 'Orden en preguntas', {
    'pt-BR': 'Ordem em perguntas',
    vi: 'Trật tự từ trong câu hỏi',
    id: 'Urutan kata dalam pertanyaan',
    tr: 'Sorularda kelime sırası',
    pl: 'Szyk słów w pytaniach',
  }),
  shortDiagnosis: tri(
    'Ты строишь английский вопрос как русское утверждение с интонацией.',
    'Ти будуєш англійське питання як українське твердження з інтонацією.',
    'Construyes preguntas en ingles como afirmaciones con entonacion.',
    {
      'pt-BR': 'Você monta a pergunta em inglês como uma afirmação com entonação de pergunta.',
      vi: 'Bạn tạo câu hỏi tiếng Anh như một câu khẳng định rồi thêm ngữ điệu hỏi.',
      id: 'Kamu membangun pertanyaan bahasa Inggris seperti pernyataan dengan intonasi tanya.',
      tr: 'İngilizce soruyu soru tonlamalı bir olumlu cümle gibi kuruyorsun.',
      pl: 'Budujesz angielskie pytanie jak zdanie twierdzące z pytającą intonacją.',
    },
  ),
  diagnosisText: tri(
    'Ты часто оставляешь слова в порядке утверждения: You work here? По смыслу тебя могут понять, но фраза звучит слабее и иногда ломается полностью. В базовом английском вопрос обычно получает отдельное слово впереди: Do you work here? Are you ready? Can you help?',
    'Ти часто залишаєш слова в порядку твердження: You work here? За змістом тебе можуть зрозуміти, але фраза звучить слабше й іноді ламається повністю. У базовій англійській питання зазвичай отримує окреме слово попереду: Do you work here? Are you ready? Can you help?',
    'A menudo dejas las palabras en orden de afirmacion: You work here? Por sentido pueden entenderte, pero suena mas debil y a veces se rompe. En ingles basico la pregunta suele llevar una palabra delante: Do you work here? Are you ready? Can you help?',
    {
      'pt-BR': 'Você muitas vezes deixa as palavras na ordem de uma afirmação: You work here? Pelo sentido, talvez entendam você, mas a frase soa mais fraca e às vezes quebra totalmente. No inglês básico, a pergunta geralmente leva uma palavra antes: Do you work here? Are you ready? Can you help?',
      vi: 'Bạn thường giữ các từ theo trật tự câu khẳng định: You work here? Về nghĩa có thể người khác vẫn hiểu, nhưng câu nghe yếu hơn và đôi khi sai hẳn. Trong tiếng Anh cơ bản, câu hỏi thường cần một từ đứng trước: Do you work here? Are you ready? Can you help?',
      id: 'Kamu sering membiarkan kata-kata dalam urutan pernyataan: You work here? Dari makna mungkin masih dipahami, tetapi terdengar lebih lemah dan kadang benar-benar rusak. Dalam bahasa Inggris dasar, pertanyaan biasanya memakai kata bantu di depan: Do you work here? Are you ready? Can you help?',
      tr: 'Kelimeleri sık sık olumlu cümle sırasıyla bırakıyorsun: You work here? Anlamdan anlaşılabilir, ama cümle daha zayıf duyulur ve bazen tamamen bozulur. Temel İngilizcede soru genellikle öne ayrı bir kelime alır: Do you work here? Are you ready? Can you help?',
      pl: 'Często zostawiasz słowa w szyku zdania twierdzącego: You work here? Z sensu może da się cię zrozumieć, ale zdanie brzmi słabiej i czasem całkiem się psuje. W podstawowym angielskim pytanie zwykle dostaje osobne słowo z przodu: Do you work here? Are you ready? Can you help?',
    },
  ),
  mentalModel: tri(
    'Думай не “как поднять интонацию?”, а “какое слово ставит вопрос на рельсы?”. Для обычного действия это do, does или did. Для ready, at home, late работают am/is/are. Для can, will, should ничего добавлять не надо: они сами становятся первыми.',
    'Думай не “як підняти інтонацію?”, а “яке слово ставить питання на рейки?”. Для звичайної дії це do, does або did. Для ready, at home, late працюють am/is/are. Для can, will, should нічого додавати не треба: вони самі стають першими.',
    'No pienses "como subo la entonacion?", sino "que palabra pone la pregunta en marcha?". Para una accion normal es do, does o did. Para ready, at home, late funcionan am/is/are. Con can, will, should no agregas nada: ellos mismos van primero.',
    {
      'pt-BR': 'Não pense “como eu subo a entonação?”, mas “qual palavra coloca a pergunta nos trilhos?”. Para uma ação normal, é do, does ou did. Para ready, at home, late, funcionam am/is/are. Com can, will, should, não acrescente nada: eles mesmos vão para a frente.',
      vi: 'Đừng nghĩ “làm sao lên giọng?”, hãy nghĩ “từ nào đặt câu hỏi vào đúng khung?”. Với hành động bình thường, đó là do, does hoặc did. Với ready, at home, late, dùng am/is/are. Với can, will, should, không thêm gì cả: chúng tự đứng lên đầu.',
      id: 'Jangan berpikir “bagaimana menaikkan intonasi?”, tetapi “kata apa yang membuat ini menjadi pertanyaan?”. Untuk aksi biasa, gunakan do, does, atau did. Untuk ready, at home, late, gunakan am/is/are. Dengan can, will, should, jangan tambahkan apa pun: kata itu sendiri maju ke depan.',
      tr: '“Tonlamayı nasıl yükseltirim?” diye değil, “soruyu hangi kelime rayına oturtur?” diye düşün. Normal eylem için bu do, does veya did olur. Ready, at home, late için am/is/are çalışır. Can, will, should ile hiçbir şey ekleme: onlar kendileri başa gelir.',
      pl: 'Nie myśl „jak podnieść intonację?”, tylko „jakie słowo ustawia pytanie na torach?”. Przy zwykłej czynności jest to do, does albo did. Przy ready, at home, late działają am/is/are. Przy can, will, should niczego nie dodajesz: one same idą na początek.',
    },
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Обычное действие: Do you work? Does she work? Did they call? Состояние или место: Are you ready? Is he at home? Возможность или будущее: Can you help? Will they come? Слова where/what/when/how ставятся перед всей этой конструкцией.',
    'Звичайна дія: Do you work? Does she work? Did they call? Стан або місце: Are you ready? Is he at home? Можливість або майбутнє: Can you help? Will they come? Слова where/what/when/how ставляться перед усією цією конструкцією.',
    'Accion normal: Do you work? Does she work? Did they call? Estado o lugar: Are you ready? Is he at home? Posibilidad o futuro: Can you help? Will they come? Where/what/when/how van antes de toda esta estructura.',
    {
      'pt-BR': 'Ação normal: Do you work? Does she work? Did they call? Estado ou lugar: Are you ready? Is he at home? Possibilidade ou futuro: Can you help? Will they come? Where/what/when/how vêm antes de toda essa estrutura.',
      vi: 'Hành động bình thường: Do you work? Does she work? Did they call? Trạng thái hoặc nơi chốn: Are you ready? Is he at home? Khả năng hoặc tương lai: Can you help? Will they come? Where/what/when/how đứng trước toàn bộ cấu trúc đó.',
      id: 'Aksi biasa: Do you work? Does she work? Did they call? Keadaan atau tempat: Are you ready? Is he at home? Kemungkinan atau masa depan: Can you help? Will they come? Where/what/when/how diletakkan sebelum seluruh struktur itu.',
      tr: 'Normal eylem: Do you work? Does she work? Did they call? Durum veya yer: Are you ready? Is he at home? Olasılık veya gelecek: Can you help? Will they come? Where/what/when/how bütün bu yapının önüne gelir.',
      pl: 'Zwykła czynność: Do you work? Does she work? Did they call? Stan albo miejsce: Are you ready? Is he at home? Możliwość albo przyszłość: Can you help? Will they come? Where/what/when/how stawiamy przed całą tą strukturą.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Для обычного действия в настоящем с I/you/we/they вопрос начинается с do: Do you work?',
      'Для he/she/it в настоящем вопрос начинается с does, а действие идет без -s: Does she work?',
      'В прошлом вопрос начинается с did, а действие возвращается в простую форму: Did you go?',
      'С ready, at home, late и похожими фразами не нужен do: Are you ready? Is he at home?',
      'С can/will/should не нужен do: Can you help? Will they come?',
      'Where, what, when, why, how ставятся в начало: Where do you live?',
      'Не копируй русский порядок слов: Where you live? звучит как ошибка. Нормально: Where do you live?',
      'После does не добавляй -s к действию: Does she speak? Не Does she speaks?',
      'После did не ставь прошлую форму: Did you buy? Не Did you bought?',
      'Главная привычка: сначала найди первое слово вопроса, потом собирай остальное.',
    ],
    uk: [
      'Для звичайної дії в теперішньому з I/you/we/they питання починається з do: Do you work?',
      'Для he/she/it у теперішньому питання починається з does, а дія йде без -s: Does she work?',
      'У минулому питання починається з did, а дія повертається в просту форму: Did you go?',
      'З ready, at home, late і схожими фразами не потрібне do: Are you ready? Is he at home?',
      'З can/will/should не потрібне do: Can you help? Will they come?',
      'Where, what, when, why, how ставляться на початок: Where do you live?',
      'Не копіюй український порядок слів: Where you live? звучить як помилка. Нормально: Where do you live?',
      'Після does не додавай -s до дії: Does she speak? Не Does she speaks?',
      'Після did не став минулу форму: Did you buy? Не Did you bought?',
      'Головна звичка: спочатку знайди перше слово питання, потім збирай решту.',
    ],
    es: [
      'Para una accion normal en presente con I/you/we/they, la pregunta empieza con do: Do you work?',
      'Para he/she/it en presente, la pregunta empieza con does y el verbo va sin -s: Does she work?',
      'En pasado, la pregunta empieza con did y el verbo vuelve a la forma simple: Did you go?',
      'Con ready, at home, late y frases parecidas no hace falta do: Are you ready? Is he at home?',
      'Con can/will/should no hace falta do: Can you help? Will they come?',
      'Where, what, when, why, how van al principio: Where do you live?',
      'No copies el orden de tu idioma: Where you live? suena como error. Normal: Where do you live?',
      'Despues de does no agregues -s al verbo: Does she speak? No Does she speaks?',
      'Despues de did no uses pasado: Did you buy? No Did you bought?',
      'Habito principal: primero encuentra la primera palabra de la pregunta, despues monta lo demas.',
    ],
    'pt-BR': [
      'Ações normais no presente usam do ou does.',
      'Perguntas no passado usam did + verbo base.',
      'Am/is/are e can/will/should vão para a frente sozinhos.',
      'Palavras interrogativas vêm primeiro.',
    ],
    vi: [
      'Hành động thường ở hiện tại dùng do hoặc does.',
      'Câu hỏi quá khứ dùng did + động từ nguyên mẫu.',
      'Am/is/are và can/will/should tự chuyển lên đầu.',
      'Từ hỏi đứng đầu câu.',
    ],
    id: [
      'Tindakan biasa di masa kini memakai do atau does.',
      'Pertanyaan masa lalu memakai did + kata kerja bentuk dasar.',
      'Am/is/are dan can/will/should maju ke depan sendiri.',
      'Kata tanya berada di awal.',
    ],
    tr: [
      'Geniş/şimdiki zamanda normal eylemler do veya does kullanır.',
      'Geçmiş zaman soruları did + yalın fiil kullanır.',
      'Am/is/are ve can/will/should kendileri başa gelir.',
      'Soru kelimeleri en başa gelir.',
    ],
    pl: [
      'Zwykłe czynności w czasie teraźniejszym używają do albo does.',
      'Pytania w przeszłości używają did + podstawowej formy czasownika.',
      'Am/is/are oraz can/will/should same przechodzą na początek.',
      'Słowa pytające stoją na początku.',
    ],
  },
  examples: [
    { en: 'Do you work here?', ru: 'Ты здесь работаешь?', uk: 'Ти тут працюєш?', es: 'Trabajas aqui?', 'pt-BR': 'Você trabalha aqui?', vi: 'Bạn làm việc ở đây à?', id: 'Apakah kamu bekerja di sini?', tr: 'Burada çalışıyor musun?', pl: 'Czy pracujesz tutaj?', why: tri('Work - обычное действие. С you вопрос начинается с do.', 'Work - звичайна дія. З you питання починається з do.', 'Work es una accion normal. Con you, la pregunta empieza con do.') },
    { en: 'Does she speak English?', ru: 'Она говорит по-английски?', uk: 'Вона говорить англійською?', es: 'Ella habla ingles?', 'pt-BR': 'Ela fala inglês?', vi: 'Cô ấy nói tiếng Anh không?', id: 'Apakah dia berbicara bahasa Inggris?', tr: 'O İngilizce konuşuyor mu?', pl: 'Czy ona mówi po angielsku?', why: tri('Does уже показывает he/she/it, поэтому speak остается без -s.', 'Does уже показує he/she/it, тому speak лишається без -s.', 'Does ya marca he/she/it, asi que speak queda sin -s.') },
    { en: 'Did you call him?', ru: 'Ты позвонил ему?', uk: 'Ти подзвонив йому?', es: 'Lo llamaste?', 'pt-BR': 'Você ligou para ele?', vi: 'Bạn đã gọi cho anh ấy chưa?', id: 'Apakah kamu menelepon dia?', tr: 'Onu aradın mı?', pl: 'Czy zadzwoniłeś do niego?', why: tri('Did показывает прошлое, поэтому call не превращается в called.', 'Did показує минуле, тому call не перетворюється на called.', 'Did marca el pasado, asi que call queda simple.') },
    { en: 'Are you ready?', ru: 'Ты готов?', uk: 'Ти готовий?', es: 'Estas listo?', 'pt-BR': 'Você está pronto?', vi: 'Bạn đã sẵn sàng chưa?', id: 'Apakah kamu siap?', tr: 'Hazır mısın?', pl: 'Czy jesteś gotowy?', why: tri('Ready работает с are. Do здесь не нужен.', 'Ready працює з are. Do тут не потрібне.', 'Ready funciona con are. Aqui no hace falta do.') },
    { en: 'Is he at home?', ru: 'Он дома?', uk: 'Він удома?', es: 'Esta en casa?', 'pt-BR': 'Ele está em casa?', vi: 'Anh ấy có ở nhà không?', id: 'Apakah dia di rumah?', tr: 'O evde mi?', pl: 'Czy on jest w domu?', why: tri('At home описывает место/состояние, поэтому вопрос начинается с is.', 'At home описує місце/стан, тому питання починається з is.', 'At home describe lugar/estado, asi que la pregunta empieza con is.') },
    { en: 'Can you help me?', ru: 'Ты можешь мне помочь?', uk: 'Ти можеш мені допомогти?', es: 'Puedes ayudarme?', 'pt-BR': 'Você pode me ajudar?', vi: 'Bạn có thể giúp tôi không?', id: 'Bisakah kamu membantu saya?', tr: 'Bana yardım edebilir misin?', pl: 'Czy możesz mi pomóc?', why: tri('Can само выходит вперед. Do добавлять не надо.', 'Can саме виходить уперед. Do додавати не треба.', 'Can se mueve delante por si solo. No agregues do.') },
    { en: 'Where do you live?', ru: 'Где ты живешь?', uk: 'Де ти живеш?', es: 'Donde vives?', 'pt-BR': 'Onde você mora?', vi: 'Bạn sống ở đâu?', id: 'Di mana kamu tinggal?', tr: 'Nerede yaşıyorsun?', pl: 'Gdzie mieszkasz?', why: tri('Where стоит первым, но внутри вопроса все равно нужен do.', 'Where стоїть першим, але всередині питання все одно потрібне do.', 'Where va primero, pero dentro de la pregunta aun hace falta do.') },
    { en: 'What did you buy?', ru: 'Что ты купил?', uk: 'Що ти купив?', es: 'Que compraste?', 'pt-BR': 'O que você comprou?', vi: 'Bạn đã mua gì?', id: 'Apa yang kamu beli?', tr: 'Ne satın aldın?', pl: 'Co kupiłeś?', why: tri('What ставим вперед. Did показывает прошлое. Buy остается простым.', 'What ставимо вперед. Did показує минуле. Buy лишається простим.', 'What va primero. Did marca el pasado.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты иногда строишь вопрос как утверждение и просто добавляешь вопросительную интонацию. В русском это часто работает. В английском часто нет.',
        'Схоже, ти іноді будуєш питання як твердження і просто додаєш питальну інтонацію. В українській це часто працює. В англійській часто ні.',
        'Puede que a veces construyas la pregunta como una afirmacion y solo agregues entonacion. En tu idioma eso puede funcionar; en ingles muchas veces no.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'У английского вопроса часто есть первое служебное слово: Do you work? Are you ready? Can you help?',
        'В англійського питання часто є перше службове слово: Do you work? Are you ready? Can you help?',
        'Muchas preguntas en ingles tienen una palabra auxiliar delante: Do you work? Are you ready? Can you help?',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Главные ловушки: вопрос без do, лишняя -s после does и прошлая форма после did. Нормально: Do you work? Where do you live? Does she work? Did you go?',
        'Головні пастки: питання без do, зайва -s після does і минула форма після did. Нормально: Do you work? Where do you live? Does she work? Did you go?',
        'Trampas principales: pregunta sin do, -s extra despues de does y pasado despues de did. Normal: Do you work? Where do you live? Does she work? Did you go?',
      ),
    },
  ],
  steps: [
    step({
      id: 'q_order_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'do_you_work',
      sentence: '___ you work here?',
      translation: tri('Ты здесь работаешь?', 'Ти тут працюєш?', 'Do you work here?'),
      options: ['Do', 'Are', 'Does', 'Did'],
      correctAnswer: 'Do',
      correctFeedback: tri('Да. Work - обычное действие, а с you вопрос начинается с Do.', 'Так. Work - звичайна дія, а з you питання починається з Do.', 'Yes. Normal action with you starts with Do.'),
      wrong: {
        Are: tri('Are нужно для фраз типа Are you ready? С work нужен Do you work?', 'Are потрібне для фраз типу Are you ready? З work потрібне Do you work?', 'Use Do you work?'),
        Does: tri('Does не подходит к you. С you нужно do.', 'Does не підходить до you. З you потрібне do.', 'Use do with you.'),
        Did: tri('Did сделает вопрос прошлым: Did you work? Здесь вопрос про настоящее.', 'Did зробить питання минулим: Did you work? Тут питання про теперішнє.', 'Did makes it past.'),
      },
      focusWords: ['do', 'you', 'work'],
    }),
    step({
      id: 'q_order_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'does_she_work',
      sentence: '___ she work here?',
      translation: tri('Она здесь работает?', 'Вона тут працює?', 'Does she work here?'),
      options: ['Does', 'Do', 'Is', 'Did'],
      correctAnswer: 'Does',
      correctFeedback: tri('Да. С she в таком вопросе нужно Does, а work остается без -s.', 'Так. З she у такому питанні потрібне Does, а work лишається без -s.', 'Yes. She uses Does, and work has no -s.'),
      wrong: {
        Do: tri('С she обычно нужен does. Поэтому: Does she work?', 'З she зазвичай потрібне does. Тому: Does she work?', 'Use does with she.'),
        Is: tri('Is she work? не работает. Для действия work нужен does.', 'Is she work? не працює. Для дії work потрібне does.', 'Use does with work.'),
        Did: tri('Did был бы вопросом о прошлом. Здесь спрашиваем про настоящее.', 'Did було б питанням про минуле. Тут питаємо про теперішнє.', 'Did makes it past.'),
      },
      focusWords: ['does', 'she', 'work'],
    }),
    step({
      id: 'q_order_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'are_you_ready',
      sentence: '___ you ready?',
      translation: tri('Ты готов?', 'Ти готовий?', 'Are you ready?'),
      options: ['Are', 'Do', 'Does', 'Did'],
      correctAnswer: 'Are',
      correctFeedback: tri('Да. Ready идет с are: Are you ready?', 'Так. Ready іде з are: Are you ready?', 'Yes. Ready uses are.'),
      wrong: {
        Do: tri('Do you ready? не работает. Нужна форма Are you ready?', 'Do you ready? не працює. Потрібна форма Are you ready?', 'Use Are you ready?'),
        Does: tri('Does не подходит к you и не нужен с ready.', 'Does не підходить до you і не потрібне з ready.', 'Use are.'),
        Did: tri('Did не нужен для состояния ready сейчас.', 'Did не потрібне для стану ready зараз.', 'Use are for ready now.'),
      },
      focusWords: ['are', 'ready'],
    }),
    step({
      id: 'q_order_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'statement_vs_question_order',
      sentence: 'Choose the correct question.',
      translation: tri('Ты работаешь здесь?', 'Ти працюєш тут?', 'Do you work here?'),
      options: ['Do you work here?', 'You work here?', 'Are you work here?', 'Does you work here?'],
      correctAnswer: 'Do you work here?',
      correctFeedback: tri('Да. Не просто You work here? В базовом вопросе нужен Do.', 'Так. Не просто You work here? У базовому питанні потрібне Do.', 'Yes. Use Do, not statement order.'),
      wrong: {
        'You work here?': tri('Это порядок утверждения. В базовом вопросе лучше: Do you work here?', 'Це порядок твердження. У базовому питанні краще: Do you work here?', 'This is statement order.'),
        'Are you work here?': tri('Are не ставится перед обычным действием work. Нужно Do you work here?', 'Are не ставиться перед звичайною дією work. Потрібно Do you work here?', 'Use Do with work.'),
        'Does you work here?': tri('Does не используется с you. Нужно Do you work here?', 'Does не використовується з you. Потрібно Do you work here?', 'Use do with you.'),
      },
      focusWords: ['do', 'you', 'work'],
    }),
    step({
      id: 'q_order_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'does_plus_base_no_s',
      sentence: 'Choose the correct question.',
      translation: tri('Она говорит по-английски?', 'Вона говорить англійською?', 'Does she speak English?'),
      options: ['Does she speak English?', 'Does she speaks English?', 'Do she speak English?', 'Is she speak English?'],
      correctAnswer: 'Does she speak English?',
      correctFeedback: tri('Да. Does уже взял -s на себя, поэтому speak без -s.', 'Так. Does уже взяло -s на себе, тому speak без -s.', 'Yes. Does carries the -s signal.'),
      wrong: {
        'Does she speaks English?': tri('После does действие не получает -s. Нормально: Does she speak English?', 'Після does дія не отримує -s. Нормально: Does she speak English?', 'After does, use speak.'),
        'Do she speak English?': tri('С she нужно does, не do.', 'З she потрібне does, не do.', 'Use does with she.'),
        'Is she speak English?': tri('Speak - действие. Для него здесь нужно does.', 'Speak - дія. Для неї тут потрібне does.', 'Use does with speak.'),
      },
      focusWords: ['does', 'she', 'speak'],
    }),
    step({
      id: 'q_order_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'did_plus_simple_action',
      sentence: 'Choose the correct question.',
      translation: tri('Ты купил билет?', 'Ти купив квиток?', 'Did you buy a ticket?'),
      options: ['Did you buy a ticket?', 'Did you bought a ticket?', 'You bought a ticket?', 'Do you bought a ticket?'],
      correctAnswer: 'Did you buy a ticket?',
      correctFeedback: tri('Да. Did уже показывает прошлое, поэтому buy остается простым.', 'Так. Did уже показує минуле, тому buy лишається простим.', 'Yes. Did carries the past signal.'),
      wrong: {
        'Did you bought a ticket?': tri('После did не ставим bought. Нужно buy.', 'Після did не ставимо bought. Потрібно buy.', 'After did, use buy.'),
        'You bought a ticket?': tri('Это утверждение с интонацией. Базово: Did you buy a ticket?', 'Це твердження з інтонацією. Базово: Did you buy a ticket?', 'Use Did you buy...?'),
        'Do you bought a ticket?': tri('Do не соединяется с bought. Для прошлого нужен Did you buy?', 'Do не поєднується з bought. Для минулого потрібно Did you buy?', 'Use Did you buy?'),
      },
      focusWords: ['did', 'buy'],
    }),
    step({
      id: 'q_order_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'where_do_you_live',
      sentence: 'Choose the correct question.',
      translation: tri('Где ты живешь?', 'Де ти живеш?', 'Where do you live?'),
      options: ['Where do you live?', 'Where you live?', 'Where are you live?', 'Where does you live?'],
      correctAnswer: 'Where do you live?',
      correctFeedback: tri('Да. Where в начале, потом do you live.', 'Так. Where на початку, потім do you live.', 'Yes. Where first, then do you live.'),
      wrong: {
        'Where you live?': tri('После where все равно нужен do: Where do you live?', 'Після where все одно потрібне do: Where do you live?', 'Use do after where.'),
        'Where are you live?': tri('Live - действие. Здесь нужен do, не are.', 'Live - дія. Тут потрібне do, не are.', 'Use do with live.'),
        'Where does you live?': tri('Does не используется с you. Нужно do.', 'Does не використовується з you. Потрібне do.', 'Use do with you.'),
      },
      focusWords: ['where', 'do', 'live'],
    }),
    step({
      id: 'q_order_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'where_are_you',
      sentence: 'Choose the correct question.',
      translation: tri('Где ты?', 'Де ти?', 'Where are you?'),
      options: ['Where are you?', 'Where do you are?', 'Where you are?', 'Where is you?'],
      correctAnswer: 'Where are you?',
      correctFeedback: tri('Да. С are не нужен do: Where are you?', 'Так. З are не потрібне do: Where are you?', 'Yes. Use Where are you?'),
      wrong: {
        'Where do you are?': tri('С are не добавляем do. Нормально: Where are you?', 'З are не додаємо do. Нормально: Where are you?', 'Do is not used with are here.'),
        'Where you are?': tri('В вопросе are выходит перед you: Where are you?', 'У питанні are виходить перед you: Where are you?', 'Move are before you.'),
        'Where is you?': tri('С you нужна форма are, не is.', 'З you потрібна форма are, не is.', 'Use are with you.'),
      },
      focusWords: ['where', 'are', 'you'],
    }),
    step({
      id: 'q_order_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'can_you_help',
      sentence: '___ you help me?',
      translation: tri('Ты можешь мне помочь?', 'Ти можеш мені допомогти?', 'Can you help me?'),
      options: ['Can', 'Do can', 'Are can', 'Does'],
      correctAnswer: 'Can',
      correctFeedback: tri('Да. Can само становится первым: Can you help me?', 'Так. Can саме стає першим: Can you help me?', 'Yes. Can moves first.'),
      wrong: {
        'Do can': tri('С can не нужен do. Нормально: Can you help me?', 'З can не потрібне do. Нормально: Can you help me?', 'Do is not used with can.'),
        'Are can': tri('Are can не работает. Can само выходит вперед.', 'Are can не працює. Can саме виходить уперед.', 'Use can by itself.'),
        Does: tri('Does не используется с can. Нужно Can you help me?', 'Does не використовується з can. Потрібно Can you help me?', 'Use can, not does.'),
      },
      focusWords: ['can', 'you', 'help'],
    }),
    step({
      id: 'q_order_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'did_she_call',
      sentence: '___ she call you yesterday?',
      translation: tri('Она звонила тебе вчера?', 'Вона дзвонила тобі вчора?', 'Did she call you yesterday?'),
      options: ['Did', 'Does', 'Do', 'Was'],
      correctAnswer: 'Did',
      correctFeedback: tri('Да. Yesterday подсказывает прошлое, поэтому вопрос начинается с Did.', 'Так. Yesterday підказує минуле, тому питання починається з Did.', 'Yes. Yesterday points to Did.'),
      wrong: {
        Does: tri('Does - про настоящее. Здесь есть yesterday, значит нужен Did.', 'Does - про теперішнє. Тут є yesterday, отже потрібне Did.', 'Use Did with yesterday.'),
        Do: tri('Do не подходит к she и не показывает прошлое.', 'Do не підходить до she і не показує минуле.', 'Use Did here.'),
        Was: tri('Was she call? не работает. Для действия call нужен Did.', 'Was she call? не працює. Для дії call потрібне Did.', 'Use Did with call.'),
      },
      focusWords: ['did', 'call', 'yesterday'],
    }),
    step({
      id: 'q_order_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'is_he_at_home',
      sentence: '___ he at home?',
      translation: tri('Он дома?', 'Він удома?', 'Is he at home?'),
      options: ['Is', 'Does', 'Do', 'Did'],
      correctAnswer: 'Is',
      correctFeedback: tri('Да. At home здесь идет с is: Is he at home?', 'Так. At home тут іде з is: Is he at home?', 'Yes. Use Is he at home?'),
      wrong: {
        Does: tri('Does нужен для действия. Здесь спрашиваем про место/состояние: Is he at home?', 'Does потрібне для дії. Тут питаємо про місце/стан: Is he at home?', 'Use is here.'),
        Do: tri('Do не подходит к he и не нужен с at home.', 'Do не підходить до he і не потрібне з at home.', 'Use is.'),
        Did: tri('Did не нужен для вопроса “он дома?” сейчас.', 'Did не потрібне для питання “він удома?” зараз.', 'Use is for now.'),
      },
      focusWords: ['is', 'he', 'at home'],
    }),
    step({
      id: 'q_order_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'will_they_come',
      sentence: '___ they come tomorrow?',
      translation: tri('Они придут завтра?', 'Вони прийдуть завтра?', 'Will they come tomorrow?'),
      options: ['Will', 'Do will', 'Are', 'Did'],
      correctAnswer: 'Will',
      correctFeedback: tri('Да. Will само выходит вперед: Will they come tomorrow?', 'Так. Will саме виходить уперед: Will they come tomorrow?', 'Yes. Will moves first.'),
      wrong: {
        'Do will': tri('Do will не работает. С will не добавляем do.', 'Do will не працює. З will не додаємо do.', 'Do is not used with will.'),
        Are: tri('Are they come? не работает. Для будущего здесь нужен Will.', 'Are they come? не працює. Для майбутнього тут потрібне Will.', 'Use will here.'),
        Did: tri('Did сделал бы прошлое, а tomorrow говорит о будущем.', 'Did зробило б минуле, а tomorrow говорить про майбутнє.', 'Tomorrow points to will.'),
      },
      focusWords: ['will', 'come', 'tomorrow'],
    }),
    step({
      id: 'q_order_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'what_did_you_buy',
      sentence: 'Choose the correct question.',
      translation: tri('Что ты купил?', 'Що ти купив?', 'What did you buy?'),
      options: ['What did you buy?', 'What you bought?', 'What did you bought?', 'What do you bought?'],
      correctAnswer: 'What did you buy?',
      correctFeedback: tri('Да. What вперед, потом did you buy.', 'Так. What уперед, потім did you buy.', 'Yes. What first, then did you buy.'),
      wrong: {
        'What you bought?': tri('Это русский порядок слов. В английском нужен Did: What did you buy?', 'Це український порядок слів. В англійській потрібне Did: What did you buy?', 'Use did.'),
        'What did you bought?': tri('После did не bought, а buy.', 'Після did не bought, а buy.', 'After did, use buy.'),
        'What do you bought?': tri('Do не соединяется с bought. Для прошлого: What did you buy?', 'Do не поєднується з bought. Для минулого: What did you buy?', 'Use did you buy.'),
      },
      focusWords: ['what', 'did', 'buy'],
    }),
    step({
      id: 'q_order_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'what_can_you_do',
      sentence: 'Choose the correct question.',
      translation: tri('Что ты можешь сделать?', 'Що ти можеш зробити?', 'What can you do?'),
      options: ['What can you do?', 'What do you can do?', 'What you can do?', 'What can do you?'],
      correctAnswer: 'What can you do?',
      correctFeedback: tri('Да. What вперед, потом can you do.', 'Так. What уперед, потім can you do.', 'Yes. What first, then can you do.'),
      wrong: {
        'What do you can do?': tri('С can не нужен do. Нормально: What can you do?', 'З can не потрібне do. Нормально: What can you do?', 'Do is not used with can.'),
        'What you can do?': tri('После what нужен порядок вопроса: can you.', 'Після what потрібен порядок питання: can you.', 'Use can you after what.'),
        'What can do you?': tri('После can сначала идет you, потом do: What can you do?', 'Після can спочатку йде you, потім do: What can you do?', 'After can, put you before do.'),
      },
      focusWords: ['what', 'can', 'you', 'do'],
    }),
    step({
      id: 'q_order_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_final_question_order',
      sentence: 'Choose the correct question.',
      translation: tri('Почему она ушла рано?', 'Чому вона пішла рано?', 'Why did she leave early?'),
      options: ['Why did she leave early?', 'Why she left early?', 'Why did she left early?', 'Why does she left early?'],
      correctAnswer: 'Why did she leave early?',
      correctFeedback: tri('Да. Why вперед, потом did she leave. Did уже показывает прошлое.', 'Так. Why уперед, потім did she leave. Did уже показує минуле.', 'Yes. Why first, then did she leave.'),
      wrong: {
        'Why she left early?': tri('Это порядок утверждения. В вопросе нужен Did: Why did she leave early?', 'Це порядок твердження. У питанні потрібне Did: Why did she leave early?', 'Use did.'),
        'Why did she left early?': tri('После did не left, а leave.', 'Після did не left, а leave.', 'After did, use leave.'),
        'Why does she left early?': tri('Does не работает с left. Для прошлого нужен did, а действие будет leave.', 'Does не працює з left. Для минулого потрібне did, а дія буде leave.', 'Use did she leave.'),
      },
      focusWords: ['why', 'did', 'leave'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_auxiliary_question_error',
      'statement_order_question_error',
      'does_plus_s_error',
      'did_plus_past_error',
      'do_with_be_error',
      'do_with_modal_error',
      'question_word_no_aux_error',
      'wrong_auxiliary_choice_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri(
      'Показываем, какой тип вопроса перед тобой: обычное действие, состояние или can/will/should.',
      'Показуємо, який тип питання перед тобою: звичайна дія, стан або can/will/should.',
      'Mostramos que tipo de pregunta tienes: accion normal, estado o can/will/should.',
    ),
    depth2: tri(
      'Проще: если это действие, ищи do/does/did. Если это ready/at home, ищи am/is/are.',
      'Простіше: якщо це дія, шукай do/does/did. Якщо це ready/at home, шукай am/is/are.',
      'Mas simple: si es accion, busca do/does/did. Si es ready/at home, busca am/is/are.',
    ),
    depth3: tri(
      'Держи готовые модели и сравни по смыслу: действие сейчас или обычно - Do you work? She - Does she work? Прошлое - Did you call? Состояние - Are you ready? Возможность - Can you help?',
      'Тримай готові моделі й порівняй за змістом: дія зараз або зазвичай - Do you work? She - Does she work? Минуле - Did you call? Стан - Are you ready? Можливість - Can you help?',
      'Guarda los modelos: Do you work? Does she work? Did you call? Are you ready? Can you help?',
    ),
    depth4: tri(
      'Почти подсказка: выбери вариант, где первое слово вопроса уже стоит перед человеком или предметом.',
      'Майже підказка: обери варіант, де перше слово питання вже стоїть перед людиною або предметом.',
      'Casi una pista: elige la opcion donde la palabra inicial de la pregunta ya esta antes de la persona o cosa.',
    ),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: {
        ru: 'Стоп. Сначала определи тип фразы. Обычное действие: Do you work? Does she work? Did you call? Состояние: Are you ready? Is he at home? Can/will/should выходят вперед сами.',
        uk: 'Стоп. Спочатку визнач тип фрази. Звичайна дія: Do you work? Does she work? Did you call? Стан: Are you ready? Is he at home? Can/will/should виходять уперед самі.',
        es: 'Pause. Normal action: Do you work? Does she work? Did you call? State: Are you ready? Is he at home? Can/will/should move forward.',
        'pt-BR': 'Pausa. Ação normal: Do you work? Does she work? Did you call? Estado: Are you ready? Is he at home? Can/will/should vão para a frente.',
        vi: 'Tạm dừng. Hành động thường: Do you work? Does she work? Did you call? Trạng thái: Are you ready? Is he at home? Can/will/should tự lên đầu.',
        id: 'Jeda. Tindakan biasa: Do you work? Does she work? Did you call? Keadaan: Are you ready? Is he at home? Can/will/should maju sendiri.',
        tr: 'Dur. Normal eylem: Do you work? Does she work? Did you call? Durum: Are you ready? Is he at home? Can/will/should kendileri başa gelir.',
        pl: 'Stop. Zwykła czynność: Do you work? Does she work? Did you call? Stan: Are you ready? Is he at home? Can/will/should same przechodzą na początek.',
      },
    },
    afterThreeWrongInSameExercise: {
      action: 'show_question_structure_hint_then_retry',
      card: {
        ru: 'Подсказка по структуре: система покажет, это вопрос с do/does/did, с am/is/are или с can/will/should. Потом ты снова выберешь ответ.',
        uk: 'Підказка за структурою: система покаже, це питання з do/does/did, з am/is/are чи з can/will/should. Потім ти знову обереш відповідь.',
        es: 'Hint: the system will show whether this uses do/does/did, am/is/are, or can/will/should.',
        'pt-BR': 'Dica: o sistema mostrará se isto usa do/does/did, am/is/are ou can/will/should.',
        vi: 'Gợi ý: hệ thống sẽ cho biết câu này dùng do/does/did, am/is/are hay can/will/should.',
        id: 'Petunjuk: sistem akan menunjukkan apakah ini memakai do/does/did, am/is/are, atau can/will/should.',
        tr: 'İpucu: sistem bunun do/does/did, am/is/are ya da can/will/should kullandığını gösterecek.',
        pl: 'Wskazówka: system pokaże, czy tu używa się do/does/did, am/is/are czy can/will/should.',
      },
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: {
        ru: 'Режим подсказки: сначала выбери тип фразы, потом вернись к вопросу. Цель не угадать, а увидеть каркас.',
        uk: 'Режим підказки: спочатку обери тип фрази, потім повернися до питання. Мета не вгадати, а побачити каркас.',
        es: 'Guided mode: choose the phrase type first, then return to the question.',
        'pt-BR': 'Modo guiado: escolha primeiro o tipo da frase e depois volte à pergunta.',
        vi: 'Chế độ hướng dẫn: chọn loại cụm từ trước, rồi quay lại câu hỏi.',
        id: 'Mode terpandu: pilih jenis frasa terlebih dahulu, lalu kembali ke pertanyaan.',
        tr: 'Rehberli mod: önce ifade türünü seç, sonra soruya geri dön.',
        pl: 'Tryb z podpowiedzią: najpierw wybierz typ frazy, potem wróć do pytania.',
      },
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_q_order_001',
        prompt: { ru: 'В Do you work? слово work - это действие или состояние?', uk: 'У Do you work? слово work - це дія чи стан?', es: 'In Do you work?, is work an action or a state?',
        'pt-BR': 'Em Do you work?, work é uma ação ou um estado?',
        vi: 'Trong Do you work?, work là hành động hay trạng thái?',
        id: 'Dalam Do you work?, apakah work adalah tindakan atau keadaan?',
        tr: 'Do you work? cümlesinde work bir eylem mi, yoksa durum mu?',
        pl: 'W Do you work? czy work jest czynnością czy stanem?', },
        options: ['действие', 'состояние'],
        correctIndex: 0,
        thenReturnToExerciseId: 'q_order_easy_001',
      },
      {
        id: 'guided_q_order_002',
        prompt: { ru: 'После does лучше сказать speaks или speak?', uk: 'Після does краще сказати speaks чи speak?', es: 'After does, should the verb be speaks or speak?',
        'pt-BR': 'Depois de does, o verbo deve ser speaks ou speak?',
        vi: 'Sau does, động từ nên là speaks hay speak?',
        id: 'Setelah does, kata kerjanya speaks atau speak?',
        tr: 'Does sonrasında fiil speaks mi olmalı, speak mi?',
        pl: 'Po does czasownik powinien brzmieć speaks czy speak?', },
        options: ['speaks', 'speak'],
        correctIndex: 1,
        thenReturnToExerciseId: 'q_order_contrast_002',
      },
      {
        id: 'guided_q_order_003',
        prompt: { ru: 'После did лучше сказать went или go?', uk: 'Після did краще сказати went чи go?', es: 'After did, should the verb be went or go?',
        'pt-BR': 'Depois de did, o verbo deve ser went ou go?',
        vi: 'Sau did, động từ nên là went hay go?',
        id: 'Setelah did, kata kerjanya went atau go?',
        tr: 'Did sonrasında fiil went mi olmalı, go mu?',
        pl: 'Po did czasownik powinien brzmieć went czy go?', },
        options: ['went', 'go'],
        correctIndex: 1,
        thenReturnToExerciseId: 'q_order_contrast_003',
      },
      {
        id: 'guided_q_order_004',
        prompt: { ru: 'В Are you ready? нужен do или are само выходит вперед?', uk: 'У Are you ready? потрібне do чи are саме виходить уперед?', es: 'In Are you ready?, do we need do?',
        'pt-BR': 'Em Are you ready?, precisamos de do?',
        vi: 'Trong Are you ready?, có cần do không?',
        id: 'Dalam Are you ready?, apakah kita perlu do?',
        tr: 'Are you ready? cümlesinde do gerekir mi?',
        pl: 'W Are you ready? czy potrzebujemy do?', },
        options: ['нужен do', 'are само выходит вперед'],
        correctIndex: 1,
        thenReturnToExerciseId: 'q_order_easy_003',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'word_order_basic_question',
    diagnosisLabel: tri('Порядок слов в вопросах', 'Порядок слів у питаннях', 'Question word order'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: SMART_CONTRAST,
    focusPatterns: [
      'do_you_work',
      'do_they_live',
      'statement_vs_question_order',
      'does_she_work_base',
      'does_plus_base_no_s',
      'does_she_speak',
      'did_plus_base_go',
      'did_no_past_after_did',
      'did_she_call',
      'be_question_are_you',
      'be_question_is_he',
      'modal_question_can',
      'where_do_you_live',
      'where_are_you',
      'what_can_you_do',
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
    start: 'diagnosis_training_word_order_basic_question_start',
    answer: 'diagnosis_training_word_order_basic_question_answer',
    mastery: 'diagnosis_training_word_order_basic_question_mastery',
    recovery: 'diagnosis_training_word_order_basic_question_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'syntax',
      microDiagnosisId: 'word_order_basic_question',
      contrastSet: SMART_CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logQuestionType: true,
      logAuxiliary: true,
      logVerbFormAfterAuxiliary: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=word_order_basic_question',
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
