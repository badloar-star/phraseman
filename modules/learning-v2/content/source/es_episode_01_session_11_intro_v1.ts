import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 11 "Ты не" / builtOn: [2, 9], recalls: [2, 9]): три страницы
// concept/formula/trap показывают, что no отрицает любую связку ser (soy/
// eres/es) той же формулой, что и в сессии 2 (No es fácil) — no встаёт
// перед связкой, признак не меняется. Новых слов нет.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_11_TITLE = L({
  ru: 'Ты не',
  uk: 'Ти не',
  es: 'You are not',
  'pt-BR': 'Você não é',
  vi: 'Bạn không',
  id: 'Kamu bukan',
  tr: 'Sen değilsin',
  pl: 'Nie jesteś',
});

export const ES_EPISODE_01_SESSION_11_SUMMARY = L({
  ru: 'Одна и та же формула отрицания из второй сессии работает с любой связкой ser — soy, eres или es.',
  uk: 'Та сама формула заперечення з другої сесії працює з будь-якою зв’язкою ser — soy, eres чи es.',
  es: 'The same negation formula from the second session works with any linking word of ser — soy, eres, or es.',
  'pt-BR': 'A mesma fórmula de negação da segunda sessão funciona com qualquer ligação de ser — soy, eres ou es.',
  vi: 'Cùng công thức phủ định từ buổi thứ hai hoạt động với bất kỳ từ nối nào của ser — soy, eres hay es.',
  id: 'Rumus negasi yang sama dari sesi kedua bekerja dengan kata penghubung ser mana pun — soy, eres, atau es.',
  tr: 'İkinci oturumdaki aynı olumsuzlama formülü, ser’in herhangi bir bağlacıyla çalışır — soy, eres ya da es.',
  pl: 'Ta sama formuła przeczenia z drugiej sesji działa z każdym łącznikiem ser — soy, eres lub es.',
});

export const ES_EPISODE_01_SESSION_11_GOAL = L({
  ru: 'Узнать на слух и точно построить отрицание с soy, eres или es, ставя no перед связкой без изменения признака.',
  uk: 'Упізнати на слух і точно побудувати заперечення з soy, eres чи es, ставлячи no перед зв’язкою без зміни ознаки.',
  es: 'Recognize by ear and correctly build a negation with soy, eres, or es, placing no before the linking word without changing the quality.',
  'pt-BR': 'Reconhecer de ouvido e construir corretamente uma negação com soy, eres ou es, colocando no antes da ligação sem mudar a qualidade.',
  vi: 'Nghe ra và xây dựng đúng câu phủ định với soy, eres hay es, đặt no trước từ nối mà không đổi đặc điểm.',
  id: 'Mengenali dari suara dan membangun negasi dengan tepat menggunakan soy, eres, atau es, meletakkan no sebelum kata penghubung tanpa mengubah sifat.',
  tr: 'Soy, eres ya da es ile bir olumsuzlamayı duyup tanımak ve doğru kurmak, no’yu bağlacın önüne koyarak niteliği değiştirmeden.',
  pl: 'Rozpoznać ze słuchu i poprawnie zbudować przeczenie z soy, eres lub es, stawiając no przed łącznikiem bez zmiany cechy.',
});

