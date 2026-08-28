import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 18 "Дорого или дёшево" / price_adjective, builtOn: [17],
// recalls: [3, 17]): три страницы вводят barato — признак низкой цены,
// сразу противопоставленный уже знакомому caro (сессия 1, сессия 17), с
// согласованием по роду (recall 3) и связкой es для предмета/ситуации
// (recall 17). Единственное новое слово курса на этот момент — barato.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_18_WORD_FIRST_TITLE = L({
  ru: 'Дорого или дёшево',
  uk: 'Дорого чи дешево',
  es: 'Expensive or cheap',
  'pt-BR': 'Caro ou barato',
  vi: 'Đắt hay rẻ',
  id: 'Mahal atau murah',
  tr: 'Pahalı ya da ucuz',
  pl: 'Drogo czy tanio',
});

export const ES_EPISODE_01_SESSION_18_WORD_FIRST_SUMMARY = L({
  ru: 'Одно новое слово — barato, «дёшево» — сразу встречается рядом с уже знакомым caro, соединяя связку es для предметов и согласование по роду.',
  uk: 'Одне нове слово — barato, «дешево» — одразу трапляється поруч із уже знайомим caro, поєднуючи зв’язку es для предметів і узгодження за родом.',
  es: 'One new word — barato, "cheap" — appears right next to the already familiar caro, combining the linking word es for things and gender agreement.',
  'pt-BR': 'Uma palavra nova — barato, "barato" — aparece bem ao lado do já conhecido caro, combinando a ligação es para coisas e a concordância de gênero.',
  vi: 'Một từ mới — barato, "rẻ" — xuất hiện ngay cạnh caro đã quen thuộc, kết hợp từ nối es cho các vật và sự hòa hợp giống.',
  id: 'Satu kata baru — barato, "murah" — muncul tepat di samping caro yang sudah dikenal, menggabungkan kata penghubung es untuk benda dan kesesuaian gender.',
  tr: 'Bir yeni kelime — barato, "ucuz" — zaten tanıdık olan caro’nun hemen yanında görünür, nesneler için es bağlacını ve cinsiyet uyumunu birleştirir.',
  pl: 'Jedno nowe słowo — barato, „tanio” — pojawia się tuż obok już znanego caro, łącząc łącznik es dla rzeczy i zgodność rodzaju.',
});

export const ES_EPISODE_01_SESSION_18_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно построить barato и её форму barata, противопоставляя цену вещи уже знакомому caro.',
  uk: 'Упізнати на слух, зрозуміти й точно побудувати barato та її форму barata, протиставляючи ціну речі вже знайомому caro.',
  es: 'Recognize by ear, understand, and correctly build barato and its form barata, contrasting a thing\'s price with the already familiar caro.',
  'pt-BR': 'Reconhecer de ouvido, entender e construir corretamente barato e sua forma barata, contrastando o preço de uma coisa com o já conhecido caro.',
  vi: 'Nghe ra, hiểu và xây dựng đúng barato cùng dạng barata của nó, đối chiếu giá của một vật với caro đã quen thuộc.',
  id: 'Mengenali dari suara, memahami, dan membangun barato serta bentuknya barata dengan tepat, membandingkan harga suatu benda dengan caro yang sudah dikenal.',
  tr: 'Barato’yu ve onun barata biçimini duyup tanımak, anlamak ve doğru kurmak; bir şeyin fiyatını zaten tanıdık olan caro ile karşılaştırmak.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zbudować barato oraz jego formę barata, przeciwstawiając cenę rzeczy już znanemu caro.',
});

