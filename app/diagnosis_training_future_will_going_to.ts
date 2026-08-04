import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const FUTURE_WILL_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre will/going to ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về will/going to này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan will/going to ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu will/going to açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie will/going to nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? FUTURE_WILL_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = ['will', 'going to', 'instant decision', 'promise', 'prediction', 'plan', 'intention', 'evidence'];

const MODEL = tri(
  'Will чаще звучит как решение прямо сейчас, обещание или мнение о будущем: I will help, I think it will rain. Going to чаще звучит как уже готовый план, намерение или то, что видно по признакам: I am going to study, It is going to rain.',
  'Will частіше звучить як рішення прямо зараз, обіцянка або думка про майбутнє: I will help, I think it will rain. Going to частіше звучить як уже готовий план, намір або те, що видно за ознаками: I am going to study, It is going to rain.',
  'Will suele sonar como decision ahora, promesa u opinion sobre el futuro: I will help, I think it will rain. Going to suele sonar como plan ya preparado, intencion o algo visible por senales: I am going to study, It is going to rain.',
  {
    'pt-BR': 'Will costuma soar como uma decisão tomada agora, uma promessa ou uma opinião sobre o futuro: I will help, I think it will rain. Going to costuma soar como um plano já preparado, uma intenção ou algo visível por sinais: I am going to study, It is going to rain.',
    vi: 'Will thường nghe như quyết định ngay lúc nói, lời hứa hoặc ý kiến về tương lai: I will help, I think it will rain. Going to thường nghe như kế hoạch đã chuẩn bị, ý định hoặc điều nhìn thấy qua dấu hiệu: I am going to study, It is going to rain.',
    id: 'Will biasanya terdengar seperti keputusan saat ini, janji, atau pendapat tentang masa depan: I will help, I think it will rain. Going to biasanya terdengar seperti rencana yang sudah siap, niat, atau sesuatu yang terlihat dari tanda-tanda: I am going to study, It is going to rain.',
    tr: 'Will çoğu zaman o anda alınan karar, söz verme ya da gelecek hakkındaki görüş gibi duyulur: I will help, I think it will rain. Going to çoğu zaman hazır plan, niyet ya da görünen işaretler gibi duyulur: I am going to study, It is going to rain.',
    pl: 'Will często brzmi jak decyzja podjęta teraz, obietnica albo opinia o przyszłości: I will help, I think it will rain. Going to częściej brzmi jak gotowy plan, zamiar albo coś widocznego po oznakach: I am going to study, It is going to rain.',
  },
);

const FUTURE_WILL_SKILL_ES: Record<string, string> = {
  will_promise: 'Promesa = will.',
  will_instant_decision: 'Decision tomada ahora = will.',
  will_opinion_prediction: 'I think introduce prediccion/opinion = will.',
  going_to_plan_i: 'Plan ya preparado = am going to.',
  going_to_plan_she: 'Con she y plan usa is going to.',
  going_to_plan_they: 'Con they y plan usa are going to.',
  will_no_to: 'Despues de will no uses to ni -ing.',
  going_to_visible_future: 'Senales visibles = going to.',
  missing_be_going_to: 'Going to necesita am/is/are antes.',
  evidence_going_to: 'Las nubes son evidencia visible: is going to.',
  opinion_prediction_will: 'I think suele llevar will para opinion.',
  instant_decision_vs_plan: 'Recordo y decide ahora: will.',
  mixed_will_going_to_pair: 'Promesa = will; plan = am going to.',
  mixed_evidence_opinion: 'Opinion = will; evidencia visible = going to.',
  mixed_sentence_correction: 'Promesa = will call; plan = am going to study.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = FUTURE_WILL_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? FUTURE_WILL_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function futureWillEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = FUTURE_WILL_SKILL_ES[input.targetSkill] ?? 'Decide si es decision, promesa, prediccion, plan o evidencia.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(correct: string, clue: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала реши смысл: человек решил сейчас, обещает, предполагает, уже планирует или видит признаки?',
      'Спочатку виріши сенс: людина вирішила зараз, обіцяє, припускає, уже планує чи бачить ознаки?',
      'Primero decide el sentido: decision ahora, promesa, prediccion, plan o evidencia.',
    ),
    clue,
    tri(
      'Потом проверь форму: после will действие идет без to и без -ing; с going to нужен am, is или are.',
      'Потiм перевiр форму: пiсля will дiя йде без to i без -ing; з going to потрiбен am, is або are.',
      'Luego arma el bloque: will help / will call o am/is/are going to study.',
    ),
    tri(
      'Здесь выбери вариант, где совпали и смысл будущего, и форма после will или going to.',
      'Тут обери варiант, де збiглися i сенс майбутнього, i форма пiсля will або going to.',
      `La respuesta aqui es: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Смысл фразы просит другой кусок будущего. Здесь нужно: ${correct}.`,
    `Майже. Сенс фрази просить інший зворот майбутнього. Тут потрібно: ${correct}.`,
    `Casi. Este sentido pide: ${correct}.`,
  );
}

function futureStep(input: {
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
  clue: TriText;
  focusWords: string[];
}): DiagnosisTrainingStep {
  const esFeedback = futureWillEsFeedback(input);
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
      'Выбери между will и going to по смыслу, а потом проверь форму: will call, I am going to study, she is going to start.',
      'Обери між will і going to за сенсом, а потім перевір форму: will call, I am going to study, she is going to start.',
      'Elige will o going to por sentido, luego comprueba la forma.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map((text) => ({ id: text, text })),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((option) => option === input.correctAnswer),
    correctFeedback: withEs(input.correctFeedback, esFeedback),
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((option) => option !== input.correctAnswer)
        .map((option) => [option, withEs(input.wrong?.[option] ?? defaultWrong(input.correctAnswer), esFeedback)]),
    ),
    retryFeedback: retry(input.correctAnswer, input.clue).map((item) => withEs(item, esFeedback)) as [TriText, TriText, TriText, TriText],
    fallbackExplanation: tri(
      'Коротко: will - решил сейчас, обещаю, думаю что будет. Going to - план уже есть или видно, к чему всё идет. После will не ставь to: will call. С going to не пропускай am/is/are: I am going to study.',
      'Коротко: will - вирішив зараз, обіцяю, думаю що буде. Going to - план уже є або видно, до чого все йде. Після will не став to: will call. З going to не пропускай am/is/are: I am going to study.',
      'Version corta: will = decidi ahora, prometo, creo que pasara. Going to = ya hay plan o se ve hacia donde va todo. Despues de will no uses to: will call. Con going to no omitas am/is/are.',
    ),
    focusWords: input.focusWords,
  };
}

