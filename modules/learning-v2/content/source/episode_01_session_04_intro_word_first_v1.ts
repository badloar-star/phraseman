import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
  SessionSourceIntroPage,
} from './session_shard_from_source_v1';
import type { LearningV2IntroTextRunV1 } from '../intro_semantic_runs_v1';

const L = (value: LocalizedSource): LocalizedSource => value;
const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const CORRECT = new Set(["i am ready", "i'm ready", 'i am', "i'm", 'am', 'i']);
const TERMS = ["I am ready", "I'm ready", "I'am ready", 'Im ready', "I am", "I'm", "I'am", 'Im', 'am', 'I'];
const normalizeApostrophe = (value: string): string =>
  value.replace(/[’]/gu, "'").toLocaleLowerCase('en');
const matchesTerm = (value: string, candidate: string): boolean =>
  candidate === 'I'
    ? value === candidate
    : normalizeApostrophe(value) === normalizeApostrophe(candidate);

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
        matchesTerm(text.slice(cursor, cursor + candidate.length), candidate) &&
        boundary(cursor, candidate.length));
      if (term) {
        const exact = text.slice(cursor, cursor + term.length);
        runs.push({
          text: exact,
          semantic: CORRECT.has(normalizeApostrophe(term)) ? 'targetCorrect' : 'targetWrong',
        });
        cursor += term.length;
        continue;
      }
      let end = cursor + 1;
      while (end < text.length && !TERMS.some((candidate) =>
        matchesTerm(text.slice(end, end + candidate.length), candidate) &&
        boundary(end, candidate.length))) end += 1;
      runs.push({ text: text.slice(cursor, end), semantic: 'explanation' });
      cursor = end;
    }
    return [locale, runs];
  })) as unknown as LocalizedIntroRunsSource;
}

export const EPISODE_01_SESSION_04_WORD_FIRST_TITLE = L({
  ru: 'Короткое I’m', uk: 'Коротке I’m', es: 'La forma corta I’m',
  'pt-BR': 'A forma curta I’m', vi: 'Dạng ngắn I’m', id: 'Bentuk singkat I’m',
  tr: 'Kısa biçim I’m', pl: 'Krótka forma I’m',
});

export const EPISODE_01_SESSION_04_WORD_FIRST_SUMMARY = L({
  ru: 'I am сжимается в I’m, а апостроф сохраняет место пропущенной буквы.',
  uk: 'I am стискається до I’m, а апостроф зберігає місце пропущеної літери.',
  es: 'I am se contrae en I’m y el apóstrofo marca la letra omitida.',
  'pt-BR': 'I am se contrai em I’m, e o apóstrofo marca a letra omitida.',
  vi: 'I am rút gọn thành I’m, còn dấu nháy đánh dấu chữ bị lược.',
  id: 'I am dipendekkan menjadi I’m, dan apostrof menandai huruf yang hilang.',
  tr: 'I am, I’m biçimine kısalır; kesme işareti düşen harfin yerini gösterir.',
  pl: 'I am skraca się do I’m, a apostrof zaznacza miejsce pominiętej litery.',
});

export const EPISODE_01_SESSION_04_WORD_FIRST_GOAL = L({
  ru: 'Узнавать busy и уверенно писать I’m и I’m not с точным апострофом.',
  uk: 'Упізнавати busy й упевнено писати I’m та I’m not із точним апострофом.',
  es: 'Reconocer busy y escribir con seguridad I’m e I’m not con el apóstrofo correcto.',
  'pt-BR': 'Reconhecer busy e escrever com segurança I’m e I’m not com o apóstrofo correto.',
  vi: 'Nhận ra busy và viết đúng I’m, I’m not với dấu nháy chính xác.',
  id: 'Mengenali busy serta menulis I’m dan I’m not dengan apostrof yang tepat.',
  tr: 'Busy sözcüğünü tanıyıp I’m ve I’m not biçimlerini doğru kesme işaretiyle yazmak.',
  pl: 'Rozpoznawać busy oraz pewnie zapisywać I’m i I’m not z poprawnym apostrofem.',
});

