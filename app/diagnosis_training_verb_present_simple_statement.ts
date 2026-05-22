// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

const PLANNED_LOCALE_FALLBACK = {
  'pt-BR': 'Este treino está sendo preparado para este idioma.',
  vi: 'Bài luyện này đang được chuẩn bị cho ngôn ngữ này.',
  id: 'Latihan ini sedang disiapkan untuk bahasa ini.',
  tr: 'Bu alıştırma bu dil için hazırlanıyor.',
  pl: 'To ćwiczenie jest przygotowywane dla tego języka.',
} as const;

const tri = (ru: string, uk = ru, es = ru, planned: Partial<Record<keyof typeof PLANNED_LOCALE_FALLBACK, string>> = {}): TriText => ({
  ru,
  uk,
  es,
  'pt-BR': planned['pt-BR'] ?? PLANNED_LOCALE_FALLBACK['pt-BR'],
  vi: planned.vi ?? PLANNED_LOCALE_FALLBACK.vi,
  id: planned.id ?? PLANNED_LOCALE_FALLBACK.id,
  tr: planned.tr ?? PLANNED_LOCALE_FALLBACK.tr,
  pl: planned.pl ?? PLANNED_LOCALE_FALLBACK.pl,
});

const CONTRAST = ['base verb', 'verb+s', 'habit', 'fact', 'routine', 'schedule', 'present continuous'];

const option = (text: string) => ({ id: text, text });

const defaultWrong = (correct: string): TriText => tri(
  `Не эта форма. Здесь нужно "${correct}": говорим о привычке, факте или расписании.`,
  `Не ця форма. Тут потрібно "${correct}": говоримо про звичку, факт або розклад.`,
  `Not this form. Use "${correct}" for a habit, fact, or schedule.`,
  {
    'pt-BR': `Não é esta forma. Aqui precisamos de "${correct}": falamos de hábito, fato ou horário.`,
    vi: `Không phải dạng này. Ở đây cần "${correct}": đang nói về thói quen, sự thật hoặc lịch trình.`,
    id: `Bukan bentuk ini. Di sini perlu "${correct}": kita bicara tentang kebiasaan, fakta, atau jadwal.`,
    tr: `Bu biçim değil. Burada "${correct}" gerekir: alışkanlık, gerçek veya programdan söz ediyoruz.`,
    pl: `To nie ta forma. Tutaj potrzebne jest "${correct}": mówimy o nawyku, fakcie albo rozkładzie.`,
  },
);

function retry(line: string, model: string): [TriText, TriText, TriText, TriText] {
  return [
    tri(line, line, `Check the signal and use the model: ${model}.`, {
      'pt-BR': `Confira o sinal e use o modelo: ${model}.`,
      vi: `Kiểm tra dấu hiệu và dùng mẫu: ${model}.`,
      id: `Periksa sinyalnya dan gunakan pola: ${model}.`,
      tr: `İşareti kontrol et ve modeli kullan: ${model}.`,
      pl: `Sprawdź sygnał i użyj modelu: ${model}.`,
    }),
    tri(
      'Спроси себя: это обычно правда или происходит прямо сейчас?',
      'Запитай себе: це зазвичай правда чи відбувається просто зараз?',
      'Ask: is it usually true, or happening right now?',
      {
        'pt-BR': 'Pergunte: isso geralmente é verdade ou está acontecendo agora?',
        vi: 'Hãy tự hỏi: điều này thường đúng hay đang xảy ra ngay bây giờ?',
        id: 'Tanyakan: ini biasanya benar, atau sedang terjadi sekarang?',
        tr: 'Kendine sor: bu genelde doğru mu, yoksa şu anda mı oluyor?',
        pl: 'Zapytaj siebie: czy to zwykle prawda, czy dzieje się właśnie teraz?',
      },
    ),
    tri(
      'Держи смысл: обычная правда не просит am/is/are перед действием.',
      'Тримай сенс: звичайна правда не просить am/is/are перед дією.',
      `Keep the model: ${model}.`,
      {
        'pt-BR': `Mantenha o modelo: ${model}.`,
        vi: `Giữ mẫu: ${model}.`,
        id: `Pertahankan pola: ${model}.`,
        tr: `Modeli koru: ${model}.`,
        pl: `Trzymaj się modelu: ${model}.`,
      },
    ),
    tri(
      'Почти подсказка: I/you/we/they берут простое действие; he/she/it добавляет -s или -es.',
      'Майже підказка: I/you/we/they беруть просту дію; he/she/it додає -s або -es.',
      'Almost a hint: I/you/we/they use the simple action; he/she/it adds -s or -es.',
      {
        'pt-BR': 'Quase dica: I/you/we/they usam a ação simples; he/she/it acrescenta -s ou -es.',
        vi: 'Gần như gợi ý: I/you/we/they dùng hành động đơn giản; he/she/it thêm -s hoặc -es.',
        id: 'Hampir petunjuk: I/you/we/they memakai aksi sederhana; he/she/it menambah -s atau -es.',
        tr: 'Neredeyse ipucu: I/you/we/they yalın eylem kullanır; he/she/it -s veya -es ekler.',
        pl: 'Prawie podpowiedź: I/you/we/they biorą prostą czynność; he/she/it dodaje -s albo -es.',
      },
    ),
  ];
}

function psStep(input: {
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
  retryLine: string;
  model: string;
  focusWords: string[];
}): DiagnosisTrainingStep {
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: input.translation,
    explanationBlock: tri(
      'Эта форма нужна для привычек, фактов, расписаний и стабильных состояний. Не добавляй am/is/are перед обычным действием.',
      'Ця форма потрібна для звичок, фактів, розкладів і стабільних станів. Не додавай am/is/are перед звичайною дією.',
      'Use this for habits, facts, schedules, and stable states. Do not add am/is/are before a normal action.',
      {
        'pt-BR': 'Use esta forma para hábitos, fatos, horários e estados estáveis. Não acrescente am/is/are antes de uma ação normal.',
        vi: 'Dùng dạng này cho thói quen, sự thật, lịch trình và trạng thái ổn định. Đừng thêm am/is/are trước một hành động bình thường.',
        id: 'Gunakan ini untuk kebiasaan, fakta, jadwal, dan keadaan stabil. Jangan menambahkan am/is/are sebelum aksi biasa.',
        tr: 'Bu biçimi alışkanlıklar, gerçekler, programlar ve sabit durumlar için kullan. Normal bir eylemden önce am/is/are ekleme.',
        pl: 'Użyj tej formy dla nawyków, faktów, rozkładów i stałych stanów. Nie dodawaj am/is/are przed zwykłą czynnością.',
      },
    ),
    microTask: tri(
      'Выбери нормальную форму для привычки, факта или расписания.',
      'Вибери нормальну форму для звички, факту або розкладу.',
      'Choose the normal form for a habit, fact, or schedule.',
      {
        'pt-BR': 'Escolha a forma normal para um hábito, fato ou horário.',
        vi: 'Chọn dạng bình thường cho thói quen, sự thật hoặc lịch trình.',
        id: 'Pilih bentuk normal untuk kebiasaan, fakta, atau jadwal.',
        tr: 'Alışkanlık, gerçek veya program için normal biçimi seç.',
        pl: 'Wybierz zwykłą formę dla nawyku, faktu albo rozkładu.',
      },
    ),
    sentence: input.sentence,
    answerOptions: input.options.map(option),
    correctAnswerId: input.correctAnswer,
    correctIndex: input.options.findIndex((item) => item === input.correctAnswer),
    correctFeedback: input.correctFeedback,
    wrongFeedbackByOption: Object.fromEntries(
      input.options
        .filter((item) => item !== input.correctAnswer)
        .map((item) => [item, input.wrong?.[item] ?? defaultWrong(input.correctAnswer)]),
    ),
    retryFeedback: retry(input.retryLine, input.model),
    fallbackExplanation: tri(
      'Смотри на две вещи: это привычка, факт или расписание; и кто делает действие. Для I/you/we/they форма проще, для he/she/it добавляется -s или -es.',
      'Дивись на дві речі: це звичка, факт або розклад; і хто робить дію. Для I/you/we/they форма простіша, для he/she/it додається -s або -es.',
      'I, you, we, they: I work, they live. He, she, it: she works, the shop opens. Every day, usually, often, always, and schedules often point here.',
      {
        'pt-BR': 'Olhe para duas coisas: é hábito, fato ou horário; e quem faz a ação. Para I/you/we/they a forma é mais simples; para he/she/it acrescentamos -s ou -es.',
        vi: 'Nhìn vào hai điều: đây là thói quen, sự thật hay lịch trình; và ai làm hành động. Với I/you/we/they dạng đơn giản hơn; với he/she/it thêm -s hoặc -es.',
        id: 'Lihat dua hal: ini kebiasaan, fakta, atau jadwal; dan siapa yang melakukan aksi. Untuk I/you/we/they bentuknya lebih sederhana; untuk he/she/it tambah -s atau -es.',
        tr: 'İki şeye bak: bu alışkanlık, gerçek veya program mı; eylemi kim yapıyor. I/you/we/they için biçim daha basit; he/she/it için -s veya -es eklenir.',
        pl: 'Spójrz na dwie rzeczy: czy to nawyk, fakt albo rozkład; i kto wykonuje czynność. Dla I/you/we/they forma jest prostsza, dla he/she/it dodajemy -s albo -es.',
      },
    ),
    focusWords: input.focusWords,
  };
}

