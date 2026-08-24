import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 6 "Ударение слышно" / written_accent, builtOn: [1, 5], recalls: [1, 5]):
// три страницы concept/formula/trap объясняют письменное ударение (тильду)
// через único/única — единственное новое слово этой сессии. Recalls fácil (1)
// и rápido (5) — оба с ударением на á первого слога, тот же ритмический
// рисунок. Тела страниц сразу написаны на 4+ причинных предложения с
// дословным вхождением ответа вопроса, без ссылок на "курс"/"сессию".
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_06_WORD_FIRST_TITLE = L({
  ru: 'Ударение слышно',
  uk: 'Наголос чути',
  es: 'The stress is heard',
  'pt-BR': 'O acento se ouve',
  vi: 'Nghe được trọng âm',
  id: 'Tekanan bisa didengar',
  tr: 'Vurgu duyulur',
  pl: 'Akcent słychać',
});

export const ES_EPISODE_01_SESSION_06_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое слово показывает, как письменная тильда над гласной меняет само звучание слова, а не просто украшает букву.',
  uk: 'Одне нове слово показує, як письмова тильда над голосною змінює саме звучання слова, а не просто прикрашає літеру.',
  es: 'One new word shows how a written tilde over a vowel changes the very sound of a word, not just decorates a letter.',
  'pt-BR': 'Uma palavra nova mostra como um til escrito sobre uma vogal muda o próprio som da palavra, não apenas decora uma letra.',
  vi: 'Một từ mới cho thấy dấu ngã viết trên nguyên âm thay đổi chính âm thanh của từ, không chỉ trang trí một chữ cái.',
  id: 'Satu kata baru menunjukkan bagaimana tilde tertulis di atas vokal mengubah bunyi kata itu sendiri, bukan sekadar menghias huruf.',
  tr: 'Tek bir yeni kelime, bir sesli harf üzerindeki yazılı tildenin, bir harfi süslemekten öte, kelimenin sesini nasıl değiştirdiğini gösterir.',
  pl: 'Jedno nowe słowo pokazuje, jak pisemna tylda nad samogłoską zmienia samo brzmienie słowa, a nie tylko ozdabia literę.',
});

export const ES_EPISODE_01_SESSION_06_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать único и его форму única, а затем услышать, где именно падает ударение.',
  uk: 'Упізнати на слух, зрозуміти й точно написати único та його форму única, а потім почути, де саме падає наголос.',
  es: 'Recognize, understand, and write único and its form única, then hear exactly where the stress falls.',
  'pt-BR': 'Reconhecer de ouvido, entender e escrever corretamente único e sua forma única, depois ouvir onde exatamente cai o acento.',
  vi: 'Nghe ra, hiểu và viết đúng único cùng dạng única của nó, sau đó nghe được trọng âm rơi vào đâu chính xác.',
  id: 'Mengenali dari suara, memahami, dan menulis único serta bentuknya única dengan tepat, lalu mendengar di mana tepatnya tekanan jatuh.',
  tr: 'Único ve onun única biçimini duyup tanımak, anlamak ve doğru yazmak; ardından vurgunun tam olarak nereye düştüğünü duymak.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać único oraz jego formę única, a potem usłyszeć, gdzie dokładnie pada akcent.',
});

