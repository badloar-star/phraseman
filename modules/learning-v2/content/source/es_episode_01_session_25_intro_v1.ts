import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 25 "Мы" / first_person_plural, builtOn: [1, 17], recalls: [1],
// открывает Главу 4 "Мы и они"): три страницы concept/formula/trap вводят
// somos — связку первого лица МНОЖЕСТВЕННОГО числа. Soy (сессия 1) уже
// закреплена за «я»; somos — тот же говорящий, но теперь в группе. Это
// сдвиг ЧИСЛА, а не лица, в отличие от eres (сессия 9) и es (сессия 17),
// которые сдвигали именно лицо. Recall из сессии 1 — soy и её отрицание.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_25_TITLE = L({
  ru: 'Мы',
  uk: 'Ми',
  es: 'We',
  'pt-BR': 'Nós',
  vi: 'Chúng tôi',
  id: 'Kami',
  tr: 'Biz',
  pl: 'My',
});

export const ES_EPISODE_01_SESSION_25_SUMMARY = L({
  ru: 'Одно новое слово переносит уже знакомую связку с одного говорящего на целую группу, включая его самого.',
  uk: 'Одне нове слово переносить уже знайому зв’язку з одного мовця на цілу групу, включно з ним самим.',
  es: 'One new word carries the already familiar linking verb from a single speaker to an entire group that includes them.',
  'pt-BR': 'Uma palavra nova transfere a ligação já conhecida de quem fala sozinho para um grupo inteiro que o inclui.',
  vi: 'Một từ mới chuyển từ nối đã quen thuộc từ một người nói sang cả một nhóm bao gồm cả người đó.',
  id: 'Satu kata baru memindahkan kata penghubung yang sudah dikenal dari satu penutur ke seluruh kelompok yang mencakup dirinya.',
  tr: 'Tek bir yeni kelime, zaten tanıdık olan bağlacı tek bir konuşandan onu da içeren bütün bir gruba taşır.',
  pl: 'Jedno nowe słowo przenosi już znany łącznik z jednego mówiącego na całą grupę, w tym na niego samego.',
});

export const ES_EPISODE_01_SESSION_25_GOAL = L({
  ru: 'Узнать на слух, понять и точно построить somos как связку первого лица множественного числа, отличая её от soy, eres и es.',
  uk: 'Упізнати на слух, зрозуміти й точно побудувати somos як зв’язку першої особи множини, відрізняючи її від soy, eres та es.',
  es: 'Recognize, understand, and correctly build somos as the first-person-plural linking word, telling it apart from soy, eres, and es.',
  'pt-BR': 'Reconhecer de ouvido, entender e construir corretamente somos como a ligação de primeira pessoa do plural, distinguindo-a de soy, eres e es.',
  vi: 'Nghe ra, hiểu và xây dựng đúng somos như từ nối ngôi thứ nhất số nhiều, phân biệt nó với soy, eres và es.',
  id: 'Mengenali dari suara, memahami, dan membangun somos dengan tepat sebagai kata penghubung orang pertama jamak, membedakannya dari soy, eres, dan es.',
  tr: 'Somos’u birinci çoğul şahıs bağlacı olarak duyup tanımak, anlamak ve doğru kurmak; soy, eres ve es’ten ayırt etmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zbudować somos jako łącznik pierwszej osoby liczby mnogiej, odróżniając go od soy, eres i es.',
});

