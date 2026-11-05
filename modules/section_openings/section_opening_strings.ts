// section_opening_strings.ts — тексты праздничных окон «Открытие разделов» на 9 языках (плоские строки, без подстановок).
//
// зачем (владелец одобрил макет; координатор 04.11): ru — слово в слово из openings.js макета; остальные 8 — на проверку Переводчику.
// Правила владельца: просто, без метафор, без рода. Тексты кадров фаз общие: «Предвкушение» и «Раскрытие» без текста (надпись раздела
// и героя), текст появляется с фазы «Праздник» и держится до «CTA» — как в макете (copy.inert до 82 %).
import type { Lang } from '../../constants/i18n';
import type { SectionOpeningId } from './section_opening_core';

export type SectionOpeningCopy = Readonly<{ label: string; title: string; body: string; cta: string }>;
type Row = Readonly<Record<SectionOpeningId, SectionOpeningCopy>> & Readonly<{ skip: string; home: string; overline: string; allOpen: string }>;

const T: Readonly<Record<Lang, Row>> = {
  ru: {
    skip: 'Пропустить',
    home: 'На главную', overline: 'РАНГ {n} · НОВЫЙ РАЗДЕЛ', allOpen: 'ВСЕ РАЗДЕЛЫ ДОСТУПНЫ',
    rank: { label: 'РАНГ 1', title: 'Новый ранг!', body: 'Видео и диалоги теперь доступны. Выбирай, что попробовать первым.', cta: 'Посмотреть открытия' },
    video: { label: 'ВИДЕО', title: 'Открылось видео', body: 'Смотри видео на изучаемом языке и сохраняй фразы.', cta: 'Открыть видео' },
    dialogs: { label: 'ДИАЛОГИ', title: 'Пора поговорить', body: 'Выбирай ситуацию и пробуй отвечать в диалоге.', cta: 'К диалогам' },
    peak: { label: 'ПИК', title: 'Пик открыт', body: 'Войди в комнату недели, когда будешь готов.', cta: 'Посмотреть Пик' },
    cards: { label: 'КАРТОЧКИ', title: 'Твои карточки — вместе', body: 'Сохранённые фразы, свои наборы и наборы сообщества теперь в одном месте.', cta: 'Открыть карточки' },
    plus: { label: 'PHRASEMAN PLUS', title: 'Больше способов учиться', body: 'Видео, диалоги, Пик и карточки уже доступны.', cta: 'Выбрать занятие' },
  },
  uk: {
    skip: 'Пропустити',
    home: 'На головну', overline: 'РАНГ {n} · НОВИЙ РОЗДІЛ', allOpen: 'УСІ РОЗДІЛИ ДОСТУПНІ',
    rank: { label: 'РАНГ 1', title: 'Новий ранг!', body: 'Відео та діалоги тепер доступні. Обирай, що спробувати першим.', cta: 'Переглянути відкриття' },
    video: { label: 'ВІДЕО', title: 'Відкрилося відео', body: 'Дивись відео мовою, яку вивчаєш, і зберігай фрази.', cta: 'Відкрити відео' },
    dialogs: { label: 'ДІАЛОГИ', title: 'Час поговорити', body: 'Обирай ситуацію й пробуй відповідати в діалозі.', cta: 'До діалогів' },
    peak: { label: 'ПІК', title: 'Пік відкрито', body: 'Заходь до кімнати тижня, коли будеш готовий.', cta: 'Переглянути Пік' },
    cards: { label: 'КАРТКИ', title: 'Твої картки — разом', body: 'Збережені фрази, власні набори та набори спільноти тепер в одному місці.', cta: 'Відкрити картки' },
    plus: { label: 'PHRASEMAN PLUS', title: 'Більше способів вчитися', body: 'Відео, діалоги, Пік і картки вже доступні.', cta: 'Обрати заняття' },
  },
  en: {
    skip: 'Skip',
    home: 'Go home', overline: 'RANK {n} · NEW SECTION', allOpen: 'ALL SECTIONS AVAILABLE',
    rank: { label: 'RANK 1', title: 'New rank!', body: 'Videos and dialogs are now available. Choose what to try first.', cta: 'See what opened' },
    video: { label: 'VIDEO', title: 'Videos are open', body: 'Watch videos in the language you study and save phrases.', cta: 'Open videos' },
    dialogs: { label: 'DIALOGS', title: 'Time to talk', body: 'Pick a situation and try answering in a dialog.', cta: 'Go to dialogs' },
    peak: { label: 'PEAK', title: 'Peak is open', body: 'Enter the week room when you are ready.', cta: 'See Peak' },
    cards: { label: 'CARDS', title: 'Your cards, together', body: 'Saved phrases, your own sets and community sets are now in one place.', cta: 'Open cards' },
    plus: { label: 'PHRASEMAN PLUS', title: 'More ways to learn', body: 'Videos, dialogs, Peak and cards are already available.', cta: 'Choose an activity' },
  },
  es: {
    skip: 'Omitir',
    home: 'Ir al inicio', overline: 'RANGO {n} · SECCIÓN NUEVA', allOpen: 'TODAS LAS SECCIONES DISPONIBLES',
    rank: { label: 'RANGO 1', title: '¡Nuevo rango!', body: 'Los vídeos y los diálogos ya están disponibles. Elige qué probar primero.', cta: 'Ver lo nuevo' },
    video: { label: 'VÍDEO', title: 'Vídeos disponibles', body: 'Mira vídeos en el idioma que estudias y guarda frases.', cta: 'Abrir vídeos' },
    dialogs: { label: 'DIÁLOGOS', title: 'Hora de hablar', body: 'Elige una situación e intenta responder en un diálogo.', cta: 'Ir a diálogos' },
    peak: { label: 'PICO', title: 'Pico disponible', body: 'Entra a la sala de la semana cuando estés listo.', cta: 'Ver Pico' },
    cards: { label: 'TARJETAS', title: 'Tus tarjetas, juntas', body: 'Las frases guardadas, tus conjuntos y los de la comunidad ya están en un solo lugar.', cta: 'Abrir tarjetas' },
    plus: { label: 'PHRASEMAN PLUS', title: 'Más formas de aprender', body: 'Vídeos, diálogos, Pico y tarjetas ya están disponibles.', cta: 'Elegir una actividad' },
  },
  'pt-BR': {
    skip: 'Pular',
    home: 'Ir para o início', overline: 'NÍVEL {n} · NOVA SEÇÃO', allOpen: 'TODAS AS SEÇÕES DISPONÍVEIS',
    rank: { label: 'NÍVEL 1', title: 'Novo nível!', body: 'Vídeos e diálogos já estão disponíveis. Escolha o que testar primeiro.', cta: 'Ver as novidades' },
    video: { label: 'VÍDEO', title: 'Vídeos liberados', body: 'Assista a vídeos no idioma que você estuda e salve frases.', cta: 'Abrir vídeos' },
    dialogs: { label: 'DIÁLOGOS', title: 'Hora de conversar', body: 'Escolha uma situação e tente responder no diálogo.', cta: 'Ir para os diálogos' },
    peak: { label: 'PICO', title: 'Pico liberado', body: 'Entre na sala da semana quando estiver pronto.', cta: 'Ver o Pico' },
    cards: { label: 'CARTÕES', title: 'Seus cartões, juntos', body: 'Frases salvas, seus conjuntos e os da comunidade agora ficam em um só lugar.', cta: 'Abrir cartões' },
    plus: { label: 'PHRASEMAN PLUS', title: 'Mais jeitos de aprender', body: 'Vídeos, diálogos, Pico e cartões já estão disponíveis.', cta: 'Escolher uma atividade' },
  },
  vi: {
    skip: 'Bỏ qua',
    home: 'Về trang chủ', overline: 'HẠNG {n} · PHẦN MỚI', allOpen: 'MỌI PHẦN ĐỀU ĐÃ MỞ',
    rank: { label: 'HẠNG 1', title: 'Hạng mới!', body: 'Video và hội thoại đã mở. Chọn thứ muốn thử trước.', cta: 'Xem phần mới mở' },
    video: { label: 'VIDEO', title: 'Video đã mở', body: 'Xem video bằng ngôn ngữ đang học và lưu các cụm từ.', cta: 'Mở video' },
    dialogs: { label: 'HỘI THOẠI', title: 'Đến lúc trò chuyện', body: 'Chọn một tình huống và thử trả lời trong hội thoại.', cta: 'Đến hội thoại' },
    peak: { label: 'ĐỈNH', title: 'Đỉnh đã mở', body: 'Vào phòng của tuần khi bạn sẵn sàng.', cta: 'Xem Đỉnh' },
    cards: { label: 'THẺ', title: 'Thẻ của bạn ở một nơi', body: 'Cụm từ đã lưu, bộ thẻ riêng và bộ thẻ cộng đồng giờ ở cùng một chỗ.', cta: 'Mở thẻ' },
    plus: { label: 'PHRASEMAN PLUS', title: 'Thêm cách để học', body: 'Video, hội thoại, Đỉnh và thẻ đều đã mở.', cta: 'Chọn bài học' },
  },
  id: {
    skip: 'Lewati',
    home: 'Ke beranda', overline: 'PERINGKAT {n} · BAGIAN BARU', allOpen: 'SEMUA BAGIAN TERSEDIA',
    rank: { label: 'PERINGKAT 1', title: 'Peringkat baru!', body: 'Video dan dialog sekarang tersedia. Pilih mana yang dicoba lebih dulu.', cta: 'Lihat yang terbuka' },
    video: { label: 'VIDEO', title: 'Video terbuka', body: 'Tonton video dalam bahasa yang dipelajari dan simpan frasa.', cta: 'Buka video' },
    dialogs: { label: 'DIALOG', title: 'Saatnya bicara', body: 'Pilih situasi dan coba menjawab dalam dialog.', cta: 'Ke dialog' },
    peak: { label: 'PUNCAK', title: 'Puncak terbuka', body: 'Masuk ke ruang minggu ini saat sudah siap.', cta: 'Lihat Puncak' },
    cards: { label: 'KARTU', title: 'Kartumu jadi satu', body: 'Frasa tersimpan, set buatanmu, dan set komunitas kini ada di satu tempat.', cta: 'Buka kartu' },
    plus: { label: 'PHRASEMAN PLUS', title: 'Lebih banyak cara belajar', body: 'Video, dialog, Puncak, dan kartu sudah tersedia.', cta: 'Pilih kegiatan' },
  },
  tr: {
    skip: 'Atla',
    home: 'Ana sayfaya git', overline: 'SEVİYE {n} · YENİ BÖLÜM', allOpen: 'TÜM BÖLÜMLER AÇIK',
    rank: { label: 'SEVİYE 1', title: 'Yeni seviye!', body: 'Videolar ve diyaloglar artık açık. Önce hangisini deneyeceğini seç.', cta: 'Açılanları gör' },
    video: { label: 'VİDEO', title: 'Videolar açıldı', body: 'Öğrendiğin dilde video izle ve cümleleri kaydet.', cta: 'Videoları aç' },
    dialogs: { label: 'DİYALOG', title: 'Konuşma zamanı', body: 'Bir durum seç ve diyalogda cevap vermeyi dene.', cta: 'Diyaloglara git' },
    peak: { label: 'ZİRVE', title: 'Zirve açıldı', body: 'Hazır olduğunda haftanın odasına gir.', cta: 'Zirveyi gör' },
    cards: { label: 'KARTLAR', title: 'Kartların bir arada', body: 'Kayıtlı cümleler, kendi setlerin ve topluluk setleri artık tek yerde.', cta: 'Kartları aç' },
    plus: { label: 'PHRASEMAN PLUS', title: 'Öğrenmenin daha çok yolu', body: 'Videolar, diyaloglar, Zirve ve kartlar zaten açık.', cta: 'Bir etkinlik seç' },
  },
  pl: {
    skip: 'Pomiń',
    home: 'Na stronę główną', overline: 'RANGA {n} · NOWA SEKCJA', allOpen: 'WSZYSTKIE SEKCJE DOSTĘPNE',
    rank: { label: 'RANGA 1', title: 'Nowa ranga!', body: 'Filmy i dialogi są już dostępne. Wybierz, co wypróbować najpierw.', cta: 'Zobacz nowości' },
    video: { label: 'FILMY', title: 'Filmy są dostępne', body: 'Oglądaj filmy w języku, którego się uczysz, i zapisuj frazy.', cta: 'Otwórz filmy' },
    dialogs: { label: 'DIALOGI', title: 'Czas porozmawiać', body: 'Wybierz sytuację i spróbuj odpowiedzieć w dialogu.', cta: 'Do dialogów' },
    peak: { label: 'SZCZYT', title: 'Szczyt otwarty', body: 'Wejdź do pokoju tygodnia, gdy będziesz gotowy.', cta: 'Zobacz Szczyt' },
    cards: { label: 'KARTY', title: 'Twoje karty w jednym miejscu', body: 'Zapisane frazy, własne zestawy i zestawy społeczności są teraz razem.', cta: 'Otwórz karty' },
    plus: { label: 'PHRASEMAN PLUS', title: 'Więcej sposobów nauki', body: 'Filmy, dialogi, Szczyt i karty są już dostępne.', cta: 'Wybierz zajęcia' },
  },
};

