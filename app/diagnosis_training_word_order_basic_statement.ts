import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const WORD_ORDER_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre ordem básica em afirmações ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về trật tự từ trong câu khẳng định này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan urutan kata dasar dalam pernyataan ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu temel olumlu cümle kelime sırası açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie podstawowego szyku słów w zdaniu twierdzącym nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? WORD_ORDER_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'subject',
  'verb',
  'object',
  'place',
  'time',
  'adverb position',
  'source-language flexible order',
];

const SMART_CONTRAST = ['subject', 'verb', 'object', 'place', 'time', 'adverb position'];

const WORD_ORDER_SKILL_ES: Record<string, string> = {
  subject_verb_object: 'La frase neutra mantiene sujeto + accion + objeto.',
  subject_verb_place: 'Mantén sujeto y verbo juntos, y deja el lugar despues.',
  object_place_order: 'Primero va lo que haces; despues, donde lo haces.',
  object_place_time_order: 'Orden seguro: sujeto, accion, objeto, lugar y tiempo.',
  past_object_time_order: 'El tiempo puede ir al final sin romper sujeto + verbo.',
  time_beginning_core_order: 'Si el tiempo va al principio, despues no inviertas sujeto y verbo.',
  time_beginning_past: 'Despues de Yesterday, conserva el orden normal: she bought.',
  time_beginning_place: 'Despues de After work, conserva el orden normal: we went home.',
  frequency_before_main_verb: 'Usually/often suelen ir cerca del verbo principal.',
  frequency_after_be: 'Con is/are, always suele ir despues de be.',
  frequency_question_not_target_but_statement: 'No dejes que often rompa la accion y el objeto.',
  mixed_svo_place_time: 'Construye primero el marco principal; despues lugar y tiempo.',
  mixed_time_beginning_core: 'Con tiempo al inicio, el resto sigue en orden normal.',
  mixed_sentence_correction: 'Evita que lugar o tiempo separen sujeto y verbo.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = WORD_ORDER_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? WORD_ORDER_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function wordOrderEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = WORD_ORDER_SKILL_ES[input.targetSkill] ?? 'Usa el marco neutro: quien, accion, que, donde y cuando.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

const CORE_MODEL = tri(
  'В обычной английской фразе сначала говорим, кто делает действие. Потом само действие. Потом что, где и когда. Русский может двигать куски свободнее, а английскому чаще нужен ровный каркас.',
  'У звичайній англійській фразі спочатку кажемо, хто робить дію. Потім сама дія. Потім що, де і коли. Українська може рухати шматки вільніше, а англійській частіше потрібен рівний каркас.',
  'Una afirmacion normal en ingles suele mantener un marco fijo: quien, accion, que, donde y cuando.',
  {
    'pt-BR': 'Uma afirmação normal em inglês costuma manter uma estrutura fixa: quem faz a ação, a ação, o quê, onde e quando.',
    vi: 'Một câu khẳng định bình thường trong tiếng Anh thường giữ khung cố định: ai làm, hành động, cái gì, ở đâu và khi nào.',
    id: 'Pernyataan normal dalam bahasa Inggris biasanya memakai kerangka tetap: siapa, aksi, apa, di mana, dan kapan.',
    tr: 'Normal bir İngilizce olumlu cümle genellikle sabit bir çerçeve kullanır: kim, eylem, ne, nerede ve ne zaman.',
    pl: 'Zwykłe zdanie twierdzące po angielsku zwykle trzyma stały układ: kto, czynność, co, gdzie i kiedy.',
  },
);

function fallbackWrong(correct: string): TriText {
  return tri(
    `Почти. Здесь безопаснее собрать фразу так: ${correct}`,
    `Майже. Тут безпечніше зібрати фразу так: ${correct}`,
    `Casi. El orden mas seguro es: ${correct}`,
  );
}

function statementStep(input: {
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
  retryFeedback: [TriText, TriText, TriText, TriText];
  fallbackExplanation: TriText;
  focusWords: string[];
}): DiagnosisTrainingStep {
  const esFeedback = wordOrderEsFeedback(input);

  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    teachingText: withEs(CORE_MODEL, esFeedback),
    explanationBlock: withEs(CORE_MODEL, esFeedback),
    microTask: tri(
      'Выбери фразу, которая звучит как обычное английское утверждение.',
      'Обери фразу, яка звучить як звичайне англійське твердження.',
      'Elige la frase que suena como una afirmacion normal en ingles.',
    ),
    sentence: input.sentence,
    translation: withEs(input.translation, esFeedback),
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: withEs(input.correctFeedback, esFeedback),
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((option) => option !== input.correctAnswer)
        .map((option) => [option, withEs(input.wrong[option] ?? fallbackWrong(input.correctAnswer), esFeedback)]),
    ),
    retryFeedback: input.retryFeedback.map((item) => withEs(item, esFeedback)) as [TriText, TriText, TriText, TriText],
    fallbackExplanation: withEs(input.fallbackExplanation, esFeedback),
    focusWords: input.focusWords,
  };
}

const frameRetry = (answer: string): [TriText, TriText, TriText, TriText] => [
  tri('Сначала спроси: кто делает действие?', 'Спочатку спитай: хто робить дію?', 'Primero pregunta: quien hace la accion?'),
  tri('Потом поставь действие.', 'Потім постав дію.', 'Despues pon la accion.'),
  tri('После этого добавь что, где или когда.', 'Після цього додай що, де або коли.', 'Despues agrega que, donde o cuando.'),
  tri('В конце проверь, не разорвали ли место или время связку "кто + действие".', 'Наприкiнцi перевiр, чи не розiрвали мiсце або час звʼязку "хто + дiя".', `Respuesta: ${answer}`),
];

