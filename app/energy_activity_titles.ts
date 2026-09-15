/**
 * Названия занятий для окна «Недостаточно энергии».
 *
 * зачем (владелец 2026-09-15): «когда в диалоге закончилась энергия, модал
 * говорит… экзамен требует 20! какого хуй экзамен!!! исправь все тексты на
 * модалах чтобы они все соответствовали разделу».
 *
 * Корень дефекта: окно выбирало строку СЛУЧАЙНО из двух вариантов, и один из
 * них жёстко говорил «Экзамен требует…». Активность в окно уже приходила и
 * использовалась для ЦЕНЫ, но не для ТЕКСТА — цена была верной, а занятие
 * названо чужое.
 *
 * Карта полная по `EnergyActivityKey`: добавили активность — TypeScript
 * заставит дописать название, и «забыть» раздел нельзя. Модуль чистый (без
 * React) — проверяется тестом.
 */
import { triLang, type Lang } from '../constants/i18n';
import type { EnergyActivityKey } from './energy_contract';

/**
 * Название занятия в родительном падеже для строки вида «Для <чего> нужно 20».
 * Русский падеж — причина, по которой здесь фраза целиком, а не одно слово.
 */
export function energyActivityTitle(activity: EnergyActivityKey, lang: Lang): string {
  switch (activity) {
    case 'ai_dialog':
      return triLang(lang, {
        ru: 'разговора', uk: 'розмови', en: 'a conversation', es: 'una conversación',
        'pt-BR': 'uma conversa', vi: 'một cuộc hội thoại', id: 'sebuah percakapan',
        tr: 'bir konuşma', pl: 'rozmowy',
      });
    case 'flashcards':
      return triLang(lang, {
        ru: 'тренировки карточек', uk: 'тренування карток', en: 'a flashcard session',
        es: 'una sesión de tarjetas', 'pt-BR': 'uma sessão de cartões',
        vi: 'một buổi luyện thẻ', id: 'sesi kartu', tr: 'kart çalışması', pl: 'treningu fiszek',
      });
    case 'lesson_words':
      return triLang(lang, {
        ru: 'слов урока', uk: 'слів уроку', en: 'the lesson words', es: 'las palabras de la lección',
        'pt-BR': 'as palavras da lição', vi: 'từ vựng bài học', id: 'kosakata pelajaran',
        tr: 'ders kelimeleri', pl: 'słówek lekcji',
      });
    case 'irregular_verbs':
      return triLang(lang, {
        ru: 'неправильных глаголов', uk: 'неправильних дієслів', en: 'irregular verbs',
        es: 'los verbos irregulares', 'pt-BR': 'os verbos irregulares', vi: 'động từ bất quy tắc',
        id: 'kata kerja tak beraturan', tr: 'düzensiz fiiller', pl: 'czasowników nieregularnych',
      });
    case 'preposition_drill':
      return triLang(lang, {
        ru: 'тренажёра предлогов', uk: 'тренажера прийменників', en: 'the preposition drill',
        es: 'el ejercicio de preposiciones', 'pt-BR': 'o treino de preposições',
        vi: 'bài luyện giới từ', id: 'latihan preposisi', tr: 'edat alıştırması',
        pl: 'ćwiczenia przyimków',
      });
    case 'mistake_practice':
      return triLang(lang, {
        ru: 'работы над ошибками', uk: 'роботи над помилками', en: 'the mistake practice',
        es: 'la práctica de errores', 'pt-BR': 'a prática de erros', vi: 'buổi luyện lỗi sai',
        id: 'latihan kesalahan', tr: 'hata çalışması', pl: 'pracy nad błędami',
      });
    case 'classic_lesson':
    case 'learning_v2_session':
      return triLang(lang, {
        ru: 'урока', uk: 'уроку', en: 'a lesson', es: 'una lección', 'pt-BR': 'uma lição',
        vi: 'một bài học', id: 'sebuah pelajaran', tr: 'bir ders', pl: 'lekcji',
      });
    case 'personal_plan_exercise':
      return triLang(lang, {
        ru: 'задания плана', uk: 'завдання плану', en: 'a plan task', es: 'una tarea del plan',
        'pt-BR': 'uma tarefa do plano', vi: 'một nhiệm vụ trong kế hoạch', id: 'tugas rencana',
        tr: 'plan görevi', pl: 'zadania planu',
      });
    case 'diagnostic_test':
      return triLang(lang, {
        ru: 'теста уровня', uk: 'тесту рівня', en: 'the level test', es: 'la prueba de nivel',
        'pt-BR': 'o teste de nível', vi: 'bài kiểm tra trình độ', id: 'tes level',
        tr: 'seviye testi', pl: 'testu poziomu',
      });
    case 'level_exam':
      return triLang(lang, {
        ru: 'экзамена', uk: 'іспиту', en: 'the exam', es: 'el examen', 'pt-BR': 'o exame',
        vi: 'kỳ thi', id: 'ujian', tr: 'sınav', pl: 'egzaminu',
      });
    case 'arena_match':
      return triLang(lang, {
        ru: 'матча', uk: 'матчу', en: 'a match', es: 'un combate', 'pt-BR': 'uma partida',
        vi: 'một trận đấu', id: 'sebuah pertandingan', tr: 'bir maç', pl: 'meczu',
      });
    case 'theory':
      return triLang(lang, {
        ru: 'теории', uk: 'теорії', en: 'the theory', es: 'la teoría', 'pt-BR': 'a teoria',
        vi: 'phần lý thuyết', id: 'teori', tr: 'teori', pl: 'teorii',
      });
    case 'reading':
      return triLang(lang, {
        ru: 'чтения', uk: 'читання', en: 'reading', es: 'la lectura', 'pt-BR': 'a leitura',
        vi: 'phần đọc', id: 'bacaan', tr: 'okuma', pl: 'czytania',
      });
    case 'video':
      return triLang(lang, {
        ru: 'видео', uk: 'відео', en: 'the video', es: 'el vídeo', 'pt-BR': 'o vídeo',
        vi: 'video', id: 'video', tr: 'video', pl: 'wideo',
      });
    case 'max_call':
      return triLang(lang, {
        ru: 'урока с Максом', uk: 'уроку з Максом', en: 'a lesson with Max',
        es: 'una lección con Max', 'pt-BR': 'uma lição com Max', vi: 'buổi học với Max',
        id: 'pelajaran dengan Max', tr: "Max'la ders", pl: 'lekcji z Maxem',
      });
    default: {
      // Полнота карты держится типом: новая активность обязана получить
      // название. Этот выход существует только на случай битого значения из
      // старого кэша, и он обязан быть виден в логах.
      const exhaustive: never = activity;
      console.log('[ENERGY-TEXT] неизвестная активность, показан общий текст', String(exhaustive));
      return triLang(lang, {
        ru: 'занятия', uk: 'заняття', en: 'this activity', es: 'esta actividad',
        'pt-BR': 'esta atividade', vi: 'hoạt động này', id: 'aktivitas ini',
        tr: 'bu etkinlik', pl: 'tych zajęć',
      });
    }
  }
}

