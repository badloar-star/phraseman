import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл переписан (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// §7 + LEARNING_CONTENT_STYLE_BIBLE.ru.md правило 2): исходный черновик от
// 2026-08-25 держал тела intro на ~470-630 знаков на локаль — за потолком
// intro_body_overloaded (320 знаков / 2-4 предложения,
// learning_content_quality_gate_v1.ts). Смысл сохранён (concept/formula/trap
// про de acuerdo — застывшую формулу согласия из двух слов, отличную от
// verdad и igual, неизменяемую по роду/числу), текст сжат. Инлайновый
// пример с ¿...? сокращён до одного на страницу (класс бага сессии 10).
// Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 14,
// "Согласен или нет" / agreement_phrase, builtOn: [5, 10], recalls: [5, 10].
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_14_WORD_FIRST_TITLE = L({
  ru: 'Согласен или нет',
  uk: 'Згоден чи ні',
  es: 'Agreed or not',
  'pt-BR': 'Concordo ou não',
  vi: 'Đồng ý hay không',
  id: 'Setuju atau tidak',
  tr: 'Katılıyorum ya da değilim',
  pl: 'Zgadzam się czy nie',
});

export const ES_EPISODE_01_SESSION_14_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое выражение — de acuerdo — служит самостоятельной репликой согласия, неизменяемой ни по роду, ни по числу.',
  uk: 'Один новий вислів — de acuerdo — слугує самостійною реплікою згоди, незмінною ні за родом, ні за числом.',
  es: 'One new expression — de acuerdo — serves as a standalone reply of agreement, unchanging by gender or number.',
  'pt-BR': 'Uma expressão nova — de acuerdo — serve como uma resposta independente de concordância, invariável por gênero ou número.',
  vi: 'Một cách diễn đạt mới — de acuerdo — dùng như một câu trả lời độc lập thể hiện sự đồng ý, không đổi theo giống hay số.',
  id: 'Satu ungkapan baru — de acuerdo — berfungsi sebagai balasan mandiri persetujuan, tidak berubah oleh gender atau jumlah.',
  tr: 'Bir yeni ifade — de acuerdo — cinsiyete ya da sayıya göre değişmeyen bağımsız bir onay yanıtı olarak işlev görür.',
  pl: 'Jedno nowe wyrażenie — de acuerdo — służy jako samodzielna odpowiedź wyrażająca zgodę, niezmienna przez rodzaj czy liczbę.',
});

export const ES_EPISODE_01_SESSION_14_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать de acuerdo как реакцию на чужое мнение, отдельно от verdad и igual.',
  uk: 'Упізнати на слух, зрозуміти й точно написати de acuerdo як реакцію на чужу думку, окремо від verdad та igual.',
  es: 'Recognize by ear, understand, and correctly write de acuerdo as a reaction to someone else\'s opinion, distinct from verdad and igual.',
  'pt-BR': 'Reconhecer de ouvido, entender e escrever corretamente de acuerdo como uma reação à opinião de outra pessoa, distinta de verdad e igual.',
  vi: 'Nghe ra, hiểu và viết đúng de acuerdo như một phản ứng với ý kiến của người khác, tách biệt với verdad và igual.',
  id: 'Mengenali dari suara, memahami, dan menulis de acuerdo dengan tepat sebagai reaksi terhadap pendapat orang lain, berbeda dari verdad dan igual.',
  tr: 'De acuerdo\'yu başkasının fikrine bir tepki olarak duyup tanımak, anlamak ve doğru yazmak; verdad ve igual\'den ayırt etmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać de acuerdo jako reakcję na czyjąś opinię, odróżniając je od verdad i igual.',
});

