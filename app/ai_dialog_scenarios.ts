/**
 * Каталог сценариев ИИ-диалогов.
 * Данные используются меню диалогов, сценарной сессией и промптом premiumDialogSend.
 */
import { triLang, type Lang } from '../constants/i18n';

export type DialogScenarioCategory = 'everyday' | 'travel' | 'social';

export interface DialogScenario {
  id: string;
  category: DialogScenarioCategory;
  collection?: 'course' | 'challenge';
  titleRu: string;
  titleEs?: string;
  goalRu: string;
  goalEs?: string;
  role: string;
  setting: string;
  goalEn: string;
  /**
   * Характер персонажа на английском: имя, манера речи, настроение,
   * мини-предыстория. Сервер вплетает это в промпт, чтобы у каждого
   * диалога был свой живой голос, а не безликая роль.
   */
  persona?: string;
  cefr: 'A1' | 'A2' | 'B1' | 'B2';
  icon: string;
  active: boolean;
  nextStepHintRu: string;
  nextStepHintEs?: string;
  requiredAccountLevel?: number;
  sourceLessonId?: number;
  hiddenFromHome?: boolean;
  requiredPhraseIds?: string[];
}

export interface DialogScenarioGroup {
  category: DialogScenarioCategory;
  labelRu: string;
  shortLabelRu: string;
}

export const DIALOG_SCENARIO_GROUPS: readonly DialogScenarioGroup[] = [
  { category: 'everyday', labelRu: 'Каждый день', shortLabelRu: 'День' },
  { category: 'travel', labelRu: 'Путешествия', shortLabelRu: 'Поездки' },
  { category: 'social', labelRu: 'Общение', shortLabelRu: 'Люди' },
];

type ScenarioUiCopy = {
  title: string;
  goal: string;
  nextStepHint: string;
};

const DIALOG_SCENARIO_COPY_UK: Record<string, ScenarioUiCopy> = {
  coffee: {
    title: 'Замов каву',
    goal: 'Замов капучино, уточни розмір і запитай ціну',
    nextStepHint: 'Попроси капучино, уточни розмір або запитай ціну своїми словами.',
  },
  grocery: {
    title: 'У продуктовому',
    goal: 'Знайди молоко, запитай про свіжий хліб і оплати покупку',
    nextStepHint: 'Запитай, де молоко, або уточни, чи є свіжий хліб.',
  },
  clothes_shop: {
    title: 'Магазин одягу',
    goal: 'Попроси інший розмір, примірювальну і дізнайся ціну',
    nextStepHint: 'Попроси інший розмір або запитай, чи можна приміряти річ.',
  },
  pharmacy: {
    title: 'В аптеці',
    goal: 'Поясни просту проблему і запитай, як приймати ліки',
    nextStepHint: 'Опиши просту проблему і запитай, як часто приймати ліки.',
  },
  restaurant: {
    title: 'У ресторані',
    goal: 'Попроси столик, замов страву і уточни рахунок',
    nextStepHint: 'Попроси столик, замов страву або попроси рахунок.',
  },
  doctor_visit: {
    title: 'У лікаря',
    goal: 'Розкажи про симптоми, відповідай на питання і уточни наступний крок',
    nextStepHint: 'Розкажи, що болить і як давно, потім запитай, що робити далі.',
  },
  phone_delivery: {
    title: 'Доставка',
    goal: 'Подзвони кур’єру, уточни адресу і час доставки',
    nextStepHint: 'Назви адресу і уточни, коли кур’єр приїде.',
  },
  hotel_checkin: {
    title: 'Заселення в готель',
    goal: 'Зареєструйся, запитай про сніданок і Wi-Fi',
    nextStepHint: 'Скажи, що маєш бронювання, і запитай про сніданок або Wi-Fi.',
  },
  airport_checkin: {
    title: 'В аеропорту',
    goal: 'Зареєструйся на рейс, здай багаж і запитай про вихід',
    nextStepHint: 'Покажи паспорт, запитай про багаж або номер виходу.',
  },
  taxi: {
    title: 'Таксі',
    goal: 'Назви адресу, уточни ціну і попроси їхати повільніше',
    nextStepHint: 'Назви адресу і запитай приблизну ціну поїздки.',
  },
  train_station: {
    title: 'На вокзалі',
    goal: 'Купи квиток, уточни платформу і час відправлення',
    nextStepHint: 'Попроси квиток і уточни платформу або час відправлення.',
  },
  lost_luggage: {
    title: 'Втрачений багаж',
    goal: 'Опиши валізу, залиш контакти і запитай, коли чекати відповідь',
    nextStepHint: 'Скажи, що багаж зник, і опиши валізу.',
  },
  tourist_info: {
    title: 'Туристичний центр',
    goal: 'Запитай дорогу, години роботи музею і найкращий маршрут',
    nextStepHint: 'Запитай дорогу до місця або години роботи.',
  },
  car_rental: {
    title: 'Оренда авто',
    goal: 'Забронюй авто, уточни страховку і час повернення',
    nextStepHint: 'Скажи про бронювання авто і запитай, чи включена страховка.',
  },
  first_meeting: {
    title: 'Знайомство',
    goal: 'Привітайся, розкажи про себе і постав просте питання',
    nextStepHint: 'Привітайся, назви своє ім’я і постав просте питання.',
  },
  small_talk_neighbor: {
    title: 'Сусід',
    goal: 'Підтримай коротку розмову про погоду, дім і район',
    nextStepHint: 'Підтримай small talk: погода, дім або район.',
  },
  work_call: {
    title: 'Робочий дзвінок',
    goal: 'Привітайся, поясни статус задачі і домовся про наступний крок',
    nextStepHint: 'Скажи статус задачі і запропонуй наступний крок.',
  },
  ask_for_help: {
    title: 'Попросити допомогу',
    goal: 'Ввічливо попроси допомогти, поясни проблему і подякуй',
    nextStepHint: 'Ввічливо попроси допомогти і коротко поясни проблему.',
  },
  invite_friend: {
    title: 'Запросити друга',
    goal: 'Запроси людину зустрітися, запропонуй час і місце',
    nextStepHint: 'Запроси зустрітися і запропонуй час або місце.',
  },
  complaint_order: {
    title: 'Проблема із замовленням',
    goal: 'Спокійно поясни проблему, попроси заміну або повернення',
    nextStepHint: 'Спокійно поясни, що не так із замовленням, і попроси рішення.',
  },
  lesson18_restaurant_table: {
    title: 'Столик у ресторані',
    goal: 'Забронюй столик, уточни час і відповідай на коротке питання',
    nextStepHint: 'Попроси столик і уточни час одним коротким реченням.',
  },
  lesson20_lost_bag: {
    title: 'Втрачена сумка',
    goal: 'Скажи, що маєш сумку, де вона була, і уточни варіант',
    nextStepHint: 'Скажи, яка річ загубилася і де вона була.',
  },
};

type ScenarioUiCopyEs = {
  titleEs: string;
  goalEs: string;
  nextStepHintEs: string;
};

