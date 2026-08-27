import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл переписан (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// §7 + LEARNING_CONTENT_STYLE_BIBLE.ru.md правило 2): исходный черновик от
// 2026-08-25 держал тела intro на ~530-580 знаков на локаль — за потолком
// intro_body_overloaded (320 знаков / 2-4 предложения,
// learning_content_quality_gate_v1.ts). Смысл сохранён (concept/formula/trap
// про pro-drop: испанский обычно опускает tú/yo, потому что окончание
// связки само называет лицо), текст сжат. Карта сессии:
// es_episode_01_session_map_v1.ts, sessionOrdinal 13, "Местоимение не
// нужно" / pronoun_drop, builtOn: [9, 10], recalls: [1, 9]. Новых слов нет.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_13_TITLE = L({
  ru: 'Местоимение не нужно',
  uk: 'Займенник не потрібен',
  es: 'The pronoun is not needed',
  'pt-BR': 'O pronome não é necessário',
  vi: 'Không cần đại từ',
  id: 'Kata ganti tidak diperlukan',
  tr: 'Zamire gerek yok',
  pl: 'Zaimek nie jest potrzebny',
});

export const ES_EPISODE_01_SESSION_13_SUMMARY = L({
  ru: 'Окончание связки само называет, о ком речь, поэтому tú и yo обычно остаются за кадром.',
  uk: 'Закінчення зв’язки саме називає, про кого йдеться, тому tú та yo зазвичай лишаються за кадром.',
  es: 'The ending of the linking word already names who is being talked about, so tú and yo usually stay off-screen.',
  'pt-BR': 'A terminação da ligação já nomeia de quem se fala, então tú e yo geralmente ficam fora da frase.',
  vi: 'Đuôi của từ nối đã gọi tên người được nói tới, nên tú và yo thường không xuất hiện.',
  id: 'Akhiran kata penghubung sudah menyebut siapa yang dibicarakan, jadi tú dan yo biasanya tidak ditampilkan.',
  tr: 'Bağlacın sonu, kimden bahsedildiğini zaten adlandırır, bu yüzden tú ve yo genellikle görünmez.',
  pl: 'Końcówka łącznika już nazywa, o kim mowa, więc tú i yo zwykle pozostają niewypowiedziane.',
});

export const ES_EPISODE_01_SESSION_13_GOAL = L({
  ru: 'Понять, почему испанские фразы обычно звучат без tú и yo, и уверенно строить их без лишнего местоимения.',
  uk: 'Зрозуміти, чому іспанські фрази зазвичай звучать без tú та yo, і впевнено будувати їх без зайвого займенника.',
  es: 'Understand why Spanish phrases usually sound without tú and yo, and confidently build them without the extra pronoun.',
  'pt-BR': 'Entender por que as frases em espanhol geralmente soam sem tú e yo, e construí-las com confiança sem o pronome extra.',
  vi: 'Hiểu tại sao các câu tiếng Tây Ban Nha thường không có tú và yo, và tự tin xây dựng chúng mà không cần đại từ thừa.',
  id: 'Memahami mengapa frasa bahasa Spanyol biasanya terdengar tanpa tú dan yo, dan membangunnya dengan percaya diri tanpa kata ganti tambahan.',
  tr: 'İspanyolca ifadelerin genellikle neden tú ve yo olmadan duyulduğunu anlamak ve fazladan zamir olmadan güvenle kurmak.',
  pl: 'Zrozumieć, dlaczego hiszpańskie frazy zwykle brzmią bez tú i yo, i pewnie je budować bez zbędnego zaimka.',
});

