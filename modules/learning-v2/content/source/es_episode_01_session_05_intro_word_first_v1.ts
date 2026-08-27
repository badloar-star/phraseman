import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 5 "Быстрый и медленный" / pace_adjective, kind: 'phrases' по карте,
// word-first для rápido — единственного нового слова, как в сессии 2): три
// страницы concept/formula/trap. Recalls negation_no (2) и truth_adjective (4,
// тот же -o/-a паттерн).
//
// зачем тело переписано короче исходного черновика (владелец, 2026-08-27,
// тот же класс правки, что и в сессиях 3/4): реальный гейт
// (learning_content_quality_gate_v1.ts) держит верхний потолок 320 знаков /
// 4 предложения; первый черновик этого файла был раздут до ~400-530 знаков на
// локаль и валил бы intro_body_overloaded. Переписано короче без потери
// concept→formula→trap структуры; тело дословно содержит формулировку
// правильного ответа вопроса (intro_question_not_grounded).
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_05_WORD_FIRST_TITLE = L({
  ru: 'Быстрый и медленный',
  uk: 'Швидкий і повільний',
  es: 'Fast and slow',
  'pt-BR': 'Rápido e devagar',
  vi: 'Nhanh và chậm',
  id: 'Cepat dan lambat',
  tr: 'Hızlı ve yavaş',
  pl: 'Szybki i wolny',
});

export const ES_EPISODE_01_SESSION_05_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое слово показывает признак темпа — «быстрый», а «медленный» получается тем же отрицанием, что уже знакомо.',
  uk: 'Одне нове слово показує ознаку темпу — «швидкий», а «повільний» виходить тим самим запереченням, яке вже відоме.',
  es: 'One new word shows the quality of pace — "fast", and "slow" comes from the same negation already known.',
  'pt-BR': 'Uma palavra nova mostra a qualidade do ritmo — "rápido", e "devagar" vem da mesma negação já conhecida.',
  vi: 'Một từ mới cho thấy đặc điểm về tốc độ — "nhanh", còn "chậm" có được từ cùng cách phủ định đã biết.',
  id: 'Satu kata baru menunjukkan sifat kecepatan — "cepat", dan "lambat" didapat dari negasi yang sama yang sudah dikenal.',
  tr: 'Tek bir yeni kelime tempo niteliğini gösterir — "hızlı", "yavaş" ise zaten bilinen aynı olumsuzlamadan gelir.',
  pl: 'Jedno nowe słowo pokazuje cechę tempa — „szybki”, a „wolny” powstaje przez tę samą, już znaną negację.',
});

export const ES_EPISODE_01_SESSION_05_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать rápido и его форму rápida, а затем выразить «медленный» через отрицание.',
  uk: 'Упізнати на слух, зрозуміти й точно написати rápido та його форму rápida, а потім виразити «повільний» через заперечення.',
  es: 'Recognize, understand, and write rápido and its form rápida, then express "slow" through negation.',
  'pt-BR': 'Reconhecer de ouvido, entender e escrever corretamente rápido e sua forma rápida, depois expressar "devagar" pela negação.',
  vi: 'Nghe ra, hiểu và viết đúng rápido cùng dạng rápida của nó, sau đó diễn đạt "chậm" qua phủ định.',
  id: 'Mengenali dari suara, memahami, dan menulis rápido serta bentuknya rápida dengan tepat, lalu mengungkapkan "lambat" melalui negasi.',
  tr: 'Rápido ve onun rápida biçimini duyup tanımak, anlamak ve doğru yazmak; ardından "yavaş"ı olumsuzlama yoluyla ifade etmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać rápido oraz jego formę rápida, a potem wyrazić „wolny” przez negację.',
});