const CONCEPT_BODY = L({
  ru: 'De acuerdo — устойчивая реакция на чужое мнение, которую говорят целиком, двумя словами сразу. Verdad подтверждает правду факта, igual выражает безразличие — de acuerdo выражает именно согласие с мнением, ни то и ни другое.',
  uk: 'De acuerdo — стала реакція на чужу думку, яку кажуть цілком, двома словами одразу. Verdad підтверджує правду факту, igual висловлює байдужість — de acuerdo виражає саме згоду з думкою, ні те ні інше.',
  es: 'De acuerdo is a fixed reaction to someone else\'s opinion, said as a whole, two words at once. Verdad confirms the truth of a fact, igual expresses indifference — de acuerdo expresses exactly agreement with an opinion, neither of those.',
  'pt-BR': 'De acuerdo é uma reação fixa à opinião de outra pessoa, dita por inteiro, duas palavras de uma vez. Verdad confirma a verdade de um fato, igual expressa indiferença — de acuerdo expressa exatamente concordância com uma opinião, nenhuma das duas.',
  vi: 'De acuerdo là một phản ứng cố định với ý kiến người khác, được nói trọn vẹn, hai từ cùng lúc. Verdad xác nhận sự thật của một sự kiện, igual thể hiện sự thờ ơ — de acuerdo thể hiện chính xác sự đồng ý với một ý kiến, không phải hai thứ kia.',
  id: 'De acuerdo adalah reaksi tetap terhadap pendapat orang lain, diucapkan secara utuh, dua kata sekaligus. Verdad mengonfirmasi kebenaran fakta, igual mengungkapkan ketidakpedulian — de acuerdo mengungkapkan tepatnya persetujuan dengan pendapat, bukan keduanya itu.',
  tr: 'De acuerdo, başkasının fikrine karşı bütün olarak, iki kelime birden söylenen sabit bir tepkidir. Verdad bir gerçeğin doğruluğunu onaylar, igual kayıtsızlığı ifade eder — de acuerdo tam olarak bir fikre katılımı ifade eder, ikisi de değil.',
  pl: 'De acuerdo to utrwalona reakcja na czyjąś opinię, wypowiadana w całości, od razu dwoma słowami. Verdad potwierdza prawdziwość faktu, igual wyraża obojętność — de acuerdo wyraża dokładnie zgodę z opinią, żadne z tamtych dwóch.',
});

const FORMULA_BODY = L({
  ru: 'De acuerdo используют как самостоятельную реплику или как часть вопроса с eres: ¿Eres de acuerdo? Нет, форма всегда одна — de acuerdo не меняется по роду или числу, потому что это застывшая формула, а не прилагательное.',
  uk: 'De acuerdo використовують як самостійну репліку або як частину питання з eres: ¿Eres de acuerdo? Ні, форма завжди одна — de acuerdo не змінюється за родом чи числом, бо це застигла формула, а не прикметник.',
  es: 'De acuerdo is used as a standalone reply or as part of a question with eres: ¿Eres de acuerdo? No, the form is always the same — de acuerdo does not change by gender or number, because it is a fixed formula, not an adjective.',
  'pt-BR': 'De acuerdo é usado como resposta independente ou como parte de uma pergunta com eres: ¿Eres de acuerdo? Não, a forma é sempre a mesma — de acuerdo não muda por gênero ou número, porque é uma fórmula fixa, não um adjetivo.',
  vi: 'De acuerdo được dùng như một câu trả lời độc lập hoặc là một phần của câu hỏi với eres: ¿Eres de acuerdo? Không, dạng luôn giữ nguyên — de acuerdo không đổi theo giống hay số, vì đó là công thức cố định, không phải tính từ.',
  id: 'De acuerdo digunakan sebagai balasan mandiri atau sebagai bagian dari pertanyaan dengan eres: ¿Eres de acuerdo? Tidak, bentuknya selalu sama — de acuerdo tidak berubah menurut gender atau jumlah, karena itu rumus tetap, bukan kata sifat.',
  tr: 'De acuerdo bağımsız bir yanıt olarak ya da eres ile bir sorunun parçası olarak kullanılır: ¿Eres de acuerdo? Hayır, biçim her zaman aynıdır — de acuerdo cinsiyete ya da sayıya göre değişmez, çünkü bu sabit bir formüldür, bir sıfat değildir.',
  pl: 'De acuerdo używa się jako samodzielnej odpowiedzi lub jako części pytania z eres: ¿Eres de acuerdo? Nie, forma jest zawsze taka sama — de acuerdo nie zmienia się przez rodzaj ani liczbę, ponieważ jest to utrwalona formuła, nie przymiotnik.',
});