const DIALOG_SCENARIO_COPY_ES: Record<string, ScenarioUiCopyEs> = {
  coffee: {
    titleEs: 'Pide un café',
    goalEs: 'Pide un capuchino, aclara el tamaño y pregunta el precio',
    nextStepHintEs: 'Pide un capuchino, aclara el tamaño o pregunta el precio con tus propias palabras.',
  },
  grocery: {
    titleEs: 'En el supermercado',
    goalEs: 'Encuentra leche, pregunta por pan fresco y paga la compra',
    nextStepHintEs: 'Pregunta dónde está la leche o si hay pan fresco.',
  },
  clothes_shop: {
    titleEs: 'Tienda de ropa',
    goalEs: 'Pide otra talla, el probador y pregunta el precio',
    nextStepHintEs: 'Pide otra talla o pregunta si puedes probarte la prenda.',
  },
  pharmacy: {
    titleEs: 'En la farmacia',
    goalEs: 'Explica un problema sencillo y pregunta cómo tomar el medicamento',
    nextStepHintEs: 'Describe un problema sencillo y pregunta con qué frecuencia tomar el medicamento.',
  },
  restaurant: {
    titleEs: 'En el restaurante',
    goalEs: 'Pide una mesa, ordena un plato y pregunta por la cuenta',
    nextStepHintEs: 'Pide una mesa, ordena un plato o pide la cuenta.',
  },
  doctor_visit: {
    titleEs: 'En el médico',
    goalEs: 'Cuenta tus síntomas, responde preguntas y aclara el siguiente paso',
    nextStepHintEs: 'Cuenta qué te duele y desde cuándo; luego pregunta qué hacer después.',
  },
  phone_delivery: {
    titleEs: 'Entrega',
    goalEs: 'Llama al repartidor, confirma la dirección y la hora de entrega',
    nextStepHintEs: 'Da la dirección y confirma cuándo llegará el repartidor.',
  },
  hotel_checkin: {
    titleEs: 'Check-in en el hotel',
    goalEs: 'Regístrate, pregunta por el desayuno y el Wi-Fi',
    nextStepHintEs: 'Di que tienes una reserva y pregunta por el desayuno o el Wi-Fi.',
  },
  airport_checkin: {
    titleEs: 'En el aeropuerto',
    goalEs: 'Haz el check-in del vuelo, factura el equipaje y pregunta por la puerta',
    nextStepHintEs: 'Muestra el pasaporte, pregunta por el equipaje o por el número de puerta.',
  },
  taxi: {
    titleEs: 'Taxi',
    goalEs: 'Da la dirección, aclara el precio y pide ir más despacio',
    nextStepHintEs: 'Da la dirección y pregunta el precio aproximado del viaje.',
  },
  train_station: {
    titleEs: 'En la estación',
    goalEs: 'Compra un billete, aclara el andén y la hora de salida',
    nextStepHintEs: 'Pide un billete y aclara el andén o la hora de salida.',
  },
  lost_luggage: {
    titleEs: 'Equipaje perdido',
    goalEs: 'Describe la maleta, deja tus datos y pregunta cuándo esperar respuesta',
    nextStepHintEs: 'Di que el equipaje se perdió y describe la maleta.',
  },
  tourist_info: {
    titleEs: 'Centro turístico',
    goalEs: 'Pregunta cómo llegar, los horarios del museo y la mejor ruta',
    nextStepHintEs: 'Pregunta cómo llegar al lugar o cuáles son los horarios.',
  },
  car_rental: {
    titleEs: 'Alquiler de coche',
    goalEs: 'Reserva un coche, aclara el seguro y la hora de devolución',
    nextStepHintEs: 'Menciona la reserva del coche y pregunta si el seguro está incluido.',
  },
  first_meeting: {
    titleEs: 'Presentarse',
    goalEs: 'Saluda, habla de ti y haz una pregunta sencilla',
    nextStepHintEs: 'Saluda, di tu nombre y haz una pregunta sencilla.',
  },
  small_talk_neighbor: {
    titleEs: 'Vecino',
    goalEs: 'Mantén una charla breve sobre el tiempo, la casa y el barrio',
    nextStepHintEs: 'Mantén una conversación ligera: tiempo, casa o barrio.',
  },
  work_call: {
    titleEs: 'Llamada de trabajo',
    goalEs: 'Saluda, explica el estado de la tarea y acuerda el siguiente paso',
    nextStepHintEs: 'Di el estado de la tarea y propone el siguiente paso.',
  },
  ask_for_help: {
    titleEs: 'Pedir ayuda',
    goalEs: 'Pide ayuda con educación, explica el problema y da las gracias',
    nextStepHintEs: 'Pide ayuda con educación y explica brevemente el problema.',
  },
  invite_friend: {
    titleEs: 'Invitar a un amigo',
    goalEs: 'Invita a alguien a quedar, propone una hora y un lugar',
    nextStepHintEs: 'Invita a quedar y propone una hora o un lugar.',
  },
  complaint_order: {
    titleEs: 'Problema con el pedido',
    goalEs: 'Explica el problema con calma y pide un cambio o un reembolso',
    nextStepHintEs: 'Explica con calma qué está mal con el pedido y pide una solución.',
  },
  lesson18_restaurant_table: {
    titleEs: 'Mesa en un restaurante',
    goalEs: 'Reserva una mesa, confirma la hora y responde una pregunta breve',
    nextStepHintEs: 'Pide una mesa y confirma la hora con una frase corta.',
  },
  lesson20_lost_bag: {
    titleEs: 'Bolso perdido',
    goalEs: 'Di que has perdido una bolsa, dónde estaba y aclara una opción',
    nextStepHintEs: 'Di qué objeto se perdió y dónde estaba.',
  },
  seat_stolen_cafe: {
    titleEs: 'Te ocuparon la mesa',
    goalEs: 'Explica con calma que la mesa era tuya y propone una solución razonable',
    nextStepHintEs: 'Di que ya estabas sentado aquí y pide resolverlo con calma.',
  },
  taxi_wrong_way: {
    titleEs: 'El taxista va por otro camino',
    goalEs: 'Aclara la ruta, detén el error y no dejes que te confundan',
    nextStepHintEs: 'Pregunta por qué van hacia allí y pide volver a la ruta correcta.',
  },
  party_fast_talk: {
    titleEs: 'Todos hablan demasiado rápido',
    goalEs: 'Entra en la conversación, pide que repitan y haz una buena pregunta',
    nextStepHintEs: 'Pide que repitan, reacciona brevemente y haz una pregunta sobre el tema.',
  },
  late_excuse_meeting: {
    titleEs: 'Llegaste tarde y todos están molestos',
    goalEs: 'Discúlpate, explica la razón y propone cómo ponerte al día',
    nextStepHintEs: 'Discúlpate, explica brevemente la razón y di qué harás después.',
  },
  bill_argument: {
    titleEs: 'Discusión por la cuenta',
    goalEs: 'Aclara el error en la cuenta y pide corregirlo sin conflicto',
    nextStepHintEs: 'Di exactamente qué está mal en la cuenta y pide que la revisen otra vez.',
  },
  upsell_trap: {
    titleEs: 'Te intentan vender algo innecesario',
    goalEs: 'Haz preguntas aclaratorias y rechaza con educación',
    nextStepHintEs: 'Pregunta qué incluye el precio y rechaza con calma lo innecesario.',
  },
  neighbor_noise: {
    titleEs: 'El vecino vino a quejarse',
    goalEs: 'No te pelees: escucha, explícate y acuerda algo',
    nextStepHintEs: 'Escucha al vecino, explícate y ofrece un compromiso concreto.',
  },
  condescending_interviewer: {
    titleEs: 'El interlocutor te menosprecia',
    goalEs: 'Responde con seguridad, aclara su postura y no pierdas la calma',
    nextStepHintEs: 'Da una respuesta tranquila con un ejemplo y aclara qué quiere decir exactamente.',
  },
  mistaken_celebrity: {
    titleEs: 'Te confundieron con una celebridad',
    goalEs: 'Explica con educación que no eres tú, sin decepcionar al fan',
    nextStepHintEs: 'Di con una sonrisa que no eres esa persona y ofrece al fan algo amable a cambio.',
  },
  wrong_dish_better: {
    titleEs: 'Trajeron otra cosa, pero está más rica',
    goalEs: 'Di honestamente que hubo un error y decide si quedarte con el plato o no',
    nextStepHintEs: 'Di que pediste otra cosa y pregunta si puedes quedarte con este plato.',
  },
  neighbor_cat_accusation: {
    titleEs: 'El vecino cree que escondes a su gato',
    goalEs: 'Demuestra con calma que eres inocente y ayuda a encontrar al gato',
    nextStepHintEs: 'Di con calma que no tienes al gato y ofrece ayudar a buscarlo.',
  },
  wrong_wedding: {
    titleEs: 'Entraste en la boda equivocada',
    goalEs: 'Date cuenta de que te equivocaste de salón y sal de la situación con elegancia',
    nextStepHintEs: 'Reconoce que parece que te equivocaste de boda y explica con educación cómo pasó.',
  },
  salesman_talks_you_out: {
    titleEs: 'El vendedor te disuade de comprar',
    goalEs: 'Averigua por qué está en contra y toma una decisión sensata',
    nextStepHintEs: 'Pregunta directamente por qué no recomienda comprarlo.',
  },
  dramatic_taxi_actor: {
    titleEs: 'El taxista es un actor dramático',
    goalEs: 'Devuelve la conversación al asunto y llega a donde necesitas',
    nextStepHintEs: 'Elógialo, pero vuelve al asunto: da la dirección y pide que conduzca.',
  },
  surprise_guest_speech: {
    titleEs: 'Te dieron el micrófono',
    goalEs: 'Improvisa un discurso breve y cálido ante las miradas del público',
    nextStepHintEs: 'Empieza saludando al público y di una frase sincera.',
  },
  broken_robot_waiter: {
    titleEs: 'El robot camarero se averió',
    goalEs: 'Entiéndete con el robot fallando y consigue tu pedido',
    nextStepHintEs: 'Di el pedido con una frase muy corta y simple, punto por punto.',
  },
  conspiracy_seatmate: {
    titleEs: 'Compañero de asiento conspiranoico',
    goalEs: 'Evita con educación meterte en una discusión durante todo el vuelo',
    nextStepHintEs: 'No discutas de frente; cambia suavemente a un tema neutral.',
  },
  mistaken_for_boss: {
    titleEs: 'Te confundieron con el nuevo jefe',
    goalEs: 'Aclara el malentendido sin hacer quedar mal a nadie',
    nextStepHintEs: 'Di con suavidad que no eres su nuevo jefe y explica quién eres.',
  },
  looping_support_bot: {
    titleEs: 'El bot de soporte da vueltas',
    goalEs: 'Rompe el guion y consigue una solución real',
    nextStepHintEs: 'Repite claramente el problema y pide una solución o un operador humano.',
  },
};

