import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 13 "Местоимение не нужно" / pronoun_drop, builtOn: [9, 10],
// recalls: [1, 9]): три страницы объясняют, что испанский обычно опускает
// подлежащее-местоимение (tú/yo), потому что окончание глагола само
// называет лицо. Тема раскрывается ТОЛЬКО здесь — карточки-практика
// используют обычную уже известную грамматику (решение по прецеденту
// сессии 10, подтверждено research-агентом 2026-08-25).
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_13_TITLE = L({
  ru: 'Местоимение не нужно',
  uk: 'Займенник не потрібен',
  es: 'The pronoun is not needed',
  'pt-BR': 'O pronome não é necessário',
  vi: 'Không cần đại từ',
  id: 'Kata ganti tidak diperlukan',
  tr: 'Zamire gerek yok',
  pl: 'Zaimek nie jest potrzebny',
});

export const ES_EPISODE_01_SESSION_13_SUMMARY = L({
  ru: 'Окончание связки само называет, о ком речь, поэтому tú и yo обычно остаются за кадром.',
  uk: 'Закінчення зв’язки саме називає, про кого йдеться, тому tú та yo зазвичай лишаються за кадром.',
  es: 'The ending of the linking word already names who is being talked about, so tú and yo usually stay off-screen.',
  'pt-BR': 'A terminação da ligação já nomeia de quem se fala, então tú e yo geralmente ficam fora da frase.',
  vi: 'Đuôi của từ nối đã gọi tên người được nói tới, nên tú và yo thường không xuất hiện.',
  id: 'Akhiran kata penghubung sudah menyebut siapa yang dibicarakan, jadi tú dan yo biasanya tidak ditampilkan.',
  tr: 'Bağlacın sonu, kimden bahsedildiğini zaten adlandırır, bu yüzden tú ve yo genellikle görünmez.',
  pl: 'Końcówka łącznika już nazywa, o kim mowa, więc tú i yo zwykle pozostają niewypowiedziane.',
});

export const ES_EPISODE_01_SESSION_13_GOAL = L({
  ru: 'Понять, почему испанские фразы обычно звучат без tú и yo, и уверенно строить их без лишнего местоимения.',
  uk: 'Зрозуміти, чому іспанські фрази зазвичай звучать без tú та yo, і впевнено будувати їх без зайвого займенника.',
  es: 'Understand why Spanish phrases usually sound without tú and yo, and confidently build them without the extra pronoun.',
  'pt-BR': 'Entender por que as frases em espanhol geralmente soam sem tú e yo, e construí-las com confiança sem o pronome extra.',
  vi: 'Hiểu tại sao các câu tiếng Tây Ban Nha thường không có tú và yo, và tự tin xây dựng chúng mà không cần đại từ thừa.',
  id: 'Memahami mengapa frasa bahasa Spanyol biasanya terdengar tanpa tú dan yo, dan membangunnya dengan percaya diri tanpa kata ganti tambahan.',
  tr: 'İspanyolca ifadelerin genellikle neden tú ve yo olmadan duyulduğunu anlamak ve fazladan zamir olmadan güvenle kurmak.',
  pl: 'Zrozumieć, dlaczego hiszpańskie frazy zwykle brzmią bez tú i yo, i pewnie je budować bez zbędnego zaimka.',
});

const CONCEPT_BODY = L({
  ru: 'Во многих языках подлежащее почти всегда называют отдельным словом рядом с глаголом. В испанском окончание самой связки уже показывает, о ком речь: -es в eres звучит только с «ты», -oy в soy — только с «я». Поэтому Tú eres bonito и Eres bonito означают ровно одно и то же — второй вариант просто короче и звучит естественнее, ведь местоимение здесь ничего нового не добавляет. Это не сокращение и не небрежность, а обычная норма испанской речи, которую используют в любой ситуации. Ответ прост: окончание eres само называет «ты», и лишнее местоимение не нужно.',
  uk: 'У багатьох мовах підмет майже завжди називають окремим словом поруч із дієсловом. В іспанській закінчення самої зв’язки вже показує, про кого йдеться: -es в eres звучить тільки з «ти», -oy в soy — тільки з «я». Тому Tú eres bonito та Eres bonito означають рівно те саме — другий варіант просто коротший і звучить природніше, адже займенник тут нічого нового не додає. Це не скорочення і не недбалість, а звичайна норма іспанської мови, яку використовують у будь-якій ситуації. Відповідь проста: закінчення eres саме називає «ти», і зайвий займенник не потрібен.',
  es: 'In many languages the subject is almost always named by a separate word next to the verb. In Spanish the ending of the linking word itself already shows who is being talked about: -es in eres sounds only with "you", -oy in soy only with "I". So Tú eres bonito and Eres bonito mean exactly the same thing — the second version is simply shorter and sounds more natural, since the pronoun adds nothing new here. The answer is simple: the ending of eres already names "you".',
  'pt-BR': 'Em português e inglês o sujeito quase sempre é nomeado por uma palavra separada: "você é rápido", "you are fast". Em espanhol a terminação da própria ligação já mostra de quem se fala: -es em eres soa só com "tú", -oy em soy só com "yo". Por isso Tú eres bonito e Eres bonito significam exatamente a mesma coisa — a segunda versão é só mais curta e soa mais natural, já que o pronome não acrescenta nada de novo aqui. A resposta é simples: a terminação de eres já nomeia "tú".',
  vi: 'Trong nhiều ngôn ngữ, chủ ngữ hầu như luôn được gọi tên bằng một từ riêng bên cạnh động từ. Trong tiếng Tây Ban Nha, đuôi của chính từ nối đã cho thấy đang nói về ai: -es trong eres chỉ vang lên với "tú", -oy trong soy chỉ với "yo". Vì vậy Tú eres bonito và Eres bonito có nghĩa hoàn toàn giống nhau — phiên bản thứ hai chỉ ngắn hơn và nghe tự nhiên hơn, vì đại từ ở đây không thêm gì mới. Câu trả lời rất đơn giản: đuôi của eres đã tự gọi tên "tú".',
  id: 'Dalam banyak bahasa lain, subjek hampir selalu disebut dengan kata terpisah di samping kata kerja. Dalam bahasa Spanyol, akhiran dari kata penghubung itu sendiri sudah menunjukkan siapa yang dibicarakan: -es dalam eres hanya terdengar dengan "tú", -oy dalam soy hanya dengan "yo". Jadi Tú eres bonito dan Eres bonito berarti persis sama — versi kedua hanya lebih pendek dan terdengar lebih alami, karena kata ganti di sini tidak menambahkan apa pun yang baru. Ini bukan jalan pintas, melainkan norma biasa dalam bahasa Spanyol lisan. Jawabannya sederhana: akhiran eres sudah menyebut "tú".',
  tr: 'Birçok dilde özne neredeyse her zaman fiilin yanında ayrı bir kelimeyle adlandırılır. İspanyolcada bağlacın sonu, kimden bahsedildiğini zaten gösterir: eres’teki -es yalnızca "tú" ile duyulur, soy’daki -oy yalnızca "yo" ile. Bu yüzden Tú eres bonito ve Eres bonito tam olarak aynı anlama gelir — ikinci biçim sadece daha kısadır ve daha doğal duyulur, çünkü zamir burada yeni bir şey eklemez. Cevap basittir: eres’in sonu zaten "tú"yu adlandırır.',
  pl: 'W wielu językach podmiot niemal zawsze jest nazywany osobnym słowem obok czasownika. W hiszpańskim końcówka samego łącznika już pokazuje, o kim mowa: -es w eres brzmi tylko z „tú”, -oy w soy tylko z „yo”. Dlatego Tú eres bonito i Eres bonito znaczą dokładnie to samo — druga wersja jest po prostu krótsza i brzmi bardziej naturalnie, bo zaimek nic tu nowego nie wnosi. To nie jest skrót ani niedbałość, lecz zwykła norma hiszpańskiej mowy, używana w każdej sytuacji. Odpowiedź jest prosta: końcówka eres sama nazywa „tú”, więc zbędny zaimek nie jest potrzebny.',
});

