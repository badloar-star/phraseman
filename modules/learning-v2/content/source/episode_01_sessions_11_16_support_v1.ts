import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import type { SessionKind } from './episode_01_session_map_v1';
import type { LocalizedIntroRunsSource, LocalizedSource, SessionSource } from './session_shard_from_source_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];

const COPY: Record<Locale, { title: string; meaning: string; explain: string; choose: string; right: string; wrong: string }> = {
  ru: { title: 'Скажи это по-английски', meaning: 'Значение', explain: 'Эту фразу говорят в живой ситуации. Порядок слов показывает, кто и в какой форме связан с признаком или местом.', choose: 'Выберите готовую английскую фразу.', right: 'Верно: форма связки стоит на своём месте.', wrong: 'Проверьте порядок слов и форму связки.' },
  uk: { title: 'Скажи це англійською', meaning: 'Значення', explain: 'Цю фразу кажуть у живій ситуації. Порядок слів показує, хто і якою формою пов’язаний з ознакою або місцем.', choose: 'Оберіть готову англійську фразу.', right: 'Правильно: форма зв’язки стоїть на своєму місці.', wrong: 'Перевірте порядок слів і форму зв’язки.' },
  es: { title: 'Dilo en inglés', meaning: 'Significado', explain: 'Esta frase se usa en una situación real. El orden muestra quién se une a una cualidad o a un lugar.', choose: 'Elige la frase inglesa completa.', right: 'Correcto: la forma de be está en su lugar.', wrong: 'Revisa el orden y la forma de be.' },
  'pt-BR': { title: 'Diga em inglês', meaning: 'Significado', explain: 'Esta frase aparece em uma situação real. A ordem mostra quem se liga a uma característica ou lugar.', choose: 'Escolha a frase completa em inglês.', right: 'Certo: a forma de be está no lugar.', wrong: 'Confira a ordem e a forma de be.' },
  vi: { title: 'Nói bằng tiếng Anh', meaning: 'Nghĩa', explain: 'Câu này dùng trong tình huống thực. Trật tự từ cho biết ai gắn với đặc điểm hoặc địa điểm.', choose: 'Chọn câu tiếng Anh hoàn chỉnh.', right: 'Đúng: dạng be ở đúng vị trí.', wrong: 'Kiểm tra trật tự từ và dạng be.' },
  id: { title: 'Ucapkan dalam bahasa Inggris', meaning: 'Arti', explain: 'Kalimat ini dipakai dalam situasi nyata. Urutan kata menunjukkan siapa yang terhubung dengan sifat atau tempat.', choose: 'Pilih kalimat bahasa Inggris lengkap.', right: 'Benar: bentuk be berada di tempatnya.', wrong: 'Periksa urutan kata dan bentuk be.' },
  tr: { title: 'İngilizce söyle', meaning: 'Anlam', explain: 'Bu cümle gerçek bir durumda kullanılır. Sözcük sırası kimin bir özellik ya da yerle bağlandığını gösterir.', choose: 'Tam İngilizce cümleyi seçin.', right: 'Doğru: be biçimi yerinde.', wrong: 'Sözcük sırasını ve be biçimini kontrol edin.' },
  pl: { title: 'Powiedz to po angielsku', meaning: 'Znaczenie', explain: 'Tego zdania używa się w prawdziwej sytuacji. Szyk pokazuje, kto łączy się z cechą lub miejscem.', choose: 'Wybierz pełne zdanie po angielsku.', right: 'Dobrze: forma be jest na swoim miejscu.', wrong: 'Sprawdź szyk i formę be.' },
};

