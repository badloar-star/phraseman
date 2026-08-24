import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const EPISODE_01_SESSION_01_WORD_FIRST_TITLE = L({
  ru: 'Я здесь',
  uk: 'Я тут',
  es: 'Estoy aquí',
  'pt-BR': 'Estou aqui',
  vi: 'Tôi ở đây',
  id: 'Saya di sini',
  tr: 'Buradayım',
  pl: 'Jestem tutaj',
});

export const EPISODE_01_SESSION_01_WORD_FIRST_SUMMARY = L({
  ru: 'Четыре коротких английских слова сначала становятся понятными по отдельности, а затем соединяются в речь о себе.',
  uk: 'Чотири короткі англійські слова спершу стають зрозумілими окремо, а потім з’єднуються у вислів про себе.',
  es: 'Cuatro palabras inglesas se aclaran por separado antes de formar una idea completa sobre quien habla.',
  'pt-BR': 'Quatro palavras inglesas ficam claras separadamente antes de formar uma ideia completa sobre quem fala.',
  vi: 'Bốn từ tiếng Anh được hiểu riêng từng từ trước khi ghép thành lời nói trọn vẹn về bản thân.',
  id: 'Empat kata bahasa Inggris dipahami satu per satu sebelum digabungkan menjadi gagasan lengkap tentang diri sendiri.',
  tr: 'Dört İngilizce sözcük önce ayrı ayrı anlaşılır, sonra kişinin kendisiyle ilgili tam bir anlatı kurar.',
  pl: 'Cztery angielskie słowa najpierw stają się jasne osobno, a potem łączą się w pełną wypowiedź o sobie.',
});

export const EPISODE_01_SESSION_01_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать I, am, here и ready, а затем правильно соединить их.',
  uk: 'Упізнати на слух, зрозуміти й точно написати I, am, here та ready, а потім правильно їх поєднати.',
  es: 'Reconocer, comprender y escribir I, am, here y ready antes de combinarlas correctamente.',
  'pt-BR': 'Reconhecer, compreender e escrever I, am, here e ready antes de combiná-las corretamente.',
  vi: 'Nghe ra, hiểu và viết đúng I, am, here và ready trước khi ghép chúng chính xác.',
  id: 'Mengenali bunyi, memahami, dan menulis I, am, here, serta ready sebelum menggabungkannya dengan tepat.',
  tr: 'I, am, here ve ready sözcüklerini duyup anlamak ve doğru yazmak; ardından doğru biçimde birleştirmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać I, am, here oraz ready, a potem właściwie je połączyć.',
});

const CONCEPT_BODY = L({
  ru: 'Когда человек говорит о себе, английский показывает его отдельным словом I. Оно значит «я» именно для того, кто говорит. На письме это всего одна буква, но она всегда заглавная, даже внутри строки. Маленькая i выглядит почти так же, а l без точки легко принять за неё; ни одна из них не является английским словом «я». Надёжный ориентир прост: говорящий называет себя формой I.',
  uk: 'Коли людина говорить про себе, англійська показує її окремим словом I. Воно означає «я» саме для того, хто говорить. На письмі це лише одна літера, але вона завжди велика, навіть усередині рядка. Маленька i виглядає майже так само, а l без крапки легко сплутати з нею; жодна з них не є англійським словом «я». Надійний орієнтир простий: мовець називає себе формою I.',
  es: 'En español, yo puede quedar oculto porque la forma verbal ya muestra quién habla. El inglés coloca esa persona en una palabra independiente: I. Es una sola letra y siempre se escribe con mayúscula, incluso en medio de una línea. La i minúscula se parece mucho, y l sin punto puede confundirse con ella; ninguna de las dos significa «yo» en inglés. La referencia segura es simple: quien habla se nombra con I.',
  'pt-BR': 'Em português, eu pode ficar oculto porque a forma verbal já mostra quem fala. O inglês coloca essa pessoa em uma palavra independente: I. É uma única letra e sempre aparece em maiúscula, mesmo no meio de uma linha. A i minúscula se parece muito, e l sem ponto pode ser confundido com ela; nenhuma das duas significa «eu» em inglês. A referência segura é simples: quem fala se nomeia com I.',
  vi: 'Tiếng Việt dùng “tôi” để chỉ người đang nói, còn tiếng Anh đặt người ấy trong một từ riêng: I. Từ này chỉ có một chữ cái nhưng luôn viết hoa, kể cả ở giữa dòng. Chữ i thường trông gần giống, còn l không có dấu chấm rất dễ bị nhìn nhầm; cả hai đều không phải từ tiếng Anh mang nghĩa “tôi”. Dấu hiệu chắc chắn rất đơn giản: người nói tự gọi mình bằng I.',
  id: 'Bahasa Indonesia memakai saya untuk orang yang berbicara, sedangkan bahasa Inggris menandainya dengan satu kata tersendiri: I. Kata ini hanya satu huruf, tetapi selalu ditulis dengan huruf besar, bahkan di tengah baris. Huruf i kecil tampak sangat mirip, dan l tanpa titik mudah terbaca keliru; keduanya bukan kata bahasa Inggris untuk “saya”. Patokannya sederhana: penutur menyebut dirinya dengan I.',
  tr: 'Türkçede konuşan kişi çoğu zaman yüklem ekinden anlaşılır; İngilizce ise onu ayrı bir sözcükle gösterir: I. Bu sözcük tek harften oluşur ve satır ortasında bile her zaman büyük yazılır. Küçük i çok benzer görünür, noktasız l de kolayca onunla karışır; ikisi de İngilizcede “ben” sözcüğü değildir. Güvenilir işaret basittir: konuşan kişi kendisini I ile adlandırır.',
  pl: 'Po polsku osoba mówiąca bywa widoczna w formie czasownika, więc zaimek ja można pominąć. Angielski pokazuje ją osobnym słowem I. To tylko jedna litera, ale zawsze zapisuje się ją wielką literą, nawet w środku wiersza. Małe i wygląda prawie tak samo, a l bez kropki łatwo z nim pomylić; żadna z tych form nie jest angielskim słowem „ja”. Pewna wskazówka jest prosta: mówiący nazywa siebie formą I.',
});

