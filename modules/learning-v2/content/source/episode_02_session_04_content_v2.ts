import type { LearningV2ModeNativePayloadV1 } from "../../contracts/mode_native_payload_v1";
import type { EpisodeSourcePhrase } from "./episode_01_source_v1";
import { LESSON2_RETRIEVAL_VOCABULARY_V1 } from "./lesson2_retrieval_vocabulary_v1";
import { EPISODE_02_SESSION_03_VOCABULARY_V2 } from "./episode_02_session_03_content_v2";
import {
  expandLocalized,
  type LocalizedSource,
  type SessionModeNativePracticeSourceV1,
  type SessionSourceIntroPage,
  type SessionVocabularySourceV1,
} from "./session_shard_from_source_v1";

type NewWord = "visible" | "hidden" | "clear";
type Choice = NewWord | "aware" | "convinced" | "concerned";
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

export const EPISODE_02_SESSION_04_LEXICAL_SEEDS_V2: Readonly<
  Record<NewWord, LocalizedSource>
> = Object.freeze({
  visible: localized(
    "видимый: его можно увидеть",
    "видимий: його можна побачити",
    "visible: se puede ver",
    "visível: pode ser visto",
    "có thể nhìn thấy",
    "terlihat: dapat dilihat",
    "görünür: görülebilen",
    "widoczny: można go zobaczyć",
  ),
  hidden: localized(
    "скрытый: его не видно или трудно найти",
    "прихований: його не видно або важко знайти",
    "oculto: no se ve o cuesta encontrarlo",
    "escondido: não está à vista ou é difícil de achar",
    "bị giấu: không nhìn thấy hoặc khó tìm",
    "tersembunyi: tidak terlihat atau sulit ditemukan",
    "gizli: görünmeyen ya da bulunması zor",
    "ukryty: niewidoczny lub trudny do znalezienia",
  ),
  clear: localized(
    "ясный: его легко понять",
    "зрозумілий: його легко зрозуміти",
    "claro: fácil de entender",
    "claro: fácil de entender",
    "rõ ràng: dễ hiểu",
    "jelas: mudah dipahami",
    "açık: kolay anlaşılır",
    "jasny: łatwy do zrozumienia",
  ),
});

