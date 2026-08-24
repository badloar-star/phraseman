import type { LocalizedIntroRunsSource, LocalizedSource, SessionSourceIntroPage } from './session_shard_from_source_v1';
import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const TERMS = ['I am ready', "I'm ready", 'I am here', "I'm here", 'I ready', 'I am', "I'm"] as const;

function markBody(body: LocalizedSource): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale] ?? '';
    const runs: LearningV2IntroTextRunV1[] = [];
    let cursor = 0;
    while (cursor < text.length) {
      const term = TERMS.find((candidate) => text.slice(cursor, cursor + candidate.length) === candidate);
      if (term) {
        runs.push({ text: term, semantic: term === 'I ready' ? 'targetWrong' : 'targetCorrect' });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < text.length && !TERMS.some((candidate) => text.slice(end, end + candidate.length) === candidate)) end += 1;
      runs.push({ text: text.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, runs];
  })) as unknown as LocalizedIntroRunsSource;
}

export const EPISODE_01_SESSION_07_VOICE_TITLE = L({
  ru: 'Скажи о себе вслух', uk: 'Скажи про себе вголос', es: 'Habla de ti en voz alta',
  'pt-BR': 'Fale de você em voz alta', vi: 'Nói về mình thành tiếng', id: 'Ucapkan tentang diri sendiri',
  tr: 'Kendini sesli anlat', pl: 'Powiedz o sobie na głos',
});
export const EPISODE_01_SESSION_07_VOICE_SUMMARY = L({
  ru: 'Знакомые фразы звучат одной речевой группой: полное I am или слитное I’m не теряется.',
  uk: 'Знайомі фрази звучать однією мовною групою: повне I am або злите I’m не губиться.',
  es: 'Las frases conocidas suenan como un solo grupo: no se pierde ni I am completo ni I’m unido.',
  'pt-BR': 'As frases conhecidas soam como um só grupo: nem I am completo nem I’m unido desaparecem.',
  vi: 'Các câu quen thuộc được nói thành một cụm: không làm mất I am đầy đủ hay I’m nối liền.',
  id: 'Kalimat yang sudah dikenal diucapkan sebagai satu kelompok: I am atau I’m tidak hilang.',
  tr: 'Tanıdık sözler tek bir konuşma grubu olur; tam I am ya da birleşik I’m kaybolmaz.',
  pl: 'Znane zdania brzmią jak jedna grupa: pełne I am ani połączone I’m nie znika.',
});
export const EPISODE_01_SESSION_07_VOICE_GOAL = L({
  ru: 'Произносить знакомые фразы цельно, сохраняя связку и естественное ударение.',
  uk: 'Вимовляти знайомі фрази цілісно, зберігаючи зв’язку та природний наголос.',
  es: 'Pronunciar frases conocidas de corrido, conservando el enlace y el acento natural.',
  'pt-BR': 'Pronunciar frases conhecidas de modo contínuo, mantendo a ligação e o acento natural.',
  vi: 'Nói liền mạch các câu quen thuộc, giữ từ nối và trọng âm tự nhiên.',
  id: 'Mengucapkan kalimat dikenal secara utuh dengan penghubung dan tekanan alami.',
  tr: 'Tanıdık cümleleri bağı ve doğal vurguyu koruyarak bütün söylemek.',
  pl: 'Wymawiać znane zdania płynnie, zachowując łącznik i naturalny akcent.',
});

