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
  ru: 'Somos — двусложное слово: SO-mos, ударение на первом слоге, как в soy, eres, es. Голос не должен спотыкаться на границе слова: Somos rápidos звучит одним слитным движением, без паузы. Пауза после связки — частая причина, почему уверенная фраза звучит неуверенно вслух.',
  uk: 'Somos — двоскладове слово: SO-mos, наголос на першому складі, як у soy, eres, es. Голос не повинен спотикатися на межі слова: Somos rápidos звучить одним злитим рухом, без паузи. Пауза після зв’язки — часта причина, чому впевнена фраза звучить невпевнено вголос.',
  es: 'Somos is a two-syllable word: SO-mos, stressed on the first syllable, like soy, eres, es. The voice should not stumble at the word boundary: Somos rápidos sounds like one smooth movement, without a pause. A pause after the linking word is a common reason a confident phrase sounds unsure out loud.',
  'pt-BR': 'Somos é uma palavra de duas sílabas: SO-mos, com a tônica na primeira sílaba, como soy, eres, es. A voz não deve tropeçar na fronteira da palavra: Somos rápidos soa como um só movimento fluido, sem pausa. Uma pausa depois da ligação é uma razão comum para uma frase confiante soar insegura em voz alta.',
  vi: 'Somos là từ hai âm tiết: SO-mos, trọng âm ở âm tiết đầu, giống soy, eres, es. Giọng nói không nên vấp ở ranh giới từ: Somos rápidos nghe như một chuyển động liền mạch, không dừng. Khoảng dừng sau từ nối là lý do phổ biến khiến câu tự tin nghe không chắc chắn khi nói to.',
  id: 'Somos adalah kata dua suku kata: SO-mos, tekanan pada suku kata pertama, seperti soy, eres, es. Suara tidak boleh tersendat di batas kata: Somos rápidos terdengar seperti satu gerakan lancar, tanpa jeda. Jeda setelah kata penghubung adalah alasan umum mengapa frasa percaya diri terdengar ragu saat diucapkan.',
  tr: 'Somos iki heceli bir kelimedir: SO-mos, soy, eres, es gibi ilk hecede vurgulanır. Ses, kelime sınırında takılmamalıdır: Somos rápidos, duraklama olmadan tek akıcı bir hareket gibi duyulur. Bağlaçtan sonraki duraklama, kendinden emin bir ifadenin yüksek sesle kararsız duyulmasının yaygın nedenidir.',
  pl: 'Somos to dwusylabowe słowo: SO-mos, akcent na pierwszej sylabie, jak w soy, eres, es. Głos nie powinien się potykać na granicy słowa: Somos rápidos brzmi jak jeden płynny ruch, bez pauzy. Pauza po łączniku to częsty powód, dla którego pewna fraza brzmi niepewnie na głos.',
});

