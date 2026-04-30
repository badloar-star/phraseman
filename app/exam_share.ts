import type { Lang } from '../constants/i18n';

function pickRandom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

/** Языки шеринговых подписей: совпадает с приложением ru / uk / es. */
type ShareExamLang = Extract<Lang, 'ru' | 'uk' | 'es'>;

/**
 * Text fallback for exam share; pool matches previous inline copy in `exam.tsx`.
 */
export function buildExamShareMessage(
  lang: ShareExamLang,
  score: number,
  total: number,
  pct: number,
  storeUrl: string,
): string {
  const variantsRu = [
    `Я сделал это! Экзамен в Phraseman сдан на ${score}/${total}. Теперь я официально опасен для носителей языка! 🎓🔥`,
    `${pct}% успеха на экзамене! Phraseman подтверждает: мой английский — не миф, а реальность. 🎓🎯`,
    `Выдохнули! Экзамен в Phraseman позади (${score}/${total}). Теперь можно и отдохнуть (но недолго). 🏆🥤`,
    `Экзамен в Phraseman сдан! ${pct}% — это вам не шутки. Мой английский официально вышел из чата «ничего не понимаю». 🎓`,
    `Свободу попугаям и мне! 🎓 Сдал экзамен в Phraseman на ${score}/${total}. Я просто космос! 🌌`,
    `Mission Accomplished. 🎓 Экзамен в Phraseman пройден на ${pct}%. Уровень английского: «Почти Шекспир».`,
    `Я сделал это! Экзамен в Phraseman сдан на ${pct}%. 🎓 Теперь я официально крут в английском! 🥳`,
    `Сдал экзамен в Phraseman: ${score}/${total}. 🎓 Мои старания окупились! Всем шампанского (или чая)! ☕️🥂`,
    `Экзаменационный барьер взят! 🎓 ${pct}% правильных ответов в Phraseman. Уровень мастерства зашкаливает! 🎯`,
  ];
  const variantsUk = [
    `Я зробив це! Іспит у Phraseman складено на ${score}/${total}. Тепер я офіційно небезпечний для носіїв мови! 🎓🔥`,
    `${pct}% успіху на іспиті! Phraseman підтверджує: моя англійська — не міф, а реальність. 🎓🎯`,
    `Видихнули! Іспит у Phraseman позаду (${score}/${total}). Тепер можна і відпочити (але недовго). 🏆🥤`,
    `Іспит у Phraseman складено! ${pct}% — це вам не жарти. Моя англійська офіційно вийшла з чату «нічого не розумію». 🎓`,
    `Свободу папугам і мені! 🎓 Склав іспит у Phraseman на ${score}/${total}. Я просто космос! 🌌`,
    `Mission Accomplished. 🎓 Іспит у Phraseman пройдено на ${pct}%. Рівень англійської: «Майже Шекспір».`,
    `Я зробив це! Іспит у Phraseman складено на ${pct}%. 🎓 Тепер я офіційно крутий в англійській! 🥳`,
    `Склав іспит у Phraseman: ${score}/${total}. 🎓 Мої старання окупилися! Усім шампанського (або чаю)! ☕️🥂`,
    `Іспитовий бар'єр взято! 🎓 ${pct}% правильних відповідей у Phraseman. Рівень майстерності зашкалює! 🎯`,
  ];
  const variantsEs = [
    `¡Lo logré! Aprobé el examen en Phraseman: ${score}/${total}. ¡Ahora sí que pueden preocuparse los nativos! 🎓🔥`,
    `¡${pct}% en el examen! Phraseman lo confirma: mi inglés no es un mito, es realidad. 🎓🎯`,
    `¡Uf, hecho! Superé el examen en Phraseman (${score}/${total}). Ya me lo merecía, un descansito (aunque sea poco). 🏆🥤`,
    `¡Examen de Phraseman aprobado! Un ${pct}% — nada mal. Mi inglés ya no se queda solo en «no entiendo nada». 🎓`,
    `¡Libertad para los loros… y para mí! 🎓 Aprobé el examen en Phraseman: ${score}/${total}. ¡Todo un astro! 🌌`,
    `Misión cumplida. 🎓 Examen de Phraseman: ${pct}%. Mi inglés, nivel «casi Shakespeare».`,
    `¡Lo hice! Aprobé el examen en Phraseman con un ${pct}%. 🎓 Ya estoy oficialmente en modo pro del inglés. 🥳`,
    `Examen de Phraseman: ${score}/${total}. 🎓 ¡El esfuerzo mereció la pena! Un brindis (o un té). ☕️🥂`,
    `¡Barrera superada! 🎓 ${pct}% de aciertos en Phraseman: el nivel no para de subir. 🎯`,
  ];
  const pool = lang === 'uk' ? variantsUk : lang === 'es' ? variantsEs : variantsRu;
  return `${pickRandom(pool)}\n${storeUrl}`;
}