const conceptBody = L({
  ru: 'В живой речи знакомая фраза звучит не как три отдельные части, а как одна речевая группа. В I am here голос не останавливается после каждого слова: I am мягко подводит к главному сообщению here. Такая цельность помогает собеседнику сразу услышать, кто говорит и что он сообщает. Правильная цель — одна речевая группа, но внутри неё ни одно нужное слово не исчезает. Сначала послушайте весь образец, затем повторите его на одном спокойном выдохе.',
  uk: 'У живому мовленні знайома фраза звучить не як три окремі частини, а як одна мовна група. В I am here голос не зупиняється після кожного слова: I am м’яко веде до головного повідомлення here. Така цілісність допомагає співрозмовнику одразу почути, хто говорить і що саме повідомляє. Правильна мета — одна мовна група, але в ній не зникає жодне потрібне слово. Спочатку послухайте весь зразок, а тоді повторіть його на одному спокійному видиху.',
  es: 'Al hablar, una frase conocida no suena como tres partes separadas, sino como un solo grupo de voz. En I am here la voz no se detiene tras cada palabra: I am conduce suavemente hacia la información principal, here. Esa continuidad permite oír enseguida quién habla y qué comunica. La meta correcta es un solo grupo de voz, sin borrar ninguna palabra necesaria. Escucha primero el modelo completo y después repítelo con una sola salida tranquila de aire.',
  'pt-BR': 'Na fala, uma frase conhecida não soa como três partes separadas, mas como um único grupo de voz. Em I am here, a voz não para depois de cada palavra: I am conduz suavemente até a informação principal, here. Essa continuidade deixa claro de imediato quem fala e o que comunica. O objetivo correto é um único grupo de voz, sem apagar nenhuma palavra necessária. Ouça primeiro o modelo inteiro e depois repita com uma saída de ar tranquila.',
  vi: 'Khi nói, một câu quen thuộc không vang lên như ba phần rời mà như một cụm lời nói. Trong I am here, giọng không dừng sau từng từ; I am dẫn nhẹ tới thông tin chính là here. Cách nối này giúp người nghe nhận ra ngay ai đang nói và điều gì được thông báo. Mục tiêu đúng là một cụm lời nói, nhưng không được làm mất từ cần thiết nào. Hãy nghe trọn mẫu trước rồi lặp lại trong một hơi thở bình tĩnh.',
  id: 'Dalam percakapan, kalimat yang dikenal tidak terdengar seperti tiga bagian terpisah, melainkan satu kelompok ujaran. Pada I am here, suara tidak berhenti setelah setiap kata; I am mengalir menuju informasi utama, here. Aliran itu membuat pendengar segera menangkap siapa yang berbicara dan apa pesannya. Sasaran yang tepat adalah satu kelompok ujaran tanpa menghilangkan kata yang diperlukan. Dengarkan seluruh contoh dahulu, lalu ulangi dengan satu hembusan napas yang tenang.',
  tr: 'Konuşurken tanıdık bir cümle üç ayrı parça gibi değil, tek bir konuşma grubu gibi duyulur. I am here içinde ses her sözcükten sonra durmaz; I am yumuşakça ana bilgi olan here bölümüne akar. Bu bütünlük dinleyenin kimin konuştuğunu ve ne söylediğini hemen duymasını sağlar. Doğru hedef tek bir konuşma grubudur, fakat gerekli hiçbir sözcük kaybolmaz. Önce modelin tamamını dinleyin, sonra tek ve sakin bir nefeste yineleyin.',
  pl: 'W mowie znane zdanie nie brzmi jak trzy osobne części, lecz jak jedna grupa wypowiedzi. W I am here głos nie zatrzymuje się po każdym słowie; I am płynnie prowadzi do głównej informacji here. Taka całość pozwala od razu usłyszeć, kto mówi i co przekazuje. Właściwy cel to jedna grupa wypowiedzi, ale żadne potrzebne słowo nie może zniknąć. Najpierw posłuchaj całego wzoru, a potem powtórz go na jednym spokojnym wydechu.',
});

