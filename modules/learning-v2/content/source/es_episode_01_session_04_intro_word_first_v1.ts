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
// новый признак. Тела страниц сразу написаны на 4+ причинных предложения с
// дословным вхождением ответа вопроса — по опыту сессии 3.
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
  ru: 'Verdad, уже известное слово, — существительное «правда», предмет разговора. Verdadero — совсем другое слово: прилагательное «истинный», признак того, о чём говорят. Короче говоря: verdadero описывает признак предмета, verdad называет предмет — это и есть главное отличие между ними. Verdad называет вещь, а verdadero описывает её свойство. Разница видна и в грамматике: verdad не меняется, а verdadero меняет концовку по роду, как любое обычное прилагательное.',
  uk: 'Verdad, уже відоме слово, — іменник «правда», предмет розмови. Verdadero — зовсім інше слово: прикметник «істинний», ознака того, про що говорять. Коротко кажучи: verdadero описує ознаку предмета, verdad називає предмет — це і є головна відмінність між ними. Verdad називає річ, а verdadero описує її властивість. Різниця видна й у граматиці: verdad не змінюється, а verdadero змінює закінчення за родом, як будь-який звичайний прикметник.',
  es: 'Verdad, a word already known, is the noun "truth", the subject of a conversation. Verdadero is a completely different word: the adjective "true", a quality of what is being talked about. In short: verdadero describes a quality of a thing, verdad names a thing — that is the main difference between them. Verdad names a thing, while verdadero describes its property. The difference also shows in the grammar: verdad does not change, while verdadero changes its ending by gender, like any regular adjective.',
  'pt-BR': 'Verdad, uma palavra já conhecida, é o substantivo "verdade", o assunto de uma conversa. Verdadero é uma palavra completamente diferente: o adjetivo "verdadeiro", uma qualidade daquilo de que se fala. Em resumo: verdadero descreve a qualidade de uma coisa, verdad nomeia uma coisa — essa é a principal diferença entre eles. Verdad nomeia uma coisa, enquanto verdadero descreve sua propriedade. A diferença também aparece na gramática: verdad não muda, enquanto verdadero muda a terminação por gênero, como qualquer adjetivo comum.',
  vi: 'Verdad, một từ đã biết, là danh từ "sự thật", chủ đề của một cuộc trò chuyện. Verdadero là một từ hoàn toàn khác: tính từ "đúng", một đặc điểm của điều đang được nói tới. Nói ngắn gọn: verdadero mô tả đặc điểm của một vật, verdad gọi tên một vật — đó là khác biệt chính giữa chúng. Verdad gọi tên một vật, còn verdadero mô tả tính chất của nó. Sự khác biệt cũng thể hiện trong ngữ pháp: verdad không đổi, còn verdadero đổi đuôi theo giống, như bất kỳ tính từ thông thường nào.',
  id: 'Verdad, kata yang sudah dikenal, adalah kata benda "kebenaran", topik sebuah percakapan. Verdadero adalah kata yang sama sekali berbeda: kata sifat "benar", sebuah sifat dari apa yang dibicarakan. Singkatnya: verdadero mendeskripsikan sifat suatu benda, verdad menamai benda — itulah perbedaan utama di antara keduanya. Verdad menamai sebuah benda, sedangkan verdadero mendeskripsikan propertinya. Perbedaannya juga terlihat dalam tata bahasa: verdad tidak berubah, sedangkan verdadero mengubah akhirannya menurut gender, seperti kata sifat biasa mana pun.',
  tr: 'Zaten bilinen bir kelime olan verdad, "doğruluk" ismidir, bir konuşmanın konusudur. Verdadero tamamen farklı bir kelimedir: hakkında konuşulan şeyin bir niteliği olan "doğru" sıfatı. Kısacası: verdadero bir şeyin niteliğini tanımlar, verdad bir şeyi adlandırır — aralarındaki temel fark budur. Verdad bir şeyi adlandırır, verdadero ise onun özelliğini tanımlar. Fark dilbilgisinde de görülür: verdad değişmez, verdadero ise herhangi bir sıradan sıfat gibi cinsiyete göre sonunu değiştirir.',
  pl: 'Verdad, już znane słowo, to rzeczownik „prawda”, temat rozmowy. Verdadero to zupełnie inne słowo: przymiotnik „prawdziwy”, cecha tego, o czym mowa. Krótko mówiąc: verdadero opisuje cechę rzeczy, verdad nazywa rzecz — to główna różnica między nimi. Verdad nazywa rzecz, a verdadero opisuje jej właściwość. Różnica widać też w gramatyce: verdad się nie zmienia, a verdadero zmienia końcówkę przez rodzaj, jak każdy zwykły przymiotnik.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что и для других прилагательных с явной концовкой: -o для мужского рода, -a для женского. Verdadero пишет -o, verdadera меняет ровно одну букву на -a — больше в слове ничего не меняется. Чтобы получить форму женского рода из verdadero, нужно заменить -o на -a: это и есть весь шаг целиком. Связка es от рода вообще не зависит и остаётся неизменной в обоих случаях.',
  uk: 'Формула та сама, що й для інших прикметників з явним закінченням: -o для чоловічого роду, -a для жіночого. Verdadero пише -o, verdadera змінює рівно одну літеру на -a — більше в слові нічого не змінюється. Щоб отримати форму жіночого роду з verdadero, потрібно замінити -o на -a: це і є весь крок цілком. Зв’язка es від роду взагалі не залежить і лишається незмінною в обох випадках.',
  es: 'The formula is the same as for other adjectives with an explicit ending: -o for masculine, -a for feminine. Verdadero writes -o, and verdadera changes exactly one letter to -a — nothing else in the word changes. To get the feminine form from verdadero, you need to change -o to -a: that is the entire step. The linking word es does not depend on gender at all and stays the same in both cases.',
  'pt-BR': 'A fórmula é a mesma de outros adjetivos com terminação explícita: -o para masculino, -a para feminino. Verdadero escreve -o, e verdadera muda exatamente uma letra para -a — nada mais na palavra muda. Para obter a forma feminina a partir de verdadero, é preciso trocar -o por -a: esse é o passo inteiro. A ligação es não depende do gênero de jeito nenhum e permanece igual nos dois casos.',
  vi: 'Công thức giống như các tính từ khác có đuôi rõ ràng: -o cho giống đực, -a cho giống cái. Verdadero viết -o, còn verdadera chỉ đổi đúng một chữ cái thành -a — không gì khác trong từ thay đổi. Để có dạng giống cái từ verdadero, cần đổi -o thành -a: đó là toàn bộ bước cần làm. Từ nối es hoàn toàn không phụ thuộc vào giống và giữ nguyên trong cả hai trường hợp.',
  id: 'Rumusnya sama seperti kata sifat lain dengan akhiran yang jelas: -o untuk maskulin, -a untuk feminin. Verdadero menulis -o, dan verdadera mengubah tepat satu huruf menjadi -a — tidak ada yang lain dalam kata itu yang berubah. Untuk mendapatkan bentuk feminin dari verdadero, perlu mengganti -o menjadi -a: itulah keseluruhan langkahnya. Kata penghubung es sama sekali tidak bergantung pada gender dan tetap sama di kedua kasus.',
  tr: 'Formül, açık son eke sahip diğer sıfatlarla aynıdır: eril için -o, dişil için -a. Verdadero -o yazar, verdadera ise tam olarak tek bir harfi -a olarak değiştirir — kelimede başka hiçbir şey değişmez. Verdadero’dan dişil biçimi elde etmek için -o’yu -a ile değiştirmek gerekir: bütün adım budur. Es bağlacı cinsiyete hiç bağlı değildir ve her iki durumda da aynı kalır.',
  pl: 'Formuła jest taka sama jak dla innych przymiotników z wyraźną końcówką: -o dla rodzaju męskiego, -a dla żeńskiego. Verdadero pisze -o, a verdadera zmienia dokładnie jedną literę na -a — nic więcej w słowie się nie zmienia. Aby uzyskać formę żeńską z verdadero, trzeba zamienić -o na -a: to cały krok. Łącznik es wcale nie zależy od rodzaju i pozostaje taki sam w obu przypadkach.',
});

