// ── Уникальное приветствие собеседника для КАЖДОГО сценария диалога ─────────────
// Раньше первая реплика была одинаковой («Hi! Let's practice…») для всех диалогов.
// Здесь строим живое, ВНУТРИ-РОЛЕВОЕ приветствие на английском, своё для каждого
// сценария: имя персонажа + место + роль. Детерминированно (без рандома и без
// сети) — приветствие появляется мгновенно при открытии и стабильно одно и то же
// для данного сценария. Курируемая карта для флагманов + умный шаблон для всего
// остального, чтобы ни один сценарий не остался без уникального опенера.
//
// Чистый модуль (без RN) — тестируется отдельно.

export interface GreetingScenarioInput {
  id: string;
  role: string;       // «a friendly barista»
  setting: string;    // «a cozy coffee shop»
  persona?: string;   // «Your name is Mia. …»
}

/** Имя персонажа из persona-строки («Your name is Mia. …» → «Mia», «Mr. Patel»). */
export function personaNameFor(persona?: string): string {
  if (!persona) return '';
  const match = persona.match(/your name is\s+((?:(?:Mr|Mrs|Ms|Dr|Prof)\.\s+)?[^.,]+)/i);
  return match ? match[1].trim() : '';
}

// Курируемые опенеры — для частых сценариев звучат максимально естественно и
// по-разному. Ключ — id сценария. Значение — функция от имени (может быть пустым).
const CURATED: Record<string, (name: string) => string> = {
  coffee: (n) => `Hi there! Welcome in. ${n ? `I'm ${n}. ` : ''}What can I get started for you today?`,
  grocery: (n) => `Morning! ${n ? `${n} here. ` : ''}Looking for anything in particular today?`,
  clothes_shop: (n) => `Hey, welcome in! ${n ? `I'm ${n}. ` : ''}Are you looking for anything special, or just browsing?`,
  pharmacy: (n) => `Hello. ${n ? `I'm ${n}, the pharmacist. ` : ''}How can I help you today?`,
  restaurant: (n) => `Good evening, welcome! ${n ? `I'm ${n}, I'll be your waiter. ` : ''}A table for how many?`,
  doctor_visit: (n) => `Hello, come on in and have a seat. ${n ? `I'm Dr. ${n.replace(/^Dr\.\s*/i, '')}. ` : ''}So, what brings you in today?`,
  phone_delivery: (n) => `Hi! Delivery for you. ${n ? `I'm ${n}. ` : ''}Could you confirm your name for me?`,
  hotel_checkin: (n) => `Good evening, welcome to our hotel! ${n ? `I'm ${n} at the front desk. ` : ''}Checking in?`,
  airport_checkin: (n) => `Hello! ${n ? `I'm ${n}. ` : ''}May I see your passport and ticket, please?`,
  taxi: (n) => `Hop in! ${n ? `${n}'s the name. ` : ''}Where are we headed today?`,
  train_station: (n) => `Hi there! ${n ? `${n} at the ticket window. ` : ''}Where would you like to travel?`,
  first_meeting: (n) => `Oh, hi! I don't think we've met. ${n ? `I'm ${n}. ` : ''}And you are?`,
  small_talk_neighbor: (n) => `Oh, hey neighbor! ${n ? `It's ${n}. ` : ''}Lovely weather we're having, isn't it?`,
  invite_friend: (n) => `Hey! ${n ? `It's ${n}. ` : ''}Good to hear from you — what's up?`,
  work_call: (n) => `Hi, thanks for jumping on the call. ${n ? `${n} here. ` : ''}Can you hear me okay?`,
  ask_for_help: (n) => `Hi there! ${n ? `I'm ${n}. ` : ''}You look a little lost — need a hand with something?`,
  tourist_info: (n) => `Welcome! ${n ? `I'm ${n} at the info desk. ` : ''}First time in the city? How can I help?`,
  lost_luggage: (n) => `Hello, I'm sorry to hear there's a problem. ${n ? `I'm ${n}. ` : ''}Let's find your bag — can you describe it?`,
  car_rental: (n) => `Hi, welcome! ${n ? `I'm ${n}. ` : ''}Picking up a rental today? What kind of car did you have in mind?`,
};

// Шаблоны-опенеры (детерминированный выбор по хешу id) — чтобы у сценариев без
// курируемой строки приветствие всё равно было разным и в роли. {place} — место
// из setting (артикль убираем), {name} — имя (или нейтральная вставка).
const TEMPLATES: ((place: string, name: string) => string)[] = [
  (place, name) => `Hi there! Welcome to ${place}.${name ? ` I'm ${name}.` : ''} How can I help you today?`,
  (place, name) => `Hey, good to see you!${name ? ` ${name} here.` : ''} So, what brings you to ${place} today?`,
  (place, name) => `Hello! Welcome in.${name ? ` I'm ${name}.` : ''} What can I do for you?`,
  (place, name) => `Oh, hi!${name ? ` I'm ${name}.` : ''} Make yourself at home here at ${place}. What's going on?`,
  (place, name) => `Hi! Great to have you at ${place}.${name ? ` The name's ${name}.` : ''} How are you doing today?`,
];

/** Убираем ведущий артикль из setting: «a cozy coffee shop» → «a cozy coffee shop» оставляем как есть для естественности, но «the/a/an» в начале сохраняем — звучит нормально после "Welcome to". */
function placeFromSetting(setting: string): string {
  return String(setting || '').trim() || 'this place';
}

function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i += 1) {
    h = ((h << 5) + h + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Уникальное приветствие для сценария. Сначала курируемое, иначе детерминированный
 * шаблон по setting/persona. Никогда не пустое.
 */
export function buildScenarioGreeting(scenario: GreetingScenarioInput): string {
  const name = personaNameFor(scenario.persona);
  const curated = CURATED[scenario.id];
  if (curated) return curated(name).replace(/\s+/g, ' ').trim();
  const place = placeFromSetting(scenario.setting);
  const tpl = TEMPLATES[hashId(scenario.id) % TEMPLATES.length]!;
  return tpl(place, name).replace(/\s+/g, ' ').trim();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