const conceptBody = L({
  ru: 'В живой английской речи I am часто становится короче: I’m. Смысл не меняется и am не исчезает бесследно. Слова I и am соединяются, буква a выпадает, а апостроф показывает её место. Поэтому I am ready и I’m ready сообщают одно и то же; вторая форма лишь звучит и пишется компактнее. Важно видеть внутри I’m обе части, чтобы короткая запись не превратилась в новое отдельное слово.',
  uk: 'У живій англійській мові I am часто стає коротшим: I’m. Зміст не змінюється, і am не зникає без сліду. Слова I та am з’єднуються, літера a випадає, а апостроф показує її місце. Тому I am ready й I’m ready повідомляють те саме; друга форма лише звучить і пишеться компактніше. Важливо бачити всередині I’m обидві частини, щоб короткий запис не здавався новим окремим словом.',
  es: 'En el inglés cotidiano, I am suele acortarse a I’m. El sentido no cambia y am no desaparece sin dejar rastro. I y am se unen, se omite la letra a y el apóstrofo marca ese hueco. Por eso I am ready e I’m ready comunican exactamente lo mismo; la segunda forma solo es más compacta al hablar y escribir. Conviene seguir viendo las dos piezas dentro de I’m para no tratarla como una palabra nueva sin estructura.',
  'pt-BR': 'No inglês do dia a dia, I am costuma ficar mais curto: I’m. O sentido não muda, e am não desaparece sem deixar marca. I e am se unem, a letra a é omitida e o apóstrofo mostra esse lugar. Por isso I am ready e I’m ready comunicam a mesma coisa; a segunda forma apenas soa e aparece de modo mais compacto. Continue enxergando as duas partes dentro de I’m para não tratar a contração como uma palavra sem estrutura.',
  vi: 'Trong tiếng Anh tự nhiên, I am thường được rút gọn thành I’m. Nghĩa không đổi và am không biến mất hoàn toàn. I nối với am, chữ a được lược đi, còn dấu nháy đánh dấu đúng chỗ đó. Vì vậy I am ready và I’m ready truyền đạt cùng một ý; dạng thứ hai chỉ gọn hơn khi nói và viết. Hãy vẫn nhìn thấy cả I lẫn am bên trong I’m để không coi dạng ngắn này là một từ mới không có cấu trúc.',
  id: 'Dalam bahasa Inggris sehari-hari, I am sering dipendekkan menjadi I’m. Maknanya tidak berubah dan am tidak hilang tanpa jejak. I bergabung dengan am, huruf a dihilangkan, lalu apostrof menandai tempatnya. Karena itu I am ready dan I’m ready menyampaikan hal yang sama; bentuk kedua hanya lebih ringkas saat diucapkan dan ditulis. Tetap lihat kedua bagian di dalam I’m agar bentuk singkat ini tidak dianggap sebagai kata baru tanpa susunan.',
  tr: 'Günlük İngilizcede I am çoğu zaman I’m biçimine kısalır. Anlam değişmez ve am iz bırakmadan kaybolmaz. I ile am birleşir, a harfi düşer, kesme işareti de onun yerini gösterir. Bu yüzden I am ready ile I’m ready aynı şeyi söyler; ikinci biçim yalnızca konuşmada ve yazıda daha kısadır. I’m içinde iki parçayı da görmeye devam etmek, bu kısaltmayı yapısız yeni bir sözcük sanmayı önler.',
  pl: 'W codziennym angielskim I am często skraca się do I’m. Znaczenie się nie zmienia, a am nie znika bez śladu. I łączy się z am, litera a zostaje pominięta, a apostrof pokazuje jej miejsce. Dlatego I am ready i I’m ready przekazują dokładnie tę samą informację; druga forma jest tylko krótsza w mowie i piśmie. Warto nadal widzieć obie części wewnątrz I’m, zamiast traktować skrót jak nowe słowo bez budowy.',
});

