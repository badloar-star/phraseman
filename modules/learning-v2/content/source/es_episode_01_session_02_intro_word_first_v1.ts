import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24): копирует word-first паттерн сессии
// 1 для сессии 2 — «Это не так» (es_episode_01_session_map_v1.ts, teaches:
// negation_no). Единственное новое слово — no; интро объясняет его через
// уже знакомые фразы сессии 1 (Es fácil, Es verdad), не вводя ничего лишнего.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_02_WORD_FIRST_TITLE = L({
  ru: 'Это не так',
  uk: 'Це не так',
  es: 'That is not so',
  'pt-BR': 'Não é assim',
  vi: 'Không phải vậy',
  id: 'Bukan begitu',
  tr: 'Öyle değil',
  pl: 'To nie tak',
});

export const ES_EPISODE_01_SESSION_02_WORD_FIRST_SUMMARY = L({
  ru: 'Одно короткое слово переворачивает смысл любой оценки на противоположный.',
  uk: 'Одне коротке слово перевертає сенс будь-якої оцінки на протилежний.',
  es: 'One short word flips the meaning of any verdict to its opposite.',
  'pt-BR': 'Uma palavra curta vira o sentido de qualquer veredito para o oposto.',
  vi: 'Một từ ngắn đảo ngược ý nghĩa của bất kỳ nhận định nào.',
  id: 'Satu kata pendek membalikkan makna penilaian apa pun menjadi kebalikannya.',
  tr: 'Kısa bir sözcük her yargının anlamını tersine çevirir.',
  pl: 'Jedno krótkie słowo odwraca sens każdego osądu na przeciwny.',
});

export const ES_EPISODE_01_SESSION_02_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать no, а затем применить его к уже известным оценкам.',
  uk: 'Упізнати на слух, зрозуміти й точно написати no, а потім застосувати його до вже відомих оцінок.',
  es: 'Recognize, understand, and write no before applying it to verdicts already learned.',
  'pt-BR': 'Reconhecer de ouvido, entender e escrever no antes de aplicá-lo a vereditos já conhecidos.',
  vi: 'Nghe ra, hiểu và viết đúng no trước khi áp dụng nó vào những nhận định đã biết.',
  id: 'Mengenali dari suara, memahami, dan menulis no sebelum menerapkannya pada penilaian yang sudah dipelajari.',
  tr: 'No sözcüğünü duyup tanımak, anlamak ve yazmak; ardından zaten bilinen yargılara uygulamak.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i zapisać no, a potem zastosować je do już znanych osądów.',
});

// зачем переписано (владелец, 2026-08-27, Библия текстов
// docs/v2/БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md): все три тела превышали лимит в
// 320 знаков, установленный правилом 2 библии — искусственный минимум,
// который раньше это требовал, отменён (доказательная база: Mayer coherence
// principle, Sanchez & Wiley, Sweller redundancy effect). Тексты укорочены
// до одной мысли на страницу, слова остаются только из словаря сессии 1 и 2
// (es, soy, fácil, verdad, no) плюс их санкционированные словарные
// дистракторы (nada, non — уже введены как контакт-уровневые ловушки в
// ES_EPISODE_01_SESSION_02_VOCABULARY_V1, поэтому здесь не новые слова).
const CONCEPT_BODY = L({
  ru: 'No значит «не» и всегда встаёт перед связкой. Es fácil — «это легко», No es fácil — «это не легко». Одно короткое слово впереди — и смысл перевернулся ровно наоборот.',
  uk: 'No означає «не» і завжди стає перед зв\'язкою. Es fácil — «це легко», No es fácil — «це не легко». Одне коротке слово попереду — і сенс перевернувся точно навпаки.',
  es: 'No means "not" and always stands right before the link. Es fácil — "it is easy", No es fácil — "it is not easy". One short word up front, and the whole meaning flips.',
  'pt-BR': 'No significa "não" e vem sempre logo antes da ligação. Es fácil — "é fácil", No es fácil — "não é fácil". Uma palavra curta na frente, e o sentido vira do avesso.',
  vi: 'No nghĩa là "không" và luôn đứng ngay trước từ nối. Es fácil — "điều này dễ", No es fácil — "điều này không dễ". Một từ ngắn đứng trước, và cả nghĩa câu đảo ngược.',
  id: 'No berarti "tidak" dan selalu berdiri tepat sebelum penghubung. Es fácil — "ini mudah", No es fácil — "ini tidak mudah". Satu kata pendek di depan, dan makna kalimat langsung terbalik.',
  tr: 'No "değil" demektir ve her zaman bağlayıcıdan hemen önce gelir. Es fácil — "bu kolay", No es fácil — "bu kolay değil". Öndeki tek kısa kelime, anlamı tamamen tersine çevirir.',
  pl: 'No znaczy „nie” i zawsze stoi tuż przed łącznikiem. Es fácil — „to jest łatwe”, No es fácil — „to nie jest łatwe”. Jedno krótkie słowo z przodu, a sens robi się dokładnie odwrotny.',
});

