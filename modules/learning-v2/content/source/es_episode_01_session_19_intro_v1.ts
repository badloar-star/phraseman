import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 19 "Это не так" / builtOn: [2, 17], recalls: [2, 11]): три страницы
// concept/formula/trap показывают, что формула отрицания no + связка из
// второй сессии (No es fácil, No es verdad) и третье лицо es из сессии 17
// (Es fácil про предмет, не про собеседника) соединяются без изменений:
// no встаёт перед es, признак не меняется, а согласование по роду работает
// так же, как в Es bonito / Es bonita. Это завершает парадигму отрицания
// связки ser по лицам: no soy (сессия 2), no eres (сессия 11), теперь
// no es — предметно и явно. Новых слов нет.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_19_TITLE = L({
  ru: 'Это не так',
  uk: 'Це не так',
  es: 'It is not like this',
  'pt-BR': 'Não é assim',
  vi: 'Nó không phải như vậy',
  id: 'Bukan begitu',
  tr: 'Bu böyle değil',
  pl: 'Tak nie jest',
});

export const ES_EPISODE_01_SESSION_19_SUMMARY = L({
  ru: 'No + es отрицает оценку предмета или ситуации — та же формула отрицания, что и раньше, только связка теперь про третье лицо.',
  uk: 'No + es заперечує оцінку предмета чи ситуації — та сама формула заперечення, що й раніше, тільки зв’язка тепер про третю особу.',
  es: 'No + es negates the evaluation of a thing or situation — the same negation formula as before, only now the linking word is about the third person.',
  'pt-BR': 'No + es nega a avaliação de uma coisa ou situação — a mesma fórmula de negação de antes, só que agora a ligação é sobre a terceira pessoa.',
  vi: 'No + es phủ định đánh giá về một vật hay tình huống — cùng công thức phủ định như trước, chỉ khác là từ nối giờ nói về ngôi thứ ba.',
  id: 'No + es menegasikan penilaian atas benda atau situasi — rumus negasi yang sama seperti sebelumnya, hanya sekarang kata penghubungnya tentang orang ketiga.',
  tr: 'No + es, bir şeyin ya da durumun değerlendirmesini olumsuzlar — öncekiyle aynı olumsuzlama formülü, sadece şimdi bağlaç üçüncü kişi hakkında.',
  pl: 'No + es zaprzecza ocenie rzeczy lub sytuacji — ta sama formuła przeczenia co wcześniej, tylko teraz łącznik dotyczy trzeciej osoby.',
});

export const ES_EPISODE_01_SESSION_19_GOAL = L({
  ru: 'Уверенно строить отрицание No es + признак про предметы и ситуации, сохраняя порядок слов и согласование по роду.',
  uk: 'Впевнено будувати заперечення No es + ознака про предмети й ситуації, зберігаючи порядок слів і узгодження за родом.',
  es: 'Confidently build the negation No es + quality about things and situations, keeping the word order and gender agreement.',
  'pt-BR': 'Construir com confiança a negação No es + qualidade sobre coisas e situações, mantendo a ordem das palavras e a concordância de gênero.',
  vi: 'Tự tin xây dựng câu phủ định No es + đặc điểm về vật và tình huống, giữ đúng trật tự từ và hòa hợp giống.',
  id: 'Membangun dengan percaya diri negasi No es + sifat tentang benda dan situasi, menjaga urutan kata dan kesesuaian gender.',
  tr: 'Nesneler ve durumlar hakkında No es + nitelik olumsuzlamasını, kelime sırasını ve cinsiyet uyumunu koruyarak güvenle kurmak.',
  pl: 'Pewnie budować przeczenie No es + cecha o rzeczach i sytuacjach, zachowując szyk wyrazów i zgodność rodzaju.',
});

