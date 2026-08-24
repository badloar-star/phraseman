import type { LocalizedIntroRunsSource, LocalizedSource, SessionSourceIntroPage } from './session_shard_from_source_v1';
import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CORRECT = new Set(['a + consonant sound', 'an + vowel sound', 'i am', "i'm"]);
const TERMS = ['a + consonant sound', 'an + vowel sound', 'I am', "I'm", 'I’m'];
const norm = (value: string): string => value.replace(/[’]/gu, "'").toLocaleLowerCase('en');

function markBody(body: LocalizedSource): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale] ?? '';
    const runs: LearningV2IntroTextRunV1[] = [];
    let cursor = 0;
    while (cursor < text.length) {
      const term = TERMS.find((candidate) => norm(text.slice(cursor, cursor + candidate.length)) === norm(candidate));
      if (term) {
        const exact = text.slice(cursor, cursor + term.length);
        runs.push({ text: exact, semantic: CORRECT.has(norm(term)) ? 'targetCorrect' : 'targetWrong' });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < text.length && !TERMS.some((candidate) => norm(text.slice(end, end + candidate.length)) === norm(candidate))) end += 1;
      runs.push({ text: text.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, runs];
  })) as unknown as LocalizedIntroRunsSource;
}

export const EPISODE_01_SESSION_06_WORD_FIRST_TITLE = L({
  ru: 'Профессия с a и an', uk: 'Професія з a та an', es: 'La profesión con a y an',
  'pt-BR': 'A profissão com a e an', vi: 'Nghề nghiệp với a và an', id: 'Profesi dengan a dan an',
  tr: 'Meslekle a ve an', pl: 'Zawód z a i an',
});
export const EPISODE_01_SESSION_06_WORD_FIRST_SUMMARY = L({
  ru: 'Перед одной профессией английский выбирает a или an по первому звуку следующего слова.',
  uk: 'Перед однією професією англійська обирає a або an за першим звуком наступного слова.',
  es: 'Ante una profesión en singular, el inglés elige a o an según el primer sonido de la palabra siguiente.',
  'pt-BR': 'Antes de uma profissão no singular, o inglês escolhe a ou an pelo primeiro som da palavra seguinte.',
  vi: 'Trước một nghề ở số ít, tiếng Anh chọn a hoặc an theo âm đầu của từ tiếp theo.',
  id: 'Sebelum satu profesi, bahasa Inggris memilih a atau an menurut bunyi awal kata berikutnya.',
  tr: 'Tekil bir meslek önünde İngilizce sonraki sözcüğün ilk sesine göre a ya da an seçer.',
  pl: 'Przed nazwą jednego zawodu angielski wybiera a albo an według pierwszego dźwięku następnego słowa.',
});
export const EPISODE_01_SESSION_06_WORD_FIRST_GOAL = L({
  ru: 'Различать a и an и представляться как teacher или artist.',
  uk: 'Розрізняти a й an та представлятися як teacher або artist.',
  es: 'Distinguir a y an y presentarse como teacher o artist.',
  'pt-BR': 'Distinguir a e an e apresentar-se como teacher ou artist.',
  vi: 'Phân biệt a và an, đồng thời giới thiệu nghề teacher hoặc artist.',
  id: 'Membedakan a dan an serta memperkenalkan diri sebagai teacher atau artist.',
  tr: 'A ile an biçimlerini ayırıp kendini teacher ya da artist olarak tanıtmak.',
  pl: 'Rozróżniać a i an oraz przedstawiać się jako teacher albo artist.',
});

