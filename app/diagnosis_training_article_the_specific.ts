import type { DiagnosisTraining, DiagnosisTrainingStep, TriText } from './diagnosis_training_types';

// JESSE_REWORKED_PERSONAL_TRAINING
// This file is protected from legacy replacement unless this exact id is being rebuilt.

type PlannedTrainingLocale = 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

const tri = (
  ru: string,
  uk: string,
  es: string,
  planned: Partial<Record<PlannedTrainingLocale, string>> = {},
): TriText => {
  const copy: TriText = { ru, uk, es };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (planned[locale]) copy[locale] = planned[locale];
  }
  return copy;
};

const ARTICLE_OPTIONS = [
  { id: 'a', text: 'a' },
  { id: 'an', text: 'an' },
  { id: 'the', text: 'the' },
  { id: 'no article', text: 'no article' },
];

type ArticleOptionId = 'a' | 'an' | 'the' | 'no article';

const THE_STEP_TRANSLATIONS: Record<string, Record<PlannedTrainingLocale, string>> = {
  the_easy_001: {
    'pt-BR': 'Eu vi um cachorro. O cachorro era muito pequeno.',
    vi: 'Tôi đã thấy một con chó. Con chó đó rất nhỏ.',
    id: 'Saya melihat seekor anjing. Anjing itu sangat kecil.',
    tr: 'Bir köpek gördüm. Köpek çok küçüktü.',
    pl: 'Zobaczyłem psa. Ten pies był bardzo mały.',
  },
  the_easy_002: {
    'pt-BR': 'Preciso de uma caneta.',
    vi: 'Tôi cần một cây bút.',
    id: 'Saya butuh sebuah pena.',
    tr: 'Bir kaleme ihtiyacım var.',
    pl: 'Potrzebuję długopisu.',
  },
  the_easy_003: {
    'pt-BR': 'Ela comprou um telefone ontem. O telefone era caro.',
    vi: 'Hôm qua cô ấy đã mua một chiếc điện thoại. Chiếc điện thoại đó đắt.',
    id: 'Dia membeli telepon kemarin. Telepon itu mahal.',
    tr: 'Dün bir telefon aldı. Telefon pahalıydı.',
    pl: 'Wczoraj kupiła telefon. Ten telefon był drogi.',
  },
  the_contrast_001: {
    'pt-BR': 'Você pode fechar a porta?',
    vi: 'Bạn có thể đóng cửa không?',
    id: 'Bisakah kamu menutup pintu?',
    tr: 'Kapıyı kapatabilir misin?',
    pl: 'Możesz zamknąć drzwi?',
  },
  the_contrast_002: {
    'pt-BR': 'Por favor, apague a luz.',
    vi: 'Làm ơn tắt đèn.',
    id: 'Tolong matikan lampunya.',
    tr: 'Lütfen ışığı kapat.',
    pl: 'Proszę, zgaś światło.',
  },
  the_contrast_003: {
    'pt-BR': 'Quero comprar um laptop.',
    vi: 'Tôi muốn mua một chiếc laptop.',
    id: 'Saya ingin membeli laptop.',
    tr: 'Bir dizüstü bilgisayar almak istiyorum.',
    pl: 'Chcę kupić laptopa.',
  },
  the_contrast_004: {
    'pt-BR': 'O sol está muito forte hoje.',
    vi: 'Hôm nay mặt trời rất sáng.',
    id: 'Matahari sangat terang hari ini.',
    tr: 'Bugün güneş çok parlak.',
    pl: 'Słońce jest dziś bardzo jasne.',
  },
  the_contrast_005: {
    'pt-BR': 'Encontrei isso na internet.',
    vi: 'Tôi tìm thấy nó trên internet.',
    id: 'Saya menemukannya di internet.',
    tr: 'Bunu internette buldum.',
    pl: 'Znalazłem to w internecie.',
  },
  the_contrast_006: {
    'pt-BR': 'Eu gosto de música.',
    vi: 'Tôi thích âm nhạc.',
    id: 'Saya suka musik.',
    tr: 'Müziği severim.',
    pl: 'Lubię muzykę.',
  },
  the_mixed_001: {
    'pt-BR': 'Esta é a melhor opção.',
    vi: 'Đây là lựa chọn tốt nhất.',
    id: 'Ini pilihan terbaik.',
    tr: 'Bu en iyi seçenek.',
    pl: 'To najlepsza opcja.',
  },
  the_mixed_002: {
    'pt-BR': 'Ela é a única pessoa que sabe a verdade.',
    vi: 'Cô ấy là người duy nhất biết sự thật.',
    id: 'Dia satu-satunya orang yang tahu kebenaran.',
    tr: 'Gerçeği bilen tek kişi o.',
    pl: 'Ona jest jedyną osobą, która zna prawdę.',
  },
  the_mixed_003: {
    'pt-BR': 'Temos o mesmo problema.',
    vi: 'Chúng ta có cùng một vấn đề.',
    id: 'Kita punya masalah yang sama.',
    tr: 'Aynı sorunumuz var.',
    pl: 'Mamy ten sam problem.',
  },
  the_mixed_004: {
    'pt-BR': 'Cachorros são animais amigáveis.',
    vi: 'Chó là loài vật thân thiện.',
    id: 'Anjing adalah hewan yang ramah.',
    tr: 'Köpekler dost canlısı hayvanlardır.',
    pl: 'Psy są przyjaznymi zwierzętami.',
  },
  the_mixed_005: {
    'pt-BR': 'Onde estão as chaves que eu te dei?',
    vi: 'Những chiếc chìa khóa tôi đưa bạn đâu rồi?',
    id: 'Di mana kunci yang saya berikan kepadamu?',
    tr: 'Sana verdiğim anahtarlar nerede?',
    pl: 'Gdzie są klucze, które ci dałem?',
  },
  the_mixed_006: {
    'pt-BR': 'Gostei do filme que assistimos ontem.',
    vi: 'Tôi thích bộ phim chúng ta xem hôm qua.',
    id: 'Saya suka film yang kita tonton kemarin.',
    tr: 'Dün izlediğimiz filmi beğendim.',
    pl: 'Podobał mi się film, który oglądaliśmy wczoraj.',
  },
};

const THE_SKILL_HINTS: Record<string, Record<PlannedTrainingLocale, string>> = {
  first_second_mention: {
    'pt-BR': 'Primeira menção é a/an; segunda menção já é conhecida, então the.',
    vi: 'Lần đầu dùng a/an; lần thứ hai đã rõ rồi, nên dùng the.',
    id: 'Penyebutan pertama memakai a/an; penyebutan kedua sudah diketahui, jadi gunakan the.',
    tr: 'İlk bahiste a/an; ikinci bahiste nesne artık bilinir, bu yüzden the.',
    pl: 'Pierwsza wzmianka to a/an; druga jest już znana, więc używamy the.',
  },
  first_mention_indefinite: {
    'pt-BR': 'É um objeto novo qualquer, não um objeto específico; use a/an.',
    vi: 'Đây là một vật mới bất kỳ, không phải vật cụ thể; dùng a/an.',
    id: 'Ini objek baru yang mana saja, bukan objek spesifik; gunakan a/an.',
    tr: 'Bu belirli değil, herhangi yeni bir nesne; a/an kullan.',
    pl: 'To dowolny nowy obiekt, nie konkretny; użyj a/an.',
  },
  second_mention_specific: {
    'pt-BR': 'O objeto já foi mencionado, então agora é específico: use the.',
    vi: 'Vật đã được nhắc rồi, nên bây giờ là cụ thể: dùng the.',
    id: 'Objek sudah disebutkan, jadi sekarang spesifik: gunakan the.',
    tr: 'Nesne daha önce geçti, artık belirli: the kullan.',
    pl: 'Obiekt był już wspomniany, więc jest konkretny: użyj the.',
  },
  known_from_situation: {
    'pt-BR': 'A situação deixa claro qual objeto é; use the.',
    vi: 'Tình huống làm rõ đó là vật nào; dùng the.',
    id: 'Situasi sudah menjelaskan objek yang mana; gunakan the.',
    tr: 'Durum hangi nesne olduğunu netleştiriyor; the kullan.',
    pl: 'Sytuacja jasno pokazuje, o który obiekt chodzi; użyj the.',
  },
  not_specific_first_mention: {
    'pt-BR': 'Não há objeto específico escolhido; é apenas um qualquer, então a/an.',
    vi: 'Chưa có vật cụ thể được chọn; chỉ là một cái bất kỳ, nên dùng a/an.',
    id: 'Belum ada objek spesifik yang dipilih; hanya satu yang mana saja, jadi a/an.',
    tr: 'Belirli bir nesne seçilmedi; sadece herhangi biri, bu yüzden a/an.',
    pl: 'Nie wybrano konkretnego obiektu; chodzi o dowolny, więc a/an.',
  },
  unique_object: {
    'pt-BR': 'É único no contexto normal, então usamos the.',
    vi: 'Nó là duy nhất trong ngữ cảnh bình thường, nên dùng the.',
    id: 'Ini unik dalam konteks normal, jadi gunakan the.',
    tr: 'Normal bağlamda benzersizdir, bu yüzden the kullanılır.',
    pl: 'Jest wyjątkowy w normalnym kontekście, więc używamy the.',
  },
  shared_world_object: {
    'pt-BR': 'É uma fonte compartilhada e conhecida; memorize como on the internet.',
    vi: 'Đó là nguồn chung đã rõ; hãy nhớ cụm on the internet.',
    id: 'Ini sumber bersama yang dikenal; hafalkan sebagai on the internet.',
    tr: 'Ortak ve bilinen bir kaynak; on the internet kalıbı olarak hatırla.',
    pl: 'To wspólne, znane źródło; zapamiętaj jako on the internet.',
  },
  general_meaning_no_the: {
    'pt-BR': 'É uma ideia geral, não algo específico; não use artigo.',
    vi: 'Đây là ý chung, không phải thứ cụ thể; không dùng mạo từ.',
    id: 'Ini ide umum, bukan sesuatu yang spesifik; jangan pakai artikel.',
    tr: 'Bu genel fikir, belirli bir şey değil; article kullanma.',
    pl: 'To ogólna idea, nie coś konkretnego; nie używaj przedimka.',
  },
  superlative_the: {
    'pt-BR': 'Best destaca uma opção como a melhor; normalmente pede the.',
    vi: 'Best làm nổi bật một lựa chọn tốt nhất; thường cần the.',
    id: 'Best menandai satu pilihan sebagai yang terbaik; biasanya perlu the.',
    tr: 'Best bir seçeneği en iyi diye ayırır; genelde the ister.',
    pl: 'Best wyróżnia jedną opcję jako najlepszą; zwykle wymaga the.',
  },
  only_the: {
    'pt-BR': 'Only destaca uma pessoa/coisa única; quase sempre usamos the.',
    vi: 'Only làm nổi bật một người/vật duy nhất; hầu như luôn dùng the.',
    id: 'Only menandai satu orang/benda yang unik; hampir selalu gunakan the.',
    tr: 'Only tek kişi/şeyi ayırır; neredeyse her zaman the kullanılır.',
    pl: 'Only wyróżnia jedyną osobę/rzecz; prawie zawsze używamy the.',
  },
  same_the: {
    'pt-BR': 'Same quase sempre funciona como bloco the same.',
    vi: 'Same hầu như luôn đi thành cụm the same.',
    id: 'Same hampir selalu menjadi frasa the same.',
    tr: 'Same neredeyse her zaman the same kalıbıdır.',
    pl: 'Same prawie zawsze działa jako blok the same.',
  },
  general_plural_no_the: {
    'pt-BR': 'Plural geral fala da categoria inteira; normalmente sem the.',
    vi: 'Số nhiều chung nói về cả nhóm; thường không dùng the.',
    id: 'Jamak umum membicarakan seluruh kategori; biasanya tanpa the.',
    tr: 'Genel çoğul tüm kategoriyi anlatır; genelde the kullanılmaz.',
    pl: 'Ogólna liczba mnoga mówi o całej kategorii; zwykle bez the.',
  },
  specific_plural_the: {
    'pt-BR': 'O plural é específico pela frase que vem depois; use the.',
    vi: 'Danh từ số nhiều này cụ thể nhờ phần phía sau; dùng the.',
    id: 'Bentuk jamak ini spesifik karena frasa setelahnya; gunakan the.',
    tr: 'Çoğul isim sonraki ifadeyle belirli hale geliyor; the kullan.',
    pl: 'Liczba mnoga jest konkretna dzięki frazie po rzeczowniku; użyj the.',
  },
  specific_from_phrase_after_noun: {
    'pt-BR': 'A frase depois do substantivo torna o objeto específico; use the.',
    vi: 'Cụm phía sau danh từ làm vật trở nên cụ thể; dùng the.',
    id: 'Frasa setelah nomina membuat objek spesifik; gunakan the.',
    tr: 'İsimden sonraki ifade nesneyi belirli yapar; the kullan.',
    pl: 'Fraza po rzeczowniku czyni obiekt konkretnym; użyj the.',
  },
};

