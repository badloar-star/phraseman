import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../generator_course_contract";
import type { LearningV2NewWordCardEditorialV1 } from "./learning_v2_new_word_card_editorial_v1";

// зачем этот файл отдельный от learning_v2_new_word_card_editorial_v1.ts
// (владелец через HANDOVER_ES.md, 2026-08-24): испанский текст пишется
// независимо, не переводится с английского и не копируется списком (СТАРТ ES,
// разделы 6-7). Английский реестр — образец ФОРМЫ (интерфейс данных), не
// источник испанских слов/юмора. Оба реестра сливаются в один по ключу
// targetLanguage+lexicalItemId в session_package_from_shard_v1.ts, поэтому
// добавление этого файла не трогает ни один английский экспорт.
//
// зачем 'es' в playfulMeaningByLocale содержит английский текст, а не пусто
// и не испанский (владелец, 2026-08-23, тот же принцип что и в
// meaningFor()/es_episode_01_session_01_task_feedback_v1.ts): 'es' — целевой
// язык этого курса, не локаль объяснения. LEARNING_V2_INTERFACE_LOCALES
// требует ключ 'es' структурно (общий контракт на 9 локалей), но для
// испанского курса это поле реально не читается интерфейсом — оно дублирует
// 'en', как и everywhere else in this contour.
const copy = (
  value: Record<LearningV2InterfaceLocale, string>,
): Readonly<Record<LearningV2InterfaceLocale, string>> => Object.freeze(value);

