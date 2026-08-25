import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 27 "Они" / third_person_plural, builtOn: [17, 25], recalls: [17, 25]):
// три страницы concept/formula/trap вводят son — связку третьего лица
// МНОЖЕСТВЕННОГО числа. Es (сессия 17) уже закреплена за "он/она/оно" —
// один предмет, ситуация или человек без говорящего и без собеседника; son
// делает то же самое, но для группы. Это сдвиг ЧИСЛА при неизменном ТРЕТЬЕМ
// ЛИЦЕ — зеркально сессии 25, где число менялось у ПЕРВОГО лица (soy→somos).
// Главный контраст — с somos (сессия 25): оба слова про "несколько", но
// somos всегда включает говорящего, а son — никогда.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_27_TITLE = L({
  ru: 'Они',
  uk: 'Вони',
  es: 'They',
  'pt-BR': 'Eles',
  vi: 'Họ',
  id: 'Mereka',
  tr: 'Onlar',
  pl: 'Oni',
});

export const ES_EPISODE_01_SESSION_27_SUMMARY = L({
  ru: 'Одно новое слово переносит уже знакомую связку с одного предмета или человека на целую группу без говорящего внутри.',
  uk: 'Одне нове слово переносить уже знайому зв’язку з одного предмета чи людини на цілу групу без мовця всередині.',
  es: 'One new word carries the already familiar linking verb from a single thing or person to an entire group that does not include the speaker.',
  'pt-BR': 'Uma palavra nova transfere a ligação já conhecida de uma única coisa ou pessoa para um grupo inteiro que não inclui quem fala.',
  vi: 'Một từ mới chuyển từ nối đã quen thuộc từ một vật hay một người sang cả một nhóm không có người nói ở trong.',
  id: 'Satu kata baru memindahkan kata penghubung yang sudah dikenal dari satu benda atau orang ke seluruh kelompok yang tidak mencakup penutur.',
  tr: 'Tek bir yeni kelime, zaten tanıdık olan bağlacı tek bir şeyden ya da kişiden, konuşanı içermeyen bütün bir gruba taşır.',
  pl: 'Jedno nowe słowo przenosi już znany łącznik z jednej rzeczy lub osoby na całą grupę, która nie obejmuje mówiącego.',
});

export const ES_EPISODE_01_SESSION_27_GOAL = L({
  ru: 'Узнать на слух, понять и точно построить son как связку третьего лица множественного числа, отличая её от es и somos.',
  uk: 'Упізнати на слух, зрозуміти й точно побудувати son як зв’язку третьої особи множини, відрізняючи її від es та somos.',
  es: 'Recognize, understand, and correctly build son as the third-person-plural linking word, telling it apart from es and somos.',
  'pt-BR': 'Reconhecer de ouvido, entender e construir corretamente son como a ligação de terceira pessoa do plural, distinguindo-a de es e somos.',
  vi: 'Nghe ra, hiểu và xây dựng đúng son như từ nối ngôi thứ ba số nhiều, phân biệt nó với es và somos.',
  id: 'Mengenali dari suara, memahami, dan membangun son dengan tepat sebagai kata penghubung orang ketiga jamak, membedakannya dari es dan somos.',
  tr: 'Son’u üçüncü çoğul şahıs bağlacı olarak duyup tanımak, anlamak ve doğru kurmak; es ve somos’tan ayırt etmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zbudować son jako łącznik trzeciej osoby liczby mnogiej, odróżniając go od es i somos.',
});

