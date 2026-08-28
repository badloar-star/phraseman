import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 21 "Предмет — он или она" / noun_gender, builtOn: [17, 18],
// recalls: [3, 18]): три страницы вводят НОВУЮ для курса идею — испанские
// СУЩЕСТВИТЕЛЬНЫЕ (не только прилагательные) сами по себе несут
// грамматический род, произвольный и не связанный с полом. Единственное
// новое слово — libro (книга, мужской род), сопровождается служебным
// артиклем el/la (не отдельная word-first единица, как no/de в прошлых
// сессиях). Формула согласования -o/-a та же, что и в сессии 3 и сессии 18
// (recall), но теперь она распространяется не на абстрактную "оценку по
// умолчанию", а на конкретное слово-предмет со своим зафиксированным родом.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_21_WORD_FIRST_TITLE = L({
  ru: 'Предмет — он или она',
  uk: 'Предмет — він чи вона',
  es: 'The thing — he or she',
  'pt-BR': 'A coisa — ele ou ela',
  vi: 'Sự vật — nó là giống đực hay giống cái',
  id: 'Bendanya — dia jantan atau betina',
  tr: 'Nesne — o mu bu mu',
  pl: 'Rzecz — on czy ona',
});

export const ES_EPISODE_01_SESSION_21_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое слово — libro, «книга» — впервые показывает, что у испанских предметов есть свой род, помеченный артиклем el/la, независимо от того, кто о них говорит.',
  uk: 'Одне нове слово — libro, «книга» — вперше показує, що іспанські предмети мають свій рід, позначений артиклем el/la, незалежно від того, хто про них говорить.',
  es: 'One new word — libro, "book" — shows for the first time that Spanish things have their own gender, marked by the article el/la, no matter who is talking about them.',
  'pt-BR': 'Uma palavra nova — libro, "livro" — mostra pela primeira vez que as coisas em espanhol têm seu próprio gênero, marcado pelo artigo el/la, independente de quem fala delas.',
  vi: 'Một từ mới — libro, "sách" — lần đầu tiên cho thấy các vật trong tiếng Tây Ban Nha có giống riêng, được đánh dấu bằng mạo từ el/la, bất kể ai đang nói về chúng.',
  id: 'Satu kata baru — libro, "buku" — pertama kalinya menunjukkan bahwa benda dalam bahasa Spanyol punya gendernya sendiri, ditandai artikel el/la, terlepas dari siapa yang membicarakannya.',
  tr: 'Bir yeni kelime — libro, "kitap" — İspanyolca’daki şeylerin kendi cinsiyetlerinin olduğunu, kim onlardan bahsederse bahsetsin el/la tanımlığıyla işaretlendiğini ilk kez gösterir.',
  pl: 'Jedno nowe słowo — libro, „książka” — po raz pierwszy pokazuje, że hiszpańskie rzeczy mają własny rodzaj, oznaczony rodzajnikiem el/la, niezależnie od tego, kto o nich mówi.',
});

export const ES_EPISODE_01_SESSION_21_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно построить libro с артиклем el, согласуя признаки вроде caro/barato/bonito с фиксированным родом самого предмета.',
  uk: 'Упізнати на слух, зрозуміти й точно побудувати libro з артиклем el, узгоджуючи ознаки на кшталт caro/barato/bonito із фіксованим родом самого предмета.',
  es: 'Recognize by ear, understand, and correctly build libro with the article el, agreeing qualities like caro/barato/bonito with the thing\'s own fixed gender.',
  'pt-BR': 'Reconhecer de ouvido, entender e construir corretamente libro com o artigo el, concordando qualidades como caro/barato/bonito com o gênero fixo da própria coisa.',
  vi: 'Nghe ra, hiểu và xây dựng đúng libro cùng mạo từ el, hòa hợp các đặc điểm như caro/barato/bonito với giống cố định của chính vật đó.',
  id: 'Mengenali dari suara, memahami, dan membangun libro dengan artikel el dengan tepat, menyesuaikan sifat seperti caro/barato/bonito dengan gender tetap bendanya sendiri.',
  tr: 'Libro’yu el tanımlığıyla duyup tanımak, anlamak ve doğru kurmak; caro/barato/bonito gibi nitelikleri şeyin kendi sabit cinsiyetiyle uyumlu hale getirmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zbudować libro z rodzajnikiem el, dopasowując cechy takie jak caro/barato/bonito do stałego rodzaju samej rzeczy.',
});

