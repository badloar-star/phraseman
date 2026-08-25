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
  ru: 'Barato описывает низкую цену вещи или услуги — прямую противоположность уже знакомому caro. Признак согласуется по роду точно так же, как caro/cara или bonito/bonita: barato для мужского рода или по умолчанию, barata для женского. Цена — это не факт о человеке, а оценка предмета, поэтому barato почти всегда звучит в разговоре о конкретной вещи со связкой es: Es barato, Es barata. Ответ прост: barato описывает низкую цену конкретной вещи, а caro — высокую, оба со связкой es, а не eres или soy.',
  uk: 'Barato описує низьку ціну речі чи послуги — пряму протилежність уже знайомому caro. Ознака узгоджується за родом точно так само, як caro/cara чи bonito/bonita: barato для чоловічого роду або за замовчуванням, barata для жіночого. Ціна — це не факт про людину, а оцінка предмета, тому barato майже завжди звучить у розмові про конкретну річ зі зв’язкою es: Es barato, Es barata. Відповідь проста: barato описує низьку ціну конкретної речі, а caro — високу, обидва зі зв’язкою es, а не eres чи soy.',
  es: 'Barato describes a thing or service\'s low price — the direct opposite of the already familiar caro. The quality agrees by gender exactly like caro/cara or bonito/bonita: barato for masculine or default, barata for feminine. Price is not a fact about a person, it is an evaluation of a thing, so barato almost always appears in a conversation about a specific thing with the linking word es: Es barato, Es barata. The answer is simple: barato describes a specific thing\'s low price, and caro describes a high one, both with the linking word es, not eres or soy.',
  'pt-BR': 'Barato descreve o preço baixo de uma coisa ou serviço — o oposto direto do já conhecido caro. A qualidade concorda em gênero exatamente como caro/cara ou bonito/bonita: barato para masculino ou padrão, barata para feminino. Preço não é um fato sobre uma pessoa, é uma avaliação de uma coisa, então barato quase sempre aparece numa conversa sobre uma coisa específica com a ligação es: Es barato, Es barata. A resposta é simples: barato descreve o preço baixo de uma coisa específica, e caro descreve um preço alto, ambos com a ligação es, não eres ou soy.',
  vi: 'Barato mô tả giá thấp của một vật hay dịch vụ — đối lập trực tiếp với caro đã quen thuộc. Đặc điểm hòa hợp theo giống y hệt như caro/cara hay bonito/bonita: barato cho giống đực hoặc mặc định, barata cho giống cái. Giá cả không phải là một sự thật về một người, mà là đánh giá về một vật, nên barato hầu như luôn xuất hiện trong cuộc trò chuyện về một vật cụ thể với từ nối es: Es barato, Es barata. Câu trả lời rất đơn giản: barato mô tả giá thấp của một vật cụ thể, còn caro mô tả giá cao, cả hai đều với từ nối es, không phải eres hay soy.',
  id: 'Barato menggambarkan harga rendah suatu benda atau layanan — kebalikan langsung dari caro yang sudah dikenal. Sifatnya sesuai gender persis seperti caro/cara atau bonito/bonita: barato untuk maskulin atau default, barata untuk feminin. Harga bukan fakta tentang seseorang, melainkan penilaian tentang suatu benda, jadi barato hampir selalu muncul dalam percakapan tentang benda tertentu dengan kata penghubung es: Es barato, Es barata. Jawabannya sederhana: barato menggambarkan harga rendah benda tertentu, dan caro menggambarkan harga tinggi, keduanya dengan kata penghubung es, bukan eres atau soy.',
  tr: 'Barato, bir şeyin ya da hizmetin düşük fiyatını tanımlar — zaten tanıdık olan caro’nun doğrudan zıttıdır. Nitelik, caro/cara ya da bonito/bonita gibi cinsiyete göre uyum sağlar: eril ya da varsayılan için barato, dişil için barata. Fiyat bir kişi hakkında bir gerçek değil, bir şey hakkında bir değerlendirmedir, bu yüzden barato hemen her zaman belirli bir şey hakkında es bağlacıyla bir sohbette görünür: Es barato, Es barata. Cevap basittir: barato belirli bir şeyin düşük fiyatını, caro ise yüksek fiyatını tanımlar, ikisi de eres ya da soy değil, es bağlacıyla.',
  pl: 'Barato opisuje niską cenę rzeczy lub usługi — bezpośrednie przeciwieństwo już znanego caro. Cecha zgadza się pod względem rodzaju dokładnie tak jak caro/cara czy bonito/bonita: barato dla rodzaju męskiego lub domyślnego, barata dla żeńskiego. Cena to nie fakt o osobie, lecz ocena rzeczy, dlatego barato niemal zawsze pojawia się w rozmowie o konkretnej rzeczy z łącznikiem es: Es barato, Es barata. Odpowiedź jest prosta: barato opisuje niską cenę konkretnej rzeczy, a caro — wysoką, oba z łącznikiem es, nie eres ani soy.',
});

