import type { LearningV2ModeNativePayloadV1 } from "../../contracts/mode_native_payload_v1";
import type { EpisodeSourcePhrase } from "./episode_01_source_v1";
import { LESSON2_RETRIEVAL_VOCABULARY_V1 } from "./lesson2_retrieval_vocabulary_v1";
import { EPISODE_02_SESSION_01_VOCABULARY_V2 } from "./episode_02_session_01_content_v2";
import {
  expandLocalized,
  type LocalizedSource,
  type SessionModeNativePracticeSourceV1,
  type SessionSourceIntroPage,
  type SessionVocabularySourceV1,
} from "./session_shard_from_source_v1";

type NewWord = "confident" | "relaxed" | "satisfied";
type Choice = NewWord | "sure" | "interested" | "comfortable";
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

export const EPISODE_02_SESSION_02_LEXICAL_SEEDS_V2: Readonly<
  Record<NewWord, LocalizedSource>
> = Object.freeze({
  confident: localized(
    "уверенный в себе и своих способностях",
    "упевнений у собі та своїх здібностях",
    "seguro de sí mismo y de sus capacidades",
    "confiante em si e nas próprias capacidades",
    "tự tin vào bản thân và khả năng của mình",
    "percaya diri pada diri dan kemampuannya",
    "kendine ve yeteneklerine güvenen",
    "pewny siebie i swoich umiejętności",
  ),
  relaxed: localized(
    "спокойный и свободный от напряжения",
    "спокійний і вільний від напруження",
    "tranquilo y libre de tensión",
    "calmo e livre de tensão",
    "thư giãn, bình tĩnh và không căng thẳng",
    "santai, tenang, dan bebas dari ketegangan",
    "sakin ve gerginlikten uzak",
    "spokojny i wolny od napięcia",
  ),
  satisfied: localized(
    "довольный, потому что результат соответствует ожиданиям",
    "задоволений, бо результат відповідає очікуванням",
    "satisfecho porque el resultado cumple lo esperado",
    "satisfeito porque o resultado corresponde ao esperado",
    "hài lòng vì kết quả đáp ứng điều mong đợi",
    "puas karena hasilnya sesuai harapan",
    "sonuç beklentiyi karşıladığı için memnun",
    "zadowolony, bo wynik spełnia oczekiwania",
  ),
});

