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
        ru: "Слово, которым говорящий называет себя: «я». В английском I всегда пишется с заглавной буквы.",
        uk: "Слово, яким мовець називає себе: «я». В англійській I завжди пишеться з великої літери.",
        es: "Palabra que usa quien habla para referirse a sí mismo: «yo». En inglés, I siempre lleva mayúscula.",
        en: "The word a speaker uses for themself. In English, I is always written with a capital letter.",
        "pt-BR": "Palavra usada por quem fala para se referir a si mesmo: «eu». Em inglês, I sempre leva maiúscula.",
        vi: "Từ người nói dùng để chỉ chính mình: “tôi”. Trong tiếng Anh, I luôn được viết hoa.",
        id: "Kata yang dipakai pembicara untuk menyebut dirinya sendiri: “saya”. Dalam bahasa Inggris, I selalu ditulis dengan huruf kapital.",
        tr: "Konuşanın kendisinden söz ederken kullandığı sözcük: “ben”. İngilizcede I her zaman büyük harfle yazılır.",
        pl: "Słowo, którym mówiący nazywa siebie: „ja”. W angielskim I zawsze zapisuje się wielką literą.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s01-word-am",
      targetText: "am",
      transcription: "/æm/",
      playfulMeaningByLocale: copy({
        ru: "Короткий мостик после I: соединяет говорящего с именем, местом или состоянием. Две буквы, а держит целую фразу.",
        uk: "Короткий місток після I: поєднує мовця з ім’ям, місцем або станом. Дві літери, а тримає цілий вислів.",
        es: "Un puente breve después de I: conecta a quien habla con un nombre, lugar o estado. Dos letras sostienen toda la frase.",
        en: "A short bridge after I: it links the speaker to a name, place, or state. Two letters hold the whole sentence together.",
        "pt-BR": "Uma ponte curta depois de I: liga quem fala a um nome, lugar ou estado. Duas letras sustentam a frase inteira.",
        vi: "Một chiếc cầu ngắn đứng sau I: nối người nói với tên, nơi chốn hoặc trạng thái. Chỉ hai chữ mà đỡ cả câu.",
        id: "Jembatan pendek setelah I: menghubungkan penutur dengan nama, tempat, atau keadaan. Dua huruf menopang seluruh kalimat.",
        tr: "I sözcüğünden sonra gelen kısa bir köprü: konuşanı ad, yer ya da duruma bağlar. İki harf, bütün ifadeyi taşır.",
        pl: "Krótki most po I: łączy mówiącego z imieniem, miejscem lub stanem. Dwie litery, a podtrzymują całe zdanie.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s01-word-here",
      targetText: "here",
      transcription: "/hɪə(r)/",
      playfulMeaningByLocale: copy({
        ru: "В этом месте — там, где находится говорящий. Навигатору далеко ехать не придётся.",
        uk: "У цьому місці — там, де перебуває мовець. Навігатору далеко їхати не доведеться.",
        es: "En este lugar, donde está quien habla. El navegador no tendrá que ir muy lejos.",
        en: "In this place, where the speaker is. The GPS does not have far to go.",
        "pt-BR": "Neste lugar, onde está quem fala. O GPS não vai precisar ir longe.",
        vi: "Ở nơi này, nơi người nói đang đứng. GPS không phải đi xa.",
        id: "Di tempat ini, tempat si pembicara berada. GPS tidak perlu pergi jauh.",
        tr: "Konuşanın bulunduğu bu yerde. Navigasyonun uzağa gitmesi gerekmez.",
        pl: "W tym miejscu, w którym znajduje się mówiący. Nawigacja nie ma daleko.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s01-word-ready",
      targetText: "ready",
      transcription: "/ˈredi/",
      playfulMeaningByLocale: copy({
        ru: "Подготовлен и может начать или действовать прямо сейчас. Кнопка старта уже заждалась.",
        uk: "Підготовлений і може почати або діяти просто зараз. Кнопка старту вже зачекалася.",
        es: "Preparado para empezar o actuar ahora mismo. El botón de inicio ya está esperando.",
        en: "Prepared and able to start or act now. The start button is already waiting.",
        "pt-BR": "Preparado para começar ou agir agora. O botão de início já está esperando.",
        vi: "Đã chuẩn bị xong và có thể bắt đầu hoặc hành động ngay. Nút bắt đầu đang chờ.",
        id: "Sudah siap dan dapat mulai atau bertindak sekarang. Tombol mulai sudah menunggu.",
        tr: "Hazırlanmış ve şimdi başlayabilecek ya da harekete geçebilecek durumda. Başlat düğmesi bekliyor.",
        pl: "Przygotowany, by zacząć lub działać już teraz. Przycisk start czeka.",
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
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s03-contraction-im",
      targetText: "I'm",
      transcription: "/aɪm/",
      playfulMeaningByLocale: copy({
        ru: "Короткая форма I am: говорящий называет себя и сразу соединяет с местом или состоянием. Апостроф работает за букву a — маленький сотрудник с большой ответственностью.",
        uk: "Коротка форма I am: мовець називає себе й одразу поєднує з місцем або станом. Апостроф працює за літеру a — маленький працівник із великою відповідальністю.",
        es: "Forma corta de I am: quien habla se conecta enseguida con un lugar o estado. El apóstrofo sustituye a la a: un empleado diminuto con mucha responsabilidad.",
        en: "The short form of I am, linking the speaker straight to a place or state. The apostrophe covers for the missing a: a tiny employee with a big job.",
        "pt-BR": "Forma curta de I am: quem fala se liga diretamente a um lugar ou estado. O apóstrofo substitui o a: um funcionário minúsculo com enorme responsabilidade.",
        vi: "Dạng ngắn của I am, nối người nói thẳng với một nơi hoặc trạng thái. Dấu nháy làm thay việc của chữ a: bé xíu mà gánh việc lớn.",
        id: "Bentuk singkat I am yang langsung menghubungkan penutur dengan tempat atau keadaan. Apostrof menggantikan huruf a: pegawai kecil dengan tugas besar.",
        tr: "Konuşanı doğrudan yer ya da duruma bağlayan I am kısa biçimidir. Kesme işareti a harfinin vardiyasını devralır: küçük çalışan, büyük görev.",
        pl: "Krótka forma I am, która od razu łączy mówiącego z miejscem lub stanem. Apostrof zastępuje literę a: mały pracownik z wielkim zadaniem.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s04-word-set",
      targetText: "set",
      transcription: "/set/",
      playfulMeaningByLocale: copy({
        ru: "Полностью подготовлен и имеющий всё нужное для начала. Чемодан уже у двери и нервно смотрит на часы.",
        uk: "Повністю підготовлений і такий, що має все потрібне для початку. Валіза вже біля дверей і нервово дивиться на годинник.",
        es: "Completamente preparado y con todo lo necesario para empezar. La maleta ya espera junto a la puerta mirando el reloj.",
        en: "Fully prepared and having everything needed to begin. The suitcase is already by the door, checking the time.",
        "pt-BR": "Completamente preparado e com tudo o que é necessário para começar. A mala já espera junto à porta olhando o relógio.",
        vi: "Đã chuẩn bị đầy đủ và có mọi thứ cần để bắt đầu. Chiếc vali đang chờ bên cửa và sốt ruột nhìn đồng hồ.",
        id: "Sudah sepenuhnya siap dan memiliki semua yang diperlukan untuk mulai. Koper menunggu di pintu sambil melihat jam.",
        tr: "Başlamak için gereken her şeye sahip ve tamamen hazır. Bavul kapıda bekleyip saate bakıyor.",
        pl: "W pełni przygotowany i mający wszystko potrzebne do startu. Walizka czeka już przy drzwiach i zerka na zegarek.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s04-word-done",
      targetText: "done",
      transcription: "/dʌn/",
      playfulMeaningByLocale: copy({
        ru: "Закончивший действие или задачу; больше делать нечего. Галочка поставлена, карандаш официально ушёл в отпуск.",
        uk: "Той, хто закінчив дію або завдання; більше робити нічого. Позначку поставлено, олівець офіційно пішов у відпустку.",
        es: "Haber terminado una acción o tarea; ya no queda nada por hacer. La casilla está marcada y el lápiz se fue de vacaciones.",
        en: "Having finished an action or task, with nothing left to do. The box is ticked and the pencil is officially on holiday.",
        "pt-BR": "Ter concluído uma ação ou tarefa, sem nada mais para fazer. A caixa foi marcada e o lápis entrou oficialmente de férias.",
        vi: "Đã hoàn thành một hành động hoặc nhiệm vụ, không còn gì phải làm. Ô đã được đánh dấu và cây bút chì chính thức nghỉ phép.",
        id: "Sudah menyelesaikan tindakan atau tugas sehingga tidak ada lagi yang harus dilakukan. Kotaknya dicentang dan pensil resmi berlibur.",
        tr: "Bir işi ya da görevi bitirmiş, yapılacak bir şey bırakmamış olmak. Kutu işaretlendi, kalem resmen tatile çıktı.",
        pl: "Mieć zakończone działanie lub zadanie, bez niczego do zrobienia. Pole zaznaczone, a ołówek oficjalnie poszedł na urlop.",
      }),
    },
    {
      targetLanguage: "en",
      lexicalItemId: "e01-s04-word-free",
      targetText: "free",
      transcription: "/friː/",
      playfulMeaningByLocale: copy({
        ru: "Не занятый и имеющий время для другого дела. В календаре появилось белое пятно — редкий зверь, не спугните.",
        uk: "Не зайнятий і такий, що має час для іншої справи. У календарі з’явилася біла пляма — рідкісний звір, не злякайте.",
        es: "No ocupado y con tiempo disponible para otra cosa. Apareció un hueco blanco en la agenda: criatura rara, no la asustes.",
        en: "Not busy and having time available for something else. A blank space appeared in the calendar: a rare creature, do not scare it away.",
        "pt-BR": "Não ocupado e com tempo disponível para outra coisa. Surgiu um espaço em branco na agenda: criatura rara, não assuste.",
        vi: "Không bận và có thời gian cho việc khác. Một khoảng trắng xuất hiện trong lịch: sinh vật hiếm, đừng làm nó chạy mất.",
        id: "Tidak sibuk dan memiliki waktu untuk hal lain. Ruang kosong muncul di kalender: makhluk langka, jangan ditakuti.",
        tr: "Meşgul olmayan ve başka bir şey için zamanı bulunan. Takvimde boş bir alan belirdi: nadir canlıdır, ürkütmeyin.",
        pl: "Niezajęty i mający czas na coś innego. W kalendarzu pojawiła się pusta plama — rzadkie stworzenie, nie spłosz go.",
      }),
    },
  ]);

const EDITORIAL_BY_KEY = new Map(
  ENGLISH_EDITORIAL.map((entry) => [
    `${entry.targetLanguage}\u0000${entry.lexicalItemId}`,
    entry,
  ]),
);

const SESSION_02_EXACT_DEFINITION_BY_SOURCE_ID = Object.freeze({
  "e01-s02-word-happy": copy({
    ru: "Чувствовать радость и удовольствие.", uk: "Відчувати радість і задоволення.",
    es: "Sentir alegría y satisfacción.", en: "Feeling pleased and full of joy.",
    "pt-BR": "Sentir alegria e satisfação.", vi: "Cảm thấy vui và hài lòng.",
    id: "Merasa senang dan gembira.", tr: "Sevinç ve memnuniyet hissetmek.",
    pl: "Czuć radość i zadowolenie.",
  }),
  "e01-s02-word-sad": copy({
    ru: "Чувствовать грусть или несчастье.", uk: "Відчувати смуток або нещастя.",
    es: "Sentir tristeza o desánimo.", en: "Feeling unhappy or sorrowful.",
    "pt-BR": "Sentir tristeza ou desânimo.", vi: "Cảm thấy buồn hoặc không vui.",
    id: "Merasa sedih atau tidak bahagia.", tr: "Üzüntü ya da mutsuzluk hissetmek.",
    pl: "Czuć smutek albo nieszczęście.",
  }),
  "e01-s02-word-tired": copy({
    ru: "Нуждаться в отдыхе из-за нехватки сил.", uk: "Потребувати відпочинку через брак сил.",
    es: "Necesitar descanso por falta de energía.", en: "Needing rest because you lack energy.",
    "pt-BR": "Precisar descansar por falta de energia.", vi: "Cần nghỉ ngơi vì thiếu sức.",
    id: "Membutuhkan istirahat karena kekurangan tenaga.", tr: "Enerji azlığından dinlenmeye ihtiyaç duymak.",
    pl: "Potrzebować odpoczynku z braku sił.",
  }),
  "e01-s02-word-fine": copy({
    ru: "Быть в нормальном, достаточно хорошем состоянии.", uk: "Бути в нормальному, достатньо доброму стані.",
    es: "Estar en un estado aceptable o bastante bueno.", en: "Being in an acceptable or reasonably good state.",
    "pt-BR": "Estar em um estado aceitável ou razoavelmente bom.", vi: "Ở trạng thái ổn hoặc khá tốt.",
    id: "Berada dalam keadaan cukup baik.", tr: "Normal ya da yeterince iyi durumda olmak.",
    pl: "Być w normalnym, wystarczająco dobrym stanie.",
  }),
} as const);

// Session 2 deliberately teaches the same four lexical items that the older
// session-3 draft introduced. The definition and humorous image are both
// hand-authored per locale; this join only keeps the two approved parts in one
// compact card paragraph.
for (const [session2Id, targetText] of [
  ["e01-s02-word-happy", "happy"],
  ["e01-s02-word-sad", "sad"],
  ["e01-s02-word-tired", "tired"],
  ["e01-s02-word-fine", "fine"],
] as const) {
  const source = ENGLISH_EDITORIAL.find((entry) => entry.targetText === targetText);
  if (!source) throw new Error(`learning_v2_new_word_card_source_missing:${targetText}`);
  const definition = SESSION_02_EXACT_DEFINITION_BY_SOURCE_ID[session2Id];
  EDITORIAL_BY_KEY.set(`en\u0000${session2Id}`, Object.freeze({
    ...source,
    lexicalItemId: session2Id,
    playfulMeaningByLocale: copy(Object.fromEntries(
      LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
        locale,
        `${definition[locale]} ${source.playfulMeaningByLocale[locale]}`,
      ]),
    ) as Record<LearningV2InterfaceLocale, string>),
  }));
}

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
