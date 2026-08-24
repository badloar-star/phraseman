import type {
  LocalizedIntroRunsSource,
  LocalizedSource,
} from "./session_shard_from_source_v1";

type Locale = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
const LOCALES: readonly Locale[] = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"];
const L = (value: Record<Locale, string>): LocalizedSource => value as LocalizedSource;

export const EPISODE_01_SESSION_16_EDITORIAL_INTRO_V1: readonly LocalizedSource[] = Object.freeze([
  L({
    ru: "I am here. и You are here. называют одно место, но не одного человека. I показывает на говорящего и всегда держит рядом am. You обращается к собеседнику и выбирает are. Поэтому правильная реплика собеседнику — You are here.: место here не меняется, а форма связки меняется вместе с человеком. Сначала определите человека, и нужная форма станет очевидной.",
    uk: "I am here. і You are here. називають те саме місце, але не ту саму людину. I вказує на мовця й завжди тримає поруч am. You звертається до співрозмовника та обирає are. Тому правильна репліка співрозмовнику — You are here.: here не змінюється, а форма зв’язки змінюється разом із людиною. Спочатку визначте людину, і потрібна форма стане очевидною.",
    es: "I am here. y You are here. nombran el mismo lugar, pero no a la misma persona. I señala a quien habla y mantiene am a su lado. You se dirige al interlocutor y elige are. Por eso, para decirlo a otra persona corresponde You are here.: here no cambia, mientras que la forma de be sigue a la persona. Primero identifica a la persona y la forma necesaria quedará clara.",
    "pt-BR": "I am here. e You are here. indicam o mesmo lugar, mas não a mesma pessoa. I aponta para quem fala e mantém am ao lado. You se dirige ao interlocutor e escolhe are. Por isso, para falar com a outra pessoa, a forma é You are here.: here permanece, enquanto a forma de be acompanha a pessoa. Primeiro identifique a pessoa, e a forma necessária ficará clara.",
    vi: "I am here. và You are here. cùng nói về một nơi nhưng không nói về cùng một người. I chỉ người nói và luôn đi với am. You hướng tới người nghe nên chọn are. Vì vậy câu dành cho người đối diện là You are here.: here vẫn giữ nguyên, còn dạng của be thay đổi theo người được nhắc tới. Hãy xác định người trước, rồi dạng cần dùng sẽ trở nên rõ ràng.",
    id: "I am here. dan You are here. menyebut tempat yang sama, tetapi orangnya berbeda. I menunjuk penutur dan selalu berpasangan dengan am. You ditujukan kepada lawan bicara sehingga memakai are. Karena itu, kalimat untuk orang di depan kita ialah You are here.: here tetap, sedangkan bentuk be mengikuti orangnya. Tentukan orangnya lebih dahulu, lalu bentuk yang diperlukan akan jelas.",
    tr: "I am here. ile You are here. aynı yeri söyler, fakat aynı kişiyi anlatmaz. I konuşanı gösterir ve yanında am bulunur. You karşıdaki kişiye yönelir ve are biçimini seçer. Bu nedenle karşıdakine söylenecek doğru cümle You are here. olur: here değişmez, be biçimi kişiye göre değişir. Önce kişiyi belirleyin; gereken biçim böylece açıkça görülür.",
    pl: "I am here. i You are here. wskazują to samo miejsce, ale nie tę samą osobę. I oznacza mówiącego i zawsze łączy się z am. You zwraca się do rozmówcy i wybiera are. Dlatego właściwe zdanie do drugiej osoby to You are here.: here pozostaje bez zmian, a forma be podąża za osobą. Najpierw ustal osobę, a potrzebna forma stanie się oczywista.",
  }),
  L({
    ru: "I am here. превращается в Am I here?, когда говорящий просит подтвердить своё место. You are here. превращается в Are you here?, когда вопрос направлен собеседнику. Вопрос меняет порядок, но не меняет пару: I остаётся с am, а you — с are. Поэтому точный вопрос «Я здесь?» — Am I here?, а сочетания Are I и Am you смешивают две разные пары.",
    uk: "I am here. перетворюється на Am I here?, коли мовець просить підтвердити своє місце. You are here. перетворюється на Are you here?, коли питання спрямоване співрозмовнику. Питання змінює порядок, але не пару: I лишається з am, а you — з are. Тому точне питання «Я тут?» — Am I here?, а Are I та Am you змішують різні пари.",
    es: "I am here. se convierte en Am I here? cuando quien habla pide confirmar su ubicación. You are here. pasa a Are you here? cuando la pregunta va dirigida al interlocutor. La pregunta cambia el orden, no la pareja: I conserva am y you conserva are. Por eso «¿estoy aquí?» corresponde a Am I here?, mientras que Are I y Am you mezclan dos parejas distintas.",
    "pt-BR": "I am here. vira Am I here? quando quem fala pede confirmação do próprio lugar. You are here. vira Are you here? quando a pergunta se dirige ao interlocutor. A pergunta muda a ordem, não a dupla: I continua com am e you continua com are. Assim, «estou aqui?» corresponde a Am I here?, enquanto Are I e Am you misturam duas duplas.",
    vi: "I am here. đổi thành Am I here? khi người nói muốn xác nhận vị trí của mình. You are here. đổi thành Are you here? khi câu hỏi hướng tới người nghe. Câu hỏi chỉ đổi trật tự chứ không đổi cặp: I vẫn đi với am, còn you vẫn đi với are. Vì vậy “tôi ở đây phải không?” là Am I here?, còn Are I và Am you đã trộn hai cặp khác nhau.",
    id: "I am here. menjadi Am I here? ketika penutur meminta kepastian tentang tempatnya sendiri. You are here. menjadi Are you here? ketika pertanyaan diarahkan kepada lawan bicara. Pertanyaan mengubah urutan, bukan pasangan: I tetap bersama am dan you tetap bersama are. Jadi pertanyaan tentang diri ialah Am I here?, sedangkan Are I dan Am you mencampur dua pasangan.",
    tr: "I am here. konuşan kendi yerini doğrulatınca Am I here? olur. You are here. karşıdaki kişiye soru yöneltilince Are you here? biçimine döner. Soru sırayı değiştirir, çifti değiştirmez: I yine am ile, you yine are ile kalır. Bu yüzden “Burada mıyım?” sorusu Am I here? olur; Are I ve Am you iki çifti karıştırır.",
    pl: "I am here. zmienia się w Am I here?, gdy mówiący chce potwierdzić własne miejsce. You are here. staje się Are you here?, gdy pytanie jest skierowane do rozmówcy. Pytanie zmienia szyk, lecz nie parę: I zachowuje am, a you zachowuje are. Dlatego „czy jestem tutaj?” to Am I here?, natomiast Are I i Am you mieszają dwie różne pary.",
  }),
  L({
    ru: "You’re ready. — обычное утверждение: сокращение уже содержит you are, поэтому you остаётся первым. Нейтральный вопрос раскрывает are и переносит его вперёд: Are you ready? Запись You’re ready? возможна как удивлённый переспрос, но она не заменяет спокойный вопрос без заданного контекста. Форма You ready? ещё короче, однако в точной полной фразе она теряет are.",
    uk: "You’re ready. — звичайне твердження: скорочення вже містить you are, тому you стоїть першим. Нейтральне питання розкриває are й переносить його вперед: Are you ready? You’re ready? може бути здивованим перепитуванням, але не замінює спокійного питання без заданого контексту. You ready? коротше, проте в точній повній фразі втрачає are.",
    es: "You’re ready. es una afirmación normal: la contracción ya contiene you are y por eso you aparece primero. La pregunta neutral abre are y la coloca delante: Are you ready? You’re ready? puede servir como pregunta de eco sorprendida, pero no sustituye la pregunta neutral sin ese contexto. You ready? es más breve, aunque pierde are en la forma completa que se busca aquí.",
    "pt-BR": "You’re ready. é uma afirmação comum: a contração já contém you are e, por isso, you vem primeiro. A pergunta neutra abre are e o leva para a frente: Are you ready? You’re ready? pode funcionar como eco de surpresa, mas não substitui a pergunta neutra sem esse contexto. You ready? é mais curta, porém perde are na forma completa exigida aqui.",
    vi: "You’re ready. là câu kể bình thường: dạng rút gọn đã chứa you are nên you đứng trước. Câu hỏi trung tính phải tách are và đưa lên đầu: Are you ready? You’re ready? có thể là lời hỏi lại đầy ngạc nhiên, nhưng không thay cho câu hỏi trung tính khi không có ngữ cảnh ấy. You ready? ngắn hơn nhưng đã bỏ mất are trong dạng đầy đủ cần dùng.",
    id: "You’re ready. adalah pernyataan biasa: kontraksi itu sudah memuat you are sehingga you berada di depan. Pertanyaan netral membuka are dan memindahkannya ke awal: Are you ready? You’re ready? dapat menjadi pertanyaan gema karena terkejut, tetapi bukan pengganti pertanyaan netral tanpa konteks itu. You ready? lebih pendek, namun menghilangkan are dari bentuk lengkap.",
    tr: "You’re ready. normal bir bildirimdir: kısaltma you are bütününü içerdiği için you başta kalır. Nötr soru are biçimini açıp öne getirir: Are you ready? You’re ready? şaşkın bir yankı sorusu olabilir, fakat bu bağlam yokken nötr sorunun yerini tutmaz. You ready? daha kısadır, ancak burada gereken tam biçimde are sözcüğünü düşürür.",
    pl: "You’re ready. jest zwykłym stwierdzeniem: skrót zawiera już you are, dlatego you stoi pierwsze. Neutralne pytanie rozwija are i przenosi je na początek: Are you ready? You’re ready? może być zaskoczonym pytaniem echo, ale bez takiego kontekstu nie zastępuje pytania neutralnego. You ready? jest krótsze, lecz w wymaganej pełnej formie gubi are.",
  }),
]);

