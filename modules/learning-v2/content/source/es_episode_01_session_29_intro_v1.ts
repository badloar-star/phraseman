import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 29 "Мы не, они не" / builtOn: [2, 25, 27], recalls: [2, 19]): три
// страницы concept/formula/trap показывают, что формула отрицания no +
// связка, знакомая по no soy (сессия 2) и no es (сессия 19), работает без
// изменений и для множественного числа: no встаёт перед somos (сессия 25)
// и перед son (сессия 27) точно так же, признак после связки не меняется
// от самого факта отрицания. Это завершает всю парадигму отрицания связки
// ser по лицам: no soy, no eres, no es, no somos, no son. Новых слов нет.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_29_TITLE = L({
  ru: 'Мы не, они не',
  uk: 'Ми не, вони не',
  es: 'We are not, they are not',
  'pt-BR': 'Não somos, não são',
  vi: 'Chúng tôi không, họ không',
  id: 'Kami tidak, mereka tidak',
  tr: 'Biz değiliz, onlar değil',
  pl: 'Nie jesteśmy, nie są',
});

export const ES_EPISODE_01_SESSION_29_SUMMARY = L({
  ru: 'No + somos и no + son отрицают признак группы — та же формула отрицания, что и в единственном числе, только теперь связка про нескольких.',
  uk: 'No + somos і no + son заперечують ознаку групи — та сама формула заперечення, що й в однині, тільки тепер зв’язка про кількох.',
  es: 'No + somos and no + son negate a group\'s quality — the same negation formula as in the singular, only now the linking word is about several.',
  'pt-BR': 'No + somos e no + son negam uma qualidade do grupo — a mesma fórmula de negação do singular, só que agora a ligação é sobre várias pessoas.',
  vi: 'No + somos và no + son phủ định đặc điểm của nhóm — cùng công thức phủ định như ở số ít, chỉ khác là từ nối giờ nói về nhiều người.',
  id: 'No + somos dan no + son menegasikan sifat kelompok — rumus negasi yang sama seperti tunggal, hanya sekarang kata penghubungnya tentang beberapa orang.',
  tr: 'No + somos ve no + son bir grubun niteliğini olumsuzlar — tekildeki ile aynı olumsuzlama formülü, sadece şimdi bağlaç birkaç kişi hakkında.',
  pl: 'No + somos i no + son zaprzeczają cesze grupy — ta sama formuła przeczenia co w liczbie pojedynczej, tylko teraz łącznik dotyczy kilku osób.',
});

export const ES_EPISODE_01_SESSION_29_GOAL = L({
  ru: 'Уверенно строить отрицания No somos + признак и No son + признак, сохраняя порядок слов и полное согласование по роду и числу.',
  uk: 'Впевнено будувати заперечення No somos + ознака і No son + ознака, зберігаючи порядок слів і повне узгодження за родом і числом.',
  es: 'Confidently build the negations No somos + quality and No son + quality, keeping the word order and full gender and number agreement.',
  'pt-BR': 'Construir com confiança as negações No somos + qualidade e No son + qualidade, mantendo a ordem das palavras e a concordância completa de gênero e número.',
  vi: 'Tự tin xây dựng câu phủ định No somos + đặc điểm và No son + đặc điểm, giữ đúng trật tự từ và hòa hợp đầy đủ về giống và số.',
  id: 'Membangun dengan percaya diri negasi No somos + sifat dan No son + sifat, menjaga urutan kata dan kesesuaian gender serta jumlah secara penuh.',
  tr: 'No somos + nitelik ve No son + nitelik olumsuzlamalarını, kelime sırasını ve tam cinsiyet ile sayı uyumunu koruyarak güvenle kurmak.',
  pl: 'Pewnie budować przeczenia No somos + cecha i No son + cecha, zachowując szyk wyrazów i pełną zgodność rodzaju i liczby.',
});