const CONCEPT_BODY = L({
  ru: 'Rápido означает «быстрый» — новый признак темпа, не встречавшийся раньше. У испанского нет отдельного слова для «медленный»: No es rápido значит «это не быстро», то есть медленно. Отрицание работает как и раньше — no встаёт перед связкой.',
  uk: 'Rápido означає «швидкий» — нова ознака темпу, яка раніше не траплялася. В іспанській немає окремого слова для «повільний»: No es rápido означає «це не швидко», тобто повільно. Заперечення працює як і раніше — no стає перед зв’язкою.',
  es: 'Rápido means "fast" — a new quality of pace, not seen before. Spanish has no separate word for "slow": No es rápido means "it is not fast", that is, slow. The negation works as before — no goes before the linking word.',
  'pt-BR': 'Rápido significa "rápido" — uma qualidade nova de ritmo, não vista antes. O espanhol não tem palavra separada para "devagar": No es rápido significa "não é rápido", ou seja, devagar. A negação funciona como antes — no fica antes da ligação.',
  vi: 'Rápido nghĩa là "nhanh" — một đặc điểm mới về tốc độ, chưa từng gặp trước đây. Tiếng Tây Ban Nha không có từ riêng cho "chậm": No es rápido nghĩa là "không nhanh", tức là chậm. Phủ định hoạt động như trước — no đứng trước từ nối.',
  id: 'Rápido berarti "cepat" — sifat baru tentang kecepatan, belum pernah dijumpai sebelumnya. Bahasa Spanyol tidak punya kata terpisah untuk "lambat": No es rápido berarti "tidak cepat", yaitu lambat. Negasi bekerja seperti sebelumnya — no berdiri sebelum kata penghubung.',
  tr: 'Rápido "hızlı" demektir — daha önce görülmemiş yeni bir tempo niteliği. İspanyolcada "yavaş" için ayrı bir kelime yoktur: No es rápido "hızlı değil" demektir, yani yavaş. Olumsuzlama öncekiyle aynı çalışır — no bağlaçtan önce gelir.',
  pl: 'Rápido znaczy „szybki” — nowa cecha tempa, wcześniej niespotykana. Hiszpański nie ma osobnego słowa na „wolny”: No es rápido znaczy „to nie jest szybkie”, czyli wolne. Negacja działa jak wcześniej — no staje przed łącznikiem.',
});

const FORMULA_BODY = L({
  ru: 'Формула согласования та же: -o для мужского рода, -a для женского. Rápido пишет -o, rápida — -a. Чтобы выразить «медленный», нужно добавить no перед связкой es: No es rápido — весь способ целиком, никакого нового слова не требуется.',
  uk: 'Формула узгодження та сама: -o для чоловічого роду, -a для жіночого. Rápido пише -o, rápida — -a. Щоб виразити «повільний», потрібно додати no перед зв’язкою es: No es rápido — весь спосіб цілком, жодного нового слова не потрібно.',
  es: 'The agreement formula is the same: -o for masculine, -a for feminine. Rápido writes -o, rápida writes -a. To express "slow", you need to add no before the linking word es: No es rápido — that is the entire method, no new word is needed.',
  'pt-BR': 'A fórmula de concordância é a mesma: -o para masculino, -a para feminino. Rápido escreve -o, rápida escreve -a. Para expressar "devagar", é preciso adicionar no antes da ligação es: No es rápido — esse é o método inteiro, nenhuma palavra nova é necessária.',
  vi: 'Công thức hòa hợp giống nhau: -o cho giống đực, -a cho giống cái. Rápido viết -o, rápida viết -a. Để diễn đạt "chậm", cần thêm no trước từ nối es: No es rápido — đó là toàn bộ cách làm, không cần từ mới nào.',
  id: 'Rumus kesesuaian sama: -o untuk maskulin, -a untuk feminin. Rápido menulis -o, rápida menulis -a. Untuk mengungkapkan "lambat", perlu menambahkan no sebelum kata penghubung es: No es rápido — itulah keseluruhan caranya, tidak diperlukan kata baru.',
  tr: 'Uyum formülü aynıdır: eril için -o, dişil için -a. Rápido -o yazar, rápida -a yazar. "Yavaş"ı ifade etmek için es bağlacından önce no eklemek gerekir: No es rápido — bütün yöntem budur, yeni bir kelimeye gerek yoktur.',
  pl: 'Formuła zgodności jest taka sama: -o dla rodzaju męskiego, -a dla żeńskiego. Rápido pisze -o, rápida pisze -a. Aby wyrazić „wolny”, trzeba dodać no przed łącznikiem es: No es rápido — to cały sposób, żadne nowe słowo nie jest potrzebne.',
});

