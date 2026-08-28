import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл переписан (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// §7 + LEARNING_CONTENT_STYLE_BIBLE.ru.md правило 2): исходный черновик от
// 2026-08-25 держал тела intro за потолком intro_body_overloaded (320 знаков
// / 2-4 предложения, learning_content_quality_gate_v1.ts). Смысл сохранён
// (concept/formula/trap: темы главы 2 больше не проверяются по одной, нужно
// сначала понять, к кому обращена фраза, вопрос это или утверждение по
// звуку, и только потом форму связки), текст сжат. Интро НЕ упоминает
// "сессию/урок/главу/курс" (тот же чёрный список, что и в сессии 8). Карта
// сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 16, "Я и ты
// целиком" / kind: 'checkpoint', builtOn: [9..15], recalls: [1, 9, 10, 13, 14].
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
  ru: 'До сих пор темы шли по одной — сначала eres, потом вопросы, потом de acuerdo. Здесь они перемешаны без предупреждения. Eres обращается к собеседнику напрямую, а es и soy — о предмете или о себе самом.',
  uk: 'Досі теми йшли по одній — спершу eres, потім питання, потім de acuerdo. Тут вони перемішані без попередження. Eres звертається до співрозмовника напряму, а es і soy — про предмет чи про себе самого.',
  es: 'Until now the topics came one at a time — first eres, then questions, then de acuerdo. Here they are mixed without warning. Eres addresses the other person directly, while es and soy are about a thing or about oneself.',
  'pt-BR': 'Até agora os temas vinham um de cada vez — primeiro eres, depois perguntas, depois de acuerdo. Aqui eles se misturam sem aviso. Eres se dirige ao interlocutor diretamente, enquanto es e soy são sobre uma coisa ou sobre si mesmo.',
  vi: 'Cho đến giờ các chủ đề đến từng cái một — đầu tiên eres, rồi câu hỏi, rồi de acuerdo. Ở đây chúng bị trộn lẫn không báo trước. Eres hướng thẳng đến người đối thoại, còn es và soy nói về một vật hay về chính mình.',
  id: 'Sampai sekarang topik datang satu per satu — pertama eres, lalu pertanyaan, lalu de acuerdo. Di sini semuanya tercampur tanpa peringatan. Eres ditujukan langsung kepada lawan bicara, sedangkan es dan soy tentang suatu benda atau diri sendiri.',
  tr: 'Şimdiye kadar konular birer birer geldi — önce eres, sonra sorular, sonra de acuerdo. Burada önceden uyarı olmadan karışırlar. Eres doğrudan karşısındaki kişiye seslenir, es ve soy ise bir şey ya da kendisi hakkındadır.',
  pl: 'Do tej pory tematy następowały po jednym — najpierw eres, potem pytania, potem de acuerdo. Tutaj są pomieszane bez ostrzeżenia. Eres zwraca się bezpośrednio do rozmówcy, a es i soy dotyczą rzeczy lub samego siebie.',
});