export const SPANISH_EDITORIAL: readonly LearningV2NewWordCardEditorialV1[] =
  Object.freeze([
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s01-word-es",
      targetText: "es",
      transcription: "/es/",
      playfulMeaningByLocale: copy({
        ru: "Судья, который выносит вердикт про всё на свете, кроме себя самого.",
        uk: "Суддя, який виносить вердикт про все на світі, крім себе самого.",
        es: "The judge who hands down a verdict about everything else, but never about itself.",
        en: "The judge who hands down a verdict about everything else, but never about itself.",
        "pt-BR": "O juiz que dá o veredito sobre tudo, menos sobre si mesmo.",
        vi: "Vị thẩm phán tuyên án mọi thứ trên đời, trừ chính bản thân mình.",
        id: "Hakim yang menjatuhkan vonis untuk segalanya, kecuali untuk dirinya sendiri.",
        tr: "Her şey hakkında hüküm veren yargıç — ama kendisi hakkında asla.",
        pl: "Sędzia, który wydaje wyrok o wszystkim, tylko nie o sobie.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s01-word-soy",
      targetText: "soy",
      transcription: "/soi/",
      playfulMeaningByLocale: copy({
        ru: "Единственная форма, которая имеет право говорить от первого лица.",
        uk: "Єдина форма, яка має право говорити від першої особи.",
        es: "The only form with a permit to speak in the first person.",
        en: "The only form with a permit to speak in the first person.",
        "pt-BR": "A única forma com licença para falar em primeira pessoa.",
        vi: "Dạng duy nhất có giấy phép để tự xưng “tôi”.",
        id: "Satu-satunya bentuk yang punya izin bicara sebagai orang pertama.",
        tr: "Birinci ağızdan konuşma iznine sahip tek biçim.",
        pl: "Jedyna forma, która ma pozwolenie mówić w pierwszej osobie.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s01-word-facil",
      targetText: "fácil",
      transcription: "/ˈfa.sil/",
      playfulMeaningByLocale: copy({
        ru: "Признак, который никогда не устаёт и не требует усилий даже от самого себя.",
        uk: "Ознака, яка ніколи не втомлюється й не потребує зусиль навіть від самої себе.",
        es: "The quality that never gets tired and requires zero effort, even from itself.",
        en: "The quality that never gets tired and requires zero effort, even from itself.",
        "pt-BR": "A qualidade que nunca se cansa e não exige esforço nem de si mesma.",
        vi: "Đặc điểm không bao giờ mệt mỏi và chẳng đòi hỏi nỗ lực, kể cả từ chính nó.",
        id: "Sifat yang tidak pernah lelah dan tidak butuh usaha, bahkan dari dirinya sendiri.",
        tr: "Hiç yorulmayan ve kendisinden bile çaba istemeyen bir nitelik.",
        pl: "Cecha, która nigdy się nie męczy i nawet od siebie samej nie wymaga wysiłku.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s01-word-verdad",
      targetText: "verdad",
      transcription: "/beɾˈðad/",
      playfulMeaningByLocale: copy({
        ru: "Слово, которое ставит печать «одобрено» на чужие слова.",
        uk: "Слово, яке ставить печатку «схвалено» на чужі слова.",
        es: "The word that stamps someone else's statement with a seal of approval.",
        en: "The word that stamps someone else's statement with a seal of approval.",
        "pt-BR": "A palavra que carimba a fala de outra pessoa com um selo de aprovado.",
        vi: "Từ đóng dấu “đã duyệt” lên lời nói của người khác.",
        id: "Kata yang membubuhkan cap “disetujui” pada perkataan orang lain.",
        tr: "Başkasının sözüne “onaylandı” damgasını vuran kelime.",
        pl: "Słowo, które przybija pieczątkę „zatwierdzone” na cudzych słowach.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s02-word-no",
      targetText: "no",
      transcription: "/no/",
      playfulMeaningByLocale: copy({
        ru: "Двухбуквенный вышибала: встаёт на входе во фразу и никого не пускает без досмотра.",
        uk: "Двобуквений вишибайло: стає на вході у фразу й нікого не пускає без огляду.",
        es: "A two-letter bouncer: stands at the door of the phrase and lets no meaning through unchecked.",
        en: "A two-letter bouncer: stands at the door of the phrase and lets no meaning through unchecked.",
        "pt-BR": "Um segurança de duas letras: fica na porta da frase e não deixa nada passar sem checagem.",
        vi: "Người gác cổng hai chữ cái: đứng trước cửa câu nói và không cho gì lọt qua mà không kiểm tra.",
        id: "Satpam dua huruf: berdiri di pintu kalimat dan tidak membiarkan apa pun lolos tanpa diperiksa.",
        tr: "İki harflik fedai: cümlenin kapısında durur ve hiçbir anlamı kontrolsüz bırakmaz.",
        pl: "Dwuliterowy bramkarz: stoi u wejścia do zdania i nikogo nie wpuszcza bez kontroli.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s03-word-bonito",
      targetText: "bonito",
      transcription: "/boˈni.to/",
      playfulMeaningByLocale: copy({
        ru: "Слово-хамелеон: стоит только сменить последнюю букву, и оно тут же переодевается под другой род.",
        uk: "Слово-хамелеон: варто змінити лише останню літеру, і воно вмить перевдягається під інший рід.",
        es: "A chameleon word: change just the last letter and it instantly switches its own gender.",
        en: "A chameleon word: change just the last letter and it instantly switches its own gender.",
        "pt-BR": "Uma palavra camaleão: troque só a última letra e ela muda de gênero na hora.",
        vi: "Một từ tắc kè hoa: chỉ cần đổi chữ cái cuối cùng, nó lập tức đổi giống của chính mình.",
        id: "Kata bunglon: ubah saja huruf terakhirnya, dan ia langsung berganti gendernya sendiri.",
        tr: "Bukalemun bir kelime: sadece son harfini değiştir, anında kendi cinsiyetini değiştirir.",
        pl: "Słowo kameleon: zmień tylko ostatnią literę, a natychmiast zmienia swój własny rodzaj.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s04-word-verdadero",
      targetText: "verdadero",
      transcription: "/beɾðaˈðeɾo/",
      playfulMeaningByLocale: copy({
        ru: "Дальний родственник слова «правда», который решил стать прилагательным и обзавестись собственным гардеробом на -o и -a.",
        uk: "Далекий родич слова «правда», який вирішив стати прикметником і обзавестися власним гардеробом на -o та -a.",
        es: "A distant cousin of the word for truth that decided to become an adjective and get its own wardrobe of -o and -a.",
        en: "A distant cousin of the word for truth that decided to become an adjective and get its own wardrobe of -o and -a.",
        "pt-BR": "Um parente distante da palavra para verdade que decidiu virar adjetivo e ganhar seu próprio guarda-roupa de -o e -a.",
        vi: "Người họ hàng xa của từ chỉ sự thật, quyết định trở thành tính từ và có tủ quần áo riêng gồm -o và -a.",
        id: "Kerabat jauh dari kata untuk kebenaran yang memutuskan menjadi kata sifat dan punya lemari pakaian sendiri berisi -o dan -a.",
        tr: "Doğruluk kelimesinin uzak akrabası, sıfat olmaya karar verip kendi -o ve -a gardırobunu edinmiş.",
        pl: "Daleki krewny słowa oznaczającego prawdę, który postanowił zostać przymiotnikiem i dorobić się własnej garderoby z -o i -a.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s05-word-rapido",
      targetText: "rápido",
      transcription: "/ˈrapiðo/",
      playfulMeaningByLocale: copy({
        ru: "Признак, который всегда куда-то торопится — даже произнести его нужно быстрее, чем соседние слова.",
        uk: "Ознака, яка завжди кудись поспішає — навіть вимовити її треба швидше, ніж сусідні слова.",
        es: "A quality that is always in a hurry — even saying it out loud takes less time than its neighbors.",
        en: "A quality that is always in a hurry — even saying it out loud takes less time than its neighbors.",
        "pt-BR": "Uma qualidade sempre com pressa — até dizê-la em voz alta leva menos tempo que as vizinhas.",
        vi: "Một đặc điểm luôn vội vã — ngay cả nói ra cũng nhanh hơn những từ hàng xóm của nó.",
        id: "Sifat yang selalu terburu-buru — bahkan mengucapkannya butuh waktu lebih sedikit daripada kata-kata tetangganya.",
        tr: "Her zaman acelesi olan bir nitelik — söylemesi bile komşularından daha az sürer.",
        pl: "Cecha, która zawsze się gdzieś spieszy — nawet wypowiedzenie jej trwa krócej niż sąsiednich słów.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s06-word-unico",
      targetText: "único",
      transcription: "/ˈuniko/",
      playfulMeaningByLocale: copy({
        ru: "Признак, который носит корону на первой букве, чтобы никто не перепутал, где именно он важничает.",
        uk: "Ознака, яка носить корону на першій літері, щоб ніхто не переплутав, де саме вона пишається.",
        es: "A quality that wears a crown on its first letter so no one mistakes where it likes to show off.",
        en: "A quality that wears a crown on its first letter so no one mistakes where it likes to show off.",
        "pt-BR": "Uma qualidade que usa uma coroa na primeira letra para ninguém errar onde ela gosta de se exibir.",
        vi: "Một đặc điểm đội vương miện trên chữ cái đầu tiên để không ai nhầm nó đang khoe khoang ở đâu.",
        id: "Sifat yang memakai mahkota di huruf pertamanya agar tak ada yang salah menebak di mana ia suka pamer.",
        tr: "İlk harfinde bir taç taşıyan, böylece kimsenin nerede gösteriş yaptığını yanlış anlamayacağı bir nitelik.",
        pl: "Cecha, która nosi koronę na pierwszej literze, żeby nikt nie pomylił, gdzie dokładnie lubi się popisywać.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s09-word-eres",
      targetText: "eres",
      transcription: "/ˈeɾes/",
      playfulMeaningByLocale: copy({
        ru: "Та же связка, что и soy, только развернулась лицом к собеседнику вместо зеркала.",
        uk: "Та сама зв’язка, що й soy, тільки розвернулася обличчям до співрозмовника замість дзеркала.",
        es: "The same linking word as soy, just turned to face the listener instead of a mirror.",
        en: "The same linking word as soy, just turned to face the listener instead of a mirror.",
        "pt-BR": "A mesma ligação que soy, só que virada para o interlocutor em vez de um espelho.",
        vi: "Cùng một từ nối như soy, chỉ là quay mặt về phía người nghe thay vì tấm gương.",
        id: "Kata penghubung yang sama seperti soy, hanya saja menghadap ke pendengar, bukan ke cermin.",
        tr: "Soy ile aynı bağlaç, sadece aynaya değil dinleyiciye dönük.",
        pl: "Ten sam łącznik co soy, tylko odwrócony twarzą do słuchacza zamiast do lustra.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s12-word-segura",
      targetText: "segura",
      transcription: "/seˈɣuɾa/",
      playfulMeaningByLocale: copy({
        ru: "Признак, который никогда не спрашивает разрешения быть собой.",
        uk: "Ознака, яка ніколи не питає дозволу бути собою.",
        es: "The quality that never asks permission to be itself.",
        en: "The quality that never asks permission to be itself.",
        "pt-BR": "A qualidade que nunca pede permissão para ser ela mesma.",
        vi: "Đặc điểm không bao giờ xin phép để là chính nó.",
        id: "Sifat yang tidak pernah meminta izin untuk menjadi dirinya sendiri.",
        tr: "Kendisi olmak için asla izin istemeyen bir nitelik.",
        pl: "Cecha, która nigdy nie pyta o pozwolenie, by być sobą.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s18-word-barato",
      targetText: "barato",
      transcription: "/baˈɾato/",
      playfulMeaningByLocale: copy({
        ru: "Признак, который никогда не просит лишнего — ни за себя, ни за то, что описывает.",
        uk: "Ознака, яка ніколи не просить зайвого — ні за себе, ні за те, що описує.",
        es: "The quality that never asks for extra — not for itself, not for what it describes.",
        en: "The quality that never asks for extra — not for itself, not for what it describes.",
        "pt-BR": "A qualidade que nunca pede nada a mais — nem por si, nem pelo que descreve.",
        vi: "Đặc điểm không bao giờ đòi hỏi thêm — cho chính nó lẫn cho thứ nó mô tả.",
        id: "Sifat yang tidak pernah meminta lebih — baik untuk dirinya sendiri maupun untuk apa yang digambarkannya.",
        tr: "Ne kendisi ne de tanımladığı şey için asla fazlasını istemeyen bir nitelik.",
        pl: "Cecha, która nigdy nie prosi o więcej — ani dla siebie, ani dla tego, co opisuje.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s21-word-libro",
      targetText: "libro",
      transcription: "/ˈliβɾo/",
      playfulMeaningByLocale: copy({
        ru: "Единственное слово в этом курсе, которое никогда не меняет свой пол — сколько бы признаков ни примеряло.",
        uk: "Єдине слово в цьому курсі, яке ніколи не змінює свою стать — скільки б ознак не приміряло.",
        es: "The only word in this course that never changes its gender, no matter how many qualities try it on.",
        en: "The only word in this course that never changes its gender, no matter how many qualities try it on.",
        "pt-BR": "A única palavra deste curso que nunca muda de gênero, não importa quantas qualidades ela experimente.",
        vi: "Từ duy nhất trong khóa học này không bao giờ đổi giống, dù có bao nhiêu đặc điểm thử khoác lên nó.",
        id: "Satu-satunya kata dalam kursus ini yang tidak pernah berubah gendernya, tak peduli berapa banyak sifat yang mencobanya.",
        tr: "Bu kursta kaç nitelik denerse denesin, cinsiyetini asla değiştirmeyen tek kelime.",
        pl: "Jedyne słowo w tym kursie, które nigdy nie zmienia swojego rodzaju, bez względu na to, ile cech go przymierza.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s26-word-rapidos",
      targetText: "rápidos",
      transcription: "/ˈrapiðos/",
      playfulMeaningByLocale: copy({
        ru: "Признак, который наконец-то признался, что в компании их несколько, а не один.",
        uk: "Ознака, яка нарешті зізналася, що в компанії їх кілька, а не один.",
        es: "The quality that finally admitted there are several of them in the group, not just one.",
        en: "The quality that finally admitted there are several of them in the group, not just one.",
        "pt-BR": "A qualidade que finalmente admitiu que são vários no grupo, não só um.",
        vi: "Đặc điểm cuối cùng cũng thừa nhận rằng trong nhóm có nhiều người, không chỉ một.",
        id: "Sifat yang akhirnya mengaku ada beberapa dari mereka dalam kelompok, bukan cuma satu.",
        tr: "Sonunda grupta tek değil, birden fazla kişi olduğunu itiraf eden nitelik.",
        pl: "Cecha, która w końcu przyznała, że w grupie jest ich kilku, a nie jeden.",
      }),
    },
    {
      targetLanguage: "es",
      lexicalItemId: "es-e01-s33-word-bueno",
      targetText: "bueno",
      transcription: "/ˈbweno/",
      playfulMeaningByLocale: copy({
        ru: "Оценка, которая годится почти для чего угодно — человека, идеи, дня, — и всегда меняет род в ответ.",
        uk: "Оцінка, яка годиться майже для будь-чого — людини, ідеї, дня, — і завжди змінює рід у відповідь.",
        es: "The verdict that fits almost anything — a person, an idea, a day — and always changes its gender in reply.",
        en: "The verdict that fits almost anything — a person, an idea, a day — and always changes its gender in reply.",
        "pt-BR": "O veredito que serve para quase tudo — uma pessoa, uma ideia, um dia — e sempre muda de gênero em resposta.",
        vi: "Lời nhận xét vừa vặn với gần như mọi thứ — một người, một ý tưởng, một ngày — và luôn đổi giống để đáp lại.",
        id: "Penilaian yang cocok untuk hampir apa saja — orang, ide, hari — dan selalu berubah gendernya sebagai balasan.",
        tr: "Neredeyse her şeye uyan bir hüküm — bir kişi, bir fikir, bir gün — ve her zaman karşılık olarak cinsiyetini değiştiren.",
        pl: "Werdykt, który pasuje niemal do wszystkiego — osoby, pomysłu, dnia — i zawsze w odpowiedzi zmienia swój rodzaj.",
      }),
    },
  ]);

const SPANISH_EDITORIAL_BY_KEY = new Map(
  SPANISH_EDITORIAL.map((entry) => [
    `${entry.targetLanguage} ${entry.lexicalItemId}`,
    entry,
  ]),
);

export function esLearningV2NewWordCardEditorialV1(
  input: Readonly<{
    targetLanguage: string;
    lexicalItemId: string;
    targetText: string;
  }>,
): LearningV2NewWordCardEditorialV1 | undefined {
  const entry = SPANISH_EDITORIAL_BY_KEY.get(
    `${input.targetLanguage} ${input.lexicalItemId}`,
  );
  if (!entry) return undefined;
  if (entry.targetText !== input.targetText) {
    throw new Error(
      `learning_v2_new_word_card_editorial_target_mismatch:${input.lexicalItemId}`,
    );
  }
  if (
    Object.keys(entry.playfulMeaningByLocale).join(" ") !==
    LEARNING_V2_INTERFACE_LOCALES.join(" ")
  ) {
    throw new Error(
      `learning_v2_new_word_card_editorial_locales_invalid:${input.lexicalItemId}`,
    );
  }
  return entry;
}
