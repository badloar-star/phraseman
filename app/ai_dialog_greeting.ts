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
  pharmacy: (n) => `Hello. ${n ? `I'm ${n} at the pharmacy counter. ` : ''}What would you like to explain today?`,
  restaurant: (n) => `Good evening, welcome! ${n ? `I'm ${n}, I'll be your waiter. ` : ''}A table for how many?`,
  doctor_visit: (n) => `Hello, come on in and have a seat. ${n ? `I'm ${n} at the clinic desk. ` : ''}What would you like to explain today?`,
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
  seat_stolen_cafe: () => `Excuse me, I think you're sitting at my table. I just went to get my drink.`,
  taxi_wrong_way: (n) => `Hi, it's ${n || 'your driver'}. This route looks odd, I know, but it's fine. What's worrying you?`,
  party_fast_talk: (n) => `Hey! ${n ? `I'm ${n}. ` : ''}We were just talking about weekend plans. Want to jump in?`,
  late_excuse_meeting: (n) => `${n ? `${n} here. ` : ''}You're ten minutes late. What happened?`,
  bill_argument: (n) => `${n ? `${n} here. ` : ''}I checked the bill already. What seems wrong with it?`,
  upsell_trap: (n) => `${n ? `I'm ${n}. ` : ''}Before you pay, I really recommend the extra package. It protects everything.`,
  neighbor_noise: (n) => `Hi, sorry to knock so late. ${n ? `It's ${n} next door. ` : ''}The music is pretty loud tonight.`,
  condescending_interviewer: (n) => `${n ? `${n} here. ` : ''}I see your application, but I'm not sure you have enough experience yet.`,
  mistaken_celebrity: (n) => `Oh wow, it is you, isn't it? ${n ? `I'm ${n}. ` : ''}Could I get a quick photo?`,
  wrong_dish_better: (n) => `${n ? `${n} here. ` : ''}I'm sorry, I think we brought the wrong dish. What would you like to do?`,
  neighbor_cat_accusation: (n) => `Sorry, but ${n ? `I'm ${n} from next door, and ` : ''}I think my cat is in your flat. Can we talk?`,
  wrong_wedding: (n) => `Hi! ${n ? `I'm ${n}. ` : ''}I don't think we've met. Are you with the bride or the groom?`,
  salesman_talks_you_out: (n) => `${n ? `I'm ${n}. ` : ''}Before you buy that, can I be honest? I don't think it's the right choice.`,
  dramatic_taxi_actor: (n) => `Welcome, dear passenger! ${n ? `${n} at your service. ` : ''}Where shall I take you today?`,
  surprise_guest_speech: (n) => `${n ? `${n} here. ` : ''}Everyone, give them a hand! Come up and say a few words.`,
  broken_robot_waiter: (n) => `${n || 'UNIT-7'} online. Order unclear. Please say one item at a time.`,
  conspiracy_seatmate: (n) => `Long flight, right? ${n ? `I'm ${n}. ` : ''}I always meet interesting people in this seat.`,
  mistaken_for_boss: (n) => `Good morning! ${n ? `I'm ${n}. ` : ''}Are you the new manager? I have a few quick questions.`,
  looping_support_bot: (n) => `${n || 'HELPER-BOT'} says hello. Have you tried turning it off and on?`,
};

// Шаблоны-опенеры (детерминированный выбор по хешу id) — чтобы у сценариев без
// курируемой строки приветствие всё равно было разным и в роли. Setting в живую
// реплику НЕ вставляем: в challenge-сценах оно часто описывает конфликт
// ("a doorway where..."), и такая мета-фраза звучит как робот-пересказ.
const TEMPLATES: ((place: string, name: string) => string)[] = [
  (_place, name) => `Hi there!${name ? ` I'm ${name}.` : ''} How can I help you today?`,
  (_place, name) => `Hey, good to see you!${name ? ` ${name} here.` : ''} What can I do for you?`,
  (_place, name) => `Hello!${name ? ` I'm ${name}.` : ''} Tell me what's going on.`,
  (_place, name) => `Oh, hi!${name ? ` I'm ${name}.` : ''} What do you need?`,
  (_place, name) => `Hi!${name ? ` The name's ${name}.` : ''} How are you doing today?`,
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
