import type { Lang } from '../constants/i18n';
import { achievementShareForMoreLocales } from './share_messages_more_locales';

function pickRandom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

export function buildAchievementShareMessage(lang: Lang, name: string, storeUrl: string): string {
  const variantsRu = [
    // зачем (владелец 11.11, аудит текстов; голос — docs/work/VOICE.md): человек отправляет это от своего имени — без угаданного рода, сленга и названия языка, одна улыбка на строку
    `Новое достижение в Phraseman: «${name}» 🏅 Мелочь, а приятно.`,
    `«${name}» — теперь в моей коллекции Phraseman. Полка с наградами растёт 🏆`,
    `Открыто достижение «${name}» в Phraseman. А у тебя что сегодня? 😎`,
    `Ещё одна награда в Phraseman — «${name}». Достижения сами себя не соберут ✨`,
    `«${name}» в Phraseman — есть! Маленький повод для гордости 🏅`,
    `Phraseman выдал достижение «${name}». Похоже, занятия не прошли даром 🧠`,
  ];
  const variantsUk = [
    `Нове досягнення в Phraseman: «${name}» 🏅 Дрібниця, а приємно.`,
    `«${name}» — тепер у моїй колекції Phraseman. Полиця з нагородами росте 🏆`,
    `Відкрито досягнення «${name}» у Phraseman. А в тебе що сьогодні? 😎`,
    `Ще одна нагорода в Phraseman — «${name}». Досягнення самі себе не зберуть ✨`,
    `«${name}» у Phraseman — є! Маленький привід для гордості 🏅`,
    `Phraseman видав досягнення «${name}». Схоже, заняття не минули дарма 🧠`,
  ];
  const variantsEs = [
    `¡Mamá, no pierdo el tiempo: colecciono logros en Phraseman! 🏅 Otro más, «${name}», para el museo del genio.`,
    `Nivel: «rey del logro». Desbloqueé «${name}» en Phraseman. ¿Y tú qué has hecho hoy? 😎`,
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
  // зачем (17.10, открытие английского): en/pt-BR/vi/id/tr/pl раньше получали русский текст
  const moreLocale = achievementShareForMoreLocales(lang, name);
  if (moreLocale) return `${moreLocale}\n${storeUrl}`;
  const pool = lang === 'uk' ? variantsUk : lang === 'es' ? variantsEs : variantsRu;
  return `${pickRandom(pool)}\n${storeUrl}`;
}
