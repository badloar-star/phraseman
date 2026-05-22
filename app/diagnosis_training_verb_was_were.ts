import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const WAS_WERE_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre was/were ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về was/were này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan was/were ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu was/were açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie was/were nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? WAS_WERE_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = ['was', 'were', 'am/is/are', "wasn't", "weren't", 'was there', 'were there'];

const MODEL = tri(
  'Was и were - это be в прошлом. Для I/he/she/it обычно нужен was: I was tired, she was at home. Для you/we/they нужен were: you were right, they were busy. Если есть yesterday, last night, last week или in 2020, не оставляй am/is/are.',
  'Was і were - це be у минулому. Для I/he/she/it зазвичай потрібен was: I was tired, she was at home. Для you/we/they потрібен were: you were right, they were busy. Якщо є yesterday, last night, last week або in 2020, не залишай am/is/are.',
  'Was y were son be en pasado. Con I/he/she/it normalmente necesitas was: I was tired, she was at home. Con you/we/they necesitas were: you were right, they were busy. Si ves yesterday, last night, last week o in 2020, no dejes am/is/are.',
  {
    'pt-BR': 'Was e were são be no passado. Com I/he/she/it, normalmente use was: I was tired, she was at home. Com you/we/they, use were: you were right, they were busy. Se houver yesterday, last night, last week ou in 2020, não deixe am/is/are.',
    vi: 'Was và were là be ở quá khứ. Với I/he/she/it, thường dùng was: I was tired, she was at home. Với you/we/they, dùng were: you were right, they were busy. Nếu có yesterday, last night, last week hoặc in 2020, đừng giữ am/is/are.',
    id: 'Was dan were adalah be di masa lalu. Untuk I/he/she/it, biasanya gunakan was: I was tired, she was at home. Untuk you/we/they, gunakan were: you were right, they were busy. Jika ada yesterday, last night, last week, atau in 2020, jangan biarkan am/is/are.',
    tr: 'Was ve were, be fiilinin geçmiş biçimleridir. I/he/she/it ile genellikle was kullanılır: I was tired, she was at home. You/we/they ile were kullanılır: you were right, they were busy. Yesterday, last night, last week veya in 2020 varsa am/is/are bırakma.',
    pl: 'Was i were to be w przeszłości. Z I/he/she/it zwykle użyj was: I was tired, she was at home. Z you/we/they użyj were: you were right, they were busy. Jeśli widzisz yesterday, last night, last week albo in 2020, nie zostawiaj am/is/are.',
  },
);

const WAS_WERE_SKILL_ES: Record<string, string> = {
  i_was: 'Con I en pasado usa was.',
  she_was: 'Con she en pasado usa was.',
  it_was: 'Para clima con it en pasado usa was.',
  they_were: 'Con they en pasado usa were.',
  we_were: 'Con we en pasado usa were.',
  you_were: 'Con you en pasado usa were.',
  past_marker_not_is: 'Yesterday pide pasado: he was.',
  past_marker_not_are: 'Last week pide pasado; rooms es plural: were.',
  singular_noun_was: 'The lesson es singular: was.',
  wasnt_singular: 'Con he en negativo usa wasn’t.',
  werent_plural: 'Con they en negativo usa weren’t.',
  question_were_they: 'En pregunta con they, were va primero.',
  mixed_was_were_pair: 'I usa was; they usa were.',
  mixed_negative_pair: 'He usa wasn’t; we usa weren’t.',
  mixed_sentence_correction: 'She usa was; they usa were.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = WAS_WERE_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? WAS_WERE_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function wasWereEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = WAS_WERE_SKILL_ES[input.targetSkill] ?? 'Comprueba la persona y el tiempo pasado.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(correct: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди, о ком или о чем фраза: I/he/she/it или you/we/they.',
      'Спочатку знайди, про кого або про що фраза: I/he/she/it або you/we/they.',
      'Primero encuentra de quien o de que habla la frase.',
    ),
    tri(
      'Если это I/he/she/it в прошлом, чаще нужен was.',
      'Якщо це I/he/she/it у минулому, частіше потрібен was.',
      'I/he/she/it normalmente usan was en pasado.',
    ),
    tri(
      'Если это you/we/they в прошлом, чаще нужен were.',
      'Якщо це you/we/they у минулому, частіше потрібен were.',
      'You/we/they normalmente usan were en pasado.',
    ),
    tri(
      `Нужный вариант здесь: ${correct}.`,
      `Потрібний варіант тут: ${correct}.`,
      `La respuesta aqui es: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Проверь, кто в фразе, и время. Здесь нужно: ${correct}.`,
    `Майже. Перевір, хто у фразі, і час. Тут потрібно: ${correct}.`,
    `Casi. Revisa de quien habla la frase y usa: ${correct}.`,
  );
}