export function sectionOpeningCopy(lang: Lang, id: SectionOpeningId): SectionOpeningCopy {
  return (T[lang] ?? T.en)[id];
}
export function sectionOpeningSkip(lang: Lang): string {
  return (T[lang] ?? T.en).skip;
}

/** Кнопка «На главную» под основной (макет openings.js: plain-кнопка `skip-story`). */
export function sectionOpeningHome(lang: Lang): string {
  return (T[lang] ?? T.en).home;
}
/** Надзаголовок над названием: «РАНГ N · НОВЫЙ РАЗДЕЛ»; у Plus — «ВСЕ РАЗДЕЛЫ ДОСТУПНЫ» (макет openings.js). */
export function sectionOpeningOverline(lang: Lang, id: SectionOpeningId): string {
  const row = T[lang] ?? T.en;
  if (id === 'plus') return row.allOpen;
  return row.overline.replace('{n}', String(SECTION_OPENING_RANK[id]));
}
/** Ранг, на котором открывается раздел (registry макета: видео/диалоги 1, Пик 2, карточки 3; окно «Ранг» — 1). */
export const SECTION_OPENING_RANK: Readonly<Record<SectionOpeningId, number>> = { rank: 1, video: 1, dialogs: 1, peak: 2, cards: 3, plus: 3 };
