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
// рисунок.
//
// зачем тело переписано короче исходного черновика (владелец, 2026-08-27,
// тот же класс правки, что и в сессиях 3-5): реальный гейт
// (learning_content_quality_gate_v1.ts) держит верхний потолок 320 знаков /
// 4 предложения; первый черновик этого файла был раздут до ~500-570 знаков на
// локаль и валил бы intro_body_overloaded. Переписано короче без потери
// concept→formula→trap структуры; тело дословно содержит формулировку
// правильного ответа вопроса (intro_question_not_grounded).
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
  ru: 'Fácil и rápido — исключения, ударение отклоняется от общего правила, поэтому там стоит тильда над á. Único устроено так же: тильда над ú показывает, где падает ударение. Это не украшение, а часть смысла: без неё слово читалось бы иначе.',
  uk: 'Fácil і rápido — винятки, наголос відхиляється від загального правила, тому там стоїть тильда над á. Único влаштоване так само: тильда над ú показує, де падає наголос. Це не прикраса, а частина сенсу: без неї слово читалося б інакше.',
  es: 'Fácil and rápido are exceptions, the stress deviates from the general rule, which is why they carry the tilde over á. Único works the same way: the tilde shows where the stress falls. It is not decoration, it is part of the meaning: without it, the word would be read differently.',
  'pt-BR': 'Fácil e rápido são exceções, o acento foge da regra geral, por isso levam o til sobre á. Único funciona do mesmo jeito: o til mostra onde cai o acento. Não é decoração, é parte do significado: sem ele, a palavra seria lida diferente.',
  vi: 'Fácil và rápido là ngoại lệ, trọng âm lệch khỏi quy tắc chung, vì vậy chúng mang dấu trên á. Único hoạt động tương tự: dấu ngã cho thấy trọng âm rơi ở đâu. Nó không phải trang trí, nó là một phần của nghĩa: nếu không có nó, từ sẽ đọc khác đi.',
  id: 'Fácil dan rápido adalah pengecualian, tekanan menyimpang dari aturan umum, itulah sebabnya keduanya memiliki tilde di atas á. Único bekerja dengan cara yang sama: tilde menunjukkan di mana tekanan jatuh. Itu bukan hiasan, melainkan bagian dari makna: tanpanya, kata itu akan dibaca berbeda.',
  tr: 'Fácil ve rápido istisnadır, vurgu genel kuraldan sapar, bu yüzden á üzerinde tilde taşırlar. Único da aynı şekilde çalışır: tilde vurgunun nereye düştüğünü gösterir. Bu bir süs değildir, anlamın bir parçasıdır: onsuz, kelime farklı okunurdu.',
  pl: 'Fácil i rápido to wyjątki, akcent odbiega od ogólnej zasady, dlatego mają tyldę nad á. Único działa tak samo: tylda pokazuje, gdzie pada akcent. To nie ozdoba, to część znaczenia: bez niej słowo czytałoby się inaczej.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же: -o для мужского рода, -a для женского. Único пишет -o, única — -a, а тильда над ú остаётся на месте в обеих формах. Ответ прост: тильда над ú никогда не исчезает, сколько бы концовка ни менялась.',
  uk: 'Формула та сама: -o для чоловічого роду, -a для жіночого. Único пише -o, única — -a, а тильда над ú лишається на місці в обох формах. Відповідь проста: тильда над ú ніколи не зникає, скільки б закінчення не змінювалося.',
  es: 'The formula is the same: -o for masculine, -a for feminine. Único writes -o, única writes -a, and the tilde over ú stays in place in both forms. The answer is simple: the tilde over ú never disappears, no matter how the ending changes.',
  'pt-BR': 'A fórmula é a mesma: -o para masculino, -a para feminino. Único escreve -o, única escreve -a, e o til sobre ú permanece nas duas formas. A resposta é simples: o til sobre ú nunca desaparece, não importa como a terminação mude.',
  vi: 'Công thức giống nhau: -o cho giống đực, -a cho giống cái. Único viết -o, única viết -a, còn dấu ngã trên ú vẫn giữ nguyên ở cả hai dạng. Câu trả lời rất đơn giản: dấu ngã trên ú không bao giờ biến mất, dù đuôi có thay đổi thế nào.',
  id: 'Rumusnya sama: -o untuk maskulin, -a untuk feminin. Único menulis -o, única menulis -a, dan tilde di atas ú tetap di tempatnya di kedua bentuk. Jawabannya sederhana: tilde di atas ú tidak pernah hilang, tidak peduli bagaimana akhiran berubah.',
  tr: 'Formül aynıdır: eril için -o, dişil için -a. Único -o yazar, única -a yazar, ú üzerindeki tilde her iki biçimde de yerinde kalır. Cevap basittir: ú üzerindeki tilde, son nasıl değişirse değişsin asla kaybolmaz.',
  pl: 'Formuła jest taka sama: -o dla rodzaju męskiego, -a dla żeńskiego. Único pisze -o, única pisze -a, a tylda nad ú pozostaje na miejscu w obu formach. Odpowiedź jest prosta: tylda nad ú nigdy nie znika, niezależnie od tego, jak zmienia się końcówka.',
});

