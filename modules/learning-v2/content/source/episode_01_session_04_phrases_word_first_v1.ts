import type {
  EpisodeSourceDistractor,
  EpisodeSourcePhrase,
  EpisodeSourcePhraseLocalizedDetails,
} from './episode_01_source_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];
type State = 'here' | 'ready' | 'happy' | 'tired' | 'fine' | 'busy';
type TrapType = NonNullable<EpisodeSourceDistractor['trapType']>;
type WordCopy = Readonly<{ prompt: string; first: string; second: string }>;
type PhraseCopy = Readonly<{ meaning: string; explanation: string }>;

const CONTRACTION: Readonly<Record<Locale, WordCopy>> = {
  ru: { prompt: 'Выберите точное сокращение I am.', first: 'Im передаёт похожее звучание, но теряет апостроф, который отмечает пропущенную a; стандартная форма — I’m.', second: 'I’am сохраняет букву a и ставит апостроф не на место пропуска; I am сокращается до I’m.' },
  uk: { prompt: 'Оберіть точне скорочення I am.', first: 'Im передає схоже звучання, але губить апостроф, що позначає пропущену a; стандартна форма — I’m.', second: 'I’am зберігає літеру a й ставить апостроф не на місце пропуску; I am скорочується до I’m.' },
  es: { prompt: 'Elige la contracción exacta de I am.', first: 'Im puede sonar igual, pero pierde el apóstrofo que marca la a omitida; la forma estándar es I’m.', second: 'I’am conserva la a y coloca el apóstrofo fuera del hueco; I am se contrae en I’m.' },
  'pt-BR': { prompt: 'Escolha a contração exata de I am.', first: 'Im pode soar igual, mas perde o apóstrofo que marca o a omitido; a forma padrão é I’m.', second: 'I’am mantém o a e coloca o apóstrofo fora da omissão; I am se contrai em I’m.' },
  vi: { prompt: 'Chọn dạng rút gọn chính xác của I am.', first: 'Im có thể nghe giống nhưng thiếu dấu nháy đánh dấu chữ a bị lược; dạng chuẩn là I’m.', second: 'I’am vẫn giữ a và đặt dấu sai chỗ; I am rút gọn thành I’m.' },
  id: { prompt: 'Pilih kontraksi I am yang tepat.', first: 'Im mungkin terdengar sama, tetapi kehilangan apostrof yang menandai a yang dihilangkan; bentuk bakunya I’m.', second: 'I’am mempertahankan a dan menaruh apostrof bukan di tempat penghilangan; I am menjadi I’m.' },
  tr: { prompt: 'I am için doğru kısaltmayı seçin.', first: 'Im aynı duyulabilir ama düşen a’yı gösteren kesme işaretini kaybeder; standart biçim I’m olur.', second: 'I’am a harfini korur ve işareti yanlış yere koyar; I am, I’m diye kısalır.' },
  pl: { prompt: 'Wybierz dokładny skrót I am.', first: 'Im może brzmieć tak samo, ale gubi apostrof oznaczający pominięte a; standardowa forma to I’m.', second: 'I’am zachowuje a i stawia apostrof poza miejscem pominięcia; I am skraca się do I’m.' },
};

const NOT_COPY: Readonly<Record<Locale, WordCopy>> = {
  ru: { prompt: 'Выберите отрицание после I’m.', first: 'No обычно отвечает «нет» отдельно и не встаёт между I’m и состоянием; внутри фразы нужно not.', second: 'Now означает «сейчас» и похоже начинается, но не отрицает занятость; отрицание — not.' },
  uk: { prompt: 'Оберіть заперечення після I’m.', first: 'No зазвичай окремо відповідає «ні» й не стає між I’m та станом; у фразі потрібне not.', second: 'Now означає «зараз» і схоже починається, але не заперечує зайнятість; заперечення — not.' },
  es: { prompt: 'Elige la negación después de I’m.', first: 'No suele responder «no» por separado y no ocupa esta posición entre I’m y el estado; aquí se necesita not.', second: 'Now significa «ahora» y empieza parecido, pero no niega la ocupación; la negación es not.' },
  'pt-BR': { prompt: 'Escolha a negação depois de I’m.', first: 'No costuma responder «não» sozinho e não ocupa esta posição entre I’m e o estado; aqui é necessário not.', second: 'Now significa «agora» e começa parecido, mas não nega a ocupação; a negação é not.' },
  vi: { prompt: 'Chọn từ phủ định sau I’m.', first: 'No thường là câu trả lời “không” độc lập và không đứng giữa I’m với trạng thái; trong câu cần not.', second: 'Now nghĩa là “bây giờ” và có đầu gần giống nhưng không phủ định sự bận; từ phủ định là not.' },
  id: { prompt: 'Pilih penyangkalan setelah I’m.', first: 'No biasanya merupakan jawaban “tidak” mandiri dan tidak mengisi posisi antara I’m dan keadaan; di sini diperlukan not.', second: 'Now berarti “sekarang” dan berawal mirip, tetapi tidak menyangkal kesibukan; penyangkalannya not.' },
  tr: { prompt: 'I’m sonrasındaki olumsuzluğu seçin.', first: 'No çoğunlukla bağımsız “hayır” cevabıdır ve I’m ile durum arasına girmez; burada not gerekir.', second: 'Now “şimdi” demektir ve benzer başlar ama meşguliyeti olumsuz yapmaz; olumsuzluk not olur.' },
  pl: { prompt: 'Wybierz przeczenie po I’m.', first: 'No zwykle jest osobną odpowiedzią „nie” i nie stoi między I’m a stanem; wewnątrz zdania potrzebne jest not.', second: 'Now znaczy „teraz” i ma podobny początek, ale nie neguje zajętości; przeczenie to not.' },
};

