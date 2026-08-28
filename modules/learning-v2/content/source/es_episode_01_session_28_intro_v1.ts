import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 28 "Вдвоём: somos dos" / number_with_ser, builtOn: [9, 27],
// recalls: [9, 27]): три страницы concept/formula/trap вводят числительное
// сразу после связки ser как способ назвать точный размер группы. Somos
// (сессия 25) и son (сессия 27) уже закреплены за первым и третьим лицом
// множественного числа; здесь к ним добавляется число — dos, tres — которое
// встаёт сразу после связки и не меняется никогда, как así или de acuerdo
// раньше. Eres (сессия 9) остаётся в игре только как одиночный собеседник,
// с которым число не сочетается вовсе — это и есть главная ловушка сессии.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_28_TITLE = L({
  ru: 'Вдвоём: somos dos',
  uk: 'Удвох: somos dos',
  es: 'Together: somos dos',
  'pt-BR': 'A dois: somos dos',
  vi: 'Cùng nhau: somos dos',
  id: 'Berdua: somos dos',
  tr: 'İkimiz: somos dos',
  pl: 'We dwoje: somos dos',
});

export const ES_EPISODE_01_SESSION_28_SUMMARY = L({
  ru: 'Число встаёт сразу после уже знакомой связки и просто называет, сколько человек в группе — ни связка, ни число от этого не меняются.',
  uk: 'Число стає одразу після вже знайомої зв’язки і просто називає, скільки людей у групі — ні зв’язка, ні число від цього не змінюються.',
  es: 'A number goes right after the already familiar linking word and simply states how many people are in the group — neither the linking word nor the number changes because of this.',
  'pt-BR': 'Um número vem logo após a ligação já conhecida e simplesmente diz quantas pessoas há no grupo — nem a ligação nem o número mudam por causa disso.',
  vi: 'Một con số đứng ngay sau từ nối đã quen thuộc và chỉ đơn giản nói ra có bao nhiêu người trong nhóm — cả từ nối lẫn con số đều không đổi vì điều này.',
  id: 'Sebuah angka muncul tepat setelah kata penghubung yang sudah dikenal dan hanya menyatakan berapa banyak orang dalam kelompok — baik kata penghubung maupun angkanya tidak berubah karena ini.',
  tr: 'Bir sayı, zaten tanıdık olan bağlaçtan hemen sonra gelir ve grupta kaç kişi olduğunu basitçe söyler — ne bağlaç ne de sayı bundan dolayı değişir.',
  pl: 'Liczba pojawia się zaraz po już znanym łączniku i po prostu podaje, ile osób jest w grupie — ani łącznik, ani liczba się przez to nie zmieniają.',
});

export const ES_EPISODE_01_SESSION_28_GOAL = L({
  ru: 'Узнать на слух, понять и точно построить связку ser с числительным, называя размер своей группы через somos и чужой через son.',
  uk: 'Упізнати на слух, зрозуміти й точно побудувати зв’язку ser із числівником, називаючи розмір своєї групи через somos і чужої через son.',
  es: 'Recognize, understand, and correctly build the linking word ser with a number, stating the size of your own group with somos and another group with son.',
  'pt-BR': 'Reconhecer de ouvido, entender e construir corretamente a ligação ser com um numeral, dizendo o tamanho do próprio grupo com somos e de outro grupo com son.',
  vi: 'Nghe ra, hiểu và xây dựng đúng từ nối ser cùng số đếm, nói ra quy mô nhóm của mình bằng somos và nhóm khác bằng son.',
  id: 'Mengenali dari suara, memahami, dan membangun dengan tepat kata penghubung ser dengan angka, menyatakan ukuran kelompok sendiri dengan somos dan kelompok lain dengan son.',
  tr: 'Ser bağlacını bir sayıyla duyup tanımak, anlamak ve doğru kurmak; kendi grubunun büyüklüğünü somos ile, başka bir grubunkini son ile söylemek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zbudować łącznik ser z liczebnikiem, podając rozmiar własnej grupy przez somos i innej przez son.',
});

