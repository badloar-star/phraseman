// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const IMPERATIVE_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre imperative ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về imperative này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan imperative ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu imperative açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie imperative nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? IMPERATIVE_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = ['base verb imperative', "don't + base verb", 'please', "let's", 'negative imperative', 'instructions', 'commands', 'requests'];
const SMART_CONTRAST = ['base verb imperative', "don't + base verb", 'please', "let's", 'negative imperative', 'instructions', 'commands'];

const option = (text: string) => ({ id: text, text });

const IMPERATIVE_SKILL_ES: Record<string, string> = {
  positive_command_open: 'Una orden empieza directamente con la accion: Open.',
  positive_command_wait: 'La orden corta es Wait here, sin you ni to.',
  positive_instruction_turn: 'Una instruccion empieza con la accion: Turn left.',
  negative_command_touch: 'Una prohibicion usa don’t + accion: Don’t touch.',
  negative_command_open: 'Despues de don’t va el verbo base, sin to.',
  negative_command_forget: 'Don’t forget es una instruccion negativa normal.',
  be_careful: 'Una orden positiva con be empieza con Be.',
  dont_be_late: 'Para prohibir con be, usa Don’t be.',
  dont_be_afraid: 'Despues de don’t, usa be, no to be.',
  please_wait: 'Please suaviza la peticion, pero la accion queda igual.',
  lets_go: 'Let’s propone hacerlo juntos.',
  lets_start: 'Despues de let’s va el verbo base, sin to.',
  mixed_positive_negative: 'Orden positiva = accion; prohibicion = don’t + accion.',
  mixed_be_negative_lets: 'Compara Be careful, Don’t be late y Let’s start.',
  mixed_sentence_correction: 'Combina Please wait con don’t open.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = IMPERATIVE_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? IMPERATIVE_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function imperativeEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = IMPERATIVE_SKILL_ES[input.targetSkill] ?? 'Primero decide si es orden, prohibicion, peticion o propuesta juntos.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

const DEFAULT_RETRY: [TriText, TriText, TriText, TriText] = [
  tri(
    'Сначала реши, что это: команда, запрет, вежливая просьба или предложение сделать что-то вместе.',
    'Спочатку виріши, що це: команда, заборона, ввічливе прохання або пропозиція зробити щось разом.',
    'Primero decide: orden, prohibicion, peticion educada o propuesta para hacer algo juntos.',
  ),
  tri(
    'Команда начинается сразу с действия: Open. Wait. Turn.',
    'Команда починається одразу з дії: Open. Wait. Turn.',
    'Una orden empieza directamente con la accion: Open. Wait. Turn.',
  ),
  tri(
    'Запрет начинается с don’t, потом идет действие: Don’t touch. Don’t open. Don’t be late.',
    'Заборона починається з don’t, потім іде дія: Don’t touch. Don’t open. Don’t be late.',
    'Una prohibicion empieza con don’t y luego va la accion: Don’t touch. Don’t open. Don’t be late.',
  ),
  tri(
    'Почти подсказка: если просишь мягче, ставь please; если предлагаешь вместе, ставь let’s.',
    'Майже підказка: якщо просиш м’якше, став please; якщо пропонуєш разом, став let’s.',
    'Casi una pista: si pides con mas suavidad, usa please; si propones hacerlo juntos, usa let’s.',
  ),
];

function defaultWrong(correct: string): TriText {
  return tri(
    `Здесь нужна форма "${correct}". В командах английский обычно не ставит you или to перед действием.`,
    `Тут потрібна форма "${correct}". У командах англійська зазвичай не ставить you або to перед дією.`,
    `Usa "${correct}". Las ordenes normalmente no ponen you ni to antes de la accion.`,
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
  const esFeedback = imperativeEsFeedback({
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
      'Команда в английском часто начинается сразу с действия: Open the door. Wait here. Для запрета ставим don’t перед действием: Don’t touch it.',
      'Команда в англійській часто починається одразу з дії: Open the door. Wait here. Для заборони ставимо don’t перед дією: Don’t touch it.',
      esFeedback,
    ),
    microTask: tri(
      'Выбери форму, которая звучит как нормальная команда, просьба, инструкция или предложение.',
      'Обери форму, яка звучить як нормальна команда, прохання, інструкція або пропозиція.',
      'Elige la forma que funciona como orden, peticion, instruccion o propuesta.',
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
      'Проверка за секунду: команда = действие сразу. Запрет = don’t + действие. Please делает просьбу мягче. Let’s значит “давай сделаем вместе”.',
      'Перевірка за секунду: команда = дія одразу. Заборона = don’t + дія. Please робить прохання м’якшим. Let’s означає “давай зробимо разом”.',
      esFeedback,
    ),
    focusWords: input.focusWords,
  };
}

export const IMPERATIVE_BASIC_TRAINING: DiagnosisTraining = {
  id: 'imperative_basic',
  category: 'syntax',
  version: '1.0.0',
  status: 'active',
  priority: 49,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Команды и просьбы: Open / Don’t open', 'Команди й прохання: Open / Don’t open', 'Imperativo: ordenes, peticiones e instrucciones', {
    'pt-BR': 'Imperative: comandos e pedidos',
    vi: 'Imperative: mệnh lệnh và lời nhờ',
    id: 'Imperative: perintah dan permintaan',
    tr: 'Imperative: komutlar ve ricalar',
    pl: 'Imperative: polecenia i prośby',
  }),
  shortTitle: tri('Команды и просьбы', 'Команди й прохання', 'Imperativo', {
    'pt-BR': 'Comandos e pedidos',
    vi: 'Mệnh lệnh và lời nhờ',
    id: 'Perintah dan permintaan',
    tr: 'Komutlar ve ricalar',
    pl: 'Polecenia i prośby',
  }),
  shortDiagnosis: tri(
    'Ты добавляешь you, to или no там, где английскому нужна короткая команда.',
    'Ти додаєш you, to або no там, де англійській потрібна коротка команда.',
    'Agregas you, to o no donde el ingles necesita una orden corta.',
    {
      'pt-BR': 'Você adiciona you, to ou no onde o inglês precisa de um comando curto.',
      vi: 'Bạn thêm you, to hoặc no ở chỗ tiếng Anh cần một mệnh lệnh ngắn.',
      id: 'Kamu menambahkan you, to, atau no di tempat bahasa Inggris membutuhkan perintah pendek.',
      tr: 'İngilizcenin kısa komut istediği yerde you, to ya da no ekliyorsun.',
      pl: 'Dodajesz you, to albo no tam, gdzie angielski potrzebuje krótkiego polecenia.',
    },
  ),
  diagnosisText: tri(
    'Ты смешиваешь команды с обычными утверждениями. По-русски можно сказать “ты открой дверь”, а в английском базовая команда обычно короче: Open the door. Для запрета не говорим No touch it. Нормально: Don’t touch it.',
    'Ти змішуєш команди зі звичайними твердженнями. Українською можна сказати “ти відкрий двері”, а в англійській базова команда зазвичай коротша: Open the door. Для заборони не кажемо No touch it. Нормально: Don’t touch it.',
    'Mezclas ordenes con afirmaciones normales. En ingles la orden basica suele ser mas corta: Open the door. Para prohibir no digas No touch it. Normal: Don’t touch it.',
    {
      'pt-BR': 'Você mistura comandos com afirmações normais. Em português, dá para dizer "você abre a porta", mas em inglês o comando básico costuma ser mais curto: Open the door. Para proibir, não diga No touch it. O natural é: Don’t touch it.',
      vi: 'Bạn trộn mệnh lệnh với câu khẳng định bình thường. Trong tiếng Việt có thể nói kiểu "bạn mở cửa đi", nhưng trong tiếng Anh mệnh lệnh cơ bản thường ngắn hơn: Open the door. Khi cấm, đừng nói No touch it. Câu tự nhiên là: Don’t touch it.',
      id: 'Kamu mencampur perintah dengan pernyataan biasa. Dalam bahasa Indonesia kita bisa berkata "kamu buka pintunya", tetapi dalam bahasa Inggris perintah dasar biasanya lebih pendek: Open the door. Untuk larangan, jangan katakan No touch it. Bentuk yang alami: Don’t touch it.',
      tr: 'Komutları normal cümlelerle karıştırıyorsun. Türkçede "sen kapıyı aç" denebilir, ama İngilizcede temel komut genelde daha kısadır: Open the door. Yasak için No touch it denmez. Doğal biçim: Don’t touch it.',
      pl: 'Mieszasz polecenia ze zwykłymi zdaniami oznajmującymi. Po polsku można powiedzieć "ty otwórz drzwi", ale w angielskim podstawowe polecenie jest zwykle krótsze: Open the door. Przy zakazie nie mów No touch it. Naturalnie: Don’t touch it.',
    },
  ),
  mentalModel: tri(
    'Представь кнопку действия. Если хочешь, чтобы человек сделал действие, начинай с действия: Open, Wait, Turn. Если хочешь запретить, ставь don’t перед действием: Don’t open. Если просишь мягче, добавь please. Если предлагаешь вместе, используй let’s.',
    'Уяви кнопку дії. Якщо хочеш, щоб людина зробила дію, починай з дії: Open, Wait, Turn. Якщо хочеш заборонити, став don’t перед дією: Don’t open. Якщо просиш м’якше, додай please. Якщо пропонуєш разом, використовуй let’s.',
    'Imagina un boton de accion. Si quieres que la persona haga algo, empieza con la accion: Open, Wait, Turn. Si quieres prohibir, pon don’t antes de la accion: Don’t open. Si pides con suavidad, agrega please. Si propones hacerlo juntos, usa let’s.',
    {
      'pt-BR': 'Imagine um botão de ação. Se você quer que a pessoa faça algo, comece pela ação: Open, Wait, Turn. Se quer proibir, coloque don’t antes da ação: Don’t open. Se quer pedir com mais delicadeza, acrescente please. Se propõe fazer algo juntos, use let’s.',
      vi: 'Hãy tưởng tượng một nút hành động. Nếu bạn muốn người khác làm gì đó, hãy bắt đầu bằng hành động: Open, Wait, Turn. Nếu muốn cấm, đặt don’t trước hành động: Don’t open. Nếu muốn nhờ nhẹ nhàng hơn, thêm please. Nếu đề nghị cùng làm, dùng let’s.',
      id: 'Bayangkan sebuah tombol tindakan. Jika kamu ingin orang lain melakukan sesuatu, mulai dengan tindakannya: Open, Wait, Turn. Jika ingin melarang, letakkan don’t sebelum tindakan: Don’t open. Jika ingin meminta dengan lebih halus, tambahkan please. Jika mengajak melakukan sesuatu bersama, gunakan let’s.',
      tr: 'Bir eylem düğmesi düşün. Birinin bir şey yapmasını istiyorsan eylemle başla: Open, Wait, Turn. Yasaklamak istiyorsan eylemin önüne don’t koy: Don’t open. Daha yumuşak istemek için please ekle. Birlikte yapmayı önermek için let’s kullan.',
      pl: 'Wyobraź sobie przycisk czynności. Jeśli chcesz, żeby ktoś coś zrobił, zacznij od czynności: Open, Wait, Turn. Jeśli chcesz zakazać, postaw don’t przed czynnością: Don’t open. Jeśli prosisz łagodniej, dodaj please. Jeśli proponujesz zrobienie czegoś razem, użyj let’s.',
    },
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Команда: действие сразу - Open the window. Wait here. Be careful. Запрет: don’t + действие - Don’t open it. Вежливо: Please wait. Вместе: Let’s start.',
    'Команда: дія одразу - Open the window. Wait here. Be careful. Заборона: don’t + дія - Don’t open it. Ввічливо: Please wait. Разом: Let’s start.',
    'Orden: accion directa - Open the window. Wait here. Be careful. Prohibicion: don’t + accion - Don’t open it. Educado: Please wait. Juntos: Let’s start.',
    {
      'pt-BR': 'Comando: ação direta - Open the window. Wait here. Be careful. Proibição: don’t + ação - Don’t open it. Pedido educado: Please wait. Juntos: Let’s start.',
      vi: 'Mệnh lệnh: hành động trực tiếp - Open the window. Wait here. Be careful. Lệnh cấm: don’t + hành động - Don’t open it. Lịch sự: Please wait. Làm cùng nhau: Let’s start.',
      id: 'Perintah: langsung tindakan - Open the window. Wait here. Be careful. Larangan: don’t + tindakan - Don’t open it. Sopan: Please wait. Bersama-sama: Let’s start.',
      tr: 'Komut: doğrudan eylem - Open the window. Wait here. Be careful. Yasak: don’t + eylem - Don’t open it. Kibar rica: Please wait. Birlikte: Let’s start.',
      pl: 'Polecenie: od razu czynność - Open the window. Wait here. Be careful. Zakaz: don’t + czynność - Don’t open it. Uprzejmie: Please wait. Razem: Let’s start.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Обычная команда начинается с действия: Open the door.',
      'You обычно не нужно: Open the door, не You open the door.',
      'To перед командой не ставим: Wait here, не To wait here.',
      'Please не меняет грамматику: Please wait here.',
      'Запрет строится через don’t + действие: Don’t touch it.',
      'No touch it - ошибка. Нормально: Don’t touch it.',
      'После don’t не ставим to: Don’t open, не Don’t to open.',
      'С be тоже работает don’t: Don’t be late.',
      'Be careful - нормальная команда с be.',
      'Let’s + действие значит “давай вместе”: Let’s go.',
    ],
    uk: [
      'Звичайна команда починається з дії: Open the door.',
      'You зазвичай не потрібне: Open the door, не You open the door.',
      'To перед командою не ставимо: Wait here, не To wait here.',
      'Please не змінює граматику: Please wait here.',
      'Заборона будується через don’t + дія: Don’t touch it.',
      'No touch it - помилка. Нормально: Don’t touch it.',
      'Після don’t не ставимо to: Don’t open, не Don’t to open.',
      'З be теж працює don’t: Don’t be late.',
      'Be careful - нормальна команда з be.',
      'Let’s + дія означає “давай разом”: Let’s go.',
    ],
    es: [
      'Una orden normal empieza con la accion: Open the door.',
      'You normalmente no hace falta: Open the door, no You open the door.',
      'No pongas to antes de una orden: Wait here, no To wait here.',
      'Please no cambia la gramatica: Please wait here.',
      'La prohibicion se forma con don’t + accion: Don’t touch it.',
      'No touch it es un error. Normal: Don’t touch it.',
      'Despues de don’t no pongas to: Don’t open, no Don’t to open.',
      'Con be tambien funciona don’t: Don’t be late.',
      'Be careful es una orden normal con be.',
      'Let’s + accion significa "hagamos esto juntos": Let’s go.',
    ],
    'pt-BR': [
      'Commands começam com a ação: Open the door.',
      'You normalmente não é necessário: Open the door, não You open the door.',
      'Não coloque to antes de uma command: Wait here, não To wait here.',
      'Please não muda a gramática: Please wait here.',
      "Negative commands usam don't + ação: Don't touch it.",
      "No touch it é erro. O natural é: Don't touch it.",
      "Depois de don't, não use to: Don't open, não Don't to open.",
      "Com be, don't também funciona: Don't be late.",
      'Be careful é uma command normal com be.',
      "Let's + ação significa fazer algo juntos: Let's go.",
    ],
    vi: [
      'Commands bắt đầu bằng hành động: Open the door.',
      'You thường không cần thiết: Open the door, không phải You open the door.',
      'Không đặt to trước command: Wait here, không phải To wait here.',
      'Please không đổi ngữ pháp: Please wait here.',
      "Negative commands dùng don't + hành động: Don't touch it.",
      "No touch it là lỗi. Câu tự nhiên là: Don't touch it.",
      "Sau don't, không dùng to: Don't open, không phải Don't to open.",
      "Với be, don't cũng dùng được: Don't be late.",
      'Be careful là một command bình thường với be.',
      "Let's + hành động nghĩa là làm cùng nhau: Let's go.",
    ],
    id: [
      'Commands dimulai dengan tindakan: Open the door.',
      'You biasanya tidak diperlukan: Open the door, bukan You open the door.',
      'Jangan taruh to sebelum command: Wait here, bukan To wait here.',
      'Please tidak mengubah tata bahasa: Please wait here.',
      "Negative commands memakai don't + tindakan: Don't touch it.",
      "No touch it itu salah. Bentuk yang alami: Don't touch it.",
      "Setelah don't, jangan pakai to: Don't open, bukan Don't to open.",
      "Dengan be, don't juga dipakai: Don't be late.",
      'Be careful adalah command normal dengan be.',
      "Let's + tindakan berarti melakukan sesuatu bersama: Let's go.",
    ],
    tr: [
      'Commands eylemle başlar: Open the door.',
      'You genellikle gerekmez: Open the door, You open the door değil.',
      'Command öncesinde to kullanma: Wait here, To wait here değil.',
      'Please grameri değiştirmez: Please wait here.',
      "Negative commands don't + eylem ile kurulur: Don't touch it.",
      "No touch it hatalıdır. Doğal olan: Don't touch it.",
      "Don't sonrasında to kullanma: Don't open, Don't to open değil.",
      "Be ile de don't kullanılır: Don't be late.",
      'Be careful, be ile normal bir command örneğidir.',
      "Let's + eylem, bir şeyi birlikte yapalım demektir: Let's go.",
    ],
    pl: [
      'Commands zaczynają się od czynności: Open the door.',
      'You zwykle nie jest potrzebne: Open the door, nie You open the door.',
      'Nie stawiaj to przed command: Wait here, nie To wait here.',
      'Please nie zmienia gramatyki: Please wait here.',
      "Negative commands używają don't + czynność: Don't touch it.",
      "No touch it to błąd. Naturalnie: Don't touch it.",
      "Po don't nie używaj to: Don't open, nie Don't to open.",
      "Z be także działa don't: Don't be late.",
      'Be careful to normalna command z be.',
      "Let's + czynność znaczy, że robimy coś razem: Let's go.",
    ],
  },
  examples: [
    { en: 'Open the door.', ru: 'Открой дверь.', uk: 'Відчини двері.', es: 'Abre la puerta.', 'pt-BR': 'Abra a porta.', vi: 'Mở cửa ra.', id: 'Buka pintunya.', tr: 'Kapıyı aç.', pl: 'Otwórz drzwi.', why: tri('Команда начинается с open. You не нужен.', 'Команда починається з open. You не потрібне.', 'La orden empieza con open. You no hace falta.') },
    { en: 'Please wait here.', ru: 'Пожалуйста, подожди здесь.', uk: 'Будь ласка, зачекай тут.', es: 'Por favor, espera aqui.', 'pt-BR': 'Por favor, espere aqui.', vi: 'Vui lòng đợi ở đây.', id: 'Tolong tunggu di sini.', tr: 'Lütfen burada bekle.', pl: 'Proszę, zaczekaj tutaj.', why: tri('Please делает просьбу мягче, но wait остается обычным действием.', 'Please робить прохання м’якшим, але wait лишається звичайною дією.', 'Please suaviza la peticion, pero wait queda como accion normal.') },
    { en: "Don't touch it.", ru: 'Не трогай это.', uk: 'Не чіпай це.', es: 'No lo toques.', 'pt-BR': 'Não toque nisso.', vi: 'Đừng chạm vào nó.', id: 'Jangan sentuh itu.', tr: 'Ona dokunma.', pl: 'Nie dotykaj tego.', why: tri('Запрет строится через don’t + действие.', 'Заборона будується через don’t + дія.', 'Prohibicion = don’t + accion.') },
    { en: "Don't be late.", ru: 'Не опаздывай.', uk: 'Не запізнюйся.', es: 'No llegues tarde.', 'pt-BR': 'Não se atrase.', vi: 'Đừng đến muộn.', id: 'Jangan terlambat.', tr: 'Geç kalma.', pl: 'Nie spóźnij się.', why: tri('С be в запрете говорим don’t be.', 'З be у забороні кажемо don’t be.', 'Con be en una prohibicion, usa don’t be.') },
    { en: 'Be careful.', ru: 'Будь осторожен.', uk: 'Будь обережний.', es: 'Ten cuidado.', 'pt-BR': 'Tenha cuidado.', vi: 'Hãy cẩn thận.', id: 'Hati-hati.', tr: 'Dikkatli ol.', pl: 'Bądź ostrożny.', why: tri('Положительная команда с be начинается с Be.', 'Позитивна команда з be починається з Be.', 'La orden positiva con be empieza con Be.') },
    { en: "Let's start.", ru: 'Давай начнем.', uk: 'Давай почнемо.', es: 'Empecemos.', 'pt-BR': 'Vamos começar.', vi: 'Chúng ta bắt đầu nào.', id: 'Ayo mulai.', tr: 'Hadi başlayalım.', pl: 'Zacznijmy.', why: tri('Let’s значит, что мы делаем это вместе.', 'Let’s означає, що ми робимо це разом.', 'Let’s sugiere hacer algo juntos.') },
    { en: "Don't forget your keys.", ru: 'Не забудь ключи.', uk: 'Не забудь ключі.', es: 'No olvides tus llaves.', 'pt-BR': 'Não esqueça suas chaves.', vi: 'Đừng quên chìa khóa của bạn.', id: 'Jangan lupa kuncimu.', tr: 'Anahtarlarını unutma.', pl: 'Nie zapomnij kluczy.', why: tri('Don’t forget - нормальная короткая инструкция.', 'Don’t forget - нормальна коротка інструкція.', 'Don’t + forget es una instruccion negativa.') },
    { en: 'Turn left and go straight.', ru: 'Поверни налево и иди прямо.', uk: 'Поверни ліворуч і йди прямо.', es: 'Gira a la izquierda y sigue recto.', 'pt-BR': 'Vire à esquerda e siga em frente.', vi: 'Rẽ trái rồi đi thẳng.', id: 'Belok kiri dan jalan lurus.', tr: 'Sola dön ve düz git.', pl: 'Skręć w lewo i idź prosto.', why: tri('В инструкции может быть несколько действий подряд: turn и go.', 'В інструкції може бути кілька дій поспіль: turn і go.', 'Una instruccion puede tener varias acciones: turn y go.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Ты можешь строить команды как обычные предложения: You open the door. В английском это часто звучит не как команда, а как странное утверждение. Нормально короче: Open the door.',
        'Ти можеш будувати команди як звичайні речення: You open the door. В англійській це часто звучить не як команда, а як дивне твердження. Нормально коротше: Open the door.',
        'Puede que construyas ordenes como frases normales: You open the door. En ingles eso a menudo no suena como orden, sino como una afirmacion rara. Lo normal es mas corto: Open the door.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Положительная команда начинается с действия. Запрет начинается с don’t. Please смягчает просьбу. Let’s предлагает сделать вместе.',
        'Позитивна команда починається з дії. Заборона починається з don’t. Please пом’якшує прохання. Let’s пропонує зробити разом.',
        'La orden positiva empieza con la accion. La prohibicion empieza con don’t. Please suaviza la peticion. Let’s propone hacerlo juntos.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Главные ловушки: лишнее you, лишнее to, no вместо don’t и don’t to. Нормально: Open the door. Wait here. Don’t touch it. Don’t go.',
        'Головні пастки: зайве you, зайве to, no замість don’t і don’t to. Нормально: Open the door. Wait here. Don’t touch it. Don’t go.',
        'Trampas principales: you extra, to extra, no en vez de don’t y don’t to. Normal: Open the door. Wait here. Don’t touch it. Don’t go.',
      ),
    },
  ],
  steps: [
    step({ id: 'imperative_easy_001', order: 1, difficulty: 'easy', targetSkill: 'positive_command_open', sentence: '___ the door.', translation: tri('Открой дверь.', 'Відчини двері.', 'Open the door.'), options: ['Open', 'You open', 'To open', 'Opening'], correctAnswer: 'Open', correctFeedback: tri('Да. Команда начинается сразу с действия: Open the door.', 'Так. Команда починається одразу з дії: Open the door.', 'Yes. A command starts with the action.'), wrong: { 'You open': tri('В базовой команде you не нужен. Скажи: Open the door.', 'У базовій команді you не потрібне. Скажи: Open the door.', 'You is not needed in the basic command.'), 'To open': tri('Команда не начинается с to. Нужно Open.', 'Команда не починається з to. Потрібно Open.', 'A command does not start with to.'), Opening: tri('Opening здесь не работает как команда. Нужно Open.', 'Opening тут не працює як команда. Потрібно Open.', 'Opening does not work as this command.') }, focusWords: ['open'] }),
    step({ id: 'imperative_easy_002', order: 2, difficulty: 'easy', targetSkill: 'positive_command_wait', sentence: '___ here.', translation: tri('Подожди здесь.', 'Зачекай тут.', 'Wait here.'), options: ['Wait', 'You wait', 'To wait', 'Waiting'], correctAnswer: 'Wait', correctFeedback: tri('Да. Короткая команда: Wait here.', 'Так. Коротка команда: Wait here.', 'Yes. The command is Wait here.'), wrong: { 'You wait': tri('You возможно для сильного акцента, но базовая команда: Wait here.', 'You можливе для сильного акценту, але базова команда: Wait here.', 'Basic command: Wait here.'), 'To wait': tri('To wait не работает как команда. Нужно Wait.', 'To wait не працює як команда. Потрібно Wait.', 'Use Wait.'), Waiting: tri('Waiting не дает команду. Нужно Wait.', 'Waiting не дає команду. Потрібно Wait.', 'Use Wait.') }, focusWords: ['wait'] }),
    step({ id: 'imperative_easy_003', order: 3, difficulty: 'easy', targetSkill: 'positive_instruction_turn', sentence: '___ left.', translation: tri('Поверни налево.', 'Поверни ліворуч.', 'Turn left.'), options: ['Turn', 'You turn', 'To turn', 'Turning'], correctAnswer: 'Turn', correctFeedback: tri('Да. Инструкция начинается с действия: Turn left.', 'Так. Інструкція починається з дії: Turn left.', 'Yes. The instruction starts with the action.'), wrong: { 'You turn': tri('В инструкции you обычно не нужен. Нужно Turn left.', 'В інструкції you зазвичай не потрібне. Потрібно Turn left.', 'You is usually not needed.'), 'To turn': tri('To turn не звучит как прямая инструкция. Нужно Turn.', 'To turn не звучить як пряма інструкція. Потрібно Turn.', 'Use Turn.'), Turning: tri('Turning здесь не команда. Нужно Turn.', 'Turning тут не команда. Потрібно Turn.', 'Use Turn.') }, focusWords: ['turn'] }),
    step({ id: 'imperative_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'negative_command_touch', sentence: '___ touch it.', translation: tri('Не трогай это.', 'Не чіпай це.', "Don't touch it."), options: ["Don't", 'No', 'Not', "Doesn't"], correctAnswer: "Don't", correctFeedback: tri('Да. Запрет: don’t + действие.', 'Так. Заборона: don’t + дія.', "Yes. Negative command = don't + action."), wrong: { No: tri("No touch it - ошибка. Нормально: Don't touch it.", "No touch it - помилка. Нормально: Don't touch it.", "Use Don't touch it."), Not: tri("Not touch it не работает как команда. Нужно Don't touch it.", "Not touch it не працює як команда. Потрібно Don't touch it.", "Use Don't."), "Doesn't": tri("Doesn't здесь не подходит: это не утверждение про he/she/it. Нужен Don't.", "Doesn't тут не підходить: це не твердження про he/she/it. Потрібне Don't.", "Use Don't.") }, focusWords: ["don't touch"] }),
    step({ id: 'imperative_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'negative_command_open', sentence: "Don't ___ the window.", translation: tri('Не открывай окно.', 'Не відчиняй вікно.', "Don't open the window."), options: ['open', 'to open', 'opening', 'opens'], correctAnswer: 'open', correctFeedback: tri('Да. После don’t идет действие без to: Don’t open.', 'Так. Після don’t іде дія без to: Don’t open.', "Yes. After don't, use the action."), wrong: { 'to open': tri('После don’t не ставим to. Нужно Don’t open.', 'Після don’t не ставимо to. Потрібно Don’t open.', "Do not use to after don't."), opening: tri('Don’t opening - ошибка. Нужно open.', 'Don’t opening - помилка. Потрібно open.', 'Use open.'), opens: tri('После don’t не добавляем -s. Нужно open.', 'Після don’t не додаємо -s. Потрібно open.', 'Use open.') }, focusWords: ["don't open"] }),
    step({ id: 'imperative_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'negative_command_forget', sentence: '___ forget your keys.', translation: tri('Не забудь ключи.', 'Не забудь ключі.', "Don't forget your keys."), options: ["Don't", 'No', 'Not', "Aren't"], correctAnswer: "Don't", correctFeedback: tri('Да. Don’t forget - нормальная инструкция.', 'Так. Don’t forget - нормальна інструкція.', "Yes. Don't forget is a normal instruction."), wrong: { No: tri('No forget - ошибка. Нужно Don’t forget.', 'No forget - помилка. Потрібно Don’t forget.', "Use Don't forget."), Not: tri('Not forget не работает как команда. Нужно Don’t.', 'Not forget не працює як команда. Потрібно Don’t.', "Use Don't."), "Aren't": tri('Aren’t forget не работает. Нужно Don’t forget.', 'Aren’t forget не працює. Потрібно Don’t forget.', "Use Don't forget.") }, focusWords: ["don't forget"] }),
    step({ id: 'imperative_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'be_careful', sentence: '___ careful.', translation: tri('Будь осторожен.', 'Будь обережний.', 'Be careful.'), options: ['Be', 'You are', 'To be', 'Being'], correctAnswer: 'Be', correctFeedback: tri('Да. Команда с be начинается с Be: Be careful.', 'Так. Команда з be починається з Be: Be careful.', 'Yes. A command with be starts with Be.'), wrong: { 'You are': tri('You are careful - это утверждение, не команда.', 'You are careful - це твердження, не команда.', 'This is a statement, not a command.'), 'To be': tri('To be careful не звучит как прямая команда. Нужно Be careful.', 'To be careful не звучить як пряма команда. Потрібно Be careful.', 'Use Be careful.'), Being: tri('Being careful не дает команду. Нужно Be careful.', 'Being careful не дає команду. Потрібно Be careful.', 'Use Be careful.') }, focusWords: ['be careful'] }),
    step({ id: 'imperative_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'dont_be_late', sentence: '___ be late.', translation: tri('Не опаздывай.', 'Не запізнюйся.', "Don't be late."), options: ["Don't", 'No', 'Not', "Doesn't"], correctAnswer: "Don't", correctFeedback: tri('Да. С be в запрете говорим Don’t be.', 'Так. З be у забороні кажемо Don’t be.', "Yes. With be, use Don't be."), wrong: { No: tri('No be late - ошибка. Нужно Don’t be late.', 'No be late - помилка. Потрібно Don’t be late.', "Use Don't be late."), Not: tri('Not be late не звучит как команда. Нужно Don’t be late.', 'Not be late не звучить як команда. Потрібно Don’t be late.', "Use Don't be late."), "Doesn't": tri('Doesn’t be late здесь не работает. Нужно Don’t be late.', 'Doesn’t be late тут не працює. Потрібно Don’t be late.', "Use Don't be late.") }, focusWords: ["don't be"] }),
    step({ id: 'imperative_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'dont_be_afraid', sentence: "Don't ___ afraid.", translation: tri('Не бойся.', 'Не бійся.', "Don't be afraid."), options: ['be', 'to be', 'being', 'are'], correctAnswer: 'be', correctFeedback: tri("Да. После don't здесь нужно be: Don't be afraid.", "Так. Після don't тут потрібне be: Don't be afraid.", "Yes. After don't, use be."), wrong: { 'to be': tri("Don't to be - ошибка. Нужно Don't be.", "Don't to be - помилка. Потрібно Don't be.", "Do not use to after don't."), being: tri("Don't being - ошибка. Нужно be.", "Don't being - помилка. Потрібно be.", 'Use be.'), are: tri("Don't are не работает. После don't нужно be.", "Don't are не працює. Після don't потрібно be.", 'Use be.') }, focusWords: ["don't be"] }),
    step({ id: 'imperative_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'please_wait', sentence: '___ wait here.', translation: tri('Пожалуйста, подожди здесь.', 'Будь ласка, зачекай тут.', 'Please wait here.'), options: ['Please', 'To please', 'You please', "Don't please"], correctAnswer: 'Please', correctFeedback: tri('Да. Please делает просьбу мягче: Please wait here.', 'Так. Please робить прохання м’якшим: Please wait here.', 'Yes. Please makes the request polite.'), wrong: { 'To please': tri('To please wait не подходит. Нужно Please wait.', 'To please wait не підходить. Потрібно Please wait.', 'Use Please wait.'), 'You please': tri('You please wait - не базовая вежливая просьба. Нужно Please wait.', 'You please wait - не базове ввічливе прохання. Потрібно Please wait.', 'Use Please wait.'), "Don't please": tri('Don’t please wait меняет смысл и звучит неверно здесь. Нужно Please wait.', 'Don’t please wait змінює зміст і звучить неправильно тут. Потрібно Please wait.', 'Use Please wait.') }, focusWords: ['please wait'] }),
    step({ id: 'imperative_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'lets_go', sentence: '___ go.', translation: tri('Пойдем. / Давай пойдем.', 'Ходімо. / Давай підемо.', "Let's go."), options: ["Let's", 'Let', "Let's to", 'We'], correctAnswer: "Let's", correctFeedback: tri('Да. Let’s go значит “давай пойдем”.', 'Так. Let’s go означає “давай підемо”.', "Yes. Let's go means let us go."), wrong: { Let: tri('Для значения “давай” нужна форма Let’s.', 'Для значення “давай” потрібна форма Let’s.', "Use Let's."), "Let's to": tri('После let’s не ставим to. Нужно Let’s go.', 'Після let’s не ставимо to. Потрібно Let’s go.', "Do not use to after let's."), We: tri('We go - утверждение, не предложение сделать вместе.', 'We go - твердження, не пропозиція зробити разом.', "Use Let's go.") }, focusWords: ["let's go"] }),
    step({ id: 'imperative_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'lets_start', sentence: "Let's ___ now.", translation: tri('Давай начнем сейчас.', 'Давай почнемо зараз.', "Let's start now."), options: ['start', 'to start', 'starting', 'starts'], correctAnswer: 'start', correctFeedback: tri("Да. После let's идет действие без to: Let's start.", "Так. Після let's іде дія без to: Let's start.", "Yes. After let's, use start."), wrong: { 'to start': tri("После let's не ставим to. Нужно Let's start.", "Після let's не ставимо to. Потрібно Let's start.", "Do not use to after let's."), starting: tri("Let's starting - ошибка. Нужно Let's start.", "Let's starting - помилка. Потрібно Let's start.", 'Use start.'), starts: tri("После let's не добавляем -s. Нужно Let's start.", "Після let's не додаємо -s. Потрібно Let's start.", 'Use start.') }, focusWords: ["let's start"] }),
    step({ id: 'imperative_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_positive_negative', sentence: 'Choose the correct pair.', translation: tri('Открой дверь / Не трогай это', 'Відчини двері / Не чіпай це', "Open the door / Don't touch it"), options: ["Open the door / Don't touch it", 'You open the door / No touch it', 'To open the door / Not touch it', "Opening the door / Doesn't touch it"], correctAnswer: "Open the door / Don't touch it", correctFeedback: tri('Да. Команда = Open. Запрет = Don’t touch.', 'Так. Команда = Open. Заборона = Don’t touch.', "Yes. Command = Open. Prohibition = Don't touch."), wrong: { 'You open the door / No touch it': tri('В команде лишнее you, а No touch it - ошибка.', 'У команді зайве you, а No touch it - помилка.', "Use Open / Don't touch."), 'To open the door / Not touch it': tri('Команда не начинается с to, а запрету нужен Don’t.', 'Команда не починається з to, а забороні потрібне Don’t.', "Use Open / Don't touch."), "Opening the door / Doesn't touch it": tri('Opening не команда, а doesn’t не используется для прямого запрета.', 'Opening не команда, а doesn’t не використовується для прямої заборони.', "Use Open / Don't touch.") }, focusWords: ['open', "don't touch"] }),
    step({ id: 'imperative_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_be_negative_lets', sentence: 'Choose the correct set.', translation: tri('Будь осторожен / Не опаздывай / Давай начнем', 'Будь обережний / Не запізнюйся / Давай почнемо', "Be careful / Don't be late / Let's start"), options: ["Be careful / Don't be late / Let's start", "You are careful / No be late / Let's to start", 'To be careful / Not be late / Let start', "Being careful / Doesn't be late / We start"], correctAnswer: "Be careful / Don't be late / Let's start", correctFeedback: tri('Да. Be careful, Don’t be late и Let’s start - нормальные формы.', 'Так. Be careful, Don’t be late і Let’s start - нормальні форми.', "Yes. These are the correct forms."), wrong: { "You are careful / No be late / Let's to start": tri('Первое - утверждение, второе неверный запрет, третье с лишним to.', 'Перше - твердження, друге неправильна заборона, третє із зайвим to.', 'Use the first set.'), 'To be careful / Not be late / Let start': tri('To be и Not be не прямые команды. Для “давай” нужно Let’s.', 'To be і Not be не прямі команди. Для “давай” потрібне Let’s.', 'Use the first set.'), "Being careful / Doesn't be late / We start": tri('Эти формы не дают нужную команду, запрет и предложение.', 'Ці форми не дають потрібну команду, заборону й пропозицію.', 'Use the first set.') }, focusWords: ['be careful', "don't be", "let's start"] }),
    step({ id: 'imperative_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Пожалуйста, подожди здесь и не открывай дверь.', 'Будь ласка, зачекай тут і не відчиняй двері.', "Please wait here and don't open the door."), options: ["Please wait here and don't open the door.", "Please to wait here and no open the door.", "You please wait here and don't to open the door.", "Please waiting here and doesn't open the door."], correctAnswer: "Please wait here and don't open the door.", correctFeedback: tri('Да. Please wait + don’t open - нормальная вежливая инструкция.', 'Так. Please wait + don’t open - нормальна ввічлива інструкція.', "Yes. Please wait + don't open is correct."), wrong: { "Please to wait here and no open the door.": tri('После please не нужен to, а no open - ошибка.', 'Після please не потрібне to, а no open - помилка.', "Use Please wait and don't open."), "You please wait here and don't to open the door.": tri('You здесь лишнее, а после don’t не ставим to.', 'You тут зайве, а після don’t не ставимо to.', "Use Please wait and don't open."), "Please waiting here and doesn't open the door.": tri('Please waiting неверно, а doesn’t open не прямой запрет.', 'Please waiting неправильно, а doesn’t open не пряма заборона.', "Use Please wait and don't open.") }, focusWords: ['please wait', "don't open"] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['unnecessary_you_imperative_error', 'to_before_imperative_error', 'no_instead_of_dont_error', 'dont_to_error', 'dont_plus_ing_error', 'dont_be_error', 'lets_to_error', 'please_wrong_order_error', 'imperative_base_form_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri(
      'Показываем тип фразы: команда, запрет, просьба или предложение сделать вместе.',
      'Показуємо тип фрази: команда, заборона, прохання або пропозиція зробити разом.',
      'Mostramos el tipo de frase: orden, prohibicion, peticion o propuesta juntos.',
    ),
    depth2: tri(
      'Проще: нужно сделать действие или не делать действие?',
      'Простіше: треба зробити дію чи не робити дію?',
      'Mas simple: hay que hacer la accion o no hacerla?',
    ),
    depth3: tri(
      'Сравни четыре модели: Open, Don’t open, Please open, Let’s open.',
      'Порівняй чотири моделі: Open, Don’t open, Please open, Let’s open.',
      'Compara cuatro modelos: Open, Don’t open, Please open, Let’s open.',
    ),
    depth4: tri(
      'Почти подсказка: команда начинается с действия, запрет начинается с don’t.',
      'Майже підказка: команда починається з дії, заборона починається з don’t.',
      'Casi una pista: la orden empieza con la accion; la prohibicion empieza con don’t.',
    ),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Стоп. Команда: Open, Wait, Go. Запрет: Don’t touch, Don’t open, Don’t be. Please смягчает просьбу. Let’s значит “давай вместе”.',
        'Стоп. Команда: Open, Wait, Go. Заборона: Don’t touch, Don’t open, Don’t be. Please пом’якшує прохання. Let’s означає “давай разом”.',
        'Pausa. Orden: Open, Wait, Go. Prohibicion: Don’t touch, Don’t open, Don’t be. Please suaviza. Let’s significa juntos.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_imperative_type_hint_then_retry',
      card: tri(
        'Подсказка: система покажет тип фразы - команда, запрет, просьба или let’s-предложение, но ответ ты выберешь сам.',
        'Підказка: система покаже тип фрази - команда, заборона, прохання або let’s-пропозиція, але відповідь ти обереш сам.',
        'Pista: el sistema muestra el tipo de frase, pero tu eliges la respuesta.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери действие или запрет. Потом вернись к полной фразе.',
        'Режим підказки: спочатку обери дію або заборону. Потім повернися до повної фрази.',
        'Modo guiado: primero elige accion o prohibicion.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_imperative_001', prompt: tri('Команда “открой дверь” начинается с Open или You open?', 'Команда “відчини двері” починається з Open чи You open?', 'La orden "abre la puerta" empieza con Open o You open?'), options: ['Open', 'You open'], correctIndex: 0, thenReturnToExerciseId: 'imperative_easy_001' },
      { id: 'guided_imperative_002', prompt: tri('Запрет “не трогай” - это No touch или Don’t touch?', 'Заборона “не чіпай” - це No touch чи Don’t touch?', 'La prohibicion "no toques" es No touch o Don’t touch?'), options: ['No touch', "Don't touch"], correctIndex: 1, thenReturnToExerciseId: 'imperative_contrast_001' },
      { id: 'guided_imperative_003', prompt: tri('После don’t нужно open или to open?', 'Після don’t потрібно open чи to open?', 'Despues de don’t necesitas open o to open?'), options: ['open', 'to open'], correctIndex: 0, thenReturnToExerciseId: 'imperative_contrast_002' },
      { id: 'guided_imperative_004', prompt: tri('Let’s - это приказ одному человеку или предложение сделать вместе?', 'Let’s - це наказ одній людині чи пропозиція зробити разом?', 'Let’s es una orden a una persona o una propuesta de hacerlo juntos?'), options: ['приказ одному человеку', 'предложение вместе'], correctIndex: 1, thenReturnToExerciseId: 'imperative_mixed_002' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'imperative_basic',
    diagnosisLabel: tri('Команды и просьбы', 'Команди й прохання', 'Imperativo'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['open', 'wait', "don't touch", "don't open", 'be careful', "let's start"],
    focusPatterns: ['positive_command_open', 'positive_command_wait', 'positive_instruction_turn', 'negative_command_touch', 'negative_command_open', 'negative_command_forget', 'be_careful', 'dont_be_late', 'dont_be_afraid', 'please_wait', 'lets_go', 'lets_start', 'mixed_positive_negative', 'mixed_be_negative_lets', 'mixed_sentence_correction'],
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
    payload: { category: 'syntax', microDiagnosisId: 'imperative_basic', contrastSet: ['positive imperative', 'negative imperative', 'please', "let's"], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logImperativeType: true, logVerbForm: true, logPolitenessMarker: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=imperative_basic',
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
