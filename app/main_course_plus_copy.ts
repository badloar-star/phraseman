import type { Lang } from '../constants/i18n';

export const MAIN_COURSE_PLUS_TITLE: Record<Lang, string> = {
  ru: 'Больше возможностей с Plus', uk: 'Більше можливостей із Plus',
  en: 'More ways to learn with Plus', es: 'Más opciones con Plus',
  'pt-BR': 'Mais possibilidades com o Plus', vi: 'Thêm lựa chọn học với Plus',
  id: 'Lebih banyak pilihan dengan Plus', tr: 'Plus ile daha fazla seçenek',
  pl: 'Więcej możliwości z Plus',
};

export const MAIN_COURSE_PLUS_DESCRIPTION: Record<Lang, string> = {
  ru: 'Все 32 основных урока бесплатны. Plus добавляет возможности для практики и персонализации.',
  uk: 'Усі 32 основні уроки безкоштовні. Plus додає можливості для практики та персоналізації.',
  en: 'All 32 main lessons are free. Plus adds practice and personalization options.',
  es: 'Las 32 lecciones principales son gratis. Plus añade opciones de práctica y personalización.',
  'pt-BR': 'As 32 lições principais são grátis. O Plus adiciona opções de prática e personalização.',
  vi: 'Cả 32 bài học chính đều miễn phí. Plus bổ sung các lựa chọn luyện tập và cá nhân hóa.',
  id: 'Semua 32 pelajaran utama gratis. Plus menambahkan pilihan latihan dan personalisasi.',
  tr: '32 ana dersin tamamı ücretsiz. Plus ek pratik ve kişiselleştirme seçenekleri sunar.',
  pl: 'Wszystkie 32 główne lekcje są bezpłatne. Plus dodaje opcje ćwiczeń i personalizacji.',
};

export const MAIN_COURSE_PLUS_BENEFITS: Record<Lang, string>[] = [
  { ru: 'Разговорная практика', uk: 'Розмовна практика', en: 'Speaking practice', es: 'Práctica oral', 'pt-BR': 'Prática de conversação', vi: 'Luyện nói', id: 'Latihan berbicara', tr: 'Konuşma pratiği', pl: 'Ćwiczenie mówienia' },
  { ru: 'Безлимитная энергия', uk: 'Безлімітна енергія', en: 'Unlimited energy', es: 'Energía ilimitada', 'pt-BR': 'Energia ilimitada', vi: 'Năng lượng không giới hạn', id: 'Energi tanpa batas', tr: 'Sınırsız enerji', pl: 'Nielimitowana energia' },
  { ru: 'Подробная статистика', uk: 'Докладна статистика', en: 'Detailed statistics', es: 'Estadísticas detalladas', 'pt-BR': 'Estatísticas detalhadas', vi: 'Thống kê chi tiết', id: 'Statistik terperinci', tr: 'Ayrıntılı istatistikler', pl: 'Szczegółowe statystyki' },
];

export default function __RouteShim() { return null; }
