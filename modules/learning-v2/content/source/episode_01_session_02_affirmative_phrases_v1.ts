import type {
  EpisodeSourceDistractor,
  EpisodeSourcePhrase,
  EpisodeSourcePhraseLocalizedDetails,
} from './episode_01_source_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];
type State = 'happy' | 'sad' | 'tired' | 'fine';
type TrapType = NonNullable<EpisodeSourceDistractor['trapType']>;
type LocalWordCopy = Readonly<{
  iPrompt: string; iLower: string; iLetterL: string; iMe: string;
  amPrompt: string; amAn: string; amM: string; amIm: string;
  notPrompt: string; notNo: string; notNow: string;
}>;
type StateCopy = Readonly<{
  prompt: string;
  first: string;
  second: string;
}>;
type PhraseCopy = Readonly<{ meaning: string; explanation: string }>;

const COMMON: Readonly<Record<Locale, LocalWordCopy>> = {
  ru: { iPrompt: 'Выберите английское «я».', iLower: 'i выглядит похоже, но английское местоимение «я» всегда пишется заглавной I.', iLetterL: 'l — строчная L без точки, а не местоимение говорящего I.', iMe: 'Me означает «меня» или «мне». Когда человек сам называет себя, нужно I.', amPrompt: 'Выберите связку после I.', amAn: 'an заканчивается /n/ и является другим словом; после I нужна связка am с /m/.', amM: 'm — только последняя буква; связка пишется полностью: am.', amIm: 'I’m уже содержит I am целиком. После отдельного I нужна только связка am.', notPrompt: 'Выберите слово, которое отрицает состояние.', notNo: 'no обычно отвечает «нет» отдельно и не заменяет not внутри этой фразы.', notNow: 'now означает «сейчас»; отрицание состояния передаёт not.' },
  uk: { iPrompt: 'Оберіть англійське «я».', iLower: 'i схоже, але англійський займенник «я» завжди пишеться великою I.', iLetterL: 'l — мала L без крапки, а не займенник мовця I.', iMe: 'Me означає «мене» або «мені». Коли людина сама називає себе, потрібне I.', amPrompt: 'Оберіть зв’язку після I.', amAn: 'an закінчується /n/ і є іншим словом; після I потрібна зв’язка am з /m/.', amM: 'm — лише остання літера; зв’язка пишеться повністю: am.', amIm: 'I’m уже містить I am повністю. Після окремого I потрібне лише am.', notPrompt: 'Оберіть слово, яке заперечує стан.', notNo: 'no зазвичай окремо відповідає «ні» й не замінює not усередині цієї фрази.', notNow: 'now означає «зараз»; заперечення стану передає not.' },
  es: { iPrompt: 'Elige el «yo» inglés.', iLower: 'i se parece, pero el pronombre inglés «yo» siempre se escribe con I mayúscula.', iLetterL: 'l es una L minúscula sin punto, no el pronombre del hablante I.', iMe: 'Me significa «me» o «a mí». Para que el hablante se nombre a sí mismo, se usa I.', amPrompt: 'Elige el enlace que sigue a I.', amAn: 'an termina en /n/ y es otra palabra; después de I corresponde am con /m/.', amM: 'm es solo la última letra; el enlace completo se escribe am.', amIm: 'I’m ya contiene I am completo. Después de un I separado solo corresponde am.', notPrompt: 'Elige la palabra que niega el estado.', notNo: 'no suele ser una respuesta independiente y no sustituye a not dentro de esta frase.', notNow: 'now significa «ahora»; la negación del estado se expresa con not.' },
  'pt-BR': { iPrompt: 'Escolha o «eu» inglês.', iLower: 'i se parece, mas o pronome inglês «eu» sempre se escreve com I maiúsculo.', iLetterL: 'l é um L minúsculo sem ponto, não o pronome do falante I.', iMe: 'Me significa «me» ou «mim». Para o falante nomear a si mesmo, usa-se I.', amPrompt: 'Escolha a ligação depois de I.', amAn: 'an termina em /n/ e é outra palavra; depois de I é necessário am com /m/.', amM: 'm é apenas a última letra; a ligação completa se escreve am.', amIm: 'I’m já contém I am completo. Depois de um I separado, entra apenas am.', notPrompt: 'Escolha a palavra que nega o estado.', notNo: 'no costuma ser uma resposta independente e não substitui not dentro desta frase.', notNow: 'now significa «agora»; a negação do estado é expressa com not.' },
  vi: { iPrompt: 'Chọn đại từ tiếng Anh nghĩa là “tôi”.', iLower: 'i trông giống nhưng đại từ “tôi” trong tiếng Anh luôn được viết hoa là I.', iLetterL: 'l là chữ L thường không có chấm, không phải đại từ người nói I.', iMe: 'Me nghĩa là “tôi” ở vị trí nhận tác động. Khi người nói tự gọi tên mình, phải dùng I.', amPrompt: 'Chọn từ nối đứng sau I.', amAn: 'an kết thúc bằng /n/ và là từ khác; sau I cần am với âm /m/.', amM: 'm chỉ là chữ cuối; từ nối phải được viết đầy đủ là am.', amIm: 'I’m đã chứa trọn I am. Sau I đứng riêng chỉ cần am.', notPrompt: 'Chọn từ phủ định trạng thái.', notNo: 'no thường là câu trả lời độc lập và không thay cho not bên trong câu này.', notNow: 'now nghĩa là “bây giờ”; trạng thái được phủ định bằng not.' },
  id: { iPrompt: 'Pilih pronomina Inggris untuk “saya”.', iLower: 'i tampak mirip, tetapi pronomina Inggris “saya” selalu ditulis dengan I besar.', iLetterL: 'l adalah huruf L kecil tanpa titik, bukan pronomina penutur I.', iMe: 'Me berarti “saya” sebagai penerima tindakan. Saat penutur menyebut dirinya, bentuknya I.', amPrompt: 'Pilih penghubung setelah I.', amAn: 'an berakhir /n/ dan merupakan kata lain; setelah I diperlukan am dengan /m/.', amM: 'm hanya huruf terakhir; penghubung lengkap ditulis am.', amIm: 'I’m sudah memuat I am lengkap. Setelah I yang terpisah, cukup gunakan am.', notPrompt: 'Pilih kata yang menyangkal keadaan.', notNo: 'no biasanya menjadi jawaban mandiri dan tidak menggantikan not di dalam kalimat ini.', notNow: 'now berarti “sekarang”; penyangkalan keadaan dinyatakan dengan not.' },
  tr: { iPrompt: 'İngilizce “ben” zamirini seçin.', iLower: 'i benzer görünür ama İngilizce “ben” zamiri her zaman büyük I olarak yazılır.', iLetterL: 'l noktasız küçük L harfidir, konuşanı gösteren I zamiri değildir.', iMe: 'Me, eylemden etkilenen “beni/bana” biçimidir. Konuşan kendini adlandırırken I kullanır.', amPrompt: 'I sonrasındaki bağlantıyı seçin.', amAn: 'an /n/ ile biter ve başka bir sözcüktür; I sonrasında /m/ ile biten am gerekir.', amM: 'm yalnızca son harftir; bağlantı tam olarak am yazılır.', amIm: 'I’m zaten I am bütününü içerir. Ayrı yazılan I sonrasında yalnızca am gerekir.', notPrompt: 'Durumu olumsuz yapan sözcüğü seçin.', notNo: 'no çoğunlukla bağımsız “hayır” cevabıdır ve bu cümlede not yerine geçmez.', notNow: 'now “şimdi” demektir; durum not ile olumsuz yapılır.' },
  pl: { iPrompt: 'Wybierz angielskie „ja”.', iLower: 'i wygląda podobnie, ale angielskie „ja” zawsze zapisuje się wielką literą I.', iLetterL: 'l jest małą literą L bez kropki, a nie zaimkiem mówiącego I.', iMe: 'Me oznacza „mnie” lub „mi”. Gdy mówiący sam siebie nazywa, potrzebne jest I.', amPrompt: 'Wybierz łącznik po I.', amAn: 'an kończy się /n/ i jest innym słowem; po I potrzebne jest am z /m/.', amM: 'm jest tylko ostatnią literą; pełny łącznik zapisuje się am.', amIm: 'I’m zawiera już całe I am. Po osobnym I potrzebne jest tylko am.', notPrompt: 'Wybierz słowo, które neguje stan.', notNo: 'no zwykle jest samodzielną odpowiedzią i nie zastępuje not wewnątrz tego zdania.', notNow: 'now znaczy „teraz”; stan neguje słowo not.' },
};

