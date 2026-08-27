import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл переписан (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// §7 + LEARNING_CONTENT_STYLE_BIBLE.ru.md правило 2): исходный черновик от
// 2026-08-25 держал тела intro на ~510-520 знаков на локаль — за потолком
// intro_body_overloaded (320 знаков / 2-4 предложения,
// learning_content_quality_gate_v1.ts). Смысл сохранён (concept/formula/trap
// про segura — признак уверенности в себе, согласуется по роду как bonito/
// bonita, встречается сразу в вопросе), текст сжат. Инлайновые испанские
// примеры с ¿...? сокращены до одного на страницу — каждый лишний ? считается
// границей предложения в sentenceCount() гейта (см. класс бага, найденный в
// сессии 10). Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal
// 12, "Спрашиваю женщину" / confidence_adjective, builtOn: [3, 10],
// recalls: [3, 10].
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_12_WORD_FIRST_TITLE = L({
  ru: 'Спрашиваю женщину',
  uk: 'Питаю жінку',
  es: 'Asking a woman',
  'pt-BR': 'Perguntando a uma mulher',
  vi: 'Hỏi một phụ nữ',
  id: 'Bertanya kepada wanita',
  tr: 'Bir kadına soruyorum',
  pl: 'Pytam kobietę',
});

export const ES_EPISODE_01_SESSION_12_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое слово — segura, «уверенная» — сразу встречается в вопросе, соединяя уже знакомый вопросительный знак и согласование по роду.',
  uk: 'Одне нове слово — segura, «впевнена» — одразу трапляється в питанні, поєднуючи вже знайомий знак питання і узгодження за родом.',
  es: 'One new word — segura, "confident" — appears right in a question, combining the already familiar question mark and gender agreement.',
  'pt-BR': 'Uma palavra nova — segura, "confiante" — aparece bem numa pergunta, combinando o já conhecido sinal de interrogação e a concordância de gênero.',
  vi: 'Một từ mới — segura, "tự tin" — xuất hiện ngay trong câu hỏi, kết hợp dấu hỏi đã quen thuộc và sự hòa hợp giống.',
  id: 'Satu kata baru — segura, "percaya diri" — muncul tepat dalam pertanyaan, menggabungkan tanda tanya yang sudah dikenal dan kesesuaian gender.',
  tr: 'Bir yeni kelime — segura, "kendine güvenen" — tam bir sorunun içinde görünür, zaten tanıdık olan soru işaretini ve cinsiyet uyumunu birleştirir.',
  pl: 'Jedno nowe słowo — segura, „pewna siebie” — pojawia się właśnie w pytaniu, łącząc już znany znak zapytania i zgodność rodzaju.',
});

export const ES_EPISODE_01_SESSION_12_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно построить segura и её форму seguro, задавая вопрос собеседнице или о третьем лице.',
  uk: 'Упізнати на слух, зрозуміти й точно побудувати segura та її форму seguro, ставлячи питання співрозмовниці чи про третю особу.',
  es: 'Recognize by ear, understand, and correctly build segura and its form seguro, asking a question to the listener or about a third person.',
  'pt-BR': 'Reconhecer de ouvido, entender e construir corretamente segura e sua forma seguro, perguntando à interlocutora ou sobre uma terceira pessoa.',
  vi: 'Nghe ra, hiểu và xây dựng đúng segura cùng dạng seguro của nó, hỏi người nghe hoặc về ngôi thứ ba.',
  id: 'Mengenali dari suara, memahami, dan membangun segura serta bentuknya seguro dengan tepat, bertanya kepada pendengar atau tentang orang ketiga.',
  tr: 'Segura’yı ve onun seguro biçimini duyup tanımak, anlamak ve doğru kurmak; dinleyiciye ya da üçüncü kişi hakkında soru sormak.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zbudować segura oraz jego formę seguro, zadając pytanie słuchaczce lub o trzeciej osobie.',
});

