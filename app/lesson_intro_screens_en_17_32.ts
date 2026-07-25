/**
 * Теория уроков 17–32 — только английский как цель (без испанского L2).
 */
import type { LessonIntroScreen } from './lesson_data_types';

type PlannedIntroTextFields = 'textPtBr' | 'textVi' | 'textId' | 'textTr' | 'textPl';
type PlannedIntroTitleFields = 'titlePtBr' | 'titleVi' | 'titleId' | 'titleTr' | 'titlePl';
type BundleWhy = Pick<LessonIntroScreen, 'titleRU' | 'titleUK' | 'titleES' | 'textRU' | 'textUK' | 'textES'> &
  Partial<Pick<LessonIntroScreen, PlannedIntroTitleFields | PlannedIntroTextFields>>;
type BundleText = Pick<LessonIntroScreen, 'textRU' | 'textUK' | 'textES'> &
  Partial<Pick<LessonIntroScreen, PlannedIntroTextFields | 'examples'>>;

const HOW_APP_WORKS: LessonIntroScreen = {
  kind: 'mechanic',
  titleRU: 'Как это работает',
  titleUK: 'Як це працює',
  titleES: 'Cómo funciona la app',
  titlePtBr: 'Como o app funciona',
  titleVi: 'Ứng dụng hoạt động như thế nào',
  titleId: 'Cara kerja aplikasi',
  titleTr: 'Uygulama nasıl çalışır',
  titlePl: 'Jak działa aplikacja',
  textRU:
    'Подсказка на языке интерфейса — собирай фразу на английском по кнопкам. «Теория» снова открывает эти слайды.',
  textUK:
    'Підказка мовою інтерфейсу — збирай англійську фразу. «Теорія» знову відкриває ці слайди.',
  textES:
    'Pista en tu idioma; monta la frase en inglés; «Teoría» reabre estas pantallas.',
  textPtBr:
    'A dica aparece no idioma da interface; monte a frase em inglês usando os botões. "Teoria" reabre estes slides.',
  textVi:
    'Gợi ý hiển thị bằng ngôn ngữ giao diện; hãy ghép câu tiếng Anh bằng các nút. "Lý thuyết" sẽ mở lại các slide này.',
  textId:
    'Petunjuk tampil dalam bahasa antarmuka; susun frasa bahasa Inggris lewat tombol. "Teori" membuka kembali slide ini.',
  textTr:
    'İpucu arayüz dilinde görünür; düğmelerle İngilizce cümleyi kur. "Teori" bu slaytları yeniden açar.',
  textPl:
    'Podpowiedź jest w języku interfejsu; ułóż angielskie zdanie z przycisków. "Teoria" ponownie otwiera te slajdy.',
};

function bundle(
  why: BundleWhy,
  how: BundleText,
  trap: BundleText,
): LessonIntroScreen[] {
  return [
    { kind: 'why', ...why },
    {
      kind: 'how',
      titleRU: 'Как строится фраза',
      titleUK: 'Як будується фраза',
      titleES: 'Estructura',
      titlePtBr: 'Estrutura',
      titleVi: 'Cấu trúc',
      titleId: 'Struktur',
      titleTr: 'Yapı',
      titlePl: 'Struktura',
      ...how,
    },
    {
      kind: 'trap',
      titleRU: 'Главная ловушка',
      titleUK: 'Головна пастка',
      titleES: 'Trampa',
      titlePtBr: 'Armadilha principal',
      titleVi: 'Bẫy chính',
      titleId: 'Jebakan utama',
      titleTr: 'Ana tuzak',
      titlePl: 'Główna pułapka',
      ...trap,
    },
    HOW_APP_WORKS,
  ];
}

export const LESSON_17_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Present Continuous', titleUK: 'Present Continuous', titleES: 'Present Continuous',
    titlePtBr: 'Present Continuous',
    titleVi: 'Present Continuous',
    titleId: 'Present Continuous',
    titleTr: 'Present Continuous',
    titlePl: 'Present Continuous',
    textRU:
      'Говоришь о действии именно сейчас или в процессе: ты читаешь текст, они не смотрят фильм по телевизору. Связка am / is / are и окончание -ing держит мысль в «текущем моменте».',
    textUK:
      'Дія триває зараз: форма з am/is/are + дієслово на -ing.',
    textES:
      'Para acciones que ocurren ahora mismo: estar + -ing (am/is/are + verbo con -ing).',
    textPtBr:
      'Para ações que acontecem agora ou estão em andamento: am/is/are + verbo com -ing mantém a ideia no momento atual.',
    textVi:
      'Dùng cho hành động đang diễn ra ngay bây giờ hoặc đang trong quá trình: am/is/are + động từ -ing giữ ý ở hiện tại.',
    textId:
      'Untuk tindakan yang terjadi sekarang atau sedang berlangsung: am/is/are + kata kerja -ing menjaga makna di momen saat ini.',
    textTr:
      'Şu anda olan ya da devam eden eylemler için: am/is/are + -ing fiil, anlamı o ana bağlar.',
    textPl:
      'Dla czynności dziejących się teraz albo trwających w danym momencie: am/is/are + czasownik z -ing.',
  },
  { textRU:
      'Am I cooking…? You are not reading… · Is he repairing… · Are we watching…',
    textUK:
      'Питання: Am/Is/Are + підмет + V-ing; заперечення — not після am/is/are.',
    textES:
      'Pregunta: ¿Am/Is/Are + sujeto + -ing?',
    textPtBr:
      'Pergunta: Am/Is/Are + sujeito + verbo em -ing? Negação: not depois de am/is/are.',
    textVi:
      'Câu hỏi: Am/Is/Are + chủ ngữ + động từ -ing? Phủ định: not sau am/is/are.',
    textId:
      'Pertanyaan: Am/Is/Are + subjek + kata kerja -ing? Negasi: not setelah am/is/are.',
    textTr:
      'Soru: Am/Is/Are + özne + -ing fiil? Olumsuzluk: not, am/is/are sonrasında gelir.',
    textPl:
      'Pytanie: Am/Is/Are + podmiot + czasownik z -ing? Przeczenie: not po am/is/are.',
    examples: [
      { en: 'Am I cooking this dinner in the kitchen right now?', trRU: 'Я сейчас готовлю ужин на кухне?', trUK: 'Чи я зараз готую вечерю на кухні?', trES: '¿Estoy cocinando esta cena en la cocina ahora?', trPtBr: 'Estou cozinhando este jantar na cozinha agora?', trVi: 'Bây giờ tôi đang nấu bữa tối này trong bếp à?', trId: 'Apakah saya sedang memasak makan malam ini di dapur sekarang?', trTr: 'Şu anda bu akşam yemeğini mutfakta mı pişiriyorum?', trPl: 'Czy teraz gotuję tę kolację w kuchni?' },
      { en: 'You are not reading that article in the newspaper.', trRU: 'Ты не читаешь ту статью в газете.', trUK: 'Ти не читаєш ту статтю в газеті.', trES: 'No estás leyendo ese artículo en el periódico.', trPtBr: 'Você não está lendo aquele artigo no jornal.', trVi: 'Bạn không đang đọc bài báo đó trên tờ báo.', trId: 'Kamu tidak sedang membaca artikel itu di koran.', trTr: 'Gazetedeki o makaleyi okumuyorsun.', trPl: 'Nie czytasz tego artykułu w gazecie.' },
      { en: 'Are we watching that new show on TV?', trRU: 'Мы смотрим то новое шоу по телевизору?', trUK: 'Чи ми дивимося те нове шоу по ТБ?', trES: '¿Estamos viendo ese programa nuevo en la tele?', trPtBr: 'Estamos assistindo àquele programa novo na TV?', trVi: 'Chúng ta đang xem chương trình mới đó trên TV à?', trId: 'Apakah kita sedang menonton acara baru itu di TV?', trTr: 'Televizyonda o yeni programı mı izliyoruz?', trPl: 'Czy oglądamy ten nowy program w telewizji?' },
    ]},
  { textRU:
      'Не вставляй лишний глагол в начальную форму между be и -ing: не *I am cook* — верно I am cooking.',
    textUK:
      'Після is/are/am лише форма на -ing, не інфінітив;',
    textES:
      'Tras am/is/are va el verbo en -ing, no el infinitivo.',
    textPtBr:
      'Depois de am/is/are vem o verbo em -ing, não o infinitivo: não *I am cook*, e sim I am cooking.',
    textVi:
      'Sau am/is/are là động từ -ing, không phải động từ nguyên mẫu: không phải *I am cook*, mà là I am cooking.',
    textId:
      'Setelah am/is/are gunakan kata kerja -ing, bukan infinitif: bukan *I am cook*, melainkan I am cooking.',
    textTr:
      'am/is/are sonrasında mastar değil -ing fiil gelir: *I am cook* değil, I am cooking.',
    textPl:
      'Po am/is/are wstawiamy czasownik z -ing, nie bezokolicznik: nie *I am cook*, tylko I am cooking.' },
);

export const LESSON_18_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Повелительное наклонение', titleUK: 'Наказовий спосіб', titleES: 'Imperativo (EN)',
    titlePtBr: 'Imperativo em inglês',
    titleVi: 'Câu mệnh lệnh trong tiếng Anh',
    titleId: 'Imperatif bahasa Inggris',
    titleTr: 'İngilizcede emir kipi',
    titlePl: 'Tryb rozkazujący w angielskim',
    textRU: 'Команда и просьба: Open the door. Don\'t run. Please sit down. Подлежащее you часто опускают.',
    textUK: 'Наказ і прохання без підмета you: Close the window. Форма як інфінітив, але без to.',
    textES: 'Órdenes en inglés: verbo base + complementos.',
    textPtBr: 'Comandos e pedidos em inglês: verbo base + complementos. O sujeito you geralmente fica implícito.',
    textVi: 'Mệnh lệnh và lời nhờ trong tiếng Anh: động từ nguyên thể không to + phần bổ sung. Chủ ngữ you thường được lược bỏ.',
    textId: 'Perintah dan permintaan dalam bahasa Inggris: kata kerja dasar + pelengkap. Subjek you biasanya dihilangkan.',
    textTr: 'İngilizcede emir ve rica: yalın fiil + tamamlayıcılar. Özne you çoğu zaman söylenmez.',
    textPl: 'Polecenia i prośby po angielsku: czasownik w formie podstawowej + dopełnienia. Podmiot you zwykle się pomija.' },
  { textRU: 'Be quiet. Help me. Don\'t worry. Please wait.',
    textUK: 'Be careful. Don\'t touch. Sit down.',
    textES: 'Base verb + objeto.',
    textPtBr: 'Verbo base + objeto ou detalhe: Be quiet. Help me. Don\'t worry.',
    textVi: 'Động từ gốc + tân ngữ hoặc chi tiết: Be quiet. Help me. Don\'t worry.',
    textId: 'Kata kerja dasar + objek atau keterangan: Be quiet. Help me. Don\'t worry.',
    textTr: 'Yalın fiil + nesne ya da ayrıntı: Be quiet. Help me. Don\'t worry.',
    textPl: 'Forma podstawowa czasownika + dopełnienie albo szczegół: Be quiet. Help me. Don\'t worry.',
    examples: [
      { en: 'Close the door.', trRU: 'Закрой дверь.', trUK: 'Зачини двері.', trPtBr: 'Feche a porta.', trVi: 'Đóng cửa lại.', trId: 'Tutup pintunya.', trTr: 'Kapıyı kapat.', trPl: 'Zamknij drzwi.' },
      { en: 'Please wait.', trRU: 'Подожди, пожалуйста.', trUK: 'Зачекай, будь ласка.', trPtBr: 'Espere, por favor.', trVi: 'Vui lòng chờ.', trId: 'Tolong tunggu.', trTr: 'Lütfen bekle.', trPl: 'Proszę zaczekać.' },
      { en: 'Don\'t run.', trRU: 'Не бегай.', trUK: 'Не біжи.', trPtBr: 'Não corra.', trVi: 'Đừng chạy.', trId: 'Jangan berlari.', trTr: 'Koşma.', trPl: 'Nie biegaj.' },
    ]},
  { textRU: 'Для he/she/it в формальной записи иногда Let him… — на первых порах держи простой Imperative без подлежащего.',
    textUK: 'Простий наказ без підмета — найбезпечніший старт.',
    textES: 'Imperativo simple primero.',
    textPtBr: 'No início, mantenha o imperativo simples sem sujeito: Open, Wait, Don\'t run.',
    textVi: 'Ở giai đoạn đầu, hãy giữ mệnh lệnh đơn giản không có chủ ngữ: Open, Wait, Don\'t run.',
    textId: 'Di tahap awal, pakai imperatif sederhana tanpa subjek: Open, Wait, Don\'t run.',
    textTr: 'Başlangıçta öznesiz basit emir kipini kullan: Open, Wait, Don\'t run.',
    textPl: 'Na początku trzymaj się prostego rozkazu bez podmiotu: Open, Wait, Don\'t run.' },
);

export const LESSON_19_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Место: in / on / at', titleUK: 'Місце: in / on / at', titleES: 'Lugar: in/on/at',
    titlePtBr: 'Lugar: in / on / at',
    titleVi: 'Nơi chốn: in / on / at',
    titleId: 'Tempat: in / on / at',
    titleTr: 'Yer: in / on / at',
    titlePl: 'Miejsce: in / on / at',
    textRU: 'at — точка (at the station), on — поверх/этаж, in — объём/страна/комната как пространство.',
    textUK: 'at — точка; on — поверхня; in — всередині / країна / місто як зона.',
    textES: 'Mapa EN: at (punto), on (superficie), in (dentro/zona).',
    textPtBr: 'at marca um ponto/local específico (at the station), on marca superfície ou andar, in marca espaço interno, país, cidade ou cômodo.',
    textVi: 'at chỉ một điểm hoặc địa điểm cụ thể (at the station), on chỉ bề mặt hoặc tầng, in chỉ không gian bên trong, quốc gia, thành phố hoặc phòng.',
    textId: 'at menandai titik atau lokasi spesifik (at the station), on menandai permukaan atau lantai, in menandai ruang di dalam, negara, kota, atau ruangan.',
    textTr: 'at belirli bir nokta ya da konumu gösterir (at the station), on yüzey ya da kat için, in iç alan, ülke, şehir veya oda için kullanılır.',
    textPl: 'at oznacza punkt albo konkretne miejsce (at the station), on powierzchnię lub piętro, a in przestrzeń wewnętrzną, kraj, miasto albo pokój.' },
  { textRU: 'in the room · on the table · at home · at work.',
    textUK: 'in Kyiv · on the bus (громадський транспорт) vs in the car — це відпрацьовуємо в уроці.',
    textES: 'Collocations fijos.',
    textPtBr: 'Pares fixos: in the room, on the table, at home, at work. Transporte e lugares públicos muitas vezes são memorizados como blocos.',
    textVi: 'Học theo cụm cố định: in the room, on the table, at home, at work. Phương tiện và địa điểm công cộng thường nên nhớ theo cụm.',
    textId: 'Hafalkan sebagai pasangan tetap: in the room, on the table, at home, at work. Transportasi dan tempat umum sering dipelajari sebagai blok.',
    textTr: 'Kalıp olarak öğren: in the room, on the table, at home, at work. Ulaşım ve kamusal yerler çoğu zaman hazır ifade olarak ezberlenir.',
    textPl: 'Ucz się stałych par: in the room, on the table, at home, at work. Transport i miejsca publiczne często warto zapamiętywać jako gotowe bloki.',
    examples: [
      { en: 'She is in the kitchen.', trRU: 'Она на кухне.', trUK: 'Вона на кухні.', trPtBr: 'Ela está na cozinha.', trVi: 'Cô ấy đang ở trong bếp.', trId: 'Dia ada di dapur.', trTr: 'O mutfakta.', trPl: 'Ona jest w kuchni.' },
      { en: 'The keys are on the desk.', trRU: 'Ключи на столе.', trUK: 'Ключі на столі.', trPtBr: 'As chaves estão sobre a mesa.', trVi: 'Chìa khóa ở trên bàn làm việc.', trId: 'Kunci-kunci ada di atas meja.', trTr: 'Anahtarlar masanın üzerinde.', trPl: 'Klucze są na biurku.' },
      { en: 'I am at school.', trRU: 'Я в школе.', trUK: 'Я в школі.', trPtBr: 'Estou na escola.', trVi: 'Tôi đang ở trường.', trId: 'Saya ada di sekolah.', trTr: 'Okuldayım.', trPl: 'Jestem w szkole.' },
    ]},
  { textRU: 'Калька «в автобусе» легко даёт ошибку: чаще on the bus, но в заданиях следуй тому, что отрабатывает урок.',
    textUK: 'Транспорт і прийменники — запам\'ятовуємо готовими парами.',
    textES: 'Fijos por lección.',
    textPtBr: 'Cuidado com traduções literais de transporte: muitas vezes é on the bus, mas in the car. Nos exercícios, siga o par que a lição treina.',
    textVi: 'Cẩn thận với dịch từng chữ về phương tiện: thường là on the bus, nhưng in the car. Trong bài tập, hãy theo đúng cặp mà bài học luyện.',
    textId: 'Hati-hati menerjemahkan transportasi secara harfiah: sering on the bus, tetapi in the car. Dalam latihan, ikuti pasangan yang sedang dilatih.',
    textTr: 'Ulaşım ifadelerini kelime kelime çevirmeye dikkat et: çoğu zaman on the bus, ama in the car. Alıştırmada dersin çalıştırdığı çifti izle.',
    textPl: 'Uważaj na dosłowne tłumaczenia przy transporcie: często jest on the bus, ale in the car. W ćwiczeniach trzymaj się pary z lekcji.' },
);

export const LESSON_20_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'a / an / the / —', titleUK: 'a / an / the / —', titleES: 'Artículos (EN)',
    titlePtBr: 'Artigos em inglês',
    titleVi: 'Mạo từ trong tiếng Anh',
    titleId: 'Artikel bahasa Inggris',
    titleTr: 'İngilizcede artikeller',
    titlePl: 'Przedimki w angielskim',
    textRU: 'a/an для впервые упомянутого счётного; the — когда ясно, о чём речь; прочерк — общеизвестные/массовые вещи без артикля.',
    textUK: 'a/an — згадка вперше; the — конкретика; нульовий артикль — узагальнення.',
    textES: 'a/an/the/∅ en inglés ≠ español.',
    textPtBr: 'a/an marca algo contável mencionado pela primeira vez; the marca algo específico ou já claro; sem artigo aparece em generalizações e nomes de massa.',
    textVi: 'a/an dùng cho danh từ đếm được được nhắc lần đầu; the dùng khi đã rõ hoặc cụ thể; không dùng mạo từ trong khái quát và danh từ khối.',
    textId: 'a/an menandai benda yang dapat dihitung saat disebut pertama kali; the menandai hal yang spesifik atau sudah jelas; tanpa artikel dipakai untuk generalisasi dan mass noun.',
    textTr: 'a/an ilk kez söylenen sayılabilir bir şey için; the belirli ya da bağlamda açık olan şey için; artikelsiz kullanım genellemelerde ve sayılamayan adlarda görülür.',
    textPl: 'a/an oznacza policzalną rzecz wspomnianą po raz pierwszy; the coś konkretnego albo już jasnego; brak przedimka pojawia się w uogólnieniach i rzeczownikach niepoliczalnych.' },
  { textRU: 'a book · an apple · the sun (исключения учим) · I like music.',
    textUK: 'an + голосна; the + унікальне в контексті.',
    textES: 'Ejemplos fijos.',
    textPtBr: 'Blocos básicos: a book, an apple, the sun, I like music. Antes de som de vogal, use an; quando o objeto já é conhecido, use the.',
    textVi: 'Các mẫu cơ bản: a book, an apple, the sun, I like music. Trước âm nguyên âm dùng an; khi vật đã xác định, dùng the.',
    textId: 'Pola dasar: a book, an apple, the sun, I like music. Sebelum bunyi vokal gunakan an; kalau benda sudah jelas, gunakan the.',
    textTr: 'Temel kalıplar: a book, an apple, the sun, I like music. Ünlü sesinden önce an; nesne biliniyorsa the kullan.',
    textPl: 'Podstawowe bloki: a book, an apple, the sun, I like music. Przed dźwiękiem samogłoskowym użyj an; gdy obiekt jest znany, użyj the.',
    examples: [
      { en: 'I have a car.', trRU: 'У меня есть машина.', trUK: 'Я маю машину.', trPtBr: 'Eu tenho um carro.', trVi: 'Tôi có một chiếc xe.', trId: 'Saya punya mobil.', trTr: 'Bir arabam var.', trPl: 'Mam samochód.' },
      { en: 'Close the window.', trRU: 'Закрой окно (мы знаем, какое).', trUK: 'Зачини вікно.', trPtBr: 'Feche a janela.', trVi: 'Đóng cửa sổ lại.', trId: 'Tutup jendelanya.', trTr: 'Pencereyi kapat.', trPl: 'Zamknij okno.' },
      { en: 'Water is important.', trRU: 'Вода важна.', trUK: 'Вода важлива.', trPtBr: 'A água é importante.', trVi: 'Nước rất quan trọng.', trId: 'Air itu penting.', trTr: 'Su önemlidir.', trPl: 'Woda jest ważna.' },
    ]},
  { textRU: 'Не вешай the на каждое существительное «как в родном языке».',
    textUK: 'Не став the «за звичкою».',
    textES: 'No calques artículos.',
    textPtBr: 'Não coloque the antes de todo substantivo por hábito. Em inglês, o artigo depende de ser específico, novo ou geral.',
    textVi: 'Đừng đặt the trước mọi danh từ theo thói quen. Trong tiếng Anh, mạo từ phụ thuộc vào việc danh từ cụ thể, mới nhắc hay mang nghĩa chung.',
    textId: 'Jangan menaruh the di depan semua nomina karena kebiasaan. Dalam bahasa Inggris, artikel bergantung pada apakah benda itu spesifik, baru disebut, atau umum.',
    textTr: 'Alışkanlıkla her ismin önüne the koyma. İngilizcede artikel, şeyin belirli, yeni ya da genel olmasına bağlıdır.',
    textPl: 'Nie dodawaj the przed każdym rzeczownikiem z przyzwyczajenia. W angielskim przedimek zależy od tego, czy rzecz jest konkretna, nowa czy ogólna.' },
);

export const LESSON_21_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'some / any / every…', titleUK: 'some / any / every…', titleES: 'Indefinidos (EN)',
    titlePtBr: 'Pronomes indefinidos em inglês',
    titleVi: 'Đại từ bất định trong tiếng Anh',
    titleId: 'Kata ganti tak tentu bahasa Inggris',
    titleTr: 'İngilizcede belirsiz zamirler',
    titlePl: 'Zaimki nieokreślone w angielskim',
    textRU: 'some в утверждениях (I have some time), any в отрицаниях и вопросах, every/all целиком.',
    textUK: 'some/any/every/no — узгоджуй з типом речення.',
    textES: 'Patrones EN con some/any.',
    textPtBr: 'some costuma aparecer em afirmações, any em perguntas e negativas, every/all falam do grupo inteiro, e no-/nobody/nothing marcam ausência.',
    textVi: 'some thường dùng trong câu khẳng định, any trong câu hỏi và phủ định, every/all nói về toàn bộ nhóm, còn no-/nobody/nothing chỉ sự vắng mặt.',
    textId: 'some biasanya muncul dalam pernyataan, any dalam pertanyaan dan negasi, every/all membicarakan seluruh kelompok, dan no-/nobody/nothing menandai ketiadaan.',
    textTr: 'some genellikle olumlu cümlelerde, any soru ve olumsuzlarda, every/all tüm grupta; no-/nobody/nothing ise yokluğu gösterir.',
    textPl: 'some zwykle pojawia się w zdaniach twierdzących, any w pytaniach i przeczeniach, every/all mówi o całej grupie, a no-/nobody/nothing oznacza brak.' },
  { textRU: 'someone · anything · nowhere · everybody.',
    textUK: 'anything у питанні; nothing у негативі.',
    textES: '-one / -thing / -where.',
    textPtBr: 'Observe as terminações: someone para pessoa, something para coisa, somewhere para lugar. anything aparece muito em perguntas e negativas.',
    textVi: 'Nhìn phần đuôi: someone cho người, something cho vật, somewhere cho nơi chốn. anything thường gặp trong câu hỏi và phủ định.',
    textId: 'Perhatikan akhirannya: someone untuk orang, something untuk benda, somewhere untuk tempat. anything sering muncul dalam pertanyaan dan negasi.',
    textTr: 'Sonlara dikkat et: someone kişi, something şey, somewhere yer için. anything soru ve olumsuzlarda çok kullanılır.',
    textPl: 'Patrz na końcówki: someone dla osoby, something dla rzeczy, somewhere dla miejsca. anything często występuje w pytaniach i przeczeniach.',
    examples: [
      { en: 'I need some help.', trRU: 'Нужна помощь.', trUK: 'Потрібна допомога.', trPtBr: 'Preciso de ajuda.', trVi: 'Tôi cần chút giúp đỡ.', trId: 'Saya butuh bantuan.', trTr: 'Biraz yardıma ihtiyacım var.', trPl: 'Potrzebuję pomocy.' },
      { en: 'Do you have any questions?', trRU: 'Есть вопросы?', trUK: 'Є питання?', trPtBr: 'Você tem alguma pergunta?', trVi: 'Bạn có câu hỏi nào không?', trId: 'Apakah kamu punya pertanyaan?', trTr: 'Herhangi bir sorun var mı?', trPl: 'Czy masz jakieś pytania?' },
      { en: 'Nobody came.', trRU: 'Никто не пришёл.', trUK: 'Ніхто не прийшов.', trPtBr: 'Ninguém veio.', trVi: 'Không ai đến.', trId: 'Tidak ada yang datang.', trTr: 'Kimse gelmedi.', trPl: 'Nikt nie przyszedł.' },
    ]},
  { textRU: 'Двойное отрицание по-английски не как в русском — не *I don\'t know nothing*.',
    textUK: 'В англійській не переносимо подвійне заперечення з української чи російської: не *I don\'t know nothing*.',
    textES: 'Sin doble negación estilo ruso.',
    textPtBr: 'Não copie a dupla negação do russo/ucraniano para o inglês: use uma estrutura negativa clara, como I don\'t know anything ou I know nothing.',
    textVi: 'Đừng sao chép phủ định kép từ tiếng Nga/Ukraine sang tiếng Anh: dùng một cấu trúc phủ định rõ, như I don\'t know anything hoặc I know nothing.',
    textId: 'Jangan menyalin negasi ganda dari Rusia/Ukraina ke bahasa Inggris: pakai satu struktur negatif yang jelas, seperti I don\'t know anything atau I know nothing.',
    textTr: 'Rusça/Ukraynacadan çift olumsuzluğu İngilizceye kopyalama: I don\'t know anything ya da I know nothing gibi net bir olumsuz yapı kullan.',
    textPl: 'Nie kopiuj podwójnego przeczenia z rosyjskiego/ukraińskiego do angielskiego: użyj jednej jasnej konstrukcji, np. I don\'t know anything albo I know nothing.' },
);

export const LESSON_22_INTRO_EXTRA: LessonIntroScreen[] = bundle(
  { titleRU: 'Герундий -ing', titleUK: 'Герундій -ing', titleES: 'Gerundio -ing',
    titlePtBr: 'Gerúndio -ing',
    titleVi: 'Danh động từ -ing',
    titleId: 'Gerund -ing',
    titleTr: 'Gerund -ing',
    titlePl: 'Gerund -ing',
    textRU: 'Форма глагола + ing как существительное по смыслу: Swimming is fun. После love/enjoy/hate часто -ing.',
    textUK: '-ing як іменник дії; після деяких дієслів — обов\'язково вивчаємо списком.',
    textES: '-ing como sustantivo verbal.',
    textPtBr: 'A forma verbo + -ing pode funcionar como uma ideia de ação: Swimming is fun. Depois de love, enjoy e hate, muitas vezes vem -ing.',
    textVi: 'Dạng động từ + -ing có thể hoạt động như một ý hành động: Swimming is fun. Sau love, enjoy và hate thường dùng -ing.',
    textId: 'Bentuk kata kerja + -ing bisa berfungsi sebagai ide tindakan: Swimming is fun. Setelah love, enjoy, dan hate sering muncul -ing.',
    textTr: 'Fiil + -ing biçimi bir eylem fikri gibi çalışabilir: Swimming is fun. love, enjoy ve hate sonrasında çoğu zaman -ing gelir.',
    textPl: 'Forma czasownik + -ing może działać jak nazwa czynności: Swimming is fun. Po love, enjoy i hate często pojawia się -ing.' },
  { textRU: 'I enjoy reading. Stop typing. He keeps talking.',
    textUK: 'go + -ing про заняття: go swimming.',
    textES: 'enjoy + -ing.',
    textPtBr: 'Padrões prontos: I enjoy reading. Stop typing. He keeps talking. Também: go + -ing para atividades, como go swimming.',
    textVi: 'Các mẫu cố định: I enjoy reading. Stop typing. He keeps talking. Ngoài ra: go + -ing cho hoạt động, như go swimming.',
    textId: 'Pola siap pakai: I enjoy reading. Stop typing. He keeps talking. Juga: go + -ing untuk aktivitas, seperti go swimming.',
    textTr: 'Hazır kalıplar: I enjoy reading. Stop typing. He keeps talking. Ayrıca etkinlikler için go + -ing: go swimming.',
    textPl: 'Gotowe wzorce: I enjoy reading. Stop typing. He keeps talking. Także go + -ing dla aktywności, np. go swimming.',
    examples: [
      { en: 'She likes dancing.', trRU: 'Любит танцевать.', trUK: 'Любить танцювати.', trPtBr: 'Ela gosta de dançar.', trVi: 'Cô ấy thích nhảy.', trId: 'Dia suka menari.', trTr: 'Dans etmeyi seviyor.', trPl: 'Ona lubi tańczyć.' },
      { en: 'Running is healthy.', trRU: 'Бег полезен.', trUK: 'Біг корисний.', trPtBr: 'Correr é saudável.', trVi: 'Chạy bộ tốt cho sức khỏe.', trId: 'Berlari itu sehat.', trTr: 'Koşmak sağlıklıdır.', trPl: 'Bieganie jest zdrowe.' },
      { en: 'I am good at painting.', trRU: 'Хорошо рисую.', trUK: 'Добре малюю.', trPtBr: 'Eu sou bom em pintar.', trVi: 'Tôi giỏi vẽ tranh.', trId: 'Saya pandai melukis.', trTr: 'Resim yapmakta iyiyim.', trPl: 'Jestem dobry w malowaniu.' },
    ]},
  { textRU: 'Не путай герундий с формой Present Continuous без контекста — I swim vs I am swimming разные смыслы.',
    textUK: 'Simple vs Continuous — різні ситуації.',
    textES: 'No mezcles tiempos.',
    textPtBr: 'Não confunda o gerúndio como ideia de ação com Present Continuous. I swim e I am swimming falam de situações diferentes.',
    textVi: 'Đừng nhầm danh động từ như ý hành động với Present Continuous. I swim và I am swimming nói về hai tình huống khác nhau.',
    textId: 'Jangan samakan gerund sebagai ide tindakan dengan Present Continuous. I swim dan I am swimming membicarakan situasi berbeda.',
    textTr: 'Eylem fikri olarak gerund ile Present Continuous\'ı karıştırma. I swim ve I am swimming farklı durumları anlatır.',
    textPl: 'Nie myl gerundu jako nazwy czynności z Present Continuous. I swim i I am swimming opisują różne sytuacje.' },
);