const THE_GENERIC_HINTS: Record<PlannedTrainingLocale, string> = {
  'pt-BR': 'Pergunte se é um objeto novo qualquer ou aquele objeto específico.',
  vi: 'Hãy hỏi đó là vật mới bất kỳ hay chính vật cụ thể đó.',
  id: 'Tanyakan apakah ini objek baru yang mana saja atau objek spesifik itu.',
  tr: 'Bunun herhangi yeni bir nesne mi, yoksa o belirli nesne mi olduğunu sor.',
  pl: 'Zapytaj, czy to dowolny nowy obiekt, czy ten konkretny obiekt.',
};

function fillPlanned(copy: TriText, planned: Partial<Record<PlannedTrainingLocale, string>>): TriText {
  const next: TriText = { ...copy };
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
    if (!next[locale] && planned[locale]) next[locale] = planned[locale];
  }
  return next;
}

function plannedTheFeedback(input: {
  targetSkill: string;
  correctAnswer: ArticleOptionId;
  focusWords: string[];
}): Record<PlannedTrainingLocale, string> {
  const focus = input.focusWords.join(' / ');
  const hints = THE_SKILL_HINTS[input.targetSkill] ?? THE_GENERIC_HINTS;
  return {
    'pt-BR': `A resposta correta é "${input.correctAnswer}"${focus ? ` para ${focus}` : ''}. ${hints['pt-BR']}`,
    vi: `Đáp án đúng là "${input.correctAnswer}"${focus ? ` cho ${focus}` : ''}. ${hints.vi}`,
    id: `Jawaban yang benar adalah "${input.correctAnswer}"${focus ? ` untuk ${focus}` : ''}. ${hints.id}`,
    tr: `Doğru cevap "${input.correctAnswer}"${focus ? ` (${focus})` : ''}. ${hints.tr}`,
    pl: `Poprawna odpowiedź to "${input.correctAnswer}"${focus ? ` dla ${focus}` : ''}. ${hints.pl}`,
  };
}

function theStep(input: {
  id: string;
  order: number;
  difficulty: DiagnosisTrainingStep['difficulty'];
  targetSkill: string;
  sentence: string;
  translation: TriText;
  correctAnswer: ArticleOptionId;
  correctFeedback: TriText;
  wrong: Partial<Record<ArticleOptionId, TriText>>;
  retry: [TriText, TriText, TriText];
  focusWords: string[];
}): DiagnosisTrainingStep {
  const correctIndex = ARTICLE_OPTIONS.findIndex((option) => option.id === input.correctAnswer);
  const plannedFeedback = plannedTheFeedback(input);
  const plannedTranslation = THE_STEP_TRANSLATIONS[input.id] ?? plannedFeedback;
  return {
    id: input.id,
    order: input.order,
    difficulty: input.difficulty,
    type: 'single_choice',
    targetSkill: input.targetSkill,
    translation: fillPlanned(input.translation, plannedTranslation),
    explanationBlock: tri(
      'Здесь главный вопрос не в переводе. Спроси: предмет новый и любой, или уже тот самый, понятный собеседнику?',
      'Тут головне питання не в перекладі. Запитай: предмет новий і будь-який, чи вже той самий, зрозумілий співрозмовнику?',
      'Aquí la pregunta principal no es la traducción. Pregunta: es algo nuevo cualquiera, o ya es ese objeto claro para la otra persona?',
      {
        'pt-BR': 'Aqui a pergunta principal não é a tradução. Pergunte: é algo novo qualquer ou já é aquele objeto claro para a outra pessoa?',
        vi: 'Ở đây câu hỏi chính không phải là bản dịch. Hãy hỏi: đó là một vật mới bất kỳ hay chính vật đã rõ với người nghe?',
        id: 'Di sini pertanyaan utamanya bukan terjemahan. Tanyakan: ini benda baru yang mana saja, atau sudah benda spesifik yang jelas bagi lawan bicara?',
        tr: 'Burada ana soru çeviri değil. Sor: bu herhangi yeni bir nesne mi, yoksa karşı tarafın anladığı o belirli nesne mi?',
        pl: 'Tutaj główne pytanie nie dotyczy tłumaczenia. Zapytaj: czy to dowolna nowa rzecz, czy już ta konkretna, jasna dla rozmówcy?',
      },
    ),
    microTask: tri(
      'Выбери артикль по смыслу: какой-то новый предмет, тот самый предмет или общая идея.',
      'Обери артикль за змістом: якийсь новий предмет, той самий предмет або загальна ідея.',
      'Elige el artículo por sentido: algo nuevo, ese objeto específico o una idea general.',
      {
        'pt-BR': 'Escolha o artigo pelo sentido: algo novo, aquele objeto específico ou uma ideia geral.',
        vi: 'Chọn mạo từ theo nghĩa: một vật mới, chính vật cụ thể đó hay ý tưởng chung.',
        id: 'Pilih artikel berdasarkan makna: sesuatu yang baru, benda spesifik itu, atau ide umum.',
        tr: 'Article seçimini anlama göre yap: yeni bir şey, o belirli nesne ya da genel fikir.',
        pl: 'Wybierz przedimek według sensu: coś nowego, ten konkretny obiekt albo ogólna idea.',
      },
    ),
    sentence: input.sentence,
    answerOptions: ARTICLE_OPTIONS,
    correctAnswerId: input.correctAnswer,
    correctIndex,
    correctFeedback: fillPlanned(input.correctFeedback, plannedFeedback),
    wrongFeedbackByOption: {
      a: fillPlanned(input.wrong.a ?? tri(
        'a звучит как один новый или любой предмет. Здесь это не лучший смысл. Проверь, не говорит ли фраза о том самом объекте.',
        'a звучить як один новий або будь-який предмет. Тут це не найкращий зміст. Перевір, чи не йдеться про той самий об’єкт.',
        'a sounds like one new or any object. Here that is not the best meaning. Check if the phrase points to that specific object.',
      ), plannedFeedback),
      an: fillPlanned(input.wrong.an ?? tri(
        'an работает как a, только перед гласным звуком. Здесь проблема не только в звуке: нужно понять, новый объект или уже конкретный.',
        'an працює як a, тільки перед голосним звуком. Тут проблема не лише у звуку: треба зрозуміти, об’єкт новий чи вже конкретний.',
        'an works like a, but before a vowel sound. Here the issue is not only sound: decide if the object is new or already specific.',
      ), plannedFeedback),
      the: fillPlanned(input.wrong.the ?? tri(
        'the нужен, когда предмет уже конкретный или понятный. Здесь фраза не дает такого сигнала.',
        'the потрібен, коли предмет уже конкретний або зрозумілий. Тут фраза не дає такого сигналу.',
        'the is used when the object is already specific or clear. This phrase does not give that signal.',
      ), plannedFeedback),
      'no article': fillPlanned(input.wrong['no article'] ?? tri(
        'Без артикля здесь смысл ломается. Если это один предмет в единственном числе, английскому обычно нужен a/an или the.',
        'Без артикля тут зміст ламається. Якщо це один предмет в однині, англійській зазвичай потрібен a/an або the.',
        'Without an article the meaning breaks here. If this is one singular countable thing, English usually needs a/an or the.',
      ), plannedFeedback),
    },
    retryFeedback: [
      fillPlanned(input.retry[0], plannedFeedback),
      fillPlanned(input.retry[1], plannedFeedback),
      fillPlanned(input.retry[2], plannedFeedback),
      tri(
        `Подсказка: правильный смысл здесь дает "${input.correctAnswer}".`,
        `Підказка: правильний зміст тут дає "${input.correctAnswer}".`,
        `Pista: the right meaning here is "${input.correctAnswer}".`,
        {
          'pt-BR': `Dica: o sentido correto aqui vem de "${input.correctAnswer}".`,
          vi: `Gợi ý: nghĩa đúng ở đây do "${input.correctAnswer}" tạo ra.`,
          id: `Petunjuk: makna yang benar di sini diberikan oleh "${input.correctAnswer}".`,
          tr: `İpucu: burada doğru anlamı "${input.correctAnswer}" verir.`,
          pl: `Wskazówka: właściwy sens daje tutaj "${input.correctAnswer}".`,
        },
      ),
    ],
    fallbackExplanation: tri(
      'Сведи выбор к одному вопросу: это какой-то новый предмет или тот самый? Какой-то новый - a/an. Тот самый - the. Общая идея во множественном числе или неисчисляемое - часто без артикля.',
      'Зведи вибір до одного питання: це якийсь новий предмет чи той самий? Якийсь новий - a/an. Той самий - the. Загальна ідея в множині або незлічуване - часто без артикля.',
      'Reduce the choice to one question: is it a new object or that specific one? New object - a/an. Specific one - the. General plural or uncountable idea - often no article.',
      {
        'pt-BR': 'Reduza a escolha a uma pergunta: é um objeto novo qualquer ou aquele específico? Novo qualquer - a/an. Específico - the. Ideia geral no plural ou incontável - muitas vezes sem artigo.',
        vi: 'Rút lựa chọn về một câu hỏi: đó là vật mới bất kỳ hay chính vật cụ thể đó? Vật mới - a/an. Vật cụ thể - the. Ý chung số nhiều hoặc không đếm được - thường không có mạo từ.',
        id: 'Ringkas pilihan menjadi satu pertanyaan: ini objek baru yang mana saja atau objek spesifik itu? Baru yang mana saja - a/an. Spesifik - the. Ide umum jamak atau tak terhitung - sering tanpa artikel.',
        tr: 'Seçimi tek soruya indir: bu herhangi yeni bir nesne mi, yoksa o belirli nesne mi? Yeni/herhangi - a/an. Belirli - the. Genel çoğul veya sayılamayan fikir - çoğu zaman article yok.',
        pl: 'Sprowadź wybór do jednego pytania: czy to dowolny nowy obiekt, czy ten konkretny? Dowolny nowy - a/an. Konkretny - the. Ogólna idea w liczbie mnogiej lub niepoliczalna - często bez przedimka.',
      },
    ),
    focusWords: input.focusWords,
  };
}

