import type { Lang } from '../constants/i18n';

// зачем (владелец, 2026-09-22): прежний текст объяснял, что человек уже получил
// бесплатно, и называл уровни A1/A2/B1/B2 — внутреннюю терминологию, которую
// начинающий не знает. Плюс экран открывается не только после упора в замок
// (есть софт-апселл после урока), поэтому ни одна фраза не утверждает, что
// что-то «закончилось» или «позади». Последняя строка показывает, что подписка
// открывает не один курс, а всё приложение.
export const MAIN_COURSE_PLUS_TITLE: Record<Lang, string> = {
  ru: 'Продолжим курс?', uk: 'Продовжимо курс?',
  en: 'Ready for the rest of the course?', es: '¿Seguimos con el curso?',
  'pt-BR': 'Vamos continuar o curso?', vi: 'Học tiếp khóa học nhé?',
  id: 'Lanjut ke sisa kursus?', tr: 'Kursa devam edelim mi?',
  pl: 'Kontynuujemy kurs?',
};

export const MAIN_COURSE_PLUS_DESCRIPTION: Record<Lang, string> = {
  ru: 'Впереди ещё двадцать девять уроков — от простых фраз до свободного разговора. А вместе с ними открывается и всё остальное: разговоры вслух, тренировки без счётчика, своя коллекция фраз и статистика.',
  uk: 'Попереду ще двадцять дев’ять уроків — від простих фраз до вільної розмови. А разом із ними відкривається і все інше: розмови вголос, тренування без лічильника, власна колекція фраз і статистика.',
  en: 'Twenty-nine more lessons ahead — from simple phrases to free conversation. And everything else opens up with them: speaking out loud, training without a daily counter, your own phrase collection and statistics.',
  es: 'Quedan veintinueve lecciones más: de las frases simples a la conversación libre. Y con ellas se abre todo lo demás: hablar en voz alta, entrenamientos sin contador, tu propia colección de frases y estadísticas.',
  'pt-BR': 'Faltam mais vinte e nove lições — das frases simples à conversa livre. E junto com elas abre tudo o mais: falar em voz alta, treinos sem contador diário, sua coleção de frases e estatísticas.',
  vi: 'Còn hai mươi chín bài học nữa — từ câu đơn giản đến trò chuyện tự nhiên. Và mọi thứ khác cũng mở ra cùng lúc: nói thành tiếng, luyện tập không giới hạn lượt, bộ sưu tập cụm từ của riêng bạn và thống kê.',
  id: 'Masih ada dua puluh sembilan pelajaran — dari frasa sederhana sampai percakapan bebas. Dan semua yang lain ikut terbuka: bicara lantang, latihan tanpa penghitung harian, koleksi frasamu sendiri, dan statistik.',
  tr: 'Önünde yirmi dokuz ders daha var — basit ifadelerden serbest konuşmaya. Ve onlarla birlikte gerisi de açılıyor: sesli konuşma, günlük sayaç olmadan antrenman, kendi ifade koleksiyonun ve istatistikler.',
  pl: 'Przed tobą jeszcze dwadzieścia dziewięć lekcji — od prostych zwrotów po swobodną rozmowę. A razem z nimi otwiera się cała reszta: mówienie na głos, treningi bez licznika, własna kolekcja zwrotów i statystyki.',
};

export const MAIN_COURSE_PLUS_BENEFITS: Record<Lang, string>[] = [
  { ru: 'Весь курс целиком', uk: 'Увесь курс цілком', en: 'The whole course', es: 'El curso completo', 'pt-BR': 'O curso inteiro', vi: 'Trọn bộ khóa học', id: 'Seluruh kursus', tr: 'Kursun tamamı', pl: 'Cały kurs' },
  { ru: 'Разговорная практика вслух', uk: 'Розмовна практика вголос', en: 'Speaking practice out loud', es: 'Práctica oral en voz alta', 'pt-BR': 'Prática de fala em voz alta', vi: 'Luyện nói thành tiếng', id: 'Latihan berbicara lantang', tr: 'Sesli konuşma pratiği', pl: 'Ćwiczenie mówienia na głos' },
  { ru: 'Занятия без ожидания энергии', uk: 'Заняття без очікування енергії', en: 'Study without waiting for energy', es: 'Estudia sin esperar energía', 'pt-BR': 'Estude sem esperar energia', vi: 'Học mà không cần chờ năng lượng', id: 'Belajar tanpa menunggu energi', tr: 'Enerji beklemeden çalışma', pl: 'Nauka bez czekania na energię' },
];

export default function __RouteShim() { return null; }