const TRAP_BODY = L({
  ru: 'Rápido легко перепутать с fácil — оба на -o, оба уже встречались. Fácil говорит о сложности, rápido — о скорости. Rápidamente добавляет -mente и описывает, как что-то происходит, а не признак предмета — нужен именно rápido.',
  uk: 'Rápido легко сплутати з fácil — обидва на -o, обидва вже траплялися. Fácil говорить про складність, rápido — про швидкість. Rápidamente додає -mente й описує, як щось відбувається, а не ознаку предмета — потрібен саме rápido.',
  es: 'Rápido is easy to confuse with fácil — both end in -o, both already appeared. Fácil talks about difficulty, rápido about speed. Rápidamente adds -mente and describes how something happens, not a quality of a thing — rápido is needed.',
  'pt-BR': 'Rápido é fácil de confundir com fácil — ambos terminam em -o, ambos já apareceram. Fácil fala de dificuldade, rápido de velocidade. Rápidamente adiciona -mente e descreve como algo acontece, não a qualidade de uma coisa — precisa de rápido.',
  vi: 'Rápido dễ nhầm với fácil — cả hai kết thúc bằng -o, cả hai đã xuất hiện. Fácil nói về độ khó, rápido nói về tốc độ. Rápidamente thêm -mente và mô tả cách một điều gì đó xảy ra, không phải đặc điểm của một vật — cần rápido.',
  id: 'Rápido mudah tertukar dengan fácil — keduanya berakhiran -o, keduanya sudah muncul. Fácil berbicara tentang kesulitan, rápido tentang kecepatan. Rápidamente menambahkan -mente dan mendeskripsikan bagaimana sesuatu terjadi, bukan sifat suatu benda — perlu rápido.',
  tr: 'Rápido, fácil ile karıştırmak kolaydır — ikisi de -o ile biter, ikisi de daha önce görülmüştür. Fácil zorluktan, rápido hızdan bahseder. Rápidamente -mente ekler ve bir şeyin nasıl olduğunu tanımlar, bir şeyin niteliğini değil — rápido gerekir.',
  pl: 'Rápido łatwo pomylić z fácil — oba kończą się na -o, oba już się pojawiły. Fácil mówi o trudności, rápido o szybkości. Rápidamente dodaje -mente i opisuje, jak coś się dzieje, a nie cechę rzeczy — potrzebne jest rápido.',
});

