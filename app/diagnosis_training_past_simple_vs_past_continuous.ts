import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const PAST_SIMPLE_CONT_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre Past Simple vs Past Continuous ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về Past Simple vs Past Continuous này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan Past Simple vs Past Continuous ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu Past Simple vs Past Continuous açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie Past Simple vs Past Continuous nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? PAST_SIMPLE_CONT_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST = [
  'past simple',
  'past continuous',
  'completed action',
  'background action',
  'interrupted action',
  'when',
  'while',
  'at that moment',
];

const SMART_CONTRAST = CONTRAST;

const MODEL = tri(
  'Здесь выбор не по русскому переводу. "Я работал" может быть фактом: I worked yesterday. А может быть процессом в момент прошлого: I was working at 8. Past Simple отвечает на "что произошло?" или "что сделал?". Past Continuous отвечает на "что происходило в тот момент?".',
  'Тут вибір не за українським перекладом. "Я працював" може бути фактом: I worked yesterday. А може бути процесом у момент минулого: I was working at 8. Past Simple відповідає на "що сталося?" або "що зробив?". Past Continuous відповідає на "що відбувалося в той момент?".',
  'La eleccion no depende de la traduccion. Past Simple responde que paso o que hizo alguien. Past Continuous responde que estaba pasando en ese momento.',
  {
    'pt-BR': 'A escolha não depende da tradução. "Eu trabalhei" pode ser um fato: I worked yesterday. Também pode ser um processo em um momento do passado: I was working at 8. Past Simple responde "o que aconteceu?" ou "o que alguém fez?". Past Continuous responde "o que estava acontecendo naquele momento?".',
    vi: 'Lựa chọn không phụ thuộc vào bản dịch. "Tôi đã làm việc" có thể là một sự việc: I worked yesterday. Nó cũng có thể là một quá trình tại một thời điểm trong quá khứ: I was working at 8. Past Simple trả lời "đã xảy ra chuyện gì?" hoặc "ai đó đã làm gì?". Past Continuous trả lời "lúc đó đang diễn ra điều gì?".',
    id: 'Pilihannya tidak bergantung pada terjemahan. "Saya bekerja" bisa menjadi fakta: I worked yesterday. Bisa juga menjadi proses pada momen masa lalu: I was working at 8. Past Simple menjawab "apa yang terjadi?" atau "apa yang dilakukan seseorang?". Past Continuous menjawab "apa yang sedang terjadi saat itu?".',
    tr: 'Seçim çeviriye bağlı değildir. "Çalıştım" bir gerçek olabilir: I worked yesterday. Geçmişteki bir anda süren bir süreç de olabilir: I was working at 8. Past Simple "ne oldu?" ya da "ne yaptı?" sorusunu yanıtlar. Past Continuous "o anda ne oluyordu?" sorusunu yanıtlar.',
    pl: 'Wybór nie zależy od tłumaczenia. "Pracowałem" może być faktem: I worked yesterday. Może też być procesem w konkretnym momencie przeszłości: I was working at 8. Past Simple odpowiada na "co się wydarzyło?" albo "co ktoś zrobił?". Past Continuous odpowiada na "co działo się w tamtym momencie?".',
  },
);

const PAST_SIMPLE_CONT_SKILL_ES: Record<string, string> = {
  past_simple_fact: 'Yesterday sin momento exacto suele ser un hecho: worked.',
  past_continuous_at_time: 'At 8 yesterday pide proceso en ese momento: was working.',
  fact_vs_process_pair: 'Hecho = worked; proceso en un momento = was working.',
  background_when_event: 'Sleeping es fondo; called es evento corto.',
  event_when_background: 'Rang es evento corto; was sleeping es fondo.',
  arrived_interrupting_action: 'Watching ya estaba en progreso cuando llegaste.',
  while_background: 'While suele introducir proceso de fondo.',
  two_parallel_actions: 'Dos procesos paralelos usan were having / were watching.',
  while_when_pair: 'While da fondo; when introduce evento.',
  sequence_past_simple: 'Acciones en secuencia usan Past Simple.',
  background_then_event: 'Cooking era el fondo; arrived fue el evento.',
  event_during_background: 'Came in es evento corto sobre fondo.',
  mixed_interruption_pair: 'Sleeping es fondo; called es evento o hecho.',
  mixed_sequence_background: 'Entered es evento; were watching era fondo.',
  mixed_sentence_correction: 'Came home es evento; cooking y sleeping son fondo.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = PAST_SIMPLE_CONT_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? PAST_SIMPLE_CONT_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function pastSimpleContEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = PAST_SIMPLE_CONT_SKILL_ES[input.targetSkill] ?? 'Decide si la accion es hecho, evento o proceso de fondo.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

function retry(correct: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(
      'Сначала реши роль действия: это факт, короткое событие или процесс на фоне?',
      'Спочатку виріши роль дії: це факт, коротка подія чи процес на фоні?',
      'Primero decide el papel de la accion: hecho, evento corto o proceso de fondo.',
    ),
    tri(
      'Если это факт или цепочка действий, чаще нужен Past Simple: worked, called, entered.',
      'Якщо це факт або ланцюжок дій, частіше потрібен Past Simple: worked, called, entered.',
      'Si es un hecho o una secuencia, usa Past Simple.',
    ),
    tri(
      'Если это процесс в тот момент или фон для другого события, чаще нужен was/were + -ing.',
      'Якщо це процес у той момент або фон для іншої події, частіше потрібен was/were + -ing.',
      'Si es un proceso en ese momento o fondo, usa was/were + -ing.',
    ),
    tri(
      'Нужный вариант выбирается по роли действия: короткое событие отдельно, процесс в момент прошлого как фон.',
      'Потрібний варіант обирається за роллю дії: коротка подія окремо, процес у момент минулого як фон.',
      `La respuesta aqui es: ${correct}.`,
    ),
  ];
}

function defaultWrong(correct: string): TriText {
  return tri(
    `Почти. Проверь роль действия: факт, событие или процесс на фоне. Здесь нужно: ${correct}.`,
    `Майже. Перевір роль дії: факт, подія чи процес на фоні. Тут потрібно: ${correct}.`,
    `Casi. Revisa el papel de la accion. Usa: ${correct}.`,
  );
}

function contrastStep(input: {
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
  const esFeedback = pastSimpleContEsFeedback(input);
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
      'Выбери Past Simple или Past Continuous по роли действия: факт, событие или процесс на фоне.',
      'Обери Past Simple або Past Continuous за роллю дії: факт, подія чи процес на фоні.',
      'Elige Past Simple o Past Continuous segun el papel de la accion.',
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
      'Коротко: worked = факт или событие. Was working = процесс в тот момент. Called/entered/rang часто короткое событие. Was sleeping/were watching часто фон.',
      'Коротко: worked = факт або подія. Was working = процес у той момент. Called/entered/rang часто коротка подія. Was sleeping/were watching часто фон.',
      'Version corta: worked = hecho o evento. Was working = proceso en ese momento. Called/entered/rang suelen ser eventos cortos. Was sleeping/were watching suelen ser fondo.',
    ),
    focusWords: input.focusWords,
  };
}