const STATE_COPY: Readonly<Record<State, Readonly<Record<Locale, StateCopy>>>> = {
  happy: {
    ru: { prompt: 'Выберите состояние «счастлив / рад».', first: 'heavy грамматически подходит после I am, но означает «тяжёлый»; радостное состояние называется happy.', second: 'unhappy тоже описывает чувство, но приставка un- разворачивает смысл в «несчастный»; без неё happy означает радость.' },
    uk: { prompt: 'Оберіть стан «щасливий / радий».', first: 'heavy граматично стоїть після I am, але означає «важкий»; радісний стан називається happy.', second: 'unhappy теж описує почуття, але префікс un- змінює зміст на «нещасний»; без нього happy означає радість.' },
    es: { prompt: 'Elige el estado «feliz / contento».', first: 'Heavy puede seguir a I am, pero significa «pesado»; el estado alegre es happy.', second: 'Unhappy también describe una emoción, pero el prefijo un- invierte el sentido a «infeliz»; happy expresa alegría.' },
    'pt-BR': { prompt: 'Escolha o estado «feliz / contente».', first: 'Heavy pode vir depois de I am, mas significa «pesado»; o estado alegre é happy.', second: 'Unhappy também descreve emoção, mas o prefixo un- inverte o sentido para «infeliz»; happy expressa alegria.' },
    vi: { prompt: 'Chọn trạng thái “vui / hạnh phúc”.', first: 'Heavy vẫn có thể đứng sau I am nhưng nghĩa là “nặng”; trạng thái vui là happy.', second: 'Unhappy cũng tả cảm xúc nhưng tiền tố un- đổi nghĩa thành “không vui”; bỏ un- thì happy là vui.' },
    id: { prompt: 'Pilih keadaan “senang / bahagia”.', first: 'Heavy dapat muncul setelah I am, tetapi berarti “berat”; keadaan senang adalah happy.', second: 'Unhappy juga menggambarkan perasaan, tetapi awalan un- membalik arti menjadi “tidak bahagia”; happy berarti senang.' },
    tr: { prompt: '“Mutlu” durumunu seçin.', first: 'Heavy I am sonrasında dilbilgisel olarak durabilir ama “ağır” demektir; sevinç durumu happy olur.', second: 'Unhappy de duygu anlatır fakat un- öneki anlamı “mutsuz” yapar; öneksiz happy mutluluğu söyler.' },
    pl: { prompt: 'Wybierz stan „szczęśliwy / radosny”.', first: 'Heavy może stać po I am, lecz znaczy „ciężki”; radosny stan to happy.', second: 'Unhappy też opisuje uczucie, ale przedrostek un- odwraca sens na „nieszczęśliwy”; happy oznacza radość.' },
  },
  sad: {
    ru: { prompt: 'Выберите состояние «грустный».', first: 'mad рифмуется с sad и тоже называет чувство, но означает «злой / безумный»; грусть передаёт sad.', second: 'bad отличается одной начальной буквой и означает «плохой»; личное чувство грусти называется sad.' },
    uk: { prompt: 'Оберіть стан «сумний».', first: 'mad римується із sad і теж називає почуття, але означає «злий / божевільний»; смуток передає sad.', second: 'bad відрізняється однією початковою літерою й означає «поганий»; особистий смуток називається sad.' },
    es: { prompt: 'Elige el estado «triste».', first: 'Mad rima con sad y también describe emoción, pero significa «enfadado / loco»; tristeza es sad.', second: 'Bad cambia solo la primera letra y significa «malo»; el sentimiento triste se llama sad.' },
    'pt-BR': { prompt: 'Escolha o estado «triste».', first: 'Mad rima com sad e também descreve emoção, mas significa «bravo / louco»; tristeza é sad.', second: 'Bad muda apenas a primeira letra e significa «ruim»; o sentimento triste se chama sad.' },
    vi: { prompt: 'Chọn trạng thái “buồn”.', first: 'Mad vần với sad và cũng tả cảm xúc nhưng nghĩa là “giận / điên”; buồn là sad.', second: 'Bad chỉ đổi chữ đầu và nghĩa là “xấu / tệ”; cảm giác buồn được gọi là sad.' },
    id: { prompt: 'Pilih keadaan “sedih”.', first: 'Mad berima dengan sad dan juga menyatakan emosi, tetapi berarti “marah / gila”; sedih adalah sad.', second: 'Bad hanya mengganti huruf awal dan berarti “buruk”; perasaan sedih disebut sad.' },
    tr: { prompt: '“Üzgün” durumunu seçin.', first: 'Mad sad ile kafiyelidir ve duygu anlatır ama “kızgın / deli” demektir; üzüntü sad olur.', second: 'Bad yalnızca ilk harfi değiştirir ve “kötü” demektir; kişisel üzüntü sad ile adlandırılır.' },
    pl: { prompt: 'Wybierz stan „smutny”.', first: 'Mad rymuje się z sad i też opisuje emocję, ale znaczy „zły / szalony”; smutek to sad.', second: 'Bad zmienia tylko pierwszą literę i znaczy „zły / niedobry”; uczucie smutku nazywa sad.' },
  },
  tired: {
    ru: { prompt: 'Выберите состояние «уставший».', first: 'wired рифмуется с tired и может описывать человека, но означает «взвинченный / на нервах»; нехватку сил называет tired.', second: 'fired отличается первым звуком и означает «уволен»; состояние усталости передаёт tired.' },
    uk: { prompt: 'Оберіть стан «втомлений».', first: 'wired римується з tired і може описувати людину, але означає «збуджений / на нервах»; брак сил називає tired.', second: 'fired відрізняється першим звуком і означає «звільнений»; стан втоми передає tired.' },
    es: { prompt: 'Elige el estado «cansado».', first: 'Wired rima con tired y puede describir a una persona, pero significa «nervioso / acelerado»; falta de energía es tired.', second: 'Fired cambia el primer sonido y significa «despedido»; cansancio se expresa con tired.' },
    'pt-BR': { prompt: 'Escolha o estado «cansado».', first: 'Wired rima com tired e pode descrever uma pessoa, mas significa «agitado / elétrico»; falta de energia é tired.', second: 'Fired muda o primeiro som e significa «demitido»; cansaço se expressa com tired.' },
    vi: { prompt: 'Chọn trạng thái “mệt”.', first: 'Wired vần với tired và có thể tả người nhưng nghĩa là “căng thẳng / kích động”; thiếu sức là tired.', second: 'Fired đổi âm đầu và nghĩa là “bị sa thải”; trạng thái mệt là tired.' },
    id: { prompt: 'Pilih keadaan “lelah”.', first: 'Wired berima dengan tired dan dapat menggambarkan orang, tetapi berarti “tegang / terlalu bersemangat”; kekurangan tenaga adalah tired.', second: 'Fired mengganti bunyi awal dan berarti “dipecat”; keadaan lelah adalah tired.' },
    tr: { prompt: '“Yorgun” durumunu seçin.', first: 'Wired tired ile kafiyelidir ve kişiyi anlatabilir ama “gergin / aşırı uyarılmış” demektir; enerji eksikliği tired olur.', second: 'Fired ilk sesi değiştirir ve “işten çıkarılmış” demektir; yorgunluk tired ile anlatılır.' },
    pl: { prompt: 'Wybierz stan „zmęczony”.', first: 'Wired rymuje się z tired i może opisywać osobę, ale znaczy „pobudzony / spięty”; brak sił to tired.', second: 'Fired zmienia pierwszy dźwięk i znaczy „zwolniony”; zmęczenie wyraża tired.' },
  },
  fine: {
    ru: { prompt: 'Выберите спокойное состояние «нормально».', first: 'kind грамматически подходит после I am и рифмуется с fine, но означает «добрый»; ответ о самочувствии — fine.', second: 'blind тоже описывает человека и содержит похожий конец, но означает «слепой»; спокойное «нормально» передаёт fine.' },
    uk: { prompt: 'Оберіть спокійний стан «нормально».', first: 'kind граматично стоїть після I am і римується з fine, але означає «добрий»; відповідь про самопочуття — fine.', second: 'blind теж описує людину й має схожий кінець, але означає «сліпий»; спокійне «нормально» передає fine.' },
    es: { prompt: 'Elige el estado tranquilo «bien».', first: 'Kind puede seguir a I am y rima con fine, pero significa «amable»; la respuesta sobre el estado es fine.', second: 'Blind también describe a una persona y tiene un final parecido, pero significa «ciego»; «bien» corresponde a fine.' },
    'pt-BR': { prompt: 'Escolha o estado tranquilo «bem».', first: 'Kind pode vir depois de I am e rima com fine, mas significa «gentil»; a resposta sobre o estado é fine.', second: 'Blind também descreve pessoa e tem final parecido, mas significa «cego»; «bem» corresponde a fine.' },
    vi: { prompt: 'Chọn trạng thái bình thản “ổn”.', first: 'Kind có thể đứng sau I am và có vần gần fine nhưng nghĩa là “tốt bụng”; trạng thái “ổn” là fine.', second: 'Blind cũng tả người và có phần cuối gần giống nhưng nghĩa là “mù”; câu trả lời “ổn” là fine.' },
    id: { prompt: 'Pilih keadaan tenang “baik-baik saja”.', first: 'Kind dapat mengikuti I am dan berima dekat dengan fine, tetapi berarti “baik hati”; jawaban keadaan adalah fine.', second: 'Blind juga menggambarkan orang dan memiliki akhir mirip, tetapi berarti “buta”; “baik-baik saja” adalah fine.' },
    tr: { prompt: 'Sakin “iyiyim” durumunu seçin.', first: 'Kind I am sonrasında durabilir ve fine ile yakın uyaklıdır ama “nazik” demektir; durum cevabı fine olur.', second: 'Blind de kişiyi tanımlar ve benzer son taşır ama “kör” demektir; sakin “iyiyim” cevabı fine olur.' },
    pl: { prompt: 'Wybierz spokojny stan „w porządku”.', first: 'Kind może stać po I am i rymuje się blisko z fine, ale znaczy „życzliwy”; odpowiedź o samopoczuciu to fine.', second: 'Blind też opisuje osobę i ma podobne zakończenie, lecz znaczy „niewidomy”; spokojne „w porządku” to fine.' },
  },
};

