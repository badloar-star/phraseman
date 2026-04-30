// ════════════════════════════════════════════════════════════════════════════
// lesson1_energy.ts — Energy exhaustion modal messages
// Extracted from lesson1.tsx for maintainability
// ════════════════════════════════════════════════════════════════════════════

// ── Energy Exhaustion Modal Messages ──────────────────────────────────────────
const ENERGY_MESSAGES_RU = [
  'Дай знаниям немного уложиться. +1 ⚡ вернётся через {time}. Или забудь о паузах с Premium прямо сейчас.',
  'Ты отлично поработал! +1 ⚡ восстановится через {time}. А в Premium энергия никогда не заканчивается.',
  'Твой мозг заслужил короткий отдых. +1 ⚡ вернётся через {time}. Хочешь учиться без остановок? Ждем тебя в Premium.',
  'Энергия на нуле, но ты на высоте. +1 ⚡ восстановится через {time} или переходи на Premium, чтобы не ждать.',
  'Сделаем небольшую паузу. +1 ⚡ вернётся через {time}. А с Premium ты сам решаешь, когда отдыхать.',
  'Твои показатели впечатляют. +1 ⚡ восстановится через {time} или открывай безлимит с Premium.',
  'Твой прогресс вдохновляет! +1 ⚡ вернётся через {time}. Не хочешь прерываться? С Premium путь открыт всегда.',
  'Даже супергероям нужна подзарядка. +1 ⚡ вернётся через {time}. Если готов продолжать сейчас — выбирай Premium.',
  'Знания уже оседают в памяти! +1 ⚡ восстановится через {time} или убери все лимиты одним кликом в Premium.',
  'Сделаем вдох-выдох. +1 ⚡ вернётся через {time}. Или забудь о таймерах навсегда с Premium.',
  'Дай себе {time}, чтобы закрепить материал (+1 ⚡). Или переходи на Premium и учись без границ.',
  '+1 ⚡ восстановится через {time}. Не хочешь делать паузу? В Premium она тебе не понадобится.',
  'Ты отлично справляешься. +1 ⚡ вернётся через {time}. А с Premium можно продолжать прямо сейчас.',
  'Небольшая пауза: +1 ⚡ вернётся через {time}. Или убери все лимиты в Premium.',
  'Твои нейроны работают на максимум. +1 ⚡ восстановится через {time} или зажигаем с Premium.',
  'Ты набрал отличную скорость! +1 ⚡ вернётся через {time}. Хочешь безлимит? Тебе в Premium.',
  '+1 ⚡ восстановится за {time}. А в Premium преград для знаний не существует.',
  'Твои успехи впечатляют. +1 ⚡ вернётся через {time}. С Premium отдыхаешь только когда сам захочешь.',
  'Дай нам {time} на перезагрузку (+1 ⚡). Или открывай все двери с Premium уже сейчас.',
  '+1 ⚡ пополнится через {time}. Не терпится продолжить? Жми на Premium.',
];

const ENERGY_MESSAGES_UK = [
  'Дай знанням трохи улягтися. +1 ⚡ повернеться через {time}. Або забудь про паузи з Premium прямо зараз.',
  'Ти відмінно попрацював! +1 ⚡ відновиться через {time}. А в Premium енергія ніколи не закінчується.',
  'Твій мозок заслужив короткий відпочинок. +1 ⚡ повернеться через {time}. Хочеш навчатися без зупинок? Чекаємо тебе в Premium.',
  'Енергія на нулі, але ти на висоті. +1 ⚡ відновиться через {time} або переходь на Premium, щоб не чекати.',
  'Зробимо невелику перерву. +1 ⚡ повернеться через {time}. А з Premium ти сам вирішуєш, коли відпочивати.',
  'Твої показники вражають. +1 ⚡ відновиться через {time} або відкривай безліміт з Premium.',
  'Твій прогрес надихає! +1 ⚡ повернеться через {time}. Не хочеш зупинок? З Premium шлях завжди відкритий.',
  'Навіть супергероям потрібна підзарядка. +1 ⚡ повернеться через {time}. Якщо готовий продовжити зараз — вибирай Premium.',
  'Знання вже вкладаються в пам\'ять! +1 ⚡ відновиться через {time} або зніми всі обмеження одним кліком у Premium.',
  'Зробимо вдих-видих. +1 ⚡ повернеться через {time}. Або забудь про таймери назавжди з Premium.',
  'Дай собі {time}, щоб закріпити матеріал (+1 ⚡). Або переходь на Premium і вчись без меж.',
  '+1 ⚡ відновиться через {time}. Не хочеш робити паузу? У Premium вона тобі не знадобиться.',
  'Ти відмінно справляєшся. +1 ⚡ повернеться через {time}. А з Premium можна продовжити прямо зараз.',
  'Невелика перерва: +1 ⚡ повернеться через {time}. Або зніми всі обмеження в Premium.',
  'Твої нейрони працюють на максимум. +1 ⚡ відновиться через {time} або запалюємо з Premium.',
  'Ти набрав чудову швидкість! +1 ⚡ повернеться через {time}. Хочеш безліміт? Тобі в Premium.',
  '+1 ⚡ відновиться за {time}. А в Premium перешкод для знань не існує.',
  'Твої успіхи вражають. +1 ⚡ повернеться через {time}. З Premium відпочиваєш лише тоді, коли сам захочеш.',
  'Дай нам {time} на перезавантаження (+1 ⚡). Або відкривай всі двері з Premium вже зараз.',
  '+1 ⚡ поповниться через {time}. Не терпиться продовжити? Жми на Premium.',
];

