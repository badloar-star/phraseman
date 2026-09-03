import type { LearningV2ModeNativePayloadV1 } from "../../contracts/mode_native_payload_v1";
import type { EpisodeSourcePhrase } from "./episode_01_source_v1";
import { LESSON2_RETRIEVAL_VOCABULARY_V1 } from "./lesson2_retrieval_vocabulary_v1";
import {
  expandLocalized,
  type LocalizedSource,
  type SessionModeNativePracticeSourceV1,
  type SessionSourceIntroPage,
  type SessionVocabularySourceV1,
} from "./session_shard_from_source_v1";

type NewWord = "sure" | "interested" | "comfortable";
type Choice = NewWord | "responsible" | "independent" | "dependent";
type Locale = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";

const LOCALES: readonly Locale[] = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"];
const NEGATION = "en.grammar.present_be_questions_negatives.negation";
const localized = (
  ru: string,
  uk: string,
  es: string,
  pt: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
): LocalizedSource => ({ ru, uk, es, "pt-BR": pt, vi, id, tr, pl });
const sameEnglish = (value: string): LocalizedSource =>
  localized(value, value, value, value, value, value, value, value);

export const EPISODE_02_SESSION_01_LEXICAL_SEEDS_V2: Readonly<
  Record<NewWord, LocalizedSource>
> = Object.freeze({
  sure: localized(
    "уверенный: считает что-то верным и не сомневается",
    "упевнений: вважає щось правильним і не сумнівається",
    "seguro: considera algo cierto y no tiene dudas",
    "certo: considera algo verdadeiro e não tem dúvidas",
    "chắc chắn: tin điều gì đó là đúng và không nghi ngờ",
    "yakin: menganggap sesuatu benar dan tidak ragu",
    "emin: bir şeyin doğru olduğuna inanır ve kuşku duymaz",
    "pewny: uważa coś za prawdziwe i nie ma wątpliwości",
  ),
  interested: localized(
    "заинтересованный: хочет узнать больше или участвовать",
    "зацікавлений: хоче дізнатися більше або долучитися",
    "interesado: quiere saber más o participar",
    "interessado: quer saber mais ou participar",
    "quan tâm: muốn biết thêm hoặc tham gia",
    "tertarik: ingin tahu lebih banyak atau ikut serta",
    "ilgili: daha fazlasını öğrenmek ya da katılmak ister",
    "zainteresowany: chce wiedzieć więcej lub wziąć udział",
  ),
  comfortable: localized(
    "чувствующий себя удобно и спокойно, без давления или дискомфорта",
    "той, кому зручно й спокійно, без тиску чи дискомфорту",
    "cómodo: se siente a gusto, sin presión ni molestia",
    "confortável: sente-se à vontade, sem pressão ou incômodo",
    "thoải mái: cảm thấy dễ chịu, không bị áp lực hay khó chịu",
    "nyaman: merasa santai tanpa tekanan atau gangguan",
    "rahat: baskı ya da rahatsızlık olmadan huzurlu hisseder",
    "czujący się wygodnie i swobodnie, bez nacisku ani dyskomfortu",
  ),
});

const retrievalMeanings = Object.freeze({
  responsible: LESSON2_RETRIEVAL_VOCABULARY_V1[0]!.meaning,
  independent: LESSON2_RETRIEVAL_VOCABULARY_V1[1]!.meaning,
  dependent: LESSON2_RETRIEVAL_VOCABULARY_V1[2]!.meaning,
});
const meanings: Readonly<Record<Choice, LocalizedSource>> = Object.freeze({
  ...EPISODE_02_SESSION_01_LEXICAL_SEEDS_V2,
  ...retrievalMeanings,
});
const FEEDBACK_LABELS: Readonly<Record<Choice, LocalizedSource>> = Object.freeze({
  sure: localized("уверен без сомнений", "впевнений без сумнівів", "seguro, sin dudas", "certo, sem dúvida", "chắc chắn, không nghi ngờ", "yakin tanpa ragu", "kuşkusuz emin", "pewny, bez wątpliwości"),
  interested: localized("хочет узнать или участвовать", "хоче дізнатися або долучитися", "quiere saber o participar", "quer saber ou participar", "muốn biết hoặc tham gia", "ingin tahu atau ikut", "öğrenmek ya da katılmak istiyor", "chce wiedzieć lub uczestniczyć"),
  comfortable: localized("чувствует себя удобно и спокойно", "почувається зручно й спокійно", "se siente cómodo y tranquilo", "sente-se confortável e tranquilo", "cảm thấy thoải mái và yên tâm", "merasa nyaman dan tenang", "rahat ve sakin hissediyor", "czuje się swobodnie i spokojnie"),
  responsible: localized("выполняет обязанности", "виконує обов’язки", "cumple sus deberes", "cumpre seus deveres", "làm tròn trách nhiệm", "menjalankan tanggung jawab", "sorumluluklarını yerine getiriyor", "wypełnia obowiązki"),
  independent: localized("действует без чужой помощи", "діє без чужої допомоги", "actúa sin ayuda ajena", "age sem ajuda alheia", "hành động không cần người khác giúp", "bertindak tanpa bantuan orang lain", "başkasının yardımı olmadan hareket ediyor", "działa bez cudzej pomocy"),
  dependent: localized("нуждается в чужой помощи", "потребує чужої допомоги", "necesita ayuda ajena", "precisa de ajuda alheia", "cần người khác giúp", "membutuhkan bantuan orang lain", "başkasının yardımına ihtiyaç duyuyor", "potrzebuje cudzej pomocy"),
});
const TRAPS: Readonly<Record<NewWord, readonly Choice[]>> = Object.freeze({
  sure: ["interested", "comfortable", "responsible"],
  interested: ["sure", "comfortable", "independent"],
  comfortable: ["interested", "sure", "dependent"],
});

