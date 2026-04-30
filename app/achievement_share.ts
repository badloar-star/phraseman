import type { Lang } from '../constants/i18n';

function pickRandom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

export function buildAchievementShareMessage(lang: Lang, name: string, storeUrl: string): string {
  const variantsRu = [
    `Мама, я не бездельничаю, я коллекционирую ачивки в Phraseman! 🏅 Плюс одно достижение «${name}» в копилку гениальности.`,
    `Уровень английского: «Бог ачивок». Взял «${name}» в Phraseman. А чего добился ты сегодня? 😎`,
    `Этот трофей «${name}» заслуживает отдельного поста! Phraseman, что ты со мной делаешь? 🏆✨`,
    `Кажется, я случайно стал умнее. 🧠 Получил ачивку «${name}» в Phraseman. Не пытайтесь это повторить (шучу, пытайтесь)!`,
    `Моя полка с трофеями пополнилась! «${name}» теперь в моей коллекции Phraseman. Мелочь, а приятно! 🏆✨`,
    `Кто бы мог подумать, что я на такое способен? 🏅 Взял «${name}» в Phraseman. Горжусь собой почти неприлично!`,
    `Ачивки в Phraseman сами себя не соберут, а я — соберу! 🏅 Теперь у меня есть «${name}». Завидуйте молча (или качайте приложение)!`,
    `Говорят, успех — это 1% таланта и 99% Phraseman. Проверил на себе: взял «${name}»! ✨`,
    `Посмотрите на этого гения! 😎 Забрал ачивку «${name}» в Phraseman. Кажется, я становлюсь слишком опасным для англоязычного мира.`,
    `+1 в коллекцию лингвистических побед! 🏅 Достижение «${name}» в Phraseman получено. Дальше — больше!`,
    `Мой Phraseman сияет! ✨ Теперь у меня есть ачивка «${name}». Маленький флекс моим прогрессом.`,
  ];
  const variantsUk = [
    `Мамо, я не марную час, я колекціоную ачівки у Phraseman! 🏅 Ще одне досягнення «${name}» у скарбничку геніальності.`,
    `Рівень англійської: «Бог ачівка». Взяв «${name}» у Phraseman. А чого досяг ти сьогодні? 😎`,
    `Цей трофей «${name}» заслуговує на окремий пост! Phraseman, що ти зі мною робиш? 🏆✨`,
    `Здається, я випадково став розумнішим. 🧠 Здобув ачівку «${name}» у Phraseman. Не намагайтеся це повторити (жартую, намагайтеся)!`,
    `Моя полиця з трофеями поповнилася! «${name}» тепер у моїй колекції Phraseman. Дрібниця, а приємно! 🏆✨`,
    `Хто б міг подумати, що я на таке здатен? 🏅 Взяв «${name}» у Phraseman. Пишаюся собою майже непристойно!`,
    `Ачівки у Phraseman самі себе не зберуть, а я — зберу! 🏅 Тепер у мене є «${name}». Заздріть мовчки (або качайте додаток)!`,
    `Кажуть, успіх — це 1% таланту і 99% Phraseman. Перевірив на собі: взяв «${name}»! ✨`,
    `Подивіться на цього генія! 😎 Забрав ачівку «${name}» у Phraseman. Здається, я стаю занадто небезпечним для англомовного світу.`,
    `+1 у колекцію лінгвістичних перемог! 🏅 Досягнення «${name}» у Phraseman здобуто. Далі — більше!`,
    `Мій Phraseman сяє! ✨ Тепер у мене є ачівка «${name}». Маленький флекс моїм прогресом.`,
  ];
  const variantsEs = [
    `¡Mamá, no pierdo el tiempo: colecciono logros en Phraseman! 🏅 Otro más, «${name}», para el museo del genio.`,
    `Nivel de inglés: «rey del logro». Desbloqueé «${name}» en Phraseman. ¿Y tú qué has hecho hoy? 😎`,
    `Este trofeo «${name}» merece su propio post. Phraseman, ¿qué me estás haciendo? 🏆✨`,
    `Creo que sin querer me volví más listo. 🧠 Logro «${name}» en Phraseman. No intenten repetirlo (¿o sí?).`,
    `¡Mi vitrina crece! «${name}» ya forma parte de mi colección en Phraseman. Pequeño gustito. 🏆✨`,
    `¿Quién diría que yo podría? 🏅 «${name}» en Phraseman. Casi me da vergüenza lo orgulloso que estoy.`,
    `Los logros de Phraseman no se farmean solos: yo me encargo. 🏅 Ahora tengo «${name}». Envídien en silencio (o instalen la app).`,
    `Dicen que el éxito es 1% talento y 99% Phraseman. Comprobado: «${name}» desbloqueado. ✨`,
    `Contemplen al genio del día. 😎 Logro «${name}» en Phraseman. Cada vez más peligroso para el mundo angloparlante.`,
    `+1 a la colección de victorias lingüísticas. 🏅 «${name}» en Phraseman conseguido. ¡Siguiente!`,
    `Mi Phraseman brilla. ✨ Logro «${name}» añadido. Flex rápido de progreso.`,
  ];
  const pool = lang === 'uk' ? variantsUk : lang === 'es' ? variantsEs : variantsRu;
  return `${pickRandom(pool)}\n${storeUrl}`;
}
