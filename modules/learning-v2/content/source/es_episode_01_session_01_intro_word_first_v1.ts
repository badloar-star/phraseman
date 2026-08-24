import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';
import type {
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, word-first перепись): копирует
// структуру episode_01_session_01_intro_word_first_v1.ts (английский курс,
// первый готовый образец паттерна) — три страницы concept/formula/trap,
// каждая объясняет одно слово из ES_EPISODE_01_SESSION_01_VOCABULARY_V1
// (es, soy, fácil), четвёртое слово (verdad) получает разбор только через
// word-first контакты, без отдельной интро-страницы — так же, как в
// английском эталоне интро не покрывает 'ready'.
//
// зачем 'es' дублирует 'en', а pt-BR/vi/id/tr/pl — НЕТ (исправление
// 2026-08-24 после провала machine quality gate intro_locale_not_independent):
// 'es' — целевой язык курса, не локаль объяснения, поэтому в нём стоит
// полноценный английский текст (тот же принцип, что и во всём остальном
// испанском контуре). А вот pt-BR/vi/id/tr/pl — РЕАЛЬНЫЕ локали объяснения:
// каждая написана независимо на своём языке, не скопирована с английского.
// Первая версия этого файла ошибочно продублировала английский текст во все
// пять — машинная проверка качества поймала это дословным совпадением с 'es'.
const L = (value: LocalizedSource): LocalizedSource => value;
const R = (
  ...runs: readonly LearningV2IntroTextRunV1[]
): readonly LearningV2IntroTextRunV1[] => runs;

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_TITLE = L({
  ru: 'Это легко',
  uk: 'Це легко',
  es: 'It is easy',
  'pt-BR': 'É fácil',
  vi: 'Điều này dễ',
  id: 'Ini mudah',
  tr: 'Bu kolay',
  pl: 'To jest łatwe',
});

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_SUMMARY = L({
  ru: 'Три коротких испанских слова сначала становятся понятными по отдельности, а затем соединяются в оценку.',
  uk: 'Три коротких іспанських слова спершу стають зрозумілими окремо, а потім з’єднуються в оцінку.',
  es: 'Three short Spanish words become clear separately before joining into a verdict.',
  'pt-BR': 'Três palavras curtas do espanhol primeiro ficam claras separadamente, depois se juntam num veredito.',
  vi: 'Ba từ tiếng Tây Ban Nha ngắn trước tiên trở nên rõ ràng riêng lẻ, sau đó ghép thành một nhận định.',
  id: 'Tiga kata pendek dalam bahasa Spanyol dipahami satu per satu dulu, baru kemudian digabungkan menjadi sebuah penilaian.',
  tr: 'Üç kısa İspanyolca sözcük önce ayrı ayrı anlaşılır, sonra bir yargıda birleşir.',
  pl: 'Trzy krótkie hiszpańskie słowa najpierw stają się jasne osobno, a potem łączą się w osąd.',
});

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_GOAL = L({
  ru: 'Узнать на слух, понять и точно написать es, soy и fácil, а затем правильно соединить их.',
  uk: 'Упізнати на слух, зрозуміти й точно написати es, soy та fácil, а потім правильно їх поєднати.',
  es: 'Recognize, understand, and write es, soy, and fácil before combining them correctly.',
  'pt-BR': 'Reconhecer de ouvido, entender e escrever corretamente es, soy e fácil, depois combiná-los certo.',
  vi: 'Nghe ra, hiểu và viết đúng es, soy và fácil, sau đó ghép chúng chính xác.',
  id: 'Mengenali dari suara, memahami, dan menulis es, soy, dan fácil dengan tepat, lalu menggabungkannya dengan benar.',
  tr: 'Es, soy ve fácil sözcüklerini duyup tanımak, anlamak ve doğru yazmak; ardından doğru biçimde birleştirmek.',
  pl: 'Rozpoznać ze słuchu, zrozumieć i poprawnie zapisać es, soy oraz fácil, a potem właściwie je połączyć.',
});