const BODY: Record<Locale, readonly [string, string, string]> = {
  ru: ['В английском вопрос часто начинается со связки, потому что именно она показывает форму высказывания. Сначала произнесите связку, затем человека, к которому обращён вопрос. Так собеседник сразу слышит, что вы спрашиваете, а не утверждаете. Готовая фраза нужна в реальном разговоре, когда вы уточняете состояние или место.', 'В устойчивом порядке каждое слово делает свою работу. Связка на первом месте превращает знакомые слова в вопрос, а местоимение остаётся после неё. Признак или место ставят в конце, поэтому смысл слышен без догадки. Такой порядок полезно произносить целиком, чтобы не переставлять слова по привычке.', 'Не переносите порядок слов из утверждения в вопрос без изменения. Если связка остаётся после местоимения, звучит утверждение, хотя голос может быть вопросительным. Отрицание, когда оно нужно, идёт после связки и перед признаком. Проверьте фразу целиком: она должна точно передавать то, что вы хотите узнать.'],
  uk: ['В англійському запитання часто починається зі зв’язки, бо саме вона показує форму вислову. Спочатку вимовте зв’язку, а потім людину, до якої звернене запитання. Так співрозмовник одразу чує, що ви питаєте, а не стверджуєте. Готова фраза потрібна в живій розмові, коли уточнюєте стан або місце.', 'У сталому порядку кожне слово має свою роботу. Зв’язка на початку перетворює знайомі слова на запитання, а займенник лишається після неї. Ознака або місце стоять наприкінці, тому зміст зрозумілий без здогадів. Цей порядок варто вимовляти цілком, щоб не міняти слова за звичкою.', 'Не залишайте порядок твердження у запитанні без зміни. Якщо зв’язка стоїть після займенника, це звучить як твердження, навіть з питальною інтонацією. Заперечення, коли воно потрібне, стоїть після зв’язки та перед ознакою. Перевірте весь вислів: він має точно передавати те, що ви хочете з’ясувати.'],
  es: ['En inglés, una pregunta suele empezar con la forma de be porque esa palabra muestra que preguntas. Di primero la forma de be y después la persona a quien preguntas. Así la otra persona oye la intención desde el inicio y no la confunde con una afirmación. La frase completa sirve para comprobar un estado o un lugar en una conversación real.', 'En este orden, cada palabra tiene una función clara. La forma de be al principio convierte palabras conocidas en una pregunta y el pronombre queda después. La cualidad o el lugar van al final, por eso el sentido llega sin adivinar. Pronuncia el orden entero para que no cambies las palabras por costumbre.', 'No mantengas el orden de una afirmación cuando quieres preguntar. Si be queda después del pronombre, suena a afirmación aunque suba la voz. Cuando hay negación, va después de be y antes de la cualidad. Revisa la frase entera: debe expresar exactamente lo que quieres comprobar.'],
  'pt-BR': ['Em inglês, uma pergunta costuma começar com a forma de be, porque essa palavra mostra que você pergunta. Diga primeiro a forma de be e depois a pessoa a quem pergunta. Assim a outra pessoa percebe a intenção logo no início e não ouve uma afirmação. A frase completa serve para confirmar um estado ou um lugar numa conversa real.', 'Nesta ordem, cada palavra tem um trabalho claro. A forma de be no começo transforma palavras conhecidas em pergunta e o pronome fica depois dela. A característica ou o lugar vem no fim, então o sentido chega sem adivinhação. Fale a ordem inteira para não trocar as palavras por hábito.', 'Não deixe a ordem de uma afirmação quando quer perguntar. Se be fica depois do pronome, soa como afirmação mesmo com a voz subindo. Quando há negação, ela fica depois de be e antes da característica. Confira a frase completa: ela deve dizer exatamente o que você quer confirmar.'],
  vi: ['Trong tiếng Anh, câu hỏi thường bắt đầu bằng dạng be vì từ đó cho người nghe biết bạn đang hỏi. Hãy nói dạng be trước rồi mới nói người được hỏi. Nhờ vậy người nghe nhận ra ý định ngay từ đầu và không nhầm với câu khẳng định. Câu hoàn chỉnh dùng để hỏi về trạng thái hoặc địa điểm trong tình huống thật.', 'Trong trật tự này, mỗi từ có nhiệm vụ rõ ràng. Dạng be ở đầu biến các từ quen thuộc thành câu hỏi và đại từ đứng sau nó. Đặc điểm hoặc địa điểm ở cuối nên ý nghĩa rõ ràng, không cần đoán. Hãy nói cả trật tự để không đổi chỗ từ theo thói quen.', 'Đừng giữ trật tự của câu khẳng định khi bạn muốn hỏi. Nếu be đứng sau đại từ, câu nghe như khẳng định dù giọng nói đi lên. Khi có phủ định, nó đứng sau be và trước đặc điểm. Hãy kiểm tra cả câu: câu phải nói đúng điều bạn muốn xác nhận.'],
  id: ['Dalam bahasa Inggris, pertanyaan sering dimulai dengan bentuk be karena kata itu menunjukkan bahwa kamu bertanya. Ucapkan bentuk be lebih dahulu, lalu orang yang kamu tanyai. Dengan begitu lawan bicara langsung mendengar maksudmu dan tidak mengira itu pernyataan. Kalimat lengkap ini dipakai untuk memastikan keadaan atau tempat dalam percakapan nyata.', 'Dalam urutan ini setiap kata memiliki tugas yang jelas. Bentuk be di awal mengubah kata-kata yang sudah dikenal menjadi pertanyaan dan kata ganti tetap sesudahnya. Sifat atau tempat berada di akhir sehingga maknanya tidak perlu ditebak. Ucapkan seluruh urutan agar kamu tidak menukar kata karena kebiasaan.', 'Jangan memakai urutan pernyataan saat ingin bertanya. Jika be berada setelah kata ganti, bunyinya menjadi pernyataan walaupun nada naik. Bila ada penyangkalan, letakkan setelah be dan sebelum sifat. Periksa kalimat lengkapnya: kalimat harus menyatakan tepat apa yang ingin kamu pastikan.'],
  tr: ['İngilizcede soru çoğu zaman be biçimiyle başlar; çünkü bu sözcük soru sorduğunuzu gösterir. Önce be biçimini, sonra soru yönelttiğiniz kişiyi söyleyin. Böylece karşıdaki kişi niyetinizi hemen duyar ve bunu bildirim sanmaz. Tam cümle, gerçek bir konuşmada bir durumu ya da yeri doğrulamak için kullanılır.', 'Bu dizilimde her sözcüğün görevi açıktır. Baştaki be biçimi tanıdık sözcükleri soruya çevirir ve zamir onun ardından gelir. Özellik ya da yer sonda bulunur; bu yüzden anlam tahmin gerektirmez. Sözcükleri alışkanlıkla değiştirmemek için dizilimi bütün olarak söyleyin.', 'Sormak isterken bildirim sırasını değiştirmeden bırakmayın. Be zamirden sonra kalırsa, ses yükselse bile bildirim gibi duyulur. Olumsuzluk gerektiğinde be sonrasında ve özellikten önce gelir. Tüm cümleyi kontrol edin: doğrulamak istediğiniz şeyi tam olarak söylemelidir.'],
  pl: ['W języku angielskim pytanie często zaczyna się od formy be, ponieważ to słowo pokazuje, że pytasz. Najpierw powiedz formę be, a potem osobę, do której kierujesz pytanie. Dzięki temu rozmówca od razu słyszy zamiar i nie bierze zdania za stwierdzenie. Pełne zdanie służy do sprawdzenia stanu albo miejsca w prawdziwej rozmowie.', 'W tym szyku każde słowo ma jasne zadanie. Forma be na początku zmienia znane słowa w pytanie, a zaimek zostaje po niej. Cecha albo miejsce stoją na końcu, więc sens nie wymaga zgadywania. Powiedz cały szyk, aby nie przestawiać słów z przyzwyczajenia.', 'Nie zostawiaj szyku oznajmującego, gdy chcesz zapytać. Jeśli be stoi po zaimku, zdanie brzmi jak stwierdzenie, nawet gdy głos idzie w górę. Gdy potrzebne jest przeczenie, stoi ono po be i przed cechą. Sprawdź całe zdanie: ma dokładnie wyrażać to, co chcesz potwierdzić.'],
};