const formulaBody = L({
  ru: 'В полной форме I am оба слова слышны, но главное ударение обычно несёт последнее смысловое слово. Поэтому в I am ready голос быстро проходит через I am и увереннее выделяет ready. Короткая форма I’m занимает ещё меньше места и сразу соединяется со следующим словом: I’m ready. Обе формы правильны; меняется длина начала, а не смысл сообщения. Если нужен ясный медленный образец, произнесите I am, а в обычной быстрой речи естественно звучит I’m.',
  uk: 'У повній формі I am чути обидва слова, але головний наголос зазвичай несе останнє змістове слово. Тому в I am ready голос швидко проходить через I am і виразніше виділяє ready. Коротка форма I’m займає ще менше місця й одразу з’єднується з наступним словом: I’m ready. Обидві форми правильні; змінюється довжина початку, а не зміст повідомлення. Для чіткого повільного зразка вимовте I am, а у звичайній швидкій мові природно звучить I’m.',
  es: 'En la forma completa I am se oyen las dos palabras, pero el acento principal suele recaer en la última palabra con significado. Por eso, en I am ready la voz pasa rápido por I am y destaca con más fuerza ready. La forma corta I’m ocupa todavía menos espacio y se une directamente a lo que sigue: I’m ready. Las dos formas son correctas; cambia la duración del comienzo, no el mensaje. Para un modelo lento y claro usa I am; en habla rápida resulta natural I’m.',
  'pt-BR': 'Na forma completa I am, as duas palavras são ouvidas, mas o acento principal costuma cair na última palavra de sentido. Por isso, em I am ready a voz passa rapidamente por I am e destaca ready com mais força. A forma curta I’m ocupa ainda menos espaço e se liga ao que vem depois: I’m ready. As duas formas estão corretas; muda a duração do começo, não a mensagem. Para um modelo lento e claro use I am; na fala rápida, I’m soa natural.',
  vi: 'Ở dạng đầy đủ I am, cả hai từ đều được nghe thấy, nhưng trọng âm chính thường rơi vào từ mang nghĩa ở cuối. Vì vậy trong I am ready, giọng đi nhanh qua I am rồi nhấn rõ hơn vào ready. Dạng ngắn I’m chiếm ít thời gian hơn và nối thẳng với từ sau: I’m ready. Cả hai dạng đều đúng; độ dài phần đầu thay đổi chứ ý nghĩa không đổi. Khi nói mẫu chậm và rõ, dùng I am; trong lời nói nhanh tự nhiên, I’m rất phù hợp.',
  id: 'Dalam bentuk lengkap I am, kedua kata tetap terdengar, tetapi tekanan utama biasanya jatuh pada kata bermakna terakhir. Karena itu, pada I am ready suara melewati I am dengan cepat lalu menonjolkan ready. Bentuk singkat I’m memakai waktu lebih sedikit dan langsung menyatu dengan kata berikutnya: I’m ready. Keduanya benar; yang berubah hanya panjang awal, bukan pesannya. Untuk contoh lambat gunakan I am, sedangkan dalam ujaran cepat I’m terdengar alami.',
  tr: 'Tam I am biçiminde iki sözcük de duyulur, ancak ana vurgu genellikle sondaki anlamlı sözcüktedir. Bu yüzden I am ready söylenirken ses I am üzerinden hızlı geçer ve ready daha belirgin olur. Kısa I’m daha da az yer kaplar ve sonraki sözcüğe doğrudan bağlanır: I’m ready. İki biçim de doğrudur; iletinin anlamı değil, başlangıcın süresi değişir. Yavaş ve açık modelde I am, doğal hızlı konuşmada I’m kullanılır.',
  pl: 'W pełnym I am słychać oba słowa, lecz główny akcent zwykle pada na ostatnie słowo niosące treść. Dlatego w I am ready głos szybko przechodzi przez I am i mocniej wyróżnia ready. Krótkie I’m zajmuje jeszcze mniej miejsca i od razu łączy się z następnym słowem: I’m ready. Obie formy są poprawne; zmienia się długość początku, a nie sens. W wolnym, wyraźnym wzorze użyj I am, a w naturalnej szybkiej mowie I’m.',
});