const CONCEPT_BODY = L({
  ru: 'Somos и son уже знакомы: somos — про группу с говорящим, son — про группу без него. Число встаёт сразу после любой из этих связок: Somos dos — нас двое, Son tres — их трое. С eres так не работает: собеседник один, а один человек не может быть «два». Числа встают только после somos и son.',
  uk: 'Somos і son уже знайомі: somos — про групу з мовцем, son — про групу без нього. Число стає одразу після будь-якої з цих зв’язок: Somos dos — нас двоє, Son tres — їх троє. З eres так не працює: співрозмовник один, а одна людина не може бути «два». Числа стають лише після somos і son.',
  es: 'Somos and son are already familiar: somos is about a group with the speaker, son about a group without them. A number goes right after either: Somos dos, Son tres. This does not work with eres: the listener is one person, and one person cannot be "two". Numbers go only after somos and son.',
  'pt-BR': 'Somos e son já são conhecidas: somos é sobre um grupo com quem fala, son sobre um grupo sem ele. Um número vem logo após qualquer uma: Somos dos — somos dois, Son tres — são três. Isso não funciona com eres: o interlocutor é uma só pessoa, e uma pessoa não pode ser "dois". Números vêm só depois de somos e son.',
  vi: 'Somos và son đã quen thuộc: somos nói về nhóm có người nói, son nói về nhóm không có người nói. Một con số đứng ngay sau: Somos dos — chúng tôi có hai người, Son tres — họ có ba người. Điều này không dùng được với eres: người nghe chỉ có một, không thể là "hai". Số chỉ đứng sau somos và son.',
  id: 'Somos dan son sudah dikenal: somos tentang kelompok dengan penutur, son tentang kelompok tanpa penutur. Angka muncul tepat setelahnya: Somos dos — kami berdua, Son tres — mereka bertiga. Ini tidak berlaku untuk eres: pendengar hanya satu orang, tidak bisa menjadi "dua". Angka hanya muncul setelah somos dan son.',
  tr: 'Somos ve son zaten tanıdıktır: somos konuşanı içeren bir grup, son ise içermeyen bir grup hakkındadır. Bir sayı hemen ardından gelir: Somos dos — ikimiziz, Son tres — onlar üç kişi. Bu eres ile çalışmaz: dinleyici tek kişidir, "iki" olamaz. Sayılar yalnızca somos ve son’dan sonra gelir.',
  pl: 'Somos i son są już znane: somos dotyczy grupy z mówiącym, son grupy bez niego. Liczba pojawia się zaraz po: Somos dos — jest nas dwoje, Son tres — jest ich troje. Z eres to nie działa: słuchacz to jedna osoba, a jedna osoba nie może być „dwa”. Liczby pojawiają się tylko po somos i son.',
});