const TRAPS: Readonly<Record<State, readonly [Readonly<{ value: string; trapType: TrapType }>, Readonly<{ value: string; trapType: TrapType }>, Readonly<{ value: string; trapType: TrapType }> ]>> = {
  happy: [{ value: 'heavy', trapType: 'phonetic' }, { value: 'unhappy', trapType: 'semantic_neighbor' }, { value: 'happily', trapType: 'grammar' }],
  sad: [{ value: 'mad', trapType: 'phonetic' }, { value: 'bad', trapType: 'phonetic' }, { value: 'sadly', trapType: 'grammar' }],
  tired: [{ value: 'wired', trapType: 'phonetic' }, { value: 'fired', trapType: 'phonetic' }, { value: 'tire', trapType: 'grammar' }],
  fine: [{ value: 'kind', trapType: 'phonetic' }, { value: 'blind', trapType: 'phonetic' }, { value: 'find', trapType: 'orthographic' }],
};

const THIRD_STATE_COPY: Readonly<Record<State, Readonly<Record<Locale, string>>>> = {
  happy: {
    ru: 'Happily означает «радостно» и описывает действие. После I am нужно состояние человека: happy.', uk: 'Happily означає «радісно» й описує дію. Після I am потрібен стан людини: happy.', es: 'Happily significa «alegremente» y describe una acción. Después de I am hace falta el estado happy.', 'pt-BR': 'Happily significa «alegremente» e descreve uma ação. Depois de I am, o estado correto é happy.', vi: 'Happily nghĩa là “một cách vui vẻ” và tả hành động. Sau I am cần trạng thái happy.', id: 'Happily berarti “dengan gembira” dan menerangkan tindakan. Setelah I am diperlukan keadaan happy.', tr: 'Happily “mutlu biçimde” diyerek eylemi anlatır. I am sonrasında durum bildiren happy gerekir.', pl: 'Happily znaczy „radośnie” i opisuje czynność. Po I am potrzebny jest stan happy.',
  },
  sad: {
    ru: 'Sadly означает «грустно» и описывает, как что-то происходит. После I am состояние называется sad.', uk: 'Sadly означає «сумно» й описує, як щось відбувається. Після I am стан називається sad.', es: 'Sadly significa «tristemente» y describe cómo ocurre algo. Después de I am el estado es sad.', 'pt-BR': 'Sadly significa «tristemente» e descreve como algo acontece. Depois de I am, o estado é sad.', vi: 'Sadly nghĩa là “một cách buồn bã” và tả cách hành động xảy ra. Sau I am cần trạng thái sad.', id: 'Sadly berarti “dengan sedih” dan menerangkan cara tindakan terjadi. Setelah I am diperlukan sad.', tr: 'Sadly “üzgün biçimde” diyerek eylemi anlatır. I am sonrasında durum için sad gerekir.', pl: 'Sadly znaczy „smutno” i opisuje sposób czynności. Po I am stan wyraża sad.',
  },
  tired: {
    ru: 'Tire означает «утомлять» или «шина». Для состояния человека после I am нужна форма tired.', uk: 'Tire означає «втомлювати» або «шина». Для стану людини після I am потрібна форма tired.', es: 'Tire significa «cansar» o «neumático». Para el estado de una persona después de I am se usa tired.', 'pt-BR': 'Tire significa «cansar» ou «pneu». Para o estado da pessoa depois de I am, usa-se tired.', vi: 'Tire nghĩa là “làm mệt” hoặc “lốp xe”. Trạng thái của người sau I am phải là tired.', id: 'Tire berarti “membuat lelah” atau “ban”. Untuk keadaan orang setelah I am, bentuknya tired.', tr: 'Tire “yormak” ya da “lastik” demektir. I am sonrasında kişinin durumu tired olur.', pl: 'Tire znaczy „męczyć” albo „opona”. Stan osoby po I am wyraża tired.',
  },
  fine: {
    ru: 'Find означает «находить» и заканчивается звуком /d/. Спокойное состояние после I am — fine с /n/.', uk: 'Find означає «знаходити» й закінчується звуком /d/. Спокійний стан після I am — fine з /n/.', es: 'Find significa «encontrar» y termina en /d/. El estado tranquilo después de I am es fine con /n/.', 'pt-BR': 'Find significa «encontrar» e termina em /d/. O estado tranquilo depois de I am é fine com /n/.', vi: 'Find nghĩa là “tìm thấy” và kết thúc bằng /d/. Trạng thái ổn sau I am là fine với /n/.', id: 'Find berarti “menemukan” dan berakhir /d/. Keadaan tenang setelah I am adalah fine dengan /n/.', tr: 'Find “bulmak” demektir ve /d/ ile biter. I am sonrasındaki sakin durum /n/ ile biten fine olur.', pl: 'Find znaczy „znaleźć” i kończy się /d/. Spokojny stan po I am to fine z /n/.',
  },
};