const lexicalFeedback = (target: Choice, selected: Choice): LocalizedSource => localized(
  `${selected} — «${FEEDBACK_LABELS[selected].ru}»; нужен ${target} — «${FEEDBACK_LABELS[target].ru}».`,
  `${selected} — «${FEEDBACK_LABELS[selected].uk}»; потрібен ${target} — «${FEEDBACK_LABELS[target].uk}».`,
  `${selected} — «${FEEDBACK_LABELS[selected].es}»; elige ${target} — «${FEEDBACK_LABELS[target].es}».`,
  `${selected} — “${FEEDBACK_LABELS[selected]["pt-BR"]}”; use ${target} — “${FEEDBACK_LABELS[target]["pt-BR"]}”.`,
  `${selected} — “${FEEDBACK_LABELS[selected].vi}”; chọn ${target} — “${FEEDBACK_LABELS[target].vi}”.`,
  `${selected} — “${FEEDBACK_LABELS[selected].id}”; pilih ${target} — “${FEEDBACK_LABELS[target].id}”.`,
  `${selected} — “${FEEDBACK_LABELS[selected].tr}”; ${target} gerekir — “${FEEDBACK_LABELS[target].tr}”.`,
  `${selected} — „${FEEDBACK_LABELS[selected].pl}”; wybierz ${target} — „${FEEDBACK_LABELS[target].pl}”.`,
);

export const EPISODE_02_SESSION_01_TITLE_V2 = localized(
  "Когда состояние неверно",
  "Коли стан не є правдивим",
  "Cuando un estado no es cierto",
  "Quando um estado não é verdadeiro",
  "Khi một trạng thái không đúng",
  "Ketika suatu keadaan tidak benar",
  "Bir durum doğru olmadığında",
  "Gdy dany stan nie jest prawdziwy",
);
export const EPISODE_02_SESSION_01_SUMMARY_V2 = localized(
  "Ставим not сразу после am, is или are и различаем sure, interested и comfortable.",
  "Ставимо not одразу після am, is або are та розрізняємо sure, interested і comfortable.",
  "Colocamos not justo después de am, is o are y distinguimos sure, interested y comfortable.",
  "Colocamos not logo depois de am, is ou are e distinguimos sure, interested e comfortable.",
  "Đặt not ngay sau am, is hoặc are và phân biệt sure, interested với comfortable.",
  "Menempatkan not tepat setelah am, is, atau are serta membedakan sure, interested, dan comfortable.",
  "Not sözcüğünü am, is ya da are sonrasına koyup sure, interested ve comfortable anlamlarını ayırırız.",
  "Stawiamy not bezpośrednio po am, is lub are i rozróżniamy sure, interested oraz comfortable.",
);
export const EPISODE_02_SESSION_01_GOAL_V2 = localized(
  "Точно сказать, что человек не уверен, не заинтересован или чувствует себя некомфортно.",
  "Точно сказати, що людина не впевнена, не зацікавлена або почувається некомфортно.",
  "Decir con precisión que alguien no está seguro, no está interesado o no se siente cómodo.",
  "Dizer com precisão que alguém não está certo, não está interessado ou não se sente confortável.",
  "Nói chính xác rằng ai đó không chắc chắn, không quan tâm hoặc không thấy thoải mái.",
  "Mengatakan dengan tepat bahwa seseorang tidak yakin, tidak tertarik, atau tidak merasa nyaman.",
  "Birinin emin, ilgili ya da rahat olmadığını doğru biçimde söylemek.",
  "Dokładnie powiedzieć, że ktoś nie jest pewny, zainteresowany lub nie czuje się komfortowo.",
);

const introPage = (
  kind: "concept" | "formula" | "trap",
  testedDimension: string,
  title: LocalizedSource,
  body: LocalizedSource,
  prompt: LocalizedSource,
  choices: readonly [string, string, string],
  explanation: LocalizedSource,
): SessionSourceIntroPage => ({
  kind,
  title,
  body,
  question: {
    grammarFeatureId: NEGATION,
    testedDimension,
    prompt,
    choices: [sameEnglish(choices[0]), sameEnglish(choices[1]), sameEnglish(choices[2])],
    correctChoiceIndex: 0,
    explanation,
  },
});

