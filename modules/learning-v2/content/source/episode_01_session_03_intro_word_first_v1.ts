import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';
import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const TARGETS = new Set(['happy', 'sad', 'tired', 'fine', 'i', 'am', 'not']);
const TERMS = [
  'tiered', 'happen', 'happy', 'heavy', 'tired', 'tried',
  'fine', 'find', 'five', 'said', 'sad', 'sat', 'not', 'am', 'i',
];

function markBody(body: LocalizedSource): LocalizedIntroRunsSource {
  return Object.fromEntries(LOCALES.map((locale) => {
    const text = body[locale] ?? '';
    const runs: LearningV2IntroTextRunV1[] = [];
    const letter = /\p{L}/u;
    const boundary = (start: number, length: number): boolean =>
      !letter.test(text[start - 1] ?? '') && !letter.test(text[start + length] ?? '');
    let cursor = 0;
    while (cursor < text.length) {
      const term = TERMS.find((candidate) =>
        text.slice(cursor, cursor + candidate.length).toLocaleLowerCase('en') === candidate &&
        boundary(cursor, candidate.length));
      if (term) {
        const exact = text.slice(cursor, cursor + term.length);
        runs.push({
          text: exact,
          semantic: TARGETS.has(term) ? 'targetCorrect' : 'targetWrong',
        });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < text.length && !TERMS.some((candidate) =>
        text.slice(end, end + candidate.length).toLocaleLowerCase('en') === candidate &&
        boundary(end, candidate.length))) end += 1;
      runs.push({ text: text.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, runs];
  })) as unknown as LocalizedIntroRunsSource;
}

export const EPISODE_01_SESSION_03_WORD_FIRST_TITLE = L({
  ru: 'Как я себя чувствую', uk: 'Як я почуваюся', es: 'Cómo me siento',
  'pt-BR': 'Como eu me sinto', vi: 'Tôi cảm thấy thế nào',
  id: 'Bagaimana perasaan saya', tr: 'Nasıl hissediyorum', pl: 'Jak się czuję',
});

export const EPISODE_01_SESSION_03_WORD_FIRST_SUMMARY = L({
  ru: 'Четыре частых слова помогают прямо назвать своё состояние.',
  uk: 'Чотири часті слова допомагають прямо назвати свій стан.',
  es: 'Cuatro palabras frecuentes permiten decir directamente cómo te sientes.',
  'pt-BR': 'Quatro palavras frequentes permitem dizer diretamente como você se sente.',
  vi: 'Bốn từ thông dụng giúp nói thẳng trạng thái của bản thân.',
  id: 'Empat kata umum membantu menyatakan keadaan diri secara langsung.',
  tr: 'Dört sık sözcük kişinin durumunu doğrudan anlatmasını sağlar.',
  pl: 'Cztery częste słowa pozwalają wprost nazwać swój stan.',
});

export const EPISODE_01_SESSION_03_WORD_FIRST_GOAL = L({
  ru: 'Узнавать happy, sad, tired и fine, а затем говорить о своём состоянии через I am.',
  uk: 'Упізнавати happy, sad, tired і fine, а потім говорити про свій стан через I am.',
  es: 'Reconocer happy, sad, tired y fine y después describir el propio estado con I am.',
  'pt-BR': 'Reconhecer happy, sad, tired e fine e depois descrever o próprio estado com I am.',
  vi: 'Nhận ra happy, sad, tired và fine rồi dùng I am để nói về trạng thái của mình.',
  id: 'Mengenali happy, sad, tired, dan fine lalu memakai I am untuk menyatakan keadaan diri.',
  tr: 'Happy, sad, tired ve fine sözcüklerini tanıyıp I am ile kendi durumunu anlatmak.',
  pl: 'Rozpoznawać happy, sad, tired i fine, a potem mówić o swoim stanie przez I am.',
});

const conceptBody = L({
  ru: 'Happy, sad, tired и fine называют четыре разных состояния. Happy — когда вам радостно, а sad — когда грустно. Tired говорит о нехватке сил, поэтому это не то же самое, что печаль. Fine — спокойное «всё нормально», без обязательной радости или усталости. Сначала различайте сами слова по точному состоянию, которое каждое из них называет.',
  uk: 'Happy, sad, tired і fine називають чотири різні стани. Happy — коли радісно, а sad — коли сумно. Tired говорить про брак сил, тому це не те саме, що смуток. Fine — спокійне «усе гаразд», без обов’язкової радості чи втоми. Кожне слово відповідає на іншу потребу. Спершу розрізняйте їх за точним станом, який кожне називає.',
  es: 'Happy, sad, tired y fine nombran cuatro estados distintos. Happy expresa alegría y sad expresa tristeza. Tired habla de falta de energía, que no es lo mismo que estar triste. Fine equivale a un «estoy bien» tranquilo, sin afirmar una gran alegría. Primero distingue cada palabra por el estado preciso que comunica.',
  'pt-BR': 'Happy, sad, tired e fine nomeiam quatro estados diferentes. Happy expressa alegria, enquanto sad expressa tristeza. Tired fala de falta de energia, algo diferente de estar triste. Fine corresponde a um «estou bem» tranquilo, sem afirmar grande alegria. Primeiro diferencie cada palavra pelo estado exato que ela comunica.',
  vi: 'Happy, sad, tired và fine gọi tên bốn trạng thái khác nhau. Happy diễn tả niềm vui, còn sad diễn tả nỗi buồn. Tired nói về việc thiếu sức lực nên không đồng nghĩa với buồn. Fine là cách nói bình thản rằng mọi thứ vẫn ổn, không nhất thiết rất vui. Trước hết hãy phân biệt từng từ bằng đúng trạng thái mà nó gọi tên.',
  id: 'Happy, sad, tired, dan fine menamai empat keadaan yang berbeda. Happy menyatakan rasa senang, sedangkan sad menyatakan kesedihan. Tired menunjukkan kekurangan tenaga, bukan sekadar rasa sedih. Fine adalah pernyataan tenang bahwa keadaan baik-baik saja, tanpa harus sangat gembira. Bedakan dahulu setiap kata melalui keadaan tepat yang dinyatakannya.',
  tr: 'Happy, sad, tired ve fine dört ayrı durumu adlandırır. Happy sevinci, sad ise üzüntüyü anlatır. Tired enerjinin azalmasını söyler; bu, üzgün olmakla aynı değildir. Fine güçlü bir sevinç belirtmeden sakin bir “iyiyim” anlamı verir. Her sözcük başka bir ihtiyaca cevap verir. Önce onları adlandırdıkları kesin duruma göre ayırın.',
  pl: 'Happy, sad, tired i fine nazywają cztery różne stany. Happy wyraża radość, a sad smutek. Tired mówi o braku sił, więc nie znaczy tego samego co smutek. Fine to spokojne „wszystko w porządku”, bez konieczności wyrażania wielkiej radości. Najpierw rozróżniaj każde słowo według dokładnego stanu, który nazywa.',
});

const formulaBody = L({
  ru: 'Слово состояния встаёт после знакомой опоры I am. Сначала называется человек I, затем обязательная связка am, а последнее место получает happy, sad, tired или fine. Само слово состояния не меняет форму из-за пола говорящего. Русские «рад» и «рада» различаются, но английское happy остаётся одним и тем же. Держите порядок как три позиции: человек, связка, состояние.',
  uk: 'Слово стану стає після знайомої опори I am. Спочатку називається людина I, далі обов’язкова зв’язка am, а останнє місце отримує happy, sad, tired або fine. Саме слово стану не змінюється через стать мовця. Українські «радий» і «рада» різняться, але англійське happy залишається однаковим. Тримайте порядок як три позиції: людина, зв’язка, стан.',
  es: 'La palabra de estado ocupa el lugar que sigue al bloque I am. Primero aparece la persona I, después el enlace obligatorio am y al final va happy, sad, tired o fine. El adjetivo inglés no cambia por el género de quien habla. En español usamos contento o contenta, pero happy conserva una sola forma. Mantén tres posiciones visibles: persona, enlace y estado.',
  'pt-BR': 'A palavra de estado ocupa o lugar depois do bloco I am. Primeiro aparece a pessoa I, depois a ligação obrigatória am e por fim entra happy, sad, tired ou fine. O adjetivo inglês não muda conforme o gênero de quem fala. Em português dizemos feliz ou cansado/cansada, mas a forma inglesa permanece igual. Preserve três posições: pessoa, ligação e estado.',
  vi: 'Từ chỉ trạng thái đứng sau cụm quen thuộc I am. Trước hết là người nói I, tiếp theo là từ nối bắt buộc am, rồi mới đến happy, sad, tired hoặc fine. Từ trạng thái tiếng Anh không đổi theo giới tính của người nói. Tiếng Việt cũng không biến đổi tính từ theo giống, nhưng vẫn cần giữ am trong câu tiếng Anh. Hãy nhớ ba vị trí: người nói, từ nối, trạng thái.',
  id: 'Kata keadaan menempati posisi setelah penghubung I am. Pertama muncul penutur I, kemudian penghubung wajib am, lalu happy, sad, tired, atau fine. Kata keadaan bahasa Inggris tidak berubah menurut gender penutur. Bahasa Indonesia juga tidak mengubah kata sifat menurut gender, tetapi kalimat Inggris tetap memerlukan am. Pertahankan tiga posisi: penutur, penghubung, keadaan.',
  tr: 'Durum sözcüğü tanıdık I am dayanağından sonra gelir. Önce kişiyi gösteren I, ardından zorunlu bağlantı am, son olarak happy, sad, tired ya da fine yer alır. İngilizce durum sözcüğü konuşanın cinsiyetine göre değişmez. Türkçede kişi bilgisi sona eklenebilir, fakat İngilizce bunu ayrı I ve am ile gösterir. Sırayı üç yer olarak koruyun: kişi, bağlantı, durum.',
  pl: 'Słowo stanu zajmuje miejsce po znanym połączeniu I am. Najpierw pojawia się osoba I, potem obowiązkowy łącznik am, a na końcu happy, sad, tired albo fine. Angielskie słowo stanu nie zmienia się zależnie od płci mówiącego. Polskie „zmęczony” i „zmęczona” są różne, lecz tired ma jedną formę. Zachowaj trzy pozycje: osoba, łącznik, stan.',
});

const trapBody = L({
  ru: 'Короткие слова состояния легко спутать с похожими английскими формами. Sad звучит близко к said, но said означает «сказал» и содержит другой гласный. Tired похоже написано на tried, где r и i стоят в другом порядке и значение уже «попробовал». Fine можно принять за find или five, если не дослушать последний звук. Проверяйте и звук, и смысл: состояние должно оставаться именно happy, sad, tired или fine.',
  uk: 'Короткі слова стану легко сплутати зі схожими англійськими формами. Sad звучить близько до said, але said означає «сказав» і має інший голосний. Tired схоже пишеться на tried, де r та i стоять в іншому порядку, а значення вже «спробував». Fine можна прийняти за find або five, якщо не дослухати останній звук. Перевіряйте і звук, і зміст: стан має залишатися саме happy, sad, tired або fine.',
  es: 'Las palabras breves de estado se confunden fácilmente con formas inglesas parecidas. Sad se parece a said, pero said significa «dijo» y contiene otra vocal. Tired se escribe casi como tried, donde r e i cambian de orden y el significado pasa a «intentó». Fine puede confundirse con find o five si no escuchas el sonido final. Comprueba sonido y sentido: el estado debe seguir siendo happy, sad, tired o fine.',
  'pt-BR': 'Palavras curtas de estado podem se confundir com formas inglesas parecidas. Sad se aproxima de said, mas said significa «disse» e usa outra vogal. Tired quase tem a escrita de tried, onde r e i trocam de ordem e o sentido vira «tentou». Fine pode parecer find ou five quando o som final não é ouvido. Confira som e sentido: o estado precisa continuar sendo happy, sad, tired ou fine.',
  vi: 'Các từ trạng thái ngắn dễ bị nhầm với những dạng tiếng Anh trông hoặc nghe gần giống. Sad gần với said, nhưng said nghĩa là “đã nói” và có nguyên âm khác. Tired gần giống tried trong chữ viết, nơi r và i đổi chỗ và nghĩa chuyển thành “đã thử”. Fine có thể bị nghe thành find hoặc five nếu bỏ qua âm cuối. Hãy kiểm tra cả âm thanh lẫn ý nghĩa để giữ đúng happy, sad, tired hoặc fine.',
  id: 'Kata keadaan yang pendek mudah tertukar dengan bentuk Inggris yang mirip. Sad terdengar dekat dengan said, tetapi said berarti “mengatakan” dalam bentuk lampau dan memakai vokal lain. Tired hampir sama tulisannya dengan tried, tempat r dan i bertukar urutan dan artinya menjadi “mencoba”. Fine dapat terdengar seperti find atau five jika bunyi akhirnya terlewat. Periksa bunyi dan makna agar keadaan tetap happy, sad, tired, atau fine.',
  tr: 'Kısa durum sözcükleri benzer İngilizce biçimlerle kolayca karışır. Sad, said sözcüğüne yakındır; ancak said “söyledi” demektir ve başka bir ünlü taşır. Tired yazıda tried biçimine benzer; r ile i yer değiştirince anlam “denedi” olur. Fine son ses duyulmazsa find ya da five sanılabilir. Hem sesi hem anlamı denetleyin; durum happy, sad, tired ya da fine olarak kalmalıdır.',
  pl: 'Krótkie słowa stanu łatwo pomylić z podobnymi formami angielskimi. Sad brzmi blisko said, ale said znaczy „powiedział” i ma inną samogłoskę. Tired wygląda podobnie do tried, gdzie r oraz i zamieniają kolejność, a znaczenie zmienia się na „spróbował”. Fine można pomylić z find albo five, jeśli nie usłyszy się końcowego dźwięku. Sprawdzaj brzmienie i sens: stan ma pozostać happy, sad, tired albo fine.',
});

const choice = (value: string): LocalizedSource => L(Object.fromEntries(
  LOCALES.map((locale) => [locale, value]),
) as unknown as LocalizedSource);

export const EPISODE_01_SESSION_03_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = Object.freeze([
  {
    kind: 'concept',
    title: L({ ru: 'Четыре состояния — четыре слова', uk: 'Чотири стани — чотири слова', es: 'Cuatro estados, cuatro palabras', 'pt-BR': 'Quatro estados, quatro palavras', vi: 'Bốn trạng thái, bốn từ', id: 'Empat keadaan, empat kata', tr: 'Dört durum, dört sözcük', pl: 'Cztery stany, cztery słowa' }),
    body: conceptBody, bodyRuns: markBody(conceptBody),
    question: {
      prompt: L({ ru: 'Какое слово означает «уставший»?', uk: 'Яке слово означає «втомлений»?', es: '¿Qué palabra significa «cansado»?', 'pt-BR': 'Qual palavra significa «cansado»?', vi: 'Từ nào có nghĩa là “mệt”?', id: 'Kata mana yang berarti “lelah”?', tr: 'Hangi sözcük “yorgun” demektir?', pl: 'Które słowo znaczy „zmęczony”?' }),
      choices: [choice('tired'), choice('happy'), choice('fine')], correctChoiceIndex: 0,
      explanation: L({ ru: 'Tired называет нехватку сил; happy означает радость, а fine — спокойное «всё нормально».', uk: 'Tired називає брак сил; happy означає радість, а fine — спокійне «усе гаразд».', es: 'Tired expresa falta de energía; happy es alegría y fine indica que todo está bien.', 'pt-BR': 'Tired expressa falta de energia; happy é alegria e fine indica que tudo está bem.', vi: 'Tired nói về việc thiếu sức; happy là vui, còn fine là mọi thứ vẫn ổn.', id: 'Tired menyatakan kekurangan tenaga; happy berarti senang dan fine berarti baik-baik saja.', tr: 'Tired enerji eksikliğini anlatır; happy sevinç, fine ise sakin bir iyilik durumudur.', pl: 'Tired oznacza brak sił; happy to radość, a fine spokojne „w porządku”.' }),
    },
  },
  {
    kind: 'formula',
    title: L({ ru: 'Состояние идёт после I am', uk: 'Стан іде після I am', es: 'El estado va después de I am', 'pt-BR': 'O estado vem depois de I am', vi: 'Trạng thái đứng sau I am', id: 'Keadaan datang setelah I am', tr: 'Durum I am sonrasına gelir', pl: 'Stan stoi po I am' }),
    body: formulaBody, bodyRuns: markBody(formulaBody),
    question: {
      prompt: L({ ru: 'Что может занять место состояния после I am?', uk: 'Що може зайняти місце стану після I am?', es: '¿Qué puede ocupar el lugar del estado después de I am?', 'pt-BR': 'O que pode ocupar o lugar do estado depois de I am?', vi: 'Từ nào có thể đứng ở vị trí trạng thái sau I am?', id: 'Apa yang dapat mengisi posisi keadaan setelah I am?', tr: 'I am sonrasında durum yerine ne gelebilir?', pl: 'Co może zająć miejsce stanu po I am?' }),
      choices: [choice('happy'), choice('I'), choice('am')], correctChoiceIndex: 0,
      explanation: L({ ru: 'Happy — слово состояния. I называет человека, а am связывает его с состоянием.', uk: 'Happy — слово стану. I називає людину, а am пов’язує її зі станом.', es: 'Happy es una palabra de estado. I identifica a la persona y am la enlaza con el estado.', 'pt-BR': 'Happy é uma palavra de estado. I identifica a pessoa e am a liga ao estado.', vi: 'Happy là từ chỉ trạng thái. I gọi tên người nói, còn am nối người đó với trạng thái.', id: 'Happy adalah kata keadaan. I menandai penutur dan am menghubungkannya dengan keadaan.', tr: 'Happy bir durum sözcüğüdür. I kişiyi gösterir, am onu duruma bağlar.', pl: 'Happy jest słowem stanu. I wskazuje osobę, a am łączy ją ze stanem.' }),
    },
  },
  {
    kind: 'trap',
    title: L({ ru: 'Похожие формы меняют смысл', uk: 'Схожі форми змінюють зміст', es: 'Las formas parecidas cambian el sentido', 'pt-BR': 'Formas parecidas mudam o sentido', vi: 'Dạng gần giống làm đổi nghĩa', id: 'Bentuk mirip mengubah arti', tr: 'Benzer biçimler anlamı değiştirir', pl: 'Podobne formy zmieniają sens' }),
    body: trapBody, bodyRuns: markBody(trapBody),
    question: {
      prompt: L({ ru: 'Какое слово означает «грустный»?', uk: 'Яке слово означає «сумний»?', es: '¿Qué palabra significa «triste»?', 'pt-BR': 'Qual palavra significa «triste»?', vi: 'Từ nào có nghĩa là “buồn”?', id: 'Kata mana yang berarti “sedih”?', tr: 'Hangi sözcük “üzgün” demektir?', pl: 'Które słowo znaczy „smutny”?' }),
      choices: [choice('sad'), choice('said'), choice('sat')], correctChoiceIndex: 0,
      explanation: L({ ru: 'Sad означает «грустный». Said — «сказал», а sat — «сидел»; похожее звучание не сохраняет значение состояния.', uk: 'Sad означає «сумний». Said — «сказав», а sat — «сидів»; схоже звучання не зберігає значення стану.', es: 'Sad significa «triste». Said es «dijo» y sat es «se sentó»; el sonido parecido no conserva el estado.', 'pt-BR': 'Sad significa «triste». Said é «disse» e sat é «sentou»; o som parecido não conserva o estado.', vi: 'Sad nghĩa là “buồn”. Said là “đã nói”, còn sat là “đã ngồi”; âm gần giống không giữ nguyên trạng thái.', id: 'Sad berarti “sedih”. Said berarti “mengatakan” dan sat berarti “duduk” dalam bentuk lampau; bunyi mirip tidak mempertahankan keadaan.', tr: 'Sad “üzgün” demektir. Said “söyledi”, sat ise “oturdu” anlamındadır; benzer ses aynı durumu korumaz.', pl: 'Sad znaczy „smutny”. Said to „powiedział”, a sat „siedział”; podobne brzmienie nie zachowuje znaczenia stanu.' }),
    },
  },
]);