const FORMULA_BODY = L({
  ru: 'Формула короче, чем в утверждении с местоимением: связка + признак, без tú или yo впереди. Eres bonito, а не Tú eres bonito; Soy rápido, а не Yo soy rápido. Правило работает для любой связки первого и второго лица — soy и eres, — потому что у каждой своё уникальное окончание. Третье лицо, es, устроено немного иначе: там подлежащего вообще не бывает отдельным словом, потому что «это» не называют явно ни с местоимением, ни без него. Ответ прост: перед es ничего — там нет местоимения, там вообще нет отдельного слова-подлежащего.',
  uk: 'Формула коротша, ніж у твердженні із займенником: зв’язка + ознака, без tú чи yo попереду. Eres bonito, а не Tú eres bonito; Soy rápido, а не Yo soy rápido. Правило працює для будь-якої зв’язки першої та другої особи — soy та eres, — бо в кожної своє унікальне закінчення. Третя особа, es, влаштована трохи інакше: там підмета взагалі не буває окремим словом, бо «це» не називають явно ні з займенником, ні без нього. Відповідь проста: перед es нічого — там немає займенника, там взагалі немає окремого слова-підмета.',
  es: 'The formula is shorter than a statement with a pronoun: linking word + quality, without tú or yo in front. Eres bonito, not Tú eres bonito; Soy rápido, not Yo soy rápido. The rule works for any first- and second-person linking word — soy and eres — because each has its own unique ending. The third person, es, works a bit differently: there the subject is never a separate word at all, because "it" is never named explicitly, with or without a pronoun. The answer is simple: before es, nothing — there is no pronoun there, there is no separate subject word at all.',
  'pt-BR': 'A fórmula é mais curta que uma afirmação com pronome: ligação + qualidade, sem tú ou yo na frente. Eres bonito, não Tú eres bonito; Soy rápido, não Yo soy rápido. A regra funciona para qualquer ligação de primeira e segunda pessoa — soy e eres — porque cada uma tem sua própria terminação única. A terceira pessoa, es, funciona um pouco diferente: ali o sujeito nunca é uma palavra separada, porque "isso" nunca é nomeado explicitamente, com ou sem pronome. A resposta é simples: antes de es, nada — não há pronome ali, não há palavra-sujeito separada.',
  vi: 'Công thức ngắn hơn câu khẳng định có đại từ: từ nối + đặc điểm, không có tú hay yo phía trước. Eres bonito, không phải Tú eres bonito; Soy rápido, không phải Yo soy rápido. Quy tắc hoạt động cho bất kỳ từ nối ngôi thứ nhất và thứ hai nào — soy và eres — vì mỗi từ có đuôi riêng độc nhất. Ngôi thứ ba, es, hoạt động hơi khác: ở đó chủ ngữ không bao giờ là một từ riêng, vì "nó" không bao giờ được gọi tên rõ ràng, có hay không có đại từ. Câu trả lời rất đơn giản: trước es không có gì — ở đó không có đại từ, không có từ chủ ngữ riêng nào cả.',
  id: 'Rumusnya lebih pendek daripada pernyataan dengan kata ganti: kata penghubung + sifat, tanpa tú atau yo di depan. Eres bonito, bukan Tú eres bonito; Soy rápido, bukan Yo soy rápido. Aturan ini berlaku untuk kata penghubung orang pertama dan kedua mana pun — soy dan eres — karena masing-masing memiliki akhiran uniknya sendiri. Orang ketiga, es, bekerja sedikit berbeda: di sana subjek tidak pernah menjadi kata terpisah sama sekali, karena "itu" tidak pernah disebut secara eksplisit. Jawabannya sederhana: sebelum es tidak ada apa-apa — tidak ada kata ganti di sana, tidak ada kata subjek terpisah sama sekali.',
  tr: 'Formül, zamirli bir ifadeden daha kısadır: bağlaç + nitelik, önünde tú ya da yo olmadan. Eres bonito, Tú eres bonito değil; Soy rápido, Yo soy rápido değil. Kural, herhangi bir birinci ve ikinci kişi bağlacı için çalışır — soy ve eres — çünkü her birinin kendine özgü bir sonu vardır. Üçüncü kişi, es, biraz farklı çalışır: orada özne hiçbir zaman ayrı bir kelime değildir, çünkü "bu" zamirle ya da zamirsiz asla açıkça adlandırılmaz. Cevap basittir: es’ten önce hiçbir şey — orada zamir yok, orada ayrı bir özne kelimesi hiç yoktur.',
  pl: 'Formuła jest krótsza niż twierdzenie z zaimkiem: łącznik + cecha, bez tú lub yo z przodu. Eres bonito, nie Tú eres bonito; Soy rápido, nie Yo soy rápido. Zasada działa dla każdego łącznika pierwszej i drugiej osoby — soy i eres — ponieważ każdy ma swoją unikalną końcówkę. Trzecia osoba, es, działa nieco inaczej: tam podmiot nigdy nie jest osobnym słowem, ponieważ „to” nigdy nie jest nazywane wprost, z zaimkiem czy bez niego. Odpowiedź jest prosta: przed es nic — nie ma tam zaimka, nie ma tam żadnego osobnego słowa-podmiotu.',
});

