import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 9 "Ты есть" / second_person_singular, builtOn: [1], recalls: [3]):
// три страницы concept/formula/trap вводят eres — связку второго лица
// единственного числа, ту же роль что soy (сессия 1) и es (сессия 1), но
// для собеседника. Recall из сессии 3 — bonito/bonita, gender_agreement_full
// уже знаком, здесь он просто переносится на новую связку без изменений.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_09_WORD_FIRST_TITLE = L({
  ru: 'Ты есть',
  uk: 'Ти є',
  es: 'You are',
  'pt-BR': 'Você é',
  vi: 'Bạn là',
  id: 'Kamu adalah',
  tr: 'Sen busun',
  pl: 'Ty jesteś',
});

export const ES_EPISODE_01_SESSION_09_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое слово переносит уже знакомую связку с себя на собеседника — с той же формулой согласования признака.',
  uk: 'Одне нове слово переносить уже знайому зв’язку з себе на співрозмовника — з тією самою формулою узгодження ознаки.',
  es: 'One new word carries the already familiar linking verb from the speaker to the listener, with the same quality-agreement formula.',
  'pt-BR': 'Uma palavra nova transfere a ligação já conhecida de quem fala para o interlocutor, com a mesma fórmula de concordância.',
  vi: 'Một từ mới chuyển từ nối đã quen thuộc từ người nói sang người nghe, với cùng công thức hòa hợp đặc điểm.',
  id: 'Satu kata baru memindahkan kata penghubung yang sudah dikenal dari penutur ke pendengar, dengan rumus kesesuaian sifat yang sama.',
  tr: 'Tek bir yeni kelime, zaten tanıdık olan bağlacı konuşandan dinleyiciye taşır, aynı nitelik uyum formülüyle.',
  pl: 'Jedno nowe słowo przenosi już znany łącznik z mówiącego na słuchacza, z tą samą formułą zgodności cechy.',
});

export const ES_EPISODE_01_SESSION_09_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно построить eres как связку при обращении к собеседнику, отличая её от soy и es.',
  uk: 'Упізнати на слух, зрозуміти й точно побудувати eres як зв’язку при зверненні до співрозмовника, відрізняючи її від soy та es.',
  es: 'Recognize, understand, and correctly build eres as the linking word used when addressing the listener, telling it apart from soy and es.',
  'pt-BR': 'Reconhecer de ouvido, entender e construir corretamente eres como a ligação usada ao falar com o interlocutor, distinguindo-a de soy e es.',
  vi: 'Nghe ra, hiểu và xây dựng đúng eres như từ nối dùng khi nói với người nghe, phân biệt nó với soy và es.',
  id: 'Mengenali dari suara, memahami, dan membangun eres dengan tepat sebagai kata penghubung saat berbicara dengan pendengar, membedakannya dari soy dan es.',
  tr: 'Eres’i dinleyiciyle konuşurken kullanılan bağlaç olarak duyup tanımak, anlamak ve doğru kurmak; soy ve es’ten ayırt etmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zbudować eres jako łącznik używany przy zwracaniu się do słuchacza, odróżniając go od soy i es.',
});

