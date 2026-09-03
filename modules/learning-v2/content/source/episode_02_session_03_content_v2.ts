import type { LearningV2ModeNativePayloadV1 } from "../../contracts/mode_native_payload_v1";
import type { EpisodeSourcePhrase } from "./episode_01_source_v1";
import { LESSON2_RETRIEVAL_VOCABULARY_V1 } from "./lesson2_retrieval_vocabulary_v1";
import { EPISODE_02_SESSION_02_VOCABULARY_V2 } from "./episode_02_session_02_content_v2";
import {
  expandLocalized,
  type LocalizedSource,
  type SessionModeNativePracticeSourceV1,
  type SessionSourceIntroPage,
  type SessionVocabularySourceV1,
} from "./session_shard_from_source_v1";

type NewWord = "aware" | "convinced" | "concerned";
type Choice = NewWord | "confident" | "relaxed" | "satisfied";
type Locale = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";

const LOCALES: readonly Locale[] = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"];
const NEGATION = "en.grammar.present_be_questions_negatives.negation";
const CONTRACTIONS = "en.grammar.present_be_affirmative.contractions";
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

export const EPISODE_02_SESSION_03_LEXICAL_SEEDS_V2: Readonly<
  Record<NewWord, LocalizedSource>
> = Object.freeze({
  aware: localized(
    "знающий о факте или замечающий происходящее",
    "той, хто знає про факт або помічає, що відбувається",
    "consciente de un hecho o de lo que ocurre",
    "ciente de um fato ou do que está acontecendo",
    "biết về một sự việc hoặc nhận ra điều đang xảy ra",
    "mengetahui suatu fakta atau menyadari hal yang terjadi",
    "bir gerçeği bilen ya da olup biteni fark eden",
    "świadomy faktu lub tego, co się dzieje",
  ),
  convinced: localized(
    "убеждённый: полностью верит, что это правда",
    "переконаний: повністю вірить, що це правда",
    "convencido: cree por completo que algo es verdad",
    "convencido: acredita plenamente que algo é verdade",
    "tin chắc rằng điều gì đó là đúng",
    "yakin sepenuhnya bahwa sesuatu itu benar",
    "bir şeyin doğru olduğuna tamamen inanmış",
    "przekonany, że coś jest całkowicie prawdziwe",
  ),
  concerned: localized(
    "обеспокоенный: тревожится из-за возможной проблемы",
    "стурбований: хвилюється через можливу проблему",
    "preocupado por un posible problema",
    "preocupado com um possível problema",
    "lo lắng về một vấn đề có thể xảy ra",
    "khawatir tentang masalah yang mungkin terjadi",
    "olası bir sorun yüzünden endişeli",
    "zaniepokojony możliwym problemem",
  ),
});