/**
 * Подпись к шерингу карточки-награды (`LingmanCertificateSvg`).
 *
 * Тексты сознательно НЕ содержат слов «сертификат» / «диплом» / «академия» /
 * «выпускник» — это игровая награда приложения, а не официальная
 * квалификация (см. footer disclaimer на самой карточке).
 */
export function buildCertificateShareMessage(
  lang: ShareExamLang,
  name: string,
  pct: number,
  storeUrl: string,
): string {
  const cleanName = (name || '').trim();
  const variantsRu = [
    cleanName
      ? `${cleanName} достиг(ла) уровня B2 в Phraseman! 🎯 ${pct}% на финальном тесте.`
      : `Уровень B2 в Phraseman взят! 🎯 ${pct}% на финальном тесте.`,
    cleanName
      ? `${cleanName} прошёл(ла) финальный тест Phraseman на ${pct}%. 🏆 Уровень B2 — есть!`
      : `Финальный тест Phraseman пройден на ${pct}%. 🏆 Уровень B2 — есть!`,
    cleanName
      ? `${cleanName} — мой английский на уровне B2 по Phraseman! 🎯 Результат: ${pct}%.`
      : `Мой английский на уровне B2 по Phraseman! 🎯 Результат: ${pct}%.`,
  ];
  const variantsUk = [
    cleanName
      ? `${cleanName} досяг(ла) рівня B2 у Phraseman! 🎯 ${pct}% на фінальному тесті.`
      : `Рівень B2 у Phraseman взято! 🎯 ${pct}% на фінальному тесті.`,
    cleanName
      ? `${cleanName} пройшов(ла) фінальний тест Phraseman на ${pct}%. 🏆 Рівень B2 — є!`
      : `Фінальний тест Phraseman пройдено на ${pct}%. 🏆 Рівень B2 — є!`,
    cleanName
      ? `${cleanName} — моя англійська на рівні B2 за Phraseman! 🎯 Результат: ${pct}%.`
      : `Моя англійська на рівні B2 за Phraseman! 🎯 Результат: ${pct}%.`,
  ];
  const variantsEs = [
    cleanName
      ? `¡${cleanName} ha alcanzado el nivel B2 en Phraseman! 🎯 ${pct}% en la prueba final.`
      : `¡Nivel B2 en Phraseman conseguido! 🎯 ${pct}% en la prueba final.`,
    cleanName
      ? `${cleanName} completó la prueba final de Phraseman (${pct}%). 🏆 ¡B2 asegurado!`
      : `Prueba final en Phraseman: ${pct}%. 🏆 Nivel B2 conseguido.`,
    cleanName
      ? `${cleanName}: mi inglés está a nivel B2 según Phraseman. 🎯 Resultado: ${pct}%.`
      : `Mi inglés está a nivel B2 según Phraseman. 🎯 Resultado: ${pct}%.`,
  ];
  const pool = lang === 'uk' ? variantsUk : lang === 'es' ? variantsEs : variantsRu;
  return `${pickRandom(pool)}\n${storeUrl}`;
}
