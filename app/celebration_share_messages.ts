import type { Lang } from '../constants/i18n';
import type { MedalTier } from './medal_utils';

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

  if (kind === 'medal' && opts.medalTier) {
    const ru = pick([
      `Повесьте это на стенку! ${emoji} Золото за урок ${lessonId} в Phraseman. Мой английский теперь официально сияет! ★ ${lessonScore}`,
      `Просто оставлю это здесь. Медаль за урок ${lessonId} получена. Phraseman, давай следующий, я вошёл во вкус! 🔥`,
      `Урок ${lessonId} пройден на ${lessonScore} баллов. Кажется, я начинаю понимать, о чём поют в моих любимых песнях! 🎸✨`,
      `Подвиньтесь, на сцене новый чемпион! ${emoji} Забрал медаль за урок ${lessonId} в Phraseman. Это было легендарно! ★ ${lessonScore}`,
      `Урок ${lessonId} — Done! ✅ Медаль в кармане, английский в голове, Phraseman в сердце. ★ ${lessonScore} 🔥`,
      `Кажется, у меня талант к английскому (или Phraseman слишком крут)! ${emoji} Медаль за урок ${lessonId} моя!`,
      `Называйте меня «Золотой голос Phraseman»! ${emoji} Забрал медаль за урок ${lessonId}. ★ ${lessonScore} 🔥`,
      `Очередная медалька в Phraseman. Урок ${lessonId} пройден на ★ ${lessonScore}. Двигаюсь к цели! 🚀`,
      `Просто лучший результат за урок ${lessonId}! ${emoji} Phraseman знает, кто здесь главный ученик. ★ ${lessonScore}`,
    ] as const);
    const uk = pick([
      `Повісьте це на стінку! ${emoji} Золото за урок ${lessonId} у Phraseman. Моя англійська тепер офіційно сяє! ★ ${lessonScore}`,
      `Просто залишу це тут. Медаль за урок ${lessonId} отримана. Phraseman, давай наступний, я увійшов у азарт! 🔥`,
      `Урок ${lessonId} пройдено на ${lessonScore} балів. Здається, я починаю розуміти, про що співають у моїх улюблених піснях! 🎸✨`,
      `Посуньтеся, на сцені новий чемпіон! ${emoji} Забрав медаль за урок ${lessonId} у Phraseman. Це було легендарно! ★ ${lessonScore}`,
      `Урок ${lessonId} — Done! ✅ Медаль у кишені, англійська в голові, Phraseman у серці. ★ ${lessonScore} 🔥`,
      `Здається, у мене талант до англійської (або Phraseman занадто крутий)! ${emoji} Медаль за урок ${lessonId} моя!`,
      `Називайте мене «Золотий голос Phraseman»! ${emoji} Забрав медаль за урок ${lessonId}. ★ ${lessonScore} 🔥`,
      `Чергова медалька у Phraseman. Урок ${lessonId} пройдено на ★ ${lessonScore}. Рухаюся до мети! 🚀`,
      `Просто найкращий результат за урок ${lessonId}! ${emoji} Phraseman знає, хто тут головний учень. ★ ${lessonScore}`,
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
      `Новый уровень разблокирован! 🔓 Урок ${id} в Phraseman открыт. Берегись, английский, я иду за тобой! ⚔️`,
      `Оппа, контент подъехал! 🔓 Открыл доступ к уроку ${id} в Phraseman. Интересно, что там дальше? 🧐`,
      `Маленький шаг для человека, но огромный прыжок для моего английского! 🔓 Урок ${id} в Phraseman доступен. 🚀`,
      `Свежий контент подвезли! 🔓 Открыл урок ${id} в Phraseman. Надеюсь, там научат понимать британский акцент! 🕵️‍♂️`,
      `Ещё один замок сломан! 🔓 Урок ${id} в Phraseman разблокирован. Остановите меня, я вошёл в кураж! ⚡️`,
      `Копилка знаний пополняется. 🔓 Урок ${id} открыт! В Phraseman скучно не бывает. 🚀`,
      `Новый уровень открыт! 🔓 Урок ${id} в Phraseman ждёт своего героя. Приключения продолжаются! ⚔️`,
      `Взломал систему обучения! 🔓 Открыл доступ к уроку ${id} в Phraseman. Английский, я иду за тобой! 🕵️‍♂️`,
      `Путь к мастерству свободен! 🔓 Урок ${id} в Phraseman разблокирован. Только вперёд! 🚀`,
    ] as const);
    const uk = pick([
      `Новий рівень розблоковано! 🔓 Урок ${id} у Phraseman відкрито. Стережись, англійська, я йду за тобою! ⚔️`,
      `Опа, контент під'їхав! 🔓 Відкрив доступ до уроку ${id} у Phraseman. Цікаво, що там далі? 🧐`,
      `Маленький крок для людини, але величезний стрибок для моєї англійської! 🔓 Урок ${id} у Phraseman доступний. 🚀`,
      `Свіжий контент підвезли! 🔓 Відкрив урок ${id} у Phraseman. Сподіваюся, там навчать розуміти британський акцент! 🕵️‍♂️`,
      `Ще один замок зламано! 🔓 Урок ${id} у Phraseman розблоковано. Зупиніть мене, я впіймав кураж! ⚡️`,
      `Скарбничка знань поповнюється. 🔓 Урок ${id} відкрито! У Phraseman нудно не буває. 🚀`,
      `Новий рівень відкрито! 🔓 Урок ${id} у Phraseman чекає на свого героя. Пригоди тривають! ⚔️`,
      `Зламав систему навчання! 🔓 Відкрив доступ до уроку ${id} у Phraseman. Англійська, я йду за тобою! 🕵️‍♂️`,
      `Шлях до майстерності вільний! 🔓 Урок ${id} у Phraseman розблоковано. Тільки вперед! 🚀`,
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
      `Прощай, неопределённость! 📋 Зачёт уровня открыт в Phraseman. Это мой билет в мир свободного общения! 🎯`,
      `Финальный босс уровня близко! 📋 Разблокировал зачёт в Phraseman. Пожелайте мне удачи (или просто завидуйте)! 😎`,
      `Следующая остановка — свободный английский! 📋 Открыл зачёт уровня ${lvl} в Phraseman. Назад дороги нет! 🏁`,
      `Час расплаты настал! 📋 Разблокировал зачёт уровня ${lvl} в Phraseman. Пора доказать, что я не просто кликал по кнопкам! 😎🎯`,
      `Выхожу на финишную прямую уровня! 📋 Зачёт в Phraseman открыт. Кто тут кандидат на звание эксперта? 🙋‍♂️`,
      `Уровень пройден, остался последний рывок — зачёт! 📋 Phraseman, я готов, не щади меня! 🥊`,
      `Пора сдавать на права... на право говорить по-английски! 📋 Зачёт уровня открыт в Phraseman. Страшно, но интересно! ✨`,
      `В одном шаге от нового уровня! 📋 Разблокировал зачёт в Phraseman. Держите за меня кулачки! 🔥`,
      `Мой скилл растёт! 📋 Открыл доступ к зачёту уровня ${lvl} в Phraseman. Назад пути нет! 🎯`,
    ] as const);
    const uk = pick([
      `Прощавай, невизначеність! 📋 Залік рівня відкрито у Phraseman. Це мій квиток у світ вільного спілкування! 🎯`,
      `Фінальний бос рівня близько! 📋 Розблокував залік у Phraseman. Побажайте мені успіху (або просто заздріть)! 😎`,
      `Наступна зупинка — вільна англійська! 📋 Відкрив залік рівня ${lvl} у Phraseman. Назад дороги немає! 🏁`,
      `Час розплати настав! 📋 Розблокував залік рівня ${lvl} у Phraseman. Пора довести, що я не просто клікав по кнопках! 😎🎯`,
      `Виходжу на фінішну пряму рівня! 📋 Залік у Phraseman відкрито. Хто тут кандидат на звання експерта? 🙋‍♂️`,
      `Рівень пройдено, залишився останній ривок — залік! 📋 Phraseman, я готовий, не щади мене! 🥊`,
      `Пора здавати на права... на право розмовляти англійською! 📋 Залік рівня відкрито у Phraseman. Страшно, але цікаво! ✨`,
      `За крок від нового рівня! 📋 Розблокував залік у Phraseman. Тримайте за мене кулачки! 🔥`,
      `Мій скіл росте! 📋 Відкрив доступ до заліку рівня ${lvl} у Phraseman. Назад шляху немає! 🎯`,
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
    `Я прошёл через огонь, воду и все уроки Phraseman! 🎓 Экзамен Профессора Лингмана ждёт. Настало время легенд! 🏆`,
    `Профессор Лингман, я готов! 🎓 Все уроки позади, впереди только финальная битва в Phraseman. Держите за меня кулачки! ✨`,
    `Уровни пройдены, зачёты сданы. 🎓 Я в шаге от звания магистра Phraseman! Разблокирован финальный экзамен! 🥇`,
    `Финальная битва начинается! 🎓 Разблокировал экзамен Профессора Лингмана в Phraseman. Пора стать легендой! 🏆`,
    `Я готов встретиться с Профессором! 🎓 Все уроки в Phraseman позади, впереди только экзамен. Погнали! ⚡️`,
    `Кто тут будущий отличник? 🎓 Открыл финальный экзамен в Phraseman. Пожелайте мне удачи! 🥇`,
    `Уровень босса! 🎓 Разблокировал экзамен Профессора Лингмана. Если не вернусь — считайте меня полиглотом! 🏆🔥`,
    `Все уроки пройдены, все зачёты сданы. 🎓 Я у ворот финального экзамена в Phraseman. Это было мощно!`,
    `Профессор Лингман, готовьте диплом! 🎓 Разблокировал финальный экзамен в Phraseman. Я иду за победой! 🥇`,
  ] as const);
  const uk = pick([
    `Я пройшов крізь вогонь, воду та всі уроки Phraseman! 🎓 Іспит Професора Лінгмана чекає. Настав час легенд! 🏆`,
    `Професоре Лінгмане, я готовий! 🎓 Всі уроки позаду, попереду лише фінальна битва у Phraseman. Тримайте за мене кулачки! ✨`,
    `Рівні пройдено, заліки складено. 🎓 Я за крок від звання магістра Phraseman! Розблоковано фінальний іспит! 🥇`,
    `Фінальна битва починається! 🎓 Розблокував іспит Професора Лінгмана у Phraseman. Пора стати легендою! 🏆`,
    `Я готовий зустрітися з Професором! 🎓 Всі уроки у Phraseman позаду, попереду лише іспит. Погнали! ⚡️`,
    `Хто тут майбутній відмінник? 🎓 Відкрив фінальний іспит у Phraseman. Побажайте мені успіху! 🥇`,
    `Рівень боса! 🎓 Розблокував іспит Професора Лінгмана. Якщо не повернуся — вважайте мене поліглотом! 🏆🔥`,
    `Всі уроки пройдено, всі заліки складено. 🎓 Я біля воріт фінального іспиту у Phraseman. Це було потужно!`,
    `Професоре Лінгмане, готуйте диплом! 🎓 Розблокував фінальний іспит у Phraseman. Я йду за перемогою! 🥇`,
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