const CONCEPT_BODY = L({
  ru: 'Окончание eres само называет «ты» — так испанский показывает, о ком речь, без отдельного слова-подлежащего. Поэтому Eres bonito сам по себе полностью ясен, а лишнее слово впереди не добавляет ничего нового.',
  uk: 'Закінчення eres саме називає «ти» — так іспанська показує, про кого йдеться, без окремого слова-підмета. Тому Eres bonito сам собою повністю зрозумілий, а зайве слово попереду не додає нічого нового.',
  es: 'The ending of eres already names "you" — that is how Spanish shows who is being talked about, without a separate subject word. So Eres bonito is fully clear on its own, and an extra word in front adds nothing new.',
  'pt-BR': 'A terminação de eres já nomeia "tú" — é assim que o espanhol mostra de quem se fala, sem palavra-sujeito separada. Por isso Eres bonito é totalmente claro sozinho, e uma palavra extra na frente não acrescenta nada.',
  vi: 'Đuôi của eres đã tự gọi tên "tú" — đó là cách tiếng Tây Ban Nha cho thấy đang nói về ai, không cần từ chủ ngữ riêng. Vì vậy Eres bonito đã hoàn toàn rõ ràng, và một từ thừa phía trước không thêm gì mới.',
  id: 'Akhiran eres sudah menyebut "tú" — begitulah cara bahasa Spanyol menunjukkan siapa yang dibicarakan, tanpa kata subjek terpisah. Jadi Eres bonito sudah sepenuhnya jelas, dan kata tambahan di depan tidak menambahkan apa pun.',
  tr: 'Eres’in sonu zaten "tú"yu adlandırır — İspanyolca kimden bahsedildiğini böyle gösterir, ayrı bir özne kelimesi olmadan. Bu yüzden Eres bonito tek başına tamamen açıktır, önündeki fazladan kelime yeni bir şey eklemez.',
  pl: 'Końcówka eres sama nazywa „tú” — tak hiszpański pokazuje, o kim mowa, bez osobnego słowa-podmiotu. Dlatego Eres bonito jest samo w sobie w pełni jasne, a zbędne słowo z przodu nic nowego nie wnosi.',
});

const FORMULA_BODY = L({
  ru: 'Формула короче, чем с отдельным словом-подлежащим впереди: только связка + признак — Eres bonito. Перед третьим лицом, es, ничего — там нет местоимения вообще, там нет отдельного слова-подлежащего.',
  uk: 'Формула коротша, ніж з окремим словом-підметом попереду: тільки зв’язка + ознака — Eres bonito. Перед третьою особою, es, нічого — там немає займенника взагалі, там немає окремого слова-підмета.',
  es: 'The formula is shorter than with a separate subject word: linking word + quality — Eres bonito. Before the third person, es, nothing — there is no pronoun there at all, there is no separate subject word there.',
  'pt-BR': 'A fórmula é mais curta que com palavra-sujeito separada: ligação + qualidade — Eres bonito. Antes da terceira pessoa, es, nada — não há pronome ali de forma alguma, não existe palavra-sujeito separada ali.',
  vi: 'Công thức ngắn hơn khi có từ chủ ngữ riêng: từ nối + đặc điểm — Eres bonito. Trước ngôi thứ ba, es, không có gì — ở đó hoàn toàn không có đại từ, không có từ chủ ngữ riêng ở đó.',
  id: 'Rumusnya lebih pendek daripada dengan kata subjek terpisah: kata penghubung + sifat — Eres bonito. Sebelum orang ketiga, es, tidak ada apa-apa — tidak ada kata ganti di sana sama sekali, tidak ada kata subjek terpisah di sana.',
  tr: 'Formül, ayrı bir özne kelimesi olan halinden daha kısadır: bağlaç + nitelik — Eres bonito. Üçüncü kişiden, es’ten, önce hiçbir şey — orada zamir yok, orada ayrı bir özne kelimesi de yoktur.',
  pl: 'Formuła jest krótsza niż z osobnym słowem-podmiotem: łącznik + cecha — Eres bonito. Przed trzecią osobą, es, nic — nie ma tam wcale zaimka, nie ma tam osobnego słowa-podmiotu.',
});