export const EPISODE_02_SESSION_01_INTRO_V2 = Object.freeze([
  introPage(
    "concept",
    "negation_meaning",
    localized("Not отменяет состояние", "Not заперечує стан", "Not niega el estado", "Not nega o estado", "Not phủ định trạng thái", "Not menyangkal keadaan", "Not durumu olumsuz yapar", "Not zaprzecza stanowi"),
    localized(
      "I am sure. — «я уверен»; I am not sure. — «я не уверен»: not отменяет состояние sure.",
      "I am sure. — «я впевнений»; I am not sure. — «я не впевнений»: not заперечує стан sure.",
      "I am sure. — «estoy seguro»; I am not sure. — «no estoy seguro»: not niega el estado sure.",
      "I am sure. — “estou certo”; I am not sure. — “não estou certo”: not nega o estado sure.",
      "I am sure. — “tôi chắc chắn”; I am not sure. — “tôi không chắc”: not phủ định trạng thái sure.",
      "I am sure. — “saya yakin”; I am not sure. — “saya tidak yakin”: not menyangkal keadaan sure.",
      "I am sure. — “eminim”; I am not sure. — “emin değilim”: not, sure durumunu olumsuz yapar.",
      "I am sure. — „jestem pewny”; I am not sure. — „nie jestem pewny”: not zaprzecza stanowi sure.",
    ),
    localized("Говорящий сомневается. Выберите точную фразу.", "Мовець сумнівається. Оберіть точну фразу.", "Quien habla tiene dudas. Elige la frase exacta.", "Quem fala tem dúvidas. Escolha a frase exata.", "Người nói còn nghi ngờ. Chọn câu chính xác.", "Penutur masih ragu. Pilih kalimat yang tepat.", "Konuşanın kuşkusu var. Tam cümleyi seçin.", "Mówiący ma wątpliwości. Wybierz dokładne zdanie."),
    ["I am not sure.", "I am sure.", "I not am sure."],
    localized("I am not sure. сохраняет I am и добавляет not сразу после am: состояние отрицается.", "I am not sure. зберігає I am і додає not одразу після am: стан заперечено.", "I am not sure. conserva I am y añade not justo después de am: el estado queda negado.", "I am not sure. mantém I am e acrescenta not logo depois de am: o estado é negado.", "I am not sure. giữ I am và thêm not ngay sau am: trạng thái bị phủ định.", "I am not sure. mempertahankan I am dan menambah not tepat setelah am: keadaannya disangkal.", "I am not sure. I am yapısını korur ve not sözcüğünü am sonrasına ekler: durum olumsuzdur.", "I am not sure. zachowuje I am i dodaje not zaraz po am: stan zostaje zaprzeczony."),
  ),
  introPage(
    "formula",
    "negation_form",
    localized("Be, затем not", "Be, потім not", "Be y después not", "Be e depois not", "Be rồi đến not", "Be lalu not", "Önce be, sonra not", "Be, a potem not"),
    localized(
      "Формула одна: участник + am/is/are + not + описание. She is not interested. — she, затем is, затем not. Знакомая форма be остаётся на своём месте.",
      "Формула одна: учасник + am/is/are + not + опис. She is not interested. — she, потім is, потім not. Знайома форма be лишається на своєму місці.",
      "La fórmula es sujeto + am/is/are + not + descripción. She is not interested. lleva she, después is y después not. La forma conocida de be no se mueve.",
      "A fórmula é sujeito + am/is/are + not + descrição. She is not interested. traz she, depois is e depois not. A forma conhecida de be não muda de lugar.",
      "Công thức là chủ thể + am/is/are + not + mô tả. She is not interested. có she, rồi is, rồi not. Dạng be đã biết vẫn ở đúng chỗ.",
      "Rumusnya pelaku + am/is/are + not + deskripsi. She is not interested. memakai she, lalu is, lalu not. Bentuk be yang dikenal tetap di tempatnya.",
      "Formül özne + am/is/are + not + açıklamadır. She is not interested. içinde önce she, sonra is, ardından not gelir. Bilinen be biçimi yerinde kalır.",
      "Wzór to podmiot + am/is/are + not + opis. W She is not interested. najpierw jest she, potem is, a następnie not. Znana forma be pozostaje na miejscu.",
    ),
    localized("Она не заинтересована. Выберите правильный порядок.", "Вона не зацікавлена. Оберіть правильний порядок.", "Ella no está interesada. Elige el orden correcto.", "Ela não está interessada. Escolha a ordem correta.", "Cô ấy không quan tâm. Chọn đúng thứ tự.", "Dia tidak tertarik. Pilih urutan yang tepat.", "O ilgili değil. Doğru sırayı seçin.", "Ona nie jest zainteresowana. Wybierz poprawny szyk."),
    ["She is not interested.", "She not is interested.", "She is interested not."],
    localized("She is not interested. ставит not после is. Два других варианта переносят not в неверную позицию.", "She is not interested. ставить not після is. Два інші варіанти переносять not у хибну позицію.", "She is not interested. coloca not después de is. Las otras opciones mueven not a una posición incorrecta.", "She is not interested. coloca not depois de is. As outras opções levam not para uma posição errada.", "She is not interested. đặt not sau is. Hai lựa chọn kia chuyển not sang vị trí sai.", "She is not interested. menempatkan not setelah is. Dua pilihan lain memindahkan not ke posisi yang salah.", "She is not interested. not sözcüğünü is sonrasına koyar. Diğer seçeneklerde not yanlış konumdadır.", "She is not interested. stawia not po is. Pozostałe opcje przenoszą not w błędne miejsce."),
  ),
  introPage(
    "trap",
    "negation_position",
    localized("Not не прыгает", "Not не стрибає", "Not no salta", "Not não pula", "Not không nhảy vị trí", "Not tidak berpindah-pindah", "Not yer değiştirmez", "Not nie skacze"),
    localized(
      "We're not comfortable. Здесь We're уже содержит We are, а not стоит перед comfortable.",
      "We're not comfortable. Тут We're уже містить We are, а not стоїть перед comfortable.",
      "We're not comfortable. Aquí We're ya contiene We are y not va antes de comfortable.",
      "We're not comfortable. Aqui We're já contém We are e not vem antes de comfortable.",
      "We're not comfortable. Ở đây We're đã chứa We are và not đứng trước comfortable.",
      "We're not comfortable. Di sini We're sudah memuat We are dan not berada sebelum comfortable.",
      "We're not comfortable. Burada We're, We are biçimini içerir ve not comfortable önünde durur.",
      "We're not comfortable. Tutaj We're zawiera We are, a not stoi przed comfortable.",
    ),
    localized("Нам некомфортно. Выберите фразу без ошибки порядка.", "Нам некомфортно. Оберіть фразу без помилки в порядку.", "No estamos cómodos. Elige la frase sin error de orden.", "Não estamos confortáveis. Escolha a frase sem erro de ordem.", "Chúng tôi không thoải mái. Chọn câu đúng trật tự.", "Kami tidak nyaman. Pilih kalimat dengan urutan yang benar.", "Rahat değiliz. Sözcük sırası doğru cümleyi seçin.", "Nie czujemy się komfortowo. Wybierz zdanie z poprawnym szykiem."),
    ["We're not comfortable.", "We not comfortable.", "We're comfortable."],
    localized("We're not comfortable. сохраняет We are внутри We're и ставит not перед comfortable.", "We're not comfortable. зберігає We are усередині We're і ставить not перед comfortable.", "We're not comfortable. conserva We are dentro de We're y coloca not antes de comfortable.", "We're not comfortable. mantém We are dentro de We're e coloca not antes de comfortable.", "We're not comfortable. giữ We are trong We're và đặt not trước comfortable.", "We're not comfortable. mempertahankan We are di dalam We're dan menaruh not sebelum comfortable.", "We're not comfortable. We are biçimini We're içinde korur ve not sözcüğünü comfortable önüne koyar.", "We're not comfortable. zachowuje We are w We're i stawia not przed comfortable."),
  ),
] as const);

