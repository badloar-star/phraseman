import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл переписан (владелец, 2026-08-28, тот же класс бага, что
// нашли и исправили в сессии 24 при её mode-native переписывании):
// исходный текст трёх страниц был 562-613 знаков и 4-6 предложений —
// сильно выше потолка intro_body_overloaded (learning_content_quality_gate_v1.ts,
// MAX_BODY_CHARS=320, MAX_BODY_SENTENCES=4). Смысл (soy → somos при
// переходе от одного говорящего к группе, así/de acuerdo как неизменяемые
// признаки, son как ловушка на связке) сохранён полностью — переписана
// только форма, чтобы уложиться в один экран.
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
  ru: 'Soy связывает признак с одним говорящим — только с ним самим. Somos делает то же самое, но когда говорящий уже не один: группа, включая его самого, говорит о себе вместе. Лицо не меняется — оба слова про «я» и тех, кто со мной. Меняется только число: soy для одного, somos для нескольких.',
  uk: 'Soy пов’язує ознаку з одним мовцем — тільки з ним самим. Somos робить те саме, але коли мовець уже не сам: група, включно з ним самим, говорить про себе разом. Особа не змінюється — обидва слова про «я» і тих, хто зі мною. Змінюється лише число: soy для одного, somos для кількох.',
  es: 'Soy links a quality to a single speaker — only to themselves. Somos does the same, but when the speaker is no longer alone: a group, including the speaker, talks about themselves together. Only the number changes — both stay about "I" and whoever is with me: soy for one, somos for several.',
  'pt-BR': 'Soy liga uma qualidade a um único falante — só a si mesmo. Somos faz o mesmo, mas quando quem fala já não está sozinho: um grupo, incluindo quem fala, fala de si mesmo junto. A pessoa não muda — as duas palavras são sobre "eu" e quem está comigo. Só o número muda: soy para um, somos para vários.',
  vi: 'Soy nối một đặc điểm với một người nói duy nhất — chỉ với chính họ. Somos làm điều tương tự, nhưng khi người nói không còn một mình: một nhóm, kể cả người nói, cùng nói về bản thân họ. Ngôi không đổi — cả hai từ đều nói về "tôi" và những ai ở cùng tôi. Chỉ số lượng thay đổi: soy cho một người, somos cho nhiều người.',
  id: 'Soy menghubungkan sifat dengan satu penutur — hanya dirinya sendiri. Somos melakukan hal yang sama, tetapi saat penutur tidak lagi sendirian: sekelompok orang, termasuk penutur, berbicara tentang diri mereka bersama. Hanya jumlahnya yang berubah: soy untuk satu, somos untuk beberapa.',
  tr: 'Soy bir niteliği tek bir konuşanla bağlar — yalnızca kendisiyle. Somos de aynısını yapar, ama konuşan artık yalnız değilken: konuşanı da içeren bir grup kendisinden birlikte bahseder. Kişi değişmez — her iki kelime de "ben" ve benimle olanlar hakkındadır. Yalnızca sayı değişir: biri için soy, birkaçı için somos.',
  pl: 'Soy łączy cechę z jednym mówiącym — tylko z nim samym. Somos robi to samo, ale gdy mówiący nie jest już sam: grupa, w tym on sam, mówi o sobie razem. Osoba się nie zmienia — oba słowa dotyczą „ja” i tych, którzy są ze mną. Zmienia się tylko liczba: soy dla jednej osoby, somos dla kilku.',
});

