import type {
  EpisodeSourceDistractor,
  EpisodeSourcePhrase,
  EpisodeSourcePhraseLocalizedDetails,
} from './episode_01_source_v1';

type TrapType = NonNullable<EpisodeSourceDistractor['trapType']>;

type ManualDetailCopy = Readonly<{
  meaning: string;
  explanation: string;
  iPrompt: string;
  iLower: string;
  iLetterL: string;
  amPrompt: string;
  amAn: string;
  amM: string;
  lexicalPrompt: string;
  lexicalFirst: string;
  lexicalSecond: string;
}>;

/**
 * Structural packing only: every learner-facing sentence is supplied manually
 * in each locale below. This helper never creates or translates copy.
 */
function manualDetails(
  lexicalTarget: 'here' | 'ready',
  lexicalFirst: Readonly<{ value: string; trapType: TrapType }>,
  lexicalSecond: Readonly<{ value: string; trapType: TrapType }>,
  copy: ManualDetailCopy,
): EpisodeSourcePhraseLocalizedDetails {
  const iDistractors = [
    { value: 'i', reason: copy.iLower, trapType: 'orthographic' as const },
    { value: 'l', reason: copy.iLetterL, trapType: 'orthographic' as const },
  ];
  const amDistractors = [
    { value: 'an', reason: copy.amAn, trapType: 'phonetic' as const },
    { value: 'm', reason: copy.amM, trapType: 'orthographic' as const },
  ];
  const lexicalDistractors = [
    { value: lexicalFirst.value, reason: copy.lexicalFirst, trapType: lexicalFirst.trapType },
    { value: lexicalSecond.value, reason: copy.lexicalSecond, trapType: lexicalSecond.trapType },
  ];
  return {
    meaning: copy.meaning,
    explanation: copy.explanation,
    distractors: [...iDistractors, ...amDistractors, ...lexicalDistractors],
    words: [
      { correct: 'I', prompt: copy.iPrompt, distractors: iDistractors },
      { correct: 'am', prompt: copy.amPrompt, distractors: amDistractors },
      {
        correct: lexicalTarget,
        prompt: copy.lexicalPrompt,
        distractors: lexicalDistractors,
      },
    ],
  };
}

const I_WORD = {
  correct: 'I',
  category: 'pronoun',
  distractors: [
    {
      value: 'i',
      reasonCode: 'orthographic:i:lowercase_pronoun',
      trapType: 'orthographic',
      why: 'i похоже на I, но английское «я» всегда заглавное: в этой позиции нужна форма I.',
    },
    {
      value: 'l',
      reasonCode: 'orthographic:i:lowercase_l_shape',
      trapType: 'orthographic',
      why: 'l — строчная буква L без точки, а не местоимение I; говорящего здесь называет I.',
    },
  ],
} as const;

const AM_WORD = {
  correct: 'am',
  category: 'to-be',
  distractors: [
    {
      value: 'an',
      reasonCode: 'phonetic:am:final_n_instead_of_m',
      trapType: 'phonetic',
      why: 'an заканчивается звуком /n/, а связка am — звуком /m/; после I здесь нужна форма am.',
    },
    {
      value: 'm',
      reasonCode: 'orthographic:am:missing_initial_a',
      trapType: 'orthographic',
      why: 'm — только одна буква без начального a; английская связка пишется полностью: am.',
    },
  ],
} as const;

const HERE_WORD = {
  correct: 'here',
  category: 'place_adverb',
  distractors: [
    {
      value: 'hear',
      reasonCode: 'semantic_neighbor:here:homophone_hear',
      trapType: 'semantic_neighbor',
      why: 'hear может звучать как here, но означает «слышать»; место «здесь» обозначает here.',
    },
    {
      value: 'hair',
      reasonCode: 'phonetic:here:near_sound_hair',
      trapType: 'phonetic',
      why: 'hair похоже по звучанию, но означает «волосы»; для места говорящего нужна форма here.',
    },
  ],
} as const;

const READY_WORD = {
  correct: 'ready',
  category: 'state_adjective',
  distractors: [
    {
      value: 'really',
      reasonCode: 'phonetic:ready:near_sound_really',
      trapType: 'phonetic',
      why: 'really начинается похоже, но означает «действительно»; состояние готовности передаёт ready.',
    },
    {
      value: 'reading',
      reasonCode: 'orthographic:ready:shared_read_spelling',
      trapType: 'orthographic',
      why: 'reading похоже началом написания, но означает процесс чтения; «готов» передаёт ready.',
    },
  ],
} as const;