const CONCEPT_BODY = L({
  ru: 'Libro называет предмет — книгу — и у этого слова есть свой род, мужской. Артикль el стоит перед libro всегда, потому что род книги не зависит от того, кто о ней говорит: El libro es caro. У каждого испанского предмета есть свой род, и его показывает артикль el или la рядом со словом.',
  uk: 'Libro називає предмет — книгу — і в цього слова є свій рід, чоловічий. Артикль el стоїть перед libro завжди, бо рід книги не залежить від того, хто про неї говорить: El libro es caro. У кожного іспанського предмета є свій рід, і його показує артикль el або la поряд зі словом.',
  es: 'Libro names a thing — a book — and this word has its own gender, masculine. The article el stands before libro always, because the book\'s gender does not depend on who talks about it: El libro es caro. Every Spanish thing has its own gender, shown by the article el or la next to the word.',
  'pt-BR': 'Libro nomeia uma coisa — um livro — e essa palavra tem seu próprio gênero, masculino. O artigo el fica antes de libro sempre, porque o gênero do livro não depende de quem fala dele: El libro es caro. Cada coisa em espanhol tem seu próprio gênero, mostrado pelo artigo el ou la ao lado da palavra.',
  vi: 'Libro gọi tên một vật — một cuốn sách — và từ này có giống riêng, giống đực. Mạo từ el luôn đứng trước libro, vì giống của cuốn sách không phụ thuộc vào ai đang nói về nó: El libro es caro. Mỗi vật trong tiếng Tây Ban Nha có giống riêng, được thể hiện bằng mạo từ el hoặc la bên cạnh từ đó.',
  id: 'Libro menyebut sebuah buku — kata ini punya gendernya sendiri, maskulin. Artikel el selalu berdiri sebelum libro, karena gender buku tidak bergantung pada siapa yang membicarakannya. Setiap benda Spanyol punya gendernya sendiri, ditunjukkan artikel el atau la.',
  tr: 'Libro bir şeyi — bir kitabı — adlandırır ve bu kelimenin kendi cinsiyeti vardır, eril. El tanımlığı libro’dan önce her zaman durur, çünkü kitabın cinsiyeti kim ondan bahsettiğine bağlı değildir: El libro es caro. Her İspanyolca şeyin kendi cinsiyeti vardır ve bunu kelimenin yanındaki el ya da la tanımlığı gösterir.',
  pl: 'Libro nazywa rzecz — książkę — i to słowo ma własny rodzaj, męski. Rodzajnik el stoi przed libro zawsze, bo rodzaj książki nie zależy od tego, kto o niej mówi: El libro es caro. Każda hiszpańska rzecz ma swój rodzaj, pokazywany przez rodzajnik el lub la obok słowa.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что и для caro/cara: концовка -o для мужского рода. У libro концовка -o фиксирована навсегда — libro никогда не станет libra, в отличие от caro, которое умеет меняться на cara. Артикль и признак меняются под род существительного, а само существительное libro — нет: El libro es caro, El libro es bonito.',
  uk: 'Формула та сама, що й для caro/cara: закінчення -o для чоловічого роду. У libro закінчення -o зафіксоване назавжди — libro ніколи не стане libra, на відміну від caro, який уміє змінюватися на cara. Артикль і ознака змінюються під рід іменника, а сам іменник libro — ні: El libro es caro, El libro es bonito.',
  es: 'The formula is the same as for caro/cara: the ending -o for masculine. Libro has the ending -o fixed forever — libro will never become libra, unlike caro, which can change to cara. The article and the quality change to match the noun\'s gender, but the noun libro itself does not: El libro es caro, El libro es bonito.',
  'pt-BR': 'A fórmula é a mesma de caro/cara: terminação -o para masculino. Libro tem a terminação -o fixa para sempre, diferente de caro, que vira cara. O artigo e a qualidade mudam para corresponder ao gênero do substantivo, mas o substantivo libro em si não muda: El libro es caro.',
  vi: 'Công thức giống như caro/cara: đuôi -o cho giống đực. Libro có đuôi -o cố định mãi mãi — libro sẽ không bao giờ trở thành libra, khác với caro, có thể đổi thành cara. Mạo từ và đặc điểm thay đổi để khớp với giống của danh từ, nhưng bản thân danh từ libro thì không: El libro es caro, El libro es bonito.',
  id: 'Rumusnya sama seperti caro/cara: akhiran -o untuk maskulin. Libro memiliki akhiran -o yang tetap selamanya — berbeda dengan caro, yang bisa berubah menjadi cara. Artikel dan sifat berubah mengikuti gender kata benda, tapi kata benda libro itu sendiri tidak: El libro es caro.',
  tr: 'Formül caro/cara ile aynıdır: eril için -o son eki. Libro’nun -o son eki sonsuza dek sabittir — libro asla libra olmaz, cara’ya dönüşebilen caro’nun aksine. Tanımlık ve nitelik ismin cinsiyetine göre değişir, ama libro isminin kendisi değişmez: El libro es caro, El libro es bonito.',
  pl: 'Formuła jest taka sama jak dla caro/cara: końcówka -o dla rodzaju męskiego. Libro ma końcówkę -o ustaloną na zawsze, w przeciwieństwie do caro, który zmienia się w cara. Rodzajnik i cecha zmieniają się zgodnie z rodzajem rzeczownika, ale sam rzeczownik libro się nie zmienia: El libro es caro.',
});

