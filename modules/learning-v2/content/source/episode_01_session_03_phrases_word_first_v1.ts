import type { EpisodeSourcePhrase, EpisodeSourcePhraseLocalizedDetails } from './episode_01_source_v1';
import { EPISODE_01_SESSION_01_WORD_FIRST_PHRASES } from './episode_01_session_01_phrases_word_first_v1';
import {
  EPISODE_01_LEGACY_NOT_SAD_PHRASE,
  EPISODE_01_SESSION_02_MODE_NATIVE_PHRASES,
} from './episode_01_session_02_affirmative_phrases_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
type Locale = (typeof LOCALES)[number];
type Copy = Readonly<{ prompt: string; missing: string; misplaced: string; doubled: string }>;

const CONTRACTION: Readonly<Record<Locale, Copy>> = {
  ru: { prompt: 'Выберите короткую форму I am.', missing: 'Im потеряло апостроф, который отмечает пропущенную a. Правильно: I’m.', misplaced: 'I’am оставляет a после апострофа; в правильном I’m эта буква исчезает.', doubled: 'I’m am повторяет am: оно уже находится внутри I’m.' },
  uk: { prompt: 'Оберіть коротку форму I am.', missing: 'Im втратило апостроф, який позначає пропущену a. Правильно: I’m.', misplaced: 'I’am залишає a після апострофа; у правильному I’m ця літера зникає.', doubled: 'I’m am повторює am: воно вже міститься всередині I’m.' },
  es: { prompt: 'Elige la forma corta de I am.', missing: 'Im perdió el apóstrofo que marca la a omitida. La forma correcta es I’m.', misplaced: 'I’am conserva la a después del apóstrofo; en I’m esa letra desaparece.', doubled: 'I’m am repite am, que ya está dentro de I’m.' },
  'pt-BR': { prompt: 'Escolha a forma curta de I am.', missing: 'Im perdeu o apóstrofo que marca o a omitido. A forma certa é I’m.', misplaced: 'I’am mantém o a depois do apóstrofo; em I’m essa letra desaparece.', doubled: 'I’m am repete am, que já está dentro de I’m.' },
  vi: { prompt: 'Chọn dạng ngắn của I am.', missing: 'Im thiếu dấu nháy dùng để đánh dấu chữ a đã lược. Dạng đúng là I’m.', misplaced: 'I’am vẫn giữ a sau dấu nháy; trong I’m, chữ này phải biến mất.', doubled: 'I’m am lặp am vì am đã nằm bên trong I’m.' },
  id: { prompt: 'Pilih bentuk singkat I am.', missing: 'Im kehilangan apostrof yang menandai huruf a yang dibuang. Bentuk yang benar ialah I’m.', misplaced: 'I’am masih menyisakan a setelah apostrof; dalam I’m huruf itu hilang.', doubled: 'I’m am mengulang am karena am sudah ada di dalam I’m.' },
  tr: { prompt: 'I am biçiminin kısa hâlini seçin.', missing: 'Im, düşen a harfini gösteren kesme işaretini kaybetmiştir. Doğrusu I’m olur.', misplaced: 'I’am kesme işaretinden sonra a bırakır; doğru I’m biçiminde bu harf düşer.', doubled: 'I’m am, I’m içinde bulunan am biçimini tekrarlar.' },
  pl: { prompt: 'Wybierz krótką formę I am.', missing: 'Im zgubiło apostrof wskazujący pominięte a. Poprawny zapis to I’m.', misplaced: 'I’am zostawia a po apostrofie; w poprawnym I’m ta litera znika.', doubled: 'I’m am powtarza am, które już znajduje się w I’m.' },
};

