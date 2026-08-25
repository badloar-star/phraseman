import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 29 "Мы не, они не" / builtOn: [2, 25, 27], recalls: [2, 19]): три
// страницы concept/formula/trap показывают, что формула отрицания no +
// связка, знакомая по no soy (сессия 2) и no es (сессия 19), работает без
// изменений и для множественного числа: no встаёт перед somos (сессия 25)
// и перед son (сессия 27) точно так же, признак после связки не меняется
// от самого факта отрицания. Это завершает всю парадигму отрицания связки
// ser по лицам: no soy, no eres, no es, no somos, no son. Новых слов нет.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_29_TITLE = L({
  ru: 'Мы не, они не',
  uk: 'Ми не, вони не',
  es: 'We are not, they are not',
  'pt-BR': 'Não somos, não são',
  vi: 'Chúng tôi không, họ không',
  id: 'Kami tidak, mereka tidak',
  tr: 'Biz değiliz, onlar değil',
  pl: 'Nie jesteśmy, nie są',
});

export const ES_EPISODE_01_SESSION_29_SUMMARY = L({
  ru: 'No + somos и no + son отрицают признак группы — та же формула отрицания, что и в единственном числе, только теперь связка про нескольких.',
  uk: 'No + somos і no + son заперечують ознаку групи — та сама формула заперечення, що й в однині, тільки тепер зв’язка про кількох.',
  es: 'No + somos and no + son negate a group\'s quality — the same negation formula as in the singular, only now the linking word is about several.',
  'pt-BR': 'No + somos e no + son negam uma qualidade do grupo — a mesma fórmula de negação do singular, só que agora a ligação é sobre várias pessoas.',
  vi: 'No + somos và no + son phủ định đặc điểm của nhóm — cùng công thức phủ định như ở số ít, chỉ khác là từ nối giờ nói về nhiều người.',
  id: 'No + somos dan no + son menegasikan sifat kelompok — rumus negasi yang sama seperti tunggal, hanya sekarang kata penghubungnya tentang beberapa orang.',
  tr: 'No + somos ve no + son bir grubun niteliğini olumsuzlar — tekildeki ile aynı olumsuzlama formülü, sadece şimdi bağlaç birkaç kişi hakkında.',
  pl: 'No + somos i no + son zaprzeczają cesze grupy — ta sama formuła przeczenia co w liczbie pojedynczej, tylko teraz łącznik dotyczy kilku osób.',
});

export const ES_EPISODE_01_SESSION_29_GOAL = L({
  ru: 'Уверенно строить отрицания No somos + признак и No son + признак, сохраняя порядок слов и полное согласование по роду и числу.',
  uk: 'Впевнено будувати заперечення No somos + ознака і No son + ознака, зберігаючи порядок слів і повне узгодження за родом і числом.',
  es: 'Confidently build the negations No somos + quality and No son + quality, keeping the word order and full gender and number agreement.',
  'pt-BR': 'Construir com confiança as negações No somos + qualidade e No son + qualidade, mantendo a ordem das palavras e a concordância completa de gênero e número.',
  vi: 'Tự tin xây dựng câu phủ định No somos + đặc điểm và No son + đặc điểm, giữ đúng trật tự từ và hòa hợp đầy đủ về giống và số.',
  id: 'Membangun dengan percaya diri negasi No somos + sifat dan No son + sifat, menjaga urutan kata dan kesesuaian gender serta jumlah secara penuh.',
  tr: 'No somos + nitelik ve No son + nitelik olumsuzlamalarını, kelime sırasını ve tam cinsiyet ile sayı uyumunu koruyarak güvenle kurmak.',
  pl: 'Pewnie budować przeczenia No somos + cecha i No son + cecha, zachowując szyk wyrazów i pełną zgodność rodzaju i liczby.',
});

