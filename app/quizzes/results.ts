import type { Lang } from '../../constants/i18n';

export type QuizShareLang = 'ru' | 'uk' | 'es';

export type RankInfo = {
  icon: string;
  labelRU: string;
  labelUK: string;
  labelES: string;
  color: string;
};

function pickRandom(values: string[]): string {
  return values[Math.floor(Math.random() * values.length)];
}

/** Язык шаринг-текста квиза по языку интерфейса */
export function quizShareMessageLang(lang: Lang): QuizShareLang {
  if (lang === 'uk') return 'uk';
  if (lang === 'es') return 'es';
  return 'ru';
}

export function getQuizRankInfo(pct: number, neutralColor: string, mutedColor: string): RankInfo {
  if (pct === 100) {
    return {
      icon: '🏆',
      labelRU: pickRandom(['Безупречно!', 'Идеально!', 'Гений!', 'Просто огонь! 🔥', 'Легенда!']),
      labelUK: pickRandom(['Бездоганно!', 'Ідеально!', 'Геній!', 'Просто вогонь! 🔥', 'Легенда!']),
      labelES: pickRandom([
        '¡Impecable!',
        '¡Perfecto!',
        '¡Genial!',
        '¡Qué nivel! 🔥',
        '¡Leyenda!',
      ]),
      color: '#D4A017',
    };
  }
  if (pct >= 90) {
    return {
      icon: '🥇',
      labelRU: pickRandom(['Отлично!', 'Великолепно!', 'Ты машина!', 'Так держать!', 'Мощно!']),
      labelUK: pickRandom(['Відмінно!', 'Чудово!', 'Ти машина!', 'Так тримати!', 'Потужно!']),
      labelES: pickRandom([
        '¡Excelente!',
        '¡Magnífico!',
        '¡Eres una máquina!',
        '¡Así se hace!',
        '¡Impresionante!',
      ]),
      color: '#D4A017',
    };
  }
  if (pct >= 70) {
    return {
      icon: '🥈',
      labelRU: pickRandom(['Хорошо!', 'Неплохо!', 'Молодец!', 'Растешь!', 'Продолжай!']),
      labelUK: pickRandom(['Добре!', 'Непогано!', 'Молодець!', 'Зростаєш!', 'Продовжуй!']),
      labelES: pickRandom([
        '¡Bien!',
        '¡No está mal!',
        '¡Buen trabajo!',
        '¡Vas mejorando!',
        '¡Sigue así!',
      ]),
      color: neutralColor,
    };
  }
  if (pct >= 50) {
    return {
      icon: '🥉',
      labelRU: pickRandom(['Неплохо', 'Можно лучше!', 'Еще немного!', 'Почти!']),
      labelUK: pickRandom(['Непогано', 'Можна краще!', 'Ще трохи!', 'Майже!']),
      labelES: pickRandom([
        'No está mal',
        '¡Se puede mejorar!',
        '¡Un poco más!',
        '¡Casi!',
        '¡Tú puedes!',
      ]),
      color: neutralColor,
    };
  }
  return {
    icon: '📚',
    labelRU: pickRandom(['Практикуйся!', 'Не сдавайся!', 'Повтори и попробуй снова!', 'Учимся!']),
    labelUK: pickRandom(['Тренуйся!', 'Не здавайся!', 'Повтори і спробуй знову!', 'Навчаємось!']),
    labelES: pickRandom([
      '¡Sigue practicando!',
      '¡No te rindas!',
      '¡Repasa e inténtalo de nuevo!',
      '¡A estudiar!',
    ]),
    color: mutedColor,
  };
}

/** Same tiers as getQuizRankInfo, fixed copy — share-card art must not re-roll. */
export function getQuizShareCardRank(
  pct: number,
  neutralColor: string,
  mutedColor: string,
  lang: QuizShareLang
): { icon: string; label: string; color: string } {
  if (pct === 100) {
    const label =
      lang === 'uk' ? 'Бездоганно!' : lang === 'es' ? '¡Impecable!' : 'Безупречно!';
    return { icon: '🏆', label, color: '#D4A017' };
  }
  if (pct >= 90) {
    const label =
      lang === 'uk' ? 'Відмінно!' : lang === 'es' ? '¡Excelente!' : 'Отлично!';
    return { icon: '🥇', label, color: '#D4A017' };
  }
  if (pct >= 70) {
    const label =
      lang === 'uk' ? 'Добре!' : lang === 'es' ? '¡Bien!' : 'Хорошо!';
    return { icon: '🥈', label, color: neutralColor };
  }
  if (pct >= 50) {
    const label =
      lang === 'uk' ? 'Непогано' : lang === 'es' ? 'No está mal' : 'Неплохо';
    return { icon: '🥉', label, color: neutralColor };
  }
  const label =
    lang === 'uk' ? 'Тренуйся!' : lang === 'es' ? '¡Sigue practicando!' : 'Практикуйся!';
  return { icon: '📚', label, color: mutedColor };
}

