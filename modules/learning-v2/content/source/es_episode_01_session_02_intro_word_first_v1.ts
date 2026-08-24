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

const CONCEPT_BODY = L({
  ru: 'Es fácil значит «это легко». Чтобы возразить, испанский добавляет одно слово перед связкой: No es fácil — «это не легко». No встаёт прямо перед es и переворачивает смысл на противоположный, больше ничего в фразе не меняется. Испанское отрицание проще английского: одно слово на своём месте, никаких дополнительных глаголов-помощников.',
  uk: 'Es fácil означає «це легко». Щоб заперечити, іспанська додає одне слово перед зв’язкою: No es fácil — «це не легко». No стає прямо перед es і перевертає сенс на протилежний, більше нічого у фразі не змінюється. Іспанське заперечення простіше за англійське: одне слово на своєму місці, жодних додаткових допоміжних дієслів.',
  es: 'Es fácil means "it is easy". To disagree, Spanish adds one word before the linking word: No es fácil — "it is not easy". No goes right before es and flips the meaning to its opposite; nothing else in the phrase changes. Spanish negation is simpler than English: one word in its place, no extra helper verbs needed.',
  'pt-BR': 'Es fácil significa "é fácil". Para discordar, o espanhol adiciona uma palavra antes da ligação: No es fácil — "não é fácil". No fica bem antes de es e vira o sentido para o oposto; mais nada na frase muda. A negação em espanhol é mais simples que em inglês: uma palavra no seu lugar, sem verbos auxiliares extras.',
  vi: 'Es fácil nghĩa là "điều này dễ". Để phản đối, tiếng Tây Ban Nha thêm một từ trước từ nối: No es fácil — "điều này không dễ". No đứng ngay trước es và đảo ngược ý nghĩa, không có gì khác trong câu thay đổi. Phủ định tiếng Tây Ban Nha đơn giản hơn tiếng Anh: một từ đúng chỗ, không cần động từ trợ giúp thêm.',
  id: 'Es fácil berarti "ini mudah". Untuk tidak setuju, bahasa Spanyol menambahkan satu kata sebelum kata penghubung: No es fácil — "ini tidak mudah". No berada tepat sebelum es dan membalikkan makna menjadi kebalikannya; tidak ada yang lain dalam kalimat yang berubah. Penyangkalan bahasa Spanyol lebih sederhana daripada bahasa Inggris: satu kata pada tempatnya, tanpa kata kerja bantu tambahan.',
  tr: 'Es fácil "bu kolay" demektir. Karşı çıkmak için İspanyolca bağlayıcıdan önce bir kelime ekler: No es fácil — "bu kolay değil". No tam olarak es\'ten önce gelir ve anlamı tersine çevirir; cümlede başka hiçbir şey değişmez. İspanyolca olumsuzlama İngilizceden daha basittir: yerinde tek bir kelime, ekstra yardımcı fiil gerekmez.',
  pl: 'Es fácil znaczy „to jest łatwe”. Żeby się nie zgodzić, hiszpański dodaje jedno słowo przed łącznikiem: No es fácil — „to nie jest łatwe”. No stoi tuż przed es i odwraca sens na przeciwny; nic więcej w zdaniu się nie zmienia. Hiszpańskie przeczenie jest prostsze niż angielskie: jedno słowo na swoim miejscu, bez dodatkowych czasowników posiłkowych.',
});

