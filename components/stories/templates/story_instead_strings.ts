// ═══════════════════════════════════════════════════════════════════════════
// story_instead_strings.ts — тексты кадров «истории вместо окон» на 9 языках интерфейса.
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»; макет
// docs/design/v2-app/stories-instead-of-modals.html): каждый кадр заменяет одно всплывающее окно. Отдельный файл, а не
// story_template_strings.ts: раздел историй 11.11 правит другая сессия, общий файл текстов не трогаем.
// Формат тот же: девять значений ru, uk, en, es, pt-BR, vi, id, tr, pl. Слова к числам и слово «монета» берём готовые
// (tplWord, momentCoinWord) — своих таблиц склонений здесь нет.
// ВНИМАНИЕ: русские тексты — из макета; остальные 8 языков написаны исполнителем и НЕ выверены Переводчиком.
// Тексты построены так, чтобы не требовать согласования глагола с числом и склонения имени (поэтому «{name} приглашает»,
// а не «Приглашение от …»; «на повтор», «позади» — подписи под числом, годные для любого числа).
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { glueNumbers } from '../../moments/glue_numbers';
import { momentCoinWord } from '../../spire/moments/moments_strings';
import { tplNumber, tplWord } from './story_template_strings';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };
const same = (text: string): Nine => [text, text, text, text, text, text, text, text, text];