const TRAP_BODY = L({
  ru: 'Кажется логичным добавить tú или yo для ясности, но это не ошибка — просто лишнее слово, которое звучит непривычно тяжеловесно. Tú eres bonito грамматически верно, но носитель языка скажет просто Eres bonito, потому что окончание -es и так однозначно. Опаснее другая ловушка — спутать связку и оставить местоимение не тем: Tú soy rápido невозможно в принципе, потому что soy принадлежит только «я», а tú требует eres. Проверка простая: если сомневаешься, нужно ли местоимение — почти всегда не нужно; если сомневаешься, какая связка — смотри, о ком фраза, а не на слово-подлежащее.',
  uk: 'Здається логічним додати tú чи yo для ясності, але це не помилка — просто зайве слово, яке звучить незвично важкувато. Tú eres bonito граматично правильно, але носій мови скаже просто Eres bonito, бо закінчення -es і так однозначне. Небезпечніша інша пастка — сплутати зв’язку і лишити займенник не тим: Tú soy rápido неможливе в принципі, бо soy належить тільки «я», а tú вимагає eres. Перевірка проста: якщо сумніваєшся, чи потрібен займенник — майже завжди не потрібен; якщо сумніваєшся, яка зв’язка — дивись, про кого фраза, а не на слово-підмет.',
  es: 'It may seem logical to add tú or yo for clarity, but this is not a mistake — just an extra word that sounds unusually heavy. Tú eres bonito is grammatically correct, but a native speaker would simply say Eres bonito, because the ending -es is already unambiguous. A more dangerous trap is mixing up the linking word and leaving the wrong pronoun: Tú soy rápido is impossible in principle, because soy belongs only to "I", and tú requires eres. The check is simple: if you doubt whether the pronoun is needed — almost always it is not; if you doubt which linking word to use — look at who the phrase is about, not at a subject word.',
  'pt-BR': 'Pode parecer lógico acrescentar tú ou yo para clareza, mas isso não é erro — apenas uma palavra extra que soa incomumente pesada. Tú eres bonito é gramaticalmente correto, mas um falante nativo diria simplesmente Eres bonito, porque a terminação -es já é inequívoca. Uma armadilha mais perigosa é misturar a ligação e deixar o pronome errado: Tú soy rápido é impossível em princípio, porque soy pertence só ao "eu", e tú exige eres. A checagem é simples: se você duvida se o pronome é necessário — quase sempre não é; se duvida qual ligação usar — olhe de quem é a frase, não uma palavra-sujeito.',
  vi: 'Có vẻ hợp lý khi thêm tú hay yo để rõ ràng hơn, nhưng đó không phải là lỗi — chỉ là một từ thừa nghe nặng nề khác thường. Tú eres bonito đúng về ngữ pháp, nhưng người bản xứ sẽ chỉ nói Eres bonito, vì đuôi -es đã rõ ràng rồi. Cái bẫy nguy hiểm hơn là nhầm lẫn từ nối và để sai đại từ: Tú soy rápido về nguyên tắc là không thể, vì soy chỉ thuộc về "tôi", còn tú đòi hỏi eres. Cách kiểm tra đơn giản: nếu bạn nghi ngờ liệu có cần đại từ không — hầu như luôn luôn là không cần; nếu nghi ngờ dùng từ nối nào — hãy nhìn câu đang nói về ai, không phải nhìn vào một từ chủ ngữ.',
  id: 'Mungkin tampak logis untuk menambahkan tú atau yo demi kejelasan, tetapi itu bukan kesalahan — hanya kata tambahan yang terdengar berat secara tidak biasa. Tú eres bonito secara tata bahasa benar, tetapi penutur asli akan cukup mengatakan Eres bonito, karena akhiran -es sudah jelas. Jebakan yang lebih berbahaya adalah mengacaukan kata penghubung dan meninggalkan kata ganti yang salah: Tú soy rápido pada dasarnya tidak mungkin, karena soy hanya milik "aku", dan tú memerlukan eres. Pengecekannya sederhana: jika ragu apakah kata ganti diperlukan — hampir selalu tidak; jika ragu kata penghubung mana yang digunakan — lihat tentang siapa frasa itu, bukan pada kata subjek.',
  tr: 'Netlik için tú ya da yo eklemek mantıklı görünebilir, ama bu bir hata değildir — sadece alışılmadık şekilde ağır duyulan fazladan bir kelimedir. Tú eres bonito gramer açısından doğrudur, ama anadili konuşan biri sadece Eres bonito derdi, çünkü -es son eki zaten açıktır. Daha tehlikeli bir tuzak, bağlacı karıştırıp yanlış zamiri bırakmaktır: Tú soy rápido ilke olarak imkânsızdır, çünkü soy yalnızca "ben"e aittir ve tú, eres gerektirir. Kontrol basittir: zamirin gerekli olup olmadığından şüphe ediyorsanız — neredeyse her zaman gerekli değildir; hangi bağlacı kullanacağınızdan şüphe ediyorsanız — özne kelimesine değil, ifadenin kim hakkında olduğuna bakın.',
  pl: 'Wydaje się logiczne dodanie tú lub yo dla jasności, ale to nie błąd — po prostu zbędne słowo, które brzmi niezwykle ciężko. Tú eres bonito jest gramatycznie poprawne, ale rodzimy użytkownik powiedziałby po prostu Eres bonito, ponieważ końcówka -es jest już jednoznaczna. Groźniejsza pułapka to pomylenie łącznika i pozostawienie niewłaściwego zaimka: Tú soy rápido jest zasadniczo niemożliwe, ponieważ soy należy tylko do „ja”, a tú wymaga eres. Sprawdzenie jest proste: jeśli wątpisz, czy zaimek jest potrzebny — niemal zawsze nie jest; jeśli wątpisz, którego łącznika użyć — patrz, o kim jest fraza, a nie na słowo-podmiot.',
});