const FORMULA_BODY = L({
  ru: 'Связка (somos для своей группы, son для чужой) плюс число сразу за ней. Somos dos — своя группа в два человека, Son tres — чужая в три, и число не меняется никогда. No встаёт перед связкой: No somos dos отрицает своё число, No son tres — чужое.',
  uk: 'Зв’язка (somos для своєї групи, son для чужої) плюс число одразу за нею. Somos dos — своя група у дві людини, Son tres — чужа у три, і число не змінюється ніколи. No стає перед зв’язкою: No somos dos заперечує своє число, No son tres — чуже.',
  es: 'Linking word (somos for your own group, son for another) plus a number right after it. Somos dos — your own group of two, Son tres — another group of three, and the number never changes. No comes before the linking word: No somos dos negates your own number, No son tres negates another\'s.',
  'pt-BR': 'Ligação (somos para o próprio grupo, son para outro) mais um número logo depois. Somos dos — próprio grupo de dois, Son tres — outro de três, e o número nunca muda. No vem antes da ligação: No somos dos nega o próprio número, No son tres nega o de outro.',
  vi: 'Từ nối (somos cho nhóm của mình, son cho nhóm khác) cộng con số ngay sau đó. Somos dos — nhóm mình có hai người, Son tres — nhóm khác có ba, và con số không bao giờ đổi. No đứng trước từ nối: No somos dos phủ định số của mình, No son tres phủ định số của nhóm khác.',
  id: 'Kata penghubung (somos untuk kelompok sendiri, son untuk kelompok lain) ditambah angka setelahnya. Somos dos — kelompok sendiri dua orang, Son tres — kelompok lain tiga, angkanya tidak pernah berubah. No sebelum kata penghubung: No somos dos menegasikan angka sendiri, No son tres angka kelompok lain.',
  tr: 'Bağlaç (kendi grubu için somos, başkası için son) artı hemen ardından bir sayı. Somos dos — kendi grubu iki kişi, Son tres — başka grup üç kişi, ve sayı hiç değişmez. No bağlaçtan önce gelir: No somos dos kendi sayısını, No son tres başkasınınkini olumsuzlar.',
  pl: 'Łącznik (somos dla własnej grupy, son dla innej) plus liczba zaraz po nim. Somos dos — własna grupa dwuosobowa, Son tres — inna trzyosobowa, a liczba nigdy się nie zmienia. No stoi przed łącznikiem: No somos dos zaprzecza własnej liczbie, No son tres — cudzej.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — сказать Eres dos одному собеседнику: один человек не может быть «два», числа встают только после somos или son. Вторая ловушка — перепутать somos и son при счёте: говорящий внутри группы — нужна somos, говорящий считает со стороны — нужна son.',
  uk: 'Часта помилка — сказати Eres dos одному співрозмовнику: одна людина не може бути «два», числа стають лише після somos або son. Друга пастка — сплутати somos і son при рахунку: мовець всередині групи — потрібна somos, мовець рахує збоку — потрібна son.',
  es: 'A common mistake is saying Eres dos to a single listener: one person cannot be "two", numbers go only after somos or son. The second trap is confusing somos and son when counting: the speaker is inside the group — somos is needed; the speaker counts from the outside — son is needed.',
  'pt-BR': 'Um erro comum é dizer Eres dos a um único interlocutor: uma pessoa não pode ser "dois", números vêm só depois de somos ou son. A segunda armadilha é confundir somos e son ao contar: quem fala está dentro do grupo — precisa de somos; quem fala conta de fora — precisa de son.',
  vi: 'Lỗi thường gặp là nói Eres dos với một người nghe: một người không thể là "hai", số chỉ đứng sau somos hoặc son. Bẫy thứ hai là nhầm somos với son khi đếm: người nói ở trong nhóm — cần somos; người nói đếm từ bên ngoài — cần son.',
  id: 'Kesalahan umum adalah mengatakan Eres dos kepada satu pendengar: satu orang tidak bisa menjadi "dua", angka hanya muncul setelah somos atau son. Jebakan kedua adalah mengacaukan somos dan son saat menghitung: penutur ada di dalam kelompok — diperlukan somos; penutur menghitung dari luar — diperlukan son.',
  tr: 'Yaygın bir hata, tek bir dinleyiciye Eres dos demektir: bir kişi "iki" olamaz, sayılar yalnızca somos ya da son’dan sonra gelir. İkinci tuzak, sayarken somos ile son’u karıştırmaktır: konuşan grubun içindeyse — somos gerekir; konuşan dışarıdan sayıyorsa — son gerekir.',
  pl: 'Częsty błąd to powiedzieć Eres dos do jednego słuchacza: jedna osoba nie może być „dwa”, liczby pojawiają się tylko po somos lub son. Druga pułapka to mylenie somos i son przy liczeniu: mówiący jest wewnątrz grupy — potrzebne jest somos; mówiący liczy z zewnątrz — potrzebne jest son.',
});

