import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 31 "Скажи вслух: про нас" / kind: 'voice', builtOn: [25, 26, 27],
// recalls: [25, 26, 27]): интро НЕ упоминает "сессию/урок/главу/курс/экран/
// карточку" ни в каком контексте (intro_meta_narration), по образцу сессий
// 7, 15, 23 (es_episode_01_session_23_intro_v1.ts). Тема — произношение
// somos вслух: слитное двусложное слово (so-mos), ударение на первом слоге,
// без растягивания на границе с признаком (Somos rápidos звучит одним
// дыханием, а не Somos | rápidos с паузой). В противовес уже изученному в
// сессии 15 восходящему тону вопроса и в сессии 23 уверенному ударению на
// признаке в конце утверждения — здесь фокус смещён на САМУ связку somos,
// потому что это первое множественное число, которое произносится вслух в
// этом курсе (сессии 7/15/23 работали с soy/es, ещё единственного числа).
// Каждое bodyRuns собрано ИЗ ТОГО ЖЕ текста, что и body, — никаких отдельных
// черновиков (см. проверочный скрипт в задаче).
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_31_VOICE_TITLE = L({
  ru: 'Скажи вслух: про нас',
  uk: 'Скажи вголос: про нас',
  es: 'Say it out loud: about us',
  'pt-BR': 'Diga em voz alta: sobre nós',
  vi: 'Nói to lên: về chúng tôi',
  id: 'Ucapkan dengan keras: tentang kami',
  tr: 'Yüksek sesle söyle: bizim hakkımızda',
  pl: 'Powiedz na głos: o nas',
});

export const ES_EPISODE_01_SESSION_31_VOICE_SUMMARY = L({
  ru: 'Знакомые фразы про «мы» звучат вслух, уверенным голосом, слитно и с ударением на первом слоге somos.',
  uk: 'Знайомі фрази про «ми» звучать уголос, упевненим голосом, злито і з наголосом на першому складі somos.',
  es: 'Familiar phrases about "we" are spoken out loud, in a confident voice, smoothly and with the stress on the first syllable of somos.',
  'pt-BR': 'Frases já conhecidas sobre "nós" são ditas em voz alta, com voz confiante, de forma fluida e com a tônica na primeira sílaba de somos.',
  vi: 'Những câu quen thuộc về "chúng tôi" được nói to lên, bằng giọng tự tin, liền mạch và nhấn vào âm tiết đầu của somos.',
  id: 'Frasa yang sudah dikenal tentang "kami" diucapkan dengan keras, dengan suara percaya diri, lancar dan dengan tekanan pada suku kata pertama somos.',
  tr: '"Biz" hakkındaki tanıdık ifadeler, kendinden emin bir sesle, akıcı biçimde ve somos’un ilk hecesine vurgu yapılarak yüksek sesle söylenir.',
  pl: 'Znane frazy o „my” brzmią na głos, pewnym głosem, płynnie i z akcentem na pierwszej sylabie somos.',
});

export const ES_EPISODE_01_SESSION_31_VOICE_GOAL = L({
  ru: 'Произносить somos слитно и с ударением на первом слоге, не растягивая паузу перед признаком.',
  uk: 'Вимовляти somos злито і з наголосом на першому складі, не розтягуючи паузу перед ознакою.',
  es: 'Pronounce somos smoothly and with the stress on the first syllable, without stretching a pause before the quality.',
  'pt-BR': 'Pronunciar somos de forma fluida e com a tônica na primeira sílaba, sem esticar uma pausa antes da qualidade.',
  vi: 'Phát âm somos liền mạch và nhấn vào âm tiết đầu, không kéo dài khoảng dừng trước đặc điểm.',
  id: 'Mengucapkan somos secara lancar dan dengan tekanan pada suku kata pertama, tanpa memperpanjang jeda sebelum sifat.',
  tr: 'Somos’u akıcı biçimde ve ilk heceye vurgu yaparak, nitelikten önce duraklamayı uzatmadan telaffuz etmek.',
  pl: 'Wymawiać somos płynnie i z akcentem na pierwszej sylabie, bez przeciągania pauzy przed cechą.',
});