export const VERB_PRESENT_SIMPLE_STATEMENT_TRAINING: DiagnosisTraining = {
  id: 'verb_present_simple_statement',
  category: 'verb',
  version: '1.0.0',
  status: 'active',
  priority: 22,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('I work / She works: привычки и факты', 'I work / She works: звички і факти', 'I work / She works: habits and facts', {
    'pt-BR': 'I work / She works: hábitos e fatos',
    vi: 'I work / She works: thói quen và sự thật',
    id: 'I work / She works: kebiasaan dan fakta',
    tr: 'I work / She works: alışkanlıklar ve gerçekler',
    pl: 'I work / She works: nawyki i fakty',
  }),
  shortTitle: tri('I work / She works', 'I work / She works', 'I work / She works', {
    'pt-BR': 'I work / She works',
    vi: 'I work / She works',
    id: 'I work / She works',
    tr: 'I work / She works',
    pl: 'I work / She works',
  }),
  shortDiagnosis: tri(
    'Ты добавляешь am/is/are или -ing там, где нужна обычная фраза: I work, she works.',
    'Ти додаєш am/is/are або -ing там, де потрібна звичайна фраза: I work, she works.',
    'You add am/is/are or -ing where the normal phrase is I work, she works.',
    {
      'pt-BR': 'Você coloca am/is/are ou -ing onde a frase precisa ser simples: I work, she works.',
      vi: 'Bạn thêm am/is/are hoặc -ing vào chỗ cần một câu đơn giản: I work, she works.',
      id: 'Kamu menambahkan am/is/are atau -ing di tempat yang perlu frasa biasa: I work, she works.',
      tr: 'Basit bir cümle gereken yerde am/is/are ya da -ing ekliyorsun: I work, she works.',
      pl: 'Dodajesz am/is/are albo -ing tam, gdzie potrzebne jest zwykłe zdanie: I work, she works.',
    },
  ),
  diagnosisText: tri(
    'Ошибка в том, что привычку или факт ты делаешь по модели "сейчас": I am work, I working. Для обычного факта нужно I work. Для he/she/it: works.',
    'Помилка в тому, що звичку або факт ти робиш за моделлю "зараз": I am work, I working. Для звичайного факту потрібно I work. Для he/she/it: works.',
    'The mistake is using a now-action shape for habits or facts: I am work, I working. For normal facts use I work. For he/she/it: works.',
    {
      'pt-BR': 'O erro é tratar um hábito ou fato como uma ação de agora: I am work, I working. Para um fato normal, use I work. Para he/she/it: works.',
      vi: 'Lỗi là bạn dùng mẫu hành động đang xảy ra cho thói quen hoặc sự thật: I am work, I working. Với sự thật bình thường, dùng I work. Với he/she/it: works.',
      id: 'Kesalahannya adalah memakai bentuk aksi sekarang untuk kebiasaan atau fakta: I am work, I working. Untuk fakta normal gunakan I work. Untuk he/she/it: works.',
      tr: 'Hata, alışkanlığı veya gerçeği "şu an" modeliyle kurmak: I am work, I working. Normal gerçek için I work gerekir. he/she/it için: works.',
      pl: 'Błąd polega na tym, że nawyk albo fakt budujesz modelem "teraz": I am work, I working. Dla zwykłego faktu użyj I work. Dla he/she/it: works.',
    },
  ),
  mentalModel: tri(
    'Думай не о времени на часах, а о смысле. Every day, usually, расписания и стабильные факты: I work, she works, the shop opens.',
    'Думай не про час на годиннику, а про сенс. Every day, usually, розклади і стабільні факти: I work, she works, the shop opens.',
    'Think about meaning, not the clock. Every day, usually, schedules, and stable facts: I work, she works, the shop opens.',
    {
      'pt-BR': 'Pense no sentido, não no relógio. Every day, usually, horários e fatos estáveis: I work, she works, the shop opens.',
      vi: 'Hãy nghĩ về ý nghĩa, không phải đồng hồ. Every day, usually, lịch trình và sự thật ổn định: I work, she works, the shop opens.',
      id: 'Pikirkan maknanya, bukan jamnya. Every day, usually, jadwal, dan fakta stabil: I work, she works, the shop opens.',
      tr: 'Saate değil, anlama bak. Every day, usually, programlar ve sabit gerçekler: I work, she works, the shop opens.',
      pl: 'Myśl o sensie, nie o zegarze. Every day, usually, rozkłady i stałe fakty: I work, she works, the shop opens.',
    },
  ),
  contrastSet: CONTRAST,
  coreRule: tri(
    'Для обычной правды, привычки или расписания не ставим am/is/are перед действием. С I/you/we/they берем простую форму. С he/she/it добавляем -s или -es.',
    'Для звичайної правди, звички або розкладу не ставимо am/is/are перед дією. З I/you/we/they беремо просту форму. З he/she/it додаємо -s або -es.',
    'I/you/we/they: I work, they live. He/she/it: she works, the shop opens. Signals: every day, usually, often, always, on Mondays.',
    {
      'pt-BR': 'Para uma verdade normal, hábito ou horário, não colocamos am/is/are antes da ação. Com I/you/we/they usamos a forma simples. Com he/she/it acrescentamos -s ou -es.',
      vi: 'Với sự thật bình thường, thói quen hoặc lịch trình, không đặt am/is/are trước hành động. Với I/you/we/they dùng dạng đơn giản. Với he/she/it thêm -s hoặc -es.',
      id: 'Untuk kebenaran biasa, kebiasaan, atau jadwal, jangan letakkan am/is/are sebelum aksi. Dengan I/you/we/they gunakan bentuk sederhana. Dengan he/she/it tambahkan -s atau -es.',
      tr: 'Normal gerçek, alışkanlık veya program için eylemden önce am/is/are koymayız. I/you/we/they ile yalın biçim kullanırız. he/she/it ile -s veya -es ekleriz.',
      pl: 'Dla zwykłej prawdy, nawyku albo rozkładu nie stawiamy am/is/are przed czynnością. Z I/you/we/they bierzemy prostą formę. Z he/she/it dodajemy -s albo -es.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Для привычки: I drink coffee every morning.',
      'Для факта: Water freezes at 0C.',
      'Для расписания: The bus leaves at 8.',
      'С I/you/we/they действие идет как в словаре: work, live, eat.',
      'С he/she/it добавляем -s или -es: works, goes, opens.',
      'Every day, usually, often, always часто показывают привычку.',
      'Не ставь am/is/are перед обычным действием.',
      'Не используй -ing для привычки без смысла "прямо сейчас".',
      'Эта форма не обязательно значит "сейчас".',
      'Для работы, вкуса, расписания и стабильных фактов берем I work / she works.',
    ],
    uk: [
      'Для звички: I drink coffee every morning.',
      'Для факту: Water freezes at 0C.',
      'Для розкладу: The bus leaves at 8.',
      'З I/you/we/they дія йде як у словнику: work, live, eat.',
      'З he/she/it додаємо -s або -es: works, goes, opens.',
      'Every day, usually, often, always часто показують звичку.',
      'Не став am/is/are перед звичайною дією.',
      'Не використовуй -ing для звички без сенсу "просто зараз".',
      'Ця форма не обовʼязково означає "зараз".',
      'Для роботи, смаку, розкладу і стабільних фактів беремо I work / she works.',
    ],
    es: [
      'For a habit: I drink coffee every morning.',
      'For a fact: Water freezes at 0C.',
      'For a schedule: The bus leaves at 8.',
      'With I/you/we/they use work, live, eat.',
      'With he/she/it add -s or -es: works, goes, opens.',
      'Every day, usually, often, always often show habit.',
      'Do not put am/is/are before a normal action.',
      'Do not use -ing for a habit unless the meaning is right now.',
      'This form does not always mean right now.',
      'For work, taste, schedules, and stable facts use I work / she works.',
    ],
    'pt-BR': [
      'Para um hábito: I drink coffee every morning.',
      'Para um fato: Water freezes at 0C.',
      'Para um horário: The bus leaves at 8.',
      'Com I/you/we/they use work, live, eat.',
      'Com he/she/it acrescente -s ou -es: works, goes, opens.',
      'Every day, usually, often, always muitas vezes mostram hábito.',
      'Não coloque am/is/are antes de uma ação normal.',
      'Não use -ing para um hábito, a menos que o sentido seja “agora mesmo”.',
      'Essa forma nem sempre significa “agora mesmo”.',
      'Para trabalho, gosto, horários e fatos estáveis, use I work / she works.',
    ],
    vi: [
      'Cho thói quen: I drink coffee every morning.',
      'Cho sự thật: Water freezes at 0C.',
      'Cho lịch trình: The bus leaves at 8.',
      'Với I/you/we/they, dùng work, live, eat.',
      'Với he/she/it, thêm -s hoặc -es: works, goes, opens.',
      'Every day, usually, often, always thường chỉ thói quen.',
      'Đừng đặt am/is/are trước một hành động bình thường.',
      'Đừng dùng -ing cho thói quen trừ khi nghĩa là “ngay bây giờ”.',
      'Dạng này không phải lúc nào cũng có nghĩa là “ngay bây giờ”.',
      'Với công việc, sở thích, lịch trình và sự thật ổn định, dùng I work / she works.',
    ],
    id: [
      'Untuk kebiasaan: I drink coffee every morning.',
      'Untuk fakta: Water freezes at 0C.',
      'Untuk jadwal: The bus leaves at 8.',
      'Dengan I/you/we/they, gunakan work, live, eat.',
      'Dengan he/she/it, tambahkan -s atau -es: works, goes, opens.',
      'Every day, usually, often, always sering menunjukkan kebiasaan.',
      'Jangan letakkan am/is/are sebelum aksi biasa.',
      'Jangan gunakan -ing untuk kebiasaan kecuali maknanya “sekarang juga”.',
      'Bentuk ini tidak selalu berarti “sekarang juga”.',
      'Untuk pekerjaan, selera, jadwal, dan fakta stabil, gunakan I work / she works.',
    ],
    tr: [
      'Alışkanlık için: I drink coffee every morning.',
      'Gerçek için: Water freezes at 0C.',
      'Program için: The bus leaves at 8.',
      'I/you/we/they ile work, live, eat kullan.',
      'He/she/it ile -s veya -es ekle: works, goes, opens.',
      'Every day, usually, often, always çoğu zaman alışkanlık gösterir.',
      'Normal bir eylemden önce am/is/are koyma.',
      'Anlam “tam şu anda” değilse alışkanlık için -ing kullanma.',
      'Bu yapı her zaman “şu anda” demek değildir.',
      'İş, zevk, program ve sabit gerçekler için I work / she works kullan.',
    ],
    pl: [
      'Dla nawyku: I drink coffee every morning.',
      'Dla faktu: Water freezes at 0C.',
      'Dla rozkładu: The bus leaves at 8.',
      'Z I/you/we/they użyj work, live, eat.',
      'Z he/she/it dodaj -s albo -es: works, goes, opens.',
      'Every day, usually, often, always często pokazują nawyk.',
      'Nie stawiaj am/is/are przed zwykłą czynnością.',
      'Nie używaj -ing dla nawyku, jeśli sens nie brzmi “właśnie teraz”.',
      'Ta forma nie zawsze znaczy “właśnie teraz”.',
      'Dla pracy, gustu, rozkładu i stałych faktów użyj I work / she works.',
    ],
  },
  examples: [
    { en: 'I work every day.', ru: 'Я работаю каждый день.', uk: 'Я працюю щодня.', es: 'Trabajo todos los dias.', 'pt-BR': 'Eu trabalho todos os dias.', vi: 'Tôi làm việc mỗi ngày.', id: 'Saya bekerja setiap hari.', tr: 'Her gün çalışırım.', pl: 'Pracuję codziennie.', why: tri('Every day = привычка. С I: work.', 'Every day = звичка. З I: work.', 'Every day = habit. With I: work.', { 'pt-BR': 'Every day = hábito. Com I: work.', vi: 'Every day = thói quen. Với I: work.', id: 'Every day = kebiasaan. Dengan I: work.', tr: 'Every day = alışkanlık. I ile: work.', pl: 'Every day = nawyk. Z I: work.' }) },
    { en: 'She works every day.', ru: 'Она работает каждый день.', uk: 'Вона працює щодня.', es: 'She works every day.', 'pt-BR': 'Ela trabalha todos os dias.', vi: 'Cô ấy làm việc mỗi ngày.', id: 'Dia bekerja setiap hari.', tr: 'Her gün çalışır.', pl: 'Ona pracuje codziennie.', why: tri('She добавляет -s: works.', 'She додає -s: works.', 'She adds -s: works.', { 'pt-BR': 'She acrescenta -s: works.', vi: 'She thêm -s: works.', id: 'She menambahkan -s: works.', tr: 'She -s ekler: works.', pl: 'She dodaje -s: works.' }) },
    { en: 'They live in Dublin.', ru: 'Они живут в Дублине.', uk: 'Вони живуть у Дубліні.', es: 'They live in Dublin.', 'pt-BR': 'Eles moram em Dublin.', vi: 'Họ sống ở Dublin.', id: 'Mereka tinggal di Dublin.', tr: 'Dublin’de yaşıyorlar.', pl: 'Oni mieszkają w Dublinie.', why: tri('They = live, без -s.', 'They = live, без -s.', 'They = live, no -s.', { 'pt-BR': 'They = live, sem -s.', vi: 'They = live, không có -s.', id: 'They = live, tanpa -s.', tr: 'They = live, -s yok.', pl: 'They = live, bez -s.' }) },
    { en: 'He likes coffee.', ru: 'Он любит кофе.', uk: 'Він любить каву.', es: 'He likes coffee.', 'pt-BR': 'Ele gosta de café.', vi: 'Anh ấy thích cà phê.', id: 'Dia suka kopi.', tr: 'Kahveyi sever.', pl: 'On lubi kawę.', why: tri('He добавляет -s: likes.', 'He додає -s: likes.', 'He adds -s: likes.', { 'pt-BR': 'He acrescenta -s: likes.', vi: 'He thêm -s: likes.', id: 'He menambahkan -s: likes.', tr: 'He -s ekler: likes.', pl: 'He dodaje -s: likes.' }) },
    { en: 'The shop opens at 9.', ru: 'Магазин открывается в 9.', uk: 'Магазин відкривається о 9.', es: 'The shop opens at 9.', 'pt-BR': 'A loja abre às 9.', vi: 'Cửa hàng mở cửa lúc 9 giờ.', id: 'Toko buka jam 9.', tr: 'Dükkan saat 9’da açılır.', pl: 'Sklep otwiera się o 9.', why: tri('Расписание: the shop opens.', 'Розклад: the shop opens.', 'Schedule: the shop opens.', { 'pt-BR': 'Horário: the shop opens.', vi: 'Lịch trình: the shop opens.', id: 'Jadwal: the shop opens.', tr: 'Program: the shop opens.', pl: 'Rozkład: the shop opens.' }) },
    { en: 'Water freezes at 0C.', ru: 'Вода замерзает при 0C.', uk: 'Вода замерзає при 0C.', es: 'Water freezes at 0C.', 'pt-BR': 'A água congela a 0C.', vi: 'Nước đóng băng ở 0C.', id: 'Air membeku pada 0C.', tr: 'Su 0C’de donar.', pl: 'Woda zamarza przy 0C.', why: tri('Общий факт: water freezes.', 'Загальний факт: water freezes.', 'General fact: water freezes.', { 'pt-BR': 'Fato geral: water freezes.', vi: 'Sự thật chung: water freezes.', id: 'Fakta umum: water freezes.', tr: 'Genel gerçek: water freezes.', pl: 'Ogólny fakt: water freezes.' }) },
    { en: 'We usually eat at home.', ru: 'Мы обычно едим дома.', uk: 'Ми зазвичай їмо вдома.', es: 'We usually eat at home.', 'pt-BR': 'Normalmente comemos em casa.', vi: 'Chúng tôi thường ăn ở nhà.', id: 'Kami biasanya makan di rumah.', tr: 'Genellikle evde yemek yeriz.', pl: 'Zwykle jemy w domu.', why: tri('Usually = привычка. We eat.', 'Usually = звичка. We eat.', 'Usually = habit. We eat.', { 'pt-BR': 'Usually = hábito. We eat.', vi: 'Usually = thói quen. We eat.', id: 'Usually = kebiasaan. We eat.', tr: 'Usually = alışkanlık. We eat.', pl: 'Usually = nawyk. We eat.' }) },
    { en: 'My brother studies English.', ru: 'Мой брат учит английский.', uk: 'Мій брат вчить англійську.', es: 'My brother studies English.', 'pt-BR': 'Meu irmão estuda inglês.', vi: 'Anh trai tôi học tiếng Anh.', id: 'Saudara laki-laki saya belajar bahasa Inggris.', tr: 'Kardeşim İngilizce çalışır.', pl: 'Mój brat uczy się angielskiego.', why: tri('My brother = he. Study становится studies.', 'My brother = he. Study стає studies.', 'My brother = he. Study becomes studies.', { 'pt-BR': 'My brother = he. Study vira studies.', vi: 'My brother = he. Study trở thành studies.', id: 'My brother = he. Study menjadi studies.', tr: 'My brother = he. Study, studies olur.', pl: 'My brother = he. Study zmienia się w studies.' }) },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Похоже, ты лечишь привычку через am/is/are или -ing. Но I am work и I working не работают. Нормально: I work every day.',
        'Схоже, ти лікуєш звичку через am/is/are або -ing. Але I am work і I working не працюють. Нормально: I work every day.',
        'You may be treating a habit as a right-now action. I am work and I working do not work. Use: I work every day.',
        {
          'pt-BR': 'Talvez você esteja tratando um hábito como uma ação de agora. I am work e I working não funcionam. Use: I work every day.',
          vi: 'Có thể bạn đang xử lý thói quen như một hành động ngay bây giờ. I am work và I working không đúng. Dùng: I work every day.',
          id: 'Mungkin kamu memperlakukan kebiasaan seperti aksi sekarang. I am work dan I working tidak berfungsi. Gunakan: I work every day.',
          tr: 'Bir alışkanlığı şu an olan eylem gibi kuruyor olabilirsin. I am work ve I working olmaz. Kullan: I work every day.',
          pl: 'Możliwe, że traktujesz nawyk jak czynność dziejącą się teraz. I am work i I working nie działają. Użyj: I work every day.',
        },
      ),
    },
    { id: 'intro_rule', type: 'rule', text: tri('Формула простая: с I/you/we/they действие без хвоста. С he/she/it появляется -s или -es.', 'Формула проста: з I/you/we/they дія без хвоста. З he/she/it зʼявляється -s або -es.', 'Formula: I work, you work, we work, they work. But he/she/it: works.', { 'pt-BR': 'A fórmula é simples: com I/you/we/they a ação não tem final extra. Com he/she/it aparece -s ou -es.', vi: 'Công thức đơn giản: với I/you/we/they hành động không có đuôi. Với he/she/it xuất hiện -s hoặc -es.', id: 'Rumusnya sederhana: dengan I/you/we/they aksi tanpa akhiran. Dengan he/she/it muncul -s atau -es.', tr: 'Formül basit: I/you/we/they ile eylem ek almaz. he/she/it ile -s veya -es gelir.', pl: 'Formuła jest prosta: z I/you/we/they czynność jest bez końcówki. Z he/she/it pojawia się -s albo -es.' }) },
    { id: 'intro_warning', type: 'warning', text: tri('Не говори I am work или I working every day. Для привычки: I work every day.', 'Не кажи I am work або I working every day. Для звички: I work every day.', 'Do not say I am work or I working every day. For a habit: I work every day.', { 'pt-BR': 'Não diga I am work nem I working every day. Para um hábito: I work every day.', vi: 'Đừng nói I am work hoặc I working every day. Với thói quen: I work every day.', id: 'Jangan katakan I am work atau I working every day. Untuk kebiasaan: I work every day.', tr: 'I am work veya I working every day deme. Alışkanlık için: I work every day.', pl: 'Nie mów I am work ani I working every day. Dla nawyku: I work every day.' }) },
  ],
  steps: [
    psStep({ id: 'ps_statement_easy_001', order: 1, difficulty: 'easy', targetSkill: 'habit_base_i', sentence: 'I ___ every day.', translation: tri('Я работаю каждый день.', 'Я працюю щодня.', 'I work every day.', { 'pt-BR': 'Eu trabalho todos os dias.', vi: 'Tôi làm việc mỗi ngày.', id: 'Saya bekerja setiap hari.', tr: 'Her gün çalışırım.', pl: 'Pracuję codziennie.' }), options: ['work', 'works', 'am work', 'working'], correctAnswer: 'work', correctFeedback: tri('Да. Every day показывает привычку. С I: work.', 'Так. Every day показує звичку. З I: work.', 'Yes. Every day shows habit. With I: work.', { 'pt-BR': 'Sim. Every day mostra hábito. Com I: work.', vi: 'Đúng. Every day chỉ thói quen. Với I: work.', id: 'Ya. Every day menunjukkan kebiasaan. Dengan I: work.', tr: 'Evet. Every day alışkanlık gösterir. I ile: work.', pl: 'Tak. Every day pokazuje nawyk. Z I: work.' }), wrong: { works: tri('Works для he/she/it. С I нужно work.', 'Works для he/she/it. З I потрібно work.', 'Works is for he/she/it. With I, use work.', { 'pt-BR': 'Works é para he/she/it. Com I, use work.', vi: 'Works dùng cho he/she/it. Với I, dùng work.', id: 'Works untuk he/she/it. Dengan I, gunakan work.', tr: 'Works he/she/it içindir. I ile work kullan.', pl: 'Works jest dla he/she/it. Z I użyj work.' }), 'am work': tri('I am work не работает. Не ставь am перед work. Скажи I work.', 'I am work не працює. Не став am перед work. Скажи I work.', 'I am work does not work. Do not put am before work. Say I work.', { 'pt-BR': 'I am work não funciona. Não coloque am antes de work. Diga I work.', vi: 'I am work không đúng. Đừng đặt am trước work. Nói I work.', id: 'I am work tidak benar. Jangan letakkan am sebelum work. Katakan I work.', tr: 'I am work olmaz. work önüne am koyma. I work de.', pl: 'I am work nie działa. Nie stawiaj am przed work. Powiedz I work.' }), working: tri('Working нужно со словом am для действия прямо сейчас. Для every day скажи I work.', 'Working потрібне зі словом am для дії просто зараз. Для every day скажи I work.', 'Working needs am for an action right now. For every day, say I work.', { 'pt-BR': 'Working precisa de am para uma ação agora. Para every day, diga I work.', vi: 'Working cần am cho hành động ngay bây giờ. Với every day, nói I work.', id: 'Working perlu am untuk aksi sekarang. Untuk every day, katakan I work.', tr: 'Working şu anki eylem için am ister. Every day için I work de.', pl: 'Working wymaga am dla czynności teraz. Dla every day powiedz I work.' }) }, retryLine: 'Every day = привычка. I + work.', model: 'I work every day / She works every day', focusWords: ['I', 'work'] }),
    psStep({ id: 'ps_statement_easy_002', order: 2, difficulty: 'easy', targetSkill: 'habit_base_they', sentence: 'They ___ in Dublin.', translation: tri('Они живут в Дублине.', 'Вони живуть у Дубліні.', 'They live in Dublin.', { 'pt-BR': 'Eles moram em Dublin.', vi: 'Họ sống ở Dublin.', id: 'Mereka tinggal di Dublin.', tr: 'Dublin’de yaşıyorlar.', pl: 'Oni mieszkają w Dublinie.' }), options: ['live', 'lives', 'are live', 'living'], correctAnswer: 'live', correctFeedback: tri('Да. С they нужно live.', 'Так. З they потрібно live.', 'Yes. With they use live.', { 'pt-BR': 'Sim. Com they, use live.', vi: 'Đúng. Với they, dùng live.', id: 'Ya. Dengan they, gunakan live.', tr: 'Evet. They ile live kullan.', pl: 'Tak. Z they użyj live.' }), wrong: { lives: tri('Lives для he/she/it. They нужно live.', 'Lives для he/she/it. They потрібно live.', 'Lives is for he/she/it. With they, use live.', { 'pt-BR': 'Lives é para he/she/it. Com they, use live.', vi: 'Lives dùng cho he/she/it. Với they, dùng live.', id: 'Lives untuk he/she/it. Dengan they, gunakan live.', tr: 'Lives he/she/it içindir. They ile live kullan.', pl: 'Lives jest dla he/she/it. Z they użyj live.' }), 'are live': tri('Are live не работает. С обычным действием не ставь are. Скажи They live.', 'Are live не працює. Зі звичайною дією не став are. Скажи They live.', 'Are live does not work. Do not put are before a normal action. Say They live.', { 'pt-BR': 'Are live não funciona. Não coloque are antes de uma ação normal. Diga They live.', vi: 'Are live không đúng. Đừng đặt are trước hành động bình thường. Nói They live.', id: 'Are live tidak benar. Jangan letakkan are sebelum aksi biasa. Katakan They live.', tr: 'Are live olmaz. Normal eylemden önce are koyma. They live de.', pl: 'Are live nie działa. Nie stawiaj are przed zwykłą czynnością. Powiedz They live.' }), living: tri('Living без are не работает. Для стабильного места жизни: They live.', 'Living без are не працює. Для стабільного місця життя: They live.', 'Living without are does not work. For a stable place of living: They live.', { 'pt-BR': 'Living sem are não funciona. Para um lugar de vida estável: They live.', vi: 'Living không có are thì không đúng. Với nơi sống ổn định: They live.', id: 'Living tanpa are tidak benar. Untuk tempat tinggal yang stabil: They live.', tr: 'Living are olmadan olmaz. Sabit yaşam yeri için: They live.', pl: 'Living bez are nie działa. Dla stałego miejsca życia: They live.' }) }, retryLine: 'They = live. Без -s.', model: 'They live / He lives', focusWords: ['they', 'live'] }),
    psStep({ id: 'ps_statement_easy_003', order: 3, difficulty: 'easy', targetSkill: 'habit_base_we', sentence: 'We usually ___ at home.', translation: tri('Мы обычно едим дома.', 'Ми зазвичай їмо вдома.', 'We usually eat at home.', { 'pt-BR': 'Normalmente comemos em casa.', vi: 'Chúng tôi thường ăn ở nhà.', id: 'Kami biasanya makan di rumah.', tr: 'Genellikle evde yemek yeriz.', pl: 'Zwykle jemy w domu.' }), options: ['eat', 'eats', 'are eat', 'eating'], correctAnswer: 'eat', correctFeedback: tri('Да. Usually показывает привычку. С we: eat.', 'Так. Usually показує звичку. З we: eat.', 'Yes. Usually shows habit. With we: eat.', { 'pt-BR': 'Sim. Usually mostra hábito. Com we: eat.', vi: 'Đúng. Usually chỉ thói quen. Với we: eat.', id: 'Ya. Usually menunjukkan kebiasaan. Dengan we: eat.', tr: 'Evet. Usually alışkanlık gösterir. We ile: eat.', pl: 'Tak. Usually pokazuje nawyk. Z we: eat.' }), wrong: { eats: tri('Eats для he/she/it. We нужно eat.', 'Eats для he/she/it. We потрібно eat.', 'Eats is for he/she/it. With we, use eat.', { 'pt-BR': 'Eats é para he/she/it. Com we, use eat.', vi: 'Eats dùng cho he/she/it. Với we, dùng eat.', id: 'Eats untuk he/she/it. Dengan we, gunakan eat.', tr: 'Eats he/she/it içindir. We ile eat kullan.', pl: 'Eats jest dla he/she/it. Z we użyj eat.' }), 'are eat': tri('Are eat не работает. Скажи We eat.', 'Are eat не працює. Скажи We eat.', 'Are eat does not work. Say We eat.', { 'pt-BR': 'Are eat não funciona. Diga We eat.', vi: 'Are eat không đúng. Nói We eat.', id: 'Are eat tidak benar. Katakan We eat.', tr: 'Are eat olmaz. We eat de.', pl: 'Are eat nie działa. Powiedz We eat.' }), eating: tri('Eating без are не работает. Usually ведет к We usually eat.', 'Eating без are не працює. Usually веде до We usually eat.', 'Eating without are does not work. Usually points to We usually eat.', { 'pt-BR': 'Eating sem are não funciona. Usually aponta para We usually eat.', vi: 'Eating không có are thì không đúng. Usually dẫn tới We usually eat.', id: 'Eating tanpa are tidak benar. Usually mengarah ke We usually eat.', tr: 'Eating are olmadan olmaz. Usually, We usually eat yapısına götürür.', pl: 'Eating bez are nie działa. Usually prowadzi do We usually eat.' }) }, retryLine: 'Usually = привычка. We + eat.', model: 'We eat / She eats', focusWords: ['usually', 'eat'] }),
    psStep({ id: 'ps_statement_contrast_001', order: 4, difficulty: 'contrast', targetSkill: 'third_person_s_likes', sentence: 'He ___ coffee.', translation: tri('Он любит кофе.', 'Він любить каву.', 'He likes coffee.', { 'pt-BR': 'Ele gosta de café.', vi: 'Anh ấy thích cà phê.', id: 'Dia suka kopi.', tr: 'Kahveyi sever.', pl: 'On lubi kawę.' }), options: ['like', 'likes', 'is like', 'liking'], correctAnswer: 'likes', correctFeedback: tri('Да. He добавляет -s: likes.', 'Так. He додає -s: likes.', 'Yes. He adds -s: likes.', { 'pt-BR': 'Sim. He acrescenta -s: likes.', vi: 'Đúng. He thêm -s: likes.', id: 'Ya. He menambahkan -s: likes.', tr: 'Evet. He -s ekler: likes.', pl: 'Tak. He dodaje -s: likes.' }), wrong: { like: tri('Like без -s для I/you/we/they. С he нужно likes.', 'Like без -s для I/you/we/they. З he потрібно likes.', 'Like without -s is for I/you/we/they. With he, use likes.', { 'pt-BR': 'Like sem -s é para I/you/we/they. Com he, use likes.', vi: 'Like không có -s dùng cho I/you/we/they. Với he, dùng likes.', id: 'Like tanpa -s untuk I/you/we/they. Dengan he, gunakan likes.', tr: '-s olmayan like I/you/we/they içindir. He ile likes kullan.', pl: 'Like bez -s jest dla I/you/we/they. Z he użyj likes.' }), 'is like': tri('Is like может значить "похож на". Для вкуса скажи He likes.', 'Is like може означати "схожий на". Для смаку скажи He likes.', 'Is like can mean "looks like". For taste, say He likes.', { 'pt-BR': 'Is like pode significar "parece". Para gosto, diga He likes.', vi: 'Is like có thể nghĩa là "giống". Với sở thích, nói He likes.', id: 'Is like bisa berarti "mirip". Untuk selera, katakan He likes.', tr: 'Is like "benziyor" anlamına gelebilir. Zevk için He likes de.', pl: 'Is like może znaczyć "jest podobny". Dla gustu powiedz He likes.' }), liking: tri('Liking здесь не подходит. Стабильный вкус: likes.', 'Liking тут не підходить. Стабільний смак: likes.', 'Liking does not fit here. Stable taste: likes.', { 'pt-BR': 'Liking não encaixa aqui. Gosto estável: likes.', vi: 'Liking không phù hợp ở đây. Sở thích ổn định: likes.', id: 'Liking tidak cocok di sini. Selera stabil: likes.', tr: 'Liking burada uymaz. Sabit zevk: likes.', pl: 'Liking tutaj nie pasuje. Stały gust: likes.' }) }, retryLine: 'He + -s. He likes.', model: 'I like / He likes', focusWords: ['he', 'likes'] }),
    psStep({ id: 'ps_statement_contrast_002', order: 5, difficulty: 'contrast', targetSkill: 'third_person_es_goes', sentence: 'She ___ to the gym every morning.', translation: tri('Она ходит в gym каждое утро.', 'Вона ходить у gym щоранку.', 'She goes to the gym every morning.', { 'pt-BR': 'Ela vai à academia todas as manhãs.', vi: 'Cô ấy đến phòng gym mỗi sáng.', id: 'Dia pergi ke gym setiap pagi.', tr: 'Her sabah spor salonuna gider.', pl: 'Ona chodzi na siłownię każdego ranka.' }), options: ['go', 'goes', 'is go', 'going'], correctAnswer: 'goes', correctFeedback: tri('Да. She + go становится goes.', 'Так. She + go стає goes.', 'Yes. She + go becomes goes.', { 'pt-BR': 'Sim. She + go vira goes.', vi: 'Đúng. She + go thành goes.', id: 'Ya. She + go menjadi goes.', tr: 'Evet. She + go, goes olur.', pl: 'Tak. She + go zmienia się w goes.' }), wrong: { go: tri('Go для I/you/we/they. С she нужно goes.', 'Go для I/you/we/they. З she потрібно goes.', 'Go is for I/you/we/they. With she, use goes.', { 'pt-BR': 'Go é para I/you/we/they. Com she, use goes.', vi: 'Go dùng cho I/you/we/they. Với she, dùng goes.', id: 'Go untuk I/you/we/they. Dengan she, gunakan goes.', tr: 'Go I/you/we/they içindir. She ile goes kullan.', pl: 'Go jest dla I/you/we/they. Z she użyj goes.' }), 'is go': tri('Is go не работает. Для every morning скажи She goes.', 'Is go не працює. Для every morning скажи She goes.', 'Is go does not work. For every morning, say She goes.', { 'pt-BR': 'Is go não funciona. Para every morning, diga She goes.', vi: 'Is go không đúng. Với every morning, nói She goes.', id: 'Is go tidak benar. Untuk every morning, katakan She goes.', tr: 'Is go olmaz. Every morning için She goes de.', pl: 'Is go nie działa. Dla every morning powiedz She goes.' }), going: tri('Going без is не работает, и every morning ведет к goes.', 'Going без is не працює, і every morning веде до goes.', 'Going without is does not work, and every morning points to goes.', { 'pt-BR': 'Going sem is não funciona, e every morning aponta para goes.', vi: 'Going không có is thì không đúng, và every morning dẫn tới goes.', id: 'Going tanpa is tidak benar, dan every morning mengarah ke goes.', tr: 'Going is olmadan olmaz ve every morning goes yapısına götürür.', pl: 'Going bez is nie działa, a every morning prowadzi do goes.' }) }, retryLine: 'She + go = goes.', model: 'I go / She goes', focusWords: ['she', 'goes'] }),
    psStep({ id: 'ps_statement_contrast_003', order: 6, difficulty: 'contrast', targetSkill: 'third_person_ies_studies', sentence: 'My brother ___ English.', translation: tri('Мой брат учит английский.', 'Мій брат вчить англійську.', 'My brother studies English.', { 'pt-BR': 'Meu irmão estuda inglês.', vi: 'Anh trai tôi học tiếng Anh.', id: 'Saudara laki-laki saya belajar bahasa Inggris.', tr: 'Kardeşim İngilizce çalışır.', pl: 'Mój brat uczy się angielskiego.' }), options: ['study', 'studies', 'studys', 'is study'], correctAnswer: 'studies', correctFeedback: tri('Да. My brother = he. Study становится studies.', 'Так. My brother = he. Study стає studies.', 'Yes. My brother = he. Study becomes studies.', { 'pt-BR': 'Sim. My brother = he. Study vira studies.', vi: 'Đúng. My brother = he. Study thành studies.', id: 'Ya. My brother = he. Study menjadi studies.', tr: 'Evet. My brother = he. Study, studies olur.', pl: 'Tak. My brother = he. Study zmienia się w studies.' }), wrong: { study: tri('Для my brother работает как для he: нужна форма studies.', 'Для my brother працює як для he: потрібна форма studies.', 'Study is for I/you/we/they. My brother = he, so use studies.', { 'pt-BR': 'My brother funciona como he: precisa da forma studies.', vi: 'My brother hoạt động như he: cần dạng studies.', id: 'My brother bekerja seperti he: perlu bentuk studies.', tr: 'My brother he gibi çalışır: studies biçimi gerekir.', pl: 'My brother działa jak he: potrzebna jest forma studies.' }), studys: tri('Studys не работает. Study меняется в studies.', 'Studys не працює. Study змінюється на studies.', 'Studys does not work. Study becomes studies.', { 'pt-BR': 'Studys não funciona. Study vira studies.', vi: 'Studys không đúng. Study chuyển thành studies.', id: 'Studys tidak benar. Study menjadi studies.', tr: 'Studys olmaz. Study, studies olur.', pl: 'Studys nie działa. Study zmienia się w studies.' }), 'is study': tri('Is study не работает. Скажи My brother studies.', 'Is study не працює. Скажи My brother studies.', 'Is study does not work. Say My brother studies.', { 'pt-BR': 'Is study não funciona. Diga My brother studies.', vi: 'Is study không đúng. Nói My brother studies.', id: 'Is study tidak benar. Katakan My brother studies.', tr: 'Is study olmaz. My brother studies de.', pl: 'Is study nie działa. Powiedz My brother studies.' }) }, retryLine: 'Brother = he. Study -> studies.', model: 'I study / He studies', focusWords: ['brother', 'studies'] }),
    psStep({ id: 'ps_statement_contrast_004', order: 7, difficulty: 'contrast', targetSkill: 'no_be_with_main_verb', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.', { 'pt-BR': 'Escolha a frase correta.', vi: 'Chọn câu đúng.', id: 'Pilih kalimat yang benar.', tr: 'Doğru cümleyi seç.', pl: 'Wybierz poprawne zdanie.' }), options: ['I work every day.', 'I am work every day.', 'I working every day.', 'I am works every day.'], correctAnswer: 'I work every day.', correctFeedback: tri('Да. Для привычки every day: I work.', 'Так. Для звички every day: I work.', 'Yes. For habit every day: I work.', { 'pt-BR': 'Sim. Para hábito com every day: I work.', vi: 'Đúng. Với thói quen every day: I work.', id: 'Ya. Untuk kebiasaan every day: I work.', tr: 'Evet. Every day alışkanlığı için: I work.', pl: 'Tak. Dla nawyku every day: I work.' }), wrong: { 'I am work every day.': tri('Am не ставим перед work в такой фразе. Нужно I work.', 'Am не ставимо перед work у такій фразі. Потрібно I work.', 'Do not put am before work in this phrase. Use I work.', { 'pt-BR': 'Não coloque am antes de work nesta frase. Use I work.', vi: 'Đừng đặt am trước work trong câu này. Dùng I work.', id: 'Jangan letakkan am sebelum work dalam kalimat ini. Gunakan I work.', tr: 'Bu cümlede work önüne am koyma. I work kullan.', pl: 'Nie stawiaj am przed work w takim zdaniu. Użyj I work.' }), 'I working every day.': tri('I working не работает. Для привычки нужно I work.', 'I working не працює. Для звички потрібно I work.', 'I working does not work. For a habit, use I work.', { 'pt-BR': 'I working não funciona. Para hábito, use I work.', vi: 'I working không đúng. Với thói quen, dùng I work.', id: 'I working tidak benar. Untuk kebiasaan, gunakan I work.', tr: 'I working olmaz. Alışkanlık için I work kullan.', pl: 'I working nie działa. Dla nawyku użyj I work.' }), 'I am works every day.': tri('Тут лишнее am и неверное works с I. Нужно I work.', 'Тут зайве am і неправильне works з I. Потрібно I work.', 'Here am is extra, and works is wrong with I. Use I work.', { 'pt-BR': 'Aqui am é extra, e works está errado com I. Use I work.', vi: 'Ở đây am bị thừa, và works sai với I. Dùng I work.', id: 'Di sini am berlebih, dan works salah dengan I. Gunakan I work.', tr: 'Burada am fazla, works de I ile yanlış. I work kullan.', pl: 'Tutaj am jest zbędne, a works błędne z I. Użyj I work.' }) }, retryLine: 'Привычка: I work. Без am и без -ing.', model: 'I work every day', focusWords: ['I work'] }),
    psStep({ id: 'ps_statement_contrast_005', order: 8, difficulty: 'contrast', targetSkill: 'no_ing_for_habit', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.', { 'pt-BR': 'Escolha a frase correta.', vi: 'Chọn câu đúng.', id: 'Pilih kalimat yang benar.', tr: 'Doğru cümleyi seç.', pl: 'Wybierz poprawne zdanie.' }), options: ['They play football on Sundays.', 'They playing football on Sundays.', 'They are play football on Sundays.', 'They plays football on Sundays.'], correctAnswer: 'They play football on Sundays.', correctFeedback: tri('Да. On Sundays показывает привычку. They play.', 'Так. On Sundays показує звичку. They play.', 'Yes. On Sundays shows routine. They play.', { 'pt-BR': 'Sim. On Sundays mostra hábito. They play.', vi: 'Đúng. On Sundays chỉ thói quen. They play.', id: 'Ya. On Sundays menunjukkan rutinitas. They play.', tr: 'Evet. On Sundays alışkanlık gösterir. They play.', pl: 'Tak. On Sundays pokazuje nawyk. They play.' }), wrong: { 'They playing football on Sundays.': tri('They playing не работает. Для on Sundays: They play.', 'Без are такая форма не працює. Для on Sundays: They play.', 'They playing does not work. For on Sundays: They play.', { 'pt-BR': 'They playing não funciona. Para on Sundays: They play.', vi: 'They playing không đúng. Với on Sundays: They play.', id: 'They playing tidak benar. Untuk on Sundays: They play.', tr: 'They playing olmaz. On Sundays için: They play.', pl: 'They playing nie działa. Dla on Sundays: They play.' }), 'They are play football on Sundays.': tri('Are play не работает. Не ставь are перед play в такой фразе.', 'Are play не працює. Не став are перед play у такій фразі.', 'Are play does not work. Do not put are before play in this phrase.', { 'pt-BR': 'Are play não funciona. Não coloque are antes de play nesta frase.', vi: 'Are play không đúng. Đừng đặt are trước play trong câu này.', id: 'Are play tidak benar. Jangan letakkan are sebelum play dalam kalimat ini.', tr: 'Are play olmaz. Bu cümlede play önüne are koyma.', pl: 'Are play nie działa. Nie stawiaj are przed play w takim zdaniu.' }), 'They plays football on Sundays.': tri('Plays для he/she/it. They нужно play.', 'Plays для he/she/it. They потрібно play.', 'Plays is for he/she/it. With they, use play.', { 'pt-BR': 'Plays é para he/she/it. Com they, use play.', vi: 'Plays dùng cho he/she/it. Với they, dùng play.', id: 'Plays untuk he/she/it. Dengan they, gunakan play.', tr: 'Plays he/she/it içindir. They ile play kullan.', pl: 'Plays jest dla he/she/it. Z they użyj play.' }) }, retryLine: 'They + play. On Sundays = привычка.', model: 'They play / He plays', focusWords: ['they play'] }),
    psStep({ id: 'ps_statement_contrast_006', order: 9, difficulty: 'contrast', targetSkill: 'unneeded_auxiliary_in_statement', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.', { 'pt-BR': 'Escolha a frase correta.', vi: 'Chọn câu đúng.', id: 'Pilih kalimat yang benar.', tr: 'Doğru cümleyi seç.', pl: 'Wybierz poprawne zdanie.' }), options: ['We study English every evening.', 'We do study English every evening.', 'We are study English every evening.', 'We studies English every evening.'], correctAnswer: 'We study English every evening.', correctFeedback: tri('Да. Нормальная фраза: We study.', 'Так. Нормальна фраза: We study.', 'Yes. Normal sentence: We study.', { 'pt-BR': 'Sim. Frase normal: We study.', vi: 'Đúng. Câu bình thường: We study.', id: 'Ya. Kalimat normal: We study.', tr: 'Evet. Normal cümle: We study.', pl: 'Tak. Normalne zdanie: We study.' }), wrong: { 'We do study English every evening.': tri('Do study может быть сильным акцентом, но обычная фраза здесь: We study.', 'Do study може бути сильним акцентом, але звичайна фраза тут: We study.', 'Do study can be strong emphasis, but the normal phrase here is We study.', { 'pt-BR': 'Do study pode ser ênfase forte, mas a frase normal aqui é We study.', vi: 'Do study có thể là nhấn mạnh mạnh, nhưng câu bình thường ở đây là We study.', id: 'Do study bisa menjadi penekanan kuat, tetapi frasa normal di sini adalah We study.', tr: 'Do study güçlü vurgu olabilir, ama burada normal cümle We study olur.', pl: 'Do study może być mocnym akcentem, ale zwykłe zdanie tutaj to We study.' }), 'We are study English every evening.': tri('Are study не работает. Нужно We study.', 'Are study не працює. Потрібно We study.', 'Are study does not work. Use We study.', { 'pt-BR': 'Are study não funciona. Use We study.', vi: 'Are study không đúng. Dùng We study.', id: 'Are study tidak benar. Gunakan We study.', tr: 'Are study olmaz. We study kullan.', pl: 'Are study nie działa. Użyj We study.' }), 'We studies English every evening.': tri('Studies для he/she/it. We нужно study.', 'Studies для he/she/it. We потрібно study.', 'Studies is for he/she/it. With we, use study.', { 'pt-BR': 'Studies é para he/she/it. Com we, use study.', vi: 'Studies dùng cho he/she/it. Với we, dùng study.', id: 'Studies untuk he/she/it. Dengan we, gunakan study.', tr: 'Studies he/she/it içindir. We ile study kullan.', pl: 'Studies jest dla he/she/it. Z we użyj study.' }) }, retryLine: 'We + study.', model: 'We study / She studies', focusWords: ['we study'] }),
    psStep({ id: 'ps_statement_mixed_001', order: 10, difficulty: 'mixed', targetSkill: 'schedule_present_simple', sentence: 'The shop ___ at 9.', translation: tri('Магазин открывается в 9.', 'Магазин відкривається о 9.', 'The shop opens at 9.', { 'pt-BR': 'A loja abre às 9.', vi: 'Cửa hàng mở cửa lúc 9 giờ.', id: 'Toko buka jam 9.', tr: 'Dükkan saat 9’da açılır.', pl: 'Sklep otwiera się o 9.' }), options: ['open', 'opens', 'is open', 'opening'], correctAnswer: 'opens', correctFeedback: tri('Да. Это расписание. The shop = it, поэтому opens.', 'Так. Це розклад. The shop = it, тому opens.', 'Yes. This is a schedule. The shop = it, so opens.', { 'pt-BR': 'Sim. É um horário. The shop = it, então opens.', vi: 'Đúng. Đây là lịch trình. The shop = it, nên opens.', id: 'Ya. Ini jadwal. The shop = it, jadi opens.', tr: 'Evet. Bu bir program. The shop = it, bu yüzden opens.', pl: 'Tak. To rozkład. The shop = it, więc opens.' }), wrong: { open: tri('The shop = it. В такой фразе нужно opens.', 'The shop = it. У такій фразі потрібно opens.', 'The shop = it. In this phrase, use opens.', { 'pt-BR': 'The shop = it. Nesta frase, use opens.', vi: 'The shop = it. Trong câu này cần opens.', id: 'The shop = it. Dalam frasa ini, gunakan opens.', tr: 'The shop = it. Bu cümlede opens gerekir.', pl: 'The shop = it. W takim zdaniu potrzebne jest opens.' }), 'is open': tri('Is open может значить, что магазин открыт сейчас. Расписание открытия = opens at 9.', 'Is open може означати, що магазин відкритий зараз. Розклад відкриття = opens at 9.', 'Is open can mean the shop is open now. Opening schedule = opens at 9.', { 'pt-BR': 'Is open pode significar que a loja está aberta agora. Horário de abertura = opens at 9.', vi: 'Is open có thể nghĩa là cửa hàng đang mở bây giờ. Lịch mở cửa = opens at 9.', id: 'Is open bisa berarti toko sedang buka sekarang. Jadwal buka = opens at 9.', tr: 'Is open mağazanın şimdi açık olduğunu anlatabilir. Açılış programı = opens at 9.', pl: 'Is open może znaczyć, że sklep jest teraz otwarty. Rozkład otwarcia = opens at 9.' }), opening: tri('Opening без is не работает, а расписание ведет к opens.', 'Opening без is не працює, а розклад веде до opens.', 'Opening without is does not work, and a schedule points to opens.', { 'pt-BR': 'Opening sem is não funciona, e horário aponta para opens.', vi: 'Opening không có is thì không đúng, và lịch trình dẫn tới opens.', id: 'Opening tanpa is tidak benar, dan jadwal mengarah ke opens.', tr: 'Opening is olmadan olmaz ve program opens yapısına götürür.', pl: 'Opening bez is nie działa, a rozkład prowadzi do opens.' }) }, retryLine: 'Расписание = The shop opens.', model: 'The shop opens at 9', focusWords: ['opens'] }),
    psStep({ id: 'ps_statement_mixed_002', order: 11, difficulty: 'mixed', targetSkill: 'fact_present_simple', sentence: 'Water ___ at 0C.', translation: tri('Вода замерзает при 0C.', 'Вода замерзає при 0C.', 'Water freezes at 0C.', { 'pt-BR': 'A água congela a 0C.', vi: 'Nước đóng băng ở 0C.', id: 'Air membeku pada 0C.', tr: 'Su 0C’de donar.', pl: 'Woda zamarza przy 0C.' }), options: ['freeze', 'freezes', 'is freeze', 'freezing'], correctAnswer: 'freezes', correctFeedback: tri('Да. Это общий факт. Water = it, поэтому freezes.', 'Так. Це загальний факт. Water = it, тому freezes.', 'Yes. This is a general fact. Water = it, so freezes.', { 'pt-BR': 'Sim. É um fato geral. Water = it, então freezes.', vi: 'Đúng. Đây là sự thật chung. Water = it, nên freezes.', id: 'Ya. Ini fakta umum. Water = it, jadi freezes.', tr: 'Evet. Bu genel bir gerçek. Water = it, bu yüzden freezes.', pl: 'Tak. To ogólny fakt. Water = it, więc freezes.' }), wrong: { freeze: tri('Water = it. В такой фразе нужно freezes.', 'Water = it. У такій фразі потрібно freezes.', 'Water = it. In this phrase, use freezes.', { 'pt-BR': 'Water = it. Nesta frase, use freezes.', vi: 'Water = it. Trong câu này cần freezes.', id: 'Water = it. Dalam frasa ini, gunakan freezes.', tr: 'Water = it. Bu cümlede freezes gerekir.', pl: 'Water = it. W takim zdaniu potrzebne jest freezes.' }), 'is freeze': tri('Is freeze не работает. Для факта нужно freezes.', 'Is freeze не працює. Для факту потрібно freezes.', 'Is freeze does not work. For a fact, use freezes.', { 'pt-BR': 'Is freeze não funciona. Para um fato, use freezes.', vi: 'Is freeze không đúng. Với sự thật, dùng freezes.', id: 'Is freeze tidak benar. Untuk fakta, gunakan freezes.', tr: 'Is freeze olmaz. Gerçek için freezes kullan.', pl: 'Is freeze nie działa. Dla faktu użyj freezes.' }), freezing: tri('Freezing без is не работает. Для общего факта нужно freezes.', 'Freezing без is не працює. Для загального факту потрібно freezes.', 'Freezing without is does not work. For a general fact, use freezes.', { 'pt-BR': 'Freezing sem is não funciona. Para um fato geral, use freezes.', vi: 'Freezing không có is thì không đúng. Với sự thật chung, dùng freezes.', id: 'Freezing tanpa is tidak benar. Untuk fakta umum, gunakan freezes.', tr: 'Freezing is olmadan olmaz. Genel gerçek için freezes kullan.', pl: 'Freezing bez is nie działa. Dla ogólnego faktu użyj freezes.' }) }, retryLine: 'Факт = Water freezes.', model: 'Water freezes at 0C', focusWords: ['water', 'freezes'] }),
    psStep({ id: 'ps_statement_mixed_003', order: 12, difficulty: 'mixed', targetSkill: 'state_verb_likes', sentence: 'She ___ this idea.', translation: tri('Ей нравится эта идея.', 'Їй подобається ця ідея.', 'She likes this idea.', { 'pt-BR': 'Ela gosta desta ideia.', vi: 'Cô ấy thích ý tưởng này.', id: 'Dia menyukai ide ini.', tr: 'Bu fikri beğenir.', pl: 'Ona lubi ten pomysł.' }), options: ['like', 'likes', 'is liking', 'liking'], correctAnswer: 'likes', correctFeedback: tri('Да. Like здесь про стабильное отношение. She needs likes.', 'Так. Like тут про стабільне ставлення. She needs likes.', 'Yes. Like here is stable attitude. She needs likes.', { 'pt-BR': 'Sim. Like aqui fala de atitude estável. She precisa de likes.', vi: 'Đúng. Like ở đây nói về thái độ ổn định. She cần likes.', id: 'Ya. Like di sini tentang sikap stabil. She perlu likes.', tr: 'Evet. Like burada sabit tutum anlatır. She likes ister.', pl: 'Tak. Like mówi tu o stałym stosunku. She wymaga likes.' }), wrong: { like: tri('С she нужно likes.', 'З she потрібно likes.', 'With she, use likes.', { 'pt-BR': 'Com she, use likes.', vi: 'Với she, dùng likes.', id: 'Dengan she, gunakan likes.', tr: 'She ile likes kullan.', pl: 'Z she użyj likes.' }), 'is liking': tri('Is liking возможно только в особом контексте. Нормально: likes.', 'Is liking можливе тільки в особливому контексті. Нормально: likes.', 'Is liking is possible only in a special context. Normal form: likes.', { 'pt-BR': 'Is liking só é possível em contexto especial. Forma normal: likes.', vi: 'Is liking chỉ có thể dùng trong ngữ cảnh đặc biệt. Dạng bình thường: likes.', id: 'Is liking hanya mungkin dalam konteks khusus. Bentuk normal: likes.', tr: 'Is liking sadece özel bağlamda olabilir. Normal biçim: likes.', pl: 'Is liking jest możliwe tylko w szczególnym kontekście. Normalna forma: likes.' }), liking: tri('Liking без is не работает. Здесь нужно likes.', 'Liking без is не працює. Тут потрібно likes.', 'Liking without is does not work. Here you need likes.', { 'pt-BR': 'Liking sem is não funciona. Aqui você precisa de likes.', vi: 'Liking không có is thì không đúng. Ở đây cần likes.', id: 'Liking tanpa is tidak benar. Di sini perlu likes.', tr: 'Liking is olmadan olmaz. Burada likes gerekir.', pl: 'Liking bez is nie działa. Tutaj potrzebne jest likes.' }) }, retryLine: 'She + likes.', model: 'I like / She likes', focusWords: ['she', 'likes'] }),
    psStep({ id: 'ps_statement_mixed_004', order: 13, difficulty: 'mixed_review', targetSkill: 'mixed_subject_forms', sentence: 'Choose the correct pair.', translation: tri('Выбери правильную пару.', 'Обери правильну пару.', 'Choose the correct pair.', { 'pt-BR': 'Escolha o par correto.', vi: 'Chọn cặp đúng.', id: 'Pilih pasangan yang benar.', tr: 'Doğru çifti seç.', pl: 'Wybierz poprawną parę.' }), options: ['I work / She works', 'I works / She work', 'I am work / She is works', 'I working / She working'], correctAnswer: 'I work / She works', correctFeedback: tri('Да. I work. She works.', 'Так. I work. She works.', 'Yes. I work. She works.', { 'pt-BR': 'Sim. I work. She works.', vi: 'Đúng. I work. She works.', id: 'Ya. I work. She works.', tr: 'Evet. I work. She works.', pl: 'Tak. I work. She works.' }), wrong: { 'I works / She work': tri('Формы перевернуты: нужно I work / She works.', 'Форми перевернуті: потрібно I work / She works.', 'The forms are reversed: use I work / She works.', { 'pt-BR': 'As formas estão invertidas: use I work / She works.', vi: 'Các dạng bị đảo ngược: dùng I work / She works.', id: 'Bentuknya terbalik: gunakan I work / She works.', tr: 'Biçimler ters: I work / She works kullan.', pl: 'Formy są odwrócone: użyj I work / She works.' }), 'I am work / She is works': tri('Am/is здесь лишние. Нужно I work / She works.', 'Am/is тут зайві. Потрібно I work / She works.', 'Am/is are extra here. Use I work / She works.', { 'pt-BR': 'Am/is são extras aqui. Use I work / She works.', vi: 'Am/is bị thừa ở đây. Dùng I work / She works.', id: 'Am/is berlebih di sini. Gunakan I work / She works.', tr: 'Am/is burada fazla. I work / She works kullan.', pl: 'Am/is są tutaj zbędne. Użyj I work / She works.' }), 'I working / She working': tri('Working без am/is не работает, и это пара про привычку: I work / She works.', 'Working без am/is не працює, і це пара про звичку: I work / She works.', 'Working without am/is does not work, and this pair is about habit: I work / She works.', { 'pt-BR': 'Working sem am/is não funciona, e este par fala de hábito: I work / She works.', vi: 'Working không có am/is thì không đúng, và cặp này nói về thói quen: I work / She works.', id: 'Working tanpa am/is tidak benar, dan pasangan ini tentang kebiasaan: I work / She works.', tr: 'Working am/is olmadan olmaz ve bu çift alışkanlıkla ilgili: I work / She works.', pl: 'Working bez am/is nie działa, a ta para dotyczy nawyku: I work / She works.' }) }, retryLine: 'I = work. She = works.', model: 'I work / She works', focusWords: ['work', 'works'] }),
    psStep({ id: 'ps_statement_mixed_005', order: 14, difficulty: 'mixed_review', targetSkill: 'mixed_habit_schedule_fact', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.', { 'pt-BR': 'Escolha a frase correta.', vi: 'Chọn câu đúng.', id: 'Pilih kalimat yang benar.', tr: 'Doğru cümleyi seç.', pl: 'Wybierz poprawne zdanie.' }), options: ['He works every day, and the shop opens at 9.', 'He work every day, and the shop open at 9.', 'He is work every day, and the shop is open at 9.', 'He working every day, and the shop opening at 9.'], correctAnswer: 'He works every day, and the shop opens at 9.', correctFeedback: tri('Да. He works. The shop opens. Привычка и расписание.', 'Так. He works. The shop opens. Звичка і розклад.', 'Yes. He works. The shop opens. Habit and schedule.', { 'pt-BR': 'Sim. He works. The shop opens. Hábito e horário.', vi: 'Đúng. He works. The shop opens. Thói quen và lịch trình.', id: 'Ya. He works. The shop opens. Kebiasaan dan jadwal.', tr: 'Evet. He works. The shop opens. Alışkanlık ve program.', pl: 'Tak. He works. The shop opens. Nawyk i rozkład.' }), wrong: { 'He work every day, and the shop open at 9.': tri('He нужно works, the shop нужно opens.', 'He потрібно works, the shop потрібно opens.', 'He needs works, the shop needs opens.', { 'pt-BR': 'He precisa de works, the shop precisa de opens.', vi: 'He cần works, the shop cần opens.', id: 'He perlu works, the shop perlu opens.', tr: 'He works ister, the shop opens ister.', pl: 'He wymaga works, the shop wymaga opens.' }), 'He is work every day, and the shop is open at 9.': tri('Is work не работает; is open меняет смысл. Нужно works / opens.', 'Is work не працює; is open змінює сенс. Потрібно works / opens.', 'Is work does not work; is open changes the meaning. Use works / opens.', { 'pt-BR': 'Is work não funciona; is open muda o sentido. Use works / opens.', vi: 'Is work không đúng; is open đổi nghĩa. Dùng works / opens.', id: 'Is work tidak benar; is open mengubah makna. Gunakan works / opens.', tr: 'Is work olmaz; is open anlamı değiştirir. works / opens kullan.', pl: 'Is work nie działa; is open zmienia sens. Użyj works / opens.' }), 'He working every day, and the shop opening at 9.': tri('Working/opening здесь ломают фразу. Нужно works / opens.', 'Working/opening тут ламають фразу. Потрібно works / opens.', 'Working/opening break the sentence here. Use works / opens.', { 'pt-BR': 'Working/opening quebram a frase aqui. Use works / opens.', vi: 'Working/opening làm hỏng câu ở đây. Dùng works / opens.', id: 'Working/opening merusak kalimat di sini. Gunakan works / opens.', tr: 'Working/opening burada cümleyi bozar. works / opens kullan.', pl: 'Working/opening psują tutaj zdanie. Użyj works / opens.' }) }, retryLine: 'He works. Shop opens.', model: 'He works / The shop opens', focusWords: ['works', 'opens'] }),
    psStep({ id: 'ps_statement_mixed_006', order: 15, difficulty: 'mixed_review', targetSkill: 'mixed_sentence_correction', sentence: 'Choose the correct sentence.', translation: tri('Выбери правильное предложение.', 'Обери правильне речення.', 'Choose the correct sentence.', { 'pt-BR': 'Escolha a frase correta.', vi: 'Chọn câu đúng.', id: 'Pilih kalimat yang benar.', tr: 'Doğru cümleyi seç.', pl: 'Wybierz poprawne zdanie.' }), options: ['They usually study at night, but my sister studies in the morning.', 'They usually studies at night, but my sister study in the morning.', 'They are usually study at night, but my sister is studies in the morning.', 'They usually studying at night, but my sister studying in the morning.'], correctAnswer: 'They usually study at night, but my sister studies in the morning.', correctFeedback: tri('Да. They study. My sister studies.', 'Так. They study. My sister studies.', 'Yes. They study. My sister studies.', { 'pt-BR': 'Sim. They study. My sister studies.', vi: 'Đúng. They study. My sister studies.', id: 'Ya. They study. My sister studies.', tr: 'Evet. They study. My sister studies.', pl: 'Tak. They study. My sister studies.' }), wrong: { 'They usually studies at night, but my sister study in the morning.': tri('Нужно наоборот: They study, my sister studies.', 'Потрібно навпаки: They study, my sister studies.', 'It should be the opposite: They study, my sister studies.', { 'pt-BR': 'Deve ser o contrário: They study, my sister studies.', vi: 'Phải ngược lại: They study, my sister studies.', id: 'Seharusnya kebalikannya: They study, my sister studies.', tr: 'Tam tersi olmalı: They study, my sister studies.', pl: 'Powinno być odwrotnie: They study, my sister studies.' }), 'They are usually study at night, but my sister is studies in the morning.': tri('Are/is здесь лишние. Нужно study / studies.', 'Are/is тут зайві. Потрібно study / studies.', 'Are/is are extra here. Use study / studies.', { 'pt-BR': 'Are/is são extras aqui. Use study / studies.', vi: 'Are/is bị thừa ở đây. Dùng study / studies.', id: 'Are/is berlebih di sini. Gunakan study / studies.', tr: 'Are/is burada fazla. study / studies kullan.', pl: 'Are/is są tutaj zbędne. Użyj study / studies.' }), 'They usually studying at night, but my sister studying in the morning.': tri('Studying без are/is не работает. Нужно study / studies.', 'Studying без are/is не працює. Потрібно study / studies.', 'Studying without are/is does not work. Use study / studies.', { 'pt-BR': 'Studying sem are/is não funciona. Use study / studies.', vi: 'Studying không có are/is thì không đúng. Dùng study / studies.', id: 'Studying tanpa are/is tidak benar. Gunakan study / studies.', tr: 'Studying are/is olmadan olmaz. study / studies kullan.', pl: 'Studying bez are/is nie działa. Użyj study / studies.' }) }, retryLine: 'They study. Sister studies.', model: 'They study / My sister studies', focusWords: ['study', 'studies'] }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: ['be_plus_base_error', 'missing_third_person_s_statement', 'wrong_s_with_plural_subject', 'ing_instead_of_present_simple', 'habit_tense_confusion', 'schedule_present_simple_error', 'state_verb_simple_error', 'unneeded_auxiliary_in_statement'],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Показываем, это привычка, факт или расписание, и какая форма нужна.', 'Показуємо, це звичка, факт або розклад, і яка форма потрібна.', 'Show whether this is a habit, fact, or schedule, and which form is needed.', { 'pt-BR': 'Mostramos se é hábito, fato ou horário, e qual forma é necessária.', vi: 'Hiển thị đây là thói quen, sự thật hay lịch trình, và cần dạng nào.', id: 'Tunjukkan apakah ini kebiasaan, fakta, atau jadwal, dan bentuk mana yang diperlukan.', tr: 'Bunun alışkanlık, gerçek veya program olduğunu ve hangi biçimin gerektiğini gösteririz.', pl: 'Pokazujemy, czy to nawyk, fakt albo rozkład, i jaka forma jest potrzebna.' }),
    depth2: tri('Проще: обычно правда или прямо сейчас?', 'Простіше: зазвичай правда чи просто зараз?', 'Simpler: usually true or right now?', { 'pt-BR': 'Mais simples: geralmente é verdade ou agora?', vi: 'Đơn giản hơn: thường đúng hay ngay bây giờ?', id: 'Lebih sederhana: biasanya benar atau sekarang?', tr: 'Daha basit: genelde doğru mu, yoksa şu anda mı?', pl: 'Prościej: zwykle prawda czy właśnie teraz?' }),
    depth3: tri('Модель по смыслу: обычная привычка плюс форма по первому слову.', 'Модель за сенсом: звичайна звичка плюс форма за першим словом.', 'Models: I work every day / She works every day.', { 'pt-BR': 'Modelo pelo sentido: hábito normal mais forma pela primeira palavra.', vi: 'Mẫu theo nghĩa: thói quen bình thường cộng dạng theo từ đầu tiên.', id: 'Pola berdasarkan makna: kebiasaan biasa plus bentuk menurut kata pertama.', tr: 'Anlama göre model: normal alışkanlık ve ilk kelimeye göre biçim.', pl: 'Model według sensu: zwykły nawyk plus forma według pierwszego słowa.' }),
    depth4: tri('Почти подсказка: выбери между work и works по первому слову.', 'Майже підказка: вибери між work і works за першим словом.', 'Almost a hint: choose between work and works from the first word.', { 'pt-BR': 'Quase dica: escolha entre work e works pela primeira palavra.', vi: 'Gần như gợi ý: chọn giữa work và works theo từ đầu tiên.', id: 'Hampir petunjuk: pilih antara work dan works dari kata pertama.', tr: 'Neredeyse ipucu: ilk kelimeye göre work veya works seç.', pl: 'Prawie podpowiedź: wybierz między work i works według pierwszego słowa.' }),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: { action: 'show_simplified_rule_card', card: tri('Привычка, факт, расписание или стабильное состояние: обычное действие без am/is/are. Потом проверяем, нужен ли хвост -s.', 'Звичка, факт, розклад або стабільний стан: звичайна дія без am/is/are. Потім перевіряємо, чи потрібен хвіст -s.', 'Habit/fact/schedule/stable state: I work, they live, she works, the shop opens. Do not add am/is/are before a normal action.', { 'pt-BR': 'Hábito, fato, horário ou estado estável: ação normal sem am/is/are. Depois verificamos se precisa do final -s.', vi: 'Thói quen, sự thật, lịch trình hoặc trạng thái ổn định: hành động bình thường không có am/is/are. Sau đó kiểm tra có cần đuôi -s không.', id: 'Kebiasaan, fakta, jadwal, atau keadaan stabil: aksi biasa tanpa am/is/are. Lalu periksa apakah perlu akhiran -s.', tr: 'Alışkanlık, gerçek, program veya sabit durum: am/is/are olmadan normal eylem. Sonra -s eki gerekip gerekmediğini kontrol ederiz.', pl: 'Nawyk, fakt, rozkład albo stały stan: zwykła czynność bez am/is/are. Potem sprawdzamy, czy potrzebna jest końcówka -s.' }) },
    afterThreeWrongInSameExercise: { action: 'show_subject_and_meaning_hint_then_retry', card: tri('Система покажет смысл и первое слово фразы, но форму выберешь ты.', 'Система покаже сенс і перше слово фрази, але форму обереш ти.', 'The system shows the meaning and first word, but does not choose the form for you.', { 'pt-BR': 'O sistema mostra o sentido e a primeira palavra da frase, mas você escolhe a forma.', vi: 'Hệ thống hiển thị ý nghĩa và từ đầu tiên của câu, nhưng bạn tự chọn dạng.', id: 'Sistem menunjukkan makna dan kata pertama frasa, tetapi kamu memilih bentuknya.', tr: 'Sistem anlamı ve cümlenin ilk kelimesini gösterir, ama biçimi sen seçersin.', pl: 'System pokaże sens i pierwsze słowo zdania, ale formę wybierasz ty.' }) },
    afterFourWrongInSameExercise: { action: 'switch_to_guided_mode', card: tri('Guided mode: сначала выбери привычка/факт или сейчас. Потом смотри на первое слово.', 'Guided mode: спочатку вибери звичка/факт або зараз. Потім дивись на перше слово.', 'Guided mode: first choose habit/fact or now. Then look at the first word.', { 'pt-BR': 'Guided mode: primeiro escolha hábito/fato ou agora. Depois olhe para a primeira palavra.', vi: 'Guided mode: trước tiên chọn thói quen/sự thật hay ngay bây giờ. Sau đó nhìn vào từ đầu tiên.', id: 'Guided mode: pertama pilih kebiasaan/fakta atau sekarang. Lalu lihat kata pertama.', tr: 'Guided mode: önce alışkanlık/gerçek mi yoksa şimdi mi seç. Sonra ilk kelimeye bak.', pl: 'Guided mode: najpierw wybierz nawyk/fakt albo teraz. Potem spójrz na pierwsze słowo.' }) },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_ps_statement_001', prompt: tri('Every day: это привычка или прямо сейчас?', 'Every day: це звичка чи просто зараз?', 'Every day: habit or right now?', { 'pt-BR': 'Every day: é hábito ou agora?', vi: 'Every day: là thói quen hay ngay bây giờ?', id: 'Every day: kebiasaan atau sekarang?', tr: 'Every day: alışkanlık mı, şu an mı?', pl: 'Every day: nawyk czy właśnie teraz?' }), options: ['habit', 'right now'], correctIndex: 0, thenReturnToExerciseId: 'ps_statement_easy_001' },
      { id: 'guided_ps_statement_002', prompt: tri('She beret works ili work?', 'She bere works chy work?', 'She takes works or work?', { 'pt-BR': 'She usa works ou work?', vi: 'She dùng works hay work?', id: 'She memakai works atau work?', tr: 'She works mü work mü alır?', pl: 'She bierze works czy work?' }), options: ['works', 'work'], correctIndex: 0, thenReturnToExerciseId: 'ps_statement_contrast_001' },
      { id: 'guided_ps_statement_003', prompt: tri('They beret works ili work?', 'They bere works chy work?', 'They takes works or work?', { 'pt-BR': 'They usa works ou work?', vi: 'They dùng works hay work?', id: 'They memakai works atau work?', tr: 'They works mü work mü alır?', pl: 'They bierze works czy work?' }), options: ['works', 'work'], correctIndex: 1, thenReturnToExerciseId: 'ps_statement_easy_002' },
      { id: 'guided_ps_statement_004', prompt: tri('The shop opens at 9: это расписание?', 'The shop opens at 9: це розклад?', 'The shop opens at 9: is this a schedule?', { 'pt-BR': 'The shop opens at 9: isso é um horário?', vi: 'The shop opens at 9: đây là lịch trình phải không?', id: 'The shop opens at 9: apakah ini jadwal?', tr: 'The shop opens at 9: bu bir program mı?', pl: 'The shop opens at 9: czy to rozkład?' }), options: ['yes', 'no'], correctIndex: 0, thenReturnToExerciseId: 'ps_statement_mixed_001' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'verb',
    microDiagnosisId: 'verb_present_simple_statement',
    diagnosisLabel: tri('I work / She works', 'I work / She works', 'I work / She works', { 'pt-BR': 'I work / She works', vi: 'I work / She works', id: 'I work / She works', tr: 'I work / She works', pl: 'I work / She works' }),
    contrastSet: CONTRAST,
    focusWords: ['work', 'works', 'live', 'likes', 'goes', 'studies', 'opens', 'freezes'],
    focusPatterns: ['habit_base_i', 'habit_base_they', 'habit_base_we', 'third_person_s_likes', 'third_person_es_goes', 'third_person_ies_studies', 'no_be_with_main_verb', 'no_ing_for_habit', 'unneeded_auxiliary_in_statement', 'schedule_present_simple', 'fact_present_simple', 'state_verb_likes', 'mixed_subject_forms', 'mixed_habit_schedule_fact', 'mixed_sentence_correction'],
    includeFailedItems: true,
    includeRecoveredItems: true,
    includeSimilarItems: true,
    minItems: 12,
    recommendedItems: 20,
    difficultyLevel: 2,
    difficultyEscalation: { start: 'easy', afterCorrectInRow: 3, next: 'contrast', afterCorrectInRowAtContrast: 3, final: 'mixed_review' },
  },
  analyticsEvents: {
    start: 'diagnosis_training_verb_present_simple_statement_start',
    answer: 'diagnosis_training_verb_present_simple_statement_answer',
    mastery: 'diagnosis_training_verb_present_simple_statement_mastery',
    recovery: 'diagnosis_training_verb_present_simple_statement_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: { category: 'verb', microDiagnosisId: 'verb_present_simple_statement', contrastSet: CONTRAST, logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true, logSubjectGroup: true, logVerbForm: true, logMeaningType: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=verb&microDiagnosisId=verb_present_simple_statement',
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