const CONCEPT_BODY = L({
  ru: 'No + es встречалось раньше как готовая формула: No es fácil, No es verdad. Та же самая формула работает и с eres, и с soy — no всегда встаёт прямо перед связкой, какая бы она ни была. No eres bonito отрицает признак собеседника, No soy rápido отрицает признак самого говорящего — оба раза no занимает одно и то же место. Признак после связки никогда не меняется от отрицания: bonito остаётся bonito что в Eres bonito, что в No eres bonito. Ответ прост: no всегда встаёт перед связкой ser, какая бы форма ни использовалась — soy, eres или es.',
  uk: 'No + es траплялося раніше як готова формула: No es fácil, No es verdad. Та сама формула працює і з eres, і з soy — no завжди стоїть прямо перед зв’язкою, якою б вона не була. No eres bonito заперечує ознаку співрозмовника, No soy rápido заперечує ознаку самого мовця — обидва рази no займає те саме місце. Ознака після зв’язки ніколи не змінюється від заперечення: bonito лишається bonito що в Eres bonito, що в No eres bonito. Відповідь проста: no завжди стоїть перед зв’язкою ser, якою б формою вона не була — soy, eres чи es.',
  es: 'No + es already appeared as a ready formula: No es fácil, No es verdad. The same formula works with eres and with soy too — no always goes right before the linking word, whichever it is. No eres bonito negates the listener\'s quality, No soy rápido negates the speaker\'s own quality — both times no takes the same spot. The quality after the linking word never changes from negation: bonito stays bonito whether in Eres bonito or in No eres bonito. The answer is simple: no always goes before the linking word of ser, whichever form is used — soy, eres, or es.',
  'pt-BR': 'No + es já aparecia como fórmula pronta: No es fácil, No es verdad. A mesma fórmula funciona também com eres e com soy — no sempre fica bem antes da ligação, qualquer que seja ela. No eres bonito nega a qualidade do interlocutor, No soy rápido nega a qualidade do próprio falante — nas duas vezes no ocupa o mesmo lugar. A qualidade depois da ligação nunca muda com a negação: bonito continua bonito seja em Eres bonito, seja em No eres bonito. A resposta é simples: no sempre fica antes da ligação de ser, qualquer que seja a forma usada — soy, eres ou es.',
  vi: 'No + es đã xuất hiện trước đây như một công thức có sẵn: No es fácil, No es verdad. Cùng công thức đó hoạt động với eres và với soy — no luôn đứng ngay trước từ nối, dù đó là từ nào. No eres bonito phủ định đặc điểm của người nghe, No soy rápido phủ định đặc điểm của chính người nói — cả hai lần no đều ở cùng một vị trí. Đặc điểm sau từ nối không bao giờ đổi vì phủ định: bonito vẫn là bonito dù trong Eres bonito hay No eres bonito. Câu trả lời rất đơn giản: no luôn đứng trước từ nối của ser, dù dùng dạng nào — soy, eres hay es.',
  id: 'No + es sudah muncul sebagai rumus siap pakai: No es fácil, No es verdad. Rumus yang sama bekerja juga dengan eres dan dengan soy — no selalu berada tepat sebelum kata penghubung, apa pun itu. No eres bonito menegasikan sifat pendengar, No soy rápido menegasikan sifat penutur sendiri — kedua kali no menempati posisi yang sama. Sifat setelah kata penghubung tidak pernah berubah karena negasi: bonito tetap bonito baik dalam Eres bonito maupun No eres bonito. Jawabannya sederhana: no selalu berada sebelum kata penghubung ser, apa pun bentuk yang digunakan — soy, eres, atau es.',
  tr: 'No + es daha önce hazır bir formül olarak ortaya çıkmıştı: No es fácil, No es verdad. Aynı formül eres ve soy ile de çalışır — no her zaman hangisi olursa olsun bağlacın hemen önünde durur. No eres bonito dinleyicinin niteliğini olumsuzlar, No soy rápido konuşanın kendi niteliğini olumsuzlar — her iki durumda da no aynı yeri alır. Bağlaçtan sonraki nitelik olumsuzlamadan asla değişmez: bonito, ister Eres bonito’da ister No eres bonito’da olsun bonito kalır. Cevap basittir: no her zaman ser’in bağlacının hemen önünde durur, hangi biçim kullanılırsa kullanılsın — soy, eres ya da es.',
  pl: 'W sesji o przeczeniu no stawiano przed es: No es fácil, No es verdad. Ta sama formuła działa też z eres i z soy — no zawsze stoi tuż przed łącznikiem, jakikolwiek by on nie był. No eres bonito zaprzecza cesze słuchacza, No soy rápido zaprzecza cesze samego mówiącego — za każdym razem no zajmuje to samo miejsce. Cecha po łączniku nigdy się nie zmienia przez przeczenie: bonito pozostaje bonito zarówno w Eres bonito, jak i w No eres bonito. Odpowiedź jest prosta: no zawsze stoi przed łącznikiem ser, niezależnie od użytej formy — soy, eres czy es.',
});

