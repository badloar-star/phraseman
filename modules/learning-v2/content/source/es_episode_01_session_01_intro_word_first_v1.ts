import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, word-first перепись): копирует
// структуру episode_01_session_01_intro_word_first_v1.ts (английский курс,
// первый готовый образец паттерна) — три страницы concept/formula/trap,
// каждая объясняет одно слово из ES_EPISODE_01_SESSION_01_VOCABULARY_V1
// (es, soy, fácil), четвёртое слово (verdad) получает разбор только через
// word-first контакты, без отдельной интро-страницы — так же, как в
// английском эталоне интро не покрывает 'ready'.
//
// зачем 'es' дублирует 'en', а pt-BR/vi/id/tr/pl — НЕТ (исправление
// 2026-08-24 после провала machine quality gate intro_locale_not_independent):
// 'es' — целевой язык курса, не локаль объяснения, поэтому в нём стоит
// полноценный английский текст (тот же принцип, что и во всём остальном
// испанском контуре). А вот pt-BR/vi/id/tr/pl — РЕАЛЬНЫЕ локали объяснения:
// каждая написана независимо на своём языке, не скопирована с английского.
// Первая версия этого файла ошибочно продублировала английский текст во все
// пять — машинная проверка качества поймала это дословным совпадением с 'es'.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_TITLE = L({
  ru: 'Это легко',
  uk: 'Це легко',
  es: 'It is easy',
  'pt-BR': 'É fácil',
  vi: 'Điều này dễ',
  id: 'Ini mudah',
  tr: 'Bu kolay',
  pl: 'To jest łatwe',
});

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_SUMMARY = L({
  ru: 'Три коротких испанских слова сначала становятся понятными по отдельности, а затем соединяются в оценку.',
  uk: 'Три коротких іспанських слова спершу стають зрозумілими окремо, а потім з’єднуються в оцінку.',
  es: 'Three short Spanish words become clear separately before joining into a verdict.',
  'pt-BR': 'Três palavras curtas do espanhol primeiro ficam claras separadamente, depois se juntam num veredito.',
  vi: 'Ba từ tiếng Tây Ban Nha ngắn trước tiên trở nên rõ ràng riêng lẻ, sau đó ghép thành một nhận định.',
  id: 'Tiga kata pendek dalam bahasa Spanyol dipahami satu per satu dulu, baru kemudian digabungkan menjadi sebuah penilaian.',
  tr: 'Üç kısa İspanyolca sözcük önce ayrı ayrı anlaşılır, sonra bir yargıda birleşir.',
  pl: 'Trzy krótkie hiszpańskie słowa najpierw stają się jasne osobno, a potem łączą się w osąd.',
});

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать es, soy и fácil, а затем правильно соединить их.',
  uk: 'Упізнати на слух, зрозуміти й точно написати es, soy та fácil, а потім правильно їх поєднати.',
  es: 'Recognize, understand, and write es, soy, and fácil before combining them correctly.',
  'pt-BR': 'Reconhecer de ouvido, entender e escrever corretamente es, soy e fácil, depois combiná-los certo.',
  vi: 'Nghe ra, hiểu và viết đúng es, soy và fácil, sau đó ghép chúng chính xác.',
  id: 'Mengenali dari suara, memahami, dan menulis es, soy, dan fácil dengan tepat, lalu menggabungkannya dengan benar.',
  tr: 'Es, soy ve fácil sözcüklerini duyup tanımak, anlamak ve doğru yazmak; ardından doğru biçimde birleştirmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać es, soy oraz fácil, a potem właściwie je połączyć.',
});