const CONCEPT_BODY = L({
  ru: 'Soy связывает признак с самим говорящим, es связывает признак с предметом или третьим лицом — eres делает то же самое, но для собеседника, к которому обращаются напрямую. Три формы называют одно и то же действие связывания, но каждая закреплена за своим участником разговора: soy только за «я», es только за «он/она/оно», eres только за «ты». Спутать их — значит перепутать, о ком идёт речь: eres без сомнения указывает, что признак относится к слушателю, а не к говорящему или третьему лицу. Именно поэтому при обращении к собеседнику лицом к лицу нужна ровно эта форма — eres, а не soy или es.',
  uk: 'Soy пов’язує ознаку з самим мовцем, es пов’язує ознаку з предметом чи третьою особою — eres робить те саме, але для співрозмовника, до якого звертаються напряму. Три форми називають ту саму дію зв’язування, але кожна закріплена за своїм учасником розмови: soy тільки за «я», es тільки за «він/вона/воно», eres тільки за «ти». Сплутати їх — означає переплутати, про кого йдеться: eres без сумніву вказує, що ознака стосується слухача, а не мовця чи третьої особи. Саме тому при зверненні до співрозмовника обличчям до обличчя потрібна рівно ця форма — eres, а не soy чи es.',
  es: 'Soy links a quality to the speaker, es links a quality to a thing or a third person — eres does the same, but for the listener being addressed directly. The three forms name the same linking action, but each is tied to its own participant in the conversation: soy only for "I", es only for "he/she/it", eres only for "you". Confusing them means confusing who is being talked about: eres unmistakably marks that the quality belongs to the listener, not to the speaker or a third person. That is why addressing the listener face to face needs exactly this form — eres, not soy or es.',
  'pt-BR': 'Soy liga uma qualidade a quem fala, es liga uma qualidade a uma coisa ou terceira pessoa — eres faz o mesmo, mas para o interlocutor a quem se fala diretamente. As três formas nomeiam a mesma ação de ligar, mas cada uma está presa ao seu próprio participante da conversa: soy só para "eu", es só para "ele/ela", eres só para "você". Confundi-las significa confundir de quem se está falando: eres marca sem dúvida que a qualidade pertence ao ouvinte, não a quem fala nem a uma terceira pessoa. Por isso falar com o interlocutor cara a cara precisa exatamente dessa forma — eres, não soy ou es.',
  vi: 'Soy nối một đặc điểm với người nói, es nối một đặc điểm với một vật hay ngôi thứ ba — eres làm điều tương tự, nhưng cho người nghe được nói tới trực tiếp. Ba dạng này gọi cùng một hành động nối, nhưng mỗi dạng gắn với người tham gia hội thoại riêng: soy chỉ cho "tôi", es chỉ cho "anh ấy/cô ấy/nó", eres chỉ cho "bạn". Nhầm lẫn chúng nghĩa là nhầm lẫn về việc đang nói đến ai: eres chắc chắn đánh dấu rằng đặc điểm thuộc về người nghe, không phải người nói hay ngôi thứ ba. Đó là lý do nói với người nghe trực diện cần chính xác dạng này — eres, không phải soy hay es.',
  id: 'Soy menghubungkan sifat dengan penutur, es menghubungkan sifat dengan benda atau orang ketiga — eres melakukan hal yang sama, tetapi untuk pendengar yang diajak bicara langsung. Ketiga bentuk ini menyebut tindakan menghubungkan yang sama, tetapi masing-masing terikat pada peserta percakapannya sendiri: soy hanya untuk "saya", es hanya untuk "dia", eres hanya untuk "kamu". Mengacaukannya berarti mengacaukan siapa yang sedang dibicarakan: eres jelas menandai bahwa sifat itu milik pendengar, bukan penutur atau orang ketiga. Itulah sebabnya berbicara dengan pendengar tatap muka memerlukan tepat bentuk ini — eres, bukan soy atau es.',
  tr: 'Soy bir niteliği konuşanla bağlar, es bir niteliği bir şey ya da üçüncü kişiyle bağlar — eres de aynısını yapar, ama doğrudan konuşulan dinleyici için. Üç biçim de aynı bağlama eylemini adlandırır, ama her biri konuşmanın kendi katılımcısına bağlıdır: soy yalnızca "ben" için, es yalnızca "o" için, eres yalnızca "sen" için. Onları karıştırmak, kimden bahsedildiğini karıştırmak demektir: eres, niteliğin konuşana ya da üçüncü kişiye değil dinleyiciye ait olduğunu kuşkusuz işaretler. Bu yüzden dinleyiciyle yüz yüze konuşmak tam olarak bu biçimi gerektirir — eres, soy ya da es değil.',
  pl: 'Soy łączy cechę z mówiącym, es łączy cechę z rzeczą lub trzecią osobą — eres robi to samo, ale dla słuchacza, do którego mówi się bezpośrednio. Trzy formy nazywają tę samą czynność łączenia, ale każda jest przypisana do innego uczestnika rozmowy: soy tylko dla „ja”, es tylko dla „on/ona/ono”, eres tylko dla „ty”. Pomylenie ich oznacza pomylenie, o kim mowa: eres bez wątpienia oznacza, że cecha należy do słuchacza, a nie do mówiącego czy trzeciej osoby. Dlatego zwracanie się do słuchacza twarzą w twarz wymaga dokładnie tej formy — eres, a nie soy czy es.',
});