const FORMULA_BODY = L({
  ru: 'Слово am не описывает место или состояние само по себе. Это короткая связка для случая, когда говорящий уже назвал себя через I. В русском переводе такая связь часто остаётся невидимой, но в английской форме она нужна. Держите роли раздельно: I называет человека; am соединяет его с дальнейшей информацией. На слух у am отчётливо заканчивается звук /m/. В an финальный звук /n/, а одиночная m — только буква. Если нужна именно связка говорящего, выбирайте am.',
  uk: 'Слово am саме по собі не описує місце чи стан. Це коротка зв’язка для випадку, коли мовець уже назвав себе через I. В українському перекладі така зв’язка часто лишається невидимою, але в англійській формі вона потрібна. Тримайте ролі окремо: I називає людину; am з’єднує її з подальшою інформацією. На слух am чітко закінчується звуком /m/. В an наприкінці чути /n/, а окрема m — лише літера. Коли потрібна саме зв’язка мовця, обирайте am.',
  es: 'Am no describe por sí sola un lugar ni un estado. Es la unión breve que usa el inglés cuando la persona que habla ya está nombrada con I. En español esa información puede quedar reunida dentro de soy o estoy, pero el inglés la muestra aparte. Mantén dos funciones distintas: I nombra a la persona; am la conecta con la información que seguirá. Al oír am, el final es /m/. An termina en /n/ y una m sola es únicamente una letra. Para la unión del hablante, la forma precisa es am.',
  'pt-BR': 'Am não descreve sozinho um lugar nem um estado. É a ligação curta usada pelo inglês quando quem fala já foi indicado por I. Em português essa informação pode ficar reunida em sou ou estou, mas o inglês a mostra separadamente. Mantenha duas funções distintas: I nomeia a pessoa; am a conecta à informação que virá. Ao ouvir am, o final é /m/. An termina em /n/, e m sozinho é apenas uma letra. Para ligar quem fala, a forma exata é am.',
  vi: 'Am không tự diễn tả nơi chốn hay trạng thái. Đây là từ nối ngắn dùng khi người nói đã được gọi bằng I. Tiếng Việt thường không cần một từ nối như vậy trước tính chất, nhưng tiếng Anh phải hiện nó ra. Hãy tách rõ hai vai trò: I gọi tên người nói; am nối người ấy với thông tin phía sau. Khi nghe am, âm cuối là /m/. An kết thúc bằng /n/, còn m đứng một mình chỉ là một chữ cái. Từ nối chính xác cho người nói là am.',
  id: 'Am tidak menjelaskan tempat atau keadaan sendirian. Kata pendek ini menjadi penghubung ketika penutur sudah disebut dengan I. Bahasa Indonesia sering tidak menampilkan penghubung semacam itu sebelum sifat, tetapi bahasa Inggris harus menampilkannya. Pisahkan dua tugasnya: I menyebut orangnya; am menghubungkannya dengan informasi berikutnya. Saat am terdengar, bunyi akhirnya /m/. An berakhir dengan /n/, sedangkan m sendiri hanya sebuah huruf. Penghubung yang tepat untuk penutur ialah am.',
  tr: 'Am tek başına bir yer ya da durum anlatmaz. Konuşan kişi I ile adlandırıldıktan sonra onu gelecek bilgiye bağlayan kısa sözcüktür. Türkçede bu bağlantı çoğu zaman yüklem ekinin içinde görünür; İngilizcede ayrı yazılır. İki görevi ayırın: I kişiyi adlandırır; am onu sonraki bilgiye bağlar. Am duyulduğunda son ses /m/ olur. An /n/ ile biter, tek başına m ise yalnızca bir harftir. Konuşanı bağlayan doğru biçim am olur.',
  pl: 'Am samo nie opisuje miejsca ani stanu. To krótki łącznik używany wtedy, gdy osoba mówiąca została już nazwana przez I. Po polsku ta informacja często mieści się w formie jestem, lecz angielski pokazuje ją osobno. Rozdziel dwie funkcje: I nazywa osobę; am łączy ją z dalszą informacją. W wymowie am kończy się dźwiękiem /m/. An kończy się /n/, a samo m jest tylko literą. Właściwym łącznikiem dla mówiącego jest am.',
});

