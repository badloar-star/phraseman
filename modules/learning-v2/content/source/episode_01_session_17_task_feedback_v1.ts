import type { LocalizedSource } from "./session_shard_from_source_v1";

type Locale = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
type Selection = Readonly<{
  correct: string;
  distractors: readonly Readonly<{ value: string; sourceValue: string }>[];
}>;
const L = (value: Record<Locale, string>): LocalizedSource => value as LocalizedSource;
const S = (correct: string, first: string, second: string): Selection => Object.freeze({
  correct,
  distractors: Object.freeze([
    Object.freeze({ value: first, sourceValue: first }),
    Object.freeze({ value: second, sourceValue: second }),
  ]),
});

const SELECTIONS: Readonly<Record<string, Selection>> = Object.freeze({
  ["speed_match\0He is ready."]: S("is", "She is ready.", "He is tired."),
  ["speed_match\0She is ready."]: S("is", "He is ready.", "She is tired."),
  ["speed_match\0He is tired."]: S("is", "She is tired.", "He is ready."),
  ["speed_match\0She is tired."]: S("is", "He is tired.", "She is ready."),
  ["phrase_builder\0He is ready."]: S("is", "She", "are"),
  ["phrase_builder\0She is ready."]: S("is", "He", "are"),
  ["phrase_builder\0He is tired."]: S("is", "She", "are"),
  ["phrase_builder\0She is tired."]: S("is", "He", "are"),
  ["phrase_builder\0He is here."]: S("is", "She", "are"),
  ["context_gap_grammar\0He is ready."]: S("is", "are", "am"),
  ["context_gap_grammar\0She is ready."]: S("is", "are", "am"),
  ["context_gap_grammar\0He is tired."]: S("is", "are", "am"),
  ["context_gap_grammar\0She is tired."]: S("is", "are", "am"),
});

export function episode01Session17TaskSelectionV1(family: string, target: string): Selection | undefined {
  return SELECTIONS[`${family}\0${target}`];
}

const CHOICE_TARGETS: Readonly<Record<string, readonly [string, string]>> = Object.freeze({
  "He is ready.": ["She is ready.", "He is tired."],
  "She is ready.": ["He is ready.", "She is tired."],
  "He is tired.": ["She is tired.", "He is ready."],
  "She is tired.": ["He is tired.", "She is ready."],
});

export function episode01Session17ChoiceTargetsV1(target: string): readonly [string, string] | undefined {
  return CHOICE_TARGETS[target];
}