const CONCEPT_BODY = L({
  ru: 'Somos и son уже знакомы, и no перед ними работает точно так же, как no soy и no es раньше. Признак после связки не меняется от отрицания: No somos rápidos отрицает темп так же, как No es caro отрицало цену. No встаёт прямо перед somos или son, остальное устройство фразы не меняется.',
  uk: 'Somos і son вже знайомі, і no перед ними працює точно так само, як no soy і no es раніше. Ознака після зв’язки не змінюється від заперечення: No somos rápidos заперечує темп так само, як No es caro заперечувало ціну. No стоїть прямо перед somos чи son, решта устрою фрази не змінюється.',
  es: 'Somos and son are already familiar, and no before them works exactly like no soy and no es did earlier. The quality after the linking word does not change from negation: No somos rápidos negates pace the way No es caro negated price. No goes right before somos or son, the rest of the phrase stays the same.',
  'pt-BR': 'Somos e son já são conhecidas, e no antes delas funciona como no soy e no es antes. A qualidade depois da ligação não muda com a negação: No somos rápidos nega o ritmo como No es caro negava o preço. No fica bem antes de somos ou son, o resto da frase continua igual.',
  vi: 'Somos và son đã quen thuộc, và no đứng trước chúng hoạt động y hệt như no soy và no es trước đây. Đặc điểm sau từ nối không đổi vì phủ định: No somos rápidos phủ định tốc độ như No es caro phủ định giá. No đứng ngay trước somos hoặc son, phần còn lại của câu không đổi.',
  id: 'Somos dan son sudah dikenal, dan no sebelum keduanya bekerja seperti no soy dan no es sebelumnya. Sifat setelah kata penghubung tidak berubah karena negasi: No somos rápidos menegasikan kecepatan seperti No es caro menegasikan harga. No berada tepat sebelum somos atau son, sisanya tetap sama.',
  tr: 'Somos ve son zaten tanıdıktır ve önlerindeki no, daha önceki no soy ve no es gibi çalışır. Bağlaçtan sonraki nitelik olumsuzlamadan değişmez: No somos rápidos hızı, No es caro’nun fiyatı olumsuzladığı gibi olumsuzlar. No tam olarak somos ya da son’dan önce gelir, geri kalanı aynı kalır.',
  pl: 'Somos i son są już znane, a no przed nimi działa dokładnie tak, jak wcześniej no soy i no es. Cecha po łączniku nie zmienia się przez przeczenie: No somos rápidos zaprzecza tempu tak, jak No es caro zaprzeczało cenie. No stoi tuż przed somos lub son, reszta frazy się nie zmienia.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что и для no soy, no eres, no es: no + связка + признак, без исключений. No somos caros, а не Somos no caros. Признак согласуется по роду и числу так же, как без отрицания: No somos rápidos — No somos rápidas, No son bonitos — No son bonitas.',
  uk: 'Формула та сама, що й для no soy, no eres, no es: no + зв’язка + ознака, без винятків. No somos caros, а не Somos no caros. Ознака узгоджується за родом і числом так само, як без заперечення: No somos rápidos — No somos rápidas, No son bonitos — No son bonitas.',
  es: 'The formula is the same as for no soy, no eres, no es: no + linking word + quality, without exceptions. No somos caros, not Somos no caros. The quality agrees by gender and number the same way it does without negation: No somos rápidos versus No somos rápidas, No son bonitos versus No son bonitas.',
  'pt-BR': 'A fórmula é a mesma de no soy, no eres, no es: no + ligação + qualidade, sem exceções. No somos caros, não Somos no caros. A qualidade concorda em gênero e número do mesmo jeito que sem negação: No somos rápidos versus No somos rápidas, No son bonitos versus No son bonitas.',
  vi: 'Công thức giống với no soy, no eres, no es: no + từ nối + đặc điểm, không ngoại lệ. No somos caros, không phải Somos no caros. Đặc điểm hòa hợp về giống và số như khi không có phủ định: No somos rápidos so với No somos rápidas, No son bonitos so với No son bonitas.',
  id: 'Rumusnya sama seperti no soy, no eres, no es: no + kata penghubung + sifat, tanpa pengecualian. No somos caros, bukan Somos no caros. Sifat sesuai gender dan jumlah seperti tanpa negasi: No somos rápidos versus No somos rápidas, No son bonitos versus No son bonitas.',
  tr: 'Formül, no soy, no eres, no es ile aynıdır: no + bağlaç + nitelik, istisnasız. No somos caros, Somos no caros değil. Nitelik, olumsuzlama olmadan olduğu gibi cinsiyet ve sayıya uyum sağlar: No somos rápidos karşısında No somos rápidas, No son bonitos karşısında No son bonitas.',
  pl: 'Formuła jest taka sama jak dla no soy, no eres, no es: no + łącznik + cecha, bez wyjątków. No somos caros, nie Somos no caros. Cecha zgadza się rodzajem i liczbą tak samo jak bez przeczenia: No somos rápidos kontra No somos rápidas, No son bonitos kontra No son bonitas.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — поставить no перед признаком, а не перед связкой: Somos no caros вместо No somos caros. No всегда идёт первым. Вторая ловушка — перепутать somos и son: somos включает говорящего в группу, son — нет, отрицание это не меняет.',
  uk: 'Часта помилка — поставити no перед ознакою, а не перед зв’язкою: Somos no caros замість No somos caros. No завжди йде першим. Друга пастка — переплутати somos і son: somos включає мовця в групу, son — ні, заперечення цього не змінює.',
  es: 'A common mistake is placing no before the quality instead of before the linking word: Somos no caros instead of No somos caros. No always comes first. The second trap is mixing up somos and son: somos includes the speaker in the group, son does not, negation does not change this.',
  'pt-BR': 'Um erro comum é colocar no antes da qualidade em vez de antes da ligação: Somos no caros em vez de No somos caros. No sempre vem primeiro. A segunda armadilha é confundir somos e son: somos inclui quem fala no grupo, son não, a negação não muda isso.',
  vi: 'Lỗi thường gặp là đặt no trước đặc điểm thay vì trước từ nối: Somos no caros thay vì No somos caros. No luôn đứng đầu. Bẫy thứ hai là nhầm somos với son: somos bao gồm người nói trong nhóm, son thì không, phủ định không thay đổi điều này.',
  id: 'Kesalahan umum adalah meletakkan no sebelum sifat, bukan sebelum kata penghubung: Somos no caros, bukan No somos caros. No selalu datang pertama. Jebakan kedua adalah mengacaukan somos dan son: somos mencakup penutur dalam kelompok, son tidak, negasi tidak mengubah ini.',
  tr: 'Yaygın bir hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: No somos caros yerine Somos no caros. No her zaman önce gelir. İkinci tuzak, somos ile son’u karıştırmaktır: somos konuşanı gruba dahil eder, son etmez, olumsuzlama bunu değiştirmez.',
  pl: 'Częsty błąd to postawienie no przed cechą zamiast przed łącznikiem: Somos no caros zamiast No somos caros. No zawsze idzie pierwsze. Druga pułapka to mylenie somos i son: somos obejmuje mówiącego w grupie, son nie, przeczenie tego nie zmienia.',
});