const EXPLANATIONS = {
  here: {
    ru: 'I’m here звучит как короткое появление в кадре: «я здесь». I’m уже несёт I am, а here спокойно ставит точку на месте.', uk: 'I’m here звучить як коротка поява в кадрі: «я тут». I’m уже несе I am, а here спокійно вказує місце.', es: 'I’m here suena como una entrada breve en escena: «estoy aquí». I’m ya lleva I am y here fija el lugar.', 'pt-BR': 'I’m here soa como uma entrada rápida em cena: «estou aqui». I’m já carrega I am e here marca o lugar.', vi: 'I’m here giống một lời xuất hiện gọn gàng: “tôi ở đây”. I’m đã mang nghĩa I am, còn here chỉ đúng nơi.', id: 'I’m here terdengar seperti kemunculan singkat: “saya di sini”. I’m sudah memuat I am, sedangkan here menunjukkan tempat.', tr: 'I’m here sahneye kısa bir giriş gibidir: “buradayım”. I’m, I am anlamını taşır; here yeri gösterir.', pl: 'I’m here brzmi jak krótkie wejście na scenę: „jestem tutaj”. I’m zawiera I am, a here wskazuje miejsce.'
  },
  ready: {
    ru: 'I’m ready — короткий зелёный свет перед стартом: «я готов / готова». После цельного I’m слово ready сразу называет готовность.', uk: 'I’m ready — коротке зелене світло перед стартом: «я готовий / готова». Після цілісного I’m слово ready одразу називає готовність.', es: 'I’m ready es una luz verde antes de empezar: «estoy listo / lista». Después del bloque I’m, ready nombra la preparación.', 'pt-BR': 'I’m ready é o sinal verde antes de começar: «estou pronto / pronta». Depois do bloco I’m, ready mostra a prontidão.', vi: 'I’m ready như đèn xanh trước lúc bắt đầu: “tôi sẵn sàng”. Sau cụm I’m, ready gọi đúng trạng thái sẵn sàng.', id: 'I’m ready seperti lampu hijau sebelum mulai: “saya siap”. Setelah I’m, ready langsung menyatakan kesiapan.', tr: 'I’m ready başlangıçtan önceki yeşil ışık gibidir: “hazırım”. Bütün I’m biçiminden sonra ready hazırlığı söyler.', pl: 'I’m ready jest jak zielone światło przed startem: „jestem gotowy / gotowa”. Po całym I’m słowo ready nazywa gotowość.'
  },
  happy: {
    ru: 'I’m happy сообщает радость без длинного разбега. I’m быстро называет говорящего, а happy оставляет улыбку в конце.', uk: 'I’m happy повідомляє про радість без довгого розгону. I’m швидко називає мовця, а happy залишає усмішку наприкінці.', es: 'I’m happy comunica alegría sin rodeos. I’m presenta al hablante con rapidez y happy deja la sonrisa al final.', 'pt-BR': 'I’m happy comunica alegria sem rodeios. I’m apresenta quem fala rapidamente e happy deixa o sorriso no fim.', vi: 'I’m happy nói niềm vui mà không vòng vo. I’m đưa người nói vào câu thật nhanh, còn happy để lại nụ cười ở cuối.', id: 'I’m happy menyampaikan rasa senang tanpa berputar-putar. I’m menghadirkan penutur dengan cepat, lalu happy menutupnya dengan senyum.', tr: 'I’m happy sevinci dolanmadan söyler. I’m konuşanı hızla gösterir, happy ise cümleyi gülümsemeyle bitirir.', pl: 'I’m happy mówi o radości bez rozbiegu. I’m szybko wskazuje mówiącego, a happy zostawia uśmiech na końcu.'
  },
  sad: {
    ru: 'I’m sad коротко и честно сообщает о грусти. I’m не меняет чувство, а лишь убирает лишний слог перед sad.', uk: 'I’m sad коротко й чесно повідомляє про смуток. I’m не змінює почуття, а лише прибирає зайвий склад перед sad.', es: 'I’m sad expresa tristeza de forma breve y directa. I’m no cambia la emoción; solo acorta el inicio antes de sad.', 'pt-BR': 'I’m sad comunica tristeza de modo curto e direto. I’m não muda a emoção; apenas encurta o começo antes de sad.', vi: 'I’m sad nói nỗi buồn ngắn gọn và thật lòng. I’m không đổi cảm xúc, chỉ rút ngắn phần mở đầu trước sad.', id: 'I’m sad menyampaikan kesedihan secara singkat dan jujur. I’m tidak mengubah perasaan; hanya memendekkan bagian sebelum sad.', tr: 'I’m sad üzüntüyü kısa ve açık söyler. I’m duyguyu değiştirmez; yalnızca sad öncesindeki başlangıcı kısaltır.', pl: 'I’m sad krótko i szczerze mówi o smutku. I’m nie zmienia uczucia, tylko skraca początek przed sad.'
  },
  tired: {
    ru: 'I’m tired экономит силы даже в самой фразе: «я устал / устала». I’m произносится одним куском, а tired несёт всю усталость.', uk: 'I’m tired заощаджує сили навіть у самій фразі: «я втомився / втомилася». I’m вимовляється одним шматком, а tired несе всю втому.', es: 'I’m tired ahorra energía incluso al decirlo: «estoy cansado / cansada». I’m sale en un bloque y tired lleva todo el cansancio.', 'pt-BR': 'I’m tired economiza energia até na própria frase: «estou cansado / cansada». I’m sai em um bloco e tired carrega o cansaço.', vi: 'I’m tired tiết kiệm sức ngay trong câu: “tôi mệt”. I’m bật ra thành một cụm, còn tired mang trọn cảm giác mệt.', id: 'I’m tired bahkan menghemat tenaga saat diucapkan: “saya lelah”. I’m keluar sebagai satu blok dan tired membawa rasa lelahnya.', tr: 'I’m tired söylerken bile enerji tasarrufu yapar: “yorgunum”. I’m tek parça çıkar, yorgunluğu tired taşır.', pl: 'I’m tired oszczędza siły nawet w samym zdaniu: „jestem zmęczony / zmęczona”. I’m brzmi jak jeden blok, a tired niesie zmęczenie.'
  },
  fine: {
    ru: 'I’m fine — спокойное «у меня всё нормально» без лишней церемонии. Короткое I’m открывает ответ, а fine мягко его завершает.', uk: 'I’m fine — спокійне «у мене все гаразд» без зайвої церемонії. Коротке I’m відкриває відповідь, а fine м’яко її завершує.', es: 'I’m fine es un tranquilo «estoy bien» sin ceremonia. La forma corta I’m abre la respuesta y fine la cierra con suavidad.', 'pt-BR': 'I’m fine é um tranquilo «estou bem» sem cerimônia. A forma curta I’m abre a resposta e fine a encerra suavemente.', vi: 'I’m fine là một câu “tôi ổn” bình thản, không cần nghi thức. I’m mở câu thật gọn, còn fine khép lại nhẹ nhàng.', id: 'I’m fine adalah “saya baik-baik saja” yang tenang tanpa basa-basi. I’m membuka jawaban dengan ringkas dan fine menutupnya dengan lembut.', tr: 'I’m fine törensiz, sakin bir “iyiyim” cevabıdır. Kısa I’m yanıtı açar, fine yumuşakça bitirir.', pl: 'I’m fine to spokojne „wszystko w porządku” bez ceremonii. Krótkie I’m otwiera odpowiedź, a fine łagodnie ją kończy.'
  },
} satisfies Readonly<Record<string, Readonly<Record<Locale, string>>>>;