function wasWereStep(input: {
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
  const esFeedback = wasWereEsFeedback(input);
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
      'Выбери was или were по тому, о ком фраза, и не оставляй am/is/are там, где речь о прошлом.',
      'Обери was або were за тим, про кого фраза, і не залишай am/is/are там, де йдеться про минуле.',
      'Elige was o were segun la persona, y no dejes am/is/are cuando el sentido es pasado.',
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
      "Коротко: I/he/she/it was. You/we/they were. В отрицании: wasn't / weren't. В вопросе was/were выходит вперед: Were they at work? Не ставь was/were перед обычным действием: I was worked неверно, нужно I worked.",
      "Коротко: I/he/she/it was. You/we/they were. У запереченні: wasn't / weren't. У питанні was/were виходить уперед: Were they at work? Не став was/were перед звичайною дією: I was worked неправильно, потрібно I worked.",
      "Version corta: I/he/she/it was. You/we/they were. Negativa: wasn't / weren't. Pregunta: was/were va primero. No pongas was/were antes de una accion normal: I was worked es incorrecto; usa I worked.",
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_WAS_WERE_TRAINING: DiagnosisTraining = {
  id: 'verb_was_were',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 26,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('Was / Were: был, была, были', 'Was / Were: був, була, були', 'Was / Were: be en pasado', {
    'pt-BR': 'Was / Were: be no passado',
    vi: 'Was / Were: be ở quá khứ',
    id: 'Was / Were: be di masa lalu',
    tr: 'Was / Were: geçmişte be',
    pl: 'Was / Were: be w przeszłości',
  }),
  shortTitle: tri('Was / Were', 'Was / Were', 'Was / Were', {
    'pt-BR': 'Was / Were',
    vi: 'Was / Were',
    id: 'Was / Were',
    tr: 'Was / Were',
    pl: 'Was / Were',
  }),
  shortDiagnosis: tri(
    'Ты путаешь was и were или оставляешь am/is/are там, где фраза уже в прошлом.',
    'Ти плутаєш was і were або залишаєш am/is/are там, де фраза вже в минулому.',
    'Confundes was y were o dejas am/is/are donde la frase ya esta en pasado.',
    {
      'pt-BR': 'Você confunde was e were ou deixa am/is/are onde a frase já está no passado.',
      vi: 'Bạn nhầm was và were hoặc giữ am/is/are ở nơi câu đã nói về quá khứ.',
      id: 'Kamu mencampur was dan were atau membiarkan am/is/are saat kalimatnya sudah berada di masa lalu.',
      tr: 'Was ve were biçimlerini karıştırıyor ya da cümle geçmişteyken am/is/are bırakıyorsun.',
      pl: 'Mylisz was i were albo zostawiasz am/is/are tam, gdzie zdanie jest już w przeszłości.',
    },
  ),
  diagnosisText: tri(
    'Ошибка появляется, когда ты переводишь “был/были” одним русским словом и не выбираешь английскую пару. В английском I was, he was, she was, it was, но you were, we were, they were.',
    'Помилка зʼявляється, коли ти перекладаєш “був/були” одним українським словом і не обираєш англійську пару. Англійською I was, he was, she was, it was, але you were, we were, they were.',
    'El error aparece cuando be en pasado se traduce como una sola palabra y no eliges la pareja inglesa: I was, he was, she was, it was, pero you were, we were, they were.',
    {
      'pt-BR': 'O erro aparece quando você trata “era/estava/foi” como uma única ideia e não escolhe o par em inglês. Em inglês: I was, he was, she was, it was, mas you were, we were, they were.',
      vi: 'Lỗi xuất hiện khi bạn dịch ý “đã là/đã ở” như một dạng duy nhất và không chọn đúng cặp trong tiếng Anh. Trong tiếng Anh: I was, he was, she was, it was, nhưng you were, we were, they were.',
      id: 'Kesalahan muncul saat kamu memperlakukan “dulu/berada/menjadi” sebagai satu bentuk saja dan tidak memilih pasangan bahasa Inggrisnya. Dalam bahasa Inggris: I was, he was, she was, it was, tetapi you were, we were, they were.',
      tr: 'Hata, “idi/vardı” anlamını tek bir biçim gibi düşünüp İngilizcedeki doğru çifti seçmediğinde ortaya çıkar. İngilizcede I was, he was, she was, it was; ama you were, we were, they were.',
      pl: 'Błąd pojawia się, gdy traktujesz „był/byli” jak jedną formę i nie wybierasz angielskiej pary. Po angielsku: I was, he was, she was, it was, ale you were, we were, they were.',
    },
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    "Was ставим с I/he/she/it в прошлом. Were ставим с you/we/they. В отрицании используем wasn't или weren't. В вопросе was/were выходит вперёд.",
    "Was ставимо з I/he/she/it у минулому. Were ставимо з you/we/they. У запереченні використовуємо wasn't або weren't. У питанні was/were виходить уперед.",
    "I/he/she/it was. You/we/they were. Negativa: wasn't/weren't. Pregunta: Was/Were al principio.",
    {
      'pt-BR': "Use was com I/he/she/it no passado. Use were com you/we/they. Na negativa, use wasn't ou weren't. Em perguntas, was/were vai para a frente.",
      vi: "Dùng was với I/he/she/it trong quá khứ. Dùng were với you/we/they. Trong câu phủ định, dùng wasn't hoặc weren't. Trong câu hỏi, was/were đứng lên đầu.",
      id: "Gunakan was dengan I/he/she/it di masa lalu. Gunakan were dengan you/we/they. Dalam negatif, gunakan wasn't atau weren't. Dalam pertanyaan, was/were maju ke depan.",
      tr: "Geçmişte I/he/she/it ile was kullan. You/we/they ile were kullan. Olumsuzda wasn't veya weren't kullan. Soruda was/were başa gelir.",
      pl: "W przeszłości użyj was z I/he/she/it. Użyj were z you/we/they. W przeczeniu użyj wasn't albo weren't. W pytaniu was/were idzie na początek.",
    },
  ),
  whatUserMustLearn: {
    ru: [
      'С I в прошлом используем was: I was tired.',
      'С he/she/it в прошлом используем was: He was late, She was at home, It was cold.',
      'С you в прошлом используем were: You were right.',
      'С we/they в прошлом используем were: We were busy, They were outside.',
      'Was/were нужны для прошлого состояния, места, погоды или описания.',
      'Yesterday, last night, last week и in 2020 часто подсказывают прошлое и форму was/were.',
      'Не говори I were, he were, they was в стандартной речи.',
      "В отрицании используем wasn't и weren't: I wasn't ready, They weren't home.",
      'В вопросе was/were выходит вперед: Was he late? Were they ready?',
      'Не ставь was/were перед обычным действием: I was worked неверно. Для действия нужно I worked.',
    ],
    uk: [
      'З I у минулому використовуємо was: I was tired.',
      'З he/she/it у минулому використовуємо was: He was late, She was at home, It was cold.',
      'З you у минулому використовуємо were: You were right.',
      'З we/they у минулому використовуємо were: We were busy, They were outside.',
      'Was/were потрібні для минулого стану, місця, погоди або опису.',
      'Yesterday, last night, last week і in 2020 часто підказують минуле і форму was/were.',
      'Не кажи I were, he were, they was у стандартній мові.',
      "У запереченні використовуємо wasn't і weren't: I wasn't ready, They weren't home.",
      'У питанні was/were виходить уперед: Was he late? Were they ready?',
      'Не став was/were перед звичайною дією: I was worked неправильно. Для дії потрібно I worked.',
    ],
    es: [
      'Con I en pasado usa was.',
      'Con he/she/it en pasado usa was.',
      'Con you en pasado usa were.',
      'Con we/they en pasado usa were.',
      'Was/were describen estado, lugar, clima o descripcion en pasado.',
      'Yesterday y last night suelen apuntar a was/were.',
      'No digas they was.',
      "Usa wasn't y weren't en negativas.",
      'Las preguntas empiezan con was/were.',
      'No uses was/were antes de acciones normales en pasado como worked.',
    ],
    'pt-BR': [
      'I usa was no passado.',
      'He/she/it usam was no passado.',
      'You usa were no passado.',
      'We/they usam were no passado.',
      'Was/were descrevem estado, lugar, clima ou descrição no passado.',
      'Yesterday e last night muitas vezes apontam para was/were.',
      'Não diga they was.',
      "Use wasn't e weren't em negativas.",
      'Perguntas começam com was/were.',
      'Não use was/were antes de ações normais no passado, como worked.',
    ],
    vi: [
      'I dùng was trong quá khứ.',
      'He/she/it dùng was trong quá khứ.',
      'You dùng were trong quá khứ.',
      'We/they dùng were trong quá khứ.',
      'Was/were mô tả trạng thái, nơi chốn, thời tiết hoặc miêu tả trong quá khứ.',
      'Yesterday và last night thường gợi ý was/were.',
      'Đừng nói they was.',
      "Dùng wasn't và weren't trong câu phủ định.",
      'Câu hỏi bắt đầu bằng was/were.',
      'Đừng dùng was/were trước hành động quá khứ bình thường như worked.',
    ],
    id: [
      'I memakai was di masa lalu.',
      'He/she/it memakai was di masa lalu.',
      'You memakai were di masa lalu.',
      'We/they memakai were di masa lalu.',
      'Was/were menggambarkan keadaan, tempat, cuaca, atau deskripsi di masa lalu.',
      'Yesterday dan last night sering menunjukkan was/were.',
      'Jangan mengatakan they was.',
      "Gunakan wasn't dan weren't dalam negatif.",
      'Pertanyaan dimulai dengan was/were.',
      'Jangan gunakan was/were sebelum aksi lampau biasa seperti worked.',
    ],
    tr: [
      'I geçmişte was alır.',
      'He/she/it geçmişte was alır.',
      'You geçmişte were alır.',
      'We/they geçmişte were alır.',
      'Was/were geçmiş durum, yer, hava veya tanım anlatır.',
      'Yesterday ve last night çoğu zaman was/were gösterir.',
      'They was deme.',
      "Olumsuzlarda wasn't ve weren't kullan.",
      'Sorular was/were ile başlar.',
      'Worked gibi normal geçmiş eylemlerden önce was/were kullanma.',
    ],
    pl: [
      'I używa was w przeszłości.',
      'He/she/it używają was w przeszłości.',
      'You używa were w przeszłości.',
      'We/they używają were w przeszłości.',
      'Was/were opisują przeszły stan, miejsce, pogodę albo opis.',
      'Yesterday i last night często wskazują was/were.',
      'Nie mów they was.',
      "W przeczeniach używaj wasn't i weren't.",
      'Pytania zaczynają się od was/were.',
      'Nie używaj was/were przed normalnymi przeszłymi czynnościami jak worked.',
    ],
  },
  examples: [
    {
      en: 'I was tired yesterday.',
      ru: 'Я был уставшим вчера.',
      uk: 'Я був втомлений учора.',
      es: 'Ayer estaba cansado.',
      'pt-BR': 'Eu estava cansado ontem.',
      vi: 'Hôm qua tôi đã mệt.',
      id: 'Saya lelah kemarin.',
      tr: 'Dün yorgundum.',
      pl: 'Byłem zmęczony wczoraj.',
      why: tri('I в прошлом с be дает was.', 'I у минулому з be дає was.', 'I usa was en pasado.'),
    },
    {
      en: 'She was at home last night.',
      ru: 'Она была дома вчера вечером.',
      uk: 'Вона була вдома вчора ввечері.',
      es: 'Ella estaba en casa anoche.',
      'pt-BR': 'Ela estava em casa ontem à noite.',
      vi: 'Tối qua cô ấy đã ở nhà.',
      id: 'Dia ada di rumah tadi malam.',
      tr: 'Dün gece evdeydi.',
      pl: 'Ona była w domu wczoraj wieczorem.',
      why: tri('She требует was, а last night показывает прошлое.', 'She потребує was, а last night показує минуле.', 'She usa was.'),
    },
    {
      en: 'They were busy yesterday.',
      ru: 'Они были заняты вчера.',
      uk: 'Вони були зайняті вчора.',
      es: 'Ayer estaban ocupados.',
      'pt-BR': 'Eles estavam ocupados ontem.',
      vi: 'Hôm qua họ đã bận.',
      id: 'Mereka sibuk kemarin.',
      tr: 'Dün meşguldüler.',
      pl: 'Oni byli zajęci wczoraj.',
      why: tri('They в прошлом с be дает were.', 'They у минулому з be дає were.', 'They usa were en pasado.'),
    },
    {
      en: 'We were in Dublin in 2020.',
      ru: 'Мы были в Дублине в 2020 году.',
      uk: 'Ми були в Дубліні у 2020 році.',
      es: 'Estuvimos en Dublin en 2020.',
      'pt-BR': 'Nós estivemos em Dublin em 2020.',
      vi: 'Chúng tôi đã ở Dublin vào năm 2020.',
      id: 'Kami berada di Dublin pada tahun 2020.',
      tr: '2020’de Dublin’deydik.',
      pl: 'Byliśmy w Dublinie w 2020 roku.',
      why: tri('We требует were, а in 2020 показывает прошлое.', 'We потребує were, а in 2020 показує минуле.', 'We usa were.'),
    },
    {
      en: 'It was cold this morning.',
      ru: 'Сегодня утром было холодно.',
      uk: 'Сьогодні вранці було холодно.',
      es: 'Esta manana hacia frio.',
      'pt-BR': 'Estava frio esta manhã.',
      vi: 'Sáng nay trời lạnh.',
      id: 'Pagi ini dingin.',
      tr: 'Bu sabah hava soğuktu.',
      pl: 'Dziś rano było zimno.',
      why: tri('Для погоды часто используется it. В прошлом: it was.', 'Для погоди часто використовується it. У минулому: it was.', 'El clima suele usar it was.'),
    },
    {
      en: 'You were right.',
      ru: 'Ты был прав.',
      uk: 'Ти мав рацію.',
      es: 'Tenias razon.',
      'pt-BR': 'Você estava certo.',
      vi: 'Bạn đã đúng.',
      id: 'Kamu benar.',
      tr: 'Haklıydın.',
      pl: 'Miałeś rację.',
      why: tri('You в прошлом с be дает were, не was.', 'You у минулому з be дає were, не was.', 'You usa were.'),
    },
    {
      en: "He wasn't ready.",
      ru: 'Он не был готов.',
      uk: 'Він не був готовий.',
      es: 'El no estaba listo.',
      'pt-BR': 'Ele não estava pronto.',
      vi: 'Anh ấy chưa sẵn sàng.',
      id: 'Dia belum siap.',
      tr: 'Hazır değildi.',
      pl: 'On nie był gotowy.',
      why: tri("He требует was. В отрицании: wasn't.", "He потребує was. У запереченні: wasn't.", "He usa wasn't en negativa."),
    },
    {
      en: 'Were they at work?',
      ru: 'Они были на работе?',
      uk: 'Вони були на роботі?',
      es: 'Estaban en el trabajo?',
      'pt-BR': 'Eles estavam no trabalho?',
      vi: 'Họ đã ở chỗ làm à?',
      id: 'Apakah mereka ada di tempat kerja?',
      tr: 'İşte miydiler?',
      pl: 'Czy oni byli w pracy?',
      why: tri('В вопросе were выходит вперед.', 'У питанні were виходить уперед.', 'En una pregunta, were va primero.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты говоришь о прошлом состоянии, но выбираешь was/were наугад или оставляешь is/are.',
        'Схоже, ти говориш про минулий стан, але обираєш was/were навмання або залишаєш is/are.',
        'Parece que hablas de un estado pasado, pero eliges was/were al azar o dejas is/are.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Запомни готовые пары: I was, he was, she was, it was. You were, we were, they were.',
        'Запамʼятай готові пари: I was, he was, she was, it was. You were, we were, they were.',
        'Memoriza las parejas: I was, he was, she was, it was; you/we/they were.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Отдельная ловушка: I was worked неверно. Если это действие, нужно I worked.',
        'Окрема пастка: I was worked неправильно. Якщо це дія, потрібно I worked.',
        'Trampa: I was worked es incorrecto para una accion normal en pasado. Usa I worked.',
      ),
    },
  ],
  steps: [
    wasWereStep({
      id: 'was_were_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'i_was',
      sentence: 'I ___ tired yesterday.',
      translation: tri('Я был уставшим вчера.', 'Я був втомлений учора.', 'I was tired yesterday.'),
      options: ['was', 'were', 'am', 'are'],
      correctAnswer: 'was',
      correctFeedback: tri('Да. I в прошлом с be дает was.', 'Так. I у минулому з be дає was.', 'Yes. I takes was.'),
      wrong: {
        were: tri('Were идет с you/we/they. С I здесь нужен was.', 'Were йде з you/we/they. З I тут потрібен was.', 'I takes was, not were.'),
        am: tri('Am говорит о сейчас. Yesterday просит прошлое: was.', 'Am говорить про зараз. Yesterday просить минуле: was.', 'Yesterday needs was.'),
        are: tri('Are не подходит к I и не подходит к yesterday. Нужно was.', 'Are не підходить до I і не підходить до yesterday. Потрібно was.', 'Use was.'),
      },
      focusWords: ['I', 'was', 'yesterday'],
    }),
    wasWereStep({
      id: 'was_were_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'she_was',
      sentence: 'She ___ at home last night.',
      translation: tri('Она была дома вчера вечером.', 'Вона була вдома вчора ввечері.', 'She was at home last night.'),
      options: ['was', 'were', 'is', 'are'],
      correctAnswer: 'was',
      correctFeedback: tri('Да. She в прошлом с be дает was.', 'Так. She у минулому з be дає was.', 'Yes. She takes was.'),
      wrong: {
        were: tri('Were идет с you/we/they. She требует was.', 'Were йде з you/we/they. She потребує was.', 'She takes was.'),
        is: tri('Is говорит о сейчас. Last night просит was.', 'Is говорить про зараз. Last night просить was.', 'Last night needs was.'),
        are: tri('Are не подходит к she и к last night. Нужно was.', 'Are не підходить до she і до last night. Потрібно was.', 'Use was.'),
      },
      focusWords: ['she', 'was', 'last night'],
    }),
    wasWereStep({
      id: 'was_were_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'it_was',
      sentence: 'It ___ cold this morning.',
      translation: tri('Сегодня утром было холодно.', 'Сьогодні вранці було холодно.', 'It was cold this morning.'),
      options: ['was', 'were', 'is', 'are'],
      correctAnswer: 'was',
      correctFeedback: tri('Да. Для погоды в прошлом: it was cold.', 'Так. Для погоди в минулому: it was cold.', 'Yes. Weather in the past: it was cold.'),
      wrong: {
        were: tri('It требует was, не were.', 'It потребує was, не were.', 'It takes was.'),
        is: tri('Is говорит о сейчас. Здесь нужен прошлый вариант: was.', 'Is говорить про зараз. Тут потрібен минулий варіант: was.', 'Use was.'),
        are: tri('Are не используется с it. Нужно was.', 'Are не використовується з it. Потрібно was.', 'Use was.'),
      },
      focusWords: ['it', 'was', 'cold'],
    }),
    wasWereStep({
      id: 'was_were_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'they_were',
      sentence: 'They ___ busy yesterday.',
      translation: tri('Они были заняты вчера.', 'Вони були зайняті вчора.', 'They were busy yesterday.'),
      options: ['was', 'were', 'are', 'is'],
      correctAnswer: 'were',
      correctFeedback: tri('Да. They в прошлом с be дает were.', 'Так. They у минулому з be дає were.', 'Yes. They takes were.'),
      wrong: {
        was: tri('Was идет с I/he/she/it. They требует were.', 'Was йде з I/he/she/it. They потребує were.', 'They takes were.'),
        are: tri('Are говорит о сейчас. Yesterday просит were.', 'Are говорить про зараз. Yesterday просить were.', 'Yesterday needs were.'),
        is: tri('Is не подходит к they и к yesterday. Нужно were.', 'Is не підходить до they і до yesterday. Потрібно were.', 'Use were.'),
      },
      focusWords: ['they', 'were', 'yesterday'],
    }),
    wasWereStep({
      id: 'was_were_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'we_were',
      sentence: 'We ___ in Dublin in 2020.',
      translation: tri('Мы были в Дублине в 2020 году.', 'Ми були в Дубліні у 2020 році.', 'We were in Dublin in 2020.'),
      options: ['was', 'were', 'are', 'am'],
      correctAnswer: 'were',
      correctFeedback: tri('Да. We требует were в прошлом.', 'Так. We потребує were у минулому.', 'Yes. We takes were.'),
      wrong: {
        was: tri('Was не используется с we. Нужно were.', 'Was не використовується з we. Потрібно were.', 'Use were.'),
        are: tri('Are говорит о сейчас. In 2020 просит were.', 'Are говорить про зараз. In 2020 просить were.', 'In 2020 needs were.'),
        am: tri('Am используется с I и сейчас. We in 2020 требует were.', 'Am використовується з I і зараз. We in 2020 потребує were.', 'Use were.'),
      },
      focusWords: ['we', 'were', 'in 2020'],
    }),
    wasWereStep({
      id: 'was_were_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'you_were',
      sentence: 'You ___ right.',
      translation: tri('Ты был прав.', 'Ти мав рацію.', 'You were right.'),
      options: ['was', 'were', 'is', 'am'],
      correctAnswer: 'were',
      correctFeedback: tri('Да. You в прошлом с be дает were.', 'Так. You у минулому з be дає were.', 'Yes. You takes were.'),
      wrong: {
        was: tri('В стандартной речи you требует were, не was.', 'У стандартній мові you потребує were, не was.', 'You takes were.'),
        is: tri('Is не используется с you. Если прошлое, нужно were.', 'Is не використовується з you. Якщо минуле, потрібно were.', 'Use were.'),
        am: tri('Am используется только с I. You требует were в прошлом.', 'Am використовується тільки з I. You потребує were у минулому.', 'Use were.'),
      },
      focusWords: ['you', 'were'],
    }),
    wasWereStep({
      id: 'was_were_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'past_marker_not_is',
      sentence: 'He ___ late yesterday.',
      translation: tri('Он опоздал вчера.', 'Він запізнився вчора.', 'He was late yesterday.'),
      options: ['is', 'was', 'were', 'are'],
      correctAnswer: 'was',
      correctFeedback: tri('Да. Yesterday показывает прошлое. He требует was.', 'Так. Yesterday показує минуле. He потребує was.', 'Yes. Yesterday needs was.'),
      wrong: {
        is: tri('Is говорит о сейчас. С yesterday нужен was.', 'Is говорить про зараз. З yesterday потрібен was.', 'Use was.'),
        were: tri('He требует was, не were.', 'He потребує was, не were.', 'He takes was.'),
        are: tri('Are не подходит к he и к yesterday. Нужно was.', 'Are не підходить до he і до yesterday. Потрібно was.', 'Use was.'),
      },
      focusWords: ['he', 'was', 'yesterday'],
    }),
    wasWereStep({
      id: 'was_were_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'past_marker_not_are',
      sentence: 'The rooms ___ clean last week.',
      translation: tri('Комнаты были чистыми на прошлой неделе.', 'Кімнати були чистими минулого тижня.', 'The rooms were clean last week.'),
      options: ['was', 'were', 'are', 'is'],
      correctAnswer: 'were',
      correctFeedback: tri('Да. The rooms - это несколько комнат. Last week просит were.', 'Так. The rooms - це кілька кімнат. Last week просить were.', 'Yes. The rooms takes were.'),
      wrong: {
        was: tri('The rooms - несколько комнат, поэтому were, не was.', 'The rooms - кілька кімнат, тому were, не was.', 'Use were.'),
        are: tri('Are говорит о сейчас. Last week просит were.', 'Are говорить про зараз. Last week просить were.', 'Last week needs were.'),
        is: tri('Is не подходит к rooms и к last week. Нужно were.', 'Is не підходить до rooms і до last week. Потрібно were.', 'Use were.'),
      },
      focusWords: ['rooms', 'were', 'last week'],
    }),
    wasWereStep({
      id: 'was_were_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'singular_noun_was',
      sentence: 'The lesson ___ useful.',
      translation: tri('Урок был полезным.', 'Урок був корисним.', 'The lesson was useful.'),
      options: ['was', 'were', 'are', 'be'],
      correctAnswer: 'was',
      correctFeedback: tri('Да. The lesson - один урок, поэтому was.', 'Так. The lesson - один урок, тому was.', 'Yes. The lesson takes was.'),
      wrong: {
        were: tri('The lesson - один, поэтому was, не were.', 'The lesson - один, тому was, не were.', 'Use was.'),
        are: tri('Are говорит о сейчас и не подходит к одному lesson. Здесь нужно was.', 'Are говорить про зараз і не підходить до одного lesson. Тут потрібно was.', 'Use was.'),
        be: tri('Be здесь не форма для обычного утверждения в прошлом. Нужно was.', 'Be тут не форма для звичайного твердження в минулому. Потрібно was.', 'Use was.'),
      },
      focusWords: ['lesson', 'was'],
    }),
    wasWereStep({
      id: 'was_were_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'wasnt_singular',
      sentence: 'He ___ ready.',
      translation: tri('Он не был готов.', 'Він не був готовий.', "He wasn't ready."),
      options: ["wasn't", "weren't", "isn't", "aren't"],
      correctAnswer: "wasn't",
      correctFeedback: tri("Да. He требует was. В отрицании: wasn't.", "Так. He потребує was. У запереченні: wasn't.", "Yes. He takes wasn't."),
      wrong: {
        "weren't": tri("Weren't идет с you/we/they. He требует wasn't.", "Weren't йде з you/we/they. He потребує wasn't.", "He takes wasn't."),
        "isn't": tri("Isn't говорит о сейчас. Здесь “не был”, поэтому wasn't.", "Isn't говорить про зараз. Тут “не був”, тому wasn't.", "Use wasn't."),
        "aren't": tri("Aren't не подходит к he и не выражает прошлое. Нужно wasn't.", "Aren't не підходить до he і не виражає минуле. Потрібно wasn't.", "Use wasn't."),
      },
      focusWords: ['he', "wasn't"],
    }),
    wasWereStep({
      id: 'was_were_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'werent_plural',
      sentence: 'They ___ at home.',
      translation: tri('Они не были дома.', 'Вони не були вдома.', "They weren't at home."),
      options: ["wasn't", "weren't", "isn't", 'was'],
      correctAnswer: "weren't",
      correctFeedback: tri("Да. They требует were. В отрицании: weren't.", "Так. They потребує were. У запереченні: weren't.", "Yes. They takes weren't."),
      wrong: {
        "wasn't": tri("Wasn't идет с I/he/she/it. They требует weren't.", "Wasn't йде з I/he/she/it. They потребує weren't.", "They takes weren't."),
        "isn't": tri("Isn't не подходит к they и не выражает прошлое. Нужно weren't.", "Isn't не підходить до they і не виражає минуле. Потрібно weren't.", "Use weren't."),
        was: tri("Was не подходит к they и не дает отрицание. Нужно weren't.", "Was не підходить до they і не дає заперечення. Потрібно weren't.", "Use weren't."),
      },
      focusWords: ['they', "weren't"],
    }),
    wasWereStep({
      id: 'was_were_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'question_were_they',
      sentence: '___ they at work?',
      translation: tri('Они были на работе?', 'Вони були на роботі?', 'Were they at work?'),
      options: ['Was', 'Were', 'Are', 'Did'],
      correctAnswer: 'Were',
      correctFeedback: tri('Да. They требует were. В вопросе were выходит вперед.', 'Так. They потребує were. У питанні were виходить уперед.', 'Yes. Were comes first in the question.'),
      wrong: {
        Was: tri('Was не используется с they. Нужно Were they...?', 'Was не використовується з they. Потрібно Were they...?', 'Use Were they...?'),
        Are: tri('Are they at work? - это сейчас. Здесь “были”, поэтому Were they...?', 'Are they at work? - це зараз. Тут “були”, тому Were they...?', 'Use Were they...?'),
        Did: tri('С be в прошлом вопрос строится через was/were, не через did.', 'З be у минулому питання будується через was/were, не через did.', 'Use was/were, not did, with past be.'),
      },
      focusWords: ['were', 'they'],
    }),
    wasWereStep({
      id: 'was_were_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_was_were_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'I was tired / They were busy'),
      options: [
        'I was tired / They were busy',
        'I were tired / They was busy',
        'I am tired / They are busy yesterday',
        'I was tired / They was busy',
      ],
      correctAnswer: 'I was tired / They were busy',
      correctFeedback: tri('Да. I требует was. They требует were.', 'Так. I потребує was. They потребує were.', 'Yes. I was, they were.'),
      wrong: {
        'I were tired / They was busy': tri('Формы перепутаны. Нужно I was, they were.', 'Форми переплутані. Потрібно I was, they were.', 'Use I was, they were.'),
        'I am tired / They are busy yesterday': tri('Am/are говорят о сейчас. С прошлым нужны was/were.', 'Am/are говорять про зараз. З минулим потрібні was/were.', 'Use was/were.'),
        'I was tired / They was busy': tri('Первая часть правильная, но they требует were, не was.', 'Перша частина правильна, але they потребує were, не was.', 'They takes were.'),
      },
      focusWords: ['was', 'were'],
    }),
    wasWereStep({
      id: 'was_were_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_negative_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Выбери правильную пару.', 'Обери правильну пару.', "He wasn't ready / We weren't ready"),
      options: [
        "He wasn't ready / We weren't ready",
        "He weren't ready / We wasn't ready",
        "He isn't ready / We aren't ready yesterday",
        "He wasn't ready / We wasn't ready",
      ],
      correctAnswer: "He wasn't ready / We weren't ready",
      correctFeedback: tri("Да. He wasn't, но we weren't.", "Так. He wasn't, але we weren't.", "Yes. He wasn't, we weren't."),
      wrong: {
        "He weren't ready / We wasn't ready": tri("Формы перепутаны. Нужно He wasn't, we weren't.", "Форми переплутані. Потрібно He wasn't, we weren't.", "Use He wasn't / We weren't."),
        "He isn't ready / We aren't ready yesterday": tri("Isn't/aren't говорят о сейчас. Для прошлого нужны wasn't/weren't.", "Isn't/aren't говорять про зараз. Для минулого потрібні wasn't/weren't.", "Use wasn't/weren't."),
        "He wasn't ready / We wasn't ready": tri("He wasn't правильно. We требует weren't.", "He wasn't правильно. We потребує weren't.", "We takes weren't."),
      },
      focusWords: ["wasn't", "weren't"],
    }),
    wasWereStep({
      id: 'was_were_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'She was at home, but they were at work.'),
      options: [
        'She was at home, but they were at work.',
        'She were at home, but they was at work.',
        'She is at home yesterday, but they are at work yesterday.',
        'She was worked at home, but they were worked at work.',
      ],
      correctAnswer: 'She was at home, but they were at work.',
      correctFeedback: tri(
        'Да. She требует was, they требует were. At home / at work описывает место.',
        'Так. She потребує was, they потребує were. At home / at work описує місце.',
        'Yes. She was, they were.',
      ),
      wrong: {
        'She were at home, but they was at work.': tri('Формы перепутаны. Нужно She was, they were.', 'Форми переплутані. Потрібно She was, they were.', 'Use She was, they were.'),
        'She is at home yesterday, but they are at work yesterday.': tri('Is/are не подходят к yesterday. Нужно was/were.', 'Is/are не підходять до yesterday. Потрібно was/were.', 'Use was/were.'),
        'She was worked at home, but they were worked at work.': tri(
          'Was/were worked здесь неверно. Для места нужно was/were at home/work. Для действия нужно worked без was/were.',
          'Was/were worked тут неправильно. Для місця потрібно was/were at home/work. Для дії потрібно worked без was/were.',
          'Do not use was/were worked here. Use worked for the action.',
        ),
      },
      focusWords: ['she was', 'they were'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'was_were_subject_agreement_error',
      'present_be_with_past_marker_error',
      'was_with_plural_subject_error',
      'were_with_singular_subject_error',
      'negative_wasnt_werent_error',
      'question_order_error',
      'was_were_plus_past_verb_error',
      'there_was_were_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri(
      'Обычное объяснение: покажи, о ком фраза, и нужную форму was/were.',
      'Звичайне пояснення: покажи, про кого фраза, і потрібну форму was/were.',
      'Explicacion normal: muestra de quien habla la frase y la forma correcta was/were.',
    ),
    depth2: tri(
      'Проще: раздели на две группы: I/he/she/it или you/we/they.',
      'Простіше: розділи на дві групи: I/he/she/it або you/we/they.',
      'Mas simple: separa en I/he/she/it o you/we/they.',
    ),
    depth3: tri(
      'Еще проще: готовые пары I was / they were.',
      'Ще простіше: готові пари I was / they were.',
      'Aun mas simple: I was / they were.',
    ),
    depth4: tri(
      'Почти подсказка: прямо укажи was или were.',
      'Майже підказка: прямо вкажи was або were.',
      'Casi una pista: senala directamente was o were.',
    ),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        "Это be в прошлом. I/he/she/it = was. You/we/they = were. Отрицание: wasn't/weren't. Вопрос: Was he...? Were they...?",
        "Це be у минулому. I/he/she/it = was. You/we/they = were. Заперечення: wasn't/weren't. Питання: Was he...? Were they...?",
        "Be en pasado: I/he/she/it was. You/we/they were. Negativa: wasn't/weren't. Pregunta: Was/Were primero.",
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_subject_group_hint_then_retry',
      card: tri(
        'Подсказка: система покажет, фраза относится к группе was или were, но не выберет ответ за тебя.',
        'Підказка: система покаже, фраза належить до групи was чи were, але не вибере відповідь за тебе.',
        'Pista: el sistema muestra el grupo was/were, pero no elige la respuesta.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Guided mode: сначала выбери группу I/he/she/it или you/we/they. Потом проверь: утверждение, отрицание или вопрос.',
        'Guided mode: спочатку обери групу I/he/she/it або you/we/they. Потім перевір: твердження, заперечення чи питання.',
        'Modo guiado: primero elige el grupo, luego afirmacion, negativa o pregunta.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_was_were_001',
        prompt: tri('I в прошлом с be дает was или were?', 'I у минулому з be дає was чи were?', 'I con be en pasado: was o were?'),
        options: ['was', 'were'],
        correctIndex: 0,
        thenReturnToExerciseId: 'was_were_easy_001',
      },
      {
        id: 'guided_was_were_002',
        prompt: tri('They в прошлом с be дает was или were?', 'They у минулому з be дає was чи were?', 'They con be en pasado: was o were?'),
        options: ['was', 'were'],
        correctIndex: 1,
        thenReturnToExerciseId: 'was_were_contrast_001',
      },
      {
        id: 'guided_was_were_003',
        prompt: tri('You в прошлом с be дает was или were?', 'You у минулому з be дає was чи were?', 'You con be en pasado: was o were?'),
        options: ['was', 'were'],
        correctIndex: 1,
        thenReturnToExerciseId: 'was_were_contrast_003',
      },
      {
        id: 'guided_was_were_004',
        prompt: tri(
          'В вопросе Were they at work? were стоит перед they или после they?',
          'У питанні Were they at work? were стоїть перед they чи після they?',
          'En Were they at work?, were va antes o despues de they?',
        ),
        options: ['before they', 'after they'],
        correctIndex: 0,
        thenReturnToExerciseId: 'was_were_mixed_003',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_was_were',
    diagnosisLabel: tri('Was / Were', 'Was / Were', 'Was / Were'),
    contrastSet: CONTRAST,
    focusWords: ['was', 'were', "wasn't", "weren't", 'yesterday', 'last night'],
    focusPatterns: [
      'i_was',
      'she_was',
      'it_was',
      'they_were',
      'we_were',
      'you_were',
      'past_marker_not_is',
      'past_marker_not_are',
      'singular_noun_was',
      'wasnt_singular',
      'werent_plural',
      'question_were_they',
      'mixed_was_were_pair',
      'mixed_negative_pair',
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
    start: 'diagnosis_training_verb_was_were_start',
    answer: 'diagnosis_training_verb_was_were_answer',
    mastery: 'diagnosis_training_verb_was_were_mastery',
    recovery: 'diagnosis_training_verb_was_were_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'verb_was_were',
      contrastSet: ['was', 'were', 'am/is/are', "wasn't", "weren't", 'question order'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logSubjectGroup: true,
      logBePastForm: true,
      logSentencePolarity: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_was_were',
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
