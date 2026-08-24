import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 5 "Быстрый и медленный" / pace_adjective, kind: 'phrases' по карте,
// word-first для rápido — единственного нового слова, как в сессии 2): три
// страницы concept/formula/trap. Recalls negation_no (2) и truth_adjective (4,
// тот же -o/-a паттерн). Тела страниц сразу написаны на 4+ причинных
// предложения с дословным вхождением ответа вопроса.
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
  ru: 'Rápido означает «быстрый» — признак темпа, скорости чего-либо. Это новый признак, не встречавшийся раньше: fácil говорил о сложности, verdadero — об истинности, а rápido говорит именно о скорости. У испанского нет отдельного слова для «медленный» пока — вместо него используется отрицание уже известного признака: No es rápido значит «это не быстро», то есть медленно. Отрицание работает точно так же, как и раньше: No встаёт перед связкой и переворачивает смысл фразы на противоположный.',
  uk: 'Rápido означає «швидкий» — ознака темпу, швидкості чогось. Це нова ознака, яка раніше не траплялася: fácil говорило про складність, verdadero — про істинність, а rápido говорить саме про швидкість. В іспанській немає окремого слова для «повільний» поки що — замість нього використовується заперечення вже відомої ознаки: No es rápido означає «це не швидко», тобто повільно. Заперечення працює точно так само, як і раніше: No стає перед зв’язкою й перевертає сенс фрази на протилежний.',
  es: 'Rápido means "fast" — a quality of pace, the speed of something. This is a new quality, not seen before: fácil talked about difficulty, verdadero about being true, and rápido talks specifically about speed. Spanish has no separate word for "slow" for now — instead, it uses the negation of the already-known quality: No es rápido means "it is not fast", that is, slow. The negation works exactly as before: No goes before the linking word and flips the meaning of the phrase.',
  'pt-BR': 'Rápido significa "rápido" — uma qualidade de ritmo, a velocidade de algo. É uma qualidade nova, não vista antes: fácil falava de dificuldade, verdadero de ser verdadeiro, e rápido fala especificamente de velocidade. O espanhol não tem uma palavra separada para "devagar" por enquanto — em vez disso, usa a negação da qualidade já conhecida: No es rápido significa "não é rápido", ou seja, devagar. A negação funciona exatamente como antes: No fica antes da ligação e inverte o sentido da frase.',
  vi: 'Rápido nghĩa là "nhanh" — một đặc điểm về tốc độ, sự nhanh chậm của điều gì đó. Đây là một đặc điểm mới, chưa từng gặp trước đây: fácil nói về sự khó khăn, verdadero nói về sự đúng đắn, còn rápido nói cụ thể về tốc độ. Tiếng Tây Ban Nha không có từ riêng cho "chậm" hiện tại — thay vào đó, nó dùng cách phủ định đặc điểm đã biết: No es rápido nghĩa là "không nhanh", tức là chậm. Phủ định hoạt động y hệt như trước: No đứng trước từ nối và đảo ngược nghĩa của câu.',
  id: 'Rápido berarti "cepat" — sifat kecepatan, laju dari sesuatu. Ini adalah sifat baru, belum pernah dijumpai sebelumnya: fácil berbicara tentang kesulitan, verdadero tentang kebenaran, dan rápido berbicara khusus tentang kecepatan. Bahasa Spanyol tidak memiliki kata terpisah untuk "lambat" untuk saat ini — sebagai gantinya, digunakan negasi dari sifat yang sudah dikenal: No es rápido berarti "tidak cepat", yaitu lambat. Negasi bekerja persis seperti sebelumnya: No berdiri sebelum kata penghubung dan membalikkan makna kalimat.',
  tr: 'Rápido "hızlı" demektir — bir şeyin temposu, hızı niteliğidir. Bu, daha önce görülmemiş yeni bir niteliktir: fácil zorluktan bahsediyordu, verdadero doğruluktan, rápido ise özellikle hızdan bahseder. İspanyolcada şimdilik "yavaş" için ayrı bir kelime yoktur — bunun yerine, zaten bilinen niteliğin olumsuzlanması kullanılır: No es rápido "hızlı değil" demektir, yani yavaş. Olumsuzlama tam olarak daha önceki gibi çalışır: No, bağlacın önüne geçer ve cümlenin anlamını tersine çevirir.',
  pl: 'Rápido znaczy „szybki” — cecha tempa, szybkości czegoś. To nowa cecha, wcześniej niespotykana: fácil mówiło o trudności, verdadero o prawdziwości, a rápido mówi właśnie o szybkości. Hiszpański nie ma osobnego słowa na „wolny” na razie — zamiast tego używa negacji już znanej cechy: No es rápido znaczy „to nie jest szybkie”, czyli wolne. Negacja działa dokładnie tak samo jak wcześniej: No staje przed łącznikiem i odwraca sens zdania.',
});

