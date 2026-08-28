import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-28, карта сессий es_episode_01_session_map_v1.ts,
// сессия 34 "Одинаковое и разное" / comparison_basic_adjective, builtOn: [33],
// recalls: [4, 33]): единственное word-first слово — diferente, «другой,
// отличающийся», НЕИЗМЕНЯЕМОЕ прилагательное (класс fácil/igual, не bueno/
// malo). Проверено grep по всему испанскому корпусу — diferente ни разу не
// встречалось как испанский target, слово действительно новое.
//
// Тема сессии раскрывается через diferente (новое) в паре с igual (recall
// сессии 14, «всё равно, без разницы») — оба уже отработанных или отрабатываемых
// здесь признака остаются в СВОИХ прежних значениях, ничего не переопределяется.
// bueno/malo (сессия 33) упоминаются только как пример уже известного другого
// класса согласования (-o/-a), чтобы показать контраст двух классов
// прилагательных курса — это material, уже пройденный в предыдущей сессии.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_34_WORD_FIRST_TITLE = L({
  ru: 'Одинаковое и разное',
  uk: 'Однакове і різне',
  es: 'Same and different',
  'pt-BR': 'Igual e diferente',
  vi: 'Giống và khác',
  id: 'Sama dan berbeda',
  tr: 'Aynı ve farklı',
  pl: 'Takie samo i inne',
});

export const ES_EPISODE_01_SESSION_34_WORD_FIRST_SUMMARY = L({
  ru: 'Diferente называет признак «другой, отличающийся» и не меняется по роду — одна форма для всех, как igual.',
  uk: 'Diferente називає ознаку «інший, відмінний» і не змінюється за родом — одна форма для всіх, як igual.',
  es: 'Diferente names the quality "different" and does not change by gender — one form for everyone, like igual.',
  'pt-BR': 'Diferente nomeia a qualidade "diferente" e não muda por gênero — uma forma para todos, como igual.',
  vi: 'Diferente gọi tên đặc điểm "khác" và không đổi theo giống — một dạng cho tất cả, giống như igual.',
  id: 'Diferente menyebutkan sifat "berbeda" dan tidak berubah menurut gender — satu bentuk untuk semua, seperti igual.',
  tr: 'Diferente "farklı" niteliğini adlandırır ve cinsiyete göre değişmez — herkes için tek biçim, igual gibi.',
  pl: 'Diferente nazywa cechę „inny” i nie zmienia się według rodzaju — jedna forma dla wszystkich, jak igual.',
});

export const ES_EPISODE_01_SESSION_34_WORD_FIRST_GOAL = L({
  ru: 'Уверенно использовать diferente для сравнения и понимать igual как его противоположность, не путая инвариантный класс с -o/-a признаками.',
  uk: 'Впевнено використовувати diferente для порівняння і розуміти igual як його протилежність, не плутаючи інваріантний клас з ознаками на -o/-a.',
  es: 'Confidently use diferente for comparison and understand igual as its opposite, without confusing the invariable class with -o/-a qualities.',
  'pt-BR': 'Usar com confiança diferente para comparação e entender igual como seu oposto, sem confundir a classe invariável com qualidades em -o/-a.',
  vi: 'Tự tin dùng diferente để so sánh và hiểu igual là từ trái nghĩa, không nhầm lớp bất biến với các đặc điểm -o/-a.',
  id: 'Percaya diri menggunakan diferente untuk perbandingan dan memahami igual sebagai kebalikannya, tanpa mengacaukan kelas invarian dengan sifat -o/-a.',
  tr: 'Karşılaştırma için diferente\'yi güvenle kullanmak ve igual\'i zıttı olarak anlamak, değişmez sınıfı -o/-a nitelikleriyle karıştırmadan.',
  pl: 'Pewnie używać diferente do porównań i rozumieć igual jako przeciwieństwo, nie myląc klasy niezmiennej z cechami na -o/-a.',
});