const FORMULA_BODY = L({
  ru: 'Формула звучания та же, что и у остальных связок: ударный слог связки плюс безостановочный переход к признаку. У somos ударение на SO. Разница между лицами — только в связке, ритм не меняется: Soy rápido, Eres rápida, Es rápido, Somos rápidas — одна плавная линия без пауз.',
  uk: 'Формула звучання та сама, що й у решти зв’язок: наголошений склад зв’язки плюс безупинний перехід до ознаки. У somos наголос на SO. Різниця між особами — лише у зв’язці, ритм не змінюється: Soy rápido, Eres rápida, Es rápido, Somos rápidas — одна плавна лінія без пауз.',
  es: 'The sound formula is the same as for other linking words: the stressed syllable plus an uninterrupted move to the quality. Somos is stressed on SO. The difference between persons is only in the linking word; the rhythm does not change: Soy rápido, Eres rápida, Es rápido, Somos rápidas — one smooth line.',
  'pt-BR': 'A fórmula sonora é a mesma das outras ligações: a sílaba tônica mais uma transição ininterrupta até a qualidade. Somos tem a tônica em SO. A diferença entre as pessoas está só na ligação; o ritmo não muda: Soy rápido, Eres rápida, Es rápido, Somos rápidas — uma linha fluida sem pausas.',
  vi: 'Công thức âm thanh giống các từ nối khác: âm tiết trọng âm cộng chuyển động liên tục đến đặc điểm. Somos nhấn vào SO. Khác biệt giữa các ngôi chỉ ở từ nối, nhịp điệu không đổi: Soy rápido, Eres rápida, Es rápido, Somos rápidas — một đường liền mạch không ngắt quãng.',
  id: 'Rumus bunyinya sama seperti kata penghubung lainnya: suku kata bertekanan ditambah transisi tanpa henti ke sifat. Somos bertekanan pada SO. Perbedaan antar orang hanya pada kata penghubungnya, ritmenya tidak berubah: Soy rápido, Eres rápida, Es rápido, Somos rápidas — satu garis lancar tanpa jeda.',
  tr: 'Ses formülü diğer bağlaçlarla aynıdır: vurgulu hece artı niteliğe kesintisiz geçiş. Somos SO üzerinde vurgulanır. Şahıslar arasındaki fark yalnızca bağlaçtadır, ritim değişmez: Soy rápido, Eres rápida, Es rápido, Somos rápidas — duraklamasız tek akıcı çizgi.',
  pl: 'Formuła brzmienia jest taka sama jak dla pozostałych łączników: akcentowana sylaba plus nieprzerwane przejście do cechy. Somos ma akcent na SO. Różnica między osobami leży tylko w łączniku, rytm się nie zmienia: Soy rápido, Eres rápida, Es rápido, Somos rápidas — jedna płynna linia bez pauz.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — растянуть somos на три слога вместо двух, добавив лишний звук в середину. Проверка простая: SOmos, ровно два слога. Вторая ошибка — пауза после somos перед признаком: Somos, rápidos звучит как два слова, а не одна мысль.',
  uk: 'Часта помилка — розтягнути somos на три склади замість двох, додавши зайвий звук усередину. Перевірка проста: SOmos, рівно два склади. Друга помилка — пауза після somos перед ознакою: Somos, rápidos звучить як два слова, а не одна думка.',
  es: 'A common mistake is stretching somos into three syllables instead of two: SOmos, not somemos. The second mistake is a pause after somos before the quality: Somos, rápidos sounds like two words, not one thought. The quality follows immediately, without a breath stop.',
  'pt-BR': 'Um erro comum é esticar somos em três sílabas em vez de duas: SOmos, não somemos. O segundo erro é uma pausa depois de somos antes da qualidade: Somos, rápidos soa como duas palavras, não um pensamento. A qualidade vem logo em seguida, sem parar para respirar.',
  vi: 'Lỗi thường gặp là kéo dài somos thành ba âm tiết thay vì hai: SOmos, không phải somemos. Lỗi thứ hai là dừng sau somos trước đặc điểm: Somos, rápidos nghe như hai từ, không phải một ý. Đặc điểm đi ngay sau đó, không dừng để thở.',
  id: 'Kesalahan umum adalah meregangkan somos menjadi tiga suku kata, bukan dua: SOmos, bukan somemos. Kesalahan kedua adalah jeda setelah somos sebelum sifat: Somos, rápidos terdengar seperti dua kata, bukan satu pemikiran. Sifatnya langsung mengikuti, tanpa berhenti bernapas.',
  tr: 'Yaygın bir hata, somos’u iki yerine üç heceye uzatmaktır: SOmos, somemos değil. İkinci hata, somos’tan sonra nitelikten önce duraklamaktır: Somos, rápidos tek bir düşünce değil iki kelime gibi duyulur. Nitelik hemen ardından gelir, nefes almak için durmadan.',
  pl: 'Częsty błąd to rozciągnięcie somos na trzy sylaby zamiast dwóch: SOmos, nie somemos. Drugi błąd to pauza po somos przed cechą: Somos, rápidos brzmi jak dwa słowa, a nie jedna myśl. Cecha następuje od razu, bez zatrzymania na oddech.',
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
      ru: R({ text: 'Somos — двусложное слово: SO-mos, ударение на первом слоге, как в soy, eres, es. Голос не должен спотыкаться на границе слова: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' звучит одним слитным движением, без паузы. Пауза после связки — частая причина, почему уверенная фраза звучит неуверенно вслух.', semantic: 'explanation' }),
      uk: R({ text: 'Somos — двоскладове слово: SO-mos, наголос на першому складі, як у soy, eres, es. Голос не повинен спотикатися на межі слова: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' звучить одним злитим рухом, без паузи. Пауза після зв’язки — часта причина, чому впевнена фраза звучить невпевнено вголос.', semantic: 'explanation' }),
      es: R({ text: 'Somos is a two-syllable word: SO-mos, stressed on the first syllable, like soy, eres, es. The voice should not stumble at the word boundary: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' sounds like one smooth movement, without a pause. A pause after the linking word is a common reason a confident phrase sounds unsure out loud.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Somos é uma palavra de duas sílabas: SO-mos, com a tônica na primeira sílaba, como soy, eres, es. A voz não deve tropeçar na fronteira da palavra: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' soa como um só movimento fluido, sem pausa. Uma pausa depois da ligação é uma razão comum para uma frase confiante soar insegura em voz alta.', semantic: 'explanation' }),
      vi: R({ text: 'Somos là từ hai âm tiết: SO-mos, trọng âm ở âm tiết đầu, giống soy, eres, es. Giọng nói không nên vấp ở ranh giới từ: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' nghe như một chuyển động liền mạch, không dừng. Khoảng dừng sau từ nối là lý do phổ biến khiến câu tự tin nghe không chắc chắn khi nói to.', semantic: 'explanation' }),
      id: R({ text: 'Somos adalah kata dua suku kata: SO-mos, tekanan pada suku kata pertama, seperti soy, eres, es. Suara tidak boleh tersendat di batas kata: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' terdengar seperti satu gerakan lancar, tanpa jeda. Jeda setelah kata penghubung adalah alasan umum mengapa frasa percaya diri terdengar ragu saat diucapkan.', semantic: 'explanation' }),
      tr: R({ text: 'Somos iki heceli bir kelimedir: SO-mos, soy, eres, es gibi ilk hecede vurgulanır. Ses, kelime sınırında takılmamalıdır: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ', duraklama olmadan tek akıcı bir hareket gibi duyulur. Bağlaçtan sonraki duraklama, kendinden emin bir ifadenin yüksek sesle kararsız duyulmasının yaygın nedenidir.', semantic: 'explanation' }),
      pl: R({ text: 'Somos to dwusylabowe słowo: SO-mos, akcent na pierwszej sylabie, jak w soy, eres, es. Głos nie powinien się potykać na granicy słowa: ', semantic: 'explanation' }, { text: 'Somos rápidos', semantic: 'targetCorrect' }, { text: ' brzmi jak jeden płynny ruch, bez pauzy. Pauza po łączniku to częsty powód, dla którego pewna fraza brzmi niepewnie na głos.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула звучания та же, что и у остальных связок: ударный слог связки плюс безостановочный переход к признаку. У somos ударение на SO. Разница между лицами — только в связке, ритм не меняется: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — одна плавная линия без пауз.', semantic: 'explanation' }),
      uk: R({ text: 'Формула звучання та сама, що й у решти зв’язок: наголошений склад зв’язки плюс безупинний перехід до ознаки. У somos наголос на SO. Різниця між особами — лише у зв’язці, ритм не змінюється: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — одна плавна лінія без пауз.', semantic: 'explanation' }),
      es: R({ text: 'The sound formula is the same as for other linking words: the stressed syllable plus an uninterrupted move to the quality. Somos is stressed on SO. The difference between persons is only in the linking word; the rhythm does not change: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — one smooth line.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula sonora é a mesma das outras ligações: a sílaba tônica mais uma transição ininterrupta até a qualidade. Somos tem a tônica em SO. A diferença entre as pessoas está só na ligação; o ritmo não muda: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — uma linha fluida sem pausas.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức âm thanh giống các từ nối khác: âm tiết trọng âm cộng chuyển động liên tục đến đặc điểm. Somos nhấn vào SO. Khác biệt giữa các ngôi chỉ ở từ nối, nhịp điệu không đổi: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — một đường liền mạch không ngắt quãng.', semantic: 'explanation' }),
      id: R({ text: 'Rumus bunyinya sama seperti kata penghubung lainnya: suku kata bertekanan ditambah transisi tanpa henti ke sifat. Somos bertekanan pada SO. Perbedaan antar orang hanya pada kata penghubungnya, ritmenya tidak berubah: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — satu garis lancar tanpa jeda.', semantic: 'explanation' }),
      tr: R({ text: 'Ses formülü diğer bağlaçlarla aynıdır: vurgulu hece artı niteliğe kesintisiz geçiş. Somos SO üzerinde vurgulanır. Şahıslar arasındaki fark yalnızca bağlaçtadır, ritim değişmez: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — duraklamasız tek akıcı çizgi.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła brzmienia jest taka sama jak dla pozostałych łączników: akcentowana sylaba plus nieprzerwane przejście do cechy. Somos ma akcent na SO. Różnica między osobami leży tylko w łączniku, rytm się nie zmienia: Soy rápido, Eres rápida, Es rápido, ', semantic: 'explanation' }, { text: 'Somos rápidas', semantic: 'targetCorrect' }, { text: ' — jedna płynna linia bez pauz.', semantic: 'explanation' }),
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
      ru: R({ text: 'Частая ошибка — растянуть somos на три слога вместо двух, добавив лишний звук в середину. Проверка простая: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', ровно два слога. Вторая ошибка — пауза после somos перед признаком: Somos, rápidos звучит как два слова, а не одна мысль.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — розтягнути somos на три склади замість двох, додавши зайвий звук усередину. Перевірка проста: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', рівно два склади. Друга помилка — пауза після somos перед ознакою: Somos, rápidos звучить як два слова, а не одна думка.', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is stretching somos into three syllables instead of two: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', not ', semantic: 'explanation' }, { text: 'somemos', semantic: 'targetWrong' }, { text: '. The second mistake is a pause after somos before the quality: Somos, rápidos sounds like two words, not one thought. The quality follows immediately, without a breath stop.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é esticar somos em três sílabas em vez de duas: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', não ', semantic: 'explanation' }, { text: 'somemos', semantic: 'targetWrong' }, { text: '. O segundo erro é uma pausa depois de somos antes da qualidade: Somos, rápidos soa como duas palavras, não um pensamento. A qualidade vem logo em seguida, sem parar para respirar.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp là kéo dài somos thành ba âm tiết thay vì hai: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', không phải ', semantic: 'explanation' }, { text: 'somemos', semantic: 'targetWrong' }, { text: '. Lỗi thứ hai là dừng sau somos trước đặc điểm: Somos, rápidos nghe như hai từ, không phải một ý. Đặc điểm đi ngay sau đó, không dừng để thở.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah meregangkan somos menjadi tiga suku kata, bukan dua: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', bukan ', semantic: 'explanation' }, { text: 'somemos', semantic: 'targetWrong' }, { text: '. Kesalahan kedua adalah jeda setelah somos sebelum sifat: Somos, rápidos terdengar seperti dua kata, bukan satu pemikiran. Sifatnya langsung mengikuti, tanpa berhenti bernapas.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın bir hata, somos’u iki yerine üç heceye uzatmaktır: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'somemos', semantic: 'targetWrong' }, { text: ' değil. İkinci hata, somos’tan sonra nitelikten önce duraklamaktır: Somos, rápidos tek bir düşünce değil iki kelime gibi duyulur. Nitelik hemen ardından gelir, nefes almak için durmadan.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd to rozciągnięcie somos na trzy sylaby zamiast dwóch: ', semantic: 'explanation' }, { text: 'SOmos', semantic: 'targetCorrect' }, { text: ', nie ', semantic: 'explanation' }, { text: 'somemos', semantic: 'targetWrong' }, { text: '. Drugi błąd to pauza po somos przed cechą: Somos, rápidos brzmi jak dwa słowa, a nie jedna myśl. Cecha następuje od razu, bez zatrzymania na oddech.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Сколько слогов правильно услышать в somos: SOmos или somemos?',
        uk: 'Скільки складів правильно почути в somos: SOmos чи somemos?',
        es: 'How many syllables should you hear in somos: SOmos or somemos?',
        'pt-BR': 'Quantas sílabas se deve ouvir em somos: SOmos ou somemos?',
        vi: 'Nên nghe bao nhiêu âm tiết trong somos: SOmos hay somemos?',
        id: 'Berapa suku kata yang seharusnya terdengar dalam somos: SOmos atau somemos?',
        tr: 'Somos’ta kaç hece duyulmalı: SOmos mu yoksa somemos mu?',
        pl: 'Ile sylab powinno być słychać w somos: SOmos czy somemos?',
      }),
      choices: [
        L({ ru: 'SOmos', uk: 'SOmos', es: 'SOmos', 'pt-BR': 'SOmos', vi: 'SOmos', id: 'SOmos', tr: 'SOmos', pl: 'SOmos' }),
        L({ ru: 'somemos', uk: 'somemos', es: 'somemos', 'pt-BR': 'somemos', vi: 'somemos', id: 'somemos', tr: 'somemos', pl: 'somemos' }),
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