const PHRASE_COPY: Readonly<Record<string, Readonly<Record<Locale, PhraseCopy>>>> = {
  'I am happy': {
    ru: { meaning: 'Я счастлив / Я счастлива', explanation: 'Так прямо называют своё радостное состояние. I показывает говорящего, am соединяет его с описанием, а happy передаёт радость.' },
    uk: { meaning: 'Я щасливий / Я щаслива', explanation: 'Так прямо називають свій радісний стан. I показує мовця, am пов’язує його з описом, а happy передає радість.' },
    es: { meaning: 'Estoy feliz / contento / contenta', explanation: 'Así se nombra directamente un estado alegre. I identifica al hablante, am lo enlaza con la descripción y happy expresa alegría.' },
    'pt-BR': { meaning: 'Estou feliz / contente', explanation: 'Assim se nomeia diretamente um estado alegre. I identifica quem fala, am liga a pessoa à descrição e happy expressa alegria.' },
    vi: { meaning: 'Tôi vui / hạnh phúc', explanation: 'Câu này trực tiếp gọi tên trạng thái vui. I chỉ người nói, am nối người ấy với mô tả, còn happy diễn tả niềm vui.' },
    id: { meaning: 'Saya senang / bahagia', explanation: 'Kalimat ini langsung menamai keadaan senang. I menunjukkan penutur, am menghubungkannya dengan deskripsi, dan happy menyatakan rasa gembira.' },
    tr: { meaning: 'Mutluyum', explanation: 'Bu söz sevinç durumunu doğrudan adlandırır. I konuşanı gösterir, am onu açıklamaya bağlar, happy ise mutluluğu anlatır.' },
    pl: { meaning: 'Jestem szczęśliwy / szczęśliwa', explanation: 'Tak wprost nazywa się radosny stan. I wskazuje mówiącego, am łączy go z opisem, a happy wyraża radość.' },
  },
  'I am sad': {
    ru: { meaning: 'Мне грустно / Я грустный / грустная', explanation: 'Так спокойно сообщают о грусти. I называет человека, am удерживает английскую связь, а sad передаёт именно грустное настроение.' },
    uk: { meaning: 'Мені сумно / Я сумний / сумна', explanation: 'Так спокійно повідомляють про смуток. I називає людину, am зберігає англійський зв’язок, а sad передає саме сумний настрій.' },
    es: { meaning: 'Estoy triste', explanation: 'Así se comunica con calma la tristeza. I identifica a la persona, am mantiene el enlace inglés y sad expresa el ánimo triste.' },
    'pt-BR': { meaning: 'Estou triste', explanation: 'Assim se comunica a tristeza com calma. I identifica a pessoa, am mantém a ligação inglesa e sad expressa o humor triste.' },
    vi: { meaning: 'Tôi buồn', explanation: 'Câu này bình thản cho biết người nói đang buồn. I chỉ người nói, am giữ từ nối tiếng Anh, còn sad gọi tên tâm trạng buồn.' },
    id: { meaning: 'Saya sedih', explanation: 'Kalimat ini menyampaikan kesedihan dengan tenang. I menunjukkan penutur, am mempertahankan penghubung Inggris, dan sad menamai suasana hati sedih.' },
    tr: { meaning: 'Üzgünüm', explanation: 'Bu söz üzüntüyü sakin biçimde bildirir. I kişiyi gösterir, am İngilizce bağlantıyı korur, sad ise üzgün ruh hâlini anlatır.' },
    pl: { meaning: 'Jest mi smutno / Jestem smutny / smutna', explanation: 'Tak spokojnie informuje się o smutku. I wskazuje osobę, am zachowuje angielski łącznik, a sad nazywa smutny nastrój.' },
  },
  'I am tired': {
    ru: { meaning: 'Я устал / Я устала', explanation: 'Так говорят, когда сил стало мало. I называет говорящего, am связывает его с состоянием, а tired сообщает об усталости.' },
    uk: { meaning: 'Я втомився / Я втомилася', explanation: 'Так говорять, коли сил стало мало. I називає мовця, am пов’язує його зі станом, а tired повідомляє про втому.' },
    es: { meaning: 'Estoy cansado / cansada', explanation: 'Se usa cuando falta energía. I identifica al hablante, am lo conecta con su estado y tired comunica cansancio.' },
    'pt-BR': { meaning: 'Estou cansado / cansada', explanation: 'A frase é usada quando falta energia. I identifica quem fala, am liga a pessoa ao estado e tired comunica cansaço.' },
    vi: { meaning: 'Tôi mệt', explanation: 'Câu này dùng khi người nói thiếu sức. I chỉ người nói, am nối người ấy với trạng thái, còn tired báo rằng đang mệt.' },
    id: { meaning: 'Saya lelah', explanation: 'Kalimat ini dipakai ketika tenaga berkurang. I menunjukkan penutur, am menghubungkannya dengan keadaan, dan tired menyatakan lelah.' },
    tr: { meaning: 'Yorgunum', explanation: 'Bu söz enerji azaldığında kullanılır. I konuşanı gösterir, am onu duruma bağlar, tired ise yorgunluğu bildirir.' },
    pl: { meaning: 'Jestem zmęczony / zmęczona', explanation: 'Tak mówi się, gdy brakuje sił. I wskazuje mówiącego, am łączy go ze stanem, a tired informuje o zmęczeniu.' },
  },
  'I am fine': {
    ru: { meaning: 'Я в порядке / У меня всё нормально', explanation: 'Это спокойный ответ о нормальном самочувствии. I называет говорящего, am держит связь, а fine сообщает, что всё в порядке.' },
    uk: { meaning: 'Я в порядку / У мене все нормально', explanation: 'Це спокійна відповідь про нормальне самопочуття. I називає мовця, am тримає зв’язок, а fine повідомляє, що все гаразд.' },
    es: { meaning: 'Estoy bien', explanation: 'Es una respuesta tranquila sobre un estado normal. I identifica al hablante, am mantiene el enlace y fine comunica que todo está bien.' },
    'pt-BR': { meaning: 'Estou bem', explanation: 'É uma resposta tranquila sobre um estado normal. I identifica quem fala, am mantém a ligação e fine comunica que está tudo bem.' },
    vi: { meaning: 'Tôi ổn', explanation: 'Đây là câu trả lời bình thản rằng trạng thái vẫn ổn. I chỉ người nói, am giữ từ nối, còn fine báo rằng mọi thứ bình thường.' },
    id: { meaning: 'Saya baik-baik saja', explanation: 'Ini jawaban tenang tentang keadaan yang baik. I menunjukkan penutur, am mempertahankan penghubung, dan fine menyatakan bahwa keadaan normal.' },
    tr: { meaning: 'İyiyim', explanation: 'Bu, durumun normal olduğunu söyleyen sakin bir cevaptır. I konuşanı gösterir, am bağlantıyı korur, fine ise her şeyin iyi olduğunu bildirir.' },
    pl: { meaning: 'Wszystko u mnie w porządku / Czuję się dobrze', explanation: 'To spokojna odpowiedź o normalnym samopoczuciu. I wskazuje mówiącego, am zachowuje łącznik, a fine mówi, że wszystko jest w porządku.' },
  },
  'I am not sad': {
    ru: { meaning: 'Мне не грустно / Я не грустный / грустная', explanation: 'Так уточняют, что грусти сейчас нет. I называет говорящего, am связывает его с состоянием, not отрицает его, а sad называет именно грусть.' },
    uk: { meaning: 'Мені не сумно / Я не сумний / сумна', explanation: 'Так уточнюють, що смутку зараз немає. I називає мовця, am пов’язує його зі станом, not заперечує його, а sad називає саме смуток.' },
    es: { meaning: 'No estoy triste', explanation: 'Así se aclara que no hay tristeza. I identifica al hablante, am lo enlaza con el estado, not lo niega y sad nombra la tristeza.' },
    'pt-BR': { meaning: 'Não estou triste', explanation: 'Assim se esclarece que não há tristeza. I identifica quem fala, am liga a pessoa ao estado, not o nega e sad nomeia a tristeza.' },
    vi: { meaning: 'Tôi không buồn', explanation: 'Câu này làm rõ rằng người nói không buồn. I chỉ người nói, am nối với trạng thái, not phủ định trạng thái đó, còn sad gọi tên nỗi buồn.' },
    id: { meaning: 'Saya tidak sedih', explanation: 'Kalimat ini menjelaskan bahwa penutur tidak sedih. I menunjukkan penutur, am menghubungkannya dengan keadaan, not menyangkalnya, dan sad menamai kesedihan.' },
    tr: { meaning: 'Üzgün değilim', explanation: 'Bu söz üzüntü olmadığını açıklar. I konuşanı gösterir, am onu duruma bağlar, not durumu olumsuz yapar, sad ise üzüntüyü adlandırır.' },
    pl: { meaning: 'Nie jest mi smutno / Nie jestem smutny / smutna', explanation: 'Tak wyjaśnia się, że nie ma smutku. I wskazuje mówiącego, am łączy go ze stanem, not go neguje, a sad nazywa smutek.' },
  },
  'I am not tired': {
    ru: { meaning: 'Я не устал / Я не устала', explanation: 'Так сообщают, что сил ещё достаточно. I называет говорящего, am связывает его с состоянием, not отрицает усталость, а tired называет её.' },
    uk: { meaning: 'Я не втомився / Я не втомилася', explanation: 'Так повідомляють, що сил іще достатньо. I називає мовця, am пов’язує його зі станом, not заперечує втому, а tired називає її.' },
    es: { meaning: 'No estoy cansado / cansada', explanation: 'Así se comunica que todavía hay energía. I identifica al hablante, am lo conecta con el estado, not niega el cansancio y tired lo nombra.' },
    'pt-BR': { meaning: 'Não estou cansado / cansada', explanation: 'Assim se comunica que ainda há energia. I identifica quem fala, am liga a pessoa ao estado, not nega o cansaço e tired o nomeia.' },
    vi: { meaning: 'Tôi không mệt', explanation: 'Câu này cho biết người nói vẫn còn đủ sức. I chỉ người nói, am nối với trạng thái, not phủ định sự mệt, còn tired gọi tên trạng thái đó.' },
    id: { meaning: 'Saya tidak lelah', explanation: 'Kalimat ini menyatakan bahwa tenaga masih cukup. I menunjukkan penutur, am menghubungkannya dengan keadaan, not menyangkal kelelahan, dan tired menamainya.' },
    tr: { meaning: 'Yorgun değilim', explanation: 'Bu söz enerjinin hâlâ yeterli olduğunu bildirir. I konuşanı gösterir, am onu duruma bağlar, not yorgunluğu olumsuz yapar, tired ise onu adlandırır.' },
    pl: { meaning: 'Nie jestem zmęczony / zmęczona', explanation: 'Tak mówi się, że sił nadal wystarcza. I wskazuje mówiącego, am łączy go ze stanem, not neguje zmęczenie, a tired je nazywa.' },
  },
};

