import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const INF_GER_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre infinitive/gerund ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về infinitive/gerund này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan infinitive/gerund ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu infinitive/gerund açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie infinitive/gerund nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? INF_GER_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = ['to + base verb', 'verb-ing', 'want to', 'need to', 'decide to', 'enjoy doing', 'finish doing', 'avoid doing'];

const MODEL = tri(
  'В английском первое действие часто управляет вторым. Одна группа просит кусок с to, другая группа просит форму с -ing. Поэтому учим не отдельное слово, а готовую связку.',
  'В англійській перша дія часто керує другою. Одна група просить зворот із to, інша група просить форму з -ing. Тому вчимо не окреме слово, а готову звʼязку.',
  'En ingles, la primera accion suele controlar la segunda. Un grupo pide to, otro grupo pide -ing. Por eso aprendemos la combinacion completa: want to learn, enjoy learning.',
  {
    'pt-BR': 'Em inglês, a primeira ação muitas vezes controla a segunda. Um grupo pede um bloco com to, outro grupo pede a forma com -ing. Por isso, aprendemos a combinação inteira, não uma palavra isolada.',
    vi: 'Trong tiếng Anh, hành động thứ nhất thường quyết định hành động thứ hai. Một nhóm cần cụm với to, nhóm khác cần dạng -ing. Vì vậy, hãy học cả cụm cố định, không học từng từ riêng lẻ.',
    id: 'Dalam bahasa Inggris, tindakan pertama sering mengatur tindakan kedua. Satu kelompok memakai bagian dengan to, kelompok lain memakai bentuk -ing. Jadi, pelajari rangkaian utuhnya, bukan satu kata terpisah.',
    tr: 'İngilizcede ilk eylem çoğu zaman ikinci eylemi yönetir. Bir grup to ile gelen parçayı ister, diğer grup -ing biçimini ister. Bu yüzden tek bir kelimeyi değil, hazır kalıbın tamamını öğreniriz.',
    pl: 'W angielskim pierwsza czynność często steruje drugą. Jedna grupa wymaga fragmentu z to, druga forma z -ing. Dlatego uczymy się całej gotowej konstrukcji, a nie pojedynczego słowa.',
  },
);

const INF_GER_SKILL_ES: Record<string, string> = {
  want_to_learn: 'Want pide to learn.',
  need_to_go: 'Need pide to go.',
  want_to_help: 'Want pide to help.',
  decide_to_start: 'Decide pide to start.',
  plan_to_study: 'Plan pide to study.',
  agree_to_help: 'Agree pide to help.',
  enjoy_learning: 'Enjoy pide learning.',
  finish_working: 'Finish pide working.',
  enjoy_reading: 'Enjoy pide reading.',
  avoid_making: 'Avoid pide making.',
  mind_waiting: 'Mind pide waiting.',
  avoid_being_late: 'Avoid pide being.',
  mixed_want_enjoy_pair: 'Want to learn, pero enjoy learning.',
  mixed_need_finish_pair: 'Need to go, pero finish working.',
  mixed_sentence_correction: 'Want to improve, pero avoid making.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = INF_GER_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? INF_GER_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function infGerEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = INF_GER_SKILL_ES[input.targetSkill] ?? 'La primera accion decide si sigue to o -ing.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(correct: string, clue: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди первое действие. Именно оно подсказывает, будет дальше кусок с to или форма с -ing.',
      'Спочатку знайди першу дію. Саме вона підказує, буде далі зворот із to чи форма з -ing.',
      'Primero encuentra la primera accion.',
    ),
    clue,
    tri(
      'Потом вспоминай не перевод, а тип связки: действие плюс to или действие плюс -ing.',
      'Потім згадуй не переклад, а тип звʼязки: дія плюс to або дія плюс -ing.',
      'Luego recuerda la combinacion: want to learn, enjoy learning.',
    ),
    tri(
      'Здесь нужен вариант, где первая связка идет с to, а вторая с -ing.',
      'Тут потрібен варіант, де перша звʼязка йде з to, а друга з -ing.',
      `La respuesta aqui es: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Первый глагол просит другой готовый кусок. Здесь нужно: ${correct}.`,
    `Майже. Перше дієслово просить інший готовий зворот. Тут потрібно: ${correct}.`,
    `Casi. El primer verbo pide: ${correct}.`,
  );
}

function infGerStep(input: {
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
  const esFeedback = infGerEsFeedback(input);
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
      'Выбери форму второго действия: кусок с to или кусок с -ing.',
      'Обери форму другої дії: зворот із to або зворот із -ing.',
      'Elige la forma de la segunda accion.',
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
      'Коротко: первое действие выбирает форму второго. Одни связки идут через to, другие через -ing. После to не добавляем -ing.',
      'Коротко: перша дія вибирає форму другої. Одні звʼязки йдуть через to, інші через -ing. Після to не додаємо -ing.',
      'Version corta: want to learn, need to go; enjoy learning, avoid making.',
    ),
    focusWords: input.focusWords,
  };
}

