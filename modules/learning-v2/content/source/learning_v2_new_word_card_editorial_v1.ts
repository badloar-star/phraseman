import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../generator_course_contract";

export type LearningV2NewWordCardEditorialV1 = Readonly<{
  targetLanguage: string;
  lexicalItemId: string;
  targetText: string;
  transcription: string;
  playfulMeaningByLocale: Readonly<Record<LearningV2InterfaceLocale, string>>;
}>;

const copy = (
  value: Record<LearningV2InterfaceLocale, string>,
): Readonly<Record<LearningV2InterfaceLocale, string>> => Object.freeze(value);

/**
 * Редакторский реестр карточек первого знакомства со словом.
 *
 * Почему это не генератор: короткая строка на карточке обязана быть живой,
 * смешной и естественной в каждой локали. Подстановка слова в общий шаблон
 * здесь запрещена owner-правилом; каждая запись проходит ручную редактуру.
 */
const ENGLISH_EDITORIAL: readonly LearningV2NewWordCardEditorialV1[] =
  Object.freeze([
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s01-word-i",
      targetText: "I",
      transcription: "/aɪ/",
      playfulMeaningByLocale: copy({
        ru: "Главная роль уже занята: это тот, кто сейчас говорит.",
        uk: "Головну роль уже зайнято: це той, хто зараз говорить.",
        es: "El protagonista ya está elegido: es quien tiene la palabra.",
        en: "The starring role is taken: it belongs to whoever is speaking.",
        "pt-BR": "O protagonista já entrou em cena: é quem está falando.",
        vi: "Vai chính đã có chủ: đó là người đang cất lời.",
        id: "Peran utama sudah terisi: dialah orang yang sedang berbicara.",
        tr: "Başrol çoktan belli: sözü söyleyen kişi.",
        pl: "Główna rola jest już obsadzona: gra ją osoba, która mówi.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s01-word-am",
      targetText: "am",
      transcription: "/æm/",
      playfulMeaningByLocale: copy({
        ru: "Верный напарник I: с другими местоимениями за один стол не садится.",
        uk: "Вірний напарник I: з іншими займенниками за один стіл не сідає.",
        es: "Es la pareja fiel de I: con los demás pronombres ni comparte mesa.",
        en: "I's loyal sidekick: the other pronouns are not invited to the table.",
        "pt-BR":
          "É o parceiro fiel de I: com os outros pronomes nem divide a mesa.",
        vi: "Đây là cộng sự ruột của I: các đại từ khác khỏi mời cũng được.",
        id: "Inilah pasangan setia I: pronomina lain tak kebagian kursi.",
        tr: "I sözcüğünün sadık ortağıdır; öteki zamirlerle aynı masaya oturmaz.",
        pl: "To wierny partner I; z innymi zaimkami nawet nie siada do stołu.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s01-word-here",
      targetText: "here",
      transcription: "/hɪə(r)/",
      playfulMeaningByLocale: copy({
        ru: "Навигатор отдыхает: нужная точка прямо возле говорящего.",
        uk: "Навігатор відпочиває: потрібна точка просто біля мовця.",
        es: "El navegador puede descansar: el lugar está junto a quien habla.",
        en: "The GPS can relax: the place is right by the speaker.",
        "pt-BR": "O GPS pode folgar: o lugar fica bem onde está quem fala.",
        vi: "GPS được nghỉ: địa điểm nằm ngay chỗ người nói đang đứng.",
        id: "GPS boleh istirahat: tempatnya persis di sekitar si pembicara.",
        tr: "Navigasyon izinli: aranan yer konuşanın hemen yanı.",
        pl: "Nawigacja ma wolne: chodzi o miejsce tuż przy mówiącym.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s01-word-ready",
      targetText: "ready",
      transcription: "/ˈredi/",
      playfulMeaningByLocale: copy({
        ru: "Стартовая кнопка уже нервничает: человек подготовился и ждёт сигнала.",
        uk: "Кнопка старту вже нервує: людина підготувалася й чекає сигналу.",
        es: "El botón de salida ya se impacienta: la persona está preparada.",
        en: "The start button is getting impatient: the person is prepared.",
        "pt-BR":
          "O botão de partida já ficou ansioso: a pessoa está preparada.",
        vi: "Nút xuất phát đang sốt ruột: người này đã chuẩn bị xong.",
        id: "Tombol mulai sudah tak sabar: orangnya sudah bersiap.",
        tr: "Başlat düğmesi sabırsızlandı: kişi hazırlanmış durumda.",
        pl: "Przycisk start już się niecierpliwi: ta osoba jest przygotowana.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s02-word-not",
      targetText: "not",
      transcription: "/nɑːt/",
      playfulMeaningByLocale: copy({
        ru: "Маленький стоп-кран: появляется — и состояние тут же отменяется.",
        uk: "Маленький стоп-кран: з’являється — і стан одразу скасовується.",
        es: "Un freno diminuto: aparece y el estado queda cancelado.",
        en: "A tiny emergency brake: add it and the state is cancelled.",
        "pt-BR": "Um freio de mão minúsculo: apareceu, o estado foi cancelado.",
        vi: "Chiếc phanh tí hon: vừa xuất hiện là trạng thái bị hủy ngay.",
        id: "Rem tangan mungil: begitu muncul, keadaannya langsung dibatalkan.",
        tr: "Minik bir el freni: gelince durumu anında iptal eder.",
        pl: "Mały hamulec ręczny: pojawia się i natychmiast odwołuje stan.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s03-word-happy",
      targetText: "happy",
      transcription: "/ˈhæpi/",
      playfulMeaningByLocale: copy({
        ru: "Внутри будто включили гирлянду, хотя праздника в календаре нет.",
        uk: "Усередині ніби ввімкнули гірлянду, хоча свята в календарі немає.",
        es: "Por dentro se encendieron las luces, aunque el calendario no marque fiesta.",
        en: "The lights are on inside, even though the calendar says no party.",
        "pt-BR":
          "As luzinhas acenderam por dentro, mesmo sem festa no calendário.",
        vi: "Đèn trong lòng bỗng sáng, dù lịch chẳng ghi hôm nay có tiệc.",
        id: "Lampu di dalam hati menyala, padahal kalender tak mencatat pesta.",
        tr: "Takvimde kutlama yok ama içeride bütün ışıklar yanmış.",
        pl: "W środku zapaliły się lampki, choć kalendarz nie przewiduje święta.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s03-word-sad",
      targetText: "sad",
      transcription: "/sæd/",
      playfulMeaningByLocale: copy({
        ru: "У настроения сел аккумулятор, и даже печенье не спешит спасать день.",
        uk: "У настрою сів акумулятор, і навіть печиво не поспішає рятувати день.",
        es: "Al ánimo se le agotó la batería y ni una galleta salva el día.",
        en: "The mood battery is flat, and even a biscuit cannot rescue the day.",
        "pt-BR":
          "A bateria do humor acabou, e nem um biscoito consegue salvar o dia.",
        vi: "Pin tâm trạng đã cạn, đến bánh quy cũng chưa cứu nổi ngày hôm nay.",
        id: "Baterai suasana hati habis; biskuit pun belum mampu menyelamatkan hari.",
        tr: "Moralin pili bitmiş; bir kurabiye bile günü kurtaramıyor.",
        pl: "Bateria nastroju padła i nawet ciastko nie ratuje dnia.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s03-word-tired",
      targetText: "tired",
      transcription: "/ˈtaɪərd/",
      playfulMeaningByLocale: copy({
        ru: "Внутренняя батарейка мигает одним процентом и просит найти диван.",
        uk: "Внутрішня батарейка блимає одним відсотком і просить знайти диван.",
        es: "La batería interna marca uno por ciento y exige encontrar un sofá.",
        en: "The internal battery is flashing one percent and demanding a sofa.",
        "pt-BR":
          "A bateria interna pisca um por cento e exige um sofá imediatamente.",
        vi: "Pin bên trong còn một phần trăm và đang khẩn thiết gọi tên chiếc ghế sofa.",
        id: "Baterai dalam tubuh tinggal satu persen dan sedang mencari sofa.",
        tr: "İç pil yüzde biri gösteriyor ve acilen bir kanepe istiyor.",
        pl: "Wewnętrzna bateria miga jednym procentem i domaga się kanapy.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s03-word-fine",
      targetText: "fine",
      transcription: "/faɪn/",
      playfulMeaningByLocale: copy({
        ru: "Не фейерверк и не катастрофа: всё просто держится молодцом.",
        uk: "Не феєрверк і не катастрофа: усе просто тримається молодцем.",
        es: "Ni fuegos artificiales ni desastre: todo sigue razonablemente bien.",
        en: "No fireworks, no disaster: everything is doing reasonably well.",
        "pt-BR":
          "Nem fogos, nem desastre: está tudo seguindo razoavelmente bem.",
        vi: "Không pháo hoa, chẳng thảm họa: mọi thứ vẫn ổn một cách đáng khen.",
        id: "Bukan pesta kembang api, bukan bencana: semuanya baik-baik saja.",
        tr: "Ne havai fişek var ne felaket; her şey gayet idare ediyor.",
        pl: "Ani fajerwerki, ani katastrofa: wszystko trzyma się całkiem dobrze.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s04-word-busy",
      targetText: "busy",
      transcription: "/ˈbɪzi/",
      playfulMeaningByLocale: copy({
        ru: "Календарь запер дверь: свободной минуте придётся записаться заранее.",
        uk: "Календар замкнув двері: вільній хвилині доведеться записатися заздалегідь.",
        es: "El calendario cerró la puerta: hasta un minuto libre necesita cita.",
        en: "The calendar locked the door: even a free minute needs an appointment.",
        "pt-BR":
          "A agenda trancou a porta: até um minuto livre precisa marcar horário.",
        vi: "Lịch đã khóa cửa: một phút rảnh cũng phải đặt hẹn trước.",
        id: "Kalender mengunci pintu: semenit waktu luang pun harus membuat janji.",
        tr: "Takvim kapıyı kilitlemiş; boş bir dakika bile randevu almak zorunda.",
        pl: "Kalendarz zamknął drzwi: nawet wolna minuta musi się wcześniej umówić.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s05-word-hi",
      targetText: "hi",
      transcription: "/haɪ/",
      playfulMeaningByLocale: copy({
        ru: "Короткий стук в дверь разговора: никто ещё не обязан варить чай.",
        uk: "Короткий стукіт у двері розмови: ніхто ще не мусить заварювати чай.",
        es: "Un golpecito en la puerta de la conversación, sin preparar todavía el café.",
        en: "A quick knock on conversation's door, before anyone has to make tea.",
        "pt-BR":
          "Uma batidinha na porta da conversa, antes de alguém passar o café.",
        vi: "Một tiếng gõ nhẹ vào cửa cuộc trò chuyện, chưa cần pha trà vội.",
        id: "Ketukan singkat di pintu percakapan, sebelum siapa pun membuat teh.",
        tr: "Sohbetin kapısına küçük bir tık; daha çay koymaya gerek yok.",
        pl: "Krótkie pukanie do drzwi rozmowy, zanim ktokolwiek nastawi herbatę.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s05-word-thanks",
      targetText: "thanks",
      transcription: "/θæŋks/",
      playfulMeaningByLocale: copy({
        ru: "Словесные аплодисменты тому, кто только что помог.",
        uk: "Словесні оплески тому, хто щойно допоміг.",
        es: "Un aplauso de bolsillo para quien acaba de echar una mano.",
        en: "Pocket-sized applause for the person who just helped.",
        "pt-BR": "Um aplauso de bolso para quem acabou de ajudar.",
        vi: "Một tràng pháo tay bỏ túi dành cho người vừa giúp bạn.",
        id: "Tepuk tangan ukuran saku untuk orang yang baru saja membantu.",
        tr: "Az önce yardım eden kişiye cep boyu bir alkış.",
        pl: "Kieszonkowe brawa dla osoby, która właśnie pomogła.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s05-word-please",
      targetText: "please",
      transcription: "/pliːz/",
      playfulMeaningByLocale: copy({
        ru: "Вежливый ключ: с ним просьба перестаёт вышибать дверь.",
        uk: "Ввічливий ключ: із ним прохання перестає вибивати двері.",
        es: "La llave cortés que evita que una petición derribe la puerta.",
        en: "The polite key that stops a request from kicking the door down.",
        "pt-BR": "A chave educada que impede o pedido de arrombar a porta.",
        vi: "Chiếc chìa khóa lịch sự giúp lời nhờ vả khỏi phải đạp cửa.",
        id: "Kunci sopan yang mencegah permintaan mendobrak pintu.",
        tr: "Bir ricayı kapıyı kırmadan içeri alan nazik anahtar.",
        pl: "Grzeczny klucz, dzięki któremu prośba nie wyważa drzwi.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s05-word-bye",
      targetText: "bye",
      transcription: "/baɪ/",
      playfulMeaningByLocale: copy({
        ru: "Разговор надел пальто: пора расходиться, но без драматичной музыки.",
        uk: "Розмова вдягла пальто: час розходитися, але без драматичної музики.",
        es: "La conversación se puso el abrigo: toca irse sin música dramática.",
        en: "The conversation has put on its coat: time to leave without dramatic music.",
        "pt-BR":
          "A conversa vestiu o casaco: é hora de ir, sem trilha dramática.",
        vi: "Cuộc trò chuyện đã mặc áo khoác: đến lúc đi, không cần nhạc bi kịch.",
        id: "Percakapan sudah memakai mantel: waktunya pergi tanpa musik dramatis.",
        tr: "Sohbet paltosunu giydi; dramatik müzik olmadan ayrılma vakti.",
        pl: "Rozmowa założyła płaszcz: pora się rozejść bez dramatycznej muzyki.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s06-article-a",
      targetText: "a",
      transcription: "/ə/",
      playfulMeaningByLocale: copy({
        ru: "Пропуск для одного незнакомца: имя ещё не знаем, предмет уже впускаем.",
        uk: "Перепустка для одного незнайомця: імені ще не знаємо, а предмет уже впускаємо.",
        es: "El pase para un desconocido: aún no sabemos su nombre, pero ya puede entrar.",
        en: "A visitor pass for one stranger: no name yet, but the thing may enter.",
        "pt-BR":
          "O crachá de um desconhecido: ainda sem nome, mas já pode entrar.",
        vi: "Thẻ khách cho một người lạ: chưa biết tên nhưng đã được bước vào.",
        id: "Kartu tamu untuk satu pendatang: belum tahu namanya, tetapi sudah boleh masuk.",
        tr: "Bir yabancı için ziyaretçi kartı: adı bilinmiyor ama içeri girebilir.",
        pl: "Przepustka dla jednego nieznajomego: imienia brak, ale rzecz może wejść.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s06-article-an",
      targetText: "an",
      transcription: "/ən/",
      playfulMeaningByLocale: copy({
        ru: "Тот же пропуск, только перед гласным звуком добавляет мягкий мостик n.",
        uk: "Та сама перепустка, лише перед голосним звуком додає м’який місток n.",
        es: "El mismo pase, con un puente n para no tropezar ante una vocal.",
        en: "The same visitor pass, with an n bridge to avoid tripping over a vowel.",
        "pt-BR":
          "O mesmo crachá, com uma ponte n para não tropeçar numa vogal.",
        vi: "Vẫn chiếc thẻ ấy, thêm cây cầu n để khỏi vấp trước âm nguyên âm.",
        id: "Kartu yang sama, ditambah jembatan n agar tidak tersandung bunyi vokal.",
        tr: "Aynı ziyaretçi kartı; ünlü sese takılmamak için n köprüsü eklenmiş.",
        pl: "Ta sama przepustka, tylko z mostkiem n, by nie potknąć się o samogłoskę.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s06-word-teacher",
      targetText: "teacher",
      transcription: "/ˈtiːtʃər/",
      playfulMeaningByLocale: copy({
        ru: "Человек, который знает ответ и всё равно спрашивает весь класс.",
        uk: "Людина, яка знає відповідь і все одно запитує весь клас.",
        es: "La persona que sabe la respuesta y aun así pregunta a toda la clase.",
        en: "The person who knows the answer and still asks the whole class.",
        "pt-BR":
          "A pessoa que sabe a resposta e mesmo assim pergunta à turma inteira.",
        vi: "Người biết sẵn đáp án nhưng vẫn hỏi cả lớp.",
        id: "Orang yang sudah tahu jawabannya, tetapi tetap bertanya kepada seluruh kelas.",
        tr: "Cevabı bilen ama yine de bütün sınıfa soran kişi.",
        pl: "Osoba, która zna odpowiedź, a mimo to pyta całą klasę.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s06-word-artist",
      targetText: "artist",
      transcription: "/ˈɑːrtɪst/",
      playfulMeaningByLocale: copy({
        ru: "Человек, способный превратить пустой лист в причину опоздать к ужину.",
        uk: "Людина, здатна перетворити чистий аркуш на причину запізнитися до вечері.",
        es: "Quien convierte una hoja vacía en una excelente razón para llegar tarde a cenar.",
        en: "Someone who turns a blank page into an excellent reason to miss dinner.",
        "pt-BR":
          "Quem transforma uma folha vazia num ótimo motivo para atrasar o jantar.",
        vi: "Người biến tờ giấy trắng thành lý do hoàn hảo để trễ bữa tối.",
        id: "Orang yang mengubah kertas kosong menjadi alasan sempurna untuk terlambat makan malam.",
        tr: "Boş bir kâğıdı akşam yemeğine geç kalma sebebine dönüştüren kişi.",
        pl: "Osoba, która zmienia pustą kartkę w świetny powód, by spóźnić się na kolację.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s09-word-you",
      targetText: "you",
      transcription: "/juː/",
      playfulMeaningByLocale: copy({
        ru: "Языковой указатель повернулся к собеседнику: теперь речь именно о тебе.",
        uk: "Мовний вказівник повернувся до співрозмовника: тепер ідеться саме про тебе.",
        es: "El dedo de la conversación apunta al interlocutor: ahora se habla de ti.",
        en: "Conversation's finger points across the table: now it means the listener.",
        "pt-BR":
          "O dedo da conversa aponta para o outro lado: agora fala de você.",
        vi: "Ngón tay của cuộc trò chuyện hướng sang người đối diện: giờ là bạn.",
        id: "Jari percakapan menunjuk lawan bicara: sekarang yang dimaksud adalah kamu.",
        tr: "Sohbetin parmağı karşıya döndü: artık söz dinleyenden bahsediyor.",
        pl: "Palec rozmowy wskazuje drugą stronę stołu: teraz chodzi o rozmówcę.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s09-word-are",
      targetText: "are",
      transcription: "/ɑːr/",
      playfulMeaningByLocale: copy({
        ru: "Напарник you: без него состояние мнётся в коридоре и не входит во фразу.",
        uk: "Напарник you: без нього стан тупцює в коридорі й не заходить у фразу.",
        es: "El compañero de you: sin él, el estado se queda esperando en el pasillo.",
        en: "You's partner: without it, the state waits awkwardly in the hallway.",
        "pt-BR":
          "O parceiro de you: sem ele, o estado fica esperando no corredor.",
        vi: "Bạn đồng hành của you: thiếu nó, trạng thái cứ đứng ngượng ngoài hành lang.",
        id: "Pasangan you: tanpanya, keadaan hanya menunggu canggung di lorong.",
        tr: "You sözcüğünün ortağıdır; o olmazsa durum koridorda bekler.",
        pl: "Partner you: bez niego stan niezręcznie czeka na korytarzu.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s10-word-alone",
      targetText: "alone",
      transcription: "/əˈloʊn/",
      playfulMeaningByLocale: copy({
        ru: "Столик на одного: не обязательно грустно, просто компания сегодня не пришла.",
        uk: "Столик на одного: не обов’язково сумно, просто компанія сьогодні не прийшла.",
        es: "Mesa para uno: no tiene que ser triste, simplemente hoy no vino compañía.",
        en: "A table for one: not necessarily sad, simply no company today.",
        "pt-BR":
          "Mesa para um: não precisa ser triste, apenas não veio companhia hoje.",
        vi: "Bàn dành cho một người: chưa chắc buồn, chỉ là hôm nay không có ai đi cùng.",
        id: "Meja untuk satu orang: belum tentu sedih, hanya sedang tanpa teman.",
        tr: "Tek kişilik masa: üzgün olmak şart değil, bugün yalnızca eşlik eden yok.",
        pl: "Stolik dla jednej osoby: nie musi być smutno, po prostu dziś nie ma towarzystwa.",
      }),
    },
  ]);

const EDITORIAL_BY_KEY = new Map(
  ENGLISH_EDITORIAL.map((entry) => [
    `${entry.targetLanguage}\u0000${entry.lexicalItemId}`,
    entry,
  ]),
);

export function learningV2NewWordCardEditorialV1(
  input: Readonly<{
    targetLanguage: string;
    lexicalItemId: string;
    targetText: string;
  }>,
): LearningV2NewWordCardEditorialV1 {
  const entry = EDITORIAL_BY_KEY.get(
    `${input.targetLanguage}\u0000${input.lexicalItemId}`,
  );
  if (!entry) {
    throw new Error(
      `learning_v2_new_word_card_editorial_missing:${input.targetLanguage}:${input.lexicalItemId}`,
    );
  }
  if (entry.targetText !== input.targetText) {
    throw new Error(
      `learning_v2_new_word_card_editorial_target_mismatch:${input.lexicalItemId}`,
    );
  }
  if (
    Object.keys(entry.playfulMeaningByLocale).join("\u0000") !==
    LEARNING_V2_INTERFACE_LOCALES.join("\u0000")
  ) {
    throw new Error(
      `learning_v2_new_word_card_editorial_locales_invalid:${input.lexicalItemId}`,
    );
  }
  return entry;
}
