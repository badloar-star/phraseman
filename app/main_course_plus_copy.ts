import type { Lang } from '../constants/i18n';

export const MAIN_COURSE_PLUS_TITLE: Record<Lang, string> = {
  ru: 'Больше возможностей с Plus', uk: 'Більше можливостей із Plus',
  en: 'More ways to learn with Plus', es: 'Más opciones con Plus',
  'pt-BR': 'Mais possibilidades com o Plus', vi: 'Thêm lựa chọn học với Plus',
  id: 'Lebih banyak pilihan dengan Plus', tr: 'Plus ile daha fazla seçenek',
  pl: 'Więcej możliwości z Plus',
};

export const MAIN_COURSE_PLUS_DESCRIPTION: Record<Lang, string> = {
  ru: 'Первые три урока доступны бесплатно. С Plus первые уроки A1, A2, B1 и B2 доступны сразу, остальные открываются по порядку.',
  uk: 'Перші три уроки доступні безкоштовно. З Plus перші уроки A1, A2, B1 і B2 доступні одразу, решта відкривається по черзі.',
  en: 'The first three lessons are free. With Plus, the first A1, A2, B1, and B2 lessons are available immediately; the rest unlock in order.',
  es: 'Las tres primeras lecciones son gratis. Con Plus, la primera lección de A1, A2, B1 y B2 está disponible de inmediato; las demás se abren en orden.',
  'pt-BR': 'As três primeiras lições são grátis. Com o Plus, a primeira lição de A1, A2, B1 e B2 fica disponível de imediato; as demais abrem em ordem.',
  vi: 'Ba bài học đầu tiên được miễn phí. Với Plus, bài đầu của A1, A2, B1 và B2 có sẵn ngay; các bài còn lại mở theo thứ tự.',
  id: 'Tiga pelajaran pertama gratis. Dengan Plus, pelajaran pertama A1, A2, B1, dan B2 langsung tersedia; sisanya terbuka berurutan.',
  tr: 'İlk üç ders ücretsizdir. Plus ile A1, A2, B1 ve B2’nin ilk dersleri hemen açılır; diğerleri sırayla açılır.',
  pl: 'Pierwsze trzy lekcje są bezpłatne. Z Plus pierwsze lekcje A1, A2, B1 i B2 są dostępne od razu, a pozostałe odblokowują się po kolei.',
};

export const MAIN_COURSE_PLUS_BENEFITS: Record<Lang, string>[] = [
  { ru: 'Разговорная практика', uk: 'Розмовна практика', en: 'Speaking practice', es: 'Práctica oral', 'pt-BR': 'Prática de conversação', vi: 'Luyện nói', id: 'Latihan berbicara', tr: 'Konuşma pratiği', pl: 'Ćwiczenie mówienia' },
  { ru: 'Безлимитная энергия', uk: 'Безлімітна енергія', en: 'Unlimited energy', es: 'Energía ilimitada', 'pt-BR': 'Energia ilimitada', vi: 'Năng lượng không giới hạn', id: 'Energi tanpa batas', tr: 'Sınırsız enerji', pl: 'Nielimitowana energia' },
  { ru: 'Подробная статистика', uk: 'Докладна статистика', en: 'Detailed statistics', es: 'Estadísticas detalladas', 'pt-BR': 'Estatísticas detalhadas', vi: 'Thống kê chi tiết', id: 'Statistik terperinci', tr: 'Ayrıntılı istatistikler', pl: 'Szczegółowe statystyki' },
];

export default function __RouteShim() { return null; }
