// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const SECOND_CONDITION_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre second conditional ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về second conditional này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan second conditional ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu second conditional açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie second conditional nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? SECOND_CONDITION_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST_SET = [
  'if + past simple',
  'would + base verb',
  'unreal present',
  'unlikely future',
  'if I were',
  'if I had',
  "wouldn't",
  'first vs second conditional',
];

const SMART_CONTRAST_SET = [
  'if + past simple',
  'would + base verb',
  'unreal present',
  'unlikely future',
  'if I were',
  'if I had',
  "wouldn't",
];

const option = (text: string) => ({ id: text, text });

const SECOND_CONDITION_SKILL_ES: Record<string, string> = {
  would_result_after_if_had: 'If I had marca una situacion imaginada; el resultado usa would study.',
  would_buy_result: 'Con If he had money, el resultado imaginado es he would buy.',
  would_tell_result: 'If she knew no habla de ayer; marca "si ella supiera".',
  no_would_after_if: 'No pongas would justo despues de if; usa If I had money.',
  if_i_could: 'Para "si pudiera", usa if I could.',
  unlikely_future: 'Rained tomorrow suena menos real; por eso el resultado usa would.',
  would_without_to: 'Despues de would va el verbo base, sin to.',
  would_help: 'Despues de would no agregues -s ni pasado.',
  wouldnt_result: 'El consejo negativo usa would not + verbo base.',
  if_i_were_you: 'Para consejo, el bloque fuerte es If I were you.',
  if_he_were: 'Para una situacion imaginada, usa If he were here.',
  advice_sentence: 'Consejo: If I were you + I would...',
  first_vs_second: 'Real: have/will. Imaginado: had/would.',
  if_forms_set: 'En el if imaginado usa were, knew, had, no would.',
  full_sentence_repair: 'Si no sabes el numero, usa If I knew... I would call.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = SECOND_CONDITION_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? SECOND_CONDITION_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function secondConditionEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = SECOND_CONDITION_SKILL_ES[input.targetSkill] ?? 'Usa if para la condicion imaginada y would para el resultado.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

const retry = (line: string): [TriText, TriText, TriText, TriText] => [
  tri(line, line, 'Real: If I have time, I will call. Imaginado: If I had time, I would call.'),
  tri(
    'Сначала реши: это реальный план или ситуация из серии "если бы"?',
    'Спочатку виріши: це реальний план чи ситуація з серії "якби"?',
    'Primero decide: es un plan real o una situacion imaginada?',
  ),
  tri(
    'Для "если бы" держи пару: If I had time, I would call.',
    'Для "якби" тримай пару: If I had time, I would call.',
    'Para una situacion imaginada: If I had time, I would call.',
  ),
  tri(
    'Не ставь will или would сразу после if. После would действие идет без to: would go, would help.',
    'Не став will або would одразу після if. Після would дія йде без to: would go, would help.',
    'No pongas will ni would despues de if. Despues de would, usa la accion sin to: would go, would help.',
  ),
];

const defaultWrong = (correctAnswer: string): TriText => tri(
  `Не эта форма. Здесь нужен вариант "${correctAnswer}": if дает воображаемое условие, а would дает результат.`,
  `Не ця форма. Тут потрібен варіант "${correctAnswer}": if дає уявну умову, а would дає результат.`,
  `No esta forma. Necesitamos "${correctAnswer}": if da la condicion imaginada y would da el resultado.`,
);

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
  wrong: Record<string, TriText>;
  retryLine: string;
  focusWords: string[];
}): DiagnosisTrainingStep {
  const esFeedback = secondConditionEsFeedback(input);
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: withEs(input.translation, esFeedback),
    explanationBlock: tri(
      'Смысл простой: это не реальный план, а воображаемая версия ситуации. If I had time, I would call.',
      'Сенс простий: це не реальний план, а уявна версія ситуації. If I had time, I would call.',
      'La idea: no es un plan real, sino una version imaginada de la situacion. If I had time, I would call.',
    ),
    microTask: tri(
      'Выбери форму, которая звучит как "если бы" или как результат после "бы".',
      'Обери форму, яка звучить як "якби" або як результат після "би".',
      'Elige la forma que suena como condicion imaginada o como su resultado.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map(option),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((item) => item === input.correctAnswer),
    correctFeedback: withEs(input.correctFeedback, esFeedback),
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((item) => item !== input.correctAnswer)
        .map((item) => [item, withEs(input.wrong[item] ?? defaultWrong(input.correctAnswer), esFeedback)]),
    ),
    retryFeedback: retry(input.retryLine).map((item) => withEs(item, esFeedback)) as [TriText, TriText, TriText, TriText],
    fallbackExplanation: tri(
      'Коротко: реально = If I have time, I will call. Воображаемо = If I had time, I would call.',
      'Коротко: реально = If I have time, I will call. Уявно = If I had time, I would call.',
      'Version corta: opcion real = If I have time, I will call. Opcion imaginada = If I had time, I would call.',
    ),
    focusWords: input.focusWords,
  };
}