const CONCEPT_BODY = L({
  ru: 'Diferente — «другой», признак сравнения: что-то не совпадает с чем-то ещё. У него одна форма для мужского и женского рода — diferente, без -o/-a. Противоположность — уже знакомое igual, «всё равно». Признак ставится после связки: Es diferente, No es diferente.',
  uk: 'Diferente — «інший», ознака порівняння: щось не збігається з чимось іншим. У нього одна форма для чоловічого й жіночого роду — diferente, без -o/-a. Протилежність — вже знайоме igual, «все одно». Ознака стоїть після зв’язки: Es diferente, No es diferente.',
  es: 'Diferente means "different" — a comparison quality: something does not match something else. It has one form for masculine and feminine — diferente, no -o/-a. The opposite is the already-known igual, "all the same." The quality goes after the linking word: Es diferente, No es diferente.',
  'pt-BR': 'Diferente significa "diferente" — uma qualidade de comparação: algo não coincide com outra coisa. Tem uma única forma para masculino e feminino — diferente, sem -o/-a. O oposto é o já conhecido igual, "tanto faz". A qualidade fica depois da ligação: Es diferente, No es diferente.',
  vi: 'Diferente nghĩa là "khác" — một đặc điểm so sánh: điều gì đó không trùng khớp với thứ khác. Nó có một dạng duy nhất cho cả giống đực và giống cái — diferente, không có -o/-a. Từ trái nghĩa là igual đã quen thuộc, "cũng như nhau". Đặc điểm đứng sau từ nối: Es diferente, No es diferente.',
  id: 'Diferente berarti "berbeda" — sifat perbandingan: sesuatu tidak cocok dengan yang lain. Ia memiliki satu bentuk untuk maskulin dan feminin — diferente, tanpa -o/-a. Lawan katanya adalah igual yang sudah dikenal, "sama saja". Sifat diletakkan setelah kata penghubung: Es diferente, No es diferente.',
  tr: 'Diferente "farklı" demektir — bir karşılaştırma niteliği: bir şey başka bir şeyle uyuşmaz. Eril ve dişil için tek biçimi vardır — diferente, -o/-a yok. Zıttı zaten bilinen igual, "aynı şey"dir. Nitelik bağlaçtan sonra gelir: Es diferente, No es diferente.',
  pl: 'Diferente znaczy „inny” — cecha porównania: coś nie pasuje do czegoś innego. Ma jedną formę dla rodzaju męskiego i żeńskiego — diferente, bez -o/-a. Przeciwieństwem jest już znane igual, „wszystko jedno”. Cecha stoi po łączniku: Es diferente, No es diferente.',
});

