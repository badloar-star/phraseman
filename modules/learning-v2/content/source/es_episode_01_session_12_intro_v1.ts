import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 12 "Спрашиваю женщину" / confidence_adjective, builtOn: [3, 10],
// recalls: [3, 10]): три страницы вводят segura — признак уверенности,
// сразу в вопросительной форме (recall 10) и с согласованием по роду
// (recall 3). Единственное новое слово курса на этот момент.
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
  ru: 'Segura описывает уверенность человека в себе — качество характера, которое видно по поведению, а не по внешности или скорости. Признак согласуется по роду точно так же, как bonito/bonita или único/única: segura для женщины, seguro для мужчины. Уверенность — это не факт о предмете, а оценка человека, поэтому segura почти всегда звучит в вопросе или разговоре о ком-то конкретном: ¿Eres segura?, ¿Es segura? Ответ прост: segura описывает уверенность в себе конкретного человека женского рода, а не внешность и не скорость.',
  uk: 'Segura описує впевненість людини в собі — якість характеру, яку видно з поведінки, а не із зовнішності чи швидкості. Ознака узгоджується за родом точно так само, як bonito/bonita чи único/única: segura для жінки, seguro для чоловіка. Впевненість — це не факт про предмет, а оцінка людини, тому segura майже завжди звучить у питанні чи розмові про когось конкретного: ¿Eres segura?, ¿Es segura? Відповідь проста: segura описує впевненість у собі конкретної людини жіночого роду, а не зовнішність і не швидкість.',
  es: 'Segura describes a person\'s self-confidence — a character quality seen in behavior, not in looks or speed. The quality agrees by gender exactly like bonito/bonita or único/única: segura for a woman, seguro for a man. Confidence is not a fact about a thing, it is an evaluation of a person, so segura almost always appears in a question or a conversation about someone specific: ¿Eres segura?, ¿Es segura? The answer is simple: segura describes a specific person\'s self-confidence, not looks or speed.',
  'pt-BR': 'Segura descreve a autoconfiança de uma pessoa — uma qualidade de caráter vista no comportamento, não na aparência ou na velocidade. A qualidade concorda em gênero exatamente como bonito/bonita ou único/única: segura para uma mulher, seguro para um homem. Confiança não é um fato sobre uma coisa, é uma avaliação de uma pessoa, então segura quase sempre aparece numa pergunta ou conversa sobre alguém específico: ¿Eres segura?, ¿Es segura? A resposta é simples: segura descreve a autoconfiança de uma pessoa específica, não a aparência nem a velocidade.',
  vi: 'Segura mô tả sự tự tin của một người — một đặc điểm tính cách thấy được qua hành vi, không phải qua ngoại hình hay tốc độ. Đặc điểm hòa hợp theo giống y hệt như bonito/bonita hay único/única: segura cho phụ nữ, seguro cho đàn ông. Sự tự tin không phải là một sự thật về một vật, mà là đánh giá về một người, nên segura hầu như luôn xuất hiện trong câu hỏi hay cuộc trò chuyện về ai đó cụ thể: ¿Eres segura?, ¿Es segura? Câu trả lời rất đơn giản: segura mô tả sự tự tin của một người cụ thể, không phải ngoại hình hay tốc độ.',
  id: 'Segura menggambarkan kepercayaan diri seseorang — sifat karakter yang terlihat dari perilaku, bukan penampilan atau kecepatan. Sifatnya sesuai gender persis seperti bonito/bonita atau único/única: segura untuk wanita, seguro untuk pria. Kepercayaan diri bukan fakta tentang benda, melainkan penilaian tentang seseorang, jadi segura hampir selalu muncul dalam pertanyaan atau percakapan tentang seseorang tertentu: ¿Eres segura?, ¿Es segura? Jawabannya sederhana: segura menggambarkan kepercayaan diri orang tertentu, bukan penampilan atau kecepatan.',
  tr: 'Segura, bir kişinin kendine güvenini tanımlar — davranışta görülen bir karakter niteliğidir, görünüm ya da hızda değil. Nitelik, bonito/bonita ya da único/única gibi cinsiyete göre uyum sağlar: kadın için segura, erkek için seguro. Güven bir şey hakkında bir gerçek değil, bir kişi hakkında bir değerlendirmedir, bu yüzden segura hemen her zaman belirli biri hakkında bir soruda ya da sohbette görünür: ¿Eres segura?, ¿Es segura? Cevap basittir: segura, belirli bir kişinin kendine güvenini tanımlar, görünümü ya da hızı değil.',
  pl: 'Segura opisuje pewność siebie danej osoby — cechę charakteru widoczną w zachowaniu, nie w wyglądzie ani szybkości. Cecha zgadza się pod względem rodzaju dokładnie tak jak bonito/bonita czy único/única: segura dla kobiety, seguro dla mężczyzny. Pewność siebie to nie fakt o rzeczy, lecz ocena osoby, dlatego segura niemal zawsze pojawia się w pytaniu lub rozmowie o kimś konkretnym: ¿Eres segura?, ¿Es segura? Odpowiedź jest prosta: segura opisuje pewność siebie konkretnej osoby rodzaju żeńskiego, nie wygląd ani szybkość.',
});

