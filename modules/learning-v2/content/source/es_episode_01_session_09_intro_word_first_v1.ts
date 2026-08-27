import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл переписан (владелец, 2026-08-27, MODE_NATIVE_AUTHORING_CONTRACT.ru.md
// §7 + LEARNING_CONTENT_STYLE_BIBLE.ru.md правило 2): исходный черновик от
// 2026-08-24 держал тела intro на ~700-900 знаков на локаль — далеко за
// потолком intro_body_overloaded (320 знаков / 2-4 предложения,
// learning_content_quality_gate_v1.ts). Смысл concept/formula/trap сохранён
// (та же структура: eres как связка второго лица, формула согласования
// признака -o/-a, ловушка Es/Soy bonito вместо Eres bonito), текст сжат.
// Карта сессии: es_episode_01_session_map_v1.ts, sessionOrdinal 9,
// "Ты есть" / second_person_singular, builtOn: [1], recalls: [3].
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_09_WORD_FIRST_TITLE = L({
  ru: 'Ты есть',
  uk: 'Ти є',
  es: 'You are',
  'pt-BR': 'Você é',
  vi: 'Bạn là',
  id: 'Kamu adalah',
  tr: 'Sen busun',
  pl: 'Ty jesteś',
});

export const ES_EPISODE_01_SESSION_09_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое слово переносит уже знакомую связку с себя на собеседника — с той же формулой согласования признака.',
  uk: 'Одне нове слово переносить уже знайому зв’язку з себе на співрозмовника — з тією самою формулою узгодження ознаки.',
  es: 'One new word carries the already familiar linking verb from the speaker to the listener, with the same quality-agreement formula.',
  'pt-BR': 'Uma palavra nova transfere a ligação já conhecida de quem fala para o interlocutor, com a mesma fórmula de concordância.',
  vi: 'Một từ mới chuyển từ nối đã quen thuộc từ người nói sang người nghe, với cùng công thức hòa hợp đặc điểm.',
  id: 'Satu kata baru memindahkan kata penghubung yang sudah dikenal dari penutur ke pendengar, dengan rumus kesesuaian sifat yang sama.',
  tr: 'Tek bir yeni kelime, zaten tanıdık olan bağlacı konuşandan dinleyiciye taşır, aynı nitelik uyum formülüyle.',
  pl: 'Jedno nowe słowo przenosi już znany łącznik z mówiącego na słuchacza, z tą samą formułą zgodności cechy.',
});

export const ES_EPISODE_01_SESSION_09_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно построить eres как связку при обращении к собеседнику, отличая её от soy и es.',
  uk: 'Упізнати на слух, зрозуміти й точно побудувати eres як зв’язку при зверненні до співрозмовника, відрізняючи її від soy та es.',
  es: 'Recognize, understand, and correctly build eres as the linking word used when addressing the listener, telling it apart from soy and es.',
  'pt-BR': 'Reconhecer de ouvido, entender e construir corretamente eres como a ligação usada ao falar com o interlocutor, distinguindo-a de soy e es.',
  vi: 'Nghe ra, hiểu và xây dựng đúng eres như từ nối dùng khi nói với người nghe, phân biệt nó với soy và es.',
  id: 'Mengenali dari suara, memahami, dan membangun eres dengan tepat sebagai kata penghubung saat berbicara dengan pendengar, membedakannya dari soy dan es.',
  tr: 'Eres’i dinleyiciyle konuşurken kullanılan bağlaç olarak duyup tanımak, anlamak ve doğru kurmak; soy ve es’ten ayırt etmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zbudować eres jako łącznik używany przy zwracaniu się do słuchacza, odróżniając go od soy i es.',
});

