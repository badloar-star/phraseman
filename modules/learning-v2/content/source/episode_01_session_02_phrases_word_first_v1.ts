import type {
  EpisodeSourceDistractor,
  EpisodeSourcePhrase,
  EpisodeSourcePhraseLocalizedDetails,
} from './episode_01_source_v1';

type TrapType = NonNullable<EpisodeSourceDistractor['trapType']>;
type Copy = Readonly<{
  meaning: string; explanation: string;
  iPrompt: string; iLower: string; iLetterL: string;
  amPrompt: string; amAn: string; amM: string;
  notPrompt: string; notFirst: string; notSecond: string;
  lexicalPrompt: string; lexicalFirst: string; lexicalSecond: string;
}>;

function details(
  lexicalTarget: 'here' | 'ready',
  notTraps: readonly [Readonly<{ value: string; trapType: TrapType }>, Readonly<{ value: string; trapType: TrapType }>],
  lexicalTraps: readonly [Readonly<{ value: string; trapType: TrapType }>, Readonly<{ value: string; trapType: TrapType }>],
  copy: Copy,
): EpisodeSourcePhraseLocalizedDetails {
  const iDistractors = [
    { value: 'i', reason: copy.iLower, trapType: 'orthographic' as const },
    { value: 'l', reason: copy.iLetterL, trapType: 'orthographic' as const },
  ];
  const amDistractors = [
    { value: 'an', reason: copy.amAn, trapType: 'phonetic' as const },
    { value: 'm', reason: copy.amM, trapType: 'orthographic' as const },
  ];
  const notDistractors = [
    { value: notTraps[0].value, reason: copy.notFirst, trapType: notTraps[0].trapType },
    { value: notTraps[1].value, reason: copy.notSecond, trapType: notTraps[1].trapType },
  ];
  const lexicalDistractors = [
    { value: lexicalTraps[0].value, reason: copy.lexicalFirst, trapType: lexicalTraps[0].trapType },
    { value: lexicalTraps[1].value, reason: copy.lexicalSecond, trapType: lexicalTraps[1].trapType },
  ];
  return {
    meaning: copy.meaning,
    explanation: copy.explanation,
    distractors: [...iDistractors, ...amDistractors, ...notDistractors, ...lexicalDistractors],
    words: [
      { correct: 'I', prompt: copy.iPrompt, distractors: iDistractors },
      { correct: 'am', prompt: copy.amPrompt, distractors: amDistractors },
      { correct: 'not', prompt: copy.notPrompt, distractors: notDistractors },
      { correct: lexicalTarget, prompt: copy.lexicalPrompt, distractors: lexicalDistractors },
    ],
  };
}