const conceptBody = L({
  ru: 'По-русски профессию можно поставить сразу после «я»: «я учитель». Английская связка I am соединяет человека с описанием, но перед названием одной профессии нужен ещё маленький артикль. Он показывает, что речь идёт об одном представителе профессии, а не о качестве. Поэтому английская рамка состоит из трёх частей: I am, артикль и название профессии. Пропуск артикля оставляет фразу грамматически незаконченной.',
  uk: 'Українською професію можна поставити одразу після «я»: «я вчитель». Англійська зв’язка I am поєднує людину з описом, але перед назвою однієї професії потрібен ще маленький артикль. Він показує, що йдеться про одного представника професії, а не про ознаку. Тому англійська рамка має три частини: I am, артикль і назву професії. Пропуск артикля залишає фразу граматично незавершеною.',
  es: 'En español la profesión puede ir tras ser: «soy profesor». El inglés usa I am para unir a la persona con la descripción, pero ante una profesión singular necesita además un artículo pequeño. Ese artículo presenta a una persona como miembro de una profesión, no como una cualidad. La estructura inglesa tiene tres partes: I am, artículo y profesión. Si se omite el artículo, la frase queda incompleta.',
  'pt-BR': 'Em português, a profissão pode vir depois de ser: «sou professor». O inglês usa I am para ligar a pessoa à descrição, mas antes de uma profissão no singular também precisa de um artigo pequeno. Esse artigo apresenta uma pessoa como membro da profissão, não como qualidade. A estrutura inglesa tem três partes: I am, artigo e profissão. Sem o artigo, a frase fica incompleta.',
  vi: 'Trong tiếng Việt có thể nói nghề ngay sau chủ thể: “tôi là giáo viên”. Tiếng Anh dùng I am để nối người nói với phần mô tả, nhưng trước một nghề ở số ít còn cần một mạo từ nhỏ. Mạo từ cho biết đây là một người thuộc nghề đó, không phải một đặc điểm. Khung tiếng Anh có ba phần: I am, mạo từ và nghề nghiệp. Bỏ mạo từ làm câu chưa hoàn chỉnh.',
  id: 'Dalam bahasa Indonesia profesi dapat langsung mengikuti “saya”: “saya guru”. Bahasa Inggris memakai I am untuk menghubungkan orang dengan keterangan, tetapi sebelum profesi tunggal masih diperlukan artikel kecil. Artikel itu menunjukkan satu anggota profesi, bukan sifat. Kerangka Inggris memiliki tiga bagian: I am, artikel, dan nama profesi. Tanpa artikel, kalimat belum lengkap.',
  tr: 'Türkçede meslek kişi ekiyle tek sözcükte söylenebilir: “öğretmenim”. İngilizce I am ile kişiyi açıklamaya bağlar; ancak tekil meslek adından önce küçük bir artikel de ister. Bu artikel bir mesleğin tek bir üyesinden söz edildiğini gösterir, nitelik bildirmez. İngilizce çerçeve üç parçadır: I am, artikel ve meslek adı. Artikel atlanırsa cümle eksik kalır.',
  pl: 'Po polsku zawód może stać bez rodzajnika: „jestem nauczycielem”. Angielskie I am łączy osobę z opisem, lecz przed nazwą jednego zawodu potrzebny jest jeszcze mały rodzajnik. Pokazuje on jednego przedstawiciela zawodu, a nie cechę. Angielska rama ma trzy części: I am, rodzajnik i nazwę zawodu. Pominięcie rodzajnika zostawia zdanie niepełne.',
});

const formulaBody = L({
  ru: 'Форма зависит не от перевода, а от первого звука следующего слова. Перед согласным звуком работает a + consonant sound. Перед гласным звуком появляется n: an + vowel sound. Дополнительный согласный разделяет два соседних гласных и делает произношение плавным. Сначала произнесите начало профессии, затем выберите a или an; смотреть только на перевод нельзя.',
  uk: 'Форма залежить не від перекладу, а від першого звука наступного слова. Перед приголосним звуком працює a + consonant sound. Перед голосним звуком з’являється n: an + vowel sound. Додатковий приголосний розділяє два сусідні голосні й робить вимову плавною. Спочатку вимовте початок професії, а потім оберіть a чи an; дивитися лише на переклад не можна.',
  es: 'La forma depende del primer sonido de la palabra siguiente, no de su traducción. Ante sonido consonántico funciona a + consonant sound. Ante sonido vocálico aparece n: an + vowel sound. Esa consonante separa dos vocales vecinas y hace más fluida la pronunciación. Pronuncia primero el comienzo de la profesión y después elige a o an.',
  'pt-BR': 'A forma depende do primeiro som da palavra seguinte, não da tradução. Antes de som consonantal funciona a + consonant sound. Antes de som vocálico aparece n: an + vowel sound. Essa consoante separa duas vogais vizinhas e deixa a pronúncia mais fluida. Pronuncie primeiro o começo da profissão e depois escolha a ou an.',
  vi: 'Dạng mạo từ phụ thuộc vào âm đầu của từ tiếp theo, không phụ thuộc bản dịch. Trước âm phụ âm dùng a + consonant sound. Trước âm nguyên âm có thêm n: an + vowel sound. Phụ âm thêm vào ngăn hai nguyên âm đứng cạnh nhau và giúp nói trôi chảy. Vì vậy tai phải nhận ra âm mở đầu trước khi mắt chọn mạo từ. Hãy đọc âm đầu của nghề trước rồi mới chọn a hay an.',
  id: 'Bentuk artikel bergantung pada bunyi pertama kata berikutnya, bukan pada terjemahannya. Sebelum bunyi konsonan dipakai a + consonant sound. Sebelum bunyi vokal muncul n: an + vowel sound. Konsonan tambahan memisahkan dua vokal berdekatan dan melancarkan ucapan. Ucapkan awal profesinya dahulu, lalu pilih a atau an.',
  tr: 'Biçim çeviriye değil, sonraki sözcüğün ilk sesine bağlıdır. Ünsüz ses önünde a + consonant sound çalışır. Ünlü ses önünde n belirir: an + vowel sound. Ek ünsüz yan yana gelen iki ünlüyü ayırır ve söyleyişi akıcı yapar. Bu nedenle seçim gözle değil, önce kulakla yapılır. Önce mesleğin başlangıcını söyleyin, sonra a ya da an seçin.',
  pl: 'Forma zależy od pierwszego dźwięku następnego słowa, a nie od tłumaczenia. Przed spółgłoską działa a + consonant sound. Przed samogłoską pojawia się n: an + vowel sound. Dodatkowa spółgłoska rozdziela dwie sąsiednie samogłoski i ułatwia wymowę. Najpierw wypowiedz początek nazwy zawodu, potem wybierz a albo an.',
});