const STATE_COPY: Readonly<Record<State, Readonly<Record<Locale, WordCopy>>>> = {
  here: Object.freeze({
    ru: { prompt: 'Выберите место «здесь».', first: 'There означает «там» и меняет расстояние; место рядом с говорящим — here.', second: 'Where означает «где» и задаёт вопрос; утверждение «здесь» использует here.' },
    uk: { prompt: 'Оберіть місце «тут».', first: 'There означає «там» і змінює відстань; місце біля мовця — here.', second: 'Where означає «де» й ставить питання; твердження «тут» використовує here.' },
    es: { prompt: 'Elige el lugar «aquí».', first: 'There significa «allí» y cambia la distancia; el lugar junto al hablante es here.', second: 'Where significa «dónde» y formula una pregunta; la afirmación «aquí» usa here.' },
    'pt-BR': { prompt: 'Escolha o lugar «aqui».', first: 'There significa «lá» e muda a distância; o lugar junto de quem fala é here.', second: 'Where significa «onde» e faz uma pergunta; a afirmação «aqui» usa here.' },
    vi: { prompt: 'Chọn nơi “ở đây”.', first: 'There nghĩa là “ở đó” và đổi khoảng cách; nơi gần người nói là here.', second: 'Where nghĩa là “ở đâu” và tạo câu hỏi; lời khẳng định “ở đây” dùng here.' },
    id: { prompt: 'Pilih tempat “di sini”.', first: 'There berarti “di sana” dan mengubah jarak; tempat dekat penutur adalah here.', second: 'Where berarti “di mana” dan membuat pertanyaan; pernyataan “di sini” memakai here.' },
    tr: { prompt: '“Burada” yerini seçin.', first: 'There “orada” demektir ve mesafeyi değiştirir; konuşanın yanı here olur.', second: 'Where “nerede” demektir ve soru kurar; “burada” bildirimi here kullanır.' },
    pl: { prompt: 'Wybierz miejsce „tutaj”.', first: 'There znaczy „tam” i zmienia odległość; miejsce przy mówiącym to here.', second: 'Where znaczy „gdzie” i tworzy pytanie; stwierdzenie „tutaj” używa here.' },
  }),
  ready: Object.freeze({
    ru: { prompt: 'Выберите состояние «готов».', first: 'Already означает «уже» и не называет готовность само по себе; состояние — ready.', second: 'Steady означает «устойчивый / ровный» и лишь похоже заканчивается; готовность передаёт ready.' },
    uk: { prompt: 'Оберіть стан «готовий».', first: 'Already означає «вже» й саме не називає готовність; стан — ready.', second: 'Steady означає «стійкий / рівний» і лише схоже закінчується; готовність передає ready.' },
    es: { prompt: 'Elige el estado «listo».', first: 'Already significa «ya» y no nombra preparación por sí solo; el estado es ready.', second: 'Steady significa «estable» y solo tiene un final parecido; la preparación es ready.' },
    'pt-BR': { prompt: 'Escolha o estado «pronto».', first: 'Already significa «já» e não nomeia prontidão sozinho; o estado é ready.', second: 'Steady significa «estável» e apenas tem final parecido; prontidão é ready.' },
    vi: { prompt: 'Chọn trạng thái “sẵn sàng”.', first: 'Already nghĩa là “đã / rồi” và tự nó không nói sẵn sàng; trạng thái là ready.', second: 'Steady nghĩa là “ổn định” và chỉ có phần cuối gần giống; sẵn sàng là ready.' },
    id: { prompt: 'Pilih keadaan “siap”.', first: 'Already berarti “sudah” dan tidak menamai kesiapan sendiri; keadaannya ready.', second: 'Steady berarti “stabil” dan hanya memiliki akhir mirip; kesiapan adalah ready.' },
    tr: { prompt: '“Hazır” durumunu seçin.', first: 'Already “zaten/çoktan” demektir ve tek başına hazır olmayı adlandırmaz; durum ready olur.', second: 'Steady “sabit/dengeli” demektir ve yalnızca benzer biter; hazır olma ready ile anlatılır.' },
    pl: { prompt: 'Wybierz stan „gotowy”.', first: 'Already znaczy „już” i samo nie nazywa gotowości; stan to ready.', second: 'Steady znaczy „stabilny” i tylko podobnie się kończy; gotowość wyraża ready.' },
  }),
  happy: Object.freeze({
    ru: { prompt: 'Выберите состояние «рад / счастлив».', first: 'Heavy означает «тяжёлый» и лишь похоже звучит; радость передаёт happy.', second: 'Unhappy содержит happy, но приставка un- разворачивает смысл в «несчастный»; без неё happy означает радость.' },
    uk: { prompt: 'Оберіть стан «радий / щасливий».', first: 'Heavy означає «важкий» і лише схоже звучить; радість передає happy.', second: 'Unhappy містить happy, але префікс un- змінює зміст на «нещасний»; без нього happy означає радість.' },
    es: { prompt: 'Elige el estado «feliz».', first: 'Heavy significa «pesado» y solo suena parecido; la alegría es happy.', second: 'Unhappy contiene happy, pero un- invierte el sentido a «infeliz»; sin ese prefijo, happy expresa alegría.' },
    'pt-BR': { prompt: 'Escolha o estado «feliz».', first: 'Heavy significa «pesado» e apenas soa parecido; alegria é happy.', second: 'Unhappy contém happy, mas un- inverte o sentido para «infeliz»; sem o prefixo, happy expressa alegria.' },
    vi: { prompt: 'Chọn trạng thái “vui / hạnh phúc”.', first: 'Heavy nghĩa là “nặng” và chỉ nghe gần giống; niềm vui là happy.', second: 'Unhappy có happy nhưng tiền tố un- đổi nghĩa thành “không vui”; không có un- thì happy là vui.' },
    id: { prompt: 'Pilih keadaan “senang / bahagia”.', first: 'Heavy berarti “berat” dan hanya berbunyi mirip; rasa senang adalah happy.', second: 'Unhappy memuat happy, tetapi awalan un- membalik arti menjadi “tidak bahagia”; tanpa un-, happy berarti senang.' },
    tr: { prompt: '“Mutlu” durumunu seçin.', first: 'Heavy “ağır” demektir ve yalnızca benzer duyulur; sevinç happy ile anlatılır.', second: 'Unhappy içinde happy vardır ama un- öneki anlamı “mutsuz” yapar; öneksiz happy mutluluk demektir.' },
    pl: { prompt: 'Wybierz stan „szczęśliwy”.', first: 'Heavy znaczy „ciężki” i tylko podobnie brzmi; radość wyraża happy.', second: 'Unhappy zawiera happy, ale przedrostek un- odwraca sens na „nieszczęśliwy”; bez niego happy oznacza radość.' },
  }),
  tired: Object.freeze({
    ru: { prompt: 'Выберите состояние «устал».', first: 'Wired рифмуется с tired, но означает «взвинченный / на нервах»; нехватку сил называет tired.', second: 'Fired отличается первым звуком и означает «уволен»; усталость передаёт tired.' },
    uk: { prompt: 'Оберіть стан «втомився / втомилася».', first: 'Wired римується з tired, але означає «збуджений / на нервах»; брак сил називає tired.', second: 'Fired відрізняється першим звуком і означає «звільнений»; втому передає tired.' },
    es: { prompt: 'Elige el estado «cansado».', first: 'Wired rima con tired, pero significa «nervioso / acelerado»; falta de energía es tired.', second: 'Fired cambia el primer sonido y significa «despedido»; el cansancio es tired.' },
    'pt-BR': { prompt: 'Escolha o estado «cansado».', first: 'Wired rima com tired, mas significa «agitado / elétrico»; falta de energia é tired.', second: 'Fired muda o primeiro som e significa «demitido»; cansaço é tired.' },
    vi: { prompt: 'Chọn trạng thái “mệt”.', first: 'Wired vần với tired nhưng nghĩa là “căng thẳng / kích động”; thiếu sức là tired.', second: 'Fired đổi âm đầu và nghĩa là “bị sa thải”; trạng thái mệt là tired.' },
    id: { prompt: 'Pilih keadaan “lelah”.', first: 'Wired berima dengan tired, tetapi berarti “tegang / terlalu bersemangat”; kekurangan tenaga adalah tired.', second: 'Fired mengganti bunyi awal dan berarti “dipecat”; keadaan lelah adalah tired.' },
    tr: { prompt: '“Yorgun” durumunu seçin.', first: 'Wired tired ile kafiyelidir ama “gergin / aşırı uyarılmış” demektir; enerji eksikliği tired olur.', second: 'Fired ilk sesi değiştirir ve “işten çıkarılmış” demektir; yorgunluk tired ile anlatılır.' },
    pl: { prompt: 'Wybierz stan „zmęczony”.', first: 'Wired rymuje się z tired, ale znaczy „pobudzony / spięty”; brak sił to tired.', second: 'Fired zmienia pierwszy dźwięk i znaczy „zwolniony”; zmęczenie wyraża tired.' },
  }),
  fine: Object.freeze({
    ru: { prompt: 'Выберите спокойное «всё нормально».', first: 'Kind рифмуется с fine, но означает «добрый»; ответ о самочувствии — fine.', second: 'Blind имеет похожий конец, но означает «слепой»; спокойное «нормально» передаёт fine.' },
    uk: { prompt: 'Оберіть спокійне «усе нормально».', first: 'Kind римується з fine, але означає «добрий»; відповідь про самопочуття — fine.', second: 'Blind має схожий кінець, але означає «сліпий»; спокійне «нормально» передає fine.' },
    es: { prompt: 'Elige el estado tranquilo «bien».', first: 'Kind rima con fine, pero significa «amable»; la respuesta sobre el estado es fine.', second: 'Blind tiene un final parecido, pero significa «ciego»; «bien» corresponde a fine.' },
    'pt-BR': { prompt: 'Escolha o estado tranquilo «bem».', first: 'Kind rima com fine, mas significa «gentil»; a resposta sobre o estado é fine.', second: 'Blind tem final parecido, mas significa «cego»; «bem» corresponde a fine.' },
    vi: { prompt: 'Chọn trạng thái bình thản “ổn”.', first: 'Kind vần gần fine nhưng nghĩa là “tốt bụng”; trạng thái “ổn” là fine.', second: 'Blind có phần cuối gần giống nhưng nghĩa là “mù”; câu trả lời “ổn” là fine.' },
    id: { prompt: 'Pilih keadaan tenang “baik-baik saja”.', first: 'Kind berima dekat dengan fine, tetapi berarti “baik hati”; jawaban keadaan adalah fine.', second: 'Blind memiliki akhir mirip, tetapi berarti “buta”; “baik-baik saja” adalah fine.' },
    tr: { prompt: 'Sakin “iyiyim” durumunu seçin.', first: 'Kind fine ile yakın uyaklıdır ama “nazik” demektir; durum cevabı fine olur.', second: 'Blind benzer son taşır ama “kör” demektir; sakin “iyiyim” cevabı fine olur.' },
    pl: { prompt: 'Wybierz spokojny stan „w porządku”.', first: 'Kind rymuje się z fine, ale znaczy „życzliwy”; odpowiedź o samopoczuciu to fine.', second: 'Blind ma podobne zakończenie, lecz znaczy „niewidomy”; spokojne „w porządku” to fine.' },
  }),
  busy: Object.freeze({
    ru: { prompt: 'Выберите состояние «занят».', first: 'Dizzy рифмуется с busy, но означает «с головокружением»; отсутствие свободного времени — busy.', second: 'Lazy тоже описывает человека, но означает «ленивый»; человек с делами сейчас busy.' },
    uk: { prompt: 'Оберіть стан «зайнятий».', first: 'Dizzy римується з busy, але означає «із запамороченням»; відсутність вільного часу — busy.', second: 'Lazy теж описує людину, але означає «лінивий»; людина зі справами зараз busy.' },
    es: { prompt: 'Elige el estado «ocupado».', first: 'Dizzy rima con busy, pero significa «mareado»; no tener tiempo libre es busy.', second: 'Lazy también describe a una persona, pero significa «perezoso»; quien tiene cosas que hacer está busy.' },
    'pt-BR': { prompt: 'Escolha o estado «ocupado».', first: 'Dizzy rima com busy, mas significa «tonto»; não ter tempo livre é busy.', second: 'Lazy também descreve pessoa, mas significa «preguiçoso»; quem tem tarefas está busy.' },
    vi: { prompt: 'Chọn trạng thái “bận”.', first: 'Dizzy vần với busy nhưng nghĩa là “chóng mặt”; không rảnh là busy.', second: 'Lazy cũng tả người nhưng nghĩa là “lười”; người đang có việc là busy.' },
    id: { prompt: 'Pilih keadaan “sibuk”.', first: 'Dizzy berima dengan busy, tetapi berarti “pusing”; tidak punya waktu bebas adalah busy.', second: 'Lazy juga menggambarkan orang, tetapi berarti “malas”; orang yang punya urusan sedang busy.' },
    tr: { prompt: '“Meşgul” durumunu seçin.', first: 'Dizzy busy ile kafiyelidir ama “başı dönen” demektir; boş zamanı olmamak busy olur.', second: 'Lazy de kişiyi anlatır ama “tembel” demektir; işi olan kişi busy durumundadır.' },
    pl: { prompt: 'Wybierz stan „zajęty”.', first: 'Dizzy rymuje się z busy, ale znaczy „mający zawroty głowy”; brak wolnego czasu to busy.', second: 'Lazy też opisuje osobę, ale znaczy „leniwy”; ktoś mający zajęcie jest busy.' },
  }),
};