const CONCEPT_BODY = L({
  ru: 'Barato описывает низкую цену вещи — прямую противоположность уже знакомому caro. Признак согласуется по роду точно так же, как caro/cara: barato для мужского рода или по умолчанию, barata для женского. Barato почти всегда звучит со связкой es: Es barato, Es barata — оба со связкой es, а не eres или soy.',
  uk: 'Barato описує низьку ціну речі — пряму протилежність уже знайомому caro. Ознака узгоджується за родом точно так само, як caro/cara: barato для чоловічого роду або за замовчуванням, barata для жіночого. Barato майже завжди звучить зі зв’язкою es: Es barato, Es barata — обидва зі зв’язкою es, а не eres чи soy.',
  es: 'Barato describes a thing\'s low price — the direct opposite of the already familiar caro. The quality agrees by gender exactly like caro/cara: barato for masculine or default, barata for feminine. Barato almost always appears with the linking word es: Es barato, Es barata — both with es, not eres or soy.',
  'pt-BR': 'Barato descreve o preço baixo de uma coisa — o oposto direto do já conhecido caro. A qualidade concorda em gênero exatamente como caro/cara: barato para masculino ou padrão, barata para feminino. Barato quase sempre aparece com a ligação es: Es barato, Es barata — ambos com es, não eres ou soy.',
  vi: 'Barato mô tả giá thấp của một vật — đối lập trực tiếp với caro đã quen thuộc. Đặc điểm hòa hợp theo giống y hệt như caro/cara: barato cho giống đực hoặc mặc định, barata cho giống cái. Barato hầu như luôn đi cùng từ nối es: Es barato, Es barata — cả hai với es, không phải eres hay soy.',
  id: 'Barato menggambarkan harga rendah benda — kebalikan langsung dari caro yang sudah dikenal. Sifatnya sesuai gender seperti caro/cara: barato untuk maskulin atau default, barata untuk feminin. Barato hampir selalu muncul dengan kata penghubung es: Es barato, Es barata — keduanya dengan es, bukan eres atau soy.',
  tr: 'Barato, bir şeyin düşük fiyatını tanımlar — zaten tanıdık olan caro’nun doğrudan zıttıdır. Nitelik, caro/cara gibi cinsiyete göre uyum sağlar: eril ya da varsayılan için barato, dişil için barata. Barato hemen her zaman es bağlacıyla görünür: Es barato, Es barata — ikisi de es ile, eres ya da soy değil.',
  pl: 'Barato opisuje niską cenę rzeczy — bezpośrednie przeciwieństwo już znanego caro. Cecha zgadza się pod względem rodzaju dokładnie tak jak caro/cara: barato dla rodzaju męskiego lub domyślnego, barata dla żeńskiego. Barato niemal zawsze pojawia się z łącznikiem es: Es barato, Es barata — oba z es, nie eres ani soy.',
});

const FORMULA_BODY = L({
  ru: 'Формула согласования та же, что и для caro/cara: концовка -o для мужского рода или по умолчанию, -a для женского. Barato пишет -o, barata меняет ровно одну букву на -a. Связка не меняется: Es barato и Es barata используют одну и ту же форму es — меняется только концовка признака, а не связка.',
  uk: 'Формула узгодження та сама, що й для caro/cara: закінчення -o для чоловічого роду або за замовчуванням, -a для жіночого. Barato пише -o, barata змінює рівно одну літеру на -a. Зв’язка не змінюється: Es barato і Es barata використовують ту саму форму es — змінюється лише закінчення ознаки, а не зв’язка.',
  es: 'The agreement formula is the same as for caro/cara: the ending -o for masculine or default, -a for feminine. Barato writes -o, barata changes exactly one letter to -a. The linking word does not change: Es barato and Es barata use the same form es — only the ending of the quality changes, not the linking word.',
  'pt-BR': 'A fórmula de concordância é a mesma de caro/cara: a terminação -o para masculino ou padrão, -a para feminino. Barato escreve -o, barata muda exatamente uma letra para -a. A ligação não muda: Es barato e Es barata usam a mesma forma es — só a terminação da qualidade muda, não a ligação.',
  vi: 'Công thức hòa hợp giống như caro/cara: đuôi -o cho giống đực hoặc mặc định, -a cho giống cái. Barato viết -o, barata chỉ đổi đúng một chữ cái thành -a. Từ nối không đổi: Es barato và Es barata dùng cùng dạng es — chỉ đuôi của đặc điểm thay đổi, không phải từ nối.',
  id: 'Rumus kesesuaian sama seperti caro/cara: akhiran -o untuk maskulin atau default, -a untuk feminin. Barato menulis -o, barata mengubah tepat satu huruf menjadi -a. Kata penghubung tidak berubah: Es barato dan Es barata menggunakan bentuk yang sama es — hanya akhiran sifat yang berubah, bukan kata penghubung.',
  tr: 'Uyum formülü caro/cara ile aynıdır: eril ya da varsayılan için -o son eki, dişil için -a. Barato -o yazar, barata tam olarak tek bir harfi -a olarak değiştirir. Bağlaç değişmez: Es barato ve Es barata aynı es biçimini kullanır — yalnızca niteliğin sonu değişir, bağlaç değil.',
  pl: 'Formuła zgodności jest taka sama jak dla caro/cara: końcówka -o dla rodzaju męskiego lub domyślnego, -a dla żeńskiego. Barato pisze -o, barata zmienia dokładnie jedną literę na -a. Łącznik się nie zmienia: Es barato i Es barata używają tej samej formy es — zmienia się tylko końcówka cechy, nie łącznik.',
});