const formulaBody = L({
  ru: 'Формула короткой записи проста: I + am превращается в I’m. Апостроф ставится после I, а затем остаётся m из слова am. Он не украшение и не случайная пауза: он показывает, что между I и m была пропущена буква. После I’m сразу идёт знакомое место или состояние. Если нужно отрицание, not остаётся отдельным словом после сокращения. Так короткая форма сохраняет тот же порядок мысли, что и полная I am.',
  uk: 'Формула короткого запису проста: I + am перетворюється на I’m. Апостроф стоїть після I, а далі залишається m зі слова am. Це не прикраса й не випадкова пауза: знак показує, що між I та m пропущено літеру. Після I’m одразу йде знайоме місце або стан. Якщо потрібне заперечення, not залишається окремим словом після скорочення. Коротка форма зберігає той самий порядок думки, що й повна I am.',
  es: 'La fórmula escrita es directa: I + am se convierte en I’m. El apóstrofo va después de I y luego queda la m de am. No es un adorno ni una pausa al azar: señala que se ha omitido una letra entre I y m. Después de I’m aparece el lugar o estado conocido. Para negar, not permanece como palabra separada detrás de la contracción. Así, la forma corta conserva el mismo orden de significado que la forma completa I am.',
  'pt-BR': 'A fórmula escrita é direta: I + am se transforma em I’m. O apóstrofo vem depois de I e, em seguida, fica o m de am. Ele não é enfeite nem pausa aleatória: indica que uma letra foi omitida entre I e m. Depois de I’m entra o lugar ou estado já conhecido. Para negar, not continua como palavra separada após a contração. Assim, a forma curta mantém a mesma ordem de sentido da forma completa I am.',
  vi: 'Công thức viết rất rõ: I + am trở thành I’m. Dấu nháy đứng sau I, rồi giữ lại chữ m của am. Đây không phải dấu trang trí hay chỗ ngắt tùy ý; nó cho biết một chữ đã được lược giữa I và m. Sau I’m là nơi chốn hoặc trạng thái quen thuộc. Khi phủ định, not vẫn là một từ riêng đứng sau dạng rút gọn. Vì thế dạng ngắn giữ nguyên trật tự ý nghĩa của dạng đầy đủ I am.',
  id: 'Rumus tulisannya jelas: I + am menjadi I’m. Apostrof ditempatkan setelah I, lalu m dari am tetap ada. Tanda itu bukan hiasan atau jeda sembarang; apostrof menunjukkan bahwa satu huruf dihilangkan antara I dan m. Setelah I’m, tempat atau keadaan yang sudah dikenal langsung menyusul. Untuk menyangkal, not tetap menjadi kata terpisah setelah kontraksi. Bentuk singkat pun mempertahankan urutan makna yang sama dengan I am.',
  tr: 'Yazım formülü açıktır: I + am, I’m olur. Kesme işareti I sonrasına gelir ve am sözcüğündeki m kalır. Bu işaret süs ya da rastgele bir durak değildir; I ile m arasında bir harfin düştüğünü gösterir. I’m sonrasında bilinen yer ya da durum gelir. Olumsuzluk gerektiğinde not, kısaltmadan sonra ayrı bir sözcük olarak kalır. Böylece kısa biçim, tam I am ile aynı anlam sırasını korur.',
  pl: 'Wzór zapisu jest prosty: I + am zmienia się w I’m. Apostrof stoi po I, a potem pozostaje m ze słowa am. Nie jest ozdobą ani przypadkową przerwą; pokazuje, że między I i m pominięto literę. Po I’m od razu pojawia się znane miejsce albo stan. Przy przeczeniu not pozostaje osobnym słowem po skrócie. Krótka forma zachowuje więc ten sam porządek znaczenia co pełne I am.',
});

