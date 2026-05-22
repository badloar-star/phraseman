import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const PP_FOR_SINCE_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre Present Perfect com for/since ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về Present Perfect với for/since này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan Present Perfect dengan for/since ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu for/since kullanılan Present Perfect açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie Present Perfect z for/since nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? PP_FOR_SINCE_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'for + duration',
  'since + starting point',
  'have been',
  'has lived',
  'how long',
  'started in past and continues now',
  'present perfect',
  'past simple',
];

const SMART_CONTRAST = [
  'for + duration',
  'since + starting point',
  'have been',
  'has lived',
  'how long',
  'started in past and continues now',
];

const MODEL = tri(
  'Здесь английский просит разделить две вещи. For отвечает на вопрос “как долго”: например, for three years. Since отвечает на вопрос “с какого момента”: например, since 2020. Если ситуация началась раньше и продолжается сейчас, рядом часто стоит Present Perfect.',
  'Тут англійська просить розділити дві речі. For відповідає на питання “як довго”: наприклад, for three years. Since відповідає на питання “з якого моменту”: наприклад, since 2020. Якщо ситуація почалася раніше і триває зараз, поруч часто стоїть Present Perfect.',
  'El ingles separa dos ideas. For responde cuanto tiempo: for three years. Since responde desde cuando: since 2020. Si la situacion empezo antes y continua ahora, a menudo se usa Present Perfect.',
  {
    'pt-BR': 'O inglês pede para separar duas coisas. For responde à pergunta "por quanto tempo": por exemplo, for three years. Since responde à pergunta "desde quando": por exemplo, since 2020. Se a situação começou antes e continua agora, muitas vezes aparece Present Perfect.',
    vi: 'Tiếng Anh yêu cầu tách hai ý. For trả lời câu hỏi "trong bao lâu": ví dụ, for three years. Since trả lời câu hỏi "từ khi nào": ví dụ, since 2020. Nếu tình huống bắt đầu trước đây và vẫn tiếp tục bây giờ, thường dùng Present Perfect.',
    id: 'Bahasa Inggris meminta kita memisahkan dua hal. For menjawab pertanyaan "berapa lama": misalnya, for three years. Since menjawab pertanyaan "sejak kapan": misalnya, since 2020. Jika situasi dimulai dulu dan masih berlanjut sekarang, sering muncul Present Perfect.',
    tr: 'İngilizce burada iki şeyi ayırmanı ister. For "ne kadar süredir" sorusuna cevap verir: örneğin for three years. Since "hangi noktadan beri" sorusuna cevap verir: örneğin since 2020. Durum geçmişte başladı ve şimdi hâlâ sürüyorsa, yanında çoğu zaman Present Perfect durur.',
    pl: 'Angielski prosi tutaj o rozdzielenie dwóch rzeczy. For odpowiada na pytanie "jak długo": na przykład for three years. Since odpowiada na pytanie "od kiedy": na przykład since 2020. Jeśli sytuacja zaczęła się wcześniej i nadal trwa, często obok stoi Present Perfect.',
  },
);

const PP_FOR_SINCE_SKILL_ES: Record<string, string> = {
  for_duration_years: 'Three years es duracion: usa for.',
  since_starting_year: '2021 es punto inicial: usa since.',
  for_duration_weeks: 'Two weeks es duracion: usa for.',
  since_monday: 'Monday es punto inicial: usa since.',
  for_a_long_time: 'A long time es duracion: usa for.',
  since_clause: 'I got home marca el inicio: usa since.',
  have_been_for_duration: 'Ten years es duracion: usa for.',
  has_lived_since_start: 'He was a child marca el inicio: usa since.',
  past_simple_finished_period: 'El periodo ya termino: usa Past Simple.',
  how_long_have_you_lived: 'How long pregunta por duracion; con you usa have.',
  how_long_has_she_worked: 'How long pregunta por duracion; con she usa has.',
  answer_how_long_for: 'Five years es duracion: responde con for.',
  for_since_pair: 'Duracion = for; punto inicial = since.',
  continuing_vs_finished_period: 'La situacion continua ahora: usa have lived for.',
  mixed_sentence_correction: '2020 necesita since; five years necesita for.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = PP_FOR_SINCE_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? PP_FOR_SINCE_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function forSinceEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = PP_FOR_SINCE_SKILL_ES[input.targetSkill] ?? 'Decide si es duracion o punto inicial.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(correct: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала посмотри на выражение времени после пропуска.',
      'Спочатку подивись на вираз часу після пропуску.',
      'Primero mira la expresion de tiempo despues del hueco.',
    ),
    tri(
      'Если это период: three years, two weeks, a long time, нужен for.',
      'Якщо це період: three years, two weeks, a long time, потрібен for.',
      'Si es una duracion, usa for.',
    ),
    tri(
      'Если это старт: 2020, Monday, last week, I moved here, нужен since.',
      'Якщо це старт: 2020, Monday, last week, I moved here, потрібен since.',
      'Si es un punto inicial, usa since.',
    ),
    tri(
      'Нужный вариант здесь тот, где период времени и точка старта не перепутаны.',
      'Потрібний варіант тут той, де період часу й точка старту не переплутані.',
      `La respuesta aqui es: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Проверь, перед тобой период времени или точка старта. Здесь нужно: ${correct}.`,
    `Майже. Перевір, перед тобою період часу чи точка старту. Тут потрібно: ${correct}.`,
    `Casi. Revisa si es duracion o punto inicial. Usa: ${correct}.`,
  );
}

function forSinceStep(input: {
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
  const esFeedback = forSinceEsFeedback(input);
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
      'Выбери for, since или правильную фразу с how long для ситуации, которая началась раньше и важна сейчас.',
      'Обери for, since або правильну фразу з how long для ситуації, яка почалася раніше і важлива зараз.',
      'Elige for, since o la frase correcta con how long para una situacion que empezo antes y sigue importando ahora.',
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
      'Коротко: for + период времени. Since + точка старта. How long have you lived here? - вопрос о том, как давно это продолжается.',
      'Коротко: for + період часу. Since + точка старту. How long have you lived here? - питання про те, як давно це триває.',
      'Version corta: for + duracion. Since + punto inicial. How long have you lived here? pregunta cuanto tiempo lleva continuando.',
    ),
    focusWords: input.focusWords,
  };
}