const CONCEPT_BODY = L({
  ru: 'В большинстве испанских слов ударение падает по общему правилу и не требует специального знака: fácil и rápido — исключения из этого правила, поэтому там и стоит тильда над á. Único устроено так же: тильда над ú показывает, что ударение падает именно на первый слог, вопреки тому, как звучало бы слово без знака. Тильду ставят, чтобы показать, где падает ударение, когда оно отклоняется от общего правила — тильда здесь не украшение, а часть смысла: без неё слово читалось бы совсем иначе, с ударением на другом слоге. Испанское письмо специально помечает такие исключения, чтобы читающий точно знал, куда падает ударение, ещё до того, как услышит слово вслух.',
  uk: 'У більшості іспанських слів наголос падає за загальним правилом і не потребує спеціального знака: fácil і rápido — винятки з цього правила, тому там і стоїть тильда над á. Único влаштоване так само: тильда над ú показує, що наголос падає саме на перший склад, всупереч тому, як звучало б слово без знака. Тильду ставлять, щоб показати, де падає наголос, коли він відхиляється від загального правила — тильда тут не прикраса, а частина сенсу: без неї слово читалося б зовсім інакше, з наголосом на іншому складі. Іспанське письмо спеціально позначає такі винятки, щоб той, хто читає, точно знав, куди падає наголос, ще до того, як почує слово вголос.',
  es: 'In most Spanish words, the stress falls according to the general rule and needs no special mark: fácil and rápido are exceptions to that rule, which is why they carry the tilde over á. Único works the same way: the tilde over ú shows that the stress falls exactly on the first syllable, against how the word would sound without the mark. The tilde is placed to show where the stress falls when it deviates from the general rule. It is not decoration, it is part of the meaning: without it, the word would be read quite differently.',
  'pt-BR': 'Na maioria das palavras em espanhol, o acento cai conforme a regra geral e não precisa de sinal especial: fácil e rápido são exceções a essa regra, por isso levam o acento sobre á. Único funciona do mesmo jeito: o til sobre ú mostra que o acento cai exatamente na primeira sílaba, ao contrário de como a palavra soaria sem o sinal. O til é colocado para mostrar onde cai o acento quando ele foge da regra geral. Não é decoração, é parte do significado: sem ele, a palavra seria lida de um jeito bem diferente.',
  vi: 'Ở hầu hết các từ tiếng Tây Ban Nha, trọng âm rơi theo quy tắc chung và không cần dấu đặc biệt: fácil và rápido là ngoại lệ của quy tắc đó, vì vậy chúng mang dấu trên á. Único hoạt động tương tự: dấu ngã trên ú cho thấy trọng âm rơi đúng vào âm tiết đầu tiên, trái ngược với cách từ này sẽ được đọc nếu không có dấu. Dấu ngã được đặt để cho thấy trọng âm rơi ở đâu khi nó lệch khỏi quy tắc chung — nó không phải trang trí ở đây, nó là một phần của nghĩa: nếu không có nó, từ sẽ được đọc rất khác, với trọng âm ở âm tiết khác. Chữ viết tiếng Tây Ban Nha đánh dấu riêng những ngoại lệ này để người đọc biết chính xác trọng âm rơi ở đâu, ngay cả trước khi nghe từ đó được nói ra.',
  id: 'Pada kebanyakan kata bahasa Spanyol, tekanan jatuh sesuai aturan umum dan tidak memerlukan tanda khusus: fácil dan rápido adalah pengecualian dari aturan itu, itulah sebabnya keduanya memiliki tilde di atas á. Único bekerja dengan cara yang sama: tilde di atas ú menunjukkan bahwa tekanan jatuh tepat pada suku kata pertama, berlawanan dengan bagaimana kata itu akan terdengar tanpa tanda tersebut. Tilde diletakkan untuk menunjukkan di mana tekanan jatuh ketika menyimpang dari aturan umum. Itu bukan hiasan, melainkan bagian dari makna: tanpanya, kata itu akan dibaca dengan cara yang sangat berbeda.',
  tr: 'Çoğu İspanyolca kelimede vurgu genel kurala göre düşer ve özel bir işarete gerek duymaz: fácil ve rápido bu kuralın istisnalarıdır, bu yüzden á üzerinde tilde taşırlar. Único da aynı şekilde çalışır: ú üzerindeki tilde, vurgunun tam olarak ilk heceye düştüğünü gösterir, kelimenin işaretsiz nasıl duyulacağının aksine. Tilde, vurgunun nereye düştüğünü göstermek için konur. Buradaki tilde bir süs değildir, anlamın bir parçasıdır: onsuz, kelime çok farklı okunurdu, vurgu başka bir hecede olurdu.',
  pl: 'W większości hiszpańskich słów akcent pada zgodnie z ogólną zasadą i nie wymaga specjalnego znaku: fácil i rápido są wyjątkami od tej zasady, dlatego mają tyldę nad á. Único działa tak samo: tylda nad ú pokazuje, że akcent pada dokładnie na pierwszą sylabę, wbrew temu, jak słowo brzmiałoby bez znaku. Tyldę stawia się, aby pokazać, gdzie pada akcent, gdy odbiega on od ogólnej zasady — tylda tutaj nie jest ozdobą, jest częścią znaczenia: bez niej słowo czytałoby się zupełnie inaczej, z akcentem na innej sylabie. Hiszpańskie pismo specjalnie oznacza takie wyjątki, aby czytający dokładnie wiedział, gdzie pada akcent, jeszcze zanim usłyszy słowo na głos.',
});