// зачем переписано (владелец, 2026-08-27, Библия текстов
// docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md): прошлый текст лил воду до
// искусственного минимума в 300 знаков и 4 предложения — как раз этот минимум
// и заставил вставить в объяснение испанского `no` слова nada/non, которых в
// уроке нет (эталонный кейс всей библии). Минимума больше нет: пишем ровно
// столько, сколько нужно одной мысли, максимум 320 знаков / 4 предложения,
// только слова этой сессии (es, soy, fácil, verdad) и живой тон с шуткой по
// теме самого слова, а не для настроения (правила 1, 2, 3, 5 библии).
const CONCEPT_BODY = L({
  ru: 'Es значит «есть» — связка любой оценки. По-русски мы это слово просто теряем в переводе, а по-испански без него фраза не звучит вообще. Es fácil — «это легко»: без es получится голое fácil, будто вы уронили половину мысли.',
  uk: 'Es означає «є» — зв\'язка будь-якої оцінки. Українською ми це слово просто ковтаємо, а іспанською без нього фраза не звучить узагалі. Es fácil — «це легко»: без es лишається голе fácil, ніби ви впустили половину думки.',
  es: 'Es means "is" — the link every verdict needs. English skips it half the time; Spanish never does. Es fácil — "it is easy": drop es and you are left with a naked fácil, half a thought.',
  'pt-BR': 'Es significa "é" — a ligação que todo veredito precisa. O português mantém essa peça; o espanhol também, sempre. Es fácil — "é fácil": tire o es e sobra um fácil sozinho, pela metade.',
  vi: 'Es nghĩa là "là" — từ nối mà nhận định nào cũng cần. Tiếng Việt hay bỏ luôn từ này; tiếng Tây Ban Nha thì không bao giờ bỏ. Es fácil — "điều này dễ": bỏ es đi chỉ còn fácil trơ trọi, nửa câu.',
  id: 'Es berarti "adalah" — penghubung yang dibutuhkan setiap penilaian. Bahasa Indonesia sering membuangnya; bahasa Spanyol tidak pernah. Es fácil — "ini mudah": buang es, tersisa fácil sendirian, setengah pikiran.',
  tr: 'Es "-dir" demektir — her yargının ihtiyaç duyduğu bağlayıcı. Türkçe bunu çoğu zaman söylemez; İspanyolca hiç atlamaz. Es fácil — "bu kolay": es\'i çıkarınca geriye yalnız fácil kalır, yarım bir düşünce.',
  pl: 'Es znaczy „jest” — łącznik, którego potrzebuje każdy osąd. Polski często go pomija; hiszpański nigdy. Es fácil — „to jest łatwe”: usuń es, zostaje samo fácil, połowa myśli.',
});

const FORMULA_BODY = L({
  ru: 'Soy — та же связка es, только про себя самого. Es fácil говорят про что угодно, а Soy — это уже про «я». Хвост -oy будто держит зеркало: смотрит и говорит «это я».',
  uk: 'Soy — та сама зв\'язка es, тільки про самого себе. Es fácil кажуть про будь-що, а Soy — це вже про «я». Хвіст -oy наче тримає дзеркало: дивиться і каже «це я».',
  es: 'Soy is the same link as es, just about yourself. Es fácil talks about anything; Soy is already about "I". That little -oy ending is basically a mirror saying "that\'s me".',
  'pt-BR': 'Soy é a mesma ligação que es, só que sobre você mesmo. Es fácil fala de qualquer coisa; Soy já fala de "eu". Aquela terminação -oy é como um espelho dizendo "sou eu".',
  vi: 'Soy là từ nối giống es, chỉ khác là nói về chính mình. Es fácil nói về bất cứ điều gì; Soy đã là nói về "tôi". Cái đuôi -oy giống như tấm gương, tự nói "đó là tôi".',
  id: 'Soy adalah penghubung yang sama dengan es, hanya tentang diri sendiri. Es fácil bicara tentang apa saja; Soy sudah bicara tentang "saya". Akhiran -oy itu seperti cermin yang bilang "itu saya".',
  tr: 'Soy, es ile aynı bağlayıcıdır, sadece kendiniz hakkında. Es fácil her şey için söylenir; Soy zaten "ben" der. Sondaki -oy sanki bir ayna gibi "bu benim" diyor.',
  pl: 'Soy to ten sam łącznik co es, tylko o tobie samym. Es fácil mówi o czymkolwiek; Soy mówi już o „ja”. Końcówka -oy jest jak lustro, które mówi „to ja”.',
});

