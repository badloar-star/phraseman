import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const FUTURE_PC_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre Present Continuous para planos futuros ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về Present Continuous cho kế hoạch tương lai này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan Present Continuous untuk rencana masa depan ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu gelecek planları için Present Continuous açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie Present Continuous dla planów przyszłych nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? FUTURE_PC_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'am/is/are + verb-ing',
  'future arrangement',
  'tomorrow',
  'on Monday',
  'tonight',
  'next week',
  'going to',
  'will',
  'present continuous now',
];

const SMART_CONTRAST = [
  'am/is/are + verb-ing',
  'future arrangement',
  'tomorrow',
  'on Monday',
  'tonight',
  'next week',
  'going to',
  'will',
];

const MODEL = tri(
  'Present Continuous может говорить не только о действии прямо сейчас. Если рядом есть tomorrow, tonight, next week, on Monday или точное время, та же форма часто показывает уже договоренный план: I am meeting John tomorrow. Форма остается та же: am/is/are + действие с -ing.',
  'Present Continuous може говорити не тільки про дію прямо зараз. Якщо поруч є tomorrow, tonight, next week, on Monday або точний час, та сама форма часто показує вже домовлений план: I am meeting John tomorrow. Форма лишається та сама: am/is/are + дія з -ing.',
  'Present Continuous puede hablar no solo de una accion ahora. Si aparece tomorrow, tonight, next week, on Monday o una hora concreta, la misma forma suele mostrar un plan ya acordado: I am meeting John tomorrow. La forma sigue siendo am/is/are + -ing.',
  {
    'pt-BR': 'Present Continuous pode falar não só de uma ação acontecendo agora. Se aparecer tomorrow, tonight, next week, on Monday ou um horário exato, a mesma forma muitas vezes mostra um plano já combinado: I am meeting John tomorrow. A forma continua a mesma: am/is/are + verbo com -ing.',
    vi: 'Present Continuous không chỉ nói về hành động đang xảy ra ngay bây giờ. Nếu có tomorrow, tonight, next week, on Monday hoặc một giờ cụ thể, cùng dạng này thường chỉ một kế hoạch đã được sắp xếp: I am meeting John tomorrow. Cấu trúc vẫn là am/is/are + động từ -ing.',
    id: 'Present Continuous tidak hanya membicarakan tindakan yang sedang terjadi sekarang. Jika ada tomorrow, tonight, next week, on Monday, atau waktu yang jelas, bentuk yang sama sering menunjukkan rencana yang sudah diatur: I am meeting John tomorrow. Bentuknya tetap sama: am/is/are + kata kerja -ing.',
    tr: 'Present Continuous yalnızca şu anda olan bir eylemi anlatmaz. Yanında tomorrow, tonight, next week, on Monday ya da kesin bir saat varsa, aynı yapı çoğu zaman önceden ayarlanmış bir planı gösterir: I am meeting John tomorrow. Biçim aynı kalır: am/is/are + -ing alan fiil.',
    pl: 'Present Continuous może mówić nie tylko o czynności dziejącej się teraz. Jeśli obok jest tomorrow, tonight, next week, on Monday albo konkretna godzina, ta sama forma często pokazuje już ustalony plan: I am meeting John tomorrow. Forma zostaje taka sama: am/is/are + czasownik z -ing.',
  },
);

const FUTURE_PC_SKILL_ES: Record<string, string> = {
  future_arrangement_meeting: 'Tomorrow marca un plan ya acordado: am meeting.',
  future_arrangement_tonight: 'Tonight marca un plan; con we usa are having.',
  now_vs_tomorrow_pair: 'La forma es igual; now = ahora, tomorrow = plan futuro.',
  she_is_flying: 'Con she usa is flying; on Monday marca futuro.',
  they_are_coming: 'Con they usa are coming; next week marca futuro.',
  i_am_leaving: 'At 8 tomorrow suena a plan concreto: am leaving.',
  question_are_you_working: 'En pregunta, are va antes de you.',
  negative_not_going_out: 'Negativa de Present Continuous: am not going out.',
  question_pair: 'Pregunta: What are you doing tomorrow evening?',
  arrangement_vs_will: 'Cita a las 3 = arreglo: am seeing.',
  spontaneous_will: 'Decision en el momento: will answer.',
  going_to_intention: 'Intencion = am going to start.',
  mixed_now_future_pair: 'Now y on Monday cambian el tiempo, no la forma.',
  mixed_arrangement_will_intention: 'Arreglo = am seeing; decision ahora = will; intencion = going to.',
  mixed_sentence_correction: 'Planes personales: am working / am meeting.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = FUTURE_PC_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? FUTURE_PC_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function futurePcEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = FUTURE_PC_SKILL_ES[input.targetSkill] ?? 'Comprueba el marcador de tiempo y la forma am/is/are + -ing.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(correct: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди маркер времени: now, tomorrow, tonight, next week, on Monday, at 3.',
      'Спочатку знайди маркер часу: now, tomorrow, tonight, next week, on Monday, at 3.',
      'Primero encuentra el marcador de tiempo.',
    ),
    tri(
      'Если это конкретная договоренность в будущем, часто нужна форма am/is/are + -ing.',
      'Якщо це конкретна домовленість у майбутньому, часто потрібна форма am/is/are + -ing.',
      'Un arreglo futuro suele usar am/is/are + -ing.',
    ),
    tri(
      'Проверь маленькое слово перед действием: I am, she is, we/they are.',
      'Перевір маленьке слово перед дією: I am, she is, we/they are.',
      'Comprueba la palabra pequena antes de la accion: am, is o are.',
    ),
    tri(
      'Нужный вариант здесь тот, где договорённость, решение сейчас и план не смешаны.',
      'Потрібний варіант тут той, де домовленість, рішення зараз і план не змішані.',
      `La respuesta aqui es: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Проверь время и форму am/is/are + -ing. Здесь нужно: ${correct}.`,
    `Майже. Перевір час і форму am/is/are + -ing. Тут потрібно: ${correct}.`,
    `Casi. Revisa el marcador de tiempo y usa: ${correct}.`,
  );
}

