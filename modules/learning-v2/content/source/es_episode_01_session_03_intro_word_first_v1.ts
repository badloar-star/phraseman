import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 3 "Мужской и женский род" / gender_agreement_full): три страницы
// concept/formula/trap объясняют согласование признака по роду через новое
// слово bonito/bonita (единственное слово этой сессии — вводится через
// word-first контакты в es_episode_01_session_03_vocabulary_v1.ts).
//
// зачем тело каждой страницы расширено до 4+ причинных предложений и ответ
// вопроса дословно повторяется в теле (владелец, гейт после первого прогона
// сессии 3, 2026-08-24): intro_body_too_thin и intro_question_not_grounded —
// требования гейта строже, чем в сессии 2, где 3 предложения проходили.
// Trap-страница также не ссылается на "сессию про оценку" (intro_meta_narration) —
// сравнение с fácil сформулировано напрямую через грамматику, без ссылки на курс.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_03_WORD_FIRST_TITLE = L({
  ru: 'Мужской и женский род',
  uk: 'Чоловічий і жіночий рід',
  es: 'Masculine and feminine gender',
  'pt-BR': 'Gênero masculino e feminino',
  vi: 'Giống đực và giống cái',
  id: 'Gender maskulin dan feminin',
  tr: 'Eril ve dişil cinsiyet',
  pl: 'Rodzaj męski i żeński',
});

export const ES_EPISODE_01_SESSION_03_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое слово показывает, как испанский признак меняет концовку в зависимости от рода того, о чём идёт речь.',
  uk: 'Одне нове слово показує, як іспанська ознака змінює закінчення залежно від роду того, про що йдеться.',
  es: 'One new word shows how a Spanish quality changes its ending depending on the gender of what is being described.',
  'pt-BR': 'Uma palavra nova mostra como uma qualidade em espanhol muda a terminação conforme o gênero daquilo de que se fala.',
  vi: 'Một từ mới cho thấy một đặc điểm tiếng Tây Ban Nha đổi đuôi tùy theo giống của thứ đang được nói tới.',
  id: 'Satu kata baru menunjukkan bagaimana sebuah sifat dalam bahasa Spanyol mengubah akhirannya tergantung gender dari apa yang dijelaskan.',
  tr: 'Tek bir yeni kelime, İspanyolca bir niteliğin, tanımlanan şeyin cinsiyetine göre sonunun nasıl değiştiğini gösterir.',
  pl: 'Jedno nowe słowo pokazuje, jak hiszpańska cecha zmienia końcówkę w zależności od rodzaju tego, o czym mowa.',
});

export const ES_EPISODE_01_SESSION_03_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать bonito и его форму bonita, а затем выбрать нужную форму по роду.',
  uk: 'Упізнати на слух, зрозуміти й точно написати bonito та його форму bonita, а потім обрати потрібну форму за родом.',
  es: 'Recognize, understand, and write bonito and its form bonita, then choose the right form by gender.',
  'pt-BR': 'Reconhecer de ouvido, entender e escrever corretamente bonito e sua forma bonita, depois escolher a forma certa pelo gênero.',
  vi: 'Nghe ra, hiểu và viết đúng bonito cùng dạng bonita của nó, sau đó chọn đúng dạng theo giống.',
  id: 'Mengenali dari suara, memahami, dan menulis bonito serta bentuknya bonita dengan tepat, lalu memilih bentuk yang benar sesuai gender.',
  tr: 'Bonito ve onun bonita biçimini duyup tanımak, anlamak ve doğru yazmak; ardından cinsiyete göre doğru biçimi seçmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać bonito oraz jego formę bonita, a potem wybrać właściwą formę według rodzaju.',
});

