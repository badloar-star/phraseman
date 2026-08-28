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
  ru: 'Es связывает признак с одним предметом или человеком — не с говорящим и не с собеседником. Son делает то же самое, но для нескольких: группа, ни один из которых не говорящий. Лицо не меняется — оба слова про «он, она». Меняется только число: es для одного, son для нескольких.',
  uk: 'Es пов’язує ознаку з одним предметом чи людиною — не з мовцем і не зі співрозмовником. Son робить те саме, але для кількох: група, жоден із яких не мовець. Особа не змінюється — обидва слова про «він, вона». Змінюється лише число: es для одного, son для кількох.',
  es: 'Es links a quality to one thing or person — not the speaker, not the listener. Son does the same, but for several: a group, none of them the speaker. The person does not change — both words are about "he, she". Only the number changes: es for one, son for several.',
  'pt-BR': 'Es liga uma qualidade a uma coisa ou pessoa — nem quem fala, nem o interlocutor. Son faz o mesmo, mas para vários: um grupo, nenhum deles quem fala. A pessoa não muda — as duas palavras são sobre "ele, ela". Só o número muda: es para um, son para vários.',
  vi: 'Es nối một đặc điểm với một vật hay người — không phải người nói, không phải người nghe. Son làm điều tương tự, nhưng cho nhiều: một nhóm, không ai là người nói. Ngôi không đổi — cả hai từ nói về "anh ấy, cô ấy". Chỉ số lượng thay đổi: es cho một, son cho nhiều.',
  id: 'Es menghubungkan sifat dengan satu benda atau orang — bukan penutur, bukan pendengar. Son melakukan hal yang sama, tetapi untuk beberapa: sekelompok, tak satu pun penutur. Orangnya tidak berubah — kedua kata tentang "dia". Hanya jumlahnya yang berubah: es untuk satu, son untuk beberapa.',
  tr: 'Es bir niteliği tek bir şeyle ya da kişiyle bağlar — konuşan ya da dinleyici değil. Son de aynısını yapar, ama birkaçı için: hiçbiri konuşan olmayan bir grup. Kişi değişmez — her iki kelime de "o" hakkındadır. Yalnızca sayı değişir: biri için es, birkaçı için son.',
  pl: 'Es łączy cechę z jedną rzeczą lub osobą — nie mówiącym i nie słuchaczem. Son robi to samo, ale dla kilku: grupa, z których żadna nie jest mówiącym. Osoba się nie zmienia — oba słowa dotyczą „on, ona”. Zmienia się tylko liczba: es dla jednej, son dla kilku.',
});