const CONCEPT_BODY = L({
  ru: 'Segura описывает уверенность в себе конкретного человека — качество характера, а не внешность или скорость. Признак согласуется по роду точно так же, как bonita: segura для женщины, seguro для мужчины.',
  uk: 'Segura описує впевненість у собі конкретної людини — якість характеру, а не зовнішність чи швидкість. Ознака узгоджується за родом точно так само, як bonita: segura для жінки, seguro для чоловіка.',
  es: "Segura describes a specific person's self-confidence — a character quality, not looks or speed. The quality agrees by gender exactly like bonita: segura for a woman, seguro for a man.",
  'pt-BR': 'Segura descreve a autoconfiança de uma pessoa específica — uma qualidade de caráter, não a aparência ou a velocidade. A qualidade concorda em gênero exatamente como bonita: segura para uma mulher, seguro para um homem.',
  vi: 'Segura mô tả sự tự tin của một người cụ thể — một đặc điểm tính cách, không phải ngoại hình hay tốc độ. Đặc điểm hòa hợp theo giống y hệt như bonita: segura cho phụ nữ, seguro cho đàn ông.',
  id: 'Segura menggambarkan kepercayaan diri orang tertentu — sifat karakter, bukan penampilan atau kecepatan. Sifatnya sesuai gender persis seperti bonita: segura untuk wanita, seguro untuk pria.',
  tr: 'Segura, belirli bir kişinin kendine güvenini tanımlar — görünüm ya da hız değil, bir karakter niteliğidir. Nitelik, bonita gibi cinsiyete göre uyum sağlar: kadın için segura, erkek için seguro.',
  pl: 'Segura opisuje pewność siebie konkretnej osoby — cechę charakteru, nie wygląd ani szybkość. Cecha zgadza się pod względem rodzaju dokładnie tak jak bonita: segura dla kobiety, seguro dla mężczyzny.',
});

const FORMULA_BODY = L({
  ru: 'Формула согласования та же, что и для других прилагательных: концовка -a для женского рода, концовка -o для мужского. Segura пишет -a, seguro меняет ровно одну букву на -o. Вопрос эту формулу не меняет — только связка становится eres или es, признак остаётся тем же.',
  uk: 'Формула узгодження та сама, що й для інших прикметників: закінчення -a для жіночого роду, закінчення -o для чоловічого. Segura пише -a, seguro змінює рівно одну літеру на -o. Питання цю формулу не змінює — змінюється тільки зв’язка, ознака лишається тією самою.',
  es: 'The agreement formula is the same as for other adjectives: the ending -a for feminine, the ending -o for masculine. Segura writes -a, seguro changes exactly one letter to -o. A question does not change this formula — only the linking word becomes eres or es, the quality stays the same.',
  'pt-BR': 'A fórmula de concordância é a mesma de outros adjetivos: a terminação -a para feminino, a terminação -o para masculino. Segura escreve -a, seguro muda exatamente uma letra para -o. Uma pergunta não muda essa fórmula — só a ligação vira eres ou es, a qualidade fica a mesma.',
  vi: 'Công thức hòa hợp giống như các tính từ khác: đuôi -a cho giống cái, đuôi -o cho giống đực. Segura viết -a, seguro chỉ đổi đúng một chữ cái thành -o. Câu hỏi không đổi công thức này — chỉ từ nối trở thành eres hay es, đặc điểm vẫn giữ nguyên.',
  id: 'Rumus kesesuaian sama seperti kata sifat lain: akhiran -a untuk feminin, akhiran -o untuk maskulin. Segura menulis -a, seguro mengubah tepat satu huruf menjadi -o. Pertanyaan tidak mengubah rumus ini — hanya kata penghubung menjadi eres atau es, sifatnya tetap sama.',
  tr: 'Uyum formülü diğer sıfatlarla aynıdır: dişil için -a son eki, eril için -o son eki. Segura -a yazar, seguro tam olarak tek bir harfi -o olarak değiştirir. Bir soru bu formülü değiştirmez — sadece bağlaç değişir, nitelik aynı kalır.',
  pl: 'Formuła zgodności jest taka sama jak dla innych przymiotników: końcówka -a dla rodzaju żeńskiego, końcówka -o dla męskiego. Segura pisze -a, seguro zmienia dokładnie jedną literę na -o. Pytanie nie zmienia tej formuły — zmienia się tylko łącznik na eres lub es, cecha zostaje ta sama.',
});

