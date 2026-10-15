export type LearningV2InterfaceLocaleV2 = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";

export type LearningV2EnglishLexicalSenseV2 = Readonly<{
  id: string;
  english: string;
  partOfSpeech: string;
  definitionByLocale: Readonly<Record<LearningV2InterfaceLocaleV2, string>>;
  audioAssetId: string;
  firstEncounterCard: Readonly<{
    blockingBeforeFirstInteraction: true;
    durableUnlockOnFirstDisplay: true;
    suppressBlockingOverlayOnReplay: true;
  }>;
  introductionAbsoluteSessionOrdinal: number;
  neededBySessionIds: readonly string[];
  knownTargetLanguageDependencies: readonly string[];
  sourceEvidenceRefs: readonly string[];
}>;

export type LearningV2EnglishLexicalRetrievalEdgeV2 = Readonly<{
  senseId: string;
  sourceAbsoluteSessionOrdinal: number;
  targetAbsoluteSessionOrdinal: number;
  changedContextRequired: true;
  samePromptForbidden: true;
}>;

const definitions = (
  ru: string,
  uk: string,
  es: string,
  ptBR: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
): Readonly<Record<LearningV2InterfaceLocaleV2, string>> => Object.freeze({ ru, uk, es, "pt-BR": ptBR, vi, id, tr, pl });

const CARD_POLICY = Object.freeze({
  blockingBeforeFirstInteraction: true as const,
  durableUnlockOnFirstDisplay: true as const,
  suppressBlockingOverlayOnReplay: true as const,
});

const sessionId = (absoluteOrdinal: number): string => {
  const lessonOrdinal = Math.floor((absoluteOrdinal - 1) / 56) + 1;
  const sessionOrdinal = ((absoluteOrdinal - 1) % 56) + 1;
  return `lesson-${String(lessonOrdinal).padStart(2, "0")}:session:${String(sessionOrdinal).padStart(2, "0")}`;
};

const sense = (
  id: string,
  english: string,
  partOfSpeech: string,
  definitionByLocale: Readonly<Record<LearningV2InterfaceLocaleV2, string>>,
  lessonOrdinal: number,
): LearningV2EnglishLexicalSenseV2 => {
  const introductionAbsoluteSessionOrdinal = ((lessonOrdinal - 1) * 56) + 1;
  const laterSameLesson = introductionAbsoluteSessionOrdinal + 8;
  const laterLesson = lessonOrdinal < 32 ? introductionAbsoluteSessionOrdinal + 56 : introductionAbsoluteSessionOrdinal + 16;
  return Object.freeze({
    id,
    english,
    partOfSpeech,
    definitionByLocale,
    audioAssetId: `audio.en.lex.${id}.v1`,
    firstEncounterCard: CARD_POLICY,
    introductionAbsoluteSessionOrdinal,
    neededBySessionIds: Object.freeze([
      sessionId(introductionAbsoluteSessionOrdinal),
      sessionId(laterSameLesson),
      sessionId(laterLesson),
    ]),
    knownTargetLanguageDependencies: Object.freeze([]),
    sourceEvidenceRefs: Object.freeze(["EV-EP-01", "OC-FULL-B1-SCOPE-01"]),
  });
};