const localized = (value: (locale: Locale) => string): LocalizedSource => Object.fromEntries(LOCALES.map((locale) => [locale, value(locale)])) as unknown as LocalizedSource;
const tokens = (english: string) => english.replace(/[?!.]/g, '').split(/\s+/).filter(Boolean);

const COMPLEMENTS: Record<Locale, Record<string, string>> = {
  ru: { ready: 'готов', okay: 'в порядке', here: 'здесь', busy: 'занят', tired: 'уставший', happy: 'счастлив', calm: 'спокоен', cold: 'мне холодно', warm: 'мне тепло', 'all right': 'всё в порядке', 'at home': 'дома', 'in class': 'на занятии', 'at work': 'на работе', 'in the park': 'в парке', 'at the station': 'на станции', 'on the bus': 'в автобусе', 'in the café': 'в кафе', sure: 'уверен' },
  uk: { ready: 'готовий', okay: 'гаразд', here: 'тут', busy: 'зайнятий', tired: 'втомлений', happy: 'щасливий', calm: 'спокійний', cold: 'мені холодно', warm: 'мені тепло', 'all right': 'усе гаразд', 'at home': 'вдома', 'in class': 'на занятті', 'at work': 'на роботі', 'in the park': 'у парку', 'at the station': 'на станції', 'on the bus': 'в автобусі', 'in the café': 'у кафе', sure: 'упевнений' },
  es: { ready: 'listo', okay: 'bien', here: 'aquí', busy: 'ocupado', tired: 'cansado', happy: 'feliz', calm: 'tranquilo', cold: 'con frío', warm: 'abrigado', 'all right': 'bien', 'at home': 'en casa', 'in class': 'en clase', 'at work': 'en el trabajo', 'in the park': 'en el parque', 'at the station': 'en la estación', 'on the bus': 'en el autobús', 'in the café': 'en el café', sure: 'seguro' },
  'pt-BR': { ready: 'pronto', okay: 'bem', here: 'aqui', busy: 'ocupado', tired: 'cansado', happy: 'feliz', calm: 'calmo', cold: 'com frio', warm: 'aquecido', 'all right': 'bem', 'at home': 'em casa', 'in class': 'na aula', 'at work': 'no trabalho', 'in the park': 'no parque', 'at the station': 'na estação', 'on the bus': 'no ônibus', 'in the café': 'no café', sure: 'seguro' },
  vi: { ready: 'sẵn sàng', okay: 'ổn', here: 'ở đây', busy: 'bận', tired: 'mệt', happy: 'vui', calm: 'bình tĩnh', cold: 'lạnh', warm: 'ấm', 'all right': 'ổn', 'at home': 'ở nhà', 'in class': 'ở lớp', 'at work': 'ở chỗ làm', 'in the park': 'ở công viên', 'at the station': 'ở nhà ga', 'on the bus': 'trên xe buýt', 'in the café': 'ở quán cà phê', sure: 'chắc chắn' },
  id: { ready: 'siap', okay: 'baik-baik saja', here: 'di sini', busy: 'sibuk', tired: 'lelah', happy: 'senang', calm: 'tenang', cold: 'kedinginan', warm: 'hangat', 'all right': 'baik-baik saja', 'at home': 'di rumah', 'in class': 'di kelas', 'at work': 'di tempat kerja', 'in the park': 'di taman', 'at the station': 'di stasiun', 'on the bus': 'di bus', 'in the café': 'di kafe', sure: 'yakin' },
  tr: { ready: 'hazır', okay: 'iyi', here: 'burada', busy: 'meşgul', tired: 'yorgun', happy: 'mutlu', calm: 'sakin', cold: 'üşümüş', warm: 'sıcak', 'all right': 'iyi', 'at home': 'evde', 'in class': 'derste', 'at work': 'işte', 'in the park': 'parkta', 'at the station': 'istasyonda', 'on the bus': 'otobüste', 'in the café': 'kafede', sure: 'emin' },
  pl: { ready: 'gotowy', okay: 'w porządku', here: 'tutaj', busy: 'zajęty', tired: 'zmęczony', happy: 'szczęśliwy', calm: 'spokojny', cold: 'zmarznięty', warm: 'ciepło', 'all right': 'w porządku', 'at home': 'w domu', 'in class': 'na zajęciach', 'at work': 'w pracy', 'in the park': 'w parku', 'at the station': 'na stacji', 'on the bus': 'w autobusie', 'in the café': 'w kawiarni', sure: 'pewny' },
};