const TRAP_BODY = L({
  ru: 'Слово here указывает место говорящего и означает «здесь». Оно начинается с заметного /h/ и пишется с двумя e по краям. На слух рядом оказывается hear: звучание может совпасть, но это другое слово со значением «слышать». Hair тоже похоже, однако означает «волосы» и имеет другой гласный звук. Поэтому одного знакомого звучания недостаточно: для значения «здесь» нужна точная форма here.',
  uk: 'Слово here вказує місце мовця й означає «тут». Воно починається з помітного /h/ і має дві e по краях у написанні. На слух поруч опиняється hear: звучання може збігатися, але це інше слово зі значенням «чути». Hair теж схоже, проте означає «волосся» й має інший голосний звук. Тому знайомого звучання недостатньо: для значення «тут» потрібна точна форма here.',
  es: 'Here señala el lugar de quien habla y significa «aquí». Empieza con un /h/ perceptible y lleva una e a cada lado de la r. Al oído aparece muy cerca hear: puede sonar igual, pero es otra palabra y significa «oír». Hair también se parece, aunque significa «pelo» y usa otra vocal. Por eso no basta reconocer un sonido familiar: para expresar «aquí», la forma exacta es here.',
  'pt-BR': 'Here aponta para o lugar de quem fala e significa «aqui». Começa com um /h/ perceptível e tem uma letra e de cada lado do r. Ao ouvir, hear fica muito próximo: pode soar igual, mas é outra palavra e significa «ouvir». Hair também se parece, porém significa «cabelo» e usa outra vogal. Por isso o som familiar não basta: para dizer «aqui», a forma exata é here.',
  vi: 'Here chỉ nơi của người nói và mang nghĩa “ở đây”. Từ này bắt đầu bằng /h/ rõ ràng và có hai chữ e ở hai bên r. Khi nghe, hear ở rất gần: âm có thể giống nhau nhưng đó là từ khác, nghĩa là “nghe”. Hair cũng gần giống, nhưng nghĩa là “tóc” và có nguyên âm khác. Vì vậy chỉ nhận ra âm quen chưa đủ: để nói “ở đây”, dạng chính xác là here.',
  id: 'Here menunjuk tempat penutur dan berarti “di sini”. Kata ini diawali /h/ yang jelas dan memiliki huruf e di kedua sisi r. Saat didengar, hear sangat dekat: bunyinya dapat sama, tetapi itu kata lain yang berarti “mendengar”. Hair juga mirip, namun berarti “rambut” dan memakai vokal yang berbeda. Jadi bunyi yang terasa akrab belum cukup: untuk makna “di sini”, bentuk yang tepat ialah here.',
  tr: 'Here konuşanın bulunduğu yeri gösterir ve “burada” demektir. Belirgin bir /h/ ile başlar ve yazıda r harfinin iki yanında e bulunur. Duyarken hear çok yakına gelir: aynı duyulabilir ama “duymak” anlamındaki başka bir sözcüktür. Hair da benzer görünür; “saç” demektir ve ünlü sesi farklıdır. Bu yüzden tanıdık bir ses yetmez: “burada” anlamı için doğru biçim here olur.',
  pl: 'Here wskazuje miejsce osoby mówiącej i znaczy „tutaj”. Zaczyna się wyraźnym /h/, a w zapisie ma e po obu stronach r. W wymowie bardzo blisko znajduje się hear: może brzmieć tak samo, ale jest innym słowem i znaczy „słyszeć”. Hair także wygląda podobnie, lecz oznacza „włosy” i ma inną samogłoskę. Sam znajomy dźwięk więc nie wystarczy: znaczenie „tutaj” ma dokładna forma here.',
});