const CONCEPT_BODY = L({
  ru: 'Somos — двусложное слово: SO-mos, ударение на первом слоге, как и в soy, eres, es. При переходе от одного человека к группе голос не должен спотыкаться на границе слова: Somos rápidos звучит одним слитным движением, без паузы между somos и rápidos. Пауза после связки — самая частая причина, по которой уверенная фраза звучит неуверенно вслух. Слитность важнее скорости: лучше сказать чуть медленнее, но без разрыва, чем быстро с запинкой посередине. Тренировка простая: сначала связка на своём месте ударения, затем без остановки — признак.',
  uk: 'Somos — двоскладове слово: SO-mos, наголос на першому складі, як і в soy, eres, es. При переході від однієї людини до групи голос не повинен спотикатися на межі слова: Somos rápidos звучить одним злитим рухом, без паузи між somos і rápidos. Пауза після зв’язки — найчастіша причина, чому впевнена фраза звучить невпевнено вголос. Злитість важливіша за швидкість: краще сказати трохи повільніше, але без розриву, ніж швидко із запинкою посередині. Тренування просте: спочатку зв’язка на своєму місці наголосу, потім без зупинки — ознака.',
  es: 'Somos is a two-syllable word: SO-mos, with the stress on the first syllable, just like soy, eres, es. When moving from one person to a group, the voice should not stumble at the word boundary: Somos rápidos sounds like one smooth movement, without a pause between somos and rápidos. A pause after the linking word is the most common reason a confident phrase sounds unsure out loud. Smoothness matters more than speed: it is better to speak a bit slower without a break than to speak fast with a stumble in the middle. The training is simple: first the linking word at its own stress point, then without stopping — the quality.',
  'pt-BR': 'Somos é uma palavra de duas sílabas: SO-mos, com a tônica na primeira sílaba, assim como soy, eres, es. Ao passar de uma pessoa para um grupo, a voz não deve tropeçar na fronteira da palavra: Somos rápidos soa como um só movimento fluido, sem pausa entre somos e rápidos. Uma pausa depois da ligação é a razão mais comum para uma frase confiante soar insegura em voz alta. A fluidez importa mais que a velocidade: é melhor falar um pouco mais devagar sem quebra do que falar rápido com um tropeço no meio. O treino é simples: primeiro a ligação em seu ponto de tônica, depois sem parar — a qualidade.',
  vi: 'Somos là từ hai âm tiết: SO-mos, trọng âm rơi vào âm tiết đầu, giống như soy, eres, es. Khi chuyển từ một người sang một nhóm, giọng nói không nên vấp ở ranh giới từ: Somos rápidos nghe như một chuyển động liền mạch, không có khoảng dừng giữa somos và rápidos. Khoảng dừng sau từ nối là lý do phổ biến nhất khiến một câu tự tin nghe không chắc chắn khi nói to. Sự liền mạch quan trọng hơn tốc độ: nói chậm hơn một chút mà không ngắt quãng còn tốt hơn nói nhanh mà vấp giữa chừng. Cách luyện tập rất đơn giản: đầu tiên là từ nối đúng trọng âm của nó, sau đó không dừng lại — đặc điểm.',
  id: 'Somos adalah kata dua suku kata: SO-mos, dengan tekanan pada suku kata pertama, sama seperti soy, eres, es. Saat beralih dari satu orang ke kelompok, suara tidak boleh tersendat di batas kata: Somos rápidos terdengar seperti satu gerakan yang lancar, tanpa jeda antara somos dan rápidos. Jeda setelah kata penghubung adalah alasan paling umum mengapa sebuah frasa yang percaya diri terdengar ragu-ragu saat diucapkan. Kelancaran lebih penting daripada kecepatan: lebih baik berbicara sedikit lebih lambat tanpa jeda daripada cepat dengan tersendat di tengah. Latihannya sederhana: pertama kata penghubung pada titik tekanannya sendiri, lalu tanpa berhenti — sifatnya.',
  tr: 'Somos iki heceli bir kelimedir: SO-mos, tıpkı soy, eres, es gibi vurgu ilk hecededir. Bir kişiden bir gruba geçerken ses, kelime sınırında takılmamalıdır: Somos rápidos, somos ile rápidos arasında duraklama olmadan tek akıcı bir hareket gibi duyulur. Bağlaçtan sonraki bir duraklama, kendinden emin bir ifadenin yüksek sesle kararsız gibi duyulmasının en yaygın nedenidir. Akıcılık, hızdan daha önemlidir: ortada takılarak hızlı konuşmaktansa, kopukluk olmadan biraz daha yavaş konuşmak daha iyidir. Alıştırma basittir: önce bağlaç kendi vurgu noktasında, sonra durmadan — nitelik.',
  pl: 'Somos to dwusylabowe słowo: SO-mos, akcent na pierwszej sylabie, tak jak w soy, eres, es. Przy przejściu od jednej osoby do grupy głos nie powinien się potykać na granicy słowa: Somos rápidos brzmi jak jeden płynny ruch, bez pauzy między somos a rápidos. Pauza po łączniku to najczęstszy powód, dla którego pewna fraza brzmi niepewnie na głos. Płynność liczy się bardziej niż szybkość: lepiej mówić trochę wolniej bez przerwy niż szybko z potknięciem pośrodku. Trening jest prosty: najpierw łącznik na swoim miejscu akcentu, potem bez zatrzymania — cecha.',
});

const FORMULA_BODY = L({
  ru: 'Формула звучания та же, что и у остальных связок: ударный слог связки плюс безостановочный переход к признаку. У somos ударение на SO, у soy на всё слово целиком (оно односложное), у es и eres — тоже на первом слоге. Разница между лицами — только в самой связке, ритм фразы вокруг неё не меняется: Soy rápido, Eres rápida, Es rápido, Somos rápidas — везде одна и та же плавная линия без пауз посередине. При отрицании ритм тоже сохраняется: No встаёт перед связкой отдельным лёгким ударом, а дальше — та же слитная линия, что и без отрицания.',
  uk: 'Формула звучання та сама, що й у решти зв’язок: наголошений склад зв’язки плюс безупинний перехід до ознаки. У somos наголос на SO, у soy — на все слово цілком (воно односкладове), у es та eres — теж на першому складі. Різниця між особами — лише в самій зв’язці, ритм фрази навколо неї не змінюється: Soy rápido, Eres rápida, Es rápido, Somos rápidas — усюди та сама плавна лінія без пауз посередині. При запереченні ритм теж зберігається: No стає перед зв’язкою окремим легким ударом, а далі — та сама злита лінія, що й без заперечення.',
  es: 'The sound formula is the same as for the other linking words: the stressed syllable of the linking word plus an uninterrupted move to the quality. Somos is stressed on SO, soy is stressed on the whole word (it is one syllable), and es and eres are also stressed on the first syllable. The difference between the persons is only in the linking word itself; the rhythm of the phrase around it does not change: Soy rápido, Eres rápida, Es rápido, Somos rápidas — everywhere the same smooth line without pauses in the middle. Under negation the rhythm is kept too: No comes before the linking word as a separate light beat, and then the same smooth line as without negation follows.',
  'pt-BR': 'A fórmula sonora é a mesma das outras ligações: a sílaba tônica da ligação mais uma transição ininterrupta até a qualidade. Somos tem a tônica em SO, soy tem a tônica na palavra inteira (é monossilábica), e es e eres também têm a tônica na primeira sílaba. A diferença entre as pessoas está só na ligação em si; o ritmo da frase ao redor dela não muda: Soy rápido, Eres rápida, Es rápido, Somos rápidas — em todo lugar a mesma linha fluida sem pausas no meio. Na negação o ritmo também se mantém: No vem antes da ligação como uma batida leve separada, e depois vem a mesma linha fluida de sem negação.',
  vi: 'Công thức âm thanh giống hệt như với các từ nối khác: âm tiết có trọng âm của từ nối cộng với chuyển động liên tục đến đặc điểm. Somos nhấn vào SO, soy nhấn vào cả từ (vì nó chỉ có một âm tiết), và es cùng eres cũng nhấn vào âm tiết đầu. Sự khác biệt giữa các ngôi chỉ nằm ở chính từ nối; nhịp điệu của câu xung quanh nó không đổi: Soy rápido, Eres rápida, Es rápido, Somos rápidas — ở đâu cũng cùng một đường liền mạch không ngắt quãng ở giữa. Khi phủ định, nhịp điệu cũng được giữ nguyên: No đứng trước từ nối như một nhịp nhẹ riêng biệt, rồi sau đó là cùng một đường liền mạch như không có phủ định.',
  id: 'Rumus bunyinya sama seperti kata penghubung lainnya: suku kata bertekanan dari kata penghubung ditambah transisi tanpa henti ke sifat. Somos bertekanan pada SO, soy bertekanan pada seluruh kata (satu suku kata), dan es serta eres juga bertekanan pada suku kata pertama. Perbedaan antar orang hanya pada kata penghubungnya sendiri; ritme frasa di sekelilingnya tidak berubah: Soy rápido, Eres rápida, Es rápido, Somos rápidas — di mana pun garis lancar yang sama tanpa jeda di tengah. Dalam negasi ritmenya juga dipertahankan: No datang sebelum kata penghubung sebagai ketukan ringan terpisah, lalu diikuti garis lancar yang sama seperti tanpa negasi.',
  tr: 'Ses formülü diğer bağlaçlarla aynıdır: bağlacın vurgulu hecesi artı niteliğe kesintisiz geçiş. Somos SO üzerinde vurgulanır, soy tüm kelime üzerinde vurgulanır (tek hecelidir) ve es ile eres de ilk hecede vurgulanır. Şahıslar arasındaki fark yalnızca bağlacın kendisindedir; ifadenin etrafındaki ritim değişmez: Soy rápido, Eres rápida, Es rápido, Somos rápidas — her yerde ortada duraklama olmadan aynı akıcı çizgi. Olumsuzlamada da ritim korunur: No, bağlaçtan önce ayrı hafif bir vuruş olarak gelir, ardından olumsuzlama olmadığı gibi aynı akıcı çizgi devam eder.',
  pl: 'Formuła brzmienia jest taka sama jak dla pozostałych łączników: akcentowana sylaba łącznika plus nieprzerwane przejście do cechy. Somos ma akcent na SO, soy ma akcent na całym słowie (jest jednosylabowe), a es i eres też mają akcent na pierwszej sylabie. Różnica między osobami leży tylko w samym łączniku; rytm frazy wokół niego się nie zmienia: Soy rápido, Eres rápida, Es rápido, Somos rápidas — wszędzie ta sama płynna linia bez pauz pośrodku. Przy przeczeniu rytm też jest zachowany: No staje przed łącznikiem jako osobne lekkie uderzenie, a potem następuje ta sama płynna linia co bez przeczenia.',
});