const FORMULA_BODY = L({
  ru: 'Формула проста: no + связка + признак. No всегда стоит перед связкой — перед es, soy или другой формой ser — никогда после. No es verdad — «это неправда»: то же самое правило работает с любой уже знакомой фразой. Слово no не меняется никогда: ни по лицу, ни по роду, ни по числу — единственная неизменная форма во всей фразе.',
  uk: 'Формула проста: no + зв’язка + ознака. No завжди стоїть перед зв’язкою — перед es, soy чи іншою формою ser — ніколи після. No es verdad — «це неправда»: те саме правило працює з будь-якою вже знайомою фразою. Слово no не змінюється ніколи: ні за особою, ні за родом, ні за числом — єдина незмінна форма в усій фразі.',
  es: 'The formula is simple: no + linking word + quality. No always comes before the linking word — before es, soy, or another form of ser — never after. No es verdad — "that is not true": the same rule works with any phrase already known. The word no never changes: not for person, not for gender, not for number — the one invariable form in the whole phrase.',
  'pt-BR': 'A fórmula é simples: no + ligação + qualidade. No vem sempre antes da ligação — antes de es, soy ou outra forma de ser — nunca depois. No es verdad — "não é verdade": a mesma regra funciona com qualquer frase já conhecida. A palavra no nunca muda: nem por pessoa, nem por gênero, nem por número — a única forma invariável em toda a frase.',
  vi: 'Công thức đơn giản: no + từ nối + đặc điểm. No luôn đứng trước từ nối — trước es, soy hoặc dạng khác của ser — không bao giờ đứng sau. No es verdad — "điều đó không đúng": quy tắc tương tự áp dụng cho bất kỳ câu nào đã biết. Từ no không bao giờ đổi: không theo ngôi, không theo giống, không theo số — dạng bất biến duy nhất trong cả câu.',
  id: 'Rumusnya sederhana: no + kata penghubung + sifat. No selalu berada sebelum kata penghubung — sebelum es, soy, atau bentuk ser lainnya — tidak pernah di belakang. No es verdad — "itu tidak benar": aturan yang sama berlaku untuk kalimat apa pun yang sudah dikenal. Kata no tidak pernah berubah: tidak menurut orang, tidak menurut gender, tidak menurut jumlah — satu-satunya bentuk yang tidak berubah dalam seluruh kalimat.',
  tr: 'Formül basittir: no + bağlayıcı + nitelik. No her zaman bağlayıcıdan önce gelir — es, soy ya da başka bir ser biçiminden önce — asla sonra değil. No es verdad — "bu doğru değil": aynı kural zaten bilinen herhangi bir cümlede işler. No sözcüğü asla değişmez: ne kişiye, ne cinsiyete, ne sayıya göre — tüm cümledeki tek değişmez biçimdir.',
  pl: 'Formuła jest prosta: no + łącznik + cecha. No zawsze stoi przed łącznikiem — przed es, soy lub inną formą ser — nigdy po. No es verdad — „to nieprawda”: ta sama zasada działa z każdym już znanym zdaniem. Słowo no nigdy się nie zmienia: ani przez osobę, ani przez rodzaj, ani przez liczbę — jedyna niezmienna forma w całym zdaniu.',
});