const FORMULA_BODY = L({
  ru: 'Diferente не меняется по роду — как igual, только одно -e на конце. Множественное число просто добавляет -s: diferentes, независимо от рода. Связка выбирается по тому же правилу, что и всегда: Es diferente (один), Son diferentes (несколько), Somos diferentes (мы).',
  uk: 'Diferente не змінюється за родом — як igual, лише одне -e в кінці. Множина просто додає -s: diferentes, незалежно від роду. Зв’язка обирається за тим самим правилом, що й завжди: Es diferente (один), Son diferentes (кілька), Somos diferentes (ми).',
  es: 'Diferente does not change by gender — like igual, just one -e at the end. The plural simply adds -s: diferentes, regardless of gender. The linking word is chosen by the same rule as always: Es diferente (one), Son diferentes (several), Somos diferentes (we).',
  'pt-BR': 'Diferente não muda por gênero — como igual, apenas um -e no final. O plural só acrescenta -s: diferentes, independente do gênero. A ligação é escolhida pela mesma regra de sempre: Es diferente (um), Son diferentes (vários), Somos diferentes (nós).',
  vi: 'Diferente không đổi theo giống — giống như igual, chỉ có một -e ở cuối. Số nhiều chỉ thêm -s: diferentes, bất kể giống. Từ nối được chọn theo cùng quy tắc như mọi khi: Es diferente (một), Son diferentes (nhiều), Somos diferentes (chúng tôi).',
  id: 'Diferente tidak berubah menurut gender — seperti igual, hanya satu -e di akhir. Jamak hanya menambahkan -s: diferentes, terlepas dari gender. Kata penghubung dipilih dengan aturan yang sama seperti biasa: Es diferente (satu), Son diferentes (beberapa), Somos diferentes (kami).',
  tr: 'Diferente cinsiyete göre değişmez — igual gibi, sonda sadece bir -e. Çoğul yalnızca -s ekler: diferentes, cinsiyetten bağımsız. Bağlaç her zamanki kuralla seçilir: Es diferente (bir), Son diferentes (birkaç), Somos diferentes (biz).',
  pl: 'Diferente nie zmienia się według rodzaju — jak igual, tylko jedno -e na końcu. Liczba mnoga po prostu dodaje -s: diferentes, niezależnie od rodzaju. Łącznik wybiera się według tej samej reguły co zawsze: Es diferente (jeden), Son diferentes (kilku), Somos diferentes (my).',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — добавить -o или -a к diferente, как к bueno или malo. У diferente нет родовых форм: diferenta не существует. Вторая ловушка — спутать diferente с его противоположностью igual: одно значит «другое», другое значит «всё равно», это не синонимы.',
  uk: 'Найчастіша помилка — додати -o чи -a до diferente, як до bueno чи malo. У diferente немає родових форм: diferenta не існує. Друга пастка — сплутати diferente з протилежністю igual: одне означає «інше», інше означає «все одно», це не синоніми.',
  es: 'The most common mistake is adding -o or -a to diferente, like to bueno or malo. Diferente has no gendered forms: diferenta does not exist. The second trap is confusing diferente with its opposite igual: one means "different," the other means "all the same" — they are not synonyms.',
  'pt-BR': 'O erro mais comum é acrescentar -o ou -a a diferente, como a bueno ou malo. Diferente não tem formas de gênero: diferenta não existe. A segunda armadilha é confundir diferente com seu oposto igual: um significa "diferente", o outro significa "tanto faz" — não são sinônimos.',
  vi: 'Lỗi phổ biến nhất là thêm -o hoặc -a vào diferente, như với bueno hay malo. Diferente không có dạng theo giống: diferenta không tồn tại. Cái bẫy thứ hai là nhầm lẫn diferente với từ trái nghĩa igual: một từ nghĩa là "khác", từ kia nghĩa là "cũng như nhau" — chúng không phải từ đồng nghĩa.',
  id: 'Kesalahan paling umum: menambahkan -o atau -a ke diferente, seperti pada bueno atau malo. Diferente tidak punya bentuk gender: diferenta tidak ada. Jebakan kedua: mengacaukan diferente dengan igual — satu "berbeda", satu "sama saja", bukan sinonim.',
  tr: 'En yaygın hata, bueno veya malo gibi diferente\'ye -o veya -a eklemektir. Diferente\'nin cinsiyet biçimleri yoktur: diferenta yoktur. İkinci tuzak: diferente\'yi zıttı igual ile karıştırmak — biri "farklı" demek, diğeri "aynı şey" demek — bunlar eş anlamlı değildir.',
  pl: 'Najczęstszy błąd to dodanie -o lub -a do diferente, jak do bueno czy malo. Diferente nie ma form rodzajowych: diferenta nie istnieje. Druga pułapka to mylenie diferente z jego przeciwieństwem igual: jedno znaczy „inny”, drugie znaczy „wszystko jedno” — to nie synonimy.',
});