const FORMULA_BODY = L({
  ru: 'Формула не меняется независимо от того, кто говорящий и о ком речь: no + связка + признак. No soy bonita говорит женщина о себе, No eres bonito обращаются к мужчине, No es bonito — про предмет. Признак согласуется по роду точно так же, как и без отрицания: bonito для мужского, bonita для женского, само наличие no на это не влияет. Ответ прост: в согласовании признака по роду отрицание ничего не меняет — единственное, что оно добавляет, это no перед связкой.',
  uk: 'Формула не змінюється незалежно від того, хто мовець і про кого йдеться: no + зв’язка + ознака. No soy bonita каже жінка про себе, No eres bonito звертаються до чоловіка, No es bonito — про предмет. Ознака узгоджується за родом точно так само, як і без заперечення: bonito для чоловічого, bonita для жіночого, сама наявність no на це не впливає. Відповідь проста: в узгодженні ознаки за родом заперечення нічого не змінює — єдине, що воно додає, це no перед зв’язкою.',
  es: 'The formula does not change regardless of who is speaking or who is being talked about: no + linking word + quality. No soy bonita is a woman talking about herself, No eres bonito addresses a man, No es bonito is about a thing. The quality agrees by gender exactly as it does without negation: bonito for masculine, bonita for feminine, the presence of no does not affect this. The answer is simple: it changes nothing in gender agreement — the only thing negation adds is no before the linking word.',
  'pt-BR': 'A fórmula não muda, seja quem for quem fala ou de quem se fala: no + ligação + qualidade. No soy bonita é uma mulher falando de si mesma, No eres bonito fala com um homem, No es bonito é sobre uma coisa. A qualidade concorda em gênero exatamente como sem negação: bonito para masculino, bonita para feminino, a presença de no não afeta isso. A resposta é simples: na concordância de gênero da qualidade, a negação não muda nada — a única coisa que ela acrescenta é no antes da ligação.',
  vi: 'Công thức không đổi bất kể ai nói hay nói về ai: no + từ nối + đặc điểm. No soy bonita là một phụ nữ nói về chính mình, No eres bonito nói với một người đàn ông, No es bonito nói về một vật. Đặc điểm hòa hợp theo giống y hệt như không có phủ định: bonito cho giống đực, bonita cho giống cái, sự có mặt của no không ảnh hưởng đến điều này. Câu trả lời rất đơn giản: trong sự hòa hợp giống của đặc điểm, phủ định không thay đổi gì — điều duy nhất nó thêm vào là no trước từ nối.',
  id: 'Rumusnya tidak berubah, siapa pun yang berbicara atau siapa pun yang dibicarakan: no + kata penghubung + sifat. No soy bonita adalah seorang wanita berbicara tentang dirinya sendiri, No eres bonito berbicara dengan seorang pria, No es bonito tentang suatu benda. Sifatnya sesuai gender persis seperti tanpa negasi: bonito untuk maskulin, bonita untuk feminin, kehadiran no tidak memengaruhi hal ini. Jawabannya sederhana: dalam kesesuaian gender sifat, negasi tidak mengubah apa pun — satu-satunya hal yang ditambahkannya adalah no sebelum kata penghubung.',
  tr: 'Formül, kim konuşursa konuşsun ya da kimden bahsedilirse bahsedilsin değişmez: no + bağlaç + nitelik. No soy bonita kendisi hakkında konuşan bir kadındır, No eres bonito bir erkeğe hitap eder, No es bonito bir şey hakkındadır. Nitelik, olumsuzlama olmadan olduğu gibi cinsiyete göre uyum sağlar: eril için bonito, dişil için bonita, no’nun varlığı bunu etkilemez. Cevap basittir: niteliğin cinsiyet uyumunda olumsuzlama hiçbir şeyi değiştirmez — eklediği tek şey bağlaçtan önceki no’dur.',
  pl: 'Formuła nie zmienia się niezależnie od tego, kto mówi lub o kim mowa: no + łącznik + cecha. No soy bonita to kobieta mówiąca o sobie, No eres bonito zwraca się do mężczyzny, No es bonito dotyczy rzeczy. Cecha zgadza się pod względem rodzaju dokładnie tak samo jak bez przeczenia: bonito dla męskiego, bonita dla żeńskiego, obecność no na to nie wpływa. Odpowiedź jest prosta: w zgodności rodzaju cechy przeczenie nic nie zmienia — jedyne, co dodaje, to no przed łącznikiem.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — поставить no не перед связкой, а перед признаком: Eres no bonito вместо No eres bonito. По-испански no всегда идёт первым, сразу перед связкой, а не где-то в середине фразы. Вторая ловушка — перепутать связку после отрицания: No es bonito звучит иначе, чем No eres bonito, потому что es и eres называют разных участников разговора — предмет и собеседника. Проверка простая: сначала no, потом связка (soy/eres/es), только затем признак — порядок всегда один и тот же, никаких исключений.',
  uk: 'Найчастіша помилка — поставити no не перед зв’язкою, а перед ознакою: Eres no bonito замість No eres bonito. В іспанській no завжди йде першим, одразу перед зв’язкою, а не десь усередині фрази. Друга пастка — сплутати зв’язку після заперечення: No es bonito звучить інакше, ніж No eres bonito, бо es і eres називають різних учасників розмови — предмет і співрозмовника. Перевірка проста: спочатку no, потім зв’язка (soy/eres/es), тільки після — ознака — порядок завжди один і той самий, без винятків.',
  es: 'The most common mistake is placing no not before the linking word, but before the quality: Eres no bonito instead of No eres bonito. In Spanish no always comes first, right before the linking word, not somewhere in the middle of the phrase. The second trap is confusing the linking word after negation: No es bonito sounds different from No eres bonito, because es and eres name different participants in the conversation — a thing and the listener. The check is simple: first no, then the linking word (soy/eres/es), only then the quality — the order is always the same, no exceptions.',
  'pt-BR': 'O erro mais comum é colocar no não antes da ligação, mas antes da qualidade: Eres no bonito em vez de No eres bonito. Em espanhol no sempre vem primeiro, logo antes da ligação, não em algum lugar no meio da frase. A segunda armadilha é confundir a ligação depois da negação: No es bonito soa diferente de No eres bonito, porque es e eres nomeiam participantes diferentes da conversa — uma coisa e o interlocutor. A checagem é simples: primeiro no, depois a ligação (soy/eres/es), só então a qualidade — a ordem é sempre a mesma, sem exceções.',
  vi: 'Lỗi phổ biến nhất là đặt no không phải trước từ nối, mà trước đặc điểm: Eres no bonito thay vì No eres bonito. Trong tiếng Tây Ban Nha no luôn đứng đầu, ngay trước từ nối, không phải ở đâu đó giữa câu. Cái bẫy thứ hai là nhầm lẫn từ nối sau phủ định: No es bonito nghe khác với No eres bonito, vì es và eres gọi tên những người tham gia hội thoại khác nhau — một vật và người nghe. Cách kiểm tra đơn giản: trước tiên no, rồi đến từ nối (soy/eres/es), chỉ sau đó mới đến đặc điểm — trật tự luôn giống nhau, không có ngoại lệ.',
  id: 'Kesalahan paling umum adalah meletakkan no bukan sebelum kata penghubung, tetapi sebelum sifat: Eres no bonito alih-alih No eres bonito. Dalam bahasa Spanyol no selalu datang pertama, tepat sebelum kata penghubung, bukan di suatu tempat di tengah frasa. Jebakan kedua adalah mengacaukan kata penghubung setelah negasi: No es bonito terdengar berbeda dari No eres bonito, karena es dan eres menyebut peserta percakapan yang berbeda — benda dan pendengar. Pengecekannya sederhana: pertama no, lalu kata penghubung (soy/eres/es), baru kemudian sifat — urutannya selalu sama, tanpa pengecualian.',
  tr: 'En yaygın hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: No eres bonito yerine Eres no bonito. İspanyolcada no her zaman önce gelir, tam bağlaçtan önce, ifadenin ortasında bir yerde değil. İkinci tuzak, olumsuzlamadan sonraki bağlacı karıştırmaktır: No es bonito, No eres bonito’dan farklı duyulur, çünkü es ve eres konuşmanın farklı katılımcılarını adlandırır — bir şey ve dinleyici. Kontrol basittir: önce no, sonra bağlaç (soy/eres/es), ancak ondan sonra nitelik — sıra her zaman aynıdır, istisnasız.',
  pl: 'Najczęstszy błąd to postawienie no nie przed łącznikiem, lecz przed cechą: Eres no bonito zamiast No eres bonito. W hiszpańskim no zawsze idzie pierwsze, tuż przed łącznikiem, a nie gdzieś w środku frazy. Druga pułapka to pomylenie łącznika po przeczeniu: No es bonito brzmi inaczej niż No eres bonito, ponieważ es i eres nazywają różnych uczestników rozmowy — rzecz i słuchacza. Sprawdzenie jest proste: najpierw no, potem łącznik (soy/eres/es), dopiero potem cecha — kolejność jest zawsze taka sama, bez wyjątków.',
});