const trapBody = L({
  ru: 'Самая опасная ошибка — ускориться так сильно, что связка исчезнет совсем. I ready короче, но это уже не английская фраза: после I пропущено слово, которое соединяет говорящего с описанием. В полном варианте нужно отчётливо сохранить I am ready, а в коротком — настоящий апостроф и слитное I’m ready. Сокращение уменьшает форму, но не удаляет грамматическую связь. Проверяйте себя так: если между I и ready не слышится ни am, ни I’m, произнесите образец медленнее и снова соедините его.',
  uk: 'Найнебезпечніша помилка — так прискоритися, що зв’язка зникне зовсім. I ready коротше, але це вже не англійська фраза: після I пропущено слово, яке поєднує мовця з описом. У повному варіанті треба виразно зберегти I am ready, а в короткому — справжній апостроф і злите I’m ready. Скорочення зменшує форму, але не видаляє граматичний зв’язок. Перевірка проста: якщо між I та ready не чути ані am, ані I’m, вимовте зразок повільніше й знову поєднайте його.',
  es: 'El error más peligroso es acelerar tanto que el enlace desaparezca por completo. I ready es más corto, pero ya no es una frase inglesa: después de I falta la palabra que une a quien habla con la descripción. En la forma completa debe conservarse I am ready; en la corta hacen falta el apóstrofo real y la unión I’m ready. Una contracción reduce la forma, pero no elimina el enlace gramatical. Comprueba tu voz: si entre I y ready no se oye am ni I’m, repite el modelo más despacio y vuelve a unirlo.',
  'pt-BR': 'O erro mais perigoso é acelerar tanto que a ligação desapareça por completo. I ready é mais curto, mas já não forma uma frase inglesa: depois de I falta a palavra que liga quem fala à descrição. Na forma completa, preserve I am ready; na curta, mantenha o apóstrofo verdadeiro e a união I’m ready. A contração reduz a forma, mas não apaga a ligação gramatical. Confira sua voz: se entre I e ready não aparece am nem I’m, repita o modelo mais devagar e una de novo.',
  vi: 'Lỗi nguy hiểm nhất là nói nhanh đến mức từ nối biến mất hoàn toàn. I ready ngắn hơn nhưng không còn là câu tiếng Anh, vì sau I thiếu từ nối người nói với phần mô tả. Ở dạng đầy đủ phải giữ rõ I am ready; ở dạng ngắn phải có dấu nháy thật và cụm liền I’m ready. Rút gọn làm hình thức ngắn đi chứ không xóa quan hệ ngữ pháp. Hãy tự kiểm tra: nếu giữa I và ready không nghe thấy am hay I’m, nói mẫu chậm hơn rồi nối lại.',
  id: 'Kesalahan paling berbahaya adalah berbicara begitu cepat sampai kata penghubung hilang seluruhnya. I ready memang lebih pendek, tetapi bukan lagi kalimat Inggris karena setelah I tidak ada kata yang menghubungkan penutur dengan keterangan. Dalam bentuk lengkap pertahankan I am ready; dalam bentuk singkat gunakan apostrof yang benar dan gabungan I’m ready. Kontraksi memendekkan bentuk, bukan menghapus hubungan tata bahasa. Jika am atau I’m tidak terdengar antara I dan ready, ulangi lebih lambat lalu satukan lagi.',
  tr: 'En tehlikeli hata, bağı tümüyle kaybedecek kadar hızlanmaktır. I ready daha kısadır, fakat artık İngilizce bir cümle değildir; I sonrasında konuşanı açıklamaya bağlayan sözcük eksiktir. Tam biçimde I am ready korunmalı, kısa biçimde ise gerçek kesme işareti ve birleşik I’m ready duyulmalıdır. Kısaltma biçimi küçültür, dilbilgisel bağı silmez. I ile ready arasında am ya da I’m duyulmuyorsa modeli yavaş söyleyin ve yeniden birleştirin.',
  pl: 'Najgroźniejszy błąd to takie przyspieszenie, że łącznik znika całkowicie. I ready jest krótsze, ale nie jest już angielskim zdaniem: po I brakuje słowa łączącego mówiącego z opisem. W pełnej formie trzeba zachować I am ready, a w krótkiej prawdziwy apostrof i połączone I’m ready. Skrót zmniejsza formę, lecz nie usuwa związku gramatycznego. Jeśli między I i ready nie słychać am ani I’m, powiedz wzór wolniej i ponownie go połącz.',
});