const TRAP_BODY = L({
  ru: 'Легко забыть тильду и написать unico вместо único — но без тильды ударение упало бы на другой слог. Unido — ещё одна ловушка: другое слово, не связанное по значению. Проверка: «единственный» — это único или única, с тильдой над ú.',
  uk: 'Легко забути тильду і написати unico замість único — але без тильди наголос упав би на інший склад. Unido — ще одна пастка: інше слово, не пов’язане за значенням. Перевірка: «єдиний» — це único чи única, з тильдою над ú.',
  es: 'It is easy to forget the tilde and write unico instead of único — but without the tilde, the stress would fall on a different syllable. Unido is another trap: a different word, unrelated in meaning. The check: "unique" is único or única, with the tilde over ú.',
  'pt-BR': 'É fácil esquecer o til e escrever unico em vez de único — mas sem o til o acento cairia numa sílaba diferente. Unido é outra armadilha: outra palavra, sem relação de significado. A checagem: "único" é único ou única, com o til sobre ú.',
  vi: 'Dễ quên dấu ngã và viết unico thay vì único — nhưng nếu không có dấu ngã, trọng âm sẽ rơi vào âm tiết khác. Unido là một cái bẫy khác: từ khác, không liên quan về nghĩa. Cách kiểm tra: "duy nhất" là único hoặc única, có dấu ngã trên ú.',
  id: 'Mudah lupa tilde dan menulis unico alih-alih único — tetapi tanpa tilde tekanan akan jatuh pada suku kata lain. Unido adalah jebakan lain: kata lain, tidak berhubungan maknanya. Pengecekan: "unik" adalah único atau única, dengan tilde di atas ú.',
  tr: 'Tildeyi unutup único yerine unico yazmak kolaydır — ama tilde olmadan vurgu başka bir heceye düşerdi. Unido başka bir tuzaktır: anlamca ilgisiz başka bir kelime. Kontrol: "eşsiz" único ya da única\'dır, ú üzerinde tilde ile.',
  pl: 'Łatwo zapomnieć o tyldzie i napisać unico zamiast único — ale bez tyldy akcent padłby na inną sylabę. Unido to kolejna pułapka: inne słowo, niezwiązane znaczeniowo. Sprawdzenie: „jedyny” to único lub única, z tyldą nad ú.',
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
      ru: R({ text: 'Fácil', semantic: 'targetWrong' }, { text: ' и ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' — исключения, ударение отклоняется от общего правила, поэтому там стоит тильда над á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' устроено так же: тильда нужна, ', semantic: 'explanation' }, { text: 'чтобы показать, где падает ударение', semantic: 'targetCorrect' }, { text: '. Это не украшение, а часть смысла: без неё слово читалось бы иначе.', semantic: 'explanation' }),
      uk: R({ text: 'Fácil', semantic: 'targetWrong' }, { text: ' і ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' — винятки, наголос відхиляється від загального правила, тому там стоїть тильда над á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' влаштоване так само: тильда потрібна, ', semantic: 'explanation' }, { text: 'щоб показати, де падає наголос', semantic: 'targetCorrect' }, { text: '. Це не прикраса, а частина сенсу: без неї слово читалося б інакше.', semantic: 'explanation' }),
      es: R({ text: 'Fácil', semantic: 'targetWrong' }, { text: ' and ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' are exceptions, the stress deviates from the general rule, which is why they carry the tilde over á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' works the same way: ', semantic: 'explanation' }, { text: 'to show where the stress falls', semantic: 'targetCorrect' }, { text: ' — that is the tilde\'s job. It is not decoration, it is part of the meaning: without it, the word would be read differently.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Fácil', semantic: 'targetWrong' }, { text: ' e ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' são exceções, o acento foge da regra geral, por isso levam o til sobre á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' funciona do mesmo jeito: o til serve ', semantic: 'explanation' }, { text: 'para mostrar onde cai o acento', semantic: 'targetCorrect' }, { text: '. Não é decoração, é parte do significado: sem ele, a palavra seria lida diferente.', semantic: 'explanation' }),
      vi: R({ text: 'Fácil', semantic: 'targetWrong' }, { text: ' và ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' là ngoại lệ, trọng âm lệch khỏi quy tắc chung, vì vậy chúng mang dấu trên á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' hoạt động tương tự: dấu ngã ', semantic: 'explanation' }, { text: 'để cho thấy trọng âm rơi ở đâu', semantic: 'targetCorrect' }, { text: '. Nó không phải trang trí, nó là một phần của nghĩa: nếu không có nó, từ sẽ đọc khác đi.', semantic: 'explanation' }),
      id: R({ text: 'Fácil', semantic: 'targetWrong' }, { text: ' dan ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' adalah pengecualian, tekanan menyimpang dari aturan umum, itulah sebabnya keduanya memiliki tilde di atas á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' bekerja dengan cara yang sama: tilde ada ', semantic: 'explanation' }, { text: 'untuk menunjukkan di mana tekanan jatuh', semantic: 'targetCorrect' }, { text: '. Itu bukan hiasan, melainkan bagian dari makna: tanpanya, kata itu akan dibaca berbeda.', semantic: 'explanation' }),
      tr: R({ text: 'Fácil', semantic: 'targetWrong' }, { text: ' ve ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' istisnadır, vurgu genel kuraldan sapar, bu yüzden á üzerinde tilde taşırlar. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' da aynı şekilde çalışır: tilde, ', semantic: 'explanation' }, { text: 'vurgunun nereye düştüğünü göstermek için', semantic: 'targetCorrect' }, { text: ' konur. Bu bir süs değildir, anlamın bir parçasıdır: onsuz, kelime farklı okunurdu.', semantic: 'explanation' }),
      pl: R({ text: 'Fácil', semantic: 'targetWrong' }, { text: ' i ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetWrong' }, { text: ' to wyjątki, akcent odbiega od ogólnej zasady, dlatego mają tyldę nad á. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' działa tak samo: tylda jest, ', semantic: 'explanation' }, { text: 'aby pokazać, gdzie pada akcent', semantic: 'targetCorrect' }, { text: '. To nie ozdoba, to część znaczenia: bez niej słowo czytałoby się inaczej.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула та же: -o для мужского рода, -a для женского. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' пишет -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' — -a, а тильда над ú ', semantic: 'explanation' }, { text: 'остаётся на месте', semantic: 'targetCorrect' }, { text: ' в обеих формах. Ответ прост: тильда над ú никогда не исчезает, сколько бы концовка ни менялась.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама: -o для чоловічого роду, -a для жіночого. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' пише -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' — -a, а тильда над ú лишається на місці в обох формах. Відповідь проста: тильда над ú ніколи не зникає, скільки б закінчення не змінювалося.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same: -o for masculine, -a for feminine. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' writes -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' writes -a, and the tilde over ú ', semantic: 'explanation' }, { text: 'stays in place', semantic: 'targetCorrect' }, { text: ' in both forms. The answer is simple: the tilde over ú never disappears, no matter how the ending changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma: -o para masculino, -a para feminino. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' escreve -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' escreve -a, e o til sobre ú ', semantic: 'explanation' }, { text: 'permanece no lugar', semantic: 'targetCorrect' }, { text: ' nas duas formas. A resposta é simples: o til sobre ú nunca desaparece, não importa como a terminação mude.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống nhau: -o cho giống đực, -a cho giống cái. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' viết -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' viết -a, còn dấu ngã trên ú vẫn giữ nguyên ở cả hai dạng. Câu trả lời rất đơn giản: dấu ngã trên ú không bao giờ biến mất, dù đuôi có thay đổi thế nào.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama: -o untuk maskulin, -a untuk feminin. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' menulis -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' menulis -a, dan tilde di atas ú tetap di tempatnya di kedua bentuk. Jawabannya sederhana: tilde di atas ú tidak pernah hilang, tidak peduli bagaimana akhiran berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Formül aynıdır: eril için -o, dişil için -a. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' -o yazar, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' -a yazar, ú üzerindeki tilde her iki biçimde de ', semantic: 'explanation' }, { text: 'yerinde kalır', semantic: 'targetCorrect' }, { text: '. Cevap basittir: ú üzerindeki tilde, son nasıl değişirse değişsin asla kaybolmaz.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama: -o dla rodzaju męskiego, -a dla żeńskiego. ', semantic: 'explanation' }, { text: 'Único', semantic: 'targetCorrect' }, { text: ' pisze -o, ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ' pisze -a, a tylda nad ú pozostaje na miejscu w obu formach. Odpowiedź jest prosta: tylda nad ú nigdy nie znika, niezależnie od tego, jak zmienia się końcówka.', semantic: 'explanation' }),
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
      ru: R({ text: 'Легко забыть тильду и написать ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' — но без тильды ударение упало бы на другой слог. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' — ещё одна ловушка: другое слово, не связанное по значению. Проверка: «единственный» — это ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' или ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ', с тильдой над ú.', semantic: 'explanation' }),
      uk: R({ text: 'Легко забути тильду і написати ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' — але без тильди наголос упав би на інший склад. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' — ще одна пастка: інше слово, не пов’язане за значенням. Перевірка: «єдиний» — це ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' чи ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ', з тильдою над ú.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to forget the tilde and write ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' — but without the tilde, the stress would fall on a different syllable. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' is another trap: a different word, unrelated in meaning. The check: "unique" is ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' or ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ', with the tilde over ú.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil esquecer o til e escrever ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' — mas sem o til o acento cairia numa sílaba diferente. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' é outra armadilha: outra palavra, sem relação de significado. A checagem: "único" é ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' ou ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ', com o til sobre ú.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ quên dấu ngã và viết ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' — nhưng nếu không có dấu ngã, trọng âm sẽ rơi vào âm tiết khác. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' là một cái bẫy khác: từ khác, không liên quan về nghĩa. Cách kiểm tra: "duy nhất" là ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' hoặc ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ', có dấu ngã trên ú.', semantic: 'explanation' }),
      id: R({ text: 'Mudah lupa tilde dan menulis ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' — tetapi tanpa tilde tekanan akan jatuh pada suku kata lain. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' adalah jebakan lain: kata lain, tidak berhubungan maknanya. Pengecekan: "unik" adalah ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' atau ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ', dengan tilde di atas ú.', semantic: 'explanation' }),
      tr: R({ text: 'Tildeyi unutup ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' yazmak kolaydır — ama tilde olmadan vurgu başka bir heceye düşerdi. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' başka bir tuzaktır: anlamca ilgisiz başka bir kelime. Kontrol: "eşsiz" ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' ya da ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: '\'dır, ú üzerinde tilde ile.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo zapomnieć o tyldzie i napisać ', semantic: 'explanation' }, { text: 'unico', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' — ale bez tyldy akcent padłby na inną sylabę. ', semantic: 'explanation' }, { text: 'Unido', semantic: 'targetWrong' }, { text: ' to kolejna pułapka: inne słowo, niezwiązane znaczeniowo. Sprawdzenie: „jedyny” to ', semantic: 'explanation' }, { text: 'único', semantic: 'targetCorrect' }, { text: ' lub ', semantic: 'explanation' }, { text: 'única', semantic: 'targetCorrect' }, { text: ', z tyldą nad ú.', semantic: 'explanation' }),
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