const I_WORD = {
  correct: 'I', category: 'pronoun',
  distractors: [
    { value: 'i', reasonCode: 'orthographic:I:lowercase_pronoun', trapType: 'orthographic', why: 'i похоже на I, но английское местоимение «я» всегда пишется заглавной I.' },
    { value: 'l', reasonCode: 'orthographic:I:lowercase_l_shape', trapType: 'orthographic', why: 'l — строчная L без точки, а не местоимение I, которое называет говорящего.' },
  ],
} as const;
const AM_WORD = {
  correct: 'am', category: 'to-be',
  distractors: [
    { value: 'an', reasonCode: 'phonetic:am:final_n_instead_of_m', trapType: 'phonetic', why: 'an заканчивается /n/ и не является связкой; после I нужна форма am с финальным /m/.' },
    { value: 'm', reasonCode: 'orthographic:am:missing_initial_a', trapType: 'orthographic', why: 'm — одна буква без начальной a; связка после I пишется полностью: am.' },
  ],
} as const;
const NOT_HERE_WORD = {
  correct: 'not', category: 'negation',
  distractors: [
    { value: 'no', reasonCode: 'orthographic:not:missing_final_t', trapType: 'orthographic', why: 'no теряет конечную t и не занимает место отрицания внутри I am not here.' },
    { value: 'note', reasonCode: 'orthographic:not:extra_final_e', trapType: 'orthographic', why: 'note добавляет e и означает «заметка»; отрицание во фразе пишется not.' },
  ],
} as const;
const NOT_READY_WORD = {
  correct: 'not', category: 'negation',
  distractors: [
    { value: 'no', reasonCode: 'orthographic:not:missing_final_t', trapType: 'orthographic', why: 'no не имеет конечной t; перед ready отрицание пишется полной формой not.' },
    { value: 'now', reasonCode: 'phonetic:not:diphthong_instead_of_t', trapType: 'phonetic', why: 'now означает «сейчас» и заканчивается /aʊ/; отрицание перед ready — not с конечной /t/.' },
  ],
} as const;
const HERE_WORD = {
  correct: 'here', category: 'place_adverb',
  distractors: [
    { value: 'hear', reasonCode: 'semantic_neighbor:here:homophone_hear', trapType: 'semantic_neighbor', why: 'hear означает «слышать»; место «здесь» после отрицания всё равно обозначает here.' },
    { value: 'hair', reasonCode: 'phonetic:here:near_sound_hair', trapType: 'phonetic', why: 'hair означает «волосы»; значение места в I am not here передаёт here.' },
  ],
} as const;
const READY_WORD = {
  correct: 'ready', category: 'state_adjective',
  distractors: [
    { value: 'really', reasonCode: 'phonetic:ready:near_sound_really', trapType: 'phonetic', why: 'really означает «действительно»; состояние, которое отрицается, называется ready.' },
    { value: 'reading', reasonCode: 'orthographic:ready:shared_read_spelling', trapType: 'orthographic', why: 'reading означает чтение; после not состояние готовности выражает ready.' },
  ],
} as const;

const HERE_NOT = [{ value: 'no', trapType: 'orthographic' }, { value: 'note', trapType: 'orthographic' }] as const;
const READY_NOT = [{ value: 'no', trapType: 'orthographic' }, { value: 'now', trapType: 'phonetic' }] as const;
const HERE_TRAPS = [{ value: 'hear', trapType: 'semantic_neighbor' }, { value: 'hair', trapType: 'phonetic' }] as const;
const READY_TRAPS = [{ value: 'really', trapType: 'phonetic' }, { value: 'reading', trapType: 'orthographic' }] as const;

