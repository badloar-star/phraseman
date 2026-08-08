import { triLang, type Lang } from '../constants/i18n';
import type { LevelExamLevel } from './level_exam_types';

type IntroArgs = {
  level: LevelExamLevel;
  firstLesson: number;
  lastLesson: number;
  durationMinutes: number;
  energyCost: number;
  bestScore: number | null;
};

export type LevelExamCopy = {
  title: string;
  lead: string;
  lessonRange: string;
  passGoal: string;
  duration: string;
  formatsLabel: string;
  formats: readonly [string, string, string, string, string];
  startCta: string;
  bestResult: string;
  firstPassReward: string;
  energyMissing: string;
};

const formatNames = {
  ru: ['Контекст', 'Сборка фраз', 'Смысл', 'Поиск ошибки', 'Быстрые пары'],
  uk: ['Контекст', 'Складання фраз', 'Значення', 'Пошук помилки', 'Швидкі пари'],
  es: ['Contexto', 'Construir frases', 'Significado', 'Detectar el error', 'Pares rápidos'],
  'pt-BR': ['Contexto', 'Montar frases', 'Significado', 'Encontrar o erro', 'Pares rápidos'],
  vi: ['Ngữ cảnh', 'Ghép câu', 'Ý nghĩa', 'Tìm lỗi', 'Ghép cặp nhanh'],
  id: ['Konteks', 'Susun frasa', 'Makna', 'Temukan kesalahan', 'Pasangan cepat'],
  tr: ['Bağlam', 'Cümle kurma', 'Anlam', 'Hatayı bul', 'Hızlı eşleştirme'],
  pl: ['Kontekst', 'Układanie zdań', 'Znaczenie', 'Znajdź błąd', 'Szybkie pary'],
} as const;

