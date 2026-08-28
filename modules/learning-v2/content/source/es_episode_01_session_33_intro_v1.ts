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

// зачем эти три тела переписаны короче легаси-черновика (владелец,
// 2026-08-28, docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md правило 2): исходный
// вариант был 500-530 знаков и упоминал caro/rápido/ser — слов, которых нет
// в word-first/фразовом материале ЭТОЙ сессии (правило 1). Смысл сохранён —
// формула -o/-a, антоним malo, порядок слов, ловушка на согласование числа
// и рода одновременно — но сравнение с caro/rápido убрано, а bien/ser из
// TRAP_BODY заменены на более фундаментальную ловушку курса (двойное
// согласование), уже подкреплённую фразами es-e01-s33-somos-buenas и
// es-e01-s33-somos-buenas-son-malas-q.
const CONCEPT_BODY = L({
  ru: 'Bueno — «хороший», признак с окончанием -o для мужского рода или по умолчанию, -a для женского: bueno/buena. У него есть противоположность malo — «плохой», та же формула. Оба слова описывают ОБЩУЮ оценку — не цену и не скорость, а хорошо это или плохо. Признак ставится после связки: Es bueno, No es bueno.',
  uk: 'Bueno — «добрий», ознака з закінченням -o для чоловічого роду чи за замовчуванням, -a для жіночого: bueno/buena. У нього є протилежність malo — «поганий», та сама формула. Обидва слова описують ЗАГАЛЬНУ оцінку — не ціну і не швидкість, а добре це чи погано. Ознака стоїть після зв’язки: Es bueno, No es bueno.',
  es: 'Bueno means "good" — the ending -o is masculine or default, -a is feminine: bueno/buena. It has an opposite, malo, "bad", following the same formula. Both words describe a GENERAL evaluation — not price, not speed, just good or bad. The quality goes after the linking word: Es bueno, No es bueno.',
  'pt-BR': 'Bueno significa "bom" — a terminação -o é masculina ou padrão, -a é feminina: bueno/buena. Ele tem um oposto, malo, "ruim", com a mesma fórmula. As duas palavras descrevem uma avaliação GERAL — não preço, não velocidade, apenas bom ou ruim. A qualidade fica depois da ligação: Es bueno, No es bueno.',
  vi: 'Bueno nghĩa là "tốt" — đuôi -o là giống đực hoặc mặc định, -a là giống cái: bueno/buena. Nó có từ trái nghĩa malo, "xấu", theo cùng công thức. Cả hai từ mô tả một đánh giá CHUNG — không phải giá cả, không phải tốc độ, chỉ là tốt hay xấu. Đặc điểm đứng sau từ nối: Es bueno, No es bueno.',
  id: 'Bueno berarti "baik" — akhiran -o untuk maskulin atau default, -a untuk feminin: bueno/buena. Ada lawan katanya, malo, "buruk", dengan rumus yang sama. Kedua kata mendeskripsikan penilaian UMUM — bukan harga, bukan kecepatan, hanya baik atau buruk. Sifat diletakkan setelah kata penghubung: Es bueno, No es bueno.',
  tr: 'Bueno "iyi" demektir — -o eki eril veya varsayılan, -a dişildir: bueno/buena. Zıttı malo, "kötü", aynı formülü izler. Her iki kelime de fiyat ya da hız değil, sadece iyi ya da kötü olan GENEL bir değerlendirme tanımlar. Nitelik bağlaçtan sonra gelir: Es bueno, No es bueno.',
  pl: 'Bueno znaczy „dobry” — końcówka -o to rodzaj męski lub domyślny, -a to żeński: bueno/buena. Ma przeciwieństwo, malo, „zły”, według tej samej formuły. Oba słowa opisują OGÓLNĄ ocenę — nie cenę, nie prędkość, tylko dobrze czy źle. Cecha stoi po łączniku: Es bueno, No es bueno.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что у всех признаков на -o/-a. Мужской род или по умолчанию — bueno, женский — buena. Множественное число добавляет -s: buenos, buenas. Malo подчиняется той же формуле: malo, mala, malos, malas — согласование одинаково для любого признака на -o.',
  uk: 'Формула та сама, що й у всіх ознак на -o/-a. Чоловічий рід чи за замовчуванням — bueno, жіночий — buena. Множина додає -s: buenos, buenas. Malo підпорядковується тій самій формулі: malo, mala, malos, malas — узгодження однакове для будь-якої ознаки на -o.',
  es: 'The formula is the same as for all -o/-a qualities. Masculine or default — bueno, feminine — buena. Plural adds -s: buenos, buenas. Malo follows the same formula: malo, mala, malos, malas — agreement works the same way for any -o quality.',
  'pt-BR': 'A fórmula é a mesma para todas as qualidades em -o/-a. Masculino ou padrão — bueno, feminino — buena. O plural acrescenta -s: buenos, buenas. Malo segue a mesma fórmula: malo, mala, malos, malas — a concordância funciona igual para qualquer qualidade em -o.',
  vi: 'Công thức giống hệt mọi đặc điểm kết thúc bằng -o/-a. Giống đực hoặc mặc định — bueno, giống cái — buena. Số nhiều thêm -s: buenos, buenas. Malo theo đúng công thức đó: malo, mala, malos, malas — hòa hợp giống nhau cho bất kỳ đặc điểm -o nào.',
  id: 'Rumusnya sama seperti semua sifat -o/-a. Maskulin atau default — bueno, feminin — buena. Jamak menambahkan -s: buenos, buenas. Malo mengikuti rumus yang sama: malo, mala, malos, malas — kesesuaian bekerja sama untuk sifat -o apa pun.',
  tr: 'Formül, tüm -o/-a nitelikleri için aynıdır. Eril veya varsayılan — bueno, dişil — buena. Çoğul -s ekler: buenos, buenas. Malo aynı formülü izler: malo, mala, malos, malas — uyum, herhangi bir -o niteliği için aynı şekilde çalışır.',
  pl: 'Formuła jest taka sama jak dla wszystkich cech na -o/-a. Rodzaj męski lub domyślny — bueno, żeński — buena. Liczba mnoga dodaje -s: buenos, buenas. Malo podlega tej samej formule: malo, mala, malos, malas — zgodność działa tak samo dla każdej cechy na -o.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — забыть согласовать признак сразу по числу И роду. Про группу женского рода нужно Son buenas, а не Son buenos и не Son buena — оба окончания меняются вместе. Вторая ловушка — спутать bueno с его противоположностью malo: слова звучат совсем по-разному, перепутать смысл легко на слух.',
  uk: 'Найчастіша помилка — забути узгодити ознаку одразу за числом І родом. Про групу жіночого роду потрібно Son buenas, а не Son buenos і не Son buena — обидва закінчення змінюються разом. Друга пастка — сплутати bueno з протилежністю malo: слова звучать зовсім по-різному, переплутати сенс легко на слух.',
  es: 'The most common mistake is forgetting to agree the quality by number AND gender at once. A feminine group needs Son buenas, not Son buenos or Son buena — both endings change together. The second trap is confusing bueno with its opposite malo: easy to mix up the meaning by ear.',
  'pt-BR': 'O erro mais comum é esquecer de concordar a qualidade em número E gênero ao mesmo tempo. Um grupo feminino precisa de Son buenas, não Son buenos nem Son buena — as duas terminações mudam juntas. A segunda armadilha é confundir bueno com seu oposto malo: fácil trocar o sentido de ouvido.',
  vi: 'Lỗi phổ biến nhất là quên hòa hợp đặc điểm theo cả số VÀ giống cùng lúc. Nhóm giống cái cần Son buenas, không phải Son buenos hay Son buena — cả hai đuôi thay đổi cùng nhau. Cái bẫy thứ hai là nhầm lẫn bueno với từ trái nghĩa malo: hai từ nghe khá khác nhau, nhưng nghĩa lại dễ nhầm khi nghe.',
  id: 'Kesalahan paling umum adalah lupa menyesuaikan sifat berdasarkan jumlah DAN gender sekaligus. Kelompok feminin perlu Son buenas, bukan Son buenos atau Son buena — kedua akhiran berubah bersamaan. Jebakan kedua: mengacaukan bueno dengan lawan katanya malo — mudah tertukar saat didengar.',
  tr: 'En yaygın hata, niteliği hem sayı HEM cinsiyete göre uyumlu hale getirmeyi unutmaktır. Dişil bir grup Son buenas gerektirir, Son buenos veya Son buena değil — her iki ek birlikte değişir. İkinci tuzak: bueno’yu zıttı malo ile karıştırmak — anlamı işitince karıştırmak kolaydır.',
  pl: 'Najczęstszy błąd to zapomnienie o zgodności cechy jednocześnie w liczbie I rodzaju. Grupa żeńska wymaga Son buenas, nie Son buenos ani Son buena — obie końcówki zmieniają się razem. Druga pułapka to mylenie bueno z jego przeciwieństwem malo: słowa brzmią zupełnie inaczej, ale znaczenie łatwo pomylić ze słuchu.',
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
      ru: R({ text: 'Bueno — «хороший», признак с окончанием -o для мужского рода или по умолчанию, -a для женского: bueno/buena. У него есть противоположность malo — «плохой», та же формула. Оба слова описывают ОБЩУЮ оценку — не цену и не скорость, а хорошо это или плохо. Признак ставится после связки: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', No es bueno.', semantic: 'explanation' }),
      uk: R({ text: 'Bueno — «добрий», ознака з закінченням -o для чоловічого роду чи за замовчуванням, -a для жіночого: bueno/buena. У нього є протилежність malo — «поганий», та сама формула. Обидва слова описують ЗАГАЛЬНУ оцінку — не ціну і не швидкість, а добре це чи погано. Ознака стоїть після зв’язки: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', No es bueno.', semantic: 'explanation' }),
      es: R({ text: 'Bueno means "good" — the ending -o is masculine or default, -a is feminine: bueno/buena. It has an opposite, malo, "bad", following the same formula. Both words describe a GENERAL evaluation — not price, not speed, just good or bad. The quality goes after the linking word: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', No es bueno.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Bueno significa "bom" — a terminação -o é masculina ou padrão, -a é feminina: bueno/buena. Ele tem um oposto, malo, "ruim", com a mesma fórmula. As duas palavras descrevem uma avaliação GERAL — não preço, não velocidade, apenas bom ou ruim. A qualidade fica depois da ligação: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', No es bueno.', semantic: 'explanation' }),
      vi: R({ text: 'Bueno nghĩa là "tốt" — đuôi -o là giống đực hoặc mặc định, -a là giống cái: bueno/buena. Nó có từ trái nghĩa malo, "xấu", theo cùng công thức. Cả hai từ mô tả một đánh giá CHUNG — không phải giá cả, không phải tốc độ, chỉ là tốt hay xấu. Đặc điểm đứng sau từ nối: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', No es bueno.', semantic: 'explanation' }),
      id: R({ text: 'Bueno berarti "baik" — akhiran -o untuk maskulin atau default, -a untuk feminin: bueno/buena. Ada lawan katanya, malo, "buruk", dengan rumus yang sama. Kedua kata mendeskripsikan penilaian UMUM — bukan harga, bukan kecepatan, hanya baik atau buruk. Sifat diletakkan setelah kata penghubung: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', No es bueno.', semantic: 'explanation' }),
      tr: R({ text: 'Bueno "iyi" demektir — -o eki eril veya varsayılan, -a dişildir: bueno/buena. Zıttı malo, "kötü", aynı formülü izler. Her iki kelime de fiyat ya da hız değil, sadece iyi ya da kötü olan GENEL bir değerlendirme tanımlar. Nitelik bağlaçtan sonra gelir: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', No es bueno.', semantic: 'explanation' }),
      pl: R({ text: 'Bueno znaczy „dobry” — końcówka -o to rodzaj męski lub domyślny, -a to żeński: bueno/buena. Ma przeciwieństwo, malo, „zły”, według tej samej formuły. Oba słowa opisują OGÓLNĄ ocenę — nie cenę, nie prędkość, tylko dobrze czy źle. Cecha stoi po łączniku: ', semantic: 'explanation' }, { text: 'Es bueno', semantic: 'targetCorrect' }, { text: ', No es bueno.', semantic: 'explanation' }),
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
      ru: 'Число и род меняются вместе — не по отдельности',
      uk: 'Число і рід змінюються разом — не окремо',
      es: 'Number and gender change together — not separately',
      'pt-BR': 'Número e gênero mudam juntos — não separadamente',
      vi: 'Số và giống thay đổi cùng nhau — không tách rời',
      id: 'Jumlah dan gender berubah bersama — bukan terpisah',
      tr: 'Sayı ve cinsiyet birlikte değişir — ayrı ayrı değil',
      pl: 'Liczba i rodzaj zmieniają się razem — nie osobno',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — забыть согласовать признак сразу по числу И роду. Про группу женского рода нужно ', semantic: 'explanation' }, { text: 'Son buenas', semantic: 'targetCorrect' }, { text: ', а не Son buenos или Son buena — оба окончания меняются вместе. Вторая ловушка — спутать bueno с его противоположностью malo: слова звучат совсем по-разному, перепутать смысл легко на слух.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — забути узгодити ознаку одразу за числом І родом. Про групу жіночого роду потрібно ', semantic: 'explanation' }, { text: 'Son buenas', semantic: 'targetCorrect' }, { text: ', а не Son buenos і не Son buena — обидва закінчення змінюються разом. Друга пастка — сплутати bueno з протилежністю malo: слова звучать зовсім по-різному, переплутати сенс легко на слух.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is forgetting to agree the quality by number AND gender at once. A feminine group needs ', semantic: 'explanation' }, { text: 'Son buenas', semantic: 'targetCorrect' }, { text: ', not Son buenos or Son buena — both endings change together. The second trap is confusing bueno with its opposite malo: easy to mix up the meaning by ear.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é esquecer de concordar a qualidade em número E gênero ao mesmo tempo. Um grupo feminino precisa de ', semantic: 'explanation' }, { text: 'Son buenas', semantic: 'targetCorrect' }, { text: ', não Son buenos nem Son buena — as duas terminações mudam juntas. A segunda armadilha é confundir bueno com seu oposto malo: fácil trocar o sentido de ouvido.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là quên hòa hợp đặc điểm theo cả số VÀ giống cùng lúc. Nhóm giống cái cần ', semantic: 'explanation' }, { text: 'Son buenas', semantic: 'targetCorrect' }, { text: ', không phải Son buenos hay Son buena — cả hai đuôi thay đổi cùng nhau. Cái bẫy thứ hai là nhầm lẫn bueno với từ trái nghĩa malo: hai từ nghe khá khác nhau, nhưng nghĩa lại dễ nhầm khi nghe.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah lupa menyesuaikan sifat berdasarkan jumlah DAN gender sekaligus. Kelompok feminin perlu ', semantic: 'explanation' }, { text: 'Son buenas', semantic: 'targetCorrect' }, { text: ', bukan Son buenos atau Son buena — kedua akhiran berubah bersamaan. Jebakan kedua: mengacaukan bueno dengan lawan katanya malo — mudah tertukar saat didengar.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, niteliği hem sayı HEM cinsiyete göre uyumlu hale getirmeyi unutmaktır. Dişil bir grup ', semantic: 'explanation' }, { text: 'Son buenas', semantic: 'targetCorrect' }, { text: ' gerektirir, Son buenos veya Son buena değil — her iki ek birlikte değişir. İkinci tuzak: bueno’yu zıttı malo ile karıştırmak — anlamı işitince karıştırmak kolaydır.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to zapomnienie o zgodności cechy jednocześnie w liczbie I rodzaju. Grupa żeńska wymaga ', semantic: 'explanation' }, { text: 'Son buenas', semantic: 'targetCorrect' }, { text: ', nie Son buenos ani Son buena — obie końcówki zmieniają się razem. Druga pułapka to mylenie bueno z jego przeciwieństwem malo: słowa brzmią zupełnie inaczej, ale znaczenie łatwo pomylić ze słuchu.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как сказать «они плохие» о группе женского рода без говорящей?',
        uk: 'Як сказати «вони погані» про групу жіночого роду без мовиці?',
        es: 'How do you say "they are bad" about a feminine group without the speaker?',
        'pt-BR': 'Como se diz "elas são ruins" sobre um grupo feminino sem quem fala?',
        vi: 'Làm sao để nói "họ xấu" về một nhóm giống cái không có người nói?',
        id: 'Bagaimana cara mengatakan "mereka buruk" tentang kelompok feminin tanpa penutur?',
        tr: 'Konuşanı içermeyen dişil bir grup için "onlar kötü" nasıl söylenir?',
        pl: 'Jak powiedzieć „one są złe” o grupie żeńskiej bez mówiącej?',
      }),
      choices: [
        L({ ru: 'Son malas', uk: 'Son malas', es: 'Son malas', 'pt-BR': 'Son malas', vi: 'Son malas', id: 'Son malas', tr: 'Son malas', pl: 'Son malas' }),
        L({ ru: 'Son malos', uk: 'Son malos', es: 'Son malos', 'pt-BR': 'Son malos', vi: 'Son malos', id: 'Son malos', tr: 'Son malos', pl: 'Son malos' }),
        L({ ru: 'Son buenas', uk: 'Son buenas', es: 'Son buenas', 'pt-BR': 'Son buenas', vi: 'Son buenas', id: 'Son buenas', tr: 'Son buenas', pl: 'Son buenas' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Son malas верно: связка son для «них» без говорящей, окончание -as для женского рода множественного числа — оба условия сразу. Son malos путает род, Son buenas называет противоположную оценку.',
        uk: 'Son malas правильно: зв’язка son для «них» без мовиці, закінчення -as для жіночого роду множини — обидві умови одразу. Son malos плутає рід, Son buenas називає протилежну оцінку.',
        es: 'Son malas is correct: the linking word son for "them" without the speaker, the -as ending for feminine plural — both conditions at once. Son malos mixes up the gender, Son buenas names the opposite evaluation.',
        'pt-BR': 'Son malas está correto: a ligação son para "eles/elas" sem quem fala, a terminação -as para feminino plural — ambas as condições ao mesmo tempo. Son malos confunde o gênero, Son buenas nomeia a avaliação oposta.',
        vi: 'Son malas đúng: từ nối son cho "họ" không có người nói, đuôi -as cho giống cái số nhiều — cả hai điều kiện cùng lúc. Son malos nhầm giống, Son buenas gọi tên đánh giá ngược lại.',
        id: 'Son malas benar: kata penghubung son untuk "mereka" tanpa penutur, akhiran -as untuk feminin jamak — kedua kondisi sekaligus. Son malos salah gender, Son buenas menyebut penilaian sebaliknya.',
        tr: 'Son malas doğrudur: konuşanı içermeyen "onlar" için son bağlacı, dişil çoğul için -as eki — her iki koşul birlikte. Son malos cinsiyeti karıştırır, Son buenas tersi değerlendirmeyi adlandırır.',
        pl: 'Son malas jest poprawne: łącznik son dla „oni” bez mówiącej, końcówka -as dla rodzaju żeńskiego liczby mnogiej — oba warunki naraz. Son malos myli rodzaj, Son buenas nazywa odwrotną ocenę.',
      }),
    },
  },
];