const TRAP_BODY = L({
  ru: 'Добавить слово-подлежащее впереди — не ошибка, просто лишнее: короче и естественнее звучит Eres rápido. Опаснее спутать саму связку: soy принадлежит только говорящему о себе, а перед собеседником нужна eres — эти две связки нельзя перепутать местами.',
  uk: 'Додати слово-підмет попереду — не помилка, просто зайве: коротше і природніше звучить Eres rápido. Небезпечніше сплутати саму зв’язку: soy належить тільки мовцю про себе, а перед співрозмовником потрібна eres — ці дві зв’язки не можна переплутати місцями.',
  es: 'Tú eres bonito is grammatically correct, but a native speaker would simply say Eres bonito — the pronoun is redundant, though not a mistake. More dangerous is mixing up the linking word: Tú soy rápido is impossible, since soy belongs only to "I", and tú requires eres.',
  'pt-BR': 'Tú eres bonito é gramaticalmente correto, mas um nativo diria simplesmente Eres bonito — o pronome é redundante, embora não seja erro. Mais perigoso é misturar a ligação: Tú soy rápido é impossível, já que soy pertence só ao "eu", e tú exige eres.',
  vi: 'Tú eres bonito đúng ngữ pháp, nhưng người bản xứ chỉ nói Eres bonito — đại từ thừa, dù không phải lỗi. Nguy hiểm hơn là nhầm từ nối: Tú soy rápido là không thể, vì soy chỉ thuộc về "tôi", còn tú đòi hỏi eres.',
  id: 'Tú eres bonito benar secara tata bahasa, tetapi penutur asli hanya akan mengatakan Eres bonito — kata ganti itu berlebihan, meski bukan kesalahan. Lebih berbahaya adalah mengacaukan kata penghubung: Tú soy rápido tidak mungkin, karena soy hanya milik "aku", dan tú memerlukan eres.',
  tr: 'Tú eres bonito gramer açısından doğrudur, ama anadili konuşan sadece Eres bonito derdi — zamir gereksizdir, ama hata değildir. Daha tehlikelisi bağlacı karıştırmaktır: Tú soy rápido imkânsızdır, çünkü soy yalnızca "ben"e aittir ve tú, eres gerektirir.',
  pl: 'Tú eres bonito jest gramatycznie poprawne, ale rodzimy użytkownik powiedziałby po prostu Eres bonito — zaimek jest zbędny, choć nie błędny. Groźniejsze jest pomylenie łącznika: Tú soy rápido jest niemożliwe, bo soy należy tylko do „ja”, a tú wymaga eres.',
});