const FORMULA_BODY = L({
  ru: 'Формула согласования та же, что и для других прилагательных: концовка -a для женского рода, концовка -o для мужского. Segura пишет -a, seguro меняет ровно одну букву на -o — ровно тот же принцип, что и bonita/bonito. Вопрос не меняет формулу: ¿Eres segura? и ¿Es segura? используют одну и ту же форму segura, потому что в обоих случаях речь о женщине — меняется только связка (eres или es), а не признак. Ответ прост: женский род — всегда -a, мужской — всегда -o, вне зависимости от того, вопрос это или утверждение.',
  uk: 'Формула узгодження та сама, що й для інших прикметників: закінчення -a для жіночого роду, закінчення -o для чоловічого. Segura пише -a, seguro змінює рівно одну літеру на -o — той самий принцип, що й bonita/bonito. Питання не змінює формулу: ¿Eres segura? і ¿Es segura? використовують ту саму форму segura, бо в обох випадках йдеться про жінку. Відповідь проста: тільки зв’язка (eres чи es) відрізняється між ними, а ознака — завжди segura, з -a.',
  es: 'The agreement formula is the same as for other adjectives: the ending -a for feminine, the ending -o for masculine. Segura writes -a, seguro changes exactly one letter to -o — the same principle as bonita/bonito. A question does not change the formula: ¿Eres segura? and ¿Es segura? use the same form segura, because in both cases it is about a woman — only the linking word changes (eres or es), not the quality. The answer is simple: feminine is always -a, masculine is always -o, regardless of whether it is a question or a statement.',
  'pt-BR': 'A fórmula de concordância é a mesma de outros adjetivos: a terminação -a para feminino, a terminação -o para masculino. Segura escreve -a, seguro muda exatamente uma letra para -o — o mesmo princípio de bonita/bonito. Uma pergunta não muda a fórmula: ¿Eres segura? e ¿Es segura? usam a mesma forma segura, porque nos dois casos é sobre uma mulher — só a ligação muda (eres ou es), não a qualidade. A resposta é simples: feminino é sempre -a, masculino é sempre -o, seja pergunta ou afirmação.',
  vi: 'Công thức hòa hợp giống như các tính từ khác: đuôi -a cho giống cái, đuôi -o cho giống đực. Segura viết -a, seguro chỉ đổi đúng một chữ cái thành -o — cùng nguyên tắc với bonita/bonito. Câu hỏi không đổi công thức: ¿Eres segura? và ¿Es segura? dùng cùng dạng segura, vì cả hai trường hợp đều nói về phụ nữ — chỉ từ nối thay đổi (eres hay es), không phải đặc điểm. Câu trả lời rất đơn giản: giống cái luôn là -a, giống đực luôn là -o, dù là câu hỏi hay câu khẳng định.',
  id: 'Rumus kesesuaian sama seperti kata sifat lain: akhiran -a untuk feminin, akhiran -o untuk maskulin. Segura menulis -a, seguro mengubah tepat satu huruf menjadi -o — prinsip yang sama dengan bonita/bonito. Pertanyaan tidak mengubah rumus: ¿Eres segura? dan ¿Es segura? menggunakan bentuk yang sama segura, karena dalam kedua kasus tentang seorang wanita — hanya kata penghubung yang berubah (eres atau es), bukan sifatnya. Jawabannya sederhana: feminin selalu -a, maskulin selalu -o, baik itu pertanyaan maupun pernyataan.',
  tr: 'Uyum formülü diğer sıfatlarla aynıdır: dişil için -a son eki, eril için -o son eki. Segura -a yazar, seguro tam olarak tek bir harfi -o olarak değiştirir — bonita/bonito ile aynı ilke. Bir soru formülü değiştirmez: ¿Eres segura? ve ¿Es segura? aynı segura biçimini kullanır, çünkü her iki durumda da bir kadın hakkındadır. Cevap basittir: sadece bağlaç (eres ya da es) ikisi arasında farklıdır, nitelik ise her zaman -a ile segura kalır.',
  pl: 'Formuła zgodności jest taka sama jak dla innych przymiotników: końcówka -a dla rodzaju żeńskiego, końcówka -o dla męskiego. Segura pisze -a, seguro zmienia dokładnie jedną literę na -o — ta sama zasada co bonita/bonito. Pytanie nie zmienia formuły: ¿Eres segura? i ¿Es segura? używają tej samej formy segura, ponieważ w obu przypadkach mowa o kobiecie — zmienia się tylko łącznik (eres lub es), nie cecha. Odpowiedź jest prosta: rodzaj żeński to zawsze -a, męski to zawsze -o, niezależnie od tego, czy to pytanie czy twierdzenie.',
});

