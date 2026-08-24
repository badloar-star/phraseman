import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';
import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

function markBody(body: LocalizedSource): LocalizedIntroRunsSource {
  const terms = ['note', 'now', 'not', 'no', 'n', 'o', 't'];
  const byLocale = Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale] ?? '';
    const runs: LearningV2IntroTextRunV1[] = [];
    let cursor = 0;
    const boundary = (start: number, term: string): boolean => {
      const word = /\p{L}/u;
      return !word.test(text[start - 1] ?? '') && !word.test(text[start + term.length] ?? '');
    };
    while (cursor < text.length) {
      const term = terms.find((candidate) =>
        text.slice(cursor, cursor + candidate.length).toLocaleLowerCase('en') === candidate &&
        boundary(cursor, candidate),
      );
      if (term) {
        runs.push({
          text: text.slice(cursor, cursor + term.length),
          semantic: term === 'not' ? 'targetCorrect' : 'targetWrong',
        });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (
        end < text.length &&
        !terms.some((candidate) => text.startsWith(candidate, end) && boundary(end, candidate))
      ) end += 1;
      runs.push({ text: text.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, runs];
  }));
  return byLocale as unknown as LocalizedIntroRunsSource;
}

export const EPISODE_01_SESSION_02_WORD_FIRST_TITLE = L({
  ru: 'Я не', uk: 'Я не', es: 'Yo no', 'pt-BR': 'Eu não',
  vi: 'Tôi không', id: 'Saya tidak', tr: 'Ben değilim', pl: 'Ja nie',
});

export const EPISODE_01_SESSION_02_WORD_FIRST_SUMMARY = L({
  ru: 'Короткое not отменяет знакомый признак или место.',
  uk: 'Коротке not заперечує знайому ознаку або місце.',
  es: 'La palabra breve not niega una cualidad o un lugar conocido.',
  'pt-BR': 'A palavra curta not nega uma característica ou um lugar conhecido.',
  vi: 'Từ ngắn not phủ định một đặc điểm hoặc nơi chốn đã biết.',
  id: 'Kata pendek not menyangkal keadaan atau tempat yang sudah dikenal.',
  tr: 'Kısa not sözcüğü bilinen bir özelliği ya da yeri olumsuz yapar.',
  pl: 'Krótkie not zaprzecza znanej cesze albo miejscu.',
});

export const EPISODE_01_SESSION_02_WORD_FIRST_GOAL = L({
  ru: 'Узнавать, понимать и точно писать not перед отрицательной фразой.',
  uk: 'Упізнавати, розуміти й точно писати not перед заперечним висловом.',
  es: 'Reconocer, comprender y escribir not antes de usar una frase negativa.',
  'pt-BR': 'Reconhecer, compreender e escrever not antes de usar uma frase negativa.',
  vi: 'Nhận ra, hiểu và viết đúng not trước khi dùng câu phủ định.',
  id: 'Mengenali, memahami, dan menulis not dengan tepat sebelum memakai kalimat negatif.',
  tr: 'Olumsuz bir ifade kurmadan önce not sözcüğünü tanımak, anlamak ve doğru yazmak.',
  pl: 'Rozpoznawać, rozumieć i poprawnie zapisywać not przed użyciem zdania przeczącego.',
});