const S = {
  // ── кнопки ──
  ctaFirstLesson: ['Начать первый урок', 'Почати перший урок', 'Start the first lesson', 'Empezar la primera lección', 'Começar a primeira lição', 'Bắt đầu bài học đầu tiên', 'Mulai pelajaran pertama', 'İlk derse başla', 'Zacznij pierwszą lekcję'],
  ctaReviewCards: ['Повторить карточки', 'Повторити картки', 'Review cards', 'Repasar tarjetas', 'Revisar cartões', 'Ôn thẻ', 'Ulangi kartu', 'Kartları tekrar et', 'Powtórz karty'],
  ctaUpgradeCoin: ['Улучшить монету', 'Покращити монету', 'Upgrade coin', 'Mejorar la moneda', 'Melhorar a moeda', 'Nâng cấp đồng xu', 'Tingkatkan koin', 'Jetonu yükselt', 'Ulepsz monetę'],
  ctaUpdate: ['Обновить', 'Оновити', 'Update', 'Actualizar', 'Atualizar', 'Cập nhật', 'Perbarui', 'Güncelle', 'Zaktualizuj'],
  ctaReply: ['Ответить', 'Відповісти', 'Reply', 'Responder', 'Responder', 'Trả lời', 'Balas', 'Yanıtla', 'Odpowiedz'],
  ctaEnableReminder: ['Включить напоминание', 'Увімкнути нагадування', 'Turn on reminder', 'Activar recordatorio', 'Ativar lembrete', 'Bật nhắc nhở', 'Aktifkan pengingat', 'Hatırlatıcıyı aç', 'Włącz przypomnienie'],
  ctaRestorePlus: ['Вернуть Plus', 'Повернути Plus', 'Get Plus back', 'Recuperar Plus', 'Recuperar Plus', 'Lấy lại Plus', 'Aktifkan Plus lagi', 'Plus’ı geri al', 'Odzyskaj Plus'],
  ctaEnterCode: ['Ввести код', 'Ввести код', 'Enter code', 'Ingresar código', 'Inserir código', 'Nhập mã', 'Masukkan kode', 'Kodu gir', 'Wpisz kod'],
  ctaInviteFriend: ['Пригласить друга', 'Запросити друга', 'Invite a friend', 'Invitar a un amigo', 'Convidar um amigo', 'Mời bạn bè', 'Undang teman', 'Arkadaş davet et', 'Zaproś znajomego'],
  ctaStartLesson: ['Начать урок {lessonNo}', 'Почати урок {lessonNo}', 'Start lesson {lessonNo}', 'Empezar la lección {lessonNo}', 'Começar a lição {lessonNo}', 'Bắt đầu bài {lessonNo}', 'Mulai pelajaran {lessonNo}', '{lessonNo}. derse başla', 'Zacznij lekcję {lessonNo}'],
  ctaRate: ['Оценить', 'Оцінити', 'Rate', 'Calificar', 'Avaliar', 'Đánh giá', 'Beri nilai', 'Puan ver', 'Oceń'],
  ctaClaim: ['Забрать {coins} {cw}', 'Забрати {coins} {cw}', 'Claim {coins} {cw}', 'Recibir {coins} {cw}', 'Resgatar {coins} {cw}', 'Nhận {coins} {cw}', 'Ambil {coins} {cw}', '{coins} {cw} al', 'Odbierz {coins} {cw}'],
  ctaPlayPeak: ['Играть на Пике', 'Грати на Піку', 'Play the Peak', 'Jugar en el Pico', 'Jogar no Pico', 'Chơi ở Đỉnh', 'Main di Puncak', 'Zirve’de oyna', 'Graj na Szczycie'],

  // ── 1 · приветствие новичка ──
  helloOverline: ['Первый день', 'Перший день', 'Day one', 'Primer día', 'Primeiro dia', 'Ngày đầu tiên', 'Hari pertama', 'İlk gün', 'Pierwszy dzień'],
  helloTitle: ['Добро пожаловать в PhraseMan', 'Ласкаво просимо до PhraseMan', 'Welcome to PhraseMan', 'Te damos la bienvenida a PhraseMan', 'Boas-vindas ao PhraseMan', 'Chào mừng đến với PhraseMan', 'Selamat datang di PhraseMan', 'PhraseMan’e hoş geldin', 'Witaj w PhraseMan'],
  helloText: [
    'Это твоя монета. За каждое занятие приходят монеты, они открывают новые ранги.',
    'Це твоя монета. За кожне заняття надходять монети, вони відкривають нові ранги.',
    'This is your coin. Every session brings coins, and coins unlock new ranks.',
    'Esta es tu moneda. Cada sesión te da monedas, y con ellas se abren nuevos rangos.',
    'Esta é a sua moeda. Cada sessão rende moedas, e elas abrem novos níveis.',
    'Đây là đồng xu của bạn. Mỗi buổi học mang về xu, và xu mở ra hạng mới.',
    'Ini koinmu. Setiap sesi memberi koin, dan koin membuka peringkat baru.',
    'Bu senin jetonun. Her çalışma jeton kazandırır, jetonlar yeni rütbeler açar.',
    'To twoja moneta. Za każdą sesję dostajesz monety, a one otwierają nowe rangi.',
  ],

  // ── 2 · с возвращением ──
  backOverline: ['{days} {days_w} перерыва', '{days} {days_w} перерви', '{days} {days_w} away', '{days} {days_w} de pausa', '{days} {days_w} de pausa', 'Nghỉ {days} {days_w}', 'Jeda {days} {days_w}', '{days} {days_w} ara', '{days} {days_w} przerwy'],
  backTitle: ['С возвращением', 'З поверненням', 'Welcome back', 'Qué bueno verte de nuevo', 'Que bom te ver de novo', 'Chào mừng trở lại', 'Selamat datang kembali', 'Tekrar hoş geldin', 'Witaj ponownie'],
  backText: [
    'Серия начнётся заново с сегодняшнего занятия.', 'Серія почнеться заново із сьогоднішнього заняття.', 'Your streak starts again with today’s session.',
    'Tu racha empieza de nuevo con la sesión de hoy.', 'Sua sequência recomeça com a sessão de hoje.', 'Chuỗi sẽ bắt đầu lại từ buổi học hôm nay.',
    'Rangkaianmu mulai lagi dari sesi hari ini.', 'Serin bugünkü çalışmayla yeniden başlar.', 'Seria zacznie się od nowa od dzisiejszej sesji.',
  ],
  backCardsLabel: ['{cards_w} на повтор', '{cards_w} на повтор', '{cards_w} to review', '{cards_w} por repasar', '{cards_w} para revisar', '{cards_w} cần ôn', '{cards_w} untuk diulang', '{cards_w} tekrar bekliyor', '{cards_w} do powtórki'],
  backLessonsLabel: ['{lessons_w} позади', '{lessons_w} позаду', '{lessons_w} done', '{lessons_w} hasta hoy', '{lessons_w} até hoje', '{lessons_w} đã học', '{lessons_w} selesai', '{lessons_w} tamam', '{lessons_w} za tobą'],

  // ── 3 · бонусы стали монетами ──
  legacyOverline: same('PhraseMan 2.0'),
  legacyTitle: ['Бонусы стали монетами', 'Бонуси стали монетами', 'Bonuses are now coins', 'Los bonos ahora son monedas', 'Os bônus viraram moedas', 'Phần thưởng đã thành xu', 'Bonus kini menjadi koin', 'Bonuslar jetona dönüştü', 'Bonusy stały się monetami'],
  legacyText: [
    'Осколки и жемчуг пересчитаны. Ничего не потеряно.', 'Уламки й перли перераховано. Нічого не втрачено.', 'Shards and pearls were converted. Nothing was lost.',
    'Los fragmentos y las perlas se convirtieron. No se perdió nada.', 'Fragmentos e pérolas foram convertidos. Nada se perdeu.', 'Mảnh vỡ và ngọc trai đã được quy đổi. Không mất gì cả.',
    'Kepingan dan mutiara sudah dikonversi. Tidak ada yang hilang.', 'Kırıklar ve inciler dönüştürüldü. Hiçbir şey kaybolmadı.', 'Odłamki i perły zostały przeliczone. Nic nie przepadło.',
  ],
  legacyShardsLabel: ['осколков было', 'уламків було', 'shards before', 'fragmentos antes', 'fragmentos antes', 'mảnh vỡ trước đây', 'kepingan sebelumnya', 'önceki kırık', 'odłamków wcześniej'],
  legacyPearlsLabel: ['жемчуга было', 'перлів було', 'pearls before', 'perlas antes', 'pérolas antes', 'ngọc trai trước đây', 'mutiara sebelumnya', 'önceki inci', 'pereł wcześniej'],

  // ── 4 · хватает на ранг ──
  rankOverline: ['Монета · ранг {rank}', 'Монета · ранг {rank}', 'Coin · rank {rank}', 'Moneda · rango {rank}', 'Moeda · nível {rank}', 'Đồng xu · hạng {rank}', 'Koin · peringkat {rank}', 'Jeton · rütbe {rank}', 'Moneta · ranga {rank}'],
  rankTitle: ['Хватает на ранг {next}', 'Вистачає на ранг {next}', 'Enough for rank {next}', 'Te alcanza para el rango {next}', 'Dá para o nível {next}', 'Đủ để lên hạng {next}', 'Cukup untuk peringkat {next}', '{next}. rütbeye yetiyor', 'Wystarczy na rangę {next}'],
  rankText: [
    'На счёте {coins} {cw}. Ранг {next} стоит {price}.', 'На рахунку {coins} {cw}. Ранг {next} коштує {price}.', 'You have {coins} {cw}. Rank {next} costs {price}.',
    'Tienes {coins} {cw}. El rango {next} cuesta {price}.', 'Você tem {coins} {cw}. O nível {next} custa {price}.', 'Bạn có {coins} {cw}. Hạng {next} giá {price}.',
    'Kamu punya {coins} {cw}. Peringkat {next} seharga {price}.', 'Hesabında {coins} {cw} var. {next}. rütbe {price} tutuyor.', 'Masz {coins} {cw}. Ranga {next} kosztuje {price}.',
  ],
  rankLeft: ['останется {left}', 'залишиться {left}', '{left} left after', 'te quedarán {left}', 'sobram {left}', 'còn lại {left}', 'tersisa {left}', 'geriye {left} kalır', 'zostanie {left}'],

  // ── 5 · вышло обновление (строки изменений приходят из события) ──
  updateOverline: ['Версия {version}', 'Версія {version}', 'Version {version}', 'Versión {version}', 'Versão {version}', 'Phiên bản {version}', 'Versi {version}', 'Sürüm {version}', 'Wersja {version}'],
  updateTitle: ['Вышло обновление', 'Вийшло оновлення', 'An update is out', 'Hay una actualización', 'Saiu uma atualização', 'Đã có bản cập nhật', 'Pembaruan tersedia', 'Güncelleme çıktı', 'Jest aktualizacja'],

  // ── 6 · личное сообщение (текст и время приходят из события) ──
  msgOverline: ['Личное сообщение', 'Особисте повідомлення', 'Personal message', 'Mensaje personal', 'Mensagem pessoal', 'Tin nhắn riêng', 'Pesan pribadi', 'Kişisel mesaj', 'Wiadomość osobista'],
  msgTitle: ['Ответ от команды', 'Відповідь від команди', 'A reply from the team', 'Respuesta del equipo', 'Resposta da equipe', 'Phản hồi từ đội ngũ', 'Balasan dari tim', 'Ekipten yanıt', 'Odpowiedź od zespołu'],

  // ── 7 · напоминания выключены ──
  nudgeOverline: ['Напоминания выключены', 'Нагадування вимкнено', 'Reminders are off', 'Recordatorios desactivados', 'Lembretes desativados', 'Nhắc nhở đang tắt', 'Pengingat nonaktif', 'Hatırlatıcılar kapalı', 'Przypomnienia wyłączone'],
  nudgeTitle: ['{days} {days_w} без занятий', '{days} {days_w} без занять', '{days} {days_w} without practice', '{days} {days_w} sin practicar', '{days} {days_w} sem praticar', '{days} {days_w} chưa học', '{days} {days_w} tanpa latihan', '{days} {days_w} çalışma yok', '{days} {days_w} bez nauki'],
  nudgeText: [
    'Одно напоминание в день, в то время, которое выберешь.', 'Одне нагадування на день, у час, який обереш.', 'One reminder a day, at the time you choose.',
    'Un recordatorio al día, a la hora que elijas.', 'Um lembrete por dia, no horário que você escolher.', 'Một lời nhắc mỗi ngày, vào giờ bạn chọn.',
    'Satu pengingat sehari, pada jam yang kamu pilih.', 'Günde bir hatırlatma, seçtiğin saatte.', 'Jedno przypomnienie dziennie, o wybranej porze.',
  ],

  // ── 8 и 16 · Plus закончился / Plus подключён (дата приходит готовой строкой) ──
  untilOverline: ['До {date}', 'До {date}', 'Until {date}', 'Hasta el {date}', 'Até {date}', 'Đến {date}', 'Hingga {date}', '{date} tarihine kadar', 'Do {date}'],
  expiredTitle: ['Plus закончился', 'Plus закінчився', 'Plus has ended', 'Plus terminó', 'O Plus terminou', 'Plus đã hết hạn', 'Plus telah berakhir', 'Plus sona erdi', 'Plus się skończył'],
  plusOnTitle: ['Plus подключён', 'Plus підключено', 'Plus is on', 'Plus está activo', 'O Plus está ativo', 'Plus đã bật', 'Plus sudah aktif', 'Plus açıldı', 'Plus jest aktywny'],
  perkShield: ['Защита серии, {n} в месяц', 'Захист серії, {n} на місяць', 'Streak shields, {n} a month', 'Protección de racha, {n} al mes', 'Proteção de sequência, {n} por mês', 'Bảo vệ chuỗi, {n} lần mỗi tháng', 'Pelindung rangkaian, {n} per bulan', 'Seri koruması, ayda {n}', 'Ochrona serii, {n} w miesiącu'],
  perkDialogs: ['Диалоги без счётчика', 'Діалоги без лічильника', 'Dialogues with no counter', 'Diálogos sin contador', 'Diálogos sem contador', 'Hội thoại không giới hạn', 'Dialog tanpa penghitung', 'Sayaçsız diyaloglar', 'Dialogi bez licznika'],
  perkLessons: ['Все уроки курса', 'Усі уроки курсу', 'Every lesson in the course', 'Todas las lecciones del curso', 'Todas as lições do curso', 'Tất cả bài học của khóa', 'Semua pelajaran kursus', 'Kursun tüm dersleri', 'Wszystkie lekcje kursu'],

  // ── 9 · подарок по приглашению (имя друга не склоняем — оно стоит подлежащим) ──
  refInvites: ['{name} приглашает', '{name} запрошує', '{name} invited you', '{name} te invita', '{name} convida você', '{name} mời bạn', '{name} mengundangmu', '{name} seni davet ediyor', '{name} zaprasza'],
  refTitle: ['{plusDays} {plusDays_w} Plus в подарок', '{plusDays} {plusDays_w} Plus у подарунок', '{plusDays} {plusDays_w} of Plus as a gift', '{plusDays} {plusDays_w} de Plus de regalo', '{plusDays} {plusDays_w} de Plus de presente', 'Tặng {plusDays} {plusDays_w} Plus', 'Hadiah {plusDays} {plusDays_w} Plus', '{plusDays} {plusDays_w} Plus hediye', '{plusDays} {plusDays_w} Plus w prezencie'],
  refText: [
    'Введи код друга, и Plus включится сразу. {name} тоже получит награду.',
    'Введи код друга, і Plus увімкнеться одразу. {name} теж отримає нагороду.',
    'Enter your friend’s code and Plus turns on right away. {name} gets a reward too.',
    'Ingresa el código de tu amigo y Plus se activa al instante. {name} también recibe una recompensa.',
    'Insira o código do seu amigo e o Plus ativa na hora. {name} também ganha uma recompensa.',
    'Nhập mã của bạn bè và Plus bật ngay. {name} cũng nhận được phần thưởng.',
    'Masukkan kode temanmu dan Plus langsung aktif. {name} juga mendapat hadiah.',
    'Arkadaşının kodunu gir, Plus hemen açılsın. {name} de ödül kazanır.',
    'Wpisz kod znajomego, a Plus włączy się od razu. {name} też dostanie nagrodę.',
  ],

  // ── 10 · подарок закончился ──
  refEndedOverline: ['Подарок по приглашению', 'Подарунок за запрошенням', 'Gift by invitation', 'Regalo por invitación', 'Presente por convite', 'Quà từ lời mời', 'Hadiah dari undangan', 'Davet hediyesi', 'Prezent z zaproszenia'],
  refEndedTitle: ['Подарочный Plus закончился', 'Подарунковий Plus закінчився', 'Your gift Plus has ended', 'Tu Plus de regalo terminó', 'Seu Plus de presente terminou', 'Plus quà tặng đã hết', 'Plus hadiah telah berakhir', 'Hediye Plus sona erdi', 'Prezentowy Plus się skończył'],
  refEndedText: [
    'Доступ действовал до {date}. Уроки и прогресс остались с тобой.', 'Доступ діяв до {date}. Уроки й прогрес залишилися з тобою.', 'Access lasted until {date}. Your lessons and progress stay with you.',
    'El acceso duró hasta el {date}. Tus lecciones y tu progreso siguen contigo.', 'O acesso durou até {date}. Suas lições e seu progresso continuam com você.', 'Quyền truy cập kéo dài đến {date}. Bài học và tiến độ vẫn còn nguyên.',
    'Akses berlaku hingga {date}. Pelajaran dan progresmu tetap ada.', 'Erişim {date} tarihine kadar sürdü. Derslerin ve ilerlemen seninle.', 'Dostęp trwał do {date}. Lekcje i postępy zostają z tobą.',
  ],

  // ── 11 · идеальный урок ──
  lessonOverline: ['Урок {lessonNo}', 'Урок {lessonNo}', 'Lesson {lessonNo}', 'Lección {lessonNo}', 'Lição {lessonNo}', 'Bài {lessonNo}', 'Pelajaran {lessonNo}', '{lessonNo}. ders', 'Lekcja {lessonNo}'],
  perfectTitle: ['Без единой ошибки', 'Без жодної помилки', 'Not a single mistake', 'Sin un solo error', 'Sem nenhum erro', 'Không sai câu nào', 'Tanpa satu kesalahan pun', 'Tek hata yok', 'Bez żadnego błędu'],
  plusCoins: same('+{coins} {cw}'),

  // ── 12 · открыт новый урок ──
  openOverline: ['Урок {lessonNo} пройден', 'Урок {lessonNo} пройдено', 'Lesson {lessonNo} done', 'Lección {lessonNo} completada', 'Lição {lessonNo} concluída', 'Đã xong bài {lessonNo}', 'Pelajaran {lessonNo} selesai', '{lessonNo}. ders tamam', 'Lekcja {lessonNo} ukończona'],
  openTitle: ['Открыт урок {next}', 'Відкрито урок {next}', 'Lesson {next} is open', 'Se abrió la lección {next}', 'Lição {next} liberada', 'Đã mở bài {next}', 'Pelajaran {next} terbuka', '{next}. ders açıldı', 'Lekcja {next} odblokowana'],
  openTopic: ['Тема: {topic}.', 'Тема: {topic}.', 'Topic: {topic}.', 'Tema: {topic}.', 'Tema: {topic}.', 'Chủ đề: {topic}.', 'Topik: {topic}.', 'Konu: {topic}.', 'Temat: {topic}.'],

  // ── 13 · оценка приложения ──
  rateOverline: ['{lessons} {lessons_w} позади', '{lessons} {lessons_w} позаду', '{lessons} {lessons_w} done', '{lessons} {lessons_w} hasta hoy', '{lessons} {lessons_w} até hoje', 'Đã học {lessons} {lessons_w}', '{lessons} {lessons_w} selesai', '{lessons} {lessons_w} tamam', '{lessons} {lessons_w} za tobą'],
  rateTitle: ['Нравится PhraseMan?', 'Подобається PhraseMan?', 'Enjoying PhraseMan?', '¿Te gusta PhraseMan?', 'Gostando do PhraseMan?', 'Bạn thích PhraseMan chứ?', 'Suka PhraseMan?', 'PhraseMan’i beğendin mi?', 'Podoba ci się PhraseMan?'],
  rateText: [
    'Оценка в магазине занимает 10 секунд и помогает другим найти приложение.',
    'Оцінка в магазині займає 10 секунд і допомагає іншим знайти застосунок.',
    'A store rating takes 10 seconds and helps others find the app.',
    'Calificar en la tienda toma 10 segundos y ayuda a otros a encontrar la app.',
    'Avaliar na loja leva 10 segundos e ajuda outras pessoas a encontrar o app.',
    'Đánh giá trên cửa hàng mất 10 giây và giúp người khác tìm thấy ứng dụng.',
    'Memberi nilai di toko hanya 10 detik dan membantu orang lain menemukan aplikasi.',
    'Mağazada puan vermek 10 saniye sürer ve başkalarının uygulamayı bulmasına yardım eder.',
    'Ocena w sklepie zajmuje 10 sekund i pomaga innym znaleźć aplikację.',
  ],

  // ── 14 · приз за набор месяца ({monthIn} — готовая связка «за октябрь» из tplMonthIn) ──
  prizeOverline: ['Набор месяца {monthIn}', 'Набір місяця {monthIn}', 'Pack of the month {monthIn}', 'Pack del mes {monthIn}', 'Pacote do mês {monthIn}', 'Bộ thẻ nổi bật {monthIn}', 'Paket terbaik {monthIn}', '{monthIn} ayın paketi', 'Zestaw miesiąca {monthIn}'],
  prizeTitle: ['Твой набор на {place}-м месте', 'Твій набір на {place}-му місці', 'Your pack took place {place}', 'Tu pack quedó en el puesto {place}', 'Seu pacote ficou em {place}º lugar', 'Bộ thẻ của bạn đứng hạng {place}', 'Paketmu meraih peringkat {place}', 'Paketin {place}. oldu', 'Twój zestaw zajął {place}. miejsce'],
  prizeText: ['«{pack}» · сохранений: {count}', '«{pack}» · збережень: {count}', '“{pack}” · saves: {count}', '«{pack}» · guardados: {count}', '“{pack}” · salvamentos: {count}', '“{pack}” · lượt lưu: {count}', '“{pack}” · disimpan: {count}', '“{pack}” · kaydetme: {count}', '„{pack}” · zapisań: {count}'],

  // ── 15 · первый разговор ──
  firstDialogTitle: ['Первый разговор состоялся', 'Перша розмова відбулася', 'Your first conversation is done', 'Tu primera conversación está hecha', 'Sua primeira conversa está feita', 'Cuộc trò chuyện đầu tiên đã xong', 'Percakapan pertamamu selesai', 'İlk sohbetin tamam', 'Pierwsza rozmowa za tobą'],
} as const satisfies Readonly<Record<string, Nine>>;

