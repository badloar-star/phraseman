// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const POSSESSIVE_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': "needs-review: esta explicação sobre possessive 's ainda precisa de revisão para português do Brasil.",
  vi: "needs-review: phần giải thích về possessive 's này vẫn cần được rà soát cho tiếng Việt.",
  id: "needs-review: penjelasan possessive 's ini masih perlu ditinjau untuk bahasa Indonesia.",
  tr: "needs-review: bu possessive 's açıklaması Türkçe için hâlâ gözden geçirilmeli.",
  pl: "needs-review: to objaśnienie possessive 's nadal wymaga przeglądu po polsku.",
};

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? POSSESSIVE_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST_SET = [
  "'s singular possessive",
  "plural possessive s'",
  'of-phrase',
  'apostrophe position',
  'possessive adjective',
  'is contraction',
];

const option = (text: string) => ({ id: text, text });

const POSSESSIVE_SKILL_ES: Record<string, string> = {
  singular_owner_name: "Un dueno: John's phone.",
  singular_owner_common: "Un teacher: teacher's book.",
  singular_owner_name_bag: "Un dueno: Anna's bag.",
  friend_one_owner: "Friend's car = un amigo.",
  friends_many_owners: "Friends' car = varios amigos.",
  students_many_owners: "Students termina en -s, entonces students'.",
  parents_many_owners: "Parents termina en -s, entonces parents'.",
  of_phrase_for_thing: 'Con cosas o ideas, of suele sonar natural.',
  possessive_s_vs_is: "John's phone es posesion; John's here es John is.",
  children_irregular_possessive: "Children es plural sin -s: children's.",
  men_irregular_possessive: "Men es plural sin -s: men's.",
  is_contraction_not_possessive: "John's here significa John is here.",
  singular_plural_pair: "John's = un dueno; students' = varios.",
  regular_irregular_pair: "Parents' por -s; children's por plural irregular.",
  mixed_sentence_correction: "Friend's car y parents' house tienen duenos distintos.",
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = POSSESSIVE_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? POSSESSIVE_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function possessiveEsFeedback(input: {
  targetSkill: string;
  correctAnswerId: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = POSSESSIVE_SKILL_ES[input.targetSkill] ?? 'Revisa dueno, objeto y posicion del apostrofo.';
  return `Usa "${input.correctAnswerId}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

const retry = (line: string, esFeedback: string): [TriText, TriText, TriText, TriText] => [
  tri(line, line, esFeedback),
  tri(
    'Сначала найди владельца. Потом найди вещь, которая ему принадлежит.',
    'Спочатку знайди власника. Потім знайди річ, яка йому належить.',
    'Primero encuentra el dueno. Luego encuentra la cosa que le pertenece.',
  ),
  tri(
    "Один владелец: John's phone. Несколько владельцев на -s: friends' car. Нестандартное множественное число: children's toys.",
    "Один власник: John's phone. Кілька власників на -s: friends' car. Нестандартна множина: children's toys.",
    "Un dueno: John's phone. Varios duenos en -s: friends' car. Plural irregular: children's toys.",
  ),
  tri(
    "Если после 's идет вещь, это обычно принадлежность. Если после 's идет here, ready или happy, это может быть is.",
    "Якщо після 's іде річ, це зазвичай належність. Якщо після 's іде here, ready або happy, це може бути is.",
    "Si despues de 's viene una cosa, suele ser posesion. Si viene here, ready o happy, puede ser is.",
  ),
];

const defaultWrong = (correctAnswer: string): TriText => tri(
  `Не эта форма. Здесь нужен вариант "${correctAnswer}": проверь владельца, вещь и место апострофа.`,
  `Не ця форма. Тут потрібен варіант "${correctAnswer}": перевір власника, річ і місце апострофа.`,
  `No es esta forma. Necesitamos "${correctAnswer}": revisa dueno, cosa y posicion del apostrofo.`,
);

function step(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  explanationBlock: TriText;
  microTask?: TriText;
  options: string[];
  correctAnswerId: string;
  correctFeedback: TriText;
  wrongFeedbackByOption?: Record<string, TriText>;
  retryLine: string;
  fallbackExplanation?: TriText;
  focusWords: string[];
}): DiagnosisTrainingStep {
  const esFeedback = possessiveEsFeedback(input);
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: withEs(input.translation, esFeedback),
    explanationBlock: withEs(input.explanationBlock, esFeedback),
    microTask: input.microTask ?? tri(
      'Выбери форму, где понятно, кому принадлежит вещь.',
      'Обери форму, де зрозуміло, кому належить річ.',
      'Elige la forma que muestra claramente a quien pertenece la cosa.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map(option),
    correctAnswerId: input.correctAnswerId,
    correctIndex: input.options.findIndex((item) => item === input.correctAnswerId),
    correctFeedback: withEs(input.correctFeedback, esFeedback),
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((item) => item !== input.correctAnswerId)
        .map((item) => [
          item,
          withEs(input.wrongFeedbackByOption?.[item] ?? defaultWrong(input.correctAnswerId), esFeedback),
        ]),
    ),
    retryFeedback: retry(input.retryLine, esFeedback),
    fallbackExplanation: input.fallbackExplanation ?? tri(
      "Один владелец получает 's: John's phone. Несколько владельцев на -s получают апостроф после s: friends' car. Children уже множественное число, но без -s, поэтому children's.",
      "Один власник отримує 's: John's phone. Кілька власників на -s отримують апостроф після s: friends' car. Children уже множина, але без -s, тому children's.",
      "Un dueno toma 's: John's phone. Varios duenos en -s toman apostrofo despues de s: friends' car. Children ya es plural sin -s, por eso children's.",
    ),
    focusWords: input.focusWords,
  };
}

export const NOUN_POSSESSIVE_APOSTROPHE_S_TRAINING: DiagnosisTraining = {
  id: 'noun_possessive_apostrophe_s',
  category: 'noun',
  version: '1.0.0',
  status: 'active',
  priority: 36,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    "John's phone / friends' car: кому принадлежит вещь",
    "John's phone / friends' car: кому належить річ",
    "John's phone / friends' car: de quien es la cosa",
    {
      'pt-BR': "John's phone / friends' car: de quem é a coisa",
      vi: "John's phone / friends' car: đồ vật thuộc về ai",
      id: "John's phone / friends' car: benda itu milik siapa",
      tr: "John's phone / friends' car: eşya kime ait",
      pl: "John's phone / friends' car: do kogo należy rzecz",
    },
  ),
  shortTitle: tri("Possessive 's", "Possessive 's", "Possessive 's", {
    'pt-BR': "Possessive 's",
    vi: "Possessive 's",
    id: "Possessive 's",
    tr: "Possessive 's",
    pl: "Possessive 's",
  }),
  shortDiagnosis: tri(
    "Ты пропускаешь апостроф или ставишь его не туда: Johns phone, friend's вместо friends'.",
    "Ти пропускаєш апостроф або ставиш його не туди: Johns phone, friend's замість friends'.",
    'Omites el apostrofo o lo pones en el lugar incorrecto.',
    {
      'pt-BR': "Você omite o apóstrofo ou o coloca no lugar errado: Johns phone, friend's em vez de friends'.",
      vi: "Bạn bỏ sót dấu nháy hoặc đặt sai vị trí: Johns phone, friend's thay vì friends'.",
      id: "Kamu melewatkan apostrof atau meletakkannya di tempat yang salah: Johns phone, friend's alih-alih friends'.",
      tr: "Apostrofu atlıyorsun ya da yanlış yere koyuyorsun: friends' yerine Johns phone veya friend's.",
      pl: "Pomijasz apostrof albo stawiasz go w złym miejscu: Johns phone, friend's zamiast friends'.",
    },
  ),
  diagnosisText: tri(
    "В русском можно сказать: телефон Джона. В английском чаще нужен другой порядок: John первым, потом 's, потом phone.",
    "Українською можна сказати: телефон Джона. В англійській частіше потрібен інший порядок: John першим, потім 's, потім phone.",
    "En ingles normalmente va primero el dueno: John + 's + phone.",
    {
      'pt-BR': "Em português, você pode dizer telefone do John. Em inglês, geralmente a ordem muda: John primeiro, depois 's, depois phone.",
      vi: "Trong tiếng Việt, bạn có thể nói điện thoại của John. Trong tiếng Anh, thường cần thứ tự khác: John trước, rồi 's, rồi phone.",
      id: "Dalam bahasa Indonesia, kamu bisa mengatakan telepon John. Dalam bahasa Inggris, biasanya urutannya berbeda: John dulu, lalu 's, lalu phone.",
      tr: "Türkçede John'un telefonu diyebilirsin. İngilizcede çoğu zaman sıra farklıdır: önce John, sonra 's, sonra phone.",
      pl: "Po polsku można powiedzieć telefon Johna. W angielskim zwykle potrzebny jest inny szyk: najpierw John, potem 's, potem phone.",
    },
  ),
  mentalModel: tri(
    "Думай не про апостроф сам по себе, а про пару: владелец плюс вещь. Один друг: friend's car. Несколько друзей: friends' car.",
    "Думай не про апостроф сам по собі, а про пару: власник плюс річ. Один друг: friend's car. Кілька друзів: friends' car.",
    "Piensa en dueno mas cosa. Un amigo: friend's car. Varios amigos: friends' car.",
    {
      'pt-BR': "Pense não no apóstrofo isolado, mas no par: dono mais coisa. Um amigo: friend's car. Vários amigos: friends' car.",
      vi: "Đừng nghĩ riêng về dấu nháy; hãy nghĩ theo cặp: người sở hữu cộng với đồ vật. Một người bạn: friend's car. Nhiều người bạn: friends' car.",
      id: "Jangan pikirkan apostrof sendirian; pikirkan pasangannya: pemilik plus benda. Satu teman: friend's car. Beberapa teman: friends' car.",
      tr: "Apostrofu tek başına düşünme; sahip artı eşya çiftini düşün. Bir arkadaş: friend's car. Birkaç arkadaş: friends' car.",
      pl: "Nie myśl o samym apostrofie, tylko o parze: właściciel plus rzecz. Jeden przyjaciel: friend's car. Kilku przyjaciół: friends' car.",
    },
  ),
  contrastSet: CONTRAST_SET,
  coreRule: tri(
    "John's phone. My friend's car. My friends' car. The students' answers. The children's toys. The name of the app.",
    "John's phone. My friend's car. My friends' car. The students' answers. The children's toys. The name of the app.",
    "John's phone. My friend's car. My friends' car. The students' answers. The children's toys. The name of the app.",
    {
      'pt-BR': "John's phone. My friend's car. My friends' car. The students' answers. The children's toys. The name of the app.",
      vi: "John's phone. My friend's car. My friends' car. The students' answers. The children's toys. The name of the app.",
      id: "John's phone. My friend's car. My friends' car. The students' answers. The children's toys. The name of the app.",
      tr: "John's phone. My friend's car. My friends' car. The students' answers. The children's toys. The name of the app.",
      pl: "John's phone. My friend's car. My friends' car. The students' answers. The children's toys. The name of the app.",
    },
  ),
  whatUserMustLearn: {
    ru: [
      "Один владелец: John's phone, Anna's bag, teacher's book.",
      "Владелец стоит перед вещью: John's phone, не phone John's.",
      "My friend's car значит машина одного друга.",
      "My friends' car значит машина нескольких друзей.",
      "Если множественное число уже заканчивается на -s, апостроф ставим после s: students' answers.",
      "Children уже означает несколько детей, но без -s, поэтому children's toys.",
      "'s может быть и is: John's here = John is here.",
      "Для вещей и идей часто естественно звучит of: the name of the app.",
    ],
    uk: [
      "Один власник: John's phone, Anna's bag, teacher's book.",
      "Власник стоїть перед річчю: John's phone, не phone John's.",
      "My friend's car означає машина одного друга.",
      "My friends' car означає машина кількох друзів.",
      "Якщо множина вже закінчується на -s, апостроф ставимо після s: students' answers.",
      "Children уже означає кількох дітей, але без -s, тому children's toys.",
      "'s може бути і is: John's here = John is here.",
      "Для речей та ідей часто природно звучить of: the name of the app.",
    ],
    es: [
      "Un dueno: John's phone.",
      'El dueno va antes de la cosa.',
      "My friend's car significa un amigo.",
      "My friends' car significa varios amigos.",
      'Las palabras que terminan en -s suelen llevar apostrofo despues de s.',
      "Children es plural pero no termina en -s, por eso children's.",
      "'s tambien puede significar is.",
      'Para cosas e ideas, of suele sonar natural.',
    ],
    'pt-BR': [
      "Um dono: John's phone.",
      'O dono vem antes da coisa.',
      "My friend's car significa um amigo.",
      "My friends' car significa vários amigos.",
      'Palavras que terminam em -s muitas vezes levam apóstrofo depois do s.',
      "Children é plural, mas não com -s, então children's.",
      "'s também pode significar is.",
      'Para coisas e ideias, of muitas vezes soa natural.',
    ],
    vi: [
      "Một chủ sở hữu: John's phone.",
      'Người sở hữu đứng trước đồ vật.',
      "My friend's car nghĩa là xe của một người bạn.",
      "My friends' car nghĩa là xe của nhiều người bạn.",
      'Từ kết thúc bằng -s thường đặt dấu nháy sau s.',
      "Children là số nhiều nhưng không có -s, nên dùng children's.",
      "'s cũng có thể nghĩa là is.",
      'Với đồ vật và ý tưởng, of thường tự nhiên.',
    ],
    id: [
      "Satu pemilik: John's phone.",
      'Pemilik datang sebelum benda.',
      "My friend's car berarti mobil satu teman.",
      "My friends' car berarti mobil beberapa teman.",
      'Kata yang berakhir dengan -s sering memakai apostrof setelah s.',
      "Children sudah jamak tetapi bukan dengan -s, jadi children's.",
      "'s juga bisa berarti is.",
      'Untuk benda dan ide, of sering terdengar alami.',
    ],
    tr: [
      "Tek sahip: John's phone.",
      'Sahip, şeyden önce gelir.',
      "My friend's car bir arkadaşın arabası demektir.",
      "My friends' car birkaç arkadaşın arabası demektir.",
      '-s ile biten kelimelerde apostrof çoğu zaman s sonrasına gelir.',
      "Children çoğuldur ama -s ile bitmez, bu yüzden children's.",
      "'s aynı zamanda is anlamına da gelebilir.",
      'Şeyler ve fikirler için of çoğu zaman doğal gelir.',
    ],
    pl: [
      "Jeden właściciel: John's phone.",
      'Właściciel stoi przed rzeczą.',
      "My friend's car oznacza samochód jednego przyjaciela.",
      "My friends' car oznacza samochód kilku przyjaciół.",
      'Słowa zakończone na -s często dostają apostrof po s.',
      "Children jest liczbą mnogą, ale bez -s, więc children's.",
      "'s może też znaczyć is.",
      'Dla rzeczy i idei of często brzmi naturalnie.',
    ],
  },
  examples: [
    { en: "This is John's phone.", ru: 'Это телефон Джона.', uk: 'Це телефон Джона.', es: 'Este es el telefono de John.', 'pt-BR': 'Este é o telefone do John.', vi: 'Đây là điện thoại của John.', id: 'Ini ponsel John.', tr: "Bu John'un telefonu.", pl: 'To jest telefon Johna.', why: tri("John один, поэтому John's phone.", "John один, тому John's phone.", "John es un dueno, por eso John's phone.") },
    { en: "My friend's car is outside.", ru: 'Машина моего друга снаружи.', uk: 'Машина мого друга зовні.', es: 'El coche de mi amigo esta afuera.', 'pt-BR': 'O carro do meu amigo está lá fora.', vi: 'Xe của bạn tôi ở bên ngoài.', id: 'Mobil teman saya ada di luar.', tr: 'Arkadaşımın arabası dışarıda.', pl: 'Samochód mojego przyjaciela jest na zewnątrz.', why: tri("Друг один: friend's car.", "Друг один: friend's car.", "Un amigo: friend's car.") },
    { en: "My friends' car is outside.", ru: 'Машина моих друзей снаружи.', uk: 'Машина моїх друзів зовні.', es: 'El coche de mis amigos esta afuera.', 'pt-BR': 'O carro dos meus amigos está lá fora.', vi: 'Xe của những người bạn tôi ở bên ngoài.', id: 'Mobil teman-teman saya ada di luar.', tr: 'Arkadaşlarımın arabası dışarıda.', pl: 'Samochód moich przyjaciół jest na zewnątrz.', why: tri("Друзей несколько, friends уже с -s: friends' car.", "Друзів кілька, friends уже з -s: friends' car.", "Varios amigos; friends ya termina en -s: friends' car.") },
    { en: "The students' answers were correct.", ru: 'Ответы студентов были правильными.', uk: 'Відповіді студентів були правильними.', es: 'Las respuestas de los estudiantes fueron correctas.', 'pt-BR': 'As respostas dos alunos estavam corretas.', vi: 'Câu trả lời của các học sinh là đúng.', id: 'Jawaban para siswa benar.', tr: 'Öğrencilerin cevapları doğruydu.', pl: 'Odpowiedzi uczniów były poprawne.', why: tri("Students заканчивается на -s, поэтому students' answers.", "Students закінчується на -s, тому students' answers.", "Students termina en -s, por eso students' answers.") },
    { en: "The children's toys are everywhere.", ru: 'Игрушки детей везде.', uk: 'Іграшки дітей всюди.', es: 'Los juguetes de los ninos estan por todas partes.', 'pt-BR': 'Os brinquedos das crianças estão por toda parte.', vi: 'Đồ chơi của bọn trẻ ở khắp nơi.', id: 'Mainan anak-anak ada di mana-mana.', tr: 'Çocukların oyuncakları her yerde.', pl: 'Zabawki dzieci są wszędzie.', why: tri("Children уже множественное число, но без -s: children's toys.", "Children уже множина, але без -s: children's toys.", "Children ya es plural, pero sin -s: children's toys.") },
    { en: 'The name of the app is Phraseman.', ru: 'Название приложения - Phraseman.', uk: 'Назва застосунку - Phraseman.', es: 'El nombre de la app es Phraseman.', 'pt-BR': 'O nome do app é Phraseman.', vi: 'Tên của ứng dụng là Phraseman.', id: 'Nama aplikasinya adalah Phraseman.', tr: 'Uygulamanın adı Phraseman.', pl: 'Nazwa aplikacji to Phraseman.', why: tri('Для вещей и идей of часто звучит естественно.', 'Для речей та ідей of часто звучить природно.', 'Para cosas e ideas, of suele sonar natural.') },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri("John phone или phone John не решает задачу. Английскому нужен владелец перед вещью: John's phone.", "John phone або phone John не вирішує задачу. Англійській потрібен власник перед річчю: John's phone.", "John phone o phone John no resuelven la frase. En ingles el dueno va antes de la cosa: John's phone.") },
    { id: 'intro_rule', type: 'rule', text: tri("Сначала называем владельца, потом вещь: John's phone, my friend's car. Апостроф показывает, кому это принадлежит.", "Спочатку називаємо власника, потім річ: John's phone, my friend's car. Апостроф показує, кому це належить.", "Formula: dueno + 's + cosa. John's phone. My friend's car.") },
    { id: 'intro_warning', type: 'warning', text: tri("Главная ловушка: friend's и friends' - разные вещи.", "Головна пастка: friend's і friends' - різні речі.", "Trampa principal: friend's y friends' son cosas distintas.") },
  ],
  steps: [
    step({
      id: 'poss_s_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'singular_owner_name',
      sentence: 'This is ___ phone.',
      translation: tri('Это телефон Джона.', 'Це телефон Джона.', "This is John's phone."),
      explanationBlock: tri("John один. Чтобы сказать телефон Джона, ставим John's перед phone.", "John один. Щоб сказати телефон Джона, ставимо John's перед phone.", "John is one owner. Put John's before phone."),
      options: ["John's", 'John', 'Johns', "phone's John"],
      correctAnswerId: "John's",
      correctFeedback: tri("Да. John's phone.", "Так. John's phone.", "Yes. John's phone."),
      wrongFeedbackByOption: {
        John: tri("John phone не показывает принадлежность. Нужно John's phone.", "John phone не показує належність. Потрібно John's phone.", "John phone does not show possession. Use John's phone."),
        Johns: tri("Johns без апострофа не значит Джона. Нужно John's phone.", "Johns без апострофа не означає Джона. Потрібно John's phone.", "Johns without apostrophe does not mean John's. Use John's phone."),
        "phone's John": tri("Владелец должен стоять перед вещью: John's phone.", "Власник має стояти перед річчю: John's phone.", "The owner comes before the thing: John's phone."),
      },
      retryLine: "John + 's + phone = John's phone.",
      focusWords: ["John's phone"],
    }),
    step({
      id: 'poss_s_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'singular_owner_common',
      sentence: 'The ___ book is on the table.',
      translation: tri('Книга учителя на столе.', 'Книга вчителя на столі.', "The teacher's book is on the table."),
      explanationBlock: tri("Один учитель: teacher's book.", "Один учитель: teacher's book.", "One teacher: teacher's book."),
      options: ["teacher's", 'teacher', 'teachers', "book's teacher"],
      correctAnswerId: "teacher's",
      correctFeedback: tri("Да. The teacher's book.", "Так. The teacher's book.", "Yes. The teacher's book."),
      wrongFeedbackByOption: {
        teacher: tri("Teacher book звучит как описание типа книги. Здесь нужна принадлежность: teacher's book.", "Teacher book звучить як опис типу книги. Тут потрібна належність: teacher's book.", "Teacher book sounds like a type of book. Here we need possession: teacher's book."),
        teachers: tri("Teachers без апострофа - просто множественное число. Нужна форма teacher's.", "Teachers без апострофа - просто множина. Потрібна форма teacher's.", "Teachers without apostrophe is just plural. Use teacher's."),
        "book's teacher": tri("Порядок перевернут. Владелец первым: teacher's book.", "Порядок перевернутий. Власник першим: teacher's book.", "The order is reversed. Owner first: teacher's book."),
      },
      retryLine: "Teacher + 's + book = teacher's book.",
      focusWords: ["teacher's book"],
    }),
    step({
      id: 'poss_s_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'singular_owner_name_bag',
      sentence: 'This is ___ bag.',
      translation: tri('Это сумка Анны.', 'Це сумка Анни.', "This is Anna's bag."),
      explanationBlock: tri("Анна - один владелец. Поэтому Anna's bag.", "Анна - один власник. Тому Anna's bag.", "Anna is one owner, so Anna's bag."),
      options: ["Anna's", 'Anna', 'Annas', "bag's Anna"],
      correctAnswerId: "Anna's",
      correctFeedback: tri("Да. Anna's bag.", "Так. Anna's bag.", "Yes. Anna's bag."),
      wrongFeedbackByOption: {
        Anna: tri("Anna bag не показывает, что сумка принадлежит Анне. Нужно Anna's bag.", "Anna bag не показує, що сумка належить Анні. Потрібно Anna's bag.", "Anna bag does not show possession. Use Anna's bag."),
        Annas: tri("Annas без апострофа не работает как Анны. Нужно Anna's.", "Annas без апострофа не працює як Анни. Потрібно Anna's.", "Annas without apostrophe does not work as Anna's. Use Anna's."),
        "bag's Anna": tri("Сумка не владелец. Владелец первым: Anna's bag.", "Сумка не власник. Власник першим: Anna's bag.", "The bag is not the owner. Owner first: Anna's bag."),
      },
      retryLine: "Anna + 's + bag = Anna's bag.",
      focusWords: ["Anna's bag"],
    }),
    step({
      id: 'poss_s_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'friend_one_owner',
      sentence: 'My ___ car is outside.',
      translation: tri('Машина моего друга снаружи.', 'Машина мого друга зовні.', "My friend's car is outside."),
      explanationBlock: tri("Друг один. Один владелец получает 's: friend's car.", "Друг один. Один власник отримує 's: friend's car.", "One friend. One owner takes 's: friend's car."),
      options: ["friend's", "friends'", 'friends', 'friend'],
      correctAnswerId: "friend's",
      correctFeedback: tri("Да. Один друг: friend's car.", "Так. Один друг: friend's car.", "Yes. One friend: friend's car."),
      wrongFeedbackByOption: {
        "friends'": tri("Friends' - это несколько друзей. Здесь один друг: friend's.", "Friends' - це кілька друзів. Тут один друг: friend's.", "Friends' means several friends. Here it is one friend: friend's."),
        friends: tri("Friends без апострофа не показывает принадлежность.", "Friends без апострофа не показує належність.", "Friends without apostrophe does not show possession."),
        friend: tri("Friend car не хватает 's. Нужно friend's car.", "Friend car бракує 's. Потрібно friend's car.", "Friend car is missing 's. Use friend's car."),
      },
      retryLine: "One friend: friend's car.",
      focusWords: ["friend's car"],
    }),
    step({
      id: 'poss_s_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'friends_many_owners',
      sentence: 'My ___ car is outside.',
      translation: tri('Машина моих друзей снаружи.', 'Машина моїх друзів зовні.', "My friends' car is outside."),
      explanationBlock: tri("Друзей несколько. Friends уже заканчивается на -s, поэтому апостроф после s: friends' car.", "Друзів кілька. Friends уже закінчується на -s, тому апостроф після s: friends' car.", "Several friends. Friends already ends in -s, so apostrophe goes after s: friends' car."),
      options: ["friends'", "friend's", 'friends', 'friend'],
      correctAnswerId: "friends'",
      correctFeedback: tri("Да. Несколько друзей: friends' car.", "Так. Кілька друзів: friends' car.", "Yes. Several friends: friends' car."),
      wrongFeedbackByOption: {
        "friend's": tri("Friend's - это один друг. Здесь друзей несколько: friends'.", "Friend's - це один друг. Тут друзів кілька: friends'.", "Friend's means one friend. Here it is several friends: friends'."),
        friends: tri("Friends без апострофа - просто друзья, но не машина друзей.", "Friends без апострофа - просто друзі, але не машина друзів.", "Friends without apostrophe is just friends, not friends' car."),
        friend: tri("Friend - один друг и без принадлежности. Нужно friends'.", "Friend - один друг і без належності. Потрібно friends'.", "Friend is one friend and no possession. Use friends'."),
      },
      retryLine: "Several friends: friends' car.",
      focusWords: ["friends' car"],
    }),
    step({
      id: 'poss_s_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'students_many_owners',
      sentence: 'The ___ answers were correct.',
      translation: tri('Ответы студентов были правильными.', 'Відповіді студентів були правильними.', "The students' answers were correct."),
      explanationBlock: tri("Студентов несколько. Students уже с -s, поэтому students' answers.", "Студентів кілька. Students уже з -s, тому students' answers.", "Several students. Students already has -s, so students' answers."),
      options: ["students'", "student's", 'students', 'student'],
      correctAnswerId: "students'",
      correctFeedback: tri("Да. The students' answers.", "Так. The students' answers.", "Yes. The students' answers."),
      wrongFeedbackByOption: {
        "student's": tri("Student's - ответ одного студента. Здесь ответы студентов: students'.", "Student's - відповідь одного студента. Тут відповіді студентів: students'.", "Student's means one student's answer. Here: students'."),
        students: tri("Students без апострофа не показывает, что ответы принадлежат студентам.", "Students без апострофа не показує, що відповіді належать студентам.", "Students without apostrophe does not show possession."),
        student: tri("Student - один студент и без апострофа. Нужно students'.", "Student - один студент і без апострофа. Потрібно students'.", "Student is one student and no apostrophe. Use students'."),
      },
      retryLine: "Students + apostrophe = students' answers.",
      focusWords: ["students' answers"],
    }),
    step({
      id: 'poss_s_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'parents_many_owners',
      sentence: 'My ___ house is near the park.',
      translation: tri('Дом моих родителей рядом с парком.', 'Будинок моїх батьків біля парку.', "My parents' house is near the park."),
      explanationBlock: tri("Родителей обычно двое или несколько. Parents уже на -s: parents' house.", "Батьків зазвичай двоє або кілька. Parents уже на -s: parents' house.", "Parents is plural and ends in -s: parents' house."),
      options: ["parents'", "parent's", 'parents', 'parent'],
      correctAnswerId: "parents'",
      correctFeedback: tri("Да. My parents' house.", "Так. My parents' house.", "Yes. My parents' house."),
      wrongFeedbackByOption: {
        "parent's": tri("Parent's - дом одного родителя. Здесь дом родителей: parents'.", "Parent's - будинок одного з батьків. Тут будинок батьків: parents'.", "Parent's means one parent's house. Here: parents'."),
        parents: tri("Parents без апострофа не показывает принадлежность.", "Parents без апострофа не показує належність.", "Parents without apostrophe does not show possession."),
        parent: tri("Parent - один родитель и без принадлежности. Нужно parents'.", "Parent - один із батьків і без належності. Потрібно parents'.", "Parent is one parent and no possession. Use parents'."),
      },
      retryLine: "Parents + apostrophe = parents' house.",
      focusWords: ["parents' house"],
    }),
    step({
      id: 'poss_s_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'of_phrase_for_thing',
      sentence: 'The ___ is Phraseman.',
      translation: tri('Название приложения - Phraseman.', 'Назва застосунку - Phraseman.', 'The name of the app is Phraseman.'),
      explanationBlock: tri("Когда владелец - не человек, часто естественнее звучит of: the name of the app.", "Коли власник - не людина, часто природніше звучить of: the name of the app.", "When the owner is not a person, of often sounds more natural: the name of the app."),
      options: ['name of the app', "app's name", 'app name', "name's app"],
      correctAnswerId: 'name of the app',
      correctFeedback: tri("Да. The name of the app.", "Так. The name of the app.", "Yes. The name of the app."),
      wrongFeedbackByOption: {
        "app's name": tri("Понять можно, но для названия приложения естественнее: the name of the app.", "Зрозуміти можна, але для назви застосунку природніше: the name of the app.", "It is understandable, but the name of the app is more natural here."),
        'app name': tri("App name может быть словосочетанием, но в этом предложении нужна полная форма: name of the app.", "App name може бути словосполученням, але в цьому реченні потрібна повна форма: name of the app.", "App name can be a noun phrase, but here we need the full form: name of the app."),
        "name's app": tri("Name не владеет приложением. Нужно the name of the app.", "Name не володіє застосунком. Потрібно the name of the app.", "Name does not own the app. Use the name of the app."),
      },
      retryLine: "For a thing: the name of the app.",
      focusWords: ['name of the app'],
    }),
    step({
      id: 'poss_s_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'possessive_s_vs_is',
      sentence: 'Choose the possessive phrase.',
      translation: tri('Выбери фразу с принадлежностью.', 'Обери фразу з належністю.', 'Choose the possessive phrase.'),
      explanationBlock: tri("После John's идет phone - вещь. Значит это принадлежность. John's here - это уже John is here.", "Після John's іде phone - річ. Отже, це належність. John's here - це вже John is here.", "Phone comes after John's, so this is possession. John's here means John is here."),
      options: ["John's phone", "John's here.", "She's tired.", "It's cold."],
      correctAnswerId: "John's phone",
      correctFeedback: tri("Да. John's phone - телефон Джона.", "Так. John's phone - телефон Джона.", "Yes. John's phone is possession."),
      wrongFeedbackByOption: {
        "John's here.": tri("Здесь John's = John is. Это не принадлежность.", "Тут John's = John is. Це не належність.", "Here John's = John is. It is not possession."),
        "She's tired.": tri("She's = she is. Это не принадлежность.", "She's = she is. Це не належність.", "She's = she is. It is not possession."),
        "It's cold.": tri("It's = it is. Это не принадлежность.", "It's = it is. Це не належність.", "It's = it is. It is not possession."),
      },
      retryLine: "Possession: John's phone. Is: John's here.",
      focusWords: ["John's phone", 'John is'],
    }),
    step({
      id: 'poss_s_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'children_irregular_possessive',
      sentence: 'The ___ toys are everywhere.',
      translation: tri('Игрушки детей везде.', 'Іграшки дітей всюди.', "The children's toys are everywhere."),
      explanationBlock: tri("Children уже множественное число, но не заканчивается на -s. Поэтому children's toys.", "Children уже множина, але не закінчується на -s. Тому children's toys.", "Children is already plural but does not end in -s, so children's toys."),
      options: ["children's", "childrens'", 'children', "child's"],
      correctAnswerId: "children's",
      correctFeedback: tri("Да. The children's toys.", "Так. The children's toys.", "Yes. The children's toys."),
      wrongFeedbackByOption: {
        "childrens'": tri("Childrens не существует как нормальное множественное число. Нужно children's.", "Childrens не існує як нормальна множина. Потрібно children's.", "Childrens is not the normal plural. Use children's."),
        children: tri("Children без апострофа не показывает принадлежность.", "Children без апострофа не показує належність.", "Children without apostrophe does not show possession."),
        "child's": tri("Child's - одного ребенка. Здесь детей несколько: children's.", "Child's - однієї дитини. Тут дітей кілька: children's.", "Child's means one child. Here several children: children's."),
      },
      retryLine: "Children + 's = children's toys.",
      focusWords: ["children's toys"],
    }),
    step({
      id: 'poss_s_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'men_irregular_possessive',
      sentence: 'The ___ room is over there.',
      translation: tri('Мужская комната там.', 'Чоловіча кімната там.', "The men's room is over there."),
      explanationBlock: tri("Men уже множественное число, но без -s. Поэтому men's room.", "Men уже множина, але без -s. Тому men's room.", "Men is already plural but not with -s, so men's room."),
      options: ["men's", "mens'", 'men', "man's"],
      correctAnswerId: "men's",
      correctFeedback: tri("Да. The men's room.", "Так. The men's room.", "Yes. The men's room."),
      wrongFeedbackByOption: {
        "mens'": tri("Mens не нормальное множественное число. Нужно men's.", "Mens не нормальна множина. Потрібно men's.", "Mens is not the normal plural. Use men's."),
        men: tri("Men без апострофа не показывает связь. Нужно men's room.", "Men без апострофа не показує зв'язок. Потрібно men's room.", "Men without apostrophe does not show possession. Use men's room."),
        "man's": tri("Man's - одного мужчины. Здесь men's room.", "Man's - одного чоловіка. Тут men's room.", "Man's means one man. Here: men's room."),
      },
      retryLine: "Men + 's = men's room.",
      focusWords: ["men's room"],
    }),
    step({
      id: 'poss_s_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'is_contraction_not_possessive',
      sentence: "Choose the phrase where 's means is.",
      translation: tri("Выбери фразу, где 's означает is.", "Обери фразу, де 's означає is.", "Choose where 's means is."),
      explanationBlock: tri("После John's идет here, а не вещь. Значит John's = John is.", "Після John's іде here, а не річ. Отже, John's = John is.", "Here follows John's, not a thing. So John's = John is."),
      options: ["John's here.", "John's phone", "Anna's bag", "the teacher's book"],
      correctAnswerId: "John's here.",
      correctFeedback: tri("Да. John's here = John is here.", "Так. John's here = John is here.", "Yes. John's here = John is here."),
      wrongFeedbackByOption: {
        "John's phone": tri("John's phone - это принадлежность: телефон Джона.", "John's phone - це належність: телефон Джона.", "John's phone is possession."),
        "Anna's bag": tri("Anna's bag - это принадлежность: сумка Анны.", "Anna's bag - це належність: сумка Анни.", "Anna's bag is possession."),
        "the teacher's book": tri("Teacher's book - это принадлежность: книга учителя.", "Teacher's book - це належність: книга вчителя.", "Teacher's book is possession."),
      },
      retryLine: "John's here = John is here.",
      focusWords: ['John is'],
    }),
    step({
      id: 'poss_s_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'singular_plural_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Телефон Джона / ответы студентов', 'Телефон Джона / відповіді студентів', "John's phone / the students' answers"),
      explanationBlock: tri("John один: John's. Students несколько и с -s: students'.", "John один: John's. Students кілька і з -s: students'.", "John one owner: John's. Students several ending in -s: students'."),
      options: [
        "John's phone / the students' answers",
        "Johns phone / the student's answers",
        'John phone / the students answers',
        "phone's John / the answers' students",
      ],
      correctAnswerId: "John's phone / the students' answers",
      correctFeedback: tri("Да. John's phone / the students' answers.", "Так. John's phone / the students' answers.", "Yes. John's phone / the students' answers."),
      wrongFeedbackByOption: {
        "Johns phone / the student's answers": tri("В Johns не хватает апострофа. Student's - один студент, а здесь students' answers.", "У Johns бракує апострофа. Student's - один студент, а тут students' answers.", "Johns is missing apostrophe. Student's means one student, but here students' answers."),
        'John phone / the students answers': tri("В обеих частях не хватает апострофа: John's phone / students' answers.", "В обох частинах бракує апострофа: John's phone / students' answers.", "Both parts miss the apostrophe: John's phone / students' answers."),
        "phone's John / the answers' students": tri("Владелец и вещь перепутаны. Нужно John's phone и students' answers.", "Власник і річ переплутані. Потрібно John's phone і students' answers.", "Owner and thing are swapped. Use John's phone and students' answers."),
      },
      retryLine: "John's phone / students' answers.",
      focusWords: ["John's phone", "students' answers"],
    }),
    step({
      id: 'poss_s_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'regular_irregular_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Дом родителей / игрушки детей', 'Будинок батьків / іграшки дітей', "parents' house / children's toys"),
      explanationBlock: tri("Если слово уже заканчивается на -s, апостроф ставим после него: parents' house. Если множественное число без -s, добавляем 's: children's toys.", "Якщо слово вже закінчується на -s, апостроф ставимо після нього: parents' house. Якщо множина без -s, додаємо 's: children's toys.", "Parents ending in -s: parents'. Children without -s: children's."),
      options: [
        "my parents' house / the children's toys",
        "my parent's house / the childrens' toys",
        'my parents house / the children toys',
        "my parent house / the child's toys",
      ],
      correctAnswerId: "my parents' house / the children's toys",
      correctFeedback: tri("Да. Parents' house / children's toys.", "Так. Parents' house / children's toys.", "Yes. Parents' house / children's toys."),
      wrongFeedbackByOption: {
        "my parent's house / the childrens' toys": tri("Parent's - один родитель. Childrens' ломается. Нужно parents' / children's.", "Parent's - один із батьків. Childrens' ламається. Потрібно parents' / children's.", "Parent's means one parent. Childrens' is broken. Use parents' / children's."),
        'my parents house / the children toys': tri("Не хватает апострофов: parents' house, children's toys.", "Бракує апострофів: parents' house, children's toys.", "Missing apostrophes: parents' house, children's toys."),
        "my parent house / the child's toys": tri("Parent house ломается, child's toys - один ребенок. Нужно parents' house / children's toys.", "Parent house ламається, child's toys - одна дитина. Потрібно parents' house / children's toys.", "Parent house is broken, child's toys means one child. Use parents' house / children's toys."),
      },
      retryLine: "Parents' house / children's toys.",
      focusWords: ["parents' house", "children's toys"],
    }),
    step({
      id: 'poss_s_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Машина моего друга рядом с домом моих родителей.', 'Машина мого друга біля будинку моїх батьків.', "My friend's car is near my parents' house."),
      explanationBlock: tri("Друг один, поэтому после friend добавляем 's: friend's car. Родителей несколько, слово уже на -s, поэтому parents' house.", "Друг один, тому після friend додаємо 's: friend's car. Батьків кілька, слово вже на -s, тому parents' house.", "One friend: friend's car. Parents several: parents' house."),
      options: [
        "My friend's car is near my parents' house.",
        "My friends car is near my parent's house.",
        'My friend car is near my parents house.',
        "My car's friend is near my house's parents.",
      ],
      correctAnswerId: "My friend's car is near my parents' house.",
      correctFeedback: tri("Да. Один друг дает friend's car, а несколько родителей дают parents' house. Вся фраза собрана правильно.", "Так. Один друг дає friend's car, а кілька батьків дають parents' house. Уся фраза зібрана правильно.", "Yes. My friend's car is near my parents' house."),
      wrongFeedbackByOption: {
        "My friends car is near my parent's house.": tri("Friends car пропускает апостроф, а parent's house значит дом одного родителя. Нужно friend's car и parents' house.", "Friends car пропускає апостроф, а parent's house означає будинок одного з батьків. Потрібно friend's car і parents' house.", "Friends car misses apostrophe, and parent's house means one parent. Use friend's car and parents' house."),
        'My friend car is near my parents house.': tri("В обеих частях не хватает апострофа: friend's car, parents' house.", "В обох частинах бракує апострофа: friend's car, parents' house.", "Both parts miss the apostrophe: friend's car, parents' house."),
        "My car's friend is near my house's parents.": tri("Владелец и вещь перепутаны. Нужно friend's car и parents' house.", "Власник і річ переплутані. Потрібно friend's car і parents' house.", "Owner and thing are swapped. Use friend's car and parents' house."),
      },
      retryLine: "Friend's car. Parents' house.",
      focusWords: ["friend's car", "parents' house"],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_apostrophe_s',
      'owner_thing_order_error',
      'friend_friends_apostrophe_error',
      'students_apostrophe_position_error',
      'children_apostrophe_error',
      'possessive_s_vs_is_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем владельца и вещь.', 'Показуємо власника і річ.', 'Muestra el dueno y la cosa.'),
    depth2: tri('Проверяем: владелец один или их несколько?', 'Перевіряємо: власник один чи їх кілька?', 'Comprueba si hay un dueno o varios.'),
    depth3: tri("Держи три модели: один владелец дает John's phone, несколько друзей дают friends' car, а children без -s дает children's toys.", "Тримай три моделі: один власник дає John's phone, кілька друзів дають friends' car, а children без -s дає children's toys.", "Modelos: John's phone / friends' car / children's toys."),
    depth4: tri("Почти подсказка: один владелец = 's; много владельцев на -s = s'; children = children's.", "Майже підказка: один власник = 's; багато власників на -s = s'; children = children's.", "Casi pista: un dueno = 's; plural en -s = s'; children = children's."),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        "Один владелец: John's phone. Несколько на -s: friends' car. Children без -s: children's toys.",
        "Один власник: John's phone. Кілька на -s: friends' car. Children без -s: children's toys.",
        "Un dueno: John's phone. Varios en -s: friends' car. Children sin -s: children's toys.",
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_owner_hint_then_retry',
      card: tri(
        'Мы подсветим владельца и вещь, но апостроф выберешь ты.',
        'Ми підсвітимо власника і річ, але апостроф обереш ти.',
        'Mostramos dueno y cosa, pero tu eliges el apostrofo.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Guided mode: сначала кто владелец, потом один или несколько.',
        'Guided mode: спочатку хто власник, потім один чи кілька.',
        'Modo guiado: primero dueno, luego uno o varios.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_poss_s_001', prompt: tri("В John's phone кто владелец?", "У John's phone хто власник?", "En John's phone, quien es el dueno?"), options: ['John', 'phone'], correctIndex: 0, thenReturnToExerciseId: 'poss_s_easy_001' },
      { id: 'guided_poss_s_002', prompt: tri("Friend's car: один друг или несколько?", "Friend's car: один друг чи кілька?", "Friend's car: un amigo o varios?"), options: ['one', 'several'], correctIndex: 0, thenReturnToExerciseId: 'poss_s_contrast_001' },
      { id: 'guided_poss_s_003', prompt: tri("Friends' car: один друг или несколько?", "Friends' car: один друг чи кілька?", "Friends' car: un amigo o varios?"), options: ['one', 'several'], correctIndex: 1, thenReturnToExerciseId: 'poss_s_contrast_002' },
      { id: 'guided_poss_s_004', prompt: tri("Children уже означает одного или несколько?", "Children уже означає одного чи кілька?", "Children ya significa uno o varios?"), options: ['one', 'several'], correctIndex: 1, thenReturnToExerciseId: 'poss_s_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'noun',
    microDiagnosisId: 'noun_possessive_apostrophe_s',
    diagnosisLabel: tri("Possessive 's"),
    contrastSet: CONTRAST_SET,
    focusWords: ["John's phone", "friend's car", "friends' car", "students' answers", "children's toys", "parents' house"],
    focusPatterns: [
      'singular_owner_name',
      'singular_owner_common',
      'singular_owner_name_bag',
      'friend_one_owner',
      'friends_many_owners',
      'students_many_owners',
      'parents_many_owners',
      'of_phrase_for_thing',
      'possessive_s_vs_is',
      'children_irregular_possessive',
      'men_irregular_possessive',
      'is_contraction_not_possessive',
      'singular_plural_pair',
      'regular_irregular_pair',
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
    start: 'diagnosis_training_noun_possessive_apostrophe_s_start',
    answer: 'diagnosis_training_noun_possessive_apostrophe_s_answer',
    mastery: 'diagnosis_training_noun_possessive_apostrophe_s_mastery',
    recovery: 'diagnosis_training_noun_possessive_apostrophe_s_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'noun',
      microDiagnosisId: 'noun_possessive_apostrophe_s',
      contrastSet: CONTRAST_SET,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logOwnerCount: true,
      logApostrophePosition: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=noun&microDiagnosisId=noun_possessive_apostrophe_s',
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