const conceptBody = L({
  ru: 'Not означает «не» и отменяет то, что человек сообщает о себе. Это отдельное короткое слово, а не часть соседнего слова. Английское no чаще отвечает «нет», поэтому оно не занимает то же место. Now означает «сейчас» и лишь похоже начинается. Сначала научитесь точно узнавать именно not по смыслу и по форме.',
  uk: 'Not означає «не» й заперечує те, що людина повідомляє про себе. Це окреме коротке слово, а не частина сусіднього слова. Англійське no частіше відповідає «ні», тому воно не виконує тієї самої роботи. Now означає «зараз» і лише схоже починається. Спершу навчіться впізнавати саме not за змістом і формою.',
  es: 'Not expresa la negación que en español suele aparecer como «no» delante de una idea. En inglés es una palabra independiente y tiene un lugar propio dentro de la frase. La palabra inglesa no suele funcionar como una respuesta completa, así que no sustituye automáticamente a not. Now significa «ahora» y solo comparte el comienzo de la escritura. Conviene reconocer not primero por su significado y por su forma exacta.',
  'pt-BR': 'Not expressa a negação que em português costuma aparecer como «não» antes de uma ideia. Em inglês, ela é uma palavra independente e ocupa um lugar próprio na frase. A palavra inglesa no costuma funcionar como uma resposta completa, por isso não substitui not automaticamente. Now significa «agora» e apenas começa de modo parecido. Primeiro reconheça not pelo sentido e pela forma exata.',
  vi: 'Not mang nghĩa phủ định gần với “không” trong tiếng Việt. Trong tiếng Anh, đây là một từ độc lập và có vị trí riêng trong câu. No thường được dùng như một câu trả lời “không”, nên không thể tự động thay cho not. Now nghĩa là “bây giờ” và chỉ có phần đầu nhìn giống nhau. Trước hết hãy nhận ra đúng not bằng cả nghĩa lẫn hình thức.',
  id: 'Not membawa makna penyangkalan yang dalam bahasa Indonesia sering dinyatakan dengan “tidak”. Dalam bahasa Inggris, kata ini berdiri sendiri dan mempunyai tempat tertentu di dalam kalimat. No biasanya dipakai sebagai jawaban “tidak”, sehingga tidak otomatis menggantikan not. Now berarti “sekarang” dan hanya memiliki awal tulisan yang mirip. Kenali dahulu not melalui arti dan bentuknya yang tepat.',
  tr: 'Not, Türkçedeki “değil” ya da “-me/-ma” anlamına yaklaşan bir olumsuzluk sözcüğüdür. İngilizcede ayrı yazılır ve cümle içinde kendi yeri vardır. No çoğunlukla tek başına “hayır” cevabını verir, bu yüzden not yerine geçmez. Now “şimdi” demektir ve yalnızca başlangıcı benzer görünür. Önce not sözcüğünü hem anlamından hem de tam biçiminden tanıyın.',
  pl: 'Not wyraża przeczenie podobne do polskiego „nie”. W angielskim jest osobnym słowem i zajmuje własne miejsce w zdaniu. Angielskie no najczęściej jest samodzielną odpowiedzią „nie”, więc nie zastępuje automatycznie not. Now znaczy „teraz” i tylko podobnie się zaczyna. Najpierw rozpoznawaj not po znaczeniu oraz dokładnym zapisie.',
});

