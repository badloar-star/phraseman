import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 33 "Хорошо или плохо" / quality_extended_adjective, builtOn: [1, 4],
// recalls: [1, 4], открывает Главу 5 "Больше признаков"): единственное
// word-first слово — bueno (хороший), мужской род на -o, парное к buena по
// уже знакомой формуле -o/-a (сессия 3). Проверено grep по всему испанскому
// корпусу — bueno/buena/malo/mala ни разу не встречались раньше, слово
// действительно новое. Malo (плохой) — сквозной антипод в трёх intro-
// страницах и дистрактор в словаре, но НЕ вводится как отдельная word-first
// единица в этой сессии (это территория будущей сессии, teaches здесь только
// quality_extended_adjective через bueno).
//
// Форма изложения — та же, что и в предыдущих word-first сессиях (3, 18,
// 21): признак меняется по роду того, кого/что описывает, а не самого
// говорящего. Новизна здесь — не механика согласования (она уже полностью
// отработана), а сам СЛОВАРЬ: bueno/buena расширяет набор оценочных
// прилагательных за пределы fácil/difícil/caro/rápido/bonito, к которым
// теперь может обращаться любая будущая фраза курса.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_33_WORD_FIRST_TITLE = L({
  ru: 'Хорошо или плохо',
  uk: 'Добре чи погано',
  es: 'Good or bad',
  'pt-BR': 'Bom ou ruim',
  vi: 'Tốt hay xấu',
  id: 'Baik atau buruk',
  tr: 'İyi mi kötü mü',
  pl: 'Dobrze czy źle',
});

export const ES_EPISODE_01_SESSION_33_WORD_FIRST_SUMMARY = L({
  ru: 'Bueno называет качество «хороший» и меняет окончание по роду того, о ком речь, точно так же, как caro и rápido уже делали раньше.',
  uk: 'Bueno називає якість «добрий» і змінює закінчення за родом того, про кого йдеться, точно так само, як caro і rápido вже робили раніше.',
  es: 'Bueno names the quality "good" and changes its ending based on the gender of whoever is being discussed, exactly the way caro and rápido already did.',
  'pt-BR': 'Bueno nomeia a qualidade "bom" e muda a terminação conforme o gênero de quem está sendo discutido, exatamente como caro e rápido já faziam.',
  vi: 'Bueno gọi tên phẩm chất "tốt" và đổi đuôi theo giống của người/vật đang được nói tới, y hệt như caro và rápido đã từng làm.',
  id: 'Bueno menyebutkan sifat "baik" dan mengubah akhirannya sesuai gender dari siapa yang dibicarakan, persis seperti caro dan rápido sebelumnya.',
  tr: 'Bueno "iyi" niteliğini adlandırır ve söz konusu olanın cinsiyetine göre sonunu değiştirir, tıpkı caro ve rápido’nun daha önce yaptığı gibi.',
  pl: 'Bueno nazywa cechę „dobry” i zmienia końcówkę zależnie od rodzaju tego, o kim mowa, dokładnie tak, jak wcześniej robiły to caro i rápido.',
});

export const ES_EPISODE_01_SESSION_33_WORD_FIRST_GOAL = L({
  ru: 'Уверенно использовать bueno/buena для оценки «хорошо» и понимать malo как его противоположность, применяя уже знакомую формулу согласования по роду.',
  uk: 'Впевнено використовувати bueno/buena для оцінки «добре» і розуміти malo як протилежність, застосовуючи вже знайому формулу узгодження за родом.',
  es: 'Confidently use bueno/buena to evaluate "good" and understand malo as its opposite, applying the already-familiar gender-agreement formula.',
  'pt-BR': 'Usar com confiança bueno/buena para avaliar "bom" e entender malo como seu oposto, aplicando a fórmula de concordância de gênero já conhecida.',
  vi: 'Tự tin dùng bueno/buena để đánh giá "tốt" và hiểu malo là từ trái nghĩa, áp dụng công thức hòa hợp giống đã quen thuộc.',
  id: 'Percaya diri menggunakan bueno/buena untuk menilai "baik" dan memahami malo sebagai kebalikannya, menerapkan rumus kesesuaian gender yang sudah dikenal.',
  tr: 'Bueno/buena’yı "iyi" değerlendirmesi için güvenle kullanmak ve malo’yu zıttı olarak anlamak, zaten tanıdık olan cinsiyet uyumu formülünü uygulayarak.',
  pl: 'Pewnie używać bueno/buena do oceny „dobrze” i rozumieć malo jako przeciwieństwo, stosując już znaną formułę zgodności rodzaju.',
});

