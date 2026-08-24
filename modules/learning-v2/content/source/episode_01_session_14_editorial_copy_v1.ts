type Locale = "ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl";
type PhraseCopy = Readonly<{ meaning: string; explanation: string }>;
const L = (
  value: Record<Locale, PhraseCopy>,
): Readonly<Record<Locale, PhraseCopy>> => value;

/** Hand-authored learner copy for session 14. No explanation is assembled from templates. */
export const EPISODE_01_SESSION_14_EDITORIAL_COPY_V1: Readonly<
  Record<string, Readonly<Record<Locale, PhraseCopy>>>
> = Object.freeze({
  "I am at home.": L({
    ru: {
      meaning: "Я дома.",
      explanation:
        "I am at home. говорят, когда сообщают своё текущее место: человек находится дома. At home запоминается целиком — перед home не нужен артикль the.",
    },
    uk: {
      meaning: "Я вдома.",
      explanation:
        "I am at home. кажуть, коли повідомляють, що зараз перебувають удома. Сполуку at home варто пам’ятати разом: перед home тут не ставлять артикль the.",
    },
    es: {
      meaning: "Estoy en casa.",
      explanation:
        "I am at home. indica que quien habla está en su casa. En inglés se aprende el bloque at home completo y, a diferencia de en casa, no lleva el artículo the.",
    },
    "pt-BR": {
      meaning: "Estou em casa.",
      explanation:
        "I am at home. informa que quem fala está em casa naquele momento. O inglês usa o bloco fixo at home e não coloca o artigo the antes de home.",
    },
    vi: {
      meaning: "Tôi đang ở nhà.",
      explanation:
        "I am at home. cho biết người nói hiện đang ở nhà. Cụm at home cần được nhớ như một khối hoàn chỉnh; trong cách nói này không thêm the trước home.",
    },
    id: {
      meaning: "Saya di rumah.",
      explanation:
        "I am at home. memberi tahu bahwa penutur sedang berada di rumah. At home dipakai sebagai satu kelompok tetap dan tidak memerlukan artikel the sebelum home.",
    },
    tr: {
      meaning: "Evdeyim.",
      explanation:
        "I am at home. konuşanın o anda evde bulunduğunu bildirir. İngilizcede at home kalıbı birlikte öğrenilir ve home önüne the getirilmez.",
    },
    pl: {
      meaning: "Jestem w domu.",
      explanation:
        "I am at home. informuje, że mówiący znajduje się teraz w domu. Angielskie at home jest gotowym połączeniem i nie przyjmuje przed home rodzajnika the.",
    },
  }),
  "You are in class.": L({
    ru: {
      meaning: "Ты на занятии.",
      explanation:
        "You are in class. означает, что собеседник сейчас участвует в занятии, а не просто стоит рядом со зданием. In class называет состояние «быть на уроке».",
    },
    uk: {
      meaning: "Ти на занятті.",
      explanation:
        "You are in class. означає, що співрозмовник зараз бере участь у занятті, а не лише перебуває біля будівлі. In class передає значення «бути на уроці».",
    },
    es: {
      meaning: "Estás en clase.",
      explanation:
        "You are in class. dice que la otra persona está participando en una clase, no simplemente cerca del edificio. El bloque in class expresa la actividad de estar en clase.",
    },
    "pt-BR": {
      meaning: "Você está na aula.",
      explanation:
        "You are in class. mostra que a pessoa está participando de uma aula, e não apenas perto da escola. In class funciona como o bloco que indica essa atividade.",
    },
    vi: {
      meaning: "Bạn đang ở trong lớp.",
      explanation:
        "You are in class. cho biết người nghe đang tham gia giờ học chứ không chỉ đứng gần phòng học. In class là cụm dùng cho trạng thái đang học trong lớp.",
    },
    id: {
      meaning: "Kamu sedang mengikuti kelas.",
      explanation:
        "You are in class. berarti lawan bicara sedang mengikuti pelajaran, bukan sekadar berada dekat gedungnya. In class menyatakan keadaan sedang berada dalam kegiatan kelas.",
    },
    tr: {
      meaning: "Derstesin.",
      explanation:
        "You are in class. karşınızdaki kişinin yalnız binada değil, o anda derse katıldığını söyler. In class kalıbı dersin içinde olma durumunu anlatır.",
    },
    pl: {
      meaning: "Jesteś na zajęciach.",
      explanation:
        "You are in class. oznacza, że rozmówca uczestniczy teraz w zajęciach, a nie tylko jest obok budynku. In class nazywa właśnie udział w lekcji.",
    },
  }),
  "I am at work.": L({
    ru: {
      meaning: "Я на работе.",
      explanation:
        "I am at work. сообщает, что говорящий сейчас находится на работе и занят рабочим днём. At work — готовое сочетание; вариант to work обозначал бы направление.",
    },
    uk: {
      meaning: "Я на роботі.",
      explanation:
        "I am at work. повідомляє, що мовець зараз перебуває на роботі протягом робочого дня. At work є готовою сполукою, а to work означало б напрямок руху.",
    },
    es: {
      meaning: "Estoy en el trabajo.",
      explanation:
        "I am at work. sitúa al hablante en su trabajo durante la jornada. El inglés usa at work para la ubicación; to work señalaría movimiento hacia ese lugar.",
    },
    "pt-BR": {
      meaning: "Estou no trabalho.",
      explanation:
        "I am at work. informa que quem fala está no local de trabalho durante o expediente. At work marca a localização; to work indicaria movimento para lá.",
    },
    vi: {
      meaning: "Tôi đang ở chỗ làm.",
      explanation:
        "I am at work. cho biết người nói hiện ở nơi làm việc trong giờ làm. At work diễn tả vị trí, còn to work sẽ gợi hướng di chuyển đến nơi đó.",
    },
    id: {
      meaning: "Saya sedang di tempat kerja.",
      explanation:
        "I am at work. menyatakan bahwa penutur sedang berada di tempat kerja pada jam kerja. At work menunjukkan lokasi, sedangkan to work menunjukkan arah perjalanan.",
    },
    tr: {
      meaning: "İşteyim.",
      explanation:
        "I am at work. konuşanın çalışma saatinde iş yerinde bulunduğunu bildirir. At work konumu gösterir; to work ise iş yerine doğru hareketi anlatırdı.",
    },
    pl: {
      meaning: "Jestem w pracy.",
      explanation:
        "I am at work. mówi, że osoba mówiąca przebywa teraz w miejscu pracy. At work określa położenie, natomiast to work wskazywałoby kierunek ruchu.",
    },
  }),
  "You are in the park.": L({
    ru: {
      meaning: "Ты в парке.",
      explanation:
        "You are in the park. помещает собеседника внутри территории парка. In подчёркивает нахождение внутри, а the нужен, потому что речь идёт о конкретном парке.",
    },
    uk: {
      meaning: "Ти в парку.",
      explanation:
        "You are in the park. розміщує співрозмовника всередині території парку. In підкреслює перебування всередині, а the вказує на конкретний парк.",
    },
    es: {
      meaning: "Estás dentro del parque.",
      explanation:
        "You are in the park. coloca a la otra persona dentro de los límites del parque. In expresa interior y the señala el parque concreto del que se está hablando.",
    },
    "pt-BR": {
      meaning: "Você está dentro do parque.",
      explanation:
        "You are in the park. coloca a pessoa dentro da área do parque. In destaca o interior, enquanto the mostra que se trata de um parque específico.",
    },
    vi: {
      meaning: "Bạn đang ở trong công viên.",
      explanation:
        "You are in the park. xác định người nghe đang ở bên trong khuôn viên công viên. In nhấn mạnh phía trong, còn the chỉ công viên cụ thể đang được nhắc đến.",
    },
    id: {
      meaning: "Kamu berada di dalam taman.",
      explanation:
        "You are in the park. menempatkan lawan bicara di dalam batas taman. In menekankan bagian dalam dan the menunjukkan taman tertentu yang sedang dibicarakan.",
    },
    tr: {
      meaning: "Parkın içindesin.",
      explanation:
        "You are in the park. karşınızdaki kişiyi park alanının içinde gösterir. In iç bölgeyi, the ise konuşmada bilinen belirli parkı işaret eder.",
    },
    pl: {
      meaning: "Jesteś w parku.",
      explanation:
        "You are in the park. umieszcza rozmówcę wewnątrz terenu parku. In podkreśla wnętrze, a the wskazuje konkretny park znany z rozmowy.",
    },
  }),
  "I am on the bus.": L({
    ru: {
      meaning: "Я еду в автобусе.",
      explanation:
        "I am on the bus. обычно сообщает, что говорящий едет пассажиром автобуса. Для общественного транспорта английский выбирает on, хотя по-русски человек находится «в» автобусе.",
    },
    uk: {
      meaning: "Я їду автобусом.",
      explanation:
        "I am on the bus. зазвичай повідомляє, що мовець їде пасажиром автобуса. З громадським транспортом англійська використовує on, хоча українською кажуть «в автобусі».",
    },
    es: {
      meaning: "Voy en el autobús.",
      explanation:
        "I am on the bus. suele indicar que el hablante viaja como pasajero. El inglés emplea on con el transporte público, aunque en español se diga en el autobús.",
    },
    "pt-BR": {
      meaning: "Estou no ônibus, em viagem.",
      explanation:
        "I am on the bus. normalmente informa que a pessoa está viajando como passageira. O inglês usa on com transporte público, embora em português se diga no ônibus.",
    },
    vi: {
      meaning: "Tôi đang đi xe buýt.",
      explanation:
        "I am on the bus. thường cho biết người nói đang đi xe buýt với tư cách hành khách. Tiếng Anh dùng on cho phương tiện công cộng, không dùng in theo thói quen tiếng Việt.",
    },
    id: {
      meaning: "Saya sedang naik bus.",
      explanation:
        "I am on the bus. biasanya berarti penutur sedang bepergian sebagai penumpang bus. Bahasa Inggris memakai on untuk angkutan umum, bukan menerjemahkan pola di dalam secara harfiah.",
    },
    tr: {
      meaning: "Otobüsteyim, yolculuk ediyorum.",
      explanation:
        "I am on the bus. konuşanın otobüste yolcu olarak seyahat ettiğini anlatır. İngilizce toplu taşımada, Türkçedeki içte bulunma düşüncesine rağmen on kullanır.",
    },
    pl: {
      meaning: "Jadę autobusem.",
      explanation:
        "I am on the bus. zwykle oznacza, że mówiący podróżuje jako pasażer autobusu. Angielski używa on przy transporcie publicznym, choć po polsku mówi się „w autobusie”.",
    },
  }),
  "You are at home.": L({
    ru: {
      meaning: "Ты дома.",
      explanation:
        "You are at home. отвечает на вопрос о месте собеседника и подтверждает, что он дома. Форма are согласуется с you, а at home остаётся единым блоком без the.",
    },
    uk: {
      meaning: "Ти вдома.",
      explanation:
        "You are at home. відповідає на запитання про місце співрозмовника й підтверджує, що він удома. Are узгоджується з you, а at home лишається блоком без the.",
    },
    es: {
      meaning: "Estás en casa.",
      explanation:
        "You are at home. responde dónde está la otra persona y confirma que se encuentra en casa. Are corresponde a you y el bloque at home se mantiene sin the.",
    },
    "pt-BR": {
      meaning: "Você está em casa.",
      explanation:
        "You are at home. responde onde a outra pessoa está e confirma que ela se encontra em casa. Are acompanha you e at home permanece sem o artigo the.",
    },
    vi: {
      meaning: "Bạn đang ở nhà.",
      explanation:
        "You are at home. trả lời về vị trí của người nghe và xác nhận họ đang ở nhà. Are đi với you, còn cụm at home được giữ nguyên, không thêm the.",
    },
    id: {
      meaning: "Kamu di rumah.",
      explanation:
        "You are at home. menjawab lokasi lawan bicara dan menegaskan bahwa ia berada di rumah. Are sesuai dengan you, sedangkan at home tetap tanpa artikel the.",
    },
    tr: {
      meaning: "Evdesin.",
      explanation:
        "You are at home. karşınızdaki kişinin nerede olduğunu yanıtlar ve evde bulunduğunu doğrular. You ile are kullanılır; at home kalıbına the eklenmez.",
    },
    pl: {
      meaning: "Jesteś w domu.",
      explanation:
        "You are at home. odpowiada na pytanie o miejsce rozmówcy i potwierdza, że jest w domu. Z you łączy się are, a gotowe at home pozostaje bez the.",
    },
  }),
  "I am in class.": L({
    ru: {
      meaning: "Я на занятии.",
      explanation:
        "I am in class. сообщает, что говорящий сейчас находится на занятии и участвует в нём. In class описывает учебную ситуацию, поэтому после class не ставится the.",
    },
    uk: {
      meaning: "Я на занятті.",
      explanation:
        "I am in class. повідомляє, що мовець зараз перебуває на занятті та бере в ньому участь. In class описує навчальну ситуацію, тому після in тут немає the.",
    },
    es: {
      meaning: "Estoy en clase.",
      explanation:
        "I am in class. avisa que quien habla está participando en una clase en ese momento. In class nombra la situación académica y por eso no añade the.",
    },
    "pt-BR": {
      meaning: "Estou na aula.",
      explanation:
        "I am in class. avisa que quem fala está participando de uma aula naquele momento. In class descreve a situação de estudo e não recebe the.",
    },
    vi: {
      meaning: "Tôi đang ở trong lớp.",
      explanation:
        "I am in class. báo rằng người nói đang tham gia giờ học. In class mô tả hoạt động học trong lớp và trong cách dùng này không có the trước class.",
    },
    id: {
      meaning: "Saya sedang mengikuti kelas.",
      explanation:
        "I am in class. memberi tahu bahwa penutur sedang mengikuti pelajaran. In class menyebut situasi belajar dan dalam pemakaian ini tidak memakai the sebelum class.",
    },
    tr: {
      meaning: "Dersteyim.",
      explanation:
        "I am in class. konuşanın o anda derse katıldığını haber verir. In class eğitim durumunu adlandırır ve bu kullanımda class önüne the gelmez.",
    },
    pl: {
      meaning: "Jestem na zajęciach.",
      explanation:
        "I am in class. informuje, że mówiący uczestniczy właśnie w lekcji. In class nazywa sytuację nauki i w tym znaczeniu nie ma przed class rodzajnika the.",
    },
  }),
  "You are at work.": L({
    ru: {
      meaning: "Ты на работе.",
      explanation:
        "You are at work. указывает, что собеседник сейчас на своём рабочем месте. At показывает нахождение, тогда как to work означало бы движение к работе или действие «работать».",
    },
    uk: {
      meaning: "Ти на роботі.",
      explanation:
        "You are at work. указує, що співрозмовник зараз на своєму робочому місці. At показує перебування, тоді як to work означало б рух до роботи або дію «працювати».",
    },
    es: {
      meaning: "Estás en el trabajo.",
      explanation:
        "You are at work. sitúa a la otra persona en su lugar de trabajo. At expresa ubicación; to work hablaría del desplazamiento hacia allí o del verbo trabajar.",
    },
    "pt-BR": {
      meaning: "Você está no trabalho.",
      explanation:
        "You are at work. situa a outra pessoa no local de trabalho. At expressa localização; to work falaria do deslocamento até lá ou da ação de trabalhar.",
    },
    vi: {
      meaning: "Bạn đang ở chỗ làm.",
      explanation:
        "You are at work. xác định người nghe đang ở nơi làm việc. At nói về vị trí hiện tại; to work sẽ nói về hướng đi đến đó hoặc hành động làm việc.",
    },
    id: {
      meaning: "Kamu sedang di tempat kerja.",
      explanation:
        "You are at work. menempatkan lawan bicara di tempat kerjanya. At menyatakan lokasi saat ini; to work akan menyatakan arah ke sana atau tindakan bekerja.",
    },
    tr: {
      meaning: "İştesin.",
      explanation:
        "You are at work. karşınızdaki kişinin şu an iş yerinde olduğunu söyler. At mevcut konumu, to work ise oraya yönelmeyi ya da çalışma eylemini anlatır.",
    },
    pl: {
      meaning: "Jesteś w pracy.",
      explanation:
        "You are at work. wskazuje, że rozmówca jest obecnie w miejscu pracy. At mówi o położeniu, a to work oznaczałoby ruch w tę stronę albo czynność pracy.",
    },
  }),
  "I am in the park.": L({
    ru: {
      meaning: "Я в парке.",
      explanation:
        "I am in the park. сообщает, что говорящий находится внутри парковой территории. In отвечает за смысл «внутри», а the показывает, что парк уже понятен из ситуации.",
    },
    uk: {
      meaning: "Я в парку.",
      explanation:
        "I am in the park. повідомляє, що мовець перебуває всередині паркової території. In передає значення «усередині», а the показує відомий із ситуації парк.",
    },
    es: {
      meaning: "Estoy dentro del parque.",
      explanation:
        "I am in the park. informa que el hablante se encuentra dentro del recinto. In aporta el sentido interior y the identifica el parque conocido por el contexto.",
    },
    "pt-BR": {
      meaning: "Estou dentro do parque.",
      explanation:
        "I am in the park. informa que quem fala está dentro da área do parque. In traz o sentido de interior e the identifica o parque já conhecido na conversa.",
    },
    vi: {
      meaning: "Tôi đang ở trong công viên.",
      explanation:
        "I am in the park. cho biết người nói đang ở bên trong khuôn viên. In tạo nghĩa phía trong và the chỉ công viên đã được xác định trong ngữ cảnh.",
    },
    id: {
      meaning: "Saya berada di dalam taman.",
      explanation:
        "I am in the park. menyatakan bahwa penutur berada di dalam kawasan taman. In memberi makna bagian dalam dan the menunjuk taman yang sudah dikenal dari konteks.",
    },
    tr: {
      meaning: "Parkın içindeyim.",
      explanation:
        "I am in the park. konuşanın park alanının içinde bulunduğunu bildirir. In iç bölge anlamını verir, the ise bağlamda bilinen parkı gösterir.",
    },
    pl: {
      meaning: "Jestem w parku.",
      explanation:
        "I am in the park. informuje, że mówiący znajduje się wewnątrz terenu parku. In wnosi znaczenie wnętrza, a the wskazuje park znany z kontekstu.",
    },
  }),
  "You are at the station.": L({
    ru: {
      meaning: "Ты на станции.",
      explanation:
        "You are at the station. отмечает станцию как точку, где находится собеседник. At подходит для места встречи, а the указывает на конкретную известную станцию.",
    },
    uk: {
      meaning: "Ти на станції.",
      explanation:
        "You are at the station. позначає станцію як точку перебування співрозмовника. At пасує до місця зустрічі, а the вказує на конкретну відому станцію.",
    },
    es: {
      meaning: "Estás en la estación.",
      explanation:
        "You are at the station. presenta la estación como el punto donde está la otra persona. At sirve para ese lugar de encuentro y the señala una estación concreta.",
    },
    "pt-BR": {
      meaning: "Você está na estação.",
      explanation:
        "You are at the station. apresenta a estação como o ponto onde a pessoa se encontra. At funciona para o local de encontro e the indica uma estação específica.",
    },
    vi: {
      meaning: "Bạn đang ở nhà ga.",
      explanation:
        "You are at the station. coi nhà ga là điểm người nghe đang có mặt. At phù hợp với điểm hẹn, còn the cho biết đó là nhà ga cụ thể đã được nhắc tới.",
    },
    id: {
      meaning: "Kamu berada di stasiun.",
      explanation:
        "You are at the station. menjadikan stasiun sebagai titik tempat lawan bicara berada. At cocok untuk lokasi pertemuan dan the menunjukkan stasiun tertentu.",
    },
    tr: {
      meaning: "İstasyondasın.",
      explanation:
        "You are at the station. istasyonu karşınızdaki kişinin bulunduğu nokta olarak gösterir. At buluşma yerini, the ise belirli ve bilinen istasyonu belirtir.",
    },
    pl: {
      meaning: "Jesteś na stacji.",
      explanation:
        "You are at the station. przedstawia stację jako punkt, w którym jest rozmówca. At pasuje do miejsca spotkania, a the wskazuje konkretną znaną stację.",
    },
  }),
  "I am at the station.": L({
    ru: {
      meaning: "Я на станции.",
      explanation:
        "I am at the station. удобно сообщить ожидающему человеку, что вы уже прибыли к станции. At рассматривает её как точку прибытия, а the делает место определённым.",
    },
    uk: {
      meaning: "Я на станції.",
      explanation:
        "I am at the station. зручно сказати людині, яка чекає, що ви вже прибули до станції. At подає її як точку прибуття, а the робить місце визначеним.",
    },
    es: {
      meaning: "Estoy en la estación.",
      explanation:
        "I am at the station. sirve para avisar a quien espera que ya has llegado. At trata la estación como punto de llegada y the la convierte en el lugar concreto compartido.",
    },
    "pt-BR": {
      meaning: "Estou na estação.",
      explanation:
        "I am at the station. serve para avisar a quem espera que você já chegou. At trata a estação como ponto de chegada e the marca o local específico conhecido.",
    },
    vi: {
      meaning: "Tôi đang ở nhà ga.",
      explanation:
        "I am at the station. dùng để báo cho người đang chờ rằng bạn đã tới nơi. At coi nhà ga là điểm đến, còn the xác định đúng nhà ga mà hai bên đều biết.",
    },
    id: {
      meaning: "Saya berada di stasiun.",
      explanation:
        "I am at the station. dapat memberi tahu orang yang menunggu bahwa kamu sudah tiba. At melihat stasiun sebagai titik kedatangan dan the menandai tempat tertentu itu.",
    },
    tr: {
      meaning: "İstasyondayım.",
      explanation:
        "I am at the station. bekleyen kişiye istasyona vardığınızı bildirir. At istasyonu varış noktası olarak ele alır, the ise iki kişinin bildiği yeri belirler.",
    },
    pl: {
      meaning: "Jestem na stacji.",
      explanation:
        "I am at the station. pozwala powiedzieć czekającej osobie, że już dotarłeś. At ujmuje stację jako punkt przybycia, a the określa wspólnie znane miejsce.",
    },
  }),
  "You are on the bus.": L({
    ru: {
      meaning: "Ты едешь в автобусе.",
      explanation:
        "You are on the bus. подтверждает, что собеседник сейчас едет как пассажир. On — обычный выбор для автобуса в поездке; are связывает это место с you.",
    },
    uk: {
      meaning: "Ти їдеш автобусом.",
      explanation:
        "You are on the bus. підтверджує, що співрозмовник зараз їде як пасажир. On є звичним вибором для автобуса під час поїздки, а are пов’язує місце з you.",
    },
    es: {
      meaning: "Vas en el autobús.",
      explanation:
        "You are on the bus. confirma que la otra persona viaja como pasajera. On es la elección habitual para el autobús durante el trayecto y are lo relaciona con you.",
    },
    "pt-BR": {
      meaning: "Você está no ônibus, em viagem.",
      explanation:
        "You are on the bus. confirma que a outra pessoa está viajando como passageira. On é a escolha normal para o ônibus em movimento e are acompanha you.",
    },
    vi: {
      meaning: "Bạn đang đi xe buýt.",
      explanation:
        "You are on the bus. xác nhận người nghe đang đi xe buýt như một hành khách. On là lựa chọn tự nhiên cho chuyến xe, còn are nối vị trí ấy với you.",
    },
    id: {
      meaning: "Kamu sedang naik bus.",
      explanation:
        "You are on the bus. menegaskan bahwa lawan bicara sedang bepergian sebagai penumpang. On lazim dipakai untuk perjalanan bus dan are menghubungkannya dengan you.",
    },
    tr: {
      meaning: "Otobüstesin, yolculuk ediyorsun.",
      explanation:
        "You are on the bus. karşınızdaki kişinin otobüste yolcu olarak gittiğini doğrular. Yolculukta bus ile on kullanılır; are bu yeri you kişisine bağlar.",
    },
    pl: {
      meaning: "Jedziesz autobusem.",
      explanation:
        "You are on the bus. potwierdza, że rozmówca podróżuje jako pasażer. On jest zwykłym wyborem przy jeździe autobusem, a are łączy to miejsce z you.",
    },
  }),
  "I am in the café.": L({
    ru: {
      meaning: "Я внутри кафе.",
      explanation:
        "I am in the café. уточняет, что говорящий находится внутри конкретного кафе. In подчёркивает внутреннее пространство, а the отсылает к уже известному месту.",
    },
    uk: {
      meaning: "Я всередині кафе.",
      explanation:
        "I am in the café. уточнює, що мовець перебуває всередині конкретного кафе. In підкреслює внутрішній простір, а the відсилає до вже відомого місця.",
    },
    es: {
      meaning: "Estoy dentro de la cafetería.",
      explanation:
        "I am in the café. precisa que el hablante está dentro de una cafetería concreta. In destaca el espacio interior y the remite al lugar ya identificado.",
    },
    "pt-BR": {
      meaning: "Estou dentro do café.",
      explanation:
        "I am in the café. esclarece que quem fala está dentro de um café específico. In destaca o espaço interno e the retoma o lugar já identificado.",
    },
    vi: {
      meaning: "Tôi đang ở bên trong quán cà phê.",
      explanation:
        "I am in the café. nói rõ người nói đang ở bên trong một quán cụ thể. In nhấn mạnh không gian phía trong, còn the nhắc lại địa điểm đã biết.",
    },
    id: {
      meaning: "Saya berada di dalam kafe.",
      explanation:
        "I am in the café. memperjelas bahwa penutur berada di dalam kafe tertentu. In menekankan ruang bagian dalam dan the merujuk pada tempat yang sudah diketahui.",
    },
    tr: {
      meaning: "Kafenin içindeyim.",
      explanation:
        "I am in the café. konuşanın belirli kafenin içinde bulunduğunu açıklar. In iç mekânı vurgular, the ise daha önce belirlenen yeri gösterir.",
    },
    pl: {
      meaning: "Jestem wewnątrz kawiarni.",
      explanation:
        "I am in the café. precyzuje, że mówiący jest wewnątrz konkretnej kawiarni. In podkreśla wnętrze, a the odsyła do miejsca już znanego.",
    },
  }),
  "You are in the café.": L({
    ru: {
      meaning: "Ты внутри кафе.",
      explanation:
        "You are in the café. отличает нахождение собеседника внутри кафе от ожидания снаружи. In задаёт точную внутреннюю область, а are подходит к you.",
    },
    uk: {
      meaning: "Ти всередині кафе.",
      explanation:
        "You are in the café. відрізняє перебування співрозмовника всередині кафе від очікування надворі. In задає точну внутрішню область, а are пасує до you.",
    },
    es: {
      meaning: "Estás dentro de la cafetería.",
      explanation:
        "You are in the café. distingue estar dentro de la cafetería de esperar fuera. In marca el espacio interior exacto y are es la forma que corresponde a you.",
    },
    "pt-BR": {
      meaning: "Você está dentro do café.",
      explanation:
        "You are in the café. distingue estar dentro do café de esperar do lado de fora. In marca o espaço interno exato e are é a forma ligada a you.",
    },
    vi: {
      meaning: "Bạn đang ở bên trong quán cà phê.",
      explanation:
        "You are in the café. phân biệt việc người nghe ở trong quán với đang chờ bên ngoài. In chỉ đúng không gian bên trong và are là dạng đi với you.",
    },
    id: {
      meaning: "Kamu berada di dalam kafe.",
      explanation:
        "You are in the café. membedakan posisi di dalam kafe dari menunggu di luar. In menandai ruang bagian dalam secara tepat dan are adalah bentuk untuk you.",
    },
    tr: {
      meaning: "Kafenin içindesin.",
      explanation:
        "You are in the café. karşınızdaki kişinin içeride olmasını dışarıda beklemesinden ayırır. In iç alanı gösterir, are ise you ile kullanılan biçimdir.",
    },
    pl: {
      meaning: "Jesteś wewnątrz kawiarni.",
      explanation:
        "You are in the café. odróżnia obecność rozmówcy wewnątrz od czekania na zewnątrz. In wyznacza wnętrze, a are jest formą pasującą do you.",
    },
  }),
  "You are not at home.": L({
    ru: {
      meaning: "Тебя нет дома.",
      explanation:
        "You are not at home. сообщает об отсутствии собеседника дома. Not ставится после are, а at home сохраняется целым: отрицание меняет факт, но не сочетание места.",
    },
    uk: {
      meaning: "Тебе немає вдома.",
      explanation:
        "You are not at home. повідомляє про відсутність співрозмовника вдома. Not стоїть після are, а at home зберігається цілим: заперечення змінює факт, не сполуку місця.",
    },
    es: {
      meaning: "No estás en casa.",
      explanation:
        "You are not at home. afirma que la otra persona no se encuentra en casa. Not va después de are y el bloque at home permanece intacto dentro de la negación.",
    },
    "pt-BR": {
      meaning: "Você não está em casa.",
      explanation:
        "You are not at home. informa que a outra pessoa não se encontra em casa. Not vem depois de are e o bloco at home continua inteiro na frase negativa.",
    },
    vi: {
      meaning: "Bạn không có ở nhà.",
      explanation:
        "You are not at home. cho biết người nghe không ở nhà. Not đứng sau are, còn cụm at home vẫn giữ nguyên; phủ định thay đổi sự việc chứ không đổi giới từ.",
    },
    id: {
      meaning: "Kamu tidak berada di rumah.",
      explanation:
        "You are not at home. menyatakan bahwa lawan bicara tidak berada di rumah. Not diletakkan setelah are dan kelompok at home tetap utuh dalam kalimat negatif.",
    },
    tr: {
      meaning: "Evde değilsin.",
      explanation:
        "You are not at home. karşınızdaki kişinin evde bulunmadığını söyler. Not, are sonrasında gelir; olumsuzluk gerçeği değiştirir, at home kalıbını değiştirmez.",
    },
    pl: {
      meaning: "Nie ma cię w domu.",
      explanation:
        "You are not at home. mówi, że rozmówca nie znajduje się w domu. Not stoi po are, natomiast at home pozostaje całym połączeniem także w przeczeniu.",
    },
  }),
});