const FORMULA_BODY = L({
  ru: 'Формула проверки простая: сначала понять, о ком речь — о собеседнике, о себе или о предмете, — и только потом выбрать связку. No eres de acuerdo и No es de acuerdo используют одну формулу согласия, потому что de acuerdo не меняется ни по роду, ни по числу.',
  uk: 'Формула перевірки проста: спершу зрозуміти, про кого йдеться — про співрозмовника, про себе чи про предмет, — і лише потім вибрати зв’язку. No eres de acuerdo і No es de acuerdo використовують одну формулу згоди, бо de acuerdo не змінюється ні за родом, ні за числом.',
  es: 'The checking formula is simple: first understand who is being talked about — the other person, oneself, or a thing — and only then choose the linking word. No eres de acuerdo and No es de acuerdo use the same agreement formula, because de acuerdo does not change for gender or number.',
  'pt-BR': 'A fórmula de verificação é simples: primeiro entender de quem se fala — do interlocutor, de si mesmo ou de uma coisa — e só depois escolher a ligação. No eres de acuerdo e No es de acuerdo usam a mesma fórmula de concordância, porque de acuerdo não muda nem de gênero nem de número.',
  vi: 'Công thức kiểm tra rất đơn giản: trước tiên hiểu đang nói về ai — người đối thoại, bản thân, hay một vật — rồi mới chọn từ nối. No eres de acuerdo và No es de acuerdo dùng cùng một công thức đồng ý, vì de acuerdo không đổi theo giống hay số.',
  id: 'Rumus pemeriksaannya sederhana: pertama pahami tentang siapa yang dibicarakan — lawan bicara, diri sendiri, atau benda — baru pilih kata penghubung. No eres de acuerdo dan No es de acuerdo menggunakan rumus persetujuan yang sama, karena de acuerdo tidak berubah menurut gender maupun jumlah.',
  tr: 'Kontrol formülü basittir: önce kimden bahsedildiğini anlamak — karşısındaki kişi, kendisi, ya da bir şey — ancak sonra bağlayıcı seçilir. No eres de acuerdo ve No es de acuerdo aynı onay formülünü kullanır, çünkü de acuerdo ne cinsiyete ne de sayıya göre değişir.',
  pl: 'Formuła sprawdzenia jest prosta: najpierw zrozumieć, o kim mowa — o rozmówcy, o sobie czy o rzeczy — a dopiero potem dobrać łącznik. No eres de acuerdo i No es de acuerdo używają tej samej formuły zgody, ponieważ de acuerdo nie zmienia się ani przez rodzaj, ani przez liczbę.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — спутать eres с es, забыв, к кому обращена фраза. Вторая ловушка — прочитать вопрос ровным тоном, забыв про подъём голоса к концу. Третья — решить, что de acuerdo меняется по роду, как bonito.',
  uk: 'Найчастіша помилка — сплутати eres із es, забувши, до кого звернена фраза. Друга пастка — прочитати питання рівним тоном, забувши про підйом голосу до кінця. Третя — вирішити, що de acuerdo змінюється за родом, як bonito.',
  es: 'The most common mistake is confusing eres with es, forgetting who the phrase is addressed to. The second trap is reading a question with a level tone, forgetting the rise in pitch toward the end. The third is deciding that de acuerdo changes for gender, like bonito.',
  'pt-BR': 'O erro mais comum é confundir eres com es, esquecendo a quem a frase se dirige. A segunda armadilha é ler uma pergunta com tom nivelado, esquecendo a subida de tom até o fim. A terceira é decidir que de acuerdo muda de gênero, como bonito.',
  vi: 'Lỗi phổ biến nhất là nhầm eres với es, quên mất câu đang hướng đến ai. Cái bẫy thứ hai là đọc câu hỏi bằng giọng đều đều, quên sự lên cao về cuối. Cái thứ ba là cho rằng de acuerdo đổi theo giống, giống như bonito.',
  id: 'Kesalahan paling umum adalah tertukar antara eres dan es, lupa kepada siapa frasa ditujukan. Jebakan kedua adalah membaca pertanyaan dengan nada datar, lupa kenaikan nada menuju akhir. Ketiga adalah memutuskan de acuerdo berubah menurut gender, seperti bonito.',
  tr: 'En yaygın hata, eres ile es\'i karıştırmak, cümlenin kime seslendiğini unutmaktır. İkinci tuzak, bir soruyu düz bir tonla okumak, cümlenin sonuna doğru perdenin yükselmesini unutmaktır. Üçüncüsü, de acuerdo\'nun bonito gibi cinsiyete göre değiştiğine karar vermektir.',
  pl: 'Najczęstszym błędem jest pomylenie eres z es, zapomnienie, do kogo skierowane jest zdanie. Druga pułapka to odczytanie pytania równym tonem, zapominając o wzniesieniu głosu ku końcowi. Trzecia to uznanie, że de acuerdo zmienia się przez rodzaj, jak bonito.',
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
      ru: R({ text: 'До сих пор темы шли по одной — сначала eres, потом вопросы, потом de acuerdo. Здесь они перемешаны без предупреждения. ', semantic: 'explanation' }, { text: 'Eres обращается к собеседнику напрямую', semantic: 'targetCorrect' }, { text: ', а es и soy — о предмете или о себе самом.', semantic: 'explanation' }),
      uk: R({ text: 'Досі теми йшли по одній — спершу eres, потім питання, потім de acuerdo. Тут вони перемішані без попередження. ', semantic: 'explanation' }, { text: 'Eres звертається до співрозмовника напряму', semantic: 'targetCorrect' }, { text: ', а es і soy — про предмет чи про себе самого.', semantic: 'explanation' }),
      es: R({ text: 'Until now the topics came one at a time — first eres, then questions, then de acuerdo. Here they are mixed without warning. ', semantic: 'explanation' }, { text: 'Eres addresses the other person directly', semantic: 'targetCorrect' }, { text: ', while es and soy are about a thing or about oneself.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Até agora os temas vinham um de cada vez — primeiro eres, depois perguntas, depois de acuerdo. Aqui eles se misturam sem aviso. ', semantic: 'explanation' }, { text: 'Eres se dirige ao interlocutor diretamente', semantic: 'targetCorrect' }, { text: ', enquanto es e soy são sobre uma coisa ou sobre si mesmo.', semantic: 'explanation' }),
      vi: R({ text: 'Cho đến giờ các chủ đề đến từng cái một — đầu tiên eres, rồi câu hỏi, rồi de acuerdo. Ở đây chúng bị trộn lẫn không báo trước. ', semantic: 'explanation' }, { text: 'Eres hướng thẳng đến người đối thoại', semantic: 'targetCorrect' }, { text: ', còn es và soy nói về một vật hay về chính mình.', semantic: 'explanation' }),
      id: R({ text: 'Sampai sekarang topik datang satu per satu — pertama eres, lalu pertanyaan, lalu de acuerdo. Di sini semuanya tercampur tanpa peringatan. ', semantic: 'explanation' }, { text: 'Eres ditujukan langsung kepada lawan bicara', semantic: 'targetCorrect' }, { text: ', sedangkan es dan soy tentang suatu benda atau diri sendiri.', semantic: 'explanation' }),
      tr: R({ text: 'Şimdiye kadar konular birer birer geldi — önce eres, sonra sorular, sonra de acuerdo. Burada önceden uyarı olmadan karışırlar. ', semantic: 'explanation' }, { text: 'Eres doğrudan karşısındaki kişiye seslenir', semantic: 'targetCorrect' }, { text: ', es ve soy ise bir şey ya da kendisi hakkındadır.', semantic: 'explanation' }),
      pl: R({ text: 'Do tej pory tematy następowały po jednym — najpierw eres, potem pytania, potem de acuerdo. Tutaj są pomieszane bez ostrzeżenia. ', semantic: 'explanation' }, { text: 'Eres zwraca się bezpośrednio do rozmówcy', semantic: 'targetCorrect' }, { text: ', a es i soy dotyczą rzeczy lub samego siebie.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула проверки простая: сначала понять, о ком речь — о собеседнике, о себе или о предмете, — и только потом выбрать связку. No eres de acuerdo и No es de acuerdo используют одну формулу согласия, потому что ', semantic: 'explanation' }, { text: 'de acuerdo не меняется ни по роду, ни по числу', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Формула перевірки проста: спершу зрозуміти, про кого йдеться — про співрозмовника, про себе чи про предмет, — і лише потім вибрати зв’язку. No eres de acuerdo і No es de acuerdo використовують одну формулу згоди, бо ', semantic: 'explanation' }, { text: 'de acuerdo не змінюється ні за родом, ні за числом', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'The checking formula is simple: first understand who is being talked about — the other person, oneself, or a thing — and only then choose the linking word. No eres de acuerdo and No es de acuerdo use the same agreement formula, because ', semantic: 'explanation' }, { text: 'de acuerdo does not change for gender or number', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de verificação é simples: primeiro entender de quem se fala — do interlocutor, de si mesmo ou de uma coisa — e só depois escolher a ligação. No eres de acuerdo e No es de acuerdo usam a mesma fórmula de concordância, porque ', semantic: 'explanation' }, { text: 'de acuerdo não muda nem de gênero nem de número', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức kiểm tra rất đơn giản: trước tiên hiểu đang nói về ai — người đối thoại, bản thân, hay một vật — rồi mới chọn từ nối. No eres de acuerdo và No es de acuerdo dùng cùng một công thức đồng ý, vì ', semantic: 'explanation' }, { text: 'de acuerdo không đổi theo giống hay số', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Rumus pemeriksaannya sederhana: pertama pahami tentang siapa yang dibicarakan — lawan bicara, diri sendiri, atau benda — baru pilih kata penghubung. No eres de acuerdo dan No es de acuerdo menggunakan rumus persetujuan yang sama, karena ', semantic: 'explanation' }, { text: 'de acuerdo tidak berubah menurut gender maupun jumlah', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Kontrol formülü basittir: önce kimden bahsedildiğini anlamak — karşısındaki kişi, kendisi, ya da bir şey — ancak sonra bağlayıcı seçilir. No eres de acuerdo ve No es de acuerdo aynı onay formülünü kullanır, çünkü ', semantic: 'explanation' }, { text: 'de acuerdo ne cinsiyete ne de sayıya göre değişir', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła sprawdzenia jest prosta: najpierw zrozumieć, o kim mowa — o rozmówcy, o sobie czy o rzeczy — a dopiero potem dobrać łącznik. No eres de acuerdo i No es de acuerdo używają tej samej formuły zgody, ponieważ ', semantic: 'explanation' }, { text: 'de acuerdo nie zmienia się ani przez rodzaj, ani przez liczbę', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
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
      ru: R({ text: 'Самая частая ошибка — спутать ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' с ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', забыв, к кому обращена фраза. Вторая ловушка — прочитать вопрос ровным тоном, забыв про ', semantic: 'explanation' }, { text: 'подъём голоса к концу', semantic: 'targetCorrect' }, { text: '. Третья — решить, что de acuerdo меняется по роду, как bonito.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — сплутати ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' із ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', забувши, до кого звернена фраза. Друга пастка — прочитати питання рівним тоном, забувши про ', semantic: 'explanation' }, { text: 'підйом голосу до кінця', semantic: 'targetCorrect' }, { text: '. Третя — вирішити, що de acuerdo змінюється за родом, як bonito.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is confusing ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' with ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', forgetting who the phrase is addressed to. The second trap is reading a question with a level tone, forgetting ', semantic: 'explanation' }, { text: 'the rise in pitch toward the end', semantic: 'targetCorrect' }, { text: '. The third is deciding that de acuerdo changes for gender, like bonito.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é confundir ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' com ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', esquecendo a quem a frase se dirige. A segunda armadilha é ler uma pergunta com tom nivelado, esquecendo ', semantic: 'explanation' }, { text: 'a subida de tom até o fim', semantic: 'targetCorrect' }, { text: '. A terceira é decidir que de acuerdo muda de gênero, como bonito.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là nhầm ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' với ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', quên mất câu đang hướng đến ai. Cái bẫy thứ hai là đọc câu hỏi bằng giọng đều đều, quên ', semantic: 'explanation' }, { text: 'sự lên cao về cuối', semantic: 'targetCorrect' }, { text: '. Cái thứ ba là cho rằng de acuerdo đổi theo giống, giống như bonito.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah tertukar antara ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' dan ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', lupa kepada siapa frasa ditujukan. Jebakan kedua adalah membaca pertanyaan dengan nada datar, lupa ', semantic: 'explanation' }, { text: 'kenaikan nada menuju akhir', semantic: 'targetCorrect' }, { text: '. Ketiga adalah memutuskan de acuerdo berubah menurut gender, seperti bonito.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' ile ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: '\'i karıştırmak, cümlenin kime seslendiğini unutmaktır. İkinci tuzak, bir soruyu düz bir tonla okumak, ', semantic: 'explanation' }, { text: 'cümlenin sonuna doğru perdenin yükselmesini', semantic: 'targetCorrect' }, { text: ' unutmaktır. Üçüncüsü, de acuerdo\'nun bonito gibi cinsiyete göre değiştiğine karar vermektir.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszym błędem jest pomylenie ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' z ', semantic: 'explanation' }, { text: 'es', semantic: 'targetWrong' }, { text: ', zapomnienie, do kogo skierowane jest zdanie. Druga pułapka to odczytanie pytania równym tonem, zapominając o ', semantic: 'explanation' }, { text: 'wzniesieniu głosu ku końcowi', semantic: 'targetCorrect' }, { text: '. Trzecia to uznanie, że de acuerdo zmienia się przez rodzaj, jak bonito.', semantic: 'explanation' }),
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