const FORMULA_BODY = L({
  ru: 'Формула согласования признака работает точно так же, как и с soy или es: концовка -o для собеседника мужского рода, концовка -a для собеседницы. Eres bonito обращается к мужчине, eres bonita — к женщине, и разница только в последней букве признака, сама связка eres не меняется никогда. Ответ прост: eres не имеет своей мужской или женской формы — род выражает только прилагательное после неё. Так же согласование работало с bonito/bonita и связкой es, только тогда речь шла о предмете или третьем лице, а не о собеседнике. Только концовка признака меняется между двумя фразами.',
  uk: 'Формула узгодження ознаки працює точно так само, як і з soy чи es: закінчення -o для співрозмовника чоловічого роду, закінчення -a для співрозмовниці. Eres bonito звертається до чоловіка, eres bonita — до жінки, і різниця лише в останній літері ознаки, сама зв’язка eres не змінюється ніколи. Відповідь проста: eres не має своєї чоловічої чи жіночої форми — рід виражає тільки прикметник після неї. Так само узгодження працювало з bonito/bonita і зв’язкою es, тільки тоді йшлося про предмет чи третю особу, а не про співрозмовника. Тільки закінчення ознаки змінюється між двома фразами.',
  es: 'The quality-agreement formula works exactly as it did with soy or es: the ending -o for a masculine listener, the ending -a for a feminine listener. Eres bonito addresses a man, eres bonita addresses a woman, and the only difference is the last letter of the quality — the linking word eres itself never changes. The answer is simple: eres has no masculine or feminine form of its own — only the adjective after it expresses gender. The agreement worked the same way with bonito/bonita and the linking word es, only back then it was about a thing or a third person, not about the listener. Only the ending of the quality changes between the two phrases.',
  'pt-BR': 'A fórmula de concordância da qualidade funciona exatamente como com soy ou es: a terminação -o para um interlocutor masculino, a terminação -a para uma interlocutora feminina. Eres bonito fala com um homem, eres bonita fala com uma mulher, e a única diferença é a última letra da qualidade — a ligação eres em si nunca muda. A resposta é simples: eres não tem forma masculina ou feminina própria — só o adjetivo depois dela expressa o gênero. A concordância funcionava do mesmo jeito com bonito/bonita e a ligação es, só que ali era sobre uma coisa ou terceira pessoa, não sobre o interlocutor. Só a terminação da qualidade muda entre as duas frases.',
  vi: 'Công thức hòa hợp đặc điểm hoạt động y hệt như với soy hay es: đuôi -o cho người nghe giống đực, đuôi -a cho người nghe giống cái. Eres bonito nói với một người đàn ông, eres bonita nói với một người phụ nữ, và khác biệt duy nhất là chữ cái cuối của đặc điểm — bản thân từ nối eres không bao giờ thay đổi. Câu trả lời rất đơn giản: eres không có dạng giống đực hay giống cái riêng — chỉ tính từ đứng sau nó thể hiện giống. Sự hòa hợp hoạt động tương tự với bonito/bonita và từ nối es, chỉ khác là lúc đó nói về một vật hay ngôi thứ ba, không phải người nghe. Chỉ đuôi của đặc điểm thay đổi giữa hai câu.',
  id: 'Rumus kesesuaian sifat bekerja persis seperti dengan soy atau es: akhiran -o untuk pendengar maskulin, akhiran -a untuk pendengar feminin. Eres bonito berbicara dengan seorang pria, eres bonita berbicara dengan seorang wanita, dan satu-satunya beda adalah huruf terakhir dari sifat itu — kata penghubung eres tidak pernah berubah. Jawabannya sederhana: eres tidak memiliki bentuk maskulin atau feminin sendiri — hanya kata sifat setelahnya yang mengungkapkan gender. Kesesuaian bekerja dengan cara yang sama dengan bonito/bonita dan kata penghubung es, hanya saja saat itu tentang benda atau orang ketiga, bukan tentang pendengar. Hanya akhiran sifatnya yang berubah di antara kedua frasa.',
  tr: 'Nitelik uyum formülü tıpkı soy veya es’teki gibi çalışır: eril bir dinleyici için -o son eki, dişil bir dinleyici için -a son eki. Eres bonito bir erkeğe, eres bonita bir kadına seslenir, ve tek fark niteliğin son harfidir — bağlacın kendisi olan eres asla değişmez. Cevap basittir: eres’in kendine ait eril ya da dişil bir biçimi yoktur — cinsiyeti yalnızca ondan sonraki sıfat ifade eder. Uyum, bonito/bonita ve es bağlacıyla da aynı şekilde çalışıyordu, sadece o zaman dinleyici değil bir şey ya da üçüncü kişi söz konusuydu. Sadece niteliğin sonu iki ifade arasında değişir.',
  pl: 'Formuła zgodności cechy działa dokładnie tak samo jak z soy czy es: końcówka -o dla słuchacza rodzaju męskiego, końcówka -a dla słuchaczki. Eres bonito zwraca się do mężczyzny, eres bonita do kobiety, a jedyna różnica to ostatnia litera cechy — sam łącznik eres nigdy się nie zmienia. Odpowiedź jest prosta: eres nie ma własnej formy męskiej ani żeńskiej — rodzaj wyraża tylko przymiotnik po nim. Zgodność działała tak samo z bonito/bonita i łącznikiem es, tylko wtedy chodziło o rzecz lub trzecią osobę, a nie o słuchacza. Tylko końcówka cechy zmienia się między dwiema frazami.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — сказать Es bonito собеседнику, глядя ему в глаза, вместо Eres bonito: es годится только для предмета или третьего лица, а не для того, кто стоит напротив и слушает. Вторая ловушка — Soy bonito вместо Eres bonito: soy рассказывает о себе самом, а не о собеседнике, поэтому им нельзя оценить чужую внешность. Проверка простая: если признак адресован человеку напротив, напрямую, нужна именно eres — ни es, ни soy сюда не подходят. Запомнить легко через контраст: soy смотрит внутрь на себя, es смотрит в сторону, eres смотрит прямо в глаза собеседнику.',
  uk: 'Найчастіша помилка — сказати Es bonito співрозмовнику, дивлячись йому в очі, замість Eres bonito: es годиться тільки для предмета чи третьої особи, а не для того, хто стоїть навпроти й слухає. Друга пастка — Soy bonito замість Eres bonito: soy розповідає про себе самого, а не про співрозмовника, тому ним не можна оцінити чужу зовнішність. Перевірка проста: якщо ознака адресована людині навпроти, напряму, потрібна саме eres — ні es, ні soy сюди не підходять. Запам’ятати легко через контраст: soy дивиться всередину на себе, es дивиться вбік, eres дивиться прямо в очі співрозмовнику.',
  es: 'The most common mistake is saying Es bonito to the listener, looking them in the eyes, instead of Eres bonito: es only fits a thing or a third person, not the one standing across from you and listening. The second trap is Soy bonito instead of Eres bonito: soy talks about the speaker themselves, not about the listener, so it cannot judge someone else\'s looks. The check is simple: if the quality is addressed to the person across from you, directly, exactly eres is needed — neither es nor soy fit here. It is easy to remember through contrast: soy looks inward at the speaker, es looks sideways at something else, eres looks straight into the listener\'s eyes.',
  'pt-BR': 'O erro mais comum é dizer Es bonito ao interlocutor, olhando nos olhos dele, em vez de Eres bonito: es só cabe para uma coisa ou terceira pessoa, não para quem está à frente ouvindo. A segunda armadilha é Soy bonito em vez de Eres bonito: soy fala sobre quem fala, não sobre o interlocutor, então não pode julgar a aparência de outra pessoa. A checagem é simples: se a qualidade é dirigida à pessoa à frente, diretamente, é exatamente eres que se precisa — nem es nem soy cabem aqui. É fácil lembrar pelo contraste: soy olha para dentro, para quem fala, es olha para o lado, eres olha direto nos olhos do interlocutor.',
  vi: 'Lỗi phổ biến nhất là nói Es bonito với người nghe, nhìn thẳng vào mắt họ, thay vì Eres bonito: es chỉ phù hợp với một vật hay ngôi thứ ba, không phải người đang đứng đối diện và lắng nghe. Cái bẫy thứ hai là Soy bonito thay vì Eres bonito: soy nói về chính người nói, không phải về người nghe, nên không thể dùng để đánh giá ngoại hình người khác. Cách kiểm tra đơn giản: nếu đặc điểm hướng tới người đối diện, trực tiếp, cần chính xác eres — cả es lẫn soy đều không phù hợp ở đây. Dễ nhớ qua sự đối lập: soy nhìn vào trong chính mình, es nhìn sang bên, eres nhìn thẳng vào mắt người nghe.',
  id: 'Kesalahan paling umum adalah mengatakan Es bonito kepada pendengar, menatap matanya, alih-alih Eres bonito: es hanya cocok untuk benda atau orang ketiga, bukan untuk orang yang berdiri di depan dan mendengarkan. Jebakan kedua adalah Soy bonito alih-alih Eres bonito: soy berbicara tentang penutur sendiri, bukan tentang pendengar, jadi tidak bisa menilai penampilan orang lain. Pengecekannya sederhana: jika sifat itu ditujukan kepada orang di depan, secara langsung, yang diperlukan tepat eres — baik es maupun soy tidak cocok di sini. Mudah diingat lewat kontras: soy melihat ke dalam diri sendiri, es melihat ke samping, eres menatap langsung ke mata pendengar.',
  tr: 'En yaygın hata, dinleyiciye gözlerinin içine bakarak Eres bonito yerine Es bonito demektir: es yalnızca bir şey ya da üçüncü kişi için uygundur, karşınızda durup dinleyen kişi için değil. İkinci tuzak, Eres bonito yerine Soy bonito’dur: soy konuşanın kendisinden bahseder, dinleyiciden değil, bu yüzden başkasının görünümünü değerlendiremez. Kontrol basittir: nitelik karşınızdaki kişiye doğrudan yöneltiliyorsa, tam olarak eres gerekir — ne es ne de soy buraya uyar. Karşıtlıkla hatırlamak kolaydır: soy içe, konuşana bakar, es yana bakar, eres doğrudan dinleyicinin gözlerine bakar.',
  pl: 'Najczęstszy błąd to powiedzieć Es bonito do słuchacza, patrząc mu w oczy, zamiast Eres bonito: es pasuje tylko do rzeczy lub trzeciej osoby, a nie do kogoś, kto stoi naprzeciwko i słucha. Druga pułapka to Soy bonito zamiast Eres bonito: soy mówi o samym mówiącym, a nie o słuchaczu, więc nie można nim ocenić czyjegoś wyglądu. Sprawdzenie jest proste: jeśli cecha jest skierowana do osoby naprzeciwko, bezpośrednio, potrzebne jest dokładnie eres — ani es, ani soy tu nie pasują. Łatwo zapamiętać przez kontrast: soy patrzy do wewnątrz na mówiącego, es patrzy w bok, eres patrzy prosto w oczy słuchacza.',
});