export const ES_EPISODE_01_SESSION_13_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Окончание уже называет, кто есть кто',
      uk: 'Закінчення вже називає, хто є хто',
      es: 'The ending already names who is who',
      'pt-BR': 'A terminação já nomeia quem é quem',
      vi: 'Đuôi từ đã gọi tên ai là ai',
      id: 'Akhiran sudah menyebut siapa itu siapa',
      tr: 'Son ek zaten kimin kim olduğunu adlandırır',
      pl: 'Końcówka już nazywa, kto jest kim',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Окончание eres само называет «ты»', semantic: 'targetCorrect' }, { text: ' — так испанский показывает, о ком речь, без отдельного слова-подлежащего. Поэтому ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' сам по себе полностью ясен, а лишнее слово впереди не добавляет ничего нового.', semantic: 'explanation' }),
      uk: R({ text: 'Закінчення eres саме називає «ти»', semantic: 'targetCorrect' }, { text: ' — так іспанська показує, про кого йдеться, без окремого слова-підмета. Тому ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' сам собою повністю зрозумілий, а зайве слово попереду не додає нічого нового.', semantic: 'explanation' }),
      es: R({ text: 'The ending of eres already names "you"', semantic: 'targetCorrect' }, { text: ' — that is how Spanish shows who is being talked about, without a separate subject word. So ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' is fully clear on its own, and an extra word in front adds nothing new.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A terminação de eres já nomeia "tú"', semantic: 'targetCorrect' }, { text: ' — é assim que o espanhol mostra de quem se fala, sem palavra-sujeito separada. Por isso ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' é totalmente claro sozinho, e uma palavra extra na frente não acrescenta nada.', semantic: 'explanation' }),
      vi: R({ text: 'Đuôi của eres đã tự gọi tên "tú"', semantic: 'targetCorrect' }, { text: ' — đó là cách tiếng Tây Ban Nha cho thấy đang nói về ai, không cần từ chủ ngữ riêng. Vì vậy ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' đã hoàn toàn rõ ràng, và một từ thừa phía trước không thêm gì mới.', semantic: 'explanation' }),
      id: R({ text: 'Akhiran eres sudah menyebut "tú"', semantic: 'targetCorrect' }, { text: ' — begitulah cara bahasa Spanyol menunjukkan siapa yang dibicarakan, tanpa kata subjek terpisah. Jadi ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' sudah sepenuhnya jelas, dan kata tambahan di depan tidak menambahkan apa pun.', semantic: 'explanation' }),
      tr: R({ text: 'Eres’in sonu zaten "tú"yu adlandırır', semantic: 'targetCorrect' }, { text: ' — İspanyolca kimden bahsedildiğini böyle gösterir, ayrı bir özne kelimesi olmadan. Bu yüzden ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' tek başına tamamen açıktır, önündeki fazladan kelime yeni bir şey eklemez.', semantic: 'explanation' }),
      pl: R({ text: 'Końcówka eres sama nazywa „tú”', semantic: 'targetCorrect' }, { text: ' — tak hiszpański pokazuje, o kim mowa, bez osobnego słowa-podmiotu. Dlatego ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'explanation' }, { text: ' jest samo w sobie w pełni jasne, a zbędne słowo z przodu nic nowego nie wnosi.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Почему испанец обычно не говорит tú перед eres?',
        uk: 'Чому іспанець зазвичай не каже tú перед eres?',
        es: 'Why does a Spanish speaker usually not say tú before eres?',
        'pt-BR': 'Por que um falante de espanhol geralmente não diz tú antes de eres?',
        vi: 'Tại sao người nói tiếng Tây Ban Nha thường không nói tú trước eres?',
        id: 'Mengapa penutur bahasa Spanyol biasanya tidak mengatakan tú sebelum eres?',
        tr: 'Bir İspanyolca konuşan neden genellikle eres’ten önce tú demez?',
        pl: 'Dlaczego Hiszpan zwykle nie mówi tú przed eres?',
      }),
      choices: [
        L({ ru: 'Окончание eres само называет «ты»', uk: 'Закінчення eres саме називає «ти»', es: 'The ending of eres already names "you"', 'pt-BR': 'A terminação de eres já nomeia "tú"', vi: 'Đuôi của eres đã tự gọi tên "tú"', id: 'Akhiran eres sudah menyebut "tú"', tr: 'Eres’in sonu zaten "tú"yu adlandırır', pl: 'Końcówka eres sama nazywa „tú”' }),
        L({ ru: 'Tú — грамматическая ошибка', uk: 'Tú — граматична помилка', es: 'Tú is a grammar mistake', 'pt-BR': 'Tú é um erro gramatical', vi: 'Tú là lỗi ngữ pháp', id: 'Tú adalah kesalahan tata bahasa', tr: 'Tú bir dilbilgisi hatasıdır', pl: 'Tú to błąd gramatyczny' }),
        L({ ru: 'Tú используется только в вопросах', uk: 'Tú використовується тільки в питаннях', es: 'Tú is used only in questions', 'pt-BR': 'Tú é usado só em perguntas', vi: 'Tú chỉ dùng trong câu hỏi', id: 'Tú hanya digunakan dalam pertanyaan', tr: 'Tú yalnızca sorularda kullanılır', pl: 'Tú jest używane tylko w pytaniach' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Окончание eres само называет «ты» — это и есть причина. Tú не ошибка (просто избыточно) и не ограничено вопросами.',
        uk: 'Закінчення eres саме називає «ти» — це і є причина. Tú не помилка (просто надлишкове) і не обмежене питаннями.',
        es: 'The ending of eres already names "you" — that is the reason. Tú is not a mistake (just redundant) and is not limited to questions.',
        'pt-BR': 'A terminação de eres já nomeia "tú" — essa é a razão. Tú não é erro (apenas redundante) e não é limitado a perguntas.',
        vi: 'Đuôi của eres đã tự gọi tên "tú" — đó là lý do. Tú không phải lỗi (chỉ thừa) và không giới hạn trong câu hỏi.',
        id: 'Akhiran eres sudah menyebut "tú" — itulah alasannya. Tú bukan kesalahan (hanya berlebihan) dan tidak terbatas pada pertanyaan.',
        tr: 'Eres’in sonu zaten "tú"yu adlandırır — sebep budur. Tú bir hata değildir (sadece gereksizdir) ve sorularla sınırlı değildir.',
        pl: 'Końcówka eres sama nazywa „tú” — to jest powód. Tú nie jest błędem (tylko zbędne) i nie ogranicza się do pytań.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Перед es местоимения не бывает вовсе',
      uk: 'Перед es займенника не буває взагалі',
      es: 'Before es there is never a pronoun at all',
      'pt-BR': 'Antes de es nunca há pronome',
      vi: 'Trước es không bao giờ có đại từ',
      id: 'Sebelum es tidak pernah ada kata ganti',
      tr: 'Es’ten önce hiç zamir olmaz',
      pl: 'Przed es nigdy nie ma zaimka',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула короче, чем с отдельным словом-подлежащим впереди: только связка + признак — ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: '. Перед третьим лицом, es, ', semantic: 'explanation' }, { text: 'ничего — там нет местоимения', semantic: 'targetCorrect' }, { text: ' вообще, там нет отдельного слова-подлежащего.', semantic: 'explanation' }),
      uk: R({ text: 'Формула коротша, ніж з окремим словом-підметом попереду: тільки зв’язка + ознака — ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: '. Перед третьою особою, es, ', semantic: 'explanation' }, { text: 'нічого — там немає займенника', semantic: 'targetCorrect' }, { text: ' взагалі, там немає окремого слова-підмета.', semantic: 'explanation' }),
      es: R({ text: 'The formula is shorter than with a separate subject word: linking word + quality — ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: '. Before the third person, es, ', semantic: 'explanation' }, { text: 'nothing — there is no pronoun there', semantic: 'targetCorrect' }, { text: ' at all, there is no separate subject word there.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é mais curta que com palavra-sujeito separada: ligação + qualidade — ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: '. Antes da terceira pessoa, es, ', semantic: 'explanation' }, { text: 'nada — não há pronome ali', semantic: 'targetCorrect' }, { text: ' de forma alguma, não existe palavra-sujeito separada ali.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức ngắn hơn khi có từ chủ ngữ riêng: từ nối + đặc điểm — ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: '. Trước ngôi thứ ba, es, ', semantic: 'explanation' }, { text: 'không có gì — ở đó không có đại từ', semantic: 'targetCorrect' }, { text: ' hoàn toàn, không có từ chủ ngữ riêng ở đó.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya lebih pendek daripada dengan kata subjek terpisah: kata penghubung + sifat — ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: '. Sebelum orang ketiga, es, ', semantic: 'explanation' }, { text: 'tidak ada apa-apa — tidak ada kata ganti di sana', semantic: 'targetCorrect' }, { text: ' sama sekali, tidak ada kata subjek terpisah di sana.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, ayrı bir özne kelimesi olan halinden daha kısadır: bağlaç + nitelik — ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: '. Üçüncü kişiden, es’ten, önce ', semantic: 'explanation' }, { text: 'hiçbir şey — orada zamir yok', semantic: 'targetCorrect' }, { text: ', orada ayrı bir özne kelimesi de yoktur.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest krótsza niż z osobnym słowem-podmiotem: łącznik + cecha — ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: '. Przed trzecią osobą, es, ', semantic: 'explanation' }, { text: 'nic — nie ma tam wcale zaimka', semantic: 'targetCorrect' }, { text: ', nie ma tam osobnego słowa-podmiotu.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что стоит перед es в безличной оценке вроде «Es bonito»?',
        uk: 'Що стоїть перед es у безособовій оцінці на кшталт «Es bonito»?',
        es: 'What comes before es in an impersonal evaluation like "Es bonito"?',
        'pt-BR': 'O que vem antes de es numa avaliação impessoal como "Es bonito"?',
        vi: 'Điều gì đứng trước es trong đánh giá phi nhân xưng như "Es bonito"?',
        id: 'Apa yang ada sebelum es dalam penilaian impersonal seperti "Es bonito"?',
        tr: '"Es bonito" gibi kişisiz bir değerlendirmede es’ten önce ne gelir?',
        pl: 'Co stoi przed es w bezosobowej ocenie takiej jak „Es bonito”?',
      }),
      choices: [
        L({ ru: 'Ничего — там нет местоимения', uk: 'Нічого — там немає займенника', es: 'Nothing — there is no pronoun there', 'pt-BR': 'Nada — não há pronome ali', vi: 'Không có gì — ở đó không có đại từ', id: 'Tidak ada apa-apa — tidak ada kata ganti di sana', tr: 'Hiçbir şey — orada zamir yok', pl: 'Nic — nie ma tam zaimka' }),
        L({ ru: 'Местоимение ello', uk: 'Займенник ello', es: 'The pronoun ello', 'pt-BR': 'O pronome ello', vi: 'Đại từ ello', id: 'Kata ganti ello', tr: 'Ello zamiri', pl: 'Zaimek ello' }),
        L({ ru: 'Местоимение tú', uk: 'Займенник tú', es: 'The pronoun tú', 'pt-BR': 'O pronome tú', vi: 'Đại từ tú', id: 'Kata ganti tú', tr: 'Tú zamiri', pl: 'Zaimek tú' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Верно: перед es ничего не стоит — там нет отдельного слова-подлежащего вообще, ни ello, ни tú.',
        uk: 'Правильно: перед es нічого не стоїть — там немає окремого слова-підмета взагалі, ні ello, ні tú.',
        es: 'Correct: nothing comes before es — there is no separate subject word there at all, neither ello nor tú.',
        'pt-BR': 'Correto: nada vem antes de es — não há palavra-sujeito separada ali, nem ello nem tú.',
        vi: 'Đúng: không có gì đứng trước es — ở đó hoàn toàn không có từ chủ ngữ riêng, không phải ello, không phải tú.',
        id: 'Benar: tidak ada apa-apa sebelum es — tidak ada kata subjek terpisah sama sekali di sana, baik ello maupun tú.',
        tr: 'Doğru: es’ten önce hiçbir şey gelmez — orada ayrı bir özne kelimesi hiç yoktur, ne ello ne de tú.',
        pl: 'Poprawnie: przed es nic nie stoi — tam w ogóle nie ma osobnego słowa-podmiotu, ani ello, ani tú.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Tú не ошибка, но связку не перепутай',
      uk: 'Tú не помилка, але зв’язку не сплутай',
      es: 'Tú is not a mistake, but do not mix up the linking word',
      'pt-BR': 'Tú não é erro, mas não confunda a ligação',
      vi: 'Tú không phải lỗi, nhưng đừng nhầm từ nối',
      id: 'Tú bukan kesalahan, tapi jangan salah kata penghubung',
      tr: 'Tú bir hata değildir, ama bağlacı karıştırma',
      pl: 'Tú to nie błąd, ale nie myl łącznika',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Добавить слово-подлежащее впереди — не ошибка, просто лишнее: короче и естественнее звучит ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetCorrect' }, { text: '. Опаснее спутать саму связку: soy принадлежит только говорящему о себе, а перед собеседником нужна eres — эти две связки нельзя перепутать местами.', semantic: 'explanation' }),
      uk: R({ text: 'Додати слово-підмет попереду — не помилка, просто зайве: коротше і природніше звучить ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetCorrect' }, { text: '. Небезпечніше сплутати саму зв’язку: soy належить тільки мовцю про себе, а перед співрозмовником потрібна eres — ці дві зв’язки не можна переплутати місцями.', semantic: 'explanation' }),
      es: R({ text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' is grammatically correct, but a native speaker would simply say ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' — the pronoun is redundant, though not a mistake. More dangerous is mixing up the linking word: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' is impossible, since soy belongs only to "I", and tú requires eres.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' é gramaticalmente correto, mas um nativo diria simplesmente ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' — o pronome é redundante, embora não seja erro. Mais perigoso é misturar a ligação: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' é impossível, já que soy pertence só ao "eu", e tú exige eres.', semantic: 'explanation' }),
      vi: R({ text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' đúng ngữ pháp, nhưng người bản xứ chỉ nói ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' — đại từ thừa, dù không phải lỗi. Nguy hiểm hơn là nhầm từ nối: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' là không thể, vì soy chỉ thuộc về "tôi", còn tú đòi hỏi eres.', semantic: 'explanation' }),
      id: R({ text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' benar secara tata bahasa, tetapi penutur asli hanya akan mengatakan ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' — kata ganti itu berlebihan, meski bukan kesalahan. Lebih berbahaya adalah mengacaukan kata penghubung: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' tidak mungkin, karena soy hanya milik "aku", dan tú memerlukan eres.', semantic: 'explanation' }),
      tr: R({ text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' gramer açısından doğrudur, ama anadili konuşan sadece ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' derdi — zamir gereksizdir, ama hata değildir. Daha tehlikelisi bağlacı karıştırmaktır: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' imkânsızdır, çünkü soy yalnızca "ben"e aittir ve tú, eres gerektirir.', semantic: 'explanation' }),
      pl: R({ text: 'Tú eres bonito', semantic: 'explanation' }, { text: ' jest gramatycznie poprawne, ale rodzimy użytkownik powiedziałby po prostu ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' — zaimek jest zbędny, choć nie błędny. Groźniejsze jest pomylenie łącznika: ', semantic: 'explanation' }, { text: 'Tú soy rápido', semantic: 'targetWrong' }, { text: ' jest niemożliwe, bo soy należy tylko do „ja”, a tú wymaga eres.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно сказать собеседнику про его скорость, без лишнего слова впереди?',
        uk: 'Як правильно сказати співрозмовнику про його швидкість, без зайвого слова попереду?',
        es: 'How do you correctly tell the listener about their speed, without an extra word in front?',
        'pt-BR': 'Como dizer corretamente ao interlocutor sobre sua velocidade, sem palavra extra na frente?',
        vi: 'Nói đúng với người nghe về tốc độ của họ, không có từ thừa phía trước, như thế nào?',
        id: 'Bagaimana cara mengatakan dengan benar kepada pendengar tentang kecepatannya, tanpa kata tambahan di depan?',
        tr: 'Dinleyiciye hızı hakkında, önünde fazladan kelime olmadan doğru nasıl söylenir?',
        pl: 'Jak poprawnie powiedzieć słuchaczowi o jego szybkości, bez zbędnego słowa z przodu?',
      }),
      choices: [
        L({ ru: 'Eres rápido', uk: 'Eres rápido', es: 'Eres rápido', 'pt-BR': 'Eres rápido', vi: 'Eres rápido', id: 'Eres rápido', tr: 'Eres rápido', pl: 'Eres rápido' }),
        L({ ru: 'Tú soy rápido', uk: 'Tú soy rápido', es: 'Tú soy rápido', 'pt-BR': 'Tú soy rápido', vi: 'Tú soy rápido', id: 'Tú soy rápido', tr: 'Tú soy rápido', pl: 'Tú soy rápido' }),
        L({ ru: 'Tú eres rápido', uk: 'Tú eres rápido', es: 'Tú eres rápido', 'pt-BR': 'Tú eres rápido', vi: 'Tú eres rápido', id: 'Tú eres rápido', tr: 'Tú eres rápido', pl: 'Tú eres rápido' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Eres rápido верно и короче всего: связка eres уже называет собеседника. Второй вариант вообще невозможен — soy принадлежит только «я», а третий просто длиннее без надобности.',
        uk: 'Eres rápido правильно і найкоротше: зв’язка eres вже називає співрозмовника. Другий варіант взагалі неможливий — soy належить тільки «я», а третій просто довший без потреби.',
        es: 'Eres rápido is correct and the shortest: the linking word eres already names the listener. The second option is impossible — soy belongs only to "I" — and the third is simply longer than needed.',
        'pt-BR': 'Eres rápido está correto e é o mais curto: a ligação eres já nomeia o interlocutor. A segunda opção é impossível — soy pertence só ao "eu" — e a terceira é só mais longa do que precisa.',
        vi: 'Eres rápido đúng và ngắn nhất: từ nối eres đã gọi tên người nghe. Lựa chọn thứ hai là không thể — soy chỉ thuộc về "tôi" — còn lựa chọn thứ ba chỉ dài hơn mức cần thiết.',
        id: 'Eres rápido benar dan paling pendek: kata penghubung eres sudah menyebut pendengar. Pilihan kedua tidak mungkin — soy hanya milik "aku" — dan pilihan ketiga hanya lebih panjang dari yang diperlukan.',
        tr: 'Eres rápido doğrudur ve en kısasıdır: eres bağlacı dinleyiciyi zaten adlandırır. İkinci seçenek imkânsızdır — soy yalnızca "ben"e aittir — üçüncüsü ise gereğinden fazla uzundur.',
        pl: 'Eres rápido jest poprawne i najkrótsze: łącznik eres już nazywa słuchacza. Druga opcja jest niemożliwa — soy należy tylko do „ja” — a trzecia jest po prostu dłuższa niż trzeba.',
      }),
    },
  },
];