const CONCEPT_BODY = L({
  ru: 'No es fácil, No es verdad — эта формула отрицания уже встречалась раньше. А недавно появилась es — форма связки ser для предметов и ситуаций, не для говорящего и не для собеседника: Es caro, Es bonito. Соединить их просто: no встаёт прямо перед es, а признак после es не меняется от отрицания вовсе — No es caro отрицает цену предмета точно так же, как No es fácil отрицало сложность задачи. Ответ прост: формула no + es + признак работает для любого предмета или ситуации, без единого нового слова.',
  uk: 'No es fácil, No es verdad — ця формула заперечення вже траплялася раніше. А нещодавно з’явилася es — форма зв’язки ser для предметів і ситуацій, не для мовця і не для співрозмовника: Es caro, Es bonito. З’єднати їх просто: no стоїть прямо перед es, а ознака після es не змінюється від заперечення взагалі — No es caro заперечує ціну предмета точно так само, як No es fácil заперечувало складність завдання. Відповідь проста: формула no + es + ознака працює для будь-якого предмета чи ситуації, без жодного нового слова.',
  es: 'No es fácil, No es verdad — this negation formula has already appeared before. And recently es appeared — the form of the linking word ser for things and situations, not the speaker and not the listener: Es caro, Es bonito. Joining them is simple: no goes right before es, and the quality after es does not change from negation at all — No es caro negates a thing\'s price the same way No es fácil negated a task\'s difficulty. The answer is simple: the formula no + es + quality works for any thing or situation, without a single new word.',
  'pt-BR': 'No es fácil, No es verdad — essa fórmula de negação já apareceu antes. E recentemente apareceu es — a forma da ligação ser para coisas e situações, não para quem fala nem para o interlocutor: Es caro, Es bonito. Juntá-las é simples: no fica bem antes de es, e a qualidade depois de es não muda nada com a negação — No es caro nega o preço de uma coisa do mesmo jeito que No es fácil negava a dificuldade de uma tarefa. A resposta é simples: a fórmula no + es + qualidade funciona para qualquer coisa ou situação, sem nenhuma palavra nova.',
  vi: 'No es fácil, No es verdad — công thức phủ định này đã xuất hiện từ trước. Và gần đây es đã xuất hiện — dạng của từ nối ser cho vật và tình huống, không phải người nói cũng không phải người nghe: Es caro, Es bonito. Ghép chúng lại rất đơn giản: no đứng ngay trước es, và đặc điểm sau es hoàn toàn không đổi vì phủ định — No es caro phủ định giá của một vật giống hệt cách No es fácil phủ định độ khó của một nhiệm vụ. Câu trả lời rất đơn giản: công thức no + es + đặc điểm hoạt động cho bất kỳ vật hay tình huống nào, không có một từ mới nào cả.',
  id: 'No es fácil, No es verdad — rumus negasi ini sudah pernah muncul sebelumnya. Dan baru-baru ini es muncul — bentuk kata penghubung ser untuk benda dan situasi, bukan penutur maupun pendengar: Es caro, Es bonito. Menggabungkannya sederhana: no berada tepat sebelum es, dan sifat setelah es sama sekali tidak berubah karena negasi — No es caro menegasikan harga suatu benda persis seperti No es fácil menegasikan kesulitan suatu tugas. Jawabannya sederhana: rumus no + es + sifat bekerja untuk benda atau situasi apa pun, tanpa satu kata baru pun.',
  tr: 'No es fácil, No es verdad — bu olumsuzlama formülü daha önce de ortaya çıkmıştı. Ve kısa süre önce es ortaya çıktı — ser bağlacının nesneler ve durumlar için biçimi, ne konuşan ne de dinleyici için: Es caro, Es bonito. Onları birleştirmek basittir: no tam olarak es’ten önce gelir ve es’ten sonraki nitelik olumsuzlamadan hiç değişmez — No es caro bir şeyin fiyatını, No es fácil’in bir görevin zorluğunu olumsuzladığı gibi olumsuzlar. Cevap basittir: no + es + nitelik formülü, hiç yeni bir kelime olmadan herhangi bir şey ya da durum için çalışır.',
  pl: 'No es fácil, No es verdad — ta formuła przeczenia już wcześniej się pojawiała. A niedawno pojawiło się es — forma łącznika ser dla rzeczy i sytuacji, nie dla mówiącego ani słuchacza: Es caro, Es bonito. Połączenie ich jest proste: no stoi tuż przed es, a cecha po es wcale się nie zmienia przez przeczenie — No es caro zaprzecza cenie rzeczy dokładnie tak, jak No es fácil zaprzeczało trudności zadania. Odpowiedź jest prosta: formuła no + es + cecha działa dla dowolnej rzeczy lub sytuacji, bez ani jednego nowego słowa.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что и для no soy и no eres: no + связка + признак, без исключений. No es caro, а не Es no caro и не No caro es. Признак после es согласуется с родом того, о чём речь, точно так же, как и без отрицания: No es caro (по умолчанию или мужской род) — No es cara (женский род), No es bonito — No es bonita. Само наличие no на согласование не влияет вовсе. Ответ прост: единственное, что добавляет отрицание, — это no перед связкой es; всё остальное устройство фразы остаётся прежним.',
  uk: 'Формула та сама, що й для no soy та no eres: no + зв’язка + ознака, без винятків. No es caro, а не Es no caro і не No caro es. Ознака після es узгоджується з родом того, про що йдеться, точно так само, як і без заперечення: No es caro (за замовчуванням чи чоловічий рід) — No es cara (жіночий рід), No es bonito — No es bonita. Сама наявність no на узгодження не впливає взагалі. Відповідь проста: єдине, що додає заперечення, — це no перед зв’язкою es; решта устрою фрази лишається незмінною.',
  es: 'The formula is the same as for no soy and no eres: no + linking word + quality, without exceptions. No es caro, not Es no caro and not No caro es. The quality after es agrees with the gender of what is being discussed exactly as it does without negation: No es caro (default or masculine) versus No es cara (feminine), No es bonito versus No es bonita. The presence of no does not affect agreement at all. The answer is simple: the only thing negation adds is no before the linking word es; everything else about the phrase\'s structure stays the same.',
  'pt-BR': 'A fórmula é a mesma de no soy e no eres: no + ligação + qualidade, sem exceções. No es caro, não Es no caro e não No caro es. A qualidade depois de es concorda com o gênero daquilo de que se fala exatamente como sem negação: No es caro (padrão ou masculino) contra No es cara (feminino), No es bonito contra No es bonita. A presença de no não afeta a concordância em nada. A resposta é simples: a única coisa que a negação acrescenta é no antes da ligação es; todo o resto da estrutura da frase continua igual.',
  vi: 'Công thức giống hệt như với no soy và no eres: no + từ nối + đặc điểm, không ngoại lệ. No es caro, không phải Es no caro và không phải No caro es. Đặc điểm sau es hòa hợp với giống của điều đang được nói tới y hệt như không có phủ định: No es caro (mặc định hoặc giống đực) so với No es cara (giống cái), No es bonito so với No es bonita. Sự có mặt của no hoàn toàn không ảnh hưởng đến sự hòa hợp. Câu trả lời rất đơn giản: điều duy nhất phủ định thêm vào là no trước từ nối es; mọi thứ khác trong cấu trúc câu vẫn giữ nguyên.',
  id: 'Rumusnya sama seperti untuk no soy dan no eres: no + kata penghubung + sifat, tanpa pengecualian. No es caro, bukan Es no caro dan bukan No caro es. Sifat setelah es sesuai dengan gender dari apa yang dibicarakan persis seperti tanpa negasi: No es caro (default atau maskulin) versus No es cara (feminin), No es bonito versus No es bonita. Kehadiran no sama sekali tidak memengaruhi kesesuaian. Jawabannya sederhana: satu-satunya hal yang ditambahkan negasi adalah no sebelum kata penghubung es; sisanya dari struktur frasa tetap sama.',
  tr: 'Formül, no soy ve no eres için olanla aynıdır: no + bağlaç + nitelik, istisnasız. No es caro, Es no caro değil ve No caro es değil. Es’ten sonraki nitelik, söz konusu olanın cinsiyetiyle, olumsuzlama olmadan olduğu gibi uyumludur: No es caro (varsayılan ya da eril) karşısında No es cara (dişil), No es bonito karşısında No es bonita. No’nun varlığı uyumu hiç etkilemez. Cevap basittir: olumsuzlamanın eklediği tek şey es bağlacından önceki no’dur; ifadenin geri kalan yapısı aynı kalır.',
  pl: 'Formuła jest taka sama jak dla no soy i no eres: no + łącznik + cecha, bez wyjątków. No es caro, nie Es no caro i nie No caro es. Cecha po es zgadza się z rodzajem tego, o czym mowa, dokładnie tak samo jak bez przeczenia: No es caro (domyślnie lub rodzaj męski) kontra No es cara (rodzaj żeński), No es bonito kontra No es bonita. Sama obecność no wcale nie wpływa na zgodność. Odpowiedź jest prosta: jedyne, co dodaje przeczenie, to no przed łącznikiem es; cała reszta budowy frazy pozostaje taka sama.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — поставить no не перед связкой, а перед признаком: Es no caro вместо No es caro. По-испански no всегда идёт первым, сразу перед es, а не где-то в середине фразы. Вторая ловушка — спутать связку с eres, потому что тема совсем недавняя: если фраза оценивает вещь, факт или ситуацию, а не обращается к живому собеседнику напрямую, — нужна именно es, а не eres. Проверка простая: сначала no, потом es, только затем признак — и если признак согласуется по роду, форма должна совпадать с тем, о чём идёт речь, а не с говорящим.',
  uk: 'Найчастіша помилка — поставити no не перед зв’язкою, а перед ознакою: Es no caro замість No es caro. В іспанській no завжди йде першим, одразу перед es, а не десь усередині фрази. Друга пастка — сплутати зв’язку з eres, бо тема зовсім недавня: якщо фраза оцінює річ, факт чи ситуацію, а не звертається до живого співрозмовника напряму, — потрібна саме es, а не eres. Перевірка проста: спочатку no, потім es, тільки після — ознака — і якщо ознака узгоджується за родом, форма має збігатися з тим, про що йдеться, а не з мовцем.',
  es: 'The most common mistake is placing no not before the linking word, but before the quality: Es no caro instead of No es caro. In Spanish no always comes first, right before es, not somewhere in the middle of the phrase. The second trap is confusing the linking word with eres, because the topic is quite recent: if the phrase evaluates a thing, fact, or situation, and does not address a living listener directly, you need exactly es, not eres. The check is simple: first no, then es, only then the quality — and if the quality agrees by gender, the form must match what is being discussed, not the speaker.',
  'pt-BR': 'O erro mais comum é colocar no não antes da ligação, mas antes da qualidade: Es no caro em vez de No es caro. Em espanhol no sempre vem primeiro, logo antes de es, não em algum lugar no meio da frase. A segunda armadilha é confundir a ligação com eres, porque o tema é bem recente: se a frase avalia uma coisa, fato ou situação, e não fala diretamente com um interlocutor vivo, precisa exatamente de es, não de eres. A checagem é simples: primeiro no, depois es, só então a qualidade — e se a qualidade concorda em gênero, a forma deve corresponder àquilo de que se fala, não a quem fala.',
  vi: 'Lỗi phổ biến nhất là đặt no không phải trước từ nối, mà trước đặc điểm: Es no caro thay vì No es caro. Trong tiếng Tây Ban Nha no luôn đứng đầu, ngay trước es, không phải ở đâu đó giữa câu. Cái bẫy thứ hai là nhầm từ nối với eres, vì chủ đề khá gần đây: nếu câu đánh giá một vật, sự thật, hay tình huống, và không nói trực tiếp với một người nghe sống, thì cần chính xác es, không phải eres. Cách kiểm tra đơn giản: trước tiên no, rồi đến es, chỉ sau đó mới đến đặc điểm — và nếu đặc điểm hòa hợp theo giống, dạng phải khớp với điều đang được nói tới, không phải người nói.',
  id: 'Kesalahan paling umum adalah meletakkan no bukan sebelum kata penghubung, tetapi sebelum sifat: Es no caro alih-alih No es caro. Dalam bahasa Spanyol no selalu datang pertama, tepat sebelum es, bukan di suatu tempat di tengah frasa. Jebakan kedua adalah mengacaukan kata penghubung dengan eres, karena topiknya cukup baru: jika frasa menilai benda, fakta, atau situasi, dan tidak berbicara langsung dengan pendengar yang hidup, maka perlu tepat es, bukan eres. Pengecekannya sederhana: pertama no, lalu es, baru kemudian sifat — dan jika sifatnya sesuai gender, bentuknya harus cocok dengan apa yang dibicarakan, bukan penuturnya.',
  tr: 'En yaygın hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: No es caro yerine Es no caro. İspanyolcada no her zaman önce gelir, tam es’ten önce, ifadenin ortasında bir yerde değil. İkinci tuzak, bağlacı eres ile karıştırmaktır, çünkü konu oldukça yeni: ifade bir şeyi, gerçeği ya da durumu değerlendiriyorsa ve canlı bir dinleyiciye doğrudan hitap etmiyorsa, tam olarak es gerekir, eres değil. Kontrol basittir: önce no, sonra es, ancak ondan sonra nitelik — ve nitelik cinsiyete göre uyumluysa, biçim konuşanla değil, söz konusu olanla eşleşmelidir.',
  pl: 'Najczęstszy błąd to postawienie no nie przed łącznikiem, lecz przed cechą: Es no caro zamiast No es caro. W hiszpańskim no zawsze idzie pierwsze, tuż przed es, a nie gdzieś w środku frazy. Druga pułapka to pomylenie łącznika z eres, ponieważ temat jest dość niedawny: jeśli fraza ocenia rzecz, fakt lub sytuację i nie zwraca się bezpośrednio do żywego słuchacza, potrzeba dokładnie es, nie eres. Sprawdzenie jest proste: najpierw no, potem es, dopiero potem cecha — a jeśli cecha zgadza się pod względem rodzaju, forma musi pasować do tego, o czym mowa, a nie do mówiącego.',
});