const CONCEPT_BODY = L({
  ru: 'Испанское прилагательное умеет менять концовку в зависимости от рода того, что оно описывает. Bonito описывает предмет или человека мужского рода, а bonita — женского: одно и то же качество «красивый», две разные концовки. Концовка признака зависит от рода того, что описывают, — вот единственное правило, которое здесь нужно запомнить. Оно не зависит ни от того, кто говорит, ни от времени суток, ни от какого-либо другого условия — только от рода самого предмета или человека.',
  uk: 'Іспанський прикметник уміє змінювати закінчення залежно від роду того, що він описує. Bonito описує предмет чи людину чоловічого роду, а bonita — жіночого: та сама якість «красивий», два різні закінчення. Закінчення ознаки залежить від роду того, що описують, — це єдине правило, яке тут потрібно запам’ятати. Воно не залежить ні від того, хто говорить, ні від часу доби, ні від жодної іншої умови — тільки від роду самого предмета чи людини.',
  es: 'A Spanish adjective can change its ending depending on the gender of what it describes. Bonito describes a masculine noun or person, and bonita describes a feminine one: the same quality "pretty", two different endings. The ending of the quality depends on the gender of what is being described — that is the one rule to remember here. It does not depend on who is speaking, on the time of day, or on any other condition — only on the gender of the noun or person itself.',
  'pt-BR': 'Um adjetivo em espanhol pode mudar a terminação conforme o gênero daquilo que descreve. Bonito descreve um substantivo ou pessoa masculina, e bonita descreve um feminino: a mesma qualidade "bonito", duas terminações diferentes. A terminação da qualidade depende do gênero daquilo que se descreve — essa é a única regra a lembrar aqui. Ela não depende de quem fala, nem da hora do dia, nem de qualquer outra condição — só do gênero do próprio substantivo ou pessoa.',
  vi: 'Một tính từ tiếng Tây Ban Nha có thể đổi đuôi tùy theo giống của thứ mà nó mô tả. Bonito mô tả một danh từ hay người giống đực, còn bonita mô tả giống cái: cùng một đặc điểm "đẹp", hai đuôi khác nhau. Đuôi của đặc điểm phụ thuộc vào giống của thứ được mô tả — đó là quy tắc duy nhất cần nhớ ở đây. Nó không phụ thuộc vào ai đang nói, không phụ thuộc vào thời gian trong ngày, hay bất kỳ điều kiện nào khác — chỉ phụ thuộc vào giống của chính danh từ hay người đó.',
  id: 'Kata sifat dalam bahasa Spanyol dapat mengubah akhirannya tergantung gender dari apa yang dideskripsikannya. Bonito mendeskripsikan kata benda atau orang maskulin, dan bonita mendeskripsikan yang feminin: sifat yang sama "cantik", dua akhiran berbeda. Akhiran sifat bergantung pada gender dari apa yang dideskripsikan — itulah satu-satunya aturan yang perlu diingat di sini. Itu tidak bergantung pada siapa yang berbicara, bukan pada waktu dalam sehari, dan bukan pada kondisi lain apa pun — hanya pada gender dari kata benda atau orang itu sendiri.',
  tr: 'İspanyolca bir sıfat, tanımladığı şeyin cinsiyetine göre sonunu değiştirebilir. Bonito eril bir isim veya kişiyi tanımlar, bonita ise dişil olanı: aynı "güzel" niteliği, iki farklı son ek. Niteliğin sonu, tanımlanan şeyin cinsiyetine bağlıdır — burada hatırlanması gereken tek kural budur. Konuşan kişiye, günün saatine ya da başka herhangi bir koşula değil, yalnızca ismin ya da kişinin kendi cinsiyetine bağlıdır.',
  pl: 'Hiszpański przymiotnik potrafi zmieniać końcówkę w zależności od rodzaju tego, co opisuje. Bonito opisuje rzeczownik lub osobę rodzaju męskiego, a bonita — żeńskiego: ta sama cecha „ładny”, dwie różne końcówki. Końcówka cechy zależy od rodzaju tego, co się opisuje — to jedyna zasada, którą trzeba tu zapamiętać. Nie zależy ona ani od tego, kto mówi, ani od pory dnia, ani od żadnego innego warunku — wyłącznie od rodzaju samego rzeczownika lub osoby.',
});

const FORMULA_BODY = L({
  ru: 'Формула согласования короткая: концовка -o стоит для мужского рода, концовка -a — для женского. Bonito пишет -o, bonita меняет ровно одну букву на -a — больше в слове ничего не меняется. Чтобы получить форму женского рода из bonito, нужно заменить -o на -a: это и есть весь шаг целиком, без добавления новых букв и без изменения начала слова. Связка es от рода вообще не зависит и остаётся неизменной в обоих случаях — меняется только признак, а не связка перед ним.',
  uk: 'Формула узгодження коротка: закінчення -o стоїть для чоловічого роду, закінчення -a — для жіночого. Bonito пише -o, bonita змінює рівно одну літеру на -a — більше в слові нічого не змінюється. Щоб отримати форму жіночого роду з bonito, потрібно замінити -o на -a: це і є весь крок цілком, без додавання нових літер і без зміни початку слова. Зв’язка es від роду взагалі не залежить і лишається незмінною в обох випадках — змінюється лише ознака, а не зв’язка перед нею.',
  es: 'The agreement formula is short: the ending -o is for masculine, the ending -a is for feminine. Bonito writes -o, and bonita changes exactly one letter to -a — nothing else in the word changes. To get the feminine form from bonito, you need to change -o to -a: that is the entire step, with no new letters added and no change to the start of the word. The linking word es does not depend on gender at all and stays the same in both cases — only the quality changes, not the linking word in front of it.',
  'pt-BR': 'A fórmula de concordância é curta: a terminação -o é para masculino, a terminação -a é para feminino. Bonito escreve -o, e bonita muda exatamente uma letra para -a — nada mais na palavra muda. Para obter a forma feminina a partir de bonito, é preciso trocar -o por -a: esse é o passo inteiro, sem adicionar letras novas e sem mudar o início da palavra. A ligação es não depende do gênero de jeito nenhum e permanece igual nos dois casos — só a qualidade muda, não a ligação antes dela.',
  vi: 'Công thức hòa hợp rất ngắn: đuôi -o dành cho giống đực, đuôi -a dành cho giống cái. Bonito viết -o, còn bonita chỉ đổi đúng một chữ cái thành -a — không gì khác trong từ thay đổi. Để có dạng giống cái từ bonito, cần đổi -o thành -a: đó là toàn bộ bước cần làm, không thêm chữ cái mới và không đổi phần đầu của từ. Từ nối es hoàn toàn không phụ thuộc vào giống và giữ nguyên trong cả hai trường hợp — chỉ đặc điểm thay đổi, không phải từ nối đứng trước nó.',
  id: 'Rumus kesesuaiannya singkat: akhiran -o untuk maskulin, akhiran -a untuk feminin. Bonito menulis -o, dan bonita mengubah tepat satu huruf menjadi -a — tidak ada yang lain dalam kata itu yang berubah. Untuk mendapatkan bentuk feminin dari bonito, perlu mengganti -o menjadi -a: itulah keseluruhan langkahnya, tanpa menambahkan huruf baru dan tanpa mengubah awal kata. Kata penghubung es sama sekali tidak bergantung pada gender dan tetap sama di kedua kasus — hanya sifatnya yang berubah, bukan kata penghubung di depannya.',
  tr: 'Uyum formülü kısadır: -o son eki eril için, -a son eki dişil içindir. Bonito -o yazar, bonita ise tam olarak tek bir harfi -a olarak değiştirir — kelimede başka hiçbir şey değişmez. Bonito’dan dişil biçimi elde etmek için -o’yu -a ile değiştirmek gerekir: bütün adım budur, yeni harf eklenmez ve kelimenin başı değişmez. Es bağlacı cinsiyete hiç bağlı değildir ve her iki durumda da aynı kalır — yalnızca nitelik değişir, önündeki bağlaç değişmez.',
  pl: 'Formuła zgodności jest krótka: końcówka -o jest dla rodzaju męskiego, końcówka -a — dla żeńskiego. Bonito pisze -o, a bonita zmienia dokładnie jedną literę na -a — nic więcej w słowie się nie zmienia. Aby uzyskać formę żeńską z bonito, trzeba zamienić -o na -a: to cały krok, bez dodawania nowych liter i bez zmiany początku słowa. Łącznik es wcale nie zależy od rodzaju i pozostaje taki sam w obu przypadkach — zmienia się tylko cecha, a nie łącznik przed nią.',
});