const vocabulary = (target: NewWord): SessionVocabularySourceV1 => {
  const distractors = TRAPS[target].map((value) => ({
    value,
    reasonCode: `${target}-not-${value}`,
    trapType: "semantic_neighbor" as const,
    feedback: lexicalFeedback(target, value),
  }));
  return {
    id: `e02-s01-word-${target}`,
    target,
    features: ["adjective_state_and_attitude"],
    meaning: EPISODE_02_SESSION_01_LEXICAL_SEEDS_V2[target],
    contacts: {
      recognize: {
        guidance: localized(`Найдите слово ${target}.`, `Знайдіть слово ${target}.`, `Encuentra la palabra ${target}.`, `Encontre a palavra ${target}.`, `Tìm từ ${target}.`, `Temukan kata ${target}.`, `${target} sözcüğünü bulun.`, `Znajdź słowo ${target}.`),
        distractors,
      },
      retrieve_meaning: {
        guidance: localized(`Вспомните точный смысл ${target}.`, `Пригадайте точний зміст ${target}.`, `Recuerda el sentido exacto de ${target}.`, `Lembre o sentido exato de ${target}.`, `Nhớ lại nghĩa chính xác của ${target}.`, `Ingat arti tepat ${target}.`, `${target} sözcüğünün tam anlamını hatırlayın.`, `Przypomnij sobie dokładne znaczenie ${target}.`),
        distractors,
      },
      build_form: {
        guidance: localized(`Выберите целое слово ${target}.`, `Оберіть ціле слово ${target}.`, `Elige la palabra completa ${target}.`, `Escolha a palavra inteira ${target}.`, `Chọn nguyên từ ${target}.`, `Pilih kata utuh ${target}.`, `Bütün ${target} sözcüğünü seçin.`, `Wybierz całe słowo ${target}.`),
        distractors,
      },
    },
  };
};

export const EPISODE_02_SESSION_01_VOCABULARY_V2 = Object.freeze([
  vocabulary("sure"),
  vocabulary("interested"),
  vocabulary("comfortable"),
]);

type PhraseSpec = Readonly<{
  id: string;
  subject: "I" | "She" | "We" | "He" | "They";
  be: "am" | "is" | "are";
  adjective: Choice;
  english: string;
  meaning: LocalizedSource;
  explanation: LocalizedSource;
}>;
const PHRASE_SPECS: readonly PhraseSpec[] = Object.freeze([
  {
    id: "e02-s01-i-am-not-sure", subject: "I", be: "am", adjective: "sure", english: "I am not sure.",
    meaning: localized("Я не уверен.", "Я не впевнений.", "No estoy seguro.", "Não tenho certeza.", "Tôi không chắc.", "Saya tidak yakin.", "Emin değilim.", "Nie jestem pewny."),
    explanation: localized("Так говорят, когда у говорящего есть сомнение. Форма I am остаётся знакомой. Not стоит после am и отменяет состояние sure.", "Мовець повідомляє про сумнів. Not стоїть після am і заперечує стан sure.", "Quien habla expresa duda. Not va después de am y niega el estado sure.", "Quem fala expressa dúvida. Not vem depois de am e nega o estado sure.", "Người nói bày tỏ sự nghi ngờ. Not đứng sau am và phủ định trạng thái sure.", "Penutur menyatakan keraguan. Not setelah am menyangkal keadaan sure.", "Konuşan kuşkusunu belirtir. Not, am sonrasında sure durumunu olumsuz yapar.", "Mówiący wyraża wątpliwość. Not stoi po am i przeczy stanowi sure."),
  },
  {
    id: "e02-s01-she-is-not-interested", subject: "She", be: "is", adjective: "interested", english: "She is not interested.",
    meaning: localized("Она не заинтересована.", "Вона не зацікавлена.", "Ella no está interesada.", "Ela não está interessada.", "Cô ấy không quan tâm.", "Dia tidak tertarik.", "O ilgili değil.", "Ona nie jest zainteresowana."),
    explanation: localized("Так говорят о женщине, которая не хочет узнавать больше или участвовать. Для she нужна форма is. Not идёт сразу после is.", "Йдеться про жінку, яка не хоче дізнаватися більше або долучатися. Not стоїть одразу після is.", "Habla de una mujer que no quiere saber más ni participar. Not va justo después de is.", "Fala de uma mulher que não quer saber mais nem participar. Not vem logo depois de is.", "Câu nói về một phụ nữ không muốn biết thêm hay tham gia. Not đứng ngay sau is.", "Kalimat ini tentang perempuan yang tidak ingin tahu lebih banyak atau ikut serta. Not tepat setelah is.", "Daha fazlasını öğrenmek ya da katılmak istemeyen bir kadını anlatır. Not hemen is sonrasındadır.", "Mowa o kobiecie, która nie chce wiedzieć więcej ani brać udziału. Not stoi zaraz po is."),
  },
  {
    id: "e02-s01-we-are-not-comfortable", subject: "We", be: "are", adjective: "comfortable", english: "We are not comfortable.",
    meaning: localized("Нам некомфортно.", "Нам некомфортно.", "No estamos cómodos.", "Não estamos confortáveis.", "Chúng tôi không thoải mái.", "Kami tidak nyaman.", "Rahat değiliz.", "Nie czujemy się komfortowo."),
    explanation: localized("Так группа сообщает, что всем её участникам неудобно или неспокойно в ситуации. Для we нужна знакомая форма are. Not стоит сразу после are.", "Група говорить, що їй незручно або неспокійно. Not стоїть після are.", "Un grupo dice que no se siente a gusto. Not va después de are.", "Um grupo diz que não se sente à vontade. Not vem depois de are.", "Một nhóm nói rằng họ không thấy thoải mái. Not đứng sau are.", "Sebuah kelompok mengatakan mereka tidak nyaman. Not setelah are.", "Bir grup rahat hissetmediğini söyler. Not, are sonrasındadır.", "Grupa mówi, że nie czuje się swobodnie. Not stoi po are."),
  },
  {
    id: "e02-s01-he-is-not-responsible", subject: "He", be: "is", adjective: "responsible", english: "He is not responsible.",
    meaning: localized("Он не ответственен.", "Він не відповідальний.", "Él no es responsable.", "Ele não é responsável.", "Anh ấy không có trách nhiệm.", "Dia tidak bertanggung jawab.", "O sorumlu değil.", "On nie jest odpowiedzialny."),
    explanation: localized("Так отрицают знакомое качество responsible и сообщают, что мужчина не выполняет обязанности. Для he нужна форма is. Not остаётся сразу после is.", "Це перенесення заперечення на знайоме responsible. He вимагає is, а not лишається після is.", "Transfiere la negación al conocido responsible. He exige is y not permanece después de is.", "Transfere a negação para o conhecido responsible. He exige is e not continua depois de is.", "Đây là chuyển phủ định sang từ responsible đã biết. He đi với is, còn not vẫn sau is.", "Ini memindahkan negasi ke responsible yang sudah dikenal. He memakai is dan not tetap setelah is.", "Olumsuzluk bilinen responsible sözcüğüne aktarılır. He ile is gerekir; not yine is sonrasındadır.", "To przeniesienie przeczenia na znane responsible. He wymaga is, a not pozostaje po is."),
  },
  {
    id: "e02-s01-they-are-not-dependent", subject: "They", be: "are", adjective: "dependent", english: "They are not dependent.",
    meaning: localized("Они не зависимы.", "Вони не залежні.", "No son dependientes.", "Eles não são dependentes.", "Họ không phụ thuộc.", "Mereka tidak bergantung.", "Onlar bağımlı değil.", "Oni nie są zależni."),
    explanation: localized("Так говорят, когда нескольким людям не нужна чужая опора. Для they нужна форма are. Затем сразу идёт not.", "Незалежне перенесення: кільком людям не потрібна чужа опора. They вимагає are, потім іде not.", "Transferencia independiente: varias personas no necesitan apoyo ajeno. They exige are y después va not.", "Transferência independente: várias pessoas não precisam de apoio alheio. They exige are e depois vem not.", "Bài chuyển độc lập: nhiều người không cần chỗ dựa của người khác. They đi với are rồi đến not.", "Transfer mandiri: beberapa orang tidak membutuhkan dukungan orang lain. They memakai are lalu not.", "Bağımsız aktarım: birkaç kişi başkasının desteğine ihtiyaç duymaz. They ile are, ardından not gelir.", "Niezależny transfer: kilka osób nie potrzebuje cudzej pomocy. They wymaga are, po którym stoi not."),
  },
]);