const TRAPS: Readonly<Record<State, readonly [Readonly<{ value: string; trapType: TrapType }>, Readonly<{ value: string; trapType: TrapType }>]>> = {
  here: [{ value: 'there', trapType: 'semantic_neighbor' }, { value: 'where', trapType: 'semantic_neighbor' }],
  ready: [{ value: 'already', trapType: 'semantic_neighbor' }, { value: 'steady', trapType: 'phonetic' }],
  happy: [{ value: 'heavy', trapType: 'phonetic' }, { value: 'unhappy', trapType: 'semantic_neighbor' }],
  tired: [{ value: 'wired', trapType: 'phonetic' }, { value: 'fired', trapType: 'phonetic' }],
  fine: [{ value: 'kind', trapType: 'phonetic' }, { value: 'blind', trapType: 'phonetic' }],
  busy: [{ value: 'dizzy', trapType: 'phonetic' }, { value: 'lazy', trapType: 'semantic_neighbor' }],
};

const PHRASE_COPY: Readonly<Record<string, Readonly<Record<Locale, PhraseCopy>>>> = {
  "I'm here": {
    ru: { meaning: 'Я здесь', explanation: 'Так коротко сообщают своё местоположение. I’m сохраняет полную связь I am, а here указывает место рядом с говорящим.' }, uk: { meaning: 'Я тут', explanation: 'Так коротко повідомляють своє місце. I’m зберігає повний зв’язок I am, а here вказує на місце біля мовця.' }, es: { meaning: 'Estoy aquí', explanation: 'Así se comunica brevemente la ubicación. I’m conserva la unión completa I am y here señala el lugar junto al hablante.' }, 'pt-BR': { meaning: 'Estou aqui', explanation: 'Assim se comunica brevemente a localização. I’m preserva a ligação completa I am, e here aponta o lugar junto de quem fala.' }, vi: { meaning: 'Tôi ở đây', explanation: 'Câu này nói ngắn gọn vị trí của người nói. I’m vẫn chứa cấu trúc I am, còn here chỉ nơi gần người nói.' }, id: { meaning: 'Saya di sini', explanation: 'Kalimat ini menyatakan lokasi secara singkat. I’m mempertahankan susunan I am dan here menunjuk tempat dekat penutur.' }, tr: { meaning: 'Buradayım', explanation: 'Bu söz konumu kısa biçimde bildirir. I’m tam I am bağlantısını korur, here ise konuşanın bulunduğu yeri gösterir.' }, pl: { meaning: 'Jestem tutaj', explanation: 'Tak krótko podaje się swoje miejsce. I’m zachowuje pełne połączenie I am, a here wskazuje miejsce przy mówiącym.' },
  },
  "I'm ready": {
    ru: { meaning: 'Я готов / готова', explanation: 'Так говорят, когда можно начинать. I’m — короткое I am, а ready называет готовность и не меняется из-за пола говорящего.' }, uk: { meaning: 'Я готовий / готова', explanation: 'Так говорять, коли можна починати. I’m — коротке I am, а ready називає готовність і не змінюється через стать мовця.' }, es: { meaning: 'Estoy listo / lista', explanation: 'Se usa cuando se puede empezar. I’m es la forma corta de I am y ready expresa preparación sin cambiar por género.' }, 'pt-BR': { meaning: 'Estou pronto / pronta', explanation: 'Usa-se quando já se pode começar. I’m é a forma curta de I am, e ready expressa prontidão sem variar em gênero.' }, vi: { meaning: 'Tôi sẵn sàng', explanation: 'Câu này dùng khi có thể bắt đầu. I’m là dạng ngắn của I am, còn ready gọi tên trạng thái sẵn sàng.' }, id: { meaning: 'Saya siap', explanation: 'Kalimat ini dipakai saat seseorang dapat mulai. I’m adalah bentuk singkat I am dan ready menyatakan kesiapan.' }, tr: { meaning: 'Hazırım', explanation: 'Başlamaya hazır olunduğunda söylenir. I’m kısa I am biçimidir, ready ise hazır olma durumunu anlatır.' }, pl: { meaning: 'Jestem gotowy / gotowa', explanation: 'Tak mówi się, gdy można zaczynać. I’m jest krótkim I am, a ready nazywa gotowość i nie zmienia formy przez rodzaj.' },
  },
  "I'm happy": {
    ru: { meaning: 'Я счастлив / счастлива', explanation: 'Так прямо называют радостное состояние. I’m сжимает I am, а happy передаёт радость одной и той же формой для любого говорящего.' }, uk: { meaning: 'Я щасливий / щаслива', explanation: 'Так прямо називають радісний стан. I’m стискає I am, а happy передає радість однаковою формою для будь-якого мовця.' }, es: { meaning: 'Estoy feliz / contento / contenta', explanation: 'Así se nombra directamente la alegría. I’m contrae I am y happy expresa el estado alegre con una sola forma inglesa.' }, 'pt-BR': { meaning: 'Estou feliz / contente', explanation: 'Assim se nomeia diretamente a alegria. I’m contrai I am, e happy expressa o estado alegre com uma única forma inglesa.' }, vi: { meaning: 'Tôi vui / hạnh phúc', explanation: 'Câu này trực tiếp gọi tên niềm vui. I’m rút gọn I am, còn happy diễn tả trạng thái vui.' }, id: { meaning: 'Saya senang / bahagia', explanation: 'Kalimat ini langsung menamai rasa senang. I’m menyingkat I am dan happy menyatakan keadaan gembira.' }, tr: { meaning: 'Mutluyum', explanation: 'Bu söz sevinci doğrudan adlandırır. I’m, I am biçimini kısaltır; happy ise mutluluk durumunu anlatır.' }, pl: { meaning: 'Jestem szczęśliwy / szczęśliwa', explanation: 'Tak wprost nazywa się radość. I’m skraca I am, a happy wyraża radosny stan jedną angielską formą.' },
  },
  "I'm tired": {
    ru: { meaning: 'Я устал / устала', explanation: 'Так сообщают, что сил стало мало. I’m сохраняет I am в коротком виде, а tired точно называет усталость.' }, uk: { meaning: 'Я втомився / втомилася', explanation: 'Так повідомляють, що сил стало мало. I’m зберігає I am у короткому вигляді, а tired точно називає втому.' }, es: { meaning: 'Estoy cansado / cansada', explanation: 'Se usa cuando falta energía. I’m conserva I am en forma corta y tired nombra exactamente el cansancio.' }, 'pt-BR': { meaning: 'Estou cansado / cansada', explanation: 'Usa-se quando falta energia. I’m preserva I am na forma curta, e tired nomeia exatamente o cansaço.' }, vi: { meaning: 'Tôi mệt', explanation: 'Câu này dùng khi người nói thiếu sức. I’m giữ I am ở dạng ngắn, còn tired gọi đúng trạng thái mệt.' }, id: { meaning: 'Saya lelah', explanation: 'Kalimat ini dipakai saat tenaga berkurang. I’m mempertahankan I am dalam bentuk singkat dan tired menamai kelelahan.' }, tr: { meaning: 'Yorgunum', explanation: 'Enerji azaldığında söylenir. I’m, I am yapısını kısa biçimde korur; tired yorgunluğu adlandırır.' }, pl: { meaning: 'Jestem zmęczony / zmęczona', explanation: 'Tak mówi się przy braku sił. I’m zachowuje I am w krótkiej postaci, a tired dokładnie nazywa zmęczenie.' },
  },
  "I'm fine": {
    ru: { meaning: 'Я в порядке / У меня всё нормально', explanation: 'Это спокойный ответ о нормальном самочувствии. I’m — короткое I am, а fine сообщает, что всё в порядке.' }, uk: { meaning: 'Я в порядку / У мене все нормально', explanation: 'Це спокійна відповідь про нормальне самопочуття. I’m — коротке I am, а fine повідомляє, що все гаразд.' }, es: { meaning: 'Estoy bien', explanation: 'Es una respuesta tranquila sobre un estado normal. I’m es la forma corta de I am y fine comunica que todo está bien.' }, 'pt-BR': { meaning: 'Estou bem', explanation: 'É uma resposta tranquila sobre um estado normal. I’m é a forma curta de I am, e fine comunica que está tudo bem.' }, vi: { meaning: 'Tôi ổn', explanation: 'Đây là câu trả lời bình thản rằng trạng thái vẫn ổn. I’m là dạng ngắn của I am, còn fine báo rằng mọi thứ bình thường.' }, id: { meaning: 'Saya baik-baik saja', explanation: 'Ini jawaban tenang tentang keadaan yang baik. I’m adalah bentuk singkat I am dan fine menyatakan bahwa keadaan normal.' }, tr: { meaning: 'İyiyim', explanation: 'Bu, durumun normal olduğunu söyleyen sakin bir cevaptır. I’m kısa I am biçimidir, fine ise her şeyin iyi olduğunu bildirir.' }, pl: { meaning: 'Wszystko u mnie w porządku', explanation: 'To spokojna odpowiedź o normalnym samopoczuciu. I’m jest krótkim I am, a fine mówi, że wszystko jest w porządku.' },
  },
  "I'm busy": {
    ru: { meaning: 'Я занят / занята', explanation: 'Так сообщают, что сейчас есть дела и нет свободного времени. I’m соединяет говорящего с состоянием, а busy называет занятость.' }, uk: { meaning: 'Я зайнятий / зайнята', explanation: 'Так повідомляють, що зараз є справи й немає вільного часу. I’m пов’язує мовця зі станом, а busy називає зайнятість.' }, es: { meaning: 'Estoy ocupado / ocupada', explanation: 'Así se dice que hay cosas que hacer y no hay tiempo libre ahora. I’m enlaza al hablante con el estado y busy nombra la ocupación.' }, 'pt-BR': { meaning: 'Estou ocupado / ocupada', explanation: 'Assim se diz que há tarefas e não há tempo livre agora. I’m liga quem fala ao estado, e busy nomeia a ocupação.' }, vi: { meaning: 'Tôi bận', explanation: 'Câu này cho biết người nói đang có việc và không rảnh. I’m nối người nói với trạng thái, còn busy gọi tên sự bận rộn.' }, id: { meaning: 'Saya sibuk', explanation: 'Kalimat ini menyatakan bahwa penutur punya urusan dan tidak bebas sekarang. I’m menghubungkan penutur dengan keadaan, dan busy menamai kesibukan.' }, tr: { meaning: 'Meşgulüm', explanation: 'Şu anda iş olduğunu ve boş zaman bulunmadığını bildirir. I’m konuşanı duruma bağlar, busy ise meşguliyeti adlandırır.' }, pl: { meaning: 'Jestem zajęty / zajęta', explanation: 'Tak mówi się, że są sprawy do zrobienia i nie ma teraz wolnego czasu. I’m łączy mówiącego ze stanem, a busy nazywa zajętość.' },
  },
  "I'm not busy": {
    ru: { meaning: 'Я не занят / не занята', explanation: 'Так уточняют, что сейчас есть свободное время. I’m сохраняет связь I am, not отрицает состояние, а busy называет именно занятость.' }, uk: { meaning: 'Я не зайнятий / не зайнята', explanation: 'Так уточнюють, що зараз є вільний час. I’m зберігає зв’язок I am, not заперечує стан, а busy називає саме зайнятість.' }, es: { meaning: 'No estoy ocupado / ocupada', explanation: 'Así se aclara que hay tiempo libre ahora. I’m conserva I am, not niega el estado y busy nombra específicamente la ocupación.' }, 'pt-BR': { meaning: 'Não estou ocupado / ocupada', explanation: 'Assim se esclarece que há tempo livre agora. I’m preserva I am, not nega o estado, e busy nomeia especificamente a ocupação.' }, vi: { meaning: 'Tôi không bận', explanation: 'Câu này làm rõ rằng lúc này người nói có thời gian rảnh. I’m giữ I am, not phủ định trạng thái, còn busy gọi tên sự bận.' }, id: { meaning: 'Saya tidak sibuk', explanation: 'Kalimat ini menjelaskan bahwa penutur memiliki waktu bebas sekarang. I’m mempertahankan I am, not menyangkal keadaan, dan busy menamai kesibukan.' }, tr: { meaning: 'Meşgul değilim', explanation: 'Şu anda boş zaman olduğunu açıklar. I’m, I am bağlantısını korur; not durumu olumsuz yapar, busy ise meşguliyeti adlandırır.' }, pl: { meaning: 'Nie jestem zajęty / zajęta', explanation: 'Tak wyjaśnia się, że jest teraz wolny czas. I’m zachowuje I am, not neguje stan, a busy nazywa właśnie zajętość.' },
  },
};

