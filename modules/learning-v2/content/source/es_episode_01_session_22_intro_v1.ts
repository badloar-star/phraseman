import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 22 "Важно или нет" / importance_adjective, builtOn: [5, 21],
// recalls: [5, 21]): три страницы concept/formula/trap дают importante первую
// сфокусированную трактовку — слово уже встречалось как обычный признак в
// сессии 1 (Es importante) и в сессии 21 (El libro es importante), но здесь
// впервые прямо противопоставляется своей ближайшей смысловой
// противоположности в курсе — igual («всё равно», уже знакомой по сессии 19
// как реакция No es igual). Формула es/no es + признак не меняется (recall
// сессии 17), согласование по роду recall сессии 21 (el/la + libro), а
// igual сам НЕ согласуется по роду — этот контраст (importante само по себе
// без окончания рода, igual тоже без окончания) — главная ловушка страницы 3.
// Новых слов нет.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_22_TITLE = L({
  ru: 'Важно или нет',
  uk: 'Важливо чи ні',
  es: 'Important or not',
  'pt-BR': 'Importante ou não',
  vi: 'Quan trọng hay không',
  id: 'Penting atau tidak',
  tr: 'Önemli mi değil mi',
  pl: 'Ważne czy nie',
});

export const ES_EPISODE_01_SESSION_22_SUMMARY = L({
  ru: 'Importante против igual — как отделить значимое от безразличного, для предметов и для ситуаций.',
  uk: 'Importante проти igual — як відділити значуще від байдужого, для предметів і для ситуацій.',
  es: 'Importante versus igual — how to separate what matters from what does not, for things and for situations.',
  'pt-BR': 'Importante contra igual — como separar o que importa do que não importa, para coisas e para situações.',
  vi: 'Importante đối lập igual — làm thế nào để phân biệt điều quan trọng với điều không, cho vật và cho tình huống.',
  id: 'Importante versus igual — cara memisahkan yang penting dari yang tidak, untuk benda dan untuk situasi.',
  tr: 'Importante ile igual karşılaştırması — nesneler ve durumlar için önemli olanı önemsiz olandan nasıl ayırt edilir.',
  pl: 'Importante kontra igual — jak oddzielić to, co ważne, od tego, co obojętne, dla rzeczy i dla sytuacji.',
});

export const ES_EPISODE_01_SESSION_22_GOAL = L({
  ru: 'Уверенно противопоставлять importante и igual, применяя обе к предметам с родом и к безличным ситуациям.',
  uk: 'Впевнено протиставляти importante і igual, застосовуючи обидва до предметів з родом і до безособових ситуацій.',
  es: 'Confidently contrast importante and igual, applying both to gendered things and to impersonal situations.',
  'pt-BR': 'Contrastar com confiança importante e igual, aplicando ambos a coisas com gênero e a situações impessoais.',
  vi: 'Tự tin đối lập importante và igual, áp dụng cả hai cho vật có giống và cho tình huống phi nhân xưng.',
  id: 'Membedakan dengan percaya diri importante dan igual, menerapkan keduanya pada benda bergender dan situasi impersonal.',
  tr: 'Importante ve igual’i güvenle karşılaştırmak, ikisini de cinsiyetli şeylere ve kişisiz durumlara uygulamak.',
  pl: 'Pewnie przeciwstawiać importante i igual, stosując oba do rzeczy z rodzajem i do sytuacji bezosobowych.',
});