const TRAP_BODY = L({
  ru: 'Verdad и verdadero легко перепутать — они делят один и тот же корень, но принадлежат к разным частям речи. Verdad — существительное, предмет разговора: оно не описывает ничего, а само является тем, о чём говорят. Verdadero — прилагательное, признак: оно описывает предмет, но само по себе предметом не является. Проверка простая: если слово меняется по роду (verdadero/verdadera), это признак; если не меняется совсем (verdad), это предмет.',
  uk: 'Verdad і verdadero легко сплутати — вони мають той самий корінь, але належать до різних частин мови. Verdad — іменник, предмет розмови: він нічого не описує, а сам є тим, про що говорять. Verdadero — прикметник, ознака: він описує предмет, але сам предметом не є. Перевірка проста: якщо слово змінюється за родом (verdadero/verdadera), це ознака; якщо не змінюється зовсім (verdad), це предмет.',
  es: 'Verdad and verdadero are easy to confuse — they share the same root, but belong to different parts of speech. Verdad is a noun, the subject of a conversation: it does not describe anything, it is itself what is being talked about. Verdadero is an adjective, a quality: it describes a thing, but is not itself a thing. The check is simple: if a word changes by gender (verdadero/verdadera), it is a quality; if it does not change at all (verdad), it is a thing.',
  'pt-BR': 'Verdad e verdadero são fáceis de confundir — compartilham a mesma raiz, mas pertencem a classes gramaticais diferentes. Verdad é um substantivo, o assunto de uma conversa: não descreve nada, é ele mesmo aquilo de que se fala. Verdadero é um adjetivo, uma qualidade: descreve uma coisa, mas não é ele mesmo uma coisa. A checagem é simples: se uma palavra muda por gênero (verdadero/verdadera), é uma qualidade; se não muda de jeito nenhum (verdad), é uma coisa.',
  vi: 'Verdad và verdadero dễ nhầm lẫn — chúng chung một gốc từ, nhưng thuộc các từ loại khác nhau. Verdad là danh từ, chủ đề của một cuộc trò chuyện: nó không mô tả gì cả, chính nó là điều đang được nói tới. Verdadero là tính từ, một đặc điểm: nó mô tả một vật, nhưng bản thân nó không phải là một vật. Cách kiểm tra đơn giản: nếu một từ đổi theo giống (verdadero/verdadera), đó là đặc điểm; nếu không đổi chút nào (verdad), đó là một vật.',
  id: 'Verdad dan verdadero mudah tertukar — keduanya berbagi akar kata yang sama, tetapi termasuk jenis kata yang berbeda. Verdad adalah kata benda, topik sebuah percakapan: ia tidak mendeskripsikan apa pun, ia sendiri adalah apa yang dibicarakan. Verdadero adalah kata sifat, sebuah sifat: ia mendeskripsikan sebuah benda, tetapi bukan benda itu sendiri. Pengecekannya sederhana: jika sebuah kata berubah menurut gender (verdadero/verdadera), itu adalah sifat; jika sama sekali tidak berubah (verdad), itu adalah benda.',
  tr: 'Verdad ve verdadero karıştırmak kolaydır — aynı kökü paylaşırlar ama farklı sözcük türlerine aittirler. Verdad bir isimdir, bir konuşmanın konusudur: hiçbir şeyi tanımlamaz, kendisi hakkında konuşulan şeydir. Verdadero bir sıfattır, bir niteliktir: bir şeyi tanımlar, ama kendisi bir şey değildir. Kontrol basittir: bir kelime cinsiyete göre değişiyorsa (verdadero/verdadera), bu bir niteliktir; hiç değişmiyorsa (verdad), bu bir şeydir.',
  pl: 'Verdad i verdadero łatwo pomylić — mają ten sam rdzeń, ale należą do różnych części mowy. Verdad to rzeczownik, temat rozmowy: nic nie opisuje, sam jest tym, o czym mowa. Verdadero to przymiotnik, cecha: opisuje rzecz, ale sam rzeczą nie jest. Sprawdzenie jest proste: jeśli słowo zmienia się przez rodzaj (verdadero/verdadera), to cecha; jeśli w ogóle się nie zmienia (verdad), to rzecz.',
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
      ru: R({ text: 'Verdad, уже известное слово, — существительное «правда», предмет разговора. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' — совсем другое слово: прилагательное «истинный», признак того, о чём говорят. Короче говоря: ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' описывает признак предмета, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' называет предмет — это и есть главное отличие между ними. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' называет вещь, а ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' описывает её свойство. Разница видна и в грамматике: ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' не меняется, а ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' меняет концовку по роду, как любое обычное прилагательное.', semantic: 'explanation' }),
      uk: R({ text: 'Verdad, уже відоме слово, — іменник «правда», предмет розмови. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' — зовсім інше слово: прикметник «істинний», ознака того, про що говорять. Коротко кажучи: ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' описує ознаку предмета, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' називає предмет — це і є головна відмінність між ними. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' називає річ, а ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' описує її властивість. Різниця видна й у граматиці: ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' не змінюється, а ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' змінює закінчення за родом, як будь-який звичайний прикметник.', semantic: 'explanation' }),
      es: R({ text: 'Verdad, a word already known, is the noun "truth", the subject of a conversation. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' is a completely different word: the adjective "true", a quality of what is being talked about. In short: ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' describes a quality of a thing, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' names a thing — that is the main difference between them. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' names a thing, while ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' describes its property. The difference also shows in the grammar: ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' does not change, while ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' changes its ending by gender, like any regular adjective.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Verdad, uma palavra já conhecida, é o substantivo "verdade", o assunto de uma conversa. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' é uma palavra completamente diferente: o adjetivo "verdadeiro", uma qualidade daquilo de que se fala. Em resumo: ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' descreve a qualidade de uma coisa, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' nomeia uma coisa — essa é a principal diferença entre eles. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' nomeia uma coisa, enquanto ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' descreve sua propriedade. A diferença também aparece na gramática: ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' não muda, enquanto ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' muda a terminação por gênero, como qualquer adjetivo comum.', semantic: 'explanation' }),
      vi: R({ text: 'Verdad, một từ đã biết, là danh từ "sự thật", chủ đề của một cuộc trò chuyện. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' là một từ hoàn toàn khác: tính từ "đúng", một đặc điểm của điều đang được nói tới. Nói ngắn gọn: ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' mô tả đặc điểm của một vật, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' gọi tên một vật — đó là khác biệt chính giữa chúng. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' gọi tên một vật, còn ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' mô tả tính chất của nó. Sự khác biệt cũng thể hiện trong ngữ pháp: ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' không đổi, còn ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' đổi đuôi theo giống, như bất kỳ tính từ thông thường nào.', semantic: 'explanation' }),
      id: R({ text: 'Verdad, kata yang sudah dikenal, adalah kata benda "kebenaran", topik sebuah percakapan. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' adalah kata yang sama sekali berbeda: kata sifat "benar", sebuah sifat dari apa yang dibicarakan. Singkatnya: ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' mendeskripsikan sifat suatu benda, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' menamai benda — itulah perbedaan utama di antara keduanya. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' menamai sebuah benda, sedangkan ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' mendeskripsikan propertinya. Perbedaannya juga terlihat dalam tata bahasa: ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' tidak berubah, sedangkan ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' mengubah akhirannya menurut gender, seperti kata sifat biasa mana pun.', semantic: 'explanation' }),
      tr: R({ text: 'Zaten bilinen bir kelime olan ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ', "doğruluk" ismidir, bir konuşmanın konusudur. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' tamamen farklı bir kelimedir: hakkında konuşulan şeyin bir niteliği olan "doğru" sıfatı. Kısacası: ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' bir şeyin niteliğini tanımlar, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' bir şeyi adlandırır — aralarındaki temel fark budur. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' bir şeyi adlandırır, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' ise onun özelliğini tanımlar. Fark dilbilgisinde de görülür: ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' değişmez, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' ise herhangi bir sıradan sıfat gibi cinsiyete göre sonunu değiştirir.', semantic: 'explanation' }),
      pl: R({ text: 'Verdad, już znane słowo, to rzeczownik „prawda”, temat rozmowy. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' to zupełnie inne słowo: przymiotnik „prawdziwy”, cecha tego, o czym mowa. Krótko mówiąc: ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' opisuje cechę rzeczy, ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' nazywa rzecz — to główna różnica między nimi. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' nazywa rzecz, a ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' opisuje jej właściwość. Różnica widać też w gramatyce: ', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: ' się nie zmienia, a ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' zmienia końcówkę przez rodzaj, jak każdy zwykły przymiotnik.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула та же, что и для других прилагательных с явной концовкой: концовка -o стоит для мужского рода, концовка -a — для женского. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' пишет -o, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' меняет ровно одну букву на -a — больше в слове ничего не меняется. Чтобы получить форму женского рода из verdadero, нужно заменить -o на -a: это и есть весь шаг целиком. Связка es от рода вообще не зависит и остаётся неизменной в обоих случаях.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й для інших прикметників з явним закінченням: закінчення -o стоїть для чоловічого роду, закінчення -a — для жіночого. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' пише -o, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' змінює рівно одну літеру на -a — більше в слові нічого не змінюється. Щоб отримати форму жіночого роду з verdadero, потрібно замінити -o на -a: це і є весь крок цілком. Зв’язка es від роду взагалі не залежить і лишається незмінною в обох випадках.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for other adjectives with an explicit ending: the ending -o is for masculine, the ending -a is for feminine. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' writes -o, and ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' changes exactly one letter to -a — nothing else in the word changes. To get the feminine form from verdadero, you need to change -o to -a: that is the entire step. The linking word es does not depend on gender at all and stays the same in both cases.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de outros adjetivos com terminação explícita: a terminação -o é para masculino, a terminação -a é para feminino. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' escreve -o, e ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' muda exatamente uma letra para -a — nada mais na palavra muda. Para obter a forma feminina a partir de verdadero, é preciso trocar -o por -a: esse é o passo inteiro. A ligação es não depende do gênero de jeito nenhum e permanece igual nos dois casos.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống như các tính từ khác có đuôi rõ ràng: đuôi -o dành cho giống đực, đuôi -a dành cho giống cái. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' viết -o, còn ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' chỉ đổi đúng một chữ cái thành -a — không gì khác trong từ thay đổi. Để có dạng giống cái từ verdadero, cần đổi -o thành -a: đó là toàn bộ bước cần làm. Từ nối es hoàn toàn không phụ thuộc vào giống và giữ nguyên trong cả hai trường hợp.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti kata sifat lain dengan akhiran yang jelas: akhiran -o untuk maskulin, akhiran -a untuk feminin. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' menulis -o, dan ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' mengubah tepat satu huruf menjadi -a — tidak ada yang lain dalam kata itu yang berubah. Untuk mendapatkan bentuk feminin dari verdadero, perlu mengganti -o menjadi -a: itulah keseluruhan langkahnya. Kata penghubung es sama sekali tidak bergantung pada gender dan tetap sama di kedua kasus.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, açık son eke sahip diğer sıfatlarla aynıdır: -o son eki eril için, -a son eki dişil içindir. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' -o yazar, ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' ise tam olarak tek bir harfi -a olarak değiştirir — kelimede başka hiçbir şey değişmez. Verdadero’dan dişil biçimi elde etmek için -o’yu -a ile değiştirmek gerekir: bütün adım budur. Es bağlacı cinsiyete hiç bağlı değildir ve her iki durumda da aynı kalır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla innych przymiotników z wyraźną końcówką: końcówka -o jest dla rodzaju męskiego, końcówka -a — dla żeńskiego. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' pisze -o, a ', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: ' zmienia dokładnie jedną literę na -a — nic więcej w słowie się nie zmienia. Aby uzyskać formę żeńską z verdadero, trzeba zamienić -o na -a: to cały krok. Łącznik es wcale nie zależy od rodzaju i pozostaje taki sam w obu przypadkach.', semantic: 'explanation' }),
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
      ru: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' и ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' легко перепутать — они делят один и тот же корень, но принадлежат к разным частям речи. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' — существительное, предмет разговора: оно не описывает ничего, а само является тем, о чём говорят. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' — прилагательное, признак: оно описывает предмет, но само по себе предметом не является. Если слово меняется по роду (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), это признак; если не меняется совсем (', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: '), это предмет.', semantic: 'explanation' }),
      uk: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' і ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' легко сплутати — вони мають той самий корінь, але належать до різних частин мови. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' — іменник, предмет розмови: він нічого не описує, а сам є тим, про що говорять. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' — прикметник, ознака: він описує предмет, але сам предметом не є. Якщо слово змінюється за родом (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), це ознака; якщо не змінюється зовсім (', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: '), це предмет.', semantic: 'explanation' }),
      es: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' and ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' are easy to confuse — they share the same root, but belong to different parts of speech. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' is a noun, the subject of a conversation: it does not describe anything, it is itself what is being talked about. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' is an adjective, a quality: it describes a thing, but is not itself a thing. If a word changes by gender (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), it is a quality; if it does not change at all (', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: '), it is a thing.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' e ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' são fáceis de confundir — compartilham a mesma raiz, mas pertencem a classes gramaticais diferentes. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' é um substantivo, o assunto de uma conversa: não descreve nada, é ele mesmo aquilo de que se fala. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' é um adjetivo, uma qualidade: descreve uma coisa, mas não é ele mesmo uma coisa. Se uma palavra muda por gênero (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), é uma qualidade; se não muda de jeito nenhum (', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: '), é uma coisa.', semantic: 'explanation' }),
      vi: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' và ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' dễ nhầm lẫn — chúng chung một gốc từ, nhưng thuộc các từ loại khác nhau. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' là danh từ, chủ đề của một cuộc trò chuyện: nó không mô tả gì cả, chính nó là điều đang được nói tới. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' là tính từ, một đặc điểm: nó mô tả một vật, nhưng bản thân nó không phải là một vật. Nếu một từ đổi theo giống (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), đó là đặc điểm; nếu không đổi chút nào (', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: '), đó là một vật.', semantic: 'explanation' }),
      id: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' dan ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' mudah tertukar — keduanya berbagi akar kata yang sama, tetapi termasuk jenis kata yang berbeda. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' adalah kata benda, topik sebuah percakapan: ia tidak mendeskripsikan apa pun, ia sendiri adalah apa yang dibicarakan. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' adalah kata sifat, sebuah sifat: ia mendeskripsikan sebuah benda, tetapi bukan benda itu sendiri. Jika sebuah kata berubah menurut gender (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), itu adalah sifat; jika sama sekali tidak berubah (', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: '), itu adalah benda.', semantic: 'explanation' }),
      tr: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' ve ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' karıştırmak kolaydır — aynı kökü paylaşırlar ama farklı sözcük türlerine aittirler. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' bir isimdir, bir konuşmanın konusudur: hiçbir şeyi tanımlamaz, kendisi hakkında konuşulan şeydir. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' bir sıfattır, bir niteliktir: bir şeyi tanımlar, ama kendisi bir şey değildir. Bir kelime cinsiyete göre değişiyorsa (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), bu bir niteliktir; hiç değişmiyorsa (', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: '), bu bir şeydir.', semantic: 'explanation' }),
      pl: R({ text: 'Verdad', semantic: 'targetWrong' }, { text: ' i ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: ' łatwo pomylić — mają ten sam rdzeń, ale należą do różnych części mowy. ', semantic: 'explanation' }, { text: 'Verdad', semantic: 'targetWrong' }, { text: ' to rzeczownik, temat rozmowy: nic nie opisuje, sam jest tym, o czym mowa. ', semantic: 'explanation' }, { text: 'Verdadero', semantic: 'targetCorrect' }, { text: ' to przymiotnik, cecha: opisuje rzecz, ale sam rzeczą nie jest. Jeśli słowo zmienia się przez rodzaj (', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'verdadera', semantic: 'targetCorrect' }, { text: '), to cecha; jeśli w ogóle się nie zmienia (', semantic: 'explanation' }, { text: 'verdad', semantic: 'targetWrong' }, { text: '), to rzecz.', semantic: 'explanation' }),
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