const retrievalMeanings = Object.freeze({
  confident: EPISODE_02_SESSION_02_VOCABULARY_V2[0]!.meaning,
  relaxed: EPISODE_02_SESSION_02_VOCABULARY_V2[1]!.meaning,
  satisfied: EPISODE_02_SESSION_02_VOCABULARY_V2[2]!.meaning,
});
const meanings: Readonly<Record<Choice, LocalizedSource>> = Object.freeze({
  ...EPISODE_02_SESSION_03_LEXICAL_SEEDS_V2,
  ...retrievalMeanings,
});
const FEEDBACK_LABELS: Readonly<Record<Choice, LocalizedSource>> = Object.freeze({
  aware: localized("знает или замечает происходящее", "знає або помічає, що відбувається", "sabe o nota lo que ocurre", "sabe ou percebe o que acontece", "biết hoặc nhận ra điều đang xảy ra", "tahu atau menyadari yang terjadi", "olup biteni bilir ya da fark eder", "wie lub zauważa, co się dzieje"),
  convinced: localized("полностью верит, что это правда", "повністю вірить, що це правда", "cree por completo que es verdad", "acredita plenamente que é verdade", "tin chắc rằng điều đó đúng", "yakin sepenuhnya bahwa itu benar", "bunun doğru olduğuna tamamen inanır", "jest całkowicie przekonany, że to prawda"),
  concerned: localized("тревожится из-за возможной проблемы", "хвилюється через можливу проблему", "se preocupa por un posible problema", "se preocupa com um possível problema", "lo về một vấn đề có thể xảy ra", "khawatir tentang masalah yang mungkin terjadi", "olası bir sorun için endişelenir", "martwi się możliwym problemem"),
  confident: localized("уверен в своих силах", "упевнений у своїх силах", "confía en sus capacidades", "confia nas próprias capacidades", "tự tin vào khả năng của mình", "percaya pada kemampuannya", "yeteneklerine güveniyor", "jest pewny swoich umiejętności"),
  relaxed: localized("спокоен и не напряжён", "спокійний і не напружений", "está tranquilo, sin tensión", "está calmo, sem tensão", "bình tĩnh và không căng thẳng", "tenang dan tidak tegang", "sakin ve gergin değil", "jest spokojny i bez napięcia"),
  satisfied: localized("доволен результатом", "задоволений результатом", "está satisfecho con el resultado", "está satisfeito com o resultado", "hài lòng với kết quả", "puas dengan hasilnya", "sonuçtan memnun", "jest zadowolony z wyniku"),
});
const TRAPS: Readonly<Record<NewWord, readonly Choice[]>> = Object.freeze({
  aware: ["convinced", "concerned", "confident"],
  convinced: ["aware", "concerned", "relaxed"],
  concerned: ["convinced", "aware", "satisfied"],
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

export const EPISODE_02_SESSION_03_TITLE_V2 = localized(
  "Увидеть точную разницу",
  "Побачити точну різницю",
  "Ver la diferencia exacta",
  "Perceber a diferença exata",
  "Nhận ra khác biệt chính xác",
  "Melihat perbedaan yang tepat",
  "Kesin farkı görmek",
  "Dostrzec dokładną różnicę",
);
export const EPISODE_02_SESSION_03_SUMMARY_V2 = localized(
  "Ставим not сразу после am, is или are и различаем aware, convinced и concerned.",
  "Ставимо not одразу після am, is або are та розрізняємо aware, convinced і concerned.",
  "Colocamos not justo después de am, is o are y distinguimos aware, convinced y concerned.",
  "Colocamos not logo depois de am, is ou are e distinguimos aware, convinced e concerned.",
  "Đặt not ngay sau am, is hoặc are và phân biệt aware, convinced với concerned.",
  "Menempatkan not tepat setelah am, is, atau are serta membedakan aware, convinced, dan concerned.",
  "Not sözcüğünü am, is ya da are sonrasına koyup aware, convinced ve concerned anlamlarını ayırırız.",
  "Stawiamy not bezpośrednio po am, is lub are i rozróżniamy aware, convinced oraz concerned.",
);
export const EPISODE_02_SESSION_03_GOAL_V2 = localized(
  "По одной подсказке отличать отрицание от ближайшей знакомой формы.",
  "За однією підказкою відрізняти заперечення від найближчої знайомої форми.",
  "Distinguir la negación de la forma conocida más cercana con una sola pista.",
  "Distinguir a negação da forma conhecida mais próxima com uma única pista.",
  "Dựa vào một dấu hiệu để phân biệt phủ định với dạng quen thuộc gần nhất.",
  "Membedakan negasi dari bentuk dikenal yang paling dekat dengan satu petunjuk.",
  "Tek ipucuyla olumsuzluğu en yakın bilinen biçimden ayırmak.",
  "Po jednej wskazówce odróżniać przeczenie od najbliższej znanej formy.",
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

export const EPISODE_02_SESSION_03_INTRO_V2 = Object.freeze([
  introPage(
    "concept",
    "contraction_plus_not_meaning",
    localized("Сокращение не прячет not", "Скорочення не ховає not", "La contracción no oculta not", "A contração não esconde not", "Dạng rút gọn không giấu not", "Kontraksi tidak menyembunyikan not", "Kısaltma not sözcüğünü saklamaz", "Skrót nie ukrywa not"),
    localized(
      "He's заменяет He is, но not остаётся отдельным словом: He's not aware. Значение то же, что у He is not aware.",
      "He's замінює He is, але not лишається окремим словом: He's not aware. Значення те саме, що в He is not aware.",
      "He's sustituye He is, pero not sigue separado: He's not aware. Significa lo mismo que He is not aware.",
      "He's substitui He is, mas not continua separado: He's not aware. O sentido é o mesmo de He is not aware.",
      "He's thay cho He is, nhưng not vẫn là từ riêng: He's not aware. Nghĩa giống He is not aware.",
      "He's menggantikan He is, tetapi not tetap terpisah: He's not aware. Artinya sama dengan He is not aware.",
      "He's, He is yerine geçer; not ayrı kalır: He's not aware. Anlamı He is not aware ile aynıdır.",
      "He's zastępuje He is, ale not pozostaje osobno: He's not aware. Znaczenie jest takie samo jak He is not aware.",
    ),
    localized("Он не уверен в себе. Выберите короткую точную фразу.", "Він не впевнений у собі. Оберіть коротку точну фразу.", "Él no tiene confianza. Elige la frase breve exacta.", "Ele não está confiante. Escolha a frase curta exata.", "Anh ấy không tự tin. Chọn câu rút gọn chính xác.", "Dia tidak percaya diri. Pilih kalimat singkat yang tepat.", "Kendine güvenmiyor. Tam kısa cümleyi seçin.", "On nie jest pewny siebie. Wybierz dokładne krótkie zdanie."),
    ["He's not aware.", "He not aware.", "He's aware."],
    localized("He's not aware. соединяет He is в He's и сохраняет not перед aware.", "He's not aware. поєднує He is у He's і зберігає not перед aware.", "He's not aware. contrae He is en He's y mantiene not delante de aware.", "He's not aware. contrai He is em He's e mantém not antes de aware.", "He's not aware. rút He is thành He's và giữ not trước aware.", "He's not aware. menyingkat He is menjadi He's dan mempertahankan not sebelum aware.", "He's not aware. He is biçimini He's yapar ve not sözcüğünü aware önünde tutar.", "He's not aware. skraca He is do He's i zachowuje not przed aware."),
  ),
  introPage(
    "formula",
    "contraction_plus_not_form",
    localized("Сокращённое be, затем not", "Скорочене be, потім not", "Be contraído y después not", "Be contraído e depois not", "Be rút gọn rồi đến not", "Be yang dikontraksikan lalu not", "Kısaltılmış be, sonra not", "Skrócone be, potem not"),
    localized(
      "Формула остаётся знакомой: участник + be + not + описание. В She's not convinced. блок She's уже содержит She is, а not идёт сразу после него.",
      "Формула лишається знайомою: учасник + be + not + опис. У She's not convinced. блок She's уже містить She is, а not іде одразу після нього.",
      "La fórmula sigue siendo sujeto + be + not + descripción. En She's not convinced., She's ya contiene She is y not va justo después.",
      "A fórmula continua sujeito + be + not + descrição. Em She's not convinced., She's já contém She is e not vem logo depois.",
      "Công thức vẫn là chủ thể + be + not + mô tả. Trong She's not convinced., She's đã chứa She is và not đứng ngay sau.",
      "Rumusnya tetap pelaku + be + not + deskripsi. Dalam She's not convinced., She's sudah memuat She is dan not tepat setelahnya.",
      "Formül yine özne + be + not + açıklamadır. She's not convinced. içinde She's, She is biçimini içerir; not hemen ardından gelir.",
      "Wzór nadal brzmi podmiot + be + not + opis. W She's not convinced. blok She's zawiera She is, a not stoi zaraz po nim.",
    ),
    localized("Она не убеждена. Выберите фразу с нужным отрицанием.", "Вона не переконана. Оберіть фразу з потрібним запереченням.", "Ella no está convencida. Elige la frase con la negación correcta.", "Ela não está convencida. Escolha a frase com a negação correta.", "Cô ấy chưa bị thuyết phục. Chọn câu phủ định đúng.", "Dia belum yakin. Pilih kalimat negatif yang tepat.", "O ikna olmadı. Doğru olumsuz cümleyi seçin.", "Ona nie jest przekonana. Wybierz zdanie z właściwym przeczeniem."),
    ["She's not convinced.", "She not convinced.", "She's convinced."],
    localized("She's not convinced. использует She's для She is и ставит not сразу после сокращения.", "She's not convinced. використовує She's замість She is і ставить not одразу після скорочення.", "She's not convinced. usa She's por She is y coloca not justo después de la contracción.", "She's not convinced. usa She's por She is e coloca not logo após a contração.", "She's not convinced. dùng She's thay She is và đặt not ngay sau dạng rút gọn.", "She's not convinced. memakai She's untuk She is dan menaruh not tepat setelah kontraksi.", "She's not convinced. She is yerine She's kullanır ve not hemen kısaltmadan sonra gelir.", "She's not convinced. używa She's zamiast She is i stawia not zaraz po skrócie."),
  ),
  introPage(
    "trap",
    "full_not_after_contraction",
    localized("Not остаётся целым словом", "Not лишається цілим словом", "Not sigue siendo una palabra", "Not continua uma palavra inteira", "Not vẫn là một từ riêng", "Not tetap satu kata utuh", "Not ayrı bir sözcük kalır", "Not pozostaje osobnym słowem"),
    localized(
      "В I'm not concerned. сокращается только I am → I'm. Мы не вводим новые отрицательные сокращения: not остаётся после I'm.",
      "У I'm not concerned. скорочується лише I am → I'm. Ми не вводимо нових заперечних скорочень: not лишається після I'm.",
      "En I'm not concerned. solo se contrae I am → I'm. No añadimos contracciones negativas nuevas: not queda después de I'm.",
      "Em I'm not concerned. apenas I am → I'm é contraído. Não introduzimos contrações negativas novas: not fica depois de I'm.",
      "Trong I'm not concerned., chỉ I am → I'm được rút gọn. Không có dạng phủ định mới: not vẫn đứng sau I'm.",
      "Dalam I'm not concerned., hanya I am → I'm yang disingkat. Tidak ada kontraksi negatif baru: not tetap setelah I'm.",
      "I'm not concerned. içinde yalnız I am → I'm kısalır. Yeni olumsuz kısaltma yoktur; not, I'm sonrasında kalır.",
      "W I'm not concerned. skraca się tylko I am → I'm. Nie wprowadzamy nowych skrótów przeczących: not stoi po I'm.",
    ),
    localized("Я недоволен результатом. Выберите форму без перестановки not.", "Я незадоволений результатом. Оберіть форму без перестановки not.", "No estoy satisfecho con el resultado. Elige la forma sin mover not.", "Não estou satisfeito com o resultado. Escolha a forma sem mover not.", "Tôi không hài lòng với kết quả. Chọn dạng không đổi vị trí not.", "Saya tidak puas dengan hasilnya. Pilih bentuk tanpa memindahkan not.", "Sonuçtan memnun değilim. Not sözcüğünü taşımayan biçimi seçin.", "Nie jestem zadowolony z wyniku. Wybierz formę bez przestawiania not."),
    ["I'm not concerned.", "I not am concerned.", "I'm concerned not."],
    localized("I'm not concerned. сокращает I am до I'm и оставляет not между be и описанием.", "I'm not concerned. скорочує I am до I'm і лишає not між be та описом.", "I'm not concerned. contrae I am en I'm y deja not entre be y la descripción.", "I'm not concerned. contrai I am em I'm e deixa not entre be e a descrição.", "I'm not concerned. rút I am thành I'm và giữ not giữa be với phần mô tả.", "I'm not concerned. menyingkat I am menjadi I'm dan membiarkan not di antara be dan deskripsi.", "I'm not concerned. I am biçimini I'm yapar ve not sözcüğünü be ile açıklama arasında tutar.", "I'm not concerned. skraca I am do I'm i zostawia not między be a opisem."),
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
    id: `e02-s03-word-${target}`,
    target,
    features: ["adjective_state_and_attitude"],
    meaning: EPISODE_02_SESSION_03_LEXICAL_SEEDS_V2[target],
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

export const EPISODE_02_SESSION_03_VOCABULARY_V2 = Object.freeze([
  vocabulary("aware"),
  vocabulary("convinced"),
  vocabulary("concerned"),
]);

type PhraseSpec = Readonly<{
  id: string;
  subject: "I" | "She" | "We" | "He" | "They";
  be: "am" | "is" | "are";
  adjective: Choice;
  english: string;
  contractedSubject?: string;
  meaning: LocalizedSource;
  explanation: LocalizedSource;
  features: readonly string[];
}>;
const PHRASE_SPECS: readonly PhraseSpec[] = Object.freeze([
  {
    id: "e02-s03-i-am-not-aware",
    subject: "I",
    be: "am",
    adjective: "aware",
    english: "I am not aware.",
    meaning: localized("Я об этом не знаю.", "Я про це не знаю.", "No lo sé.", "Não sei disso.", "Tôi không biết việc đó.", "Saya tidak tahu hal itu.", "Bunun farkında değilim.", "Nie wiem o tym."),
    explanation: localized("Так говорят о женщине, которая не знает важного факта или не замечает происходящего. После She нужна is, затем not и aware.", "Так кажуть про жінку, яка не знає важливого факту. Після She потрібне is, далі not і aware.", "Se dice de una mujer que desconoce un hecho importante. Después de She van is, not y aware.", "Diz-se de uma mulher que desconhece um fato importante. Depois de She vêm is, not e aware.", "Câu nói về một phụ nữ chưa biết sự việc quan trọng. Sau She là is, rồi not và aware.", "Kalimat ini tentang perempuan yang belum tahu fakta penting. Setelah She ada is, lalu not dan aware.", "Önemli bir gerçeği bilmeyen kadın için söylenir. She sonrasında is, not ve aware gelir.", "Tak mówi się o kobiecie, która nie zna ważnego faktu. Po She stoją is, not i aware."),
    features: [NEGATION],
  },
  {
    id: "e02-s03-she-is-not-convinced",
    subject: "She",
    be: "is",
    adjective: "convinced",
    english: "She is not convinced.",
    meaning: localized("Она не убеждена.", "Вона не переконана.", "Ella no está convencida.", "Ela não está convencida.", "Cô ấy chưa bị thuyết phục.", "Dia belum yakin.", "O ikna olmadı.", "Ona nie jest przekonana."),
    explanation: localized("Так группа сообщает, что доказательств пока недостаточно и полной уверенности нет. После We нужна are, затем not и convinced.", "Так група каже, що доказів поки недостатньо. Після We потрібне are, далі not і convinced.", "Un grupo dice que las pruebas aún no bastan. Después de We van are, not y convinced.", "Um grupo diz que as provas ainda não bastam. Depois de We vêm are, not e convinced.", "Một nhóm nói rằng bằng chứng vẫn chưa đủ. Sau We là are, rồi not và convinced.", "Sebuah kelompok mengatakan buktinya belum cukup. Setelah We ada are, lalu not dan convinced.", "Bir grup kanıtın henüz yeterli olmadığını söyler. We sonrasında are, not ve convinced gelir.", "Grupa mówi, że dowodów nadal jest za mało. Po We stoją are, not i convinced."),
    features: [NEGATION],
  },
  {
    id: "e02-s03-we-are-not-concerned",
    subject: "We",
    be: "are",
    adjective: "concerned",
    english: "We are not concerned.",
    meaning: localized("Мы не обеспокоены.", "Ми не стурбовані.", "No estamos preocupados.", "Não estamos preocupados.", "Chúng tôi không lo lắng.", "Kami tidak khawatir.", "Endişeli değiliz.", "Nie martwimy się."),
    explanation: localized("Так говорят о мужчине, который не тревожится из-за возможной проблемы. После He нужна is, затем not и concerned.", "Так кажуть про чоловіка, який не хвилюється через можливу проблему. Після He потрібне is, далі not і concerned.", "Se dice de un hombre que no se preocupa por un posible problema. Después de He van is, not y concerned.", "Diz-se de um homem que não se preocupa com um possível problema. Depois de He vêm is, not e concerned.", "Câu nói về một người đàn ông không lo về vấn đề có thể xảy ra. Sau He là is, rồi not và concerned.", "Kalimat ini tentang pria yang tidak khawatir akan masalah. Setelah He ada is, lalu not dan concerned.", "Olası bir sorun için endişelenmeyen erkek hakkında söylenir. He sonrasında is, not ve concerned gelir.", "Tak mówi się o mężczyźnie, który nie martwi się możliwym problemem. Po He stoją is, not i concerned."),
    features: [NEGATION],
  },
  {
    id: "e02-s03-im-not-aware",
    subject: "I",
    be: "am",
    adjective: "aware",
    english: "I'm not aware.",
    contractedSubject: "I'm",
    meaning: localized("Я об этом не знаю.", "Я про це не знаю.", "No lo sé.", "Não sei disso.", "Tôi không biết việc đó.", "Saya tidak tahu hal itu.", "Bunun farkında değilim.", "Nie wiem o tym."),
    explanation: localized("Так говорящий коротко признаёт, что не знает нужного факта. I am сокращается до I'm; not остаётся перед aware.", "Так мовець коротко визнає, що не знає потрібного факту. I am скорочується до I'm; not лишається перед aware.", "Quien habla admite brevemente que desconoce el hecho. I am se contrae en I'm; not queda antes de aware.", "Quem fala admite brevemente que desconhece o fato. I am vira I'm; not fica antes de aware.", "Người nói thừa nhận ngắn gọn rằng mình chưa biết. I am rút thành I'm; not đứng trước aware.", "Penutur mengakui singkat bahwa ia belum tahu. I am menjadi I'm; not tetap sebelum aware.", "Konuşan gerçeği bilmediğini kısaca söyler. I am, I'm olur; not aware önünde kalır.", "Mówiący krótko przyznaje, że nie zna faktu. I am skraca się do I'm; not stoi przed aware."),
    features: [CONTRACTIONS, NEGATION],
  },
  {
    id: "e02-s03-theyre-not-convinced",
    subject: "They",
    be: "are",
    adjective: "convinced",
    english: "They're not convinced.",
    contractedSubject: "They're",
    meaning: localized("Они не убеждены.", "Вони не переконані.", "No están convencidos.", "Eles não estão convencidos.", "Họ chưa bị thuyết phục.", "Mereka belum yakin.", "İkna olmadılar.", "Nie są przekonani."),
    explanation: localized("Так несколько людей коротко сообщают, что доказательства их пока не убедили. They are сокращается до They're; not остаётся перед convinced.", "Так кілька людей коротко кажуть, що докази їх не переконали. They are скорочується до They're; not лишається перед convinced.", "Varias personas dicen que las pruebas aún no las convencen. They are se contrae en They're; not queda antes de convinced.", "Várias pessoas dizem que as provas ainda não as convenceram. They are vira They're; not fica antes de convinced.", "Nhiều người nói rằng bằng chứng chưa thuyết phục họ. They are rút thành They're; not đứng trước convinced.", "Beberapa orang berkata buktinya belum meyakinkan. They are menjadi They're; not tetap sebelum convinced.", "Birkaç kişi kanıtın onları ikna etmediğini söyler. They are, They're olur; not convinced önünde kalır.", "Kilka osób mówi, że dowody ich nie przekonały. They are skraca się do They're; not stoi przed convinced."),
    features: [CONTRACTIONS, NEGATION],
  },
]);

const ADJECTIVE_TRAPS: Readonly<Record<Choice, readonly Choice[]>> = Object.freeze({
  aware: ["convinced", "concerned", "confident"],
  convinced: ["aware", "concerned", "relaxed"],
  concerned: ["convinced", "aware", "satisfied"],
  confident: ["relaxed", "satisfied", "aware"],
  relaxed: ["satisfied", "confident", "concerned"],
  satisfied: ["relaxed", "confident", "convinced"],
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
  const contractionTraps = ["I'm", "He's", "She's", "We're", "They're"]
    .filter((value) => value !== spec.contractedSubject)
    .slice(0, 3);
  const wordDefinitions = spec.contractedSubject
    ? [
      { correct: spec.contractedSubject, category: "contracted_subject_be", traps: contractionTraps },
      { correct: "not", category: "be_negation_marker", traps: negationTraps },
      { correct: String(spec.adjective), category: "state_or_attitude_adjective", traps: adjectiveTraps.map(String) },
    ]
    : [
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
    features: [...spec.features],
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

export const EPISODE_02_SESSION_03_PHRASES_V2 = Object.freeze(PHRASE_SPECS.map(phraseFromSpec));

const words = EPISODE_02_SESSION_03_VOCABULARY_V2;
const phrases = EPISODE_02_SESSION_03_PHRASES_V2;
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
    : ["I", "She", "We", "He", "They", "am", "is", "are", "not", "aware", "convinced", "concerned", "confident", "satisfied"]
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
    referenceAudio: audio(`e02-s03:${kind}:${index}`, target),
    slowReferenceAudio: audio(`e02-s03:${kind}:${index}:slow`, target),
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
    `${spec.subject} ${spec.be} not ${ADJECTIVE_TRAPS[spec.adjective][1]}.`,
    `${spec.subject} ${spec.be} not ${ADJECTIVE_TRAPS[spec.adjective][0]}.`,
  ];
  const meaningsByOption = [
    spec.meaning,
    localized("Она знает об этом.", "Вона знає про це.", "Ella lo sabe.", "Ela sabe disso.", "Cô ấy biết việc đó.", "Dia tahu hal itu.", "O bunun farkında.", "Ona o tym wie."),
    localized("Она не обеспокоена.", "Вона не стурбована.", "Ella no está preocupada.", "Ela não está preocupada.", "Cô ấy không lo lắng.", "Dia tidak khawatir.", "O endişeli değil.", "Ona się nie martwi."),
    localized("Она не убеждена.", "Вона не переконана.", "Ella no está convencida.", "Ela não está convencida.", "Cô ấy chưa bị thuyết phục.", "Dia belum yakin.", "O ikna olmadı.", "Ona nie jest przekonana."),
  ] as const;
  const feedbackByOption = [
    success(spec.english),
    expandLocalized(localized(
      "She is aware. — «она знает об этом»; в аудио She is not aware. — «она об этом не знает».",
      "She is aware. — «вона знає про це»; в аудіо She is not aware. — «вона про це не знає».",
      "She is aware. significa «ella lo sabe»; el audio dice She is not aware. — «ella no lo sabe».",
      "She is aware. significa «ela sabe disso»; o áudio diz She is not aware. — «ela não sabe disso».",
      "She is aware. nghĩa là “cô ấy biết”; âm thanh nói She is not aware. — “cô ấy không biết”.",
      "She is aware. berarti “dia tahu”; audio mengatakan She is not aware. — “dia tidak tahu”.",
      "She is aware. «O farkında» demektir; kayıtta She is not aware. — «O farkında değil» duyulur.",
      "She is aware. znaczy „ona wie”; nagranie mówi She is not aware. — „ona nie wie”.",
    )),
    expandLocalized(localized(
      "She is not concerned. — «она не обеспокоена»; в аудио She is not aware. — «она об этом не знает».",
      "She is not concerned. — «вона не стурбована»; в аудіо She is not aware. — «вона про це не знає».",
      "She is not concerned. significa «no está preocupada»; el audio dice She is not aware. — «no lo sabe».",
      "She is not concerned. significa «não está preocupada»; o áudio diz She is not aware. — «não sabe disso».",
      "She is not concerned. là “cô ấy không lo”; âm thanh nói She is not aware. — “cô ấy không biết”.",
      "She is not concerned. berarti “dia tidak khawatir”; audio mengatakan She is not aware. — “dia tidak tahu”.",
      "She is not concerned. «O endişeli değil»; kayıtta She is not aware. — «O farkında değil» duyulur.",
      "She is not concerned. znaczy „ona się nie martwi”; nagranie mówi She is not aware. — „ona nie wie”.",
    )),
    expandLocalized(localized(
      "She is not convinced. — «она не убеждена»; в аудио She is not aware. — «она об этом не знает».",
      "She is not convinced. — «вона не переконана»; в аудіо She is not aware. — «вона про це не знає».",
      "She is not convinced. significa «no está convencida»; el audio dice She is not aware. — «no lo sabe».",
      "She is not convinced. significa «não está convencida»; o áudio diz She is not aware. — «não sabe disso».",
      "She is not convinced. là “cô ấy chưa tin”; âm thanh nói She is not aware. — “cô ấy không biết”.",
      "She is not convinced. berarti “dia belum yakin”; audio mengatakan She is not aware. — “dia tidak tahu”.",
      "She is not convinced. «O ikna olmadı»; kayıtta She is not aware. — «O farkında değil» duyulur.",
      "She is not convinced. znaczy „ona nie jest przekonana”; nagranie mówi She is not aware. — „ona nie wie”.",
    )),
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
      feedbackByLocale: feedbackByOption[optionIndex]!,
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

const retrieval = EPISODE_02_SESSION_02_VOCABULARY_V2;
const familiar = LESSON2_RETRIEVAL_VOCABULARY_V1[0]!;

/** Exact approved 17-family plan. Every new word is grounded three times before phrase use. */
export const EPISODE_02_SESSION_03_MODE_NATIVE_PRACTICE_V2 = Object.freeze([
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
