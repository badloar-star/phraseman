import type { Lang } from '../constants/i18n';

type LangCode = Lang;

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

export function buildLessonShareMessage(
  lang: LangCode,
  lessonId: number,
  lessonScore: number,
  storeUrl: string
): string {
  const variantsRu = [
    // зачем (владелец 11.11, аудит текстов; голос — docs/work/VOICE.md): человек отправляет это от своего имени — без угаданного рода, сленга и названия языка, одна улыбка на строку
    `Урок ${lessonId} в Phraseman позади! ★ ${lessonScore} — день прожит не зря 😊`,
    `Урок ${lessonId} пройден в Phraseman на ★ ${lessonScore}. Следующий уже стучится 🚀`,
    `Урок ${lessonId} — в копилку! Phraseman, ★ ${lessonScore}. Приятная усталость в голове ✨`,
    `Урок ${lessonId} закрыт в Phraseman: ★ ${lessonScore}. Результат, за который не стыдно 😎`,
    `Урок ${lessonId} в Phraseman готов, ★ ${lessonScore}. Ещё одна ступенька наверх 🔥`,
  ];
  const variantsUk = [
    `Урок ${lessonId} у Phraseman позаду! ★ ${lessonScore} — день минув не дарма 😊`,
    `Урок ${lessonId} пройдено в Phraseman на ★ ${lessonScore}. Наступний уже стукає 🚀`,
    `Урок ${lessonId} — у скарбничку! Phraseman, ★ ${lessonScore}. Приємна втома в голові ✨`,
    `Урок ${lessonId} закрито в Phraseman: ★ ${lessonScore}. Результат, за який не соромно 😎`,
    `Урок ${lessonId} у Phraseman готовий, ★ ${lessonScore}. Ще одна сходинка вгору 🔥`,
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
  const variantsEn = [
    `Lesson ${lessonId} done in Phraseman with ★ ${lessonScore}. My English got a little stronger today. 🚀`,
    `Another milestone crushed: Lesson ${lessonId} in Phraseman, ★ ${lessonScore}. Onward! 🔥`,
  ];
  const variantsPtBr = [
    `Lição ${lessonId} concluída no Phraseman com ★ ${lessonScore}. Meu inglês ficou mais forte hoje. 🚀`,
    `Mais uma etapa vencida: Lição ${lessonId} no Phraseman, ★ ${lessonScore}. Seguimos evoluindo! 🔥`,
  ];
  const variantsVi = [
    `Mình đã hoàn thành Bài ${lessonId} trên Phraseman với ★ ${lessonScore}. Tiếng Anh tiến thêm một bước! 🚀`,
    `Bài ${lessonId} đã xong trong Phraseman: ★ ${lessonScore}. Tiếp tục luyện nào! 🔥`,
  ];
  const variantsId = [
    `Pelajaran ${lessonId} selesai di Phraseman dengan ★ ${lessonScore}. Bahasa Inggrisku naik level hari ini. 🚀`,
    `Satu langkah lagi selesai: Pelajaran ${lessonId} di Phraseman, ★ ${lessonScore}. Lanjut terus! 🔥`,
  ];
  const variantsTr = [
    `Phraseman’da Ders ${lessonId} tamamlandı: ★ ${lessonScore}. İngilizcem bugün biraz daha güçlendi. 🚀`,
    `Bir adım daha bitti: Phraseman Ders ${lessonId}, ★ ${lessonScore}. Devam! 🔥`,
  ];
  const variantsPl = [
    `Lekcja ${lessonId} ukończona w Phraseman z wynikiem ★ ${lessonScore}. Angielski idzie do przodu! 🚀`,
    `Kolejny krok za mną: Lekcja ${lessonId} w Phraseman, ★ ${lessonScore}. Lecimy dalej! 🔥`,
  ];
  const pools: Record<LangCode, readonly string[]> = {
    ru: variantsRu,
    uk: variantsUk,
    en: variantsEn,
    es: variantsEs,
    'pt-BR': variantsPtBr,
    vi: variantsVi,
    id: variantsId,
    tr: variantsTr,
    pl: variantsPl,
  };
  const pool = pools[lang] ?? pools.ru;
  return `${pickRandom(pool)}\n${storeUrl}`;
}