const FORMULA_BODY = L({
  ru: 'Es остаётся для одного, а son появляется, когда речь о нескольких без говорящего среди них. Son así — про характер группы со стороны, son de acuerdo — про согласие нескольких людей. Así и de acuerdo не меняются ни разу — меняется только связка.',
  uk: 'Es лишається для одного, а son з’являється, коли йдеться про кількох без мовця серед них. Son así — про характер групи збоку, son de acuerdo — про згоду кількох людей. Así та de acuerdo не змінюються жодного разу — змінюється лише зв’язка.',
  es: 'Es remains for one, and son appears when talking about several without the speaker among them. Son así is about the character of a group from the outside, son de acuerdo about several people agreeing. Así and de acuerdo never change — only the linking word changes.',
  'pt-BR': 'Es continua para um, e son aparece ao falar de vários sem quem fala entre eles. Son así fala do caráter de um grupo de fora, son de acuerdo da concordância de várias pessoas. Así e de acuerdo nunca mudam — só a própria ligação muda.',
  vi: 'Es vẫn dùng cho một, và son xuất hiện khi nói về nhiều mà không có người nói trong đó. Son así nói về tính cách của nhóm từ bên ngoài, son de acuerdo nói về sự đồng ý của nhiều người. Así và de acuerdo không bao giờ đổi — chỉ từ nối thay đổi.',
  id: 'Es tetap untuk satu, dan son muncul saat membicarakan beberapa tanpa penutur di antaranya. Son así tentang karakter kelompok dari luar, son de acuerdo tentang persetujuan beberapa orang. Así dan de acuerdo tidak pernah berubah — hanya kata penghubungnya yang berubah.',
  tr: 'Es tek biri için kalır, son ise içlerinde konuşan olmadan birkaçından bahsederken ortaya çıkar. Son así dışarıdan bir grubun karakterinden, son de acuerdo birkaç kişinin onayından bahseder. Así ve de acuerdo hiç değişmez — yalnızca bağlacın kendisi değişir.',
  pl: 'Es pozostaje dla jednej osoby, a son pojawia się, gdy mowa o kilku bez mówiącego wśród nich. Son así dotyczy charakteru grupy z zewnątrz, son de acuerdo zgody kilku osób. Así i de acuerdo nigdy się nie zmieniają — zmienia się tylko sam łącznik.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — сказать Es de acuerdo про согласие нескольких людей вместо Son de acuerdo: es годится только для одного. Вторая ловушка — спутать son с somos: somos включает говорящего, а son — никогда, это всегда «они» со стороны.',
  uk: 'Часта помилка — сказати Es de acuerdo про згоду кількох людей замість Son de acuerdo: es годиться тільки для одного. Друга пастка — сплутати son із somos: somos включає мовця, а son — ніколи, це завжди «вони» збоку.',
  es: 'A common mistake is saying Es de acuerdo about several people agreeing instead of Son de acuerdo: es only fits one. The second trap is confusing son with somos: somos includes the speaker, while son never does — it is always "them" from the outside.',
  'pt-BR': 'Um erro comum é dizer Es de acuerdo sobre a concordância de várias pessoas em vez de Son de acuerdo: es só cabe para uma. A segunda armadilha é confundir son com somos: somos inclui quem fala, e son nunca inclui — é sempre "eles" de fora.',
  vi: 'Lỗi thường gặp là nói Es de acuerdo về sự đồng ý của nhiều người thay vì Son de acuerdo: es chỉ hợp với một. Bẫy thứ hai là nhầm son với somos: somos bao gồm người nói, còn son thì không bao giờ — đó luôn là "họ" từ bên ngoài.',
  id: 'Kesalahan umum adalah mengatakan Es de acuerdo tentang persetujuan beberapa orang, bukan Son de acuerdo: es hanya cocok untuk satu. Jebakan kedua adalah mengacaukan son dengan somos: somos mencakup penutur, sedangkan son tidak pernah — itu selalu "mereka" dari luar.',
  tr: 'Yaygın bir hata, birkaç kişinin onayı için Son de acuerdo yerine Es de acuerdo demektir: es yalnızca biri için uygundur. İkinci tuzak, son’u somos ile karıştırmaktır: somos konuşanı içerir, son ise asla içermez — bu her zaman dışarıdan "onlar"dır.',
  pl: 'Częsty błąd to powiedzieć Es de acuerdo o zgodzie kilku osób zamiast Son de acuerdo: es pasuje tylko do jednej osoby. Druga pułapka to mylenie son z somos: somos obejmuje mówiącego, a son — nigdy, to zawsze „oni” z zewnątrz.',
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
      ru: R({ text: 'Es связывает признак с одним предметом или человеком — не с говорящим и не с собеседником. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' делает то же самое, но для нескольких: группа, ни один из которых не говорящий. Лицо не меняется — оба слова про «он, она». Меняется только число: es для одного, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' для нескольких.', semantic: 'explanation' }),
      uk: R({ text: 'Es пов’язує ознаку з одним предметом чи людиною — не з мовцем і не зі співрозмовником. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' робить те саме, але для кількох: група, жоден із яких не мовець. Особа не змінюється — обидва слова про «він, вона». Змінюється лише число: es для одного, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' для кількох.', semantic: 'explanation' }),
      es: R({ text: 'Es links a quality to one thing or person — not the speaker, not the listener. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' does the same, but for several: a group, none of them the speaker. The person does not change — both words are about "he, she". Only the number changes: es for one, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' for several.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Es liga uma qualidade a uma coisa ou pessoa — nem quem fala, nem o interlocutor. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' faz o mesmo, mas para vários: um grupo, nenhum deles quem fala. A pessoa não muda — as duas palavras são sobre "ele, ela". Só o número muda: es para um, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' para vários.', semantic: 'explanation' }),
      vi: R({ text: 'Es nối một đặc điểm với một vật hay người — không phải người nói, không phải người nghe. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' làm điều tương tự, nhưng cho nhiều: một nhóm, không ai là người nói. Ngôi không đổi — cả hai từ nói về "anh ấy, cô ấy". Chỉ số lượng thay đổi: es cho một, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' cho nhiều.', semantic: 'explanation' }),
      id: R({ text: 'Es menghubungkan sifat dengan satu benda atau orang — bukan penutur, bukan pendengar. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' melakukan hal yang sama, tetapi untuk beberapa: sekelompok, tak satu pun penutur. Orangnya tidak berubah — kedua kata tentang "dia". Hanya jumlahnya yang berubah: es untuk satu, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' untuk beberapa.', semantic: 'explanation' }),
      tr: R({ text: 'Es bir niteliği tek bir şeyle ya da kişiyle bağlar — konuşan ya da dinleyici değil. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' de aynısını yapar, ama birkaçı için: hiçbiri konuşan olmayan bir grup. Kişi değişmez — her iki kelime de "o" hakkındadır. Yalnızca sayı değişir: biri için es, birkaçı için ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      pl: R({ text: 'Es łączy cechę z jedną rzeczą lub osobą — nie mówiącym i nie słuchaczem. ', semantic: 'explanation' }, { text: 'Son', semantic: 'targetCorrect' }, { text: ' robi to samo, ale dla kilku: grupa, z których żadna nie jest mówiącym. Osoba się nie zmienia — oba słowa dotyczą „on, ona”. Zmienia się tylko liczba: es dla jednej, ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: ' dla kilku.', semantic: 'explanation' }),
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
      ru: R({ text: 'Es остаётся для одного, а son появляется, когда речь о нескольких без говорящего среди них. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' — про характер группы со стороны, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' — про согласие нескольких людей. Así и de acuerdo не меняются ни разу — меняется только связка.', semantic: 'explanation' }),
      uk: R({ text: 'Es лишається для одного, а son з’являється, коли йдеться про кількох без мовця серед них. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' — про характер групи збоку, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' — про згоду кількох людей. Así та de acuerdo не змінюються жодного разу — змінюється лише зв’язка.', semantic: 'explanation' }),
      es: R({ text: 'Es remains for one, and son appears when talking about several without the speaker among them. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' is about the character of a group from the outside, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' about several people agreeing. Así and de acuerdo never change — only the linking word changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Es continua para um, e son aparece ao falar de vários sem quem fala entre eles. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' fala do caráter de um grupo de fora, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' da concordância de várias pessoas. Así e de acuerdo nunca mudam — só a própria ligação muda.', semantic: 'explanation' }),
      vi: R({ text: 'Es vẫn dùng cho một, và son xuất hiện khi nói về nhiều mà không có người nói trong đó. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' nói về tính cách của nhóm từ bên ngoài, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' nói về sự đồng ý của nhiều người. Así và de acuerdo không bao giờ đổi — chỉ từ nối thay đổi.', semantic: 'explanation' }),
      id: R({ text: 'Es tetap untuk satu, dan son muncul saat membicarakan beberapa tanpa penutur di antaranya. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' tentang karakter kelompok dari luar, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' tentang persetujuan beberapa orang. Así dan de acuerdo tidak pernah berubah — hanya kata penghubungnya yang berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Es tek biri için kalır, son ise içlerinde konuşan olmadan birkaçından bahsederken ortaya çıkar. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' dışarıdan bir grubun karakterinden, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' birkaç kişinin onayından bahseder. Así ve de acuerdo hiç değişmez — yalnızca bağlacın kendisi değişir.', semantic: 'explanation' }),
      pl: R({ text: 'Es pozostaje dla jednej osoby, a son pojawia się, gdy mowa o kilku bez mówiącego wśród nich. ', semantic: 'explanation' }, { text: 'Son así', semantic: 'targetCorrect' }, { text: ' dotyczy charakteru grupy z zewnątrz, ', semantic: 'explanation' }, { text: 'son de acuerdo', semantic: 'targetCorrect' }, { text: ' zgody kilku osób. Así i de acuerdo nigdy się nie zmieniają — zmienia się tylko sam łącznik.', semantic: 'explanation' }),
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
      ru: R({ text: 'Частая ошибка — сказать ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' про согласие нескольких людей вместо ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es годится только для одного. Вторая ловушка — спутать son с somos: somos включает говорящего, а son — никогда, это всегда «они» со стороны.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — сказати ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' про згоду кількох людей замість ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es годиться тільки для одного. Друга пастка — сплутати son із somos: somos включає мовця, а son — ніколи, це завжди «вони» збоку.', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is saying ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' about several people agreeing instead of ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es only fits one. The second trap is confusing son with somos: somos includes the speaker, while son never does — it is always "them" from the outside.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é dizer ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' sobre a concordância de várias pessoas em vez de ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es só cabe para uma. A segunda armadilha é confundir son com somos: somos inclui quem fala, e son nunca inclui — é sempre "eles" de fora.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp là nói ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' về sự đồng ý của nhiều người thay vì ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es chỉ hợp với một. Bẫy thứ hai là nhầm son với somos: somos bao gồm người nói, còn son thì không bao giờ — đó luôn là "họ" từ bên ngoài.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah mengatakan ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' tentang persetujuan beberapa orang, bukan ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es hanya cocok untuk satu. Jebakan kedua adalah mengacaukan son dengan somos: somos mencakup penutur, sedangkan son tidak pernah — itu selalu "mereka" dari luar.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın bir hata, birkaç kişinin onayı için ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' demektir: es yalnızca biri için uygundur. İkinci tuzak, son’u somos ile karıştırmaktır: somos konuşanı içerir, son ise asla içermez — bu her zaman dışarıdan "onlar"dır.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd to powiedzieć ', semantic: 'explanation' }, { text: 'Es de acuerdo', semantic: 'targetWrong' }, { text: ' o zgodzie kilku osób zamiast ', semantic: 'explanation' }, { text: 'Son de acuerdo', semantic: 'targetCorrect' }, { text: ': es pasuje tylko do jednej osoby. Druga pułapka to mylenie son z somos: somos obejmuje mówiącego, a son — nigdy, to zawsze „oni” z zewnątrz.', semantic: 'explanation' }),
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