const trapBody = L({
  ru: 'Самая частая ошибка — услышать короткую форму правильно, но написать её без апострофа: Im. В стандартном английском это не сокращение, потому что место пропущенной буквы ничем не отмечено. Запись I’am тоже не подходит: она оставляет a и ставит знак между a и m, хотя исчезает именно a. Надёжная проверка проста: сначала заглавная I, сразу после неё апостроф, затем m. Получается только I’m — без лишней буквы и без потерянного знака.',
  uk: 'Найчастіша помилка — правильно почути коротку форму, але написати її без апострофа: Im. У стандартній англійській це не скорочення, бо місце пропущеної літери нічим не позначене. Запис I’am також не підходить: він залишає a та ставить знак між a й m, хоча зникає саме a. Надійна перевірка проста: спочатку велика I, одразу після неї апостроф, потім m. Виходить лише I’m — без зайвої літери й без загубленого знака.',
  es: 'El error más frecuente es oír bien la forma corta y escribirla sin apóstrofo: Im. En el inglés estándar eso no muestra una contracción, porque nada marca la letra omitida. I’am tampoco sirve: conserva la a y coloca el signo entre a y m, aunque la letra que desaparece es precisamente a. La comprobación segura tiene tres pasos: I mayúscula, apóstrofo justo después y, por último, m. El único resultado correcto es I’m, sin letra sobrante ni signo perdido.',
  'pt-BR': 'O erro mais comum é ouvir corretamente a forma curta e escrevê-la sem apóstrofo: Im. No inglês padrão, isso não mostra uma contração, pois nada marca a letra omitida. I’am também não funciona: mantém a letra a e coloca o sinal entre a e m, embora seja justamente a que desaparece. A conferência segura tem três passos: I maiúsculo, apóstrofo logo depois e, por fim, m. O único resultado correto é I’m, sem letra sobrando nem sinal perdido.',
  vi: 'Lỗi thường gặp nhất là nghe đúng dạng ngắn nhưng viết thiếu dấu nháy: Im. Trong tiếng Anh chuẩn, cách đó không thể hiện sự rút gọn vì không có gì đánh dấu chữ bị lược. I’am cũng sai: nó vẫn giữ a và đặt dấu giữa a với m, trong khi chính a mới là chữ biến mất. Cách kiểm tra chắc chắn gồm ba phần: I viết hoa, dấu nháy ngay sau I, rồi đến m. Kết quả đúng duy nhất là I’m, không thừa chữ và không mất dấu.',
  id: 'Kesalahan yang paling sering terjadi ialah mendengar bentuk singkat dengan benar tetapi menulisnya tanpa apostrof: Im. Dalam bahasa Inggris baku, bentuk itu tidak menunjukkan kontraksi karena tempat huruf yang hilang tidak ditandai. I’am juga keliru: huruf a masih ada dan tanda ditempatkan antara a dan m, padahal a-lah yang dihilangkan. Pemeriksaan yang aman terdiri dari I besar, apostrof tepat sesudahnya, lalu m. Hasil yang benar hanya I’m, tanpa huruf berlebih atau tanda yang hilang.',
  tr: 'En sık hata kısa biçimi doğru duyup kesme işareti olmadan Im diye yazmaktır. Standart İngilizcede bu bir kısaltmayı göstermez; çünkü düşen harfin yeri işaretlenmemiştir. I’am da uygun değildir: a harfini korur ve işareti a ile m arasına koyar, oysa düşen harf a’dır. Güvenli denetim üç parçalıdır: büyük I, hemen ardından kesme işareti, sonra m. Fazla harf ya da eksik işaret olmadan yalnızca I’m doğru çıkar.',
  pl: 'Najczęstszy błąd polega na poprawnym usłyszeniu skrótu, ale zapisaniu go bez apostrofu: Im. W standardowym angielskim taki zapis nie pokazuje skrócenia, bo nic nie zaznacza pominiętej litery. I’am też jest błędne: zachowuje a i stawia znak między a oraz m, chociaż znika właśnie a. Pewna kontrola ma trzy części: wielkie I, apostrof bezpośrednio po nim, a następnie m. Jedynym poprawnym wynikiem jest I’m — bez dodatkowej litery i bez zgubionego znaku.',
});