const TRAP_BODY = L({
  ru: 'Легко перепутать de acuerdo с es verdad — обе звучат как реакция на чужие слова, но verdad про правду факта, de acuerdo про согласие с мнением. Вторая ловушка — es igual вместо de acuerdo: igual означает безразличие, не согласие. Третья ошибка — написать оба слова слитно: правильно всегда через пробел, de acuerdo.',
  uk: 'Легко сплутати de acuerdo з es verdad — обидві звучать як реакція на чужі слова, але verdad про правду факту, de acuerdo про згоду з думкою. Друга пастка — es igual замість de acuerdo: igual означає байдужість, не згоду. Третя помилка — написати обидва слова разом: правильно завжди через пробіл, de acuerdo.',
  es: 'It is easy to confuse de acuerdo with es verdad — verdad is about the truth of a fact, de acuerdo about agreement with an opinion. The second trap is es igual instead of de acuerdo: igual means indifference. The third mistake is deacuerdo together: it is always written with a space.',
  'pt-BR': 'É fácil confundir de acuerdo com es verdad — verdad é sobre a verdade de um fato, de acuerdo sobre concordância com uma opinião. A segunda armadilha é es igual em vez de de acuerdo: igual significa indiferença. O terceiro erro é deacuerdo junto: sempre se escreve com espaço.',
  vi: 'Dễ nhầm de acuerdo với es verdad — verdad nói về sự thật, de acuerdo nói về sự đồng ý với ý kiến. Cái bẫy thứ hai là es igual thay vì de acuerdo: igual nghĩa là thờ ơ. Lỗi thứ ba là deacuerdo liền nhau: luôn viết cách nhau.',
  id: 'Mudah mengacaukan de acuerdo dengan es verdad — verdad tentang kebenaran fakta, de acuerdo tentang persetujuan dengan pendapat. Jebakan kedua adalah es igual alih-alih de acuerdo: igual berarti ketidakpedulian. Kesalahan ketiga adalah deacuerdo bersambung: selalu ditulis dengan spasi.',
  tr: 'De acuerdo\'yu es verdad ile karıştırmak kolaydır — verdad bir gerçeğin doğruluğuyla, de acuerdo bir fikre katılımla ilgilidir. İkinci tuzak, de acuerdo yerine es igual\'dir: igual kayıtsızlık demektir. Üçüncü hata, deacuerdo\'yu bitişik yazmaktır: her zaman boşlukla yazılır.',
  pl: 'Łatwo pomylić de acuerdo z es verdad — verdad dotyczy prawdziwości faktu, de acuerdo zgody z opinią. Druga pułapka to es igual zamiast de acuerdo: igual znaczy obojętność. Trzeci błąd to deacuerdo razem: zawsze pisze się z odstępem.',
});