const FEEDBACK: Readonly<Record<string, LocalizedSource>> = Object.freeze({
  ["He is ready.\0She is ready."]: L({
    ru: "She is ready. сохраняет готовность, но меняет мужчину на женщину. Для значения «он готов» нужен мужской указатель he: He is ready.",
    uk: "She is ready. зберігає готовність, але змінює чоловіка на жінку. Для значення «він готовий» потрібен чоловічий покажчик he: He is ready.",
    es: "She is ready. conserva la idea de estar listo, pero cambia al hombre por una mujer. Para «él está listo» se necesita he: He is ready.",
    "pt-BR": "She is ready. mantém a prontidão, mas troca o homem por uma mulher. Para dizer «ele está pronto», o pronome necessário é he: He is ready.",
    vi: "She is ready. vẫn nói về sự sẵn sàng nhưng đổi người nam thành người nữ. Ý “anh ấy sẵn sàng” cần he, vì vậy câu đúng là He is ready.",
    id: "She is ready. tetap menyatakan kesiapan, tetapi mengganti laki-laki dengan perempuan. Arti “dia laki-laki siap” memerlukan he: He is ready.",
    tr: "She is ready. hazır olma durumunu korur, fakat erkek kişiyi kadın kişiyle değiştirir. “O hazır” denilen erkek için he gerekir: He is ready.",
    pl: "She is ready. zachowuje gotowość, lecz zmienia mężczyznę na kobietę. Znaczenie „on jest gotowy” wymaga he: He is ready.",
  }),
  ["He is ready.\0He is tired."]: L({
    ru: "He is tired. оставляет того же мужчину, поэтому легко сбивает, но tired сообщает усталость. Нужное состояние — ready: He is ready.",
    uk: "He is tired. лишає того самого чоловіка й тому легко збиває, але tired повідомляє втому. Потрібний стан — ready: He is ready.",
    es: "He is tired. mantiene al mismo hombre y por eso distrae, pero tired comunica cansancio. El estado buscado es ready: He is ready.",
    "pt-BR": "He is tired. mantém o mesmo homem e por isso confunde, mas tired comunica cansaço. O estado pedido é ready: He is ready.",
    vi: "He is tired. vẫn giữ đúng người nam nên dễ gây nhầm, nhưng tired lại nói anh ấy mệt. Trạng thái cần chọn là ready: He is ready.",
    id: "He is tired. mempertahankan laki-laki yang sama sehingga tampak dekat, tetapi tired berarti lelah. Keadaan yang dicari ialah ready: He is ready.",
    tr: "He is tired. aynı erkek kişiyi koruduğu için yakındır, fakat tired yorgunluk söyler. Aranan durum ready olduğundan He is ready. gerekir.",
    pl: "He is tired. zachowuje tego samego mężczyznę i dlatego kusi, ale tired oznacza zmęczenie. Potrzebny stan to ready: He is ready.",
  }),
  ["She is ready.\0He is ready."]: L({
    ru: "He is ready. правильно называет готовность, но he указывает на мужчину. Когда готова женщина или девочка, выбирается she: She is ready.",
    uk: "He is ready. правильно передає готовність, але he вказує на чоловіка. Коли готова жінка або дівчина, обираємо she: She is ready.",
    es: "He is ready. expresa correctamente la disposición, pero he señala a un hombre. Si la persona lista es una mujer, corresponde she: She is ready.",
    "pt-BR": "He is ready. expressa corretamente a prontidão, mas he aponta para um homem. Se quem está pronta é uma mulher, usa-se she: She is ready.",
    vi: "He is ready. diễn tả đúng sự sẵn sàng nhưng he chỉ người nam. Khi người đã sẵn sàng là nữ, phải chọn she: She is ready.",
    id: "He is ready. menyatakan kesiapan dengan benar, tetapi he menunjuk laki-laki. Jika orang yang siap adalah perempuan, gunakan she: She is ready.",
    tr: "He is ready. hazır olmayı doğru söyler, fakat he erkek kişiyi gösterir. Hazır olan kadınsa she seçilir: She is ready.",
    pl: "He is ready. poprawnie mówi o gotowości, lecz he wskazuje mężczyznę. Gdy gotowa jest kobieta albo dziewczyna, potrzebne jest she: She is ready.",
  }),
  ["She is ready.\0She is tired."]: L({
    ru: "She is tired. сохраняет женский участник, но подменяет готовность усталостью. Ready и tired описывают разные состояния; здесь нужно She is ready.",
    uk: "She is tired. зберігає жіночу особу, але підмінює готовність втомою. Ready і tired називають різні стани; тут потрібно She is ready.",
    es: "She is tired. conserva a la mujer, pero sustituye la disposición por cansancio. Ready y tired nombran estados distintos; aquí se busca She is ready.",
    "pt-BR": "She is tired. mantém a mulher, mas troca prontidão por cansaço. Ready e tired nomeiam estados diferentes; aqui é necessário She is ready.",
    vi: "She is tired. giữ đúng người nữ nhưng thay trạng thái sẵn sàng bằng mệt mỏi. Ready và tired không cùng nghĩa; câu cần là She is ready.",
    id: "She is tired. mempertahankan perempuan yang sama, tetapi mengganti kesiapan dengan kelelahan. Ready dan tired berbeda arti; yang diperlukan She is ready.",
    tr: "She is tired. kadın kişiyi korur, fakat hazır olmayı yorgunlukla değiştirir. Ready ve tired farklı durumlardır; burada She is ready. gerekir.",
    pl: "She is tired. zachowuje kobietę, ale zamienia gotowość na zmęczenie. Ready i tired opisują różne stany; tutaj potrzebne jest She is ready.",
  }),
  ["He is tired.\0She is tired."]: L({
    ru: "She is tired. точно передаёт усталость, но местоимение she указывает на женщину. Для уставшего мужчины нужен he: He is tired.",
    uk: "She is tired. точно передає втому, але займенник she вказує на жінку. Для втомленого чоловіка потрібен he: He is tired.",
    es: "She is tired. comunica cansancio, pero she identifica a una mujer. Para hablar de un hombre cansado hace falta he: He is tired.",
    "pt-BR": "She is tired. comunica cansaço, mas she identifica uma mulher. Para falar de um homem cansado é necessário he: He is tired.",
    vi: "She is tired. diễn tả đúng sự mệt mỏi nhưng she chỉ người nữ. Nếu người mệt là nam, đại từ phải là he: He is tired.",
    id: "She is tired. menyatakan kelelahan dengan tepat, tetapi she menunjuk perempuan. Untuk laki-laki yang lelah diperlukan he: He is tired.",
    tr: "She is tired. yorgunluğu doğru anlatır, fakat she kadın kişiyi gösterir. Yorgun olan erkekse he gerekir: He is tired.",
    pl: "She is tired. poprawnie opisuje zmęczenie, lecz she wskazuje kobietę. Dla zmęczonego mężczyzny potrzebne jest he: He is tired.",
  }),
  ["He is tired.\0He is ready."]: L({
    ru: "He is ready. сохраняет мужчину и правильную связку, но ready означает готовность, а не усталость. Нужное слово состояния — tired: He is tired.",
    uk: "He is ready. зберігає чоловіка й правильну зв’язку, але ready означає готовність, не втому. Потрібне слово стану — tired: He is tired.",
    es: "He is ready. conserva al hombre y la cópula correcta, pero ready significa disposición, no cansancio. El estado necesario es tired: He is tired.",
    "pt-BR": "He is ready. mantém o homem e a ligação correta, mas ready significa prontidão, não cansaço. O estado necessário é tired: He is tired.",
    vi: "He is ready. giữ đúng người nam và is, nhưng ready nói anh ấy sẵn sàng chứ không mệt. Trạng thái cần dùng là tired: He is tired.",
    id: "He is ready. mempertahankan laki-laki dan is yang benar, tetapi ready berarti siap, bukan lelah. Keadaan yang diperlukan ialah tired: He is tired.",
    tr: "He is ready. erkek kişiyi ve doğru is biçimini korur, fakat ready hazır olmak demektir. Aranan yorgunluk için tired gerekir: He is tired.",
    pl: "He is ready. zachowuje mężczyznę i poprawne is, ale ready oznacza gotowość, nie zmęczenie. Potrzebny stan to tired: He is tired.",
  }),
  ["She is tired.\0He is tired."]: L({
    ru: "He is tired. правильно сообщает об усталости, но he меняет женщину на мужчину. Для женского участника сохраняется she: She is tired.",
    uk: "He is tired. правильно повідомляє про втому, але he змінює жінку на чоловіка. Для жіночої особи зберігаємо she: She is tired.",
    es: "He is tired. expresa cansancio correctamente, pero he cambia a la mujer por un hombre. Para la referencia femenina se conserva she: She is tired.",
    "pt-BR": "He is tired. expressa cansaço corretamente, mas he troca a mulher por um homem. Para a referência feminina mantém-se she: She is tired.",
    vi: "He is tired. nói đúng về sự mệt mỏi nhưng he đổi người nữ thành người nam. Đối tượng nữ phải giữ she: She is tired.",
    id: "He is tired. menyatakan kelelahan dengan benar, tetapi he mengganti perempuan dengan laki-laki. Untuk perempuan tetap gunakan she: She is tired.",
    tr: "He is tired. yorgunluğu doğru söyler, fakat he kadın kişiyi erkek kişiyle değiştirir. Kadın kişi için she kalmalıdır: She is tired.",
    pl: "He is tired. poprawnie mówi o zmęczeniu, lecz he zmienia kobietę na mężczyznę. Dla kobiety pozostaje she: She is tired.",
  }),
  ["She is tired.\0She is ready."]: L({
    ru: "She is ready. сохраняет женщину, но сообщает, что она готова. Здесь проверяется усталость, поэтому ready нужно заменить на tired: She is tired.",
    uk: "She is ready. зберігає жінку, але повідомляє, що вона готова. Тут перевіряється втома, тому ready треба замінити на tired: She is tired.",
    es: "She is ready. conserva a la mujer, pero dice que está lista. Aquí se busca cansancio, así que ready debe cambiarse por tired: She is tired.",
    "pt-BR": "She is ready. mantém a mulher, mas diz que ela está pronta. Aqui o estado é cansaço, então ready deve virar tired: She is tired.",
    vi: "She is ready. giữ đúng người nữ nhưng nói cô ấy sẵn sàng. Ý cần diễn tả là mệt, vì vậy ready phải đổi thành tired: She is tired.",
    id: "She is ready. mempertahankan perempuan, tetapi mengatakan bahwa ia siap. Keadaan yang dicari ialah lelah, jadi gunakan tired: She is tired.",
    tr: "She is ready. kadın kişiyi korur, fakat onun hazır olduğunu söyler. Aranan durum yorgunluk olduğundan ready yerine tired gerekir: She is tired.",
    pl: "She is ready. zachowuje kobietę, ale mówi o gotowości. Tutaj potrzebne jest zmęczenie, więc ready należy zastąpić tired: She is tired.",
  }),
  ["He is ready.\0She"]: L({
    ru: "Плитка She начала бы фразу о женщине, хотя задан мужчина. Для сохранения участника первым остаётся He; лишнее she нельзя добавлять внутрь He is ready.",
    uk: "Плитка She почала б вислів про жінку, хоча задано чоловіка. Щоб зберегти учасника, першим лишається He; зайве she не додаємо.",
    es: "La ficha She iniciaría una frase sobre una mujer, aunque el referente es masculino. Debe mantenerse He al principio; she no se añade dentro de He is ready.",
    "pt-BR": "A peça She iniciaria uma frase sobre uma mulher, embora a pessoa seja masculina. He deve permanecer no início; she não entra em He is ready.",
    vi: "Ô She sẽ mở đầu câu về người nữ trong khi đề bài nói về người nam. Phải giữ He ở đầu; không chèn thêm she vào He is ready.",
    id: "Keping She akan memulai kalimat tentang perempuan, padahal orangnya laki-laki. He harus tetap di awal; she tidak ditambahkan ke He is ready.",
    tr: "She taşı cümleyi kadın kişi hakkında başlatırdı, oysa verilen kişi erkektir. Başta He kalmalı; He is ready. içine she eklenmez.",
    pl: "Kafelek She rozpocząłby zdanie o kobiecie, choć chodzi o mężczyznę. Na początku musi zostać He; she nie dodajemy do He is ready.",
  }),
  ["He is ready.\0are"]: L({
    ru: "Are знакомо по you, но с одним he оно не согласуется. Третье лицо единственного числа выбирает is, поэтому каркас остаётся He is ready.",
    uk: "Are знайоме з you, але з одним he воно не узгоджується. Третя особа однини обирає is, тому маємо He is ready.",
    es: "Are resulta familiar con you, pero no concuerda con un solo he. La tercera persona singular selecciona is, de modo que queda He is ready.",
    "pt-BR": "Are é conhecido com you, mas não concorda com um único he. A terceira pessoa do singular escolhe is: He is ready.",
    vi: "Are từng đi với you nhưng không hòa hợp với he số ít. Ngôi thứ ba số ít cần is, vì vậy khung đúng là He is ready.",
    id: "Are dikenal bersama you, tetapi tidak cocok dengan he tunggal. Orang ketiga tunggal memakai is, sehingga bentuknya He is ready.",
    tr: "Are, you ile tanıdıktır; tekil he ile uyuşmaz. Üçüncü tekil kişi is seçer, bu yüzden doğru yapı He is ready. olur.",
    pl: "Are jest znane z you, ale nie zgadza się z pojedynczym he. Trzecia osoba liczby pojedynczej wybiera is: He is ready.",
  }),
  ["He is ready.\0am"]: L({
    ru: "Am принадлежит только местоимению I и обозначает самого говорящего. Здесь речь о другом мужчине, поэтому после he нужна форма is: He is ready.",
    uk: "Am належить лише займеннику I й позначає самого мовця. Тут ідеться про іншого чоловіка, тому після he потрібне is: He is ready.",
    es: "Am pertenece exclusivamente a I y habla de quien pronuncia la frase. Aquí se describe a otro hombre, por eso he necesita is: He is ready.",
    "pt-BR": "Am pertence somente a I e fala de quem está dizendo a frase. Aqui descrevemos outro homem, por isso he precisa de is: He is ready.",
    vi: "Am chỉ đi với I để nói về chính người đang nói. Câu này nói về một người nam khác, nên sau he phải là is: He is ready.",
    id: "Am hanya berpasangan dengan I dan merujuk pada penutur sendiri. Kalimat ini tentang laki-laki lain, jadi he memerlukan is: He is ready.",
    tr: "Am yalnızca I ile kullanılır ve konuşanın kendisini anlatır. Burada başka bir erkekten söz edildiği için he yanında is gerekir: He is ready.",
    pl: "Am łączy się wyłącznie z I i mówi o samym mówiącym. Tutaj opisujemy innego mężczyznę, dlatego po he potrzebne jest is: He is ready.",
  }),
  ["She is ready.\0He"]: L({
    ru: "He переключил бы фразу на мужчину и противоречил значению «она готова». Первой плиткой должна остаться She, после неё ставятся is и ready.",
    uk: "He переключив би вислів на чоловіка й суперечив значенню «вона готова». Першою плиткою має лишитися She, потім is і ready.",
    es: "He cambiaría la frase a un hombre y contradiría «ella está lista». La primera ficha debe ser She, seguida de is y ready.",
    "pt-BR": "He mudaria a frase para um homem e contrariaria «ela está pronta». A primeira peça deve ser She, seguida de is e ready.",
    vi: "He sẽ đổi câu sang người nam và trái với ý “cô ấy sẵn sàng”. Ô đầu tiên phải là She, rồi mới đến is và ready.",
    id: "He akan mengubah kalimat menjadi tentang laki-laki dan bertentangan dengan arti perempuan siap. Keping pertama harus She, lalu is dan ready.",
    tr: "He cümleyi erkek kişiye çevirir ve “o kadın hazır” anlamına ters düşer. İlk taş She olmalı, ardından is ve ready gelmelidir.",
    pl: "He zmieniłoby zdanie na mężczyznę i przeczyło znaczeniu „ona jest gotowa”. Pierwszym kafelkiem musi być She, potem is i ready.",
  }),
  ["She is ready.\0are"]: L({
    ru: "She обозначает одну женщину, поэтому are здесь слишком множественно и не согласуется с участником. Для she выбирается is: She is ready.",
    uk: "She позначає одну жінку, тому are тут не узгоджується з учасницею. Для третьої особи однини обираємо is: She is ready.",
    es: "She representa a una sola mujer, por lo que are no concuerda con ese sujeto singular. Con she se elige is: She is ready.",
    "pt-BR": "She representa uma única mulher, então are não concorda com esse sujeito singular. Com she escolhe-se is: She is ready.",
    vi: "She chỉ một người nữ nên are không phù hợp với chủ thể số ít ấy. Với she phải chọn is: She is ready.",
    id: "She menunjuk satu perempuan, sehingga are tidak cocok dengan subjek tunggal tersebut. Bersama she gunakan is: She is ready.",
    tr: "She tek bir kadın kişiyi gösterir; are bu tekil özneyle uyuşmaz. She ile is seçilir: She is ready.",
    pl: "She oznacza jedną kobietę, więc are nie zgadza się z tym podmiotem liczby pojedynczej. Przy she wybieramy is: She is ready.",
  }),
  ["She is ready.\0am"]: L({
    ru: "Am работает только рядом с I и говорит о самом себе. She указывает на другую женщину, поэтому связка должна быть is: She is ready.",
    uk: "Am працює лише поруч з I й говорить про самого себе. She вказує на іншу жінку, тому зв’язкою має бути is: She is ready.",
    es: "Am solo funciona con I para hablar de uno mismo. She señala a otra mujer, así que la cópula correspondiente es is: She is ready.",
    "pt-BR": "Am funciona apenas com I para falar de si. She aponta outra mulher, então a ligação correspondente é is: She is ready.",
    vi: "Am chỉ dùng cạnh I khi nói về bản thân. She chỉ một người nữ khác, vì vậy dạng nối phải là is: She is ready.",
    id: "Am hanya digunakan bersama I untuk berbicara tentang diri sendiri. She menunjuk perempuan lain, sehingga penghubungnya is: She is ready.",
    tr: "Am yalnız I yanında kişinin kendisini anlatır. She başka bir kadın kişiyi gösterdiği için bağlayıcı is olmalıdır: She is ready.",
    pl: "Am działa tylko z I, gdy mówiący mówi o sobie. She wskazuje inną kobietę, dlatego potrzebnym łącznikiem jest is: She is ready.",
  }),
  ["He is tired.\0She"]: L({
    ru: "She заменила бы уставшего мужчину женщиной. В заданной фразе участник уже определён словом He, поэтому лишняя плитка she нарушает смысл.",
    uk: "She замінила б втомленого чоловіка жінкою. У заданому вислові учасника вже визначено словом He, тому зайва плитка she руйнує зміст.",
    es: "She sustituiría al hombre cansado por una mujer. El participante ya está fijado con He, de modo que añadir she rompe el sentido de la frase.",
    "pt-BR": "She substituiria o homem cansado por uma mulher. A pessoa já está definida por He, portanto acrescentar she quebra o sentido da frase.",
    vi: "She sẽ đổi người nam đang mệt thành người nữ. Chủ thể đã được xác định bằng He, nên thêm ô she sẽ làm sai người và hỏng nghĩa.",
    id: "She akan mengganti laki-laki yang lelah dengan perempuan. Orangnya sudah ditentukan oleh He, jadi menambahkan she merusak makna.",
    tr: "She yorgun erkek kişiyi kadın kişiyle değiştirirdi. Katılımcı He ile belirlenmiştir; fazladan she taşı anlamı bozar.",
    pl: "She zastąpiłoby zmęczonego mężczyznę kobietą. Osoba jest już określona przez He, więc dodatkowe she psuje sens zdania.",
  }),
  ["He is tired.\0are"]: L({
    ru: "Are подходит к you, we и they, но не к одному he. Усталость не меняет согласование: третье лицо единственного числа всё равно требует is.",
    uk: "Are підходить до you, we та they, але не до одного he. Втома не змінює узгодження: третя особа однини все одно потребує is.",
    es: "Are concuerda con you, we y they, no con un solo he. El estado tired no altera la concordancia: la tercera persona singular sigue necesitando is.",
    "pt-BR": "Are concorda com you, we e they, não com um único he. O estado tired não muda a concordância: a terceira pessoa singular continua usando is.",
    vi: "Are đi với you, we và they chứ không đi với he số ít. Trạng thái tired không làm đổi hòa hợp; ngôi thứ ba số ít vẫn cần is.",
    id: "Are cocok dengan you, we, dan they, bukan satu he. Keadaan tired tidak mengubah kesesuaian; orang ketiga tunggal tetap memerlukan is.",
    tr: "Are, you, we ve they ile uyuşur; tekil he ile değil. Tired durumu uyumu değiştirmez, üçüncü tekil kişi yine is ister.",
    pl: "Are pasuje do you, we i they, a nie do pojedynczego he. Stan tired nie zmienia zgody; trzecia osoba liczby pojedynczej nadal wymaga is.",
  }),
  ["He is tired.\0am"]: L({
    ru: "Am обозначает связь только с I: I am tired. После he эта форма невозможна, потому что речь идёт не о говорящем, а о другом мужчине; нужно is.",
    uk: "Am утворює зв’язок лише з I: I am tired. Після he ця форма неможлива, бо йдеться не про мовця, а про іншого чоловіка; потрібне is.",
    es: "Am establece la unión únicamente con I: I am tired. Después de he no sirve porque se habla de otro hombre, no del hablante; corresponde is.",
    "pt-BR": "Am forma a ligação apenas com I: I am tired. Depois de he não funciona, pois falamos de outro homem, não de quem fala; usa-se is.",
    vi: "Am chỉ nối với I như trong I am tired. Sau he không thể dùng am vì câu nói về người nam khác, không phải người đang nói; cần is.",
    id: "Am hanya menghubungkan I seperti pada I am tired. Setelah he bentuk itu tidak mungkin karena kalimat tentang laki-laki lain; gunakan is.",
    tr: "Am yalnız I ile bağ kurar: I am tired. He sonrasında kullanılamaz, çünkü konuşandan değil başka bir erkekten söz edilir; is gerekir.",
    pl: "Am łączy się tylko z I, jak w I am tired. Po he ta forma nie działa, bo mowa o innym mężczyźnie, a nie o mówiącym; potrzebne jest is.",
  }),
  ["She is tired.\0He"]: L({
    ru: "He поставил бы в начало мужчину и изменил значение «она устала». Нужный участник уже задан как женщина, поэтому первой плиткой остаётся She.",
    uk: "He поставив би на початок чоловіка й змінив значення «вона втомилася». Потрібна особа вже задана як жінка, тому першою лишається She.",
    es: "He colocaría a un hombre al principio y cambiaría «ella está cansada». La persona buscada es femenina, así que la primera ficha sigue siendo She.",
    "pt-BR": "He colocaria um homem no início e mudaria «ela está cansada». A pessoa pedida é feminina, então a primeira peça continua sendo She.",
    vi: "He sẽ đặt người nam ở đầu và đổi ý “cô ấy mệt”. Người cần nói tới là nữ, vì vậy ô đầu tiên phải tiếp tục là She.",
    id: "He akan menempatkan laki-laki di awal dan mengubah arti perempuan lelah. Orang yang dimaksud perempuan, jadi keping pertama tetap She.",
    tr: "He başa erkek kişiyi getirip “o kadın yorgun” anlamını değiştirirdi. Aranan kişi kadın olduğundan ilk taş She kalmalıdır.",
    pl: "He postawiłoby na początku mężczyznę i zmieniło znaczenie „ona jest zmęczona”. Chodzi o kobietę, więc pierwszym kafelkiem pozostaje She.",
  }),
  ["She is tired.\0are"]: L({
    ru: "Are не согласуется с одной she, даже если остальная фраза собрана верно. Для третьего лица единственного числа нужна форма is: She is tired.",
    uk: "Are не узгоджується з однією she, навіть якщо решту вислову складено правильно. Для третьої особи однини потрібне is: She is tired.",
    es: "Are no concuerda con una sola she aunque el resto esté bien construido. La tercera persona singular necesita is: She is tired.",
    "pt-BR": "Are não concorda com uma única she, mesmo que o restante esteja bem montado. A terceira pessoa do singular precisa de is: She is tired.",
    vi: "Are không hòa hợp với một she số ít dù các phần khác đúng. Ngôi thứ ba số ít phải dùng is: She is tired.",
    id: "Are tidak cocok dengan satu she meskipun bagian lain tersusun benar. Orang ketiga tunggal memerlukan is: She is tired.",
    tr: "Are, cümlenin geri kalanı doğru olsa bile tekil she ile uyuşmaz. Üçüncü tekil kişi is ister: She is tired.",
    pl: "Are nie zgadza się z pojedynczym she, nawet gdy reszta jest ułożona poprawnie. Trzecia osoba liczby pojedynczej wymaga is: She is tired.",
  }),
  ["She is tired.\0am"]: L({
    ru: "Am привязано к I и не может следовать после she. Здесь говорящий описывает другую женщину, поэтому правильная связка — is: She is tired.",
    uk: "Am прив’язане до I й не може стояти після she. Тут мовець описує іншу жінку, тому правильна зв’язка — is: She is tired.",
    es: "Am está ligado a I y no puede seguir a she. Aquí el hablante describe a otra mujer, por eso la cópula correcta es is: She is tired.",
    "pt-BR": "Am está ligado a I e não pode vir depois de she. Aqui quem fala descreve outra mulher, por isso a ligação correta é is: She is tired.",
    vi: "Am gắn với I nên không thể đứng sau she. Ở đây người nói miêu tả một người nữ khác, vì vậy dạng nối đúng là is: She is tired.",
    id: "Am terikat pada I dan tidak dapat mengikuti she. Penutur sedang menggambarkan perempuan lain, jadi penghubung yang benar is: She is tired.",
    tr: "Am, I zamirine bağlıdır ve she sonrasında gelemez. Konuşan başka bir kadını anlattığı için doğru bağlayıcı is olur: She is tired.",
    pl: "Am jest związane z I i nie może stać po she. Mówiący opisuje inną kobietę, dlatego poprawnym łącznikiem jest is: She is tired.",
  }),
  ["He is here.\0She"]: L({
    ru: "She изменила бы человека у указанного места: вместо мужчины получилась бы женщина. Для смысла «он здесь» первым остаётся He, затем is и here.",
    uk: "She змінила б людину в указаному місці: замість чоловіка вийшла б жінка. Для значення «він тут» першим лишається He, потім is і here.",
    es: "She cambiaría a la persona situada aquí: aparecería una mujer en lugar del hombre. Para «él está aquí» se mantiene He, seguido de is y here.",
    "pt-BR": "She mudaria a pessoa que está aqui: surgiria uma mulher no lugar do homem. Para «ele está aqui», mantém-se He, seguido de is e here.",
    vi: "She sẽ đổi người đang ở đây từ nam thành nữ. Ý “anh ấy ở đây” phải giữ He ở đầu, sau đó mới đến is và here.",
    id: "She akan mengubah orang yang berada di sini dari laki-laki menjadi perempuan. Untuk arti laki-laki di sini, pertahankan He, lalu is dan here.",
    tr: "She burada bulunan kişiyi erkekten kadına çevirirdi. “O erkek burada” anlamı için başta He kalır, ardından is ve here gelir.",
    pl: "She zmieniłoby osobę znajdującą się tutaj z mężczyzny na kobietę. Dla „on jest tutaj” pozostaje He, następnie is i here.",
  }),
  ["He is here.\0are"]: L({
    ru: "Here меняет только информацию о месте и не влияет на форму связки. С одним he всё равно используется is; are сделало бы согласование неверным.",
    uk: "Here змінює лише інформацію про місце й не впливає на форму зв’язки. З одним he все одно вживається is; are порушило б узгодження.",
    es: "Here solo aporta información de lugar y no modifica la cópula. Con un solo he sigue usándose is; are produciría una concordancia incorrecta.",
    "pt-BR": "Here acrescenta apenas informação de lugar e não muda a cópula. Com um único he continua-se usando is; are criaria concordância errada.",
    vi: "Here chỉ thêm thông tin nơi chốn và không làm đổi dạng nối. Với he số ít vẫn phải dùng is; are sẽ tạo ra sự hòa hợp sai.",
    id: "Here hanya menambahkan informasi tempat dan tidak mengubah penghubung. Bersama he tunggal tetap gunakan is; are membuat kesesuaian salah.",
    tr: "Here yalnızca yer bilgisini değiştirir, bağlayıcı biçimini etkilemez. Tekil he ile yine is kullanılır; are uyumu bozar.",
    pl: "Here dodaje jedynie informację o miejscu i nie zmienia łącznika. Przy pojedynczym he nadal używamy is; are naruszyłoby zgodność.",
  }),
});

export function episode01Session17TaskFeedbackV1(locale: Locale, target: string, wrong: string): string | undefined {
  return FEEDBACK[`${target}\0${wrong}`]?.[locale];
}
