import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 17 "Это так" / third_person_singular, builtOn: [1, 9], recalls: [3],
// открывает Главу 3 "Он, она, оно: предметы и ситуации"): три страницы
// concept/formula/trap называют то, что сессия 1 уже использовала неявно —
// es это третье лицо единственного числа связки ser, форма для предмета или
// ситуации, в явном контрасте с eres (сессия 9, «ты») и soy (сессия 1, «я»).
// Тема НЕ вводит слово-местоимение «оно»: как и в правиле pronoun_drop,
// у безличного подлежащего в испанском просто нет отдельного слова — сама
// связка es его заменяет. Карточки-практика используют обычную уже известную
// грамматику (решение по прецеденту сессий 10 и 13, kind: 'phrases').
//
// зачем тела страниц переписаны короче легаси-черновика (владелец, 2026-08-27,
// MODE_NATIVE_AUTHORING_CONTRACT.ru.md §7 + LEARNING_CONTENT_STYLE_BIBLE.ru.md):
// исходные CONCEPT/FORMULA/TRAP_BODY держали 530-598 знаков и 4-5 предложений
// — выше потолка 320 знаков / 4 предложений. Смысл и разбор (soy/eres/es,
// pronoun_drop, согласование рода) сохранены, объём сокращён.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_17_TITLE = L({
  ru: 'Это так',
  uk: 'Це так',
  es: 'It is like this',
  'pt-BR': 'É assim',
  vi: 'Nó là như vậy',
  id: 'Begitulah',
  tr: 'Bu böyle',
  pl: 'Tak właśnie jest',
});

export const ES_EPISODE_01_SESSION_17_SUMMARY = L({
  ru: 'Es — третья форма связки ser: не «ты», не «я», а безличная оценка предмета или ситуации.',
  uk: 'Es — третя форма зв’язки ser: не «ти», не «я», а безособова оцінка предмета чи ситуації.',
  es: 'Es is the third form of the linking word ser: not "you", not "I", but an impersonal evaluation of a thing or situation.',
  'pt-BR': 'Es é a terceira forma da ligação ser: não "tú", não "yo", mas uma avaliação impessoal de uma coisa ou situação.',
  vi: 'Es là dạng thứ ba của từ nối ser: không phải "tú", không phải "yo", mà là đánh giá phi nhân xưng về một vật hay tình huống.',
  id: 'Es adalah bentuk ketiga dari kata penghubung ser: bukan "tú", bukan "yo", melainkan penilaian impersonal atas benda atau situasi.',
  tr: 'Es, ser bağlacının üçüncü biçimidir: ne "tú" ne "yo", bir şeyin ya da durumun kişisiz değerlendirmesi.',
  pl: 'Es to trzecia forma łącznika ser: nie „tú”, nie „yo”, lecz bezosobowa ocena rzeczy lub sytuacji.',
});

export const ES_EPISODE_01_SESSION_17_GOAL = L({
  ru: 'Понять, что es — форма третьего лица для предметов и ситуаций, и уверенно выбирать её вместо eres и soy.',
  uk: 'Зрозуміти, що es — форма третьої особи для предметів і ситуацій, і впевнено обирати її замість eres та soy.',
  es: 'Understand that es is the third-person form for things and situations, and confidently choose it over eres and soy.',
  'pt-BR': 'Entender que es é a forma de terceira pessoa para coisas e situações, e escolhê-la com confiança em vez de eres e soy.',
  vi: 'Hiểu rằng es là dạng ngôi thứ ba cho vật và tình huống, và tự tin chọn nó thay vì eres và soy.',
  id: 'Memahami bahwa es adalah bentuk orang ketiga untuk benda dan situasi, dan memilihnya dengan percaya diri daripada eres dan soy.',
  tr: 'Es’in nesneler ve durumlar için üçüncü kişi biçimi olduğunu anlamak ve eres ile soy yerine güvenle onu seçmek.',
  pl: 'Zrozumieć, że es to forma trzeciej osoby dla rzeczy i sytuacji, i pewnie wybierać ją zamiast eres i soy.',
});