const C = (value: LocalizedSource): LocalizedSource => value;
export const EPISODE_01_SESSION_07_VOICE_INTRO: readonly [SessionSourceIntroPage, SessionSourceIntroPage, SessionSourceIntroPage] = Object.freeze([
  {
    kind: 'concept', title: L({ ru: 'Фраза звучит одной группой', uk: 'Фраза звучить однією групою', es: 'La frase forma un solo grupo', 'pt-BR': 'A frase forma um só grupo', vi: 'Câu nói thành một cụm', id: 'Kalimat menjadi satu kelompok', tr: 'Cümle tek bir grup olur', pl: 'Zdanie tworzy jedną grupę' }),
    body: conceptBody, bodyRuns: markBody(conceptBody),
    question: { prompt: L({ ru: 'Как должна звучать короткая фраза?', uk: 'Як має звучати коротка фраза?', es: '¿Cómo debe sonar una frase corta?', 'pt-BR': 'Como deve soar uma frase curta?', vi: 'Một câu ngắn nên vang lên thế nào?', id: 'Bagaimana kalimat pendek seharusnya terdengar?', tr: 'Kısa bir cümle nasıl duyulmalı?', pl: 'Jak powinno brzmieć krótkie zdanie?' }), choices: [C(L({ ru: 'Одна речевая группа', uk: 'Одна мовна група', es: 'Un solo grupo de voz', 'pt-BR': 'Um único grupo de voz', vi: 'Một cụm lời nói', id: 'Satu kelompok ujaran', tr: 'Tek bir konuşma grubu', pl: 'Jedna grupa wypowiedzi' })), C(L({ ru: 'Отдельные буквы', uk: 'Окремі літери', es: 'Letras separadas', 'pt-BR': 'Letras separadas', vi: 'Các chữ cái rời', id: 'Huruf terpisah', tr: 'Ayrı harfler', pl: 'Osobne litery' })), C(L({ ru: 'Три длинные паузы', uk: 'Три довгі паузи', es: 'Tres pausas largas', 'pt-BR': 'Três pausas longas', vi: 'Ba khoảng dừng dài', id: 'Tiga jeda panjang', tr: 'Üç uzun durak', pl: 'Trzy długie pauzy' }))], correctChoiceIndex: 0, explanation: L({ ru: 'Одна речевая группа сохраняет все слова, но не разрывает фразу лишними паузами.', uk: 'Одна мовна група зберігає всі слова, але не розриває фразу зайвими паузами.', es: 'Un solo grupo de voz conserva todas las palabras sin romper la frase con pausas.', 'pt-BR': 'Um único grupo de voz preserva todas as palavras sem quebrar a frase com pausas.', vi: 'Một cụm lời nói giữ đủ từ mà không cắt câu bằng khoảng dừng thừa.', id: 'Satu kelompok ujaran menjaga semua kata tanpa memecah kalimat dengan jeda.', tr: 'Tek bir konuşma grubu bütün sözcükleri korur ve gereksiz durak eklemez.', pl: 'Jedna grupa wypowiedzi zachowuje słowa i nie rozrywa zdania pauzami.' }) },
  },
  {
    kind: 'formula', title: L({ ru: 'Ударение идёт к главному слову', uk: 'Наголос іде до головного слова', es: 'El acento va a la palabra principal', 'pt-BR': 'O acento vai à palavra principal', vi: 'Trọng âm tới từ chính', id: 'Tekanan menuju kata utama', tr: 'Vurgu ana sözcüğe gider', pl: 'Akcent idzie do głównego słowa' }),
    body: formulaBody, bodyRuns: markBody(formulaBody),
    question: { prompt: L({ ru: 'Какая полная форма сохраняет оба слова?', uk: 'Яка повна форма зберігає обидва слова?', es: '¿Qué forma completa conserva las dos palabras?', 'pt-BR': 'Qual forma completa preserva as duas palavras?', vi: 'Dạng đầy đủ nào giữ cả hai từ?', id: 'Bentuk lengkap mana yang mempertahankan kedua kata?', tr: 'Hangi tam biçim iki sözcüğü de korur?', pl: 'Która pełna forma zachowuje oba słowa?' }), choices: [C(L({ ru: 'I am', uk: 'I am', es: 'I am', 'pt-BR': 'I am', vi: 'I am', id: 'I am', tr: 'I am', pl: 'I am' })), C(L({ ru: 'I', uk: 'I', es: 'I', 'pt-BR': 'I', vi: 'I', id: 'I', tr: 'I', pl: 'I' })), C(L({ ru: 'am', uk: 'am', es: 'am', 'pt-BR': 'am', vi: 'am', id: 'am', tr: 'am', pl: 'am' }))], correctChoiceIndex: 0, explanation: L({ ru: 'I am — полная форма: оба слова слышны, а главное ударение переходит к описанию.', uk: 'I am — повна форма: обидва слова чути, а головний наголос переходить до опису.', es: 'I am es la forma completa: se oyen ambas palabras y el acento pasa a la descripción.', 'pt-BR': 'I am é a forma completa: as duas palavras são ouvidas e o acento passa à descrição.', vi: 'I am là dạng đầy đủ: cả hai từ đều nghe thấy và trọng âm chuyển tới phần mô tả.', id: 'I am adalah bentuk lengkap: kedua kata terdengar dan tekanan bergerak ke keterangan.', tr: 'I am tam biçimdir; iki sözcük duyulur ve ana vurgu açıklamaya geçer.', pl: 'I am to pełna forma: słychać oba słowa, a akcent przechodzi na opis.' }) },
  },
  {
    kind: 'trap', title: L({ ru: 'Быстро — не значит без связки', uk: 'Швидко — не означає без зв’язки', es: 'Rápido no significa sin enlace', 'pt-BR': 'Rápido não significa sem ligação', vi: 'Nói nhanh không xóa từ nối', id: 'Cepat bukan berarti tanpa penghubung', tr: 'Hızlı söylemek bağı silmez', pl: 'Szybko nie znaczy bez łącznika' }),
    body: trapBody, bodyRuns: markBody(trapBody),
    question: { prompt: L({ ru: 'Какая короткая форма сохраняет связку?', uk: 'Яка коротка форма зберігає зв’язку?', es: '¿Qué forma corta conserva el enlace?', 'pt-BR': 'Qual forma curta preserva a ligação?', vi: 'Dạng ngắn nào vẫn giữ từ nối?', id: 'Bentuk singkat mana yang tetap menjaga penghubung?', tr: 'Hangi kısa biçim bağı korur?', pl: 'Która krótka forma zachowuje łącznik?' }), choices: [C(L({ ru: "I'm ready", uk: "I'm ready", es: "I'm ready", 'pt-BR': "I'm ready", vi: "I'm ready", id: "I'm ready", tr: "I'm ready", pl: "I'm ready" })), C(L({ ru: 'I ready', uk: 'I ready', es: 'I ready', 'pt-BR': 'I ready', vi: 'I ready', id: 'I ready', tr: 'I ready', pl: 'I ready' })), C(L({ ru: 'I ready am', uk: 'I ready am', es: 'I ready am', 'pt-BR': 'I ready am', vi: 'I ready am', id: 'I ready am', tr: 'I ready am', pl: 'I ready am' }))], correctChoiceIndex: 0, explanation: L({ ru: "I'm ready сохраняет am внутри сокращения; I ready удаляет связку и ломает фразу.", uk: "I'm ready зберігає am усередині скорочення; I ready видаляє зв’язку й ламає фразу.", es: "I'm ready conserva am dentro de la contracción; I ready elimina el enlace.", 'pt-BR': "I'm ready preserva am dentro da contração; I ready elimina a ligação.", vi: "I'm ready giữ am bên trong dạng rút gọn; I ready xóa từ nối.", id: "I'm ready mempertahankan am di dalam kontraksi; I ready menghapus penghubung.", tr: "I'm ready, am bağını kısaltmanın içinde korur; I ready bağı siler.", pl: "I'm ready zachowuje am w skrócie; I ready usuwa łącznik." }) },
  },
]);
