// ════════════════════════════════════════════════════════════════════════════
// lesson1_energy.ts — Energy exhaustion modal messages
// Extracted from lesson1.tsx for maintainability
// ════════════════════════════════════════════════════════════════════════════

// ── Energy Exhaustion Modal Messages ──────────────────────────────────────────
const ENERGY_MESSAGES_RU = [
  'Дай знаниям немного уложиться. +1 ⚡ вернётся через {time}. Или забудь о паузах с Плюс прямо сейчас.',
  'Ты отлично поработал! +1 ⚡ восстановится через {time}. А в Плюс энергия никогда не заканчивается.',
  'Твой мозг заслужил короткий отдых. +1 ⚡ вернётся через {time}. Хочешь учиться без остановок? Ждем тебя в Плюс.',
  'Энергия на нуле, но ты на высоте. +1 ⚡ восстановится через {time} или переходи на Плюс, чтобы не ждать.',
  'Сделаем небольшую паузу. +1 ⚡ вернётся через {time}. А с Плюс ты сам решаешь, когда отдыхать.',
  'Твои показатели впечатляют. +1 ⚡ восстановится через {time} или открывай безлимит с Плюс.',
  'Твой прогресс вдохновляет! +1 ⚡ вернётся через {time}. Не хочешь прерываться? С Плюс путь открыт всегда.',
  'Даже супергероям нужна подзарядка. +1 ⚡ вернётся через {time}. Если готов продолжать сейчас — выбирай Плюс.',
  'Знания уже оседают в памяти! +1 ⚡ восстановится через {time} или убери все лимиты одним кликом в Плюс.',
  'Сделаем вдох-выдох. +1 ⚡ вернётся через {time}. Или забудь о таймерах навсегда с Плюс.',
  'Дай себе {time}, чтобы закрепить материал (+1 ⚡). Или переходи на Плюс и учись без границ.',
  '+1 ⚡ восстановится через {time}. Не хочешь делать паузу? В Плюс она тебе не понадобится.',
  'Ты отлично справляешься. +1 ⚡ вернётся через {time}. А с Плюс можно продолжать прямо сейчас.',
  'Небольшая пауза: +1 ⚡ вернётся через {time}. Или убери все лимиты в Плюс.',
  'Твои нейроны работают на максимум. +1 ⚡ восстановится через {time} или зажигаем с Плюс.',
  'Ты набрал отличную скорость! +1 ⚡ вернётся через {time}. Хочешь безлимит? Тебе в Плюс.',
  '+1 ⚡ восстановится за {time}. А в Плюс преград для знаний не существует.',
  'Твои успехи впечатляют. +1 ⚡ вернётся через {time}. С Плюс отдыхаешь только когда сам захочешь.',
  'Дай нам {time} на перезагрузку (+1 ⚡). Или открывай все двери с Плюс уже сейчас.',
  '+1 ⚡ пополнится через {time}. Не терпится продолжить? Жми на Плюс.',
];

const ENERGY_MESSAGES_UK = [
  'Дай знанням трохи улягтися. +1 ⚡ повернеться через {time}. Або забудь про паузи з Плюс прямо зараз.',
  'Ти відмінно попрацював! +1 ⚡ відновиться через {time}. А в Плюс енергія ніколи не закінчується.',
  'Твій мозок заслужив короткий відпочинок. +1 ⚡ повернеться через {time}. Хочеш навчатися без зупинок? Чекаємо тебе в Плюс.',
  'Енергія на нулі, але ти на висоті. +1 ⚡ відновиться через {time} або переходь на Плюс, щоб не чекати.',
  'Зробимо невелику перерву. +1 ⚡ повернеться через {time}. А з Плюс ти сам вирішуєш, коли відпочивати.',
  'Твої показники вражають. +1 ⚡ відновиться через {time} або відкривай безліміт з Плюс.',
  'Твій прогрес надихає! +1 ⚡ повернеться через {time}. Не хочеш зупинок? З Плюс шлях завжди відкритий.',
  'Навіть супергероям потрібна підзарядка. +1 ⚡ повернеться через {time}. Якщо готовий продовжити зараз — вибирай Плюс.',
  'Знання вже вкладаються в пам\'ять! +1 ⚡ відновиться через {time} або зніми всі обмеження одним кліком у Плюс.',
  'Зробимо вдих-видих. +1 ⚡ повернеться через {time}. Або забудь про таймери назавжди з Плюс.',
  'Дай собі {time}, щоб закріпити матеріал (+1 ⚡). Або переходь на Плюс і вчись без меж.',
  '+1 ⚡ відновиться через {time}. Не хочеш робити паузу? У Плюс вона тобі не знадобиться.',
  'Ти відмінно справляєшся. +1 ⚡ повернеться через {time}. А з Плюс можна продовжити прямо зараз.',
  'Невелика перерва: +1 ⚡ повернеться через {time}. Або зніми всі обмеження в Плюс.',
  'Твої нейрони працюють на максимум. +1 ⚡ відновиться через {time} або запалюємо з Плюс.',
  'Ти набрав чудову швидкість! +1 ⚡ повернеться через {time}. Хочеш безліміт? Тобі в Плюс.',
  '+1 ⚡ відновиться за {time}. А в Плюс перешкод для знань не існує.',
  'Твої успіхи вражають. +1 ⚡ повернеться через {time}. З Плюс відпочиваєш лише тоді, коли сам захочеш.',
  'Дай нам {time} на перезавантаження (+1 ⚡). Або відкривай всі двері з Плюс вже зараз.',
  '+1 ⚡ поповниться через {time}. Не терпиться продовжити? Жми на Плюс.',
];

