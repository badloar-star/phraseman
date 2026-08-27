import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] =>
  // Session 1 compares valid English competitors (an, m, hear, hair). They are
  // wrong answers in this context, but not malformed English. Owner rule:
  // valid target-language forms keep one target colour; red strike-through is
  // reserved for an actually invalid form.
  runs.map((run) =>
    run.semantic === 'targetWrong'
      ? { ...run, semantic: 'targetCorrect' as const }
      : run,
  );

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
  ru: 'Слово I не приклеено к одному человеку навсегда. Оно переходит к тому, у кого сейчас воображаемый микрофон. Говорите вы — I означает «я» и указывает на вас. Собеседник забирает реплику — теперь его I указывает уже на него. Поэтому I всегда называет того, кто сейчас говорит, а не слушателя и не место разговора. На письме английский всегда даёт этому короткому слову заглавную форму I.',
  uk: 'Слово I не належить одній людині назавжди. Воно переходить до того, в кого зараз уявний мікрофон. Говорите ви — I означає «я» і вказує на вас. Співрозмовник бере слово — його I вже вказує на нього. Тому I завжди називає того, хто зараз говорить, а не слухача і не місце розмови. На письмі англійська завжди подає це коротке слово великою літерою I.',
  es: 'I no pertenece para siempre a una sola persona: viaja con el micrófono imaginario. Si hablas tú, I significa «yo» y te señala a ti. Cuando la otra persona toma la palabra, su I pasa a señalarla a ella. Por eso I nombra siempre a quien está hablando, y no al que escucha ni al lugar de la conversación. En la escritura inglesa esta palabra breve siempre aparece como I mayúscula.',
  'pt-BR': 'I não pertence para sempre a uma única pessoa: acompanha o microfone imaginário. Quando você fala, I significa «eu» e aponta para você. Quando a outra pessoa toma a palavra, o I dela passa a apontar para ela. Portanto, I nomeia sempre quem está falando, e não quem escuta nem o lugar da conversa. Na escrita inglesa, essa palavra curta aparece sempre como I maiúsculo.',
  vi: 'I không gắn vĩnh viễn với một người; nó đi theo chiếc micro tưởng tượng. Khi bạn đang nói, I mang nghĩa “tôi” và chỉ chính bạn. Khi người đối diện cất lời, I của họ lại chỉ họ. Vì thế I luôn chỉ người đang nói, chứ không phải người nghe hay nơi diễn ra cuộc trò chuyện. Trong chữ viết tiếng Anh, từ rất ngắn ấy luôn xuất hiện bằng chữ hoa I.',
  id: 'I tidak melekat selamanya pada satu orang; kata ini mengikuti mikrofon khayalan. Saat kamu berbicara, I berarti “saya” dan menunjuk dirimu. Ketika lawan bicara mengambil giliran, I miliknya menunjuk dirinya sendiri. Jadi I selalu menunjuk orang yang sedang berbicara, bukan orang yang mendengarkan dan bukan tempat percakapan. Dalam tulisan bahasa Inggris, kata pendek ini selalu tampil sebagai huruf besar I.',
  tr: 'I sonsuza kadar tek bir kişiye ait değildir; hayalî mikrofon kimdeyse onunla birlikte gider. Siz konuşurken I “ben” demektir ve sizi gösterir. Söz karşı tarafa geçince onun söylediği I artık onu gösterir. Bu yüzden I her zaman o anda konuşan kişiyi gösterir; dinleyeni ya da konuşmanın geçtiği yeri değil. İngilizce yazıda bu kısa sözcük her zaman büyük I biçimindedir.',
  pl: 'I nie należy na stałe do jednej osoby; wędruje razem z wyobrażonym mikrofonem. Gdy mówisz ty, I znaczy „ja” i wskazuje ciebie. Kiedy głos przejmuje rozmówca, jego I wskazuje już jego. Dlatego I zawsze wskazuje osobę, która właśnie mówi, a nie słuchacza ani miejsce rozmowy. W angielskim zapisie to krótkie słowo zawsze ma wielką formę I.',
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
      ru: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' не приклеено к одному человеку навсегда. Оно переходит к тому, у кого сейчас воображаемый микрофон. Говорите вы — ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' означает «я» и указывает на вас. Собеседник забирает реплику — теперь его ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' указывает уже на него. Поэтому это слово всегда называет того, кто сейчас говорит, а не слушателя и не место разговора. На письме форма всегда заглавная: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' не належить одній людині назавжди. Воно переходить до того, в кого зараз уявний мікрофон. Говорите ви — ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' означає «я» і вказує на вас. Співрозмовник бере слово — його ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' вже вказує на нього. Тому це слово завжди називає того, хто зараз говорить, а не слухача і не місце розмови. На письмі форма завжди велика: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'La palabra ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' no pertenece para siempre a una sola persona: viaja con el micrófono imaginario. Si hablas tú, ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' significa «yo» y te señala a ti. Cuando otra persona toma la palabra, su ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' pasa a señalarla a ella. Por eso nombra siempre a quien está hablando, y no al que escucha ni al lugar de la conversación. En inglés siempre se escribe con mayúscula: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A palavra ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' não pertence para sempre a uma pessoa: acompanha o microfone imaginário. Quando você fala, ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' significa «eu» e aponta para você. Quando a outra pessoa toma a palavra, o ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' dela passa a apontar para ela. Portanto, nomeia sempre quem está falando, e não quem escuta nem o lugar da conversa. Na escrita inglesa a forma é sempre maiúscula: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Từ ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' không gắn vĩnh viễn với một người; nó đi theo chiếc micro tưởng tượng. Khi bạn đang nói, ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' mang nghĩa “tôi” và chỉ chính bạn. Khi người đối diện cất lời, ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' của họ lại chỉ họ. Vì thế từ này luôn chỉ người đang nói, chứ không phải người nghe hay nơi diễn ra cuộc trò chuyện. Trong chữ viết tiếng Anh, từ ấy luôn viết hoa: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Kata ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' tidak melekat selamanya pada satu orang; kata ini mengikuti mikrofon khayalan. Saat kamu berbicara, ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' berarti “saya” dan menunjuk dirimu. Ketika lawan bicara mengambil giliran, ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' miliknya menunjuk dirinya sendiri. Jadi kata ini selalu menunjuk orang yang sedang berbicara, bukan orang yang mendengarkan dan bukan tempat percakapan. Dalam tulisan bahasa Inggris bentuknya selalu huruf besar: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Sözcük ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' sonsuza kadar tek bir kişiye ait değildir; hayalî mikrofon kimdeyse onunla birlikte gider. Siz konuşurken ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' “ben” demektir ve sizi gösterir. Söz karşı tarafa geçince onun ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' sözcüğü artık onu gösterir. Bu yüzden bu sözcük her zaman o anda konuşan kişiyi gösterir; dinleyeni ya da konuşmanın geçtiği yeri değil. İngilizce yazıda biçim her zaman büyüktür: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      pl: R({ text: 'Słowo ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' nie należy na stałe do jednej osoby; wędruje razem z wyobrażonym mikrofonem. Gdy mówisz ty, ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' znaczy „ja” i wskazuje ciebie. Kiedy głos przejmuje rozmówca, jego ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: ' wskazuje już jego. Dlatego zawsze wskazuje osobę, która właśnie mówi, a nie słuchacza ani miejsce rozmowy. W angielskim zapisie forma jest zawsze wielka: ', semantic: 'explanation' }, { text: 'I', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({ ru: 'Кого называет I, когда говорите вы?', uk: 'Кого називає I, коли говорите ви?', es: '¿A quién nombra I cuando hablas tú?', 'pt-BR': 'Quem I nomeia quando você está falando?', vi: 'I chỉ ai khi chính bạn đang nói?', id: 'Siapa yang ditunjuk I saat kamu sedang berbicara?', tr: 'Siz konuşurken I kimi gösterir?', pl: 'Kogo oznacza I, gdy mówisz ty?' }),
      choices: [
        L({ ru: 'Того, кто сейчас говорит', uk: 'Того, хто зараз говорить', es: 'A quien está hablando', 'pt-BR': 'Quem está falando', vi: 'Người đang nói', id: 'Orang yang sedang berbicara', tr: 'O anda konuşan kişiyi', pl: 'Osobę, która właśnie mówi' }),
        L({ ru: 'Того, кто сейчас слушает', uk: 'Того, хто зараз слухає', es: 'A quien está escuchando', 'pt-BR': 'Quem está ouvindo', vi: 'Người đang nghe', id: 'Orang yang sedang mendengarkan', tr: 'O anda dinleyen kişiyi', pl: 'Osobę, która właśnie słucha' }),
        L({ ru: 'Место, где идёт разговор', uk: 'Місце, де триває розмова', es: 'El lugar de la conversación', 'pt-BR': 'O lugar da conversa', vi: 'Nơi cuộc trò chuyện diễn ra', id: 'Tempat percakapan berlangsung', tr: 'Konuşmanın yapıldığı yeri', pl: 'Miejsce, w którym trwa rozmowa' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Верно: того, кто сейчас говорит. I переходит вместе с голосом, поэтому оно указывает на человека с репликой, а не на слушателя и не на место.',
        uk: 'Правильно: того, хто зараз говорить. I переходить разом із голосом, тому вказує на людину з реплікою, а не на слухача і не на місце.',
        es: 'Correcto: a quien está hablando. I viaja con la voz, así que señala a la persona que tiene la palabra, no al oyente ni al lugar.',
        'pt-BR': 'Correto: quem está falando. I acompanha a voz, por isso aponta para a pessoa com a palavra, e não para quem ouve nem para o lugar.',
        vi: 'Đúng: người đang nói. I đi theo giọng nói, nên nó chỉ người đang cầm lời, không phải người nghe hay địa điểm.',
        id: 'Benar: orang yang sedang berbicara. I mengikuti suara, jadi kata itu menunjuk orang yang sedang bicara, bukan pendengar atau tempatnya.',
        tr: 'Doğru: o anda konuşan kişiyi. I sesi izler, bu yüzden sözü elinde tutan kişiyi gösterir; dinleyeni ya da yeri değil.',
        pl: 'Dobrze: osobę, która właśnie mówi. I podąża za głosem, więc wskazuje osobę zabierającą głos, a nie słuchacza ani miejsce.',
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