const HERE_LOCALIZED: NonNullable<EpisodeSourcePhrase['localizedDetails']> = {
  ru: details('here', HERE_NOT, HERE_TRAPS, {
    meaning: 'Меня здесь нет / Я не здесь', explanation: 'Так прямо сообщают, что говорящий находится в другом месте. I называет человека, am держит английскую связь, not отрицает присутствие, а here указывает место «здесь».',
    iPrompt: 'Выберите английское «я» для человека, которого здесь нет.', iLower: 'i выглядит похоже, но местоимение «я» всегда заглавное; сообщение начинается с I.', iLetterL: 'l — строчная L, а не местоимение; отсутствующего говорящего называет I.',
    amPrompt: 'Выберите связку, которая остаётся между I и отрицанием.', amAn: 'an заканчивается /n/ и не связывает части; в I am not here остаётся am.', amM: 'm — только последняя буква; перед not нужна полная связка am.',
    notPrompt: 'Выберите слово, которое отрицает присутствие здесь.', notFirst: 'no не имеет конечной t и обычно отвечает «нет» отдельно; внутри I am not here нужно not.', notSecond: 'note означает «заметка» и содержит лишнюю e; отрицание присутствия пишется not.',
    lexicalPrompt: 'Выберите слово места со значением «здесь».', lexicalFirst: 'hear означает «слышать»; после not место «здесь» всё равно передаёт here.', lexicalSecond: 'hair означает «волосы»; в I am not here последним стоит место here.',
  }),
  uk: details('here', HERE_NOT, HERE_TRAPS, {
    meaning: 'Мене тут немає / Я не тут', explanation: 'Так прямо повідомляють, що мовець перебуває в іншому місці. I називає людину, am зберігає англійський зв’язок, not заперечує присутність, а here вказує місце «тут».',
    iPrompt: 'Оберіть англійське «я» для людини, якої тут немає.', iLower: 'i виглядає схоже, але займенник «я» завжди великий; повідомлення починається з I.', iLetterL: 'l — мала L, а не займенник; відсутнього мовця називає I.',
    amPrompt: 'Оберіть зв’язку, яка залишається між I та запереченням.', amAn: 'an закінчується /n/ і не поєднує частини; у I am not here залишається am.', amM: 'm — лише остання літера; перед not потрібна повна зв’язка am.',
    notPrompt: 'Оберіть слово, яке заперечує присутність тут.', notFirst: 'no не має кінцевої t й зазвичай окремо відповідає «ні»; у I am not here потрібне not.', notSecond: 'note означає «нотатка» й містить зайву e; заперечення присутності пишеться not.',
    lexicalPrompt: 'Оберіть слово місця зі значенням «тут».', lexicalFirst: 'hear означає «чути»; після not місце «тут» однаково передає here.', lexicalSecond: 'hair означає «волосся»; у I am not here останнім стоїть місце here.',
  }),
  es: details('here', HERE_NOT, HERE_TRAPS, {
    meaning: 'No estoy aquí', explanation: 'Se usa para decir de forma directa que quien habla está en otro lugar. I identifica al hablante, am mantiene el enlace inglés, not niega su presencia y here señala el lugar «aquí».',
    iPrompt: 'Elige el «yo» inglés para la persona que no está aquí.', iLower: 'i se parece, pero el pronombre «yo» siempre lleva mayúscula; el mensaje empieza con I.', iLetterL: 'l es una L minúscula, no el pronombre; al hablante ausente lo identifica I.',
    amPrompt: 'Elige el enlace que permanece entre I y la negación.', amAn: 'an termina en /n/ y no enlaza las partes; I am not here conserva am.', amM: 'm es solo la última letra; antes de not se necesita la forma completa am.',
    notPrompt: 'Elige la palabra que niega la presencia en este lugar.', notFirst: 'no no tiene la t final y suele ser una respuesta independiente; dentro de I am not here corresponde not.', notSecond: 'note significa «nota» y añade una e; la negación de la presencia se escribe not.',
    lexicalPrompt: 'Elige la palabra de lugar que significa «aquí».', lexicalFirst: 'hear significa «oír»; después de not, el lugar «aquí» sigue siendo here.', lexicalSecond: 'hair significa «pelo»; I am not here termina con el lugar here.',
  }),
  'pt-BR': details('here', HERE_NOT, HERE_TRAPS, {
    meaning: 'Não estou aqui', explanation: 'A frase informa diretamente que quem fala está em outro lugar. I identifica o falante, am mantém a ligação inglesa, not nega a presença e here aponta o lugar «aqui».',
    iPrompt: 'Escolha o «eu» inglês para a pessoa que não está aqui.', iLower: 'i se parece, mas o pronome «eu» sempre usa maiúscula; a mensagem começa com I.', iLetterL: 'l é um L minúsculo, não o pronome; o falante ausente é indicado por I.',
    amPrompt: 'Escolha a ligação que permanece entre I e a negação.', amAn: 'an termina em /n/ e não liga as partes; I am not here mantém am.', amM: 'm é só a última letra; antes de not é necessária a forma completa am.',
    notPrompt: 'Escolha a palavra que nega a presença neste lugar.', notFirst: 'no não tem o t final e costuma ser uma resposta independente; dentro de I am not here cabe not.', notSecond: 'note significa «nota» e acrescenta um e; a negação da presença se escreve not.',
    lexicalPrompt: 'Escolha a palavra de lugar que significa «aqui».', lexicalFirst: 'hear significa «ouvir»; depois de not, o lugar «aqui» continua sendo here.', lexicalSecond: 'hair significa «cabelo»; I am not here termina com o lugar here.',
  }),
  vi: details('here', HERE_NOT, HERE_TRAPS, {
    meaning: 'Tôi không ở đây', explanation: 'Câu này báo trực tiếp rằng người nói đang ở nơi khác. I gọi tên người nói, am giữ mối nối bắt buộc, not phủ định sự có mặt, còn here chỉ nơi “ở đây”.',
    iPrompt: 'Chọn từ tiếng Anh nghĩa là “tôi” cho người không có mặt ở đây.', iLower: 'i trông giống nhưng đại từ “tôi” luôn viết hoa; thông báo phải bắt đầu bằng I.', iLetterL: 'l là chữ L thường, không phải đại từ; người nói vắng mặt được gọi bằng I.',
    amPrompt: 'Chọn từ nối vẫn đứng giữa I và từ phủ định.', amAn: 'an kết thúc bằng /n/ và không nối hai phần; I am not here vẫn cần am.', amM: 'm chỉ là chữ cuối; trước not phải dùng đầy đủ am.',
    notPrompt: 'Chọn từ phủ định sự có mặt ở đây.', notFirst: 'no thiếu t ở cuối và thường là câu trả lời độc lập; trong I am not here phải dùng not.', notSecond: 'note nghĩa là “ghi chú” và có thêm e; từ phủ định được viết là not.',
    lexicalPrompt: 'Chọn từ chỉ nơi có nghĩa là “ở đây”.', lexicalFirst: 'hear nghĩa là “nghe”; sau not, nơi “ở đây” vẫn là here.', lexicalSecond: 'hair nghĩa là “tóc”; I am not here kết thúc bằng từ chỉ nơi here.',
  }),
  id: details('here', HERE_NOT, HERE_TRAPS, {
    meaning: 'Saya tidak di sini', explanation: 'Kalimat ini langsung memberi tahu bahwa penutur berada di tempat lain. I menyebut penutur, am mempertahankan penghubung Inggris, not menyangkal keberadaan, dan here menunjuk tempat “di sini”.',
    iPrompt: 'Pilih kata Inggris untuk “saya” bagi orang yang tidak berada di sini.', iLower: 'i tampak mirip, tetapi pronomina “saya” selalu ditulis besar; pesan dimulai dengan I.', iLetterL: 'l adalah huruf L kecil, bukan pronomina; penutur yang tidak hadir ditandai I.',
    amPrompt: 'Pilih penghubung yang tetap berada antara I dan negasi.', amAn: 'an berakhir /n/ dan tidak menghubungkan bagian; I am not here tetap memakai am.', amM: 'm hanyalah huruf terakhir; sebelum not diperlukan bentuk lengkap am.',
    notPrompt: 'Pilih kata yang menyangkal keberadaan di tempat ini.', notFirst: 'no tidak memiliki t terakhir dan biasanya menjadi jawaban mandiri; dalam I am not here diperlukan not.', notSecond: 'note berarti “catatan” dan menambah e; negasi keberadaan ditulis not.',
    lexicalPrompt: 'Pilih kata tempat yang berarti “di sini”.', lexicalFirst: 'hear berarti “mendengar”; setelah not, tempat “di sini” tetap dinyatakan here.', lexicalSecond: 'hair berarti “rambut”; I am not here berakhir dengan kata tempat here.',
  }),
  tr: details('here', HERE_NOT, HERE_TRAPS, {
    meaning: 'Burada değilim', explanation: 'Bu söz, konuşanın başka bir yerde olduğunu doğrudan bildirir. I konuşanı gösterir, am İngilizce bağlantıyı korur, not bulunmayı olumsuz yapar, here ise “burada” yerini gösterir.',
    iPrompt: 'Burada olmayan kişi için İngilizce “ben” sözcüğünü seçin.', iLower: 'i benzer görünür ama “ben” zamiri her zaman büyük yazılır; bildirim I ile başlar.', iLetterL: 'l küçük L harfidir, zamir değildir; bulunmayan konuşanı I gösterir.',
    amPrompt: 'I ile olumsuzluk arasında kalan bağlantıyı seçin.', amAn: 'an /n/ ile biter ve parçaları bağlamaz; I am not here içinde am kalır.', amM: 'm yalnızca son harftir; not öncesinde tam am gerekir.',
    notPrompt: 'Burada bulunmayı olumsuz yapan sözcüğü seçin.', notFirst: 'no son t harfini taşımaz ve genelde bağımsız “hayır” cevabıdır; I am not here içinde not gerekir.', notSecond: 'note “not/nota” demektir ve fazladan e taşır; bulunmama anlamı not yazılır.',
    lexicalPrompt: '“Burada” anlamındaki yer sözcüğünü seçin.', lexicalFirst: 'hear “duymak” demektir; not sonrasında “burada” anlamı yine here olur.', lexicalSecond: 'hair “saç” demektir; I am not here yer bildiren here ile biter.',
  }),
  pl: details('here', HERE_NOT, HERE_TRAPS, {
    meaning: 'Nie ma mnie tutaj / Nie jestem tutaj', explanation: 'Tak bezpośrednio mówi się, że osoba mówiąca znajduje się gdzie indziej. I wskazuje mówiącego, am zachowuje angielski łącznik, not neguje obecność, a here oznacza miejsce „tutaj”.',
    iPrompt: 'Wybierz angielskie „ja” dla osoby, której tutaj nie ma.', iLower: 'i wygląda podobnie, ale zaimek „ja” zawsze jest wielki; wiadomość zaczyna się od I.', iLetterL: 'l jest małą literą L, a nie zaimkiem; nieobecnego mówiącego wskazuje I.',
    amPrompt: 'Wybierz łącznik, który pozostaje między I a przeczeniem.', amAn: 'an kończy się /n/ i nie łączy części; I am not here zachowuje am.', amM: 'm jest tylko ostatnią literą; przed not potrzebna jest pełna forma am.',
    notPrompt: 'Wybierz słowo, które neguje obecność w tym miejscu.', notFirst: 'no nie ma końcowego t i zwykle jest samodzielną odpowiedzią; wewnątrz I am not here potrzebne jest not.', notSecond: 'note znaczy „notatka” i dodaje e; przeczenie obecności zapisuje się not.',
    lexicalPrompt: 'Wybierz słowo miejsca oznaczające „tutaj”.', lexicalFirst: 'hear znaczy „słyszeć”; po not miejsce „tutaj” nadal wyraża here.', lexicalSecond: 'hair znaczy „włosy”; I am not here kończy się określeniem miejsca here.',
  }),
};