const ADJECTIVE_TRAPS: Readonly<Record<Choice, readonly Choice[]>> = Object.freeze({
  sure: ["interested", "comfortable", "responsible"],
  interested: ["sure", "comfortable", "independent"],
  comfortable: ["interested", "sure", "dependent"],
  responsible: ["independent", "dependent", "sure"],
  independent: ["dependent", "responsible", "comfortable"],
  dependent: ["independent", "responsible", "interested"],
});
const subjectTraps = (subject: string): string[] => {
  const subjects = ["I", "She", "We", "He", "They"] as const;
  const start = subjects.indexOf(subject as (typeof subjects)[number]);
  return [1, 2, 3].map((offset) => subjects[(start + offset) % subjects.length]!);
};
const beTraps = (be: string): string[] => ["am", "is", "are", "be"].filter((value) => value !== be).slice(0, 3);
const grammarReason = (correct: string, selected: string): LocalizedSource => localized(
  `${selected} ломает участника, форму be или позицию not; здесь нужен ${correct}.`,
  `${selected} ламає учасника, форму be або позицію not; тут потрібен ${correct}.`,
  `${selected} rompe el sujeto, la forma de be o la posición de not; aquí hace falta ${correct}.`,
  `${selected} quebra o sujeito, a forma de be ou a posição de not; aqui é preciso ${correct}.`,
  `${selected} làm sai chủ thể, dạng be hoặc vị trí not; ở đây cần ${correct}.`,
  `${selected} merusak pelaku, bentuk be, atau posisi not; di sini perlu ${correct}.`,
  `${selected} özneyi, be biçimini ya da not konumunu bozar; burada ${correct} gerekir.`,
  `${selected} psuje podmiot, formę be lub pozycję not; tutaj potrzebne jest ${correct}.`,
);
const phraseFromSpec = (spec: PhraseSpec): EpisodeSourcePhrase => {
  const adjectiveTraps = ADJECTIVE_TRAPS[spec.adjective];
  const subjects = subjectTraps(spec.subject);
  const verbs = beTraps(spec.be);
  const negationTraps = ["no", "never", "now"];
  const wordDefinitions = [
    { correct: spec.subject, category: "subject_pronoun", traps: subjects },
    { correct: spec.be, category: "present_be_form", traps: verbs },
    { correct: "not", category: "be_negation_marker", traps: negationTraps },
    { correct: String(spec.adjective), category: "state_or_attitude_adjective", traps: adjectiveTraps.map(String) },
  ];
  const localizedDetails = Object.fromEntries(LOCALES.map((locale) => [locale, {
    meaning: spec.meaning[locale],
    explanation: spec.explanation[locale],
    distractors: [
      {
        value: `${spec.subject} ${spec.be} ${spec.adjective}.`,
        reason: grammarReason("not", "без not")[locale],
        trapType: "grammar" as const,
      },
      {
        value: `${spec.subject} not ${spec.be} ${spec.adjective}.`,
        reason: grammarReason(`${spec.be} not`, `not ${spec.be}`)[locale],
        trapType: "grammar" as const,
      },
      {
        value: `${spec.subject} ${spec.be} not ${adjectiveTraps[0]}.`,
        reason: lexicalFeedback(spec.adjective, adjectiveTraps[0]!)[locale],
        trapType: "semantic_neighbor" as const,
      },
    ],
    words: wordDefinitions.map((word) => ({
      correct: word.correct,
      prompt: localized("Выберите точный целый чанк.", "Оберіть точний цілий блок.", "Elige el bloque completo exacto.", "Escolha o bloco inteiro exato.", "Chọn đúng cụm nguyên vẹn.", "Pilih bagian utuh yang tepat.", "Tam doğru parçayı seçin.", "Wybierz dokładny pełny element.")[locale],
      distractors: word.traps.map((value) => ({
        value,
        reason: word.category === "state_or_attitude_adjective"
          ? lexicalFeedback(spec.adjective, value as Choice)[locale]
          : grammarReason(word.correct, value)[locale],
        trapType: word.category === "state_or_attitude_adjective" ? "semantic_neighbor" as const : "grammar" as const,
      })),
    })),
  }])) as NonNullable<EpisodeSourcePhrase["localizedDetails"]>;
  return {
    id: spec.id,
    english: spec.english,
    russian: spec.meaning.ru,
    explanation: spec.explanation.ru,
    features: [NEGATION],
    words: wordDefinitions.map((word) => ({
      correct: word.correct,
      category: word.category,
      distractors: word.traps.map((value) => ({
        value,
        reasonCode: `${spec.id}:${word.category}:${value.toLowerCase()}`,
        trapType: word.category === "state_or_attitude_adjective" ? "semantic_neighbor" as const : "grammar" as const,
        why: word.category === "state_or_attitude_adjective"
          ? `${value} сообщает другое состояние; здесь нужен ${spec.adjective}.`
          : `${value} ломает участника, форму be или позицию not; здесь нужен ${word.correct}.`,
      })),
    })),
    localizedDetails,
  };
};