export const WORD_ORDER_BASIC_STATEMENT_TRAINING: DiagnosisTraining = {
  id: 'word_order_basic_statement',
  category: 'syntax',
  version: '1.0.0',
  status: 'active',
  priority: 31,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'I like coffee: ровный порядок слов',
    'I like coffee: рівний порядок слів',
    'I like coffee: orden basico de afirmacion',
    {
      'pt-BR': 'I like coffee: ordem básica em afirmações',
      vi: 'I like coffee: trật tự từ cơ bản trong câu khẳng định',
      id: 'I like coffee: urutan kata dasar dalam pernyataan',
      tr: 'I like coffee: olumlu cümlede temel kelime sırası',
      pl: 'I like coffee: podstawowy szyk słów w zdaniu twierdzącym',
    },
  ),
  shortTitle: tri('I like coffee', 'I like coffee', 'I like coffee', {
    'pt-BR': 'I like coffee',
    vi: 'I like coffee',
    id: 'I like coffee',
    tr: 'I like coffee',
    pl: 'I like coffee',
  }),
  shortDiagnosis: tri(
    'Ты знаешь все слова, но двигаешь их как в русском. В английском обычная фраза чаще держится на каркасе: кто + действие + что.',
    'Ти знаєш усі слова, але рухаєш їх як в українській. В англійській звичайна фраза частіше тримається на каркасі: хто + дія + що.',
    'Conoces las palabras, pero las mueves demasiado libremente. Las afirmaciones en ingles suelen mantener quien + accion + que.',
    {
      'pt-BR': 'Você conhece as palavras, mas as move livremente demais. Em inglês, afirmações normais costumam manter quem + ação + o quê.',
      vi: 'Bạn biết tất cả các từ, nhưng di chuyển chúng quá tự do. Trong tiếng Anh, câu khẳng định thường giữ khung ai + hành động + cái gì.',
      id: 'Kamu tahu semua katanya, tetapi memindahkannya terlalu bebas. Dalam bahasa Inggris, pernyataan biasa biasanya mempertahankan siapa + aksi + apa.',
      tr: 'Kelimeleri biliyorsun ama onları fazla serbest taşıyorsun. İngilizcede normal olumlu cümleler genellikle kim + eylem + ne düzenini korur.',
      pl: 'Znasz słowa, ale przesuwasz je zbyt swobodnie. W angielskim zwykłe zdania twierdzące zwykle trzymają układ kto + czynność + co.',
    },
  ),
  diagnosisText: tri(
    'Проблема не в словах. Coffee, I, like понятны по отдельности. Но Coffee I like звучит как перенос русской логики. Нейтрально: I like coffee. То же самое с местом и временем: не I read at home books, а I read books at home.',
    'Проблема не в словах. Coffee, I, like зрозумілі окремо. Але Coffee I like звучить як перенесення української логіки. Нейтрально: I like coffee. Так само з місцем і часом: не I read at home books, а I read books at home.',
    'Las palabras estan claras, pero el orden no. Usa I like coffee y I read books at home.',
    {
      'pt-BR': 'O problema não está nas palavras. Coffee, I e like são claros separadamente. Mas Coffee I like soa como transferência da lógica de outro idioma. A forma neutra é I like coffee. Com lugar e tempo acontece o mesmo: não I read at home books, mas I read books at home.',
      vi: 'Vấn đề không nằm ở từng từ. Coffee, I và like đều rõ khi đứng riêng. Nhưng Coffee I like nghe như chuyển trật tự từ ngôn ngữ khác sang tiếng Anh. Câu trung tính là I like coffee. Với nơi chốn và thời gian cũng vậy: không dùng I read at home books, mà dùng I read books at home.',
      id: 'Masalahnya bukan pada kata-katanya. Coffee, I, dan like jelas jika berdiri sendiri. Tetapi Coffee I like terdengar seperti memindahkan logika bahasa lain. Bentuk netralnya adalah I like coffee. Sama juga dengan tempat dan waktu: bukan I read at home books, tetapi I read books at home.',
      tr: 'Sorun kelimelerde değil. Coffee, I ve like ayrı ayrı anlaşılır. Ama Coffee I like başka bir dilin mantığını İngilizceye taşımış gibi duyulur. Nötr biçim I like coffee. Yer ve zamanda da aynı şey geçerli: I read at home books değil, I read books at home.',
      pl: 'Problem nie leży w słowach. Coffee, I i like są osobno jasne. Ale Coffee I like brzmi jak przeniesienie logiki innego języka. Neutralnie mówimy I like coffee. Z miejscem i czasem jest podobnie: nie I read at home books, tylko I read books at home.',
    },
  ),
  mentalModel: tri(
    'Держи короткий тест. Кто? I. Что делаю? like. Что? coffee. Получается I like coffee. Если есть место, оно часто идет после того, что делают: I read books at home. Если есть время, оно часто идет в конец или начало: I work every day / Every day, I work.',
    'Тримай короткий тест. Хто? I. Що роблю? like. Що? coffee. Виходить I like coffee. Якщо є місце, воно часто йде після того, що роблять: I read books at home. Якщо є час, він часто йде в кінець або на початок: I work every day / Every day, I work.',
    'Usa el marco: quien + accion + que. El lugar suele ir despues de lo que haces. El tiempo suele ir al final o al principio.',
    {
      'pt-BR': 'Use o teste curto. Quem? I. O que faço? like. O quê? coffee. Fica I like coffee. Se houver lugar, ele muitas vezes vem depois do que a pessoa faz: I read books at home. Se houver tempo, ele muitas vezes vai ao fim ou ao início: I work every day / Every day, I work.',
      vi: 'Dùng bài kiểm tra ngắn. Ai? I. Làm gì? like. Cái gì? coffee. Thành I like coffee. Nếu có nơi chốn, nó thường đứng sau việc được làm: I read books at home. Nếu có thời gian, nó thường đứng cuối hoặc đầu câu: I work every day / Every day, I work.',
      id: 'Gunakan tes singkat. Siapa? I. Melakukan apa? like. Apa? coffee. Hasilnya I like coffee. Jika ada tempat, biasanya datang setelah hal yang dilakukan: I read books at home. Jika ada waktu, biasanya di akhir atau awal: I work every day / Every day, I work.',
      tr: 'Kısa testi kullan. Kim? I. Ne yapıyor? like. Neyi? coffee. Sonuç I like coffee. Yer bilgisi varsa çoğu zaman yapılan şeyden sonra gelir: I read books at home. Zaman bilgisi varsa çoğu zaman sona veya başa gelir: I work every day / Every day, I work.',
      pl: 'Użyj krótkiego testu. Kto? I. Co robi? like. Co? coffee. Powstaje I like coffee. Jeśli jest miejsce, często idzie po tym, co ktoś robi: I read books at home. Jeśli jest czas, często idzie na koniec albo początek: I work every day / Every day, I work.',
    },
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Базовый каркас: кто + действие + что. Потом место. Потом время. I like coffee. I read books at home. I work every day. Время можно поставить в начало, но внутри основной части порядок остается ровным: Every day, I work.',
    'Базовий каркас: хто + дія + що. Потім місце. Потім час. I like coffee. I read books at home. I work every day. Час можна поставити на початок, але всередині основної частини порядок лишається рівним: Every day, I work.',
    'Marco basico: quien + accion + que. Despues lugar. Despues tiempo.',
    {
      'pt-BR': 'Estrutura básica: quem + ação + o quê. Depois lugar. Depois tempo. I like coffee. I read books at home. I work every day. O tempo pode ir no início, mas dentro da parte principal a ordem continua estável: Every day, I work.',
      vi: 'Khung cơ bản: ai + hành động + cái gì. Sau đó nơi chốn. Sau đó thời gian. I like coffee. I read books at home. I work every day. Thời gian có thể đứng đầu câu, nhưng bên trong phần chính trật tự vẫn giữ nguyên: Every day, I work.',
      id: 'Kerangka dasar: siapa + aksi + apa. Lalu tempat. Lalu waktu. I like coffee. I read books at home. I work every day. Waktu bisa diletakkan di awal, tetapi di bagian utama urutannya tetap stabil: Every day, I work.',
      tr: 'Temel çerçeve: kim + eylem + ne. Sonra yer. Sonra zaman. I like coffee. I read books at home. I work every day. Zaman başa gelebilir, ama ana bölümün içinde sıra düz kalır: Every day, I work.',
      pl: 'Podstawowy układ: kto + czynność + co. Potem miejsce. Potem czas. I like coffee. I read books at home. I work every day. Czas można dać na początek, ale w głównej części szyk pozostaje prosty: Every day, I work.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Обычная английская фраза чаще начинается с того, кто делает действие.',
      'После этого идет само действие.',
      'После действия идет то, что делают: I like coffee, She reads books.',
      'Место часто идет после этого: I read books at home.',
      'Время часто идет в конце или в начале: I work every day / Every day, I work.',
      'Слова вроде usually и often обычно стоят перед обычным действием: I usually work.',
      'С is/are такие слова часто идут после is/are: She is always busy.',
      'Не переноси напрямую порядок "Кофе я люблю" в Coffee I like.',
    ],
    uk: [
      'Звичайна англійська фраза частіше починається з того, хто робить дію.',
      'Після цього йде сама дія.',
      'Після дії йде те, що роблять: I like coffee, She reads books.',
      'Місце часто йде після цього: I read books at home.',
      'Час часто йде в кінці або на початку: I work every day / Every day, I work.',
      'Слова на кшталт usually і often зазвичай стоять перед звичайною дією: I usually work.',
      'З is/are такі слова часто йдуть після is/are: She is always busy.',
      'Не перенось напряму порядок "Каву я люблю" у Coffee I like.',
    ],
    es: [
      'Una afirmacion normal en ingles suele empezar con quien hace la accion.',
      'Despues va la accion.',
      'Despues de la accion va lo que haces: I like coffee, She reads books.',
      'El lugar suele ir despues: I read books at home.',
      'El tiempo suele ir al final o al principio: I work every day / Every day, I work.',
      'Palabras como usually y often suelen ir antes del verbo principal: I usually work.',
      'Con is/are, esas palabras suelen ir despues de is/are: She is always busy.',
      'No lleves directamente el orden flexible de tu idioma a Coffee I like.',
    ],
    'pt-BR': [
      'Comece com quem faz a ação.',
      'Depois coloque a ação.',
      'Depois coloque o quê, onde e quando.',
      'Não mova os blocos tão livremente quanto na sua língua de origem.',
    ],
    vi: [
      'Bắt đầu với người làm hành động.',
      'Sau đó đặt hành động.',
      'Sau đó đặt cái gì, ở đâu và khi nào.',
      'Đừng di chuyển các phần tự do như trong tiếng mẹ đẻ của bạn.',
    ],
    id: [
      'Mulailah dengan siapa yang melakukan aksi.',
      'Lalu letakkan aksinya.',
      'Lalu letakkan apa, di mana, dan kapan.',
      'Jangan memindahkan bagian-bagian sebebas dalam bahasa sumbermu.',
    ],
    tr: [
      'Eylemi kimin yaptığıyla başla.',
      'Sonra eylemi koy.',
      'Sonra neyi, nerede ve ne zaman bilgilerini ekle.',
      'Parçaları kendi ana dilindeki kadar serbest taşıma.',
    ],
    pl: [
      'Zacznij od tego, kto wykonuje czynność.',
      'Potem postaw czynność.',
      'Potem dodaj co, gdzie i kiedy.',
      'Nie przesuwaj części tak swobodnie jak w swoim języku źródłowym.',
    ],
  },
  examples: [
    { en: 'I like coffee.', ru: 'Я люблю кофе.', uk: 'Я люблю каву.', es: 'Me gusta el cafe.', 'pt-BR': 'Eu gosto de café.', vi: 'Tôi thích cà phê.', id: 'Saya suka kopi.', tr: 'Kahveyi severim.', pl: 'Lubię kawę.', why: tri('Сначала I, потом like, потом coffee.', 'Спочатку I, потім like, потім coffee.', 'Primero I, despues like, despues coffee.') },
    { en: 'She reads books at home.', ru: 'Она читает книги дома.', uk: 'Вона читає книжки вдома.', es: 'Ella lee libros en casa.', 'pt-BR': 'Ela lê livros em casa.', vi: 'Cô ấy đọc sách ở nhà.', id: 'Dia membaca buku di rumah.', tr: 'Evde kitap okur.', pl: 'Ona czyta książki w domu.', why: tri('Сначала кто и что делает. Потом books. Потом at home.', 'Спочатку хто і що робить. Потім books. Потім at home.', 'Quien + accion + que + donde.') },
    { en: 'They live in Dublin.', ru: 'Они живут в Дублине.', uk: 'Вони живуть у Дубліні.', es: 'Viven en Dublin.', 'pt-BR': 'Eles moram em Dublin.', vi: 'Họ sống ở Dublin.', id: 'Mereka tinggal di Dublin.', tr: 'Dublin’de yaşıyorlar.', pl: 'Oni mieszkają w Dublinie.', why: tri('They live держится вместе, место идет после.', 'They live тримається разом, місце йде після.', 'They live se mantiene junto; el lugar va despues.') },
    { en: 'My friend works every day.', ru: 'Мой друг работает каждый день.', uk: 'Мій друг працює щодня.', es: 'Mi amigo trabaja todos los dias.', 'pt-BR': 'Meu amigo trabalha todos os dias.', vi: 'Bạn tôi làm việc mỗi ngày.', id: 'Teman saya bekerja setiap hari.', tr: 'Arkadaşım her gün çalışır.', pl: 'Mój przyjaciel pracuje codziennie.', why: tri('Время every day стоит в конце.', 'Час every day стоїть у кінці.', 'El tiempo every day va al final.') },
    { en: 'We usually study in the evening.', ru: 'Мы обычно учимся вечером.', uk: 'Ми зазвичай вчимося ввечері.', es: 'Normalmente estudiamos por la tarde.', 'pt-BR': 'Normalmente estudamos à noite.', vi: 'Chúng tôi thường học vào buổi tối.', id: 'Kami biasanya belajar pada malam hari.', tr: 'Genellikle akşamları ders çalışırız.', pl: 'Zwykle uczymy się wieczorem.', why: tri('Usually стоит рядом с study, а не разрывает всю фразу.', 'Usually стоїть поруч зі study, а не розриває всю фразу.', 'Usually se queda cerca de la accion.') },
    { en: 'She is always busy.', ru: 'Она всегда занята.', uk: 'Вона завжди зайнята.', es: 'Ella siempre esta ocupada.', 'pt-BR': 'Ela está sempre ocupada.', vi: 'Cô ấy luôn bận.', id: 'Dia selalu sibuk.', tr: 'O her zaman meşguldür.', pl: 'Ona zawsze jest zajęta.', why: tri('С is слово always чаще идет после is.', 'З is слово always частіше йде після is.', 'Con is, always suele ir despues de is.') },
    { en: 'I watched a film yesterday.', ru: 'Я посмотрел фильм вчера.', uk: 'Я подивився фільм учора.', es: 'Vi una pelicula ayer.', 'pt-BR': 'Assisti a um filme ontem.', vi: 'Hôm qua tôi đã xem một bộ phim.', id: 'Saya menonton film kemarin.', tr: 'Dün bir film izledim.', pl: 'Obejrzałem film wczoraj.', why: tri('Время yesterday спокойно стоит в конце.', 'Час yesterday спокійно стоїть у кінці.', 'El tiempo yesterday puede ir al final.') },
    { en: 'Every morning, he drinks tea.', ru: 'Каждое утро он пьет чай.', uk: "Щоранку він п'є чай.", es: 'Cada manana, el bebe te.', 'pt-BR': 'Todas as manhãs, ele bebe chá.', vi: 'Mỗi sáng, anh ấy uống trà.', id: 'Setiap pagi, dia minum teh.', tr: 'Her sabah çay içer.', pl: 'Każdego ranka on pije herbatę.', why: tri('Время можно поставить первым, но дальше остается he drinks tea.', 'Час можна поставити першим, але далі лишається he drinks tea.', 'El tiempo puede ir primero; despues queda he drinks tea.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Ты можешь знать все слова и все равно получить фразу, которую тяжело понять. Не потому что слова неправильные. А потому что английский хуже терпит свободную перестановку.',
        'Ти можеш знати всі слова і все одно отримати фразу, яку важко зрозуміти. Не тому що слова неправильні. А тому що англійська гірше терпить вільну перестановку.',
        'Puedes conocer todas las palabras y aun asi crear una frase dificil de seguir.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: CORE_MODEL,
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Главная ловушка: начинать обычную фразу с того, что хочется подчеркнуть по-русски. Для тренировки держим нейтральный вариант: I like coffee.',
        'Головна пастка: починати звичайну фразу з того, що хочеться підкреслити українською. Для тренування тримаємо нейтральний варіант: I like coffee.',
        'Trampa principal: empezar una frase normal con la parte que enfatizarias en tu idioma.',
      ),
    },
  ],
  steps: [
    statementStep({
      id: 'word_order_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'subject_verb_object',
      sentence: 'Choose the correct sentence.',
      translation: tri('Я люблю кофе.', 'Я люблю каву.', 'I like coffee.'),
      options: ['I like coffee.', 'Coffee I like.', 'Like I coffee.', 'I coffee like.'],
      correctAnswer: 'I like coffee.',
      correctFeedback: tri('Да. Сначала I, потом like, потом coffee.', 'Так. Спочатку I, потім like, потім coffee.', 'Yes. I + like + coffee.'),
      wrong: {
        'Coffee I like.': tri('Coffee поставлено первым по русской логике. В нейтральной английской фразе: I like coffee.', 'Coffee поставлено першим за українською логікою. У нейтральній англійській фразі: I like coffee.', 'Coffee is first. Use I like coffee.'),
        'Like I coffee.': tri('Like поставлено перед I. В обычной фразе нужно: I like coffee.', 'Like поставлено перед I. У звичайній фразі потрібно: I like coffee.', 'Use I like coffee.'),
        'I coffee like.': tri('Coffee встало перед like. Нужен ровный вариант: I like coffee.', 'Coffee стало перед like. Потрібен рівний варіант: I like coffee.', 'Use I like coffee.'),
      },
      retryFeedback: frameRetry('I like coffee.'),
      fallbackExplanation: tri('Собери коротко: I + like + coffee.', 'Збери коротко: I + like + coffee.', 'I + like + coffee.'),
      focusWords: ['I', 'like', 'coffee'],
    }),
    statementStep({
      id: 'word_order_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'subject_verb_object',
      sentence: 'Choose the correct sentence.',
      translation: tri('Она читает книги.', 'Вона читає книжки.', 'She reads books.'),
      options: ['She reads books.', 'Books she reads.', 'Reads she books.', 'She books reads.'],
      correctAnswer: 'She reads books.',
      correctFeedback: tri('Да. She reads books звучит ровно и нейтрально.', 'Так. She reads books звучить рівно і нейтрально.', 'Yes. She reads books.'),
      wrong: {
        'Books she reads.': tri('Books вынесено вперед. Для нейтральной фразы: She reads books.', 'Books винесено вперед. Для нейтральної фрази: She reads books.', 'Use She reads books.'),
        'Reads she books.': tri('Reads стоит перед she. В утверждении так не собираем: She reads books.', 'Reads стоїть перед she. У твердженні так не збираємо: She reads books.', 'Use She reads books.'),
        'She books reads.': tri('Books стоит перед reads. Нужен вариант: She reads books.', 'Books стоїть перед reads. Потрібен варіант: She reads books.', 'Use She reads books.'),
      },
      retryFeedback: frameRetry('She reads books.'),
      fallbackExplanation: tri('Кто? She. Что делает? reads. Что? books.', 'Хто? She. Що робить? reads. Що? books.', 'She + reads + books.'),
      focusWords: ['she', 'reads', 'books'],
    }),
    statementStep({
      id: 'word_order_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'subject_verb_place',
      sentence: 'Choose the correct sentence.',
      translation: tri('Они живут в Дублине.', 'Вони живуть у Дубліні.', 'They live in Dublin.'),
      options: ['They live in Dublin.', 'In Dublin they live.', 'Live they in Dublin.', 'They in Dublin live.'],
      correctAnswer: 'They live in Dublin.',
      correctFeedback: tri('Да. They live держится вместе, место идет после.', 'Так. They live тримається разом, місце йде після.', 'Yes. They live in Dublin.'),
      wrong: {
        'In Dublin they live.': tri('In Dublin в начале возможно как сильный акцент. Для тренировки нужен нейтральный вариант: They live in Dublin.', 'In Dublin на початку можливе як сильний акцент. Для тренування потрібен нейтральний варіант: They live in Dublin.', 'Place first is marked here.'),
        'Live they in Dublin.': tri('Live перед they ломает обычную фразу. Нужно: They live in Dublin.', 'Live перед they ламає звичайну фразу. Потрібно: They live in Dublin.', 'Use They live in Dublin.'),
        'They in Dublin live.': tri('In Dublin попало между they и live. Держи вместе: They live in Dublin.', 'In Dublin потрапило між they і live. Тримай разом: They live in Dublin.', 'Keep They live together.'),
      },
      retryFeedback: frameRetry('They live in Dublin.'),
      fallbackExplanation: tri('Кто? They. Что делают? live. Где? in Dublin.', 'Хто? They. Що роблять? live. Де? in Dublin.', 'They + live + in Dublin.'),
      focusWords: ['they', 'live', 'in Dublin'],
    }),
    statementStep({
      id: 'word_order_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'object_place_order',
      sentence: 'Choose the correct sentence.',
      translation: tri('Я читаю книги дома.', 'Я читаю книжки вдома.', 'I read books at home.'),
      options: ['I read books at home.', 'I read at home books.', 'At home I read books.', 'I books read at home.'],
      correctAnswer: 'I read books at home.',
      correctFeedback: tri('Да. Сначала read books, потом at home.', 'Так. Спочатку read books, потім at home.', 'Yes. Read books, then at home.'),
      wrong: {
        'I read at home books.': tri('At home влезло между read и books. Нейтрально: I read books at home.', 'At home влізло між read і books. Нейтрально: I read books at home.', 'Use I read books at home.'),
        'At home I read books.': tri('At home первым звучит как отдельный акцент. Здесь тренируем базовый вариант: I read books at home.', 'At home першим звучить як окремий акцент. Тут тренуємо базовий варіант: I read books at home.', 'Place first is marked here.'),
        'I books read at home.': tri('Books стоит перед read. Нужен вариант: I read books at home.', 'Books стоїть перед read. Потрібен варіант: I read books at home.', 'Use I read books at home.'),
      },
      retryFeedback: frameRetry('I read books at home.'),
      fallbackExplanation: tri('I read what? Books. Where? At home.', 'I read що? Books. Де? At home.', 'Read what? Books. Where? At home.'),
      focusWords: ['read books', 'at home'],
    }),
    statementStep({
      id: 'word_order_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'object_place_time_order',
      sentence: 'Choose the correct sentence.',
      translation: tri('Она пьет кофе на работе каждый день.', "Вона п'є каву на роботі щодня.", 'She drinks coffee at work every day.'),
      options: ['She drinks coffee at work every day.', 'She drinks at work coffee every day.', 'She every day drinks coffee at work.', 'Coffee she drinks at work every day.'],
      correctAnswer: 'She drinks coffee at work every day.',
      correctFeedback: tri('Да. Drinks coffee, потом at work, потом every day.', 'Так. Drinks coffee, потім at work, потім every day.', 'Yes. Drinks coffee, then place, then time.'),
      wrong: {
        'She drinks at work coffee every day.': tri('At work встало перед coffee. Нейтрально: She drinks coffee at work every day.', 'At work стало перед coffee. Нейтрально: She drinks coffee at work every day.', 'Place is too early.'),
        'She every day drinks coffee at work.': tri('Время попало внутрь связки "кто + действие". В базовой фразе его лучше увести в конец или начало.', 'Час потрапив усередину звʼязки "хто + дiя". У базовiй фразi його краще винести в кiнець або на початок.', 'Time splits the core.'),
        'Coffee she drinks at work every day.': tri('Coffee вынесено вперед. Базово: She drinks coffee at work every day.', 'Coffee винесено вперед. Базово: She drinks coffee at work every day.', 'Coffee is too early.'),
      },
      retryFeedback: frameRetry('She drinks coffee at work every day.'),
      fallbackExplanation: tri('Собери по вопросам: кто делает, что делает, что именно, где, когда.', 'Збери за питаннями: хто робить, що робить, що саме, де, коли.', 'What, where, when.'),
      focusWords: ['drinks coffee', 'at work', 'every day'],
    }),
    statementStep({
      id: 'word_order_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'past_object_time_order',
      sentence: 'Choose the correct sentence.',
      translation: tri('Я посмотрел фильм вчера.', 'Я подивився фільм учора.', 'I watched a film yesterday.'),
      options: ['I watched a film yesterday.', 'I yesterday watched a film.', 'A film I watched yesterday.', 'I a film watched yesterday.'],
      correctAnswer: 'I watched a film yesterday.',
      correctFeedback: tri('Да. I watched a film, потом yesterday.', 'Так. I watched a film, потім yesterday.', 'Yes. Time at the end.'),
      wrong: {
        'I yesterday watched a film.': tri('Время встало между человеком и действием. Для базового порядка не разрывай эту пару.', 'Час став мiж людиною i дiєю. Для базового порядку не розривай цю пару.', 'Time splits the core.'),
        'A film I watched yesterday.': tri('A film вынесено вперед. Нейтрально: I watched a film yesterday.', 'A film винесено вперед. Нейтрально: I watched a film yesterday.', 'A film is too early.'),
        'I a film watched yesterday.': tri('A film стоит перед watched. Нужно: I watched a film yesterday.', 'A film стоїть перед watched. Потрібно: I watched a film yesterday.', 'Use I watched a film yesterday.'),
      },
      retryFeedback: frameRetry('I watched a film yesterday.'),
      fallbackExplanation: tri('I watched what? A film. When? Yesterday.', 'I watched що? A film. Коли? Yesterday.', 'What, then when.'),
      focusWords: ['watched a film', 'yesterday'],
    }),
    statementStep({
      id: 'word_order_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'time_beginning_core_order',
      sentence: 'Choose the correct sentence.',
      translation: tri('Каждое утро он пьет чай.', "Щоранку він п'є чай.", 'Every morning, he drinks tea.'),
      options: ['Every morning, he drinks tea.', 'Every morning drinks he tea.', 'Every morning tea he drinks.', 'Every morning he tea drinks.'],
      correctAnswer: 'Every morning, he drinks tea.',
      correctFeedback: tri('Да. Время в начале можно. Дальше все равно he drinks tea.', 'Так. Час на початку можна. Далі все одно he drinks tea.', 'Yes. Time first, then he drinks tea.'),
      wrong: {
        'Every morning drinks he tea.': tri('После Every morning не надо переворачивать: he drinks tea.', 'Після Every morning не треба перевертати: he drinks tea.', 'Do not invert after Every morning.'),
        'Every morning tea he drinks.': tri('Tea вынесено перед he. Нейтрально: Every morning, he drinks tea.', 'Tea винесено перед he. Нейтрально: Every morning, he drinks tea.', 'Tea is too early.'),
        'Every morning he tea drinks.': tri('Tea стоит перед drinks. Нужно: Every morning, he drinks tea.', 'Tea стоїть перед drinks. Потрібно: Every morning, he drinks tea.', 'Use he drinks tea.'),
      },
      retryFeedback: frameRetry('Every morning, he drinks tea.'),
      fallbackExplanation: tri('Every morning + he drinks tea.', 'Every morning + he drinks tea.', 'Every morning + he drinks tea.'),
      focusWords: ['every morning', 'he drinks tea'],
    }),
    statementStep({
      id: 'word_order_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'time_beginning_past',
      sentence: 'Choose the correct sentence.',
      translation: tri('Вчера она купила телефон.', 'Учора вона купила телефон.', 'Yesterday, she bought a phone.'),
      options: ['Yesterday, she bought a phone.', 'Yesterday bought she a phone.', 'Yesterday a phone she bought.', 'Yesterday she a phone bought.'],
      correctAnswer: 'Yesterday, she bought a phone.',
      correctFeedback: tri('Да. Yesterday первым можно, дальше she bought a phone.', 'Так. Yesterday першим можна, далі she bought a phone.', 'Yes. Time first, then she bought a phone.'),
      wrong: {
        'Yesterday bought she a phone.': tri('После Yesterday не нужен порядок bought she. Нужно: she bought a phone.', 'Після Yesterday не потрібен порядок bought she. Потрібно: she bought a phone.', 'Do not invert after Yesterday.'),
        'Yesterday a phone she bought.': tri('A phone вынесено перед she. Базово: Yesterday, she bought a phone.', 'A phone винесено перед she. Базово: Yesterday, she bought a phone.', 'A phone is too early.'),
        'Yesterday she a phone bought.': tri('Предмет встал перед действием. После времени в начале все равно держим порядок: кто, действие, предмет.', 'Предмет став перед дiєю. Пiсля часу на початку все одно тримаємо порядок: хто, дiя, предмет.', 'Use she bought a phone.'),
      },
      retryFeedback: frameRetry('Yesterday, she bought a phone.'),
      fallbackExplanation: tri('Yesterday + she bought a phone.', 'Yesterday + she bought a phone.', 'Yesterday + she bought a phone.'),
      focusWords: ['yesterday', 'she bought', 'a phone'],
    }),
    statementStep({
      id: 'word_order_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'time_beginning_place',
      sentence: 'Choose the correct sentence.',
      translation: tri('После работы мы пошли домой.', 'Після роботи ми пішли додому.', 'After work, we went home.'),
      options: ['After work, we went home.', 'After work went we home.', 'After work home we went.', 'After work we home went.'],
      correctAnswer: 'After work, we went home.',
      correctFeedback: tri('Да. After work первым можно, дальше we went home.', 'Так. After work першим можна, далі we went home.', 'Yes. Time first, then we went home.'),
      wrong: {
        'After work went we home.': tri('Went перед we ломает обычную фразу. Нужно: we went home.', 'Went перед we ламає звичайну фразу. Потрібно: we went home.', 'Use we went home.'),
        'After work home we went.': tri('Home вынесено перед we. Базово: After work, we went home.', 'Home винесено перед we. Базово: After work, we went home.', 'Home is too early.'),
        'After work we home went.': tri('Home стоит перед went. Нужно: After work, we went home.', 'Home стоїть перед went. Потрібно: After work, we went home.', 'Use we went home.'),
      },
      retryFeedback: frameRetry('After work, we went home.'),
      fallbackExplanation: tri('After work + we went home.', 'After work + we went home.', 'After work + we went home.'),
      focusWords: ['after work', 'we went home'],
    }),
    statementStep({
      id: 'word_order_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'frequency_before_main_verb',
      sentence: 'Choose the correct sentence.',
      translation: tri('Я обычно работаю дома.', 'Я зазвичай працюю вдома.', 'I usually work at home.'),
      options: ['I usually work at home.', 'I work usually at home.', 'Usually I at home work.', 'I at home usually work.'],
      correctAnswer: 'I usually work at home.',
      correctFeedback: tri('Да. Usually стоит рядом с work: I usually work.', 'Так. Usually стоїть поруч із work: I usually work.', 'Yes. Usually before work.'),
      wrong: {
        'I work usually at home.': tri('Usually обычно идет перед work. Лучше: I usually work at home.', 'Usually зазвичай іде перед work. Краще: I usually work at home.', 'Usually should go before work.'),
        'Usually I at home work.': tri('At home попало между I и work. Нужно: I usually work at home.', 'At home потрапило між I і work. Потрібно: I usually work at home.', 'Place splits the core.'),
        'I at home usually work.': tri('At home стоит слишком рано. Нейтрально: I usually work at home.', 'At home стоїть занадто рано. Нейтрально: I usually work at home.', 'Use I usually work at home.'),
      },
      retryFeedback: frameRetry('I usually work at home.'),
      fallbackExplanation: tri('I + usually + work + at home.', 'I + usually + work + at home.', 'I + usually + work + at home.'),
      focusWords: ['usually', 'work', 'at home'],
    }),
    statementStep({
      id: 'word_order_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'frequency_after_be',
      sentence: 'Choose the correct sentence.',
      translation: tri('Она всегда занята.', 'Вона завжди зайнята.', 'She is always busy.'),
      options: ['She is always busy.', 'She always is busy.', 'Always she is busy.', 'She busy is always.'],
      correctAnswer: 'She is always busy.',
      correctFeedback: tri('Да. С is слово always чаще стоит после is: She is always busy.', 'Так. З is слово always частіше стоїть після is: She is always busy.', 'Yes. Always after is.'),
      wrong: {
        'She always is busy.': tri('С is лучше так: She is always busy.', 'З is краще так: She is always busy.', 'Use She is always busy.'),
        'Always she is busy.': tri('Always в начале звучит как отдельный сильный акцент. Базово: She is always busy.', 'Always на початку звучить як окремий сильний акцент. Базово: She is always busy.', 'Always first is marked here.'),
        'She busy is always.': tri('Busy стоит перед is. Нужен ровный вариант: She is always busy.', 'Busy стоїть перед is. Потрібен рівний варіант: She is always busy.', 'Use She is always busy.'),
      },
      retryFeedback: frameRetry('She is always busy.'),
      fallbackExplanation: tri('She + is + always + busy.', 'She + is + always + busy.', 'She + is + always + busy.'),
      focusWords: ['is', 'always', 'busy'],
    }),
    statementStep({
      id: 'word_order_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'frequency_question_not_target_but_statement',
      sentence: 'Choose the correct sentence.',
      translation: tri('Они часто звонят мне после работы.', 'Вони часто дзвонять мені після роботи.', 'They often call me after work.'),
      options: ['They often call me after work.', 'They call often me after work.', 'Often they me call after work.', 'They me often call after work.'],
      correctAnswer: 'They often call me after work.',
      correctFeedback: tri('Да. Often рядом с call, а me идет после call.', 'Так. Often поруч із call, а me йде після call.', 'Yes. Often before call; me after call.'),
      wrong: {
        'They call often me after work.': tri('Частотное слово разорвало действие и получателя. В базовом варианте держи этот кусок вместе.', 'Слово частоти розiрвало дiю й отримувача. У базовому варiантi тримай цей шматок разом.', 'Often should not split call me.'),
        'Often they me call after work.': tri('Me стоит перед call. Нужно: They often call me after work.', 'Me стоїть перед call. Потрібно: They often call me after work.', 'Use They often call me after work.'),
        'They me often call after work.': tri('Me стоит слишком рано. Базово: They often call me after work.', 'Me стоїть занадто рано. Базово: They often call me after work.', 'Use They often call me after work.'),
      },
      retryFeedback: frameRetry('They often call me after work.'),
      fallbackExplanation: tri('They + often + call + me + after work.', 'They + often + call + me + after work.', 'They + often + call + me + after work.'),
      focusWords: ['often', 'call me', 'after work'],
    }),
    statementStep({
      id: 'word_order_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_svo_place_time',
      sentence: 'Choose the correct sentence.',
      translation: tri('Мы изучаем английский дома каждый вечер.', 'Ми вивчаємо англійську вдома щовечора.', 'We study English at home every evening.'),
      options: ['We study English at home every evening.', 'We study at home English every evening.', 'English we study at home every evening.', 'We every evening study English at home.'],
      correctAnswer: 'We study English at home every evening.',
      correctFeedback: tri('Да. Сначала основная связка, потом место, потом время.', 'Так. Спочатку основна звʼязка, потiм мiсце, потiм час.', 'Yes. What, where, when.'),
      wrong: {
        'We study at home English every evening.': tri('At home встало перед English. Нейтрально: We study English at home every evening.', 'At home стало перед English. Нейтрально: We study English at home every evening.', 'Place is too early.'),
        'English we study at home every evening.': tri('English вынесено вперед. Базово: We study English at home every evening.', 'English винесено вперед. Базово: We study English at home every evening.', 'English is too early.'),
        'We every evening study English at home.': tri('Время попало между человеком и действием. В обычной фразе не разрываем главный каркас.', 'Час потрапив мiж людиною i дiєю. У звичайнiй фразi не розриваємо головний каркас.', 'Time splits the core.'),
      },
      retryFeedback: frameRetry('We study English at home every evening.'),
      fallbackExplanation: tri('Собери каркас: кто, действие, что именно, место, время.', 'Збери каркас: хто, дiя, що саме, мiсце, час.', 'What, where, when.'),
      focusWords: ['study English', 'at home', 'every evening'],
    }),
    statementStep({
      id: 'word_order_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_time_beginning_core',
      sentence: 'Choose the correct sentence.',
      translation: tri('Каждый день я слушаю музыку на работе.', 'Щодня я слухаю музику на роботі.', 'Every day, I listen to music at work.'),
      options: ['Every day, I listen to music at work.', 'Every day listen I to music at work.', 'Every day music I listen to at work.', 'Every day I at work listen to music.'],
      correctAnswer: 'Every day, I listen to music at work.',
      correctFeedback: tri('Да. Every day можно первым, дальше I listen to music at work.', 'Так. Every day можна першим, далі I listen to music at work.', 'Yes. Time first, then normal order.'),
      wrong: {
        'Every day listen I to music at work.': tri('После Every day не нужен порядок listen I. Нужно: I listen to music at work.', 'Після Every day не потрібен порядок listen I. Потрібно: I listen to music at work.', 'Do not invert after Every day.'),
        'Every day music I listen to at work.': tri('Music вынесено перед I. Нейтрально: Every day, I listen to music at work.', 'Music винесено перед I. Нейтрально: Every day, I listen to music at work.', 'Music is too early.'),
        'Every day I at work listen to music.': tri('Место попало между человеком и действием. Даже если время стоит первым, внутри фразы каркас остается ровным.', 'Мiсце потрапило мiж людиною i дiєю. Навiть якщо час стоїть першим, усерединi фрази каркас лишається рiвним.', 'Place splits the core.'),
      },
      retryFeedback: frameRetry('Every day, I listen to music at work.'),
      fallbackExplanation: tri('Every day + I listen to music at work.', 'Every day + I listen to music at work.', 'Every day + I listen to music at work.'),
      focusWords: ['every day', 'listen to music', 'at work'],
    }),
    statementStep({
      id: 'word_order_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Вчера я отправил ей файл с работы.', 'Учора я надіслав їй файл з роботи.', 'Yesterday, I sent her the file from work.'),
      options: ['Yesterday, I sent her the file from work.', 'Yesterday sent I her the file from work.', 'Yesterday the file I sent her from work.', 'Yesterday I from work sent her the file.'],
      correctAnswer: 'Yesterday, I sent her the file from work.',
      correctFeedback: tri('Да. Yesterday первым можно, дальше I sent her the file from work.', 'Так. Yesterday першим можна, далі I sent her the file from work.', 'Yes. Time first, then normal order.'),
      wrong: {
        'Yesterday sent I her the file from work.': tri('После Yesterday не нужен порядок sent I. Нужно: I sent her the file from work.', 'Після Yesterday не потрібен порядок sent I. Потрібно: I sent her the file from work.', 'Do not invert after Yesterday.'),
        'Yesterday the file I sent her from work.': tri('The file вынесено перед I. Базово: I sent her the file from work.', 'The file винесено перед I. Базово: I sent her the file from work.', 'The file is too early.'),
        'Yesterday I from work sent her the file.': tri('From work попало между I и sent. Нейтрально: I sent her the file from work.', 'From work потрапило між I і sent. Нейтрально: I sent her the file from work.', 'Place/source splits the core.'),
      },
      retryFeedback: frameRetry('Yesterday, I sent her the file from work.'),
      fallbackExplanation: tri('Yesterday + I sent her the file from work.', 'Yesterday + I sent her the file from work.', 'Yesterday + I sent her the file from work.'),
      focusWords: ['yesterday', 'sent her the file', 'from work'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'object_first_error',
      'verb_before_subject_error',
      'missing_subject_error',
      'place_before_object_error',
      'time_inside_core_error',
      'adverb_frequency_position_error',
      'be_adverb_position_error',
      'russian_ukrainian_order_transfer_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем простую рамку: кто + действие + что.', 'Показуємо просту рамку: хто + дія + що.', 'Mostramos el marco simple: quien + accion + que.'),
    depth2: tri('Если есть место, чаще ставим его после того, что делают.', 'Якщо є місце, частіше ставимо його після того, що роблять.', 'Si hay lugar, suele ir despues de lo que haces.'),
    depth3: tri('Если есть время, оно часто идет в конец или начало.', 'Якщо є час, він часто йде в кінець або на початок.', 'Si hay tiempo, suele ir al final o al principio.'),
    depth4: tri('Почти подсказка: система покажет готовую правильную фразу.', 'Майже підказка: система покаже готову правильну фразу.', 'Casi una pista: el sistema muestra la frase correcta lista.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Стоп. Сначала кто. Потом действие. Потом что. Место чаще после этого. Время чаще в конце или начале.',
        'Стоп. Спочатку хто. Потім дія. Потім що. Місце частіше після цього. Час частіше в кінці або на початку.',
        'Para. Primero quien. Despues accion. Despues que. El lugar suele ir despues; el tiempo al final o al principio.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_sentence_parts_hint_then_retry',
      card: tri(
        'Подсказка: система выделит главный каркас, но фразу ты соберешь сам.',
        'Підказка: система виділить головний каркас, але фразу ти збереш сам.',
        'Pista: el sistema marcara el marco principal, pero tu montaras la frase.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбираем, кто действует, потом действие, потом остальной кусок.',
        'Режим підказки: спочатку обираємо, хто діє, потім дію, потім решту шматка.',
        'Modo guiado: primero elegimos quien actua, despues la accion y despues el resto.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_word_order_001',
        prompt: tri('В I like coffee кто стоит первым?', 'У I like coffee хто стоїть першим?', 'En I like coffee, quien va primero?'),
        options: ['I', 'coffee'],
        correctIndex: 0,
        thenReturnToExerciseId: 'word_order_easy_001',
      },
      {
        id: 'guided_word_order_002',
        prompt: tri('В She reads books что идет сразу после She?', 'У She reads books що йде одразу після She?', 'Que va justo despues de She?'),
        options: ['reads', 'books'],
        correctIndex: 0,
        thenReturnToExerciseId: 'word_order_easy_002',
      },
      {
        id: 'guided_word_order_003',
        prompt: tri('В I read books at home что идет раньше: books или at home?', 'У I read books at home що йде раніше: books чи at home?', 'Que va antes: books o at home?'),
        options: ['books', 'at home'],
        correctIndex: 0,
        thenReturnToExerciseId: 'word_order_contrast_001',
      },
      {
        id: 'guided_word_order_004',
        prompt: tri('Если Every morning стоит в начале, надо говорить drinks he tea?', 'Якщо Every morning стоїть на початку, треба казати drinks he tea?', 'Despues de Every morning, decimos drinks he tea?'),
        options: ['да', 'нет'],
        correctIndex: 1,
        thenReturnToExerciseId: 'word_order_contrast_004',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'word_order_basic_statement',
    diagnosisLabel: tri('I like coffee', 'I like coffee', 'Orden de afirmacion'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: SMART_CONTRAST,
    focusPatterns: [
      'subject_verb_object',
      'subject_verb_place',
      'object_place_order',
      'object_place_time_order',
      'past_object_time_order',
      'time_beginning_core_order',
      'time_beginning_past',
      'time_beginning_place',
      'frequency_before_main_verb',
      'frequency_after_be',
      'frequency_question_not_target_but_statement',
      'mixed_svo_place_time',
      'mixed_time_beginning_core',
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
    start: 'diagnosis_training_word_order_basic_statement_start',
    answer: 'diagnosis_training_word_order_basic_statement_answer',
    mastery: 'diagnosis_training_word_order_basic_statement_mastery',
    recovery: 'diagnosis_training_word_order_basic_statement_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'syntax',
      microDiagnosisId: 'word_order_basic_statement',
      contrastSet: SMART_CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logSentencePartOrder: true,
      logMovedElement: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=word_order_basic_statement',
    problemCoachRoute: '/problem_coach?category=syntax&microDiagnosisId=word_order_basic_statement',
    smartTrainerRoute: '/trainer_smart_session?mode=weak&source=diagnosis_training&category=syntax&microDiagnosisId=word_order_basic_statement',
    fallbackIfTrainingMissing: '/problem_coach?category=syntax',
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