const FORMULA_BODY = L({
  // зачем «перед связкой» дословно (гейт intro_question_not_grounded): вопрос
  // страницы спрашивает именно про место no относительно связки, а формула
  // «no + es + признак» этого словами не говорила — ответ обязан быть объяснён
  // в тексте ДО вопроса, иначе ученик угадывает, а не понимает.
  ru: 'Формула простая: no встаёт перед связкой, и никогда наоборот. No es verdad — «это неправда», та же схема, что и в No es fácil. Слово no никогда не меняется.',
  uk: 'Формула проста: no стає перед зв’язкою, і ніколи навпаки. No es verdad — «це неправда», та сама схема, що й у No es fácil. Слово no ніколи не змінюється.',
  es: 'The formula is simple: no goes before the linking word, never the other way. No es verdad — "that is not true", same pattern as No es fácil. The word no never changes.',
  'pt-BR': 'A fórmula é simples: no vem antes da ligação, nunca ao contrário. No es verdad — "não é verdade", o mesmo padrão de No es fácil. A palavra no nunca muda.',
  vi: 'Công thức đơn giản: no đứng trước từ nối, không bao giờ ngược lại. No es verdad — "điều đó không đúng", cùng khuôn với No es fácil. Từ no không bao giờ đổi.',
  id: 'Rumusnya sederhana: no berada sebelum kata penghubung, tidak pernah terbalik. No es verdad — "itu tidak benar", pola yang sama seperti No es fácil. Kata no tidak pernah berubah.',
  tr: 'Formül basit: no bağlayıcıdan önce gelir, asla tersi değil. No es verdad — "bu doğru değil", No es fácil ile aynı kalıp. No sözcüğü asla değişmez.',
  pl: 'Formuła jest prosta: no stoi przed łącznikiem, nigdy odwrotnie. No es verdad — „to nieprawda”, ten sam schemat co No es fácil. Słowo no nigdy się nie zmienia.',
});

// зачем переписано (владелец, 2026-08-27; Библия текстов, правило 1): прошлый
// текст был целиком про nada и non — слова, которых ученик в этой сессии не
// видит и путать не может. Это эталонный seductive detail (Mayer): лишнее
// сравнение грузит новичка вместо того, чтобы помочь. Теперь страница про само
// no и его единственную привычку — стоять впереди.
const TRAP_BODY = L({
  ru: 'У no одна привычка: стоять впереди и никогда не меняться. Не «es no fácil», а No es fácil — сначала отказ, потом всё остальное. Поставили не туда — испанец не поймёт.',
  uk: 'У no одна звичка: стояти попереду й ніколи не змінюватися. Не «es no fácil», а No es fácil — спершу відмова, потім усе інше. Поставили не туди — іспанець не зрозуміє.',
  es: 'No has one habit: it goes first and never changes. Not "es no fácil" but No es fácil — refusal first, everything else after. Put it elsewhere and nobody follows you.',
  'pt-BR': 'O no tem um hábito só: vem primeiro e nunca muda. Não "es no fácil", e sim No es fácil — a recusa na frente, o resto depois. Fora do lugar, ninguém entende.',
  vi: 'No chỉ có một thói quen: luôn đứng đầu và không bao giờ đổi. Không phải "es no fácil" mà là No es fácil — từ chối trước, phần còn lại sau. Đặt sai chỗ là không ai hiểu.',
  id: 'No punya satu kebiasaan: selalu di depan dan tak pernah berubah. Bukan "es no fácil", tapi No es fácil — penolakan dulu, sisanya kemudian. Salah tempat, tidak ada yang paham.',
  tr: 'No tek bir alışkanlığa sahiptir: hep önde durur ve asla değişmez. "Es no fácil" değil, No es fácil — önce ret, sonra gerisi. Yanlış yere koyarsanız kimse anlamaz.',
  pl: 'No ma jeden nawyk: stoi z przodu i nigdy się nie zmienia. Nie „es no fácil”, tylko No es fácil — najpierw odmowa, potem reszta. Wstawione gdzie indziej — nikt nie zrozumie.',
});