export const ES_EPISODE_01_SESSION_13_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Окончание уже называет, кто есть кто',
      uk: 'Закінчення вже називає, хто є хто',
      es: 'The ending already names who is who',
      'pt-BR': 'A terminação já nomeia quem é quem',
      vi: 'Đuôi từ đã gọi tên ai là ai',
      id: 'Akhiran sudah menyebut siapa itu siapa',
      tr: 'Son ek zaten kimin kim olduğunu adlandırır',
      pl: 'Końcówka już nazywa, kto jest kim',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'В русском и английском подлежащее почти всегда называют отдельным словом: «ты быстрый», «you are fast». В испанском окончание самой связки уже показывает, о ком речь: -es в eres звучит только с «ты», -oy в soy — только с «я». Поэтому ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' и ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' означают ровно одно и то же — второй вариант просто короче и звучит естественнее, ведь местоимение здесь ничего нового не добавляет. Это не сокращение и не небрежность, а обычная норма испанской речи, которую используют в любой ситуации, а не только в быстром разговоре. Ответ прост: местоимение можно не говорить, потому что окончание связки само называет, кто есть кто.', semantic: 'explanation' }),
      uk: R({ text: 'В українській та англійській підмет майже завжди називають окремим словом: «ти швидкий», «you are fast». В іспанській закінчення самої зв’язки вже показує, про кого йдеться: -es в eres звучить тільки з «ти», -oy в soy — тільки з «я». Тому ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' та ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' означають рівно те саме — другий варіант просто коротший і звучить природніше, адже займенник тут нічого нового не додає. Це не скорочення і не недбалість, а звичайна норма іспанської мови, яку використовують у будь-якій ситуації, а не тільки в швидкій розмові. Відповідь проста: займенник можна не казати, бо закінчення зв’язки саме називає, хто є хто.', semantic: 'explanation' }),
      es: R({ text: 'In many languages the subject is almost always named by a separate word next to the verb. In Spanish the ending of the linking word itself already shows who is being talked about: -es in eres sounds only with "you", -oy in soy only with "I". So ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' and ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' mean exactly the same thing — the second version is simply shorter and sounds more natural, since the pronoun adds nothing new here. This is not a shortcut or carelessness, it is the ordinary norm of Spanish speech used in any situation, not only in fast talk. The answer is simple: the pronoun can be left unsaid, because the ending of the linking word already names who is who.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Em português e inglês o sujeito quase sempre é nomeado por uma palavra separada: "você é rápido", "you are fast". Em espanhol a terminação da própria ligação já mostra de quem se fala: -es em eres soa só com "tú", -oy em soy só com "yo". Por isso ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' e ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' significam exatamente a mesma coisa — a segunda versão é só mais curta e soa mais natural, já que o pronome não acrescenta nada de novo aqui. Isso não é um atalho nem descuido, é a norma comum do espanhol falado, usada em qualquer situação, não só numa fala rápida. A resposta é simples: o pronome pode ficar sem ser dito, porque a terminação da ligação já nomeia quem é quem.', semantic: 'explanation' }),
      vi: R({ text: 'Trong nhiều ngôn ngữ, chủ ngữ hầu như luôn được gọi tên bằng một từ riêng bên cạnh động từ. Trong tiếng Tây Ban Nha, đuôi của chính từ nối đã cho thấy đang nói về ai: -es trong eres chỉ vang lên với "tú", -oy trong soy chỉ với "yo". Vì vậy ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' và ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' có nghĩa hoàn toàn giống nhau — phiên bản thứ hai chỉ ngắn hơn và nghe tự nhiên hơn, vì đại từ ở đây không thêm gì mới. Đây không phải là rút gọn hay cẩu thả, mà là chuẩn mực thông thường của tiếng Tây Ban Nha, dùng trong mọi tình huống, không chỉ khi nói nhanh. Câu trả lời rất đơn giản: có thể không nói đại từ, vì đuôi của từ nối đã tự gọi tên ai là ai.', semantic: 'explanation' }),
      id: R({ text: 'Dalam banyak bahasa, subjek hampir selalu disebut dengan kata terpisah di samping kata kerja. Dalam bahasa Spanyol, akhiran dari kata penghubung itu sendiri sudah menunjukkan siapa yang dibicarakan: -es dalam eres hanya terdengar dengan "tú", -oy dalam soy hanya dengan "yo". Jadi ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' dan ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' berarti persis sama — versi kedua hanya lebih pendek dan terdengar lebih alami, karena kata ganti di sini tidak menambahkan apa pun yang baru. Ini bukan jalan pintas atau kecerobohan, melainkan norma biasa dalam bahasa Spanyol lisan, digunakan dalam situasi apa pun, bukan hanya dalam percakapan cepat. Jawabannya sederhana: kata ganti bisa tidak diucapkan, karena akhiran kata penghubung sudah menyebut siapa itu siapa.', semantic: 'explanation' }),
      tr: R({ text: 'Birçok dilde özne neredeyse her zaman fiilin yanında ayrı bir kelimeyle adlandırılır. İspanyolcada bağlacın sonu, kimden bahsedildiğini zaten gösterir: eres’teki -es yalnızca "tú" ile duyulur, soy’daki -oy yalnızca "yo" ile. Bu yüzden ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' ve ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' tam olarak aynı anlama gelir — ikinci biçim sadece daha kısadır ve daha doğal duyulur, çünkü zamir burada yeni bir şey eklemez. Bu bir kısayol ya da dikkatsizlik değildir, herhangi bir durumda kullanılan, sadece hızlı konuşmada değil, İspanyolcanın olağan normudur. Cevap basittir: zamir söylenmeden bırakılabilir, çünkü bağlacın sonu kimin kim olduğunu zaten adlandırır.', semantic: 'explanation' }),
      pl: R({ text: 'W wielu językach podmiot niemal zawsze jest nazywany osobnym słowem obok czasownika. W hiszpańskim końcówka samego łącznika już pokazuje, o kim mowa: -es w eres brzmi tylko z „tú”, -oy w soy tylko z „yo”. Dlatego ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' i ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' znaczą dokładnie to samo — druga wersja jest po prostu krótsza i brzmi bardziej naturalnie, bo zaimek nic tu nowego nie wnosi. To nie jest skrót ani niedbałość, lecz zwykła norma hiszpańskiej mowy, używana w każdej sytuacji, nie tylko w szybkiej rozmowie. Odpowiedź jest prosta: zaimek można pominąć, ponieważ końcówka łącznika sama nazywa, kto jest kim.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Почему испанец обычно не говорит tú перед eres?',
        uk: 'Чому іспанець зазвичай не каже tú перед eres?',
        es: 'Why does a Spanish speaker usually not say tú before eres?',
        'pt-BR': 'Por que um falante de espanhol geralmente não diz tú antes de eres?',
        vi: 'Tại sao người nói tiếng Tây Ban Nha thường không nói tú trước eres?',
        id: 'Mengapa penutur bahasa Spanyol biasanya tidak mengatakan tú sebelum eres?',
        tr: 'Bir İspanyolca konuşan neden genellikle eres’ten önce tú demez?',
        pl: 'Dlaczego Hiszpan zwykle nie mówi tú przed eres?',
      }),
      choices: [
        L({ ru: 'Окончание eres само называет «ты»', uk: 'Закінчення eres саме називає «ти»', es: 'The ending of eres already names "you"', 'pt-BR': 'A terminação de eres já nomeia "tú"', vi: 'Đuôi của eres đã tự gọi tên "tú"', id: 'Akhiran eres sudah menyebut "tú"', tr: 'Eres’in sonu zaten "tú"yu adlandırır', pl: 'Końcówka eres sama nazywa „tú”' }),
        L({ ru: 'Tú — грамматическая ошибка', uk: 'Tú — граматична помилка', es: 'Tú is a grammar mistake', 'pt-BR': 'Tú é um erro gramatical', vi: 'Tú là lỗi ngữ pháp', id: 'Tú adalah kesalahan tata bahasa', tr: 'Tú bir dilbilgisi hatasıdır', pl: 'Tú to błąd gramatyczny' }),
        L({ ru: 'Tú используется только в вопросах', uk: 'Tú використовується тільки в питаннях', es: 'Tú is used only in questions', 'pt-BR': 'Tú é usado só em perguntas', vi: 'Tú chỉ dùng trong câu hỏi', id: 'Tú hanya digunakan dalam pertanyaan', tr: 'Tú yalnızca sorularda kullanılır', pl: 'Tú jest używane tylko w pytaniach' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Окончание eres само называет «ты» — это и есть причина. Tú не ошибка (просто избыточно) и не ограничено вопросами.',
        uk: 'Закінчення eres саме називає «ти» — це і є причина. Tú не помилка (просто надлишкове) і не обмежене питаннями.',
        es: 'The ending of eres already names "you" — that is the reason. Tú is not a mistake (just redundant) and is not limited to questions.',
        'pt-BR': 'A terminação de eres já nomeia "tú" — essa é a razão. Tú não é erro (apenas redundante) e não é limitado a perguntas.',
        vi: 'Đuôi của eres đã tự gọi tên "tú" — đó là lý do. Tú không phải lỗi (chỉ thừa) và không giới hạn trong câu hỏi.',
        id: 'Akhiran eres sudah menyebut "tú" — itulah alasannya. Tú bukan kesalahan (hanya berlebihan) dan tidak terbatas pada pertanyaan.',
        tr: 'Eres’in sonu zaten "tú"yu adlandırır — sebep budur. Tú bir hata değildir (sadece gereksizdir) ve sorularla sınırlı değildir.',
        pl: 'Końcówka eres sama nazywa „tú” — to jest powód. Tú nie jest błędem (tylko zbędne) i nie ogranicza się do pytań.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Перед es местоимения не бывает вовсе',
      uk: 'Перед es займенника не буває взагалі',
      es: 'Before es there is never a pronoun at all',
      'pt-BR': 'Antes de es nunca há pronome',
      vi: 'Trước es không bao giờ có đại từ',
      id: 'Sebelum es tidak pernah ada kata ganti',
      tr: 'Es’ten önce hiç zamir olmaz',
      pl: 'Przed es nigdy nie ma zaimka',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула короче, чем в утверждении с местоимением: связка + признак, без tú или yo впереди. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', а не Tú eres bonito; ', semantic: 'explanation' }, { text: 'Soy rápido', semantic: 'targetCorrect' }, { text: ', а не Yo soy rápido. Правило работает для любой связки первого и второго лица — soy и eres, — потому что у каждой своё уникальное окончание. Третье лицо, es, устроено немного иначе: там подлежащего вообще не бывает отдельным словом, потому что «это» не называют явно ни с местоимением, ни без него. Ответ прост: перед es местоимение никогда и не было — там нет отдельного слова-подлежащего вообще.', semantic: 'explanation' }),
      uk: R({ text: 'Формула коротша, ніж у твердженні із займенником: зв’язка + ознака, без tú чи yo попереду. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', а не Tú eres bonito; ', semantic: 'explanation' }, { text: 'Soy rápido', semantic: 'targetCorrect' }, { text: ', а не Yo soy rápido. Правило працює для будь-якої зв’язки першої та другої особи — soy та eres, — бо в кожної своє унікальне закінчення. Третя особа, es, влаштована трохи інакше: там підмета взагалі не буває окремим словом, бо «це» не називають явно ні з займенником, ні без нього. Відповідь проста: перед es займенника ніколи й не було — там немає окремого слова-підмета взагалі.', semantic: 'explanation' }),
      es: R({ text: 'The formula is shorter than a statement with a pronoun: linking word + quality, without tú or yo in front. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', not Tú eres bonito; ', semantic: 'explanation' }, { text: 'Soy rápido', semantic: 'targetCorrect' }, { text: ', not Yo soy rápido. The rule works for any first- and second-person linking word — soy and eres — because each has its own unique ending. The third person, es, works a bit differently: there the subject is never a separate word at all, because "it" is never named explicitly, with or without a pronoun. The answer is simple: before es there is never a pronoun at all — there is no separate subject word there in the first place.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é mais curta que uma afirmação com pronome: ligação + qualidade, sem tú ou yo na frente. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', não Tú eres bonito; ', semantic: 'explanation' }, { text: 'Soy rápido', semantic: 'targetCorrect' }, { text: ', não Yo soy rápido. A regra funciona para qualquer ligação de primeira e segunda pessoa — soy e eres — porque cada uma tem sua própria terminação única. A terceira pessoa, es, funciona um pouco diferente: ali o sujeito nunca é uma palavra separada, porque "isso" nunca é nomeado explicitamente, com ou sem pronome. A resposta é simples: antes de es nunca há pronome — ali nunca existe uma palavra-sujeito separada.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức ngắn hơn câu khẳng định có đại từ: từ nối + đặc điểm, không có tú hay yo phía trước. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', không phải Tú eres bonito; ', semantic: 'explanation' }, { text: 'Soy rápido', semantic: 'targetCorrect' }, { text: ', không phải Yo soy rápido. Quy tắc hoạt động cho bất kỳ từ nối ngôi thứ nhất và thứ hai nào — soy và eres — vì mỗi từ có đuôi riêng độc nhất. Ngôi thứ ba, es, hoạt động hơi khác: ở đó chủ ngữ không bao giờ là một từ riêng, vì "nó" không bao giờ được gọi tên rõ ràng, có hay không có đại từ. Câu trả lời rất đơn giản: trước es không bao giờ có đại từ — ở đó không hề có từ chủ ngữ riêng.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya lebih pendek daripada pernyataan dengan kata ganti: kata penghubung + sifat, tanpa tú atau yo di depan. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', bukan Tú eres bonito; ', semantic: 'explanation' }, { text: 'Soy rápido', semantic: 'targetCorrect' }, { text: ', bukan Yo soy rápido. Aturan ini berlaku untuk kata penghubung orang pertama dan kedua mana pun — soy dan eres — karena masing-masing memiliki akhiran uniknya sendiri. Orang ketiga, es, bekerja sedikit berbeda: di sana subjek tidak pernah menjadi kata terpisah sama sekali, karena "itu" tidak pernah disebut secara eksplisit, dengan atau tanpa kata ganti. Jawabannya sederhana: sebelum es tidak pernah ada kata ganti — di sana memang tidak pernah ada kata subjek terpisah.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, zamirli bir ifadeden daha kısadır: bağlaç + nitelik, önünde tú ya da yo olmadan. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', Tú eres bonito değil; ', semantic: 'explanation' }, { text: 'Soy rápido', semantic: 'targetCorrect' }, { text: ', Yo soy rápido değil. Kural, herhangi bir birinci ve ikinci kişi bağlacı için çalışır — soy ve eres — çünkü her birinin kendine özgü bir sonu vardır. Üçüncü kişi, es, biraz farklı çalışır: orada özne hiçbir zaman ayrı bir kelime değildir, çünkü "bu" zamirle ya da zamirsiz asla açıkça adlandırılmaz. Cevap basittir: es’ten önce hiç zamir olmaz — orada zaten ayrı bir özne kelimesi hiç yoktur.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest krótsza niż twierdzenie z zaimkiem: łącznik + cecha, bez tú lub yo z przodu. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', nie Tú eres bonito; ', semantic: 'explanation' }, { text: 'Soy rápido', semantic: 'targetCorrect' }, { text: ', nie Yo soy rápido. Zasada działa dla każdego łącznika pierwszej i drugiej osoby — soy i eres — ponieważ każdy ma swoją unikalną końcówkę. Trzecia osoba, es, działa nieco inaczej: tam podmiot nigdy nie jest osobnym słowem, ponieważ „to” nigdy nie jest nazywane wprost, z zaimkiem czy bez niego. Odpowiedź jest prosta: przed es nigdy nie ma zaimka — tam po prostu nigdy nie było osobnego słowa-podmiotu.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что стоит перед es в безличной оценке вроде «Es bonito»?',
        uk: 'Що стоїть перед es у безособовій оцінці на кшталт «Es bonito»?',
        es: 'What comes before es in an impersonal evaluation like "Es bonito"?',
        'pt-BR': 'O que vem antes de es numa avaliação impessoal como "Es bonito"?',
        vi: 'Điều gì đứng trước es trong đánh giá phi nhân xưng như "Es bonito"?',
        id: 'Apa yang ada sebelum es dalam penilaian impersonal seperti "Es bonito"?',
        tr: '"Es bonito" gibi kişisiz bir değerlendirmede es’ten önce ne gelir?',
        pl: 'Co stoi przed es w bezosobowej ocenie takiej jak „Es bonito”?',
      }),
      choices: [
        L({ ru: 'Ничего — там нет местоимения', uk: 'Нічого — там немає займенника', es: 'Nothing — there is no pronoun there', 'pt-BR': 'Nada — não há pronome ali', vi: 'Không có gì — ở đó không có đại từ', id: 'Tidak ada apa-apa — tidak ada kata ganti di sana', tr: 'Hiçbir şey — orada zamir yok', pl: 'Nic — nie ma tam zaimka' }),
        L({ ru: 'Местоимение ello', uk: 'Займенник ello', es: 'The pronoun ello', 'pt-BR': 'O pronome ello', vi: 'Đại từ ello', id: 'Kata ganti ello', tr: 'Ello zamiri', pl: 'Zaimek ello' }),
        L({ ru: 'Местоимение tú', uk: 'Займенник tú', es: 'The pronoun tú', 'pt-BR': 'O pronome tú', vi: 'Đại từ tú', id: 'Kata ganti tú', tr: 'Tú zamiri', pl: 'Zaimek tú' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Верно: перед es ничего не стоит — там нет отдельного слова-подлежащего вообще, ни ello, ни tú.',
        uk: 'Правильно: перед es нічого не стоїть — там немає окремого слова-підмета взагалі, ні ello, ні tú.',
        es: 'Correct: nothing comes before es — there is no separate subject word there at all, neither ello nor tú.',
        'pt-BR': 'Correto: nada vem antes de es — não há palavra-sujeito separada ali, nem ello nem tú.',
        vi: 'Đúng: không có gì đứng trước es — ở đó hoàn toàn không có từ chủ ngữ riêng, không phải ello, không phải tú.',
        id: 'Benar: tidak ada apa-apa sebelum es — tidak ada kata subjek terpisah sama sekali di sana, baik ello maupun tú.',
        tr: 'Doğru: es’ten önce hiçbir şey gelmez — orada ayrı bir özne kelimesi hiç yoktur, ne ello ne de tú.',
        pl: 'Poprawnie: przed es nic nie stoi — tam w ogóle nie ma osobnego słowa-podmiotu, ani ello, ani tú.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Tú не ошибка, но связку не перепутай',
      uk: 'Tú не помилка, але зв’язку не сплутай',
      es: 'Tú is not a mistake, but do not mix up the linking word',
      'pt-BR': 'Tú não é erro, mas não confunda a ligação',
      vi: 'Tú không phải lỗi, nhưng đừng nhầm từ nối',
      id: 'Tú bukan kesalahan, tapi jangan salah kata penghubung',
      tr: 'Tú bir hata değildir, ama bağlacı karıştırma',
      pl: 'Tú to nie błąd, ale nie myl łącznika',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Кажется логичным добавить tú или yo для ясности, но это не ошибка — просто лишнее слово, которое звучит непривычно тяжеловесно. ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' грамматически верно, но носитель языка скажет просто ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', потому что окончание -es и так однозначно. Опаснее другая ловушка — спутать связку и оставить местоимение не тем: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' невозможно в принципе, потому что soy принадлежит только «я», а tú требует eres. Проверка простая: если сомневаешься, нужно ли местоимение — почти всегда не нужно; если сомневаешься, какая связка — смотри, о ком фраза, а не на слово-подлежащее.', semantic: 'explanation' }),
      uk: R({ text: 'Здається логічним додати tú чи yo для ясності, але це не помилка — просто зайве слово, яке звучить незвично важкувато. ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' граматично правильно, але носій мови скаже просто ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', бо закінчення -es і так однозначне. Небезпечніша інша пастка — сплутати зв’язку і лишити займенник не тим: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' неможливе в принципі, бо soy належить тільки «я», а tú вимагає eres. Перевірка проста: якщо сумніваєшся, чи потрібен займенник — майже завжди не потрібен; якщо сумніваєшся, яка зв’язка — дивись, про кого фраза, а не на слово-підмет.', semantic: 'explanation' }),
      es: R({ text: 'It may seem logical to add tú or yo for clarity, but this is not a mistake — just an extra word that sounds unusually heavy. ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' is grammatically correct, but a native speaker would simply say ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', because the ending -es is already unambiguous. A more dangerous trap is mixing up the linking word and leaving the wrong pronoun: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' is impossible in principle, because soy belongs only to "I", and tú requires eres. The check is simple: if you doubt whether the pronoun is needed — almost always it is not; if you doubt which linking word to use — look at who the phrase is about, not at a subject word.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Pode parecer lógico acrescentar tú ou yo para clareza, mas isso não é erro — apenas uma palavra extra que soa incomumente pesada. ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' é gramaticalmente correto, mas um falante nativo diria simplesmente ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', porque a terminação -es já é inequívoca. Uma armadilha mais perigosa é misturar a ligação e deixar o pronome errado: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' é impossível em princípio, porque soy pertence só ao "eu", e tú exige eres. A checagem é simples: se você duvida se o pronome é necessário — quase sempre não é; se duvida qual ligação usar — olhe de quem é a frase, não uma palavra-sujeito.', semantic: 'explanation' }),
      vi: R({ text: 'Có vẻ hợp lý khi thêm tú hay yo để rõ ràng hơn, nhưng đó không phải là lỗi — chỉ là một từ thừa nghe nặng nề khác thường. ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' đúng về ngữ pháp, nhưng người bản xứ sẽ chỉ nói ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', vì đuôi -es đã rõ ràng rồi. Cái bẫy nguy hiểm hơn là nhầm lẫn từ nối và để sai đại từ: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' về nguyên tắc là không thể, vì soy chỉ thuộc về "tôi", còn tú đòi hỏi eres. Cách kiểm tra đơn giản: nếu bạn nghi ngờ liệu có cần đại từ không — hầu như luôn luôn là không cần; nếu nghi ngờ dùng từ nối nào — hãy nhìn câu đang nói về ai, không phải nhìn vào một từ chủ ngữ.', semantic: 'explanation' }),
      id: R({ text: 'Mungkin tampak logis untuk menambahkan tú atau yo demi kejelasan, tetapi itu bukan kesalahan — hanya kata tambahan yang terdengar berat secara tidak biasa. ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' secara tata bahasa benar, tetapi penutur asli akan cukup mengatakan ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', karena akhiran -es sudah jelas. Jebakan yang lebih berbahaya adalah mengacaukan kata penghubung dan meninggalkan kata ganti yang salah: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' pada dasarnya tidak mungkin, karena soy hanya milik "aku", dan tú memerlukan eres. Pengecekannya sederhana: jika ragu apakah kata ganti diperlukan — hampir selalu tidak; jika ragu kata penghubung mana yang digunakan — lihat tentang siapa frasa itu, bukan pada kata subjek.', semantic: 'explanation' }),
      tr: R({ text: 'Netlik için tú ya da yo eklemek mantıklı görünebilir, ama bu bir hata değildir — sadece alışılmadık şekilde ağır duyulan fazladan bir kelimedir. ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' gramer açısından doğrudur, ama anadili konuşan biri sadece ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' derdi, çünkü -es son eki zaten açıktır. Daha tehlikeli bir tuzak, bağlacı karıştırıp yanlış zamiri bırakmaktır: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' ilke olarak imkânsızdır, çünkü soy yalnızca "ben"e aittir ve tú, eres gerektirir. Kontrol basittir: zamirin gerekli olup olmadığından şüphe ediyorsanız — neredeyse her zaman gerekli değildir; hangi bağlacı kullanacağınızdan şüphe ediyorsanız — özne kelimesine değil, ifadenin kim hakkında olduğuna bakın.', semantic: 'explanation' }),
      pl: R({ text: 'Wydaje się logiczne dodanie tú lub yo dla jasności, ale to nie błąd — po prostu zbędne słowo, które brzmi niezwykle ciężko. ', semantic: 'explanation' }, { text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' jest gramatycznie poprawne, ale rodzimy użytkownik powiedziałby po prostu ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', ponieważ końcówka -es jest już jednoznaczna. Groźniejsza pułapka to pomylenie łącznika i pozostawienie niewłaściwego zaimka: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' jest zasadniczo niemożliwe, ponieważ soy należy tylko do „ja”, a tú wymaga eres. Sprawdzenie jest proste: jeśli wątpisz, czy zaimek jest potrzebny — niemal zawsze nie jest; jeśli wątpisz, którego łącznika użyć — patrz, o kim jest fraza, a nie na słowo-podmiot.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какая фраза грамматически невозможна?',
        uk: 'Яка фраза граматично неможлива?',
        es: 'Which phrase is grammatically impossible?',
        'pt-BR': 'Qual frase é gramaticalmente impossível?',
        vi: 'Câu nào không thể về mặt ngữ pháp?',
        id: 'Frasa mana yang secara tata bahasa tidak mungkin?',
        tr: 'Hangi ifade gramer açısından imkânsızdır?',
        pl: 'Które zdanie jest gramatycznie niemożliwe?',
      }),
      choices: [
        L({ ru: 'Tú soy rápido', uk: 'Tú soy rápido', es: 'Tú soy rápido', 'pt-BR': 'Tú soy rápido', vi: 'Tú soy rápido', id: 'Tú soy rápido', tr: 'Tú soy rápido', pl: 'Tú soy rápido' }),
        L({ ru: 'Tú eres rápido', uk: 'Tú eres rápido', es: 'Tú eres rápido', 'pt-BR': 'Tú eres rápido', vi: 'Tú eres rápido', id: 'Tú eres rápido', tr: 'Tú eres rápido', pl: 'Tú eres rápido' }),
        L({ ru: 'Eres rápido', uk: 'Eres rápido', es: 'Eres rápido', 'pt-BR': 'Eres rápido', vi: 'Eres rápido', id: 'Eres rápido', tr: 'Eres rápido', pl: 'Eres rápido' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Tú soy rápido невозможно, потому что soy принадлежит только «я», а tú требует связки eres — эти два слова несовместимы в одной фразе.',
        uk: 'Tú soy rápido неможливе, бо soy належить тільки «я», а tú вимагає зв’язки eres — ці два слова несумісні в одній фразі.',
        es: 'Tú soy rápido is impossible, because soy belongs only to "I", while tú requires the linking word eres — these two words are incompatible in one phrase.',
        'pt-BR': 'Tú soy rápido é impossível, porque soy pertence só ao "eu", enquanto tú exige a ligação eres — essas duas palavras são incompatíveis numa frase.',
        vi: 'Tú soy rápido không thể, vì soy chỉ thuộc về "tôi", trong khi tú đòi hỏi từ nối eres — hai từ này không tương thích trong cùng một câu.',
        id: 'Tú soy rápido tidak mungkin, karena soy hanya milik "aku", sedangkan tú memerlukan kata penghubung eres — kedua kata ini tidak cocok dalam satu frasa.',
        tr: 'Tú soy rápido imkânsızdır, çünkü soy yalnızca "ben"e aittir, tú ise eres bağlacını gerektirir — bu iki kelime tek bir ifadede uyumsuzdur.',
        pl: 'Tú soy rápido jest niemożliwe, ponieważ soy należy tylko do „ja”, a tú wymaga łącznika eres — te dwa słowa są niekompatybilne w jednej frazie.',
      }),
    },
  },
];