function renderMeaning(locale: Locale, english: string): string {
  const clean = english.replace(/[?!.]/g, '');
  const question = /^(Are you|Am I)\b/.test(clean);
  const subject = clean.startsWith('Am I') || clean.startsWith('I am') ? 'I' : 'you';
  const negative = /\bnot\b/.test(clean);
  const complement = clean.replace(/^(?:Are you|Am I|You’re|You are|I am)(?: not)?\s*/, '');
  const c = COMPLEMENTS[locale][complement] ?? complement;
  const neg = negative ? 'not ' : '';
  if (locale === 'ru') return question ? `${subject === 'I' ? 'Я' : 'Ты'} ${negative ? 'не ' : ''}${c}?` : `${subject === 'I' ? 'Я' : 'Ты'} ${negative ? 'не ' : ''}${c}.`;
  if (locale === 'uk') return question ? `${subject === 'I' ? 'Я' : 'Ти'} ${negative ? 'не ' : ''}${c}?` : `${subject === 'I' ? 'Я' : 'Ти'} ${negative ? 'не ' : ''}${c}.`;
  if (locale === 'es') return question ? `¿${negative ? 'No ' : ''}${subject === 'I' ? 'estoy' : 'estás'} ${c}?` : `${negative ? 'No ' : ''}${subject === 'I' ? 'estoy' : 'estás'} ${c}.`;
  if (locale === 'pt-BR') return question ? `${subject === 'I' ? 'Estou' : 'Você está'} ${negative ? 'não ' : ''}${c}?` : `${subject === 'I' ? 'Eu não estou' : 'Você não está'} ${c}.`;
  if (locale === 'vi') return question ? `${subject === 'I' ? 'Tôi' : 'Bạn'} ${negative ? 'không ' : ''}${c} phải không?` : `${subject === 'I' ? 'Tôi' : 'Bạn'} ${negative ? 'không ' : ''}${c}.`;
  if (locale === 'id') return question ? `Apakah ${subject === 'I' ? 'saya' : 'kamu'} ${negative ? 'tidak ' : ''}${c}?` : `${subject === 'I' ? 'Saya' : 'Kamu'} ${negative ? 'tidak ' : ''}${c}.`;
  if (locale === 'tr') return question ? `${subject === 'I' ? 'Ben' : 'Sen'} ${c} ${negative ? 'değil ' : ''}${subject === 'I' ? 'miyim' : 'misin'}?` : `${subject === 'I' ? 'Ben' : 'Sen'} ${c}${negative ? ' değil' : ''}.`;
  return question ? `Czy ${subject === 'I' ? 'jestem' : 'jesteś'} ${negative ? 'nie ' : ''}${c}?` : `${negative ? 'Nie ' : ''}${subject === 'I' ? 'jestem' : 'jesteś'} ${c}.`;
}

