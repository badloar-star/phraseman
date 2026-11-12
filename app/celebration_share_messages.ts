import type { Lang } from '../constants/i18n';
import type { MedalTier } from './medal_utils';
import { celebrationShareForMoreLocales } from './share_messages_more_locales';

export type CelebrationShareKind =
  | 'medal'
  | 'lesson_unlock'
  | 'level_exam_unlock'
  | 'lingman_exam_unlock';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Тексты для текстового запасного варианта шаринга (Celebration modal). */
export function buildCelebrationShareBody(
  kind: CelebrationShareKind,
  lang: Lang,
  lessonId: number,
  lessonScore: number,
  opts: {
    medalTier?: MedalTier;
    unlockedLessonId?: number;
    cefrLevel?: string;
  }
): string {
  const emoji =
    opts.medalTier === 'gold' ? '🥇' : opts.medalTier === 'silver' ? '🥈' : '🥉';

  // зачем (17.10, открытие английского): en/pt-BR/vi/id/tr/pl раньше получали русский текст. Медаль без уровня, как и ниже,
  // уходит в последнюю ветку (экзамен Лингмана).
  const moreLocaleKind = kind === 'medal' && !opts.medalTier ? 'lingman_exam_unlock' : kind;
  const moreLocale = celebrationShareForMoreLocales(moreLocaleKind, lang, {
    lessonId: kind === 'lesson_unlock' ? opts.unlockedLessonId ?? lessonId : lessonId,
    score: lessonScore,
    emoji,
    level: opts.cefrLevel ?? '—',
  });
  if (moreLocale) return moreLocale;

  if (kind === 'medal' && opts.medalTier) {
    const ru = pick([
      // зачем (владелец 11.11, аудит текстов; голос — docs/work/VOICE.md): человек отправляет это от своего имени — без угаданного рода, сленга и названия языка, одна улыбка на строку
      `${emoji} Медаль за урок ${lessonId} в Phraseman! ★ ${lessonScore} — можно вешать на стенку`,
      `Просто оставлю это здесь: ${emoji} урок ${lessonId} в Phraseman, ★ ${lessonScore}. Давай следующий!`,
      `Урок ${lessonId} в Phraseman пройден на ★ ${lessonScore} ${emoji} Песни на другом языке понемногу проясняются 🎸`,
      `${emoji} Ещё одна медаль в Phraseman — за урок ${lessonId}. Мелочь, а приятно. ★ ${lessonScore}`,
    ] as const);
    const uk = pick([
      `${emoji} Медаль за урок ${lessonId} у Phraseman! ★ ${lessonScore} — можна вішати на стінку`,
      `Просто залишу це тут: ${emoji} урок ${lessonId} у Phraseman, ★ ${lessonScore}. Давай наступний!`,
      `Урок ${lessonId} у Phraseman пройдено на ★ ${lessonScore} ${emoji} Пісні іншою мовою потроху прояснюються 🎸`,
      `${emoji} Ще одна медаль у Phraseman — за урок ${lessonId}. Дрібниця, а приємно. ★ ${lessonScore}`,
    ] as const);
    const es = pick([
      `¡Aquí tienes para enmarcarlo! ${emoji} Medalla por la Lección ${lessonId} en Phraseman. Mi inglés brilla ★ ${lessonScore}. 🔥`,
      `Lo dejo por aquí: medalla de la Lección ${lessonId}. Phraseman, ¿siguiente? ¡Ya enganchado! 🔥`,
      `Lección ${lessonId} en Phraseman: ★ ${lessonScore}. Cada vez entiendo mejor mis canciones favoritas… en inglés. 🎸✨`,
      `¡Hay un nuevo campeón! ${emoji} Medalla por la Lección ${lessonId} en Phraseman ★ ${lessonScore}. ¡Leyenda!`,
      `Lección ${lessonId} → hecha ✅ Medalla ganada en Phraseman ★ ${lessonScore}. ¡Sigo! 🔥`,
      `¿Talento para el inglés o Phraseman mola demasiado? ${emoji} Medalla de la Lección ${lessonId}, mía.`,
      `«La voz de oro» de Phraseman: ${emoji} Lección ${lessonId} ★ ${lessonScore}. ¡A por la siguiente!`,
      `Una medalla más en Phraseman. Lección ${lessonId} ★ ${lessonScore}. Voy a por el siguiente reto 🚀`,
      `Mejor resultado en la Lección ${lessonId}. ${emoji} Phraseman sabe quién estudia de verdad ★ ${lessonScore}.`,
    ] as const);
    if (lang === 'uk') return uk;
    if (lang === 'es') return es;
    return ru;
  }

  if (kind === 'lesson_unlock') {
    const id = opts.unlockedLessonId ?? lessonId;
    const ru = pick([
      `🔓 Урок ${id} в Phraseman открыт. Интересно, что там дальше?`,
      `Маленький шаг для человека, большой — для моего языка 🔓 Урок ${id} в Phraseman доступен`,
      `Ещё один замок снят 🔓 Урок ${id} в Phraseman ждёт`,
      `🔓 Урок ${id} в Phraseman открыт. Копилка знаний пополняется`,
    ] as const);
    const uk = pick([
      `🔓 Урок ${id} у Phraseman відкрито. Цікаво, що там далі?`,
      `Маленький крок для людини, великий — для моєї мови 🔓 Урок ${id} у Phraseman доступний`,
      `Ще один замок знято 🔓 Урок ${id} у Phraseman чекає`,
      `🔓 Урок ${id} у Phraseman відкрито. Скарбничка знань поповнюється`,
    ] as const);
    const ess = pick([
      `¡Nivel desbloqueado! 🔓 La Lección ${id} en Phraseman ya está abierta. Inglés, ahí voy ⚔️`,
      `Contenido nuevo 🔓 Acceso a la Lección ${id} en Phraseman. ¿Qué habrá dentro? 🧐`,
      `Un paso pequeño para mí, un salto grande para mi inglés 🔓 Lección ${id} disponible en Phraseman 🚀`,
      `¡Fuerte el reparto de contenidos! 🔓 Lección ${id} en Phraseman. ¿Y si entiendo mejor el acento británico? 🕵️‍♂️`,
      `Otro candado menos 🔓 Lección ${id} desbloqueada en Phraseman. ¡No me frenes! ⚡️`,
      `La mochila de vocabulario crece 🔓 Lección ${id} lista. En Phraseman no hay aburrimiento 🚀`,
      `Nuevo reto 🔓 La Lección ${id} te espera en Phraseman. La aventura sigue ⚔️`,
      `Sistema gamificado «hackeado» 🔓 Entré a la Lección ${id} en Phraseman 🕵️‍♂️`,
      `Camino libre hacia el siguiente nivel 🔓 Lección ${id} en Phraseman. ¡A por todas! 🚀`,
    ] as const);
    if (lang === 'uk') return uk;
    if (lang === 'es') return ess;
    return ru;
  }

  if (kind === 'level_exam_unlock') {
    const lvl = opts.cefrLevel ?? '—';
    const ru = pick([
      `📋 Зачёт уровня ${lvl} в Phraseman открыт. Страшно, но интересно!`,
      `Финальный босс уровня близко 📋 Зачёт ${lvl} в Phraseman открыт. Держите за меня кулачки!`,
      `Пора доказать, что это не просто нажатия на кнопки 📋 Зачёт уровня ${lvl} в Phraseman открыт`,
      `📋 Последний рывок уровня — зачёт в Phraseman. Пожелайте удачи!`,
    ] as const);
    const uk = pick([
      `📋 Залік рівня ${lvl} у Phraseman відкрито. Страшно, але цікаво!`,
      `Фінальний бос рівня близько 📋 Залік ${lvl} у Phraseman відкрито. Тримайте за мене кулачки!`,
      `Час довести, що це не просто натискання на кнопки 📋 Залік рівня ${lvl} у Phraseman відкрито`,
      `📋 Останній ривок рівня — залік у Phraseman. Побажайте успіху!`,
    ] as const);
    const es = pick([
      `¡Adiós, incertidumbre! 📋 Examen de nivel abierto en Phraseman — paso firme hacia más fluidez 🎯`,
      `El «jefe final» del nivel 📋 Ya tengo acceso en Phraseman. ¿Me echáis una pizca de suerte? 😎`,
      `Siguiente parada: más confianza en inglés 📋 Control del nivel ${lvl} desbloqueado en Phraseman 🏁`,
      `Hora de demostrar de qué vale esta app 📋 Control ${lvl} en Phraseman. Sin trampas 😎🎯`,
      `Recta final 📋 Examen disponible en Phraseman ¿Quién dijo nivel experto? 🙋‍♂️`,
      `Lecciones hechas — toca el gran repaso 📋 Listo para Phraseman. ¡A por el resultado! 🥊`,
      `Como sacarme «el carnet» del inglés… 📋 Control en Phraseman: nervios ¡sí!, ganas ¡más! ✨`,
      `A un paso del siguiente salto 📋 Control desbloqueado en Phraseman 🤞🔥`,
      `Skills en subida 📋 Acceso al control ${lvl} en Phraseman. ¡No hay vuelta atrás! 🎯`,
    ] as const);
    if (lang === 'uk') return uk;
    if (lang === 'es') return es;
    return ru;
  }

  const ru = pick([
    `🎓 Все уроки Phraseman позади — впереди экзамен Профессора Лингмана. Держите за меня кулачки!`,
    `Финальная битва начинается 🎓 Экзамен Профессора Лингмана в Phraseman открыт`,
    `🎓 Профессор Лингман, готовьте диплом! Финальный экзамен в Phraseman открыт`,
    `Уровень босса 🎓 Экзамен Лингмана в Phraseman открыт. Если не вернусь — считайте полиглотом`,
  ] as const);
  const uk = pick([
    `🎓 Усі уроки Phraseman позаду — попереду іспит Професора Лінгмана. Тримайте за мене кулачки!`,
    `Фінальна битва починається 🎓 Іспит Професора Лінгмана в Phraseman відкрито`,
    `🎓 Професоре Лінгмане, готуйте диплом! Фінальний іспит у Phraseman відкрито`,
    `Рівень боса 🎓 Іспит Лінгмана в Phraseman відкрито. Якщо не повернуся — вважайте поліглотом`,
  ] as const);
  const ess = pick([
    `De lecciones y retos hasta el final en Phraseman 🎓 Me espera el examen final del Profesor Lingman ¡Hora de leyendas! 🏆`,
    `Profesor Lingman: listo 🎓 Todas las lecciones vistas; solo queda la gran prueba en Phraseman ¡crucemos los dedos! ✨`,
    `Niveles y repasos hechos 🎓 A un paso del «master» en Phraseman: examen final desbloqueado 🥇`,
    `Comienza la batalla final 🎓 Examen del Profesor Lingman abierto en Phraseman ¡a por todo! 🏆`,
    `Listo para el encuentro con el profesor 🎓 Solo queda esta prueba en Phraseman ¡vamos! ⚡️`,
    `¿Futuro nerd del inglés? 🎓 Examen final en Phraseman desbloqueado ¡deseadme suerte! 🥇`,
    `Modo boss final 🎓 Examen Lingman abierto Si no salgo… llamadme políglota 🏆🔥`,
    `Lecciones y exámenes de nivel cerrados 🎓 Frente a la prueba más grande de Phraseman ¡momento épico!`,
    `Profesor Lingman: calienta la impresora 🎓 Examen final en Phraseman desbloqueado ¡voy a por el rédito! 🥇`,
  ] as const);
  if (lang === 'uk') return uk;
  if (lang === 'es') return ess;
  return ru;
}