const THIRD_TRAPS = {
  here: { value: 'hire', reasonCode: 'phonetic:here:hire_vowel', trapType: 'phonetic' as const, why: 'hire начинается похоже, но означает «нанимать»; место «здесь» передаёт here.', reason: { ru: 'hire начинается похоже, но означает «нанимать»; место «здесь» передаёт here.', uk: 'hire починається схоже, але означає «наймати»; місце «тут» передає here.', es: 'hire empieza de forma parecida, pero significa «contratar»; el lugar «aquí» se expresa con here.', 'pt-BR': 'hire começa de modo parecido, mas significa «contratar»; o lugar «aqui» é here.', vi: 'hire có phần đầu gần giống nhưng nghĩa là “thuê”; nơi “ở đây” phải là here.', id: 'hire terdengar mirip di awal tetapi berarti “mempekerjakan”; tempat “di sini” ialah here.', tr: 'hire benzer başlar ama “işe almak” demektir; “burada” anlamı here ile verilir.', pl: 'hire zaczyna się podobnie, ale znaczy „zatrudniać”; miejsce „tutaj” wyraża here.' } },
  ready: { value: 'read', reasonCode: 'orthographic:ready:read_missing_y', trapType: 'orthographic' as const, why: 'read похоже на ready без y, но говорит о чтении; готовность передаёт ready.', reason: { ru: 'read похоже на ready без y, но говорит о чтении; готовность передаёт ready.', uk: 'read схоже на ready без y, але стосується читання; готовність передає ready.', es: 'read se parece a ready sin y, pero habla de leer; la preparación se expresa con ready.', 'pt-BR': 'read parece ready sem y, mas fala de ler; prontidão se expressa com ready.', vi: 'read trông giống ready thiếu y nhưng nói về việc đọc; trạng thái sẵn sàng là ready.', id: 'read tampak seperti ready tanpa y tetapi berkaitan dengan membaca; kesiapan ialah ready.', tr: 'read, y harfi eksik ready gibi görünür ama okumayı anlatır; hazır olma ready ile söylenir.', pl: 'read wygląda jak ready bez y, ale dotyczy czytania; gotowość wyraża ready.' } },
  happy: { value: 'happen', reasonCode: 'orthographic:happy:happen_ending', trapType: 'orthographic' as const, why: 'happen делит начало с happy, но означает «случаться»; радость называет happy.', reason: { ru: 'happen делит начало с happy, но означает «случаться»; радость называет happy.', uk: 'happen має спільний початок із happy, але означає «траплятися»; радість називає happy.', es: 'happen comparte el inicio de happy, pero significa «suceder»; la alegría se expresa con happy.', 'pt-BR': 'happen tem o mesmo começo de happy, mas significa «acontecer»; alegria se expressa com happy.', vi: 'happen có phần đầu giống happy nhưng nghĩa là “xảy ra”; cảm giác vui là happy.', id: 'happen berawal seperti happy tetapi berarti “terjadi”; rasa senang ialah happy.', tr: 'happen, happy ile aynı başlangıcı paylaşır ama “olmak” demektir; sevinci happy anlatır.', pl: 'happen ma ten sam początek co happy, ale znaczy „wydarzyć się”; radość wyraża happy.' } },
  sad: { value: 'said', reasonCode: 'orthographic:sad:said_extra_i', trapType: 'orthographic' as const, why: 'said отличается от sad одной i и означает «сказал»; чувство грусти называет sad.', reason: { ru: 'said отличается от sad одной i и означает «сказал»; чувство грусти называет sad.', uk: 'said відрізняється від sad однією i й означає «сказав»; почуття смутку називає sad.', es: 'said se distingue de sad por una i y significa «dijo»; la tristeza se expresa con sad.', 'pt-BR': 'said difere de sad por uma i e significa «disse»; tristeza se expressa com sad.', vi: 'said khác sad ở chữ i và nghĩa là “đã nói”; cảm giác buồn là sad.', id: 'said berbeda dari sad dengan huruf i dan berarti “berkata”; perasaan sedih ialah sad.', tr: 'said, sad biçiminden bir i ile ayrılır ve “söyledi” demektir; üzüntüyü sad anlatır.', pl: 'said różni się od sad literą i i znaczy „powiedział”; smutek wyraża sad.' } },
  tired: { value: 'tried', reasonCode: 'orthographic:tired:tried_transposition', trapType: 'orthographic' as const, why: 'tried переставляет буквы tired и означает «попробовал»; усталость передаёт tired.', reason: { ru: 'tried переставляет буквы tired и означает «попробовал»; усталость передаёт tired.', uk: 'tried переставляє літери tired й означає «спробував»; втому передає tired.', es: 'tried cambia el orden de las letras de tired y significa «intentó»; el cansancio se expresa con tired.', 'pt-BR': 'tried troca a ordem das letras de tired e significa «tentou»; cansaço se expressa com tired.', vi: 'tried đảo vị trí chữ trong tired và nghĩa là “đã thử”; trạng thái mệt là tired.', id: 'tried menukar urutan huruf pada tired dan berarti “mencoba”; rasa lelah ialah tired.', tr: 'tried, tired harflerinin yerini değiştirir ve “denedi” demektir; yorgunluğu tired anlatır.', pl: 'tried przestawia litery tired i znaczy „spróbował”; zmęczenie wyraża tired.' } },
  fine: { value: 'find', reasonCode: 'orthographic:fine:find_final_letter', trapType: 'orthographic' as const, why: 'find меняет последнюю букву fine и означает «находить»; нормальное состояние передаёт fine.', reason: { ru: 'find меняет последнюю букву fine и означает «находить»; нормальное состояние передаёт fine.', uk: 'find змінює останню літеру fine й означає «знаходити»; нормальний стан передає fine.', es: 'find cambia la última letra de fine y significa «encontrar»; estar bien se expresa con fine.', 'pt-BR': 'find muda a última letra de fine e significa «encontrar»; estar bem se expressa com fine.', vi: 'find đổi chữ cuối của fine và nghĩa là “tìm thấy”; trạng thái ổn là fine.', id: 'find mengubah huruf terakhir fine dan berarti “menemukan”; keadaan baik ialah fine.', tr: 'find, fine sözcüğünün son harfini değiştirir ve “bulmak” demektir; iyi olma durumu fine ile verilir.', pl: 'find zmienia ostatnią literę fine i znaczy „znaleźć”; dobry stan wyraża fine.' } },
} satisfies Readonly<Record<typeof KEYS[number], Readonly<{ value: string; reasonCode: string; trapType: 'phonetic' | 'orthographic'; why: string; reason: Readonly<Record<Locale, string>> }>>>;