const HERE_LOCALIZED: NonNullable<EpisodeSourcePhrase['localizedDetails']> = {
  ru: manualDetails('here', { value: 'hear', trapType: 'semantic_neighbor' }, { value: 'hair', trapType: 'phonetic' }, {
    meaning: 'Я здесь',
    explanation: 'Так говорят, когда сообщают, что уже пришли или находятся в нужном месте. I называет говорящего, am создаёт обязательную английскую связь, а here указывает именно на его текущее место; русское «я здесь» обходится без отдельной связки.',
    iPrompt: 'Выберите английское «я», с которого начинается сообщение говорящего.',
    iLower: 'i выглядит почти как I, но местоимение «я» всегда заглавное; начало этой фразы требует I.',
    iLetterL: 'l — строчная буква L без точки, а не местоимение I; сообщающего о себе называет I.',
    amPrompt: 'Выберите связку, которая соединяет говорящего с его местом.',
    amAn: 'an оканчивается звуком /n/ и не создаёт связь; в I am here нужна связка am с финальным /m/.',
    amM: 'm сохраняет только последнюю букву и не является словом-связкой; в I am here пишется полное am.',
    lexicalPrompt: 'Выберите слово, которое указывает место говорящего: «здесь».',
    lexicalFirst: 'hear может звучать так же, как here, но означает «слышать»; значение места в I am here передаёт here.',
    lexicalSecond: 'hair похоже по звучанию, но означает «волосы»; в I am here место «здесь» обозначает here.',
  }),
  uk: manualDetails('here', { value: 'hear', trapType: 'semantic_neighbor' }, { value: 'hair', trapType: 'phonetic' }, {
    meaning: 'Я тут',
    explanation: 'Так кажуть, коли повідомляють, що вже прийшли або перебувають у потрібному місці. I називає мовця, am створює обов’язковий англійський зв’язок, а here вказує саме на його теперішнє місце; українське «я тут» обходиться без окремої зв’язки.',
    iPrompt: 'Оберіть англійське «я», з якого починається повідомлення мовця.',
    iLower: 'i майже схоже на I, але займенник «я» завжди великий; на початку цієї фрази потрібне I.',
    iLetterL: 'l — мала літера L без крапки, а не займенник I; людину, яка говорить про себе, називає I.',
    amPrompt: 'Оберіть зв’язку, яка поєднує мовця з його місцем.',
    amAn: 'an закінчується звуком /n/ і не створює зв’язку; в I am here потрібне am із кінцевим /m/.',
    amM: 'm зберігає лише останню літеру й не є словом-зв’язкою; в I am here пишеться повне am.',
    lexicalPrompt: 'Оберіть слово, яке вказує місце мовця: «тут».',
    lexicalFirst: 'hear може звучати так само, як here, але означає «чути»; значення місця в I am here передає here.',
    lexicalSecond: 'hair подібне за звучанням, але означає «волосся»; у I am here місце «тут» позначає here.',
  }),
  es: manualDetails('here', { value: 'hear', trapType: 'semantic_neighbor' }, { value: 'hair', trapType: 'phonetic' }, {
    meaning: 'Estoy aquí',
    explanation: 'Se usa para avisar que la persona que habla ya llegó o está en el lugar esperado. I muestra al hablante, am lo une de forma obligatoria con la información, y here señala su ubicación actual; el español reúne parte de esa estructura dentro de estoy.',
    iPrompt: 'Elige el «yo» inglés que abre el mensaje del hablante.',
    iLower: 'i se parece a I, pero el pronombre inglés siempre lleva mayúscula; esta frase debe empezar con I.',
    iLetterL: 'l es la letra L minúscula sin punto, no el pronombre I; quien habla se identifica con I.',
    amPrompt: 'Elige la unión que conecta al hablante con su ubicación.',
    amAn: 'an termina en /n/ y no funciona como unión; I am here necesita am, que termina en /m/.',
    amM: 'm conserva solo la letra final y no es una palabra de enlace; I am here escribe la forma completa am.',
    lexicalPrompt: 'Elige la palabra que señala la ubicación del hablante: «aquí».',
    lexicalFirst: 'hear puede sonar igual que here, pero significa «oír»; la ubicación de I am here se expresa con here.',
    lexicalSecond: 'hair suena parecido, pero significa «pelo»; en I am here, el sentido «aquí» corresponde a here.',
  }),
  'pt-BR': manualDetails('here', { value: 'hear', trapType: 'semantic_neighbor' }, { value: 'hair', trapType: 'phonetic' }, {
    meaning: 'Estou aqui',
    explanation: 'A frase serve para avisar que quem fala já chegou ou está no lugar esperado. I mostra o falante, am o liga obrigatoriamente à informação, e here aponta sua localização atual; em português, estou reúne parte dessa estrutura numa só forma.',
    iPrompt: 'Escolha o «eu» inglês que inicia a mensagem do falante.',
    iLower: 'i se parece com I, mas o pronome inglês sempre usa maiúscula; esta frase precisa começar com I.',
    iLetterL: 'l é a letra L minúscula sem ponto, não o pronome I; quem fala é identificado por I.',
    amPrompt: 'Escolha a ligação que conecta o falante à sua localização.',
    amAn: 'an termina em /n/ e não funciona como ligação; I am here precisa de am, que termina em /m/.',
    amM: 'm preserva só a letra final e não é uma palavra de ligação; I am here usa a forma completa am.',
    lexicalPrompt: 'Escolha a palavra que aponta a localização do falante: «aqui».',
    lexicalFirst: 'hear pode soar igual a here, mas significa «ouvir»; a localização em I am here é expressa por here.',
    lexicalSecond: 'hair soa parecido, mas significa «cabelo»; em I am here, o sentido de «aqui» pertence a here.',
  }),
  vi: manualDetails('here', { value: 'hear', trapType: 'semantic_neighbor' }, { value: 'hair', trapType: 'phonetic' }, {
    meaning: 'Tôi ở đây',
    explanation: 'Câu này dùng để báo rằng người nói đã đến hoặc đang ở đúng nơi cần có mặt. I gọi tên người nói, am tạo mối nối bắt buộc trong tiếng Anh, còn here chỉ vị trí hiện tại; tiếng Việt dùng “ở đây” theo một cấu trúc riêng.',
    iPrompt: 'Chọn từ tiếng Anh nghĩa là “tôi” để mở đầu lời báo của người nói.',
    iLower: 'i trông gần giống I, nhưng đại từ tiếng Anh luôn viết hoa; câu này phải bắt đầu bằng I.',
    iLetterL: 'l là chữ L thường không có dấu chấm, không phải đại từ I; người nói được gọi bằng I.',
    amPrompt: 'Chọn từ nối gắn người nói với vị trí của họ.',
    amAn: 'an kết thúc bằng /n/ và không làm từ nối; I am here cần am với âm cuối /m/.',
    amM: 'm chỉ giữ lại chữ cái cuối và không phải từ nối; trong I am here phải viết đầy đủ am.',
    lexicalPrompt: 'Chọn từ chỉ vị trí hiện tại của người nói: “ở đây”.',
    lexicalFirst: 'hear có thể nghe giống here nhưng nghĩa là “nghe”; vị trí trong I am here được diễn đạt bằng here.',
    lexicalSecond: 'hair nghe gần giống nhưng nghĩa là “tóc”; trong I am here, ý “ở đây” thuộc về here.',
  }),
  id: manualDetails('here', { value: 'hear', trapType: 'semantic_neighbor' }, { value: 'hair', trapType: 'phonetic' }, {
    meaning: 'Saya di sini',
    explanation: 'Kalimat ini dipakai untuk memberi tahu bahwa penutur sudah datang atau berada di tempat yang dimaksud. I menyebut penutur, am menjadi penghubung wajib dalam bahasa Inggris, dan here menunjuk lokasinya sekarang; bahasa Indonesia memakai susunan “saya di sini”.',
    iPrompt: 'Pilih kata Inggris untuk “saya” yang membuka pesan penutur.',
    iLower: 'i tampak hampir sama dengan I, tetapi pronomina Inggris selalu ditulis besar; kalimat ini harus diawali I.',
    iLetterL: 'l adalah huruf L kecil tanpa titik, bukan pronomina I; orang yang berbicara ditandai dengan I.',
    amPrompt: 'Pilih penghubung yang menyatukan penutur dengan lokasinya.',
    amAn: 'an berakhir dengan /n/ dan bukan penghubung; I am here membutuhkan am yang berakhir dengan /m/.',
    amM: 'm hanya menyisakan huruf terakhir dan bukan kata penghubung; I am here menulis bentuk lengkap am.',
    lexicalPrompt: 'Pilih kata yang menunjuk lokasi penutur sekarang: “di sini”.',
    lexicalFirst: 'hear dapat terdengar sama dengan here, tetapi berarti “mendengar”; lokasi dalam I am here dinyatakan oleh here.',
    lexicalSecond: 'hair terdengar mirip, tetapi berarti “rambut”; dalam I am here, arti “di sini” dinyatakan oleh here.',
  }),
  tr: manualDetails('here', { value: 'hear', trapType: 'semantic_neighbor' }, { value: 'hair', trapType: 'phonetic' }, {
    meaning: 'Buradayım',
    explanation: 'Bu söz, konuşanın geldiğini ya da beklenen yerde bulunduğunu bildirmek için kullanılır. I konuşan kişiyi adlandırır, am İngilizcede zorunlu bağlantıyı kurar, here ise şu anki yeri gösterir; Türkçe aynı bilgiyi “buradayım” ekli yapısında toplar.',
    iPrompt: 'Konuşanın bildirimini başlatan İngilizce “ben” sözcüğünü seçin.',
    iLower: 'i, I biçimine çok benzer ama İngilizce zamir her zaman büyük yazılır; bu söz I ile başlamalıdır.',
    iLetterL: 'l noktasız küçük L harfidir, I zamiri değildir; konuşan kişi I ile gösterilir.',
    amPrompt: 'Konuşan kişiyi bulunduğu yere bağlayan sözcüğü seçin.',
    amAn: 'an /n/ ile biter ve bağlantı kurmaz; I am here içinde sonu /m/ olan am gerekir.',
    amM: 'm yalnızca son harfi bırakır ve bir bağlantı sözcüğü değildir; I am here içinde tam am yazılır.',
    lexicalPrompt: 'Konuşanın bulunduğu yeri, yani “burada”yı gösteren sözcüğü seçin.',
    lexicalFirst: 'hear, here ile aynı duyulabilir ama “duymak” demektir; I am here içindeki yer anlamını here verir.',
    lexicalSecond: 'hair benzer duyulur ama “saç” demektir; I am here içinde “burada” anlamı here biçimindedir.',
  }),
  pl: manualDetails('here', { value: 'hear', trapType: 'semantic_neighbor' }, { value: 'hair', trapType: 'phonetic' }, {
    meaning: 'Jestem tutaj',
    explanation: 'Tego zdania używa się, aby powiedzieć, że osoba mówiąca już przyszła albo znajduje się we właściwym miejscu. I wskazuje mówiącego, am tworzy obowiązkowe angielskie połączenie, a here określa jego obecną lokalizację; polskie jestem zawiera część tej informacji.',
    iPrompt: 'Wybierz angielskie „ja”, które rozpoczyna wiadomość mówiącego.',
    iLower: 'i wygląda prawie jak I, lecz angielski zaimek zawsze jest wielki; to zdanie musi zaczynać się od I.',
    iLetterL: 'l jest małą literą L bez kropki, a nie zaimkiem I; osobę mówiącą wskazuje I.',
    amPrompt: 'Wybierz łącznik, który wiąże mówiącego z jego miejscem.',
    amAn: 'an kończy się /n/ i nie jest łącznikiem; I am here wymaga am zakończonego dźwiękiem /m/.',
    amM: 'm zachowuje tylko ostatnią literę i nie jest słowem łączącym; I am here zawiera pełne am.',
    lexicalPrompt: 'Wybierz słowo wskazujące obecną lokalizację mówiącego: „tutaj”.',
    lexicalFirst: 'hear może brzmieć tak samo jak here, ale znaczy „słyszeć”; miejsce w I am here wyraża here.',
    lexicalSecond: 'hair brzmi podobnie, ale znaczy „włosy”; w I am here znaczenie „tutaj” ma forma here.',
  }),
};