const CONCEPT_BODY = L({
  ru: 'Soy связывает признак с одним говорящим — только с ним самим, в одиночку. Somos делает то же самое, но когда говорящий уже не один: группа людей, включая его самого, говорит о себе вместе. Лицо не меняется вовсе — оба слова остаются про «я» и тех, кто со мной, а не про собеседника или третье лицо. Меняется только число: soy для одного, somos для нескольких. Спутать их — значит перепутать, сколько людей стоит за словом: somos без сомнения показывает, что внутри группы есть сам говорящий, а не только другие люди. Именно поэтому, рассказывая о себе вместе с кем-то ещё, нужна ровно эта форма — somos, а не soy.',
  uk: 'Soy пов’язує ознаку з одним мовцем — тільки з ним самим, поодинці. Somos робить те саме, але коли мовець уже не сам: група людей, включно з ним самим, говорить про себе разом. Особа не змінюється зовсім — обидва слова лишаються про «я» і тих, хто зі мною, а не про співрозмовника чи третю особу. Змінюється лише число: soy для одного, somos для кількох. Сплутати їх — означає переплутати, скільки людей стоїть за словом: somos без сумніву показує, що всередині групи є сам мовець, а не тільки інші люди. Саме тому, розповідаючи про себе разом із кимось іще, потрібна рівно ця форма — somos, а не soy.',
  es: 'Soy links a quality to a single speaker — only to themselves, alone. Somos does the same, but when the speaker is no longer alone: a group of people, including the speaker, talks about themselves together. The person does not change at all — both words remain about "I" and whoever is with me, not about the listener or a third person. Only the number changes: soy for one, somos for several. Confusing them means confusing how many people stand behind the word: somos unmistakably shows that the speaker is inside the group, not only other people. That is why, talking about yourself together with someone else, exactly this form is needed — somos, not soy.',
  'pt-BR': 'Soy liga uma qualidade a um único falante — só a si mesmo, sozinho. Somos faz o mesmo, mas quando quem fala já não está sozinho: um grupo de pessoas, incluindo quem fala, fala de si mesmo junto. A pessoa não muda em nada — as duas palavras continuam sobre "eu" e quem está comigo, não sobre o interlocutor nem uma terceira pessoa. Só o número muda: soy para um, somos para vários. Confundi-las significa confundir quantas pessoas estão por trás da palavra: somos mostra sem dúvida que quem fala está dentro do grupo, não só outras pessoas. Por isso, ao falar de si mesmo junto com outra pessoa, precisa-se exatamente dessa forma — somos, não soy.',
  vi: 'Soy nối một đặc điểm với một người nói duy nhất — chỉ với chính họ, một mình. Somos làm điều tương tự, nhưng khi người nói không còn một mình: một nhóm người, kể cả người nói, cùng nói về bản thân họ. Ngôi không đổi chút nào — cả hai từ vẫn nói về "tôi" và những ai ở cùng tôi, không phải về người nghe hay ngôi thứ ba. Chỉ có số thay đổi: soy cho một người, somos cho nhiều người. Nhầm lẫn chúng nghĩa là nhầm lẫn có bao nhiêu người đứng sau từ đó: somos chắc chắn cho thấy người nói ở trong nhóm, không chỉ những người khác. Đó là lý do khi nói về bản thân cùng người khác, cần chính xác dạng này — somos, không phải soy.',
  id: 'Soy menghubungkan sifat dengan satu penutur — hanya dirinya sendiri. Somos melakukan hal yang sama, tetapi saat penutur tidak lagi sendirian: sekelompok orang, termasuk penutur, berbicara tentang diri mereka bersama. Orangnya tidak berubah — kedua kata tetap tentang "saya" dan siapa pun bersama saya, bukan pendengar atau orang ketiga. Hanya jumlahnya yang berubah: soy untuk satu, somos untuk beberapa. Mengacaukannya berarti mengacaukan berapa banyak orang di balik kata itu: somos menunjukkan penutur ada di dalam kelompok, bukan hanya orang lain. Itulah sebabnya berbicara tentang diri sendiri bersama orang lain memerlukan tepat bentuk ini — somos, bukan soy.',
  tr: 'Soy bir niteliği tek bir konuşanla bağlar — yalnızca kendisiyle, tek başına. Somos de aynısını yapar, ama konuşan artık yalnız değilken: konuşanı da içeren bir grup insan kendisinden birlikte bahseder. Kişi hiç değişmez — her iki kelime de "ben" ve benimle olanlar hakkındadır, dinleyici ya da üçüncü kişi hakkında değil. Yalnızca sayı değişir: biri için soy, birkaçı için somos. Onları karıştırmak, kelimenin arkasında kaç kişi olduğunu karıştırmak demektir: somos, konuşanın grubun içinde olduğunu kuşkusuz gösterir, yalnızca başkalarını değil. Bu yüzden kendinden başka biriyle birlikte bahsederken tam olarak bu biçim gerekir — somos, soy değil.',
  pl: 'Soy łączy cechę z jednym mówiącym — tylko z nim samym, w pojedynkę. Somos robi to samo, ale gdy mówiący nie jest już sam: grupa ludzi, w tym on sam, mówi o sobie razem. Osoba wcale się nie zmienia — oba słowa nadal dotyczą „ja” i tych, którzy są ze mną, a nie słuchacza czy trzeciej osoby. Zmienia się tylko liczba: soy dla jednej osoby, somos dla kilku. Pomylenie ich oznacza pomylenie, ile osób stoi za słowem: somos bez wątpienia pokazuje, że mówiący jest w środku grupy, a nie tylko inni ludzie. Dlatego mówiąc o sobie razem z kimś innym, potrzebna jest dokładnie ta forma — somos, a nie soy.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: soy остаётся для одного говорящего, а somos появляется, как только в предложении «я» становится частью «мы». Somos así говорит о характере целой группы, somos de acuerdo — о согласии сразу нескольких людей, и оба признака остаются в точности такими же, как были с soy или es раньше: así и de acuerdo не меняются ни по роду, ни по числу. Отличить нужную форму легко по смыслу фразы: если говорящий описывает себя одного — soy, если говорящий и ещё кто-то — somos. Признак после связки от этого выбора не зависит вовсе, меняется только сама связка.',
  uk: 'Формула проста: soy лишається для одного мовця, а somos з’являється, щойно в реченні «я» стає частиною «ми». Somos así говорить про характер цілої групи, somos de acuerdo — про згоду одразу кількох людей, і обидві ознаки лишаються точнісінько такими самими, як були з soy чи es раніше: así та de acuerdo не змінюються ні за родом, ні за числом. Відрізнити потрібну форму легко за змістом фрази: якщо мовець описує себе одного — soy, якщо мовець і ще хтось — somos. Ознака після зв’язки від цього вибору зовсім не залежить, змінюється лише сама зв’язка.',
  es: 'The formula is simple: soy remains for a single speaker, and somos appears as soon as "I" in the sentence becomes part of "we". Somos así talks about the character of an entire group, somos de acuerdo about the agreement of several people at once, and both qualities stay exactly as they were with soy or es before: así and de acuerdo never change for gender or number. It is easy to tell the right form apart by the meaning of the phrase: if the speaker describes themselves alone — soy; if the speaker and someone else — somos. The quality after the linking word does not depend on this choice at all; only the linking word itself changes.',
  'pt-BR': 'A fórmula é simples: soy continua para um único falante, e somos aparece assim que "eu" na frase vira parte de "nós". Somos así fala do caráter de um grupo inteiro, somos de acuerdo da concordância de várias pessoas de uma vez, e as duas qualidades continuam exatamente como eram com soy ou es antes: así e de acuerdo nunca mudam em gênero nem número. É fácil distinguir a forma certa pelo sentido da frase: se quem fala descreve a si mesmo sozinho — soy; se quem fala e mais alguém — somos. A qualidade depois da ligação não depende nada dessa escolha; só a própria ligação muda.',
  vi: 'Công thức đơn giản: soy vẫn dùng cho một người nói duy nhất, và somos xuất hiện ngay khi "tôi" trong câu trở thành một phần của "chúng tôi". Somos así nói về tính cách của cả một nhóm, somos de acuerdo nói về sự đồng ý của nhiều người cùng lúc, và cả hai đặc điểm vẫn giữ nguyên như khi dùng với soy hay es trước đó: así và de acuerdo không bao giờ đổi theo giống hay số. Dễ dàng phân biệt dạng đúng qua nghĩa của câu: nếu người nói mô tả một mình mình — soy; nếu người nói và người khác nữa — somos. Đặc điểm sau từ nối hoàn toàn không phụ thuộc vào lựa chọn này; chỉ có bản thân từ nối thay đổi.',
  id: 'Rumusnya sederhana: soy tetap untuk satu penutur, dan somos muncul segera setelah "saya" dalam kalimat menjadi bagian dari "kami". Somos así berbicara tentang karakter seluruh kelompok, somos de acuerdo tentang persetujuan beberapa orang sekaligus, dan kedua sifat itu tetap persis seperti sebelumnya dengan soy atau es: así dan de acuerdo tidak pernah berubah untuk gender atau jumlah. Mudah membedakan bentuk yang tepat lewat makna frasanya: jika penutur menggambarkan dirinya sendiri — soy; jika penutur dan orang lain — somos. Sifat setelah kata penghubung sama sekali tidak bergantung pada pilihan ini; hanya kata penghubungnya sendiri yang berubah.',
  tr: 'Formül basittir: soy tek bir konuşan için kalır, ve somos cümledeki "ben" "biz"in bir parçası olur olmaz ortaya çıkar. Somos así tüm bir grubun karakterinden bahseder, somos de acuerdo aynı anda birkaç kişinin onayından bahseder, ve her iki nitelik de daha önce soy ya da es’le olduğu gibi tam olarak aynı kalır: así ve de acuerdo cinsiyet ya da sayı için asla değişmez. Doğru biçimi ifadenin anlamından ayırt etmek kolaydır: konuşan kendini tek başına anlatıyorsa — soy; konuşan ve başka biri anlatılıyorsa — somos. Bağlaçtan sonraki nitelik bu seçime hiç bağlı değildir; yalnızca bağlacın kendisi değişir.',
  pl: 'Formuła jest prosta: soy pozostaje dla jednego mówiącego, a somos pojawia się, gdy tylko „ja” w zdaniu staje się częścią „my”. Somos así mówi o charakterze całej grupy, somos de acuerdo o zgodzie kilku osób naraz, a obie cechy pozostają dokładnie takie same, jak wcześniej z soy czy es: así i de acuerdo nigdy nie zmieniają się ani rodzajem, ani liczbą. Łatwo odróżnić właściwą formę po sensie frazy: jeśli mówiący opisuje tylko siebie — soy; jeśli mówiący i ktoś jeszcze — somos. Cecha po łączniku wcale nie zależy od tego wyboru; zmienia się tylko sam łącznik.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка — сказать Soy de acuerdo, рассказывая о согласии сразу нескольких людей, вместо Somos de acuerdo: soy годится только для одного говорящего, а не для целой группы. Вторая ловушка — спутать somos с son: son значит «они», без говорящего в составе группы, а somos всегда включает самого говорящего среди тех, о ком идёт речь. Проверка простая: если внутри группы есть «я» — нужна somos, а если «я» там нет — это уже другая связка, не про говорящего. Запомнить легко через число: soy — один человек, somos — несколько людей, и среди них всегда сам говорящий.',
  uk: 'Найчастіша помилка — сказати Soy de acuerdo, розповідаючи про згоду одразу кількох людей, замість Somos de acuerdo: soy годиться тільки для одного мовця, а не для цілої групи. Друга пастка — сплутати somos із son: son означає «вони», без мовця в складі групи, а somos завжди включає самого мовця серед тих, про кого йдеться. Перевірка проста: якщо всередині групи є «я» — потрібна somos, а якщо «я» там немає — це вже інша зв’язка, не про мовця. Запам’ятати легко через число: soy — одна людина, somos — кілька людей, і серед них завжди сам мовець.',
  es: 'The most common mistake is saying Soy de acuerdo while talking about the agreement of several people at once, instead of Somos de acuerdo: soy only fits a single speaker, not an entire group. The second trap is confusing somos with son: son means "they", without the speaker inside the group, while somos always includes the speaker among those being talked about. The check is simple: if "I" is inside the group — somos is needed; if "I" is not there — that is a different linking word, not about the speaker. It is easy to remember through number: soy — one person, somos — several people, and the speaker is always among them.',
  'pt-BR': 'O erro mais comum é dizer Soy de acuerdo ao falar da concordância de várias pessoas de uma vez, em vez de Somos de acuerdo: soy só cabe para um único falante, não para um grupo inteiro. A segunda armadilha é confundir somos com son: son significa "eles", sem quem fala dentro do grupo, enquanto somos sempre inclui quem fala entre aqueles de quem se está falando. A checagem é simples: se "eu" está dentro do grupo — precisa de somos; se "eu" não está ali — essa é outra ligação, não sobre quem fala. É fácil lembrar pelo número: soy — uma pessoa, somos — várias pessoas, e quem fala está sempre entre elas.',
  vi: 'Lỗi phổ biến nhất là nói Soy de acuerdo khi nói về sự đồng ý của nhiều người cùng lúc, thay vì Somos de acuerdo: soy chỉ phù hợp với một người nói duy nhất, không phải cả một nhóm. Cái bẫy thứ hai là nhầm somos với son: son nghĩa là "họ", không có người nói trong nhóm, còn somos luôn bao gồm người nói trong số những người được nói tới. Cách kiểm tra đơn giản: nếu "tôi" ở trong nhóm — cần somos; nếu "tôi" không có ở đó — đó là một từ nối khác, không nói về người nói. Dễ nhớ qua số lượng: soy — một người, somos — nhiều người, và người nói luôn ở trong số đó.',
  id: 'Kesalahan paling umum adalah mengatakan Soy de acuerdo saat membicarakan persetujuan beberapa orang sekaligus, alih-alih Somos de acuerdo: soy hanya cocok untuk satu penutur, bukan seluruh kelompok. Jebakan kedua adalah mengacaukan somos dengan son: son berarti "mereka", tanpa penutur di dalam kelompok, sedangkan somos selalu mencakup penutur di antara orang-orang yang dibicarakan. Pengecekannya sederhana: jika "saya" ada di dalam kelompok — diperlukan somos; jika "saya" tidak ada di sana — itu kata penghubung lain, bukan tentang penutur. Mudah diingat lewat jumlah: soy — satu orang, somos — beberapa orang, dan penutur selalu ada di antara mereka.',
  tr: 'En yaygın hata, aynı anda birkaç kişinin onayından bahsederken Somos de acuerdo yerine Soy de acuerdo demektir: soy yalnızca tek bir konuşan için uygundur, tüm bir grup için değil. İkinci tuzak, somos’u son ile karıştırmaktır: son "onlar" demektir, gruba konuşan dahil değildir, oysa somos her zaman hakkında konuşulanlar arasında konuşanı da içerir. Kontrol basittir: grubun içinde "ben" varsa — somos gerekir; "ben" orada yoksa — bu, konuşan hakkında olmayan başka bir bağlaçtır. Sayıyla hatırlamak kolaydır: soy — bir kişi, somos — birkaç kişi, ve konuşan her zaman onların arasındadır.',
  pl: 'Najczęstszy błąd to powiedzieć Soy de acuerdo, mówiąc o zgodzie kilku osób naraz, zamiast Somos de acuerdo: soy pasuje tylko do jednego mówiącego, nie do całej grupy. Druga pułapka to mylenie somos z son: son znaczy „oni”, bez mówiącego w składzie grupy, podczas gdy somos zawsze obejmuje mówiącego wśród tych, o których mowa. Sprawdzenie jest proste: jeśli wewnątrz grupy jest „ja” — potrzebne jest somos; jeśli „ja” tam nie ma — to już inny łącznik, nie o mówiącym. Łatwo zapamiętać przez liczbę: soy — jedna osoba, somos — kilka osób, a mówiący jest wśród nich zawsze.',
});