export const ES_EPISODE_01_SESSION_29_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Отрицание и множественное число соединяются без изменений',
      uk: 'Заперечення і множина з’єднуються без змін',
      es: 'Negation and the plural join without changes',
      'pt-BR': 'Negação e plural se juntam sem mudanças',
      vi: 'Phủ định và số nhiều kết hợp mà không thay đổi',
      id: 'Negasi dan jamak bergabung tanpa perubahan',
      tr: 'Olumsuzlama ve çoğul değişiklik olmadan birleşir',
      pl: 'Przeczenie i liczba mnoga łączą się bez zmian',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Somos и son уже знакомы, и no перед ними работает точно так же, как no soy и no es раньше. Признак после связки не меняется от отрицания: ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' отрицает темп так же, как No es caro отрицало цену. No встаёт прямо перед somos или son, остальное устройство фразы не меняется.', semantic: 'explanation' }),
      uk: R({ text: 'Somos і son вже знайомі, і no перед ними працює точно так само, як no soy і no es раніше. Ознака після зв’язки не змінюється від заперечення: ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' заперечує темп так само, як No es caro заперечувало ціну. No стоїть прямо перед somos чи son, решта устрою фрази не змінюється.', semantic: 'explanation' }),
      es: R({ text: 'Somos and son are already familiar, and no before them works exactly like no soy and no es did earlier. The quality after the linking word does not change from negation: ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' negates pace the way No es caro negated price. No goes right before somos or son, the rest of the phrase stays the same.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Somos e son já são conhecidas, e no antes delas funciona como no soy e no es antes. A qualidade depois da ligação não muda com a negação: ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' nega o ritmo como No es caro negava o preço. No fica bem antes de somos ou son, o resto da frase continua igual.', semantic: 'explanation' }),
      vi: R({ text: 'Somos và son đã quen thuộc, và no đứng trước chúng hoạt động y hệt như no soy và no es trước đây. Đặc điểm sau từ nối không đổi vì phủ định: ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' phủ định tốc độ như No es caro phủ định giá. No đứng ngay trước somos hoặc son, phần còn lại của câu không đổi.', semantic: 'explanation' }),
      id: R({ text: 'Somos dan son sudah dikenal, dan no sebelum keduanya bekerja seperti no soy dan no es sebelumnya. Sifat setelah kata penghubung tidak berubah karena negasi: ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' menegasikan kecepatan seperti No es caro menegasikan harga. No berada tepat sebelum somos atau son, sisanya tetap sama.', semantic: 'explanation' }),
      tr: R({ text: 'Somos ve son zaten tanıdıktır ve önlerindeki no, daha önceki no soy ve no es gibi çalışır. Bağlaçtan sonraki nitelik olumsuzlamadan değişmez: ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' hızı, No es caro’nun fiyatı olumsuzladığı gibi olumsuzlar. No tam olarak somos ya da son’dan önce gelir, geri kalanı aynı kalır.', semantic: 'explanation' }),
      pl: R({ text: 'Somos i son są już znane, a no przed nimi działa dokładnie tak, jak wcześniej no soy i no es. Cecha po łączniku nie zmienia się przez przeczenie: ', semantic: 'explanation' }, { text: 'No somos rápidos', semantic: 'targetCorrect' }, { text: ' zaprzecza tempu tak, jak No es caro zaprzeczało cenie. No stoi tuż przed somos lub son, reszta frazy się nie zmienia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как отрицают темп своей группы, включающей говорящего?',
        uk: 'Як заперечують темп своєї групи, що включає мовця?',
        es: 'How do you negate the pace of your own group, including the speaker?',
        'pt-BR': 'Como se nega o ritmo do próprio grupo, incluindo quem fala?',
        vi: 'Làm thế nào để phủ định tốc độ của nhóm mình, gồm cả người nói?',
        id: 'Bagaimana cara menegasikan kecepatan kelompok sendiri, termasuk penutur?',
        tr: 'Konuşanı da içeren kendi grubun hızı nasıl olumsuzlanır?',
        pl: 'Jak zaprzecza się tempu własnej grupy, obejmującej mówiącego?',
      }),
      choices: [
        L({ ru: 'No somos rápidos', uk: 'No somos rápidos', es: 'No somos rápidos', 'pt-BR': 'No somos rápidos', vi: 'No somos rápidos', id: 'No somos rápidos', tr: 'No somos rápidos', pl: 'No somos rápidos' }),
        L({ ru: 'Somos no rápidos', uk: 'Somos no rápidos', es: 'Somos no rápidos', 'pt-BR': 'Somos no rápidos', vi: 'Somos no rápidos', id: 'Somos no rápidos', tr: 'Somos no rápidos', pl: 'Somos no rápidos' }),
        L({ ru: 'No son rápidos', uk: 'No son rápidos', es: 'No son rápidos', 'pt-BR': 'No son rápidos', vi: 'No son rápidos', id: 'No son rápidos', tr: 'No son rápidos', pl: 'No son rápidos' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No somos rápidos верно: no встаёт прямо перед связкой somos, а признак rápidos не меняется от отрицания.',
        uk: 'No somos rápidos правильно: no стоїть прямо перед зв’язкою somos, а ознака rápidos не змінюється від заперечення.',
        es: 'No somos rápidos is correct: no goes right before the linking word somos, and the quality rápidos does not change from negation.',
        'pt-BR': 'No somos rápidos está correto: no fica bem antes da ligação somos, e a qualidade rápidos não muda com a negação.',
        vi: 'No somos rápidos đúng: no đứng ngay trước từ nối somos, và đặc điểm rápidos không đổi vì phủ định.',
        id: 'No somos rápidos benar: no berada tepat sebelum kata penghubung somos, dan sifat rápidos tidak berubah karena negasi.',
        tr: 'No somos rápidos doğrudur: no tam olarak somos bağlacından önce gelir ve rápidos niteliği olumsuzlamadan değişmez.',
        pl: 'No somos rápidos jest poprawne: no stoi tuż przed łącznikiem somos, a cecha rápidos nie zmienia się przez przeczenie.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Согласование по роду и числу не зависит от no',
      uk: 'Узгодження за родом і числом не залежить від no',
      es: 'Gender and number agreement does not depend on no',
      'pt-BR': 'A concordância de gênero e número não depende de no',
      vi: 'Sự hòa hợp giống và số không phụ thuộc vào no',
      id: 'Kesesuaian gender dan jumlah tidak bergantung pada no',
      tr: 'Cinsiyet ve sayı uyumu no’ya bağlı değildir',
      pl: 'Zgodność rodzaju i liczby nie zależy od no',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула та же, что и для no soy, no eres, no es: no + связка + признак, без исключений. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', а не Somos no caros. Признак согласуется по роду и числу так же, как без отрицания: No somos rápidos — ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son bonitos — No son bonitas.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й для no soy, no eres, no es: no + зв’язка + ознака, без винятків. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', а не Somos no caros. Ознака узгоджується за родом і числом так само, як без заперечення: No somos rápidos — ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son bonitos — No son bonitas.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for no soy, no eres, no es: no + linking word + quality, without exceptions. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', not Somos no caros. The quality agrees by gender and number the same way it does without negation: No somos rápidos versus ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son bonitos versus No son bonitas.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de no soy, no eres, no es: no + ligação + qualidade, sem exceções. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', não Somos no caros. A qualidade concorda em gênero e número do mesmo jeito que sem negação: No somos rápidos versus ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son bonitos versus No son bonitas.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống với no soy, no eres, no es: no + từ nối + đặc điểm, không ngoại lệ. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', không phải Somos no caros. Đặc điểm hòa hợp về giống và số như khi không có phủ định: No somos rápidos so với ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son bonitos so với No son bonitas.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti no soy, no eres, no es: no + kata penghubung + sifat, tanpa pengecualian. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', bukan Somos no caros. Sifat sesuai gender dan jumlah seperti tanpa negasi: No somos rápidos versus ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son bonitos versus No son bonitas.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, no soy, no eres, no es ile aynıdır: no + bağlaç + nitelik, istisnasız. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', Somos no caros değil. Nitelik, olumsuzlama olmadan olduğu gibi cinsiyet ve sayıya uyum sağlar: No somos rápidos karşısında ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son bonitos karşısında No son bonitas.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla no soy, no eres, no es: no + łącznik + cecha, bez wyjątków. ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ', nie Somos no caros. Cecha zgadza się rodzajem i liczbą tak samo jak bez przeczenia: No somos rápidos kontra ', semantic: 'explanation' }, { text: 'No somos rápidas', semantic: 'targetCorrect' }, { text: ', No son bonitos kontra No son bonitas.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Про группу женского рода — как верно отрицать темп?',
        uk: 'Про групу жіночого роду — як правильно заперечити темп?',
        es: 'About a feminine group — how do you correctly negate the pace?',
        'pt-BR': 'Sobre um grupo feminino — como negar corretamente o ritmo?',
        vi: 'Về nhóm giống cái — làm sao để phủ định tốc độ đúng cách?',
        id: 'Tentang kelompok feminin — bagaimana cara menegasikan kecepatan dengan benar?',
        tr: 'Dişil bir grup hakkında — hız doğru nasıl olumsuzlanır?',
        pl: 'O grupie rodzaju żeńskiego — jak poprawnie zaprzeczyć tempu?',
      }),
      choices: [
        L({ ru: 'No somos rápidas', uk: 'No somos rápidas', es: 'No somos rápidas', 'pt-BR': 'No somos rápidas', vi: 'No somos rápidas', id: 'No somos rápidas', tr: 'No somos rápidas', pl: 'No somos rápidas' }),
        L({ ru: 'No somos rápidos', uk: 'No somos rápidos', es: 'No somos rápidos', 'pt-BR': 'No somos rápidos', vi: 'No somos rápidos', id: 'No somos rápidos', tr: 'No somos rápidos', pl: 'No somos rápidos' }),
        L({ ru: 'No son rápidas', uk: 'No son rápidas', es: 'No son rápidas', 'pt-BR': 'No son rápidas', vi: 'No son rápidas', id: 'No son rápidas', tr: 'No son rápidas', pl: 'No son rápidas' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No somos rápidas верно: связка somos для группы, включающей говорящую, плюс признак с окончанием -as для женского рода. No somos rápidos путает род, No son rápidas путает связку — это уже группа без говорящей.',
        uk: 'No somos rápidas правильно: зв’язка somos для групи, що включає мовицю, плюс ознака із закінченням -as для жіночого роду. No somos rápidos плутає рід, No son rápidas плутає зв’язку — це вже група без мовиці.',
        es: 'No somos rápidas is correct: the linking word somos for a group that includes the speaker, plus the quality ending in -as for feminine. No somos rápidos mixes up the gender, No son rápidas mixes up the linking word — that is already a group without the speaker.',
        'pt-BR': 'No somos rápidas está correto: a ligação somos para um grupo que inclui quem fala, mais a qualidade terminada em -as para feminino. No somos rápidos confunde o gênero, No son rápidas confunde a ligação — isso já é um grupo sem quem fala.',
        vi: 'No somos rápidas đúng: từ nối somos cho nhóm gồm cả người nói, cộng với đặc điểm kết thúc bằng -as cho giống cái. No somos rápidos nhầm giống, No son rápidas nhầm từ nối — đó đã là nhóm không có người nói.',
        id: 'No somos rápidas benar: kata penghubung somos untuk kelompok yang mencakup penutur, ditambah sifat berakhiran -as untuk feminin. No somos rápidos salah gender, No son rápidas salah kata penghubung — itu sudah kelompok tanpa penutur.',
        tr: 'No somos rápidas doğrudur: konuşanı da içeren bir grup için somos bağlacı, artı dişil için -as ile biten nitelik. No somos rápidos cinsiyeti karıştırır, No son rápidas ise bağlacı karıştırır — bu zaten konuşanı içermeyen bir gruptur.',
        pl: 'No somos rápidas jest poprawne: łącznik somos dla grupy obejmującej mówiącą, plus cecha zakończona na -as dla rodzaju żeńskiego. No somos rápidos myli rodzaj, No son rápidas myli łącznik — to już grupa bez mówiącej.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'No перед связкой, somos и son не путать местами',
      uk: 'No перед зв’язкою, somos і son не плутати місцями',
      es: 'No before the linking word, do not mix up somos and son',
      'pt-BR': 'No antes da ligação, não confundir somos e son',
      vi: 'No trước từ nối, không nhầm somos và son',
      id: 'No sebelum kata penghubung, jangan tertukar somos dan son',
      tr: 'No bağlaçtan önce, somos ve son karıştırılmamalı',
      pl: 'No przed łącznikiem, nie mylić somos i son',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Частая ошибка — поставить no перед признаком, а не перед связкой: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. No всегда идёт первым. Вторая ловушка — перепутать somos и son: somos включает говорящего в группу, son — нет, отрицание это не меняет.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — поставити no перед ознакою, а не перед зв’язкою: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. No завжди йде першим. Друга пастка — переплутати somos і son: somos включає мовця в групу, son — ні, заперечення цього не змінює.', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is placing no before the quality instead of before the linking word: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. No always comes first. The second trap is mixing up somos and son: somos includes the speaker in the group, son does not, negation does not change this.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é colocar no antes da qualidade em vez de antes da ligação: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. No sempre vem primeiro. A segunda armadilha é confundir somos e son: somos inclui quem fala no grupo, son não, a negação não muda isso.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp là đặt no trước đặc điểm thay vì trước từ nối: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. No luôn đứng đầu. Bẫy thứ hai là nhầm somos với son: somos bao gồm người nói trong nhóm, son thì không, phủ định không thay đổi điều này.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah meletakkan no sebelum sifat, bukan sebelum kata penghubung: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ', bukan ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. No selalu datang pertama. Jebakan kedua adalah mengacaukan somos dan son: somos mencakup penutur dalam kelompok, son tidak, negasi tidak mengubah ini.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın bir hata, no’yu bağlaçtan önce değil, nitelikten önce koymaktır: ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: '. No her zaman önce gelir. İkinci tuzak, somos ile son’u karıştırmaktır: somos konuşanı gruba dahil eder, son etmez, olumsuzlama bunu değiştirmez.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd to postawienie no przed cechą zamiast przed łącznikiem: ', semantic: 'explanation' }, { text: 'Somos no caros', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'No somos caros', semantic: 'targetCorrect' }, { text: '. No zawsze idzie pierwsze. Druga pułapka to mylenie somos i son: somos obejmuje mówiącego w grupie, son nie, przeczenie tego nie zmienia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно отрицать цену дешёвых услуг своей группы?',
        uk: 'Як правильно заперечити ціну дешевих послуг своєї групи?',
        es: 'How do you correctly negate the price of your own group\'s inexpensive services?',
        'pt-BR': 'Como negar corretamente o preço dos serviços baratos do próprio grupo?',
        vi: 'Làm sao để phủ định đúng cách giá dịch vụ rẻ của nhóm mình?',
        id: 'Bagaimana cara menegasikan dengan benar harga layanan murah kelompok sendiri?',
        tr: 'Kendi grubunun ucuz hizmetlerinin fiyatı doğru nasıl olumsuzlanır?',
        pl: 'Jak poprawnie zaprzeczyć cenie tanich usług własnej grupy?',
      }),
      choices: [
        L({ ru: 'No somos caros', uk: 'No somos caros', es: 'No somos caros', 'pt-BR': 'No somos caros', vi: 'No somos caros', id: 'No somos caros', tr: 'No somos caros', pl: 'No somos caros' }),
        L({ ru: 'Somos no caros', uk: 'Somos no caros', es: 'Somos no caros', 'pt-BR': 'Somos no caros', vi: 'Somos no caros', id: 'Somos no caros', tr: 'Somos no caros', pl: 'Somos no caros' }),
        L({ ru: 'No son caros', uk: 'No son caros', es: 'No son caros', 'pt-BR': 'No son caros', vi: 'No son caros', id: 'No son caros', tr: 'No son caros', pl: 'No son caros' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No somos caros верно, потому что no стоит перед связкой somos, а сама связка — та, что включает говорящего в группу, о которой идёт речь.',
        uk: 'No somos caros правильно, бо no стоїть перед зв’язкою somos, а сама зв’язка — та, що включає мовця в групу, про яку йдеться.',
        es: 'No somos caros is correct because no stands before the linking word somos, and the linking word itself includes the speaker in the group being discussed.',
        'pt-BR': 'No somos caros está correto porque no fica antes da ligação somos, e a própria ligação inclui quem fala no grupo de que se fala.',
        vi: 'No somos caros đúng vì no đứng trước từ nối somos, và bản thân từ nối bao gồm người nói trong nhóm đang được nói tới.',
        id: 'No somos caros benar karena no berada sebelum kata penghubung somos, dan kata penghubung itu sendiri mencakup penutur dalam kelompok yang dibicarakan.',
        tr: 'No somos caros doğrudur çünkü no, somos bağlacından önce durur ve bağlacın kendisi, söz konusu olan gruba konuşanı da dahil eder.',
        pl: 'No somos caros jest poprawne, ponieważ no stoi przed łącznikiem somos, a sam łącznik obejmuje mówiącego w grupie, o której mowa.',
      }),
    },
  },
];