const CONCEPT_BODY = L({
  ru: 'Bueno — новое слово со старой формулой: признак «хороший» согласуется по роду точно так же, как caro или rápido. Es bueno — про мужской род или по умолчанию, es buena — про женский. У bueno есть и противоположность: malo значит «плохой» и работает по той же самой формуле -o/-a — malo/mala. Оба слова описывают ОБЩУЮ оценку, а не конкретное качество вроде цены или скорости: bueno может относиться к человеку, поступку, идее — почти к чему угодно. Признак ставится после связки, как и всегда: Es bueno, No es bueno, Somos buenos.',
  uk: 'Bueno — нове слово зі старою формулою: ознака «добрий» узгоджується за родом точно так само, як caro чи rápido. Es bueno — про чоловічий рід чи за замовчуванням, es buena — про жіночий. У bueno є й протилежність: malo означає «поганий» і працює за тією самою формулою -o/-a — malo/mala. Обидва слова описують ЗАГАЛЬНУ оцінку, а не конкретну якість на кшталт ціни чи швидкості: bueno може стосуватися людини, вчинку, ідеї — майже будь-чого. Ознака ставиться після зв’язки, як і завжди: Es bueno, No es bueno, Somos buenos.',
  es: 'Bueno is a new word with an old formula: the quality "good" agrees by gender exactly the way caro or rápido did. Es bueno is masculine or default, es buena is feminine. Bueno has an opposite too: malo means "bad" and follows the same -o/-a formula — malo/mala. Both words describe a GENERAL evaluation, not a specific quality like price or speed: bueno can apply to a person, an action, an idea — almost anything. The quality is placed after the linking word, as always: Es bueno, No es bueno, Somos buenos.',
  'pt-BR': 'Bueno é uma palavra nova com uma fórmula antiga: a qualidade "bom" concorda em gênero exatamente como caro ou rápido. Es bueno é masculino ou padrão, es buena é feminino. Bueno tem um oposto também: malo significa "ruim" e segue a mesma fórmula -o/-a — malo/mala. As duas palavras descrevem uma avaliação GERAL, não uma qualidade específica como preço ou velocidade: bueno pode se aplicar a uma pessoa, uma ação, uma ideia — quase qualquer coisa. A qualidade fica depois da ligação, como sempre: Es bueno, No es bueno, Somos buenos.',
  vi: 'Bueno là từ mới với công thức cũ: đặc điểm "tốt" hòa hợp theo giống y hệt như caro hay rápido đã từng. Es bueno là giống đực hoặc mặc định, es buena là giống cái. Bueno cũng có từ trái nghĩa: malo nghĩa là "xấu" và theo cùng công thức -o/-a — malo/mala. Cả hai từ đều mô tả một đánh giá CHUNG, không phải một phẩm chất cụ thể như giá cả hay tốc độ: bueno có thể áp dụng cho một người, một hành động, một ý tưởng — gần như bất cứ điều gì. Đặc điểm đứng sau từ nối, như mọi khi: Es bueno, No es bueno, Somos buenos.',
  id: 'Bueno adalah kata baru dengan rumus lama: sifat "baik" sesuai dengan gender persis seperti caro atau rápido. Es bueno untuk maskulin atau default, es buena untuk feminin. Bueno juga punya lawan kata: malo berarti "buruk" dan mengikuti rumus -o/-a yang sama — malo/mala. Kedua kata itu mendeskripsikan penilaian UMUM, bukan sifat spesifik seperti harga atau kecepatan: bueno bisa berlaku untuk seseorang, sebuah tindakan, sebuah ide — hampir apa saja. Sifat ditempatkan setelah kata penghubung, seperti biasa: Es bueno, No es bueno, Somos buenos.',
  tr: 'Bueno, eski bir formülle gelen yeni bir kelimedir: "iyi" niteliği, caro veya rápido’nun yaptığı gibi cinsiyete göre uyumludur. Es bueno eril veya varsayılan, es buena dişildir. Bueno’nun bir zıttı da vardır: malo "kötü" demektir ve aynı -o/-a formülünü izler — malo/mala. Her iki kelime de fiyat veya hız gibi belirli bir nitelik değil, GENEL bir değerlendirme tanımlar: bueno bir kişiye, bir eyleme, bir fikre — neredeyse her şeye uygulanabilir. Nitelik her zamanki gibi bağlaçtan sonra gelir: Es bueno, No es bueno, Somos buenos.',
  pl: 'Bueno to nowe słowo ze starą formułą: cecha „dobry” zgadza się z rodzajem dokładnie tak, jak robiły to caro czy rápido. Es bueno to rodzaj męski lub domyślny, es buena to żeński. Bueno ma też przeciwieństwo: malo znaczy „zły” i działa według tej samej formuły -o/-a — malo/mala. Oba słowa opisują OGÓLNĄ ocenę, a nie konkretną cechę jak cena czy prędkość: bueno może dotyczyć osoby, czynu, pomysłu — niemal wszystkiego. Cecha stoi po łączniku, jak zawsze: Es bueno, No es bueno, Somos buenos.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что и у всех прилагательных на -o/-a. Мужской род или по умолчанию — bueno, женский — buena. Множественное число добавляет -s: buenos, buenas. Связка выбирается по тому же правилу, что и всегда, независимо от признака: Es bueno (один, по умолчанию), Es buena (одна, женский род), Son buenos (несколько), Somos buenas (мы, женский род). Malo подчиняется абсолютно той же формуле: malo, mala, malos, malas — согласование работает одинаково для любого прилагательного на -o, без исключений.',
  uk: 'Формула та сама, що й у всіх прикметників на -o/-a. Чоловічий рід чи за замовчуванням — bueno, жіночий — buena. Множина додає -s: buenos, buenas. Зв’язка обирається за тим самим правилом, що й завжди, незалежно від ознаки: Es bueno (один, за замовчуванням), Es buena (одна, жіночий рід), Son buenos (кілька), Somos buenas (ми, жіночий рід). Malo підпорядковується абсолютно тій самій формулі: malo, mala, malos, malas — узгодження працює однаково для будь-якого прикметника на -o, без винятків.',
  es: 'The formula is the same as for all -o/-a adjectives. Masculine or default — bueno, feminine — buena. Plural adds -s: buenos, buenas. The linking word is chosen by the same rule as always, independent of the quality: Es bueno (one, default), Es buena (one, feminine), Son buenos (several), Somos buenas (we, feminine). Malo follows the exact same formula: malo, mala, malos, malas — agreement works the same way for any -o adjective, without exceptions.',
  'pt-BR': 'A fórmula é a mesma de todos os adjetivos em -o/-a. Masculino ou padrão — bueno, feminino — buena. O plural acrescenta -s: buenos, buenas. A ligação é escolhida pela mesma regra de sempre, independente da qualidade: Es bueno (um, padrão), Es buena (uma, feminino), Son buenos (vários), Somos buenas (nós, feminino). Malo segue exatamente a mesma fórmula: malo, mala, malos, malas — a concordância funciona do mesmo jeito para qualquer adjetivo em -o, sem exceções.',
  vi: 'Công thức giống hệt như mọi tính từ kết thúc bằng -o/-a. Giống đực hoặc mặc định — bueno, giống cái — buena. Số nhiều thêm -s: buenos, buenas. Từ nối được chọn theo cùng quy tắc như mọi khi, không phụ thuộc vào đặc điểm: Es bueno (một, mặc định), Es buena (một, giống cái), Son buenos (nhiều), Somos buenas (chúng tôi, giống cái). Malo theo đúng công thức đó: malo, mala, malos, malas — sự hòa hợp hoạt động giống hệt cho bất kỳ tính từ nào kết thúc bằng -o, không ngoại lệ.',
  id: 'Rumusnya sama seperti semua kata sifat -o/-a. Maskulin atau default — bueno, feminin — buena. Jamak menambahkan -s: buenos, buenas. Kata penghubung dipilih dengan aturan yang sama seperti biasa, terlepas dari sifatnya: Es bueno (satu, default), Es buena (satu, feminin), Son buenos (beberapa), Somos buenas (kami, feminin). Malo mengikuti rumus yang persis sama: malo, mala, malos, malas — kesesuaian bekerja dengan cara yang sama untuk kata sifat -o apa pun, tanpa pengecualian.',
  tr: 'Formül, tüm -o/-a sıfatları için olanla aynıdır. Eril veya varsayılan — bueno, dişil — buena. Çoğul -s ekler: buenos, buenas. Bağlaç, nitelikten bağımsız olarak her zamanki kuralla seçilir: Es bueno (bir, varsayılan), Es buena (bir, dişil), Son buenos (birkaç), Somos buenas (biz, dişil). Malo tam olarak aynı formülü izler: malo, mala, malos, malas — uyum, herhangi bir -o sıfatı için istisnasız aynı şekilde çalışır.',
  pl: 'Formuła jest taka sama jak dla wszystkich przymiotników na -o/-a. Rodzaj męski lub domyślny — bueno, żeński — buena. Liczba mnoga dodaje -s: buenos, buenas. Łącznik wybiera się według tej samej reguły co zawsze, niezależnie od cechy: Es bueno (jeden, domyślnie), Es buena (jedna, rodzaj żeński), Son buenos (kilku), Somos buenas (my, rodzaj żeński). Malo podlega dokładnie tej samej formule: malo, mala, malos, malas — zgodność działa tak samo dla każdego przymiotnika na -o, bez wyjątków.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — спутать bueno с bien. Bien значит «хорошо» как наречие («он поёт хорошо»), а bueno — прилагательное-признак («он хороший»). После связки ser нужен именно признак: Es bueno, а не Es bien — bien вообще не встаёт после ser в этой конструкции. Вторая ловушка — забыть про полное согласование числа и рода одновременно: про группу женского рода нужно Son buenas, а не Son buenos и не Son buena — оба окончания (число и род) меняются вместе, а не по отдельности.',
  uk: 'Найчастіша помилка — сплутати bueno з bien. Bien означає «добре» як прислівник («він співає добре»), а bueno — прикметник-ознака («він добрий»). Після зв’язки ser потрібна саме ознака: Es bueno, а не Es bien — bien взагалі не стоїть після ser у цій конструкції. Друга пастка — забути про повне узгодження числа й роду одночасно: про групу жіночого роду потрібно Son buenas, а не Son buenos і не Son buena — обидва закінчення (число і рід) змінюються разом, а не окремо.',
  es: 'The most common mistake is confusing bueno with bien. Bien means "well" as an adverb ("he sings well"), while bueno is the adjective-quality ("he is good"). After the linking word ser, the quality itself is needed: Es bueno, not Es bien — bien never follows ser in this construction. The second trap is forgetting full agreement of both number and gender at once: a feminine group needs Son buenas, not Son buenos and not Son buena — both endings (number and gender) change together, not separately.',
  'pt-BR': 'O erro mais comum é confundir bueno com bien. Bien significa "bem" como advérbio ("ele canta bem"), enquanto bueno é o adjetivo-qualidade ("ele é bom"). Depois da ligação ser, é a própria qualidade que se precisa: Es bueno, não Es bien — bien nunca vem depois de ser nessa construção. A segunda armadilha é esquecer a concordância completa de número e gênero ao mesmo tempo: um grupo feminino precisa de Son buenas, não Son buenos nem Son buena — as duas terminações (número e gênero) mudam juntas, não separadamente.',
  vi: 'Lỗi phổ biến nhất là nhầm lẫn bueno với bien. Bien nghĩa là "tốt" như một trạng từ ("anh ấy hát hay"), còn bueno là tính từ-đặc điểm ("anh ấy tốt"). Sau từ nối ser, cần chính đặc điểm đó: Es bueno, không phải Es bien — bien không bao giờ đứng sau ser trong cấu trúc này. Cái bẫy thứ hai là quên hòa hợp đầy đủ cả số và giống cùng lúc: nhóm giống cái cần Son buenas, không phải Son buenos hay Son buena — cả hai đuôi (số và giống) thay đổi cùng nhau, không phải riêng lẻ.',
  id: 'Kesalahan paling umum adalah mengacaukan bueno dengan bien. Bien berarti "baik" sebagai kata keterangan ("dia bernyanyi dengan baik"), sedangkan bueno adalah kata sifat-sifat ("dia baik"). Setelah kata penghubung ser, yang diperlukan adalah sifatnya sendiri: Es bueno, bukan Es bien — bien tidak pernah mengikuti ser dalam konstruksi ini. Jebakan kedua adalah melupakan kesesuaian penuh jumlah dan gender sekaligus: kelompok feminin memerlukan Son buenas, bukan Son buenos maupun Son buena — kedua akhiran (jumlah dan gender) berubah bersamaan, bukan terpisah.',
  tr: 'En yaygın hata, bueno’yu bien ile karıştırmaktır. Bien bir zarf olarak "iyi" demektir ("iyi şarkı söylüyor"), bueno ise nitelik-sıfattır ("o iyi"). Ser bağlacından sonra niteliğin kendisi gerekir: Es bueno, Es bien değil — bien bu yapıda ser’den sonra asla gelmez. İkinci tuzak, sayı ve cinsiyet uyumunu aynı anda unutmaktır: dişil bir grup Son buenas gerektirir, Son buenos veya Son buena değil — her iki ek (sayı ve cinsiyet) birlikte değişir, ayrı ayrı değil.',
  pl: 'Najczęstszy błąd to mylenie bueno z bien. Bien znaczy „dobrze” jako przysłówek („śpiewa dobrze”), a bueno to przymiotnik-cecha („jest dobry”). Po łączniku ser potrzebna jest właśnie cecha: Es bueno, nie Es bien — bien nigdy nie stoi po ser w tej konstrukcji. Druga pułapka to zapominanie o pełnej zgodności liczby i rodzaju jednocześnie: grupa żeńska wymaga Son buenas, nie Son buenos ani Son buena — obie końcówki (liczba i rodzaj) zmieniają się razem, nie osobno.',
});