const CONCEPT_BODY = L({
  ru: 'Soy — про себя, es — про предмет или третье лицо. Eres делает то же самое, но про собеседника. Три формы, три разных адресата одного действия связывания.',
  uk: 'Soy — про себе, es — про предмет чи третю особу. Eres робить те саме, але про співрозмовника. Три форми, три різні адресати однієї дії зв’язування.',
  es: 'Soy is about the speaker, es is about a thing or a third person. Eres does the same, but about the listener. Three forms, three addressees of one linking action.',
  'pt-BR': 'Soy é sobre quem fala, es é sobre uma coisa ou terceira pessoa. Eres faz o mesmo, mas sobre o interlocutor. Três formas, três destinatários da mesma ação de ligar.',
  vi: 'Soy nói về người nói, es nói về vật hay ngôi thứ ba. Eres làm điều tương tự, nhưng về người nghe. Ba dạng, ba đối tượng của cùng một hành động nối.',
  id: 'Soy tentang penutur, es tentang benda atau orang ketiga. Eres melakukan hal sama, tetapi tentang pendengar. Tiga bentuk, tiga sasaran dari satu tindakan menghubungkan.',
  tr: 'Soy konuşan hakkındadır, es bir şey ya da üçüncü kişi hakkındadır. Eres de aynısını yapar, ama dinleyici hakkında. Üç biçim, aynı bağlama eyleminin üç farklı muhatabı.',
  pl: 'Soy dotyczy mówiącego, es dotyczy rzeczy lub trzeciej osoby. Eres robi to samo, ale wobec słuchacza. Trzy formy, trzej adresaci tej samej czynności łączenia.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же: -o для мужского рода, -a для женского. Eres bonito обращается к мужчине, eres bonita — к женщине. Между двумя фразами меняется только концовка признака, сама eres — никогда.',
  uk: 'Формула та сама: -o для чоловічого роду, -a для жіночого. Eres bonito звертається до чоловіка, eres bonita — до жінки. Між двома фразами змінюється тільки закінчення ознаки, сама eres — ніколи.',
  es: 'The formula is the same: -o for masculine, -a for feminine. Eres bonito addresses a man, eres bonita a woman. Only the ending of the quality changes between the two phrases, eres itself never does.',
  'pt-BR': 'A fórmula é a mesma: -o para masculino, -a para feminino. Eres bonito fala com um homem, eres bonita com uma mulher. Só a terminação da qualidade muda entre as duas frases, eres nunca muda.',
  vi: 'Công thức giống nhau: -o cho giống đực, -a cho giống cái. Eres bonito nói với đàn ông, eres bonita nói với phụ nữ. Chỉ đuôi của đặc điểm thay đổi giữa hai câu, bản thân eres thì không.',
  id: 'Rumusnya sama: -o untuk maskulin, -a untuk feminin. Eres bonito untuk pria, eres bonita untuk wanita. Hanya akhiran sifatnya yang berubah di antara kedua frasa, eres sendiri tidak pernah.',
  tr: 'Formül aynıdır: eril için -o, dişil için -a. Eres bonito bir erkeğe, eres bonita bir kadına seslenir. Sadece niteliğin sonu iki ifade arasında değişir, eres asla değişmez.',
  pl: 'Formuła jest taka sama: -o dla rodzaju męskiego, -a dla żeńskiego. Eres bonito zwraca się do mężczyzny, eres bonita do kobiety. Tylko końcówka cechy zmienia się między frazami, samo eres nigdy.',
});