const READY_LOCALIZED: NonNullable<EpisodeSourcePhrase['localizedDetails']> = {
  ru: details('ready', READY_NOT, READY_TRAPS, {
    meaning: 'Я не готов / Я не готова', explanation: 'Так честно отвечают, когда начинать ещё нельзя. I называет говорящего, am связывает его с состоянием, not отменяет готовность, а ready называет именно это состояние.',
    iPrompt: 'Выберите английское «я» для человека, который ещё не готов.', iLower: 'i похоже на местоимение, но английское «я» всегда заглавное; ответ начинается с I.', iLetterL: 'l — строчная L, а не слово «я»; говорящего в ответе называет I.',
    amPrompt: 'Выберите связку между говорящим и отрицанием готовности.', amAn: 'an заканчивается /n/ и не является связкой; I am not ready требует am.', amM: 'm теряет начальную a и перестаёт быть словом; перед not нужно полное am.',
    notPrompt: 'Выберите слово, которое отменяет состояние готовности.', notFirst: 'no не имеет конечной t и не встраивается сюда вместо отрицания; нужно not.', notSecond: 'now означает «сейчас», а не «не»; отсутствие готовности передаёт not.',
    lexicalPrompt: 'Выберите состояние, которое отрицается: «готов».', lexicalFirst: 'really означает «действительно»; в I am not ready отрицается состояние ready.', lexicalSecond: 'reading означает чтение; после not состояние готовности называется ready.',
  }),
  uk: details('ready', READY_NOT, READY_TRAPS, {
    meaning: 'Я не готовий / Я не готова', explanation: 'Так чесно відповідають, коли починати ще не можна. I називає мовця, am пов’язує його зі станом, not заперечує готовність, а ready називає саме цей стан.',
    iPrompt: 'Оберіть англійське «я» для людини, яка ще не готова.', iLower: 'i схоже на займенник, але англійське «я» завжди велике; відповідь починається з I.', iLetterL: 'l — мала L, а не слово «я»; мовця у відповіді називає I.',
    amPrompt: 'Оберіть зв’язку між мовцем і запереченням готовності.', amAn: 'an закінчується /n/ і не є зв’язкою; I am not ready потребує am.', amM: 'm втрачає початкову a й перестає бути словом; перед not потрібне повне am.',
    notPrompt: 'Оберіть слово, яке заперечує стан готовності.', notFirst: 'no не має кінцевої t й не стає тут запереченням; потрібне not.', notSecond: 'now означає «зараз», а не «не»; відсутність готовності передає not.',
    lexicalPrompt: 'Оберіть стан, який заперечується: «готовий».', lexicalFirst: 'really означає «справді»; у I am not ready заперечується стан ready.', lexicalSecond: 'reading означає читання; після not стан готовності називається ready.',
  }),
  es: details('ready', READY_NOT, READY_TRAPS, {
    meaning: 'No estoy listo / No estoy lista', explanation: 'Se responde así con sinceridad cuando todavía no se puede empezar. I identifica al hablante, am lo conecta con su estado, not niega la preparación y ready nombra ese estado.',
    iPrompt: 'Elige el «yo» inglés para la persona que aún no está preparada.', iLower: 'i se parece al pronombre, pero el «yo» inglés siempre lleva mayúscula; la respuesta empieza con I.', iLetterL: 'l es una L minúscula, no la palabra «yo»; al hablante lo identifica I.',
    amPrompt: 'Elige el enlace entre el hablante y la negación de su preparación.', amAn: 'an termina en /n/ y no funciona como enlace; I am not ready necesita am.', amM: 'm pierde la a inicial y deja de ser una palabra; antes de not se necesita am completo.',
    notPrompt: 'Elige la palabra que niega el estado de preparación.', notFirst: 'no no tiene la t final y no sustituye aquí a la negación; se necesita not.', notSecond: 'now significa «ahora», no «no»; la falta de preparación se expresa con not.',
    lexicalPrompt: 'Elige el estado que se niega: «listo/lista».', lexicalFirst: 'really significa «realmente»; I am not ready niega el estado ready.', lexicalSecond: 'reading significa leer; después de not, el estado de preparación se llama ready.',
  }),
  'pt-BR': details('ready', READY_NOT, READY_TRAPS, {
    meaning: 'Não estou pronto / Não estou pronta', explanation: 'Essa é uma resposta sincera quando ainda não se pode começar. I identifica quem fala, am liga a pessoa ao estado, not nega a prontidão e ready nomeia esse estado.',
    iPrompt: 'Escolha o «eu» inglês para a pessoa que ainda não está pronta.', iLower: 'i se parece com o pronome, mas o «eu» inglês sempre usa maiúscula; a resposta começa com I.', iLetterL: 'l é um L minúsculo, não a palavra «eu»; quem fala é identificado por I.',
    amPrompt: 'Escolha a ligação entre o falante e a negação da prontidão.', amAn: 'an termina em /n/ e não funciona como ligação; I am not ready precisa de am.', amM: 'm perde o a inicial e deixa de ser uma palavra; antes de not é preciso escrever am completo.',
    notPrompt: 'Escolha a palavra que nega o estado de prontidão.', notFirst: 'no não tem o t final e não substitui a negação aqui; é necessário not.', notSecond: 'now significa «agora», não «não»; a falta de prontidão é expressa com not.',
    lexicalPrompt: 'Escolha o estado negado: «pronto/pronta».', lexicalFirst: 'really significa «realmente»; I am not ready nega o estado ready.', lexicalSecond: 'reading significa leitura; depois de not, o estado de prontidão se chama ready.',
  }),
  vi: details('ready', READY_NOT, READY_TRAPS, {
    meaning: 'Tôi chưa sẵn sàng', explanation: 'Đây là câu trả lời chân thật khi vẫn chưa thể bắt đầu. I gọi tên người nói, am nối người ấy với trạng thái, not phủ định sự sẵn sàng, còn ready gọi tên trạng thái đó.',
    iPrompt: 'Chọn từ tiếng Anh nghĩa là “tôi” cho người chưa sẵn sàng.', iLower: 'i trông giống đại từ nhưng “tôi” trong tiếng Anh luôn viết hoa; câu trả lời bắt đầu bằng I.', iLetterL: 'l là chữ L thường, không phải từ “tôi”; người nói được gọi bằng I.',
    amPrompt: 'Chọn từ nối giữa người nói và sự phủ định trạng thái sẵn sàng.', amAn: 'an kết thúc bằng /n/ và không làm từ nối; I am not ready cần am.', amM: 'm thiếu a ở đầu nên không còn là một từ; trước not phải viết đầy đủ am.',
    notPrompt: 'Chọn từ phủ định trạng thái sẵn sàng.', notFirst: 'no thiếu t ở cuối và không thay được từ phủ định tại đây; phải dùng not.', notSecond: 'now nghĩa là “bây giờ”, không phải “không”; trạng thái chưa sẵn sàng dùng not.',
    lexicalPrompt: 'Chọn trạng thái bị phủ định: “sẵn sàng”.', lexicalFirst: 'really nghĩa là “thực sự”; I am not ready phủ định trạng thái ready.', lexicalSecond: 'reading nghĩa là đọc; sau not, trạng thái sẵn sàng được gọi là ready.',
  }),
  id: details('ready', READY_NOT, READY_TRAPS, {
    meaning: 'Saya belum siap', explanation: 'Ini jawaban jujur ketika kegiatan belum dapat dimulai. I menyebut penutur, am menghubungkannya dengan keadaan, not menyangkal kesiapan, dan ready menamai keadaan itu.',
    iPrompt: 'Pilih kata Inggris untuk “saya” bagi orang yang belum siap.', iLower: 'i tampak seperti pronomina, tetapi “saya” dalam bahasa Inggris selalu ditulis besar; jawaban dimulai dengan I.', iLetterL: 'l adalah huruf L kecil, bukan kata “saya”; penutur ditandai dengan I.',
    amPrompt: 'Pilih penghubung antara penutur dan negasi kesiapan.', amAn: 'an berakhir /n/ dan bukan penghubung; I am not ready memerlukan am.', amM: 'm kehilangan a awal dan bukan lagi sebuah kata; sebelum not harus ada am lengkap.',
    notPrompt: 'Pilih kata yang menyangkal keadaan siap.', notFirst: 'no tidak memiliki t terakhir dan tidak menggantikan negasi di sini; diperlukan not.', notSecond: 'now berarti “sekarang”, bukan “tidak”; ketiadaan kesiapan dinyatakan dengan not.',
    lexicalPrompt: 'Pilih keadaan yang disangkal: “siap”.', lexicalFirst: 'really berarti “sungguh”; I am not ready menyangkal keadaan ready.', lexicalSecond: 'reading berarti membaca; setelah not, keadaan siap disebut ready.',
  }),
  tr: details('ready', READY_NOT, READY_TRAPS, {
    meaning: 'Hazır değilim', explanation: 'Henüz başlanamayacağı zaman dürüstçe böyle cevap verilir. I konuşanı gösterir, am onu duruma bağlar, not hazır olmayı olumsuz yapar, ready ise bu durumu adlandırır.',
    iPrompt: 'Henüz hazır olmayan kişi için İngilizce “ben” sözcüğünü seçin.', iLower: 'i zamire benzer ama İngilizce “ben” her zaman büyük yazılır; cevap I ile başlar.', iLetterL: 'l küçük L harfidir, “ben” sözcüğü değildir; konuşanı I gösterir.',
    amPrompt: 'Konuşan ile hazır olmama anlamı arasındaki bağlantıyı seçin.', amAn: 'an /n/ ile biter ve bağlantı değildir; I am not ready içinde am gerekir.', amM: 'm baştaki a harfini kaybeder ve sözcük olmaktan çıkar; not öncesinde tam am gerekir.',
    notPrompt: 'Hazır olma durumunu olumsuz yapan sözcüğü seçin.', notFirst: 'no son t harfini taşımaz ve burada olumsuzluğun yerini tutmaz; not gerekir.', notSecond: 'now “şimdi” demektir, “değil” değil; hazır olmama not ile anlatılır.',
    lexicalPrompt: 'Olumsuz yapılan “hazır” durumunu seçin.', lexicalFirst: 'really “gerçekten” demektir; I am not ready içinde ready durumu olumsuz yapılır.', lexicalSecond: 'reading okuma eylemidir; not sonrasında hazır olma durumu ready olarak kalır.',
  }),
  pl: details('ready', READY_NOT, READY_TRAPS, {
    meaning: 'Nie jestem gotowy / Nie jestem gotowa', explanation: 'Tak odpowiada się szczerze, gdy jeszcze nie można zaczynać. I wskazuje mówiącego, am łączy go ze stanem, not neguje gotowość, a ready nazywa właśnie ten stan.',
    iPrompt: 'Wybierz angielskie „ja” dla osoby, która nie jest jeszcze gotowa.', iLower: 'i przypomina zaimek, ale angielskie „ja” zawsze jest wielkie; odpowiedź zaczyna się od I.', iLetterL: 'l jest małą literą L, a nie słowem „ja”; mówiącego wskazuje I.',
    amPrompt: 'Wybierz łącznik między mówiącym a negacją gotowości.', amAn: 'an kończy się /n/ i nie jest łącznikiem; I am not ready wymaga am.', amM: 'm traci początkowe a i przestaje być słowem; przed not potrzebne jest pełne am.',
    notPrompt: 'Wybierz słowo, które neguje stan gotowości.', notFirst: 'no nie ma końcowego t i nie zastępuje tutaj przeczenia; potrzebne jest not.', notSecond: 'now znaczy „teraz”, a nie „nie”; brak gotowości wyraża not.',
    lexicalPrompt: 'Wybierz negowany stan: „gotowy/gotowa”.', lexicalFirst: 'really znaczy „naprawdę”; I am not ready neguje stan ready.', lexicalSecond: 'reading oznacza czytanie; po not stan gotowości nadal nazywa się ready.',
  }),
};

export const EPISODE_01_SESSION_02_WORD_FIRST_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze([
  {
    id: 'e01-s02-word-first-i-am-not-here', english: 'I am not here', russian: 'Меня здесь нет / Я не здесь',
    explanation: HERE_LOCALIZED.ru!.explanation,
    words: [I_WORD, AM_WORD, NOT_HERE_WORD, HERE_WORD], localizedDetails: HERE_LOCALIZED,
    features: ['copula_be', 'first_person_singular', 'negation_not', 'adverb_place'],
  },
  {
    id: 'e01-s02-word-first-i-am-not-ready', english: 'I am not ready', russian: 'Я не готов / Я не готова',
    explanation: READY_LOCALIZED.ru!.explanation,
    words: [I_WORD, AM_WORD, NOT_READY_WORD, READY_WORD], localizedDetails: READY_LOCALIZED,
    features: ['copula_be', 'first_person_singular', 'negation_not', 'state_adjective'],
  },
]);
