// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.
import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const CONDITION_NEEDS_REVIEW_PLANNED: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'needs-review: esta explicação sobre zero/first conditional ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: phần giải thích về zero/first conditional này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: penjelasan zero/first conditional ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu zero/first conditional açıklaması Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to objaśnienie zero/first conditional nadal wymaga przeglądu po polsku.',
};

const tri = (
  ru: string,
  uk = ru,
  es = ru,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    copy[locale] = planned[locale] ?? CONDITION_NEEDS_REVIEW_PLANNED[locale];
  }
  return copy;
};

const CONTRAST_SET = [
  'if + present simple, present simple',
  'if + present simple, will + base verb',
  'zero conditional',
  'first conditional',
  'general truth',
  'real future possibility',
  'if clause',
  'main clause',
];

const SMART_CONTRAST_SET = [
  'zero conditional',
  'first conditional',
  'if + present',
  'will + base verb',
  'unless',
  'when',
];

const option = (text: string) => ({ id: text, text });

const CONDITION_SKILL_ES: Record<string, string> = {
  general_fact_water: 'Es una regla general: If you heat water, it boils.',
  typical_result_tired: 'Es un resultado habitual: If I am tired, I go.',
  machine_rule: 'Para una regla de maquina, usa presente simple en las dos partes.',
  future_result_rain: 'Es un resultado futuro real: If it rains, I will stay.',
  future_result_time: 'If I have time va sin will; el resultado es I will call.',
  future_result_late: 'El resultado futuro usa will be late.',
  no_will_after_if_rain: 'Despues de if usa rains; will va en I will stay.',
  no_will_after_if_have: 'Despues de if usa have; will va en I will help.',
  if_part_second: 'Aunque la parte con if vaya al final, usa if I finish.',
  unless_meaning: 'Unless significa if not; el resultado usa will be.',
  when_future_moment: 'Despues de when usa get; el resultado es I will text.',
  if_vs_when: 'Cuando el momento es esperado, when suena mejor que if.',
  fact_vs_future_pair: 'Compara regla general con resultado futuro real.',
  if_when_unless_set: 'Despues de if/when/unless usa presente, no will.',
  full_sentence_repair: 'En cada condicion usa presente; en cada resultado usa will.',
};

function withEs(
  copy: TriText,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = CONDITION_NEEDS_REVIEW_PLANNED,
): TriText {
  const next: TriText = { ...copy, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] || next[locale]?.startsWith('needs-review:')) {
      next[locale] = planned[locale] ?? CONDITION_NEEDS_REVIEW_PLANNED[locale];
    }
  }
  return next;
}

function conditionEsFeedback(input: {
  targetSkill: string;
  correctAnswer: string;
  focusWords: string[];
}): string {
  const focus = input.focusWords.join(' / ');
  const hint = CONDITION_SKILL_ES[input.targetSkill] ?? 'No pongas will justo despues de if/when/unless; ponlo en el resultado.';
  return `Usa "${input.correctAnswer}"${focus ? ` con ${focus}` : ''}. ${hint}`;
}

const retry = (line: string): [TriText, TriText, TriText, TriText] => [
  tri(line, line, 'Usa la frase modelo y elige la forma sin will despues de if/when/unless.'),
  tri(
    'Сначала реши: это общее правило или реальный вариант в будущем?',
    'Спочатку виріши: це загальне правило чи реальний варіант у майбутньому?',
    'Primero decide: es una regla general o una opcion real en el futuro?',
  ),
  tri(
    'Общее правило: If you heat water, it boils. Будущий результат: If it rains, I will stay.',
    'Загальне правило: If you heat water, it boils. Майбутній результат: If it rains, I will stay.',
    'Regla general: If you heat water, it boils. Resultado futuro: If it rains, I will stay.',
  ),
  tri(
    'Почти подсказка: после if, when и unless в этом значении не ставим will.',
    'Майже підказка: після if, when і unless у цьому значенні не ставимо will.',
    'Casi una pista: despues de if, when y unless en este sentido no uses will.',
  ),
];

const defaultWrong = (correctAnswer: string): TriText => tri(
  `Не эта форма. Здесь нужно "${correctAnswer}": will ставим в результат, а не сразу после if/when/unless.`,
  `Не ця форма. Тут потрібно "${correctAnswer}": will ставимо в результат, а не одразу після if/when/unless.`,
  `No esta forma. Usa "${correctAnswer}": pon will en el resultado, no justo despues de if/when/unless.`,
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
  wrong?: Record<string, TriText>;
  retryLine: string;
  focusWords: string[];
}): DiagnosisTrainingStep {
  const esFeedback = conditionEsFeedback(input);
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: withEs(input.translation, esFeedback),
    explanationBlock: tri(
      'Смысл решает форму. Для общего правила говорим: If you heat water, it boils. Для реального будущего варианта: If it rains, I will stay.',
      'Сенс вирішує форму. Для загального правила кажемо: If you heat water, it boils. Для реального майбутнього варіанта: If it rains, I will stay.',
      'El significado decide la forma. Regla general: If you heat water, it boils. Opcion futura real: If it rains, I will stay.',
    ),
    microTask: tri(
      'Выбери вариант, где will не стоит сразу после if, when или unless.',
      'Обери варіант, де will не стоїть одразу після if, when або unless.',
      'Elige la opcion donde will no aparece justo despues de if, when o unless.',
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
    retryFeedback: retry(input.retryLine).map((item) => withEs(item, esFeedback)) as [TriText, TriText, TriText, TriText],
    fallbackExplanation: tri(
      'Коротко: правило или привычка идет без will. В реальном будущем will обычно стоит во второй части: If I finish, I will call.',
      'Коротко: правило або звичка йде без will. У реальному майбутньому will зазвичай стоїть у другій частині: If I finish, I will call.',
      'Version corta: una regla o habito no lleva will. En una frase de futuro real, will normalmente va en la segunda parte.',
    ),
    focusWords: input.focusWords,
  };
}

