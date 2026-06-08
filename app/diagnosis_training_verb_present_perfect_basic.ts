import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const PRESENT_PERFECT_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre Present Perfect ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về Present Perfect này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan Present Perfect ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu Present Perfect açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie Present Perfect nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? PRESENT_PERFECT_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'have + V3',
  'has + V3',
  'past participle',
  'already',
  'yet',
  'ever',
  'never',
  'result now',
  'life experience',
  'past simple',
];

const SMART_CONTRAST = [
  'have + V3',
  'has + V3',
  'past participle',
  'already',
  'yet',
  'ever',
  'never',
  'result now',
  'past simple',
];

const MODEL = tri(
  'Present Perfect держится на короткой связке: have или has плюс V3. I have finished. She has seen. Он нужен, когда важен результат сейчас, опыт до этого момента или смысл уже / еще не.',
  'Present Perfect тримається на короткій зв’язці: have або has плюс V3. I have finished. She has seen. Він потрібен, коли важливий результат зараз, досвід до цього моменту або зміст вже / ще не.',
  'Present Perfect usa un patron corto: have o has mas V3. I have finished. She has seen. Usalo para resultado ahora, experiencia hasta ahora, already o not yet.',
  {
    'pt-BR': 'O Present Perfect usa uma estrutura curta: have ou has + V3. I have finished. She has seen. Ele serve quando importa o resultado agora, a experiência até este momento ou a ideia de already / not yet.',
    vi: 'Present Perfect dựa trên cấu trúc ngắn: have hoặc has + V3. I have finished. She has seen. Dùng khi kết quả hiện tại quan trọng, khi nói về trải nghiệm đến lúc này, hoặc ý already / not yet.',
    id: 'Present Perfect memakai pola singkat: have atau has + V3. I have finished. She has seen. Gunakan saat hasilnya penting sekarang, untuk pengalaman sampai saat ini, atau makna already / not yet.',
    tr: 'Present Perfect kısa bir yapıya dayanır: have veya has + V3. I have finished. She has seen. Sonuç şu anda önemliyse, şimdiye kadarki deneyimden söz ediyorsan ya da already / not yet anlamı varsa kullanılır.',
    pl: 'Present Perfect opiera się na krótkim układzie: have albo has + V3. I have finished. She has seen. Używa się go, gdy ważny jest wynik teraz, doświadczenie do tej chwili albo sens already / not yet.',
  },
);

const PRESENT_PERFECT_SKILL_ES: Record<string, string> = {
  have_finished: 'Con I usa have y luego V3: finished.',
  has_finished: 'Con she usa has y luego V3: finished.',
  have_left: 'Con they usa have; already va antes de left.',
  have_seen_not_saw: 'Despues de have usa V3: seen, no saw.',
  has_been_experience: 'Para experiencia con she, usa has been.',
  has_been: 'Para experiencia con she, usa has been.',
  have_bought_result: 'Despues de have usa V3: bought.',
  have_bought: 'Despues de have usa V3: bought.',
  already_position: 'Already suele ir antes de V3.',
  yet_negative: 'En negativo, not yet suele cerrar con yet.',
  yet_question: 'En pregunta, yet suele ir al final.',
  ever_question: 'Para preguntar por experiencia, usa ever.',
  ever_experience: 'Para preguntar por experiencia, usa ever.',
  never_experience: 'Never muestra que la experiencia no existe.',
  question_order_have: 'En pregunta, have va delante del sujeto.',
  result_now_lost: 'Con he usa has; lost muestra resultado ahora.',
  perfect_result_now: 'Con he usa has; V3 muestra resultado ahora.',
  already_done: 'Already va antes de done.',
  past_simple_with_yesterday: 'Con yesterday normalmente usa Past Simple.',
  mixed_sentence_correction: 'Usa already done, has not seen y yet al final.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = PRESENT_PERFECT_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? PRESENT_PERFECT_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function presentPerfectEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = PRESENT_PERFECT_SKILL_ES[input.targetSkill] ?? 'Busca have/has y despues una forma V3.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(correct: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала найди have или has.',
      'Спочатку знайди have або has.',
      'Primero encuentra have o has.',
    ),
    tri(
      'С I, you, we, they обычно идет have. С he, she, it обычно идет has.',
      'З I, you, we, they зазвичай іде have. З he, she, it зазвичай іде has.',
      'I, you, we, they suelen usar have. He, she, it suelen usar has.',
    ),
    tri(
      'После have или has нужна третья форма глагола. Не обычная форма и не форма с -ing.',
      'Пiсля have або has потрiбна третя форма дiєслова. Не звичайна форма i не форма з -ing.',
      'Despues de have o has, usa V3: done, seen, been, finished, lost.',
    ),
    tri(
      'Здесь выбери вариант, где есть have или has, третья форма и правильное место для уже/еще.',
      'Тут обери варiант, де є have або has, третя форма i правильне мiсце для вже/ще.',
      `La respuesta aqui es: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Проверь have/has и V3. Здесь нужно: ${correct}.`,
    `Майже. Перевір have/has і V3. Тут потрібно: ${correct}.`,
    `Casi. Revisa have/has y V3. Usa: ${correct}.`,
  );
}

function perfectStep(input: {
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
  const esFeedback = presentPerfectEsFeedback(input);
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
      'Выбери вариант, где правильно собраны have/has, V3 и слова already, yet, ever или never.',
      'Обери варіант, де правильно зібрані have/has, V3 і слова already, yet, ever або never.',
      'Elige la opcion con have/has, V3 y already, yet, ever o never correctos.',
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
      'Скелет такой: I have done, she has done. Already чаще ставим перед V3. Yet чаще идет в конце вопроса или отрицания.',
      'Скелет такий: I have done, she has done. Already частіше ставимо перед V3. Yet частіше йде в кінці питання або заперечення.',
      'Patron: I have done, she has done. Already suele ir antes de V3. Yet suele ir al final de preguntas o negaciones.',
    ),
    focusWords: input.focusWords,
  };
}