const TRAP_BODY = L({
  ru: 'Частая ошибка — Es bonito или Soy bonito вместо Eres bonito, глядя собеседнику в глаза: es и soy сюда не подходят вовсе. Правило простое: обращение напрямую требует eres.',
  uk: 'Часта помилка — Es bonito чи Soy bonito замість Eres bonito, дивлячись співрозмовнику в очі: es і soy сюди зовсім не підходять. Правило просте: пряме звернення потребує eres.',
  es: 'A common mistake is Es bonito or Soy bonito instead of Eres bonito, looking the listener in the eyes: neither es nor soy fits here. The rule is simple: a direct address needs eres.',
  'pt-BR': 'Um erro comum é Es bonito ou Soy bonito em vez de Eres bonito, olhando o interlocutor nos olhos: nem es nem soy cabem aqui. A regra é simples: falar diretamente precisa de eres.',
  vi: 'Lỗi thường gặp là nói Es bonito hay Soy bonito thay vì Eres bonito, nhìn thẳng vào mắt người nghe: cả es lẫn soy đều không phù hợp. Quy tắc đơn giản: nói trực tiếp cần eres.',
  id: 'Kesalahan umum adalah Es bonito atau Soy bonito, bukan Eres bonito, sambil menatap mata pendengar: baik es maupun soy tidak cocok di sini. Aturannya sederhana: sapaan langsung perlu eres.',
  tr: 'Yaygın hata, dinleyicinin gözlerine bakarken Eres bonito yerine Es bonito ya da Soy bonito demektir: ne es ne de soy buraya uyar. Kural basittir: doğrudan hitap eres gerektirir.',
  pl: 'Częsty błąd to Es bonito lub Soy bonito zamiast Eres bonito, patrząc słuchaczowi w oczy: ani es, ani soy tu nie pasują. Zasada jest prosta: bezpośredni zwrot wymaga eres.',
});