const TRAP_BODY = L({
  ru: 'Слово fácil — «лёгкий» — никогда не меняет концовку по роду: и про предмет мужского рода, и про предмет женского рода говорят одинаково fácil. Bonito и bonita ведут себя иначе: они меняются всегда, потому что принадлежат к другому классу прилагательных — с явной концовкой -o/-a. Разница видна прямо в написании: fácil из уже известных слов НИКОГДА не меняется по роду, а bonito/bonita меняются в каждом случае, когда меняется род того, о чём идёт речь. Проверка простая: если предмет или человек мужского рода, нужна форма на -o; если женского — форма на -a, а fácil в обоих случаях остаётся прежним.',
  uk: 'Слово fácil — «легкий» — ніколи не змінює закінчення за родом: і про предмет чоловічого роду, і про предмет жіночого роду кажуть однаково fácil. Bonito і bonita поводяться інакше: вони змінюються завжди, бо належать до іншого класу прикметників — з явним закінченням -o/-a. Різниця видна прямо в написанні: fácil з уже відомих слів НІКОЛИ не змінюється за родом, а bonito/bonita змінюються в кожному випадку, коли змінюється рід того, про що йдеться. Перевірка проста: якщо предмет чи людина чоловічого роду, потрібна форма на -o; якщо жіночого — форма на -a, а fácil в обох випадках лишається незмінним.',
  es: 'The word fácil — "easy" — never changes its ending for gender: a masculine noun and a feminine noun are both described the same way, fácil. Bonito and bonita behave differently: they always change, because they belong to a different class of adjectives — with an explicit -o/-a ending. The difference shows right in the spelling: fácil, among the words already known, NEVER changes for gender, while bonito/bonita change every time the gender of what is being described changes. The check is simple: if a noun or person is masculine, the -o form is needed; if feminine, the -a form is needed, while fácil stays the same in both cases.',
  'pt-BR': 'A palavra fácil — "fácil" — nunca muda a terminação por gênero: um substantivo masculino e um feminino são descritos do mesmo jeito, fácil. Bonito e bonita se comportam diferente: sempre mudam, porque pertencem a outra classe de adjetivos — com terminação explícita -o/-a. A diferença aparece direto na escrita: fácil, entre as palavras já conhecidas, NUNCA muda de gênero, enquanto bonito/bonita mudam toda vez que o gênero daquilo que se descreve muda. A checagem é simples: se um substantivo ou pessoa é masculino, precisa da forma em -o; se feminino, precisa da forma em -a, e fácil permanece igual nos dois casos.',
  vi: 'Từ fácil — "dễ" — không bao giờ đổi đuôi theo giống: một danh từ giống đực và một danh từ giống cái đều được mô tả giống nhau, fácil. Bonito và bonita hoạt động khác: chúng luôn thay đổi, vì thuộc một lớp tính từ khác — có đuôi -o/-a rõ ràng. Sự khác biệt thể hiện ngay trong cách viết: fácil, trong số các từ đã biết, KHÔNG BAO GIỜ đổi theo giống, còn bonito/bonita thay đổi mỗi khi giống của thứ được mô tả thay đổi. Cách kiểm tra đơn giản: nếu một danh từ hay người là giống đực, cần dạng -o; nếu giống cái, cần dạng -a, còn fácil vẫn giữ nguyên trong cả hai trường hợp.',
  id: 'Kata fácil — "mudah" — tidak pernah mengubah akhirannya menurut gender: kata benda maskulin dan feminin sama-sama dideskripsikan dengan cara yang sama, fácil. Bonito dan bonita berperilaku berbeda: keduanya selalu berubah, karena termasuk kelas kata sifat lain — dengan akhiran -o/-a yang jelas. Perbedaannya terlihat langsung dari ejaannya: fácil, di antara kata-kata yang sudah dikenal, TIDAK PERNAH berubah menurut gender, sedangkan bonito/bonita berubah setiap kali gender dari apa yang dideskripsikan berubah. Pengecekannya sederhana: jika kata benda atau orang itu maskulin, diperlukan bentuk -o; jika feminin, diperlukan bentuk -a, sedangkan fácil tetap sama di kedua kasus.',
  tr: 'Fácil — "kolay" — sözcüğü cinsiyete göre sonunu asla değiştirmez: eril bir isim ile dişil bir isim aynı şekilde, fácil olarak anlatılır. Bonito ve bonita farklı davranır: her zaman değişirler, çünkü açık bir -o/-a son ekine sahip farklı bir sıfat sınıfına aittir. Fark doğrudan yazımda görülür: bilinen kelimeler arasında fácil cinsiyete göre ASLA değişmez, bonito/bonita ise tanımlanan şeyin cinsiyeti her değiştiğinde değişir. Kontrol basittir: bir isim ya da kişi erilse -o biçimi, dişilse -a biçimi gerekir, fácil ise her iki durumda da aynı kalır.',
  pl: 'Słowo fácil — „łatwy” — nigdy nie zmienia końcówki przez rodzaj: rzeczownik męski i żeński opisuje się tak samo, fácil. Bonito i bonita zachowują się inaczej: zawsze się zmieniają, bo należą do innej klasy przymiotników — z wyraźną końcówką -o/-a. Różnica widać wprost w pisowni: fácil, spośród już znanych słów, NIGDY nie zmienia się przez rodzaj, a bonito/bonita zmieniają się za każdym razem, gdy zmienia się rodzaj tego, o czym mowa. Sprawdzenie jest proste: jeśli rzeczownik lub osoba jest rodzaju męskiego, potrzebna jest forma na -o; jeśli żeńskiego — forma na -a, a fácil w obu przypadkach pozostaje takie samo.',
});

