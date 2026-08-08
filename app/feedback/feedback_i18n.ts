/**
 * feedback_i18n — локализация строк FeedbackKit (спек §10.4).
 *
 * Отдельный модуль намеренно: общие словари (constants/i18n, constants/theme)
 * правит сессия переводов — сюда FK кладёт СВОИ строки в том же формате triLang
 * (все активные языки интерфейса, как у соседних строк экранов). Никаких сырых
 * кириллических литералов в компонентах — они читают тексты отсюда или из props.
 */
import { triLang, type Lang } from '../../constants/i18n';

/** Подпись тумблера «Звуки эффектов» в настройках. */
export function uiSoundsLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Звуки эффектов',
    uk: 'Звуки ефектів',
    es: 'Sonidos de efectos',
    'pt-BR': 'Sons de efeitos',
    vi: 'Âm thanh hiệu ứng',
    id: 'Suara efek',
    tr: 'Efekt sesleri',
    pl: 'Dźwięki efektów',
  });
}

/** Подзаголовок тумблера «Звуки эффектов». */
export function uiSoundsSub(lang: Lang): string {
  return triLang(lang, {
    ru: 'Ответы, награды и системные сигналы',
    uk: 'Відповіді, нагороди та системні сигнали',
    es: 'Respuestas, recompensas y señales del sistema',
    'pt-BR': 'Respostas, recompensas e sinais do sistema',
    vi: 'Câu trả lời, phần thưởng và tín hiệu hệ thống',
    id: 'Jawaban, hadiah, dan sinyal sistem',
    tr: 'Yanıtlar, ödüller ve sistem sinyalleri',
    pl: 'Odpowiedzi, nagrody i sygnały systemowe',
  });
}

export function voiceOutLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Озвучивание',
    uk: 'Озвучення',
    es: 'Voz',
    'pt-BR': 'Voz',
    vi: 'Đọc thành tiếng',
    id: 'Suara',
    tr: 'Seslendirme',
    pl: 'Odczytywanie',
  });
}

export function voiceOutSub(lang: Lang): string {
  return triLang(lang, {
    ru: 'Произношение слов и фраз',
    uk: 'Вимова слів і фраз',
    es: 'Pronunciación de palabras y frases',
    'pt-BR': 'Pronúncia de palavras e frases',
    vi: 'Phát âm từ và cụm từ',
    id: 'Pelafalan kata dan frasa',
    tr: 'Kelime ve ifadelerin telaffuzu',
    pl: 'Wymowa słów i zwrotów',
  });
}

/** Подписи уровней серии (Искра/Молния/Гроза) — для кольца/оверлеев. */
export function comboLevelLabel(lang: Lang, level: 1 | 2 | 3): string {
  if (level === 1) {
    return triLang(lang, {
      ru: 'Искра',
      uk: 'Іскра',
      es: 'Chispa',
      'pt-BR': 'Faísca',
      vi: 'Tia lửa',
      id: 'Percikan',
      tr: 'Kıvılcım',
      pl: 'Iskra',
    });
  }
  if (level === 2) {
    return triLang(lang, {
      ru: 'Молния',
      uk: 'Блискавка',
      es: 'Rayo',
      'pt-BR': 'Raio',
      vi: 'Tia chớp',
      id: 'Petir',
      tr: 'Şimşek',
      pl: 'Błyskawica',
    });
  }
  return triLang(lang, {
    ru: 'Гроза',
    uk: 'Гроза',
    es: 'Tormenta',
    'pt-BR': 'Tempestade',
    vi: 'Giông bão',
    id: 'Badai',
    tr: 'Fırtına',
    pl: 'Burza',
  });
}

// ── Заголовки/подзаголовки VictoryBurst под-режимов урока (спек §2.1, Волна 2) ──
// Все параметризованные (число слов, формы глагола) собираются здесь, чтобы в
// экранах не было сырых строк — только импорт этих функций.