// ── «Нужно N энергии сразу» (экзамен и т.п.) — в том же духе, что и обычные messages ──
const ENERGY_GATE_MESSAGES_RU: ((r: { required: string; have: string }) => string)[] = [
  ({ required, have }) => `Для старта нужно ${required} ⚡ сразу, а у тебя ${have}. Пополни заряд или в Premium — без этой арифметики.`,
  ({ required, have }) => `Нужен взлёт: ${required} ⚡ в полёте, в ангаре ${have}. С Premium садиться можно всегда.`,
  ({ required, have }) => `Серьёзный чек-лист: ${required} ⚡ подряд. Сейчас: ${have}. С Premium — просто взлёт без очереди.`,
  ({ required, have }) => `Сбор на экзамен: ${required} ⚡, в копилке ${have}. С Premium — запас бесконечен (ну почти, но без таймера).`,
  ({ required, have }) => `Команда батареек просит ${required} ⚡, а в наличии ${have}. Premium: учись без кассы энергии.`,
];

const ENERGY_GATE_MESSAGES_UK: ((r: { required: string; have: string }) => string)[] = [
  ({ required, have }) => `Для старту треба ${required} ⚡ одразу, а в тебе ${have}. Поповни заряд або в Premium — без цієї арифметики.`,
  ({ required, have }) => `Потрібен зльот: ${required} ⚡ у польоті, в ангарі ${have}. У Premium сідати можна завжди.`,
  ({ required, have }) => `Серйозний чек-лист: ${required} ⚡ поспіль. Зараз: ${have}. У Premium — просто зльот без черги.`,
  ({ required, have }) => `Збір на іспит: ${required} ⚡, у скарбниці ${have}. У Premium — запас безмежний (ну майже, але без таймера).`,
  ({ required, have }) => `Команда батарейок просить ${required} ⚡, а в наявності ${have}. Premium: вчися без каси енергії.`,
];

const ENERGY_MESSAGES_ES = [
  'Da tiempo a que asiente lo aprendido. +1 ⚡ volverá en {time}. O olvídate de las pausas con Premium.',
  '¡Buen trabajo! +1 ⚡ se recuperará en {time}. Con Premium la energía no se acaba.',
  'Tu cerebro se merece un descanso breve. +1 ⚡ volverá en {time}. ¿Quieres estudiar sin parar? Te esperamos en Premium.',
  'La energía está a cero, pero tú vas muy bien. +1 ⚡ se recuperará en {time}: pásate a Premium y olvídate de las esperas.',
  'Hagamos una pausa corta. +1 ⚡ volverá en {time}. Con Premium tú decides cuándo descansar.',
  'Tus marcas impresionan. +1 ⚡ se recuperará en {time}: con Premium sin límites.',
  '¡Tu progreso motiva! +1 ⚡ volverá en {time}. Con Premium el camino sigue abierto.',
  'Hasta los campeones necesitan recargar. +1 ⚡ volverá en {time}. ¿Seguir ya? Elige Premium.',
  '¡Lo aprendido se está fijando! +1 ⚡ se recuperará en {time}: quita límites con un toque en Premium.',
  'Respira despacio. +1 ⚡ volverá en {time}. Con Premium olvídate del temporizador.',
  'Tómate {time} para consolidar (+1 ⚡). O pásate a Premium y estudia sin límites.',
  '+1 ⚡ se recuperará en {time}. Sin pausas: con Premium casi no las echas en falta.',
  'Lo estás haciendo genial. +1 ⚡ volverá en {time}. Con Premium puedes seguir ya.',
  'Pequeña pausa: +1 ⚡ volverá en {time}. En Premium desaparecen las barreras.',
  'Vas al máximo. +1 ⚡ se recuperará en {time}: más ritmo con Premium.',
  '¡Qué ritmo! +1 ⚡ volverá en {time}. Ilimitado con Premium.',
  '+1 ⚡ listo en {time}. En Premium casi no hay techo.',
  'Tus aciertos se notan. +1 ⚡ volverá en {time}: descansa solo cuando quieras con Premium.',
  'Danos {time} para recargar (+1 ⚡). O desbloquea todo con Premium.',
  '+1 ⚡ listo en {time}. ¿Sin esperar? Prueba Premium.',
];

const ENERGY_GATE_MESSAGES_ES: ((r: { required: string; have: string }) => string)[] = [
  ({ required, have }) =>
    `Para empezar necesitas ${required} ⚡ de golpe y tienes ${have}. Recarga energía o pásate a Premium y olvídate del cupo.`,
  ({ required, have }) =>
    `Hacen falta ${required} ⚡ listos al arrancar; ahora tienes ${have}. Con Premium entras cuando quieras.`,
  ({ required, have }) =>
    `Lista seria: ${required} ⚡ seguidos. Ahora: ${have}. Con Premium sales sin hacer cola.`,
  ({ required, have }) =>
    `Para el examen hacen falta ${required} ⚡; tienes ${have}. Con Premium vas sobrado.`,
  ({ required, have }) =>
    `Se piden ${required} ⚡ y solo hay ${have}. Premium: estudias sin cupo de energía.`,
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