export const ES_EPISODE_01_SESSION_33_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Bueno — новое слово, старая формула согласования',
      uk: 'Bueno — нове слово, стара формула узгодження',
      es: 'Bueno — a new word, the old agreement formula',
      'pt-BR': 'Bueno — palavra nova, fórmula de concordância antiga',
      vi: 'Bueno — từ mới, công thức hòa hợp cũ',
      id: 'Bueno — kata baru, rumus kesesuaian lama',
      tr: 'Bueno — yeni kelime, eski uyum formülü',
      pl: 'Bueno — nowe słowo, stara formuła zgodności',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Bueno — новое слово со старой формулой: признак «хороший» согласуется по роду точно так же, как caro или rápido. ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ' — про мужской род или по умолчанию, es buena — про женский. У bueno есть и противоположность: malo значит «плохой» и работает по той же самой формуле -o/-a — malo/mala. Оба слова описывают ОБЩУЮ оценку, а не конкретное качество вроде цены или скорости: bueno может относиться к человеку, поступку, идее — почти к чему угодно. Признак ставится после связки, как и всегда: Es bueno, No es bueno, Somos buenos.', semantic: 'explanation' }),
      uk: R({ text: 'Bueno — нове слово зі старою формулою: ознака «добрий» узгоджується за родом точно так само, як caro чи rápido. ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ' — про чоловічий рід чи за замовчуванням, es buena — про жіночий. У bueno є й протилежність: malo означає «поганий» і працює за тією самою формулою -o/-a — malo/mala. Обидва слова описують ЗАГАЛЬНУ оцінку, а не конкретну якість на кшталт ціни чи швидкості: bueno може стосуватися людини, вчинку, ідеї — майже будь-чого. Ознака ставиться після зв’язки, як і завжди: Es bueno, No es bueno, Somos buenos.', semantic: 'explanation' }),
      es: R({ text: 'Bueno is a new word with an old formula: the quality "good" agrees by gender exactly the way caro or rápido did. ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ' is masculine or default, es buena is feminine. Bueno has an opposite too: malo means "bad" and follows the same -o/-a formula — malo/mala. Both words describe a GENERAL evaluation, not a specific quality like price or speed: bueno can apply to a person, an action, an idea — almost anything. The quality is placed after the linking word, as always: Es bueno, No es bueno, Somos buenos.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Bueno é uma palavra nova com uma fórmula antiga: a qualidade "bom" concorda em gênero exatamente como caro ou rápido. ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ' é masculino ou padrão, es buena é feminino. Bueno tem um oposto também: malo significa "ruim" e segue a mesma fórmula -o/-a — malo/mala. As duas palavras descrevem uma avaliação GERAL, não uma qualidade específica como preço ou velocidade: bueno pode se aplicar a uma pessoa, uma ação, uma ideia — quase qualquer coisa. A qualidade fica depois da ligação, como sempre: Es bueno, No es bueno, Somos buenos.', semantic: 'explanation' }),
      vi: R({ text: 'Bueno là từ mới với công thức cũ: đặc điểm "tốt" hòa hợp theo giống y hệt như caro hay rápido đã từng. ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ' là giống đực hoặc mặc định, es buena là giống cái. Bueno cũng có từ trái nghĩa: malo nghĩa là "xấu" và theo cùng công thức -o/-a — malo/mala. Cả hai từ đều mô tả một đánh giá CHUNG, không phải một phẩm chất cụ thể như giá cả hay tốc độ: bueno có thể áp dụng cho một người, một hành động, một ý tưởng — gần như bất cứ điều gì. Đặc điểm đứng sau từ nối, như mọi khi: Es bueno, No es bueno, Somos buenos.', semantic: 'explanation' }),
      id: R({ text: 'Bueno adalah kata baru dengan rumus lama: sifat "baik" sesuai dengan gender persis seperti caro atau rápido. ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ' untuk maskulin atau default, es buena untuk feminin. Bueno juga punya lawan kata: malo berarti "buruk" dan mengikuti rumus -o/-a yang sama — malo/mala. Kedua kata itu mendeskripsikan penilaian UMUM, bukan sifat spesifik seperti harga atau kecepatan: bueno bisa berlaku untuk seseorang, sebuah tindakan, sebuah ide — hampir apa saja. Sifat ditempatkan setelah kata penghubung, seperti biasa: Es bueno, No es bueno, Somos buenos.', semantic: 'explanation' }),
      tr: R({ text: 'Bueno, eski bir formülle gelen yeni bir kelimedir: "iyi" niteliği, caro veya rápido’nun yaptığı gibi cinsiyete göre uyumludur. ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ' eril veya varsayılan, es buena dişildir. Bueno’nun bir zıttı da vardır: malo "kötü" demektir ve aynı -o/-a formülünü izler — malo/mala. Her iki kelime de fiyat veya hız gibi belirli bir nitelik değil, GENEL bir değerlendirme tanımlar: bueno bir kişiye, bir eyleme, bir fikre — neredeyse her şeye uygulanabilir. Nitelik her zamanki gibi bağlaçtan sonra gelir: Es bueno, No es bueno, Somos buenos.', semantic: 'explanation' }),
      pl: R({ text: 'Bueno to nowe słowo ze starą formułą: cecha „dobry” zgadza się z rodzajem dokładnie tak, jak robiły to caro czy rápido. ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ' to rodzaj męski lub domyślny, es buena to żeński. Bueno ma też przeciwieństwo: malo znaczy „zły” i działa według tej samej formuły -o/-a — malo/mala. Oba słowa opisują OGÓLNĄ ocenę, a nie konkretną cechę jak cena czy prędkość: bueno może dotyczyć osoby, czynu, pomysłu — niemal wszystkiego. Cecha stoi po łączniku, jak zawsze: Es bueno, No es bueno, Somos buenos.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как сказать «он хороший» (по умолчанию, мужской род)?',
        uk: 'Як сказати «він добрий» (за замовчуванням, чоловічий рід)?',
        es: 'How do you say "he is good" (default, masculine)?',
        'pt-BR': 'Como se diz "ele é bom" (padrão, masculino)?',
        vi: 'Làm sao để nói "anh ấy tốt" (mặc định, giống đực)?',
        id: 'Bagaimana cara mengatakan "dia baik" (default, maskulin)?',
        tr: '"O iyidir" (varsayılan, eril) nasıl söylenir?',
        pl: 'Jak powiedzieć „on jest dobry” (domyślnie, rodzaj męski)?',
      }),
      choices: [
        L({ ru: 'Es bueno', uk: 'Es bueno', es: 'Es bueno', 'pt-BR': 'Es bueno', vi: 'Es bueno', id: 'Es bueno', tr: 'Es bueno', pl: 'Es bueno' }),
        L({ ru: 'Es buena', uk: 'Es buena', es: 'Es buena', 'pt-BR': 'Es buena', vi: 'Es buena', id: 'Es buena', tr: 'Es buena', pl: 'Es buena' }),
        L({ ru: 'Es bien', uk: 'Es bien', es: 'Es bien', 'pt-BR': 'Es bien', vi: 'Es bien', id: 'Es bien', tr: 'Es bien', pl: 'Es bien' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es bueno верно: мужской род или по умолчанию требует окончания -o. Es buena путает род, Es bien вообще не годится — bien это наречие, а не признак-прилагательное.',
        uk: 'Es bueno правильно: чоловічий рід чи за замовчуванням вимагає закінчення -o. Es buena плутає рід, Es bien взагалі не годиться — bien це прислівник, а не ознака-прикметник.',
        es: 'Es bueno is correct: masculine or default requires the -o ending. Es buena mixes up the gender, Es bien does not work at all — bien is an adverb, not an adjective-quality.',
        'pt-BR': 'Es bueno está correto: masculino ou padrão exige a terminação -o. Es buena confunde o gênero, Es bien não serve de jeito nenhum — bien é um advérbio, não um adjetivo-qualidade.',
        vi: 'Es bueno đúng: giống đực hoặc mặc định cần đuôi -o. Es buena nhầm giống, Es bien hoàn toàn không đúng — bien là trạng từ, không phải tính từ-đặc điểm.',
        id: 'Es bueno benar: maskulin atau default memerlukan akhiran -o. Es buena salah gender, Es bien sama sekali tidak cocok — bien adalah kata keterangan, bukan kata sifat-sifat.',
        tr: 'Es bueno doğrudur: eril veya varsayılan -o eki gerektirir. Es buena cinsiyeti karıştırır, Es bien hiç uygun değildir — bien bir zarftır, nitelik-sıfat değil.',
        pl: 'Es bueno jest poprawne: rodzaj męski lub domyślny wymaga końcówki -o. Es buena myli rodzaj, Es bien w ogóle nie pasuje — bien to przysłówek, nie przymiotnik-cecha.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Число и род меняются вместе, как у любого -o/-a',
      uk: 'Число і рід змінюються разом, як у будь-якого -o/-a',
      es: 'Number and gender change together, like any -o/-a',
      'pt-BR': 'Número e gênero mudam juntos, como qualquer -o/-a',
      vi: 'Số và giống thay đổi cùng nhau, như bất kỳ từ -o/-a nào',
      id: 'Jumlah dan gender berubah bersama, seperti kata -o/-a mana pun',
      tr: 'Sayı ve cinsiyet birlikte değişir, herhangi bir -o/-a gibi',
      pl: 'Liczba i rodzaj zmieniają się razem, jak w każdym -o/-a',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула та же, что и у всех прилагательных на -o/-a. Мужской род или по умолчанию — bueno, женский — buena. Множественное число добавляет -s: buenos, buenas. Связка выбирается по тому же правилу, что и всегда, независимо от признака: Es bueno (один, по умолчанию), Es buena (одна, женский род), Son buenos (несколько), ', semantic: 'explanation' }, { text: 'Somos buenas', semantic: 'targetCorrect' }, { text: ' (мы, женский род). Malo подчиняется абсолютно той же формуле: malo, mala, malos, malas — согласование работает одинаково для любого прилагательного на -o, без исключений.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й у всіх прикметників на -o/-a. Чоловічий рід чи за замовчуванням — bueno, жіночий — buena. Множина додає -s: buenos, buenas. Зв’язка обирається за тим самим правилом, що й завжди, незалежно від ознаки: Es bueno (один, за замовчуванням), Es buena (одна, жіночий рід), Son buenos (кілька), ', semantic: 'explanation' }, { text: 'Somos buenas', semantic: 'targetCorrect' }, { text: ' (ми, жіночий рід). Malo підпорядковується абсолютно тій самій формулі: malo, mala, malos, malas — узгодження працює однаково для будь-якого прикметника на -o, без винятків.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for all -o/-a adjectives. Masculine or default — bueno, feminine — buena. Plural adds -s: buenos, buenas. The linking word is chosen by the same rule as always, independent of the quality: Es bueno (one, default), Es buena (one, feminine), Son buenos (several), ', semantic: 'explanation' }, { text: 'Somos buenas', semantic: 'targetCorrect' }, { text: ' (we, feminine). Malo follows the exact same formula: malo, mala, malos, malas — agreement works the same way for any -o adjective, without exceptions.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de todos os adjetivos em -o/-a. Masculino ou padrão — bueno, feminino — buena. O plural acrescenta -s: buenos, buenas. A ligação é escolhida pela mesma regra de sempre, independente da qualidade: Es bueno (um, padrão), Es buena (uma, feminino), Son buenos (vários), ', semantic: 'explanation' }, { text: 'Somos buenas', semantic: 'targetCorrect' }, { text: ' (nós, feminino). Malo segue exatamente a mesma fórmula: malo, mala, malos, malas — a concordância funciona do mesmo jeito para qualquer adjetivo em -o, sem exceções.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống hệt như mọi tính từ kết thúc bằng -o/-a. Giống đực hoặc mặc định — bueno, giống cái — buena. Số nhiều thêm -s: buenos, buenas. Từ nối được chọn theo cùng quy tắc như mọi khi, không phụ thuộc vào đặc điểm: Es bueno (một, mặc định), Es buena (một, giống cái), Son buenos (nhiều), ', semantic: 'explanation' }, { text: 'Somos buenas', semantic: 'targetCorrect' }, { text: ' (chúng tôi, giống cái). Malo theo đúng công thức đó: malo, mala, malos, malas — sự hòa hợp hoạt động giống hệt cho bất kỳ tính từ nào kết thúc bằng -o, không ngoại lệ.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti semua kata sifat -o/-a. Maskulin atau default — bueno, feminin — buena. Jamak menambahkan -s: buenos, buenas. Kata penghubung dipilih dengan aturan yang sama seperti biasa, terlepas dari sifatnya: Es bueno (satu, default), Es buena (satu, feminin), Son buenos (beberapa), ', semantic: 'explanation' }, { text: 'Somos buenas', semantic: 'targetCorrect' }, { text: ' (kami, feminin). Malo mengikuti rumus yang persis sama: malo, mala, malos, malas — kesesuaian bekerja dengan cara yang sama untuk kata sifat -o apa pun, tanpa pengecualian.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, tüm -o/-a sıfatları için olanla aynıdır. Eril veya varsayılan — bueno, dişil — buena. Çoğul -s ekler: buenos, buenas. Bağlaç, nitelikten bağımsız olarak her zamanki kuralla seçilir: Es bueno (bir, varsayılan), Es buena (bir, dişil), Son buenos (birkaç), ', semantic: 'explanation' }, { text: 'Somos buenas', semantic: 'targetCorrect' }, { text: ' (biz, dişil). Malo tam olarak aynı formülü izler: malo, mala, malos, malas — uyum, herhangi bir -o sıfatı için istisnasız aynı şekilde çalışır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla wszystkich przymiotników na -o/-a. Rodzaj męski lub domyślny — bueno, żeński — buena. Liczba mnoga dodaje -s: buenos, buenas. Łącznik wybiera się według tej samej reguły co zawsze, niezależnie od cechy: Es bueno (jeden, domyślnie), Es buena (jedna, rodzaj żeński), Son buenos (kilku), ', semantic: 'explanation' }, { text: 'Somos buenas', semantic: 'targetCorrect' }, { text: ' (my, rodzaj żeński). Malo podlega dokładnie tej samej formule: malo, mala, malos, malas — zgodność działa tak samo dla każdego przymiotnika na -o, bez wyjątków.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Про группу женского рода, включая говорящую, — как звучит уверенное «мы хорошие»?',
        uk: 'Про групу жіночого роду, включно з мовицею, — як звучить впевнене «ми добрі»?',
        es: 'About a feminine group that includes the speaker — how does a confident "we are good" sound?',
        'pt-BR': 'Sobre um grupo feminino que inclui quem fala — como soa um confiante "somos boas"?',
        vi: 'Về nhóm giống cái gồm cả người nói — câu tự tin "chúng tôi tốt" nghe thế nào?',
        id: 'Tentang kelompok feminin yang mencakup penutur — bagaimana "kami baik" yang percaya diri terdengar?',
        tr: 'Konuşanı da içeren dişil bir grup hakkında — kendinden emin "biz iyiyiz" nasıl duyulur?',
        pl: 'O grupie żeńskiej obejmującej mówiącą — jak brzmi pewne „jesteśmy dobre”?',
      }),
      choices: [
        L({ ru: 'Somos buenas', uk: 'Somos buenas', es: 'Somos buenas', 'pt-BR': 'Somos buenas', vi: 'Somos buenas', id: 'Somos buenas', tr: 'Somos buenas', pl: 'Somos buenas' }),
        L({ ru: 'Somos buenos', uk: 'Somos buenos', es: 'Somos buenos', 'pt-BR': 'Somos buenos', vi: 'Somos buenos', id: 'Somos buenos', tr: 'Somos buenos', pl: 'Somos buenos' }),
        L({ ru: 'Son buenas', uk: 'Son buenas', es: 'Son buenas', 'pt-BR': 'Son buenas', vi: 'Son buenas', id: 'Son buenas', tr: 'Son buenas', pl: 'Son buenas' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos buenas верно: связка somos для группы, включающей говорящую, плюс окончание -as для женского рода множественного числа — оба условия выполняются одновременно.',
        uk: 'Somos buenas правильно: зв’язка somos для групи, що включає мовицю, плюс закінчення -as для жіночого роду множини — обидві умови виконуються одночасно.',
        es: 'Somos buenas is correct: the linking word somos for a group including the speaker, plus the -as ending for feminine plural — both conditions apply at once.',
        'pt-BR': 'Somos buenas está correto: a ligação somos para um grupo que inclui quem fala, mais a terminação -as para feminino plural — ambas as condições valem ao mesmo tempo.',
        vi: 'Somos buenas đúng: từ nối somos cho nhóm gồm cả người nói, cộng với đuôi -as cho giống cái số nhiều — cả hai điều kiện áp dụng đồng thời.',
        id: 'Somos buenas benar: kata penghubung somos untuk kelompok yang mencakup penutur, ditambah akhiran -as untuk feminin jamak — kedua kondisi berlaku sekaligus.',
        tr: 'Somos buenas doğrudur: konuşanı da içeren bir grup için somos bağlacı, artı dişil çoğul için -as eki — her iki koşul da aynı anda geçerlidir.',
        pl: 'Somos buenas jest poprawne: łącznik somos dla grupy obejmującej mówiącą, plus końcówka -as dla rodzaju żeńskiego liczby mnogiej — oba warunki obowiązują jednocześnie.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Bueno — признак, bien — не признак вовсе',
      uk: 'Bueno — ознака, bien — не ознака зовсім',
      es: 'Bueno is a quality, bien is not a quality at all',
      'pt-BR': 'Bueno é uma qualidade, bien não é qualidade nenhuma',
      vi: 'Bueno là đặc điểm, bien hoàn toàn không phải đặc điểm',
      id: 'Bueno adalah sifat, bien sama sekali bukan sifat',
      tr: 'Bueno bir nitelik, bien hiç nitelik değil',
      pl: 'Bueno to cecha, bien wcale nie jest cechą',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — спутать bueno с bien. Bien значит «хорошо» как наречие («он поёт хорошо»), а bueno — прилагательное-признак («он хороший»). После связки ser нужен именно признак: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', а не ', semantic: 'explanation' }, { text: 'Es bien', semantic: 'targetWrong' }, { text: ' — bien вообще не встаёт после ser в этой конструкции. Вторая ловушка — забыть про полное согласование числа и рода одновременно: про группу женского рода нужно Son buenas, а не Son buenos и не Son buena — оба окончания (число и род) меняются вместе, а не по отдельности.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — сплутати bueno з bien. Bien означає «добре» як прислівник («він співає добре»), а bueno — прикметник-ознака («він добрий»). Після зв’язки ser потрібна саме ознака: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', а не ', semantic: 'explanation' }, { text: 'Es bien', semantic: 'targetWrong' }, { text: ' — bien взагалі не стоїть після ser у цій конструкції. Друга пастка — забути про повне узгодження числа й роду одночасно: про групу жіночого роду потрібно Son buenas, а не Son buenos і не Son buena — обидва закінчення (число і рід) змінюються разом, а не окремо.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is confusing bueno with bien. Bien means "well" as an adverb ("he sings well"), while bueno is the adjective-quality ("he is good"). After the linking word ser, the quality itself is needed: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', not ', semantic: 'explanation' }, { text: 'Es bien', semantic: 'targetWrong' }, { text: ' — bien never follows ser in this construction. The second trap is forgetting full agreement of both number and gender at once: a feminine group needs Son buenas, not Son buenos and not Son buena — both endings (number and gender) change together, not separately.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é confundir bueno com bien. Bien significa "bem" como advérbio ("ele canta bem"), enquanto bueno é o adjetivo-qualidade ("ele é bom"). Depois da ligação ser, é a própria qualidade que se precisa: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', não ', semantic: 'explanation' }, { text: 'Es bien', semantic: 'targetWrong' }, { text: ' — bien nunca vem depois de ser nessa construção. A segunda armadilha é esquecer a concordância completa de número e gênero ao mesmo tempo: um grupo feminino precisa de Son buenas, não Son buenos nem Son buena — as duas terminações (número e gênero) mudam juntas, não separadamente.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là nhầm lẫn bueno với bien. Bien nghĩa là "tốt" như một trạng từ ("anh ấy hát hay"), còn bueno là tính từ-đặc điểm ("anh ấy tốt"). Sau từ nối ser, cần chính đặc điểm đó: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', không phải ', semantic: 'explanation' }, { text: 'Es bien', semantic: 'targetWrong' }, { text: ' — bien không bao giờ đứng sau ser trong cấu trúc này. Cái bẫy thứ hai là quên hòa hợp đầy đủ cả số và giống cùng lúc: nhóm giống cái cần Son buenas, không phải Son buenos hay Son buena — cả hai đuôi (số và giống) thay đổi cùng nhau, không phải riêng lẻ.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah mengacaukan bueno dengan bien. Bien berarti "baik" sebagai kata keterangan ("dia bernyanyi dengan baik"), sedangkan bueno adalah kata sifat-sifat ("dia baik"). Setelah kata penghubung ser, yang diperlukan adalah sifatnya sendiri: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', bukan ', semantic: 'explanation' }, { text: 'Es bien', semantic: 'targetWrong' }, { text: ' — bien tidak pernah mengikuti ser dalam konstruksi ini. Jebakan kedua adalah melupakan kesesuaian penuh jumlah dan gender sekaligus: kelompok feminin memerlukan Son buenas, bukan Son buenos maupun Son buena — kedua akhiran (jumlah dan gender) berubah bersamaan, bukan terpisah.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, bueno’yu bien ile karıştırmaktır. Bien bir zarf olarak "iyi" demektir ("iyi şarkı söylüyor"), bueno ise nitelik-sıfattır ("o iyi"). Ser bağlacından sonra niteliğin kendisi gerekir: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'Es bien', semantic: 'targetWrong' }, { text: ' değil — bien bu yapıda ser’den sonra asla gelmez. İkinci tuzak, sayı ve cinsiyet uyumunu aynı anda unutmaktır: dişil bir grup Son buenas gerektirir, Son buenos veya Son buena değil — her iki ek (sayı ve cinsiyet) birlikte değişir, ayrı ayrı değil.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to mylenie bueno z bien. Bien znaczy „dobrze” jako przysłówek („śpiewa dobrze”), a bueno to przymiotnik-cecha („jest dobry”). Po łączniku ser potrzebna jest właśnie cecha: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', nie ', semantic: 'explanation' }, { text: 'Es bien', semantic: 'targetWrong' }, { text: ' — bien nigdy nie stoi po ser w tej konstrukcji. Druga pułapka to zapominanie o pełnej zgodności liczby i rodzaju jednocześnie: grupa żeńska wymaga Son buenas, nie Son buenos ani Son buena — obie końcówki (liczba i rodzaj) zmieniają się razem, nie osobno.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно оценить кого-то как хорошего после связки ser?',
        uk: 'Як правильно оцінити когось як доброго після зв’язки ser?',
        es: 'How do you correctly evaluate someone as good after the linking word ser?',
        'pt-BR': 'Como avaliar corretamente alguém como bom depois da ligação ser?',
        vi: 'Làm sao để đánh giá đúng ai đó là tốt sau từ nối ser?',
        id: 'Bagaimana cara menilai seseorang dengan benar sebagai baik setelah kata penghubung ser?',
        tr: 'Ser bağlacından sonra biri doğru şekilde nasıl iyi olarak değerlendirilir?',
        pl: 'Jak poprawnie ocenić kogoś jako dobrego po łączniku ser?',
      }),
      choices: [
        L({ ru: 'Es bueno', uk: 'Es bueno', es: 'Es bueno', 'pt-BR': 'Es bueno', vi: 'Es bueno', id: 'Es bueno', tr: 'Es bueno', pl: 'Es bueno' }),
        L({ ru: 'Es bien', uk: 'Es bien', es: 'Es bien', 'pt-BR': 'Es bien', vi: 'Es bien', id: 'Es bien', tr: 'Es bien', pl: 'Es bien' }),
        L({ ru: 'Son bueno', uk: 'Son bueno', es: 'Son bueno', 'pt-BR': 'Son bueno', vi: 'Son bueno', id: 'Son bueno', tr: 'Son bueno', pl: 'Son bueno' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es bueno верно: связка es для одного человека, признак bueno в форме прилагательного. Es bien неверно грамматически (bien — наречие), Son bueno путает число связки с числом признака.',
        uk: 'Es bueno правильно: зв’язка es для однієї людини, ознака bueno у формі прикметника. Es bien неправильно граматично (bien — прислівник), Son bueno плутає число зв’язки з числом ознаки.',
        es: 'Es bueno is correct: the linking word es for one person, the quality bueno in adjective form. Es bien is grammatically wrong (bien is an adverb), Son bueno mixes up the linking word\'s number with the quality\'s number.',
        'pt-BR': 'Es bueno está correto: a ligação es para uma pessoa, a qualidade bueno na forma de adjetivo. Es bien está errado gramaticalmente (bien é advérbio), Son bueno confunde o número da ligação com o número da qualidade.',
        vi: 'Es bueno đúng: từ nối es cho một người, đặc điểm bueno ở dạng tính từ. Es bien sai về ngữ pháp (bien là trạng từ), Son bueno nhầm lẫn số của từ nối với số của đặc điểm.',
        id: 'Es bueno benar: kata penghubung es untuk satu orang, sifat bueno dalam bentuk kata sifat. Es bien salah secara tata bahasa (bien adalah kata keterangan), Son bueno mengacaukan jumlah kata penghubung dengan jumlah sifat.',
        tr: 'Es bueno doğrudur: bir kişi için es bağlacı, sıfat biçiminde bueno niteliği. Es bien dilbilgisel olarak yanlıştır (bien bir zarftır), Son bueno bağlacın sayısını niteliğin sayısıyla karıştırır.',
        pl: 'Es bueno jest poprawne: łącznik es dla jednej osoby, cecha bueno w formie przymiotnika. Es bien jest błędne gramatycznie (bien to przysłówek), Son bueno myli liczbę łącznika z liczbą cechy.',
      }),
    },
  },
];