/** VictoryBurst «Слова закреплены» — финал сессии Training (lesson_words). */
export function wordsSessionDoneTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Слова закреплены',
    uk: 'Слова закріплені',
    es: 'Palabras fijadas',
    'pt-BR': 'Palavras fixadas',
    vi: 'Đã ghi nhớ từ',
    id: 'Kata dikuasai',
    tr: 'Kelimeler pekişti',
    pl: 'Słowa utrwalone',
  });
}

/** Подзаголовок финала Training: сколько слов освоено за сессию (count из N). */
export function wordsSessionDoneSubtitle(lang: Lang, learned: number, total: number): string {
  return triLang(lang, {
    ru: `Освоено слов: ${learned} из ${total}`,
    uk: `Опановано слів: ${learned} з ${total}`,
    es: `Palabras dominadas: ${learned} de ${total}`,
    'pt-BR': `Palavras dominadas: ${learned} de ${total}`,
    vi: `Từ đã thành thạo: ${learned}/${total}`,
    id: `Kata dikuasai: ${learned} dari ${total}`,
    tr: `Öğrenilen kelime: ${learned} / ${total}`,
    pl: `Opanowane słowa: ${learned} z ${total}`,
  });
}

/** VictoryBurst «Глагол освоен» — проход глагола в LearnTab (irregular verbs). */
export function verbLearnedDoneTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Глагол освоен',
    uk: 'Дієслово опановано',
    es: 'Verbo dominado',
    'pt-BR': 'Verbo dominado',
    vi: 'Đã thành thạo động từ',
    id: 'Kata kerja dikuasai',
    tr: 'Fiil öğrenildi',
    pl: 'Czasownik opanowany',
  });
}

/** Подзаголовок «глагол освоен»: base–past–part (три формы через тире). */
export function verbFormsSubtitle(base: string, past: string, part: string): string {
  return `${base} – ${past} – ${part}`;
}

/** VictoryBurst «Предлоги отработаны» — финал прогона (preposition drill). */
export function prepDrillDoneTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Предлоги отработаны',
    uk: 'Прийменники відпрацьовані',
    es: 'Preposiciones repasadas',
    'pt-BR': 'Preposições praticadas',
    vi: 'Đã luyện xong giới từ',
    id: 'Preposisi selesai dilatih',
    tr: 'Edatlar çalışıldı',
    pl: 'Przyimki przećwiczone',
  });
}

/** Подзаголовок финала предлогов: точность прогона (правильные из всех). */
export function prepDrillDoneSubtitle(lang: Lang, correct: number, total: number): string {
  return triLang(lang, {
    ru: `Точность: ${correct} из ${total}`,
    uk: `Точність: ${correct} з ${total}`,
    es: `Precisión: ${correct} de ${total}`,
    'pt-BR': `Precisão: ${correct} de ${total}`,
    vi: `Độ chính xác: ${correct}/${total}`,
    id: `Akurasi: ${correct} dari ${total}`,
    tr: `Doğruluk: ${correct} / ${total}`,
    pl: `Dokładność: ${correct} z ${total}`,
  });
}

/** VictoryBurst «Глава закрыта» — достижение конца раздела теории (lesson_help). */
export function theoryChapterDoneTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Глава закрыта',
    uk: 'Розділ закрито',
    es: 'Capítulo cerrado',
    'pt-BR': 'Capítulo concluído',
    vi: 'Đã xong chương',
    id: 'Bab selesai',
    tr: 'Bölüm tamamlandı',
    pl: 'Rozdział zamknięty',
  });
}

/** Подзаголовок «глава закрыта» — короткое поощрение (без записи прогресса). */
export function theoryChapterDoneSubtitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Правило разобрано — идём практиковать',
    uk: 'Правило розібране — йдемо практикувати',
    es: 'Regla entendida — a practicar',
    'pt-BR': 'Regra entendida — vamos praticar',
    vi: 'Đã hiểu quy tắc — cùng luyện tập',
    id: 'Aturan dipahami — ayo berlatih',
    tr: 'Kural anlaşıldı — pratiğe geçelim',
    pl: 'Zasada zrozumiana — czas na praktykę',
  });
}