export const PAST_SIMPLE_VS_PAST_CONTINUOUS_TRAINING: DiagnosisTraining = {
  id: 'past_simple_vs_past_continuous',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 43,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri(
    'Past Simple vs Past Continuous: факт или процесс',
    'Past Simple vs Past Continuous: факт чи процес',
    'Past Simple vs Past Continuous: hecho o proceso',
    {
      'pt-BR': 'Past Simple vs Past Continuous: fato ou processo',
      vi: 'Past Simple vs Past Continuous: sự việc hay quá trình',
      id: 'Past Simple vs Past Continuous: fakta atau proses',
      tr: 'Past Simple vs Past Continuous: gerçek mi süreç mi',
      pl: 'Past Simple vs Past Continuous: fakt czy proces',
    },
  ),
  shortTitle: tri('Past: факт / процесс', 'Past: факт / процес', 'Past: hecho / proceso', {
    'pt-BR': 'Past: fato / processo',
    vi: 'Past: sự việc / quá trình',
    id: 'Past: fakta / proses',
    tr: 'Past: gerçek / süreç',
    pl: 'Past: fakt / proces',
  }),
  shortDiagnosis: tri(
    'Ты видишь один русский перевод в прошлом, но не решаешь роль действия: факт, событие или процесс на фоне.',
    'Ти бачиш один український переклад у минулому, але не вирішуєш роль дії: факт, подія чи процес на фоні.',
    'Ves una traduccion en pasado, pero no decides el papel de la accion: hecho, evento o proceso de fondo.',
    {
      'pt-BR': 'Você vê uma tradução no passado, mas não decide o papel da ação: fato, evento ou processo de fundo.',
      vi: 'Bạn thấy một bản dịch ở quá khứ, nhưng chưa quyết định vai trò của hành động: sự việc, sự kiện hay quá trình nền.',
      id: 'Kamu melihat satu terjemahan lampau, tetapi belum menentukan peran aksinya: fakta, peristiwa, atau proses latar.',
      tr: 'Geçmiş zamanlı bir çeviri görüyorsun, ama eylemin rolünü belirlemiyorsun: gerçek, olay ya da arka plan süreci.',
      pl: 'Widzisz jedno tłumaczenie w przeszłości, ale nie ustalasz roli czynności: fakt, wydarzenie czy proces w tle.',
    },
  ),
  diagnosisText: tri(
    'Ошибка появляется, когда ты выбираешь время по переводу. Английский спрашивает не "как это переводится?", а "что делает действие в сцене?". Если это факт или цепочка: I worked, I entered, the phone rang. Если это процесс, который уже шёл в тот момент: I was working, they were watching, she was sleeping.',
    'Помилка зʼявляється, коли ти обираєш час за перекладом. Англійська питає не "як це перекладається?", а "що робить дія в сцені?". Якщо це факт або ланцюжок: I worked, I entered, the phone rang. Якщо це процес, який уже тривав у той момент: I was working, they were watching, she was sleeping.',
    'El error aparece cuando eliges el tiempo por traduccion. El ingles pregunta que papel tiene la accion en la escena: hecho/evento o proceso de fondo.',
    {
      'pt-BR': 'O erro aparece quando você escolhe o tempo verbal pela tradução. O inglês não pergunta "como isso se traduz?", mas "qual papel a ação tem na cena?". Se é fato ou sequência: I worked, I entered, the phone rang. Se é um processo que já estava acontecendo naquele momento: I was working, they were watching, she was sleeping.',
      vi: 'Lỗi xuất hiện khi bạn chọn thì theo bản dịch. Tiếng Anh không hỏi "dịch thế nào?", mà hỏi "hành động có vai trò gì trong cảnh này?". Nếu là sự việc hoặc chuỗi hành động: I worked, I entered, the phone rang. Nếu là quá trình đã đang diễn ra lúc đó: I was working, they were watching, she was sleeping.',
      id: 'Kesalahan muncul ketika kamu memilih tense berdasarkan terjemahan. Bahasa Inggris tidak bertanya "ini diterjemahkan bagaimana?", tetapi "apa peran aksi ini dalam adegan?". Jika itu fakta atau rangkaian: I worked, I entered, the phone rang. Jika itu proses yang sudah berlangsung saat itu: I was working, they were watching, she was sleeping.',
      tr: 'Hata, zamanı çeviriye göre seçtiğinde ortaya çıkar. İngilizce "bu nasıl çevrilir?" diye değil, "eylem sahnede ne yapıyor?" diye sorar. Eğer gerçek ya da sıra halinde eylemse: I worked, I entered, the phone rang. Eğer o anda zaten süren bir süreçse: I was working, they were watching, she was sleeping.',
      pl: 'Błąd pojawia się, gdy wybierasz czas według tłumaczenia. Angielski nie pyta "jak to się tłumaczy?", tylko "jaką rolę ma czynność w scenie?". Jeśli to fakt albo sekwencja: I worked, I entered, the phone rang. Jeśli to proces, który już trwał w tamtym momencie: I was working, they were watching, she was sleeping.',
    },
  ),
  mentalModel: MODEL,
  contrastSet: CONTRAST,
  coreRule: tri(
    'Past Simple: факт, короткое событие или цепочка действий: I worked yesterday. The phone rang. I entered the room. Past Continuous: процесс в момент прошлого или фон: I was working at 8. They were watching TV when I entered.',
    'Past Simple: факт, коротка подія або ланцюжок дій: I worked yesterday. The phone rang. I entered the room. Past Continuous: процес у момент минулого або фон: I was working at 8. They were watching TV when I entered.',
    'Past Simple: hecho, evento o secuencia. Past Continuous: proceso en un momento pasado o fondo.',
    {
      'pt-BR': 'Past Simple: fato, evento curto ou sequência de ações: I worked yesterday. The phone rang. I entered the room. Past Continuous: processo em um momento do passado ou fundo: I was working at 8. They were watching TV when I entered.',
      vi: 'Past Simple: sự việc, sự kiện ngắn hoặc chuỗi hành động: I worked yesterday. The phone rang. I entered the room. Past Continuous: quá trình tại một thời điểm quá khứ hoặc phần nền: I was working at 8. They were watching TV when I entered.',
      id: 'Past Simple: fakta, peristiwa singkat, atau rangkaian tindakan: I worked yesterday. The phone rang. I entered the room. Past Continuous: proses pada momen masa lalu atau latar: I was working at 8. They were watching TV when I entered.',
      tr: 'Past Simple: gerçek, kısa olay ya da eylem dizisi: I worked yesterday. The phone rang. I entered the room. Past Continuous: geçmişteki bir anda süren süreç ya da arka plan: I was working at 8. They were watching TV when I entered.',
      pl: 'Past Simple: fakt, krótkie wydarzenie albo sekwencja czynności: I worked yesterday. The phone rang. I entered the room. Past Continuous: proces w momencie przeszłości albo tło: I was working at 8. They were watching TV when I entered.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Past Simple показывает факт, событие или цепочку: I worked yesterday.',
      'Past Continuous показывает процесс в момент прошлого: I was working at 8.',
      'At 8 yesterday, at that moment и while часто указывают на процесс.',
      'Yesterday без точного момента часто звучит как обычный факт.',
      'When часто вводит короткое событие: when he called.',
      'While часто вводит процесс на фоне: while I was working.',
      'Если одно действие прервало другое, фон часто стоит в Past Continuous, событие - в Past Simple.',
      'Если действия идут одно за другим, чаще используется Past Simple.',
      'Не выбирай Past Continuous только потому, что в переводе есть "работал". Реши, факт это или процесс.',
      'После was/were для процесса нужен вариант с -ing: was working, were watching.',
    ],
    uk: [
      'Past Simple показує факт, подію або ланцюжок: I worked yesterday.',
      'Past Continuous показує процес у момент минулого: I was working at 8.',
      'At 8 yesterday, at that moment і while часто вказують на процес.',
      'Yesterday без точного моменту часто звучить як звичайний факт.',
      'When часто вводить коротку подію: when he called.',
      'While часто вводить процес на фоні: while I was working.',
      'Якщо одна дія перервала іншу, фон часто стоїть у Past Continuous, подія - у Past Simple.',
      'Якщо дії йдуть одна за одною, частіше використовується Past Simple.',
      'Не обирай Past Continuous лише тому, що в перекладі є "працював". Виріши, це факт чи процес.',
      'Після was/were для процесу потрібен варіант з -ing: was working, were watching.',
    ],
    es: [
      'Past Simple muestra un hecho, evento o secuencia.',
      'Past Continuous muestra un proceso en un momento pasado.',
      'At 8 yesterday y while suelen apuntar a un proceso.',
      'Yesterday sin momento preciso suele apuntar a un hecho.',
      'When suele introducir un evento corto.',
      'While suele introducir un proceso de fondo.',
      'El fondo interrumpido suele usar Past Continuous.',
      'Las secuencias suelen usar Past Simple.',
      'Elige por papel de la accion, no por traduccion.',
      'Despues de was/were, usa -ing para el proceso.',
    ],
    'pt-BR': [
      'Past Simple mostra fato, evento ou sequência: I worked yesterday.',
      'Past Continuous mostra um processo em um momento do passado: I was working at 8.',
      'At 8 yesterday, at that moment e while muitas vezes apontam para um processo.',
      'Yesterday sem momento exato muitas vezes soa como fato comum.',
      'When muitas vezes introduz um evento curto: when he called.',
      'While muitas vezes introduz um processo de fundo: while I was working.',
      'Se uma ação interrompeu outra, o fundo costuma ficar no Past Continuous e o evento no Past Simple.',
      'Se as ações vêm uma depois da outra, costuma-se usar Past Simple.',
      'Não escolha Past Continuous só porque a tradução tem "trabalhava". Decida se é fato ou processo.',
      'Depois de was/were, o processo precisa de -ing: was working, were watching.',
    ],
    vi: [
      'Past Simple chỉ sự việc, sự kiện hoặc chuỗi hành động: I worked yesterday.',
      'Past Continuous chỉ quá trình tại một thời điểm trong quá khứ: I was working at 8.',
      'At 8 yesterday, at that moment và while thường gợi ý quá trình.',
      'Yesterday không có thời điểm chính xác thường nghe như một sự việc bình thường.',
      'When thường giới thiệu một sự kiện ngắn: when he called.',
      'While thường giới thiệu quá trình nền: while I was working.',
      'Nếu một hành động cắt ngang hành động khác, phần nền thường dùng Past Continuous, sự kiện dùng Past Simple.',
      'Nếu các hành động diễn ra nối tiếp nhau, thường dùng Past Simple.',
      'Đừng chọn Past Continuous chỉ vì bản dịch có "đã làm". Hãy quyết định đó là sự việc hay quá trình.',
      'Sau was/were, quá trình cần dạng -ing: was working, were watching.',
    ],
    id: [
      'Past Simple menunjukkan fakta, peristiwa, atau rangkaian: I worked yesterday.',
      'Past Continuous menunjukkan proses pada momen masa lalu: I was working at 8.',
      'At 8 yesterday, at that moment, dan while sering menunjuk proses.',
      'Yesterday tanpa momen tepat sering terdengar seperti fakta biasa.',
      'When sering memperkenalkan peristiwa singkat: when he called.',
      'While sering memperkenalkan proses latar: while I was working.',
      'Jika satu tindakan memotong tindakan lain, latarnya sering memakai Past Continuous dan peristiwanya Past Simple.',
      'Jika tindakan terjadi berurutan, biasanya gunakan Past Simple.',
      'Jangan memilih Past Continuous hanya karena terjemahannya terasa "sedang". Tentukan dulu fakta atau proses.',
      'Setelah was/were, proses perlu bentuk -ing: was working, were watching.',
    ],
    tr: [
      'Past Simple olgu, olay veya sıralı eylem gösterir: I worked yesterday.',
      'Past Continuous geçmişteki bir andaki süreci gösterir: I was working at 8.',
      'At 8 yesterday, at that moment ve while çoğu zaman süreci gösterir.',
      'Kesin bir an olmadan yesterday çoğu zaman sıradan bir olgu gibi duyulur.',
      'When çoğu zaman kısa bir olayı başlatır: when he called.',
      'While çoğu zaman arka plan sürecini başlatır: while I was working.',
      'Bir eylem başka bir eylemi böldüyse, arka plan çoğu zaman Past Continuous, olay Past Simple olur.',
      'Eylemler peş peşe geliyorsa çoğu zaman Past Simple kullanılır.',
      'Çeviride "çalışıyordu" hissi var diye otomatik Past Continuous seçme. Olgu mu süreç mi karar ver.',
      'Was/were sonrasında süreç için -ing gerekir: was working, were watching.',
    ],
    pl: [
      'Past Simple pokazuje fakt, wydarzenie albo sekwencję: I worked yesterday.',
      'Past Continuous pokazuje proces w momencie przeszłości: I was working at 8.',
      'At 8 yesterday, at that moment i while często wskazują proces.',
      'Yesterday bez dokładnego momentu często brzmi jak zwykły fakt.',
      'When często wprowadza krótkie wydarzenie: when he called.',
      'While często wprowadza proces w tle: while I was working.',
      'Jeśli jedno działanie przerwało drugie, tło często jest w Past Continuous, a wydarzenie w Past Simple.',
      'Jeśli działania idą jedno po drugim, częściej używa się Past Simple.',
      'Nie wybieraj Past Continuous tylko dlatego, że tłumaczenie ma "pracowałem". Zdecyduj, czy to fakt, czy proces.',
      'Po was/were proces potrzebuje -ing: was working, were watching.',
    ],
  },
  examples: [
    {
      en: 'I worked yesterday.',
      ru: 'Я работал вчера.',
      uk: 'Я працював учора.',
      es: 'Trabaje ayer.',
      'pt-BR': 'Trabalhei ontem.',
      vi: 'Hôm qua tôi đã làm việc.',
      id: 'Saya bekerja kemarin.',
      tr: 'Dün çalıştım.',
      pl: 'Pracowałem wczoraj.',
      why: tri('Это обычный факт о вчерашнем дне.', 'Це звичайний факт про вчорашній день.', 'Es un hecho simple sobre ayer.'),
    },
    {
      en: 'I was working at 8 yesterday.',
      ru: 'Я работал вчера в 8.',
      uk: 'Я працював учора о 8.',
      es: 'Ayer a las 8 estaba trabajando.',
      'pt-BR': 'Eu estava trabalhando às 8 ontem.',
      vi: 'Hôm qua lúc 8 giờ tôi đang làm việc.',
      id: 'Saya sedang bekerja jam 8 kemarin.',
      tr: 'Dün saat 8’de çalışıyordum.',
      pl: 'Pracowałem wczoraj o 8.',
      why: tri('At 8 yesterday задаёт момент. Действие шло в этот момент.', 'At 8 yesterday задає момент. Дія тривала в цей момент.', 'At 8 yesterday da un momento. La accion estaba en progreso.'),
    },
    {
      en: 'She was sleeping when I called.',
      ru: 'Она спала, когда я позвонил.',
      uk: 'Вона спала, коли я подзвонив.',
      es: 'Ella estaba durmiendo cuando llame.',
      'pt-BR': 'Ela estava dormindo quando eu liguei.',
      vi: 'Cô ấy đang ngủ khi tôi gọi.',
      id: 'Dia sedang tidur ketika saya menelepon.',
      tr: 'Ben aradığımda o uyuyordu.',
      pl: 'Spała, kiedy zadzwoniłem.',
      why: tri('Sleeping - фон, called - короткое событие.', 'Sleeping - фон, called - коротка подія.', 'Sleeping es el fondo; called es el evento corto.'),
    },
    {
      en: 'The phone rang while I was sleeping.',
      ru: 'Телефон зазвонил, пока я спал.',
      uk: 'Телефон задзвонив, поки я спав.',
      es: 'El telefono sono mientras yo dormia.',
      'pt-BR': 'O telefone tocou enquanto eu estava dormindo.',
      vi: 'Điện thoại reo khi tôi đang ngủ.',
      id: 'Telepon berdering ketika saya sedang tidur.',
      tr: 'Ben uyurken telefon çaldı.',
      pl: 'Telefon zadzwonił, kiedy spałem.',
      why: tri('Rang - событие, was sleeping - процесс на фоне.', 'Rang - подія, was sleeping - процес на фоні.', 'Rang es el evento; was sleeping es el fondo.'),
    },
    {
      en: 'While I was cooking, she was studying.',
      ru: 'Пока я готовил, она занималась.',
      uk: 'Поки я готував, вона навчалася.',
      es: 'Mientras yo cocinaba, ella estudiaba.',
      'pt-BR': 'Enquanto eu estava cozinhando, ela estava estudando.',
      vi: 'Trong khi tôi đang nấu ăn, cô ấy đang học.',
      id: 'Saat saya sedang memasak, dia sedang belajar.',
      tr: 'Ben yemek yaparken o ders çalışıyordu.',
      pl: 'Kiedy gotowałem, ona się uczyła.',
      why: tri('Два процесса шли параллельно.', 'Два процеси тривали паралельно.', 'Dos procesos continuaban en paralelo.'),
    },
    {
      en: 'I came home, opened the door, and called her.',
      ru: 'Я пришёл домой, открыл дверь и позвонил ей.',
      uk: 'Я прийшов додому, відчинив двері й подзвонив їй.',
      es: 'Llegue a casa, abri la puerta y la llame.',
      'pt-BR': 'Cheguei em casa, abri a porta e liguei para ela.',
      vi: 'Tôi về nhà, mở cửa và gọi cho cô ấy.',
      id: 'Saya pulang, membuka pintu, lalu meneleponnya.',
      tr: 'Eve geldim, kapıyı açtım ve onu aradım.',
      pl: 'Wróciłem do domu, otworzyłem drzwi i zadzwoniłem do niej.',
      why: tri('Это цепочка событий, поэтому came, opened, called.', 'Це ланцюжок подій, тому came, opened, called.', 'Es una secuencia de eventos.'),
    },
    {
      en: 'They were watching TV when I entered.',
      ru: 'Они смотрели телевизор, когда я вошёл.',
      uk: 'Вони дивилися телевізор, коли я увійшов.',
      es: 'Ellos estaban viendo television cuando entre.',
      'pt-BR': 'Eles estavam assistindo TV quando eu entrei.',
      vi: 'Họ đang xem TV khi tôi bước vào.',
      id: 'Mereka sedang menonton TV ketika saya masuk.',
      tr: 'Ben içeri girdiğimde televizyon izliyorlardı.',
      pl: 'Oglądali telewizję, kiedy wszedłem.',
      why: tri('Watching уже шло, а entered - событие.', 'Watching уже тривало, а entered - подія.', 'Watching ya estaba en progreso; entered es el evento.'),
    },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, перевод мешает. По-русски всё звучит как прошлое, но английский спрашивает: это просто факт или процесс, который шёл в тот момент?',
        'Схоже, переклад заважає. Українською все звучить як минуле, але англійська питає: це просто факт чи процес, який тривав у той момент?',
        'La traduccion puede esconder la diferencia: hecho o proceso en ese momento?',
      ),
    },
    {
      id: 'intro_rule',
      type: 'rule',
      text: tri(
        'Факт или событие: worked, called, entered. Процесс на фоне: was working, was sleeping, were watching.',
        'Факт або подія: worked, called, entered. Процес на фоні: was working, was sleeping, were watching.',
        'Hecho/evento: worked, called, entered. Proceso de fondo: was working, was sleeping, were watching.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Не ставь was/were везде. I worked yesterday и I was working at 8 yesterday отвечают на разные вопросы.',
        'Не став was/were всюди. I worked yesterday і I was working at 8 yesterday відповідають на різні питання.',
        'No pongas was/were en todas partes. I worked yesterday y I was working at 8 responden preguntas distintas.',
      ),
    },
  ],
  steps: [
    contrastStep({
      id: 'past_simple_cont_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'past_simple_fact',
      sentence: 'I ___ yesterday.',
      translation: tri('Я работал вчера.', 'Я працював учора.', 'I worked yesterday.'),
      options: ['worked', 'was working', 'working', 'was worked'],
      correctAnswer: 'worked',
      correctFeedback: tri('Да. Это обычный факт о вчерашнем дне: worked.', 'Так. Це звичайний факт про вчорашній день: worked.', 'Yes. This is a simple fact: worked.'),
      wrong: {
        'was working': tri('Was working нужен для процесса в момент прошлого. Здесь обычный факт: worked.', 'Was working потрібен для процесу в момент минулого. Тут звичайний факт: worked.', 'Was working needs a process at a past moment. Use worked.'),
        working: tri('Working без was/were не собирается. И здесь нужен факт: worked.', 'Working без was/were не збирається. І тут потрібен факт: worked.', 'Working without was/were is incomplete. Use worked.'),
        'was worked': tri('Was worked не подходит для активного действия. Нужен простой факт: worked.', 'Was worked не підходить для активної дії. Потрібен простий факт: worked.', 'Was worked does not fit this active action. Use worked.'),
      },
      focusWords: ['worked', 'yesterday'],
    }),
    contrastStep({
      id: 'past_simple_cont_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'past_continuous_at_time',
      sentence: 'I ___ at 8 yesterday.',
      translation: tri('Я работал вчера в 8.', 'Я працював учора о 8.', 'I was working at 8 yesterday.'),
      options: ['was working', 'worked', 'work', 'was worked'],
      correctAnswer: 'was working',
      correctFeedback: tri('Да. At 8 yesterday задаёт момент прошлого. Нужен процесс: was working.', 'Так. At 8 yesterday задає момент минулого. Потрібен процес: was working.', 'Yes. At 8 yesterday gives a past moment. Use was working.'),
      wrong: {
        worked: tri('Worked - это факт. At 8 yesterday спрашивает, что происходило тогда: was working.', 'Worked - це факт. At 8 yesterday питає, що відбувалося тоді: was working.', 'Worked is a fact. At 8 yesterday asks what was happening: was working.'),
        work: tri('Work не показывает прошлый процесс. Нужен блок was working.', 'Work не показує минулий процес. Потрібен блок was working.', 'Work does not show a past process. Use was working.'),
        'was worked': tri('Was worked не подходит. Для процесса нужно was working.', 'Was worked не підходить. Для процесу потрібно was working.', 'Was worked does not fit. Use was working.'),
      },
      focusWords: ['was working', 'at 8 yesterday'],
    }),
    contrastStep({
      id: 'past_simple_cont_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'fact_vs_process_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Я работал вчера / я работал вчера в 8', 'Я працював учора / я працював учора о 8', 'I worked yesterday / I was working at 8 yesterday'),
      options: ['I worked yesterday / I was working at 8 yesterday', 'I was working yesterday / I worked at 8 yesterday', 'I working yesterday / I was work at 8 yesterday', 'I was worked yesterday / I worked working at 8 yesterday'],
      correctAnswer: 'I worked yesterday / I was working at 8 yesterday',
      correctFeedback: tri('Да. Просто yesterday = worked. Точный момент at 8 = was working.', 'Так. Просто yesterday = worked. Точний момент at 8 = was working.', 'Yes. Yesterday as a fact uses worked; at 8 uses was working.'),
      wrong: {
        'I was working yesterday / I worked at 8 yesterday': tri('At 8 просит процесс: was working. Просто yesterday чаще даёт факт: worked.', 'At 8 просить процес: was working. Просто yesterday частіше дає факт: worked.', 'At 8 asks for was working; plain yesterday uses worked.'),
        'I working yesterday / I was work at 8 yesterday': tri('I working пропускает was, а I was work пропускает -ing.', 'I working пропускає was, а I was work пропускає -ing.', 'Missing was and -ing.'),
        'I was worked yesterday / I worked working at 8 yesterday': tri('Was worked и worked working не собирают нужный активный смысл.', 'Was worked і worked working не збирають потрібний активний сенс.', 'These forms do not build the active meaning.'),
      },
      focusWords: ['worked', 'was working'],
    }),
    contrastStep({
      id: 'past_simple_cont_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'background_when_event',
      sentence: 'She ___ when I called.',
      translation: tri('Она спала, когда я позвонил.', 'Вона спала, коли я подзвонив.', 'She was sleeping when I called.'),
      options: ['was sleeping', 'slept', 'sleep', 'was slept'],
      correctAnswer: 'was sleeping',
      correctFeedback: tri('Да. Сон был фоном, а звонок - коротким событием.', 'Так. Сон був фоном, а дзвінок - короткою подією.', 'Yes. Sleeping is background; called is the short event.'),
      wrong: {
        slept: tri('Slept звучит как факт. Здесь сон уже шёл, когда случился звонок: was sleeping.', 'Slept звучить як факт. Тут сон уже тривав, коли стався дзвінок: was sleeping.', 'Slept is a fact. Here use was sleeping.'),
        sleep: tri('Sleep не показывает прошлый фон. Нужен блок was sleeping.', 'Sleep не показує минулий фон. Потрібен блок was sleeping.', 'Sleep does not show past background. Use was sleeping.'),
        'was slept': tri('Was slept не подходит для активного смысла. Нужно was sleeping.', 'Was slept не підходить для активного сенсу. Потрібно was sleeping.', 'Was slept does not fit. Use was sleeping.'),
      },
      focusWords: ['was sleeping', 'called'],
    }),
    contrastStep({
      id: 'past_simple_cont_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'event_when_background',
      sentence: 'The phone ___ while I was sleeping.',
      translation: tri('Телефон зазвонил, пока я спал.', 'Телефон задзвонив, поки я спав.', 'The phone rang while I was sleeping.'),
      options: ['rang', 'was ringing', 'ringing', 'was rang'],
      correctAnswer: 'rang',
      correctFeedback: tri('Да. Телефон зазвонил - короткое событие. Сон был фоном.', 'Так. Телефон задзвонив - коротка подія. Сон був фоном.', 'Yes. Rang is the short event; sleeping is the background.'),
      wrong: {
        'was ringing': tri('Was ringing звучит как длительный звон. Здесь событие прервало сон: the phone rang.', 'Was ringing звучить як тривалий дзвін. Тут подія перервала сон: the phone rang.', 'Was ringing sounds like a longer process. Here the event is rang.'),
        ringing: tri('Ringing без was/were не собирается. И здесь нужно короткое событие: rang.', 'Ringing без was/were не збирається. І тут потрібна коротка подія: rang.', 'Ringing is incomplete here. Use rang.'),
        'was rang': tri('Was rang не работает. Для короткого события нужен rang.', 'Was rang не працює. Для короткої події потрібен rang.', 'Was rang does not work. Use rang.'),
      },
      focusWords: ['rang', 'while'],
    }),
    contrastStep({
      id: 'past_simple_cont_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'arrived_interrupting_action',
      sentence: 'They ___ a film when I arrived.',
      translation: tri('Они смотрели фильм, когда я приехал.', 'Вони дивилися фільм, коли я приїхав.', 'They were watching a film when I arrived.'),
      options: ['were watching', 'watched', 'watch', 'were watched'],
      correctAnswer: 'were watching',
      correctFeedback: tri('Да. Просмотр уже шёл, когда ты приехал: were watching.', 'Так. Перегляд уже тривав, коли ти приїхав: were watching.', 'Yes. The watching was already in progress.'),
      wrong: {
        watched: tri('Watched звучит как завершённый факт. Здесь просмотр был фоном: were watching.', 'Watched звучить як завершений факт. Тут перегляд був фоном: were watching.', 'Watched sounds completed. Use were watching.'),
        watch: tri('Watch не показывает прошлый фон. Нужен блок were watching.', 'Watch не показує минулий фон. Потрібен блок were watching.', 'Watch does not show past background. Use were watching.'),
        'were watched': tri('Were watched не подходит для активного смысла. Нужно were watching.', 'Were watched не підходить для активного сенсу. Потрібно were watching.', 'Were watched does not fit. Use were watching.'),
      },
      focusWords: ['were watching', 'arrived'],
    }),
    contrastStep({
      id: 'past_simple_cont_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'while_background',
      sentence: 'While I ___, she was studying.',
      translation: tri('Пока я готовил, она занималась.', 'Поки я готував, вона навчалася.', 'While I was cooking, she was studying.'),
      options: ['was cooking', 'cooked', 'cook', 'was cooked'],
      correctAnswer: 'was cooking',
      correctFeedback: tri('Да. While вводит процесс на фоне: was cooking.', 'Так. While вводить процес на фоні: was cooking.', 'Yes. While introduces a background process.'),
      wrong: {
        cooked: tri('Cooked - факт. Здесь два процесса шли параллельно: was cooking / was studying.', 'Cooked - факт. Тут два процеси тривали паралельно: was cooking / was studying.', 'Cooked is a fact. Here use was cooking.'),
        cook: tri('Cook не показывает прошлый процесс. Нужен блок was cooking.', 'Cook не показує минулий процес. Потрібен блок was cooking.', 'Cook does not show past process. Use was cooking.'),
        'was cooked': tri('Was cooked не подходит для активного смысла "я готовил". Нужно was cooking.', 'Was cooked не підходить для активного сенсу "я готував". Потрібно was cooking.', 'Was cooked does not fit. Use was cooking.'),
      },
      focusWords: ['while', 'was cooking'],
    }),
    contrastStep({
      id: 'past_simple_cont_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'two_parallel_actions',
      sentence: 'While we ___ dinner, they were watching TV.',
      translation: tri('Пока мы ужинали, они смотрели телевизор.', 'Поки ми вечеряли, вони дивилися телевізор.', 'While we were having dinner, they were watching TV.'),
      options: ['were having', 'had', 'have', 'were had'],
      correctAnswer: 'were having',
      correctFeedback: tri('Да. Два процесса шли параллельно: were having / were watching.', 'Так. Два процеси тривали паралельно: were having / were watching.', 'Yes. Two processes continued in parallel.'),
      wrong: {
        had: tri('Had может быть фактом, но while здесь просит процесс: were having.', 'Had може бути фактом, але while тут просить процес: were having.', 'Had can be a fact. Here use were having.'),
        have: tri('Have не показывает прошлый процесс. Нужен блок were having.', 'Have не показує минулий процес. Потрібен блок were having.', 'Have does not show past process.'),
        'were had': tri('Were had не работает. После were нужен вариант having.', 'Were had не працює. Після were потрібен варіант having.', 'Were had does not work. Use were having.'),
      },
      focusWords: ['were having', 'while'],
    }),
    contrastStep({
      id: 'past_simple_cont_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'while_when_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('пока я работал / когда он позвонил', 'поки я працював / коли він подзвонив', 'while I was working / when he called'),
      options: ['while I was working / when he called', 'while I worked / when he was calling', 'while I was worked / when he was called', 'while I working / when he calling'],
      correctAnswer: 'while I was working / when he called',
      correctFeedback: tri('Да. While даёт фон: was working. When вводит событие: called.', 'Так. While дає фон: was working. When вводить подію: called.', 'Yes. While gives background; when introduces the event.'),
      wrong: {
        'while I worked / when he was calling': tri('Фон лучше собрать как I was working, а короткое событие как he called.', 'Фон краще зібрати як I was working, а коротку подію як he called.', 'Use I was working for background and he called for the event.'),
        'while I was worked / when he was called': tri('Was worked / was called не подходят для этих активных действий.', 'Was worked / was called не підходять для цих активних дій.', 'These forms do not fit the active actions.'),
        'while I working / when he calling': tri('Пропущен was в фоне и форма события called.', 'Пропущено was у фоні та форму події called.', 'Missing was and called.'),
      },
      focusWords: ['while', 'when'],
    }),
    contrastStep({
      id: 'past_simple_cont_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'sequence_past_simple',
      sentence: 'I came home, opened the door, and ___ her.',
      translation: tri('Я пришёл домой, открыл дверь и позвонил ей.', 'Я прийшов додому, відчинив двері й подзвонив їй.', 'I came home, opened the door, and called her.'),
      options: ['called', 'was calling', 'calling', 'was called'],
      correctAnswer: 'called',
      correctFeedback: tri('Да. Это цепочка событий: came, opened, called.', 'Так. Це ланцюжок подій: came, opened, called.', 'Yes. This is a sequence: came, opened, called.'),
      wrong: {
        'was calling': tri('Was calling - процесс на фоне. Здесь действия идут одно за другим: called.', 'Was calling - процес на фоні. Тут дії йдуть одна за одною: called.', 'Was calling is background. Here use called.'),
        calling: tri('Calling без was/were не собирается. И в цепочке нужен called.', 'Calling без was/were не збирається. І в ланцюжку потрібен called.', 'Calling is incomplete. Use called.'),
        'was called': tri('Was called не подходит к активному действию "позвонил ей". Нужно called her.', 'Was called не підходить до активної дії "подзвонив їй". Потрібно called her.', 'Was called does not fit the active action.'),
      },
      focusWords: ['sequence', 'called'],
    }),
    contrastStep({
      id: 'past_simple_cont_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'background_then_event',
      sentence: 'I ___ when she arrived.',
      translation: tri('Я готовил, когда она приехала.', 'Я готував, коли вона приїхала.', 'I was cooking when she arrived.'),
      options: ['was cooking', 'cooked', 'cook', 'was cooked'],
      correctAnswer: 'was cooking',
      correctFeedback: tri('Да. Готовка была процессом, а arrived - событием.', 'Так. Готування було процесом, а arrived - подією.', 'Yes. Cooking was the background; arrived was the event.'),
      wrong: {
        cooked: tri('Cooked звучит как факт. Здесь готовка уже шла, когда она приехала: was cooking.', 'Cooked звучить як факт. Тут готування вже тривало, коли вона приїхала: was cooking.', 'Cooked sounds like a fact. Use was cooking.'),
        cook: tri('Cook не показывает прошлый фон. Нужен блок was cooking.', 'Cook не показує минулий фон. Потрібен блок was cooking.', 'Cook does not show past background.'),
        'was cooked': tri('Was cooked не подходит для активного "я готовил". Нужно was cooking.', 'Was cooked не підходить для активного "я готував". Потрібно was cooking.', 'Was cooked does not fit.'),
      },
      focusWords: ['was cooking', 'arrived'],
    }),
    contrastStep({
      id: 'past_simple_cont_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'event_during_background',
      sentence: 'He ___ while we were talking.',
      translation: tri('Он вошёл, пока мы разговаривали.', 'Він увійшов, поки ми розмовляли.', 'He came in while we were talking.'),
      options: ['came in', 'was coming in', 'coming in', 'was came in'],
      correctAnswer: 'came in',
      correctFeedback: tri('Да. Came in - короткое событие на фоне разговора.', 'Так. Came in - коротка подія на фоні розмови.', 'Yes. Came in is the short event.'),
      wrong: {
        'was coming in': tri('Was coming in показывает процесс входа. Здесь нейтральное событие: he came in.', 'Was coming in показує процес входу. Тут нейтральна подія: he came in.', 'Was coming in shows a process. Here use came in.'),
        'coming in': tri('Coming in без was/were не собирается. И здесь нужно событие: came in.', 'Coming in без was/were не збирається. І тут потрібна подія: came in.', 'Coming in is incomplete. Use came in.'),
        'was came in': tri('Was came in не работает. Для события нужен came in.', 'Was came in не працює. Для події потрібен came in.', 'Was came in does not work. Use came in.'),
      },
      focusWords: ['came in', 'while'],
    }),
    contrastStep({
      id: 'past_simple_cont_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_interruption_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Она спала, когда я позвонил / я позвонил ей вчера', 'Вона спала, коли я подзвонив / я подзвонив їй учора', 'She was sleeping when I called / I called her yesterday'),
      options: ['She was sleeping when I called / I called her yesterday', 'She slept when I was calling / I was calling her yesterday', 'She was slept when I called / I called was her yesterday', 'She sleeping when I called / I calling her yesterday'],
      correctAnswer: 'She was sleeping when I called / I called her yesterday',
      correctFeedback: tri('Да. Сон - фон, звонок - событие и отдельный факт вчера.', 'Так. Сон - фон, дзвінок - подія й окремий факт учора.', 'Yes. Sleeping is background; called is event/fact.'),
      wrong: {
        'She slept when I was calling / I was calling her yesterday': tri('Сон был фоном, а звонок событием. Во второй части это обычный факт: called.', 'Сон був фоном, а дзвінок подією. У другій частині це звичайний факт: called.', 'Sleeping is background; called is event/fact.'),
        'She was slept when I called / I called was her yesterday': tri('Was slept и called was не собирают активный смысл.', 'Was slept і called was не збирають активний сенс.', 'These forms do not build the active meaning.'),
        'She sleeping when I called / I calling her yesterday': tri('Пропущен was для фона и форма called для события.', 'Пропущено was для фону та форму called для події.', 'Missing was and called.'),
      },
      focusWords: ['was sleeping', 'called'],
    }),
    contrastStep({
      id: 'past_simple_cont_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sequence_background',
      sentence: 'Choose the correct sentence.',
      translation: tri('Я вошёл в комнату, а они смотрели телевизор.', 'Я увійшов у кімнату, а вони дивилися телевізор.', 'I entered the room, and they were watching TV.'),
      options: ['I entered the room, and they were watching TV.', 'I was entering the room, and they watched TV.', 'I entered the room, and they watched TV.', 'I was entered the room, and they were watched TV.'],
      correctAnswer: 'I entered the room, and they were watching TV.',
      correctFeedback: tri('Да. Entered - событие, were watching - процесс, который уже шёл.', 'Так. Entered - подія, were watching - процес, який уже тривав.', 'Yes. Entered is the event; were watching was already in progress.'),
      wrong: {
        'I was entering the room, and they watched TV.': tri('В этой сцене вход - событие, а телевизор был фоном: entered / were watching.', 'У цій сцені вхід - подія, а телевізор був фоном: entered / were watching.', 'Here entering is the event, and watching TV is background.'),
        'I entered the room, and they watched TV.': tri('They watched TV звучит как завершённый факт. Здесь они уже были в процессе: were watching.', 'They watched TV звучить як завершений факт. Тут вони вже були в процесі: were watching.', 'They watched TV sounds completed. Use were watching.'),
        'I was entered the room, and they were watched TV.': tri('Was entered / were watched не подходят для активных действий. Нужно entered / were watching.', 'Was entered / were watched не підходять для активних дій. Потрібно entered / were watching.', 'These forms do not fit active actions.'),
      },
      focusWords: ['entered', 'were watching'],
    }),
    contrastStep({
      id: 'past_simple_cont_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'mixed_sentence_correction',
      sentence: 'Choose the correct sentence.',
      translation: tri('Когда я пришёл домой, жена готовила ужин, а ребёнок спал.', 'Коли я прийшов додому, дружина готувала вечерю, а дитина спала.', 'When I came home, my wife was cooking dinner, and the baby was sleeping.'),
      options: ['When I came home, my wife was cooking dinner, and the baby was sleeping.', 'When I was coming home, my wife cooked dinner, and the baby slept.', 'When I came home, my wife was cooked dinner, and the baby was slept.', 'When I coming home, my wife cooking dinner, and the baby sleeping.'],
      correctAnswer: 'When I came home, my wife was cooking dinner, and the baby was sleeping.',
      correctFeedback: tri('Да. Came home - событие. Was cooking и was sleeping - фоновые процессы.', 'Так. Came home - подія. Was cooking і was sleeping - фонові процеси.', 'Yes. Came home is the event; cooking and sleeping are background processes.'),
      wrong: {
        'When I was coming home, my wife cooked dinner, and the baby slept.': tri('В этой сцене came home - событие, а cooking/sleeping были фоном.', 'У цій сцені came home - подія, а cooking/sleeping були фоном.', 'Here came home is the event; cooking/sleeping are background.'),
        'When I came home, my wife was cooked dinner, and the baby was slept.': tri('Was cooked / was slept не подходят для активного фона. Нужно was cooking / was sleeping.', 'Was cooked / was slept не підходять для активного фону. Потрібно was cooking / was sleeping.', 'Use was cooking / was sleeping for active background.'),
        'When I coming home, my wife cooking dinner, and the baby sleeping.': tri('Здесь не собрана сцена прошлого: приход домой - событие, готовка и сон - фоновые процессы.', 'Тут не зібрана сцена минулого: прихід додому - подія, готування і сон - фонові процеси.', 'This needs came home, was cooking, and was sleeping.'),
      },
      focusWords: ['came home', 'was cooking', 'was sleeping'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'past_continuous_instead_of_past_simple_fact_error',
      'past_simple_instead_of_background_process_error',
      'wrong_when_while_structure_error',
      'was_were_plus_past_error',
      'missing_was_were_process_error',
      'interrupted_action_confusion_error',
      'parallel_actions_error',
      'time_marker_misread_error',
      'sequence_vs_background_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: определяем, действие является фактом, событием или процессом на фоне.', 'Звичайне пояснення: визначаємо, дія є фактом, подією чи процесом на фоні.', 'Explicacion normal: identificamos si la accion es hecho, evento o proceso de fondo.'),
    depth2: tri('Проще: спроси "что случилось?" или "что происходило в тот момент?".', 'Простіше: запитай "що сталося?" або "що відбувалося в той момент?".', 'Mas simple: pregunta que paso o que estaba pasando.'),
    depth3: tri('Ещё проще: если это просто факт за вчера - короткая форма. Если действие уже шло в момент звонка - форма с was или were.', 'Ще простіше: якщо це просто факт за вчора - коротка форма. Якщо дія вже тривала в момент дзвінка - форма з was або were.', 'Aun mas simple: I worked yesterday, pero I was working when he called.'),
    depth4: tri('Почти подсказка: прямо показываем нужную роль - факт или процесс.', 'Майже підказка: прямо показуємо потрібну роль - факт чи процес.', 'Casi una pista: senalamos el papel necesario.'),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Остановись. Past Simple = что случилось или что сделал. Past Continuous = что происходило в тот момент. Фон часто was/were + -ing, короткое событие часто Past Simple.',
        'Зупинись. Past Simple = що сталося або що зробив. Past Continuous = що відбувалося в той момент. Фон часто was/were + -ing, коротка подія часто Past Simple.',
        'Pausa. Past Simple = que paso. Past Continuous = que estaba pasando en ese momento.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_action_role_hint_then_retry',
      card: tri(
        'Система подсветит роль действия: факт, событие, фон или процесс. Форму всё равно выбираешь ты.',
        'Система підсвітить роль дії: факт, подія, фон або процес. Форму все одно обираєш ти.',
        'El sistema resalta el papel de la accion; la forma la eliges tu.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери "факт/событие" или "процесс", потом вернись к фразе.',
        'Режим підказки: спочатку обери "факт/подія" або "процес", потім повернись до фрази.',
        'Modo guiado: primero elige hecho/evento o proceso, luego vuelve a la frase.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_past_simple_cont_001',
        prompt: tri('At 8 yesterday чаще просит факт за день или процесс в точный момент?', 'At 8 yesterday частіше просить факт за день чи процес у точний момент?', 'At 8 yesterday pide un hecho o un proceso?'),
        options: ['факт за день', 'процесс в момент'],
        correctIndex: 1,
        thenReturnToExerciseId: 'past_simple_cont_easy_002',
      },
      {
        id: 'guided_past_simple_cont_002',
        prompt: tri('В фразе про сон и звонок что является фоном, который уже продолжался?', 'У фразі про сон і дзвінок що є фоном, який уже тривав?', 'En esta frase, que es el fondo?'),
        options: ['was sleeping', 'called'],
        correctIndex: 0,
        thenReturnToExerciseId: 'past_simple_cont_contrast_001',
      },
      {
        id: 'guided_past_simple_cont_003',
        prompt: tri('В "The phone rang while I was sleeping" что является коротким событием?', 'У "The phone rang while I was sleeping" що є короткою подією?', 'Cual es el evento corto?'),
        options: ['rang', 'was sleeping'],
        correctIndex: 0,
        thenReturnToExerciseId: 'past_simple_cont_contrast_002',
      },
      {
        id: 'guided_past_simple_cont_004',
        prompt: tri('Если действия идут одно за другим, чаще нужен Past Simple или Past Continuous?', 'Якщо дії йдуть одна за одною, частіше потрібен Past Simple чи Past Continuous?', 'Si las acciones pasan una tras otra, cual es mas comun?'),
        options: ['Past Simple', 'Past Continuous'],
        correctIndex: 0,
        thenReturnToExerciseId: 'past_simple_cont_mixed_001',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'past_simple_vs_past_continuous',
    diagnosisLabel: tri('Past Simple vs Past Continuous', 'Past Simple vs Past Continuous', 'Past Simple vs Past Continuous'),
    contrastSet: SMART_CONTRAST,
    difficultyLevel: 2,
    focusWords: ['worked', 'was working', 'called', 'was sleeping', 'rang', 'while', 'when', 'entered', 'were watching'],
    focusPatterns: [
      'past_simple_fact',
      'past_continuous_at_time',
      'fact_vs_process_pair',
      'background_when_event',
      'event_when_background',
      'arrived_interrupting_action',
      'while_background',
      'two_parallel_actions',
      'while_when_pair',
      'sequence_past_simple',
      'background_then_event',
      'event_during_background',
      'mixed_interruption_pair',
      'mixed_sequence_background',
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
      microDiagnosisId: 'past_simple_vs_past_continuous',
      contrastSet: ['past simple', 'past continuous', 'background', 'event', 'when', 'while'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logActionRole: true,
      logTimeMarker: true,
      logChosenTense: true,
      logProcessVsEvent: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=past_simple_vs_past_continuous',
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