export const EPISODE_01_SESSION_01_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'I называет говорящего',
      uk: 'I називає мовця',
      es: 'I nombra a quien habla',
      'pt-BR': 'I nomeia quem fala',
      vi: 'I gọi tên người đang nói',
      id: 'I menunjuk orang yang berbicara',
      tr: 'I konuşan kişiyi gösterir',
      pl: 'I nazywa osobę mówiącą',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Когда человек говорит о себе, английский показывает его отдельным словом ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Оно значит «я» именно для того, кто говорит. На письме это всего одна буква, но она всегда заглавная, даже внутри строки. Маленькая ', semantic: 'explanation' }, { text: 'i', semantic: 'targetWrong' }, { text: ' выглядит почти так же, а ', semantic: 'explanation' }, { text: 'l', semantic: 'targetWrong' }, { text: ' без точки легко принять за неё; ни одна из них не является английским словом «я». Надёжный ориентир прост: говорящий называет себя формой ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Коли людина говорить про себе, англійська показує її окремим словом ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Воно означає «я» саме для того, хто говорить. На письмі це лише одна літера, але вона завжди велика, навіть усередині рядка. Маленька ', semantic: 'explanation' }, { text: 'i', semantic: 'targetWrong' }, { text: ' виглядає майже так само, а ', semantic: 'explanation' }, { text: 'l', semantic: 'targetWrong' }, { text: ' без крапки легко сплутати з нею; жодна з них не є англійським словом «я». Надійний орієнтир простий: мовець називає себе формою ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'En español, yo puede quedar oculto porque la forma verbal ya muestra quién habla. El inglés coloca esa persona en una palabra independiente: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Es una sola letra y siempre se escribe con mayúscula, incluso en medio de una línea. La ', semantic: 'explanation' }, { text: 'i', semantic: 'targetWrong' }, { text: ' minúscula se parece mucho, y ', semantic: 'explanation' }, { text: 'l', semantic: 'targetWrong' }, { text: ' sin punto puede confundirse con ella; ninguna de las dos significa «yo» en inglés. La referencia segura es simple: quien habla se nombra con ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Em português, eu pode ficar oculto porque a forma verbal já mostra quem fala. O inglês coloca essa pessoa em uma palavra independente: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. É uma única letra e sempre aparece em maiúscula, mesmo no meio de uma linha. A ', semantic: 'explanation' }, { text: 'i', semantic: 'targetWrong' }, { text: ' minúscula se parece muito, e ', semantic: 'explanation' }, { text: 'l', semantic: 'targetWrong' }, { text: ' sem ponto pode ser confundido com ela; nenhuma das duas significa «eu» em inglês. A referência segura é simples: quem fala se nomeia com ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Tiếng Việt dùng “tôi” để chỉ người đang nói, còn tiếng Anh đặt người ấy trong một từ riêng: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Từ này chỉ có một chữ cái nhưng luôn viết hoa, kể cả ở giữa dòng. Chữ ', semantic: 'explanation' }, { text: 'i', semantic: 'targetWrong' }, { text: ' thường trông gần giống, còn ', semantic: 'explanation' }, { text: 'l', semantic: 'targetWrong' }, { text: ' không có dấu chấm rất dễ bị nhìn nhầm; cả hai đều không phải từ tiếng Anh mang nghĩa “tôi”. Dấu hiệu chắc chắn rất đơn giản: người nói tự gọi mình bằng ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Bahasa Indonesia memakai saya untuk orang yang berbicara, sedangkan bahasa Inggris menandainya dengan satu kata tersendiri: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Kata ini hanya satu huruf, tetapi selalu ditulis dengan huruf besar, bahkan di tengah baris. Huruf ', semantic: 'explanation' }, { text: 'i', semantic: 'targetWrong' }, { text: ' kecil tampak sangat mirip, dan ', semantic: 'explanation' }, { text: 'l', semantic: 'targetWrong' }, { text: ' tanpa titik mudah terbaca keliru; keduanya bukan kata bahasa Inggris untuk “saya”. Patokannya sederhana: penutur menyebut dirinya dengan ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Türkçede konuşan kişi çoğu zaman yüklem ekinden anlaşılır; İngilizce ise onu ayrı bir sözcükle gösterir: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Bu sözcük tek harften oluşur ve satır ortasında bile her zaman büyük yazılır. Küçük ', semantic: 'explanation' }, { text: 'i', semantic: 'targetWrong' }, { text: ' çok benzer görünür, noktasız ', semantic: 'explanation' }, { text: 'l', semantic: 'targetWrong' }, { text: ' de kolayca onunla karışır; ikisi de İngilizcede “ben” sözcüğü değildir. Güvenilir işaret basittir: konuşan kişi kendisini ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' ile adlandırır.', semantic: 'explanation' }),
      pl: R({ text: 'Po polsku osoba mówiąca bywa widoczna w formie czasownika, więc zaimek ja można pominąć. Angielski pokazuje ją osobnym słowem ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. To tylko jedna litera, ale zawsze zapisuje się ją wielką literą, nawet w środku wiersza. Małe ', semantic: 'explanation' }, { text: 'i', semantic: 'targetWrong' }, { text: ' wygląda prawie tak samo, a ', semantic: 'explanation' }, { text: 'l', semantic: 'targetWrong' }, { text: ' bez kropki łatwo z nim pomylić; żadna z tych form nie jest angielskim słowem „ja”. Pewna wskazówka jest prosta: mówiący nazywa siebie formą ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({ ru: 'Как по-английски записывается «я»?', uk: 'Як англійською записується «я»?', es: '¿Cómo se escribe «yo» en inglés?', 'pt-BR': 'Como se escreve «eu» em inglês?', vi: 'Từ tiếng Anh nào viết là “tôi”?', id: 'Bagaimana menulis “saya” dalam bahasa Inggris?', tr: 'İngilizcede “ben” nasıl yazılır?', pl: 'Jak po angielsku zapisuje się „ja”?' }),
      choices: [
        L({ ru: 'I', uk: 'I', es: 'I', 'pt-BR': 'I', vi: 'I', id: 'I', tr: 'I', pl: 'I' }),
        L({ ru: 'i', uk: 'i', es: 'i', 'pt-BR': 'i', vi: 'i', id: 'i', tr: 'i', pl: 'i' }),
        L({ ru: 'l', uk: 'l', es: 'l', 'pt-BR': 'l', vi: 'l', id: 'l', tr: 'l', pl: 'l' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'I означает «я» и всегда пишется заглавной. i — маленькая буква, а l — другая буква без точки.',
        uk: 'I означає «я» й завжди пишеться великою. i — мала літера, а l — інша літера без крапки.',
        es: 'I significa «yo» y siempre lleva mayúscula. i es minúscula y l es otra letra sin punto.',
        'pt-BR': 'I significa «eu» e sempre usa maiúscula. i é minúscula e l é outra letra sem ponto.',
        vi: 'I nghĩa là “tôi” và luôn viết hoa. i là chữ thường, còn l là một chữ khác không có dấu chấm.',
        id: 'I berarti “saya” dan selalu ditulis besar. i adalah huruf kecil, sedangkan l huruf lain tanpa titik.',
        tr: 'I “ben” demektir ve her zaman büyük yazılır. i küçük harftir, l ise noktasız başka bir harftir.',
        pl: 'I znaczy „ja” i zawsze jest wielkie. i to mała litera, a l to inna litera bez kropki.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({ ru: 'Am создаёт связь', uk: 'Am створює зв’язок', es: 'Am crea la unión', 'pt-BR': 'Am cria a ligação', vi: 'Am tạo mối nối', id: 'Am menjadi penghubung', tr: 'Am bağlantıyı kurar', pl: 'Am tworzy połączenie' }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' не описывает место или состояние само по себе. Это короткая связка для случая, когда говорящий уже назвал себя через ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. В русском переводе такая связь часто остаётся невидимой, но в английской форме она нужна. Держите роли раздельно: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' называет человека; ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' соединяет его с дальнейшей информацией. На слух у ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' отчётливо заканчивается звук /m/. В ', semantic: 'explanation' }, { text: 'an', semantic: 'targetWrong' }, { text: ' финальный звук /n/, а одиночная ', semantic: 'explanation' }, { text: 'm', semantic: 'targetWrong' }, { text: ' — только буква. Если нужна именно связка говорящего, выбирайте ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' саме по собі не описує місце чи стан. Це коротка зв’язка для випадку, коли мовець уже назвав себе через ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. В українському перекладі така зв’язка часто лишається невидимою, але в англійській формі вона потрібна. Тримайте ролі окремо: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' називає людину; ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' з’єднує її з подальшою інформацією. На слух ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' чітко закінчується звуком /m/. В ', semantic: 'explanation' }, { text: 'an', semantic: 'targetWrong' }, { text: ' наприкінці чути /n/, а окрема ', semantic: 'explanation' }, { text: 'm', semantic: 'targetWrong' }, { text: ' — лише літера. Коли потрібна саме зв’язка мовця, обирайте ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'Am', semantic: 'targetCorrect' }, { text: ' no describe por sí sola un lugar ni un estado. Es la unión breve que usa el inglés cuando la persona que habla ya está nombrada con ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. En español esa información puede quedar reunida dentro de soy o estoy, pero el inglés la muestra aparte. Mantén dos funciones distintas: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' nombra a la persona; ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' la conecta con la información que seguirá. Al oír ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ', el final es /m/. ', semantic: 'explanation' }, { text: 'An', semantic: 'targetWrong' }, { text: ' termina en /n/ y una ', semantic: 'explanation' }, { text: 'm', semantic: 'targetWrong' }, { text: ' sola es únicamente una letra. Para la unión del hablante, la forma precisa es ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Am', semantic: 'targetCorrect' }, { text: ' não descreve sozinho um lugar nem um estado. É a ligação curta usada pelo inglês quando quem fala já foi indicado por ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Em português essa informação pode ficar reunida em sou ou estou, mas o inglês a mostra separadamente. Mantenha duas funções distintas: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' nomeia a pessoa; ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' a conecta à informação que virá. Ao ouvir ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ', o final é /m/. ', semantic: 'explanation' }, { text: 'An', semantic: 'targetWrong' }, { text: ' termina em /n/, e ', semantic: 'explanation' }, { text: 'm', semantic: 'targetWrong' }, { text: ' sozinho é apenas uma letra. Para ligar quem fala, a forma exata é ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Am', semantic: 'targetCorrect' }, { text: ' không tự diễn tả nơi chốn hay trạng thái. Đây là từ nối ngắn dùng khi người nói đã được gọi bằng ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Tiếng Việt thường không cần một từ nối như vậy trước tính chất, nhưng tiếng Anh phải hiện nó ra. Hãy tách rõ hai vai trò: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' gọi tên người nói; ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' nối người ấy với thông tin phía sau. Khi nghe ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ', âm cuối là /m/. ', semantic: 'explanation' }, { text: 'An', semantic: 'targetWrong' }, { text: ' kết thúc bằng /n/, còn ', semantic: 'explanation' }, { text: 'm', semantic: 'targetWrong' }, { text: ' đứng một mình chỉ là một chữ cái. Từ nối chính xác cho người nói là ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Am', semantic: 'targetCorrect' }, { text: ' tidak menjelaskan tempat atau keadaan sendirian. Kata pendek ini menjadi penghubung ketika penutur sudah disebut dengan ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Bahasa Indonesia sering tidak menampilkan penghubung semacam itu sebelum sifat, tetapi bahasa Inggris harus menampilkannya. Pisahkan dua tugasnya: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' menyebut orangnya; ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' menghubungkannya dengan informasi berikutnya. Saat ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' terdengar, bunyi akhirnya /m/. ', semantic: 'explanation' }, { text: 'An', semantic: 'targetWrong' }, { text: ' berakhir dengan /n/, sedangkan ', semantic: 'explanation' }, { text: 'm', semantic: 'targetWrong' }, { text: ' sendiri hanya sebuah huruf. Penghubung yang tepat untuk penutur ialah ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Am', semantic: 'targetCorrect' }, { text: ' tek başına bir yer ya da durum anlatmaz. Konuşan kişi ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' ile adlandırıldıktan sonra onu gelecek bilgiye bağlayan kısa sözcüktür. Türkçede bu bağlantı çoğu zaman yüklem ekinin içinde görünür; İngilizcede ayrı yazılır. İki görevi ayırın: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' kişiyi adlandırır; ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' onu sonraki bilgiye bağlar. ', semantic: 'explanation' }, { text: 'Am', semantic: 'targetCorrect' }, { text: ' duyulduğunda son ses /m/ olur. ', semantic: 'explanation' }, { text: 'An', semantic: 'targetWrong' }, { text: ' /n/ ile biter, tek başına ', semantic: 'explanation' }, { text: 'm', semantic: 'targetWrong' }, { text: ' ise yalnızca bir harftir. Konuşanı bağlayan doğru biçim ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' olur.', semantic: 'explanation' }),
      pl: R({ text: 'Am', semantic: 'targetCorrect' }, { text: ' samo nie opisuje miejsca ani stanu. To krótki łącznik używany wtedy, gdy osoba mówiąca została już nazwana przez ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '. Po polsku ta informacja często mieści się w formie jestem, lecz angielski pokazuje ją osobno. Rozdziel dwie funkcje: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' nazywa osobę; ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' łączy ją z dalszą informacją. W wymowie ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: ' kończy się dźwiękiem /m/. ', semantic: 'explanation' }, { text: 'An', semantic: 'targetWrong' }, { text: ' kończy się /n/, a samo ', semantic: 'explanation' }, { text: 'm', semantic: 'targetWrong' }, { text: ' jest tylko literą. Właściwym łącznikiem dla mówiącego jest ', semantic: 'explanation' }, { text: 'am', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({ ru: 'Какое слово звучит с финальным /m/ и служит связкой?', uk: 'Яке слово закінчується звуком /m/ і служить зв’язкою?', es: '¿Qué palabra termina en /m/ y funciona como unión?', 'pt-BR': 'Qual palavra termina em /m/ e funciona como ligação?', vi: 'Từ nào kết thúc bằng /m/ và làm từ nối?', id: 'Kata mana berakhir dengan /m/ dan menjadi penghubung?', tr: 'Hangi sözcük /m/ ile biter ve bağlantı kurar?', pl: 'Które słowo kończy się /m/ i jest łącznikiem?' }),
      choices: [
        L({ ru: 'am', uk: 'am', es: 'am', 'pt-BR': 'am', vi: 'am', id: 'am', tr: 'am', pl: 'am' }),
        L({ ru: 'an', uk: 'an', es: 'an', 'pt-BR': 'an', vi: 'an', id: 'an', tr: 'an', pl: 'an' }),
        L({ ru: 'm', uk: 'm', es: 'm', 'pt-BR': 'm', vi: 'm', id: 'm', tr: 'm', pl: 'm' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Am — связка с финальным /m/. В an слышится /n/, а m без a остаётся одной буквой.',
        uk: 'Am — зв’язка з кінцевим /m/. В an чути /n/, а m без a лишається однією літерою.',
        es: 'Am es la unión y termina en /m/. An termina en /n/ y m sin a es solo una letra.',
        'pt-BR': 'Am é a ligação e termina em /m/. An termina em /n/ e m sem a é apenas uma letra.',
        vi: 'Am là từ nối và kết thúc bằng /m/. An kết thúc bằng /n/, còn m không có a chỉ là một chữ cái.',
        id: 'Am adalah penghubung dan berakhir dengan /m/. An berakhir dengan /n/, sedangkan m tanpa a hanya sebuah huruf.',
        tr: 'Am bağlantı kurar ve /m/ ile biter. An /n/ ile biter; a olmadan m yalnızca bir harftir.',
        pl: 'Am jest łącznikiem i kończy się /m/. An kończy się /n/, a m bez a jest tylko literą.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({ ru: 'Here означает «здесь»', uk: 'Here означає «тут»', es: 'Here significa «aquí»', 'pt-BR': 'Here significa «aqui»', vi: 'Here nghĩa là “ở đây”', id: 'Here berarti “di sini”', tr: 'Here “burada” demektir', pl: 'Here znaczy „tutaj”' }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: ' указывает место говорящего и означает «здесь». Оно начинается с заметного /h/ и пишется с двумя e по краям. На слух рядом оказывается ', semantic: 'explanation' }, { text: 'hear', semantic: 'targetWrong' }, { text: ': звучание может совпасть, но это другое слово со значением «слышать». ', semantic: 'explanation' }, { text: 'Hair', semantic: 'targetWrong' }, { text: ' тоже похоже, однако означает «волосы» и имеет другой гласный звук. Поэтому одного знакомого звучания недостаточно: для значения «здесь» нужна точная форма ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: ' вказує місце мовця й означає «тут». Воно починається з помітного /h/ і має дві e по краях у написанні. На слух поруч опиняється ', semantic: 'explanation' }, { text: 'hear', semantic: 'targetWrong' }, { text: ': звучання може збігатися, але це інше слово зі значенням «чути». ', semantic: 'explanation' }, { text: 'Hair', semantic: 'targetWrong' }, { text: ' теж схоже, проте означає «волосся» й має інший голосний звук. Тому знайомого звучання недостатньо: для значення «тут» потрібна точна форма ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'Here', semantic: 'targetCorrect' }, { text: ' señala el lugar de quien habla y significa «aquí». Empieza con un /h/ perceptible y lleva una e a cada lado de la r. Al oído aparece muy cerca ', semantic: 'explanation' }, { text: 'hear', semantic: 'targetWrong' }, { text: ': puede sonar igual, pero es otra palabra y significa «oír». ', semantic: 'explanation' }, { text: 'Hair', semantic: 'targetWrong' }, { text: ' también se parece, aunque significa «pelo» y usa otra vocal. Por eso no basta reconocer un sonido familiar: para expresar «aquí», la forma exacta es ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Here', semantic: 'targetCorrect' }, { text: ' aponta para o lugar de quem fala e significa «aqui». Começa com um /h/ perceptível e tem uma letra e de cada lado do r. Ao ouvir, ', semantic: 'explanation' }, { text: 'hear', semantic: 'targetWrong' }, { text: ' fica muito próximo: pode soar igual, mas é outra palavra e significa «ouvir». ', semantic: 'explanation' }, { text: 'Hair', semantic: 'targetWrong' }, { text: ' também se parece, porém significa «cabelo» e usa outra vogal. Por isso o som familiar não basta: para dizer «aqui», a forma exata é ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Here', semantic: 'targetCorrect' }, { text: ' chỉ nơi của người nói và mang nghĩa “ở đây”. Từ này bắt đầu bằng /h/ rõ ràng và có hai chữ e ở hai bên r. Khi nghe, ', semantic: 'explanation' }, { text: 'hear', semantic: 'targetWrong' }, { text: ' ở rất gần: âm có thể giống nhau nhưng đó là từ khác, nghĩa là “nghe”. ', semantic: 'explanation' }, { text: 'Hair', semantic: 'targetWrong' }, { text: ' cũng gần giống, nhưng nghĩa là “tóc” và có nguyên âm khác. Vì vậy chỉ nhận ra âm quen chưa đủ: để nói “ở đây”, dạng chính xác là ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Here', semantic: 'targetCorrect' }, { text: ' menunjuk tempat penutur dan berarti “di sini”. Kata ini diawali /h/ yang jelas dan memiliki huruf e di kedua sisi r. Saat didengar, ', semantic: 'explanation' }, { text: 'hear', semantic: 'targetWrong' }, { text: ' sangat dekat: bunyinya dapat sama, tetapi itu kata lain yang berarti “mendengar”. ', semantic: 'explanation' }, { text: 'Hair', semantic: 'targetWrong' }, { text: ' juga mirip, namun berarti “rambut” dan memakai vokal yang berbeda. Jadi bunyi yang terasa akrab belum cukup: untuk makna “di sini”, bentuk yang tepat ialah ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Here', semantic: 'targetCorrect' }, { text: ' konuşanın bulunduğu yeri gösterir ve “burada” demektir. Belirgin bir /h/ ile başlar ve yazıda r harfinin iki yanında e bulunur. Duyarken ', semantic: 'explanation' }, { text: 'hear', semantic: 'targetWrong' }, { text: ' çok yakına gelir: aynı duyulabilir ama “duymak” anlamındaki başka bir sözcüktür. ', semantic: 'explanation' }, { text: 'Hair', semantic: 'targetWrong' }, { text: ' da benzer görünür; “saç” demektir ve ünlü sesi farklıdır. Bu yüzden tanıdık bir ses yetmez: “burada” anlamı için doğru biçim ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: ' olur.', semantic: 'explanation' }),
      pl: R({ text: 'Here', semantic: 'targetCorrect' }, { text: ' wskazuje miejsce osoby mówiącej i znaczy „tutaj”. Zaczyna się wyraźnym /h/, a w zapisie ma e po obu stronach r. W wymowie bardzo blisko znajduje się ', semantic: 'explanation' }, { text: 'hear', semantic: 'targetWrong' }, { text: ': może brzmieć tak samo, ale jest innym słowem i znaczy „słyszeć”. ', semantic: 'explanation' }, { text: 'Hair', semantic: 'targetWrong' }, { text: ' także wygląda podobnie, lecz oznacza „włosy” i ma inną samogłoskę. Sam znajomy dźwięk więc nie wystarczy: znaczenie „tutaj” ma dokładna forma ', semantic: 'explanation' }, { text: 'here', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({ ru: 'Какое написание означает «здесь»?', uk: 'Яке написання означає «тут»?', es: '¿Qué forma escrita significa «aquí»?', 'pt-BR': 'Qual forma escrita significa «aqui»?', vi: 'Cách viết nào nghĩa là “ở đây”?', id: 'Bentuk tulisan mana berarti “di sini”?', tr: 'Hangi yazım “burada” demektir?', pl: 'Który zapis znaczy „tutaj”?' }),
      choices: [
        L({ ru: 'here', uk: 'here', es: 'here', 'pt-BR': 'here', vi: 'here', id: 'here', tr: 'here', pl: 'here' }),
        L({ ru: 'hear', uk: 'hear', es: 'hear', 'pt-BR': 'hear', vi: 'hear', id: 'hear', tr: 'hear', pl: 'hear' }),
        L({ ru: 'hair', uk: 'hair', es: 'hair', 'pt-BR': 'hair', vi: 'hair', id: 'hair', tr: 'hair', pl: 'hair' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Here означает «здесь». Hear означает «слышать», а hair — «волосы».',
        uk: 'Here означає «тут». Hear означає «чути», а hair — «волосся».',
        es: 'Here significa «aquí». Hear significa «oír» y hair significa «pelo».',
        'pt-BR': 'Here significa «aqui». Hear significa «ouvir» e hair significa «cabelo».',
        vi: 'Here nghĩa là “ở đây”. Hear nghĩa là “nghe”, còn hair nghĩa là “tóc”.',
        id: 'Here berarti “di sini”. Hear berarti “mendengar”, sedangkan hair berarti “rambut”.',
        tr: 'Here “burada” demektir. Hear “duymak”, hair ise “saç” demektir.',
        pl: 'Here znaczy „tutaj”. Hear znaczy „słyszeć”, a hair znaczy „włosy”.',
      }),
    },
  },
];