const DISTRACTORS: Record<string, readonly string[]> = {
  I: ['You', 'me', 'my', 'we', 'it'], You: ['I', 'Me', 'My', 'We', 'It'], you: ['I', 'me', 'your', 'we', 'it'], am: ['are', 'is', 'be', 'was', 'were'], Are: ['Am', 'Is', 'Be', 'Was', 'Were'], Am: ['Are', 'Is', 'Be', 'Was', 'Were'], 'You’re': ['I’m', 'You', 'Your', 'We’re', 'They’re'], are: ['am', 'is', 'be', 'was', 'were'], not: ['no', 'never', 'none', 'now', 'note'],
  ready: ['busy', 'tired', 'sure', 'calm', 'late'], okay: ['ready', 'sure', 'well', 'calm', 'fine'], here: ['there', 'where', 'near', 'home', 'away'], busy: ['ready', 'tired', 'free', 'calm', 'late'], tired: ['ready', 'busy', 'calm', 'sure', 'happy'], happy: ['sad', 'calm', 'tired', 'busy', 'ready'], calm: ['busy', 'tired', 'happy', 'ready', 'sure'], cold: ['warm', 'cool', 'old', 'gold', 'called'], warm: ['cold', 'cool', 'calm', 'warmth', 'warn'], sure: ['ready', 'calm', 'busy', 'tired', 'safe'], 'all right': ['ready', 'busy', 'tired', 'sure', 'here'], 'at home': ['at work', 'in class', 'in the park', 'at the station', 'on the bus'], 'in class': ['at home', 'at work', 'in the park', 'at the station', 'on the bus'], 'at work': ['at home', 'in class', 'in the park', 'at the station', 'on the bus'], 'in the park': ['at home', 'in class', 'at work', 'at the station', 'on the bus'], 'at the station': ['at home', 'in class', 'at work', 'in the park', 'on the bus'], 'on the bus': ['at home', 'in class', 'at work', 'in the park', 'at the station'], 'in the café': ['at home', 'in class', 'at work', 'in the park', 'on the bus'],
};

const EXTRA_DISTRACTORS: Record<string, readonly string[]> = {
  all: ['some', 'every', 'most', 'many', 'any'], right: ['left', 'wrong', 'write', 'bright', 'light'],
  at: ['in', 'on', 'to', 'by', 'from'], in: ['at', 'on', 'to', 'by', 'from'], on: ['in', 'at', 'to', 'by', 'from'],
  the: ['a', 'an', 'this', 'that', 'my'], home: ['work', 'school', 'park', 'station', 'café'], class: ['home', 'work', 'park', 'station', 'café'], work: ['home', 'class', 'park', 'station', 'café'], park: ['home', 'class', 'work', 'station', 'café'], station: ['home', 'class', 'work', 'park', 'café'], bus: ['home', 'class', 'work', 'park', 'station'], café: ['home', 'class', 'work', 'park', 'station'],
};

function allDetails(english: string): Record<Locale, EpisodeSourcePhraseLocalizedDetails> {
  return Object.fromEntries(LOCALES.map((locale) => {
    const copy = COPY[locale];
    const words = tokens(english);
    const meaning = renderMeaning(locale, english);
    return [locale, {
      meaning,
      explanation: phraseExplanation(locale, english),
      distractors: words.slice(0, 5).map((word) => ({ value: (DISTRACTORS[word] ?? EXTRA_DISTRACTORS[word] ?? DISTRACTORS.ready)[0], reason: wordReason(locale, word, (DISTRACTORS[word] ?? EXTRA_DISTRACTORS[word] ?? DISTRACTORS.ready)[0], english) })),
      words: words.map((word) => ({ correct: word, prompt: `${copy.choose} ${word}`, distractors: (DISTRACTORS[word] ?? EXTRA_DISTRACTORS[word] ?? DISTRACTORS.ready).map((value) => ({ value, reason: wordReason(locale, word, value, english) })) })),
    }];
  })) as unknown as Record<Locale, EpisodeSourcePhraseLocalizedDetails>;
}