export const LESSON_23_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 23,
    screenId: 'lesson_23_intro_1_passive_core',
    order: 1,
    kind: 'concept',
    titleRU: 'Когда важно не "кто сделал", а "что сделано"',
    titleUK: 'Коли важливо не "хто зробив", а "що зроблено"',
    titleES: 'When the result matters more than who did it',
    titlePtBr: 'Quando importa mais "o que foi feito"',
    titleVi: 'Khi điều quan trọng là "việc gì đã được làm"',
    titleId: 'Saat yang penting adalah "apa yang dilakukan"',
    titleTr: '"Kim yaptı" değil, "ne yapıldı" önemli olduğunda',
    titlePl: 'Gdy ważniejsze jest "co zrobiono"',
    subtitleRU: 'Passive Voice ставит предмет в начало: комнату убирают, документы проверяются, билеты продаются.',
    subtitleUK: 'Passive Voice ставить предмет на початок: кімнату прибирають, документи перевіряються, квитки продаються.',
    subtitleES: 'Passive Voice puts the thing first: the room is cleaned, documents are checked, tickets are sold.',
    subtitlePtBr: 'A Passive Voice coloca a coisa no início: o quarto é limpo, os documentos são verificados, os ingressos são vendidos.',
    subtitleVi: 'Passive Voice đưa sự vật lên đầu: căn phòng được dọn, tài liệu được kiểm tra, vé được bán.',
    subtitleId: 'Passive Voice menaruh benda di awal: ruangan dibersihkan, dokumen diperiksa, tiket dijual.',
    subtitleTr: 'Passive Voice nesneyi başa getirir: oda temizlenir, belgeler kontrol edilir, biletler satılır.',
    subtitlePl: 'Passive Voice stawia rzecz na początku: pokój jest sprzątany, dokumenty są sprawdzane, bilety są sprzedawane.',
    linesRU: [
      { type: 'text', parts: [{ text: 'Обычная фраза говорит, ' }, { text: 'кто делает действие', tone: 'strong' }, { text: '.' }] },
      { type: 'text', parts: [{ text: 'Пассив говорит, ' }, { text: 'что происходит с предметом', tone: 'strong' }, { text: ': комнату убирают, документы проверяются, билеты продаются.' }] },
      { type: 'formula', parts: [{ text: 'предмет', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
      { type: 'correct', parts: [{ text: 'The tickets ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' sold', tone: 'warning' }, { text: ' online' }] },
      { type: 'correct', parts: [{ text: 'The food ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cooked', tone: 'warning' }, { text: ' here' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'Главная проверка: ', tone: 'strong' }, { text: 'один предмет -> is, много предметов -> are. После этого нужна третья форма: cleaned, checked, sold, made.' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The room cleans every day', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
    ],
    linesUK: [
      { type: 'text', parts: [{ text: 'Звичайна фраза говорить, ' }, { text: 'хто робить дію', tone: 'strong' }, { text: '.' }] },
      { type: 'text', parts: [{ text: 'Пасив говорить, ' }, { text: 'що відбувається з предметом', tone: 'strong' }, { text: ': кімнату прибирають, документи перевіряються, квитки продаються.' }] },
      { type: 'formula', parts: [{ text: 'предмет', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
      { type: 'correct', parts: [{ text: 'The tickets ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' sold', tone: 'warning' }, { text: ' online' }] },
    ],
    linesES: [
      { type: 'text', parts: [{ text: 'Passive Voice says what happens to the thing, not who does it.' }] },
      { type: 'formula', parts: [{ text: 'thing', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
    ],
    linesPtBr: [
      { type: 'text', parts: [{ text: 'A voz passiva mostra ' }, { text: 'o que acontece com a coisa', tone: 'strong' }, { text: ', não quem faz a ação.' }] },
      { type: 'formula', parts: [{ text: 'coisa', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
      { type: 'tip', parts: [{ text: 'Cheque principal: ', tone: 'strong' }, { text: 'uma coisa -> is; várias coisas -> are. Depois vem a terceira forma: cleaned, checked, sold, made.' }] },
    ],
    linesVi: [
      { type: 'text', parts: [{ text: 'Câu bị động nói ' }, { text: 'điều gì xảy ra với sự vật', tone: 'strong' }, { text: ', không nhấn vào người làm hành động.' }] },
      { type: 'formula', parts: [{ text: 'sự vật', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
      { type: 'tip', parts: [{ text: 'Cách kiểm tra chính: ', tone: 'strong' }, { text: 'một sự vật -> is; nhiều sự vật -> are. Sau đó cần dạng V3: cleaned, checked, sold, made.' }] },
    ],
    linesId: [
      { type: 'text', parts: [{ text: 'Kalimat pasif menunjukkan ' }, { text: 'apa yang terjadi pada benda', tone: 'strong' }, { text: ', bukan siapa yang melakukannya.' }] },
      { type: 'formula', parts: [{ text: 'benda', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
      { type: 'tip', parts: [{ text: 'Cek utama: ', tone: 'strong' }, { text: 'satu benda -> is; banyak benda -> are. Setelah itu perlu bentuk ketiga: cleaned, checked, sold, made.' }] },
    ],
    linesTr: [
      { type: 'text', parts: [{ text: 'Edilgen yapı ' }, { text: 'nesneye ne olduğunu', tone: 'strong' }, { text: ' söyler; eylemi kimin yaptığına odaklanmaz.' }] },
      { type: 'formula', parts: [{ text: 'nesne', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
      { type: 'tip', parts: [{ text: 'Ana kontrol: ', tone: 'strong' }, { text: 'tek nesne -> is; çoğul nesne -> are. Sonra üçüncü fiil biçimi gerekir: cleaned, checked, sold, made.' }] },
    ],
    linesPl: [
      { type: 'text', parts: [{ text: 'Strona bierna mówi, ' }, { text: 'co dzieje się z rzeczą', tone: 'strong' }, { text: ', a nie kto wykonuje czynność.' }] },
      { type: 'formula', parts: [{ text: 'rzecz', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'is / are', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' cleaned', tone: 'warning' }, { text: ' every day' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' checked', tone: 'warning' }, { text: ' every morning' }] },
      { type: 'tip', parts: [{ text: 'Główna kontrola: ', tone: 'strong' }, { text: 'jedna rzecz -> is; wiele rzeczy -> are. Potem potrzebna jest trzecia forma: cleaned, checked, sold, made.' }] },
    ],
  },
  {
    lessonId: 23,
    screenId: 'lesson_23_intro_2_questions_negatives',
    order: 2,
    kind: 'formula',
    titleRU: 'Вопросы и отрицания в пассиве',
    titleUK: 'Питання і заперечення в пасиві',
    titleES: 'Questions and negatives in passive',
    titlePtBr: 'Perguntas e negativas na voz passiva',
    titleVi: 'Câu hỏi và phủ định trong câu bị động',
    titleId: 'Pertanyaan dan negasi dalam pasif',
    titleTr: 'Edilgende sorular ve olumsuzlar',
    titlePl: 'Pytania i przeczenia w stronie biernej',
    subtitleRU: 'В вопросе is / are выходит вперёд. В отрицании not ставится после is / are.',
    subtitleUK: 'У питанні is / are виходить уперед. У запереченні not стоїть після is / are.',
    subtitleES: 'In questions, is / are moves forward. In negatives, not comes after is / are.',
    subtitlePtBr: 'Na pergunta, is / are vai para o início. Na negativa, not fica depois de is / are.',
    subtitleVi: 'Trong câu hỏi, is / are đứng lên trước. Trong câu phủ định, not đứng sau is / are.',
    subtitleId: 'Dalam pertanyaan, is / are pindah ke depan. Dalam negasi, not diletakkan setelah is / are.',
    subtitleTr: 'Soruda is / are başa gelir. Olumsuzda not, is / are sonrasında yer alır.',
    subtitlePl: 'W pytaniu is / are idzie na początek. W przeczeniu not stoi po is / are.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + предмет + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'correct', parts: [{ text: 'Are', tone: 'accent' }, { text: ' the documents ', tone: 'strong' }, { text: 'checked', tone: 'warning' }, { text: ' every morning?' }] },
      { type: 'correct', parts: [{ text: 'Are', tone: 'accent' }, { text: ' the tickets ', tone: 'strong' }, { text: 'sold', tone: 'warning' }, { text: ' online?' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the food ', tone: 'strong' }, { text: 'cooked', tone: 'warning' }, { text: ' here?' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the app ', tone: 'strong' }, { text: 'used', tone: 'warning' }, { text: ' by many people?' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'предмет + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' cleaned every day', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' checked here', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The tickets ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' sold online', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The room is clean every day?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The documents not are checked here', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' not checked here', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + предмет + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'correct', parts: [{ text: 'Are', tone: 'accent' }, { text: ' the documents ', tone: 'strong' }, { text: 'checked', tone: 'warning' }, { text: ' every morning?' }] },
      { type: 'formula', parts: [{ text: 'предмет + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' not cleaned every day', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + thing + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'formula', parts: [{ text: 'thing + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + coisa + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'formula', parts: [{ text: 'coisa + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' not checked here', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'The documents not are checked here', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + sự vật + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'formula', parts: [{ text: 'sự vật + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' not checked here', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'The documents not are checked here', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + benda + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'formula', parts: [{ text: 'benda + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' not checked here', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Bukan: ', tone: 'warning' }, { text: 'The documents not are checked here', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + nesne + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'formula', parts: [{ text: 'nesne + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' not checked here', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'The documents not are checked here', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'Is / Are', tone: 'accent' }, { text: ' + rzecz + ', tone: 'formula' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Is', tone: 'accent' }, { text: ' the room ', tone: 'strong' }, { text: 'cleaned', tone: 'warning' }, { text: ' every day?' }] },
      { type: 'formula', parts: [{ text: 'rzecz + is / are + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' not checked here', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'The documents not are checked here', tone: 'danger' }] },
    ],
  },
  {
    lessonId: 23,
    screenId: 'lesson_23_intro_3_people_modals',
    order: 3,
    kind: 'formula',
    titleRU: 'Когда "меня приглашают" и "должно быть подписано"',
    titleUK: 'Коли "мене запрошують" і "має бути підписано"',
    titleES: 'When "I am invited" and "must be signed"',
    titlePtBr: 'Quando é "I am invited" e "must be signed"',
    titleVi: 'Khi là "I am invited" và "must be signed"',
    titleId: 'Saat menjadi "I am invited" dan "must be signed"',
    titleTr: '"I am invited" ve "must be signed" olduğunda',
    titlePl: 'Gdy jest "I am invited" i "must be signed"',
    subtitleRU: 'Пассив может начинаться не только с предмета, но и с человека. А после must / can появляется be + V3.',
    subtitleUK: 'Пасив може починатися не лише з предмета, а й з людини. А після must / can з\'являється be + V3.',
    subtitleES: 'Passive can start with a person too. After must / can, use be + V3.',
    subtitlePtBr: 'A passiva também pode começar com uma pessoa. Depois de must / can, use be + V3.',
    subtitleVi: 'Câu bị động cũng có thể bắt đầu bằng người. Sau must / can, dùng be + V3.',
    subtitleId: 'Pasif juga bisa dimulai dengan orang. Setelah must / can, gunakan be + V3.',
    subtitleTr: 'Edilgen yapı kişiyle de başlayabilir. must / can sonrasında be + V3 kullanılır.',
    subtitlePl: 'Strona bierna może też zaczynać się od osoby. Po must / can użyj be + V3.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'человек + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'You ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' invited too', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' called every day', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' helped here', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' asked many questions', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' invited every week', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This document ', tone: 'strong' }, { text: 'must', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This problem ', tone: 'strong' }, { text: 'can', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' solved', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'This document must signed today', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'This document must ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'людина + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'are', tone: 'accent' }, { text: ' asked many questions', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This document ', tone: 'strong' }, { text: 'must', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'person + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'pessoa + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This document ', tone: 'strong' }, { text: 'must', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'This document must signed today', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'người + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This document ', tone: 'strong' }, { text: 'must', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'This document must signed today', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'orang + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This document ', tone: 'strong' }, { text: 'must', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Bukan: ', tone: 'warning' }, { text: 'This document must signed today', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'kişi + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This document ', tone: 'strong' }, { text: 'must', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'This document must signed today', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'osoba + am / is / are + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'am', tone: 'accent' }, { text: ' invited often', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'must / can', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'be', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'This document ', tone: 'strong' }, { text: 'must', tone: 'accent' }, { text: ' ' }, { text: 'be', tone: 'danger' }, { text: ' signed today', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'This document must signed today', tone: 'danger' }] },
    ],
  },
  {
    lessonId: 23,
    screenId: 'lesson_23_intro_4_being_were_practice',
    order: 4,
    kind: 'practice',
    titleRU: 'Сейчас убирается и было проверено',
    titleUK: 'Зараз прибирається і було перевірено',
    titleES: 'Is being cleaned and was checked',
    titlePtBr: 'Is being cleaned e was checked',
    titleVi: 'Is being cleaned và was checked',
    titleId: 'Is being cleaned dan was checked',
    titleTr: 'Is being cleaned ve was checked',
    titlePl: 'Is being cleaned oraz was checked',
    subtitleRU: 'В конце урока появляются две дополнительные формы: is being cleaned и were checked.',
    subtitleUK: 'Наприкінці уроку з\'являються дві додаткові форми: is being cleaned і were checked.',
    subtitleES: 'At the end of the lesson, two extra forms appear: is being cleaned and were checked.',
    subtitlePtBr: 'No fim da lição aparecem duas formas extras: is being cleaned e were checked.',
    subtitleVi: 'Cuối bài có thêm hai dạng: is being cleaned và were checked.',
    subtitleId: 'Di akhir pelajaran ada dua bentuk tambahan: is being cleaned dan were checked.',
    subtitleTr: 'Dersin sonunda iki ek biçim gelir: is being cleaned ve were checked.',
    subtitlePl: 'Na końcu lekcji pojawiają się dwie dodatkowe formy: is being cleaned i were checked.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'предмет + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = прямо сейчас что-то делается с предметом', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'предмет + was / were + ', tone: 'accent' }, { text: 'V3', tone: 'warning' }, { text: ' = было сделано в прошлом', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'step', parts: [{ text: '1. Сейчас происходит процесс? ', tone: 'muted' }, { text: 'is being cleaned', tone: 'danger' }] },
      { type: 'step', parts: [{ text: '2. Уже было сделано вчера? ', tone: 'muted' }, { text: 'were checked yesterday', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Must / can перед пассивом? ', tone: 'muted' }, { text: 'must be signed / can be solved', tone: 'danger' }] },
      { type: 'step', parts: [{ text: '4. Обычный пассив сейчас/вообще? ', tone: 'muted' }, { text: 'is cleaned / are checked', tone: 'accent' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The room is cleaning now', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'The documents are checked yesterday', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Главный навык урока: ', tone: 'strong' }, { text: 'сначала понять время и тип пассива, потом выбрать is / are / being / was / were / be.' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'предмет + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = над предметом прямо зараз виконують дію', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'предмет + was / were + ', tone: 'accent' }, { text: 'V3', tone: 'warning' }, { text: ' = було зроблено в минулому', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'thing + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = being done now', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'coisa + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = algo está sendo feito agora', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'coisa + was / were + ', tone: 'accent' }, { text: 'V3', tone: 'warning' }, { text: ' = foi feito no passado', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Habilidade principal: ', tone: 'strong' }, { text: 'entenda o tempo e o tipo de passiva antes de escolher is / are / being / was / were / be.' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'sự vật + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = đang được làm ngay lúc này', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'sự vật + was / were + ', tone: 'accent' }, { text: 'V3', tone: 'warning' }, { text: ' = đã được làm trong quá khứ', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Kỹ năng chính: ', tone: 'strong' }, { text: 'trước hết xác định thời và kiểu bị động, rồi chọn is / are / being / was / were / be.' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'benda + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = sedang dilakukan sekarang', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'benda + was / were + ', tone: 'accent' }, { text: 'V3', tone: 'warning' }, { text: ' = dilakukan di masa lalu', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Keterampilan utama: ', tone: 'strong' }, { text: 'pahami waktu dan jenis pasif dulu, lalu pilih is / are / being / was / were / be.' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'nesne + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = şu anda nesneye bir şey yapılıyor', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'nesne + was / were + ', tone: 'accent' }, { text: 'V3', tone: 'warning' }, { text: ' = geçmişte yapıldı', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Ana beceri: ', tone: 'strong' }, { text: 'önce zamanı ve edilgen türünü anla, sonra is / are / being / was / were / be seç.' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'rzecz + is / are + ', tone: 'formula' }, { text: 'being', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = coś jest robione teraz', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The room ', tone: 'strong' }, { text: 'is', tone: 'accent' }, { text: ' ' }, { text: 'being', tone: 'danger' }, { text: ' cleaned now', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'rzecz + was / were + ', tone: 'accent' }, { text: 'V3', tone: 'warning' }, { text: ' = zostało zrobione w przeszłości', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'The documents ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checked yesterday', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Główna umiejętność: ', tone: 'strong' }, { text: 'najpierw rozpoznaj czas i typ strony biernej, potem wybierz is / are / being / was / were / be.' }] },
    ],
  },
];

export const LESSON_24_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 24,
    screenId: 'lesson_24_intro_1_present_perfect_core',
    order: 1,
    kind: 'concept',
    titleRU: 'Результат уже есть сейчас',
    titleUK: 'Результат уже є зараз',
    titleES: 'The result exists now',
    titlePtBr: 'O resultado já existe agora',
    titleVi: 'Kết quả đã có ở hiện tại',
    titleId: 'Hasilnya sudah ada sekarang',
    titleTr: 'Sonuç şu anda zaten var',
    titlePl: 'Rezultat istnieje już teraz',
    subtitleRU: 'Present Perfect связывает действие с настоящим: только что сделал, уже сделал, ещё не сделал.',
    subtitleUK: 'Present Perfect пов\'язує дію з теперішнім: щойно зробив, уже зробив, ще не зробив.',
    subtitleES: 'Present Perfect connects the action with now: just done, already done, not done yet.',
    subtitlePtBr: 'Present Perfect liga a ação ao presente: acabou de fazer, já fez, ainda não fez.',
    subtitleVi: 'Present Perfect nối hành động với hiện tại: vừa làm, đã làm, chưa làm.',
    subtitleId: 'Present Perfect menghubungkan tindakan dengan sekarang: baru saja, sudah, atau belum dilakukan.',
    subtitleTr: 'Present Perfect eylemi şimdiyle bağlar: az önce yaptı, zaten yaptı, henüz yapmadı.',
    subtitlePl: 'Present Perfect łączy czynność z teraźniejszością: właśnie zrobione, już zrobione, jeszcze niezrobione.',
    linesRU: [
      { type: 'text', parts: [{ text: 'В Past Simple ты говорил просто о прошлом: ' }, { text: 'I finished yesterday', tone: 'strong' }, { text: '.' }] },
      { type: 'text', parts: [{ text: 'В этом уроке фокус другой: действие уже связано с настоящим результатом.' }] },
      { type: 'formula', parts: [{ text: 'кто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'found', tone: 'warning' }, { text: ' the keys' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'arrived', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'Главная проверка: ', tone: 'strong' }, { text: 'I / you / we / they -> have. He / she / it -> has. После этого нужна третья форма.' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'She have just called me', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I have just finish work', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
    ],
    linesUK: [
      { type: 'text', parts: [{ text: 'У цьому уроці дія пов\'язана з результатом зараз:' }] },
      { type: 'formula', parts: [{ text: 'хто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
    ],
    linesES: [
      { type: 'text', parts: [{ text: 'Present Perfect connects the action with the result now:' }] },
      { type: 'formula', parts: [{ text: 'who', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
    ],
    linesPtBr: [
      { type: 'text', parts: [{ text: 'Present Perfect liga a ação ao resultado agora:' }] },
      { type: 'formula', parts: [{ text: 'quem', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
      { type: 'tip', parts: [{ text: 'Cheque principal: ', tone: 'strong' }, { text: 'I / you / we / they -> have. He / she / it -> has. Depois vem V3.' }] },
    ],
    linesVi: [
      { type: 'text', parts: [{ text: 'Present Perfect nối hành động với kết quả ở hiện tại:' }] },
      { type: 'formula', parts: [{ text: 'ai', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
      { type: 'tip', parts: [{ text: 'Cách kiểm tra chính: ', tone: 'strong' }, { text: 'I / you / we / they -> have. He / she / it -> has. Sau đó cần V3.' }] },
    ],
    linesId: [
      { type: 'text', parts: [{ text: 'Present Perfect menghubungkan tindakan dengan hasil sekarang:' }] },
      { type: 'formula', parts: [{ text: 'siapa', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
      { type: 'tip', parts: [{ text: 'Cek utama: ', tone: 'strong' }, { text: 'I / you / we / they -> have. He / she / it -> has. Setelah itu perlu V3.' }] },
    ],
    linesTr: [
      { type: 'text', parts: [{ text: 'Present Perfect eylemi şu anki sonuçla bağlar:' }] },
      { type: 'formula', parts: [{ text: 'kim', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
      { type: 'tip', parts: [{ text: 'Ana kontrol: ', tone: 'strong' }, { text: 'I / you / we / they -> have. He / she / it -> has. Sonra V3 gerekir.' }] },
    ],
    linesPl: [
      { type: 'text', parts: [{ text: 'Present Perfect łączy czynność z obecnym rezultatem:' }] },
      { type: 'formula', parts: [{ text: 'kto', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'finished', tone: 'warning' }, { text: ' work' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'called', tone: 'warning' }, { text: ' me' }] },
      { type: 'tip', parts: [{ text: 'Główna kontrola: ', tone: 'strong' }, { text: 'I / you / we / they -> have. He / she / it -> has. Potem potrzebne jest V3.' }] },
    ],
    examples: [
      { labelRU: 'just', labelUK: 'just', labelES: 'just', en: [{ text: 'He ', tone: 'strong' }, { text: 'has', tone: 'accent' }, { text: ' just ' }, { text: 'opened', tone: 'warning' }, { text: ' the door' }], ru: 'Он только что открыл дверь', uk: 'Він щойно відчинив двері', es: 'Acaba de abrir la puerta',
      'pt-BR': 'Ele acabou de abrir a porta',
      vi: 'Anh ấy vừa mở cửa',
      id: 'Dia baru saja membuka pintu',
      tr: 'Kapıyı az önce açtı',
      pl: 'Właśnie otworzył drzwi', labelPtBr: 'just', labelVi: 'just', labelId: 'just', labelTr: 'just', labelPl: 'just', noteRU: 'He требует has, а opened здесь третья форма.', noteUK: 'He вимагає has, а opened тут третя форма.', noteES: 'Use has with he, and opened is V3 here.', notePtBr: 'Use has com he; opened aqui é V3.', noteVi: 'Dùng has với he; opened ở đây là V3.', noteId: 'Gunakan has dengan he; opened di sini adalah V3.', noteTr: 'He ile has kullanılır; opened burada V3 biçimidir.', notePl: 'Z he użyj has; opened jest tutaj formą V3.' },
      { labelRU: 'just', labelUK: 'just', labelES: 'just', en: [{ text: 'They ', tone: 'strong' }, { text: 'have', tone: 'accent' }, { text: ' just ' }, { text: 'sent', tone: 'warning' }, { text: ' documents' }], ru: 'Они только что отправили документы', uk: 'Вони щойно надіслали документи', es: 'Acaban de enviar los documentos',
      'pt-BR': 'Eles acabaram de enviar os documentos',
      vi: 'Họ vừa gửi tài liệu',
      id: 'Mereka baru saja mengirim dokumen',
      tr: 'Belgeleri az önce gönderdiler',
      pl: 'Właśnie wysłali dokumenty', labelPtBr: 'just', labelVi: 'just', labelId: 'just', labelTr: 'just', labelPl: 'just', noteRU: 'They требует have, а sent - третья форма.', noteUK: 'They вимагає have, а sent - третя форма.', noteES: 'Use have with they, and sent is V3.', notePtBr: 'Use have com they; sent é V3.', noteVi: 'Dùng have với they; sent là V3.', noteId: 'Gunakan have dengan they; sent adalah V3.', noteTr: 'They ile have kullanılır; sent V3 biçimidir.', notePl: 'Z they użyj have; sent jest formą V3.' },
    ],
    developerNotes: {
      screenGoal: 'Экран вводит базовую формулу Present Perfect: have/has + V3. Главные ошибки - She have и have + обычная форма вместо V3.',
      visualPriority: ['have / has выделять accent.', 'V3 выделять warning.', 'subject выделять strong.', 'ошибки выделять danger.'],
      highlightRules: ['subject = strong.', 'have/has = accent.', 'V3 = warning.', 'wrong example = danger.'],
      forbiddenContent: ['Не добавлять Past Simple с yesterday как правильный пример Present Perfect.', 'Не добавлять Present Perfect Continuous.', 'Не использовать фразы вне урока 24.'],
      layoutRules: ['Один экран - только базовая формула и just.', 'Если экран узкий, оставить I have just finished, She has just called, We have just found.'],
    },
  },
  {
    lessonId: 24,
    screenId: 'lesson_24_intro_2_just_already_yet',
    order: 2,
    kind: 'formula',
    titleRU: 'just / already / yet',
    titleUK: 'just / already / yet',
    titleES: 'just / already / yet',
    titlePtBr: 'just / already / yet',
    titleVi: 'just / already / yet',
    titleId: 'just / already / yet',
    titleTr: 'just / already / yet',
    titlePl: 'just / already / yet',
    subtitleRU: 'Эти слова показывают, как действие связано с моментом сейчас.',
    subtitleUK: 'Ці слова показують, як дія пов\'язана з моментом зараз.',
    subtitleES: 'These words show how the action connects to now.',
    subtitlePtBr: 'Estas palavras mostram como a ação se conecta ao momento atual.',
    subtitleVi: 'Những từ này cho thấy hành động liên hệ với thời điểm hiện tại như thế nào.',
    subtitleId: 'Kata-kata ini menunjukkan bagaimana tindakan terhubung dengan momen sekarang.',
    subtitleTr: 'Bu kelimeler eylemin şu anla nasıl bağlantılı olduğunu gösterir.',
    subtitlePl: 'Te słowa pokazują, jak czynność łączy się z obecną chwilą.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = только что', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'just', tone: 'accent' }, { text: ' checked messages', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'just', tone: 'accent' }, { text: ' cooked dinner', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'just', tone: 'accent' }, { text: ' cleaned the room', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = уже', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'already', tone: 'accent' }, { text: ' paid', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He has ' }, { text: 'already', tone: 'accent' }, { text: ' sent the email', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'already', tone: 'accent' }, { text: ' bought tickets', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'already', tone: 'accent' }, { text: ' discussed the problem', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = ещё не', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'not', tone: 'danger' }, { text: ' finished ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'not', tone: 'danger' }, { text: ' called ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'They have ' }, { text: 'not', tone: 'danger' }, { text: ' arrived ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I have yet not finished', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'I have ' }, { text: 'not', tone: 'danger' }, { text: ' finished ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = щойно', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'just', tone: 'accent' }, { text: ' checked messages', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = уже', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'already', tone: 'accent' }, { text: ' paid', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = ще не', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'not', tone: 'danger' }, { text: ' finished ', tone: 'warning' }, { text: 'yet', tone: 'danger' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = just now', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = already', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = not yet', tone: 'formula' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = acabou de acontecer', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = já', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = ainda não', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'I have yet not finished', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = vừa mới', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = đã rồi', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = chưa', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'I have yet not finished', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = baru saja', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = sudah', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = belum', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Bukan: ', tone: 'warning' }, { text: 'I have yet not finished', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = az önce', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = zaten / çoktan', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = henüz değil', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'I have yet not finished', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'just', tone: 'accent' }, { text: ' = właśnie / dopiero co', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'already', tone: 'accent' }, { text: ' = już', tone: 'formula' }] },
      { type: 'formula', parts: [{ text: 'not + V3 + ', tone: 'formula' }, { text: 'yet', tone: 'danger' }, { text: ' = jeszcze nie', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'I have yet not finished', tone: 'danger' }] },
    ],
    examples: [
      { labelRU: 'already', labelUK: 'already', labelES: 'already', en: [{ text: 'You have ' }, { text: 'already', tone: 'accent' }, { text: ' checked it', tone: 'warning' }], ru: 'Ты уже проверил это', uk: 'Ти вже перевірив це', es: 'Ya lo has revisado',
      'pt-BR': 'Você já verificou isso',
      vi: 'Bạn đã kiểm tra nó rồi',
      id: 'Kamu sudah memeriksanya',
      tr: 'Bunu zaten kontrol ettin',
      pl: 'Już to sprawdziłeś', labelPtBr: 'already', labelVi: 'already', labelId: 'already', labelTr: 'already', labelPl: 'already', noteRU: 'already обычно стоит между have/has и V3.', noteUK: 'already зазвичай стоїть між have/has і V3.', noteES: 'already usually stands between have/has and V3.', notePtBr: 'already geralmente fica entre have/has e V3.', noteVi: 'already thường đứng giữa have/has và V3.', noteId: 'already biasanya berada di antara have/has dan V3.', noteTr: 'already genellikle have/has ile V3 arasında durur.', notePl: 'already zwykle stoi między have/has i V3.' },
      { labelRU: 'yet', labelUK: 'yet', labelES: 'yet', en: [{ text: 'We have ' }, { text: 'not', tone: 'danger' }, { text: ' found the keys ', tone: 'warning' }, { text: 'yet', tone: 'danger' }], ru: 'Мы ещё не нашли ключи', uk: 'Ми ще не знайшли ключі', es: 'Todavía no hemos encontrado las llaves',
      'pt-BR': 'Ainda não encontramos as chaves',
      vi: 'Chúng tôi chưa tìm thấy chìa khóa',
      id: 'Kami belum menemukan kuncinya',
      tr: 'Anahtarları henüz bulmadık',
      pl: 'Jeszcze nie znaleźliśmy kluczy', labelPtBr: 'yet', labelVi: 'yet', labelId: 'yet', labelTr: 'yet', labelPl: 'yet', noteRU: 'yet в таких фразах стоит в конце.', noteUK: 'yet у таких фразах стоїть у кінці.', noteES: 'yet goes at the end in these sentences.', notePtBr: 'yet fica no fim nessas frases.', noteVi: 'yet đứng ở cuối trong những câu như thế này.', noteId: 'yet berada di akhir dalam kalimat seperti ini.', noteTr: 'yet bu tür cümlelerde sonda durur.', notePl: 'yet w takich zdaniach stoi na końcu.' },
    ],
    developerNotes: {
      screenGoal: 'Экран отдельно закрепляет just/already/yet. Главная ошибка - поставить yet не туда или забыть not в "ещё не".',
      visualPriority: ['just/already выделять accent.', 'not/yet выделять danger.', 'V3 выделять warning.', 'ошибку I have yet not finished выделять danger.'],
      highlightRules: ['just/already = accent.', 'not/yet = danger.', 'V3 = warning.', 'wrong example = danger.'],
      forbiddenContent: ['Не добавлять still как отдельную тему.', 'Не добавлять since/for.', 'Не использовать фразы вне урока 24.'],
      layoutRules: ['Один экран - только just/already/yet.', 'Если экран узкий, оставить по 2 примера на just, already, yet.'],
    },
  },
  {
    lessonId: 24,
    screenId: 'lesson_24_intro_3_questions_ever_never',
    order: 3,
    kind: 'formula',
    titleRU: 'Вопросы, ever и never',
    titleUK: 'Питання, ever і never',
    titleES: 'Questions, ever and never',
    titlePtBr: 'Perguntas, ever e never',
    titleVi: 'Câu hỏi, ever và never',
    titleId: 'Pertanyaan, ever, dan never',
    titleTr: 'Sorular, ever ve never',
    titlePl: 'Pytania, ever i never',
    subtitleRU: 'В вопросе Have / Has выходит в начало. Ever спрашивает об опыте, never говорит "никогда".',
    subtitleUK: 'У питанні Have / Has виходить на початок. Ever питає про досвід, never означає "ніколи".',
    subtitleES: 'In questions, Have / Has moves to the front. Ever asks about experience, never means "never".',
    subtitlePtBr: 'Na pergunta, Have / Has vai para o início. Ever pergunta sobre experiência; never significa "nunca".',
    subtitleVi: 'Trong câu hỏi, Have / Has đứng đầu. Ever hỏi về trải nghiệm; never nghĩa là "không bao giờ".',
    subtitleId: 'Dalam pertanyaan, Have / Has pindah ke depan. Ever menanyakan pengalaman; never berarti "tidak pernah".',
    subtitleTr: 'Soruda Have / Has başa gelir. Ever deneyim sorar; never "asla/hiç" anlamı verir.',
    subtitlePl: 'W pytaniu Have / Has idzie na początek. Ever pyta o doświadczenie, never znaczy "nigdy".',
    linesRU: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + кто + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + ', tone: 'muted' }, { text: 'yet?', tone: 'danger' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'finished', tone: 'warning' }, { text: ' yet?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Has', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'called', tone: 'warning' }, { text: ' yet?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'sent', tone: 'warning' }, { text: ' documents yet?', tone: 'danger' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'Have / Has + кто + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' seen this?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Has', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' helped you?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' we ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' met before?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'have / has + ', tone: 'formula' }, { text: 'never', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'never', tone: 'danger' }, { text: ' seen this', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'never', tone: 'danger' }, { text: ' called me', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He has ' }, { text: 'never', tone: 'danger' }, { text: ' used this app', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'Did you ever seen this?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' seen this?', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + хто + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + ', tone: 'muted' }, { text: 'yet?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'finished', tone: 'warning' }, { text: ' yet?', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'Have / Has + хто + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' seen this?', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + who + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + yet?', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'Have / Has + who + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + V3?', tone: 'warning' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + quem + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + yet?', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'Have / Has + quem + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + V3?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'have / has + ', tone: 'formula' }, { text: 'never', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'Did you ever seen this?', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + ai + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + yet?', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'Have / Has + ai + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + V3?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'have / has + ', tone: 'formula' }, { text: 'never', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'Did you ever seen this?', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + siapa + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + yet?', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'Have / Has + siapa + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + V3?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'have / has + ', tone: 'formula' }, { text: 'never', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Bukan: ', tone: 'warning' }, { text: 'Did you ever seen this?', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + kim + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + yet?', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'Have / Has + kim + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + V3?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'have / has + ', tone: 'formula' }, { text: 'never', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'Did you ever seen this?', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'Have / Has', tone: 'accent' }, { text: ' + kto + ', tone: 'formula' }, { text: 'V3', tone: 'warning' }, { text: ' + yet?', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'Have / Has + kto + ', tone: 'formula' }, { text: 'ever', tone: 'accent' }, { text: ' + V3?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'have / has + ', tone: 'formula' }, { text: 'never', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'Did you ever seen this?', tone: 'danger' }] },
    ],
    examples: [
      { labelRU: 'yet question', labelUK: 'yet question', labelES: 'yet question', en: [{ text: 'Has', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'opened', tone: 'warning' }, { text: ' the door yet?', tone: 'danger' }], ru: 'Он уже открыл дверь?', uk: 'Він вже відчинив двері?', es: '¿Él ya ha abierto la puerta?',
      'pt-BR': 'Ele já abriu a porta?',
      vi: 'Anh ấy đã mở cửa chưa?',
      id: 'Apakah dia sudah membuka pintu?',
      tr: 'Kapıyı henüz açtı mı?',
      pl: 'Czy on już otworzył drzwi?', labelPtBr: 'pergunta com yet', labelVi: 'câu hỏi với yet', labelId: 'pertanyaan dengan yet', labelTr: 'yet sorusu', labelPl: 'pytanie z yet', noteRU: 'В вопросе Has выходит перед he, а yet стоит в конце.', noteUK: 'У питанні Has виходить перед he, а yet стоїть у кінці.', noteES: 'In a question, Has moves before he, and yet goes at the end.', notePtBr: 'Na pergunta, Has vem antes de he, e yet fica no fim.', noteVi: 'Trong câu hỏi, Has đứng trước he, còn yet ở cuối.', noteId: 'Dalam pertanyaan, Has berada sebelum he, dan yet di akhir.', noteTr: 'Soruda Has, he önüne gelir; yet sonda durur.', notePl: 'W pytaniu Has stoi przed he, a yet na końcu.' },
      { labelRU: 'ever', labelUK: 'ever', labelES: 'ever', en: [{ text: 'Have', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'ever', tone: 'accent' }, { text: ' lost your phone?', tone: 'warning' }], ru: 'Ты когда-нибудь терял свой телефон?', uk: 'Ти коли-небудь губив свій телефон?', es: '¿Alguna vez has perdido tu teléfono?',
      'pt-BR': 'Você já perdeu seu telefone?',
      vi: 'Bạn đã bao giờ làm mất điện thoại chưa?',
      id: 'Apakah kamu pernah kehilangan ponselmu?',
      tr: 'Hiç telefonunu kaybettin mi?',
      pl: 'Czy kiedykolwiek zgubiłeś telefon?', labelPtBr: 'ever', labelVi: 'ever', labelId: 'ever', labelTr: 'ever', labelPl: 'ever', noteRU: 'ever спрашивает об опыте за жизнь или до настоящего момента.', noteUK: 'ever питає про досвід за життя або дотепер.', noteES: 'ever asks about life experience up to now.', notePtBr: 'ever pergunta sobre experiência até agora.', noteVi: 'ever hỏi về trải nghiệm cho đến hiện tại.', noteId: 'ever menanyakan pengalaman sampai saat ini.', noteTr: 'ever şimdiye kadarki deneyimi sorar.', notePl: 'ever pyta o doświadczenie do teraz.' },
      { labelRU: 'never', labelUK: 'never', labelES: 'never', en: [{ text: 'We have ' }, { text: 'never', tone: 'danger' }, { text: ' met them', tone: 'warning' }], ru: 'Мы никогда не встречали их', uk: 'Ми ніколи не зустрічали їх', es: 'Nunca los hemos conocido',
      'pt-BR': 'Nós nunca os conhecemos',
      vi: 'Chúng tôi chưa bao giờ gặp họ',
      id: 'Kami belum pernah bertemu mereka',
      tr: 'Onlarla hiç tanışmadık',
      pl: 'Nigdy ich nie spotkaliśmy', labelPtBr: 'never', labelVi: 'never', labelId: 'never', labelTr: 'never', labelPl: 'never', noteRU: 'never уже несёт отрицание, поэтому not не нужен.', noteUK: 'never уже несе заперечення, тому not не потрібен.', noteES: 'never already makes the meaning negative, so not is not needed.', notePtBr: 'never já deixa o sentido negativo; not não é necessário.', noteVi: 'never đã mang nghĩa phủ định, nên không cần not.', noteId: 'never sudah membuat makna negatif, jadi not tidak diperlukan.', noteTr: 'never anlamı zaten olumsuz yapar; not gerekmez.', notePl: 'never już nadaje znaczenie przeczące, więc not nie jest potrzebne.' },
    ],
    developerNotes: {
      screenGoal: 'Экран закрепляет вопросы Have/Has + subject + V3 + yet, вопросы с ever и утверждения с never. Главные ошибки - Did you ever seen и never + not.',
      visualPriority: ['Have/Has в вопросе выделять accent.', 'ever выделять accent.', 'never/yet выделять danger.', 'V3 выделять warning.', 'wrong example выделять danger.'],
      highlightRules: ['question starter Have/Has = accent.', 'ever = accent.', 'never/yet = danger.', 'V3 = warning.', 'subject = strong.', 'wrong example = danger.'],
      forbiddenContent: ['Не добавлять Past Simple with yesterday.', 'Не добавлять never not.', 'Не использовать фразы вне урока 24.'],
      layoutRules: ['Один экран - questions + ever/never.', 'Если экран узкий, оставить Have you finished yet, Have you ever seen this, I have never seen this.'],
    },
  },
  {
    lessonId: 24,
    screenId: 'lesson_24_intro_4_irregular_v3_practice',
    order: 4,
    kind: 'practice',
    titleRU: 'V3: been / done / made / changed',
    titleUK: 'V3: been / done / made / changed',
    titleES: 'V3: been / done / made / changed',
    titlePtBr: 'V3: been / done / made / changed',
    titleVi: 'V3: been / done / made / changed',
    titleId: 'V3: been / done / made / changed',
    titleTr: 'V3: been / done / made / changed',
    titlePl: 'V3: been / done / made / changed',
    subtitleRU: 'В конце урока появляются формы, которые нельзя угадать по -ed.',
    subtitleUK: 'Наприкінці уроку з\'являються форми, які не можна вгадати через -ed.',
    subtitleES: 'At the end of the lesson, some forms cannot be guessed with -ed.',
    subtitlePtBr: 'No fim da lição aparecem formas que não dá para adivinhar com -ed.',
    subtitleVi: 'Cuối bài có những dạng không thể đoán bằng -ed.',
    subtitleId: 'Di akhir pelajaran ada bentuk yang tidak bisa ditebak dengan -ed.',
    subtitleTr: 'Dersin sonunda -ed ile tahmin edilemeyen biçimler gelir.',
    subtitlePl: 'Na końcu lekcji pojawiają się formy, których nie da się odgadnąć przez -ed.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'She has ' }, { text: 'been', tone: 'warning' }, { text: ' here before' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'correct', parts: [{ text: 'They have ' }, { text: 'made', tone: 'warning' }, { text: ' mistakes' }] },
      { type: 'correct', parts: [{ text: 'It has ' }, { text: 'changed', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'step', parts: [{ text: '1. "Только что" -> ', tone: 'muted' }, { text: 'have / has just + V3', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '2. "Уже" -> ', tone: 'muted' }, { text: 'have / has already + V3', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. "Ещё не" -> ', tone: 'muted' }, { text: 'have / has not + V3 + yet', tone: 'danger' }] },
      { type: 'step', parts: [{ text: '4. "Когда-нибудь?" -> ', tone: 'muted' }, { text: 'Have / Has + subject + ever + V3?', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '5. "Никогда" -> ', tone: 'muted' }, { text: 'have / has never + V3', tone: 'danger' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I have was there', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'We have did it', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'They have maked mistakes', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'They have ' }, { text: 'made', tone: 'warning' }, { text: ' mistakes' }] },
      { type: 'tip', parts: [{ text: 'Главный навык урока: ', tone: 'strong' }, { text: 'после have / has всегда проверяй третью форму, а не обычное прошлое.' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'correct', parts: [{ text: 'They have ' }, { text: 'made', tone: 'warning' }, { text: ' mistakes' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'We have did it', tone: 'danger' }] },
      { type: 'tip', parts: [{ text: 'Cheque principal: ', tone: 'strong' }, { text: 'depois de have / has, use sempre a terceira forma, não o passado comum.' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'We have did it', tone: 'danger' }] },
      { type: 'tip', parts: [{ text: 'Cách kiểm tra chính: ', tone: 'strong' }, { text: 'sau have / has luôn kiểm tra dạng thứ ba, không dùng quá khứ thường.' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'wrong', parts: [{ text: 'Bukan: ', tone: 'warning' }, { text: 'We have did it', tone: 'danger' }] },
      { type: 'tip', parts: [{ text: 'Cek utama: ', tone: 'strong' }, { text: 'setelah have / has, selalu gunakan bentuk ketiga, bukan past biasa.' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'We have did it', tone: 'danger' }] },
      { type: 'tip', parts: [{ text: 'Ana kontrol: ', tone: 'strong' }, { text: 'have / has sonrasında normal geçmiş değil, her zaman üçüncü fiil biçimi gerekir.' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'have / has', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'irregular V3', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I have ' }, { text: 'been', tone: 'warning' }, { text: ' there' }] },
      { type: 'correct', parts: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'We have did it', tone: 'danger' }] },
      { type: 'tip', parts: [{ text: 'Główna kontrola: ', tone: 'strong' }, { text: 'po have / has zawsze sprawdzaj trzecią formę, nie zwykły czas przeszły.' }] },
    ],
    examples: [
      { labelRU: 'been', labelUK: 'been', labelES: 'been', en: [{ text: 'She has ' }, { text: 'been', tone: 'warning' }, { text: ' here before' }], ru: 'Она уже была здесь раньше', uk: 'Вона вже була тут раніше', es: 'Ella ha estado aquí antes',
      'pt-BR': 'Ela já esteve aqui antes',
      vi: 'Cô ấy đã từng ở đây trước kia',
      id: 'Dia sudah pernah berada di sini sebelumnya',
      tr: 'Daha önce burada bulundu',
      pl: 'Ona już tu kiedyś była', labelPtBr: 'been', labelVi: 'been', labelId: 'been', labelTr: 'been', labelPl: 'been', noteRU: 'После has нужна форма been, не was.', noteUK: 'Після has потрібна форма been, не was.', noteES: 'After has, use been, not was.', notePtBr: 'Depois de has, use been, não was.', noteVi: 'Sau has, dùng been, không dùng was.', noteId: 'Setelah has, gunakan been, bukan was.', noteTr: 'has sonrasında was değil, been kullanılır.', notePl: 'Po has użyj been, nie was.' },
      { labelRU: 'done', labelUK: 'done', labelES: 'done', en: [{ text: 'We have ' }, { text: 'done', tone: 'warning' }, { text: ' it' }], ru: 'Мы сделали это', uk: 'Ми зробили це', es: 'Lo hemos hecho',
      'pt-BR': 'Nós fizemos isso',
      vi: 'Chúng tôi đã làm xong việc đó',
      id: 'Kami telah melakukannya',
      tr: 'Bunu yaptık',
      pl: 'Zrobiliśmy to', labelPtBr: 'done', labelVi: 'done', labelId: 'done', labelTr: 'done', labelPl: 'done', noteRU: 'Do -> did в Past Simple, но после have нужна форма done.', noteUK: 'Do -> did у Past Simple, але після have потрібна форма done.', noteES: 'Do -> did in Past Simple, but after have use done.', notePtBr: 'Do vira did no Past Simple, mas depois de have use done.', noteVi: 'Do thành did trong Past Simple, nhưng sau have dùng done.', noteId: 'Do menjadi did dalam Past Simple, tetapi setelah have gunakan done.', noteTr: 'Do, Past Simple’da did olur; have sonrasında done kullanılır.', notePl: 'Do w Past Simple zmienia się w did, ale po have użyj done.' },
      { labelRU: 'made', labelUK: 'made', labelES: 'made', en: [{ text: 'They have ' }, { text: 'made', tone: 'warning' }, { text: ' mistakes' }], ru: 'Они сделали ошибки', uk: 'Вони зробили помилки', es: 'Ellos han cometido errores',
      'pt-BR': 'Eles cometeram erros',
      vi: 'Họ đã mắc lỗi',
      id: 'Mereka telah melakukan kesalahan',
      tr: 'Hatalar yaptılar',
      pl: 'Popełnili błędy', labelPtBr: 'made', labelVi: 'made', labelId: 'made', labelTr: 'made', labelPl: 'made', noteRU: 'Make в V3 становится made.', noteUK: 'Make у V3 стає made.', noteES: 'Make becomes made in V3.', notePtBr: 'Make vira made em V3.', noteVi: 'Make chuyển thành made ở V3.', noteId: 'Make menjadi made dalam V3.', noteTr: 'Make, V3 biçiminde made olur.', notePl: 'Make w V3 zmienia się w made.' },
    ],
    developerNotes: {
      screenGoal: 'Финальный экран закрепляет irregular V3 и общий алгоритм урока. Главные ошибки - have was, have did, have maked.',
      visualPriority: ['have / has выделять accent.', 'irregular V3 выделять warning.', 'never / yet в алгоритме выделять danger.', 'wrong examples выделять danger.'],
      highlightRules: ['have/has = accent.', 'V3 = warning.', 'yet/never/not = danger.', 'wrong example = danger.'],
      forbiddenContent: ['Не добавлять Present Perfect Continuous.', 'Не добавлять since/for.', 'Не добавлять yesterday как Present Perfect маркер.', 'Не использовать фразы вне урока 24.'],
      layoutRules: ['Экран финальный и практический.', 'Если не помещается, оставить I have been there, We have done it, They have made mistakes и три ошибки.'],
    },
  },
];

export const LESSON_25_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 25,
    screenId: 'lesson_25_intro_1_past_continuous_core',
    order: 1,
    kind: 'concept',
    titleRU: 'Действие было в процессе',
    titleUK: 'Дія була в процесі',
    titleES: 'An action was in progress',
    titlePtBr: 'A ação estava em andamento',
    titleVi: 'Hành động đang diễn ra trong quá khứ',
    titleId: 'Tindakan sedang berlangsung',
    titleTr: 'Eylem süreç halindeydi',
    titlePl: 'Czynność była w toku',
    subtitleRU: 'Past Continuous показывает, что действие длилось в прошлом: в восемь, в тот момент, прошлой ночью.',
    subtitleUK: 'Past Continuous показує, що дія тривала в минулому: о восьмій, у той момент, минулої ночі.',
    subtitleES: 'Past Continuous shows that an action was in progress in the past.',
    subtitlePtBr: 'Past Continuous mostra que uma ação estava em andamento no passado: às oito, naquele momento, ontem à noite.',
    subtitleVi: 'Past Continuous cho thấy một hành động đang diễn ra trong quá khứ: lúc tám giờ, vào khoảnh khắc đó, tối qua.',
    subtitleId: 'Past Continuous menunjukkan bahwa tindakan sedang berlangsung di masa lalu: pukul delapan, saat itu, tadi malam.',
    subtitleTr: 'Past Continuous, geçmişte bir eylemin sürdüğünü gösterir: saat sekizde, o anda, dün gece.',
    subtitlePl: 'Past Continuous pokazuje, że czynność trwała w przeszłości: o ósmej, w tamtym momencie, zeszłej nocy.',
    linesRU: [
      { type: 'text', parts: [{ text: 'Если действие ' }, { text: 'длилось в прошлом', tone: 'strong' }, { text: ', английский использует:' }] },
      { type: 'formula', parts: [{ text: 'кто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'глагол + -ing', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'You ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' reading at that time', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' cooking dinner at six', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' waiting near the door', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'Главная проверка: ', tone: 'strong' }, { text: 'I / he / she / it -> was. You / we / they -> were. После этого нужен -ing.' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I working at eight', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'He was cook dinner at six', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'He ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' cooking dinner at six', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'text', parts: [{ text: 'Якщо дія ' }, { text: 'тривала в минулому', tone: 'strong' }, { text: ', англійська використовує:' }] },
      { type: 'formula', parts: [{ text: 'хто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'дієслово + -ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'You ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' reading at that time', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' cooking dinner at six', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'text', parts: [{ text: 'If an action was in progress in the past, use:' }] },
      { type: 'formula', parts: [{ text: 'who', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'verb + -ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
    ],
    linesPtBr: [
      { type: 'text', parts: [{ text: 'Se a ação ' }, { text: 'estava em andamento no passado', tone: 'strong' }, { text: ', use:' }] },
      { type: 'formula', parts: [{ text: 'quem', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'verbo + -ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Cheque principal: ', tone: 'strong' }, { text: 'I / he / she / it -> was. You / we / they -> were. Depois vem -ing.' }] },
    ],
    linesVi: [
      { type: 'text', parts: [{ text: 'Nếu hành động ' }, { text: 'đang diễn ra trong quá khứ', tone: 'strong' }, { text: ', dùng:' }] },
      { type: 'formula', parts: [{ text: 'ai', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'động từ + -ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Cách kiểm tra chính: ', tone: 'strong' }, { text: 'I / he / she / it -> was. You / we / they -> were. Sau đó cần -ing.' }] },
    ],
    linesId: [
      { type: 'text', parts: [{ text: 'Jika tindakan ' }, { text: 'sedang berlangsung di masa lalu', tone: 'strong' }, { text: ', gunakan:' }] },
      { type: 'formula', parts: [{ text: 'siapa', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'kata kerja + -ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Cek utama: ', tone: 'strong' }, { text: 'I / he / she / it -> was. You / we / they -> were. Setelah itu perlu -ing.' }] },
    ],
    linesTr: [
      { type: 'text', parts: [{ text: 'Eylem ' }, { text: 'geçmişte devam ediyorsa', tone: 'strong' }, { text: ', şunu kullan:' }] },
      { type: 'formula', parts: [{ text: 'kim', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'fiil + -ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Ana kontrol: ', tone: 'strong' }, { text: 'I / he / she / it -> was. You / we / they -> were. Sonra -ing gerekir.' }] },
    ],
    linesPl: [
      { type: 'text', parts: [{ text: 'Jeśli czynność ' }, { text: 'trwała w przeszłości', tone: 'strong' }, { text: ', użyj:' }] },
      { type: 'formula', parts: [{ text: 'kto', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'czasownik + -ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' working at eight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' watching TV last night', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Główna kontrola: ', tone: 'strong' }, { text: 'I / he / she / it -> was. You / we / they -> were. Potem potrzebne jest -ing.' }] },
    ],
    examples: [
      { labelRU: 'was', labelUK: 'was', labelES: 'was', en: [{ text: 'She ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' writing a message at noon', tone: 'warning' }], ru: 'Она писала сообщение в полдень', uk: 'Вона писала повідомлення опівдні', es: 'Estaba escribiendo un mensaje al mediodía',
      'pt-BR': 'Ela estava escrevendo uma mensagem ao meio-dia',
      vi: 'Cô ấy đang viết một tin nhắn lúc giữa trưa',
      id: 'Dia sedang menulis pesan pada tengah hari',
      tr: 'Öğlen bir mesaj yazıyordu',
      pl: 'Ona pisała wiadomość w południe', labelPtBr: 'was', labelVi: 'was', labelId: 'was', labelTr: 'was', labelPl: 'was', noteRU: 'She требует was, а действие получает -ing.', noteUK: 'She вимагає was, а дія отримує -ing.', noteES: 'Use was with she, and add -ing to the action.', notePtBr: 'Use was com she e acrescente -ing ao verbo.', noteVi: 'Dùng was với she và thêm -ing vào hành động.', noteId: 'Gunakan was dengan she dan tambahkan -ing pada tindakan.', noteTr: 'She ile was kullanılır ve eyleme -ing eklenir.', notePl: 'Z she użyj was i dodaj -ing do czynności.' },
      { labelRU: 'were', labelUK: 'were', labelES: 'were', en: [{ text: 'We ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' checking documents', tone: 'warning' }], ru: 'Мы проверяли документы', uk: 'Ми перевіряли документи', es: 'Estábamos revisando documentos',
      'pt-BR': 'Nós estávamos verificando documentos',
      vi: 'Chúng tôi đang kiểm tra tài liệu',
      id: 'Kami sedang memeriksa dokumen',
      tr: 'Belgeleri kontrol ediyorduk',
      pl: 'Sprawdzaliśmy dokumenty', labelPtBr: 'were', labelVi: 'were', labelId: 'were', labelTr: 'were', labelPl: 'were', noteRU: 'We требует were.', noteUK: 'We вимагає were.', noteES: 'Use were with we.', notePtBr: 'Use were com we.', noteVi: 'Dùng were với we.', noteId: 'Gunakan were dengan we.', noteTr: 'We ile were kullanılır.', notePl: 'Z we użyj were.' },
    ],
  },
  {
    lessonId: 25,
    screenId: 'lesson_25_intro_2_questions_negatives',
    order: 2,
    kind: 'formula',
    titleRU: 'Вопросы и отрицания',
    titleUK: 'Питання і заперечення',
    titleES: 'Questions and negatives',
    titlePtBr: 'Perguntas e negativas',
    titleVi: 'Câu hỏi và phủ định',
    titleId: 'Pertanyaan dan negasi',
    titleTr: 'Sorular ve olumsuzlar',
    titlePl: 'Pytania i przeczenia',
    subtitleRU: 'В вопросе was / were выходит в начало. В отрицании not ставится после was / were.',
    subtitleUK: 'У питанні was / were виходить на початок. У запереченні not стоїть після was / were.',
    subtitleES: 'In questions, was / were moves to the front. In negatives, not comes after was / were.',
    subtitlePtBr: 'Na pergunta, was / were vai para o início. Na negativa, not fica depois de was / were.',
    subtitleVi: 'Trong câu hỏi, was / were đứng lên đầu. Trong câu phủ định, not đứng sau was / were.',
    subtitleId: 'Dalam pertanyaan, was / were pindah ke depan. Dalam negasi, not diletakkan setelah was / were.',
    subtitleTr: 'Soruda was / were başa gelir. Olumsuzda not, was / were sonrasında yer alır.',
    subtitlePl: 'W pytaniu was / were idzie na początek. W przeczeniu not stoi po was / were.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'кто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Was', tone: 'accent' }, { text: ' he cooking dinner at six?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Was', tone: 'accent' }, { text: ' she writing a message at noon?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' they watching TV last night?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'кто', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V-ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' sleeping at midnight', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'You ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' listening to me', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' working yesterday evening', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'Did you were working at eight?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'He not was watching TV then', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'He ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' watching TV then', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + хто + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Was', tone: 'accent' }, { text: ' he cooking dinner at six?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'хто + was / were + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'V-ing', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' sleeping at midnight', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + who + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'who + was / were + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + V-ing', tone: 'warning' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + quem + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'quem + was / were + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + V-ing', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'Did you were working at eight?', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + ai + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'ai + was / were + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + V-ing', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'Did you were working at eight?', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + siapa + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'siapa + was / were + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + V-ing', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Bukan: ', tone: 'warning' }, { text: 'Did you were working at eight?', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + kim + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'kim + was / were + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + V-ing', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'Did you were working at eight?', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'Was / Were', tone: 'accent' }, { text: ' + kto + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Were', tone: 'accent' }, { text: ' you working at eight?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'kto + was / were + ', tone: 'formula' }, { text: 'not', tone: 'danger' }, { text: ' + V-ing', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'Did you were working at eight?', tone: 'danger' }] },
    ],
    examples: [
      { labelRU: 'вопрос', labelUK: 'питання', labelES: 'question', en: [{ text: 'Was', tone: 'accent' }, { text: ' she writing a message at noon?', tone: 'warning' }], ru: 'Она писала сообщение в полдень?', uk: 'Вона писала повідомлення опівдні?', es: '¿Ella estaba escribiendo un mensaje al mediodía?',
      'pt-BR': 'Ela estava escrevendo uma mensagem ao meio-dia?',
      vi: 'Cô ấy đang viết một tin nhắn lúc giữa trưa à?',
      id: 'Apakah dia sedang menulis pesan pada tengah hari?',
      tr: 'Öğlen bir mesaj mı yazıyordu?',
      pl: 'Czy ona pisała wiadomość w południe?', labelPtBr: 'pergunta', labelVi: 'câu hỏi', labelId: 'pertanyaan', labelTr: 'soru', labelPl: 'pytanie', noteRU: 'В вопросе Was выходит перед she.', noteUK: 'У питанні Was виходить перед she.', noteES: 'In a question, Was moves before she.', notePtBr: 'Na pergunta, Was vem antes de she.', noteVi: 'Trong câu hỏi, Was đứng trước she.', noteId: 'Dalam pertanyaan, Was berada sebelum she.', noteTr: 'Soruda Was, she önüne gelir.', notePl: 'W pytaniu Was stoi przed she.' },
      { labelRU: 'отрицание', labelUK: 'заперечення', labelES: 'negative', en: [{ text: 'She ', tone: 'strong' }, { text: 'was', tone: 'accent' }, { text: ' ' }, { text: 'not', tone: 'danger' }, { text: ' using my phone', tone: 'warning' }], ru: 'Она не пользовалась моим телефоном', uk: 'Вона не користувалася моїм телефоном', es: 'Ella no estaba usando mi teléfono',
      'pt-BR': 'Ela não estava usando meu telefone',
      vi: 'Cô ấy không dùng điện thoại của tôi',
      id: 'Dia tidak sedang menggunakan ponsel saya',
      tr: 'Telefonumu kullanmıyordu',
      pl: 'Ona nie używała mojego telefonu', labelPtBr: 'negativa', labelVi: 'phủ định', labelId: 'negasi', labelTr: 'olumsuz', labelPl: 'przeczenie', noteRU: 'not стоит после was, а using остаётся с -ing.', noteUK: 'not стоїть після was, а using залишається з -ing.', noteES: 'not comes after was, and using keeps -ing.', notePtBr: 'not vem depois de was, e using mantém -ing.', noteVi: 'not đứng sau was, còn using giữ -ing.', noteId: 'not datang setelah was, dan using tetap memakai -ing.', noteTr: 'not, was sonrasında gelir; using -ing ile kalır.', notePl: 'not stoi po was, a using zachowuje -ing.' },
    ],
  },
  {
    lessonId: 25,
    screenId: 'lesson_25_intro_3_wh_while',
    order: 3,
    kind: 'formula',
    titleRU: 'WH-вопросы и while',
    titleUK: 'WH-питання і while',
    titleES: 'WH-questions and while',
    titlePtBr: 'Perguntas WH e while',
    titleVi: 'Câu hỏi WH và while',
    titleId: 'Pertanyaan WH dan while',
    titleTr: 'WH soruları ve while',
    titlePl: 'Pytania WH i while',
    subtitleRU: 'WH-вопрос начинается с вопросительного слова. While соединяет два длительных действия.',
    subtitleUK: 'WH-питання починається з питального слова. While поєднує дві тривалі дії.',
    subtitleES: 'A WH-question starts with a question word. While connects two ongoing actions.',
    subtitlePtBr: 'A pergunta WH começa com uma palavra interrogativa. While liga duas ações em andamento.',
    subtitleVi: 'Câu hỏi WH bắt đầu bằng từ để hỏi. While nối hai hành động đang diễn ra.',
    subtitleId: 'Pertanyaan WH dimulai dengan kata tanya. While menghubungkan dua tindakan yang sedang berlangsung.',
    subtitleTr: 'WH sorusu soru kelimesiyle başlar. While iki devam eden eylemi bağlar.',
    subtitlePl: 'Pytanie WH zaczyna się od słowa pytającego. While łączy dwie trwające czynności.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + кто + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'were', tone: 'warning' }, { text: ' you doing at that time?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Where', tone: 'accent' }, { text: ' ' }, { text: 'were', tone: 'warning' }, { text: ' they waiting?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Who', tone: 'accent' }, { text: ' ' }, { text: 'was', tone: 'warning' }, { text: ' calling you?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Why', tone: 'accent' }, { text: ' ' }, { text: 'was', tone: 'warning' }, { text: ' she crying?', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'длительное действие', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'while', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'длительное действие', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'was making coffee', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'was cleaning', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' we ', tone: 'strong' }, { text: 'were talking', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'were walking', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' it ', tone: 'strong' }, { text: 'was raining', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'What you were doing at that time?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'were', tone: 'warning' }, { text: ' you doing at that time?', tone: 'warning' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + хто + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'were', tone: 'warning' }, { text: ' you doing at that time?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'тривала дія + ', tone: 'formula' }, { text: 'while', tone: 'accent' }, { text: ' + тривала дія', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'was making coffee', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + who + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'ongoing action + ', tone: 'formula' }, { text: 'while', tone: 'accent' }, { text: ' + ongoing action', tone: 'formula' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + quem + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'ação em andamento + ', tone: 'formula' }, { text: 'while', tone: 'accent' }, { text: ' + ação em andamento', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'What you were doing at that time?', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + ai + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'hành động đang diễn ra + ', tone: 'formula' }, { text: 'while', tone: 'accent' }, { text: ' + hành động đang diễn ra', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'What you were doing at that time?', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + siapa + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'tindakan yang berlangsung + ', tone: 'formula' }, { text: 'while', tone: 'accent' }, { text: ' + tindakan yang berlangsung', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Bukan: ', tone: 'warning' }, { text: 'What you were doing at that time?', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + kim + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'devam eden eylem + ', tone: 'formula' }, { text: 'while', tone: 'accent' }, { text: ' + devam eden eylem', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'What you were doing at that time?', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'What / Where / Who / Why', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'was / were', tone: 'warning' }, { text: ' + kto + ', tone: 'formula' }, { text: 'V-ing?', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'trwająca czynność + ', tone: 'formula' }, { text: 'while', tone: 'accent' }, { text: ' + trwająca czynność', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'What you were doing at that time?', tone: 'danger' }] },
    ],
    examples: [
      { labelRU: 'WH-вопрос', labelUK: 'WH-питання', labelES: 'WH-question', en: [{ text: 'Why', tone: 'accent' }, { text: ' ' }, { text: 'was', tone: 'warning' }, { text: ' she crying?', tone: 'warning' }], ru: 'Почему она плакала?', uk: 'Чому вона плакала?', es: '¿Por qué estaba llorando?',
      'pt-BR': 'Por que ela estava chorando?',
      vi: 'Tại sao cô ấy đang khóc?',
      id: 'Mengapa dia menangis?',
      tr: 'Neden ağlıyordu?',
      pl: 'Dlaczego płakała?', labelPtBr: 'pergunta WH', labelVi: 'câu hỏi WH', labelId: 'pertanyaan WH', labelTr: 'WH sorusu', labelPl: 'pytanie WH', noteRU: 'Why первым, потом was, потом she crying.', noteUK: 'Why першим, потім was, потім she crying.', noteES: 'Why first, then was, then she crying.', notePtBr: 'Why primeiro, depois was, depois she crying.', noteVi: 'Why đứng trước, rồi was, rồi she crying.', noteId: 'Why dulu, lalu was, lalu she crying.', noteTr: 'Önce Why, sonra was, sonra she crying gelir.', notePl: 'Najpierw Why, potem was, potem she crying.' },
      { labelRU: 'while', labelUK: 'while', labelES: 'while', en: [{ text: 'She ', tone: 'strong' }, { text: 'was writing', tone: 'warning' }, { text: ' ' }, { text: 'while', tone: 'accent' }, { text: ' I ', tone: 'strong' }, { text: 'was reading', tone: 'warning' }], ru: 'Она писала, пока я читал', uk: 'Вона писала, поки я читав', es: 'Ella estaba escribiendo mientras yo leía',
      'pt-BR': 'Ela estava escrevendo enquanto eu lia',
      vi: 'Cô ấy đang viết trong khi tôi đang đọc',
      id: 'Dia sedang menulis sementara saya sedang membaca',
      tr: 'Ben okurken o yazıyordu',
      pl: 'Ona pisała, gdy ja czytałem', labelPtBr: 'while', labelVi: 'while', labelId: 'while', labelTr: 'while', labelPl: 'while', noteRU: 'while соединяет два процесса, которые шли одновременно.', noteUK: 'while поєднує два процеси, які тривали одночасно.', noteES: 'while connects two actions happening at the same time.', notePtBr: 'while liga duas ações que aconteciam ao mesmo tempo.', noteVi: 'while nối hai hành động diễn ra cùng lúc.', noteId: 'while menghubungkan dua tindakan yang terjadi bersamaan.', noteTr: 'while aynı anda süren iki eylemi bağlar.', notePl: 'while łączy dwie czynności trwające jednocześnie.' },
    ],
  },
  {
    lessonId: 25,
    screenId: 'lesson_25_intro_4_when_practice',
    order: 4,
    kind: 'practice',
    titleRU: 'when: процесс + короткое событие',
    titleUK: 'when: процес + коротка подія',
    titleES: 'when: process + short event',
    titlePtBr: 'when: processo + evento curto',
    titleVi: 'when: quá trình + sự kiện ngắn',
    titleId: 'when: proses + peristiwa singkat',
    titleTr: 'when: süreç + kısa olay',
    titlePl: 'when: proces + krótkie zdarzenie',
    subtitleRU: 'Past Continuous часто даёт фон, а when вводит короткое событие, которое произошло в этот момент.',
    subtitleUK: 'Past Continuous часто дає фон, а when вводить коротку подію, яка сталася в цей момент.',
    subtitleES: 'Past Continuous often gives the background, and when introduces a short event.',
    subtitlePtBr: 'Past Continuous muitas vezes dá o pano de fundo, e when introduz um evento curto que aconteceu naquele momento.',
    subtitleVi: 'Past Continuous thường tạo bối cảnh, còn when đưa vào một sự kiện ngắn xảy ra đúng lúc đó.',
    subtitleId: 'Past Continuous sering memberi latar, dan when memperkenalkan peristiwa singkat yang terjadi saat itu.',
    subtitleTr: 'Past Continuous çoğu zaman arka planı verir; when ise o anda gerçekleşen kısa olayı başlatır.',
    subtitlePl: 'Past Continuous często daje tło, a when wprowadza krótkie zdarzenie, które wydarzyło się w tym momencie.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'длительное действие', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'короткое событие в Past Simple', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'arrived', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'were eating', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' the phone ', tone: 'strong' }, { text: 'rang', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'were driving', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' it ', tone: 'strong' }, { text: 'started raining', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'was sleeping', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' I ', tone: 'strong' }, { text: 'opened the door', tone: 'warning' }] },
      { type: 'spacer' },
      { type: 'step', parts: [{ text: '1. Что длилось? ', tone: 'muted' }, { text: 'was / were + V-ing', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '2. Что произошло в этот момент? ', tone: 'muted' }, { text: 'Past Simple: called, arrived, rang, opened', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Соединитель: ', tone: 'muted' }, { text: 'when', tone: 'accent' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'I worked when you were calling', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно здесь: ', tone: 'success' }, { text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'She was cooking when he was arriving', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно здесь: ', tone: 'success' }, { text: 'She ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'arrived', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Главный навык урока: ', tone: 'strong' }, { text: 'отделить длинный фон от короткого события. Фон = was / were + -ing. Событие = Past Simple.' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'тривала дія', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'коротка подія в Past Simple', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'was cooking', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'arrived', tone: 'warning' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'ongoing action', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'short Past Simple event', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'ação em andamento', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'evento curto em Past Simple', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Habilidade principal: ', tone: 'strong' }, { text: 'separe o fundo longo do evento curto. Fundo = was / were + -ing. Evento = Past Simple.' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'hành động đang diễn ra', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'sự kiện ngắn ở Past Simple', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Kỹ năng chính: ', tone: 'strong' }, { text: 'tách bối cảnh dài khỏi sự kiện ngắn. Bối cảnh = was / were + -ing. Sự kiện = Past Simple.' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'tindakan yang berlangsung', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'peristiwa singkat dalam Past Simple', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Keterampilan utama: ', tone: 'strong' }, { text: 'pisahkan latar panjang dari peristiwa singkat. Latar = was / were + -ing. Peristiwa = Past Simple.' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'devam eden eylem', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'Past Simple kısa olay', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Ana beceri: ', tone: 'strong' }, { text: 'uzun arka planı kısa olaydan ayır. Arka plan = was / were + -ing. Olay = Past Simple.' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'trwająca czynność', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'when', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'krótkie zdarzenie w Past Simple', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'was working', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'called', tone: 'warning' }] },
      { type: 'tip', parts: [{ text: 'Główna umiejętność: ', tone: 'strong' }, { text: 'oddziel długie tło od krótkiego zdarzenia. Tło = was / were + -ing. Zdarzenie = Past Simple.' }] },
    ],
    examples: [
      { labelRU: 'фон + событие', labelUK: 'фон + подія', labelES: 'background + event', en: [{ text: 'They ', tone: 'strong' }, { text: 'were watching a movie', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' I ', tone: 'strong' }, { text: 'called', tone: 'warning' }], ru: 'Они смотрели фильм, когда я позвонил', uk: 'Вони дивилися фільм, коли я подзвонив', es: 'Estaban viendo una película cuando llamé',
      'pt-BR': 'Eles estavam assistindo a um filme quando liguei',
      vi: 'Họ đang xem phim khi tôi gọi',
      id: 'Mereka sedang menonton film ketika saya menelepon',
      tr: 'Ben aradığımda film izliyorlardı',
      pl: 'Oni oglądali film, kiedy zadzwoniłem', labelPtBr: 'fundo + evento', labelVi: 'bối cảnh + sự kiện', labelId: 'latar + peristiwa', labelTr: 'arka plan + olay', labelPl: 'tło + zdarzenie', noteRU: 'were watching = фон, called = короткое событие.', noteUK: 'were watching = фон, called = коротка подія.', noteES: 'were watching = background, called = short event.', notePtBr: 'were watching = fundo; called = evento curto.', noteVi: 'were watching = bối cảnh; called = sự kiện ngắn.', noteId: 'were watching = latar; called = peristiwa singkat.', noteTr: 'were watching = arka plan; called = kısa olay.', notePl: 'were watching = tło, called = krótkie zdarzenie.' },
      { labelRU: 'фон + событие', labelUK: 'фон + подія', labelES: 'background + event', en: [{ text: 'I ', tone: 'strong' }, { text: 'was writing a message', tone: 'warning' }, { text: ' ' }, { text: 'when', tone: 'accent' }, { text: ' you ', tone: 'strong' }, { text: 'knocked on the door', tone: 'warning' }], ru: 'Я писал сообщение, когда ты постучал в дверь', uk: 'Я писав повідомлення, коли ти постукав у двері', es: 'Estaba escribiendo un mensaje cuando llamaste a la puerta',
      'pt-BR': 'Eu estava escrevendo uma mensagem quando você bateu na porta',
      vi: 'Tôi đang viết một tin nhắn khi bạn gõ cửa',
      id: 'Saya sedang menulis pesan ketika kamu mengetuk pintu',
      tr: 'Sen kapıyı çaldığında ben bir mesaj yazıyordum',
      pl: 'Pisałem wiadomość, kiedy zapukałeś do drzwi', labelPtBr: 'fundo + evento', labelVi: 'bối cảnh + sự kiện', labelId: 'latar + peristiwa', labelTr: 'arka plan + olay', labelPl: 'tło + zdarzenie', noteRU: 'was writing длилось, knocked on the door произошло в один момент.', noteUK: 'was writing тривало, knocked on the door сталося в один момент.', noteES: 'was writing was in progress; knocked on the door happened at one moment.', notePtBr: 'was writing estava em andamento; knocked on the door aconteceu em um momento.', noteVi: 'was writing đang diễn ra; knocked on the door xảy ra trong một khoảnh khắc.', noteId: 'was writing sedang berlangsung; knocked on the door terjadi dalam satu momen.', noteTr: 'was writing sürüyordu; knocked on the door tek bir anda gerçekleşti.', notePl: 'was writing trwało; knocked on the door wydarzyło się w jednym momencie.' },
    ],
  },
];

export const LESSON_26_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 26,
    screenId: 'lesson_26_intro_1_first_conditional_core',
    order: 1,
    kind: 'concept',
    titleRU: 'Если это случится, будет результат',
    titleUK: 'Якщо це станеться, буде результат',
    titleES: 'If this happens, this will happen',
    titlePtBr: 'Se isso acontecer, haverá um resultado',
    titleVi: 'Nếu điều này xảy ra, sẽ có kết quả',
    titleId: 'Jika ini terjadi, akan ada hasil',
    titleTr: 'Bu olursa bir sonuç olacak',
    titlePl: 'Jeśli to się stanie, będzie rezultat',
    subtitleRU: 'В этом уроке if показывает условие, а will показывает будущий результат.',
    subtitleUK: 'У цьому уроці if показує умову, а will показує майбутній результат.',
    subtitleES: 'In this lesson, if shows the condition, and will shows the future result.',
    subtitlePtBr: 'Nesta lição, if mostra a condição, e will mostra o resultado futuro.',
    subtitleVi: 'Trong bài này, if chỉ điều kiện, còn will chỉ kết quả trong tương lai.',
    subtitleId: 'Dalam pelajaran ini, if menunjukkan syarat, dan will menunjukkan hasil di masa depan.',
    subtitleTr: 'Bu derste if koşulu, will ise gelecek sonucu gösterir.',
    subtitlePl: 'W tej lekcji if pokazuje warunek, a will przyszły rezultat.',
    linesRU: [
      { type: 'text', parts: [{ text: 'Когда русская фраза звучит как ' }, { text: '"если..., то..."', tone: 'strong' }, { text: ', английский делит её на две части:' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + условие в Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + результат', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she calls me, I ' }, { text: 'will', tone: 'warning' }, { text: ' answer' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' we start now, we ' }, { text: 'will', tone: 'warning' }, { text: ' finish today' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' it rains, we ' }, { text: 'will', tone: 'warning' }, { text: ' stay home' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'Главная ловушка: ', tone: 'strong' }, { text: 'после If в этом уроке не ставим will. Will стоит во второй части.' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'If you will help me, I will finish faster', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
    ],
    linesUK: [
      { type: 'text', parts: [{ text: 'Коли фраза звучить як ' }, { text: '"якщо..., то..."', tone: 'strong' }, { text: ', англійська ділить її на дві частини:' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + умова в Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + результат', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she calls me, I ' }, { text: 'will', tone: 'warning' }, { text: ' answer' }] },
      { type: 'tip', parts: [{ text: 'Головна пастка: ', tone: 'strong' }, { text: 'після If у цьому уроці не ставимо will. Will стоїть у другій частині.' }] },
    ],
    linesES: [
      { type: 'text', parts: [{ text: 'If shows the condition. Will shows the future result.' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + result', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
    ],
    linesPtBr: [
      { type: 'text', parts: [{ text: 'Quando a frase tem ideia de ' }, { text: '"se..., então..."', tone: 'strong' }, { text: ', o inglês divide em duas partes:' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + condição em Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + resultado', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she calls me, I ' }, { text: 'will', tone: 'warning' }, { text: ' answer' }] },
      { type: 'tip', parts: [{ text: 'Armadilha principal: ', tone: 'strong' }, { text: 'depois de If, nesta lição, não use will. Will fica na segunda parte.' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'If you will help me, I will finish faster', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'text', parts: [{ text: 'Nếu câu có ý ' }, { text: '"nếu..., thì..."', tone: 'strong' }, { text: ', tiếng Anh chia thành hai phần:' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + điều kiện ở Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + kết quả', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she calls me, I ' }, { text: 'will', tone: 'warning' }, { text: ' answer' }] },
      { type: 'tip', parts: [{ text: 'Bẫy chính: ', tone: 'strong' }, { text: 'sau If trong bài này không dùng will. Will đứng ở phần thứ hai.' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'If you will help me, I will finish faster', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'text', parts: [{ text: 'Jika kalimat bermakna ' }, { text: '"jika..., maka..."', tone: 'strong' }, { text: ', bahasa Inggris membaginya menjadi dua bagian:' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + syarat dalam Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + hasil', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she calls me, I ' }, { text: 'will', tone: 'warning' }, { text: ' answer' }] },
      { type: 'tip', parts: [{ text: 'Jebakan utama: ', tone: 'strong' }, { text: 'setelah If dalam pelajaran ini jangan gunakan will. Will berada di bagian kedua.' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'If you will help me, I will finish faster', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'text', parts: [{ text: 'Cümlede ' }, { text: '"eğer..., o zaman..."', tone: 'strong' }, { text: ' fikri varsa İngilizce onu iki parçaya ayırır:' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple koşulu', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + sonuç', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she calls me, I ' }, { text: 'will', tone: 'warning' }, { text: ' answer' }] },
      { type: 'tip', parts: [{ text: 'Ana tuzak: ', tone: 'strong' }, { text: 'bu derste If sonrasında will kullanma. Will ikinci bölümde durur.' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'If you will help me, I will finish faster', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'text', parts: [{ text: 'Gdy zdanie ma sens ' }, { text: '"jeśli..., to..."', tone: 'strong' }, { text: ', angielski dzieli je na dwie części:' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + warunek w Present Simple', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + rezultat', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you help me, I ' }, { text: 'will', tone: 'warning' }, { text: ' finish faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she calls me, I ' }, { text: 'will', tone: 'warning' }, { text: ' answer' }] },
      { type: 'tip', parts: [{ text: 'Główna pułapka: ', tone: 'strong' }, { text: 'po If w tej lekcji nie używaj will. Will stoi w drugiej części.' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'If you will help me, I will finish faster', tone: 'danger' }] },
    ],
    examples: [
      { labelRU: 'условие + результат', labelUK: 'умова + результат', labelES: 'condition + result', en: [{ text: 'If', tone: 'accent' }, { text: ' you open the app, it ' }, { text: 'will', tone: 'warning' }, { text: ' work' }], ru: 'Если ты откроешь приложение, оно будет работать', uk: 'Якщо ти відкриєш застосунок, він працюватиме', es: 'Si abres la aplicación, funcionará',
      'pt-BR': 'Se você abrir o aplicativo, ele vai funcionar',
      vi: 'Nếu bạn mở ứng dụng, nó sẽ hoạt động',
      id: 'Jika kamu membuka aplikasi, aplikasi itu akan berfungsi',
      tr: 'Uygulamayı açarsan çalışacak',
      pl: 'Jeśli otworzysz aplikację, ona zadziała', labelPtBr: 'condição + resultado', labelVi: 'điều kiện + kết quả', labelId: 'syarat + hasil', labelTr: 'koşul + sonuç', labelPl: 'warunek + rezultat', noteRU: 'Open стоит после if без will. Will стоит перед результатом work.', noteUK: 'Open стоїть після if без will. Will стоїть перед результатом work.', noteES: 'Open comes after if without will. Will comes before the result work.', notePtBr: 'Open vem depois de if sem will. Will vem antes do resultado work.', noteVi: 'Open đứng sau if không có will. Will đứng trước kết quả work.', noteId: 'Open datang setelah if tanpa will. Will berada sebelum hasil work.', noteTr: 'Open, if sonrasında will olmadan gelir. Will, sonuç olan work önünde durur.', notePl: 'Open stoi po if bez will. Will stoi przed rezultatem work.' },
      { labelRU: 'he / she / it', labelUK: 'he / she / it', labelES: 'he / she / it', en: [{ text: 'If', tone: 'accent' }, { text: ' he finds the keys, he ' }, { text: 'will', tone: 'warning' }, { text: ' call us' }], ru: 'Если он найдёт ключи, он позвонит нам', uk: 'Якщо він знайде ключі, він зателефонує нам', es: 'Si él encuentra las llaves, nos llamará',
      'pt-BR': 'Se ele encontrar as chaves, ele vai nos ligar',
      vi: 'Nếu anh ấy tìm thấy chìa khóa, anh ấy sẽ gọi cho chúng ta',
      id: 'Jika dia menemukan kuncinya, dia akan menelepon kita',
      tr: 'Anahtarları bulursa bizi arayacak',
      pl: 'Jeśli znajdzie klucze, zadzwoni do nas', labelPtBr: 'he / she / it', labelVi: 'he / she / it', labelId: 'he / she / it', labelTr: 'he / she / it', labelPl: 'he / she / it', noteRU: 'После he в условии нужно finds, потому что это Present Simple.', noteUK: 'Після he в умові потрібно finds, бо це Present Simple.', noteES: 'After he in the condition, use finds because it is Present Simple.', notePtBr: 'Depois de he na condição, use finds, porque é Present Simple.', noteVi: 'Sau he trong điều kiện, dùng finds vì đây là Present Simple.', noteId: 'Setelah he dalam syarat, gunakan finds karena ini Present Simple.', noteTr: 'Koşulda he sonrasında finds kullanılır, çünkü bu Present Simple.', notePl: 'Po he w warunku użyj finds, bo to Present Simple.' },
    ],
  },
  {
    lessonId: 26,
    screenId: 'lesson_26_intro_2_negative_conditions',
    order: 2,
    kind: 'formula',
    titleRU: 'Если НЕ случится',
    titleUK: 'Якщо НЕ станеться',
    titleES: 'If it does not happen',
    titlePtBr: 'Se NÃO acontecer',
    titleVi: 'Nếu điều đó KHÔNG xảy ra',
    titleId: 'Jika itu TIDAK terjadi',
    titleTr: 'Eğer gerçekleşmezse',
    titlePl: 'Jeśli to się NIE stanie',
    subtitleRU: 'Отрицание внутри if-части строится через do not / does not, но will всё равно остаётся во второй части.',
    subtitleUK: 'Заперечення всередині if-частини будується через do not / does not, але will все одно залишається у другій частині.',
    subtitleES: 'The negative inside the if-part uses do not / does not, but will stays in the result part.',
    subtitlePtBr: 'A negativa dentro da parte com if usa do not / does not, mas will continua na parte do resultado.',
    subtitleVi: 'Phủ định trong phần if dùng do not / does not, nhưng will vẫn ở phần kết quả.',
    subtitleId: 'Negasi di bagian if memakai do not / does not, tetapi will tetap berada di bagian hasil.',
    subtitleTr: 'if bölümündeki olumsuzluk do not / does not ile kurulur, ama will sonuç bölümünde kalır.',
    subtitlePl: 'Przeczenie w części z if buduje się przez do not / does not, ale will zostaje w części z rezultatem.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + кто + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + действие, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + результат', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you ' }, { text: 'do not', tone: 'danger' }, { text: ' call me, I ' }, { text: 'will', tone: 'warning' }, { text: ' wait' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start without her' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' they ' }, { text: 'do not', tone: 'danger' }, { text: ' help us, we ' }, { text: 'will', tone: 'warning' }, { text: ' do it ourselves' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' it ' }, { text: 'does not', tone: 'danger' }, { text: ' work, I ' }, { text: 'will', tone: 'warning' }, { text: ' check it' }] },
      { type: 'spacer' },
      { type: 'tip', parts: [{ text: 'После does not действие снова обычное: ', tone: 'strong' }, { text: 'come, find, work, sleep' }, { text: '. Не comes / works.', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'If she does not comes, we will start', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + хто + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + дія, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + результат', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you ' }, { text: 'do not', tone: 'danger' }, { text: ' call me, I ' }, { text: 'will', tone: 'warning' }, { text: ' wait' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start without her' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + who + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + action, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + result', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' it ' }, { text: 'does not', tone: 'danger' }, { text: ' work, I ' }, { text: 'will', tone: 'warning' }, { text: ' check it' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + quem + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + ação, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + resultado', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you ' }, { text: 'do not', tone: 'danger' }, { text: ' call me, I ' }, { text: 'will', tone: 'warning' }, { text: ' wait' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start without her' }] },
      { type: 'tip', parts: [{ text: 'Depois de does not, o verbo volta à forma base: ', tone: 'strong' }, { text: 'come, find, work, sleep' }, { text: '. Não comes / works.', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'If she does not comes, we will start', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + người/chủ ngữ + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + hành động, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + kết quả', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you ' }, { text: 'do not', tone: 'danger' }, { text: ' call me, I ' }, { text: 'will', tone: 'warning' }, { text: ' wait' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start without her' }] },
      { type: 'tip', parts: [{ text: 'Sau does not, động từ trở về dạng gốc: ', tone: 'strong' }, { text: 'come, find, work, sleep' }, { text: '. Không dùng comes / works.', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'If she does not comes, we will start', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + subjek + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + tindakan, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + hasil', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you ' }, { text: 'do not', tone: 'danger' }, { text: ' call me, I ' }, { text: 'will', tone: 'warning' }, { text: ' wait' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start without her' }] },
      { type: 'tip', parts: [{ text: 'Setelah does not, kata kerja kembali ke bentuk dasar: ', tone: 'strong' }, { text: 'come, find, work, sleep' }, { text: '. Bukan comes / works.', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'If she does not comes, we will start', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + özne + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + eylem, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + sonuç', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you ' }, { text: 'do not', tone: 'danger' }, { text: ' call me, I ' }, { text: 'will', tone: 'warning' }, { text: ' wait' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start without her' }] },
      { type: 'tip', parts: [{ text: 'does not sonrasında fiil yeniden yalın hale döner: ', tone: 'strong' }, { text: 'come, find, work, sleep' }, { text: '. comes / works değil.', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'If she does not comes, we will start', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + kto + ', tone: 'formula' }, { text: 'do not / does not', tone: 'danger' }, { text: ' + czynność, + ', tone: 'formula' }, { text: 'will', tone: 'warning' }, { text: ' + rezultat', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you ' }, { text: 'do not', tone: 'danger' }, { text: ' call me, I ' }, { text: 'will', tone: 'warning' }, { text: ' wait' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' she ' }, { text: 'does not', tone: 'danger' }, { text: ' come, we ' }, { text: 'will', tone: 'warning' }, { text: ' start without her' }] },
      { type: 'tip', parts: [{ text: 'Po does not czasownik wraca do formy podstawowej: ', tone: 'strong' }, { text: 'come, find, work, sleep' }, { text: '. Nie comes / works.', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'If she does not comes, we will start', tone: 'danger' }] },
    ],
  },
  {
    lessonId: 26,
    screenId: 'lesson_26_intro_3_questions_with_if',
    order: 3,
    kind: 'formula',
    titleRU: 'Вопросы с if',
    titleUK: 'Питання з if',
    titleES: 'Questions with if',
    titlePtBr: 'Perguntas com if',
    titleVi: 'Câu hỏi với if',
    titleId: 'Pertanyaan dengan if',
    titleTr: 'if ile sorular',
    titlePl: 'Pytania z if',
    subtitleRU: 'В вопросах will выходит в начало, а if-часть всё равно остаётся без will.',
    subtitleUK: 'У питаннях will виходить на початок, а if-частина все одно залишається без will.',
    subtitleES: 'In questions, will moves to the front, but the if-part still has no will.',
    subtitlePtBr: 'Nas perguntas, will vai para o início, mas a parte com if continua sem will.',
    subtitleVi: 'Trong câu hỏi, will đứng lên đầu, nhưng phần if vẫn không có will.',
    subtitleId: 'Dalam pertanyaan, will pindah ke depan, tetapi bagian if tetap tanpa will.',
    subtitleTr: 'Sorularda will başa gelir, ama if bölümü yine will almaz.',
    subtitlePl: 'W pytaniach will idzie na początek, ale część z if nadal nie ma will.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + кто + действие + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + условие?', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' she call me ' }, { text: 'if', tone: 'accent' }, { text: ' she has time?' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' it work ' }, { text: 'if', tone: 'accent' }, { text: ' I restart the app?' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'What / Where / Who / How', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + кто + действие + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + условие?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
      { type: 'correct', parts: [{ text: 'Where', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' we go ' }, { text: 'if', tone: 'accent' }, { text: ' they come?' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'Will she calls me if she has time?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'Will', tone: 'warning' }, { text: ' she call me ' }, { text: 'if', tone: 'accent' }, { text: ' she has time?' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'What will you do if it will rain?', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + хто + дія + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + умова?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
      { type: 'formula', parts: [{ text: 'What / Where / Who / How', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + хто + дія + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + умова?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + who + action + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + condition?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + quem + ação + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + condição?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
      { type: 'formula', parts: [{ text: 'What / Where / Who / How', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + quem + ação + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + condição?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'What will you do if it will rain?', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + ai + hành động + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + điều kiện?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
      { type: 'formula', parts: [{ text: 'What / Where / Who / How', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + ai + hành động + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + điều kiện?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'What will you do if it will rain?', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + siapa + tindakan + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + syarat?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
      { type: 'formula', parts: [{ text: 'What / Where / Who / How', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + siapa + tindakan + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + syarat?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'What will you do if it will rain?', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + kim + eylem + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + koşul?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
      { type: 'formula', parts: [{ text: 'What / Where / Who / How', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + kim + eylem + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + koşul?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'What will you do if it will rain?', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'Will', tone: 'warning' }, { text: ' + kto + czynność + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + warunek?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Will', tone: 'warning' }, { text: ' you help me ' }, { text: 'if', tone: 'accent' }, { text: ' I ask?' }] },
      { type: 'formula', parts: [{ text: 'What / Where / Who / How', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'will', tone: 'warning' }, { text: ' + kto + czynność + ', tone: 'formula' }, { text: 'if', tone: 'accent' }, { text: ' + warunek?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'What', tone: 'accent' }, { text: ' ' }, { text: 'will', tone: 'warning' }, { text: ' you do ' }, { text: 'if', tone: 'accent' }, { text: ' it rains?' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'What will you do if it will rain?', tone: 'danger' }] },
    ],
  },
  {
    lessonId: 26,
    screenId: 'lesson_26_intro_4_zero_conditional_commands_practice',
    order: 4,
    kind: 'practice',
    titleRU: 'Правила, факты и команды',
    titleUK: 'Правила, факти і команди',
    titleES: 'Rules, facts, and commands',
    titlePtBr: 'Regras, fatos e comandos',
    titleVi: 'Quy tắc, sự thật và mệnh lệnh',
    titleId: 'Aturan, fakta, dan perintah',
    titleTr: 'Kurallar, gerçekler ve komutlar',
    titlePl: 'Reguły, fakty i polecenia',
    subtitleRU: 'Не все if-фразы про будущее. Иногда if говорит о правиле, факте или инструкции.',
    subtitleUK: 'Не всі if-фрази про майбутнє. Іноді if говорить про правило, факт або інструкцію.',
    subtitleES: 'Not every if-sentence is about the future. Sometimes if shows a rule, fact, or instruction.',
    subtitlePtBr: 'Nem toda frase com if fala do futuro. Às vezes if mostra uma regra, fato ou instrução.',
    subtitleVi: 'Không phải mọi câu với if đều nói về tương lai. Đôi khi if chỉ quy tắc, sự thật hoặc hướng dẫn.',
    subtitleId: 'Tidak semua kalimat if membicarakan masa depan. Kadang if menunjukkan aturan, fakta, atau instruksi.',
    subtitleTr: 'Her if cümlesi gelecek hakkında değildir. Bazen if bir kuralı, gerçeği ya da talimatı gösterir.',
    subtitlePl: 'Nie każde zdanie z if mówi o przyszłości. Czasem if pokazuje regułę, fakt albo instrukcję.',
    linesRU: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = факт / правило', tone: 'formula' }] },
      { type: 'spacer' },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' people do not sleep, they feel tired' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you study every day, you learn faster' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you press this button, the app starts' }] },
      { type: 'spacer' },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + условие, + команда', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you are tired, rest' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you see a mistake, fix it' }] },
      { type: 'spacer' },
      { type: 'step', parts: [{ text: '1. Реальное будущее? ', tone: 'muted' }, { text: 'If + Present, will + действие', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '2. Общее правило / факт? ', tone: 'muted' }, { text: 'If + Present, Present', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Инструкция? ', tone: 'muted' }, { text: 'If + Present, команда', tone: 'accent' }] },
      { type: 'spacer' },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'If you will need help, call me', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
      { type: 'wrong', parts: [{ text: 'Не так: ', tone: 'warning' }, { text: 'If you heat water, it will gets hot', tone: 'danger' }] },
      { type: 'correct', parts: [{ text: 'Правильно: ', tone: 'success' }, { text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'tip', parts: [{ text: 'Главный навык урока: ', tone: 'strong' }, { text: 'после If почти всегда сначала проверяй Present Simple, а will ставь только там, где нужен будущий результат.' }] },
    ],
    linesUK: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = факт / правило', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you study every day, you learn faster' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + умова, + команда', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
    ],
    linesES: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = rule / fact', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + condition, + command', tone: 'formula' }] },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = regra / fato', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you study every day, you learn faster' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + condição, + comando', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
      { type: 'step', parts: [{ text: '1. Futuro real? ', tone: 'muted' }, { text: 'If + Present, will + ação', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '2. Regra / fato geral? ', tone: 'muted' }, { text: 'If + Present, Present', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Instrução? ', tone: 'muted' }, { text: 'If + Present, comando', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'If you will need help, call me', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = quy tắc / sự thật', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you study every day, you learn faster' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + điều kiện, + mệnh lệnh', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
      { type: 'step', parts: [{ text: '1. Tương lai thật? ', tone: 'muted' }, { text: 'If + Present, will + hành động', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '2. Quy tắc / sự thật chung? ', tone: 'muted' }, { text: 'If + Present, Present', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Hướng dẫn? ', tone: 'muted' }, { text: 'If + Present, mệnh lệnh', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'If you will need help, call me', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = aturan / fakta', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you study every day, you learn faster' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + syarat, + perintah', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
      { type: 'step', parts: [{ text: '1. Masa depan nyata? ', tone: 'muted' }, { text: 'If + Present, will + tindakan', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '2. Aturan / fakta umum? ', tone: 'muted' }, { text: 'If + Present, Present', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Instruksi? ', tone: 'muted' }, { text: 'If + Present, perintah', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'If you will need help, call me', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = kural / gerçek', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you study every day, you learn faster' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + koşul, + komut', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
      { type: 'step', parts: [{ text: '1. Gerçek gelecek mi? ', tone: 'muted' }, { text: 'If + Present, will + eylem', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '2. Genel kural / gerçek mi? ', tone: 'muted' }, { text: 'If + Present, Present', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Talimat mı? ', tone: 'muted' }, { text: 'If + Present, komut', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'If you will need help, call me', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + Present Simple, + Present Simple', tone: 'formula' }, { text: ' = reguła / fakt', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you heat water, it gets hot' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you study every day, you learn faster' }] },
      { type: 'formula', parts: [{ text: 'If', tone: 'accent' }, { text: ' + warunek, + polecenie', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'If', tone: 'accent' }, { text: ' you need help, call me' }] },
      { type: 'step', parts: [{ text: '1. Realna przyszłość? ', tone: 'muted' }, { text: 'If + Present, will + czynność', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '2. Ogólna reguła / fakt? ', tone: 'muted' }, { text: 'If + Present, Present', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '3. Instrukcja? ', tone: 'muted' }, { text: 'If + Present, polecenie', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'If you will need help, call me', tone: 'danger' }] },
    ],
  },
];

export const LESSON_27_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 27,
    screenId: 'lesson_27_intro_1_said_that_backshift',
    order: 1,
    kind: 'concept',

    titleRU: 'Когда пересказываешь чужие слова',
    titleUK: 'Коли переказуєш чужі слова',
    titleES: 'When you report someone’s words',
    titlePtBr: 'Quando você relata as palavras de outra pessoa',
    titleVi: 'Khi bạn thuật lại lời của người khác',
    titleId: 'Saat kamu melaporkan kata-kata orang lain',
    titleTr: 'Başkasının sözlerini aktarırken',
    titlePl: 'Kiedy relacjonujesz czyjeś słowa',

    subtitleRU: 'В этом уроке ты не говоришь фразу напрямую. Ты пересказываешь, что кто-то сказал.',
    subtitleUK: 'У цьому уроці ти не говориш фразу напряму. Ти переказуєш, що хтось сказав.',
    subtitleES: 'In this lesson, you do not say the sentence directly. You report what someone said.',
    subtitlePtBr: 'Nesta lição, você não diz a frase diretamente. Você relata o que alguém disse.',
    subtitleVi: 'Trong bài này, bạn không nói câu trực tiếp. Bạn thuật lại điều ai đó đã nói.',
    subtitleId: 'Dalam pelajaran ini, kamu tidak mengucapkan kalimat secara langsung. Kamu melaporkan apa yang dikatakan seseorang.',
    subtitleTr: 'Bu derste cümleyi doğrudan söylemezsin. Birinin ne söylediğini aktarırsın.',
    subtitlePl: 'W tej lekcji nie mówisz zdania bezpośrednio. Relacjonujesz, co ktoś powiedział.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Прямая речь звучит так: ', tone: 'normal' },
          { text: '"I am tired"', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'text',
        parts: [
          { text: 'Но если ты пересказываешь чужие слова, появляется рамка:', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'кто сказал', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'said that', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'пересказ', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' busy', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'were', tone: 'warning' },
          { text: ' ready', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'were', tone: 'warning' },
          { text: ' at home', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'text',
        parts: [
          { text: 'После said that в этом уроке настоящее часто сдвигается назад:', tone: 'normal' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'am / is -> ', tone: 'normal' },
          { text: 'was', tone: 'warning' },
          { text: ' / ', tone: 'muted' },
          { text: 'are -> ', tone: 'normal' },
          { text: 'were', tone: 'warning' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'need -> ', tone: 'normal' },
          { text: 'needed', tone: 'warning' },
          { text: ' / ', tone: 'muted' },
          { text: 'want -> ', tone: 'normal' },
          { text: 'wanted', tone: 'warning' },
          { text: ' / ', tone: 'muted' },
          { text: 'know -> ', tone: 'normal' },
          { text: 'knew', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'needed', tone: 'warning' },
          { text: ' help', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'wanted', tone: 'warning' },
          { text: ' coffee', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'knew', tone: 'warning' },
          { text: ' the answer', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He said that he is tired', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно в этом уроке: ', tone: 'success' },
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'Пряма мова звучить так: ', tone: 'normal' },
          { text: '"I am tired"', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'хто сказав', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'said that', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'переказ', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'were', tone: 'warning' },
          { text: ' ready', tone: 'normal' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'am / is -> ', tone: 'normal' },
          { text: 'was', tone: 'warning' },
          { text: ' / ', tone: 'muted' },
          { text: 'are -> ', tone: 'normal' },
          { text: 'were', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'Direct speech: ', tone: 'normal' },
          { text: '"I am tired"', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'who said it', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'said that', tone: 'accent' },
          { text: ' + reported idea', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'text', parts: [{ text: 'Discurso direto: ', tone: 'normal' }, { text: '"I am tired"', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'quem disse', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'said that', tone: 'accent' }, { text: ' + ideia relatada', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' tired', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'were', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'am / is -> ', tone: 'normal' }, { text: 'was', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'are -> ', tone: 'normal' }, { text: 'were', tone: 'warning' }] },
      { type: 'example', parts: [{ text: 'need -> ', tone: 'normal' }, { text: 'needed', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'know -> ', tone: 'normal' }, { text: 'knew', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'He said that he is tired', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'text', parts: [{ text: 'Lời nói trực tiếp: ', tone: 'normal' }, { text: '"I am tired"', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'người nói', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'said that', tone: 'accent' }, { text: ' + ý được thuật lại', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' tired', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'were', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'am / is -> ', tone: 'normal' }, { text: 'was', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'are -> ', tone: 'normal' }, { text: 'were', tone: 'warning' }] },
      { type: 'example', parts: [{ text: 'need -> ', tone: 'normal' }, { text: 'needed', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'know -> ', tone: 'normal' }, { text: 'knew', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'He said that he is tired', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'text', parts: [{ text: 'Ucapan langsung: ', tone: 'normal' }, { text: '"I am tired"', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'siapa yang berkata', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'said that', tone: 'accent' }, { text: ' + ide yang dilaporkan', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' tired', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'were', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'am / is -> ', tone: 'normal' }, { text: 'was', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'are -> ', tone: 'normal' }, { text: 'were', tone: 'warning' }] },
      { type: 'example', parts: [{ text: 'need -> ', tone: 'normal' }, { text: 'needed', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'know -> ', tone: 'normal' }, { text: 'knew', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'He said that he is tired', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'text', parts: [{ text: 'Doğrudan konuşma: ', tone: 'normal' }, { text: '"I am tired"', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'kim söyledi', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'said that', tone: 'accent' }, { text: ' + aktarılan fikir', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' tired', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'were', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'am / is -> ', tone: 'normal' }, { text: 'was', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'are -> ', tone: 'normal' }, { text: 'were', tone: 'warning' }] },
      { type: 'example', parts: [{ text: 'need -> ', tone: 'normal' }, { text: 'needed', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'know -> ', tone: 'normal' }, { text: 'knew', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'He said that he is tired', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'text', parts: [{ text: 'Mowa bezpośrednia: ', tone: 'normal' }, { text: '"I am tired"', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'kto powiedział', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'said that', tone: 'accent' }, { text: ' + relacjonowana myśl', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' tired', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'were', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'am / is -> ', tone: 'normal' }, { text: 'was', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'are -> ', tone: 'normal' }, { text: 'were', tone: 'warning' }] },
      { type: 'example', parts: [{ text: 'need -> ', tone: 'normal' }, { text: 'needed', tone: 'warning' }, { text: ' / ', tone: 'muted' }, { text: 'know -> ', tone: 'normal' }, { text: 'knew', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'He said that he is tired', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'was',
        labelUK: 'was',
        labelES: 'was',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' busy', tone: 'normal' },
        ],
        ru: 'Она сказала, что занята',
        uk: 'Вона сказала, що зайнята',
        es: 'Ella dijo que estaba ocupada',
        'pt-BR': 'Ela disse que estava ocupada',
        vi: 'Cô ấy nói rằng cô ấy bận',
        id: 'Dia berkata bahwa dia sibuk',
        tr: 'Meşgul olduğunu söyledi',
        pl: 'Powiedziała, że jest zajęta',
        labelPtBr: 'was',
        labelVi: 'was',
        labelId: 'was',
        labelTr: 'was',
        labelPl: 'was',
        noteRU: 'В этом уроке she is busy при пересказе становится she was busy.',
        noteUK: 'У цьому уроці she is busy у переказі стає she was busy.',
        noteES: 'In this lesson, she is busy becomes she was busy in reported speech.',
        notePtBr: 'Nesta lição, she is busy vira she was busy no discurso indireto.',
        noteVi: 'Trong bài này, she is busy chuyển thành she was busy trong lời nói gián tiếp.',
        noteId: 'Dalam pelajaran ini, she is busy berubah menjadi she was busy dalam reported speech.',
        noteTr: 'Bu derste she is busy, aktarmada she was busy olur.',
        notePl: 'W tej lekcji she is busy w mowie zależnej zmienia się w she was busy.',
      },
      {
        labelRU: 'needed',
        labelUK: 'needed',
        labelES: 'needed',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'needed', tone: 'warning' },
          { text: ' help', tone: 'normal' },
        ],
        ru: 'Я сказал, что мне нужна помощь',
        uk: 'Я сказав, що мені потрібна допомога',
        es: 'Dije que necesitaba ayuda',
        'pt-BR': 'Eu disse que precisava de ajuda',
        vi: 'Tôi nói rằng tôi cần giúp đỡ',
        id: 'Saya berkata bahwa saya membutuhkan bantuan',
        tr: 'Yardıma ihtiyacım olduğunu söyledim',
        pl: 'Powiedziałem, że potrzebuję pomocy',
        labelPtBr: 'needed',
        labelVi: 'needed',
        labelId: 'needed',
        labelTr: 'needed',
        labelPl: 'needed',
        noteRU: 'Need сдвигается в needed.',
        noteUK: 'Need зсувається в needed.',
        noteES: 'Need shifts to needed.',
        notePtBr: 'Need passa para needed.',
        noteVi: 'Need lùi thì thành needed.',
        noteId: 'Need bergeser menjadi needed.',
        noteTr: 'Need, needed biçimine kayar.',
        notePl: 'Need cofa się do needed.',
      },
    ],
  },

  {
    lessonId: 27,
    screenId: 'lesson_27_intro_2_will_can_shift',
    order: 2,
    kind: 'formula',

    titleRU: 'will становится would, can становится could',
    titleUK: 'will стає would, can стає could',
    titleES: 'will becomes would, can becomes could',
    titlePtBr: 'will vira would, can vira could',
    titleVi: 'will thành would, can thành could',
    titleId: 'will menjadi would, can menjadi could',
    titleTr: 'will, would olur; can, could olur',
    titlePl: 'will zmienia się w would, can w could',

    subtitleRU: 'Когда пересказываешь будущее или возможность, в этом уроке will и can сдвигаются назад.',
    subtitleUK: 'Коли переказуєш майбутнє або можливість, у цьому уроці will і can зсуваються назад.',
    subtitleES: 'When reporting future or ability, this lesson shifts will and can back.',
    subtitlePtBr: 'Ao relatar futuro ou capacidade, esta lição desloca will e can para trás.',
    subtitleVi: 'Khi thuật lại tương lai hoặc khả năng, bài này lùi will và can về sau.',
    subtitleId: 'Saat melaporkan masa depan atau kemampuan, pelajaran ini menggeser will dan can ke bentuk lampau.',
    subtitleTr: 'Geleceği ya da beceriyi aktarırken bu derste will ve can geriye kayar.',
    subtitlePl: 'Gdy relacjonujesz przyszłość albo możliwość, ta lekcja cofa will i can.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'will -> ', tone: 'normal' },
          { text: 'would', tone: 'warning' },
          { text: ' после said that', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' help us', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' come later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' finish today', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' send the message', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'can -> ', tone: 'normal' },
          { text: 'could', tone: 'warning' },
          { text: ' после said that', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' help', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' call him', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' find it', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' work today', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'could not', tone: 'danger' },
          { text: ' = не мог / не могла / не могли', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'could not', tone: 'danger' },
          { text: ' wait', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'could not', tone: 'danger' },
          { text: ' hear me', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He said that he will call me', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно в этом уроке: ', tone: 'success' },
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call me', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'will -> ', tone: 'normal' },
          { text: 'would', tone: 'warning' },
          { text: ' після said that', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call me', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'can -> ', tone: 'normal' },
          { text: 'could', tone: 'warning' },
          { text: ' після said that', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' help', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'will -> ', tone: 'normal' },
          { text: 'would', tone: 'warning' },
          { text: ' after said that', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'can -> ', tone: 'normal' },
          { text: 'could', tone: 'warning' },
          { text: ' after said that', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call me', tone: 'normal' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'will -> ', tone: 'normal' }, { text: 'would', tone: 'warning' }, { text: ' depois de said that', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call me', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' come later', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'can -> ', tone: 'normal' }, { text: 'could', tone: 'warning' }, { text: ' depois de said that', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'could', tone: 'warning' }, { text: ' help', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'could not', tone: 'danger' }, { text: ' = não podia / não conseguiu', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'He said that he will call me', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'will -> ', tone: 'normal' }, { text: 'would', tone: 'warning' }, { text: ' sau said that', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call me', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' come later', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'can -> ', tone: 'normal' }, { text: 'could', tone: 'warning' }, { text: ' sau said that', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'could', tone: 'warning' }, { text: ' help', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'could not', tone: 'danger' }, { text: ' = không thể / đã không thể', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'He said that he will call me', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'will -> ', tone: 'normal' }, { text: 'would', tone: 'warning' }, { text: ' setelah said that', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call me', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' come later', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'can -> ', tone: 'normal' }, { text: 'could', tone: 'warning' }, { text: ' setelah said that', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'could', tone: 'warning' }, { text: ' help', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'could not', tone: 'danger' }, { text: ' = tidak bisa / tidak dapat', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'He said that he will call me', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'will -> ', tone: 'normal' }, { text: 'would', tone: 'warning' }, { text: ' said that sonrasında', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call me', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' come later', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'can -> ', tone: 'normal' }, { text: 'could', tone: 'warning' }, { text: ' said that sonrasında', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'could', tone: 'warning' }, { text: ' help', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'could not', tone: 'danger' }, { text: ' = yapamadı / edemedi', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'He said that he will call me', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'will -> ', tone: 'normal' }, { text: 'would', tone: 'warning' }, { text: ' po said that', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call me', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'They ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' they ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' come later', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'can -> ', tone: 'normal' }, { text: 'could', tone: 'warning' }, { text: ' po said that', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'could', tone: 'warning' }, { text: ' help', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'could not', tone: 'danger' }, { text: ' = nie mógł / nie mogła / nie mogli', tone: 'formula' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'He said that he will call me', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'would',
        labelUK: 'would',
        labelES: 'would',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' open the door', tone: 'normal' },
        ],
        ru: 'Она сказала, что откроет дверь',
        uk: 'Вона сказала, що відчинить двері',
        es: 'Ella dijo que abriría la puerta',
        'pt-BR': 'Ela disse que abriria a porta',
        vi: 'Cô ấy nói rằng cô ấy sẽ mở cửa',
        id: 'Dia berkata bahwa dia akan membuka pintu',
        tr: 'Kapıyı açacağını söyledi',
        pl: 'Powiedziała, że otworzy drzwi',
        labelPtBr: 'would',
        labelVi: 'would',
        labelId: 'would',
        labelTr: 'would',
        labelPl: 'would',
        noteRU: 'Will open при пересказе становится would open.',
        noteUK: 'Will open у переказі стає would open.',
        noteES: 'Will open becomes would open in reported speech.',
        notePtBr: 'Will open vira would open no discurso indireto.',
        noteVi: 'Will open chuyển thành would open trong lời nói gián tiếp.',
        noteId: 'Will open menjadi would open dalam reported speech.',
        noteTr: 'Will open, aktarmada would open olur.',
        notePl: 'Will open w mowie zależnej zmienia się w would open.',
      },
      {
        labelRU: 'could',
        labelUK: 'could',
        labelES: 'could',
        en: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'could', tone: 'warning' },
          { text: ' find it', tone: 'normal' },
        ],
        ru: 'Они сказали, что могли найти это',
        uk: 'Вони сказали, що могли знайти це',
        es: 'Ellos dijeron que podían encontrarlo',
        'pt-BR': 'Eles disseram que poderiam encontrá-lo',
        vi: 'Họ nói rằng họ có thể tìm thấy nó',
        id: 'Mereka berkata bahwa mereka bisa menemukannya',
        tr: 'Onu bulabileceklerini söylediler',
        pl: 'Powiedzieli, że mogą to znaleźć',
        labelPtBr: 'could',
        labelVi: 'could',
        labelId: 'could',
        labelTr: 'could',
        labelPl: 'could',
        noteRU: 'Can find при пересказе становится could find.',
        noteUK: 'Can find у переказі стає could find.',
        noteES: 'Can find becomes could find.',
        notePtBr: 'Can find vira could find.',
        noteVi: 'Can find chuyển thành could find.',
        noteId: 'Can find menjadi could find.',
        noteTr: 'Can find, could find olur.',
        notePl: 'Can find zmienia się w could find.',
      },
    ],
  },

  {
    lessonId: 27,
    screenId: 'lesson_27_intro_3_negatives_and_had_v3',
    order: 3,
    kind: 'formula',

    titleRU: 'did not и had + V3',
    titleUK: 'did not і had + V3',
    titleES: 'did not and had + V3',
    titlePtBr: 'did not e had + V3',
    titleVi: 'did not và had + V3',
    titleId: 'did not dan had + V3',
    titleTr: 'did not ve had + V3',
    titlePl: 'did not i had + V3',

    subtitleRU: 'В пересказе отрицания и уже завершённые действия тоже сдвигаются назад.',
    subtitleUK: 'У переказі заперечення і вже завершені дії теж зсуваються назад.',
    subtitleES: 'In reported speech, negatives and completed actions also shift back.',
    subtitlePtBr: 'No discurso indireto, negativas e ações já concluídas também se deslocam para trás.',
    subtitleVi: 'Trong lời nói gián tiếp, phủ định và hành động đã hoàn thành cũng lùi thì.',
    subtitleId: 'Dalam reported speech, negasi dan tindakan yang sudah selesai juga bergeser ke belakang.',
    subtitleTr: 'Aktarmada olumsuzluklar ve zaten tamamlanmış eylemler de geriye kayar.',
    subtitlePl: 'W mowie zależnej przeczenia i już zakończone czynności też cofają się w czasie.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'said that + did not + обычный глагол', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' know', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' remember', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' have money', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' need help', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' understand', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'После did not глагол обычный: ', tone: 'strong' },
          { text: 'know, remember, have, need, understand.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He said that he did not knew', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' know', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'said that + ', tone: 'formula' },
          { text: 'had', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'V3', tone: 'warning' },
          { text: ' = сказал, что уже сделал', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' finished', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' called me', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' sent documents', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' found the keys', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' already paid', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'We said that we found the keys', tone: 'danger' },
          { text: ' если нужно "мы сказали, что уже нашли"', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'We ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' found the keys', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'said that + did not + звичайне дієслово', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' know', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that + ', tone: 'formula' },
          { text: 'had', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' finished', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'said that + did not + base verb', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that + ', tone: 'formula' },
          { text: 'had', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' finished', tone: 'warning' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'said that + did not + verbo base', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' know', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Depois de did not, use o verbo base: ', tone: 'strong' }, { text: 'know, remember, have, need.', tone: 'normal' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'He said that he did not knew', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'said that + ', tone: 'formula' }, { text: 'had', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = disse que já tinha feito', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' finished', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'We said that we found the keys', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'said that + did not + động từ nguyên mẫu', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' know', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Sau did not, dùng động từ nguyên mẫu: ', tone: 'strong' }, { text: 'know, remember, have, need.', tone: 'normal' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'He said that he did not knew', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'said that + ', tone: 'formula' }, { text: 'had', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = nói rằng đã làm xong', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' finished', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'We said that we found the keys', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'said that + did not + kata kerja dasar', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' know', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Setelah did not, gunakan kata kerja dasar: ', tone: 'strong' }, { text: 'know, remember, have, need.', tone: 'normal' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'He said that he did not knew', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'said that + ', tone: 'formula' }, { text: 'had', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = berkata bahwa sudah melakukan', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' finished', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'We said that we found the keys', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'said that + did not + fiilin yalın hali', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' know', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'did not sonrasında fiilin yalın hali gelir: ', tone: 'strong' }, { text: 'know, remember, have, need.', tone: 'normal' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'He said that he did not knew', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'said that + ', tone: 'formula' }, { text: 'had', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = zaten yapmış olduğunu söyledi', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' finished', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'We said that we found the keys', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'said that + did not + forma podstawowa czasownika', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' know', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Po did not użyj formy podstawowej: ', tone: 'strong' }, { text: 'know, remember, have, need.', tone: 'normal' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'He said that he did not knew', tone: 'danger' }] },
      { type: 'formula', parts: [{ text: 'said that + ', tone: 'formula' }, { text: 'had', tone: 'accent' }, { text: ' + ', tone: 'muted' }, { text: 'V3', tone: 'warning' }, { text: ' = powiedział, że już zrobił', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'said that', tone: 'accent' }, { text: ' he ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' finished', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'We said that we found the keys', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'did not',
        labelUK: 'did not',
        labelES: 'did not',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' remember', tone: 'normal' },
        ],
        ru: 'Она сказала, что не помнила',
        uk: 'Вона сказала, що не памʼятала',
        es: 'Ella dijo que no recordaba',
        'pt-BR': 'Ela disse que não se lembrava',
        vi: 'Cô ấy nói rằng cô ấy không nhớ',
        id: 'Dia berkata bahwa dia tidak ingat',
        tr: 'Hatırlamadığını söyledi',
        pl: 'Powiedziała, że nie pamięta',
        labelPtBr: 'did not',
        labelVi: 'did not',
        labelId: 'did not',
        labelTr: 'did not',
        labelPl: 'did not',
        noteRU: 'После did not используем remember, не remembered.',
        noteUK: 'Після did not використовуємо remember, не remembered.',
        noteES: 'After did not, use remember, not remembered.',
        notePtBr: 'Depois de did not, use remember, não remembered.',
        noteVi: 'Sau did not, dùng remember, không dùng remembered.',
        noteId: 'Setelah did not, gunakan remember, bukan remembered.',
        noteTr: 'did not sonrasında remembered değil, remember kullanılır.',
        notePl: 'Po did not użyj remember, nie remembered.',
      },
      {
        labelRU: 'had + V3',
        labelUK: 'had + V3',
        labelES: 'had + V3',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' I ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' lost my phone', tone: 'warning' },
        ],
        ru: 'Я сказал, что потерял свой телефон',
        uk: 'Я сказав, що загубив свій телефон',
        es: 'Dije que había perdido mi teléfono',
        'pt-BR': 'Eu disse que tinha perdido meu telefone',
        vi: 'Tôi nói rằng tôi đã làm mất điện thoại của mình',
        id: 'Saya berkata bahwa saya telah kehilangan ponsel saya',
        tr: 'Telefonumu kaybettiğimi söyledim',
        pl: 'Powiedziałem, że zgubiłem telefon',
        labelPtBr: 'had + V3',
        labelVi: 'had + V3',
        labelId: 'had + V3',
        labelTr: 'had + V3',
        labelPl: 'had + V3',
        noteRU: 'Lost здесь третья форма после had.',
        noteUK: 'Lost тут третя форма після had.',
        noteES: 'Lost is V3 after had here.',
        notePtBr: 'Lost aqui é V3 depois de had.',
        noteVi: 'Lost ở đây là V3 sau had.',
        noteId: 'Lost di sini adalah V3 setelah had.',
        noteTr: 'Lost burada had sonrasında V3 biçimidir.',
        notePl: 'Lost jest tutaj formą V3 po had.',
      },
    ],
  },

  {
    lessonId: 27,
    screenId: 'lesson_27_intro_4_reporting_verbs_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'said, told, explained, promised',
    titleUK: 'said, told, explained, promised',
    titleES: 'said, told, explained, promised',
    titlePtBr: 'said, told, explained, promised',
    titleVi: 'said, told, explained, promised',
    titleId: 'said, told, explained, promised',
    titleTr: 'said, told, explained, promised',
    titlePl: 'said, told, explained, promised',

    subtitleRU: 'В конце урока меняется слово пересказа, но внутри всё равно нужна правильная структура.',
    subtitleUK: 'Наприкінці уроку змінюється слово переказу, але всередині все одно потрібна правильна структура.',
    subtitleES: 'At the end of the lesson, the reporting verb changes, but the structure inside still matters.',
    subtitlePtBr: 'No fim da lição, o verbo de relato muda, mas a estrutura interna ainda importa.',
    subtitleVi: 'Ở cuối bài, động từ tường thuật thay đổi, nhưng cấu trúc bên trong vẫn quan trọng.',
    subtitleId: 'Di akhir pelajaran, reporting verb berubah, tetapi struktur di dalamnya tetap penting.',
    subtitleTr: 'Dersin sonunda aktarma fiili değişir, ama içerideki yapı yine önemlidir.',
    subtitlePl: 'Pod koniec lekcji zmienia się czasownik relacjonujący, ale struktura w środku nadal jest ważna.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'said that', tone: 'accent' },
          { text: ' = сказал, что', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'told me / told us', tone: 'accent' },
          { text: ' = сказал мне / нам, что', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'explained / promised / warned / admitted / replied that', tone: 'accent' },
          { text: ' = объяснил / пообещал / предупредил / признал / ответил, что', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'told me that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' okay', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'told us that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' ready', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'explained that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' late', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'promised that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'warned us that', tone: 'accent' },
          { text: ' it ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' dangerous', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'admitted that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' made a mistake', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'replied that', tone: 'accent' },
          { text: ' everything ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' okay', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'step',
        parts: [
          { text: '1. Кто пересказывает? ', tone: 'muted' },
          { text: 'He said / She told us / They warned us', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Есть будущий смысл? ', tone: 'muted' },
          { text: 'will -> would', tone: 'warning' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Есть возможность? ', tone: 'muted' },
          { text: 'can -> could', tone: 'warning' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. Уже сделал до момента речи? ', tone: 'muted' },
          { text: 'had + V3', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '5. Отрицание в прошлом? ', tone: 'muted' },
          { text: 'did not + base verb', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She promised that she will call later', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'She ', tone: 'strong' },
          { text: 'promised that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'We admitted that we made a mistake', tone: 'danger' },
          { text: ' если нужно "мы признали, что уже сделали"', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'We ', tone: 'strong' },
          { text: 'admitted that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' made a mistake', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Главный навык урока: ', tone: 'strong' },
          { text: 'после reporting verb не копируй прямую речь. Проверь местоимение, время и форму глагола.', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'said that / told us that / promised that', tone: 'accent' },
          { text: ' + переказ', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'promised that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'admitted that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' made a mistake', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'said that / told us that / promised that', tone: 'accent' },
          { text: ' + reported idea', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'promised that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'said that / told us that / promised that', tone: 'accent' }, { text: ' + ideia relatada', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'told us that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'promised that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call later', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'admitted that', tone: 'accent' }, { text: ' we ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' made a mistake', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '1. Quem relata? ', tone: 'muted' }, { text: 'He said / She told us / They warned us', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '2. Sentido futuro? ', tone: 'muted' }, { text: 'will -> would', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '3. Já tinha acontecido? ', tone: 'muted' }, { text: 'had + V3', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'She promised that she will call later', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'said that / told us that / promised that', tone: 'accent' }, { text: ' + ý được thuật lại', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'told us that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'promised that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call later', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'admitted that', tone: 'accent' }, { text: ' we ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' made a mistake', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '1. Ai thuật lại? ', tone: 'muted' }, { text: 'He said / She told us / They warned us', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '2. Có ý tương lai? ', tone: 'muted' }, { text: 'will -> would', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '3. Đã xảy ra trước đó? ', tone: 'muted' }, { text: 'had + V3', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'She promised that she will call later', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'said that / told us that / promised that', tone: 'accent' }, { text: ' + ide yang dilaporkan', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'told us that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'promised that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call later', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'admitted that', tone: 'accent' }, { text: ' we ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' made a mistake', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '1. Siapa yang melaporkan? ', tone: 'muted' }, { text: 'He said / She told us / They warned us', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '2. Ada makna masa depan? ', tone: 'muted' }, { text: 'will -> would', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '3. Sudah terjadi sebelumnya? ', tone: 'muted' }, { text: 'had + V3', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'She promised that she will call later', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'said that / told us that / promised that', tone: 'accent' }, { text: ' + aktarılan fikir', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'told us that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'promised that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call later', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'admitted that', tone: 'accent' }, { text: ' we ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' made a mistake', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '1. Kim aktarıyor? ', tone: 'muted' }, { text: 'He said / She told us / They warned us', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '2. Gelecek anlamı var mı? ', tone: 'muted' }, { text: 'will -> would', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '3. Daha önce olmuş mu? ', tone: 'muted' }, { text: 'had + V3', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'She promised that she will call later', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'said that / told us that / promised that', tone: 'accent' }, { text: ' + relacjonowana myśl', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'told us that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'was', tone: 'warning' }, { text: ' ready', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'promised that', tone: 'accent' }, { text: ' she ', tone: 'strong' }, { text: 'would', tone: 'warning' }, { text: ' call later', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'We ', tone: 'strong' }, { text: 'admitted that', tone: 'accent' }, { text: ' we ', tone: 'strong' }, { text: 'had', tone: 'accent' }, { text: ' made a mistake', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '1. Kto relacjonuje? ', tone: 'muted' }, { text: 'He said / She told us / They warned us', tone: 'accent' }] },
      { type: 'step', parts: [{ text: '2. Jest sens przyszły? ', tone: 'muted' }, { text: 'will -> would', tone: 'warning' }] },
      { type: 'step', parts: [{ text: '3. Stało się wcześniej? ', tone: 'muted' }, { text: 'had + V3', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'She promised that she will call later', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'told us',
        labelUK: 'told us',
        labelES: 'told us',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'told us that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' ready', tone: 'normal' },
        ],
        ru: 'Она сказала нам, что готова',
        uk: 'Вона сказала нам, що готова',
        es: 'Ella nos dijo que estaba lista',
        'pt-BR': 'Ela nos disse que estava pronta',
        vi: 'Cô ấy nói với chúng tôi rằng cô ấy đã sẵn sàng',
        id: 'Dia memberi tahu kami bahwa dia siap',
        tr: 'Hazır olduğunu bize söyledi',
        pl: 'Powiedziała nam, że jest gotowa',
        labelPtBr: 'told us',
        labelVi: 'told us',
        labelId: 'told us',
        labelTr: 'told us',
        labelPl: 'told us',
        noteRU: 'После told нужен получатель: told us, told me.',
        noteUK: 'Після told потрібен отримувач: told us, told me.',
        noteES: 'After told, you need the receiver: told us, told me.',
        notePtBr: 'Depois de told, precisa de receptor: told us, told me.',
        noteVi: 'Sau told cần người nhận: told us, told me.',
        noteId: 'Setelah told, perlu penerima: told us, told me.',
        noteTr: 'told sonrasında alıcı gerekir: told us, told me.',
        notePl: 'Po told potrzebny jest odbiorca: told us, told me.',
      },
      {
        labelRU: 'warned us',
        labelUK: 'warned us',
        labelES: 'warned us',
        en: [
          { text: 'They ', tone: 'strong' },
          { text: 'warned us that', tone: 'accent' },
          { text: ' it ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' dangerous', tone: 'normal' },
        ],
        ru: 'Они предупредили нас, что это было опасно',
        uk: 'Вони попередили нас, що це було небезпечно',
        es: 'Ellos nos advirtieron que era peligroso',
        'pt-BR': 'Eles nos avisaram que era perigoso',
        vi: 'Họ cảnh báo chúng tôi rằng điều đó nguy hiểm',
        id: 'Mereka memperingatkan kami bahwa itu berbahaya',
        tr: 'Bunun tehlikeli olduğu konusunda bizi uyardılar',
        pl: 'Ostrzegli nas, że to było niebezpieczne',
        labelPtBr: 'warned us',
        labelVi: 'warned us',
        labelId: 'warned us',
        labelTr: 'warned us',
        labelPl: 'warned us',
        noteRU: 'warned us that работает как рамка пересказа.',
        noteUK: 'warned us that працює як рамка переказу.',
        noteES: 'warned us that works as a reporting frame.',
        notePtBr: 'warned us that funciona como uma moldura de relato.',
        noteVi: 'warned us that hoạt động như khung tường thuật.',
        noteId: 'warned us that berfungsi sebagai kerangka reported speech.',
        noteTr: 'warned us that bir aktarma çerçevesi gibi çalışır.',
        notePl: 'warned us that działa jak rama mowy zależnej.',
      },
      {
        labelRU: 'admitted',
        labelUK: 'admitted',
        labelES: 'admitted',
        en: [
          { text: 'We ', tone: 'strong' },
          { text: 'admitted that', tone: 'accent' },
          { text: ' we ', tone: 'strong' },
          { text: 'had', tone: 'accent' },
          { text: ' made a mistake', tone: 'warning' },
        ],
        ru: 'Мы признали, что сделали ошибку',
        uk: 'Ми визнали, що зробили помилку',
        es: 'Admitimos que habíamos cometido un error',
        'pt-BR': 'Nós admitimos que tínhamos cometido um erro',
        vi: 'Chúng tôi thừa nhận rằng chúng tôi đã mắc lỗi',
        id: 'Kami mengakui bahwa kami telah membuat kesalahan',
        tr: 'Bir hata yaptığımızı kabul ettik',
        pl: 'Przyznaliśmy, że popełniliśmy błąd',
        labelPtBr: 'admitted',
        labelVi: 'admitted',
        labelId: 'admitted',
        labelTr: 'admitted',
        labelPl: 'admitted',
        noteRU: 'had made показывает действие, которое уже было сделано к моменту признания.',
        noteUK: 'had made показує дію, яка вже була зроблена до моменту визнання.',
        noteES: 'had made shows the action was already completed before the admission.',
        notePtBr: 'had made mostra que a ação já estava concluída antes da admissão.',
        noteVi: 'had made cho thấy hành động đã hoàn thành trước lúc thừa nhận.',
        noteId: 'had made menunjukkan tindakan sudah selesai sebelum pengakuan.',
        noteTr: 'had made, eylemin itiraftan önce tamamlandığını gösterir.',
        notePl: 'had made pokazuje, że czynność była już zakończona przed przyznaniem.',
      },
    ],
  },
];

export const LESSON_28_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 28,
    screenId: 'lesson_28_intro_1_reflexive_core',
    order: 1,
    kind: 'concept',

    titleRU: 'Когда действие возвращается на себя',
    titleUK: 'Коли дія повертається на себе',
    titleES: 'When the action goes back to yourself',
    titlePtBr: 'Quando a ação volta para a própria pessoa',
    titleVi: 'Khi hành động quay lại chính người làm',
    titleId: 'Saat tindakan kembali ke diri sendiri',
    titleTr: 'Eylem kişinin kendisine döndüğünde',
    titlePl: 'Kiedy czynność wraca do tej samej osoby',

    subtitleRU: 'myself / yourself / himself показывают, что человек делает действие с самим собой.',
    subtitleUK: 'myself / yourself / himself показують, що людина робить дію із самою собою.',
    subtitleES: 'myself / yourself / himself show that the action goes back to the same person.',
    subtitlePtBr: 'myself / yourself / himself mostram que a pessoa faz a ação consigo mesma.',
    subtitleVi: 'myself / yourself / himself cho thấy người đó làm hành động với chính mình.',
    subtitleId: 'myself / yourself / himself menunjukkan bahwa seseorang melakukan tindakan pada dirinya sendiri.',
    subtitleTr: 'myself / yourself / himself kişinin eylemi kendisine yaptığını gösterir.',
    subtitlePl: 'myself / yourself / himself pokazują, że osoba wykonuje czynność na sobie.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'В этом уроке часто нужно сказать: ', tone: 'normal' },
          { text: 'себя / сам себя / сами себя', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'кто', tone: 'formula' },
          { text: ' + действие + ', tone: 'muted' },
          { text: 'myself / yourself / himself / herself / itself / ourselves / yourselves / themselves', tone: 'accent' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You hurt ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He hurt ', tone: 'normal' },
          { text: 'himself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She hurt ', tone: 'normal' },
          { text: 'herself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The app closed ', tone: 'normal' },
          { text: 'itself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We prepared ', tone: 'normal' },
          { text: 'ourselves', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They protected ', tone: 'normal' },
          { text: 'themselves', tone: 'accent' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'смотри на первого участника фразы. I -> myself, he -> himself, she -> herself, they -> themselves.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He hurt hisself', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He hurt ', tone: 'normal' },
          { text: 'himself', tone: 'accent' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'У цьому уроці часто потрібно сказати: ', tone: 'normal' },
          { text: 'себе / сам себе / самі себе', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'хто', tone: 'formula' },
          { text: ' + дія + ', tone: 'muted' },
          { text: 'myself / yourself / himself / herself / itself / ourselves / yourselves / themselves', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He hurt ', tone: 'normal' },
          { text: 'himself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She hurt ', tone: 'normal' },
          { text: 'herself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They protected ', tone: 'normal' },
          { text: 'themselves', tone: 'accent' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'These words show that the action goes back to the same person:', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'person', tone: 'formula' },
          { text: ' + action + ', tone: 'muted' },
          { text: 'myself / yourself / himself / herself / itself / ourselves / themselves', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The app closed ', tone: 'normal' },
          { text: 'itself', tone: 'accent' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'text', parts: [{ text: 'Nesta lição, muitas vezes você precisa dizer: ', tone: 'normal' }, { text: 'a si mesmo / a si mesma / eles mesmos', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'pessoa', tone: 'formula' }, { text: ' + ação + ', tone: 'muted' }, { text: 'myself / yourself / himself / herself / itself / ourselves / yourselves / themselves', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'He hurt ', tone: 'normal' }, { text: 'himself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'They protected ', tone: 'normal' }, { text: 'themselves', tone: 'accent' }] },
      { type: 'tip', parts: [{ text: 'Verificação principal: ', tone: 'strong' }, { text: 'olhe para o primeiro participante. I -> myself, he -> himself, they -> themselves.' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'He hurt hisself', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'text', parts: [{ text: 'Trong bài này, bạn thường cần nói: ', tone: 'normal' }, { text: 'bản thân / chính mình / chính họ', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'người', tone: 'formula' }, { text: ' + hành động + ', tone: 'muted' }, { text: 'myself / yourself / himself / herself / itself / ourselves / yourselves / themselves', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'He hurt ', tone: 'normal' }, { text: 'himself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'They protected ', tone: 'normal' }, { text: 'themselves', tone: 'accent' }] },
      { type: 'tip', parts: [{ text: 'Cách kiểm tra chính: ', tone: 'strong' }, { text: 'nhìn vào người đầu tiên trong câu. I -> myself, he -> himself, they -> themselves.' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'He hurt hisself', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'text', parts: [{ text: 'Dalam pelajaran ini, kamu sering perlu mengatakan: ', tone: 'normal' }, { text: 'diri sendiri / dirinya sendiri / mereka sendiri', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'orang', tone: 'formula' }, { text: ' + tindakan + ', tone: 'muted' }, { text: 'myself / yourself / himself / herself / itself / ourselves / yourselves / themselves', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'He hurt ', tone: 'normal' }, { text: 'himself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'They protected ', tone: 'normal' }, { text: 'themselves', tone: 'accent' }] },
      { type: 'tip', parts: [{ text: 'Pemeriksaan utama: ', tone: 'strong' }, { text: 'lihat peserta pertama dalam kalimat. I -> myself, he -> himself, they -> themselves.' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'He hurt hisself', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'text', parts: [{ text: 'Bu derste sık sık şunu söylemen gerekir: ', tone: 'normal' }, { text: 'kendini / kendi kendini / kendilerini', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'kişi', tone: 'formula' }, { text: ' + eylem + ', tone: 'muted' }, { text: 'myself / yourself / himself / herself / itself / ourselves / yourselves / themselves', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'He hurt ', tone: 'normal' }, { text: 'himself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'They protected ', tone: 'normal' }, { text: 'themselves', tone: 'accent' }] },
      { type: 'tip', parts: [{ text: 'Ana kontrol: ', tone: 'strong' }, { text: 'cümlenin ilk katılımcısına bak. I -> myself, he -> himself, they -> themselves.' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'He hurt hisself', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'text', parts: [{ text: 'W tej lekcji często trzeba powiedzieć: ', tone: 'normal' }, { text: 'siebie / sam siebie / sami siebie', tone: 'strong' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'osoba', tone: 'formula' }, { text: ' + czynność + ', tone: 'muted' }, { text: 'myself / yourself / himself / herself / itself / ourselves / yourselves / themselves', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'He hurt ', tone: 'normal' }, { text: 'himself', tone: 'accent' }] },
      { type: 'correct', parts: [{ text: 'They protected ', tone: 'normal' }, { text: 'themselves', tone: 'accent' }] },
      { type: 'tip', parts: [{ text: 'Główna kontrola: ', tone: 'strong' }, { text: 'spójrz na pierwszego uczestnika zdania. I -> myself, he -> himself, they -> themselves.' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'He hurt hisself', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'I -> myself',
        labelUK: 'I -> myself',
        labelES: 'I -> myself',
        en: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
        ],
        ru: 'Я ушибся',
        uk: 'Я забився',
        es: 'Me lastimé',
        'pt-BR': 'Eu me machuquei',
        vi: 'Tôi tự làm mình bị thương',
        id: 'Saya melukai diri sendiri',
        tr: 'Kendimi incittim',
        pl: 'Zraniłem się',
        labelPtBr: 'I -> myself',
        labelVi: 'I -> myself',
        labelId: 'I -> myself',
        labelTr: 'I -> myself',
        labelPl: 'I -> myself',
        noteRU: 'I требует myself.',
        noteUK: 'I вимагає myself.',
        noteES: 'Use myself with I.',
        notePtBr: 'Use myself com I.',
        noteVi: 'Dùng myself với I.',
        noteId: 'Gunakan myself dengan I.',
        noteTr: 'I ile myself kullanılır.',
        notePl: 'Z I użyj myself.',
      },
      {
        labelRU: 'they -> themselves',
        labelUK: 'they -> themselves',
        labelES: 'they -> themselves',
        en: [
          { text: 'They protected ', tone: 'normal' },
          { text: 'themselves', tone: 'accent' },
        ],
        ru: 'Они защитили себя',
        uk: 'Вони захистили себе',
        es: 'Se protegieron',
        'pt-BR': 'Eles se protegeram',
        vi: 'Họ đã tự bảo vệ mình',
        id: 'Mereka melindungi diri mereka sendiri',
        tr: 'Kendilerini korudular',
        pl: 'Oni ochronili samych siebie',
        labelPtBr: 'they -> themselves',
        labelVi: 'they -> themselves',
        labelId: 'they -> themselves',
        labelTr: 'they -> themselves',
        labelPl: 'they -> themselves',
        noteRU: 'They требует themselves.',
        noteUK: 'They вимагає themselves.',
        noteES: 'Use themselves with they.',
        notePtBr: 'Use themselves com they.',
        noteVi: 'Dùng themselves với they.',
        noteId: 'Gunakan themselves dengan they.',
        noteTr: 'They ile themselves kullanılır.',
        notePl: 'Z they użyj themselves.',
      },
    ],
  },

  {
    lessonId: 28,
    screenId: 'lesson_28_intro_2_emphasis_myself',
    order: 2,
    kind: 'formula',

    titleRU: 'Когда значит "сам"',
    titleUK: 'Коли означає "сам"',
    titleES: 'When it means "by myself / yourself"',
    titlePtBr: 'Quando significa "sozinho / por conta própria"',
    titleVi: 'Khi nó có nghĩa là "tự mình"',
    titleId: 'Saat artinya "sendiri"',
    titleTr: '"Kendim / kendin" anlamına geldiğinde',
    titlePl: 'Kiedy znaczy "sam / sama"',

    subtitleRU: 'Иногда -self / -selves не значит "себя", а усиливает: я сам, она сама, они сами.',
    subtitleUK: 'Іноді -self / -selves не означає "себе", а підсилює: я сам, вона сама, вони самі.',
    subtitleES: 'Sometimes -self / -selves adds emphasis: I did it myself.',
    subtitlePtBr: 'Às vezes -self / -selves não significa "a si mesmo", mas dá ênfase: eu mesmo, ela mesma, eles mesmos.',
    subtitleVi: 'Đôi khi -self / -selves không có nghĩa là "bản thân", mà nhấn mạnh: chính tôi, chính cô ấy, chính họ.',
    subtitleId: 'Kadang -self / -selves bukan berarti "diri sendiri", tetapi memberi penekanan: saya sendiri, dia sendiri, mereka sendiri.',
    subtitleTr: 'Bazen -self / -selves "kendini" değil, vurgu anlamı verir: ben kendim, o kendisi, onlar kendileri.',
    subtitlePl: 'Czasem -self / -selves nie znaczy "siebie", tylko wzmacnia: ja sam, ona sama, oni sami.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Сравни два смысла:', tone: 'normal' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'I hurt ', tone: 'normal' },
          { text: 'myself', tone: 'accent' },
          { text: ' = я ушибся', tone: 'muted' },
        ],
      },
      {
        type: 'example',
        parts: [
          { text: 'I did it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
          { text: ' = я сделал это сам', tone: 'muted' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'кто + сделал действие + ', tone: 'formula' },
          { text: 'myself / yourself / himself / herself / ourselves / yourselves / themselves', tone: 'warning' },
          { text: ' = сам / сама / сами', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I did it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You did it ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He did it ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She did it ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We did it ', tone: 'normal' },
          { text: 'ourselves', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They did it ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I fixed it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She cooked dinner ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They cleaned the room ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'They did it themself', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'They did it ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'хто + зробив дію + ', tone: 'formula' },
          { text: 'myself / yourself / himself / herself / ourselves / yourselves / themselves', tone: 'warning' },
          { text: ' = сам / сама / самі', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I did it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She cooked dinner ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They cleaned the room ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'person + action + ', tone: 'formula' },
          { text: 'myself / yourself / himself / herself / themselves', tone: 'warning' },
          { text: ' = emphasis', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I did it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They cleaned the room ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'text', parts: [{ text: 'Compare os dois sentidos:', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }, { text: ' = eu me machuquei', tone: 'muted' }] },
      { type: 'example', parts: [{ text: 'I did it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }, { text: ' = eu mesmo fiz isso', tone: 'muted' }] },
      { type: 'formula', parts: [{ text: 'pessoa + ação + ', tone: 'formula' }, { text: 'myself / yourself / himself / herself / themselves', tone: 'warning' }, { text: ' = ênfase', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I fixed it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They cleaned the room ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'They did it themself', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'text', parts: [{ text: 'So sánh hai nghĩa:', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }, { text: ' = tôi tự làm mình bị thương', tone: 'muted' }] },
      { type: 'example', parts: [{ text: 'I did it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }, { text: ' = chính tôi đã làm việc đó', tone: 'muted' }] },
      { type: 'formula', parts: [{ text: 'người + hành động + ', tone: 'formula' }, { text: 'myself / yourself / himself / herself / themselves', tone: 'warning' }, { text: ' = nhấn mạnh', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I fixed it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They cleaned the room ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'They did it themself', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'text', parts: [{ text: 'Bandingkan dua makna:', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }, { text: ' = saya melukai diri sendiri', tone: 'muted' }] },
      { type: 'example', parts: [{ text: 'I did it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }, { text: ' = saya sendiri yang melakukannya', tone: 'muted' }] },
      { type: 'formula', parts: [{ text: 'orang + tindakan + ', tone: 'formula' }, { text: 'myself / yourself / himself / herself / themselves', tone: 'warning' }, { text: ' = penekanan', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I fixed it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They cleaned the room ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'They did it themself', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'text', parts: [{ text: 'İki anlamı karşılaştır:', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }, { text: ' = kendimi incittim', tone: 'muted' }] },
      { type: 'example', parts: [{ text: 'I did it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }, { text: ' = bunu kendim yaptım', tone: 'muted' }] },
      { type: 'formula', parts: [{ text: 'kişi + eylem + ', tone: 'formula' }, { text: 'myself / yourself / himself / herself / themselves', tone: 'warning' }, { text: ' = vurgu', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I fixed it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They cleaned the room ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'They did it themself', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'text', parts: [{ text: 'Porównaj dwa znaczenia:', tone: 'normal' }] },
      { type: 'example', parts: [{ text: 'I hurt ', tone: 'normal' }, { text: 'myself', tone: 'accent' }, { text: ' = zraniłem się', tone: 'muted' }] },
      { type: 'example', parts: [{ text: 'I did it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }, { text: ' = zrobiłem to sam', tone: 'muted' }] },
      { type: 'formula', parts: [{ text: 'osoba + czynność + ', tone: 'formula' }, { text: 'myself / yourself / himself / herself / themselves', tone: 'warning' }, { text: ' = nacisk', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I fixed it ', tone: 'normal' }, { text: 'myself', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'They cleaned the room ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'They did it themself', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'сам сделал',
        labelUK: 'сам зробив',
        labelES: 'did it myself',
        en: [
          { text: 'I fixed it ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
        ru: 'Я сам это исправил',
        uk: 'Я сам це виправив',
        es: 'Lo arreglé yo mismo',
        'pt-BR': 'Eu mesmo consertei isso',
        vi: 'Tôi tự sửa nó',
        id: 'Saya memperbaikinya sendiri',
        tr: 'Onu kendim tamir ettim',
        pl: 'Sam to naprawiłem',
        labelPtBr: 'fiz eu mesmo',
        labelVi: 'tự mình làm',
        labelId: 'melakukan sendiri',
        labelTr: 'kendim yaptım',
        labelPl: 'sam zrobiłem',
        noteRU: 'myself усиливает: без чужой помощи.',
        noteUK: 'myself підсилює: без чужої допомоги.',
        noteES: 'myself adds emphasis: without someone else.',
        notePtBr: 'myself dá ênfase: sem ajuda de outra pessoa.',
        noteVi: 'myself nhấn mạnh: không có sự giúp đỡ của người khác.',
        noteId: 'myself memberi penekanan: tanpa bantuan orang lain.',
        noteTr: 'myself vurgu katar: başkasının yardımı olmadan.',
        notePl: 'myself wzmacnia: bez cudzej pomocy.',
      },
      {
        labelRU: 'сами сделали',
        labelUK: 'самі зробили',
        labelES: 'did it themselves',
        en: [
          { text: 'They cleaned the room ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
        ru: 'Они сами убрали комнату',
        uk: 'Вони самі прибрали кімнату',
        es: 'Ellos mismos limpiaron la habitación',
        'pt-BR': 'Eles mesmos limparam o quarto',
        vi: 'Họ tự dọn phòng',
        id: 'Mereka membersihkan kamar itu sendiri',
        tr: 'Odayı kendileri temizlediler',
        pl: 'Sami posprzątali pokój',
        labelPtBr: 'fizeram eles mesmos',
        labelVi: 'tự họ làm',
        labelId: 'mereka sendiri',
        labelTr: 'kendileri yaptılar',
        labelPl: 'sami zrobili',
        noteRU: 'They требует themselves.',
        noteUK: 'They вимагає themselves.',
        noteES: 'Use themselves with they.',
        notePtBr: 'Use themselves com they.',
        noteVi: 'Dùng themselves với they.',
        noteId: 'Gunakan themselves dengan they.',
        noteTr: 'They ile themselves kullanılır.',
        notePl: 'Z they użyj themselves.',
      },
    ],
  },

  {
    lessonId: 28,
    screenId: 'lesson_28_intro_3_questions_negatives_modals',
    order: 3,
    kind: 'formula',

    titleRU: 'Вопросы, отрицания и cannot',
    titleUK: 'Питання, заперечення і cannot',
    titleES: 'Questions, negatives, and cannot',
    titlePtBr: 'Perguntas, negativas e cannot',
    titleVi: 'Câu hỏi, phủ định và cannot',
    titleId: 'Pertanyaan, negasi, dan cannot',
    titleTr: 'Sorular, olumsuzluklar ve cannot',
    titlePl: 'Pytania, przeczenia i cannot',

    subtitleRU: 'Self-слово остаётся в конце, но грамматика вокруг него меняется: Did, did not, can, should.',
    subtitleUK: 'Self-слово залишається в кінці, але граматика навколо нього змінюється: Did, did not, can, should.',
    subtitleES: 'The self-word stays, but the grammar around it changes: Did, did not, can, should.',
    subtitlePtBr: 'A palavra com self fica, mas a gramática ao redor muda: Did, did not, can, should.',
    subtitleVi: 'Từ self vẫn ở đó, nhưng ngữ pháp xung quanh thay đổi: Did, did not, can, should.',
    subtitleId: 'Kata self tetap ada, tetapi tata bahasa di sekitarnya berubah: Did, did not, can, should.',
    subtitleTr: 'Self sözcüğü kalır, ama etrafındaki gramer değişir: Did, did not, can, should.',
    subtitlePl: 'Słowo z self zostaje, ale gramatyka wokół niego się zmienia: Did, did not, can, should.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'accent' },
          { text: ' + кто + действие + ', tone: 'formula' },
          { text: 'self-word?', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'Did you hurt ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did he hurt ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did she teach ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did they prepare ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did you do it ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'кто + did not + действие + ', tone: 'formula' },
          { text: 'self-word', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I did not hurt ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He did not teach ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She did not blame ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We did not protect ', tone: 'normal' },
          { text: 'ourselves', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'cannot / should + действие + ', tone: 'formula' },
          { text: 'self-word', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I cannot force ', tone: 'normal' },
          { text: 'myself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He cannot control ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They cannot stop ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Should we prepare ', tone: 'normal' },
          { text: 'ourselves', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Did he hurted himself?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Did he hurt ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He cannot controls himself', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He cannot control ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'accent' },
          { text: ' + хто + дія + ', tone: 'formula' },
          { text: 'self-word?', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did you hurt ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did they prepare ', tone: 'normal' },
          { text: 'themselves', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'cannot / should + дія + ', tone: 'formula' },
          { text: 'self-word', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He cannot control ', tone: 'normal' },
          { text: 'himself', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'accent' },
          { text: ' + who + action + ', tone: 'formula' },
          { text: 'self-word?', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did you hurt ', tone: 'normal' },
          { text: 'yourself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'cannot + action + ', tone: 'formula' },
          { text: 'self-word', tone: 'warning' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'accent' }, { text: ' + quem + ação + ', tone: 'formula' }, { text: 'self-word?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Did you hurt ', tone: 'normal' }, { text: 'yourself', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Did they prepare ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'quem + did not + ação + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She did not blame ', tone: 'normal' }, { text: 'herself', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'cannot / should + ação + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'Did he hurted himself?', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'accent' }, { text: ' + ai + hành động + ', tone: 'formula' }, { text: 'self-word?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Did you hurt ', tone: 'normal' }, { text: 'yourself', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Did they prepare ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'ai + did not + hành động + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She did not blame ', tone: 'normal' }, { text: 'herself', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'cannot / should + hành động + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'Did he hurted himself?', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'accent' }, { text: ' + siapa + tindakan + ', tone: 'formula' }, { text: 'self-word?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Did you hurt ', tone: 'normal' }, { text: 'yourself', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Did they prepare ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'siapa + did not + tindakan + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She did not blame ', tone: 'normal' }, { text: 'herself', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'cannot / should + tindakan + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'Did he hurted himself?', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'accent' }, { text: ' + kim + eylem + ', tone: 'formula' }, { text: 'self-word?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Did you hurt ', tone: 'normal' }, { text: 'yourself', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Did they prepare ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'kim + did not + eylem + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She did not blame ', tone: 'normal' }, { text: 'herself', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'cannot / should + eylem + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'Did he hurted himself?', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'accent' }, { text: ' + kto + czynność + ', tone: 'formula' }, { text: 'self-word?', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'Did you hurt ', tone: 'normal' }, { text: 'yourself', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Did they prepare ', tone: 'normal' }, { text: 'themselves', tone: 'warning' }, { text: '?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'kto + did not + czynność + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'correct', parts: [{ text: 'She did not blame ', tone: 'normal' }, { text: 'herself', tone: 'warning' }] },
      { type: 'formula', parts: [{ text: 'cannot / should + czynność + ', tone: 'formula' }, { text: 'self-word', tone: 'warning' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'Did he hurted himself?', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'Did question',
        labelUK: 'Did question',
        labelES: 'Did question',
        en: [
          { text: 'Did she write it ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
          { text: '?', tone: 'normal' },
        ],
        ru: 'Она сама это написала?',
        uk: 'Вона сама це написала?',
        es: '¿Ella lo escribió misma?',
        'pt-BR': 'Ela mesma escreveu isso?',
        vi: 'Cô ấy tự viết nó à?',
        id: 'Apakah dia menulisnya sendiri?',
        tr: 'Onu kendisi mi yazdı?',
        pl: 'Czy ona sama to napisała?',
        labelPtBr: 'pergunta com Did',
        labelVi: 'câu hỏi với Did',
        labelId: 'pertanyaan dengan Did',
        labelTr: 'Did sorusu',
        labelPl: 'pytanie z Did',
        noteRU: 'После Did основной глагол write без прошлой формы wrote.',
        noteUK: 'Після Did головне дієслово write без минулої форми wrote.',
        noteES: 'After Did, use write, not wrote.',
        notePtBr: 'Depois de Did, use write, não wrote.',
        noteVi: 'Sau Did, dùng write, không dùng wrote.',
        noteId: 'Setelah Did, gunakan write, bukan wrote.',
        noteTr: 'Did sonrasında wrote değil, write kullanılır.',
        notePl: 'Po Did użyj write, nie wrote.',
      },
      {
        labelRU: 'cannot',
        labelUK: 'cannot',
        labelES: 'cannot',
        en: [
          { text: 'She cannot forgive ', tone: 'normal' },
          { text: 'herself', tone: 'warning' },
        ],
        ru: 'Она не может простить себя',
        uk: 'Вона не може пробачити себе',
        es: 'Ella no puede perdonarse',
        'pt-BR': 'Ela não consegue se perdoar',
        vi: 'Cô ấy không thể tha thứ cho chính mình',
        id: 'Dia tidak bisa memaafkan dirinya sendiri',
        tr: 'Kendini affedemiyor',
        pl: 'Ona nie może sobie wybaczyć',
        labelPtBr: 'cannot',
        labelVi: 'cannot',
        labelId: 'cannot',
        labelTr: 'cannot',
        labelPl: 'cannot',
        noteRU: 'После cannot глагол forgive обычный, без -s.',
        noteUK: 'Після cannot дієслово forgive звичайне, без -s.',
        noteES: 'After cannot, use forgive with no -s.',
        notePtBr: 'Depois de cannot, use forgive sem -s.',
        noteVi: 'Sau cannot, dùng forgive không có -s.',
        noteId: 'Setelah cannot, gunakan forgive tanpa -s.',
        noteTr: 'cannot sonrasında forgive -s olmadan kullanılır.',
        notePl: 'Po cannot użyj forgive bez -s.',
      },
    ],
  },

  {
    lessonId: 28,
    screenId: 'lesson_28_intro_4_fixed_phrases_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'Готовые фразы с yourself',
    titleUK: 'Готові фрази з yourself',
    titleES: 'Fixed phrases with yourself',
    titlePtBr: 'Frases fixas com yourself',
    titleVi: 'Cụm cố định với yourself',
    titleId: 'Frasa tetap dengan yourself',
    titleTr: 'yourself ile kalıplaşmış ifadeler',
    titlePl: 'Stałe zwroty z yourself',

    subtitleRU: 'В конце урока появляются живые команды и советы, где yourself лучше запоминать целой связкой.',
    subtitleUK: 'Наприкінці уроку зʼявляються живі команди й поради, де yourself краще запамʼятовувати цілою звʼязкою.',
    subtitleES: 'At the end of the lesson, some phrases with yourself work best as fixed chunks.',
    subtitlePtBr: 'No fim da lição, algumas frases com yourself funcionam melhor como blocos fixos.',
    subtitleVi: 'Ở cuối bài, một số cụm với yourself nên được nhớ như cụm cố định.',
    subtitleId: 'Di akhir pelajaran, beberapa frasa dengan yourself paling baik diingat sebagai satu potongan tetap.',
    subtitleTr: 'Dersin sonunda yourself içeren bazı ifadeleri kalıp halinde ezberlemek daha iyi olur.',
    subtitlePl: 'Pod koniec lekcji niektóre zwroty z yourself najlepiej zapamiętać jako gotowe całości.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Некоторые фразы лучше не разбирать дословно. Их нужно узнавать как готовые блоки:', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'Help ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = угощайся', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Be ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = будь собой', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Take care of ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = береги себя', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Believe in ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = верь в себя', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Trust ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = доверяй себе', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Teach ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' every day = учись самостоятельно каждый день', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Ask ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' why = спроси себя почему', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Remind ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' to rest = напомни себе отдохнуть', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Give ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' time = дай себе время', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Do not blame ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = не вини себя', tone: 'muted' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'step',
        parts: [
          { text: '1. Действие на себя? ', tone: 'muted' },
          { text: 'hurt myself / protect themselves', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Значит "сам"? ', tone: 'muted' },
          { text: 'I did it myself / They cleaned it themselves', tone: 'warning' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Это готовая команда? ', tone: 'muted' },
          { text: 'Take care of yourself / Be yourself', tone: 'accent' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Believe yourself', tone: 'danger' },
          { text: ' если смысл "верь в себя"', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Believe in ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Do not blame you', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Do not blame ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Главный навык урока: ', tone: 'strong' },
          { text: 'сначала понять роль self-слова: "себя", "сам" или готовая фраза.', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'correct',
        parts: [
          { text: 'Help ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = пригощайся', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Be ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = будь собою', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Take care of ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = бережи себе', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Believe in ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = вір у себе', tone: 'muted' },
        ],
      },
    ],

    linesES: [
      {
        type: 'correct',
        parts: [
          { text: 'Help ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = help yourself', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Take care of ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
          { text: ' = take care of yourself', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Believe in ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'text', parts: [{ text: 'Algumas frases são melhores como blocos prontos:', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Help ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = sirva-se / fique à vontade', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Be ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = seja você mesmo', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Take care of ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = cuide-se', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Believe in ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = acredite em si mesmo', tone: 'muted' }] },
      { type: 'step', parts: [{ text: '1. Ação volta para a pessoa? ', tone: 'muted' }, { text: 'hurt myself / protect themselves', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'Believe yourself', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'text', parts: [{ text: 'Một số cụm nên được nhận ra như khối cố định:', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Help ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = cứ tự nhiên / cứ dùng đi', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Be ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = hãy là chính mình', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Take care of ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = hãy chăm sóc bản thân', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Believe in ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = tin vào chính mình', tone: 'muted' }] },
      { type: 'step', parts: [{ text: '1. Hành động quay lại người đó? ', tone: 'muted' }, { text: 'hurt myself / protect themselves', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'Believe yourself', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'text', parts: [{ text: 'Beberapa frasa lebih baik dikenali sebagai blok siap pakai:', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Help ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = silakan ambil sendiri', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Be ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = jadilah diri sendiri', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Take care of ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = jaga dirimu', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Believe in ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = percayalah pada diri sendiri', tone: 'muted' }] },
      { type: 'step', parts: [{ text: '1. Tindakan kembali ke diri sendiri? ', tone: 'muted' }, { text: 'hurt myself / protect themselves', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'Believe yourself', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'text', parts: [{ text: 'Bazı ifadeleri hazır kalıp olarak tanımak daha iyidir:', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Help ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = buyur / kendin al', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Be ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = kendin ol', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Take care of ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = kendine iyi bak', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Believe in ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = kendine inan', tone: 'muted' }] },
      { type: 'step', parts: [{ text: '1. Eylem kişiye geri mi dönüyor? ', tone: 'muted' }, { text: 'hurt myself / protect themselves', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'Believe yourself', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'text', parts: [{ text: 'Niektóre zwroty najlepiej rozpoznawać jako gotowe bloki:', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'Help ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = częstuj się', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Be ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = bądź sobą', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Take care of ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = dbaj o siebie', tone: 'muted' }] },
      { type: 'correct', parts: [{ text: 'Believe in ', tone: 'normal' }, { text: 'yourself', tone: 'accent' }, { text: ' = uwierz w siebie', tone: 'muted' }] },
      { type: 'step', parts: [{ text: '1. Czynność wraca do osoby? ', tone: 'muted' }, { text: 'hurt myself / protect themselves', tone: 'accent' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'Believe yourself', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'готовая фраза',
        labelUK: 'готова фраза',
        labelES: 'fixed phrase',
        en: [
          { text: 'Take care of ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
        ru: 'Береги себя',
        uk: 'Бережи себе',
        es: 'Cuídate',
        'pt-BR': 'Cuide-se',
        vi: 'Hãy tự chăm sóc bản thân',
        id: 'Jaga dirimu',
        tr: 'Kendine iyi bak',
        pl: 'Dbaj o siebie',
        labelPtBr: 'frase fixa',
        labelVi: 'cụm cố định',
        labelId: 'frasa tetap',
        labelTr: 'kalıp ifade',
        labelPl: 'stały zwrot',
        noteRU: 'Take care of yourself лучше запоминать целиком.',
        noteUK: 'Take care of yourself краще запамʼятовувати цілком.',
        noteES: 'Take care of yourself works best as a full chunk.',
        notePtBr: 'Take care of yourself funciona melhor como um bloco inteiro.',
        noteVi: 'Take care of yourself nên được nhớ như một cụm hoàn chỉnh.',
        noteId: 'Take care of yourself paling baik diingat sebagai satu frasa utuh.',
        noteTr: 'Take care of yourself bütün bir kalıp olarak daha iyi hatırlanır.',
        notePl: 'Take care of yourself najlepiej zapamiętać jako cały zwrot.',
      },
      {
        labelRU: 'не вини себя',
        labelUK: 'не звинувачуй себе',
        labelES: 'do not blame yourself',
        en: [
          { text: 'Do not blame ', tone: 'normal' },
          { text: 'yourself', tone: 'accent' },
        ],
        ru: 'Не вини себя',
        uk: 'Не звинувачуй себе',
        es: 'No te culpes',
        'pt-BR': 'Não se culpe',
        vi: 'Đừng tự trách mình',
        id: 'Jangan menyalahkan dirimu sendiri',
        tr: 'Kendini suçlama',
        pl: 'Nie obwiniaj się',
        labelPtBr: 'não se culpe',
        labelVi: 'đừng tự trách mình',
        labelId: 'jangan menyalahkan diri sendiri',
        labelTr: 'kendini suçlama',
        labelPl: 'nie obwiniaj się',
        noteRU: 'yourself нужен, потому что действие направлено на самого человека.',
        noteUK: 'yourself потрібен, бо дія спрямована на саму людину.',
        noteES: 'yourself is needed because the action points back to the same person.',
        notePtBr: 'yourself é necessário porque a ação volta para a mesma pessoa.',
        noteVi: 'yourself cần thiết vì hành động quay lại chính người đó.',
        noteId: 'yourself diperlukan karena tindakan kembali ke orang yang sama.',
        noteTr: 'yourself gerekir, çünkü eylem aynı kişiye geri döner.',
        notePl: 'yourself jest potrzebne, bo czynność wraca do tej samej osoby.',
      },
    ],
  },
];

export const LESSON_29_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 29,
    screenId: 'lesson_29_intro_1_used_to_core',
    order: 1,
    kind: 'concept',

    titleRU: 'Раньше было, сейчас уже нет',
    titleUK: 'Раніше було, зараз уже ні',
    titleES: 'It was true before, not now',
    titlePtBr: 'Era verdade antes, agora não',
    titleVi: 'Trước đây là vậy, bây giờ thì không',
    titleId: 'Dulu benar, sekarang tidak',
    titleTr: 'Eskiden öyleydi, artık değil',
    titlePl: 'Kiedyś tak było, teraz już nie',

    subtitleRU: 'used to показывает старую привычку или старое состояние.',
    subtitleUK: 'used to показує стару звичку або старий стан.',
    subtitleES: 'used to shows an old habit or an old state.',
    subtitlePtBr: 'used to mostra um hábito antigo ou um estado antigo.',
    subtitleVi: 'used to diễn tả một thói quen cũ hoặc trạng thái cũ.',
    subtitleId: 'used to menunjukkan kebiasaan lama atau keadaan lama.',
    subtitleTr: 'used to eski bir alışkanlığı ya da eski bir durumu gösterir.',
    subtitlePl: 'used to pokazuje dawny nawyk albo dawny stan.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Когда по-русски фраза начинается с ', tone: 'normal' },
          { text: '"раньше..."', tone: 'strong' },
          { text: ', английский часто использует связку ', tone: 'normal' },
          { text: 'used to', tone: 'accent' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'кто', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'действие', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' work here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' call me every day', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' study English', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' work together', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live near us', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная идея: ', tone: 'strong' },
          { text: 'used to не значит "использовал". Здесь это "раньше обычно делал / раньше было так".', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I use to live here', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно в утверждении: ', tone: 'success' },
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'Коли фраза починається з ', tone: 'normal' },
          { text: '"раніше..."', tone: 'strong' },
          { text: ', англійська часто використовує ', tone: 'normal' },
          { text: 'used to', tone: 'accent' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'хто', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'дія', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' call me every day', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live near us', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'Use ', tone: 'normal' },
          { text: 'used to', tone: 'accent' },
          { text: ' for an old habit or old situation.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'who', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'accent' },
          { text: ' + action', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'text', parts: [{ text: 'Quando a ideia é ', tone: 'normal' }, { text: '"antes..."', tone: 'strong' }, { text: ', o inglês costuma usar ', tone: 'normal' }, { text: 'used to', tone: 'accent' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'quem', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'used to', tone: 'accent' }, { text: ' + ação', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' live here', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' call me every day', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Ideia principal: ', tone: 'strong' }, { text: 'used to aqui não significa "usava"; significa "costumava / antes era assim".' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'I use to live here', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'text', parts: [{ text: 'Khi ý là ', tone: 'normal' }, { text: '"trước đây..."', tone: 'strong' }, { text: ', tiếng Anh thường dùng ', tone: 'normal' }, { text: 'used to', tone: 'accent' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'ai', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'used to', tone: 'accent' }, { text: ' + hành động', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' live here', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' call me every day', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Ý chính: ', tone: 'strong' }, { text: 'used to ở đây không có nghĩa là "sử dụng"; nó nghĩa là "trước đây thường / trước đây là vậy".' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'I use to live here', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'text', parts: [{ text: 'Ketika maknanya ', tone: 'normal' }, { text: '"dulu..."', tone: 'strong' }, { text: ', bahasa Inggris sering memakai ', tone: 'normal' }, { text: 'used to', tone: 'accent' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'siapa', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'used to', tone: 'accent' }, { text: ' + tindakan', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' live here', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' call me every day', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Ide utama: ', tone: 'strong' }, { text: 'used to di sini bukan berarti "menggunakan"; artinya "dulu biasanya / dulu keadaannya begitu".' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'I use to live here', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'text', parts: [{ text: 'Anlam ', tone: 'normal' }, { text: '"eskiden..."', tone: 'strong' }, { text: ' ise İngilizce sık sık ', tone: 'normal' }, { text: 'used to', tone: 'accent' }, { text: ' kullanır.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'kim', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'used to', tone: 'accent' }, { text: ' + eylem', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' live here', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' call me every day', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Ana fikir: ', tone: 'strong' }, { text: 'used to burada "kullandı" demek değildir; "eskiden yapardı / eskiden öyleydi" demektir.' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'I use to live here', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'text', parts: [{ text: 'Gdy sens brzmi ', tone: 'normal' }, { text: '"kiedyś..."', tone: 'strong' }, { text: ', angielski często używa ', tone: 'normal' }, { text: 'used to', tone: 'accent' }, { text: '.', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'kto', tone: 'formula' }, { text: ' + ', tone: 'muted' }, { text: 'used to', tone: 'accent' }, { text: ' + czynność', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' live here', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' call me every day', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Główna myśl: ', tone: 'strong' }, { text: 'used to tutaj nie znaczy "używał"; znaczy "kiedyś zwykle robił / kiedyś tak było".' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'I use to live here', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'раньше жил',
        labelUK: 'раніше жив',
        labelES: 'used to live',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live here', tone: 'normal' },
        ],
        ru: 'Раньше я жил здесь',
        uk: 'Раніше я жив тут',
        es: 'Antes vivía aquí',
        'pt-BR': 'Eu morava aqui antes',
        vi: 'Trước đây tôi từng sống ở đây',
        id: 'Dulu saya tinggal di sini',
        tr: 'Eskiden burada yaşardım',
        pl: 'Kiedyś tu mieszkałem',
        labelPtBr: 'morava antes',
        labelVi: 'trước đây từng sống',
        labelId: 'dulu tinggal',
        labelTr: 'eskiden yaşardı',
        labelPl: 'kiedyś mieszkał',
        noteRU: 'used to показывает старую ситуацию, а не действие сейчас.',
        noteUK: 'used to показує стару ситуацію, а не дію зараз.',
        noteES: 'used to shows an old situation, not a current action.',
        notePtBr: 'used to mostra uma situação antiga, não uma ação atual.',
        noteVi: 'used to chỉ một tình huống cũ, không phải hành động hiện tại.',
        noteId: 'used to menunjukkan situasi lama, bukan tindakan sekarang.',
        noteTr: 'used to eski bir durumu gösterir, şu anki eylemi değil.',
        notePl: 'used to pokazuje dawną sytuację, nie obecną czynność.',
      },
      {
        labelRU: 'раньше звонил',
        labelUK: 'раніше телефонував',
        labelES: 'used to call',
        en: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' call me every day', tone: 'normal' },
        ],
        ru: 'Раньше он звонил мне каждый день',
        uk: 'Раніше він телефонував мені щодня',
        es: 'Antes me llamaba todos los días',
        'pt-BR': 'Antes ele me ligava todos os dias',
        vi: 'Trước đây anh ấy gọi cho tôi mỗi ngày',
        id: 'Dulu dia menelepon saya setiap hari',
        tr: 'Eskiden beni her gün arardı',
        pl: 'Kiedyś dzwonił do mnie codziennie',
        labelPtBr: 'costumava ligar',
        labelVi: 'trước đây thường gọi',
        labelId: 'dulu menelepon',
        labelTr: 'eskiden arardı',
        labelPl: 'kiedyś dzwonił',
        noteRU: 'Every day здесь старая привычка.',
        noteUK: 'Every day тут стара звичка.',
        noteES: 'Every day shows an old habit here.',
        notePtBr: 'Every day mostra um hábito antigo aqui.',
        noteVi: 'Every day ở đây cho thấy một thói quen cũ.',
        noteId: 'Every day menunjukkan kebiasaan lama di sini.',
        noteTr: 'Every day burada eski bir alışkanlığı gösterir.',
        notePl: 'Every day pokazuje tutaj dawny nawyk.',
      },
    ],
  },

  {
    lessonId: 29,
    screenId: 'lesson_29_intro_2_past_vs_now',
    order: 2,
    kind: 'formula',

    titleRU: 'Раньше vs сейчас',
    titleUK: 'Раніше vs зараз',
    titleES: 'Before vs now',
    titlePtBr: 'Antes vs agora',
    titleVi: 'Trước đây vs bây giờ',
    titleId: 'Dulu vs sekarang',
    titleTr: 'Eskiden vs şimdi',
    titlePl: 'Kiedyś vs teraz',

    subtitleRU: 'used to часто показывает контраст: раньше было так, а сейчас иначе.',
    subtitleUK: 'used to часто показує контраст: раніше було так, а зараз інакше.',
    subtitleES: 'used to often shows contrast: before it was one way, now it is different.',
    subtitlePtBr: 'used to muitas vezes mostra contraste: antes era de um jeito, agora é diferente.',
    subtitleVi: 'used to thường cho thấy sự đối lập: trước đây như vậy, bây giờ khác.',
    subtitleId: 'used to sering menunjukkan kontras: dulu begitu, sekarang berbeda.',
    subtitleTr: 'used to sık sık karşıtlık gösterir: eskiden öyleydi, şimdi farklı.',
    subtitlePl: 'used to często pokazuje kontrast: kiedyś było tak, a teraz jest inaczej.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'used to', tone: 'accent' },
          { text: ' + старое действие', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'but now', tone: 'warning' },
          { text: ' + новая ситуация', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' wake up early, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' I wake up late', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' work at night, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' she works in the morning', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live there, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' we live here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' call us, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' they send messages', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' spend money, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' he saves money', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' forget keys, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' I check my bag', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'после but now уже обычное настоящее: works, sends, saves, checks.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She used to work at night, but now she work in the morning', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'She used to work at night, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' she works in the morning', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'used to', tone: 'accent' },
          { text: ' + стара дія', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'but now', tone: 'warning' },
          { text: ' + нова ситуація', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' wake up early, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' I wake up late', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' work at night, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' she works in the morning', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'used to', tone: 'accent' },
          { text: ' + old habit + ', tone: 'formula' },
          { text: 'but now', tone: 'warning' },
          { text: ' + current situation', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' live there, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' we live here', tone: 'normal' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'used to', tone: 'accent' }, { text: ' + hábito antigo + ', tone: 'formula' }, { text: 'but now', tone: 'warning' }, { text: ' + situação atual', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' wake up early, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' I wake up late', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' work at night, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' she works in the morning', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Verificação principal: ', tone: 'strong' }, { text: 'depois de but now, use o presente normal: works, sends, saves.' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'She used to work at night, but now she work in the morning', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'used to', tone: 'accent' }, { text: ' + thói quen cũ + ', tone: 'formula' }, { text: 'but now', tone: 'warning' }, { text: ' + tình huống hiện tại', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' wake up early, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' I wake up late', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' work at night, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' she works in the morning', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Cách kiểm tra chính: ', tone: 'strong' }, { text: 'sau but now, dùng hiện tại thường: works, sends, saves.' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'She used to work at night, but now she work in the morning', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'used to', tone: 'accent' }, { text: ' + kebiasaan lama + ', tone: 'formula' }, { text: 'but now', tone: 'warning' }, { text: ' + situasi sekarang', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' wake up early, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' I wake up late', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' work at night, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' she works in the morning', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Pemeriksaan utama: ', tone: 'strong' }, { text: 'setelah but now, gunakan present biasa: works, sends, saves.' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'She used to work at night, but now she work in the morning', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'used to', tone: 'accent' }, { text: ' + eski alışkanlık + ', tone: 'formula' }, { text: 'but now', tone: 'warning' }, { text: ' + şimdiki durum', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' wake up early, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' I wake up late', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' work at night, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' she works in the morning', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Ana kontrol: ', tone: 'strong' }, { text: 'but now sonrasında normal present kullan: works, sends, saves.' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'She used to work at night, but now she work in the morning', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'used to', tone: 'accent' }, { text: ' + dawny nawyk + ', tone: 'formula' }, { text: 'but now', tone: 'warning' }, { text: ' + obecna sytuacja', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' wake up early, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' I wake up late', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'She ', tone: 'strong' }, { text: 'used to', tone: 'accent' }, { text: ' work at night, ', tone: 'normal' }, { text: 'but now', tone: 'warning' }, { text: ' she works in the morning', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Główna kontrola: ', tone: 'strong' }, { text: 'po but now użyj zwykłego czasu teraźniejszego: works, sends, saves.' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'She used to work at night, but now she work in the morning', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'старое и новое',
        labelUK: 'старе і нове',
        labelES: 'old and new',
        en: [
          { text: 'He ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' spend money, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' he saves money', tone: 'normal' },
        ],
        ru: 'Раньше он тратил деньги, но сейчас экономит',
        uk: 'Раніше він витрачав гроші, але зараз економить',
        es: 'Antes él gastaba dinero, pero ahora ahorra',
        'pt-BR': 'Antes ele gastava dinheiro, mas agora economiza',
        vi: 'Trước đây anh ấy tiêu tiền, nhưng bây giờ anh ấy tiết kiệm',
        id: 'Dulu dia menghabiskan uang, tetapi sekarang dia menabung',
        tr: 'Eskiden para harcardı, ama şimdi para biriktiriyor',
        pl: 'Kiedyś wydawał pieniądze, ale teraz oszczędza',
        labelPtBr: 'antigo e novo',
        labelVi: 'cũ và mới',
        labelId: 'lama dan baru',
        labelTr: 'eski ve yeni',
        labelPl: 'stare i nowe',
        noteRU: 'used to = раньше, but now = сейчас по-другому.',
        noteUK: 'used to = раніше, but now = зараз інакше.',
        noteES: 'used to = before, but now = different now.',
        notePtBr: 'used to = antes; but now = agora é diferente.',
        noteVi: 'used to = trước đây; but now = bây giờ khác.',
        noteId: 'used to = dulu; but now = sekarang berbeda.',
        noteTr: 'used to = eskiden; but now = şimdi farklı.',
        notePl: 'used to = kiedyś, but now = teraz inaczej.',
      },
      {
        labelRU: 'изменение привычки',
        labelUK: 'зміна звички',
        labelES: 'habit change',
        en: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' order food, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' we cook at home', tone: 'normal' },
        ],
        ru: 'Раньше мы заказывали еду, но сейчас готовим дома',
        uk: 'Раніше ми замовляли їжу, але зараз готуємо вдома',
        es: 'Antes pedíamos comida, pero ahora cocinamos en casa',
        'pt-BR': 'Antes pedíamos comida, mas agora cozinhamos em casa',
        vi: 'Trước đây chúng tôi đặt đồ ăn, nhưng bây giờ chúng tôi nấu ở nhà',
        id: 'Dulu kami memesan makanan, tetapi sekarang kami memasak di rumah',
        tr: 'Eskiden yemek sipariş ederdik, ama şimdi evde yemek yapıyoruz',
        pl: 'Kiedyś zamawialiśmy jedzenie, ale teraz gotujemy w domu',
        labelPtBr: 'mudança de hábito',
        labelVi: 'thay đổi thói quen',
        labelId: 'perubahan kebiasaan',
        labelTr: 'alışkanlık değişimi',
        labelPl: 'zmiana nawyku',
        noteRU: 'Во второй части обычное настоящее: we cook.',
        noteUK: 'У другій частині звичайний теперішній час: we cook.',
        noteES: 'The second part uses normal present: we cook.',
        notePtBr: 'A segunda parte usa o presente normal: we cook.',
        noteVi: 'Phần thứ hai dùng hiện tại thường: we cook.',
        noteId: 'Bagian kedua memakai present biasa: we cook.',
        noteTr: 'İkinci bölüm normal present kullanır: we cook.',
        notePl: 'Druga część używa zwykłego czasu teraźniejszego: we cook.',
      },
    ],
  },

  {
    lessonId: 29,
    screenId: 'lesson_29_intro_3_negative_use_to',
    order: 3,
    kind: 'formula',

    titleRU: 'Отрицание: did not use to',
    titleUK: 'Заперечення: did not use to',
    titleES: 'Negative: did not use to',
    titlePtBr: 'Negativa: did not use to',
    titleVi: 'Phủ định: did not use to',
    titleId: 'Negatif: did not use to',
    titleTr: 'Olumsuz: did not use to',
    titlePl: 'Przeczenie: did not use to',

    subtitleRU: 'После did not форма меняется: use to без d.',
    subtitleUK: 'Після did not форма змінюється: use to без d.',
    subtitleES: 'After did not, the form changes: use to without d.',
    subtitlePtBr: 'Depois de did not, a forma muda: use to sem d.',
    subtitleVi: 'Sau did not, dạng đổi thành use to không có d.',
    subtitleId: 'Setelah did not, bentuknya berubah: use to tanpa d.',
    subtitleTr: 'did not sonrasında biçim değişir: d olmadan use to.',
    subtitlePl: 'Po did not forma się zmienia: use to bez d.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'кто', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'did not', tone: 'danger' },
          { text: ' + ', tone: 'muted' },
          { text: 'use to', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'действие', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drink coffee', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'You ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' work here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' call me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' study every day', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' travel often', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' help us', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' wake up early', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drive at night', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная ловушка: ', tone: 'strong' },
          { text: 'в утверждении used to, но после did not - use to без d.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He did not used to call me', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' call me', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'хто', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'did not', tone: 'danger' },
          { text: ' + ', tone: 'muted' },
          { text: 'use to', tone: 'accent' },
          { text: ' + дія', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drink coffee', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' call me', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'who + ', tone: 'formula' },
          { text: 'did not', tone: 'danger' },
          { text: ' + ', tone: 'muted' },
          { text: 'use to', tone: 'accent' },
          { text: ' + action', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drink coffee', tone: 'normal' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'quem + ', tone: 'formula' }, { text: 'did not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'use to', tone: 'accent' }, { text: ' + ação', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' drink coffee', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' call me', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Armadilha principal: ', tone: 'strong' }, { text: 'na afirmação use used to, mas depois de did not use use to sem d.' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'He did not used to call me', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'ai + ', tone: 'formula' }, { text: 'did not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'use to', tone: 'accent' }, { text: ' + hành động', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' drink coffee', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' call me', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Bẫy chính: ', tone: 'strong' }, { text: 'câu khẳng định dùng used to, nhưng sau did not dùng use to không có d.' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'He did not used to call me', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'siapa + ', tone: 'formula' }, { text: 'did not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'use to', tone: 'accent' }, { text: ' + tindakan', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' drink coffee', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' call me', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Jebakan utama: ', tone: 'strong' }, { text: 'dalam pernyataan gunakan used to, tetapi setelah did not gunakan use to tanpa d.' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'He did not used to call me', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'kim + ', tone: 'formula' }, { text: 'did not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'use to', tone: 'accent' }, { text: ' + eylem', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' drink coffee', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' call me', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Ana tuzak: ', tone: 'strong' }, { text: 'olumlu cümlede used to, ama did not sonrasında d olmadan use to kullanılır.' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'He did not used to call me', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'kto + ', tone: 'formula' }, { text: 'did not', tone: 'danger' }, { text: ' + ', tone: 'muted' }, { text: 'use to', tone: 'accent' }, { text: ' + czynność', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' drink coffee', tone: 'normal' }] },
      { type: 'correct', parts: [{ text: 'He ', tone: 'strong' }, { text: 'did not', tone: 'danger' }, { text: ' ', tone: 'normal' }, { text: 'use to', tone: 'accent' }, { text: ' call me', tone: 'normal' }] },
      { type: 'tip', parts: [{ text: 'Główna pułapka: ', tone: 'strong' }, { text: 'w twierdzeniu jest used to, ale po did not użyj use to bez d.' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'He did not used to call me', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'раньше не',
        labelUK: 'раніше не',
        labelES: 'did not use to',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' understand English', tone: 'normal' },
        ],
        ru: 'Раньше я не понимал английский',
        uk: 'Раніше я не розумів англійську',
        es: 'Antes no entendía inglés',
        'pt-BR': 'Antes eu não entendia inglês',
        vi: 'Trước đây tôi không hiểu tiếng Anh',
        id: 'Dulu saya tidak memahami bahasa Inggris',
        tr: 'Eskiden İngilizce anlamazdım',
        pl: 'Kiedyś nie rozumiałem angielskiego',
        labelPtBr: 'antes não',
        labelVi: 'trước đây không',
        labelId: 'dulu tidak',
        labelTr: 'eskiden değil',
        labelPl: 'kiedyś nie',
        noteRU: 'После did not пишем use to, не used to.',
        noteUK: 'Після did not пишемо use to, не used to.',
        noteES: 'After did not, write use to, not used to.',
        notePtBr: 'Depois de did not, escreva use to, não used to.',
        noteVi: 'Sau did not, viết use to, không viết used to.',
        noteId: 'Setelah did not, tulis use to, bukan used to.',
        noteTr: 'did not sonrasında used to değil, use to yazılır.',
        notePl: 'Po did not piszemy use to, nie used to.',
      },
      {
        labelRU: 'she did not',
        labelUK: 'she did not',
        labelES: 'she did not',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'did not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'use to', tone: 'accent' },
          { text: ' drive at night', tone: 'normal' },
        ],
        ru: 'Раньше она не водила ночью',
        uk: 'Раніше вона не водила вночі',
        es: 'Antes ella no conducía de noche',
        'pt-BR': 'Antes ela não dirigia à noite',
        vi: 'Trước đây cô ấy không lái xe ban đêm',
        id: 'Dulu dia tidak menyetir pada malam hari',
        tr: 'Eskiden geceleri araba kullanmazdı',
        pl: 'Kiedyś nie jeździła nocą',
        labelPtBr: 'she did not',
        labelVi: 'she did not',
        labelId: 'she did not',
        labelTr: 'she did not',
        labelPl: 'she did not',
        noteRU: 'Did not уже показывает прошлое, поэтому use to без d.',
        noteUK: 'Did not уже показує минуле, тому use to без d.',
        noteES: 'Did not already marks the past, so use use to without d.',
        notePtBr: 'Did not já marca o passado; por isso use use to sem d.',
        noteVi: 'Did not đã đánh dấu quá khứ, nên dùng use to không có d.',
        noteId: 'Did not sudah menandai masa lampau, jadi gunakan use to tanpa d.',
        noteTr: 'Did not zaten geçmişi gösterir; bu yüzden d olmadan use to kullanılır.',
        notePl: 'Did not już oznacza przeszłość, więc użyj use to bez d.',
      },
    ],
  },

  {
    lessonId: 29,
    screenId: 'lesson_29_intro_4_questions_be_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'Вопросы и "used to be"',
    titleUK: 'Питання і "used to be"',
    titleES: 'Questions and "used to be"',
    titlePtBr: 'Perguntas e "used to be"',
    titleVi: 'Câu hỏi và "used to be"',
    titleId: 'Pertanyaan dan "used to be"',
    titleTr: 'Sorular ve "used to be"',
    titlePl: 'Pytania i "used to be"',

    subtitleRU: 'В вопросе Did выходит в начало, а used to снова становится use to.',
    subtitleUK: 'У питанні Did виходить на початок, а used to знову стає use to.',
    subtitleES: 'In questions, Did moves to the front, and used to becomes use to again.',
    subtitlePtBr: 'Nas perguntas, Did vai para o início, e used to vira use to de novo.',
    subtitleVi: 'Trong câu hỏi, Did đứng lên đầu, và used to lại thành use to.',
    subtitleId: 'Dalam pertanyaan, Did pindah ke depan, dan used to kembali menjadi use to.',
    subtitleTr: 'Sorularda Did başa gelir ve used to yeniden use to olur.',
    subtitlePl: 'W pytaniach Did idzie na początek, a used to znowu staje się use to.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' + кто + ', tone: 'formula' },
          { text: 'use to', tone: 'accent' },
          { text: ' + действие?', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' live here?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' she ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' call you?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' they ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' work together?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' he ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' study English?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' we ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' meet on Fridays?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' she ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' read books at night?', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'used to be', tone: 'accent' },
          { text: ' + состояние / качество', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' shy', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' afraid of mistakes', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'step',
        parts: [
          { text: '1. Утверждение "раньше..." -> ', tone: 'muted' },
          { text: 'used to', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Отрицание "раньше не..." -> ', tone: 'muted' },
          { text: 'did not use to', tone: 'danger' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Вопрос "раньше...?" -> ', tone: 'muted' },
          { text: 'Did + subject + use to', tone: 'danger' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. "Раньше был / была..." -> ', tone: 'muted' },
          { text: 'used to be', tone: 'accent' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Did you used to live here?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' live here?', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I used to shy', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' shy', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Главный навык урока: ', tone: 'strong' },
          { text: 'не путать used to в утверждении с use to после did / did not.', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' + хто + ', tone: 'formula' },
          { text: 'use to', tone: 'accent' },
          { text: ' + дія?', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' live here?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' she ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' call you?', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'used to be', tone: 'accent' },
          { text: ' + стан / якість', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' shy', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' + who + ', tone: 'formula' },
          { text: 'use to', tone: 'accent' },
          { text: ' + action?', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' live here?', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'used to be', tone: 'accent' },
          { text: ' + state / quality', tone: 'formula' },
        ],
      },
    ],
    linesPtBr: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'danger' }, { text: ' + quem + ', tone: 'formula' }, { text: 'use to', tone: 'accent' }, { text: ' + ação?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Did', tone: 'danger' }, { text: ' you ', tone: 'strong' }, { text: 'use to', tone: 'accent' }, { text: ' live here?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'used to be', tone: 'accent' }, { text: ' + estado / qualidade', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to be', tone: 'accent' }, { text: ' shy', tone: 'normal' }] },
      { type: 'step', parts: [{ text: 'Afirmação -> ', tone: 'muted' }, { text: 'used to', tone: 'accent' }] },
      { type: 'step', parts: [{ text: 'Pergunta -> ', tone: 'muted' }, { text: 'Did + subject + use to', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Não assim: ', tone: 'warning' }, { text: 'Did you used to live here?', tone: 'danger' }] },
    ],
    linesVi: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'danger' }, { text: ' + ai + ', tone: 'formula' }, { text: 'use to', tone: 'accent' }, { text: ' + hành động?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Did', tone: 'danger' }, { text: ' you ', tone: 'strong' }, { text: 'use to', tone: 'accent' }, { text: ' live here?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'used to be', tone: 'accent' }, { text: ' + trạng thái / phẩm chất', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to be', tone: 'accent' }, { text: ' shy', tone: 'normal' }] },
      { type: 'step', parts: [{ text: 'Khẳng định -> ', tone: 'muted' }, { text: 'used to', tone: 'accent' }] },
      { type: 'step', parts: [{ text: 'Câu hỏi -> ', tone: 'muted' }, { text: 'Did + subject + use to', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Không đúng: ', tone: 'warning' }, { text: 'Did you used to live here?', tone: 'danger' }] },
    ],
    linesId: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'danger' }, { text: ' + siapa + ', tone: 'formula' }, { text: 'use to', tone: 'accent' }, { text: ' + tindakan?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Did', tone: 'danger' }, { text: ' you ', tone: 'strong' }, { text: 'use to', tone: 'accent' }, { text: ' live here?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'used to be', tone: 'accent' }, { text: ' + keadaan / kualitas', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to be', tone: 'accent' }, { text: ' shy', tone: 'normal' }] },
      { type: 'step', parts: [{ text: 'Pernyataan -> ', tone: 'muted' }, { text: 'used to', tone: 'accent' }] },
      { type: 'step', parts: [{ text: 'Pertanyaan -> ', tone: 'muted' }, { text: 'Did + subject + use to', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Bukan begini: ', tone: 'warning' }, { text: 'Did you used to live here?', tone: 'danger' }] },
    ],
    linesTr: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'danger' }, { text: ' + kim + ', tone: 'formula' }, { text: 'use to', tone: 'accent' }, { text: ' + eylem?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Did', tone: 'danger' }, { text: ' you ', tone: 'strong' }, { text: 'use to', tone: 'accent' }, { text: ' live here?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'used to be', tone: 'accent' }, { text: ' + durum / nitelik', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to be', tone: 'accent' }, { text: ' shy', tone: 'normal' }] },
      { type: 'step', parts: [{ text: 'Olumlu -> ', tone: 'muted' }, { text: 'used to', tone: 'accent' }] },
      { type: 'step', parts: [{ text: 'Soru -> ', tone: 'muted' }, { text: 'Did + subject + use to', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Böyle değil: ', tone: 'warning' }, { text: 'Did you used to live here?', tone: 'danger' }] },
    ],
    linesPl: [
      { type: 'formula', parts: [{ text: 'Did', tone: 'danger' }, { text: ' + kto + ', tone: 'formula' }, { text: 'use to', tone: 'accent' }, { text: ' + czynność?', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'Did', tone: 'danger' }, { text: ' you ', tone: 'strong' }, { text: 'use to', tone: 'accent' }, { text: ' live here?', tone: 'normal' }] },
      { type: 'formula', parts: [{ text: 'used to be', tone: 'accent' }, { text: ' + stan / cecha', tone: 'formula' }] },
      { type: 'correct', parts: [{ text: 'I ', tone: 'strong' }, { text: 'used to be', tone: 'accent' }, { text: ' shy', tone: 'normal' }] },
      { type: 'step', parts: [{ text: 'Twierdzenie -> ', tone: 'muted' }, { text: 'used to', tone: 'accent' }] },
      { type: 'step', parts: [{ text: 'Pytanie -> ', tone: 'muted' }, { text: 'Did + subject + use to', tone: 'danger' }] },
      { type: 'wrong', parts: [{ text: 'Nie tak: ', tone: 'warning' }, { text: 'Did you used to live here?', tone: 'danger' }] },
    ],

    examples: [
      {
        labelRU: 'вопрос',
        labelUK: 'питання',
        labelES: 'question',
        en: [
          { text: 'Did', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'use to', tone: 'accent' },
          { text: ' wake up early?', tone: 'normal' },
        ],
        ru: 'Ты раньше просыпался рано?',
        uk: 'Ти раніше прокидався рано?',
        es: '¿Te despertabas temprano antes?',
        'pt-BR': 'Você acordava cedo antes?',
        vi: 'Trước đây bạn có thường dậy sớm không?',
        id: 'Apakah dulu kamu biasa bangun pagi?',
        tr: 'Eskiden erken uyanır mıydın?',
        pl: 'Czy kiedyś budziłeś się wcześnie?',
        labelPtBr: 'pergunta',
        labelVi: 'câu hỏi',
        labelId: 'pertanyaan',
        labelTr: 'soru',
        labelPl: 'pytanie',
        noteRU: 'После Did пишем use to без d.',
        noteUK: 'Після Did пишемо use to без d.',
        noteES: 'After Did, write use to without d.',
        notePtBr: 'Depois de Did, escreva use to sem d.',
        noteVi: 'Sau Did, viết use to không có d.',
        noteId: 'Setelah Did, tulis use to tanpa d.',
        noteTr: 'Did sonrasında d olmadan use to yazılır.',
        notePl: 'Po Did piszemy use to bez d.',
      },
      {
        labelRU: 'used to be',
        labelUK: 'used to be',
        labelES: 'used to be',
        en: [
          { text: 'She ', tone: 'strong' },
          { text: 'used to be', tone: 'accent' },
          { text: ' afraid of mistakes', tone: 'normal' },
        ],
        ru: 'Раньше она боялась ошибок',
        uk: 'Раніше вона боялася помилок',
        es: 'Antes ella tenía miedo de los errores',
        'pt-BR': 'Antes ela tinha medo de erros',
        vi: 'Trước đây cô ấy sợ mắc lỗi',
        id: 'Dulu dia takut membuat kesalahan',
        tr: 'Eskiden hata yapmaktan korkardı',
        pl: 'Kiedyś bała się błędów',
        labelPtBr: 'used to be',
        labelVi: 'used to be',
        labelId: 'used to be',
        labelTr: 'used to be',
        labelPl: 'used to be',
        noteRU: 'Для состояния нужен be: used to be afraid.',
        noteUK: 'Для стану потрібне be: used to be afraid.',
        noteES: 'For a state, use be: used to be afraid.',
        notePtBr: 'Para um estado, use be: used to be afraid.',
        noteVi: 'Với trạng thái, dùng be: used to be afraid.',
        noteId: 'Untuk keadaan, gunakan be: used to be afraid.',
        noteTr: 'Bir durum için be gerekir: used to be afraid.',
        notePl: 'Dla stanu potrzebne jest be: used to be afraid.',
      },
      {
        labelRU: 'изменение',
        labelUK: 'зміна',
        labelES: 'change',
        en: [
          { text: 'We ', tone: 'strong' },
          { text: 'used to', tone: 'accent' },
          { text: ' learn slowly, ', tone: 'normal' },
          { text: 'but now', tone: 'warning' },
          { text: ' we learn faster', tone: 'normal' },
        ],
        ru: 'Раньше мы учились медленно, но сейчас учимся быстрее',
        uk: 'Раніше ми вчилися повільно, але зараз вчимося швидше',
        es: 'Antes aprendíamos despacio, pero ahora aprendemos más rápido',
        'pt-BR': 'Antes aprendíamos devagar, mas agora aprendemos mais rápido',
        vi: 'Trước đây chúng tôi học chậm, nhưng bây giờ chúng tôi học nhanh hơn',
        id: 'Dulu kami belajar perlahan, tetapi sekarang kami belajar lebih cepat',
        tr: 'Eskiden yavaş öğrenirdik, ama şimdi daha hızlı öğreniyoruz',
        pl: 'Kiedyś uczyliśmy się powoli, ale teraz uczymy się szybciej',
        labelPtBr: 'mudança',
        labelVi: 'thay đổi',
        labelId: 'perubahan',
        labelTr: 'değişim',
        labelPl: 'zmiana',
        noteRU: 'Фраза показывает изменение: раньше медленно, сейчас быстрее.',
        noteUK: 'Фраза показує зміну: раніше повільно, зараз швидше.',
        noteES: 'The sentence shows change: slowly before, faster now.',
        notePtBr: 'A frase mostra mudança: antes devagar, agora mais rápido.',
        noteVi: 'Câu này cho thấy sự thay đổi: trước đây chậm, bây giờ nhanh hơn.',
        noteId: 'Kalimat ini menunjukkan perubahan: dulu perlahan, sekarang lebih cepat.',
        noteTr: 'Cümle değişimi gösterir: eskiden yavaş, şimdi daha hızlı.',
        notePl: 'Zdanie pokazuje zmianę: kiedyś wolno, teraz szybciej.',
      },
    ],
  },
];

export const LESSON_30_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 30,
    screenId: 'lesson_30_intro_1_who_people',
    order: 1,
    kind: 'concept',

    titleRU: 'Который говорит о человеке',
    titleUK: 'Який говорить про людину',
    titleES: 'Who for people',
    titlePtBr: 'Who para pessoas',
    titleVi: 'Who cho người',
    titleId: 'Who untuk orang',
    titleTr: 'Kişiler için who',
    titlePl: 'Who dla osób',

    subtitleRU: 'who добавляет информацию о человеке: мужчина, который работает здесь.',
    subtitleUK: 'who додає інформацію про людину: чоловік, який працює тут.',
    subtitleES: 'who adds information about a person: a man who works here.',
    subtitlePtBr: 'who adiciona informação sobre uma pessoa: um homem que trabalha aqui.',
    subtitleVi: 'who thêm thông tin về một người: một người đàn ông làm việc ở đây.',
    subtitleId: 'who menambahkan informasi tentang orang: seorang pria yang bekerja di sini.',
    subtitleTr: 'who bir kişi hakkında bilgi ekler: burada çalışan bir adam.',
    subtitlePl: 'who dodaje informację o osobie: mężczyzna, który tu pracuje.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'В этом уроке фраза часто состоит из двух частей: ', tone: 'normal' },
          { text: 'главная мысль', tone: 'strong' },
          { text: ' + ', tone: 'normal' },
          { text: 'уточнение', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'человек', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + действие / описание', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She knows a woman ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' speaks English', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We met a person ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' can help us', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They called a doctor ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' lives nearby', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I have a friend ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' studies every day', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She has a sister ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works at night', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'если уточняешь человека, в этом уроке выбирай who.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I know a man which works here', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'У цьому уроці фраза часто складається з двох частин: ', tone: 'normal' },
          { text: 'головна думка', tone: 'strong' },
          { text: ' + ', tone: 'normal' },
          { text: 'уточнення', tone: 'strong' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'людина', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + дія / опис', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We met a person ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' can help us', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'Use ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' if the extra information is about a person.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'person', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + action / description', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'text',
        parts: [
          { text: 'Use ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' quando a informação extra é sobre uma pessoa.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'pessoa', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + ação / descrição', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Verificação principal: ', tone: 'strong' },
          { text: 'se você explica uma pessoa, escolha who nesta lição.', tone: 'normal' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'text',
        parts: [
          { text: 'Dùng ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' khi thông tin bổ sung nói về một người.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'người', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + hành động / mô tả', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Cách kiểm tra chính: ', tone: 'strong' },
          { text: 'nếu bạn đang nói rõ về người, hãy chọn who trong bài này.', tone: 'normal' },
        ],
      },
    ],

    linesId: [
      {
        type: 'text',
        parts: [
          { text: 'Gunakan ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' jika informasi tambahan membahas orang.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'orang', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + tindakan / deskripsi', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Pemeriksaan utama: ', tone: 'strong' },
          { text: 'jika yang dijelaskan adalah orang, pilih who dalam pelajaran ini.', tone: 'normal' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'text',
        parts: [
          { text: 'Ek bilgi bir kişi hakkındaysa ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' kullan.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'kişi', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + eylem / açıklama', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Ana kontrol: ', tone: 'strong' },
          { text: 'bir kişiyi açıklıyorsan bu derste who seç.', tone: 'normal' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'text',
        parts: [
          { text: 'Użyj ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' gdy dodatkowa informacja dotyczy osoby.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'osoba', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ' + czynność / opis', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' works here', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Główna kontrola: ', tone: 'strong' },
          { text: 'jeśli doprecyzowujesz osobę, w tej lekcji wybierz who.', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'человек + who',
        labelUK: 'людина + who',
        labelES: 'person + who',
        labelPtBr: 'pessoa + who',
        labelVi: 'người + who',
        labelId: 'orang + who',
        labelTr: 'kişi + who',
        labelPl: 'osoba + who',
        en: [
          { text: 'This is the student ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' answered correctly', tone: 'normal' },
        ],
        ru: 'Это студент, который ответил правильно',
        uk: 'Це студент, який відповів правильно',
        es: 'Este es el estudiante que respondió correctamente',
        'pt-BR': 'Este é o aluno que respondeu corretamente',
        vi: 'Đây là học viên đã trả lời đúng',
        id: 'Ini siswa yang menjawab dengan benar',
        tr: 'Doğru cevap veren öğrenci bu',
        pl: 'To jest student, który odpowiedział poprawnie',
        noteRU: 'Student - человек, поэтому who.',
        noteUK: 'Student - людина, тому who.',
        noteES: 'Student is a person, so use who.',
        notePtBr: 'Student é uma pessoa, então use who.',
        noteVi: 'Student là người, nên dùng who.',
        noteId: 'Student adalah orang, jadi gunakan who.',
        noteTr: 'Student bir kişidir, bu yüzden who kullanılır.',
        notePl: 'Student to osoba, więc użyj who.',
      },
      {
        labelRU: 'люди + who',
        labelUK: 'люди + who',
        labelES: 'people + who',
        labelPtBr: 'pessoas + who',
        labelVi: 'người + who',
        labelId: 'orang-orang + who',
        labelTr: 'insanlar + who',
        labelPl: 'ludzie + who',
        en: [
          { text: 'I like people ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' listen carefully', tone: 'normal' },
        ],
        ru: 'Мне нравятся люди, которые внимательно слушают',
        uk: 'Мені подобаються люди, які уважно слухають',
        es: 'Me gustan las personas que escuchan con atención',
        'pt-BR': 'Gosto de pessoas que escutam com atenção',
        vi: 'Tôi thích những người lắng nghe cẩn thận',
        id: 'Saya suka orang yang mendengarkan dengan saksama',
        tr: 'Dikkatle dinleyen insanları severim',
        pl: 'Lubię ludzi, którzy uważnie słuchają',
        noteRU: 'People - люди, поэтому who.',
        noteUK: 'People - люди, тому who.',
        noteES: 'People means persons, so use who.',
        notePtBr: 'People significa pessoas, então use who.',
        noteVi: 'People là người, nên dùng who.',
        noteId: 'People berarti orang, jadi gunakan who.',
        noteTr: 'People insan demektir, bu yüzden who kullanılır.',
        notePl: 'People oznacza ludzi, więc użyj who.',
      },
    ],
  },

  {
    lessonId: 30,
    screenId: 'lesson_30_intro_2_that_which_things',
    order: 2,
    kind: 'formula',

    titleRU: 'Который говорит о вещи',
    titleUK: 'Який говорить про річ',
    titleES: 'That / which for things',
    titlePtBr: 'That / which para coisas',
    titleVi: 'That / which cho vật',
    titleId: 'That / which untuk benda',
    titleTr: 'Şeyler için that / which',
    titlePl: 'That / which dla rzeczy',

    subtitleRU: 'that и which добавляют информацию о предмете, приложении, телефоне, книге, сообщении или плане.',
    subtitleUK: 'that і which додають інформацію про предмет, додаток, телефон, книгу, повідомлення або план.',
    subtitleES: 'that and which add information about a thing, app, phone, book, message, or plan.',
    subtitlePtBr: 'that e which adicionam informação sobre um objeto, aplicativo, telefone, livro, mensagem ou plano.',
    subtitleVi: 'that và which thêm thông tin về đồ vật, ứng dụng, điện thoại, sách, tin nhắn hoặc kế hoạch.',
    subtitleId: 'that dan which menambahkan informasi tentang benda, aplikasi, ponsel, buku, pesan, atau rencana.',
    subtitleTr: 'that ve which bir nesne, uygulama, telefon, kitap, mesaj veya plan hakkında bilgi ekler.',
    subtitlePl: 'that i which dodają informację o rzeczy, aplikacji, telefonie, książce, wiadomości albo planie.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'предмет / вещь', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + уточнение', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the phone ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' I bought yesterday', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the book ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' she read', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'These are the tickets ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' we found', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the message ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' he sent me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the problem ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' we solved', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'This is the food ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we ordered', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'если уточняешь не человека, а вещь или идею, в этом уроке выбирай that / which.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'This is the phone who I bought yesterday', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'This is the phone ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' I bought yesterday', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'предмет / річ', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + уточнення', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'thing', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + extra information', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'formula',
        parts: [
          { text: 'coisa / ideia', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + informação extra', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Verificação principal: ', tone: 'strong' },
          { text: 'se não é pessoa, use that / which nesta lição.', tone: 'normal' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'formula',
        parts: [
          { text: 'vật / ý tưởng', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + thông tin bổ sung', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Cách kiểm tra chính: ', tone: 'strong' },
          { text: 'nếu không phải người, hãy dùng that / which trong bài này.', tone: 'normal' },
        ],
      },
    ],

    linesId: [
      {
        type: 'formula',
        parts: [
          { text: 'benda / ide', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + informasi tambahan', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Pemeriksaan utama: ', tone: 'strong' },
          { text: 'jika bukan orang, gunakan that / which dalam pelajaran ini.', tone: 'normal' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'formula',
        parts: [
          { text: 'şey / fikir', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + ek bilgi', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Ana kontrol: ', tone: 'strong' },
          { text: 'kişi değilse bu derste that / which kullan.', tone: 'normal' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'formula',
        parts: [
          { text: 'rzecz / idea', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ' + dodatkowa informacja', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Główna kontrola: ', tone: 'strong' },
          { text: 'jeśli to nie osoba, w tej lekcji użyj that / which.', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'that',
        labelUK: 'that',
        labelES: 'that',
        labelPtBr: 'that',
        labelVi: 'that',
        labelId: 'that',
        labelTr: 'that',
        labelPl: 'that',
        en: [
          { text: 'This is the answer ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' she gave me', tone: 'normal' },
        ],
        ru: 'Это ответ, который она дала мне',
        uk: 'Це відповідь, яку вона дала мені',
        es: 'Esta es la respuesta que ella me dio',
        'pt-BR': 'Esta é a resposta que ela me deu',
        vi: 'Đây là câu trả lời mà cô ấy đã đưa cho tôi',
        id: 'Ini jawaban yang dia berikan kepada saya',
        tr: 'Bana verdiği cevap bu',
        pl: 'To jest odpowiedź, którą mi dała',
        noteRU: 'Answer - не человек, поэтому that.',
        noteUK: 'Answer - не людина, тому that.',
        noteES: 'Answer is not a person, so use that.',
        notePtBr: 'Answer não é uma pessoa, então use that.',
        noteVi: 'Answer không phải là người, nên dùng that.',
        noteId: 'Answer bukan orang, jadi gunakan that.',
        noteTr: 'Answer bir kişi değildir, bu yüzden that kullanılır.',
        notePl: 'Answer nie jest osobą, więc użyj that.',
      },
      {
        labelRU: 'which',
        labelUK: 'which',
        labelES: 'which',
        labelPtBr: 'which',
        labelVi: 'which',
        labelId: 'which',
        labelTr: 'which',
        labelPl: 'which',
        en: [
          { text: 'This is the plan ', tone: 'normal' },
          { text: 'which', tone: 'warning' },
          { text: ' we chose', tone: 'normal' },
        ],
        ru: 'Это план, который мы выбрали',
        uk: 'Це план, який ми обрали',
        es: 'Este es el plan que elegimos',
        'pt-BR': 'Este é o plano que escolhemos',
        vi: 'Đây là kế hoạch mà chúng tôi đã chọn',
        id: 'Ini rencana yang kami pilih',
        tr: 'Seçtiğimiz plan bu',
        pl: 'To jest plan, który wybraliśmy',
        noteRU: 'Which здесь тоже уточняет вещь / идею.',
        noteUK: 'Which тут теж уточнює річ / ідею.',
        noteES: 'Which also adds information about a thing or idea here.',
        notePtBr: 'Which aqui também acrescenta informação sobre uma coisa ou ideia.',
        noteVi: 'Which ở đây cũng bổ sung thông tin về một vật hoặc ý tưởng.',
        noteId: 'Which di sini juga menambahkan informasi tentang benda atau ide.',
        noteTr: 'Which burada bir şey ya da fikir hakkında ek bilgi verir.',
        notePl: 'Which tutaj też dodaje informację o rzeczy albo idei.',
      },
    ],
  },

  {
    lessonId: 30,
    screenId: 'lesson_30_intro_3_where_whose',
    order: 3,
    kind: 'formula',

    titleRU: 'Где и чей',
    titleUK: 'Де і чий',
    titleES: 'Where and whose',
    titlePtBr: 'Where e whose',
    titleVi: 'Where và whose',
    titleId: 'Where dan whose',
    titleTr: 'Where ve whose',
    titlePl: 'Where i whose',

    subtitleRU: 'where уточняет место. whose показывает принадлежность: чей телефон, чья сумка, чьи ключи.',
    subtitleUK: 'where уточнює місце. whose показує належність: чий телефон, чия сумка, чиї ключі.',
    subtitleES: 'where adds location. whose shows possession: whose phone, whose bag, whose keys.',
    subtitlePtBr: 'where adiciona lugar. whose mostra posse: de quem é o telefone, a bolsa ou as chaves.',
    subtitleVi: 'where thêm địa điểm. whose chỉ sự sở hữu: điện thoại, túi hoặc chìa khóa của ai.',
    subtitleId: 'where menambahkan lokasi. whose menunjukkan kepemilikan: ponsel, tas, atau kunci milik siapa.',
    subtitleTr: 'where yer bilgisini ekler. whose sahipliği gösterir: kimin telefonu, çantası veya anahtarları.',
    subtitlePl: 'where doprecyzowuje miejsce. whose pokazuje przynależność: czyj telefon, czyja torba, czyje klucze.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'место', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + что там происходит / произошло', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the room ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' I work', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the house ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' she lives', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the shop ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' I bought the phone', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the hotel ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' they stayed', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the table ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' I left the keys', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'человек', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + предмет + остальная часть', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She knows a woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We helped a student ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' answer was wrong', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' keys we found', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'This is the place who we met', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I know a man who phone is lost', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'місце', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + що там відбувається / відбулося', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'людина', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + предмет + решта', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'place', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + what happens there', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'person', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + thing + rest', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'formula',
        parts: [
          { text: 'lugar', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + o que acontece ali', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'pessoa', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + coisa + resto', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'formula',
        parts: [
          { text: 'nơi chốn', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + điều xảy ra ở đó', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'người', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + vật + phần còn lại', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
    ],

    linesId: [
      {
        type: 'formula',
        parts: [
          { text: 'tempat', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + apa yang terjadi di sana', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'orang', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + benda + sisa kalimat', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'formula',
        parts: [
          { text: 'yer', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + orada olan şey', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'kişi', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + şey + kalan kısım', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'formula',
        parts: [
          { text: 'miejsce', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ' + co tam się dzieje', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'osoba', tone: 'formula' },
          { text: ' + ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ' + rzecz + reszta', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I know a man ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' phone is lost', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'where',
        labelUK: 'where',
        labelES: 'where',
        labelPtBr: 'where',
        labelVi: 'where',
        labelId: 'where',
        labelTr: 'where',
        labelPl: 'where',
        en: [
          { text: 'Find a place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' you can study', tone: 'normal' },
        ],
        ru: 'Найди место, где ты можешь заниматься',
        uk: 'Знайди місце, де ти можеш займатися',
        es: 'Encuentra un lugar donde puedas estudiar',
        'pt-BR': 'Encontre um lugar onde você possa estudar',
        vi: 'Hãy tìm một nơi mà bạn có thể học',
        id: 'Temukan tempat di mana kamu bisa belajar',
        tr: 'Çalışabileceğin bir yer bul',
        pl: 'Znajdź miejsce, w którym możesz się uczyć',
        noteRU: 'Place - место, поэтому where.',
        noteUK: 'Place - місце, тому where.',
        noteES: 'Place is a location, so use where.',
        notePtBr: 'Place é um lugar, então use where.',
        noteVi: 'Place là địa điểm, nên dùng where.',
        noteId: 'Place adalah tempat, jadi gunakan where.',
        noteTr: 'Place bir yerdir, bu yüzden where kullanılır.',
        notePl: 'Place to miejsce, więc użyj where.',
      },
      {
        labelRU: 'whose',
        labelUK: 'whose',
        labelES: 'whose',
        labelPtBr: 'whose',
        labelVi: 'whose',
        labelId: 'whose',
        labelTr: 'whose',
        labelPl: 'whose',
        en: [
          { text: 'This is the teacher ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' lesson helped me', tone: 'normal' },
        ],
        ru: 'Это учитель, чей урок помог мне',
        uk: 'Це вчитель, чий урок допоміг мені',
        es: 'Este es el maestro cuya lección me ayudó',
        'pt-BR': 'Este é o professor cuja aula me ajudou',
        vi: 'Đây là giáo viên mà bài học của họ đã giúp tôi',
        id: 'Ini guru yang pelajarannya membantu saya',
        tr: 'Dersi bana yardımcı olan öğretmen bu',
        pl: 'To jest nauczyciel, którego lekcja mi pomogła',
        noteRU: 'Whose связывает человека и то, что ему принадлежит: teacher -> lesson.',
        noteUK: 'Whose звʼязує людину і те, що їй належить: teacher -> lesson.',
        noteES: 'Whose connects a person with something connected to them: teacher -> lesson.',
        notePtBr: 'Whose liga uma pessoa a algo associado a ela: teacher -> lesson.',
        noteVi: 'Whose nối một người với thứ gắn với người đó: teacher -> lesson.',
        noteId: 'Whose menghubungkan seseorang dengan sesuatu yang terkait dengannya: teacher -> lesson.',
        noteTr: 'Whose bir kişiyi onunla bağlantılı bir şeyle bağlar: teacher -> lesson.',
        notePl: 'Whose łączy osobę z czymś z nią związanym: teacher -> lesson.',
      },
    ],
  },

  {
    lessonId: 30,
    screenId: 'lesson_30_intro_4_questions_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'Как собирать такие фразы в задании',
    titleUK: 'Як складати такі фрази в завданні',
    titleES: 'How to build these sentences in the task',
    titlePtBr: 'Como montar essas frases na tarefa',
    titleVi: 'Cách ghép những câu này trong bài tập',
    titleId: 'Cara menyusun kalimat seperti ini dalam latihan',
    titleTr: 'Bu cümleleri alıştırmada nasıl kurarsın',
    titlePl: 'Jak składać takie zdania w zadaniu',

    subtitleRU: 'Сначала найди слово, которое нужно уточнить: человек, предмет, место или принадлежность.',
    subtitleUK: 'Спочатку знайди слово, яке треба уточнити: людина, предмет, місце або належність.',
    subtitleES: 'First find what needs extra information: person, thing, place, or possession.',
    subtitlePtBr: 'Primeiro encontre a palavra que precisa de detalhe: pessoa, objeto, lugar ou posse.',
    subtitleVi: 'Trước hết tìm từ cần được làm rõ: người, vật, nơi chốn hoặc sự sở hữu.',
    subtitleId: 'Pertama temukan kata yang perlu dijelaskan: orang, benda, tempat, atau kepemilikan.',
    subtitleTr: 'Önce açıklanması gereken sözcüğü bul: kişi, nesne, yer ya da sahiplik.',
    subtitlePl: 'Najpierw znajdź słowo, które trzeba doprecyzować: osoba, rzecz, miejsce albo przynależność.',

    linesRU: [
      {
        type: 'step',
        parts: [
          { text: '1. Уточняешь человека? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
          { text: ': the man who called me', tone: 'normal' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Уточняешь предмет / вещь? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
          { text: ': the app that helps you learn', tone: 'normal' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Уточняешь место? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
          { text: ': the place where we met', tone: 'normal' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. Уточняешь "чей / чья / чьи"? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
          { text: ': the woman whose bag is here', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'Do you know the man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' called me?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Do you remember the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Почему learn без to: ', tone: 'strong' },
          { text: 'после help + кого-то действие часто идёт без to: helps you learn. Вариант helps you to learn тоже возможен, но здесь дана короткая естественная форма.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are these the documents ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' you checked?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are they the people ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' helped us?', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Is this the app who helps you learn?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'Is she the woman who bag is here?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Главный навык урока: ', tone: 'strong' },
          { text: 'не переводить русский "который" одним словом. Сначала реши: человек, вещь, место или чей.', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'step',
        parts: [
          { text: '1. Уточнюєш людину? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. Уточнюєш предмет / річ? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. Уточнюєш місце? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. Уточнюєш "чий / чия / чиї"? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Do you know the man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' called me?', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'step',
        parts: [
          { text: 'Person? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Thing? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Place? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Possession? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'step',
        parts: [
          { text: 'Pessoa? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Coisa ou ideia? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Lugar? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Posse? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'step',
        parts: [
          { text: 'Người? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Vật hoặc ý tưởng? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Nơi chốn? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Sở hữu? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
      },
    ],

    linesId: [
      {
        type: 'step',
        parts: [
          { text: 'Orang? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Benda atau ide? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Tempat? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Kepemilikan? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'step',
        parts: [
          { text: 'Kişi mi? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Şey ya da fikir mi? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Yer mi? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Sahiplik mi? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'step',
        parts: [
          { text: 'Osoba? ', tone: 'muted' },
          { text: 'who', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Rzecz albo idea? ', tone: 'muted' },
          { text: 'that / which', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Miejsce? ', tone: 'muted' },
          { text: 'where', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: 'Przynależność? ', tone: 'muted' },
          { text: 'whose', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is this the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps you learn?', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'вопрос с who',
        labelUK: 'питання з who',
        labelES: 'question with who',
        labelPtBr: 'pergunta com who',
        labelVi: 'câu hỏi với who',
        labelId: 'pertanyaan dengan who',
        labelTr: 'who sorusu',
        labelPl: 'pytanie z who',
        en: [
          { text: 'Are they the people ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' helped us?', tone: 'normal' },
        ],
        ru: 'Это те люди, которые помогли нам?',
        uk: 'Це ті люди, які допомогли нам?',
        es: '¿Son ellos las personas que nos ayudaron?',
        'pt-BR': 'São essas as pessoas que nos ajudaram?',
        vi: 'Họ có phải là những người đã giúp chúng ta không?',
        id: 'Apakah mereka orang-orang yang membantu kita?',
        tr: 'Bize yardım eden kişiler onlar mı?',
        pl: 'Czy to są ludzie, którzy nam pomogli?',
        noteRU: 'People - люди, поэтому who.',
        noteUK: 'People - люди, тому who.',
        noteES: 'People are persons, so use who.',
        notePtBr: 'People significa pessoas, então use who.',
        noteVi: 'People là người, nên dùng who.',
        noteId: 'People berarti orang, jadi gunakan who.',
        noteTr: 'People insan demektir, bu yüzden who kullanılır.',
        notePl: 'People oznacza ludzi, więc użyj who.',
      },
      {
        labelRU: 'команда с where',
        labelUK: 'команда з where',
        labelES: 'command with where',
        labelPtBr: 'comando com where',
        labelVi: 'câu mệnh lệnh với where',
        labelId: 'perintah dengan where',
        labelTr: 'where ile komut',
        labelPl: 'polecenie z where',
        en: [
          { text: 'Find a place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' you can study', tone: 'normal' },
        ],
        ru: 'Найди место, где ты можешь заниматься',
        uk: 'Знайди місце, де ти можеш займатися',
        es: 'Encuentra un lugar donde puedas estudiar',
        'pt-BR': 'Encontre um lugar onde você possa estudar',
        vi: 'Hãy tìm một nơi mà bạn có thể học',
        id: 'Temukan tempat di mana kamu bisa belajar',
        tr: 'Çalışabileceğin bir yer bul',
        pl: 'Znajdź miejsce, w którym możesz się uczyć',
        noteRU: 'Place требует where.',
        noteUK: 'Place вимагає where.',
        noteES: 'Use where for a place.',
        notePtBr: 'Place pede where.',
        noteVi: 'Place cần where.',
        noteId: 'Place memerlukan where.',
        noteTr: 'Place, where gerektirir.',
        notePl: 'Place wymaga where.',
      },
      {
        labelRU: 'вопрос с whose',
        labelUK: 'питання з whose',
        labelES: 'question with whose',
        labelPtBr: 'pergunta com whose',
        labelVi: 'câu hỏi với whose',
        labelId: 'pertanyaan dengan whose',
        labelTr: 'whose sorusu',
        labelPl: 'pytanie z whose',
        en: [
          { text: 'Is she the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag is here?', tone: 'normal' },
        ],
        ru: 'Это та женщина, чья сумка здесь?',
        uk: 'Це та жінка, чия сумка тут?',
        es: '¿Es ella la mujer cuya bolsa está aquí?',
        'pt-BR': 'Ela é a mulher cuja bolsa está aqui?',
        vi: 'Cô ấy có phải là người phụ nữ có chiếc túi ở đây không?',
        id: 'Apakah dia wanita yang tasnya ada di sini?',
        tr: 'Çantası burada olan kadın o mu?',
        pl: 'Czy ona jest kobietą, której torba jest tutaj?',
        noteRU: 'Чья сумка = whose bag.',
        noteUK: 'Чия сумка = whose bag.',
        noteES: 'Whose bag means possession.',
        notePtBr: 'De quem é a bolsa = whose bag.',
        noteVi: 'Túi của ai = whose bag.',
        noteId: 'Tas milik siapa = whose bag.',
        noteTr: 'Kimin çantası = whose bag.',
        notePl: 'Czyja torba = whose bag.',
      },
    ],
  },
];

export const LESSON_31_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 31,
    screenId: 'lesson_31_intro_1_causative_perception_bare_infinitive',
    order: 1,
    kind: 'concept',

    titleRU: 'После made / let / heard / noticed',
    titleUK: 'Після made / let / heard / noticed',
    titleES: 'After made / let / heard / noticed',
    titlePtBr: 'Depois de made / let / heard / noticed',
    titleVi: 'Sau made / let / heard / noticed',
    titleId: 'Setelah made / let / heard / noticed',
    titleTr: 'made / let / heard / noticed sonrasında',
    titlePl: 'Po made / let / heard / noticed',

    subtitleRU: 'В этом уроке после made, let, heard, saw, noticed, felt и helped часто идёт действие без to.',
    subtitleUK: 'У цьому уроці після made, let, heard, saw, noticed, felt і helped часто йде дія без to.',
    subtitleES: 'In this lesson, after made, let, heard, saw, noticed, felt, and helped, the action often goes without to.',
    subtitlePtBr: 'Nesta lição, depois de made, let, heard, saw, noticed, felt e helped, a ação muitas vezes vem sem to.',
    subtitleVi: 'Trong bài này, sau made, let, heard, saw, noticed, felt và helped, hành động thường đi không có to.',
    subtitleId: 'Dalam pelajaran ini, setelah made, let, heard, saw, noticed, felt, dan helped, tindakan sering datang tanpa to.',
    subtitleTr: 'Bu derste made, let, heard, saw, noticed, felt ve helped sonrasında eylem çoğu zaman to olmadan gelir.',
    subtitlePl: 'W tej lekcji po made, let, heard, saw, noticed, felt i helped czynność często występuje bez to.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'Главная ловушка урока: ', tone: 'strong' },
          { text: 'после made / let / saw / heard / noticed часто не ставим to перед вторым действием.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + кто / что + ', tone: 'formula' },
          { text: 'действие без to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Но ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' работает иначе: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'made', tone: 'accent' },
          { text: ' us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'let', tone: 'accent' },
          { text: ' me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'saw', tone: 'accent' },
          { text: ' him ', tone: 'normal' },
          { text: 'leave', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'heard', tone: 'accent' },
          { text: ' me ', tone: 'normal' },
          { text: 'call', tone: 'warning' },
          { text: ' her', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'felt', tone: 'accent' },
          { text: ' the phone ', tone: 'normal' },
          { text: 'vibrate', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This lesson ', tone: 'strong' },
          { text: 'helped', tone: 'accent' },
          { text: ' me ', tone: 'normal' },
          { text: 'understand', tone: 'warning' },
          { text: ' English better', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'They made us to wait outside', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'He let me to use his phone', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'He let me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'text',
        parts: [
          { text: 'Головна пастка уроку: ', tone: 'strong' },
          { text: 'після made / let / saw / heard / noticed часто не ставимо to перед другою дією.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + хто / що + ', tone: 'formula' },
          { text: 'дія без to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Але ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' працює інакше: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'made', tone: 'accent' },
          { text: ' us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'let', tone: 'accent' },
          { text: ' me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'saw', tone: 'accent' },
          { text: ' him ', tone: 'normal' },
          { text: 'leave', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'text',
        parts: [
          { text: 'The main trap: after made / let / saw / heard / noticed, often do not put ', tone: 'normal' },
          { text: 'to', tone: 'danger' },
          { text: ' before the second action.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + person / thing + ', tone: 'formula' },
          { text: 'action without to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'But ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' is different: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'text',
        parts: [
          { text: 'A armadilha principal: depois de made / let / saw / heard / noticed, muitas vezes não coloque ', tone: 'normal' },
          { text: 'to', tone: 'danger' },
          { text: ' antes da segunda ação.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + pessoa / coisa + ', tone: 'formula' },
          { text: 'ação sem to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Mas ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' é diferente: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'text',
        parts: [
          { text: 'Bẫy chính: sau made / let / saw / heard / noticed, thường không đặt ', tone: 'normal' },
          { text: 'to', tone: 'danger' },
          { text: ' trước hành động thứ hai.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + người / vật + ', tone: 'formula' },
          { text: 'hành động không có to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Nhưng ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' khác: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    linesId: [
      {
        type: 'text',
        parts: [
          { text: 'Jebakan utama: setelah made / let / saw / heard / noticed, sering jangan menaruh ', tone: 'normal' },
          { text: 'to', tone: 'danger' },
          { text: ' sebelum tindakan kedua.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + orang / benda + ', tone: 'formula' },
          { text: 'tindakan tanpa to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Tetapi ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' berbeda: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'text',
        parts: [
          { text: 'Ana tuzak: made / let / saw / heard / noticed sonrasında ikinci eylemden önce çoğu zaman ', tone: 'normal' },
          { text: 'to', tone: 'danger' },
          { text: ' koyma.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + kişi / şey + ', tone: 'formula' },
          { text: 'to olmadan eylem', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Ama ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' farklı çalışır: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'text',
        parts: [
          { text: 'Główna pułapka: po made / let / saw / heard / noticed często nie stawiamy ', tone: 'normal' },
          { text: 'to', tone: 'danger' },
          { text: ' przed drugą czynnością.', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'made / let / heard / saw / noticed / felt / helped', tone: 'accent' },
          { text: ' + osoba / rzecz + ', tone: 'formula' },
          { text: 'czynność bez to', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Ale ', tone: 'normal' },
          { text: 'would like', tone: 'accent' },
          { text: ' działa inaczej: object + ', tone: 'normal' },
          { text: 'to + verb', tone: 'warning' },
          { text: '.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'made',
        labelUK: 'made',
        labelES: 'made',
        labelPtBr: 'made',
        labelVi: 'made',
        labelId: 'made',
        labelTr: 'made',
        labelPl: 'made',
        en: [
          { text: 'That firm manager made that late employee ', tone: 'normal' },
          { text: 'finish', tone: 'warning' },
          { text: ' that boring report', tone: 'normal' },
        ],
        ru: 'Тот жёсткий руководитель заставил того опоздавшего сотрудника закончить тот скучный отчёт',
        uk: 'Той рішучий керівник змусив того запізненого співробітника закінчити той нудний звіт',
        es: 'Ese gerente firme hizo terminar ese informe aburrido a ese empleado tardío',
        'pt-BR': 'Aquele gerente firme fez aquele funcionário atrasado terminar aquele relatório chato',
        vi: 'Người quản lý cứng rắn đó đã bắt nhân viên đến muộn đó hoàn thành bản báo cáo nhàm chán đó',
        id: 'Manajer tegas itu membuat karyawan yang terlambat itu menyelesaikan laporan membosankan itu',
        tr: 'O sert yönetici, o geç kalan çalışana o sıkıcı raporu bitirtti',
        pl: 'Ten stanowczy kierownik kazał temu spóźnionemu pracownikowi skończyć ten nudny raport',
        noteRU: 'После made второе действие finish идёт без to.',
        noteUK: 'Після made друга дія finish йде без to.',
        noteES: 'After made, use finish without to.',
        notePtBr: 'Depois de made, use finish sem to.',
        noteVi: 'Sau made, dùng finish không có to.',
        noteId: 'Setelah made, gunakan finish tanpa to.',
        noteTr: 'made sonrasında finish to olmadan kullanılır.',
        notePl: 'Po made użyj finish bez to.',
      },
      {
        labelRU: 'heard',
        labelUK: 'heard',
        labelES: 'heard',
        labelPtBr: 'heard',
        labelVi: 'heard',
        labelId: 'heard',
        labelTr: 'heard',
        labelPl: 'heard',
        en: [
          { text: 'They heard that skilled mechanic ', tone: 'normal' },
          { text: 'explain', tone: 'warning' },
          { text: ' that serious engine problem', tone: 'normal' },
        ],
        ru: 'Они слышали, как тот опытный механик объяснял ту серьёзную неисправность мотора',
        uk: 'Вони чули, як той вправний механік пояснював ту серйозну несправність мотора',
        es: 'Oyeron explicar a ese mecánico hábil ese grave problema del motor',
        'pt-BR': 'Eles ouviram aquele mecânico habilidoso explicar aquele problema sério do motor',
        vi: 'Họ đã nghe người thợ máy lành nghề đó giải thích vấn đề nghiêm trọng đó của động cơ',
        id: 'Mereka mendengar mekanik terampil itu menjelaskan masalah mesin yang serius itu',
        tr: 'O yetenekli tamircinin o ciddi motor sorununu açıkladığını duydular',
        pl: 'Usłyszeli, jak ten wykwalifikowany mechanik wyjaśnia ten poważny problem z silnikiem',
        noteRU: 'После heard действие explain тоже без to.',
        noteUK: 'Після heard дія explain теж без to.',
        noteES: 'After heard, use explain without to.',
        notePtBr: 'Depois de heard, use explain sem to.',
        noteVi: 'Sau heard, dùng explain không có to.',
        noteId: 'Setelah heard, gunakan explain tanpa to.',
        noteTr: 'heard sonrasında explain to olmadan kullanılır.',
        notePl: 'Po heard użyj explain bez to.',
      },
    ],
  },

  {
    lessonId: 31,
    screenId: 'lesson_31_intro_2_complex_noun_groups',
    order: 2,
    kind: 'formula',

    titleRU: 'Длинные группы: that + описание + предмет',
    titleUK: 'Довгі групи: that + опис + предмет',
    titleES: 'Long groups: that + description + noun',
    titlePtBr: 'Grupos longos: that + descrição + substantivo',
    titleVi: 'Cụm dài: that + mô tả + danh từ',
    titleId: 'Kelompok panjang: that + deskripsi + nomina',
    titleTr: 'Uzun gruplar: that + açıklama + isim',
    titlePl: 'Długie grupy: that + opis + rzeczownik',

    subtitleRU: 'В уроке много длинных блоков. Их надо собирать как один предмет, а не как хаос из слов.',
    subtitleUK: 'В уроці багато довгих блоків. Їх треба складати як один предмет, а не як хаос зі слів.',
    subtitleES: 'This lesson has many long noun groups. Build them as one unit, not as random words.',
    subtitlePtBr: 'Esta lição tem muitos grupos nominais longos. Monte cada grupo como uma unidade, não como palavras soltas.',
    subtitleVi: 'Bài này có nhiều cụm danh từ dài. Hãy ghép chúng như một đơn vị, không phải các từ rời rạc.',
    subtitleId: 'Pelajaran ini punya banyak kelompok nomina panjang. Susun sebagai satu unit, bukan kata-kata acak.',
    subtitleTr: 'Bu derste çok uzun isim grupları var. Onları dağınık kelimeler gibi değil, tek bir birim gibi kur.',
    subtitlePl: 'W tej lekcji jest wiele długich grup rzeczownikowych. Składaj je jako jedną całość, nie jako przypadkowe słowa.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + описание + предмет', tone: 'formula' },
          { text: ' = тот / та / то / те ...', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
          { text: ' = тот неопытный водитель', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'huge fine', tone: 'warning' },
          { text: ' = тот огромный штраф', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'complex flight procedure', tone: 'warning' },
          { text: ' = та сложная процедура полёта', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'leather briefcase', tone: 'warning' },
          { text: ' = тот кожаный портфель', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'old jazz composition', tone: 'warning' },
          { text: ' = та старая джазовая композиция', tone: 'muted' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'They made ', tone: 'normal' },
          { text: 'that inexperienced driver', tone: 'warning' },
          { text: ' pay ', tone: 'normal' },
          { text: 'that huge fine', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I heard ', tone: 'normal' },
          { text: 'that experienced pilot', tone: 'warning' },
          { text: ' explain ', tone: 'normal' },
          { text: 'that complex flight procedure', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She heard ', tone: 'normal' },
          { text: 'that famous singer', tone: 'warning' },
          { text: ' sing ', tone: 'normal' },
          { text: 'that old jazz composition', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'tip',
        parts: [
          { text: 'Главная проверка: ', tone: 'strong' },
          { text: 'не пытайся переводить каждое слово отдельно. Сначала собери noun group: that + описание + предмет.', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так по смыслу: ', tone: 'warning' },
          { text: 'that driver inexperienced', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'that inexperienced driver', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + опис + предмет', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'huge fine', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + description + noun', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + descrição + substantivo', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Verificação principal: ', tone: 'strong' },
          { text: 'primeiro monte o noun group inteiro: that + descrição + substantivo.', tone: 'normal' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + mô tả + danh từ', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Cách kiểm tra chính: ', tone: 'strong' },
          { text: 'trước hết ghép cả noun group: that + mô tả + danh từ.', tone: 'normal' },
        ],
      },
    ],

    linesId: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + deskripsi + nomina', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Pemeriksaan utama: ', tone: 'strong' },
          { text: 'susun dulu seluruh noun group: that + deskripsi + nomina.', tone: 'normal' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + açıklama + isim', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Ana kontrol: ', tone: 'strong' },
          { text: 'önce tüm noun group yapısını kur: that + açıklama + isim.', tone: 'normal' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'formula',
        parts: [
          { text: 'that', tone: 'accent' },
          { text: ' + opis + rzeczownik', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'that ', tone: 'accent' },
          { text: 'inexperienced driver', tone: 'warning' },
        ],
      },
      {
        type: 'tip',
        parts: [
          { text: 'Główna kontrola: ', tone: 'strong' },
          { text: 'najpierw złóż całą grupę noun group: that + opis + rzeczownik.', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'noun group',
        labelUK: 'noun group',
        labelES: 'noun group',
        labelPtBr: 'noun group',
        labelVi: 'noun group',
        labelId: 'noun group',
        labelTr: 'noun group',
        labelPl: 'noun group',
        en: [
          { text: 'that ', tone: 'accent' },
          { text: 'suspicious visitor', tone: 'warning' },
        ],
        ru: 'тот подозрительный посетитель',
        uk: 'той підозрілий відвідувач',
        es: 'ese visitante sospechoso',
        'pt-BR': 'aquele visitante suspeito',
        vi: 'vị khách đáng ngờ đó',
        id: 'pengunjung mencurigakan itu',
        tr: 'o şüpheli ziyaretçi',
        pl: 'ten podejrzany gość',
        noteRU: 'Описание suspicious стоит перед предметом visitor.',
        noteUK: 'Опис suspicious стоїть перед предметом visitor.',
        noteES: 'The description suspicious comes before the noun visitor.',
        notePtBr: 'A descrição suspicious vem antes do substantivo visitor.',
        noteVi: 'Phần mô tả suspicious đứng trước danh từ visitor.',
        noteId: 'Deskripsi suspicious berada sebelum nomina visitor.',
        noteTr: 'suspicious açıklaması visitor isminden önce gelir.',
        notePl: 'Opis suspicious stoi przed rzeczownikiem visitor.',
      },
      {
        labelRU: 'noun group',
        labelUK: 'noun group',
        labelES: 'noun group',
        labelPtBr: 'noun group',
        labelVi: 'noun group',
        labelId: 'noun group',
        labelTr: 'noun group',
        labelPl: 'noun group',
        en: [
          { text: 'that ', tone: 'accent' },
          { text: 'serious engine problem', tone: 'warning' },
        ],
        ru: 'та серьёзная неисправность мотора',
        uk: 'та серйозна несправність мотора',
        es: 'ese grave problema del motor',
        'pt-BR': 'aquele problema sério do motor',
        vi: 'vấn đề nghiêm trọng đó của động cơ',
        id: 'masalah mesin yang serius itu',
        tr: 'o ciddi motor sorunu',
        pl: 'ten poważny problem z silnikiem',
        noteRU: 'В английском описания идут перед главным предметом problem.',
        noteUK: 'В англійській описи йдуть перед головним предметом problem.',
        noteES: 'In English, descriptions come before the main noun problem.',
        notePtBr: 'Em inglês, as descrições vêm antes do substantivo principal problem.',
        noteVi: 'Trong tiếng Anh, phần mô tả đứng trước danh từ chính problem.',
        noteId: 'Dalam bahasa Inggris, deskripsi datang sebelum nomina utama problem.',
        noteTr: 'İngilizcede açıklamalar ana isim olan problem öncesine gelir.',
        notePl: 'W angielskim opisy stoją przed głównym rzeczownikiem problem.',
      },
      {
        labelRU: 'mural',
        labelUK: 'mural',
        labelES: 'mural',
        labelPtBr: 'mural',
        labelVi: 'mural',
        labelId: 'mural',
        labelTr: 'mural',
        labelPl: 'mural',
        en: [
          { text: 'that ', tone: 'accent' },
          { text: 'massive mural', tone: 'warning' },
        ],
        ru: 'та огромная настенная роспись',
        uk: 'той величезний мурал',
        es: 'ese mural enorme',
        'pt-BR': 'aquele mural enorme',
        vi: 'bức tranh tường khổng lồ đó',
        id: 'mural besar itu',
        tr: 'o devasa duvar resmi',
        pl: 'ten ogromny mural',
        noteRU: 'Mural - это большая настенная роспись; massive описывает ее размер.',
        noteUK: 'Mural - це великий настінний розпис; massive описує його розмір.',
        noteES: 'Mural means a large wall painting; massive describes its size.',
        notePtBr: 'Mural significa uma grande pintura de parede; massive descreve o tamanho.',
        noteVi: 'Mural là một bức tranh lớn trên tường; massive mô tả kích thước.',
        noteId: 'Mural adalah lukisan besar di dinding; massive menjelaskan ukurannya.',
        noteTr: 'Mural büyük bir duvar resmidir; massive onun boyutunu anlatır.',
        notePl: 'Mural to duże malowidło ścienne; massive opisuje jego rozmiar.',
      },
    ],
  },

  {
    lessonId: 31,
    screenId: 'lesson_31_intro_3_conditionals_reported_passive',
    order: 3,
    kind: 'formula',

    titleRU: 'Сложные связки: если бы, сказали, что, было сделано',
    titleUK: 'Складні звʼязки: якби, сказали, що, було зроблено',
    titleES: 'Complex links: if had, said that, was done',
    titlePtBr: 'Ligações complexas: if had, said that, was done',
    titleVi: 'Liên kết phức tạp: if had, said that, was done',
    titleId: 'Penghubung kompleks: if had, said that, was done',
    titleTr: 'Karmaşık bağlar: if had, said that, was done',
    titlePl: 'Złożone połączenia: if had, said that, was done',

    subtitleRU: 'В середине урока повторяются сильные конструкции: Third Conditional, reported speech и passive.',
    subtitleUK: 'У середині уроку повторюються сильні конструкції: Third Conditional, reported speech і passive.',
    subtitleES: 'The middle of the lesson revisits strong structures: Third Conditional, reported speech, and passive.',
    subtitlePtBr: 'No meio da lição, voltam estruturas fortes: Third Conditional, reported speech e passive.',
    subtitleVi: 'Ở giữa bài học, các cấu trúc mạnh xuất hiện lại: Third Conditional, reported speech và passive.',
    subtitleId: 'Di tengah pelajaran, struktur kuat muncul lagi: Third Conditional, reported speech, dan passive.',
    subtitleTr: 'Dersin ortasında güçlü yapılar tekrar edilir: Third Conditional, reported speech ve passive.',
    subtitlePl: 'W środku lekcji wracają mocne konstrukcje: Third Conditional, reported speech i passive.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
          { text: ' = если бы..., то бы...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If she ', tone: 'normal' },
          { text: 'had called', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have answered', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If they ', tone: 'normal' },
          { text: 'had checked', tone: 'accent' },
          { text: ' the room, they ', tone: 'normal' },
          { text: 'would have found', tone: 'warning' },
          { text: ' the keys', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'said that + форма со сдвигом времени', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'had sent', tone: 'warning' },
          { text: ' the documents', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'was / were told that + passive', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'was told that', tone: 'accent' },
          { text: ' the app ', tone: 'strong' },
          { text: 'was fixed', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the problem ', tone: 'strong' },
          { text: 'was solved', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'If I knew, I would have helped', tone: 'danger' },
          { text: ' если смысл "если бы я знал тогда"', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + зміщена часова форма', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + forma deslocada ou passiva', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + dạng lùi thì hoặc bị động', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
    ],

    linesId: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + bentuk bergeser atau pasif', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + zaman kaydırma ya da passive', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + przesunięta forma albo strona bierna', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'Third Conditional',
        labelUK: 'Third Conditional',
        labelES: 'Third Conditional',
        labelPtBr: 'Third Conditional',
        labelVi: 'Third Conditional',
        labelId: 'Third Conditional',
        labelTr: 'Third Conditional',
        labelPl: 'Third Conditional',
        en: [
          { text: 'If we ', tone: 'normal' },
          { text: 'had started', tone: 'accent' },
          { text: ' earlier, we ', tone: 'normal' },
          { text: 'would have finished', tone: 'warning' },
        ],
        ru: 'Если бы мы начали раньше, мы бы закончили',
        uk: 'Якби ми почали раніше, ми б закінчили',
        es: 'Si hubiéramos empezado antes, habríamos terminado',
        'pt-BR': 'Se tivéssemos começado mais cedo, teríamos terminado',
        vi: 'Nếu chúng tôi đã bắt đầu sớm hơn, chúng tôi đã hoàn thành rồi',
        id: 'Jika kami mulai lebih awal, kami pasti sudah selesai',
        tr: 'Daha erken başlasaydık bitirmiş olurduk',
        pl: 'Gdybyśmy zaczęli wcześniej, skończylibyśmy',
        noteRU: 'Это сожаление о прошлом: had started + would have finished.',
        noteUK: 'Це жаль про минуле: had started + would have finished.',
        noteES: 'This is about an unreal past: had started + would have finished.',
        notePtBr: 'É uma situação irreal no passado: had started + would have finished.',
        noteVi: 'Đây là tình huống không có thật trong quá khứ: had started + would have finished.',
        noteId: 'Ini situasi tidak nyata di masa lalu: had started + would have finished.',
        noteTr: 'Bu geçmişte gerçek olmayan bir durumdur: had started + would have finished.',
        notePl: 'To sytuacja nierzeczywista w przeszłości: had started + would have finished.',
      },
      {
        labelRU: 'reported passive',
        labelUK: 'reported passive',
        labelES: 'reported passive',
        labelPtBr: 'reported passive',
        labelVi: 'reported passive',
        labelId: 'reported passive',
        labelTr: 'reported passive',
        labelPl: 'reported passive',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'was told that', tone: 'accent' },
          { text: ' the app ', tone: 'strong' },
          { text: 'was fixed', tone: 'warning' },
        ],
        ru: 'Мне сказали, что приложение починили',
        uk: 'Мені сказали, що додаток полагодили',
        es: 'Me dijeron que la aplicación fue arreglada',
        'pt-BR': 'Me disseram que o aplicativo foi corrigido',
        vi: 'Tôi được bảo rằng ứng dụng đã được sửa',
        id: 'Saya diberi tahu bahwa aplikasi itu sudah diperbaiki',
        tr: 'Bana uygulamanın düzeltildiği söylendi',
        pl: 'Powiedziano mi, że aplikacja została naprawiona',
        noteRU: 'was told вводит пересказ, was fixed показывает пассив.',
        noteUK: 'was told вводить переказ, was fixed показує пасив.',
        noteES: 'was told introduces the report, and was fixed is passive.',
        notePtBr: 'was told introduz o relato, e was fixed mostra o passivo.',
        noteVi: 'was told mở phần tường thuật, còn was fixed là bị động.',
        noteId: 'was told membuka laporan, dan was fixed menunjukkan pasif.',
        noteTr: 'was told aktarımı başlatır; was fixed passive yapıdır.',
        notePl: 'was told wprowadza relację, a was fixed pokazuje stronę bierną.',
      },
    ],
  },

  {
    lessonId: 31,
    screenId: 'lesson_31_intro_4_final_advanced_mix',
    order: 4,
    kind: 'practice',

    titleRU: 'Финальные формы урока',
    titleUK: 'Фінальні форми уроку',
    titleES: 'Final advanced forms',
    titlePtBr: 'Formas avançadas finais',
    titleVi: 'Các dạng nâng cao cuối bài',
    titleId: 'Bentuk lanjutan terakhir',
    titleTr: 'Son ileri yapılar',
    titlePl: 'Końcowe formy zaawansowane',

    subtitleRU: 'В конце урока идут have been + -ing, is being + V3, would rather и need / want + object + V3.',
    subtitleUK: 'Наприкінці уроку йдуть have been + -ing, is being + V3, would rather і need / want + object + V3.',
    subtitleES: 'At the end of the lesson: have been + -ing, is being + V3, would rather, and need / want + object + V3.',
    subtitlePtBr: 'No fim da lição: have been + -ing, is being + V3, would rather e need / want + object + V3.',
    subtitleVi: 'Cuối bài học có: have been + -ing, is being + V3, would rather và need / want + object + V3.',
    subtitleId: 'Di akhir pelajaran: have been + -ing, is being + V3, would rather, dan need / want + object + V3.',
    subtitleTr: 'Dersin sonunda: have been + -ing, is being + V3, would rather ve need / want + object + V3.',
    subtitlePl: 'Na końcu lekcji: have been + -ing, is being + V3, would rather oraz need / want + object + V3.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = действие длится до сейчас', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'has been studying', tone: 'accent' },
          { text: ' all morning', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'have been working', tone: 'accent' },
          { text: ' since eight', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = прямо сейчас что-то делается с предметом', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The room ', tone: 'strong' },
          { text: 'is being cleaned', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The documents ', tone: 'strong' },
          { text: 'are being checked', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
          { text: ' = я бы предпочёл, чтобы...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'did not call', tone: 'warning' },
          { text: ' him', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' we ', tone: 'strong' },
          { text: 'started', tone: 'warning' },
          { text: ' later', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'need / want + object + V3', tone: 'accent' },
          { text: ' = нужно / хотят, чтобы это сделали', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need ', tone: 'normal' },
          { text: 'the documents', tone: 'strong' },
          { text: ' checked today', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We need ', tone: 'normal' },
          { text: 'the room', tone: 'strong' },
          { text: ' cleaned before evening', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They want ', tone: 'normal' },
          { text: 'the problem', tone: 'strong' },
          { text: ' solved quickly', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I would rather you stay here', tone: 'danger' },
          { text: ' в этой фразе урока', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'I would rather you ', tone: 'danger' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I need the documents check today', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = дія триває дотепер', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = над предметом зараз виконують дію', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The room ', tone: 'strong' },
          { text: 'is being cleaned', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
          { text: ' = я б волів, щоб...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = ação que continua até agora', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = algo está sendo feito agora', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = hành động kéo dài đến hiện tại', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = điều gì đó đang được làm ngay bây giờ', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesId: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = tindakan berlanjut sampai sekarang', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = sesuatu sedang dikerjakan sekarang', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = şimdiye kadar süren eylem', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = bir şey şu anda yapılıyor', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = czynność trwa do teraz', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = coś jest właśnie wykonywane', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'have been',
        labelUK: 'have been',
        labelES: 'have been',
        labelPtBr: 'have been',
        labelVi: 'have been',
        labelId: 'have been',
        labelTr: 'have been',
        labelPl: 'have been',
        en: [
          { text: 'They ', tone: 'strong' },
          { text: 'have been looking', tone: 'accent' },
          { text: ' for the keys', tone: 'normal' },
        ],
        ru: 'Они ищут ключи',
        uk: 'Вони шукають ключі',
        es: 'Han estado buscando las llaves',
        'pt-BR': 'Eles têm procurado as chaves',
        vi: 'Họ đã và đang tìm chìa khóa',
        id: 'Mereka telah mencari kuncinya',
        tr: 'Anahtarları arayıp duruyorlar',
        pl: 'Oni szukają kluczy',
        noteRU: 'have been looking показывает процесс, который тянется до сейчас.',
        noteUK: 'have been looking показує процес, який триває дотепер.',
        noteES: 'have been looking shows a process continuing up to now.',
        notePtBr: 'have been looking mostra um processo que continua até agora.',
        noteVi: 'have been looking cho thấy một quá trình kéo dài đến hiện tại.',
        noteId: 'have been looking menunjukkan proses yang berlanjut sampai sekarang.',
        noteTr: 'have been looking şimdiye kadar süren bir süreci gösterir.',
        notePl: 'have been looking pokazuje proces trwający do teraz.',
      },
      {
        labelRU: 'object + V3',
        labelUK: 'object + V3',
        labelES: 'object + V3',
        labelPtBr: 'object + V3',
        labelVi: 'object + V3',
        labelId: 'object + V3',
        labelTr: 'object + V3',
        labelPl: 'object + V3',
        en: [
          { text: 'They want ', tone: 'normal' },
          { text: 'the problem', tone: 'strong' },
          { text: ' solved quickly', tone: 'warning' },
        ],
        ru: 'Они хотят, чтобы проблему решили быстро',
        uk: 'Вони хочуть, щоб проблему вирішили швидко',
        es: 'Quieren el problema resuelto rápidamente',
        'pt-BR': 'Eles querem o problema resolvido rapidamente',
        vi: 'Họ muốn vấn đề được giải quyết nhanh chóng',
        id: 'Mereka ingin masalah itu diselesaikan dengan cepat',
        tr: 'Sorunun hızlıca çözülmesini istiyorlar',
        pl: 'Chcą, żeby problem został szybko rozwiązany',
        noteRU: 'Solved показывает желаемый результат для problem.',
        noteUK: 'Solved показує бажаний результат для problem.',
        noteES: 'Solved shows the desired result for problem.',
        notePtBr: 'Solved mostra o resultado desejado para problem.',
        noteVi: 'Solved cho thấy kết quả mong muốn cho problem.',
        noteId: 'Solved menunjukkan hasil yang diinginkan untuk problem.',
        noteTr: 'Solved, problem için istenen sonucu gösterir.',
        notePl: 'Solved pokazuje pożądany rezultat dla problem.',
      },
    ],
  },
];

export const LESSON_32_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    lessonId: 32,
    screenId: 'lesson_32_intro_1_be_used_to',
    order: 1,
    kind: 'concept',

    titleRU: 'Привык к действию',
    titleUK: 'Звик до дії',
    titleES: 'Used to doing something',
    titlePtBr: 'Acostumado a fazer algo',
    titleVi: 'Quen với việc làm gì đó',
    titleId: 'Terbiasa melakukan sesuatu',
    titleTr: 'Bir şeyi yapmaya alışık olmak',
    titlePl: 'Przyzwyczajony do wykonywania czynności',

    subtitleRU: 'be used to + V-ing значит "быть привыкшим к действию". Это не used to из урока 29.',
    subtitleUK: 'be used to + V-ing означає "бути звиклим до дії". Це не used to з уроку 29.',
    subtitleES: 'be used to + V-ing means "be accustomed to doing something". This is not past used to.',
    subtitlePtBr: 'be used to + V-ing significa "estar acostumado a uma ação". Não é o used to do passado da lição 29.',
    subtitleVi: 'be used to + V-ing nghĩa là "quen với một hành động". Đây không phải used to chỉ quá khứ ở bài 29.',
    subtitleId: 'be used to + V-ing berarti "terbiasa dengan suatu tindakan". Ini bukan past used to dari pelajaran 29.',
    subtitleTr: 'be used to + V-ing "bir eyleme alışık olmak" demektir. Bu, 29. dersteki geçmiş used to değildir.',
    subtitlePl: 'be used to + V-ing znaczy "być przyzwyczajonym do czynności". To nie jest used to z lekcji 29.',

    linesRU: [
      {
        type: 'text',
        parts: [
          { text: 'В уроке 29 было ', tone: 'normal' },
          { text: 'used to + действие', tone: 'accent' },
          { text: ' = раньше делал, сейчас уже не так.', tone: 'normal' },
        ],
      },
      {
        type: 'text',
        parts: [
          { text: 'В уроке 32 другое:', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' = привык к действию', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'is', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' waking up early', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'are', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' speaking English every day', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'are', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' waiting here', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'not', tone: 'danger' },
          { text: ' ставится после am / is / are, а ', tone: 'normal' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' остаётся.', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'is', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' driving in the city', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'not', tone: 'danger' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' working so late', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' + subject + ', tone: 'formula' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' studying every day?', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' living here?', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I used to working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' ', tone: 'normal' },
          { text: 'used to', tone: 'warning' },
          { text: ' working at night', tone: 'danger' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She is used to wake up early', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'She is used to ', tone: 'normal' },
          { text: 'waking up', tone: 'danger' },
          { text: ' early', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' = звик до дії', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' studying every day?', tone: 'danger' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'working at night', tone: 'danger' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' = acostumado à ação', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' studying every day?', tone: 'danger' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' = quen với hành động', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' studying every day?', tone: 'danger' },
        ],
      },
    ],

    linesId: [
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' = terbiasa dengan tindakan', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' studying every day?', tone: 'danger' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' = eyleme alışık', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' studying every day?', tone: 'danger' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'formula',
        parts: [
          { text: 'am / is / are', tone: 'accent' },
          { text: ' + ', tone: 'muted' },
          { text: 'used to', tone: 'warning' },
          { text: ' + ', tone: 'muted' },
          { text: 'V-ing', tone: 'danger' },
          { text: ' = przyzwyczajony do czynności', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'am', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'working at night', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Are', tone: 'accent' },
          { text: ' you ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' studying every day?', tone: 'danger' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'привык',
        labelUK: 'звик',
        labelES: 'used to',
        labelPtBr: 'acostumado',
        labelVi: 'quen',
        labelId: 'terbiasa',
        labelTr: 'alışık',
        labelPl: 'przyzwyczajony',
        en: [
          { text: 'We ', tone: 'strong' },
          { text: 'are', tone: 'accent' },
          { text: ' used to ', tone: 'warning' },
          { text: 'speaking English every day', tone: 'danger' },
        ],
        ru: 'Мы привыкли говорить по-английски каждый день',
        uk: 'Ми звикли говорити англійською щодня',
        es: 'Estamos acostumbrados a hablar inglés todos los días',
        'pt-BR': 'Estamos acostumados a falar inglês todos os dias',
        vi: 'Chúng tôi đã quen với việc nói tiếng Anh mỗi ngày',
        id: 'Kami terbiasa berbicara bahasa Inggris setiap hari',
        tr: 'Her gün İngilizce konuşmaya alışkınız',
        pl: 'Jesteśmy przyzwyczajeni do mówienia po angielsku codziennie',
        noteRU: 'После be used to действие идёт в -ing форме.',
        noteUK: 'Після be used to дія йде у формі -ing.',
        noteES: 'After be used to, the action takes -ing.',
        notePtBr: 'Depois de be used to, a ação fica na forma -ing.',
        noteVi: 'Sau be used to, hành động dùng dạng -ing.',
        noteId: 'Setelah be used to, tindakan memakai bentuk -ing.',
        noteTr: 'be used to sonrasında eylem -ing biçimini alır.',
        notePl: 'Po be used to czynność ma formę -ing.',
      },
      {
        labelRU: 'вопрос',
        labelUK: 'питання',
        labelES: 'question',
        labelPtBr: 'pergunta',
        labelVi: 'câu hỏi',
        labelId: 'pertanyaan',
        labelTr: 'soru',
        labelPl: 'pytanie',
        en: [
          { text: 'Are', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'used to', tone: 'warning' },
          { text: ' living here?', tone: 'danger' },
        ],
        ru: 'Они привыкли жить здесь?',
        uk: 'Вони звикли жити тут?',
        es: '¿Están acostumbrados a vivir aquí?',
        'pt-BR': 'Eles estão acostumados a morar aqui?',
        vi: 'Họ đã quen sống ở đây chưa?',
        id: 'Apakah mereka terbiasa tinggal di sini?',
        tr: 'Burada yaşamaya alışkınlar mı?',
        pl: 'Czy oni są przyzwyczajeni do mieszkania tutaj?',
        noteRU: 'В вопросе Are выходит в начало, но living остаётся с -ing.',
        noteUK: 'У питанні Are виходить на початок, але living залишається з -ing.',
        noteES: 'In a question, Are moves to the front, but living keeps -ing.',
        notePtBr: 'Na pergunta, Are vai para o início, mas living mantém -ing.',
        noteVi: 'Trong câu hỏi, Are đứng đầu câu, nhưng living vẫn giữ -ing.',
        noteId: 'Dalam pertanyaan, Are pindah ke awal, tetapi living tetap memakai -ing.',
        noteTr: 'Soruda Are başa gelir, ama living -ing biçiminde kalır.',
        notePl: 'W pytaniu Are przechodzi na początek, ale living zachowuje -ing.',
      },
    ],
  },

  {
    lessonId: 32,
    screenId: 'lesson_32_intro_2_relative_reported_passive',
    order: 2,
    kind: 'formula',

    titleRU: 'Уточнения и пересказ',
    titleUK: 'Уточнення і переказ',
    titleES: 'Extra information and reporting',
    titlePtBr: 'Informação extra e relato',
    titleVi: 'Thông tin bổ sung và tường thuật',
    titleId: 'Informasi tambahan dan laporan',
    titleTr: 'Ek bilgi ve aktarma',
    titlePl: 'Doprecyzowanie i relacjonowanie',

    subtitleRU: 'В середине урока смешиваются relative clauses, reported speech и passive.',
    subtitleUK: 'У середині уроку змішуються relative clauses, reported speech і passive.',
    subtitleES: 'The middle of the lesson mixes relative clauses, reported speech, and passive.',
    subtitlePtBr: 'No meio da lição, misturam-se relative clauses, reported speech e passive.',
    subtitleVi: 'Ở giữa bài học có sự kết hợp của relative clauses, reported speech và passive.',
    subtitleId: 'Di tengah pelajaran, relative clauses, reported speech, dan passive bercampur.',
    subtitleTr: 'Dersin ortasında relative clauses, reported speech ve passive birlikte kullanılır.',
    subtitlePl: 'W środku lekcji mieszają się relative clauses, reported speech i passive.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = уточняющий блок внутри фразы', tone: 'formula' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'correct',
        parts: [
          { text: 'This is the person ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' helped me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She is the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag we found', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the place ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we met', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I called the man ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' sent the message', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We found the keys ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' she lost', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They opened the room ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we waited', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I remember the teacher ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' lesson helped me', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'said that / explained that / was told that', tone: 'accent' },
          { text: ' + пересказ', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' he ', tone: 'strong' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' she ', tone: 'strong' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'said that', tone: 'accent' },
          { text: ' they ', tone: 'strong' },
          { text: 'had sent', tone: 'warning' },
          { text: ' the documents', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'were told that', tone: 'accent' },
          { text: ' the room ', tone: 'strong' },
          { text: 'was cleaned', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'was told that', tone: 'accent' },
          { text: ' the app ', tone: 'strong' },
          { text: 'was fixed', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She is the woman who bag we found', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'She is the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag we found', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'She said that she will call later', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'She said that she ', tone: 'normal' },
          { text: 'would', tone: 'warning' },
          { text: ' call later', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = уточнення всередині фрази', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the person ', tone: 'normal' },
          { text: 'who', tone: 'accent' },
          { text: ' helped me', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She is the woman ', tone: 'normal' },
          { text: 'whose', tone: 'warning' },
          { text: ' bag we found', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + переказ', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He said that he ', tone: 'normal' },
          { text: 'was', tone: 'warning' },
          { text: ' tired', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = extra information inside the sentence', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + reported idea', tone: 'formula' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = informação extra dentro da frase', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + ideia relatada', tone: 'formula' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = thông tin bổ sung trong câu', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + ý được tường thuật', tone: 'formula' },
        ],
      },
    ],

    linesId: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = informasi tambahan di dalam kalimat', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + gagasan yang dilaporkan', tone: 'formula' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = cümlenin içinde ek bilgi', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + aktarılan fikir', tone: 'formula' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'formula',
        parts: [
          { text: 'who / that / where / whose', tone: 'accent' },
          { text: ' = dodatkowa informacja w zdaniu', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This is the app ', tone: 'normal' },
          { text: 'that', tone: 'accent' },
          { text: ' helps me learn', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'said that / was told that', tone: 'accent' },
          { text: ' + relacjonowana myśl', tone: 'formula' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'relative',
        labelUK: 'relative',
        labelES: 'relative',
        labelPtBr: 'relative',
        labelVi: 'relative',
        labelId: 'relative',
        labelTr: 'relative',
        labelPl: 'relative',
        en: [
          { text: 'They opened the room ', tone: 'normal' },
          { text: 'where', tone: 'accent' },
          { text: ' we waited', tone: 'normal' },
        ],
        ru: 'Они открыли комнату, где мы ждали',
        uk: 'Вони відкрили кімнату, де ми чекали',
        es: 'Abrieron la habitación donde esperábamos',
        'pt-BR': 'Eles abriram a sala onde esperávamos',
        vi: 'Họ đã mở căn phòng nơi chúng tôi đã chờ',
        id: 'Mereka membuka ruangan tempat kami menunggu',
        tr: 'Beklediğimiz odayı açtılar',
        pl: 'Otworzyli pokój, w którym czekaliśmy',
        noteRU: 'Room - место, поэтому where.',
        noteUK: 'Room - місце, тому where.',
        noteES: 'Room is a place, so use where.',
        notePtBr: 'Room é um lugar, então use where.',
        noteVi: 'Room là địa điểm, nên dùng where.',
        noteId: 'Room adalah tempat, jadi gunakan where.',
        noteTr: 'Room bir yerdir, bu yüzden where kullanılır.',
        notePl: 'Room to miejsce, więc użyj where.',
      },
      {
        labelRU: 'reported passive',
        labelUK: 'reported passive',
        labelES: 'reported passive',
        labelPtBr: 'reported passive',
        labelVi: 'reported passive',
        labelId: 'reported passive',
        labelTr: 'reported passive',
        labelPl: 'reported passive',
        en: [
          { text: 'I ', tone: 'strong' },
          { text: 'was told that', tone: 'accent' },
          { text: ' the app ', tone: 'strong' },
          { text: 'was fixed', tone: 'warning' },
        ],
        ru: 'Мне сказали, что приложение починили',
        uk: 'Мені сказали, що додаток полагодили',
        es: 'Me dijeron que la aplicación fue arreglada',
        'pt-BR': 'Me disseram que o aplicativo foi corrigido',
        vi: 'Tôi được bảo rằng ứng dụng đã được sửa',
        id: 'Saya diberi tahu bahwa aplikasi itu sudah diperbaiki',
        tr: 'Bana uygulamanın düzeltildiği söylendi',
        pl: 'Powiedziano mi, że aplikacja została naprawiona',
        noteRU: 'was told вводит пересказ, was fixed показывает пассив.',
        noteUK: 'was told вводить переказ, was fixed показує пасив.',
        noteES: 'was told introduces the report, and was fixed is passive.',
        notePtBr: 'was told introduz o relato, e was fixed mostra o passivo.',
        noteVi: 'was told mở phần tường thuật, còn was fixed là bị động.',
        noteId: 'was told membuka laporan, dan was fixed menunjukkan pasif.',
        noteTr: 'was told aktarımı başlatır; was fixed passive yapıdır.',
        notePl: 'was told wprowadza relację, a was fixed pokazuje stronę bierną.',
      },
    ],
  },

  {
    lessonId: 32,
    screenId: 'lesson_32_intro_3_conditionals_bare_infinitive',
    order: 3,
    kind: 'formula',

    titleRU: 'If и действие без to',
    titleUK: 'If і дія без to',
    titleES: 'If and action without to',
    titlePtBr: 'If e ação sem to',
    titleVi: 'If và hành động không có to',
    titleId: 'If dan tindakan tanpa to',
    titleTr: 'If ve to olmadan eylem',
    titlePl: 'If i czynność bez to',

    subtitleRU: 'Этот экран закрывает две большие ловушки: will после if и лишнее to после saw / heard / made / let.',
    subtitleUK: 'Цей екран закриває дві великі пастки: will після if і зайве to після saw / heard / made / let.',
    subtitleES: 'This screen covers two big traps: will after if and extra to after saw / heard / made / let.',
    subtitlePtBr: 'Esta tela cobre duas armadilhas grandes: will depois de if e to extra depois de saw / heard / made / let.',
    subtitleVi: 'Màn này xử lý hai bẫy lớn: will sau if và to thừa sau saw / heard / made / let.',
    subtitleId: 'Layar ini menutup dua jebakan besar: will setelah if dan to tambahan setelah saw / heard / made / let.',
    subtitleTr: 'Bu ekran iki büyük tuzağı kapatır: if sonrasında will ve saw / heard / made / let sonrasında fazladan to.',
    subtitlePl: 'Ten ekran zamyka dwie duże pułapki: will po if oraz zbędne to po saw / heard / made / let.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + действие', tone: 'warning' },
          { text: ' = реальное будущее условие', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' she has time, she ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' help us', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' they do not come, we ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' start without them', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'If + had + V3, ', tone: 'formula' },
          { text: 'would have + V3', tone: 'danger' },
          { text: ' = нереальное прошлое', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If I ', tone: 'normal' },
          { text: 'had known', tone: 'accent' },
          { text: ', I ', tone: 'normal' },
          { text: 'would have helped', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If she ', tone: 'normal' },
          { text: 'had called', tone: 'accent' },
          { text: ' me, I ', tone: 'normal' },
          { text: 'would have answered', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If we ', tone: 'normal' },
          { text: 'had started', tone: 'accent' },
          { text: ' earlier, we ', tone: 'normal' },
          { text: 'would have finished', tone: 'danger' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / felt / made / let / helped', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'действие без to', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I saw him ', tone: 'normal' },
          { text: 'leave', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She heard me ', tone: 'normal' },
          { text: 'call', tone: 'warning' },
          { text: ' her', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We felt the phone ', tone: 'normal' },
          { text: 'vibrate', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'He let me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'This lesson helped me ', tone: 'normal' },
          { text: 'understand', tone: 'warning' },
          { text: ' English better', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'If you will call me, I will answer', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'They made us to wait outside', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + дія', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / made / let', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'дія без to', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They made us ', tone: 'normal' },
          { text: 'wait', tone: 'warning' },
          { text: ' outside', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + action', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / made / let', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'action without to', tone: 'warning' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + ação', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / made / let', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'ação sem to', tone: 'warning' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + hành động', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / made / let', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'hành động không có to', tone: 'warning' },
        ],
      },
    ],

    linesId: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + tindakan', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / made / let', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'tindakan tanpa to', tone: 'warning' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + eylem', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / made / let', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'to olmadan eylem', tone: 'warning' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'formula',
        parts: [
          { text: 'If + Present Simple, ', tone: 'formula' },
          { text: 'will + czynność', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'If', tone: 'accent' },
          { text: ' you call me, I ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' answer', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'saw / heard / made / let', tone: 'accent' },
          { text: ' + object + ', tone: 'formula' },
          { text: 'czynność bez to', tone: 'warning' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'if',
        labelUK: 'if',
        labelES: 'if',
        labelPtBr: 'if',
        labelVi: 'if',
        labelId: 'if',
        labelTr: 'if',
        labelPl: 'if',
        en: [
          { text: 'If', tone: 'accent' },
          { text: ' she has time, she ', tone: 'normal' },
          { text: 'will', tone: 'warning' },
          { text: ' help us', tone: 'normal' },
        ],
        ru: 'Если у неё будет время, она нам поможет',
        uk: 'Якщо в неї буде час, вона нам допоможе',
        es: 'Si ella tiene tiempo, nos ayudará',
        'pt-BR': 'Se ela tiver tempo, ela nos ajudará',
        vi: 'Nếu cô ấy có thời gian, cô ấy sẽ giúp chúng ta',
        id: 'Jika dia punya waktu, dia akan membantu kita',
        tr: 'Zamanı olursa bize yardım edecek',
        pl: 'Jeśli będzie miała czas, pomoże nam',
        noteRU: 'После if стоит has без will. Will стоит в результате.',
        noteUK: 'Після if стоїть has без will. Will стоїть у результаті.',
        noteES: 'After if, use has without will. Will is in the result.',
        notePtBr: 'Depois de if, use has sem will. Will fica no resultado.',
        noteVi: 'Sau if, dùng has không có will. Will nằm ở phần kết quả.',
        noteId: 'Setelah if, gunakan has tanpa will. Will ada di bagian hasil.',
        noteTr: 'if sonrasında has, will olmadan kullanılır. Will sonuç kısmındadır.',
        notePl: 'Po if użyj has bez will. Will stoi w części z rezultatem.',
      },
      {
        labelRU: 'bare infinitive',
        labelUK: 'bare infinitive',
        labelES: 'bare infinitive',
        labelPtBr: 'bare infinitive',
        labelVi: 'bare infinitive',
        labelId: 'bare infinitive',
        labelTr: 'bare infinitive',
        labelPl: 'bare infinitive',
        en: [
          { text: 'He let me ', tone: 'normal' },
          { text: 'use', tone: 'warning' },
          { text: ' his phone', tone: 'normal' },
        ],
        ru: 'Он позволил мне воспользоваться его телефоном',
        uk: 'Він дозволив мені скористатися його телефоном',
        es: 'Me dejó usar su teléfono',
        'pt-BR': 'Ele me deixou usar o telefone dele',
        vi: 'Anh ấy cho tôi dùng điện thoại của anh ấy',
        id: 'Dia membiarkan saya menggunakan ponselnya',
        tr: 'Telefonunu kullanmama izin verdi',
        pl: 'Pozwolił mi użyć swojego telefonu',
        noteRU: 'После let действие use идёт без to.',
        noteUK: 'Після let дія use йде без to.',
        noteES: 'After let, write use without to.',
        notePtBr: 'Depois de let, escreva use sem to.',
        noteVi: 'Sau let, viết use không có to.',
        noteId: 'Setelah let, tulis use tanpa to.',
        noteTr: 'let sonrasında use to olmadan yazılır.',
        notePl: 'Po let napisz use bez to.',
      },
    ],
  },

  {
    lessonId: 32,
    screenId: 'lesson_32_intro_4_final_advanced_practice',
    order: 4,
    kind: 'practice',

    titleRU: 'Финальный advanced-блок',
    titleUK: 'Фінальний advanced-блок',
    titleES: 'Final advanced block',
    titlePtBr: 'Bloco avançado final',
    titleVi: 'Khối nâng cao cuối cùng',
    titleId: 'Blok lanjutan terakhir',
    titleTr: 'Son ileri blok',
    titlePl: 'Końcowy blok zaawansowany',

    subtitleRU: 'В финале урока идут самые плотные формы: have been + -ing, is being + V3, would rather и object + V3.',
    subtitleUK: 'У фіналі уроку йдуть найнасиченіші форми: have been + -ing, is being + V3, would rather і object + V3.',
    subtitleES: 'The final part uses the densest forms: have been + -ing, is being + V3, would rather, and object + V3.',
    subtitlePtBr: 'A parte final usa as formas mais densas: have been + -ing, is being + V3, would rather e object + V3.',
    subtitleVi: 'Phần cuối dùng các dạng dày nhất: have been + -ing, is being + V3, would rather và object + V3.',
    subtitleId: 'Bagian akhir memakai bentuk paling padat: have been + -ing, is being + V3, would rather, dan object + V3.',
    subtitleTr: 'Final bölüm en yoğun yapıları kullanır: have been + -ing, is being + V3, would rather ve object + V3.',
    subtitlePl: 'Finał używa najgęstszych form: have been + -ing, is being + V3, would rather i object + V3.',

    linesRU: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = процесс длится до сейчас', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'has been studying', tone: 'accent' },
          { text: ' all morning', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We ', tone: 'strong' },
          { text: 'have been working', tone: 'accent' },
          { text: ' since eight', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They ', tone: 'strong' },
          { text: 'have been looking', tone: 'accent' },
          { text: ' for the keys', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = прямо сейчас что-то делается с предметом', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The room ', tone: 'strong' },
          { text: 'is being cleaned', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The documents ', tone: 'strong' },
          { text: 'are being checked', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
          { text: ' = я бы предпочёл, чтобы...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' you ', tone: 'strong' },
          { text: 'did not call', tone: 'warning' },
          { text: ' him', tone: 'normal' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'She ', tone: 'strong' },
          { text: 'would rather', tone: 'danger' },
          { text: ' we ', tone: 'strong' },
          { text: 'started', tone: 'warning' },
          { text: ' later', tone: 'normal' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'formula',
        parts: [
          { text: 'need / want + object + V3', tone: 'accent' },
          { text: ' = нужно / хотят, чтобы это сделали', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need ', tone: 'normal' },
          { text: 'the documents', tone: 'strong' },
          { text: ' checked today', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'We need ', tone: 'normal' },
          { text: 'the room', tone: 'strong' },
          { text: ' cleaned before evening', tone: 'warning' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'They want ', tone: 'normal' },
          { text: 'the problem', tone: 'strong' },
          { text: ' solved quickly', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'step',
        parts: [
          { text: '1. "Привык к действию"? ', tone: 'muted' },
          { text: 'am / is / are used to + V-ing', tone: 'danger' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '2. "Длится до сейчас"? ', tone: 'muted' },
          { text: 'have / has been + V-ing', tone: 'accent' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '3. "Сейчас делается с предметом"? ', tone: 'muted' },
          { text: 'is / are being + V3', tone: 'warning' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '4. "Я бы предпочёл, чтобы..."? ', tone: 'muted' },
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'step',
        parts: [
          { text: '5. "Нужно, чтобы сделали"? ', tone: 'muted' },
          { text: 'need / want + object + V3', tone: 'warning' },
        ],
      },
      { type: 'spacer' },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I have waiting for an hour', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I would rather you stay here', tone: 'danger' },
          { text: ' в этой фразе урока', tone: 'muted' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно здесь: ', tone: 'success' },
          { text: 'I would rather you ', tone: 'danger' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
      {
        type: 'wrong',
        parts: [
          { text: 'Не так: ', tone: 'warning' },
          { text: 'I need the documents check today', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'Правильно: ', tone: 'success' },
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesUK: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = дія триває дотепер', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I ', tone: 'strong' },
          { text: 'have been waiting', tone: 'accent' },
          { text: ' for an hour', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = над предметом зараз виконують дію', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'The room ', tone: 'strong' },
          { text: 'is being cleaned', tone: 'warning' },
          { text: ' now', tone: 'normal' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
          { text: ' = я б волів, щоб...', tone: 'formula' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I would rather you ', tone: 'danger' },
          { text: 'stayed', tone: 'warning' },
          { text: ' here', tone: 'normal' },
        ],
      },
    ],

    linesES: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesPtBr: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = processo até agora', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = algo está sendo feito agora', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesVi: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = quá trình kéo dài đến hiện tại', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = điều gì đó đang được làm', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesId: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = proses sampai sekarang', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = sesuatu sedang dikerjakan', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesTr: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = şimdiye kadar süren süreç', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = bir şey şu anda yapılıyor', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    linesPl: [
      {
        type: 'formula',
        parts: [
          { text: 'have / has been + V-ing', tone: 'accent' },
          { text: ' = proces trwa do teraz', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'is / are being + V3', tone: 'warning' },
          { text: ' = coś jest właśnie wykonywane', tone: 'formula' },
        ],
      },
      {
        type: 'formula',
        parts: [
          { text: 'would rather + subject + Past Simple', tone: 'danger' },
        ],
      },
      {
        type: 'correct',
        parts: [
          { text: 'I need the documents ', tone: 'normal' },
          { text: 'checked', tone: 'warning' },
          { text: ' today', tone: 'normal' },
        ],
      },
    ],

    examples: [
      {
        labelRU: 'процесс до сейчас',
        labelUK: 'процес дотепер',
        labelES: 'process up to now',
        labelPtBr: 'processo até agora',
        labelVi: 'quá trình đến hiện tại',
        labelId: 'proses sampai sekarang',
        labelTr: 'şimdiye kadar süreç',
        labelPl: 'proces do teraz',
        en: [
          { text: 'They ', tone: 'strong' },
          { text: 'have been looking', tone: 'accent' },
          { text: ' for the keys', tone: 'normal' },
        ],
        ru: 'Они ищут ключи',
        uk: 'Вони шукають ключі',
        es: 'Han estado buscando las llaves',
        'pt-BR': 'Eles têm procurado as chaves',
        vi: 'Họ đã và đang tìm chìa khóa',
        id: 'Mereka telah mencari kuncinya',
        tr: 'Anahtarları arayıp duruyorlar',
        pl: 'Oni szukają kluczy',
        noteRU: 'have been looking показывает процесс, который тянется до сейчас.',
        noteUK: 'have been looking показує процес, який триває дотепер.',
        noteES: 'have been looking shows a process continuing up to now.',
        notePtBr: 'have been looking mostra um processo que continua até agora.',
        noteVi: 'have been looking cho thấy một quá trình kéo dài đến hiện tại.',
        noteId: 'have been looking menunjukkan proses yang berlanjut sampai sekarang.',
        noteTr: 'have been looking şimdiye kadar süren bir süreci gösterir.',
        notePl: 'have been looking pokazuje proces trwający do teraz.',
      },
      {
        labelRU: 'object + V3',
        labelUK: 'object + V3',
        labelES: 'object + V3',
        labelPtBr: 'object + V3',
        labelVi: 'object + V3',
        labelId: 'object + V3',
        labelTr: 'object + V3',
        labelPl: 'object + V3',
        en: [
          { text: 'They want ', tone: 'normal' },
          { text: 'the problem', tone: 'strong' },
          { text: ' solved quickly', tone: 'warning' },
        ],
        ru: 'Они хотят, чтобы проблему решили быстро',
        uk: 'Вони хочуть, щоб проблему вирішили швидко',
        es: 'Quieren el problema resuelto rápidamente',
        'pt-BR': 'Eles querem o problema resolvido rapidamente',
        vi: 'Họ muốn vấn đề được giải quyết nhanh chóng',
        id: 'Mereka ingin masalah itu diselesaikan dengan cepat',
        tr: 'Sorunun hızlıca çözülmesini istiyorlar',
        pl: 'Chcą, żeby problem został szybko rozwiązany',
        noteRU: 'Solved показывает желаемый результат для problem.',
        noteUK: 'Solved показує бажаний результат для problem.',
        noteES: 'Solved shows the desired result for problem.',
        notePtBr: 'Solved mostra o resultado desejado para problem.',
        noteVi: 'Solved cho thấy kết quả mong muốn cho problem.',
        noteId: 'Solved menunjukkan hasil yang diinginkan untuk problem.',
        noteTr: 'Solved, problem için istenen sonucu gösterir.',
        notePl: 'Solved pokazuje pożądany rezultat dla problem.',
      },
    ],
  },
];