const FORMULA_BODY = L({
  ru: 'Формула согласования та же, что и для caro/cara и других прилагательных: концовка -o для мужского рода или по умолчанию, концовка -a для женского. Barato пишет -o, barata меняет ровно одну букву на -a — ровно тот же принцип, что и caro/cara. Связка не меняется: Es barato и Es barata используют одну и ту же форму es, потому что в обоих случаях оценивают предмет или ситуацию — меняется только концовка признака, а не связка. Ответ прост: мужской род или по умолчанию — всегда -o, женский — всегда -a, а связка перед признаком цены — всегда es.',
  uk: 'Формула узгодження та сама, що й для caro/cara та інших прикметників: закінчення -o для чоловічого роду або за замовчуванням, закінчення -a для жіночого. Barato пише -o, barata змінює рівно одну літеру на -a — той самий принцип, що й caro/cara. Зв’язка не змінюється: Es barato і Es barata використовують ту саму форму es, бо в обох випадках оцінюють предмет чи ситуацію — змінюється лише закінчення ознаки, а не зв’язка. Відповідь проста: чоловічий рід або за замовчуванням — завжди -o, жіночий — завжди -a, а зв’язка перед ознакою ціни — завжди es.',
  es: 'The agreement formula is the same as for caro/cara and other adjectives: the ending -o for masculine or default, the ending -a for feminine. Barato writes -o, barata changes exactly one letter to -a — the same principle as caro/cara. The linking word does not change: Es barato and Es barata use the same form es, because in both cases a thing or situation is being evaluated — only the ending of the quality changes, not the linking word. The answer is simple: masculine or default is always -o, feminine is always -a, and the linking word before a price quality is always es.',
  'pt-BR': 'A fórmula de concordância é a mesma de caro/cara e outros adjetivos: a terminação -o para masculino ou padrão, a terminação -a para feminino. Barato escreve -o, barata muda exatamente uma letra para -a — o mesmo princípio de caro/cara. A ligação não muda: Es barato e Es barata usam a mesma forma es, porque nos dois casos se avalia uma coisa ou situação — só a terminação da qualidade muda, não a ligação. A resposta é simples: masculino ou padrão é sempre -o, feminino é sempre -a, e a ligação antes de uma qualidade de preço é sempre es.',
  vi: 'Công thức hòa hợp giống như caro/cara và các tính từ khác: đuôi -o cho giống đực hoặc mặc định, đuôi -a cho giống cái. Barato viết -o, barata chỉ đổi đúng một chữ cái thành -a — cùng nguyên tắc với caro/cara. Từ nối không đổi: Es barato và Es barata dùng cùng dạng es, vì cả hai trường hợp đều đánh giá một vật hay tình huống — chỉ đuôi của đặc điểm thay đổi, không phải từ nối. Câu trả lời rất đơn giản: giống đực hoặc mặc định luôn là -o, giống cái luôn là -a, và từ nối trước đặc điểm về giá luôn là es.',
  id: 'Rumus kesesuaian sama seperti caro/cara dan kata sifat lain: akhiran -o untuk maskulin atau default, akhiran -a untuk feminin. Barato menulis -o, barata mengubah tepat satu huruf menjadi -a — prinsip yang sama dengan caro/cara. Kata penghubung tidak berubah: Es barato dan Es barata menggunakan bentuk yang sama es, karena dalam kedua kasus menilai benda atau situasi — hanya akhiran sifat yang berubah, bukan kata penghubung. Jawabannya sederhana: maskulin atau default selalu -o, feminin selalu -a, dan kata penghubung sebelum sifat harga selalu es.',
  tr: 'Uyum formülü caro/cara ve diğer sıfatlarla aynıdır: eril ya da varsayılan için -o son eki, dişil için -a son eki. Barato -o yazar, barata tam olarak tek bir harfi -a olarak değiştirir — caro/cara ile aynı ilke. Bağlaç değişmez: Es barato ve Es barata aynı es biçimini kullanır, çünkü her iki durumda da bir şey ya da durum değerlendirilir — yalnızca niteliğin sonu değişir, bağlaç değil. Cevap basittir: eril ya da varsayılan her zaman -o, dişil her zaman -a, ve bir fiyat niteliğinden önceki bağlaç her zaman es’tir.',
  pl: 'Formuła zgodności jest taka sama jak dla caro/cara i innych przymiotników: końcówka -o dla rodzaju męskiego lub domyślnego, końcówka -a dla żeńskiego. Barato pisze -o, barata zmienia dokładnie jedną literę na -a — ta sama zasada co caro/cara. Łącznik się nie zmienia: Es barato i Es barata używają tej samej formy es, ponieważ w obu przypadkach ocenia się rzecz lub sytuację — zmienia się tylko końcówka cechy, nie łącznik. Odpowiedź jest prosta: rodzaj męski lub domyślny to zawsze -o, żeński to zawsze -a, a łącznik przed cechą ceny to zawsze es.',
});