const I_WORD = { correct: 'I', category: 'pronoun', distractors: [
  { value: 'i', reasonCode: 'orthographic:I:lowercase_pronoun', trapType: 'orthographic', why: 'i похоже на местоимение, но английское «я» всегда пишется заглавной I.' },
  { value: 'l', reasonCode: 'orthographic:I:lowercase_l_shape', trapType: 'orthographic', why: 'l — строчная L, а не местоимение говорящего I.' },
  { value: 'me', reasonCode: 'grammar:I:object_form_me', trapType: 'grammar', why: 'Me означает «меня» или «мне»; говорящий называет себя формой I.' },
] } as const;
const AM_WORD = { correct: 'am', category: 'to-be', distractors: [
  { value: 'an', reasonCode: 'phonetic:am:final_n_instead_of_m', trapType: 'phonetic', why: 'an заканчивается /n/ и является другим словом; после I нужна связка am.' },
  { value: 'm', reasonCode: 'orthographic:am:missing_initial_a', trapType: 'orthographic', why: 'm теряет начальную a; связка после I пишется полностью: am.' },
  { value: 'I’m', reasonCode: 'phrase_assembly:am:full_contraction_in_slot', trapType: 'phrase_assembly', why: 'I’m уже содержит I am; после отдельного I нужна только связка am.' },
] } as const;
const NOT_WORD = { correct: 'not', category: 'negation', distractors: [
  { value: 'no', reasonCode: 'orthographic:not:missing_final_t', trapType: 'orthographic', why: 'no не имеет конечной t и не заменяет not внутри отрицательной фразы.' },
  { value: 'now', reasonCode: 'phonetic:not:diphthong_instead_of_t', trapType: 'phonetic', why: 'now означает «сейчас»; отрицание состояния передаёт not.' },
] } as const;