export const INFINITIVE_VS_GERUND_BASIC_TRAINING: DiagnosisTraining = {
  id: 'infinitive_vs_gerund_basic',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 33,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('To learn / Learning: готовые связки', 'To learn / Learning: готові звʼязки', 'To learn / Learning: combinaciones fijas', {
    'pt-BR': 'To learn / Learning: combinações prontas',
    vi: 'To learn / Learning: các cụm cố định',
    id: 'To learn / Learning: rangkaian tetap',
    tr: 'To learn / Learning: hazır kalıplar',
    pl: 'To learn / Learning: gotowe konstrukcje',
  }),
  shortTitle: tri('To learn / Learning', 'To learn / Learning', 'To learn / Learning', {
    'pt-BR': 'To learn / Learning',
    vi: 'To learn / Learning',
    id: 'To learn / Learning',
    tr: 'To learn / Learning',
    pl: 'To learn / Learning',
  }),
  shortDiagnosis: tri(
    'Ты угадываешь, сказать to learn или learning, потому что перевод "учить" выглядит одинаково.',
    'Ти вгадуєш, сказати to learn чи learning, бо переклад "вчити" виглядає однаково.',
    'Adivinas entre to learn y learning porque la traduccion parece igual.',
    {
      'pt-BR': 'Você fica tentando adivinhar entre to learn e learning porque a tradução parece igual.',
      vi: 'Bạn đang đoán giữa to learn và learning vì bản dịch trông giống nhau.',
      id: 'Kamu menebak antara to learn dan learning karena terjemahannya terlihat sama.',
      tr: 'Çeviri aynı göründüğü için to learn mı learning mi diye tahmin ediyorsun.',
      pl: 'Zgadujesz, czy powiedzieć to learn czy learning, bo tłumaczenie wygląda podobnie.',
    },
  ),
  diagnosisText: tri(
    'Ошибка появляется, когда ты переводишь второе действие отдельно. По-русски "хочу учить" и "нравится учить" выглядят похожими. В английском это разные готовые связки: I want to learn, но I enjoy learning.',
    'Помилка зʼявляється, коли ти перекладаєш другу дію окремо. Українською "хочу вчити" і "подобається вчити" виглядають схожими. В англійській це різні готові звʼязки: I want to learn, але I enjoy learning.',
    'El error aparece cuando traduces la segunda accion sola, en vez de aprender el patron verbal completo.',
    {
      'pt-BR': 'O erro aparece quando você traduz a segunda ação separadamente. "Quero aprender" e "gosto de aprender" parecem parecidos em português, mas em inglês são combinações diferentes: I want to learn, mas I enjoy learning.',
      vi: 'Lỗi xuất hiện khi bạn dịch hành động thứ hai riêng lẻ. Trong tiếng Việt, "muốn học" và "thích học" trông khá giống nhau. Trong tiếng Anh, chúng là hai cụm khác nhau: I want to learn, nhưng I enjoy learning.',
      id: 'Kesalahan muncul saat kamu menerjemahkan tindakan kedua secara terpisah. "Ingin belajar" dan "suka belajar" terlihat mirip dalam bahasa Indonesia. Dalam bahasa Inggris, keduanya adalah rangkaian berbeda: I want to learn, tetapi I enjoy learning.',
      tr: 'Hata, ikinci eylemi tek başına çevirdiğinde ortaya çıkar. Türkçede "öğrenmek istiyorum" ve "öğrenmeyi seviyorum" benzer görünebilir. İngilizcede bunlar farklı hazır kalıplardır: I want to learn, ama I enjoy learning.',
      pl: 'Błąd pojawia się, gdy tłumaczysz drugą czynność osobno. Po polsku "chcę się uczyć" i "lubię się uczyć" wyglądają podobnie. W angielskim to różne gotowe konstrukcje: I want to learn, ale I enjoy learning.',
    },
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    'Есть две группы связок. После want, need, decide, plan, agree обычно идет to. После enjoy, finish, avoid, mind обычно идет -ing. Проверяй первое действие.',
    'Є дві групи звʼязок. Після want, need, decide, plan, agree зазвичай іде to. Після enjoy, finish, avoid, mind зазвичай іде -ing. Перевіряй першу дію.',
    'Combinaciones: want to learn, need to go, enjoy learning, avoid making.',
    {
      'pt-BR': 'Há dois grupos de combinações. Depois de want, need, decide, plan, agree, geralmente vem to. Depois de enjoy, finish, avoid, mind, geralmente vem -ing. Confira a primeira ação.',
      vi: 'Có hai nhóm cụm. Sau want, need, decide, plan, agree thường dùng to. Sau enjoy, finish, avoid, mind thường dùng -ing. Hãy kiểm tra hành động thứ nhất.',
      id: 'Ada dua kelompok rangkaian. Setelah want, need, decide, plan, agree biasanya memakai to. Setelah enjoy, finish, avoid, mind biasanya memakai -ing. Periksa tindakan pertama.',
      tr: 'İki kalıp grubu vardır. Want, need, decide, plan, agree sonrasında genelde to gelir. Enjoy, finish, avoid, mind sonrasında genelde -ing gelir. İlk eylemi kontrol et.',
      pl: 'Są dwie grupy konstrukcji. Po want, need, decide, plan, agree zwykle pojawia się to. Po enjoy, finish, avoid, mind zwykle pojawia się -ing. Sprawdzaj pierwszą czynność.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'После want обычно идет to: I want to learn.',
      'После need обычно идет to: She needs to go.',
      'После decide обычно идет to: They decided to start.',
      'После plan обычно идет to: We plan to study.',
      'После agree обычно идет to: He agreed to help.',
      'После enjoy обычно идет -ing: I enjoy learning.',
      'После finish обычно идет -ing: He finished working.',
      'После avoid обычно идет -ing: Avoid making mistakes.',
      'После mind обычно идет -ing: Do you mind waiting?',
      'После to не добавляй -ing: to learn, to go, to start. Не to learning.',
    ],
    uk: [
      'Після want зазвичай іде to: I want to learn.',
      'Після need зазвичай іде to: She needs to go.',
      'Після decide зазвичай іде to: They decided to start.',
      'Після plan зазвичай іде to: We plan to study.',
      'Після agree зазвичай іде to: He agreed to help.',
      'Після enjoy зазвичай іде -ing: I enjoy learning.',
      'Після finish зазвичай іде -ing: He finished working.',
      'Після avoid зазвичай іде -ing: Avoid making mistakes.',
      'Після mind зазвичай іде -ing: Do you mind waiting?',
      'Після to не додавай -ing: to learn, to go, to start. Не to learning.',
    ],
    es: [
      'Want normalmente pide to: I want to learn.',
      'Need normalmente pide to: She needs to go.',
      'Decide normalmente pide to: They decided to start.',
      'Plan normalmente pide to: We plan to study.',
      'Agree normalmente pide to: He agreed to help.',
      'Enjoy normalmente pide -ing: I enjoy learning.',
      'Finish normalmente pide -ing: He finished working.',
      'Avoid normalmente pide -ing: Avoid making mistakes.',
      'Mind normalmente pide -ing: Do you mind waiting?',
      'No digas to learning.',
    ],
    'pt-BR': [
      'Depois de want, normalmente vem to: I want to learn.',
      'Depois de need, normalmente vem to: She needs to go.',
      'Depois de decide, normalmente vem to: They decided to start.',
      'Depois de plan, normalmente vem to: We plan to study.',
      'Depois de agree, normalmente vem to: He agreed to help.',
      'Depois de enjoy, normalmente vem -ing: I enjoy learning.',
      'Depois de finish, normalmente vem -ing: He finished working.',
      'Depois de avoid, normalmente vem -ing: Avoid making mistakes.',
      'Depois de mind, normalmente vem -ing: Do you mind waiting?',
      'Não diga to learning.',
    ],
    vi: [
      'Sau want thường dùng to: I want to learn.',
      'Sau need thường dùng to: She needs to go.',
      'Sau decide thường dùng to: They decided to start.',
      'Sau plan thường dùng to: We plan to study.',
      'Sau agree thường dùng to: He agreed to help.',
      'Sau enjoy thường dùng -ing: I enjoy learning.',
      'Sau finish thường dùng -ing: He finished working.',
      'Sau avoid thường dùng -ing: Avoid making mistakes.',
      'Sau mind thường dùng -ing: Do you mind waiting?',
      'Đừng nói to learning.',
    ],
    id: [
      'Setelah want biasanya memakai to: I want to learn.',
      'Setelah need biasanya memakai to: She needs to go.',
      'Setelah decide biasanya memakai to: They decided to start.',
      'Setelah plan biasanya memakai to: We plan to study.',
      'Setelah agree biasanya memakai to: He agreed to help.',
      'Setelah enjoy biasanya memakai -ing: I enjoy learning.',
      'Setelah finish biasanya memakai -ing: He finished working.',
      'Setelah avoid biasanya memakai -ing: Avoid making mistakes.',
      'Setelah mind biasanya memakai -ing: Do you mind waiting?',
      'Jangan ucapkan to learning.',
    ],
    tr: [
      'Want fiilinden sonra genelde to gelir: I want to learn.',
      'Need fiilinden sonra genelde to gelir: She needs to go.',
      'Decide fiilinden sonra genelde to gelir: They decided to start.',
      'Plan fiilinden sonra genelde to gelir: We plan to study.',
      'Agree fiilinden sonra genelde to gelir: He agreed to help.',
      'Enjoy fiilinden sonra genelde -ing gelir: I enjoy learning.',
      'Finish fiilinden sonra genelde -ing gelir: He finished working.',
      'Avoid fiilinden sonra genelde -ing gelir: Avoid making mistakes.',
      'Mind fiilinden sonra genelde -ing gelir: Do you mind waiting?',
      'To learning demeyin.',
    ],
    pl: [
      'Po want zwykle jest to: I want to learn.',
      'Po need zwykle jest to: She needs to go.',
      'Po decide zwykle jest to: They decided to start.',
      'Po plan zwykle jest to: We plan to study.',
      'Po agree zwykle jest to: He agreed to help.',
      'Po enjoy zwykle jest -ing: I enjoy learning.',
      'Po finish zwykle jest -ing: He finished working.',
      'Po avoid zwykle jest -ing: Avoid making mistakes.',
      'Po mind zwykle jest -ing: Do you mind waiting?',
      'Nie używaj to learning.',
    ],
  },
  examples: [
    { en: 'I want to learn English.', ru: 'Я хочу выучить английский.', uk: 'Я хочу вивчити англійську.', es: 'Quiero aprender ingles.', 'pt-BR': 'Quero aprender inglês.', vi: 'Tôi muốn học tiếng Anh.', id: 'Saya ingin belajar bahasa Inggris.', tr: 'İngilizce öğrenmek istiyorum.', pl: 'Chcę nauczyć się angielskiego.', why: tri('Готовая связка: want to learn.', 'Готова звʼязка: want to learn.', 'Combinacion fija: want to learn.') },
    { en: 'She needs to go home.', ru: 'Ей нужно идти домой.', uk: 'Їй потрібно йти додому.', es: 'Ella necesita ir a casa.', 'pt-BR': 'Ela precisa ir para casa.', vi: 'Cô ấy cần về nhà.', id: 'Dia perlu pulang.', tr: 'Eve gitmesi gerekiyor.', pl: 'Ona musi iść do domu.', why: tri('После need идет to go.', 'Після need іде to go.', 'Need pide to go.') },
    { en: 'They decided to start again.', ru: 'Они решили начать снова.', uk: 'Вони вирішили почати знову.', es: 'Decidieron empezar de nuevo.', 'pt-BR': 'Eles decidiram começar de novo.', vi: 'Họ quyết định bắt đầu lại.', id: 'Mereka memutuskan untuk mulai lagi.', tr: 'Tekrar başlamaya karar verdiler.', pl: 'Postanowili zacząć od nowa.', why: tri('После decide идет to start.', 'Після decide іде to start.', 'Decided pide to start.') },
    { en: 'We plan to study tonight.', ru: 'Мы планируем учиться сегодня вечером.', uk: 'Ми плануємо вчитися сьогодні ввечері.', es: 'Planeamos estudiar esta noche.', 'pt-BR': 'Planejamos estudar hoje à noite.', vi: 'Chúng tôi dự định học tối nay.', id: 'Kami berencana belajar malam ini.', tr: 'Bu gece ders çalışmayı planlıyoruz.', pl: 'Planujemy uczyć się dziś wieczorem.', why: tri('После plan идет to study.', 'Після plan іде to study.', 'Plan pide to study.') },
    { en: 'I enjoy learning new words.', ru: 'Мне нравится учить новые слова.', uk: 'Мені подобається вчити нові слова.', es: 'Disfruto aprendiendo palabras nuevas.', 'pt-BR': 'Gosto de aprender palavras novas.', vi: 'Tôi thích học từ mới.', id: 'Saya menikmati belajar kata-kata baru.', tr: 'Yeni kelimeler öğrenmekten keyif alıyorum.', pl: 'Lubię uczyć się nowych słów.', why: tri('После enjoy идет learning.', 'Після enjoy іде learning.', 'Enjoy pide learning.') },
    { en: 'He finished working late.', ru: 'Он закончил работать поздно.', uk: 'Він закінчив працювати пізно.', es: 'Termino de trabajar tarde.', 'pt-BR': 'Ele terminou de trabalhar tarde.', vi: 'Anh ấy kết thúc công việc muộn.', id: 'Dia selesai bekerja larut malam.', tr: 'Çalışmayı geç bitirdi.', pl: 'Skończył pracować późno.', why: tri('После finish идет working.', 'Після finish іде working.', 'Finish pide working.') },
    { en: 'Avoid making the same mistake.', ru: 'Избегай делать ту же ошибку.', uk: 'Уникай робити ту саму помилку.', es: 'Evita cometer el mismo error.', 'pt-BR': 'Evite cometer o mesmo erro.', vi: 'Hãy tránh mắc cùng một lỗi.', id: 'Hindari membuat kesalahan yang sama.', tr: 'Aynı hatayı yapmaktan kaçın.', pl: 'Unikaj popełniania tego samego błędu.', why: tri('После avoid идет making.', 'Після avoid іде making.', 'Avoid pide making.') },
    { en: 'Do you mind waiting here?', ru: 'Ты не против подождать здесь?', uk: 'Ти не проти почекати тут?', es: 'Te importa esperar aqui?', 'pt-BR': 'Você se importa de esperar aqui?', vi: 'Bạn có phiền chờ ở đây không?', id: 'Apakah kamu keberatan menunggu di sini?', tr: 'Burada beklemek senin için sorun olur mu?', pl: 'Czy masz coś przeciwko poczekaniu tutaj?', why: tri('После mind идет waiting.', 'Після mind іде waiting.', 'Mind pide waiting.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты выбираешь между to learn и learning на слух. Здесь лучше не гадать, а помнить связку целиком: want to learn, enjoy learning.',
        'Схоже, ти вибираєш між to learn і learning на слух. Тут краще не вгадувати, а памʼятати звʼязку цілком: want to learn, enjoy learning.',
        'Estas adivinando entre to learn y learning.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Есть две полки. На первой живут связки с to. На второй живут связки с -ing. Важно не переводить второе действие отдельно.',
        'Є дві полиці. На першій живуть звʼязки з to. На другій живуть звʼязки з -ing. Важливо не перекладати другу дію окремо.',
        'Dos grupos: want to / need to; enjoy learning / avoid making.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Две частые поломки: I want learning и I enjoy to learn. Нормально: I want to learn и I enjoy learning.',
        'Дві часті поломки: I want learning і I enjoy to learn. Нормально: I want to learn і I enjoy learning.',
        'Errores comunes: I want learning y I enjoy to learn.',
      ),
    },
  ],
  steps: [
    infGerStep({
      id: 'inf_ger_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'want_to_learn',
      sentence: 'I want ___ English.',
      translation: tri('Я хочу выучить английский.', 'Я хочу вивчити англійську.', 'I want to learn English.'),
      options: ['to learn', 'learning', 'learn', 'to learning'],
      correctAnswer: 'to learn',
      correctFeedback: tri('Да. Готовая связка: want to learn.', 'Так. Готова звʼязка: want to learn.', 'Yes. Chunk: want to learn.'),
      wrong: {
        learning: tri('Want learning здесь не работает. После want нужен кусок want to learn.', 'Want learning тут не працює. Після want потрібен зворот want to learn.', 'Use want to learn.'),
        learn: tri('После want не хватает to. Нормально: want to learn.', 'Після want бракує to. Нормально: want to learn.', 'Use want to learn.'),
        'to learning': tri('To learning ломает связку. Нормально: to learn.', 'To learning ламає звʼязку. Нормально: to learn.', 'Use to learn.'),
      },
      clue: tri('Want тянет to learn.', 'Want тягне to learn.', 'Want takes to learn.'),
      focusWords: ['want', 'to learn'],
    }),
    infGerStep({
      id: 'inf_ger_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'need_to_go',
      sentence: 'She needs ___ home.',
      translation: tri('Ей нужно идти домой.', 'Їй потрібно йти додому.', 'She needs to go home.'),
      options: ['to go', 'going', 'go', 'to going'],
      correctAnswer: 'to go',
      correctFeedback: tri('Да. Готовая связка: needs to go.', 'Так. Готова звʼязка: needs to go.', 'Yes. Needs to go.'),
      wrong: {
        going: tri('Needs going здесь не работает. Нормально: needs to go.', 'Needs going тут не працює. Нормально: needs to go.', 'Use needs to go.'),
        go: tri('После needs не хватает to. Нормально: needs to go.', 'Після needs бракує to. Нормально: needs to go.', 'Use needs to go.'),
        'to going': tri('To going ломает связку. Нормально: to go.', 'To going ламає звʼязку. Нормально: to go.', 'Use to go.'),
      },
      clue: tri('Need тянет to go.', 'Need тягне to go.', 'Need takes to go.'),
      focusWords: ['need', 'to go'],
    }),
    infGerStep({
      id: 'inf_ger_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'want_to_help',
      sentence: 'They want ___ us.',
      translation: tri('Они хотят помочь нам.', 'Вони хочуть допомогти нам.', 'They want to help us.'),
      options: ['to help', 'helping', 'help', 'to helping'],
      correctAnswer: 'to help',
      correctFeedback: tri('Да. После want нужен кусок to help.', 'Так. Після want потрібен зворот to help.', 'Yes. Want to help.'),
      wrong: {
        helping: tri('Want helping здесь не работает. Нужно want to help.', 'Want helping тут не працює. Потрібно want to help.', 'Use want to help.'),
        help: tri('После want не хватает to: want to help.', 'Після want бракує to: want to help.', 'Use want to help.'),
        'to helping': tri('To helping неправильно. Нормально: to help.', 'To helping неправильно. Нормально: to help.', 'Use to help.'),
      },
      clue: tri('Want тянет to help.', 'Want тягне to help.', 'Want takes to help.'),
      focusWords: ['want', 'to help'],
    }),
    infGerStep({
      id: 'inf_ger_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'decide_to_start',
      sentence: 'They decided ___ again.',
      translation: tri('Они решили начать снова.', 'Вони вирішили почати знову.', 'They decided to start again.'),
      options: ['to start', 'starting', 'start', 'to starting'],
      correctAnswer: 'to start',
      correctFeedback: tri('Да. После decided нужен кусок to start.', 'Так. Після decided потрібен зворот to start.', 'Yes. Decided to start.'),
      wrong: {
        starting: tri('Decided starting звучит сломанно. Нужно decided to start.', 'Decided starting звучить зламано. Потрібно decided to start.', 'Use decided to start.'),
        start: tri('После decided не хватает to: decided to start.', 'Після decided бракує to: decided to start.', 'Use decided to start.'),
        'to starting': tri('To starting неправильно. Нормально: to start.', 'To starting неправильно. Нормально: to start.', 'Use to start.'),
      },
      clue: tri('Decide тянет to start.', 'Decide тягне to start.', 'Decide takes to start.'),
      focusWords: ['decide', 'to start'],
    }),
    infGerStep({
      id: 'inf_ger_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'plan_to_study',
      sentence: 'We plan ___ tonight.',
      translation: tri('Мы планируем учиться сегодня вечером.', 'Ми плануємо вчитися сьогодні ввечері.', 'We plan to study tonight.'),
      options: ['to study', 'studying', 'study', 'to studying'],
      correctAnswer: 'to study',
      correctFeedback: tri('Да. После plan нужен кусок to study.', 'Так. Після plan потрібен зворот to study.', 'Yes. Plan to study.'),
      wrong: {
        studying: tri('Plan studying здесь не работает. Нужно plan to study.', 'Plan studying тут не працює. Потрібно plan to study.', 'Use plan to study.'),
        study: tri('После plan не хватает to: plan to study.', 'Після plan бракує to: plan to study.', 'Use plan to study.'),
        'to studying': tri('To studying неправильно. Нормально: to study.', 'To studying неправильно. Нормально: to study.', 'Use to study.'),
      },
      clue: tri('Plan тянет to study.', 'Plan тягне to study.', 'Plan takes to study.'),
      focusWords: ['plan', 'to study'],
    }),
    infGerStep({
      id: 'inf_ger_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'agree_to_help',
      sentence: 'He agreed ___ me.',
      translation: tri('Он согласился помочь мне.', 'Він погодився допомогти мені.', 'He agreed to help me.'),
      options: ['to help', 'helping', 'help', 'to helping'],
      correctAnswer: 'to help',
      correctFeedback: tri('Да. После agreed нужен кусок to help.', 'Так. Після agreed потрібен зворот to help.', 'Yes. Agreed to help.'),
      wrong: {
        helping: tri('Agreed helping неправильно. Нужно agreed to help.', 'Agreed helping неправильно. Потрібно agreed to help.', 'Use agreed to help.'),
        help: tri('После agreed не хватает to: agreed to help.', 'Після agreed бракує to: agreed to help.', 'Use agreed to help.'),
        'to helping': tri('To helping неправильно. Нормально: to help.', 'To helping неправильно. Нормально: to help.', 'Use to help.'),
      },
      clue: tri('Agree тянет to help.', 'Agree тягне to help.', 'Agree takes to help.'),
      focusWords: ['agree', 'to help'],
    }),
    infGerStep({
      id: 'inf_ger_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'enjoy_learning',
      sentence: 'I enjoy ___ new words.',
      translation: tri('Мне нравится учить новые слова.', 'Мені подобається вчити нові слова.', 'I enjoy learning new words.'),
      options: ['to learn', 'learning', 'learn', 'to learning'],
      correctAnswer: 'learning',
      correctFeedback: tri('Да. После enjoy нужен кусок learning: enjoy learning.', 'Так. Після enjoy потрібен зворот learning: enjoy learning.', 'Yes. Enjoy learning.'),
      wrong: {
        'to learn': tri('Enjoy to learn здесь не работает. После enjoy нужен learning.', 'Enjoy to learn тут не працює. Після enjoy потрібен learning.', 'Use learning.'),
        learn: tri('Enjoy learn звучит сломанно. Нужно enjoy learning.', 'Enjoy learn звучить зламано. Потрібно enjoy learning.', 'Use enjoy learning.'),
        'to learning': tri('To learning неправильно. После enjoy нужен learning.', 'To learning неправильно. Після enjoy потрібен learning.', 'Use learning.'),
      },
      clue: tri('Enjoy тянет learning.', 'Enjoy тягне learning.', 'Enjoy takes learning.'),
      focusWords: ['enjoy', 'learning'],
    }),
    infGerStep({
      id: 'inf_ger_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'finish_working',
      sentence: 'He finished ___ late.',
      translation: tri('Он закончил работать поздно.', 'Він закінчив працювати пізно.', 'He finished working late.'),
      options: ['to work', 'working', 'work', 'to working'],
      correctAnswer: 'working',
      correctFeedback: tri('Да. После finish нужен working: finished working.', 'Так. Після finish потрібен working: finished working.', 'Yes. Finished working.'),
      wrong: {
        'to work': tri('Finished to work здесь неправильно. После finish нужен verb-ing: working.', 'Finished to work тут неправильно. Після finish потрібен verb-ing: working.', 'Use working.'),
        work: tri('Finished work может значить "закончил работу". Но "закончил работать" = finished working.', 'Finished work може означати "закінчив роботу". Але "закінчив працювати" = finished working.', 'Use finished working.'),
        'to working': tri('To working неправильно. После finish нужен working.', 'To working неправильно. Після finish потрібен working.', 'Use working.'),
      },
      clue: tri('Finish тянет working.', 'Finish тягне working.', 'Finish takes working.'),
      focusWords: ['finish', 'working'],
    }),
    infGerStep({
      id: 'inf_ger_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'enjoy_reading',
      sentence: 'She enjoys ___ books.',
      translation: tri('Ей нравится читать книги.', 'Їй подобається читати книжки.', 'She enjoys reading books.'),
      options: ['to read', 'reading', 'read', 'to reading'],
      correctAnswer: 'reading',
      correctFeedback: tri('Да. После enjoys нужен reading.', 'Так. Після enjoys потрібен reading.', 'Yes. Enjoys reading.'),
      wrong: {
        'to read': tri('Enjoys to read здесь не работает. Нужно enjoys reading.', 'Enjoys to read тут не працює. Потрібно enjoys reading.', 'Use enjoys reading.'),
        read: tri('Enjoys read звучит сломанно. Нужно enjoys reading.', 'Enjoys read звучить зламано. Потрібно enjoys reading.', 'Use enjoys reading.'),
        'to reading': tri('To reading неправильно. Нужно enjoys reading.', 'To reading неправильно. Потрібно enjoys reading.', 'Use enjoys reading.'),
      },
      clue: tri('Enjoy тянет reading.', 'Enjoy тягне reading.', 'Enjoy takes reading.'),
      focusWords: ['enjoys', 'reading'],
    }),
    infGerStep({
      id: 'inf_ger_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'avoid_making',
      sentence: 'Avoid ___ the same mistake.',
      translation: tri('Избегай делать ту же ошибку.', 'Уникай робити ту саму помилку.', 'Avoid making the same mistake.'),
      options: ['to make', 'making', 'make', 'to making'],
      correctAnswer: 'making',
      correctFeedback: tri('Да. После avoid нужен making: avoid making.', 'Так. Після avoid потрібен making: avoid making.', 'Yes. Avoid making.'),
      wrong: {
        'to make': tri('Avoid to make неправильно. Нужно avoid making.', 'Avoid to make неправильно. Потрібно avoid making.', 'Use avoid making.'),
        make: tri('Avoid make звучит сломанно. Нужно avoid making.', 'Avoid make звучить зламано. Потрібно avoid making.', 'Use avoid making.'),
        'to making': tri('To making неправильно. Нужно avoid making.', 'To making неправильно. Потрібно avoid making.', 'Use avoid making.'),
      },
      clue: tri('Avoid тянет making.', 'Avoid тягне making.', 'Avoid takes making.'),
      focusWords: ['avoid', 'making'],
    }),
    infGerStep({
      id: 'inf_ger_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'mind_waiting',
      sentence: 'Do you mind ___ here?',
      translation: tri('Ты не против подождать здесь?', 'Ти не проти почекати тут?', 'Do you mind waiting here?'),
      options: ['to wait', 'waiting', 'wait', 'to waiting'],
      correctAnswer: 'waiting',
      correctFeedback: tri('Да. После mind нужен waiting: Do you mind waiting?', 'Так. Після mind потрібен waiting: Do you mind waiting?', 'Yes. Mind waiting.'),
      wrong: {
        'to wait': tri('Mind to wait неправильно. Нужно mind waiting.', 'Mind to wait неправильно. Потрібно mind waiting.', 'Use mind waiting.'),
        wait: tri('Mind wait звучит сломанно. Нужно mind waiting.', 'Mind wait звучить зламано. Потрібно mind waiting.', 'Use mind waiting.'),
        'to waiting': tri('To waiting неправильно. Нужно mind waiting.', 'To waiting неправильно. Потрібно mind waiting.', 'Use mind waiting.'),
      },
      clue: tri('Mind тянет waiting.', 'Mind тягне waiting.', 'Mind takes waiting.'),
      focusWords: ['mind', 'waiting'],
    }),
    infGerStep({
      id: 'inf_ger_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'avoid_being_late',
      sentence: 'Try to avoid ___ late.',
      translation: tri('Постарайся не опаздывать.', 'Постарайся не запізнюватися.', 'Try to avoid being late.'),
      options: ['to be', 'being', 'be', 'to being'],
      correctAnswer: 'being',
      correctFeedback: tri('Да. После avoid нужен being: avoid being late.', 'Так. Після avoid потрібен being: avoid being late.', 'Yes. Avoid being late.'),
      wrong: {
        'to be': tri('Avoid to be late неправильно. Нужно avoid being late.', 'Avoid to be late неправильно. Потрібно avoid being late.', 'Use avoid being late.'),
        be: tri('Avoid be late звучит сломанно. Нужно avoid being late.', 'Avoid be late звучить зламано. Потрібно avoid being late.', 'Use avoid being late.'),
        'to being': tri('To being неправильно. Нужно avoid being late.', 'To being неправильно. Потрібно avoid being late.', 'Use avoid being late.'),
      },
      clue: tri('Avoid тянет being.', 'Avoid тягне being.', 'Avoid takes being.'),
      focusWords: ['avoid', 'being late'],
    }),
    infGerStep({
      id: 'inf_ger_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_want_enjoy_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'),
      options: [
        'I want to learn / I enjoy learning',
        'I want learning / I enjoy to learn',
        'I want to learning / I enjoy learn',
        'I want learn / I enjoy to learning',
      ],
      correctAnswer: 'I want to learn / I enjoy learning',
      correctFeedback: tri('Да. Want to learn, но enjoy learning.', 'Так. Want to learn, але enjoy learning.', 'Yes. Want to learn / enjoy learning.'),
      wrong: {
        'I want learning / I enjoy to learn': tri('Связки перепутаны. Нужно want to learn, но enjoy learning.', 'Звʼязки переплутані. Потрібно want to learn, але enjoy learning.', 'Use want to learn / enjoy learning.'),
        'I want to learning / I enjoy learn': tri('To learning неправильно, и enjoy learn тоже. Нормально: want to learn / enjoy learning.', 'To learning неправильно, і enjoy learn теж. Нормально: want to learn / enjoy learning.', 'Use want to learn / enjoy learning.'),
        'I want learn / I enjoy to learning': tri('После want не хватает to. После enjoy не нужен to learning. Нужно want to learn / enjoy learning.', 'Після want бракує to. Після enjoy не потрібен to learning. Потрібно want to learn / enjoy learning.', 'Use want to learn / enjoy learning.'),
      },
      clue: tri('Want to learn. Enjoy learning.', 'Want to learn. Enjoy learning.', 'Want to learn. Enjoy learning.'),
      focusWords: ['want to learn', 'enjoy learning'],
    }),
    infGerStep({
      id: 'inf_ger_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_need_finish_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.'),
      options: [
        'She needs to go / She finished working',
        'She needs going / She finished to work',
        'She needs to going / She finished work',
        'She needs go / She finished to working',
      ],
      correctAnswer: 'She needs to go / She finished working',
      correctFeedback: tri('Да. Needs to go, но finished working.', 'Так. Needs to go, але finished working.', 'Yes. Needs to go / finished working.'),
      wrong: {
        'She needs going / She finished to work': tri('Обе связки сломаны. Нужно needs to go / finished working.', 'Обидві звʼязки зламані. Потрібно needs to go / finished working.', 'Use needs to go / finished working.'),
        'She needs to going / She finished work': tri('Needs to going неправильно. Finished work может быть про "работу", но "закончила работать" = finished working.', 'Needs to going неправильно. Finished work може бути про "роботу", але "закінчила працювати" = finished working.', 'Use needs to go / finished working.'),
        'She needs go / She finished to working': tri('После needs не хватает to. Finished to working неправильно. Нужно needs to go / finished working.', 'Після needs бракує to. Finished to working неправильно. Потрібно needs to go / finished working.', 'Use needs to go / finished working.'),
      },
      clue: tri('Need to go. Finish working.', 'Need to go. Finish working.', 'Need to go. Finish working.'),
      focusWords: ['needs to go', 'finished working'],
    }),
    infGerStep({
      id: 'inf_ger_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.'),
      options: [
        'I want to improve, but I avoid making the same mistakes.',
        'I want improving, but I avoid to make the same mistakes.',
        'I want to improving, but I avoid make the same mistakes.',
        'I want improve, but I avoid to making the same mistakes.',
      ],
      correctAnswer: 'I want to improve, but I avoid making the same mistakes.',
      correctFeedback: tri('Да. Want to improve, но avoid making.', 'Так. Want to improve, але avoid making.', 'Yes. Want to improve / avoid making.'),
      wrong: {
        'I want improving, but I avoid to make the same mistakes.': tri('Первая связка просит to, а вторая просит -ing. Нормально: want to improve / avoid making.', 'Перша звʼязка просить to, а друга просить -ing. У цьому варіанті обидві частини переплутані.', 'Use want to improve / avoid making.'),
        'I want to improving, but I avoid make the same mistakes.': tri('To improving неправильно. После avoid нужен making. Нормально: want to improve / avoid making.', 'To improving неправильно. Після avoid потрібен making. Нормально: want to improve / avoid making.', 'Use want to improve / avoid making.'),
        'I want improve, but I avoid to making the same mistakes.': tri('После want не хватает to. Avoid to making неправильно. Нужно want to improve / avoid making.', 'Після want бракує to. Avoid to making неправильно. Потрібно want to improve / avoid making.', 'Use want to improve / avoid making.'),
      },
      clue: tri('Want to improve. Avoid making.', 'Want to improve. Avoid making.', 'Want to improve. Avoid making.'),
      focusWords: ['want to improve', 'avoid making'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'want_learning_error',
      'need_going_error',
      'decide_starting_error',
      'plan_studying_error',
      'enjoy_to_error',
      'finish_to_error',
      'avoid_to_error',
      'mind_to_error',
      'to_plus_ing_error',
      'pattern_confusion',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем первое слово-действие и связку, которую оно просит.', 'Показуємо перше слово-дію і звʼязку, яку воно просить.', 'Mostramos la primera accion y la combinacion que pide.'),
    depth2: tri('Делим связки на две группы: want to / need to и enjoy learning / avoid making.', 'Ділимо звʼязки на дві групи: want to / need to і enjoy learning / avoid making.', 'Dividimos las combinaciones en dos grupos.'),
    depth3: tri('Показываем готовые пары: want to learn / enjoy learning.', 'Показуємо готові пари: want to learn / enjoy learning.', 'Mostramos pares listos.'),
    depth4: tri('Даем почти готовый ответ и возвращаем в упражнение.', 'Даємо майже готову відповідь і повертаємо у вправу.', 'Damos casi la respuesta y repetimos.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Не переводи второе действие отдельно. Вспомни связку: want to learn, need to go, decide to start, enjoy learning, finish working, avoid making.',
        'Зупинись. Не перекладай другу дію окремо. Згадай звʼязку: want to learn, need to go, decide to start, enjoy learning, finish working, avoid making.',
        'Alto. Recuerda el patron verbal completo.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_governing_verb_hint_then_retry',
      card: tri(
        'Подсказка: система покажет первое слово-действие и нужную группу, но ответ ты выберешь сам.',
        'Підказка: система покаже перше слово-дію і потрібну групу, але відповідь ти обереш сам.',
        'Pista: mostrar la primera accion y el grupo.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери первое слово, потом реши: оно тянет to или -ing.',
        'Режим підказки: спочатку обери перше слово, потім виріши: воно тягне to чи -ing.',
        'Modo guiado: primera accion, luego to o -ing.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_inf_ger_001', prompt: tri('Want обычно тянет to или -ing?', 'Want зазвичай тягне to чи -ing?', 'Want normalmente pide to o -ing?'), options: ['to', '-ing'], correctIndex: 0, thenReturnToExerciseId: 'inf_ger_easy_001' },
      { id: 'guided_inf_ger_002', prompt: tri('Enjoy обычно тянет to или -ing?', 'Enjoy зазвичай тягне to чи -ing?', 'Enjoy normalmente pide to o -ing?'), options: ['to', '-ing'], correctIndex: 1, thenReturnToExerciseId: 'inf_ger_contrast_004' },
      { id: 'guided_inf_ger_003', prompt: tri('Нормально: to learn или to learning?', 'Нормально: to learn чи to learning?', 'Correcto: to learn o to learning?'), options: ['to learn', 'to learning'], correctIndex: 0, thenReturnToExerciseId: 'inf_ger_easy_001' },
      { id: 'guided_inf_ger_004', prompt: tri('Avoid обычно тянет make или making?', 'Avoid зазвичай тягне make чи making?', 'Avoid normalmente pide make o making?'), options: ['make', 'making'], correctIndex: 1, thenReturnToExerciseId: 'inf_ger_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'infinitive_vs_gerund_basic',
    diagnosisLabel: tri('To learn / Learning', 'To learn / Learning', 'To learn / Learning'),
    contrastSet: CONTRAST,
    focusWords: ['want to', 'need to', 'decide to', 'plan to', 'enjoy -ing', 'finish -ing', 'avoid -ing'],
    focusPatterns: [
      'want_to_learn',
      'need_to_go',
      'want_to_help',
      'decide_to_start',
      'plan_to_study',
      'agree_to_help',
      'enjoy_learning',
      'finish_working',
      'enjoy_reading',
      'avoid_making',
      'mind_waiting',
      'avoid_being_late',
      'mixed_want_enjoy_pair',
      'mixed_need_finish_pair',
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
    start: 'diagnosis_training_infinitive_vs_gerund_basic_start',
    answer: 'diagnosis_training_infinitive_vs_gerund_basic_answer',
    mastery: 'diagnosis_training_infinitive_vs_gerund_basic_mastery',
    recovery: 'diagnosis_training_infinitive_vs_gerund_basic_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'infinitive_vs_gerund_basic',
      contrastSet: CONTRAST,
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logGoverningVerb: true,
      logRequiredVerbPattern: true,
      logChosenVerbForm: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=infinitive_vs_gerund_basic',
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
