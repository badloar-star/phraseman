type LangCode = 'ru' | 'uk' | 'es';

function pickRandom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

/**
 * Text fallback for lesson result share; pool matches `lesson_complete.tsx` main CTA.
 */
export function buildLessonShareMessage(
  lang: LangCode,
  lessonId: number,
  lessonScore: number,
  storeUrl: string
): string {
  const variantsRu = [
    `Урок ${lessonId} уничтожен! 💥 Мой результат в Phraseman: ★ ${lessonScore}. Английский становится всё понятнее. 🔥`,
    `Ещё один шаг к совершенству. Прошёл Урок ${lessonId} в Phraseman на ★ ${lessonScore}. Кто-нибудь, остановите этого гения! 🚀`,
    `Приятная усталость в мозгах. Урок ${lessonId} в Phraseman завершён успешно! ★ ${lessonScore} — полёт нормальный. ✨`,
    `Кто молодец? Я молодец! Прошёл Урок ${lessonId} в Phraseman на ★ ${lessonScore}. День прожит не зря! 😊`,
    `Очередной уровень в Phraseman пал! Урок ${lessonId} пройден. Иду на рекорд! 🏃‍♂️💨 ★ ${lessonScore}`,
    `Ого, я реально начинаю на этом говорить! Урок ${lessonId} в Phraseman пройден на ★ ${lessonScore}. Keep going! 🚀`,
    `Урок ${lessonId} — в копилку! ★ ${lessonScore} в Phraseman. Мой английский становится всё мощнее! 💪🔥`,
    `Прошёл Урок ${lessonId} в Phraseman. ★ ${lessonScore} — результат, за который не стыдно! 😎✨`,
    `Ещё одна ступенька пройдена. Урок ${lessonId} в Phraseman закрыт на ★ ${lessonScore}. Летим дальше! 🚀`,
  ];
  const variantsUk = [
    `Урок ${lessonId} знищено! 💥 Мій результат у Phraseman: ★ ${lessonScore}. Англійська стає все зрозумілішою. 🔥`,
    `Ще один крок до досконалості. Пройшов Урок ${lessonId} у Phraseman на ★ ${lessonScore}. Хто-небудь, зупиніть цього генія! 🚀`,
    `Приємна втома в мізках. Урок ${lessonId} у Phraseman завершено успішно! ★ ${lessonScore} — політ нормальний. ✨`,
    `Хто молодець? Я молодець! Пройшов Урок ${lessonId} у Phraseman на ★ ${lessonScore}. День прожитий не дарма! 😊`,
    `Черговий рівень у Phraseman здався! Урок ${lessonId} пройдено. Йду на рекорд! 🏃‍♂️💨 ★ ${lessonScore}`,
    `Ого, я реально починаю цим розмовляти! Урок ${lessonId} у Phraseman пройдено на ★ ${lessonScore}. Keep going! 🚀`,
    `Урок ${lessonId} — у скарбничку! ★ ${lessonScore} у Phraseman. Моя англійська стає все потужнішою! 💪🔥`,
    `Пройшов Урок ${lessonId} у Phraseman. ★ ${lessonScore} — результат, за який не соромно! 😎✨`,
    `Ще одна сходинка пройдена. Урок ${lessonId} у Phraseman закритий на ★ ${lessonScore}. Летимо далі! 🚀`,
  ];
  const variantsEs = [
    `¡Lección ${lessonId} pulverizada! 💥 Mi resultado en Phraseman: ★ ${lessonScore}. El inglés cada vez lo tengo más claro. 🔥`,
    `Un paso más hacia un inglés cada vez mejor. Completé la Lección ${lessonId} en Phraseman con ★ ${lessonScore}. ¡Que alguien detenga a este genio! 🚀`,
    `Esa gratificante fatiga mental. ¡Lección ${lessonId} completada en Phraseman con éxito! ★ ${lessonScore}. Todo en orden. ✨`,
    `¿Quién se lució? ¡Yo! Lección ${lessonId} en Phraseman con ★ ${lessonScore}. ¡Este día sí que valió la pena! 😊`,
    `¡Otro nivel conquistado en Phraseman! Lección ${lessonId} lista. ¡Voy a por el récord! 🏃‍♂️💨 ★ ${lessonScore}`,
    `Guau, ¡de verdad noto cómo afianzo el inglés! Lección ${lessonId} en Phraseman con ★ ${lessonScore}. Keep going! 🚀`,
    `Lección ${lessonId} apuntada. ★ ${lessonScore} en Phraseman. ¡Mi inglés va ganando fuerza! 💪🔥`,
    `Lección ${lessonId} completada en Phraseman. ★ ${lessonScore}: un resultado del que estar orgulloso. 😎✨`,
    `Otro escalón superado. Lección ${lessonId} cerrada en Phraseman con ★ ${lessonScore}. ¡Seguimos! 🚀`,
  ];
  const pool = lang === 'uk' ? variantsUk : lang === 'es' ? variantsEs : variantsRu;
  return `${pickRandom(pool)}\n${storeUrl}`;
}