const FORMULA_BODY = L({
  ru: 'Формула согласования та же, что и для других прилагательных: концовка -o для мужского рода, концовка -a для женского. Rápido пишет -o, rápida меняет ровно одну букву на -a. Чтобы выразить «медленный», нужно добавить no перед связкой es: No es rápido — вот весь способ целиком, никакого нового слова не требуется. Порядок слов остаётся прежним: No всегда стоит первым, перед es, а признак идёт последним.',
  uk: 'Формула узгодження та сама, що й для інших прикметників: закінчення -o для чоловічого роду, закінчення -a для жіночого. Rápido пише -o, rápida змінює рівно одну літеру на -a. Щоб виразити «повільний», потрібно додати no перед зв’язкою es: No es rápido — ось весь спосіб цілком, жодного нового слова не потрібно. Порядок слів лишається попереднім: No завжди стоїть першим, перед es, а ознака йде останньою.',
  es: 'The agreement formula is the same as for other adjectives: the ending -o for masculine, the ending -a for feminine. Rápido writes -o, rápida changes exactly one letter to -a. To express "slow", you need to add no before the linking word es: No es rápido — that is the entire method, no new word is needed. The word order stays the same: No always comes first, before es, and the quality comes last.',
  'pt-BR': 'A fórmula de concordância é a mesma de outros adjetivos: a terminação -o para masculino, a terminação -a para feminino. Rápido escreve -o, rápida muda exatamente uma letra para -a. Para expressar "devagar", é preciso adicionar no antes da ligação es: No es rápido — esse é o método inteiro, nenhuma palavra nova é necessária. A ordem das palavras permanece a mesma: No sempre vem primeiro, antes de es, e a qualidade vem por último.',
  vi: 'Công thức hòa hợp giống như các tính từ khác: đuôi -o cho giống đực, đuôi -a cho giống cái. Rápido viết -o, rápida chỉ đổi đúng một chữ cái thành -a. Để diễn đạt "chậm", cần thêm no trước từ nối es: No es rápido — đó là toàn bộ cách làm, không cần từ mới nào cả. Thứ tự từ vẫn giữ nguyên: No luôn đứng đầu tiên, trước es, còn đặc điểm đứng cuối cùng.',
  id: 'Rumus kesesuaian sama seperti kata sifat lain: akhiran -o untuk maskulin, akhiran -a untuk feminin. Rápido menulis -o, rápida mengubah tepat satu huruf menjadi -a. Untuk mengungkapkan "lambat", perlu menambahkan no sebelum kata penghubung es: No es rápido — itulah keseluruhan caranya, tidak diperlukan kata baru. Urutan kata tetap sama: No selalu berada di depan, sebelum es, dan sifatnya berada di akhir.',
  tr: 'Uyum formülü diğer sıfatlarla aynıdır: eril için -o son eki, dişil için -a son eki. Rápido -o yazar, rápida ise tam olarak tek bir harfi -a olarak değiştirir. "Yavaş"ı ifade etmek için, es bağlacından önce no eklemek gerekir: No es rápido — bütün yöntem budur, yeni bir kelimeye gerek yoktur. Doğru cevap şudur: no her zaman bağlaç es’ten önce durur, nitelik ise en sonda gelir.',
  pl: 'Formuła zgodności jest taka sama jak dla innych przymiotników: końcówka -o dla rodzaju męskiego, końcówka -a dla żeńskiego. Rápido pisze -o, rápida zmienia dokładnie jedną literę na -a. Aby wyrazić „wolny”, trzeba dodać no przed łącznikiem es: No es rápido — to cały sposób, żadne nowe słowo nie jest potrzebne. Kolejność słów pozostaje taka sama: No zawsze stoi pierwsze, przed es, a cecha na końcu.',
});