const FORMULA_BODY = L({
  ru: 'Формула согласования та же, что и для других прилагательных: концовка -o для мужского рода, концовка -a для женского. Único пишет -o, única меняет ровно одну букву на -a — а тильда над ú остаётся на месте в обеих формах, потому что она отмечает ударение, а не род. Ответ прост: тильда над ú в único и única никогда не исчезает, сколько бы ни менялась концовка слова. Единственное, что меняется при переходе к женскому роду, — это последняя буква слова.',
  uk: 'Формула узгодження та сама, що й для інших прикметників: закінчення -o для чоловічого роду, закінчення -a для жіночого. Único пише -o, única змінює рівно одну літеру на -a — а тильда над ú лишається на місці в обох формах, бо вона позначає наголос, а не рід. Відповідь проста: тильда над ú в único та única ніколи не зникає, скільки б не змінювалося закінчення слова. Єдине, що змінюється при переході до жіночого роду, — це остання літера слова.',
  es: 'The agreement formula is the same as for other adjectives: the ending -o for masculine, the ending -a for feminine. Único writes -o, única changes exactly one letter to -a. When único changes to única, the tilde over ú stays in place — it stays in place in both forms because it marks the stress, not the gender. The answer is simple: the tilde over ú in único and única never disappears, no matter how the ending of the word changes.',
  'pt-BR': 'A fórmula de concordância é a mesma de outros adjetivos: a terminação -o para masculino, a terminação -a para feminino. Único escreve -o, única muda exatamente uma letra para -a — e o til sobre ú permanece no lugar nas duas formas, porque ele marca o acento, não o gênero. A resposta é simples: o til sobre ú em único e única nunca desaparece, não importa como a terminação da palavra mude. A única coisa que muda ao passar para a forma feminina é a última letra da palavra.',
  vi: 'Công thức hòa hợp giống như các tính từ khác: đuôi -o cho giống đực, đuôi -a cho giống cái. Único viết -o, única chỉ đổi đúng một chữ cái thành -a — còn dấu ngã trên ú vẫn giữ nguyên ở cả hai dạng, vì nó đánh dấu trọng âm, không phải giống. Câu trả lời rất đơn giản: dấu ngã trên ú trong único và única không bao giờ biến mất, dù đuôi từ có thay đổi thế nào. Điều duy nhất thay đổi khi chuyển sang dạng giống cái là chữ cái cuối cùng của từ.',
  id: 'Rumus kesesuaian sama seperti kata sifat lain: akhiran -o untuk maskulin, akhiran -a untuk feminin. Único menulis -o, única mengubah tepat satu huruf menjadi -a — dan tilde di atas ú tetap di tempatnya di kedua bentuk, karena itu menandai tekanan, bukan gender. Jawabannya sederhana: tilde di atas ú dalam único dan única tidak pernah hilang, tidak peduli bagaimana akhiran kata itu berubah. Satu-satunya hal yang berubah saat beralih ke bentuk feminin adalah huruf terakhir kata itu.',
  tr: 'Uyum formülü diğer sıfatlarla aynıdır: eril için -o son eki, dişil için -a son eki. Único -o yazar, única ise tam olarak tek bir harfi -a olarak değiştirir — ú üzerindeki tilde her iki biçimde de yerinde kalır, çünkü cinsiyeti değil vurguyu işaretler. Cevap basittir: único ve única’daki ú üzerindeki tilde, kelimenin sonu nasıl değişirse değişsin asla kaybolmaz. Dişil biçime geçerken değişen tek şey kelimenin son harfidir.',
  pl: 'Formuła zgodności jest taka sama jak dla innych przymiotników: końcówka -o dla rodzaju męskiego, końcówka -a dla żeńskiego. Único pisze -o, única zmienia dokładnie jedną literę na -a — a tylda nad ú pozostaje na miejscu w obu formach, ponieważ oznacza akcent, a nie rodzaj. Odpowiedź jest prosta: tylda nad ú w único i única nigdy nie znika, niezależnie od tego, jak zmienia się końcówka słowa. Jedyne, co zmienia się przy przejściu do formy żeńskiej, to ostatnia litera słowa.',
});

const TRAP_BODY = L({
  ru: 'Легко забыть тильду и написать unico вместо único, полагая, что это мелочь. Но без тильды слово читалось бы иначе: ударение упало бы на другой слог, как в обычных испанских словах без специального знака. Unido — ещё одна ловушка: оно похоже по написанию, но это совсем другое слово с другим согласным в середине и другим ударением, не связанное по значению с único. Проверка простая: если признак означает «единственный, неповторимый», нужна тильда над ú — único или única; без тильды смысл и звучание слова меняются.',
  uk: 'Легко забути тильду і написати unico замість único, вважаючи це дрібницею. Але без тильди слово читалося б інакше: наголос упав би на інший склад, як у звичайних іспанських словах без спеціального знака. Unido — ще одна пастка: воно схоже за написанням, але це зовсім інше слово з іншим приголосним усередині й іншим наголосом, не пов’язане за значенням з único. Перевірка проста: якщо ознака означає «єдиний, неповторний», потрібна тильда над ú — único чи única; без тильди сенс і звучання слова змінюються.',
  es: 'It is easy to forget the tilde and write unico instead of único, thinking it is a minor detail. But without the tilde the word would be read differently: the stress would fall on a different syllable, as in ordinary Spanish words with no special mark. Unido is another trap: it looks similar in spelling, but it is a completely different word with a different consonant in the middle and a different stress, unrelated in meaning to único. The check is simple: if the quality means "unique, one of a kind", the tilde over ú is needed — único or única; without the tilde, the meaning and sound of the word change.',
  'pt-BR': 'É fácil esquecer o til e escrever unico em vez de único, achando que é um detalhe pequeno. Mas sem o til a palavra seria lida diferente: o acento cairia numa sílaba diferente, como em palavras espanholas comuns sem sinal especial. Unido é outra armadilha: parece semelhante na escrita, mas é uma palavra completamente diferente, com uma consoante diferente no meio e um acento diferente, sem relação de significado com único. A checagem é simples: se a qualidade significa "único, sem igual", o til sobre ú é necessário — único ou única; sem o til, o significado e o som da palavra mudam.',
  vi: 'Dễ quên dấu ngã và viết unico thay vì único, nghĩ rằng đó là chi tiết nhỏ nhặt. Nhưng nếu không có dấu ngã, từ sẽ được đọc khác: trọng âm sẽ rơi vào âm tiết khác, như trong các từ tiếng Tây Ban Nha thông thường không có dấu đặc biệt. Unido là một cái bẫy khác: nó trông giống về cách viết, nhưng đó là một từ hoàn toàn khác với phụ âm khác ở giữa và trọng âm khác, không liên quan về nghĩa với único. Cách kiểm tra đơn giản: nếu đặc điểm nghĩa là "duy nhất, không gì sánh bằng", cần dấu ngã trên ú — único hoặc única; nếu không có dấu ngã, nghĩa và âm thanh của từ thay đổi.',
  id: 'Mudah lupa tilde dan menulis unico alih-alih único, menganggapnya detail kecil. Tetapi tanpa tilde kata itu akan dibaca berbeda: tekanan akan jatuh pada suku kata lain, seperti pada kata-kata bahasa Spanyol biasa tanpa tanda khusus. Unido adalah jebakan lain: terlihat mirip dalam ejaan, tetapi itu adalah kata yang sama sekali berbeda dengan konsonan berbeda di tengah dan tekanan berbeda, tidak berhubungan maknanya dengan único. Pengecekannya sederhana: jika sifatnya berarti "unik, satu-satunya", tilde di atas ú diperlukan — único atau única; tanpa tilde, makna dan bunyi kata itu berubah.',
  tr: 'Tildeyi unutup único yerine unico yazmak kolaydır, bunu küçük bir ayrıntı sanarak. Ama tilde olmadan kelime farklı okunurdu: vurgu, özel işareti olmayan sıradan İspanyolca kelimelerde olduğu gibi başka bir heceye düşerdi. Unido başka bir tuzaktır: yazılışta benzer görünür, ama ortasında farklı bir ünsüz ve farklı bir vurgu olan, único ile anlamca ilgisi olmayan tamamen farklı bir kelimedir. Kontrol basittir: nitelik "eşsiz, tek bir tane" anlamına geliyorsa, ú üzerinde tilde gerekir — único ya da única; tilde olmadan kelimenin anlamı ve sesi değişir.',
  pl: 'Łatwo zapomnieć o tyldzie i napisać unico zamiast único, myśląc, że to drobiazg. Ale bez tyldy słowo czytałoby się inaczej: akcent padłby na inną sylabę, jak w zwykłych hiszpańskich słowach bez specjalnego znaku. Unido to kolejna pułapka: wygląda podobnie w pisowni, ale to zupełnie inne słowo z inną spółgłoską w środku i innym akcentem, niezwiązane znaczeniowo z único. Sprawdzenie jest proste: jeśli cecha znaczy „jedyny, niepowtarzalny”, potrzebna jest tylda nad ú — único lub única; bez tyldy znaczenie i brzmienie słowa się zmieniają.',
});