const CONTRACTION_WORD = { correct: "I'm", category: 'contraction', distractors: [
  { value: 'Im', reasonCode: "orthographic:I'm:missing_apostrophe", trapType: 'orthographic', why: 'Im теряет апостроф, который отмечает пропущенную a; стандартная форма — I’m.' },
  { value: "I'am", reasonCode: "orthographic:I'm:apostrophe_after_a", trapType: 'orthographic', why: 'I’am сохраняет a и ставит апостроф не на место пропуска; I am сокращается до I’m.' },
] } as const;
const NOT_WORD = { correct: 'not', category: 'negation', distractors: [
  { value: 'no', reasonCode: 'orthographic:not:missing_final_t', trapType: 'orthographic', why: 'No обычно отвечает «нет» отдельно; внутри отрицательной фразы нужно not.' },
  { value: 'now', reasonCode: 'phonetic:not:final_sound_changed', trapType: 'phonetic', why: 'Now означает «сейчас» и не отрицает состояние; отрицание — not.' },
] } as const;

function stateWord(state: State) {
  const traps = TRAPS[state];
  return { correct: state, category: state === 'here' ? 'adverb_place' : 'state_adjective', distractors: traps.map((trap, index) => ({ value: trap.value, reasonCode: `${trap.trapType}:${state}:${trap.value}:contrast`, trapType: trap.trapType, why: STATE_COPY[state].ru[index === 0 ? 'first' : 'second'] })) } as const;
}