export const ES_EPISODE_01_SESSION_02_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'No переворачивает смысл',
      uk: 'No перевертає сенс',
      es: 'No flips the meaning',
      'pt-BR': 'No vira o sentido',
      vi: 'No đảo ngược ý nghĩa',
      id: 'No membalikkan makna',
      tr: 'No anlamı tersine çevirir',
      pl: 'No odwraca sens',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' значит «не» и всегда встаёт перед связкой. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — «это легко», ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — «это не легко». Одно короткое слово впереди — и смысл перевернулся ровно наоборот.', semantic: 'explanation' }),
      uk: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' означає «не» і завжди стає перед зв\'язкою. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — «це легко», ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — «це не легко». Одне коротке слово попереду — і сенс перевернувся точно навпаки.', semantic: 'explanation' }),
      es: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' means "not" and always stands right before the link. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "it is easy", ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "it is not easy". One short word up front, and the whole meaning flips.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'No', semantic: 'targetCorrect' }, { text: ' significa "não" e vem sempre logo antes da ligação. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "é fácil", ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "não é fácil". Uma palavra curta na frente, e o sentido vira do avesso.', semantic: 'explanation' }),
      vi: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' nghĩa là "không" và luôn đứng ngay trước từ nối. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "điều này dễ", ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "điều này không dễ". Một từ ngắn đứng trước, và cả nghĩa câu đảo ngược.', semantic: 'explanation' }),
      id: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' berarti "tidak" dan selalu berdiri tepat sebelum penghubung. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "ini mudah", ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "ini tidak mudah". Satu kata pendek di depan, dan makna kalimat langsung terbalik.', semantic: 'explanation' }),
      tr: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' "değil" demektir ve her zaman bağlayıcıdan hemen önce gelir. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — "bu kolay", ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "bu kolay değil". Öndeki tek kısa kelime, anlamı tamamen tersine çevirir.', semantic: 'explanation' }),
      pl: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' znaczy „nie” i zawsze stoi tuż przed łącznikiem. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' — „to jest łatwe”, ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — „to nie jest łatwe”. Jedno krótkie słowo z przodu, a sens robi się dokładnie odwrotny.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как по-испански возразить «это не легко»?',
        uk: 'Як іспанською заперечити «це не легко»?',
        es: 'How do you say "it is not easy" in Spanish?',
        'pt-BR': 'Como se diz "não é fácil" em espanhol?',
        vi: 'Làm sao để nói "điều này không dễ" bằng tiếng Tây Ban Nha?',
        id: 'Bagaimana mengatakan "ini tidak mudah" dalam bahasa Spanyol?',
        tr: 'İspanyolca "bu kolay değil" nasıl söylenir?',
        pl: 'Jak po hiszpańsku powiedzieć „to nie jest łatwe”?',
      }),
      choices: [
        L({ ru: 'No es fácil', uk: 'No es fácil', es: 'No es fácil', 'pt-BR': 'No es fácil', vi: 'No es fácil', id: 'No es fácil', tr: 'No es fácil', pl: 'No es fácil' }),
        L({ ru: 'Es no fácil', uk: 'Es no fácil', es: 'Es no fácil', 'pt-BR': 'Es no fácil', vi: 'Es no fácil', id: 'Es no fácil', tr: 'Es no fácil', pl: 'Es no fácil' }),
        L({ ru: 'Nada fácil', uk: 'Nada fácil', es: 'Nada fácil', 'pt-BR': 'Nada fácil', vi: 'Nada fácil', id: 'Nada fácil', tr: 'Nada fácil', pl: 'Nada fácil' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No встаёт первым, перед es. «Es no fácil» переставляет слова неправильно, а nada — «ничего», не отрицание.',
        uk: 'No стає першим, перед es. «Es no fácil» переставляє слова неправильно, а nada — «нічого», не заперечення.',
        es: 'No comes first, before es. "Es no fácil" puts the words in the wrong order, and nada means "nothing", not negation.',
        'pt-BR': 'No vem primeiro, antes de es. "Es no fácil" coloca as palavras na ordem errada, e nada significa "nada", não negação.',
        vi: 'No đứng đầu tiên, trước es. "Es no fácil" đặt sai thứ tự từ, còn nada nghĩa là "không có gì", không phải phủ định.',
        id: 'No berada di depan, sebelum es. "Es no fácil" menempatkan kata dalam urutan yang salah, dan nada berarti "tidak ada apa-apa", bukan penyangkalan.',
        tr: 'No önce gelir, es\'ten önce. "Es no fácil" kelimeleri yanlış sıraya koyar, nada ise "hiçbir şey" demektir, olumsuzlama değil.',
        pl: 'No stoi pierwsze, przed es. „Es no fácil” ustawia słowa w złej kolejności, a nada znaczy „nic”, nie przeczenie.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'No + связка + признак',
      uk: 'No + зв’язка + ознака',
      es: 'No + linking word + quality',
      'pt-BR': 'No + ligação + qualidade',
      vi: 'No + từ nối + đặc điểm',
      id: 'No + kata penghubung + sifat',
      tr: 'No + bağlayıcı + nitelik',
      pl: 'No + łącznik + cecha',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула простая: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' встаёт перед связкой, и никогда наоборот. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — «это неправда», та же схема, что и в ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: '. Слово ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' никогда не меняется.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' стає перед зв’язкою, і ніколи навпаки. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — «це неправда», та сама схема, що й у ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: '. Слово ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' ніколи не змінюється.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' goes before the linking word, never the other way. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: " — \"that is not true\", same pattern as ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: '. The word ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' never changes.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' vem antes da ligação, nunca ao contrário. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: " — \"não é verdade\", o mesmo padrão de ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: '. A palavra ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' nunca muda.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức đơn giản: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' đứng trước từ nối, không bao giờ ngược lại. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: " — \"điều đó không đúng\", cùng khuôn với ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: '. Từ ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' không bao giờ đổi.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' berada sebelum kata penghubung, tidak pernah terbalik. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: " — \"itu tidak benar\", pola yang sama seperti ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: '. Kata ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' tidak pernah berubah.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basit: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' bağlayıcıdan önce gelir, asla tersi değil. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: " — \"bu doğru değil\", ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' ile aynı kalıp. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' sözcüğü asla değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' stoi przed łącznikiem, nigdy odwrotnie. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — „to nieprawda”, ten sam schemat co ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: '. Słowo ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' nigdy się nie zmienia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Куда встаёт no по отношению к связке?',
        uk: 'Куди стає no відносно зв’язки?',
        es: 'Where does no go relative to the linking word?',
        'pt-BR': 'Onde no fica em relação à ligação?',
        vi: 'No đứng ở đâu so với từ nối?',
        id: 'Di mana no berada terhadap kata penghubung?',
        tr: 'No, bağlayıcıya göre nereye gelir?',
        pl: 'Gdzie stoi no względem łącznika?',
      }),
      choices: [
        L({ ru: 'Перед связкой', uk: 'Перед зв’язкою', es: 'Before the linking word', 'pt-BR': 'Antes da ligação', vi: 'Trước từ nối', id: 'Sebelum kata penghubung', tr: 'Bağlayıcıdan önce', pl: 'Przed łącznikiem' }),
        L({ ru: 'После связки', uk: 'Після зв’язки', es: 'After the linking word', 'pt-BR': 'Depois da ligação', vi: 'Sau từ nối', id: 'Setelah kata penghubung', tr: 'Bağlayıcıdan sonra', pl: 'Po łączniku' }),
        L({ ru: 'После признака', uk: 'Після ознаки', es: 'After the quality', 'pt-BR': 'Depois da qualidade', vi: 'Sau đặc điểm', id: 'Setelah sifat', tr: 'Nitelikten sonra', pl: 'Po cesze' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No всегда встаёт перед связкой (es, soy...). После связки или после признака оно не работает и звучит неправильно.',
        uk: 'No завжди стає перед зв’язкою (es, soy...). Після зв’язки або після ознаки воно не працює і звучить неправильно.',
        es: 'No always goes before the linking word (es, soy...). After the linking word or after the quality it does not work and sounds wrong.',
        'pt-BR': 'No sempre vem antes da ligação (es, soy...). Depois da ligação ou depois da qualidade não funciona e soa errado.',
        vi: 'No luôn đứng trước từ nối (es, soy...). Sau từ nối hoặc sau đặc điểm thì không đúng và nghe sai.',
        id: 'No selalu berada sebelum kata penghubung (es, soy...). Setelah kata penghubung atau setelah sifat tidak berfungsi dan terdengar salah.',
        tr: 'No her zaman bağlayıcıdan (es, soy...) önce gelir. Bağlayıcıdan sonra ya da nitelikten sonra işe yaramaz ve yanlış gelir.',
        pl: 'No zawsze stoi przed łącznikiem (es, soy...). Po łączniku lub po cesze nie działa i brzmi błędnie.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'No — не nada, не non',
      uk: 'No не дорівнює nada чи non',
      es: 'No is not nada, not non',
      'pt-BR': 'No não é nada, não é non',
      vi: 'No không phải là nada, không phải là non',
      id: 'No bukan nada, bukan non',
      tr: 'No, nada değil, non değil',
      pl: 'No to nie nada, nie non',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' — одна привычка: стоять впереди и никогда не меняться. Не «es no fácil», а ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — сначала отказ, потом всё остальное. Поставили не туда — испанец не поймёт.', semantic: 'explanation' }),
      uk: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' — одна звичка: стояти попереду й ніколи не змінюватися. Не «es no fácil», а ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — спершу відмова, потім усе інше. Поставили не туди — іспанець не зрозуміє.', semantic: 'explanation' }),
      es: R({ text: 'No', semantic: 'targetCorrect' }, { text: " has one habit: it goes first and never changes. Not \"es no fácil\" but ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — refusal first, everything else after. Put it elsewhere and nobody follows you.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'No', semantic: 'targetCorrect' }, { text: " tem um hábito só: vem primeiro e nunca muda. Não \"es no fácil\", e sim ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — a recusa na frente, o resto depois. Fora do lugar, ninguém entende.', semantic: 'explanation' }),
      vi: R({ text: 'No', semantic: 'targetCorrect' }, { text: " chỉ có một thói quen: luôn đứng đầu và không bao giờ đổi. Không phải \"es no fácil\" mà là ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — từ chối trước, phần còn lại sau. Đặt sai chỗ là không ai hiểu.', semantic: 'explanation' }),
      id: R({ text: 'No', semantic: 'targetCorrect' }, { text: " punya satu kebiasaan: selalu di depan dan tak pernah berubah. Bukan \"es no fácil\", tapi ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — penolakan dulu, sisanya kemudian. Salah tempat, tidak ada yang paham.', semantic: 'explanation' }),
      tr: R({ text: 'No', semantic: 'targetCorrect' }, { text: " tek bir alışkanlığa sahiptir: hep önde durur ve asla değişmez. \"Es no fácil\" değil, ", semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — önce ret, sonra gerisi. Yanlış yere koyarsanız kimse anlamaz.', semantic: 'explanation' }),
      pl: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' ma jeden nawyk: stoi z przodu i nigdy się nie zmienia. Nie „es no fácil”, tylko ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — najpierw odmowa, potem reszta. Wstawione gdzie indziej — nikt nie zrozumie.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое слово означает отрицание «не»?',
        uk: 'Яке слово означає заперечення «не»?',
        es: 'Which word means the negation "not"?',
        'pt-BR': 'Qual palavra significa a negação "não"?',
        vi: 'Từ nào nghĩa là phủ định "không"?',
        id: 'Kata mana yang berarti penyangkalan "tidak"?',
        tr: 'Hangi kelime "değil" olumsuzlamasını ifade eder?',
        pl: 'Które słowo znaczy przeczenie „nie”?',
      }),
      choices: [
        L({ ru: 'no', uk: 'no', es: 'no', 'pt-BR': 'no', vi: 'no', id: 'no', tr: 'no', pl: 'no' }),
        L({ ru: 'nada', uk: 'nada', es: 'nada', 'pt-BR': 'nada', vi: 'nada', id: 'nada', tr: 'nada', pl: 'nada' }),
        L({ ru: 'non', uk: 'non', es: 'non', 'pt-BR': 'non', vi: 'non', id: 'non', tr: 'non', pl: 'non' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'No означает «не». Nada означает «ничего» — предмет, а не отрицание. Non не является испанским словом.',
        uk: 'No означає «не». Nada означає «нічого» — предмет, а не заперечення. Non не є іспанським словом.',
        es: 'No means "not". Nada means "nothing" — a thing, not a negation. Non is not a Spanish word.',
        'pt-BR': 'No significa "não". Nada significa "nada" — uma coisa, não uma negação. Non não é palavra do espanhol.',
        vi: 'No nghĩa là "không". Nada nghĩa là "không có gì" — một sự vật, không phải phủ định. Non không phải từ tiếng Tây Ban Nha.',
        id: 'No berarti "tidak". Nada berarti "tidak ada apa-apa" — sebuah benda, bukan penyangkalan. Non bukan kata bahasa Spanyol.',
        tr: 'No "değil" demektir. Nada "hiçbir şey" demektir — bir nesne, olumsuzlama değil. Non İspanyolca bir kelime değildir.',
        pl: 'No znaczy „nie”. Nada znaczy „nic” — rzecz, nie przeczenie. Non nie jest hiszpańskim słowem.',
      }),
    },
  },
];