export const EPISODE_02_SESSION_01_PHRASES_V2 = Object.freeze(PHRASE_SPECS.map(phraseFromSpec));

const words = EPISODE_02_SESSION_01_VOCABULARY_V2;
const phrases = EPISODE_02_SESSION_01_PHRASES_V2;
const success = (target: string) => expandLocalized(localized(`Верно: ${target}`, `Правильно: ${target}`, `Correcto: ${target}`, `Certo: ${target}`, `Đúng: ${target}`, `Benar: ${target}`, `Doğru: ${target}`, `Dobrze: ${target}`));
const audio = (audioTargetId: string, transcript: string) => ({ audioTargetId, transcript });

const wordChoice = (index: number): LearningV2ModeNativePayloadV1 => {
  const word = words[index]!;
  const traps = word.contacts.recognize.distractors;
  return {
    family: "listen_choose",
    referenceAudio: audio(word.id, word.target),
    slowReferenceAudio: audio(`${word.id}:slow`, word.target),
    localizedMeaningChoices: [
      { responseId: `${word.id}:correct`, targetText: word.target, meaningByLocale: null },
      ...traps.map((entry) => ({ responseId: `${word.id}:${entry.reasonCode}`, targetText: entry.value, meaningByLocale: null })),
    ],
    transcriptRevealPolicy: "after_first_attempt",
    choiceFeedback: [
      { responseId: `${word.id}:correct`, correct: true, feedbackByLocale: success(word.target) },
      ...traps.map((entry) => ({ responseId: `${word.id}:${entry.reasonCode}`, correct: false as const, feedbackByLocale: expandLocalized(entry.feedback) })),
    ],
  };
};
const wordGap = (index: number): LearningV2ModeNativePayloadV1 => {
  const word = words[index]!;
  const traps = word.contacts.build_form.distractors;
  return {
    family: "context_gap_grammar",
    localizedScene: expandLocalized(word.meaning),
    gappedTargetPhrase: "___",
    testedDimension: `lexical_meaning_${word.target}`,
    gapOptions: [{ responseId: `${word.id}:correct`, text: word.target }, ...traps.map((entry) => ({ responseId: `${word.id}:${entry.reasonCode}`, text: entry.value }))],
    choiceFeedback: [{ responseId: `${word.id}:correct`, correct: true, feedbackByLocale: success(word.target) }, ...traps.map((entry) => ({ responseId: `${word.id}:${entry.reasonCode}`, correct: false as const, feedbackByLocale: expandLocalized(entry.feedback) }))],
  };
};
const builder = (
  kind: "word" | "phrase",
  index: number,
  family: "phrase_builder" | "listen_build_dictation",
): LearningV2ModeNativePayloadV1 => {
  const word = words[Math.min(index, words.length - 1)]!;
  const target = kind === "word" ? word.target : phrases[index]!.english;
  const meaning = kind === "word" ? word.meaning : PHRASE_SPECS[index]!.meaning;
  const tokens = target.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/gu) ?? [];
  const authoredDistractorTokens = kind === "word"
    ? word.contacts.build_form.distractors.map((entry) => entry.value)
    : ["I", "She", "We", "He", "They", "am", "is", "are", "not", "sure", "interested", "comfortable", "responsible", "dependent"]
      .filter((entry) => !tokens.includes(entry))
      .slice(0, 3);
  const common = {
    orderedTokens: tokens,
    authoredDistractorTokens,
    slotFeedback: [{ responseId: `${word.id}:${kind}:${family}:correct`, correct: true as const, feedbackByLocale: success(target) }],
  };
  return family === "phrase_builder"
    ? { family, targetPhrase: target, localizedMeaning: expandLocalized(meaning), ...common }
    : { family, referenceAudio: audio(`${word.id}:${kind}:${index}`, target), slowReferenceAudio: audio(`${word.id}:${kind}:${index}:slow`, target), hiddenTargetPhrase: target, ...common };
};
const repeat = (kind: "word" | "phrase", index: number): LearningV2ModeNativePayloadV1 => {
  const target = kind === "word" ? words[index]!.target : phrases[index]!.english;
  return {
    family: "scripted_repeat_compare",
    referenceAudio: audio(`e02-s01:${kind}:${index}`, target),
    slowReferenceAudio: audio(`e02-s01:${kind}:${index}:slow`, target),
    targetPhrase: target,
    recordControlPolicy: "hold_press_release_with_accessible_toggle",
    modelPlayback: "reference_and_slow",
    learnerPlayback: "available_after_capture",
    honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"],
  };
};
const phraseGap = (index: number): LearningV2ModeNativePayloadV1 => {
  const spec = PHRASE_SPECS[index]!;
  const options = ["not", "no", "never", "now"] as const;
  return {
    family: "context_gap_grammar",
    localizedScene: expandLocalized(spec.meaning),
    gappedTargetPhrase: `${spec.subject} ${spec.be} ___ ${spec.adjective}.`,
    testedDimension: "be_negation_not_position",
    gapOptions: options.map((value) => ({ responseId: `${spec.id}:${value}`, text: value })),
    choiceFeedback: options.map((value) => ({
      responseId: `${spec.id}:${value}`,
      correct: value === "not",
      feedbackByLocale: value === "not" ? success(spec.english) : expandLocalized(grammarReason("not", value)),
    })),
  };
};
const phraseChoice = (): LearningV2ModeNativePayloadV1 => {
  const spec = PHRASE_SPECS[0]!;
  const alternatives = [
    spec.english,
    `${spec.subject} ${spec.be} ${spec.adjective}.`,
    `${spec.subject} not ${spec.be} ${spec.adjective}.`,
    `${spec.subject} ${spec.be} not ${ADJECTIVE_TRAPS[spec.adjective][0]}.`,
  ];
  const meaningsByOption = [
    spec.meaning,
    localized("Я уверен.", "Я впевнений.", "Estoy seguro.", "Tenho certeza.", "Tôi chắc chắn.", "Saya yakin.", "Eminim.", "Jestem pewny."),
    localized("Ошибка порядка: not стоит перед am.", "Помилка порядку: not стоїть перед am.", "Orden incorrecto: not va antes de am.", "Ordem incorreta: not vem antes de am.", "Sai trật tự: not đứng trước am.", "Urutan salah: not berada sebelum am.", "Yanlış sıra: not, am önünde.", "Błędny szyk: not stoi przed am."),
    localized("Я не заинтересован.", "Я не зацікавлений.", "No estoy interesado.", "Não estou interessado.", "Tôi không quan tâm.", "Saya tidak tertarik.", "İlgilenmiyorum.", "Nie jestem zainteresowany."),
  ] as const;
  return {
    family: "listen_choose",
    referenceAudio: audio(spec.id, spec.english),
    slowReferenceAudio: audio(`${spec.id}:slow`, spec.english),
    localizedMeaningChoices: alternatives.map((targetText, optionIndex) => ({
      responseId: `${spec.id}:${optionIndex}`,
      targetText,
      meaningByLocale: expandLocalized(meaningsByOption[optionIndex]!),
    })),
    transcriptRevealPolicy: "after_first_attempt",
    choiceFeedback: alternatives.map((targetText, optionIndex) => ({
      responseId: `${spec.id}:${optionIndex}`,
      correct: optionIndex === 0,
      feedbackByLocale: optionIndex === 0 ? success(spec.english) : expandLocalized(grammarReason(spec.english, targetText)),
    })),
  };
};
const speed = (
  items: readonly SessionVocabularySourceV1[],
  suffix: string,
): LearningV2ModeNativePayloadV1 => ({
  family: "speed_match",
  pairGrid: items.map((word) => ({ pairId: `${word.id}:${suffix}`, target: word.target, meaningByLocale: expandLocalized(word.meaning) })),
  leftColumn: items.map((word) => `${word.id}:${suffix}`),
  rightColumn: items.map((word) => `${word.id}:${suffix}`).reverse(),
  pairingKey: "pair_id",
  timerPolicy: { enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true },
  finishStats: ["speed", "accuracy", "personal_best"],
});
const step = (
  family: SessionModeNativePracticeSourceV1["family"],
  purpose: SessionModeNativePracticeSourceV1["purpose"],
  learningStage: SessionModeNativePracticeSourceV1["learningStage"],
  target: SessionModeNativePracticeSourceV1["target"],
  modePayload: LearningV2ModeNativePayloadV1,
  instruction: LocalizedSource,
): SessionModeNativePracticeSourceV1 => ({ family, purpose, learningStage, target, modePayload, instruction });

