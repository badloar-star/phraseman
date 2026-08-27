import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 4 "Правда или нет" / truth_adjective, builtOn: [1, 3]): три страницы
// concept/formula/trap объясняют verdadero/verdadera — прилагательное «истинный»,
// отдельное от verdad (существительное «правда», сессия 1). Recalls verdad (1)
// и gender_agreement_full (3): та же формула -o/-a, что и bonito/bonita, но
// новый признак.
//
// зачем тело переписано короче исходного черновика (владелец, 2026-08-27,
// тот же класс правки, что и в сессии 3 — см. её итоговый
// es_episode_01_session_03_intro_word_first_v1.ts): реальный гейт
// (learning_content_quality_gate_v1.ts) держит верхний потолок 320 знаков /
// 4 предложения; MIN_BODY_CHARS объявлена в гейте, но нигде не читается —
// нижнего порога на практике нет. Первый черновик этого файла был раздут до
// ~500 знаков на локаль и валил бы intro_body_overloaded — переписано короче
// без потери concept→formula→trap структуры.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_04_WORD_FIRST_TITLE = L({
  ru: 'Правда или нет',
  uk: 'Правда чи ні',
  es: 'True or not',
  'pt-BR': 'Verdade ou não',
  vi: 'Đúng hay không',
  id: 'Benar atau tidak',
  tr: 'Doğru mu değil mi',
  pl: 'Prawda czy nie',
});

export const ES_EPISODE_01_SESSION_04_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое слово показывает признак «истинный» — отдельно от существительного «правда», уже известного раньше.',
  uk: 'Одне нове слово показує ознаку «істинний» — окремо від іменника «правда», уже відомого раніше.',
  es: 'One new word shows the quality "true" — separate from the noun "truth", already known from before.',
  'pt-BR': 'Uma palavra nova mostra a qualidade "verdadeiro" — separada do substantivo "verdade", já conhecido antes.',
  vi: 'Một từ mới cho thấy đặc điểm "đúng" — tách biệt với danh từ "sự thật" đã biết trước đó.',
  id: 'Satu kata baru menunjukkan sifat "benar" — terpisah dari kata benda "kebenaran" yang sudah dikenal sebelumnya.',
  tr: 'Tek bir yeni kelime "doğru" niteliğini gösterir — daha önceden bilinen "doğruluk" isminden ayrı olarak.',
  pl: 'Jedno nowe słowo pokazuje cechę „prawdziwy” — osobno od rzeczownika „prawda”, już znanego wcześniej.',
});

export const ES_EPISODE_01_SESSION_04_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать verdadero и его форму verdadera, а затем выбрать нужную форму по роду.',
  uk: 'Упізнати на слух, зрозуміти й точно написати verdadero та його форму verdadera, а потім обрати потрібну форму за родом.',
  es: 'Recognize, understand, and write verdadero and its form verdadera, then choose the right form by gender.',
  'pt-BR': 'Reconhecer de ouvido, entender e escrever corretamente verdadero e sua forma verdadera, depois escolher a forma certa pelo gênero.',
  vi: 'Nghe ra, hiểu và viết đúng verdadero cùng dạng verdadera của nó, sau đó chọn đúng dạng theo giống.',
  id: 'Mengenali dari suara, memahami, dan menulis verdadero serta bentuknya verdadera dengan tepat, lalu memilih bentuk yang benar sesuai gender.',
  tr: 'Verdadero ve onun verdadera biçimini duyup tanımak, anlamak ve doğru yazmak; ardından cinsiyete göre doğru biçimi seçmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać verdadero oraz jego formę verdadera, a potem wybrać właściwą formę według rodzaju.',
});