const CONCEPT_BODY = L({
  ru: 'Importante уже встречалось раньше — как обычный признак, среди прочих. Теперь у него появляется настоящий противник: igual, «всё равно», уже знакомое по фразам вроде No es igual. Разница простая: Es importante говорит, что что-то имеет значение, Es igual говорит, что значения нет вовсе — выбор не имеет цены. El libro es importante называет конкретную книгу значимой; El libro es igual говорит, что она ничем не отличается от другой. Оба признака встают после связки es точно так же, как caro или bonito — ничего нового в устройстве фразы нет, меняется только смысл.',
  uk: 'Importante вже траплялося раніше — як звичайна ознака, серед інших. Тепер у нього з’являється справжній суперник: igual, «все одно», вже знайоме за фразами на кшталт No es igual. Різниця проста: Es importante каже, що щось має значення, Es igual каже, що значення немає взагалі — вибір не має ціни. El libro es importante називає конкретну книгу значущою; El libro es igual каже, що вона нічим не відрізняється від іншої. Обидві ознаки стоять після зв’язки es точно так само, як caro чи bonito — нічого нового в устрої фрази немає, змінюється лише сенс.',
  es: 'Importante has already appeared before — as an ordinary quality, among others. Now it gets a real opponent: igual, "all the same," already familiar from phrases like No es igual. The difference is simple: Es importante says something matters, Es igual says nothing matters at all — the choice has no cost. El libro es importante calls a specific book significant; El libro es igual says it is no different from another. Both qualities go after the linking word es exactly like caro or bonito — nothing new in the phrase\'s structure, only the meaning changes.',
  'pt-BR': 'Importante já apareceu antes — como uma qualidade comum, entre outras. Agora ganha um verdadeiro oponente: igual, "dá no mesmo," já conhecido de frases como No es igual. A diferença é simples: Es importante diz que algo importa, Es igual diz que nada importa — a escolha não tem custo. El libro es importante chama um livro específico de importante; El libro es igual diz que ele não é diferente de outro. As duas qualidades ficam depois da ligação es exatamente como caro ou bonito — nada de novo na estrutura da frase, só o significado muda.',
  vi: 'Importante đã xuất hiện từ trước — như một đặc điểm bình thường, trong số những đặc điểm khác. Bây giờ nó có một đối thủ thực sự: igual, "sao cũng được," đã quen thuộc từ những câu như No es igual. Sự khác biệt rất đơn giản: Es importante nói rằng điều gì đó quan trọng, Es igual nói rằng không có gì quan trọng cả — lựa chọn không tốn gì cả. El libro es importante gọi một cuốn sách cụ thể là quan trọng; El libro es igual nói rằng nó không khác gì cuốn khác. Cả hai đặc điểm đều đứng sau từ nối es giống hệt như caro hay bonito — không có gì mới trong cấu trúc câu, chỉ nghĩa thay đổi.',
  id: 'Importante sudah pernah muncul sebelumnya — sebagai sifat biasa, di antara yang lain. Sekarang ia mendapat lawan sejati: igual, "sama saja," sudah dikenal dari frasa seperti No es igual. Perbedaannya sederhana: Es importante mengatakan sesuatu itu penting, Es igual mengatakan tidak ada yang penting sama sekali — pilihan tidak memiliki biaya. El libro es importante menyebut buku tertentu sebagai penting; El libro es igual mengatakan tidak berbeda dari yang lain. Kedua sifat itu berada setelah kata penghubung es persis seperti caro atau bonito — tidak ada yang baru dalam struktur frasa, hanya maknanya yang berubah.',
  tr: 'Importante daha önce de ortaya çıkmıştı — diğerleri arasında sıradan bir nitelik olarak. Şimdi gerçek bir rakibi var: igual, "fark etmez," No es igual gibi ifadelerden zaten tanıdık. Fark basit: Es importante bir şeyin önemli olduğunu söyler, Es igual hiçbir şeyin önemli olmadığını söyler — seçimin bedeli yoktur. El libro es importante belirli bir kitabı önemli olarak adlandırır; El libro es igual onun başka bir kitaptan farksız olduğunu söyler. Her iki nitelik de tıpkı caro ya da bonito gibi es bağlacından sonra gelir — ifadenin yapısında yeni bir şey yok, sadece anlam değişir.',
  pl: 'Importante już wcześniej się pojawiało — jako zwykła cecha, wśród innych. Teraz zyskuje prawdziwego przeciwnika: igual, „wszystko jedno”, już znane z fraz takich jak No es igual. Różnica jest prosta: Es importante mówi, że coś ma znaczenie, Es igual mówi, że nic nie ma znaczenia — wybór nic nie kosztuje. El libro es importante nazywa konkretną książkę znaczącą; El libro es igual mówi, że niczym się nie różni od innej. Obie cechy stoją po łączniku es dokładnie tak samo jak caro czy bonito — nic nowego w budowie frazy, zmienia się tylko sens.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что и для caro/bonito: связка es (или no es) плюс признак, а перед предметом — ещё и артикль el/la, называющий его род. El libro es importante — книга значима; El libro no es importante — книга не значима. Но igual ведёт себя иначе: он не согласуется по роду вовсе, даже рядом с libro мужского рода — El libro es igual, а не El libro es iguala, потому что формы iguala просто не существует. Importante тоже не меняется по роду — оба признака держат одну форму, разница между ними только в значении.',
  uk: 'Формула та сама, що й для caro/bonito: зв’язка es (або no es) плюс ознака, а перед предметом — ще й артикль el/la, що називає його рід. El libro es importante — книга значуща; El libro no es importante — книга не значуща. Але igual поводиться інакше: він не узгоджується за родом узагалі, навіть біля libro чоловічого роду — El libro es igual, а не El libro es iguala, бо форми iguala просто не існує. Importante також не змінюється за родом — обидві ознаки тримають єдину форму, різниця між ними лише у значенні.',
  es: 'The formula is the same as for caro/bonito: the linking word es (or no es) plus the quality, and before a thing, also the article el/la naming its gender. El libro es importante — the book is significant; El libro no es importante — the book is not significant. But igual behaves differently: it does not agree by gender at all, even next to masculine libro — El libro es igual, not El libro es iguala, because the form iguala simply does not exist. Importante also does not change by gender — both qualities keep one form, the difference is only in meaning.',
  'pt-BR': 'A fórmula é a mesma de caro/bonito: a ligação es (ou no es) mais a qualidade, e antes de uma coisa, também o artigo el/la nomeando seu gênero. El libro es importante — o livro é importante; El libro no es importante — o livro não é importante. Mas igual se comporta de forma diferente: não concorda em gênero de jeito nenhum, mesmo ao lado do masculino libro — El libro es igual, não El libro es iguala, porque a forma iguala simplesmente não existe. Importante também não muda por gênero — as duas qualidades mantêm uma forma só, a diferença está só no significado.',
  vi: 'Công thức giống hệt như với caro/bonito: từ nối es (hoặc no es) cộng với đặc điểm, và trước một vật, còn có mạo từ el/la gọi tên giống của nó. El libro es importante — cuốn sách quan trọng; El libro no es importante — cuốn sách không quan trọng. Nhưng igual hoạt động khác: nó hoàn toàn không hòa hợp theo giống, ngay cả khi đứng cạnh libro giống đực — El libro es igual, không phải El libro es iguala, vì dạng iguala đơn giản không tồn tại. Importante cũng không đổi theo giống — cả hai đặc điểm giữ một dạng duy nhất, khác biệt chỉ nằm ở nghĩa.',
  id: 'Rumusnya sama seperti untuk caro/bonito: kata penghubung es (atau no es) ditambah sifat, dan sebelum benda, juga artikel el/la yang menyebutkan gendernya. El libro es importante — bukunya penting; El libro no es importante — bukunya tidak penting. Tapi igual berperilaku berbeda: sama sekali tidak sesuai dengan gender, bahkan di samping libro yang maskulin — El libro es igual, bukan El libro es iguala, karena bentuk iguala sama sekali tidak ada. Importante juga tidak berubah menurut gender — kedua sifat mempertahankan satu bentuk, perbedaannya hanya pada makna.',
  tr: 'Formül, caro/bonito için olanla aynıdır: es (ya da no es) bağlacı artı nitelik, ve bir şeyden önce, cinsiyetini adlandıran el/la tanımlığı da eklenir. El libro es importante — kitap önemli; El libro no es importante — kitap önemli değil. Ama igual farklı davranır: eril libro’nun yanında bile cinsiyete hiç uyum sağlamaz — El libro es igual, El libro es iguala değil, çünkü iguala biçimi basitçe yoktur. Importante de cinsiyete göre değişmez — her iki nitelik de tek bir biçimi korur, fark yalnızca anlamdadır.',
  pl: 'Formuła jest taka sama jak dla caro/bonito: łącznik es (lub no es) plus cecha, a przed rzeczą — także rodzajnik el/la nazywający jej rodzaj. El libro es importante — książka jest ważna; El libro no es importante — książka nie jest ważna. Ale igual zachowuje się inaczej: w ogóle nie zgadza się co do rodzaju, nawet obok męskiego libro — El libro es igual, nie El libro es iguala, bo forma iguala po prostu nie istnieje. Importante też nie zmienia się przez rodzaj — obie cechy zachowują jedną formę, różnica jest tylko w znaczeniu.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — согласовать igual по роду, как caro или bonito: El libro es iguala вместо El libro es igual. Igual не меняется никогда — сравните с fácil или verdad, которые тоже держат одну форму. Вторая ловушка — спутать значение: igual не значит «неважно» само по себе, оно значит полное безразличие, «нет никакой разницы». No es igual — это не то же самое, что No es importante: первое отрицает разницу между вариантами, второе отрицает саму значимость. Проверка простая: есть ли смысл беспокоиться — importante; есть ли разница между вариантами — igual.',
  uk: 'Найчастіша помилка — узгодити igual за родом, як caro чи bonito: El libro es iguala замість El libro es igual. Igual не змінюється ніколи — порівняйте з fácil чи verdad, які теж тримають одну форму. Друга пастка — сплутати значення: igual не означає «неважливо» саме по собі, воно означає повну байдужість, «немає жодної різниці». No es igual — це не те саме, що No es importante: перше заперечує різницю між варіантами, друге заперечує саму значущість. Перевірка проста: чи є сенс перейматися — importante; чи є різниця між варіантами — igual.',
  es: 'The most common mistake is agreeing igual by gender, like caro or bonito: El libro es iguala instead of El libro es igual. Igual never changes — compare it to fácil or verdad, which also keep one form. The second trap is confusing the meaning: igual does not mean "unimportant" on its own, it means total indifference, "there is no difference at all." No es igual is not the same as No es importante: the first negates a difference between options, the second negates significance itself. The check is simple: is it worth worrying about — importante; is there a difference between options — igual.',
  'pt-BR': 'O erro mais comum é concordar igual em gênero, como caro ou bonito: El libro es iguala em vez de El libro es igual. Igual nunca muda — compare com fácil ou verdad, que também mantêm uma forma só. A segunda armadilha é confundir o significado: igual não significa "sem importância" por si só, significa indiferença total, "não há diferença nenhuma." No es igual não é o mesmo que No es importante: o primeiro nega uma diferença entre opções, o segundo nega a própria importância. A checagem é simples: vale a pena se preocupar — importante; há diferença entre opções — igual.',
  vi: 'Lỗi phổ biến nhất là hòa hợp igual theo giống, như caro hay bonito: El libro es iguala thay vì El libro es igual. Igual không bao giờ đổi — hãy so sánh với fácil hay verdad, cũng giữ một dạng duy nhất. Cái bẫy thứ hai là nhầm nghĩa: igual tự nó không có nghĩa là "không quan trọng," nó có nghĩa là hoàn toàn thờ ơ, "không có sự khác biệt nào cả." No es igual không giống với No es importante: cái đầu phủ định sự khác biệt giữa các lựa chọn, cái sau phủ định chính tầm quan trọng. Cách kiểm tra đơn giản: có đáng lo lắng không — importante; có khác biệt giữa các lựa chọn không — igual.',
  id: 'Kesalahan paling umum adalah menyesuaikan igual menurut gender, seperti caro atau bonito: El libro es iguala alih-alih El libro es igual. Igual tidak pernah berubah — bandingkan dengan fácil atau verdad, yang juga mempertahankan satu bentuk. Jebakan kedua adalah mengacaukan makna: igual tidak berarti "tidak penting" dengan sendirinya, itu berarti ketidakpedulian total, "tidak ada bedanya sama sekali." No es igual tidak sama dengan No es importante: yang pertama menegasikan perbedaan antar opsi, yang kedua menegasikan kepentingan itu sendiri. Pengecekannya sederhana: apakah layak dikhawatirkan — importante; apakah ada perbedaan antar opsi — igual.',
  tr: 'En yaygın hata, igual’i caro ya da bonito gibi cinsiyete göre uyumlu hale getirmektir: El libro es iguala yerine El libro es igual. Igual asla değişmez — fácil ya da verdad ile karşılaştırın, onlar da tek bir biçimi korur. İkinci tuzak, anlamı karıştırmaktır: igual kendi başına "önemsiz" anlamına gelmez, tam bir kayıtsızlık anlamına gelir, "hiç fark etmez." No es igual, No es importante ile aynı değildir: ilki seçenekler arasındaki farkı olumsuzlar, ikincisi önemin kendisini olumsuzlar. Kontrol basittir: endişelenmeye değer mi — importante; seçenekler arasında fark var mı — igual.',
  pl: 'Najczęstszy błąd to dopasowanie igual pod względem rodzaju, jak caro czy bonito: El libro es iguala zamiast El libro es igual. Igual nigdy się nie zmienia — porównaj z fácil czy verdad, które też zachowują jedną formę. Druga pułapka to pomylenie znaczenia: igual samo w sobie nie znaczy „nieważne”, znaczy całkowitą obojętność, „nie ma żadnej różnicy”. No es igual to nie to samo co No es importante: pierwsze zaprzecza różnicy między opcjami, drugie zaprzecza samej ważności. Sprawdzenie jest proste: czy warto się martwić — importante; czy jest różnica między opcjami — igual.',
});