// ── «Нужно N энергии сразу» (экзамен и т.п.) — в том же духе, что и обычные messages ──
const ENERGY_GATE_MESSAGES_RU: ((r: { required: string; have: string }) => string)[] = [
  ({ required, have }) => `Для старта нужно ${required} ⚡ сразу, а у тебя ${have}. Пополни заряд или в Плюс — без этой арифметики.`,
  ({ required, have }) => `Нужен взлёт: ${required} ⚡ в полёте, в ангаре ${have}. С Плюс садиться можно всегда.`,
  ({ required, have }) => `Серьёзный чек-лист: ${required} ⚡ подряд. Сейчас: ${have}. С Плюс — просто взлёт без очереди.`,
  ({ required, have }) => `Сбор на экзамен: ${required} ⚡, в копилке ${have}. С Плюс — запас бесконечен (ну почти, но без таймера).`,
  ({ required, have }) => `Команда батареек просит ${required} ⚡, а в наличии ${have}. Плюс: учись без кассы энергии.`,
];

const ENERGY_GATE_MESSAGES_UK: ((r: { required: string; have: string }) => string)[] = [
  ({ required, have }) => `Для старту треба ${required} ⚡ одразу, а в тебе ${have}. Поповни заряд або в Плюс — без цієї арифметики.`,
  ({ required, have }) => `Потрібен зльот: ${required} ⚡ у польоті, в ангарі ${have}. У Плюс сідати можна завжди.`,
  ({ required, have }) => `Серйозний чек-лист: ${required} ⚡ поспіль. Зараз: ${have}. У Плюс — просто зльот без черги.`,
  ({ required, have }) => `Збір на іспит: ${required} ⚡, у скарбниці ${have}. У Плюс — запас безмежний (ну майже, але без таймера).`,
  ({ required, have }) => `Команда батарейок просить ${required} ⚡, а в наявності ${have}. Плюс: вчися без каси енергії.`,
];

const ENERGY_MESSAGES_ES = [
  'Da tiempo a que asiente lo aprendido. +1 ⚡ volverá en {time}. O olvídate de las pausas con Plus.',
  '¡Buen trabajo! +1 ⚡ se recuperará en {time}. Con Plus la energía no se acaba.',
  'Tu cerebro se merece un descanso breve. +1 ⚡ volverá en {time}. ¿Quieres estudiar sin parar? Te esperamos en Plus.',
  'La energía está a cero, pero tú vas muy bien. +1 ⚡ se recuperará en {time}: pásate a Plus y olvídate de las esperas.',
  'Hagamos una pausa corta. +1 ⚡ volverá en {time}. Con Plus tú decides cuándo descansar.',
  'Tus marcas impresionan. +1 ⚡ se recuperará en {time}: con Plus sin límites.',
  '¡Tu progreso motiva! +1 ⚡ volverá en {time}. Con Plus el camino sigue abierto.',
  'Hasta los campeones necesitan recargar. +1 ⚡ volverá en {time}. ¿Seguir ya? Elige Plus.',
  '¡Lo aprendido se está fijando! +1 ⚡ se recuperará en {time}: quita límites con un toque en Plus.',
  'Respira despacio. +1 ⚡ volverá en {time}. Con Plus olvídate del temporizador.',
  'Tómate {time} para consolidar (+1 ⚡). O pásate a Plus y estudia sin límites.',
  '+1 ⚡ se recuperará en {time}. Sin pausas: con Plus casi no las echas en falta.',
  'Lo estás haciendo genial. +1 ⚡ volverá en {time}. Con Plus puedes seguir ya.',
  'Pequeña pausa: +1 ⚡ volverá en {time}. En Plus desaparecen las barreras.',
  'Vas al máximo. +1 ⚡ se recuperará en {time}: más ritmo con Plus.',
  '¡Qué ritmo! +1 ⚡ volverá en {time}. Ilimitado con Plus.',
  '+1 ⚡ listo en {time}. En Plus casi no hay techo.',
  'Tus aciertos se notan. +1 ⚡ volverá en {time}: descansa solo cuando quieras con Plus.',
  'Danos {time} para recargar (+1 ⚡). O desbloquea todo con Plus.',
  '+1 ⚡ listo en {time}. ¿Sin esperar? Prueba Plus.',
];

const ENERGY_GATE_MESSAGES_ES: ((r: { required: string; have: string }) => string)[] = [
  ({ required, have }) =>
    `Para empezar necesitas ${required} ⚡ de golpe y tienes ${have}. Recarga energía o pásate a Plus y olvídate del cupo.`,
  ({ required, have }) =>
    `Hacen falta ${required} ⚡ listos al arrancar; ahora tienes ${have}. Con Plus entras cuando quieras.`,
  ({ required, have }) =>
    `Lista seria: ${required} ⚡ seguidos. Ahora: ${have}. Con Plus sales sin hacer cola.`,
  ({ required, have }) =>
    `Para el examen hacen falta ${required} ⚡; tienes ${have}. Con Plus vas sobrado.`,
  ({ required, have }) =>
    `Se piden ${required} ⚡ y solo hay ${have}. Plus: estudias sin cupo de energía.`,
];

export {
  ENERGY_MESSAGES_RU,
  ENERGY_MESSAGES_UK,
  ENERGY_MESSAGES_ES,
  ENERGY_GATE_MESSAGES_RU,
  ENERGY_GATE_MESSAGES_UK,
  ENERGY_GATE_MESSAGES_ES,
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