const TRAP_BODY = L({
  ru: '¿Eres segura? спрашивают у самой собеседницы, глядя ей в глаза, а es — о третьем лице. Вторая ловушка — забыть про род и сказать seguro женщине: seguro заканчивается на -o и годится только для мужчины.',
  uk: '¿Eres segura? запитують у самої співрозмовниці, дивлячись їй в очі, а es — про третю особу. Друга пастка — забути про рід і сказати seguro жінці: seguro закінчується на -o і годиться тільки для чоловіка.',
  es: '¿Eres segura? asks the listener herself, looking her in the eyes, while es is about a third person. The second trap is forgetting about gender and saying seguro to a woman: seguro ends in -o and only fits a man.',
  'pt-BR': '¿Eres segura? pergunta à própria interlocutora, olhando nos olhos dela, enquanto es é sobre uma terceira pessoa. A segunda armadilha é esquecer o gênero e dizer seguro a uma mulher: seguro termina em -o e só cabe a um homem.',
  vi: '¿Eres segura? hỏi chính người nghe, nhìn thẳng vào mắt cô ấy, còn es nói về ngôi thứ ba. Cái bẫy thứ hai là quên mất giống và nói seguro với một phụ nữ: seguro kết thúc bằng -o và chỉ phù hợp với đàn ông.',
  id: '¿Eres segura? bertanya kepada pendengar itu sendiri, menatap matanya, sedangkan es tentang orang ketiga. Jebakan kedua adalah lupa gender dan mengatakan seguro kepada seorang wanita: seguro berakhiran -o dan hanya cocok untuk pria.',
  tr: '¿Eres segura? dinleyicinin kendisine, gözlerinin içine bakarak sorar, es ise üçüncü bir kişi hakkındadır. İkinci tuzak, cinsiyeti unutup bir kadına seguro demektir: seguro -o ile biter ve yalnızca bir erkeğe uyar.',
  pl: '¿Eres segura? pyta samą słuchaczkę, patrząc jej w oczy, a es dotyczy trzeciej osoby. Druga pułapka to zapomnienie o rodzaju i powiedzenie seguro do kobiety: seguro kończy się na -o i pasuje tylko do mężczyzny.',
});