export const ES_EPISODE_01_SESSION_11_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'No работает с любой связкой',
      uk: 'No працює з будь-якою зв’язкою',
      es: 'No works with any linking word',
      'pt-BR': 'No funciona com qualquer ligação',
      vi: 'No hoạt động với bất kỳ từ nối nào',
      id: 'No bekerja dengan kata penghubung apa pun',
      tr: 'No her bağlaçla çalışır',
      pl: 'No działa z każdym łącznikiem',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'No + es встречалось раньше как готовая формула: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'explanation' }, { text: '. Та же самая формула работает и с eres, и с soy — no всегда встаёт прямо перед связкой, какая бы она ни была. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' отрицает признак собеседника, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'targetCorrect' }, { text: ' отрицает признак самого говорящего — оба раза no занимает одно и то же место. Признак после связки никогда не меняется от отрицания: bonito остаётся bonito что в Eres bonito, что в No eres bonito. Ответ прост: no всегда встаёт перед связкой ser, какая бы форма ни использовалась — soy, eres или es.', semantic: 'explanation' }),
      uk: R({ text: 'No + es траплялося раніше як готова формула: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'explanation' }, { text: '. Та сама формула працює і з eres, і з soy — no завжди стоїть прямо перед зв’язкою, якою б вона не була. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' заперечує ознаку співрозмовника, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'targetCorrect' }, { text: ' заперечує ознаку самого мовця — обидва рази no займає те саме місце. Ознака після зв’язки ніколи не змінюється від заперечення: bonito лишається bonito що в Eres bonito, що в No eres bonito. Відповідь проста: no завжди стоїть перед зв’язкою ser, якою б формою вона не була — soy, eres чи es.', semantic: 'explanation' }),
      es: R({ text: 'In the session about negation, no was placed before es: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'explanation' }, { text: '. The same formula works with eres and with soy too — no always goes right before the linking word, whichever it is. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' negates the listener\'s quality, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'targetCorrect' }, { text: ' negates the speaker\'s own quality — both times no takes the same spot. The quality after the linking word never changes from negation: bonito stays bonito whether in Eres bonito or in No eres bonito. The answer is simple: no always goes before the linking word of ser, whichever form is used — soy, eres, or es.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Na sessão sobre negação, no ficava antes de es: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'explanation' }, { text: '. A mesma fórmula funciona também com eres e com soy — no sempre fica bem antes da ligação, qualquer que seja ela. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' nega a qualidade do interlocutor, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'targetCorrect' }, { text: ' nega a qualidade do próprio falante — nas duas vezes no ocupa o mesmo lugar. A qualidade depois da ligação nunca muda com a negação: bonito continua bonito seja em Eres bonito, seja em No eres bonito. A resposta é simples: no sempre fica antes da ligação de ser, qualquer que seja a forma usada — soy, eres ou es.', semantic: 'explanation' }),
      vi: R({ text: 'Trong buổi học về phủ định, no được đặt trước es: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'explanation' }, { text: '. Cùng công thức đó hoạt động với eres và với soy — no luôn đứng ngay trước từ nối, dù đó là từ nào. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' phủ định đặc điểm của người nghe, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'targetCorrect' }, { text: ' phủ định đặc điểm của chính người nói — cả hai lần no đều ở cùng một vị trí. Đặc điểm sau từ nối không bao giờ đổi vì phủ định: bonito vẫn là bonito dù trong Eres bonito hay No eres bonito. Câu trả lời rất đơn giản: no luôn đứng trước từ nối của ser, dù dùng dạng nào — soy, eres hay es.', semantic: 'explanation' }),
      id: R({ text: 'Dalam sesi tentang negasi, no diletakkan sebelum es: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'explanation' }, { text: '. Rumus yang sama bekerja juga dengan eres dan dengan soy — no selalu berada tepat sebelum kata penghubung, apa pun itu. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' menegasikan sifat pendengar, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'targetCorrect' }, { text: ' menegasikan sifat penutur sendiri — kedua kali no menempati posisi yang sama. Sifat setelah kata penghubung tidak pernah berubah karena negasi: bonito tetap bonito baik dalam Eres bonito maupun No eres bonito. Jawabannya sederhana: no selalu berada sebelum kata penghubung ser, apa pun bentuk yang digunakan — soy, eres, atau es.', semantic: 'explanation' }),
      tr: R({ text: 'Olumsuzlama hakkındaki oturumda no, es’ten önce konuluyordu: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'explanation' }, { text: '. Aynı formül eres ve soy ile de çalışır — no her zaman hangisi olursa olsun bağlacın hemen önüne gelir. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' dinleyicinin niteliğini olumsuzlar, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'targetCorrect' }, { text: ' konuşanın kendi niteliğini olumsuzlar — her iki durumda da no aynı yeri alır. Bağlaçtan sonraki nitelik olumsuzlamadan asla değişmez: bonito, ister Eres bonito’da ister No eres bonito’da olsun bonito kalır. Cevap basittir: no her zaman ser’in bağlacından önce gelir, hangi biçim kullanılırsa kullanılsın — soy, eres ya da es.', semantic: 'explanation' }),
      pl: R({ text: 'W sesji o przeczeniu no stawiano przed es: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'explanation' }, { text: '. Ta sama formuła działa też z eres i z soy — no zawsze stoi tuż przed łącznikiem, jakikolwiek by on nie był. ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' zaprzecza cesze słuchacza, ', semantic: 'explanation' }, { text: 'No soy rápido', semantic: 'targetCorrect' }, { text: ' zaprzecza cesze samego mówiącego — za każdym razem no zajmuje to samo miejsce. Cecha po łączniku nigdy się nie zmienia przez przeczenie: bonito pozostaje bonito zarówno w Eres bonito, jak i w No eres bonito. Odpowiedź jest prosta: no zawsze stoi przed łącznikiem ser, niezależnie od użytej formy — soy, eres czy es.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Где всегда стоит no по отношению к связке?',
        uk: 'Де завжди стоїть no відносно зв’язки?',
        es: 'Where does no always go relative to the linking word?',
        'pt-BR': 'Onde no sempre fica em relação à ligação?',
        vi: 'No luôn đứng ở đâu so với từ nối?',
        id: 'Di mana no selalu berada relatif terhadap kata penghubung?',
        tr: 'No, bağlaca göre her zaman nerede durur?',
        pl: 'Gdzie zawsze stoi no względem łącznika?',
      }),
      choices: [
        L({ ru: 'Прямо перед связкой', uk: 'Прямо перед зв’язкою', es: 'Right before the linking word', 'pt-BR': 'Bem antes da ligação', vi: 'Ngay trước từ nối', id: 'Tepat sebelum kata penghubung', tr: 'Bağlacın hemen önünde', pl: 'Tuż przed łącznikiem' }),
        L({ ru: 'Прямо перед признаком', uk: 'Прямо перед ознакою', es: 'Right before the quality', 'pt-BR': 'Bem antes da qualidade', vi: 'Ngay trước đặc điểm', id: 'Tepat sebelum sifat', tr: 'Niteliğin hemen önünde', pl: 'Tuż przed cechą' }),
        L({ ru: 'В самом конце фразы', uk: 'У самому кінці фрази', es: 'At the very end of the phrase', 'pt-BR': 'Bem no final da frase', vi: 'Ở cuối cùng của câu', id: 'Di paling akhir frasa', tr: 'İfadenin en sonunda', pl: 'Na samym końcu frazy' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No всегда стоит прямо перед связкой — soy, eres или es, — а не перед признаком и не в конце фразы.',
        uk: 'No завжди стоїть прямо перед зв’язкою — soy, eres чи es, — а не перед ознакою і не в кінці фрази.',
        es: 'No always goes right before the linking word — soy, eres, or es — not before the quality and not at the end of the phrase.',
        'pt-BR': 'No sempre fica bem antes da ligação — soy, eres ou es — não antes da qualidade e não no final da frase.',
        vi: 'No luôn đứng ngay trước từ nối — soy, eres hay es — không phải trước đặc điểm và không phải ở cuối câu.',
        id: 'No selalu berada tepat sebelum kata penghubung — soy, eres, atau es — bukan sebelum sifat dan bukan di akhir frasa.',
        tr: 'No her zaman bağlacın hemen önünde durur — soy, eres ya da es — niteliğin önünde değil ve ifadenin sonunda değil.',
        pl: 'No zawsze stoi tuż przed łącznikiem — soy, eres lub es — nie przed cechą i nie na końcu frazy.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Род признака не зависит от no',
      uk: 'Рід ознаки не залежить від no',
      es: 'The gender of the quality does not depend on no',
      'pt-BR': 'O gênero da qualidade não depende de no',
      vi: 'Giống của đặc điểm không phụ thuộc vào no',
      id: 'Gender sifat tidak bergantung pada no',
      tr: 'Niteliğin cinsiyeti no’ya bağlı değildir',
      pl: 'Rodzaj cechy nie zależy od no',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула не меняется независимо от того, кто говорящий и о ком речь: no + связка + признак. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'targetCorrect' }, { text: ' говорит женщина о себе, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' обращаются к мужчине, No es bonito — про предмет. Признак согласуется по роду точно так же, как и без отрицания: bonito для мужского, bonita для женского, само наличие no на это не влияет. Ответ прост: единственное, что меняет отрицание, — это появление no перед связкой; согласование признака по роду остаётся отдельным, независимым правилом.', semantic: 'explanation' }),
      uk: R({ text: 'Формула не змінюється незалежно від того, хто мовець і про кого йдеться: no + зв’язка + ознака. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'targetCorrect' }, { text: ' каже жінка про себе, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' звертаються до чоловіка, No es bonito — про предмет. Ознака узгоджується за родом точно так само, як і без заперечення: bonito для чоловічого, bonita для жіночого, сама наявність no на це не впливає. Відповідь проста: єдине, що змінює заперечення, — це поява no перед зв’язкою; узгодження ознаки за родом лишається окремим, незалежним правилом.', semantic: 'explanation' }),
      es: R({ text: 'The formula does not change regardless of who is speaking or who is being talked about: no + linking word + quality. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'targetCorrect' }, { text: ' is a woman talking about herself, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' addresses a man, No es bonito is about a thing. The quality agrees by gender exactly as it does without negation: bonito for masculine, bonita for feminine, the presence of no does not affect this. The answer is simple: the only thing negation changes is the appearance of no before the linking word; gender agreement of the quality remains a separate, independent rule.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula não muda, seja quem for quem fala ou de quem se fala: no + ligação + qualidade. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'targetCorrect' }, { text: ' é uma mulher falando de si mesma, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' fala com um homem, No es bonito é sobre uma coisa. A qualidade concorda em gênero exatamente como sem negação: bonito para masculino, bonita para feminino, a presença de no não afeta isso. A resposta é simples: a única coisa que a negação muda é o aparecimento de no antes da ligação; a concordância de gênero da qualidade continua sendo uma regra separada e independente.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức không đổi bất kể ai nói hay nói về ai: no + từ nối + đặc điểm. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'targetCorrect' }, { text: ' là một phụ nữ nói về chính mình, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' nói với một người đàn ông, No es bonito nói về một vật. Đặc điểm hòa hợp theo giống y hệt như không có phủ định: bonito cho giống đực, bonita cho giống cái, sự có mặt của no không ảnh hưởng đến điều này. Câu trả lời rất đơn giản: điều duy nhất phủ định thay đổi là sự xuất hiện của no trước từ nối; sự hòa hợp giống của đặc điểm vẫn là một quy tắc riêng, độc lập.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya tidak berubah, siapa pun yang berbicara atau siapa pun yang dibicarakan: no + kata penghubung + sifat. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'targetCorrect' }, { text: ' adalah seorang wanita berbicara tentang dirinya sendiri, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' berbicara dengan seorang pria, No es bonito tentang suatu benda. Sifatnya sesuai gender persis seperti tanpa negasi: bonito untuk maskulin, bonita untuk feminin, kehadiran no tidak memengaruhi hal ini. Jawabannya sederhana: satu-satunya hal yang diubah negasi adalah munculnya no sebelum kata penghubung; kesesuaian gender sifat tetap menjadi aturan terpisah dan independen.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, kim konuşursa konuşsun ya da kimden bahsedilirse bahsedilsin değişmez: no + bağlaç + nitelik. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'targetCorrect' }, { text: ' kendisi hakkında konuşan bir kadındır, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' bir erkeğe hitap eder, No es bonito bir şey hakkındadır. Nitelik, olumsuzlama olmadan olduğu gibi cinsiyete göre uyum sağlar: eril için bonito, dişil için bonita, no’nun varlığı bunu etkilemez. Cevap basittir: olumsuzlamanın değiştirdiği tek şey bağlaçtan önce no’nun ortaya çıkmasıdır; niteliğin cinsiyet uyumu ayrı, bağımsız bir kural olarak kalır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła nie zmienia się niezależnie od tego, kto mówi lub o kim mowa: no + łącznik + cecha. ', semantic: 'explanation' }, { text: 'No soy bonita', semantic: 'targetCorrect' }, { text: ' to kobieta mówiąca o sobie, ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' zwraca się do mężczyzny, No es bonito dotyczy rzeczy. Cecha zgadza się pod względem rodzaju dokładnie tak samo jak bez przeczenia: bonito dla męskiego, bonita dla żeńskiego, obecność no na to nie wpływa. Odpowiedź jest prosta: jedyne, co zmienia przeczenie, to pojawienie się no przed łącznikiem; zgodność rodzaju cechy pozostaje osobną, niezależną zasadą.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что меняет отрицание в согласовании признака по роду?',
        uk: 'Що змінює заперечення в узгодженні ознаки за родом?',
        es: 'What does negation change in the gender agreement of the quality?',
        'pt-BR': 'O que a negação muda na concordância de gênero da qualidade?',
        vi: 'Phủ định thay đổi gì trong sự hòa hợp giống của đặc điểm?',
        id: 'Apa yang diubah negasi dalam kesesuaian gender sifat?',
        tr: 'Olumsuzlama, niteliğin cinsiyet uyumunda neyi değiştirir?',
        pl: 'Co zmienia przeczenie w zgodności rodzaju cechy?',
      }),
      choices: [
        L({ ru: 'Ничего не меняет', uk: 'Нічого не змінює', es: 'It changes nothing', 'pt-BR': 'Não muda nada', vi: 'Không thay đổi gì', id: 'Tidak mengubah apa pun', tr: 'Hiçbir şeyi değiştirmez', pl: 'Nic nie zmienia' }),
        L({ ru: 'Признак всегда становится мужского рода', uk: 'Ознака завжди стає чоловічого роду', es: 'The quality always becomes masculine', 'pt-BR': 'A qualidade sempre se torna masculina', vi: 'Đặc điểm luôn trở thành giống đực', id: 'Sifat selalu menjadi maskulin', tr: 'Nitelik her zaman eril olur', pl: 'Cecha zawsze staje się rodzaju męskiego' }),
        L({ ru: 'Признак теряет согласование по роду', uk: 'Ознака втрачає узгодження за родом', es: 'The quality loses gender agreement', 'pt-BR': 'A qualidade perde a concordância de gênero', vi: 'Đặc điểm mất sự hòa hợp giống', id: 'Sifat kehilangan kesesuaian gender', tr: 'Nitelik cinsiyet uyumunu kaybeder', pl: 'Cecha traci zgodność rodzaju' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Отрицание ничего не меняет в согласовании — bonito/bonita по-прежнему согласуются по роду того, о ком идёт речь, точно так же, как без no.',
        uk: 'Заперечення нічого не змінює в узгодженні — bonito/bonita так само узгоджуються за родом того, про кого йдеться, точно так само, як без no.',
        es: 'Negation changes nothing about agreement — bonito/bonita still agree with the gender of who is being talked about, exactly as without no.',
        'pt-BR': 'A negação não muda nada na concordância — bonito/bonita continuam concordando com o gênero de quem se fala, exatamente como sem no.',
        vi: 'Phủ định không thay đổi gì trong hòa hợp — bonito/bonita vẫn hòa hợp theo giống của người được nói tới, y hệt như không có no.',
        id: 'Negasi tidak mengubah apa pun dalam kesesuaian — bonito/bonita tetap sesuai dengan gender orang yang dibicarakan, persis seperti tanpa no.',
        tr: 'Olumsuzlama uyumda hiçbir şeyi değiştirmez — bonito/bonita, no olmadan olduğu gibi, kimden bahsedildiğinin cinsiyetiyle uyumlu kalır.',
        pl: 'Przeczenie nic nie zmienia w zgodności — bonito/bonita nadal zgadzają się z rodzajem osoby, o której mowa, dokładnie tak samo jak bez no.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'No перед связкой, не перед признаком',
      uk: 'No перед зв’язкою, не перед ознакою',
      es: 'No before the linking word, not before the quality',
      'pt-BR': 'No antes da ligação, não antes da qualidade',
      vi: 'No trước từ nối, không phải trước đặc điểm',
      id: 'No sebelum kata penghubung, bukan sebelum sifat',
      tr: 'No bağlacın önünde, niteliğin önünde değil',
      pl: 'No przed łącznikiem, nie przed cechą',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — поставить no не перед связкой, а перед признаком: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. По-испански no всегда идёт первым, сразу перед связкой, а не где-то в середине фразы. Вторая ловушка — перепутать связку после отрицания: ', semantic: 'explanation' }, { text: 'No es bonito', semantic: 'explanation' }, { text: ' звучит иначе, чем ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ', потому что es и eres называют разных участников разговора — предмет и собеседника. Проверка простая: сначала no, потом связка (soy/eres/es), только затем признак — порядок всегда один и тот же, никаких исключений.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — поставити no не перед зв’язкою, а перед ознакою: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. В іспанській no завжди йде першим, одразу перед зв’язкою, а не десь усередині фрази. Друга пастка — сплутати зв’язку після заперечення: ', semantic: 'explanation' }, { text: 'No es bonito', semantic: 'explanation' }, { text: ' звучить інакше, ніж ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ', бо es і eres називають різних учасників розмови — предмет і співрозмовника. Перевірка проста: спочатку no, потім зв’язка (soy/eres/es), тільки після — ознака — порядок завжди один і той самий, без винятків.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is placing no not before the linking word, but before the quality: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. In Spanish no always comes first, right before the linking word, not somewhere in the middle of the phrase. The second trap is confusing the linking word after negation: ', semantic: 'explanation' }, { text: 'No es bonito', semantic: 'explanation' }, { text: ' sounds different from ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ', because es and eres name different participants in the conversation — a thing and the listener. The check is simple: first no, then the linking word (soy/eres/es), only then the quality — the order is always the same, no exceptions.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é colocar no não antes da ligação, mas antes da qualidade: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. Em espanhol no sempre vem primeiro, logo antes da ligação, não em algum lugar no meio da frase. A segunda armadilha é confundir a ligação depois da negação: ', semantic: 'explanation' }, { text: 'No es bonito', semantic: 'explanation' }, { text: ' soa diferente de ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ', porque es e eres nomeiam participantes diferentes da conversa — uma coisa e o interlocutor. A checagem é simples: primeiro no, depois a ligação (soy/eres/es), só então a qualidade — a ordem é sempre a mesma, sem exceções.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là đặt no không phải trước từ nối, mà trước đặc điểm: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. Trong tiếng Tây Ban Nha no luôn đứng đầu, ngay trước từ nối, không phải ở đâu đó giữa câu. Cái bẫy thứ hai là nhầm lẫn từ nối sau phủ định: ', semantic: 'explanation' }, { text: 'No es bonito', semantic: 'explanation' }, { text: ' nghe khác với ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ', vì es và eres gọi tên những người tham gia hội thoại khác nhau — một vật và người nghe. Cách kiểm tra đơn giản: trước tiên no, rồi đến từ nối (soy/eres/es), chỉ sau đó mới đến đặc điểm — trật tự luôn giống nhau, không có ngoại lệ.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah meletakkan no bukan sebelum kata penghubung, tetapi sebelum sifat: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. Dalam bahasa Spanyol no selalu datang pertama, tepat sebelum kata penghubung, bukan di suatu tempat di tengah frasa. Jebakan kedua adalah mengacaukan kata penghubung setelah negasi: ', semantic: 'explanation' }, { text: 'No es bonito', semantic: 'explanation' }, { text: ' terdengar berbeda dari ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ', karena es dan eres menyebut peserta percakapan yang berbeda — benda dan pendengar. Pengecekannya sederhana: pertama no, lalu kata penghubung (soy/eres/es), baru kemudian sifat — urutannya selalu sama, tanpa pengecualian.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: '. İspanyolcada no her zaman önce gelir, tam bağlaçtan önce, ifadenin ortasında bir yerde değil. İkinci tuzak, olumsuzlamadan sonraki bağlacı karıştırmaktır: ', semantic: 'explanation' }, { text: 'No es bonito', semantic: 'explanation' }, { text: ', ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '’dan farklı duyulur, çünkü es ve eres konuşmanın farklı katılımcılarını adlandırır — bir şey ve dinleyici. Kontrol basittir: önce no, sonra bağlaç (soy/eres/es), ancak ondan sonra nitelik — sıra her zaman aynıdır, istisnasız.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to postawienie no nie przed łącznikiem, lecz przed cechą: ', semantic: 'explanation' }, { text: 'Eres no bonito', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: '. W hiszpańskim no zawsze idzie pierwsze, tuż przed łącznikiem, a nie gdzieś w środku frazy. Druga pułapka to pomylenie łącznika po przeczeniu: ', semantic: 'explanation' }, { text: 'No es bonito', semantic: 'explanation' }, { text: ' brzmi inaczej niż ', semantic: 'explanation' }, { text: 'No eres bonito', semantic: 'targetCorrect' }, { text: ', ponieważ es i eres nazywają różnych uczestników rozmowy — rzecz i słuchacza. Sprawdzenie jest proste: najpierw no, potem łącznik (soy/eres/es), dopiero potem cecha — kolejność jest zawsze taka sama, bez wyjątków.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно возразить собеседнику мужского рода на комплимент?',
        uk: 'Як правильно заперечити співрозмовнику чоловічого роду на комплімент?',
        es: 'How do you correctly object to a compliment from a masculine listener?',
        'pt-BR': 'Como objetar corretamente a um elogio de um interlocutor masculino?',
        vi: 'Phản đối đúng cách lời khen của người nghe giống đực như thế nào?',
        id: 'Bagaimana cara menolak pujian dari pendengar maskulin dengan benar?',
        tr: 'Eril bir dinleyicinin iltifatına doğru nasıl itiraz edilir?',
        pl: 'Jak poprawnie sprzeciwić się komplementowi od słuchacza rodzaju męskiego?',
      }),
      choices: [
        L({ ru: 'No eres bonito', uk: 'No eres bonito', es: 'No eres bonito', 'pt-BR': 'No eres bonito', vi: 'No eres bonito', id: 'No eres bonito', tr: 'No eres bonito', pl: 'No eres bonito' }),
        L({ ru: 'Eres no bonito', uk: 'Eres no bonito', es: 'Eres no bonito', 'pt-BR': 'Eres no bonito', vi: 'Eres no bonito', id: 'Eres no bonito', tr: 'Eres no bonito', pl: 'Eres no bonito' }),
        L({ ru: 'No es bonito', uk: 'No es bonito', es: 'No es bonito', 'pt-BR': 'No es bonito', vi: 'No es bonito', id: 'No es bonito', tr: 'No es bonito', pl: 'No es bonito' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No eres bonito верно, потому что no стоит перед связкой eres, а сама связка — та, что для собеседника напрямую, не для предмета.',
        uk: 'No eres bonito правильно, бо no стоїть перед зв’язкою eres, а сама зв’язка — та, що для співрозмовника напряму, не для предмета.',
        es: 'No eres bonito is correct because no stands before the linking word eres, and the linking word itself is the one for the listener directly, not for a thing.',
        'pt-BR': 'No eres bonito está correto porque no fica antes da ligação eres, e a própria ligação é a que serve para o interlocutor diretamente, não para uma coisa.',
        vi: 'No eres bonito đúng vì no đứng trước từ nối eres, và bản thân từ nối là từ dùng cho người nghe trực tiếp, không phải cho một vật.',
        id: 'No eres bonito benar karena no berada sebelum kata penghubung eres, dan kata penghubung itu sendiri adalah yang untuk pendengar secara langsung, bukan untuk benda.',
        tr: 'No eres bonito doğrudur çünkü no, eres bağlacından önce durur ve bağlacın kendisi doğrudan dinleyici için olandır, bir şey için değil.',
        pl: 'No eres bonito jest poprawne, ponieważ no stoi przed łącznikiem eres, a sam łącznik jest tym dla słuchacza bezpośrednio, nie dla rzeczy.',
      }),
    },
  },
];