export const LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2: readonly LearningV2EnglishLexicalSenseV2[] = Object.freeze([
  sense("here.adverb.01", "here", "adverb", definitions(
    "В этом месте, где находится говорящий.",
    "У цьому місці, де перебуває мовець.",
    "En este lugar, donde se encuentra quien habla.",
    "Neste lugar, onde está a pessoa que fala.",
    "Ở nơi người nói đang có mặt.",
    "Di tempat orang yang berbicara berada.",
    "Konuşan kişinin bulunduğu bu yerde.",
    "W tym miejscu, w którym znajduje się osoba mówiąca.",
  ), 1),
  sense("ready.adjective.01", "ready", "adjective", definitions(
    "Состояние человека, который подготовлен и может начать.",
    "Стан людини, яка підготувалася й може почати.",
    "Estado de una persona preparada y capaz de empezar.",
    "Estado de uma pessoa preparada e capaz de começar.",
    "Trạng thái của người đã chuẩn bị xong và có thể bắt đầu.",
    "Keadaan seseorang yang sudah siap untuk memulai.",
    "Hazırlığını tamamlamış ve başlayabilecek durumda olma.",
    "Stan osoby przygotowanej i mogącej zacząć.",
  ), 1),
  sense("tired.adjective.01", "tired", "adjective", definitions(
    "Состояние, когда после нагрузки мало сил.",
    "Стан, коли після навантаження залишилося мало сил.",
    "Estado de tener poca energía después de un esfuerzo.",
    "Estado de ter pouca energia depois de um esforço.",
    "Trạng thái còn ít sức sau khi hoạt động nhiều.",
    "Keadaan kekurangan tenaga setelah banyak beraktivitas.",
    "Bir uğraştan sonra enerjinin azalması durumu.",
    "Stan małej ilości energii po wysiłku.",
  ), 11),
  sense("usually.adverb.01", "usually", "adverb", definitions(
    "Так происходит в большинстве обычных случаев.",
    "Так відбувається в більшості звичайних випадків.",
    "Indica que algo ocurre en la mayoría de las ocasiones normales.",
    "Indica que algo acontece na maioria das ocasiões normais.",
    "Cho biết một việc xảy ra trong phần lớn các trường hợp thông thường.",
    "Menunjukkan bahwa sesuatu terjadi pada kebanyakan keadaan biasa.",
    "Bir şeyin çoğu olağan durumda gerçekleştiğini belirtir.",
    "Wskazuje, że coś dzieje się w większości zwykłych sytuacji.",
  ), 5),
  sense("often.adverb.01", "often", "adverb", definitions(
    "Так происходит много раз, но не всегда.",
    "Так відбувається багато разів, але не завжди.",
    "Indica que algo sucede muchas veces, aunque no siempre.",
    "Indica que algo acontece muitas vezes, mas não sempre.",
    "Cho biết một việc xảy ra nhiều lần nhưng không phải lúc nào cũng vậy.",
    "Menunjukkan bahwa sesuatu terjadi berkali-kali, tetapi tidak selalu.",
    "Bir şeyin birçok kez, ancak her zaman değil, gerçekleştiğini belirtir.",
    "Wskazuje, że coś dzieje się wiele razy, ale nie zawsze.",
  ), 5),
  sense("wait.verb.01", "wait", "verb", definitions(
    "Остаться на месте до события или прихода человека.",
    "Залишатися на місці до події або приходу людини.",
    "Permanecer en un sitio hasta que ocurra algo o llegue alguien.",
    "Permanecer em um lugar até algo acontecer ou alguém chegar.",
    "Ở lại một chỗ cho đến khi việc gì xảy ra hoặc ai đó đến.",
    "Tetap di suatu tempat sampai sesuatu terjadi atau seseorang datang.",
    "Bir olay gerçekleşene ya da biri gelene kadar bir yerde kalmak.",
    "Pozostać w miejscu do chwili zdarzenia lub przyjścia kogoś.",
  ), 9),
  sense("work.verb.01", "work", "verb", definitions(
    "Выполнять задачи как часть работы или занятия.",
    "Виконувати завдання як частину праці або заняття.",
    "Realizar tareas como parte de una ocupación.",
    "Realizar tarefas como parte de uma ocupação.",
    "Thực hiện nhiệm vụ như một phần của nghề nghiệp.",
    "Melakukan tugas sebagai bagian dari suatu pekerjaan.",
    "Bir uğraşın parçası olarak görevleri yerine getirmek.",
    "Wykonywać zadania jako część zajęcia zawodowego.",
  ), 9),
  sense("yesterday.adverb.01", "yesterday", "adverb", definitions(
    "День непосредственно перед сегодняшним.",
    "День безпосередньо перед сьогоднішнім.",
    "El día inmediatamente anterior al de hoy.",
    "O dia imediatamente anterior ao de hoje.",
    "Ngày ngay trước hôm nay.",
    "Hari tepat sebelum hari ini.",
    "Bugünden hemen önceki gün.",
    "Dzień bezpośrednio poprzedzający dzisiejszy.",
  ), 13),
  sense("suddenly.adverb.01", "suddenly", "adverb", definitions(
    "Неожиданно и без заметного предупреждения.",
    "Несподівано й без помітного попередження.",
    "De manera inesperada y sin una señal clara previa.",
    "De modo inesperado e sem um aviso claro antes.",
    "Theo cách bất ngờ và không có dấu hiệu rõ ràng trước đó.",
    "Dengan cara yang tidak terduga dan tanpa tanda yang jelas sebelumnya.",
    "Beklenmedik biçimde ve önceden belirgin bir işaret olmadan.",
    "Niespodziewanie i bez wyraźnego wcześniejszego sygnału.",
  ), 13),
  sense("amount.noun.01", "amount", "noun", definitions(
    "Количество вещества или того, что обычно не считают поштучно.",
    "Кількість речовини або того, що зазвичай не рахують поштучно.",
    "Cantidad de una sustancia o de algo que normalmente no se cuenta por unidades.",
    "Quantidade de uma substância ou de algo que normalmente não se conta por unidades.",
    "Lượng của một chất hoặc thứ thường không được đếm từng đơn vị.",
    "Kuantitas zat atau hal yang biasanya tidak dihitung satu per satu.",
    "Genellikle tek tek sayılmayan bir maddenin niceliği.",
    "Ilość substancji lub czegoś, czego zwykle nie liczy się sztukami.",
  ), 17),
  sense("bottle.noun.01", "bottle", "noun", definitions(
    "Сосуд с узким горлышком для хранения жидкости.",
    "Посудина з вузькою шийкою для зберігання рідини.",
    "Recipiente de cuello estrecho usado para guardar líquidos.",
    "Recipiente de gargalo estreito usado para guardar líquidos.",
    "Đồ đựng có cổ hẹp dùng để chứa chất lỏng.",
    "Wadah berleher sempit untuk menyimpan cairan.",
    "Sıvı saklamak için kullanılan dar boyunlu kap.",
    "Naczynie z wąską szyjką służące do przechowywania płynu.",
  ), 17),
  sense("purpose.noun.01", "purpose", "noun", definitions(
    "Причина, ради которой выполняют действие.",
    "Причина, заради якої виконують дію.",
    "Razón por la que se realiza una acción.",
    "Razão pela qual uma ação é realizada.",
    "Lý do khiến một hành động được thực hiện.",
    "Alasan suatu tindakan dilakukan.",
    "Bir eylemin yapılma nedeni.",
    "Powód, dla którego wykonuje się działanie.",
  ), 21),
  sense("prefer.verb.01", "prefer", "verb", definitions(
    "Выбирать один вариант как более желательный.",
    "Обирати один варіант як більш бажаний.",
    "Elegir una opción porque resulta más deseable.",
    "Escolher uma opção por ser mais desejável.",
    "Chọn một phương án vì thấy nó đáng mong muốn hơn.",
    "Memilih satu pilihan karena lebih diinginkan.",
    "Bir seçeneği daha çok istenen olarak seçmek.",
    "Wybierać jedną możliwość jako bardziej pożądaną.",
  ), 21),
  sense("habit.noun.01", "habit", "noun", definitions(
    "Действие, которое человек регулярно повторяет.",
    "Дія, яку людина регулярно повторює.",
    "Acción que una persona repite con regularidad.",
    "Ação que uma pessoa repete com regularidade.",
    "Hành động một người lặp lại thường xuyên.",
    "Tindakan yang dilakukan seseorang secara teratur.",
    "Bir kişinin düzenli olarak tekrarladığı davranış.",
    "Czynność regularnie powtarzana przez daną osobę.",
  ), 25),
  sense("before.preposition.01", "before", "preposition", definitions(
    "Раньше другого указанного события или момента.",
    "Раніше за іншу вказану подію або момент.",
    "En un momento anterior a otro hecho indicado.",
    "Em um momento anterior a outro fato indicado.",
    "Ở thời điểm sớm hơn một sự việc đã nêu.",
    "Pada waktu yang lebih awal daripada kejadian yang disebutkan.",
    "Belirtilen başka bir olaydan daha erken zamanda.",
    "W czasie wcześniejszym niż wskazane zdarzenie.",
  ), 25),
  sense("person.noun.01", "person", "noun", definitions(
    "Один человек без уточнения пола или роли.",
    "Одна людина без уточнення статі чи ролі.",
    "Un ser humano sin especificar su género ni su función.",
    "Um ser humano sem especificar gênero ou função.",
    "Một con người không nêu rõ giới tính hay vai trò.",
    "Seorang manusia tanpa menyebutkan jenis kelamin atau perannya.",
    "Cinsiyeti ya da rolü belirtilmeyen bir insan.",
    "Jeden człowiek bez wskazywania płci ani roli.",
  ), 29),
  sense("place.noun.01", "place", "noun", definitions(
    "Определённая точка или территория, где что-то находится или происходит.",
    "Певна точка або територія, де щось є чи відбувається.",
    "Punto o zona determinada donde algo está o sucede.",
    "Ponto ou área determinada onde algo está ou acontece.",
    "Một điểm hoặc khu vực xác định, nơi có hoặc xảy ra điều gì đó.",
    "Titik atau area tertentu tempat sesuatu berada atau terjadi.",
    "Bir şeyin bulunduğu ya da gerçekleştiği belirli nokta veya alan.",
    "Określony punkt lub obszar, w którym coś się znajduje albo dzieje.",
  ), 29),
]);

export const LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V2: readonly LearningV2EnglishLexicalRetrievalEdgeV2[] = Object.freeze(
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2.flatMap((lexicalSense) => [
    Object.freeze({
      senseId: lexicalSense.id,
      sourceAbsoluteSessionOrdinal: lexicalSense.introductionAbsoluteSessionOrdinal,
      targetAbsoluteSessionOrdinal: lexicalSense.introductionAbsoluteSessionOrdinal + 8,
      changedContextRequired: true as const,
      samePromptForbidden: true as const,
    }),
    Object.freeze({
      senseId: lexicalSense.id,
      sourceAbsoluteSessionOrdinal: lexicalSense.introductionAbsoluteSessionOrdinal,
      targetAbsoluteSessionOrdinal: lexicalSense.introductionAbsoluteSessionOrdinal + (lexicalSense.introductionAbsoluteSessionOrdinal <= 1736 ? 56 : 16),
      changedContextRequired: true as const,
      samePromptForbidden: true as const,
    }),
  ]),
);