function stateWord(state: State) {
  const traps = TRAPS[state];
  return {
    correct: state,
    category: 'state_adjective',
    distractors: traps.map((trap, index) => ({
      value: trap.value,
      reasonCode: `${trap.trapType}:${state}:${trap.value}:state_contrast`,
      trapType: trap.trapType,
      why: index === 0
        ? STATE_COPY[state].ru.first
        : index === 1
        ? STATE_COPY[state].ru.second
        : THIRD_STATE_COPY[state].ru,
    })),
  } as const;
}

function details(
  english: keyof typeof PHRASE_COPY,
  state: State,
  negative: boolean,
): NonNullable<EpisodeSourcePhrase['localizedDetails']> {
  const traps = TRAPS[state];
  return Object.fromEntries(LOCALES.map((locale) => {
    const common = COMMON[locale];
    const stateCopy = STATE_COPY[state][locale];
    const phrase = PHRASE_COPY[english][locale];
    const iDistractors = [
      { value: 'i', reason: common.iLower, trapType: 'orthographic' as const },
      { value: 'l', reason: common.iLetterL, trapType: 'orthographic' as const },
      { value: 'me', reason: common.iMe, trapType: 'grammar' as const },
    ];
    const amDistractors = [
      { value: 'an', reason: common.amAn, trapType: 'phonetic' as const },
      { value: 'm', reason: common.amM, trapType: 'orthographic' as const },
      { value: 'I’m', reason: common.amIm, trapType: 'phrase_assembly' as const },
    ];
    const notDistractors = [
      { value: 'no', reason: common.notNo, trapType: 'orthographic' as const },
      { value: 'now', reason: common.notNow, trapType: 'phonetic' as const },
    ];
    const lexicalDistractors = [
      { value: traps[0].value, reason: stateCopy.first, trapType: traps[0].trapType },
      { value: traps[1].value, reason: stateCopy.second, trapType: traps[1].trapType },
      { value: traps[2].value, reason: THIRD_STATE_COPY[state][locale], trapType: traps[2].trapType },
    ];
    const words: EpisodeSourcePhraseLocalizedDetails['words'] = [
      { correct: 'I', prompt: common.iPrompt, distractors: iDistractors },
      { correct: 'am', prompt: common.amPrompt, distractors: amDistractors },
      ...(negative ? [{ correct: 'not', prompt: common.notPrompt, distractors: notDistractors }] : []),
      { correct: state, prompt: stateCopy.prompt, distractors: lexicalDistractors },
    ];
    return [locale, {
      meaning: phrase.meaning,
      explanation: phrase.explanation,
      distractors: [
        ...iDistractors,
        ...amDistractors,
        ...(negative ? notDistractors : []),
        ...lexicalDistractors,
      ],
      words,
    } satisfies EpisodeSourcePhraseLocalizedDetails];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
}

function phrase(english: keyof typeof PHRASE_COPY, state: State, negative = false): EpisodeSourcePhrase {
  return {
    id: `e01-s02-word-first-${english.toLowerCase().replace(/\s+/gu, '-')}`,
    english,
    russian: PHRASE_COPY[english].ru.meaning,
    explanation: PHRASE_COPY[english].ru.explanation,
    words: [I_WORD, AM_WORD, ...(negative ? [NOT_WORD] : []), stateWord(state)],
    localizedDetails: details(english, state, negative),
    features: ['copula_be', 'first_person_singular', 'feeling_adjective', ...(negative ? ['negation_not'] : [])],
  };
}

export const EPISODE_01_SESSION_02_MODE_NATIVE_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze([
  phrase('I am happy', 'happy'),
  phrase('I am sad', 'sad'),
  phrase('I am tired', 'tired'),
  phrase('I am fine', 'fine'),
]);

// Kept outside the approved session-02 source inventory. Later forbidden
// drafts historically import this phrase through session 03, so exposing it
// separately preserves module compatibility without changing session 02.
export const EPISODE_01_LEGACY_NOT_SAD_PHRASE: EpisodeSourcePhrase =
  phrase('I am not sad', 'sad', true);