const CONCEPT_BODY = L({
  ru: 'Es fácil, Es verdad — эти фразы уже встречались готовыми. Soy — «я», eres — «ты», а es — третье лицо: он, она, оно, любой предмет. Soy rápido — про себя, Eres rápido — про собеседника, Es rápido — про что-то третье. Es используется, когда речь о предмете или ситуации, а не о говорящем.',
  uk: 'Es fácil, Es verdad — ці фрази вже траплялися готовими. Soy — «я», eres — «ти», а es — третя особа: він, вона, воно, будь-який предмет чи ситуація. Soy rápido — про себе, Eres rápido — про співрозмовника, Es rápido — про щось третє. Es використовується, коли йдеться про предмет чи ситуацію, а не про мовця.',
  es: 'Es fácil, Es verdad — these phrases already appeared ready-made. Soy is "I", eres is "you", and es is the third person: he, she, it, any thing or situation. Soy rápido is about the speaker, Es rápido is about a third party. Es is used when talking about a thing or situation, not the speaker.',
  'pt-BR': 'Es fácil, Es verdad — essas frases já apareceram prontas. Soy é "eu", eres é "tú", e es é a terceira pessoa: ele, ela, isso, qualquer coisa. Soy rápido é sobre quem fala, Es rápido é sobre um terceiro. Es é usado ao falar de uma coisa ou situação, não de quem fala.',
  vi: 'Es fácil, Es verdad — những câu này đã xuất hiện sẵn. Soy là "tôi", eres là "bạn", còn es là ngôi thứ ba: anh ấy, cô ấy, nó, bất kỳ vật nào. Soy rápido nói về người nói, Es rápido nói về một bên thứ ba. Es được dùng khi nói về vật hay tình huống, không phải người nói.',
  id: 'Es fácil, Es verdad — frasa ini sudah pernah muncul siap pakai. Soy adalah "aku", eres adalah "kamu", dan es adalah orang ketiga: dia, itu, benda apa pun. Soy rápido tentang penutur, Es rápido tentang pihak ketiga. Es dipakai saat membicarakan benda atau situasi, bukan penutur.',
  tr: 'Es fácil, Es verdad — bu ifadeler daha önce hazır geçmişti. Soy "ben"dir, eres "sen"dir, es ise üçüncü kişidir: o, herhangi bir şey. Soy rápido konuşan hakkındadır, Es rápido üçüncü bir taraf hakkındadır. Es, bir şey ya da durum hakkında konuşulduğunda kullanılır.',
  pl: 'Es fácil, Es verdad — te zwroty pojawiały się już gotowe. Soy to „ja”, eres to „ty”, a es to trzecia osoba: on, ona, ono, dowolna rzecz. Soy rápido dotyczy mówiącego, Es rápido dotyczy trzeciej strony. Es używa się, gdy mowa o rzeczy lub sytuacji, a nie o mówiącym.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же, что для soy и eres: связка + признак, без слова-подлежащего впереди — Es fácil, ровно два слова. Перед es, как и перед soy и eres, никакого третьего слова нет вообще: окончание -s само указывает на безличное третье лицо. Признак согласуется с родом: Es bonito — Es bonita (женский род).',
  uk: 'Формула та сама, що й для soy та eres: зв’язка + ознака, без окремого слова-підмета попереду — Es fácil, рівно два слова. Перед es, як і перед soy та eres, жодного третього слова немає взагалі: закінчення -s саме вказує на безособову третю особу. Ознака узгоджується з родом: Es bonito — Es bonita (жіночий рід).',
  es: 'The formula is the same as for soy and eres: linking word + quality, no subject word in front — Es fácil, two words. Before es, just like before soy and eres, there is no third word at all: the ending -s points to the impersonal third person. The quality agrees with gender: Es bonito versus Es bonita.',
  'pt-BR': 'A fórmula é a mesma de soy e eres: ligação + qualidade, sem sujeito na frente — Es fácil, duas palavras. Antes de es, assim como antes de soy e eres, não há terceira palavra nenhuma: a terminação -s aponta a terceira pessoa impessoal. A qualidade concorda com o gênero: Es bonito contra Es bonita.',
  vi: 'Công thức giống với soy và eres: từ nối + đặc điểm, không có từ chủ ngữ riêng phía trước — Es fácil, đúng hai từ. Trước es, cũng như trước soy và eres, hoàn toàn không có từ thứ ba nào: đuôi -s đã tự chỉ ra ngôi thứ ba phi nhân xưng. Đặc điểm hòa hợp với giống: Es bonito so với Es bonita (giống cái).',
  id: 'Rumusnya sama seperti soy dan eres: kata penghubung + sifat, tanpa kata subjek terpisah di depan — Es fácil, tepat dua kata. Sebelum es, sama seperti sebelum soy dan eres, sama sekali tidak ada kata ketiga: akhiran -s menunjukkan orang ketiga impersonal. Sifatnya sesuai gender: Es bonito versus Es bonita (feminin).',
  tr: 'Formül soy ve eres ile aynıdır: bağlaç + nitelik, önünde ayrı bir özne kelimesi olmadan — Es fácil, tam iki kelime. Es\'ten önce, tıpkı soy ve eres\'ten önce olduğu gibi, hiç üçüncü kelime yoktur: -s son eki kişisiz üçüncü kişiyi işaret eder. Nitelik cinsiyetle uyumludur: Es bonito karşısında Es bonita (dişil).',
  pl: 'Formuła jest taka sama jak dla soy i eres: łącznik + cecha, bez osobnego słowa-podmiotu z przodu — Es fácil, dokładnie dwa słowa. Przed es, tak jak przed soy i eres, nie ma w ogóle trzeciego słowa: końcówka -s wskazuje bezosobową trzecią osobę. Cecha zgadza się z rodzajem: Es bonito kontra Es bonita (żeński).',
});

