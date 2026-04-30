import AsyncStorage from '@react-native-async-storage/async-storage';

export const ARENA_DUEL_DEEPLINK_BASE = 'https://badloar-star.github.io/phraseman/duel';

const _duelRu = [
  `⚔️ Вызываю тебя на интеллектуальную дуэль по английскому в Phraseman! Или боишься проиграть? 😉`,
  `⚔️ Давай проверим, чей английский круче! Встретимся в Phraseman на дуэли. Проигравший учит 50 новых слов! 👊`,
  `⚔️ Есть минутка, чтобы я разгромил тебя в Phraseman? Жду в дуэльной комнате! ⚡️`,
  `⚔️ Не хочешь проверить свои знания? Жду тебя в дуэли Phraseman. Обещаю быть беспощадным! 😉`,
  `⚔️ Слова — моё оружие. Давай сразимся в Phraseman и выясним, кто тут настоящий лингвист! 🤺`,
  `⚔️ Хватит теории, давай к практике! Го в дуэль в Phraseman? Ссылка ждет.`,
  `⚔️ Давай на спор: кто проиграет в дуэли Phraseman, тот скидывает мем! Жду тебя в игре. 🃏`,
  `⚔️ Го дуэль в Phraseman? Проверим, чей английский «London is the capital of...», а чей — реально крутой! 🇬🇧`,
  `⚔️ Есть смельчаки? Вызываю на дуэль по английскому в Phraseman! Давай узнаем, кто из нас настоящий профи. 😎`,
  `⚔️ Дуэль в Phraseman! Мои знания против твоих. Ссылка ждёт, не трусь! 🔥`,
  `⚔️ Сыграем? В Phraseman сейчас жарко! Жду тебя в дуэльной комнате. ⚡️`,
];
const _duelUk = [
  `⚔️ Викликаю тебе на інтелектуальну дуель з англійської у Phraseman! Чи боїшся програти? 😉`,
  `⚔️ Давай перевіримо, чия англійська крутіша! Зустрінемося у Phraseman на дуелі. Той, хто програє, вчить 50 нових слів! 👊`,
  `⚔️ Маєш хвилинку, щоб я розгромив тебе у Phraseman? Чекаю в дуельній кімнаті! ⚡️`,
  `⚔️ Не хочеш перевірити свої знання? Чекаю на тебе в дуелі Phraseman. Обіцяю бути нещадним! 😉`,
  `⚔️ Слова — моя зброя. Давай запекло змагатися у Phraseman і з'ясуємо, хто тут справжній лінгвіст! 🤺`,
  `⚔️ Досить теорії, давай до практики! Го в дуель у Phraseman? Посилання чекає.`,
  `⚔️ Давай на спір: хто програє в дуелі Phraseman, той скидає мем! Чекаю на тебе в грі. 🃏`,
  `⚔️ Го дуель у Phraseman? Перевіримо, чия англійська «London is the capital of...», а чия — реально крута! 🇬🇧`,
  `⚔️ Є сміливці? Викликаю на дуель з англійської у Phraseman! Давай дізнаємось, хто з нас справжній профі. 😎`,
  `⚔️ Дуель у Phraseman! Мої знання проти твоїх. Посилання чекає, не бійся! 🔥`,
  `⚔️ Зіграємо? У Phraseman зараз гаряче! Чекаю на тебе в дуельній кімнаті. ⚡️`,
];
const _duelEs = [
  `⚔️ Te reto a un duelo de inglés en Phraseman. ¿Miedo a perder? 😉`,
  `⚔️ ¿Veamos quién lleva mejor el inglés? Nos vemos en el duelo de Phraseman. El que pierda estudia 50 palabras nuevas. 👊`,
  `⚔️ ¿Tienes un minuto para que te gane en Phraseman? Te espero en la sala de duelo. ⚡️`,
  `⚔️ ¿No quieres poner a prueba lo que sabes? Te espero en el duelo de Phraseman. Prometo no tener piedad. 😉`,
  `⚔️ Las palabras son mi arma. Enfréntame en Phraseman y veamos quién es el lingüista de verdad. 🤺`,
  `⚔️ Basta de teoría: ¿vamos a la práctica? Duelo en Phraseman; el enlace te espera.`,
  `⚔️ Apostemos: quien pierda el duelo en Phraseman manda un meme. Te espero en la app. 🃏`,
  `⚔️ ¿Duelo en Phraseman? A ver si tu inglés es solo «London is the capital of…» o va en serio. 🇬🇧`,
  `⚔️ ¿Hay valientes? Te reto a un duelo de inglés en Phraseman; veamos quién es el pro. 😎`,
  `⚔️ ¡Duelo en Phraseman! Mis conocimientos contra los tuyos. El enlace está listo: sin excusas. 🔥`,
  `⚔️ ¿Jugamos? En Phraseman hay ambiente. Te espero en la sala de duelo. ⚡️`,
];

export async function buildFriendInviteSharePayload(
  roomId: string
): Promise<{ message: string; url: string }> {
  const link = `${ARENA_DUEL_DEEPLINK_BASE}/${roomId}`;
  const _lang = await AsyncStorage.getItem('app_lang').catch(() => null);
  const _pool = _lang === 'uk' ? _duelUk : _lang === 'es' ? _duelEs : _duelRu;
  const _msg = _pool[Math.floor(Math.random() * _pool.length)]!;
  return { message: `${_msg}\n${link}`, url: link };
}