const TRAP_BODY = L({
  ru: 'Легко ошибиться и сказать la libro, думая, что -o всегда значит мужской род — это верно только для libro, род запоминают вместе со словом. Вторая ловушка: если о книге говорит женщина, признак всё равно остаётся caro, а не cara, потому что род принадлежит libro, а не человеку, который о нём говорит.',
  uk: 'Легко помилитися і сказати la libro, думаючи, що -o завжди означає чоловічий рід — це вірно лише для libro, рід запам’ятовують разом зі словом. Друга пастка: якщо про книгу говорить жінка, ознака все одно лишається caro, а не cara, бо рід належить libro, а не людині, яка про нього говорить.',
  es: 'It is easy to say la libro, thinking -o always means masculine — this holds only for libro, gender is memorized along with the word. The second trap: if a woman talks about the book, the quality still stays caro, not cara, because the gender belongs to libro, not the speaker.',
  'pt-BR': 'É fácil errar e dizer la libro, pensando que -o sempre significa masculino — isso vale só para libro, o gênero se memoriza junto com a palavra. A segunda armadilha: se uma mulher fala sobre o livro, a qualidade continua caro, não cara, porque o gênero pertence a libro, não à pessoa que fala dele.',
  vi: 'Dễ mắc lỗi nói la libro, nghĩ rằng -o luôn có nghĩa là giống đực — điều này chỉ đúng với libro, giống được ghi nhớ cùng với từ. Cái bẫy thứ hai: nếu một phụ nữ nói về cuốn sách, đặc điểm vẫn là caro, không phải cara, vì giống thuộc về libro, không phải người nói về nó.',
  id: 'Mudah salah mengatakan la libro, mengira bahwa -o selalu berarti maskulin — ini hanya berlaku untuk libro, gender dihafal bersama katanya. Jebakan kedua: jika seorang wanita berbicara tentang buku, sifatnya tetap caro, bukan cara, karena gendernya milik libro, bukan orang yang membicarakannya.',
  tr: 'Her zaman eril olduğunu düşünüp la libro demek kolay bir hatadır — bu yalnızca libro için geçerlidir, cinsiyet kelimeyle ezberlenir. İkinci tuzak: bir kadın kitap hakkında konuşuyorsa, nitelik yine de caro kalır, cara değil, çünkü cinsiyet libro’ya aittir, konuşana değil.',
  pl: 'Łatwo popełnić błąd i powiedzieć la libro, myśląc, że -o zawsze oznacza rodzaj męski — to prawda tylko dla libro, rodzaj zapamiętuje się razem ze słowem. Druga pułapka: jeśli o książce mówi kobieta, cecha nadal zostaje caro, nie cara, bo rodzaj należy do libro, nie do osoby, która o niej mówi.',
});