export const ES_EPISODE_01_SESSION_25_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'От одного к группе',
      uk: 'Від одного до групи',
      es: 'From one to a group',
      'pt-BR': 'De um para um grupo',
      vi: 'Từ một người sang một nhóm',
      id: 'Dari satu ke kelompok',
      tr: 'Birden gruba',
      pl: 'Od jednego do grupy',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Soy связывает признак с одним говорящим — только с ним самим, в одиночку. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' делает то же самое, но когда говорящий уже не один: группа людей, включая его самого, говорит о себе вместе. Лицо не меняется вовсе — оба слова остаются про «я» и тех, кто со мной, а не про собеседника или третье лицо. Меняется только число: soy для одного, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' для нескольких. Спутать их — значит перепутать, сколько людей стоит за словом: somos без сомнения показывает, что внутри группы есть сам говорящий, а не только другие люди. Именно поэтому, рассказывая о себе вместе с кем-то ещё, нужна ровно эта форма — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', а не soy.', semantic: 'explanation' }),
      uk: R({ text: 'Soy пов’язує ознаку з одним мовцем — тільки з ним самим, поодинці. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' робить те саме, але коли мовець уже не сам: група людей, включно з ним самим, говорить про себе разом. Особа не змінюється зовсім — обидва слова лишаються про «я» і тих, хто зі мною, а не про співрозмовника чи третю особу. Змінюється лише число: soy для одного, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' для кількох. Сплутати їх — означає переплутати, скільки людей стоїть за словом: somos без сумніву показує, що всередині групи є сам мовець, а не тільки інші люди. Саме тому, розповідаючи про себе разом із кимось іще, потрібна рівно ця форма — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', а не soy.', semantic: 'explanation' }),
      es: R({ text: 'Soy links a quality to a single speaker — only to themselves, alone. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' does the same, but when the speaker is no longer alone: a group of people, including the speaker, talks about themselves together. The person does not change at all — both words remain about "I" and whoever is with me, not about the listener or a third person. Only the number changes: soy for one, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' for several. Confusing them means confusing how many people stand behind the word: somos unmistakably shows that the speaker is inside the group, not only other people. That is why, talking about yourself together with someone else, exactly this form is needed — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', not soy.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Soy liga uma qualidade a um único falante — só a si mesmo, sozinho. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' faz o mesmo, mas quando quem fala já não está sozinho: um grupo de pessoas, incluindo quem fala, fala de si mesmo junto. A pessoa não muda em nada — as duas palavras continuam sobre "eu" e quem está comigo, não sobre o interlocutor nem uma terceira pessoa. Só o número muda: soy para um, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' para vários. Confundi-las significa confundir quantas pessoas estão por trás da palavra: somos mostra sem dúvida que quem fala está dentro do grupo, não só outras pessoas. Por isso, ao falar de si mesmo junto com outra pessoa, precisa-se exatamente dessa forma — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', não soy.', semantic: 'explanation' }),
      vi: R({ text: 'Soy nối một đặc điểm với một người nói duy nhất — chỉ với chính họ, một mình. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' làm điều tương tự, nhưng khi người nói không còn một mình: một nhóm người, kể cả người nói, cùng nói về bản thân họ. Ngôi không đổi chút nào — cả hai từ vẫn nói về "tôi" và những ai ở cùng tôi, không phải về người nghe hay ngôi thứ ba. Chỉ có số thay đổi: soy cho một người, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' cho nhiều người. Nhầm lẫn chúng nghĩa là nhầm lẫn có bao nhiêu người đứng sau từ đó: somos chắc chắn cho thấy người nói ở trong nhóm, không chỉ những người khác. Đó là lý do khi nói về bản thân cùng người khác, cần chính xác dạng này — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', không phải soy.', semantic: 'explanation' }),
      id: R({ text: 'Soy menghubungkan sifat dengan satu penutur — hanya dirinya sendiri. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' melakukan hal yang sama, tetapi saat penutur tidak lagi sendirian: sekelompok orang, termasuk penutur, berbicara tentang diri mereka bersama. Orangnya tidak berubah — kedua kata tetap tentang "saya" dan siapa pun bersama saya, bukan pendengar atau orang ketiga. Hanya jumlahnya yang berubah: soy untuk satu, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' untuk beberapa. Mengacaukannya berarti mengacaukan berapa banyak orang di balik kata itu: somos menunjukkan penutur ada di dalam kelompok, bukan hanya orang lain. Itulah sebabnya berbicara tentang diri sendiri bersama orang lain memerlukan tepat bentuk ini — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', bukan soy.', semantic: 'explanation' }),
      tr: R({ text: 'Soy bir niteliği tek bir konuşanla bağlar — yalnızca kendisiyle, tek başına. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' de aynısını yapar, ama konuşan artık yalnız değilken: konuşanı da içeren bir grup insan kendisinden birlikte bahseder. Kişi hiç değişmez — her iki kelime de "ben" ve benimle olanlar hakkındadır, dinleyici ya da üçüncü kişi hakkında değil. Yalnızca sayı değişir: biri için soy, birkaçı için ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: '. Onları karıştırmak, kelimenin arkasında kaç kişi olduğunu karıştırmak demektir: somos, konuşanın grubun içinde olduğunu kuşkusuz gösterir, yalnızca başkalarını değil. Bu yüzden kendinden başka biriyle birlikte bahsederken tam olarak bu biçim gerekir — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', soy değil.', semantic: 'explanation' }),
      pl: R({ text: 'Soy łączy cechę z jednym mówiącym — tylko z nim samym, w pojedynkę. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' robi to samo, ale gdy mówiący nie jest już sam: grupa ludzi, w tym on sam, mówi o sobie razem. Osoba wcale się nie zmienia — oba słowa nadal dotyczą „ja” i tych, którzy są ze mną, a nie słuchacza czy trzeciej osoby. Zmienia się tylko liczba: soy dla jednej osoby, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' dla kilku. Pomylenie ich oznacza pomylenie, ile osób stoi za słowem: somos bez wątpienia pokazuje, że mówiący jest w środku grupy, a nie tylko inni ludzie. Dlatego mówiąc o sobie razem z kimś innym, potrzebna jest dokładnie ta forma — ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ', a nie soy.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какая связка нужна, чтобы рассказать о себе вместе с кем-то ещё?',
        uk: 'Яка зв’язка потрібна, щоб розповісти про себе разом із кимось іще?',
        es: 'Which linking word is needed to talk about yourself together with someone else?',
        'pt-BR': 'Qual ligação é necessária para falar de si mesmo junto com outra pessoa?',
        vi: 'Từ nối nào cần để nói về bản thân cùng với người khác?',
        id: 'Kata penghubung mana yang diperlukan untuk berbicara tentang diri sendiri bersama orang lain?',
        tr: 'Kendinden başka biriyle birlikte bahsetmek için hangi bağlaç gerekir?',
        pl: 'Jaki łącznik jest potrzebny, aby mówić o sobie razem z kimś innym?',
      }),
      choices: [
        L({ ru: 'somos', uk: 'somos', es: 'somos', 'pt-BR': 'somos', vi: 'somos', id: 'somos', tr: 'somos', pl: 'somos' }),
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
        L({ ru: 'son', uk: 'son', es: 'son', 'pt-BR': 'son', vi: 'son', id: 'son', tr: 'son', pl: 'son' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos нужна, потому что говорящий теперь часть группы. Soy годится только для одного человека, а son значит «они», без говорящего внутри — ни то ни другое не подходит.',
        uk: 'Somos потрібна, бо мовець тепер частина групи. Soy годиться тільки для однієї людини, а son означає «вони», без мовця всередині — ні те ні інше не підходить.',
        es: 'Somos is needed because the speaker is now part of the group. Soy only fits one person, and son means "they" without the speaker inside — neither fits.',
        'pt-BR': 'Somos é necessária porque quem fala agora é parte do grupo. Soy só cabe a uma pessoa, e son significa "eles" sem quem fala dentro — nenhuma das duas cabe.',
        vi: 'Somos cần thiết vì người nói giờ là một phần của nhóm. Soy chỉ phù hợp với một người, còn son nghĩa là "họ" mà không có người nói ở trong — cả hai đều không phù hợp.',
        id: 'Somos diperlukan karena penutur sekarang menjadi bagian kelompok. Soy hanya cocok untuk satu orang, dan son berarti "mereka" tanpa penutur di dalamnya — keduanya tidak cocok.',
        tr: 'Somos gereklidir çünkü konuşan artık grubun bir parçasıdır. Soy yalnızca bir kişi için uygundur, ve son içinde konuşan olmadan "onlar" demektir — ikisi de uygun değildir.',
        pl: 'Somos jest potrzebne, ponieważ mówiący jest teraz częścią grupy. Soy pasuje tylko do jednej osoby, a son znaczy „oni” bez mówiącego w środku — żadne z nich nie pasuje.',
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
      ru: R({ text: 'Формула проста: soy остаётся для одного говорящего, а somos появляется, как только в предложении «я» становится частью «мы». ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' говорит о характере целой группы, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' — о согласии сразу нескольких людей, и оба признака остаются в точности такими же, как были с soy или es раньше: así и de acuerdo не меняются ни по роду, ни по числу. Отличить нужную форму легко по смыслу фразы: если говорящий описывает себя одного — soy, если говорящий и ещё кто-то — somos. Признак после связки от этого выбора не зависит вовсе, меняется только сама связка.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: soy лишається для одного мовця, а somos з’являється, щойно в реченні «я» стає частиною «ми». ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' говорить про характер цілої групи, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' — про згоду одразу кількох людей, і обидві ознаки лишаються точнісінько такими самими, як були з soy чи es раніше: así та de acuerdo не змінюються ні за родом, ні за числом. Відрізнити потрібну форму легко за змістом фрази: якщо мовець описує себе одного — soy, якщо мовець і ще хтось — somos. Ознака після зв’язки від цього вибору зовсім не залежить, змінюється лише сама зв’язка.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: soy remains for a single speaker, and somos appears as soon as "I" in the sentence becomes part of "we". ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' talks about the character of an entire group, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' about the agreement of several people at once, and both qualities stay exactly as they were with soy or es before: así and de acuerdo never change for gender or number. It is easy to tell the right form apart by the meaning of the phrase: if the speaker describes themselves alone — soy; if the speaker and someone else — somos. The quality after the linking word does not depend on this choice at all; only the linking word itself changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: soy continua para um único falante, e somos aparece assim que "eu" na frase vira parte de "nós". ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' fala do caráter de um grupo inteiro, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' da concordância de várias pessoas de uma vez, e as duas qualidades continuam exatamente como eram com soy ou es antes: así e de acuerdo nunca mudam em gênero nem número. É fácil distinguir a forma certa pelo sentido da frase: se quem fala descreve a si mesmo sozinho — soy; se quem fala e mais alguém — somos. A qualidade depois da ligação não depende nada dessa escolha; só a própria ligação muda.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức đơn giản: soy vẫn dùng cho một người nói duy nhất, và somos xuất hiện ngay khi "tôi" trong câu trở thành một phần của "chúng tôi". ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' nói về tính cách của cả một nhóm, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' nói về sự đồng ý của nhiều người cùng lúc, và cả hai đặc điểm vẫn giữ nguyên như khi dùng với soy hay es trước đó: así và de acuerdo không bao giờ đổi theo giống hay số. Dễ dàng phân biệt dạng đúng qua nghĩa của câu: nếu người nói mô tả một mình mình — soy; nếu người nói và người khác nữa — somos. Đặc điểm sau từ nối hoàn toàn không phụ thuộc vào lựa chọn này; chỉ có bản thân từ nối thay đổi.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: soy tetap untuk satu penutur, dan somos muncul segera setelah "saya" dalam kalimat menjadi bagian dari "kami". ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' berbicara tentang karakter seluruh kelompok, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' tentang persetujuan beberapa orang sekaligus, dan kedua sifat itu tetap persis seperti sebelumnya dengan soy atau es: así dan de acuerdo tidak pernah berubah untuk gender atau jumlah. Mudah membedakan bentuk yang tepat lewat makna frasanya: jika penutur menggambarkan dirinya sendiri — soy; jika penutur dan orang lain — somos. Sifat setelah kata penghubung sama sekali tidak bergantung pada pilihan ini; hanya kata penghubungnya sendiri yang berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: soy tek bir konuşan için kalır, ve somos cümledeki "ben" "biz"in bir parçası olur olmaz ortaya çıkar. ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' tüm bir grubun karakterinden bahseder, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' aynı anda birkaç kişinin onayından bahseder, ve her iki nitelik de daha önce soy ya da es’le olduğu gibi tam olarak aynı kalır: así ve de acuerdo cinsiyet ya da sayı için asla değişmez. Doğru biçimi ifadenin anlamından ayırt etmek kolaydır: konuşan kendini tek başına anlatıyorsa — soy; konuşan ve başka biri anlatılıyorsa — somos. Bağlaçtan sonraki nitelik bu seçime hiç bağlı değildir; yalnızca bağlacın kendisi değişir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: soy pozostaje dla jednego mówiącego, a somos pojawia się, gdy tylko „ja” w zdaniu staje się częścią „my”. ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' mówi o charakterze całej grupy, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' o zgodzie kilku osób naraz, a obie cechy pozostają dokładnie takie same, jak wcześniej z soy czy es: así i de acuerdo nigdy nie zmieniają się ani rodzajem, ani liczbą. Łatwo odróżnić właściwą formę po sensie frazy: jeśli mówiący opisuje tylko siebie — soy; jeśli mówiący i ktoś jeszcze — somos. Cecha po łączniku wcale nie zależy od tego wyboru; zmienia się tylko sam łącznik.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое слово встаёт вместо soy, когда говорящий уже не один?',
        uk: 'Яке слово стає замість soy, коли мовець уже не сам?',
        es: 'Which word takes the place of soy when the speaker is no longer alone?',
        'pt-BR': 'Qual palavra fica no lugar de soy quando quem fala já não está sozinho?',
        vi: 'Từ nào thay thế soy khi người nói không còn một mình?',
        id: 'Kata mana yang menggantikan soy ketika penutur tidak lagi sendirian?',
        tr: 'Konuşan artık yalnız değilken soy’un yerini hangi kelime alır?',
        pl: 'Jakie słowo zastępuje soy, gdy mówiący nie jest już sam?',
      }),
      choices: [
        L({ ru: 'Somos', uk: 'Somos', es: 'Somos', 'pt-BR': 'Somos', vi: 'Somos', id: 'Somos', tr: 'Somos', pl: 'Somos' }),
        L({ ru: 'De acuerdo', uk: 'De acuerdo', es: 'De acuerdo', 'pt-BR': 'De acuerdo', vi: 'De acuerdo', id: 'De acuerdo', tr: 'De acuerdo', pl: 'De acuerdo' }),
        L({ ru: 'Soy', uk: 'Soy', es: 'Soy', 'pt-BR': 'Soy', vi: 'Soy', id: 'Soy', tr: 'Soy', pl: 'Soy' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos появляется вместо soy, когда говорящий уже не один. De acuerdo остаётся неизменной в обеих фразах, потому что она не согласуется ни по роду, ни по числу.',
        uk: 'Somos з’являється замість soy, коли мовець уже не сам. De acuerdo лишається незмінною в обох фразах, бо вона не узгоджується ні за родом, ні за числом.',
        es: 'Somos appears instead of soy when the speaker is no longer alone. De acuerdo stays unchanged in both phrases because it agrees for neither gender nor number.',
        'pt-BR': 'Somos aparece no lugar de soy quando quem fala já não está sozinho. De acuerdo permanece inalterada nas duas frases porque não concorda nem em gênero nem em número.',
        vi: 'Somos xuất hiện thay cho soy khi người nói không còn một mình. De acuerdo không đổi trong cả hai câu vì nó không hòa hợp theo giống lẫn số.',
        id: 'Somos muncul menggantikan soy ketika penutur tidak lagi sendirian. De acuerdo tetap tidak berubah di kedua frasa karena tidak sesuai dengan gender maupun jumlah.',
        tr: 'Konuşan artık yalnız değilken soy yerine Somos ortaya çıkar. De acuerdo her iki ifadede de değişmeden kalır çünkü ne cinsiyete ne de sayıya uyum sağlar.',
        pl: 'Somos pojawia się zamiast soy, gdy mówiący nie jest już sam. De acuerdo pozostaje niezmienione w obu frazach, ponieważ nie zgadza się ani rodzajem, ani liczbą.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не soy и не son — только somos',
      uk: 'Не soy і не son — тільки somos',
      es: 'Not soy, not son — only somos',
      'pt-BR': 'Nem soy, nem son — só somos',
      vi: 'Không phải soy, không phải son — chỉ somos',
      id: 'Bukan soy, bukan son — hanya somos',
      tr: 'Ne soy ne de son — sadece somos',
      pl: 'Nie soy, nie son — tylko somos',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка — сказать ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ', рассказывая о согласии сразу нескольких людей, вместо ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy годится только для одного говорящего, а не для целой группы. Вторая ловушка — спутать somos с son: son значит «они», без говорящего в составе группы, а somos всегда включает самого говорящего среди тех, о ком идёт речь. Проверка простая: если внутри группы есть «я» — нужна somos, а если «я» там нет — это уже другая связка, не про говорящего. Запомнить легко через число: soy — один человек, somos — несколько людей, и среди них всегда сам говорящий.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка — сказати ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ', розповідаючи про згоду одразу кількох людей, замість ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy годиться тільки для одного мовця, а не для цілої групи. Друга пастка — сплутати somos із son: son означає «вони», без мовця в складі групи, а somos завжди включає самого мовця серед тих, про кого йдеться. Перевірка проста: якщо всередині групи є «я» — потрібна somos, а якщо «я» там немає — це вже інша зв’язка, не про мовця. Запам’ятати легко через число: soy — одна людина, somos — кілька людей, і серед них завжди сам мовець.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake is saying ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' while talking about the agreement of several people at once, instead of ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy only fits a single speaker, not an entire group. The second trap is confusing somos with son: son means "they", without the speaker inside the group, while somos always includes the speaker among those being talked about. The check is simple: if "I" is inside the group — somos is needed; if "I" is not there — that is a different linking word, not about the speaker. It is easy to remember through number: soy — one person, somos — several people, and the speaker is always among them.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum é dizer ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' ao falar da concordância de várias pessoas de uma vez, em vez de ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy só cabe para um único falante, não para um grupo inteiro. A segunda armadilha é confundir somos com son: son significa "eles", sem quem fala dentro do grupo, enquanto somos sempre inclui quem fala entre aqueles de quem se está falando. A checagem é simples: se "eu" está dentro do grupo — precisa de somos; se "eu" não está ali — essa é outra ligação, não sobre quem fala. É fácil lembrar pelo número: soy — uma pessoa, somos — várias pessoas, e quem fala está sempre entre elas.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất là nói ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' khi nói về sự đồng ý của nhiều người cùng lúc, thay vì ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy chỉ phù hợp với một người nói duy nhất, không phải cả một nhóm. Cái bẫy thứ hai là nhầm somos với son: son nghĩa là "họ", không có người nói trong nhóm, còn somos luôn bao gồm người nói trong số những người được nói tới. Cách kiểm tra đơn giản: nếu "tôi" ở trong nhóm — cần somos; nếu "tôi" không có ở đó — đó là một từ nối khác, không nói về người nói. Dễ nhớ qua số lượng: soy — một người, somos — nhiều người, và người nói luôn ở trong số đó.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan paling umum adalah mengatakan ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' saat membicarakan persetujuan beberapa orang sekaligus, alih-alih ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy hanya cocok untuk satu penutur, bukan seluruh kelompok. Jebakan kedua adalah mengacaukan somos dengan son: son berarti "mereka", tanpa penutur di dalam kelompok, sedangkan somos selalu mencakup penutur di antara orang-orang yang dibicarakan. Pengecekannya sederhana: jika "saya" ada di dalam kelompok — diperlukan somos; jika "saya" tidak ada di sana — itu kata penghubung lain, bukan tentang penutur. Mudah diingat lewat jumlah: soy — satu orang, somos — beberapa orang, dan penutur selalu ada di antara mereka.', semantic: 'explanation' }),
      tr: R({ text: 'En yaygın hata, aynı anda birkaç kişinin onayından bahsederken ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' demektir: soy yalnızca tek bir konuşan için uygundur, tüm bir grup için değil. İkinci tuzak, somos’u son ile karıştırmaktır: son "onlar" demektir, gruba konuşan dahil değildir, oysa somos her zaman hakkında konuşulanlar arasında konuşanı da içerir. Kontrol basittir: grubun içinde "ben" varsa — somos gerekir; "ben" orada yoksa — bu, konuşan hakkında olmayan başka bir bağlaçtır. Sayıyla hatırlamak kolaydır: soy — bir kişi, somos — birkaç kişi, ve konuşan her zaman onların arasındadır.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd to powiedzieć ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ', mówiąc o zgodzie kilku osób naraz, zamiast ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy pasuje tylko do jednego mówiącego, nie do całej grupy. Druga pułapka to mylenie somos z son: son znaczy „oni”, bez mówiącego w składzie grupy, podczas gdy somos zawsze obejmuje mówiącego wśród tych, o których mowa. Sprawdzenie jest proste: jeśli wewnątrz grupy jest „ja” — potrzebne jest somos; jeśli „ja” tam nie ma — to już inny łącznik, nie o mówiącym. Łatwo zapamiętać przez liczbę: soy — jedna osoba, somos — kilka osób, a mówiący jest wśród nich zawsze.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно сказать, что несколько человек, включая говорящего, согласны?',
        uk: 'Як правильно сказати, що кілька людей, включно з мовцем, згодні?',
        es: 'How do you correctly say that several people, including the speaker, agree?',
        'pt-BR': 'Como se diz corretamente que várias pessoas, incluindo quem fala, concordam?',
        vi: 'Nói đúng rằng nhiều người, kể cả người nói, đều đồng ý, như thế nào?',
        id: 'Bagaimana cara mengatakan dengan benar bahwa beberapa orang, termasuk penutur, setuju?',
        tr: 'Konuşan da dahil olmak üzere birkaç kişinin aynı fikirde olduğu doğru nasıl söylenir?',
        pl: 'Jak poprawnie powiedzieć, że kilka osób, w tym mówiący, się zgadza?',
      }),
      choices: [
        L({ ru: 'Somos de acuerdo', uk: 'Somos de acuerdo', es: 'Somos de acuerdo', 'pt-BR': 'Somos de acuerdo', vi: 'Somos de acuerdo', id: 'Somos de acuerdo', tr: 'Somos de acuerdo', pl: 'Somos de acuerdo' }),
        L({ ru: 'Soy de acuerdo', uk: 'Soy de acuerdo', es: 'Soy de acuerdo', 'pt-BR': 'Soy de acuerdo', vi: 'Soy de acuerdo', id: 'Soy de acuerdo', tr: 'Soy de acuerdo', pl: 'Soy de acuerdo' }),
        L({ ru: 'Son de acuerdo', uk: 'Son de acuerdo', es: 'Son de acuerdo', 'pt-BR': 'Son de acuerdo', vi: 'Son de acuerdo', id: 'Son de acuerdo', tr: 'Son de acuerdo', pl: 'Son de acuerdo' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos de acuerdo верно, потому что somos включает говорящего в группу согласных. Soy de acuerdo звучало бы только про одного человека, а Son de acuerdo — про «них» без говорящего внутри.',
        uk: 'Somos de acuerdo правильно, бо somos включає мовця в групу згодних. Soy de acuerdo звучало б тільки про одну людину, а Son de acuerdo — про «них» без мовця всередині.',
        es: 'Somos de acuerdo is correct because somos includes the speaker in the group that agrees. Soy de acuerdo would sound like it is about only one person, and Son de acuerdo would be about "them" without the speaker inside.',
        'pt-BR': 'Somos de acuerdo está correto porque somos inclui quem fala no grupo que concorda. Soy de acuerdo soaria como sobre uma única pessoa, e Son de acuerdo seria sobre "eles" sem quem fala dentro.',
        vi: 'Somos de acuerdo đúng vì somos bao gồm người nói trong nhóm đồng ý. Soy de acuerdo nghe như chỉ về một người, còn Son de acuerdo là về "họ" mà không có người nói ở trong.',
        id: 'Somos de acuerdo benar karena somos mencakup penutur dalam kelompok yang setuju. Soy de acuerdo akan terdengar seperti hanya tentang satu orang, dan Son de acuerdo tentang "mereka" tanpa penutur di dalamnya.',
        tr: 'Somos de acuerdo doğrudur çünkü somos, konuşanı aynı fikirde olan gruba dahil eder. Soy de acuerdo yalnızca bir kişi hakkındaymış gibi duyulurdu, Son de acuerdo ise içinde konuşan olmadan "onlar" hakkında olurdu.',
        pl: 'Somos de acuerdo jest poprawne, ponieważ somos obejmuje mówiącego w grupie zgadzających się. Soy de acuerdo brzmiałoby jak o jednej osobie, a Son de acuerdo o „nich” bez mówiącego w środku.',
      }),
    },
  },
];