const retrievalMeanings = Object.freeze({
  sure: EPISODE_02_SESSION_01_VOCABULARY_V2[0]!.meaning,
  interested: EPISODE_02_SESSION_01_VOCABULARY_V2[1]!.meaning,
  comfortable: EPISODE_02_SESSION_01_VOCABULARY_V2[2]!.meaning,
});
const meanings: Readonly<Record<Choice, LocalizedSource>> = Object.freeze({
  ...EPISODE_02_SESSION_02_LEXICAL_SEEDS_V2,
  ...retrievalMeanings,
});
const FEEDBACK_LABELS: Readonly<Record<Choice, LocalizedSource>> = Object.freeze({
  confident: localized("уверен в своих силах", "упевнений у своїх силах", "seguro de sus capacidades", "confiante nas próprias capacidades", "tự tin vào khả năng của mình", "percaya pada kemampuannya", "yeteneklerine güveniyor", "pewny swoich umiejętności"),
  relaxed: localized("спокоен и не напряжён", "спокійний і не напружений", "está tranquilo, sin tensión", "está calmo, sem tensão", "bình tĩnh và không căng thẳng", "tenang dan tidak tegang", "sakin ve gergin değil", "jest spokojny i bez napięcia"),
  satisfied: localized("доволен результатом", "задоволений результатом", "está satisfecho con el resultado", "está satisfeito com o resultado", "hài lòng với kết quả", "puas dengan hasilnya", "sonuçtan memnun", "jest zadowolony z wyniku"),
  sure: localized("не сомневается в факте", "не сумнівається у факті", "no duda del hecho", "não duvida do fato", "không nghi ngờ sự thật", "tidak meragukan faktanya", "gerçekten kuşku duymuyor", "nie wątpi w fakt"),
  interested: localized("хочет узнать или участвовать", "хоче дізнатися або долучитися", "quiere saber o participar", "quer saber ou participar", "muốn biết hoặc tham gia", "ingin tahu atau ikut", "öğrenmek ya da katılmak istiyor", "chce wiedzieć lub uczestniczyć"),
  comfortable: localized("чувствует себя удобно и спокойно", "почувається зручно й спокійно", "se siente cómodo y tranquilo", "sente-se confortável e tranquilo", "cảm thấy thoải mái và yên tâm", "merasa nyaman dan tenang", "rahat ve sakin hissediyor", "czuje się swobodnie i spokojnie"),
});
const TRAPS: Readonly<Record<NewWord, readonly Choice[]>> = Object.freeze({
  confident: ["relaxed", "satisfied", "sure"],
  relaxed: ["confident", "satisfied", "interested"],
  satisfied: ["relaxed", "confident", "comfortable"],
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

export const EPISODE_02_SESSION_02_TITLE_V2 = localized(
  "Коротко сказать «не»",
  "Коротко сказати «не»",
  "Decir «no» de forma breve",
  "Dizer «não» de forma breve",
  "Nói «không» bằng dạng ngắn",
  "Mengatakan «tidak» dengan bentuk singkat",
  "Kısa biçimle «değil» demek",
  "Krótko powiedzieć „nie”",
);
export const EPISODE_02_SESSION_02_SUMMARY_V2 = localized(
  "Ставим not сразу после am, is или are и различаем confident, relaxed и satisfied.",
  "Ставимо not одразу після am, is або are та розрізняємо confident, relaxed і satisfied.",
  "Colocamos not justo después de am, is o are y distinguimos confident, relaxed y satisfied.",
  "Colocamos not logo depois de am, is ou are e distinguimos confident, relaxed e satisfied.",
  "Đặt not ngay sau am, is hoặc are và phân biệt confident, relaxed với satisfied.",
  "Menempatkan not tepat setelah am, is, atau are serta membedakan confident, relaxed, dan satisfied.",
  "Not sözcüğünü am, is ya da are sonrasına koyup confident, relaxed ve satisfied anlamlarını ayırırız.",
  "Stawiamy not bezpośrednio po am, is lub are i rozróżniamy confident, relaxed oraz satisfied.",
);
export const EPISODE_02_SESSION_02_GOAL_V2 = localized(
  "Уверенно сочетать знакомые сокращения с not и новыми состояниями.",
  "Упевнено поєднувати знайомі скорочення з not і новими станами.",
  "Combinar con seguridad las contracciones conocidas con not y estados nuevos.",
  "Combinar com segurança as contrações conhecidas com not e estados novos.",
  "Kết hợp tự tin các dạng rút gọn đã biết với not và trạng thái mới.",
  "Menggabungkan kontraksi yang sudah dikenal dengan not dan keadaan baru.",
  "Bilinen kısaltmaları not ve yeni durumlarla güvenle birleştirmek.",
  "Pewnie łączyć znane skróty z not i nowymi stanami.",
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

export const EPISODE_02_SESSION_02_INTRO_V2 = Object.freeze([
  introPage(
    "concept",
    "negation_meaning",
    localized("Not отменяет состояние", "Not заперечує стан", "Not niega el estado", "Not nega o estado", "Not phủ định trạng thái", "Not menyangkal keadaan", "Not durumu olumsuz yapar", "Not zaprzecza stanowi"),
    localized(
      "I am confident. — «я уверен»; I am not confident. — «я не уверен»: not отменяет состояние confident.",
      "I am confident. — «я впевнений»; I am not confident. — «я не впевнений»: not заперечує стан confident.",
      "I am confident. — «estoy seguro»; I am not confident. — «no estoy seguro»: not niega el estado confident.",
      "I am confident. — “estou certo”; I am not confident. — “não estou certo”: not nega o estado confident.",
      "I am confident. — “tôi chắc chắn”; I am not confident. — “tôi không chắc”: not phủ định trạng thái confident.",
      "I am confident. — “saya yakin”; I am not confident. — “saya tidak yakin”: not menyangkal keadaan confident.",
      "I am confident. — “eminim”; I am not confident. — “emin değilim”: not, confident durumunu olumsuz yapar.",
      "I am confident. — „jestem pewny”; I am not confident. — „nie jestem pewny”: not zaprzecza stanowi confident.",
    ),
    localized("Говорящий сомневается. Выберите точную фразу.", "Мовець сумнівається. Оберіть точну фразу.", "Quien habla tiene dudas. Elige la frase exacta.", "Quem fala tem dúvidas. Escolha a frase exata.", "Người nói còn nghi ngờ. Chọn câu chính xác.", "Penutur masih ragu. Pilih kalimat yang tepat.", "Konuşanın kuşkusu var. Tam cümleyi seçin.", "Mówiący ma wątpliwości. Wybierz dokładne zdanie."),
    ["I am not confident.", "I am confident.", "I not am confident."],
    localized("I am not confident. сохраняет I am и добавляет not сразу после am: состояние отрицается.", "I am not confident. зберігає I am і додає not одразу після am: стан заперечено.", "I am not confident. conserva I am y añade not justo después de am: el estado queda negado.", "I am not confident. mantém I am e acrescenta not logo depois de am: o estado é negado.", "I am not confident. giữ I am và thêm not ngay sau am: trạng thái bị phủ định.", "I am not confident. mempertahankan I am dan menambah not tepat setelah am: keadaannya disangkal.", "I am not confident. I am yapısını korur ve not sözcüğünü am sonrasına ekler: durum olumsuzdur.", "I am not confident. zachowuje I am i dodaje not zaraz po am: stan zostaje zaprzeczony."),
  ),
  introPage(
    "formula",
    "negation_form",
    localized("Be, затем not", "Be, потім not", "Be y después not", "Be e depois not", "Be rồi đến not", "Be lalu not", "Önce be, sonra not", "Be, a potem not"),
    localized(
      "Формула одна: участник + am/is/are + not + описание. She is not relaxed. — she, затем is, затем not. Знакомая форма be остаётся на своём месте.",
      "Формула одна: учасник + am/is/are + not + опис. She is not relaxed. — she, потім is, потім not. Знайома форма be лишається на своєму місці.",
      "La fórmula es sujeto + am/is/are + not + descripción. She is not relaxed. lleva she, después is y después not. La forma conocida de be no se mueve.",
      "A fórmula é sujeito + am/is/are + not + descrição. She is not relaxed. traz she, depois is e depois not. A forma conhecida de be não muda de lugar.",
      "Công thức là chủ thể + am/is/are + not + mô tả. She is not relaxed. có she, rồi is, rồi not. Dạng be đã biết vẫn ở đúng chỗ.",
      "Rumusnya pelaku + am/is/are + not + deskripsi. She is not relaxed. memakai she, lalu is, lalu not. Bentuk be yang dikenal tetap di tempatnya.",
      "Formül özne + am/is/are + not + açıklamadır. She is not relaxed. içinde önce she, sonra is, ardından not gelir. Bilinen be biçimi yerinde kalır.",
      "Wzór to podmiot + am/is/are + not + opis. W She is not relaxed. najpierw jest she, potem is, a następnie not. Znana forma be pozostaje na miejscu.",
    ),
    localized("Она не заинтересована. Выберите правильный порядок.", "Вона не зацікавлена. Оберіть правильний порядок.", "Ella no está interesada. Elige el orden correcto.", "Ela não está interessada. Escolha a ordem correta.", "Cô ấy không quan tâm. Chọn đúng thứ tự.", "Dia tidak tertarik. Pilih urutan yang tepat.", "O ilgili değil. Doğru sırayı seçin.", "Ona nie jest zainteresowana. Wybierz poprawny szyk."),
    ["She is not relaxed.", "She not is relaxed.", "She is relaxed not."],
    localized("She is not relaxed. ставит not после is. Два других варианта переносят not в неверную позицию.", "She is not relaxed. ставить not після is. Два інші варіанти переносять not у хибну позицію.", "She is not relaxed. coloca not después de is. Las otras opciones mueven not a una posición incorrecta.", "She is not relaxed. coloca not depois de is. As outras opções levam not para uma posição errada.", "She is not relaxed. đặt not sau is. Hai lựa chọn kia chuyển not sang vị trí sai.", "She is not relaxed. menempatkan not setelah is. Dua pilihan lain memindahkan not ke posisi yang salah.", "She is not relaxed. not sözcüğünü is sonrasına koyar. Diğer seçeneklerde not yanlış konumdadır.", "She is not relaxed. stawia not po is. Pozostałe opcje przenoszą not w błędne miejsce."),
  ),
  introPage(
    "trap",
    "negation_position",
    localized("Not не прыгает", "Not не стрибає", "Not no salta", "Not não pula", "Not không nhảy vị trí", "Not tidak berpindah-pindah", "Not yer değiştirmez", "Not nie skacze"),
    localized(
      "В We are not satisfied. слово not стоит сразу после are. Не ставьте его перед are и не отправляйте в конец: английская связка держит отрицание рядом с be.",
      "У We are not satisfied. слово not стоїть одразу після are. Не ставте його перед are і не відправляйте в кінець: англійська зв’язка тримає заперечення поруч із be.",
      "En We are not satisfied., not va justo después de are. No lo pongas antes de are ni al final: la estructura inglesa mantiene la negación junto a be.",
      "Em We are not satisfied., not vem logo depois de are. Não o coloque antes de are nem no fim: a estrutura inglesa mantém a negação junto de be.",
      "Trong We are not satisfied., not đứng ngay sau are. Đừng đặt nó trước are hay cuối câu: cấu trúc tiếng Anh giữ phủ định cạnh be.",
      "Dalam We are not satisfied., not tepat setelah are. Jangan taruh sebelum are atau di akhir: pola Inggris menjaga negasi di dekat be.",
      "We are not satisfied. cümlesinde not hemen are sonrasındadır. Onu are önüne ya da sona koymayın: İngilizce yapı olumsuzluğu be yanında tutar.",
      "W We are not satisfied. słowo not stoi zaraz po are. Nie stawiaj go przed are ani na końcu: angielska konstrukcja trzyma przeczenie obok be.",
    ),
    localized("Нам некомфортно. Выберите фразу без ошибки порядка.", "Нам некомфортно. Оберіть фразу без помилки в порядку.", "No estamos cómodos. Elige la frase sin error de orden.", "Não estamos confortáveis. Escolha a frase sem erro de ordem.", "Chúng tôi không thoải mái. Chọn câu đúng trật tự.", "Kami tidak nyaman. Pilih kalimat dengan urutan yang benar.", "Rahat değiliz. Sözcük sırası doğru cümleyi seçin.", "Nie czujemy się komfortowo. Wybierz zdanie z poprawnym szykiem."),
    ["We are not satisfied.", "We not are satisfied.", "We are satisfied not."],
    localized("We are not satisfied. сохраняет связку we are и ставит not сразу после are.", "We are not satisfied. зберігає зв’язку we are та ставить not одразу після are.", "We are not satisfied. conserva we are y coloca not justo después de are.", "We are not satisfied. mantém we are e coloca not logo depois de are.", "We are not satisfied. giữ we are và đặt not ngay sau are.", "We are not satisfied. mempertahankan we are dan menaruh not tepat setelah are.", "We are not satisfied. we are bağlantısını korur ve not sözcüğünü are sonrasına koyar.", "We are not satisfied. zachowuje we are i stawia not zaraz po are."),
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
    id: `e02-s02-word-${target}`,
    target,
    features: ["adjective_state_and_attitude"],
    meaning: EPISODE_02_SESSION_02_LEXICAL_SEEDS_V2[target],
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

export const EPISODE_02_SESSION_02_VOCABULARY_V2 = Object.freeze([
  vocabulary("confident"),
  vocabulary("relaxed"),
  vocabulary("satisfied"),
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
    id: "e02-s02-he-is-not-confident", subject: "He", be: "is", adjective: "confident", english: "He is not confident.",
    meaning: localized("Он не уверен в себе.", "Він не впевнений у собі.", "Él no tiene confianza.", "Ele não está confiante.", "Anh ấy không tự tin.", "Dia tidak percaya diri.", "O kendinden emin değil.", "On nie jest pewny siebie."),
    explanation: localized("Мужчина сомневается в своих силах. После he нужна is, затем not и состояние confident.", "Чоловік сумнівається у своїх силах. Після he потрібна is, далі not і стан confident.", "El hombre duda de sus capacidades. Después de he va is, luego not y el estado confident.", "O homem duvida da própria capacidade. Depois de he vem is, depois not e o estado confident.", "Người đàn ông nghi ngờ khả năng của mình. Sau he là is, rồi not và trạng thái confident.", "Pria itu meragukan kemampuannya. Setelah he digunakan is, lalu not dan keadaan confident.", "Adam kendi gücünden kuşku duyuyor. He sonrasında is, ardından not ve confident durumu gelir.", "Mężczyzna wątpi w swoje możliwości. Po he stoi is, potem not i stan confident."),
  },
  {
    id: "e02-s02-they-are-not-relaxed", subject: "They", be: "are", adjective: "relaxed", english: "They are not relaxed.",
    meaning: localized("Они не расслаблены.", "Вони не розслаблені.", "No están relajados.", "Eles não estão relaxados.", "Họ không thư giãn.", "Mereka tidak santai.", "Onlar rahat değil.", "Oni nie są zrelaksowani."),
    explanation: localized("Несколько людей напряжены. После they нужна are, затем not и состояние relaxed.", "Кілька людей напружені. Після they потрібна are, далі not і стан relaxed.", "Varias personas están tensas. Después de they va are, luego not y el estado relaxed.", "Várias pessoas estão tensas. Depois de they vem are, depois not e o estado relaxed.", "Một nhóm người đang căng thẳng. Sau they là are, rồi not và trạng thái relaxed.", "Beberapa orang sedang tegang. Setelah they digunakan are, lalu not dan keadaan relaxed.", "Birkaç kişi gergin. They sonrasında are, ardından not ve relaxed durumu gelir.", "Kilka osób jest spiętych. Po they stoi are, potem not i stan relaxed."),
  },
  {
    id: "e02-s02-i-am-not-satisfied", subject: "I", be: "am", adjective: "satisfied", english: "I am not satisfied.",
    meaning: localized("Я не доволен.", "Я не задоволений.", "No estoy satisfecho.", "Não estou satisfeito.", "Tôi không hài lòng.", "Saya tidak puas.", "Memnun değilim.", "Nie jestem zadowolony."),
    explanation: localized("Говорящий недоволен результатом. После I нужна am, затем not и состояние satisfied.", "Мовець незадоволений результатом. Після I потрібна am, далі not і стан satisfied.", "Quien habla no está contento con el resultado. Después de I va am, luego not y el estado satisfied.", "Quem fala não está contente com o resultado. Depois de I vem am, depois not e o estado satisfied.", "Người nói không hài lòng với kết quả. Sau I là am, rồi not và trạng thái satisfied.", "Pembicara tidak puas dengan hasilnya. Setelah I digunakan am, lalu not dan keadaan satisfied.", "Konuşan sonuçtan memnun değil. I sonrasında am, ardından not ve satisfied durumu gelir.", "Mówiący nie jest zadowolony z wyniku. Po I stoi am, potem not i stan satisfied."),
  },
  {
    id: "e02-s02-he-is-not-sure", subject: "He", be: "is", adjective: "sure", english: "He is not sure.",
    meaning: localized("Он не ответственен.", "Він не відповідальний.", "Él no es responsable.", "Ele não é responsável.", "Anh ấy không có trách nhiệm.", "Dia tidak bertanggung jawab.", "O sorumlu değil.", "On nie jest odpowiedzialny."),
    explanation: localized("Так отрицают знакомое качество sure и сообщают, что мужчина не выполняет обязанности. Для he нужна форма is. Not остаётся сразу после is.", "Це перенесення заперечення на знайоме sure. He вимагає is, а not лишається після is.", "Transfiere la negación al conocido sure. He exige is y not permanece después de is.", "Transfere a negação para o conhecido sure. He exige is e not continua depois de is.", "Đây là chuyển phủ định sang từ sure đã biết. He đi với is, còn not vẫn sau is.", "Ini memindahkan negasi ke sure yang sudah dikenal. He memakai is dan not tetap setelah is.", "Olumsuzluk bilinen sure sözcüğüne aktarılır. He ile is gerekir; not yine is sonrasındadır.", "To przeniesienie przeczenia na znane sure. He wymaga is, a not pozostaje po is."),
  },
  {
    id: "e02-s02-were-not-comfortable", subject: "We", be: "are", adjective: "comfortable", english: "We're not comfortable.",
    meaning: localized("Нам некомфортно.", "Нам некомфортно.", "No estamos cómodos.", "Não estamos confortáveis.", "Chúng tôi không thoải mái.", "Kami tidak nyaman.", "Rahat değiliz.", "Nie czujemy się komfortowo."),
    explanation: localized("We're — знакомое сокращение We are. Not остаётся после формы be и отрицает comfortable.", "We're — знайоме скорочення We are. Not лишається після форми be й заперечує comfortable.", "We're es la contracción conocida de We are. Not permanece después de be y niega comfortable.", "We're é a contração conhecida de We are. Not fica depois de be e nega comfortable.", "We're là dạng rút gọn đã biết của We are. Not vẫn đứng sau be và phủ định comfortable.", "We're adalah singkatan We are yang sudah dikenal. Not tetap setelah be dan menyangkal comfortable.", "We're, We are yapısının bilinen kısaltmasıdır. Not be sonrasında kalır ve comfortable durumunu olumsuz yapar.", "We're to znany skrót od We are. Not pozostaje po formie be i przeczy comfortable."),
  },
]);

const ADJECTIVE_TRAPS: Readonly<Record<Choice, readonly Choice[]>> = Object.freeze({
  confident: ["relaxed", "satisfied", "sure"],
  relaxed: ["confident", "satisfied", "interested"],
  satisfied: ["relaxed", "confident", "comfortable"],
  sure: ["interested", "comfortable", "confident"],
  interested: ["comfortable", "sure", "satisfied"],
  comfortable: ["interested", "sure", "relaxed"],
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
  const wordDefinitions = spec.english === "We're not comfortable."
    ? [
        { correct: "We're", category: "subject_be_contraction", traps: ["They're", "We", "We're not"] },
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
    explanation: `${spec.explanation.ru} Участник и форма be остаются согласованными, а not стоит сразу после be.`,
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

export const EPISODE_02_SESSION_02_PHRASES_V2 = Object.freeze(PHRASE_SPECS.map(phraseFromSpec));

const words = EPISODE_02_SESSION_02_VOCABULARY_V2;
const phrases = EPISODE_02_SESSION_02_PHRASES_V2;
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
    : ["I", "She", "We", "He", "They", "am", "is", "are", "not", "confident", "relaxed", "satisfied", "sure", "comfortable"]
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
    referenceAudio: audio(`e02-s02:${kind}:${index}`, target),
    slowReferenceAudio: audio(`e02-s02:${kind}:${index}:slow`, target),
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

const retrieval = EPISODE_02_SESSION_01_VOCABULARY_V2;
const familiar = LESSON2_RETRIEVAL_VOCABULARY_V1[0]!;

/** Exact approved 17-family plan. Every new word is grounded three times before phrase use. */
export const EPISODE_02_SESSION_02_MODE_NATIVE_PRACTICE_V2 = Object.freeze([
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