export const ES_EPISODE_01_SESSION_21_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'У предмета есть свой род',
      uk: 'У предмета є свій рід',
      es: 'A thing has its own gender',
      'pt-BR': 'Uma coisa tem seu próprio gênero',
      vi: 'Một vật có giống riêng của nó',
      id: 'Benda punya gendernya sendiri',
      tr: 'Bir şeyin kendi cinsiyeti vardır',
      pl: 'Rzecz ma swój własny rodzaj',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Libro называет предмет — книгу — и у этого слова есть свой род, мужской, точно так же, как у прилагательных caro или bonito уже есть свои формы. Артикль ', semantic: 'explanation' }, { text: 'el', semantic: 'targetCorrect' }, { text: ' стоит перед libro всегда, потому что род книги не зависит от того, кто о ней говорит: El libro es caro — Книга дорогая. Этот род не связан с полом — книга не «мужчина», просто испанское слово libro исторически мужского рода, и это нужно запомнить вместе со словом. Ответ прост: у каждого испанского предмета есть свой род, и его показывает артикль el или la рядом со словом.', semantic: 'explanation' }),
      uk: R({ text: 'Libro називає предмет — книгу — і в цього слова є свій рід, чоловічий, точнісінько як у прикметників caro чи bonito вже є свої форми. Артикль ', semantic: 'explanation' }, { text: 'el', semantic: 'targetCorrect' }, { text: ' стоїть перед libro завжди, бо рід книги не залежить від того, хто про неї говорить: El libro es caro — Книга дорога. Цей рід не пов’язаний зі статтю — книга не «чоловік», просто іспанське слово libro історично чоловічого роду, і це треба запам’ятати разом зі словом. Відповідь проста: у кожного іспанського предмета є свій рід, і його показує артикль el або la поряд зі словом.', semantic: 'explanation' }),
      es: R({ text: 'Libro names a thing — a book — and this word has its own gender, masculine, just as the adjectives caro or bonito already have their own forms. The article ', semantic: 'explanation' }, { text: 'el', semantic: 'targetCorrect' }, { text: ' stands before libro always, because the book\'s gender does not depend on who talks about it: El libro es caro — The book is expensive. This gender has nothing to do with sex — a book is not "male," the Spanish word libro is simply historically masculine, and this must be learned along with the word. The answer is simple: every Spanish thing has its own gender, shown by the article el or la next to the word.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Libro nomeia uma coisa — um livro — e essa palavra tem seu próprio gênero, masculino, assim como os adjetivos caro ou bonito já têm suas próprias formas. O artigo ', semantic: 'explanation' }, { text: 'el', semantic: 'targetCorrect' }, { text: ' fica antes de libro sempre, porque o gênero do livro não depende de quem fala dele: El libro es caro — O livro é caro. Esse gênero não tem relação com sexo — um livro não é "homem," a palavra espanhola libro é simplesmente historicamente masculina, e isso precisa ser aprendido junto com a palavra. A resposta é simples: cada coisa em espanhol tem seu próprio gênero, mostrado pelo artigo el ou la ao lado da palavra.', semantic: 'explanation' }),
      vi: R({ text: 'Libro gọi tên một vật — một cuốn sách — và từ này có giống riêng, giống đực, y hệt như các tính từ caro hay bonito đã có dạng riêng của chúng. Mạo từ ', semantic: 'explanation' }, { text: 'el', semantic: 'targetCorrect' }, { text: ' luôn đứng trước libro, vì giống của cuốn sách không phụ thuộc vào ai đang nói về nó: El libro es caro — Cuốn sách đắt. Giống này không liên quan đến giới tính — cuốn sách không phải là "đàn ông," từ tiếng Tây Ban Nha libro đơn giản là về mặt lịch sử thuộc giống đực, và điều này cần được học cùng với từ đó. Câu trả lời rất đơn giản: mỗi vật trong tiếng Tây Ban Nha có giống riêng, được thể hiện bằng mạo từ el hoặc la bên cạnh từ đó.', semantic: 'explanation' }),
      id: R({ text: 'Libro menyebut suatu benda — sebuah buku — dan kata ini punya gendernya sendiri, maskulin, persis seperti kata sifat caro atau bonito yang sudah punya bentuknya sendiri. Artikel ', semantic: 'explanation' }, { text: 'el', semantic: 'targetCorrect' }, { text: ' selalu berdiri sebelum libro, karena gender buku tidak bergantung pada siapa yang membicarakannya: El libro es caro — Bukunya mahal. Gender ini tidak ada hubungannya dengan jenis kelamin — buku bukan "laki-laki," kata Spanyol libro secara historis memang maskulin, dan ini harus dihafal bersama katanya. Jawabannya sederhana: setiap benda dalam bahasa Spanyol punya gendernya sendiri, ditunjukkan oleh artikel el atau la di samping kata itu.', semantic: 'explanation' }),
      tr: R({ text: 'Libro bir şeyi — bir kitabı — adlandırır ve bu kelimenin kendi cinsiyeti vardır, eril, tıpkı caro ya da bonito sıfatlarının zaten kendi biçimleri olduğu gibi. ', semantic: 'explanation' }, { text: 'El', semantic: 'targetCorrect' }, { text: ' tanımlığı libro’dan önce her zaman durur, çünkü kitabın cinsiyeti kim ondan bahsettiğine bağlı değildir: El libro es caro — Kitap pahalı. Bu cinsiyetin cinsiyetle (biyolojik) ilgisi yoktur — kitap "erkek" değildir, İspanyolca libro kelimesi sadece tarihsel olarak erildir, ve bu kelimeyle birlikte ezberlenmelidir. Cevap basittir: her İspanyolca şeyin kendi cinsiyeti vardır ve bunu kelimenin yanındaki el ya da la tanımlığı gösterir.', semantic: 'explanation' }),
      pl: R({ text: 'Libro nazywa rzecz — książkę — i to słowo ma własny rodzaj, męski, dokładnie tak jak przymiotniki caro czy bonito mają już swoje formy. Rodzajnik ', semantic: 'explanation' }, { text: 'el', semantic: 'targetCorrect' }, { text: ' stoi przed libro zawsze, bo rodzaj książki nie zależy od tego, kto o niej mówi: El libro es caro — Książka jest droga. Ten rodzaj nie ma nic wspólnego z płcią — książka nie jest „mężczyzną”, hiszpańskie słowo libro jest po prostu historycznie rodzaju męskiego, i trzeba to zapamiętać razem ze słowem. Odpowiedź jest prosta: każda hiszpańska rzecz ma swój rodzaj, pokazywany przez rodzajnik el lub la obok słowa.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'От чего зависит артикль перед libro?',
        uk: 'Від чого залежить артикль перед libro?',
        es: 'What does the article before libro depend on?',
        'pt-BR': 'De que depende o artigo antes de libro?',
        vi: 'Mạo từ trước libro phụ thuộc vào điều gì?',
        id: 'Apa yang menentukan artikel sebelum libro?',
        tr: 'Libro’dan önceki tanımlık neye bağlıdır?',
        pl: 'Od czego zależy rodzajnik przed libro?',
      }),
      choices: [
        L({ ru: 'потому что род книги не зависит от того, кто о ней говорит', uk: 'бо рід книги не залежить від того, хто про неї говорить', es: "the book's gender does not depend on who talks about it", 'pt-BR': 'o gênero do livro não depende de quem fala dele', vi: 'giống của cuốn sách không phụ thuộc vào ai đang nói về nó', id: 'gender buku tidak bergantung pada siapa yang membicarakannya', tr: 'kitabın cinsiyeti kim ondan bahsettiğine bağlı değildir', pl: 'rodzaj książki nie zależy od tego, kto o niej mówi' }),
        L({ ru: 'От того, кто о нём говорит', uk: 'Від того, хто про нього говорить', es: 'Who is talking about it', 'pt-BR': 'De quem fala dele', vi: 'Ai đang nói về nó', id: 'Siapa yang membicarakannya', tr: 'Ondan kimin bahsettiği', pl: 'Od tego, kto o niej mówi' }),
        L({ ru: 'От цены предмета', uk: 'Від ціни предмета', es: 'The thing\'s price', 'pt-BR': 'Do preço da coisa', vi: 'Giá của vật', id: 'Harga bendanya', tr: 'Şeyin fiyatı', pl: 'Od ceny rzeczy' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Верно, потому что род книги не зависит от того, кто о ней говорит — артикль el стоит перед libro всегда, а не от цены и не от говорящего.',
        uk: 'Правильно, бо рід книги не залежить від того, хто про неї говорить — артикль el стоїть перед libro завжди, а не від ціни й не від мовця.',
        es: "Correct: the book's gender does not depend on who talks about it — the article el always stands before libro, not on price or the speaker.",
        'pt-BR': 'Correto: o gênero do livro não depende de quem fala dele — o artigo el fica antes de libro sempre, não do preço nem de quem fala.',
        vi: 'Đúng, vì giống của cuốn sách không phụ thuộc vào ai đang nói về nó — mạo từ el luôn đứng trước libro, không phải giá cả hay người nói.',
        id: 'Benar, karena gender buku tidak bergantung pada siapa yang membicarakannya — artikel el selalu berdiri sebelum libro, bukan harga atau pembicara.',
        tr: 'Doğru, çünkü kitabın cinsiyeti kim ondan bahsettiğine bağlı değildir — el tanımlığı libro’dan önce her zaman durur, fiyata ya da konuşana değil.',
        pl: 'Poprawnie, bo rodzaj książki nie zależy od tego, kto o niej mówi — rodzajnik el zawsze stoi przed libro, nie od ceny ani od mówiącego.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'El libro caro, никогда la libro cara',
      uk: 'El libro caro, ніколи la libro cara',
      es: 'El libro caro, never la libro cara',
      'pt-BR': 'El libro caro, nunca la libro cara',
      vi: 'El libro caro, không bao giờ la libro cara',
      id: 'El libro caro, tak pernah la libro cara',
      tr: 'El libro caro, asla la libro cara değil',
      pl: 'El libro caro, nigdy la libro cara',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула та же, что и для caro/cara или bonito/bonita: концовка -o для мужского рода, концовка -a для женского. У ', semantic: 'explanation' }, { text: 'libro', semantic: 'targetCorrect' }, { text: ' концовка -o, и это фиксировано навсегда — libro никогда не станет libra, в отличие от прилагательного caro, которое умеет меняться на cara. Артикль перед словом всегда совпадает с этим родом: el libro, никогда la libro. А признак, который описывает libro, тоже берёт форму на -o, потому что подстраивается под род предмета, а не наоборот: ', semantic: 'explanation' }, { text: 'El libro es caro', semantic: 'targetCorrect' }, { text: ', El libro es bonito. Ответ прост: артикль и признак меняются под род существительного, а само существительное libro — нет.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й для caro/cara чи bonito/bonita: закінчення -o для чоловічого роду, закінчення -a для жіночого. У ', semantic: 'explanation' }, { text: 'libro', semantic: 'targetCorrect' }, { text: ' закінчення -o, і воно зафіксоване назавжди — libro ніколи не стане libra, на відміну від прикметника caro, який уміє змінюватися на cara. Артикль перед словом завжди збігається з цим родом: el libro, ніколи la libro. А ознака, що описує libro, теж бере форму на -o, бо підлаштовується під рід предмета, а не навпаки: ', semantic: 'explanation' }, { text: 'El libro es caro', semantic: 'targetCorrect' }, { text: ', El libro es bonito. Відповідь проста: артикль і ознака змінюються під рід іменника, а сам іменник libro — ні.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for caro/cara or bonito/bonita: the ending -o for masculine, the ending -a for feminine. ', semantic: 'explanation' }, { text: 'Libro', semantic: 'targetCorrect' }, { text: ' has the ending -o, and it is fixed forever — libro will never become libra, unlike the adjective caro, which can change to cara. The article before the word always matches this gender: el libro, never la libro. And the quality describing libro also takes the -o form, because it adapts to the thing\'s gender, not the other way around: ', semantic: 'explanation' }, { text: 'El libro es caro', semantic: 'targetCorrect' }, { text: ', El libro es bonito. The answer is simple: the article and the quality change to match the noun\'s gender, but the noun libro itself does not.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de caro/cara ou bonito/bonita: a terminação -o para masculino, a terminação -a para feminino. ', semantic: 'explanation' }, { text: 'Libro', semantic: 'targetCorrect' }, { text: ' tem a terminação -o, e ela é fixa para sempre — libro nunca vira libra, diferente do adjetivo caro, que consegue virar cara. O artigo antes da palavra sempre corresponde a esse gênero: el libro, nunca la libro. E a qualidade que descreve libro também toma a forma -o, porque se adapta ao gênero da coisa, não o contrário: ', semantic: 'explanation' }, { text: 'El libro es caro', semantic: 'targetCorrect' }, { text: ', El libro es bonito. A resposta é simples: o artigo e a qualidade mudam para corresponder ao gênero do substantivo, mas o substantivo libro em si não muda.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống như caro/cara hay bonito/bonita: đuôi -o cho giống đực, đuôi -a cho giống cái. ', semantic: 'explanation' }, { text: 'Libro', semantic: 'targetCorrect' }, { text: ' có đuôi -o, và nó cố định mãi mãi — libro sẽ không bao giờ trở thành libra, khác với tính từ caro, có thể đổi thành cara. Mạo từ trước từ luôn khớp với giống này: el libro, không bao giờ la libro. Và đặc điểm mô tả libro cũng lấy dạng -o, vì nó thích nghi theo giống của vật, chứ không phải ngược lại: ', semantic: 'explanation' }, { text: 'El libro es caro', semantic: 'targetCorrect' }, { text: ', El libro es bonito. Câu trả lời rất đơn giản: mạo từ và đặc điểm thay đổi để khớp với giống của danh từ, nhưng bản thân danh từ libro thì không.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti caro/cara atau bonito/bonita: akhiran -o untuk maskulin, akhiran -a untuk feminin. ', semantic: 'explanation' }, { text: 'Libro', semantic: 'targetCorrect' }, { text: ' memiliki akhiran -o, dan itu tetap selamanya — libro tidak akan pernah menjadi libra, berbeda dengan kata sifat caro, yang bisa berubah menjadi cara. Artikel sebelum kata selalu cocok dengan gender ini: el libro, tidak pernah la libro. Dan sifat yang menggambarkan libro juga mengambil bentuk -o, karena menyesuaikan dengan gender bendanya, bukan sebaliknya: ', semantic: 'explanation' }, { text: 'El libro es caro', semantic: 'targetCorrect' }, { text: ', El libro es bonito. Jawabannya sederhana: artikel dan sifat berubah mengikuti gender kata benda, tapi kata benda libro itu sendiri tidak.', semantic: 'explanation' }),
      tr: R({ text: 'Formül caro/cara ya da bonito/bonita ile aynıdır: eril için -o son eki, dişil için -a son eki. ', semantic: 'explanation' }, { text: 'Libro', semantic: 'targetCorrect' }, { text: '’nun -o son eki vardır, ve bu sonsuza dek sabittir — libro asla libra olmaz, cara’ya dönüşebilen caro sıfatının aksine. Kelimeden önceki tanımlık her zaman bu cinsiyetle eşleşir: el libro, asla la libro değil. Ve libro’yu tanımlayan nitelik de -o biçimini alır, çünkü tersi değil, şeyin cinsiyetine uyum sağlar: ', semantic: 'explanation' }, { text: 'El libro es caro', semantic: 'targetCorrect' }, { text: ', El libro es bonito. Cevap basittir: tanımlık ve nitelik ismin cinsiyetine göre değişir, ama libro isminin kendisi değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla caro/cara czy bonito/bonita: końcówka -o dla rodzaju męskiego, końcówka -a dla żeńskiego. ', semantic: 'explanation' }, { text: 'Libro', semantic: 'targetCorrect' }, { text: ' ma końcówkę -o, i jest ona ustalona na zawsze — libro nigdy nie stanie się libra, w przeciwieństwie do przymiotnika caro, który potrafi zmienić się w cara. Rodzajnik przed słowem zawsze pasuje do tego rodzaju: el libro, nigdy la libro. A cecha opisująca libro też przyjmuje formę -o, bo dostosowuje się do rodzaju rzeczy, a nie odwrotnie: ', semantic: 'explanation' }, { text: 'El libro es caro', semantic: 'targetCorrect' }, { text: ', El libro es bonito. Odpowiedź jest prosta: rodzajnik i cecha zmieniają się zgodnie z rodzajem rzeczownika, ale sam rzeczownik libro się nie zmienia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что меняется, а что не меняется у libro?',
        uk: 'Що змінюється, а що не змінюється у libro?',
        es: 'What changes and what does not change about libro?',
        'pt-BR': 'O que muda e o que não muda em libro?',
        vi: 'Điều gì thay đổi và điều gì không thay đổi ở libro?',
        id: 'Apa yang berubah dan apa yang tidak berubah pada libro?',
        tr: 'Libro’da ne değişir, ne değişmez?',
        pl: 'Co się zmienia, a co nie zmienia się w libro?',
      }),
      choices: [
        L({ ru: 'артикль и признак меняются под род существительного, а само существительное libro — нет', uk: 'артикль і ознака змінюються під рід іменника, а сам іменник libro — ні', es: "the article and the quality change to match the noun's gender, but the noun libro itself does not", 'pt-BR': 'o artigo e a qualidade mudam para corresponder ao gênero do substantivo, mas o substantivo libro em si não muda', vi: 'mạo từ và đặc điểm thay đổi để khớp với giống của danh từ, nhưng bản thân danh từ libro thì không', id: 'artikel dan sifat berubah mengikuti gender kata benda, tapi kata benda libro itu sendiri tidak', tr: 'tanımlık ve nitelik ismin cinsiyetine göre değişir, ama libro isminin kendisi değişmez', pl: 'rodzajnik i cecha zmieniają się zgodnie z rodzajem rzeczownika, ale sam rzeczownik libro się nie zmienia' }),
        L({ ru: 'Само слово libro меняется на libra', uk: 'Саме слово libro змінюється на libra', es: 'The word libro itself changes to libra', 'pt-BR': 'A própria palavra libro muda para libra', vi: 'Bản thân từ libro đổi thành libra', id: 'Kata libro itu sendiri berubah menjadi libra', tr: 'Libro kelimesinin kendisi libra’ya değişir', pl: 'Samo słowo libro zmienia się w libra' }),
        L({ ru: 'Ничего не меняется никогда', uk: 'Нічого не змінюється ніколи', es: 'Nothing ever changes', 'pt-BR': 'Nada nunca muda', vi: 'Không có gì thay đổi bao giờ', id: 'Tidak ada yang pernah berubah', tr: 'Hiçbir şey asla değişmez', pl: 'Nic się nigdy nie zmienia' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Верно: артикль и признак меняются под род существительного (el libro caro), а само существительное libro — нет, оно никогда не становится libra.',
        uk: 'Правильно: артикль і ознака змінюються під рід іменника (el libro caro), а сам іменник libro — ні, він ніколи не стає libra.',
        es: "Correct: the article and the quality change to match the noun's gender (el libro caro), but the noun libro itself does not — it never becomes libra.",
        'pt-BR': 'Correto: o artigo e a qualidade mudam para corresponder ao gênero do substantivo (el libro caro), mas o substantivo libro em si não — ele nunca vira libra.',
        vi: 'Đúng: mạo từ và đặc điểm thay đổi để khớp với giống của danh từ (el libro caro), nhưng bản thân danh từ libro thì không — nó không bao giờ trở thành libra.',
        id: 'Benar: artikel dan sifat berubah mengikuti gender kata benda (el libro caro), tapi kata benda libro itu sendiri tidak — ia tidak pernah menjadi libra.',
        tr: 'Doğru: tanımlık ve nitelik ismin cinsiyetine göre değişir (el libro caro), ama libro isminin kendisi değişmez — asla libra olmaz.',
        pl: 'Poprawnie: rodzajnik i cecha zmieniają się zgodnie z rodzajem rzeczownika (el libro caro), ale sam rzeczownik libro się nie zmienia — nigdy nie staje się libra.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не по концовке, не по говорящему',
      uk: 'Не за закінченням, не за мовцем',
      es: 'Not by ending, not by the speaker',
      'pt-BR': 'Não pela terminação, não por quem fala',
      vi: 'Không theo đuôi từ, không theo người nói',
      id: 'Bukan dari akhiran, bukan dari pembicara',
      tr: 'Sona göre değil, konuşana göre değil',
      pl: 'Nie po końcówce, nie po mówiącym',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Легко ошибиться и сказать ', semantic: 'explanation' }, { text: 'la libro', semantic: 'targetWrong' }, { text: ', думая, что -o всегда значит мужской род. Это верно только для libro, а не всеобщее правило: род запоминают вместе со словом. Вторая ловушка — согласовать признак с полом говорящего, а не с родом предмета: если о книге говорит женщина, признак всё равно остаётся ', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ', а не cara, потому что род принадлежит libro, а не человеку, который о нём говорит. Проверка простая: libro — всегда libro, el — перед ним всегда, а признак берёт -o, потому что таков род книги.', semantic: 'explanation' }),
      uk: R({ text: 'Легко помилитися і сказати ', semantic: 'explanation' }, { text: 'la libro', semantic: 'targetWrong' }, { text: ', думаючи, що -o завжди означає чоловічий рід. Це вірно лише для libro, а не загальне правило: рід запам’ятовують разом зі словом. Друга пастка — узгодити ознаку зі статтю мовця, а не з родом предмета: якщо про книгу говорить жінка, ознака все одно лишається ', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ', а не cara, бо рід належить libro, а не людині, яка про нього говорить. Перевірка проста: libro — завжди libro, el — перед ним завжди, а ознака бере -o, бо такий рід книги.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to make the mistake of saying ', semantic: 'explanation' }, { text: 'la libro', semantic: 'targetWrong' }, { text: ', thinking that -o always means masculine. This holds only for libro, not as a universal rule: gender is memorized along with the word. The second trap is agreeing the quality with the speaker\'s sex instead of the thing\'s gender: if a woman is talking about the book, the quality still stays ', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ', not cara, because the gender belongs to libro, not to the person talking about it. The check is simple: libro is always libro, el always stands before it, and the quality takes -o because that is the book\'s gender.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil errar e dizer ', semantic: 'explanation' }, { text: 'la libro', semantic: 'targetWrong' }, { text: ', pensando que -o sempre significa masculino. Isso vale só para libro, não como regra universal: o gênero se memoriza junto com a palavra. A segunda armadilha é concordar a qualidade com o sexo de quem fala em vez do gênero da coisa: se uma mulher fala sobre o livro, a qualidade continua ', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ', não cara, porque o gênero pertence a libro, não à pessoa que fala dele. A checagem é simples: libro é sempre libro, el sempre fica antes dele, e a qualidade toma -o porque esse é o gênero do livro.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ mắc lỗi nói ', semantic: 'explanation' }, { text: 'la libro', semantic: 'targetWrong' }, { text: ', nghĩ rằng -o luôn có nghĩa là giống đực. Điều này chỉ đúng với libro, không phải quy tắc chung: giống được ghi nhớ cùng với từ. Cái bẫy thứ hai là hòa hợp đặc điểm theo giới tính của người nói thay vì giống của vật: nếu một phụ nữ nói về cuốn sách, đặc điểm vẫn là ', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ', không phải cara, vì giống thuộc về libro, không phải người nói về nó. Cách kiểm tra đơn giản: libro luôn là libro, el luôn đứng trước nó, và đặc điểm lấy -o vì đó là giống của cuốn sách.', semantic: 'explanation' }),
      id: R({ text: 'Mudah salah mengatakan ', semantic: 'explanation' }, { text: 'la libro', semantic: 'targetWrong' }, { text: ', mengira bahwa -o selalu berarti maskulin. Ini hanya berlaku untuk libro, bukan aturan umum: gender dihafal bersama katanya. Jebakan kedua adalah menyesuaikan sifat dengan jenis kelamin pembicara, bukan gender bendanya: jika seorang wanita berbicara tentang buku, sifatnya tetap ', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ', bukan cara, karena gendernya milik libro, bukan orang yang membicarakannya. Pengecekannya sederhana: libro selalu libro, el selalu berdiri sebelumnya, dan sifatnya mengambil -o karena itulah gender buku.', semantic: 'explanation' }),
      tr: R({ text: 'Kelime -o ile bittiği için her zaman eril olduğunu düşünüp ', semantic: 'explanation' }, { text: 'la libro', semantic: 'targetWrong' }, { text: ' demek kolay bir hatadır. Bu yalnızca libro için geçerlidir, evrensel bir kural değil: cinsiyet kelimeyle birlikte ezberlenir. İkinci tuzak, niteliği şeyin cinsiyeti yerine konuşanın cinsiyetiyle uyumlu hale getirmektir: eğer bir kadın kitap hakkında konuşuyorsa, nitelik yine de ', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ' kalır, cara değil, çünkü cinsiyet libro’ya aittir, ondan bahseden kişiye değil. Kontrol basittir: libro her zaman libro’dur, el her zaman ondan önce durur, ve nitelik -o alır çünkü bu kitabın cinsiyetidir.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo popełnić błąd i powiedzieć ', semantic: 'explanation' }, { text: 'la libro', semantic: 'targetWrong' }, { text: ', myśląc, że -o zawsze oznacza rodzaj męski. To prawda tylko dla libro, nie jako uniwersalna zasada: rodzaj zapamiętuje się razem ze słowem. Druga pułapka to dopasowanie cechy do płci mówiącego zamiast do rodzaju rzeczy: jeśli o książce mówi kobieta, cecha nadal zostaje ', semantic: 'explanation' }, { text: 'caro', semantic: 'targetCorrect' }, { text: ', nie cara, bo rodzaj należy do libro, nie do osoby, która o niej mówi. Sprawdzenie jest proste: libro to zawsze libro, el zawsze stoi przed nim, a cecha przyjmuje -o, bo taki jest rodzaj książki.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Если о книге говорит женщина, каким будет признак?',
        uk: 'Якщо про книгу говорить жінка, якою буде ознака?',
        es: 'If a woman is talking about the book, what will the quality be?',
        'pt-BR': 'Se uma mulher fala sobre o livro, qual será a qualidade?',
        vi: 'Nếu một phụ nữ nói về cuốn sách, đặc điểm sẽ ra sao?',
        id: 'Jika seorang wanita berbicara tentang buku, apa sifatnya?',
        tr: 'Bir kadın kitap hakkında konuşuyorsa nitelik ne olur?',
        pl: 'Jeśli o książce mówi kobieta, jaka będzie cecha?',
      }),
      choices: [
        L({ ru: 'признак всё равно остаётся caro, а не cara, потому что род принадлежит libro', uk: 'ознака все одно лишається caro, а не cara, бо рід належить libro', es: 'the quality still stays caro, not cara, because the gender belongs to libro', 'pt-BR': 'a qualidade continua caro, não cara, porque o gênero pertence a libro', vi: 'đặc điểm vẫn là caro, không phải cara, vì giống thuộc về libro', id: 'sifatnya tetap caro, bukan cara, karena gendernya milik libro', tr: 'nitelik yine de caro kalır, cara değil, çünkü cinsiyet libro’ya aittir', pl: 'cecha nadal zostaje caro, nie cara, bo rodzaj należy do libro' }),
        L({ ru: 'Cara, потому что говорит женщина', uk: 'Cara, бо говорить жінка', es: 'Cara, because a woman is speaking', 'pt-BR': 'Cara, porque uma mulher fala', vi: 'Cara, vì một phụ nữ đang nói', id: 'Cara, karena seorang wanita berbicara', tr: 'Cara, çünkü konuşan bir kadın', pl: 'Cara, bo mówi kobieta' }),
        L({ ru: 'Ни то ни другое, признак не нужен', uk: 'Ні те ні інше, ознака не потрібна', es: 'Neither, no quality is needed', 'pt-BR': 'Nenhuma das duas, não precisa de qualidade', vi: 'Không cái nào cả, không cần đặc điểm', id: 'Bukan keduanya, tidak perlu sifat', tr: 'Hiçbiri, nitelik gerekmez', pl: 'Żadne z nich, cecha nie jest potrzebna' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Верно: признак всё равно остаётся caro, а не cara, потому что род принадлежит libro, а не человеку, который о нём говорит.',
        uk: 'Правильно: ознака все одно лишається caro, а не cara, бо рід належить libro, а не людині, яка про нього говорить.',
        es: 'Correct: the quality still stays caro, not cara, because the gender belongs to libro, not to the person talking about it.',
        'pt-BR': 'Correto: a qualidade continua caro, não cara, porque o gênero pertence a libro, não à pessoa que fala dele.',
        vi: 'Đúng: đặc điểm vẫn là caro, không phải cara, vì giống thuộc về libro, không phải người nói về nó.',
        id: 'Benar: sifatnya tetap caro, bukan cara, karena gendernya milik libro, bukan orang yang membicarakannya.',
        tr: 'Doğru: nitelik yine de caro kalır, cara değil, çünkü cinsiyet libro’ya aittir, ondan bahseden kişiye değil.',
        pl: 'Poprawnie: cecha nadal zostaje caro, nie cara, bo rodzaj należy do libro, nie do osoby, która o niej mówi.',
      }),
    },
  },
];