export function getLevelExamCopy(lang: Lang, args: IntroArgs): LevelExamCopy {
  const { level, firstLesson, lastLesson, durationMinutes, energyCost, bestScore } = args;
  const formats = triLang(lang, formatNames) as LevelExamCopy['formats'];

  return {
    title: triLang(lang, {
      ru: `Финальная проверка ${level}`,
      uk: `Фінальна перевірка ${level}`,
      es: `Prueba final ${level}`,
      'pt-BR': `Desafio final ${level}`,
      vi: `Bài kiểm tra cuối ${level}`,
      id: `Ujian akhir ${level}`,
      tr: `${level} final kontrolü`,
      pl: `Sprawdzian końcowy ${level}`,
    }),
    lead: triLang(lang, {
      ru: 'Покажи, как уверенно ты используешь темы этого уровня в живых фразах.',
      uk: 'Покажи, наскільки впевнено ти використовуєш теми цього рівня в живих фразах.',
      es: 'Demuestra cómo usas los temas de este nivel en frases reales.',
      'pt-BR': 'Mostre como você usa os temas deste nível em frases reais.',
      vi: 'Hãy thể hiện cách bạn dùng các chủ đề của cấp độ này trong câu thực tế.',
      id: 'Tunjukkan bagaimana kamu memakai topik level ini dalam frasa nyata.',
      tr: 'Bu seviyedeki konuları gerçek cümlelerde ne kadar iyi kullandığını göster.',
      pl: 'Pokaż, jak swobodnie używasz tematów z tego poziomu w prawdziwych zdaniach.',
    }),
    lessonRange: triLang(lang, {
      ru: `Уроки ${firstLesson}–${lastLesson}`,
      uk: `Уроки ${firstLesson}–${lastLesson}`,
      es: `Lecciones ${firstLesson}–${lastLesson}`,
      'pt-BR': `Lições ${firstLesson}–${lastLesson}`,
      vi: `Bài ${firstLesson}–${lastLesson}`,
      id: `Pelajaran ${firstLesson}–${lastLesson}`,
      tr: `${firstLesson}–${lastLesson}. dersler`,
      pl: `Lekcje ${firstLesson}–${lastLesson}`,
    }),
    passGoal: triLang(lang, {
      ru: '21 правильный ответ из 30',
      uk: '21 правильна відповідь із 30',
      es: '21 respuestas correctas de 30',
      'pt-BR': '21 respostas corretas de 30',
      vi: '21 câu đúng trong 30',
      id: '21 jawaban benar dari 30',
      tr: '30 sorudan 21 doğru',
      pl: '21 poprawnych odpowiedzi z 30',
    }),
    duration: triLang(lang, {
      ru: `${durationMinutes} минут`,
      uk: `${durationMinutes} хвилин`,
      es: `${durationMinutes} minutos`,
      'pt-BR': `${durationMinutes} minutos`,
      vi: `${durationMinutes} phút`,
      id: `${durationMinutes} menit`,
      tr: `${durationMinutes} dakika`,
      pl: `${durationMinutes} minut`,
    }),
    formatsLabel: triLang(lang, {
      ru: 'Что будет внутри',
      uk: 'Що буде всередині',
      es: 'Qué encontrarás',
      'pt-BR': 'O que você encontrará',
      vi: 'Nội dung bài kiểm tra',
      id: 'Yang akan diujikan',
      tr: 'Seni neler bekliyor',
      pl: 'Co znajdziesz w środku',
    }),
    formats,
    startCta: triLang(lang, {
      ru: `Начать проверку −${energyCost} ⚡`,
      uk: `Почати перевірку −${energyCost} ⚡`,
      es: `Empezar prueba −${energyCost} ⚡`,
      'pt-BR': `Começar desafio −${energyCost} ⚡`,
      vi: `Bắt đầu −${energyCost} ⚡`,
      id: `Mulai ujian −${energyCost} ⚡`,
      tr: `Kontrolü başlat −${energyCost} ⚡`,
      pl: `Rozpocznij −${energyCost} ⚡`,
    }),
    bestResult: bestScore === null
      ? triLang(lang, {
        ru: 'Лучший результат сохранится', uk: 'Найкращий результат збережеться',
        es: 'Guardaremos tu mejor resultado', 'pt-BR': 'Seu melhor resultado será salvo',
        vi: 'Kết quả tốt nhất sẽ được lưu', id: 'Hasil terbaikmu akan disimpan',
        tr: 'En iyi sonucun kaydedilir', pl: 'Zapiszemy Twój najlepszy wynik',
      })
      : triLang(lang, {
        ru: `Лучший результат: ${bestScore}/30`, uk: `Найкращий результат: ${bestScore}/30`,
        es: `Mejor resultado: ${bestScore}/30`, 'pt-BR': `Melhor resultado: ${bestScore}/30`,
        vi: `Kết quả tốt nhất: ${bestScore}/30`, id: `Hasil terbaik: ${bestScore}/30`,
        tr: `En iyi sonuç: ${bestScore}/30`, pl: `Najlepszy wynik: ${bestScore}/30`,
      }),
    firstPassReward: triLang(lang, {
      ru: 'За первое успешное прохождение — 1 спин',
      uk: 'За перше успішне проходження — 1 спін',
      es: 'Por aprobar por primera vez: 1 giro',
      'pt-BR': 'Na primeira aprovação: 1 giro',
      vi: 'Vượt qua lần đầu: 1 lượt quay',
      id: 'Lulus pertama kali: 1 spin',
      tr: 'İlk başarılı tamamlamada: 1 çevirme',
      pl: 'Za pierwsze zaliczenie: 1 obrót',
    }),
    energyMissing: triLang(lang, {
      ru: 'Не хватает энергии для начала', uk: 'Недостатньо енергії для початку',
      es: 'No tienes energía suficiente', 'pt-BR': 'Energia insuficiente para começar',
      vi: 'Không đủ năng lượng để bắt đầu', id: 'Energi tidak cukup untuk memulai',
      tr: 'Başlamak için yeterli enerjin yok', pl: 'Za mało energii, aby rozpocząć',
    }),
  };
}