function phraseExplanation(locale: Locale, english: string): string {
  const question = /\?$/.test(english);
  const negative = /\bnot\b/.test(english);
  const location = /(home|class|work|park|station|bus|café)/.test(english);
  const point = question ? 'question' : negative ? 'negative' : location ? 'location' : 'state';
  const copy: Record<Locale, Record<string, string>> = {
    ru: { question: 'Это вопрос: связка стоит перед человеком, поэтому собеседник слышит просьбу уточнить.', negative: 'Это отрицание: not идёт после связки, поэтому смысл не меняется на утверждение.', location: 'Это готовое дополнение места: его говорят целиком, чтобы назвать, где находится человек.', state: 'Это естественное описание состояния: связка соединяет человека и его признак.' },
    uk: { question: 'Це запитання: зв’язка стоїть перед людиною, тому співрозмовник чує прохання уточнити.', negative: 'Це заперечення: not стоїть після зв’язки, тому зміст не стає твердженням.', location: 'Це готовий додаток місця: його вимовляють цілком, щоб назвати, де є людина.', state: 'Це природний опис стану: зв’язка поєднує людину та її ознаку.' },
    es: { question: 'Es una pregunta: be va antes de la persona y se oye que quieres confirmar algo.', negative: 'Es una negación: not va después de be y no convierte la frase en una afirmación.', location: 'Es un complemento de lugar completo: se dice entero para indicar dónde está la persona.', state: 'Es una descripción natural de un estado: be une a la persona con su cualidad.' },
    'pt-BR': { question: 'É uma pergunta: be vem antes da pessoa e deixa claro que você quer confirmar algo.', negative: 'É uma negação: not vem depois de be e não transforma a frase em afirmação.', location: 'É um complemento de lugar completo: ele é dito inteiro para indicar onde a pessoa está.', state: 'É uma descrição natural de um estado: be liga a pessoa à sua característica.' },
    vi: { question: 'Đây là câu hỏi: be đứng trước người nên người nghe biết bạn đang muốn xác nhận.', negative: 'Đây là câu phủ định: not đứng sau be nên câu không thành lời khẳng định.', location: 'Đây là cụm địa điểm hoàn chỉnh: hãy nói cả cụm để chỉ người đó ở đâu.', state: 'Đây là cách mô tả trạng thái tự nhiên: be nối người với đặc điểm của họ.' },
    id: { question: 'Ini pertanyaan: be berada sebelum orangnya sehingga lawan bicara tahu kamu ingin memastikan.', negative: 'Ini penyangkalan: not berada setelah be sehingga kalimat tidak menjadi pernyataan.', location: 'Ini pelengkap tempat yang utuh: ucapkan seluruhnya untuk menyatakan lokasi orang itu.', state: 'Ini gambaran keadaan yang alami: be menghubungkan orang dengan sifatnya.' },
    tr: { question: 'Bu bir sorudur: be kişiden önce gelir ve bir şeyi doğrulamak istediğiniz duyulur.', negative: 'Bu bir olumsuzluktur: not be sonrasında gelir, bu yüzden cümle bildirim olmaz.', location: 'Bu tam bir yer tamamlayıcısıdır: kişinin nerede olduğunu söylemek için bütünüyle kullanılır.', state: 'Bu doğal bir durum açıklamasıdır: be kişiyi özelliğine bağlar.' },
    pl: { question: 'To pytanie: be stoi przed osobą, więc rozmówca słyszy, że chcesz coś potwierdzić.', negative: 'To przeczenie: not stoi po be, dlatego zdanie nie staje się twierdzeniem.', location: 'To pełne określenie miejsca: wypowiada się je w całości, aby wskazać, gdzie jest osoba.', state: 'To naturalny opis stanu: be łączy osobę z jej cechą.' },
  };
  return `${english} — ${copy[locale][point]} ${COPY[locale].right}`;
}

function wordReason(locale: Locale, correct: string, alternative: string, english: string): string {
  const text: Record<Locale, string> = {
    ru: `«${alternative}» не подходит вместо «${correct}» в «${english}»: изменится человек, форма связки или названное место.`, uk: `«${alternative}» не підходить замість «${correct}» у «${english}»: зміниться особа, форма зв’язки або назване місце.`, es: `«${alternative}» no sirve en lugar de «${correct}» en «${english}»: cambiaría la persona, be o el lugar indicado.`, 'pt-BR': `«${alternative}» não serve no lugar de «${correct}» em «${english}»: mudaria a pessoa, be ou o lugar indicado.`, vi: `«${alternative}» không thay cho «${correct}» trong «${english}»: nó đổi người, dạng be hoặc địa điểm.`, id: `«${alternative}» tidak menggantikan «${correct}» dalam «${english}»: orang, bentuk be, atau tempatnya berubah.`, tr: `«${alternative}», «${english}» içinde «${correct}» yerine gelemez; kişi, be biçimi ya da yer değişir.`, pl: `«${alternative}» nie pasuje zamiast «${correct}» w «${english}»: zmieniłaby się osoba, be albo wskazane miejsce.`,
  };
  return text[locale];
}

function phrase(ordinal: number, index: number, english: string, features: readonly string[]): EpisodeSourcePhrase {
  const localizedDetails = allDetails(english);
  return {
    id: `e01-s${String(ordinal).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`,
    english,
    russian: localizedDetails.ru.meaning,
    explanation: phraseExplanation('ru', english),
    words: tokens(english).map((correct) => ({
      correct,
      category: /^(I|you|You)$/u.test(correct) ? 'pronoun' : /^(am|are|Are|Am)$/u.test(correct) ? 'to-be' : correct === 'not' ? 'negation' : 'lexical',
      distractors: (DISTRACTORS[correct] ?? EXTRA_DISTRACTORS[correct] ?? DISTRACTORS.ready).map((value) => ({ value, reasonCode: 'wrong_token', why: wordReason('ru', correct, value, english) })),
    })),
    localizedDetails,
    features,
  };
}

function runs(body: LocalizedSource, targets: readonly string[]): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale];
    const term = targets.find((target) => text.includes(target));
    if (!term) return [ { text, semantic: 'explanation' } ];
    const [before, after] = text.split(term);
    return [locale, [{ text: before, semantic: 'explanation' }, { text: term, semantic: 'targetCorrect' }, { text: after, semantic: 'explanation' }]];
  })) as LocalizedIntroRunsSource;
}