const TRAP_BODY = L({
  ru: 'Самая частая ошибка вслух — растянуть somos на три слога вместо двух, вставив лишний гласный звук между m и os. Проверка простая: SOmos, а не so-me-os — ровно два слога, как в soy плюс одна лишняя буква. Вторая ошибка — сделать паузу именно после somos перед признаком, будто это конец фразы: Somos... rápidos звучит как два отдельных слова, а не одна мысль. Признак идёт сразу следом, без остановки дыхания, точно так же, как soy rápido произносится одним движением. Ритм всей фразы важнее правильности каждого отдельного звука — лучше слитная фраза с небольшой неточностью, чем идеальные слова с разрывом между ними.',
  uk: 'Найчастіша помилка вголос — розтягнути somos на три склади замість двох, вставивши зайвий голосний звук між m та os. Перевірка проста: SOmos, а не so-me-os — рівно два склади, як у soy плюс одна зайва буква. Друга помилка — зробити паузу саме після somos перед ознакою, ніби це кінець фрази: Somos... rápidos звучить як два окремих слова, а не одна думка. Ознака йде одразу слідом, без зупинки дихання, точно так само, як soy rápido вимовляється одним рухом. Ритм усієї фрази важливіший за правильність кожного окремого звуку — краще злита фраза з невеликою неточністю, ніж ідеальні слова з розривом між ними.',
  es: 'The most common mistake out loud is stretching somos into three syllables instead of two, inserting an extra vowel sound between m and os. The check is simple: SOmos, not so-me-os — exactly two syllables, like soy plus one extra letter. The second mistake is pausing right after somos before the quality, as if it were the end of the phrase: Somos... rápidos sounds like two separate words, not one thought. The quality follows immediately, without a breath stop, the way soy rápido is said as one movement. The rhythm of the phrase matters more than the correctness of each sound — a smooth phrase with a small inaccuracy beats perfect words with a break between them.',
  'pt-BR': 'O erro mais comum em voz alta é esticar somos em três sílabas em vez de duas, inserindo um som vocálico extra entre o m e o os. A checagem é simples: SOmos, não so-me-os — exatamente duas sílabas, como soy mais uma letra a mais. O segundo erro é fazer uma pausa logo depois de somos antes da qualidade, como se fosse o fim da frase: Somos... rápidos soa como duas palavras separadas, não um único pensamento. A qualidade vem logo em seguida, sem parar para respirar, do jeito que soy rápido é dito como um único movimento. O ritmo da frase importa mais que a correção de cada som — uma frase fluida com uma pequena imprecisão é melhor que palavras perfeitas com uma quebra entre elas.',
  vi: 'Lỗi phổ biến nhất khi nói to là kéo dài somos thành ba âm tiết thay vì hai, chèn thêm một âm nguyên âm thừa giữa m và os. Cách kiểm tra đơn giản: SOmos, không phải so-me-os — đúng hai âm tiết, giống như soy cộng thêm một chữ cái. Lỗi thứ hai là dừng lại ngay sau somos trước đặc điểm, như thể đó là kết thúc câu: Somos... rápidos nghe như hai từ riêng biệt, không phải một ý nghĩ. Đặc điểm đi ngay sau đó, không dừng để thở, giống hệt cách soy rápido được nói như một chuyển động. Nhịp điệu của toàn câu quan trọng hơn độ chính xác của từng âm riêng lẻ — một câu liền mạch với một chút không chính xác tốt hơn những từ hoàn hảo bị ngắt quãng giữa chúng.',
  id: 'Kesalahan umum saat diucapkan: meregangkan somos menjadi tiga suku kata alih-alih dua, menyisipkan bunyi vokal tambahan antara m dan os. Pengecekannya sederhana: SOmos, bukan so-me-os — persis dua suku kata, seperti soy ditambah satu huruf ekstra. Kesalahan kedua adalah berhenti sejenak tepat setelah somos sebelum sifat, seolah itu akhir frasa: Somos... rápidos terdengar seperti dua kata terpisah, bukan satu pemikiran. Sifatnya langsung mengikuti, tanpa berhenti bernapas, seperti soy rápido diucapkan sebagai satu gerakan. Ritme frasa lebih penting daripada ketepatan tiap bunyi — frasa lancar dengan sedikit ketidaktepatan lebih baik daripada kata sempurna dengan jeda di antaranya.',
  tr: 'Yüksek sesle en yaygın hata, m ile os arasına fazladan bir ünlü sesi ekleyerek somos’u iki yerine üç heceye uzatmaktır. Kontrol basittir: SOmos, so-me-os değil — tam olarak iki hece, soy artı bir fazla harf gibi. İkinci hata, sanki ifade bitmiş gibi tam somos’tan sonra nitelikten önce duraklamaktır: Somos... rápidos, tek bir düşünce değil iki ayrı kelime gibi duyulur. Nitelik hemen ardından gelir, nefes almak için durmadan, tıpkı soy rápido’nun tek bir hareket olarak söylenmesi gibi. İfadenin tüm ritmi, her bir sesin doğruluğundan daha önemlidir — aralarında kopukluk olan mükemmel kelimelerden, küçük bir hatayla akıcı bir ifade daha iyidir.',
  pl: 'Najczęstszy błąd na głos to rozciągnięcie somos na trzy sylaby zamiast dwóch, wstawiając dodatkowy dźwięk samogłoskowy między m a os. Sprawdzenie jest proste: SOmos, nie so-me-os — dokładnie dwie sylaby, jak soy plus jedna dodatkowa litera. Drugi błąd to zrobienie pauzy tuż po somos przed cechą, jakby to był koniec frazy: Somos... rápidos brzmi jak dwa osobne słowa, a nie jedna myśl. Cecha następuje od razu, bez zatrzymania na oddech, dokładnie tak jak soy rápido jest wymawiane jako jeden ruch. Rytm całej frazy liczy się bardziej niż poprawność każdego pojedynczego dźwięku — płynna fraza z drobną niedokładnością jest lepsza niż idealne słowa z przerwą między nimi.',
});