function details(english: keyof typeof PHRASE_COPY, state: State, negative: boolean): NonNullable<EpisodeSourcePhrase['localizedDetails']> {
  const traps = TRAPS[state];
  return Object.fromEntries(LOCALES.map((locale) => {
    const contraction = CONTRACTION[locale];
    const stateCopy = STATE_COPY[state][locale];
    const phrase = PHRASE_COPY[english][locale];
    const contractionDistractors = [
      { value: 'Im', reason: contraction.first, trapType: 'orthographic' as const },
      { value: "I'am", reason: contraction.second, trapType: 'orthographic' as const },
    ];
    const notCopy = NOT_COPY[locale];
    const notDistractors = [
      { value: 'no', reason: notCopy.first, trapType: 'orthographic' as const },
      { value: 'now', reason: notCopy.second, trapType: 'phonetic' as const },
    ];
    const lexicalDistractors = [
      { value: traps[0].value, reason: stateCopy.first, trapType: traps[0].trapType },
      { value: traps[1].value, reason: stateCopy.second, trapType: traps[1].trapType },
    ];
    const words: EpisodeSourcePhraseLocalizedDetails['words'] = [
      { correct: "I'm", prompt: contraction.prompt, distractors: contractionDistractors },
      ...(negative ? [{ correct: 'not', prompt: notCopy.prompt, distractors: notDistractors }] : []),
      { correct: state, prompt: stateCopy.prompt, distractors: lexicalDistractors },
    ];
    return [locale, {
      meaning: phrase.meaning,
      explanation: phrase.explanation,
      distractors: [...contractionDistractors, ...(negative ? notDistractors : []), ...lexicalDistractors],
      words,
    } satisfies EpisodeSourcePhraseLocalizedDetails];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
}

function phrase(english: keyof typeof PHRASE_COPY, state: State, negative = false): EpisodeSourcePhrase {
  return {
    id: `e01-s04-word-first-${english.toLowerCase().replace(/[^a-z]+/gu, '-')}`,
    english,
    russian: PHRASE_COPY[english].ru.meaning,
    explanation: PHRASE_COPY[english].ru.explanation,
    words: [CONTRACTION_WORD, ...(negative ? [NOT_WORD] : []), stateWord(state)],
    localizedDetails: details(english, state, negative),
    features: ['copula_be', 'first_person_singular', 'contraction_im', ...(negative ? ['negation_not'] : [])],
  };
}

export const EPISODE_01_SESSION_04_WORD_FIRST_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze([
  phrase("I'm here", 'here'),
  phrase("I'm ready", 'ready'),
  phrase("I'm happy", 'happy'),
  phrase("I'm tired", 'tired'),
  phrase("I'm fine", 'fine'),
  phrase("I'm busy", 'busy'),
  phrase("I'm not busy", 'busy', true),
]);