const CONCEPT_BODY = L({
  ru: 'Когда что-то оценивают — легко это, дорого или правда, — испанский показывает связь отдельным словом es. Оно значит «есть, является». По-русски мы обходимся без такого слова: «это легко». По-испански без es фраза рассыпается на голое fácil, обрывок без смысла. Надёжный ориентир прост: любая безличная оценка держится на es.',
  uk: 'Коли щось оцінюють — легко це, дорого чи правда, — іспанська показує зв’язок окремим словом es. Воно означає «є». Українською ми обходимось без такого слова: «це легко». Іспанською без es фраза розсипається на голе fácil, уламок без сенсу. Надійний орієнтир простий: будь-яка безособова оцінка тримається на es.',
  es: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: es carries every verdict, whether about ease, price, or truth. Without es, a phrase collapses into a bare adjective with no verdict left. The safe anchor is simple: any impersonal verdict rests on es.',
  'pt-BR': 'O português também usa é numa frase como "isso é fácil" — a ligação já é familiar. O espanhol funciona do mesmo jeito: es carrega qualquer veredito, seja sobre facilidade, preço ou verdade. Sem es, a frase desmorona num adjetivo solto, sem veredito nenhum. A referência segura é simples: todo veredito impessoal se apoia em es.',
  vi: 'Tiếng Việt nói "điều này dễ" mà không cần một động từ nối như vậy — các từ đã đủ nghĩa. Tiếng Tây Ban Nha thì khác: es mang mọi nhận định, dù là về sự dễ dàng, giá cả hay sự thật. Thiếu es, câu chỉ còn lại một tính từ trơ trọi, không còn nhận định nào cả. Điểm tựa chắc chắn rất đơn giản: mọi nhận định vô nhân xưng đều dựa vào es.',
  id: 'Bahasa Indonesia mengatakan "ini mudah" tanpa kata kerja penghubung seperti itu — kata-katanya saja sudah cukup. Bahasa Spanyol berbeda: es membawa setiap penilaian, entah tentang kemudahan, harga, atau kebenaran. Tanpa es, kalimat runtuh menjadi kata sifat telanjang tanpa penilaian yang tersisa. Patokannya sederhana: setiap penilaian impersonal bersandar pada es.',
  tr: 'Türkçede "bu kolay" derken böyle bir bağlayıcı fiile gerek duyulmaz — sözcükler tek başına yeterlidir. İspanyolca farklı çalışır: es her yargıyı taşır — kolaylık, fiyat ya da doğruluk hakkında olsun. Es olmadan cümle çıplak bir sıfata dönüşür, geriye hiçbir yargı kalmaz. Güvenilir dayanak basittir: her kişisiz yargı es üzerine kurulur.',
  pl: 'Po polsku mówimy „to jest łatwe” z czasownikiem „jest”, więc sama idea łącznika nie jest obca. Różnica polega na tym, że hiszpański nigdy nie pozwala go pominąć: es niesie każdy osąd, czy chodzi o łatwość, cenę czy prawdę, i musi tam stać zawsze, nawet gdy kontekst wydaje się oczywisty. Bez es zdanie rozpada się na goły przymiotnik — zostaje samo fácil, urwany fragment bez osądu, jakby ktoś zaczął zdanie i nie dokończył. Dlatego pewny punkt odniesienia jest prosty: każdy bezosobowy osąd w hiszpańskim opiera się na es, niezależnie od tego, co się ocenia.',
});

const FORMULA_BODY = L({
  ru: 'Слово soy не описывает признак само по себе. Это короткая связка для случая, когда говорящий называет себя. Испанец не говорит «yo soy rápido» в обычной речи — он говорит просто Soy rápido, и хвост soy уже сказал «я». Держите роли раздельно: soy соединяет говорящего с признаком; es делает то же самое, но для «оно/он/она». На слух soy звучит с дифтонгом /oi/, а es — с одним коротким гласным /e/.',
  uk: 'Слово soy саме по собі не описує ознаку. Це коротка зв’язка для випадку, коли мовець називає себе. Іспанець не каже «yo soy rápido» у звичайній мові — він каже просто Soy rápido, і хвіст soy вже сказав «я». Тримайте ролі окремо: soy з’єднує мовця з ознакою; es робить те саме, але для «воно/він/вона». На слух soy звучить з дифтонгом /oi/, а es — з одним коротким голосним /e/.',
  es: 'Soy does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of soy already says "I". Keep the two roles apart: soy links the speaker to a quality; es does the same job, but for "it/he/she". By ear, soy has the diphthong /oi/, while es has one short vowel /e/.',
  'pt-BR': 'A palavra soy não descreve uma qualidade sozinha. É a ligação curta usada quando quem fala se nomeia. Um falante de espanhol não diz "yo soy rápido" na fala comum — diz só Soy rápido, e a terminação de soy já diz "eu". Mantenha os dois papéis separados: soy liga quem fala a uma qualidade; es faz o mesmo, mas para "isso/ele/ela". No ouvido, soy tem o ditongo /oi/, enquanto es tem uma única vogal curta /e/.',
  vi: 'Từ soy không tự mô tả một đặc điểm. Đây là từ nối ngắn dùng khi người nói tự xưng danh. Người nói tiếng Tây Ban Nha không nói "yo soy rápido" trong lời nói thường ngày — chỉ nói Soy rápido, và đuôi của soy đã nói "tôi" rồi. Hãy tách rõ hai vai trò: soy nối người nói với một đặc điểm; es làm việc tương tự nhưng cho "nó/anh ấy/cô ấy". Về mặt âm thanh, soy có nguyên âm đôi /oi/, còn es chỉ có một nguyên âm ngắn /e/.',
  id: 'Kata soy tidak menjelaskan sifat dengan sendirinya. Ini adalah kata penghubung pendek yang dipakai ketika penutur menyebut dirinya sendiri. Penutur bahasa Spanyol tidak mengatakan "yo soy rápido" dalam percakapan sehari-hari — cukup Soy rápido, dan akhiran soy sudah menyatakan "saya". Pisahkan dua perannya: soy menghubungkan penutur dengan sebuah sifat; es melakukan hal yang sama, tetapi untuk "itu/dia laki-laki/dia perempuan". Secara bunyi, soy memiliki diftong /oi/, sedangkan es hanya memiliki satu vokal pendek /e/.',
  tr: 'Soy sözcüğü tek başına bir niteliği anlatmaz. Konuşan kişi kendisini adlandırırken kullanılan kısa bağlayıcı sözcüktür. İspanyolca konuşan biri günlük dilde "yo soy rápido" demez — sadece Soy rápido der, çünkü soy sözcüğünün sonu zaten "ben" anlamını taşır. İki görevi ayrı tutun: soy konuşanı bir nitelikle bağlar; es aynı işi "o/o (erkek)/o (kadın)" için yapar. Kulakla soy /oi/ diftongunu taşır, es ise tek kısa /e/ sesine sahiptir.',
  pl: 'Słowo soy samo w sobie nie opisuje cechy. To krótki łącznik używany, gdy mówiący nazywa samego siebie. Osoba mówiąca po hiszpańsku nie powie „yo soy rápido” w codziennej mowie — powie po prostu Soy rápido, a końcówka soy już mówi „ja”. Rozdziel te dwie role: soy łączy mówiącego z cechą; es robi to samo, ale dla „ono/on/ona”. Na słuch soy ma dyftong /oi/, a es ma tylko jedną krótką samogłoskę /e/.',
});