const trapBody = L({
  ru: 'Главная ловушка — убрать артикль, потому что в русском переводе отдельного слова для него нет. Но английский считает название одной профессии исчисляемым существительным и требует a или an. Вторая ловушка — выбирать по букве, не слушая первый звук. Надёжная проверка одна: связка I am уже стоит, затем слышим первый звук профессии и только после этого выбираем форму артикля.',
  uk: 'Головна пастка — прибрати артикль, бо в українському перекладі окремого слова для нього немає. Але англійська вважає назву однієї професії злічуваним іменником і вимагає a або an. Друга пастка — обирати за літерою, не слухаючи першого звука. Надійна перевірка одна: зв’язка I am уже стоїть, далі слухаємо перший звук професії й лише тоді обираємо форму артикля.',
  es: 'La trampa principal es omitir el artículo porque la traducción puede parecer completa sin una palabra separada. En inglés, el nombre singular de una profesión es contable y exige a o an. Otra trampa consiste en mirar solo la letra y no escuchar el primer sonido. El primer sonido de la profesión determina la elección, no la longitud de la traducción. La comprobación segura es sencilla: I am ya está presente; escucha el inicio y entonces elige el artículo.',
  'pt-BR': 'A principal armadilha é omitir o artigo porque a tradução pode parecer completa sem uma palavra separada. Em inglês, o nome singular de profissão é contável e exige a ou an. Outra armadilha é olhar apenas a letra e não ouvir o primeiro som. O primeiro som da profissão determina a escolha, não o tamanho da tradução. A verificação segura é simples: I am já está presente; ouça o início e então escolha o artigo.',
  vi: 'Cạm bẫy chính là bỏ mạo từ vì bản dịch vẫn có vẻ đủ nghĩa mà không cần một từ riêng. Trong tiếng Anh, tên một nghề ở số ít là danh từ đếm được nên cần a hoặc an. Cạm bẫy thứ hai là chỉ nhìn chữ cái mà không nghe âm đầu. Âm đầu của nghề quyết định lựa chọn, không phải độ dài bản dịch. Cách kiểm tra chắc chắn: I am đã có, hãy nghe âm mở đầu rồi mới chọn mạo từ.',
  id: 'Jebakan utama ialah menghilangkan artikel karena terjemahan tampak lengkap tanpa kata terpisah. Dalam bahasa Inggris, nama profesi tunggal dapat dihitung dan memerlukan a atau an. Jebakan lain adalah melihat huruf saja tanpa mendengar bunyi awal. Bunyi awal profesi menentukan pilihan, bukan panjang terjemahannya. Pemeriksaan aman: I am sudah ada; dengarkan awal profesi, lalu pilih artikelnya.',
  tr: 'Ana tuzak, çeviride ayrı bir karşılık görünmediği için artikeli atmaktır. İngilizcede tekil meslek adı sayılabilir isimdir ve a ya da an ister. İkinci tuzak harfe bakıp ilk sesi dinlememektir. Mesleğin ilk sesi seçimi belirler; çevirinin uzunluğu belirlemez. Güvenli denetim şudur: I am zaten vardır; ilk sesi duyun ve ancak sonra artikeli seçin.',
  pl: 'Główna pułapka to pominięcie rodzajnika, bo polskie tłumaczenie nie potrzebuje osobnego słowa. W angielskim nazwa jednego zawodu jest rzeczownikiem policzalnym i wymaga a albo an. Druga pułapka polega na patrzeniu tylko na literę bez słuchania pierwszego dźwięku. Pierwszy dźwięk zawodu decyduje o wyborze, a nie długość tłumaczenia. Pewna kontrola: I am już stoi, potem słuchamy początku i dopiero wybieramy rodzajnik.',
});

