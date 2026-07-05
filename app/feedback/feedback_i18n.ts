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
    ru: 'Клики, верно/ошибка, награды',
    uk: 'Кліки, правильно/помилка, нагороди',
    es: 'Clics, acierto/error, recompensas',
    'pt-BR': 'Cliques, acerto/erro, recompensas',
    vi: 'Nhấp, đúng/sai, phần thưởng',
    id: 'Klik, benar/salah, hadiah',
    tr: 'Tıklamalar, doğru/yanlış, ödüller',
    pl: 'Kliknięcia, poprawnie/błąd, nagrody',
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
