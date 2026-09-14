import { triLang, type Lang } from '../constants/i18n';
import type { FeatureIntroDef } from './feature_intro_registry';

const understood = (lang: Lang) => triLang(lang, {
  ru: 'Понятно, посмотрим', uk: 'Зрозуміло, подивімось', en: 'Got it, let’s explore', es: 'Entendido, vamos a ver',
  'pt-BR': 'Entendi, vamos ver', vi: 'Hiểu rồi, khám phá thôi', id: 'Paham, ayo lihat', tr: 'Anladım, bakalım', pl: 'Jasne, zobaczmy',
});

export const SECTION_FEATURE_INTROS: readonly FeatureIntroDef[] = [{
  id: 'cards_hub_first_visit', trigger: 'first_visit', screenRoute: '/flashcards', icon: 'albums', family: 'orbit', art: 'cards_hub',
  title: lang => triLang(lang, {
    ru: 'Фразы — в твою коллекцию', uk: 'Фрази — до твоєї колекції', en: 'Build your phrase collection', es: 'Tu colección de frases',
    'pt-BR': 'Sua coleção de frases', vi: 'Bộ sưu tập câu của bạn', id: 'Koleksi frasamu', tr: 'Kendi ifade koleksiyonun', pl: 'Twoja kolekcja zwrotów',
  }),
  body: lang => triLang(lang, {
    ru: 'Выбирай готовые наборы или собирай свои, а затем переходи к тренировке. Набор — это просто коллекция карточек по теме. Собирать приятно, вспоминать без подсказки — ещё приятнее.',
    uk: 'Обирай готові набори або збирай власні, а потім переходь до тренування. Набір — це колекція карток за темою. Збирати приємно, згадувати без підказки — ще приємніше.',
    en: 'Choose ready-made packs or build your own, then start practising. A pack is just a collection of cards on a topic. Collecting feels good; remembering without a hint feels even better.',
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
    ru: 'Здесь собраны дни занятий, время практики и заработанный опыт. Смотри на свой ритм и замечай, сколько уже сделано. Цифры здесь за тебя, а не против: один тихий день не отменяет весь путь.',
    uk: 'Тут зібрані дні занять, час практики та здобутий досвід. Стеж за своїм ритмом і помічай, скільки вже зроблено. Цифри на твоєму боці: один тихий день не перекреслює весь шлях.',
    en: 'See your practice days, study time and earned XP. Follow your rhythm and notice how far you’ve come. These numbers are on your side: one quiet day doesn’t erase the journey.',
    es: 'Consulta tus días de práctica, tiempo de estudio y XP ganado. Observa tu ritmo y lo que ya has logrado. Los números están de tu lado: un día tranquilo no borra tu camino.',
    'pt-BR': 'Veja seus dias de prática, tempo de estudo e XP ganho. Acompanhe seu ritmo e o que já conquistou. Os números estão do seu lado: um dia tranquilo não apaga a jornada.',
    vi: 'Xem ngày học, thời gian luyện tập và XP đã kiếm được. Theo dõi nhịp học và chặng đường đã đi. Các con số luôn ủng hộ bạn: một ngày nghỉ không xóa đi cả hành trình.',
    id: 'Lihat hari latihan, waktu belajar, dan XP yang diperoleh. Ikuti ritmemu dan lihat sejauh apa kamu melangkah. Angka-angka ini mendukungmu: satu hari santai tidak menghapus perjalananmu.',
    tr: 'Çalıştığın günleri, süreyi ve kazandığın XP’yi gör. Ritmini takip et, katettiğin yolu fark et. Bu sayılar senin yanında: sakin geçen bir gün bütün yolculuğu silmez.',
    pl: 'Sprawdź dni nauki, czas ćwiczeń i zdobyte XP. Obserwuj swój rytm i to, ile już za tobą. Liczby są po twojej stronie: jeden spokojny dzień nie przekreśla całej drogi.',
  }), ctaLabel: understood,
}, {
  id: 'daily_phrase_first_visit', trigger: 'first_visit', screenRoute: '/(tabs)/home', icon: 'chatbubble-ellipses', family: 'orbit', art: 'daily_phrase',
  title: lang => triLang(lang, {
    ru: 'Одна фраза на сегодня', uk: 'Одна фраза на сьогодні', en: 'One phrase for today', es: 'Una frase para hoy',
    'pt-BR': 'Uma frase para hoje', vi: 'Một câu cho hôm nay', id: 'Satu frasa untuk hari ini', tr: 'Bugün için bir ifade', pl: 'Jeden zwrot na dziś',
  }),
  body: lang => triLang(lang, {
    ru: 'Каждый день здесь новая фраза: узнай её смысл, послушай произношение и проверь себя в коротком задании. Понравилась — сохрани в карточки. Маленькая находка, а в разговоре пригодится.',
    uk: 'Щодня тут нова фраза: дізнайся її значення, послухай вимову та перевір себе в короткому завданні. Сподобалася — збережи до карток. Маленька знахідка, а в розмові знадобиться.',
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
    ru: 'Знакомый путь — в новом порядке', uk: 'Знайомий шлях — у новому порядку', en: 'A familiar path, newly organised', es: 'Un camino conocido, ahora más claro',
    'pt-BR': 'Um caminho conhecido, agora mais claro', vi: 'Lộ trình quen thuộc, nay gọn gàng hơn', id: 'Jalur lama, kini lebih rapi', tr: 'Tanıdık yol, şimdi daha düzenli', pl: 'Znana droga, teraz lepiej uporządkowana',
  }),
  body: lang => triLang(lang, {
    ru: 'Здесь собраны классические уроки Phraseman: теория, упражнения и весь прежний прогресс. Выбери уровень в ленте и продолжай с нужного места — к новым урокам можно вернуться одним нажатием.',
    uk: 'Тут зібрані класичні уроки Phraseman: теорія, вправи та весь попередній прогрес. Обери рівень у стрічці й продовжуй із потрібного місця — до нових уроків можна повернутися одним натисканням.',
    en: 'Find the classic Phraseman lessons here, with their theory, exercises and all your existing progress. Pick a level from the rail and continue where you need; new lessons stay one tap away.',
    es: 'Aquí están las lecciones clásicas de Phraseman, con teoría, ejercicios y todo tu progreso anterior. Elige un nivel en la barra y continúa donde quieras; las lecciones nuevas quedan a un toque.',
    'pt-BR': 'Aqui estão as lições clássicas do Phraseman, com teoria, exercícios e todo o seu progresso anterior. Escolha um nível na barra e continue de onde quiser; as lições novas ficam a um toque.',
    vi: 'Đây là các bài học Phraseman cổ điển, gồm lý thuyết, bài tập và toàn bộ tiến độ trước đây. Chọn cấp độ trên thanh và học tiếp từ vị trí phù hợp; bài học mới chỉ cách một lần chạm.',
    id: 'Di sini ada pelajaran klasik Phraseman beserta teori, latihan, dan seluruh progres lamamu. Pilih level pada bilah lalu lanjutkan dari tempat yang kamu mau; pelajaran baru tetap satu ketukan lagi.',
    tr: 'Klasik Phraseman dersleri; teori, alıştırmalar ve önceki tüm ilerlemenle burada. Şeritten seviyeni seçip istediğin yerden devam et; yeni derslere tek dokunuşla dönebilirsin.',
    pl: 'Tutaj znajdziesz klasyczne lekcje Phraseman wraz z teorią, ćwiczeniami i całym dotychczasowym postępem. Wybierz poziom na pasku i kontynuuj od właściwego miejsca; nowe lekcje są o jedno dotknięcie dalej.',
  }),
  ctaLabel: lang => triLang(lang, {
    ru: 'Открыть старые уроки', uk: 'Відкрити старі уроки', en: 'Open classic lessons', es: 'Abrir lecciones clásicas',
    'pt-BR': 'Abrir lições clássicas', vi: 'Mở bài học cũ', id: 'Buka pelajaran klasik', tr: 'Klasik dersleri aç', pl: 'Otwórz klasyczne lekcje',
  }),
}, {
  id: 'profile_card_first_visit', trigger: 'first_visit', screenRoute: '/(tabs)/home', icon: 'person-circle-outline',
  title: lang => triLang(lang, {
    ru: 'Визитка — дорого, зато красиво', uk: 'Візитка — дорого, зате красиво', en: 'A profile card — pricey, but pretty', es: 'Una tarjeta de perfil: cara, pero bonita',
    'pt-BR': 'Um cartão de perfil: caro, mas bonito', vi: 'Thẻ hồ sơ — đắt nhưng đẹp', id: 'Kartu profil — mahal, tapi cantik', tr: 'Profil kartı — pahalı ama güzel', pl: 'Wizytówka — droga, ale piękna',
  }),
  body: lang => triLang(lang, {
    ru: 'Да, они дорогие и почти бессмысленные — зато какие красивые. Каждый апгрейд визитки добавляет +10 к общему максимуму энергии.',
    uk: 'Так, вони дорогі й майже безглузді — зате які красиві. Кожен апґрейд візитки додає +10 до загального максимуму енергії.',
    en: 'Yes, they are pricey and almost pointless — but look how pretty they are. Every profile-card upgrade adds +10 to your total energy maximum.',
    es: 'Sí, son caras y casi inútiles, pero qué bonitas. Cada mejora de la tarjeta añade +10 a tu máximo total de energía.',
    'pt-BR': 'Sim, são caras e quase inúteis — mas que bonitas. Cada melhoria do cartão adiciona +10 ao seu máximo total de energia.',
    vi: 'Đúng, chúng đắt và gần như vô dụng — nhưng đẹp thì khỏi bàn. Mỗi lần nâng cấp thẻ hồ sơ thêm +10 vào giới hạn năng lượng tổng.',
    id: 'Ya, harganya mahal dan hampir tidak berguna — tapi cantik, kan? Setiap peningkatan kartu profil menambah +10 ke maksimum energi totalmu.',
    tr: 'Evet, pahalı ve neredeyse gereksizler — ama ne kadar güzeller. Her profil kartı yükseltmesi toplam enerji sınırına +10 ekler.',
    pl: 'Tak, są drogie i prawie niepotrzebne — ale za to jakie piękne. Każde ulepszenie wizytówki dodaje +10 do całkowitego limitu energii.',
  }),
  ctaLabel: lang => triLang(lang, {
    ru: 'Посмотреть визитку', uk: 'Переглянути візитку', en: 'View profile card', es: 'Ver la tarjeta', 'pt-BR': 'Ver cartão', vi: 'Xem thẻ hồ sơ', id: 'Lihat kartu profil', tr: 'Profil kartını gör', pl: 'Zobacz wizytówkę',
  }),
}, {
  id: 'ideas_first_visit', trigger: 'first_visit', screenRoute: '/ideas_catalog', icon: 'bulb-outline',
  title: lang => triLang(lang, {
    ru: 'Идеи, которые двигают приложение', uk: 'Ідеї, що рухають застосунок', en: 'Ideas that move the app forward', es: 'Ideas que hacen avanzar la app',
    'pt-BR': 'Ideias que fazem o app avançar', vi: 'Ý tưởng giúp ứng dụng tiến lên', id: 'Ide yang menggerakkan aplikasi', tr: 'Uygulamayı ileri taşıyan fikirler', pl: 'Pomysły, które rozwijają aplikację',
  }),
  body: lang => triLang(lang, {
    ru: 'Сделай своё предложение публичным, собери поддержку и покажи, что оно крутое. Идеи с сильным откликом мы можем взять в работу — так Phraseman растёт вместе с пользователями.',
    uk: 'Зроби свою пропозицію публічною, збери підтримку й покажи, що вона крута. Ідеї з великим відгуком ми можемо взяти в роботу — так Phraseman росте разом із користувачами.',
    en: 'Make your suggestion public, gather support and show why it is great. Ideas with a strong response may become work items — that is how Phraseman grows with its users.',
    es: 'Haz pública tu propuesta, reúne apoyo y demuestra que es genial. Las ideas con mucho respaldo pueden entrar en nuestro trabajo: así Phraseman crece con sus usuarios.',
    'pt-BR': 'Torne sua sugestão pública, reúna apoio e mostre por que ela é ótima. Ideias com forte apoio podem entrar no trabalho — é assim que o Phraseman cresce com seus usuários.',
    vi: 'Công khai đề xuất, kêu gọi ủng hộ và cho mọi người thấy nó hay thế nào. Ý tưởng nhận nhiều phản hồi có thể được đưa vào làm — Phraseman lớn lên cùng người dùng như vậy.',
    id: 'Jadikan saranmu publik, kumpulkan dukungan, dan tunjukkan bahwa idemu keren. Ide dengan respons kuat bisa kami kerjakan — begitulah Phraseman tumbuh bersama penggunanya.',
    tr: 'Önerini herkese aç, destek topla ve neden harika olduğunu göster. Güçlü ilgi gören fikirleri çalışmaya alabiliriz — Phraseman böylece kullanıcılarıyla büyür.',
    pl: 'Opublikuj swoją propozycję, zbierz poparcie i pokaż, że jest świetna. Pomysły z dużym odzewem możemy wziąć na warsztat — tak Phraseman rośnie razem z użytkownikami.',
  }),
  ctaLabel: lang => triLang(lang, {
    ru: 'Предложить идею', uk: 'Запропонувати ідею', en: 'Suggest an idea', es: 'Proponer una idea', 'pt-BR': 'Sugerir uma ideia', vi: 'Đề xuất ý tưởng', id: 'Ajukan ide', tr: 'Fikir öner', pl: 'Zaproponuj pomysł',
  }),
}, {
  id: 'spin_first_visit', trigger: 'first_visit', screenRoute: '/level_reward_spin', icon: 'sync-outline',
  title: lang => triLang(lang, {
    ru: 'Крути — вдруг сегодня повезёт', uk: 'Крути — раптом сьогодні пощастить', en: 'Spin it — luck may be on your side', es: 'Gira: quizá hoy tengas suerte',
    'pt-BR': 'Gire — quem sabe hoje dá sorte', vi: 'Quay đi — biết đâu hôm nay may mắn', id: 'Putar — siapa tahu hari ini beruntung', tr: 'Çevir — belki bugün şanslısın', pl: 'Zakreć — może dziś dopisze szczęście',
  }),
  body: lang => triLang(lang, {
    ru: 'Спин — быстрый шанс забрать награду. Нажми, посмотри, что выпало, и реши, на что потратить удачу.',
    uk: 'Спін — швидкий шанс отримати нагороду. Натисни, подивися, що випало, і виріши, на що витратити удачу.',
    en: 'Spin is a quick chance to claim a reward. Tap, see what appears and decide where to spend your luck.',
    es: 'El giro es una oportunidad rápida de conseguir una recompensa. Toca, mira qué sale y decide en qué gastar tu suerte.',
    'pt-BR': 'O giro é uma chance rápida de ganhar uma recompensa. Toque, veja o que saiu e decida onde gastar sua sorte.',
    vi: 'Vòng quay là cơ hội nhanh để nhận phần thưởng. Nhấn, xem kết quả rồi quyết định dùng vận may vào đâu.',
    id: 'Spin adalah kesempatan cepat untuk mengambil hadiah. Ketuk, lihat hasilnya, lalu tentukan untuk apa keberuntunganmu.',
    tr: 'Spin, ödül kazanmak için hızlı bir şanstır. Dokun, ne çıktığına bak ve şansını nerede kullanacağına karar ver.',
    pl: 'Spin to szybka szansa na nagrodę. Dotknij, zobacz wynik i zdecyduj, na co przeznaczyć szczęście.',
  }),
  ctaLabel: lang => triLang(lang, {
    ru: 'Открыть спин', uk: 'Відкрити спін', en: 'Open spin', es: 'Abrir giro', 'pt-BR': 'Abrir giro', vi: 'Mở vòng quay', id: 'Buka spin', tr: 'Spini aç', pl: 'Otwórz spin',
  }),
}];