const TRAP_BODY = L({
  ru: 'Fácil значит «лёгкий» — и не меняется, кто бы ни был лёгким: задача, язык, решение. Ударение падает на первый слог, á звучит отчётливо. Es fácil — «это легко»: слово честно держит своё слово.',
  uk: 'Fácil означає «легкий» — і не змінюється, хто б не був легким: завдання, мова, рішення. Наголос падає на перший склад, á звучить чітко. Es fácil — «це легко»: слово чесно тримає своє слово.',
  es: 'Fácil means "easy" — and it never changes, no matter what is easy: a task, a language, a choice. The stress lands on the first syllable, á loud and clear. Es fácil — "it is easy": the word keeps its word.',
  'pt-BR': 'Fácil significa "fácil" — e nunca muda, seja lá o que for fácil: uma tarefa, um idioma, uma escolha. O acento cai na primeira sílaba, com um á bem marcado. Es fácil — "é fácil": a palavra cumpre a palavra.',
  vi: 'Fácil nghĩa là "dễ" — và không bao giờ đổi, dù thứ dễ là gì: việc, ngôn ngữ, lựa chọn. Trọng âm rơi vào âm tiết đầu, á vang rõ. Es fácil — "điều này dễ": từ này giữ đúng lời của nó.',
  id: 'Fácil berarti "mudah" — dan tidak pernah berubah, apa pun yang mudah: tugas, bahasa, pilihan. Tekanan jatuh di suku kata pertama, á terdengar jelas. Es fácil — "ini mudah": kata ini menepati katanya sendiri.',
  tr: 'Fácil "kolay" demektir — ve hiç değişmez, kolay olan ne olursa olsun: görev, dil, seçim. Vurgu ilk hecede, á net duyulur. Es fácil — "bu kolay": kelime sözünü tutuyor.',
  pl: 'Fácil znaczy „łatwy” — i nigdy się nie zmienia, obojętnie co jest łatwe: zadanie, język, wybór. Akcent pada na pierwszą sylabę, á brzmi wyraźnie. Es fácil — „to jest łatwe”: słowo dotrzymuje słowa.',
});

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Es открывает любую оценку',
      uk: 'Es відкриває будь-яку оцінку',
      es: 'Es opens every verdict',
      'pt-BR': 'Es abre qualquer veredito',
      vi: 'Es mở đầu mọi nhận định',
      id: 'Es membuka setiap penilaian',
      tr: 'Es her yargıyı açar',
      pl: 'Es otwiera każdy osąd',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Es', semantic: 'targetCorrect' }, { text: ' значит «есть» — связка любой оценки. По-русски мы это слово просто теряем в переводе, а по-испански без него фраза не звучит вообще. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — «это легко»: без ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' получится голое fácil, будто вы уронили половину мысли.', semantic: 'explanation' }),
      uk: R({ text: 'Es', semantic: 'targetCorrect' }, { text: ' означає «є» — зв\'язка будь-якої оцінки. Українською ми це слово просто ковтаємо, а іспанською без нього фраза не звучить узагалі. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — «це легко»: без ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' лишається голе fácil, ніби ви впустили половину думки.', semantic: 'explanation' }),
      es: R({ text: 'Es', semantic: 'targetCorrect' }, { text: ' means "is" — the link every verdict needs. English skips it half the time; Spanish never does. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "it is easy": drop ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' and you are left with a naked fácil, half a thought.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Es', semantic: 'targetCorrect' }, { text: ' significa "é" — a ligação que todo veredito precisa. O português mantém essa peça; o espanhol também, sempre. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "é fácil": tire o ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' e sobra um fácil sozinho, pela metade.', semantic: 'explanation' }),
      vi: R({ text: 'Es', semantic: 'targetCorrect' }, { text: ' nghĩa là "là" — từ nối mà nhận định nào cũng cần. Tiếng Việt hay bỏ luôn từ này; tiếng Tây Ban Nha thì không bao giờ bỏ. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "điều này dễ": bỏ ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' đi chỉ còn fácil trơ trọi, nửa câu.', semantic: 'explanation' }),
      id: R({ text: 'Es', semantic: 'targetCorrect' }, { text: ' berarti "adalah" — penghubung yang dibutuhkan setiap penilaian. Bahasa Indonesia sering membuangnya; bahasa Spanyol tidak pernah. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "ini mudah": buang ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', tersisa fácil sendirian, setengah pikiran.', semantic: 'explanation' }),
      tr: R({ text: 'Es', semantic: 'targetCorrect' }, { text: ' "-dir" demektir — her yargının ihtiyaç duyduğu bağlayıcı. Türkçe bunu çoğu zaman söylemez; İspanyolca hiç atlamaz. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "bu kolay": ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '\'i çıkarınca geriye yalnız fácil kalır, yarım bir düşünce.', semantic: 'explanation' }),
      pl: R({ text: 'Es', semantic: 'targetCorrect' }, { text: ' znaczy „jest” — łącznik, którego potrzebuje każdy osąd. Polski często go pomija; hiszpański nigdy. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — „to jest łatwe”: usuń ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', zostaje samo fácil, połowa myśli.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как по-испански сказать «есть, является» в оценке?',
        uk: 'Як іспанською сказати «є» в оцінці?',
        es: 'How do you say "is" in a Spanish verdict?',
        'pt-BR': 'Como se diz "é" num veredito em espanhol?',
        vi: 'Làm sao để nói "là" trong một nhận định tiếng Tây Ban Nha?',
        id: 'Bagaimana mengatakan "adalah" dalam sebuah penilaian bahasa Spanyol?',
        tr: 'İspanyolca bir yargıda "-dır" nasıl söylenir?',
        pl: 'Jak po hiszpańsku powiedzieć „jest” w osądzie?',
      }),
      choices: [
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
        L({ ru: 'ser', uk: 'ser', es: 'ser', 'pt-BR': 'ser', vi: 'ser', id: 'ser', tr: 'ser', pl: 'ser' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es открывает безличную оценку. Soy — про себя, а ser — начальная форма, в готовой фразе не стоит.',
        uk: 'Es відкриває безособову оцінку. Soy — про себе, а ser — початкова форма, у готовій фразі не стоїть.',
        es: 'Es opens an impersonal verdict. Soy is about yourself, and ser is the base form, which never stands alone in a finished sentence.',
        'pt-BR': 'Es abre um veredito impessoal. Soy é sobre você mesmo, e ser é a forma base, que nunca aparece sozinha numa frase pronta.',
        vi: 'Es mở đầu một nhận định vô nhân xưng. Soy là nói về bản thân, còn ser là dạng gốc, không bao giờ đứng một mình trong câu hoàn chỉnh.',
        id: 'Es membuka penilaian impersonal. Soy tentang diri sendiri, dan ser adalah bentuk dasar yang tidak pernah berdiri sendiri dalam kalimat jadi.',
        tr: 'Es kişisiz bir yargı açar. Soy kendiniz hakkındadır, ser ise tamamlanmış bir cümlede asla tek başına yer almayan temel biçimdir.',
        pl: 'Es otwiera bezosobowy osąd. Soy dotyczy ciebie samego, a ser to forma podstawowa, która nigdy nie stoi sama w gotowym zdaniu.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Soy — связка для себя',
      uk: 'Soy — зв’язка для себе',
      es: 'Soy links the speaker',
      'pt-BR': 'Soy liga quem fala',
      vi: 'Soy nối người nói',
      id: 'Soy menghubungkan penutur',
      tr: 'Soy konuşanı bağlar',
      pl: 'Soy łączy mówiącego',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' — та же связка ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', только про себя самого. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' говорят про что угодно, а ', semantic: 'explanation' }, { text: 'Soy', semantic: 'targetCorrect' }, { text: ' — это уже про «я». Хвост -oy будто держит зеркало: смотрит и говорит «это я».', semantic: 'explanation' }),
      uk: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' — та сама зв\'язка ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', тільки про самого себе. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' кажуть про будь-що, а ', semantic: 'explanation' }, { text: 'Soy', semantic: 'targetCorrect' }, { text: ' — це вже про «я». Хвіст -oy наче тримає дзеркало: дивиться і каже «це я».', semantic: 'explanation' }),
      es: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' is the same link as ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', just about yourself. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' talks about anything; ', semantic: 'explanation' }, { text: 'Soy', semantic: 'targetCorrect' }, { text: ' is already about "I". That little -oy ending is basically a mirror saying "that\'s me".', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' é a mesma ligação que ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', só que sobre você mesmo. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' fala de qualquer coisa; ', semantic: 'explanation' }, { text: 'Soy', semantic: 'targetCorrect' }, { text: ' já fala de "eu". Aquela terminação -oy é como um espelho dizendo "sou eu".', semantic: 'explanation' }),
      vi: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' là từ nối giống ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', chỉ khác là nói về chính mình. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' nói về bất cứ điều gì; ', semantic: 'explanation' }, { text: 'Soy', semantic: 'targetCorrect' }, { text: ' đã là nói về "tôi". Cái đuôi -oy giống như tấm gương, tự nói "đó là tôi".', semantic: 'explanation' }),
      id: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' adalah penghubung yang sama dengan ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', hanya tentang diri sendiri. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' bicara tentang apa saja; ', semantic: 'explanation' }, { text: 'Soy', semantic: 'targetCorrect' }, { text: ' sudah bicara tentang "saya". Akhiran -oy itu seperti cermin yang bilang "itu saya".', semantic: 'explanation' }),
      tr: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' ile aynı bağlayıcıdır, sadece kendiniz hakkında. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' her şey için söylenir; ', semantic: 'explanation' }, { text: 'Soy', semantic: 'targetCorrect' }, { text: ' zaten "ben" der. Sondaki -oy sanki bir ayna gibi "bu benim" diyor.', semantic: 'explanation' }),
      pl: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' to ten sam łącznik co ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', tylko o tobie samym. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' mówi o czymkolwiek; ', semantic: 'explanation' }, { text: 'Soy', semantic: 'targetCorrect' }, { text: ' mówi już o „ja”. Końcówka -oy jest jak lustro, które mówi „to ja”.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Говорящий называет признак самого себя. Какое слово нужно?',
        uk: 'Мовець називає ознаку самого себе. Яке слово потрібне?',
        es: 'The speaker names a quality about themselves. Which word is needed?',
        'pt-BR': 'Quem fala nomeia uma qualidade sobre si mesmo. Qual palavra é necessária?',
        vi: 'Người nói tự nêu một đặc điểm về bản thân. Cần từ nào?',
        id: 'Penutur menyebut sifat tentang dirinya sendiri. Kata mana yang diperlukan?',
        tr: 'Konuşan kişi kendisiyle ilgili bir niteliği adlandırıyor. Hangi kelime gerekli?',
        pl: 'Mówiący nazywa cechę samego siebie. Które słowo jest potrzebne?',
      }),
      choices: [
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'son', uk: 'son', es: 'son', 'pt-BR': 'son', vi: 'son', id: 'son', tr: 'son', pl: 'son' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Soy — связка для говорящего. Es говорит про «оно/он/она», а son — про «они».',
        uk: 'Soy — зв’язка для мовця. Es говорить про «воно/він/вона», а son — про «вони».',
        es: 'Soy is the linking word for the speaker. Es talks about "it/he/she", and son talks about "they".',
        'pt-BR': 'Soy é a ligação para quem fala. Es fala de "isso/ele/ela", e son fala de "eles/elas".',
        vi: 'Soy là từ nối cho người nói. Es nói về "nó/anh ấy/cô ấy", còn son nói về "họ".',
        id: 'Soy adalah kata penghubung untuk penutur. Es berbicara tentang "itu/dia laki-laki/dia perempuan", dan son berbicara tentang "mereka".',
        tr: 'Soy konuşan için bağlayıcı sözcüktür. Es "o/o (erkek)/o (kadın)" hakkında, son ise "onlar" hakkında konuşur.',
        pl: 'Soy to łącznik dla mówiącego. Es mówi o „ono/on/ona”, a son mówi o „oni”.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Fácil не меняется по роду',
      uk: 'Fácil не змінюється за родом',
      es: 'Fácil never changes for gender',
      'pt-BR': 'Fácil nunca muda de gênero',
      vi: 'Fácil không bao giờ đổi theo giống',
      id: 'Fácil tidak pernah berubah menurut gender',
      tr: 'Fácil cinsiyete göre asla değişmez',
      pl: 'Fácil nigdy nie zmienia się przez rodzaj',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' значит «лёгкий» — и не меняется, кто бы ни был лёгким: задача, язык, решение. Ударение падает на первый слог, á звучит отчётливо. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — «это легко»: слово честно держит своё слово.', semantic: 'explanation' }),
      uk: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' означає «легкий» — і не змінюється, хто б не був легким: завдання, мова, рішення. Наголос падає на перший склад, á звучить чітко. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — «це легко»: слово чесно тримає своє слово.', semantic: 'explanation' }),
      es: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' means "easy" — and it never changes, no matter what is easy: a task, a language, a choice. The stress lands on the first syllable, á loud and clear. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "it is easy": the word keeps its word.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' significa "fácil" — e nunca muda, seja lá o que for fácil: uma tarefa, um idioma, uma escolha. O acento cai na primeira sílaba, com um á bem marcado. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "é fácil": a palavra cumpre a palavra.', semantic: 'explanation' }),
      vi: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' nghĩa là "dễ" — và không bao giờ đổi, dù thứ dễ là gì: việc, ngôn ngữ, lựa chọn. Trọng âm rơi vào âm tiết đầu, á vang rõ. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "điều này dễ": từ này giữ đúng lời của nó.', semantic: 'explanation' }),
      id: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' berarti "mudah" — dan tidak pernah berubah, apa pun yang mudah: tugas, bahasa, pilihan. Tekanan jatuh di suku kata pertama, á terdengar jelas. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "ini mudah": kata ini menepati katanya sendiri.', semantic: 'explanation' }),
      tr: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' "kolay" demektir — ve hiç değişmez, kolay olan ne olursa olsun: görev, dil, seçim. Vurgu ilk hecede, á net duyulur. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "bu kolay": kelime sözünü tutuyor.', semantic: 'explanation' }),
      pl: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' znaczy „łatwy” — i nigdy się nie zmienia, obojętnie co jest łatwe: zadanie, język, wybór. Akcent pada na pierwszą sylabę, á brzmi wyraźnie. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — „to jest łatwe”: słowo dotrzymuje słowa.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое слово означает «лёгкий» и не меняется по роду?',
        uk: 'Яке слово означає «легкий» і не змінюється за родом?',
        es: 'Which word means "easy" and never changes for gender?',
        'pt-BR': 'Qual palavra significa "fácil" e nunca muda de gênero?',
        vi: 'Từ nào nghĩa là "dễ" và không bao giờ đổi theo giống?',
        id: 'Kata mana yang berarti "mudah" dan tidak pernah berubah menurut gender?',
        tr: 'Hangi kelime "kolay" anlamına gelir ve cinsiyete göre asla değişmez?',
        pl: 'Które słowo znaczy „łatwy” i nigdy nie zmienia się przez rodzaj?',
      }),
      choices: [
        L({ ru: 'fácil', uk: 'fácil', es: 'fácil', 'pt-BR': 'fácil', vi: 'fácil', id: 'fácil', tr: 'fácil', pl: 'fácil' }),
        L({ ru: 'difícil', uk: 'difícil', es: 'difícil', 'pt-BR': 'difícil', vi: 'difícil', id: 'difícil', tr: 'difícil', pl: 'difícil' }),
        L({ ru: 'facilidad', uk: 'facilidad', es: 'facilidad', 'pt-BR': 'facilidad', vi: 'facilidad', id: 'facilidad', tr: 'facilidad', pl: 'facilidad' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Fácil означает «лёгкий». Difícil — противоположность, «трудный». Facilidad — существительное «лёгкость».',
        uk: 'Fácil означає «легкий». Difícil — протилежність, «важкий». Facilidad — іменник «легкість».',
        es: 'Fácil means "easy". Difícil is the opposite, "hard". Facilidad is the noun "ease".',
        'pt-BR': 'Fácil significa "fácil". Difícil é o oposto, "difícil". Facilidad é o substantivo "facilidade".',
        vi: 'Fácil nghĩa là "dễ". Difícil là từ trái nghĩa, "khó". Facilidad là danh từ "sự dễ dàng".',
        id: 'Fácil berarti "mudah". Difícil adalah kebalikannya, "sulit". Facilidad adalah kata benda "kemudahan".',
        tr: 'Fácil "kolay" demektir. Difícil karşıtıdır, "zor". Facilidad "kolaylık" anlamına gelen bir isimdir.',
        pl: 'Fácil znaczy „łatwy”. Difícil to przeciwieństwo, „trudny”. Facilidad to rzeczownik „łatwość”.',
      }),
    },
  },
];