const TRAP_BODY = L({
  ru: 'Легко перепутать eres и es, задавая вопрос: ¿Eres segura? спрашивают у самой собеседницы, глядя ей в глаза, а ¿Es segura? — о третьем лице, не с ней напрямую. Вторая ловушка — забыть про род и сказать ¿Eres seguro? женщине: seguro заканчивается на -o и годится только для мужчины. Bonita тоже не подходит вместо segura — bonita про внешность, а не про уверенность в себе, это другой признак. Проверка простая: спрашивают саму собеседницу — eres; спрашивают о ком-то ещё — es; про женщину — всегда segura, с -a.',
  uk: 'Легко сплутати eres і es, задаючи питання: ¿Eres segura? запитують у самої співрозмовниці, дивлячись їй в очі, а ¿Es segura? — про третю особу, не з нею напряму. Друга пастка — забути про рід і сказати ¿Eres seguro? жінці: seguro закінчується на -o і годиться тільки для чоловіка. Bonita теж не підходить замість segura — bonita про зовнішність, а не про впевненість у собі, це інша ознака. Перевірка проста: запитують саму співрозмовницю — eres; запитують про когось іншого — es; про жінку — завжди segura, з -a.',
  es: 'It is easy to confuse eres and es when asking: ¿Eres segura? asks the listener herself, looking her in the eyes, while ¿Es segura? is about a third person, not directly to her. The second trap is forgetting about gender and saying ¿Eres seguro? to a woman: seguro ends in -o and only fits a man. Bonita does not fit instead of segura either — bonita is about looks, not self-confidence, it is a different quality. The check is simple: asking the listener herself — eres; asking about someone else — es; about a woman — always segura, with -a.',
  'pt-BR': 'É fácil confundir eres e es ao perguntar: ¿Eres segura? pergunta à própria interlocutora, olhando nos olhos dela, enquanto ¿Es segura? é sobre uma terceira pessoa, não diretamente com ela. A segunda armadilha é esquecer o gênero e dizer ¿Eres seguro? a uma mulher: seguro termina em -o e só cabe a um homem. Bonita também não cabe no lugar de segura — bonita é sobre aparência, não autoconfiança, é uma qualidade diferente. A checagem é simples: perguntando à própria interlocutora — eres; perguntando sobre outra pessoa — es; sobre uma mulher — sempre segura, com -a.',
  vi: 'Dễ nhầm lẫn eres và es khi hỏi: ¿Eres segura? hỏi chính người nghe, nhìn thẳng vào mắt cô ấy, còn ¿Es segura? nói về ngôi thứ ba, không phải trực tiếp với cô ấy. Cái bẫy thứ hai là quên mất giống và nói ¿Eres seguro? với một phụ nữ: seguro kết thúc bằng -o và chỉ phù hợp với đàn ông. Bonita cũng không phù hợp thay cho segura — bonita nói về ngoại hình, không phải sự tự tin, đó là đặc điểm khác. Cách kiểm tra đơn giản: hỏi chính người nghe — eres; hỏi về người khác — es; về phụ nữ — luôn là segura, với -a.',
  id: 'Mudah mengacaukan eres dan es saat bertanya: ¿Eres segura? bertanya kepada pendengar itu sendiri, menatap matanya, sedangkan ¿Es segura? tentang orang ketiga, bukan langsung dengannya. Jebakan kedua adalah lupa gender dan mengatakan ¿Eres seguro? kepada seorang wanita: seguro berakhiran -o dan hanya cocok untuk pria. Bonita juga tidak cocok menggantikan segura — bonita tentang penampilan, bukan kepercayaan diri, itu sifat yang berbeda. Pengecekannya sederhana: bertanya kepada pendengar itu sendiri — eres; bertanya tentang orang lain — es; tentang wanita — selalu segura, dengan -a.',
  tr: 'Sorarken eres ve es’i karıştırmak kolaydır: ¿Eres segura? dinleyicinin kendisine, gözlerinin içine bakarak sorar, ¿Es segura? ise doğrudan onunla değil, üçüncü bir kişi hakkındadır. İkinci tuzak, cinsiyeti unutup bir kadına ¿Eres seguro? demektir: seguro -o ile biter ve yalnızca bir erkeğe uyar. Bonita da segura yerine uymaz — bonita görünüm hakkındadır, kendine güven değil, farklı bir niteliktir. Kontrol basittir: dinleyicinin kendisine sormak — eres; başka biri hakkında sormak — es; bir kadın hakkında — her zaman segura, -a ile.',
  pl: 'Łatwo pomylić eres i es, pytając: ¿Eres segura? pyta samą słuchaczkę, patrząc jej w oczy, a ¿Es segura? dotyczy trzeciej osoby, nie bezpośrednio jej. Druga pułapka to zapomnienie o rodzaju i powiedzenie ¿Eres seguro? do kobiety: seguro kończy się na -o i pasuje tylko do mężczyzny. Bonita też nie pasuje zamiast segura — bonita dotyczy wyglądu, nie pewności siebie, to inna cecha. Sprawdzenie jest proste: pytając samą słuchaczkę — eres; pytając o kogoś innego — es; o kobietę — zawsze segura, z -a.',
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
      ru: R({ text: 'Segura описывает уверенность человека в себе — качество характера, которое видно по поведению, а не по внешности или скорости. Признак согласуется по роду точно так же, как bonito/bonita или único/única: ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ' для женщины, seguro для мужчины. Уверенность — это не факт о предмете, а оценка человека, поэтому segura почти всегда звучит в вопросе или разговоре о ком-то конкретном: ¿Eres segura?, ¿Es segura? Ответ прост: segura описывает уверенность в себе конкретного человека женского рода, а не внешность и не скорость.', semantic: 'explanation' }),
      uk: R({ text: 'Segura описує впевненість людини в собі — якість характеру, яку видно з поведінки, а не із зовнішності чи швидкості. Ознака узгоджується за родом точно так само, як bonito/bonita чи único/única: ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ' для жінки, seguro для чоловіка. Впевненість — це не факт про предмет, а оцінка людини, тому segura майже завжди звучить у питанні чи розмові про когось конкретного: ¿Eres segura?, ¿Es segura? Відповідь проста: segura описує впевненість у собі конкретної людини жіночого роду, а не зовнішність і не швидкість.', semantic: 'explanation' }),
      es: R({ text: 'Segura describes a person\'s self-confidence — a character quality seen in behavior, not in looks or speed. The quality agrees by gender exactly like bonito/bonita or único/única: ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ' for a woman, seguro for a man. Confidence is not a fact about a thing, it is an evaluation of a person, so segura almost always appears in a question or a conversation about someone specific: ¿Eres segura?, ¿Es segura? The answer is simple: segura describes the self-confidence of a specific feminine person, not looks or speed.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Segura descreve a autoconfiança de uma pessoa — uma qualidade de caráter vista no comportamento, não na aparência ou na velocidade. A qualidade concorda em gênero exatamente como bonito/bonita ou único/única: ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ' para uma mulher, seguro para um homem. Confiança não é um fato sobre uma coisa, é uma avaliação de uma pessoa, então segura quase sempre aparece numa pergunta ou conversa sobre alguém específico: ¿Eres segura?, ¿Es segura? A resposta é simples: segura descreve a autoconfiança de uma pessoa feminina específica, não a aparência nem a velocidade.', semantic: 'explanation' }),
      vi: R({ text: 'Segura mô tả sự tự tin của một người — một đặc điểm tính cách thấy được qua hành vi, không phải qua ngoại hình hay tốc độ. Đặc điểm hòa hợp theo giống y hệt như bonito/bonita hay único/única: ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ' cho phụ nữ, seguro cho đàn ông. Sự tự tin không phải là một sự thật về một vật, mà là đánh giá về một người, nên segura hầu như luôn xuất hiện trong câu hỏi hay cuộc trò chuyện về ai đó cụ thể: ¿Eres segura?, ¿Es segura? Câu trả lời rất đơn giản: segura mô tả sự tự tin của một người giống cái cụ thể, không phải ngoại hình hay tốc độ.', semantic: 'explanation' }),
      id: R({ text: 'Segura menggambarkan kepercayaan diri seseorang — sifat karakter yang terlihat dari perilaku, bukan penampilan atau kecepatan. Sifatnya sesuai gender persis seperti bonito/bonita atau único/única: ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ' untuk wanita, seguro untuk pria. Kepercayaan diri bukan fakta tentang benda, melainkan penilaian tentang seseorang, jadi segura hampir selalu muncul dalam pertanyaan atau percakapan tentang seseorang tertentu: ¿Eres segura?, ¿Es segura? Jawabannya sederhana: segura menggambarkan kepercayaan diri orang feminin tertentu, bukan penampilan atau kecepatan.', semantic: 'explanation' }),
      tr: R({ text: 'Segura, bir kişinin kendine güvenini tanımlar — davranışta görülen bir karakter niteliğidir, görünüm ya da hızda değil. Nitelik, bonito/bonita ya da único/única gibi cinsiyete göre uyum sağlar: kadın için ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ', erkek için seguro. Güven bir şey hakkında bir gerçek değil, bir kişi hakkında bir değerlendirmedir, bu yüzden segura hemen her zaman belirli biri hakkında bir soruda ya da sohbette görünür: ¿Eres segura?, ¿Es segura? Cevap basittir: segura, belirli dişil bir kişinin kendine güvenini tanımlar, görünümü ya da hızı değil.', semantic: 'explanation' }),
      pl: R({ text: 'Segura opisuje pewność siebie danej osoby — cechę charakteru widoczną w zachowaniu, nie w wyglądzie ani szybkości. Cecha zgadza się pod względem rodzaju dokładnie tak jak bonito/bonita czy único/única: ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ' dla kobiety, seguro dla mężczyzny. Pewność siebie to nie fakt o rzeczy, lecz ocena osoby, dlatego segura niemal zawsze pojawia się w pytaniu lub rozmowie o kimś konkretnym: ¿Eres segura?, ¿Es segura? Odpowiedź jest prosta: segura opisuje pewność siebie konkretnej osoby rodzaju żeńskiego, nie wygląd ani szybkość.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула согласования та же, что и для других прилагательных: концовка -a для женского рода, концовка -o для мужского. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' пишет -a, ', semantic: 'explanation' }, { text: 'seguro', semantic: 'explanation' }, { text: ' меняет ровно одну букву на -o — ровно тот же принцип, что и bonita/bonito. Вопрос не меняет формулу: ¿Eres segura? и ¿Es segura? используют одну и ту же форму ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ', потому что в обоих случаях речь о женщине — меняется только связка (eres или es), а не признак. Ответ прост: женский род — всегда -a, мужской — всегда -o, вне зависимости от того, вопрос это или утверждение.', semantic: 'explanation' }),
      uk: R({ text: 'Формула узгодження та сама, що й для інших прикметників: закінчення -a для жіночого роду, закінчення -o для чоловічого. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' пише -a, ', semantic: 'explanation' }, { text: 'seguro', semantic: 'explanation' }, { text: ' змінює рівно одну літеру на -o — той самий принцип, що й bonita/bonito. Питання не змінює формулу: ¿Eres segura? і ¿Es segura? використовують ту саму форму ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ', бо в обох випадках йдеться про жінку — змінюється лише зв’язка (eres чи es), а не ознака. Відповідь проста: жіночий рід — завжди -a, чоловічий — завжди -o, незалежно від того, питання це чи твердження.', semantic: 'explanation' }),
      es: R({ text: 'The agreement formula is the same as for other adjectives: the ending -a for feminine, the ending -o for masculine. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' writes -a, ', semantic: 'explanation' }, { text: 'seguro', semantic: 'explanation' }, { text: ' changes exactly one letter to -o — the same principle as bonita/bonito. A question does not change the formula: ¿Eres segura? and ¿Es segura? use the same form ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ', because in both cases it is about a woman — only the linking word changes (eres or es), not the quality. The answer is simple: feminine is always -a, masculine is always -o, regardless of whether it is a question or a statement.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de concordância é a mesma de outros adjetivos: a terminação -a para feminino, a terminação -o para masculino. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' escreve -a, ', semantic: 'explanation' }, { text: 'seguro', semantic: 'explanation' }, { text: ' muda exatamente uma letra para -o — o mesmo princípio de bonita/bonito. Uma pergunta não muda a fórmula: ¿Eres segura? e ¿Es segura? usam a mesma forma ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ', porque nos dois casos é sobre uma mulher — só a ligação muda (eres ou es), não a qualidade. A resposta é simples: feminino é sempre -a, masculino é sempre -o, seja pergunta ou afirmação.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức hòa hợp giống như các tính từ khác: đuôi -a cho giống cái, đuôi -o cho giống đực. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' viết -a, ', semantic: 'explanation' }, { text: 'seguro', semantic: 'explanation' }, { text: ' chỉ đổi đúng một chữ cái thành -o — cùng nguyên tắc với bonita/bonito. Câu hỏi không đổi công thức: ¿Eres segura? và ¿Es segura? dùng cùng dạng ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ', vì cả hai trường hợp đều nói về phụ nữ — chỉ từ nối thay đổi (eres hay es), không phải đặc điểm. Câu trả lời rất đơn giản: giống cái luôn là -a, giống đực luôn là -o, dù là câu hỏi hay câu khẳng định.', semantic: 'explanation' }),
      id: R({ text: 'Rumus kesesuaian sama seperti kata sifat lain: akhiran -a untuk feminin, akhiran -o untuk maskulin. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' menulis -a, ', semantic: 'explanation' }, { text: 'seguro', semantic: 'explanation' }, { text: ' mengubah tepat satu huruf menjadi -o — prinsip yang sama dengan bonita/bonito. Pertanyaan tidak mengubah rumus: ¿Eres segura? dan ¿Es segura? menggunakan bentuk yang sama ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ', karena dalam kedua kasus tentang seorang wanita — hanya kata penghubung yang berubah (eres atau es), bukan sifatnya. Jawabannya sederhana: feminin selalu -a, maskulin selalu -o, baik itu pertanyaan maupun pernyataan.', semantic: 'explanation' }),
      tr: R({ text: 'Uyum formülü diğer sıfatlarla aynıdır: dişil için -a son eki, eril için -o son eki. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' -a yazar, ', semantic: 'explanation' }, { text: 'seguro', semantic: 'explanation' }, { text: ' tam olarak tek bir harfi -o olarak değiştirir — bonita/bonito ile aynı ilke. Bir soru formülü değiştirmez: ¿Eres segura? ve ¿Es segura? aynı ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ' biçimini kullanır, çünkü her iki durumda da bir kadın hakkındadır — yalnızca bağlaç değişir (eres ya da es), nitelik değil. Cevap basittir: dişil her zaman -a, eril her zaman -o, ister soru ister ifade olsun.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła zgodności jest taka sama jak dla innych przymiotników: końcówka -a dla rodzaju żeńskiego, końcówka -o dla męskiego. ', semantic: 'explanation' }, { text: 'Segura', semantic: 'targetCorrect' }, { text: ' pisze -a, ', semantic: 'explanation' }, { text: 'seguro', semantic: 'explanation' }, { text: ' zmienia dokładnie jedną literę na -o — ta sama zasada co bonita/bonito. Pytanie nie zmienia formuły: ¿Eres segura? i ¿Es segura? używają tej samej formy ', semantic: 'explanation' }, { text: 'segura', semantic: 'targetCorrect' }, { text: ', ponieważ w obu przypadkach mowa o kobiecie — zmienia się tylko łącznik (eres lub es), nie cecha. Odpowiedź jest prosta: rodzaj żeński to zawsze -a, męski to zawsze -o, niezależnie od tego, czy to pytanie czy twierdzenie.', semantic: 'explanation' }),
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
      ru: R({ text: 'Легко перепутать eres и es, задавая вопрос: ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' спрашивают у самой собеседницы, глядя ей в глаза, а ', semantic: 'explanation' }, { text: '¿Es segura?', semantic: 'explanation' }, { text: ' — о третьем лице, не с ней напрямую. Вторая ловушка — забыть про род и сказать ', semantic: 'explanation' }, { text: '¿Eres seguro?', semantic: 'targetWrong' }, { text: ' женщине: seguro заканчивается на -o и годится только для мужчины. Bonita тоже не подходит вместо segura — bonita про внешность, а не про уверенность в себе, это другой признак. Проверка простая: спрашивают саму собеседницу — eres; спрашивают о ком-то ещё — es; про женщину — всегда segura, с -a.', semantic: 'explanation' }),
      uk: R({ text: 'Легко сплутати eres і es, задаючи питання: ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' запитують у самої співрозмовниці, дивлячись їй в очі, а ', semantic: 'explanation' }, { text: '¿Es segura?', semantic: 'explanation' }, { text: ' — про третю особу, не з нею напряму. Друга пастка — забути про рід і сказати ', semantic: 'explanation' }, { text: '¿Eres seguro?', semantic: 'targetWrong' }, { text: ' жінці: seguro закінчується на -o і годиться тільки для чоловіка. Bonita теж не підходить замість segura — bonita про зовнішність, а не про впевненість у собі, це інша ознака. Перевірка проста: запитують саму співрозмовницю — eres; запитують про когось іншого — es; про жінку — завжди segura, з -a.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to confuse eres and es when asking: ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' asks the listener herself, looking her in the eyes, while ', semantic: 'explanation' }, { text: '¿Es segura?', semantic: 'explanation' }, { text: ' is about a third person, not directly to her. The second trap is forgetting about gender and saying ', semantic: 'explanation' }, { text: '¿Eres seguro?', semantic: 'targetWrong' }, { text: ' to a woman: seguro ends in -o and only fits a man. Bonita does not fit instead of segura either — bonita is about looks, not self-confidence, it is a different quality. The check is simple: asking the listener herself — eres; asking about someone else — es; about a woman — always segura, with -a.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil confundir eres e es ao perguntar: ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' pergunta à própria interlocutora, olhando nos olhos dela, enquanto ', semantic: 'explanation' }, { text: '¿Es segura?', semantic: 'explanation' }, { text: ' é sobre uma terceira pessoa, não diretamente com ela. A segunda armadilha é esquecer o gênero e dizer ', semantic: 'explanation' }, { text: '¿Eres seguro?', semantic: 'targetWrong' }, { text: ' a uma mulher: seguro termina em -o e só cabe a um homem. Bonita também não cabe no lugar de segura — bonita é sobre aparência, não autoconfiança, é uma qualidade diferente. A checagem é simples: perguntando à própria interlocutora — eres; perguntando sobre outra pessoa — es; sobre uma mulher — sempre segura, com -a.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ nhầm lẫn eres và es khi hỏi: ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' hỏi chính người nghe, nhìn thẳng vào mắt cô ấy, còn ', semantic: 'explanation' }, { text: '¿Es segura?', semantic: 'explanation' }, { text: ' nói về ngôi thứ ba, không phải trực tiếp với cô ấy. Cái bẫy thứ hai là quên mất giống và nói ', semantic: 'explanation' }, { text: '¿Eres seguro?', semantic: 'targetWrong' }, { text: ' với một phụ nữ: seguro kết thúc bằng -o và chỉ phù hợp với đàn ông. Bonita cũng không phù hợp thay cho segura — bonita nói về ngoại hình, không phải sự tự tin, đó là đặc điểm khác. Cách kiểm tra đơn giản: hỏi chính người nghe — eres; hỏi về người khác — es; về phụ nữ — luôn là segura, với -a.', semantic: 'explanation' }),
      id: R({ text: 'Mudah mengacaukan eres dan es saat bertanya: ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' bertanya kepada pendengar itu sendiri, menatap matanya, sedangkan ', semantic: 'explanation' }, { text: '¿Es segura?', semantic: 'explanation' }, { text: ' tentang orang ketiga, bukan langsung dengannya. Jebakan kedua adalah lupa gender dan mengatakan ', semantic: 'explanation' }, { text: '¿Eres seguro?', semantic: 'targetWrong' }, { text: ' kepada seorang wanita: seguro berakhiran -o dan hanya cocok untuk pria. Bonita juga tidak cocok menggantikan segura — bonita tentang penampilan, bukan kepercayaan diri, itu sifat yang berbeda. Pengecekannya sederhana: bertanya kepada pendengar itu sendiri — eres; bertanya tentang orang lain — es; tentang wanita — selalu segura, dengan -a.', semantic: 'explanation' }),
      tr: R({ text: 'Sorarken eres ve es’i karıştırmak kolaydır: ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' dinleyicinin kendisine, gözlerinin içine bakarak sorar, ', semantic: 'explanation' }, { text: '¿Es segura?', semantic: 'explanation' }, { text: ' ise doğrudan onunla değil, üçüncü bir kişi hakkındadır. İkinci tuzak, cinsiyeti unutup bir kadına ', semantic: 'explanation' }, { text: '¿Eres seguro?', semantic: 'targetWrong' }, { text: ' demektir: seguro -o ile biter ve yalnızca bir erkeğe uyar. Bonita da segura yerine uymaz — bonita görünüm hakkındadır, kendine güven değil, farklı bir niteliktir. Kontrol basittir: dinleyicinin kendisine sormak — eres; başka biri hakkında sormak — es; bir kadın hakkında — her zaman segura, -a ile.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomylić eres i es, pytając: ', semantic: 'explanation' }, { text: '¿Eres segura?', semantic: 'targetCorrect' }, { text: ' pyta samą słuchaczkę, patrząc jej w oczy, a ', semantic: 'explanation' }, { text: '¿Es segura?', semantic: 'explanation' }, { text: ' dotyczy trzeciej osoby, nie bezpośrednio jej. Druga pułapka to zapomnienie o rodzaju i powiedzenie ', semantic: 'explanation' }, { text: '¿Eres seguro?', semantic: 'targetWrong' }, { text: ' do kobiety: seguro kończy się na -o i pasuje tylko do mężczyzny. Bonita też nie pasuje zamiast segura — bonita dotyczy wyglądu, nie pewności siebie, to inna cecha. Sprawdzenie jest proste: pytając samą słuchaczkę — eres; pytając o kogoś innego — es; o kobietę — zawsze segura, z -a.', semantic: 'explanation' }),
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