const BASES = Object.freeze([
  EPISODE_01_SESSION_01_WORD_FIRST_PHRASES[0]!,
  EPISODE_01_SESSION_01_WORD_FIRST_PHRASES[1]!,
  ...EPISODE_01_SESSION_02_MODE_NATIVE_PHRASES,
]);
const KEYS = ['here', 'ready', 'happy', 'sad', 'tired', 'fine'] as const;
const CONTRACTION_WORD = Object.freeze({
  correct: "I'm", category: 'contraction', distractors: [
    { value: 'Im', reasonCode: 'orthographic:im:missing_apostrophe', trapType: 'orthographic' as const, why: CONTRACTION.ru.missing },
    { value: "I'am", reasonCode: 'orthographic:im:apostrophe_before_a', trapType: 'orthographic' as const, why: CONTRACTION.ru.misplaced },
    { value: "I'm am", reasonCode: 'grammar:im:duplicated_am', trapType: 'grammar' as const, why: CONTRACTION.ru.doubled },
  ],
});

function localizedDetails(base: EpisodeSourcePhrase, key: typeof KEYS[number]): NonNullable<EpisodeSourcePhrase['localizedDetails']> {
  return Object.fromEntries(LOCALES.map((locale) => {
    const source = base.localizedDetails?.[locale];
    if (!source) throw new Error(`session_03_base_locale_missing:${key}:${locale}`);
    const lexical = source.words.at(-1)!;
    const third = THIRD_TRAPS[key];
    const copy = CONTRACTION[locale];
    const contractionDistractors = [
      { value: 'Im', reason: copy.missing, trapType: 'orthographic' as const },
      { value: "I'am", reason: copy.misplaced, trapType: 'orthographic' as const },
      { value: "I'm am", reason: copy.doubled, trapType: 'grammar' as const },
    ];
    const lexicalWithThird = {
      ...lexical,
      distractors: lexical.distractors.some((entry) => entry.value === third.value)
        ? [...lexical.distractors]
        : [...lexical.distractors, { value: third.value, reason: third.reason[locale], trapType: third.trapType }],
    };
    return [locale, {
      meaning: source.meaning,
      explanation: EXPLANATIONS[key][locale],
      distractors: [...contractionDistractors, ...lexicalWithThird.distractors],
      words: [
        { correct: "I'm", prompt: copy.prompt, distractors: contractionDistractors },
        lexicalWithThird,
      ],
    } satisfies EpisodeSourcePhraseLocalizedDetails];
  })) as NonNullable<EpisodeSourcePhrase['localizedDetails']>;
}

