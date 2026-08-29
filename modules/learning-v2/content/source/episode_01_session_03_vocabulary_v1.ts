import type { LocalizedSource, SessionVocabularyContactSourceV1, SessionVocabularySourceV1 } from './session_shard_from_source_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

const MISSING_APOSTROPHE = L({
  ru: 'Im похоже на нужную форму, но потеряло апостроф. В I’m этот маленький знак держит место исчезнувшей a.',
  uk: 'Im схоже на потрібну форму, але втратило апостроф. У I’m цей знак тримає місце зниклої a.',
  es: 'Im se parece, pero perdió el apóstrofo. En I’m ese signo guarda el lugar de la a omitida.',
  'pt-BR': 'Im parece a forma certa, mas perdeu o apóstrofo. Em I’m esse sinal guarda o lugar do a omitido.',
  vi: 'Im trông gần đúng nhưng thiếu dấu nháy. Trong I’m, dấu này giữ chỗ của chữ a đã lược.',
  id: 'Im tampak hampir benar, tetapi apostrofnya hilang. Dalam I’m, tanda itu menggantikan huruf a yang dibuang.',
  tr: 'Im doğru biçime benzer ama kesme işaretini kaybetmiştir. I’m içindeki işaret düşen a harfinin yerini tutar.',
  pl: 'Im wygląda podobnie, ale zgubiło apostrof. W I’m ten znak zajmuje miejsce pominiętego a.',
});

const WRONG_APOSTROPHE = L({
  ru: 'I’am оставляет лишнюю a после апострофа. Короткая форма убирает a полностью и пишется I’m.',
  uk: 'I’am залишає зайву a після апострофа. Коротка форма прибирає a повністю й пишеться I’m.',
  es: 'I’am conserva una a de más después del apóstrofo. La forma corta elimina esa a y se escribe I’m.',
  'pt-BR': 'I’am mantém um a extra depois do apóstrofo. A forma curta elimina esse a e se escreve I’m.',
  vi: 'I’am vẫn để thừa chữ a sau dấu nháy. Dạng ngắn bỏ hẳn a và viết là I’m.',
  id: 'I’am masih menyisakan huruf a setelah apostrof. Bentuk singkat membuang a dan ditulis I’m.',
  tr: 'I’am kesme işaretinden sonra fazladan a bırakır. Kısa biçim a harfini tamamen düşürür ve I’m yazılır.',
  pl: 'I’am zostawia zbędne a po apostrofie. Krótka forma usuwa a całkowicie i ma zapis I’m.',
});

const DUPLICATE_AM = L({
  ru: 'I’m am повторяет am дважды: один раз внутри I’m и ещё раз отдельно. После I’m сразу идёт описание.',
  uk: 'I’m am повторює am двічі: один раз усередині I’m і ще раз окремо. Після I’m одразу йде опис.',
  es: 'I’m am repite am dos veces: una dentro de I’m y otra por separado. Después de I’m va directamente la descripción.',
  'pt-BR': 'I’m am repete am duas vezes: uma dentro de I’m e outra separada. Depois de I’m vem diretamente a descrição.',
  vi: 'I’m am lặp am hai lần: một lần trong I’m và một lần đứng riêng. Sau I’m phải đi thẳng đến phần mô tả.',
  id: 'I’m am mengulang am dua kali: sekali di dalam I’m dan sekali lagi terpisah. Setelah I’m langsung muncul keterangannya.',
  tr: 'I’m am, am biçimini iki kez kullanır: biri I’m içinde, diğeri ayrı. I’m sonrasında doğrudan açıklama gelir.',
  pl: 'I’m am powtarza am dwa razy: raz wewnątrz I’m i raz osobno. Po I’m od razu pojawia się opis.',
});

const DISTRACTORS = Object.freeze([
  { value: 'Im', reasonCode: 'orthographic:im:missing_apostrophe', trapType: 'orthographic' as const, feedback: MISSING_APOSTROPHE },
  { value: "I'am", reasonCode: 'orthographic:im:apostrophe_before_a', trapType: 'orthographic' as const, feedback: WRONG_APOSTROPHE },
  { value: "I'm am", reasonCode: 'grammar:im:duplicated_am', trapType: 'grammar' as const, feedback: DUPLICATE_AM },
]);