const retrievalMeanings = Object.freeze({
  aware: EPISODE_02_SESSION_03_VOCABULARY_V2[0]!.meaning,
  convinced: EPISODE_02_SESSION_03_VOCABULARY_V2[1]!.meaning,
  concerned: EPISODE_02_SESSION_03_VOCABULARY_V2[2]!.meaning,
});
const meanings: Readonly<Record<Choice, LocalizedSource>> = Object.freeze({
  ...EPISODE_02_SESSION_04_LEXICAL_SEEDS_V2,
  ...retrievalMeanings,
});
const FEEDBACK_LABELS: Readonly<Record<Choice, LocalizedSource>> = Object.freeze({
  visible: localized("можно увидеть", "можна побачити", "se puede ver", "pode ser visto", "có thể nhìn thấy", "dapat dilihat", "görülebilir", "można zobaczyć"),
  hidden: localized("не видно или трудно найти", "не видно або важко знайти", "no se ve o cuesta encontrarlo", "não está à vista ou é difícil de achar", "không nhìn thấy hoặc khó tìm", "tidak terlihat atau sulit ditemukan", "görünmez ya da zor bulunur", "nie widać lub trudno znaleźć"),
  clear: localized("легко понять", "легко зрозуміти", "es fácil de entender", "é fácil de entender", "dễ hiểu", "mudah dipahami", "kolay anlaşılır", "łatwo zrozumieć"),
  aware: localized("знает или замечает происходящее", "знає або помічає, що відбувається", "sabe o nota lo que ocurre", "sabe ou percebe o que acontece", "biết hoặc nhận ra điều đang xảy ra", "tahu atau menyadari yang terjadi", "olup biteni bilir ya da fark eder", "wie lub zauważa, co się dzieje"),
  convinced: localized("полностью верит, что это правда", "повністю вірить, що це правда", "cree por completo que es verdad", "acredita plenamente que é verdade", "tin chắc rằng điều đó đúng", "yakin sepenuhnya bahwa itu benar", "bunun doğru olduğuna tamamen inanır", "jest całkowicie przekonany, że to prawda"),
  concerned: localized("тревожится из-за возможной проблемы", "хвилюється через можливу проблему", "se preocupa por un posible problema", "se preocupa com um possível problema", "lo về một vấn đề có thể xảy ra", "khawatir tentang masalah yang mungkin terjadi", "olası bir sorun için endişelenir", "martwi się możliwym problemem"),
});
const TRAPS: Readonly<Record<NewWord, readonly Choice[]>> = Object.freeze({
  visible: ["clear", "aware", "concerned"],
  hidden: ["visible", "clear", "aware"],
  clear: ["visible", "hidden", "convinced"],
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

export const EPISODE_02_SESSION_04_TITLE_V2 = localized(
  "Отрицание в обычной ситуации",
  "Заперечення у звичайній ситуації",
  "La negación en una situación cotidiana",
  "A negação numa situação cotidiana",
  "Phủ định trong tình huống hằng ngày",
  "Negasi dalam situasi sehari-hari",
  "Günlük bir durumda olumsuzluk",
  "Przeczenie w codziennej sytuacji",
);
export const EPISODE_02_SESSION_04_SUMMARY_V2 = localized(
  "Применяем знакомое not с visible, hidden и clear в бытовых сообщениях.",
  "Застосовуємо знайоме not із visible, hidden і clear у побутових повідомленнях.",
  "Aplicamos el conocido not con visible, hidden y clear en mensajes cotidianos.",
  "Aplicamos o conhecido not com visible, hidden e clear em mensagens cotidianas.",
  "Dùng not đã biết với visible, hidden và clear trong lời nói hằng ngày.",
  "Menerapkan not yang sudah dikenal dengan visible, hidden, dan clear dalam pesan sehari-hari.",
  "Bilinen not yapısını visible, hidden ve clear ile günlük iletilerde kullanırız.",
  "Stosujemy znane not z visible, hidden i clear w codziennych komunikatach.",
);
export const EPISODE_02_SESSION_04_GOAL_V2 = localized(
  "Самостоятельно выбирать и собирать отрицательную форму в новом бытовом контексте.",
  "Самостійно обирати й складати заперечну форму в новому побутовому контексті.",
  "Elegir y construir de forma autónoma la negación en un nuevo contexto cotidiano.",
  "Escolher e montar de forma autônoma a negação em um novo contexto cotidiano.",
  "Tự chọn và ghép dạng phủ định trong một bối cảnh đời thường mới.",
  "Memilih dan menyusun bentuk negatif secara mandiri dalam konteks sehari-hari yang baru.",
  "Olumsuz biçimi yeni bir günlük bağlamda bağımsız seçip kurmak.",
  "Samodzielnie wybierać i budować przeczenie w nowym codziennym kontekście.",
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

export const EPISODE_02_SESSION_04_INTRO_V2 = Object.freeze([
  introPage(
    "concept",
    "everyday_negative_meaning",
    localized("Когда вещь не видна", "Коли річ не видно", "Cuando algo no se ve", "Quando algo não aparece", "Khi không nhìn thấy một vật", "Saat sesuatu tidak terlihat", "Bir şey görünmediğinde", "Gdy czegoś nie widać"),
    localized(
      "It is visible — «это видно». It is not visible. Это «этого не видно»: not меняет сообщение о той же вещи.",
      "It is visible — «це видно». It is not visible. Це «цього не видно»: not змінює повідомлення про ту саму річ.",
      "It is visible significa «se ve». It is not visible. Significa «no se ve»: not cambia el mensaje sobre la misma cosa.",
      "It is visible significa «dá para ver». It is not visible. Significa «não dá para ver»: not muda a mensagem sobre a mesma coisa.",
      "It is visible nghĩa là “có thể nhìn thấy”. It is not visible. Nghĩa là “không nhìn thấy”: not đổi thông tin về cùng một vật.",
      "It is visible berarti “benda itu terlihat”. It is not visible. Artinya “benda itu tidak terlihat”: not mengubah pesan tentang benda yang sama.",
      "It is visible «görünüyor» demektir. It is not visible. «Görünmüyor» demektir: not aynı şey hakkındaki mesajı değiştirir.",
      "It is visible znaczy „to widać”. It is not visible. Znaczy „tego nie widać”: not zmienia komunikat o tej samej rzeczy.",
    ),
    localized("Этого не видно. Выберите точную фразу.", "Цього не видно. Оберіть точну фразу.", "No se ve. Elige la frase exacta.", "Não dá para ver. Escolha a frase exata.", "Không nhìn thấy vật đó. Chọn câu chính xác.", "Benda itu tidak terlihat. Pilih kalimat yang tepat.", "O görünmüyor. Doğru cümleyi seçin.", "Tego nie widać. Wybierz dokładne zdanie."),
    ["It is not visible.", "It is visible.", "It not visible."],
    localized("It is not visible. ставит not после is и сообщает, что вещь не видна.", "It is not visible. ставить not після is і повідомляє, що річ не видно.", "It is not visible. coloca not después de is y dice que la cosa no se ve.", "It is not visible. põe not depois de is e diz que a coisa não aparece.", "It is not visible. đặt not sau is và cho biết vật đó không nhìn thấy được.", "It is not visible. menaruh not setelah is dan menyatakan bendanya tidak terlihat.", "It is not visible. not sözcüğünü is sonrasına koyar ve şeyin görünmediğini söyler.", "It is not visible. stawia not po is i mówi, że rzeczy nie widać."),
  ),
  introPage(
    "formula",
    "it_contraction_then_not",
    localized("It's уже содержит is", "It's уже містить is", "It's ya contiene is", "It's já contém is", "It's đã chứa is", "It's sudah memuat is", "It's zaten is içerir", "It's zawiera już is"),
    localized(
      "It is not hidden. Это «оно не спрятано»: not стоит сразу после is.",
      "It is not hidden. Це «воно не приховане»: not стоїть одразу після is.",
      "It is not hidden. Significa «no está oculto»: not queda justo después de is.",
      "It is not hidden. Significa «não está escondido»: not fica logo depois de is.",
      "It is not hidden. Nghĩa là “nó không bị giấu”: not đứng ngay sau is.",
      "It is not hidden. Artinya “benda itu tidak tersembunyi”: not tetap setelah is.",
      "It is not hidden. «O gizli değil» demektir: not, is sözcüğünün hemen ardından gelir.",
      "It is not hidden. Znaczy „to nie jest ukryte”: not stoi zaraz po is.",
    ),
    localized("Оно не спрятано. Выберите правильный порядок.", "Воно не приховане. Оберіть правильний порядок.", "No está oculto. Elige el orden correcto.", "Não está escondido. Escolha a ordem correta.", "Nó không bị giấu. Chọn trật tự đúng.", "Benda itu tidak tersembunyi. Pilih urutan yang benar.", "O gizli değil. Doğru sırayı seçin.", "To nie jest ukryte. Wybierz poprawny szyk."),
    ["It is not hidden.", "It not hidden.", "It is hidden."],
    localized("It is not hidden. ставит not после is и перед hidden.", "It is not hidden. ставить not після is і перед hidden.", "It is not hidden. coloca not después de is y antes de hidden.", "It is not hidden. coloca not depois de is e antes de hidden.", "It is not hidden. đặt not sau is và trước hidden.", "It is not hidden. menaruh not setelah is dan sebelum hidden.", "It is not hidden. not sözcüğünü is sonrasına ve hidden önüne koyar.", "It is not hidden. stawia not po is i przed hidden."),
  ),
  introPage(
    "trap",
    "missing_be_or_not",
    localized("Не теряйте is и not", "Не губіть is і not", "No pierdas is ni not", "Não perca is nem not", "Đừng làm mất is và not", "Jangan hilangkan is dan not", "Is ve not kaybolmasın", "Nie gub is ani not"),
    localized(
      "It's not clear. Это «это непонятно». В It's уже содержится is, а not остаётся перед clear.",
      "It's not clear. Це «це незрозуміло». У It's уже міститься is, а not лишається перед clear.",
      "It's not clear. Significa «no está claro». It's ya contiene is y not queda antes de clear.",
      "It's not clear. Significa «não está claro». It's já contém is e not fica antes de clear.",
      "It's not clear. Nghĩa là “điều đó không rõ”. It's đã chứa is và not đứng trước clear.",
      "It's not clear. Artinya “hal itu tidak jelas”. It's sudah memuat is dan not berada sebelum clear.",
      "It's not clear. «Bu açık değil» demektir. It's, is biçimini içerir ve not clear önünde kalır.",
      "It's not clear. Znaczy „to nie jest jasne”. It's zawiera już is, a not stoi przed clear.",
    ),
    localized("Это непонятно. Выберите фразу, где сохранены is и not.", "Це незрозуміло. Оберіть фразу, де збережено is і not.", "No está claro. Elige la frase que conserva is y not.", "Não está claro. Escolha a frase que mantém is e not.", "Điều đó không rõ. Chọn câu giữ đủ is và not.", "Hal itu tidak jelas. Pilih kalimat yang mempertahankan is dan not.", "Bu açık değil. Is ve not sözcüklerini koruyan cümleyi seçin.", "To nie jest jasne. Wybierz zdanie z zachowanymi is i not."),
    ["It's not clear.", "It not clear.", "It's clear."],
    localized("It's not clear. сохраняет is внутри It's и ставит not перед clear.", "It's not clear. зберігає is усередині It's і ставить not перед clear.", "It's not clear. conserva is dentro de It's y coloca not antes de clear.", "It's not clear. mantém is dentro de It's e coloca not antes de clear.", "It's not clear. giữ is trong It's và đặt not trước clear.", "It's not clear. mempertahankan is di dalam It's dan menaruh not sebelum clear.", "It's not clear. is biçimini It's içinde korur ve not sözcüğünü clear önüne koyar.", "It's not clear. zachowuje is w It's i stawia not przed clear."),
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
    id: `e02-s04-word-${target}`,
    target,
    features: ["adjective_state_and_attitude"],
    meaning: EPISODE_02_SESSION_04_LEXICAL_SEEDS_V2[target],
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

export const EPISODE_02_SESSION_04_VOCABULARY_V2 = Object.freeze([
  vocabulary("visible"),
  vocabulary("hidden"),
  vocabulary("clear"),
]);

type PhraseSpec = Readonly<{
  id: string;
  subject: "It" | "I" | "She" | "We" | "He" | "They";
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
    id: "e02-s04-it-is-not-visible",
    subject: "It",
    be: "is",
    adjective: "visible",
    english: "It is not visible.",
    meaning: localized("Этого не видно.", "Цього не видно.", "No se ve.", "Não dá para ver.", "Không nhìn thấy vật đó.", "Benda itu tidak terlihat.", "O görünmüyor.", "Tego nie widać."),
    explanation: localized("Так говорят о кнопке, значке или тексте, который сейчас нельзя увидеть. После It ставим is, затем not и visible.", "Так кажуть про кнопку, значок або текст, якого зараз не видно. Після It ставимо is, далі not і visible.", "Se dice de un botón, icono o texto que ahora no se puede ver. Después de It van is, not y visible.", "Diz-se de um botão, ícone ou texto que não pode ser visto agora. Depois de It vêm is, not e visible.", "Dùng khi nói về nút, biểu tượng hoặc chữ hiện không nhìn thấy. Sau It là is, rồi not và visible.", "Dipakai untuk tombol, ikon, atau teks yang sekarang tidak terlihat. Setelah It ada is, lalu not dan visible.", "Şu anda görülemeyen düğme, simge ya da metin için söylenir. It sonrasında is, not ve visible gelir.", "Tak mówi się o przycisku, ikonie lub tekście, którego teraz nie widać. Po It stoją is, not i visible."),
    features: [NEGATION],
  },
  {
    id: "e02-s04-it-is-not-hidden",
    subject: "It",
    be: "is",
    adjective: "hidden",
    english: "It is not hidden.",
    meaning: localized("Это не спрятано.", "Це не приховано.", "No está oculto.", "Não está escondido.", "Vật đó không bị giấu.", "Benda itu tidak tersembunyi.", "O gizli değil.", "To nie jest ukryte."),
    explanation: localized("Так уточняют, что файл, кнопка или предмет доступны и никто их не прятал. После It ставим is, затем not и hidden. Никаких поисков под ковром.", "Так уточнюють, що файл, кнопку або річ ніхто не ховав. Після It ставимо is, далі not і hidden.", "Aclara que nadie ocultó un archivo, botón u objeto. Después de It van is, not y hidden.", "Esclarece que ninguém escondeu um arquivo, botão ou objeto. Depois de It vêm is, not e hidden.", "Dùng để nói tệp, nút hoặc đồ vật không bị ai giấu. Sau It là is, rồi not và hidden.", "Menjelaskan bahwa berkas, tombol, atau benda tidak disembunyikan. Setelah It ada is, lalu not dan hidden.", "Bir dosya, düğme ya da nesnenin saklanmadığını belirtir. It sonrasında is, not ve hidden gelir.", "Wyjaśnia, że pliku, przycisku lub przedmiotu nikt nie ukrył. Po It stoją is, not i hidden."),
    features: [NEGATION],
  },
  {
    id: "e02-s04-it-is-not-clear",
    subject: "It",
    be: "is",
    adjective: "clear",
    english: "It is not clear.",
    meaning: localized("Это непонятно.", "Це незрозуміло.", "No está claro.", "Não está claro.", "Điều đó không rõ.", "Hal itu tidak jelas.", "Bu açık değil.", "To nie jest jasne."),
    explanation: localized("Так говорят об инструкции или сообщении, которое трудно понять. После It ставим is, затем not и clear.", "Так кажуть про інструкцію або повідомлення, яке важко зрозуміти. Після It ставимо is, далі not і clear.", "Se dice de una instrucción o mensaje difícil de entender. Después de It van is, not y clear.", "Diz-se de uma instrução ou mensagem difícil de entender. Depois de It vêm is, not e clear.", "Dùng khi hướng dẫn hoặc thông báo khó hiểu. Sau It là is, rồi not và clear.", "Dipakai untuk petunjuk atau pesan yang sulit dipahami. Setelah It ada is, lalu not dan clear.", "Anlaşılması zor bir yönerge ya da ileti için söylenir. It sonrasında is, not ve clear gelir.", "Tak mówi się o instrukcji lub komunikacie, który trudno zrozumieć. Po It stoją is, not i clear."),
    features: [NEGATION],
  },
  {
    id: "e02-s04-its-not-visible",
    subject: "It",
    be: "is",
    adjective: "visible",
    english: "It's not visible.",
    contractedSubject: "It's",
    meaning: localized("Этого не видно.", "Цього не видно.", "No se ve.", "Não dá para ver.", "Không nhìn thấy vật đó.", "Benda itu tidak terlihat.", "O görünmüyor.", "Tego nie widać."),
    explanation: localized("Это короткий бытовой вариант той же мысли: нужного элемента не видно. It is сокращается до It's; not остаётся перед visible.", "Це короткий побутовий варіант тієї самої думки: потрібного елемента не видно. It is скорочується до It's; not лишається перед visible.", "Es la versión cotidiana y breve: el elemento no se ve. It is se contrae en It's; not queda antes de visible.", "É a versão cotidiana e curta: o elemento não aparece. It is vira It's; not fica antes de visible.", "Đây là cách nói ngắn trong đời thường: không nhìn thấy mục cần tìm. It is rút thành It's; not đứng trước visible.", "Ini versi sehari-hari yang singkat: unsur yang dicari tidak terlihat. It is menjadi It's; not tetap sebelum visible.", "Aynı düşüncenin kısa günlük biçimidir: gereken öğe görünmüyor. It is, It's olur; not visible önünde kalır.", "To krótka codzienna wersja tej samej myśli: elementu nie widać. It is skraca się do It's; not stoi przed visible."),
    features: [CONTRACTIONS, NEGATION],
  },
  {
    id: "e02-s04-its-not-hidden",
    subject: "It",
    be: "is",
    adjective: "hidden",
    english: "It's not hidden.",
    contractedSubject: "It's",
    meaning: localized("Это не спрятано.", "Це не приховано.", "No está oculto.", "Não está escondido.", "Vật đó không bị giấu.", "Benda itu tidak tersembunyi.", "O gizli değil.", "To nie jest ukryte."),
    explanation: localized("Это короткий ответ о файле или предмете, который никто не прятал. It is сокращается до It's; not остаётся перед hidden.", "Це коротка відповідь про файл або річ, яку ніхто не ховав. It is скорочується до It's; not лишається перед hidden.", "Es una respuesta breve sobre un archivo u objeto que nadie ocultó. It is se contrae en It's; not queda antes de hidden.", "É uma resposta curta sobre um arquivo ou objeto que ninguém escondeu. It is vira It's; not fica antes de hidden.", "Đây là câu trả lời ngắn về tệp hoặc đồ vật không bị ai giấu. It is rút thành It's; not đứng trước hidden.", "Ini jawaban singkat tentang berkas atau benda yang tidak disembunyikan. It is menjadi It's; not tetap sebelum hidden.", "Kimsenin saklamadığı dosya ya da nesneye verilen kısa yanıttır. It is, It's olur; not hidden önünde kalır.", "To krótka odpowiedź o pliku lub rzeczy, której nikt nie ukrył. It is skraca się do It's; not stoi przed hidden."),
    features: [CONTRACTIONS, NEGATION],
  },
]);

const ADJECTIVE_TRAPS: Readonly<Record<Choice, readonly Choice[]>> = Object.freeze({
  visible: ["clear", "aware", "concerned"],
  hidden: ["visible", "clear", "aware"],
  clear: ["visible", "hidden", "convinced"],
  aware: ["convinced", "concerned", "visible"],
  convinced: ["aware", "concerned", "hidden"],
  concerned: ["convinced", "aware", "clear"],
});
const subjectTraps = (subject: string): string[] => {
  const subjects = ["It", "I", "She", "We", "He", "They"] as const;
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
const MISSING_NOT_LABEL = localized(
  "фраза без not",
  "фраза без not",
  "la frase sin not",
  "a frase sem not",
  "câu thiếu not",
  "kalimat tanpa not",
  "not olmayan cümle",
  "zdanie bez not",
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
        reason: grammarReason("not", MISSING_NOT_LABEL[locale])[locale],
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

export const EPISODE_02_SESSION_04_PHRASES_V2 = Object.freeze(PHRASE_SPECS.map(phraseFromSpec));

const words = EPISODE_02_SESSION_04_VOCABULARY_V2;
const phrases = EPISODE_02_SESSION_04_PHRASES_V2;
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
    : ["It", "I", "She", "We", "He", "They", "am", "is", "are", "not", "visible", "hidden", "clear", "aware", "convinced", "concerned"]
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
    referenceAudio: audio(`e02-s04:${kind}:${index}`, target),
    slowReferenceAudio: audio(`e02-s04:${kind}:${index}:slow`, target),
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
    "It is visible.",
    "It is not clear.",
    "It is not hidden.",
  ] as const;
  const meaningsByOption = [
    spec.meaning,
    localized("Это видно.", "Це видно.", "Se ve.", "Dá para ver.", "Có thể nhìn thấy.", "Benda itu terlihat.", "O görünüyor.", "To widać."),
    localized("Это непонятно.", "Це незрозуміло.", "No está claro.", "Não está claro.", "Điều đó không rõ.", "Hal itu tidak jelas.", "Bu açık değil.", "To nie jest jasne."),
    localized("Это не спрятано.", "Це не приховано.", "No está oculto.", "Não está escondido.", "Vật đó không bị giấu.", "Benda itu tidak tersembunyi.", "O gizli değil.", "To nie jest ukryte."),
  ] as const;
  const feedbackByOption = alternatives.map((targetText, optionIndex) => {
    if (optionIndex === 0) return success(spec.english);
    return Object.freeze(Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        `${targetText} — «${meaningsByOption[optionIndex]![locale]}»; ${spec.english} — «${spec.meaning[locale]}».`,
      ]),
    )) as Readonly<Record<(typeof LOCALES)[number], string>>;
  });
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

const retrieval = EPISODE_02_SESSION_03_VOCABULARY_V2;
const familiar = LESSON2_RETRIEVAL_VOCABULARY_V1[0]!;

/** Exact approved 17-family plan. Every new word is grounded three times before phrase use. */
export const EPISODE_02_SESSION_04_MODE_NATIVE_PRACTICE_V2 = Object.freeze([
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