export const CONDITION_SECOND_BASIC_TRAINING: DiagnosisTraining = {
  id: 'condition_second_basic',
  category: 'syntax',
  version: '1.0.0',
  status: 'active',
  priority: 51,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('If I had time, I would call', 'If I had time, I would call', 'If I had time, I would call', {
    'pt-BR': 'If I had time, I would call: situação imaginada',
    vi: 'If I had time, I would call: tình huống tưởng tượng',
    id: 'If I had time, I would call: situasi imajiner',
    tr: 'If I had time, I would call: hayali durum',
    pl: 'If I had time, I would call: sytuacja wyobrażona',
  }),
  shortTitle: tri('If I had / I would', 'If I had / I would', 'If I had / I would', {
    'pt-BR': 'If I had / I would',
    vi: 'If I had / I would',
    id: 'If I had / I would',
    tr: 'If I had / I would',
    pl: 'If I had / I would',
  }),
  shortDiagnosis: tri(
    'Ты смешиваешь реальный план и воображаемую ситуацию: If I have time, I will call vs If I had time, I would call.',
    'Ти змішуєш реальний план і уявну ситуацію: If I have time, I will call vs If I had time, I would call.',
    'Mezclas un plan real y una situacion imaginada: If I have time, I will call vs If I had time, I would call.',
    {
      'pt-BR': 'Você mistura plano real e situação imaginada: If I have time, I will call vs If I had time, I would call.',
      vi: 'Bạn trộn kế hoạch thật và tình huống tưởng tượng: If I have time, I will call với If I had time, I would call.',
      id: 'Kamu mencampur rencana nyata dan situasi imajiner: If I have time, I will call vs If I had time, I would call.',
      tr: 'Gerçek planla hayali durumu karıştırıyorsun: If I have time, I will call ile If I had time, I would call.',
      pl: 'Mieszasz realny plan i sytuację wyobrażoną: If I have time, I will call kontra If I had time, I would call.',
    },
  ),
  diagnosisText: tri(
    'Когда ты говоришь о ситуации "если бы", английский меняет две точки: после if ставит had, were или knew, а результат собирает через would.',
    'Коли ти говориш про ситуацію "якби", англійська змінює дві точки: після if ставить had, were або knew, а результат збирає через would.',
    'Cuando hablas de una situacion tipo "si fuera asi", el ingles cambia dos puntos: despues de if usa had, were o knew, y arma el resultado con would.',
    {
      'pt-BR': 'Quando você fala de uma situação do tipo "se fosse assim", o inglês muda dois pontos: depois de if usa had, were ou knew, e monta o resultado com would.',
      vi: 'Khi bạn nói về tình huống kiểu "nếu như vậy", tiếng Anh thay đổi hai điểm: sau if dùng had, were hoặc knew, và phần kết quả dùng would.',
      id: 'Saat kamu berbicara tentang situasi "seandainya", bahasa Inggris mengubah dua titik: setelah if memakai had, were, atau knew, lalu hasilnya dibangun dengan would.',
      tr: '"Öyle olsaydı" türü bir durumdan söz ettiğinde İngilizce iki noktayı değiştirir: if sonrasında had, were veya knew kullanır, sonucu ise would ile kurar.',
      pl: 'Gdy mówisz o sytuacji typu "gdyby tak było", angielski zmienia dwa miejsca: po if daje had, were albo knew, a wynik składa przez would.',
    },
  ),
  mentalModel: tri(
    'Думай не о прошлом времени, а о дистанции от реальности. If I had time здесь не значит "у меня было время". Это значит: "если бы у меня было время".',
    'Думай не про минулий час, а про дистанцію від реальності. If I had time тут не означає "у мене був час". Це означає: "якби у мене був час".',
    'No pienses en pasado, piensa en distancia de la realidad. If I had time aqui no significa "tuve tiempo"; significa "si tuviera tiempo".',
    {
      'pt-BR': 'Não pense em passado, pense em distância da realidade. If I had time aqui não significa "eu tive tempo"; significa "se eu tivesse tempo".',
      vi: 'Đừng nghĩ về thì quá khứ, hãy nghĩ về khoảng cách với thực tế. If I had time ở đây không có nghĩa là "tôi đã có thời gian"; nó nghĩa là "nếu tôi có thời gian".',
      id: 'Jangan pikirkan masa lalu, pikirkan jarak dari kenyataan. If I had time di sini bukan berarti "saya dulu punya waktu"; artinya "seandainya saya punya waktu".',
      tr: 'Geçmiş zamanı değil, gerçeklikten uzaklığı düşün. If I had time burada "zamanım vardı" demek değildir; "zamanım olsaydı" demektir.',
      pl: 'Nie myśl o czasie przeszłym, tylko o dystansie od rzeczywistości. If I had time tutaj nie znaczy "miałem czas"; znaczy "gdybym miał czas".',
    },
  ),
  contrastSet: CONTRAST_SET,
  coreRule: tri(
    'Воображаемое if: If I had time, I would call. Совет: If I were you, I would wait. После would не ставим to.',
    'Уявне if: If I had time, I would call. Порада: If I were you, I would wait. Після would не ставимо to.',
    'If imaginado: If I had time, I would call. Consejo: If I were you, I would wait. Despues de would no uses to.',
    {
      'pt-BR': 'If imaginado: If I had time, I would call. Conselho: If I were you, I would wait. Depois de would, não use to.',
      vi: 'If tưởng tượng: If I had time, I would call. Lời khuyên: If I were you, I would wait. Sau would, không dùng to.',
      id: 'If imajiner: If I had time, I would call. Saran: If I were you, I would wait. Setelah would, jangan gunakan to.',
      tr: 'Hayali if: If I had time, I would call. Tavsiye: If I were you, I would wait. Would sonrasında to kullanma.',
      pl: 'Wyobrażone if: If I had time, I would call. Rada: If I were you, I would wait. Po would nie używaj to.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Реальный план: If I have time, I will call.',
      'Воображаемая ситуация: If I had time, I would call.',
      'После if не ставим will или would в этом шаблоне.',
      'Результат делаем через would: I would go, she would help.',
      'Для совета держи готовый блок: If I were you.',
      'If I had может говорить про сейчас, не только про прошлое.',
    ],
    uk: [
      'Реальний план: If I have time, I will call.',
      'Уявна ситуація: If I had time, I would call.',
      'Після if не ставимо will або would у цьому шаблоні.',
      'Результат робимо через would: I would go, she would help.',
      'Для поради тримай готовий блок: If I were you.',
      'If I had може говорити про зараз, не лише про минуле.',
    ],
    es: [
      'Plan real: If I have time, I will call.',
      'Situacion imaginada: If I had time, I would call.',
      'No pongas will ni would despues de if en este patron.',
      'Usa would para el resultado: I would go, she would help.',
      'Para dar consejo, usa el bloque: If I were you.',
      'If I had puede hablar del presente, no solo del pasado.',
    ],
    'pt-BR': [
      'Plano real: If I have time, I will call.',
      'Situação imaginada: If I had time, I would call.',
      'Não coloque will ou would depois de if neste padrão.',
      'Use would para o resultado: I would go, she would help.',
      'Para conselho, use o bloco: If I were you.',
      'If I had pode falar do agora, não só do passado.',
    ],
    vi: [
      'Kế hoạch thật: If I have time, I will call.',
      'Tình huống tưởng tượng: If I had time, I would call.',
      'Không đặt will hoặc would sau if trong mẫu này.',
      'Dùng would cho kết quả: I would go, she would help.',
      'Khi đưa lời khuyên, dùng cụm: If I were you.',
      'If I had có thể nói về hiện tại, không chỉ quá khứ.',
    ],
    id: [
      'Rencana nyata: If I have time, I will call.',
      'Situasi imajiner: If I had time, I would call.',
      'Jangan taruh will atau would setelah if dalam pola ini.',
      'Gunakan would untuk hasilnya: I would go, she would help.',
      'Untuk memberi saran, pakai blok: If I were you.',
      'If I had bisa membicarakan sekarang, bukan hanya masa lalu.',
    ],
    tr: [
      'Gerçek plan: If I have time, I will call.',
      'Hayali durum: If I had time, I would call.',
      'Bu kalıpta if sonrasına will veya would koyma.',
      'Sonuç için would kullan: I would go, she would help.',
      'Tavsiye için hazır blok: If I were you.',
      'If I had sadece geçmişi değil, şu anı da anlatabilir.',
    ],
    pl: [
      'Realny plan: If I have time, I will call.',
      'Wyobrażona sytuacja: If I had time, I would call.',
      'W tym wzorze nie stawiaj will ani would po if.',
      'Do wyniku użyj would: I would go, she would help.',
      'Do rady użyj gotowego bloku: If I were you.',
      'If I had może mówić o teraźniejszości, nie tylko o przeszłości.',
    ],
  },
  examples: [
    { en: 'If I had more time, I would study more.', ru: 'If I had more time, I would study more.', uk: 'If I had more time, I would study more.', es: 'Si tuviera mas tiempo, estudiaria mas.', 'pt-BR': 'Se eu tivesse mais tempo, estudaria mais.', vi: 'Nếu tôi có nhiều thời gian hơn, tôi sẽ học nhiều hơn.', id: 'Jika saya punya lebih banyak waktu, saya akan belajar lebih banyak.', tr: 'Daha fazla zamanım olsaydı, daha çok çalışırdım.', pl: 'Gdybym miał więcej czasu, uczyłbym się więcej.', why: tri('Had показывает воображаемое условие, would study дает результат.', 'Had показує уявну умову, would study дає результат.', 'Had marca una condicion imaginada; would study da el resultado.') },
    { en: 'If I were you, I would wait.', ru: 'If I were you, I would wait.', uk: 'If I were you, I would wait.', es: 'Si yo fuera tu, esperaria.', 'pt-BR': 'Se eu fosse você, eu esperaria.', vi: 'Nếu tôi là bạn, tôi sẽ chờ.', id: 'Jika saya jadi kamu, saya akan menunggu.', tr: 'Senin yerinde olsam beklerdim.', pl: 'Gdybym był tobą, poczekałbym.', why: tri('If I were you - готовый блок для совета.', 'If I were you - готовий блок для поради.', 'If I were you es un bloque fijo para dar consejo.') },
    { en: 'If she knew the answer, she would tell us.', ru: 'If she knew the answer, she would tell us.', uk: 'If she knew the answer, she would tell us.', es: 'Si ella supiera la respuesta, nos lo diria.', 'pt-BR': 'Se ela soubesse a resposta, ela nos diria.', vi: 'Nếu cô ấy biết câu trả lời, cô ấy sẽ nói cho chúng ta.', id: 'Jika dia tahu jawabannya, dia akan memberi tahu kita.', tr: 'Cevabı bilseydi bize söylerdi.', pl: 'Gdyby znała odpowiedź, powiedziałaby nam.', why: tri('Knew здесь не про вчера. Оно показывает ситуацию "если бы она знала".', 'Knew тут не про вчора. Воно показує ситуацію "якби вона знала".', 'Knew aqui no habla de ayer; muestra "si ella supiera".') },
    { en: 'If he had money, he would buy a car.', ru: 'If he had money, he would buy a car.', uk: 'If he had money, he would buy a car.', es: 'Si tuviera dinero, compraria un coche.', 'pt-BR': 'Se ele tivesse dinheiro, compraria um carro.', vi: 'Nếu anh ấy có tiền, anh ấy sẽ mua một chiếc xe.', id: 'Jika dia punya uang, dia akan membeli mobil.', tr: 'Parası olsaydı araba alırdı.', pl: 'Gdyby miał pieniądze, kupiłby samochód.', why: tri('Had money + would buy: условие и результат в воображаемой ситуации.', 'Had money + would buy: умова і результат в уявній ситуації.', 'Had money + would buy: condicion y resultado en una situacion imaginada.') },
    { en: 'I would help you if I could.', ru: 'I would help you if I could.', uk: 'I would help you if I could.', es: 'Te ayudaria si pudiera.', 'pt-BR': 'Eu ajudaria você se pudesse.', vi: 'Tôi sẽ giúp bạn nếu tôi có thể.', id: 'Saya akan membantumu jika saya bisa.', tr: 'Yapabilsem sana yardım ederdim.', pl: 'Pomógłbym ci, gdybym mógł.', why: tri('Часть с if может стоять второй. Логика остается той же.', 'Частина з if може стояти другою. Логіка залишається тією самою.', 'La parte con if puede ir segunda; la logica no cambia.') },
    { en: 'If it rained tomorrow, we would stay home.', ru: 'If it rained tomorrow, we would stay home.', uk: 'If it rained tomorrow, we would stay home.', es: 'Si lloviera manana, nos quedariamos en casa.', 'pt-BR': 'Se chovesse amanhã, ficaríamos em casa.', vi: 'Nếu ngày mai trời mưa, chúng tôi sẽ ở nhà.', id: 'Jika besok hujan, kami akan tinggal di rumah.', tr: 'Yarın yağmur yağsaydı evde kalırdık.', pl: 'Gdyby jutro padało, zostalibyśmy w domu.', why: tri('Rained tomorrow звучит менее реально или как воображаемый вариант.', 'Rained tomorrow звучить менш реально або як уявний варіант.', 'Rained tomorrow suena menos real o como una opcion imaginada.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Ошибка обычно не в слове would. Ошибка в том, что ты смешиваешь реальное if I have и воображаемое if I had.', 'Помилка зазвичай не в слові would. Помилка в тому, що ти змішуєш реальне if I have і уявне if I had.', 'El error normalmente no esta en would. Esta en mezclar el if real, if I have, con el if imaginado, if I had.') },
    { id: 'intro_model', type: 'rule', text: tri('Запомни контраст: реальный план идет через have и will, а воображаемая ситуация идет через had и would.', 'Запамʼятай контраст: реальний план іде через have і will, а уявна ситуація іде через had і would.', 'Recuerda el contraste: un plan real usa have y will; una situacion imaginada usa had y would.') },
    { id: 'intro_warning', type: 'warning', text: tri('Две ловушки: If I would have money и I would to buy. Обе ломают фразу.', 'Дві пастки: If I would have money і I would to buy. Обидві ламають фразу.', 'Dos trampas: If I would have money y I would to buy. Las dos rompen la frase.') },
  ],
  steps: [
    step({
      id: 'cond_second_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'would_result_after_if_had',
      sentence: 'If I had more time, I ___ more.',
      translation: tri('If I had more time, I would study more.'),
      options: ['would study', 'will study', 'study', 'would studied'],
      correctAnswer: 'would study',
      correctFeedback: tri('Да. Это воображаемая ситуация: времени нет, поэтому результат строится через would study.', 'Так. Це уявна ситуація: часу немає, тому результат будується через would study.'),
      wrong: {
        'will study': tri('Will study звучит как реальный план. Здесь ситуация "если бы", поэтому нужно would study.', 'Will study звучить як реальний план. Тут ситуація "якби", тому потрібно would study.'),
        study: tri('Study без would не передает смысл "я бы учился". Нужно would study.', 'Study без would не передає сенс "я б навчався". Потрібно would study.'),
        'would studied': tri('После would действие не меняем. Нужно would study.', 'Після would дію не змінюємо. Потрібно would study.'),
      },
      retryLine: 'If I had more time -> I would study more.',
      focusWords: ['If I had', 'would study'],
    }),
    step({
      id: 'cond_second_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'would_buy_result',
      sentence: 'If he had money, he ___ a car.',
      translation: tri('If he had money, he would buy a car.'),
      options: ['would buy', 'will buy', 'buys', 'would bought'],
      correctAnswer: 'would buy',
      correctFeedback: tri('Да. Результат воображаемой ситуации: would buy.', 'Так. Результат уявної ситуації: would buy.'),
      wrong: {
        'will buy': tri('Will buy - реальный будущий план. После If he had money нужно would buy.', 'Will buy - реальний майбутній план. Після If he had money потрібно would buy.'),
        buys: tri('Buys не дает смысл "он бы купил". Нужно would buy.', 'Buys не дає сенс "він би купив". Потрібно would buy.'),
        'would bought': tri('После would говори buy, не bought. Нужно would buy.', 'Після would кажи buy, не bought. Потрібно would buy.'),
      },
      retryLine: 'If he had money -> he would buy a car.',
      focusWords: ['If he had', 'would buy'],
    }),
    step({
      id: 'cond_second_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'would_tell_result',
      sentence: 'If she knew the answer, she ___ us.',
      translation: tri('If she knew the answer, she would tell us.'),
      options: ['would tell', 'will tell', 'tells', 'would tells'],
      correctAnswer: 'would tell',
      correctFeedback: tri('Да. If she knew -> she would tell us.', 'Так. If she knew -> she would tell us.'),
      wrong: {
        'will tell': tri('Will tell звучит как реальный будущий вариант. Здесь нужно would tell.', 'Will tell звучить як реальний майбутній варіант. Тут потрібно would tell.'),
        tells: tri('Tells не означает "она бы сказала". Нужно would tell.', 'Tells не означає "вона б сказала". Потрібно would tell.'),
        'would tells': tri('После would не добавляй -s. Нужно would tell.', 'Після would не додавай -s. Потрібно would tell.'),
      },
      retryLine: 'If she knew the answer -> she would tell us.',
      focusWords: ['If she knew', 'would tell'],
    }),
    step({
      id: 'cond_second_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'no_would_after_if',
      sentence: 'Choose the correct sentence.',
      translation: tri('If I had money, I would buy a house.'),
      options: [
        'If I had money, I would buy a house.',
        'If I would have money, I would buy a house.',
        'If I will have money, I would buy a house.',
        'If I had money, I would to buy a house.',
      ],
      correctAnswer: 'If I had money, I would buy a house.',
      correctFeedback: tri('Да. If I had money + I would buy a house.', 'Так. If I had money + I would buy a house.'),
      wrong: {
        'If I would have money, I would buy a house.': tri('В этом шаблоне после if не нужен would. Нужно If I had money.', 'У цьому шаблоні після if не потрібен would. Потрібно If I had money.'),
        'If I will have money, I would buy a house.': tri('Will после if делает другую конструкцию. Здесь нужно If I had money.', 'Will після if робить іншу конструкцію. Тут потрібно If I had money.'),
        'If I had money, I would to buy a house.': tri('После would не нужно to. Нужно would buy.', 'Після would не потрібно to. Потрібно would buy.'),
      },
      retryLine: 'Скажи: If I had money, I would buy a house.',
      focusWords: ['If I had money', 'would buy'],
    }),
    step({
      id: 'cond_second_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'if_i_could',
      sentence: 'I would help you if I ___.',
      translation: tri('I would help you if I could.'),
      options: ['could', 'can', 'will can', 'would can'],
      correctAnswer: 'could',
      correctFeedback: tri('Да. If I could = если бы я мог.', 'Так. If I could = якби я міг.'),
      wrong: {
        can: tri('Can звучит как реальная возможность сейчас. Для "если бы я мог" нужно could.', 'Can звучить як реальна можливість зараз. Для "якби я міг" потрібно could.'),
        'will can': tri('Will can так не собирается. Нужно if I could.', 'Will can так не складається. Потрібно if I could.'),
        'would can': tri('Would can так не работает. Нужно if I could.', 'Would can так не працює. Потрібно if I could.'),
      },
      retryLine: 'I would help you if I could.',
      focusWords: ['would help', 'if I could'],
    }),
    step({
      id: 'cond_second_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'unlikely_future',
      sentence: 'If it ___ tomorrow, we would stay home.',
      translation: tri('If it rained tomorrow, we would stay home.'),
      options: ['rained', 'rains', 'will rain', 'would rain'],
      correctAnswer: 'rained',
      correctFeedback: tri('Да. If it rained tomorrow звучит как менее реальный вариант.', 'Так. If it rained tomorrow звучить як менш реальний варіант.'),
      wrong: {
        rains: tri('If it rains лучше живет с we will stay. Здесь есть would, поэтому нужно rained.', 'If it rains краще живе з we will stay. Тут є would, тому потрібно rained.'),
        'will rain': tri('Will не ставим после if в этом шаблоне. Нужно rained.', 'Will не ставимо після if у цьому шаблоні. Потрібно rained.'),
        'would rain': tri('Would обычно живет в результате, не сразу после if. Нужно If it rained.', 'Would зазвичай живе в результаті, не одразу після if. Потрібно If it rained.'),
      },
      retryLine: 'If it rained tomorrow, we would stay home.',
      focusWords: ['If it rained', 'would stay'],
    }),
    step({
      id: 'cond_second_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'would_without_to',
      sentence: 'I would ___ there.',
      translation: tri('I would go there.'),
      options: ['go', 'to go', 'went', 'going'],
      correctAnswer: 'go',
      correctFeedback: tri('Да. После would просто go: I would go.', 'Так. Після would просто go: I would go.'),
      wrong: {
        'to go': tri('После would не нужно to. Нужно would go.', 'Після would не потрібно to. Потрібно would go.'),
        went: tri('После would не нужно went. Нужно would go.', 'Після would не потрібно went. Потрібно would go.'),
        going: tri('Would going не собирается. Нужно would go.', 'Would going не складається. Потрібно would go.'),
      },
      retryLine: 'I would go there.',
      focusWords: ['would go'],
    }),
    step({
      id: 'cond_second_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'would_help',
      sentence: 'She would ___ us.',
      translation: tri('She would help us.'),
      options: ['help', 'helps', 'helped', 'to help'],
      correctAnswer: 'help',
      correctFeedback: tri('Да. She would help us.', 'Так. She would help us.'),
      wrong: {
        helps: tri('После would не добавляй -s. Нужно would help.', 'Після would не додавай -s. Потрібно would help.'),
        helped: tri('После would не нужно helped. Нужно would help.', 'Після would не потрібно helped. Потрібно would help.'),
        'to help': tri('После would не нужно to. Нужно would help.', 'Після would не потрібно to. Потрібно would help.'),
      },
      retryLine: 'She would help us.',
      focusWords: ['would help'],
    }),
    step({
      id: 'cond_second_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'wouldnt_result',
      sentence: 'I ___ there if I were you.',
      translation: tri("I wouldn't go there if I were you."),
      options: ["wouldn't go", "wouldn't went", "don't go", "won't went"],
      correctAnswer: "wouldn't go",
      correctFeedback: tri("Да. Отрицательный результат: I wouldn't go.", "Так. Заперечний результат: I wouldn't go."),
      wrong: {
        "wouldn't went": tri("После wouldn't говори go, не went. Нужно wouldn't go.", "Після wouldn't кажи go, не went. Потрібно wouldn't go."),
        "don't go": tri("Don't go больше похоже на команду. Здесь мягкий совет: I wouldn't go.", "Don't go більше схоже на команду. Тут мʼяка порада: I wouldn't go."),
        "won't went": tri("Won't went не собирается. Для совета нужно wouldn't go.", "Won't went не складається. Для поради потрібно wouldn't go."),
      },
      retryLine: "I wouldn't go there if I were you.",
      focusWords: ["wouldn't go", 'if I were you'],
    }),
    step({
      id: 'cond_second_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'if_i_were_you',
      sentence: 'If I ___ you, I would wait.',
      translation: tri('If I were you, I would wait.'),
      options: ['were', 'was', 'am', 'will be'],
      correctAnswer: 'were',
      correctFeedback: tri('Да. Готовый блок для совета: If I were you.', 'Так. Готовий блок для поради: If I were you.'),
      wrong: {
        was: tri('Was можно услышать, но для сильного учебного шаблона держи If I were you.', 'Was можна почути, але для сильного навчального шаблону тримай If I were you.'),
        am: tri('If I am you не работает по смыслу. Нужно If I were you.', 'If I am you не працює за сенсом. Потрібно If I were you.'),
        'will be': tri('Will be после if не нужно в этом совете. Нужно If I were you.', 'Will be після if не потрібне в цій пораді. Потрібно If I were you.'),
      },
      retryLine: 'If I were you, I would wait.',
      focusWords: ['If I were you', 'would wait'],
    }),
    step({
      id: 'cond_second_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'if_he_were',
      sentence: 'If he ___ here, he would help us.',
      translation: tri('If he were here, he would help us.'),
      options: ['were', 'is', 'will be', 'would be'],
      correctAnswer: 'were',
      correctFeedback: tri('Да. If he were here -> he would help us.', 'Так. If he were here -> he would help us.'),
      wrong: {
        is: tri('Is делает ситуацию реальной сейчас. Здесь нужно If he were here.', 'Is робить ситуацію реальною зараз. Тут потрібно If he were here.'),
        'will be': tri('Will be после if не нужно в этом шаблоне. Нужно were.', 'Will be після if не потрібне в цьому шаблоні. Потрібно were.'),
        'would be': tri('Would оставляем для результата. После if здесь нужно were.', 'Would залишаємо для результату. Після if тут потрібно were.'),
      },
      retryLine: 'If he were here, he would help us.',
      focusWords: ['If he were', 'would help'],
    }),
    step({
      id: 'cond_second_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'advice_sentence',
      sentence: 'Choose the best advice sentence.',
      translation: tri('If I were you, I would talk to him.'),
      options: [
        'If I were you, I would talk to him.',
        'If I am you, I will talk to him.',
        'If I would be you, I would talk to him.',
        'If I were you, I would to talk to him.',
      ],
      correctAnswer: 'If I were you, I would talk to him.',
      correctFeedback: tri('Да. Совет звучит так: If I were you, I would talk to him.', 'Так. Порада звучить так: If I were you, I would talk to him.'),
      wrong: {
        'If I am you, I will talk to him.': tri('If I am you ломается по смыслу. Для совета нужно If I were you.', 'If I am you ламається за сенсом. Для поради потрібно If I were you.'),
        'If I would be you, I would talk to him.': tri('Не ставь would после if. Нужно If I were you.', 'Не став would після if. Потрібно If I were you.'),
        'If I were you, I would to talk to him.': tri('После would не нужно to. Нужно would talk.', 'Після would не потрібно to. Потрібно would talk.'),
      },
      retryLine: 'If I were you, I would talk to him.',
      focusWords: ['If I were you', 'would talk'],
    }),
    step({
      id: 'cond_second_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'first_vs_second',
      sentence: 'Choose the correct pair.',
      translation: tri('If I have time, I will call / If I had time, I would call'),
      options: [
        'If I have time, I will call / If I had time, I would call',
        'If I had time, I will call / If I have time, I would call',
        'If I will have time, I will call / If I would have time, I would call',
        'If I have time, I would called / If I had time, I will called',
      ],
      correctAnswer: 'If I have time, I will call / If I had time, I would call',
      correctFeedback: tri('Да. Реально: have/will. Воображаемо: had/would.', 'Так. Реально: have/will. Уявно: had/would.'),
      wrong: {
        'If I had time, I will call / If I have time, I would call': tri('Формы перепутаны. Реально: If I have, I will. Воображаемо: If I had, I would.', 'Форми переплутані. Реально: If I have, I will. Уявно: If I had, I would.'),
        'If I will have time, I will call / If I would have time, I would call': tri('Не ставь will/would после if. Нужно have/had.', 'Не став will/would після if. Потрібно have/had.'),
        'If I have time, I would called / If I had time, I will called': tri('Called после would/will не нужно. Нужно will call / would call.', 'Called після would/will не потрібне. Потрібно will call / would call.'),
      },
      retryLine: 'Реально: If I have time, I will call. Воображаемо: If I had time, I would call.',
      focusWords: ['If I have', 'will call', 'If I had', 'would call'],
    }),
    step({
      id: 'cond_second_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'if_forms_set',
      sentence: 'Choose the set for imagined if.',
      translation: tri('if I were / if she knew / if he had'),
      options: [
        'if I were / if she knew / if he had',
        'if I am / if she knows / if he has',
        'if I would be / if she would know / if he would have',
        'if I will be / if she will know / if he will have',
      ],
      correctAnswer: 'if I were / if she knew / if he had',
      correctFeedback: tri('Да. Для воображаемого if: were, knew, had.', 'Так. Для уявного if: were, knew, had.'),
      wrong: {
        'if I am / if she knows / if he has': tri('Это звучит реальнее. Для воображаемого if нужно were/knew/had.', 'Це звучить реальніше. Для уявного if потрібно were/knew/had.'),
        'if I would be / if she would know / if he would have': tri('Would не ставим сразу после if. Нужно were/knew/had.', 'Would не ставимо одразу після if. Потрібно were/knew/had.'),
        'if I will be / if she will know / if he will have': tri('Will не ставим после if в этом шаблоне. Нужно were/knew/had.', 'Will не ставимо після if у цьому шаблоні. Потрібно were/knew/had.'),
      },
      retryLine: 'Imagined if: if I were / if she knew / if he had.',
      focusWords: ['if I were', 'if she knew', 'if he had'],
    }),
    step({
      id: 'cond_second_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'full_sentence_repair',
      sentence: 'Choose the correct sentence.',
      translation: tri('If I knew his number, I would call him.'),
      options: [
        'If I knew his number, I would call him.',
        'If I know his number, I will call him.',
        'If I would know his number, I would call him.',
        'If I knew his number, I would to call him.',
      ],
      correctAnswer: 'If I knew his number, I would call him.',
      correctFeedback: tri('Да. Номера я не знаю, поэтому это не реальный план, а воображаемый вариант с knew и would call.', 'Так. Номера я не знаю, тому це не реальний план, а уявний варіант із knew і would call.'),
      wrong: {
        'If I know his number, I will call him.': tri('Это реальный будущий вариант. Нужный смысл: If I knew his number.', 'Це реальний майбутній варіант. Потрібний сенс: If I knew his number.'),
        'If I would know his number, I would call him.': tri('Would не ставим после if. Нужно If I knew his number.', 'Would не ставимо після if. Потрібно If I knew his number.'),
        'If I knew his number, I would to call him.': tri('После would не нужно to. Нужно would call.', 'Після would не потрібно to. Потрібно would call.'),
      },
      retryLine: 'If I knew his number, I would call him.',
      focusWords: ['If I knew', 'would call'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'will_in_if_second_conditional_error',
      'would_in_if_clause_error',
      'missing_would_main_clause_error',
      'would_to_error',
      'would_plus_past_error',
      'first_second_conditional_confusion',
      'if_i_was_instead_of_were_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Покажи две половины: воображаемое if и результат с would.', 'Покажи дві половини: уявне if і результат з would.', 'Muestra dos mitades: if imaginado y resultado con would.'),
    depth2: tri('Спроси себя: это реальный план или "если бы"?', 'Запитай себе: це реальний план чи "якби"?', 'Preguntate: es un plan real o una situacion de "si fuera asi"?'),
    depth3: tri('Сравни смысл: реальный вариант сейчас берет have и will, а воображаемый вариант берет had и would.', 'Порівняй зміст: реальний варіант зараз бере have і will, а уявний варіант бере had і would.', 'Compara el sentido: una opcion real usa have y will; una imaginada usa had y would.'),
    depth4: tri('Собери почти готовый шаблон и оставь пропуск только в одном месте.', 'Збери майже готовий шаблон і залиш пропуск тільки в одному місці.', 'Arma casi todo el patron y deja el hueco solo en un lugar.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Реально: есть шанс и план, поэтому have + will. Воображаемо: сейчас этого нет, поэтому had + would.', 'Реально: є шанс і план, тому have + will. Уявно: зараз цього немає, тому had + would.', 'Real: If I have time, I will call. Imaginado: If I had time, I would call.') },
    afterThreeWrongInSameExercise: { action: 'show_unreal_condition_hint_then_retry', card: tri('Подсказка: если смысл "если бы", не ставь will/would сразу после if.', 'Підказка: якщо сенс "якби", не став will/would одразу після if.', 'Pista: si el sentido es imaginado, no pongas will/would justo despues de if.') },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: сначала выбери реальное или воображаемое. Потом собери if и результат.', 'Guided mode: спочатку обери реальне чи уявне. Потім збери if і результат.', 'Modo guiado: primero elige real o imaginado, luego arma if y el resultado.') },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_cond_second_001', prompt: tri('If I had more time, I would study more: это реальный план или воображаемая ситуация?', 'If I had more time, I would study more: це реальний план чи уявна ситуація?', 'If I had more time, I would study more: plan real o situacion imaginada?'), options: ['real plan', 'imagined situation'], correctIndex: 1, thenReturnToExerciseId: 'cond_second_easy_001' },
      { id: 'guided_cond_second_002', prompt: tri('Для "если бы у меня были деньги" что нужно после if?', 'Для "якби у мене були гроші" що потрібно після if?', 'Para "si tuviera dinero", que necesitamos despues de if?'), options: ['I had money', 'I would have money'], correctIndex: 0, thenReturnToExerciseId: 'cond_second_contrast_001' },
      { id: 'guided_cond_second_003', prompt: tri('После would что звучит правильно?', 'Після would що звучить правильно?', 'Despues de would, que suena correcto?'), options: ['go', 'to go'], correctIndex: 0, thenReturnToExerciseId: 'cond_second_contrast_004' },
      { id: 'guided_cond_second_004', prompt: tri('Готовый блок для совета: какой?', 'Готовий блок для поради: який?', 'Bloque fijo para consejo: cual?'), options: ['If I was you', 'If I were you'], correctIndex: 1, thenReturnToExerciseId: 'cond_second_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'condition_second_basic',
    diagnosisLabel: tri('If I had / I would', 'If I had / I would', 'If I had / I would: condicion imaginada'),
    contrastSet: SMART_CONTRAST_SET,
    difficultyLevel: 2,
    focusWords: ['If I had', 'would study', 'If I were you', 'would buy', 'would call'],
    focusPatterns: [
      'would_result_after_if_had',
      'would_buy_result',
      'would_tell_result',
      'no_would_after_if',
      'if_i_could',
      'unlikely_future',
      'would_without_to',
      'would_help',
      'wouldnt_result',
      'if_i_were_you',
      'if_he_were',
      'advice_sentence',
      'first_vs_second',
      'if_forms_set',
      'full_sentence_repair',
    ],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
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
    payload: { category: 'syntax', microDiagnosisId: 'condition_second_basic', contrastSet: ['second conditional', 'if + past', 'would + plain action', 'imagined condition', 'if I were'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=condition_second_basic',
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