const CONCEPT_BODY = L({
  ru: 'Verdadero описывает признак предмета, verdad называет предмет — вот и вся разница между ними. Verdad — существительное «правда», уже известное раньше. Verdadero меняет концовку по роду, а verdad не меняется никогда.',
  uk: 'Verdadero описує ознаку предмета, verdad називає предмет — ось і вся різниця між ними. Verdad — іменник «правда», уже відомий раніше. Verdadero змінює закінчення за родом, а verdad не змінюється ніколи.',
  es: 'Verdadero describes a quality of a thing, verdad names a thing — that is the whole difference between them. Verdad is the noun "truth", already known. Verdadero changes its ending by gender, while verdad never changes.',
  'pt-BR': 'Verdadero descreve a qualidade de uma coisa, verdad nomeia uma coisa — essa é toda a diferença entre eles. Verdad é o substantivo "verdade", já conhecido. Verdadero muda a terminação por gênero, enquanto verdad nunca muda.',
  vi: 'Verdadero mô tả đặc điểm của một vật, verdad gọi tên một vật — đó là toàn bộ khác biệt giữa chúng. Verdad là danh từ "sự thật", đã biết trước đó. Verdadero đổi đuôi theo giống, còn verdad không bao giờ đổi.',
  id: 'Verdadero mendeskripsikan sifat suatu benda, verdad menamai benda — itulah seluruh perbedaan di antara keduanya. Verdad adalah kata benda "kebenaran", sudah dikenal. Verdadero mengubah akhirannya menurut gender, sedangkan verdad tidak pernah berubah.',
  tr: 'Verdadero bir şeyin niteliğini tanımlar, verdad bir şeyi adlandırır — aralarındaki tüm fark budur. Verdad, önceden bilinen "doğruluk" ismidir. Verdadero cinsiyete göre sonunu değiştirir, verdad ise hiç değişmez.',
  pl: 'Verdadero opisuje cechę rzeczy, verdad nazywa rzecz — to cała różnica między nimi. Verdad to rzeczownik „prawda”, już znany. Verdadero zmienia końcówkę przez rodzaj, a verdad nigdy się nie zmienia.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что и для других прилагательных с явной концовкой: нужно заменить -o на -a. Verdadero пишет -o, verdadera меняет ровно одну букву на -a. Связка es от рода не зависит и остаётся неизменной в обоих случаях.',
  uk: 'Формула та сама, що й для інших прикметників з явним закінченням: потрібно замінити -o на -a. Verdadero пише -o, verdadera змінює рівно одну літеру на -a. Зв’язка es від роду не залежить і лишається незмінною в обох випадках.',
  es: 'The formula is the same as for other adjectives with an explicit ending: change -o to -a. Verdadero writes -o, verdadera changes exactly one letter to -a. The linking word es does not depend on gender and stays the same in both cases.',
  'pt-BR': 'A fórmula é a mesma de outros adjetivos com terminação explícita: trocar -o por -a. Verdadero escreve -o, verdadera muda exatamente uma letra para -a. A ligação es não depende do gênero e permanece igual nos dois casos.',
  vi: 'Công thức giống như các tính từ khác có đuôi rõ ràng: đổi -o thành -a. Verdadero viết -o, verdadera chỉ đổi đúng một chữ cái thành -a. Từ nối es không phụ thuộc vào giống và giữ nguyên trong cả hai trường hợp.',
  id: 'Rumusnya sama seperti kata sifat lain dengan akhiran yang jelas: mengganti -o menjadi -a. Verdadero menulis -o, verdadera mengubah tepat satu huruf menjadi -a. Kata penghubung es tidak bergantung pada gender dan tetap sama di kedua kasus.',
  tr: 'Formül, açık son eke sahip diğer sıfatlarla aynıdır: -o’yu -a ile değiştirmek. Verdadero -o yazar, verdadera tam olarak tek bir harfi -a olarak değiştirir. Es bağlacı cinsiyete bağlı değildir ve her iki durumda da aynı kalır.',
  pl: 'Formuła jest taka sama jak dla innych przymiotników z wyraźną końcówką: zamienić -o na -a. Verdadero pisze -o, verdadera zmienia dokładnie jedną literę na -a. Łącznik es nie zależy od rodzaju i pozostaje taki sam w obu przypadkach.',
});