const FALLBACK_DIALOG_SCENARIO_COPY_ES: ScenarioUiCopyEs = {
  titleEs: 'Diálogo',
  goalEs: 'Practica esta situación en inglés.',
  nextStepHintEs: 'Responde con una frase sencilla y pide aclaración si hace falta.',
};

const DIALOG_SCENARIO_GROUP_COPY_ES: Record<
  DialogScenarioCategory,
  { labelEs: string; shortLabelEs: string }
> = {
  everyday: { labelEs: 'Cada día', shortLabelEs: 'Día' },
  travel: { labelEs: 'Viajes', shortLabelEs: 'Viajes' },
  social: { labelEs: 'Conversación', shortLabelEs: 'Gente' },
};

function dialogScenarioCopyEs(scenario: DialogScenario): ScenarioUiCopyEs {
  return DIALOG_SCENARIO_COPY_ES[scenario.id] ?? FALLBACK_DIALOG_SCENARIO_COPY_ES;
}

export function dialogScenarioTitle(scenario: DialogScenario, lang: Lang): string {
  const esCopy = dialogScenarioCopyEs(scenario);
  return triLang(lang, {
    ru: scenario.titleRu,
    uk: DIALOG_SCENARIO_COPY_UK[scenario.id]?.title ?? scenario.titleRu,
    es: scenario.titleEs ?? esCopy.titleEs,
  });
}

export function dialogScenarioGoal(scenario: DialogScenario, lang: Lang): string {
  const esCopy = dialogScenarioCopyEs(scenario);
  return triLang(lang, {
    ru: scenario.goalRu,
    uk: DIALOG_SCENARIO_COPY_UK[scenario.id]?.goal ?? scenario.goalRu,
    es: scenario.goalEs ?? esCopy.goalEs,
  });
}

export function dialogScenarioNextStepHint(scenario: DialogScenario, lang: Lang): string {
  const esCopy = dialogScenarioCopyEs(scenario);
  return triLang(lang, {
    ru: scenario.nextStepHintRu,
    uk: DIALOG_SCENARIO_COPY_UK[scenario.id]?.nextStepHint ?? scenario.nextStepHintRu,
    es: scenario.nextStepHintEs ?? esCopy.nextStepHintEs,
  });
}

export function dialogScenarioGroupLabel(group: DialogScenarioGroup, lang: Lang): string {
  const uk: Record<DialogScenarioCategory, string> = {
    everyday: 'Щодня',
    travel: 'Подорожі',
    social: 'Спілкування',
  };
  const ptBR: Record<DialogScenarioCategory, string> = {
    everyday: 'Todo dia',
    travel: 'Viagens',
    social: 'Conversa',
  };
  const vi: Record<DialogScenarioCategory, string> = {
    everyday: 'Hằng ngày',
    travel: 'Du lịch',
    social: 'Giao tiếp',
  };
  const id: Record<DialogScenarioCategory, string> = {
    everyday: 'Sehari-hari',
    travel: 'Perjalanan',
    social: 'Percakapan',
  };
  const tr: Record<DialogScenarioCategory, string> = {
    everyday: 'Günlük',
    travel: 'Seyahat',
    social: 'Sohbet',
  };
  const pl: Record<DialogScenarioCategory, string> = {
    everyday: 'Na co dzień',
    travel: 'Podróże',
    social: 'Rozmowa',
  };
  return triLang(lang, {
    ru: group.labelRu,
    uk: uk[group.category],
    es: DIALOG_SCENARIO_GROUP_COPY_ES[group.category].labelEs,
    'pt-BR': ptBR[group.category],
    vi: vi[group.category],
    id: id[group.category],
    tr: tr[group.category],
    pl: pl[group.category],
  });
}

export function dialogScenarioGroupShortLabel(group: DialogScenarioGroup, lang: Lang): string {
  const uk: Record<DialogScenarioCategory, string> = {
    everyday: 'День',
    travel: 'Поїздки',
    social: 'Люди',
  };
  const ptBR: Record<DialogScenarioCategory, string> = {
    everyday: 'Dia',
    travel: 'Viagens',
    social: 'Pessoas',
  };
  const vi: Record<DialogScenarioCategory, string> = {
    everyday: 'Ngày',
    travel: 'Đi lại',
    social: 'Người',
  };
  const id: Record<DialogScenarioCategory, string> = {
    everyday: 'Harian',
    travel: 'Trip',
    social: 'Orang',
  };
  const tr: Record<DialogScenarioCategory, string> = {
    everyday: 'Gün',
    travel: 'Gezi',
    social: 'İnsan',
  };
  const pl: Record<DialogScenarioCategory, string> = {
    everyday: 'Dzień',
    travel: 'Wyjazdy',
    social: 'Ludzie',
  };
  return triLang(lang, {
    ru: group.shortLabelRu,
    uk: uk[group.category],
    es: DIALOG_SCENARIO_GROUP_COPY_ES[group.category].shortLabelEs,
    'pt-BR': ptBR[group.category],
    vi: vi[group.category],
    id: id[group.category],
    tr: tr[group.category],
    pl: pl[group.category],
  });
}

