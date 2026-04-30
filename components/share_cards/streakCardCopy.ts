export type ShareCardLang = 'ru' | 'uk' | 'es';

export function getStreakCardCopy(lang: ShareCardLang) {
  if (lang === 'uk') {
    return {
      series: 'Серія занять',
      daysLine: 'днів поспіль',
      tagline: 'Вчи англійську кожен день',
    };
  }
  if (lang === 'es') {
    return {
      series: 'Racha',
      daysLine: 'días seguidos',
      tagline: 'Practica inglés cada día',
    };
  }
  return {
    series: 'Серия занятий',
    daysLine: 'дней подряд',
    tagline: 'Учи английский каждый день',
  };
}