const TRAP_BODY = L({
  ru: 'Слово fácil означает «лёгкий» и не меняется по роду: и про задачу, и про язык, и про решение говорят одинаково fácil. Оно ударено на первом слоге — FÁ-cil, с заметным á. Рядом по звучанию оказывается difícil: похожая форма, но ударение падает на другой слог и значение прямо противоположное — «трудный». Facilidad тоже похоже, но это существительное «лёгкость», предмет, а не признак вещи. Поэтому одного знакомого звучания недостаточно: для «лёгкий» нужна точная форма fácil.',
  uk: 'Слово fácil означає «легкий» і не змінюється за родом: і про завдання, і про мову, і про рішення кажуть однаково fácil. Воно наголошене на першому складі — FÁ-cil, з помітним á. Поруч за звучанням опиняється difícil: схожа форма, але наголос падає на інший склад, а значення пряме протилежне — «важкий». Facilidad теж схоже, але це іменник «легкість», предмет, а не ознака речі. Тому знайомого звучання недостатньо: для «легкий» потрібна точна форма fácil.',
  es: 'Fácil means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, fácil. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is difícil: a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". Facilidad also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form fácil.',
  'pt-BR': 'A palavra fácil significa "fácil" e não muda de gênero: uma tarefa, um idioma ou uma decisão são todos descritos do mesmo jeito, fácil. É acentuada na primeira sílaba — FÁ-cil, com um á bem marcado. Por perto no som está difícil: uma forma parecida, mas o acento cai numa sílaba diferente e o significado é o oposto exato — "difícil". Facilidad também parece semelhante, mas é o substantivo "facilidade", uma coisa, não a qualidade de algo. Por isso um som familiar não basta: "fácil" precisa da forma exata fácil.',
  vi: 'Từ fácil nghĩa là "dễ" và không bao giờ đổi theo giống: một công việc, một ngôn ngữ hay một quyết định đều được mô tả giống nhau, fácil. Từ này được nhấn ở âm tiết đầu — FÁ-cil, với âm á rõ ràng. Gần giống về âm thanh là difícil: một dạng tương tự, nhưng trọng âm rơi vào âm tiết khác và nghĩa thì hoàn toàn ngược lại — "khó". Facilidad cũng trông tương tự, nhưng đó là danh từ "sự dễ dàng", một sự vật, không phải đặc tính của thứ gì đó. Vì vậy âm thanh quen thuộc thôi chưa đủ: "dễ" cần đúng dạng fácil.',
  id: 'Kata fácil berarti "mudah" dan tidak pernah berubah menurut gender: sebuah tugas, sebuah bahasa, atau sebuah keputusan semuanya dijelaskan dengan cara yang sama, fácil. Kata ini ditekankan pada suku kata pertama — FÁ-cil, dengan á yang jelas. Mirip dalam bunyi adalah difícil: bentuk yang serupa, tetapi tekanannya jatuh pada suku kata berbeda dan artinya justru kebalikannya — "sulit". Facilidad juga tampak serupa, tetapi itu adalah kata benda "kemudahan", sebuah benda, bukan sifat dari sesuatu. Jadi bunyi yang familiar saja tidak cukup: "mudah" memerlukan bentuk yang tepat, fácil.',
  tr: 'Fácil sözcüğü "kolay" demektir ve cinsiyete göre asla değişmez: bir görev, bir dil ya da bir karar hepsi aynı biçimde, fácil olarak anlatılır. İlk hecede vurgulanır — FÁ-cil, belirgin bir á ile. Sese yakın olan difícil: benzer bir biçim, ama vurgu farklı bir heceye düşer ve anlam tam tersidir — "zor". Facilidad de benzer görünür, ama bu "kolaylık" anlamına gelen bir isimdir, bir şeyin niteliği değil, bir şeydir. Bu yüzden tanıdık bir ses yeterli değildir: "kolay" için tam biçim fácil gerekir.',
  pl: 'Słowo fácil znaczy „łatwy” i nigdy nie zmienia się przez rodzaj: zadanie, język czy decyzja — wszystko opisuje się tak samo, fácil. Akcent pada na pierwszą sylabę — FÁ-cil, z wyraźnym á. Blisko brzmieniowo jest difícil: podobna forma, ale akcent pada na inną sylabę, a znaczenie jest dokładnie przeciwne — „trudny”. Facilidad też wygląda podobnie, ale to rzeczownik „łatwość”, rzecz, a nie cecha czegoś. Dlatego samo znajome brzmienie nie wystarczy: „łatwy” wymaga dokładnej formy fácil.',
});

