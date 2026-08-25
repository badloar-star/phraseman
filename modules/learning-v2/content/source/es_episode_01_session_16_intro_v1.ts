import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 16 "Я и ты целиком" / kind: 'checkpoint', builtOn: [9..15],
// recalls: [1,9,10,13,14]): интро НЕ упоминает "сессию/урок/главу/курс/экран/
// карточку" (тот же чёрный список слов, что и в сессии 8) — вместо этого
// прямо говорит о том, что проверяется владение всем материалом главы 2 "Ты"
// целиком, без подсказок, без разбивки на отдельные темы. Recalls es/soy
// напротив eres (1, 9), question_marks/question_intonation (10),
// pronoun_drop (13), agreement_phrase de acuerdo (14).
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_16_CHECKPOINT_TITLE = L({
  ru: 'Я и ты целиком',
  uk: 'Я і ти цілком',
  es: '"I" and "you" all together',
  'pt-BR': '"Eu" e "você" juntos',
  vi: 'Tất cả về "tôi" và "bạn" cùng một lúc',
  id: 'Semua tentang "saya" dan "kamu" sekaligus',
  tr: '"Ben" ve "sen" hakkında her şey birlikte',
  pl: '„Ja” i „ty” razem',
});

export const ES_EPISODE_01_SESSION_16_CHECKPOINT_SUMMARY = L({
  ru: 'Все связки, вопросы и формулы про себя и про собеседника, встречавшиеся до сих пор, проверяются вместе, без подсказок и без разбивки по темам.',
  uk: 'Усі зв’язки, питання й формули про себе й про співрозмовника, що траплялися досі, перевіряються разом, без підказок і без розбивки за темами.',
  es: 'All the linking words, questions, and formulas about oneself and about the other person seen so far are checked together, without hints and without splitting by topic.',
  'pt-BR': 'Todas as ligações, perguntas e fórmulas sobre si mesmo e sobre o interlocutor vistas até agora são verificadas juntas, sem dicas e sem divisão por tema.',
  vi: 'Tất cả các từ nối, câu hỏi và công thức về bản thân và về người đối thoại đã gặp cho đến nay được kiểm tra cùng nhau, không gợi ý và không chia theo chủ đề.',
  id: 'Semua kata penghubung, pertanyaan, dan rumus tentang diri sendiri dan tentang lawan bicara yang sudah dijumpai sejauh ini diperiksa bersama, tanpa petunjuk dan tanpa pembagian berdasarkan topik.',
  tr: 'Şimdiye kadar görülen, kendisi ve karşısındaki kişi hakkındaki tüm bağlayıcılar, sorular ve formüller birlikte kontrol edilir, ipucu olmadan ve konuya göre ayrım yapılmadan.',
  pl: 'Wszystkie łączniki, pytania i formuły o sobie i o rozmówcy poznane dotąd są sprawdzane razem, bez podpowiedzi i bez podziału na tematy.',
});

export const ES_EPISODE_01_SESSION_16_CHECKPOINT_GOAL = L({
  ru: 'Правильно применить любую из уже известных связок, вопросов и формул без подсказки, в произвольном порядке.',
  uk: 'Правильно застосувати будь-яку з уже відомих зв’язок, питань і формул без підказки, у довільному порядку.',
  es: 'Correctly apply any of the already-known linking words, questions, and formulas without a hint, in any order.',
  'pt-BR': 'Aplicar corretamente qualquer uma das ligações, perguntas e fórmulas já conhecidas sem dica, em qualquer ordem.',
  vi: 'Áp dụng đúng bất kỳ từ nối, câu hỏi hoặc công thức nào đã biết mà không có gợi ý, theo bất kỳ thứ tự nào.',
  id: 'Menerapkan dengan benar salah satu dari kata penghubung, pertanyaan, dan rumus yang sudah dikenal tanpa petunjuk, dalam urutan apa pun.',
  tr: 'Zaten bilinen bağlayıcılardan, sorulardan ve formüllerden herhangi birini ipucu olmadan, herhangi bir sırayla doğru şekilde uygulamak.',
  pl: 'Poprawnie zastosować dowolny ze znanych już łączników, pytań i formuł bez podpowiedzi, w dowolnej kolejności.',
});