export const FUTURE_WILL_GOING_TO_TRAINING: DiagnosisTraining = {
  id: 'future_will_going_to',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 27,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Will / Going to: будущее без гадания', 'Will / Going to: майбутнє без вгадування', 'Will / Going to', {
    'pt-BR': 'Will / Going to: futuro sem chute',
    vi: 'Will / Going to: nói về tương lai không đoán mò',
    id: 'Will / Going to: masa depan tanpa menebak',
    tr: 'Will / Going to: tahmin etmeden gelecek',
    pl: 'Will / Going to: przyszłość bez zgadywania',
  }),
  shortTitle: tri('Will / Going to', 'Will / Going to', 'Will / Going to', {
    'pt-BR': 'Will / Going to',
    vi: 'Will / Going to',
    id: 'Will / Going to',
    tr: 'Will / Going to',
    pl: 'Will / Going to',
  }),
  shortDiagnosis: tri(
    'Ты переводишь оба варианта как "буду" и не различаешь: это решение сейчас, обещание, прогноз, план или видимые признаки.',
    'Ти перекладаєш обидва варіанти як "буду" і не розрізняєш: це рішення зараз, обіцянка, прогноз, план чи видимі ознаки.',
    'Traduces ambas formas como futuro y pierdes la diferencia de sentido.',
    {
      'pt-BR': 'Você traduz as duas formas como futuro e não diferencia: é decisão agora, promessa, previsão, plano ou sinais visíveis.',
      vi: 'Bạn dịch cả hai dạng như tương lai và không phân biệt: đây là quyết định ngay lúc nói, lời hứa, dự đoán, kế hoạch hay dấu hiệu nhìn thấy được.',
      id: 'Kamu menerjemahkan kedua bentuk sebagai masa depan dan tidak membedakan: ini keputusan saat ini, janji, prediksi, rencana, atau tanda yang terlihat.',
      tr: 'İki biçimi de gelecek zaman gibi çeviriyorsun ve ayrımı kaçırıyorsun: o anki karar mı, söz mü, tahmin mi, plan mı, yoksa görünen işaret mi?',
      pl: 'Tłumaczysz obie formy jako przyszłość i nie rozróżniasz: czy to decyzja teraz, obietnica, przewidywanie, plan czy widoczne oznaki.',
    },
  ),
  diagnosisText: tri(
    'Ошибка появляется не потому, что будущее сложное. Проблема в том, что русский часто дает одно "буду", а английский спрашивает точнее: ты решил это сейчас, обещаешь, предполагаешь, уже планируешь или видишь признаки?',
    'Помилка зʼявляється не тому, що майбутнє складне. Проблема в тому, що українська часто дає одне "буду", а англійська питає точніше: ти вирішив це зараз, обіцяєш, припускаєш, уже плануєш чи бачиш ознаки?',
    'El error aparece porque el ingles separa decisiones instantaneas, promesas, predicciones, planes y evidencia.',
    {
      'pt-BR': 'O erro não aparece porque o futuro é difícil. O problema é que o português muitas vezes usa uma ideia geral de futuro, enquanto o inglês pergunta com mais precisão: você decidiu agora, está prometendo, está prevendo, já planejou ou vê sinais?',
      vi: 'Lỗi không xuất hiện vì thì tương lai quá khó. Vấn đề là tiếng Việt thường dùng một cách nói chung cho tương lai, còn tiếng Anh hỏi chính xác hơn: bạn vừa quyết định, đang hứa, đang dự đoán, đã có kế hoạch hay nhìn thấy dấu hiệu?',
      id: 'Kesalahan muncul bukan karena masa depan itu sulit. Masalahnya, bahasa Indonesia sering memberi satu makna umum untuk masa depan, sedangkan bahasa Inggris bertanya lebih tepat: kamu memutuskan sekarang, berjanji, memperkirakan, sudah punya rencana, atau melihat tanda?',
      tr: 'Hata, gelecek zaman zor olduğu için ortaya çıkmaz. Sorun şu: Türkçe çoğu zaman genel bir gelecek anlamı verir, İngilizce ise daha net sorar: bunu şimdi mi kararlaştırdın, söz mü veriyorsun, tahmin mi ediyorsun, zaten planladın mı, yoksa işaretleri mi görüyorsun?',
      pl: 'Błąd nie pojawia się dlatego, że przyszłość jest trudna. Problem w tym, że polski często daje jedną ogólną przyszłość, a angielski pyta dokładniej: decydujesz teraz, obiecujesz, przewidujesz, już planujesz czy widzisz oznaki?',
    },
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    'Will: I will help you, I will call you later, I think it will rain. Going to: I am going to study tonight, She is going to start a course, Look at the clouds. It is going to rain.',
    'Will: I will help you, I will call you later, I think it will rain. Going to: I am going to study tonight, She is going to start a course, Look at the clouds. It is going to rain.',
    'Will: decision/promesa/prediccion. Going to: plan/intencion/evidencia.',
    {
      'pt-BR': 'Will: I will help you, I will call you later, I think it will rain. Going to: I am going to study tonight, She is going to start a course, Look at the clouds. It is going to rain.',
      vi: 'Will: I will help you, I will call you later, I think it will rain. Going to: I am going to study tonight, She is going to start a course, Look at the clouds. It is going to rain.',
      id: 'Will: I will help you, I will call you later, I think it will rain. Going to: I am going to study tonight, She is going to start a course, Look at the clouds. It is going to rain.',
      tr: 'Will: I will help you, I will call you later, I think it will rain. Going to: I am going to study tonight, She is going to start a course, Look at the clouds. It is going to rain.',
      pl: 'Will: I will help you, I will call you later, I think it will rain. Going to: I am going to study tonight, She is going to start a course, Look at the clouds. It is going to rain.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Will часто нужен, когда решение появляется прямо сейчас: The phone is ringing. I will answer it.',
      'Will часто нужен для обещания: I will help you.',
      'Will часто нужен с мнением или прогнозом: I think it will be fine.',
      'Going to часто нужен, когда план уже есть: I am going to study tonight.',
      'Going to часто нужен для намерения: She is going to start a new course.',
      'Going to часто нужен, когда есть видимые признаки: Look at the clouds. It is going to rain.',
      'После will не ставь to: I will call, не I will to call.',
      'С going to не пропускай am/is/are: I am going to study, she is going to start.',
      'После will и going to действие остается обычным: will call, going to study.',
      'Will и going to иногда оба возможны, но оттенок меняется: решение сейчас против уже готового плана.',
    ],
    uk: [
      'Will часто потрібен, коли рішення зʼявляється прямо зараз: The phone is ringing. I will answer it.',
      'Will часто потрібен для обіцянки: I will help you.',
      'Will часто потрібен із думкою або прогнозом: I think it will be fine.',
      'Going to часто потрібен, коли план уже є: I am going to study tonight.',
      'Going to часто потрібен для наміру: She is going to start a new course.',
      'Going to часто потрібен, коли є видимі ознаки: Look at the clouds. It is going to rain.',
      'Після will не став to: I will call, не I will to call.',
      'З going to не пропускай am/is/are: I am going to study, she is going to start.',
      'Після will і going to дія лишається звичайною: will call, going to study.',
      'Will і going to іноді обидва можливі, але відтінок змінюється: рішення зараз проти вже готового плану.',
    ],
    es: [
      'Will suele marcar una decision instantanea.',
      'Will suele marcar una promesa.',
      'Will suele marcar una prediccion u opinion.',
      'Going to suele marcar un plan existente.',
      'Going to suele marcar intencion.',
      'Going to suele marcar evidencia visible.',
      'No digas will to call.',
      'No omitas am/is/are con going to.',
      'Usa will call y going to study.',
      'Will y going to pueden ser posibles, pero cambia el sentido.',
    ],
    'pt-BR': [
      'Will muitas vezes é usado quando a decisão aparece agora mesmo: The phone is ringing. I will answer it.',
      'Will muitas vezes é usado para promessa: I will help you.',
      'Will muitas vezes aparece com opinião ou previsão: I think it will be fine.',
      'Going to muitas vezes é usado quando o plano já existe: I am going to study tonight.',
      'Going to muitas vezes marca intenção: She is going to start a new course.',
      'Going to muitas vezes aparece quando há sinais visíveis: Look at the clouds. It is going to rain.',
      'Depois de will não use to: I will call, não I will to call.',
      'Com going to não esqueça am/is/are: I am going to study, she is going to start.',
      'Depois de will e going to, o verbo principal fica na forma base: will call, going to study.',
      'Will e going to às vezes são ambos possíveis, mas o sentido muda: decisão agora contra plano já pronto.',
    ],
    vi: [
      'Will thường dùng khi quyết định xuất hiện ngay lúc nói: The phone is ringing. I will answer it.',
      'Will thường dùng cho lời hứa: I will help you.',
      'Will thường dùng với ý kiến hoặc dự đoán: I think it will be fine.',
      'Going to thường dùng khi kế hoạch đã có sẵn: I am going to study tonight.',
      'Going to thường diễn tả ý định: She is going to start a new course.',
      'Going to thường dùng khi có dấu hiệu nhìn thấy được: Look at the clouds. It is going to rain.',
      'Sau will không dùng to: I will call, không phải I will to call.',
      'Với going to, đừng bỏ am/is/are: I am going to study, she is going to start.',
      'Sau will và going to, động từ chính giữ dạng gốc: will call, going to study.',
      'Will và going to đôi khi đều có thể dùng, nhưng sắc thái đổi: quyết định ngay lúc nói so với kế hoạch đã có.',
    ],
    id: [
      'Will sering dipakai ketika keputusan muncul saat ini juga: The phone is ringing. I will answer it.',
      'Will sering dipakai untuk janji: I will help you.',
      'Will sering dipakai dengan opini atau prediksi: I think it will be fine.',
      'Going to sering dipakai ketika rencana sudah ada: I am going to study tonight.',
      'Going to sering menunjukkan niat: She is going to start a new course.',
      'Going to sering dipakai ketika ada tanda yang terlihat: Look at the clouds. It is going to rain.',
      'Setelah will jangan pakai to: I will call, bukan I will to call.',
      'Dengan going to jangan hilangkan am/is/are: I am going to study, she is going to start.',
      'Setelah will dan going to, kata kerja utama tetap bentuk dasar: will call, going to study.',
      'Will dan going to kadang sama-sama mungkin, tetapi nuansanya berubah: keputusan sekarang versus rencana yang sudah siap.',
    ],
    tr: [
      'Will çoğu zaman karar tam o anda ortaya çıktığında kullanılır: The phone is ringing. I will answer it.',
      'Will çoğu zaman söz verirken kullanılır: I will help you.',
      'Will çoğu zaman görüş veya tahminle kullanılır: I think it will be fine.',
      'Going to çoğu zaman plan zaten hazır olduğunda kullanılır: I am going to study tonight.',
      'Going to çoğu zaman niyet gösterir: She is going to start a new course.',
      'Going to çoğu zaman görünür işaretler olduğunda kullanılır: Look at the clouds. It is going to rain.',
      'Will sonrasında to kullanma: I will call, I will to call değil.',
      'Going to ile am/is/are sözcüklerini atlama: I am going to study, she is going to start.',
      'Will ve going to sonrasında ana fiil yalın halde kalır: will call, going to study.',
      'Will ve going to bazen ikisi de mümkün olabilir, ama anlam değişir: o anki karar ile hazır plan ayrılır.',
    ],
    pl: [
      'Will często używamy, gdy decyzja pojawia się właśnie teraz: The phone is ringing. I will answer it.',
      'Will często używamy przy obietnicy: I will help you.',
      'Will często występuje z opinią lub przewidywaniem: I think it will be fine.',
      'Going to często używamy, gdy plan już istnieje: I am going to study tonight.',
      'Going to często pokazuje zamiar: She is going to start a new course.',
      'Going to często używamy, gdy są widoczne oznaki: Look at the clouds. It is going to rain.',
      'Po will nie używaj to: I will call, nie I will to call.',
      'Przy going to nie pomijaj am/is/are: I am going to study, she is going to start.',
      'Po will i going to główny czasownik zostaje w formie podstawowej: will call, going to study.',
      'Will i going to czasem oba są możliwe, ale zmienia się sens: decyzja teraz kontra gotowy plan.',
    ],
  },
  examples: [
    { en: 'I will help you.', ru: 'Я помогу тебе.', uk: 'Я допоможу тобі.', es: 'Te ayudare.', 'pt-BR': 'Eu vou te ajudar.', vi: 'Tôi sẽ giúp bạn.', id: 'Saya akan membantumu.', tr: 'Sana yardım edeceğim.', pl: 'Pomogę ci.', why: tri('Звучит как обещание или решение помочь.', 'Звучить як обіцянка або рішення допомогти.', 'Suena como promesa o decision de ayudar.') },
    { en: 'The phone is ringing. I will answer it.', ru: 'Телефон звонит. Я отвечу.', uk: 'Телефон дзвонить. Я відповім.', es: 'Esta sonando el telefono. Contestare.', 'pt-BR': 'O telefone está tocando. Eu vou atender.', vi: 'Điện thoại đang reo. Tôi sẽ nghe máy.', id: 'Teleponnya berdering. Saya akan menjawabnya.', tr: 'Telefon çalıyor. Ben cevap vereceğim.', pl: 'Telefon dzwoni. Odbiorę.', why: tri('Решение появляется в момент речи.', 'Рішення зʼявляється в момент мовлення.', 'La decision aparece ahora.') },
    { en: 'I think it will be fine.', ru: 'Думаю, всё будет нормально.', uk: 'Думаю, усе буде нормально.', es: 'Creo que estara bien.', 'pt-BR': 'Acho que vai ficar tudo bem.', vi: 'Tôi nghĩ mọi chuyện sẽ ổn.', id: 'Saya pikir itu akan baik-baik saja.', tr: 'Bence iyi olacak.', pl: 'Myślę, że będzie dobrze.', why: tri('I think показывает мнение о будущем.', 'I think показує думку про майбутнє.', 'I think introduce una prediccion.') },
    { en: 'I am going to study tonight.', ru: 'Я собираюсь учиться сегодня вечером.', uk: 'Я збираюся вчитися сьогодні ввечері.', es: 'Voy a estudiar esta noche.', 'pt-BR': 'Vou estudar hoje à noite.', vi: 'Tối nay tôi sẽ học.', id: 'Saya akan belajar malam ini.', tr: 'Bu gece ders çalışacağım.', pl: 'Zamierzam się uczyć dziś wieczorem.', why: tri('Это звучит как уже готовый план.', 'Це звучить як уже готовий план.', 'Suena como un plan ya preparado.') },
    { en: 'She is going to start a new course.', ru: 'Она собирается начать новый курс.', uk: 'Вона збирається почати новий курс.', es: 'Ella va a empezar un curso nuevo.', 'pt-BR': 'Ela vai começar um curso novo.', vi: 'Cô ấy sẽ bắt đầu một khóa học mới.', id: 'Dia akan memulai kursus baru.', tr: 'Yeni bir kursa başlayacak.', pl: 'Ona zamierza zacząć nowy kurs.', why: tri('Это намерение, которое уже есть.', 'Це намір, який уже є.', 'Es una intencion que ya existe.') },
    { en: 'Look at the clouds. It is going to rain.', ru: 'Посмотри на облака. Сейчас будет дождь.', uk: 'Подивися на хмари. Зараз буде дощ.', es: 'Mira las nubes. Va a llover.', 'pt-BR': 'Olhe as nuvens. Vai chover.', vi: 'Nhìn những đám mây kìa. Trời sắp mưa.', id: 'Lihat awan itu. Sebentar lagi akan hujan.', tr: 'Bulutlara bak. Yağmur yağacak.', pl: 'Spójrz na chmury. Będzie padać.', why: tri('Есть видимые признаки: облака.', 'Є видимі ознаки: хмари.', 'Hay evidencia visible: las nubes.') },
    { en: 'I will call you later.', ru: 'Я позвоню тебе позже.', uk: 'Я подзвоню тобі пізніше.', es: 'Te llamare mas tarde.', 'pt-BR': 'Eu vou te ligar mais tarde.', vi: 'Tôi sẽ gọi cho bạn sau.', id: 'Saya akan meneleponmu nanti.', tr: 'Seni daha sonra arayacağım.', pl: 'Zadzwonię do ciebie później.', why: tri('Это может звучать как обещание.', 'Це може звучати як обіцянка.', 'Puede sonar como promesa.') },
    { en: 'They are going to move next month.', ru: 'Они собираются переехать в следующем месяце.', uk: 'Вони збираються переїхати наступного місяця.', es: 'Ellos van a mudarse el mes que viene.', 'pt-BR': 'Eles vão se mudar no mês que vem.', vi: 'Họ sẽ chuyển nhà vào tháng tới.', id: 'Mereka akan pindah bulan depan.', tr: 'Gelecek ay taşınacaklar.', pl: 'Oni zamierzają się przeprowadzić w przyszłym miesiącu.', why: tri('Это похоже на заранее готовый план.', 'Це схоже на заздалегідь готовий план.', 'Suena como un plan ya preparado.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты переводишь will и going to одинаково. Но в реальной фразе важно не слово "буду", а причина: решил сейчас, обещал, предположил, запланировал или увидел признаки.',
        'Схоже, ти перекладаєш will і going to однаково. Але в реальній фразі важливе не слово "буду", а причина: вирішив зараз, пообіцяв, припустив, запланував чи побачив ознаки.',
        'Traduces will y going to igual, pero el sentido decide la forma.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Will держит решения, обещания и прогнозы. Going to держит планы, намерения и видимые признаки.',
        'Will тримає рішення, обіцянки й прогнози. Going to тримає плани, наміри й видимі ознаки.',
        'Will: decisiones, promesas, predicciones. Going to: planes, intenciones, evidencia.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Две частые поломки: I will to call и I going to study. Нормально: I will call и I am going to study.',
        'Дві часті поломки: I will to call і I going to study. Нормально: I will call і I am going to study.',
        'Dos errores comunes: I will to call y I going to study. Usa I will call y I am going to study.',
      ),
    },
  ],
  steps: [
    futureStep({
      id: 'future_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'will_promise',
      sentence: "Don't worry. I ___ help you.",
      translation: tri('Не переживай. Я помогу тебе.', 'Не хвилюйся. Я допоможу тобі.', "Don't worry. I will help you."),
      options: ['will', 'am going', 'going to', 'will to'],
      correctAnswer: 'will',
      correctFeedback: tri('Да. Это обещание помочь: I will help you.', 'Так. Це обіцянка допомогти: I will help you.', 'Yes. This is a promise: I will help you.'),
      wrong: {
        'am going': tri('Am going без to звучит незаконченно. Можно I am going to help, но для обещания здесь естественнее I will help.', 'Am going без to звучить незавершено. Можна I am going to help, але для обіцянки тут природніше I will help.', 'Am going is incomplete here.'),
        'going to': tri('Нельзя I going to help. Нужен кусок I am going to help, но для обещания здесь лучше will.', 'Не можна I going to help. Потрібен зворот I am going to help, але для обіцянки тут краще will.', 'I going to help is incomplete.'),
        'will to': tri('После will не ставим to. Нужно will help, не will to help.', 'Після will не ставимо to. Потрібно will help, не will to help.', 'Use will help, not will to help.'),
      },
      clue: tri('Обещание помочь = will.', 'Обіцянка допомогти = will.', 'Promise = will.'),
      focusWords: ['will', 'help', 'promise'],
    }),
    futureStep({
      id: 'future_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'will_instant_decision',
      sentence: 'The phone is ringing. I ___ answer it.',
      translation: tri('Телефон звонит. Я отвечу.', 'Телефон дзвонить. Я відповім.', 'The phone is ringing. I will answer it.'),
      options: ['will', 'am going to', 'going', 'will to'],
      correctAnswer: 'will',
      correctFeedback: tri('Да. Телефон зазвонил, и решение появилось сейчас: I will answer it.', 'Так. Телефон задзвонив, і рішення зʼявилося зараз: I will answer it.', 'Yes. The decision happens now.'),
      wrong: {
        'am going to': tri('Am going to звучало бы как план заранее. Здесь решение появилось прямо сейчас, поэтому will.', 'Am going to звучало б як план заздалегідь. Тут рішення зʼявилося прямо зараз, тому will.', 'Going to sounds planned.'),
        going: tri('Going сам по себе не собирает будущее. Здесь нужно will answer.', 'Going сам по собі не збирає майбутнє. Тут потрібно will answer.', 'Going alone is incomplete.'),
        'will to': tri('Will to answer ломает форму. Нормально: will answer.', 'Will to answer ламає форму. Нормально: will answer.', 'Use will answer.'),
      },
      clue: tri('Решил прямо сейчас = will.', 'Вирішив прямо зараз = will.', 'Instant decision = will.'),
      focusWords: ['will', 'answer', 'instant decision'],
    }),
    futureStep({
      id: 'future_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'will_opinion_prediction',
      sentence: 'I think it ___ be fine.',
      translation: tri('Думаю, всё будет нормально.', 'Думаю, усе буде нормально.', 'I think it will be fine.'),
      options: ['will', 'is going', 'going to', 'will to'],
      correctAnswer: 'will',
      correctFeedback: tri('Да. I think обычно вводит мнение или прогноз: it will be fine.', 'Так. I think зазвичай вводить думку або прогноз: it will be fine.', 'Yes. I think introduces a prediction.'),
      wrong: {
        'is going': tri('Is going без to be незаконченно. С I think здесь естественнее will be.', 'Is going без to be незавершено. З I think тут природніше will be.', 'Is going is incomplete here.'),
        'going to': tri('Going to без is здесь не работает. И с I think обычно естественнее will.', 'Going to без is тут не працює. І з I think зазвичай природніше will.', 'Going to needs is here.'),
        'will to': tri('Will to be неправильно. Нормально: will be.', 'Will to be неправильно. Нормально: will be.', 'Use will be.'),
      },
      clue: tri('I think + прогноз = will.', 'I think + прогноз = will.', 'I think + prediction = will.'),
      focusWords: ['will', 'I think', 'prediction'],
    }),
    futureStep({
      id: 'future_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'going_to_plan_i',
      sentence: 'I ___ study tonight.',
      translation: tri('Я собираюсь учиться сегодня вечером.', 'Я збираюся вчитися сьогодні ввечері.', 'I am going to study tonight.'),
      options: ['will', 'am going to', 'going to', 'am going'],
      correctAnswer: 'am going to',
      correctFeedback: tri('Да. Это уже звучит как план на вечер: I am going to study tonight.', 'Так. Це вже звучить як план на вечір: I am going to study tonight.', 'Yes. This sounds planned.'),
      wrong: {
        will: tri('Will возможно, если ты решаешь прямо сейчас. Но "собираюсь сегодня вечером" звучит как план, поэтому I am going to study.', 'Will можливе, якщо ти вирішуєш прямо зараз. Але "збираюся сьогодні ввечері" звучить як план, тому I am going to study.', 'Will would sound like a decision now.'),
        'going to': tri('Нельзя I going to study. Нужен полный кусок: I am going to study.', 'Не можна I going to study. Потрібен повний зворот: I am going to study.', 'Use I am going to study.'),
        'am going': tri('Am going без to study звучит незаконченно. Нужно I am going to study.', 'Am going без to study звучить незавершено. Потрібно I am going to study.', 'Use I am going to study.'),
      },
      clue: tri('Готовый план = am going to.', 'Готовий план = am going to.', 'Existing plan = am going to.'),
      focusWords: ['am going to', 'study', 'plan'],
    }),
    futureStep({
      id: 'future_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'going_to_plan_she',
      sentence: 'She ___ start a new course.',
      translation: tri('Она собирается начать новый курс.', 'Вона збирається почати новий курс.', 'She is going to start a new course.'),
      options: ['is going to', 'are going to', 'going to', 'will to'],
      correctAnswer: 'is going to',
      correctFeedback: tri('Да. С she нужен кусок is going to: she is going to start.', 'Так. З she потрібен зворот is going to: she is going to start.', 'Yes. Use she is going to start.'),
      wrong: {
        'are going to': tri('Для she нужна форма с is, а не are. Смысл плана правильный, сломан только кусок перед going to.', 'Для she потрiбна форма з is, а не are. Сенс плану правильний, зламаний лише зворот перед going to.', 'Use is going to with she.'),
        'going to': tri('Не хватает маленькой, но обязательной части перед going to. Без нее фраза звучит неполной.', 'Бракує маленької, але обовʼязкової частини перед going to. Без неї фраза звучить неповною.', 'Use she is going to start.'),
        'will to': tri('Will to start неправильно. Если will, то will start. Но по смыслу здесь план: is going to start.', 'Will to start неправильно. Якщо will, то will start. Але за сенсом тут план: is going to start.', 'Use is going to start here.'),
      },
      clue: tri('She + план = is going to.', 'She + план = is going to.', 'She + plan = is going to.'),
      focusWords: ['she', 'is going to', 'plan'],
    }),
    futureStep({
      id: 'future_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'going_to_plan_they',
      sentence: 'They ___ move next month.',
      translation: tri('Они собираются переехать в следующем месяце.', 'Вони збираються переїхати наступного місяця.', 'They are going to move next month.'),
      options: ['are going to', 'is going to', 'will to', 'going to'],
      correctAnswer: 'are going to',
      correctFeedback: tri('Да. Для they нужен вариант с are, потому что это план нескольких людей.', 'Так. Для they потрiбен варiант з are, бо це план кiлькох людей.', 'Yes. Use they are going to move.'),
      wrong: {
        'is going to': tri('Смысл плана верный, но форма не совпала с they. Для нескольких людей нужен вариант с are.', 'Сенс плану правильний, але форма не збiглася з they. Для кiлькох людей потрiбен варiант з are.', 'Use are going to with they.'),
        'will to': tri('Will to move неправильно. А по смыслу здесь заранее готовый план: are going to move.', 'Will to move неправильно. А за сенсом тут заздалегідь готовий план: are going to move.', 'Use are going to move.'),
        'going to': tri('Не хватает формы перед going to. Без нее фраза звучит как незаконченный черновик.', 'Бракує форми перед going to. Без неї фраза звучить як незавершений чернетковий варiант.', 'Use they are going to move.'),
      },
      clue: tri('They + план = are going to.', 'They + план = are going to.', 'They + plan = are going to.'),
      focusWords: ['they', 'are going to', 'plan'],
    }),
    futureStep({
      id: 'future_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'will_no_to',
      sentence: 'I will ___ you later.',
      translation: tri('Я позвоню тебе позже.', 'Я подзвоню тобі пізніше.', 'I will call you later.'),
      options: ['call', 'to call', 'calling', 'called'],
      correctAnswer: 'call',
      correctFeedback: tri('Да. После will действие остается обычным: will call.', 'Так. Після will дія лишається звичайною: will call.', 'Yes. Use will call.'),
      wrong: {
        'to call': tri('После will не ставим to. Нужно will call.', 'Після will не ставимо to. Потрібно will call.', 'Use will call.'),
        calling: tri('Will calling неправильно. Нормально: will call.', 'Will calling неправильно. Нормально: will call.', 'Use will call.'),
        called: tri('Will called неправильно. Нормально: will call.', 'Will called неправильно. Нормально: will call.', 'Use will call.'),
      },
      clue: tri('После will не нужен to и не нужен -ing.', 'Після will не потрібен to і не потрібен -ing.', 'After will, do not use to or -ing.'),
      focusWords: ['will', 'call'],
    }),
    futureStep({
      id: 'future_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'going_to_visible_future',
      sentence: 'Look at that car. It ___ crash.',
      translation: tri('Посмотри на ту машину. Она сейчас врежется.', 'Подивися на ту машину. Вона зараз вріжеться.', 'Look at that car. It is going to crash.'),
      options: ['is going to', 'will', 'going to', 'will to'],
      correctAnswer: 'is going to',
      correctFeedback: tri('Да. Ты видишь признаки прямо сейчас: it is going to crash.', 'Так. Ти бачиш ознаки прямо зараз: it is going to crash.', 'Yes. You can see evidence now.'),
      wrong: {
        will: tri('Will может быть прогнозом, но здесь ты видишь признаки прямо сейчас. Естественнее is going to crash.', 'Will може бути прогнозом, але тут ти бачиш ознаки прямо зараз. Природніше is going to crash.', 'Visible evidence points to going to.'),
        'going to': tri('Не хватает формы перед going to. Для it нужна связка с is.', 'Бракує форми перед going to. Для it потрiбна звʼязка з is.', 'Use it is going to crash.'),
        'will to': tri('Will to crash неправильно. По признакам здесь лучше is going to crash.', 'Will to crash неправильно. За ознаками тут краще is going to crash.', 'Use is going to crash here.'),
      },
      clue: tri('Видишь признаки сейчас = going to.', 'Бачиш ознаки зараз = going to.', 'Visible evidence = going to.'),
      focusWords: ['look', 'is going to', 'evidence'],
    }),
    futureStep({
      id: 'future_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'missing_be_going_to',
      sentence: 'Choose the correct sentence.',
      translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'),
      options: ['I am going to study tonight.', 'I going to study tonight.', 'I am going study tonight.', 'I will to study tonight.'],
      correctAnswer: 'I am going to study tonight.',
      correctFeedback: tri('Да. Полный кусок: I am going to study tonight.', 'Так. Повний зворот: I am going to study tonight.', 'Yes. Full chunk: I am going to study tonight.'),
      wrong: {
        'I going to study tonight.': tri('Не хватает am: I am going to study tonight.', 'Бракує am: I am going to study tonight.', 'Missing am.'),
        'I am going study tonight.': tri('Не хватает to: I am going to study tonight.', 'Бракує to: I am going to study tonight.', 'Missing to.'),
        'I will to study tonight.': tri('После will не ставим to. Но по смыслу здесь план, поэтому I am going to study tonight.', 'Після will не ставимо to. Але за сенсом тут план, тому I am going to study tonight.', 'Use I am going to study tonight.'),
      },
      clue: tri('Для плана нужен полный кусок I am going to study.', 'Для плану потрібен повний зворот I am going to study.', 'For a plan, use I am going to study.'),
      focusWords: ['I am going to study'],
    }),
    futureStep({
      id: 'future_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'evidence_going_to',
      sentence: 'Look at the clouds. It ___ rain.',
      translation: tri('Посмотри на облака. Сейчас будет дождь.', 'Подивися на хмари. Зараз буде дощ.', 'Look at the clouds. It is going to rain.'),
      options: ['will', 'is going to', 'going to', 'will to'],
      correctAnswer: 'is going to',
      correctFeedback: tri('Да. Облака - видимые признаки. Поэтому: It is going to rain.', 'Так. Хмари - видимі ознаки. Тому: It is going to rain.', 'Yes. Clouds are visible evidence.'),
      wrong: {
        will: tri('Will может звучать как общий прогноз, но здесь есть видимые признаки - облака. Естественнее is going to rain.', 'Will може звучати як загальний прогноз, але тут є видимі ознаки - хмари. Природніше is going to rain.', 'Visible evidence points to going to.'),
        'going to': tri('It going to rain неполно. Нужно It is going to rain.', 'It going to rain неповно. Потрібно It is going to rain.', 'Use It is going to rain.'),
        'will to': tri('Will to rain неправильно. По признакам здесь лучше It is going to rain.', 'Will to rain неправильно. За ознаками тут краще It is going to rain.', 'Use It is going to rain.'),
      },
      clue: tri('Облака - это признаки, а не просто мнение.', 'Хмари - це ознаки, а не просто думка.', 'Clouds are evidence, not just opinion.'),
      focusWords: ['clouds', 'is going to', 'evidence'],
    }),
    futureStep({
      id: 'future_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'opinion_prediction_will',
      sentence: 'I think they ___ win.',
      translation: tri('Думаю, они победят.', 'Думаю, вони переможуть.', 'I think they will win.'),
      options: ['will', 'are going to', 'going to', 'will to'],
      correctAnswer: 'will',
      correctFeedback: tri('Да. I think дает мнение или прогноз: they will win.', 'Так. I think дає думку або прогноз: they will win.', 'Yes. I think introduces a prediction.'),
      wrong: {
        'are going to': tri('Are going to возможно, если есть явные признаки или план. Но I think здесь естественно ведет к will.', 'Are going to можливе, якщо є явні ознаки або план. Але I think тут природно веде до will.', 'I think points to will here.'),
        'going to': tri('They going to win неполно. И по смыслу здесь лучше will.', 'They going to win неповно. І за сенсом тут краще will.', 'Use will here.'),
        'will to': tri('Will to win неправильно. Нормально: will win.', 'Will to win неправильно. Нормально: will win.', 'Use will win.'),
      },
      clue: tri('I think + мнение = will.', 'I think + думка = will.', 'I think + opinion = will.'),
      focusWords: ['I think', 'will', 'win'],
    }),
    futureStep({
      id: 'future_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'instant_decision_vs_plan',
      sentence: 'I forgot to call him. I ___ call him now.',
      translation: tri('Я забыл ему позвонить. Я позвоню ему сейчас.', 'Я забув йому подзвонити. Я подзвоню йому зараз.', 'I forgot to call him. I will call him now.'),
      options: ['will', 'am going to', 'going to', 'will to'],
      correctAnswer: 'will',
      correctFeedback: tri('Да. Человек вспомнил и решил сейчас: I will call him now.', 'Так. Людина згадала й вирішила зараз: I will call him now.', 'Yes. The decision happens now.'),
      wrong: {
        'am going to': tri('Am going to звучало бы как план заранее. Здесь решение появилось после "забыл", поэтому will.', 'Am going to звучало б як план заздалегідь. Тут рішення зʼявилося після "забув", тому will.', 'This is a decision now.'),
        'going to': tri('I going to call неполно. И по смыслу здесь лучше will call.', 'I going to call неповно. І за сенсом тут краще will call.', 'Use will call.'),
        'will to': tri('Will to call неправильно. Нормально: will call.', 'Will to call неправильно. Нормально: will call.', 'Use will call.'),
      },
      clue: tri('Вспомнил и решил сейчас = will.', 'Згадав і вирішив зараз = will.', 'Remembered and decided now = will.'),
      focusWords: ['forgot', 'will', 'now'],
    }),
    futureStep({
      id: 'future_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_will_going_to_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'),
      options: [
        'I will help you / I am going to study tonight',
        'I will to help you / I going to study tonight',
        'I am will help you / I am going study tonight',
        'I will helping you / I am going to studying tonight',
      ],
      correctAnswer: 'I will help you / I am going to study tonight',
      correctFeedback: tri('Да. Первая часть звучит как обещание, вторая как уже готовый план.', 'Так. Перша частина звучить як обiцянка, друга як уже готовий план.', 'Yes. Promise plus plan.'),
      wrong: {
        'I will to help you / I going to study tonight': tri('После will не ставим to, а в going to нельзя пропускать am. Нужно: I will help / I am going to study.', 'Після will не ставимо to, а в going to не можна пропускати am. Потрібно: I will help / I am going to study.', 'Use I will help / I am going to study.'),
        'I am will help you / I am going study tonight': tri('Am will не работает. Во второй части не хватает to: I am going to study.', 'Am will не працює. У другій частині бракує to: I am going to study.', 'Use I will help / I am going to study.'),
        'I will helping you / I am going to studying tonight': tri('После will и после going to действие не ставим в форму с -ing. Нужна обычная форма действия.', 'Пiсля will i пiсля going to дiю не ставимо у форму з -ing. Потрiбна звичайна форма дiї.', 'Use help and study.'),
      },
      clue: tri('Обещание + план: will help / am going to study.', 'Обіцянка + план: will help / am going to study.', 'Promise + plan.'),
      focusWords: ['will help', 'am going to study'],
    }),
    futureStep({
      id: 'future_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_evidence_opinion',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'),
      options: [
        'I think it will rain / Look at the clouds. It is going to rain',
        'I think it is going to rain / Look at the clouds. It will to rain',
        'I think it will to rain / Look at the clouds. It going to rain',
        'I think it going to rain / Look at the clouds. It is will rain',
      ],
      correctAnswer: 'I think it will rain / Look at the clouds. It is going to rain',
      correctFeedback: tri('Да. I think дает прогноз с will. Облака дают признаки с going to.', 'Так. I think дає прогноз із will. Хмари дають ознаки з going to.', 'Yes. Opinion with will, evidence with going to.'),
      wrong: {
        'I think it is going to rain / Look at the clouds. It will to rain': tri('Первая часть возможна в другой ситуации, но will to rain неправильно. Нужна пара: will rain / is going to rain.', 'Перша частина можлива в іншій ситуації, але will to rain неправильно. Потрібна пара: will rain / is going to rain.', 'Use will rain / is going to rain.'),
        'I think it will to rain / Look at the clouds. It going to rain': tri('Will to rain неправильно. It going to rain тоже неполно без is.', 'Will to rain неправильно. It going to rain теж неповно без is.', 'Both forms are broken.'),
        'I think it going to rain / Look at the clouds. It is will rain': tri('It going to rain пропускает is. It is will rain тоже не работает.', 'It going to rain пропускає is. It is will rain теж не працює.', 'Both forms are broken.'),
      },
      clue: tri('I think = прогноз. Облака = признаки.', 'I think = прогноз. Хмари = ознаки.', 'I think = prediction. Clouds = evidence.'),
      focusWords: ['I think', 'clouds', 'will', 'going to'],
    }),
    futureStep({
      id: 'future_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'),
      options: [
        'I will call you later, but I am going to study tonight.',
        'I will to call you later, but I going to study tonight.',
        'I am will call you later, but I am going study tonight.',
        'I will calling you later, but I am going to studying tonight.',
      ],
      correctAnswer: 'I will call you later, but I am going to study tonight.',
      correctFeedback: tri('Да. I will call звучит как обещание. I am going to study звучит как план.', 'Так. I will call звучить як обіцянка. I am going to study звучить як план.', 'Yes. Promise plus plan.'),
      wrong: {
        'I will to call you later, but I going to study tonight.': tri('Will to call неправильно. Во второй части не хватает am: I am going to study.', 'Will to call неправильно. У другій частині бракує am: I am going to study.', 'Use I will call / I am going to study.'),
        'I am will call you later, but I am going study tonight.': tri('Am will call неправильно. Во второй части не хватает to: I am going to study.', 'Am will call неправильно. У другій частині бракує to: I am going to study.', 'Use I will call / I am going to study.'),
        'I will calling you later, but I am going to studying tonight.': tri('После will и going to действие остается в обычной форме: call / study. Не добавляй -ing.', 'Пiсля will i going to дiя лишається у звичайнiй формi: call / study. Не додавай -ing.', 'Use call and study.'),
      },
      clue: tri('Собери два куска: will call + am going to study.', 'Збери два звороти: will call + am going to study.', 'Build two chunks: will call + am going to study.'),
      focusWords: ['will call', 'am going to study'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'will_to_error',
      'missing_be_going_to_error',
      'going_to_ing_error',
      'instant_decision_vs_plan_confusion',
      'prediction_vs_evidence_confusion',
      'wrong_be_form_going_to',
      'will_plus_ing_error',
      'double_future_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем смысл будущего: решение сейчас, обещание, прогноз, план или признаки.', 'Показуємо сенс майбутнього: рішення зараз, обіцянка, прогноз, план чи ознаки.', 'Mostramos primero el sentido futuro.'),
    depth2: tri('Показываем готовый кусок: will call или am/is/are going to study.', 'Показуємо готовий зворот: will call або am/is/are going to study.', 'Mostramos el bloque correcto.'),
    depth3: tri('Проверяем частую поломку: нет will to, нет I going to.', 'Перевіряємо часту поломку: немає will to, немає I going to.', 'Revisamos formas rotas comunes.'),
    depth4: tri('Даем почти готовый ответ и возвращаем в упражнение.', 'Даємо майже готову відповідь і повертаємо у вправу.', 'Damos casi la respuesta y repetimos.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Решил сейчас / обещаю / думаю = will. Уже планирую / вижу признаки = going to. Форма: will call, I am going to study.',
        'Зупинись. Вирішив зараз / обіцяю / думаю = will. Уже планую / бачу ознаки = going to. Форма: will call, I am going to study.',
        'Decision/promesa/opinion = will. Plan/evidencia = going to.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_future_meaning_hint_then_retry',
      card: tri(
        'Подсказка по смыслу: система покажет, это решение сейчас, обещание, прогноз, план или видимые признаки, но форму ты выберешь сам.',
        'Підказка за сенсом: система покаже, це рішення зараз, обіцянка, прогноз, план чи видимі ознаки, але форму ти обереш сам.',
        'Pista de sentido primero, luego reintento.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери смысл, потом собери кусок will или am/is/are going to.',
        'Режим підказки: спочатку обери сенс, потім збери зворот will або am/is/are going to.',
        'Modo guiado: primero sentido, luego bloque.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_future_001', prompt: tri('После will нужен to?', 'Після will потрібен to?', 'Despues de will, hace falta to?'), options: ['да', 'нет'], correctIndex: 1, thenReturnToExerciseId: 'future_contrast_004' },
      { id: 'guided_future_002', prompt: tri('I going to study - здесь не хватает am?', 'I going to study - тут бракує am?', 'Falta am en I going to study?'), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'future_contrast_006' },
      { id: 'guided_future_003', prompt: tri('Если решение принято прямо сейчас, чаще will или going to?', 'Якщо рішення прийняте прямо зараз, частіше will чи going to?', 'Decision instantanea: will o going to?'), options: ['will', 'going to'], correctIndex: 0, thenReturnToExerciseId: 'future_easy_002' },
      { id: 'guided_future_004', prompt: tri('Если план уже есть заранее, чаще will или going to?', 'Якщо план уже є заздалегідь, частіше will чи going to?', 'Plan existente: will o going to?'), options: ['will', 'going to'], correctIndex: 1, thenReturnToExerciseId: 'future_contrast_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'future_will_going_to',
    diagnosisLabel: tri('Will / Going to', 'Will / Going to', 'Will / Going to'),
    contrastSet: CONTRAST,
    focusWords: ['will', 'going to', 'am going to', 'is going to', 'are going to', 'plan', 'promise'],
    focusPatterns: [
      'will_promise',
      'will_instant_decision',
      'will_opinion_prediction',
      'going_to_plan_i',
      'going_to_plan_she',
      'going_to_plan_they',
      'will_no_to',
      'missing_be_going_to',
      'evidence_going_to',
      'opinion_prediction_will',
      'instant_decision_vs_plan',
      'mixed_will_going_to_pair',
      'mixed_evidence_opinion',
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
    start: 'diagnosis_training_future_will_going_to_start',
    answer: 'diagnosis_training_future_will_going_to_answer',
    mastery: 'diagnosis_training_future_will_going_to_mastery',
    recovery: 'diagnosis_training_future_will_going_to_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'future_will_going_to',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logFutureMeaningType: true,
      logFutureForm: true,
      logBeForm: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=future_will_going_to',
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