export const PRESENT_PERFECT_FOR_SINCE_TRAINING: DiagnosisTraining = {
  id: 'present_perfect_for_since',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 41,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'Present Perfect: for или since',
    'Present Perfect: for чи since',
    'Present Perfect: for o since',
    {
      'pt-BR': 'Present Perfect: for ou since',
      vi: 'Present Perfect: for hay since',
      id: 'Present Perfect: for atau since',
      tr: 'Present Perfect: for mu since mi',
      pl: 'Present Perfect: for czy since',
    },
  ),
  shortTitle: tri('For / Since', 'For / Since', 'For / Since', {
    'pt-BR': 'For / Since',
    vi: 'For / Since',
    id: 'For / Since',
    tr: 'For / Since',
    pl: 'For / Since',
  }),
  shortDiagnosis: tri(
    'Ты путаешь for three years и since 2020, поэтому фраза о том, как давно что-то длится, звучит сломанно.',
    'Ти плутаєш for three years і since 2020, тому фраза про те, як давно щось триває, звучить зламано.',
    'Confundes for three years y since 2020, por eso las frases sobre cuanto tiempo algo continua se rompen.',
    {
      'pt-BR': 'Você confunde for three years e since 2020, então a frase sobre há quanto tempo algo continua soa quebrada.',
      vi: 'Bạn nhầm for three years và since 2020, nên câu nói về việc một điều kéo dài bao lâu nghe bị sai.',
      id: 'Kamu mencampur for three years dan since 2020, sehingga kalimat tentang sudah berapa lama sesuatu berlangsung terdengar rusak.',
      tr: 'For three years ile since 2020 ifadelerini karıştırıyorsun; bu yüzden bir şeyin ne kadar süredir sürdüğünü anlatan cümle bozuluyor.',
      pl: 'Mylisz for three years i since 2020, więc zdanie o tym, jak długo coś trwa, brzmi niepoprawnie.',
    },
  ),
  diagnosisText: tri(
    'Ошибка не в самом Present Perfect. Ошибка в слове времени. Three years - это период, поэтому for three years. 2020 - это точка старта, поэтому since 2020. Если человек всё ещё живёт, работает или знает кого-то сейчас, фраза часто собирается через have или has: I have lived here for three years. She has worked here since 2020.',
    'Помилка не в самому Present Perfect. Помилка у слові часу. Three years - це період, тому for three years. 2020 - це точка старту, тому since 2020. Якщо людина все ще живе, працює або знає когось зараз, фраза часто збирається через have або has: I have lived here for three years. She has worked here since 2020.',
    'El error no esta solo en Present Perfect. El error esta en la palabra de tiempo. Three years es duracion, por eso for three years. 2020 es punto inicial, por eso since 2020. Si la persona todavia vive, trabaja o conoce a alguien ahora, la frase suele usar have o has: I have lived here for three years. She has worked here since 2020.',
    {
      'pt-BR': 'O erro não está no Present Perfect em si. O erro está na palavra de tempo. Three years é um período, então for three years. 2020 é um ponto de início, então since 2020. Se a pessoa ainda mora, trabalha ou conhece alguém agora, a frase muitas vezes usa have ou has: I have lived here for three years. She has worked here since 2020.',
      vi: 'Lỗi không chỉ nằm ở Present Perfect. Lỗi nằm ở từ chỉ thời gian. Three years là khoảng thời gian, nên dùng for three years. 2020 là điểm bắt đầu, nên dùng since 2020. Nếu người đó vẫn sống, làm việc hoặc quen ai đó bây giờ, câu thường dùng have hoặc has: I have lived here for three years. She has worked here since 2020.',
      id: 'Kesalahannya bukan pada Present Perfect itu sendiri. Kesalahannya ada pada kata waktu. Three years adalah durasi, jadi for three years. 2020 adalah titik awal, jadi since 2020. Jika orang itu masih tinggal, bekerja, atau mengenal seseorang sekarang, kalimatnya sering memakai have atau has: I have lived here for three years. She has worked here since 2020.',
      tr: 'Hata Present Perfectin kendisinde değil. Hata zaman ifadesinde. Three years bir süredir, bu yüzden for three years. 2020 başlangıç noktasıdır, bu yüzden since 2020. Kişi şimdi hâlâ yaşıyor, çalışıyor veya birini tanıyorsa cümle çoğu zaman have ya da has ile kurulur: I have lived here for three years. She has worked here since 2020.',
      pl: 'Błąd nie leży w samym Present Perfect. Błąd jest w wyrażeniu czasu. Three years to okres, więc for three years. 2020 to punkt startu, więc since 2020. Jeśli ktoś nadal gdzieś mieszka, pracuje albo kogoś zna teraz, fraza często składa się przez have albo has: I have lived here for three years. She has worked here since 2020.',
    },
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    'For ставим перед периодом времени, since - перед точкой старта. Вопрос о длительности часто начинается с How long.',
    'For ставимо перед періодом часу, since - перед точкою старту. Питання про тривалість часто починається з How long.',
    'For + duracion: for three years. Since + punto inicial: since 2020. Pregunta: How long have you lived here?',
    {
      'pt-BR': 'Use for antes de um período de tempo e since antes de um ponto de início. A pergunta sobre duração muitas vezes começa com How long.',
      vi: 'Dùng for trước một khoảng thời gian, và since trước một điểm bắt đầu. Câu hỏi về thời lượng thường bắt đầu bằng How long.',
      id: 'Gunakan for sebelum durasi waktu, dan since sebelum titik awal. Pertanyaan tentang durasi sering dimulai dengan How long.',
      tr: 'For süre ifadesinden önce, since başlangıç noktasından önce gelir. Süre sorusu çoğu zaman How long ile başlar.',
      pl: 'For stawiamy przed okresem czasu, a since przed punktem startu. Pytanie o długość trwania często zaczyna się od How long.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'For ставим перед периодом времени: for three years, for two weeks, for a long time.',
      'Since ставим перед точкой старта: since 2020, since Monday, since I moved here.',
      'Не говори since three years. Three years - период, поэтому for three years.',
      'Не говори for 2020. 2020 - точка старта, поэтому since 2020.',
      'Если ситуация началась раньше и продолжается сейчас, часто нужен Present Perfect: I have lived here for three years.',
      'С he, she, it обычно используем has: She has worked here since 2020.',
      'В вопросе о длительности часто звучит How long have you lived here?',
      'Если период закончился в прошлом, Past Simple может быть лучше: I lived there for three years, but I do not live there now.',
    ],
    uk: [
      'For ставимо перед періодом часу: for three years, for two weeks, for a long time.',
      'Since ставимо перед точкою старту: since 2020, since Monday, since I moved here.',
      'Не кажи since three years. Three years - період, тому for three years.',
      'Не кажи for 2020. 2020 - точка старту, тому since 2020.',
      'Якщо ситуація почалася раніше і триває зараз, часто потрібен Present Perfect: I have lived here for three years.',
      'З he, she, it зазвичай використовуємо has: She has worked here since 2020.',
      'У питанні про тривалість часто звучить How long have you lived here?',
      'Якщо період завершився в минулому, Past Simple може бути кращим: I lived there for three years, but I do not live there now.',
    ],
    es: [
      'Usa for antes de una duracion: for three years.',
      'Usa since antes de un punto inicial: since 2020.',
      'No digas since three years.',
      'No digas for 2020.',
      'Las situaciones que continuan suelen usar Present Perfect.',
      'Con he, she, it normalmente usa has.',
      'How long have you lived here? pregunta por duracion.',
      'Si el periodo termino en el pasado, Past Simple puede ser mejor.',
    ],
    'pt-BR': [
      'Use for antes de um período de tempo: for three years.',
      'Use since antes de um ponto de início: since 2020.',
      'Não diga since three years. Three years é um período, então use for three years.',
      'Não diga for 2020. 2020 é um ponto de início, então use since 2020.',
      'Se a situação começou antes e continua agora, muitas vezes usamos Present Perfect: I have lived here for three years.',
      'Com he, she, it, geralmente usamos has: She has worked here since 2020.',
      'Na pergunta sobre duração, muitas vezes aparece How long have you lived here?',
      'Se o período terminou no passado, Past Simple pode ser melhor: I lived there for three years, but I do not live there now.',
    ],
    vi: [
      'Dùng for trước một khoảng thời gian: for three years.',
      'Dùng since trước một điểm bắt đầu: since 2020.',
      'Đừng nói since three years. Three years là khoảng thời gian, nên dùng for three years.',
      'Đừng nói for 2020. 2020 là điểm bắt đầu, nên dùng since 2020.',
      'Nếu tình huống bắt đầu trước đây và vẫn tiếp tục bây giờ, thường dùng Present Perfect: I have lived here for three years.',
      'Với he, she, it, thường dùng has: She has worked here since 2020.',
      'Câu hỏi về thời lượng thường có How long have you lived here?',
      'Nếu khoảng thời gian đã kết thúc trong quá khứ, Past Simple có thể phù hợp hơn: I lived there for three years, but I do not live there now.',
    ],
    id: [
      'Gunakan for sebelum periode waktu: for three years.',
      'Gunakan since sebelum titik awal: since 2020.',
      'Jangan mengatakan since three years. Three years adalah periode, jadi gunakan for three years.',
      'Jangan mengatakan for 2020. 2020 adalah titik awal, jadi gunakan since 2020.',
      'Jika situasi dimulai dulu dan masih berlanjut sekarang, sering gunakan Present Perfect: I have lived here for three years.',
      'Dengan he, she, it, biasanya gunakan has: She has worked here since 2020.',
      'Pertanyaan tentang durasi sering memakai How long have you lived here?',
      'Jika periodenya sudah selesai di masa lalu, Past Simple bisa lebih tepat: I lived there for three years, but I do not live there now.',
    ],
    tr: [
      'Bir süre ifadesinden önce for kullanılır: for three years.',
      'Başlangıç noktasından önce since kullanılır: since 2020.',
      'Since three years deme. Three years bir süredir, bu yüzden for three years kullan.',
      'For 2020 deme. 2020 başlangıç noktasıdır, bu yüzden since 2020 kullan.',
      'Durum geçmişte başladı ve hâlâ sürüyorsa çoğu zaman Present Perfect kullanılır: I have lived here for three years.',
      'He, she, it ile genellikle has kullanılır: She has worked here since 2020.',
      'Süreyi soran soruda çoğu zaman How long have you lived here? yapısı duyulur.',
      'Süre geçmişte bittiyse Past Simple daha iyi olabilir: I lived there for three years, but I do not live there now.',
    ],
    pl: [
      'Przed okresem czasu używamy for: for three years.',
      'Przed punktem startu używamy since: since 2020.',
      'Nie mów since three years. Three years to okres, więc użyj for three years.',
      'Nie mów for 2020. 2020 to punkt startu, więc użyj since 2020.',
      'Jeśli sytuacja zaczęła się wcześniej i trwa teraz, często używamy Present Perfect: I have lived here for three years.',
      'Z he, she, it zwykle używamy has: She has worked here since 2020.',
      'W pytaniu o długość trwania często pojawia się How long have you lived here?',
      'Jeśli okres zakończył się w przeszłości, Past Simple może być lepszy: I lived there for three years, but I do not live there now.',
    ],
  },
  examples: [
    {
      en: 'I have lived here for three years.',
      ru: 'Я живу здесь уже три года.',
      uk: 'Я живу тут уже три роки.',
      es: 'Vivo aqui desde hace tres anos.',
      'pt-BR': 'Moro aqui há três anos.',
      vi: 'Tôi đã sống ở đây được ba năm.',
      id: 'Saya sudah tinggal di sini selama tiga tahun.',
      tr: 'Üç yıldır burada yaşıyorum.',
      pl: 'Mieszkam tu od trzech lat.',
      why: tri('Three years - период времени, поэтому for three years.', 'Three years - період часу, тому for three years.', 'Three years es una duracion, por eso usa for.'),
    },
    {
      en: 'I have lived here since 2021.',
      ru: 'Я живу здесь с 2021 года.',
      uk: 'Я живу тут з 2021 року.',
      es: 'Vivo aqui desde 2021.',
      'pt-BR': 'Moro aqui desde 2021.',
      vi: 'Tôi đã sống ở đây từ năm 2021.',
      id: 'Saya sudah tinggal di sini sejak 2021.',
      tr: '2021’den beri burada yaşıyorum.',
      pl: 'Mieszkam tu od 2021 roku.',
      why: tri('2021 - точка старта, поэтому since 2021.', '2021 - точка старту, тому since 2021.', '2021 es un punto inicial, por eso usa since.'),
    },
    {
      en: 'She has worked here for six months.',
      ru: 'Она работает здесь уже шесть месяцев.',
      uk: 'Вона працює тут уже шість місяців.',
      es: 'Ella trabaja aqui desde hace seis meses.',
      'pt-BR': 'Ela trabalha aqui há seis meses.',
      vi: 'Cô ấy đã làm việc ở đây được sáu tháng.',
      id: 'Dia sudah bekerja di sini selama enam bulan.',
      tr: 'Altı aydır burada çalışıyor.',
      pl: 'Ona pracuje tu od sześciu miesięcy.',
      why: tri('Six months - период времени, поэтому for.', 'Six months - період часу, тому for.', 'Six months es una duracion, por eso usa for.'),
    },
    {
      en: 'She has worked here since Monday.',
      ru: 'Она работает здесь с понедельника.',
      uk: 'Вона працює тут з понеділка.',
      es: 'Ella trabaja aqui desde el lunes.',
      'pt-BR': 'Ela trabalha aqui desde segunda-feira.',
      vi: 'Cô ấy đã làm việc ở đây từ thứ Hai.',
      id: 'Dia sudah bekerja di sini sejak hari Senin.',
      tr: 'Pazartesiden beri burada çalışıyor.',
      pl: 'Ona pracuje tu od poniedziałku.',
      why: tri('Monday - точка старта, поэтому since.', 'Monday - точка старту, тому since.', 'Monday es un punto inicial, por eso usa since.'),
    },
    {
      en: 'We have known each other for a long time.',
      ru: 'Мы давно знаем друг друга.',
      uk: 'Ми давно знаємо одне одного.',
      es: 'Nos conocemos desde hace mucho tiempo.',
      'pt-BR': 'Nós nos conhecemos há muito tempo.',
      vi: 'Chúng tôi đã biết nhau từ lâu.',
      id: 'Kami sudah saling mengenal sejak lama.',
      tr: 'Uzun zamandır birbirimizi tanıyoruz.',
      pl: 'Znamy się od dawna.',
      why: tri('A long time - период времени, поэтому for.', 'A long time - період часу, тому for.', 'A long time es una duracion, por eso usa for.'),
    },
    {
      en: "I haven't seen him since last week.",
      ru: 'Я не видел его с прошлой недели.',
      uk: 'Я не бачив його з минулого тижня.',
      es: 'No lo veo desde la semana pasada.',
      'pt-BR': 'Não o vejo desde a semana passada.',
      vi: 'Tôi chưa gặp anh ấy từ tuần trước.',
      id: 'Saya belum melihat dia sejak minggu lalu.',
      tr: 'Onu geçen haftadan beri görmedim.',
      pl: 'Nie widziałem go od zeszłego tygodnia.',
      why: tri('Last week - точка отсчета, поэтому since.', 'Last week - точка відліку, тому since.', 'Last week es un punto inicial, por eso usa since.'),
    },
    {
      en: 'How long have you lived here?',
      ru: 'Как давно ты здесь живёшь?',
      uk: 'Як давно ти тут живеш?',
      es: 'Cuanto tiempo llevas viviendo aqui?',
      'pt-BR': 'Há quanto tempo você mora aqui?',
      vi: 'Bạn đã sống ở đây bao lâu rồi?',
      id: 'Sudah berapa lama kamu tinggal di sini?',
      tr: 'Ne zamandır burada yaşıyorsun?',
      pl: 'Jak długo tu mieszkasz?',
      why: tri('How long спрашивает, сколько времени ситуация длится.', 'How long питає, скільки часу ситуація триває.', 'How long pregunta por duracion.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты выбираешь for и since по русскому "уже / с / в течение". Так легко промахнуться: английскому важнее, это период времени или точка старта.',
        'Схоже, ти обираєш for і since за українським "вже / з / протягом". Так легко промахнутися: англійській важливіше, це період часу чи точка старту.',
        'Puede que elijas for y since por traduccion. Al ingles le importa mas si es duracion o punto inicial.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Период времени получает for: for three years. Точка старта получает since: since 2020.',
        'Період часу отримує for: for three years. Точка старту отримує since: since 2020.',
        'La duracion usa for. El punto inicial usa since.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Главные ловушки: since three years и for 2020. Исправление: for three years и since 2020.',
        'Головні пастки: since three years і for 2020. Виправлення: for three years і since 2020.',
        'Las trampas principales son since three years y for 2020. Usa for three years y since 2020.',
      ),
    },
  ],
  steps: [
    forSinceStep({
      id: 'pp_for_since_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'for_duration_years',
      sentence: 'I have lived here ___ three years.',
      translation: tri('Я живу здесь уже три года.', 'Я живу тут уже три роки.', 'I have lived here for three years.'),
      options: ['for', 'since', 'from', 'during'],
      correctAnswer: 'for',
      correctFeedback: tri('Да. Three years - это период времени, поэтому for three years.', 'Так. Three years - це період часу, тому for three years.', 'Yes. Three years is a period, so use for three years.'),
      wrong: {
        since: tri('Since нужен для точки старта: since 2020. А three years - период, поэтому for three years.', 'Since потрібен для точки старту: since 2020. А three years - період, тому for three years.', 'Since needs a starting point. Use for three years.'),
        from: tri('From показывает старт, но здесь ответ на "как долго?". Нужен блок for three years.', 'From показує старт, але тут відповідь на "як довго?". Потрібен блок for three years.', 'From points to a start. Here you need for three years.'),
        during: tri('During не отвечает на "как долго это длится" в такой фразе. Нужен for three years.', 'During не відповідає на "як довго це триває" у такій фразі. Потрібен for three years.', 'During does not answer how long here. Use for three years.'),
      },
      focusWords: ['for three years'],
    }),
    forSinceStep({
      id: 'pp_for_since_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'since_starting_year',
      sentence: 'I have lived here ___ 2021.',
      translation: tri('Я живу здесь с 2021 года.', 'Я живу тут з 2021 року.', 'I have lived here since 2021.'),
      options: ['since', 'for', 'during', 'at'],
      correctAnswer: 'since',
      correctFeedback: tri('Да. 2021 - точка старта, поэтому since 2021.', 'Так. 2021 - точка старту, тому since 2021.', 'Yes. 2021 is a starting point, so use since.'),
      wrong: {
        for: tri('For нужен для периода: for three years. 2021 - точка старта, поэтому since.', 'For потрібен для періоду: for three years. 2021 - точка старту, тому since.', 'For needs a period. 2021 is a starting point, so use since.'),
        during: tri('During здесь не собирает фразу "с 2021". Нужен since 2021.', 'During тут не збирає фразу "з 2021". Потрібно since 2021.', 'During does not build "since 2021". Use since.'),
        at: tri('At не подходит для года старта в этой фразе. Нужен since 2021.', 'At не підходить для року старту в цій фразі. Потрібно since 2021.', 'At does not fit this starting year. Use since.'),
      },
      focusWords: ['since 2021'],
    }),
    forSinceStep({
      id: 'pp_for_since_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'for_duration_weeks',
      sentence: 'We have waited ___ two weeks.',
      translation: tri('Мы ждём уже две недели.', 'Ми чекаємо вже два тижні.', 'We have waited for two weeks.'),
      options: ['for', 'since', 'from', 'on'],
      correctAnswer: 'for',
      correctFeedback: tri('Да. Two weeks - период времени, поэтому for two weeks.', 'Так. Two weeks - період часу, тому for two weeks.', 'Yes. Two weeks is a period, so use for.'),
      wrong: {
        since: tri('Since ждёт старт: since Monday. Two weeks - период, поэтому for.', 'Since чекає старт: since Monday. Two weeks - період, тому for.', 'Since needs a starting point. Two weeks needs for.'),
        from: tri('From не отвечает на "сколько времени". Нужен for two weeks.', 'From не відповідає на "скільки часу". Потрібно for two weeks.', 'From does not answer how long. Use for two weeks.'),
        on: tri('On здесь не работает. Нужен for two weeks.', 'On тут не працює. Потрібно for two weeks.', 'On does not work here. Use for two weeks.'),
      },
      focusWords: ['for two weeks'],
    }),
    forSinceStep({
      id: 'pp_for_since_easy_004',
      order: 4,
      difficulty: 'easy',
      targetSkill: 'since_monday',
      sentence: 'She has worked here ___ Monday.',
      translation: tri('Она работает здесь с понедельника.', 'Вона працює тут з понеділка.', 'She has worked here since Monday.'),
      options: ['since', 'for', 'during', 'in'],
      correctAnswer: 'since',
      correctFeedback: tri('Да. Monday - точка старта, поэтому since Monday.', 'Так. Monday - точка старту, тому since Monday.', 'Yes. Monday is a starting point, so use since.'),
      wrong: {
        for: tri('For нужен для периода: for two days. Monday - точка старта, поэтому since.', 'For потрібен для періоду: for two days. Monday - точка старту, тому since.', 'For needs a period. Monday needs since.'),
        during: tri('During Monday звучит как "в течение понедельника", а не "с понедельника". Нужен since Monday.', 'During Monday звучить як "протягом понеділка", а не "з понеділка". Потрібно since Monday.', 'During Monday means during Monday, not since Monday.'),
        in: tri('In Monday не подходит. Нужен since Monday.', 'In Monday не підходить. Потрібно since Monday.', 'In Monday does not work here. Use since Monday.'),
      },
      focusWords: ['since Monday'],
    }),
    forSinceStep({
      id: 'pp_for_since_easy_005',
      order: 5,
      difficulty: 'easy',
      targetSkill: 'for_a_long_time',
      sentence: 'We have known each other ___ a long time.',
      translation: tri('Мы давно знаем друг друга.', 'Ми давно знаємо одне одного.', 'We have known each other for a long time.'),
      options: ['for', 'since', 'from', 'by'],
      correctAnswer: 'for',
      correctFeedback: tri('Да. A long time - период времени, поэтому for a long time.', 'Так. A long time - період часу, тому for a long time.', 'Yes. A long time is a period, so use for.'),
      wrong: {
        since: tri('Since нужен перед стартом: since school. A long time - период, поэтому for.', 'Since потрібен перед стартом: since school. A long time - період, тому for.', 'Since needs a starting point. A long time needs for.'),
        from: tri('From не подходит для "давно знаем". Нужен for a long time.', 'From не підходить для "давно знаємо". Потрібно for a long time.', 'From does not fit this meaning. Use for a long time.'),
        by: tri('By говорит о дедлайне или моменте "к". Здесь нужен for a long time.', 'By говорить про дедлайн або момент "до". Тут потрібно for a long time.', 'By points to a deadline. Use for a long time.'),
      },
      focusWords: ['for a long time'],
    }),
    forSinceStep({
      id: 'pp_for_since_contrast_001',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'since_clause',
      sentence: 'I have been tired ___ I got home.',
      translation: tri('Я устал с тех пор, как пришёл домой.', 'Я втомлений відтоді, як прийшов додому.', 'I have been tired since I got home.'),
      options: ['since', 'for', 'during', 'while'],
      correctAnswer: 'since',
      correctFeedback: tri('Да. I got home - момент старта, поэтому since I got home.', 'Так. I got home - момент старту, тому since I got home.', 'Yes. I got home is the starting point, so use since.'),
      wrong: {
        for: tri('For нужен перед периодом вроде for three hours. I got home - это момент старта, поэтому since.', 'For потрібен перед періодом на кшталт for three hours. I got home - це момент старту, тому since.', 'For needs a period like for three hours. I got home needs since.'),
        during: tri('During не связывает старт и ситуацию сейчас. Нужен since I got home.', 'During не повʼязує старт і ситуацію зараз. Потрібно since I got home.', 'During does not connect the starting point to now. Use since.'),
        while: tri('While говорит "пока", но здесь нужен смысл "с тех пор как". Нужен since.', 'While означає "поки", але тут потрібен сенс "відтоді як". Потрібно since.', 'While means while. Here you need since.'),
      },
      focusWords: ['since I got home'],
    }),
    forSinceStep({
      id: 'pp_for_since_contrast_002',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'have_been_for_duration',
      sentence: 'They have been friends ___ ten years.',
      translation: tri('Они дружат уже десять лет.', 'Вони дружать уже десять років.', 'They have been friends for ten years.'),
      options: ['for', 'since', 'from', 'in'],
      correctAnswer: 'for',
      correctFeedback: tri('Да. Ten years - период, поэтому for ten years.', 'Так. Ten years - період, тому for ten years.', 'Yes. Ten years is a period, so use for.'),
      wrong: {
        since: tri('Since нужен перед стартом: since 2016. Ten years - период, поэтому for.', 'Since потрібен перед стартом: since 2016. Ten years - період, тому for.', 'Since needs a starting point. Ten years needs for.'),
        from: tri('From не отвечает на "как долго". Нужен for ten years.', 'From не відповідає на "як довго". Потрібно for ten years.', 'From does not answer how long. Use for.'),
        in: tri('In ten years звучит как "через десять лет". Здесь нужен for ten years.', 'In ten years звучить як "через десять років". Тут потрібно for ten years.', 'In ten years means after ten years. Use for ten years.'),
      },
      focusWords: ['have been', 'for ten years'],
    }),
    forSinceStep({
      id: 'pp_for_since_contrast_003',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'has_lived_since_start',
      sentence: 'He has lived in Dublin ___ he was a child.',
      translation: tri('Он живёт в Дублине с детства.', 'Він живе в Дубліні з дитинства.', 'He has lived in Dublin since he was a child.'),
      options: ['since', 'for', 'during', 'from'],
      correctAnswer: 'since',
      correctFeedback: tri('Да. He was a child - точка старта, поэтому since.', 'Так. He was a child - точка старту, тому since.', 'Yes. He was a child is the starting point, so use since.'),
      wrong: {
        for: tri('For нужен перед периодом: for twenty years. Здесь дан старт: since he was a child.', 'For потрібен перед періодом: for twenty years. Тут дано старт: since he was a child.', 'For needs a period. Here the start is since he was a child.'),
        during: tri('During звучит как “во время детства”, но смысл здесь “с того времени до сейчас”. Нужен since.', 'During звучить як “під час дитинства”, але сенс тут “з того часу до зараз”. Потрібно since.', 'During would mean during childhood. Here use since.'),
        from: tri('From можно услышать в других фразах, но в этой модели с has lived нужен since.', 'From можна почути в інших фразах, але в цій моделі з has lived потрібен since.', 'From can appear elsewhere, but here use since.'),
      },
      focusWords: ['has lived', 'since he was a child'],
    }),
    forSinceStep({
      id: 'pp_for_since_contrast_004',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'past_simple_finished_period',
      sentence: 'I ___ there for three years, but I do not live there now.',
      translation: tri('Я жил там три года, но сейчас там не живу.', 'Я жив там три роки, але зараз там не живу.', 'I lived there for three years, but I do not live there now.'),
      options: ['lived', 'have lived', 'live', 'has lived'],
      correctAnswer: 'lived',
      correctFeedback: tri('Да. Период закончился в прошлом: сейчас ты там не живёшь. Поэтому lived.', 'Так. Період завершився в минулому: зараз ти там не живеш. Тому lived.', 'Yes. The period ended in the past, so use lived.'),
      wrong: {
        'have lived': tri('Have lived часто звучит так, будто связь с сейчас ещё жива. Здесь прямо сказано: I do not live there now.', 'Have lived часто звучить так, ніби звʼязок із зараз ще живий. Тут прямо сказано: I do not live there now.', 'Have lived often connects to now. Here the sentence says you do not live there now.'),
        live: tri('Live говорит о настоящем, но дальше сказано, что ты там сейчас не живёшь. Нужен lived.', 'Live говорить про теперішнє, але далі сказано, що ти там зараз не живеш. Потрібно lived.', 'Live is present. The sentence says you do not live there now.'),
        'has lived': tri('Has не подходит с I. И период здесь завершён, поэтому lived.', 'Has не підходить з I. І період тут завершений, тому lived.', 'Has does not go with I. The period ended, so use lived.'),
      },
      focusWords: ['lived there for three years'],
    }),
    forSinceStep({
      id: 'pp_for_since_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'how_long_have_you_lived',
      sentence: 'How long ___ you lived here?',
      translation: tri('Как давно ты здесь живёшь?', 'Як давно ти тут живеш?', 'How long have you lived here?'),
      options: ['have', 'has', 'did', 'do'],
      correctAnswer: 'have',
      correctFeedback: tri('Да. Вопрос о ситуации, которая продолжается сейчас: How long have you lived here?', 'Так. Питання про ситуацію, яка триває зараз: How long have you lived here?', 'Yes. Use: How long have you lived here?'),
      wrong: {
        has: tri('Has здесь не подходит к you. Нужно have you lived.', 'Has тут не підходить до you. Потрібно have you lived.', 'Has does not fit you. Use have you lived.'),
        did: tri('Did you live? чаще спрашивает о прошлом периоде. Здесь человек живёт здесь сейчас, поэтому have you lived.', 'Did you live? частіше питає про минулий період. Тут людина живе тут зараз, тому have you lived.', 'Did you live? asks about a past period. Here use have you lived.'),
        do: tri('Do you lived не собирается. В этой фразе нужен блок have you lived.', 'Do you lived не збирається. У цій фразі потрібен блок have you lived.', 'Do you lived does not work. Use have you lived.'),
      },
      focusWords: ['how long', 'have you lived'],
    }),
    forSinceStep({
      id: 'pp_for_since_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'how_long_has_she_worked',
      sentence: 'How long ___ she worked here?',
      translation: tri('Как давно она здесь работает?', 'Як давно вона тут працює?', 'How long has she worked here?'),
      options: ['has', 'have', 'did', 'does'],
      correctAnswer: 'has',
      correctFeedback: tri('Да. С she в этой фразе нужен has: How long has she worked here?', 'Так. З she у цій фразі потрібен has: How long has she worked here?', 'Yes. She uses has here.'),
      wrong: {
        have: tri('Have здесь не подходит к she. Нужен вариант has she worked.', 'Have тут не підходить до she. Потрібен варіант has she worked.', 'Have does not fit she here. Use has she worked.'),
        did: tri('Did she work? звучит как вопрос о прошлом. Здесь она работает сейчас, поэтому has she worked.', 'Did she work? звучить як питання про минуле. Тут вона працює зараз, тому has she worked.', 'Did she work? points to the past. Here use has she worked.'),
        does: tri('Does she worked не собирается. Нужен блок has she worked.', 'Does she worked не збирається. Потрібен блок has she worked.', 'Does she worked does not work. Use has she worked.'),
      },
      focusWords: ['how long', 'has she worked'],
    }),
    forSinceStep({
      id: 'pp_for_since_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'answer_how_long_for',
      sentence: 'How long have you known him? ___ five years.',
      translation: tri('Как давно ты его знаешь? Пять лет.', "Як давно ти його знаєш? П'ять років.", 'For five years.'),
      options: ['For', 'Since', 'From', 'During'],
      correctAnswer: 'For',
      correctFeedback: tri('Да. Five years - период времени. Ответ: For five years.', 'Так. Five years - період часу. Відповідь: For five years.', 'Yes. Five years is a period. Use For five years.'),
      wrong: {
        Since: tri('Since нужен перед стартом: since 2019. Five years - период, поэтому For five years.', 'Since потрібен перед стартом: since 2019. Five years - період, тому For five years.', 'Since needs a starting point. Use For five years.'),
        From: tri('From не отвечает на вопрос How long в таком коротком ответе. Нужен For five years.', 'From не відповідає на питання How long у такій короткій відповіді. Потрібно For five years.', 'From does not answer How long here. Use For five years.'),
        During: tri('During не работает как ответ "пять лет". Нужен For five years.', 'During не працює як відповідь "пʼять років". Потрібно For five years.', 'During does not work as this answer. Use For five years.'),
      },
      focusWords: ['how long', 'for five years'],
    }),
    forSinceStep({
      id: 'pp_for_since_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'for_since_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('три года / с 2021 года', 'три роки / з 2021 року', 'three years / since 2021'),
      options: ['for three years / since 2021', 'since three years / for 2021', 'during three years / from 2021', 'for 2021 / since three years'],
      correctAnswer: 'for three years / since 2021',
      correctFeedback: tri('Да. Three years - период, 2021 - точка старта.', 'Так. Three years - період, 2021 - точка старту.', 'Yes. Three years is a period, and 2021 is a start.'),
      wrong: {
        'since three years / for 2021': tri('Пары перепутаны. Three years требует for, а 2021 требует since.', 'Пари переплутані. Three years потребує for, а 2021 потребує since.', 'The pair is reversed. Use for three years and since 2021.'),
        'during three years / from 2021': tri('Это не базовая пара для этой фразы. Нужны for three years и since 2021.', 'Це не базова пара для цієї фрази. Потрібні for three years і since 2021.', 'This is not the basic pair here. Use for and since.'),
        'for 2021 / since three years': tri('For 2021 и since three years ломают смысл. Нужно for three years / since 2021.', 'For 2021 і since three years ламають сенс. Потрібно for three years / since 2021.', 'For 2021 and since three years are wrong here.'),
      },
      focusWords: ['for three years', 'since 2021'],
    }),
    forSinceStep({
      id: 'pp_for_since_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'continuing_vs_finished_period',
      sentence: 'Choose the best sentence.',
      translation: tri('Я живу здесь три года и всё ещё живу здесь.', 'Я живу тут три роки і все ще живу тут.', 'I live here now and started three years ago.'),
      options: ['I have lived here for three years.', 'I lived here for three years.', 'I live here since three years.', 'I have lived here since three years.'],
      correctAnswer: 'I have lived here for three years.',
      correctFeedback: tri('Да. Ситуация продолжается сейчас, а three years - период. Поэтому have lived + for.', 'Так. Ситуація триває зараз, а three years - період. Тому have lived + for.', 'Yes. It continues now, and three years uses for.'),
      wrong: {
        'I lived here for three years.': tri('Так часто говорят о завершённом периоде. Здесь ты всё ещё живёшь здесь, поэтому have lived.', 'Так часто говорять про завершений період. Тут ти все ще живеш тут, тому have lived.', 'That often means the period is finished. Here it continues now.'),
        'I live here since three years.': tri('Since three years неправильно, и для продолжающейся ситуации лучше have lived for three years.', 'Since three years неправильно, і для ситуації, що триває, краще have lived for three years.', 'Since three years is wrong. Use have lived for three years.'),
        'I have lived here since three years.': tri('Three years - период времени, поэтому нужен for: I have lived here for three years.', 'Three years - період часу, тому потрібен for: I have lived here for three years.', 'Three years is a period, so use for.'),
      },
      focusWords: ['have lived', 'for three years'],
    }),
    forSinceStep({
      id: 'pp_for_since_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Она работает здесь с 2020 года, а я знаю её уже пять лет.', "Вона працює тут з 2020 року, а я знаю її вже п'ять років.", 'She started in 2020; I have known her for five years.'),
      options: [
        'She has worked here since 2020, and I have known her for five years.',
        'She has worked here for 2020, and I have known her since five years.',
        'She worked here since 2020, and I know her for five years.',
        'She has work here since 2020, and I have knew her for five years.',
      ],
      correctAnswer: 'She has worked here since 2020, and I have known her for five years.',
      correctFeedback: tri('Да. 2020 - точка старта, поэтому since 2020. Five years - период, поэтому for five years.', 'Так. 2020 - точка старту, тому since 2020. Five years - період, тому for five years.', 'Yes. 2020 uses since; five years uses for.'),
      wrong: {
        'She has worked here for 2020, and I have known her since five years.': tri('For/since перепутаны: 2020 требует since, а five years требует for.', 'For/since переплутані: 2020 потребує since, а five years потребує for.', 'For/since are reversed: 2020 needs since, and five years needs for.'),
        'She worked here since 2020, and I know her for five years.': tri('Если она всё ещё работает здесь и ты всё ещё её знаешь, нужен блок has worked / have known.', 'Якщо вона все ще працює тут і ти все ще її знаєш, потрібен блок has worked / have known.', 'If both situations continue now, use has worked / have known.'),
        'She has work here since 2020, and I have knew her for five years.': tri('После has/have здесь нужны готовые формы worked и known: has worked, have known.', 'Після has/have тут потрібні готові форми worked і known: has worked, have known.', 'After has/have here, use worked and known.'),
      },
      focusWords: ['since 2020', 'for five years'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'since_duration_error',
      'for_starting_point_error',
      'present_perfect_missing_have_has_error',
      'have_has_agreement_error',
      'past_simple_instead_of_continuing_situation_error',
      'present_simple_instead_of_present_perfect_error',
      'how_long_structure_error',
      'since_clause_error',
      'finished_period_confusion_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, это период времени или точка старта.', 'Звичайне пояснення: показуємо, це період часу чи точка старту.', 'Explicacion normal: mostramos si es duracion o punto inicial.'),
    depth2: tri('Проще: спроси "как долго?" или "с какого момента?".', 'Простіше: запитай "як довго?" або "з якого моменту?".', 'Mas simple: pregunta cuanto tiempo o desde cuando.'),
    depth3: tri('Ещё проще: three years получает for, 2020 получает since.', 'Ще простіше: three years отримує for, 2020 отримує since.', 'Aun mas simple: three years usa for; 2020 usa since.'),
    depth4: tri('Почти подсказка: повторяем правильный блок целиком.', 'Майже підказка: повторюємо правильний блок повністю.', 'Casi una pista: repetimos el bloque correcto completo.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись на секунду. Three years, two weeks, a long time - это "сколько времени", значит for. 2020, Monday, I got home - это старт, значит since.',
        'Зупинись на секунду. Three years, two weeks, a long time - це "скільки часу", значить for. 2020, Monday, I got home - це старт, значить since.',
        'Pausa un segundo. Las duraciones usan for. Los puntos iniciales usan since.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_duration_start_hint_then_retry',
      card: tri(
        'Система подсветит выражение времени после пропуска. Твоя задача - решить: период это или старт.',
        'Система підсвітить вираз часу після пропуску. Твоє завдання - вирішити: це період чи старт.',
        'El sistema resalta la expresion de tiempo despues del hueco. Decide: duracion o inicio.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери "период" или "старт", потом вернись к фразе.',
        'Режим підказки: спочатку обери "період" або "старт", потім повернись до фрази.',
        'Modo guiado: primero elige duracion o inicio, luego vuelve a la frase.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_pp_for_since_001',
        prompt: tri('Three years - это период или старт?', 'Three years - це період чи старт?', 'Three years: duracion o inicio?'),
        options: ['период', 'старт'],
        correctIndex: 0,
        thenReturnToExerciseId: 'pp_for_since_easy_001',
      },
      {
        id: 'guided_pp_for_since_002',
        prompt: tri('2021 - это период или старт?', '2021 - це період чи старт?', '2021: duracion o inicio?'),
        options: ['период', 'старт'],
        correctIndex: 1,
        thenReturnToExerciseId: 'pp_for_since_easy_002',
      },
      {
        id: 'guided_pp_for_since_003',
        prompt: tri('How long спрашивает про период или старт?', 'How long питає про період чи старт?', 'How long pregunta por duracion o inicio?'),
        options: ['период', 'старт'],
        correctIndex: 0,
        thenReturnToExerciseId: 'pp_for_since_mixed_001',
      },
      {
        id: 'guided_pp_for_since_004',
        prompt: tri('Если человек всё ещё живёт здесь, лучше I lived here или I have lived here?', 'Якщо людина все ще живе тут, краще I lived here чи I have lived here?', 'Si la persona todavia vive aqui, que es mejor?'),
        options: ['I lived here', 'I have lived here'],
        correctIndex: 1,
        thenReturnToExerciseId: 'pp_for_since_mixed_005',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'present_perfect_for_since',
    diagnosisLabel: tri('Present Perfect: for / since', 'Present Perfect: for / since', 'Present Perfect: for / since'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['for three years', 'since 2021', 'since Monday', 'how long', 'have lived', 'has worked'],
    focusPatterns: [
      'for_duration_years',
      'since_starting_year',
      'for_duration_weeks',
      'since_monday',
      'for_a_long_time',
      'since_clause',
      'have_been_for_duration',
      'has_lived_since_start',
      'past_simple_finished_period',
      'how_long_have_you_lived',
      'how_long_has_she_worked',
      'answer_how_long_for',
      'for_since_pair',
      'continuing_vs_finished_period',
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
      microDiagnosisId: 'present_perfect_for_since',
      contrastSet: ['for + duration', 'since + starting point', 'how long', 'continuing situation'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logTimeExpressionType: true,
      logPreposition: true,
      logTense: true,
      logContinuingSituation: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=present_perfect_for_since',
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
