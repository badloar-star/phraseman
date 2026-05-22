// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const REPORTED_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre reported speech ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về reported speech này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan reported speech ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu reported speech açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie reported speech nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? REPORTED_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'said that',
  'told someone that',
  'asked if',
  'asked what',
  'pronoun shift',
  'tense backshift',
  'reported question',
  'direct speech',
];

const SMART_CONTRAST = [
  'said that',
  'told someone that',
  'asked if',
  'asked what',
  'pronoun shift',
  'tense backshift',
  'reported question',
];

const option = (text: string) => ({ id: text, text });

const REPORTED_SKILL_ES: Record<string, string> = {
  said_he_was_tired: 'I cambia a he y am pasa a was.',
  said_she_was_busy: 'I cambia a she y am pasa a was.',
  will_to_would: 'Will normalmente pasa a would en este entrenamiento.',
  told_me_object: 'Told necesita una persona: told me.',
  said_not_said_me: 'Said puede ir sin persona; said me no funciona.',
  can_to_could: 'Can normalmente pasa a could en reported speech basico.',
  asked_if_busy: 'Pregunta si/no: asked if + orden normal.',
  asked_if_could_help: 'Can you help? pasa a if I could help.',
  asked_if_finished: 'Pregunta si/no: usa if y orden normal.',
  asked_where_i_lived: 'Where se queda, pero el orden es where I lived.',
  asked_what_i_wanted: 'What se queda; do desaparece y el orden es I wanted.',
  asked_when_i_would_arrive: 'Will pasa a would y el orden es I would arrive.',
  mixed_statement_question_pair: 'Declaracion = said that; pregunta si/no = asked if.',
  mixed_wh_questions: 'Where/what se quedan, pero el orden vuelve a ser normal.',
  mixed_sentence_correction: 'Cambia can a could, will a would y quita el orden de pregunta.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = REPORTED_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? REPORTED_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function reportedEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = REPORTED_SKILL_ES[input.targetSkill] ?? 'Convierte la cita en una frase normal de reported speech.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(depth2: TriText, depth3: TriText, depth4: TriText): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала реши: это утверждение, вопрос да/нет или вопрос с where/what/when. Потом меняй I/he/she, время и порядок слов.',
      'Спочатку виріши: це твердження, питання так/ні чи питання з where/what/when. Потім міняй I/he/she, час і порядок слів.',
      'Primero decide: declaracion, pregunta si/no o pregunta con where/what/when. Luego cambia I/he/she, tiempo y orden de palabras.',
    ),
    tri(
      'Теперь убери форму прямой цитаты: в пересказе вопрос становится обычной фразой.',
      'Тепер прибери форму прямої цитати: у переказi питання стає звичайною фразою.',
      depth2.es,
    ),
    tri(
      'Проверь сдвиг смысла: кто говорил, о ком говорил, и не надо ли сдвинуть время на шаг назад.',
      'Перевiр зсув сенсу: хто говорив, про кого говорив, i чи не треба зсунути час на крок назад.',
      depth3.es,
    ),
    tri(
      'В конце выбери тип пересказа: утверждение, вопрос да/нет или вопрос со словом где/что/когда.',
      'Наприкiнцi обери тип переказу: твердження, питання так/нi або питання зi словом де/що/коли.',
      depth4.es,
    ),
  ];
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
  wrong: Record<string, TriText>;
  retryFeedback: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  const esFeedback = reportedEsFeedback(input);
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: withEs(input.translation, esFeedback),
    explanationBlock: tri(
      'Пересказ не копирует цитату дословно. В нем меняются I/he/she, время часто уходит на шаг назад, а вопрос становится обычной фразой.',
      'Переказ не копіює цитату дослівно. У ньому змінюються I/he/she, час часто йде на крок назад, а питання стає звичайною фразою.',
      'Reported speech no copia la cita literalmente. I/he/she puede cambiar, el tiempo suele retroceder un paso y las preguntas usan orden normal.',
    ),
    microTask: tri(
      'Выбери форму пересказа: кто сказал, кому сказал, что изменилось и какой порядок слов нужен.',
      'Вибери форму переказу: хто сказав, кому сказав, що змінилося і який порядок слів потрібен.',
      'Elige la forma de reported speech: quien lo dijo, quien lo escucho, que cambio y que orden de palabras hace falta.',
    ),
    sentence: input.sentence,
    answerOptions: input.options.map(option),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((item) => item === input.correctAnswer),
    correctFeedback: withEs(input.correctFeedback, esFeedback),
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((item) => item !== input.correctAnswer)
        .map((item) => [item, withEs(input.wrong[item] ?? tri(`Нужно "${input.correctAnswer}": это нормальный пересказ без порядка слов из цитаты.`, `Потрібно "${input.correctAnswer}": це нормальний переказ без порядку слів із цитати.`, `Necesitamos "${input.correctAnswer}": reported speech normal, no el orden de la cita.`), esFeedback)]),
    ),
    retryFeedback: retry(...input.retryFeedback).map((item) => withEs(item, esFeedback)) as [TriText, TriText, TriText, TriText],
    fallbackExplanation: tri(
      'Утверждение: said that + обычный порядок. Вопрос да/нет: asked if + обычный порядок. Вопрос с where/what/when: asked where/what/when + обычный порядок. Told требует, кому сказали: told me.',
      'Твердження: said that + звичайний порядок. Питання так/ні: asked if + звичайний порядок. Питання з where/what/when: asked where/what/when + звичайний порядок. Told вимагає, кому сказали: told me.',
      'Declaracion: said that + orden normal. Pregunta si/no: asked if + orden normal. Pregunta con where/what/when: asked where/what/when + orden normal. Told necesita alguien: told me.',
    ),
    focusWords: input.focusWords,
  };
}