export const ES_EPISODE_01_SESSION_31_VOICE_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Somos — два слога, одно слитное движение',
      uk: 'Somos — два склади, один злитий рух',
      es: 'Somos — two syllables, one smooth movement',
      'pt-BR': 'Somos — duas sílabas, um movimento fluido',
      vi: 'Somos — hai âm tiết, một chuyển động liền mạch',
      id: 'Somos — dua suku kata, satu gerakan lancar',
      tr: 'Somos — iki hece, tek akıcı hareket',
      pl: 'Somos — dwie sylaby, jeden płynny ruch',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Somos — двусложное слово: SO-mos, ударение на первом слоге, как и в soy, eres, es. При переходе от одного человека к группе голос не должен спотыкаться на границе слова: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' звучит одним слитным движением, без паузы между somos и rápidos. Пауза после связки — самая частая причина, по которой уверенная фраза звучит неуверенно вслух. Слитность важнее скорости: лучше сказать чуть медленнее, но без разрыва, чем быстро с запинкой посередине. Тренировка простая: сначала связка на своём месте ударения, затем без остановки — признак.', semantic: 'explanation' }),
      uk: R({ text: 'Somos — двоскладове слово: SO-mos, наголос на першому складі, як і в soy, eres, es. При переході від однієї людини до групи голос не повинен спотикатися на межі слова: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' звучить одним злитим рухом, без паузи між somos і rápidos. Пауза після зв’язки — найчастіша причина, чому впевнена фраза звучить невпевнено вголос. Злитість важливіша за швидкість: краще сказати трохи повільніше, але без розриву, ніж швидко із запинкою посередині. Тренування просте: спочатку зв’язка на своєму місці наголосу, потім без зупинки — ознака.', semantic: 'explanation' }),
      es: R({ text: 'Somos is a two-syllable word: SO-mos, with the stress on the first syllable, just like soy, eres, es. When moving from one person to a group, the voice should not stumble at the word boundary: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' sounds like one smooth movement, without a pause between somos and rápidos. A pause after the linking word is the most common reason a confident phrase sounds unsure out loud. Smoothness matters more than speed: it is better to speak a bit slower without a break than to speak fast with a stumble in the middle. The training is simple: first the linking word at its own stress point, then without stopping — the quality.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Somos é uma palavra de duas sílabas: SO-mos, com a tônica na primeira sílaba, assim como soy, eres, es. Ao passar de uma pessoa para um grupo, a voz não deve tropeçar na fronteira da palavra: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' soa como um só movimento fluido, sem pausa entre somos e rápidos. Uma pausa depois da ligação é a razão mais comum para uma frase confiante soar insegura em voz alta. A fluidez importa mais que a velocidade: é melhor falar um pouco mais devagar sem quebra do que falar rápido com um tropeço no meio. O treino é simples: primeiro a ligação em seu ponto de tônica, depois sem parar — a qualidade.', semantic: 'explanation' }),
      vi: R({ text: 'Somos là từ hai âm tiết: SO-mos, trọng âm rơi vào âm tiết đầu, giống như soy, eres, es. Khi chuyển từ một người sang một nhóm, giọng nói không nên vấp ở ranh giới từ: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' nghe như một chuyển động liền mạch, không có khoảng dừng giữa somos và rápidos. Khoảng dừng sau từ nối là lý do phổ biến nhất khiến một câu tự tin nghe không chắc chắn khi nói to. Sự liền mạch quan trọng hơn tốc độ: nói chậm hơn một chút mà không ngắt quãng còn tốt hơn nói nhanh mà vấp giữa chừng. Cách luyện tập rất đơn giản: đầu tiên là từ nối đúng trọng âm của nó, sau đó không dừng lại — đặc điểm.', semantic: 'explanation' }),
      id: R({ text: 'Somos adalah kata dua suku kata: SO-mos, dengan tekanan pada suku kata pertama, sama seperti soy, eres, es. Saat beralih dari satu orang ke kelompok, suara tidak boleh tersendat di batas kata: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' terdengar seperti satu gerakan yang lancar, tanpa jeda antara somos dan rápidos. Jeda setelah kata penghubung adalah alasan paling umum mengapa sebuah frasa yang percaya diri terdengar ragu-ragu saat diucapkan. Kelancaran lebih penting daripada kecepatan: lebih baik berbicara sedikit lebih lambat tanpa jeda daripada cepat dengan tersendat di tengah. Latihannya sederhana: pertama kata penghubung pada titik tekanannya sendiri, lalu tanpa berhenti — sifatnya.', semantic: 'explanation' }),
      tr: R({ text: 'Somos iki heceli bir kelimedir: SO-mos, tıpkı soy, eres, es gibi vurgu ilk hecededir. Bir kişiden bir gruba geçerken ses, kelime sınırında takılmamalıdır: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ', somos ile rápidos arasında duraklama olmadan tek akıcı bir hareket gibi duyulur. Bağlaçtan sonraki bir duraklama, kendinden emin bir ifadenin yüksek sesle kararsız gibi duyulmasının en yaygın nedenidir. Akıcılık, hızdan daha önemlidir: ortada takılarak hızlı konuşmaktansa, kopukluk olmadan biraz daha yavaş konuşmak daha iyidir. Alıştırma basittir: önce bağlaç kendi vurgu noktasında, sonra durmadan — nitelik.', semantic: 'explanation' }),
      pl: R({ text: 'Somos to dwusylabowe słowo: SO-mos, akcent na pierwszej sylabie, tak jak w soy, eres, es. Przy przejściu od jednej osoby do grupy głos nie powinien się potykać na granicy słowa: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' brzmi jak jeden płynny ruch, bez pauzy między somos a rápidos. Pauza po łączniku to najczęstszy powód, dla którego pewna fraza brzmi niepewnie na głos. Płynność liczy się bardziej niż szybkość: lepiej mówić trochę wolniej bez przerwy niż szybko z potknięciem pośrodku. Trening jest prosty: najpierw łącznik na swoim miejscu akcentu, potem bez zatrzymania — cecha.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как звучит уверенное «мы быстрые» слитно, без паузы?',
        uk: 'Як звучить впевнене «ми швидкі» злито, без паузи?',
        es: 'How does a confident "we are fast" sound smoothly, without a pause?',
        'pt-BR': 'Como soa um confiante "somos rápidos" de forma fluida, sem pausa?',
        vi: 'Câu tự tin "chúng tôi nhanh" nghe liền mạch, không dừng, là như thế nào?',
        id: 'Bagaimana "kami cepat" yang percaya diri terdengar lancar, tanpa jeda?',
        tr: 'Kendinden emin "biz hızlıyız" akıcı biçimde, duraksama olmadan nasıl duyulur?',
        pl: 'Jak brzmi pewne „jesteśmy szybcy” płynnie, bez pauzy?',
      }),
      choices: [
        L({ ru: 'Somos rápidos', uk: 'Somos rápidos', es: 'Somos rápidos', 'pt-BR': 'Somos rápidos', vi: 'Somos rápidos', id: 'Somos rápidos', tr: 'Somos rápidos', pl: 'Somos rápidos' }),
        L({ ru: 'Somos... rápidos', uk: 'Somos... rápidos', es: 'Somos... rápidos', 'pt-BR': 'Somos... rápidos', vi: 'Somos... rápidos', id: 'Somos... rápidos', tr: 'Somos... rápidos', pl: 'Somos... rápidos' }),
        L({ ru: 'So-me-os rápidos', uk: 'So-me-os rápidos', es: 'So-me-os rápidos', 'pt-BR': 'So-me-os rápidos', vi: 'So-me-os rápidos', id: 'So-me-os rápidos', tr: 'So-me-os rápidos', pl: 'So-me-os rápidos' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos rápidos слитно верно: два слога у somos (SO-mos), без паузы перед признаком и без лишнего гласного внутри слова.',
        uk: 'Somos rápidos злито правильно: два склади у somos (SO-mos), без паузи перед ознакою і без зайвого голосного всередині слова.',
        es: 'Somos rápidos smoothly is correct: two syllables in somos (SO-mos), no pause before the quality, and no extra vowel inside the word.',
        'pt-BR': 'Somos rápidos de forma fluida está correto: duas sílabas em somos (SO-mos), sem pausa antes da qualidade e sem vogal extra dentro da palavra.',
        vi: 'Somos rápidos liền mạch đúng: hai âm tiết trong somos (SO-mos), không dừng trước đặc điểm và không có nguyên âm thừa bên trong từ.',
        id: 'Somos rápidos secara lancar benar: dua suku kata dalam somos (SO-mos), tanpa jeda sebelum sifat, dan tanpa vokal ekstra di dalam kata.',
        tr: 'Somos rápidos akıcı biçimde doğrudur: somos içinde iki hece (SO-mos), nitelikten önce duraklama yok ve kelime içinde fazladan ünlü yok.',
        pl: 'Somos rápidos płynnie jest poprawne: dwie sylaby w somos (SO-mos), bez pauzy przed cechą i bez dodatkowej samogłoski wewnątrz słowa.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Один и тот же ритм у всех пяти связок',
      uk: 'Той самий ритм у всіх п’яти зв’язок',
      es: 'The same rhythm for all five linking words',
      'pt-BR': 'O mesmo ritmo para as cinco ligações',
      vi: 'Cùng một nhịp điệu cho cả năm từ nối',
      id: 'Ritme yang sama untuk kelima kata penghubung',
      tr: 'Beş bağlacın hepsi için aynı ritim',
      pl: 'Ten sam rytm dla wszystkich pięciu łączników',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула звучания та же, что и у остальных связок: ударный слог связки плюс безостановочный переход к признаку. У somos ударение на SO, у soy на всё слово целиком (оно односложное), у es и eres — тоже на первом слоге. Разница между лицами — только в самой связке, ритм фразы вокруг неё не меняется: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — везде одна и та же плавная линия без пауз посередине. При отрицании ритм тоже сохраняется: No встаёт перед связкой отдельным лёгким ударом, а дальше — та же слитная линия, что и без отрицания.', semantic: 'explanation' }),
      uk: R({ text: 'Формула звучання та сама, що й у решти зв’язок: наголошений склад зв’язки плюс безупинний перехід до ознаки. У somos наголос на SO, у soy — на все слово цілком (воно односкладове), у es та eres — теж на першому складі. Різниця між особами — лише в самій зв’язці, ритм фрази навколо неї не змінюється: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — усюди та сама плавна лінія без пауз посередині. При запереченні ритм теж зберігається: No стає перед зв’язкою окремим легким ударом, а далі — та сама злита лінія, що й без заперечення.', semantic: 'explanation' }),
      es: R({ text: 'The sound formula is the same as for the other linking words: the stressed syllable of the linking word plus an uninterrupted move to the quality. Somos is stressed on SO, soy is stressed on the whole word (it is one syllable), and es and eres are also stressed on the first syllable. The difference between the persons is only in the linking word itself; the rhythm of the phrase around it does not change: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — everywhere the same smooth line without pauses in the middle. Under negation the rhythm is kept too: No comes before the linking word as a separate light beat, and then the same smooth line as without negation follows.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula sonora é a mesma das outras ligações: a sílaba tônica da ligação mais uma transição ininterrupta até a qualidade. Somos tem a tônica em SO, soy tem a tônica na palavra inteira (é monossilábica), e es e eres também têm a tônica na primeira sílaba. A diferença entre as pessoas está só na ligação em si; o ritmo da frase ao redor dela não muda: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — em todo lugar a mesma linha fluida sem pausas no meio. Na negação o ritmo também se mantém: No vem antes da ligação como uma batida leve separada, e depois vem a mesma linha fluida de sem negação.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức âm thanh giống hệt như với các từ nối khác: âm tiết có trọng âm của từ nối cộng với chuyển động liên tục đến đặc điểm. Somos nhấn vào SO, soy nhấn vào cả từ (vì nó chỉ có một âm tiết), và es cùng eres cũng nhấn vào âm tiết đầu. Sự khác biệt giữa các ngôi chỉ nằm ở chính từ nối; nhịp điệu của câu xung quanh nó không đổi: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — ở đâu cũng cùng một đường liền mạch không ngắt quãng ở giữa. Khi phủ định, nhịp điệu cũng được giữ nguyên: No đứng trước từ nối như một nhịp nhẹ riêng biệt, rồi sau đó là cùng một đường liền mạch như không có phủ định.', semantic: 'explanation' }),
      id: R({ text: 'Rumus bunyinya sama seperti kata penghubung lainnya: suku kata bertekanan dari kata penghubung ditambah transisi tanpa henti ke sifat. Somos bertekanan pada SO, soy bertekanan pada seluruh kata (satu suku kata), dan es serta eres juga bertekanan pada suku kata pertama. Perbedaan antar orang hanya pada kata penghubungnya sendiri; ritme frasa di sekelilingnya tidak berubah: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — di mana pun garis lancar yang sama tanpa jeda di tengah. Dalam negasi ritmenya juga dipertahankan: No datang sebelum kata penghubung sebagai ketukan ringan terpisah, lalu diikuti garis lancar yang sama seperti tanpa negasi.', semantic: 'explanation' }),
      tr: R({ text: 'Ses formülü diğer bağlaçlarla aynıdır: bağlacın vurgulu hecesi artı niteliğe kesintisiz geçiş. Somos SO üzerinde vurgulanır, soy tüm kelime üzerinde vurgulanır (tek hecelidir) ve es ile eres de ilk hecede vurgulanır. Şahıslar arasındaki fark yalnızca bağlacın kendisindedir; ifadenin etrafındaki ritim değişmez: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — her yerde ortada duraklama olmadan aynı akıcı çizgi. Olumsuzlamada da ritim korunur: No, bağlaçtan önce ayrı hafif bir vuruş olarak gelir, ardından olumsuzlama olmadığı gibi aynı akıcı çizgi devam eder.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła brzmienia jest taka sama jak dla pozostałych łączników: akcentowana sylaba łącznika plus nieprzerwane przejście do cechy. Somos ma akcent na SO, soy ma akcent na całym słowie (jest jednosylabowe), a es i eres też mają akcent na pierwszej sylabie. Różnica między osobami leży tylko w samym łączniku; rytm frazy wokół niego się nie zmienia: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — wszędzie ta sama płynna linia bez pauz pośrodku. Przy przeczeniu rytm też jest zachowany: No staje przed łącznikiem jako osobne lekkie uderzenie, a potem następuje ta sama płynna linia co bez przeczenia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Про группу женского рода, включая говорящую, — как звучит уверенное «мы быстрые»?',
        uk: 'Про групу жіночого роду, включно з мовицею, — як звучить впевнене «ми швидкі»?',
        es: 'About a feminine group that includes the speaker — how does a confident "we are fast" sound?',
        'pt-BR': 'Sobre um grupo feminino que inclui quem fala — como soa um confiante "somos rápidas"?',
        vi: 'Về nhóm giống cái gồm cả người nói — câu tự tin "chúng tôi nhanh" nghe thế nào?',
        id: 'Tentang kelompok feminin yang mencakup penutur — bagaimana "kami cepat" yang percaya diri terdengar?',
        tr: 'Konuşanı da içeren dişil bir grup hakkında — kendinden emin "biz hızlıyız" nasıl duyulur?',
        pl: 'O grupie żeńskiej obejmującej mówiącą — jak brzmi pewne „jesteśmy szybkie”?',
      }),
      choices: [
        L({ ru: 'Somos rápidas', uk: 'Somos rápidas', es: 'Somos rápidas', 'pt-BR': 'Somos rápidas', vi: 'Somos rápidas', id: 'Somos rápidas', tr: 'Somos rápidas', pl: 'Somos rápidas' }),
        L({ ru: 'Somos rápidos', uk: 'Somos rápidos', es: 'Somos rápidos', 'pt-BR': 'Somos rápidos', vi: 'Somos rápidos', id: 'Somos rápidos', tr: 'Somos rápidos', pl: 'Somos rápidos' }),
        L({ ru: 'Son rápidas', uk: 'Son rápidas', es: 'Son rápidas', 'pt-BR': 'Son rápidas', vi: 'Son rápidas', id: 'Son rápidas', tr: 'Son rápidas', pl: 'Son rápidas' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Somos rápidas верно: связка somos для группы, включающей говорящую, плюс признак с окончанием -as для женского рода — тот же двусложный ритм SO-mos, что и у мужского рода.',
        uk: 'Somos rápidas правильно: зв’язка somos для групи, що включає мовицю, плюс ознака із закінченням -as для жіночого роду — той самий двоскладовий ритм SO-mos, що й у чоловічого роду.',
        es: 'Somos rápidas is correct: the linking word somos for a group that includes the speaker, plus the quality ending in -as for feminine — the same two-syllable SO-mos rhythm as for masculine.',
        'pt-BR': 'Somos rápidas está correto: a ligação somos para um grupo que inclui quem fala, mais a qualidade terminada em -as para feminino — o mesmo ritmo de duas sílabas SO-mos do masculino.',
        vi: 'Somos rápidas đúng: từ nối somos cho nhóm gồm cả người nói, cộng với đặc điểm kết thúc bằng -as cho giống cái — cùng nhịp hai âm tiết SO-mos như giống đực.',
        id: 'Somos rápidas benar: kata penghubung somos untuk kelompok yang mencakup penutur, ditambah sifat berakhiran -as untuk feminin — ritme dua suku kata SO-mos yang sama seperti maskulin.',
        tr: 'Somos rápidas doğrudur: konuşanı da içeren bir grup için somos bağlacı, artı dişil için -as ile biten nitelik — eril için olduğu gibi aynı iki heceli SO-mos ritmi.',
        pl: 'Somos rápidas jest poprawne: łącznik somos dla grupy obejmującej mówiącą, plus cecha zakończona na -as dla rodzaju żeńskiego — ten sam dwusylabowy rytm SO-mos co dla rodzaju męskiego.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не растягивать somos и не рвать фразу паузой',
      uk: 'Не розтягувати somos і не рвати фразу паузою',
      es: 'Do not stretch somos and do not break the phrase with a pause',
      'pt-BR': 'Não esticar somos e não quebrar a frase com uma pausa',
      vi: 'Không kéo dài somos và không ngắt câu bằng khoảng dừng',
      id: 'Jangan meregangkan somos dan jangan memutus frasa dengan jeda',
      tr: 'Somos’u uzatma ve ifadeyi duraklamayla bölme',
      pl: 'Nie rozciągać somos i nie przerywać frazy pauzą',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Самая частая ошибка вслух — растянуть somos на три слога вместо двух, вставив лишний гласный звук между m и os. Проверка простая: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', а не ', semantic: 'explanation' }, { text: 'so-me-os', semantic: 'targetWrong' }, { text: ' — ровно два слога, как в soy плюс одна лишняя буква. Вторая ошибка — сделать паузу именно после somos перед признаком, будто это конец фразы: Somos... rápidos звучит как два отдельных слова, а не одна мысль. Признак идёт сразу следом, без остановки дыхания, точно так же, как soy rápido произносится одним движением. Ритм всей фразы важнее правильности каждого отдельного звука — лучше слитная фраза с небольшой неточностью, чем идеальные слова с разрывом между ними.', semantic: 'explanation' }),
      uk: R({ text: 'Найчастіша помилка вголос — розтягнути somos на три склади замість двох, вставивши зайвий голосний звук між m та os. Перевірка проста: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', а не ', semantic: 'explanation' }, { text: 'so-me-os', semantic: 'targetWrong' }, { text: ' — рівно два склади, як у soy плюс одна зайва буква. Друга помилка — зробити паузу саме після somos перед ознакою, ніби це кінець фрази: Somos... rápidos звучить як два окремих слова, а не одна думка. Ознака йде одразу слідом, без зупинки дихання, точно так само, як soy rápido вимовляється одним рухом. Ритм усієї фрази важливіший за правильність кожного окремого звуку — краще злита фраза з невеликою неточністю, ніж ідеальні слова з розривом між ними.', semantic: 'explanation' }),
      es: R({ text: 'The most common mistake out loud is stretching somos into three syllables instead of two, inserting an extra vowel sound between m and os. The check is simple: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', not ', semantic: 'explanation' }, { text: 'so-me-os', semantic: 'targetWrong' }, { text: ' — exactly two syllables, like soy plus one extra letter. The second mistake is pausing right after somos before the quality, as if it were the end of the phrase: Somos... rápidos sounds like two separate words, not one thought. The quality follows immediately, without a breath stop, the way soy rápido is said as one movement. The rhythm of the phrase matters more than the correctness of each sound — a smooth phrase with a small inaccuracy beats perfect words with a break between them.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O erro mais comum em voz alta é esticar somos em três sílabas em vez de duas, inserindo um som vocálico extra entre o m e o os. A checagem é simples: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', não ', semantic: 'explanation' }, { text: 'so-me-os', semantic: 'targetWrong' }, { text: ' — exatamente duas sílabas, como soy mais uma letra a mais. O segundo erro é fazer uma pausa logo depois de somos antes da qualidade, como se fosse o fim da frase: Somos... rápidos soa como duas palavras separadas, não um único pensamento. A qualidade vem logo em seguida, sem parar para respirar, do jeito que soy rápido é dito como um único movimento. O ritmo da frase importa mais que a correção de cada som — uma frase fluida com uma pequena imprecisão é melhor que palavras perfeitas com uma quebra entre elas.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi phổ biến nhất khi nói to là kéo dài somos thành ba âm tiết thay vì hai, chèn thêm một âm nguyên âm thừa giữa m và os. Cách kiểm tra đơn giản: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', không phải ', semantic: 'explanation' }, { text: 'so-me-os', semantic: 'targetWrong' }, { text: ' — đúng hai âm tiết, giống như soy cộng thêm một chữ cái. Lỗi thứ hai là dừng lại ngay sau somos trước đặc điểm, như thể đó là kết thúc câu: Somos... rápidos nghe như hai từ riêng biệt, không phải một ý nghĩ. Đặc điểm đi ngay sau đó, không dừng để thở, giống hệt cách soy rápido được nói như một chuyển động. Nhịp điệu của toàn câu quan trọng hơn độ chính xác của từng âm riêng lẻ — một câu liền mạch với một chút không chính xác tốt hơn những từ hoàn hảo bị ngắt quãng giữa chúng.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum saat diucapkan: meregangkan somos menjadi tiga suku kata alih-alih dua, menyisipkan bunyi vokal tambahan antara m dan os. Pengecekannya sederhana: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', bukan ', semantic: 'explanation' }, { text: 'so-me-os', semantic: 'targetWrong' }, { text: ' — persis dua suku kata, seperti soy ditambah satu huruf ekstra. Kesalahan kedua adalah berhenti sejenak tepat setelah somos sebelum sifat, seolah itu akhir frasa: Somos... rápidos terdengar seperti dua kata terpisah, bukan satu pemikiran. Sifatnya langsung mengikuti, tanpa berhenti bernapas, seperti soy rápido diucapkan sebagai satu gerakan. Ritme frasa lebih penting daripada ketepatan tiap bunyi — frasa lancar dengan sedikit ketidaktepatan lebih baik daripada kata sempurna dengan jeda di antaranya.', semantic: 'explanation' }),
      tr: R({ text: 'Yüksek sesle en yaygın hata, m ile os arasına fazladan bir ünlü sesi ekleyerek somos’u iki yerine üç heceye uzatmaktır. Kontrol basittir: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'so-me-os', semantic: 'targetWrong' }, { text: ' değil — tam olarak iki hece, soy artı bir fazla harf gibi. İkinci hata, sanki ifade bitmiş gibi tam somos’tan sonra nitelikten önce duraklamaktır: Somos... rápidos, tek bir düşünce değil iki ayrı kelime gibi duyulur. Nitelik hemen ardından gelir, nefes almak için durmadan, tıpkı soy rápido’nun tek bir hareket olarak söylenmesi gibi. İfadenin tüm ritmi, her bir sesin doğruluğundan daha önemlidir — aralarında kopukluk olan mükemmel kelimelerden, küçük bir hatayla akıcı bir ifade daha iyidir.', semantic: 'explanation' }),
      pl: R({ text: 'Najczęstszy błąd na głos to rozciągnięcie somos na trzy sylaby zamiast dwóch, wstawiając dodatkowy dźwięk samogłoskowy między m a os. Sprawdzenie jest proste: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', nie ', semantic: 'explanation' }, { text: 'so-me-os', semantic: 'targetWrong' }, { text: ' — dokładnie dwie sylaby, jak soy plus jedna dodatkowa litera. Drugi błąd to zrobienie pauzy tuż po somos przed cechą, jakby to był koniec frazy: Somos... rápidos brzmi jak dwa osobne słowa, a nie jedna myśl. Cecha następuje od razu, bez zatrzymania na oddech, dokładnie tak jak soy rápido jest wymawiane jako jeden ruch. Rytm całej frazy liczy się bardziej niż poprawność każdego pojedynczego dźwięku — płynna fraza z drobną niedokładnością jest lepsza niż idealne słowa z przerwą między nimi.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Сколько слогов правильно услышать в somos: SOmos или so-me-os?',
        uk: 'Скільки складів правильно почути в somos: SOmos чи so-me-os?',
        es: 'How many syllables should you hear in somos: SOmos or so-me-os?',
        'pt-BR': 'Quantas sílabas se deve ouvir em somos: SOmos ou so-me-os?',
        vi: 'Nên nghe bao nhiêu âm tiết trong somos: SOmos hay so-me-os?',
        id: 'Berapa suku kata yang seharusnya terdengar dalam somos: SOmos atau so-me-os?',
        tr: 'Somos’ta kaç hece duyulmalı: SOmos mu yoksa so-me-os mu?',
        pl: 'Ile sylab powinno być słychać w somos: SOmos czy so-me-os?',
      }),
      choices: [
        L({ ru: 'SOmos', uk: 'SOmos', es: 'SOmos', 'pt-BR': 'SOmos', vi: 'SOmos', id: 'SOmos', tr: 'SOmos', pl: 'SOmos' }),
        L({ ru: 'so-me-os', uk: 'so-me-os', es: 'so-me-os', 'pt-BR': 'so-me-os', vi: 'so-me-os', id: 'so-me-os', tr: 'so-me-os', pl: 'so-me-os' }),
        L({ ru: 'so-mo-si', uk: 'so-mo-si', es: 'so-mo-si', 'pt-BR': 'so-mo-si', vi: 'so-mo-si', id: 'so-mo-si', tr: 'so-mo-si', pl: 'so-mo-si' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'SOmos верно: ровно два слога, ударение на первом, без лишнего гласного звука между m и os. So-me-os и so-mo-si — растянутые ошибки вслух, лишние звуки там, где их не должно быть.',
        uk: 'SOmos правильно: рівно два склади, наголос на першому, без зайвого голосного звуку між m та os. So-me-os та so-mo-si — розтягнуті помилки вголос, зайві звуки там, де їх не повинно бути.',
        es: 'SOmos is correct: exactly two syllables, stressed on the first, with no extra vowel sound between m and os. So-me-os and so-mo-si are stretched mistakes spoken out loud, extra sounds where none should be.',
        'pt-BR': 'SOmos está correto: exatamente duas sílabas, tônica na primeira, sem som vocálico extra entre o m e o os. So-me-os e so-mo-si são erros esticados em voz alta, sons extras onde não deveria haver nenhum.',
        vi: 'SOmos đúng: đúng hai âm tiết, trọng âm ở âm tiết đầu, không có âm nguyên âm thừa giữa m và os. So-me-os và so-mo-si là lỗi kéo dài khi nói to, âm thừa ở nơi không nên có.',
        id: 'SOmos benar: persis dua suku kata, tekanan pada yang pertama, tanpa bunyi vokal ekstra antara m dan os. So-me-os dan so-mo-si adalah kesalahan yang diregangkan saat diucapkan, bunyi ekstra di tempat yang seharusnya tidak ada.',
        tr: 'SOmos doğrudur: tam olarak iki hece, vurgu ilkinde, m ile os arasında fazladan ünlü sesi yok. So-me-os ve so-mo-si, yüksek sesle söylenen uzatılmış hatalardır, olmaması gereken yerde fazladan sesler.',
        pl: 'SOmos jest poprawne: dokładnie dwie sylaby, akcent na pierwszej, bez dodatkowego dźwięku samogłoskowego między m a os. So-me-os i so-mo-si to rozciągnięte błędy na głos, dodatkowe dźwięki tam, gdzie ich być nie powinno.',
      }),
    },
  },
];