export const ES_EPISODE_01_SESSION_06_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Тильда — часть смысла, не украшение',
      uk: 'Тильда — частина сенсу, не прикраса',
      es: 'The tilde is part of the meaning, not decoration',
      'pt-BR': 'O til é parte do significado, não decoração',
      vi: 'Dấu ngã là một phần của nghĩa, không phải trang trí',
      id: 'Tilde adalah bagian dari makna, bukan hiasan',
      tr: 'Tilde anlamın bir parçasıdır, süs değil',
      pl: 'Tylda to część znaczenia, nie ozdoba',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'В большинстве испанских слов ударение падает по общему правилу и не требует специального знака: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' и ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' — исключения из этого правила, поэтому там и стоит тильда над á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' устроено так же: тильда над ú показывает, что ударение падает именно на первый слог, вопреки тому, как звучало бы слово без знака. Тильду ставят, чтобы показать, где падает ударение, когда оно отклоняется от общего правила — тильда здесь не украшение, а часть смысла: без неё слово читалось бы совсем иначе, с ударением на другом слоге. Испанское письмо специально помечает такие исключения, чтобы читающий точно знал, куда падает ударение, ещё до того, как услышит слово вслух.', semantic: 'explanation' }),
      uk: R({ text: 'У більшості іспанських слів наголос падає за загальним правилом і не потребує спеціального знака: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' і ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' — винятки з цього правила, тому там і стоїть тильда над á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' влаштоване так само: тильда над ú показує, що наголос падає саме на перший склад, всупереч тому, як звучало б слово без знака. Тильду ставлять, щоб показати, де падає наголос, коли він відхиляється від загального правила — тильда тут не прикраса, а частина сенсу: без неї слово читалося б зовсім інакше, з наголосом на іншому складі. Іспанське письмо спеціально позначає такі винятки, щоб той, хто читає, точно знав, куди падає наголос, ще до того, як почує слово вголос.', semantic: 'explanation' }),
      es: R({ text: 'In most Spanish words, the stress falls according to the general rule and needs no special mark: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' and ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' are exceptions to that rule, which is why they carry the tilde over á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' works the same way: the tilde over ú shows that the stress falls exactly on the first syllable, against how the word would sound without the mark. The tilde is placed to show where the stress falls when it deviates from the general rule. It is not decoration, it is part of the meaning: without it, the word would be read quite differently.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Na maioria das palavras em espanhol, o acento cai conforme a regra geral e não precisa de sinal especial: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' e ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' são exceções a essa regra, por isso levam o acento sobre á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' funciona do mesmo jeito: o til sobre ú mostra que o acento cai exatamente na primeira sílaba, ao contrário de como a palavra soaria sem o sinal. O til é colocado para mostrar onde cai o acento quando ele foge da regra geral. Não é decoração, é parte do significado: sem ele, a palavra seria lida de um jeito bem diferente.', semantic: 'explanation' }),
      vi: R({ text: 'Ở hầu hết các từ tiếng Tây Ban Nha, trọng âm rơi theo quy tắc chung và không cần dấu đặc biệt: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' và ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' là ngoại lệ của quy tắc đó, vì vậy chúng mang dấu trên á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' hoạt động tương tự: dấu ngã trên ú cho thấy trọng âm rơi đúng vào âm tiết đầu tiên, trái ngược với cách từ này sẽ được đọc nếu không có dấu. Dấu ngã được đặt để cho thấy trọng âm rơi ở đâu khi nó lệch khỏi quy tắc chung — nó không phải trang trí ở đây, nó là một phần của nghĩa: nếu không có nó, từ sẽ được đọc rất khác, với trọng âm ở âm tiết khác. Chữ viết tiếng Tây Ban Nha đánh dấu riêng những ngoại lệ này để người đọc biết chính xác trọng âm rơi ở đâu, ngay cả trước khi nghe từ đó được nói ra.', semantic: 'explanation' }),
      id: R({ text: 'Pada kebanyakan kata bahasa Spanyol, tekanan jatuh sesuai aturan umum dan tidak memerlukan tanda khusus: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' dan ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' adalah pengecualian dari aturan itu, itulah sebabnya keduanya memiliki tilde di atas á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' bekerja dengan cara yang sama: tilde di atas ú menunjukkan bahwa tekanan jatuh tepat pada suku kata pertama, berlawanan dengan bagaimana kata itu akan terdengar tanpa tanda tersebut. Tilde diletakkan untuk menunjukkan di mana tekanan jatuh ketika menyimpang dari aturan umum. Itu bukan hiasan, melainkan bagian dari makna: tanpanya, kata itu akan dibaca dengan cara yang sangat berbeda.', semantic: 'explanation' }),
      tr: R({ text: 'Çoğu İspanyolca kelimede vurgu genel kurala göre düşer ve özel bir işarete gerek duymaz: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' ve ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' bu kuralın istisnalarıdır, bu yüzden á üzerinde tilde taşırlar. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' da aynı şekilde çalışır: ú üzerindeki tilde, vurgunun tam olarak ilk heceye düştüğünü gösterir, kelimenin işaretsiz nasıl duyulacağının aksine. Tilde, vurgunun nereye düştüğünü göstermek için konur. Buradaki tilde bir süs değildir, anlamın bir parçasıdır: onsuz, kelime çok farklı okunurdu, vurgu başka bir hecede olurdu.', semantic: 'explanation' }),
      pl: R({ text: 'W większości hiszpańskich słów akcent pada zgodnie z ogólną zasadą i nie wymaga specjalnego znaku: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' i ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' są wyjątkami od tej zasady, dlatego mają tyldę nad á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' działa tak samo: tylda nad ú pokazuje, że akcent pada dokładnie na pierwszą sylabę, wbrew temu, jak słowo brzmiałoby bez znaku. Tyldę stawia się, aby pokazać, gdzie pada akcent, gdy odbiega on od ogólnej zasady — tylda tutaj nie jest ozdobą, jest częścią znaczenia: bez niej słowo czytałoby się zupełnie inaczej, z akcentem na innej sylabie. Hiszpańskie pismo specjalnie oznacza takie wyjątki, aby czytający dokładnie wiedział, gdzie pada akcent, jeszcze zanim usłyszy słowo na głos.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Зачем над буквой á или ú ставят тильду?',
        uk: 'Навіщо над літерою á чи ú ставлять тильду?',
        es: 'Why is a tilde placed over the letter á or ú?',
        'pt-BR': 'Por que se coloca um til sobre a letra á ou ú?',
        vi: 'Tại sao dấu ngã được đặt trên chữ á hoặc ú?',
        id: 'Mengapa tilde diletakkan di atas huruf á atau ú?',
        tr: 'Á veya ú harfinin üzerine neden tilde konur?',
        pl: 'Dlaczego nad literą á lub ú stawia się tyldę?',
      }),
      choices: [
        L({ ru: 'Чтобы показать, где падает ударение', uk: 'Щоб показати, де падає наголос', es: 'To show where the stress falls', 'pt-BR': 'Para mostrar onde cai o acento', vi: 'Để cho thấy trọng âm rơi ở đâu', id: 'Untuk menunjukkan di mana tekanan jatuh', tr: 'Vurgunun nereye düştüğünü göstermek için', pl: 'Aby pokazać, gdzie pada akcent' }),
        L({ ru: 'Просто для красоты письма', uk: 'Просто для краси письма', es: 'Just for the beauty of writing', 'pt-BR': 'Só pela beleza da escrita', vi: 'Chỉ để làm đẹp chữ viết', id: 'Hanya untuk keindahan tulisan', tr: 'Sadece yazının güzelliği için', pl: 'Tylko dla piękna pisma' }),
        L({ ru: 'Чтобы показать множественное число', uk: 'Щоб показати множину', es: 'To show plural number', 'pt-BR': 'Para mostrar o plural', vi: 'Để cho thấy số nhiều', id: 'Untuk menunjukkan bentuk jamak', tr: 'Çoğul sayıyı göstermek için', pl: 'Aby pokazać liczbę mnogą' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Тильда показывает, где падает ударение, если оно отклоняется от общего правила. Она не про красоту письма и не про множественное число.',
        uk: 'Тильда показує, де падає наголос, якщо він відхиляється від загального правила. Вона не про красу письма і не про множину.',
        es: 'The tilde shows where the stress falls when it deviates from the general rule. It is not about beauty of writing or plural number.',
        'pt-BR': 'O til mostra onde cai o acento quando ele foge da regra geral. Não é sobre beleza da escrita nem sobre o plural.',
        vi: 'Dấu ngã cho thấy trọng âm rơi ở đâu khi nó lệch khỏi quy tắc chung. Nó không liên quan đến vẻ đẹp chữ viết hay số nhiều.',
        id: 'Tilde menunjukkan di mana tekanan jatuh ketika menyimpang dari aturan umum. Ini bukan tentang keindahan tulisan atau bentuk jamak.',
        tr: 'Doğru cevap: tilde vurgunun nereye düştüğünü gösterir, çünkü kelime genel kuraldan saptığında okuyucunun bunu bilmesi gerekir. Yazının güzelliğiyle ya da çoğul sayıyla ilgisi yoktur — bunlar tildenin işlevi değildir.',
        pl: 'Tylda pokazuje, gdzie pada akcent, gdy odbiega on od ogólnej zasady. Nie chodzi o piękno pisma ani o liczbę mnogą.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Тильда остаётся при смене рода',
      uk: 'Тильда лишається при зміні роду',
      es: 'The tilde stays when gender changes',
      'pt-BR': 'O til permanece quando o gênero muda',
      vi: 'Dấu ngã vẫn còn khi đổi giống',
      id: 'Tilde tetap ada saat gender berubah',
      tr: 'Cinsiyet değişse de tilde kalır',
      pl: 'Tylda zostaje przy zmianie rodzaju',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула согласования та же, что и для других прилагательных: концовка -o для мужского рода, концовка -a для женского. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' пишет -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' меняет ровно одну букву на -a — а тильда над ú остаётся на месте в обеих формах, потому что она отмечает ударение, а не род. Ответ прост: тильда над ú в ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' и ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' никогда не исчезает, сколько бы ни менялась концовка слова. Единственное, что меняется при переходе к женскому роду, — это последняя буква слова.', semantic: 'explanation' }),
      uk: R({ text: 'Формула узгодження та сама, що й для інших прикметників: закінчення -o для чоловічого роду, закінчення -a для жіночого. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' пише -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' змінює рівно одну літеру на -a — а тильда над ú лишається на місці в обох формах, бо вона позначає наголос, а не рід. Відповідь проста: тильда над ú в ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' та ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' ніколи не зникає, скільки б не змінювалося закінчення слова. Єдине, що змінюється при переході до жіночого роду, — це остання літера слова.', semantic: 'explanation' }),
      es: R({ text: 'The agreement formula is the same as for other adjectives: the ending -o for masculine, the ending -a for feminine. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' writes -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' changes exactly one letter to -a. When ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' changes to ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ', the tilde over ú stays in place — it stays in place in both forms because it marks the stress, not the gender. The answer is simple: the tilde over ú in ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' and ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' never disappears, no matter how the ending of the word changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de concordância é a mesma de outros adjetivos: a terminação -o para masculino, a terminação -a para feminino. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' escreve -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' muda exatamente uma letra para -a — e o til sobre ú permanece no lugar nas duas formas, porque ele marca o acento, não o gênero. A resposta é simples: o til sobre ú em ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' e ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' nunca desaparece, não importa como a terminação da palavra mude. A única coisa que muda ao passar para a forma feminina é a última letra da palavra.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức hòa hợp giống như các tính từ khác: đuôi -o cho giống đực, đuôi -a cho giống cái. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' viết -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' chỉ đổi đúng một chữ cái thành -a — còn dấu ngã trên ú vẫn giữ nguyên ở cả hai dạng, vì nó đánh dấu trọng âm, không phải giống. Câu trả lời rất đơn giản: dấu ngã trên ú trong ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' và ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' không bao giờ biến mất, dù đuôi từ có thay đổi thế nào. Điều duy nhất thay đổi khi chuyển sang dạng giống cái là chữ cái cuối cùng của từ.', semantic: 'explanation' }),
      id: R({ text: 'Rumus kesesuaian sama seperti kata sifat lain: akhiran -o untuk maskulin, akhiran -a untuk feminin. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' menulis -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' mengubah tepat satu huruf menjadi -a — dan tilde di atas ú tetap di tempatnya di kedua bentuk, karena itu menandai tekanan, bukan gender. Jawabannya sederhana: tilde di atas ú dalam ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' tidak pernah hilang, tidak peduli bagaimana akhiran kata itu berubah. Satu-satunya hal yang berubah saat beralih ke bentuk feminin adalah huruf terakhir kata itu.', semantic: 'explanation' }),
      tr: R({ text: 'Uyum formülü diğer sıfatlarla aynıdır: eril için -o son eki, dişil için -a son eki. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' -o yazar, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' ise tam olarak tek bir harfi -a olarak değiştirir — ú üzerindeki tilde her iki biçimde de yerinde kalır, çünkü cinsiyeti değil vurguyu işaretler. Cevap basittir: ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' ve ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '’daki ú üzerindeki tilde, kelimenin sonu nasıl değişirse değişsin asla kaybolmaz. Dişil biçime geçerken değişen tek şey kelimenin son harfidir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła zgodności jest taka sama jak dla innych przymiotników: końcówka -o dla rodzaju męskiego, końcówka -a dla żeńskiego. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' pisze -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' zmienia dokładnie jedną literę na -a — a tylda nad ú pozostaje na miejscu w obu formach, ponieważ oznacza akcent, a nie rodzaj. Odpowiedź jest prosta: tylda nad ú w ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' i ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' nigdy nie znika, niezależnie od tego, jak zmienia się końcówka słowa. Jedyne, co zmienia się przy przejściu do formy żeńskiej, to ostatnia litera słowa.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что происходит с тильдой над ú, когда único меняется на única?',
        uk: 'Що відбувається з тильдою над ú, коли único змінюється на única?',
        es: 'What happens to the tilde over ú when único changes to única?',
        'pt-BR': 'O que acontece com o til sobre ú quando único muda para única?',
        vi: 'Điều gì xảy ra với dấu ngã trên ú khi único đổi thành única?',
        id: 'Apa yang terjadi pada tilde di atas ú saat único berubah menjadi única?',
        tr: 'Único, única’ya dönüştüğünde ú üzerindeki tildeye ne olur?',
        pl: 'Co dzieje się z tyldą nad ú, gdy único zmienia się na única?',
      }),
      choices: [
        L({ ru: 'Остаётся на месте', uk: 'Лишається на місці', es: 'It stays in place', 'pt-BR': 'Permanece no lugar', vi: 'Vẫn giữ nguyên', id: 'Tetap di tempatnya', tr: 'Yerinde kalır', pl: 'Pozostaje na miejscu' }),
        L({ ru: 'Исчезает вместе с -o', uk: 'Зникає разом з -o', es: 'It disappears along with -o', 'pt-BR': 'Desaparece junto com -o', vi: 'Biến mất cùng với -o', id: 'Hilang bersama -o', tr: '-o ile birlikte kaybolur', pl: 'Znika razem z -o' }),
        L({ ru: 'Переходит на другую букву', uk: 'Переходить на іншу літеру', es: 'It moves to a different letter', 'pt-BR': 'Passa para outra letra', vi: 'Chuyển sang chữ cái khác', id: 'Berpindah ke huruf lain', tr: 'Başka bir harfe geçer', pl: 'Przenosi się na inną literę' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Тильда над ú остаётся на месте — она отмечает ударение, которое не меняется по роду. Меняется только концовка слова.',
        uk: 'Тильда над ú лишається на місці — вона позначає наголос, який не змінюється за родом. Змінюється лише закінчення слова.',
        es: 'The tilde over ú stays in place — it marks the stress, which does not change by gender. Only the ending of the word changes.',
        'pt-BR': 'O til sobre ú permanece no lugar — ele marca o acento, que não muda por gênero. Só a terminação da palavra muda.',
        vi: 'Dấu ngã trên ú vẫn giữ nguyên — nó đánh dấu trọng âm, thứ không đổi theo giống. Chỉ đuôi của từ thay đổi.',
        id: 'Tilde di atas ú tetap di tempatnya — itu menandai tekanan, yang tidak berubah menurut gender. Hanya akhiran kata yang berubah.',
        tr: 'Ú üzerindeki tilde yerinde kalır — cinsiyete göre değişmeyen vurguyu işaretler. Yalnızca kelimenin sonu değişir.',
        pl: 'Tylda nad ú pozostaje na miejscu — oznacza akcent, który nie zmienia się przez rodzaj. Zmienia się tylko końcówka słowa.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не забыть тильду, не спутать с unido',
      uk: 'Не забути тильду, не сплутати з unido',
      es: 'Do not drop the tilde, do not confuse with unido',
      'pt-BR': 'Não esquecer o til, não confundir com unido',
      vi: 'Đừng quên dấu ngã, đừng nhầm với unido',
      id: 'Jangan lupakan tilde, jangan tertukar dengan unido',
      tr: 'Tildeyi unutmayın, unido ile karıştırmayın',
      pl: 'Nie zapomnij tyldy, nie myl z unido',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Легко забыть тильду и написать ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ', полагая, что это мелочь. Но без тильды слово читалось бы иначе: ударение упало бы на другой слог, как в обычных испанских словах без специального знака. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' — ещё одна ловушка: оно похоже по написанию, но это совсем другое слово с другим согласным в середине и другим ударением, не связанное по значению с ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: '. Если признак означает «единственный, неповторимый», нужна тильда над ú — ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' или ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '; без тильды смысл и звучание слова меняются.', semantic: 'explanation' }),
      uk: R({ text: 'Легко забути тильду і написати ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ', вважаючи це дрібницею. Але без тильди слово читалося б інакше: наголос упав би на інший склад, як у звичайних іспанських словах без спеціального знака. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' — ще одна пастка: воно схоже за написанням, але це зовсім інше слово з іншим приголосним усередині й іншим наголосом, не пов’язане за значенням з ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: '. Якщо ознака означає «єдиний, неповторний», потрібна тильда над ú — ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' чи ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '; без тильди сенс і звучання слова змінюються.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to forget the tilde and write ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ', thinking it is a minor detail. But without the tilde the word would be read differently: the stress would fall on a different syllable, as in ordinary Spanish words with no special mark. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' is another trap: it looks similar in spelling, but it is a completely different word with a different consonant in the middle and a different stress, unrelated in meaning to ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: '. If the quality means "unique, one of a kind", the tilde over ú is needed — ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' or ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '; without the tilde, the meaning and sound of the word change.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil esquecer o til e escrever ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ', achando que é um detalhe pequeno. Mas sem o til a palavra seria lida diferente: o acento cairia numa sílaba diferente, como em palavras espanholas comuns sem sinal especial. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' é outra armadilha: parece semelhante na escrita, mas é uma palavra completamente diferente, com uma consoante diferente no meio e um acento diferente, sem relação de significado com ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: '. Se a qualidade significa "único, sem igual", o til sobre ú é necessário — ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' ou ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '; sem o til, o significado e o som da palavra mudam.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ quên dấu ngã và viết ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ', nghĩ rằng đó là chi tiết nhỏ nhặt. Nhưng nếu không có dấu ngã, từ sẽ được đọc khác: trọng âm sẽ rơi vào âm tiết khác, như trong các từ tiếng Tây Ban Nha thông thường không có dấu đặc biệt. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' là một cái bẫy khác: nó trông giống về cách viết, nhưng đó là một từ hoàn toàn khác với phụ âm khác ở giữa và trọng âm khác, không liên quan về nghĩa với ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: '. Nếu đặc điểm nghĩa là "duy nhất, không gì sánh bằng", cần dấu ngã trên ú — ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' hoặc ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '; nếu không có dấu ngã, nghĩa và âm thanh của từ thay đổi.', semantic: 'explanation' }),
      id: R({ text: 'Mudah lupa tilde dan menulis ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ', menganggapnya detail kecil. Tetapi tanpa tilde kata itu akan dibaca berbeda: tekanan akan jatuh pada suku kata lain, seperti pada kata-kata bahasa Spanyol biasa tanpa tanda khusus. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' adalah jebakan lain: terlihat mirip dalam ejaan, tetapi itu adalah kata yang sama sekali berbeda dengan konsonan berbeda di tengah dan tekanan berbeda, tidak berhubungan maknanya dengan ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: '. Jika sifatnya berarti "unik, satu-satunya", tilde di atas ú diperlukan — ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' atau ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '; tanpa tilde, makna dan bunyi kata itu berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Tildeyi unutup ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' yazmak kolaydır, bunu küçük bir ayrıntı sanarak. Ama tilde olmadan kelime farklı okunurdu: vurgu, özel işareti olmayan sıradan İspanyolca kelimelerde olduğu gibi başka bir heceye düşerdi. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' başka bir tuzaktır: yazılışta benzer görünür, ama ortasında farklı bir ünsüz ve farklı bir vurgu olan, ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' ile anlamca ilgisi olmayan tamamen farklı bir kelimedir. Nitelik "eşsiz, tek bir tane" anlamına geliyorsa, ú üzerinde tilde gerekir — ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' ya da ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '; tilde olmadan kelimenin anlamı ve sesi değişir.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo zapomnieć o tyldzie i napisać ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ', myśląc, że to drobiazg. Ale bez tyldy słowo czytałoby się inaczej: akcent padłby na inną sylabę, jak w zwykłych hiszpańskich słowach bez specjalnego znaku. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' to kolejna pułapka: wygląda podobnie w pisowni, ale to zupełnie inne słowo z inną spółgłoską w środku i innym akcentem, niezwiązane znaczeniowo z ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: '. Jeśli cecha znaczy „jedyny, niepowtarzalny”, potrzebna jest tylda nad ú — ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' lub ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '; bez tyldy znaczenie i brzmienie słowa się zmieniają.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно написать «единственный» (мужской род)?',
        uk: 'Як правильно написати «єдиний» (чоловічий рід)?',
        es: 'How do you correctly spell "unique" (masculine)?',
        'pt-BR': 'Como se escreve corretamente "único" (masculino)?',
        vi: 'Viết đúng "duy nhất" (giống đực) như thế nào?',
        id: 'Bagaimana cara mengeja "unik" dengan benar (maskulin)?',
        tr: '"Eşsiz" (eril) doğru nasıl yazılır?',
        pl: 'Jak poprawnie napisać „jedyny” (rodzaj męski)?',
      }),
      choices: [
        L({ ru: 'único', uk: 'único', es: 'único', 'pt-BR': 'único', vi: 'único', id: 'único', tr: 'único', pl: 'único' }),
        L({ ru: 'unico', uk: 'unico', es: 'unico', 'pt-BR': 'unico', vi: 'unico', id: 'unico', tr: 'unico', pl: 'unico' }),
        L({ ru: 'unido', uk: 'unido', es: 'unido', 'pt-BR': 'unido', vi: 'unido', id: 'unido', tr: 'unido', pl: 'unido' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Único пишется с тильдой над ú. Unico без тильды звучал бы иначе, а unido — совсем другое слово.',
        uk: 'Único пишеться з тильдою над ú. Unico без тильди звучав би інакше, а unido — зовсім інше слово.',
        es: 'Único is written with a tilde over ú. Unico without the tilde would sound different, and unido is a completely different word.',
        'pt-BR': 'Único é escrito com til sobre ú. Unico sem til soaria diferente, e unido é uma palavra completamente diferente.',
        vi: 'Único được viết với dấu ngã trên ú. Unico không có dấu ngã sẽ nghe khác, và unido là một từ hoàn toàn khác.',
        id: 'Único ditulis dengan tilde di atas ú. Unico tanpa tilde akan terdengar berbeda, dan unido adalah kata yang sama sekali berbeda.',
        tr: 'Único, ú üzerinde tilde ile yazılır. Tildesiz unico farklı duyulurdu, unido ise tamamen farklı bir kelimedir.',
        pl: 'Único pisze się z tyldą nad ú. Unico bez tyldy brzmiałoby inaczej, a unido to zupełnie inne słowo.',
      }),
    },
  },
];