const TRAP_BODY = L({
  ru: 'Verdad и verdadero легко перепутать — общий корень, разные части речи. Verdad — существительное, предмет разговора, оно ничего не описывает. Verdadero — прилагательное: меняется по роду (verdadero/verdadera), а verdad не меняется совсем.',
  uk: 'Verdad і verdadero легко сплутати — спільний корінь, різні частини мови. Verdad — іменник, предмет розмови, він нічого не описує. Verdadero — прикметник: змінюється за родом (verdadero/verdadera), а verdad не змінюється зовсім.',
  es: 'Verdad and verdadero are easy to confuse — same root, different parts of speech. Verdad is a noun, the subject of a conversation, it describes nothing. Verdadero is an adjective: it changes by gender (verdadero/verdadera), while verdad does not change at all.',
  'pt-BR': 'Verdad e verdadero são fáceis de confundir — mesma raiz, classes gramaticais diferentes. Verdad é um substantivo, o assunto de uma conversa, não descreve nada. Verdadero é um adjetivo: muda por gênero (verdadero/verdadera), enquanto verdad não muda nunca.',
  vi: 'Verdad và verdadero dễ nhầm lẫn — cùng gốc từ, khác từ loại. Verdad là danh từ, chủ đề cuộc trò chuyện, nó không mô tả gì cả. Verdadero là tính từ: đổi theo giống (verdadero/verdadera), còn verdad không đổi chút nào.',
  id: 'Verdad dan verdadero mudah tertukar — akar kata sama, jenis kata berbeda. Verdad adalah kata benda, topik percakapan, tidak mendeskripsikan apa pun. Verdadero adalah kata sifat: berubah menurut gender (verdadero/verdadera), sedangkan verdad sama sekali tidak berubah.',
  tr: 'Verdad ve verdadero karıştırmak kolaydır — aynı kök, farklı sözcük türleri. Verdad bir isimdir, konuşmanın konusudur, hiçbir şeyi tanımlamaz. Verdadero bir sıfattır: cinsiyete göre değişir (verdadero/verdadera), verdad ise hiç değişmez.',
  pl: 'Verdad i verdadero łatwo pomylić — ten sam rdzeń, różne części mowy. Verdad to rzeczownik, temat rozmowy, nic nie opisuje. Verdadero to przymiotnik: zmienia się przez rodzaj (verdadero/verdadera), a verdad w ogóle się nie zmienia.',
});