const formulaBody = L({
  ru: 'Not состоит из трёх букв: n, затем o, затем t. Первые две буквы образуют знакомое no, поэтому взгляд легко останавливается слишком рано. Конечная t не украшение: без неё получится другое слово. Лишняя e тоже меняет слово и превращает not в note. Поэтому проверяйте всю короткую форму слева направо: n-o-t.',
  uk: 'Not складається з трьох літер: n, потім o, потім t. Перші дві літери утворюють знайоме no, тому погляд легко зупиняється зарано. Кінцева t не є прикрасою: без неї виходить інше слово. Саме t зберігає потрібне значення заперечення. Зайва e також змінює слово й перетворює not на note. Тому перевіряйте всю коротку форму зліва направо: n-o-t.',
  es: 'Not se escribe con tres letras: n, después o y al final t. Las dos primeras forman no, por eso es fácil dejar de leer demasiado pronto. La t final no es decorativa: sin ella queda otra palabra. Una e adicional también cambia el resultado y convierte not en note. Recorre siempre la forma completa de izquierda a derecha: n-o-t.',
  'pt-BR': 'Not é escrita com três letras: n, depois o e por fim t. As duas primeiras formam no, então é fácil parar de ler cedo demais. O t final não é um detalhe: sem ele sobra outra palavra. Um e adicional também muda o resultado e transforma not em note. Confira sempre a forma inteira da esquerda para a direita: n-o-t.',
  vi: 'Not được viết bằng ba chữ cái: n, rồi o, cuối cùng là t. Hai chữ đầu tạo thành no, vì vậy mắt rất dễ dừng lại quá sớm. Chữ t cuối không phải chi tiết thừa; bỏ nó đi sẽ thành một từ khác. Chính chữ t giữ lại nghĩa phủ định cần thiết. Thêm e cũng đổi từ và biến not thành note. Vì vậy, hãy kiểm tra trọn dạng từ từ trái sang phải: n-o-t.',
  id: 'Not ditulis dengan tiga huruf: n, lalu o, dan terakhir t. Dua huruf pertama membentuk no, sehingga mata mudah berhenti terlalu cepat. Huruf t terakhir bukan hiasan; tanpa huruf itu terbentuk kata lain. Tambahan e juga mengubah kata dan membuat not menjadi note. Periksa selalu seluruh bentuk dari kiri ke kanan: n-o-t.',
  tr: 'Not üç harfle yazılır: önce n, sonra o, en sonda t. İlk iki harf no sözcüğünü oluşturduğu için göz kolayca erken durabilir. Sondaki t bir süs değildir; çıkarılırsa başka bir sözcük kalır. Fazladan e de sözcüğü değiştirir ve not biçimini note yapar. Kısa biçimin tamamını soldan sağa denetleyin: n-o-t.',
  pl: 'Not zapisuje się trzema literami: n, potem o, a na końcu t. Pierwsze dwie tworzą no, dlatego wzrok łatwo zatrzymuje się zbyt wcześnie. Końcowe t nie jest ozdobą; bez niego powstaje inne słowo. Dodatkowe e także zmienia wyraz i zamienia not w note. Zawsze sprawdzaj całą formę od lewej do prawej: n-o-t.',
});

const trapBody = L({
  ru: 'В быстрой речи конечная t в not может прозвучать очень коротко. Из-за этого слово легко спутать с no, если слушать только начало. У now другой конец — слышится движение к звуку «у». В note гласная тянется дольше, а конечная e не произносится отдельно. Чтобы узнать not, ловите короткую гласную и резкое завершение на t.',
  uk: 'У швидкому мовленні кінцева t у not може прозвучати дуже коротко. Через це слово легко сплутати з no, якщо слухати лише початок. У now інше закінчення — чується рух до звука «у». У note голосний тягнеться довше, а кінцева e окремо не вимовляється. Щоб упізнати not, ловіть короткий голосний і різке завершення на t.',
  es: 'En el habla rápida, la t final de not puede sonar muy breve. Por eso se confunde con no si solo prestas atención al comienzo. Now termina con un deslizamiento parecido a «au», no con una t cerrada. En note la vocal es más larga y la e escrita no se pronuncia por separado. Para reconocer not, escucha una vocal breve y un cierre rápido en t.',
  'pt-BR': 'Na fala rápida, o t final de not pode soar muito curto. Por isso a palavra se confunde com no quando você escuta apenas o começo. Now termina com um movimento parecido com «au», não com um t fechado. Em note, a vogal é mais longa e o e escrito não é pronunciado separadamente. Para reconhecer not, procure uma vogal breve e um fechamento rápido em t.',
  vi: 'Khi nói nhanh, âm t cuối của not có thể bật ra rất ngắn. Vì thế người nghe dễ nhầm với no nếu chỉ chú ý phần đầu. Now kết thúc bằng một chuyển động nguyên âm khác chứ không khép lại bằng t. Trong note, nguyên âm dài hơn và e cuối không được đọc riêng. Muốn nhận ra not, hãy nghe nguyên âm ngắn cùng điểm dừng gọn ở t.',
  id: 'Dalam ucapan cepat, t terakhir pada not dapat terdengar sangat singkat. Karena itu, kata ini mudah tertukar dengan no jika hanya awalnya yang didengar. Now berakhir dengan luncuran vokal lain, bukan penutupan t. Pada note, vokalnya lebih panjang dan e tertulis tidak dibunyikan sendiri. Untuk mengenali not, dengarkan vokal pendek dan hentian cepat pada t.',
  tr: 'Hızlı konuşmada not sonundaki t çok kısa duyulabilir. Yalnızca başlangıca dikkat edilirse sözcük bu yüzden no ile karışır. Now başka bir ünlü kaymasıyla biter, kapalı bir t sesiyle değil. Note sözcüğünde ünlü daha uzundur ve yazıdaki e ayrı okunmaz. Not sözcüğünü tanımak için kısa ünlüyü ve t ile gelen keskin bitişi dinleyin.',
  pl: 'W szybkiej mowie końcowe t w not może być bardzo krótkie. Dlatego słowo łatwo pomylić z no, jeśli słucha się tylko początku. Now kończy się innym ruchem samogłoski, a nie zwarciem t. W note samogłoska jest dłuższa, a zapisane e nie brzmi osobno. Aby rozpoznać not, wychwyć krótką samogłoskę i szybkie zakończenie na t.',
});

