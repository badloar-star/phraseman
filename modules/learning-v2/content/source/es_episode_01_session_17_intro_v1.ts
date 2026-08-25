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
  ru: 'Es fácil, Es verdad — эти фразы уже встречались как готовые фразы, без объяснения устройства. У связки ser есть форма для каждого, о ком идёт речь: soy — «я», eres — «ты», а es — третье лицо: он, она, оно, а также любой предмет или ситуация. Разница не в звучании слова, а в том, к кому оно относится: Soy rápido — про себя, Eres rápido — про собеседника, Es rápido — про что-то третье, что не является ни говорящим, ни слушающим. Ответ прост: es используется, когда речь о предмете или ситуации, а не о говорящем или собеседнике.',
  uk: 'Es fácil, Es verdad — ці фрази вже траплялися як готові вислови, без пояснення устрою. У зв’язки ser є форма для кожного, про кого йдеться: soy — «я», eres — «ти», а es — третя особа: він, вона, воно, а також будь-який предмет чи ситуація. Різниця не у звучанні слова, а в тому, до кого воно стосується: Soy rápido — про себе, Eres rápido — про співрозмовника, Es rápido — про щось третє, що не є ні мовцем, ні слухачем. Відповідь проста: es використовується, коли йдеться про предмет чи ситуацію, а не про мовця чи співрозмовника.',
  es: 'Es fácil, Es verdad — these phrases already appeared as ready-made expressions, without explaining how they work. The linking word ser has a form for whoever is being talked about: soy is "I", eres is "you", and es is the third person: he, she, it, and also any thing or situation. The difference is not in how the word sounds, but in who it refers to: Soy rápido is about the speaker, Eres rápido is about the listener, Es rápido is about a third party that is neither the speaker nor the listener. The answer is simple: es is used when talking about a thing or situation, not the speaker or listener.',
  'pt-BR': 'Es fácil, Es verdad — essas frases já apareceram como expressões prontas, sem explicar como funcionam. A ligação ser tem uma forma para cada um de quem se fala: soy é "eu", eres é "tú", e es é a terceira pessoa: ele, ela, isso, e também qualquer coisa ou situação. A diferença não está no som da palavra, mas em a quem ela se refere: Soy rápido é sobre quem fala, Eres rápido é sobre o interlocutor, Es rápido é sobre um terceiro que não é nem quem fala nem quem ouve. A resposta é simples: es é usado ao falar de uma coisa ou situação, não de quem fala ou ouve.',
  vi: 'Es fácil, Es verdad — những câu này đã từng xuất hiện như cụm có sẵn, không giải thích cách hoạt động. Từ nối ser có một dạng cho từng người được nói tới: soy là "tôi", eres là "bạn", còn es là ngôi thứ ba: anh ấy, cô ấy, nó, và cả bất kỳ vật hay tình huống nào. Sự khác biệt không nằm ở cách phát âm từ, mà ở việc nó nói về ai: Soy rápido là về người nói, Eres rápido là về người nghe, Es rápido là về một bên thứ ba không phải người nói cũng không phải người nghe. Câu trả lời rất đơn giản: es được dùng khi nói về một vật hay tình huống, không phải người nói hay người nghe.',
  id: 'Es fácil, Es verdad — frasa ini sudah pernah muncul sebagai ungkapan siap pakai, tanpa penjelasan cara kerjanya. Kata penghubung ser memiliki bentuk untuk setiap orang yang dibicarakan: soy adalah "aku", eres adalah "kamu", dan es adalah orang ketiga: dia (laki-laki), dia (perempuan), itu, dan juga benda atau situasi apa pun. Perbedaannya bukan pada bunyi katanya, tetapi pada siapa yang dirujuknya: Soy rápido tentang penutur, Eres rápido tentang pendengar, Es rápido tentang pihak ketiga yang bukan penutur maupun pendengar. Jawabannya sederhana: es digunakan saat membicarakan benda atau situasi, bukan penutur atau pendengar.',
  tr: 'Es fácil, Es verdad — bu ifadeler daha önce hazır kalıplar olarak geçmişti, nasıl işlediği açıklanmadan. Ser bağlacının, kimden bahsedildiğine göre bir biçimi vardır: soy "ben"dir, eres "sen"dir, es ise üçüncü kişidir: o (erkek), o (kadın), o (nesne), ayrıca herhangi bir şey ya da durum. Fark, kelimenin sesinde değil, kime atıfta bulunduğundadır: Soy rápido konuşan hakkındadır, Eres rápido dinleyici hakkındadır, Es rápido ise ne konuşan ne de dinleyici olan üçüncü bir taraf hakkındadır. Cevap basittir: es, konuşan ya da dinleyici değil, bir şey ya da durum hakkında konuşulduğunda kullanılır.',
  pl: 'Es fácil, Es verdad — te zwroty pojawiały się już jako gotowe wyrażenia, bez wyjaśnienia, jak działają. Łącznik ser ma formę dla każdego, o kim mowa: soy to „ja”, eres to „ty”, a es to trzecia osoba: on, ona, ono, a także dowolna rzecz lub sytuacja. Różnica nie leży w brzmieniu słowa, lecz w tym, do kogo się ono odnosi: Soy rápido dotyczy mówiącego, Eres rápido dotyczy słuchacza, Es rápido dotyczy trzeciej strony, która nie jest ani mówiącym, ani słuchaczem. Odpowiedź jest prosta: es używa się, gdy mowa o rzeczy lub sytuacji, a nie o mówiącym czy słuchaczu.',
});