export const ES_EPISODE_01_SESSION_01_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = [
  {
    kind: 'concept',
    title: L({
      ru: 'Es открывает любую оценку',
      uk: 'Es відкриває будь-яку оцінку',
      es: 'Es opens every verdict',
      'pt-BR': 'Es abre qualquer veredito',
      vi: 'Es mở đầu mọi nhận định',
      id: 'Es membuka setiap penilaian',
      tr: 'Es her yargıyı açar',
      pl: 'Es otwiera każdy osąd',
    }),
    body: CONCEPT_BODY,
    bodyRuns: {
      ru: R({ text: 'Когда что-то оценивают — легко это, дорого или правда, — испанский показывает связь отдельным словом ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '. Оно значит «есть, является». По-русски мы обходимся без такого слова: «это легко». По-испански без ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' фраза рассыпается на голое ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', обрывок без смысла. Надёжный ориентир прост: любая безличная оценка держится на ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Коли щось оцінюють — легко це, дорого чи правда, — іспанська показує зв’язок окремим словом ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '. Воно означає «є». Українською ми обходимось без такого слова: «це легко». Іспанською без ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' фраза розсипається на голе ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', уламок без сенсу. Надійний орієнтир простий: будь-яка безособова оцінка тримається на ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'Russian and Ukrainian usually drop the linking verb in a verdict like "this is easy" — the words alone are enough. Spanish never drops it: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' carries every verdict, whether about ease, price, or truth. Without ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', a phrase collapses into a bare ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' with no verdict left. The safe anchor is simple: any impersonal verdict rests on ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'O português também usa é numa frase como "isso é fácil" — a ligação já é familiar. O espanhol funciona do mesmo jeito: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' carrega qualquer veredito, seja sobre facilidade, preço ou verdade. Sem ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', a frase desmorona num ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' solto, sem veredito nenhum. A referência segura é simples: todo veredito impessoal se apoia em ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Tiếng Việt nói "điều này dễ" mà không cần một động từ nối như vậy — các từ đã đủ nghĩa. Tiếng Tây Ban Nha thì khác: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' mang mọi nhận định, dù là về sự dễ dàng, giá cả hay sự thật. Thiếu ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', câu chỉ còn lại một ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' trơ trọi, không còn nhận định nào cả. Điểm tựa chắc chắn rất đơn giản: mọi nhận định vô nhân xưng đều dựa vào ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Bahasa Indonesia mengatakan "ini mudah" tanpa kata kerja penghubung seperti itu — kata-katanya saja sudah cukup. Bahasa Spanyol berbeda: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' membawa setiap penilaian, entah tentang kemudahan, harga, atau kebenaran. Tanpa ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ', kalimat runtuh menjadi ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' telanjang tanpa penilaian yang tersisa. Patokannya sederhana: setiap penilaian impersonal bersandar pada ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Türkçede "bu kolay" derken böyle bir bağlayıcı fiile gerek duyulmaz — sözcükler tek başına yeterlidir. İspanyolca farklı çalışır: ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' her yargıyı taşır — kolaylık, fiyat ya da doğruluk hakkında olsun. ', semantic: 'explanation' }, { text: 'Es', semantic: 'targetCorrect' }, { text: ' olmadan cümle çıplak bir ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ' sıfatına dönüşür, geriye hiçbir yargı kalmaz. Güvenilir dayanak basittir: her kişisiz yargı ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' üzerine kurulur.', semantic: 'explanation' }),
      pl: R({ text: 'Po polsku mówimy „to jest łatwe” z czasownikiem „jest” — to podobne do hiszpańskiego. ', semantic: 'explanation' }, { text: 'Es', semantic: 'targetCorrect' }, { text: ' niesie każdy osąd, czy chodzi o łatwość, cenę czy prawdę. Bez ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' zdanie rozpada się na goły ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetWrong' }, { text: ', bez żadnego osądu. Pewny punkt odniesienia jest prosty: każdy bezosobowy osąd opiera się na ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Как по-испански сказать «есть, является» в оценке?',
        uk: 'Як іспанською сказати «є» в оцінці?',
        es: 'How do you say "is" in a Spanish verdict?',
        'pt-BR': 'Como se diz "é" num veredito em espanhol?',
        vi: 'Làm sao để nói "là" trong một nhận định tiếng Tây Ban Nha?',
        id: 'Bagaimana mengatakan "adalah" dalam sebuah penilaian bahasa Spanyol?',
        tr: 'İspanyolca bir yargıda "-dır" nasıl söylenir?',
        pl: 'Jak po hiszpańsku powiedzieć „jest” w osądzie?',
      }),
      choices: [
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
        L({ ru: 'ser', uk: 'ser', es: 'ser', 'pt-BR': 'ser', vi: 'ser', id: 'ser', tr: 'ser', pl: 'ser' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Es открывает безличную оценку. Soy — про себя, а ser — начальная форма, в готовой фразе не стоит.',
        uk: 'Es відкриває безособову оцінку. Soy — про себе, а ser — початкова форма, у готовій фразі не стоїть.',
        es: 'Es opens an impersonal verdict. Soy is about yourself, and ser is the base form, which never stands alone in a finished sentence.',
        'pt-BR': 'Es abre um veredito impessoal. Soy é sobre você mesmo, e ser é a forma base, que nunca aparece sozinha numa frase pronta.',
        vi: 'Es mở đầu một nhận định vô nhân xưng. Soy là nói về bản thân, còn ser là dạng gốc, không bao giờ đứng một mình trong câu hoàn chỉnh.',
        id: 'Es membuka penilaian impersonal. Soy tentang diri sendiri, dan ser adalah bentuk dasar yang tidak pernah berdiri sendiri dalam kalimat jadi.',
        tr: 'Es kişisiz bir yargı açar. Soy kendiniz hakkındadır, ser ise tamamlanmış bir cümlede asla tek başına yer almayan temel biçimdir.',
        pl: 'Es otwiera bezosobowy osąd. Soy dotyczy ciebie samego, a ser to forma podstawowa, która nigdy nie stoi sama w gotowym zdaniu.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Soy — связка для себя',
      uk: 'Soy — зв’язка для себе',
      es: 'Soy links the speaker',
      'pt-BR': 'Soy liga quem fala',
      vi: 'Soy nối người nói',
      id: 'Soy menghubungkan penutur',
      tr: 'Soy konuşanı bağlar',
      pl: 'Soy łączy mówiącego',
    }),
    body: FORMULA_BODY,
    bodyRuns: {
      ru: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' не описывает признак само по себе. Это короткая связка для случая, когда говорящий называет себя. Испанец не говорит «yo soy rápido» в обычной речи — он говорит просто Soy rápido, и хвост ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' уже сказал «я». Держите роли раздельно: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' соединяет говорящего с признаком; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' делает то же самое, но для «оно/он/она». На слух ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' звучит с дифтонгом /oi/, а ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — с одним коротким гласным /e/.', semantic: 'explanation' }),
      uk: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' саме по собі не описує ознаку. Це коротка зв’язка для випадку, коли мовець називає себе. Іспанець не каже «yo soy rápido» у звичайній мові — він каже просто Soy rápido, і хвіст ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' вже сказав «я». Тримайте ролі окремо: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' з’єднує мовця з ознакою; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' робить те саме, але для «воно/він/вона». На слух ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' звучить з дифтонгом /oi/, а ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' — з одним коротким голосним /e/.', semantic: 'explanation' }),
      es: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' does not describe a quality by itself. It is the short linking word used when the speaker names themselves. A Spanish speaker does not say "yo soy rápido" in everyday speech — just Soy rápido, and the ending of ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' already says "I". Keep the two roles apart: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' links the speaker to a quality; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' does the same job, but for "it/he/she". By ear, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' has the diphthong /oi/, while ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' has one short vowel /e/.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A palavra ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' não descreve uma qualidade sozinha. É a ligação curta usada quando quem fala se nomeia. Um falante de espanhol não diz "yo soy rápido" na fala comum — diz só Soy rápido, e a terminação de ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' já diz "eu". Mantenha os dois papéis separados: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' liga quem fala a uma qualidade; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' faz o mesmo, mas para "isso/ele/ela". No ouvido, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' tem o ditongo /oi/, enquanto ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' tem uma única vogal curta /e/.', semantic: 'explanation' }),
      vi: R({ text: 'Từ ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' không tự mô tả một đặc điểm. Đây là từ nối ngắn dùng khi người nói tự xưng danh. Người nói tiếng Tây Ban Nha không nói "yo soy rápido" trong lời nói thường ngày — chỉ nói Soy rápido, và đuôi của ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' đã nói "tôi" rồi. Hãy tách rõ hai vai trò: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' nối người nói với một đặc điểm; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' làm việc tương tự nhưng cho "nó/anh ấy/cô ấy". Về mặt âm thanh, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' có nguyên âm đôi /oi/, còn ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' chỉ có một nguyên âm ngắn /e/.', semantic: 'explanation' }),
      id: R({ text: 'Kata ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' tidak menjelaskan sifat dengan sendirinya. Ini adalah kata penghubung pendek yang dipakai ketika penutur menyebut dirinya sendiri. Penutur bahasa Spanyol tidak mengatakan "yo soy rápido" dalam percakapan sehari-hari — cukup Soy rápido, dan akhiran ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' sudah menyatakan "saya". Pisahkan dua perannya: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' menghubungkan penutur dengan sebuah sifat; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' melakukan hal yang sama, tetapi untuk "itu/dia laki-laki/dia perempuan". Secara bunyi, ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' memiliki diftong /oi/, sedangkan ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' hanya memiliki satu vokal pendek /e/.', semantic: 'explanation' }),
      tr: R({ text: 'Soy', semantic: 'targetCorrect' }, { text: ' sözcüğü tek başına bir niteliği anlatmaz. Konuşan kişi kendisini adlandırırken kullanılan kısa bağlayıcı sözcüktür. İspanyolca konuşan biri günlük dilde "yo soy rápido" demez — sadece Soy rápido der, çünkü ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' sözcüğünün sonu zaten "ben" anlamını taşır. İki görevi ayrı tutun: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' konuşanı bir nitelikle bağlar; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' aynı işi "o/o (erkek)/o (kadın)" için yapar. Kulakla ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' /oi/ diftongunu taşır, ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' ise tek kısa /e/ sesine sahiptir.', semantic: 'explanation' }),
      pl: R({ text: 'Słowo ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' samo w sobie nie opisuje cechy. To krótki łącznik używany, gdy mówiący nazywa samego siebie. Osoba mówiąca po hiszpańsku nie powie „yo soy rápido” w codziennej mowie — powie po prostu Soy rápido, a końcówka ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' już mówi „ja”. Rozdziel te dwie role: ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' łączy mówiącego z cechą; ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' robi to samo, ale dla „ono/on/ona”. Na słuch ', semantic: 'explanation' }, { text: 'soy', semantic: 'targetCorrect' }, { text: ' ma dyftong /oi/, a ', semantic: 'explanation' }, { text: 'es', semantic: 'targetCorrect' }, { text: ' ma tylko jedną krótką samogłoskę /e/.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Говорящий называет признак самого себя. Какое слово нужно?',
        uk: 'Мовець називає ознаку самого себе. Яке слово потрібне?',
        es: 'The speaker names a quality about themselves. Which word is needed?',
        'pt-BR': 'Quem fala nomeia uma qualidade sobre si mesmo. Qual palavra é necessária?',
        vi: 'Người nói tự nêu một đặc điểm về bản thân. Cần từ nào?',
        id: 'Penutur menyebut sifat tentang dirinya sendiri. Kata mana yang diperlukan?',
        tr: 'Konuşan kişi kendisiyle ilgili bir niteliği adlandırıyor. Hangi kelime gerekli?',
        pl: 'Mówiący nazywa cechę samego siebie. Które słowo jest potrzebne?',
      }),
      choices: [
        L({ ru: 'soy', uk: 'soy', es: 'soy', 'pt-BR': 'soy', vi: 'soy', id: 'soy', tr: 'soy', pl: 'soy' }),
        L({ ru: 'es', uk: 'es', es: 'es', 'pt-BR': 'es', vi: 'es', id: 'es', tr: 'es', pl: 'es' }),
        L({ ru: 'son', uk: 'son', es: 'son', 'pt-BR': 'son', vi: 'son', id: 'son', tr: 'son', pl: 'son' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Soy — связка для говорящего. Es говорит про «оно/он/она», а son — про «они».',
        uk: 'Soy — зв’язка для мовця. Es говорить про «воно/він/вона», а son — про «вони».',
        es: 'Soy is the linking word for the speaker. Es talks about "it/he/she", and son talks about "they".',
        'pt-BR': 'Soy é a ligação para quem fala. Es fala de "isso/ele/ela", e son fala de "eles/elas".',
        vi: 'Soy là từ nối cho người nói. Es nói về "nó/anh ấy/cô ấy", còn son nói về "họ".',
        id: 'Soy adalah kata penghubung untuk penutur. Es berbicara tentang "itu/dia laki-laki/dia perempuan", dan son berbicara tentang "mereka".',
        tr: 'Soy konuşan için bağlayıcı sözcüktür. Es "o/o (erkek)/o (kadın)" hakkında, son ise "onlar" hakkında konuşur.',
        pl: 'Soy to łącznik dla mówiącego. Es mówi o „ono/on/ona”, a son mówi o „oni”.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Fácil не меняется по роду',
      uk: 'Fácil не змінюється за родом',
      es: 'Fácil never changes for gender',
      'pt-BR': 'Fácil nunca muda de gênero',
      vi: 'Fácil không bao giờ đổi theo giống',
      id: 'Fácil tidak pernah berubah menurut gender',
      tr: 'Fácil cinsiyete göre asla değişmez',
      pl: 'Fácil nigdy nie zmienia się przez rodzaj',
    }),
    body: TRAP_BODY,
    bodyRuns: {
      ru: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' означает «лёгкий» и не меняется по роду: и про задачу, и про язык, и про решение говорят одинаково ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. Оно ударено на первом слоге — FÁ-cil, с заметным á. Рядом по звучанию оказывается ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': похожая форма, но ударение падает на другой слог и значение прямо противоположное — «трудный». ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' тоже похоже, но это существительное «лёгкость», предмет, а не признак вещи. Поэтому одного знакомого звучания недостаточно: для «лёгкий» нужна точная форма ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      uk: R({ text: 'Слово ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' означає «легкий» і не змінюється за родом: і про завдання, і про мову, і про рішення кажуть однаково ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. Воно наголошене на першому складі — FÁ-cil, з помітним á. Поруч за звучанням опиняється ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': схожа форма, але наголос падає на інший склад, а значення пряме протилежне — «важкий». ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' теж схоже, але це іменник «легкість», предмет, а не ознака речі. Тому знайомого звучання недостатньо: для «легкий» потрібна точна форма ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      es: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' means "easy" and never changes for gender: a task, a language, or a decision are all described the same way, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. It is stressed on the first syllable — FÁ-cil, with a clear á. Close by in sound is ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': a similar form, but the stress falls on a different syllable and the meaning is the exact opposite — "hard". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' also looks similar, but it is the noun "ease", a thing, not a quality of something. So a familiar sound is not enough: "easy" needs the exact form ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      'pt-BR': R({ text: 'A palavra ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' significa "fácil" e não muda de gênero: uma tarefa, um idioma ou uma decisão são todos descritos do mesmo jeito, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. É acentuada na primeira sílaba — FÁ-cil, com um á bem marcado. Por perto no som está ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': uma forma parecida, mas o acento cai numa sílaba diferente e o significado é o oposto exato — "difícil". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' também parece semelhante, mas é o substantivo "facilidade", uma coisa, não a qualidade de algo. Por isso um som familiar não basta: "fácil" precisa da forma exata ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      vi: R({ text: 'Từ ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' nghĩa là "dễ" và không bao giờ đổi theo giống: một công việc, một ngôn ngữ hay một quyết định đều được mô tả giống nhau, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. Từ này được nhấn ở âm tiết đầu — FÁ-cil, với âm á rõ ràng. Gần giống về âm thanh là ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': một dạng tương tự, nhưng trọng âm rơi vào âm tiết khác và nghĩa thì hoàn toàn ngược lại — "khó". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' cũng trông tương tự, nhưng đó là danh từ "sự dễ dàng", một sự vật, không phải đặc tính của thứ gì đó. Vì vậy âm thanh quen thuộc thôi chưa đủ: "dễ" cần đúng dạng ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      id: R({ text: 'Kata ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' berarti "mudah" dan tidak pernah berubah menurut gender: sebuah tugas, sebuah bahasa, atau sebuah keputusan semuanya dijelaskan dengan cara yang sama, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. Kata ini ditekankan pada suku kata pertama — FÁ-cil, dengan á yang jelas. Mirip dalam bunyi adalah ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': bentuk yang serupa, tetapi tekanannya jatuh pada suku kata berbeda dan artinya justru kebalikannya — "sulit". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' juga tampak serupa, tetapi itu adalah kata benda "kemudahan", sebuah benda, bukan sifat dari sesuatu. Jadi bunyi yang familiar saja tidak cukup: "mudah" memerlukan bentuk yang tepat, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
      tr: R({ text: 'Fácil', semantic: 'targetCorrect' }, { text: ' sözcüğü "kolay" demektir ve cinsiyete göre asla değişmez: bir görev, bir dil ya da bir karar hepsi aynı biçimde, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' olarak anlatılır. İlk hecede vurgulanır — FÁ-cil, belirgin bir á ile. Sese yakın olan ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': benzer bir biçim, ama vurgu farklı bir heceye düşer ve anlam tam tersidir — "zor". ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' de benzer görünür, ama bu "kolaylık" anlamına gelen bir isimdir, bir şeyin niteliği değil, bir şeydir. Bu yüzden tanıdık bir ses yeterli değildir: "kolay" için tam biçim ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' gerekir.', semantic: 'explanation' }),
      pl: R({ text: 'Słowo ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: ' znaczy „łatwy” i nigdy nie zmienia się przez rodzaj: zadanie, język czy decyzja — wszystko opisuje się tak samo, ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '. Akcent pada na pierwszą sylabę — FÁ-cil, z wyraźnym á. Blisko brzmieniowo jest ', semantic: 'explanation' }, { text: 'difícil', semantic: 'targetWrong' }, { text: ': podobna forma, ale akcent pada na inną sylabę, a znaczenie jest dokładnie przeciwne — „trudny”. ', semantic: 'explanation' }, { text: 'Facilidad', semantic: 'targetWrong' }, { text: ' też wygląda podobnie, ale to rzeczownik „łatwość”, rzecz, a nie cecha czegoś. Dlatego samo znajome brzmienie nie wystarczy: „łatwy” wymaga dokładnej formy ', semantic: 'explanation' }, { text: 'fácil', semantic: 'targetCorrect' }, { text: '.', semantic: 'explanation' }),
    },
    question: {
      prompt: L({
        ru: 'Какое слово означает «лёгкий» и не меняется по роду?',
        uk: 'Яке слово означає «легкий» і не змінюється за родом?',
        es: 'Which word means "easy" and never changes for gender?',
        'pt-BR': 'Qual palavra significa "fácil" e nunca muda de gênero?',
        vi: 'Từ nào nghĩa là "dễ" và không bao giờ đổi theo giống?',
        id: 'Kata mana yang berarti "mudah" dan tidak pernah berubah menurut gender?',
        tr: 'Hangi kelime "kolay" anlamına gelir ve cinsiyete göre asla değişmez?',
        pl: 'Które słowo znaczy „łatwy” i nigdy nie zmienia się przez rodzaj?',
      }),
      choices: [
        L({ ru: 'fácil', uk: 'fácil', es: 'fácil', 'pt-BR': 'fácil', vi: 'fácil', id: 'fácil', tr: 'fácil', pl: 'fácil' }),
        L({ ru: 'difícil', uk: 'difícil', es: 'difícil', 'pt-BR': 'difícil', vi: 'difícil', id: 'difícil', tr: 'difícil', pl: 'difícil' }),
        L({ ru: 'facilidad', uk: 'facilidad', es: 'facilidad', 'pt-BR': 'facilidad', vi: 'facilidad', id: 'facilidad', tr: 'facilidad', pl: 'facilidad' }),
      ],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Fácil означает «лёгкий». Difícil — противоположность, «трудный». Facilidad — существительное «лёгкость».',
        uk: 'Fácil означає «легкий». Difícil — протилежність, «важкий». Facilidad — іменник «легкість».',
        es: 'Fácil means "easy". Difícil is the opposite, "hard". Facilidad is the noun "ease".',
        'pt-BR': 'Fácil significa "fácil". Difícil é o oposto, "difícil". Facilidad é o substantivo "facilidade".',
        vi: 'Fácil nghĩa là "dễ". Difícil là từ trái nghĩa, "khó". Facilidad là danh từ "sự dễ dàng".',
        id: 'Fácil berarti "mudah". Difícil adalah kebalikannya, "sulit". Facilidad adalah kata benda "kemudahan".',
        tr: 'Fácil "kolay" demektir. Difícil karşıtıdır, "zor". Facilidad "kolaylık" anlamına gelen bir isimdir.',
        pl: 'Fácil znaczy „łatwy”. Difícil to przeciwieństwo, „trudny”. Facilidad to rzeczownik „łatwość”.',
      }),
    },
  },
];