const BUILD_WORD = localized("Соберите целое слово.", "Складіть ціле слово.", "Forma la palabra completa.", "Monte a palavra inteira.", "Ghép nguyên từ.", "Susun kata utuh.", "Bütün sözcüğü kurun.", "Ułóż całe słowo.");
const LISTEN_WORD = localized("Послушайте и выберите слово.", "Послухайте й оберіть слово.", "Escucha y elige la palabra.", "Ouça e escolha a palavra.", "Nghe và chọn từ.", "Dengarkan dan pilih katanya.", "Dinleyin ve sözcüğü seçin.", "Posłuchaj i wybierz słowo.");
const LISTEN_BUILD_WORD = localized("Послушайте и соберите целое слово.", "Послухайте й складіть ціле слово.", "Escucha y forma la palabra completa.", "Ouça e monte a palavra inteira.", "Nghe và ghép nguyên từ.", "Dengarkan dan susun kata utuh.", "Dinleyin ve bütün sözcüğü kurun.", "Posłuchaj i ułóż całe słowo.");
const PICK_WORD = localized("Выберите точное слово для пропуска.", "Оберіть точне слово для пропуску.", "Elige la palabra exacta para el hueco.", "Escolha a palavra exata para a lacuna.", "Chọn đúng từ cho chỗ trống.", "Pilih kata yang tepat untuk bagian kosong.", "Boşluk için tam sözcüğü seçin.", "Wybierz dokładne słowo do luki.");
const SAY_WORD = localized("Повторите слово и сравните запись.", "Повторіть слово й порівняйте запис.", "Repite la palabra y compara tu grabación.", "Repita a palavra e compare a gravação.", "Nhắc lại từ rồi so sánh bản ghi.", "Ulangi katanya lalu bandingkan rekaman.", "Sözcüğü tekrarlayıp kaydınızı karşılaştırın.", "Powtórz słowo i porównaj nagranie.");
const BUILD_PHRASE = localized("Соберите фразу из целых слов.", "Складіть фразу з цілих слів.", "Forma la frase con palabras completas.", "Monte a frase com palavras inteiras.", "Ghép câu bằng các từ nguyên vẹn.", "Susun kalimat dari kata utuh.", "Cümleyi bütün sözcüklerle kurun.", "Ułóż zdanie z całych słów.");
const LISTEN_PHRASE = localized("Послушайте и выберите точную фразу.", "Послухайте й оберіть точну фразу.", "Escucha y elige la frase exacta.", "Ouça e escolha a frase exata.", "Nghe và chọn câu chính xác.", "Dengarkan dan pilih kalimat yang tepat.", "Dinleyip tam cümleyi seçin.", "Posłuchaj i wybierz dokładne zdanie.");
const SAY_PHRASE = localized("Скажите фразу и сравните запись.", "Скажіть фразу й порівняйте запис.", "Di la frase y compara tu grabación.", "Diga a frase e compare a gravação.", "Nói câu rồi so sánh bản ghi.", "Ucapkan kalimat lalu bandingkan rekaman.", "Cümleyi söyleyip kaydınızı karşılaştırın.", "Powiedz zdanie i porównaj nagranie.");
const MATCH_WORDS = localized("Соедините слова со значениями.", "З’єднайте слова зі значеннями.", "Une las palabras con sus significados.", "Ligue as palavras aos significados.", "Ghép từ với nghĩa.", "Pasangkan kata dengan artinya.", "Sözcükleri anlamlarıyla eşleştirin.", "Połącz słowa ze znaczeniami.");