const TRAP_BODY = L({
  ru: 'Главная ловушка — спутать es с eres: оба слова короткие и похожи. Es rápido — про предмет, Eres rápido — про собеседника. Если фраза оценивает вещь или ситуацию — только es; если обращаешься к собеседнику — eres. Вторая ловушка: про вещь женского рода нужно Es bonita, а не Es bonito.',
  uk: 'Головна пастка — сплутати es з eres: обидва слова короткі й схожі. Es rápido — про предмет, Eres rápido — про співрозмовника. Якщо фраза оцінює річ чи ситуацію — тільки es; якщо звертаєшся до співрозмовника — eres. Друга пастка: про річ жіночого роду потрібно Es bonita, а не Es bonito.',
  es: 'The main trap is confusing es with eres: both words are short and sound alike. Es rápido is about a thing, Eres rápido is about the listener. If the phrase evaluates a thing or situation — only es; if you address the listener — eres. The second trap: about a feminine thing you need Es bonita, not Es bonito.',
  'pt-BR': 'A armadilha principal é confundir es com eres: as duas palavras são curtas e soam parecidas. Es rápido é sobre uma coisa, Eres rápido é sobre o interlocutor. Se a frase avalia uma coisa ou situação — só es; se fala com o interlocutor — eres. A segunda armadilha: sobre algo feminino precisa de Es bonita, não Es bonito.',
  vi: 'Cái bẫy chính là nhầm es với eres: cả hai từ đều ngắn và nghe giống nhau. Es rápido nói về một vật, Eres rápido nói về người nghe. Nếu câu đánh giá một vật hay tình huống — chỉ dùng es; nếu nói với người nghe — dùng eres. Cái bẫy thứ hai: về một vật giống cái cần Es bonita, không phải Es bonito.',
  id: 'Jebakan utama adalah mengacaukan es dengan eres: kedua kata pendek dan terdengar mirip. Es rápido tentang benda, Eres rápido tentang pendengar. Jika frasa menilai benda atau situasi — hanya es; jika berbicara dengan pendengar — eres. Jebakan kedua: tentang benda feminin perlu Es bonita, bukan Es bonito.',
  tr: 'Asıl tuzak es’i eres ile karıştırmaktır: her iki kelime de kısa ve benzer sesler. Es rápido bir şey hakkındadır, Eres rápido dinleyici hakkındadır. İfade bir şeyi ya da durumu değerlendiriyorsa — yalnızca es; dinleyiciye hitap ediyorsanız — eres. İkinci tuzak: dişil bir şey için Es bonita gerekir, Es bonito değil.',
  pl: 'Główna pułapka to mylenie es z eres: oba słowa są krótkie i brzmią podobnie. Es rápido dotyczy rzeczy, Eres rápido dotyczy słuchacza. Jeśli fraza ocenia rzecz lub sytuację — tylko es; jeśli zwracasz się do słuchacza — eres. Druga pułapka: o rzeczy rodzaju żeńskiego potrzeba Es bonita, nie Es bonito.',
});