export const ES_EPISODE_01_SESSION_14_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Согласие — не факт и не безразличие',
      uk: 'Згода — не факт і не байдужість',
      es: 'Agreement is not a fact and not indifference',
      'pt-BR': 'Concordância não é fato nem indiferença',
      vi: 'Đồng ý không phải sự thật và không phải thờ ơ',
      id: 'Persetujuan bukan fakta dan bukan ketidakpedulian',
      tr: 'Katılım bir gerçek ya da kayıtsızlık değildir',
      pl: 'Zgoda to nie fakt ani obojętność',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'De acuerdo', semantic: 'explanation' }, { text: ' — устойчивая реакция на чужое мнение, которую говорят целиком, двумя словами сразу. Verdad подтверждает правду факта, igual выражает безразличие — ', semantic: 'explanation' }, { text: 'de acuerdo выражает именно согласие с мнением', semantic: 'targetCorrect' }, { text: ', ни то и ни другое.', semantic: 'explanation' }),
      uk: R({ text: 'De acuerdo', semantic: 'explanation' }, { text: ' — стала реакція на чужу думку, яку кажуть цілком, двома словами одразу. Verdad підтверджує правду факту, igual висловлює байдужість — ', semantic: 'explanation' }, { text: 'de acuerdo виражає саме згоду з думкою', semantic: 'targetCorrect' }, { text: ', ні те ні інше.', semantic: 'explanation' }),
      es: R({ text: 'De acuerdo', semantic: 'explanation' }, { text: ' is a fixed reaction to someone else\'s opinion, said as a whole, two words at once. Verdad confirms the truth of a fact, igual expresses indifference — ', semantic: 'explanation' }, { text: 'de acuerdo expresses exactly agreement with an opinion', semantic: 'targetCorrect' }, { text: ', neither of those.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'De acuerdo', semantic: 'explanation' }, { text: ' é uma reação fixa à opinião de outra pessoa, dita por inteiro, duas palavras de uma vez. Verdad confirma a verdade de um fato, igual expressa indiferença — ', semantic: 'explanation' }, { text: 'de acuerdo expressa exatamente concordância com uma opinião', semantic: 'targetCorrect' }, { text: ', nenhuma das duas.', semantic: 'explanation' }),
      vi: R({ text: 'De acuerdo', semantic: 'explanation' }, { text: ' là một phản ứng cố định với ý kiến người khác, được nói trọn vẹn, hai từ cùng lúc. Verdad xác nhận sự thật, igual thể hiện sự thờ ơ — ', semantic: 'explanation' }, { text: 'de acuerdo thể hiện chính xác sự đồng ý với một ý kiến', semantic: 'targetCorrect' }, { text: ', không phải hai thứ kia.', semantic: 'explanation' }),
      id: R({ text: 'De acuerdo', semantic: 'explanation' }, { text: ' adalah reaksi tetap terhadap pendapat orang lain, diucapkan secara utuh, dua kata sekaligus. Verdad mengonfirmasi kebenaran fakta, igual mengungkapkan ketidakpedulian — ', semantic: 'explanation' }, { text: 'de acuerdo mengungkapkan tepatnya persetujuan dengan pendapat', semantic: 'targetCorrect' }, { text: ', bukan keduanya itu.', semantic: 'explanation' }),
      tr: R({ text: 'De acuerdo', semantic: 'explanation' }, { text: ', başkasının fikrine karşı bütün olarak, iki kelime birden söylenen sabit bir tepkidir. Verdad bir gerçeğin doğruluğunu onaylar, igual kayıtsızlığı ifade eder — ', semantic: 'explanation' }, { text: 'de acuerdo tam olarak bir fikre katılımı ifade eder', semantic: 'targetCorrect' }, { text: ', ikisi de değil.', semantic: 'explanation' }),
      pl: R({ text: 'De acuerdo', semantic: 'explanation' }, { text: ' to utrwalona reakcja na czyjąś opinię, wypowiadana w całości, od razu dwoma słowami. Verdad potwierdza prawdziwość faktu, igual wyraża obojętność — ', semantic: 'explanation' }, { text: 'de acuerdo wyraża dokładnie zgodę z opinią', semantic: 'targetCorrect' }, { text: ', żadne z tamtych dwóch.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что выражает de acuerdo?',
        uk: 'Що виражає de acuerdo?',
        es: 'What does de acuerdo express?',
        'pt-BR': 'O que de acuerdo expressa?',
        vi: 'De acuerdo thể hiện điều gì?',
        id: 'Apa yang diungkapkan de acuerdo?',
        tr: 'De acuerdo neyi ifade eder?',
        pl: 'Co wyraża de acuerdo?',
      }),
      choices: [
        L({ ru: 'Согласие с мнением', uk: 'Згоду з думкою', es: 'Agreement with an opinion', 'pt-BR': 'Concordância com uma opinião', vi: 'Sự đồng ý với một ý kiến', id: 'Persetujuan dengan pendapat', tr: 'Bir fikre katılım', pl: 'Zgodę z opinią' }),
        L({ ru: 'Подтверждение факта', uk: 'Підтвердження факту', es: 'Confirmation of a fact', 'pt-BR': 'Confirmação de um fato', vi: 'Xác nhận một sự thật', id: 'Konfirmasi fakta', tr: 'Bir gerçeğin onaylanması', pl: 'Potwierdzenie faktu' }),
        L({ ru: 'Безразличие', uk: 'Байдужість', es: 'Indifference', 'pt-BR': 'Indiferença', vi: 'Sự thờ ơ', id: 'Ketidakpedulian', tr: 'Kayıtsızlık', pl: 'Obojętność' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'De acuerdo выражает именно согласие с мнением — не подтверждение факта (это verdad) и не безразличие (это igual).',
        uk: 'De acuerdo виражає саме згоду з думкою — не підтвердження факту (це verdad) і не байдужість (це igual).',
        es: 'De acuerdo expresses exactly agreement with an opinion — not confirmation of a fact (that is verdad) and not indifference (that is igual).',
        'pt-BR': 'De acuerdo expressa exatamente concordância com uma opinião — não confirmação de um fato (isso é verdad) nem indiferença (isso é igual).',
        vi: 'De acuerdo thể hiện chính xác sự đồng ý với một ý kiến — không phải xác nhận sự thật (đó là verdad) và không phải thờ ơ (đó là igual).',
        id: 'De acuerdo mengungkapkan tepatnya persetujuan dengan pendapat — bukan konfirmasi fakta (itu verdad) dan bukan ketidakpedulian (itu igual).',
        tr: 'De acuerdo tam olarak bir fikre katılımı ifade eder — bir gerçeğin onaylanması değil (bu verdad\'dır) ve kayıtsızlık değil (bu igual\'dir).',
        pl: 'De acuerdo wyraża dokładnie zgodę z opinią — nie potwierdzenie faktu (to verdad) i nie obojętność (to igual).',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'De acuerdo не согласуется ни с чем',
      uk: 'De acuerdo не узгоджується ні з чим',
      es: 'De acuerdo agrees with nothing',
      'pt-BR': 'De acuerdo não concorda com nada',
      vi: 'De acuerdo không hòa hợp với gì',
      id: 'De acuerdo tidak sesuai dengan apa pun',
      tr: 'De acuerdo hiçbir şeyle uyum sağlamaz',
      pl: 'De acuerdo nie zgadza się z niczym',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'De acuerdo используют как самостоятельную реплику или как часть вопроса с eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'explanation' }, { text: ' ', semantic: 'explanation' }, { text: 'Нет, форма всегда одна', semantic: 'targetCorrect' }, { text: ' — de acuerdo не меняется по роду или числу, потому что это застывшая формула, а не прилагательное.', semantic: 'explanation' }),
      uk: R({ text: 'De acuerdo використовують як самостійну репліку або як частину питання з eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'explanation' }, { text: ' ', semantic: 'explanation' }, { text: 'Ні, форма завжди одна', semantic: 'targetCorrect' }, { text: ' — de acuerdo не змінюється за родом чи числом, бо це застигла формула, а не прикметник.', semantic: 'explanation' }),
      es: R({ text: 'De acuerdo is used as a standalone reply or as part of a question with eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'explanation' }, { text: ' ', semantic: 'explanation' }, { text: 'No, the form is always the same', semantic: 'targetCorrect' }, { text: ' — de acuerdo does not change by gender or number, because it is a fixed formula, not an adjective.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'De acuerdo é usado como resposta independente ou como parte de uma pergunta com eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'explanation' }, { text: ' ', semantic: 'explanation' }, { text: 'Não, a forma é sempre a mesma', semantic: 'targetCorrect' }, { text: ' — de acuerdo não muda por gênero ou número, porque é uma fórmula fixa, não um adjetivo.', semantic: 'explanation' }),
      vi: R({ text: 'De acuerdo được dùng như một câu trả lời độc lập hoặc là một phần của câu hỏi với eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'explanation' }, { text: ' ', semantic: 'explanation' }, { text: 'Không, dạng luôn giữ nguyên', semantic: 'targetCorrect' }, { text: ' — de acuerdo không đổi theo giống hay số, vì đó là công thức cố định, không phải tính từ.', semantic: 'explanation' }),
      id: R({ text: 'De acuerdo digunakan sebagai balasan mandiri atau sebagai bagian dari pertanyaan dengan eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'explanation' }, { text: ' ', semantic: 'explanation' }, { text: 'Tidak, bentuknya selalu sama', semantic: 'targetCorrect' }, { text: ' — de acuerdo tidak berubah menurut gender atau jumlah, karena itu rumus tetap, bukan kata sifat.', semantic: 'explanation' }),
      tr: R({ text: 'De acuerdo bağımsız bir yanıt olarak ya da eres ile bir sorunun parçası olarak kullanılır: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'explanation' }, { text: ' ', semantic: 'explanation' }, { text: 'Hayır, biçim her zaman aynıdır', semantic: 'targetCorrect' }, { text: ' — de acuerdo cinsiyete ya da sayıya göre değişmez, çünkü bu sabit bir formüldür, bir sıfat değildir.', semantic: 'explanation' }),
      pl: R({ text: 'De acuerdo używa się jako samodzielnej odpowiedzi lub jako części pytania z eres: ', semantic: 'explanation' }, { text: '¿Eres de acuerdo?', semantic: 'explanation' }, { text: ' ', semantic: 'explanation' }, { text: 'Nie, forma jest zawsze taka sama', semantic: 'targetCorrect' }, { text: ' — de acuerdo nie zmienia się przez rodzaj ani liczbę, ponieważ jest to utrwalona formuła, nie przymiotnik.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Меняется ли de acuerdo по роду собеседника?',
        uk: 'Чи змінюється de acuerdo за родом співрозмовника?',
        es: 'Does de acuerdo change by the listener\'s gender?',
        'pt-BR': 'De acuerdo muda pelo gênero do interlocutor?',
        vi: 'De acuerdo có đổi theo giống của người nghe không?',
        id: 'Apakah de acuerdo berubah menurut gender pendengar?',
        tr: 'De acuerdo dinleyicinin cinsiyetine göre değişir mi?',
        pl: 'Czy de acuerdo zmienia się przez rodzaj słuchacza?',
      }),
      choices: [
        L({ ru: 'Нет, форма всегда одна', uk: 'Ні, форма завжди одна', es: 'No, the form is always the same', 'pt-BR': 'Não, a forma é sempre a mesma', vi: 'Không, dạng luôn giữ nguyên', id: 'Tidak, bentuknya selalu sama', tr: 'Hayır, biçim her zaman aynıdır', pl: 'Nie, forma jest zawsze taka sama' }),
        L({ ru: 'Да, как bonito/bonita', uk: 'Так, як bonito/bonita', es: 'Yes, like bonito/bonita', 'pt-BR': 'Sim, como bonito/bonita', vi: 'Có, giống bonito/bonita', id: 'Ya, seperti bonito/bonita', tr: 'Evet, bonito/bonita gibi', pl: 'Tak, jak bonito/bonita' }),
        L({ ru: 'Только в вопросе', uk: 'Тільки в питанні', es: 'Only in a question', 'pt-BR': 'Só numa pergunta', vi: 'Chỉ trong câu hỏi', id: 'Hanya dalam pertanyaan', tr: 'Yalnızca soruda', pl: 'Tylko w pytaniu' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Нет, форма всегда одна — de acuerdo не согласуется ни с чем, потому что это застывшая формула, а не прилагательное вроде bonito/bonita.',
        uk: 'Ні, форма завжди одна — de acuerdo не узгоджується ні з чим, бо це застигла формула, а не прикметник на кшталт bonito/bonita.',
        es: 'No, the form is always the same — de acuerdo agrees with nothing, because it is a fixed formula, not an adjective like bonito/bonita.',
        'pt-BR': 'Não, a forma é sempre a mesma — de acuerdo não concorda com nada, porque é uma fórmula fixa, não um adjetivo como bonito/bonita.',
        vi: 'Không, dạng luôn giữ nguyên — de acuerdo không hòa hợp với gì cả, vì đó là công thức cố định, không phải tính từ như bonito/bonita.',
        id: 'Tidak, bentuknya selalu sama — de acuerdo tidak sesuai dengan apa pun, karena itu rumus tetap, bukan kata sifat seperti bonito/bonita.',
        tr: 'Hayır, biçim her zaman aynıdır — de acuerdo hiçbir şeyle uyum sağlamaz, çünkü bu bonito/bonita gibi bir sıfat değil, sabit bir formüldür.',
        pl: 'Nie, forma jest zawsze taka sama — de acuerdo nie zgadza się z niczym, ponieważ jest to utrwalona formuła, a nie przymiotnik jak bonito/bonita.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'De acuerdo ≠ es verdad ≠ es igual',
      uk: 'De acuerdo ≠ es verdad ≠ es igual — три різні репліки',
      es: 'De acuerdo ≠ es verdad ≠ es igual — three different replies',
      'pt-BR': 'De acuerdo ≠ es verdad ≠ es igual — três respostas diferentes',
      vi: 'De acuerdo ≠ es verdad ≠ es igual — ba câu trả lời khác nhau',
      id: 'De acuerdo ≠ es verdad ≠ es igual — tiga balasan berbeda',
      tr: 'De acuerdo ≠ es verdad ≠ es igual — üç farklı yanıt',
      pl: 'De acuerdo ≠ es verdad ≠ es igual — trzy różne odpowiedzi',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Легко перепутать de acuerdo с ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ' — обе звучат как реакция на чужие слова, но verdad про правду факта, de acuerdo про согласие с мнением. Вторая ловушка — ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ': igual означает безразличие, не согласие. Третья ошибка — написать оба слова слитно: правильно всегда через пробел, de acuerdo.', semantic: 'explanation' }),
      uk: R({ text: 'Легко сплутати de acuerdo з ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ' — обидві звучать як реакція на чужі слова, але verdad про правду факту, de acuerdo про згоду з думкою. Друга пастка — ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ': igual означає байдужість, не згоду. Третя помилка — написати обидва слова разом: правильно завжди через пробіл, de acuerdo.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to confuse de acuerdo with ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ' — verdad is about the truth of a fact, de acuerdo about agreement with an opinion. The second trap is ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ': igual means indifference. The third mistake is deacuerdo together: it is always written with a space.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil confundir de acuerdo com ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ' — verdad é sobre a verdade de um fato, de acuerdo sobre concordância com uma opinião. A segunda armadilha é ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ': igual significa indiferença. O terceiro erro é deacuerdo junto: sempre se escreve com espaço.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ nhầm de acuerdo với ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ' — verdad nói về sự thật, de acuerdo nói về sự đồng ý với ý kiến. Cái bẫy thứ hai là ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ': igual nghĩa là thờ ơ. Lỗi thứ ba là deacuerdo liền nhau: luôn viết cách nhau.', semantic: 'explanation' }),
      id: R({ text: 'Mudah mengacaukan de acuerdo dengan ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ' — verdad tentang kebenaran fakta, de acuerdo tentang persetujuan dengan pendapat. Jebakan kedua adalah ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' alih-alih ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ': igual berarti ketidakpedulian. Kesalahan ketiga adalah deacuerdo bersambung: selalu ditulis dengan spasi.', semantic: 'explanation' }),
      tr: R({ text: 'De acuerdo\'yu ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ' ile karıştırmak kolaydır — verdad bir gerçeğin doğruluğuyla, de acuerdo bir fikre katılımla ilgilidir. İkinci tuzak, ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: '\'dir: igual kayıtsızlık demektir. Üçüncü hata, deacuerdo\'yu bitişik yazmaktır: her zaman boşlukla yazılır.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomylić de acuerdo z ', semantic: 'explanation' }, { text: 'es verdad', semantic: 'targetWrong' }, { text: ' — obie brzmią jak reakcja na czyjeś słowa, ale verdad dotyczy prawdziwości faktu, de acuerdo zgody z opinią. Druga pułapka to ', semantic: 'explanation' }, { text: 'es igual', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'de acuerdo', semantic: 'targetCorrect' }, { text: ': igual znaczy obojętność, nie zgodę. Trzeci błąd to deacuerdo razem: zawsze pisze się z odstępem.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно написать «согласен»?',
        uk: 'Як правильно написати «згоден»?',
        es: 'How do you correctly write "agreed"?',
        'pt-BR': 'Como se escreve corretamente "concordo"?',
        vi: 'Viết đúng "đồng ý" như thế nào?',
        id: 'Bagaimana cara mengeja "setuju" dengan benar?',
        tr: '"Katılıyorum" doğru nasıl yazılır?',
        pl: 'Jak poprawnie napisać „zgadzam się”?',
      }),
      choices: [
        L({ ru: 'de acuerdo', uk: 'de acuerdo', es: 'de acuerdo', 'pt-BR': 'de acuerdo', vi: 'de acuerdo', id: 'de acuerdo', tr: 'de acuerdo', pl: 'de acuerdo' }),
        L({ ru: 'deacuerdo', uk: 'deacuerdo', es: 'deacuerdo', 'pt-BR': 'deacuerdo', vi: 'deacuerdo', id: 'deacuerdo', tr: 'deacuerdo', pl: 'deacuerdo' }),
        L({ ru: 'es igual', uk: 'es igual', es: 'es igual', 'pt-BR': 'es igual', vi: 'es igual', id: 'es igual', tr: 'es igual', pl: 'es igual' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'De acuerdo пишется двумя словами через пробел. Deacuerdo слитно неверно, а es igual означает безразличие, а не согласие.',
        uk: 'De acuerdo пишеться двома словами через пробіл. Deacuerdo разом неправильно, а es igual означає байдужість, а не згоду.',
        es: 'De acuerdo is written as two words with a space. Deacuerdo together is wrong, and es igual means indifference, not agreement.',
        'pt-BR': 'De acuerdo se escreve com espaço, duas palavras. Deacuerdo junto está errado, e es igual significa indiferença, não concordância.',
        vi: 'De acuerdo viết cách nhau, hai từ. Deacuerdo liền nhau là sai, và es igual nghĩa là thờ ơ, không phải đồng ý.',
        id: 'De acuerdo ditulis dengan spasi, dua kata. Deacuerdo bersambung salah, dan es igual berarti ketidakpedulian, bukan persetujuan.',
        tr: 'De acuerdo boşlukla, iki kelime olarak yazılır. Deacuerdo bitişik yanlıştır, ve es igual kayıtsızlık demektir, katılım değil.',
        pl: 'De acuerdo pisze się z odstępem, dwoma słowami. Deacuerdo razem jest błędne, a es igual znaczy obojętność, nie zgodę.',
      }),
    },
  },
];