export type StoryInsteadStringKey = keyof typeof S;
export const STORY_INSTEAD_STRING_KEYS = Object.keys(S) as StoryInsteadStringKey[];

/** Какой таблице слов к числам соответствует подстановка: `{days}` → `{days_w}` и т. д. (таблицы — story_template_strings). */
const WORD_OF: Readonly<Record<string, Parameters<typeof tplWord>[1]>> = { days: 'day', plusDays: 'day', cards: 'card', lessons: 'lesson' };

/**
 * Текст кадра на языке интерфейса: подставляет значения, слово к числу (`{x_w}`) и слово «монета» (`{cw}` — по `coins`).
 * Числа пишутся с разрядами и приклеены к словам неразрывным пробелом. Неизвестный язык — английский.
 */
export function insteadText(lang: Lang, key: StoryInsteadStringKey, vars: Readonly<Record<string, string | number>> = {}): string {
  const row: Nine = S[key];
  const raw = row[LANG_INDEX[lang] ?? LANG_INDEX.en!]!;
  const filled: Record<string, string> = {};
  for (const [name, value] of Object.entries(vars)) {
    filled[name] = typeof value === 'number' ? tplNumber(value) : value;
    const table = WORD_OF[name];
    if (table && typeof value === 'number') filled[`${name}_w`] = tplWord(lang, table, value);
  }
  if (typeof vars.coins === 'number') filled.cw = momentCoinWord(lang, vars.coins);
  return glueNumbers(raw.replace(/\{(\w+)\}/g, (whole, name: string) => filled[name] ?? whole));
}