function futurePcStep(input: {
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
  const esFeedback = futurePcEsFeedback(input);
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
      'Выбери форму для будущей договоренности, действия сейчас, решения через will или намерения через going to.',
      'Обери форму для майбутньої домовленості, дії зараз, рішення через will або наміру через going to.',
      'Elige la forma para arreglo futuro, accion ahora, decision con will o intencion con going to.',
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
      'Коротко: tomorrow, tonight, next week или on Monday могут делать Present Continuous будущим планом. I am meeting tomorrow = уже договорился. The phone is ringing. I will answer it = решение прямо сейчас.',
      'Коротко: tomorrow, tonight, next week або on Monday можуть робити Present Continuous майбутнім планом. I am meeting tomorrow = уже домовився. The phone is ringing. I will answer it = рішення прямо зараз.',
      'Version corta: un marcador futuro mas am/is/are + -ing puede mostrar un arreglo. Will suele mostrar decision ahora.',
    ),
    focusWords: input.focusWords,
  };
}

export const FUTURE_PRESENT_CONTINUOUS_ARRANGEMENTS_TRAINING: DiagnosisTraining = {
  id: 'future_present_continuous_arrangements',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 45,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'Present Continuous для будущих договоренностей',
    'Present Continuous для майбутніх домовленостей',
    'Present Continuous para planes acordados',
    {
      'pt-BR': 'Present Continuous para planos combinados',
      vi: 'Present Continuous cho kế hoạch đã sắp xếp',
      id: 'Present Continuous untuk rencana yang sudah diatur',
      tr: 'Ayarlanmış planlar için Present Continuous',
      pl: 'Present Continuous dla ustalonych planów',
    },
  ),
  shortTitle: tri('Future arrangements', 'Future arrangements', 'Planes acordados', {
    'pt-BR': 'Planos combinados',
    vi: 'Kế hoạch đã sắp xếp',
    id: 'Rencana yang sudah diatur',
    tr: 'Ayarlanmış planlar',
    pl: 'Ustalone plany',
  }),
  shortDiagnosis: tri(
    'Ты видишь am meeting и думаешь только “прямо сейчас”, хотя tomorrow может делать это будущим планом.',
    'Ти бачиш am meeting і думаєш тільки “прямо зараз”, хоча tomorrow може робити це майбутнім планом.',
    'Lees am meeting solo como ahora, aunque tomorrow puede convertirlo en plan futuro.',
    {
      'pt-BR': 'Você vê am meeting e pensa só em "agora", embora tomorrow possa transformar isso em um plano futuro.',
      vi: 'Bạn thấy am meeting và chỉ nghĩ là "ngay bây giờ", dù tomorrow có thể biến nó thành kế hoạch tương lai.',
      id: 'Kamu melihat am meeting dan hanya berpikir "sekarang", padahal tomorrow bisa membuatnya menjadi rencana masa depan.',
      tr: 'Am meeting görünce yalnızca "şu anda" diye düşünüyorsun, oysa tomorrow bunu gelecek planı yapabilir.',
      pl: 'Widzisz am meeting i myślisz tylko "teraz", chociaż tomorrow może zmienić to w plan na przyszłość.',
    },
  ),
  diagnosisText: tri(
    'Ошибка появляется, когда форма am/is/are + -ing автоматически воспринимается как действие сейчас. Но I am meeting John tomorrow не значит “я прямо сейчас его встречаю”. Это уже назначенная встреча в будущем.',
    'Помилка зʼявляється, коли форма am/is/are + -ing автоматично сприймається як дія зараз. Але I am meeting John tomorrow не означає “я прямо зараз його зустрічаю”. Це вже призначена зустріч у майбутньому.',
    'El error aparece cuando am/is/are + -ing se entiende solo como ahora. Con tomorrow, puede ser un plan ya acordado para el futuro.',
    {
      'pt-BR': 'O erro aparece quando am/is/are + -ing é entendido automaticamente como uma ação agora. Mas I am meeting John tomorrow não significa "estou encontrando John neste exato momento". É um encontro já marcado para o futuro.',
      vi: 'Lỗi xuất hiện khi am/is/are + -ing tự động được hiểu là hành động đang xảy ra bây giờ. Nhưng I am meeting John tomorrow không có nghĩa là "tôi đang gặp John ngay lúc này". Đó là một cuộc hẹn đã được sắp xếp trong tương lai.',
      id: 'Kesalahan muncul ketika am/is/are + -ing otomatis dipahami sebagai tindakan sekarang. Tetapi I am meeting John tomorrow bukan berarti "saya sedang bertemu John sekarang". Itu adalah janji yang sudah diatur untuk masa depan.',
      tr: 'Hata, am/is/are + -ing yapısını otomatik olarak şu anda olan eylem diye anladığında ortaya çıkar. Ama I am meeting John tomorrow "John ile şu anda buluşuyorum" demek değildir. Bu, gelecekte ayarlanmış bir buluşmadır.',
      pl: 'Błąd pojawia się, gdy forma am/is/are + -ing automatycznie kojarzy się z czynnością teraz. Ale I am meeting John tomorrow nie znaczy "spotykam Johna dokładnie teraz". To już umówione spotkanie w przyszłości.',
    },
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    'Для личной договоренности в будущем часто звучит Present Continuous: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week. Для решения в момент речи часто звучит will: I will answer it.',
    'Для особистої домовленості в майбутньому часто звучить Present Continuous: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week. Для рішення в момент мовлення часто звучить will: I will answer it.',
    'Plan acordado: I am meeting him tomorrow. Decision ahora: I will answer it.',
    {
      'pt-BR': 'Para um compromisso pessoal no futuro, muitas vezes usamos Present Continuous: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week. Para uma decisão tomada no momento da fala, muitas vezes usamos will: I will answer it.',
      vi: 'Với một sắp xếp cá nhân trong tương lai, tiếng Anh thường dùng Present Continuous: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week. Với quyết định ngay lúc nói, thường dùng will: I will answer it.',
      id: 'Untuk janji pribadi di masa depan, bahasa Inggris sering memakai Present Continuous: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week. Untuk keputusan saat berbicara, sering dipakai will: I will answer it.',
      tr: 'Gelecekteki kişisel bir düzenleme için çoğu zaman Present Continuous kullanılır: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week. Konuşma anında alınan karar için çoğu zaman will kullanılır: I will answer it.',
      pl: 'Dla osobistego ustalenia w przyszłości często używa się Present Continuous: I am meeting him tomorrow. We are having dinner tonight. She is leaving next week. Dla decyzji podjętej w chwili mówienia często używa się will: I will answer it.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Present Continuous может описывать будущую договоренность: I am meeting him tomorrow.',
      'Будущий смысл обычно виден через tomorrow, tonight, next week, on Monday или at 6.',
      'Форма остается am/is/are + -ing: I am meeting, she is flying, they are coming.',
      'Контекст времени решает, это действие сейчас или будущий план.',
      'Will часто подходит для решения прямо сейчас, обещания или прогноза.',
      'Going to часто показывает намерение или план, но не обязательно уже назначенную встречу.',
      'Present Continuous для будущего звучит как конкретная договоренность.',
      'Не говори I meeting him tomorrow. Нужно I am meeting.',
      'Не говори I am meet him tomorrow. Нужно I am meeting.',
      'Личные договоренности часто звучат через Present Continuous.',
    ],
    uk: [
      'Present Continuous може описувати майбутню домовленість: I am meeting him tomorrow.',
      'Майбутній зміст зазвичай видно через tomorrow, tonight, next week, on Monday або at 6.',
      'Форма лишається am/is/are + -ing: I am meeting, she is flying, they are coming.',
      'Контекст часу вирішує, це дія зараз чи майбутній план.',
      'Will часто підходить для рішення прямо зараз, обіцянки або прогнозу.',
      'Going to часто показує намір або план, але не обовʼязково вже призначену зустріч.',
      'Present Continuous для майбутнього звучить як конкретна домовленість.',
      'Не кажи I meeting him tomorrow. Потрібно I am meeting.',
      'Не кажи I am meet him tomorrow. Потрібно I am meeting.',
      'Особисті домовленості часто звучать через Present Continuous.',
    ],
    es: [
      'Present Continuous puede describir un plan futuro ya acordado.',
      'El sentido futuro suele verse con tomorrow, tonight, next week, on Monday o at 6.',
      'Usa am/is/are + -ing.',
      'El contexto de tiempo decide si es ahora o futuro.',
      'Will suele encajar con decision ahora, promesa o prediccion.',
      'Going to suele mostrar intencion.',
      'Present Continuous para futuro suena concreto.',
      'No omitas am/is/are.',
      'No uses am meet.',
      'Los planes personales suelen usar Present Continuous.',
    ],
    'pt-BR': [
      'Present Continuous pode descrever um compromisso futuro: I am meeting him tomorrow.',
      'O sentido futuro geralmente aparece com tomorrow, tonight, next week, on Monday ou at 6.',
      'Use am/is/are + -ing: I am meeting, she is flying, they are coming.',
      'O contexto de tempo decide se é uma ação agora ou um plano futuro.',
      'Will muitas vezes combina com uma decisão tomada agora, promessa ou previsão.',
      'Going to muitas vezes mostra intenção ou plano.',
      'Present Continuous para o futuro soa como um compromisso concreto.',
      'Não omita am/is/are.',
      'Não use am meet.',
      'Compromissos pessoais muitas vezes usam Present Continuous.',
    ],
    vi: [
      'Present Continuous có thể diễn tả một cuộc hẹn/sắp xếp trong tương lai: I am meeting him tomorrow.',
      'Nghĩa tương lai thường thấy qua tomorrow, tonight, next week, on Monday hoặc at 6.',
      'Dùng am/is/are + -ing: I am meeting, she is flying, they are coming.',
      'Ngữ cảnh thời gian quyết định đây là hành động hiện tại hay kế hoạch tương lai.',
      'Will thường hợp với quyết định ngay lúc nói, lời hứa hoặc dự đoán.',
      'Going to thường thể hiện ý định hoặc kế hoạch.',
      'Present Continuous cho tương lai nghe như một sắp xếp cụ thể.',
      'Đừng bỏ am/is/are.',
      'Đừng dùng am meet.',
      'Các sắp xếp cá nhân thường dùng Present Continuous.',
    ],
    id: [
      'Present Continuous dapat menggambarkan janji atau rencana yang sudah diatur di masa depan: I am meeting him tomorrow.',
      'Makna masa depan biasanya terlihat dari tomorrow, tonight, next week, on Monday, atau at 6.',
      'Gunakan am/is/are + -ing: I am meeting, she is flying, they are coming.',
      'Konteks waktu menentukan apakah ini tindakan sekarang atau rencana masa depan.',
      'Will sering cocok untuk keputusan saat ini, janji, atau prediksi.',
      'Going to sering menunjukkan niat atau rencana.',
      'Present Continuous untuk masa depan terdengar seperti pengaturan yang konkret.',
      'Jangan menghilangkan am/is/are.',
      'Jangan gunakan am meet.',
      'Pengaturan pribadi sering memakai Present Continuous.',
    ],
    tr: [
      'Present Continuous gelecekteki ayarlanmış bir planı anlatabilir: I am meeting him tomorrow.',
      'Gelecek anlamı genellikle tomorrow, tonight, next week, on Monday veya at 6 ile görünür.',
      'am/is/are + -ing kullan: I am meeting, she is flying, they are coming.',
      'Zaman bağlamı bunun şu anki eylem mi yoksa gelecek planı mı olduğunu belirler.',
      'Will çoğu zaman o anda verilen karar, söz veya tahmin için uygundur.',
      'Going to çoğu zaman niyet veya plan gösterir.',
      'Gelecek için Present Continuous somut bir plan gibi duyulur.',
      'am/is/are sözcüklerini atlama.',
      'am meet kullanma.',
      'Kişisel ayarlanmış planlarda sıkça Present Continuous kullanılır.',
    ],
    pl: [
      'Present Continuous może opisywać przyszłe ustalenie: I am meeting him tomorrow.',
      'Znaczenie przyszłe zwykle widać po tomorrow, tonight, next week, on Monday albo at 6.',
      'Użyj am/is/are + -ing: I am meeting, she is flying, they are coming.',
      'Kontekst czasu decyduje, czy to czynność teraz, czy przyszły plan.',
      'Will często pasuje do decyzji podjętej teraz, obietnicy albo przewidywania.',
      'Going to często pokazuje zamiar lub plan.',
      'Present Continuous dla przyszłości brzmi jak konkretne ustalenie.',
      'Nie pomijaj am/is/are.',
      'Nie używaj am meet.',
      'Osobiste ustalenia często używają Present Continuous.',
    ],
  },
  examples: [
    {
      en: 'I am meeting John tomorrow.',
      ru: 'Я завтра встречаюсь с Джоном.',
      uk: 'Я завтра зустрічаюся з Джоном.',
      es: 'Manana me reuno con John.',
      'pt-BR': 'Vou me encontrar com John amanhã.',
      vi: 'Tôi sẽ gặp John vào ngày mai.',
      id: 'Saya akan bertemu John besok.',
      tr: 'Yarın John ile buluşuyorum.',
      pl: 'Jutro spotykam się z Johnem.',
      why: tri('Tomorrow делает это будущей договоренностью.', 'Tomorrow робить це майбутньою домовленістю.', 'Tomorrow lo convierte en un plan futuro acordado.'),
    },
    {
      en: 'She is flying to London on Monday.',
      ru: 'Она летит в Лондон в понедельник.',
      uk: 'Вона летить до Лондона в понеділок.',
      es: 'Ella vuela a Londres el lunes.',
      'pt-BR': 'Ela voa para Londres na segunda-feira.',
      vi: 'Cô ấy bay đến London vào thứ Hai.',
      id: 'Dia terbang ke London pada hari Senin.',
      tr: "Pazartesi Londra'ya uçuyor.",
      pl: 'Ona leci do Londynu w poniedziałek.',
      why: tri('On Monday показывает будущий план.', 'On Monday показує майбутній план.', 'On Monday marca un plan futuro.'),
    },
    {
      en: 'We are having dinner tonight.',
      ru: 'Мы сегодня вечером ужинаем.',
      uk: 'Ми сьогодні ввечері вечеряємо.',
      es: 'Cenamos esta noche.',
      'pt-BR': 'Nós vamos jantar hoje à noite.',
      vi: 'Tối nay chúng tôi sẽ ăn tối.',
      id: 'Kami akan makan malam nanti malam.',
      tr: 'Bu akşam akşam yemeği yiyoruz.',
      pl: 'Dziś wieczorem jemy kolację.',
      why: tri('Tonight показывает договоренность на вечер.', 'Tonight показує домовленість на вечір.', 'Tonight marca un plan acordado para la noche.'),
    },
    {
      en: 'They are coming next week.',
      ru: 'Они приезжают на следующей неделе.',
      uk: 'Вони приїжджають наступного тижня.',
      es: 'Ellos vienen la semana que viene.',
      'pt-BR': 'Eles vêm na semana que vem.',
      vi: 'Họ sẽ đến vào tuần tới.',
      id: 'Mereka akan datang minggu depan.',
      tr: 'Gelecek hafta geliyorlar.',
      pl: 'Oni przyjeżdżają w przyszłym tygodniu.',
      why: tri('Next week переносит форму в будущее.', 'Next week переносить форму в майбутнє.', 'Next week fija tiempo futuro.'),
    },
    {
      en: 'Are you working tomorrow?',
      ru: 'Ты завтра работаешь?',
      uk: 'Ти завтра працюєш?',
      es: 'Trabajas manana?',
      'pt-BR': 'Você trabalha amanhã?',
      vi: 'Ngày mai bạn có làm việc không?',
      id: 'Apakah kamu bekerja besok?',
      tr: 'Yarın çalışıyor musun?',
      pl: 'Pracujesz jutro?',
      why: tri('Вопрос про смену или план на завтра.', 'Питання про зміну або план на завтра.', 'Pregunta por un turno o plan de manana.'),
    },
    {
      en: 'I am not going out tonight.',
      ru: 'Я сегодня вечером никуда не иду.',
      uk: 'Я сьогодні ввечері нікуди не йду.',
      es: 'Esta noche no voy a salir.',
      'pt-BR': 'Eu não vou sair hoje à noite.',
      vi: 'Tối nay tôi không đi ra ngoài.',
      id: 'Saya tidak akan keluar malam ini.',
      tr: 'Bu gece dışarı çıkmıyorum.',
      pl: 'Nie wychodzę dziś wieczorem.',
      why: tri('Tonight делает отрицание будущим планом.', 'Tonight робить заперечення майбутнім планом.', 'Tonight lo convierte en plan futuro.'),
    },
    {
      en: 'I am calling him now.',
      ru: 'Я звоню ему сейчас.',
      uk: 'Я дзвоню йому зараз.',
      es: 'Lo estoy llamando ahora.',
      'pt-BR': 'Estou ligando para ele agora.',
      vi: 'Tôi đang gọi cho anh ấy bây giờ.',
      id: 'Saya sedang menelepon dia sekarang.',
      tr: 'Onu şimdi arıyorum.',
      pl: 'Dzwonię do niego teraz.',
      why: tri('Now показывает действие сейчас.', 'Now показує дію зараз.', 'Now significa accion actual.'),
    },
    {
      en: 'I am calling him tomorrow.',
      ru: 'Я позвоню ему завтра.',
      uk: 'Я зателефоную йому завтра.',
      es: 'Lo llamo manana.',
      'pt-BR': 'Vou ligar para ele amanhã.',
      vi: 'Tôi sẽ gọi cho anh ấy vào ngày mai.',
      id: 'Saya akan menelepon dia besok.',
      tr: 'Onu yarın arıyorum.',
      pl: 'Jutro do niego dzwonię.',
      why: tri('Tomorrow меняет тот же шаблон на будущий план.', 'Tomorrow змінює той самий шаблон на майбутній план.', 'Tomorrow convierte la misma forma en un plan futuro.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Ты можешь увидеть am meeting и подумать: “это же сейчас”. Но завтра в предложении меняет сцену.',
        'Ти можеш побачити am meeting і подумати: “це ж зараз”. Але завтра в реченні змінює сцену.',
        'Un marcador futuro cambia la escena.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Форма та же: am/is/are + -ing. Но с tomorrow, tonight или next week она часто значит: это уже договорено.',
        'Форма та сама: am/is/are + -ing. Але з tomorrow, tonight або next week вона часто означає: це вже домовлено.',
        'Misma forma, marcador futuro, plan ya acordado.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Не обрезай маленькое am/is/are: не I meeting tomorrow, а I am meeting tomorrow.',
        'Не обрізай маленьке am/is/are: не I meeting tomorrow, а I am meeting tomorrow.',
        'No omitas am/is/are.',
      ),
    },
  ],
  steps: [
    futurePcStep({
      id: 'future_pc_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'future_arrangement_meeting',
      sentence: 'I ___ John tomorrow.',
      translation: tri('Я завтра встречаюсь с Джоном.', 'Я завтра зустрічаюся з Джоном.', 'I am meeting John tomorrow.'),
      options: ['am meeting', 'meet', 'meeting', 'am meet'],
      correctAnswer: 'am meeting',
      correctFeedback: tri(
        'Да. Tomorrow показывает будущую договоренность: I am meeting John tomorrow.',
        'Так. Tomorrow показує майбутню домовленість: I am meeting John tomorrow.',
        'Yes. Tomorrow marks a future arrangement: am meeting.',
      ),
      wrong: {
        meet: tri(
          'Meet звучит как расписание или общий факт. Для личной встречи завтра здесь лучше am meeting.',
          'Meet звучить як розклад або загальний факт. Для особистої зустрічі завтра тут краще am meeting.',
          'For a personal arrangement tomorrow, use am meeting.',
        ),
        meeting: tri(
          'Meeting без am неполное. Нужно am meeting.',
          'Meeting без am неповне. Потрібно am meeting.',
          'Meeting needs am: am meeting.',
        ),
        'am meet': tri(
          'После am действие идет с -ing: am meeting.',
          'Після am дія йде з -ing: am meeting.',
          'After am, use meeting.',
        ),
      },
      focusWords: ['am meeting', 'tomorrow'],
    }),
    futurePcStep({
      id: 'future_pc_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'future_arrangement_tonight',
      sentence: 'We ___ dinner tonight.',
      translation: tri('Мы сегодня вечером ужинаем.', 'Ми сьогодні ввечері вечеряємо.', 'We are having dinner tonight.'),
      options: ['are having', 'have', 'having', 'are have'],
      correctAnswer: 'are having',
      correctFeedback: tri(
        'Да. Tonight показывает план на вечер, а we берет are: are having.',
        'Так. Tonight показує план на вечір, а we бере are: are having.',
        'Yes. Tonight marks a future plan, and we takes are.',
      ),
      wrong: {
        have: tri(
          'Have звучит как обычная привычка. Для конкретного плана сегодня вечером нужно are having.',
          'Have звучить як звичайна звичка. Для конкретного плану сьогодні ввечері потрібно are having.',
          'For a concrete plan tonight, use are having.',
        ),
        having: tri(
          'Having без are неполное. Нужно are having.',
          'Having без are неповне. Потрібно are having.',
          'Having needs are.',
        ),
        'are have': tri(
          'После are действие идет с -ing: are having.',
          'Після are дія йде з -ing: are having.',
          'After are, use having.',
        ),
      },
      focusWords: ['are having', 'tonight'],
    }),
    futurePcStep({
      id: 'future_pc_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'now_vs_tomorrow_pair',
      sentence: 'Choose the correct pair.',
      translation: tri(
        'Выбери пару: звоню сейчас / звоню завтра.',
        'Обери пару: дзвоню зараз / дзвоню завтра.',
        'I am calling now / I am calling tomorrow',
      ),
      options: [
        'I am calling now / I am calling tomorrow',
        'I call now / I call tomorrow',
        'I calling now / I calling tomorrow',
        'I am call now / I am call tomorrow',
      ],
      correctAnswer: 'I am calling now / I am calling tomorrow',
      correctFeedback: tri(
        'Да. Форма одна, но now дает действие сейчас, а tomorrow дает будущий план.',
        'Так. Форма одна, але now дає дію зараз, а tomorrow дає майбутній план.',
        'Yes. Same form, different time marker.',
      ),
      wrong: {
        'I call now / I call tomorrow': tri(
          'Для действия сейчас и конкретного плана завтра естественнее I am calling.',
          'Для дії зараз і конкретного плану завтра природніше I am calling.',
          'For now-action and concrete plan, use I am calling.',
        ),
        'I calling now / I calling tomorrow': tri(
          'Calling без am неполное. Нужно I am calling.',
          'Calling без am неповне. Потрібно I am calling.',
          'Calling needs am.',
        ),
        'I am call now / I am call tomorrow': tri(
          'После am нужно calling: I am calling.',
          'Після am потрібно calling: I am calling.',
          'After am, use calling.',
        ),
      },
      focusWords: ['am calling now', 'am calling tomorrow'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'she_is_flying',
      sentence: 'She ___ to London on Monday.',
      translation: tri('Она летит в Лондон в понедельник.', 'Вона летить до Лондона в понеділок.', 'She is flying to London on Monday.'),
      options: ['is flying', 'are flying', 'flies', 'is fly'],
      correctAnswer: 'is flying',
      correctFeedback: tri(
        'Да. She берет is, а on Monday показывает будущий план: is flying.',
        'Так. She бере is, а on Monday показує майбутній план: is flying.',
        'Yes. She takes is, and on Monday marks a future plan.',
      ),
      wrong: {
        'are flying': tri(
          'Are не подходит к she. Здесь нужно is flying.',
          'Are не підходить до she. Тут потрібно is flying.',
          'She takes is flying.',
        ),
        flies: tri(
          'Flies может звучать как расписание. Для ее личной поездки в понедельник лучше is flying.',
          'Flies може звучати як розклад. Для її особистої поїздки в понеділок краще is flying.',
          'For her arranged trip, use is flying.',
        ),
        'is fly': tri(
          'После is нужно flying: is flying.',
          'Після is потрібно flying: is flying.',
          'After is, use flying.',
        ),
      },
      focusWords: ['is flying', 'on Monday'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'they_are_coming',
      sentence: 'They ___ next week.',
      translation: tri('Они приезжают на следующей неделе.', 'Вони приїжджають наступного тижня.', 'They are coming next week.'),
      options: ['are coming', 'is coming', 'come', 'are come'],
      correctAnswer: 'are coming',
      correctFeedback: tri(
        'Да. They берет are, а next week переносит действие в будущий план.',
        'Так. They бере are, а next week переносить дію в майбутній план.',
        'Yes. They takes are, and next week sets future time.',
      ),
      wrong: {
        'is coming': tri(
          'Is не подходит к they. Нужно are coming.',
          'Is не підходить до they. Потрібно are coming.',
          'They takes are coming.',
        ),
        come: tri(
          'Come может звучать как факт или расписание. Для договоренного визита лучше are coming.',
          'Come може звучати як факт або розклад. Для домовленого візиту краще are coming.',
          'For an arranged visit, use are coming.',
        ),
        'are come': tri(
          'После are нужно coming: are coming.',
          'Після are потрібно coming: are coming.',
          'After are, use coming.',
        ),
      },
      focusWords: ['are coming', 'next week'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'i_am_leaving',
      sentence: 'I ___ at 8 tomorrow.',
      translation: tri('Я завтра ухожу в 8.', 'Я завтра йду о 8.', 'I am leaving at 8 tomorrow.'),
      options: ['am leaving', 'leave', 'leaving', 'am leave'],
      correctAnswer: 'am leaving',
      correctFeedback: tri(
        'Да. At 8 tomorrow звучит как конкретный план: am leaving.',
        'Так. At 8 tomorrow звучить як конкретний план: am leaving.',
        'Yes. At 8 tomorrow sounds like a concrete plan.',
      ),
      wrong: {
        leave: tri(
          'Leave может быть расписанием, но для личной договорённости здесь естественнее am leaving.',
          'Leave може бути розкладом, але для особистої домовленості тут природніше am leaving.',
          'For a personal arrangement, use am leaving.',
        ),
        leaving: tri(
          'Leaving без am неполное. Нужно am leaving.',
          'Leaving без am неповне. Потрібно am leaving.',
          'Leaving needs am.',
        ),
        'am leave': tri(
          'После am нужно leaving: am leaving.',
          'Після am потрібно leaving: am leaving.',
          'After am, use leaving.',
        ),
      },
      focusWords: ['am leaving', 'at 8 tomorrow'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'question_are_you_working',
      sentence: '___ you working tomorrow?',
      translation: tri('Ты завтра работаешь?', 'Ти завтра працюєш?', 'Are you working tomorrow?'),
      options: ['Are', 'Do', 'Will', 'Did'],
      correctAnswer: 'Are',
      correctFeedback: tri(
        'Да. В вопросе Present Continuous маленькое слово выходит вперед: Are you working tomorrow?',
        'Так. У питанні Present Continuous маленьке слово виходить уперед: Are you working tomorrow?',
        'Yes. In the question, are goes before you.',
      ),
      wrong: {
        Do: tri(
          'Do you working не работает. Нужна форма Are you working tomorrow?',
          'Do you working не працює. Потрібна форма Are you working tomorrow?',
          'Use Are you working tomorrow?',
        ),
        Will: tri(
          'Will you work возможно в другом оттенке. Но для запланированной смены здесь нужно Are you working tomorrow?',
          'Will you work можливе в іншому відтінку. Але для запланованої зміни тут потрібно Are you working tomorrow?',
          'For a planned shift, use Are you working tomorrow?',
        ),
        Did: tri(
          'Did уводит в прошлое. Tomorrow просит будущий план: Are you working tomorrow?',
          'Did веде в минуле. Tomorrow просить майбутній план: Are you working tomorrow?',
          'Tomorrow needs a future plan: Are you working tomorrow?',
        ),
      },
      focusWords: ['are you working'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'negative_not_going_out',
      sentence: 'I ___ going out tonight.',
      translation: tri('Я сегодня вечером никуда не иду.', 'Я сьогодні ввечері нікуди не йду.', 'I am not going out tonight.'),
      options: ['am not', 'do not', 'will not', 'did not'],
      correctAnswer: 'am not',
      correctFeedback: tri(
        'Да. Отрицание в этой форме: am not going out.',
        'Так. Заперечення в цій формі: am not going out.',
        'Yes. Present Continuous negative: am not going out.',
      ),
      wrong: {
        'do not': tri(
          'Do not going out не работает. Нужно am not going out.',
          'Do not going out не працює. Потрібно am not going out.',
          'Use am not going out.',
        ),
        'will not': tri(
          'Will not go out возможно, но как уже решенный план на tonight естественнее am not going out.',
          'Will not go out можливо, але як уже вирішений план на tonight природніше am not going out.',
          'For a settled plan tonight, use am not going out.',
        ),
        'did not': tri(
          'Did not уводит в прошлое, а tonight здесь про будущий вечер.',
          'Did not веде в минуле, а tonight тут про майбутній вечір.',
          'Did not is past. Tonight is future here.',
        ),
      },
      focusWords: ['am not going out'],
    }),
    futurePcStep({
      id: 'future_pc_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'question_pair',
      sentence: 'Choose the correct question.',
      translation: tri(
        'Что ты делаешь завтра вечером?',
        'Що ти робиш завтра ввечері?',
        'What are you doing tomorrow evening?',
      ),
      options: [
        'What are you doing tomorrow evening?',
        'What do you doing tomorrow evening?',
        'What will you doing tomorrow evening?',
        'What did you doing tomorrow evening?',
      ],
      correctAnswer: 'What are you doing tomorrow evening?',
      correctFeedback: tri(
        'Да. Вопрос звучит так: What are you doing tomorrow evening?',
        'Так. Питання звучить так: What are you doing tomorrow evening?',
        'Yes. Question word + are + you + doing.',
      ),
      wrong: {
        'What do you doing tomorrow evening?': tri(
          'Do you doing не работает. Нужно are you doing.',
          'Do you doing не працює. Потрібно are you doing.',
          'Use are you doing.',
        ),
        'What will you doing tomorrow evening?': tri(
          'Will you doing не работает. С will было бы will do, а для планов здесь лучше are you doing.',
          'Will you doing не працює. З will було б will do, а для планів тут краще are you doing.',
          'Use are you doing for plans.',
        ),
        'What did you doing tomorrow evening?': tri(
          'Did не подходит к tomorrow evening и не работает с doing. Нужно What are you doing tomorrow evening?',
          'Did не підходить до tomorrow evening і не працює з doing. Потрібно What are you doing tomorrow evening?',
          'Use What are you doing tomorrow evening?',
        ),
      },
      focusWords: ['what are you doing'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'arrangement_vs_will',
      sentence: 'I ___ my doctor at 3 tomorrow.',
      translation: tri('Я завтра в 3 иду к врачу.', 'Я завтра о 3 йду до лікаря.', 'I am seeing my doctor at 3 tomorrow.'),
      options: ['am seeing', 'will see', 'see', 'am see'],
      correctAnswer: 'am seeing',
      correctFeedback: tri(
        'Да. Врач в 3 завтра звучит как назначенная встреча: am seeing.',
        'Так. Лікар о 3 завтра звучить як призначена зустріч: am seeing.',
        'Yes. Appointment at 3 tomorrow: am seeing.',
      ),
      wrong: {
        'will see': tri(
          'Will see возможно в другом смысле. Но для записанного приема лучше am seeing.',
          'Will see можливе в іншому сенсі. Але для записаного прийому краще am seeing.',
          'For a booked appointment, use am seeing.',
        ),
        see: tri(
          'See здесь слишком похоже на расписание или общий факт. Для личной записи лучше am seeing.',
          'See тут занадто схоже на розклад або загальний факт. Для особистого запису краще am seeing.',
          'For a personal appointment, use am seeing.',
        ),
        'am see': tri(
          'После am нужно seeing: am seeing.',
          'Після am потрібно seeing: am seeing.',
          'After am, use seeing.',
        ),
      },
      focusWords: ['am seeing', 'doctor at 3'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'spontaneous_will',
      sentence: 'The phone is ringing. I ___ answer it.',
      translation: tri('Звонит телефон. Я отвечу.', 'Дзвонить телефон. Я відповім.', 'The phone is ringing. I will answer it.'),
      options: ['will', 'am answering', 'answer', 'am answer'],
      correctAnswer: 'will',
      correctFeedback: tri(
        'Да. Это решение прямо сейчас, не заранее назначенный план: will answer.',
        'Так. Це рішення прямо зараз, не заздалегідь призначений план: will answer.',
        'Yes. Decision now: will answer.',
      ),
      wrong: {
        'am answering': tri(
          'Am answering звучит как действие сейчас или договоренный план. Тут решение принимается в момент речи: will answer.',
          'Am answering звучить як дія зараз або домовлений план. Тут рішення приймається в момент мовлення: will answer.',
          'Decision now: will answer.',
        ),
        answer: tri(
          'I answer it не передает решение “сейчас отвечу”. Нужна форма I will answer it.',
          'I answer it не передає рішення “зараз відповім”. Потрібна форма I will answer it.',
          'Use I will answer it.',
        ),
        'am answer': tri(
          'Am answer не работает. Для решения прямо сейчас нужно will answer.',
          'Am answer не працює. Для рішення прямо зараз потрібно will answer.',
          'Use will answer for the decision now.',
        ),
      },
      focusWords: ['will answer'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'going_to_intention',
      sentence: 'I ___ start learning English next month.',
      translation: tri(
        'Я собираюсь начать учить английский в следующем месяце.',
        'Я збираюся почати вчити англійську наступного місяця.',
        'I am going to start learning English next month.',
      ),
      options: ['am going to', 'am starting', 'will to', 'going'],
      correctAnswer: 'am going to',
      correctFeedback: tri(
        'Да. Для намерения здесь хорошо звучит am going to start.',
        'Так. Для наміру тут добре звучить am going to start.',
        'Yes. For intention, use am going to start.',
      ),
      wrong: {
        'am starting': tri(
          'Am starting возможно при конкретной договоренности. Но здесь смысл намерения: am going to start.',
          'Am starting можливе за конкретної домовленості. Але тут зміст наміру: am going to start.',
          'For intention, going to fits better.',
        ),
        'will to': tri(
          'Will to не работает. Не ставь to сразу после will.',
          'Will to не працює. Не став to одразу після will.',
          'Do not use will to.',
        ),
        going: tri(
          'I going to неполное. Нужно I am going to.',
          'I going to неповне. Потрібно I am going to.',
          'Use I am going to.',
        ),
      },
      focusWords: ['am going to'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_now_future_pair',
      sentence: 'Choose the correct pair.',
      translation: tri(
        'Она летит сейчас / Она летит в понедельник.',
        'Вона летить зараз / Вона летить у понеділок.',
        'She is flying now / She is flying on Monday',
      ),
      options: [
        'She is flying now / She is flying on Monday',
        'She flies now / She flies on Monday',
        'She flying now / She flying on Monday',
        'She is fly now / She is fly on Monday',
      ],
      correctAnswer: 'She is flying now / She is flying on Monday',
      correctFeedback: tri(
        'Да. Та же форма: now = сейчас, on Monday = будущий план.',
        'Так. Та сама форма: now = зараз, on Monday = майбутній план.',
        'Yes. Same form, different time marker.',
      ),
      wrong: {
        'She flies now / She flies on Monday': tri(
          'Flies звучит как расписание или регулярность. Для действия сейчас и личной договорённости лучше is flying.',
          'Flies звучить як розклад або регулярність. Для дії зараз і особистої домовленості краще is flying.',
          'For now and a personal arrangement, use is flying.',
        ),
        'She flying now / She flying on Monday': tri(
          'Flying без is неполное. Нужно she is flying.',
          'Flying без is неповне. Потрібно she is flying.',
          'Flying needs is.',
        ),
        'She is fly now / She is fly on Monday': tri(
          'После is нужно flying: she is flying.',
          'Після is потрібно flying: she is flying.',
          'After is, use flying.',
        ),
      },
      focusWords: ['is flying now', 'is flying on Monday'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_arrangement_will_intention',
      sentence: 'Choose the best set.',
      translation: tri(
        'Иду к врачу в 3 / сейчас отвечу / собираюсь учиться.',
        'Йду до лікаря о 3 / зараз відповім / збираюся вчитися.',
        'I am seeing my doctor at 3 / I will answer it / I am going to study',
      ),
      options: [
        'I am seeing my doctor at 3 / I will answer it / I am going to study',
        'I will see my doctor at 3 / I am answering it / I studying',
        'I see my doctor at 3 / I will to answer it / I going to study',
        'I am see my doctor at 3 / I answer it / I am going study',
      ],
      correctAnswer: 'I am seeing my doctor at 3 / I will answer it / I am going to study',
      correctFeedback: tri(
        'Да. Договоренность: am seeing. Решение сейчас: will answer. Намерение: am going to study.',
        'Так. Домовленість: am seeing. Рішення зараз: will answer. Намір: am going to study.',
        'Yes. Arrangement, decision now, intention.',
      ),
      wrong: {
        'I will see my doctor at 3 / I am answering it / I studying': tri(
          'Запись к врачу лучше как am seeing, телефонное решение как will answer, а I studying неполное.',
          'Запис до лікаря краще як am seeing, телефонне рішення як will answer, а I studying неповне.',
          'Use am seeing / will answer / am going to study.',
        ),
        'I see my doctor at 3 / I will to answer it / I going to study': tri(
          'Will to answer не работает, и I going to study без am тоже не работает.',
          'Will to answer не працює, і I going to study без am теж не працює.',
          'Use will answer and I am going to study.',
        ),
        'I am see my doctor at 3 / I answer it / I am going study': tri(
          'После am нужно seeing, а после going нужен to: am going to study.',
          'Після am потрібно seeing, а після going потрібен to: am going to study.',
          'Use am seeing and am going to study.',
        ),
      },
      focusWords: ['am seeing', 'will answer', 'going to'],
    }),
    futurePcStep({
      id: 'future_pc_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri(
        'Я завтра работаю и вечером встречаюсь с другом.',
        'Я завтра працюю і ввечері зустрічаюся з другом.',
        'I am working tomorrow, and I am meeting a friend in the evening.',
      ),
      options: [
        'I am working tomorrow, and I am meeting a friend in the evening.',
        'I work tomorrow, and I meet a friend in the evening.',
        'I working tomorrow, and I meeting a friend in the evening.',
        'I am work tomorrow, and I am meet a friend in the evening.',
      ],
      correctAnswer: 'I am working tomorrow, and I am meeting a friend in the evening.',
      correctFeedback: tri(
        'Да. Tomorrow и in the evening показывают планы: am working / am meeting.',
        'Так. Tomorrow і in the evening показують плани: am working / am meeting.',
        'Yes. Future markers show plans: am working / am meeting.',
      ),
      wrong: {
        'I work tomorrow, and I meet a friend in the evening.': tri(
          'Так можно услышать для расписаний, но для личных договорённостей естественнее am working и am meeting.',
          'Так можна почути для розкладів, але для особистих домовленостей природніше am working і am meeting.',
          'For personal arrangements, use am working and am meeting.',
        ),
        'I working tomorrow, and I meeting a friend in the evening.': tri(
          'В обеих частях не хватает am: I am working, I am meeting.',
          'В обох частинах бракує am: I am working, I am meeting.',
          'Both parts need am.',
        ),
        'I am work tomorrow, and I am meet a friend in the evening.': tri(
          'После am нужно working и meeting.',
          'Після am потрібно working і meeting.',
          'After am, use working and meeting.',
        ),
      },
      focusWords: ['am working tomorrow', 'am meeting'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_be_future_arrangement_error',
      'be_plus_base_error',
      'wrong_be_form_error',
      'present_now_future_confusion_error',
      'will_instead_of_arrangement_error',
      'going_to_vs_arrangement_error',
      'time_marker_misread_error',
      'question_order_error',
      'negative_order_error',
      'present_simple_schedule_confusion_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri(
      'Обычное объяснение: покажи маркер будущего времени и форму am/is/are + -ing.',
      'Звичайне пояснення: покажи маркер майбутнього часу і форму am/is/are + -ing.',
      'Explicacion normal: muestra el marcador futuro y la forma am/is/are + -ing.',
    ),
    depth2: tri(
      'Проще: спроси, действие происходит сейчас или уже запланировано на будущее.',
      'Простіше: спитай, дія відбувається зараз чи вже запланована на майбутнє.',
      'Mas simple: pregunta si es ahora o plan futuro.',
    ),
    depth3: tri(
      'Еще проще: сравни I am calling now и I am calling tomorrow.',
      'Ще простіше: порівняй I am calling now і I am calling tomorrow.',
      'Aun mas simple: compara I am calling now con I am calling tomorrow.',
    ),
    depth4: tri(
      'Почти подсказка: для будущей договоренности ищи am/is/are + -ing.',
      'Майже підказка: для майбутньої домовленості шукай am/is/are + -ing.',
      'Casi una pista: el plan futuro acordado usa am/is/are + -ing.',
    ),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Present Continuous может быть будущим планом, если рядом tomorrow, tonight, next week или точное время. I am meeting him tomorrow = встреча уже назначена.',
        'Present Continuous може бути майбутнім планом, якщо поруч tomorrow, tonight, next week або точний час. I am meeting him tomorrow = зустріч уже призначена.',
        'Present Continuous puede describir el futuro con un marcador futuro.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_time_marker_hint_then_retry',
      card: tri(
        'Подсказка: сначала найди слово времени. Оно говорит, это сейчас или будущий план.',
        'Підказка: спочатку знайди слово часу. Воно говорить, це зараз чи майбутній план.',
        'Pista: primero encuentra el marcador de tiempo.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Guided mode: сначала выбери now или будущий маркер. Потом собери am/is/are + -ing.',
        'Guided mode: спочатку обери now або майбутній маркер. Потім збери am/is/are + -ing.',
        'Modo guiado: elige now o marcador futuro, luego arma am/is/are + -ing.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_future_pc_001',
        prompt: tri(
          'Tomorrow показывает действие сейчас или будущий план?',
          'Tomorrow показує дію зараз чи майбутній план?',
          'Tomorrow muestra ahora o un plan futuro?',
        ),
        options: ['now', 'future plan'],
        correctIndex: 1,
        thenReturnToExerciseId: 'future_pc_easy_001',
      },
      {
        id: 'guided_future_pc_002',
        prompt: tri(
          'После am здесь нужно meet или meeting?',
          'Після am тут потрібно meet чи meeting?',
          'Despues de am, meet o meeting?',
        ),
        options: ['meet', 'meeting'],
        correctIndex: 1,
        thenReturnToExerciseId: 'future_pc_easy_001',
      },
      {
        id: 'guided_future_pc_003',
        prompt: tri(
          'С she нужно is flying или are flying?',
          'З she потрібно is flying чи are flying?',
          'Con she, is flying o are flying?',
        ),
        options: ['is flying', 'are flying'],
        correctIndex: 0,
        thenReturnToExerciseId: 'future_pc_contrast_001',
      },
      {
        id: 'guided_future_pc_004',
        prompt: tri(
          'The phone is ringing. I will answer it: это договоренность или решение сейчас?',
          'The phone is ringing. I will answer it: це домовленість чи рішення зараз?',
          'Plan acordado o decision ahora?',
        ),
        options: ['arrangement', 'decision now'],
        correctIndex: 1,
        thenReturnToExerciseId: 'future_pc_mixed_002',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'future_present_continuous_arrangements',
    diagnosisLabel: tri('Future arrangements', 'Future arrangements', 'Planes acordados'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: [
      'am meeting tomorrow',
      'are having tonight',
      'is flying on Monday',
      'are you working tomorrow',
      'will answer',
      'going to',
    ],
    focusPatterns: [
      'future_arrangement_meeting',
      'future_arrangement_tonight',
      'now_vs_tomorrow_pair',
      'she_is_flying',
      'they_are_coming',
      'i_am_leaving',
      'question_are_you_working',
      'negative_not_going_out',
      'question_pair',
      'arrangement_vs_will',
      'spontaneous_will',
      'going_to_intention',
      'mixed_now_future_pair',
      'mixed_arrangement_will_intention',
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
      microDiagnosisId: 'future_present_continuous_arrangements',
      contrastSet: ['present continuous future', 'arrangement', 'will', 'going to'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logTimeMarker: true,
      logFutureMeaningType: true,
      logBeForm: true,
      logVerbIngForm: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=future_present_continuous_arrangements',
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