export const EPISODE_01_SESSION_03_VOCABULARY_V1: readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'e01-s03-contraction-im',
    target: "I'm",
    meaning: L({
      ru: 'я есть / я нахожусь — короткая форма I am', uk: 'я є / я перебуваю — коротка форма I am',
      es: 'soy / estoy — forma corta de I am', 'pt-BR': 'sou / estou — forma curta de I am',
      vi: 'tôi là / tôi đang — dạng ngắn của I am', id: 'saya adalah / saya sedang — bentuk singkat I am',
      tr: 'ben …-im / …-ım — I am biçiminin kısası', pl: 'jestem — krótka forma I am',
    }),
    features: ['contraction_im', 'affirmative_self_statement'],
    contacts: {
      recognize: contact(L({
        ru: 'I’m читается /aɪm/ одним коротким толчком. На письме видно I, апостроф и m; сам апостроф не произносится.',
        uk: 'I’m читається /aɪm/ одним коротким поштовхом. На письмі видно I, апостроф і m; сам апостроф не вимовляється.',
        es: 'I’m suena /aɪm/ en un solo impulso. Al escribir se ven I, el apóstrofo y m; el apóstrofo no se pronuncia.',
        'pt-BR': 'I’m soa /aɪm/ em um único impulso. Na escrita aparecem I, o apóstrofo e m; o apóstrofo não tem som.',
        vi: 'I’m được đọc /aɪm/ trong một nhịp ngắn. Khi viết có I, dấu nháy và m; dấu nháy không được phát âm.',
        id: 'I’m berbunyi /aɪm/ dalam satu ketukan singkat. Tulisannya terdiri dari I, apostrof, dan m; apostrof tidak dibunyikan.',
        tr: 'I’m tek vuruşta /aɪm/ diye söylenir. Yazıda I, kesme işareti ve m görülür; kesme işareti ses çıkarmaz.',
        pl: 'I’m brzmi /aɪm/ w jednym krótkim rytmie. W zapisie widać I, apostrof i m; apostrofu się nie wymawia.',
      }), DISTRACTORS),
      retrieve_meaning: contact(L({
        ru: 'I’m означает то же, что I am. Это не новое сообщение, а быстрый способ назвать себя и сразу добавить знакомое место или состояние.',
        uk: 'I’m означає те саме, що I am. Це не нове повідомлення, а швидкий спосіб назвати себе й одразу додати знайоме місце або стан.',
        es: 'I’m significa lo mismo que I am. No añade un sentido nuevo: permite nombrarse y pasar enseguida a un lugar o estado conocido.',
        'pt-BR': 'I’m significa o mesmo que I am. Não acrescenta um sentido novo: permite indicar quem fala e seguir para um lugar ou estado conhecido.',
        vi: 'I’m có cùng nghĩa với I am. Nó không thêm nghĩa mới; chỉ giúp người nói nhắc đến mình rồi đi ngay vào nơi chốn hoặc trạng thái quen thuộc.',
        id: 'I’m berarti sama dengan I am. Bentuk ini tidak menambah arti baru; penutur menyebut dirinya lalu langsung menuju tempat atau keadaan yang dikenal.',
        tr: 'I’m, I am ile aynı anlama gelir. Yeni bir anlam eklemez; konuşanı gösterip tanıdık yer ya da duruma hızla geçer.',
        pl: 'I’m znaczy to samo co I am. Nie dodaje nowego sensu; pozwala wskazać siebie i od razu przejść do znanego miejsca lub stanu.',
      }), DISTRACTORS),
      build_form: contact(L({
        ru: 'Сборка короткая: I + апостроф + m. Пробелов внутри нет, a исчезает, а второй am после I’m уже не нужен.',
        uk: 'Збірка коротка: I + апостроф + m. Пробілів усередині немає, a зникає, а другий am після I’m уже не потрібен.',
        es: 'La construcción es breve: I + apóstrofo + m. No hay espacios dentro, la a desaparece y no se añade otro am después de I’m.',
        'pt-BR': 'A montagem é curta: I + apóstrofo + m. Não há espaços, o a desaparece e nenhum outro am vem depois de I’m.',
        vi: 'Cách ghép rất gọn: I + dấu nháy + m. Bên trong không có khoảng trắng, a biến mất và không thêm am sau I’m.',
        id: 'Susunannya singkat: I + apostrof + m. Tidak ada spasi di dalamnya, a hilang, dan tidak ada am kedua setelah I’m.',
        tr: 'Kuruluş kısadır: I + kesme işareti + m. Arada boşluk yoktur, a düşer ve I’m sonrasında ikinci am gelmez.',
        pl: 'Budowa jest krótka: I + apostrof + m. W środku nie ma spacji, a znika, a po I’m nie dodaje się drugiego am.',
      }), DISTRACTORS),
    },
  },
]);