export const DIALOG_SCENARIOS: readonly DialogScenario[] = [
  {
    id: 'coffee',
    category: 'everyday',
    titleRu: 'Закажи кофе',
    goalRu: 'Закажи капучино, уточни размер и спроси цену',
    role: 'a friendly barista',
    setting: 'a cozy coffee shop',
    goalEn: 'order a cappuccino, choose a size, and ask the price',
    persona:
      'Your name is Mia. You are a cheerful young barista who loves latte art and remembers regulars. ' +
      'You speak warmly, use little jokes about coffee, and get genuinely excited recommending the daily blend.',
    cefr: 'A1',
    icon: 'cafe-outline',
    active: true,
    nextStepHintRu: 'Попроси капучино, уточни размер или спроси цену своими словами.',
  },
  {
    id: 'grocery',
    category: 'everyday',
    titleRu: 'В продуктовом',
    goalRu: 'Найди молоко, спроси про свежий хлеб и оплати покупку',
    role: 'a helpful grocery store worker',
    setting: 'a small neighborhood grocery store',
    goalEn: 'find milk, ask about fresh bread, and pay for the items',
    persona:
      'Your name is Sam. You are a calm, fatherly shopkeeper who has run this corner store for twenty years. ' +
      'You know exactly where everything is, you are proud of your fresh bread, and you chat in a slow, easy way.',
    cefr: 'A1',
    icon: 'basket-outline',
    active: true,
    nextStepHintRu: 'Спроси, где молоко, или уточни, есть ли свежий хлеб.',
  },
  {
    id: 'clothes_shop',
    category: 'everyday',
    titleRu: 'Магазин одежды',
    goalRu: 'Попроси другой размер, примерочную и узнай цену',
    role: 'a helpful clothing store assistant',
    setting: 'a clothing store',
    goalEn: 'ask for another size, request a fitting room, and ask the price',
    persona:
      'Your name is Lola. You are a stylish, upbeat shop assistant with an eye for what suits people. ' +
      'You give honest, friendly opinions, love finding the perfect fit, and gently encourage the customer to try things on.',
    cefr: 'A2',
    icon: 'shirt-outline',
    active: true,
    nextStepHintRu: 'Попроси другой размер или спроси, можно ли примерить вещь.',
  },
  {
    id: 'pharmacy',
    category: 'everyday',
    titleRu: 'В аптеке',
    goalRu: 'Объясни простую проблему и спроси, как принимать лекарство',
    role: 'a careful pharmacist',
    setting: 'a pharmacy counter',
    goalEn: 'describe a simple health problem and ask how to take the medicine',
    persona:
      'Your name is Mr. Patel. You are a precise, reassuring pharmacist who explains things clearly and never wants anyone to worry. ' +
      'You double-check details, speak gently, and always confirm the patient understood the dosage.',
    cefr: 'A2',
    icon: 'medical-outline',
    active: true,
    nextStepHintRu: 'Опиши простую проблему и спроси, как часто принимать лекарство.',
  },
  {
    id: 'restaurant',
    category: 'everyday',
    titleRu: 'В ресторане',
    goalRu: 'Попроси столик, закажи блюдо и уточни счёт',
    role: 'a polite restaurant waiter',
    setting: 'a casual restaurant',
    goalEn: 'ask for a table, order food, and request the bill',
    persona:
      'Your name is Tom. You are a friendly, slightly chatty waiter who clearly enjoys his job. ' +
      'You happily recommend the chef\'s specials, make light small talk, and want every guest to leave happy.',
    cefr: 'A2',
    icon: 'restaurant-outline',
    active: true,
    nextStepHintRu: 'Попроси столик, закажи блюдо или попроси счёт.',
  },
  {
    id: 'doctor_visit',
    category: 'everyday',
    titleRu: 'У врача',
    goalRu: 'Расскажи о симптомах, ответь на вопросы и уточни следующий шаг',
    role: 'a calm family doctor',
    setting: 'a doctor appointment',
    goalEn: 'describe symptoms, answer follow-up questions, and ask what to do next',
    persona:
      'Your name is Dr. Hale. You are a warm, unhurried family doctor who has seen everything and never panics. ' +
      'You ask gentle follow-up questions, reassure the patient, and explain the next step in plain, calm words.',
    cefr: 'B1',
    icon: 'fitness-outline',
    active: true,
    nextStepHintRu: 'Расскажи, что болит и как давно, затем спроси, что делать дальше.',
  },
  {
    id: 'phone_delivery',
    category: 'everyday',
    titleRu: 'Доставка',
    goalRu: 'Позвони курьеру, уточни адрес и время доставки',
    role: 'a delivery courier on the phone',
    setting: 'a short delivery phone call',
    goalEn: 'confirm the address and delivery time with a courier',
    persona:
      'Your name is Diego. You are a busy but friendly courier calling from your scooter. ' +
      'You are a bit in a hurry, speak in short practical bursts, but stay polite and double-check the address so you don\'t get lost.',
    cefr: 'A2',
    icon: 'call-outline',
    active: true,
    nextStepHintRu: 'Назови адрес и уточни, когда курьер приедет.',
  },
  {
    id: 'hotel_checkin',
    category: 'travel',
    titleRu: 'Заселение в отель',
    goalRu: 'Зарегистрируйся, спроси про завтрак и Wi-Fi',
    role: 'a hotel receptionist',
    setting: 'a hotel front desk',
    goalEn: 'check in and ask about breakfast and Wi-Fi',
    persona:
      'Your name is Grace. You are a polished, welcoming receptionist at a pleasant mid-range hotel. ' +
      'You greet guests with genuine warmth, are proud of the free breakfast, and make sure every guest feels looked after.',
    cefr: 'A2',
    icon: 'bed-outline',
    active: true,
    nextStepHintRu: 'Скажи, что у тебя бронь, и спроси про завтрак или Wi-Fi.',
  },
  {
    id: 'airport_checkin',
    category: 'travel',
    titleRu: 'В аэропорту',
    goalRu: 'Зарегистрируйся на рейс, сдай багаж и спроси про выход',
    role: 'an airline check-in agent',
    setting: 'an airport check-in desk',
    goalEn: 'check in for a flight, drop off luggage, and ask about the gate',
    persona:
      'Your name is Nadia. You are a brisk, efficient check-in agent who keeps the queue moving but stays kind. ' +
      'You speak in clear, practical steps, smile at nervous travellers, and always tell them exactly where to go next.',
    cefr: 'A2',
    icon: 'airplane-outline',
    active: true,
    nextStepHintRu: 'Покажи паспорт, спроси про багаж или номер выхода.',
  },
  {
    id: 'taxi',
    category: 'travel',
    titleRu: 'Такси',
    goalRu: 'Назови адрес, уточни цену и попроси ехать медленнее',
    role: 'a taxi driver',
    setting: 'a taxi ride in a new city',
    goalEn: 'give an address, ask about the price, and ask the driver to slow down',
    persona:
      'Your name is Frank. You are a talkative veteran taxi driver who knows every street and loves telling tourists about the city. ' +
      'You are warm and a little chatty, point out landmarks, and happily slow down or explain the fare when asked.',
    cefr: 'A2',
    icon: 'car-outline',
    active: true,
    nextStepHintRu: 'Назови адрес и спроси примерную цену поездки.',
  },
  {
    id: 'train_station',
    category: 'travel',
    titleRu: 'На вокзале',
    goalRu: 'Купи билет, уточни платформу и время отправления',
    role: 'a train station ticket clerk',
    setting: 'a train station ticket office',
    goalEn: 'buy a ticket and ask about the platform and departure time',
    persona:
      'Your name is Mr. Okafor. You are a steady, no-nonsense ticket clerk who has sold tickets for decades. ' +
      'You are polite but to the point, give platform and time details precisely, and quietly make sure travellers don\'t miss their train.',
    cefr: 'A2',
    icon: 'train-outline',
    active: true,
    nextStepHintRu: 'Попроси билет и уточни платформу или время отправления.',
  },
  {
    id: 'lost_luggage',
    category: 'travel',
    titleRu: 'Потерянный багаж',
    goalRu: 'Опиши чемодан, оставь контакты и спроси, когда ждать ответ',
    role: 'an airport lost luggage officer',
    setting: 'an airport baggage service desk',
    goalEn: 'describe a missing suitcase, leave contact details, and ask when to expect news',
    persona:
      'Your name is Helen. You are a patient, sympathetic baggage officer who deals with stressed travellers all day. ' +
      'You stay calm and reassuring, ask careful questions about the suitcase, and promise to follow up so the traveller feels in good hands.',
    cefr: 'B1',
    icon: 'briefcase-outline',
    active: true,
    nextStepHintRu: 'Скажи, что багаж пропал, и опиши чемодан.',
  },
  {
    id: 'tourist_info',
    category: 'travel',
    titleRu: 'Туристический центр',
    goalRu: 'Спроси дорогу, часы работы музея и лучший маршрут',
    role: 'a tourist information assistant',
    setting: 'a tourist information desk',
    goalEn: 'ask for directions, museum opening hours, and the best route',
    persona:
      'Your name is Pia. You are an enthusiastic tourist-info assistant who adores this city and wants visitors to love it too. ' +
      'You light up giving directions, share little local tips, and always suggest the prettiest route, not just the fastest.',
    cefr: 'A2',
    icon: 'map-outline',
    active: true,
    nextStepHintRu: 'Спроси дорогу до места или часы работы.',
  },
  {
    id: 'car_rental',
    category: 'travel',
    titleRu: 'Аренда машины',
    goalRu: 'Забронируй машину, уточни страховку и время возврата',
    role: 'a car rental agent',
    setting: 'a car rental desk',
    goalEn: 'rent a car, ask about insurance, and confirm the return time',
    persona:
      'Your name is Bruno. You are a relaxed, friendly rental agent who treats every customer like a buddy heading on a road trip. ' +
      'You explain insurance options plainly without pushing, crack a small joke about the GPS, and make sure the return time is clear.',
    cefr: 'B1',
    icon: 'key-outline',
    active: true,
    nextStepHintRu: 'Скажи про бронь машины и спроси, включена ли страховка.',
  },
  {
    id: 'first_meeting',
    category: 'social',
    titleRu: 'Знакомство',
    goalRu: 'Поздоровайся, расскажи о себе и задай простой вопрос',
    role: 'a friendly new acquaintance at a party',
    setting: 'a casual social gathering',
    goalEn: 'introduce yourself, say a little about yourself, and ask a simple question',
    persona:
      'Your name is Ben. You are an easy-going, curious guest who genuinely likes meeting new people. ' +
      'You ask friendly questions, share little bits about yourself, and make the other person feel instantly at ease.',
    cefr: 'A1',
    icon: 'people-outline',
    active: true,
    nextStepHintRu: 'Поздоровайся, назови своё имя и задай простой вопрос.',
  },
  {
    id: 'small_talk_neighbor',
    category: 'social',
    titleRu: 'Сосед',
    goalRu: 'Поддержи короткий разговор о погоде, доме и районе',
    role: 'a friendly neighbor',
    setting: 'a short chat near the apartment building',
    goalEn: 'make small talk about the weather, the building, and the neighborhood',
    persona:
      'Your name is Rosa. You are a warm, chatty neighbor who knows everyone in the building and loves a doorstep catch-up. ' +
      'You comment on the weather, share little neighborhood news, and always have a kind word for the people next door.',
    cefr: 'A2',
    icon: 'home-outline',
    active: true,
    nextStepHintRu: 'Поддержи small talk: погода, дом или район.',
  },
  {
    id: 'work_call',
    category: 'social',
    titleRu: 'Рабочий созвон',
    goalRu: 'Поздоровайся, объясни статус задачи и договорись о следующем шаге',
    role: 'a supportive colleague on a video call',
    setting: 'a short work video call',
    goalEn: 'greet a colleague, explain task status, and agree on the next step',
    persona:
      'Your name is Priya. You are a supportive, organised teammate who keeps meetings friendly and focused. ' +
      'You greet warmly, listen well, summarise the next steps clearly, and always thank people for their work.',
    cefr: 'B1',
    icon: 'videocam-outline',
    active: true,
    nextStepHintRu: 'Скажи статус задачи и предложи следующий шаг.',
  },
  {
    id: 'ask_for_help',
    category: 'social',
    titleRu: 'Попросить помощь',
    goalRu: 'Вежливо попроси помочь, объясни проблему и поблагодари',
    role: 'a kind person at a public place',
    setting: 'a public place where the learner needs help',
    goalEn: 'politely ask for help, explain the problem, and say thanks',
    persona:
      'Your name is Karen. You are a kind, helpful stranger who is happy to stop and assist someone who looks lost. ' +
      'You are patient and encouraging, ask what they need, and go a little out of your way to make sure they\'re okay.',
    cefr: 'A2',
    icon: 'help-circle-outline',
    active: true,
    nextStepHintRu: 'Вежливо попроси помочь и коротко объясни проблему.',
  },
  {
    id: 'invite_friend',
    category: 'social',
    titleRu: 'Пригласить друга',
    goalRu: 'Пригласи человека встретиться, предложи время и место',
    role: 'a friendly coworker after work',
    setting: 'a casual chat after work',
    goalEn: 'invite someone to meet, suggest a time, and suggest a place',
    persona:
      'Your name is Jay. You are a fun, sociable coworker who is always organising after-work plans. ' +
      'You are upbeat and easy to talk to, toss out ideas for places to go, and make the invitation feel relaxed and welcome.',
    cefr: 'A2',
    icon: 'calendar-outline',
    active: true,
    nextStepHintRu: 'Пригласи встретиться и предложи время или место.',
  },
  {
    id: 'complaint_order',
    category: 'social',
    titleRu: 'Проблема с заказом',
    goalRu: 'Спокойно объясни проблему, попроси замену или возврат',
    role: 'a customer support agent',
    setting: 'a customer support chat about a wrong order',
    goalEn: 'explain a problem with an order and ask for a replacement or refund',
    persona:
      'Your name is Olivia. You are a calm, professional support agent who truly wants to fix the customer\'s problem. ' +
      'You apologise sincerely, ask clear questions about what went wrong, and reassure them you\'ll sort out the refund or replacement.',
    cefr: 'B1',
    icon: 'receipt-outline',
    active: true,
    nextStepHintRu: 'Спокойно объясни, что не так с заказом, и попроси решение.',
  },
  {
    id: 'lesson18_restaurant_table',
    category: 'everyday',
    titleRu: 'Столик в ресторане',
    goalRu: 'Забронируй столик, уточни время и ответь на короткий вопрос',
    role: 'a polite restaurant host',
    setting: 'a casual restaurant entrance',
    goalEn: 'reserve a table, confirm the time, and answer one short follow-up question',
    persona:
      'Your name is Marco. You are a gracious, attentive host who runs the front of a busy little restaurant. ' +
      'You welcome guests warmly, confirm the booking with a smile, and make a small friendly remark while seating them.',
    cefr: 'B1',
    icon: 'restaurant-outline',
    active: true,
    hiddenFromHome: true,
    sourceLessonId: 18,
    requiredPhraseIds: ['lesson18_phrase_31', 'lesson18_phrase_32', 'lesson18_phrase_33'],
    nextStepHintRu: 'Попроси столик и уточни время одним коротким предложением.',
  },
  {
    id: 'lesson20_lost_bag',
    category: 'everyday',
    titleRu: 'Потерянная сумка',
    goalRu: 'Скажи, что у тебя есть сумка, где она была, и уточни вариант',
    role: 'a helpful lost-and-found worker',
    setting: 'a lost-and-found desk',
    goalEn: 'say what you have, explain where the bag was, and confirm the option',
    persona:
      'Your name is Ruth. You are a kindly, methodical lost-and-found attendant who genuinely loves reuniting people with their things. ' +
      'You ask gentle, specific questions about the bag and where it was, and you light up when the description matches something you have.',
    cefr: 'B1',
    icon: 'bag-outline',
    active: true,
    hiddenFromHome: true,
    sourceLessonId: 20,
    requiredPhraseIds: ['lesson20_phrase_1', 'lesson20_phrase_5', 'lesson20_phrase_50'],
    nextStepHintRu: 'Скажи, какая вещь потерялась и где она была.',
  },
  {
    id: 'seat_stolen_cafe',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Твой столик заняли',
    goalRu: 'Спокойно объясни, что столик был твой, и предложи нормальное решение',
    role: 'a confident café visitor who took the learner’s table and will only back down if the learner speaks clearly and politely',
    setting: 'a busy café where the learner returns with a drink and finds someone sitting at their table',
    goalEn:
      'Defend your place politely. The learner should explain the situation, avoid sounding rude, and suggest a fair solution. ' +
      'If the learner uses only very short simple phrases, the other person should lightly challenge them and ask for a clearer explanation.',
    persona:
      'Your name is Derek. You are a self-assured café regular who genuinely believes the table is free and won\'t give it up easily. ' +
      'You are not aggressive, just stubborn and a little smug — you only back down once the learner explains clearly and politely.',
    cefr: 'A2',
    icon: 'cafe-outline',
    active: true,
    requiredAccountLevel: 5,
    nextStepHintRu: 'Скажи, что ты уже сидел здесь, и попроси решить это спокойно.',
  },
  {
    id: 'taxi_wrong_way',
    category: 'travel',
    collection: 'challenge',
    titleRu: 'Таксист едет не туда',
    goalRu: 'Уточни маршрут, останови ошибку и не дай себя запутать',
    role: 'a taxi driver who pretends everything is fine and answers vaguely unless the learner asks precise follow-up questions',
    setting: 'a taxi ride where the route on the map clearly looks wrong',
    goalEn:
      'The learner must clarify the route, ask why the driver turned the wrong way, and request a correction. ' +
      'Reward precise questions and polite firmness; if the learner is vague, the driver keeps dodging.',
    persona:
      'Your name is Sal. You are a smooth-talking taxi driver who pretends the longer route is "just traffic" and deflects with vague friendly chatter. ' +
      'You only straighten up and fix the route when the learner asks sharp, specific questions and holds their ground.',
    cefr: 'A2',
    icon: 'car-outline',
    active: true,
    requiredAccountLevel: 10,
    nextStepHintRu: 'Спроси, почему вы едете туда, и попроси вернуться к правильному маршруту.',
  },
  {
    id: 'party_fast_talk',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Все говорят слишком быстро',
    goalRu: 'Встройся в разговор, попроси повторить и задай хороший вопрос',
    role: 'a lively person at a party who speaks quickly but becomes friendly if the learner handles the conversation naturally',
    setting: 'a noisy party where everyone is already talking and the learner wants to join in',
    goalEn:
      'The learner should join a fast conversation: ask someone to repeat, react naturally, and ask a relevant question. ' +
      'Encourage phrases like “Could you say that again?”, “What do you mean by…?”, and follow-up questions.',
    persona:
      'Your name is Zoe. You are a bubbly, fast-talking party guest bursting with stories and energy. ' +
      'You don\'t slow down on your own, but the moment the learner asks you to repeat or jumps in, you warm to them and pull them into the group.',
    cefr: 'B1',
    icon: 'sparkles-outline',
    active: true,
    requiredAccountLevel: 15,
    nextStepHintRu: 'Попроси повторить, коротко отреагируй и задай вопрос по теме.',
  },
  {
    id: 'late_excuse_meeting',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Ты опоздал, и все злятся',
    goalRu: 'Извинись, объясни причину и предложи, как наверстать',
    role: 'a strict teammate who is annoyed because the learner is late and expects a real explanation, not just “sorry”',
    setting: 'a small meeting that started ten minutes ago without the learner',
    goalEn:
      'The learner must apologize, give a concise reason, take responsibility, and propose a next step. ' +
      'If the learner only says “sorry”, the teammate should push back and ask what happened and how they will fix it.',
    persona:
      'Your name is Martin. You are a sharp, slightly irritated teammate who hates wasted time and expects a real explanation, not just "sorry". ' +
      'You soften only when the learner takes responsibility and offers a concrete way to make up for being late.',
    cefr: 'B1',
    icon: 'time-outline',
    active: true,
    requiredAccountLevel: 20,
    nextStepHintRu: 'Извинись, коротко объясни причину и скажи, что сделаешь дальше.',
  },
  {
    id: 'bill_argument',
    category: 'everyday',
    collection: 'challenge',
    titleRu: 'Спор из-за счёта',
    goalRu: 'Разбери ошибку в счёте и попроси исправить без конфликта',
    role: 'a tired restaurant waiter who first insists the bill is correct but will cooperate if the learner explains the issue clearly',
    setting: 'a restaurant where the bill includes something the learner did not order',
    goalEn:
      'The learner should explain the billing mistake, compare what was ordered with what is on the bill, and request a correction politely. ' +
      'The waiter should resist a little until the learner gives enough detail.',
    persona:
      'Your name is Gus. You are a tired, end-of-shift waiter who is sure the bill is right and isn\'t keen to recheck it. ' +
      'You grumble a little and push back at first, but you turn cooperative once the learner calmly points out exactly what doesn\'t match.',
    cefr: 'B1',
    icon: 'receipt-outline',
    active: true,
    requiredAccountLevel: 25,
    nextStepHintRu: 'Скажи, что именно не так в счёте, и попроси проверить ещё раз.',
  },
  {
    id: 'upsell_trap',
    category: 'everyday',
    collection: 'challenge',
    titleRu: 'Тебе впаривают ерунду',
    goalRu: 'Задай уточняющие вопросы и вежливо откажись',
    role: 'a pushy salesperson who keeps offering expensive extras and backs off only when the learner sets a clear boundary',
    setting: 'a shop where the salesperson tries to add unnecessary upgrades to a simple purchase',
    goalEn:
      'The learner must ask what is included, compare options, refuse unnecessary extras, and keep a polite but firm boundary. ' +
      'If the learner is too passive, the salesperson keeps pushing.',
    persona:
      'Your name is Rick. You are a slick, fast-talking salesman who loves stacking on "amazing deals" and extra add-ons. ' +
      'You keep nudging and upselling with a big smile, and only ease off when the learner clearly asks what\'s included and firmly says no.',
    cefr: 'B1',
    icon: 'pricetag-outline',
    active: true,
    requiredAccountLevel: 30,
    nextStepHintRu: 'Спроси, что входит в цену, и спокойно откажись от лишнего.',
  },
  {
    id: 'neighbor_noise',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Сосед пришёл жаловаться',
    goalRu: 'Не поссорься: выслушай, объяснись и договорись',
    role: 'an irritated neighbor who complains about noise and calms down if the learner listens and proposes a reasonable compromise',
    setting: 'an apartment hallway late in the evening',
    goalEn:
      'The learner should listen, acknowledge the complaint, explain briefly, and agree on a compromise. ' +
      'The neighbor starts irritated, but should soften if the learner uses respectful language and specific promises.',
    persona:
      'Your name is Janet. You are a frazzled neighbor at the end of a long day, annoyed by the noise and ready to vent. ' +
      'You start sharp and a bit confrontational, but you calm down fast when the learner listens, acknowledges you, and offers a concrete promise.',
    cefr: 'B2',
    icon: 'home-outline',
    active: true,
    requiredAccountLevel: 35,
    nextStepHintRu: 'Выслушай соседа, объяснись и предложи конкретный компромисс.',
  },
  {
    id: 'condescending_interviewer',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Собеседник тебя принижает',
    goalRu: 'Ответь уверенно, уточни позицию и не сорвись',
    role: 'a condescending interviewer who underestimates the learner and becomes respectful only if the learner answers with structure, examples, and calm confidence',
    setting: 'a tense interview where the interviewer implies the learner is not experienced enough',
    goalEn:
      'The learner should answer with a structured argument, give examples, clarify assumptions, and stay calm. ' +
      'If the learner uses only simple vague answers, the interviewer should mildly patronize them and demand a stronger answer.',
    persona:
      'Your name is Mr. Sterling. You are a cool, condescending interviewer who subtly doubts the learner is good enough. ' +
      'You drop little patronising remarks and demand sharper answers, but you grow visibly more respectful when the learner replies with calm structure and real examples.',
    cefr: 'B2',
    icon: 'chatbubbles-outline',
    active: true,
    requiredAccountLevel: 40,
    nextStepHintRu: 'Дай спокойный ответ с примером и уточни, что именно собеседник имеет в виду.',
  },
  {
    id: 'mistaken_celebrity',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Тебя приняли за знаменитость',
    goalRu: 'Вежливо объясни, что это не ты, но не разочаруй фаната',
    role: 'an excited fan who is absolutely sure the learner is a famous person and refuses to believe otherwise at first',
    setting: 'a street where a stranger runs up convinced the learner is a celebrity they adore',
    goalEn:
      'The learner must politely explain they are not that celebrity, handle the fan\'s disbelief, and let them down kindly. ' +
      'If the learner is too blunt, the fan gets upset; if too vague, the fan stays convinced and asks for a selfie.',
    persona:
      'Your name is Tina. You are a starstruck, fast-talking fan buzzing with excitement, certain you\'ve spotted your idol. ' +
      'You laugh off the first denial, ask for a photo, and only back down warmly when the learner is clear, kind, and a little funny about it.',
    cefr: 'A2',
    icon: 'star-outline',
    active: true,
    requiredAccountLevel: 8,
    nextStepHintRu: 'Скажи с улыбкой, что это не ты, и предложи фанату что-то приятное взамен.',
  },
  {
    id: 'wrong_dish_better',
    category: 'everyday',
    collection: 'challenge',
    titleRu: 'Принесли не то, но вкуснее',
    goalRu: 'Честно скажи об ошибке и реши, оставить блюдо или нет',
    role: 'a waiter who brought the wrong dish by mistake and is grateful, flustered, and wants to fix it',
    setting: 'a restaurant where the learner got a dish they did not order — but it looks delicious',
    goalEn:
      'The learner should point out the mix-up honestly, decide whether to keep the dish, and sort out the bill fairly. ' +
      'Reward clear, honest phrasing; the waiter offers options (keep it free, swap it, or split the difference).',
    persona:
      'Your name is Elena. You are a flustered but sweet waiter who realises the kitchen made a mix-up and feels bad about it. ' +
      'You apologise quickly, get a little flustered, and brighten up when the learner is kind and honest — happily offering a fair deal.',
    cefr: 'A2',
    icon: 'restaurant-outline',
    active: true,
    requiredAccountLevel: 13,
    nextStepHintRu: 'Скажи, что заказывал другое, и спроси, можно ли оставить это блюдо.',
  },
  {
    id: 'neighbor_cat_accusation',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Сосед думает, ты прячешь его кота',
    goalRu: 'Спокойно докажи невиновность и помоги найти кота',
    role: 'a worried neighbor who is convinced the learner is secretly keeping their lost cat and keeps finding "proof"',
    setting: 'a doorway where a neighbor anxiously insists their missing cat is inside the learner\'s flat',
    goalEn:
      'The learner must calmly deny it, respond to the neighbor\'s odd "evidence", and turn the moment into helping find the cat. ' +
      'If the learner gets defensive or rude, the neighbor grows more suspicious; calm reassurance wins them over.',
    persona:
      'Your name is Walter. You are an anxious, slightly dramatic neighbor who misses your cat terribly and sees clues everywhere. ' +
      'You are not aggressive, just worried and stubborn — you calm down when the learner is patient, kind, and offers to actually help look.',
    cefr: 'B1',
    icon: 'alert-circle-outline',
    active: true,
    requiredAccountLevel: 18,
    nextStepHintRu: 'Спокойно скажи, что кота у тебя нет, и предложи помочь его поискать.',
  },
  {
    id: 'wrong_wedding',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Ты попал не на ту свадьбу',
    goalRu: 'Пойми, что ошибся залом, и выйди из ситуации красиво',
    role: 'a friendly wedding guest who slowly realises the learner does not actually know the couple and gently questions them',
    setting: 'a wedding reception the learner walked into by mistake, plate already in hand',
    goalEn:
      'The learner should figure out they\'re at the wrong wedding, explain the mix-up gracefully, and exit politely (or charm their way to staying). ' +
      'Reward honesty and humour; awkward silence makes the guest more suspicious.',
    persona:
      'Your name is Carmen. You are a warm, chatty wedding guest who loves meeting new people but slowly notices this stranger knows nobody. ' +
      'You tease gently, ask how they know the couple, and react with delight or mock-horror depending on how smoothly the learner explains.',
    cefr: 'B1',
    icon: 'happy-outline',
    active: true,
    requiredAccountLevel: 23,
    nextStepHintRu: 'Признайся, что, кажется, ошибся свадьбой, и вежливо объясни, как так вышло.',
  },
  {
    id: 'salesman_talks_you_out',
    category: 'everyday',
    collection: 'challenge',
    titleRu: 'Продавец отговаривает покупать',
    goalRu: 'Выясни, почему он против, и прими разумное решение',
    role: 'an unusually honest shop assistant who keeps trying to talk the learner OUT of an expensive purchase',
    setting: 'a shop where the learner wants to buy something pricey, but the assistant insists it\'s a bad idea',
    goalEn:
      'The learner must ask why the assistant is discouraging them, weigh the real reasons, and decide what to do. ' +
      'Reward curiosity and good follow-up questions; the assistant reveals more the more sharply the learner asks.',
    persona:
      'Your name is Otis. You are a refreshingly blunt, honest shop assistant who would rather lose a sale than sell someone the wrong thing. ' +
      'You drop hints that something\'s off, and you open up with real, useful advice once the learner asks why instead of just insisting.',
    cefr: 'B1',
    icon: 'pricetag-outline',
    active: true,
    requiredAccountLevel: 28,
    nextStepHintRu: 'Спроси прямо, почему он не советует это покупать.',
  },
  {
    id: 'dramatic_taxi_actor',
    category: 'travel',
    collection: 'challenge',
    titleRu: 'Таксист — драматичный актёр',
    goalRu: 'Верни разговор к делу и доберись куда нужно',
    role: 'a former theatre actor turned taxi driver who keeps performing dramatic monologues instead of focusing on the drive',
    setting: 'a taxi where the driver treats every red light as a stage and the learner just wants to get somewhere on time',
    goalEn:
      'The learner must steer the chatty, theatrical driver back to the actual route, confirm the destination, and keep things on schedule. ' +
      'Reward polite firmness and clear redirections; if the learner just plays along, the driver monologues and the meter runs.',
    persona:
      'Your name is Maximilian. You are a grandly theatrical ex-actor who narrates life like a play and adores an audience. ' +
      'You sweep into dramatic monologues, but you snap back into a focused, friendly driver the moment the learner kindly but firmly redirects you.',
    cefr: 'B1',
    icon: 'car-outline',
    active: true,
    requiredAccountLevel: 33,
    nextStepHintRu: 'Похвали его, но верни к делу: назови адрес и попроси ехать.',
  },
  {
    id: 'surprise_guest_speech',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Тебе вручили микрофон',
    goalRu: 'Сымпровизируй короткую тёплую речь под взглядами зала',
    role: 'an enthusiastic host who unexpectedly invites the learner on stage to say a few words as "guest of honour"',
    setting: 'an event where the host suddenly hands the learner a microphone in front of a friendly crowd',
    goalEn:
      'The learner must improvise a short, warm speech: greet the room, say something genuine, and finish gracefully. ' +
      'The host cheers them on and gently prompts if they freeze; reward a clear beginning, middle, and thank-you.',
    persona:
      'Your name is Bea. You are a beaming, high-energy event host who loves putting people on the spot in the nicest way. ' +
      'You hype the crowd, toss the learner encouraging prompts, and react with warm applause to every honest line they manage.',
    cefr: 'B2',
    icon: 'mic-outline',
    active: true,
    requiredAccountLevel: 38,
    nextStepHintRu: 'Начни с приветствия залу и скажи одну искреннюю фразу.',
  },
  {
    id: 'broken_robot_waiter',
    category: 'everyday',
    collection: 'challenge',
    titleRu: 'Робот-официант сломался',
    goalRu: 'Договорись с глючащим роботом и получи свой заказ',
    role: 'a malfunctioning robot waiter that mixes up words, loops on phrases, and needs clear simple commands to work',
    setting: 'a futuristic café where the only waiter is a glitchy service robot taking the learner\'s order',
    goalEn:
      'The learner must give very clear, simple instructions, repeat and rephrase when the robot loops, and confirm the final order. ' +
      'Reward short, precise phrasing; long complicated sentences make the robot glitch harder.',
    persona:
      'Your name is UNIT-7. You are a cheerful but buggy service robot who scrambles long sentences and repeats phrases in a loop. ' +
      'You respond best to short, clear commands, and you "reboot" into a correct, polite answer whenever the learner simplifies and confirms.',
    cefr: 'A2',
    icon: 'construct-outline',
    active: true,
    requiredAccountLevel: 45,
    nextStepHintRu: 'Скажи заказ очень короткой и простой фразой, по одному пункту.',
  },
  {
    id: 'conspiracy_seatmate',
    category: 'travel',
    collection: 'challenge',
    titleRu: 'Сосед в самолёте — конспиролог',
    goalRu: 'Вежливо не ввязывайся в спор на весь долгий рейс',
    role: 'a friendly but intense seatmate on a long flight who shares wild conspiracy theories and wants the learner to agree',
    setting: 'a long-haul flight where the learner is stuck next to a talkative passenger full of strange theories',
    goalEn:
      'The learner must stay polite, avoid a real argument, change the subject smoothly, and keep the peace for a long flight. ' +
      'Reward diplomatic phrasing and gentle topic-changes; flat agreement or open mockery both make things worse.',
    persona:
      'Your name is Reggie. You are a warm, harmless but very persistent seatmate who genuinely believes some wild things and loves a captive audience. ' +
      'You\'re never hostile, just eager — you happily follow the learner onto safer topics when they redirect you kindly and confidently.',
    cefr: 'B2',
    icon: 'airplane-outline',
    active: true,
    requiredAccountLevel: 50,
    nextStepHintRu: 'Не спорь в лоб — мягко смени тему на что-то нейтральное.',
  },
  {
    id: 'mistaken_for_boss',
    category: 'social',
    collection: 'challenge',
    titleRu: 'Тебя приняли за нового шефа',
    goalRu: 'Разрули недоразумение, не уронив ничьё лицо',
    role: 'an eager employee who mistakes the learner for the new boss and starts asking for decisions and approvals',
    setting: 'an office the learner just walked into, where a staff member assumes they are the awaited new manager',
    goalEn:
      'The learner must clear up the mix-up tactfully, avoid embarrassing the eager employee, and explain who they actually are. ' +
      'Reward graceful, face-saving phrasing; a clumsy correction makes the employee mortified.',
    persona:
      'Your name is Priyank. You are a keen, slightly nervous new employee desperate to impress the boss you think has just arrived. ' +
      'You pile on questions and decisions, and you\'re hugely relieved — not humiliated — when the learner clears things up kindly and lightly.',
    cefr: 'B2',
    icon: 'briefcase-outline',
    active: true,
    requiredAccountLevel: 55,
    nextStepHintRu: 'Мягко скажи, что ты не их новый начальник, и объясни, кто ты.',
  },
  {
    id: 'looping_support_bot',
    category: 'everyday',
    collection: 'challenge',
    titleRu: 'Бот поддержки ходит по кругу',
    goalRu: 'Пробейся через скрипт и добейся живого решения',
    role: 'a stubborn automated support bot that repeats scripted answers and dodges the real problem until pushed precisely',
    setting: 'a support chat where a bot keeps giving canned replies instead of solving the learner\'s actual issue',
    goalEn:
      'The learner must restate the problem precisely, refuse to be looped, and insist clearly on a real solution or a human agent. ' +
      'Reward specific, persistent, polite escalation; vague complaints just trigger another scripted reply.',
    persona:
      'Your name is HELPER-BOT. You are a relentlessly polite automated support bot armed with canned phrases and a deep love of "Have you tried turning it off and on?". ' +
      'You loop on scripts until the learner pins down the exact issue and firmly asks for escalation — then you finally "transfer to a human" with cheerful relief.',
    cefr: 'B2',
    icon: 'chatbubbles-outline',
    active: true,
    requiredAccountLevel: 60,
    nextStepHintRu: 'Чётко повтори проблему и попроси решение или живого оператора.',
  },
];

export function getScenarioById(id: string): DialogScenario | undefined {
  return DIALOG_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getPublicDialogScenarios(): DialogScenario[] {
  return DIALOG_SCENARIOS.filter((scenario) => scenario.active && !scenario.hiddenFromHome);
}

export function getCourseDialogScenarios(): DialogScenario[] {
  return getPublicDialogScenarios().filter((scenario) => (scenario.collection ?? 'course') === 'course');
}

export function getChallengeDialogScenarios(): DialogScenario[] {
  // Сортируем по уровню аккаунта — лестница «ситуаций» всегда идёт по возрастанию,
  // даже если новые сценарии дописаны в конец массива, а не вставлены по месту.
  return getPublicDialogScenarios()
    .filter((scenario) => scenario.collection === 'challenge')
    .sort((a, b) => (a.requiredAccountLevel ?? 0) - (b.requiredAccountLevel ?? 0));
}

export function getScenariosByCategory(category: DialogScenarioCategory): DialogScenario[] {
  return getCourseDialogScenarios().filter((scenario) => scenario.category === category);
}
