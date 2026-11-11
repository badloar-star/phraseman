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
  ctaRestorePlus: ['Вернуть Plus', 'Повернути Plus', 'Get Plus back', 'Recuperar Plus', 'Recuperar Plus', 'Lấy lại Plus', 'Aktifkan Plus lagi', 'Plus’ı geri al', 'Odzyskaj Plus'],
  ctaEnterCode: ['У меня есть код приглашения', 'У мене є код запрошення', 'I have an invite code', 'Tengo un código de invitación', 'Tenho um código de convite', 'Tôi có mã mời', 'Saya punya kode undangan', 'Davet kodum var', 'Mam kod zaproszenia'], // дословно как кнопка окна
  ctaInviteFriend: ['Пригласить друга', 'Запросити друга', 'Invite a friend', 'Invitar a un amigo', 'Convidar um amigo', 'Mời một người bạn', 'Ajak teman', 'Arkadaş davet et', 'Zaproś znajomego'], // дословно как кнопка окна
  ctaStartLesson: ['Начать урок {lessonNo}', 'Почати урок {lessonNo}', 'Start lesson {lessonNo}', 'Empezar la lección {lessonNo}', 'Começar a lição {lessonNo}', 'Bắt đầu bài {lessonNo}', 'Mulai pelajaran {lessonNo}', '{lessonNo}. derse başla', 'Zacznij lekcję {lessonNo}'],
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
  // подпись под числом выученных фраз — то, что окно «С возвращением» знает о человеке (welcome_back_model: phrasesLearned)
  backPhrasesLabel: ['фраз выучено', 'фраз вивчено', 'phrases learned', 'frases aprendidas', 'frases aprendidas', 'cụm từ đã học', 'frasa dipelajari', 'ifade öğrenildi', 'poznanych zwrotów'],

  // ── 3 · бонусы стали монетами ──
  legacyOverline: same('PhraseMan 2.0'),
  legacyTitle: ['Бонусы стали монетами', 'Бонуси стали монетами', 'Bonuses are now coins', 'Los bonos ahora son monedas', 'Os bônus viraram moedas', 'Phần thưởng đã thành xu', 'Bonus kini menjadi koin', 'Bonuslar jetona dönüştü', 'Bonusy stały się monetami'],
  legacyText: [
    // пересчитывались опыт, жемчуг и вращения (legacy_bonus_view) — «осколков» среди них нет
    'Опыт, жемчуг и вращения пересчитаны. Ничего не потеряно.', 'Досвід, перли й обертання перераховано. Нічого не втрачено.', 'Experience, pearls and spins were converted. Nothing was lost.',
    'La experiencia, las perlas y los giros se convirtieron. No se perdió nada.', 'Experiência, pérolas e giros foram convertidos. Nada se perdeu.', 'Kinh nghiệm, ngọc trai và lượt quay đã được quy đổi. Không mất gì cả.',
    'Pengalaman, mutiara, dan putaran sudah dikonversi. Tidak ada yang hilang.', 'Deneyim, inciler ve çevirmeler dönüştürüldü. Hiçbir şey kaybolmadı.', 'Doświadczenie, perły i obroty zostały przeliczone. Nic nie przepadło.',
  ],
  legacyXpLabel: ['опыта было', 'досвіду було', 'experience before', 'experiencia antes', 'experiência antes', 'kinh nghiệm trước đây', 'pengalaman sebelumnya', 'önceki deneyim', 'doświadczenia wcześniej'],
  legacySpinsLabel: ['вращений было', 'обертань було', 'spins before', 'giros antes', 'giros antes', 'lượt quay trước đây', 'putaran sebelumnya', 'önceki çevirme', 'obrotów wcześniej'],
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

  // ── 6 · личное сообщение — слово над заголовком то же, что в окне (components/PersonalAdminMessageModal) ──
  msgOverline: ['Сообщение', 'Повідомлення', 'Message', 'Mensaje', 'Mensagem', 'Tin nhắn', 'Pesan', 'Mesaj', 'Wiadomość'],

  // ── 8 и 16 · Plus закончился / Plus подключён (дата приходит готовой строкой) ──
  untilOverline: ['До {date}', 'До {date}', 'Until {date}', 'Hasta el {date}', 'Até {date}', 'Đến {date}', 'Hingga {date}', '{date} tarihine kadar', 'Do {date}'],
  expiredTitle: ['Plus закончился', 'Plus закінчився', 'Plus has ended', 'Plus terminó', 'O Plus terminou', 'Plus đã hết hạn', 'Plus telah berakhir', 'Plus sona erdi', 'Plus się skończył'],
  plusOnTitle: ['Plus подключён', 'Plus підключено', 'Plus is on', 'Plus está activo', 'O Plus está ativo', 'Plus đã bật', 'Plus sudah aktif', 'Plus açıldı', 'Plus jest aktywny'],
  perkShield: ['Защита серии, {n} в месяц', 'Захист серії, {n} на місяць', 'Streak shields, {n} a month', 'Protección de racha, {n} al mes', 'Proteção de sequência, {n} por mês', 'Bảo vệ chuỗi, {n} lần mỗi tháng', 'Pelindung rangkaian, {n} per bulan', 'Seri koruması, ayda {n}', 'Ochrona serii, {n} w miesiącu'],
  perkDialogs: ['Диалоги без счётчика', 'Діалоги без лічильника', 'Dialogues with no counter', 'Diálogos sin contador', 'Diálogos sem contador', 'Hội thoại không giới hạn', 'Dialog tanpa penghitung', 'Sayaçsız diyaloglar', 'Dialogi bez licznika'],
  perkLessons: ['Все уроки курса', 'Усі уроки курсу', 'Every lesson in the course', 'Todas las lecciones del curso', 'Todas as lições do curso', 'Tất cả bài học của khóa', 'Semua pelajaran kursus', 'Kursun tüm dersleri', 'Wszystkie lekcje kursu'],

  // ── 9 · тебя пригласили ──
  // зачем: текст — дословно из окна ReferralWelcomeHost, он уже выверен Переводчиком; придуманные в макете «7 дней Plus в подарок» и
  // «друг тоже получит награду» убраны — таких обещаний окно не давало
  refTitle: ['Тебя пригласили', 'Тебе запросили', 'You were invited', 'Te invitaron', 'Você foi convidado', 'Bạn được mời', 'Kamu diundang', 'Davet edildin', 'Masz zaproszenie'],
  refText: [
    'Тебя позвал друг. Начни учиться — мы рады, что ты с нами.', 'Тебе покликав друг. Починай навчання — ми раді, що ти з нами.', 'A friend invited you. Start learning — we are glad you are here.',
    'Te invitó un amigo. Empieza a aprender: nos alegra que estés aquí.', 'Um amigo convidou você. Comece a aprender: que bom ter você aqui.', 'Một người bạn đã mời bạn. Bắt đầu học nào — chúng tôi rất vui vì có bạn.',
    'Seorang teman mengundangmu. Mulai belajar — kami senang kamu di sini.', 'Bir arkadaşın seni davet etti. Öğrenmeye başla — burada olmana sevindik.', 'Zaprosił cię znajomy. Zacznij naukę — cieszymy się, że tu jesteś.',
  ],

  // ── 10 · доступ можно открыть снова ──
  // зачем: текст — дословно из окна «реферальный доступ закончился» (app/referral_access_ended_modal.tsx), он уже выверен Переводчиком;
  // придуманные в макете «7 дней Plus закончились» и дата окончания убраны — таких обещаний и такой даты в приложении нет
  refEndedTitle: ['Доступ можно открыть снова', 'Доступ можна відкрити знову', 'You can unlock access again', 'Puedes volver a abrir el acceso', 'Você pode abrir o acesso de novo', 'Bạn có thể mở lại quyền truy cập', 'Akses bisa dibuka lagi', 'Erişimi yeniden açabilirsin', 'Dostęp możesz otworzyć ponownie'],
  refEndedKeep: ['Всё, что ты открыл — осталось с тобой.', 'Все, що ти відкрив — залишилось з тобою.', 'Everything you unlocked stays with you.', 'Todo lo que abriste sigue siendo tuyo.', 'Tudo o que você abriu continua com você.', 'Mọi thứ bạn đã mở khoá vẫn là của bạn.', 'Semua yang kamu buka tetap milikmu.', 'Açtığın her şey seninle kalmaya devam ediyor.', 'Wszystko, co otworzyłeś, wciąż jest Twoje.'],
  refEndedRestore: ['Позови ещё друга — и доступ вернётся.', 'Запроси ще друга — і доступ повернеться.', 'Invite one more friend and access will return.', 'Invita a otro amigo y el acceso regresará.', 'Convide mais um amigo e o acesso voltará.', 'Mời thêm một người bạn và quyền truy cập sẽ trở lại.', 'Ajak satu teman lagi dan aksesmu akan kembali.', 'Bir arkadaşını daha davet et, erişim geri gelsin.', 'Zaproś kolejnego znajomego — dostęp wróci.'],

  // ── 11 · идеальный урок ──
  lessonOverline: ['Урок {lessonNo}', 'Урок {lessonNo}', 'Lesson {lessonNo}', 'Lección {lessonNo}', 'Lição {lessonNo}', 'Bài {lessonNo}', 'Pelajaran {lessonNo}', '{lessonNo}. ders', 'Lekcja {lessonNo}'],
  perfectTitle: ['Без единой ошибки', 'Без жодної помилки', 'Not a single mistake', 'Sin un solo error', 'Sem nenhum erro', 'Không sai câu nào', 'Tanpa satu kesalahan pun', 'Tek hata yok', 'Bez żadnego błędu'],
  plusCoins: same('+{coins} {cw}'),

  // ── 12 · открыт новый урок ──
  openOverline: ['Урок {lessonNo} пройден', 'Урок {lessonNo} пройдено', 'Lesson {lessonNo} done', 'Lección {lessonNo} completada', 'Lição {lessonNo} concluída', 'Đã xong bài {lessonNo}', 'Pelajaran {lessonNo} selesai', '{lessonNo}. ders tamam', 'Lekcja {lessonNo} ukończona'],
  openTitle: ['Открыт урок {next}', 'Відкрито урок {next}', 'Lesson {next} is open', 'Se abrió la lección {next}', 'Lição {next} liberada', 'Đã mở bài {next}', 'Pelajaran {next} terbuka', '{next}. ders açıldı', 'Lekcja {next} odblokowana'],
  openTopic: ['Тема: {topic}.', 'Тема: {topic}.', 'Topic: {topic}.', 'Tema: {topic}.', 'Tema: {topic}.', 'Chủ đề: {topic}.', 'Topik: {topic}.', 'Konu: {topic}.', 'Temat: {topic}.'],

  // ── 14 · приз за набор месяца ({monthIn} — готовая связка «за октябрь» из tplMonthIn) ──
  prizeOverline: ['Набор месяца {monthIn}', 'Набір місяця {monthIn}', 'Pack of the month {monthIn}', 'Pack del mes {monthIn}', 'Pacote do mês {monthIn}', 'Bộ thẻ nổi bật {monthIn}', 'Paket terbaik {monthIn}', '{monthIn} ayın paketi', 'Zestaw miesiąca {monthIn}'],
  prizeTitle: ['Твой набор на {place}-м месте', 'Твій набір на {place}-му місці', 'Your pack took place {place}', 'Tu pack quedó en el puesto {place}', 'Seu pacote ficou em {place}º lugar', 'Bộ thẻ của bạn đứng hạng {place}', 'Paketmu meraih peringkat {place}', 'Paketin {place}. oldu', 'Twój zestaw zajął {place}. miejsce'],
  prizeText: ['«{pack}» · сохранений: {count}', '«{pack}» · збережень: {count}', '“{pack}” · saves: {count}', '«{pack}» · guardados: {count}', '“{pack}” · salvamentos: {count}', '“{pack}” · lượt lưu: {count}', '“{pack}” · disimpan: {count}', '“{pack}” · kaydetme: {count}', '„{pack}” · zapisań: {count}'],

  // 15 · первый разговор — своих строк нет: кадр берёт тексты окна из components/dialog_moments/first_dialog_strings.ts
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