const TRAP_BODY = L({
  ru: 'Легко перепутать barato и caro — barato значит «дёшево», caro значит «дорого», это противоположности. Вторая ловушка — забыть про род и сказать Es barato про вещь женского рода: нужна форма Es barata, с -a. Третья ловушка — сказать eres или soy вместо es про цену предмета.',
  uk: 'Легко сплутати barato і caro — barato означає «дешево», caro означає «дорого», це протилежності. Друга пастка — забути про рід і сказати Es barato про річ жіночого роду: потрібна форма Es barata, з -a. Третя пастка — сказати eres чи soy замість es про ціну предмета.',
  es: 'It is easy to confuse barato and caro — barato means "cheap," caro means "expensive," they are opposites. The second trap is forgetting about gender and saying Es barato about a feminine thing: the form Es barata, with -a, is needed. The third trap is saying eres or soy instead of es about a thing\'s price.',
  'pt-BR': 'É fácil confundir barato e caro — barato significa "barato," caro significa "caro," são opostos. A segunda armadilha é esquecer o gênero e dizer Es barato sobre uma coisa feminina: precisa da forma Es barata, com -a. A terceira armadilha é dizer eres ou soy em vez de es sobre o preço de uma coisa.',
  vi: 'Dễ nhầm lẫn barato và caro — barato nghĩa là "rẻ," caro nghĩa là "đắt," đây là các từ trái nghĩa. Cái bẫy thứ hai là quên mất giống và nói Es barato về một vật giống cái: cần dạng Es barata, với -a. Cái bẫy thứ ba là nói eres hay soy thay vì es về giá của một vật.',
  id: 'Mudah mengacaukan barato dan caro — barato berarti "murah," caro berarti "mahal," keduanya berlawanan. Jebakan kedua adalah lupa gender dan mengatakan Es barato tentang benda feminin: perlu bentuk Es barata, dengan -a. Jebakan ketiga adalah mengatakan eres atau soy alih-alih es tentang harga benda.',
  tr: 'Barato ve caro’yu karıştırmak kolaydır — barato "ucuz," caro "pahalı" demektir, bunlar zıt anlamlıdır. İkinci tuzak, cinsiyeti unutup dişil bir şey hakkında Es barato demektir: Es barata biçimi, -a ile, gerekir. Üçüncü tuzak, bir şeyin fiyatı hakkında es yerine eres ya da soy demektir.',
  pl: 'Łatwo pomylić barato i caro — barato znaczy „tanio”, caro znaczy „drogo”, to przeciwieństwa. Druga pułapka to zapomnienie o rodzaju i powiedzenie Es barato o rzeczy rodzaju żeńskiego: potrzebna jest forma Es barata, z -a. Trzecia pułapka to powiedzenie eres lub soy zamiast es o cenie rzeczy.',
});