export const ES_EPISODE_01_SESSION_09_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Связка для собеседника',
      uk: 'Зв’язка для співрозмовника',
      es: 'The linking word for the listener',
      'pt-BR': 'A ligação para o interlocutor',
      vi: 'Từ nối cho người nghe',
      id: 'Kata penghubung untuk pendengar',
      tr: 'Dinleyici için bağlaç',
      pl: 'Łącznik dla słuchacza',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' — про себе, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — про предмет або третю особу. ', semantic: 'explanation' }, { text: 'Eres', semantic: 'targetCorrect' }, { text: ' робить те саме, але про співрозмовника. Три форми, три різні адресати однієї дії зв’язування.', semantic: 'explanation' }),
      uk: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' — про себе, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — про предмет чи третю особу. ', semantic: 'explanation' }, { text: 'Eres', semantic: 'targetCorrect' }, { text: ' робить те саме, але про співрозмовника. Три форми, три різні адресати однієї дії зв’язування.', semantic: 'explanation' }),
      es: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' is about the speaker, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' is about a thing or a third person. ', semantic: 'explanation' }, { text: 'Eres', semantic: 'targetCorrect' }, { text: ' does the same, but about the listener. Three forms, three addressees of one linking action.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' é sobre quem fala, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' é sobre uma coisa ou terceira pessoa. ', semantic: 'explanation' }, { text: 'Eres', semantic: 'targetCorrect' }, { text: ' faz o mesmo, mas sobre o interlocutor. Três formas, três destinatários da mesma ação de ligar.', semantic: 'explanation' }),
      vi: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' nói về người nói, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' nói về vật hay ngôi thứ ba. ', semantic: 'explanation' }, { text: 'Eres', semantic: 'targetCorrect' }, { text: ' làm điều tương tự, nhưng về người nghe. Ba dạng, ba đối tượng của cùng một hành động nối.', semantic: 'explanation' }),
      id: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' tentang penutur, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' tentang benda atau orang ketiga. ', semantic: 'explanation' }, { text: 'Eres', semantic: 'targetCorrect' }, { text: ' melakukan hal sama, tetapi tentang pendengar. Tiga bentuk, tiga sasaran dari satu tindakan menghubungkan.', semantic: 'explanation' }),
      tr: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' konuşan hakkındadır, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' bir şey ya da üçüncü kişi hakkındadır. ', semantic: 'explanation' }, { text: 'Eres', semantic: 'targetCorrect' }, { text: ' de aynısını yapar, ama dinleyici hakkında. Üç biçim, aynı bağlama eyleminin üç farklı muhatabı.', semantic: 'explanation' }),
      pl: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' dotyczy mówiącego, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' dotyczy rzeczy lub trzeciej osoby. ', semantic: 'explanation' }, { text: 'Eres', semantic: 'targetCorrect' }, { text: ' robi to samo, ale wobec słuchacza. Trzy formy, trzej adresaci tej samej czynności łączenia.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какая связка нужна, чтобы напрямую обратиться к собеседнику?',
        uk: 'Яка зв’язка потрібна, щоб напряму звернутися до співрозмовника?',
        es: 'Which linking word is needed to address the listener directly?',
        'pt-BR': 'Qual ligação é necessária para falar diretamente com o interlocutor?',
        vi: 'Từ nối nào cần để nói trực tiếp với người nghe?',
        id: 'Kata penghubung mana yang diperlukan untuk berbicara langsung dengan pendengar?',
        tr: 'Dinleyiciyle doğrudan konuşmak için hangi bağlaç gerekir?',
        pl: 'Jaki łącznik jest potrzebny, aby zwrócić się bezpośrednio do słuchacza?',
      }),
      choices: [
        L({ ru: 'eres', uk: 'eres', es: 'eres', 'pt-BR': 'eres', vi: 'eres', id: 'eres', tr: 'eres', pl: 'eres' }),
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Eres нужна, потому что она закреплена именно за собеседником. Soy и es — про другого адресата.',
        uk: 'Eres потрібна, бо вона закріплена саме за співрозмовником. Soy і es — про іншого адресата.',
        es: 'Eres is needed because it is tied exactly to the listener. Soy and es are about a different addressee.',
        'pt-BR': 'Eres é necessária porque está presa exatamente ao interlocutor. Soy e es são sobre outro destinatário.',
        vi: 'Eres cần thiết vì nó gắn chính xác với người nghe. Soy và es nói về đối tượng khác.',
        id: 'Eres diperlukan karena terikat tepat pada pendengar. Soy dan es tentang sasaran lain.',
        tr: 'Eres gereklidir çünkü tam olarak dinleyiciye bağlıdır. Soy ve es başka bir muhatap hakkındadır.',
        pl: 'Eres jest potrzebne, ponieważ jest przypisane dokładnie do słuchacza. Soy i es dotyczą innego adresata.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Eres не меняется, меняется признак',
      uk: 'Eres не змінюється, змінюється ознака',
      es: 'Eres does not change, the quality does',
      'pt-BR': 'Eres não muda, a qualidade muda',
      vi: 'Eres không đổi, đặc điểm mới đổi',
      id: 'Eres tidak berubah, sifatnya yang berubah',
      tr: 'Eres değişmez, değişen niteliktir',
      pl: 'Eres się nie zmienia, zmienia się cecha',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула та же: -o для мужского рода, -a для женского. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' обращается к мужчине, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' — к женщине. Между двумя фразами меняется только концовка признака, сама eres — никогда.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама: -o для чоловічого роду, -a для жіночого. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' звертається до чоловіка, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' — до жінки. Між двома фразами змінюється тільки закінчення ознаки, сама eres — ніколи.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same: -o for masculine, -a for feminine. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' addresses a man, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' a woman. Only the ending of the quality changes between the two phrases', semantic: 'targetCorrect' }, { text: ', eres itself never does.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma: -o para masculino, -a para feminino. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' fala com um homem, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' com uma mulher. Só a terminação da qualidade muda entre as duas frases, eres nunca muda.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống nhau: -o cho giống đực, -a cho giống cái. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' nói với đàn ông, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' nói với phụ nữ. Chỉ đuôi của đặc điểm thay đổi giữa hai câu, bản thân eres thì không.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama: -o untuk maskulin, -a untuk feminin. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' untuk pria, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' untuk wanita. Hanya akhiran sifatnya yang berubah di antara kedua frasa, eres sendiri tidak pernah.', semantic: 'explanation' }),
      tr: R({ text: 'Formül aynıdır: eril için -o, dişil için -a. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' bir erkeğe, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' bir kadına seslenir. Sadece niteliğin sonu iki ifade arasında değişir, eres asla değişmez.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama: -o dla rodzaju męskiego, -a dla żeńskiego. ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' zwraca się do mężczyzny, ', semantic: 'explanation' }, { text: 'eres bonita', semantic: 'targetCorrect' }, { text: ' do kobiety. Tylko końcówka cechy zmienia się między frazami, samo eres nigdy.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что меняется между «Eres bonito» и «Eres bonita»?',
        uk: 'Що змінюється між «Eres bonito» та «Eres bonita»?',
        es: 'What changes between "Eres bonito" and "Eres bonita"?',
        'pt-BR': 'O que muda entre "Eres bonito" e "Eres bonita"?',
        vi: 'Điều gì thay đổi giữa "Eres bonito" và "Eres bonita"?',
        id: 'Apa yang berubah antara "Eres bonito" dan "Eres bonita"?',
        tr: '"Eres bonito" ile "Eres bonita" arasında ne değişir?',
        pl: 'Co się zmienia między „Eres bonito” a „Eres bonita”?',
      }),
      choices: [
        L({ ru: 'Только концовка признака', uk: 'Тільки закінчення ознаки', es: 'Only the ending of the quality', 'pt-BR': 'Só a terminação da qualidade', vi: 'Chỉ đuôi của đặc điểm', id: 'Hanya akhiran sifatnya', tr: 'Sadece niteliğin sonu', pl: 'Tylko końcówka cechy' }),
        L({ ru: 'Сама связка eres', uk: 'Сама зв’язка eres', es: 'The linking word eres itself', 'pt-BR': 'A própria ligação eres', vi: 'Bản thân từ nối eres', id: 'Kata penghubung eres itu sendiri', tr: 'Bağlacın kendisi olan eres', pl: 'Sam łącznik eres' }),
        L({ ru: 'Порядок слов во фразе', uk: 'Порядок слів у фразі', es: 'The word order in the phrase', 'pt-BR': 'A ordem das palavras na frase', vi: 'Trật tự từ trong câu', id: 'Urutan kata dalam frasa', tr: 'İfadedeki kelime sırası', pl: 'Kolejność słów we frazie' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Меняется только концовка признака — eres остаётся неизменной в обеих фразах.',
        uk: 'Змінюється лише закінчення ознаки — eres лишається незмінною в обох фразах.',
        es: 'Only the ending of the quality changes — eres stays unchanged in both phrases.',
        'pt-BR': 'Só a terminação da qualidade muda — eres permanece inalterada nas duas frases.',
        vi: 'Chỉ đuôi của đặc điểm thay đổi — eres không đổi trong cả hai câu.',
        id: 'Hanya akhiran sifatnya yang berubah — eres tetap tidak berubah di kedua frasa.',
        tr: 'Yalnızca niteliğin sonu değişir — eres her iki ifadede de değişmeden kalır.',
        pl: 'Zmienia się tylko końcówka cechy — eres pozostaje niezmienione w obu frazach.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не es и не soy — только eres',
      uk: 'Не es і не soy — тільки eres',
      es: 'Not es, not soy — only eres',
      'pt-BR': 'Nem es, nem soy — só eres',
      vi: 'Không phải es, không phải soy — chỉ eres',
      id: 'Bukan es, bukan soy — hanya eres',
      tr: 'Ne es ne de soy — sadece eres',
      pl: 'Nie es, nie soy — tylko eres',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Частая ошибка — ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' или ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' вместо ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', глядя собеседнику в глаза: es и soy сюда не подходят вовсе. Правило простое: обращение напрямую требует eres.', semantic: 'explanation' }),
      uk: R({ text: 'Часта помилка — ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' чи ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' замість ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', дивлячись співрозмовнику в очі: es і soy сюди зовсім не підходять. Правило просте: пряме звернення потребує eres.', semantic: 'explanation' }),
      es: R({ text: 'A common mistake is ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' or ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' instead of ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', looking the listener in the eyes: neither es nor soy fits here. The rule is simple: a direct address needs eres.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Um erro comum é ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' ou ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' em vez de ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', olhando o interlocutor nos olhos: nem es nem soy cabem aqui. A regra é simples: falar diretamente precisa de eres.', semantic: 'explanation' }),
      vi: R({ text: 'Lỗi thường gặp là nói ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' hay ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' thay vì ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', nhìn thẳng vào mắt người nghe: cả es lẫn soy đều không phù hợp. Quy tắc đơn giản: nói trực tiếp cần eres.', semantic: 'explanation' }),
      id: R({ text: 'Kesalahan umum adalah ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' atau ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ', bukan ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', sambil menatap mata pendengar: baik es maupun soy tidak cocok di sini. Aturannya sederhana: sapaan langsung perlu eres.', semantic: 'explanation' }),
      tr: R({ text: 'Yaygın hata, dinleyicinin gözlerine bakarken ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ' yerine ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' ya da ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' demektir: ne es ne de soy buraya uyar. Kural basittir: doğrudan hitap eres gerektirir.', semantic: 'explanation' }),
      pl: R({ text: 'Częsty błąd to ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetWrong' }, { text: ' lub ', semantic: 'explanation' }, { text: 'Soy bonito', semantic: 'targetWrong' }, { text: ' zamiast ', semantic: 'explanation' }, { text: 'Eres bonito', semantic: 'targetCorrect' }, { text: ', patrząc słuchaczowi w oczy: ani es, ani soy tu nie pasują. Zasada jest prosta: bezpośredni zwrot wymaga eres.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно сказать собеседнику «Ты красивый», глядя ему в глаза?',
        uk: 'Як правильно сказати співрозмовнику «Ти красивий», дивлячись йому в очі?',
        es: 'How do you correctly tell the listener "You are pretty", looking them in the eyes?',
        'pt-BR': 'Como se diz corretamente ao interlocutor "Você é bonito", olhando nos olhos dele?',
        vi: 'Nói đúng với người nghe "Bạn đẹp trai", nhìn thẳng vào mắt họ, như thế nào?',
        id: 'Bagaimana cara mengatakan dengan benar kepada pendengar "Kamu tampan", sambil menatap matanya?',
        tr: 'Dinleyiciye gözlerinin içine bakarak "Sen yakışıklısın" doğru nasıl söylenir?',
        pl: 'Jak poprawnie powiedzieć słuchaczowi „Jesteś przystojny”, patrząc mu w oczy?',
      }),
      choices: [
        L({ ru: 'Eres bonito', uk: 'Eres bonito', es: 'Eres bonito', 'pt-BR': 'Eres bonito', vi: 'Eres bonito', id: 'Eres bonito', tr: 'Eres bonito', pl: 'Eres bonito' }),
        L({ ru: 'Es bonito', uk: 'Es bonito', es: 'Es bonito', 'pt-BR': 'Es bonito', vi: 'Es bonito', id: 'Es bonito', tr: 'Es bonito', pl: 'Es bonito' }),
        L({ ru: 'Soy bonito', uk: 'Soy bonito', es: 'Soy bonito', 'pt-BR': 'Soy bonito', vi: 'Soy bonito', id: 'Soy bonito', tr: 'Soy bonito', pl: 'Soy bonito' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Eres bonito верно, потому что eres закреплена именно за собеседником.',
        uk: 'Eres bonito правильно, бо eres закріплена саме за співрозмовником.',
        es: 'Eres bonito is correct because eres is tied exactly to the listener.',
        'pt-BR': 'Eres bonito está correto porque eres está presa exatamente ao interlocutor.',
        vi: 'Eres bonito đúng vì eres gắn chính xác với người nghe.',
        id: 'Eres bonito benar karena eres terikat tepat pada pendengar.',
        tr: 'Eres bonito doğrudur çünkü eres tam olarak dinleyiciye bağlıdır.',
        pl: 'Eres bonito jest poprawne, ponieważ eres jest przypisane dokładnie do słuchacza.',
      }),
    },
  },
];