/**
 * Полная строка окна: «Для разговора нужно 20 ⚡. У тебя: 5. Plus и Pro
 * открывают безлимит.» Никакого случайного выбора — раздел определяет текст.
 */
export function energyGateMessage(
  activity: EnergyActivityKey,
  lang: Lang,
  required: number,
  have: number,
): string {
  const what = energyActivityTitle(activity, lang);
  return triLang(lang, {
    ru: `Для ${what} нужно ${required} ⚡. У тебя: ${have}. Plus и Pro открывают безлимит.`,
    uk: `Для ${what} потрібно ${required} ⚡. У тебе: ${have}. Plus і Pro прибирають ліміт.`,
    en: `You need ${required} ⚡ for ${what}. You have: ${have}. Plus and Pro remove this limit.`,
    es: `Para ${what} necesitas ${required} ⚡. Tienes: ${have}. Plus y Pro eliminan este límite.`,
    'pt-BR': `Para ${what} você precisa de ${required} ⚡. Você tem: ${have}. Plus e Pro removem esse limite.`,
    vi: `Bạn cần ${required} ⚡ cho ${what}. Hiện có: ${have}. Plus và Pro gỡ giới hạn này.`,
    id: `Untuk ${what} kamu perlu ${required} ⚡. Tersedia: ${have}. Plus dan Pro menghapus batas ini.`,
    tr: `${what} için ${required} ⚡ gerekir. Sende: ${have}. Plus ve Pro bu sınırı kaldırır.`,
    pl: `Do ${what} potrzeba ${required} ⚡. Masz: ${have}. Plus i Pro znoszą ten limit.`,
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