const CONCEPT_BODY = L({
  ru: 'До сих пор каждое правило проверялось отдельно: сначала eres само по себе, потом вопросы, потом formula de acuerdo — каждый раз с известной темой заранее. Здесь темы перемешаны: подряд может встретиться и связка о собеседнике, и связка о себе, и вопрос, и согласие — без предупреждения, что именно потребуется дальше. Eres обращается к собеседнику напрямую, а es и soy используются, когда речь о предмете или о самом себе. Спутать их здесь так же легко, как перепутать признак темпа с признаком истинности.',
  uk: 'Досі кожне правило перевірялося окремо: спершу eres саме по собі, потім питання, потім formula de acuerdo — щоразу з відомою темою заздалегідь. Тут теми перемішані: підряд може трапитися і зв’язка про співрозмовника, і зв’язка про себе, і питання, і згода — без попередження, що саме знадобиться далі. Eres звертається до співрозмовника напряму, а es і soy використовуються, коли йдеться про предмет чи про себе самого. Сплутати їх тут так само легко, як переплутати ознаку темпу з ознакою істинності.',
  es: 'Until now, each rule was checked separately: first eres on its own, then questions, then the formula de acuerdo — each time with the topic known in advance. Here the topics are mixed together: in a row one might meet a linking word about the other person, then one about oneself, then a question, then agreement — with no warning about which will come next. Eres addresses the other person directly, while es and soy are used when talking about a thing or about oneself. Confusing them here is just as easy as confusing a pace quality with a truth quality.',
  'pt-BR': 'Até agora, cada regra era verificada separadamente: primeiro eres sozinha, depois as perguntas, depois a fórmula de acuerdo — cada vez com o tema já conhecido de antemão. Aqui os temas se misturam: em seguida pode aparecer uma ligação sobre o interlocutor, depois uma sobre si mesmo, depois uma pergunta, depois um acordo — sem aviso de qual virá a seguir. Eres se dirige ao interlocutor diretamente, enquanto es e soy são usadas quando se fala de uma coisa ou de si mesmo. Confundi-las aqui é tão fácil quanto confundir uma qualidade de ritmo com uma qualidade de veracidade.',
  vi: 'Cho đến giờ, mỗi quy tắc được kiểm tra riêng biệt: đầu tiên eres một mình, rồi các câu hỏi, rồi công thức de acuerdo — mỗi lần đều biết trước chủ đề. Ở đây các chủ đề được trộn lẫn: liên tiếp có thể gặp một từ nối về người đối thoại, rồi một từ nối về bản thân, rồi một câu hỏi, rồi một sự đồng ý — không có cảnh báo trước điều gì sẽ đến tiếp theo. Eres hướng thẳng đến người đối thoại, còn es và soy được dùng khi nói về một vật hay về chính mình. Nhầm lẫn chúng ở đây cũng dễ như nhầm một đặc điểm về tốc độ với một đặc điểm về tính đúng đắn.',
  id: 'Sampai sekarang, setiap aturan diperiksa secara terpisah: pertama eres sendiri, lalu pertanyaan-pertanyaan, lalu rumus de acuerdo — setiap kali dengan topik yang sudah diketahui sebelumnya. Di sini topik-topik tercampur: berturut-turut bisa muncul kata penghubung tentang lawan bicara, lalu tentang diri sendiri, lalu pertanyaan, lalu persetujuan — tanpa peringatan tentang mana yang akan datang berikutnya. Eres ditujukan langsung kepada lawan bicara, sedangkan es dan soy dipakai ketika membicarakan suatu benda atau diri sendiri. Tertukar di sini sama mudahnya dengan tertukar sifat kecepatan dengan sifat kebenaran.',
  tr: 'Şimdiye kadar her kural ayrı ayrı kontrol edildi: önce eres tek başına, sonra sorular, sonra de acuerdo formülü — her seferinde konu önceden bilinerek. Burada konular birbirine karışır: art arda karşısındaki kişi hakkında bir bağlayıcı, sonra kendisi hakkında bir bağlayıcı, sonra bir soru, sonra bir onay gelebilir — sırada ne olduğuna dair önceden bir uyarı olmadan. Eres doğrudan karşısındaki kişiye seslenir, es ve soy ise bir şeyden ya da kendisinden bahsederken kullanılır. Burada bunları karıştırmak, bir tempo niteliğini bir doğruluk niteliğiyle karıştırmak kadar kolaydır.',
  pl: 'Do tej pory każda reguła była sprawdzana osobno: najpierw eres samo w sobie, potem pytania, potem formuła de acuerdo — za każdym razem z tematem znanym z góry. Tutaj tematy są pomieszane: pod rząd może pojawić się łącznik o rozmówcy, potem o sobie, potem pytanie, potem zgoda — bez ostrzeżenia, co będzie dalej. Eres zwraca się bezpośrednio do rozmówcy, a es i soy używa się, gdy mowa o rzeczy lub o sobie samym. Pomylenie ich tutaj jest tak samo łatwe, jak pomylenie cechy tempa z cechą prawdziwości.',
});