export const ES_EPISODE_01_SESSION_12_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Уверенность — не внешность',
      uk: 'Впевненість — не зовнішність',
      es: 'Confidence is not looks',
      'pt-BR': 'Confiança não é aparência',
      vi: 'Tự tin không phải ngoại hình',
      id: 'Kepercayaan diri bukan penampilan',
      tr: 'Güven görünüm değildir',
      pl: 'Pewność siebie to nie wygląd',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Segura описывает ', semantic: 'explanation' }, { text: 'уверенность в себе конкретного человека', semantic: 'targetCorrect' }, { text: ' — качество характера, а не внешность или скорость. Признак согласуется по роду точно так же, как bonita: segura для женщины, seguro для мужчины.', semantic: 'explanation' }),
      uk: R({ text: 'Segura описує ', semantic: 'explanation' }, { text: 'впевненість у собі конкретної людини', semantic: 'targetCorrect' }, { text: ' — якість характеру, а не зовнішність чи швидкість. Ознака узгоджується за родом точно так само, як bonita: segura для жінки, seguro для чоловіка.', semantic: 'explanation' }),
      es: R({ text: 'Segura describes ', semantic: 'explanation' }, { text: "a specific person's self-confidence", semantic: 'targetCorrect' }, { text: ' — a character quality, not looks or speed. The quality agrees by gender exactly like bonita: segura for a woman, seguro for a man.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Segura descreve ', semantic: 'explanation' }, { text: 'a autoconfiança de uma pessoa específica', semantic: 'targetCorrect' }, { text: ' — uma qualidade de caráter, não a aparência ou a velocidade. A qualidade concorda em gênero exatamente como bonita: segura para uma mulher, seguro para um homem.', semantic: 'explanation' }),
      vi: R({ text: 'Segura mô tả ', semantic: 'explanation' }, { text: 'sự tự tin của một người cụ thể', semantic: 'targetCorrect' }, { text: ' — một đặc điểm tính cách, không phải ngoại hình hay tốc độ. Đặc điểm hòa hợp theo giống y hệt như bonita: segura cho phụ nữ, seguro cho đàn ông.', semantic: 'explanation' }),
      id: R({ text: 'Segura menggambarkan ', semantic: 'explanation' }, { text: 'kepercayaan diri orang tertentu', semantic: 'targetCorrect' }, { text: ' — sifat karakter, bukan penampilan atau kecepatan. Sifatnya sesuai gender persis seperti bonita: segura untuk wanita, seguro untuk pria.', semantic: 'explanation' }),
      tr: R({ text: 'Segura, ', semantic: 'explanation' }, { text: 'belirli bir kişinin kendine güvenini', semantic: 'targetCorrect' }, { text: ' tanımlar — görünüm ya da hız değil, bir karakter niteliğidir. Nitelik, bonita gibi cinsiyete göre uyum sağlar: kadın için segura, erkek için seguro.', semantic: 'explanation' }),
      pl: R({ text: 'Segura opisuje ', semantic: 'explanation' }, { text: 'pewność siebie konkretnej osoby', semantic: 'targetCorrect' }, { text: ' — cechę charakteru, nie wygląd ani szybkość. Cecha zgadza się pod względem rodzaju dokładnie tak jak bonita: segura dla kobiety, seguro dla mężczyzny.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что описывает segura?',
        uk: 'Що описує segura?',
        es: 'What does segura describe?',
        'pt-BR': 'O que segura descreve?',
        vi: 'Segura mô tả điều gì?',
        id: 'Apa yang digambarkan segura?',
        tr: 'Segura neyi tanımlar?',
        pl: 'Co opisuje segura?',
      }),
      choices: [
        L({ ru: 'Уверенность в себе конкретного человека', uk: 'Впевненість у собі конкретної людини', es: "A specific person's self-confidence", 'pt-BR': 'A autoconfiança de uma pessoa específica', vi: 'Sự tự tin của một người cụ thể', id: 'Kepercayaan diri orang tertentu', tr: 'Belirli bir kişinin kendine güveni', pl: 'Pewność siebie konkretnej osoby' }),
        L({ ru: 'Внешний вид предмета', uk: 'Зовнішній вигляд предмета', es: "A thing's appearance", 'pt-BR': 'A aparência de uma coisa', vi: 'Vẻ ngoài của một vật', id: 'Penampilan suatu benda', tr: 'Bir şeyin görünümü', pl: 'Wygląd rzeczy' }),
        L({ ru: 'Скорость движения', uk: 'Швидкість руху', es: 'The speed of movement', 'pt-BR': 'A velocidade do movimento', vi: 'Tốc độ di chuyển', id: 'Kecepatan gerakan', tr: 'Hareket hızı', pl: 'Prędkość ruchu' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Segura описывает уверенность в себе конкретного человека — это качество характера, а не внешний вид предмета и не скорость.',
        uk: 'Segura описує впевненість у собі конкретної людини — це якість характеру, а не зовнішній вигляд предмета і не швидкість.',
        es: "Segura describes a specific person's self-confidence — a character quality, not a thing's appearance or speed.",
        'pt-BR': 'Segura descreve a autoconfiança de uma pessoa específica — uma qualidade de caráter, não a aparência de uma coisa nem a velocidade.',
        vi: 'Segura mô tả sự tự tin của một người cụ thể — một đặc điểm tính cách, không phải vẻ ngoài của một vật hay tốc độ.',
        id: 'Segura menggambarkan kepercayaan diri orang tertentu — sifat karakter, bukan penampilan benda atau kecepatan.',
        tr: 'Segura, belirli bir kişinin kendine güvenini tanımlar — bir karakter niteliğidir, bir şeyin görünümü ya da hızı değil.',
        pl: 'Segura opisuje pewność siebie konkretnej osoby — to cecha charakteru, nie wygląd rzeczy ani prędkość.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Segura/seguro как bonita/bonito',
      uk: 'Segura/seguro як bonita/bonito',
      es: 'Segura/seguro like bonita/bonito',
      'pt-BR': 'Segura/seguro como bonita/bonito',
      vi: 'Segura/seguro như bonita/bonito',
      id: 'Segura/seguro seperti bonita/bonito',
      tr: 'Segura/seguro, bonita/bonito gibi',
      pl: 'Segura/seguro jak bonita/bonito',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула согласования та же, что и для других прилагательных: концовка -a для женского рода, концовка -o для мужского. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' пишет -a, seguro меняет ровно одну букву на -o. ', semantic: 'explanation' }, { text: 'Вопрос эту формулу не меняет', semantic: 'targetCorrect' }, { text: ' — только связка становится eres или es, признак остаётся тем же.', semantic: 'explanation' }),
      uk: R({ text: 'Формула узгодження та сама, що й для інших прикметників: закінчення -a для жіночого роду, закінчення -o для чоловічого. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' пише -a, seguro змінює рівно одну літеру на -o. Питання цю формулу не змінює — ', semantic: 'explanation' }, { text: 'змінюється тільки зв’язка', semantic: 'targetCorrect' }, { text: ', ознака лишається тією самою.', semantic: 'explanation' }),
      es: R({ text: 'The agreement formula is the same as for other adjectives: the ending -a for feminine, the ending -o for masculine. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' writes -a, seguro changes exactly one letter to -o. ', semantic: 'explanation' }, { text: 'A question does not change this formula', semantic: 'targetCorrect' }, { text: ' — only the linking word becomes eres or es, the quality stays the same.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de concordância é a mesma de outros adjetivos: a terminação -a para feminino, a terminação -o para masculino. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' escreve -a, seguro muda exatamente uma letra para -o. ', semantic: 'explanation' }, { text: 'Uma pergunta não muda essa fórmula', semantic: 'targetCorrect' }, { text: ' — só a ligação vira eres ou es, a qualidade fica a mesma.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức hòa hợp giống như các tính từ khác: đuôi -a cho giống cái, đuôi -o cho giống đực. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' viết -a, seguro chỉ đổi đúng một chữ cái thành -o. ', semantic: 'explanation' }, { text: 'Câu hỏi không đổi công thức này', semantic: 'targetCorrect' }, { text: ' — chỉ từ nối trở thành eres hay es, đặc điểm vẫn giữ nguyên.', semantic: 'explanation' }),
      id: R({ text: 'Rumus kesesuaian sama seperti kata sifat lain: akhiran -a untuk feminin, akhiran -o untuk maskulin. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' menulis -a, seguro mengubah tepat satu huruf menjadi -o. ', semantic: 'explanation' }, { text: 'Pertanyaan tidak mengubah rumus ini', semantic: 'targetCorrect' }, { text: ' — hanya kata penghubung menjadi eres atau es, sifatnya tetap sama.', semantic: 'explanation' }),
      tr: R({ text: 'Uyum formülü diğer sıfatlarla aynıdır: dişil için -a son eki, eril için -o son eki. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' -a yazar, seguro tam olarak tek bir harfi -o olarak değiştirir. Bir soru bu formülü değiştirmez — ', semantic: 'explanation' }, { text: 'sadece bağlaç değişir', semantic: 'targetCorrect' }, { text: ', nitelik aynı kalır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła zgodności jest taka sama jak dla innych przymiotników: końcówka -a dla rodzaju żeńskiego, końcówka -o dla męskiego. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' pisze -a, seguro zmienia dokładnie jedną literę na -o. ', semantic: 'explanation' }, { text: 'Pytanie nie zmienia tej formuły', semantic: 'targetCorrect' }, { text: ' — zmienia się tylko łącznik na eres lub es, cecha zostaje ta sama.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что меняется между «¿Eres segura?» и «¿Es segura?»?',
        uk: 'Що змінюється між «¿Eres segura?» та «¿Es segura?»?',
        es: 'What changes between "¿Eres segura?" and "¿Es segura?"?',
        'pt-BR': 'O que muda entre "¿Eres segura?" e "¿Es segura?"?',
        vi: 'Điều gì thay đổi giữa "¿Eres segura?" và "¿Es segura?"?',
        id: 'Apa yang berubah antara "¿Eres segura?" dan "¿Es segura?"?',
        tr: '"¿Eres segura?" ile "¿Es segura?" arasında ne değişir?',
        pl: 'Co się zmienia między „¿Eres segura?” a „¿Es segura?”?',
      }),
      choices: [
        L({ ru: 'Только связка', uk: 'Тільки зв’язка', es: 'Only the linking word', 'pt-BR': 'Só a ligação', vi: 'Chỉ từ nối', id: 'Hanya kata penghubung', tr: 'Sadece bağlaç', pl: 'Tylko łącznik' }),
        L({ ru: 'Признак segura', uk: 'Ознака segura', es: 'The quality segura', 'pt-BR': 'A qualidade segura', vi: 'Đặc điểm segura', id: 'Sifat segura', tr: 'Nitelik segura', pl: 'Cecha segura' }),
        L({ ru: 'Порядок слов', uk: 'Порядок слів', es: 'The word order', 'pt-BR': 'A ordem das palavras', vi: 'Trật tự từ', id: 'Urutan kata', tr: 'Kelime sırası', pl: 'Kolejność słów' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Меняется только связка (eres или es) — признак segura остаётся тем же, потому что в обоих случаях речь о женщине.',
        uk: 'Змінюється лише зв’язка (eres чи es) — ознака segura лишається тією самою, бо в обох випадках йдеться про жінку.',
        es: 'Only the linking word changes (eres or es) — the quality segura stays the same, because in both cases it is about a woman.',
        'pt-BR': 'Só a ligação muda (eres ou es) — a qualidade segura fica a mesma, porque nos dois casos é sobre uma mulher.',
        vi: 'Chỉ từ nối thay đổi (eres hay es) — đặc điểm segura vẫn giữ nguyên, vì cả hai trường hợp đều nói về phụ nữ.',
        id: 'Hanya kata penghubung yang berubah (eres atau es) — sifat segura tetap sama, karena dalam kedua kasus tentang seorang wanita.',
        tr: 'Yalnızca bağlaç değişir (eres ya da es) — segura niteliği aynı kalır, çünkü her iki durumda da bir kadın hakkındadır.',
        pl: 'Zmienia się tylko łącznik (eres lub es) — cecha segura pozostaje ta sama, ponieważ w obu przypadkach mowa o kobiecie.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Eres или es, segura или seguro',
      uk: 'Eres чи es, segura чи seguro',
      es: 'Eres or es, segura or seguro',
      'pt-BR': 'Eres ou es, segura ou seguro',
      vi: 'Eres hay es, segura hay seguro',
      id: 'Eres atau es, segura atau seguro',
      tr: 'Eres ya da es, segura ya da seguro',
      pl: 'Eres czy es, segura czy seguro',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' спрашивают у самой собеседницы, глядя ей в глаза, а es — о третьем лице. Вторая ловушка — забыть про род и сказать ', semantic: 'explanation' }, { text: 'seguro', semantic: 'targetWrong' }, { text: ' женщине: seguro заканчивается на -o и годится только для мужчины.', semantic: 'explanation' }),
      uk: R({ text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' запитують у самої співрозмовниці, дивлячись їй в очі, а es — про третю особу. Друга пастка — забути про рід і сказати ', semantic: 'explanation' }, { text: 'seguro', semantic: 'targetWrong' }, { text: ' жінці: seguro закінчується на -o і годиться тільки для чоловіка.', semantic: 'explanation' }),
      es: R({ text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' asks the listener herself, looking her in the eyes, while es is about a third person. The second trap is forgetting about gender and saying ', semantic: 'explanation' }, { text: 'seguro', semantic: 'targetWrong' }, { text: ' to a woman: seguro ends in -o and only fits a man.', semantic: 'explanation' }),
      'pt-BR': R({ text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' pergunta à própria interlocutora, olhando nos olhos dela, enquanto es é sobre uma terceira pessoa. A segunda armadilha é esquecer o gênero e dizer ', semantic: 'explanation' }, { text: 'seguro', semantic: 'targetWrong' }, { text: ' a uma mulher: seguro termina em -o e só cabe a um homem.', semantic: 'explanation' }),
      vi: R({ text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' hỏi chính người nghe, nhìn thẳng vào mắt cô ấy, còn es nói về ngôi thứ ba. Cái bẫy thứ hai là quên mất giống và nói ', semantic: 'explanation' }, { text: 'seguro', semantic: 'targetWrong' }, { text: ' với một phụ nữ: seguro kết thúc bằng -o và chỉ phù hợp với đàn ông.', semantic: 'explanation' }),
      id: R({ text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' bertanya kepada pendengar itu sendiri, menatap matanya, sedangkan es tentang orang ketiga. Jebakan kedua adalah lupa gender dan mengatakan ', semantic: 'explanation' }, { text: 'seguro', semantic: 'targetWrong' }, { text: ' kepada seorang wanita: seguro berakhiran -o dan hanya cocok untuk pria.', semantic: 'explanation' }),
      tr: R({ text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' dinleyicinin kendisine, gözlerinin içine bakarak sorar, es ise üçüncü bir kişi hakkındadır. İkinci tuzak, cinsiyeti unutup bir kadına ', semantic: 'explanation' }, { text: 'seguro', semantic: 'targetWrong' }, { text: ' demektir: seguro -o ile biter ve yalnızca bir erkeğe uyar.', semantic: 'explanation' }),
      pl: R({ text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' pyta samą słuchaczkę, patrząc jej w oczy, a es dotyczy trzeciej osoby. Druga pułapka to zapomnienie o rodzaju i powiedzenie ', semantic: 'explanation' }, { text: 'seguro', semantic: 'targetWrong' }, { text: ' do kobiety: seguro kończy się na -o i pasuje tylko do mężczyzny.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно спросить собеседницу о её уверенности напрямую?',
        uk: 'Як правильно запитати співрозмовницю про її впевненість напряму?',
        es: 'How do you correctly ask the listener herself about her confidence directly?',
        'pt-BR': 'Como perguntar corretamente à própria interlocutora sobre sua confiança diretamente?',
        vi: 'Hỏi trực tiếp chính người nghe về sự tự tin của cô ấy đúng cách như thế nào?',
        id: 'Bagaimana bertanya dengan benar kepada pendengar itu sendiri tentang kepercayaan dirinya secara langsung?',
        tr: 'Dinleyicinin kendisine güveni hakkında doğrudan doğru nasıl sorulur?',
        pl: 'Jak poprawnie zapytać samą słuchaczkę bezpośrednio o jej pewność siebie?',
      }),
      choices: [
        L({ ru: '¿Eres segura?', uk: '¿Eres segura?', es: '¿Eres segura?', 'pt-BR': '¿Eres segura?', vi: '¿Eres segura?', id: '¿Eres segura?', tr: '¿Eres segura?', pl: '¿Eres segura?' }),
        L({ ru: '¿Eres seguro?', uk: '¿Eres seguro?', es: '¿Eres seguro?', 'pt-BR': '¿Eres seguro?', vi: '¿Eres seguro?', id: '¿Eres seguro?', tr: '¿Eres seguro?', pl: '¿Eres seguro?' }),
        L({ ru: '¿Es segura?', uk: '¿Es segura?', es: '¿Es segura?', 'pt-BR': '¿Es segura?', vi: '¿Es segura?', id: '¿Es segura?', tr: '¿Es segura?', pl: '¿Es segura?' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: '¿Eres segura? верно: eres обращается к собеседнице напрямую, а segura с -a — форма женского рода.',
        uk: '¿Eres segura? правильно: eres звертається до співрозмовниці напряму, а segura з -a — форма жіночого роду.',
        es: '¿Eres segura? is correct: eres addresses the listener directly, and segura with -a is the feminine form.',
        'pt-BR': '¿Eres segura? está correto: eres fala com a interlocutora diretamente, e segura com -a é a forma feminina.',
        vi: '¿Eres segura? đúng: eres nói trực tiếp với người nghe, và segura với -a là dạng giống cái.',
        id: '¿Eres segura? benar: eres berbicara langsung dengan pendengar, dan segura dengan -a adalah bentuk feminin.',
        tr: '¿Eres segura? doğrudur: eres doğrudan dinleyiciyle konuşur, ve -a ile segura dişil biçimdir.',
        pl: '¿Eres segura? jest poprawne: eres zwraca się bezpośrednio do słuchaczki, a segura z -a to forma żeńska.',
      }),
    },
  },
];