export function buildQuizShareMessage(
  lang: QuizShareLang,
  right: number,
  total: number,
  pct: number,
  rankIcon: string,
  storeUrl: string
): string {
  const variantsRu = [
    `Мой мозг официально прокачан на ${pct}%! Прошел квиз в Phraseman (${right}/${total}). Шекспир бы мной гордился. 🎩`,
    `${right} из ${total} правильных ответов! В Phraseman я просто машина. Кто рискнет побить мой рекорд? 🤖💥`,
    `Почти идеально! ${pct}% правильных в квизе Phraseman. Английский сам себя не выучит, а я - учу! ⚡️`,
    `Квиз в Phraseman пройден на ${pct}%! Мой английский прогрессирует быстрее, чем я успеваю это осознать. 🚀`,
    `${right} из ${total}. Математика говорит, что я молодец, а Phraseman подтверждает! 📊🔥`,
    `Мои нейроны только что устроили вечеринку! 🎉 Результат квиза в Phraseman - ${pct}%.`,
    `Мой IQ только что вырос на глазах! 🧠 Прошел квиз в Phraseman на ${pct}%. Кто-нибудь, дайте мне корону! 👑`,
    `Квиз уничтожен! ${right}/${total} правильных в Phraseman. 🤖 Я просто машина по переводу текстов!`,
    `${pct}% успеха в квизе Phraseman! 🎯 Мой английский передает всем привет.`,
    `Прошел квиз в Phraseman - ${right}/${total} (${pct}%) ${rankIcon}`,
  ];
  const variantsUk = [
    `Мій мозок офіційно прокачаний на ${pct}%! Пройшов квіз у Phraseman (${right}/${total}). Шекспір би мною пишався. 🎩`,
    `${right} із ${total} правильних відповідей! У Phraseman я просто машина. Хто ризикне побити мій рекорд? 🤖💥`,
    `Майже ідеально! ${pct}% правильних у квізі Phraseman. Англійська сама себе не вивчить, а я - вчу! ⚡️`,
    `Квіз у Phraseman пройдено на ${pct}%! Моя англійська прогресує швидше, ніж я встигаю це усвідомити. 🚀`,
    `${right} із ${total}. Математика каже, що я молодець, а Phraseman підтверджує! 📊🔥`,
    `Мої нейрони щойно влаштували вечірку! 🎉 Результат квізу у Phraseman - ${pct}%.`,
    `Мій IQ щойно виріс на очах! 🧠 Пройшов квіз у Phraseman на ${pct}%. Хто-небудь, дайте мені корону! 👑`,
    `Квіз знищено! ${right}/${total} правильних у Phraseman. 🤖 Я просто машина з перекладу текстів!`,
    `${pct}% успіху у квізі Phraseman! 🎯 Моя англійська передає всім привіт.`,
    `Пройшов квіз у Phraseman - ${right}/${total} (${pct}%) ${rankIcon}`,
  ];
  const variantsEs = [
    `¡${pct}% en Phraseman (${right}/${total})! Hasta Shakespeare estaría orgulloso de mí. 🎩`,
    `¡${right} de ${total} correctas! En Phraseman voy imbatible. ¿Quién se atreve a superarme? 🤖💥`,
    `¡Casi perfecto! ${pct}% de aciertos en el cuestionario de Phraseman. El inglés no se aprende solo: sigo practicando. ⚡️`,
    `Cuestionario de Phraseman al ${pct}%: mi inglés avanza más rápido de lo que creo. 🚀`,
    `${right} de ${total}. Las cuentas cuadran: voy bien y Phraseman lo confirma. 📊🔥`,
    `¡Fiesta en las neuronas! 🎉 Resultado en Phraseman: ${pct}%.`,
    `¡Subidón de IQ! Cuestionario de Phraseman al ${pct}%. ¡Dame la corona! 👑`,
    `¡Cuestionario completado! ${right}/${total} en Phraseman. 🤖`,
    `¡${pct}% en Phraseman! 🎯 Mi inglés va ganando terreno.`,
    `Cuestionario de Phraseman: ${right}/${total} (${pct}%) ${rankIcon}`,
  ];
  const pool =
    lang === 'uk' ? variantsUk : lang === 'es' ? variantsEs : variantsRu;
  return `${pickRandom(pool)}\n${storeUrl}`;
}

/* expo-router route shim: keeps utility module from warning as route */
export default function __RouteShim() {
  return null;
}