const FORMULA_BODY = L({
  ru: 'Soy остаётся для одного говорящего, а somos появляется, как только «я» становится частью «мы». Somos así — про характер целой группы, somos de acuerdo — про согласие нескольких людей. Así и de acuerdo не меняются ни разу — меняется только сама связка.',
  uk: 'Soy лишається для одного мовця, а somos з’являється, щойно «я» стає частиною «ми». Somos así — про характер цілої групи, somos de acuerdo — про згоду кількох людей. Así та de acuerdo не змінюються жодного разу — змінюється лише сама зв’язка.',
  es: 'Soy remains for a single speaker, and somos appears as soon as "I" becomes part of "we". Somos así is about the character of a whole group, somos de acuerdo about several people agreeing. Así and de acuerdo never change — only the linking word itself changes.',
  'pt-BR': 'Soy continua para um único falante, e somos aparece assim que "eu" vira parte de "nós". Somos así fala do caráter de um grupo inteiro, somos de acuerdo da concordância de várias pessoas. Así e de acuerdo nunca mudam — só a própria ligação muda.',
  vi: 'Soy vẫn dùng cho một người nói, và somos xuất hiện ngay khi "tôi" trở thành một phần của "chúng tôi". Somos así nói về tính cách cả nhóm, somos de acuerdo nói về sự đồng ý của nhiều người. Así và de acuerdo không bao giờ đổi — chỉ từ nối thay đổi.',
  id: 'Soy tetap untuk satu penutur, dan somos muncul begitu "saya" menjadi bagian dari "kami". Somos así tentang karakter seluruh kelompok, somos de acuerdo tentang persetujuan beberapa orang. Así dan de acuerdo tidak pernah berubah — hanya kata penghubungnya yang berubah.',
  tr: 'Soy tek bir konuşan için kalır, somos ise "ben" "biz"in bir parçası olur olmaz ortaya çıkar. Somos así tüm grubun karakterinden, somos de acuerdo birkaç kişinin onayından bahseder. Así ve de acuerdo hiç değişmez — yalnızca bağlacın kendisi değişir.',
  pl: 'Soy pozostaje dla jednego mówiącego, a somos pojawia się, gdy „ja” staje się częścią „my”. Somos así dotyczy charakteru całej grupy, somos de acuerdo zgody kilku osób. Así i de acuerdo nigdy się nie zmieniają — zmienia się tylko sam łącznik.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — сказать Soy de acuerdo про согласие нескольких людей вместо Somos de acuerdo: soy годится только для одного. Вторая ловушка — спутать somos с son: son значит «они», без говорящего внутри группы, а somos всегда включает самого говорящего.',
  uk: 'Часта помилка — сказати Soy de acuerdo про згоду кількох людей замість Somos de acuerdo: soy годиться тільки для одного. Друга пастка — сплутати somos із son: son означає «вони», без мовця всередині групи, а somos завжди включає самого мовця.',
  es: 'A common mistake is saying Soy de acuerdo about several people agreeing instead of Somos de acuerdo: soy only fits one person. The second trap is confusing somos with son: son means "they", without the speaker inside the group, while somos always includes the speaker.',
  'pt-BR': 'Um erro comum é dizer Soy de acuerdo sobre a concordância de várias pessoas em vez de Somos de acuerdo: soy só cabe para uma pessoa. A segunda armadilha é confundir somos com son: son significa "eles", sem quem fala dentro do grupo, e somos sempre inclui quem fala.',
  vi: 'Lỗi thường gặp là nói Soy de acuerdo về sự đồng ý của nhiều người thay vì Somos de acuerdo: soy chỉ hợp với một người. Bẫy thứ hai là nhầm somos với son: son nghĩa là "họ", không có người nói trong nhóm, còn somos luôn bao gồm người nói.',
  id: 'Kesalahan umum adalah mengatakan Soy de acuerdo tentang persetujuan beberapa orang, bukan Somos de acuerdo: soy hanya cocok untuk satu orang. Jebakan kedua adalah mengacaukan somos dengan son: son berarti "mereka" tanpa penutur di dalam kelompok, sedangkan somos selalu mencakup penutur.',
  tr: 'Yaygın bir hata, birkaç kişinin onayı için Somos de acuerdo yerine Soy de acuerdo demektir: soy yalnızca bir kişiye uyar. İkinci tuzak, somos’u son ile karıştırmaktır: son grup içinde konuşan olmadan "onlar" demektir, somos ise her zaman konuşanı içerir.',
  pl: 'Częsty błąd to powiedzieć Soy de acuerdo o zgodzie kilku osób zamiast Somos de acuerdo: soy pasuje tylko do jednej osoby. Druga pułapka to mylenie somos z son: son znaczy „oni” bez mówiącego w grupie, a somos zawsze obejmuje mówiącego.',
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
      ru: R({ text: 'Soy связывает признак с одним говорящим — только с ним самим. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' делает то же самое, но когда говорящий уже не один: группа, включая его самого, говорит о себе вместе. Лицо не меняется — оба слова про «я» и тех, кто со мной. Меняется только число: soy для одного, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' для нескольких.', semantic: 'explanation' }),
      uk: R({ text: 'Soy пов’язує ознаку з одним мовцем — тільки з ним самим. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' робить те саме, але коли мовець уже не сам: група, включно з ним самим, говорить про себе разом. Особа не змінюється — обидва слова про «я» і тих, хто зі мною. Змінюється лише число: soy для одного, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' для кількох.', semantic: 'explanation' }),
      es: R({ text: 'Soy links a quality to a single speaker — only to themselves. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' does the same, but when the speaker is no longer alone: a group, including the speaker, talks about themselves together. Only the number changes — both stay about "I" and whoever is with me: soy for one, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' for several.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Soy liga uma qualidade a um único falante — só a si mesmo. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' faz o mesmo, mas quando quem fala já não está sozinho: um grupo, incluindo quem fala, fala de si mesmo junto. A pessoa não muda — as duas palavras são sobre "eu" e quem está comigo. Só o número muda: soy para um, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' para vários.', semantic: 'explanation' }),
      vi: R({ text: 'Soy nối một đặc điểm với một người nói duy nhất — chỉ với chính họ. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' làm điều tương tự, nhưng khi người nói không còn một mình: một nhóm, kể cả người nói, cùng nói về bản thân họ. Ngôi không đổi — cả hai từ đều nói về "tôi" và những ai ở cùng tôi. Chỉ số lượng thay đổi: soy cho một người, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' cho nhiều người.', semantic: 'explanation' }),
      id: R({ text: 'Soy menghubungkan sifat dengan satu penutur — hanya dirinya sendiri. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' melakukan hal yang sama, tetapi saat penutur tidak lagi sendirian: sekelompok orang, termasuk penutur, berbicara tentang diri mereka bersama. Hanya jumlahnya yang berubah: soy untuk satu, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' untuk beberapa.', semantic: 'explanation' }),
      tr: R({ text: 'Soy bir niteliği tek bir konuşanla bağlar — yalnızca kendisiyle. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' de aynısını yapar, ama konuşan artık yalnız değilken: konuşanı da içeren bir grup kendisinden birlikte bahseder. Kişi değişmez — her iki kelime de "ben" ve benimle olanlar hakkındadır. Yalnızca sayı değişir: biri için soy, birkaçı için ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      pl: R({ text: 'Soy łączy cechę z jednym mówiącym — tylko z nim samym. ', semantic: 'explanation' }, { text: 'Somos', semantic: 'targetCorrect' }, { text: ' robi to samo, ale gdy mówiący nie jest już sam: grupa, w tym on sam, mówi o sobie razem. Osoba się nie zmienia — oba słowa dotyczą „ja” i tych, którzy są ze mną. Zmienia się tylko liczba: soy dla jednej osoby, ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' dla kilku.', semantic: 'explanation' }),
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
      ru: R({ text: 'Soy остаётся для одного говорящего, а somos появляется, как только «я» становится частью «мы». ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' — про характер целой группы, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' — про согласие нескольких людей. Así и de acuerdo не меняются ни разу — меняется только сама связка.', semantic: 'explanation' }),
      uk: R({ text: 'Soy лишається для одного мовця, а somos з’являється, щойно «я» стає частиною «ми». ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' — про характер цілої групи, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' — про згоду кількох людей. Así та de acuerdo не змінюються жодного разу — змінюється лише сама зв’язка.', semantic: 'explanation' }),
      es: R({ text: 'Soy remains for a single speaker, and somos appears as soon as "I" becomes part of "we". ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' is about the character of a whole group, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' about several people agreeing. Así and de acuerdo never change — only the linking word itself changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Soy continua para um único falante, e somos aparece assim que "eu" vira parte de "nós". ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' fala do caráter de um grupo inteiro, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' da concordância de várias pessoas. Así e de acuerdo nunca mudam — só a própria ligação muda.', semantic: 'explanation' }),
      vi: R({ text: 'Soy vẫn dùng cho một người nói, và somos xuất hiện ngay khi "tôi" trở thành một phần của "chúng tôi". ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' nói về tính cách cả nhóm, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' nói về sự đồng ý của nhiều người. Así và de acuerdo không bao giờ đổi — chỉ từ nối thay đổi.', semantic: 'explanation' }),
      id: R({ text: 'Soy tetap untuk satu penutur, dan somos muncul begitu "saya" menjadi bagian dari "kami". ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' tentang karakter seluruh kelompok, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' tentang persetujuan beberapa orang. Así dan de acuerdo tidak pernah berubah — hanya kata penghubungnya yang berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Soy tek bir konuşan için kalır, somos ise "ben" "biz"in bir parçası olur olmaz ortaya çıkar. ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' tüm grubun karakterinden, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' birkaç kişinin onayından bahseder. Así ve de acuerdo hiç değişmez — yalnızca bağlacın kendisi değişir.', semantic: 'explanation' }),
      pl: R({ text: 'Soy pozostaje dla jednego mówiącego, a somos pojawia się, gdy „ja” staje się częścią „my”. ', semantic: 'explanation' }, { text: 'Somos así', semantic: 'targetCorrect' }, { text: ' dotyczy charakteru całej grupy, ', semantic: 'explanation' }, { text: 'somos de acuerdo', semantic: 'targetCorrect' }, { text: ' zgody kilku osób. Así i de acuerdo nigdy się nie zmieniają — zmienia się tylko sam łącznik.', semantic: 'explanation' }),
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
      ru: R({ text: 'Частая ошибка — сказать ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' про согласие нескольких людей вместо ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy годится только для одного. Вторая ловушка — спутать somos с son: son значит «они», без говорящего внутри группы, а somos всегда включает самого говорящего.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — сказати ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' про згоду кількох людей замість ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy годиться тільки для одного. Друга пастка — сплутати somos із son: son означає «вони», без мовця всередині групи, а somos завжди включає самого мовця.', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is saying ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' about several people agreeing instead of ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy only fits one person. The second trap is confusing somos with son: son means "they", without the speaker inside the group, while somos always includes the speaker.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é dizer ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' sobre a concordância de várias pessoas em vez de ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy só cabe para uma pessoa. A segunda armadilha é confundir somos com son: son significa "eles", sem quem fala dentro do grupo, e somos sempre inclui quem fala.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp là nói ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' về sự đồng ý của nhiều người thay vì ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy chỉ hợp với một người. Bẫy thứ hai là nhầm somos với son: son nghĩa là "họ", không có người nói trong nhóm, còn somos luôn bao gồm người nói.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah mengatakan ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' tentang persetujuan beberapa orang, bukan ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy hanya cocok untuk satu orang. Jebakan kedua adalah mengacaukan somos dengan son: son berarti "mereka" tanpa penutur di dalam kelompok, sedangkan somos selalu mencakup penutur.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın bir hata, birkaç kişinin onayı için ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' demektir: soy yalnızca bir kişiye uyar. İkinci tuzak, somos’u son ile karıştırmaktır: son grup içinde konuşan olmadan "onlar" demektir, somos ise her zaman konuşanı içerir.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd to powiedzieć ', semantic: 'explanation' }, { text: 'Soy de acuerdo', semantic: 'targetWrong' }, { text: ' o zgodzie kilku osób zamiast ', semantic: 'explanation' }, { text: 'Somos de acuerdo', semantic: 'targetCorrect' }, { text: ': soy pasuje tylko do jednej osoby. Druga pułapka to mylenie somos z son: son znaczy „oni” bez mówiącego w grupie, a somos zawsze obejmuje mówiącego.', semantic: 'explanation' }),
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
