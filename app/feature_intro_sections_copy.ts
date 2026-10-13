import { triLang, type Lang } from '../constants/i18n';
import type { FeatureIntroDef } from './feature_intro_registry';

const understood = (lang: Lang) => triLang(lang, {
  ru: 'Понятно, посмотрим', uk: 'Зрозуміло, подивімось', en: 'Got it, let’s explore', es: 'Entendido, vamos a ver',
  'pt-BR': 'Entendi, vamos ver', vi: 'Hiểu rồi, khám phá thôi', id: 'Paham, ayo lihat', tr: 'Anladım, bakalım', pl: 'Jasne, zobaczmy',
});

export const SECTION_FEATURE_INTROS: readonly FeatureIntroDef[] = [{
  id: 'cards_hub_first_visit', trigger: 'first_visit', screenRoute: '/flashcards', icon: 'albums', family: 'orbit', art: 'cards_hub',
  title: lang => triLang(lang, {
    ru: 'Фразы — в твою коллекцию', uk: 'Вислови — до твоєї колекції', en: 'Build your phrase collection', es: 'Tu colección de frases',
    'pt-BR': 'Sua coleção de frases', vi: 'Bộ sưu tập câu của bạn', id: 'Koleksi frasamu', tr: 'Kendi ifade koleksiyonun', pl: 'Twoja kolekcja zwrotów',
  }),
  body: lang => triLang(lang, {
    ru: 'Выбирай готовые наборы или собирай свои, а затем переходи к тренировке. Набор — это просто коллекция карточек по теме. Собирать приятно, вспоминать без подсказки — ещё приятнее.',
    uk: 'Обирай готові набори або збирай власні, а потім переходь до тренування. Набір — це колекція карток за темою. Збирати приємно, згадувати без підказки — ще приємніше.',
    en: 'Choose ready-made packs or build your own, then start practicing. A pack is just a collection of cards on a topic. Collecting feels good; remembering without a hint feels even better.',
    es: 'Elige conjuntos preparados o crea los tuyos y empieza a practicar. Un conjunto es una colección de tarjetas sobre un tema. Coleccionar gusta; recordar sin pistas, aún más.',
    'pt-BR': 'Escolha conjuntos prontos ou crie os seus e comece a praticar. Um conjunto é uma coleção de cartões sobre um tema. Colecionar é bom; lembrar sem dicas é melhor ainda.',
    vi: 'Chọn bộ thẻ có sẵn hoặc tự tạo, rồi bắt đầu luyện tập. Mỗi bộ là các thẻ cùng chủ đề. Sưu tầm đã vui, nhớ được mà không cần gợi ý còn vui hơn.',
    id: 'Pilih paket siap pakai atau buat sendiri, lalu mulai latihan. Paket adalah kumpulan kartu bertema. Mengoleksi itu seru; mengingat tanpa petunjuk lebih seru lagi.',
    tr: 'Hazır setleri seç veya kendi setini oluştur, sonra çalışmaya başla. Set, bir konudaki kartların koleksiyonudur. Biriktirmek güzel; ipucu olmadan hatırlamak daha da güzel.',
    pl: 'Wybierz gotowe zestawy lub stwórz własne, a potem ćwicz. Zestaw to kolekcja kart na dany temat. Zbieranie cieszy; pamiętanie bez podpowiedzi jeszcze bardziej.',
  }), ctaLabel: understood,
}, {
  id: 'statistics_first_visit', trigger: 'first_visit', screenRoute: '/streak_stats', icon: 'stats-chart', family: 'orbit', art: 'statistics',
  title: lang => triLang(lang, {
    ru: 'Прогресс, который видно', uk: 'Прогрес, який видно', en: 'Progress you can see', es: 'Progreso que se ve',
    'pt-BR': 'Progresso à vista', vi: 'Thấy rõ tiến bộ', id: 'Kemajuan yang terlihat', tr: 'Gözle görülür ilerleme', pl: 'Postępy, które widać',
  }),
  body: lang => triLang(lang, {
    ru: 'Здесь собраны дни занятий и время практики. Смотри на свой ритм и замечай, сколько уже сделано. Цифры здесь за тебя, а не против: один тихий день не отменяет весь путь.',
    uk: 'Тут зібрані дні занять і час практики. Стеж за своїм ритмом і помічай, скільки вже зроблено. Цифри на твоєму боці: один тихий день не перекреслює весь шлях.',
    en: 'See your practice days and study time. Follow your rhythm and notice how far you’ve come. These numbers are on your side: one quiet day doesn’t erase the journey.',
    es: 'Consulta tus días de práctica y tiempo de estudio. Observa tu ritmo y lo que ya has logrado. Los números están de tu lado: un día tranquilo no borra tu camino.',
    'pt-BR': 'Veja seus dias de prática e tempo de estudo. Acompanhe seu ritmo e o que já conquistou. Os números estão do seu lado: um dia tranquilo não apaga a jornada.',
    vi: 'Xem ngày học và thời gian luyện tập. Theo dõi nhịp học và chặng đường đã đi. Các con số luôn ủng hộ bạn: một ngày nghỉ không xóa đi cả hành trình.',
    id: 'Lihat hari dan waktu latihanmu. Ikuti ritmemu dan lihat sejauh apa kamu melangkah. Angka-angka ini mendukungmu: satu hari santai tidak menghapus perjalananmu.',
    tr: 'Çalıştığın günleri ve süreyi gör. Ritmini takip et, katettiğin yolu fark et. Bu sayılar senin yanında: sakin geçen bir gün bütün yolculuğu silmez.',
    pl: 'Sprawdź dni nauki i czas ćwiczeń. Obserwuj swój rytm i to, ile już za tobą. Liczby są po twojej stronie: jeden spokojny dzień nie przekreśla całej drogi.',
  }), ctaLabel: understood,
}, {
  id: 'daily_phrase_first_visit', trigger: 'first_visit', screenRoute: '/(tabs)/home', icon: 'chatbubble-ellipses', family: 'orbit', art: 'daily_phrase',
  title: lang => triLang(lang, {
    ru: 'Одна фраза на сегодня', uk: 'Один вислів на сьогодні', en: 'One phrase for today', es: 'Una frase para hoy',
    'pt-BR': 'Uma frase para hoje', vi: 'Một câu cho hôm nay', id: 'Satu frasa untuk hari ini', tr: 'Bugün için bir ifade', pl: 'Jeden zwrot na dziś',
  }),
  body: lang => triLang(lang, {
    ru: 'Каждый день здесь новая фраза: узнай её смысл, послушай произношение и проверь себя в коротком задании. Понравилась — сохрани в карточки. Маленькая находка, а в разговоре пригодится.',
    uk: 'Щодня тут новий вислів: дізнайся його значення, послухай вимову та перевір себе в короткому завданні. Сподобався — збережи до карток. Маленька знахідка, а в розмові знадобиться.',
    en: 'A new phrase every day: discover its meaning, hear the pronunciation and try a short question. Like it? Save it to your cards. A little find that may come in handy in conversation.',
    es: 'Cada día, una frase nueva: descubre su significado, escucha la pronunciación y prueba una pregunta breve. Si te gusta, guárdala en tus tarjetas. Un pequeño hallazgo para tus conversaciones.',
    'pt-BR': 'Uma frase nova por dia: descubra o significado, ouça a pronúncia e responda a uma pergunta rápida. Gostou? Salve nos cartões. Uma pequena descoberta para usar nas conversas.',
    vi: 'Mỗi ngày một câu mới: tìm hiểu ý nghĩa, nghe phát âm và thử một câu hỏi ngắn. Thích thì lưu vào thẻ. Một khám phá nhỏ có thể hữu ích khi trò chuyện.',
    id: 'Frasa baru setiap hari: pahami artinya, dengarkan pelafalan, lalu coba pertanyaan singkat. Suka? Simpan ke kartu. Temuan kecil yang berguna saat mengobrol.',
    tr: 'Her gün yeni bir ifade: anlamını öğren, telaffuzunu dinle ve kısa bir soruyla kendini dene. Beğendiysen kartlarına kaydet. Sohbette işine yarayacak küçük bir keşif.',
    pl: 'Codziennie nowy zwrot: poznaj znaczenie, posłuchaj wymowy i spróbuj krótkiego zadania. Podoba się? Zapisz go na kartach. Małe odkrycie, które przyda się w rozmowie.',
  }), ctaLabel: understood,
}, {
  id: 'videos_first_visit', trigger: 'first_visit', screenRoute: '/lingman_videos', icon: 'play-circle', family: 'premiere', art: 'videos',
  title: lang => triLang(lang, {
    ru: 'Занимаем место у экрана', uk: 'Займаймо місце біля екрана', en: 'Take a seat by the screen', es: 'Toma asiento frente a la pantalla',
    'pt-BR': 'Sente-se perto da tela', vi: 'Chọn chỗ trước màn hình', id: 'Ambil tempat di depan layar', tr: 'Ekranın karşısına geç', pl: 'Zajmij miejsce przed ekranem',
  }),
  body: lang => triLang(lang, {
    ru: 'Выбирай канал, открывай новые видео или ищи тему в плейлистах. Нажми на ролик, чтобы посмотреть его. Попкорн по желанию, любопытство пригодится.',
    uk: 'Обирай канал, відкривай нові відео або шукай тему в плейлистах. Натисни на ролик, щоб переглянути його. Попкорн за бажанням, цікавість знадобиться.',
    en: 'Choose a channel, explore new videos or find a topic in the playlists. Tap a video to watch. Popcorn is optional; curiosity comes in handy.',
    es: 'Elige un canal, descubre videos nuevos o busca un tema en las listas. Toca un video para verlo. Las palomitas son opcionales; la curiosidad viene bien.',
    'pt-BR': 'Escolha um canal, explore vídeos novos ou encontre um tema nas playlists. Toque em um vídeo para assistir. Pipoca é opcional; curiosidade ajuda.',
    vi: 'Chọn kênh, khám phá video mới hoặc tìm chủ đề trong danh sách phát. Nhấn vào video để xem. Bỏng ngô tùy thích, còn tò mò thì hữu ích đấy.',
    id: 'Pilih kanal, jelajahi video baru atau cari topik di playlist. Ketuk video untuk menonton. Popcorn boleh ada boleh tidak; rasa ingin tahu pasti berguna.',
    tr: 'Kanal seç, yeni videoları keşfet veya oynatma listelerinde konu bul. İzlemek için videoya dokun. Patlamış mısır isteğe bağlı, merak ise işine yarar.',
    pl: 'Wybierz kanał, odkryj nowe filmy lub znajdź temat na playlistach. Dotknij filmu, żeby go obejrzeć. Popcorn opcjonalny, ciekawość mile widziana.',
  }), ctaLabel: understood,
}, {
  id: 'friends_first_visit', trigger: 'first_visit', screenRoute: '/(tabs)/friends', icon: 'people', family: 'orbit', art: 'friends',
  title: lang => triLang(lang, {
    ru: 'С компанией веселее', uk: 'З компанією веселіше', en: 'Better with company', es: 'Mejor en compañía',
    'pt-BR': 'Melhor com companhia', vi: 'Có bạn vui hơn', id: 'Lebih seru bersama', tr: 'Birlikte daha keyifli', pl: 'Razem raźniej',
  }),
  body: lang => triLang(lang, {
    ru: 'Найди друга по нику или коду и отправь заявку. Здесь можно видеть успехи друг друга и заниматься вместе. Иногда для занятия не хватает не силы воли, а знакомого «ну что, погнали?».',
    uk: 'Знайди друга за ніком або кодом і надішли запит. Тут можна бачити успіхи одне одного та займатися разом. Іноді бракує не сили волі, а знайомого «ну що, почнемо?».',
    en: 'Find a friend by nickname or code and send a request. See each other’s progress and study together. Sometimes all you need isn’t more willpower, but a familiar “ready to go?”.',
    es: 'Busca a un amigo por apodo o código y envía una solicitud. Vean sus avances y estudien juntos. A veces no falta fuerza de voluntad, sino un conocido «¿empezamos?».',
    'pt-BR': 'Encontre um amigo pelo apelido ou código e envie um pedido. Acompanhem o progresso e estudem juntos. Às vezes não falta força de vontade, mas um conhecido “bora?”.',
    vi: 'Tìm bạn bằng biệt danh hoặc mã rồi gửi lời mời. Xem tiến bộ của nhau và học cùng nhau. Đôi khi không thiếu ý chí, chỉ thiếu một câu quen thuộc: “bắt đầu nhé?”.',
    id: 'Cari teman lewat nama panggilan atau kode dan kirim permintaan. Lihat kemajuan satu sama lain dan belajar bersama. Kadang bukan kurang tekad, cuma butuh ajakan akrab: “ayo mulai?”.',
    tr: 'Takma ad veya kodla arkadaşını bul ve istek gönder. Birbirinizin ilerlemesini görün, birlikte çalışın. Bazen eksik olan irade değil, tanıdık bir “hadi başlayalım mı?” sözüdür.',
    pl: 'Znajdź znajomego po nicku lub kodzie i wyślij zaproszenie. Śledźcie swoje postępy i uczcie się razem. Czasem brakuje nie silnej woli, a znajomego „no to zaczynamy?”.',
  }), ctaLabel: understood,
}, {
  id: 'legacy_lessons_first_visit', trigger: 'first_visit', screenRoute: '/(tabs)/lessons', icon: 'library-outline', family: 'orbit', art: 'legacy_lessons',
  title: lang => triLang(lang, {
    ru: 'Знакомый путь — в новом порядке', uk: 'Знайомий шлях — у новому порядку', en: 'A familiar path, newly organized', es: 'Un camino conocido, ahora más claro',
    'pt-BR': 'Um caminho conhecido, agora mais claro', vi: 'Lộ trình quen thuộc, nay gọn gàng hơn', id: 'Jalur lama, kini lebih rapi', tr: 'Tanıdık yol, şimdi daha düzenli', pl: 'Znana droga, teraz lepiej uporządkowana',
  }),
  // зачем (30.09, «1 в 1 с макета» overlays.html OV-INTRO-LEGACY): текст ровно как в макете.
  body: lang => triLang(lang, {
    ru: 'Здесь собраны классические уроки Phraseman: теория, упражнения и доступный прежний прогресс. Выбери уровень в ленте и продолжай с нужного места.',
    uk: 'Тут зібрані класичні уроки Phraseman: теорія, вправи та доступний попередній прогрес. Обери рівень у стрічці й продовжуй із потрібного місця.',
    en: 'Find the classic Phraseman lessons here: theory, exercises and your available earlier progress. Pick a level from the rail and continue where you need.',
    es: 'Aquí están las lecciones clásicas de Phraseman: teoría, ejercicios y el progreso anterior disponible. Elige un nivel en la barra y continúa donde quieras.',
    'pt-BR': 'Aqui estão as lições clássicas do Phraseman: teoria, exercícios e o progresso anterior disponível. Escolha um nível na barra e continue de onde quiser.',
    vi: 'Đây là các bài học Phraseman cổ điển: lý thuyết, bài tập và tiến độ trước đây còn lưu. Chọn cấp độ trên thanh và học tiếp từ vị trí phù hợp.',
    id: 'Di sini ada pelajaran klasik Phraseman: teori, latihan, dan progres lama yang tersedia. Pilih level pada bilah lalu lanjutkan dari tempat yang kamu mau.',
    tr: 'Klasik Phraseman dersleri burada: teori, alıştırmalar ve erişilebilir önceki ilerlemen. Şeritten seviyeni seç ve istediğin yerden devam et.',
    pl: 'Tutaj znajdziesz klasyczne lekcje Phraseman: teorię, ćwiczenia i dostępny wcześniejszy postęp. Wybierz poziom na pasku i kontynuuj od właściwego miejsca.',
  }),
  ctaLabel: lang => triLang(lang, {
    ru: 'Открыть старые уроки', uk: 'Відкрити старі уроки', en: 'Open classic lessons', es: 'Abrir lecciones clásicas',
    'pt-BR': 'Abrir lições clássicas', vi: 'Mở bài học cũ', id: 'Buka pelajaran klasik', tr: 'Klasik dersleri aç', pl: 'Otwórz klasyczne lekcje',
  }),
}, {
  id: 'profile_card_first_visit', trigger: 'first_visit', screenRoute: '/(tabs)/home', icon: 'person-circle-outline',
  // зачем (30.09, overlays.html OV-INTRO-PROFILE): D108 — косметика и цены убраны,
  // визитка = имя, монета-аватар и подпись. Текст ровно как в макете.
  title: lang => triLang(lang, {
    ru: 'Твоя визитка', uk: 'Твоя візитка', en: 'Your profile card', es: 'Tu tarjeta de perfil',
    'pt-BR': 'Seu cartão de perfil', vi: 'Thẻ hồ sơ của bạn', id: 'Kartu profilmu', tr: 'Profil kartın', pl: 'Twoja wizytówka',
  }),
  body: lang => triLang(lang, {
    ru: 'Здесь собраны имя, монета-аватар и короткая подпись, которые видят другие игроки. Посмотри, как выглядит твоя визитка.',
    uk: 'Тут зібрані імʼя, монета-аватар і короткий підпис, які бачать інші гравці. Подивись, як виглядає твоя візитка.',
    en: 'Your name, coin avatar and short caption that other players see live here. See how your profile card looks.',
    es: 'Aquí están tu nombre, tu moneda-avatar y la frase corta que ven otros jugadores. Mira cómo se ve tu tarjeta.',
    'pt-BR': 'Aqui ficam seu nome, a moeda-avatar e a legenda curta que outros jogadores veem. Veja como está seu cartão.',
    vi: 'Tên, đồng xu đại diện và dòng giới thiệu ngắn mà người chơi khác nhìn thấy nằm ở đây. Xem thẻ hồ sơ của bạn trông thế nào.',
    id: 'Nama, koin avatar, dan keterangan singkat yang dilihat pemain lain ada di sini. Lihat seperti apa kartu profilmu.',
    tr: 'Diğer oyuncuların gördüğü adın, madeni para avatarın ve kısa yazın burada. Profil kartının nasıl göründüğüne bak.',
    pl: 'Tu są Twoje imię, moneta-awatar i krótki podpis, które widzą inni gracze. Zobacz, jak wygląda Twoja wizytówka.',
  }),
  ctaLabel: lang => triLang(lang, {
    ru: 'Посмотреть визитку', uk: 'Переглянути візитку', en: 'View profile card', es: 'Ver la tarjeta', 'pt-BR': 'Ver cartão', vi: 'Xem thẻ hồ sơ', id: 'Lihat kartu profil', tr: 'Profil kartını gör', pl: 'Zobacz wizytówkę',
  }),
}];
// PM-046: intro spin_first_visit removed with /level_reward_spin route.