const TRAP_BODY = L({
  ru: 'Легко перепутать barato и caro — они оба про цену, но с разным знаком: barato значит «дёшево», caro значит «дорого», это противоположности, а не синонимы. Вторая ловушка — забыть про род и сказать Es barato про вещь женского рода: нужна форма Es barata, с -a. Третья ловушка — использовать eres или soy вместо es: цену предмета оценивают связкой es, а не связкой для «я» или «ты». Проверка простая: низкая цена — barato/barata; высокая — caro/cara; связка перед признаком цены предмета — всегда es.',
  uk: 'Легко сплутати barato і caro — вони обидва про ціну, але з різним знаком: barato означає «дешево», caro означає «дорого», це протилежності, а не синоніми. Друга пастка — забути про рід і сказати Es barato про річ жіночого роду: потрібна форма Es barata, з -a. Третя пастка — використати eres чи soy замість es: ціну предмета оцінюють зв’язкою es, а не зв’язкою для «я» чи «ти». Перевірка проста: низька ціна — barato/barata; висока — caro/cara; зв’язка перед ознакою ціни предмета — завжди es.',
  es: 'It is easy to confuse barato and caro — both are about price, but with opposite signs: barato means "cheap," caro means "expensive," they are opposites, not synonyms. The second trap is forgetting about gender and saying Es barato about a feminine thing: the form Es barata, with -a, is needed. The third trap is using eres or soy instead of es: a thing\'s price is evaluated with the linking word es, not the linking word for "I" or "you." The check is simple: low price — barato/barata; high price — caro/cara; the linking word before a thing\'s price quality — always es.',
  'pt-BR': 'É fácil confundir barato e caro — ambos são sobre preço, mas com sinais opostos: barato significa "barato," caro significa "caro," são opostos, não sinônimos. A segunda armadilha é esquecer o gênero e dizer Es barato sobre uma coisa feminina: precisa da forma Es barata, com -a. A terceira armadilha é usar eres ou soy em vez de es: o preço de uma coisa é avaliado com a ligação es, não a ligação para "eu" ou "você". A checagem é simples: preço baixo — barato/barata; preço alto — caro/cara; a ligação antes da qualidade de preço de uma coisa — sempre es.',
  vi: 'Dễ nhầm lẫn barato và caro — cả hai đều nói về giá cả, nhưng với dấu hiệu trái ngược: barato nghĩa là "rẻ," caro nghĩa là "đắt," đây là các từ trái nghĩa, không phải đồng nghĩa. Cái bẫy thứ hai là quên mất giống và nói Es barato về một vật giống cái: cần dạng Es barata, với -a. Cái bẫy thứ ba là dùng eres hay soy thay vì es: giá của một vật được đánh giá bằng từ nối es, không phải từ nối cho "tôi" hay "bạn". Cách kiểm tra đơn giản: giá thấp — barato/barata; giá cao — caro/cara; từ nối trước đặc điểm về giá của một vật — luôn là es.',
  id: 'Mudah mengacaukan barato dan caro — keduanya tentang harga, tapi dengan tanda berlawanan: barato berarti "murah," caro berarti "mahal," keduanya berlawanan, bukan sinonim. Jebakan kedua adalah lupa gender dan mengatakan Es barato tentang benda feminin: perlu bentuk Es barata, dengan -a. Jebakan ketiga adalah menggunakan eres atau soy alih-alih es: harga suatu benda dinilai dengan kata penghubung es, bukan kata penghubung untuk "saya" atau "kamu". Pengecekannya sederhana: harga rendah — barato/barata; harga tinggi — caro/cara; kata penghubung sebelum sifat harga suatu benda — selalu es.',
  tr: 'Barato ve caro’yu karıştırmak kolaydır — ikisi de fiyat hakkındadır, ama zıt işaretlerle: barato "ucuz," caro "pahalı" demektir, bunlar eş anlamlı değil, zıt anlamlıdır. İkinci tuzak, cinsiyeti unutup dişil bir şey hakkında Es barato demektir: Es barata biçimi, -a ile, gerekir. Üçüncü tuzak, es yerine eres ya da soy kullanmaktır: bir şeyin fiyatı es bağlacıyla değerlendirilir, "ben" ya da "sen" için olan bağlaçla değil. Kontrol basittir: düşük fiyat — barato/barata; yüksek fiyat — caro/cara; bir şeyin fiyat niteliğinden önceki bağlaç — her zaman es.',
  pl: 'Łatwo pomylić barato i caro — oba dotyczą ceny, ale z przeciwnym znakiem: barato znaczy „tanio”, caro znaczy „drogo”, to przeciwieństwa, nie synonimy. Druga pułapka to zapomnienie o rodzaju i powiedzenie Es barato o rzeczy rodzaju żeńskiego: potrzebna jest forma Es barata, z -a. Trzecia pułapka to użycie eres lub soy zamiast es: cenę rzeczy ocenia się łącznikiem es, nie łącznikiem dla „ja” czy „ty”. Sprawdzenie jest proste: niska cena — barato/barata; wysoka — caro/cara; łącznik przed cechą ceny rzeczy — zawsze es.',
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
      ru: R({ text: 'Barato описывает низкую цену вещи или услуги — прямую противоположность уже знакомому caro. Признак согласуется по роду точно так же, как caro/cara или bonito/bonita: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' для мужского рода или по умолчанию, barata для женского. Цена — это не факт о человеке, а оценка предмета, поэтому barato почти всегда звучит в разговоре о конкретной вещи со связкой es: Es barato, Es barata. Ответ прост: barato описывает низкую цену конкретной вещи, а caro — высокую, оба со связкой es, а не eres или soy.', semantic: 'explanation' }),
      uk: R({ text: 'Barato описує низьку ціну речі чи послуги — пряму протилежність уже знайомому caro. Ознака узгоджується за родом точно так само, як caro/cara чи bonito/bonita: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' для чоловічого роду або за замовчуванням, barata для жіночого. Ціна — це не факт про людину, а оцінка предмета, тому barato майже завжди звучить у розмові про конкретну річ зі зв’язкою es: Es barato, Es barata. Відповідь проста: barato описує низьку ціну конкретної речі, а caro — високу, обидва зі зв’язкою es, а не eres чи soy.', semantic: 'explanation' }),
      es: R({ text: 'Barato describes a thing or service\'s low price — the direct opposite of the already familiar caro. The quality agrees by gender exactly like caro/cara or bonito/bonita: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' for masculine or default, barata for feminine. Price is not a fact about a person, it is an evaluation of a thing, so barato almost always appears in a conversation about a specific thing with the linking word es: Es barato, Es barata. The answer is simple: barato describes a specific thing\'s low price, and caro describes a high one, both with the linking word es, not eres or soy.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Barato descreve o preço baixo de uma coisa ou serviço — o oposto direto do já conhecido caro. A qualidade concorda em gênero exatamente como caro/cara ou bonito/bonita: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' para masculino ou padrão, barata para feminino. Preço não é um fato sobre uma pessoa, é uma avaliação de uma coisa, então barato quase sempre aparece numa conversa sobre uma coisa específica com a ligação es: Es barato, Es barata. A resposta é simples: barato descreve o preço baixo de uma coisa específica, e caro descreve um preço alto, ambos com a ligação es, não eres ou soy.', semantic: 'explanation' }),
      vi: R({ text: 'Barato mô tả giá thấp của một vật hay dịch vụ — đối lập trực tiếp với caro đã quen thuộc. Đặc điểm hòa hợp theo giống y hệt như caro/cara hay bonito/bonita: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' cho giống đực hoặc mặc định, barata cho giống cái. Giá cả không phải là một sự thật về một người, mà là đánh giá về một vật, nên barato hầu như luôn xuất hiện trong cuộc trò chuyện về một vật cụ thể với từ nối es: Es barato, Es barata. Câu trả lời rất đơn giản: barato mô tả giá thấp của một vật cụ thể, còn caro mô tả giá cao, cả hai đều với từ nối es, không phải eres hay soy.', semantic: 'explanation' }),
      id: R({ text: 'Barato menggambarkan harga rendah suatu benda atau layanan — kebalikan langsung dari caro yang sudah dikenal. Sifatnya sesuai gender persis seperti caro/cara atau bonito/bonita: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' untuk maskulin atau default, barata untuk feminin. Harga bukan fakta tentang seseorang, melainkan penilaian tentang suatu benda, jadi barato hampir selalu muncul dalam percakapan tentang benda tertentu dengan kata penghubung es: Es barato, Es barata. Jawabannya sederhana: barato menggambarkan harga rendah benda tertentu, dan caro menggambarkan harga tinggi, keduanya dengan kata penghubung es, bukan eres atau soy.', semantic: 'explanation' }),
      tr: R({ text: 'Barato, bir şeyin ya da hizmetin düşük fiyatını tanımlar — zaten tanıdık olan caro’nun doğrudan zıttıdır. Nitelik, caro/cara ya da bonito/bonita gibi cinsiyete göre uyum sağlar: eril ya da varsayılan için ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ', dişil için barata. Fiyat bir kişi hakkında bir gerçek değil, bir şey hakkında bir değerlendirmedir, bu yüzden barato hemen her zaman belirli bir şey hakkında es bağlacıyla bir sohbette görünür: Es barato, Es barata. Cevap basittir: barato belirli bir şeyin düşük fiyatını, caro ise yüksek fiyatını tanımlar, ikisi de eres ya da soy değil, es bağlacıyla.', semantic: 'explanation' }),
      pl: R({ text: 'Barato opisuje niską cenę rzeczy lub usługi — bezpośrednie przeciwieństwo już znanego caro. Cecha zgadza się pod względem rodzaju dokładnie tak jak caro/cara czy bonito/bonita: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' dla rodzaju męskiego lub domyślnego, barata dla żeńskiego. Cena to nie fakt o osobie, lecz ocena rzeczy, dlatego barato niemal zawsze pojawia się w rozmowie o konkretnej rzeczy z łącznikiem es: Es barato, Es barata. Odpowiedź jest prosta: barato opisuje niską cenę konkretnej rzeczy, a caro — wysoką, oba z łącznikiem es, nie eres ani soy.', semantic: 'explanation' }),
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
        L({ ru: 'Низкую цену конкретной вещи', uk: 'Низьку ціну конкретної речі', es: "A specific thing's low price", 'pt-BR': 'O preço baixo de uma coisa específica', vi: 'Giá thấp của một vật cụ thể', id: 'Harga rendah benda tertentu', tr: 'Belirli bir şeyin düşük fiyatı', pl: 'Niską cenę konkretnej rzeczy' }),
        L({ ru: 'Уверенность человека', uk: 'Впевненість людини', es: "A person's confidence", 'pt-BR': 'A confiança de uma pessoa', vi: 'Sự tự tin của một người', id: 'Kepercayaan diri seseorang', tr: 'Bir kişinin güveni', pl: 'Pewność siebie osoby' }),
        L({ ru: 'Скорость движения', uk: 'Швидкість руху', es: 'The speed of movement', 'pt-BR': 'A velocidade do movimento', vi: 'Tốc độ di chuyển', id: 'Kecepatan gerakan', tr: 'Hareket hızı', pl: 'Prędkość ruchu' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Barato описывает низкую цену конкретной вещи — это оценка предмета, а не уверенность человека и не скорость.',
        uk: 'Barato описує низьку ціну конкретної речі — це оцінка предмета, а не впевненість людини і не швидкість.',
        es: "Barato describes a specific thing's low price — an evaluation of a thing, not a person's confidence or speed.",
        'pt-BR': 'Barato descreve o preço baixo de uma coisa específica — uma avaliação de uma coisa, não a confiança de uma pessoa nem a velocidade.',
        vi: 'Barato mô tả giá thấp của một vật cụ thể — đánh giá về một vật, không phải sự tự tin của một người hay tốc độ.',
        id: 'Barato menggambarkan harga rendah benda tertentu — penilaian tentang benda, bukan kepercayaan diri seseorang atau kecepatan.',
        tr: 'Barato, belirli bir şeyin düşük fiyatını tanımlar — bir şeyin değerlendirmesidir, bir kişinin güveni ya da hızı değil.',
        pl: 'Barato opisuje niską cenę konkretnej rzeczy — to ocena rzeczy, nie pewność siebie osoby ani prędkość.',
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
      ru: R({ text: 'Формула согласования та же, что и для caro/cara и других прилагательных: концовка -o для мужского рода или по умолчанию, концовка -a для женского. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' пишет -o, ', semantic: 'explanation' }, { text: 'barata', semantic: 'explanation' }, { text: ' меняет ровно одну букву на -a — ровно тот же принцип, что и caro/cara. Связка не меняется: Es barato и Es barata используют одну и ту же форму ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', потому что в обоих случаях оценивают предмет или ситуацию — меняется только концовка признака, а не связка. Ответ прост: мужской род или по умолчанию — всегда -o, женский — всегда -a, а связка перед признаком цены — всегда es.', semantic: 'explanation' }),
      uk: R({ text: 'Формула узгодження та сама, що й для caro/cara та інших прикметників: закінчення -o для чоловічого роду або за замовчуванням, закінчення -a для жіночого. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' пише -o, ', semantic: 'explanation' }, { text: 'barata', semantic: 'explanation' }, { text: ' змінює рівно одну літеру на -a — той самий принцип, що й caro/cara. Зв’язка не змінюється: Es barato і Es barata використовують ту саму форму ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', бо в обох випадках оцінюють предмет чи ситуацію — змінюється лише закінчення ознаки, а не зв’язка. Відповідь проста: чоловічий рід або за замовчуванням — завжди -o, жіночий — завжди -a, а зв’язка перед ознакою ціни — завжди es.', semantic: 'explanation' }),
      es: R({ text: 'The agreement formula is the same as for caro/cara and other adjectives: the ending -o for masculine or default, the ending -a for feminine. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' writes -o, ', semantic: 'explanation' }, { text: 'barata', semantic: 'explanation' }, { text: ' changes exactly one letter to -a — the same principle as caro/cara. The linking word does not change: Es barato and Es barata use the same form ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', because in both cases a thing or situation is being evaluated — only the ending of the quality changes, not the linking word. The answer is simple: masculine or default is always -o, feminine is always -a, and the linking word before a price quality is always es.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula de concordância é a mesma de caro/cara e outros adjetivos: a terminação -o para masculino ou padrão, a terminação -a para feminino. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' escreve -o, ', semantic: 'explanation' }, { text: 'barata', semantic: 'explanation' }, { text: ' muda exatamente uma letra para -a — o mesmo princípio de caro/cara. A ligação não muda: Es barato e Es barata usam a mesma forma ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', porque nos dois casos se avalia uma coisa ou situação — só a terminação da qualidade muda, não a ligação. A resposta é simples: masculino ou padrão é sempre -o, feminino é sempre -a, e a ligação antes de uma qualidade de preço é sempre es.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức hòa hợp giống như caro/cara và các tính từ khác: đuôi -o cho giống đực hoặc mặc định, đuôi -a cho giống cái. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' viết -o, ', semantic: 'explanation' }, { text: 'barata', semantic: 'explanation' }, { text: ' chỉ đổi đúng một chữ cái thành -a — cùng nguyên tắc với caro/cara. Từ nối không đổi: Es barato và Es barata dùng cùng dạng ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', vì cả hai trường hợp đều đánh giá một vật hay tình huống — chỉ đuôi của đặc điểm thay đổi, không phải từ nối. Câu trả lời rất đơn giản: giống đực hoặc mặc định luôn là -o, giống cái luôn là -a, và từ nối trước đặc điểm về giá luôn là es.', semantic: 'explanation' }),
      id: R({ text: 'Rumus kesesuaian sama seperti caro/cara dan kata sifat lain: akhiran -o untuk maskulin atau default, akhiran -a untuk feminin. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' menulis -o, ', semantic: 'explanation' }, { text: 'barata', semantic: 'explanation' }, { text: ' mengubah tepat satu huruf menjadi -a — prinsip yang sama dengan caro/cara. Kata penghubung tidak berubah: Es barato dan Es barata menggunakan bentuk yang sama ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', karena dalam kedua kasus menilai benda atau situasi — hanya akhiran sifat yang berubah, bukan kata penghubung. Jawabannya sederhana: maskulin atau default selalu -o, feminin selalu -a, dan kata penghubung sebelum sifat harga selalu es.', semantic: 'explanation' }),
      tr: R({ text: 'Uyum formülü caro/cara ve diğer sıfatlarla aynıdır: eril ya da varsayılan için -o son eki, dişil için -a son eki. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' -o yazar, ', semantic: 'explanation' }, { text: 'barata', semantic: 'explanation' }, { text: ' tam olarak tek bir harfi -a olarak değiştirir — caro/cara ile aynı ilke. Bağlaç değişmez: Es barato ve Es barata aynı ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' biçimini kullanır, çünkü her iki durumda da bir şey ya da durum değerlendirilir — yalnızca niteliğin sonu değişir, bağlaç değil. Cevap basittir: eril ya da varsayılan her zaman -o, dişil her zaman -a, ve bir fiyat niteliğinden önceki bağlaç her zaman es’tir.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła zgodności jest taka sama jak dla caro/cara i innych przymiotników: końcówka -o dla rodzaju męskiego lub domyślnego, końcówka -a dla żeńskiego. ', semantic: 'explanation' }, { text: 'Barato', semantic: 'targetCorrect' }, { text: ' pisze -o, ', semantic: 'explanation' }, { text: 'barata', semantic: 'explanation' }, { text: ' zmienia dokładnie jedną literę na -a — ta sama zasada co caro/cara. Łącznik się nie zmienia: Es barato i Es barata używają tej samej formy ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', ponieważ w obu przypadkach ocenia się rzecz lub sytuację — zmienia się tylko końcówka cechy, nie łącznik. Odpowiedź jest prosta: rodzaj męski lub domyślny to zawsze -o, żeński to zawsze -a, a łącznik przed cechą ceny to zawsze es.', semantic: 'explanation' }),
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
      ru: R({ text: 'Легко перепутать barato и caro — они оба про цену, но с разным знаком: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' значит «дёшево», ', semantic: 'explanation' }, { text: 'caro', semantic: 'explanation' }, { text: ' значит «дорого», это противоположности, а не синонимы. Вторая ловушка — забыть про род и сказать ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' про вещь женского рода: нужна форма Es barata, с -a. Третья ловушка — использовать eres или soy вместо es: цену предмета оценивают связкой es, а не связкой для «я» или «ты». Проверка простая: низкая цена — barato/barata; высокая — caro/cara; связка перед признаком цены предмета — всегда es.', semantic: 'explanation' }),
      uk: R({ text: 'Легко сплутати barato і caro — вони обидва про ціну, але з різним знаком: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' означає «дешево», ', semantic: 'explanation' }, { text: 'caro', semantic: 'explanation' }, { text: ' означає «дорого», це протилежності, а не синоніми. Друга пастка — забути про рід і сказати ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' про річ жіночого роду: потрібна форма Es barata, з -a. Третя пастка — використати eres чи soy замість es: ціну предмета оцінюють зв’язкою es, а не зв’язкою для «я» чи «ти». Перевірка проста: низька ціна — barato/barata; висока — caro/cara; зв’язка перед ознакою ціни предмета — завжди es.', semantic: 'explanation' }),
      es: R({ text: 'It is easy to confuse barato and caro — both are about price, but with opposite signs: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' means "cheap," ', semantic: 'explanation' }, { text: 'caro', semantic: 'explanation' }, { text: ' means "expensive," they are opposites, not synonyms. The second trap is forgetting about gender and saying ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' about a feminine thing: the form Es barata, with -a, is needed. The third trap is using eres or soy instead of es: a thing\'s price is evaluated with the linking word es, not the linking word for "I" or "you." The check is simple: low price — barato/barata; high price — caro/cara; the linking word before a thing\'s price quality — always es.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'É fácil confundir barato e caro — ambos são sobre preço, mas com sinais opostos: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' significa "barato," ', semantic: 'explanation' }, { text: 'caro', semantic: 'explanation' }, { text: ' significa "caro," são opostos, não sinônimos. A segunda armadilha é esquecer o gênero e dizer ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' sobre uma coisa feminina: precisa da forma Es barata, com -a. A terceira armadilha é usar eres ou soy em vez de es: o preço de uma coisa é avaliado com a ligação es, não a ligação para "eu" ou "você". A checagem é simples: preço baixo — barato/barata; preço alto — caro/cara; a ligação antes da qualidade de preço de uma coisa — sempre es.', semantic: 'explanation' }),
      vi: R({ text: 'Dễ nhầm lẫn barato và caro — cả hai đều nói về giá cả, nhưng với dấu hiệu trái ngược: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' nghĩa là "rẻ," ', semantic: 'explanation' }, { text: 'caro', semantic: 'explanation' }, { text: ' nghĩa là "đắt," đây là các từ trái nghĩa, không phải đồng nghĩa. Cái bẫy thứ hai là quên mất giống và nói ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' về một vật giống cái: cần dạng Es barata, với -a. Cái bẫy thứ ba là dùng eres hay soy thay vì es: giá của một vật được đánh giá bằng từ nối es, không phải từ nối cho "tôi" hay "bạn". Cách kiểm tra đơn giản: giá thấp — barato/barata; giá cao — caro/cara; từ nối trước đặc điểm về giá của một vật — luôn là es.', semantic: 'explanation' }),
      id: R({ text: 'Mudah mengacaukan barato dan caro — keduanya tentang harga, tapi dengan tanda berlawanan: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' berarti "murah," ', semantic: 'explanation' }, { text: 'caro', semantic: 'explanation' }, { text: ' berarti "mahal," keduanya berlawanan, bukan sinonim. Jebakan kedua adalah lupa gender dan mengatakan ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' tentang benda feminin: perlu bentuk Es barata, dengan -a. Jebakan ketiga adalah menggunakan eres atau soy alih-alih es: harga suatu benda dinilai dengan kata penghubung es, bukan kata penghubung untuk "saya" atau "kamu". Pengecekannya sederhana: harga rendah — barato/barata; harga tinggi — caro/cara; kata penghubung sebelum sifat harga suatu benda — selalu es.', semantic: 'explanation' }),
      tr: R({ text: 'Barato ve caro’yu karıştırmak kolaydır — ikisi de fiyat hakkındadır, ama zıt işaretlerle: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' "ucuz," ', semantic: 'explanation' }, { text: 'caro', semantic: 'explanation' }, { text: ' "pahalı" demektir, bunlar eş anlamlı değil, zıt anlamlıdır. İkinci tuzak, cinsiyeti unutup dişil bir şey hakkında ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' demektir: Es barata biçimi, -a ile, gerekir. Üçüncü tuzak, es yerine eres ya da soy kullanmaktır: bir şeyin fiyatı es bağlacıyla değerlendirilir, "ben" ya da "sen" için olan bağlaçla değil. Kontrol basittir: düşük fiyat — barato/barata; yüksek fiyat — caro/cara; bir şeyin fiyat niteliğinden önceki bağlaç — her zaman es.', semantic: 'explanation' }),
      pl: R({ text: 'Łatwo pomylić barato i caro — oba dotyczą ceny, ale z przeciwnym znakiem: ', semantic: 'explanation' }, { text: 'barato', semantic: 'targetCorrect' }, { text: ' znaczy „tanio”, ', semantic: 'explanation' }, { text: 'caro', semantic: 'explanation' }, { text: ' znaczy „drogo”, to przeciwieństwa, nie synonimy. Druga pułapka to zapomnienie o rodzaju i powiedzenie ', semantic: 'explanation' }, { text: 'Es barato', semantic: 'targetWrong' }, { text: ' o rzeczy rodzaju żeńskiego: potrzebna jest forma Es barata, z -a. Trzecia pułapka to użycie eres lub soy zamiast es: cenę rzeczy ocenia się łącznikiem es, nie łącznikiem dla „ja” czy „ty”. Sprawdzenie jest proste: niska cena — barato/barata; wysoka — caro/cara; łącznik przed cechą ceny rzeczy — zawsze es.', semantic: 'explanation' }),
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