export const REPORTED_SPEECH_BASIC_TRAINING: DiagnosisTraining = {
  id: 'reported_speech_basic',
  category: 'syntax',
  version: '1.0.0',
  status: 'active',
  priority: 53,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('He said that...: нормальный пересказ', 'He said that...: нормальний переказ', 'He said that...: reported speech', {
    'pt-BR': 'He said that...: reported speech',
    vi: 'He said that...: reported speech',
    id: 'He said that...: reported speech',
    tr: 'He said that...: reported speech',
    pl: 'He said that...: reported speech',
  }),
  shortTitle: tri('He said that...', 'He said that...', 'He said that...', {
    'pt-BR': 'He said that...',
    vi: 'He said that...',
    id: 'He said that...',
    tr: 'He said that...',
    pl: 'He said that...',
  }),
  shortDiagnosis: tri(
    'Ты оставляешь слова как в цитате: I am, where did I live, told that. В пересказе это ломает фразу.',
    'Ти залишаєш слова як у цитаті: I am, where did I live, told that. У переказі це ламає фразу.',
    'Mantienes la forma de la cita: I am, where did I live, told that. En reported speech eso rompe la frase.',
    {
      'pt-BR': 'Você deixa as palavras como na citação: I am, where did I live, told that. Em reported speech, isso quebra a frase.',
      vi: 'Bạn giữ nguyên dạng của lời trích dẫn: I am, where did I live, told that. Trong reported speech, như vậy câu sẽ sai.',
      id: 'Kamu membiarkan kata-kata seperti dalam kutipan: I am, where did I live, told that. Dalam reported speech, ini merusak kalimat.',
      tr: 'Kelimeleri alıntıdaki gibi bırakıyorsun: I am, where did I live, told that. Reported speech içinde bu cümleyi bozar.',
      pl: 'Zostawiasz słowa tak jak w cytacie: I am, where did I live, told that. W reported speech to psuje zdanie.',
    },
  ),
  diagnosisText: tri(
    'Ты смешиваешь прямую цитату и пересказ: не меняешь I/he/she, оставляешь вопросительный порядок после asked или забываешь, что told требует человека.',
    'Ти змішуєш пряму цитату і переказ: не міняєш I/he/she, залишаєш питальний порядок після asked або забуваєш, що told вимагає людину.',
    'Mezclas cita directa y reported speech: no cambias I/he/she, mantienes el orden de pregunta despues de asked o olvidas que told necesita una persona.',
    {
      'pt-BR': 'Você mistura citação direta e reported speech: não muda I/he/she, mantém a ordem de pergunta depois de asked ou esquece que told precisa de uma pessoa.',
      vi: 'Bạn đang trộn lời trích trực tiếp với reported speech: không đổi I/he/she, giữ trật tự câu hỏi sau asked, hoặc quên rằng told cần một người nhận lời nói.',
      id: 'Kamu mencampur kutipan langsung dan reported speech: tidak mengubah I/he/she, mempertahankan urutan pertanyaan setelah asked, atau lupa bahwa told membutuhkan orang.',
      tr: 'Doğrudan alıntı ile reported speech yapısını karıştırıyorsun: I/he/she değişmiyor, asked sonrasında soru sırası kalıyor ya da told fiilinin kişi istediği unutuluyor.',
      pl: 'Mieszasz cytat bezpośredni z reported speech: nie zmieniasz I/he/she, zostawiasz szyk pytania po asked albo zapominasz, że told wymaga osoby.',
    },
  ),
  mentalModel: tri(
    'Цитата - это запись дословно: He said, "I am tired." Пересказ - это нормальная новая фраза: He said that he was tired.',
    'Цитата - це дослівний запис: He said, "I am tired." Переказ - це нормальна нова фраза: He said that he was tired.',
    'Una cita repite las palabras exactas: He said, "I am tired." Reported speech crea una frase normal nueva: He said that he was tired.',
    {
      'pt-BR': 'Uma citação repete as palavras exatas: He said, "I am tired." Reported speech cria uma nova frase normal: He said that he was tired.',
      vi: 'Lời trích dẫn lặp lại đúng nguyên văn: He said, "I am tired." Reported speech tạo một câu mới bình thường: He said that he was tired.',
      id: 'Kutipan mengulang kata-kata persis: He said, "I am tired." Reported speech membuat kalimat baru yang normal: He said that he was tired.',
      tr: 'Alıntı, sözleri birebir tekrar eder: He said, "I am tired." Reported speech ise normal yeni bir cümle kurar: He said that he was tired.',
      pl: 'Cytat powtarza dokładne słowa: He said, "I am tired." Reported speech tworzy nowe normalne zdanie: He said that he was tired.',
    },
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Утверждение: He said that he was tired. Told требует человека: He told me that he was tired. Вопрос да/нет: He asked if I was busy. Where-вопрос: He asked where I lived.',
    'Твердження: He said that he was tired. Told вимагає людину: He told me that he was tired. Питання так/ні: He asked if I was busy. Where-питання: He asked where I lived.',
    'Declaracion: He said that he was tired. Told necesita alguien: He told me that he was tired. Pregunta si/no: He asked if I was busy. Pregunta con where: He asked where I lived.',
    {
      'pt-BR': 'Declaração: He said that he was tired. Told precisa de uma pessoa: He told me that he was tired. Pergunta sim/não: He asked if I was busy. Pergunta com where: He asked where I lived.',
      vi: 'Câu tường thuật: He said that he was tired. Told cần một người nhận lời nói: He told me that he was tired. Câu hỏi yes/no: He asked if I was busy. Câu hỏi với where: He asked where I lived.',
      id: 'Pernyataan: He said that he was tired. Told membutuhkan orang: He told me that he was tired. Pertanyaan ya/tidak: He asked if I was busy. Pertanyaan dengan where: He asked where I lived.',
      tr: 'Düz cümle: He said that he was tired. Told bir kişi ister: He told me that he was tired. Evet/hayır sorusu: He asked if I was busy. Where sorusu: He asked where I lived.',
      pl: 'Zdanie oznajmujące: He said that he was tired. Told wymaga osoby: He told me that he was tired. Pytanie tak/nie: He asked if I was busy. Pytanie z where: He asked where I lived.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Пересказ передает смысл, а не копирует цитату.',
      'После said часто ставим that: He said that he was tired.',
      'Told требует человека: He told me that he was tired.',
      'I меняется по смыслу: I -> he/she, my -> his/her.',
      'После said/asked в прошлом время часто сдвигается: am/is -> was, will -> would, can -> could.',
      'В пересказанных вопросах обычный порядок слов.',
      'Вопрос да/нет получает if или whether.',
      'Where/what/when остаются, но порядок становится обычным.',
      'Внутри пересказа обычно нет вопросительного знака.',
      'Этот тренер отрабатывает базовый сдвиг времени.',
    ],
    uk: [
      'Переказ передає сенс, а не копіює цитату.',
      'Після said часто ставимо that: He said that he was tired.',
      'Told вимагає людину: He told me that he was tired.',
      'I змінюється за сенсом: I -> he/she, my -> his/her.',
      'Після said/asked у минулому час часто зсувається: am/is -> was, will -> would, can -> could.',
      'У переказаних питаннях звичайний порядок слів.',
      'Питання так/ні отримує if або whether.',
      'Where/what/when залишаються, але порядок стає звичайним.',
      'Усередині переказу зазвичай немає знака питання.',
      'Цей тренер відпрацьовує базовий зсув часу.',
    ],
    es: [
      'Reported speech cuenta el sentido, no copia la cita exacta.',
      'Despues de said, that es comun: He said that he was tired.',
      'Told necesita una persona: He told me that he was tired.',
      'I cambia segun el sentido: I -> he/she, my -> his/her.',
      'Despues de said/asked en pasado, el tiempo suele retroceder: am/is -> was, will -> would, can -> could.',
      'Las preguntas en reported speech usan orden normal.',
      'Las preguntas si/no usan if o whether.',
      'Where/what/when se quedan, pero el orden se vuelve normal.',
      'Dentro del reported speech normalmente no hay signo de pregunta.',
      'Este entrenador practica el backshift basico.',
    ],
    'pt-BR': [
      'Reported speech reconta o sentido, não copia a citação exata.',
      'Depois de said, that é comum: He said that he was tired.',
      'Told precisa de uma pessoa: He told me that he was tired.',
      'I muda conforme o sentido: I -> he/she, my -> his/her.',
      'Depois de said/asked no passado, o tempo muitas vezes recua: am/is -> was, will -> would, can -> could.',
      'Perguntas em reported speech usam ordem normal de palavras.',
      'Perguntas sim/não recebem if ou whether.',
      'Where/what/when continuam, mas a ordem vira normal.',
      'Dentro do reported speech, normalmente não há ponto de interrogação.',
      'Este treino pratica o backshift básico.',
    ],
    vi: [
      'Reported speech kể lại ý nghĩa, không chép nguyên câu trích dẫn.',
      'Sau said, that rất thường gặp: He said that he was tired.',
      'Told cần một người nhận lời nói: He told me that he was tired.',
      'I thay đổi theo nghĩa: I -> he/she, my -> his/her.',
      'Sau said/asked ở quá khứ, thì thường lùi lại: am/is -> was, will -> would, can -> could.',
      'Câu hỏi trong reported speech dùng trật tự từ bình thường.',
      'Câu hỏi yes/no dùng if hoặc whether.',
      'Where/what/when vẫn giữ lại, nhưng trật tự trở thành bình thường.',
      'Bên trong reported speech thường không có dấu hỏi.',
      'Bài này luyện backshift cơ bản.',
    ],
    id: [
      'Reported speech menceritakan kembali makna, bukan menyalin kutipan persis.',
      'Setelah said, that umum dipakai: He said that he was tired.',
      'Told membutuhkan orang: He told me that he was tired.',
      'I berubah sesuai makna: I -> he/she, my -> his/her.',
      'Setelah said/asked dalam bentuk lampau, tense sering mundur: am/is -> was, will -> would, can -> could.',
      'Pertanyaan dalam reported speech memakai urutan kata normal.',
      'Pertanyaan ya/tidak memakai if atau whether.',
      'Where/what/when tetap ada, tetapi urutannya menjadi normal.',
      'Di dalam reported speech, biasanya tidak ada tanda tanya.',
      'Latihan ini melatih backshift dasar.',
    ],
    tr: [
      'Reported speech anlamı aktarır, alıntıyı birebir kopyalamaz.',
      'Said sonrasında that yaygındır: He said that he was tired.',
      'Told bir kişi ister: He told me that he was tired.',
      'I anlama göre değişir: I -> he/she, my -> his/her.',
      'Geçmişte said/asked sonrasında zaman çoğu kez geri kayar: am/is -> was, will -> would, can -> could.',
      'Aktarılan sorularda normal kelime sırası kullanılır.',
      'Evet/hayır soruları if veya whether alır.',
      'Where/what/when kalır, ama sıra normal olur.',
      'Reported speech içinde genellikle soru işareti olmaz.',
      'Bu antrenman temel backshift çalıştırır.',
    ],
    pl: [
      'Reported speech przekazuje sens, a nie kopiuje dokładny cytat.',
      'Po said często używamy that: He said that he was tired.',
      'Told wymaga osoby: He told me that he was tired.',
      'I zmienia się zgodnie z sensem: I -> he/she, my -> his/her.',
      'Po said/asked w czasie przeszłym czas często cofa się: am/is -> was, will -> would, can -> could.',
      'Pytania w reported speech mają normalny szyk zdania.',
      'Pytania tak/nie dostają if albo whether.',
      'Where/what/when zostają, ale szyk staje się normalny.',
      'W środku reported speech zwykle nie ma znaku zapytania.',
      'Ten trening ćwiczy podstawowy backshift.',
    ],
  },
  examples: [
    { en: 'He said that he was tired.', ru: 'He said that he was tired.', uk: 'He said that he was tired.', es: 'El dijo que estaba cansado.', 'pt-BR': 'Ele disse que estava cansado.', vi: 'Anh ấy nói rằng anh ấy mệt.', id: 'Dia mengatakan bahwa dia lelah.', tr: 'Yorgun olduğunu söyledi.', pl: 'Powiedział, że jest zmęczony.', why: tri('I am tired становится he was tired.', 'I am tired стає he was tired.', 'I am tired pasa a he was tired.') },
    { en: 'She said that she was busy.', ru: 'She said that she was busy.', uk: 'She said that she was busy.', es: 'Ella dijo que estaba ocupada.', 'pt-BR': 'Ela disse que estava ocupada.', vi: 'Cô ấy nói rằng cô ấy bận.', id: 'Dia mengatakan bahwa dia sibuk.', tr: 'Meşgul olduğunu söyledi.', pl: 'Powiedziała, że jest zajęta.', why: tri('I am busy становится she was busy.', 'I am busy стає she was busy.', 'I am busy pasa a she was busy.') },
    { en: 'He told me that he needed help.', ru: 'He told me that he needed help.', uk: 'He told me that he needed help.', es: 'El me dijo que necesitaba ayuda.', 'pt-BR': 'Ele me disse que precisava de ajuda.', vi: 'Anh ấy nói với tôi rằng anh ấy cần giúp đỡ.', id: 'Dia memberi tahu saya bahwa dia membutuhkan bantuan.', tr: 'Bana yardıma ihtiyacı olduğunu söyledi.', pl: 'Powiedział mi, że potrzebuje pomocy.', why: tri('Told требует человека: told me.', 'Told вимагає людину: told me.', 'Told necesita una persona: told me.') },
    { en: 'She said that she would call me.', ru: 'She said that she would call me.', uk: 'She said that she would call me.', es: 'Ella dijo que me llamaria.', 'pt-BR': 'Ela disse que me ligaria.', vi: 'Cô ấy nói rằng cô ấy sẽ gọi cho tôi.', id: 'Dia mengatakan bahwa dia akan menelepon saya.', tr: 'Beni arayacağını söyledi.', pl: 'Powiedziała, że do mnie zadzwoni.', why: tri('Will часто становится would.', 'Will часто стає would.', 'Will a menudo pasa a would.') },
    { en: 'He asked if I was busy.', ru: 'He asked if I was busy.', uk: 'He asked if I was busy.', es: 'El pregunto si yo estaba ocupado.', 'pt-BR': 'Ele perguntou se eu estava ocupado.', vi: 'Anh ấy hỏi liệu tôi có bận không.', id: 'Dia bertanya apakah saya sibuk.', tr: 'Meşgul olup olmadığımı sordu.', pl: 'Zapytał, czy jestem zajęty.', why: tri('Вопрос да/нет: if + I was, не was I.', 'Питання так/ні: if + I was, не was I.', 'Pregunta si/no: if + I was, no was I.') },
    { en: 'She asked where I lived.', ru: 'She asked where I lived.', uk: 'She asked where I lived.', es: 'Ella pregunto donde vivia yo.', 'pt-BR': 'Ela perguntou onde eu morava.', vi: 'Cô ấy hỏi tôi sống ở đâu.', id: 'Dia bertanya di mana saya tinggal.', tr: 'Nerede yaşadığımı sordu.', pl: 'Zapytała, gdzie mieszkam.', why: tri('Where остается, но порядок обычный: I lived.', 'Where залишається, але порядок звичайний: I lived.', 'Where se queda, pero el orden es normal: I lived.') },
    { en: 'He asked me what I wanted.', ru: 'He asked me what I wanted.', uk: 'He asked me what I wanted.', es: 'El me pregunto que queria.', 'pt-BR': 'Ele me perguntou o que eu queria.', vi: 'Anh ấy hỏi tôi muốn gì.', id: 'Dia bertanya kepada saya apa yang saya inginkan.', tr: 'Bana ne istediğimi sordu.', pl: 'Zapytał mnie, czego chcę.', why: tri('What остается, do уходит, wanted идет после I.', 'What залишається, do зникає, wanted іде після I.', 'What se queda, do desaparece y wanted va despues de I.') },
    { en: "She said that she couldn't come.", ru: "She said that she couldn't come.", uk: "She said that she couldn't come.", es: 'Ella dijo que no podia venir.', 'pt-BR': 'Ela disse que não poderia vir.', vi: 'Cô ấy nói rằng cô ấy không thể đến.', id: 'Dia mengatakan bahwa dia tidak bisa datang.', tr: 'Gelemeyeceğini söyledi.', pl: 'Powiedziała, że nie może przyjść.', why: tri("Can часто становится could; отрицание = couldn't.", "Can часто стає could; заперечення = couldn't.", "Can a menudo pasa a could; la negacion es couldn't.") },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты пересказываешь фразу так, будто она все еще в кавычках. Поэтому остаются I am, where did I live и told that.',
        'Схоже, ти переказуєш фразу так, ніби вона все ще в лапках. Тому залишаються I am, where did I live і told that.',
        'Parece que cuentas la frase como si siguiera entre comillas. Por eso quedan I am, where did I live y told that.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Утверждение: said that + обычный порядок. Вопрос: asked if/where/what + обычный порядок.',
        'Твердження: said that + звичайний порядок. Питання: asked if/where/what + звичайний порядок.',
        'Declaracion: said that + orden normal. Pregunta: asked if/where/what + orden normal.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Главные ловушки: оставить местоимения как в цитате, сохранить вопросительный порядок или забыть, кому именно сказали. В пересказе фраза собирается заново.',
        'Головнi пастки: залишити займенники як у цитатi, зберегти питальний порядок або забути, кому саме сказали. У переказi фраза збирається заново.',
        'Trampas principales: He said I am tired, He asked where did I live, He told that he was busy. Normal: He said he was tired, He asked where I lived, He told me that he was busy.',
      ),
    },
  ],
  steps: [
    step({ id: 'reported_easy_001', order: 1, difficulty: 'easy', targetSkill: 'said_he_was_tired', sentence: 'Direct: He said, "I am tired." Reported: He said that ___ tired.', translation: tri('He said that he was tired.', 'He said that he was tired.', 'He said that he was tired.'), options: ['he was', 'I am', 'he is', 'was he'], correctAnswer: 'he was', correctFeedback: tri('Да. I -> he, am -> was. Получается he was tired.', 'Так. I -> he, am -> was. Виходить he was tired.', 'Yes. I -> he, am -> was. The result is he was tired.'), wrong: { 'I am': tri('Ты оставил цитату. Если говорит he, в пересказе нужно he was.', 'Ти залишив цитату. Якщо говорить he, у переказі потрібно he was.', 'You kept the quote. If he is the speaker, reported speech needs he was.'), 'he is': tri('He уже правильно, но после said в базовом пересказе is сдвигается в was.', 'He вже правильно, але після said у базовому переказі is зсувається в was.', 'He is right, but after said in basic reported speech, is moves to was.'), 'was he': tri('Это порядок вопроса. В пересказе нужно обычное утверждение: he was.', 'Це порядок питання. У переказі потрібне звичайне твердження: he was.', 'That is question order. Reported speech needs normal statement order: he was.') }, retryFeedback: [tri('I am -> he was.', 'I am -> he was.', 'I am -> he was.'), tri('He said that he was tired.', 'He said that he was tired.', 'He said that he was tired.'), tri('Подсказка: He said that he was tired.', 'Підказка: He said that he was tired.', 'Hint: He said that he was tired.')], focusWords: ['he was'] }),
    step({ id: 'reported_easy_002', order: 2, difficulty: 'easy', targetSkill: 'said_she_was_busy', sentence: 'Direct: She said, "I am busy." Reported: She said that ___ busy.', translation: tri('She said that she was busy.', 'She said that she was busy.', 'She said that she was busy.'), options: ['she was', 'I am', 'she is', 'was she'], correctAnswer: 'she was', correctFeedback: tri('Да. I -> she, am -> was.', 'Так. I -> she, am -> was.', 'Yes. I -> she, am -> was.'), wrong: { 'I am': tri('Это все еще цитата. В пересказе нужно she was.', 'Це все ще цитата. У переказі потрібно she was.', 'That is still the quote. Reported speech needs she was.'), 'she is': tri('В базовом пересказе после said берем was.', 'У базовому переказі після said беремо was.', 'In basic reported speech after said, use was.'), 'was she': tri('В пересказе утверждение идет обычным порядком: she was, не was she.', 'У переказі твердження має звичайний порядок: she was, не was she.', 'In reported speech, statement order is normal: she was, not was she.') }, retryFeedback: [tri('I am busy -> she was busy.', 'I am busy -> she was busy.', 'I am busy -> she was busy.'), tri('She said that she was busy.', 'She said that she was busy.', 'She said that she was busy.'), tri('Подсказка: She said that she was busy.', 'Підказка: She said that she was busy.', 'Hint: She said that she was busy.')], focusWords: ['she was'] }),
    step({ id: 'reported_easy_003', order: 3, difficulty: 'easy', targetSkill: 'will_to_would', sentence: 'Direct: She said, "I will call you." Reported: She said that she ___ me.', translation: tri('She said that she would call me.', 'She said that she would call me.', 'She said that she would call me.'), options: ['would call', 'will call', 'called', 'would called'], correctAnswer: 'would call', correctFeedback: tri('Да. Will часто становится would после said.', 'Так. Will часто стає would після said.', 'Yes. Will often becomes would after said.'), wrong: { 'will call': tri('В базовом пересказе will сдвигается в would.', 'У базовому переказі will зсувається в would.', 'In basic reported speech, will moves to would.'), called: tri('Called меняет смысл. Из will call получается would call.', 'Called змінює сенс. Із will call виходить would call.', 'Called changes the meaning. Will call becomes would call.'), 'would called': tri('После would нужен call, не called.', 'Після would потрібен call, не called.', 'After would, use call, not called.') }, retryFeedback: [tri('Will call -> would call.', 'Will call -> would call.', 'Will call -> would call.'), tri('She said that she would call me.', 'She said that she would call me.', 'She said that she would call me.'), tri('Подсказка: She said that she would call me.', 'Підказка: She said that she would call me.', 'Hint: She said that she would call me.')], focusWords: ['would call'] }),
    step({ id: 'reported_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'told_me_object', sentence: 'He ___ that he needed help.', translation: tri('He told me that he needed help.', 'He told me that he needed help.', 'He told me that he needed help.'), options: ['told me', 'told', 'said me', 'said to me me'], correctAnswer: 'told me', correctFeedback: tri('Да. Told требует человека: told me.', 'Так. Told вимагає людину: told me.', 'Yes. Told needs someone: told me.'), wrong: { told: tri('Told без человека звучит незаконченным. Нужно told me.', 'Told без людини звучить незакінчено. Потрібно told me.', 'Told without a person is incomplete. We need told me.'), 'said me': tri('Said me не работает. Скажи told me или said to me.', 'Said me не працює. Скажи told me або said to me.', 'Said me does not work. Say told me or said to me.'), 'said to me me': tri('Said to me me лишнее. Нормально: told me или said to me.', 'Said to me me зайве. Нормально: told me або said to me.', 'Said to me me has an extra me. Use told me or said to me.') }, retryFeedback: [tri('Tell -> told me.', 'Tell -> told me.', 'Tell -> told me.'), tri('He told me that he needed help.', 'He told me that he needed help.', 'He told me that he needed help.'), tri('Подсказка: He told me that he needed help.', 'Підказка: He told me that he needed help.', 'Hint: He told me that he needed help.')], focusWords: ['told me'] }),
    step({ id: 'reported_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'said_not_said_me', sentence: 'She ___ that she was ready.', translation: tri('She said that she was ready.', 'She said that she was ready.', 'She said that she was ready.'), options: ['said', 'said me', 'told', 'told to'], correctAnswer: 'said', correctFeedback: tri('Да. Said можно без "кому": She said that...', 'Так. Said можна без "кому": She said that...', 'Yes. Said can stand without a person: She said that...'), wrong: { 'said me': tri('Said me не работает. Если есть "кому", скажи told me или said to me.', 'Said me не працює. Якщо є "кому", скажи told me або said to me.', 'Said me does not work. If there is a person, use told me or said to me.'), told: tri('Told требует человека: told me/her/us. Без этого берем said.', 'Told вимагає людину: told me/her/us. Без цього беремо said.', 'Told needs someone: told me/her/us. Without that, use said.'), 'told to': tri('Told to that не работает. Нужно said that или told someone that.', 'Told to that не працює. Потрібно said that або told someone that.', 'Told to that does not work. Use said that or told someone that.') }, retryFeedback: [tri('Said that. Told someone that.', 'Said that. Told someone that.', 'Said that. Told someone that.'), tri('She said that she was ready.', 'She said that she was ready.', 'She said that she was ready.'), tri('Подсказка: She said that she was ready.', 'Підказка: She said that she was ready.', 'Hint: She said that she was ready.')], focusWords: ['said that'] }),
    step({ id: 'reported_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'can_to_could', sentence: 'Direct: She said, "I can\'t come." Reported: She said that she ___.', translation: tri("She said that she couldn't come.", "She said that she couldn't come.", "She said that she couldn't come."), options: ["couldn't come", "can't come", "couldn't came", "doesn't can come"], correctAnswer: "couldn't come", correctFeedback: tri("Да. Can't часто становится couldn't после said.", "Так. Can't часто стає couldn't після said.", "Yes. Can't often becomes couldn't after said."), wrong: { "can't come": tri("В базовом пересказе can't сдвигается в couldn't.", "У базовому переказі can't зсувається в couldn't.", "In basic reported speech, can't moves to couldn't."), "couldn't came": tri("После couldn't нужен come, не came.", "Після couldn't потрібен come, не came.", "After couldn't, use come, not came."), "doesn't can come": tri("Doesn't can не работает. Нужно couldn't come.", "Doesn't can не працює. Потрібно couldn't come.", "Doesn't can does not work. Use couldn't come.") }, retryFeedback: [tri("Can't come -> couldn't come.", "Can't come -> couldn't come.", "Can't come -> couldn't come."), tri("She said that she couldn't come.", "She said that she couldn't come.", "She said that she couldn't come."), tri("Подсказка: She said that she couldn't come.", "Підказка: She said that she couldn't come.", "Hint: She said that she couldn't come.")], focusWords: ["couldn't come"] }),
    step({ id: 'reported_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'asked_if_busy', sentence: 'Direct: He asked, "Are you busy?" Reported: He asked ___ busy.', translation: tri('He asked if I was busy.', 'He asked if I was busy.', 'He asked if I was busy.'), options: ['if I was', 'was I', 'if was I', 'that I am'], correctAnswer: 'if I was', correctFeedback: tri('Да. Вопрос да/нет: if + обычный порядок, if I was.', 'Так. Питання так/ні: if + звичайний порядок, if I was.', 'Yes. Yes/no question: if + normal order, if I was.'), wrong: { 'was I': tri('В пересказе нужен if и обычный порядок слов.', 'У переказі потрібен if і звичайний порядок слів.', 'Reported speech needs if and normal word order.'), 'if was I': tri('После if нужен обычный порядок: if I was, не if was I.', 'Після if потрібен звичайний порядок: if I was, не if was I.', 'After if, use normal order: if I was, not if was I.'), 'that I am': tri('Это вопрос да/нет, поэтому нужен if. I am в базе сдвигается в I was.', 'Це питання так/ні, тому потрібен if. I am у базі зсувається в I was.', 'This is a yes/no question, so use if. I am moves to I was in this trainer.') }, retryFeedback: [tri('Are you busy? -> if I was busy.', 'Are you busy? -> if I was busy.', 'Are you busy? -> if I was busy.'), tri('He asked if I was busy.', 'He asked if I was busy.', 'He asked if I was busy.'), tri('Подсказка: He asked if I was busy.', 'Підказка: He asked if I was busy.', 'Hint: He asked if I was busy.')], focusWords: ['asked if', 'I was'] }),
    step({ id: 'reported_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'asked_if_could_help', sentence: 'Direct: She asked, "Can you help me?" Reported: She asked if I ___ help her.', translation: tri('She asked if I could help her.', 'She asked if I could help her.', 'She asked if I could help her.'), options: ['could', 'can', 'did can', 'would can'], correctAnswer: 'could', correctFeedback: tri('Да. Can часто становится could в пересказе.', 'Так. Can часто стає could у переказі.', 'Yes. Can often becomes could in reported speech.'), wrong: { can: tri('В этом базовом тренере после asked сдвигаем can в could.', 'У цьому базовому тренері після asked зсуваємо can у could.', 'In this basic trainer, after asked, can moves to could.'), 'did can': tri('Did can не работает. Нужно could.', 'Did can не працює. Потрібно could.', 'Did can does not work. Use could.'), 'would can': tri('Would can не работает. Нужно could help.', 'Would can не працює. Потрібно could help.', 'Would can does not work. Use could help.') }, retryFeedback: [tri('Can you help? -> if I could help.', 'Can you help? -> if I could help.', 'Can you help? -> if I could help.'), tri('She asked if I could help her.', 'She asked if I could help her.', 'She asked if I could help her.'), tri('Подсказка: She asked if I could help her.', 'Підказка: She asked if I could help her.', 'Hint: She asked if I could help her.')], focusWords: ['if I could'] }),
    step({ id: 'reported_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'asked_if_finished', sentence: 'Direct: He asked, "Did you finish?" Reported: He asked if I ___.', translation: tri('He asked if I had finished.', 'He asked if I had finished.', 'He asked if I had finished.'), options: ['had finished', 'did finish', 'finished?', 'have finished'], correctAnswer: 'had finished', correctFeedback: tri('Да. Did you finish? в классическом пересказе часто становится if I had finished.', 'Так. Did you finish? у класичному переказі часто стає if I had finished.', 'Yes. Did you finish? often becomes if I had finished in classic reported speech.'), wrong: { 'did finish': tri('В пересказанном вопросе did обычно уходит. Нужен обычный порядок и сдвиг времени.', 'У переказаному питанні did зазвичай зникає. Потрібен звичайний порядок і зсув часу.', 'In a reported question, did usually disappears. We need normal order and tense shift.'), 'finished?': tri('Внутри пересказа обычно не оставляем знак вопроса. Нужно had finished.', 'Усередині переказу зазвичай не залишаємо знак питання. Потрібно had finished.', 'Inside reported speech, we usually do not keep the question mark. Use had finished.'), 'have finished': tri('В классическом пересказе после asked берем had finished.', 'У класичному переказі після asked беремо had finished.', 'In classic reported speech after asked, use had finished.') }, retryFeedback: [tri('Did you finish? -> if I had finished.', 'Did you finish? -> if I had finished.', 'Did you finish? -> if I had finished.'), tri('He asked if I had finished.', 'He asked if I had finished.', 'He asked if I had finished.'), tri('Подсказка: He asked if I had finished.', 'Підказка: He asked if I had finished.', 'Hint: He asked if I had finished.')], focusWords: ['if I had finished'] }),
    step({ id: 'reported_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'asked_where_i_lived', sentence: 'Direct: She asked, "Where do you live?" Reported: She asked where I ___.', translation: tri('She asked where I lived.', 'She asked where I lived.', 'She asked where I lived.'), options: ['lived', 'did live', 'do live', 'live?'], correctAnswer: 'lived', correctFeedback: tri('Да. В пересказанном вопросе do уходит, порядок обычный: where I lived.', 'Так. У переказаному питанні do зникає, порядок звичайний: where I lived.', 'Yes. In a reported question, do disappears and word order is normal: where I lived.'), wrong: { 'did live': tri('Did в пересказанном вопросе не нужен. Нужно where I lived.', 'Did у переказаному питанні не потрібен. Потрібно where I lived.', 'Did is not needed in a reported question. Use where I lived.'), 'do live': tri('Do live оставляет прямой вопрос. Нужно lived.', 'Do live залишає пряме питання. Потрібно lived.', 'Do live keeps the direct question shape. Use lived.'), 'live?': tri('Здесь не оставляем вопросительную форму. Нужно lived.', 'Тут не залишаємо питальну форму. Потрібно lived.', 'Do not keep the question form here. Use lived.') }, retryFeedback: [tri('Where do you live? -> where I lived.', 'Where do you live? -> where I lived.', 'Where do you live? -> where I lived.'), tri('She asked where I lived.', 'She asked where I lived.', 'She asked where I lived.'), tri('Подсказка: She asked where I lived.', 'Підказка: She asked where I lived.', 'Hint: She asked where I lived.')], focusWords: ['where I lived'] }),
    step({ id: 'reported_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'asked_what_i_wanted', sentence: 'Direct: He asked, "What do you want?" Reported: He asked what I ___.', translation: tri('He asked what I wanted.', 'He asked what I wanted.', 'He asked what I wanted.'), options: ['wanted', 'did want', 'want', 'do want'], correctAnswer: 'wanted', correctFeedback: tri('Да. What do you want? становится what I wanted.', 'Так. What do you want? стає what I wanted.', 'Yes. What do you want? becomes what I wanted.'), wrong: { 'did want': tri('Did/do не нужны в пересказанном вопросе. Нужно I wanted.', 'Did/do не потрібні в переказаному питанні. Потрібно I wanted.', 'Did/do are not needed in a reported question. Use I wanted.'), want: tri('В базовом пересказе после asked берем wanted.', 'У базовому переказі після asked беремо wanted.', 'In basic reported speech after asked, use wanted.'), 'do want': tri('Do want держит форму прямого вопроса. Нужно wanted.', 'Do want тримає форму прямого питання. Потрібно wanted.', 'Do want keeps the direct question shape. Use wanted.') }, retryFeedback: [tri('What do you want? -> what I wanted.', 'What do you want? -> what I wanted.', 'What do you want? -> what I wanted.'), tri('He asked what I wanted.', 'He asked what I wanted.', 'He asked what I wanted.'), tri('Подсказка: He asked what I wanted.', 'Підказка: He asked what I wanted.', 'Hint: He asked what I wanted.')], focusWords: ['what I wanted'] }),
    step({ id: 'reported_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'asked_when_i_would_arrive', sentence: 'Direct: She asked, "When will you arrive?" Reported: She asked when I ___.', translation: tri('She asked when I would arrive.', 'She asked when I would arrive.', 'She asked when I would arrive.'), options: ['would arrive', 'will arrive', 'would arrived', 'will I arrive'], correctAnswer: 'would arrive', correctFeedback: tri('Да. Will -> would, порядок обычный: I would arrive.', 'Так. Will -> would, порядок звичайний: I would arrive.', 'Yes. Will -> would, normal order: I would arrive.'), wrong: { 'will arrive': tri('В базовом пересказе will сдвигается в would.', 'У базовому переказі will зсувається в would.', 'In basic reported speech, will moves to would.'), 'would arrived': tri('После would нужен arrive, не arrived.', 'Після would потрібен arrive, не arrived.', 'After would, use arrive, not arrived.'), 'will I arrive': tri('Это порядок вопроса. В пересказе нужно I would arrive.', 'Це порядок питання. У переказі потрібно I would arrive.', 'That is question order. Reported speech needs I would arrive.') }, retryFeedback: [tri('When will you arrive? -> when I would arrive.', 'When will you arrive? -> when I would arrive.', 'When will you arrive? -> when I would arrive.'), tri('She asked when I would arrive.', 'She asked when I would arrive.', 'She asked when I would arrive.'), tri('Подсказка: She asked when I would arrive.', 'Підказка: She asked when I would arrive.', 'Hint: She asked when I would arrive.')], focusWords: ['when I would arrive'] }),
    step({ id: 'reported_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_statement_question_pair', sentence: 'Choose the correct pair.', translation: tri('He said that he was tired / He asked if I was busy', 'He said that he was tired / He asked if I was busy', 'He said that he was tired / He asked if I was busy'), options: ['He said that he was tired / He asked if I was busy', 'He said that I am tired / He asked was I busy', 'He told that he was tired / He asked if was I busy', 'He said he is tired / He asked that I am busy'], correctAnswer: 'He said that he was tired / He asked if I was busy', correctFeedback: tri('Да. Утверждение: said that. Вопрос да/нет: asked if + обычный порядок.', 'Так. Твердження: said that. Питання так/ні: asked if + звичайний порядок.', 'Yes. Statement: said that. Yes/no question: asked if + normal order.'), wrong: { 'He said that I am tired / He asked was I busy': tri('I am должно стать he was, а вопросу нужен if I was.', 'I am має стати he was, а питанню потрібен if I was.', 'I am should become he was, and the question needs if I was.'), 'He told that he was tired / He asked if was I busy': tri('Told требует человека, а после if порядок обычный: if I was.', 'Told вимагає людину, а після if порядок звичайний: if I was.', 'Told needs someone, and after if the order is normal: if I was.'), 'He said he is tired / He asked that I am busy': tri('В базе he is -> he was, а вопросу да/нет нужен if, не that.', 'У базі he is -> he was, а питанню так/ні потрібен if, не that.', 'In this trainer he is -> he was, and a yes/no question needs if, not that.') }, retryFeedback: [tri('Said he was / asked if I was.', 'Said he was / asked if I was.', 'Said he was / asked if I was.'), tri('He said that he was tired / He asked if I was busy.', 'He said that he was tired / He asked if I was busy.', 'He said that he was tired / He asked if I was busy.'), tri('Подсказка: He said that he was tired / He asked if I was busy.', 'Підказка: He said that he was tired / He asked if I was busy.', 'Hint: He said that he was tired / He asked if I was busy.')], focusWords: ['said that', 'asked if'] }),
    step({ id: 'reported_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_wh_questions', sentence: 'Choose the correct pair.', translation: tri('She asked where I lived / He asked what I wanted', 'She asked where I lived / He asked what I wanted', 'She asked where I lived / He asked what I wanted'), options: ['She asked where I lived / He asked what I wanted', 'She asked where did I live / He asked what did I want', 'She asked where do I live / He asked what do I want', 'She asked where I live? / He asked what I want?'], correctAnswer: 'She asked where I lived / He asked what I wanted', correctFeedback: tri('Да. Where/what остаются, но порядок обычный: I lived, I wanted.', 'Так. Where/what залишаються, але порядок звичайний: I lived, I wanted.', 'Yes. Where/what stay, but order is normal: I lived, I wanted.'), wrong: { 'She asked where did I live / He asked what did I want': tri('Did не нужен в пересказанных вопросах. Нужен обычный порядок.', 'Did не потрібен у переказаних питаннях. Потрібен звичайний порядок.', 'Did is not needed in reported questions. Use normal word order.'), 'She asked where do I live / He asked what do I want': tri('Do не нужен в пересказанных вопросах. Нужно I lived / I wanted.', 'Do не потрібен у переказаних питаннях. Потрібно I lived / I wanted.', 'Do is not needed in reported questions. Use I lived / I wanted.'), 'She asked where I live? / He asked what I want?': tri('Внутри пересказа обычно не ставим вопросительный знак, и этот тренер делает сдвиг времени.', 'Усередині переказу зазвичай не ставимо знак питання, і цей тренер робить зсув часу.', 'Inside reported speech, we usually do not keep the question mark, and this trainer applies tense shift.') }, retryFeedback: [tri('Where I lived / what I wanted.', 'Where I lived / what I wanted.', 'Where I lived / what I wanted.'), tri('She asked where I lived / He asked what I wanted.', 'She asked where I lived / He asked what I wanted.', 'She asked where I lived / He asked what I wanted.'), tri('Подсказка: She asked where I lived / He asked what I wanted.', 'Підказка: She asked where I lived / He asked what I wanted.', 'Hint: She asked where I lived / He asked what I wanted.')], focusWords: ['where I lived', 'what I wanted'] }),
    step({ id: 'reported_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri("She said that she couldn't come and asked when I would arrive.", "She said that she couldn't come and asked when I would arrive.", "She said that she couldn't come and asked when I would arrive."), options: ["She said that she couldn't come and asked when I would arrive.", "She said that she can't come and asked when will I arrive.", "She told that she couldn't came and asked when I will arrive.", "She said that I couldn't come and asked when would I arrive."], correctAnswer: "She said that she couldn't come and asked when I would arrive.", correctFeedback: tri("Да. Can't -> couldn't, will -> would, и порядок обычный: I would arrive.", "Так. Can't -> couldn't, will -> would, і порядок звичайний: I would arrive.", "Yes. Can't -> couldn't, will -> would, and normal order: I would arrive."), wrong: { "She said that she can't come and asked when will I arrive.": tri("Can't сдвигается в couldn't, а when will I arrive оставляет порядок вопроса.", "Can't зсувається в couldn't, а when will I arrive залишає порядок питання.", "Can't moves to couldn't, and when will I arrive keeps question order."), "She told that she couldn't came and asked when I will arrive.": tri("Told требует человека, после couldn't нужен come, а will сдвигается в would.", "Told вимагає людину, після couldn't потрібен come, а will зсувається в would.", "Told needs someone, after couldn't use come, and will moves to would."), "She said that I couldn't come and asked when would I arrive.": tri("Она говорила о себе: she couldn't come. В вопросе нужен обычный порядок: I would arrive.", "Вона говорила про себе: she couldn't come. У питанні потрібен звичайний порядок: I would arrive.", "She was speaking about herself: she couldn't come. In the question, use normal order: I would arrive.") }, retryFeedback: [tri("She couldn't come / when I would arrive.", "She couldn't come / when I would arrive.", "She couldn't come / when I would arrive."), tri("She said that she couldn't come and asked when I would arrive.", "She said that she couldn't come and asked when I would arrive.", "She said that she couldn't come and asked when I would arrive."), tri("Подсказка: She said that she couldn't come and asked when I would arrive.", "Підказка: She said that she couldn't come and asked when I would arrive.", "Hint: She said that she couldn't come and asked when I would arrive.")], focusWords: ["couldn't come", 'when I would arrive'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['missing_pronoun_shift_error', 'missing_backshift_error', 'reported_question_word_order_error', 'did_in_reported_question_error', 'yes_no_question_missing_if_error', 'told_without_object_error', 'said_with_object_error', 'will_not_backshifted_error', 'can_not_backshifted_error', 'direct_speech_left_inside_report_error'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем цитату, кто говорил и что меняется в пересказе.', 'Звичайне пояснення: показуємо цитату, хто говорив і що змінюється у переказі.', 'Explicacion normal: muestra la cita, quien hablo y que cambia en reported speech.'),
    depth2: tri('Проще: это утверждение, вопрос да/нет или вопрос с where/what/when?', 'Простіше: це твердження, питання так/ні чи питання з where/what/when?', 'Mas simple: es declaracion, pregunta si/no o pregunta con where/what/when?'),
    depth3: tri('Еще проще: пересказ меняет лицо, часто сдвигает время и убирает вопросительный порядок внутри фразы.', 'Ще простiше: переказ змiнює особу, часто зсуває час i прибирає питальний порядок усерединi фрази.', 'Aun mas simple: I am -> he was, will -> would, where do you live -> where I lived.'),
    depth4: tri('Почти подсказка: выбери нужный блок: said that, asked if или asked where.', 'Майже підказка: вибери потрібний блок: said that, asked if або asked where.', 'Casi una pista: elige el bloque necesario: said that, asked if o asked where.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Пересказ не цитата. Утверждение: said that + обычный порядок. Вопрос да/нет: asked if + обычный порядок. Where/what/when: asked where/what/when + обычный порядок. Told требует человека: told me.',
        'Переказ не цитата. Твердження: said that + звичайний порядок. Питання так/ні: asked if + звичайний порядок. Where/what/when: asked where/what/when + звичайний порядок. Told вимагає людину: told me.',
        'Reported speech no es una cita. Declaracion: said that + orden normal. Pregunta si/no: asked if + orden normal. Where/what/when: asked where/what/when + orden normal. Told necesita alguien: told me.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_report_type_hint_then_retry',
      card: tri('Подсказка: система покажет тип исходной фразы, но не выберет весь ответ.', 'Підказка: система покаже тип початкової фрази, але не вибере всю відповідь.', 'Pista: el sistema muestra el tipo de frase original, pero no elige toda la respuesta.'),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Guided mode: сначала выбери тип фразы. Потом выбери said that, asked if или asked where/what.', 'Guided mode: спочатку вибери тип фрази. Потім вибери said that, asked if або asked where/what.', 'Modo guiado: primero elige el tipo de frase. Luego elige said that, asked if o asked where/what.'),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_reported_001', prompt: tri('He said, "I am tired." В пересказе I станет he или I?', 'He said, "I am tired." У переказі I стане he чи I?', 'He said, "I am tired." En reported speech, I pasa a he o se queda I?'), options: ['he', 'I'], correctIndex: 0, thenReturnToExerciseId: 'reported_easy_001' },
      { id: 'guided_reported_002', prompt: tri('Told обычно требует человека: told me или told that?', 'Told зазвичай вимагає людину: told me чи told that?', 'Told normalmente necesita alguien: told me o told that?'), options: ['told me', 'told that'], correctIndex: 0, thenReturnToExerciseId: 'reported_contrast_001' },
      { id: 'guided_reported_003', prompt: tri('В вопросе да/нет при пересказе нужен обычный порядок слов или порядок вопроса?', 'У питаннi так/нi при переказi потрiбен звичайний порядок слiв чи порядок питання?', 'Are you busy? En reported speech: asked if I was busy o asked was I busy?'), options: ['asked if I was busy', 'asked was I busy'], correctIndex: 0, thenReturnToExerciseId: 'reported_contrast_004' },
      { id: 'guided_reported_004', prompt: tri('В вопросе со словом where при пересказе оставляем вопросительный порядок или делаем обычную фразу?', 'У питаннi зi словом where при переказi залишаємо питальний порядок чи робимо звичайну фразу?', 'Where do you live? En reported speech: where I lived o where did I live?'), options: ['where I lived', 'where did I live'], correctIndex: 0, thenReturnToExerciseId: 'reported_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'reported_speech_basic',
    diagnosisLabel: tri('He said that...', 'He said that...', 'He said that...: reported speech'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['said that', 'told me', 'asked if', 'where I lived', 'would call'],
    focusPatterns: ['said_he_was_tired', 'said_she_was_busy', 'will_to_would', 'told_me_object', 'said_not_said_me', 'can_to_could', 'asked_if_busy', 'asked_if_could_help', 'asked_if_finished', 'asked_where_i_lived', 'asked_what_i_wanted', 'asked_when_i_would_arrive', 'mixed_statement_question_pair', 'mixed_wh_questions', 'mixed_sentence_correction'],
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
    payload: { category: 'syntax', microDiagnosisId: 'reported_speech_basic', contrastSet: ['said that', 'told me', 'asked if', 'reported question', 'backshift'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logReportType: true, logReportingVerb: true, logPronounShift: true, logBackshift: true, logReportedQuestionOrder: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=reported_speech_basic',
    problemCoachRoute: '/problem_coach?category=syntax&microDiagnosisId=reported_speech_basic',
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