export const ES_EPISODE_01_SESSION_09_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Связка для собеседника',
      uk: 'Зв’язка для співрозмовника',
      es: 'The linking word for the listener',
      'pt-BR': 'A ligação para o interlocutor',
      vi: 'Từ nối cho người nghe',
      id: 'Kata penghubung untuk pendengar',
      tr: 'Dinleyici için bağlaç',
      pl: 'Łącznik dla słuchacza',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Soy связывает признак с самим говорящим, es связывает признак с предметом или третьим лицом — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' делает то же самое, но для собеседника, к которому обращаются напрямую. Три формы называют одно и то же действие связывания, но каждая закреплена за своим участником разговора: soy только за «я», es только за «он/она/оно», eres только за «ты». Спутать их — значит перепутать, о ком идёт речь: eres без сомнения указывает, что признак относится к слушателю, а не к говорящему или третьему лицу. Именно поэтому при обращении к собеседнику лицом к лицу нужна ровно эта форма — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ', а не soy или es.', semantic: 'explanation' }),
      uk: R({ text: 'Soy пов’язує ознаку з самим мовцем, es пов’язує ознаку з предметом чи третьою особою — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' робить те саме, але для співрозмовника, до якого звертаються напряму. Три форми називають ту саму дію зв’язування, але кожна закріплена за своїм учасником розмови: soy тільки за «я», es тільки за «він/вона/воно», eres тільки за «ти». Сплутати їх — означає переплутати, про кого йдеться: eres без сумніву вказує, що ознака стосується слухача, а не мовця чи третьої особи. Саме тому при зверненні до співрозмовника обличчям до обличчя потрібна рівно ця форма — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ', а не soy чи es.', semantic: 'explanation' }),
      es: R({ text: 'Soy links a quality to the speaker, es links a quality to a thing or a third person — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' does the same, but for the listener being addressed directly. The three forms name the same linking action, but each is tied to its own participant in the conversation: soy only for "I", es only for "he/she/it", eres only for "you". Confusing them means confusing who is being talked about: eres unmistakably marks that the quality belongs to the listener, not to the speaker or a third person. That is why addressing the listener face to face needs exactly this form — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ', not soy or es.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Soy liga uma qualidade a quem fala, es liga uma qualidade a uma coisa ou terceira pessoa — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' faz o mesmo, mas para o interlocutor a quem se fala diretamente. As três formas nomeiam a mesma ação de ligar, mas cada uma está presa ao seu próprio participante da conversa: soy só para "eu", es só para "ele/ela", eres só para "você". Confundi-las significa confundir de quem se está falando: eres marca sem dúvida que a qualidade pertence ao ouvinte, não a quem fala nem a uma terceira pessoa. Por isso falar com o interlocutor cara a cara precisa exatamente dessa forma — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ', não soy ou es.', semantic: 'explanation' }),
      vi: R({ text: 'Soy nối một đặc điểm với người nói, es nối một đặc điểm với một vật hay ngôi thứ ba — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' làm điều tương tự, nhưng cho người nghe được nói tới trực tiếp. Ba dạng này gọi cùng một hành động nối, nhưng mỗi dạng gắn với người tham gia hội thoại riêng: soy chỉ cho "tôi", es chỉ cho "anh ấy/cô ấy/nó", eres chỉ cho "bạn". Nhầm lẫn chúng nghĩa là nhầm lẫn về việc đang nói đến ai: eres chắc chắn đánh dấu rằng đặc điểm thuộc về người nghe, không phải người nói hay ngôi thứ ba. Đó là lý do nói với người nghe trực diện cần chính xác dạng này — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ', không phải soy hay es.', semantic: 'explanation' }),
      id: R({ text: 'Soy menghubungkan sifat dengan penutur, es menghubungkan sifat dengan benda atau orang ketiga — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' melakukan hal yang sama, tetapi untuk pendengar yang diajak bicara langsung. Ketiga bentuk ini menyebut tindakan menghubungkan yang sama, tetapi masing-masing terikat pada peserta percakapannya sendiri: soy hanya untuk "saya", es hanya untuk "dia", eres hanya untuk "kamu". Mengacaukannya berarti mengacaukan siapa yang sedang dibicarakan: eres jelas menandai bahwa sifat itu milik pendengar, bukan penutur atau orang ketiga. Itulah sebabnya berbicara dengan pendengar tatap muka memerlukan tepat bentuk ini — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ', bukan soy atau es.', semantic: 'explanation' }),
      tr: R({ text: 'Soy bir niteliği konuşanla bağlar, es bir niteliği bir şey ya da üçüncü kişiyle bağlar — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' de aynısını yapar, ama doğrudan konuşulan dinleyici için. Üç biçim de aynı bağlama eylemini adlandırır, ama her biri konuşmanın kendi katılımcısına bağlıdır: soy yalnızca "ben" için, es yalnızca "o" için, eres yalnızca "sen" için. Onları karıştırmak, kimden bahsedildiğini karıştırmak demektir: eres, niteliğin konuşana ya da üçüncü kişiye değil dinleyiciye ait olduğunu kuşkusuz işaretler. Bu yüzden dinleyiciyle yüz yüze konuşmak tam olarak bu biçimi gerektirir — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ', soy ya da es değil.', semantic: 'explanation' }),
      pl: R({ text: 'Soy łączy cechę z mówiącym, es łączy cechę z rzeczą lub trzecią osobą — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ' robi to samo, ale dla słuchacza, do którego mówi się bezpośrednio. Trzy formy nazywają tę samą czynność łączenia, ale każda jest przypisana do innego uczestnika rozmowy: soy tylko dla „ja”, es tylko dla „on/ona/ono”, eres tylko dla „ty”. Pomylenie ich oznacza pomylenie, o kim mowa: eres bez wątpienia oznacza, że cecha należy do słuchacza, a nie do mówiącego czy trzeciej osoby. Dlatego zwracanie się do słuchacza twarzą w twarz wymaga dokładnie tej formy — ', semantic: 'explanation' }, { text: 'eres', semantic: 'targetCorrect' }, { text: ', a nie soy czy es.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какая связка нужна, чтобы напрямую обратиться к собеседнику?',
        uk: 'Яка зв’язка потрібна, щоб напряму звернутися до співрозмовника?',
        es: 'Which linking word is needed to address the listener directly?',
        'pt-BR': 'Qual ligação é necessária para falar diretamente com o interlocutor?',
        vi: 'Từ nối nào cần để nói trực tiếp với người nghe?',
        id: 'Kata penghubung mana yang diperlukan untuk berbicara langsung dengan pendengar?',
        tr: 'Dinleyiciyle doğrudan konuşmak için hangi bağlaç gerekir?',
        pl: 'Jaki łącznik jest potrzebny, aby zwrócić się bezpośrednio do słuchacza?',
      }),
      choices: [
        L({ ru: 'eres', uk: 'eres', es: 'eres', 'pt-BR': 'eres', vi: 'eres', id: 'eres', tr: 'eres', pl: 'eres' }),
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Eres нужна, потому что она закреплена именно за собеседником. Soy говорит о себе самом, а es — о предмете или третьем лице, ни то ни другое не подходит для прямого обращения.',
        uk: 'Eres потрібна, бо вона закріплена саме за співрозмовником. Soy говорить про себе самого, а es — про предмет чи третю особу, ні те ні інше не підходить для прямого звернення.',
        es: 'Eres is needed because it is tied exactly to the listener. Soy talks about the speaker themselves, and es is about a thing or a third person — neither fits a direct address.',
        'pt-BR': 'Eres é necessária porque está presa exatamente ao interlocutor. Soy fala sobre quem fala, e es é sobre uma coisa ou terceira pessoa — nenhuma das duas cabe para um endereçamento direto.',
        vi: 'Eres cần thiết vì nó gắn chính xác với người nghe. Soy nói về chính người nói, còn es nói về vật hay ngôi thứ ba — cả hai đều không phù hợp để nói trực tiếp.',
        id: 'Eres diperlukan karena terikat tepat pada pendengar. Soy berbicara tentang penutur sendiri, dan es tentang benda atau orang ketiga — keduanya tidak cocok untuk sapaan langsung.',
        tr: 'Eres gereklidir çünkü tam olarak dinleyiciye bağlıdır. Soy konuşanın kendisinden bahseder, es ise bir şey ya da üçüncü kişi hakkındadır — ikisi de doğrudan hitap için uygun değildir.',
        pl: 'Eres jest potrzebne, ponieważ jest przypisane dokładnie do słuchacza. Soy mówi o samym mówiącym, a es o rzeczy lub trzeciej osobie — żadne z nich nie pasuje do bezpośredniego zwrotu.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Eres не меняется, меняется признак',
      uk: 'Eres не змінюється, змінюється ознака',
      es: 'Eres does not change, the quality does',
      'pt-BR': 'Eres não muda, a qualidade muda',
      vi: 'Eres không đổi, đặc điểm mới đổi',
      id: 'Eres tidak berubah, sifatnya yang berubah',
      tr: 'Eres değişmez, değişen niteliktir',
      pl: 'Eres się nie zmienia, zmienia się cecha',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула согласования признака работает точно так же, как и с soy или es: концовка -o для собеседника мужского рода, концовка -a для собеседницы. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' обращается к мужчине, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' — к женщине, и разница только в последней букве признака, сама связка eres не меняется никогда. Ответ прост: eres не имеет своей мужской или женской формы — род выражает только прилагательное после неё. Так же согласование работало с bonito/bonita и связкой es, только тогда речь шла о предмете или третьем лице, а не о собеседнике. Только концовка признака меняется между двумя фразами.', semantic: 'explanation' }),
      uk: R({ text: 'Формула узгодження ознаки працює точно так само, як і з soy чи es: закінчення -o для співрозмовника чоловічого роду, закінчення -a для співрозмовниці. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' звертається до чоловіка, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' — до жінки, і різниця лише в останній літері ознаки, сама зв’язка eres не змінюється ніколи. Відповідь проста: eres не має своєї чоловічої чи жіночої форми — рід виражає тільки прикметник після неї. Так само узгодження працювало з bonito/bonita і зв’язкою es, тільки тоді йшлося про предмет чи третю особу, а не про співрозмовника. Тільки закінчення ознаки змінюється між двома фразами.', semantic: 'explanation' }),
      es: R({ text: 'The quality-agreement formula works exactly as it did with soy or es: the ending -o for a masculine listener, the ending -a for a feminine listener. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' addresses a man, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' addresses a woman, and the only difference is the last letter of the quality — the linking word eres itself never changes. The answer is simple: eres has no masculine or feminine form of its own — only the adjective after it expresses gender. The agreement worked the same way with bonito/bonita and the linking word es, only back then it was about a thing or a third person, not about the listener. Only the ending of the quality changes between the two phrases.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de concordância da qualidade funciona exatamente como com soy ou es: a terminação -o para um interlocutor masculino, a terminação -a para uma interlocutora feminina. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' fala com um homem, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' fala com uma mulher, e a única diferença é a última letra da qualidade — a ligação eres em si nunca muda. A resposta é simples: eres não tem forma masculina ou feminina própria — só o adjetivo depois dela expressa o gênero. A concordância funcionava do mesmo jeito com bonito/bonita e a ligação es, só que ali era sobre uma coisa ou terceira pessoa, não sobre o interlocutor. Só a terminação da qualidade muda entre as duas frases.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức hòa hợp đặc điểm hoạt động y hệt như với soy hay es: đuôi -o cho người nghe giống đực, đuôi -a cho người nghe giống cái. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' nói với một người đàn ông, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' nói với một người phụ nữ, và khác biệt duy nhất là chữ cái cuối của đặc điểm — bản thân từ nối eres không bao giờ thay đổi. Câu trả lời rất đơn giản: eres không có dạng giống đực hay giống cái riêng — chỉ tính từ đứng sau nó thể hiện giống. Sự hòa hợp hoạt động tương tự với bonito/bonita và từ nối es, chỉ khác là lúc đó nói về một vật hay ngôi thứ ba, không phải người nghe. Chỉ đuôi của đặc điểm thay đổi giữa hai câu.', semantic: 'explanation' }),
      id: R({ text: 'Rumus kesesuaian sifat bekerja persis seperti dengan soy atau es: akhiran -o untuk pendengar maskulin, akhiran -a untuk pendengar feminin. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' berbicara dengan seorang pria, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' berbicara dengan seorang wanita, dan satu-satunya beda adalah huruf terakhir dari sifat itu — kata penghubung eres tidak pernah berubah. Jawabannya sederhana: eres tidak memiliki bentuk maskulin atau feminin sendiri — hanya kata sifat setelahnya yang mengungkapkan gender. Kesesuaian bekerja dengan cara yang sama dengan bonito/bonita dan kata penghubung es, hanya saja saat itu tentang benda atau orang ketiga, bukan tentang pendengar. Hanya akhiran sifatnya yang berubah di antara kedua frasa.', semantic: 'explanation' }),
      tr: R({ text: 'Nitelik uyum formülü tıpkı soy veya es’teki gibi çalışır: eril bir dinleyici için -o son eki, dişil bir dinleyici için -a son eki. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' bir erkeğe, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' bir kadına seslenir, ve tek fark niteliğin son harfidir — bağlacın kendisi olan eres asla değişmez. Cevap basittir: eres’in kendine ait eril ya da dişil bir biçimi yoktur — cinsiyeti yalnızca ondan sonraki sıfat ifade eder. Uyum, bonito/bonita ve es bağlacıyla da aynı şekilde çalışıyordu, sadece o zaman dinleyici değil bir şey ya da üçüncü kişi söz konusuydu. Sadece niteliğin sonu iki ifade arasında değişir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła zgodności cechy działa dokładnie tak samo jak z soy czy es: końcówka -o dla słuchacza rodzaju męskiego, końcówka -a dla słuchaczki. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' zwraca się do mężczyzny, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' do kobiety, a jedyna różnica to ostatnia litera cechy — sam łącznik eres nigdy się nie zmienia. Odpowiedź jest prosta: eres nie ma własnej formy męskiej ani żeńskiej — rodzaj wyraża tylko przymiotnik po nim. Zgodność działała tak samo z bonito/bonita i łącznikiem es, tylko wtedy chodziło o rzecz lub trzecią osobę, a nie o słuchacza. Tylko końcówka cechy zmienia się między dwiema frazami.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что меняется между «Eres bonito» и «Eres bonita»?',
        uk: 'Що змінюється між «Eres bonito» та «Eres bonita»?',
        es: 'What changes between "Eres bonito" and "Eres bonita"?',
        'pt-BR': 'O que muda entre "Eres bonito" e "Eres bonita"?',
        vi: 'Điều gì thay đổi giữa "Eres bonito" và "Eres bonita"?',
        id: 'Apa yang berubah antara "Eres bonito" dan "Eres bonita"?',
        tr: '"Eres bonito" ile "Eres bonita" arasında ne değişir?',
        pl: 'Co się zmienia między „Eres bonito” a „Eres bonita”?',
      }),
      choices: [
        L({ ru: 'Только концовка признака', uk: 'Тільки закінчення ознаки', es: 'Only the ending of the quality', 'pt-BR': 'Só a terminação da qualidade', vi: 'Chỉ đuôi của đặc điểm', id: 'Hanya akhiran sifatnya', tr: 'Sadece niteliğin sonu', pl: 'Tylko końcówka cechy' }),
        L({ ru: 'Сама связка eres', uk: 'Сама зв’язка eres', es: 'The linking word eres itself', 'pt-BR': 'A própria ligação eres', vi: 'Bản thân từ nối eres', id: 'Kata penghubung eres itu sendiri', tr: 'Bağlacın kendisi olan eres', pl: 'Sam łącznik eres' }),
        L({ ru: 'Порядок слов во фразе', uk: 'Порядок слів у фразі', es: 'The word order in the phrase', 'pt-BR': 'A ordem das palavras na frase', vi: 'Trật tự từ trong câu', id: 'Urutan kata dalam frasa', tr: 'İfadedeki kelime sırası', pl: 'Kolejność słów we frazie' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Меняется только концовка признака — eres остаётся неизменной в обеих фразах, потому что она отмечает лицо собеседника, а не его род.',
        uk: 'Змінюється лише закінчення ознаки — eres лишається незмінною в обох фразах, бо вона позначає особу співрозмовника, а не його рід.',
        es: 'Only the ending of the quality changes — eres stays unchanged in both phrases because it marks the person of the listener, not their gender.',
        'pt-BR': 'Só a terminação da qualidade muda — eres permanece inalterada nas duas frases porque marca a pessoa do interlocutor, não seu gênero.',
        vi: 'Chỉ đuôi của đặc điểm thay đổi — eres không đổi trong cả hai câu vì nó đánh dấu ngôi của người nghe, không phải giống của họ.',
        id: 'Hanya akhiran sifatnya yang berubah — eres tetap tidak berubah di kedua frasa karena menandai orang pendengar, bukan gendernya.',
        tr: 'Yalnızca niteliğin sonu değişir — eres her iki ifadede de değişmeden kalır çünkü dinleyicinin cinsiyetini değil kişisini işaretler.',
        pl: 'Zmienia się tylko końcówka cechy — eres pozostaje niezmienione w obu frazach, ponieważ oznacza osobę słuchacza, a nie jego rodzaj.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не es и не soy — только eres',
      uk: 'Не es і не soy — тільки eres',
      es: 'Not es, not soy — only eres',
      'pt-BR': 'Nem es, nem soy — só eres',
      vi: 'Không phải es, không phải soy — chỉ eres',
      id: 'Bukan es, bukan soy — hanya eres',
      tr: 'Ne es ne de soy — sadece eres',
      pl: 'Nie es, nie soy — tylko eres',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — сказать ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' собеседнику, глядя ему в глаза, вместо ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': es годится только для предмета или третьего лица, а не для того, кто стоит напротив и слушает. Вторая ловушка — ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': soy рассказывает о себе самом, а не о собеседнике, поэтому им нельзя оценить чужую внешность. Проверка простая: если признак адресован человеку напротив, напрямую, нужна именно eres — ни es, ни soy сюда не подходят. Запомнить легко через контраст: soy смотрит внутрь на себя, es смотрит в сторону, eres смотрит прямо в глаза собеседнику.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — сказати ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' співрозмовнику, дивлячись йому в очі, замість ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': es годиться тільки для предмета чи третьої особи, а не для того, хто стоїть навпроти й слухає. Друга пастка — ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': soy розповідає про себе самого, а не про співрозмовника, тому ним не можна оцінити чужу зовнішність. Перевірка проста: якщо ознака адресована людині навпроти, напряму, потрібна саме eres — ні es, ні soy сюди не підходять. Запам’ятати легко через контраст: soy дивиться всередину на себе, es дивиться вбік, eres дивиться прямо в очі співрозмовнику.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is saying ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' to the listener, looking them in the eyes, instead of ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': es only fits a thing or a third person, not the one standing across from you and listening. The second trap is ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': soy talks about the speaker themselves, not about the listener, so it cannot judge someone else\'s looks. The check is simple: if the quality is addressed to the person across from you, directly, exactly eres is needed — neither es nor soy fit here. It is easy to remember through contrast: soy looks inward at the speaker, es looks sideways at something else, eres looks straight into the listener\'s eyes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é dizer ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' ao interlocutor, olhando nos olhos dele, em vez de ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': es só cabe para uma coisa ou terceira pessoa, não para quem está à frente ouvindo. A segunda armadilha é ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': soy fala sobre quem fala, não sobre o interlocutor, então não pode julgar a aparência de outra pessoa. A checagem é simples: se a qualidade é dirigida à pessoa à frente, diretamente, é exatamente eres que se precisa — nem es nem soy cabem aqui. É fácil lembrar pelo contraste: soy olha para dentro, para quem fala, es olha para o lado, eres olha direto nos olhos do interlocutor.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là nói ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' với người nghe, nhìn thẳng vào mắt họ, thay vì ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': es chỉ phù hợp với một vật hay ngôi thứ ba, không phải người đang đứng đối diện và lắng nghe. Cái bẫy thứ hai là ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': soy nói về chính người nói, không phải về người nghe, nên không thể dùng để đánh giá ngoại hình người khác. Cách kiểm tra đơn giản: nếu đặc điểm hướng tới người đối diện, trực tiếp, cần chính xác eres — cả es lẫn soy đều không phù hợp ở đây. Dễ nhớ qua sự đối lập: soy nhìn vào trong chính mình, es nhìn sang bên, eres nhìn thẳng vào mắt người nghe.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah mengatakan ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' kepada pendengar, menatap matanya, alih-alih ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': es hanya cocok untuk benda atau orang ketiga, bukan untuk orang yang berdiri di depan dan mendengarkan. Jebakan kedua adalah ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': soy berbicara tentang penutur sendiri, bukan tentang pendengar, jadi tidak bisa menilai penampilan orang lain. Pengecekannya sederhana: jika sifat itu ditujukan kepada orang di depan, secara langsung, yang diperlukan tepat eres — baik es maupun soy tidak cocok di sini. Mudah diingat lewat kontras: soy melihat ke dalam diri sendiri, es melihat ke samping, eres menatap langsung ke mata pendengar.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, dinleyiciye gözlerinin içine bakarak ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' demektir: es yalnızca bir şey ya da üçüncü kişi için uygundur, karşınızda durup dinleyen kişi için değil. İkinci tuzak, ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: '’dur: soy konuşanın kendisinden bahseder, dinleyiciden değil, bu yüzden başkasının görünümünü değerlendiremez. Kontrol basittir: nitelik karşınızdaki kişiye doğrudan yöneltiliyorsa, tam olarak eres gerekir — ne es ne de soy buraya uyar. Karşıtlıkla hatırlamak kolaydır: soy içe, konuşana bakar, es yana bakar, eres doğrudan dinleyicinin gözlerine bakar.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to powiedzieć ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' do słuchacza, patrząc mu w oczy, zamiast ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': es pasuje tylko do rzeczy lub trzeciej osoby, a nie do kogoś, kto stoi naprzeciwko i słucha. Druga pułapka to ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ': soy mówi o samym mówiącym, a nie o słuchaczu, więc nie można nim ocenić czyjegoś wyglądu. Sprawdzenie jest proste: jeśli cecha jest skierowana do osoby naprzeciwko, bezpośrednio, potrzebne jest dokładnie eres — ani es, ani soy tu nie pasują. Łatwo zapamiętać przez kontrast: soy patrzy do wewnątrz na mówiącego, es patrzy w bok, eres patrzy prosto w oczy słuchacza.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно сказать собеседнику «Ты красивый», глядя ему в глаза?',
        uk: 'Як правильно сказати співрозмовнику «Ти красивий», дивлячись йому в очі?',
        es: 'How do you correctly tell the listener "You are pretty", looking them in the eyes?',
        'pt-BR': 'Como se diz corretamente ao interlocutor "Você é bonito", olhando nos olhos dele?',
        vi: 'Nói đúng với người nghe "Bạn đẹp trai", nhìn thẳng vào mắt họ, như thế nào?',
        id: 'Bagaimana cara mengatakan dengan benar kepada pendengar "Kamu tampan", sambil menatap matanya?',
        tr: 'Dinleyiciye gözlerinin içine bakarak "Sen yakışıklısın" doğru nasıl söylenir?',
        pl: 'Jak poprawnie powiedzieć słuchaczowi „Jesteś przystojny”, patrząc mu w oczy?',
      }),
      choices: [
        L({ ru: 'Eres bonito', uk: 'Eres bonito', es: 'Eres bonito', 'pt-BR': 'Eres bonito', vi: 'Eres bonito', id: 'Eres bonito', tr: 'Eres bonito', pl: 'Eres bonito' }),
        L({ ru: 'Es bonito', uk: 'Es bonito', es: 'Es bonito', 'pt-BR': 'Es bonito', vi: 'Es bonito', id: 'Es bonito', tr: 'Es bonito', pl: 'Es bonito' }),
        L({ ru: 'Soy bonito', uk: 'Soy bonito', es: 'Soy bonito', 'pt-BR': 'Soy bonito', vi: 'Soy bonito', id: 'Soy bonito', tr: 'Soy bonito', pl: 'Soy bonito' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Eres bonito верно, потому что eres закреплена именно за собеседником. Es bonito звучало бы про предмет или третье лицо, а Soy bonito — про самого говорящего.',
        uk: 'Eres bonito правильно, бо eres закріплена саме за співрозмовником. Es bonito звучало б про предмет чи третю особу, а Soy bonito — про самого мовця.',
        es: 'Eres bonito is correct because eres is tied exactly to the listener. Es bonito would sound like it is about a thing or a third person, and Soy bonito would be about the speaker themselves.',
        'pt-BR': 'Eres bonito está correto porque eres está presa exatamente ao interlocutor. Es bonito soaria como sobre uma coisa ou terceira pessoa, e Soy bonito seria sobre quem fala.',
        vi: 'Eres bonito đúng vì eres gắn chính xác với người nghe. Es bonito nghe như nói về một vật hay ngôi thứ ba, còn Soy bonito là về chính người nói.',
        id: 'Eres bonito benar karena eres terikat tepat pada pendengar. Es bonito akan terdengar seperti tentang benda atau orang ketiga, dan Soy bonito tentang penutur sendiri.',
        tr: 'Eres bonito doğrudur çünkü eres tam olarak dinleyiciye bağlıdır. Es bonito bir şey ya da üçüncü kişi hakkındaymış gibi duyulurdu, Soy bonito ise konuşanın kendisi hakkında olurdu.',
        pl: 'Eres bonito jest poprawne, ponieważ eres jest przypisane dokładnie do słuchacza. Es bonito brzmiałoby jak o rzeczy lub trzeciej osobie, a Soy bonito o samym mówiącym.',
      }),
    },
  },
];