const CONCEPT_BODY = L({
  ru: 'No somos así, No son así — somos и son уже знакомы, и no перед ними работает точно так же, как no soy и no es раньше. Признак после связки не меняется от отрицания вовсе, независимо от того, идёт ли речь про группу с говорящим (somos) или без него (son): No somos rápidos отрицает темп ровно так же, как No es caro отрицало цену одного предмета. Соединить их просто: no встаёт прямо перед somos или son, а всё остальное устройство фразы остаётся прежним. Ответ прост: формула no + somos/son + признак работает для любой группы, без единого нового слова.',
  uk: 'No somos así, No son así — somos і son вже знайомі, і no перед ними працює точно так само, як no soy і no es раніше. Ознака після зв’язки не змінюється від заперечення взагалі, незалежно від того, чи йдеться про групу з мовцем (somos) чи без нього (son): No somos rápidos заперечує темп рівно так само, як No es caro заперечувало ціну одного предмета. З’єднати їх просто: no стоїть прямо перед somos чи son, а решта устрою фрази лишається незмінною. Відповідь проста: формула no + somos/son + ознака працює для будь-якої групи, без жодного нового слова.',
  es: 'No somos así, No son así — somos and son are already familiar, and no before them works exactly like no soy and no es did earlier. The quality after the linking word does not change from negation at all, whether the group includes the speaker (somos) or not (son): No somos rápidos negates the pace exactly the way No es caro negated the price of one thing. Joining them is simple: no goes right before somos or son, and everything else about the phrase\'s structure stays the same. The answer is simple: the formula no + somos/son + quality works for any group, without a single new word.',
  'pt-BR': 'No somos así, No son así — somos e son já são conhecidas, e no antes delas funciona exatamente como no soy e no es funcionavam antes. A qualidade depois da ligação não muda nada com a negação, seja o grupo com quem fala dentro (somos) ou sem (son): No somos rápidos nega o ritmo do mesmo jeito que No es caro negava o preço de uma coisa. Juntá-las é simples: no fica bem antes de somos ou son, e todo o resto da estrutura da frase continua igual. A resposta é simples: a fórmula no + somos/son + qualidade funciona para qualquer grupo, sem nenhuma palavra nova.',
  vi: 'No somos así, No son así — somos và son đã quen thuộc, và no đứng trước chúng hoạt động y hệt như no soy và no es trước đây. Đặc điểm sau từ nối hoàn toàn không đổi vì phủ định, dù nhóm có người nói ở trong (somos) hay không (son): No somos rápidos phủ định tốc độ giống hệt cách No es caro phủ định giá của một vật. Ghép chúng lại rất đơn giản: no đứng ngay trước somos hoặc son, và mọi thứ khác trong cấu trúc câu vẫn giữ nguyên. Câu trả lời rất đơn giản: công thức no + somos/son + đặc điểm hoạt động cho bất kỳ nhóm nào, không có một từ mới nào cả.',
  id: 'No somos así, No son así — somos dan son sudah dikenal, dan no sebelum keduanya bekerja persis seperti no soy dan no es sebelumnya. Sifat setelah kata penghubung sama sekali tidak berubah karena negasi, baik kelompok mencakup penutur (somos) maupun tidak (son): No somos rápidos menegasikan kecepatan persis seperti No es caro menegasikan harga suatu benda. Menggabungkannya sederhana: no berada tepat sebelum somos atau son, dan sisanya dari struktur frasa tetap sama. Jawabannya sederhana: rumus no + somos/son + sifat bekerja untuk kelompok apa pun, tanpa satu kata baru pun.',
  tr: 'No somos así, No son así — somos ve son zaten tanıdıktır ve önlerindeki no, daha önceki no soy ve no es gibi çalışır. Bağlaçtan sonraki nitelik, grup konuşanı içersin (somos) ya da içermesin (son), olumsuzlamadan hiç değişmez: No somos rápidos hızı, No es caro’nun bir şeyin fiyatını olumsuzladığı gibi olumsuzlar. Onları birleştirmek basittir: no tam olarak somos ya da son’dan önce gelir ve ifadenin geri kalan yapısı aynı kalır. Cevap basittir: no + somos/son + nitelik formülü, hiç yeni bir kelime olmadan herhangi bir grup için çalışır.',
  pl: 'No somos así, No son así — somos i son są już znane, a no przed nimi działa dokładnie tak, jak wcześniej no soy i no es. Cecha po łączniku wcale się nie zmienia przez przeczenie, niezależnie od tego, czy grupa obejmuje mówiącego (somos), czy nie (son): No somos rápidos zaprzecza tempu dokładnie tak, jak No es caro zaprzeczało cenie rzeczy. Połączenie ich jest proste: no stoi tuż przed somos lub son, a cała reszta budowy frazy pozostaje taka sama. Odpowiedź jest prosta: formuła no + somos/son + cecha działa dla dowolnej grupy, bez ani jednego nowego słowa.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что и для no soy, no eres и no es: no + связка + признак, без исключений. No somos caros, а не Somos no caros и не No caros somos. Признак после связки согласуется сразу по роду и числу того, о чём речь, точно так же, как и без отрицания: No somos rápidos (мужской род или по умолчанию) — No somos rápidas (женский род), No son bonitos — No son bonitas. Само наличие no на согласование не влияет вовсе. Ответ прост: единственное, что добавляет отрицание, — это no перед связкой somos или son; всё остальное устройство фразы остаётся прежним.',
  uk: 'Формула та сама, що й для no soy, no eres та no es: no + зв’язка + ознака, без винятків. No somos caros, а не Somos no caros і не No caros somos. Ознака після зв’язки узгоджується одразу за родом і числом того, про що йдеться, точно так само, як і без заперечення: No somos rápidos (чоловічий рід чи за замовчуванням) — No somos rápidas (жіночий рід), No son bonitos — No son bonitas. Сама наявність no на узгодження не впливає взагалі. Відповідь проста: єдине, що додає заперечення, — це no перед зв’язкою somos чи son; решта устрою фрази лишається незмінною.',
  es: 'The formula is the same as for no soy, no eres, and no es: no + linking word + quality, without exceptions. No somos caros, not Somos no caros and not No caros somos. The quality after the linking word agrees at once with the gender and number of what is being discussed, exactly as it does without negation: No somos rápidos (masculine or default) versus No somos rápidas (feminine), No son bonitos versus No son bonitas. The presence of no does not affect agreement at all. The answer is simple: the only thing negation adds is no before the linking word somos or son; everything else about the phrase\'s structure stays the same.',
  'pt-BR': 'A fórmula é a mesma de no soy, no eres e no es: no + ligação + qualidade, sem exceções. No somos caros, não Somos no caros e não No caros somos. A qualidade depois da ligação concorda ao mesmo tempo com o gênero e o número daquilo de que se fala, exatamente como sem negação: No somos rápidos (masculino ou padrão) contra No somos rápidas (feminino), No son bonitos contra No son bonitas. A presença de no não afeta a concordância em nada. A resposta é simples: a única coisa que a negação acrescenta é no antes da ligação somos ou son; todo o resto da estrutura da frase continua igual.',
  vi: 'Công thức giống hệt như với no soy, no eres và no es: no + từ nối + đặc điểm, không ngoại lệ. No somos caros, không phải Somos no caros và không phải No caros somos. Đặc điểm sau từ nối hòa hợp ngay với giống và số của điều đang được nói tới, y hệt như không có phủ định: No somos rápidos (giống đực hoặc mặc định) so với No somos rápidas (giống cái), No son bonitos so với No son bonitas. Sự có mặt của no hoàn toàn không ảnh hưởng đến sự hòa hợp. Câu trả lời rất đơn giản: điều duy nhất phủ định thêm vào là no trước từ nối somos hay son; mọi thứ khác trong cấu trúc câu vẫn giữ nguyên.',
  id: 'Rumusnya sama seperti untuk no soy, no eres, dan no es: no + kata penghubung + sifat, tanpa pengecualian. No somos caros, bukan Somos no caros dan bukan No caros somos. Sifat setelah kata penghubung langsung sesuai dengan gender dan jumlah dari apa yang dibicarakan, persis seperti tanpa negasi: No somos rápidos (maskulin atau default) versus No somos rápidas (feminin), No son bonitos versus No son bonitas. Kehadiran no sama sekali tidak memengaruhi kesesuaian. Jawabannya sederhana: satu-satunya hal yang ditambahkan negasi adalah no sebelum kata penghubung somos atau son; sisanya dari struktur frasa tetap sama.',
  tr: 'Formül, no soy, no eres ve no es için olanla aynıdır: no + bağlaç + nitelik, istisnasız. No somos caros, Somos no caros değil ve No caros somos değil. Bağlaçtan sonraki nitelik, söz konusu olanın cinsiyeti ve sayısıyla, olumsuzlama olmadan olduğu gibi hemen uyumludur: No somos rápidos (eril ya da varsayılan) karşısında No somos rápidas (dişil), No son bonitos karşısında No son bonitas. No’nun varlığı uyumu hiç etkilemez. Cevap basittir: olumsuzlamanın eklediği tek şey somos ya da son bağlacından önceki no’dur; ifadenin geri kalan yapısı aynı kalır.',
  pl: 'Formuła jest taka sama jak dla no soy, no eres i no es: no + łącznik + cecha, bez wyjątków. No somos caros, nie Somos no caros i nie No caros somos. Cecha po łączniku zgadza się jednocześnie z rodzajem i liczbą tego, o czym mowa, dokładnie tak samo jak bez przeczenia: No somos rápidos (rodzaj męski lub domyślnie) kontra No somos rápidas (rodzaj żeński), No son bonitos kontra No son bonitas. Sama obecność no wcale nie wpływa na zgodność. Odpowiedź jest prosta: jedyne, co dodaje przeczenie, to no przed łącznikiem somos lub son; cała reszta budowy frazy pozostaje taka sama.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — поставить no не перед связкой, а перед признаком: Somos no caros вместо No somos caros. По-испански no всегда идёт первым, сразу перед somos или son, а не где-то в середине фразы. Вторая ловушка — спутать somos и son местами: somos включает говорящего в группу, а son — нет; отрицание не меняет это правило ни на йоту, и выбор связки зависит только от того, входит ли говорящий в группу, о которой идёт речь. Проверка простая: сначала no, потом somos или son, только затем признак — и признак должен совпадать по роду и числу с тем, о ком идёт речь, а не с говорящим лично.',
  uk: 'Найчастіша помилка — поставити no не перед зв’язкою, а перед ознакою: Somos no caros замість No somos caros. В іспанській no завжди йде першим, одразу перед somos чи son, а не десь усередині фрази. Друга пастка — переплутати somos і son місцями: somos включає мовця в групу, а son — ні; заперечення не змінює це правило ні на йоту, і вибір зв’язки залежить лише від того, чи входить мовець у групу, про яку йдеться. Перевірка проста: спочатку no, потім somos чи son, тільки після — ознака — і ознака має збігатися за родом і числом із тим, про кого йдеться, а не з мовцем особисто.',
  es: 'The most common mistake is placing no not before the linking word, but before the quality: Somos no caros instead of No somos caros. In Spanish no always comes first, right before somos or son, not somewhere in the middle of the phrase. The second trap is mixing up somos and son: somos includes the speaker in the group, and son does not; negation does not change this rule one bit, and the choice of linking word depends only on whether the speaker belongs to the group being discussed. The check is simple: first no, then somos or son, only then the quality — and the quality must match the gender and number of who is being discussed, not the speaker personally.',
  'pt-BR': 'O erro mais comum é colocar no não antes da ligação, mas antes da qualidade: Somos no caros em vez de No somos caros. Em espanhol no sempre vem primeiro, logo antes de somos ou son, não em algum lugar no meio da frase. A segunda armadilha é confundir somos e son: somos inclui quem fala no grupo, e son não; a negação não muda essa regra em nada, e a escolha da ligação depende só de quem fala pertencer ou não ao grupo de que se fala. A checagem é simples: primeiro no, depois somos ou son, só então a qualidade — e a qualidade deve corresponder ao gênero e número de quem se fala, não de quem fala pessoalmente.',
  vi: 'Lỗi phổ biến nhất là đặt no không phải trước từ nối, mà trước đặc điểm: Somos no caros thay vì No somos caros. Trong tiếng Tây Ban Nha no luôn đứng đầu, ngay trước somos hoặc son, không phải ở đâu đó giữa câu. Cái bẫy thứ hai là nhầm lẫn somos và son: somos bao gồm người nói trong nhóm, còn son thì không; phủ định không thay đổi quy tắc này một chút nào, và việc chọn từ nối chỉ phụ thuộc vào việc người nói có thuộc nhóm đang được nói tới hay không. Cách kiểm tra đơn giản: trước tiên no, rồi đến somos hoặc son, chỉ sau đó mới đến đặc điểm — và đặc điểm phải khớp về giống và số với người đang được nói tới, không phải bản thân người nói.',
  id: 'Kesalahan paling umum: meletakkan no bukan sebelum kata penghubung, tetapi sebelum sifat: Somos no caros alih-alih No somos caros. Dalam bahasa Spanyol no selalu datang pertama, tepat sebelum somos atau son, bukan di tengah frasa. Jebakan kedua: mengacaukan somos dan son — somos mencakup penutur dalam kelompok, son tidak; negasi tidak mengubah aturan ini, dan pemilihan kata penghubung hanya bergantung pada apakah penutur termasuk dalam kelompok yang dibicarakan. Pengecekannya sederhana: pertama no, lalu somos atau son, baru sifat — dan sifatnya harus cocok dengan gender dan jumlah dari siapa yang dibicarakan, bukan penuturnya sendiri.',
  tr: 'En yaygın hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: No somos caros yerine Somos no caros. İspanyolcada no her zaman önce gelir, tam somos ya da son’dan önce, ifadenin ortasında bir yerde değil. İkinci tuzak, somos ve son’u karıştırmaktır: somos konuşanı gruba dahil eder, son etmez; olumsuzlama bu kuralı hiç değiştirmez ve bağlaç seçimi yalnızca konuşanın söz konusu gruba dahil olup olmadığına bağlıdır. Kontrol basittir: önce no, sonra somos ya da son, ancak ondan sonra nitelik — ve nitelik, konuşanın kendisiyle değil, söz konusu olan kişilerin cinsiyeti ve sayısıyla eşleşmelidir.',
  pl: 'Najczęstszy błąd to postawienie no nie przed łącznikiem, lecz przed cechą: Somos no caros zamiast No somos caros. W hiszpańskim no zawsze idzie pierwsze, tuż przed somos lub son, a nie gdzieś w środku frazy. Druga pułapka to pomylenie somos i son: somos obejmuje mówiącego w grupie, a son nie; przeczenie ani trochę nie zmienia tej reguły, a wybór łącznika zależy tylko od tego, czy mówiący należy do grupy, o której mowa. Sprawdzenie jest proste: najpierw no, potem somos lub son, dopiero potem cecha — a cecha musi pasować rodzajem i liczbą do tego, o kim mowa, a nie do samego mówiącego.',
});