export const ES_EPISODE_01_SESSION_34_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Diferente — признак сравнения без рода',
      uk: 'Diferente — ознака порівняння без роду',
      es: 'Diferente — a comparison quality without gender',
      'pt-BR': 'Diferente — qualidade de comparação sem gênero',
      vi: 'Diferente — đặc điểm so sánh không có giống',
      id: 'Diferente — sifat perbandingan tanpa gender',
      tr: 'Diferente — cinsiyetsiz bir karşılaştırma niteliği',
      pl: 'Diferente — cecha porównania bez rodzaju',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Diferente — «другой», признак сравнения: что-то не совпадает с чем-то ещё. У него одна форма для мужского и женского рода — diferente, без -o/-a. Противоположность — уже знакомое igual, «всё равно». Признак ставится после связки: ', semantic: 'explanation' }, { text: 'Es diferente', semantic: 'targetCorrect' }, { text: ', No es diferente.', semantic: 'explanation' }),
      uk: R({ text: 'Diferente — «інший», ознака порівняння: щось не збігається з чимось іншим. У нього одна форма для чоловічого й жіночого роду — diferente, без -o/-a. Протилежність — вже знайоме igual, «все одно». Ознака стоїть після зв’язки: ', semantic: 'explanation' }, { text: 'Es diferente', semantic: 'targetCorrect' }, { text: ', No es diferente.', semantic: 'explanation' }),
      es: R({ text: 'Diferente means "different" — a comparison quality: something does not match something else. It has one form for masculine and feminine — diferente, no -o/-a. The opposite is the already-known igual, "all the same." The quality goes after the linking word: ', semantic: 'explanation' }, { text: 'Es diferente', semantic: 'targetCorrect' }, { text: ', No es diferente.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Diferente significa "diferente" — uma qualidade de comparação: algo não coincide com outra coisa. Tem uma única forma para masculino e feminino — diferente, sem -o/-a. O oposto é o já conhecido igual, "tanto faz". A qualidade fica depois da ligação: ', semantic: 'explanation' }, { text: 'Es diferente', semantic: 'targetCorrect' }, { text: ', No es diferente.', semantic: 'explanation' }),
      vi: R({ text: 'Diferente nghĩa là "khác" — một đặc điểm so sánh: điều gì đó không trùng khớp với thứ khác. Nó có một dạng duy nhất cho cả giống đực và giống cái — diferente, không có -o/-a. Từ trái nghĩa là igual đã quen thuộc, "cũng như nhau". Đặc điểm đứng sau từ nối: ', semantic: 'explanation' }, { text: 'Es diferente', semantic: 'targetCorrect' }, { text: ', No es diferente.', semantic: 'explanation' }),
      id: R({ text: 'Diferente berarti "berbeda" — sifat perbandingan: sesuatu tidak cocok dengan yang lain. Ia memiliki satu bentuk untuk maskulin dan feminin — diferente, tanpa -o/-a. Lawan katanya adalah igual yang sudah dikenal, "sama saja". Sifat diletakkan setelah kata penghubung: ', semantic: 'explanation' }, { text: 'Es diferente', semantic: 'targetCorrect' }, { text: ', No es diferente.', semantic: 'explanation' }),
      tr: R({ text: 'Diferente "farklı" demektir — bir karşılaştırma niteliği: bir şey başka bir şeyle uyuşmaz. Eril ve dişil için tek biçimi vardır — diferente, -o/-a yok. Zıttı zaten bilinen igual, "aynı şey"dir. Nitelik bağlaçtan sonra gelir: ', semantic: 'explanation' }, { text: 'Es diferente', semantic: 'targetCorrect' }, { text: ', No es diferente.', semantic: 'explanation' }),
      pl: R({ text: 'Diferente znaczy „inny” — cecha porównania: coś nie pasuje do czegoś innego. Ma jedną formę dla rodzaju męskiego i żeńskiego — diferente, bez -o/-a. Przeciwieństwem jest już znane igual, „wszystko jedno”. Cecha stoi po łączniku: ', semantic: 'explanation' }, { text: 'Es diferente', semantic: 'targetCorrect' }, { text: ', No es diferente.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как сказать «это другое» (безлично)?',
        uk: 'Як сказати «це інше» (безособово)?',
        es: 'How do you say "it is different" (impersonal)?',
        'pt-BR': 'Como se diz "é diferente" (impessoal)?',
        vi: 'Làm sao để nói "nó khác" (phi cá nhân)?',
        id: 'Bagaimana cara mengatakan "itu berbeda" (impersonal)?',
        tr: '"Bu farklı" (kişisiz) nasıl söylenir?',
        pl: 'Jak powiedzieć „to jest inne” (bezosobowo)?',
      }),
      choices: [
        L({ ru: 'Es diferente', uk: 'Es diferente', es: 'Es diferente', 'pt-BR': 'Es diferente', vi: 'Es diferente', id: 'Es diferente', tr: 'Es diferente', pl: 'Es diferente' }),
        L({ ru: 'Es diferento', uk: 'Es diferento', es: 'Es diferento', 'pt-BR': 'Es diferento', vi: 'Es diferento', id: 'Es diferento', tr: 'Es diferento', pl: 'Es diferento' }),
        L({ ru: 'Es igual', uk: 'Es igual', es: 'Es igual', 'pt-BR': 'Es igual', vi: 'Es igual', id: 'Es igual', tr: 'Es igual', pl: 'Es igual' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es diferente верно: неизменяемый признак, всегда -e. Es diferento не существует — такого окончания у diferente нет. Es igual называет противоположное значение — «всё равно».',
        uk: 'Es diferente правильно: незмінна ознака, завжди -e. Es diferento не існує — такого закінчення в diferente немає. Es igual називає протилежне значення — «все одно».',
        es: 'Es diferente is correct: an invariable quality, always -e. Es diferento does not exist — diferente has no such ending. Es igual names the opposite meaning — "all the same."',
        'pt-BR': 'Es diferente está correto: qualidade invariável, sempre -e. Es diferento não existe — diferente não tem essa terminação. Es igual nomeia o sentido oposto — "tanto faz".',
        vi: 'Es diferente đúng: đặc điểm bất biến, luôn là -e. Es diferento không tồn tại — diferente không có đuôi đó. Es igual gọi tên nghĩa ngược lại — "cũng như nhau".',
        id: 'Es diferente benar: sifat tak berubah, selalu -e. Es diferento tidak ada — diferente tidak memiliki akhiran itu. Es igual menyebut makna sebaliknya — "sama saja".',
        tr: 'Es diferente doğrudur: değişmez nitelik, her zaman -e. Es diferento yoktur — diferente\'nin böyle bir eki yok. Es igual ters anlamı adlandırır — "aynı şey".',
        pl: 'Es diferente jest poprawne: cecha niezmienna, zawsze -e. Es diferento nie istnieje — diferente nie ma takiej końcówki. Es igual nazywa przeciwne znaczenie — „wszystko jedno”.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Одна форма для всех — как igual',
      uk: 'Одна форма для всіх — як igual',
      es: 'One form for everyone — like igual',
      'pt-BR': 'Uma forma para todos — como igual',
      vi: 'Một dạng cho tất cả — giống igual',
      id: 'Satu bentuk untuk semua — seperti igual',
      tr: 'Herkes için tek biçim — igual gibi',
      pl: 'Jedna forma dla wszystkich — jak igual',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Diferente не меняется по роду — как igual, только одно -e на конце. Множественное число просто добавляет -s: diferentes, независимо от рода. Связка выбирается по тому же правилу, что и всегда: Es diferente (один), Son diferentes (несколько), ', semantic: 'explanation' }, { text: 'Somos diferentes', semantic: 'targetCorrect' }, { text: ' (мы).', semantic: 'explanation' }),
      uk: R({ text: 'Diferente не змінюється за родом — як igual, лише одне -e в кінці. Множина просто додає -s: diferentes, незалежно від роду. Зв’язка обирається за тим самим правилом, що й завжди: Es diferente (один), Son diferentes (кілька), ', semantic: 'explanation' }, { text: 'Somos diferentes', semantic: 'targetCorrect' }, { text: ' (ми).', semantic: 'explanation' }),
      es: R({ text: 'Diferente does not change by gender — like igual, just one -e at the end. The plural simply adds -s: diferentes, regardless of gender. The linking word is chosen by the same rule as always: Es diferente (one), Son diferentes (several), ', semantic: 'explanation' }, { text: 'Somos diferentes', semantic: 'targetCorrect' }, { text: ' (we).', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Diferente não muda por gênero — como igual, apenas um -e no final. O plural só acrescenta -s: diferentes, independente do gênero. A ligação é escolhida pela mesma regra de sempre: Es diferente (um), Son diferentes (vários), ', semantic: 'explanation' }, { text: 'Somos diferentes', semantic: 'targetCorrect' }, { text: ' (nós).', semantic: 'explanation' }),
      vi: R({ text: 'Diferente không đổi theo giống — giống như igual, chỉ có một -e ở cuối. Số nhiều chỉ thêm -s: diferentes, bất kể giống. Từ nối được chọn theo cùng quy tắc như mọi khi: Es diferente (một), Son diferentes (nhiều), ', semantic: 'explanation' }, { text: 'Somos diferentes', semantic: 'targetCorrect' }, { text: ' (chúng tôi).', semantic: 'explanation' }),
      id: R({ text: 'Diferente tidak berubah menurut gender — seperti igual, hanya satu -e di akhir. Jamak hanya menambahkan -s: diferentes, terlepas dari gender. Kata penghubung dipilih dengan aturan yang sama seperti biasa: Es diferente (satu), Son diferentes (beberapa), ', semantic: 'explanation' }, { text: 'Somos diferentes', semantic: 'targetCorrect' }, { text: ' (kami).', semantic: 'explanation' }),
      tr: R({ text: 'Diferente cinsiyete göre değişmez — igual gibi, sonda sadece bir -e. Çoğul yalnızca -s ekler: diferentes, cinsiyetten bağımsız. Bağlaç her zamanki kuralla seçilir: Es diferente (bir), Son diferentes (birkaç), ', semantic: 'explanation' }, { text: 'Somos diferentes', semantic: 'targetCorrect' }, { text: ' (biz).', semantic: 'explanation' }),
      pl: R({ text: 'Diferente nie zmienia się według rodzaju — jak igual, tylko jedno -e na końcu. Liczba mnoga po prostu dodaje -s: diferentes, niezależnie od rodzaju. Łącznik wybiera się według tej samej reguły co zawsze: Es diferente (jeden), Son diferentes (kilku), ', semantic: 'explanation' }, { text: 'Somos diferentes', semantic: 'targetCorrect' }, { text: ' (my).', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как сказать «мы разные» (группа, включая говорящего)?',
        uk: 'Як сказати «ми різні» (група, включно з мовцем)?',
        es: 'How do you say "we are different" (a group including the speaker)?',
        'pt-BR': 'Como se diz "somos diferentes" (grupo que inclui quem fala)?',
        vi: 'Làm sao để nói "chúng tôi khác nhau" (nhóm gồm cả người nói)?',
        id: 'Bagaimana cara mengatakan "kami berbeda" (kelompok yang mencakup penutur)?',
        tr: 'Konuşanı da içeren bir grup için "biz farklıyız" nasıl söylenir?',
        pl: 'Jak powiedzieć „jesteśmy różni” (grupa obejmująca mówiącego)?',
      }),
      choices: [
        L({ ru: 'Somos diferentes', uk: 'Somos diferentes', es: 'Somos diferentes', 'pt-BR': 'Somos diferentes', vi: 'Somos diferentes', id: 'Somos diferentes', tr: 'Somos diferentes', pl: 'Somos diferentes' }),
        L({ ru: 'Somos diferente', uk: 'Somos diferente', es: 'Somos diferente', 'pt-BR': 'Somos diferente', vi: 'Somos diferente', id: 'Somos diferente', tr: 'Somos diferente', pl: 'Somos diferente' }),
        L({ ru: 'Son diferentes', uk: 'Son diferentes', es: 'Son diferentes', 'pt-BR': 'Son diferentes', vi: 'Son diferentes', id: 'Son diferentes', tr: 'Son diferentes', pl: 'Son diferentes' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos diferentes верно: связка somos для группы, включающей говорящего, плюс множественное -s. Somos diferente забывает -s множественного числа, Son diferentes меняет связку — «они», без говорящего.',
        uk: 'Somos diferentes правильно: зв’язка somos для групи, що включає мовця, плюс множинне -s. Somos diferente забуває -s множини, Son diferentes змінює зв’язку — «вони», без мовця.',
        es: 'Somos diferentes is correct: the linking word somos for a group including the speaker, plus the plural -s. Somos diferente forgets the plural -s, Son diferentes changes the linking word to "they," without the speaker.',
        'pt-BR': 'Somos diferentes está correto: a ligação somos para um grupo que inclui quem fala, mais o -s do plural. Somos diferente esquece o -s do plural, Son diferentes muda a ligação para "eles", sem quem fala.',
        vi: 'Somos diferentes đúng: từ nối somos cho nhóm gồm cả người nói, cộng với -s số nhiều. Somos diferente quên -s số nhiều, Son diferentes đổi từ nối thành "họ", không có người nói.',
        id: 'Somos diferentes benar: kata penghubung somos untuk kelompok yang mencakup penutur, ditambah -s jamak. Somos diferente lupa -s jamak, Son diferentes mengubah kata penghubung menjadi "mereka", tanpa penutur.',
        tr: 'Somos diferentes doğrudur: konuşanı da içeren bir grup için somos bağlacı, artı çoğul -s. Somos diferente çoğul -s\'yi unutur, Son diferentes bağlacı "onlar" olarak değiştirir, konuşan olmadan.',
        pl: 'Somos diferentes jest poprawne: łącznik somos dla grupy obejmującej mówiącego, plus mnoga końcówka -s. Somos diferente zapomina o mnogiej -s, Son diferentes zmienia łącznik na „oni”, bez mówiącego.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Diferente не берёт -o/-a — и не путать с igual',
      uk: 'Diferente не бере -o/-a — і не плутати з igual',
      es: 'Diferente does not take -o/-a — and do not confuse it with igual',
      'pt-BR': 'Diferente não leva -o/-a — e não confundir com igual',
      vi: 'Diferente không lấy -o/-a — và đừng nhầm với igual',
      id: 'Diferente tidak menggunakan -o/-a — dan jangan bingung dengan igual',
      tr: 'Diferente -o/-a almaz — ve igual ile karıştırmayın',
      pl: 'Diferente nie przyjmuje -o/-a — i nie mylić z igual',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — добавить -o или -a к diferente, как к bueno или malo. У diferente нет родовых форм: ', semantic: 'explanation' }, { text: 'diferenta', semantic: 'targetWrong' }, { text: ' не существует. Вторая ловушка — спутать diferente с его противоположностью igual: одно значит «другое», другое значит «всё равно», это не синонимы.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — додати -o чи -a до diferente, як до bueno чи malo. У diferente немає родових форм: ', semantic: 'explanation' }, { text: 'diferenta', semantic: 'targetWrong' }, { text: ' не існує. Друга пастка — сплутати diferente з протилежністю igual: одне означає «інше», інше означає «все одно», це не синоніми.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is adding -o or -a to diferente, like to bueno or malo. Diferente has no gendered forms: ', semantic: 'explanation' }, { text: 'diferenta', semantic: 'targetWrong' }, { text: ' does not exist. The second trap is confusing diferente with its opposite igual: one means "different," the other means "all the same" — they are not synonyms.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é acrescentar -o ou -a a diferente, como a bueno ou malo. Diferente não tem formas de gênero: ', semantic: 'explanation' }, { text: 'diferenta', semantic: 'targetWrong' }, { text: ' não existe. A segunda armadilha é confundir diferente com seu oposto igual: um significa "diferente", o outro significa "tanto faz" — não são sinônimos.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là thêm -o hoặc -a vào diferente, như với bueno hay malo. Diferente không có dạng theo giống: ', semantic: 'explanation' }, { text: 'diferenta', semantic: 'targetWrong' }, { text: ' không tồn tại. Cái bẫy thứ hai là nhầm lẫn diferente với từ trái nghĩa igual: một từ nghĩa là "khác", từ kia nghĩa là "cũng như nhau" — chúng không phải từ đồng nghĩa.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum: menambahkan -o atau -a ke diferente, seperti pada bueno atau malo. Diferente tidak punya bentuk gender: ', semantic: 'explanation' }, { text: 'diferenta', semantic: 'targetWrong' }, { text: ' tidak ada. Jebakan kedua: mengacaukan diferente dengan igual — satu "berbeda", satu "sama saja", bukan sinonim.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, bueno veya malo gibi diferente\'ye -o veya -a eklemektir. Diferente\'nin cinsiyet biçimleri yoktur: ', semantic: 'explanation' }, { text: 'diferenta', semantic: 'targetWrong' }, { text: ' yoktur. İkinci tuzak: diferente\'yi zıttı igual ile karıştırmak — biri "farklı" demek, diğeri "aynı şey" demek — bunlar eş anlamlı değildir.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to dodanie -o lub -a do diferente, jak do bueno czy malo. Diferente nie ma form rodzajowych: ', semantic: 'explanation' }, { text: 'diferenta', semantic: 'targetWrong' }, { text: ' nie istnieje. Druga pułapka to mylenie diferente z jego przeciwieństwem igual: jedno znaczy „inny”, drugie znaczy „wszystko jedno” — to nie synonimy.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое написание неверно для «другой», мужской род?',
        uk: 'Яке написання неправильне для «інший», чоловічий рід?',
        es: 'Which spelling is wrong for "different", masculine?',
        'pt-BR': 'Qual grafia está errada para "diferente", masculino?',
        vi: 'Cách viết nào sai cho "khác", giống đực?',
        id: 'Ejaan mana yang salah untuk "berbeda", maskulin?',
        tr: '"Farklı" için hangi yazım yanlış, eril?',
        pl: 'Który zapis jest błędny dla „inny”, rodzaj męski?',
      }),
      choices: [
        L({ ru: 'diferenta', uk: 'diferenta', es: 'diferenta', 'pt-BR': 'diferenta', vi: 'diferenta', id: 'diferenta', tr: 'diferenta', pl: 'diferenta' }),
        L({ ru: 'diferente', uk: 'diferente', es: 'diferente', 'pt-BR': 'diferente', vi: 'diferente', id: 'diferente', tr: 'diferente', pl: 'diferente' }),
        L({ ru: 'igual', uk: 'igual', es: 'igual', 'pt-BR': 'igual', vi: 'igual', id: 'igual', tr: 'igual', pl: 'igual' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Diferenta неверно: diferente не берёт -o/-a, у него нет родовых форм, это ошибка, добавляющая несуществующее окончание, как к bueno или malo. Diferente — правильная форма для любого рода. Igual — не форма diferente, а другое слово с противоположным значением «всё равно».',
        uk: 'Diferenta неправильно: diferente не бере -o/-a, у нього немає родових форм, це помилка, що додає неіснуюче закінчення, як до bueno чи malo. Diferente — правильна форма для будь-якого роду. Igual — не форма diferente, а інше слово з протилежним значенням «все одно».',
        es: 'Diferenta is wrong: diferente does not take -o/-a, it has no gendered forms, this is a mistake that adds a nonexistent ending, like to bueno or malo. Diferente is the correct form for any gender. Igual is not a form of diferente, but a different word with the opposite meaning "all the same".',
        'pt-BR': 'Diferenta está errado: diferente não leva -o/-a, não tem formas de gênero, é um erro que acrescenta uma terminação inexistente, como a bueno ou malo. Diferente é a forma correta para qualquer gênero. Igual não é uma forma de diferente, mas uma palavra diferente com o sentido oposto "tanto faz".',
        vi: 'Diferenta sai: diferente không lấy -o/-a, nó không có dạng theo giống, đây là lỗi thêm đuôi không tồn tại, như với bueno hay malo. Diferente là dạng đúng cho mọi giống. Igual không phải là một dạng của diferente, mà là một từ khác mang nghĩa trái ngược "cũng như nhau".',
        id: 'Diferenta salah: diferente tidak menggunakan -o/-a, tidak memiliki bentuk gender, ini kesalahan menambahkan akhiran yang tidak ada, seperti pada bueno atau malo. Diferente adalah bentuk yang benar untuk gender apa pun. Igual bukan bentuk dari diferente, melainkan kata lain dengan makna berlawanan "sama saja".',
        tr: 'Diferenta yanlış: diferente -o/-a almaz, cinsiyet biçimleri yoktur, bu bueno veya malo gibi var olmayan bir ek ekleyen bir hatadır. Diferente herhangi bir cinsiyet için doğru biçimdir. Igual, diferente\'nin bir biçimi değil, "aynı şey" ters anlamlı başka bir kelimedir.',
        pl: 'Diferenta jest błędne: diferente nie przyjmuje -o/-a, nie ma form rodzajowych, to błąd dodający nieistniejącą końcówkę, jak do bueno czy malo. Diferente to poprawna forma dla każdego rodzaju. Igual to nie forma diferente, lecz inne słowo o przeciwnym znaczeniu „wszystko jedno”.',
      }),
    },
  },
];