const FORMULA_BODY = L({
  ru: 'Формула проверки простая: сначала нужно понять, о ком идёт речь — о собеседнике, о себе или о предмете, — и только потом подобрать нужную связку. ¿Eres bonito? и ¿Es bonito? выглядят похоже по структуре — вопрос плюс признак на -o — но требуют разных связок: eres обращается к собеседнику, es говорит о ком-то или о чём-то другом. No eres de acuerdo и No es de acuerdo используют одну и ту же формулу согласия, потому что de acuerdo не меняется ни по роду, ни по числу. Ответ прост: собственный смысл каждого слова определяет выбор, а не место в предложении.',
  uk: 'Формула перевірки проста: спершу потрібно зрозуміти, про кого йдеться — про співрозмовника, про себе чи про предмет, — і лише потім підібрати потрібну зв’язку. ¿Eres bonito? і ¿Es bonito? виглядають подібно за структурою — питання плюс ознака на -o — але вимагають різних зв’язок: eres звертається до співрозмовника, es говорить про когось чи щось інше. No eres de acuerdo і No es de acuerdo використовують ту саму формулу згоди, бо de acuerdo не змінюється ні за родом, ні за числом. Відповідь проста: власний зміст кожного слова визначає вибір, а не місце в реченні.',
  es: 'The checking formula is simple: first you need to understand who is being talked about — the other person, oneself, or a thing — and only then pick the right linking word. ¿Eres bonito? and ¿Es bonito? look similar in structure — a question plus a quality ending in -o — but need different linking words: eres addresses the other person, es talks about someone or something else. No eres de acuerdo and No es de acuerdo use the same agreement formula, because de acuerdo does not change for gender or number. Each word is recognized by its own meaning, not by its place in the sentence.',
  'pt-BR': 'A fórmula de verificação é simples: primeiro é preciso entender de quem se fala — do interlocutor, de si mesmo ou de uma coisa — e só depois escolher a ligação certa. ¿Eres bonito? e ¿Es bonito? parecem semelhantes na estrutura — uma pergunta mais uma qualidade terminada em -o — mas exigem ligações diferentes: eres se dirige ao interlocutor, es fala de outra pessoa ou coisa. No eres de acuerdo e No es de acuerdo usam a mesma fórmula de concordância, porque de acuerdo não muda nem de gênero nem de número. Cada palavra é reconhecida pelo próprio significado, não pelo lugar na frase.',
  vi: 'Công thức kiểm tra rất đơn giản: trước tiên cần hiểu đang nói về ai — người đối thoại, bản thân, hay một vật — và chỉ sau đó mới chọn đúng từ nối. ¿Eres bonito? và ¿Es bonito? trông giống nhau về cấu trúc — một câu hỏi cộng một đặc điểm kết thúc bằng -o — nhưng cần những từ nối khác nhau: eres hướng đến người đối thoại, es nói về ai đó hoặc điều gì khác. No eres de acuerdo và No es de acuerdo dùng cùng một công thức đồng ý, vì de acuerdo không đổi theo giống hay số. Mỗi từ được nhận ra bằng chính nghĩa của nó, không phải bằng vị trí trong câu.',
  id: 'Rumus pemeriksaannya sederhana: pertama perlu memahami tentang siapa yang dibicarakan — lawan bicara, diri sendiri, atau benda — dan baru setelah itu memilih kata penghubung yang tepat. ¿Eres bonito? dan ¿Es bonito? terlihat mirip strukturnya — pertanyaan ditambah sifat berakhiran -o — tetapi memerlukan kata penghubung berbeda: eres ditujukan kepada lawan bicara, es berbicara tentang orang atau hal lain. No eres de acuerdo dan No es de acuerdo menggunakan rumus persetujuan yang sama, karena de acuerdo tidak berubah menurut gender maupun jumlah. Setiap kata dikenali dari maknanya sendiri, bukan dari posisinya dalam kalimat.',
  tr: 'Kontrol formülü basittir: önce kimden bahsedildiğini anlamak gerekir — karşısındaki kişiden mi, kendisinden mi, yoksa bir şeyden mi — ancak sonrasında doğru bağlayıcı seçilir. ¿Eres bonito? ve ¿Es bonito? yapı olarak benzer görünür — bir soru artı -o ile biten bir nitelik — ama farklı bağlayıcılar gerektirir: eres karşısındaki kişiye seslenir, es başka birinden ya da bir şeyden bahseder. No eres de acuerdo ve No es de acuerdo aynı onay formülünü kullanır, çünkü de acuerdo ne cinsiyete ne de sayıya göre değişir. Her kelime, cümledeki yerine göre değil, kendi anlamına göre tanınır.',
  pl: 'Formuła sprawdzenia jest prosta: najpierw trzeba zrozumieć, o kim mowa — o rozmówcy, o sobie czy o rzeczy — a dopiero potem dobrać właściwy łącznik. ¿Eres bonito? i ¿Es bonito? wyglądają podobnie pod względem struktury — pytanie plus cecha zakończona na -o — ale wymagają różnych łączników: eres zwraca się do rozmówcy, es mówi o kimś lub czymś innym. No eres de acuerdo i No es de acuerdo używają tej samej formuły zgody, ponieważ de acuerdo nie zmienia się ani przez rodzaj, ani przez liczbę. Każde słowo rozpoznaje się po jego własnym znaczeniu, a nie po miejscu w zdaniu.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка здесь — спутать eres с es, забыв, к кому обращена фраза. Ещё одна ловушка — прочитать вопрос ровным тоном, как утверждение, забыв, что подъём голоса к концу фразы так же важен, как и знаки ¿...? на письме. Третья ловушка — решить, что de acuerdo меняется по роду или числу, как bonito или rápido: на самом деле de acuerdo остаётся одним и тем же словом независимо от того, кто говорит и о ком. Проверка простая: сначала к кому обращена фраза, затем вопрос это или утверждение по звуку, и только потом форма связки.',
  uk: 'Найчастіша помилка тут — сплутати eres із es, забувши, до кого звернена фраза. Ще одна пастка — прочитати питання рівним тоном, як твердження, забувши, що підйом голосу до кінця фрази так само важливий, як і знаки ¿...? на письмі. Третя пастка — вирішити, що de acuerdo змінюється за родом чи числом, як bonito чи rápido: насправді de acuerdo лишається тим самим словом незалежно від того, хто говорить і про кого. Перевірка проста: спершу до кого звернена фраза, потім питання це чи твердження за звуком, і лише потім форма зв’язки.',
  es: 'The most common mistake here is confusing eres with es, forgetting who the phrase is addressed to. Another trap is reading a question with a level tone, as a statement, forgetting that the rise in pitch toward the end of the phrase matters just as much as the marks ¿...? in writing. A third trap is deciding that de acuerdo changes for gender or number, like bonito or rápido: in fact de acuerdo stays the exact same word no matter who is speaking or who is being addressed. The check is simple: first who the phrase addresses, then question or statement by sound, only then the form of the linking word.',
  'pt-BR': 'O erro mais comum aqui é confundir eres com es, esquecendo a quem a frase se dirige. Outra armadilha é ler uma pergunta com tom nivelado, como uma afirmação, esquecendo que a subida de tom em direção ao fim da frase importa tanto quanto os sinais ¿...? por escrito. Uma terceira armadilha é decidir que de acuerdo muda de gênero ou número, como bonito ou rápido: na verdade de acuerdo permanece exatamente a mesma palavra, não importa quem fala nem com quem se fala. A checagem é simples: primeiro a quem a frase se dirige, depois pergunta ou afirmação pelo som, só depois a forma da ligação.',
  vi: 'Lỗi phổ biến nhất ở đây là nhầm eres với es, quên mất câu đang hướng đến ai. Một cái bẫy khác là đọc một câu hỏi bằng giọng đều đều, như một câu khẳng định, quên rằng sự lên cao về cuối câu quan trọng không kém dấu ¿...? khi viết. Cái bẫy thứ ba là cho rằng de acuerdo đổi theo giống hay số, giống như bonito hay rápido: thực ra de acuerdo vẫn là đúng một từ đó, bất kể ai đang nói hay đang nói với ai. Cách kiểm tra đơn giản: trước tiên câu hướng đến ai, sau đó câu hỏi hay khẳng định qua âm thanh, chỉ sau đó mới đến dạng từ nối.',
  id: 'Kesalahan paling umum di sini adalah tertukar antara eres dan es, lupa kepada siapa frasa itu ditujukan. Jebakan lain adalah membaca pertanyaan dengan nada datar, seperti pernyataan, lupa bahwa kenaikan nada menuju akhir frasa sama pentingnya dengan tanda ¿...? secara tertulis. Jebakan ketiga adalah memutuskan bahwa de acuerdo berubah menurut gender atau jumlah, seperti bonito atau rápido: sebenarnya de acuerdo tetap kata yang sama persis, siapa pun yang berbicara dan kepada siapa pun ia berbicara. Pengecekannya sederhana: pertama kepada siapa frasa ditujukan, lalu pertanyaan atau pernyataan menurut bunyinya, baru bentuk kata penghubung.',
  tr: 'Buradaki en yaygın hata, eres ile es\'i karıştırmak, cümlenin kime seslendiğini unutmaktır. Başka bir tuzak, bir soruyu düz bir tonla, bir ifade gibi okumaktır — cümlenin sonuna doğru perdenin yükselmesinin, yazıdaki ¿...? işaretleri kadar önemli olduğunu unutarak. Üçüncü tuzak, de acuerdo\'nun bonito ya da rápido gibi cinsiyete ya da sayıya göre değiştiğine karar vermektir: aslında de acuerdo, kim konuşursa konuşsun ve kime seslenirse seslensin tamamen aynı kelime olarak kalır. Kontrol basittir: önce kime seslendiği, sonra sesinden soru mu ifade mi olduğu, ancak sonra bağlayıcının biçimi.',
  pl: 'Najczęstszym błędem jest tu pomylenie eres z es, zapomnienie, do kogo skierowane jest zdanie. Kolejną pułapką jest odczytanie pytania równym tonem, jak twierdzenia, zapominając, że wzniesienie głosu ku końcowi zdania liczy się tak samo jak znaki ¿...? na piśmie. Trzecia pułapka to uznanie, że de acuerdo zmienia się przez rodzaj lub liczbę, jak bonito czy rápido: w rzeczywistości de acuerdo pozostaje dokładnie tym samym słowem, niezależnie od tego, kto mówi i do kogo. Sprawdzenie jest proste: najpierw do kogo skierowane, potem pytanie czy twierdzenie według brzmienia, dopiero potem forma łącznika.',
});