const CONCEPT_BODY = L({
  ru: 'Es связывает признак с одним предметом, ситуацией или человеком — с кем-то одним, не с говорящим и не с собеседником. Son делает то же самое, но для нескольких: группа людей или предметов, ни один из которых не говорящий. Лицо не меняется вовсе — оба слова остаются про «он, она, оно», а не про «я» или «ты». Меняется только число: es для одного, son для нескольких. Спутать их — значит перепутать, сколько предметов или людей стоит за словом: son всегда о группе, а не об одном. Именно поэтому, рассказывая сразу о нескольких людях или вещах со стороны, нужна ровно эта форма — son, а не es.',
  uk: 'Es пов’язує ознаку з одним предметом, ситуацією чи людиною — з кимось одним, не з мовцем і не зі співрозмовником. Son робить те саме, але для кількох: група людей чи предметів, жоден із яких не мовець. Особа не змінюється зовсім — обидва слова лишаються про «він, вона, воно», а не про «я» чи «ти». Змінюється лише число: es для одного, son для кількох. Сплутати їх — означає переплутати, скільки предметів чи людей стоїть за словом: son завжди про групу, а не про одного. Саме тому, розповідаючи одразу про кількох людей чи речей збоку, потрібна рівно ця форма — son, а не es.',
  es: 'Es links a quality to one thing, situation, or person — someone or something single, not the speaker and not the listener. Son does the same, but for several: a group of people or things, none of them the speaker. The person does not change at all — both words remain about "he, she, it", not about "I" or "you". Only the number changes: es for one, son for several. Confusing them means confusing how many things or people stand behind the word: son is always about a group, never about one. That is why, talking about several people or things from the outside, exactly this form is needed — son, not es.',
  'pt-BR': 'Es liga uma qualidade a uma única coisa, situação ou pessoa — alguém ou algo único, nem quem fala nem o interlocutor. Son faz o mesmo, mas para vários: um grupo de pessoas ou coisas, nenhuma delas quem fala. A pessoa não muda em nada — as duas palavras continuam sobre "ele, ela, isso", não sobre "eu" ou "você". Só o número muda: es para um, son para vários. Confundi-las significa confundir quantas coisas ou pessoas estão por trás da palavra: son é sempre sobre um grupo, nunca sobre um só. Por isso, ao falar de várias pessoas ou coisas de fora, precisa-se exatamente dessa forma — son, não es.',
  vi: 'Es nối một đặc điểm với một vật, tình huống hay người duy nhất — ai đó hay điều gì đó riêng lẻ, không phải người nói cũng không phải người nghe. Son làm điều tương tự, nhưng cho nhiều: một nhóm người hay vật, không ai trong số đó là người nói. Ngôi không đổi chút nào — cả hai từ vẫn nói về "anh ấy, cô ấy, nó", không phải về "tôi" hay "bạn". Chỉ có số thay đổi: es cho một, son cho nhiều. Nhầm lẫn chúng nghĩa là nhầm lẫn có bao nhiêu vật hay người đứng sau từ đó: son luôn nói về một nhóm, không bao giờ về một. Đó là lý do khi nói về nhiều người hay vật từ bên ngoài, cần chính xác dạng này — son, không phải es.',
  id: 'Es menghubungkan sifat dengan satu benda, situasi, atau orang — seseorang atau sesuatu yang tunggal, bukan penutur dan bukan pendengar. Son melakukan hal yang sama, tetapi untuk beberapa: sekelompok orang atau benda, tak satu pun dari mereka penutur. Orangnya tidak berubah — kedua kata tetap tentang "dia, itu", bukan tentang "saya" atau "kamu". Hanya jumlahnya yang berubah: es untuk satu, son untuk beberapa. Mengacaukannya berarti mengacaukan berapa banyak benda atau orang di balik kata itu: son selalu tentang kelompok, tidak pernah tentang satu. Itulah sebabnya berbicara tentang beberapa orang atau benda dari luar memerlukan tepat bentuk ini — son, bukan es.',
  tr: 'Es bir niteliği tek bir şeyle, durumla ya da kişiyle bağlar — konuşan ya da dinleyici olmayan, tek başına biri ya da bir şey. Son de aynısını yapar, ama birkaçı için: hiçbiri konuşan olmayan bir grup insan ya da şey. Kişi hiç değişmez — her iki kelime de "o" hakkındadır, "ben" ya da "sen" hakkında değil. Yalnızca sayı değişir: biri için es, birkaçı için son. Onları karıştırmak, kelimenin arkasında kaç şey ya da kişi olduğunu karıştırmak demektir: son her zaman bir grup hakkındadır, asla biri hakkında değil. Bu yüzden dışarıdan birkaç kişi ya da şeyden bahsederken tam olarak bu biçim gerekir — son, es değil.',
  pl: 'Es łączy cechę z jedną rzeczą, sytuacją lub osobą — kimś lub czymś pojedynczym, nie mówiącym i nie słuchaczem. Son robi to samo, ale dla kilku: grupa ludzi lub rzeczy, z których żadna nie jest mówiącym. Osoba wcale się nie zmienia — oba słowa nadal dotyczą „on, ona, to”, a nie „ja” czy „ty”. Zmienia się tylko liczba: es dla jednej, son dla kilku. Pomylenie ich oznacza pomylenie, ile rzeczy lub osób stoi za słowem: son zawsze dotyczy grupy, nigdy jednej. Dlatego mówiąc od razu o kilku osobach lub rzeczach z zewnątrz, potrzebna jest dokładnie ta forma — son, a nie es.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: es остаётся для одного предмета или человека, а son появляется, как только речь заходит о нескольких — без говорящего среди них. Son así говорит о характере целой группы со стороны, son de acuerdo — о согласии сразу нескольких людей без говорящего, и оба признака остаются в точности такими же, как были с es или somos раньше: así и de acuerdo не меняются ни по роду, ни по числу. Отличить нужную форму легко по смыслу фразы: если говорящий описывает одного — es, если нескольких без себя самого — son. Признак после связки от этого выбора не зависит вовсе, меняется только сама связка.',
  uk: 'Формула проста: es лишається для одного предмета чи людини, а son з’являється, щойно йдеться про кількох — без мовця серед них. Son así говорить про характер цілої групи збоку, son de acuerdo — про згоду одразу кількох людей без мовця, і обидві ознаки лишаються точнісінько такими самими, як були з es чи somos раніше: así та de acuerdo не змінюються ні за родом, ні за числом. Відрізнити потрібну форму легко за змістом фрази: якщо мовець описує одного — es, якщо кількох без себе самого — son. Ознака після зв’язки від цього вибору зовсім не залежить, змінюється лише сама зв’язка.',
  es: 'The formula is simple: es remains for one thing or person, and son appears as soon as the sentence is about several — without the speaker among them. Son así talks about the character of an entire group from the outside, son de acuerdo about the agreement of several people without the speaker, and both qualities stay exactly as they were with es or somos before: así and de acuerdo never change for gender or number. It is easy to tell the right form apart by the meaning of the phrase: if the speaker describes one — es; if several without themselves — son. The quality after the linking word does not depend on this choice at all; only the linking word itself changes.',
  'pt-BR': 'A fórmula é simples: es continua para uma coisa ou pessoa, e son aparece assim que a frase é sobre várias — sem quem fala entre elas. Son así fala do caráter de um grupo inteiro de fora, son de acuerdo da concordância de várias pessoas sem quem fala, e as duas qualidades continuam exatamente como eram com es ou somos antes: así e de acuerdo nunca mudam em gênero nem número. É fácil distinguir a forma certa pelo sentido da frase: se quem fala descreve um — es; se vários sem si mesmo — son. A qualidade depois da ligação não depende nada dessa escolha; só a própria ligação muda.',
  vi: 'Công thức đơn giản: es vẫn dùng cho một vật hay một người, và son xuất hiện ngay khi câu nói về nhiều — không có người nói trong số đó. Son así nói về tính cách của cả một nhóm từ bên ngoài, son de acuerdo nói về sự đồng ý của nhiều người không có người nói, và cả hai đặc điểm vẫn giữ nguyên như khi dùng với es hay somos trước đó: así và de acuerdo không bao giờ đổi theo giống hay số. Dễ dàng phân biệt dạng đúng qua nghĩa của câu: nếu người nói mô tả một — es; nếu nhiều mà không có bản thân — son. Đặc điểm sau từ nối hoàn toàn không phụ thuộc vào lựa chọn này; chỉ có bản thân từ nối thay đổi.',
  id: 'Rumusnya sederhana: es tetap untuk satu benda atau orang, dan son muncul segera setelah kalimat membicarakan beberapa — tanpa penutur di antara mereka. Son así berbicara tentang karakter seluruh kelompok dari luar, son de acuerdo tentang persetujuan beberapa orang tanpa penutur, dan kedua sifat itu tetap persis seperti sebelumnya dengan es atau somos: así dan de acuerdo tidak pernah berubah untuk gender atau jumlah. Mudah membedakan bentuk yang tepat lewat makna frasanya: jika penutur menggambarkan satu — es; jika beberapa tanpa dirinya sendiri — son. Sifat setelah kata penghubung sama sekali tidak bergantung pada pilihan ini; hanya kata penghubungnya sendiri yang berubah.',
  tr: 'Formül basittir: es tek bir şey ya da kişi için kalır, ve son cümle içlerinde konuşan olmadan birkaçından bahseder bahsetmez ortaya çıkar. Son así dışarıdan tüm bir grubun karakterinden bahseder, son de acuerdo konuşan olmadan birkaç kişinin onayından bahseder, ve her iki nitelik de daha önce es ya da somos’la olduğu gibi tam olarak aynı kalır: así ve de acuerdo cinsiyet ya da sayı için asla değişmez. Doğru biçimi ifadenin anlamından ayırt etmek kolaydır: konuşan birini anlatıyorsa — es; kendisi olmadan birkaçını anlatıyorsa — son. Bağlaçtan sonraki nitelik bu seçime hiç bağlı değildir; yalnızca bağlacın kendisi değişir.',
  pl: 'Formuła jest prosta: es pozostaje dla jednej rzeczy lub osoby, a son pojawia się, gdy tylko zdanie dotyczy kilku — bez mówiącego wśród nich. Son así mówi o charakterze całej grupy z zewnątrz, son de acuerdo o zgodzie kilku osób bez mówiącego, a obie cechy pozostają dokładnie takie same, jak wcześniej z es czy somos: así i de acuerdo nigdy nie zmieniają się ani rodzajem, ani liczbą. Łatwo odróżnić właściwą formę po sensie frazy: jeśli mówiący opisuje jedną osobę — es; jeśli kilka bez siebie samego — son. Cecha po łączniku wcale nie zależy od tego wyboru; zmienia się tylko sam łącznik.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — сказать Es de acuerdo, рассказывая о согласии сразу нескольких людей, вместо Son de acuerdo: es годится только для одного, а не для целой группы. Вторая ловушка — спутать son с somos: somos всегда включает самого говорящего в число тех, о ком речь, а son — никогда, это всегда «они» со стороны. Проверка простая: если внутри группы есть «я» — нужна somos, а если «я» там нет — нужна son. Запомнить легко через число и лицо: es — один предмет или человек, son — несколько, и среди них никогда не бывает самого говорящего.',
  uk: 'Найчастіша помилка — сказати Es de acuerdo, розповідаючи про згоду одразу кількох людей, замість Son de acuerdo: es годиться тільки для одного, а не для цілої групи. Друга пастка — сплутати son із somos: somos завжди включає самого мовця до числа тих, про кого йдеться, а son — ніколи, це завжди «вони» збоку. Перевірка проста: якщо всередині групи є «я» — потрібна somos, а якщо «я» там немає — потрібна son. Запам’ятати легко через число й особу: es — один предмет чи людина, son — кілька, і серед них ніколи не буває самого мовця.',
  es: 'The most common mistake is saying Es de acuerdo while talking about the agreement of several people at once, instead of Son de acuerdo: es only fits one, not an entire group. The second trap is confusing son with somos: somos always includes the speaker among those being talked about, while son never does — it is always "them" from the outside. The check is simple: if "I" is inside the group — somos is needed; if "I" is not there — son is needed. It is easy to remember through number and person: es — one thing or person, son — several, and the speaker is never among them.',
  'pt-BR': 'O erro mais comum é dizer Es de acuerdo ao falar da concordância de várias pessoas de uma vez, em vez de Son de acuerdo: es só cabe para um, não para um grupo inteiro. A segunda armadilha é confundir son com somos: somos sempre inclui quem fala entre aqueles de quem se está falando, enquanto son nunca inclui — é sempre "eles" de fora. A checagem é simples: se "eu" está dentro do grupo — precisa de somos; se "eu" não está ali — precisa de son. É fácil lembrar pelo número e pela pessoa: es — uma coisa ou pessoa, son — várias, e quem fala nunca está entre elas.',
  vi: 'Lỗi phổ biến nhất là nói Es de acuerdo khi nói về sự đồng ý của nhiều người cùng lúc, thay vì Son de acuerdo: es chỉ phù hợp với một, không phải cả một nhóm. Cái bẫy thứ hai là nhầm son với somos: somos luôn bao gồm người nói trong số những người được nói tới, còn son thì không bao giờ — đó luôn là "họ" từ bên ngoài. Cách kiểm tra đơn giản: nếu "tôi" ở trong nhóm — cần somos; nếu "tôi" không có ở đó — cần son. Dễ nhớ qua số lượng và ngôi: es — một vật hay người, son — nhiều, và người nói không bao giờ ở trong số đó.',
  id: 'Kesalahan paling umum adalah mengatakan Es de acuerdo saat membicarakan persetujuan beberapa orang sekaligus, alih-alih Son de acuerdo: es hanya cocok untuk satu, bukan seluruh kelompok. Jebakan kedua adalah mengacaukan son dengan somos: somos selalu mencakup penutur di antara orang-orang yang dibicarakan, sedangkan son tidak pernah — itu selalu "mereka" dari luar. Pengecekannya sederhana: jika "saya" ada di dalam kelompok — diperlukan somos; jika "saya" tidak ada di sana — diperlukan son. Mudah diingat lewat jumlah dan orang: es — satu benda atau orang, son — beberapa, dan penutur tidak pernah ada di antara mereka.',
  tr: 'En yaygın hata, aynı anda birkaç kişinin onayından bahsederken Son de acuerdo yerine Es de acuerdo demektir: es yalnızca biri için uygundur, tüm bir grup için değil. İkinci tuzak, son’u somos ile karıştırmaktır: somos her zaman hakkında konuşulanlar arasında konuşanı da içerir, son ise asla içermez — bu her zaman dışarıdan "onlar"dır. Kontrol basittir: grubun içinde "ben" varsa — somos gerekir; "ben" orada yoksa — son gerekir. Sayı ve kişiyle hatırlamak kolaydır: es — bir şey ya da kişi, son — birkaçı, ve konuşan asla onların arasında değildir.',
  pl: 'Najczęstszy błąd to powiedzieć Es de acuerdo, mówiąc o zgodzie kilku osób naraz, zamiast Son de acuerdo: es pasuje tylko do jednej osoby, nie do całej grupy. Druga pułapka to mylenie son z somos: somos zawsze obejmuje mówiącego wśród tych, o których mowa, a son — nigdy, to zawsze „oni” z zewnątrz. Sprawdzenie jest proste: jeśli wewnątrz grupy jest „ja” — potrzebne jest somos; jeśli „ja” tam nie ma — potrzebne jest son. Łatwo zapamiętać przez liczbę i osobę: es — jedna rzecz lub osoba, son — kilka, a mówiący nigdy nie jest wśród nich.',
});