const TRAP_BODY = L({
  ru: 'Легко спутать no с похожими словами. Nada означает «ничего» и само является предметом разговора — «Es nada» значило бы «это ничто», совсем другая мысль, чем отрицание. Non вообще не испанское слово: испанское отрицание не берёт финальную n, только no. Надёжный ориентир: если хочется сказать «не», перед связкой встаёт ровно два звука — n и o, и больше ничего.',
  uk: 'Легко сплутати no зі схожими словами. Nada означає «нічого» й сам є предметом розмови — «Es nada» означало б «це ніщо», зовсім інша думка, ніж заперечення. Non узагалі не іспанське слово: іспанське заперечення не бере фінальну n, тільки no. Надійний орієнтир: якщо хочеться сказати «не», перед зв’язкою стає рівно два звуки — n і o, і більше нічого.',
  es: 'It is easy to confuse no with similar words. Nada means "nothing" and is itself the thing being talked about — "Es nada" would mean "it is nothing", a completely different idea from negation. Non is not a Spanish word at all: Spanish negation does not take a final n, only no. The safe anchor: if you want to say "not", exactly two sounds go before the linking word — n and o, nothing more.',
  'pt-BR': 'É fácil confundir no com palavras parecidas. Nada significa "nada" e é o próprio assunto da frase — "Es nada" significaria "isso é nada", uma ideia completamente diferente da negação. Non não é palavra do espanhol de jeito nenhum: a negação em espanhol não leva n final, só no. A referência segura: para dizer "não", exatamente dois sons vêm antes da ligação — n e o, nada mais.',
  vi: 'Rất dễ nhầm no với những từ giống nó. Nada nghĩa là "không có gì" và tự nó là chủ đề của câu nói — "Es nada" sẽ có nghĩa là "đó là không có gì", một ý hoàn toàn khác với phủ định. Non hoàn toàn không phải từ tiếng Tây Ban Nha: phủ định tiếng Tây Ban Nha không có n ở cuối, chỉ có no. Điểm tựa chắc chắn: nếu muốn nói "không", đúng hai âm đứng trước từ nối — n và o, không hơn.',
  id: 'Mudah untuk salah mengira no dengan kata-kata serupa. Nada berarti "tidak ada apa-apa" dan itu sendiri adalah hal yang dibicarakan — "Es nada" akan berarti "itu adalah ketiadaan", ide yang sama sekali berbeda dari penyangkalan. Non sama sekali bukan kata bahasa Spanyol: penyangkalan bahasa Spanyol tidak memiliki n di akhir, hanya no. Patokan yang aman: jika ingin mengatakan "tidak", persis dua bunyi datang sebelum kata penghubung — n dan o, tidak lebih.',
  tr: 'No sözcüğünü benzer kelimelerle karıştırmak kolaydır. Nada "hiçbir şey" demektir ve kendisi konuşulan şeydir — "Es nada" "bu hiçbir şey" anlamına gelirdi, olumsuzlamadan tamamen farklı bir fikir. Non İspanyolcada hiç yoktur: İspanyolca olumsuzlama sonda n almaz, sadece no. Güvenilir dayanak: "değil" demek isterseniz, bağlayıcıdan önce tam olarak iki ses gelir — n ve o, başka bir şey değil.',
  pl: 'Łatwo pomylić no z podobnymi słowami. Nada znaczy „nic” i samo jest tematem rozmowy — „Es nada” znaczyłoby „to jest nic”, zupełnie inna myśl niż przeczenie. Non w ogóle nie jest hiszpańskim słowem: hiszpańskie przeczenie nie ma końcowego n, tylko no. Pewny punkt odniesienia: jeśli chcesz powiedzieć „nie”, przed łącznikiem stoją dokładnie dwa dźwięki — n i o, nic więcej.',
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
      ru: R({ text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' значит «это легко». Чтобы возразить, испанский добавляет одно слово перед связкой: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — «это не легко». ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' встаёт прямо перед ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' и переворачивает смысл на противоположный, больше ничего в фразе не меняется. Испанское отрицание проще английского: одно слово на своём месте, никаких дополнительных глаголов-помощников.', semantic: 'explanation' }),
      uk: R({ text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' означає «це легко». Щоб заперечити, іспанська додає одне слово перед зв’язкою: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — «це не легко». ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' стає прямо перед ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' і перевертає сенс на протилежний, більше нічого у фразі не змінюється. Іспанське заперечення простіше за англійське: одне слово на своєму місці, жодних додаткових допоміжних дієслів.', semantic: 'explanation' }),
      es: R({ text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' means "it is easy". To disagree, Spanish adds one word before the linking word: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "it is not easy". ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' goes right before ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' and flips the meaning to its opposite; nothing else in the phrase changes. Spanish negation is simpler than English: one word in its place, no extra helper verbs needed.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' significa "é fácil". Para discordar, o espanhol adiciona uma palavra antes da ligação: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "não é fácil". ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' fica bem antes de ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' e vira o sentido para o oposto; mais nada na frase muda. A negação em espanhol é mais simples que em inglês: uma palavra no seu lugar, sem verbos auxiliares extras.', semantic: 'explanation' }),
      vi: R({ text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' nghĩa là "điều này dễ". Để phản đối, tiếng Tây Ban Nha thêm một từ trước từ nối: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "điều này không dễ". ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' đứng ngay trước ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' và đảo ngược ý nghĩa, không có gì khác trong câu thay đổi. Phủ định tiếng Tây Ban Nha đơn giản hơn tiếng Anh: một từ đúng chỗ, không cần động từ trợ giúp thêm.', semantic: 'explanation' }),
      id: R({ text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' berarti "ini mudah". Untuk tidak setuju, bahasa Spanyol menambahkan satu kata sebelum kata penghubung: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "ini tidak mudah". ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' berada tepat sebelum ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' dan membalikkan makna menjadi kebalikannya; tidak ada yang lain dalam kalimat yang berubah. Penyangkalan bahasa Spanyol lebih sederhana daripada bahasa Inggris: satu kata pada tempatnya, tanpa kata kerja bantu tambahan.', semantic: 'explanation' }),
      tr: R({ text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' "bu kolay" demektir. Karşı çıkmak için İspanyolca bağlayıcıdan önce bir kelime ekler: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — "bu kolay değil". ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' tam olarak ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '\'ten önce gelir ve anlamı tersine çevirir; cümlede başka hiçbir şey değişmez. İspanyolca olumsuzlama İngilizceden daha basittir: yerinde tek bir kelime, ekstra yardımcı fiil gerekmez.', semantic: 'explanation' }),
      pl: R({ text: 'Es fácil', semantic: 'targetCorrect' }, { text: ' znaczy „to jest łatwe”. Żeby się nie zgodzić, hiszpański dodaje jedno słowo przed łącznikiem: ', semantic: 'explanation' }, { text: 'No es fácil', semantic: 'targetCorrect' }, { text: ' — „to nie jest łatwe”. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' stoi tuż przed ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' i odwraca sens na przeciwny; nic więcej w zdaniu się nie zmienia. Hiszpańskie przeczenie jest prostsze niż angielskie: jedno słowo na swoim miejscu, bez dodatkowych czasowników posiłkowych.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула проста: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' + связка + признак. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' всегда стоит перед связкой, перед ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' или другой формой ser — никогда после. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — «это неправда»: то же самое правило работает с любой уже знакомой фразой. Слово ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' не меняется никогда: ни по лицу, ни по роду, ни по числу — единственная неизменная форма во всей фразе.', semantic: 'explanation' }),
      uk: R({ text: 'Формула проста: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' + зв’язка + ознака. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' завжди стоїть перед зв’язкою, перед ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' чи іншою формою ser — ніколи після. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — «це неправда»: те саме правило працює з будь-якою вже знайомою фразою. Слово ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' не змінюється ніколи: ні за особою, ні за родом, ні за числом — єдина незмінна форма в усій фразі.', semantic: 'explanation' }),
      es: R({ text: 'The formula is simple: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' + linking word + quality. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' always comes before the linking word, before ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ', or another form of ser — never after. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — "that is not true": the same rule works with any phrase already known. The word ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' never changes: not for person, not for gender, not for number — the one invariable form in the whole phrase.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é simples: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' + ligação + qualidade. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' vem sempre antes da ligação, antes de ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' ou outra forma de ser — nunca depois. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — "não é verdade": a mesma regra funciona com qualquer frase já conhecida. A palavra ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' nunca muda: nem por pessoa, nem por gênero, nem por número — a única forma invariável em toda a frase.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức đơn giản: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' + từ nối + đặc điểm. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' luôn đứng trước từ nối, trước ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' hoặc dạng khác của ser — không bao giờ đứng sau. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — "điều đó không đúng": quy tắc tương tự áp dụng cho bất kỳ câu nào đã biết. Từ ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' không bao giờ đổi: không theo ngôi, không theo giống, không theo số — dạng bất biến duy nhất trong cả câu.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sederhana: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' + kata penghubung + sifat. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' selalu berada sebelum kata penghubung, sebelum ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ', atau bentuk ser lainnya — tidak pernah di belakang. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — "itu tidak benar": aturan yang sama berlaku untuk kalimat apa pun yang sudah dikenal. Kata ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' tidak pernah berubah: tidak menurut orang, tidak menurut gender, tidak menurut jumlah — satu-satunya bentuk yang tidak berubah dalam seluruh kalimat.', semantic: 'explanation' }),
      tr: R({ text: 'Formül basittir: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' + bağlayıcı + nitelik. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' her zaman bağlayıcıdan önce gelir, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' ya da başka bir ser biçiminden önce — asla sonra değil. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — "bu doğru değil": aynı kural zaten bilinen herhangi bir cümlede işler. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' sözcüğü asla değişmez: ne kişiye, ne cinsiyete, ne sayıya göre — tüm cümledeki tek değişmez biçimdir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest prosta: ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' + łącznik + cecha. ', semantic: 'explanation' }, { text: 'No', semantic: 'targetCorrect' }, { text: ' zawsze stoi przed łącznikiem, przed ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' lub inną formą ser — nigdy po. ', semantic: 'explanation' }, { text: 'No es verdad', semantic: 'targetCorrect' }, { text: ' — „to nieprawda”: ta sama zasada działa z każdym już znanym zdaniem. Słowo ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' nigdy się nie zmienia: ani przez osobę, ani przez rodzaj, ani przez liczbę — jedyna niezmienna forma w całym zdaniu.', semantic: 'explanation' }),
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
      ru: R({ text: 'Легко спутать ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' с похожими словами. ', semantic: 'explanation' }, { text: 'Nada', semantic: 'targetWrong' }, { text: ' означает «ничего» и само является предметом разговора — «Es nada» значило бы «это ничто», совсем другая мысль, чем отрицание. ', semantic: 'explanation' }, { text: 'Non', semantic: 'targetWrong' }, { text: ' вообще не испанское слово: испанское отрицание не берёт финальную n, только ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: '. Надёжный ориентир: если хочется сказать «не», перед связкой встаёт ровно два звука — n и o, и больше ничего.', semantic: 'explanation' }),
      uk: R({ text: 'Легко сплутати ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' зі схожими словами. ', semantic: 'explanation' }, { text: 'Nada', semantic: 'targetWrong' }, { text: ' означає «нічого» й сам є предметом розмови — «Es nada» означало б «це ніщо», зовсім інша думка, ніж заперечення. ', semantic: 'explanation' }, { text: 'Non', semantic: 'targetWrong' }, { text: ' узагалі не іспанське слово: іспанське заперечення не бере фінальну n, тільки ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: '. Надійний орієнтир: якщо хочеться сказати «не», перед зв’язкою стає рівно два звуки — n і o, і більше нічого.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to confuse ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' with similar words. ', semantic: 'explanation' }, { text: 'Nada', semantic: 'targetWrong' }, { text: ' means "nothing" and is itself the thing being talked about — "Es nada" would mean "it is nothing", a completely different idea from negation. ', semantic: 'explanation' }, { text: 'Non', semantic: 'targetWrong' }, { text: ' is not a Spanish word at all: Spanish negation does not take a final n, only ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: '. The safe anchor: if you want to say "not", exactly two sounds go before the linking word — n and o, nothing more.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil confundir ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' com palavras parecidas. ', semantic: 'explanation' }, { text: 'Nada', semantic: 'targetWrong' }, { text: ' significa "nada" e é o próprio assunto da frase — "Es nada" significaria "isso é nada", uma ideia completamente diferente da negação. ', semantic: 'explanation' }, { text: 'Non', semantic: 'targetWrong' }, { text: ' não é palavra do espanhol de jeito nenhum: a negação em espanhol não leva n final, só ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: '. A referência segura: para dizer "não", exatamente dois sons vêm antes da ligação — n e o, nada mais.', semantic: 'explanation' }),
      vi: R({ text: 'Rất dễ nhầm ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' với những từ giống nó. ', semantic: 'explanation' }, { text: 'Nada', semantic: 'targetWrong' }, { text: ' nghĩa là "không có gì" và tự nó là chủ đề của câu nói — "Es nada" sẽ có nghĩa là "đó là không có gì", một ý hoàn toàn khác với phủ định. ', semantic: 'explanation' }, { text: 'Non', semantic: 'targetWrong' }, { text: ' hoàn toàn không phải từ tiếng Tây Ban Nha: phủ định tiếng Tây Ban Nha không có n ở cuối, chỉ có ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: '. Điểm tựa chắc chắn: nếu muốn nói "không", đúng hai âm đứng trước từ nối — n và o, không hơn.', semantic: 'explanation' }),
      id: R({ text: 'Mudah untuk salah mengira ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' dengan kata-kata serupa. ', semantic: 'explanation' }, { text: 'Nada', semantic: 'targetWrong' }, { text: ' berarti "tidak ada apa-apa" dan itu sendiri adalah hal yang dibicarakan — "Es nada" akan berarti "itu adalah ketiadaan", ide yang sama sekali berbeda dari penyangkalan. ', semantic: 'explanation' }, { text: 'Non', semantic: 'targetWrong' }, { text: ' sama sekali bukan kata bahasa Spanyol: penyangkalan bahasa Spanyol tidak memiliki n di akhir, hanya ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: '. Patokan yang aman: jika ingin mengatakan "tidak", persis dua bunyi datang sebelum kata penghubung — n dan o, tidak lebih.', semantic: 'explanation' }),
      tr: R({ text: 'No', semantic: 'targetCorrect' }, { text: ' sözcüğünü benzer kelimelerle karıştırmak kolaydır. ', semantic: 'explanation' }, { text: 'Nada', semantic: 'targetWrong' }, { text: ' "hiçbir şey" demektir ve kendisi konuşulan şeydir — "Es nada" "bu hiçbir şey" anlamına gelirdi, olumsuzlamadan tamamen farklı bir fikir. ', semantic: 'explanation' }, { text: 'Non', semantic: 'targetWrong' }, { text: ' İspanyolcada hiç yoktur: İspanyolca olumsuzlama sonda n almaz, sadece ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: '. Güvenilir dayanak: "değil" demek isterseniz, bağlayıcıdan önce tam olarak iki ses gelir — n ve o, başka bir şey değil.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomylić ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: ' z podobnymi słowami. ', semantic: 'explanation' }, { text: 'Nada', semantic: 'targetWrong' }, { text: ' znaczy „nic” i samo jest tematem rozmowy — „Es nada” znaczyłoby „to jest nic”, zupełnie inna myśl niż przeczenie. ', semantic: 'explanation' }, { text: 'Non', semantic: 'targetWrong' }, { text: ' w ogóle nie jest hiszpańskim słowem: hiszpańskie przeczenie nie ma końcowego n, tylko ', semantic: 'explanation' }, { text: 'no', semantic: 'targetCorrect' }, { text: '. Pewny punkt odniesienia: jeśli chcesz powiedzieć „nie”, przed łącznikiem stoją dokładnie dwa dźwięki — n i o, nic więcej.', semantic: 'explanation' }),
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
