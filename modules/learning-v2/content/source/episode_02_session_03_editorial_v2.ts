import type { LearningV2NewWordCardEditorialV1 } from "./learning_v2_new_word_card_editorial_v1";

const editorial = (
  lexicalItemId: string,
  targetText: string,
  transcription: string,
  playfulMeaningByLocale: LearningV2NewWordCardEditorialV1["playfulMeaningByLocale"],
): LearningV2NewWordCardEditorialV1 => Object.freeze({
  targetLanguage: "en",
  lexicalItemId,
  targetText,
  transcription,
  playfulMeaningByLocale: Object.freeze(playfulMeaningByLocale),
});

/** Hand-edited first-contact cards for approved Full B1 Lesson 2 Session 3. */
export const EPISODE_02_SESSION_03_WORD_CARD_EDITORIAL_V2 = Object.freeze([
  editorial("e02-s03-word-aware", "aware", "/əˈweə(r)/", {
    ru: "Знающий о факте или замечающий происходящее. Новость уже дошла до внутренней стойки регистрации и получила штамп.",
    uk: "Той, хто знає про факт або помічає, що відбувається. Новина вже дійшла до внутрішньої стійки реєстрації й отримала штамп.",
    es: "Consciente de un hecho o de lo que sucede. La noticia ya llegó a la recepción interior y recibió su sello.",
    en: "Aware: knowing a fact or noticing what is happening. The news has reached the inner reception desk and received its stamp.",
    "pt-BR": "Ciente de um fato ou do que acontece. A notícia já chegou à recepção interior e recebeu seu carimbo.",
    vi: "Biết một sự việc hoặc nhận ra điều đang xảy ra. Tin tức đã tới quầy tiếp nhận bên trong và được đóng dấu.",
    id: "Mengetahui suatu fakta atau menyadari hal yang terjadi. Beritanya sudah tiba di meja penerima batin dan mendapat stempel.",
    tr: "Bir gerçeği bilen ya da olup biteni fark eden. Haber iç resepsiyona ulaşıp damgasını çoktan aldı.",
    pl: "Świadomy faktu albo tego, co się dzieje. Wiadomość dotarła już do wewnętrznej recepcji i dostała pieczątkę.",
  }),
  editorial("e02-s03-word-convinced", "convinced", "/kənˈvɪnst/", {
    ru: "Убеждённый: полностью верит, что это правда. Внутренний судья выслушал доводы и торжественно убрал молоток.",
    uk: "Переконаний: цілком вірить, що це правда. Внутрішній суддя вислухав докази й урочисто відклав молоток.",
    es: "Convencido: cree por completo que algo es verdad. El juez interior oyó las pruebas y guardó solemnemente el mazo.",
    en: "Convinced: fully believing that something is true. The inner judge has heard the evidence and solemnly put the gavel away.",
    "pt-BR": "Convencido: acredita plenamente que algo é verdade. O juiz interior ouviu as provas e guardou solenemente o martelo.",
    vi: "Tin chắc rằng điều gì đó là đúng. Vị thẩm phán bên trong đã nghe đủ bằng chứng và trang trọng cất búa.",
    id: "Yakin sepenuhnya bahwa sesuatu itu benar. Hakim batin sudah mendengar buktinya lalu menyimpan palu dengan khidmat.",
    tr: "Bir şeyin doğru olduğuna tamamen inanmış. İçindeki yargıç kanıtları dinleyip tokmağı törenle kaldırdı.",
    pl: "Przekonany, że coś jest prawdą. Wewnętrzny sędzia wysłuchał dowodów i uroczyście odłożył młotek.",
  }),
  editorial("e02-s03-word-concerned", "concerned", "/kənˈsɜːnd/", {
    ru: "Обеспокоенный: тревожится из-за возможной проблемы. Внутренняя сигнализация заметила дым ещё до появления огня.",
    uk: "Стурбований: хвилюється через можливу проблему. Внутрішня сигналізація помітила дим ще до появи вогню.",
    es: "Preocupado por un posible problema. La alarma interior detectó humo incluso antes de que apareciera el fuego.",
    en: "Concerned: worried about a possible problem. The inner alarm has noticed smoke before any fire appeared.",
    "pt-BR": "Preocupado com um possível problema. O alarme interior percebeu fumaça antes mesmo de aparecer fogo.",
    vi: "Lo lắng về một vấn đề có thể xảy ra. Chuông báo động bên trong đã thấy khói trước cả khi có lửa.",
    id: "Khawatir tentang masalah yang mungkin terjadi. Alarm batin sudah melihat asap bahkan sebelum api muncul.",
    tr: "Olası bir sorun yüzünden endişeli. İç alarm daha ateş görünmeden dumanı fark etti.",
    pl: "Zaniepokojony możliwym problemem. Wewnętrzny alarm zauważył dym, zanim pojawił się ogień.",
  }),
]);