export const ES_EPISODE_01_SESSION_18_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Дёшево — не про человека',
      uk: 'Дешево — не про людину',
      es: 'Cheap is not about a person',
      'pt-BR': 'Barato não é sobre uma pessoa',
      vi: 'Rẻ không phải về một người',
      id: 'Murah bukan tentang orang',
      tr: 'Ucuz bir kişi hakkında değildir',
      pl: 'Tanio to nie o osobie',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Barato описывает низкую цену вещи — прямую противоположность уже знакомому caro. Признак согласуется по роду точно так же, как caro/cara: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' для мужского рода или по умолчанию, barata для женского. Barato почти всегда звучит со связкой es: Es barato, Es barata — оба со связкой es, а не eres или soy.', semantic: 'explanation' }),
      uk: R({ text: 'Barato описує низьку ціну речі — пряму протилежність уже знайомому caro. Ознака узгоджується за родом точно так само, як caro/cara: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' для чоловічого роду або за замовчуванням, barata для жіночого. Barato майже завжди звучить зі зв’язкою es: Es barato, Es barata — обидва зі зв’язкою es, а не eres чи soy.', semantic: 'explanation' }),
      es: R({ text: 'Barato describes a thing\'s low price — the direct opposite of the already familiar caro. The quality agrees by gender exactly like caro/cara: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' for masculine or default, barata for feminine. Barato almost always appears with the linking word es: Es barato, Es barata — both with es, not eres or soy.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Barato descreve o preço baixo de uma coisa — o oposto direto do já conhecido caro. A qualidade concorda em gênero exatamente como caro/cara: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' para masculino ou padrão, barata para feminino. Barato quase sempre aparece com a ligação es: Es barato, Es barata — ambos com es, não eres ou soy.', semantic: 'explanation' }),
      vi: R({ text: 'Barato mô tả giá thấp của một vật — đối lập trực tiếp với caro đã quen thuộc. Đặc điểm hòa hợp theo giống y hệt như caro/cara: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' cho giống đực hoặc mặc định, barata cho giống cái. Barato hầu như luôn đi cùng từ nối es: Es barato, Es barata — cả hai với es, không phải eres hay soy.', semantic: 'explanation' }),
      id: R({ text: 'Barato menggambarkan harga rendah suatu benda — kebalikan langsung dari caro yang sudah dikenal. Sifatnya sesuai gender persis seperti caro/cara: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' untuk maskulin atau default, barata untuk feminin. Barato hampir selalu muncul dengan kata penghubung es: Es barato, Es barata — keduanya dengan es, bukan eres atau soy.', semantic: 'explanation' }),
      tr: R({ text: 'Barato, bir şeyin düşük fiyatını tanımlar — zaten tanıdık olan caro’nun doğrudan zıttıdır. Nitelik, caro/cara gibi cinsiyete göre uyum sağlar: eril ya da varsayılan için ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ', dişil için barata. Barato hemen her zaman es bağlacıyla görünür: Es barato, Es barata — ikisi de es ile, eres ya da soy değil.', semantic: 'explanation' }),
      pl: R({ text: 'Barato opisuje niską cenę rzeczy — bezpośrednie przeciwieństwo już znanego caro. Cecha zgadza się pod względem rodzaju dokładnie tak jak caro/cara: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' dla rodzaju męskiego lub domyślnego, barata dla żeńskiego. Barato niemal zawsze pojawia się z łącznikiem es: Es barato, Es barata — oba z es, nie eres ani soy.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что описывает barato?',
        uk: 'Що описує barato?',
        es: 'What does barato describe?',
        'pt-BR': 'O que barato descreve?',
        vi: 'Barato mô tả điều gì?',
        id: 'Apa yang digambarkan barato?',
        tr: 'Barato neyi tanımlar?',
        pl: 'Co opisuje barato?',
      }),
      choices: [
        L({ ru: 'Низкую цену вещи', uk: 'Низьку ціну речі', es: "A thing's low price", 'pt-BR': 'O preço baixo de uma coisa', vi: 'Giá thấp của một vật', id: 'Harga rendah benda', tr: 'Bir şeyin düşük fiyatı', pl: 'Niską cenę rzeczy' }),
        L({ ru: 'Уверенность человека', uk: 'Впевненість людини', es: "A person's confidence", 'pt-BR': 'A confiança de uma pessoa', vi: 'Sự tự tin của một người', id: 'Kepercayaan diri seseorang', tr: 'Bir kişinin güveni', pl: 'Pewność siebie osoby' }),
        L({ ru: 'Скорость движения', uk: 'Швидкість руху', es: 'The speed of movement', 'pt-BR': 'A velocidade do movimento', vi: 'Tốc độ di chuyển', id: 'Kecepatan gerakan', tr: 'Hareket hızı', pl: 'Prędkość ruchu' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Barato описывает низкую цену вещи — это оценка предмета, а не уверенность человека и не скорость.',
        uk: 'Barato описує низьку ціну речі — це оцінка предмета, а не впевненість людини і не швидкість.',
        es: "Barato describes a thing's low price — an evaluation of a thing, not a person's confidence or speed.",
        'pt-BR': 'Barato descreve o preço baixo de uma coisa — uma avaliação de uma coisa, não a confiança de uma pessoa nem a velocidade.',
        vi: 'Barato mô tả giá thấp của một vật — đánh giá về một vật, không phải sự tự tin của một người hay tốc độ.',
        id: 'Barato menggambarkan harga rendah suatu benda — penilaian tentang benda, bukan kepercayaan diri seseorang atau kecepatan.',
        tr: 'Barato, bir şeyin düşük fiyatını tanımlar — bir şeyin değerlendirmesidir, bir kişinin güveni ya da hızı değil.',
        pl: 'Barato opisuje niską cenę rzeczy — to ocena rzeczy, nie pewność siebie osoby ani prędkość.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Barato/barata как caro/cara',
      uk: 'Barato/barata як caro/cara',
      es: 'Barato/barata like caro/cara',
      'pt-BR': 'Barato/barata como caro/cara',
      vi: 'Barato/barata như caro/cara',
      id: 'Barato/barata seperti caro/cara',
      tr: 'Barato/barata, caro/cara gibi',
      pl: 'Barato/barata jak caro/cara',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Формула согласования та же, что и для caro/cara: концовка -o для мужского рода или по умолчанию, -a для женского. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' пишет -o, barata меняет ровно одну букву на -a. Связка не меняется: Es barato и Es barata используют одну и ту же форму ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — меняется только концовка признака, а не связка.', semantic: 'explanation' }),
      uk: R({ text: 'Формула узгодження та сама, що й для caro/cara: закінчення -o для чоловічого роду або за замовчуванням, -a для жіночого. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' пише -o, barata змінює рівно одну літеру на -a. Зв’язка не змінюється: Es barato і Es barata використовують ту саму форму ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — змінюється лише закінчення ознаки, а не зв’язка.', semantic: 'explanation' }),
      es: R({ text: 'The agreement formula is the same as for caro/cara: the ending -o for masculine or default, -a for feminine. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' writes -o, barata changes exactly one letter to -a. The linking word does not change: Es barato and Es barata use the same form ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — only the ending of the quality changes, not the linking word.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de concordância é a mesma de caro/cara: a terminação -o para masculino ou padrão, -a para feminino. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' escreve -o, barata muda exatamente uma letra para -a. A ligação não muda: Es barato e Es barata usam a mesma forma ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — só a terminação da qualidade muda, não a ligação.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức hòa hợp giống như caro/cara: đuôi -o cho giống đực hoặc mặc định, -a cho giống cái. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' viết -o, barata chỉ đổi đúng một chữ cái thành -a. Từ nối không đổi: Es barato và Es barata dùng cùng dạng ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — chỉ đuôi của đặc điểm thay đổi, không phải từ nối.', semantic: 'explanation' }),
      id: R({ text: 'Rumus kesesuaian sama seperti caro/cara: akhiran -o untuk maskulin atau default, -a untuk feminin. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' menulis -o, barata mengubah tepat satu huruf menjadi -a. Kata penghubung tidak berubah: Es barato dan Es barata menggunakan bentuk yang sama ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — hanya akhiran sifat yang berubah, bukan kata penghubung.', semantic: 'explanation' }),
      tr: R({ text: 'Uyum formülü caro/cara ile aynıdır: eril ya da varsayılan için -o son eki, dişil için -a. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' -o yazar, barata tam olarak tek bir harfi -a olarak değiştirir. Bağlaç değişmez: Es barato ve Es barata aynı ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' biçimini kullanır — yalnızca niteliğin sonu değişir, bağlaç değil.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła zgodności jest taka sama jak dla caro/cara: końcówka -o dla rodzaju męskiego lub domyślnego, -a dla żeńskiego. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' pisze -o, barata zmienia dokładnie jedną literę na -a. Łącznik się nie zmienia: Es barato i Es barata używają tej samej formy ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — zmienia się tylko końcówka cechy, nie łącznik.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Что меняется между «Es barato» и «Es barata»?',
        uk: 'Що змінюється між «Es barato» та «Es barata»?',
        es: 'What changes between "Es barato" and "Es barata"?',
        'pt-BR': 'O que muda entre "Es barato" e "Es barata"?',
        vi: 'Điều gì thay đổi giữa "Es barato" và "Es barata"?',
        id: 'Apa yang berubah antara "Es barato" dan "Es barata"?',
        tr: '"Es barato" ile "Es barata" arasında ne değişir?',
        pl: 'Co się zmienia między „Es barato” a „Es barata”?',
      }),
      choices: [
        L({ ru: 'Только концовка признака', uk: 'Лише закінчення ознаки', es: 'Only the ending of the quality', 'pt-BR': 'Só a terminação da qualidade', vi: 'Chỉ đuôi của đặc điểm', id: 'Hanya akhiran sifat', tr: 'Yalnızca niteliğin sonu', pl: 'Tylko końcówka cechy' }),
        L({ ru: 'Связка es', uk: 'Зв’язка es', es: 'The linking word es', 'pt-BR': 'A ligação es', vi: 'Từ nối es', id: 'Kata penghubung es', tr: 'Es bağlacı', pl: 'Łącznik es' }),
        L({ ru: 'Порядок слов', uk: 'Порядок слів', es: 'The word order', 'pt-BR': 'A ordem das palavras', vi: 'Trật tự từ', id: 'Urutan kata', tr: 'Kelime sırası', pl: 'Kolejność słów' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Меняется только концовка признака (-o или -a) — связка es остаётся той же, потому что в обоих случаях оценивают предмет или ситуацию.',
        uk: 'Змінюється лише закінчення ознаки (-o чи -a) — зв’язка es лишається тією самою, бо в обох випадках оцінюють предмет чи ситуацію.',
        es: 'Only the ending of the quality changes (-o or -a) — the linking word es stays the same, because in both cases a thing or situation is being evaluated.',
        'pt-BR': 'Só a terminação da qualidade muda (-o ou -a) — a ligação es fica a mesma, porque nos dois casos se avalia uma coisa ou situação.',
        vi: 'Chỉ đuôi của đặc điểm thay đổi (-o hay -a) — từ nối es vẫn giữ nguyên, vì cả hai trường hợp đều đánh giá một vật hay tình huống.',
        id: 'Hanya akhiran sifat yang berubah (-o atau -a) — kata penghubung es tetap sama, karena dalam kedua kasus menilai benda atau situasi.',
        tr: 'Yalnızca niteliğin sonu değişir (-o ya da -a) — es bağlacı aynı kalır, çünkü her iki durumda da bir şey ya da durum değerlendirilir.',
        pl: 'Zmienia się tylko końcówka cechy (-o lub -a) — łącznik es pozostaje ten sam, ponieważ w obu przypadkach ocenia się rzecz lub sytuację.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Barato или caro, -o или -a',
      uk: 'Barato чи caro, -o чи -a',
      es: 'Barato or caro, -o or -a',
      'pt-BR': 'Barato ou caro, -o ou -a',
      vi: 'Barato hay caro, -o hay -a',
      id: 'Barato atau caro, -o atau -a',
      tr: 'Barato ya da caro, -o ya da -a',
      pl: 'Barato czy caro, -o czy -a',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Легко перепутать barato и caro — они оба про цену, но с разным знаком: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' значит «дёшево», caro значит «дорого», это противоположности. Вторая ловушка — забыть про род и сказать ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' про вещь женского рода: нужна форма Es barata, с -a. Третья ловушка — использовать eres или soy вместо es для оценки цены предмета.', semantic: 'explanation' }),
      uk: R({ text: 'Легко сплутати barato і caro — вони обидва про ціну, але з різним знаком: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' означає «дешево», caro означає «дорого», це протилежності. Друга пастка — забути про рід і сказати ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' про річ жіночого роду: потрібна форма Es barata, з -a. Третя пастка — використати eres чи soy замість es для оцінки ціни предмета.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to confuse barato and caro — both are about price, but with opposite signs: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' means "cheap," caro means "expensive," they are opposites. The second trap is forgetting about gender and saying ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' about a feminine thing: the form Es barata, with -a, is needed. The third trap is using eres or soy instead of es to evaluate a thing\'s price.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil confundir barato e caro — ambos são sobre preço, mas com sinais opostos: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' significa "barato," caro significa "caro," são opostos. A segunda armadilha é esquecer o gênero e dizer ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' sobre uma coisa feminina: precisa da forma Es barata, com -a. A terceira armadilha é usar eres ou soy em vez de es para avaliar o preço de uma coisa.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ nhầm lẫn barato và caro — cả hai đều nói về giá cả, nhưng với dấu hiệu trái ngược: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' nghĩa là "rẻ," caro nghĩa là "đắt," đây là các từ trái nghĩa. Cái bẫy thứ hai là quên mất giống và nói ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' về một vật giống cái: cần dạng Es barata, với -a. Cái bẫy thứ ba là dùng eres hay soy thay vì es để đánh giá giá của một vật.', semantic: 'explanation' }),
      id: R({ text: 'Mudah mengacaukan barato dan caro — keduanya tentang harga, tapi dengan tanda berlawanan: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' berarti "murah," caro berarti "mahal," keduanya berlawanan. Jebakan kedua adalah lupa gender dan mengatakan ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' tentang benda feminin: perlu bentuk Es barata, dengan -a. Jebakan ketiga adalah menggunakan eres atau soy alih-alih es untuk menilai harga benda.', semantic: 'explanation' }),
      tr: R({ text: 'Barato ve caro’yu karıştırmak kolaydır — ikisi de fiyat hakkındadır, ama zıt işaretlerle: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' "ucuz," caro "pahalı" demektir, bunlar zıt anlamlıdır. İkinci tuzak, cinsiyeti unutup dişil bir şey hakkında ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' demektir: Es barata biçimi, -a ile, gerekir. Üçüncü tuzak, bir şeyin fiyatını değerlendirirken es yerine eres ya da soy kullanmaktır.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomylić barato i caro — oba dotyczą ceny, ale z przeciwnym znakiem: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' znaczy „tanio”, caro znaczy „drogo”, to przeciwieństwa. Druga pułapka to zapomnienie o rodzaju i powiedzenie ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' o rzeczy rodzaju żeńskiego: potrzebna jest forma Es barata, z -a. Trzecia pułapka to użycie eres lub soy zamiast es do oceny ceny rzeczy.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как правильно сказать, что вещь женского рода дешёвая?',
        uk: 'Як правильно сказати, що річ жіночого роду дешева?',
        es: 'How do you correctly say a feminine thing is cheap?',
        'pt-BR': 'Como dizer corretamente que uma coisa feminina é barata?',
        vi: 'Nói đúng cách rằng một vật giống cái rẻ như thế nào?',
        id: 'Bagaimana mengatakan dengan benar bahwa benda feminin itu murah?',
        tr: 'Dişil bir şeyin ucuz olduğu doğru şekilde nasıl söylenir?',
        pl: 'Jak poprawnie powiedzieć, że rzecz rodzaju żeńskiego jest tania?',
      }),
      choices: [
        L({ ru: 'Es barata', uk: 'Es barata', es: 'Es barata', 'pt-BR': 'Es barata', vi: 'Es barata', id: 'Es barata', tr: 'Es barata', pl: 'Es barata' }),
        L({ ru: 'Es barato', uk: 'Es barato', es: 'Es barato', 'pt-BR': 'Es barato', vi: 'Es barato', id: 'Es barato', tr: 'Es barato', pl: 'Es barato' }),
        L({ ru: 'Es caro', uk: 'Es caro', es: 'Es caro', 'pt-BR': 'Es caro', vi: 'Es caro', id: 'Es caro', tr: 'Es caro', pl: 'Es caro' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es barata верно: связка es не меняется, а barata с -a — форма женского рода признака «дёшево».',
        uk: 'Es barata правильно: зв’язка es не змінюється, а barata з -a — форма жіночого роду ознаки «дешево».',
        es: 'Es barata is correct: the linking word es does not change, and barata with -a is the feminine form of the quality "cheap."',
        'pt-BR': 'Es barata está correto: a ligação es não muda, e barata com -a é a forma feminina da qualidade "barato."',
        vi: 'Es barata đúng: từ nối es không đổi, và barata với -a là dạng giống cái của đặc điểm "rẻ."',
        id: 'Es barata benar: kata penghubung es tidak berubah, dan barata dengan -a adalah bentuk feminin dari sifat "murah."',
        tr: 'Es barata doğrudur: es bağlacı değişmez, ve -a ile barata "ucuz" niteliğinin dişil biçimidir.',
        pl: 'Es barata jest poprawne: łącznik es się nie zmienia, a barata z -a to żeńska forma cechy „tanio”.',
      }),
    },
  },
];
