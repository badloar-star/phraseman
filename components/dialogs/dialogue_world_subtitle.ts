/**
 * Короткая строка под названием категории хаба «Диалоги» (макет dialogs.html A1–A2), 9 языков.
 *
 * зачем (сверка с макетом, 04.10): у карточки категории в макете есть одна короткая строка под названием.
 * Для «Поездки», «Общение» — тексты макета; для «Дела» аналога в макете нет, а у «Повседневное» макетная строка
 * повторяла название — обе написаны в тон остальным, по содержимому сцен (решение координатора, владельцу не выносится). Неизвестный мир — без строки.
 */
import { triLang, type Lang } from '../../constants/i18n';

type WorldSubtitleCopy = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;

const WORLD_SUBTITLES: Readonly<Record<string, WorldSubtitleCopy>> = {
  everyday: {
    ru: 'Просьбы, советы и мелочи дня', uk: 'Прохання, поради й дрібниці дня', en: 'Favors, advice and little things', es: 'Favores, consejos y pequeñas cosas',
    'pt-BR': 'Pedidos, conselhos e coisas do dia', vi: 'Nhờ vả, lời khuyên và chuyện thường ngày', id: 'Permintaan, saran, dan hal kecil', tr: 'Rica, tavsiye ve günlük işler', pl: 'Prośby, rady i drobiazgi dnia',
  },
  travel: {
    ru: 'В поездках и на отдыхе', uk: 'У поїздках і на відпочинку', en: 'On trips and on holiday', es: 'De viaje y de vacaciones',
    'pt-BR': 'Em viagens e nas férias', vi: 'Khi đi du lịch và nghỉ ngơi', id: 'Saat bepergian dan berlibur', tr: 'Seyahatte ve tatilde', pl: 'W podróży i na wakacjach',
  },
  social: {
    ru: 'Знакомства и разговоры', uk: 'Знайомства й розмови', en: 'Meeting people and chatting', es: 'Conocer gente y conversar',
    'pt-BR': 'Conhecer pessoas e conversar', vi: 'Làm quen và trò chuyện', id: 'Berkenalan dan mengobrol', tr: 'Tanışma ve sohbet', pl: 'Poznawanie ludzi i rozmowy',
  },
  work: {
    ru: 'Работа, учёба и важные дела', uk: 'Робота, навчання й важливі справи', en: 'Work, study and errands', es: 'Trabajo, estudios y trámites',
    'pt-BR': 'Trabalho, estudos e compromissos', vi: 'Công việc, học tập và việc quan trọng', id: 'Kerja, belajar, dan urusan penting', tr: 'İş, okul ve önemli işler', pl: 'Praca, nauka i ważne sprawy',
  },
};

export function dialogueWorldSubtitle(lang: Lang, worldId: string): string | null {
  const copy = WORLD_SUBTITLES[worldId];
  return copy ? triLang(lang, copy) : null;
}