const READY_LOCALIZED: NonNullable<EpisodeSourcePhrase['localizedDetails']> = {
  ru: manualDetails('ready', { value: 'really', trapType: 'phonetic' }, { value: 'reading', trapType: 'orthographic' }, {
    meaning: 'Я готов / Я готова',
    explanation: 'Так отвечают, когда можно начинать встречу, поездку или другую договорённую часть дела. I называет говорящего, am соединяет его с состоянием, а ready сообщает именно о готовности; русское окончание рода в английское ready не переносится.',
    iPrompt: 'Выберите английское «я», которое называет готового говорящего.',
    iLower: 'i похоже на I, но местоимение «я» всегда заглавное; фраза о своей готовности начинается с I.',
    iLetterL: 'l — строчная буква L без точки, а не местоимение I; готового говорящего здесь называет I.',
    amPrompt: 'Выберите связку между говорящим и его состоянием готовности.',
    amAn: 'an заканчивается звуком /n/ и не связывает части; в I am ready нужна связка am с финальным /m/.',
    amM: 'm — отдельная буква без начального a, поэтому она не заменяет связку am в I am ready.',
    lexicalPrompt: 'Выберите слово, которое сообщает: «готов / готова».',
    lexicalFirst: 'really означает «действительно», а не состояние готовности; в I am ready значение «готов» передаёт ready.',
    lexicalSecond: 'reading означает процесс чтения, а не готовность; в I am ready нужное состояние выражает ready.',
  }),
  uk: manualDetails('ready', { value: 'really', trapType: 'phonetic' }, { value: 'reading', trapType: 'orthographic' }, {
    meaning: 'Я готовий / Я готова',
    explanation: 'Так відповідають, коли вже можна починати зустріч, поїздку чи іншу домовлену справу. I називає мовця, am поєднує його зі станом, а ready повідомляє саме про готовність; українське родове закінчення до англійського ready не переходить.',
    iPrompt: 'Оберіть англійське «я», яке називає готового мовця.',
    iLower: 'i схоже на I, але займенник «я» завжди великий; вислів про власну готовність починається з I.',
    iLetterL: 'l — мала літера L без крапки, а не займенник I; готового мовця тут називає I.',
    amPrompt: 'Оберіть зв’язку між мовцем і його станом готовності.',
    amAn: 'an закінчується звуком /n/ і не поєднує частини; у I am ready потрібне am із кінцевим /m/.',
    amM: 'm — окрема літера без початкової a, тому вона не замінює зв’язку am у I am ready.',
    lexicalPrompt: 'Оберіть слово, яке повідомляє: «готовий / готова».',
    lexicalFirst: 'really означає «справді», а не стан готовності; у I am ready значення «готовий» передає ready.',
    lexicalSecond: 'reading означає процес читання, а не готовність; у I am ready потрібний стан виражає ready.',
  }),
  es: manualDetails('ready', { value: 'really', trapType: 'phonetic' }, { value: 'reading', trapType: 'orthographic' }, {
    meaning: 'Estoy listo / Estoy lista',
    explanation: 'Se dice cuando ya se puede comenzar una reunión, un viaje o cualquier acción acordada. I identifica a quien habla, am lo conecta con su estado y ready expresa disponibilidad para empezar; ready no cambia entre masculino y femenino como listo o lista.',
    iPrompt: 'Elige el «yo» inglés que identifica a la persona preparada.',
    iLower: 'i se parece a I, pero el pronombre inglés siempre lleva mayúscula; la frase sobre uno mismo empieza con I.',
    iLetterL: 'l es la letra L minúscula sin punto, no el pronombre I; la persona preparada se identifica con I.',
    amPrompt: 'Elige la unión entre la persona y su estado de preparación.',
    amAn: 'an termina en /n/ y no une las partes; I am ready necesita am, que termina en /m/.',
    amM: 'm es una letra aislada sin la a inicial, por lo que no sustituye a am dentro de I am ready.',
    lexicalPrompt: 'Elige la palabra que expresa «listo / lista para empezar».',
    lexicalFirst: 'really significa «realmente», no estar preparado; en I am ready, el estado «listo» lo expresa ready.',
    lexicalSecond: 'reading significa la actividad de leer, no preparación; en I am ready, el estado necesario es ready.',
  }),
  'pt-BR': manualDetails('ready', { value: 'really', trapType: 'phonetic' }, { value: 'reading', trapType: 'orthographic' }, {
    meaning: 'Estou pronto / Estou pronta',
    explanation: 'A frase é usada quando já se pode começar uma reunião, uma viagem ou outra ação combinada. I identifica quem fala, am liga essa pessoa ao estado, e ready comunica disponibilidade para começar; ready não muda entre pronto e pronta.',
    iPrompt: 'Escolha o «eu» inglês que identifica a pessoa preparada.',
    iLower: 'i se parece com I, mas o pronome inglês sempre usa maiúscula; a frase sobre a própria prontidão começa com I.',
    iLetterL: 'l é a letra L minúscula sem ponto, não o pronome I; a pessoa preparada é indicada por I.',
    amPrompt: 'Escolha a ligação entre a pessoa e seu estado de prontidão.',
    amAn: 'an termina em /n/ e não liga as partes; I am ready precisa de am, que termina em /m/.',
    amM: 'm é uma letra isolada sem a inicial a, por isso não substitui am dentro de I am ready.',
    lexicalPrompt: 'Escolha a palavra que expressa «pronto / pronta para começar».',
    lexicalFirst: 'really significa «realmente», não estar pronto; em I am ready, o estado de prontidão é expresso por ready.',
    lexicalSecond: 'reading significa a atividade de ler, não prontidão; em I am ready, o estado necessário é ready.',
  }),
  vi: manualDetails('ready', { value: 'really', trapType: 'phonetic' }, { value: 'reading', trapType: 'orthographic' }, {
    meaning: 'Tôi sẵn sàng',
    explanation: 'Câu này dùng khi cuộc gặp, chuyến đi hoặc việc đã hẹn có thể bắt đầu ngay. I gọi tên người nói, am nối người ấy với trạng thái, còn ready cho biết họ đã sẵn sàng; tiếng Anh không đổi ready theo giới tính của người nói.',
    iPrompt: 'Chọn từ tiếng Anh nghĩa là “tôi” để gọi người đã sẵn sàng.',
    iLower: 'i trông giống I, nhưng đại từ tiếng Anh luôn viết hoa; lời nói về sự sẵn sàng phải bắt đầu bằng I.',
    iLetterL: 'l là chữ L thường không có dấu chấm, không phải đại từ I; người đã sẵn sàng được gọi bằng I.',
    amPrompt: 'Chọn từ nối giữa người nói và trạng thái sẵn sàng.',
    amAn: 'an kết thúc bằng /n/ và không nối hai phần; I am ready cần am với âm cuối /m/.',
    amM: 'm chỉ là một chữ cái thiếu a ở đầu, nên không thể thay cho am trong I am ready.',
    lexicalPrompt: 'Chọn từ diễn tả trạng thái “sẵn sàng bắt đầu”.',
    lexicalFirst: 'really nghĩa là “thực sự”, không phải trạng thái sẵn sàng; trong I am ready, ý đó thuộc về ready.',
    lexicalSecond: 'reading nghĩa là hoạt động đọc, không phải sự sẵn sàng; trong I am ready, trạng thái đúng là ready.',
  }),
  id: manualDetails('ready', { value: 'really', trapType: 'phonetic' }, { value: 'reading', trapType: 'orthographic' }, {
    meaning: 'Saya siap',
    explanation: 'Kalimat ini dipakai ketika pertemuan, perjalanan, atau kegiatan yang disepakati sudah dapat dimulai. I menyebut penutur, am menghubungkannya dengan keadaan, dan ready menyatakan kesiapan untuk mulai; ready tidak berubah menurut gender penutur.',
    iPrompt: 'Pilih kata Inggris untuk “saya” yang menyebut orang yang siap.',
    iLower: 'i tampak seperti I, tetapi pronomina Inggris selalu ditulis besar; pernyataan tentang kesiapan dimulai dengan I.',
    iLetterL: 'l adalah huruf L kecil tanpa titik, bukan pronomina I; orang yang siap disebut dengan I.',
    amPrompt: 'Pilih penghubung antara penutur dan keadaan siapnya.',
    amAn: 'an berakhir dengan /n/ dan tidak menghubungkan dua bagian; I am ready memerlukan am yang berakhir /m/.',
    amM: 'm hanyalah satu huruf tanpa a di awal, sehingga tidak dapat menggantikan am dalam I am ready.',
    lexicalPrompt: 'Pilih kata yang menyatakan keadaan “siap untuk mulai”.',
    lexicalFirst: 'really berarti “sungguh”, bukan keadaan siap; dalam I am ready, makna kesiapan diberikan oleh ready.',
    lexicalSecond: 'reading berarti kegiatan membaca, bukan kesiapan; dalam I am ready, keadaan yang benar ialah ready.',
  }),
  tr: manualDetails('ready', { value: 'really', trapType: 'phonetic' }, { value: 'reading', trapType: 'orthographic' }, {
    meaning: 'Hazırım',
    explanation: 'Bu söz, toplantı, yolculuk ya da kararlaştırılmış başka bir iş başlayabileceği zaman kullanılır. I konuşan kişiyi adlandırır, am onu duruma bağlar, ready ise başlamaya hazır olduğunu bildirir; İngilizce ready konuşanın cinsiyetine göre değişmez.',
    iPrompt: 'Hazır olan kişiyi gösteren İngilizce “ben” sözcüğünü seçin.',
    iLower: 'i, I biçimine benzer ama İngilizce zamir her zaman büyük yazılır; kişinin hazır olduğunu bildiren söz I ile başlar.',
    iLetterL: 'l noktasız küçük L harfidir, I zamiri değildir; hazır olan konuşan kişi I ile gösterilir.',
    amPrompt: 'Konuşan kişiyle hazır olma durumunu bağlayan sözcüğü seçin.',
    amAn: 'an /n/ ile biter ve iki parçayı bağlamaz; I am ready içinde sonu /m/ olan am gerekir.',
    amM: 'm başındaki a olmadan tek harftir; bu nedenle I am ready içindeki am sözcüğünün yerini tutmaz.',
    lexicalPrompt: '“Başlamaya hazır” durumunu anlatan sözcüğü seçin.',
    lexicalFirst: 'really “gerçekten” demektir, hazır olma durumu değildir; I am ready içinde bu durumu ready verir.',
    lexicalSecond: 'reading okuma eylemini anlatır, hazır olmayı değil; I am ready içindeki doğru durum ready olur.',
  }),
  pl: manualDetails('ready', { value: 'really', trapType: 'phonetic' }, { value: 'reading', trapType: 'orthographic' }, {
    meaning: 'Jestem gotowy / Jestem gotowa',
    explanation: 'Tego zdania używa się, gdy można już rozpocząć spotkanie, podróż albo inną uzgodnioną czynność. I wskazuje osobę mówiącą, am łączy ją ze stanem, a ready oznacza gotowość do rozpoczęcia; angielskie ready nie zmienia się przez rodzaj.',
    iPrompt: 'Wybierz angielskie „ja”, które wskazuje gotową osobę mówiącą.',
    iLower: 'i wygląda jak I, lecz angielski zaimek zawsze jest wielki; wypowiedź o własnej gotowości zaczyna się od I.',
    iLetterL: 'l jest małą literą L bez kropki, a nie zaimkiem I; gotową osobę mówiącą wskazuje I.',
    amPrompt: 'Wybierz łącznik między mówiącym a jego stanem gotowości.',
    amAn: 'an kończy się /n/ i nie łączy obu części; I am ready wymaga am zakończonego dźwiękiem /m/.',
    amM: 'm jest pojedynczą literą bez początkowego a, więc nie zastępuje am w I am ready.',
    lexicalPrompt: 'Wybierz słowo oznaczające stan „gotowy / gotowa do rozpoczęcia”.',
    lexicalFirst: 'really znaczy „naprawdę”, a nie gotowość; w I am ready stan „gotowy” wyraża ready.',
    lexicalSecond: 'reading oznacza czynność czytania, a nie gotowość; w I am ready właściwy stan wyraża ready.',
  }),
};

export const EPISODE_01_SESSION_01_WORD_FIRST_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze([
  {
    id: 'e01-s01-word-first-i-am-here',
    english: 'I am here',
    russian: 'Я здесь',
    explanation: HERE_LOCALIZED.ru!.explanation,
    words: [I_WORD, AM_WORD, HERE_WORD],
    localizedDetails: HERE_LOCALIZED,
    features: ['copula_be', 'first_person_singular', 'adverb_place'],
  },
  {
    id: 'e01-s01-word-first-i-am-ready',
    english: 'I am ready',
    russian: 'Я готов / Я готова',
    explanation: READY_LOCALIZED.ru!.explanation,
    words: [I_WORD, AM_WORD, READY_WORD],
    localizedDetails: READY_LOCALIZED,
    features: ['copula_be', 'first_person_singular', 'state_adjective'],
  },
]);