export const ES_EPISODE_01_SESSION_28_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Число сразу после связки',
      uk: 'Число одразу після зв’язки',
      es: 'A number right after the linking word',
      'pt-BR': 'Um número logo após a ligação',
      vi: 'Một con số ngay sau từ nối',
      id: 'Angka tepat setelah kata penghubung',
      tr: 'Bağlaçtan hemen sonra bir sayı',
      pl: 'Liczba zaraz po łączniku',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Somos и son уже знакомы: somos — про группу с говорящим, son — про группу без него. Число встаёт сразу после любой из этих связок: ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — нас двое, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — их трое. С eres так не работает: собеседник один, а один человек не может быть «два». Числа встают только после somos и son.', semantic: 'explanation' }),
      uk: R({ text: 'Somos і son уже знайомі: somos — про групу з мовцем, son — про групу без нього. Число стає одразу після будь-якої з цих зв’язок: ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — нас двоє, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — їх троє. З eres так не працює: співрозмовник один, а одна людина не може бути «два». Числа стають лише після somos і son.', semantic: 'explanation' }),
      es: R({ text: 'Somos and son are already familiar: somos is about a group with the speaker, son about a group without them. A number goes right after either: ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: '. This does not work with eres: the listener is one person, and one person cannot be "two". Numbers go only after somos and son.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Somos e son já são conhecidas: somos é sobre um grupo com quem fala, son sobre um grupo sem ele. Um número vem logo após qualquer uma: ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — somos dois, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — são três. Isso não funciona com eres: o interlocutor é uma só pessoa, e uma pessoa não pode ser "dois". Números vêm só depois de somos e son.', semantic: 'explanation' }),
      vi: R({ text: 'Somos và son đã quen thuộc: somos nói về nhóm có người nói, son nói về nhóm không có người nói. Một con số đứng ngay sau: ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — chúng tôi có hai người, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — họ có ba người. Điều này không dùng được với eres: người nghe chỉ có một, không thể là "hai". Số chỉ đứng sau somos và son.', semantic: 'explanation' }),
      id: R({ text: 'Somos dan son sudah dikenal: somos tentang kelompok dengan penutur, son tentang kelompok tanpa penutur. Angka muncul tepat setelahnya: ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — kami berdua, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — mereka bertiga. Ini tidak berlaku untuk eres: pendengar hanya satu orang, tidak bisa menjadi "dua". Angka hanya muncul setelah somos dan son.', semantic: 'explanation' }),
      tr: R({ text: 'Somos ve son zaten tanıdıktır: somos konuşanı içeren bir grup, son ise içermeyen bir grup hakkındadır. Bir sayı hemen ardından gelir: ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — ikimiziz, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — onlar üç kişi. Bu eres ile çalışmaz: dinleyici tek kişidir, "iki" olamaz. Sayılar yalnızca somos ve son’dan sonra gelir.', semantic: 'explanation' }),
      pl: R({ text: 'Somos i son są już znane: somos dotyczy grupy z mówiącym, son grupy bez niego. Liczba pojawia się zaraz po: ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — jest nas dwoje, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — jest ich troje. Z eres to nie działa: słuchacz to jedna osoba, a jedna osoba nie może być „dwa”. Liczby pojawiają się tylko po somos i son.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно назвать точный размер своей группы из двух человек?',
        uk: 'Як правильно назвати точний розмір своєї групи з двох людей?',
        es: 'How do you correctly state the exact size of your own group of two people?',
        'pt-BR': 'Como se diz corretamente o tamanho exato do próprio grupo de duas pessoas?',
        vi: 'Nói đúng quy mô chính xác của nhóm mình gồm hai người, như thế nào?',
        id: 'Bagaimana cara menyatakan dengan benar ukuran pasti kelompok sendiri yang terdiri dari dua orang?',
        tr: 'Kendi iki kişilik grubunun tam büyüklüğü doğru nasıl söylenir?',
        pl: 'Jak poprawnie podać dokładny rozmiar własnej grupy dwóch osób?',
      }),
      choices: [
        L({ ru: 'Somos dos', uk: 'Somos dos', es: 'Somos dos', 'pt-BR': 'Somos dos', vi: 'Somos dos', id: 'Somos dos', tr: 'Somos dos', pl: 'Somos dos' }),
        L({ ru: 'Eres dos', uk: 'Eres dos', es: 'Eres dos', 'pt-BR': 'Eres dos', vi: 'Eres dos', id: 'Eres dos', tr: 'Eres dos', pl: 'Eres dos' }),
        L({ ru: 'Son dos', uk: 'Son dos', es: 'Son dos', 'pt-BR': 'Son dos', vi: 'Son dos', id: 'Son dos', tr: 'Son dos', pl: 'Son dos' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos dos верно, потому что говорящий сам входит в группу из двух человек. Eres dos невозможно — один собеседник не может быть «два», а Son dos назвало бы чужую группу без говорящего.',
        uk: 'Somos dos правильно, бо мовець сам входить до групи з двох людей. Eres dos неможливо — один співрозмовник не може бути «два», а Son dos назвало б чужу групу без мовця.',
        es: 'Somos dos is correct because the speaker is part of a group of two. Eres dos is impossible — one listener cannot be "two", and Son dos would name another group without the speaker.',
        'pt-BR': 'Somos dos está correto porque quem fala faz parte de um grupo de duas pessoas. Eres dos é impossível — um interlocutor não pode ser "dois", e Son dos indicaria outro grupo sem quem fala.',
        vi: 'Somos dos đúng vì người nói thuộc về nhóm hai người. Eres dos là không thể — một người nghe không thể là "hai", còn Son dos sẽ chỉ nhóm khác không có người nói.',
        id: 'Somos dos benar karena penutur adalah bagian dari kelompok dua orang. Eres dos tidak mungkin — satu pendengar tidak bisa menjadi "dua", dan Son dos akan menyebutkan kelompok lain tanpa penutur.',
        tr: 'Somos dos doğrudur çünkü konuşan iki kişilik grubun bir parçasıdır. Eres dos imkansızdır — tek bir dinleyici "iki" olamaz, ve Son dos konuşan olmadan başka bir grubu adlandırırdı.',
        pl: 'Somos dos jest poprawne, ponieważ mówiący jest częścią dwuosobowej grupy. Eres dos jest niemożliwe — jeden słuchacz nie może być „dwa”, a Son dos nazywałoby inną grupę bez mówiącego.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Связка плюс число, и больше ничего',
      uk: 'Зв’язка плюс число, і більше нічого',
      es: 'Linking word plus number, nothing else',
      'pt-BR': 'Ligação mais número, e nada mais',
      vi: 'Từ nối cộng con số, không gì khác',
      id: 'Kata penghubung ditambah angka, tidak ada lagi',
      tr: 'Bağlaç artı sayı, başka bir şey değil',
      pl: 'Łącznik plus liczba, i nic więcej',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Связка (somos для своей группы, son для чужой) плюс число сразу за ней. ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — своя группа в два человека, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — чужая в три, и число не меняется никогда. No встаёт перед связкой: ', semantic: 'explanation' }, { text: 'No somos dos', semantic: 'targetCorrect' }, { text: ' отрицает своё число, ', semantic: 'explanation' }, { text: 'No son tres', semantic: 'targetCorrect' }, { text: ' — чужое.', semantic: 'explanation' }),
      uk: R({ text: 'Зв’язка (somos для своєї групи, son для чужої) плюс число одразу за нею. ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — своя група у дві людини, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — чужа у три, і число не змінюється ніколи. No стає перед зв’язкою: ', semantic: 'explanation' }, { text: 'No somos dos', semantic: 'targetCorrect' }, { text: ' заперечує своє число, ', semantic: 'explanation' }, { text: 'No son tres', semantic: 'targetCorrect' }, { text: ' — чуже.', semantic: 'explanation' }),
      es: R({ text: 'Linking word (somos for your own group, son for another) plus a number right after it. ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — your own group of two, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — another group of three, and the number never changes. No comes before the linking word: ', semantic: 'explanation' }, { text: 'No somos dos', semantic: 'targetCorrect' }, { text: ' negates your own number, ', semantic: 'explanation' }, { text: 'No son tres', semantic: 'targetCorrect' }, { text: ' negates another\'s.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Ligação (somos para o próprio grupo, son para outro) mais um número logo depois. ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — próprio grupo de dois, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — outro de três, e o número nunca muda. No vem antes da ligação: ', semantic: 'explanation' }, { text: 'No somos dos', semantic: 'targetCorrect' }, { text: ' nega o próprio número, ', semantic: 'explanation' }, { text: 'No son tres', semantic: 'targetCorrect' }, { text: ' nega o de outro.', semantic: 'explanation' }),
      vi: R({ text: 'Từ nối (somos cho nhóm của mình, son cho nhóm khác) cộng con số ngay sau đó. ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — nhóm mình có hai người, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — nhóm khác có ba, và con số không bao giờ đổi. No đứng trước từ nối: ', semantic: 'explanation' }, { text: 'No somos dos', semantic: 'targetCorrect' }, { text: ' phủ định số của mình, ', semantic: 'explanation' }, { text: 'No son tres', semantic: 'targetCorrect' }, { text: ' phủ định số của nhóm khác.', semantic: 'explanation' }),
      id: R({ text: 'Kata penghubung (somos untuk kelompok sendiri, son untuk kelompok lain) ditambah angka setelahnya. ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — kelompok sendiri dua orang, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — kelompok lain tiga, angkanya tidak pernah berubah. No sebelum kata penghubung: ', semantic: 'explanation' }, { text: 'No somos dos', semantic: 'targetCorrect' }, { text: ' menegasikan angka sendiri, ', semantic: 'explanation' }, { text: 'No son tres', semantic: 'targetCorrect' }, { text: ' angka kelompok lain.', semantic: 'explanation' }),
      tr: R({ text: 'Bağlaç (kendi grubu için somos, başkası için son) artı hemen ardından bir sayı. ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — kendi grubu iki kişi, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — başka grup üç kişi, ve sayı hiç değişmez. No bağlaçtan önce gelir: ', semantic: 'explanation' }, { text: 'No somos dos', semantic: 'targetCorrect' }, { text: ' kendi sayısını, ', semantic: 'explanation' }, { text: 'No son tres', semantic: 'targetCorrect' }, { text: ' başkasınınkini olumsuzlar.', semantic: 'explanation' }),
      pl: R({ text: 'Łącznik (somos dla własnej grupy, son dla innej) plus liczba zaraz po nim. ', semantic: 'explanation' }, { text: 'Somos dos', semantic: 'targetCorrect' }, { text: ' — własna grupa dwuosobowa, ', semantic: 'explanation' }, { text: 'Son tres', semantic: 'targetCorrect' }, { text: ' — inna trzyosobowa, a liczba nigdy się nie zmienia. No stoi przed łącznikiem: ', semantic: 'explanation' }, { text: 'No somos dos', semantic: 'targetCorrect' }, { text: ' zaprzecza własnej liczbie, ', semantic: 'explanation' }, { text: 'No son tres', semantic: 'targetCorrect' }, { text: ' — cudzej.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Где встаёт No, когда нужно отрицать число своей группы?',
        uk: 'Де стає No, коли потрібно заперечити число своєї групи?',
        es: 'Where does No go when negating the number of your own group?',
        'pt-BR': 'Onde fica No ao negar o número do próprio grupo?',
        vi: 'No đứng ở đâu khi phủ định con số của nhóm mình?',
        id: 'Di mana No diletakkan saat menegasikan angka kelompok sendiri?',
        tr: 'Kendi grubunun sayısı olumsuzlanırken No nereye gelir?',
        pl: 'Gdzie stoi No, gdy trzeba zaprzeczyć liczbie własnej grupy?',
      }),
      choices: [
        L({ ru: 'No somos dos', uk: 'No somos dos', es: 'No somos dos', 'pt-BR': 'No somos dos', vi: 'No somos dos', id: 'No somos dos', tr: 'No somos dos', pl: 'No somos dos' }),
        L({ ru: 'Somos dos no', uk: 'Somos dos no', es: 'Somos dos no', 'pt-BR': 'Somos dos no', vi: 'Somos dos no', id: 'Somos dos no', tr: 'Somos dos no', pl: 'Somos dos no' }),
        L({ ru: 'Somos no dos', uk: 'Somos no dos', es: 'Somos no dos', 'pt-BR': 'Somos no dos', vi: 'Somos no dos', id: 'Somos no dos', tr: 'Somos no dos', pl: 'Somos no dos' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No somos dos верно, потому что No встаёт перед связкой, а не рядом с числом: отрицается всё утверждение целиком, а связка с числом остаются в паре без изменений.',
        uk: 'No somos dos правильно, бо No стає перед зв’язкою, а не поруч із числом: заперечується все твердження цілком, а зв’язка з числом лишаються в парі без змін.',
        es: 'No somos dos is correct because No goes before the linking word, not next to the number: the whole statement is negated, while the linking word and the number stay together unchanged.',
        'pt-BR': 'No somos dos está correto porque No vem antes da ligação, não perto do número: toda a afirmação é negada, enquanto a ligação e o número permanecem juntos sem mudanças.',
        vi: 'No somos dos đúng vì No đứng trước từ nối, không phải bên cạnh con số: toàn bộ câu khẳng định bị phủ định, còn từ nối với con số vẫn đi cùng nhau không đổi.',
        id: 'No somos dos benar karena No berada sebelum kata penghubung, bukan di dekat angka: seluruh pernyataan dinegasikan, sementara kata penghubung dan angka tetap bersama tanpa berubah.',
        tr: 'No somos dos doğrudur çünkü No, sayının yanına değil bağlaçtan önce gelir: tüm ifade olumsuzlanır, bağlaç ile sayı ise değişmeden birlikte kalır.',
        pl: 'No somos dos jest poprawne, ponieważ No stoi przed łącznikiem, a nie obok liczby: zaprzecza się całemu stwierdzeniu, a łącznik z liczbą pozostają razem bez zmian.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Число не сочетается с eres',
      uk: 'Число не поєднується з eres',
      es: 'A number does not combine with eres',
      'pt-BR': 'Um número não combina com eres',
      vi: 'Con số không kết hợp với eres',
      id: 'Angka tidak digabungkan dengan eres',
      tr: 'Sayı eres ile birleşmez',
      pl: 'Liczba nie łączy się z eres',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Частая ошибка — сказать ', semantic: 'explanation' }, { text: 'Eres dos', semantic: 'targetWrong' }, { text: ' одному собеседнику: один человек не может быть «два», числа встают только после ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' или ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '. Вторая ловушка — перепутать somos и son при счёте: говорящий внутри группы — нужна somos, говорящий считает со стороны — нужна son.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — сказати ', semantic: 'explanation' }, { text: 'Eres dos', semantic: 'targetWrong' }, { text: ' одному співрозмовнику: одна людина не може бути «два», числа стають лише після ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' або ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '. Друга пастка — сплутати somos і son при рахунку: мовець всередині групи — потрібна somos, мовець рахує збоку — потрібна son.', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is saying ', semantic: 'explanation' }, { text: 'Eres dos', semantic: 'targetWrong' }, { text: ' to a single listener: one person cannot be "two", numbers go only after ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' or ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '. The second trap is confusing somos and son when counting: the speaker is inside the group — somos is needed; the speaker counts from the outside — son is needed.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é dizer ', semantic: 'explanation' }, { text: 'Eres dos', semantic: 'targetWrong' }, { text: ' a um único interlocutor: uma pessoa não pode ser "dois", números vêm só depois de ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' ou ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '. A segunda armadilha é confundir somos e son ao contar: quem fala está dentro do grupo — precisa de somos; quem fala conta de fora — precisa de son.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp là nói ', semantic: 'explanation' }, { text: 'Eres dos', semantic: 'targetWrong' }, { text: ' với một người nghe: một người không thể là "hai", số chỉ đứng sau ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' hoặc ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '. Bẫy thứ hai là nhầm somos với son khi đếm: người nói ở trong nhóm — cần somos; người nói đếm từ bên ngoài — cần son.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah mengatakan ', semantic: 'explanation' }, { text: 'Eres dos', semantic: 'targetWrong' }, { text: ' kepada satu pendengar: satu orang tidak bisa menjadi "dua", angka hanya muncul setelah ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' atau ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '. Jebakan kedua adalah mengacaukan somos dan son saat menghitung: penutur ada di dalam kelompok — diperlukan somos; penutur menghitung dari luar — diperlukan son.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın bir hata, tek bir dinleyiciye ', semantic: 'explanation' }, { text: 'Eres dos', semantic: 'targetWrong' }, { text: ' demektir: bir kişi "iki" olamaz, sayılar yalnızca ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' ya da ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '’dan sonra gelir. İkinci tuzak, sayarken somos ile son’u karıştırmaktır: konuşan grubun içindeyse — somos gerekir; konuşan dışarıdan sayıyorsa — son gerekir.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd to powiedzieć ', semantic: 'explanation' }, { text: 'Eres dos', semantic: 'targetWrong' }, { text: ' do jednego słuchacza: jedna osoba nie może być „dwa”, liczby pojawiają się tylko po ', semantic: 'explanation' }, { text: 'somos', semantic: 'targetCorrect' }, { text: ' lub ', semantic: 'explanation' }, { text: 'son', semantic: 'targetCorrect' }, { text: '. Druga pułapka to mylenie somos i son przy liczeniu: mówiący jest wewnątrz grupy — potrzebne jest somos; mówiący liczy z zewnątrz — potrzebne jest son.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно сказать, что чужая группа состоит из трёх человек?',
        uk: 'Як правильно сказати, що чужа група складається з трьох людей?',
        es: 'How do you correctly say that another group consists of three people?',
        'pt-BR': 'Como se diz corretamente que outro grupo é composto por três pessoas?',
        vi: 'Nói đúng rằng nhóm khác gồm ba người, như thế nào?',
        id: 'Bagaimana cara mengatakan dengan benar bahwa kelompok lain terdiri dari tiga orang?',
        tr: 'Başka bir grubun üç kişiden oluştuğu doğru nasıl söylenir?',
        pl: 'Jak poprawnie powiedzieć, że inna grupa składa się z trzech osób?',
      }),
      choices: [
        L({ ru: 'Son tres', uk: 'Son tres', es: 'Son tres', 'pt-BR': 'Son tres', vi: 'Son tres', id: 'Son tres', tr: 'Son tres', pl: 'Son tres' }),
        L({ ru: 'Eres tres', uk: 'Eres tres', es: 'Eres tres', 'pt-BR': 'Eres tres', vi: 'Eres tres', id: 'Eres tres', tr: 'Eres tres', pl: 'Eres tres' }),
        L({ ru: 'Somos tres', uk: 'Somos tres', es: 'Somos tres', 'pt-BR': 'Somos tres', vi: 'Somos tres', id: 'Somos tres', tr: 'Somos tres', pl: 'Somos tres' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Son tres верно, потому что говорящий не входит в эту группу — считает со стороны. Eres tres невозможно — один собеседник не может быть «три», а Somos tres включало бы говорящего в число этих трёх.',
        uk: 'Son tres правильно, бо мовець не входить до цієї групи — рахує збоку. Eres tres неможливо — один співрозмовник не може бути «три», а Somos tres включало б мовця до числа цих трьох.',
        es: 'Son tres is correct because the speaker is not part of this group — counting from the outside. Eres tres is impossible — one listener cannot be "three", and Somos tres would include the speaker among these three.',
        'pt-BR': 'Son tres está correto porque quem fala não faz parte desse grupo — conta de fora. Eres tres é impossível — um interlocutor não pode ser "três", e Somos tres incluiria quem fala entre esses três.',
        vi: 'Son tres đúng vì người nói không thuộc nhóm này — đếm từ bên ngoài. Eres tres là không thể — một người nghe không thể là "ba", còn Somos tres sẽ bao gồm người nói trong số ba người này.',
        id: 'Son tres benar karena penutur tidak termasuk dalam kelompok ini — menghitung dari luar. Eres tres tidak mungkin — satu pendengar tidak bisa menjadi "tiga", dan Somos tres akan mencakup penutur di antara ketiga orang ini.',
        tr: 'Son tres doğrudur çünkü konuşan bu grubun parçası değildir — dışarıdan sayar. Eres tres imkansızdır — tek bir dinleyici "üç" olamaz, ve Somos tres konuşanı bu üç kişi arasına dahil ederdi.',
        pl: 'Son tres jest poprawne, ponieważ mówiący nie jest częścią tej grupy — liczy z zewnątrz. Eres tres jest niemożliwe — jeden słuchacz nie może być „trzy”, a Somos tres objęłoby mówiącego wśród tych trzech.',
      }),
    },
  },
];