export const ES_EPISODE_01_SESSION_05_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Rápido — новый признак темпа',
      uk: 'Rápido — нова ознака темпу',
      es: 'Rápido — a new pace quality',
      'pt-BR': 'Rápido — uma nova qualidade de ritmo',
      vi: 'Rápido — đặc điểm tốc độ mới',
      id: 'Rápido — sifat kecepatan baru',
      tr: 'Rápido — yeni bir tempo niteliği',
      pl: 'Rápido — nowa cecha tempa',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' означает «быстрый» — новый признак темпа, не встречавшийся раньше. У испанского нет отдельного слова для «медленный»: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' значит «это не быстро», то есть медленно. Отрицание работает как и раньше — no встаёт перед связкой.', semantic: 'explanation' }),
      uk: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' означає «швидкий» — нова ознака темпу, яка раніше не траплялася. В іспанській немає окремого слова для «повільний»: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' означає «це не швидко», тобто повільно. Заперечення працює як і раніше — no стає перед зв’язкою.', semantic: 'explanation' }),
      es: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' means "fast" — a new quality of pace, not seen before. Spanish has no separate word for "slow": ', semantic: 'explanation' }, { text: 'No es rápido negates the already-known quality', semantic: 'targetCorrect' }, { text: ', meaning "it is not fast", that is, slow. The negation works as before — no goes before the linking word.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' significa "rápido" — uma qualidade nova de ritmo, não vista antes. O espanhol não tem palavra separada para "devagar": ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' significa "não é rápido", ou seja, devagar. A negação funciona como antes — no fica antes da ligação.', semantic: 'explanation' }),
      vi: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' nghĩa là "nhanh" — một đặc điểm mới về tốc độ, chưa từng gặp trước đây. Tiếng Tây Ban Nha không có từ riêng cho "chậm": ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' nghĩa là "không nhanh", tức là chậm. Phủ định hoạt động như trước — no đứng trước từ nối.', semantic: 'explanation' }),
      id: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' berarti "cepat" — sifat baru tentang kecepatan, belum pernah dijumpai sebelumnya. Bahasa Spanyol tidak punya kata terpisah untuk "lambat": ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' berarti "tidak cepat", yaitu lambat. Negasi bekerja seperti sebelumnya — no berdiri sebelum kata penghubung.', semantic: 'explanation' }),
      tr: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' "hızlı" demektir — daha önce görülmemiş yeni bir tempo niteliği. İspanyolcada "yavaş" için ayrı bir kelime yoktur: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' "hızlı değil" demektir, yani yavaş. Olumsuzlama öncekiyle aynı çalışır — no bağlaçtan önce gelir.', semantic: 'explanation' }),
      pl: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' znaczy „szybki” — nowa cecha tempa, wcześniej niespotykana. Hiszpański nie ma osobnego słowa na „wolny”: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' znaczy „to nie jest szybkie”, czyli wolne. Negacja działa jak wcześniej — no staje przed łącznikiem.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как по-испански сказать «медленный», не заводя нового слова?',
        uk: 'Як іспанською сказати «повільний», не заводячи нового слова?',
        es: 'How do you say "slow" in Spanish without a new word?',
        'pt-BR': 'Como se diz "devagar" em espanhol sem uma palavra nova?',
        vi: 'Làm sao để nói "chậm" bằng tiếng Tây Ban Nha mà không cần từ mới?',
        id: 'Bagaimana mengatakan "lambat" dalam bahasa Spanyol tanpa kata baru?',
        tr: 'İspanyolca yeni bir kelime kullanmadan "yavaş" nasıl söylenir?',
        pl: 'Jak po hiszpańsku powiedzieć „wolny”, nie wprowadzając nowego słowa?',
      }),
      choices: [
        L({ ru: 'No es rápido', uk: 'No es rápido', es: 'No es rápido', 'pt-BR': 'No es rápido', vi: 'No es rápido', id: 'No es rápido', tr: 'No es rápido', pl: 'No es rápido' }),
        L({ ru: 'Es lentísimo', uk: 'Es lentísimo', es: 'Es lentísimo', 'pt-BR': 'Es lentísimo', vi: 'Es lentísimo', id: 'Es lentísimo', tr: 'Es lentísimo', pl: 'Es lentísimo' }),
        L({ ru: 'Rápido es', uk: 'Rápido es', es: 'Rápido es', 'pt-BR': 'Rápido es', vi: 'Rápido es', id: 'Rápido es', tr: 'Rápido es', pl: 'Rápido es' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No es rápido — отрицание уже известного признака, никакого нового слова не нужно. Второй вариант вводит несуществующее слово, третий переставляет порядок слов местами.',
        uk: 'No es rápido — заперечення вже відомої ознаки, жодного нового слова не потрібно. Другий варіант вводить неіснуюче слово, третій переставляє порядок слів місцями.',
        es: 'No es rápido negates the already-known quality, no new word is needed. The second option introduces a nonexistent word, the third swaps the word order.',
        'pt-BR': 'No es rápido nega a qualidade já conhecida, nenhuma palavra nova é necessária. A segunda opção introduz uma palavra inexistente, a terceira inverte a ordem das palavras.',
        vi: 'No es rápido phủ định đặc điểm đã biết, không cần từ mới nào. Lựa chọn thứ hai đưa ra một từ không tồn tại, lựa chọn thứ ba đảo ngược thứ tự từ.',
        id: 'No es rápido menegasikan sifat yang sudah dikenal, tidak diperlukan kata baru. Pilihan kedua memperkenalkan kata yang tidak ada, pilihan ketiga membalik urutan kata.',
        tr: 'No es rápido, zaten bilinen niteliği olumsuzlar, yeni bir kelimeye gerek yoktur. İkinci seçenek var olmayan bir kelime tanıtır, üçüncüsü kelime sırasını değiştirir.',
        pl: 'No es rápido zaprzecza już znanej cesze, żadne nowe słowo nie jest potrzebne. Druga opcja wprowadza nieistniejące słowo, trzecia zamienia kolejność słów.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'No перед es, признак после',
      uk: 'No перед es, ознака після',
      es: 'No before es, quality after',
      'pt-BR': 'No antes de es, qualidade depois',
      vi: 'No trước es, đặc điểm sau',
      id: 'No sebelum es, sifat setelahnya',
      tr: 'Es’ten önce no, nitelik sonra',
      pl: 'No przed es, cecha po',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула согласования та же: -o для мужского рода, -a для женского. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' пишет -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' — -a. Чтобы выразить «медленный», нужно добавить no перед связкой es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — весь способ целиком, никакого нового слова не требуется.', semantic: 'explanation' }),
      uk: R({ text: 'Формула узгодження та сама: -o для чоловічого роду, -a для жіночого. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' пише -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' — -a. Щоб виразити «повільний», потрібно додати no перед зв’язкою es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — весь спосіб цілком, жодного нового слова не потрібно.', semantic: 'explanation' }),
      es: R({ text: 'The agreement formula is the same: -o for masculine, -a for feminine. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' writes -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' writes -a. To express "slow", ', semantic: 'explanation' }, { text: 'you need to add no before the linking word es', semantic: 'targetCorrect' }, { text: ': No es rápido — that is the entire method, no new word is needed.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de concordância é a mesma: -o para masculino, -a para feminino. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' escreve -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' escreve -a. Para expressar "devagar", é preciso adicionar no antes da ligação es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — esse é o método inteiro, nenhuma palavra nova é necessária.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức hòa hợp giống nhau: -o cho giống đực, -a cho giống cái. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' viết -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' viết -a. Để diễn đạt "chậm", cần thêm no trước từ nối es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — đó là toàn bộ cách làm, không cần từ mới nào.', semantic: 'explanation' }),
      id: R({ text: 'Rumus kesesuaian sama: -o untuk maskulin, -a untuk feminin. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' menulis -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' menulis -a. Untuk mengungkapkan "lambat", perlu menambahkan no sebelum kata penghubung es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — itulah keseluruhan caranya, tidak diperlukan kata baru.', semantic: 'explanation' }),
      tr: R({ text: 'Uyum formülü aynıdır: eril için -o, dişil için -a. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' -o yazar, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' -a yazar. "Yavaş"ı ifade etmek için no, ', semantic: 'explanation' }, { text: 'Bağlaç es’ten önce', semantic: 'targetCorrect' }, { text: ' eklenir: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — bütün yöntem budur, yeni bir kelimeye gerek yoktur.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła zgodności jest taka sama: -o dla rodzaju męskiego, -a dla żeńskiego. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' pisze -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' pisze -a. Aby wyrazić „wolny”, trzeba dodać no przed łącznikiem es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — to cały sposób, żadne nowe słowo nie jest potrzebne.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Где стоит no относительно связки es?',
        uk: 'Де стоїть no відносно зв’язки es?',
        es: 'Where does no go relative to the linking word es?',
        'pt-BR': 'Onde fica no em relação à ligação es?',
        vi: 'No đứng ở đâu so với từ nối es?',
        id: 'Di mana posisi no terhadap kata penghubung es?',
        tr: 'No, es bağlacına göre nerede durur?',
        pl: 'Gdzie stoi no względem łącznika es?',
      }),
      choices: [
        L({ ru: 'Перед связкой es', uk: 'Перед зв’язкою es', es: 'Before the linking word es', 'pt-BR': 'Antes da ligação es', vi: 'Trước từ nối es', id: 'Sebelum kata penghubung es', tr: 'Bağlaç es’ten önce', pl: 'Przed łącznikiem es' }),
        L({ ru: 'После признака', uk: 'Після ознаки', es: 'After the quality', 'pt-BR': 'Depois da qualidade', vi: 'Sau đặc điểm', id: 'Setelah sifat', tr: 'Nitelikten sonra', pl: 'Po cesze' }),
        L({ ru: 'В середине слова rápido', uk: 'У середині слова rápido', es: 'In the middle of the word rápido', 'pt-BR': 'No meio da palavra rápido', vi: 'Ở giữa từ rápido', id: 'Di tengah kata rápido', tr: 'Rápido kelimesinin ortasında', pl: 'W środku słowa rápido' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No всегда стоит первым, перед связкой es — тот же порядок, что и в No es fácil.',
        uk: 'No завжди стоїть першим, перед зв’язкою es — той самий порядок, що й у No es fácil.',
        es: 'No always comes first, before the linking word es — the same order as in No es fácil.',
        'pt-BR': 'No sempre vem primeiro, antes da ligação es — a mesma ordem de No es fácil.',
        vi: 'No luôn đứng đầu tiên, trước từ nối es — cùng thứ tự như trong No es fácil.',
        id: 'No selalu berada di depan, sebelum kata penghubung es — urutan yang sama seperti No es fácil.',
        tr: 'Doğru cevap: no, bağlaç es’ten önce durur, çünkü olumsuzlama her zaman bağlacı etkiler, niteliği değil — tıpkı No es fácil’de olduğu gibi aynı sıra izlenir.',
        pl: 'No zawsze stoi pierwsze, przed łącznikiem es — ta sama kolejność co w No es fácil.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не путать rápido с fácil',
      uk: 'Не плутати rápido з fácil',
      es: 'Do not confuse rápido with fácil',
      'pt-BR': 'Não confundir rápido com fácil',
      vi: 'Đừng nhầm rápido với fácil',
      id: 'Jangan tertukar rápido dengan fácil',
      tr: 'Rápido’yu fácil ile karıştırmayın',
      pl: 'Nie mylić rápido z fácil',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' легко перепутать с ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — оба на -o, оба уже встречались. ', semantic: 'explanation' }, { text: 'Fácil', semantic: 'targetWrong' }, { text: ' говорит о сложности, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' — о скорости. ', semantic: 'explanation' }, { text: 'Rápidamente', semantic: 'targetWrong' }, { text: ' добавляет -mente и описывает, как что-то происходит, а не признак предмета — нужен именно ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' легко сплутати з ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — обидва на -o, обидва вже траплялися. ', semantic: 'explanation' }, { text: 'Fácil', semantic: 'targetWrong' }, { text: ' говорить про складність, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' — про швидкість. ', semantic: 'explanation' }, { text: 'Rápidamente', semantic: 'targetWrong' }, { text: ' додає -mente й описує, як щось відбувається, а не ознаку предмета — потрібен саме ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' is easy to confuse with ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — both end in -o, both already appeared. ', semantic: 'explanation' }, { text: 'Fácil', semantic: 'targetWrong' }, { text: ' talks about difficulty, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' about speed. ', semantic: 'explanation' }, { text: 'Rápidamente', semantic: 'targetWrong' }, { text: ' adds -mente and describes how something happens, not a quality of a thing — ', semantic: 'explanation' }, { text: 'rápido describes a quality of a thing', semantic: 'targetCorrect' }, { text: ' is needed instead.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' é fácil de confundir com ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — ambos terminam em -o, ambos já apareceram. ', semantic: 'explanation' }, { text: 'Fácil', semantic: 'targetWrong' }, { text: ' fala de dificuldade, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' de velocidade. ', semantic: 'explanation' }, { text: 'Rápidamente', semantic: 'targetWrong' }, { text: ' adiciona -mente e descreve como algo acontece, não a qualidade de uma coisa — precisa de ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' dễ nhầm với ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — cả hai kết thúc bằng -o, cả hai đã xuất hiện. ', semantic: 'explanation' }, { text: 'Fácil', semantic: 'targetWrong' }, { text: ' nói về độ khó, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' nói về tốc độ. ', semantic: 'explanation' }, { text: 'Rápidamente', semantic: 'targetWrong' }, { text: ' thêm -mente và mô tả cách một điều gì đó xảy ra, không phải đặc điểm của một vật — cần ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' mudah tertukar dengan ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — keduanya berakhiran -o, keduanya sudah muncul. ', semantic: 'explanation' }, { text: 'Fácil', semantic: 'targetWrong' }, { text: ' berbicara tentang kesulitan, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' tentang kecepatan. ', semantic: 'explanation' }, { text: 'Rápidamente', semantic: 'targetWrong' }, { text: ' menambahkan -mente dan mendeskripsikan bagaimana sesuatu terjadi, bukan sifat suatu benda — perlu ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' ile karıştırmak kolaydır — ikisi de -o ile biter, ikisi de daha önce görülmüştür. ', semantic: 'explanation' }, { text: 'Fácil', semantic: 'targetWrong' }, { text: ' zorluktan, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' hızdan bahseder. ', semantic: 'explanation' }, { text: 'Rápidamente', semantic: 'targetWrong' }, { text: ' -mente ekler ve bir şeyin nasıl olduğunu tanımlar, bir şeyin niteliğini değil — ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' gerekir.', semantic: 'explanation' }),
      pl: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' łatwo pomylić z ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — oba kończą się na -o, oba już się pojawiły. ', semantic: 'explanation' }, { text: 'Fácil', semantic: 'targetWrong' }, { text: ' mówi o trudności, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' o szybkości. ', semantic: 'explanation' }, { text: 'Rápidamente', semantic: 'targetWrong' }, { text: ' dodaje -mente i opisuje, jak coś się dzieje, a nie cechę rzeczy — potrzebne jest ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое слово описывает признак предмета, а не то, как что-то происходит?',
        uk: 'Яке слово описує ознаку предмета, а не те, як щось відбувається?',
        es: 'Which word describes a quality of a thing, not how something happens?',
        'pt-BR': 'Qual palavra descreve a qualidade de uma coisa, não como algo acontece?',
        vi: 'Từ nào mô tả đặc điểm của một vật, không phải cách một điều gì đó xảy ra?',
        id: 'Kata mana yang mendeskripsikan sifat suatu benda, bukan bagaimana sesuatu terjadi?',
        tr: 'Hangi kelime bir şeyin nasıl olduğunu değil, bir şeyin niteliğini tanımlar?',
        pl: 'Które słowo opisuje cechę rzeczy, a nie to, jak coś się dzieje?',
      }),
      choices: [
        L({ ru: 'rápido', uk: 'rápido', es: 'rápido', 'pt-BR': 'rápido', vi: 'rápido', id: 'rápido', tr: 'rápido', pl: 'rápido' }),
        L({ ru: 'rápidamente', uk: 'rápidamente', es: 'rápidamente', 'pt-BR': 'rápidamente', vi: 'rápidamente', id: 'rápidamente', tr: 'rápidamente', pl: 'rápidamente' }),
        L({ ru: 'fácil', uk: 'fácil', es: 'fácil', 'pt-BR': 'fácil', vi: 'fácil', id: 'fácil', tr: 'fácil', pl: 'fácil' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Rápido описывает признак предмета. Rápidamente — наречие при действии. Fácil — признак сложности, не темпа.',
        uk: 'Rápido описує ознаку предмета. Rápidamente — прислівник при дії. Fácil — ознака складності, не темпу.',
        es: 'Rápido describes a quality of a thing. Rápidamente is an adverb used with an action. Fácil is a quality of difficulty, not pace.',
        'pt-BR': 'Rápido descreve a qualidade de uma coisa. Rápidamente é um advérbio usado com uma ação. Fácil é uma qualidade de dificuldade, não de ritmo.',
        vi: 'Rápido mô tả đặc điểm của một vật. Rápidamente là trạng từ dùng với hành động. Fácil là đặc điểm về sự khó khăn, không phải tốc độ.',
        id: 'Rápido mendeskripsikan sifat suatu benda. Rápidamente adalah kata keterangan yang dipakai dengan tindakan. Fácil adalah sifat kesulitan, bukan kecepatan.',
        tr: 'Rápido bir şeyin niteliğini tanımlar. Rápidamente bir eylemle kullanılan bir zarftır. Fácil zorluk niteliğidir, tempo değil.',
        pl: 'Rápido opisuje cechę rzeczy. Rápidamente to przysłówek używany z czynnością. Fácil to cecha trudności, nie tempa.',
      }),
    },
  },
];