const choice = (value: string): LocalizedSource => L(Object.fromEntries(
  LOCALES.map((locale) => [locale, value]),
) as unknown as LocalizedSource);

export const EPISODE_01_SESSION_04_WORD_FIRST_INTRO: readonly [
  SessionSourceIntroPage,
  SessionSourceIntroPage,
  SessionSourceIntroPage,
] = Object.freeze([
  {
    kind: 'concept',
    title: L({ ru: 'Короткая форма сохраняет смысл', uk: 'Коротка форма зберігає зміст', es: 'La forma corta conserva el sentido', 'pt-BR': 'A forma curta mantém o sentido', vi: 'Dạng ngắn vẫn giữ nguyên nghĩa', id: 'Bentuk singkat mempertahankan makna', tr: 'Kısa biçim anlamı korur', pl: 'Krótka forma zachowuje znaczenie' }),
    body: conceptBody, bodyRuns: markBody(conceptBody),
    question: {
      prompt: L({ ru: 'Какая короткая форма означает то же, что I am?', uk: 'Яка коротка форма означає те саме, що I am?', es: '¿Qué forma corta significa lo mismo que I am?', 'pt-BR': 'Qual forma curta significa o mesmo que I am?', vi: 'Dạng ngắn nào có cùng nghĩa với I am?', id: 'Bentuk singkat mana yang sama artinya dengan I am?', tr: 'Hangi kısa biçim I am ile aynı anlama gelir?', pl: 'Która krótka forma znaczy to samo co I am?' }),
      choices: [choice('I’m'), choice('Im'), choice('I’am')], correctChoiceIndex: 0,
      explanation: L({ ru: 'I’m соединяет I и am: буква a выпадает, а апостроф отмечает её место. Im теряет знак, I’am оставляет лишнюю a.', uk: 'I’m поєднує I та am: літера a випадає, а апостроф позначає її місце. Im губить знак, I’am залишає зайву a.', es: 'I’m une I y am: se omite a y el apóstrofo marca su lugar. Im pierde el signo e I’am conserva una a sobrante.', 'pt-BR': 'I’m une I e am: a letra a é omitida e o apóstrofo marca o lugar. Im perde o sinal, e I’am mantém um a extra.', vi: 'I’m nối I với am: chữ a được lược và dấu nháy đánh dấu vị trí đó. Im thiếu dấu, còn I’am thừa chữ a.', id: 'I’m menggabungkan I dan am: a dihilangkan dan apostrof menandai tempatnya. Im kehilangan tanda, sedangkan I’am menyisakan a.', tr: 'I’m, I ile am’i birleştirir: a düşer, kesme işareti yerini gösterir. Im işareti kaybeder, I’am ise fazla a bırakır.', pl: 'I’m łączy I i am: litera a znika, a apostrof wskazuje jej miejsce. Im gubi znak, a I’am zachowuje zbędne a.' }),
    },
  },
  {
    kind: 'formula',
    title: L({ ru: 'Апостроф стоит сразу после I', uk: 'Апостроф стоїть одразу після I', es: 'El apóstrofo va justo después de I', 'pt-BR': 'O apóstrofo vem logo depois de I', vi: 'Dấu nháy đứng ngay sau I', id: 'Apostrof berada tepat setelah I', tr: 'Kesme işareti I sonrasındadır', pl: 'Apostrof stoi bezpośrednio po I' }),
    body: formulaBody, bodyRuns: markBody(formulaBody),
    question: {
      prompt: L({ ru: 'Из каких двух частей получается I’m?', uk: 'Із яких двох частин утворюється I’m?', es: '¿De qué dos partes sale I’m?', 'pt-BR': 'De quais duas partes surge I’m?', vi: 'I’m được tạo từ hai phần nào?', id: 'I’m berasal dari dua bagian apa?', tr: 'I’m hangi iki parçadan oluşur?', pl: 'Z jakich dwóch części powstaje I’m?' }),
      choices: [choice('I + am'), choice('I + is'), choice('I + not')], correctChoiceIndex: 0,
      explanation: L({ ru: 'I’m — это сокращённое I am. Форма is относится к другому лицу, а not добавляет отрицание, но не создаёт само сокращение.', uk: 'I’m — це скорочене I am. Форма is належить іншій особі, а not додає заперечення, але не створює саме скорочення.', es: 'I’m es la contracción de I am. Is corresponde a otra persona y not añade negación, pero no forma esta contracción.', 'pt-BR': 'I’m é a contração de I am. Is pertence a outra pessoa, e not acrescenta negação, mas não forma essa contração.', vi: 'I’m là dạng rút gọn của I am. Is đi với ngôi khác, còn not thêm phủ định chứ không tạo ra dạng rút gọn này.', id: 'I’m adalah kontraksi I am. Is dipakai untuk orang lain, sedangkan not menambah penyangkalan dan bukan pembentuk kontraksi ini.', tr: 'I’m, I am kısaltmasıdır. Is başka bir kişiyle kullanılır; not olumsuzluk ekler ama bu kısaltmayı oluşturmaz.', pl: 'I’m jest skrótem I am. Is dotyczy innej osoby, a not dodaje przeczenie, lecz nie tworzy tego skrótu.' }),
    },
  },
  {
    kind: 'trap',
    title: L({ ru: 'Без апострофа сокращение ломается', uk: 'Без апострофа скорочення ламається', es: 'Sin apóstrofo, la contracción se rompe', 'pt-BR': 'Sem apóstrofo, a contração se quebra', vi: 'Thiếu dấu nháy thì dạng rút gọn bị sai', id: 'Tanpa apostrof, kontraksi menjadi salah', tr: 'Kesme işareti yoksa kısaltma bozulur', pl: 'Bez apostrofu skrót jest błędny' }),
    body: trapBody, bodyRuns: markBody(trapBody),
    question: {
      prompt: L({ ru: 'Как выглядит стандартная короткая запись?', uk: 'Який вигляд має стандартний короткий запис?', es: '¿Cómo se escribe la forma corta estándar?', 'pt-BR': 'Como se escreve a forma curta padrão?', vi: 'Dạng ngắn chuẩn được viết thế nào?', id: 'Bagaimana penulisan bentuk singkat baku?', tr: 'Standart kısa yazım hangisidir?', pl: 'Jak wygląda standardowy krótki zapis?' }),
      choices: [choice('I’m'), choice('Im'), choice('I’am')], correctChoiceIndex: 0,
      explanation: L({ ru: 'Только I’m ставит апостроф на место выпавшей a. Im не отмечает пропуск, а I’am ошибочно сохраняет a.', uk: 'Лише I’m ставить апостроф на місце пропущеної a. Im не позначає пропуск, а I’am помилково зберігає a.', es: 'Solo I’m coloca el apóstrofo donde se omitió a. Im no marca la omisión e I’am conserva a por error.', 'pt-BR': 'Somente I’m coloca o apóstrofo onde a letra a foi omitida. Im não marca a omissão, e I’am mantém a por engano.', vi: 'Chỉ I’m đặt dấu nháy vào chỗ chữ a bị lược. Im không đánh dấu phần bị thiếu, còn I’am giữ a một cách sai.', id: 'Hanya I’m menempatkan apostrof di tempat a yang dihilangkan. Im tidak menandai penghilangan, sedangkan I’am keliru mempertahankan a.', tr: 'Yalnızca I’m kesme işaretini düşen a’nın yerine koyar. Im düşmeyi göstermez, I’am ise a’yı yanlışlıkla korur.', pl: 'Tylko I’m stawia apostrof w miejscu pominiętego a. Im nie zaznacza braku, a I’am błędnie zachowuje a.' }),
    },
  },
]);