const TRAP_BODY = L({
  ru: 'Rápido легко перепутать с fácil — оба прилагательные с концовкой на -o, оба уже встречались раньше. Но признаки у них разные: fácil говорит о сложности, «лёгкий», а rápido — о скорости, «быстрый». Ещё одна ловушка — rápidamente: оно похоже на rápido, но добавляет -mente и становится наречием, «быстро» при действии, а не признаком самой вещи. Проверка простая: если описывают темп предмета или человека, нужен rápido/rápida; если описывают, как что-то происходит, нужно rápidamente.',
  uk: 'Rápido легко сплутати з fácil — обидва прикметники із закінченням на -o, обидва вже траплялися раніше. Але ознаки в них різні: fácil говорить про складність, «легкий», а rápido — про швидкість, «швидкий». Ще одна пастка — rápidamente: воно схоже на rápido, але додає -mente й стає прислівником, «швидко» при дії, а не ознакою самої речі. Перевірка проста: якщо описують темп предмета чи людини, потрібен rápido/rápida; якщо описують, як щось відбувається, потрібне rápidamente.',
  es: 'Rápido is easy to confuse with fácil — both are adjectives ending in -o, both have already appeared before. But their qualities are different: fácil talks about difficulty, "easy", while rápido talks about speed, "fast". Another trap is rápidamente: it looks like rápido, but adds -mente and becomes an adverb, "quickly" used with an action, not a quality of the thing itself. The check is simple: if describing the pace of a thing or person, rápido/rápida is needed; if describing how something happens, rápidamente is needed.',
  'pt-BR': 'Rápido é fácil de confundir com fácil — ambos são adjetivos terminados em -o, ambos já apareceram antes. Mas suas qualidades são diferentes: fácil fala de dificuldade, "fácil", enquanto rápido fala de velocidade, "rápido". Outra armadilha é rápidamente: parece com rápido, mas adiciona -mente e vira um advérbio, "rapidamente" usado com uma ação, não uma qualidade da coisa em si. A checagem é simples: se descreve o ritmo de uma coisa ou pessoa, precisa de rápido/rápida; se descreve como algo acontece, precisa de rápidamente.',
  vi: 'Rápido dễ nhầm với fácil — cả hai đều là tính từ kết thúc bằng -o, cả hai đều đã xuất hiện trước đây. Nhưng đặc điểm của chúng khác nhau: fácil nói về sự khó khăn, "dễ", còn rápido nói về tốc độ, "nhanh". Một cái bẫy khác là rápidamente: nó trông giống rápido, nhưng thêm -mente và trở thành trạng từ, "nhanh chóng" dùng với hành động, không phải đặc điểm của chính vật đó. Cách kiểm tra đơn giản: nếu mô tả tốc độ của một vật hay người, cần rápido/rápida; nếu mô tả cách một điều gì đó xảy ra, cần rápidamente.',
  id: 'Rápido mudah tertukar dengan fácil — keduanya kata sifat berakhiran -o, keduanya sudah muncul sebelumnya. Tetapi sifat mereka berbeda: fácil berbicara tentang kesulitan, "mudah", sedangkan rápido berbicara tentang kecepatan, "cepat". Jebakan lain adalah rápidamente: terlihat seperti rápido, tetapi menambahkan -mente dan menjadi kata keterangan, "dengan cepat" yang dipakai dengan tindakan, bukan sifat dari benda itu sendiri. Pengecekannya sederhana: jika mendeskripsikan kecepatan suatu benda atau orang, diperlukan rápido/rápida; jika mendeskripsikan bagaimana sesuatu terjadi, diperlukan rápidamente.',
  tr: 'Rápido, fácil ile karıştırmak kolaydır — ikisi de -o ile biten sıfatlardır, ikisi de daha önce görülmüştür. Ama nitelikleri farklıdır: fácil zorluktan, "kolay"dan bahseder, rápido ise hızdan, "hızlı"dan bahseder. Başka bir tuzak da rápidamente’dir: rápido’ya benzer, ama -mente ekler ve bir eylemle kullanılan "hızlıca" zarfına dönüşür, şeyin kendisinin niteliği değil. Kontrol basittir: bir şeyin ya da kişinin temposu tanımlanıyorsa rápido/rápida gerekir; bir şeyin nasıl olduğu tanımlanıyorsa rápidamente gerekir.',
  pl: 'Rápido łatwo pomylić z fácil — oba to przymiotniki zakończone na -o, oba już pojawiły się wcześniej. Ale ich cechy są różne: fácil mówi o trudności, „łatwy”, a rápido o szybkości, „szybki”. Kolejną pułapką jest rápidamente: wygląda jak rápido, ale dodaje -mente i staje się przysłówkiem, „szybko” używanym z czynnością, a nie cechą samej rzeczy. Sprawdzenie jest proste: jeśli opisuje się tempo rzeczy lub osoby, potrzebne jest rápido/rápida; jeśli opisuje się, jak coś się dzieje, potrzebne jest rápidamente.',
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
      ru: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' означает «быстрый» — признак темпа, скорости чего-либо. Это новый признак, не встречавшийся раньше: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' говорил о сложности, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetWrong' }, { text: ' — об истинности, а ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' говорит именно о скорости. У испанского нет отдельного слова для «медленный» пока — вместо него используется отрицание уже известного признака: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' значит «это не быстро», то есть медленно. Отрицание работает точно так же, как и раньше: No встаёт перед связкой и переворачивает смысл фразы на противоположный.', semantic: 'explanation' }),
      uk: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' означає «швидкий» — ознака темпу, швидкості чогось. Це нова ознака, яка раніше не траплялася: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' говорило про складність, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetWrong' }, { text: ' — про істинність, а ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' говорить саме про швидкість. В іспанській немає окремого слова для «повільний» поки що — замість нього використовується заперечення вже відомої ознаки: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' означає «це не швидко», тобто повільно. Заперечення працює точно так само, як і раніше: No стає перед зв’язкою й перевертає сенс фрази на протилежний.', semantic: 'explanation' }),
      es: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' means "fast" — a quality of pace, the speed of something. This is a new quality, not seen before: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' talked about difficulty, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetWrong' }, { text: ' about being true, and ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' talks specifically about speed. Spanish has no separate word for "slow" for now — instead, it uses the negation of the already-known quality: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' means "it is not fast", that is, slow. The negation works exactly as before: No goes before the linking word and flips the meaning of the phrase.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' significa "rápido" — uma qualidade de ritmo, a velocidade de algo. É uma qualidade nova, não vista antes: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' falava de dificuldade, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetWrong' }, { text: ' de ser verdadeiro, e ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' fala especificamente de velocidade. O espanhol não tem uma palavra separada para "devagar" por enquanto — em vez disso, usa a negação da qualidade já conhecida: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' significa "não é rápido", ou seja, devagar. A negação funciona exatamente como antes: No fica antes da ligação e inverte o sentido da frase.', semantic: 'explanation' }),
      vi: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' nghĩa là "nhanh" — một đặc điểm về tốc độ, sự nhanh chậm của điều gì đó. Đây là một đặc điểm mới, chưa từng gặp trước đây: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' nói về sự khó khăn, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetWrong' }, { text: ' nói về sự đúng đắn, còn ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' nói cụ thể về tốc độ. Tiếng Tây Ban Nha không có từ riêng cho "chậm" hiện tại — thay vào đó, nó dùng cách phủ định đặc điểm đã biết: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' nghĩa là "không nhanh", tức là chậm. Phủ định hoạt động y hệt như trước: No đứng trước từ nối và đảo ngược nghĩa của câu.', semantic: 'explanation' }),
      id: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' berarti "cepat" — sifat kecepatan, laju dari sesuatu. Ini adalah sifat baru, belum pernah dijumpai sebelumnya: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' berbicara tentang kesulitan, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetWrong' }, { text: ' tentang kebenaran, dan ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' berbicara khusus tentang kecepatan. Bahasa Spanyol tidak memiliki kata terpisah untuk "lambat" untuk saat ini — sebagai gantinya, digunakan negasi dari sifat yang sudah dikenal: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' berarti "tidak cepat", yaitu lambat. Negasi bekerja persis seperti sebelumnya: No berdiri sebelum kata penghubung dan membalikkan makna kalimat.', semantic: 'explanation' }),
      tr: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' "hızlı" demektir — bir şeyin temposu, hızı niteliğidir. Bu, daha önce görülmemiş yeni bir niteliktir: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' zorluktan bahsediyordu, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetWrong' }, { text: ' doğruluktan, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' ise özellikle hızdan bahseder. İspanyolcada şimdilik "yavaş" için ayrı bir kelime yoktur — bunun yerine, zaten bilinen niteliğin olumsuzlanması kullanılır: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' "hızlı değil" demektir, yani yavaş. Olumsuzlama tam olarak daha önceki gibi çalışır: No, bağlacın önüne geçer ve cümlenin anlamını tersine çevirir.', semantic: 'explanation' }),
      pl: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' znaczy „szybki” — cecha tempa, szybkości czegoś. To nowa cecha, wcześniej niespotykana: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' mówiło o trudności, ', semantic: 'explanation' }, { text: 'verdadero', semantic: 'targetWrong' }, { text: ' o prawdziwości, a ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' mówi właśnie o szybkości. Hiszpański nie ma osobnego słowa na „wolny” na razie — zamiast tego używa negacji już znanej cechy: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' znaczy „to nie jest szybkie”, czyli wolne. Negacja działa dokładnie tak samo jak wcześniej: No staje przed łącznikiem i odwraca sens zdania.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула согласования та же, что и для других прилагательных: концовка -o для мужского рода, концовка -a для женского. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' пишет -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' меняет ровно одну букву на -a. Чтобы выразить «медленный», нужно добавить no перед связкой es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — вот весь способ целиком, никакого нового слова не требуется. Порядок слов остаётся прежним: No всегда стоит первым, перед es, а признак идёт последним.', semantic: 'explanation' }),
      uk: R({ text: 'Формула узгодження та сама, що й для інших прикметників: закінчення -o для чоловічого роду, закінчення -a для жіночого. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' пише -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' змінює рівно одну літеру на -a. Щоб виразити «повільний», потрібно додати no перед зв’язкою es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — ось весь спосіб цілком, жодного нового слова не потрібно. Порядок слів лишається попереднім: No завжди стоїть першим, перед es, а ознака йде останньою.', semantic: 'explanation' }),
      es: R({ text: 'The agreement formula is the same as for other adjectives: the ending -o for masculine, the ending -a for feminine. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' writes -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' changes exactly one letter to -a. To express "slow", you need to add no before the linking word es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — that is the entire method, no new word is needed. The word order stays the same: No always comes first, before es, and the quality comes last.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de concordância é a mesma de outros adjetivos: a terminação -o para masculino, a terminação -a para feminino. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' escreve -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' muda exatamente uma letra para -a. Para expressar "devagar", é preciso adicionar no antes da ligação es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — esse é o método inteiro, nenhuma palavra nova é necessária. A ordem das palavras permanece a mesma: No sempre vem primeiro, antes de es, e a qualidade vem por último.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức hòa hợp giống như các tính từ khác: đuôi -o cho giống đực, đuôi -a cho giống cái. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' viết -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' chỉ đổi đúng một chữ cái thành -a. Để diễn đạt "chậm", cần thêm no trước từ nối es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — đó là toàn bộ cách làm, không cần từ mới nào cả. Thứ tự từ vẫn giữ nguyên: No luôn đứng đầu tiên, trước es, còn đặc điểm đứng cuối cùng.', semantic: 'explanation' }),
      id: R({ text: 'Rumus kesesuaian sama seperti kata sifat lain: akhiran -o untuk maskulin, akhiran -a untuk feminin. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' menulis -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' mengubah tepat satu huruf menjadi -a. Untuk mengungkapkan "lambat", perlu menambahkan no sebelum kata penghubung es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — itulah keseluruhan caranya, tidak diperlukan kata baru. Urutan kata tetap sama: No selalu berada di depan, sebelum es, dan sifatnya berada di akhir.', semantic: 'explanation' }),
      tr: R({ text: 'Uyum formülü diğer sıfatlarla aynıdır: eril için -o son eki, dişil için -a son eki. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' -o yazar, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' ise tam olarak tek bir harfi -a olarak değiştirir. "Yavaş"ı ifade etmek için, es bağlacından önce no eklemek gerekir: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — bütün yöntem budur, yeni bir kelimeye gerek yoktur. Kelime sırası aynı kalır: No her zaman önce gelir, es’ten önce, nitelik ise en sonda gelir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła zgodności jest taka sama jak dla innych przymiotników: końcówka -o dla rodzaju męskiego, końcówka -a dla żeńskiego. ', semantic: 'explanation' }, { text: 'Rápido', semantic: 'targetCorrect' }, { text: ' pisze -o, ', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' zmienia dokładnie jedną literę na -a. Aby wyrazić „wolny”, trzeba dodać no przed łącznikiem es: ', semantic: 'explanation' }, { text: 'No es rápido', semantic: 'targetCorrect' }, { text: ' — to cały sposób, żadne nowe słowo nie jest potrzebne. Kolejność słów pozostaje taka sama: No zawsze stoi pierwsze, przed es, a cecha na końcu.', semantic: 'explanation' }),
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
      ru: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' легко перепутать с ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — оба прилагательные с концовкой на -o, оба уже встречались раньше. Но признаки у них разные: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' говорит о сложности, «лёгкий», а ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' — о скорости, «быстрый». Ещё одна ловушка — ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: ': оно похоже на ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ', но добавляет -mente и становится наречием, «быстро» при действии, а не признаком самой вещи. Если описывают темп предмета или человека, нужен ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: '; если описывают, как что-то происходит, нужно ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' легко сплутати з ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — обидва прикметники із закінченням на -o, обидва вже траплялися раніше. Але ознаки в них різні: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' говорить про складність, «легкий», а ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' — про швидкість, «швидкий». Ще одна пастка — ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: ': воно схоже на ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ', але додає -mente й стає прислівником, «швидко» при дії, а не ознакою самої речі. Якщо описують темп предмета чи людини, потрібен ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: '; якщо описують, як щось відбувається, потрібне ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' is easy to confuse with ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — both are adjectives ending in -o, both have already appeared before. But their qualities are different: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' talks about difficulty, "easy", while ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' talks about speed, "fast". Another trap is ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: ': it looks like ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ', but adds -mente and becomes an adverb, "quickly" used with an action, not a quality of the thing itself. If describing the pace of a thing or person, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' is needed; if describing how something happens, ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: ' is needed.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' é fácil de confundir com ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — ambos são adjetivos terminados em -o, ambos já apareceram antes. Mas suas qualidades são diferentes: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' fala de dificuldade, "fácil", enquanto ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' fala de velocidade, "rápido". Outra armadilha é ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: ': parece com ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ', mas adiciona -mente e vira um advérbio, "rapidamente" usado com uma ação, não uma qualidade da coisa em si. Se descreve o ritmo de uma coisa ou pessoa, precisa de ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: '; se descreve como algo acontece, precisa de ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' dễ nhầm với ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — cả hai đều là tính từ kết thúc bằng -o, cả hai đều đã xuất hiện trước đây. Nhưng đặc điểm của chúng khác nhau: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' nói về sự khó khăn, "dễ", còn ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' nói về tốc độ, "nhanh". Một cái bẫy khác là ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: ': nó trông giống ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ', nhưng thêm -mente và trở thành trạng từ, "nhanh chóng" dùng với hành động, không phải đặc điểm của chính vật đó. Nếu mô tả tốc độ của một vật hay người, cần ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: '; nếu mô tả cách một điều gì đó xảy ra, cần ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' mudah tertukar dengan ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — keduanya kata sifat berakhiran -o, keduanya sudah muncul sebelumnya. Tetapi sifat mereka berbeda: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' berbicara tentang kesulitan, "mudah", sedangkan ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' berbicara tentang kecepatan, "cepat". Jebakan lain adalah ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: ': terlihat seperti ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ', tetapi menambahkan -mente dan menjadi kata keterangan, "dengan cepat" yang dipakai dengan tindakan, bukan sifat dari benda itu sendiri. Jika mendeskripsikan kecepatan suatu benda atau orang, diperlukan ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: '; jika mendeskripsikan bagaimana sesuatu terjadi, diperlukan ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' ile karıştırmak kolaydır — ikisi de -o ile biten sıfatlardır, ikisi de daha önce görülmüştür. Ama nitelikleri farklıdır: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' zorluktan, "kolay"dan bahseder, ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' ise hızdan, "hızlı"dan bahseder. Başka bir tuzak da ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: '’dir: ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '’ya benzer, ama -mente ekler ve bir eylemle kullanılan "hızlıca" zarfına dönüşür, şeyin kendisinin niteliği değil. Bir şeyin ya da kişinin temposu tanımlanıyorsa ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: ' gerekir; bir şeyin nasıl olduğu tanımlanıyorsa ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: ' gerekir.', semantic: 'explanation' }),
      pl: R({ text: 'Rápido', semantic: 'targetCorrect' }, { text: ' łatwo pomylić z ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — oba to przymiotniki zakończone na -o, oba już pojawiły się wcześniej. Ale ich cechy są różne: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' mówi o trudności, „łatwy”, a ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ' o szybkości, „szybki”. Kolejną pułapką jest ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: ': wygląda jak ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: ', ale dodaje -mente i staje się przysłówkiem, „szybko” używanym z czynnością, a nie cechą samej rzeczy. Jeśli opisuje się tempo rzeczy lub osoby, potrzebne jest ', semantic: 'explanation' }, { text: 'rápido', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'rápida', semantic: 'targetCorrect' }, { text: '; jeśli opisuje się, jak coś się dzieje, potrzebne jest ', semantic: 'explanation' }, { text: 'rápidamente', semantic: 'targetWrong' }, { text: '.', semantic: 'explanation' }),
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