const SESSION_PHRASES: Record<number, readonly string[]> = {
  11: ['Are you ready?', 'Are you okay?', 'Are you here?', 'Are you busy?', 'Are you tired?', 'Are you happy?', 'Are you calm?', 'Are you cold?', 'Are you warm?', 'Are you at home?', 'Are you in class?', 'Are you on the bus?', 'Are you not ready?', 'Are you not sure?', 'Are you all right?'],
  12: ['Am I ready?', 'Am I okay?', 'Am I here?', 'Am I busy?', 'Am I tired?', 'Am I happy?', 'Am I calm?', 'Am I cold?', 'Am I warm?', 'Am I at home?', 'Am I in class?', 'Am I on the bus?', 'Am I not ready?', 'Am I not sure?', 'Am I all right?'],
  13: ["You’re ready.", "You’re okay.", "You’re here.", "You’re busy.", "You’re tired.", "You’re happy.", "You’re calm.", "You’re cold.", "You’re warm.", "You’re at home.", "You’re in class.", "You’re on the bus.", "You’re not ready.", "You’re not sure.", "You’re all right."],
  14: ['I am at home.', 'You are at home.', 'I am in class.', 'You are in class.', 'I am at work.', 'You are at work.', 'I am in the park.', 'You are in the park.', 'I am at the station.', 'You are at the station.', 'I am on the bus.', 'You are on the bus.', 'I am in the café.', 'You are in the café.', 'You are not at home.'],
  15: ['Are you ready?', 'Am I ready?', "You’re ready.", 'I am ready.', 'Are you okay?', 'Am I okay?', "You’re not busy.", 'I am not busy.', 'Are you at home?', 'Am I at home?', "You’re in class.", 'I am in class.', 'Are you not sure?', 'Am I not sure?', "You’re all right."],
  16: ['I am here.', 'You are here.', 'Are you here?', 'Am I here?', "You’re here.", 'I am not ready.', 'You are not ready.', 'Are you ready?', 'Am I ready?', "You’re not ready.", 'I am at home.', 'You are in class.', 'Are you on the bus?', 'Am I okay?', "You’re all right."],
};

const FEATURES: Record<number, readonly string[]> = { 11: ['copula_be', 'second_person', 'question_inversion'], 12: ['copula_be', 'first_person_singular', 'question_inversion'], 13: ['copula_be', 'second_person', 'contraction_youre', 'negation_not'], 14: ['copula_be', 'first_person_singular', 'second_person', 'place_noun', 'preposition_place'], 15: ['copula_be', 'first_person_singular', 'second_person', 'question_inversion', 'spoken_production'], 16: ['copula_be', 'first_person_singular', 'second_person', 'question_inversion', 'contraction_youre', 'place_noun'] };

const TOPIC: Record<number, Record<Locale, string>> = {
  11: { ru: 'Здесь вы спрашиваете собеседника через Are you, поэтому связка выходит вперёд.', uk: 'Тут ви питаєте співрозмовника через Are you, тому зв’язка виходить уперед.', es: 'Aquí preguntas a la otra persona con Are you, por eso be sale delante.', 'pt-BR': 'Aqui você pergunta à outra pessoa com Are you, por isso be vem primeiro.', vi: 'Ở đây bạn hỏi người đối diện bằng Are you, vì vậy be đứng đầu.', id: 'Di sini kamu bertanya kepada lawan bicara dengan Are you, jadi be berada di depan.', tr: 'Burada karşıdakine Are you ile sorarsınız; bu yüzden be öne gelir.', pl: 'Tutaj pytasz rozmówcę przez Are you, więc be wychodzi na początek.' },
  12: { ru: 'Здесь вопрос направлен на себя: Am I ставит am перед I.', uk: 'Тут запитання спрямоване на себе: Am I ставить am перед I.', es: 'Aquí la pregunta es sobre ti: Am I coloca am antes de I.', 'pt-BR': 'Aqui a pergunta é sobre você: Am I coloca am antes de I.', vi: 'Ở đây câu hỏi nói về chính bạn: Am I đặt am trước I.', id: 'Di sini pertanyaan tentang diri sendiri: Am I menempatkan am sebelum I.', tr: 'Burada soru kendinizledir: Am I, am biçimini I önüne koyar.', pl: 'Tutaj pytanie dotyczy ciebie: Am I stawia am przed I.' },
  13: { ru: 'Здесь You’re — разговорная короткая форма You are, а смысл остаётся тем же.', uk: 'Тут You’re — розмовна коротка форма You are, а зміст не змінюється.', es: 'Aquí You’re es la forma breve de You are y el sentido no cambia.', 'pt-BR': 'Aqui You’re é a forma curta de You are e o sentido não muda.', vi: 'Ở đây You’re là dạng ngắn của You are và nghĩa không đổi.', id: 'Di sini You’re adalah bentuk singkat You are dan maknanya tetap sama.', tr: 'Burada You’re, You are biçiminin kısa şeklidir ve anlam değişmez.', pl: 'Tutaj You’re to krótka forma You are, a znaczenie się nie zmienia.' },
  14: { ru: 'Здесь место называют готовым сочетанием: дома, в классе или в автобусе.', uk: 'Тут місце називають готовим поєднанням: удома, у класі або в автобусі.', es: 'Aquí el lugar se dice como bloque completo: en casa, en clase o en el autobús.', 'pt-BR': 'Aqui o lugar é dito como bloco completo: em casa, na aula ou no ônibus.', vi: 'Ở đây địa điểm được nói thành cụm hoàn chỉnh: ở nhà, ở lớp hoặc trên xe buýt.', id: 'Di sini tempat diucapkan sebagai kelompok utuh: di rumah, di kelas, atau di bus.', tr: 'Burada yer tam bir ifadeyle söylenir: evde, derste ya da otobüste.', pl: 'Tutaj miejsce mówi się jako całość: w domu, na zajęciach albo w autobusie.' },
  15: { ru: 'Здесь знакомые фразы нужны для спокойного произнесения вслух без новых правил.', uk: 'Тут знайомі фрази потрібні для спокійного вимовляння вголос без нових правил.', es: 'Aquí usas frases conocidas en voz alta, sin añadir ninguna regla nueva.', 'pt-BR': 'Aqui você fala frases conhecidas em voz alta, sem acrescentar regra nova.', vi: 'Ở đây bạn nói to những câu quen thuộc, không thêm quy tắc mới.', id: 'Di sini kamu mengucapkan kalimat yang sudah dikenal, tanpa aturan baru.', tr: 'Burada yeni kural eklemeden tanıdık cümleleri sesli söylersiniz.', pl: 'Tutaj mówisz głośno znane zdania, bez dodawania nowej zasady.' },
  16: { ru: 'Здесь соединяются знакомые I и you, вопросы, сокращение и места без новой формы.', uk: 'Тут поєднуються знайомі I та you, запитання, скорочення й місця без нової форми.', es: 'Aquí unes I y you conocidos, preguntas, la contracción y lugares sin forma nueva.', 'pt-BR': 'Aqui você junta I e you conhecidos, perguntas, contração e lugares sem forma nova.', vi: 'Ở đây bạn kết hợp I và you quen thuộc, câu hỏi, dạng ngắn và địa điểm mà không có dạng mới.', id: 'Di sini kamu menggabungkan I dan you, pertanyaan, bentuk singkat, dan tempat tanpa bentuk baru.', tr: 'Burada I ve you, sorular, kısa biçim ve yerler yeni bir biçim olmadan birleşir.', pl: 'Tutaj łączysz znane I i you, pytania, skrót i miejsca bez nowej formy.' },
};