export const ES_EPISODE_01_SESSION_27_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'От одного к группе со стороны',
      uk: 'Від одного до групи збоку',
      es: 'From one to a group from the outside',
      'pt-BR': 'De um para um grupo de fora',
      vi: 'Từ một đến một nhóm từ bên ngoài',
      id: 'Dari satu ke kelompok dari luar',
      tr: 'Birden dışarıdan bir gruba',
      pl: 'Od jednego do grupy z zewnątrz',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Es связывает признак с одним предметом, ситуацией или человеком — с кем-то одним, не с говорящим и не с собеседником. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' делает то же самое, но для нескольких: группа людей или предметов, ни один из которых не говорящий. Лицо не меняется вовсе — оба слова остаются про «он, она, оно», а не про «я» или «ты». Меняется только число: es для одного, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' для нескольких. Спутать их — значит перепутать, сколько предметов или людей стоит за словом: son всегда о группе, а не об одном. Именно поэтому, рассказывая сразу о нескольких людях или вещах со стороны, нужна ровно эта форма — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', а не es.', semantic: 'explanation' }),
      uk: R({ text: 'Es пов’язує ознаку з одним предметом, ситуацією чи людиною — з кимось одним, не з мовцем і не зі співрозмовником. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' робить те саме, але для кількох: група людей чи предметів, жоден із яких не мовець. Особа не змінюється зовсім — обидва слова лишаються про «він, вона, воно», а не про «я» чи «ти». Змінюється лише число: es для одного, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' для кількох. Сплутати їх — означає переплутати, скільки предметів чи людей стоїть за словом: son завжди про групу, а не про одного. Саме тому, розповідаючи одразу про кількох людей чи речей збоку, потрібна рівно ця форма — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', а не es.', semantic: 'explanation' }),
      es: R({ text: 'Es links a quality to one thing, situation, or person — someone or something single, not the speaker and not the listener. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' does the same, but for several: a group of people or things, none of them the speaker. The person does not change at all — both words remain about "he, she, it", not about "I" or "you". Only the number changes: es for one, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' for several. Confusing them means confusing how many things or people stand behind the word: son is always about a group, never about one. That is why, talking about several people or things from the outside, exactly this form is needed — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', not es.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Es liga uma qualidade a uma única coisa, situação ou pessoa — alguém ou algo único, nem quem fala nem o interlocutor. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' faz o mesmo, mas para vários: um grupo de pessoas ou coisas, nenhuma delas quem fala. A pessoa não muda em nada — as duas palavras continuam sobre "ele, ela, isso", não sobre "eu" ou "você". Só o número muda: es para um, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' para vários. Confundi-las significa confundir quantas coisas ou pessoas estão por trás da palavra: son é sempre sobre um grupo, nunca sobre um só. Por isso, ao falar de várias pessoas ou coisas de fora, precisa-se exatamente dessa forma — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', não es.', semantic: 'explanation' }),
      vi: R({ text: 'Es nối một đặc điểm với một vật, tình huống hay người duy nhất — ai đó hay điều gì đó riêng lẻ, không phải người nói cũng không phải người nghe. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' làm điều tương tự, nhưng cho nhiều: một nhóm người hay vật, không ai trong số đó là người nói. Ngôi không đổi chút nào — cả hai từ vẫn nói về "anh ấy, cô ấy, nó", không phải về "tôi" hay "bạn". Chỉ có số thay đổi: es cho một, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' cho nhiều. Nhầm lẫn chúng nghĩa là nhầm lẫn có bao nhiêu vật hay người đứng sau từ đó: son luôn nói về một nhóm, không bao giờ về một. Đó là lý do khi nói về nhiều người hay vật từ bên ngoài, cần chính xác dạng này — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', không phải es.', semantic: 'explanation' }),
      id: R({ text: 'Es menghubungkan sifat dengan satu benda, situasi, atau orang — seseorang atau sesuatu yang tunggal, bukan penutur dan bukan pendengar. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' melakukan hal yang sama, tetapi untuk beberapa: sekelompok orang atau benda, tak satu pun dari mereka penutur. Orangnya tidak berubah — kedua kata tetap tentang "dia, itu", bukan tentang "saya" atau "kamu". Hanya jumlahnya yang berubah: es untuk satu, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' untuk beberapa. Mengacaukannya berarti mengacaukan berapa banyak benda atau orang di balik kata itu: son selalu tentang kelompok, tidak pernah tentang satu. Itulah sebabnya berbicara tentang beberapa orang atau benda dari luar memerlukan tepat bentuk ini — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', bukan es.', semantic: 'explanation' }),
      tr: R({ text: 'Es bir niteliği tek bir şeyle, durumla ya da kişiyle bağlar — konuşan ya da dinleyici olmayan, tek başına biri ya da bir şey. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' de aynısını yapar, ama birkaçı için: hiçbiri konuşan olmayan bir grup insan ya da şey. Kişi hiç değişmez — her iki kelime de "o" hakkındadır, "ben" ya da "sen" hakkında değil. Yalnızca sayı değişir: biri için es, birkaçı için ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '. Onları karıştırmak, kelimenin arkasında kaç şey ya da kişi olduğunu karıştırmak demektir: son her zaman bir grup hakkındadır, asla biri hakkında değil. Bu yüzden dışarıdan birkaç kişi ya da şeyden bahsederken tam olarak bu biçim gerekir — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', es değil.', semantic: 'explanation' }),
      pl: R({ text: 'Es łączy cechę z jedną rzeczą, sytuacją lub osobą — kimś lub czymś pojedynczym, nie mówiącym i nie słuchaczem. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' robi to samo, ale dla kilku: grupa ludzi lub rzeczy, z których żadna nie jest mówiącym. Osoba wcale się nie zmienia — oba słowa nadal dotyczą „on, ona, to”, a nie „ja” czy „ty”. Zmienia się tylko liczba: es dla jednej, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' dla kilku. Pomylenie ich oznacza pomylenie, ile rzeczy lub osób stoi za słowem: son zawsze dotyczy grupy, nigdy jednej. Dlatego mówiąc od razu o kilku osobach lub rzeczach z zewnątrz, potrzebna jest dokładnie ta forma — ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ', a nie es.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какая связка нужна, чтобы рассказать сразу о нескольких людях со стороны?',
        uk: 'Яка зв’язка потрібна, щоб розповісти одразу про кількох людей збоку?',
        es: 'Which linking word is needed to talk about several people at once from the outside?',
        'pt-BR': 'Qual ligação é necessária para falar de várias pessoas de uma vez, de fora?',
        vi: 'Từ nối nào cần để nói về nhiều người cùng lúc từ bên ngoài?',
        id: 'Kata penghubung mana yang diperlukan untuk berbicara tentang beberapa orang sekaligus dari luar?',
        tr: 'Dışarıdan aynı anda birkaç kişiden bahsetmek için hangi bağlaç gerekir?',
        pl: 'Jaki łącznik jest potrzebny, aby mówić od razu o kilku osobach z zewnątrz?',
      }),
      choices: [
        L({ ru: 'son', uk: 'son', es: 'son', 'pt-BR': 'son', vi: 'son', id: 'son', tr: 'son', pl: 'son' }),
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'somos', uk: 'somos', es: 'somos', 'pt-BR': 'somos', vi: 'somos', id: 'somos', tr: 'somos', pl: 'somos' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Son нужна, потому что речь о нескольких людях, а говорящего среди них нет. Es годится только для одного, а somos включает самого говорящего — ни то ни другое не подходит.',
        uk: 'Son потрібна, бо йдеться про кількох людей, а мовця серед них немає. Es годиться тільки для одного, а somos включає самого мовця — ні те ні інше не підходить.',
        es: 'Son is needed because it is about several people, and the speaker is not among them. Es only fits one, and somos includes the speaker — neither fits.',
        'pt-BR': 'Son é necessária porque se trata de várias pessoas, e quem fala não está entre elas. Es só cabe a uma, e somos inclui quem fala — nenhuma das duas cabe.',
        vi: 'Son cần thiết vì nói về nhiều người, mà người nói không ở trong số đó. Es chỉ phù hợp với một người, còn somos bao gồm người nói — cả hai đều không phù hợp.',
        id: 'Son diperlukan karena membicarakan beberapa orang, dan penutur tidak ada di antara mereka. Es hanya cocok untuk satu orang, dan somos mencakup penutur — keduanya tidak cocok.',
        tr: 'Son gereklidir çünkü birkaç kişiden bahsedilir, ve konuşan onların arasında değildir. Es yalnızca bir kişi için uygundur, ve somos konuşanı içerir — ikisi de uygun değildir.',
        pl: 'Son jest potrzebne, ponieważ mowa o kilku osobach, a mówiącego wśród nich nie ma. Es pasuje tylko do jednej osoby, a somos obejmuje mówiącego — żadne z nich nie pasuje.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Признак не меняется, меняется связка',
      uk: 'Ознака не змінюється, змінюється зв’язка',
      es: 'The quality does not change, the linking word does',
      'pt-BR': 'A qualidade não muda, a ligação muda',
      vi: 'Đặc điểm không đổi, từ nối mới đổi',
      id: 'Sifatnya tidak berubah, kata penghubungnya yang berubah',
      tr: 'Nitelik değişmez, değişen bağlaçtır',
      pl: 'Cecha się nie zmienia, zmienia się łącznik',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула проста: es остаётся для одного предмета или человека, а son появляется, как только речь заходит о нескольких — без говорящего среди них. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' говорит о характере целой группы со стороны, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' — о согласии сразу нескольких людей без говорящего, и оба признака остаются в точности такими же, как были с es или somos раньше: así и de acuerdo не меняются ни по роду, ни по числу. Отличить нужную форму легко по смыслу фразы: если говорящий описывает одного — es, если нескольких без себя самого — son. Признак после связки от этого выбора не зависит вовсе, меняется только сама связка.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: es лишається для одного предмета чи людини, а son з’являється, щойно йдеться про кількох — без мовця серед них. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' говорить про характер цілої групи збоку, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' — про згоду одразу кількох людей без мовця, і обидві ознаки лишаються точнісінько такими самими, як були з es чи somos раніше: así та de acuerdo не змінюються ні за родом, ні за числом. Відрізнити потрібну форму легко за змістом фрази: якщо мовець описує одного — es, якщо кількох без себе самого — son. Ознака після зв’язки від цього вибору зовсім не залежить, змінюється лише сама зв’язка.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: es remains for one thing or person, and son appears as soon as the sentence is about several — without the speaker among them. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' talks about the character of an entire group from the outside, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' about the agreement of several people without the speaker, and both qualities stay exactly as they were with es or somos before: así and de acuerdo never change for gender or number. It is easy to tell the right form apart by the meaning of the phrase: if the speaker describes one — es; if several without themselves — son. The quality after the linking word does not depend on this choice at all; only the linking word itself changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: es continua para uma coisa ou pessoa, e son aparece assim que a frase é sobre várias — sem quem fala entre elas. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' fala do caráter de um grupo inteiro de fora, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' da concordância de várias pessoas sem quem fala, e as duas qualidades continuam exatamente como eram com es ou somos antes: así e de acuerdo nunca mudam em gênero nem número. É fácil distinguir a forma certa pelo sentido da frase: se quem fala descreve um — es; se vários sem si mesmo — son. A qualidade depois da ligação não depende nada dessa escolha; só a própria ligação muda.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức đơn giản: es vẫn dùng cho một vật hay một người, và son xuất hiện ngay khi câu nói về nhiều — không có người nói trong số đó. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' nói về tính cách của cả một nhóm từ bên ngoài, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' nói về sự đồng ý của nhiều người không có người nói, và cả hai đặc điểm vẫn giữ nguyên như khi dùng với es hay somos trước đó: así và de acuerdo không bao giờ đổi theo giống hay số. Dễ dàng phân biệt dạng đúng qua nghĩa của câu: nếu người nói mô tả một — es; nếu nhiều mà không có bản thân — son. Đặc điểm sau từ nối hoàn toàn không phụ thuộc vào lựa chọn này; chỉ có bản thân từ nối thay đổi.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: es tetap untuk satu benda atau orang, dan son muncul segera setelah kalimat membicarakan beberapa — tanpa penutur di antara mereka. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' berbicara tentang karakter seluruh kelompok dari luar, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' tentang persetujuan beberapa orang tanpa penutur, dan kedua sifat itu tetap persis seperti sebelumnya dengan es atau somos: así dan de acuerdo tidak pernah berubah untuk gender atau jumlah. Mudah membedakan bentuk yang tepat lewat makna frasanya: jika penutur menggambarkan satu — es; jika beberapa tanpa dirinya sendiri — son. Sifat setelah kata penghubung sama sekali tidak bergantung pada pilihan ini; hanya kata penghubungnya sendiri yang berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: es tek bir şey ya da kişi için kalır, ve son cümle içlerinde konuşan olmadan birkaçından bahseder bahsetmez ortaya çıkar. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' dışarıdan tüm bir grubun karakterinden bahseder, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' konuşan olmadan birkaç kişinin onayından bahseder, ve her iki nitelik de daha önce es ya da somos’la olduğu gibi tam olarak aynı kalır: así ve de acuerdo cinsiyet ya da sayı için asla değişmez. Doğru biçimi ifadenin anlamından ayırt etmek kolaydır: konuşan birini anlatıyorsa — es; kendisi olmadan birkaçını anlatıyorsa — son. Bağlaçtan sonraki nitelik bu seçime hiç bağlı değildir; yalnızca bağlacın kendisi değişir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: es pozostaje dla jednej rzeczy lub osoby, a son pojawia się, gdy tylko zdanie dotyczy kilku — bez mówiącego wśród nich. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' mówi o charakterze całej grupy z zewnątrz, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' o zgodzie kilku osób bez mówiącego, a obie cechy pozostają dokładnie takie same, jak wcześniej z es czy somos: así i de acuerdo nigdy nie zmieniają się ani rodzajem, ani liczbą. Łatwo odróżnić właściwą formę po sensie frazy: jeśli mówiący opisuje jedną osobę — es; jeśli kilka bez siebie samego — son. Cecha po łączniku wcale nie zależy od tego wyboru; zmienia się tylko sam łącznik.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое слово встаёт вместо es, когда речь идёт о нескольких без говорящего?',
        uk: 'Яке слово стає замість es, коли йдеться про кількох без мовця?',
        es: 'Which word takes the place of es when the sentence is about several without the speaker?',
        'pt-BR': 'Qual palavra fica no lugar de es quando a frase é sobre várias pessoas sem quem fala?',
        vi: 'Từ nào thay thế es khi câu nói về nhiều mà không có người nói?',
        id: 'Kata mana yang menggantikan es ketika kalimat membicarakan beberapa tanpa penutur?',
        tr: 'Konuşan olmadan birkaçından bahsedilirken es’in yerini hangi kelime alır?',
        pl: 'Jakie słowo zastępuje es, gdy zdanie dotyczy kilku bez mówiącego?',
      }),
      choices: [
        L({ ru: 'Son', uk: 'Son', es: 'Son', 'pt-BR': 'Son', vi: 'Son', id: 'Son', tr: 'Son', pl: 'Son' }),
        L({ ru: 'De acuerdo', uk: 'De acuerdo', es: 'De acuerdo', 'pt-BR': 'De acuerdo', vi: 'De acuerdo', id: 'De acuerdo', tr: 'De acuerdo', pl: 'De acuerdo' }),
        L({ ru: 'Es', uk: 'Es', es: 'Es', 'pt-BR': 'Es', vi: 'Es', id: 'Es', tr: 'Es', pl: 'Es' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Son появляется вместо es, когда речь идёт о нескольких без говорящего. De acuerdo остаётся неизменной в обеих фразах, потому что она не согласуется ни по роду, ни по числу.',
        uk: 'Son з’являється замість es, коли йдеться про кількох без мовця. De acuerdo лишається незмінною в обох фразах, бо вона не узгоджується ні за родом, ні за числом.',
        es: 'Son appears instead of es when the sentence is about several without the speaker. De acuerdo stays unchanged in both phrases because it agrees for neither gender nor number.',
        'pt-BR': 'Son aparece no lugar de es quando a frase é sobre várias pessoas sem quem fala. De acuerdo permanece inalterada nas duas frases porque não concorda nem em gênero nem em número.',
        vi: 'Son xuất hiện thay cho es khi câu nói về nhiều mà không có người nói. De acuerdo không đổi trong cả hai câu vì nó không hòa hợp theo giống lẫn số.',
        id: 'Son muncul menggantikan es ketika kalimat membicarakan beberapa tanpa penutur. De acuerdo tetap tidak berubah di kedua frasa karena tidak sesuai dengan gender maupun jumlah.',
        tr: 'Konuşan olmadan birkaçından bahsedilirken es yerine Son ortaya çıkar. De acuerdo her iki ifadede de değişmeden kalır çünkü ne cinsiyete ne de sayıya uyum sağlar.',
        pl: 'Son pojawia się zamiast es, gdy zdanie dotyczy kilku bez mówiącego. De acuerdo pozostaje niezmienione w obu frazach, ponieważ nie zgadza się ani rodzajem, ani liczbą.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не es и не somos — только son',
      uk: 'Не es і не somos — тільки son',
      es: 'Not es, not somos — only son',
      'pt-BR': 'Nem es, nem somos — só son',
      vi: 'Không phải es, không phải somos — chỉ son',
      id: 'Bukan es, bukan somos — hanya son',
      tr: 'Ne es ne de somos — sadece son',
      pl: 'Nie es, nie somos — tylko son',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — сказать ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ', рассказывая о согласии сразу нескольких людей, вместо ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es годится только для одного, а не для целой группы. Вторая ловушка — спутать son с somos: somos всегда включает самого говорящего в число тех, о ком речь, а son — никогда, это всегда «они» со стороны. Проверка простая: если внутри группы есть «я» — нужна somos, а если «я» там нет — нужна son. Запомнить легко через число и лицо: es — один предмет или человек, son — несколько, и среди них никогда не бывает самого говорящего.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — сказати ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ', розповідаючи про згоду одразу кількох людей, замість ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es годиться тільки для одного, а не для цілої групи. Друга пастка — сплутати son із somos: somos завжди включає самого мовця до числа тих, про кого йдеться, а son — ніколи, це завжди «вони» збоку. Перевірка проста: якщо всередині групи є «я» — потрібна somos, а якщо «я» там немає — потрібна son. Запам’ятати легко через число й особу: es — один предмет чи людина, son — кілька, і серед них ніколи не буває самого мовця.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is saying ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' while talking about the agreement of several people at once, instead of ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es only fits one, not an entire group. The second trap is confusing son with somos: somos always includes the speaker among those being talked about, while son never does — it is always "them" from the outside. The check is simple: if "I" is inside the group — somos is needed; if "I" is not there — son is needed. It is easy to remember through number and person: es — one thing or person, son — several, and the speaker is never among them.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é dizer ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' ao falar da concordância de várias pessoas de uma vez, em vez de ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es só cabe para um, não para um grupo inteiro. A segunda armadilha é confundir son com somos: somos sempre inclui quem fala entre aqueles de quem se está falando, enquanto son nunca inclui — é sempre "eles" de fora. A checagem é simples: se "eu" está dentro do grupo — precisa de somos; se "eu" não está ali — precisa de son. É fácil lembrar pelo número e pela pessoa: es — uma coisa ou pessoa, son — várias, e quem fala nunca está entre elas.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là nói ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' khi nói về sự đồng ý của nhiều người cùng lúc, thay vì ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es chỉ phù hợp với một, không phải cả một nhóm. Cái bẫy thứ hai là nhầm son với somos: somos luôn bao gồm người nói trong số những người được nói tới, còn son thì không bao giờ — đó luôn là "họ" từ bên ngoài. Cách kiểm tra đơn giản: nếu "tôi" ở trong nhóm — cần somos; nếu "tôi" không có ở đó — cần son. Dễ nhớ qua số lượng và ngôi: es — một vật hay người, son — nhiều, và người nói không bao giờ ở trong số đó.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah mengatakan ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' saat membicarakan persetujuan beberapa orang sekaligus, alih-alih ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es hanya cocok untuk satu, bukan seluruh kelompok. Jebakan kedua adalah mengacaukan son dengan somos: somos selalu mencakup penutur di antara orang-orang yang dibicarakan, sedangkan son tidak pernah — itu selalu "mereka" dari luar. Pengecekannya sederhana: jika "saya" ada di dalam kelompok — diperlukan somos; jika "saya" tidak ada di sana — diperlukan son. Mudah diingat lewat jumlah dan orang: es — satu benda atau orang, son — beberapa, dan penutur tidak pernah ada di antara mereka.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, aynı anda birkaç kişinin onayından bahsederken ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' demektir: es yalnızca biri için uygundur, tüm bir grup için değil. İkinci tuzak, son’u somos ile karıştırmaktır: somos her zaman hakkında konuşulanlar arasında konuşanı da içerir, son ise asla içermez — bu her zaman dışarıdan "onlar"dır. Kontrol basittir: grubun içinde "ben" varsa — somos gerekir; "ben" orada yoksa — son gerekir. Sayı ve kişiyle hatırlamak kolaydır: es — bir şey ya da kişi, son — birkaçı, ve konuşan asla onların arasında değildir.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to powiedzieć ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ', mówiąc o zgodzie kilku osób naraz, zamiast ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es pasuje tylko do jednej osoby, nie do całej grupy. Druga pułapka to mylenie son z somos: somos zawsze obejmuje mówiącego wśród tych, o których mowa, a son — nigdy, to zawsze „oni” z zewnątrz. Sprawdzenie jest proste: jeśli wewnątrz grupy jest „ja” — potrzebne jest somos; jeśli „ja” tam nie ma — potrzebne jest son. Łatwo zapamiętać przez liczbę i osobę: es — jedna rzecz lub osoba, son — kilka, a mówiący nigdy nie jest wśród nich.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно сказать, что несколько человек без говорящего согласны?',
        uk: 'Як правильно сказати, що кілька людей без мовця згодні?',
        es: 'How do you correctly say that several people, without the speaker, agree?',
        'pt-BR': 'Como se diz corretamente que várias pessoas, sem quem fala, concordam?',
        vi: 'Nói đúng rằng nhiều người, không có người nói, đều đồng ý, như thế nào?',
        id: 'Bagaimana cara mengatakan dengan benar bahwa beberapa orang, tanpa penutur, setuju?',
        tr: 'Konuşan olmadan birkaç kişinin aynı fikirde olduğu doğru nasıl söylenir?',
        pl: 'Jak poprawnie powiedzieć, że kilka osób, bez mówiącego, się zgadza?',
      }),
      choices: [
        L({ ru: 'Son de acuerdo', uk: 'Son de acuerdo', es: 'Son de acuerdo', 'pt-BR': 'Son de acuerdo', vi: 'Son de acuerdo', id: 'Son de acuerdo', tr: 'Son de acuerdo', pl: 'Son de acuerdo' }),
        L({ ru: 'Es de acuerdo', uk: 'Es de acuerdo', es: 'Es de acuerdo', 'pt-BR': 'Es de acuerdo', vi: 'Es de acuerdo', id: 'Es de acuerdo', tr: 'Es de acuerdo', pl: 'Es de acuerdo' }),
        L({ ru: 'Somos de acuerdo', uk: 'Somos de acuerdo', es: 'Somos de acuerdo', 'pt-BR': 'Somos de acuerdo', vi: 'Somos de acuerdo', id: 'Somos de acuerdo', tr: 'Somos de acuerdo', pl: 'Somos de acuerdo' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Son de acuerdo верно, потому что son не включает говорящего в группу согласных. Es de acuerdo звучало бы только про одного человека, а Somos de acuerdo включало бы говорящего в число согласных.',
        uk: 'Son de acuerdo правильно, бо son не включає мовця в групу згодних. Es de acuerdo звучало б тільки про одну людину, а Somos de acuerdo включало б мовця до числа згодних.',
        es: 'Son de acuerdo is correct because son does not include the speaker in the group that agrees. Es de acuerdo would sound like it is about only one person, and Somos de acuerdo would include the speaker among those agreeing.',
        'pt-BR': 'Son de acuerdo está correto porque son não inclui quem fala no grupo que concorda. Es de acuerdo soaria como sobre uma única pessoa, e Somos de acuerdo incluiria quem fala entre os que concordam.',
        vi: 'Son de acuerdo đúng vì son không bao gồm người nói trong nhóm đồng ý. Es de acuerdo nghe như chỉ về một người, còn Somos de acuerdo sẽ bao gồm người nói trong số những người đồng ý.',
        id: 'Son de acuerdo benar karena son tidak mencakup penutur dalam kelompok yang setuju. Es de acuerdo akan terdengar seperti hanya tentang satu orang, dan Somos de acuerdo akan mencakup penutur di antara yang setuju.',
        tr: 'Son de acuerdo doğrudur çünkü son, konuşanı aynı fikirde olan gruba dahil etmez. Es de acuerdo yalnızca bir kişi hakkındaymış gibi duyulurdu, Somos de acuerdo ise konuşanı aynı fikirde olanlar arasına dahil ederdi.',
        pl: 'Son de acuerdo jest poprawne, ponieważ son nie obejmuje mówiącego w grupie zgadzających się. Es de acuerdo brzmiałoby jak o jednej osobie, a Somos de acuerdo objęłoby mówiącego wśród zgadzających się.',
      }),
    },
  },
];