export const ES_EPISODE_01_SESSION_03_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Признак меняется по роду',
      uk: 'Ознака змінюється за родом',
      es: 'A quality changes by gender',
      'pt-BR': 'A qualidade muda por gênero',
      vi: 'Đặc điểm đổi theo giống',
      id: 'Sifat berubah menurut gender',
      tr: 'Nitelik cinsiyete göre değişir',
      pl: 'Cecha zmienia się przez rodzaj',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Испанское прилагательное умеет менять концовку в зависимости от рода того, что оно описывает. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' описывает предмет или человека мужского рода, а ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' — женского: одно и то же качество «красивый», две разные концовки. Концовка признака зависит от рода того, что описывают, — вот единственное правило, которое здесь нужно запомнить. Оно не зависит ни от того, кто говорит, ни от времени суток, ни от какого-либо другого условия — только от рода самого предмета или человека.', semantic: 'explanation' }),
      uk: R({ text: 'Іспанський прикметник уміє змінювати закінчення залежно від роду того, що він описує. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' описує предмет чи людину чоловічого роду, а ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' — жіночого: та сама якість «красивий», два різні закінчення. Закінчення ознаки залежить від роду того, що описують, — це єдине правило, яке тут потрібно запам’ятати. Воно не залежить ні від того, хто говорить, ні від часу доби, ні від жодної іншої умови — тільки від роду самого предмета чи людини.', semantic: 'explanation' }),
      es: R({ text: 'A Spanish adjective can change its ending depending on the gender of what it describes. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' describes a masculine noun or person, and ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' describes a feminine one: the same quality "pretty", two different endings. The ending of the quality depends on the gender of what is being described — that is the one rule to remember here. It does not depend on who is speaking, on the time of day, or on any other condition — only on the gender of the noun or person itself.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um adjetivo em espanhol pode mudar a terminação conforme o gênero daquilo que descreve. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' descreve um substantivo ou pessoa masculina, e ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' descreve um feminino: a mesma qualidade "bonito", duas terminações diferentes. A terminação da qualidade depende do gênero daquilo que se descreve — essa é a única regra a lembrar aqui. Ela não depende de quem fala, nem da hora do dia, nem de qualquer outra condição — só do gênero do próprio substantivo ou pessoa.', semantic: 'explanation' }),
      vi: R({ text: 'Một tính từ tiếng Tây Ban Nha có thể đổi đuôi tùy theo giống của thứ mà nó mô tả. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' mô tả một danh từ hay người giống đực, còn ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' mô tả giống cái: cùng một đặc điểm "đẹp", hai đuôi khác nhau. Đuôi của đặc điểm phụ thuộc vào giống của thứ được mô tả — đó là quy tắc duy nhất cần nhớ ở đây. Nó không phụ thuộc vào ai đang nói, không phụ thuộc vào thời gian trong ngày, hay bất kỳ điều kiện nào khác — chỉ phụ thuộc vào giống của chính danh từ hay người đó.', semantic: 'explanation' }),
      id: R({ text: 'Kata sifat dalam bahasa Spanyol dapat mengubah akhirannya tergantung gender dari apa yang dideskripsikannya. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' mendeskripsikan kata benda atau orang maskulin, dan ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' mendeskripsikan yang feminin: sifat yang sama "cantik", dua akhiran berbeda. Akhiran sifat bergantung pada gender dari apa yang dideskripsikan — itulah satu-satunya aturan yang perlu diingat di sini. Itu tidak bergantung pada siapa yang berbicara, bukan pada waktu dalam sehari, dan bukan pada kondisi lain apa pun — hanya pada gender dari kata benda atau orang itu sendiri.', semantic: 'explanation' }),
      tr: R({ text: 'İspanyolca bir sıfat, tanımladığı şeyin cinsiyetine göre sonunu değiştirebilir. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' eril bir isim veya kişiyi tanımlar, ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' ise dişil olanı: aynı "güzel" niteliği, iki farklı son ek. Niteliğin sonu, tanımlanan şeyin cinsiyetine bağlıdır — burada hatırlanması gereken tek kural budur. Konuşan kişiye, günün saatine ya da başka herhangi bir koşula değil, yalnızca ismin ya da kişinin kendi cinsiyetine bağlıdır.', semantic: 'explanation' }),
      pl: R({ text: 'Hiszpański przymiotnik potrafi zmieniać końcówkę w zależności od rodzaju tego, co opisuje. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' opisuje rzeczownik lub osobę rodzaju męskiego, a ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' — żeńskiego: ta sama cecha „ładny”, dwie różne końcówki. Końcówka cechy zależy od rodzaju tego, co się opisuje — to jedyna zasada, którą trzeba tu zapamiętać. Nie zależy ona ani od tego, kto mówi, ani od pory dnia, ani od żadnego innego warunku — wyłącznie od rodzaju samego rzeczownika lub osoby.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'От чего зависит концовка испанского признака?',
        uk: 'Від чого залежить закінчення іспанської ознаки?',
        es: 'What does the ending of a Spanish quality depend on?',
        'pt-BR': 'Do que depende a terminação de uma qualidade em espanhol?',
        vi: 'Đuôi của một đặc điểm tiếng Tây Ban Nha phụ thuộc vào điều gì?',
        id: 'Akhiran sebuah sifat dalam bahasa Spanyol bergantung pada apa?',
        tr: 'İspanyolca bir niteliğin sonu neye bağlıdır?',
        pl: 'Od czego zależy końcówka hiszpańskiej cechy?',
      }),
      choices: [
        L({ ru: 'От рода того, что описывают', uk: 'Від роду того, що описують', es: 'On the gender of what is being described', 'pt-BR': 'Do gênero daquilo que se descreve', vi: 'Vào giống của thứ được mô tả', id: 'Pada gender dari apa yang dideskripsikan', tr: 'Tanımlanan şeyin cinsiyetine', pl: 'Od rodzaju tego, co się opisuje' }),
        L({ ru: 'От того, кто говорит', uk: 'Від того, хто говорить', es: 'On who is speaking', 'pt-BR': 'De quem fala', vi: 'Vào ai đang nói', id: 'Pada siapa yang berbicara', tr: 'Konuşan kişiye', pl: 'Od tego, kto mówi' }),
        L({ ru: 'От времени суток', uk: 'Від часу доби', es: 'On the time of day', 'pt-BR': 'Da hora do dia', vi: 'Vào thời gian trong ngày', id: 'Pada waktu dalam sehari', tr: 'Günün saatine', pl: 'Od pory dnia' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Концовка признака зависит от рода того, что описывают, — не от говорящего и не от времени.',
        uk: 'Закінчення ознаки залежить від роду того, що описують, — не від мовця і не від часу.',
        es: 'The ending of a quality depends on the gender of what is being described — not on the speaker, not on time.',
        'pt-BR': 'A terminação de uma qualidade depende do gênero daquilo que se descreve — não de quem fala, nem da hora.',
        vi: 'Đuôi của một đặc điểm phụ thuộc vào giống của thứ được mô tả — không phụ thuộc vào người nói, không phụ thuộc vào thời gian.',
        id: 'Akhiran sebuah sifat bergantung pada gender dari apa yang dideskripsikan — bukan pada penutur, bukan pada waktu.',
        tr: 'Bir niteliğin sonu, tanımlanan şeyin cinsiyetine bağlıdır — konuşana ya da zamana değil.',
        pl: 'Końcówka cechy zależy od rodzaju tego, co się opisuje — nie od mówiącego i nie od pory.',
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
      ru: R({ text: 'Формула согласования короткая: концовка -o стоит для мужского рода, концовка -a — для женского. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' пишет -o, ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' меняет ровно одну букву на -a — больше в слове ничего не меняется. Чтобы получить форму женского рода из bonito, нужно заменить -o на -a: это и есть весь шаг целиком, без добавления новых букв и без изменения начала слова. Связка es от рода вообще не зависит и остаётся неизменной в обоих случаях — меняется только признак, а не связка перед ним.', semantic: 'explanation' }),
      uk: R({ text: 'Формула узгодження коротка: закінчення -o стоїть для чоловічого роду, закінчення -a — для жіночого. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' пише -o, ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' змінює рівно одну літеру на -a — більше в слові нічого не змінюється. Щоб отримати форму жіночого роду з bonito, потрібно замінити -o на -a: це і є весь крок цілком, без додавання нових літер і без зміни початку слова. Зв’язка es від роду взагалі не залежить і лишається незмінною в обох випадках — змінюється лише ознака, а не зв’язка перед нею.', semantic: 'explanation' }),
      es: R({ text: 'The agreement formula is short: the ending -o is for masculine, the ending -a is for feminine. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' writes -o, and ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' changes exactly one letter to -a — nothing else in the word changes. To get the feminine form from bonito, you need to change -o to -a: that is the entire step, with no new letters added and no change to the start of the word. The linking word es does not depend on gender at all and stays the same in both cases — only the quality changes, not the linking word in front of it.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de concordância é curta: a terminação -o é para masculino, a terminação -a é para feminino. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' escreve -o, e ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' muda exatamente uma letra para -a — nada mais na palavra muda. Para obter a forma feminina a partir de bonito, é preciso trocar -o por -a: esse é o passo inteiro, sem adicionar letras novas e sem mudar o início da palavra. A ligação es não depende do gênero de jeito nenhum e permanece igual nos dois casos — só a qualidade muda, não a ligação antes dela.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức hòa hợp rất ngắn: đuôi -o dành cho giống đực, đuôi -a dành cho giống cái. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' viết -o, còn ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' chỉ đổi đúng một chữ cái thành -a — không gì khác trong từ thay đổi. Để có dạng giống cái từ bonito, cần đổi -o thành -a: đó là toàn bộ bước cần làm, không thêm chữ cái mới và không đổi phần đầu của từ. Từ nối es hoàn toàn không phụ thuộc vào giống và giữ nguyên trong cả hai trường hợp — chỉ đặc điểm thay đổi, không phải từ nối đứng trước nó.', semantic: 'explanation' }),
      id: R({ text: 'Rumus kesesuaiannya singkat: akhiran -o untuk maskulin, akhiran -a untuk feminin. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' menulis -o, dan ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' mengubah tepat satu huruf menjadi -a — tidak ada yang lain dalam kata itu yang berubah. Untuk mendapatkan bentuk feminin dari bonito, perlu mengganti -o menjadi -a: itulah keseluruhan langkahnya, tanpa menambahkan huruf baru dan tanpa mengubah awal kata. Kata penghubung es sama sekali tidak bergantung pada gender dan tetap sama di kedua kasus — hanya sifatnya yang berubah, bukan kata penghubung di depannya.', semantic: 'explanation' }),
      tr: R({ text: 'Uyum formülü kısadır: -o son eki eril için, -a son eki dişil içindir. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' -o yazar, ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' ise tam olarak tek bir harfi -a olarak değiştirir — kelimede başka hiçbir şey değişmez. Bonito’dan dişil biçimi elde etmek için -o’yu -a ile değiştirmek gerekir: bütün adım budur, yeni harf eklenmez ve kelimenin başı değişmez. Es bağlacı cinsiyete hiç bağlı değildir ve her iki durumda da aynı kalır — yalnızca nitelik değişir, önündeki bağlaç değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła zgodności jest krótka: końcówka -o jest dla rodzaju męskiego, końcówka -a — dla żeńskiego. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' pisze -o, a ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' zmienia dokładnie jedną literę na -a — nic więcej w słowie się nie zmienia. Aby uzyskać formę żeńską z bonito, trzeba zamienić -o na -a: to cały krok, bez dodawania nowych liter i bez zmiany początku słowa. Łącznik es wcale nie zależy od rodzaju i pozostaje taki sam w obu przypadkach — zmienia się tylko cecha, a nie łącznik przed nią.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что нужно поменять, чтобы получить форму женского рода из bonito?',
        uk: 'Що потрібно змінити, щоб отримати форму жіночого роду з bonito?',
        es: 'What needs to change to get the feminine form from bonito?',
        'pt-BR': 'O que precisa mudar para obter a forma feminina a partir de bonito?',
        vi: 'Cần thay đổi gì để có dạng giống cái từ bonito?',
        id: 'Apa yang perlu diubah untuk mendapatkan bentuk feminin dari bonito?',
        tr: 'Bonito’dan dişil biçimi elde etmek için ne değişmelidir?',
        pl: 'Co trzeba zmienić, aby uzyskać formę żeńską z bonito?',
      }),
      choices: [
        L({ ru: 'Заменить -o на -a', uk: 'Замінити -o на -a', es: 'Change -o to -a', 'pt-BR': 'Trocar -o por -a', vi: 'Đổi -o thành -a', id: 'Mengganti -o menjadi -a', tr: '-o’yu -a ile değiştirmek', pl: 'Zamienić -o na -a' }),
        L({ ru: 'Добавить букву n на конце', uk: 'Додати літеру n наприкінці', es: 'Add a letter n at the end', 'pt-BR': 'Adicionar uma letra n no final', vi: 'Thêm chữ n vào cuối', id: 'Menambahkan huruf n di akhir', tr: 'Sona n harfi eklemek', pl: 'Dodać literę n na końcu' }),
        L({ ru: 'Ничего не менять', uk: 'Нічого не змінювати', es: 'Change nothing', 'pt-BR': 'Não mudar nada', vi: 'Không đổi gì cả', id: 'Tidak mengubah apa pun', tr: 'Hiçbir şeyi değiştirmemek', pl: 'Nic nie zmieniać' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Ровно одна замена: -o становится -a. Ничего не добавляется и не остаётся прежним.',
        uk: 'Рівно одна заміна: -o стає -a. Нічого не додається і не лишається незмінним.',
        es: 'Exactly one change: -o becomes -a. Nothing is added, and nothing stays the same.',
        'pt-BR': 'Exatamente uma mudança: -o vira -a. Nada é adicionado, e nada permanece igual.',
        vi: 'Đúng một thay đổi: -o thành -a. Không có gì được thêm vào, và không có gì giữ nguyên.',
        id: 'Tepat satu perubahan: -o menjadi -a. Tidak ada yang ditambahkan, dan tidak ada yang tetap sama.',
        tr: 'Doğru cevap -o’yu -a ile değiştirmektir: bonito, bonita olur, çünkü tam olarak bir değişiklik yeterlidir. Sona harf eklemek yanlıştır, çünkü İspanyolca dişil sıfat -a ile biter, -n ile değil; hiçbir şeyi değiştirmemek de yanlıştır, çünkü eril ve dişil biçim farklı yazılır.',
        pl: 'Dokładnie jedna zmiana: -o staje się -a. Nic nie jest dodawane i nic nie zostaje takie samo.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не путать с неизменным fácil',
      uk: 'Не плутати з незмінним fácil',
      es: 'Do not confuse with invariable fácil',
      'pt-BR': 'Não confundir com o invariável fácil',
      vi: 'Đừng nhầm với fácil bất biến',
      id: 'Jangan tertukar dengan fácil yang tidak berubah',
      tr: 'Değişmeyen fácil ile karıştırmayın',
      pl: 'Nie mylić z niezmiennym fácil',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — «лёгкий» — никогда не меняет концовку по роду: и про предмет мужского рода, и про предмет женского рода говорят одинаково ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: '. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' и ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' ведут себя иначе: они меняются всегда, потому что принадлежат к другому классу прилагательных — с явной концовкой -o/-a. Разница видна прямо в написании: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' из уже известных слов НИКОГДА не меняется по роду, а ', semantic: 'explanation' }, { text: 'bonito', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' меняются в каждом случае, когда меняется род того, о чём идёт речь. Проверка простая: если предмет или человек мужского рода, нужна форма на -o; если женского — форма на -a, а ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' в обоих случаях остаётся прежним.', semantic: 'explanation' }),
      uk: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — «легкий» — ніколи не змінює закінчення за родом: і про предмет чоловічого роду, і про предмет жіночого роду кажуть однаково ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: '. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' і ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' поводяться інакше: вони змінюються завжди, бо належать до іншого класу прикметників — з явним закінченням -o/-a. Різниця видна прямо в написанні: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' з уже відомих слів НІКОЛИ не змінюється за родом, а ', semantic: 'explanation' }, { text: 'bonito', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' змінюються в кожному випадку, коли змінюється рід того, про що йдеться. Перевірка проста: якщо предмет чи людина чоловічого роду, потрібна форма на -o; якщо жіночого — форма на -a, а ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' в обох випадках лишається незмінним.', semantic: 'explanation' }),
      es: R({ text: 'The word ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — "easy" — never changes its ending for gender: a masculine noun and a feminine noun are both described the same way, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: '. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' and ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' behave differently: they always change, because they belong to a different class of adjectives — with an explicit -o/-a ending. The difference shows right in the spelling: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', among the words already known, NEVER changes for gender, while ', semantic: 'explanation' }, { text: 'bonito', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' change every time the gender of what is being described changes. The check is simple: if a noun or person is masculine, the -o form is needed; if feminine, the -a form is needed, while ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' stays the same in both cases.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A palavra ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — "fácil" — nunca muda a terminação por gênero: um substantivo masculino e um feminino são descritos do mesmo jeito, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: '. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' e ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' se comportam diferente: sempre mudam, porque pertencem a outra classe de adjetivos — com terminação explícita -o/-a. A diferença aparece direto na escrita: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', entre as palavras já conhecidas, NUNCA muda de gênero, enquanto ', semantic: 'explanation' }, { text: 'bonito', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' mudam toda vez que o gênero daquilo que se descreve muda. A checagem é simples: se um substantivo ou pessoa é masculino, precisa da forma em -o; se feminino, precisa da forma em -a, e ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' permanece igual nos dois casos.', semantic: 'explanation' }),
      vi: R({ text: 'Từ ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — "dễ" — không bao giờ đổi đuôi theo giống: một danh từ giống đực và một danh từ giống cái đều được mô tả giống nhau, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: '. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' và ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' hoạt động khác: chúng luôn thay đổi, vì thuộc một lớp tính từ khác — có đuôi -o/-a rõ ràng. Sự khác biệt thể hiện ngay trong cách viết: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', trong số các từ đã biết, KHÔNG BAO GIỜ đổi theo giống, còn ', semantic: 'explanation' }, { text: 'bonito', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' thay đổi mỗi khi giống của thứ được mô tả thay đổi. Cách kiểm tra đơn giản: nếu một danh từ hay người là giống đực, cần dạng -o; nếu giống cái, cần dạng -a, còn ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' vẫn giữ nguyên trong cả hai trường hợp.', semantic: 'explanation' }),
      id: R({ text: 'Kata ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — "mudah" — tidak pernah mengubah akhirannya menurut gender: kata benda maskulin dan feminin sama-sama dideskripsikan dengan cara yang sama, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: '. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' berperilaku berbeda: keduanya selalu berubah, karena termasuk kelas kata sifat lain — dengan akhiran -o/-a yang jelas. Perbedaannya terlihat langsung dari ejaannya: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', di antara kata-kata yang sudah dikenal, TIDAK PERNAH berubah menurut gender, sedangkan ', semantic: 'explanation' }, { text: 'bonito', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' berubah setiap kali gender dari apa yang dideskripsikan berubah. Pengecekannya sederhana: jika kata benda atau orang itu maskulin, diperlukan bentuk -o; jika feminin, diperlukan bentuk -a, sedangkan ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' tetap sama di kedua kasus.', semantic: 'explanation' }),
      tr: R({ text: 'Fácil', semantic: 'targetWrong' }, { text: ' — "kolay" — sözcüğü cinsiyete göre sonunu asla değiştirmez: eril bir isim ile dişil bir isim aynı şekilde, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' olarak anlatılır. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' ve ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' farklı davranır: her zaman değişirler, çünkü açık bir -o/-a son ekine sahip farklı bir sıfat sınıfına aittir. Fark doğrudan yazımda görülür: bilinen kelimeler arasında ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' cinsiyete göre ASLA değişmez, ', semantic: 'explanation' }, { text: 'bonito', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' ise tanımlanan şeyin cinsiyeti her değiştiğinde değişir. Kontrol basittir: bir isim ya da kişi erilse -o biçimi, dişilse -a biçimi gerekir, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' ise her iki durumda da aynı kalır.', semantic: 'explanation' }),
      pl: R({ text: 'Słowo ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' — „łatwy” — nigdy nie zmienia końcówki przez rodzaj: rzeczownik męski i żeński opisuje się tak samo, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: '. ', semantic: 'explanation' }, { text: 'Bonito', semantic: 'targetCorrect' }, { text: ' i ', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' zachowują się inaczej: zawsze się zmieniają, bo należą do innej klasy przymiotników — z wyraźną końcówką -o/-a. Różnica widać wprost w pisowni: ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', spośród już znanych słów, NIGDY nie zmienia się przez rodzaj, a ', semantic: 'explanation' }, { text: 'bonito', semantic: 'targetCorrect' }, { text: '/', semantic: 'explanation' }, { text: 'bonita', semantic: 'targetCorrect' }, { text: ' zmieniają się za każdym razem, gdy zmienia się rodzaj tego, o czym mowa. Sprawdzenie jest proste: jeśli rzeczownik lub osoba jest rodzaju męskiego, potrzebna jest forma na -o; jeśli żeńskiego — forma na -a, a ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' w obu przypadkach pozostaje takie samo.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое слово из уже известных НИКОГДА не меняется по роду?',
        uk: 'Яке з уже відомих слів НІКОЛИ не змінюється за родом?',
        es: 'Which already-known word NEVER changes for gender?',
        'pt-BR': 'Qual palavra já conhecida NUNCA muda de gênero?',
        vi: 'Từ nào đã biết KHÔNG BAO GIỜ đổi theo giống?',
        id: 'Kata mana yang sudah dikenal TIDAK PERNAH berubah menurut gender?',
        tr: 'Bilinen kelimelerden hangisi cinsiyete göre ASLA değişmez?',
        pl: 'Które ze znanych już słów NIGDY nie zmienia się przez rodzaj?',
      }),
      choices: [
        L({ ru: 'fácil', uk: 'fácil', es: 'fácil', 'pt-BR': 'fácil', vi: 'fácil', id: 'fácil', tr: 'fácil', pl: 'fácil' }),
        L({ ru: 'bonito', uk: 'bonito', es: 'bonito', 'pt-BR': 'bonito', vi: 'bonito', id: 'bonito', tr: 'bonito', pl: 'bonito' }),
        L({ ru: 'bonita', uk: 'bonita', es: 'bonita', 'pt-BR': 'bonita', vi: 'bonita', id: 'bonita', tr: 'bonita', pl: 'bonita' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Fácil одинаково пишется для любого рода. Bonito и bonita — как раз пара, которая меняется по роду.',
        uk: 'Fácil однаково пишеться для будь-якого роду. Bonito і bonita — якраз пара, яка змінюється за родом.',
        es: 'Fácil is spelled the same for any gender. Bonito and bonita are exactly the pair that changes by gender.',
        'pt-BR': 'Fácil se escreve igual para qualquer gênero. Bonito e bonita são exatamente o par que muda por gênero.',
        vi: 'Fácil được viết giống nhau cho mọi giống. Bonito và bonita chính là cặp thay đổi theo giống.',
        id: 'Fácil dieja sama untuk gender apa pun. Bonito dan bonita justru pasangan yang berubah menurut gender.',
        tr: 'Fácil her cinsiyet için aynı yazılır. Bonito ve bonita ise tam olarak cinsiyete göre değişen çifttir.',
        pl: 'Fácil pisze się tak samo dla każdego rodzaju. Bonito i bonita to właśnie para, która zmienia się przez rodzaj.',
      }),
    },
  },
];