export const ES_EPISODE_01_SESSION_17_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Третья форма: не ты, не я — оно',
      uk: 'Третя форма: не ти, не я — воно',
      es: 'The third form: not you, not I — it',
      'pt-BR': 'A terceira forma: não tú, não yo — isso',
      vi: 'Dạng thứ ba: không phải bạn, không phải tôi — nó',
      id: 'Bentuk ketiga: bukan kamu, bukan aku — itu',
      tr: 'Üçüncü biçim: ne sen ne ben — o',
      pl: 'Trzecia forma: nie ty, nie ja — to',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Es fácil, Es verdad — эти фразы уже встречались готовыми. У ser есть форма для каждого: soy — «я», eres — «ты», а ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — третье лицо: он, она, оно, любой предмет. Soy rápido — про себя, Eres rápido — про собеседника, Es rápido — про что-то третье. Es используется, когда речь о предмете или ситуации, а не о говорящем.', semantic: 'explanation' }),
      uk: R({ text: 'Es fácil, Es verdad — ці фрази вже траплялися готовими. У ser є форма для кожного: soy — «я», eres — «ти», а ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — третя особа: він, вона, воно, будь-який предмет чи ситуація. Soy rápido — про себе, Eres rápido — про співрозмовника, Es rápido — про щось третє. Es використовується, коли йдеться про предмет чи ситуацію, а не про мовця.', semantic: 'explanation' }),
      es: R({ text: 'Es fácil, Es verdad — these phrases already appeared ready-made. Ser has a form for whoever is being talked about: soy is "I", eres is "you", and ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' is the third person: he, she, it, any thing or situation. Soy rápido is about the speaker, Es rápido is about a third party. Es is used when talking about a thing or situation, not the speaker.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Es fácil, Es verdad — essas frases já apareceram prontas. Ser tem uma forma para cada um: soy é "eu", eres é "tú", e ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' é a terceira pessoa: ele, ela, isso, qualquer coisa ou situação. Soy rápido é sobre quem fala, Es rápido é sobre um terceiro. Es é usado ao falar de uma coisa ou situação, não de quem fala.', semantic: 'explanation' }),
      vi: R({ text: 'Es fácil, Es verdad — những câu này đã xuất hiện sẵn. Ser có một dạng cho từng người: soy là "tôi", eres là "bạn", còn ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' là ngôi thứ ba: anh ấy, cô ấy, nó, bất kỳ vật hay tình huống nào. Soy rápido nói về người nói, Es rápido nói về một bên thứ ba. Es được dùng khi nói về vật hay tình huống, không phải người nói.', semantic: 'explanation' }),
      id: R({ text: 'Es fácil, Es verdad — frasa ini sudah pernah muncul siap pakai. Ser punya bentuk untuk tiap orang: soy adalah "aku", eres adalah "kamu", dan ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' adalah orang ketiga: dia, itu, benda atau situasi apa pun. Soy rápido tentang penutur, Es rápido tentang pihak ketiga. Es dipakai saat membicarakan benda atau situasi, bukan penutur.', semantic: 'explanation' }),
      tr: R({ text: 'Es fácil, Es verdad — bu ifadeler daha önce hazır geçmişti. Ser\'in her biri için bir biçimi vardır: soy "ben"dir, eres "sen"dir, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' ise üçüncü kişidir: o, herhangi bir şey ya da durum. Soy rápido konuşan hakkındadır, Es rápido üçüncü bir taraf hakkındadır. Es, bir şey ya da durum hakkında konuşulduğunda kullanılır.', semantic: 'explanation' }),
      pl: R({ text: 'Es fácil, Es verdad — te zwroty pojawiały się już gotowe. Ser ma formę dla każdego: soy to „ja”, eres to „ty”, a ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' to trzecia osoba: on, ona, ono, dowolna rzecz lub sytuacja. Soy rápido dotyczy mówiącego, Es rápido dotyczy trzeciej strony. Es używa się, gdy mowa o rzeczy lub sytuacji, a nie o mówiącym.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какую связку выбрать для оценки предмета или ситуации?',
        uk: 'Яку зв’язку обрати для оцінки предмета чи ситуації?',
        es: 'Which linking word do you choose to evaluate a thing or situation?',
        'pt-BR': 'Qual ligação escolher para avaliar uma coisa ou situação?',
        vi: 'Nên chọn từ nối nào để đánh giá một vật hay tình huống?',
        id: 'Kata penghubung mana yang dipilih untuk menilai benda atau situasi?',
        tr: 'Bir şeyi ya da durumu değerlendirmek için hangi bağlaç seçilir?',
        pl: 'Jaki łącznik wybrać do oceny rzeczy lub sytuacji?',
      }),
      choices: [
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'eres', uk: 'eres', es: 'eres', 'pt-BR': 'eres', vi: 'eres', id: 'eres', tr: 'eres', pl: 'eres' }),
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es — верно, потому что это третье лицо: предмет или ситуация, не говорящий и не собеседник. Eres — про собеседника, soy — про себя.',
        uk: 'Es — правильно, бо це третя особа: предмет чи ситуація, не мовець і не співрозмовник. Eres — про співрозмовника, soy — про себе.',
        es: 'Es is correct, because it is the third person: a thing or situation, neither the speaker nor the listener. Eres is about the listener, soy is about the speaker.',
        'pt-BR': 'Es é correto, porque é a terceira pessoa: uma coisa ou situação, nem quem fala nem quem ouve. Eres é sobre o interlocutor, soy é sobre quem fala.',
        vi: 'Es đúng, vì đó là ngôi thứ ba: một vật hay tình huống, không phải người nói cũng không phải người nghe. Eres là về người nghe, soy là về người nói.',
        id: 'Es benar, karena itu orang ketiga: benda atau situasi, bukan penutur maupun pendengar. Eres tentang pendengar, soy tentang penutur.',
        tr: 'Es doğrudur, çünkü bu üçüncü kişidir: ne konuşan ne dinleyici olan bir şey ya da durum. Eres dinleyici hakkındadır, soy konuşan hakkındadır.',
        pl: 'Es jest poprawne, ponieważ to trzecia osoba: rzecz lub sytuacja, nie mówiący ani słuchacz. Eres dotyczy słuchacza, soy dotyczy mówiącego.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Перед es тоже нет отдельного слова',
      uk: 'Перед es теж немає окремого слова',
      es: 'There is no separate word before es either',
      'pt-BR': 'Antes de es também não há palavra separada',
      vi: 'Trước es cũng không có từ riêng',
      id: 'Sebelum es juga tidak ada kata terpisah',
      tr: 'Es’ten önce de ayrı bir kelime yoktur',
      pl: 'Przed es też nie ma osobnego słowa',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула та же, что для soy и eres: связка + признак, без слова-подлежащего впереди — ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', ровно два слова. Перед es, как и перед soy и eres, никакого третьего слова нет вообще: окончание -s само указывает на безличное третье лицо. Признак согласуется с родом: ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetCorrect' }, { text: ' — ', semantic: 'explanation' }, { text: 'Es bonita', semantic: 'targetCorrect' }, { text: ' (женский род).', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й для soy та eres: зв’язка + ознака, без слова-підмета попереду — ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', рівно два слова. Перед es, як і перед soy та eres, жодного третього слова немає взагалі: закінчення -s саме вказує на безособову третю особу. Ознака узгоджується з родом: ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetCorrect' }, { text: ' — ', semantic: 'explanation' }, { text: 'Es bonita', semantic: 'targetCorrect' }, { text: ' (жіночий рід).', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for soy and eres: linking word + quality, no subject word in front — ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', two words. Before es, just like before soy and eres, there is no third word at all: the ending -s points to the impersonal third person. The quality agrees with gender: ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetCorrect' }, { text: ' versus ', semantic: 'explanation' }, { text: 'Es bonita', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de soy e eres: ligação + qualidade, sem sujeito na frente — ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', duas palavras. Antes de es, assim como antes de soy e eres, não há terceira palavra nenhuma: a terminação -s aponta a terceira pessoa impessoal. A qualidade concorda com o gênero: ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetCorrect' }, { text: ' contra ', semantic: 'explanation' }, { text: 'Es bonita', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống với soy và eres: từ nối + đặc điểm, không có từ chủ ngữ riêng phía trước — ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', đúng hai từ. Trước es, cũng như trước soy và eres, hoàn toàn không có từ thứ ba nào: đuôi -s đã tự chỉ ra ngôi thứ ba phi nhân xưng. Đặc điểm hòa hợp với giống: ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetCorrect' }, { text: ' so với ', semantic: 'explanation' }, { text: 'Es bonita', semantic: 'targetCorrect' }, { text: ' (giống cái).', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti soy dan eres: kata penghubung + sifat, tanpa kata subjek terpisah di depan — ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', tepat dua kata. Sebelum es, sama seperti sebelum soy dan eres, sama sekali tidak ada kata ketiga: akhiran -s menunjukkan orang ketiga impersonal. Sifatnya sesuai gender: ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetCorrect' }, { text: ' versus ', semantic: 'explanation' }, { text: 'Es bonita', semantic: 'targetCorrect' }, { text: ' (feminin).', semantic: 'explanation' }),
      tr: R({ text: 'Formül soy ve eres ile aynıdır: bağlaç + nitelik, önünde ayrı bir özne kelimesi olmadan — ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', tam iki kelime. Es\'ten önce, tıpkı soy ve eres\'ten önce olduğu gibi, hiç üçüncü kelime yoktur: -s son eki kişisiz üçüncü kişiyi işaret eder. Nitelik cinsiyetle uyumludur: ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetCorrect' }, { text: ' karşısında ', semantic: 'explanation' }, { text: 'Es bonita', semantic: 'targetCorrect' }, { text: ' (dişil).', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla soy i eres: łącznik + cecha, bez osobnego słowa-podmiotu z przodu — ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', dokładnie dwa słowa. Przed es, tak jak przed soy i eres, nie ma w ogóle trzeciego słowa: końcówka -s wskazuje bezosobową trzecią osobę. Cecha zgadza się z rodzajem: ', semantic: 'explanation' }, { text: 'Es bonito', semantic: 'targetCorrect' }, { text: ' kontra ', semantic: 'explanation' }, { text: 'Es bonita', semantic: 'targetCorrect' }, { text: ' (żeński).', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что стоит перед es в оценке предмета или ситуации?',
        uk: 'Що стоїть перед es в оцінці предмета чи ситуації?',
        es: 'What comes before es when evaluating a thing or situation?',
        'pt-BR': 'O que vem antes de es ao avaliar uma coisa ou situação?',
        vi: 'Điều gì đứng trước es khi đánh giá một vật hay tình huống?',
        id: 'Apa yang ada sebelum es saat menilai benda atau situasi?',
        tr: 'Bir şey ya da durum değerlendirilirken es’ten önce ne gelir?',
        pl: 'Co stoi przed es przy ocenie rzeczy lub sytuacji?',
      }),
      choices: [
        L({ ru: 'Никакого третьего слова нет вообще', uk: 'Жодного третього слова немає взагалі', es: 'There is no third word at all', 'pt-BR': 'Não há terceira palavra nenhuma', vi: 'Hoàn toàn không có từ thứ ba nào', id: 'Sama sekali tidak ada kata ketiga', tr: 'Hiç üçüncü kelime yoktur', pl: 'Nie ma w ogóle trzeciego słowa' }),
        L({ ru: 'Связка soy', uk: 'Зв’язка soy', es: 'The linking word soy', 'pt-BR': 'A ligação soy', vi: 'Từ nối soy', id: 'Kata penghubung soy', tr: 'Soy bağlacı', pl: 'Łącznik soy' }),
        L({ ru: 'Связка eres', uk: 'Зв’язка eres', es: 'The linking word eres', 'pt-BR': 'A ligação eres', vi: 'Từ nối eres', id: 'Kata penghubung eres', tr: 'Eres bağlacı', pl: 'Łącznik eres' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Верно: перед es никакого третьего слова нет вообще, ни soy, ни eres — это связки для «я» и «ты», а не слова-подлежащие перед es.',
        uk: 'Правильно: перед es жодного третього слова немає взагалі, ні soy, ні eres — це зв’язки для «я» і «ти», а не слова-підмети перед es.',
        es: 'Correct: there is no third word before es at all, neither soy nor eres — those are linking words for "I" and "you", not subject words in front of es.',
        'pt-BR': 'Correto: não há terceira palavra nenhuma antes de es, nem soy nem eres — são ligações para "eu" e "tú", não palavras-sujeito antes de es.',
        vi: 'Đúng: hoàn toàn không có từ thứ ba nào trước es, không phải soy, cũng không phải eres — đó là từ nối cho "tôi" và "bạn", không phải từ chủ ngữ đứng trước es.',
        id: 'Benar: sama sekali tidak ada kata ketiga sebelum es, baik soy maupun eres — itu kata penghubung untuk "aku" dan "kamu", bukan kata subjek sebelum es.',
        tr: 'Doğru: es’ten önce hiç üçüncü kelime yoktur, ne soy ne de eres — bunlar "ben" ve "sen" için bağlaçlardır, es’ten önceki özne kelimeleri değil.',
        pl: 'Poprawnie: przed es nie ma w ogóle trzeciego słowa, ani soy, ani eres — to łączniki dla „ja” i „ty”, a nie słowa-podmioty przed es.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Es и eres звучат похоже, но не путай',
      uk: 'Es і eres звучать схоже, але не плутай',
      es: 'Es and eres sound alike, but do not mix them up',
      'pt-BR': 'Es e eres soam parecido, mas não confunda',
      vi: 'Es và eres nghe giống nhau, nhưng đừng nhầm lẫn',
      id: 'Es dan eres terdengar mirip, tapi jangan tertukar',
      tr: 'Es ve eres benzer duyulur, ama karıştırma',
      pl: 'Es i eres brzmią podobnie, ale nie myl ich',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Главная ловушка — спутать es с eres: оба слова короткие и похожи. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' — про предмет, ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetWrong' }, { text: ' — про собеседника. Если фраза оценивает вещь или ситуацию — только es; если обращаешься к собеседнику — eres. Вторая ловушка: про вещь женского рода нужно Es bonita, а не Es bonito.', semantic: 'explanation' }),
      uk: R({ text: 'Головна пастка — сплутати es з eres: обидва слова короткі й схожі. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' — про предмет, ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetWrong' }, { text: ' — про співрозмовника. Якщо фраза оцінює річ чи ситуацію — тільки es; якщо звертаєшся до співрозмовника — eres. Друга пастка: про річ жіночого роду потрібно Es bonita, а не Es bonito.', semantic: 'explanation' }),
      es: R({ text: 'The main trap is confusing es with eres: both words are short and sound alike. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' is about a thing, ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetWrong' }, { text: ' is about the listener. If the phrase evaluates a thing or situation — only es; if you address the listener — eres. The second trap: about a feminine thing you need Es bonita, not Es bonito.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A armadilha principal é confundir es com eres: as duas palavras são curtas e soam parecidas. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' é sobre uma coisa, ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetWrong' }, { text: ' é sobre o interlocutor. Se a frase avalia uma coisa ou situação — só es; se fala com o interlocutor — eres. A segunda armadilha: sobre algo feminino precisa de Es bonita, não Es bonito.', semantic: 'explanation' }),
      vi: R({ text: 'Cái bẫy chính là nhầm es với eres: cả hai từ đều ngắn và nghe giống nhau. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' nói về một vật, ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetWrong' }, { text: ' nói về người nghe. Nếu câu đánh giá một vật hay tình huống — chỉ dùng es; nếu nói với người nghe — dùng eres. Cái bẫy thứ hai: về một vật giống cái cần Es bonita, không phải Es bonito.', semantic: 'explanation' }),
      id: R({ text: 'Jebakan utama adalah mengacaukan es dengan eres: kedua kata pendek dan terdengar mirip. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' tentang benda, ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetWrong' }, { text: ' tentang pendengar. Jika frasa menilai benda atau situasi — hanya es; jika berbicara dengan pendengar — eres. Jebakan kedua: tentang benda feminin perlu Es bonita, bukan Es bonito.', semantic: 'explanation' }),
      tr: R({ text: 'Asıl tuzak es’i eres ile karıştırmaktır: her iki kelime de kısa ve benzer sesler. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' bir şey hakkındadır, ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetWrong' }, { text: ' dinleyici hakkındadır. İfade bir şeyi ya da durumu değerlendiriyorsa — yalnızca es; dinleyiciye hitap ediyorsanız — eres. İkinci tuzak: dişil bir şey için Es bonita gerekir, Es bonito değil.', semantic: 'explanation' }),
      pl: R({ text: 'Główna pułapka to mylenie es z eres: oba słowa są krótkie i brzmią podobnie. ', semantic: 'explanation' }, { text: 'Es rápido', semantic: 'targetCorrect' }, { text: ' dotyczy rzeczy, ', semantic: 'explanation' }, { text: 'Eres rápido', semantic: 'targetWrong' }, { text: ' dotyczy słuchacza. Jeśli fraza ocenia rzecz lub sytuację — tylko es; jeśli zwracasz się do słuchacza — eres. Druga pułapka: o rzeczy rodzaju żeńskiego potrzeba Es bonita, nie Es bonito.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Про вещь женского рода — какая фраза верна?',
        uk: 'Про річ жіночого роду — яка фраза правильна?',
        es: 'About a feminine thing — which phrase is correct?',
        'pt-BR': 'Sobre uma coisa feminina — qual frase está correta?',
        vi: 'Về một vật giống cái — câu nào đúng?',
        id: 'Tentang benda feminin — frasa mana yang benar?',
        tr: 'Dişil bir şey hakkında — hangi ifade doğrudur?',
        pl: 'O rzeczy rodzaju żeńskiego — które zdanie jest poprawne?',
      }),
      choices: [
        L({ ru: 'Es bonita', uk: 'Es bonita', es: 'Es bonita', 'pt-BR': 'Es bonita', vi: 'Es bonita', id: 'Es bonita', tr: 'Es bonita', pl: 'Es bonita' }),
        L({ ru: 'Es bonito', uk: 'Es bonito', es: 'Es bonito', 'pt-BR': 'Es bonito', vi: 'Es bonito', id: 'Es bonito', tr: 'Es bonito', pl: 'Es bonito' }),
        L({ ru: 'Eres bonita', uk: 'Eres bonita', es: 'Eres bonita', 'pt-BR': 'Eres bonita', vi: 'Eres bonita', id: 'Eres bonita', tr: 'Eres bonita', pl: 'Eres bonita' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es bonita верно: связка es для предмета или ситуации плюс признак с окончанием -a для женского рода. Es bonito путает род, Eres bonita путает связку — это уже обращение к собеседнице.',
        uk: 'Es bonita правильно: зв’язка es для предмета чи ситуації плюс ознака із закінченням -a для жіночого роду. Es bonito плутає рід, Eres bonita плутає зв’язку — це вже звернення до співрозмовниці.',
        es: 'Es bonita is correct: the linking word es for a thing or situation plus the quality ending in -a for feminine. Es bonito mixes up the gender, Eres bonita mixes up the linking word — that already addresses a listener.',
        'pt-BR': 'Es bonita está correto: a ligação es para uma coisa ou situação mais a qualidade terminada em -a para feminino. Es bonito confunde o gênero, Eres bonita confunde a ligação — isso já fala com uma interlocutora.',
        vi: 'Es bonita đúng: từ nối es cho một vật hay tình huống cộng với đặc điểm kết thúc bằng -a cho giống cái. Es bonito nhầm giống, Eres bonita nhầm từ nối — câu đó đã nói với người nghe rồi.',
        id: 'Es bonita benar: kata penghubung es untuk benda atau situasi ditambah sifat berakhiran -a untuk feminin. Es bonito salah gender, Eres bonita salah kata penghubung — itu sudah berbicara dengan pendengar.',
        tr: 'Es bonita doğrudur: bir şey ya da durum için es bağlacı, artı dişil için -a ile biten nitelik. Es bonito cinsiyeti karıştırır, Eres bonita ise bağlacı karıştırır — bu zaten bir dinleyiciye hitap eder.',
        pl: 'Es bonita jest poprawne: łącznik es dla rzeczy lub sytuacji plus cecha zakończona na -a dla rodzaju żeńskiego. Es bonito myli rodzaj, Eres bonita myli łącznik — to już zwrot do słuchaczki.',
      }),
    },
  },
];