const retrieval = LESSON2_RETRIEVAL_VOCABULARY_V1.slice(0, 3);
const familiar = LESSON2_RETRIEVAL_VOCABULARY_V1[3]!;

/** Exact approved 17-family plan. Every new word is grounded three times before phrase use. */
export const EPISODE_02_SESSION_01_MODE_NATIVE_PRACTICE_V2 = Object.freeze([
  step("phrase_builder", "supported_practice", "recognize", { kind: "vocabulary", sourceIndex: 0 }, builder("word", 0, "phrase_builder"), BUILD_WORD),
  step("listen_choose", "supported_practice", "recognize", { kind: "vocabulary", sourceIndex: 1 }, wordChoice(1), LISTEN_WORD),
  step("context_gap_grammar", "supported_practice", "recognize", { kind: "vocabulary", sourceIndex: 2 }, wordGap(2), PICK_WORD),
  step("speed_match", "supported_practice", "retrieve_meaning", { kind: "vocabulary_grid", sourceIndices: [], knownItems: [...retrieval, familiar] }, speed([...retrieval, familiar], "retrieval-a"), MATCH_WORDS),
  step("listen_build_dictation", "guided_practice", "retrieve_meaning", { kind: "vocabulary", sourceIndex: 0 }, builder("word", 0, "listen_build_dictation"), LISTEN_BUILD_WORD),
  step("phrase_builder", "guided_practice", "retrieve_meaning", { kind: "vocabulary", sourceIndex: 1 }, builder("word", 1, "phrase_builder"), BUILD_WORD),
  step("scripted_repeat_compare", "guided_practice", "retrieve_meaning", { kind: "vocabulary", sourceIndex: 2 }, repeat("word", 2), SAY_WORD),
  step("context_gap_grammar", "retrieval_practice", "build_form", { kind: "vocabulary", sourceIndex: 1 }, wordGap(1), PICK_WORD),
  step("listen_choose", "retrieval_practice", "build_form", { kind: "vocabulary", sourceIndex: 0 }, wordChoice(0), LISTEN_WORD),
  step("speed_match", "retrieval_practice", "retrieve_meaning", { kind: "vocabulary_grid", sourceIndices: [0, 1, 2], knownItems: [...words, retrieval[0]!] }, speed([...words, retrieval[0]!], "mixed-b"), MATCH_WORDS),
  step("listen_build_dictation", "retrieval_practice", "build_form", { kind: "vocabulary", sourceIndex: 2 }, builder("word", 2, "listen_build_dictation"), LISTEN_BUILD_WORD),
  step("phrase_builder", "near_transfer", "apply_in_phrase", { kind: "phrase", sourceIndex: 0 }, builder("phrase", 0, "phrase_builder"), BUILD_PHRASE),
  step("scripted_repeat_compare", "near_transfer", "apply_in_phrase", { kind: "phrase", sourceIndex: 1 }, repeat("phrase", 1), SAY_PHRASE),
  step("context_gap_grammar", "near_transfer", "apply_in_phrase", { kind: "phrase", sourceIndex: 2 }, phraseGap(2), PICK_WORD),
  step("listen_choose", "near_transfer", "apply_in_phrase", { kind: "phrase", sourceIndex: 0 }, phraseChoice(), LISTEN_PHRASE),
  step("speed_match", "independent_check", "retrieve_meaning", { kind: "vocabulary_grid", sourceIndices: [0, 1, 2], knownItems: [...words, retrieval[1]!] }, speed([...words, retrieval[1]!], "independent"), MATCH_WORDS),
  step("scripted_repeat_compare", "independent_check", "speak_with_model", { kind: "phrase", sourceIndex: 4 }, repeat("phrase", 4), SAY_PHRASE),
]);