const FORMULA_BODY = L({
  ru: 'Формула та же самая, что для soy и eres: связка + признак, без отдельного слова-подлежащего впереди. Es fácil, а не Ello es fácil; Es caro, а не Eso es caro. Испанский, как и в правиле pronoun_drop, не называет предмет или ситуацию отдельным словом «оно» — окончание -s связки es само указывает на безличное третье лицо. Признак при этом согласуется с родом того, о чём речь: Es bonito (по умолчанию или мужской род) — Es bonita (женский род), точно так же, как bonito/bonita подстраивались под собеседника у eres. Ответ прост: перед es, как и перед местоимением «оно», отдельного слова нет вообще.',
  uk: 'Формула та сама, що й для soy та eres: зв’язка + ознака, без окремого слова-підмета попереду. Es fácil, а не Ello es fácil; Es caro, а не Eso es caro. Іспанська, як і в правилі pronoun_drop, не називає предмет чи ситуацію окремим словом «воно» — закінчення -s зв’язки es саме вказує на безособову третю особу. Ознака при цьому узгоджується з родом того, про що йдеться: Es bonito (за замовчуванням чи чоловічий рід) — Es bonita (жіночий рід), так само як bonito/bonita підлаштовувалися під співрозмовника у eres. Відповідь проста: перед es, як і перед займенником «воно», окремого слова немає взагалі.',
  es: 'The formula is the same as for soy and eres: linking word + quality, without a separate subject word in front. Es fácil, not Ello es fácil; Es caro, not Eso es caro. Spanish, just like in the pronoun_drop rule, does not name a thing or situation with a separate word "it" — the ending -s of es itself points to the impersonal third person. The quality agrees with the gender of what is being discussed: Es bonito (default or masculine) versus Es bonita (feminine), the same way bonito/bonita adapted to the listener with eres. The answer is simple: before es, just like before the pronoun "it", there is no separate word at all.',
  'pt-BR': 'A fórmula é a mesma de soy e eres: ligação + qualidade, sem palavra-sujeito separada na frente. Es fácil, não Ello es fácil; Es caro, não Eso es caro. O espanhol, assim como na regra pronoun_drop, não nomeia uma coisa ou situação com uma palavra separada "isso" — a terminação -s de es já aponta para a terceira pessoa impessoal. A qualidade concorda com o gênero daquilo de que se fala: Es bonito (padrão ou masculino) contra Es bonita (feminino), do mesmo jeito que bonito/bonita se ajustavam ao interlocutor com eres. A resposta é simples: antes de es, assim como antes do pronome "isso", não há palavra separada nenhuma.',
  vi: 'Công thức giống hệt như với soy và eres: từ nối + đặc điểm, không có từ chủ ngữ riêng phía trước. Es fácil, không phải Ello es fácil; Es caro, không phải Eso es caro. Tiếng Tây Ban Nha, giống như quy tắc pronoun_drop, không gọi tên một vật hay tình huống bằng một từ riêng "nó" — đuôi -s của es đã tự chỉ ra ngôi thứ ba phi nhân xưng. Đặc điểm hòa hợp với giống của điều đang được nói tới: Es bonito (mặc định hoặc giống đực) so với Es bonita (giống cái), giống hệt cách bonito/bonita điều chỉnh theo người nghe với eres. Câu trả lời rất đơn giản: trước es, cũng như trước đại từ "nó", hoàn toàn không có từ riêng nào.',
  id: 'Rumusnya sama seperti untuk soy dan eres: kata penghubung + sifat, tanpa kata subjek terpisah di depan. Es fácil, bukan Ello es fácil; Es caro, bukan Eso es caro. Bahasa Spanyol, sama seperti aturan pronoun_drop, tidak menyebut benda atau situasi dengan kata terpisah "itu" — akhiran -s dari es sendiri sudah menunjukkan orang ketiga impersonal. Sifatnya sesuai dengan gender dari apa yang dibicarakan: Es bonito (default atau maskulin) versus Es bonita (feminin), sama seperti bonito/bonita menyesuaikan dengan pendengar pada eres. Jawabannya sederhana: sebelum es, sama seperti sebelum kata ganti "itu", sama sekali tidak ada kata terpisah.',
  tr: 'Formül, soy ve eres için olanla aynıdır: bağlaç + nitelik, önünde ayrı bir özne kelimesi olmadan. Es fácil, Ello es fácil değil; Es caro, Eso es caro değil. İspanyolca, tıpkı pronoun_drop kuralında olduğu gibi, bir şeyi ya da durumu ayrı bir "o" kelimesiyle adlandırmaz — es’in -s son eki zaten kişisiz üçüncü kişiyi işaret eder. Nitelik, söz konusu olanın cinsiyetiyle uyumludur: Es bonito (varsayılan ya da eril) karşısında Es bonita (dişil), tıpkı bonito/bonita’nın eres ile dinleyiciye uyum sağlaması gibi. Cevap basittir: es’ten önce, tıpkı "o" zamirinden önce olduğu gibi, hiç ayrı bir kelime yoktur.',
  pl: 'Formuła jest taka sama jak dla soy i eres: łącznik + cecha, bez osobnego słowa-podmiotu z przodu. Es fácil, nie Ello es fácil; Es caro, nie Eso es caro. Hiszpański, tak jak w regule pronoun_drop, nie nazywa rzeczy ani sytuacji osobnym słowem „to” — końcówka -s w es sama wskazuje na bezosobową trzecią osobę. Cecha zgadza się z rodzajem tego, o czym mowa: Es bonito (domyślnie lub rodzaj męski) kontra Es bonita (rodzaj żeński), dokładnie tak jak bonito/bonita dopasowywały się do słuchacza przy eres. Odpowiedź jest prosta: przed es, tak jak przed zaimkiem „to”, nie ma w ogóle osobnego słowa.',
});