export const ES_EPISODE_01_SESSION_22_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Importante получает противника — igual',
      uk: 'Importante отримує суперника — igual',
      es: 'Importante gets an opponent — igual',
      'pt-BR': 'Importante ganha um oponente — igual',
      vi: 'Importante có một đối thủ — igual',
      id: 'Importante mendapat lawan — igual',
      tr: 'Importante bir rakip kazanır — igual',
      pl: 'Importante zyskuje przeciwnika — igual',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Importante уже встречалось раньше — как обычный признак, среди прочих. Теперь у него появляется настоящий противник: igual, «всё равно», уже знакомое по фразам вроде No es igual. Разница простая: ', semantic: 'explanation' }, { text: 'Es importante', semantic: 'targetCorrect' }, { text: ' говорит, что что-то имеет значение, ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetCorrect' }, { text: ' говорит, что значения нет вовсе — выбор не имеет цены. El libro es importante называет конкретную книгу значимой; El libro es igual говорит, что она ничем не отличается от другой. Оба признака встают после связки es точно так же, как caro или bonito — ничего нового в устройстве фразы нет, меняется только смысл.', semantic: 'explanation' }),
      uk: R({ text: 'Importante вже траплялося раніше — як звичайна ознака, серед інших. Тепер у нього з’являється справжній суперник: igual, «все одно», вже знайоме за фразами на кшталт No es igual. Різниця проста: ', semantic: 'explanation' }, { text: 'Es importante', semantic: 'targetCorrect' }, { text: ' каже, що щось має значення, ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetCorrect' }, { text: ' каже, що значення немає взагалі — вибір не має ціни. El libro es importante називає конкретну книгу значущою; El libro es igual каже, що вона нічим не відрізняється від іншої. Обидві ознаки стоять після зв’язки es точно так само, як caro чи bonito — нічого нового в устрої фрази немає, змінюється лише сенс.', semantic: 'explanation' }),
      es: R({ text: 'Importante has already appeared before — as an ordinary quality, among others. Now it gets a real opponent: igual, "all the same," already familiar from phrases like No es igual. The difference is simple: ', semantic: 'explanation' }, { text: 'Es importante', semantic: 'targetCorrect' }, { text: ' says something matters, ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetCorrect' }, { text: ' says nothing matters at all — the choice has no cost. El libro es importante calls a specific book significant; El libro es igual says it is no different from another. Both qualities go after the linking word es exactly like caro or bonito — nothing new in the phrase\'s structure, only the meaning changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Importante já apareceu antes — como uma qualidade comum, entre outras. Agora ganha um verdadeiro oponente: igual, "dá no mesmo," já conhecido de frases como No es igual. A diferença é simples: ', semantic: 'explanation' }, { text: 'Es importante', semantic: 'targetCorrect' }, { text: ' diz que algo importa, ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetCorrect' }, { text: ' diz que nada importa — a escolha não tem custo. El libro es importante chama um livro específico de importante; El libro es igual diz que ele não é diferente de outro. As duas qualidades ficam depois da ligação es exatamente como caro ou bonito — nada de novo na estrutura da frase, só o significado muda.', semantic: 'explanation' }),
      vi: R({ text: 'Importante đã xuất hiện từ trước — như một đặc điểm bình thường, trong số những đặc điểm khác. Bây giờ nó có một đối thủ thực sự: igual, "sao cũng được," đã quen thuộc từ những câu như No es igual. Sự khác biệt rất đơn giản: ', semantic: 'explanation' }, { text: 'Es importante', semantic: 'targetCorrect' }, { text: ' nói rằng điều gì đó quan trọng, ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetCorrect' }, { text: ' nói rằng không có gì quan trọng cả — lựa chọn không tốn gì cả. El libro es importante gọi một cuốn sách cụ thể là quan trọng; El libro es igual nói rằng nó không khác gì cuốn khác. Cả hai đặc điểm đều đứng sau từ nối es giống hệt như caro hay bonito — không có gì mới trong cấu trúc câu, chỉ nghĩa thay đổi.', semantic: 'explanation' }),
      id: R({ text: 'Importante sudah pernah muncul sebelumnya — sebagai sifat biasa, di antara yang lain. Sekarang ia mendapat lawan sejati: igual, "sama saja," sudah dikenal dari frasa seperti No es igual. Perbedaannya sederhana: ', semantic: 'explanation' }, { text: 'Es importante', semantic: 'targetCorrect' }, { text: ' mengatakan sesuatu itu penting, ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetCorrect' }, { text: ' mengatakan tidak ada yang penting sama sekali — pilihan tidak memiliki biaya. El libro es importante menyebut buku tertentu sebagai penting; El libro es igual mengatakan tidak berbeda dari yang lain. Kedua sifat itu berada setelah kata penghubung es persis seperti caro atau bonito — tidak ada yang baru dalam struktur frasa, hanya maknanya yang berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Importante daha önce de ortaya çıkmıştı — diğerleri arasında sıradan bir nitelik olarak. Şimdi gerçek bir rakibi var: igual, "fark etmez," No es igual gibi ifadelerden zaten tanıdık. Fark basit: ', semantic: 'explanation' }, { text: 'Es importante', semantic: 'targetCorrect' }, { text: ' bir şeyin önemli olduğunu söyler, ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetCorrect' }, { text: ' hiçbir şeyin önemli olmadığını söyler — seçimin bedeli yoktur. El libro es importante belirli bir kitabı önemli olarak adlandırır; El libro es igual onun başka bir kitaptan farksız olduğunu söyler. Her iki nitelik de tıpkı caro ya da bonito gibi es bağlacından sonra gelir — ifadenin yapısında yeni bir şey yok, sadece anlam değişir.', semantic: 'explanation' }),
      pl: R({ text: 'Importante już wcześniej się pojawiało — jako zwykła cecha, wśród innych. Teraz zyskuje prawdziwego przeciwnika: igual, „wszystko jedno”, już znane z fraz takich jak No es igual. Różnica jest prosta: ', semantic: 'explanation' }, { text: 'Es importante', semantic: 'targetCorrect' }, { text: ' mówi, że coś ma znaczenie, ', semantic: 'explanation' }, { text: 'Es igual', semantic: 'targetCorrect' }, { text: ' mówi, że nic nie ma znaczenia — wybór nic nie kosztuje. El libro es importante nazywa konkretną książkę znaczącą; El libro es igual mówi, że niczym się nie różni od innej. Obie cechy stoją po łączniku es dokładnie tak samo jak caro czy bonito — nic nowego w budowie frazy, zmienia się tylko sens.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как сказать, что что-то имеет значение?',
        uk: 'Як сказати, що щось має значення?',
        es: 'How do you say that something matters?',
        'pt-BR': 'Como dizer que algo importa?',
        vi: 'Làm thế nào để nói rằng điều gì đó quan trọng?',
        id: 'Bagaimana cara mengatakan bahwa sesuatu itu penting?',
        tr: 'Bir şeyin önemli olduğu nasıl söylenir?',
        pl: 'Jak powiedzieć, że coś ma znaczenie?',
      }),
      choices: [
        L({ ru: 'Es importante', uk: 'Es importante', es: 'Es importante', 'pt-BR': 'Es importante', vi: 'Es importante', id: 'Es importante', tr: 'Es importante', pl: 'Es importante' }),
        L({ ru: 'Es igual', uk: 'Es igual', es: 'Es igual', 'pt-BR': 'Es igual', vi: 'Es igual', id: 'Es igual', tr: 'Es igual', pl: 'Es igual' }),
        L({ ru: 'Eres importante', uk: 'Eres importante', es: 'Eres importante', 'pt-BR': 'Eres importante', vi: 'Eres importante', id: 'Eres importante', tr: 'Eres importante', pl: 'Eres importante' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es importante верно: связка es для безличной оценки плюс признак importante — «имеет значение».',
        uk: 'Es importante правильно: зв’язка es для безособової оцінки плюс ознака importante — «має значення».',
        es: 'Es importante is correct: the linking word es for an impersonal evaluation plus the quality importante — "matters."',
        'pt-BR': 'Es importante está correto: a ligação es para uma avaliação impessoal mais a qualidade importante — "importa."',
        vi: 'Es importante đúng: từ nối es cho đánh giá phi nhân xưng cộng với đặc điểm importante — "quan trọng."',
        id: 'Es importante benar: kata penghubung es untuk penilaian impersonal ditambah sifat importante — "penting."',
        tr: 'Es importante doğrudur: kişisiz değerlendirme için es bağlacı artı önemli anlamına gelen importante niteliği.',
        pl: 'Es importante jest poprawne: łącznik es do bezosobowej oceny plus cecha importante — „ma znaczenie”.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Igual не согласуется по роду вовсе',
      uk: 'Igual не узгоджується за родом узагалі',
      es: 'Igual does not agree by gender at all',
      'pt-BR': 'Igual não concorda em gênero de jeito nenhum',
      vi: 'Igual hoàn toàn không hòa hợp theo giống',
      id: 'Igual sama sekali tidak sesuai dengan gender',
      tr: 'Igual cinsiyete hiç uyum sağlamaz',
      pl: 'Igual w ogóle nie zgadza się co do rodzaju',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула та же, что и для caro/bonito: связка es (или no es) плюс признак, а перед предметом — ещё и артикль el/la, называющий его род. ', semantic: 'explanation' }, { text: 'El libro es importante', semantic: 'targetCorrect' }, { text: ' — книга значима; El libro no es importante — книга не значима. Но igual ведёт себя иначе: он не согласуется по роду вовсе, даже рядом с libro мужского рода — ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: ', а не El libro es iguala, потому что формы iguala просто не существует. Importante тоже не меняется по роду — оба признака держат одну форму, разница между ними только в значении.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й для caro/bonito: зв’язка es (або no es) плюс ознака, а перед предметом — ще й артикль el/la, що називає його рід. ', semantic: 'explanation' }, { text: 'El libro es importante', semantic: 'targetCorrect' }, { text: ' — книга значуща; El libro no es importante — книга не значуща. Але igual поводиться інакше: він не узгоджується за родом узагалі, навіть біля libro чоловічого роду — ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: ', а не El libro es iguala, бо форми iguala просто не існує. Importante також не змінюється за родом — обидві ознаки тримають єдину форму, різниця між ними лише у значенні.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for caro/bonito: the linking word es (or no es) plus the quality, and before a thing, also the article el/la naming its gender. ', semantic: 'explanation' }, { text: 'El libro es importante', semantic: 'targetCorrect' }, { text: ' — the book is significant; El libro no es importante — the book is not significant. But igual behaves differently: it does not agree by gender at all, even next to masculine libro — ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: ', not El libro es iguala, because the form iguala simply does not exist. Importante also does not change by gender — both qualities keep one form, the difference is only in meaning.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de caro/bonito: a ligação es (ou no es) mais a qualidade, e antes de uma coisa, também o artigo el/la nomeando seu gênero. ', semantic: 'explanation' }, { text: 'El libro es importante', semantic: 'targetCorrect' }, { text: ' — o livro é importante; El libro no es importante — o livro não é importante. Mas igual se comporta de forma diferente: não concorda em gênero de jeito nenhum, mesmo ao lado do masculino libro — ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: ', não El libro es iguala, porque a forma iguala simplesmente não existe. Importante também não muda por gênero — as duas qualidades mantêm uma forma só, a diferença está só no significado.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống hệt như với caro/bonito: từ nối es (hoặc no es) cộng với đặc điểm, và trước một vật, còn có mạo từ el/la gọi tên giống của nó. ', semantic: 'explanation' }, { text: 'El libro es importante', semantic: 'targetCorrect' }, { text: ' — cuốn sách quan trọng; El libro no es importante — cuốn sách không quan trọng. Nhưng igual hoạt động khác: nó hoàn toàn không hòa hợp theo giống, ngay cả khi đứng cạnh libro giống đực — ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: ', không phải El libro es iguala, vì dạng iguala đơn giản không tồn tại. Importante cũng không đổi theo giống — cả hai đặc điểm giữ một dạng duy nhất, khác biệt chỉ nằm ở nghĩa.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti untuk caro/bonito: kata penghubung es (atau no es) ditambah sifat, dan sebelum benda, juga artikel el/la yang menyebutkan gendernya. ', semantic: 'explanation' }, { text: 'El libro es importante', semantic: 'targetCorrect' }, { text: ' — bukunya penting; El libro no es importante — bukunya tidak penting. Tapi igual berperilaku berbeda: sama sekali tidak sesuai dengan gender, bahkan di samping libro yang maskulin — ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: ', bukan El libro es iguala, karena bentuk iguala sama sekali tidak ada. Importante juga tidak berubah menurut gender — kedua sifat mempertahankan satu bentuk, perbedaannya hanya pada makna.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, caro/bonito için olanla aynıdır: es (ya da no es) bağlacı artı nitelik, ve bir şeyden önce, cinsiyetini adlandıran el/la tanımlığı da eklenir. ', semantic: 'explanation' }, { text: 'El libro es importante', semantic: 'targetCorrect' }, { text: ' — kitap önemli; El libro no es importante — kitap önemli değil. Ama igual farklı davranır: eril libro’nun yanında bile cinsiyete hiç uyum sağlamaz — ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: ', El libro es iguala değil, çünkü iguala biçimi basitçe yoktur. Importante de cinsiyete göre değişmez — her iki nitelik de tek bir biçimi korur, fark yalnızca anlamdadır.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla caro/bonito: łącznik es (lub no es) plus cecha, a przed rzeczą — także rodzajnik el/la nazywający jej rodzaj. ', semantic: 'explanation' }, { text: 'El libro es importante', semantic: 'targetCorrect' }, { text: ' — książka jest ważna; El libro no es importante — książka nie jest ważna. Ale igual zachowuje się inaczej: w ogóle nie zgadza się co do rodzaju, nawet obok męskiego libro — ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: ', nie El libro es iguala, bo forma iguala po prostu nie istnieje. Importante też nie zmienia się przez rodzaj — obie cechy zachowują jedną formę, różnica jest tylko w znaczeniu.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно сказать про книгу, что она такая же?',
        uk: 'Як правильно сказати про книгу, що вона така сама?',
        es: 'How do you correctly say a book is the same?',
        'pt-BR': 'Como dizer corretamente que um livro é igual?',
        vi: 'Làm sao để nói đúng rằng một cuốn sách giống nhau?',
        id: 'Bagaimana cara mengatakan dengan benar bahwa sebuah buku sama saja?',
        tr: 'Bir kitabın aynı olduğu doğru şekilde nasıl söylenir?',
        pl: 'Jak poprawnie powiedzieć, że książka jest taka sama?',
      }),
      choices: [
        L({ ru: 'El libro es igual', uk: 'El libro es igual', es: 'El libro es igual', 'pt-BR': 'El libro es igual', vi: 'El libro es igual', id: 'El libro es igual', tr: 'El libro es igual', pl: 'El libro es igual' }),
        L({ ru: 'El libro es iguala', uk: 'El libro es iguala', es: 'El libro es iguala', 'pt-BR': 'El libro es iguala', vi: 'El libro es iguala', id: 'El libro es iguala', tr: 'El libro es iguala', pl: 'El libro es iguala' }),
        L({ ru: 'El libro eres igual', uk: 'El libro eres igual', es: 'El libro eres igual', 'pt-BR': 'El libro eres igual', vi: 'El libro eres igual', id: 'El libro eres igual', tr: 'El libro eres igual', pl: 'El libro eres igual' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'El libro es igual верно: igual не согласуется по роду, форма всегда одна и та же, независимо от рода предмета.',
        uk: 'El libro es igual правильно: igual не узгоджується за родом, форма завжди одна й та сама, незалежно від роду предмета.',
        es: 'El libro es igual is correct: igual does not agree by gender, the form is always the same, regardless of the thing\'s gender.',
        'pt-BR': 'El libro es igual está correto: igual não concorda em gênero, a forma é sempre a mesma, independente do gênero da coisa.',
        vi: 'El libro es igual đúng: igual không hòa hợp theo giống, dạng luôn giống nhau, bất kể giống của vật.',
        id: 'El libro es igual benar: igual tidak sesuai dengan gender, bentuknya selalu sama, terlepas dari gender bendanya.',
        tr: 'El libro es igual doğrudur: igual cinsiyete uyum sağlamaz, biçim şeyin cinsiyetinden bağımsız olarak her zaman aynıdır.',
        pl: 'El libro es igual jest poprawne: igual nie zgadza się co do rodzaju, forma jest zawsze taka sama, niezależnie od rodzaju rzeczy.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Igual — не про важность, а про разницу',
      uk: 'Igual — не про важливість, а про різницю',
      es: 'Igual is not about importance, but about difference',
      'pt-BR': 'Igual não é sobre importância, mas sobre diferença',
      vi: 'Igual không phải về tầm quan trọng, mà về sự khác biệt',
      id: 'Igual bukan tentang kepentingan, tapi tentang perbedaan',
      tr: 'Igual önemle değil, farkla ilgilidir',
      pl: 'Igual nie chodzi o ważność, lecz o różnicę',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — согласовать igual по роду, как caro или bonito: ', semantic: 'explanation' }, { text: 'El libro es iguala', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: '. Igual не меняется никогда — сравните с fácil или verdad, которые тоже держат одну форму. Вторая ловушка — спутать значение: igual не значит «неважно» само по себе, оно значит полное безразличие, «нет никакой разницы». No es igual — это не то же самое, что No es importante: первое отрицает разницу между вариантами, второе отрицает саму значимость. Проверка простая: есть ли смысл беспокоиться — importante; есть ли разница между вариантами — igual.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — узгодити igual за родом, як caro чи bonito: ', semantic: 'explanation' }, { text: 'El libro es iguala', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: '. Igual не змінюється ніколи — порівняйте з fácil чи verdad, які теж тримають одну форму. Друга пастка — сплутати значення: igual не означає «неважливо» саме по собі, воно означає повну байдужість, «немає жодної різниці». No es igual — це не те саме, що No es importante: перше заперечує різницю між варіантами, друге заперечує саму значущість. Перевірка проста: чи є сенс перейматися — importante; чи є різниця між варіантами — igual.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is agreeing igual by gender, like caro or bonito: ', semantic: 'explanation' }, { text: 'El libro es iguala', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: '. Igual never changes — compare it to fácil or verdad, which also keep one form. The second trap is confusing the meaning: igual does not mean "unimportant" on its own, it means total indifference, "there is no difference at all." No es igual is not the same as No es importante: the first negates a difference between options, the second negates significance itself. The check is simple: is it worth worrying about — importante; is there a difference between options — igual.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é concordar igual em gênero, como caro ou bonito: ', semantic: 'explanation' }, { text: 'El libro es iguala', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: '. Igual nunca muda — compare com fácil ou verdad, que também mantêm uma forma só. A segunda armadilha é confundir o significado: igual não significa "sem importância" por si só, significa indiferença total, "não há diferença nenhuma." No es igual não é o mesmo que No es importante: o primeiro nega uma diferença entre opções, o segundo nega a própria importância. A checagem é simples: vale a pena se preocupar — importante; há diferença entre opções — igual.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là hòa hợp igual theo giống, như caro hay bonito: ', semantic: 'explanation' }, { text: 'El libro es iguala', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: '. Igual không bao giờ đổi — hãy so sánh với fácil hay verdad, cũng giữ một dạng duy nhất. Cái bẫy thứ hai là nhầm nghĩa: igual tự nó không có nghĩa là "không quan trọng," nó có nghĩa là hoàn toàn thờ ơ, "không có sự khác biệt nào cả." No es igual không giống với No es importante: cái đầu phủ định sự khác biệt giữa các lựa chọn, cái sau phủ định chính tầm quan trọng. Cách kiểm tra đơn giản: có đáng lo lắng không — importante; có khác biệt giữa các lựa chọn không — igual.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah menyesuaikan igual menurut gender, seperti caro atau bonito: ', semantic: 'explanation' }, { text: 'El libro es iguala', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: '. Igual tidak pernah berubah — bandingkan dengan fácil atau verdad, yang juga mempertahankan satu bentuk. Jebakan kedua adalah mengacaukan makna: igual tidak berarti "tidak penting" dengan sendirinya, itu berarti ketidakpedulian total, "tidak ada bedanya sama sekali." No es igual tidak sama dengan No es importante: yang pertama menegasikan perbedaan antar opsi, yang kedua menegasikan kepentingan itu sendiri. Pengecekannya sederhana: apakah layak dikhawatirkan — importante; apakah ada perbedaan antar opsi — igual.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, igual’i caro ya da bonito gibi cinsiyete göre uyumlu hale getirmektir: ', semantic: 'explanation' }, { text: 'El libro es iguala', semantic: 'targetWrong' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: '. Igual asla değişmez — fácil ya da verdad ile karşılaştırın, onlar da tek bir biçimi korur. İkinci tuzak, anlamı karıştırmaktır: igual kendi başına "önemsiz" anlamına gelmez, tam bir kayıtsızlık anlamına gelir, "hiç fark etmez." No es igual, No es importante ile aynı değildir: ilki seçenekler arasındaki farkı olumsuzlar, ikincisi önemin kendisini olumsuzlar. Kontrol basittir: endişelenmeye değer mi — importante; seçenekler arasında fark var mı — igual.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to dopasowanie igual pod względem rodzaju, jak caro czy bonito: ', semantic: 'explanation' }, { text: 'El libro es iguala', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'El libro es igual', semantic: 'targetCorrect' }, { text: '. Igual nigdy się nie zmienia — porównaj z fácil czy verdad, które też zachowują jedną formę. Druga pułapka to pomylenie znaczenia: igual samo w sobie nie znaczy „nieważne”, znaczy całkowitą obojętność, „nie ma żadnej różnicy”. No es igual to nie to samo co No es importante: pierwsze zaprzecza różnicy między opcjami, drugie zaprzecza samej ważności. Sprawdzenie jest proste: czy warto się martwić — importante; czy jest różnica między opcjami — igual.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно возразить: книга не «неважная», книга «не такая же»?',
        uk: 'Як правильно заперечити: книга не «неважлива», книга «не така сама»?',
        es: 'How do you correctly object: not that the book is "unimportant," but that it is "not the same"?',
        'pt-BR': 'Como objetar corretamente: não que o livro é "sem importância," mas que ele "não é igual"?',
        vi: 'Làm sao để phản đối đúng cách: không phải cuốn sách "không quan trọng," mà là "không giống nhau"?',
        id: 'Bagaimana cara menolak dengan benar: bukan bahwa bukunya "tidak penting," tetapi "tidak sama"?',
        tr: 'Doğru itiraz nasıl yapılır: kitabın "önemsiz" olduğu değil, "aynı olmadığı"?',
        pl: 'Jak poprawnie sprzeciwić się: nie że książka jest „nieważna”, ale że jest „nie taka sama”?',
      }),
      choices: [
        L({ ru: 'No es igual', uk: 'No es igual', es: 'No es igual', 'pt-BR': 'No es igual', vi: 'No es igual', id: 'No es igual', tr: 'No es igual', pl: 'No es igual' }),
        L({ ru: 'No es importante', uk: 'No es importante', es: 'No es importante', 'pt-BR': 'No es importante', vi: 'No es importante', id: 'No es importante', tr: 'No es importante', pl: 'No es importante' }),
        L({ ru: 'No es iguala', uk: 'No es iguala', es: 'No es iguala', 'pt-BR': 'No es iguala', vi: 'No es iguala', id: 'No es iguala', tr: 'No es iguala', pl: 'No es iguala' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No es igual верно: отрицают именно схожесть/безразличие, а не значимость — importante здесь была бы неверным выбором по смыслу.',
        uk: 'No es igual правильно: заперечують саме схожість/байдужість, а не значущість — importante тут була б неправильним вибором за змістом.',
        es: 'No es igual is correct: it negates sameness/indifference specifically, not significance — importante would be the wrong choice in meaning here.',
        'pt-BR': 'No es igual está correto: nega especificamente a igualdade/indiferença, não a importância — importante seria a escolha errada de significado aqui.',
        vi: 'No es igual đúng: phủ định chính xác sự giống nhau/thờ ơ, không phải tầm quan trọng — importante sẽ là lựa chọn sai về nghĩa ở đây.',
        id: 'No es igual benar: menegasikan kesamaan/ketidakpedulian secara khusus, bukan kepentingan — importante akan menjadi pilihan yang salah maknanya di sini.',
        tr: 'No es igual doğrudur: özellikle aynılığı/kayıtsızlığı olumsuzlar, önemi değil — importante burada anlam açısından yanlış bir seçim olurdu.',
        pl: 'No es igual jest poprawne: zaprzecza konkretnie identyczności/obojętności, nie ważności — importante byłoby tu błędnym wyborem znaczeniowym.',
      }),
    },
  },
];