export const ES_EPISODE_01_SESSION_16_CHECKPOINT_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Темы больше не идут по очереди',
      uk: 'Теми більше не йдуть по черзі',
      es: 'Topics no longer come one at a time',
      'pt-BR': 'Os temas não vêm mais um de cada vez',
      vi: 'Các chủ đề không còn đến lần lượt',
      id: 'Topik tidak lagi datang satu per satu',
      tr: 'Konular artık sırayla gelmiyor',
      pl: 'Tematy nie następują już po kolei',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'До сих пор каждое правило проверялось отдельно: сначала ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' само по себе, потом вопросы, потом formula de acuerdo — каждый раз с известной темой заранее. Здесь темы перемешаны: подряд может встретиться и связка о собеседнике, и связка о себе, и вопрос, и согласие — без предупреждения, что именно потребуется дальше. ', semantic: 'explanation' }, { text: 'Eres обращается к собеседнику напрямую', semantic: 'targetCorrect' }, { text: ', а es и soy используются, когда речь о предмете или о самом себе. Спутать их здесь так же легко, как перепутать признак темпа с признаком истинности.', semantic: 'explanation' }),
      uk: R({ text: 'Досі кожне правило перевірялося окремо: спершу ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' саме по собі, потім питання, потім formula de acuerdo — щоразу з відомою темою заздалегідь. Тут теми перемішані: підряд може трапитися і зв’язка про співрозмовника, і зв’язка про себе, і питання, і згода — без попередження, що саме знадобиться далі. ', semantic: 'explanation' }, { text: 'Eres звертається до співрозмовника напряму', semantic: 'targetCorrect' }, { text: ', а es і soy використовуються, коли йдеться про предмет чи про себе самого. Сплутати їх тут так само легко, як переплутати ознаку темпу з ознакою істинності.', semantic: 'explanation' }),
      es: R({ text: 'Until now, each rule was checked separately: first ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' on its own, then questions, then the formula de acuerdo — each time with the topic known in advance. Here the topics are mixed together: in a row one might meet a linking word about the other person, then one about oneself, then a question, then agreement — with no warning about which will come next. ', semantic: 'explanation' }, { text: 'Eres addresses the other person directly', semantic: 'targetCorrect' }, { text: ', while es and soy are used when talking about a thing or about oneself. Confusing them here is just as easy as confusing a pace quality with a truth quality.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Até agora, cada regra era verificada separadamente: primeiro ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' sozinha, depois as perguntas, depois a fórmula de acuerdo — cada vez com o tema já conhecido de antemão. Aqui os temas se misturam: em seguida pode aparecer uma ligação sobre o interlocutor, depois uma sobre si mesmo, depois uma pergunta, depois um acordo — sem aviso de qual virá a seguir. ', semantic: 'explanation' }, { text: 'Eres se dirige ao interlocutor diretamente', semantic: 'targetCorrect' }, { text: ', enquanto es e soy são usadas quando se fala de uma coisa ou de si mesmo. Confundi-las aqui é tão fácil quanto confundir uma qualidade de ritmo com uma qualidade de veracidade.', semantic: 'explanation' }),
      vi: R({ text: 'Cho đến giờ, mỗi quy tắc được kiểm tra riêng biệt: đầu tiên ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' một mình, rồi các câu hỏi, rồi công thức de acuerdo — mỗi lần đều biết trước chủ đề. Ở đây các chủ đề được trộn lẫn: liên tiếp có thể gặp một từ nối về người đối thoại, rồi một từ nối về bản thân, rồi một câu hỏi, rồi một sự đồng ý — không có cảnh báo trước điều gì sẽ đến tiếp theo. ', semantic: 'explanation' }, { text: 'Eres hướng thẳng đến người đối thoại', semantic: 'targetCorrect' }, { text: ', còn es và soy được dùng khi nói về một vật hay về chính mình. Nhầm lẫn chúng ở đây cũng dễ như nhầm một đặc điểm về tốc độ với một đặc điểm về tính đúng đắn.', semantic: 'explanation' }),
      id: R({ text: 'Sampai sekarang, setiap aturan diperiksa secara terpisah: pertama ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' sendiri, lalu pertanyaan-pertanyaan, lalu rumus de acuerdo — setiap kali dengan topik yang sudah diketahui sebelumnya. Di sini topik-topik tercampur: berturut-turut bisa muncul kata penghubung tentang lawan bicara, lalu tentang diri sendiri, lalu pertanyaan, lalu persetujuan — tanpa peringatan tentang mana yang akan datang berikutnya. ', semantic: 'explanation' }, { text: 'Eres ditujukan langsung kepada lawan bicara', semantic: 'targetCorrect' }, { text: ', sedangkan es dan soy dipakai ketika membicarakan suatu benda atau diri sendiri. Tertukar di sini sama mudahnya dengan tertukar sifat kecepatan dengan sifat kebenaran.', semantic: 'explanation' }),
      tr: R({ text: 'Şimdiye kadar her kural ayrı ayrı kontrol edildi: önce ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' tek başına, sonra sorular, sonra de acuerdo formülü — her seferinde konu önceden bilinerek. Burada konular birbirine karışır: art arda karşısındaki kişi hakkında bir bağlayıcı, sonra kendisi hakkında bir bağlayıcı, sonra bir soru, sonra bir onay gelebilir — sırada ne olduğuna dair önceden bir uyarı olmadan. ', semantic: 'explanation' }, { text: 'Eres doğrudan karşısındaki kişiye seslenir', semantic: 'targetCorrect' }, { text: ', es ve soy ise bir şeyden ya da kendisinden bahsederken kullanılır. Burada bunları karıştırmak, bir tempo niteliğini bir doğruluk niteliğiyle karıştırmak kadar kolaydır.', semantic: 'explanation' }),
      pl: R({ text: 'Do tej pory każda reguła była sprawdzana osobno: najpierw ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' samo w sobie, potem pytania, potem formuła de acuerdo — za każdym razem z tematem znanym z góry. Tutaj tematy są pomieszane: pod rząd może pojawić się łącznik o rozmówcy, potem o sobie, potem pytanie, potem zgoda — bez ostrzeżenia, co będzie dalej. ', semantic: 'explanation' }, { text: 'Eres zwraca się bezpośrednio do rozmówcy', semantic: 'targetCorrect' }, { text: ', a es i soy używa się, gdy mowa o rzeczy lub o sobie samym. Pomylenie ich tutaj jest tak samo łatwe, jak pomylenie cechy tempa z cechą prawdziwości.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'К кому обращается eres?',
        uk: 'До кого звертається eres?',
        es: 'Who does eres address?',
        'pt-BR': 'A quem eres se dirige?',
        vi: 'Eres hướng đến ai?',
        id: 'Kepada siapa eres ditujukan?',
        tr: 'Eres kime seslenir?',
        pl: 'Do kogo zwraca się eres?',
      }),
      choices: [
        L({ ru: 'К собеседнику напрямую', uk: 'До співрозмовника напряму', es: 'The other person directly', 'pt-BR': 'Ao interlocutor diretamente', vi: 'Trực tiếp đến người đối thoại', id: 'Langsung kepada lawan bicara', tr: 'Doğrudan karşısındaki kişiye', pl: 'Bezpośrednio do rozmówcy' }),
        L({ ru: 'К любому предмету', uk: 'До будь-якого предмета', es: 'To any thing', 'pt-BR': 'A qualquer coisa', vi: 'Đến bất kỳ vật gì', id: 'Kepada benda apa pun', tr: 'Herhangi bir şeye', pl: 'Do dowolnej rzeczy' }),
        L({ ru: 'К погоде', uk: 'До погоди', es: 'To the weather', 'pt-BR': 'Ao clima', vi: 'Đến thời tiết', id: 'Kepada cuaca', tr: 'Havaya', pl: 'Do pogody' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Eres обращается к собеседнику напрямую — не к любому предмету и не к погоде, для этого используются es или soy.',
        uk: 'Eres звертається до співрозмовника напряму — не до будь-якого предмета і не до погоди, для цього використовуються es чи soy.',
        es: 'Eres addresses the other person directly — not any thing and not the weather, for those es or soy are used.',
        'pt-BR': 'Eres se dirige ao interlocutor diretamente — não a qualquer coisa nem ao clima, para isso se usa es ou soy.',
        vi: 'Eres hướng thẳng đến người đối thoại — không phải bất kỳ vật gì hay thời tiết, cho những thứ đó dùng es hoặc soy.',
        id: 'Eres ditujukan langsung kepada lawan bicara — bukan benda apa pun atau cuaca, untuk itu dipakai es atau soy.',
        tr: 'Eres doğrudan karşısındaki kişiye seslenir — herhangi bir şeye ya da havaya değil, onlar için es ya da soy kullanılır.',
        pl: 'Eres zwraca się bezpośrednio do rozmówcy — nie do dowolnej rzeczy ani do pogody, do tego służy es lub soy.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Три вопроса перед выбором связки',
      uk: 'Три питання перед вибором зв’язки',
      es: 'Three questions before choosing the linking word',
      'pt-BR': 'Três perguntas antes de escolher a ligação',
      vi: 'Ba câu hỏi trước khi chọn từ nối',
      id: 'Tiga pertanyaan sebelum memilih kata penghubung',
      tr: 'Bağlayıcıyı seçmeden önce üç soru',
      pl: 'Trzy pytania przed wyborem łącznika',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проверки простая: сначала нужно понять, о ком идёт речь — о собеседнике, о себе или о предмете, — и только потом подобрать нужную связку. ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' и ', semantic: 'explanation' }, { text: '¿Es bonito?', semantic: 'targetCorrect' }, { text: ' выглядят похоже по структуре — вопрос плюс признак на -o — но требуют разных связок: eres обращается к собеседнику, es говорит о ком-то или о чём-то другом. No eres de acuerdo и No es de acuerdo используют одну и ту же формулу согласия, потому что ', semantic: 'explanation' }, { text: 'de acuerdo не меняется ни по роду, ни по числу', semantic: 'targetCorrect' }, { text: '. Ответ прост: собственный смысл каждого слова определяет выбор, а не место в предложении.', semantic: 'explanation' }),
      uk: R({ text: 'Формула перевірки проста: спершу потрібно зрозуміти, про кого йдеться — про співрозмовника, про себе чи про предмет, — і лише потім підібрати потрібну зв’язку. ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' і ', semantic: 'explanation' }, { text: '¿Es bonito?', semantic: 'targetCorrect' }, { text: ' виглядають подібно за структурою — питання плюс ознака на -o — але вимагають різних зв’язок: eres звертається до співрозмовника, es говорить про когось чи щось інше. No eres de acuerdo і No es de acuerdo використовують ту саму формулу згоди, бо ', semantic: 'explanation' }, { text: 'de acuerdo не змінюється ні за родом, ні за числом', semantic: 'targetCorrect' }, { text: '. Відповідь проста: власний зміст кожного слова визначає вибір, а не місце в реченні.', semantic: 'explanation' }),
      es: R({ text: 'The checking formula is simple: first you need to understand who is being talked about — the other person, oneself, or a thing — and only then pick the right linking word. ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' and ', semantic: 'explanation' }, { text: '¿Es bonito?', semantic: 'targetCorrect' }, { text: ' look similar in structure — a question plus a quality ending in -o — but need different linking words: eres addresses the other person, es talks about someone or something else. No eres de acuerdo and No es de acuerdo use the same agreement formula, because ', semantic: 'explanation' }, { text: 'de acuerdo does not change for gender or number', semantic: 'targetCorrect' }, { text: '. Each word is recognized by its own meaning, not by its place in the sentence.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de verificação é simples: primeiro é preciso entender de quem se fala — do interlocutor, de si mesmo ou de uma coisa — e só depois escolher a ligação certa. ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' e ', semantic: 'explanation' }, { text: '¿Es bonito?', semantic: 'targetCorrect' }, { text: ' parecem semelhantes na estrutura — uma pergunta mais uma qualidade terminada em -o — mas exigem ligações diferentes: eres se dirige ao interlocutor, es fala de outra pessoa ou coisa. No eres de acuerdo e No es de acuerdo usam a mesma fórmula de concordância, porque ', semantic: 'explanation' }, { text: 'de acuerdo não muda nem de gênero nem de número', semantic: 'targetCorrect' }, { text: '. Cada palavra é reconhecida pelo próprio significado, não pelo lugar na frase.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức kiểm tra rất đơn giản: trước tiên cần hiểu đang nói về ai — người đối thoại, bản thân, hay một vật — và chỉ sau đó mới chọn đúng từ nối. ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' và ', semantic: 'explanation' }, { text: '¿Es bonito?', semantic: 'targetCorrect' }, { text: ' trông giống nhau về cấu trúc — một câu hỏi cộng một đặc điểm kết thúc bằng -o — nhưng cần những từ nối khác nhau: eres hướng đến người đối thoại, es nói về ai đó hoặc điều gì khác. No eres de acuerdo và No es de acuerdo dùng cùng một công thức đồng ý, vì ', semantic: 'explanation' }, { text: 'de acuerdo không đổi theo giống hay số', semantic: 'targetCorrect' }, { text: '. Mỗi từ được nhận ra bằng chính nghĩa của nó, không phải bằng vị trí trong câu.', semantic: 'explanation' }),
      id: R({ text: 'Rumus pemeriksaannya sederhana: pertama perlu memahami tentang siapa yang dibicarakan — lawan bicara, diri sendiri, atau benda — dan baru setelah itu memilih kata penghubung yang tepat. ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: '¿Es bonito?', semantic: 'targetCorrect' }, { text: ' terlihat mirip strukturnya — pertanyaan ditambah sifat berakhiran -o — tetapi memerlukan kata penghubung berbeda: eres ditujukan kepada lawan bicara, es berbicara tentang orang atau hal lain. No eres de acuerdo dan No es de acuerdo menggunakan rumus persetujuan yang sama, karena ', semantic: 'explanation' }, { text: 'de acuerdo tidak berubah menurut gender maupun jumlah', semantic: 'targetCorrect' }, { text: '. Setiap kata dikenali dari maknanya sendiri, bukan dari posisinya dalam kalimat.', semantic: 'explanation' }),
      tr: R({ text: 'Kontrol formülü basittir: önce kimden bahsedildiğini anlamak gerekir — karşısındaki kişiden mi, kendisinden mi, yoksa bir şeyden mi — ancak sonrasında doğru bağlayıcı seçilir. ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' ve ', semantic: 'explanation' }, { text: '¿Es bonito?', semantic: 'targetCorrect' }, { text: ' yapı olarak benzer görünür — bir soru artı -o ile biten bir nitelik — ama farklı bağlayıcılar gerektirir: eres karşısındaki kişiye seslenir, es başka birinden ya da bir şeyden bahseder. No eres de acuerdo ve No es de acuerdo aynı onay formülünü kullanır, çünkü ', semantic: 'explanation' }, { text: 'de acuerdo ne cinsiyete ne de sayıya göre değişir', semantic: 'targetCorrect' }, { text: '. Her kelime, cümledeki yerine göre değil, kendi anlamına göre tanınır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła sprawdzenia jest prosta: najpierw trzeba zrozumieć, o kim mowa — o rozmówcy, o sobie czy o rzeczy — a dopiero potem dobrać właściwy łącznik. ', semantic: 'explanation' }, { text: '¿Eres bonito?', semantic: 'targetCorrect' }, { text: ' i ', semantic: 'explanation' }, { text: '¿Es bonito?', semantic: 'targetCorrect' }, { text: ' wyglądają podobnie pod względem struktury — pytanie plus cecha zakończona na -o — ale wymagają różnych łączników: eres zwraca się do rozmówcy, es mówi o kimś lub czymś innym. No eres de acuerdo i No es de acuerdo używają tej samej formuły zgody, ponieważ ', semantic: 'explanation' }, { text: 'de acuerdo nie zmienia się ani przez rodzaj, ani przez liczbę', semantic: 'targetCorrect' }, { text: '. Każde słowo rozpoznaje się po jego własnym znaczeniu, a nie po miejscu w zdaniu.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как de acuerdo меняется по роду и числу?',
        uk: 'Як de acuerdo змінюється за родом і числом?',
        es: 'How does de acuerdo change for gender and number?',
        'pt-BR': 'Como de acuerdo muda de gênero e número?',
        vi: 'De acuerdo thay đổi theo giống và số như thế nào?',
        id: 'Bagaimana de acuerdo berubah menurut gender dan jumlah?',
        tr: 'De acuerdo cinsiyete ve sayıya göre nasıl değişir?',
        pl: 'Jak de acuerdo zmienia się przez rodzaj i liczbę?',
      }),
      choices: [
        L({ ru: 'Не меняется ни по роду, ни по числу', uk: 'Не змінюється ні за родом, ні за числом', es: 'It does not change for gender or number', 'pt-BR': 'Não muda nem de gênero nem de número', vi: 'Không đổi theo giống hay số', id: 'Tidak berubah menurut gender maupun jumlah', tr: 'Ne cinsiyete ne de sayıya göre değişir', pl: 'Nie zmienia się ani przez rodzaj, ani przez liczbę' }),
        L({ ru: 'Меняется, как bonito', uk: 'Змінюється, як bonito', es: 'It changes like bonito', 'pt-BR': 'Muda como bonito', vi: 'Đổi giống như bonito', id: 'Berubah seperti bonito', tr: 'Bonito gibi değişir', pl: 'Zmienia się jak bonito' }),
        L({ ru: 'Меняется только во множественном числе', uk: 'Змінюється лише в множині', es: 'It only changes in the plural', 'pt-BR': 'Só muda no plural', vi: 'Chỉ đổi ở số nhiều', id: 'Hanya berubah dalam bentuk jamak', tr: 'Yalnızca çoğulda değişir', pl: 'Zmienia się tylko w liczbie mnogiej' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'De acuerdo не меняется ни по роду, ни по числу — в отличие от bonito, и это не зависит от того, единственное число или множественное.',
        uk: 'De acuerdo не змінюється ні за родом, ні за числом — на відміну від bonito, і це не залежить від того, однина це чи множина.',
        es: 'De acuerdo does not change for gender or number — unlike bonito, and this does not depend on singular or plural.',
        'pt-BR': 'De acuerdo não muda nem de gênero nem de número — ao contrário de bonito, e isso não depende de singular ou plural.',
        vi: 'De acuerdo không đổi theo giống hay số — khác với bonito, và điều này không phụ thuộc vào số ít hay số nhiều.',
        id: 'De acuerdo tidak berubah menurut gender maupun jumlah — berbeda dengan bonito, dan ini tidak bergantung pada tunggal atau jamak.',
        tr: 'De acuerdo ne cinsiyete ne de sayıya göre değişir — bonito\'nun aksine, ve bu tekil ya da çoğul olmasına bağlı değildir.',
        pl: 'De acuerdo nie zmienia się ani przez rodzaj, ani przez liczbę — w przeciwieństwie do bonito, i nie zależy to od liczby pojedynczej czy mnogiej.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Похожая структура — не значит одно и то же',
      uk: 'Схожа структура — не означає те саме',
      es: 'Similar structure does not mean the same thing',
      'pt-BR': 'Estrutura parecida não significa a mesma coisa',
      vi: 'Cấu trúc giống nhau không có nghĩa là giống nhau',
      id: 'Struktur mirip tidak berarti hal yang sama',
      tr: 'Benzer yapı aynı şey demek değildir',
      pl: 'Podobna struktura nie znaczy to samo',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка здесь — спутать ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' с ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', забыв, к кому обращена фраза. Ещё одна ловушка — прочитать вопрос ровным тоном, как утверждение, забыв, что подъём голоса к концу фразы так же важен, как и знаки ¿...? на письме. Третья ловушка — решить, что ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' меняется по роду или числу, как bonito или rápido: на самом деле de acuerdo остаётся одним и тем же словом независимо от того, кто говорит и о ком. Проверка простая: сначала к кому обращена фраза, затем вопрос это или утверждение по звуку, и только потом форма связки.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка тут — сплутати ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' із ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', забувши, до кого звернена фраза. Ще одна пастка — прочитати питання рівним тоном, як твердження, забувши, що підйом голосу до кінця фрази так само важливий, як і знаки ¿...? на письмі. Третя пастка — вирішити, що ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' змінюється за родом чи числом, як bonito чи rápido: насправді de acuerdo лишається тим самим словом незалежно від того, хто говорить і про кого. Перевірка проста: спершу до кого звернена фраза, потім питання це чи твердження за звуком, і лише потім форма зв’язки.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake here is confusing ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' with ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', forgetting who the phrase is addressed to. Another trap is reading a question with a level tone, as a statement, forgetting that the rise in pitch toward the end of the phrase matters just as much as the marks ¿...? in writing. A third trap is deciding that ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' changes for gender or number, like bonito or rápido: in fact de acuerdo stays the exact same word no matter who is speaking or who is being addressed. The check is simple: first who the phrase addresses, then question or statement by sound, only then the form of the linking word.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum aqui é confundir ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' com ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', esquecendo a quem a frase se dirige. Outra armadilha é ler uma pergunta com tom nivelado, como uma afirmação, esquecendo que a subida de tom em direção ao fim da frase importa tanto quanto os sinais ¿...? por escrito. Uma terceira armadilha é decidir que ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' muda de gênero ou número, como bonito ou rápido: na verdade de acuerdo permanece exatamente a mesma palavra, não importa quem fala nem com quem se fala. A checagem é simples: primeiro a quem a frase se dirige, depois pergunta ou afirmação pelo som, só depois a forma da ligação.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất ở đây là nhầm ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' với ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', quên mất câu đang hướng đến ai. Một cái bẫy khác là đọc một câu hỏi bằng giọng đều đều, như một câu khẳng định, quên rằng sự lên cao về cuối câu quan trọng không kém dấu ¿...? khi viết. Cái bẫy thứ ba là cho rằng ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' đổi theo giống hay số, giống như bonito hay rápido: thực ra de acuerdo vẫn là đúng một từ đó, bất kể ai đang nói hay đang nói với ai. Cách kiểm tra đơn giản: trước tiên câu hướng đến ai, sau đó câu hỏi hay khẳng định qua âm thanh, chỉ sau đó mới đến dạng từ nối.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum di sini adalah tertukar antara ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', lupa kepada siapa frasa itu ditujukan. Jebakan lain adalah membaca pertanyaan dengan nada datar, seperti pernyataan, lupa bahwa kenaikan nada menuju akhir frasa sama pentingnya dengan tanda ¿...? secara tertulis. Jebakan ketiga adalah memutuskan bahwa ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' berubah menurut gender atau jumlah, seperti bonito atau rápido: sebenarnya de acuerdo tetap kata yang sama persis, siapa pun yang berbicara dan kepada siapa pun ia berbicara. Pengecekannya sederhana: pertama kepada siapa frasa ditujukan, lalu pertanyaan atau pernyataan menurut bunyinya, baru bentuk kata penghubung.', semantic: 'explanation' }),
      tr: R({ text: 'Buradaki en yaygın hata, ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' ile ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: '\'i karıştırmak, cümlenin kime seslendiğini unutmaktır. Başka bir tuzak, bir soruyu düz bir tonla, bir ifade gibi okumaktır — cümlenin sonuna doğru perdenin yükselmesinin, yazıdaki ¿...? işaretleri kadar önemli olduğunu unutarak. Üçüncü tuzak, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: '\'nun bonito ya da rápido gibi cinsiyete ya da sayıya göre değiştiğine karar vermektir: aslında de acuerdo, kim konuşursa konuşsun ve kime seslenirse seslensin tamamen aynı kelime olarak kalır. Kontrol basittir: önce kime seslendiği, sonra sesinden soru mu ifade mi olduğu, ancak sonra bağlayıcının biçimi.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszym błędem jest tu pomylenie ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' z ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', zapomnienie, do kogo skierowane jest zdanie. Kolejną pułapką jest odczytanie pytania równym tonem, jak twierdzenia, zapominając, że wzniesienie głosu ku końcowi zdania liczy się tak samo jak znaki ¿...? na piśmie. Trzecia pułapka to uznanie, że ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' zmienia się przez rodzaj lub liczbę, jak bonito czy rápido: w rzeczywistości de acuerdo pozostaje dokładnie tym samym słowem, niezależnie od tego, kto mówi i do kogo. Sprawdzenie jest proste: najpierw do kogo skierowane, potem pytanie czy twierdzenie według brzmienia, dopiero potem forma łącznika.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что важно проверить в звуке фразы, прежде чем решить, вопрос это или утверждение?',
        uk: 'Що важливо перевірити у звуці фрази, перш ніж вирішити, питання це чи твердження?',
        es: 'What is important to check in the sound of the phrase before deciding whether it is a question or a statement?',
        'pt-BR': 'O que é importante verificar no som da frase antes de decidir se é pergunta ou afirmação?',
        vi: 'Điều gì quan trọng cần kiểm tra trong âm thanh của câu trước khi quyết định đó là câu hỏi hay câu khẳng định?',
        id: 'Apa yang penting diperiksa dalam bunyi frasa sebelum memutuskan apakah itu pertanyaan atau pernyataan?',
        tr: 'Bir cümlenin soru mu yoksa ifade mi olduğuna karar vermeden önce sesinde neyi kontrol etmek önemlidir?',
        pl: 'Co ważne jest sprawdzić w brzmieniu zdania, zanim zdecyduje się, czy to pytanie czy twierdzenie?',
      }),
      choices: [
        L({ ru: 'Подъём голоса к концу фразы', uk: 'Підйом голосу до кінця фрази', es: 'The rise in pitch toward the end of the phrase', 'pt-BR': 'A subida de tom em direção ao fim da frase', vi: 'Sự lên cao về cuối câu', id: 'Kenaikan nada menuju akhir frasa', tr: 'Cümlenin sonuna doğru perdenin yükselmesi', pl: 'Wzniesienie głosu ku końcowi zdania' }),
        L({ ru: 'Длину фразы', uk: 'Довжину фрази', es: 'The length of the phrase', 'pt-BR': 'O comprimento da frase', vi: 'Độ dài của câu', id: 'Panjang frasa', tr: 'Cümlenin uzunluğu', pl: 'Długość zdania' }),
        L({ ru: 'Громкость голоса на первом слове', uk: 'Гучність голосу на першому слові', es: 'The loudness on the first word', 'pt-BR': 'O volume na primeira palavra', vi: 'Độ lớn giọng ở từ đầu tiên', id: 'Kekerasan suara pada kata pertama', tr: 'İlk kelimedeki ses yüksekliği', pl: 'Głośność na pierwszym słowie' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Важен подъём голоса к концу фразы — он важен так же, как и знаки ¿...? на письме, а длина фразы и громкость на первом слове тут ни при чём.',
        uk: 'Важливий підйом голосу до кінця фрази — він важливий так само, як і знаки ¿...? на письмі, а довжина фрази й гучність на першому слові тут ні до чого.',
        es: 'What matters is the rise in pitch toward the end of the phrase — it matters just as much as the marks ¿...? in writing, and the length of the phrase and loudness on the first word have nothing to do with it.',
        'pt-BR': 'O que importa é a subida de tom em direção ao fim da frase — ela importa tanto quanto os sinais ¿...? por escrito, e o comprimento da frase e o volume na primeira palavra não têm nada a ver com isso.',
        vi: 'Điều quan trọng là sự lên cao về cuối câu — nó quan trọng không kém dấu ¿...? khi viết, còn độ dài câu và độ lớn giọng ở từ đầu tiên không liên quan gì.',
        id: 'Yang penting adalah kenaikan nada menuju akhir frasa — itu sama pentingnya dengan tanda ¿...? secara tertulis, dan panjang frasa serta kekerasan suara pada kata pertama tidak ada hubungannya.',
        tr: 'Önemli olan cümlenin sonuna doğru perdenin yükselmesidir — bu, yazıdaki ¿...? işaretleri kadar önemlidir, cümlenin uzunluğu ve ilk kelimedeki ses yüksekliğinin bununla ilgisi yoktur.',
        pl: 'Ważne jest wzniesienie głosu ku końcowi zdania — liczy się tak samo jak znaki ¿...? na piśmie, a długość zdania i głośność na pierwszym słowie nie mają z tym nic wspólnego.',
      }),
    },
  },
];