export const ES_EPISODE_01_SESSION_19_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Отрицание и третье лицо соединяются без изменений',
      uk: 'Заперечення і третя особа з’єднуються без змін',
      es: 'Negation and the third person join without changes',
      'pt-BR': 'Negação e terceira pessoa se juntam sem mudanças',
      vi: 'Phủ định và ngôi thứ ba kết hợp mà không thay đổi',
      id: 'Negasi dan orang ketiga bergabung tanpa perubahan',
      tr: 'Olumsuzlama ve üçüncü kişi değişiklik olmadan birleşir',
      pl: 'Przeczenie i trzecia osoba łączą się bez zmian',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'No es fácil, No es verdad — эта формула отрицания уже встречалась раньше. А недавно появилась es — форма связки ser для предметов и ситуаций, не для говорящего и не для собеседника: Es caro, Es bonito. Соединить их просто: no встаёт прямо перед es, а признак после es не меняется от отрицания вовсе — ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ' отрицает цену предмета точно так же, как ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' отрицало сложность задачи. Ответ прост: формула no + es + признак работает для любого предмета или ситуации, без единого нового слова.', semantic: 'explanation' }),
      uk: R({ text: 'No es fácil, No es verdad — ця формула заперечення вже траплялася раніше. А нещодавно з’явилася es — форма зв’язки ser для предметів і ситуацій, не для мовця і не для співрозмовника: Es caro, Es bonito. З’єднати їх просто: no стоїть прямо перед es, а ознака після es не змінюється від заперечення взагалі — ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ' заперечує ціну предмета точно так само, як ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' заперечувало складність завдання. Відповідь проста: формула no + es + ознака працює для будь-якого предмета чи ситуації, без жодного нового слова.', semantic: 'explanation' }),
      es: R({ text: 'No es fácil, No es verdad — this negation formula has already appeared before. And recently es appeared — the form of the linking word ser for things and situations, not the speaker and not the listener: Es caro, Es bonito. Joining them is simple: no goes right before es, and the quality after es does not change from negation at all — ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ' negates a thing\'s price the same way ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' negated a task\'s difficulty. The answer is simple: the formula no + es + quality works for any thing or situation, without a single new word.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'No es fácil, No es verdad — essa fórmula de negação já apareceu antes. E recentemente apareceu es — a forma da ligação ser para coisas e situações, não para quem fala nem para o interlocutor: Es caro, Es bonito. Juntá-las é simples: no fica bem antes de es, e a qualidade depois de es não muda nada com a negação — ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ' nega o preço de uma coisa do mesmo jeito que ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' negava a dificuldade de uma tarefa. A resposta é simples: a fórmula no + es + qualidade funciona para qualquer coisa ou situação, sem nenhuma palavra nova.', semantic: 'explanation' }),
      vi: R({ text: 'No es fácil, No es verdad — công thức phủ định này đã xuất hiện từ trước. Và gần đây es đã xuất hiện — dạng của từ nối ser cho vật và tình huống, không phải người nói cũng không phải người nghe: Es caro, Es bonito. Ghép chúng lại rất đơn giản: no đứng ngay trước es, và đặc điểm sau es hoàn toàn không đổi vì phủ định — ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ' phủ định giá của một vật giống hệt cách ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' phủ định độ khó của một nhiệm vụ. Câu trả lời rất đơn giản: công thức no + es + đặc điểm hoạt động cho bất kỳ vật hay tình huống nào, không có một từ mới nào cả.', semantic: 'explanation' }),
      id: R({ text: 'No es fácil, No es verdad — rumus negasi ini sudah pernah muncul sebelumnya. Dan baru-baru ini es muncul — bentuk kata penghubung ser untuk benda dan situasi, bukan penutur maupun pendengar: Es caro, Es bonito. Menggabungkannya sederhana: no berada tepat sebelum es, dan sifat setelah es sama sekali tidak berubah karena negasi — ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ' menegasikan harga suatu benda persis seperti ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' menegasikan kesulitan suatu tugas. Jawabannya sederhana: rumus no + es + sifat bekerja untuk benda atau situasi apa pun, tanpa satu kata baru pun.', semantic: 'explanation' }),
      tr: R({ text: 'No es fácil, No es verdad — bu olumsuzlama formülü daha önce de ortaya çıkmıştı. Ve kısa süre önce es ortaya çıktı — ser bağlacının nesneler ve durumlar için biçimi, ne konuşan ne de dinleyici için: Es caro, Es bonito. Onları birleştirmek basittir: no tam olarak es’ten önce gelir ve es’ten sonraki nitelik olumsuzlamadan hiç değişmez — ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ' bir şeyin fiyatını, ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: '’in bir görevin zorluğunu olumsuzladığı gibi olumsuzlar. Cevap basittir: no + es + nitelik formülü, hiç yeni bir kelime olmadan herhangi bir şey ya da durum için çalışır.', semantic: 'explanation' }),
      pl: R({ text: 'No es fácil, No es verdad — ta formuła przeczenia już wcześniej się pojawiała. A niedawno pojawiło się es — forma łącznika ser dla rzeczy i sytuacji, nie dla mówiącego ani słuchacza: Es caro, Es bonito. Połączenie ich jest proste: no stoi tuż przed es, a cecha po es wcale się nie zmienia przez przeczenie — ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ' zaprzecza cenie rzeczy dokładnie tak, jak ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' zaprzeczało trudności zadania. Odpowiedź jest prosta: formuła no + es + cecha działa dla dowolnej rzeczy lub sytuacji, bez ani jednego nowego słowa.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как отрицают оценку предмета или ситуации?',
        uk: 'Як заперечують оцінку предмета чи ситуації?',
        es: 'How do you negate the evaluation of a thing or situation?',
        'pt-BR': 'Como se nega a avaliação de uma coisa ou situação?',
        vi: 'Làm thế nào để phủ định đánh giá về một vật hay tình huống?',
        id: 'Bagaimana cara menegasikan penilaian atas benda atau situasi?',
        tr: 'Bir şeyin ya da durumun değerlendirmesi nasıl olumsuzlanır?',
        pl: 'Jak zaprzecza się ocenie rzeczy lub sytuacji?',
      }),
      choices: [
        L({ ru: 'No es caro', uk: 'No es caro', es: 'No es caro', 'pt-BR': 'No es caro', vi: 'No es caro', id: 'No es caro', tr: 'No es caro', pl: 'No es caro' }),
        L({ ru: 'Es no caro', uk: 'Es no caro', es: 'Es no caro', 'pt-BR': 'Es no caro', vi: 'Es no caro', id: 'Es no caro', tr: 'Es no caro', pl: 'Es no caro' }),
        L({ ru: 'No eres caro', uk: 'No eres caro', es: 'No eres caro', 'pt-BR': 'No eres caro', vi: 'No eres caro', id: 'No eres caro', tr: 'No eres caro', pl: 'No eres caro' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No es caro верно: no встаёт прямо перед связкой es, а признак caro не меняется от отрицания.',
        uk: 'No es caro правильно: no стоїть прямо перед зв’язкою es, а ознака caro не змінюється від заперечення.',
        es: 'No es caro is correct: no goes right before the linking word es, and the quality caro does not change from negation.',
        'pt-BR': 'No es caro está correto: no fica bem antes da ligação es, e a qualidade caro não muda com a negação.',
        vi: 'No es caro đúng: no đứng ngay trước từ nối es, và đặc điểm caro không đổi vì phủ định.',
        id: 'No es caro benar: no berada tepat sebelum kata penghubung es, dan sifat caro tidak berubah karena negasi.',
        tr: 'No es caro doğrudur: no tam olarak es bağlacından önce gelir ve caro niteliği olumsuzlamadan değişmez.',
        pl: 'No es caro jest poprawne: no stoi tuż przed łącznikiem es, a cecha caro nie zmienia się przez przeczenie.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Согласование по роду не зависит от no',
      uk: 'Узгодження за родом не залежить від no',
      es: 'Gender agreement does not depend on no',
      'pt-BR': 'A concordância de gênero não depende de no',
      vi: 'Sự hòa hợp giống không phụ thuộc vào no',
      id: 'Kesesuaian gender tidak bergantung pada no',
      tr: 'Cinsiyet uyumu no’ya bağlı değildir',
      pl: 'Zgodność rodzaju nie zależy od no',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула та же, что и для no soy и no eres: no + связка + признак, без исключений. ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ', а не Es no caro и не No caro es. Признак после es согласуется с родом того, о чём речь, точно так же, как и без отрицания: No es caro (по умолчанию или мужской род) — ', semantic: 'explanation' }, { text: 'No es cara', semantic: 'targetCorrect' }, { text: ' (женский род), No es bonito — No es bonita. Само наличие no на согласование не влияет вовсе. Ответ прост: единственное, что добавляет отрицание, — это no перед связкой es; всё остальное устройство фразы остаётся прежним.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й для no soy та no eres: no + зв’язка + ознака, без винятків. ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ', а не Es no caro і не No caro es. Ознака після es узгоджується з родом того, про що йдеться, точно так само, як і без заперечення: No es caro (за замовчуванням чи чоловічий рід) — ', semantic: 'explanation' }, { text: 'No es cara', semantic: 'targetCorrect' }, { text: ' (жіночий рід), No es bonito — No es bonita. Сама наявність no на узгодження не впливає взагалі. Відповідь проста: єдине, що додає заперечення, — це no перед зв’язкою es; решта устрою фрази лишається незмінною.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for no soy and no eres: no + linking word + quality, without exceptions. ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ', not Es no caro and not No caro es. The quality after es agrees with the gender of what is being discussed exactly as it does without negation: No es caro (default or masculine) versus ', semantic: 'explanation' }, { text: 'No es cara', semantic: 'targetCorrect' }, { text: ' (feminine), No es bonito versus No es bonita. The presence of no does not affect agreement at all. The answer is simple: the only thing negation adds is no before the linking word es; everything else about the phrase\'s structure stays the same.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de no soy e no eres: no + ligação + qualidade, sem exceções. ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ', não Es no caro e não No caro es. A qualidade depois de es concorda com o gênero daquilo de que se fala exatamente como sem negação: No es caro (padrão ou masculino) contra ', semantic: 'explanation' }, { text: 'No es cara', semantic: 'targetCorrect' }, { text: ' (feminino), No es bonito contra No es bonita. A presença de no não afeta a concordância em nada. A resposta é simples: a única coisa que a negação acrescenta é no antes da ligação es; todo o resto da estrutura da frase continua igual.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống hệt như với no soy và no eres: no + từ nối + đặc điểm, không ngoại lệ. ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ', không phải Es no caro và không phải No caro es. Đặc điểm sau es hòa hợp với giống của điều đang được nói tới y hệt như không có phủ định: No es caro (mặc định hoặc giống đực) so với ', semantic: 'explanation' }, { text: 'No es cara', semantic: 'targetCorrect' }, { text: ' (giống cái), No es bonito so với No es bonita. Sự có mặt của no hoàn toàn không ảnh hưởng đến sự hòa hợp. Câu trả lời rất đơn giản: điều duy nhất phủ định thêm vào là no trước từ nối es; mọi thứ khác trong cấu trúc câu vẫn giữ nguyên.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti untuk no soy dan no eres: no + kata penghubung + sifat, tanpa pengecualian. ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ', bukan Es no caro dan bukan No caro es. Sifat setelah es sesuai dengan gender dari apa yang dibicarakan persis seperti tanpa negasi: No es caro (default atau maskulin) versus ', semantic: 'explanation' }, { text: 'No es cara', semantic: 'targetCorrect' }, { text: ' (feminin), No es bonito versus No es bonita. Kehadiran no sama sekali tidak memengaruhi kesesuaian. Jawabannya sederhana: satu-satunya hal yang ditambahkan negasi adalah no sebelum kata penghubung es; sisanya dari struktur frasa tetap sama.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, no soy ve no eres için olanla aynıdır: no + bağlaç + nitelik, istisnasız. ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ', Es no caro değil ve No caro es değil. Es’ten sonraki nitelik, söz konusu olanın cinsiyetiyle, olumsuzlama olmadan olduğu gibi uyumludur: No es caro (varsayılan ya da eril) karşısında ', semantic: 'explanation' }, { text: 'No es cara', semantic: 'targetCorrect' }, { text: ' (dişil), No es bonito karşısında No es bonita. No’nun varlığı uyumu hiç etkilemez. Cevap basittir: olumsuzlamanın eklediği tek şey es bağlacından önceki no’dur; ifadenin geri kalan yapısı aynı kalır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla no soy i no eres: no + łącznik + cecha, bez wyjątków. ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ', nie Es no caro i nie No caro es. Cecha po es zgadza się z rodzajem tego, o czym mowa, dokładnie tak samo jak bez przeczenia: No es caro (domyślnie lub rodzaj męski) kontra ', semantic: 'explanation' }, { text: 'No es cara', semantic: 'targetCorrect' }, { text: ' (rodzaj żeński), No es bonito kontra No es bonita. Sama obecność no wcale nie wpływa na zgodność. Odpowiedź jest prosta: jedyne, co dodaje przeczenie, to no przed łącznikiem es; cała reszta budowy frazy pozostaje taka sama.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Про вещь женского рода — как верно возразить про цену?',
        uk: 'Про річ жіночого роду — як правильно заперечити про ціну?',
        es: 'About a feminine thing — how do you correctly object about the price?',
        'pt-BR': 'Sobre uma coisa feminina — como objetar corretamente sobre o preço?',
        vi: 'Về một vật giống cái — làm sao để phản đối đúng cách về giá?',
        id: 'Tentang benda feminin — bagaimana cara menolak dengan benar tentang harga?',
        tr: 'Dişil bir şey hakkında — fiyata doğru nasıl itiraz edilir?',
        pl: 'O rzeczy rodzaju żeńskiego — jak poprawnie zaprzeczyć co do ceny?',
      }),
      choices: [
        L({ ru: 'No es cara', uk: 'No es cara', es: 'No es cara', 'pt-BR': 'No es cara', vi: 'No es cara', id: 'No es cara', tr: 'No es cara', pl: 'No es cara' }),
        L({ ru: 'No es caro', uk: 'No es caro', es: 'No es caro', 'pt-BR': 'No es caro', vi: 'No es caro', id: 'No es caro', tr: 'No es caro', pl: 'No es caro' }),
        L({ ru: 'No eres cara', uk: 'No eres cara', es: 'No eres cara', 'pt-BR': 'No eres cara', vi: 'No eres cara', id: 'No eres cara', tr: 'No eres cara', pl: 'No eres cara' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No es cara верно: связка es для предмета плюс признак с окончанием -a для женского рода. No es caro путает род, No eres cara путает связку — это уже обращение к собеседнице.',
        uk: 'No es cara правильно: зв’язка es для предмета плюс ознака із закінченням -a для жіночого роду. No es caro плутає рід, No eres cara плутає зв’язку — це вже звернення до співрозмовниці.',
        es: 'No es cara is correct: the linking word es for a thing plus the quality ending in -a for feminine. No es caro mixes up the gender, No eres cara mixes up the linking word — that already addresses a listener.',
        'pt-BR': 'No es cara está correto: a ligação es para uma coisa mais a qualidade terminada em -a para feminino. No es caro confunde o gênero, No eres cara confunde a ligação — isso já fala com uma interlocutora.',
        vi: 'No es cara đúng: từ nối es cho một vật cộng với đặc điểm kết thúc bằng -a cho giống cái. No es caro nhầm giống, No eres cara nhầm từ nối — câu đó đã nói với người nghe rồi.',
        id: 'No es cara benar: kata penghubung es untuk benda ditambah sifat berakhiran -a untuk feminin. No es caro salah gender, No eres cara salah kata penghubung — itu sudah berbicara dengan pendengar.',
        tr: 'No es cara doğrudur: bir şey için es bağlacı, artı dişil için -a ile biten nitelik. No es caro cinsiyeti karıştırır, No eres cara ise bağlacı karıştırır — bu zaten bir dinleyiciye hitap eder.',
        pl: 'No es cara jest poprawne: łącznik es dla rzeczy plus cecha zakończona na -a dla rodzaju żeńskiego. No es caro myli rodzaj, No eres cara myli łącznik — to już zwrot do słuchaczki.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'No перед es, не перед признаком',
      uk: 'No перед es, не перед ознакою',
      es: 'No before es, not before the quality',
      'pt-BR': 'No antes de es, não antes da qualidade',
      vi: 'No trước es, không phải trước đặc điểm',
      id: 'No sebelum es, bukan sebelum sifat',
      tr: 'No es’ten önce, niteliğin önünde değil',
      pl: 'No przed es, nie przed cechą',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — поставить no не перед связкой, а перед признаком: ', semantic: 'explanation' }, { text: 'Es no caro', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: '. По-испански no всегда идёт первым, сразу перед es, а не где-то в середине фразы. Вторая ловушка — спутать связку с eres, потому что тема совсем недавняя: если фраза оценивает вещь, факт или ситуацию, а не обращается к живому собеседнику напрямую, — нужна именно es, а не eres. Проверка простая: сначала no, потом es, только затем признак — и если признак согласуется по роду, форма должна совпадать с тем, о чём идёт речь, а не с говорящим.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — поставити no не перед зв’язкою, а перед ознакою: ', semantic: 'explanation' }, { text: 'Es no caro', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: '. В іспанській no завжди йде першим, одразу перед es, а не десь усередині фрази. Друга пастка — сплутати зв’язку з eres, бо тема зовсім недавня: якщо фраза оцінює річ, факт чи ситуацію, а не звертається до живого співрозмовника напряму, — потрібна саме es, а не eres. Перевірка проста: спочатку no, потім es, тільки після — ознака — і якщо ознака узгоджується за родом, форма має збігатися з тим, про що йдеться, а не з мовцем.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is placing no not before the linking word, but before the quality: ', semantic: 'explanation' }, { text: 'Es no caro', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: '. In Spanish no always comes first, right before es, not somewhere in the middle of the phrase. The second trap is confusing the linking word with eres, because the topic is quite recent: if the phrase evaluates a thing, fact, or situation, and does not address a living listener directly, you need exactly es, not eres. The check is simple: first no, then es, only then the quality — and if the quality agrees by gender, the form must match what is being discussed, not the speaker.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é colocar no não antes da ligação, mas antes da qualidade: ', semantic: 'explanation' }, { text: 'Es no caro', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: '. Em espanhol no sempre vem primeiro, logo antes de es, não em algum lugar no meio da frase. A segunda armadilha é confundir a ligação com eres, porque o tema é bem recente: se a frase avalia uma coisa, fato ou situação, e não fala diretamente com um interlocutor vivo, precisa exatamente de es, não de eres. A checagem é simples: primeiro no, depois es, só então a qualidade — e se a qualidade concorda em gênero, a forma deve corresponder àquilo de que se fala, não a quem fala.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là đặt no không phải trước từ nối, mà trước đặc điểm: ', semantic: 'explanation' }, { text: 'Es no caro', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: '. Trong tiếng Tây Ban Nha no luôn đứng đầu, ngay trước es, không phải ở đâu đó giữa câu. Cái bẫy thứ hai là nhầm từ nối với eres, vì chủ đề khá gần đây: nếu câu đánh giá một vật, sự thật, hay tình huống, và không nói trực tiếp với một người nghe sống, thì cần chính xác es, không phải eres. Cách kiểm tra đơn giản: trước tiên no, rồi đến es, chỉ sau đó mới đến đặc điểm — và nếu đặc điểm hòa hợp theo giống, dạng phải khớp với điều đang được nói tới, không phải người nói.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah meletakkan no bukan sebelum kata penghubung, tetapi sebelum sifat: ', semantic: 'explanation' }, { text: 'Es no caro', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: '. Dalam bahasa Spanyol no selalu datang pertama, tepat sebelum es, bukan di suatu tempat di tengah frasa. Jebakan kedua adalah mengacaukan kata penghubung dengan eres, karena topiknya cukup baru: jika frasa menilai benda, fakta, atau situasi, dan tidak berbicara langsung dengan pendengar yang hidup, maka perlu tepat es, bukan eres. Pengecekannya sederhana: pertama no, lalu es, baru kemudian sifat — dan jika sifatnya sesuai gender, bentuknya harus cocok dengan apa yang dibicarakan, bukan penuturnya.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Es no caro', semantic: 'targetWrong' }, { text: '. İspanyolcada no her zaman önce gelir, tam es’ten önce, ifadenin ortasında bir yerde değil. İkinci tuzak, bağlacı eres ile karıştırmaktır, çünkü konu oldukça yeni: ifade bir şeyi, gerçeği ya da durumu değerlendiriyorsa ve canlı bir dinleyiciye doğrudan hitap etmiyorsa, tam olarak es gerekir, eres değil. Kontrol basittir: önce no, sonra es, ancak ondan sonra nitelik — ve nitelik cinsiyete göre uyumluysa, biçim konuşanla değil, söz konusu olanla eşleşmelidir.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to postawienie no nie przed łącznikiem, lecz przed cechą: ', semantic: 'explanation' }, { text: 'Es no caro', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'No es caro', semantic: 'targetCorrect' }, { text: '. W hiszpańskim no zawsze idzie pierwsze, tuż przed es, a nie gdzieś w środku frazy. Druga pułapka to pomylenie łącznika z eres, ponieważ temat jest dość niedawny: jeśli fraza ocenia rzecz, fakt lub sytuację i nie zwraca się bezpośrednio do żywego słuchacza, potrzeba dokładnie es, nie eres. Sprawdzenie jest proste: najpierw no, potem es, dopiero potem cecha — a jeśli cecha zgadza się pod względem rodzaju, forma musi pasować do tego, o czym mowa, a nie do mówiącego.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно возразить про цену дешёвого предмета?',
        uk: 'Як правильно заперечити про ціну дешевого предмета?',
        es: 'How do you correctly object about the price of an inexpensive thing?',
        'pt-BR': 'Como objetar corretamente sobre o preço de uma coisa barata?',
        vi: 'Làm sao để phản đối đúng cách về giá của một món hàng rẻ?',
        id: 'Bagaimana cara menolak dengan benar tentang harga benda yang murah?',
        tr: 'Ucuz bir şeyin fiyatına doğru nasıl itiraz edilir?',
        pl: 'Jak poprawnie sprzeciwić się co do ceny taniej rzeczy?',
      }),
      choices: [
        L({ ru: 'No es caro', uk: 'No es caro', es: 'No es caro', 'pt-BR': 'No es caro', vi: 'No es caro', id: 'No es caro', tr: 'No es caro', pl: 'No es caro' }),
        L({ ru: 'Es no caro', uk: 'Es no caro', es: 'Es no caro', 'pt-BR': 'Es no caro', vi: 'Es no caro', id: 'Es no caro', tr: 'Es no caro', pl: 'Es no caro' }),
        L({ ru: 'No eres caro', uk: 'No eres caro', es: 'No eres caro', 'pt-BR': 'No eres caro', vi: 'No eres caro', id: 'No eres caro', tr: 'No eres caro', pl: 'No eres caro' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No es caro верно, потому что no стоит перед связкой es, а сама связка — та, что для предмета или ситуации, не для собеседника.',
        uk: 'No es caro правильно, бо no стоїть перед зв’язкою es, а сама зв’язка — та, що для предмета чи ситуації, не для співрозмовника.',
        es: 'No es caro is correct because no stands before the linking word es, and the linking word itself is the one for a thing or situation, not for a listener.',
        'pt-BR': 'No es caro está correto porque no fica antes da ligação es, e a própria ligação é a que serve para uma coisa ou situação, não para um interlocutor.',
        vi: 'No es caro đúng vì no đứng trước từ nối es, và bản thân từ nối là từ dùng cho một vật hay tình huống, không phải cho người nghe.',
        id: 'No es caro benar karena no berada sebelum kata penghubung es, dan kata penghubung itu sendiri adalah yang untuk benda atau situasi, bukan untuk pendengar.',
        tr: 'No es caro doğrudur çünkü no, es bağlacından önce durur ve bağlacın kendisi bir şey ya da durum içindir, bir dinleyici için değil.',
        pl: 'No es caro jest poprawne, ponieważ no stoi przed łącznikiem es, a sam łącznik jest tym dla rzeczy lub sytuacji, nie dla słuchacza.',
      }),
    },
  },
];