export const EPISODE_01_SESSION_02_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = Object.freeze([
  {
    kind: 'concept',
    title: L({
      ru: 'Not означает «не»', uk: 'Not означає «не»', es: 'Not significa «no»',
      'pt-BR': 'Not significa «não»', vi: 'Not có nghĩa là “không”',
      id: 'Not berarti “tidak”', tr: 'Not “değil” anlamını verir', pl: 'Not znaczy „nie”',
    }),
    body: conceptBody,
    bodyRuns: markBody(conceptBody),
    question: {
      prompt: L({
        ru: 'Какое английское слово означает «не»?', uk: 'Яке англійське слово означає «не»?',
        es: '¿Qué palabra inglesa expresa «no»?', 'pt-BR': 'Qual palavra inglesa expressa «não»?',
        vi: 'Từ tiếng Anh nào có nghĩa là “không”?', id: 'Kata Inggris mana yang berarti “tidak”?',
        tr: 'Hangi İngilizce sözcük “değil” anlamını verir?', pl: 'Które angielskie słowo znaczy „nie”?',
      }),
      choices: [L({ ru: 'not', uk: 'not', es: 'not', 'pt-BR': 'not', vi: 'not', id: 'not', tr: 'not', pl: 'not' }), L({ ru: 'no', uk: 'no', es: 'no', 'pt-BR': 'no', vi: 'no', id: 'no', tr: 'no', pl: 'no' }), L({ ru: 'now', uk: 'now', es: 'now', 'pt-BR': 'now', vi: 'now', id: 'now', tr: 'now', pl: 'now' })],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Not — отдельное английское отрицание «не»; no и now имеют другое значение.',
        uk: 'Not — окреме англійське заперечення «не»; no та now мають інше значення.',
        es: 'Not es la negación inglesa; no y now tienen otra función y otro significado.',
        'pt-BR': 'Not é a negação inglesa; no e now têm outra função e outro significado.',
        vi: 'Not là từ phủ định tiếng Anh; no và now có nghĩa và chức năng khác.',
        id: 'Not adalah kata negasi Inggris; no dan now mempunyai arti serta fungsi lain.',
        tr: 'Not İngilizce olumsuzluk sözcüğüdür; no ve now başka anlam taşır.',
        pl: 'Not jest angielskim przeczeniem; no i now mają inne znaczenie i funkcję.',
      }),
    },
  },
  {
    kind: 'formula',
    title: L({
      ru: 'Три буквы: n-o-t', uk: 'Три літери: n-o-t', es: 'Tres letras: n-o-t',
      'pt-BR': 'Três letras: n-o-t', vi: 'Ba chữ cái: n-o-t', id: 'Tiga huruf: n-o-t',
      tr: 'Üç harf: n-o-t', pl: 'Trzy litery: n-o-t',
    }),
    body: formulaBody,
    bodyRuns: markBody(formulaBody),
    question: {
      prompt: L({
        ru: 'Какая форма написана полностью?', uk: 'Яка форма написана повністю?',
        es: '¿Qué forma está escrita completa?', 'pt-BR': 'Qual forma está escrita por completo?',
        vi: 'Dạng nào được viết đầy đủ?', id: 'Bentuk mana yang ditulis lengkap?',
        tr: 'Hangi biçim eksiksiz yazılmıştır?', pl: 'Która forma jest zapisana w całości?',
      }),
      choices: [L({ ru: 'not', uk: 'not', es: 'not', 'pt-BR': 'not', vi: 'not', id: 'not', tr: 'not', pl: 'not' }), L({ ru: 'no', uk: 'no', es: 'no', 'pt-BR': 'no', vi: 'no', id: 'no', tr: 'no', pl: 'no' }), L({ ru: 'note', uk: 'note', es: 'note', 'pt-BR': 'note', vi: 'note', id: 'note', tr: 'note', pl: 'note' })],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'Not заканчивается буквой t. No теряет эту букву, а note добавляет лишнюю e.',
        uk: 'Not закінчується літерою t. No втрачає її, а note додає зайву e.',
        es: 'Not termina en t. No pierde esa letra y note añade una e que cambia la palabra.',
        'pt-BR': 'Not termina em t. No perde essa letra e note acrescenta um e que muda a palavra.',
        vi: 'Not kết thúc bằng t. No thiếu chữ đó, còn note thêm e và trở thành từ khác.',
        id: 'Not berakhir dengan t. No kehilangan huruf itu, sedangkan note menambah e dan menjadi kata lain.',
        tr: 'Not t ile biter. No bu harfi kaybeder, note ise sözcüğü değiştiren bir e ekler.',
        pl: 'Not kończy się literą t. No jej nie ma, a note dodaje e i tworzy inne słowo.',
      }),
    },
  },
  {
    kind: 'trap',
    title: L({
      ru: 'Не теряйте конечную t', uk: 'Не губіть кінцеву t', es: 'No pierdas la t final',
      'pt-BR': 'Não perca o t final', vi: 'Đừng bỏ âm t cuối', id: 'Jangan hilangkan t terakhir',
      tr: 'Sondaki t sesini kaybetmeyin', pl: 'Nie gub końcowego t',
    }),
    body: trapBody,
    bodyRuns: markBody(trapBody),
    question: {
      prompt: L({
        ru: 'Какое слово вы услышали: /nɒt/?', uk: 'Яке слово ви почули: /nɒt/?',
        es: '¿Qué palabra oyes: /nɒt/?', 'pt-BR': 'Qual palavra você ouve: /nɒt/?',
        vi: 'Bạn nghe thấy từ nào: /nɒt/?', id: 'Kata mana yang terdengar: /nɒt/?',
        tr: 'Hangi sözcüğü duyuyorsunuz: /nɒt/?', pl: 'Które słowo słyszysz: /nɒt/?',
      }),
      choices: [L({ ru: 'not', uk: 'not', es: 'not', 'pt-BR': 'not', vi: 'not', id: 'not', tr: 'not', pl: 'not' }), L({ ru: 'now', uk: 'now', es: 'now', 'pt-BR': 'now', vi: 'now', id: 'now', tr: 'now', pl: 'now' }), L({ ru: 'note', uk: 'note', es: 'note', 'pt-BR': 'note', vi: 'note', id: 'note', tr: 'note', pl: 'note' })],
      correctChoiceIndex: 0,
      explanation: L({
        ru: 'В not слышна короткая гласная и конечная t; now и note звучат иначе.',
        uk: 'У not чути короткий голосний і кінцеву t; now та note звучать інакше.',
        es: 'Not lleva una vocal breve y una t final; now y note tienen otros sonidos.',
        'pt-BR': 'Not tem uma vogal breve e t final; now e note usam outros sons.',
        vi: 'Not có nguyên âm ngắn và âm t cuối; now và note phát âm khác.',
        id: 'Not memakai vokal pendek dan t terakhir; now dan note berbunyi berbeda.',
        tr: 'Not kısa ünlü ve son t taşır; now ile note farklı duyulur.',
        pl: 'Not ma krótką samogłoskę i końcowe t; now i note brzmią inaczej.',
      }),
    },
  },
]);