const choice = (value: LocalizedSource): LocalizedSource => value;
export const EPISODE_01_SESSION_06_WORD_FIRST_INTRO: readonly [SessionSourceIntroPage, SessionSourceIntroPage, SessionSourceIntroPage] = Object.freeze([
  {
    kind: 'concept',
    title: L({ ru: 'Перед профессией нужен маленький артикль', uk: 'Перед професією потрібен маленький артикль', es: 'La profesión necesita un artículo', 'pt-BR': 'A profissão precisa de artigo', vi: 'Trước nghề cần một mạo từ nhỏ', id: 'Profesi memerlukan artikel kecil', tr: 'Meslek önünde küçük bir artikel gerekir', pl: 'Przed zawodem potrzebny jest rodzajnik' }),
    body: conceptBody, bodyRuns: markBody(conceptBody),
    question: { prompt: L({ ru: 'Что нельзя пропустить перед одной профессией?', uk: 'Що не можна пропустити перед однією професією?', es: '¿Qué no se puede omitir ante una profesión singular?', 'pt-BR': 'O que não pode faltar antes de uma profissão no singular?', vi: 'Không được bỏ gì trước một nghề ở số ít?', id: 'Apa yang tidak boleh dihilangkan sebelum satu profesi?', tr: 'Tekil meslek önünde ne atılamaz?', pl: 'Czego nie wolno pominąć przed nazwą jednego zawodu?' }), choices: [choice(L({ ru: 'Артикль', uk: 'Артикль', es: 'El artículo', 'pt-BR': 'O artigo', vi: 'Mạo từ', id: 'Artikel', tr: 'Artikel', pl: 'Rodzajnika' })), choice(L({ ru: 'Отрицание', uk: 'Заперечення', es: 'La negación', 'pt-BR': 'A negação', vi: 'Phủ định', id: 'Penyangkalan', tr: 'Olumsuzluk', pl: 'Przeczenia' })), choice(L({ ru: 'Вопросительный знак', uk: 'Знак питання', es: 'El signo de pregunta', 'pt-BR': 'O ponto de interrogação', vi: 'Dấu hỏi', id: 'Tanda tanya', tr: 'Soru işareti', pl: 'Znaku zapytania' }))], correctChoiceIndex: 0, explanation: L({ ru: 'Артикль показывает одного представителя профессии и обязателен перед её названием.', uk: 'Артикль показує одного представника професії й обов’язковий перед її назвою.', es: 'El artículo presenta a una persona como miembro de la profesión y es obligatorio.', 'pt-BR': 'O artigo apresenta uma pessoa como membro da profissão e é obrigatório.', vi: 'Mạo từ cho biết một người thuộc nghề đó và bắt buộc phải có.', id: 'Artikel menunjukkan satu anggota profesi dan wajib dipakai.', tr: 'Artikel mesleğin tek bir üyesini gösterir ve zorunludur.', pl: 'Rodzajnika nie wolno pominąć: wskazuje jednego przedstawiciela zawodu i dlatego jest obowiązkowy.' }) },
  },
  {
    kind: 'formula',
    title: L({ ru: 'Форму выбирает первый звук', uk: 'Форму обирає перший звук', es: 'El primer sonido elige la forma', 'pt-BR': 'O primeiro som escolhe a forma', vi: 'Âm đầu chọn dạng mạo từ', id: 'Bunyi awal memilih bentuk', tr: 'Biçimi ilk ses seçer', pl: 'Formę wybiera pierwszy dźwięk' }),
    body: formulaBody, bodyRuns: markBody(formulaBody),
    question: { prompt: L({ ru: 'Что ставят перед гласным звуком?', uk: 'Що ставлять перед голосним звуком?', es: '¿Qué se usa ante un sonido vocálico?', 'pt-BR': 'O que se usa antes de som vocálico?', vi: 'Dùng gì trước âm nguyên âm?', id: 'Apa yang dipakai sebelum bunyi vokal?', tr: 'Ünlü ses önünde ne kullanılır?', pl: 'Co stoi przed dźwiękiem samogłoskowym?' }), choices: [choice(L({ ru: 'an', uk: 'an', es: 'an', 'pt-BR': 'an', vi: 'an', id: 'an', tr: 'an', pl: 'an' })), choice(L({ ru: 'a', uk: 'a', es: 'a', 'pt-BR': 'a', vi: 'a', id: 'a', tr: 'a', pl: 'a' })), choice(L({ ru: 'am', uk: 'am', es: 'am', 'pt-BR': 'am', vi: 'am', id: 'am', tr: 'am', pl: 'am' }))], correctChoiceIndex: 0, explanation: L({ ru: 'An добавляет /n/ перед гласным звуком и делает переход плавным.', uk: 'An додає /n/ перед голосним звуком і робить перехід плавним.', es: 'An añade /n/ ante un sonido vocálico y hace fluida la transición.', 'pt-BR': 'An acrescenta /n/ antes de som vocálico e deixa a passagem fluida.', vi: 'An thêm /n/ trước âm nguyên âm để nối âm trôi chảy.', id: 'An menambahkan /n/ sebelum bunyi vokal agar peralihannya lancar.', tr: 'An ünlü ses önüne /n/ ekler ve geçişi akıcı yapar.', pl: 'An dodaje /n/ przed samogłoską i ułatwia przejście.' }) },
  },
  {
    kind: 'trap',
    title: L({ ru: 'Перевод не показывает артикль', uk: 'Переклад не показує артикль', es: 'La traducción puede ocultar el artículo', 'pt-BR': 'A tradução pode esconder o artigo', vi: 'Bản dịch có thể giấu mạo từ', id: 'Terjemahan dapat menyembunyikan artikel', tr: 'Çeviri artikeli gizleyebilir', pl: 'Tłumaczenie może ukryć rodzajnik' }),
    body: trapBody, bodyRuns: markBody(trapBody),
    question: { prompt: L({ ru: 'Что определяет выбор a или an?', uk: 'Що визначає вибір a чи an?', es: '¿Qué determina la elección entre a y an?', 'pt-BR': 'O que determina a escolha entre a e an?', vi: 'Điều gì quyết định chọn a hay an?', id: 'Apa yang menentukan pilihan a atau an?', tr: 'A ile an seçimini ne belirler?', pl: 'Co decyduje o wyborze a albo an?' }), choices: [choice(L({ ru: 'Первый звук профессии', uk: 'Перший звук професії', es: 'El primer sonido de la profesión', 'pt-BR': 'O primeiro som da profissão', vi: 'Âm đầu của nghề', id: 'Bunyi awal profesi', tr: 'Mesleğin ilk sesi', pl: 'Pierwszy dźwięk zawodu' })), choice(L({ ru: 'Пол говорящего', uk: 'Стать мовця', es: 'El género del hablante', 'pt-BR': 'O gênero de quem fala', vi: 'Giới tính người nói', id: 'Gender penutur', tr: 'Konuşanın cinsiyeti', pl: 'Płeć mówiącego' })), choice(L({ ru: 'Длина перевода', uk: 'Довжина перекладу', es: 'La longitud de la traducción', 'pt-BR': 'O tamanho da tradução', vi: 'Độ dài bản dịch', id: 'Panjang terjemahan', tr: 'Çevirinin uzunluğu', pl: 'Długość tłumaczenia' }))], correctChoiceIndex: 0, explanation: L({ ru: 'Первый звук профессии решает: согласный ведёт к a, гласный — к an.', uk: 'Перший звук професії вирішує: приголосний веде до a, голосний — до an.', es: 'El primer sonido de la profesión decide: consonante lleva a a y vocal a an.', 'pt-BR': 'O primeiro som da profissão decide: consoante leva a a, vogal leva a an.', vi: 'Âm đầu của nghề quyết định: phụ âm dùng a, nguyên âm dùng an.', id: 'Bunyi awal profesi menentukan: konsonan memakai a, vokal memakai an.', tr: 'Mesleğin ilk sesi belirler: ünsüz a, ünlü an getirir.', pl: 'Pierwszy dźwięk zawodu decyduje: spółgłoska prowadzi do a, samogłoska do an.' }) },
  },
]);