const WRONG_MIXED_DID_CURLY = 'I have already did it, but she hasn’t seen the result already.';
const WRONG_MIXED_DID_YET = "I have already did it, but she hasn't seen the result yet.";

export const VERB_PRESENT_PERFECT_BASIC_TRAINING: DiagnosisTraining = {
  id: 'verb_present_perfect_basic',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 38,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'Present Perfect: have/has + V3',
    'Present Perfect: have/has + V3',
    'Present Perfect: have/has + V3',
    {
      'pt-BR': 'Present Perfect: have/has + V3',
      vi: 'Present Perfect: have/has + V3',
      id: 'Present Perfect: have/has + V3',
      tr: 'Present Perfect: have/has + V3',
      pl: 'Present Perfect: have/has + V3',
    },
  ),
  shortTitle: tri('Present Perfect', 'Present Perfect', 'Present Perfect', {
    'pt-BR': 'Present Perfect',
    vi: 'Present Perfect',
    id: 'Present Perfect',
    tr: 'Present Perfect',
    pl: 'Present Perfect',
  }),
  shortDiagnosis: tri(
    'Ты пытаешься сказать про результат сейчас, но ломаешь связку: have saw, has finish, I have lost my keys yesterday.',
    'Ти намагаєшся сказати про результат зараз, але ламаєш зв’язку: have saw, has finish, I have lost my keys yesterday.',
    'Intentas hablar de un resultado ahora, pero rompes el patron: have saw, has finish, I have lost my keys yesterday.',
    {
      'pt-BR': 'Você tenta falar de um resultado agora, mas quebra a estrutura: have saw, has finish, I have lost my keys yesterday.',
      vi: 'Bạn đang cố nói về kết quả hiện tại, nhưng làm sai cấu trúc: have saw, has finish, I have lost my keys yesterday.',
      id: 'Kamu mencoba berbicara tentang hasil sekarang, tetapi merusak polanya: have saw, has finish, I have lost my keys yesterday.',
      tr: 'Şimdiki sonucu anlatmaya çalışıyorsun ama yapıyı bozuyorsun: have saw, has finish, I have lost my keys yesterday.',
      pl: 'Próbujesz mówić o wyniku teraz, ale rozbijasz strukturę: have saw, has finish, I have lost my keys yesterday.',
    },
  ),
  diagnosisText: tri(
    'Ошибка обычно не в идее. Идея нормальная: действие уже случилось, и сейчас есть результат. Ломается форма. Для Present Perfect английскому нужны have или has и V3: have seen, has finished, have done.',
    'Помилка зазвичай не в ідеї. Ідея нормальна: дія вже сталася, і зараз є результат. Ламається форма. Для Present Perfect англійській потрібні have або has і V3: have seen, has finished, have done.',
    'La idea suele estar bien: algo ha pasado y ahora hay un resultado. Lo que se rompe es la forma. Present Perfect necesita have o has mas V3: have seen, has finished, have done.',
    {
      'pt-BR': 'O erro geralmente não está na ideia. A ideia faz sentido: a ação já aconteceu e agora há um resultado. O que quebra é a forma. Para o Present Perfect, o inglês precisa de have ou has + V3: have seen, has finished, have done.',
      vi: 'Lỗi thường không nằm ở ý tưởng. Ý tưởng vẫn đúng: hành động đã xảy ra và hiện tại có kết quả. Phần sai là hình thức. Với Present Perfect, tiếng Anh cần have hoặc has + V3: have seen, has finished, have done.',
      id: 'Kesalahannya biasanya bukan pada idenya. Idenya masuk akal: sesuatu sudah terjadi dan sekarang ada hasilnya. Yang rusak adalah bentuknya. Present Perfect membutuhkan have atau has + V3: have seen, has finished, have done.',
      tr: 'Hata genellikle fikirde değildir. Fikir doğru: eylem olmuş ve şimdi bir sonuç var. Bozulan kısım biçimdir. Present Perfect için İngilizcede have veya has + V3 gerekir: have seen, has finished, have done.',
      pl: 'Błąd zwykle nie leży w samej idei. Idea jest dobra: czynność już się wydarzyła i teraz jest wynik. Psuje się forma. W Present Perfect angielski potrzebuje have albo has + V3: have seen, has finished, have done.',
    },
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    'Для I, you, we, they обычно берем have. Для he, she, it обычно берем has. После этого нужна третья форма глагола. Already чаще стоит перед ней, yet часто уходит в конец вопроса или отрицания.',
    'Для I, you, we, they зазвичай беремо have. Для he, she, it зазвичай беремо has. Пiсля цього потрiбна третя форма дiєслова. Already частiше стоїть перед нею, yet часто йде в кiнець питання або заперечення.',
    'I/you/we/they usan have + V3: I have finished. He/she/it usan has + V3: She has finished. Already suele ir antes de V3. Yet suele ir al final.',
    {
      'pt-BR': 'I, you, we, they geralmente usam have + V3: I have finished. He, she, it geralmente usam has + V3: She has finished. Already costuma vir antes de V3. Yet costuma ir no fim.',
      vi: 'I, you, we, they thường dùng have + V3: I have finished. He, she, it thường dùng has + V3: She has finished. Already thường đứng trước V3. Yet thường đứng cuối câu.',
      id: 'I, you, we, they biasanya memakai have + V3: I have finished. He, she, it biasanya memakai has + V3: She has finished. Already biasanya sebelum V3. Yet biasanya di akhir.',
      tr: 'I, you, we, they genellikle have + V3 kullanır: I have finished. He, she, it genellikle has + V3 kullanır: She has finished. Already çoğu zaman V3 önünde durur. Yet çoğu zaman sonda durur.',
      pl: 'I, you, we, they zwykle używają have + V3: I have finished. He, she, it zwykle używają has + V3: She has finished. Already zwykle stoi przed V3. Yet zwykle idzie na koniec.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Present Perfect собирается через have/has + V3.',
      'С I, you, we, they обычно используем have: I have seen it.',
      'С he, she, it обычно используем has: she has seen it.',
      'После have/has нужен V3: have seen, не have saw.',
      'Already значит "уже" и чаще стоит перед V3: I have already finished.',
      'Yet часто идет в конце вопроса или отрицания: Have you finished yet? I have not finished yet.',
      'Ever часто спрашивает об опыте: Have you ever been there?',
      'Never говорит, что такого опыта нет: I have never been there.',
      'Если есть точное прошлое время вроде yesterday, часто нужен Past Simple.',
    ],
    uk: [
      'Present Perfect збирається через have/has + V3.',
      'З I, you, we, they зазвичай використовуємо have: I have seen it.',
      'З he, she, it зазвичай використовуємо has: she has seen it.',
      'Після have/has потрібен V3: have seen, не have saw.',
      'Already означає "вже" і частіше стоїть перед V3: I have already finished.',
      'Yet часто йде в кінці питання або заперечення: Have you finished yet? I have not finished yet.',
      'Ever часто питає про досвід: Have you ever been there?',
      'Never говорить, що такого досвіду немає: I have never been there.',
      'Якщо є точний минулий час на кшталт yesterday, часто потрібен Past Simple.',
    ],
    es: [
      'Present Perfect se arma con have/has + V3.',
      'I, you, we, they suelen usar have: I have seen it.',
      'He, she, it suelen usar has: she has seen it.',
      'Despues de have/has, usa V3: have seen, no have saw.',
      'Already suele estar antes de V3: I have already finished.',
      'Yet suele ir al final de preguntas o negaciones.',
      'Ever suele preguntar por experiencia.',
      'Never dice que esa experiencia no existe.',
      'Un tiempo pasado especifico como yesterday suele necesitar Past Simple.',
    ],
    'pt-BR': [
      'Present Perfect usa have/has + V3.',
      'I, you, we, they geralmente usam have: I have seen it.',
      'He, she, it geralmente usam has: she has seen it.',
      'Depois de have/has, use V3: have seen, não have saw.',
      'Already muitas vezes fica antes de V3: I have already finished.',
      'Yet muitas vezes vai no fim de perguntas ou negativas.',
      'Ever muitas vezes pergunta sobre experiência.',
      'Never diz que a experiência não existe.',
      'Um tempo passado específico como yesterday muitas vezes pede Past Simple.',
    ],
    vi: [
      'Present Perfect dùng have/has + V3.',
      'I, you, we, they thường dùng have: I have seen it.',
      'He, she, it thường dùng has: she has seen it.',
      'Sau have/has, dùng V3: have seen, không phải have saw.',
      'Already thường đứng trước V3: I have already finished.',
      'Yet thường đứng cuối câu hỏi hoặc câu phủ định.',
      'Ever thường hỏi về trải nghiệm.',
      'Never nói rằng trải nghiệm đó không có.',
      'Thời gian quá khứ cụ thể như yesterday thường cần Past Simple.',
    ],
    id: [
      'Present Perfect memakai have/has + V3.',
      'I, you, we, they biasanya memakai have: I have seen it.',
      'He, she, it biasanya memakai has: she has seen it.',
      'Setelah have/has, gunakan V3: have seen, bukan have saw.',
      'Already sering berada sebelum V3: I have already finished.',
      'Yet sering berada di akhir pertanyaan atau kalimat negatif.',
      'Ever sering bertanya tentang pengalaman.',
      'Never berarti pengalaman itu tidak ada.',
      'Waktu lampau spesifik seperti yesterday sering membutuhkan Past Simple.',
    ],
    tr: [
      'Present Perfect have/has + V3 kullanır.',
      'I, you, we, they genellikle have alır: I have seen it.',
      'He, she, it genellikle has alır: she has seen it.',
      'Have/has sonrasında V3 kullan: have seen, have saw değil.',
      'Already çoğu zaman V3 önünde durur: I have already finished.',
      'Yet çoğu zaman soru veya olumsuz cümlenin sonunda durur.',
      'Ever çoğu zaman deneyimi sorar.',
      'Never o deneyimin olmadığını söyler.',
      'Yesterday gibi belirli bir geçmiş zaman çoğu zaman Past Simple ister.',
    ],
    pl: [
      'Present Perfect używa have/has + V3.',
      'I, you, we, they zwykle używają have: I have seen it.',
      'He, she, it zwykle używają has: she has seen it.',
      'Po have/has użyj V3: have seen, nie have saw.',
      'Already często stoi przed V3: I have already finished.',
      'Yet często idzie na koniec pytania albo przeczenia.',
      'Ever często pyta o doświadczenie.',
      'Never mówi, że takiego doświadczenia nie ma.',
      'Konkretny czas przeszły jak yesterday często wymaga Past Simple.',
    ],
  },
  examples: [
    {
      en: 'I have finished the lesson.',
      ru: 'Я закончил урок.',
      uk: 'Я закінчив урок.',
      es: 'He terminado la leccion.',
      'pt-BR': 'Eu terminei a lição.',
      vi: 'Tôi đã hoàn thành bài học.',
      id: 'Saya sudah menyelesaikan pelajaran.',
      tr: 'Dersi bitirdim.',
      pl: 'Skończyłem lekcję.',
      why: tri('Have finished показывает результат сейчас: урок уже закончен.', 'Have finished показує результат зараз: урок уже закінчений.', 'Have finished muestra un resultado ahora: la leccion ya esta terminada.'),
    },
    {
      en: 'She has finished the lesson.',
      ru: 'Она закончила урок.',
      uk: 'Вона закінчила урок.',
      es: 'Ella ha terminado la leccion.',
      'pt-BR': 'Ela terminou a lição.',
      vi: 'Cô ấy đã hoàn thành bài học.',
      id: 'Dia sudah menyelesaikan pelajaran.',
      tr: 'Dersi bitirdi.',
      pl: 'Ona skończyła lekcję.',
      why: tri('С she нужен has. Дальше идет finished.', 'З she потрібен has. Далі йде finished.', 'Con she usa has. Luego va finished.'),
    },
    {
      en: 'They have already left.',
      ru: 'Они уже ушли.',
      uk: 'Вони вже пішли.',
      es: 'Ellos ya se han ido.',
      'pt-BR': 'Eles já foram embora.',
      vi: 'Họ đã rời đi rồi.',
      id: 'Mereka sudah pergi.',
      tr: 'Onlar çoktan ayrıldı.',
      pl: 'Oni już wyszli.',
      why: tri('Already дает смысл "уже", а left - V3 от leave.', 'Already дає зміст "вже", а left - V3 від leave.', 'Already da el sentido de "ya", y left es V3 de leave.'),
    },
    {
      en: "I haven't seen this film yet.",
      ru: 'Я еще не видел этот фильм.',
      uk: 'Я ще не бачив цей фільм.',
      es: 'Todavia no he visto esta pelicula.',
      'pt-BR': 'Ainda não vi este filme.',
      vi: 'Tôi vẫn chưa xem bộ phim này.',
      id: 'Saya belum menonton film ini.',
      tr: 'Bu filmi henüz izlemedim.',
      pl: 'Jeszcze nie widziałem tego filmu.',
      why: tri('Yet в конце отрицания дает смысл "еще не".', 'Yet у кінці заперечення дає зміст "ще не".', 'Yet al final de una negacion significa todavia no.'),
    },
    {
      en: 'Have you ever been to London?',
      ru: 'Ты когда-нибудь был в Лондоне?',
      uk: 'Ти коли-небудь був у Лондоні?',
      es: 'Has estado alguna vez en Londres?',
      'pt-BR': 'Você já esteve em Londres?',
      vi: 'Bạn đã từng đến London chưa?',
      id: 'Apakah kamu pernah ke London?',
      tr: 'Hiç Londra’da bulundun mu?',
      pl: 'Czy byłeś kiedyś w Londynie?',
      why: tri('Ever спрашивает об опыте до текущего момента.', 'Ever питає про досвід до поточного моменту.', 'Ever pregunta por experiencia hasta ahora.'),
    },
    {
      en: 'I have never tried it.',
      ru: 'Я никогда этого не пробовал.',
      uk: 'Я ніколи цього не пробував.',
      es: 'Nunca lo he probado.',
      'pt-BR': 'Nunca experimentei isso.',
      vi: 'Tôi chưa bao giờ thử nó.',
      id: 'Saya belum pernah mencobanya.',
      tr: 'Bunu hiç denemedim.',
      pl: 'Nigdy tego nie próbowałem.',
      why: tri('Never показывает, что такого опыта нет.', 'Never показує, що такого досвіду немає.', 'Never muestra que esa experiencia no existe.'),
    },
    {
      en: 'He has lost his keys.',
      ru: 'Он потерял ключи.',
      uk: 'Він загубив ключі.',
      es: 'El ha perdido sus llaves.',
      'pt-BR': 'Ele perdeu as chaves.',
      vi: 'Anh ấy đã làm mất chìa khóa.',
      id: 'Dia kehilangan kuncinya.',
      tr: 'Anahtarlarını kaybetti.',
      pl: 'On zgubił klucze.',
      why: tri('Результат важен сейчас: ключей нет.', 'Результат важливий зараз: ключів немає.', 'El resultado importa ahora: no estan las llaves.'),
    },
    {
      en: 'I lost my keys yesterday.',
      ru: 'Я потерял ключи вчера.',
      uk: 'Я загубив ключі вчора.',
      es: 'Perdi mis llaves ayer.',
      'pt-BR': 'Perdi minhas chaves ontem.',
      vi: 'Hôm qua tôi đã làm mất chìa khóa.',
      id: 'Saya kehilangan kunci saya kemarin.',
      tr: 'Dün anahtarlarımı kaybettim.',
      pl: 'Zgubiłem klucze wczoraj.',
      why: tri('Yesterday называет точный момент в прошлом, поэтому здесь Past Simple.', 'Yesterday називає точний момент у минулому, тому тут Past Simple.', 'Yesterday nombra un momento pasado especifico, asi que aqui funciona Past Simple.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты либо забываешь have/has, либо после него ставишь не тот вид: have saw, has went, have did.',
        'Схоже, ти або забуваєш have/has, або після нього ставиш не той вигляд: have saw, has went, have did.',
        'Parece que olvidas have/has o usas la forma incorrecta despues: have saw, has went, have did.',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Формула короткая: сначала have или has, потом третья форма глагола. Если есть "уже", оно обычно стоит перед этой формой.',
        'Формула коротка: спочатку have або has, потiм третя форма дiєслова. Якщо є "вже", воно зазвичай стоїть перед цiєю формою.',
        'Patron corto: have/has + V3. I have done. She has seen. They have already left.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Не приклеивай Present Perfect к yesterday. Если важен конкретный вчерашний момент, обычно нужен Past Simple.',
        'Не приклеюй Present Perfect до yesterday. Якщо важливий конкретний вчорашній момент, зазвичай потрібен Past Simple.',
        'No pegues Present Perfect a yesterday. Si importa el momento concreto de ayer, normalmente Past Simple suena mejor.',
      ),
    },
  ],
  steps: [
    perfectStep({
      id: 'present_perfect_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'have_finished',
      sentence: 'I ___ finished the lesson.',
      translation: tri('Я закончил урок.', 'Я закінчив урок.', 'I have finished the lesson.'),
      options: ['have', 'has', 'am', 'did'],
      correctAnswer: 'have',
      correctFeedback: tri('Да. С I здесь нужен have: I have finished.', 'Так. З I тут потрібен have: I have finished.', 'Yes. With I, use have: I have finished.'),
      wrong: {
        has: tri('Has идет с he, she, it. С I здесь нужен have.', 'Has іде з he, she, it. З I тут потрібен have.', 'Has goes with he, she, it. With I, use have.'),
        am: tri('Am не собирает Present Perfect. Нужна связка have + V3.', 'Am не збирає Present Perfect. Потрібна зв’язка have + V3.', 'Am does not build Present Perfect. Use have + V3.'),
        did: tri('Did тянет фразу в Past Simple. Здесь нужен результат сейчас: have finished.', 'Did тягне фразу в Past Simple. Тут потрібен результат зараз: have finished.', 'Did points to Past Simple. Here use have finished.'),
      },
      focusWords: ['I', 'have', 'finished'],
    }),
    perfectStep({
      id: 'present_perfect_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'has_finished',
      sentence: 'She ___ finished the lesson.',
      translation: tri('Она закончила урок.', 'Вона закінчила урок.', 'She has finished the lesson.'),
      options: ['has', 'have', 'is', 'did'],
      correctAnswer: 'has',
      correctFeedback: tri('Верно. С she нужен has: She has finished.', 'Правильно. З she потрібен has: She has finished.', 'Correct. With she, use has: She has finished.'),
      wrong: {
        have: tri('С she нужен has, не have. Дальше уже идет finished.', 'З she потрібен has, не have. Далі вже йде finished.', 'With she, use has, not have. Then finished.'),
        is: tri('Is здесь не подходит. Для Present Perfect нужна связка has + V3.', 'Is тут не підходить. Для Present Perfect потрібна зв’язка has + V3.', 'Is does not work here. Use has + V3.'),
        did: tri('Did уводит во вчерашнюю историю. Здесь нужен результат сейчас: has finished.', 'Did веде у вчорашню історію. Тут потрібен результат зараз: has finished.', 'Did moves it to Past Simple. Here use has finished.'),
      },
      focusWords: ['she', 'has', 'finished'],
    }),
    perfectStep({
      id: 'present_perfect_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'have_left',
      sentence: 'They ___ already left.',
      translation: tri('Они уже ушли.', 'Вони вже пішли.', 'They have already left.'),
      options: ['have', 'has', 'are', 'did'],
      correctAnswer: 'have',
      correctFeedback: tri('Да. They have already left: уже ушли, и это важно сейчас.', 'Так. They have already left: уже пішли, і це важливо зараз.', 'Yes. They have already left: they are gone now.'),
      wrong: {
        has: tri('С they нужен have, не has.', 'З they потрібен have, не has.', 'With they, use have, not has.'),
        are: tri('Are не собирает эту связку. Нужно have already left.', 'Are не збирає цю зв’язку. Потрібно have already left.', 'Are does not build this pattern. Use have already left.'),
        did: tri('Did не дружит с already left в этой фразе. Нужна связка have + already + left.', 'Did не дружить з already left у цій фразі. Потрібна зв’язка have + already + left.', 'Did does not fit already left here. Use have + already + left.'),
      },
      focusWords: ['they', 'have', 'already', 'left'],
    }),
    perfectStep({
      id: 'present_perfect_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'have_seen_not_saw',
      sentence: 'I have ___ this film.',
      translation: tri('Я видел этот фильм.', 'Я бачив цей фільм.', 'I have seen this film.'),
      options: ['seen', 'saw', 'see', 'seeing'],
      correctAnswer: 'seen',
      correctFeedback: tri('Да. После have нужен seen: I have seen this film.', 'Так. Після have потрібен seen: I have seen this film.', 'Yes. After have, use seen: I have seen this film.'),
      wrong: {
        saw: tri('Saw - это Past Simple. После have нужен seen: I have seen.', 'Saw - це Past Simple. Після have потрібен seen: I have seen.', 'Saw is Past Simple. After have, use seen.'),
        see: tri('See слишком обычное для этой связки. После have нужен seen.', 'See занадто звичайне для цієї зв’язки. Після have потрібен seen.', 'See is too plain for this pattern. After have, use seen.'),
        seeing: tri('Seeing здесь не закрывает связку have + V3. Нужен seen.', 'Seeing тут не закриває зв’язку have + V3. Потрібен seen.', 'Seeing does not complete have + V3. Use seen.'),
      },
      focusWords: ['have', 'seen'],
    }),
    perfectStep({
      id: 'present_perfect_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'has_been_experience',
      sentence: 'She has ___ to London.',
      translation: tri('Она бывала в Лондоне.', 'Вона бувала в Лондоні.', 'She has been to London.'),
      options: ['been', 'was', 'be', 'being'],
      correctAnswer: 'been',
      correctFeedback: tri('Верно. She has been to London говорит об опыте.', 'Правильно. She has been to London говорить про досвід.', 'Correct. She has been to London talks about experience.'),
      wrong: {
        was: tri('Was работает в Past Simple. После has здесь нужен been.', 'Was працює в Past Simple. Після has тут потрібен been.', 'Was belongs to Past Simple. After has, use been.'),
        be: tri('Be не закрывает связку has + V3. Нужен been.', 'Be не закриває зв’язку has + V3. Потрібен been.', 'Be does not complete has + V3. Use been.'),
        being: tri('Being здесь лишнее. Для опыта нужна короткая форма: has been.', 'Being тут зайве. Для досвіду потрібна коротка форма: has been.', 'Being is not the right form here. Use has been.'),
      },
      focusWords: ['has', 'been'],
    }),
    perfectStep({
      id: 'present_perfect_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'have_bought_result',
      sentence: 'We have ___ a new phone.',
      translation: tri('Мы купили новый телефон.', 'Ми купили новий телефон.', 'We have bought a new phone.'),
      options: ['bought', 'buy', 'buyed', 'buying'],
      correctAnswer: 'bought',
      correctFeedback: tri('Да. После have нужна третья форма глагола, поэтому выбираем bought.', 'Так. Пiсля have потрiбна третя форма дiєслова, тому обираємо bought.', 'Yes. After have, use bought.'),
      wrong: {
        buy: tri('Buy слишком обычное после have. Нужен bought.', 'Buy занадто звичайне після have. Потрібен bought.', 'Buy is too plain after have. Use bought.'),
        buyed: tri('Buyed не работает. У buy нужная форма bought.', 'Buyed не працює. У buy потрібна форма bought.', 'Buyed does not work. Use bought.'),
        buying: tri('Buying здесь не собирает have + V3. Нужен bought.', 'Buying тут не збирає have + V3. Потрібен bought.', 'Buying does not build have + V3. Use bought.'),
      },
      focusWords: ['have', 'bought'],
    }),
    perfectStep({
      id: 'present_perfect_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'already_position',
      sentence: 'Choose the natural sentence.',
      translation: tri('Выбери естественную фразу: "Я уже закончил".', 'Обери природну фразу: "Я вже закінчив".', 'Choose the natural sentence: I have already finished.'),
      options: [
        'I have already finished it.',
        'I already have finished it.',
        'I have finished already it.',
        'I did already finish it.',
      ],
      correctAnswer: 'I have already finished it.',
      correctFeedback: tri('Да. Already обычно удобно стоит перед finished.', 'Так. Already зазвичай зручно стоїть перед finished.', 'Yes. Already is natural before finished.'),
      wrong: {
        'I already have finished it.': tri('Так иногда можно услышать, но базовый безопасный порядок: I have already finished it.', 'Так іноді можна почути, але базовий безпечний порядок: I have already finished it.', 'You may hear this, but the safe basic order is: I have already finished it.'),
        'I have finished already it.': tri('Already не ставим между finished и it. Бери: I have already finished it.', 'Already не ставимо між finished і it. Бери: I have already finished it.', 'Do not put already between finished and it. Use: I have already finished it.'),
        'I did already finish it.': tri('Did here changes the structure. For this meaning use have already finished.', 'Did тут змінює структуру. Для цього змісту використовуй have already finished.', 'Did changes the structure. Use have already finished here.'),
      },
      focusWords: ['have', 'already', 'finished'],
    }),
    perfectStep({
      id: 'present_perfect_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'yet_negative',
      sentence: "I haven't finished it ___.",
      translation: tri('Я еще это не закончил.', 'Я ще це не закінчив.', "I haven't finished it yet."),
      options: ['yet', 'already', 'ever', 'never'],
      correctAnswer: 'yet',
      correctFeedback: tri('Да. В отрицании "еще не" часто передается через yet в конце.', 'Так. У запереченні "ще не" часто передається через yet у кінці.', 'Yes. In a negative, not yet often ends with yet.'),
      wrong: {
        already: tri('Already дает "уже". Здесь смысл "еще не", поэтому нужен yet.', 'Already дає "вже". Тут зміст "ще не", тому потрібен yet.', 'Already means already. Here the meaning is not yet, so use yet.'),
        ever: tri('Ever спрашивает об опыте. В этой отрицательной фразе нужен yet.', 'Ever питає про досвід. У цій заперечній фразі потрібен yet.', 'Ever asks about experience. In this negative sentence, use yet.'),
        never: tri('Never значит "никогда". Здесь мягче: еще не закончил, поэтому yet.', 'Never означає "ніколи". Тут м’якше: ще не закінчив, тому yet.', 'Never means never. Here the meaning is not yet, so use yet.'),
      },
      focusWords: ['not', 'finished', 'yet'],
    }),
    perfectStep({
      id: 'present_perfect_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'ever_question',
      sentence: 'Have you ___ been to Paris?',
      translation: tri('Ты когда-нибудь был в Париже?', 'Ти коли-небудь був у Парижі?', 'Have you ever been to Paris?'),
      options: ['ever', 'never', 'yet', 'already'],
      correctAnswer: 'ever',
      correctFeedback: tri('Верно. В вопросе об опыте обычно нужен ever.', 'Правильно. У питанні про досвід зазвичай потрібен ever.', 'Correct. In an experience question, use ever.'),
      wrong: {
        never: tri('Never делает отрицательный смысл. В вопросе "когда-нибудь?" нужен ever.', 'Never робить заперечний зміст. У питанні "коли-небудь?" потрібен ever.', 'Never makes it negative. For have you ever, use ever.'),
        yet: tri('Yet обычно про "уже/еще" в вопросах и отрицаниях. Здесь вопрос об опыте: ever.', 'Yet зазвичай про "вже/ще" у питаннях і запереченнях. Тут питання про досвід: ever.', 'Yet is for not yet / already type questions. Here ask about experience: ever.'),
        already: tri('Already звучит как "ты уже был?". Для нейтрального опыта нужен ever.', 'Already звучить як "ти вже був?". Для нейтрального досвіду потрібен ever.', 'Already sounds like already. For neutral experience, use ever.'),
      },
      focusWords: ['have', 'ever', 'been'],
    }),
    perfectStep({
      id: 'present_perfect_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'never_experience',
      sentence: 'I have ___ tried sushi.',
      translation: tri('Я никогда не пробовал суши.', 'Я ніколи не пробував суші.', 'I have never tried sushi.'),
      options: ['never', 'ever', 'yet', 'already'],
      correctAnswer: 'never',
      correctFeedback: tri('Да. Never показывает, что такого опыта нет.', 'Так. Never показує, що такого досвіду немає.', 'Yes. Never shows that the experience is absent.'),
      wrong: {
        ever: tri('Ever чаще нужен в вопросе: Have you ever tried...? Здесь утверждение с отрицательным смыслом: never.', 'Ever частіше потрібен у питанні: Have you ever tried...? Тут твердження із заперечним змістом: never.', 'Ever is usually for questions. Here use never.'),
        yet: tri('Yet звучит как "еще не", но здесь устойчивее: I have never tried sushi.', 'Yet звучить як "ще не", але тут природніше: I have never tried sushi.', 'Yet means not yet. Here use never.'),
        already: tri('Already значит "уже", а смысл обратный: never.', 'Already означає "вже", а зміст протилежний: never.', 'Already means already. The meaning is the opposite: never.'),
      },
      focusWords: ['have', 'never', 'tried'],
    }),
    perfectStep({
      id: 'present_perfect_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'question_order_have',
      sentence: 'Choose the natural question.',
      translation: tri('Выбери естественный вопрос: "Ты уже закончил?"', 'Обери природне питання: "Ти вже закінчив?"', 'Choose the natural question: Have you finished yet?'),
      options: [
        'Have you finished it yet?',
        'You have finished it yet?',
        'Did you have finished it yet?',
        'Have finished you it yet?',
      ],
      correctAnswer: 'Have you finished it yet?',
      correctFeedback: tri('Верно. В вопросе have выходит вперед: Have you finished it yet?', 'Правильно. У питанні have виходить уперед: Have you finished it yet?', 'Correct. In a question, have comes first.'),
      wrong: {
        'You have finished it yet?': tri('Для обычного вопроса have выходит вперед: Have you finished it yet?', 'Для звичайного питання have виходить уперед: Have you finished it yet?', 'For a normal question, have comes first.'),
        'Did you have finished it yet?': tri('Did здесь лишний. Нужна связка Have you finished it yet?', 'Did тут зайвий. Потрібна зв’язка Have you finished it yet?', 'Did is extra here. Use Have you finished it yet?'),
        'Have finished you it yet?': tri('В вопросе сначала выходит have, потом человек, потом действие. Ты переставил человека и действие местами.', 'У питаннi спочатку виходить have, потiм людина, потiм дiя. Ти переставив людину й дiю мiсцями.', 'After have comes you, then finished.'),
      },
      focusWords: ['have', 'you', 'finished', 'yet'],
    }),
    perfectStep({
      id: 'present_perfect_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'result_now_lost',
      sentence: 'He ___ lost his keys.',
      translation: tri('Он потерял ключи, и сейчас их нет.', 'Він загубив ключі, і зараз їх немає.', 'He has lost his keys.'),
      options: ['has', 'have', 'is', 'did'],
      correctAnswer: 'has',
      correctFeedback: tri('Да. He has lost his keys: результат важен сейчас.', 'Так. He has lost his keys: результат важливий зараз.', 'Yes. He has lost his keys: the result matters now.'),
      wrong: {
        have: tri('С he нужен has. Фраза: He has lost his keys.', 'З he потрібен has. Фраза: He has lost his keys.', 'With he, use has.'),
        is: tri('Is lost значит другое или звучит сломанно. Для результата нужен has lost.', 'Is lost означає інше або звучить зламано. Для результату потрібно has lost.', 'Is lost means something else or sounds broken. Use has lost.'),
        did: tri('Did lost не работает. Если нужен результат сейчас, бери has lost.', 'Did lost не працює. Якщо потрібен результат зараз, бери has lost.', 'Did lost does not work. Use has lost.'),
      },
      focusWords: ['he', 'has', 'lost'],
    }),
    perfectStep({
      id: 'present_perfect_mixed_004',
      order: 13,
      difficulty: 'mixed',
      targetSkill: 'already_done',
      sentence: 'I have ___ done it.',
      translation: tri('Я уже это сделал.', 'Я вже це зробив.', 'I have already done it.'),
      options: ['already', 'yet', 'ever', 'never'],
      correctAnswer: 'already',
      correctFeedback: tri('Да. Уже сделал: I have already done it.', 'Так. Уже зробив: I have already done it.', 'Yes. Already done: I have already done it.'),
      wrong: {
        yet: tri('Yet здесь дало бы вопрос или отрицание. Для "уже" нужен already.', 'Yet тут дало б питання або заперечення. Для "вже" потрібен already.', 'Yet belongs to questions or negatives here. Use already.'),
        ever: tri('Ever спрашивает об опыте. Здесь "уже сделал": already.', 'Ever питає про досвід. Тут "уже зробив": already.', 'Ever asks about experience. Here use already.'),
        never: tri('Never значит "никогда", а смысл "уже": already.', 'Never означає "ніколи", а зміст "вже": already.', 'Never means never. Here use already.'),
      },
      focusWords: ['have', 'already', 'done'],
    }),
    perfectStep({
      id: 'present_perfect_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'past_simple_with_yesterday',
      sentence: 'Choose the natural sentence.',
      translation: tri('Выбери естественную фразу: "Я потерял ключи вчера".', 'Обери природну фразу: "Я загубив ключі вчора".', 'Choose the natural sentence: I lost my keys yesterday.'),
      options: [
        'I lost my keys yesterday.',
        'I have lost my keys yesterday.',
        'I have lost my keys.',
        'I did lost my keys yesterday.',
      ],
      correctAnswer: 'I lost my keys yesterday.',
      correctFeedback: tri('Верно. Yesterday называет точное прошлое время, поэтому здесь Past Simple.', 'Правильно. Yesterday називає точний минулий час, тому тут Past Simple.', 'Correct. Yesterday names a specific past time, so Past Simple works here.'),
      wrong: {
        'I have lost my keys yesterday.': tri('С yesterday лучше не лепить Present Perfect. Здесь нужен Past Simple: I lost my keys yesterday.', 'З yesterday краще не ліпити Present Perfect. Тут потрібен Past Simple: I lost my keys yesterday.', 'With yesterday, do not use Present Perfect here. Use Past Simple: I lost my keys yesterday.'),
        'I have lost my keys.': tri('Это нормально для результата сейчас, но в задании есть yesterday. С ним нужна фраза: I lost my keys yesterday.', 'Це нормально для результату зараз, але в завданні є yesterday. З ним потрібна фраза: I lost my keys yesterday.', 'This works for a result now, but the task includes yesterday. Use I lost my keys yesterday.'),
        'I did lost my keys yesterday.': tri('После did не ставим lost в такой фразе. Без усиления проще: I lost my keys yesterday.', 'Після did не ставимо lost у такій фразі. Без підсилення простіше: I lost my keys yesterday.', 'After did, do not use lost in this basic phrase. Use I lost my keys yesterday.'),
      },
      focusWords: ['lost', 'yesterday', 'Past Simple'],
    }),
    perfectStep({
      id: 'present_perfect_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the natural sentence.',
      translation: tri('Выбери естественную фразу: "Я уже сделал, но она еще не видела результат".', 'Обери природну фразу: "Я вже зробив, але вона ще не бачила результат".', 'Choose the natural sentence: I have already done it, but she has not seen the result yet.'),
      options: [
        "I have already done it, but she hasn't seen the result yet.",
        "I already did it, but she hasn't saw the result yet.",
        WRONG_MIXED_DID_CURLY,
        WRONG_MIXED_DID_YET,
        "I have done already it, but she haven't seen the result yet.",
      ],
      correctAnswer: "I have already done it, but she hasn't seen the result yet.",
      correctFeedback: tri('Да. Already стоит перед done, а yet закрывает "еще не" в конце.', 'Так. Already стоїть перед done, а yet закриває "ще не" в кінці.', 'Yes. Already comes before done, and yet completes not yet at the end.'),
      wrong: {
        "I already did it, but she hasn't saw the result yet.": tri('Has not saw ломает вторую часть. После has not нужен seen.', 'Has not saw ламає другу частину. Після has not потрібен seen.', 'Has not saw breaks the second part. Use seen after has not.'),
        [WRONG_MIXED_DID_CURLY]: tri('Have already did неправильно. После have нужен done. И для "еще не" в конце нужен yet.', 'Have already did неправильно. Після have потрібен done. І для "ще не" в кінці потрібен yet.', 'Have already did is wrong. After have, use done. For not yet, end with yet.'),
        [WRONG_MIXED_DID_YET]: tri('Have already did неправильно. После have нужен done.', 'Have already did неправильно. Після have потрібен done.', 'Have already did is wrong. After have, use done.'),
        "I have done already it, but she haven't seen the result yet.": tri('Already лучше перед done. И с she нужно has not, не have not.', 'Already краще перед done. І з she потрібно has not, не have not.', 'Already is better before done. With she, use has not, not have not.'),
      },
      focusWords: ['already done', "hasn't seen", 'yet'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'missing_have_has_error',
      'have_has_choice_error',
      'wrong_v3_error',
      'have_plus_simple_past_error',
      'already_position_error',
      'yet_position_error',
      'ever_never_error',
      'present_perfect_vs_past_simple_time_marker_error',
      'question_order_have_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем have/has и V3.', 'Показуємо have/has і V3.', 'Muestra have/has y V3.'),
    depth2: tri('Проверяем смысл: результат сейчас, опыт, already/yet или точное прошлое время.', 'Перевіряємо зміст: результат зараз, досвід, already/yet або точний минулий час.', 'Revisa el sentido: resultado ahora, experiencia, already/yet o tiempo pasado especifico.'),
    depth3: tri('Еще проще: если важен результат сейчас, бери связку с have или has. Если есть точное прошлое время, чаще нужен обычный прошедший вариант.', 'Ще простiше: якщо важливий результат зараз, бери звʼязку з have або has. Якщо є точний минулий час, частiше потрiбен звичайний минулий варiант.', 'Da la pareja: I have done / I did it yesterday.'),
    depth4: tri('Почти подсказка: выбирай have/has + V3 или Past Simple.', 'Майже підказка: обирай have/has + V3 або Past Simple.', 'Casi una pista: elige have/has + V3 o Past Simple.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Стоп. Present Perfect = have/has + V3. I have done. She has seen. Already перед V3. Yet часто в конце вопроса или отрицания.',
        'Стоп. Present Perfect = have/has + V3. I have done. She has seen. Already перед V3. Yet часто в кінці питання або заперечення.',
        'Alto. Present Perfect = have/has + V3. I have done. She has seen. Already antes de V3. Yet suele ir al final de preguntas o negaciones.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_perfect_structure_hint_then_retry',
      card: tri(
        'Система подсветит have или has и напомнит про V3. Ответ она не выбирает.',
        'Система підсвітить have або has і нагадає про V3. Відповідь вона не обирає.',
        'El sistema resalta have o has y recuerda V3. No elige la respuesta.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала have или has, потом V3, потом already/yet/ever/never.',
        'Режим підказки: спочатку have або has, потім V3, потім already/yet/ever/never.',
        'Modo guiado: primero have o has, luego V3, luego already/yet/ever/never.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_present_perfect_001',
        prompt: tri('С I нужен have или has?', 'З I потрібен have чи has?', 'Con I, necesitas have o has?'),
        options: ['have', 'has'],
        correctIndex: 0,
        thenReturnToExerciseId: 'present_perfect_easy_001',
      },
      {
        id: 'guided_present_perfect_002',
        prompt: tri('С she нужен have или has?', 'З she потрібен have чи has?', 'Con she, necesitas have o has?'),
        options: ['have', 'has'],
        correctIndex: 1,
        thenReturnToExerciseId: 'present_perfect_easy_002',
      },
      {
        id: 'guided_present_perfect_003',
        prompt: tri('После have: saw или seen?', 'Після have: saw чи seen?', 'Despues de have: saw o seen?'),
        options: ['saw', 'seen'],
        correctIndex: 1,
        thenReturnToExerciseId: 'present_perfect_contrast_001',
      },
      {
        id: 'guided_present_perfect_004',
        prompt: tri('Если в фразе есть точное "вчера", какой вариант обычно звучит естественнее?', 'Якщо у фразi є точне "вчора", який варiант зазвичай звучить природнiше?', 'Con yesterday, normalmente Present Perfect o Past Simple?'),
        options: ['Present Perfect', 'Past Simple'],
        correctIndex: 1,
        thenReturnToExerciseId: 'present_perfect_mixed_005',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_present_perfect_basic',
    diagnosisLabel: tri('Present Perfect', 'Present Perfect', 'Present Perfect'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['have finished', 'has finished', 'have seen', 'has been', 'already', 'yet', 'ever', 'never', 'has lost'],
    focusPatterns: [
      'have_finished',
      'has_finished',
      'have_done',
      'have_seen_not_saw',
      'has_been',
      'have_bought',
      'already_position',
      'yet_negative',
      'yet_question',
      'ever_experience',
      'never_experience',
      'question_order_have',
      'perfect_result_now',
      'past_simple_with_yesterday',
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
    start: 'diagnosis_training_verb_present_perfect_basic_start',
    answer: 'diagnosis_training_verb_present_perfect_basic_answer',
    mastery: 'diagnosis_training_verb_present_perfect_basic_mastery',
    recovery: 'diagnosis_training_verb_present_perfect_basic_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'verb',
      microDiagnosisId: 'verb_present_perfect_basic',
      contrastSet: ['have + V3', 'has + V3', 'already', 'yet', 'ever', 'never', 'past simple'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logHaveHasForm: true,
      logPastParticiple: true,
      logTimeMarker: true,
      logMeaningType: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_present_perfect_basic',
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