export const ARTICLE_THE_SPECIFIC_TRAINING: DiagnosisTraining = {
  id: 'article_the_specific',
  category: 'article',
  version: '1.0.0',
  status: 'active',
  priority: 2,
  supportedLocales: ['ru', 'uk', 'es'],
  title: tri('The: когда предмет уже конкретный', 'The: коли предмет уже конкретний', 'The: cuando algo ya es específico', {
    'pt-BR': 'The: quando algo já é específico',
    vi: 'The: khi vật đã cụ thể',
    id: 'The: ketika benda sudah spesifik',
    tr: 'The: nesne artık belirliyken',
    pl: 'The: gdy rzecz jest już konkretna',
  }),
  shortTitle: tri('The для конкретики', 'The для конкретності', 'The para algo específico', {
    'pt-BR': 'The para algo definido',
    vi: 'The cho vật cụ thể',
    id: 'The untuk hal spesifik',
    tr: 'Belirli şey için the',
    pl: 'The dla konkretu',
  }),
  shortDiagnosis: tri(
    'Ты путаешь the с a/an или пропускаешь артикль, когда предмет уже понятен собеседнику.',
    'Ти плутаєш the з a/an або пропускаєш артикль, коли предмет уже зрозумілий співрозмовнику.',
    'Confundes the con a/an u omites el artículo cuando el objeto ya está claro para la otra persona.',
    {
      'pt-BR': 'Você confunde the com a/an ou omite o artigo quando o objeto já está claro para a outra pessoa.',
      vi: 'Bạn nhầm the với a/an hoặc bỏ mạo từ khi vật đã rõ với người nghe.',
      id: 'Kamu mencampur the dengan a/an atau menghilangkan artikel ketika objek sudah jelas bagi lawan bicara.',
      tr: 'Nesne karşı taraf için artık belliyken the ile a/an karışıyor ya da article atlanıyor.',
      pl: 'Mylisz the z a/an albo pomijasz przedimek, gdy obiekt jest już jasny dla rozmówcy.',
    },
  ),
  diagnosisText: tri(
    'Ты путаешь the с a/an или вообще пропускаешь артикль. Главная проблема здесь не в переводе, а в том, понимает ли собеседник, о каком именно предмете ты говоришь.',
    'Ти плутаєш the з a/an або взагалі пропускаєш артикль. Головна проблема тут не в перекладі, а в тому, чи розуміє співрозмовник, про який саме предмет ти говориш.',
    'Confundes the con a/an o simplemente omites el artículo. El problema principal aquí no es la traducción, sino si la otra persona entiende exactamente de qué cosa hablas.',
    {
      'pt-BR': 'Você confunde the com a/an ou simplesmente omite o artigo. O problema principal aqui não é a tradução, mas se a outra pessoa entende exatamente de que coisa você fala.',
      vi: 'Bạn nhầm the với a/an hoặc đơn giản là bỏ mạo từ. Vấn đề chính ở đây không phải bản dịch, mà là người nghe có hiểu chính xác bạn đang nói về vật nào không.',
      id: 'Kamu mencampur the dengan a/an atau sekadar menghilangkan artikel. Masalah utamanya bukan terjemahan, melainkan apakah lawan bicara tahu persis benda mana yang kamu maksud.',
      tr: 'The ile a/an karışıyor ya da article tamamen atlanıyor. Buradaki ana sorun çeviri değil; karşı tarafın tam olarak hangi şeyden bahsettiğini anlayıp anlamaması.',
      pl: 'Mylisz the z a/an albo po prostu pomijasz przedimek. Główny problem nie leży w tłumaczeniu, tylko w tym, czy rozmówca rozumie dokładnie, o której rzeczy mówisz.',
    },
  ),
  mentalModel: tri(
    'A/an = один какой-то. The = тот самый, уже понятный, конкретный. Если собеседник может мысленно показать пальцем на объект - часто нужен the.',
    'A/an = один якийсь. The = той самий, уже зрозумілий, конкретний. Якщо співрозмовник може подумки показати пальцем на об’єкт - часто потрібен the.',
    'A/an = uno cualquiera. The = ese mismo, ya entendido, específico. Si la otra persona puede señalar mentalmente el objeto, muchas veces necesitas the.',
    {
      'pt-BR': 'A/an = um qualquer. The = aquele mesmo, já entendido, específico. Se a outra pessoa consegue apontar mentalmente para o objeto, muitas vezes você precisa de the.',
      vi: 'A/an = một cái bất kỳ. The = chính cái đó, đã rõ, cụ thể. Nếu người nghe có thể chỉ ra trong đầu vật đó, thường cần the.',
      id: 'A/an = satu yang mana saja. The = yang itu, sudah dipahami, spesifik. Jika lawan bicara bisa menunjuk objeknya secara mental, sering kali perlu the.',
      tr: 'A/an = herhangi bir tane. The = o aynı, artık anlaşılan, belirli şey. Karşı taraf zihninde nesneyi gösterebiliyorsa çoğu zaman the gerekir.',
      pl: 'A/an = jakiś jeden. The = ten konkretny, już zrozumiały. Jeśli rozmówca może mentalnie wskazać obiekt palcem, często potrzebne jest the.',
    },
  ),
  contrastSet: ['a', 'an', 'the', 'no article'],
  coreRule: tri(
    'Используй the, когда объект уже известен, уже был упомянут, понятен из ситуации, уникален в контексте или выделен как самый/единственный.',
    'Використовуй the, коли об’єкт уже відомий, уже був згаданий, зрозумілий із ситуації, унікальний у контексті або виділений як най-/єдиний.',
    'Usa the cuando el objeto ya es conocido, ya fue mencionado, queda claro por la situación, es único en el contexto o está marcado como el más/el único.',
    {
      'pt-BR': 'Use the quando o objeto já é conhecido, já foi mencionado, fica claro pela situação, é único no contexto ou está marcado como o melhor/o único.',
      vi: 'Dùng the khi vật đã được biết, đã được nhắc, rõ từ tình huống, là duy nhất trong ngữ cảnh hoặc được đánh dấu là nhất/duy nhất.',
      id: 'Gunakan the ketika objek sudah dikenal, sudah disebutkan, jelas dari situasi, unik dalam konteks, atau ditandai sebagai paling/satu-satunya.',
      tr: 'Nesne zaten biliniyorsa, daha önce geçtiyse, durumdan belliyse, bağlamda benzersizse veya en/tek olarak işaretlenmişse the kullan.',
      pl: 'Użyj the, gdy obiekt jest już znany, był wspomniany, wynika z sytuacji, jest wyjątkowy w kontekście albo oznaczony jako najlepszy/jedyny.',
    },
  ),
  whatUserMustLearn: {
    ru: [
      'The не переводится всегда как “этот”, но часто означает “тот самый”.',
      'Первое упоминание обычно a/an: I saw a dog.',
      'Второе упоминание обычно the: The dog was angry.',
      'The нужен, когда объект понятен из ситуации: Close the door.',
      'The нужен с уникальными объектами: the sun, the moon, the internet.',
      'The часто нужен с best, only, same: the best, the only one, the same thing.',
      'The не нужен для общих идей во множественном числе или неисчисляемых слов: I like music, Dogs are friendly.',
    ],
    uk: [
      'The не завжди перекладається як “цей”, але часто означає “той самий”.',
      'Перша згадка зазвичай a/an: I saw a dog.',
      'Друга згадка зазвичай the: The dog was angry.',
      'The потрібен, коли об’єкт зрозумілий із ситуації: Close the door.',
      'The потрібен з унікальними об’єктами: the sun, the moon, the internet.',
      'The часто потрібен із best, only, same: the best, the only one, the same thing.',
      'The не потрібен для загальних ідей у множині або незлічуваних слів: I like music, Dogs are friendly.',
    ],
    es: [
      'The no siempre se traduce como “este”, pero muchas veces significa “ese mismo”.',
      'La primera mención normalmente usa a/an: I saw a dog.',
      'La segunda mención normalmente usa the: The dog was angry.',
      'The se usa cuando el objeto queda claro por la situación: Close the door.',
      'The se usa con objetos únicos: the sun, the moon, the internet.',
      'The suele usarse con best, only, same: the best, the only one, the same thing.',
      'The no se usa para ideas generales en plural o incontables: I like music, Dogs are friendly.',
    ],
    'pt-BR': [
      'The nem sempre se traduz como "este", mas muitas vezes significa "aquele mesmo".',
      'A primeira menção normalmente usa a/an: I saw a dog.',
      'A segunda menção normalmente usa the: The dog was angry.',
      'The é usado quando o objeto fica claro pela situação: Close the door.',
      'The é usado com objetos únicos: the sun, the moon, the internet.',
      'The costuma aparecer com best, only, same: the best, the only one, the same thing.',
      'The não é usado para ideias gerais no plural ou incontáveis: I like music, Dogs are friendly.',
    ],
    vi: [
      'The không phải lúc nào cũng dịch là "này", nhưng thường có nghĩa là "chính cái đó".',
      'Lần nhắc đầu tiên thường dùng a/an: I saw a dog.',
      'Lần nhắc thứ hai thường dùng the: The dog was angry.',
      'Dùng the khi vật đã rõ từ tình huống: Close the door.',
      'Dùng the với những vật duy nhất: the sun, the moon, the internet.',
      'The thường đi với best, only, same: the best, the only one, the same thing.',
      'Không dùng the cho ý tưởng chung ở số nhiều hoặc danh từ không đếm được: I like music, Dogs are friendly.',
    ],
    id: [
      'The tidak selalu diterjemahkan sebagai "ini", tetapi sering berarti "yang itu juga".',
      'Penyebutan pertama biasanya memakai a/an: I saw a dog.',
      'Penyebutan kedua biasanya memakai the: The dog was angry.',
      'The dipakai ketika objek jelas dari situasi: Close the door.',
      'The dipakai dengan objek unik: the sun, the moon, the internet.',
      'The sering dipakai dengan best, only, same: the best, the only one, the same thing.',
      'The tidak dipakai untuk ide umum dalam bentuk jamak atau kata tak terhitung: I like music, Dogs are friendly.',
    ],
    tr: [
      'The her zaman "bu" diye çevrilmez; çoğu zaman "o aynı şey" anlamını verir.',
      'İlk bahiste genelde a/an kullanılır: I saw a dog.',
      'İkinci bahiste genelde the kullanılır: The dog was angry.',
      'Nesne durumdan belliyse the kullanılır: Close the door.',
      'Tekil/benzersiz nesnelerle the kullanılır: the sun, the moon, the internet.',
      'The çoğu zaman best, only, same ile kullanılır: the best, the only one, the same thing.',
      'Çoğul veya sayılamayan genel fikirlerde the kullanılmaz: I like music, Dogs are friendly.',
    ],
    pl: [
      'The nie zawsze tłumaczy się jako "ten", ale często znaczy "ten konkretny".',
      'Pierwsza wzmianka zwykle używa a/an: I saw a dog.',
      'Druga wzmianka zwykle używa the: The dog was angry.',
      'The używamy, gdy obiekt jest jasny z sytuacji: Close the door.',
      'The używamy z obiektami wyjątkowymi: the sun, the moon, the internet.',
      'The często występuje z best, only, same: the best, the only one, the same thing.',
      'The nie używamy dla ogólnych idei w liczbie mnogiej albo niepoliczalnych: I like music, Dogs are friendly.',
    ],
  },
  examples: [
    { en: 'I saw a dog. The dog was angry.', ru: 'Я увидел собаку. Эта собака была злой.', uk: 'Я побачив собаку. Цей собака був злий.', es: 'Vi un perro. El perro estaba enfadado.', 'pt-BR': 'Eu vi um cachorro. O cachorro estava bravo.', vi: 'Tôi đã thấy một con chó. Con chó đó rất dữ.', id: 'Saya melihat seekor anjing. Anjing itu marah.', tr: 'Bir köpek gördüm. Köpek kızgındı.', pl: 'Zobaczyłem psa. Ten pies był zły.', why: tri('Сначала dog новый, поэтому a dog. Потом мы уже знаем, о какой собаке речь, поэтому the dog.', 'Спочатку dog новий, тому a dog. Потім ми вже знаємо, про якого собаку йдеться, тому the dog.', 'Primero dog es nuevo, por eso a dog. Luego ya sabemos de qué perro hablamos, por eso the dog.', { 'pt-BR': 'Primeiro dog é novo, por isso a dog. Depois já sabemos de qual cachorro falamos, por isso the dog.', vi: 'Ban đầu dog là mới, nên dùng a dog. Sau đó ta đã biết đang nói về con chó nào, nên dùng the dog.', id: 'Awalnya dog masih baru, jadi a dog. Setelah itu kita sudah tahu anjing yang mana, jadi the dog.', tr: 'Önce dog yenidir, bu yüzden a dog. Sonra hangi köpekten bahsettiğimizi biliriz, bu yüzden the dog.', pl: 'Najpierw dog jest nowy, więc a dog. Potem już wiemy, o którego psa chodzi, więc the dog.' }) },
    { en: 'Can you close the window?', ru: 'Можешь закрыть окно?', uk: 'Можеш зачинити вікно?', es: 'Puedes cerrar la ventana?', 'pt-BR': 'Você pode fechar a janela?', vi: 'Bạn có thể đóng cửa sổ không?', id: 'Bisakah kamu menutup jendela itu?', tr: 'Pencereyi kapatabilir misin?', pl: 'Możesz zamknąć okno?', why: tri('Окно понятно из ситуации. Собеседник понимает, какое именно окно нужно закрыть.', 'Вікно зрозуміле із ситуації. Співрозмовник розуміє, яке саме вікно треба зачинити.', 'La ventana queda clara por la situación. La otra persona entiende exactamente qué ventana cerrar.', { 'pt-BR': 'A janela fica clara pela situação. A outra pessoa entende exatamente qual janela fechar.', vi: 'Cửa sổ đã rõ từ tình huống. Người nghe hiểu chính xác cần đóng cửa sổ nào.', id: 'Jendelanya jelas dari situasi. Lawan bicara tahu persis jendela mana yang perlu ditutup.', tr: 'Pencere durumdan bellidir. Karşı taraf tam olarak hangi pencerenin kapanacağını anlar.', pl: 'Okno jest jasne z sytuacji. Rozmówca rozumie dokładnie, które okno zamknąć.' }) },
    { en: 'The sun is bright today.', ru: 'Солнце сегодня яркое.', uk: 'Сонце сьогодні яскраве.', es: 'El sol brilla mucho hoy.', 'pt-BR': 'O sol está forte hoje.', vi: 'Hôm nay mặt trời rất sáng.', id: 'Matahari terang hari ini.', tr: 'Bugün güneş parlak.', pl: 'Słońce jest dziś jasne.', why: tri('В обычном контексте солнце одно и всем понятно, о чем речь. Поэтому the sun.', 'У звичайному контексті сонце одне і всім зрозуміло, про що йдеться. Тому the sun.', 'En el contexto normal, el sol es único y todos entienden de qué hablamos. Por eso the sun.', { 'pt-BR': 'No contexto normal, o sol é único e todos entendem do que falamos. Por isso the sun.', vi: 'Trong ngữ cảnh bình thường, mặt trời là duy nhất và ai cũng hiểu ta nói về gì. Vì vậy dùng the sun.', id: 'Dalam konteks normal, matahari itu satu dan semua orang paham maksudnya. Jadi the sun.', tr: 'Normal bağlamda güneş tektir ve herkes neden bahsettiğimizi anlar. Bu yüzden the sun.', pl: 'W normalnym kontekście słońce jest jedno i wszyscy rozumieją, o czym mowa. Dlatego the sun.' }) },
    { en: 'This is the best answer.', ru: 'Это лучший ответ.', uk: 'Це найкраща відповідь.', es: 'Esta es la mejor respuesta.', 'pt-BR': 'Esta é a melhor resposta.', vi: 'Đây là câu trả lời tốt nhất.', id: 'Ini adalah jawaban terbaik.', tr: 'Bu en iyi cevap.', pl: 'To jest najlepsza odpowiedź.', why: tri('best выделяет один вариант как самый лучший. С superlative обычно нужен the.', 'best виділяє один варіант як найкращий. Із superlative зазвичай потрібен the.', 'best marca una opción como la mejor. Con superlativo normalmente usamos the.', { 'pt-BR': 'Best destaca uma opção como a melhor. Com superlativo normalmente usamos the.', vi: 'Best làm nổi bật một lựa chọn là tốt nhất. Với so sánh nhất thường dùng the.', id: 'Best menandai satu pilihan sebagai yang terbaik. Dengan superlative biasanya gunakan the.', tr: 'Best bir seçeneği en iyi olarak ayırır. Superlative ile genelde the kullanılır.', pl: 'Best wyróżnia jedną opcję jako najlepszą. Ze stopniem najwyższym zwykle używamy the.' }) },
    { en: 'I need the same book.', ru: 'Мне нужна та же самая книга.', uk: 'Мені потрібна та сама книга.', es: 'Necesito el mismo libro.', 'pt-BR': 'Eu preciso do mesmo livro.', vi: 'Tôi cần cùng cuốn sách đó.', id: 'Saya perlu buku yang sama.', tr: 'Aynı kitaba ihtiyacım var.', pl: 'Potrzebuję tej samej książki.', why: tri('same почти всегда требует the, потому что мы говорим не о любой книге, а о той же самой.', 'same майже завжди потребує the, бо ми говоримо не про будь-яку книгу, а про ту саму.', 'same casi siempre necesita the porque no hablamos de cualquier libro, sino del mismo.', { 'pt-BR': 'Same quase sempre precisa de the, porque não falamos de qualquer livro, mas do mesmo.', vi: 'Same hầu như luôn cần the, vì ta không nói về bất kỳ cuốn sách nào mà là cùng cuốn đó.', id: 'Same hampir selalu perlu the karena kita tidak membicarakan sembarang buku, tetapi buku yang sama.', tr: 'Same neredeyse her zaman the ister, çünkü herhangi bir kitaptan değil aynı kitaptan bahsederiz.', pl: 'Same prawie zawsze wymaga the, bo nie mówimy o dowolnej książce, tylko o tej samej.' }) },
    { en: 'She is the only person I trust.', ru: 'Она единственный человек, которому я доверяю.', uk: 'Вона єдина людина, якій я довіряю.', es: 'Ella es la única persona en quien confío.', 'pt-BR': 'Ela é a única pessoa em quem confio.', vi: 'Cô ấy là người duy nhất tôi tin tưởng.', id: 'Dia satu-satunya orang yang saya percayai.', tr: 'O güvendiğim tek kişi.', pl: 'Ona jest jedyną osobą, której ufam.', why: tri('only выделяет одного конкретного человека. Поэтому the only person.', 'only виділяє одну конкретну людину. Тому the only person.', 'only marca a una persona específica. Por eso the only person.', { 'pt-BR': 'Only destaca uma pessoa específica. Por isso the only person.', vi: 'Only làm nổi bật một người cụ thể. Vì vậy dùng the only person.', id: 'Only menandai satu orang spesifik. Jadi the only person.', tr: 'Only belirli bir kişiyi ayırır. Bu yüzden the only person.', pl: 'Only wyróżnia jedną konkretną osobę. Dlatego the only person.' }) },
    { en: 'I like music.', ru: 'Мне нравится музыка.', uk: 'Мені подобається музика.', es: 'Me gusta la música.', 'pt-BR': 'Eu gosto de música.', vi: 'Tôi thích âm nhạc.', id: 'Saya suka musik.', tr: 'Müziği severim.', pl: 'Lubię muzykę.', why: tri('В английском music здесь общая идея, не конкретная музыка. Поэтому без the.', 'В англійській music тут загальна ідея, не конкретна музика. Тому без the.', 'En inglés music aquí es una idea general, no música específica. Por eso va sin the.', { 'pt-BR': 'Em inglês, music aqui é uma ideia geral, não música específica. Por isso fica sem the.', vi: 'Trong tiếng Anh, music ở đây là ý chung, không phải bản nhạc cụ thể. Vì vậy không dùng the.', id: 'Dalam bahasa Inggris, music di sini adalah ide umum, bukan musik spesifik. Jadi tanpa the.', tr: 'İngilizcede music burada genel fikirdir, belirli müzik değil. Bu yüzden the yok.', pl: 'Po angielsku music to tutaj ogólna idea, nie konkretna muzyka. Dlatego bez the.' }) },
    { en: 'Dogs are friendly.', ru: 'Собаки дружелюбные.', uk: 'Собаки дружелюбні.', es: 'Los perros son amigables.', 'pt-BR': 'Cachorros são amigáveis.', vi: 'Chó rất thân thiện.', id: 'Anjing itu ramah.', tr: 'Köpekler dost canlısıdır.', pl: 'Psy są przyjazne.', why: tri('Dogs во множественном числе говорит о собаках вообще. Для общей идеи the не нужен.', 'Dogs у множині говорить про собак загалом. Для загальної ідеї the не потрібен.', 'Dogs en plural habla de perros en general. Para una idea general no usamos the.', { 'pt-BR': 'Dogs no plural fala de cachorros em geral. Para uma ideia geral não usamos the.', vi: 'Dogs ở số nhiều nói về chó nói chung. Với ý chung không dùng the.', id: 'Dogs dalam bentuk jamak membicarakan anjing secara umum. Untuk ide umum tidak gunakan the.', tr: 'Dogs çoğul halde genel olarak köpeklerden bahseder. Genel fikir için the gerekmez.', pl: 'Dogs w liczbie mnogiej mówi o psach ogólnie. Dla ogólnej idei nie używamy the.' }) },
  ],
  introBlocks: [
    { id: 'intro_problem', type: 'diagnosis', text: tri('Похоже, ты путаешь the. Это частая ошибка, потому что в русском нет такого же артикля. Но идея простая: the появляется, когда предмет уже не просто “какой-то”, а “тот самый”.', 'Схоже, ти плутаєш the. Це часта помилка, бо в українській немає такого самого артикля. Але ідея проста: the з’являється, коли предмет уже не просто “якийсь”, а “той самий”.', 'Parece que confundes the. Es un error común porque en español el sistema no funciona exactamente igual. Pero la idea es simple: the aparece cuando algo ya no es “uno cualquiera”, sino “ese mismo”.', { 'pt-BR': 'Parece que você confunde the. É um erro comum porque em português o sistema não funciona exatamente igual. Mas a ideia é simples: the aparece quando algo já não é "um qualquer", e sim "aquele mesmo".', vi: 'Có vẻ bạn đang nhầm the. Đây là lỗi thường gặp vì tiếng Việt không có hệ mạo từ giống vậy. Nhưng ý tưởng đơn giản: the xuất hiện khi vật không còn là "một cái nào đó" mà là "chính cái đó".', id: 'Sepertinya kamu mencampur the. Ini kesalahan umum karena dalam bahasa Indonesia sistemnya tidak sama persis. Tapi idenya sederhana: the muncul ketika sesuatu bukan lagi "yang mana saja", melainkan "yang itu".', tr: 'The karışıyor gibi görünüyor. Türkçede aynı article sistemi olmadığı için bu yaygın bir hata. Ama fikir basit: the, nesne artık "herhangi biri" değil "o belirli şey" olduğunda gelir.', pl: 'Wygląda na to, że mylisz the. To częsty błąd, bo w polskim nie ma takiego samego przedimka. Idea jest prosta: the pojawia się, gdy rzecz nie jest już "jakaś", tylko "ta konkretna".' }) },
    { id: 'intro_rule', type: 'rule', text: tri('a/an открывает новый предмет. the возвращает нас к предмету, который уже понятен.', 'a/an відкриває новий предмет. the повертає нас до предмета, який уже зрозумілий.', 'a/an introduce algo nuevo. the nos devuelve a algo que ya está claro.', { 'pt-BR': 'a/an introduz algo novo. the nos leva de volta a algo que já está claro.', vi: 'a/an giới thiệu một vật mới. the đưa ta quay lại vật đã rõ.', id: 'a/an memperkenalkan benda baru. the membawa kita kembali ke benda yang sudah jelas.', tr: 'a/an yeni bir nesne açar. the bizi artık belli olan nesneye geri götürür.', pl: 'a/an wprowadza nowy obiekt. the wraca do obiektu, który jest już jasny.' }) },
    { id: 'intro_warning', type: 'warning', text: tri('Не пытайся переводить the одним русским словом. Лучше задавай вопрос: “Собеседник уже понимает, какой именно предмет я имею в виду?” Если да - часто нужен the.', 'Не намагайся перекладати the одним українським словом. Краще став питання: “Співрозмовник уже розуміє, який саме предмет я маю на увазі?” Якщо так - часто потрібен the.', 'No intentes traducir the con una sola palabra. Mejor pregunta: “La otra persona ya entiende exactamente qué cosa quiero decir?” Si sí - muchas veces necesitas the.', { 'pt-BR': 'Não tente traduzir the com uma só palavra. É melhor perguntar: "A outra pessoa já entende exatamente qual objeto eu quero dizer?" Se sim, muitas vezes você precisa de the.', vi: 'Đừng cố dịch the bằng một từ duy nhất. Tốt hơn hãy hỏi: "Người nghe đã hiểu chính xác mình muốn nói vật nào chưa?" Nếu có, thường cần the.', id: 'Jangan mencoba menerjemahkan the dengan satu kata. Lebih baik tanyakan: "Apakah lawan bicara sudah tahu persis benda mana yang saya maksud?" Jika ya, sering perlu the.', tr: 'The için tek kelimelik çeviri arama. Daha iyi soru şu: "Karşı taraf tam olarak hangi nesneyi kastettiğimi anlıyor mu?" Cevap evetse çoğu zaman the gerekir.', pl: 'Nie próbuj tłumaczyć the jednym słowem. Lepiej zapytaj: "Czy rozmówca już rozumie dokładnie, który obiekt mam na myśli?" Jeśli tak, często potrzebne jest the.' }) },
  ],
  steps: [
    theStep({
      id: 'the_easy_001',
      order: 1,
      difficulty: 'easy',
      targetSkill: 'first_second_mention',
      sentence: 'I saw a dog. ___ dog was very small.',
      translation: tri('Я увидел собаку. Собака была очень маленькой.', 'Я побачив собаку. Собака була дуже маленькою.', 'Vi un perro. El perro era muy pequeño.'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. Сначала была a dog, а теперь мы уже знаем, о какой собаке речь. Поэтому the dog.', 'Так. Спочатку була a dog, а тепер ми вже знаємо, про якого собаку йдеться. Тому the dog.', 'Sí. Primero fue a dog, y ahora ya sabemos de qué perro hablamos. Por eso the dog.'),
      wrong: {
        a: tri('A dog снова звучит как “какая-то новая собака”. Но это та же собака из первого предложения. Поэтому нужен the.', 'A dog знову звучить як “якийсь новий собака”. Але це той самий собака з першого речення. Тому потрібен the.', 'A dog suena como “otro perro nuevo”. Pero es el mismo perro de la primera frase. Por eso necesitamos the.'),
        an: tri('An не подходит по звуку и по смыслу. dog начинается с согласного звука, а главное - собака уже известна. Нужен the.', 'An не підходить за звуком і за змістом. dog починається з приголосного звуку, а головне - собака вже відома. Потрібен the.', 'An no encaja ni por sonido ni por sentido. dog empieza con consonante, y sobre todo, el perro ya es conocido. Necesitamos the.'),
        'no article': tri('Dog в единственном числе не должен стоять здесь без артикля. И так как собака уже известна, нужен the.', 'Dog в однині не має стояти тут без артикля. І оскільки собака вже відома, потрібен the.', 'Dog en singular no debe ir aquí sin artículo. Y como el perro ya es conocido, necesitamos the.'),
      },
      retry: [
        tri('Первый раз: a dog. Второй раз: the dog. Запомни эту пару.', 'Перший раз: a dog. Другий раз: the dog. Запам’ятай цю пару.', 'Primera vez: a dog. Segunda vez: the dog. Recuerda esta pareja.'),
        tri('Собака уже появилась раньше. Уже известна - значит the.', 'Собака вже з’явилася раніше. Уже відома - значить the.', 'El perro ya apareció antes. Ya es conocido - entonces the.'),
        tri('Подсказка: The dog was very small.', 'Підказка: The dog was very small.', 'Pista: The dog was very small.'),
      ],
      focusWords: ['dog', 'the dog'],
    }),
    theStep({
      id: 'the_easy_002',
      order: 2,
      difficulty: 'easy',
      targetSkill: 'first_mention_indefinite',
      sentence: 'I need ___ pen.',
      translation: tri('Мне нужна ручка.', 'Мені потрібна ручка.', 'Necesito un bolígrafo.'),
      correctAnswer: 'a',
      correctFeedback: tri('Да. Это просто одна ручка, не конкретная известная ручка. pen начинается с согласного звука, поэтому a pen.', 'Так. Це просто одна ручка, не конкретна відома ручка. pen починається з приголосного звуку, тому a pen.', 'Sí. Es simplemente un bolígrafo, no uno específico ya conocido. pen empieza con consonante, por eso a pen.'),
      wrong: {
        an: tri('pen начинается с согласного звука /p/. Поэтому не an, а a.', 'pen починається з приголосного звуку /p/. Тому не an, а a.', 'pen empieza con sonido consonántico /p/. Por eso no an, sino a.'),
        the: tri('the звучит так, будто нужна конкретная ручка, которую мы уже знаем. Здесь нужна любая ручка, поэтому a.', 'the звучить так, ніби потрібна конкретна ручка, яку ми вже знаємо. Тут потрібна будь-яка ручка, тому a.', 'the suena como si necesitaras un bolígrafo específico que ya conocemos. Aquí necesitas cualquier bolígrafo, por eso a.'),
        'no article': tri('pen - один исчисляемый предмет. В единственном числе ему нужен артикль.', 'pen - один злічуваний предмет. В однині йому потрібен артикль.', 'pen es una cosa contable singular. En singular necesita artículo.'),
      },
      retry: [
        tri('Это не “та самая ручка”. Это просто одна любая ручка. Значит a pen.', 'Це не “та сама ручка”. Це просто одна будь-яка ручка. Значить a pen.', 'No es “ese bolígrafo específico”. Es simplemente cualquier bolígrafo. Entonces a pen.'),
        tri('Любая одна ручка - a pen.', 'Будь-яка одна ручка - a pen.', 'Cualquier bolígrafo - a pen.'),
        tri('Подсказка: I need a pen.', 'Підказка: I need a pen.', 'Pista: I need a pen.'),
      ],
      focusWords: ['pen'],
    }),
    theStep({
      id: 'the_easy_003',
      order: 3,
      difficulty: 'easy',
      targetSkill: 'second_mention_specific',
      sentence: 'She bought a phone yesterday. ___ phone was expensive.',
      translation: tri('Она вчера купила телефон. Телефон был дорогой.', 'Вона вчора купила телефон. Телефон був дорогий.', 'Ella compró un teléfono ayer. El teléfono era caro.'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. phone уже был упомянут. Теперь это не любой телефон, а тот самый телефон. Поэтому the phone.', 'Так. phone уже був згаданий. Тепер це не будь-який телефон, а той самий телефон. Тому the phone.', 'Sí. phone ya fue mencionado. Ahora no es cualquier teléfono, sino ese mismo teléfono. Por eso the phone.'),
      wrong: {
        a: tri('A phone звучало бы как новый телефон. Но мы говорим о телефоне, который она уже купила. Нужен the.', 'A phone звучало б як новий телефон. Але ми говоримо про телефон, який вона вже купила. Потрібен the.', 'A phone sonaría como otro teléfono nuevo. Pero hablamos del teléfono que ella compró. Necesitamos the.'),
        an: tri('An не подходит: phone начинается с согласного звука, и телефон уже известен. Нужен the.', 'An не підходить: phone починається з приголосного звуку, і телефон уже відомий. Потрібен the.', 'An no encaja: phone empieza con consonante y el teléfono ya es conocido. Necesitamos the.'),
        'no article': tri('Phone в единственном числе здесь требует артикль. Так как телефон уже известен, нужен the.', 'Phone в однині тут потребує артикль. Оскільки телефон уже відомий, потрібен the.', 'Phone en singular aquí necesita artículo. Como el teléfono ya es conocido, necesitamos the.'),
      },
      retry: [
        tri('Она уже купила телефон. Теперь мы говорим об этом телефоне. Этот смысл в английском дает the.', 'Вона вже купила телефон. Тепер ми говоримо про цей телефон. Цей зміст в англійській дає the.', 'Ella ya compró un teléfono. Ahora hablamos de ese teléfono. En inglés ese sentido lo da the.'),
        tri('Уже знаем телефон - the phone.', 'Уже знаємо телефон - the phone.', 'Ya conocemos el teléfono - the phone.'),
        tri('Подсказка: The phone was expensive.', 'Підказка: The phone was expensive.', 'Pista: The phone was expensive.'),
      ],
      focusWords: ['phone', 'the phone'],
    }),
    theStep({
      id: 'the_contrast_001',
      order: 4,
      difficulty: 'contrast',
      targetSkill: 'known_from_situation',
      sentence: 'Can you close ___ door?',
      translation: tri('Можешь закрыть дверь?', 'Можеш зачинити двері?', 'Puedes cerrar la puerta?'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. Дверь понятна из ситуации. Собеседник понимает, какую дверь нужно закрыть. Поэтому the door.', 'Так. Двері зрозумілі із ситуації. Співрозмовник розуміє, які двері треба зачинити. Тому the door.', 'Sí. La puerta queda clara por la situación. La otra persona entiende qué puerta cerrar. Por eso the door.'),
      wrong: {
        a: tri('a door звучит как “какую-нибудь дверь”. Но в комнате обычно понятно, какую дверь нужно закрыть. Поэтому the door.', 'a door звучить як “якісь двері”. Але в кімнаті зазвичай зрозуміло, які двері треба зачинити. Тому the door.', 'a door suena como “cualquier puerta”. Pero en una habitación normalmente queda claro qué puerta cerrar. Por eso the door.'),
        an: tri('door начинается с согласного звука, поэтому an не подходит. И дверь здесь конкретная из ситуации, поэтому нужен the.', 'door починається з приголосного звуку, тому an не підходить. І двері тут конкретні із ситуації, тому потрібен the.', 'door empieza con consonante, así que an no encaja. Y la puerta es específica por la situación, por eso necesitamos the.'),
        'no article': tri('Door здесь конкретная и понятная из ситуации. В английском это обычно the door.', 'Door тут конкретні і зрозумілі із ситуації. В англійській це зазвичай the door.', 'Door aquí es específica y clara por la situación. En inglés normalmente es the door.'),
      },
      retry: [
        tri('Представь комнату. Дверь одна или очевидная. Можно мысленно показать на неё. Значит the.', 'Уяви кімнату. Двері одні або очевидні. Можна подумки показати на них. Значить the.', 'Imagina una habitación. La puerta es obvia. Puedes señalarla mentalmente. Entonces the.'),
        tri('Понятная дверь - the door.', 'Зрозумілі двері - the door.', 'Puerta clara - the door.'),
        tri('Подсказка: close the door.', 'Підказка: close the door.', 'Pista: close the door.'),
      ],
      focusWords: ['door'],
    }),
    theStep({
      id: 'the_contrast_002',
      order: 5,
      difficulty: 'contrast',
      targetSkill: 'known_from_situation',
      sentence: 'Please turn off ___ light.',
      translation: tri('Пожалуйста, выключи свет.', 'Будь ласка, вимкни світло.', 'Por favor, apaga la luz.'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. Свет понятен из ситуации. Мы говорим о свете в комнате. Поэтому the light.', 'Так. Світло зрозуміле із ситуації. Ми говоримо про світло в кімнаті. Тому the light.', 'Sí. La luz queda clara por la situación. Hablamos de la luz de la habitación. Por eso the light.'),
      wrong: {
        a: tri('a light возможно, если ты говоришь о какой-то лампе вообще. Но turn off the light - это понятный свет в ситуации.', 'a light можливо, якщо ти говориш про якусь лампу взагалі. Але turn off the light - це зрозуміле світло в ситуації.', 'a light es posible si hablas de una lámpara cualquiera. Pero turn off the light significa la luz clara en la situación.'),
        an: tri('light начинается с согласного звука /l/, поэтому an не подходит. И здесь свет конкретный, поэтому the.', 'light починається з приголосного звуку /l/, тому an не підходить. І тут світло конкретне, тому the.', 'light empieza con /l/, así que an no encaja. Y aquí la luz es específica, por eso the.'),
        'no article': tri('В этой просьбе light конкретный: тот свет, который нужно выключить. Поэтому the light.', 'У цьому проханні light конкретне: те світло, яке треба вимкнути. Тому the light.', 'En esta petición light es específico: la luz que hay que apagar. Por eso the light.'),
      },
      retry: [
        tri('Если человек понимает, какой свет выключить, это the light.', 'Якщо людина розуміє, яке світло вимкнути, це the light.', 'If the person understands which light to turn off, it is the light.'),
        tri('Понятный свет - the light.', 'Зрозуміле світло - the light.', 'Luz clara - the light.'),
        tri('Подсказка: turn off the light.', 'Підказка: turn off the light.', 'Pista: turn off the light.'),
      ],
      focusWords: ['light'],
    }),
    theStep({
      id: 'the_contrast_003',
      order: 6,
      difficulty: 'contrast',
      targetSkill: 'not_specific_first_mention',
      sentence: 'I want to buy ___ laptop.',
      translation: tri('Я хочу купить ноутбук.', 'Я хочу купити ноутбук.', 'Quiero comprar un portátil.'),
      correctAnswer: 'a',
      correctFeedback: tri('Да. Это просто один ноутбук, не конкретный известный ноутбук. laptop начинается с согласного звука, поэтому a laptop.', 'Так. Це просто один ноутбук, не конкретний відомий ноутбук. laptop починається з приголосного звуку, тому a laptop.', 'Sí. Es simplemente un portátil, no uno específico ya conocido. laptop empieza con consonante, por eso a laptop.'),
      wrong: {
        an: tri('laptop начинается с согласного звука /l/. Поэтому нужен a, не an.', 'laptop починається з приголосного звуку /l/. Тому потрібен a, не an.', 'laptop empieza con /l/. Por eso necesitamos a, no an.'),
        the: tri('the laptop звучит так, будто ты уже выбрал конкретный ноутбук. Если ты просто хочешь купить ноутбук вообще, нужен a laptop.', 'the laptop звучить так, ніби ти вже обрав конкретний ноутбук. Якщо ти просто хочеш купити ноутбук взагалі, потрібен a laptop.', 'the laptop suena como si ya hubieras elegido un portátil específico. Si solo quieres comprar un portátil en general, usa a laptop.'),
        'no article': tri('laptop - один исчисляемый предмет. В единственном числе нужен артикль: a laptop.', 'laptop - один злічуваний предмет. В однині потрібен артикль: a laptop.', 'laptop is one countable thing. In singular it needs an article: a laptop.'),
      },
      retry: [
        tri('Ты не указываешь на конкретный ноутбук. Ты просто хочешь купить один. Значит a laptop.', 'Ти не вказуєш на конкретний ноутбук. Ти просто хочеш купити один. Значить a laptop.', 'You are not pointing to a specific laptop. You simply want to buy one. Entonces a laptop.'),
        tri('Один какой-то ноутбук - a laptop.', 'Один якийсь ноутбук - a laptop.', 'Un portátil cualquiera - a laptop.'),
        tri('Подсказка: buy a laptop.', 'Підказка: buy a laptop.', 'Pista: buy a laptop.'),
      ],
      focusWords: ['laptop'],
    }),
    theStep({
      id: 'the_contrast_004',
      order: 7,
      difficulty: 'contrast',
      targetSkill: 'unique_object',
      sentence: '___ sun is very bright today.',
      translation: tri('Солнце сегодня очень яркое.', 'Сонце сьогодні дуже яскраве.', 'El sol brilla mucho hoy.'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. В обычном контексте солнце одно и всем понятно. Поэтому the sun.', 'Так. У звичайному контексті сонце одне і всім зрозуміле. Тому the sun.', 'Sí. En el contexto normal, el sol es único y todos lo entienden. Por eso the sun.'),
      wrong: {
        a: tri('a sun звучало бы как “какое-то солнце”. В обычной речи мы говорим о нашем солнце, поэтому the sun.', 'a sun звучало б як “якесь сонце”. У звичайній мові ми говоримо про наше сонце, тому the sun.', 'a sun sonaría como “un sol cualquiera”. En el habla normal hablamos de nuestro sol, por eso the sun.'),
        an: tri('sun начинается с согласного звука /s/, поэтому an не подходит. И солнце здесь уникальное, поэтому the.', 'sun починається з приголосного звуку /s/, тому an не підходить. І сонце тут унікальне, тому the.', 'sun empieza con /s/, así que an no encaja. Y el sol aquí es único, por eso the.'),
        'no article': tri('В английском обычно говорят the sun, потому что это понятный уникальный объект.', 'В англійській зазвичай кажуть the sun, бо це зрозумілий унікальний об’єкт.', 'In English we normally say the sun because it is a unique and clear object.'),
      },
      retry: [
        tri('Солнце в обычном мире одно. Один понятный объект - the sun.', 'Сонце у звичайному світі одне. Один зрозумілий об’єкт - the sun.', 'The sun in the normal world is one. A clear object - the sun.'),
        tri('Не любое солнце. Наше солнце - the sun.', 'Не будь-яке сонце. Наше сонце - the sun.', 'Not any sun. Our sun - the sun.'),
        tri('Подсказка: The sun.', 'Підказка: The sun.', 'Pista: The sun.'),
      ],
      focusWords: ['sun'],
    }),
    theStep({
      id: 'the_contrast_005',
      order: 8,
      difficulty: 'contrast',
      targetSkill: 'shared_world_object',
      sentence: 'I found it on ___ internet.',
      translation: tri('Я нашёл это в интернете.', 'Я знайшов це в інтернеті.', 'Lo encontré en internet.'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. В стандартном английском обычно говорят on the internet. Это общий понятный источник.', 'Так. У стандартній англійській зазвичай кажуть on the internet. Це спільне зрозуміле джерело.', 'Sí. En inglés estándar normalmente decimos on the internet. Es una fuente común y clara.'),
      wrong: {
        a: tri('a internet не используется. Internet воспринимается как общий понятный источник, поэтому on the internet.', 'a internet не використовується. Internet сприймається як спільне зрозуміле джерело, тому on the internet.', 'a internet is not used. Internet is treated as a shared clear source, so on the internet.'),
        an: tri('an internet не используется в этой фразе. Естественная форма: on the internet.', 'an internet не використовується в цій фразі. Природна форма: on the internet.', 'an internet is not used in this phrase. Natural form: on the internet.'),
        'no article': tri('В английском стандартная фраза - on the internet. Здесь the лучше запомнить как часть устойчивого выражения.', 'В англійській стандартна фраза - on the internet. Тут the краще запам’ятати як частину сталого виразу.', 'In English the standard phrase is on the internet. It is useful to remember the as part of the expression.'),
      },
      retry: [
        tri('Запомни готовым блоком: on the internet.', 'Запам’ятай готовим блоком: on the internet.', 'Memorízalo como bloque: on the internet.'),
        tri('Интернет - общий понятный источник. Обычно the internet.', 'Інтернет - спільне зрозуміле джерело. Зазвичай the internet.', 'Internet es una fuente común y clara. Normalmente the internet.'),
        tri('Подсказка: on the internet.', 'Підказка: on the internet.', 'Pista: on the internet.'),
      ],
      focusWords: ['internet'],
    }),
    theStep({
      id: 'the_contrast_006',
      order: 9,
      difficulty: 'contrast',
      targetSkill: 'general_meaning_no_the',
      sentence: 'I like ___ music.',
      translation: tri('Мне нравится музыка.', 'Мені подобається музика.', 'Me gusta la música.'),
      correctAnswer: 'no article',
      correctFeedback: tri('Да. Music здесь означает музыку вообще, не конкретную музыку. В английском в таком общем смысле артикль не нужен.', 'Так. Music тут означає музику загалом, не конкретну музику. В англійській у такому загальному сенсі артикль не потрібен.', 'Sí. Music aquí significa música en general, no música específica. En inglés, con este sentido general no usamos artículo.'),
      wrong: {
        a: tri('Music обычно неисчисляемое слово. Мы не говорим a music, если имеем в виду музыку вообще.', 'Music зазвичай незлічуване слово. Ми не кажемо a music, якщо маємо на увазі музику загалом.', 'Music normally is uncountable. We do not say a music when we mean music in general.'),
        an: tri('an music невозможно в этом смысле. Music здесь общая идея, без артикля.', 'an music неможливо в цьому сенсі. Music тут загальна ідея, без артикля.', 'an music no funciona aquí. Music es una idea general, sin artículo.'),
        the: tri('the music означало бы конкретную музыку, например музыку в комнате или музыку из фильма. Здесь музыка вообще, поэтому без the.', 'the music означало б конкретну музику, наприклад музику в кімнаті або музику з фільму. Тут музика загалом, тому без the.', 'the music significaría música específica, por ejemplo música en una habitación o de una película. Aquí es música en general, por eso sin the.'),
      },
      retry: [
        tri('Если говоришь “музыка вообще”, в английском просто music.', 'Якщо говориш “музика загалом”, в англійській просто music.', 'Si hablas de “música en general”, en inglés es simplemente music.'),
        tri('Музыка вообще - music. Конкретная музыка - the music.', 'Музика загалом - music. Конкретна музика - the music.', 'Música en general - music. Música específica - the music.'),
        tri('Подсказка: I like music.', 'Підказка: I like music.', 'Pista: I like music.'),
      ],
      focusWords: ['music'],
    }),
    theStep({
      id: 'the_mixed_001',
      order: 10,
      difficulty: 'mixed',
      targetSkill: 'superlative_the',
      sentence: 'This is ___ best option.',
      translation: tri('Это лучший вариант.', 'Це найкращий варіант.', 'Esta es la mejor opción.'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. best выделяет один вариант как самый лучший. С best обычно нужен the.', 'Так. best виділяє один варіант як найкращий. Із best зазвичай потрібен the.', 'Sí. best marca una opción como la mejor. Con best normalmente usamos the.'),
      wrong: {
        a: tri('a best option звучит неправильно. Best уже выделяет самый лучший вариант, поэтому нужен the best option.', 'a best option звучить неправильно. Best уже виділяє найкращий варіант, тому потрібен the best option.', 'a best option suena incorrecto. Best ya marca la mejor opción, por eso necesitamos the best option.'),
        an: tri('an не подходит по звуку и по правилу. С best нужна конструкция the best.', 'an не підходить за звуком і за правилом. Із best потрібна конструкція the best.', 'an no encaja ni por sonido ni por regla. Con best usamos the best.'),
        'no article': tri('Со словом best обычно нужен the. Говорим: the best answer.', 'Зі словом best зазвичай потрібен the. Кажемо: the best answer.', 'Best normally needs the: the best answer, the best option, the best day.'),
      },
      retry: [
        tri('Best = самый лучший. Самый конкретный вариант - the best.', 'Best = найкращий. Найконкретніший варіант - the best.', 'Best = el mejor. La opción más específica - the best.'),
        tri('Запомни блок: the best.', 'Запам’ятай блок: the best.', 'Recuerda el bloque: the best.'),
        tri('Подсказка: the best option.', 'Підказка: the best option.', 'Pista: the best option.'),
      ],
      focusWords: ['best'],
    }),
    theStep({
      id: 'the_mixed_002',
      order: 11,
      difficulty: 'mixed',
      targetSkill: 'only_the',
      sentence: 'She is ___ only person who knows the truth.',
      translation: tri('Она единственный человек, который знает правду.', 'Вона єдина людина, яка знає правду.', 'Ella es la única persona que sabe la verdad.'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. only выделяет одного конкретного человека. Поэтому the only person.', 'Так. only виділяє одну конкретну людину. Тому the only person.', 'Sí. only marca a una persona específica. Por eso the only person.'),
      wrong: {
        a: tri('a only person звучит неправильно. С only почти всегда нужен the: the only person.', 'a only person звучить неправильно. З only майже завжди потрібен the: the only person.', 'a only person suena incorrecto. Con only casi siempre necesitamos the: the only person.'),
        an: tri('an only person не является естественным вариантом здесь. Стандартная форма: the only person.', 'an only person не є природним варіантом тут. Стандартна форма: the only person.', 'an only person is not natural here. Standard form: the only person.'),
        'no article': tri('Only выделяет единственный вариант. В английском обычно нужен the: the only person.', 'Only виділяє єдиний варіант. В англійській зазвичай потрібен the: the only person.', 'Only marks the only option. English normally needs the: the only person.'),
      },
      retry: [
        tri('Only = единственный. Единственный конкретный человек - the only person.', 'Only = єдиний. Єдина конкретна людина - the only person.', 'Only = único. One unique specific person - the only person.'),
        tri('Запомни блок: the only.', 'Запам’ятай блок: the only.', 'Recuerda el bloque: the only.'),
        tri('Подсказка: the only person.', 'Підказка: the only person.', 'Pista: the only person.'),
      ],
      focusWords: ['only'],
    }),
    theStep({
      id: 'the_mixed_003',
      order: 12,
      difficulty: 'mixed',
      targetSkill: 'same_the',
      sentence: 'We have ___ same problem.',
      translation: tri('У нас та же самая проблема.', 'У нас та сама проблема.', 'Tenemos el mismo problema.'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. same почти всегда требует the: the same problem.', 'Так. same майже завжди потребує the: the same problem.', 'Sí. same casi siempre necesita the: the same problem.'),
      wrong: {
        a: tri('a same problem звучит неправильно. Same означает “тот же самый”, поэтому нужен the same.', 'a same problem звучить неправильно. Same означає “той самий”, тому потрібен the same.', 'a same problem suena incorrecto. Same significa “el mismo”, por eso necesitamos the same.'),
        an: tri('an same problem не подходит. С same стандартная связка - the same.', 'an same problem не підходить. Із same стандартна зв’язка - the same.', 'an same problem no encaja. Con same usamos el bloque the same.'),
        'no article': tri('Same почти всегда идет с the. Правильно: the same problem.', 'Same майже завжди йде з the. Правильно: the same problem.', 'Same almost always goes with the. Correct: the same problem.'),
      },
      retry: [
        tri('Same = тот же самый. В английском это почти всегда the same.', 'Same = той самий. В англійській це майже завжди the same.', 'Same = el mismo. In English it is almost always the same.'),
        tri('Запомни блок: the same.', 'Запам’ятай блок: the same.', 'Recuerda el bloque: the same.'),
        tri('Подсказка: the same problem.', 'Підказка: the same problem.', 'Pista: the same problem.'),
      ],
      focusWords: ['same'],
    }),
    theStep({
      id: 'the_mixed_004',
      order: 13,
      difficulty: 'mixed_review',
      targetSkill: 'general_plural_no_the',
      sentence: '___ dogs are friendly animals.',
      translation: tri('Собаки - дружелюбные животные.', 'Собаки - дружелюбні тварини.', 'Los perros son animales amigables.'),
      correctAnswer: 'no article',
      correctFeedback: tri('Да. Dogs здесь означает собак вообще. Для общей идеи во множественном числе артикль обычно не нужен.', 'Так. Dogs тут означає собак загалом. Для загальної ідеї в множині артикль зазвичай не потрібен.', 'Sí. Dogs aquí significa perros en general. Para una idea general en plural normalmente no usamos artículo.'),
      wrong: {
        a: tri('a нельзя ставить перед plural dogs. A/an используется перед одним предметом, не перед множественным числом.', 'a не можна ставити перед plural dogs. A/an використовується перед одним предметом, не перед множиною.', 'a cannot go before plural dogs. A/an is used before one thing, not plural.'),
        an: tri('an нельзя ставить перед dogs. Dogs - множественное число, а an используется перед одним предметом.', 'an не можна ставити перед dogs. Dogs - множина, а an використовується перед одним предметом.', 'an cannot go before dogs. Dogs is plural, and an is used before one thing.'),
        the: tri('the dogs означало бы конкретные собаки. Здесь речь о собаках вообще, поэтому без the.', 'the dogs означало б конкретні собаки. Тут йдеться про собак загалом, тому без the.', 'the dogs significaría perros específicos. Aquí hablamos de perros en general, por eso sin the.'),
      },
      retry: [
        tri('Собаки вообще - dogs. Конкретные собаки - the dogs.', 'Собаки загалом - dogs. Конкретні собаки - the dogs.', 'Perros en general - dogs. Perros específicos - the dogs.'),
        tri('Общая идея во множественном числе - без the.', 'Загальна ідея в множині - без the.', 'Idea general en plural - sin the.'),
        tri('Подсказка: Dogs are friendly animals.', 'Підказка: Dogs are friendly animals.', 'Pista: Dogs are friendly animals.'),
      ],
      focusWords: ['dogs'],
    }),
    theStep({
      id: 'the_mixed_005',
      order: 14,
      difficulty: 'mixed_review',
      targetSkill: 'specific_plural_the',
      sentence: 'Where are ___ keys I gave you?',
      translation: tri('Где ключи, которые я тебе дал?', 'Де ключі, які я тобі дав?', 'Dónde están las llaves que te di?'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. Это не ключи вообще, а конкретные ключи, которые я тебе дал. Поэтому the keys.', 'Так. Це не ключі загалом, а конкретні ключі, які я тобі дав. Тому the keys.', 'Sí. No son llaves en general, sino las llaves específicas que te di. Por eso the keys.'),
      wrong: {
        a: tri('a нельзя ставить перед keys, потому что keys - множественное число. И здесь ключи конкретные, поэтому the.', 'a не можна ставити перед keys, бо keys - множина. І тут ключі конкретні, тому the.', 'a no puede ir antes de keys porque keys es plural. Y aquí las llaves son específicas, por eso the.'),
        an: tri('an нельзя ставить перед plural keys. Здесь нужны конкретные ключи: the keys.', 'an не можна ставити перед plural keys. Тут потрібні конкретні ключі: the keys.', 'an no puede ir antes de plural keys. Aquí necesitamos llaves específicas: the keys.'),
        'no article': tri('Без артикля keys звучит более общо. Но фраза I gave you делает ключи конкретными. Поэтому the keys.', 'Без артикля keys звучить більш загально. Але фраза I gave you робить ключі конкретними. Тому the keys.', 'Sin artículo, keys suena más general. Pero I gave you las hace específicas. Por eso the keys.'),
      },
      retry: [
        tri('Какие ключи? Те, которые я тебе дал. Значит the keys.', 'Які ключі? Ті, які я тобі дав. Значить the keys.', 'Qué llaves? Las que te di. Entonces the keys.'),
        tri('Конкретные ключи - the keys.', 'Конкретні ключі - the keys.', 'Llaves específicas - the keys.'),
        tri('Подсказка: the keys I gave you.', 'Підказка: the keys I gave you.', 'Pista: the keys I gave you.'),
      ],
      focusWords: ['keys'],
    }),
    theStep({
      id: 'the_mixed_006',
      order: 15,
      difficulty: 'mixed_review',
      targetSkill: 'specific_from_phrase_after_noun',
      sentence: 'I liked ___ movie we watched yesterday.',
      translation: tri('Мне понравился фильм, который мы вчера смотрели.', 'Мені сподобався фільм, який ми дивилися вчора.', 'Me gustó la película que vimos ayer.'),
      correctAnswer: 'the',
      correctFeedback: tri('Да. Фраза we watched yesterday делает movie конкретным. Это не любой фильм, а тот фильм, который мы смотрели вчера.', 'Так. Фраза we watched yesterday робить movie конкретним. Це не будь-який фільм, а той фільм, який ми дивилися вчора.', 'Sí. La frase we watched yesterday hace que movie sea específico. No es cualquier película, sino la que vimos ayer.'),
      wrong: {
        a: tri('a movie было бы просто “какой-то фильм”. Но we watched yesterday уточняет, какой именно фильм. Поэтому the.', 'a movie було б просто “якийсь фільм”. Але we watched yesterday уточнює, який саме фільм. Тому the.', 'a movie sería “una película cualquiera”. Pero we watched yesterday especifica qué película. Por eso the.'),
        an: tri('movie начинается с согласного звука, поэтому an не подходит. И фильм конкретный, поэтому the.', 'movie починається з приголосного звуку, тому an не підходить. І фільм конкретний, тому the.', 'movie empieza con sonido consonántico, así que an no encaja. Y la película es específica, por eso the.'),
        'no article': tri('Movie в единственном числе здесь требует артикль. Так как фильм конкретный, нужен the.', 'Movie в однині тут потребує артикль. Оскільки фільм конкретний, потрібен the.', 'Movie in singular needs an article here. Since the movie is specific, we need the.'),
      },
      retry: [
        tri('Какой фильм? Тот, который мы смотрели вчера. Значит the movie.', 'Який фільм? Той, який ми дивилися вчора. Значить the movie.', 'Qué película? La que vimos ayer. Entonces the movie.'),
        tri('Фраза после movie делает его конкретным. Конкретный - the.', 'Фраза після movie робить його конкретним. Конкретний - the.', 'La frase después de movie la hace específica. Específico - the.'),
        tri('Подсказка: the movie we watched yesterday.', 'Підказка: the movie we watched yesterday.', 'Pista: the movie we watched yesterday.'),
      ],
      focusWords: ['movie'],
    }),
  ],
  masteryRules: {
    minCorrect: 10,
    minCorrectStreak: 4,
    requireCorrectAfterWrong: true,
    requireMixedReview: true,
    maxAllowedCriticalMistakes: 2,
    criticalMistakeIds: [
      'first_second_mention_confusion',
      'known_from_situation_confusion',
      'unique_object_missing_the',
      'superlative_missing_the',
      'general_meaning_overuse_the',
    ],
    repeatIfCorrectRateBelow: 0.78,
    unlockSmartTrainerAfterMastery: true,
  },
  adaptiveFeedbackPolicy: {
    maxDepth: 4,
    depth1: tri('Обычное объяснение: показываем, почему объект конкретный или неконкретный.', 'Звичайне пояснення: показуємо, чому об’єкт конкретний або неконкретний.', 'Explicación normal: mostramos por qué el objeto es específico o no específico.', { 'pt-BR': 'Explicação normal: mostramos por que o objeto é específico ou não específico.', vi: 'Giải thích bình thường: cho thấy vì sao vật cụ thể hoặc không cụ thể.', id: 'Penjelasan biasa: tunjukkan mengapa objek spesifik atau tidak spesifik.', tr: 'Normal açıklama: nesnenin neden belirli ya da belirsiz olduğunu gösteririz.', pl: 'Zwykłe wyjaśnienie: pokazujemy, dlaczego obiekt jest konkretny albo niekonkretny.' }),
    depth2: tri('Проще: сводим выбор к вопросу “какой-то или тот самый?”', 'Простіше: зводимо вибір до питання “якийсь чи той самий?”', 'Más simple: reducimos la elección a “uno cualquiera o ese mismo?”', { 'pt-BR': 'Mais simples: reduzimos a escolha a "um qualquer ou aquele mesmo?"', vi: 'Đơn giản hơn: rút lựa chọn về "một cái bất kỳ hay chính cái đó?"', id: 'Lebih sederhana: pilihan diringkas menjadi "yang mana saja atau yang itu?"', tr: 'Daha basit: seçimi "herhangi biri mi, o belirli şey mi?" sorusuna indiririz.', pl: 'Prościej: sprowadzamy wybór do pytania "jakiś czy ten konkretny?"' }),
    depth3: tri('Еще проще: показываем короткую пару a/an vs the.', 'Ще простіше: показуємо коротку пару a/an vs the.', 'Aún más simple: mostramos una pareja corta a/an vs the.', { 'pt-BR': 'Ainda mais simples: mostramos o par curto a/an vs the.', vi: 'Đơn giản hơn nữa: hiển thị cặp ngắn a/an và the.', id: 'Lebih sederhana lagi: tampilkan pasangan singkat a/an vs the.', tr: 'Daha da basit: kısa a/an ve the çiftini gösteririz.', pl: 'Jeszcze prościej: pokazujemy krótką parę a/an vs the.' }),
    depth4: tri('Почти подсказка: прямо указываем, известен объект или нет.', 'Майже підказка: прямо вказуємо, відомий об’єкт чи ні.', 'Casi pista: indicamos directamente si el objeto ya es conocido o no.', { 'pt-BR': 'Quase dica: indicamos diretamente se o objeto já é conhecido ou não.', vi: 'Gần như gợi ý: nói thẳng vật đã được biết hay chưa.', id: 'Hampir petunjuk: langsung tunjukkan apakah objek sudah dikenal atau belum.', tr: 'Neredeyse ipucu: nesnenin bilinir olup olmadığını doğrudan belirtiriz.', pl: 'Prawie podpowiedź: wskazujemy bezpośrednio, czy obiekt jest już znany.' }),
  },
  failureRecovery: {
    afterTwoWrongInSameExercise: {
      action: 'show_simplified_rule_card',
      card: tri('Остановись. Не переводи the. Спроси проще: это “какой-то новый” предмет или “тот самый” предмет? Какой-то новый - a/an. Тот самый - the.', 'Зупинись. Не перекладай the. Запитай простіше: це “якийсь новий” предмет чи “той самий” предмет? Якийсь новий - a/an. Той самий - the.', 'Detente. No traduzcas the. Pregunta más simple: es algo “nuevo cualquiera” o “ese mismo” objeto? Nuevo cualquiera - a/an. Ese mismo - the.', { 'pt-BR': 'Pare. Não traduza the. Pergunte de forma simples: é um objeto "novo qualquer" ou "aquele mesmo" objeto? Novo qualquer - a/an. Aquele mesmo - the.', vi: 'Dừng lại. Đừng dịch the. Hỏi đơn giản hơn: đây là vật "mới bất kỳ" hay "chính vật đó"? Vật mới - a/an. Chính vật đó - the.', id: 'Berhenti. Jangan menerjemahkan the. Tanyakan lebih sederhana: ini benda "baru yang mana saja" atau benda "yang itu"? Baru yang mana saja - a/an. Yang itu - the.', tr: 'Dur. The çevirisi arama. Daha basit sor: bu "herhangi yeni" bir nesne mi, yoksa "o belirli" nesne mi? Herhangi yeni - a/an. O belirli - the.', pl: 'Zatrzymaj się. Nie tłumacz the. Zapytaj prościej: czy to "jakiś nowy" przedmiot, czy "ten konkretny" przedmiot? Jakiś nowy - a/an. Ten konkretny - the.' }),
    },
    afterThreeWrongInSameExercise: {
      action: 'show_specificity_hint_then_retry',
      card: tri('Подсказка по смыслу: система покажет, известен предмет или новый, но не выберет артикль за пользователя.', 'Підказка за змістом: система покаже, предмет відомий чи новий, але не вибере артикль за користувача.', 'Pista de significado: el sistema mostrará si el objeto es conocido o nuevo, pero no elegirá el artículo por el usuario.', { 'pt-BR': 'Dica de sentido: o sistema mostrará se o objeto é conhecido ou novo, mas não escolherá o artigo pelo usuário.', vi: 'Gợi ý về nghĩa: hệ thống sẽ cho biết vật đã biết hay mới, nhưng không chọn mạo từ thay người dùng.', id: 'Petunjuk makna: sistem akan menunjukkan apakah objek dikenal atau baru, tetapi tidak memilih artikel untuk pengguna.', tr: 'Anlam ipucu: sistem nesnenin bilinir mi yeni mi olduğunu gösterecek, ama article seçimini kullanıcı adına yapmayacak.', pl: 'Podpowiedź znaczenia: system pokaże, czy przedmiot jest znany czy nowy, ale nie wybierze przedimka za użytkownika.' }),
    },
    afterFourWrongInSameExercise: {
      action: 'switch_to_guided_mode',
      card: tri('Режим подсказки: сначала выбери смысл - “новый предмет” или “уже понятный предмет”. Потом система вернет тебя к артиклю.', 'Режим підказки: спочатку обери зміст - “новий предмет” чи “уже зрозумілий предмет”. Потім система поверне тебе до артикля.', 'Modo guiado: primero elige el sentido - “objeto nuevo” u “objeto ya claro”. Luego el sistema te devuelve al artículo.', { 'pt-BR': 'Modo guiado: primeiro escolha o sentido - "objeto novo" ou "objeto já claro". Depois o sistema devolve você ao artigo.', vi: 'Chế độ hướng dẫn: trước tiên chọn nghĩa - "vật mới" hay "vật đã rõ". Sau đó hệ thống đưa bạn quay lại mạo từ.', id: 'Mode terpandu: pilih dulu maknanya - "objek baru" atau "objek yang sudah jelas". Lalu sistem mengembalikanmu ke artikel.', tr: 'Rehberli mod: önce anlamı seç - "yeni nesne" mi, "artık belli nesne" mi. Sonra sistem seni article seçimine döndürür.', pl: 'Tryb prowadzenia: najpierw wybierz sens - "nowy przedmiot" czy "już jasny przedmiot". Potem system wróci z tobą do przedimka.' }),
    },
  },
  guidedMode: {
    enabled: true,
    triggerAfterWrongAttempts: 4,
    tasks: [
      { id: 'guided_specificity_001', prompt: tri('В предложении I saw a dog. ___ dog was small. Собака новая или уже известная?', 'У реченні I saw a dog. ___ dog was small. Собака нова чи вже відома?', 'En I saw a dog. ___ dog was small. El perro es nuevo o ya conocido?', { 'pt-BR': 'Em I saw a dog. ___ dog was small, o cachorro é novo ou já conhecido?', vi: 'Trong I saw a dog. ___ dog was small, con chó là mới hay đã biết?', id: 'Dalam I saw a dog. ___ dog was small, anjingnya baru atau sudah dikenal?', tr: 'I saw a dog. ___ dog was small cümlesinde köpek yeni mi, yoksa artık bilinen mi?', pl: 'W zdaniu I saw a dog. ___ dog was small pies jest nowy czy już znany?' }), options: ['новая', 'уже известная'], correctIndex: 1, thenReturnToExerciseId: 'the_easy_001' },
      { id: 'guided_specificity_002', prompt: tri('В фразе I like ___ music речь о конкретной музыке или о музыке вообще?', 'У фразі I like ___ music йдеться про конкретну музику чи про музику загалом?', 'En I like ___ music hablamos de música específica o música en general?', { 'pt-BR': 'Em I like ___ music, falamos de música específica ou música em geral?', vi: 'Trong I like ___ music, ta nói về âm nhạc cụ thể hay âm nhạc nói chung?', id: 'Dalam I like ___ music, kita berbicara tentang musik spesifik atau musik secara umum?', tr: 'I like ___ music ifadesinde belirli müzikten mi, genel olarak müzikten mi bahsediyoruz?', pl: 'W I like ___ music mówimy o konkretnej muzyce czy o muzyce ogólnie?' }), options: ['конкретная музыка', 'музыка вообще'], correctIndex: 1, thenReturnToExerciseId: 'the_contrast_006' },
      { id: 'guided_specificity_003', prompt: tri('В фразе the movie we watched yesterday фильм конкретный?', 'У фразі the movie we watched yesterday фільм конкретний?', 'En the movie we watched yesterday, la película es específica?', { 'pt-BR': 'Em the movie we watched yesterday, o filme é específico?', vi: 'Trong the movie we watched yesterday, bộ phim có cụ thể không?', id: 'Dalam the movie we watched yesterday, filmnya spesifik?', tr: 'the movie we watched yesterday ifadesinde film belirli mi?', pl: 'Czy w the movie we watched yesterday film jest konkretny?' }), options: ['да', 'нет'], correctIndex: 0, thenReturnToExerciseId: 'the_mixed_006' },
    ],
  },
  smartTrainerConfig: {
    mode: 'weak',
    source: 'diagnosis_training',
    category: 'article',
    microDiagnosisId: 'article_the_specific',
    diagnosisLabel: tri('The для конкретного объекта', 'The для конкретного об’єкта', 'The para objeto específico', {
      'pt-BR': 'The para objeto definido',
      vi: 'The cho vật cụ thể',
      id: 'The untuk objek spesifik',
      tr: 'Belirli nesne için the',
      pl: 'The dla konkretnego obiektu',
    }),
    contrastSet: ['a', 'an', 'the', 'no article'],
    focusWords: ['the', 'a', 'an'],
    focusPatterns: [
      'first_second_mention',
      'first_mention_indefinite',
      'second_mention_specific',
      'known_from_situation',
      'unique_object',
      'shared_world_object',
      'superlative_the',
      'only_the',
      'same_the',
      'general_meaning_no_the',
      'specific_plural_the',
      'specific_from_phrase_after_noun',
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
    start: 'diagnosis_training_article_the_specific_start',
    answer: 'diagnosis_training_article_the_specific_answer',
    mastery: 'diagnosis_training_article_the_specific_mastery',
    recovery: 'diagnosis_training_article_the_specific_recovery',
    onStart: 'diagnosis_training_started',
    onCorrect: 'diagnosis_training_answer_correct',
    onWrong: 'diagnosis_training_answer_wrong',
    onDepthIncrease: 'diagnosis_training_feedback_depth_increased',
    onGuidedMode: 'diagnosis_training_guided_mode_started',
    onMastery: 'diagnosis_training_mastered',
    onSmartTrainerOpen: 'diagnosis_training_smart_trainer_opened',
    payload: {
      category: 'article',
      microDiagnosisId: 'article_the_specific',
      contrastSet: ['a', 'an', 'the', 'no article'],
      logExactToken: true,
      logMistakeType: true,
      logExerciseId: true,
      logAttemptCount: true,
      logFeedbackDepth: true,
      logSpecificityType: true,
    },
  },
  routing: {
    diagnosisTrainerRoute: '/problem_coach?category=article&microDiagnosisId=article_the_specific',
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