const TARGETS = [
  { correct: ["I am here.", "You are here."], wrong: [] },
  { correct: ["I am here.", "Am I here?", "You are here.", "Are you here?"], wrong: ["Are I", "Am you"] },
  { correct: ["You’re ready.", "Are you ready?"], wrong: ["You’re ready?", "You ready?"] },
] as const;

function semanticRuns(
  text: string,
  correct: readonly string[],
  wrong: readonly string[],
) {
  const terms = [
    ...correct.map((value) => ({ value, semantic: "targetCorrect" as const })),
    ...wrong.map((value) => ({ value, semantic: "targetWrong" as const })),
  ].sort((a, b) => b.value.length - a.value.length);
  const runs: { text: string; semantic: "explanation" | "targetCorrect" | "targetWrong" }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let next: { index: number; value: string; semantic: "targetCorrect" | "targetWrong" } | null = null;
    for (const term of terms) {
      const index = text.indexOf(term.value, cursor);
      if (index >= 0 && (!next || index < next.index || (index === next.index && term.value.length > next.value.length))) {
        next = { index, ...term };
      }
    }
    if (!next) {
      runs.push({ text: text.slice(cursor), semantic: "explanation" });
      break;
    }
    if (next.index > cursor) runs.push({ text: text.slice(cursor, next.index), semantic: "explanation" });
    runs.push({ text: next.value, semantic: next.semantic });
    cursor = next.index + next.value.length;
  }
  return runs;
}

export const EPISODE_01_SESSION_16_EDITORIAL_RUNS_V1: readonly LocalizedIntroRunsSource[] =
  EPISODE_01_SESSION_16_EDITORIAL_INTRO_V1.map((body, index) =>
    Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        semanticRuns(body[locale], TARGETS[index]!.correct, TARGETS[index]!.wrong),
      ]),
    ) as LocalizedIntroRunsSource,
  );