export const CONDITION_ZERO_FIRST_TRAINING: DiagnosisTraining = {
  id: 'condition_zero_first',
  category: 'syntax',
  version: '1.0.0',
  status: 'active',
  priority: 50,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('If it rains, I will stay', 'If it rains, I will stay', 'If it rains, I will stay', {
    'pt-BR': 'If it rains, I will stay: sem will depois de if',
    vi: 'If it rains, I will stay: không dùng will sau if',
    id: 'If it rains, I will stay: tanpa will setelah if',
    tr: 'If it rains, I will stay: if sonrası will yok',
    pl: 'If it rains, I will stay: bez will po if',
  }),
  shortTitle: tri('If / when / unless', 'If / when / unless', 'If / when / unless', {
    'pt-BR': 'If / when / unless',
    vi: 'If / when / unless',
    id: 'If / when / unless',
    tr: 'If / when / unless',
    pl: 'If / when / unless',
  }),
  shortDiagnosis: tri(
    'Ты ставишь will сразу после if, хотя английский обычно держит will в результате.',
    'Ти ставиш will одразу після if, хоча англійська зазвичай тримає will у результаті.',
    'Pones will justo despues de if, pero en ingles will normalmente va en el resultado.',
    {
      'pt-BR': 'Você coloca will logo depois de if, embora o inglês normalmente mantenha will no resultado.',
      vi: 'Bạn đặt will ngay sau if, trong khi tiếng Anh thường giữ will ở phần kết quả.',
      id: 'Kamu menaruh will langsung setelah if, padahal bahasa Inggris biasanya menaruh will di bagian hasil.',
      tr: 'Will kelimesini if sonrasına hemen koyuyorsun, oysa İngilizce genelde will kısmını sonuçta tutar.',
      pl: 'Stawiasz will zaraz po if, choć angielski zwykle trzyma will w części z wynikiem.',
    },
  ),
  diagnosisText: tri(
    'Здесь важно разделить два смысла: общее правило и реальный вариант в будущем. В обоих случаях после if обычно не нужен will. Нормально: If it rains, I will stay. Не: If it will rain.',
    'Тут важливо розділити два сенси: загальне правило і реальний варіант у майбутньому. В обох випадках після if зазвичай не потрібен will. Нормально: If it rains, I will stay. Не: If it will rain.',
    'Separa dos significados: una regla general y una opcion real en el futuro. En los dos, no pongas will justo despues de if.',
    {
      'pt-BR': 'Aqui é importante separar dois sentidos: regra geral e possibilidade real no futuro. Nos dois casos, depois de if normalmente não precisa de will. Natural: If it rains, I will stay. Não: If it will rain.',
      vi: 'Ở đây cần tách hai ý: quy tắc chung và khả năng thật trong tương lai. Trong cả hai trường hợp, sau if thường không cần will. Tự nhiên: If it rains, I will stay. Không phải: If it will rain.',
      id: 'Di sini penting membedakan dua makna: aturan umum dan kemungkinan nyata di masa depan. Dalam keduanya, setelah if biasanya tidak perlu will. Yang wajar: If it rains, I will stay. Bukan: If it will rain.',
      tr: 'Burada iki anlamı ayırmak önemli: genel kural ve gelecekte gerçek olasılık. İkisinde de if sonrasında genelde will gerekmez. Doğal olan: If it rains, I will stay. Değil: If it will rain.',
      pl: 'Tutaj trzeba rozdzielić dwa sensy: ogólną regułę i realną możliwość w przyszłości. W obu przypadkach po if zwykle nie potrzeba will. Naturalnie: If it rains, I will stay. Nie: If it will rain.',
    },
  ),
  mentalModel: tri(
    'If не делает фразу будущей само по себе. Будущий результат обычно живет во второй части: If it rains, I will stay. Та же логика работает с when и unless.',
    'If не робить фразу майбутньою саме по собі. Майбутній результат зазвичай живе в другій частині: If it rains, I will stay. Та сама логіка працює з when і unless.',
    'If no marca el futuro por si solo. El resultado futuro normalmente vive en la segunda parte: If it rains, I will stay. La misma logica funciona con when y unless.',
    {
      'pt-BR': 'If não torna a frase futura sozinho. O resultado futuro normalmente fica na segunda parte: If it rains, I will stay. A mesma lógica funciona com when e unless.',
      vi: 'If không tự làm cho câu thành tương lai. Kết quả trong tương lai thường nằm ở phần thứ hai: If it rains, I will stay. Logic này cũng dùng với when và unless.',
      id: 'If tidak membuat kalimat menjadi masa depan dengan sendirinya. Hasil masa depan biasanya ada di bagian kedua: If it rains, I will stay. Logika yang sama berlaku untuk when dan unless.',
      tr: 'If tek başına cümleyi gelecek yapmaz. Gelecek sonuç genelde ikinci bölümde yaşar: If it rains, I will stay. Aynı mantık when ve unless ile de çalışır.',
      pl: 'If samo z siebie nie robi zdania przyszłym. Przyszły wynik zwykle mieszka w drugiej części: If it rains, I will stay. Ta sama logika działa z when i unless.',
    },
  ),
  contrastSet: CONTRAST_SET,
  coreRule: tri(
    'Общее правило: If you heat water, it boils. Реальный будущий вариант: If it rains, I will stay. После if/when/unless не ставим will в этом значении.',
    'Загальне правило: If you heat water, it boils. Реальний майбутній варіант: If it rains, I will stay. Після if/when/unless не ставимо will у цьому значенні.',
    'Regla general: If you heat water, it boils. Opcion futura real: If it rains, I will stay. No uses will justo despues de if/when/unless.',
    {
      'pt-BR': 'Regra geral: If you heat water, it boils. Possibilidade real no futuro: If it rains, I will stay. Depois de if/when/unless, não use will nesse sentido.',
      vi: 'Quy tắc chung: If you heat water, it boils. Khả năng thật trong tương lai: If it rains, I will stay. Sau if/when/unless, đừng dùng will trong nghĩa này.',
      id: 'Aturan umum: If you heat water, it boils. Kemungkinan nyata di masa depan: If it rains, I will stay. Setelah if/when/unless, jangan gunakan will dalam makna ini.',
      tr: 'Genel kural: If you heat water, it boils. Gelecekte gerçek olasılık: If it rains, I will stay. Bu anlamda if/when/unless sonrasında will kullanma.',
      pl: 'Ogólna reguła: If you heat water, it boils. Realna możliwość w przyszłości: If it rains, I will stay. Po if/when/unless nie stawiaj will w tym znaczeniu.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'Правило или факт: If you heat water, it boils.',
      'Привычный результат: If I am tired, I go to bed early.',
      'Реальный вариант в будущем: If it rains, I will stay.',
      'После if в этом шаблоне не ставим will.',
      'Will ставим в результат: I will stay, I will call, you will be late.',
      'Порядок можно менять: I will call you if I finish early.',
      'When используем для ожидаемого момента: When I get home, I will text you.',
      'Unless значит if not: Unless you hurry, you will be late.',
    ],
    uk: [
      'Правило або факт: If you heat water, it boils.',
      'Звичний результат: If I am tired, I go to bed early.',
      'Реальний варіант у майбутньому: If it rains, I will stay.',
      'Після if у цьому шаблоні не ставимо will.',
      'Will ставимо в результат: I will stay, I will call, you will be late.',
      'Порядок можна міняти: I will call you if I finish early.',
      'When використовуємо для очікуваного моменту: When I get home, I will text you.',
      'Unless означає if not: Unless you hurry, you will be late.',
    ],
    es: [
      'Regla o hecho: If you heat water, it boils.',
      'Resultado habitual: If I am tired, I go to bed early.',
      'Opcion real en el futuro: If it rains, I will stay.',
      'No pongas will despues de if en este patron.',
      'Pon will en el resultado: I will stay, I will call, you will be late.',
      'Puedes mover la parte con if al final: I will call you if I finish early.',
      'Usa when para un momento esperado: When I get home, I will text you.',
      'Unless significa if not: Unless you hurry, you will be late.',
    ],
    'pt-BR': [
      'Regra ou fato: If you heat water, it boils.',
      'Resultado típico: If I am tired, I go to bed early.',
      'Possibilidade real no futuro: If it rains, I will stay.',
      'Não coloque will depois de if neste padrão.',
      'Coloque will no resultado.',
      'Você pode mover a parte com if para o final.',
      'Use when para um momento esperado.',
      'Unless significa if not.',
    ],
    vi: [
      'Quy tắc hoặc sự thật: If you heat water, it boils.',
      'Kết quả thường gặp: If I am tired, I go to bed early.',
      'Khả năng thật trong tương lai: If it rains, I will stay.',
      'Không đặt will sau if trong mẫu này.',
      'Đặt will ở phần kết quả.',
      'Bạn có thể chuyển mệnh đề if xuống cuối câu.',
      'Dùng when cho một thời điểm được chờ đợi.',
      'Unless nghĩa là if not.',
    ],
    id: [
      'Aturan atau fakta: If you heat water, it boils.',
      'Hasil yang biasa terjadi: If I am tired, I go to bed early.',
      'Kemungkinan nyata di masa depan: If it rains, I will stay.',
      'Jangan taruh will setelah if dalam pola ini.',
      'Taruh will pada bagian hasil.',
      'Bagian if bisa dipindahkan ke akhir.',
      'Gunakan when untuk momen yang diharapkan.',
      'Unless berarti if not.',
    ],
    tr: [
      'Kural veya gerçek: If you heat water, it boils.',
      'Tipik sonuç: If I am tired, I go to bed early.',
      'Gelecekte gerçek olasılık: If it rains, I will stay.',
      'Bu kalıpta if sonrasına will koyma.',
      'Will sonuc bölümünde kullanılır.',
      'If bölümünü sona taşıyabilirsin.',
      'Beklenen bir an için when kullan.',
      'Unless, if not anlamına gelir.',
    ],
    pl: [
      'Reguła albo fakt: If you heat water, it boils.',
      'Typowy wynik: If I am tired, I go to bed early.',
      'Realna możliwość w przyszłości: If it rains, I will stay.',
      'W tym wzorze nie stawiaj will po if.',
      'Will stawiaj w wyniku.',
      'Część z if można przenieść na koniec.',
      'Używaj when dla oczekiwanego momentu.',
      'Unless oznacza if not.',
    ],
  },
  examples: [
    { en: 'If you heat water, it boils.', ru: 'Если нагреть воду, она закипает.', uk: 'Якщо нагріти воду, вона закипає.', es: 'Si calientas agua, hierve.', 'pt-BR': 'Se você aquece água, ela ferve.', vi: 'Nếu bạn đun nước, nước sẽ sôi.', id: 'Jika kamu memanaskan air, air itu mendidih.', tr: 'Suyu ısıtırsan kaynar.', pl: 'Jeśli podgrzewasz wodę, ona wrze.', why: tri('Это общее правило, не один будущий случай.', 'Це загальне правило, не один майбутній випадок.', 'Es una regla general, no un caso futuro unico.') },
    { en: 'If I am tired, I go to bed early.', ru: 'Если я устаю, я рано ложусь спать.', uk: 'Якщо я втомлююся, я рано лягаю спати.', es: 'Si estoy cansado, me acuesto temprano.', 'pt-BR': 'Se estou cansado, vou dormir cedo.', vi: 'Nếu tôi mệt, tôi đi ngủ sớm.', id: 'Jika saya lelah, saya tidur lebih awal.', tr: 'Yorgunsam erken yatarım.', pl: 'Jeśli jestem zmęczony, kładę się wcześnie spać.', why: tri('Это типичный результат, который повторяется.', 'Це типовий результат, який повторюється.', 'Es un resultado habitual que se repite.') },
    { en: 'If it rains, I will stay home.', ru: 'Если пойдет дождь, я останусь дома.', uk: 'Якщо піде дощ, я залишуся вдома.', es: 'Si llueve, me quedare en casa.', 'pt-BR': 'Se chover, vou ficar em casa.', vi: 'Nếu trời mưa, tôi sẽ ở nhà.', id: 'Jika hujan, saya akan tinggal di rumah.', tr: 'Yağmur yağarsa evde kalacağım.', pl: 'Jeśli będzie padać, zostanę w domu.', why: tri('Rains стоит после if, а will stay стоит в результате.', 'Rains стоїть після if, а will stay стоїть у результаті.', 'Rains va despues de if; will stay va en el resultado.') },
    { en: 'If I have time, I will call you.', ru: 'Если у меня будет время, я тебе позвоню.', uk: 'Якщо в мене буде час, я тобі подзвоню.', es: 'Si tengo tiempo, te llamare.', 'pt-BR': 'Se eu tiver tempo, vou ligar para você.', vi: 'Nếu tôi có thời gian, tôi sẽ gọi cho bạn.', id: 'Jika saya punya waktu, saya akan meneleponmu.', tr: 'Vaktim olursa seni arayacağım.', pl: 'Jeśli będę miał czas, zadzwonię do ciebie.', why: tri('Не If I will have time. Will нужен в I will call.', 'Не If I will have time. Will потрібен у I will call.', 'No es If I will have time. Will pertenece a I will call.') },
    { en: 'I will call you if I finish early.', ru: 'Я тебе позвоню, если закончу рано.', uk: 'Я тобі подзвоню, якщо закінчу рано.', es: 'Te llamare si termino temprano.', 'pt-BR': 'Vou ligar para você se eu terminar cedo.', vi: 'Tôi sẽ gọi cho bạn nếu tôi xong sớm.', id: 'Saya akan meneleponmu jika selesai lebih awal.', tr: 'Erken bitirirsem seni arayacağım.', pl: 'Zadzwonię do ciebie, jeśli skończę wcześniej.', why: tri('If можно перенести в конец, правило не меняется.', 'If можна перенести в кінець, правило не змінюється.', 'La parte con if puede ir al final; la regla no cambia.') },
    { en: "Unless you hurry, you will be late.", ru: 'Если ты не поторопишься, ты опоздаешь.', uk: 'Якщо ти не поквапишся, ти запізнишся.', es: 'Si no te das prisa, llegaras tarde.', 'pt-BR': 'A menos que você se apresse, vai se atrasar.', vi: 'Nếu bạn không nhanh lên, bạn sẽ bị muộn.', id: 'Kecuali kamu cepat-cepat, kamu akan terlambat.', tr: 'Acele etmezsen geç kalacaksın.', pl: 'Jeśli się nie pospieszysz, spóźnisz się.', why: tri('Unless значит if not, результат идет с will.', 'Unless означає if not, результат іде з will.', 'Unless significa if not; el resultado usa will.') },
    { en: 'When I get home, I will text you.', ru: 'Когда я доберусь домой, я тебе напишу.', uk: 'Коли я дістануся додому, я тобі напишу.', es: 'Cuando llegue a casa, te escribire.', 'pt-BR': 'Quando eu chegar em casa, vou mandar mensagem para você.', vi: 'Khi tôi về đến nhà, tôi sẽ nhắn tin cho bạn.', id: 'Ketika saya sampai di rumah, saya akan mengirim pesan kepadamu.', tr: 'Eve varınca sana mesaj atacağım.', pl: 'Kiedy dotrę do domu, napiszę do ciebie.', why: tri('When показывает ожидаемый момент, но will не ставится сразу после when.', 'When показує очікуваний момент, але will не ставиться одразу після when.', 'When muestra un momento esperado, pero sin will justo despues de when.') },
  ],
  introBlocks: [
    {
      id: 'intro_problem',
      type: 'diagnosis',
      text: tri(
        'Частая ошибка: увидел if и сразу поставил will. Но английский говорит If it rains, I will stay, а не If it will rain.',
        'Часта помилка: побачив if і одразу поставив will. Але англійська каже If it rains, I will stay, а не If it will rain.',
        'Error frecuente: ves if y pones will justo despues. Pero el ingles dice If it rains, I will stay, no If it will rain.',
      ),
    },
    {
      id: 'intro_model',
      type: 'rule',
      text: tri(
        'Две модели: правило - If you heat water, it boils. Реальный будущий вариант - If it rains, I will stay.',
        'Дві моделі: правило - If you heat water, it boils. Реальний майбутній варіант - If it rains, I will stay.',
        'Dos modelos: regla - If you heat water, it boils. Opcion futura real - If it rains, I will stay.',
      ),
    },
    {
      id: 'intro_warning',
      type: 'warning',
      text: tri(
        'Та же логика работает с when и unless: when I get, unless you hurry. Will ставим в результат.',
        'Та сама логіка працює з when і unless: when I get, unless you hurry. Will ставимо в результат.',
        'La misma logica funciona con when y unless: when I get, unless you hurry. Pon will en el resultado.',
      ),
    },
  ],
  steps: [
    step({
      id: 'cond_zero_first_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'general_fact_water',
      sentence: 'If you heat water, it ___.',
      translation: tri('Если нагреть воду, она закипает.', 'Якщо нагріти воду, вона закипає.', 'If you heat water, it boils.'),
      options: ['boils', 'will boil', 'boil', 'is boiling'],
      correctAnswer: 'boils',
      correctFeedback: tri('Да. Это общее правило: If you heat water, it boils.', 'Так. Це загальне правило: If you heat water, it boils.', 'Yes. This is a general rule.'),
      wrong: {
        'will boil': tri('Will boil звучит как один будущий случай. Для общего правила нужно boils.', 'Will boil звучить як один майбутній випадок. Для загального правила потрібно boils.', 'Will boil sounds like one future case. For a general rule, use boils.'),
        boil: tri('Water здесь заменяется на it, поэтому нужно boils.', 'Water тут замінюється на it, тому потрібно boils.', 'Water is it here, so you need boils.'),
        'is boiling': tri('Is boiling звучит как процесс прямо сейчас. Для правила нужно boils.', 'Is boiling звучить як процес просто зараз. Для правила потрібно boils.', 'Is boiling sounds like a process right now. For a rule, use boils.'),
      },
      retryLine: 'Общее правило: If you heat water, it boils.',
      focusWords: ['boils'],
    }),
    step({
      id: 'cond_zero_first_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'typical_result_tired',
      sentence: 'If I am tired, I ___ to bed early.',
      translation: tri('Если я устаю, я рано ложусь спать.', 'Якщо я втомлююся, я рано лягаю спати.', 'If I am tired, I go to bed early.'),
      options: ['go', 'will go', 'goes', 'am going'],
      correctAnswer: 'go',
      correctFeedback: tri('Да. Это типичный результат: if I am tired, I go.', 'Так. Це типовий результат: if I am tired, I go.', 'Yes. This is a typical result.'),
      wrong: {
        'will go': tri('Will go подходит для конкретного будущего случая. Здесь привычный результат: I go.', 'Will go підходить для конкретного майбутнього випадку. Тут звичний результат: I go.', 'Will go fits one concrete future case. Here it is a habit: I go.'),
        goes: tri('С I говорим go, не goes.', 'З I кажемо go, не goes.', 'With I, say go, not goes.'),
        'am going': tri('Am going звучит как план сейчас. Здесь типичный результат: go.', 'Am going звучить як план зараз. Тут типовий результат: go.', 'Am going sounds like a current plan. Here it is a typical result: go.'),
      },
      retryLine: 'Типичный результат: If I am tired, I go to bed early.',
      focusWords: ['If I am tired', 'go'],
    }),
    step({
      id: 'cond_zero_first_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'machine_rule',
      sentence: 'Choose the sentence with a general rule.',
      translation: tri('Если нажать эту кнопку, машина запускается.', 'Якщо натиснути цю кнопку, машина запускається.', 'If you press this button, the machine starts.'),
      options: [
        'If you press this button, the machine starts.',
        'If you will press this button, the machine starts.',
        'If you press this button, the machine will started.',
        'If you pressing this button, the machine starts.',
      ],
      correctAnswer: 'If you press this button, the machine starts.',
      correctFeedback: tri('Да. Правило машины: If you press, it starts.', 'Так. Правило машини: If you press, it starts.', 'Yes. The machine rule: If you press, it starts.'),
      wrong: {
        'If you will press this button, the machine starts.': tri('Will не нужен сразу после if. Нужно If you press.', 'Will не потрібен одразу після if. Потрібно If you press.', 'Will is not needed right after if.'),
        'If you press this button, the machine will started.': tri('Will started не собирается. Для правила скажи the machine starts.', 'Will started не складається. Для правила скажи the machine starts.', 'Will started does not work.'),
        'If you pressing this button, the machine starts.': tri('If you pressing не собирается. Нужно If you press.', 'If you pressing не складається. Потрібно If you press.', 'If you pressing does not work.'),
      },
      retryLine: 'Правило: если это общее правило, в обеих частях ставим обычное настоящее.',
      focusWords: ['If you press', 'starts'],
    }),
    step({
      id: 'cond_zero_first_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'future_result_rain',
      sentence: 'If it rains, I ___ home.',
      translation: tri('Если пойдет дождь, я останусь дома.', 'Якщо піде дощ, я залишуся вдома.', 'If it rains, I will stay home.'),
      options: ['will stay', 'stay', 'stayed', 'am stay'],
      correctAnswer: 'will stay',
      correctFeedback: tri('Да. If it rains -> I will stay home.', 'Так. If it rains -> I will stay home.', 'Yes. If it rains -> I will stay home.'),
      wrong: {
        stay: tri('I stay home звучит как привычка. Здесь один будущий результат: will stay.', 'I stay home звучить як звичка. Тут один майбутній результат: will stay.', 'I stay home sounds like a habit. Here it is one future result.'),
        stayed: tri('Stayed смотрит в прошлое. Здесь результат в будущем: will stay.', 'Stayed дивиться в минуле. Тут результат у майбутньому: will stay.', 'Stayed points to the past.'),
        'am stay': tri('Am stay не собирается. Нужно will stay.', 'Am stay не складається. Потрібно will stay.', 'Am stay does not work.'),
      },
      retryLine: 'Реальный вариант: If it rains, I will stay home.',
      focusWords: ['If it rains', 'will stay'],
    }),
    step({
      id: 'cond_zero_first_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'future_result_time',
      sentence: 'If I have time, I ___ you.',
      translation: tri('Если у меня будет время, я тебе позвоню.', 'Якщо в мене буде час, я тобі подзвоню.', 'If I have time, I will call you.'),
      options: ['will call', 'call', 'called', 'am call'],
      correctAnswer: 'will call',
      correctFeedback: tri('Да. If I have time -> I will call you.', 'Так. If I have time -> I will call you.', 'Yes. If I have time -> I will call you.'),
      wrong: {
        call: tri('I call you звучит как привычка. Здесь реальный будущий результат: will call.', 'I call you звучить як звичка. Тут реальний майбутній результат: will call.', 'I call you sounds like a habit. Use will call.'),
        called: tri('Called смотрит в прошлое. Нужно will call.', 'Called дивиться в минуле. Потрібно will call.', 'Called points to the past.'),
        'am call': tri('Am call не собирается. Нужно will call.', 'Am call не складається. Потрібно will call.', 'Am call does not work.'),
      },
      retryLine: 'If I have time, I will call you.',
      focusWords: ['If I have time', 'will call'],
    }),
    step({
      id: 'cond_zero_first_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'future_result_late',
      sentence: "If you don't hurry, you ___ late.",
      translation: tri('Если ты не поторопишься, ты опоздаешь.', 'Якщо ти не поквапишся, ти запізнишся.', "If you don't hurry, you will be late."),
      options: ['will be', 'are', 'were', 'will are'],
      correctAnswer: 'will be',
      correctFeedback: tri('Да. Будущий результат: you will be late.', 'Так. Майбутній результат: you will be late.', 'Yes. Future result: you will be late.'),
      wrong: {
        are: tri('Are late значит, что человек уже опоздал. Здесь будущий результат: will be late.', 'Are late означає, що людина вже запізнилася. Тут майбутній результат: will be late.', 'Are late means the person is already late.'),
        were: tri('Were смотрит в прошлое. Нужно will be.', 'Were дивиться в минуле. Потрібно will be.', 'Were points to the past.'),
        'will are': tri('Will are не собирается. Нужно will be.', 'Will are не складається. Потрібно will be.', 'Will are does not work.'),
      },
      retryLine: "If you don't hurry, you will be late.",
      focusWords: ["If you don't hurry", 'will be'],
    }),
    step({
      id: 'cond_zero_first_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'no_will_after_if_rain',
      sentence: 'Choose the correct sentence.',
      translation: tri('Если завтра пойдет дождь, я останусь дома.', 'Якщо завтра піде дощ, я залишуся вдома.', 'If it rains tomorrow, I will stay home.'),
      options: [
        'If it rains tomorrow, I will stay home.',
        'If it will rain tomorrow, I will stay home.',
        'If it rains tomorrow, I stay home.',
        'If it raining tomorrow, I will stay home.',
      ],
      correctAnswer: 'If it rains tomorrow, I will stay home.',
      correctFeedback: tri('Да. После if: rains. В результате: will stay.', 'Так. Після if: rains. У результаті: will stay.', 'Yes. After if: rains. In the result: will stay.'),
      wrong: {
        'If it will rain tomorrow, I will stay home.': tri('Will не ставим сразу после if. Нужно If it rains.', 'Will не ставимо одразу після if. Потрібно If it rains.', 'Do not put will right after if.'),
        'If it rains tomorrow, I stay home.': tri('I stay home звучит как привычка. Для будущего результата нужно I will stay home.', 'I stay home звучить як звичка. Для майбутнього результату потрібно I will stay home.', 'I stay home sounds like a habit.'),
        'If it raining tomorrow, I will stay home.': tri('If it raining не собирается. Нужно If it rains.', 'If it raining не складається. Потрібно If it rains.', 'If it raining does not work.'),
      },
      retryLine: 'If it rains tomorrow, I will stay home.',
      focusWords: ['If it rains', 'will stay'],
    }),
    step({
      id: 'cond_zero_first_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'no_will_after_if_have',
      sentence: 'Choose the correct sentence.',
      translation: tri('Если у меня будет время, я тебе помогу.', 'Якщо в мене буде час, я тобі допоможу.', 'If I have time, I will help you.'),
      options: [
        'If I have time, I will help you.',
        'If I will have time, I will help you.',
        'If I have time, I help you.',
        'If I had time, I will help you.',
      ],
      correctAnswer: 'If I have time, I will help you.',
      correctFeedback: tri('Да. If I have time, I will help you.', 'Так. If I have time, I will help you.', 'Yes. If I have time, I will help you.'),
      wrong: {
        'If I will have time, I will help you.': tri('Will не нужен сразу после if. Нужно If I have time.', 'Will не потрібен одразу після if. Потрібно If I have time.', 'Will is not needed right after if.'),
        'If I have time, I help you.': tri('I help you звучит как привычка. Здесь результат: I will help you.', 'I help you звучить як звичка. Тут результат: I will help you.', 'I help you sounds like a habit.'),
        'If I had time, I will help you.': tri('If I had time дает другой смысл. Для реального будущего: If I have time.', 'If I had time дає інший сенс. Для реального майбутнього: If I have time.', 'If I had time gives a different meaning.'),
      },
      retryLine: 'If I have time, I will help you.',
      focusWords: ['If I have time', 'will help'],
    }),
    step({
      id: 'cond_zero_first_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'if_part_second',
      sentence: 'I will call you if I ___ early.',
      translation: tri('Я тебе позвоню, если закончу рано.', 'Я тобі подзвоню, якщо закінчу рано.', 'I will call you if I finish early.'),
      options: ['finish', 'will finish', 'finished', 'am finish'],
      correctAnswer: 'finish',
      correctFeedback: tri('Да. Даже когда if в конце, говорим if I finish early.', 'Так. Навіть коли if в кінці, кажемо if I finish early.', 'Yes. Even when if is at the end, use if I finish early.'),
      wrong: {
        'will finish': tri('Will уже есть в результате: I will call. После if нужно if I finish.', 'Will уже є в результаті: I will call. Після if потрібно if I finish.', 'Will is already in the result.'),
        finished: tri('Finished смотрит в прошлое. Для реального будущего: if I finish.', 'Finished дивиться в минуле. Для реального майбутнього: if I finish.', 'Finished points to the past.'),
        'am finish': tri('Am finish не собирается. Нужно finish.', 'Am finish не складається. Потрібно finish.', 'Am finish does not work.'),
      },
      retryLine: 'I will call you if I finish early.',
      focusWords: ['will call', 'if I finish'],
    }),
    step({
      id: 'cond_zero_first_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'unless_meaning',
      sentence: 'Unless you hurry, you ___ late.',
      translation: tri('Если ты не поторопишься, ты опоздаешь.', 'Якщо ти не поквапишся, ти запізнишся.', 'Unless you hurry, you will be late.'),
      options: ['will be', 'are', 'will are', 'were'],
      correctAnswer: 'will be',
      correctFeedback: tri('Да. Unless you hurry значит if you do not hurry. Результат: will be late.', 'Так. Unless you hurry означає if you do not hurry. Результат: will be late.', 'Yes. Unless you hurry means if you do not hurry.'),
      wrong: {
        are: tri('Are late значит сейчас. Здесь результат в будущем: will be late.', 'Are late означає зараз. Тут результат у майбутньому: will be late.', 'Are late means now.'),
        'will are': tri('Will are не собирается. Нужно will be.', 'Will are не складається. Потрібно will be.', 'Will are does not work.'),
        were: tri('Were смотрит в прошлое. Нужно will be.', 'Were дивиться в минуле. Потрібно will be.', 'Were points to the past.'),
      },
      retryLine: 'Unless you hurry, you will be late.',
      focusWords: ['Unless you hurry', 'will be'],
    }),
    step({
      id: 'cond_zero_first_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'when_future_moment',
      sentence: 'When I ___ home, I will text you.',
      translation: tri('Когда я доберусь домой, я тебе напишу.', 'Коли я дістануся додому, я тобі напишу.', 'When I get home, I will text you.'),
      options: ['get', 'will get', 'got', 'am get'],
      correctAnswer: 'get',
      correctFeedback: tri('Да. После when: when I get home. Результат: I will text you.', 'Так. Після when: when I get home. Результат: I will text you.', 'Yes. After when: when I get home.'),
      wrong: {
        'will get': tri('Will не ставим сразу после when. Нужно when I get.', 'Will не ставимо одразу після when. Потрібно when I get.', 'Do not put will right after when.'),
        got: tri('Got смотрит в прошлое. Здесь будущий момент: when I get.', 'Got дивиться в минуле. Тут майбутній момент: when I get.', 'Got points to the past.'),
        'am get': tri('Am get не собирается. Нужно get.', 'Am get не складається. Потрібно get.', 'Am get does not work.'),
      },
      retryLine: 'When I get home, I will text you.',
      focusWords: ['when I get', 'will text'],
    }),
    step({
      id: 'cond_zero_first_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'if_vs_when',
      sentence: 'Choose the better word: ___ I get home, I will text you. I am already on my way.',
      translation: tri('Когда я доберусь домой, я тебе напишу. Я уже в пути.', 'Коли я дістануся додому, я тобі напишу. Я вже в дорозі.', 'When I get home, I will text you. I am already on my way.'),
      options: ['When', 'If', 'Unless', 'Because'],
      correctAnswer: 'When',
      correctFeedback: tri('Да. Человек уже в пути, момент ожидается. Лучше When.', 'Так. Людина вже в дорозі, момент очікується. Краще When.', 'Yes. The person is already on the way, so When is better.'),
      wrong: {
        If: tri('If добавляет сомнение. Здесь человек уже в пути, поэтому лучше when.', 'If додає сумнів. Тут людина вже в дорозі, тому краще when.', 'If adds doubt.'),
        Unless: tri('Unless значит if not. Здесь нужно when.', 'Unless означає if not. Тут потрібно when.', 'Unless means if not.'),
        Because: tri('Because дает причину. Здесь нужен момент: when.', 'Because дає причину. Тут потрібен момент: when.', 'Because gives a reason.'),
      },
      retryLine: 'When I get home, I will text you.',
      focusWords: ['When I get'],
    }),
    step({
      id: 'cond_zero_first_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'fact_vs_future_pair',
      sentence: 'Choose the correct pair.',
      translation: tri('Если нагреть лед, он тает / Если завтра пойдет дождь, я останусь дома', 'Якщо нагріти лід, він тане / Якщо завтра піде дощ, я залишуся вдома', 'If you heat ice, it melts / If it rains tomorrow, I will stay home'),
      options: [
        'If you heat ice, it melts / If it rains tomorrow, I will stay home',
        'If you will heat ice, it will melts / If it will rain tomorrow, I stay home',
        'If you heat ice, it will melted / If it rains tomorrow, I stay home',
        'If you heating ice, it melts / If it raining tomorrow, I will stay home',
      ],
      correctAnswer: 'If you heat ice, it melts / If it rains tomorrow, I will stay home',
      correctFeedback: tri('Да. Правило: heat/melts. Будущий вариант: rains/will stay.', 'Так. Правило: heat/melts. Майбутній варіант: rains/will stay.', 'Yes. Rule: heat/melts. Future option: rains/will stay.'),
      wrong: {
        'If you will heat ice, it will melts / If it will rain tomorrow, I stay home': tri('Will не нужен после if, а will melts не собирается.', 'Will не потрібен після if, а will melts не складається.', 'Will is not needed after if, and will melts does not work.'),
        'If you heat ice, it will melted / If it rains tomorrow, I stay home': tri('Will melted не собирается, а I stay звучит как привычка.', 'Will melted не складається, а I stay звучить як звичка.', 'Will melted does not work, and I stay sounds like a habit.'),
        'If you heating ice, it melts / If it raining tomorrow, I will stay home': tri('If you heating и If it raining не собираются.', 'If you heating і If it raining не складаються.', 'If you heating and If it raining do not work.'),
      },
      retryLine: 'If you heat ice, it melts / If it rains tomorrow, I will stay home.',
      focusWords: ['If you heat', 'melts', 'If it rains', 'will stay'],
    }),
    step({
      id: 'cond_zero_first_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'if_when_unless_set',
      sentence: 'Choose the correct set.',
      translation: tri('если у меня будет время / когда я приеду / если ты не поторопишься', 'якщо в мене буде час / коли я приїду / якщо ти не поквапишся', 'if I have time / when I arrive / unless you hurry'),
      options: [
        'if I have time / when I arrive / unless you hurry',
        'if I will have time / when I will arrive / unless you will hurry',
        "if I have time / when I will arrive / unless you don't hurry",
        "if I will have time / when I arrive / unless you don't hurry",
      ],
      correctAnswer: 'if I have time / when I arrive / unless you hurry',
      correctFeedback: tri('Да. После if/when/unless в этом смысле: have, arrive, hurry.', 'Так. Після if/when/unless у цьому сенсі: have, arrive, hurry.', 'Yes. After if/when/unless: have, arrive, hurry.'),
      wrong: {
        'if I will have time / when I will arrive / unless you will hurry': tri('Will не ставим сразу после if/when/unless.', 'Will не ставимо одразу після if/when/unless.', 'Do not put will right after if/when/unless.'),
        "if I have time / when I will arrive / unless you don't hurry": tri('When I will arrive ломает шаблон, а unless you don’t hurry дублирует отрицание.', 'When I will arrive ламає шаблон, а unless you don’t hurry дублює заперечення.', "When I will arrive breaks the pattern, and unless you don't hurry doubles the negative."),
        "if I will have time / when I arrive / unless you don't hurry": tri('If I will have ломает шаблон, а unless you don’t hurry дублирует отрицание.', 'If I will have ламає шаблон, а unless you don’t hurry дублює заперечення.', "If I will have breaks the pattern, and unless you don't hurry doubles the negative."),
      },
      retryLine: 'if I have time / when I arrive / unless you hurry.',
      focusWords: ['if I have', 'when I arrive', 'unless you hurry'],
    }),
    step({
      id: 'cond_zero_first_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'full_sentence_repair',
      sentence: 'Choose the correct sentence.',
      translation: tri('Если я закончу рано, я тебе позвоню, а когда доберусь домой, напишу.', 'Якщо я закінчу рано, я тобі подзвоню, а коли дістануся додому, напишу.', 'If I finish early, I will call you, and when I get home, I will text you.'),
      options: [
        'If I finish early, I will call you, and when I get home, I will text you.',
        'If I will finish early, I will call you, and when I will get home, I will text you.',
        'If I finish early, I call you, and when I get home, I text you.',
        'If I finished early, I will call you, and when I got home, I will text you.',
      ],
      correctAnswer: 'If I finish early, I will call you, and when I get home, I will text you.',
      correctFeedback: tri('Да. В обеих частях логика одинаковая: условие без will, результат с will.', 'Так. В обох частинах логіка однакова: умова без will, результат із will.', 'Yes. If I finish -> I will call. When I get -> I will text.'),
      wrong: {
        'If I will finish early, I will call you, and when I will get home, I will text you.': tri('Will не ставим сразу после if и when. Нужно If I finish и when I get.', 'Will не ставимо одразу після if і when. Потрібно If I finish і when I get.', 'Do not put will right after if and when.'),
        'If I finish early, I call you, and when I get home, I text you.': tri('I call/I text звучит как привычка. Здесь будущий результат: will call / will text.', 'I call/I text звучить як звичка. Тут майбутній результат: will call / will text.', 'I call/I text sounds like a habit.'),
        'If I finished early, I will call you, and when I got home, I will text you.': tri('Finished/got смотрят в прошлое или дают другой смысл. Здесь нужно finish/get.', 'Finished/got дивляться в минуле або дають інший сенс. Тут потрібно finish/get.', 'Finished/got point to the past or a different meaning.'),
      },
      retryLine: 'If I finish early, I will call you, and when I get home, I will text you.',
      focusWords: ['If I finish', 'will call', 'when I get', 'will text'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'will_in_if_clause_error',
      'zero_first_meaning_confusion',
      'missing_will_main_clause_error',
      'present_result_instead_of_future_error',
      'unless_meaning_error',
      'when_if_confusion_error',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri(
      'Показываем смысл: правило, привычка или реальный будущий результат.',
      'Показуємо сенс: правило, звичка або реальний майбутній результат.',
      'Muestra el significado: regla, habito o resultado futuro real.',
    ),
    depth2: tri(
      'Проще: результат повторяется всегда или случится потом?',
      'Простіше: результат повторюється завжди чи станеться потім?',
      'Mas simple: el resultado se repite siempre o pasara despues?',
    ),
    depth3: tri(
      'Сравни модели: If water boils? Нет: If you heat water, it boils. Если завтра дождь: If it rains, I will stay.',
      'Порівняй моделі: If water boils? Ні: If you heat water, it boils. Якщо завтра дощ: If it rains, I will stay.',
      'Compara: regla = If you heat water, it boils. Futuro = If it rains, I will stay.',
    ),
    depth4: tri(
      'Почти подсказка: после if/when/unless выбери форму без will.',
      'Майже підказка: після if/when/unless обери форму без will.',
      'Casi una pista: despues de if/when/unless, elige una forma sin will.',
    ),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri(
        'Правило: If you heat water, it boils. Будущий вариант: If it rains, I will stay. После if/when/unless не ставь will.',
        'Правило: If you heat water, it boils. Майбутній варіант: If it rains, I will stay. Після if/when/unless не став will.',
        'Regla: If you heat water, it boils. Opcion futura: If it rains, I will stay. Sin will despues de if/when/unless.',
      ),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_condition_type_hint_then_retry',
      card: tri(
        'Подсказка: сначала посмотри, это общее правило или будущий результат. Потом выбери форму.',
        'Підказка: спочатку подивись, це загальне правило чи майбутній результат. Потім обери форму.',
        'Pista: primero mira si es una regla general o un resultado futuro.',
      ),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri(
        'Режим подсказки: сначала выбери смысл, потом if/when/unless и результат.',
        'Режим підказки: спочатку обери сенс, потім if/when/unless і результат.',
        'Modo guiado: elige primero el significado, luego arma if/when/unless y el resultado.',
      ),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      {
        id: 'guided_cond_zero_first_001',
        prompt: tri('If you heat water, it boils - это правило или будущий план?', 'If you heat water, it boils - це правило чи майбутній план?', 'If you heat water, it boils: regla o plan futuro?'),
        options: ['правило', 'будущий план'],
        correctIndex: 0,
        thenReturnToExerciseId: 'cond_zero_first_easy_001',
      },
      {
        id: 'guided_cond_zero_first_002',
        prompt: tri('После if в If it rains что лучше?', 'Після if в If it rains що краще?', 'Despues de if en If it rains, que es mejor?'),
        options: ['rains', 'will rain'],
        correctIndex: 0,
        thenReturnToExerciseId: 'cond_zero_first_contrast_004',
      },
      {
        id: 'guided_cond_zero_first_003',
        prompt: tri('В фразе “я позвоню, если закончу рано” где стоит will?', 'У фразі “я подзвоню, якщо закінчу рано” де стоїть will?', 'Donde va will en I will call you if I finish early?'),
        options: ['в I will call', 'в if I finish'],
        correctIndex: 0,
        thenReturnToExerciseId: 'cond_zero_first_contrast_006',
      },
      {
        id: 'guided_cond_zero_first_004',
        prompt: tri('Unless you hurry значит что?', 'Unless you hurry означає що?', 'Que significa Unless you hurry?'),
        options: ['if you hurry', "if you don't hurry"],
        correctIndex: 1,
        thenReturnToExerciseId: 'cond_zero_first_mixed_001',
      },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'syntax',
    microDiagnosisId: 'condition_zero_first',
    diagnosisLabel: tri('If / when / unless', 'If / when / unless', 'If / when / unless: condicion'),
    contrastSet: SMART_CONTRAST_SET,
    difficultyLevel: 2,
    focusWords: ['If it rains', 'will stay', 'If I have time', 'unless you hurry', 'when I get'],
    focusPatterns: [
      'general_fact_water',
      'typical_result_tired',
      'machine_rule',
      'future_result_rain',
      'future_result_time',
      'future_result_late',
      'no_will_after_if_rain',
      'no_will_after_if_have',
      'if_part_second',
      'unless_meaning',
      'when_future_moment',
      'if_vs_when',
      'fact_vs_future_pair',
      'if_when_unless_set',
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
    payload: { category: 'syntax', microDiagnosisId: 'condition_zero_first', contrastSet: ['zero conditional', 'first conditional', 'if part', 'result part', 'unless', 'when'], logExactToken: true, logMistakeType: true, logExerciseId: true, logAttemptCount: true, logFeedbackDepth: true },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=syntax&microDiagnosisId=condition_zero_first',
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