function introBody(locale: Locale, ordinal: number, page: 0 | 1 | 2, target: string): string {
  return `${TOPIC[ordinal][locale]} ${BODY[locale][page]} ${COPY[locale].explain} ${COPY[locale].right} ${target}`;
}

export function buildEpisode01Session11To16(ordinal: 11 | 12 | 13 | 14 | 15 | 16): SessionSource {
  const target = SESSION_PHRASES[ordinal][0];
  const title = localized((locale) => `${COPY[locale].title}: ${target}`);
  const body1 = localized((locale) => introBody(locale, ordinal, 0, target));
  const body2 = localized((locale) => introBody(locale, ordinal, 1, target));
  const body3 = localized((locale) => introBody(locale, ordinal, 2, target));
  const introPages = [body1, body2, body3].map((body, index) => ({
    kind: (['concept', 'formula', 'trap'] as const)[index],
    title,
    body,
    bodyRuns: runs(body, [target]),
    question: {
      prompt: localized((locale) => COPY[locale].choose),
      choices: [title, localized(() => target), localized(() => SESSION_PHRASES[ordinal][1])],
      correctChoiceIndex: 1 as const,
      explanation: localized((locale) => `${COPY[locale].right} ${target}. ${COPY[locale].explain}`),
    },
  })) as unknown as SessionSource['introPages'];
  return {
    packageId: 'learning-v2-en-v1', targetLanguage: 'en', episodeOrdinal: 1, requiredSessionOrdinal: ordinal,
    canDoOutcomeId: 'obj-e01-say-who-i-am', generationInputFingerprint: `authored-e01-s${ordinal}-v1`,
    title, summary: localized((locale) => COPY[locale].explain), learningGoal: localized((locale) => COPY[locale].right), introPages,
    phrases: SESSION_PHRASES[ordinal].map((english, index) => phrase(ordinal, index, english, FEATURES[ordinal])),
  };
}

export function assertAuthoredSessionContract(source: SessionSource, ordinal: number, kind: SessionKind, taught?: string): void {
  expect(source.requiredSessionOrdinal).toBe(ordinal); expect(source.phrases).toHaveLength(15); expect(source.introPages.map((page) => page.kind)).toEqual(['concept', 'formula', 'trap']);
  source.introPages.forEach((page) => LOCALES.forEach((locale) => { expect(page.title[locale]).toBeTruthy(); expect(page.bodyRuns?.[locale].map((run) => run.text).join('')).toBe(page.body[locale]); }));
  source.phrases.forEach((item) => { expect(item.words.length).toBeGreaterThan(0); item.words.forEach((word) => expect(new Set(word.distractors.map((entry) => entry.value)).size).toBe(5)); LOCALES.forEach((locale) => expect(item.localizedDetails?.[locale]).toBeDefined()); });
  if (taught) expect(source.phrases.some((item) => item.features.includes(taught))).toBe(true); expect(kind).toBeTruthy();
}