export const ES_EPISODE_01_SESSION_29_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Отрицание и множественное число соединяются без изменений',
      uk: 'Заперечення і множина з’єднуються без змін',
      es: 'Negation and the plural join without changes',
      'pt-BR': 'Negação e plural se juntam sem mudanças',
      vi: 'Phủ định và số nhiều kết hợp mà không thay đổi',
      id: 'Negasi dan jamak bergabung tanpa perubahan',
      tr: 'Olumsuzlama ve çoğul değişiklik olmadan birleşir',
      pl: 'Przeczenie i liczba mnoga łączą się bez zmian',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'No somos así, No son así — somos и son уже знакомы, и no перед ними работает точно так же, как no soy и no es раньше. Признак после связки не меняется от отрицания вовсе, независимо от того, идёт ли речь про группу с говорящим (somos) или без него (son): ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' отрицает темп ровно так же, как No es caro отрицало цену одного предмета. Соединить их просто: no встаёт прямо перед somos или son, а всё остальное устройство фразы остаётся прежним. Ответ прост: формула no + somos/son + признак работает для любой группы, без единого нового слова.', semantic: 'explanation' }),
      uk: R({ text: 'No somos así, No son así — somos і son вже знайомі, і no перед ними працює точно так само, як no soy і no es раніше. Ознака після зв’язки не змінюється від заперечення взагалі, незалежно від того, чи йдеться про групу з мовцем (somos) чи без нього (son): ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' заперечує темп рівно так само, як No es caro заперечувало ціну одного предмета. З’єднати їх просто: no стоїть прямо перед somos чи son, а решта устрою фрази лишається незмінною. Відповідь проста: формула no + somos/son + ознака працює для будь-якої групи, без жодного нового слова.', semantic: 'explanation' }),
      es: R({ text: 'No somos así, No son así — somos and son are already familiar, and no before them works exactly like no soy and no es did earlier. The quality after the linking word does not change from negation at all, whether the group includes the speaker (somos) or not (son): ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' negates the pace exactly the way No es caro negated the price of one thing. Joining them is simple: no goes right before somos or son, and everything else about the phrase\'s structure stays the same. The answer is simple: the formula no + somos/son + quality works for any group, without a single new word.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'No somos así, No son así — somos e son já são conhecidas, e no antes delas funciona exatamente como no soy e no es funcionavam antes. A qualidade depois da ligação não muda nada com a negação, seja o grupo com quem fala dentro (somos) ou sem (son): ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' nega o ritmo do mesmo jeito que No es caro negava o preço de uma coisa. Juntá-las é simples: no fica bem antes de somos ou son, e todo o resto da estrutura da frase continua igual. A resposta é simples: a fórmula no + somos/son + qualidade funciona para qualquer grupo, sem nenhuma palavra nova.', semantic: 'explanation' }),
      vi: R({ text: 'No somos así, No son así — somos và son đã quen thuộc, và no đứng trước chúng hoạt động y hệt như no soy và no es trước đây. Đặc điểm sau từ nối hoàn toàn không đổi vì phủ định, dù nhóm có người nói ở trong (somos) hay không (son): ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' phủ định tốc độ giống hệt cách No es caro phủ định giá của một vật. Ghép chúng lại rất đơn giản: no đứng ngay trước somos hoặc son, và mọi thứ khác trong cấu trúc câu vẫn giữ nguyên. Câu trả lời rất đơn giản: công thức no + somos/son + đặc điểm hoạt động cho bất kỳ nhóm nào, không có một từ mới nào cả.', semantic: 'explanation' }),
      id: R({ text: 'No somos así, No son así — somos dan son sudah dikenal, dan no sebelum keduanya bekerja persis seperti no soy dan no es sebelumnya. Sifat setelah kata penghubung sama sekali tidak berubah karena negasi, baik kelompok mencakup penutur (somos) maupun tidak (son): ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' menegasikan kecepatan persis seperti No es caro menegasikan harga suatu benda. Menggabungkannya sederhana: no berada tepat sebelum somos atau son, dan sisanya dari struktur frasa tetap sama. Jawabannya sederhana: rumus no + somos/son + sifat bekerja untuk kelompok apa pun, tanpa satu kata baru pun.', semantic: 'explanation' }),
      tr: R({ text: 'No somos así, No son así — somos ve son zaten tanıdıktır ve önlerindeki no, daha önceki no soy ve no es gibi çalışır. Bağlaçtan sonraki nitelik, grup konuşanı içersin (somos) ya da içermesin (son), olumsuzlamadan hiç değişmez: ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' hızı, No es caro’nun bir şeyin fiyatını olumsuzladığı gibi olumsuzlar. Onları birleştirmek basittir: no tam olarak somos ya da son’dan önce gelir ve ifadenin geri kalan yapısı aynı kalır. Cevap basittir: no + somos/son + nitelik formülü, hiç yeni bir kelime olmadan herhangi bir grup için çalışır.', semantic: 'explanation' }),
      pl: R({ text: 'No somos así, No son así — somos i son są już znane, a no przed nimi działa dokładnie tak, jak wcześniej no soy i no es. Cecha po łączniku wcale się nie zmienia przez przeczenie, niezależnie od tego, czy grupa obejmuje mówiącego (somos), czy nie (son): ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' zaprzecza tempu dokładnie tak, jak No es caro zaprzeczało cenie rzeczy. Połączenie ich jest proste: no stoi tuż przed somos lub son, a cała reszta budowy frazy pozostaje taka sama. Odpowiedź jest prosta: formuła no + somos/son + cecha działa dla dowolnej grupy, bez ani jednego nowego słowa.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как отрицают темп своей группы, включающей говорящего?',
        uk: 'Як заперечують темп своєї групи, що включає мовця?',
        es: 'How do you negate the pace of your own group, including the speaker?',
        'pt-BR': 'Como se nega o ritmo do próprio grupo, incluindo quem fala?',
        vi: 'Làm thế nào để phủ định tốc độ của nhóm mình, gồm cả người nói?',
        id: 'Bagaimana cara menegasikan kecepatan kelompok sendiri, termasuk penutur?',
        tr: 'Konuşanı da içeren kendi grubun hızı nasıl olumsuzlanır?',
        pl: 'Jak zaprzecza się tempu własnej grupy, obejmującej mówiącego?',
      }),
      choices: [
        L({ ru: 'No somos rápidos', uk: 'No somos rápidos', es: 'No somos rápidos', 'pt-BR': 'No somos rápidos', vi: 'No somos rápidos', id: 'No somos rápidos', tr: 'No somos rápidos', pl: 'No somos rápidos' }),
        L({ ru: 'Somos no rápidos', uk: 'Somos no rápidos', es: 'Somos no rápidos', 'pt-BR': 'Somos no rápidos', vi: 'Somos no rápidos', id: 'Somos no rápidos', tr: 'Somos no rápidos', pl: 'Somos no rápidos' }),
        L({ ru: 'No son rápidos', uk: 'No son rápidos', es: 'No son rápidos', 'pt-BR': 'No son rápidos', vi: 'No son rápidos', id: 'No son rápidos', tr: 'No son rápidos', pl: 'No son rápidos' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No somos rápidos верно: no встаёт прямо перед связкой somos, а признак rápidos не меняется от отрицания.',
        uk: 'No somos rápidos правильно: no стоїть прямо перед зв’язкою somos, а ознака rápidos не змінюється від заперечення.',
        es: 'No somos rápidos is correct: no goes right before the linking word somos, and the quality rápidos does not change from negation.',
        'pt-BR': 'No somos rápidos está correto: no fica bem antes da ligação somos, e a qualidade rápidos não muda com a negação.',
        vi: 'No somos rápidos đúng: no đứng ngay trước từ nối somos, và đặc điểm rápidos không đổi vì phủ định.',
        id: 'No somos rápidos benar: no berada tepat sebelum kata penghubung somos, dan sifat rápidos tidak berubah karena negasi.',
        tr: 'No somos rápidos doğrudur: no tam olarak somos bağlacından önce gelir ve rápidos niteliği olumsuzlamadan değişmez.',
        pl: 'No somos rápidos jest poprawne: no stoi tuż przed łącznikiem somos, a cecha rápidos nie zmienia się przez przeczenie.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Согласование по роду и числу не зависит от no',
      uk: 'Узгодження за родом і числом не залежить від no',
      es: 'Gender and number agreement does not depend on no',
      'pt-BR': 'A concordância de gênero e número não depende de no',
      vi: 'Sự hòa hợp giống và số không phụ thuộc vào no',
      id: 'Kesesuaian gender dan jumlah tidak bergantung pada no',
      tr: 'Cinsiyet ve sayı uyumu no’ya bağlı değildir',
      pl: 'Zgodność rodzaju i liczby nie zależy od no',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула та же, что и для no soy, no eres и no es: no + связка + признак, без исключений. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', а не Somos no caros и не No caros somos. Признак после связки согласуется сразу по роду и числу того, о чём речь, точно так же, как и без отрицания: No somos rápidos (мужской род или по умолчанию) — ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ' (женский род), No son bonitos — No son bonitas. Само наличие no на согласование не влияет вовсе. Ответ прост: единственное, что добавляет отрицание, — это no перед связкой somos или son; всё остальное устройство фразы остаётся прежним.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й для no soy, no eres та no es: no + зв’язка + ознака, без винятків. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', а не Somos no caros і не No caros somos. Ознака після зв’язки узгоджується одразу за родом і числом того, про що йдеться, точно так само, як і без заперечення: No somos rápidos (чоловічий рід чи за замовчуванням) — ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ' (жіночий рід), No son bonitos — No son bonitas. Сама наявність no на узгодження не впливає взагалі. Відповідь проста: єдине, що додає заперечення, — це no перед зв’язкою somos чи son; решта устрою фрази лишається незмінною.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for no soy, no eres, and no es: no + linking word + quality, without exceptions. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', not Somos no caros and not No caros somos. The quality after the linking word agrees at once with the gender and number of what is being discussed, exactly as it does without negation: No somos rápidos (masculine or default) versus ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ' (feminine), No son bonitos versus No son bonitas. The presence of no does not affect agreement at all. The answer is simple: the only thing negation adds is no before the linking word somos or son; everything else about the phrase\'s structure stays the same.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de no soy, no eres e no es: no + ligação + qualidade, sem exceções. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', não Somos no caros e não No caros somos. A qualidade depois da ligação concorda ao mesmo tempo com o gênero e o número daquilo de que se fala, exatamente como sem negação: No somos rápidos (masculino ou padrão) contra ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ' (feminino), No son bonitos contra No son bonitas. A presença de no não afeta a concordância em nada. A resposta é simples: a única coisa que a negação acrescenta é no antes da ligação somos ou son; todo o resto da estrutura da frase continua igual.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống hệt như với no soy, no eres và no es: no + từ nối + đặc điểm, không ngoại lệ. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', không phải Somos no caros và không phải No caros somos. Đặc điểm sau từ nối hòa hợp ngay với giống và số của điều đang được nói tới, y hệt như không có phủ định: No somos rápidos (giống đực hoặc mặc định) so với ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ' (giống cái), No son bonitos so với No son bonitas. Sự có mặt của no hoàn toàn không ảnh hưởng đến sự hòa hợp. Câu trả lời rất đơn giản: điều duy nhất phủ định thêm vào là no trước từ nối somos hay son; mọi thứ khác trong cấu trúc câu vẫn giữ nguyên.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti untuk no soy, no eres, dan no es: no + kata penghubung + sifat, tanpa pengecualian. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', bukan Somos no caros dan bukan No caros somos. Sifat setelah kata penghubung langsung sesuai dengan gender dan jumlah dari apa yang dibicarakan, persis seperti tanpa negasi: No somos rápidos (maskulin atau default) versus ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ' (feminin), No son bonitos versus No son bonitas. Kehadiran no sama sekali tidak memengaruhi kesesuaian. Jawabannya sederhana: satu-satunya hal yang ditambahkan negasi adalah no sebelum kata penghubung somos atau son; sisanya dari struktur frasa tetap sama.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, no soy, no eres ve no es için olanla aynıdır: no + bağlaç + nitelik, istisnasız. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', Somos no caros değil ve No caros somos değil. Bağlaçtan sonraki nitelik, söz konusu olanın cinsiyeti ve sayısıyla, olumsuzlama olmadan olduğu gibi hemen uyumludur: No somos rápidos (eril ya da varsayılan) karşısında ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ' (dişil), No son bonitos karşısında No son bonitas. No’nun varlığı uyumu hiç etkilemez. Cevap basittir: olumsuzlamanın eklediği tek şey somos ya da son bağlacından önceki no’dur; ifadenin geri kalan yapısı aynı kalır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla no soy, no eres i no es: no + łącznik + cecha, bez wyjątków. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', nie Somos no caros i nie No caros somos. Cecha po łączniku zgadza się jednocześnie z rodzajem i liczbą tego, o czym mowa, dokładnie tak samo jak bez przeczenia: No somos rápidos (rodzaj męski lub domyślnie) kontra ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ' (rodzaj żeński), No son bonitos kontra No son bonitas. Sama obecność no wcale nie wpływa na zgodność. Odpowiedź jest prosta: jedyne, co dodaje przeczenie, to no przed łącznikiem somos lub son; cała reszta budowy frazy pozostaje taka sama.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Про группу женского рода — как верно отрицать темп?',
        uk: 'Про групу жіночого роду — як правильно заперечити темп?',
        es: 'About a feminine group — how do you correctly negate the pace?',
        'pt-BR': 'Sobre um grupo feminino — como negar corretamente o ritmo?',
        vi: 'Về nhóm giống cái — làm sao để phủ định tốc độ đúng cách?',
        id: 'Tentang kelompok feminin — bagaimana cara menegasikan kecepatan dengan benar?',
        tr: 'Dişil bir grup hakkında — hız doğru nasıl olumsuzlanır?',
        pl: 'O grupie rodzaju żeńskiego — jak poprawnie zaprzeczyć tempu?',
      }),
      choices: [
        L({ ru: 'No somos rápidas', uk: 'No somos rápidas', es: 'No somos rápidas', 'pt-BR': 'No somos rápidas', vi: 'No somos rápidas', id: 'No somos rápidas', tr: 'No somos rápidas', pl: 'No somos rápidas' }),
        L({ ru: 'No somos rápidos', uk: 'No somos rápidos', es: 'No somos rápidos', 'pt-BR': 'No somos rápidos', vi: 'No somos rápidos', id: 'No somos rápidos', tr: 'No somos rápidos', pl: 'No somos rápidos' }),
        L({ ru: 'No son rápidas', uk: 'No son rápidas', es: 'No son rápidas', 'pt-BR': 'No son rápidas', vi: 'No son rápidas', id: 'No son rápidas', tr: 'No son rápidas', pl: 'No son rápidas' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No somos rápidas верно: связка somos для группы, включающей говорящую, плюс признак с окончанием -as для женского рода. No somos rápidos путает род, No son rápidas путает связку — это уже группа без говорящей.',
        uk: 'No somos rápidas правильно: зв’язка somos для групи, що включає мовицю, плюс ознака із закінченням -as для жіночого роду. No somos rápidos плутає рід, No son rápidas плутає зв’язку — це вже група без мовиці.',
        es: 'No somos rápidas is correct: the linking word somos for a group that includes the speaker, plus the quality ending in -as for feminine. No somos rápidos mixes up the gender, No son rápidas mixes up the linking word — that is already a group without the speaker.',
        'pt-BR': 'No somos rápidas está correto: a ligação somos para um grupo que inclui quem fala, mais a qualidade terminada em -as para feminino. No somos rápidos confunde o gênero, No son rápidas confunde a ligação — isso já é um grupo sem quem fala.',
        vi: 'No somos rápidas đúng: từ nối somos cho nhóm gồm cả người nói, cộng với đặc điểm kết thúc bằng -as cho giống cái. No somos rápidos nhầm giống, No son rápidas nhầm từ nối — đó đã là nhóm không có người nói.',
        id: 'No somos rápidas benar: kata penghubung somos untuk kelompok yang mencakup penutur, ditambah sifat berakhiran -as untuk feminin. No somos rápidos salah gender, No son rápidas salah kata penghubung — itu sudah kelompok tanpa penutur.',
        tr: 'No somos rápidas doğrudur: konuşanı da içeren bir grup için somos bağlacı, artı dişil için -as ile biten nitelik. No somos rápidos cinsiyeti karıştırır, No son rápidas ise bağlacı karıştırır — bu zaten konuşanı içermeyen bir gruptur.',
        pl: 'No somos rápidas jest poprawne: łącznik somos dla grupy obejmującej mówiącą, plus cecha zakończona na -as dla rodzaju żeńskiego. No somos rápidos myli rodzaj, No son rápidas myli łącznik — to już grupa bez mówiącej.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'No перед связкой, somos и son не путать местами',
      uk: 'No перед зв’язкою, somos і son не плутати місцями',
      es: 'No before the linking word, do not mix up somos and son',
      'pt-BR': 'No antes da ligação, não confundir somos e son',
      vi: 'No trước từ nối, không nhầm somos và son',
      id: 'No sebelum kata penghubung, jangan tertukar somos dan son',
      tr: 'No bağlaçtan önce, somos ve son karıştırılmamalı',
      pl: 'No przed łącznikiem, nie mylić somos i son',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — поставить no не перед связкой, а перед признаком: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. По-испански no всегда идёт первым, сразу перед somos или son, а не где-то в середине фразы. Вторая ловушка — спутать somos и son местами: somos включает говорящего в группу, а son — нет; отрицание не меняет это правило ни на йоту, и выбор связки зависит только от того, входит ли говорящий в группу, о которой идёт речь. Проверка простая: сначала no, потом somos или son, только затем признак — и признак должен совпадать по роду и числу с тем, о ком идёт речь, а не с говорящим лично.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — поставити no не перед зв’язкою, а перед ознакою: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. В іспанській no завжди йде першим, одразу перед somos чи son, а не десь усередині фрази. Друга пастка — переплутати somos і son місцями: somos включає мовця в групу, а son — ні; заперечення не змінює це правило ні на йоту, і вибір зв’язки залежить лише від того, чи входить мовець у групу, про яку йдеться. Перевірка проста: спочатку no, потім somos чи son, тільки після — ознака — і ознака має збігатися за родом і числом із тим, про кого йдеться, а не з мовцем особисто.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is placing no not before the linking word, but before the quality: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. In Spanish no always comes first, right before somos or son, not somewhere in the middle of the phrase. The second trap is mixing up somos and son: somos includes the speaker in the group, and son does not; negation does not change this rule one bit, and the choice of linking word depends only on whether the speaker belongs to the group being discussed. The check is simple: first no, then somos or son, only then the quality — and the quality must match the gender and number of who is being discussed, not the speaker personally.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é colocar no não antes da ligação, mas antes da qualidade: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. Em espanhol no sempre vem primeiro, logo antes de somos ou son, não em algum lugar no meio da frase. A segunda armadilha é confundir somos e son: somos inclui quem fala no grupo, e son não; a negação não muda essa regra em nada, e a escolha da ligação depende só de quem fala pertencer ou não ao grupo de que se fala. A checagem é simples: primeiro no, depois somos ou son, só então a qualidade — e a qualidade deve corresponder ao gênero e número de quem se fala, não de quem fala pessoalmente.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là đặt no không phải trước từ nối, mà trước đặc điểm: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. Trong tiếng Tây Ban Nha no luôn đứng đầu, ngay trước somos hoặc son, không phải ở đâu đó giữa câu. Cái bẫy thứ hai là nhầm lẫn somos và son: somos bao gồm người nói trong nhóm, còn son thì không; phủ định không thay đổi quy tắc này một chút nào, và việc chọn từ nối chỉ phụ thuộc vào việc người nói có thuộc nhóm đang được nói tới hay không. Cách kiểm tra đơn giản: trước tiên no, rồi đến somos hoặc son, chỉ sau đó mới đến đặc điểm — và đặc điểm phải khớp về giống và số với người đang được nói tới, không phải bản thân người nói.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum: meletakkan no bukan sebelum kata penghubung, tetapi sebelum sifat: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. Dalam bahasa Spanyol no selalu datang pertama, tepat sebelum somos atau son, bukan di tengah frasa. Jebakan kedua: mengacaukan somos dan son — somos mencakup penutur dalam kelompok, son tidak; negasi tidak mengubah aturan ini, dan pemilihan kata penghubung hanya bergantung pada apakah penutur termasuk dalam kelompok yang dibicarakan. Pengecekannya sederhana: pertama no, lalu somos atau son, baru sifat — dan sifatnya harus cocok dengan gender dan jumlah dari siapa yang dibicarakan, bukan penuturnya sendiri.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: '. İspanyolcada no her zaman önce gelir, tam somos ya da son’dan önce, ifadenin ortasında bir yerde değil. İkinci tuzak, somos ve son’u karıştırmaktır: somos konuşanı gruba dahil eder, son etmez; olumsuzlama bu kuralı hiç değiştirmez ve bağlaç seçimi yalnızca konuşanın söz konusu gruba dahil olup olmadığına bağlıdır. Kontrol basittir: önce no, sonra somos ya da son, ancak ondan sonra nitelik — ve nitelik, konuşanın kendisiyle değil, söz konusu olan kişilerin cinsiyeti ve sayısıyla eşleşmelidir.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to postawienie no nie przed łącznikiem, lecz przed cechą: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. W hiszpańskim no zawsze idzie pierwsze, tuż przed somos lub son, a nie gdzieś w środku frazy. Druga pułapka to pomylenie somos i son: somos obejmuje mówiącego w grupie, a son nie; przeczenie ani trochę nie zmienia tej reguły, a wybór łącznika zależy tylko od tego, czy mówiący należy do grupy, o której mowa. Sprawdzenie jest proste: najpierw no, potem somos lub son, dopiero potem cecha — a cecha musi pasować rodzajem i liczbą do tego, o kim mowa, a nie do samego mówiącego.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно отрицать цену дешёвых услуг своей группы?',
        uk: 'Як правильно заперечити ціну дешевих послуг своєї групи?',
        es: 'How do you correctly negate the price of your own group\'s inexpensive services?',
        'pt-BR': 'Como negar corretamente o preço dos serviços baratos do próprio grupo?',
        vi: 'Làm sao để phủ định đúng cách giá dịch vụ rẻ của nhóm mình?',
        id: 'Bagaimana cara menegasikan dengan benar harga layanan murah kelompok sendiri?',
        tr: 'Kendi grubunun ucuz hizmetlerinin fiyatı doğru nasıl olumsuzlanır?',
        pl: 'Jak poprawnie zaprzeczyć cenie tanich usług własnej grupy?',
      }),
      choices: [
        L({ ru: 'No somos caros', uk: 'No somos caros', es: 'No somos caros', 'pt-BR': 'No somos caros', vi: 'No somos caros', id: 'No somos caros', tr: 'No somos caros', pl: 'No somos caros' }),
        L({ ru: 'Somos no caros', uk: 'Somos no caros', es: 'Somos no caros', 'pt-BR': 'Somos no caros', vi: 'Somos no caros', id: 'Somos no caros', tr: 'Somos no caros', pl: 'Somos no caros' }),
        L({ ru: 'No son caros', uk: 'No son caros', es: 'No son caros', 'pt-BR': 'No son caros', vi: 'No son caros', id: 'No son caros', tr: 'No son caros', pl: 'No son caros' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No somos caros верно, потому что no стоит перед связкой somos, а сама связка — та, что включает говорящего в группу, о которой идёт речь.',
        uk: 'No somos caros правильно, бо no стоїть перед зв’язкою somos, а сама зв’язка — та, що включає мовця в групу, про яку йдеться.',
        es: 'No somos caros is correct because no stands before the linking word somos, and the linking word itself includes the speaker in the group being discussed.',
        'pt-BR': 'No somos caros está correto porque no fica antes da ligação somos, e a própria ligação inclui quem fala no grupo de que se fala.',
        vi: 'No somos caros đúng vì no đứng trước từ nối somos, và bản thân từ nối bao gồm người nói trong nhóm đang được nói tới.',
        id: 'No somos caros benar karena no berada sebelum kata penghubung somos, dan kata penghubung itu sendiri mencakup penutur dalam kelompok yang dibicarakan.',
        tr: 'No somos caros doğrudur çünkü no, somos bağlacından önce durur ve bağlacın kendisi, söz konusu olan gruba konuşanı da dahil eder.',
        pl: 'No somos caros jest poprawne, ponieważ no stoi przed łącznikiem somos, a sam łącznik obejmuje mówiącego w grupie, o której mowa.',
      }),
    },
  },
];