const TRAP_BODY = L({
  ru: 'Главная ловушка — спутать es с eres, потому что оба слова короткие и похожи по звучанию. Es tranquilo невозможно перепутать с Eres tranquilo только по смыслу: первое — про предмет или обстановку («здесь спокойно»), второе — про собеседника («ты спокойный»). Проверка простая: если фраза оценивает вещь, факт или ситуацию — только es; если обращаешься к живому собеседнику напрямую — eres; если говоришь о себе — soy. Вторая ловушка — забыть про согласование признака: Es bonito верно для мужского рода и по умолчанию, но про вещь женского рода нужно Es bonita, а не Es bonito.',
  uk: 'Головна пастка — сплутати es з eres, бо обидва слова короткі та схожі за звучанням. Es tranquilo неможливо сплутати з Eres tranquilo лише за змістом: перше — про предмет чи обстановку («тут спокійно»), друге — про співрозмовника («ти спокійний»). Перевірка проста: якщо фраза оцінює річ, факт чи ситуацію — тільки es; якщо звертаєшся до живого співрозмовника напряму — eres; якщо кажеш про себе — soy. Друга пастка — забути про узгодження ознаки: Es bonito правильно для чоловічого роду та за замовчуванням, але про річ жіночого роду потрібно Es bonita, а не Es bonito.',
  es: 'The main trap is confusing es with eres, because both words are short and sound alike. Es tranquilo cannot be confused with Eres tranquilo by meaning alone: the first is about a thing or setting ("it is calm here"), the second is about the listener ("you are calm"). The check is simple: if the phrase evaluates a thing, fact, or situation — only es; if you address a living listener directly — eres; if you talk about yourself — soy. The second trap is forgetting quality agreement: Es bonito is correct for masculine and default, but about a feminine thing you need Es bonita, not Es bonito.',
  'pt-BR': 'A armadilha principal é confundir es com eres, porque as duas palavras são curtas e soam parecidas. Es tranquilo não pode ser confundido com Eres tranquilo só pelo sentido: o primeiro é sobre uma coisa ou ambiente ("aqui está calmo"), o segundo é sobre o interlocutor ("você é calmo"). A checagem é simples: se a frase avalia uma coisa, fato ou situação — só es; se você fala diretamente com um interlocutor vivo — eres; se fala de si mesmo — soy. A segunda armadilha é esquecer a concordância da qualidade: Es bonito é correto para masculino e padrão, mas sobre uma coisa feminina precisa de Es bonita, não Es bonito.',
  vi: 'Cái bẫy chính là nhầm es với eres, vì cả hai từ đều ngắn và nghe giống nhau. Es tranquilo không thể nhầm với Eres tranquilo chỉ bằng nghĩa: cái đầu tiên nói về một vật hay khung cảnh ("ở đây yên tĩnh"), cái thứ hai nói về người nghe ("bạn điềm tĩnh"). Cách kiểm tra đơn giản: nếu câu đánh giá một vật, sự thật, hay tình huống — chỉ dùng es; nếu bạn nói trực tiếp với một người nghe sống — dùng eres; nếu nói về chính mình — dùng soy. Cái bẫy thứ hai là quên hòa hợp đặc điểm: Es bonito đúng cho giống đực và mặc định, nhưng về một vật giống cái cần Es bonita, không phải Es bonito.',
  id: 'Jebakan utama adalah mengacaukan es dengan eres, karena kedua kata itu pendek dan terdengar mirip. Es tranquilo tidak bisa disamakan dengan Eres tranquilo hanya dari maknanya: yang pertama tentang benda atau suasana ("di sini tenang"), yang kedua tentang pendengar ("kamu tenang"). Pengecekannya sederhana: jika frasa menilai benda, fakta, atau situasi — hanya es; jika berbicara langsung dengan pendengar yang hidup — eres; jika berbicara tentang diri sendiri — soy. Jebakan kedua adalah melupakan kesesuaian sifat: Es bonito benar untuk maskulin dan default, tetapi tentang benda feminin perlu Es bonita, bukan Es bonito.',
  tr: 'Asıl tuzak es’i eres ile karıştırmaktır, çünkü her iki kelime de kısadır ve benzer sesler. Es tranquilo, yalnızca anlamıyla Eres tranquilo ile karıştırılamaz: birincisi bir şey ya da ortam hakkındadır ("burası sakin"), ikincisi dinleyici hakkındadır ("sen sakinsin"). Kontrol basittir: ifade bir şeyi, gerçeği ya da durumu değerlendiriyorsa — yalnızca es; canlı bir dinleyiciye doğrudan hitap ediyorsanız — eres; kendinizden bahsediyorsanız — soy. İkinci tuzak, nitelik uyumunu unutmaktır: Es bonito eril ve varsayılan için doğrudur, ama dişil bir şey için Es bonita gerekir, Es bonito değil.',
  pl: 'Główna pułapka to mylenie es z eres, ponieważ oba słowa są krótkie i brzmią podobnie. Es tranquilo nie da się pomylić z Eres tranquilo tylko po znaczeniu: pierwsze dotyczy rzeczy lub otoczenia („tu jest spokojnie”), drugie dotyczy słuchacza („jesteś spokojny”). Sprawdzenie jest proste: jeśli fraza ocenia rzecz, fakt lub sytuację — tylko es; jeśli zwracasz się bezpośrednio do żywego słuchacza — eres; jeśli mówisz o sobie — soy. Druga pułapka to zapomnienie o zgodności cechy: Es bonito jest poprawne dla rodzaju męskiego i domyślnego, ale o rzeczy rodzaju żeńskiego potrzeba Es bonita, nie Es bonito.',
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
      ru: R({ text: 'Es fácil, Es verdad — эти фразы уже встречались как готовые фразы, без объяснения устройства. У связки ser есть форма для каждого, о ком идёт речь: soy — «я», eres — «ты», а ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — третье лицо: он, она, оно, а также любой предмет или ситуация. Разница не в звучании слова, а в том, к кому оно относится: Soy rápido — про себя, Eres rápido — про собеседника, Es rápido — про что-то третье, что не является ни говорящим, ни слушающим. Ответ прост: es используется, когда речь о предмете или ситуации, а не о говорящем или собеседнике.', semantic: 'explanation' }),
      uk: R({ text: 'Es fácil, Es verdad — ці фрази вже траплялися як готові вислови, без пояснення устрою. У зв’язки ser є форма для кожного, про кого йдеться: soy — «я», eres — «ти», а ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — третя особа: він, вона, воно, а також будь-який предмет чи ситуація. Різниця не у звучанні слова, а в тому, до кого воно стосується: Soy rápido — про себе, Eres rápido — про співрозмовника, Es rápido — про щось третє, що не є ні мовцем, ні слухачем. Відповідь проста: es використовується, коли йдеться про предмет чи ситуацію, а не про мовця чи співрозмовника.', semantic: 'explanation' }),
      es: R({ text: 'Es fácil, Es verdad — these phrases already appeared as ready-made expressions, without explaining how they work. The linking word ser has a form for whoever is being talked about: soy is "I", eres is "you", and ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' is the third person: he, she, it, and also any thing or situation. The difference is not in how the word sounds, but in who it refers to: Soy rápido is about the speaker, Eres rápido is about the listener, Es rápido is about a third party that is neither the speaker nor the listener. The answer is simple: es is used when talking about a thing or situation, not the speaker or listener.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'Es fácil, Es verdad — essas frases já apareceram como expressões prontas, sem explicar como funcionam. A ligação ser tem uma forma para cada um de quem se fala: soy é "eu", eres é "tú", e ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' é a terceira pessoa: ele, ela, isso, e também qualquer coisa ou situação. A diferença não está no som da palavra, mas em a quem ela se refere: Soy rápido é sobre quem fala, Eres rápido é sobre o interlocutor, Es rápido é sobre um terceiro que não é nem quem fala nem quem ouve. A resposta é simples: es é usado ao falar de uma coisa ou situação, não de quem fala ou ouve.', semantic: 'explanation' }),
      vi: R({ text: 'Es fácil, Es verdad — những câu này đã từng xuất hiện như cụm có sẵn, không giải thích cách hoạt động. Từ nối ser có một dạng cho từng người được nói tới: soy là "tôi", eres là "bạn", còn ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' là ngôi thứ ba: anh ấy, cô ấy, nó, và cả bất kỳ vật hay tình huống nào. Sự khác biệt không nằm ở cách phát âm từ, mà ở việc nó nói về ai: Soy rápido là về người nói, Eres rápido là về người nghe, Es rápido là về một bên thứ ba không phải người nói cũng không phải người nghe. Câu trả lời rất đơn giản: es được dùng khi nói về một vật hay tình huống, không phải người nói hay người nghe.', semantic: 'explanation' }),
      id: R({ text: 'Es fácil, Es verdad — frasa ini sudah pernah muncul sebagai ungkapan siap pakai, tanpa penjelasan cara kerjanya. Kata penghubung ser memiliki bentuk untuk setiap orang yang dibicarakan: soy adalah "aku", eres adalah "kamu", dan ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' adalah orang ketiga: dia (laki-laki), dia (perempuan), itu, dan juga benda atau situasi apa pun. Perbedaannya bukan pada bunyi katanya, tetapi pada siapa yang dirujuknya: Soy rápido tentang penutur, Eres rápido tentang pendengar, Es rápido tentang pihak ketiga yang bukan penutur maupun pendengar. Jawabannya sederhana: es digunakan saat membicarakan benda atau situasi, bukan penutur atau pendengar.', semantic: 'explanation' }),
      tr: R({ text: 'Es fácil, Es verdad — bu ifadeler daha önce hazır kalıplar olarak geçmişti, nasıl işlediği açıklanmadan. Ser bağlacının, kimden bahsedildiğine göre bir biçimi vardır: soy "ben"dir, eres "sen"dir, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' ise üçüncü kişidir: o (erkek), o (kadın), o (nesne), ayrıca herhangi bir şey ya da durum. Fark, kelimenin sesinde değil, kime atıfta bulunduğundadır: Soy rápido konuşan hakkındadır, Eres rápido dinleyici hakkındadır, Es rápido ise ne konuşan ne de dinleyici olan üçüncü bir taraf hakkındadır. Cevap basittir: es, konuşan ya da dinleyici değil, bir şey ya da durum hakkında konuşulduğunda kullanılır.', semantic: 'explanation' }),
      pl: R({ text: 'Es fácil, Es verdad — te zwroty pojawiały się już jako gotowe wyrażenia, bez wyjaśnienia, jak działają. Łącznik ser ma formę dla każdego, o kim mowa: soy to „ja”, eres to „ty”, a ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' to trzecia osoba: on, ona, ono, a także dowolna rzecz lub sytuacja. Różnica nie leży w brzmieniu słowa, lecz w tym, do kogo się ono odnosi: Soy rápido dotyczy mówiącego, Eres rápido dotyczy słuchacza, Es rápido dotyczy trzeciej strony, która nie jest ani mówiącym, ani słuchaczem. Odpowiedź jest prosta: es używa się, gdy mowa o rzeczy lub sytuacji, a nie o mówiącym czy słuchaczu.', semantic: 'explanation' }),
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
      ru: R({ text: 'Формула та же самая, что для soy и eres: связка + признак, без отдельного слова-подлежащего впереди. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', а не Ello es fácil; ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ', а не Eso es caro. Испанский, как и в правиле pronoun_drop, не называет предмет или ситуацию отдельным словом «оно» — окончание -s связки es само указывает на безличное третье лицо. Признак при этом согласуется с родом того, о чём речь: Es bonito (по умолчанию или мужской род) — Es bonita (женский род), точно так же, как bonito/bonita подстраивались под собеседника у eres. Ответ прост: перед es, как и перед местоимением «оно», отдельного слова нет вообще.', semantic: 'explanation' }),
      uk: R({ text: 'Формула та сама, що й для soy та eres: зв’язка + ознака, без окремого слова-підмета попереду. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', а не Ello es fácil; ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ', а не Eso es caro. Іспанська, як і в правилі pronoun_drop, не називає предмет чи ситуацію окремим словом «воно» — закінчення -s зв’язки es саме вказує на безособову третю особу. Ознака при цьому узгоджується з родом того, про що йдеться: Es bonito (за замовчуванням чи чоловічий рід) — Es bonita (жіночий рід), так само як bonito/bonita підлаштовувалися під співрозмовника у eres. Відповідь проста: перед es, як і перед займенником «воно», окремого слова немає взагалі.', semantic: 'explanation' }),
      es: R({ text: 'The formula is the same as for soy and eres: linking word + quality, without a separate subject word in front. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', not Ello es fácil; ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ', not Eso es caro. Spanish, just like in the pronoun_drop rule, does not name a thing or situation with a separate word "it" — the ending -s of es itself points to the impersonal third person. The quality agrees with the gender of what is being discussed: Es bonito (default or masculine) versus Es bonita (feminine), the same way bonito/bonita adapted to the listener with eres. The answer is simple: before es, just like before the pronoun "it", there is no separate word at all.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A fórmula é a mesma de soy e eres: ligação + qualidade, sem palavra-sujeito separada na frente. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', não Ello es fácil; ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ', não Eso es caro. O espanhol, assim como na regra pronoun_drop, não nomeia uma coisa ou situação com uma palavra separada "isso" — a terminação -s de es já aponta para a terceira pessoa impessoal. A qualidade concorda com o gênero daquilo de que se fala: Es bonito (padrão ou masculino) contra Es bonita (feminino), do mesmo jeito que bonito/bonita se ajustavam ao interlocutor com eres. A resposta é simples: antes de es, assim como antes do pronome "isso", não há palavra separada nenhuma.', semantic: 'explanation' }),
      vi: R({ text: 'Công thức giống hệt như với soy và eres: từ nối + đặc điểm, không có từ chủ ngữ riêng phía trước. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', không phải Ello es fácil; ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ', không phải Eso es caro. Tiếng Tây Ban Nha, giống như quy tắc pronoun_drop, không gọi tên một vật hay tình huống bằng một từ riêng "nó" — đuôi -s của es đã tự chỉ ra ngôi thứ ba phi nhân xưng. Đặc điểm hòa hợp với giống của điều đang được nói tới: Es bonito (mặc định hoặc giống đực) so với Es bonita (giống cái), giống hệt cách bonito/bonita điều chỉnh theo người nghe với eres. Câu trả lời rất đơn giản: trước es, cũng như trước đại từ "nó", hoàn toàn không có từ riêng nào.', semantic: 'explanation' }),
      id: R({ text: 'Rumusnya sama seperti untuk soy dan eres: kata penghubung + sifat, tanpa kata subjek terpisah di depan. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', bukan Ello es fácil; ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ', bukan Eso es caro. Bahasa Spanyol, sama seperti aturan pronoun_drop, tidak menyebut benda atau situasi dengan kata terpisah "itu" — akhiran -s dari es sendiri sudah menunjukkan orang ketiga impersonal. Sifatnya sesuai dengan gender dari apa yang dibicarakan: Es bonito (default atau maskulin) versus Es bonita (feminin), sama seperti bonito/bonita menyesuaikan dengan pendengar pada eres. Jawabannya sederhana: sebelum es, sama seperti sebelum kata ganti "itu", sama sekali tidak ada kata terpisah.', semantic: 'explanation' }),
      tr: R({ text: 'Formül, soy ve eres için olanla aynıdır: bağlaç + nitelik, önünde ayrı bir özne kelimesi olmadan. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', Ello es fácil değil; ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ', Eso es caro değil. İspanyolca, tıpkı pronoun_drop kuralında olduğu gibi, bir şeyi ya da durumu ayrı bir "o" kelimesiyle adlandırmaz — es’in -s son eki zaten kişisiz üçüncü kişiyi işaret eder. Nitelik, söz konusu olanın cinsiyetiyle uyumludur: Es bonito (varsayılan ya da eril) karşısında Es bonita (dişil), tıpkı bonito/bonita’nın eres ile dinleyiciye uyum sağlaması gibi. Cevap basittir: es’ten önce, tıpkı "o" zamirinden önce olduğu gibi, hiç ayrı bir kelime yoktur.', semantic: 'explanation' }),
      pl: R({ text: 'Formuła jest taka sama jak dla soy i eres: łącznik + cecha, bez osobnego słowa-podmiotu z przodu. ', semantic: 'explanation' }, { text: 'Es fácil', semantic: 'targetCorrect' }, { text: ', nie Ello es fácil; ', semantic: 'explanation' }, { text: 'Es caro', semantic: 'targetCorrect' }, { text: ', nie Eso es caro. Hiszpański, tak jak w regule pronoun_drop, nie nazywa rzeczy ani sytuacji osobnym słowem „to” — końcówka -s w es sama wskazuje na bezosobową trzecią osobę. Cecha zgadza się z rodzajem tego, o czym mowa: Es bonito (domyślnie lub rodzaj męski) kontra Es bonita (rodzaj żeński), dokładnie tak jak bonito/bonita dopasowywały się do słuchacza przy eres. Odpowiedź jest prosta: przed es, tak jak przed zaimkiem „to”, nie ma w ogóle osobnego słowa.', semantic: 'explanation' }),
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
        L({ ru: 'Отдельного слова нет вообще', uk: 'Окремого слова немає взагалі', es: 'There is no separate word at all', 'pt-BR': 'Não há palavra separada nenhuma', vi: 'Hoàn toàn không có từ riêng nào', id: 'Sama sekali tidak ada kata terpisah', tr: 'Hiç ayrı bir kelime yoktur', pl: 'Nie ma w ogóle osobnego słowa' }),
        L({ ru: 'Местоимение ello', uk: 'Займенник ello', es: 'The pronoun ello', 'pt-BR': 'O pronome ello', vi: 'Đại từ ello', id: 'Kata ganti ello', tr: 'Ello zamiri', pl: 'Zaimek ello' }),
        L({ ru: 'Местоимение eres', uk: 'Займенник eres', es: 'The pronoun eres', 'pt-BR': 'O pronome eres', vi: 'Đại từ eres', id: 'Kata ganti eres', tr: 'Eres zamiri', pl: 'Zaimek eres' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Верно: перед es отдельного слова нет вообще, ни ello, ни eres (которое к тому же не местоимение, а другая связка).',
        uk: 'Правильно: перед es окремого слова немає взагалі, ні ello, ні eres (яке до того ж не займенник, а інша зв’язка).',
        es: 'Correct: there is no separate word before es at all, neither ello nor eres (which is not even a pronoun, but a different linking word).',
        'pt-BR': 'Correto: não há palavra separada nenhuma antes de es, nem ello nem eres (que, aliás, não é pronome, e sim outra ligação).',
        vi: 'Đúng: hoàn toàn không có từ riêng nào trước es, không phải ello, cũng không phải eres (mà thực ra không phải đại từ, mà là một từ nối khác).',
        id: 'Benar: sama sekali tidak ada kata terpisah sebelum es, baik ello maupun eres (yang bahkan bukan kata ganti, melainkan kata penghubung lain).',
        tr: 'Doğru: es’ten önce hiç ayrı bir kelime yoktur, ne ello ne de eres (ki bu zaten bir zamir değil, başka bir bağlaçtır).',
        pl: 'Poprawnie: przed es nie ma w ogóle osobnego słowa, ani ello, ani eres (które w dodatku nie jest zaimkiem, lecz innym łącznikiem).',
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
      ru: R({ text: 'Главная ловушка — спутать es с eres, потому что оба слова короткие и похожи по звучанию. ', semantic: 'explanation' }, { text: 'Es tranquilo', semantic: 'targetCorrect' }, { text: ' невозможно перепутать с ', semantic: 'explanation' }, { text: 'Eres tranquilo', semantic: 'targetWrong' }, { text: ' только по смыслу: первое — про предмет или обстановку («здесь спокойно»), второе — про собеседника («ты спокойный»). Проверка простая: если фраза оценивает вещь, факт или ситуацию — только es; если обращаешься к живому собеседнику напрямую — eres; если говоришь о себе — soy. Вторая ловушка — забыть про согласование признака: Es bonito верно для мужского рода и по умолчанию, но про вещь женского рода нужно Es bonita, а не Es bonito.', semantic: 'explanation' }),
      uk: R({ text: 'Головна пастка — сплутати es з eres, бо обидва слова короткі та схожі за звучанням. ', semantic: 'explanation' }, { text: 'Es tranquilo', semantic: 'targetCorrect' }, { text: ' неможливо сплутати з ', semantic: 'explanation' }, { text: 'Eres tranquilo', semantic: 'targetWrong' }, { text: ' лише за змістом: перше — про предмет чи обстановку («тут спокійно»), друге — про співрозмовника («ти спокійний»). Перевірка проста: якщо фраза оцінює річ, факт чи ситуацію — тільки es; якщо звертаєшся до живого співрозмовника напряму — eres; якщо кажеш про себе — soy. Друга пастка — забути про узгодження ознаки: Es bonito правильно для чоловічого роду та за замовчуванням, але про річ жіночого роду потрібно Es bonita, а не Es bonito.', semantic: 'explanation' }),
      es: R({ text: 'The main trap is confusing es with eres, because both words are short and sound alike. ', semantic: 'explanation' }, { text: 'Es tranquilo', semantic: 'targetCorrect' }, { text: ' cannot be confused with ', semantic: 'explanation' }, { text: 'Eres tranquilo', semantic: 'targetWrong' }, { text: ' by meaning alone: the first is about a thing or setting ("it is calm here"), the second is about the listener ("you are calm"). The check is simple: if the phrase evaluates a thing, fact, or situation — only es; if you address a living listener directly — eres; if you talk about yourself — soy. The second trap is forgetting quality agreement: Es bonito is correct for masculine and default, but about a feminine thing you need Es bonita, not Es bonito.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A armadilha principal é confundir es com eres, porque as duas palavras são curtas e soam parecidas. ', semantic: 'explanation' }, { text: 'Es tranquilo', semantic: 'targetCorrect' }, { text: ' não pode ser confundido com ', semantic: 'explanation' }, { text: 'Eres tranquilo', semantic: 'targetWrong' }, { text: ' só pelo sentido: o primeiro é sobre uma coisa ou ambiente ("aqui está calmo"), o segundo é sobre o interlocutor ("você é calmo"). A checagem é simples: se a frase avalia uma coisa, fato ou situação — só es; se você fala diretamente com um interlocutor vivo — eres; se fala de si mesmo — soy. A segunda armadilha é esquecer a concordância da qualidade: Es bonito é correto para masculino e padrão, mas sobre uma coisa feminina precisa de Es bonita, não Es bonito.', semantic: 'explanation' }),
      vi: R({ text: 'Cái bẫy chính là nhầm es với eres, vì cả hai từ đều ngắn và nghe giống nhau. ', semantic: 'explanation' }, { text: 'Es tranquilo', semantic: 'targetCorrect' }, { text: ' không thể nhầm với ', semantic: 'explanation' }, { text: 'Eres tranquilo', semantic: 'targetWrong' }, { text: ' chỉ bằng nghĩa: cái đầu tiên nói về một vật hay khung cảnh ("ở đây yên tĩnh"), cái thứ hai nói về người nghe ("bạn điềm tĩnh"). Cách kiểm tra đơn giản: nếu câu đánh giá một vật, sự thật, hay tình huống — chỉ dùng es; nếu bạn nói trực tiếp với một người nghe sống — dùng eres; nếu nói về chính mình — dùng soy. Cái bẫy thứ hai là quên hòa hợp đặc điểm: Es bonito đúng cho giống đực và mặc định, nhưng về một vật giống cái cần Es bonita, không phải Es bonito.', semantic: 'explanation' }),
      id: R({ text: 'Jebakan utama adalah mengacaukan es dengan eres, karena kedua kata itu pendek dan terdengar mirip. ', semantic: 'explanation' }, { text: 'Es tranquilo', semantic: 'targetCorrect' }, { text: ' tidak bisa disamakan dengan ', semantic: 'explanation' }, { text: 'Eres tranquilo', semantic: 'targetWrong' }, { text: ' hanya dari maknanya: yang pertama tentang benda atau suasana ("di sini tenang"), yang kedua tentang pendengar ("kamu tenang"). Pengecekannya sederhana: jika frasa menilai benda, fakta, atau situasi — hanya es; jika berbicara langsung dengan pendengar yang hidup — eres; jika berbicara tentang diri sendiri — soy. Jebakan kedua adalah melupakan kesesuaian sifat: Es bonito benar untuk maskulin dan default, tetapi tentang benda feminin perlu Es bonita, bukan Es bonito.', semantic: 'explanation' }),
      tr: R({ text: 'Asıl tuzak es’i eres ile karıştırmaktır, çünkü her iki kelime de kısadır ve benzer sesler. ', semantic: 'explanation' }, { text: 'Es tranquilo', semantic: 'targetCorrect' }, { text: ', yalnızca anlamıyla ', semantic: 'explanation' }, { text: 'Eres tranquilo', semantic: 'targetWrong' }, { text: ' ile karıştırılamaz: birincisi bir şey ya da ortam hakkındadır ("burası sakin"), ikincisi dinleyici hakkındadır ("sen sakinsin"). Kontrol basittir: ifade bir şeyi, gerçeği ya da durumu değerlendiriyorsa — yalnızca es; canlı bir dinleyiciye doğrudan hitap ediyorsanız — eres; kendinizden bahsediyorsanız — soy. İkinci tuzak, nitelik uyumunu unutmaktır: Es bonito eril ve varsayılan için doğrudur, ama dişil bir şey için Es bonita gerekir, Es bonito değil.', semantic: 'explanation' }),
      pl: R({ text: 'Główna pułapka to mylenie es z eres, ponieważ oba słowa są krótkie i brzmią podobnie. ', semantic: 'explanation' }, { text: 'Es tranquilo', semantic: 'targetCorrect' }, { text: ' nie da się pomylić z ', semantic: 'explanation' }, { text: 'Eres tranquilo', semantic: 'targetWrong' }, { text: ' tylko po znaczeniu: pierwsze dotyczy rzeczy lub otoczenia („tu jest spokojnie”), drugie dotyczy słuchacza („jesteś spokojny”). Sprawdzenie jest proste: jeśli fraza ocenia rzecz, fakt lub sytuację — tylko es; jeśli zwracasz się bezpośrednio do żywego słuchacza — eres; jeśli mówisz o sobie — soy. Druga pułapka to zapomnienie o zgodności cechy: Es bonito jest poprawne dla rodzaju męskiego i domyślnego, ale o rzeczy rodzaju żeńskiego potrzeba Es bonita, nie Es bonito.', semantic: 'explanation' }),
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