export const ES_EPISODE_01_SESSION_04_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Признак «истинный», не предмет',
      uk: 'Ознака «істинний», не предмет',
      es: 'A quality "true", not a thing',
      'pt-BR': 'A qualidade "verdadeiro", não uma coisa',
      vi: 'Đặc điểm "đúng", không phải sự vật',
      id: 'Sifat "benar", bukan benda',
      tr: 'Bir "doğru" niteliği, bir şey değil',
      pl: 'Cecha „prawdziwy”, nie rzecz',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' описывает признак предмета, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' называет предмет — вот и вся разница между ними. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' — существительное «правда», уже известное раньше. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' меняет концовку по роду, а ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' не меняется никогда.', semantic: 'explanation' }),
      uk: R({ text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' описує ознаку предмета, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' називає предмет — ось і вся різниця між ними. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' — іменник «правда», уже відомий раніше. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' змінює закінчення за родом, а ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' не змінюється ніколи.', semantic: 'explanation' }),
      es: R({ text: 'Verdadero describes a quality of a thing, verdad names a thing', semantic: 'targetCorrect' }, { text: ' — that is the whole difference between them. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' is the noun "truth", already known. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' changes its ending by gender, while ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' never changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' descreve a qualidade de uma coisa, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' nomeia uma coisa — essa é toda a diferença entre eles. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' é o substantivo "verdade", já conhecido. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' muda a terminação por gênero, enquanto ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' nunca muda.', semantic: 'explanation' }),
      vi: R({ text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' mô tả đặc điểm của một vật, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' gọi tên một vật — đó là toàn bộ khác biệt giữa chúng. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' là danh từ "sự thật", đã biết trước đó. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' đổi đuôi theo giống, còn ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' không bao giờ đổi.', semantic: 'explanation' }),
      id: R({ text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' mendeskripsikan sifat suatu benda, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' menamai benda — itulah seluruh perbedaan di antara keduanya. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' adalah kata benda "kebenaran", sudah dikenal. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' mengubah akhirannya menurut gender, sedangkan ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' tidak pernah berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' bir şeyin niteliğini tanımlar, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' bir şeyi adlandırır — aralarındaki tüm fark budur. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ', önceden bilinen "doğruluk" ismidir. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' cinsiyete göre sonunu değiştirir, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' ise hiç değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' opisuje cechę rzeczy, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' nazywa rzecz — to cała różnica między nimi. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' to rzeczownik „prawda”, już znany. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' zmienia końcówkę przez rodzaj, a ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' nigdy się nie zmienia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Чем verdadero отличается от verdad?',
        uk: 'Чим verdadero відрізняється від verdad?',
        es: 'How does verdadero differ from verdad?',
        'pt-BR': 'Qual a diferença entre verdadero e verdad?',
        vi: 'Verdadero khác verdad ở điểm nào?',
        id: 'Apa perbedaan verdadero dari verdad?',
        tr: 'Verdadero, verdad’dan nasıl farklıdır?',
        pl: 'Czym verdadero różni się od verdad?',
      }),
      choices: [
        L({ ru: 'Verdadero описывает признак предмета, verdad называет предмет', uk: 'Verdadero описує ознаку предмета, verdad називає предмет', es: 'Verdadero describes a quality of a thing, verdad names a thing', 'pt-BR': 'Verdadero descreve a qualidade de uma coisa, verdad nomeia uma coisa', vi: 'Verdadero mô tả đặc điểm của một vật, verdad gọi tên một vật', id: 'Verdadero mendeskripsikan sifat suatu benda, verdad menamai benda', tr: 'Verdadero bir şeyin niteliğini tanımlar, verdad bir şeyi adlandırır', pl: 'Verdadero opisuje cechę rzeczy, verdad nazywa rzecz' }),
        L({ ru: 'Это два одинаковых слова', uk: 'Це два однакові слова', es: 'They are two identical words', 'pt-BR': 'São duas palavras idênticas', vi: 'Chúng là hai từ giống hệt nhau', id: 'Keduanya adalah dua kata yang identik', tr: 'İkisi aynı kelimedir', pl: 'To dwa identyczne słowa' }),
        L({ ru: 'Verdad длиннее просто так, без разницы в значении', uk: 'Verdad довше просто так, без різниці у значенні', es: 'Verdad is just longer, with no difference in meaning', 'pt-BR': 'Verdad é só mais longa, sem diferença de significado', vi: 'Verdad chỉ dài hơn, không có khác biệt về nghĩa', id: 'Verdad hanya lebih panjang, tanpa perbedaan makna', tr: 'Verdad sadece daha uzun, anlam farkı yok', pl: 'Verdad jest po prostu dłuższe, bez różnicy znaczeniowej' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Verdadero описывает признак предмета, verdad называет сам предмет — это разные части речи, не варианты одного слова.',
        uk: 'Verdadero описує ознаку предмета, verdad називає сам предмет — це різні частини мови, не варіанти одного слова.',
        es: 'Verdadero describes a quality of a thing, verdad names the thing itself — these are different parts of speech, not variants of one word.',
        'pt-BR': 'Verdadero descreve a qualidade de uma coisa, verdad nomeia a própria coisa — são classes gramaticais diferentes, não variantes de uma palavra.',
        vi: 'Verdadero mô tả đặc điểm của một vật, verdad gọi tên chính vật đó — đây là các từ loại khác nhau, không phải biến thể của một từ.',
        id: 'Verdadero mendeskripsikan sifat suatu benda, verdad menamai benda itu sendiri — ini adalah jenis kata yang berbeda, bukan varian dari satu kata.',
        tr: 'Verdadero bir şeyin niteliğini tanımlar, verdad şeyin kendisini adlandırır — bunlar farklı sözcük türleridir, tek bir kelimenin varyantları değildir.',
        pl: 'Verdadero opisuje cechę rzeczy, verdad nazywa samą rzecz — to różne części mowy, a nie warianty jednego słowa.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: '-o для него, -a для неё',
      uk: '-o для нього, -a для неї',
      es: '-o for masculine, -a for feminine',
      'pt-BR': '-o para masculino, -a para feminino',
      vi: '-o cho giống đực, -a cho giống cái',
      id: '-o untuk maskulin, -a untuk feminin',
      tr: 'Eril için -o, dişil için -a',
      pl: '-o dla męskiego, -a dla żeńskiego',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула та же, что и для других прилагательных с явной концовкой: нужно ', semantic: 'explanation' }, { text: 'заменить -o на -a', semantic: 'targetCorrect' }, { text: '. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' пишет -o, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' меняет ровно одну букву на -a. Связка es от рода не зависит и остаётся неизменной в обоих случаях.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й для інших прикметників з явним закінченням: потрібно ', semantic: 'explanation' }, { text: 'замінити -o на -a', semantic: 'targetCorrect' }, { text: '. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' пише -o, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' змінює рівно одну літеру на -a. Зв’язка es від роду не залежить і лишається незмінною в обох випадках.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for other adjectives with an explicit ending: ', semantic: 'explanation' }, { text: 'change -o to -a', semantic: 'targetCorrect' }, { text: '. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' writes -o, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' changes exactly one letter to -a. The linking word es does not depend on gender and stays the same in both cases.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de outros adjetivos com terminação explícita: ', semantic: 'explanation' }, { text: 'trocar -o por -a', semantic: 'targetCorrect' }, { text: '. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' escreve -o, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' muda exatamente uma letra para -a. A ligação es não depende do gênero e permanece igual nos dois casos.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống như các tính từ khác có đuôi rõ ràng: ', semantic: 'explanation' }, { text: 'đổi -o thành -a', semantic: 'targetCorrect' }, { text: '. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' viết -o, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' chỉ đổi đúng một chữ cái thành -a. Từ nối es không phụ thuộc vào giống và giữ nguyên trong cả hai trường hợp.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti kata sifat lain dengan akhiran yang jelas: ', semantic: 'explanation' }, { text: 'mengganti -o menjadi -a', semantic: 'targetCorrect' }, { text: '. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' menulis -o, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' mengubah tepat satu huruf menjadi -a. Kata penghubung es tidak bergantung pada gender dan tetap sama di kedua kasus.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, açık son eke sahip diğer sıfatlarla aynıdır: ', semantic: 'explanation' }, { text: '-o’yu -a ile değiştirmek', semantic: 'targetCorrect' }, { text: '. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' -o yazar, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' tam olarak tek bir harfi -a olarak değiştirir. Es bağlacı cinsiyete bağlı değildir ve her iki durumda da aynı kalır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla innych przymiotników z wyraźną końcówką: ', semantic: 'explanation' }, { text: 'zamienić -o na -a', semantic: 'targetCorrect' }, { text: '. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' pisze -o, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' zmienia dokładnie jedną literę na -a. Łącznik es nie zależy od rodzaju i pozostaje taki sam w obu przypadkach.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что нужно поменять, чтобы получить форму женского рода из verdadero?',
        uk: 'Що потрібно змінити, щоб отримати форму жіночого роду з verdadero?',
        es: 'What needs to change to get the feminine form from verdadero?',
        'pt-BR': 'O que precisa mudar para obter a forma feminina a partir de verdadero?',
        vi: 'Cần thay đổi gì để có dạng giống cái từ verdadero?',
        id: 'Apa yang perlu diubah untuk mendapatkan bentuk feminin dari verdadero?',
        tr: 'Verdadero’dan dişil biçimi elde etmek için ne değişmelidir?',
        pl: 'Co trzeba zmienić, aby uzyskać formę żeńską z verdadero?',
      }),
      choices: [
        L({ ru: 'Заменить -o на -a', uk: 'Замінити -o на -a', es: 'Change -o to -a', 'pt-BR': 'Trocar -o por -a', vi: 'Đổi -o thành -a', id: 'Mengganti -o menjadi -a', tr: '-o’yu -a ile değiştirmek', pl: 'Zamienić -o na -a' }),
        L({ ru: 'Добавить -mente на конце', uk: 'Додати -mente наприкінці', es: 'Add -mente at the end', 'pt-BR': 'Adicionar -mente no final', vi: 'Thêm -mente vào cuối', id: 'Menambahkan -mente di akhir', tr: 'Sona -mente eklemek', pl: 'Dodać -mente na końcu' }),
        L({ ru: 'Ничего не менять', uk: 'Нічого не змінювати', es: 'Change nothing', 'pt-BR': 'Não mudar nada', vi: 'Không đổi gì cả', id: 'Tidak mengubah apa pun', tr: 'Hiçbir şeyi değiştirmemek', pl: 'Nic nie zmieniać' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Правильный ответ — заменить -o на -a: verdadero становится verdadera ровно этой одной заменой. Добавление -mente дало бы наречие, а не форму женского рода; отсутствие изменений оставило бы мужской род на месте предмета женского рода.',
        uk: 'Правильна відповідь — замінити -o на -a: verdadero стає verdadera рівно цією однією заміною. Додавання -mente дало б прислівник, а не форму жіночого роду; відсутність змін лишила б чоловічий рід на місці предмета жіночого роду.',
        es: 'The correct answer is to change -o to -a: verdadero becomes verdadera with exactly this one change. Adding -mente would produce an adverb, not the feminine form; making no change would leave the masculine form on a feminine noun.',
        'pt-BR': 'A resposta certa é trocar -o por -a: verdadero vira verdadera com exatamente essa mudança. Adicionar -mente daria um advérbio, não a forma feminina; não mudar nada deixaria a forma masculina num substantivo feminino.',
        vi: 'Câu trả lời đúng là đổi -o thành -a: verdadero trở thành verdadera chỉ với đúng một thay đổi này. Thêm -mente sẽ tạo ra một trạng từ, không phải dạng giống cái; không đổi gì sẽ để lại dạng giống đực trên một danh từ giống cái.',
        id: 'Jawaban yang benar adalah mengganti -o menjadi -a: verdadero menjadi verdadera dengan tepat satu perubahan ini. Menambahkan -mente akan menghasilkan kata keterangan, bukan bentuk feminin; tidak mengubah apa pun akan meninggalkan bentuk maskulin pada kata benda feminin.',
        tr: 'Doğru cevap -o’yu -a ile değiştirmektir: verdadero, tam olarak bu tek değişiklikle verdadera olur. -mente eklemek bir zarf oluşturur, dişil biçim değil; hiçbir şeyi değiştirmemek ise dişil bir isimde eril biçimi bırakır.',
        pl: 'Poprawna odpowiedź to zamiana -o na -a: verdadero staje się verdadera dzięki dokładnie tej jednej zmianie. Dodanie -mente dałoby przysłówek, a nie formę żeńską; brak zmiany pozostawiłby formę męską przy rzeczowniku żeńskim.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не путать предмет с признаком',
      uk: 'Не плутати предмет з ознакою',
      es: 'Do not confuse a thing with a quality',
      'pt-BR': 'Não confundir uma coisa com uma qualidade',
      vi: 'Đừng nhầm sự vật với đặc điểm',
      id: 'Jangan tertukar benda dengan sifat',
      tr: 'Bir şeyi bir nitelikle karıştırmayın',
      pl: 'Nie mylić rzeczy z cechą',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' и ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' легко перепутать — общий корень, разные части речи. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' — существительное, предмет разговора, оно ничего не описывает. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' — прилагательное: меняется по роду (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), а ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' не меняется совсем.', semantic: 'explanation' }),
      uk: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' і ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' легко сплутати — спільний корінь, різні частини мови. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' — іменник, предмет розмови, він нічого не описує. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' — прикметник: змінюється за родом (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), а ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' не змінюється зовсім.', semantic: 'explanation' }),
      es: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' and ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' are easy to confuse — same root, different parts of speech. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' is a noun, the subject of a conversation, it describes nothing. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' is an adjective: it changes by gender (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), while ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' does not change at all.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' e ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' são fáceis de confundir — mesma raiz, classes gramaticais diferentes. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' é um substantivo, o assunto de uma conversa, não descreve nada. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' é um adjetivo: muda por gênero (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), enquanto ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' não muda nunca.', semantic: 'explanation' }),
      vi: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' và ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' dễ nhầm lẫn — cùng gốc từ, khác từ loại. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' là danh từ, chủ đề cuộc trò chuyện, nó không mô tả gì cả. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' là tính từ: đổi theo giống (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), còn ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' không đổi chút nào.', semantic: 'explanation' }),
      id: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' dan ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' mudah tertukar — akar kata sama, jenis kata berbeda. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' adalah kata benda, topik percakapan, tidak mendeskripsikan apa pun. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' adalah kata sifat: berubah menurut gender (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), sedangkan ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' sama sekali tidak berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' ve ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' karıştırmak kolaydır — aynı kök, farklı sözcük türleri. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' bir isimdir, konuşmanın konusudur, hiçbir şeyi tanımlamaz. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' bir sıfattır: cinsiyete göre değişir (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' ise hiç değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' i ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' łatwo pomylić — ten sam rdzeń, różne części mowy. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' to rzeczownik, temat rozmowy, nic nie opisuje. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' to przymiotnik: zmienia się przez rodzaj (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), a ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' w ogóle się nie zmienia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое из этих слов НЕ меняется по роду?',
        uk: 'Яке з цих слів НЕ змінюється за родом?',
        es: 'Which of these words does NOT change for gender?',
        'pt-BR': 'Qual dessas palavras NÃO muda de gênero?',
        vi: 'Từ nào trong số này KHÔNG đổi theo giống?',
        id: 'Kata mana di antara ini yang TIDAK berubah menurut gender?',
        tr: 'Bu kelimelerden hangisi cinsiyete göre değişMEZ?',
        pl: 'Które z tych słów NIE zmienia się przez rodzaj?',
      }),
      choices: [
        L({ ru: 'verdad', uk: 'verdad', es: 'verdad', 'pt-BR': 'verdad', vi: 'verdad', id: 'verdad', tr: 'verdad', pl: 'verdad' }),
        L({ ru: 'verdadero', uk: 'verdadero', es: 'verdadero', 'pt-BR': 'verdadero', vi: 'verdadero', id: 'verdadero', tr: 'verdadero', pl: 'verdadero' }),
        L({ ru: 'verdadera', uk: 'verdadera', es: 'verdadera', 'pt-BR': 'verdadera', vi: 'verdadera', id: 'verdadera', tr: 'verdadera', pl: 'verdadera' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Verdad — существительное, оно не меняется по роду. Verdadero и verdadera — как раз пара прилагательного, которая меняется.',
        uk: 'Verdad — іменник, він не змінюється за родом. Verdadero і verdadera — якраз пара прикметника, яка змінюється.',
        es: 'Verdad is a noun, it does not change for gender. Verdadero and verdadera are exactly the adjective pair that changes.',
        'pt-BR': 'Verdad é um substantivo, não muda de gênero. Verdadero e verdadera são exatamente o par de adjetivo que muda.',
        vi: 'Verdad là danh từ, nó không đổi theo giống. Verdadero và verdadera chính là cặp tính từ thay đổi.',
        id: 'Verdad adalah kata benda, tidak berubah menurut gender. Verdadero dan verdadera justru pasangan kata sifat yang berubah.',
        tr: 'Verdad bir isimdir, cinsiyete göre değişmez. Verdadero ve verdadera ise tam olarak değişen sıfat çiftidir.',
        pl: 'Verdad to rzeczownik, nie zmienia się przez rodzaj. Verdadero i verdadera to właśnie para przymiotnika, która się zmienia.',
      }),
    },
  },
];