// Compatibility inventory for later, still-forbidden draft sessions. Those
// modules historically learned the four full-form feeling phrases from this
// export. Session 03 itself deliberately uses the separate contraction export
// below, so its approved boundary cannot leak into later drafts or vice versa.
export const EPISODE_01_SESSION_03_WORD_FIRST_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([...EPISODE_01_SESSION_02_MODE_NATIVE_PHRASES, EPISODE_01_LEGACY_NOT_SAD_PHRASE]);

export const EPISODE_01_SESSION_03_CONTRACTION_PHRASES: readonly EpisodeSourcePhrase[] = Object.freeze(
  BASES.map((base, index) => {
    const key = KEYS[index]!;
    const details = localizedDetails(base, key);
    return {
      id: `e01-s03-im-${key}`,
      english: `I'm ${key}`,
      russian: details.ru.meaning,
      explanation: details.ru.explanation,
      words: [CONTRACTION_WORD, {
        ...base.words.at(-1)!,
        distractors: base.words.at(-1)!.distractors.some((entry) => entry.value === THIRD_TRAPS[key].value)
          ? [...base.words.at(-1)!.distractors]
          : [...base.words.at(-1)!.distractors, {
            value: THIRD_TRAPS[key].value,
            reasonCode: THIRD_TRAPS[key].reasonCode,
            trapType: THIRD_TRAPS[key].trapType,
            why: THIRD_TRAPS[key].why,
          }],
      }],
      localizedDetails: details,
      features: ['copula_be', 'first_person_singular', 'contraction_im', ...base.features],
    };
  }),
);
