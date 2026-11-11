/**
 * Экзамен уровня: авторский банк для пяти механик, которым нужен диалог или короткий текст.
 *
 * зачем (владелец 11.11.2026): «писать отдельно, но используя материалы — грамматику или слова, которые юзер уже
 * разбирал, чтобы не было жалоб "а нас такому не учили"». Из одной фразы урока диалог не построить, поэтому задания
 * этих механик написаны руками. Правило банка: КАЖДОЕ слово задания встречалось в уроках уровня или раньше.
 * Его держит сторож tests/level_exam_authored_bank.test.ts — слово вне пройденного словаря роняет тест.
 *
 * Задание пишется целиком на изучаемом языке: подпись «что сделать» и названия групп — постоянные, на языке ученика
 * (app/level_exam_expanded_copy.ts). Автор пишет ответ «как есть» (верный вариант первым, реплики по порядку) —
 * порядок на экране перемешивает сборщик по сиду попытки, чтобы место не выдавало ответ.
 *
 * Готово: все пять курсов (английский, испанский, немецкий, французский, итальянский), все четыре уровня
 * (A1 — уроки 1–8, A2 — до 18, B1 — до 28, B2 — до 32). У четырёх курсов, кроме английского, заданий по три на механику и уровень;
 * словарь каждого курса свой — задания писались под него, а не переводились с английского.
 */
import type { ExpandedExercise } from '../modules/expanded-formats/types';
import { parseExpandedExercise } from '../modules/expanded-formats/validate';
import type { CourseLevel } from './course_levels';
import { levelExamExpandedCopy, type AuthoredGroupKind } from './level_exam_expanded_copy';
import { createLevelExamRng, shuffled } from './level_exam_rng';

export const AUTHORED_FORMATS = ['context_choice', 'dialogue_order', 'reply_pairs', 'classify_function', 'evidence_choice'] as const;
export type AuthoredFormat = (typeof AUTHORED_FORMATS)[number];

type Base = Readonly<{ id: string; /** Урок, к теме которого относится задание (для разбора слабых уроков). */ lessonId: number }>;

export type AuthoredExamItem =
  /** Реплика собеседника и четыре ответа: подходит только `right`. */
  | (Base & Readonly<{ format: 'context_choice'; line: string; right: string; wrong: readonly [string, string, string] }>)
  /** Четыре реплики в верном порядке; порядок обязан быть единственным возможным. */
  | (Base & Readonly<{ format: 'dialogue_order'; lines: readonly [string, string, string, string] }>)
  /** Четыре пары «вопрос — ответ»; каждый ответ подходит только своему вопросу. */
  | (Base & Readonly<{ format: 'reply_pairs'; pairs: readonly (readonly [string, string])[] }>)
  /** Реплики и номер группы (0 или 1) для каждой. */
  | (Base & Readonly<{ format: 'classify_function'; kind: AuthoredGroupKind; items: readonly (readonly [string, 0 | 1])[] }>)
  /** Короткий текст, вопрос к нему и номер предложения-ответа. */
  | (Base & Readonly<{ format: 'evidence_choice'; passage: readonly string[]; question: string; answer: number }>);

const EN_A1: readonly AuthoredExamItem[] = [
  { id: 'en:A1:reply:01', lessonId: 6, format: 'context_choice', line: 'Where do you live?', right: 'I live near the station.', wrong: ['Yes, I do.', 'At nine.', 'It is my flat.'] },
  { id: 'en:A1:reply:02', lessonId: 6, format: 'context_choice', line: 'What time does the shop open?', right: 'It opens at nine.', wrong: ['Yes, it does.', 'It is on this street.', 'At the station.'] },
  { id: 'en:A1:reply:03', lessonId: 4, format: 'context_choice', line: 'Do you accept cards?', right: 'Yes, we do.', wrong: ['Yes, we are.', 'At ten.', 'It is my card.'] },
  { id: 'en:A1:reply:04', lessonId: 2, format: 'context_choice', line: 'Is this seat free?', right: 'Yes, it is.', wrong: ['Yes, it does.', 'At home.', 'No, I do not.'] },
  { id: 'en:A1:reply:05', lessonId: 6, format: 'context_choice', line: 'When does the train leave?', right: 'It leaves at eight.', wrong: ['Yes, it does.', 'At the platform.', 'It is a long journey.'] },
  { id: 'en:A1:reply:06', lessonId: 6, format: 'context_choice', line: 'Who teaches the evening class?', right: 'My sister teaches it.', wrong: ['At eight.', 'Yes, she does.', 'In the office.'] },
  { id: 'en:A1:reply:07', lessonId: 6, format: 'context_choice', line: 'Why are you late?', right: 'My bus is late.', wrong: ['Yes, I am.', 'At nine.', 'It is my bag.'] },
  { id: 'en:A1:reply:08', lessonId: 7, format: 'context_choice', line: 'Do you have an appointment?', right: 'Yes, I do.', wrong: ['Yes, I am.', 'It is my passport.', 'At home.'] },
  { id: 'en:A1:reply:09', lessonId: 8, format: 'context_choice', line: 'When does the film start?', right: 'It starts at seven.', wrong: ['Yes, it does.', 'In the park.', 'It is a short film.'] },
  { id: 'en:A1:reply:10', lessonId: 6, format: 'context_choice', line: 'How do you go to work?', right: 'I go by bus.', wrong: ['I go at eight.', 'Yes, I do.', 'I work in an office.'] },

  { id: 'en:A1:order:01', lessonId: 6, format: 'dialogue_order', lines: ['A: Where do you work?', 'B: I work in a cafe.', 'A: When does it open?', 'B: It opens at seven.'] },
  { id: 'en:A1:order:02', lessonId: 7, format: 'dialogue_order', lines: ['A: Do you have a car?', 'B: No, I have a bicycle.', 'A: Where do you keep it?', 'B: I keep it in the garden.'] },
  { id: 'en:A1:order:03', lessonId: 6, format: 'dialogue_order', lines: ['A: What do you study?', 'B: I study English.', 'A: Who teaches it?', 'B: My sister teaches it.'] },
  { id: 'en:A1:order:04', lessonId: 6, format: 'dialogue_order', lines: ['A: Is the shop open?', 'B: No, it is closed.', 'A: When does it open?', 'B: It opens at nine.'] },
  { id: 'en:A1:order:05', lessonId: 3, format: 'dialogue_order', lines: ['A: Do you live alone?', 'B: No, I share a flat.', 'A: Where is it?', 'B: It is near the station.'] },
  { id: 'en:A1:order:06', lessonId: 7, format: 'dialogue_order', lines: ['A: Do you have a pen?', 'B: Yes, I have two.', 'A: Which colour are they?', 'B: They are blue.'] },

  { id: 'en:A1:pairs:01', lessonId: 6, format: 'reply_pairs', pairs: [['Where do you live?', 'Near the station.'], ['When do you start work?', 'At eight.'], ['Do you speak English?', 'Yes, I do.'], ['Is the cafe open?', 'No, it is closed.']] },
  { id: 'en:A1:pairs:02', lessonId: 6, format: 'reply_pairs', pairs: [['Who has the keys?', 'My sister.'], ['Which bus goes to the centre?', 'Bus number nine.'], ['Why is the room cold?', 'The window is open.'], ['Are you ready?', 'Yes, I am.']] },
  { id: 'en:A1:pairs:03', lessonId: 8, format: 'reply_pairs', pairs: [['When is your birthday?', 'In July.'], ['What time is the concert?', 'At seven.'], ['Does the bakery open on Sundays?', 'No, it does not.'], ['Where is the market?', 'Near the park.']] },
  { id: 'en:A1:pairs:04', lessonId: 4, format: 'reply_pairs', pairs: [['Is this your bag?', 'No, it is her bag.'], ['Do they work together?', 'Yes, they do.'], ['Does he drive?', 'No, he does not.'], ['Are the seats free?', 'Yes, they are.']] },
  { id: 'en:A1:pairs:05', lessonId: 6, format: 'reply_pairs', pairs: [['What do you want?', 'A coffee.'], ['Where is the lift?', 'Near the stairs.'], ['When does the shift finish?', 'At midnight.'], ['Who is the manager?', 'My colleague.']] },

  { id: 'en:A1:groups:01', lessonId: 8, format: 'classify_function', kind: 'when_where', items: [['At nine.', 0], ['At home.', 1], ['On Friday.', 0], ['Near the park.', 1]] },
  { id: 'en:A1:groups:02', lessonId: 8, format: 'classify_function', kind: 'when_where', items: [['In July.', 0], ['In the kitchen.', 1], ['After lunch.', 0], ['At the station.', 1]] },
  { id: 'en:A1:groups:03', lessonId: 8, format: 'classify_function', kind: 'when_where', items: [['Before midnight.', 0], ['On the balcony.', 1], ['Every morning.', 0], ['In the garden.', 1]] },
  { id: 'en:A1:groups:04', lessonId: 1, format: 'classify_function', kind: 'one_many', items: [['The door is open.', 0], ['The doors are open.', 1], ['This seat is free.', 0], ['These seats are free.', 1]] },
  { id: 'en:A1:groups:05', lessonId: 3, format: 'classify_function', kind: 'one_many', items: [['My sister works here.', 0], ['They work here.', 1], ['The shop opens at nine.', 0], ['The shops open at nine.', 1]] },
  { id: 'en:A1:groups:06', lessonId: 4, format: 'classify_function', kind: 'one_many', items: [['She has a ticket.', 0], ['We have tickets.', 1], ['The train is late.', 0], ['The buses are late.', 1]] },

  { id: 'en:A1:text:01', lessonId: 3, format: 'evidence_choice', passage: ['My sister works in a cafe.', 'She starts at seven.', 'She walks to work.'], question: 'When does she start work?', answer: 1 },
  { id: 'en:A1:text:02', lessonId: 8, format: 'evidence_choice', passage: ['The shop is closed today.', 'It opens on Monday.', 'The cafe is open.'], question: 'When does the shop open?', answer: 1 },
  { id: 'en:A1:text:03', lessonId: 6, format: 'evidence_choice', passage: ['I live near the station.', 'I go to work by bus.', 'The journey is short.'], question: 'Where do I live?', answer: 0 },
  { id: 'en:A1:text:04', lessonId: 4, format: 'evidence_choice', passage: ['The room is cold.', 'The window is open.', 'The heating is off.'], question: 'Is the heating on?', answer: 2 },
  { id: 'en:A1:text:05', lessonId: 8, format: 'evidence_choice', passage: ['The concert is on Friday.', 'It starts at seven.', 'The tickets are on sale.'], question: 'Which day is the concert?', answer: 0 },
  { id: 'en:A1:text:06', lessonId: 7, format: 'evidence_choice', passage: ['He has a headache.', 'He needs an appointment.', 'He does not go to work today.'], question: 'Why does he need an appointment?', answer: 0 },
];

const EN_A2: readonly AuthoredExamItem[] = [
  { id: 'en:A2:reply:01', lessonId: 9, format: 'context_choice', line: 'Is there a lift?', right: 'Yes, there is.', wrong: ['Yes, it does.', 'Yes, I can.', 'At nine.'] },
  { id: 'en:A2:reply:02', lessonId: 10, format: 'context_choice', line: 'Can you swim?', right: 'Yes, I can.', wrong: ['Yes, I am.', 'Yes, there is.', 'Yesterday.'] },
  { id: 'en:A2:reply:03', lessonId: 11, format: 'context_choice', line: 'Did you call a taxi?', right: 'Yes, I did.', wrong: ['Yes, I do.', 'Yes, I will.', 'Yes, I am.'] },
  { id: 'en:A2:reply:04', lessonId: 12, format: 'context_choice', line: 'Where did you go yesterday?', right: 'I went to the bank.', wrong: ['I go to the bank.', 'I will go tomorrow.', 'Yes, I did.'] },
  { id: 'en:A2:reply:05', lessonId: 13, format: 'context_choice', line: 'Will you wait outside?', right: 'Yes, I will.', wrong: ['Yes, I did.', 'Yes, I am.', 'Yes, there is.'] },
  { id: 'en:A2:reply:06', lessonId: 15, format: 'context_choice', line: 'Whose umbrella is this?', right: 'It is mine.', wrong: ['It is me.', 'Yes, it is.', 'It is wet.'] },
  { id: 'en:A2:reply:07', lessonId: 17, format: 'context_choice', line: 'What are you reading?', right: 'I am reading a letter.', wrong: ['I read a letter yesterday.', 'Yes, I am.', 'I will read it later.'] },
  { id: 'en:A2:reply:08', lessonId: 12, format: 'context_choice', line: 'What did you buy?', right: 'I bought bread.', wrong: ['I buy bread.', 'I will buy bread.', 'Yes, I did.'] },

  { id: 'en:A2:order:01', lessonId: 12, format: 'dialogue_order', lines: ['A: Where did you go yesterday?', 'B: I went to the market.', 'A: What did you buy there?', 'B: I bought bread.'] },
  { id: 'en:A2:order:02', lessonId: 11, format: 'dialogue_order', lines: ['A: Did you call the clinic?', 'B: Yes, I called yesterday.', 'A: Did they answer?', 'B: No, they did not.'] },
  { id: 'en:A2:order:03', lessonId: 12, format: 'dialogue_order', lines: ['A: I found a wallet.', 'B: Where did you find it?', 'A: I found it near the bank.', 'B: Take it to the reception.'] },
  { id: 'en:A2:order:04', lessonId: 15, format: 'dialogue_order', lines: ['A: Whose jacket is this?', 'B: It is mine.', 'A: Is it dry?', 'B: No, it is wet.'] },
  { id: 'en:A2:order:05', lessonId: 10, format: 'dialogue_order', lines: ['A: Is there a toilet here?', 'B: Yes, there is one upstairs.', 'A: Can I use it?', 'B: Yes, you can.'] },
  { id: 'en:A2:order:06', lessonId: 17, format: 'dialogue_order', lines: ['A: What are you cooking?', 'B: I am cooking soup.', 'A: Is it ready?', 'B: No, it is still cold.'] },

  { id: 'en:A2:pairs:01', lessonId: 13, format: 'reply_pairs', pairs: [['Is there a bank nearby?', 'Yes, there is.'], ['Can you drive?', 'No, I cannot.'], ['Did you find the keys?', 'Yes, I did.'], ['Will it rain tomorrow?', 'Yes, it will.']] },
  { id: 'en:A2:pairs:02', lessonId: 17, format: 'reply_pairs', pairs: [['Whose gloves are these?', 'They are mine.'], ['Where did you wait?', 'Behind the bank.'], ['When will you call?', 'Tomorrow morning.'], ['What are you reading?', 'A letter.']] },
  { id: 'en:A2:pairs:03', lessonId: 14, format: 'reply_pairs', pairs: [['Why did you miss the flight?', 'The taxi was late.'], ['Who fixed the lamp?', 'My brother did.'], ['Which route is faster?', 'The second one.'], ['Are they waiting outside?', 'Yes, they are.']] },
  { id: 'en:A2:pairs:04', lessonId: 13, format: 'reply_pairs', pairs: [['Can we sit here?', 'Yes, you can.'], ['Did she pay online?', 'No, she did not.'], ['Is he sleeping?', 'Yes, he is.'], ['Will they come?', 'No, they will not.']] },
  { id: 'en:A2:pairs:05', lessonId: 12, format: 'reply_pairs', pairs: [['What did you eat?', 'Soup with bread.'], ['Where is the reception?', 'Downstairs.'], ['When did you arrive?', 'Yesterday.'], ['Who are you calling?', 'My friend.']] },

  { id: 'en:A2:groups:01', lessonId: 13, format: 'classify_function', kind: 'past_future', items: [['I walked home.', 0], ['I will walk home.', 1], ['She called a taxi.', 0], ['She will call a taxi.', 1]] },
  { id: 'en:A2:groups:02', lessonId: 13, format: 'classify_function', kind: 'past_future', items: [['We bought bread.', 0], ['We will buy bread.', 1], ['They went to the bank.', 0], ['It will rain tomorrow.', 1]] },
  { id: 'en:A2:groups:03', lessonId: 13, format: 'classify_function', kind: 'past_future', items: [['He lost his wallet.', 0], ['He will find it later.', 1], ['I paid online.', 0], ['I will pay tomorrow.', 1]] },
  { id: 'en:A2:groups:04', lessonId: 13, format: 'classify_function', kind: 'when_where', items: [['Yesterday.', 0], ['Upstairs.', 1], ['Tomorrow morning.', 0], ['Behind the bank.', 1]] },
  { id: 'en:A2:groups:05', lessonId: 15, format: 'classify_function', kind: 'one_many', items: [['There is a queue.', 0], ['There are queues.', 1], ['That chair is broken.', 0], ['Those chairs are broken.', 1]] },
  { id: 'en:A2:groups:06', lessonId: 16, format: 'classify_function', kind: 'when_where', items: [['Later.', 0], ['Outside.', 1], ['After the meeting.', 0], ['Downstairs.', 1]] },

  { id: 'en:A2:text:01', lessonId: 12, format: 'evidence_choice', passage: ['I went to the market yesterday.', 'I bought bread.', 'I paid by card.'], question: 'What did I buy?', answer: 1 },
  { id: 'en:A2:text:02', lessonId: 12, format: 'evidence_choice', passage: ['The taxi was late.', 'We missed the flight.', 'We booked a new ticket.'], question: 'Why did we miss the flight?', answer: 0 },
  { id: 'en:A2:text:03', lessonId: 10, format: 'evidence_choice', passage: ['There is a toilet upstairs.', 'There are lockers downstairs.', 'The exit is behind the reception.'], question: 'Where are the lockers?', answer: 1 },
  { id: 'en:A2:text:04', lessonId: 13, format: 'evidence_choice', passage: ['My brother will come tomorrow.', 'He will bring the ladder.', 'We will change the lamp.'], question: 'When will my brother come?', answer: 0 },
  { id: 'en:A2:text:05', lessonId: 14, format: 'evidence_choice', passage: ['This bag is lighter.', 'That bag is cheaper.', 'I will take the lighter one.'], question: 'Which bag is cheaper?', answer: 1 },
  { id: 'en:A2:text:06', lessonId: 17, format: 'evidence_choice', passage: ['She is cooking soup.', 'He is washing the cups.', 'The children are sleeping.'], question: 'Who is sleeping?', answer: 2 },
];

const EN_B1: readonly AuthoredExamItem[] = [
  { id: 'en:B1:reply:01', lessonId: 24, format: 'context_choice', line: 'Have you ever lived abroad?', right: 'Yes, I have.', wrong: ['Yes, I do.', 'Yes, I am.', 'Yes, I will.'] },
  { id: 'en:B1:reply:02', lessonId: 25, format: 'context_choice', line: 'Where were you at seven?', right: 'I was at home.', wrong: ['I am at home.', 'I will be at home.', 'Yes, I was.'] },
  { id: 'en:B1:reply:03', lessonId: 26, format: 'context_choice', line: 'What will you do if it rains?', right: 'I will stay inside.', wrong: ['I stayed inside.', 'Yes, I will.', 'It was raining.'] },
  { id: 'en:B1:reply:04', lessonId: 23, format: 'context_choice', line: 'When are the rooms cleaned?', right: 'They are cleaned daily.', wrong: ['It is cleaned daily.', 'Yes, they are.', 'Yesterday.'] },
  { id: 'en:B1:reply:05', lessonId: 21, format: 'context_choice', line: 'Is anyone at home?', right: 'No, nobody is at home.', wrong: ['No, anything is at home.', 'Yes, somewhere.', 'Yes, I have.'] },
  { id: 'en:B1:reply:06', lessonId: 22, format: 'context_choice', line: 'Do you enjoy cooking?', right: 'Yes, I enjoy it.', wrong: ['Yes, I am cooking.', 'Yes, I was.', 'Yes, I have.'] },
  { id: 'en:B1:reply:07', lessonId: 27, format: 'context_choice', line: 'What did Anna say?', right: 'She said she was tired.', wrong: ['She says tired.', 'Yes, she did.', 'She will say it.'] },

  { id: 'en:B1:order:01', lessonId: 24, format: 'dialogue_order', lines: ['A: Have you finished the report?', 'B: No, I have not started it.', 'A: Why not?', 'B: Because the printer is broken.'] },
  { id: 'en:B1:order:02', lessonId: 21, format: 'dialogue_order', lines: ['A: Someone left a suitcase in the lobby.', 'B: Whose is it?', 'A: Nobody knows.', 'B: Then take it to the reception.'] },
  { id: 'en:B1:order:03', lessonId: 26, format: 'dialogue_order', lines: ['A: It might rain tomorrow.', 'B: What will we do if it rains?', 'A: We will stay inside.', 'B: Then I will bring a film.'] },
  { id: 'en:B1:order:04', lessonId: 23, format: 'dialogue_order', lines: ['A: Has the parcel arrived?', 'B: Yes, it was delivered at noon.', 'A: Who signed for it?', 'B: The manager did.'] },

  { id: 'en:B1:pairs:01', lessonId: 26, format: 'reply_pairs', pairs: [['Have you seen my keys?', 'Yes, they are on the shelf.'], ['Were you sleeping?', 'No, I was reading.'], ['Is the gate locked at night?', 'Yes, it is.'], ['If it rains, will you stay?', 'Yes, I will.']] },
  { id: 'en:B1:pairs:02', lessonId: 24, format: 'reply_pairs', pairs: [['Why are you tired?', 'Because I worked all night.'], ['Who repaired the roof?', 'Nobody did.'], ['Where is the library?', 'Opposite the bank.'], ['How long have you lived here?', 'Since March.']] },
  { id: 'en:B1:pairs:03', lessonId: 27, format: 'reply_pairs', pairs: [['Were you working?', 'No, I was cooking dinner.'], ['What have you lost?', 'My wallet.'], ['What did she say?', 'She said she was busy.'], ['What happened?', 'Nothing happened.']] },
  { id: 'en:B1:pairs:04', lessonId: 24, format: 'reply_pairs', pairs: [['Has she ever driven a van?', 'No, she has never driven one.'], ['Did they enjoy the meal?', 'Yes, they did.'], ['Was the letter delivered?', 'Yes, it was.'], ['Are you interested in music?', 'Yes, I am.']] },

  { id: 'en:B1:groups:01', lessonId: 25, format: 'classify_function', kind: 'now_past', items: [['She is driving.', 0], ['She was driving.', 1], ['We are waiting.', 0], ['We were waiting.', 1]] },
  { id: 'en:B1:groups:02', lessonId: 23, format: 'classify_function', kind: 'now_past', items: [['The gate is locked.', 0], ['The gate was locked.', 1], ['The rooms are cleaned daily.', 0], ['The letters were delivered.', 1]] },
  { id: 'en:B1:groups:03', lessonId: 24, format: 'classify_function', kind: 'when_where', items: [['Since March.', 0], ['Opposite the bank.', 1], ['Two years ago.', 0], ['Between the tree and the wall.', 1]] },
  { id: 'en:B1:groups:04', lessonId: 26, format: 'classify_function', kind: 'past_future', items: [['She has found her card.', 0], ['If it rains, we will stay inside.', 1], ['We had dinner at seven.', 0], ['I will call you later.', 1]] },

  { id: 'en:B1:text:01', lessonId: 25, format: 'evidence_choice', passage: ['Anna was driving to work.', 'The phone rang.', 'She did not answer it.'], question: 'Where was Anna driving?', answer: 0 },
  { id: 'en:B1:text:02', lessonId: 23, format: 'evidence_choice', passage: ['The parcel was delivered at noon.', 'Nobody was at home.', 'The driver left a note.'], question: 'What did the driver leave?', answer: 2 },
  { id: 'en:B1:text:03', lessonId: 24, format: 'evidence_choice', passage: ['Tom has lived here since March.', 'He works at the airport.', 'He enjoys his job.'], question: 'Where does Tom work?', answer: 1 },
  { id: 'en:B1:text:04', lessonId: 26, format: 'evidence_choice', passage: ['If it rains, we will stay inside.', 'If it is dry, we will walk to the river.', 'We will take the dog.'], question: 'What will we do if it rains?', answer: 0 },
];

const EN_B2: readonly AuthoredExamItem[] = [
  { id: 'en:B2:reply:01', lessonId: 29, format: 'context_choice', line: 'Did you use to live here?', right: 'Yes, I used to live upstairs.', wrong: ['Yes, I will.', 'Yes, I am.', 'Yes, I can.'] },
  { id: 'en:B2:reply:02', lessonId: 30, format: 'context_choice', line: 'Who is the man who repaired the roof?', right: 'He is my neighbour.', wrong: ['It is the roof.', 'Yes, he did.', 'He repaired it yesterday.'] },
  { id: 'en:B2:reply:03', lessonId: 32, format: 'context_choice', line: 'Is the small room still available?', right: 'No, it is already booked.', wrong: ['No, it is not small.', 'Yes, I have.', 'Yes, it was painted.'] },
  { id: 'en:B2:reply:04', lessonId: 31, format: 'context_choice', line: 'Did you hear Anna laugh?', right: 'Yes, I heard her.', wrong: ['Yes, she heard.', 'Yes, I laugh.', 'Yes, I will hear.'] },
  { id: 'en:B2:reply:05', lessonId: 29, format: 'context_choice', line: 'Where did you use to work?', right: 'I used to work in a factory.', wrong: ['I will work in a factory.', 'Yes, I used to.', 'I am working.'] },
  { id: 'en:B2:reply:06', lessonId: 31, format: 'context_choice', line: 'What did you see?', right: 'I saw Tom leave.', wrong: ['I see Tom leave.', 'Yes, I saw.', 'I will see him.'] },

  { id: 'en:B2:order:01', lessonId: 29, format: 'dialogue_order', lines: ['A: Did you use to live here?', 'B: Yes, I used to rent the flat upstairs.', 'A: Why did you leave it?', 'B: Because it was too small.'] },
  { id: 'en:B2:order:02', lessonId: 30, format: 'dialogue_order', lines: ['A: A woman left a note for you.', 'B: What does it say?', 'A: It says she found your phone.', 'B: Then I will call her.'] },
  { id: 'en:B2:order:03', lessonId: 31, format: 'dialogue_order', lines: ['A: I heard something fall.', 'B: Where did you hear it?', 'A: In the kitchen.', 'B: Then I will look there.'] },
  { id: 'en:B2:order:04', lessonId: 32, format: 'dialogue_order', lines: ['A: Is the small room still available?', 'B: No, it is already booked.', 'A: Is anything else available?', 'B: Yes, the room upstairs is free.'] },

  { id: 'en:B2:pairs:01', lessonId: 32, format: 'reply_pairs', pairs: [['Did you use to cycle to work?', 'Yes, I used to.'], ['Who is the woman who called?', 'She is my niece.'], ['Did you see him leave?', 'Yes, I did.'], ['Is the reservation confirmed?', 'Yes, it is.']] },
  { id: 'en:B2:pairs:02', lessonId: 31, format: 'reply_pairs', pairs: [['Where did you use to work?', 'In a warehouse.'], ['Which tram goes to the cinema?', 'The one at the corner.'], ['Why is the alarm ringing?', 'Because someone opened the door.'], ['When was the fence painted?', 'Two years ago.']] },
  { id: 'en:B2:pairs:03', lessonId: 31, format: 'reply_pairs', pairs: [['What did you hear?', 'I heard the door slam.'], ['Who won the race?', 'My nephew did.'], ['What was stolen?', 'A bicycle.'], ['Whose child is that?', 'He is my son.']] },
  { id: 'en:B2:pairs:04', lessonId: 31, format: 'reply_pairs', pairs: [['Could you lend me a pen?', 'Yes, take mine.'], ['Has the customer paid?', 'No, not yet.'], ['Was the tyre repaired?', 'Yes, it was.'], ['Do you hate waiting?', 'Yes, I do.']] },

  { id: 'en:B2:groups:01', lessonId: 29, format: 'classify_function', kind: 'now_past', items: [['I drive to work.', 0], ['I used to drive to work.', 1], ['She lives upstairs.', 0], ['She used to live upstairs.', 1]] },
  { id: 'en:B2:groups:02', lessonId: 30, format: 'classify_function', kind: 'person_thing', items: [['The man who repaired the roof.', 0], ['The phone that fell.', 1], ['The woman who called.', 0], ['The bus that stops here.', 1]] },
  { id: 'en:B2:groups:03', lessonId: 32, format: 'classify_function', kind: 'past_future', items: [['The fence was painted.', 0], ['The room will be painted.', 1], ['The reservation was confirmed.', 0], ['The parcel will be delivered tomorrow.', 1]] },
  { id: 'en:B2:groups:04', lessonId: 30, format: 'classify_function', kind: 'when_where', items: [['Two years ago.', 0], ['At the corner.', 1], ['Before the race.', 0], ['In the warehouse.', 1]] },

  { id: 'en:B2:text:01', lessonId: 29, format: 'evidence_choice', passage: ['I used to drive to work.', 'Now I cycle.', 'The journey takes thirty minutes.'], question: 'How did I use to go to work?', answer: 0 },
  { id: 'en:B2:text:02', lessonId: 30, format: 'evidence_choice', passage: ['The woman who found my phone left a note.', 'The note was on the counter.', 'I called her and thanked her.'], question: 'Where was the note?', answer: 1 },
  { id: 'en:B2:text:03', lessonId: 31, format: 'evidence_choice', passage: ['We heard the door slam.', 'Then we saw a man run away.', 'We called the police.'], question: 'Who did we call?', answer: 2 },
  { id: 'en:B2:text:04', lessonId: 32, format: 'evidence_choice', passage: ['The small room is booked.', 'The room upstairs is still available.', 'It costs less.'], question: 'Which room is available?', answer: 1 },
];

// ── Испанский курс ──────────────────────────────────────────────────────────────────────────────────────────────────
const ES_A1: readonly AuthoredExamItem[] = [
  { id: 'es:A1:reply:01', lessonId: 5, format: 'context_choice', line: '¿Dónde está la farmacia?', right: 'Está cerca.', wrong: ['Es médica.', 'Hay dos.', 'Soy yo.'] },
  { id: 'es:A1:reply:02', lessonId: 5, format: 'context_choice', line: '¿Quién es ella?', right: 'Es mi hermana.', wrong: ['Está en la mesa.', 'Hay una.', 'Está lejos.'] },
  { id: 'es:A1:reply:03', lessonId: 5, format: 'context_choice', line: '¿Qué es esto?', right: 'Es un mapa.', wrong: ['Está aquí.', 'Soy estudiante.', 'Están fuera.'] },
  { id: 'es:A1:reply:04', lessonId: 5, format: 'context_choice', line: '¿Dónde están las llaves?', right: 'Están en la mesa.', wrong: ['Es una llave.', 'Soy yo.', 'Hay un tren.'] },

  { id: 'es:A1:order:01', lessonId: 5, format: 'dialogue_order', lines: ['A: ¿Dónde está tu hermano?', 'B: Está en el hotel.', 'A: ¿Y el hotel está cerca?', 'B: No, está lejos.'] },
  { id: 'es:A1:order:02', lessonId: 5, format: 'dialogue_order', lines: ['A: ¿Quién es ella?', 'B: Es mi hermana.', 'A: ¿Y es médica?', 'B: No, es profesora.'] },
  { id: 'es:A1:order:03', lessonId: 7, format: 'dialogue_order', lines: ['A: ¿Hay una farmacia aquí?', 'B: No, aquí no hay.', 'A: ¿Y dónde hay una?', 'B: Hay una en la estación.'] },

  { id: 'es:A1:pairs:01', lessonId: 7, format: 'reply_pairs', pairs: [['¿Dónde está el baño?', 'Está allí.'], ['¿Quién es él?', 'Es mi hermano.'], ['¿Qué es eso?', 'Es un cargador.'], ['¿Hay café?', 'No, hay leche.']] },
  { id: 'es:A1:pairs:02', lessonId: 8, format: 'reply_pairs', pairs: [['¿Dónde están tus llaves?', 'Están en mi bolso.'], ['¿Eres estudiante?', 'No, soy profesora.'], ['¿Quiénes son ellos?', 'Son mis hermanos.'], ['¿Hay un banco cerca?', 'No, está lejos.']] },
  { id: 'es:A1:pairs:03', lessonId: 7, format: 'reply_pairs', pairs: [['¿Dónde estáis?', 'Estamos en casa.'], ['¿Qué hay en la mesa?', 'Hay un libro.'], ['¿Quién está en la puerta?', 'Mi madre.'], ['¿Es usted médico?', 'No, soy enfermero.']] },

  { id: 'es:A1:groups:01', lessonId: 3, format: 'classify_function', kind: 'one_many', items: [['El libro está aquí.', 0], ['Los libros están aquí.', 1], ['La llave está en la mesa.', 0], ['Las llaves están en la mesa.', 1]] },
  { id: 'es:A1:groups:02', lessonId: 8, format: 'classify_function', kind: 'person_thing', items: [['Mi hermana.', 0], ['Mi mochila.', 1], ['El profesor.', 0], ['El pasaporte.', 1]] },
  { id: 'es:A1:groups:03', lessonId: 7, format: 'classify_function', kind: 'one_many', items: [['Soy estudiante.', 0], ['Somos estudiantes.', 1], ['Hay un tren.', 0], ['Hay dos trenes.', 1]] },

  { id: 'es:A1:text:01', lessonId: 4, format: 'evidence_choice', passage: ['Ana es médica.', 'Está en la farmacia.', 'La farmacia está cerca.'], question: '¿Dónde está Ana?', answer: 1 },
  { id: 'es:A1:text:02', lessonId: 8, format: 'evidence_choice', passage: ['Mi hermano es estudiante.', 'Hoy está en casa.', 'Su libro está en la mesa.'], question: '¿Dónde está su libro?', answer: 2 },
  { id: 'es:A1:text:03', lessonId: 7, format: 'evidence_choice', passage: ['Hay un hotel cerca.', 'La estación está lejos.', 'No hay tiendas.'], question: '¿Dónde está la estación?', answer: 1 },
];

const ES_A2: readonly AuthoredExamItem[] = [
  { id: 'es:A2:reply:01', lessonId: 9, format: 'context_choice', line: '¿Dónde trabajas?', right: 'Trabajo en una oficina.', wrong: ['Vivo con mi hermana.', 'Me levanto temprano.', 'Tengo una pregunta.'] },
  { id: 'es:A2:reply:02', lessonId: 14, format: 'context_choice', line: '¿Puedo pagar con tarjeta?', right: 'No, pero puedes pagar en efectivo.', wrong: ['No, estoy cansado.', 'Voy a la playa.', 'Me gusta el café.'] },
  { id: 'es:A2:reply:03', lessonId: 15, format: 'context_choice', line: '¿Qué vas a comprar?', right: 'Voy a comprar pan.', wrong: ['Voy al supermercado mañana.', 'Me gusta el arroz.', 'Tengo tiempo.'] },

  { id: 'es:A2:order:01', lessonId: 10, format: 'dialogue_order', lines: ['A: ¿Dónde vives?', 'B: Vivo cerca de la estación.', 'A: ¿Y trabajas allí?', 'B: No, trabajo en un hotel.'] },
  { id: 'es:A2:order:02', lessonId: 14, format: 'dialogue_order', lines: ['A: ¿Tienes tiempo ahora?', 'B: No, estoy ocupado.', 'A: ¿Y más tarde?', 'B: Más tarde puedo.'] },
  { id: 'es:A2:order:03', lessonId: 15, format: 'dialogue_order', lines: ['A: ¿Qué vas a preparar?', 'B: Voy a preparar arroz.', 'A: ¿Y lo vas a comer con verduras?', 'B: No, con pan.'] },

  { id: 'es:A2:pairs:01', lessonId: 16, format: 'reply_pairs', pairs: [['¿Dónde estudias?', 'En casa.'], ['¿Qué bebes?', 'Bebo agua.'], ['¿Puedes esperar?', 'No, no tengo tiempo.'], ['¿Te gusta la música?', 'No, me gustan las películas.']] },
  { id: 'es:A2:pairs:02', lessonId: 15, format: 'reply_pairs', pairs: [['¿Qué lees?', 'Leo el periódico.'], ['¿Con quién vives?', 'Con mi madre.'], ['¿Vas a volver tarde?', 'No, voy a volver temprano.'], ['¿Tienes una reserva?', 'No, pero tengo una cita.']] },
  { id: 'es:A2:pairs:03', lessonId: 16, format: 'reply_pairs', pairs: [['¿Qué buscas?', 'Busco mi tarjeta.'], ['¿Puedo entrar?', 'Ahora no, por favor.'], ['¿Por qué estás cansada?', 'Porque me levanto temprano.'], ['¿Le gusta la playa?', 'No, le gusta la música.']] },

  { id: 'es:A2:groups:01', lessonId: 10, format: 'classify_function', kind: 'one_many', items: [['Trabajo en una oficina.', 0], ['Trabajamos en una oficina.', 1], ['Vive en un hotel.', 0], ['Viven en un hotel.', 1]] },
  { id: 'es:A2:groups:02', lessonId: 15, format: 'classify_function', kind: 'now_later', items: [['Como arroz.', 0], ['Voy a comer arroz.', 1], ['Leo una carta.', 0], ['Voy a leer una carta.', 1]] },
  { id: 'es:A2:groups:03', lessonId: 12, format: 'classify_function', kind: 'person_thing', items: [['Mi hermano.', 0], ['La bufanda.', 1], ['La profesora.', 0], ['El periódico.', 1]] },

  { id: 'es:A2:text:01', lessonId: 13, format: 'evidence_choice', passage: ['Me levanto a las siete.', 'Trabajo en una tienda.', 'Vivo con mi hermano.'], question: '¿Dónde trabajo?', answer: 1 },
  { id: 'es:A2:text:02', lessonId: 15, format: 'evidence_choice', passage: ['Ana tiene una cita.', 'Va a volver tarde.', 'Su hermana va a preparar la cena.'], question: '¿Quién va a preparar la cena?', answer: 2 },
  { id: 'es:A2:text:03', lessonId: 15, format: 'evidence_choice', passage: ['La tienda está cerrada.', 'No puedo comprar pan.', 'Voy al supermercado.'], question: '¿Por qué no puedo comprar pan?', answer: 0 },
];

const ES_B1: readonly AuthoredExamItem[] = [
  { id: 'es:B1:reply:01', lessonId: 20, format: 'context_choice', line: '¿Has llamado a Ana?', right: 'Ya la he llamado.', wrong: ['Ya he comprado pan.', 'Fui al mercado.', 'Estoy esperando el autobús.'] },
  { id: 'es:B1:reply:02', lessonId: 21, format: 'context_choice', line: '¿Qué compraste ayer?', right: 'Compré queso.', wrong: ['Compraré queso.', 'Estoy pagando.', 'Fui en taxi.'] },
  { id: 'es:B1:reply:03', lessonId: 23, format: 'context_choice', line: '¿Dónde vivías antes?', right: 'Vivía en el centro.', wrong: ['Vivo en el centro.', 'Volveremos mañana.', 'Fui al parque.'] },

  { id: 'es:B1:order:01', lessonId: 22, format: 'dialogue_order', lines: ['A: ¿Has comprado el regalo?', 'B: No, ayer no pude ir.', 'A: ¿Y por qué no pudiste?', 'B: Porque tuve una reunión.'] },
  { id: 'es:B1:order:02', lessonId: 28, format: 'dialogue_order', lines: ['A: Ayer fui al mercado.', 'B: ¿Y qué compraste?', 'A: Compré queso y fruta.', 'B: Yo también compraré fruta mañana.'] },
  { id: 'es:B1:order:03', lessonId: 26, format: 'dialogue_order', lines: ['A: ¿Dónde trabajaba Ana antes?', 'B: Trabajaba en un colegio.', 'A: ¿Y por qué no trabaja allí ahora?', 'B: Porque estaba lejos.'] },

  { id: 'es:B1:pairs:01', lessonId: 28, format: 'reply_pairs', pairs: [['¿Has pagado la factura?', 'Ya la he pagado.'], ['¿Volverá tarde tu hermano?', 'No, volverá temprano.'], ['¿Qué hiciste ayer?', 'Fui al parque.'], ['¿Dónde vivías?', 'Vivía en el centro.']] },
  { id: 'es:B1:pairs:02', lessonId: 28, format: 'reply_pairs', pairs: [['¿Qué estás leyendo?', 'Estoy leyendo una carta.'], ['¿Quién llamó anoche?', 'Llamó tu hermana.'], ['¿Pudiste recoger el paquete?', 'No, no pude.'], ['¿Llamarás al mecánico?', 'Lo llamaré mañana.']] },
  { id: 'es:B1:pairs:03', lessonId: 22, format: 'reply_pairs', pairs: [['¿Fuiste al mercado?', 'No, fui al parque.'], ['¿Has leído el correo?', 'Ya lo he leído.'], ['¿Tuviste un problema?', 'No, tuve una reunión.'], ['¿Vino tu hermano?', 'No, vino mi hermana.']] },

  { id: 'es:B1:groups:01', lessonId: 28, format: 'classify_function', kind: 'past_future', items: [['Ayer compré pan.', 0], ['Mañana compraré pan.', 1], ['Llamó mi hermano.', 0], ['Llamará mi hermano.', 1]] },
  { id: 'es:B1:groups:02', lessonId: 23, format: 'classify_function', kind: 'now_past', items: [['Vivo en el centro.', 0], ['Vivía en el centro.', 1], ['Trabaja en un colegio.', 0], ['Trabajaba en un colegio.', 1]] },
  { id: 'es:B1:groups:03', lessonId: 28, format: 'classify_function', kind: 'past_future', items: [['Fui al mercado.', 0], ['Volveremos tarde.', 1], ['Tuvimos una reunión.', 0], ['Pagaremos la factura.', 1]] },

  { id: 'es:B1:text:01', lessonId: 22, format: 'evidence_choice', passage: ['Ayer fui al mercado.', 'Compré queso y fruta.', 'Volví en taxi.'], question: '¿Qué compré?', answer: 1 },
  { id: 'es:B1:text:02', lessonId: 23, format: 'evidence_choice', passage: ['Ana vivía en el centro.', 'Trabajaba en un colegio.', 'Iba en autobús.'], question: '¿Dónde trabajaba Ana?', answer: 1 },
  { id: 'es:B1:text:03', lessonId: 20, format: 'evidence_choice', passage: ['He recibido un paquete.', 'Lo he abierto.', 'Es un regalo.'], question: '¿Qué he recibido?', answer: 0 },
];

const ES_B2: readonly AuthoredExamItem[] = [
  { id: 'es:B2:reply:01', lessonId: 30, format: 'context_choice', line: '¿Quieres que te llame?', right: 'No, quiero que vengas.', wrong: ['No, llamaría mañana.', 'Compraría un piso.', 'Si tuviera tiempo.'] },
  { id: 'es:B2:reply:02', lessonId: 29, format: 'context_choice', line: '¿Comprarías ese piso?', right: 'No, buscaría un piso barato.', wrong: ['Quiero que entres.', 'Cuando llegue.', 'No tengo batería.'] },
  { id: 'es:B2:reply:03', lessonId: 31, format: 'context_choice', line: '¿Me llamarás cuando llegues?', right: 'Te llamaré cuando tenga cobertura.', wrong: ['Alquilaría una habitación.', 'Quiero que copies el texto.', 'El horario está cerrado.'] },

  { id: 'es:B2:order:01', lessonId: 32, format: 'dialogue_order', lines: ['A: Si tuviera dinero, compraría un piso.', 'B: ¿Y dónde lo comprarías?', 'A: Lo compraría en un pueblo.', 'B: Yo lo alquilaría.'] },
  { id: 'es:B2:order:02', lessonId: 31, format: 'dialogue_order', lines: ['A: ¿Quieres que te llame mañana?', 'B: No, quiero que vengas.', 'A: ¿A qué hora?', 'B: Cuando termine la reunión.'] },
  { id: 'es:B2:order:03', lessonId: 30, format: 'dialogue_order', lines: ['A: Quiero que revises el texto.', 'B: ¿Lo quieres hoy?', 'A: No, mañana.', 'B: Te lo mandaré mañana.'] },

  { id: 'es:B2:pairs:01', lessonId: 31, format: 'reply_pairs', pairs: [['¿Quieres que te llame?', 'No, quiero que vengas.'], ['¿Comprarías ese piso?', 'No, buscaría un piso barato.'], ['¿Tienes cobertura?', 'No, no tengo señal.'], ['¿Dónde alquilarías una habitación?', 'En un pueblo.']] },
  { id: 'es:B2:pairs:02', lessonId: 32, format: 'reply_pairs', pairs: [['¿Quieres que abra la ventana?', 'No, quiero que la cierres.'], ['¿Pagarías tanto?', 'No, pagaría menos.'], ['¿Tienes la contraseña?', 'No, no la tengo.'], ['¿Volvería usted al pueblo?', 'Volvería si tuviera tiempo.']] },
  { id: 'es:B2:pairs:03', lessonId: 31, format: 'reply_pairs', pairs: [['¿Me llamarás cuando llegues?', 'Te llamaré cuando tenga cobertura.'], ['¿Quiere que hable despacio?', 'Por favor.'], ['¿Mandarías el archivo?', 'Lo mandaría hoy.'], ['¿Tienes dinero?', 'No, pagaré mañana.']] },

  { id: 'es:B2:groups:01', lessonId: 31, format: 'classify_function', kind: 'past_future', items: [['Llamé ayer.', 0], ['Llamaré mañana.', 1], ['Pagamos la factura.', 0], ['Pagaré cuando llegue.', 1]] },
  { id: 'es:B2:groups:02', lessonId: 30, format: 'classify_function', kind: 'one_many', items: [['Quiero que vengas.', 0], ['Queremos que volváis.', 1], ['Buscaría un piso.', 0], ['Alquilaríamos una habitación.', 1]] },
  { id: 'es:B2:groups:03', lessonId: 30, format: 'classify_function', kind: 'person_thing', items: [['El mecánico.', 0], ['La contraseña.', 1], ['El camarero.', 0], ['La pantalla.', 1]] },

  { id: 'es:B2:text:01', lessonId: 32, format: 'evidence_choice', passage: ['Busco un piso barato.', 'Si tuviera dinero, compraría un piso en el centro.', 'Alquilaría una habitación.'], question: '¿Qué compraría si tuviera dinero?', answer: 1 },
  { id: 'es:B2:text:02', lessonId: 31, format: 'evidence_choice', passage: ['No tengo cobertura en el túnel.', 'Te llamaré cuando salga.', 'Quiero que vengas a la estación.'], question: '¿Dónde no tengo cobertura?', answer: 0 },
  { id: 'es:B2:text:03', lessonId: 30, format: 'evidence_choice', passage: ['Quiero que revises el texto.', 'Lo mandaré cuando termine.', 'Pagaré mañana.'], question: '¿Qué quiero que revises?', answer: 0 },
];

// ── Немецкий курс ───────────────────────────────────────────────────────────────────────────────────────────────────
const DE_A1: readonly AuthoredExamItem[] = [
  { id: 'de:A1:reply:01', lessonId: 6, format: 'context_choice', line: 'Wo wohnst du?', right: 'Ich wohne in Berlin.', wrong: ['Um acht Uhr.', 'Ich bin müde.', 'Das kostet viel.'] },
  { id: 'de:A1:reply:02', lessonId: 6, format: 'context_choice', line: 'Wann beginnt der Kurs?', right: 'Um neun Uhr.', wrong: ['Im Büro.', 'Das ist Tom.', 'Ich kaufe Brot.'] },
  { id: 'de:A1:reply:03', lessonId: 6, format: 'context_choice', line: 'Was kaufst du?', right: 'Ich kaufe Brot.', wrong: ['Ich wohne hier.', 'Um zehn Uhr.', 'Ich bin krank.'] },
  { id: 'de:A1:reply:04', lessonId: 6, format: 'context_choice', line: 'Wer ist das?', right: 'Das ist Frau Weber.', wrong: ['Das ist kaputt.', 'Um acht.', 'Im Garten.'] },

  { id: 'de:A1:order:01', lessonId: 6, format: 'dialogue_order', lines: ['A: Wo arbeitest du?', 'B: Ich arbeite im Hotel.', 'A: Und wann beginnt die Arbeit?', 'B: Um acht Uhr.'] },
  { id: 'de:A1:order:02', lessonId: 8, format: 'dialogue_order', lines: ['A: Hast du Hunger?', 'B: Ich habe keinen Hunger.', 'A: Und Durst?', 'B: Durst habe ich auch nicht.'] },
  { id: 'de:A1:order:03', lessonId: 6, format: 'dialogue_order', lines: ['A: Was suchst du?', 'B: Ich suche mein Handy.', 'A: Und wo ist deine Tasche?', 'B: Die Tasche ist im Büro.'] },

  { id: 'de:A1:pairs:01', lessonId: 6, format: 'reply_pairs', pairs: [['Wo wohnst du?', 'In Berlin.'], ['Wann kommt der Bus?', 'Um zehn Uhr.'], ['Was kostet das Ticket?', 'Das kostet nicht viel.'], ['Wer ist krank?', 'Tom ist krank.']] },
  { id: 'de:A1:pairs:02', lessonId: 6, format: 'reply_pairs', pairs: [['Wie lange dauert die Fahrt?', 'Nicht lange.'], ['Wohin fährt der Zug?', 'Nach Berlin.'], ['Was machst du heute?', 'Ich arbeite.'], ['Wo ist die Apotheke?', 'Am Bahnhof.']] },
  { id: 'de:A1:pairs:03', lessonId: 8, format: 'reply_pairs', pairs: [['Hast du Zeit?', 'Heute habe ich keine Zeit.'], ['Was liest du?', 'Ich lese die Zeitung.'], ['Wann öffnet das Café?', 'Um sieben Uhr.'], ['Wer kocht heute?', 'Anna kocht.']] },

  { id: 'de:A1:groups:01', lessonId: 5, format: 'classify_function', kind: 'when_where', items: [['Um acht Uhr.', 0], ['Im Büro.', 1], ['Am Montag.', 0], ['Am Bahnhof.', 1]] },
  { id: 'de:A1:groups:02', lessonId: 3, format: 'classify_function', kind: 'one_many', items: [['Die Tür ist offen.', 0], ['Die Türen sind offen.', 1], ['Der Tisch ist frei.', 0], ['Die Tische sind frei.', 1]] },
  { id: 'de:A1:groups:03', lessonId: 5, format: 'classify_function', kind: 'when_where', items: [['Am Abend.', 0], ['Im Garten.', 1], ['Am Wochenende.', 0], ['In der Küche.', 1]] },

  { id: 'de:A1:text:01', lessonId: 5, format: 'evidence_choice', passage: ['Anna wohnt in Berlin.', 'Sie arbeitet im Hotel.', 'Die Arbeit beginnt um acht Uhr.'], question: 'Wo arbeitet Anna?', answer: 1 },
  { id: 'de:A1:text:02', lessonId: 5, format: 'evidence_choice', passage: ['Das Café öffnet um sieben Uhr.', 'Tom kauft Brot.', 'Das Brot ist warm.'], question: 'Was kauft Tom?', answer: 1 },
  { id: 'de:A1:text:03', lessonId: 6, format: 'evidence_choice', passage: ['Der Bus kommt um zehn Uhr.', 'Die Fahrt dauert nicht lange.', 'Das Ticket kostet nicht viel.'], question: 'Wann kommt der Bus?', answer: 0 },
];

const DE_A2: readonly AuthoredExamItem[] = [
  { id: 'de:A2:reply:01', lessonId: 15, format: 'context_choice', line: 'Kannst du schwimmen?', right: 'Ich kann gut schwimmen.', wrong: ['Ich muss aufstehen.', 'Ich habe gekocht.', 'Im Kino.'] },
  { id: 'de:A2:reply:02', lessonId: 18, format: 'context_choice', line: 'Was hast du gestern gemacht?', right: 'Ich habe gekocht.', wrong: ['Ich koche morgen.', 'Ich kann kochen.', 'Ich muss kochen.'] },
  { id: 'de:A2:reply:03', lessonId: 11, format: 'context_choice', line: 'Wo liegt das Buch?', right: 'Es liegt auf dem Tisch.', wrong: ['Er geht ins Kino.', 'Ich habe es gekauft.', 'Um acht Uhr.'] },

  { id: 'de:A2:order:01', lessonId: 18, format: 'dialogue_order', lines: ['A: Was hast du gestern gemacht?', 'B: Ich habe gekocht.', 'A: Und was hast du gekocht?', 'B: Suppe mit Gemüse.'] },
  { id: 'de:A2:order:02', lessonId: 15, format: 'dialogue_order', lines: ['A: Kannst du mir helfen?', 'B: Ich muss gleich gehen.', 'A: Und morgen?', 'B: Morgen kann ich.'] },
  { id: 'de:A2:order:03', lessonId: 11, format: 'dialogue_order', lines: ['A: Wo ist mein Pass?', 'B: Er liegt auf dem Tisch.', 'A: Und meine Brille?', 'B: Sie liegt neben dem Pass.'] },

  { id: 'de:A2:pairs:01', lessonId: 18, format: 'reply_pairs', pairs: [['Kannst du schwimmen?', 'Ich kann gut schwimmen.'], ['Darf man hier parken?', 'Hier darf man nicht parken.'], ['Was hast du gekauft?', 'Ich habe Brot gekauft.'], ['Wo hängt das Bild?', 'An der Wand.']] },
  { id: 'de:A2:pairs:02', lessonId: 15, format: 'reply_pairs', pairs: [['Wo steht das Auto?', 'Hinter dem Haus.'], ['Musst du morgen arbeiten?', 'Morgen muss ich nicht arbeiten.'], ['Wohin gehst du?', 'Ich gehe ins Kino.'], ['Was möchtest du?', 'Ich möchte etwas trinken.']] },
  { id: 'de:A2:pairs:03', lessonId: 18, format: 'reply_pairs', pairs: [['Hast du gestern gearbeitet?', 'Gestern habe ich nicht gearbeitet.'], ['Wo sitzt der Hund?', 'Unter dem Tisch.'], ['Kann ich hier zahlen?', 'Bitte an der Kasse.'], ['Wann stehst du auf?', 'Um sechs Uhr.']] },

  { id: 'de:A2:groups:01', lessonId: 18, format: 'classify_function', kind: 'now_past', items: [['Ich koche Suppe.', 0], ['Ich habe Suppe gekocht.', 1], ['Wir kaufen Brot.', 0], ['Wir haben Brot gekauft.', 1]] },
  { id: 'de:A2:groups:02', lessonId: 18, format: 'classify_function', kind: 'when_where', items: [['Gestern.', 0], ['Hinter dem Haus.', 1], ['Morgen früh.', 0], ['Auf dem Tisch.', 1]] },
  { id: 'de:A2:groups:03', lessonId: 9, format: 'classify_function', kind: 'one_many', items: [['Das Kind spielt.', 0], ['Die Kinder spielen.', 1], ['Mein Freund kommt.', 0], ['Meine Freunde kommen.', 1]] },

  { id: 'de:A2:text:01', lessonId: 18, format: 'evidence_choice', passage: ['Gestern habe ich gekocht.', 'Meine Schwester hat Brot gekauft.', 'Mein Bruder hat gearbeitet.'], question: 'Was hat meine Schwester gekauft?', answer: 1 },
  { id: 'de:A2:text:02', lessonId: 11, format: 'evidence_choice', passage: ['Der Pass liegt auf dem Tisch.', 'Die Brille liegt neben dem Pass.', 'Der Schlüssel hängt an der Wand.'], question: 'Wo hängt der Schlüssel?', answer: 2 },
  { id: 'de:A2:text:03', lessonId: 15, format: 'evidence_choice', passage: ['Tom muss morgen arbeiten.', 'Er kann nicht mitkommen.', 'Anna geht allein ins Kino.'], question: 'Wer geht ins Kino?', answer: 2 },
];

const DE_B1: readonly AuthoredExamItem[] = [
  { id: 'de:B1:reply:01', lessonId: 20, format: 'context_choice', line: 'Welcher Zug ist schneller?', right: 'Der erste Zug ist schneller.', wrong: ['Der Zug ist rot.', 'Weil es regnet.', 'Ich glaube, dass er kommt.'] },
  { id: 'de:B1:reply:02', lessonId: 23, format: 'context_choice', line: 'Was machst du, wenn es regnet?', right: 'Wenn es regnet, bleibe ich zu Hause.', wrong: ['Weil es regnet.', 'Es regnete gestern.', 'Ich freue mich.'] },
  { id: 'de:B1:reply:03', lessonId: 24, format: 'context_choice', line: 'Was sah Anna, als sie ankam?', right: 'Sie sah, dass die Tür offen war.', wrong: ['Sie kommt morgen.', 'Weil sie müde ist.', 'Sie ist größer als Tom.'] },

  { id: 'de:B1:order:01', lessonId: 21, format: 'dialogue_order', lines: ['A: Kommst du heute mit ins Kino?', 'B: Ich bleibe lieber zu Hause.', 'A: Weil du müde bist?', 'B: Weil ich morgen früh arbeiten muss.'] },
  { id: 'de:B1:order:02', lessonId: 20, format: 'dialogue_order', lines: ['A: Welcher Zug ist schneller?', 'B: Der erste ist schneller.', 'A: Und welcher ist billiger?', 'B: Der zweite ist billiger.'] },
  { id: 'de:B1:order:03', lessonId: 24, format: 'dialogue_order', lines: ['A: Als ich ankam, war die Tür offen.', 'B: Und war Anna zu Hause?', 'A: Anna war nicht da.', 'B: Ich rufe sie gleich an.'] },

  { id: 'de:B1:pairs:01', lessonId: 23, format: 'reply_pairs', pairs: [['Welcher Zug ist schneller?', 'Der erste.'], ['Was machst du, wenn es regnet?', 'Ich bleibe zu Hause.'], ['Freut ihr euch?', 'Wir freuen uns.'], ['Weißt du, wo Tom ist?', 'Ich glaube, er schläft.']] },
  { id: 'de:B1:pairs:02', lessonId: 25, format: 'reply_pairs', pairs: [['Ist dein Bruder älter als du?', 'Er ist jünger.'], ['Wer kam gestern an?', 'Meine Tochter kam an.'], ['Wo wohnte Anna früher?', 'Sie wohnte in Berlin.'], ['Was fehlt hier?', 'Der Schlüssel fehlt.']] },
  { id: 'de:B1:pairs:03', lessonId: 24, format: 'reply_pairs', pairs: [['Ist das Zimmer ruhiger?', 'Es ist genauso laut.'], ['Regnet es?', 'Die Sonne scheint.'], ['Was sagt Tom?', 'Er sagt, dass er später kommt.'], ['Wann klingelte das Handy?', 'Als ich schlief.']] },

  { id: 'de:B1:groups:01', lessonId: 25, format: 'classify_function', kind: 'now_past', items: [['Anna wohnt in Berlin.', 0], ['Anna wohnte in Berlin.', 1], ['Der Zug kommt.', 0], ['Der Zug kam.', 1]] },
  { id: 'de:B1:groups:02', lessonId: 24, format: 'classify_function', kind: 'now_past', items: [['Es regnet.', 0], ['Es regnete.', 1], ['Ich höre Musik.', 0], ['Ich hörte Musik.', 1]] },
  { id: 'de:B1:groups:03', lessonId: 25, format: 'classify_function', kind: 'one_many', items: [['Der Schüler lernt.', 0], ['Die Menschen warten.', 1], ['Meine Tochter schläft.', 0], ['Die Kinder lachen.', 1]] },

  { id: 'de:B1:text:01', lessonId: 24, format: 'evidence_choice', passage: ['Als Anna ankam, war die Tür offen.', 'Sie hörte Musik.', 'Tom war nicht zu Hause.'], question: 'Was hörte Anna?', answer: 1 },
  { id: 'de:B1:text:02', lessonId: 20, format: 'evidence_choice', passage: ['Der erste Zug ist schneller.', 'Der zweite Zug ist billiger.', 'Tom nimmt den Bus.'], question: 'Welcher Zug ist billiger?', answer: 1 },
  { id: 'de:B1:text:03', lessonId: 23, format: 'evidence_choice', passage: ['Wenn es regnet, bleibe ich zu Hause.', 'Wenn die Sonne scheint, gehe ich in den Garten.', 'Heute regnet es.'], question: 'Was mache ich, wenn es regnet?', answer: 0 },
];

const DE_B2: readonly AuthoredExamItem[] = [
  { id: 'de:B2:reply:01', lessonId: 29, format: 'context_choice', line: 'Was hätten Sie gern?', right: 'Ich hätte gern einen Kaffee.', wrong: ['Ich habe einen Kaffee gekauft.', 'Weil ich Durst habe.', 'Wenn ich Zeit hätte.'] },
  { id: 'de:B2:reply:02', lessonId: 29, format: 'context_choice', line: 'Könnten Sie mir helfen?', right: 'Gern, was brauchen Sie?', wrong: ['Ich hätte gern Salz.', 'Das wäre ein Fehler.', 'Nachdem ich ankam.'] },
  { id: 'de:B2:reply:03', lessonId: 30, format: 'context_choice', line: 'Weißt du, ob der Laden offen ist?', right: 'Ich glaube, er ist geschlossen.', wrong: ['Ich hätte gern ein Brot.', 'Wenn ich Zeit hätte, würde ich kommen.', 'Er wäre gern hier.'] },

  { id: 'de:B2:order:01', lessonId: 29, format: 'dialogue_order', lines: ['A: Ich hätte gern ein ruhiges Zimmer.', 'B: Ein ruhiges Zimmer ist leider nicht frei.', 'A: Und morgen?', 'B: Morgen wäre ein ruhiges Zimmer frei.'] },
  { id: 'de:B2:order:02', lessonId: 30, format: 'dialogue_order', lines: ['A: Könntest du mir helfen?', 'B: Was brauchst du?', 'A: Ich weiß nicht, wo mein Schlüssel ist.', 'B: Ich würde im Auto nachsehen.'] },
  { id: 'de:B2:order:03', lessonId: 32, format: 'dialogue_order', lines: ['A: Wenn ich Zeit hätte, würde ich mitkommen.', 'B: Warum hast du keine Zeit?', 'A: Weil ich arbeiten muss.', 'B: Könntest du morgen kommen?'] },

  { id: 'de:B2:pairs:01', lessonId: 30, format: 'reply_pairs', pairs: [['Was hätten Sie gern?', 'Einen Kaffee, bitte.'], ['Könntest du leiser sprechen?', 'Ich spreche leiser.'], ['Weißt du, warum er nicht kommt?', 'Er hat einen Unfall gehabt.'], ['Würdest du mir helfen?', 'Gern.']] },
  { id: 'de:B2:pairs:02', lessonId: 31, format: 'reply_pairs', pairs: [['Wärst du gern zu Hause?', 'Ich wäre lieber am Meer.'], ['Weißt du, ob das Ticket gültig ist?', 'Es ist abgelaufen.'], ['Welche Größe brauchen Sie?', 'Ich weiß es nicht.'], ['Ist etwas passiert?', 'Es ist nichts passiert.']] },
  { id: 'de:B2:pairs:03', lessonId: 32, format: 'reply_pairs', pairs: [['Könnten Sie das wiederholen?', 'Gern.'], ['Hättest du Zeit?', 'Heute leider nicht.'], ['Wer hat den Fehler bemerkt?', 'Der Fahrer.'], ['Was würdest du wählen?', 'Ich würde das Auto wählen.']] },

  { id: 'de:B2:groups:01', lessonId: 32, format: 'classify_function', kind: 'person_thing', items: [['Der Fahrer.', 0], ['Das Werkzeug.', 1], ['Die Ärztin.', 0], ['Der Kalender.', 1]] },
  { id: 'de:B2:groups:02', lessonId: 29, format: 'classify_function', kind: 'one_many', items: [['Ich hätte gern einen Kaffee.', 0], ['Wir hätten gern einen Kaffee.', 1], ['Er würde kommen.', 0], ['Sie würden kommen.', 1]] },
  { id: 'de:B2:groups:03', lessonId: 31, format: 'classify_function', kind: 'when_where', items: [['Am Vortag.', 0], ['Am Meer.', 1], ['Nachdem der Zug ankam.', 0], ['Im Auto.', 1]] },

  { id: 'de:B2:text:01', lessonId: 29, format: 'evidence_choice', passage: ['Ich hätte gern ein ruhiges Zimmer.', 'Heute ist leider nichts frei.', 'Morgen wäre ein Zimmer frei.'], question: 'Wann wäre ein Zimmer frei?', answer: 2 },
  { id: 'de:B2:text:02', lessonId: 32, format: 'evidence_choice', passage: ['Tom hat einen Fehler bemerkt.', 'Er hat ihn gemeldet.', 'Der Fahrer war überrascht.'], question: 'Wer war überrascht?', answer: 2 },
  { id: 'de:B2:text:03', lessonId: 32, format: 'evidence_choice', passage: ['Wenn ich Zeit hätte, würde ich mitkommen.', 'Ich muss aber arbeiten.', 'Morgen könnte ich kommen.'], question: 'Wann könnte ich kommen?', answer: 2 },
];

// ── Французский курс ────────────────────────────────────────────────────────────────────────────────────────────────
const FR_A1: readonly AuthoredExamItem[] = [
  { id: 'fr:A1:reply:01', lessonId: 4, format: 'context_choice', line: 'Es-tu fatigué?', right: 'Je suis très fatigué.', wrong: ['Elle est à la gare.', 'Le magasin est ouvert.', 'Ils sont ici.'] },
  { id: 'fr:A1:reply:02', lessonId: 4, format: 'context_choice', line: 'Est-ce que le magasin est ouvert?', right: 'Il est fermé.', wrong: ['Il est fatigué.', 'Je suis ici.', 'Elles sont ensemble.'] },
  { id: 'fr:A1:reply:03', lessonId: 7, format: 'context_choice', line: 'As-tu faim?', right: 'J’ai très faim.', wrong: ['Je suis à la maison.', 'Il est ouvert.', 'Elle est seule.'] },

  { id: 'fr:A1:order:01', lessonId: 7, format: 'dialogue_order', lines: ['A: As-tu la clé?', 'B: Elle est dans mon sac.', 'A: Est-elle avec les billets?', 'B: Les billets sont sur la table.'] },
  { id: 'fr:A1:order:02', lessonId: 5, format: 'dialogue_order', lines: ['A: Est-ce que le musée est ouvert?', 'B: Il est fermé aujourd’hui.', 'A: Est-il ouvert demain?', 'B: Demain, il est ouvert.'] },
  { id: 'fr:A1:order:03', lessonId: 6, format: 'dialogue_order', lines: ['A: C’est ton frère?', 'B: C’est mon voisin.', 'A: Est-il avec ta sœur?', 'B: Il est seul.'] },

  { id: 'fr:A1:pairs:01', lessonId: 7, format: 'reply_pairs', pairs: [['Es-tu prêt?', 'Je suis prêt.'], ['As-tu soif?', 'J’ai très soif.'], ['Est-ce que le café est ouvert?', 'Il est fermé.'], ['C’est ta sœur?', 'C’est ma voisine.']] },
  { id: 'fr:A1:pairs:02', lessonId: 7, format: 'reply_pairs', pairs: [['Êtes-vous en retard?', 'Nous sommes en avance.'], ['A-t-il un vélo?', 'Il a une voiture.'], ['Sont-elles à la gare?', 'Elles sont au musée.'], ['As-tu ton passeport?', 'Il est dans mon sac.']] },
  { id: 'fr:A1:pairs:03', lessonId: 7, format: 'reply_pairs', pairs: [['Est-ce que la porte est ouverte?', 'Elle est fermée.'], ['Avez-vous faim?', 'Nous avons froid.'], ['Est-il seul?', 'Il est avec ses amis.'], ['As-tu une idée?', 'J’ai une question.']] },

  { id: 'fr:A1:groups:01', lessonId: 3, format: 'classify_function', kind: 'one_many', items: [['La porte est ouverte.', 0], ['Les portes sont ouvertes.', 1], ['Le magasin est fermé.', 0], ['Les magasins sont fermés.', 1]] },
  { id: 'fr:A1:groups:02', lessonId: 6, format: 'classify_function', kind: 'person_thing', items: [['Mon frère.', 0], ['Mon sac.', 1], ['Ma voisine.', 0], ['Ma clé.', 1]] },
  { id: 'fr:A1:groups:03', lessonId: 2, format: 'classify_function', kind: 'one_many', items: [['Je suis prêt.', 0], ['Nous sommes prêts.', 1], ['Elle est fatiguée.', 0], ['Ils sont fatigués.', 1]] },

  { id: 'fr:A1:text:01', lessonId: 2, format: 'evidence_choice', passage: ['Paul est au bureau.', 'Léa est à la maison.', 'Elle est fatiguée.'], question: 'Est-ce que Léa est au bureau?', answer: 1 },
  { id: 'fr:A1:text:02', lessonId: 5, format: 'evidence_choice', passage: ['Le musée est fermé aujourd’hui.', 'Le café est ouvert.', 'Les billets sont sur la table.'], question: 'Est-ce que le café est ouvert?', answer: 1 },
  { id: 'fr:A1:text:03', lessonId: 7, format: 'evidence_choice', passage: ['J’ai faim.', 'Mon frère a soif.', 'Ma sœur a froid.'], question: 'Est-ce que ma sœur a froid?', answer: 2 },
];

const FR_A2: readonly AuthoredExamItem[] = [
  { id: 'fr:A2:reply:01', lessonId: 11, format: 'context_choice', line: 'Tu vas au travail à pied?', right: 'Je prends le métro.', wrong: ['Je mange du riz.', 'Elle est verte.', 'Je voudrais du lait.'] },
  { id: 'fr:A2:reply:02', lessonId: 14, format: 'context_choice', line: 'Tu veux boire quelque chose?', right: 'Je voudrais du thé.', wrong: ['Je vais à la piscine.', 'Il est trop grand.', 'Elle va à l’école.'] },
  { id: 'fr:A2:reply:03', lessonId: 14, format: 'context_choice', line: 'Tu peux venir demain?', right: 'Demain, je dois rester à la maison.', wrong: ['Je prends du pain.', 'Elle est neuve.', 'Nous mangeons des pâtes.'] },

  { id: 'fr:A2:order:01', lessonId: 12, format: 'dialogue_order', lines: ['A: Tu vas au marché?', 'B: Je vais au marché après le déjeuner.', 'A: Et tu prends du poisson?', 'B: Je prends du poisson et du pain.'] },
  { id: 'fr:A2:order:02', lessonId: 14, format: 'dialogue_order', lines: ['A: Tu veux boire quelque chose?', 'B: Je voudrais du thé.', 'A: Et avec du sucre?', 'B: Avec beaucoup de sucre.'] },
  { id: 'fr:A2:order:03', lessonId: 14, format: 'dialogue_order', lines: ['A: Tu peux venir demain?', 'B: Demain, je dois rester à la maison.', 'A: Et après le déjeuner?', 'B: Après le déjeuner, je peux venir.'] },

  { id: 'fr:A2:pairs:01', lessonId: 14, format: 'reply_pairs', pairs: [['Tu vas au travail à pied?', 'Je prends le métro.'], ['Tu veux du lait?', 'Je voudrais du thé.'], ['Tu peux attendre?', 'Je dois partir.'], ['Elle mange du poisson?', 'Elle mange du poulet.']] },
  { id: 'fr:A2:pairs:02', lessonId: 14, format: 'reply_pairs', pairs: [['Vous allez à la piscine?', 'Nous allons au parc.'], ['Il boit du jus?', 'Il boit du lait.'], ['Tu prends la valise?', 'Elle est trop lourde.'], ['Ils peuvent entrer?', 'Ils peuvent attendre.']] },
  { id: 'fr:A2:pairs:03', lessonId: 13, format: 'reply_pairs', pairs: [['Tu veux la robe verte?', 'Je prends la robe grise.'], ['Nous pouvons passer?', 'Vous pouvez passer.'], ['Tu vas chez le médecin?', 'Je vais chez le dentiste.'], ['Il achète du pain?', 'Il achète du riz.']] },

  { id: 'fr:A2:groups:01', lessonId: 12, format: 'classify_function', kind: 'one_many', items: [['Je vais au marché.', 0], ['Nous allons au marché.', 1], ['Il prend du pain.', 0], ['Ils prennent du pain.', 1]] },
  { id: 'fr:A2:groups:02', lessonId: 11, format: 'classify_function', kind: 'person_thing', items: [['Le médecin.', 0], ['La valise.', 1], ['Le dentiste.', 0], ['La bouteille.', 1]] },
  { id: 'fr:A2:groups:03', lessonId: 13, format: 'classify_function', kind: 'one_many', items: [['La robe est verte.', 0], ['Les chaussettes sont noires.', 1], ['La valise est lourde.', 0], ['Les boîtes sont pleines.', 1]] },

  { id: 'fr:A2:text:01', lessonId: 12, format: 'evidence_choice', passage: ['Je vais au marché après le déjeuner.', 'Je prends du poisson et du pain.', 'Mon frère va à la piscine.'], question: 'Est-ce que je prends du poisson?', answer: 1 },
  { id: 'fr:A2:text:02', lessonId: 14, format: 'evidence_choice', passage: ['Léa veut du thé.', 'Paul veut du lait.', 'Je voudrais du jus.'], question: 'Est-ce que Paul veut du lait?', answer: 1 },
  { id: 'fr:A2:text:03', lessonId: 14, format: 'evidence_choice', passage: ['Demain, je dois rester à la maison.', 'Je peux venir après le déjeuner.', 'Nous allons au parc ensemble.'], question: 'Est-ce que je peux venir après le déjeuner?', answer: 1 },
];

const FR_B1: readonly AuthoredExamItem[] = [
  { id: 'fr:B1:reply:01', lessonId: 19, format: 'context_choice', line: 'Paul est parti?', right: 'Il est parti sans son sac.', wrong: ['Il habitait ici.', 'Je le vois.', 'Elle est née en juin.'] },
  { id: 'fr:B1:reply:02', lessonId: 20, format: 'context_choice', line: 'Tu habitais près du port?', right: 'J’habitais près du canal.', wrong: ['Je suis arrivé.', 'Je le connais.', 'Elle est tombée.'] },
  { id: 'fr:B1:reply:03', lessonId: 22, format: 'context_choice', line: 'Tu connais mon voisin?', right: 'Je le connais.', wrong: ['Il pleuvait.', 'Elle est partie.', 'J’étais à la maison.'] },

  { id: 'fr:B1:order:01', lessonId: 19, format: 'dialogue_order', lines: ['A: Léa est arrivée?', 'B: Elle est arrivée avec ses cousins.', 'A: Et ils sont restés?', 'B: Ils sont partis après le déjeuner.'] },
  { id: 'fr:B1:order:02', lessonId: 20, format: 'dialogue_order', lines: ['A: Tu habitais près du port?', 'B: J’habitais près du canal.', 'A: Et le port était loin?', 'B: Il était très proche.'] },
  { id: 'fr:B1:order:03', lessonId: 22, format: 'dialogue_order', lines: ['A: Tu connais mon voisin?', 'B: Je le connais.', 'A: Et tu le vois aujourd’hui?', 'B: Je le vois ce soir.'] },

  { id: 'fr:B1:pairs:01', lessonId: 22, format: 'reply_pairs', pairs: [['Léa est arrivée?', 'Elle est déjà arrivée.'], ['Tu connais Paul?', 'Je le connais.'], ['Il pleuvait?', 'Il faisait beau.'], ['Tu lis le journal?', 'Je le lis.']] },
  { id: 'fr:B1:pairs:02', lessonId: 20, format: 'reply_pairs', pairs: [['Les clientes sont entrées?', 'Elles sont déjà parties.'], ['Tu habitais ici?', 'J’habitais près du port.'], ['Paul était fatigué?', 'Il était très fatigué.'], ['Elle est tombée?', 'Elle est tombée dans l’escalier.']] },
  { id: 'fr:B1:pairs:03', lessonId: 21, format: 'reply_pairs', pairs: [['Tes cousins sont venus?', 'Ils sont venus sans leurs enfants.'], ['Le train est parti?', 'Il est déjà parti.'], ['Il y avait du vent?', 'Le vent soufflait fort.'], ['Tu dormais?', 'Je lisais le journal.']] },

  { id: 'fr:B1:groups:01', lessonId: 20, format: 'classify_function', kind: 'now_past', items: [['Il est ici.', 0], ['Il était ici.', 1], ['Nous sommes au port.', 0], ['Nous étions au port.', 1]] },
  { id: 'fr:B1:groups:02', lessonId: 19, format: 'classify_function', kind: 'one_many', items: [['Il est parti.', 0], ['Ils sont partis.', 1], ['Elle est arrivée.', 0], ['Elles sont arrivées.', 1]] },
  { id: 'fr:B1:groups:03', lessonId: 20, format: 'classify_function', kind: 'now_past', items: [['Elle a un vélo.', 0], ['Elle avait un vélo.', 1], ['Ils ont un chat.', 0], ['Ils avaient un chat.', 1]] },

  { id: 'fr:B1:text:01', lessonId: 19, format: 'evidence_choice', passage: ['Léa est arrivée avec ses cousins.', 'Ils sont restés pour le déjeuner.', 'Ils sont partis sans leurs enfants.'], question: 'Est-ce qu’ils sont restés pour le déjeuner?', answer: 1 },
  { id: 'fr:B1:text:02', lessonId: 20, format: 'evidence_choice', passage: ['J’habitais près du port.', 'Je travaillais au marché.', 'Il pleuvait toujours.'], question: 'Est-ce que je travaillais au marché?', answer: 1 },
  { id: 'fr:B1:text:03', lessonId: 21, format: 'evidence_choice', passage: ['Paul a perdu son gant.', 'Il était dans le train.', 'Le train est déjà parti.'], question: 'Est-ce que le train est parti?', answer: 2 },
];

const FR_B2: readonly AuthoredExamItem[] = [
  { id: 'fr:B2:reply:01', lessonId: 32, format: 'context_choice', line: 'Tu viendrais avec moi?', right: 'Je viendrais si j’étais libre.', wrong: ['J’avais mangé.', 'Voilà la cave.', 'Il a réussi.'] },
  { id: 'fr:B2:reply:02', lessonId: 31, format: 'context_choice', line: 'Tu avais mangé?', right: 'J’avais déjà mangé.', wrong: ['Je viendrais demain.', 'Voici le code.', 'Elle est contente.'] },
  { id: 'fr:B2:reply:03', lessonId: 32, format: 'context_choice', line: 'Tu resterais ici?', right: 'Je resterais si c’était calme.', wrong: ['J’avais dormi.', 'Voilà le plat.', 'Il a réussi.'] },

  { id: 'fr:B2:order:01', lessonId: 32, format: 'dialogue_order', lines: ['A: Tu viendrais avec moi?', 'B: Je viendrais si j’étais libre.', 'A: Et demain?', 'B: Demain, je viendrais.'] },
  { id: 'fr:B2:order:02', lessonId: 29, format: 'dialogue_order', lines: ['A: Voici le code.', 'B: Il est valable?', 'A: Il est valable aujourd’hui.', 'B: Alors je le note.'] },
  { id: 'fr:B2:order:03', lessonId: 31, format: 'dialogue_order', lines: ['A: Tu avais mangé?', 'B: J’avais déjà mangé.', 'A: Et Paul?', 'B: Il n’avait pas mangé.'] },

  { id: 'fr:B2:pairs:01', lessonId: 32, format: 'reply_pairs', pairs: [['Tu viendrais avec moi?', 'Je viendrais si j’étais libre.'], ['Tu avais mangé?', 'J’avais déjà mangé.'], ['Le code est valable?', 'Il est valable aujourd’hui.'], ['Elle a réussi?', 'Elle est contente.']] },
  { id: 'fr:B2:pairs:02', lessonId: 32, format: 'reply_pairs', pairs: [['Tu resterais ici?', 'Je resterais si c’était calme.'], ['Il a disparu?', 'Il est revenu.'], ['Tu avais dormi?', 'J’avais mal dormi.'], ['C’est simple?', 'C’est très simple.']] },
  { id: 'fr:B2:pairs:03', lessonId: 31, format: 'reply_pairs', pairs: [['Il viendrait demain?', 'Il viendrait ce soir.'], ['Tu avais reconnu Paul?', 'Je n’avais pas reconnu Paul.'], ['Le plat est délicieux?', 'Il est presque froid.'], ['Elle était partie?', 'Elle était déjà partie.']] },

  { id: 'fr:B2:groups:01', lessonId: 32, format: 'classify_function', kind: 'one_many', items: [['Je viendrais.', 0], ['Nous partirions.', 1], ['Il viendrait.', 0], ['Nous arriverions.', 1]] },
  { id: 'fr:B2:groups:02', lessonId: 31, format: 'classify_function', kind: 'now_past', items: [['Il est ici.', 0], ['Il était ici.', 1], ['J’ai faim.', 0], ['J’avais faim.', 1]] },
  { id: 'fr:B2:groups:03', lessonId: 30, format: 'classify_function', kind: 'person_thing', items: [['Le gardien.', 0], ['Le panneau.', 1], ['La dame.', 0], ['Le papier.', 1]] },

  { id: 'fr:B2:text:01', lessonId: 32, format: 'evidence_choice', passage: ['Je viendrais si j’étais libre.', 'Aujourd’hui, je dois rester au bureau.', 'Demain, je viendrais.'], question: 'Est-ce que je dois rester au bureau aujourd’hui?', answer: 1 },
  { id: 'fr:B2:text:02', lessonId: 31, format: 'evidence_choice', passage: ['J’avais déjà mangé.', 'Paul n’avait pas mangé.', 'Il avait faim.'], question: 'Est-ce que Paul avait faim?', answer: 2 },
  { id: 'fr:B2:text:03', lessonId: 29, format: 'evidence_choice', passage: ['Voici le code.', 'Il est valable aujourd’hui.', 'Demain, il n’est pas valable.'], question: 'Est-ce que le code est valable demain?', answer: 2 },
];

// ── Итальянский курс ────────────────────────────────────────────────────────────────────────────────────────────────
const IT_A1: readonly AuthoredExamItem[] = [
  { id: 'it:A1:reply:01', lessonId: 4, format: 'context_choice', line: 'Sei stanco?', right: 'Sono molto stanco.', wrong: ['Lei è alla stazione.', 'Il negozio è aperto.', 'Sono qui.'] },
  { id: 'it:A1:reply:02', lessonId: 4, format: 'context_choice', line: 'Il negozio è aperto?', right: 'È chiuso.', wrong: ['È stanco.', 'Sono qui.', 'Siamo insieme.'] },
  { id: 'it:A1:reply:03', lessonId: 7, format: 'context_choice', line: 'Hai fame?', right: 'Non ho fame.', wrong: ['Sono a casa.', 'È aperto.', 'È sola.'] },

  { id: 'it:A1:order:01', lessonId: 7, format: 'dialogue_order', lines: ['A: Hai la chiave?', 'B: È nella borsa.', 'A: È con i biglietti?', 'B: I biglietti sono sul tavolo.'] },
  { id: 'it:A1:order:02', lessonId: 5, format: 'dialogue_order', lines: ['A: Il museo è aperto?', 'B: Oggi è chiuso.', 'A: Domani è ancora chiuso?', 'B: Domani è aperto.'] },
  { id: 'it:A1:order:03', lessonId: 6, format: 'dialogue_order', lines: ['A: È tuo fratello?', 'B: È il mio vicino.', 'A: È con tua sorella?', 'B: È solo.'] },

  { id: 'it:A1:pairs:01', lessonId: 7, format: 'reply_pairs', pairs: [['Sei pronto?', 'Sono pronto.'], ['Hai sete?', 'Ho sete.'], ['Il bar è aperto?', 'È chiuso.'], ['È tua sorella?', 'È la mia vicina.']] },
  { id: 'it:A1:pairs:02', lessonId: 7, format: 'reply_pairs', pairs: [['Siete in ritardo?', 'Siamo in anticipo.'], ['Ha una bicicletta?', 'Ha un biglietto.'], ['Sono alla stazione?', 'Sono al museo.'], ['Hai il passaporto?', 'È nella borsa.']] },
  { id: 'it:A1:pairs:03', lessonId: 7, format: 'reply_pairs', pairs: [['La porta è aperta?', 'È chiusa.'], ['Avete fame?', 'Abbiamo freddo.'], ['È solo?', 'È con i suoi amici.'], ['Hai un’idea?', 'Ho una domanda.']] },

  { id: 'it:A1:groups:01', lessonId: 3, format: 'classify_function', kind: 'one_many', items: [['La porta è aperta.', 0], ['Le porte sono aperte.', 1], ['Il negozio è chiuso.', 0], ['I negozi sono chiusi.', 1]] },
  { id: 'it:A1:groups:02', lessonId: 6, format: 'classify_function', kind: 'person_thing', items: [['Mio fratello.', 0], ['La borsa.', 1], ['Mia sorella.', 0], ['La chiave.', 1]] },
  { id: 'it:A1:groups:03', lessonId: 2, format: 'classify_function', kind: 'one_many', items: [['Sono pronto.', 0], ['Siamo pronti.', 1], ['È stanca.', 0], ['Sono stanchi.', 1]] },

  { id: 'it:A1:text:01', lessonId: 2, format: 'evidence_choice', passage: ['Paolo è in ufficio.', 'Lea è a casa.', 'Lei è stanca.'], question: 'Lea è in ufficio?', answer: 1 },
  { id: 'it:A1:text:02', lessonId: 5, format: 'evidence_choice', passage: ['Oggi il museo è chiuso.', 'Il bar è aperto.', 'I biglietti sono sul tavolo.'], question: 'Il bar è aperto?', answer: 1 },
  { id: 'it:A1:text:03', lessonId: 7, format: 'evidence_choice', passage: ['Ho fame.', 'Mio fratello ha sete.', 'Mia sorella ha freddo.'], question: 'Mia sorella ha freddo?', answer: 2 },
];

const IT_A2: readonly AuthoredExamItem[] = [
  { id: 'it:A2:reply:01', lessonId: 11, format: 'context_choice', line: 'Vai in ufficio a piedi?', right: 'Prendo la metropolitana.', wrong: ['Mangio del riso.', 'È verde.', 'Vorrei del latte.'] },
  { id: 'it:A2:reply:02', lessonId: 14, format: 'context_choice', line: 'Vuoi una tazza di tè?', right: 'Vorrei del tè.', wrong: ['Vado in piscina.', 'È troppo grande.', 'Lei va a scuola.'] },
  { id: 'it:A2:reply:03', lessonId: 14, format: 'context_choice', line: 'Puoi venire domani?', right: 'Domani posso venire.', wrong: ['Prendo del pane.', 'È nuova.', 'Mangiamo la pasta.'] },

  { id: 'it:A2:order:01', lessonId: 12, format: 'dialogue_order', lines: ['A: Vai al mercato?', 'B: Vado al mercato dopo pranzo.', 'A: E prendi del pesce?', 'B: Prendo del pesce e del pane.'] },
  { id: 'it:A2:order:02', lessonId: 14, format: 'dialogue_order', lines: ['A: Vuoi una tazza di tè?', 'B: Vorrei del tè.', 'A: E con lo zucchero?', 'B: Con molto zucchero.'] },
  { id: 'it:A2:order:03', lessonId: 14, format: 'dialogue_order', lines: ['A: Puoi venire domani?', 'B: Domani vado dal medico.', 'A: E dopo pranzo?', 'B: Dopo pranzo posso venire.'] },

  { id: 'it:A2:pairs:01', lessonId: 14, format: 'reply_pairs', pairs: [['Vai in ufficio a piedi?', 'Prendo la metropolitana.'], ['Vuoi del latte?', 'Vorrei del tè.'], ['Puoi entrare?', 'Posso entrare dopo.'], ['Lei mangia il pesce?', 'Mangia il pollo.']] },
  { id: 'it:A2:pairs:02', lessonId: 12, format: 'reply_pairs', pairs: [['Andate in piscina?', 'Andiamo al parco.'], ['Beve il succo?', 'Beve il latte.'], ['Prendi la valigia?', 'È troppo pesante.'], ['Vanno dal medico?', 'Vanno dal dentista.']] },
  { id: 'it:A2:pairs:03', lessonId: 13, format: 'reply_pairs', pairs: [['Vuoi il vestito verde?', 'Prendo il vestito grigio.'], ['Può venire?', 'Può venire domani.'], ['Vai dal medico?', 'Vado dal dentista.'], ['Compra del pane?', 'Compra del riso.']] },

  { id: 'it:A2:groups:01', lessonId: 12, format: 'classify_function', kind: 'one_many', items: [['Vado al mercato.', 0], ['Andiamo al mercato.', 1], ['Prende del pane.', 0], ['Prendono del pane.', 1]] },
  { id: 'it:A2:groups:02', lessonId: 11, format: 'classify_function', kind: 'person_thing', items: [['Il medico.', 0], ['La valigia.', 1], ['Il dentista.', 0], ['La bottiglia.', 1]] },
  { id: 'it:A2:groups:03', lessonId: 13, format: 'classify_function', kind: 'one_many', items: [['La gonna è verde.', 0], ['I calzini sono neri.', 1], ['La scatola è piena.', 0], ['Le scatole sono piene.', 1]] },

  { id: 'it:A2:text:01', lessonId: 12, format: 'evidence_choice', passage: ['Vado al mercato dopo pranzo.', 'Prendo del pesce e del pane.', 'Mio fratello va in piscina.'], question: 'Mio fratello va in piscina?', answer: 2 },
  { id: 'it:A2:text:02', lessonId: 12, format: 'evidence_choice', passage: ['Lea prende del tè.', 'Paolo prende del latte.', 'Vorrei del succo.'], question: 'Paolo prende del latte?', answer: 1 },
  { id: 'it:A2:text:03', lessonId: 14, format: 'evidence_choice', passage: ['Domani vado dal medico.', 'Dopo pranzo posso venire.', 'Andiamo al parco insieme.'], question: 'Dopo pranzo posso venire?', answer: 1 },
];

const IT_B1: readonly AuthoredExamItem[] = [
  { id: 'it:B1:reply:01', lessonId: 19, format: 'context_choice', line: 'Paolo è partito?', right: 'È partito senza la borsa.', wrong: ['Abitavo qui.', 'Lo vedo.', 'È nata a giugno.'] },
  { id: 'it:B1:reply:02', lessonId: 20, format: 'context_choice', line: 'Abitavi vicino al porto?', right: 'Abitavo vicino al canale.', wrong: ['Sono arrivato.', 'È caduta.', 'Era giugno.'] },
  { id: 'it:B1:reply:03', lessonId: 22, format: 'context_choice', line: 'Conosci il mio vicino?', right: 'Lo vedo ogni giorno.', wrong: ['Pioveva.', 'È partita.', 'Ero a casa.'] },

  { id: 'it:B1:order:01', lessonId: 19, format: 'dialogue_order', lines: ['A: Lea è arrivata?', 'B: È arrivata con i cugini.', 'A: E sono rimasti?', 'B: Sono partiti dopo pranzo.'] },
  { id: 'it:B1:order:02', lessonId: 20, format: 'dialogue_order', lines: ['A: Abitavi vicino al porto?', 'B: Abitavo vicino al canale.', 'A: E il porto era lontano?', 'B: Era molto vicino.'] },
  { id: 'it:B1:order:03', lessonId: 22, format: 'dialogue_order', lines: ['A: Conosci il mio vicino?', 'B: Lo vedo ogni giorno.', 'A: E oggi?', 'B: Lo vedo stasera.'] },

  { id: 'it:B1:pairs:01', lessonId: 20, format: 'reply_pairs', pairs: [['Lea è arrivata?', 'È già arrivata.'], ['Pioveva?', 'Tirava vento.'], ['Paolo è partito?', 'È partito senza la borsa.'], ['Paolo era a casa?', 'Era in ufficio.']] },
  { id: 'it:B1:pairs:02', lessonId: 20, format: 'reply_pairs', pairs: [['I clienti sono entrati?', 'Sono già usciti.'], ['Abitavi qui?', 'Abitavo vicino al porto.'], ['È caduta la moneta?', 'Sono cadute due monete.'], ['Lea era stanca?', 'Era molto stanca.']] },
  { id: 'it:B1:pairs:03', lessonId: 21, format: 'reply_pairs', pairs: [['I cugini sono venuti?', 'Sono venuti senza i bambini.'], ['Il treno è partito?', 'È già partito.'], ['Aveva fretta?', 'Aveva molta fretta.'], ['Paolo dormiva?', 'Leggeva il giornale.']] },

  { id: 'it:B1:groups:01', lessonId: 20, format: 'classify_function', kind: 'now_past', items: [['È qui.', 0], ['Era qui.', 1], ['Siamo al porto.', 0], ['Eravamo al porto.', 1]] },
  { id: 'it:B1:groups:02', lessonId: 19, format: 'classify_function', kind: 'one_many', items: [['È partito.', 0], ['Sono partiti.', 1], ['È arrivata.', 0], ['Sono arrivate.', 1]] },
  { id: 'it:B1:groups:03', lessonId: 20, format: 'classify_function', kind: 'now_past', items: [['Ha fretta.', 0], ['Aveva fretta.', 1], ['Hanno un gatto.', 0], ['Avevano un gatto.', 1]] },

  { id: 'it:B1:text:01', lessonId: 19, format: 'evidence_choice', passage: ['Lea è arrivata con i cugini.', 'Sono rimasti a pranzo.', 'Sono partiti senza le chiavi.'], question: 'Sono rimasti a pranzo?', answer: 1 },
  { id: 'it:B1:text:02', lessonId: 20, format: 'evidence_choice', passage: ['Abitavo vicino al porto.', 'Lavoravo al mercato.', 'Pioveva sempre.'], question: 'Lavoravo al mercato?', answer: 1 },
  { id: 'it:B1:text:03', lessonId: 21, format: 'evidence_choice', passage: ['Paolo ha perso un guanto.', 'Era sul treno.', 'Il treno è già partito.'], question: 'Il treno è partito?', answer: 2 },
];

const IT_B2: readonly AuthoredExamItem[] = [
  { id: 'it:B2:reply:01', lessonId: 32, format: 'context_choice', line: 'Verresti con me?', right: 'Verrei se fossi libero.', wrong: ['Avevo mangiato.', 'Ecco la cantina.', 'È felice.'] },
  { id: 'it:B2:reply:02', lessonId: 31, format: 'context_choice', line: 'Avevi mangiato?', right: 'Avevo già mangiato.', wrong: ['Verrei domani.', 'Ecco il codice.', 'È felice.'] },
  { id: 'it:B2:reply:03', lessonId: 29, format: 'context_choice', line: 'Il codice è valido?', right: 'È valido oggi.', wrong: ['Verrei stasera.', 'Avevo dormito.', 'Ecco la signora.'] },

  { id: 'it:B2:order:01', lessonId: 32, format: 'dialogue_order', lines: ['A: Verresti con me?', 'B: Verrei se fossi libero.', 'A: E domani?', 'B: Domani verrei.'] },
  { id: 'it:B2:order:02', lessonId: 29, format: 'dialogue_order', lines: ['A: Ecco il codice.', 'B: È valido?', 'A: È valido oggi.', 'B: Allora lo scrivo.'] },
  { id: 'it:B2:order:03', lessonId: 31, format: 'dialogue_order', lines: ['A: Avevi mangiato?', 'B: Avevo già mangiato.', 'A: E Paolo?', 'B: Non aveva mangiato.'] },

  { id: 'it:B2:pairs:01', lessonId: 32, format: 'reply_pairs', pairs: [['Verresti con me?', 'Verrei se fossi libero.'], ['Avevi mangiato?', 'Avevo già mangiato.'], ['Il codice è valido?', 'È valido oggi.'], ['Ha avuto successo?', 'È felice.']] },
  { id: 'it:B2:pairs:02', lessonId: 32, format: 'reply_pairs', pairs: [['Verrebbe domani?', 'Verrebbe stasera.'], ['Avevi dormito?', 'Avevo dormito poco.'], ['Il piatto è delizioso?', 'È quasi freddo.'], ['Era partita?', 'Era già partita.']] },
  { id: 'it:B2:pairs:03', lessonId: 31, format: 'reply_pairs', pairs: [['Verresti stasera?', 'Resterei a casa.'], ['Avevi riconosciuto Paolo?', 'Non avevo riconosciuto Paolo.'], ['Hai il codice?', 'Ecco il codice.'], ['Il pavimento è asciutto?', 'Non è asciutto.']] },

  { id: 'it:B2:groups:01', lessonId: 32, format: 'classify_function', kind: 'one_many', items: [['Verrei.', 0], ['Partiremmo.', 1], ['Verrebbe.', 0], ['Andremmo.', 1]] },
  { id: 'it:B2:groups:02', lessonId: 31, format: 'classify_function', kind: 'now_past', items: [['Ho fame.', 0], ['Avevo fame.', 1], ['È qui.', 0], ['Era qui.', 1]] },
  { id: 'it:B2:groups:03', lessonId: 30, format: 'classify_function', kind: 'person_thing', items: [['Il custode.', 0], ['Il cartello.', 1], ['La signora.', 0], ['Il foglio.', 1]] },

  { id: 'it:B2:text:01', lessonId: 32, format: 'evidence_choice', passage: ['Verrei se fossi libero.', 'Oggi sono in ufficio.', 'Domani verrei.'], question: 'Oggi sono in ufficio?', answer: 1 },
  { id: 'it:B2:text:02', lessonId: 31, format: 'evidence_choice', passage: ['Avevo già mangiato.', 'Paolo non aveva mangiato.', 'Aveva fame.'], question: 'Paolo aveva fame?', answer: 2 },
  { id: 'it:B2:text:03', lessonId: 29, format: 'evidence_choice', passage: ['Ecco il codice.', 'È valido oggi.', 'Domani non è valido.'], question: 'Il codice è valido domani?', answer: 2 },
];

const BANK: Readonly<Record<string, Readonly<Partial<Record<CourseLevel, readonly AuthoredExamItem[]>>>>> = {
  en: { A1: EN_A1, A2: EN_A2, B1: EN_B1, B2: EN_B2 },
  es: { A1: ES_A1, A2: ES_A2, B1: ES_B1, B2: ES_B2 },
  de: { A1: DE_A1, A2: DE_A2, B1: DE_B1, B2: DE_B2 },
  fr: { A1: FR_A1, A2: FR_A2, B1: FR_B1, B2: FR_B2 },
  it: { A1: IT_A1, A2: IT_A2, B1: IT_B1, B2: IT_B2 },
};

/** Авторские задания языка и уровня; пусто — банк для них ещё не написан. */
export function authoredExamItems(studyTarget: string, level: CourseLevel): readonly AuthoredExamItem[] {
  return BANK[studyTarget]?.[level] ?? [];
}

/** Все тексты задания на изучаемом языке — по ним сторож сверяет словарь пройденных уроков. */
export function authoredItemTexts(item: AuthoredExamItem): string[] {
  switch (item.format) {
    case 'context_choice': return [item.line, item.right, ...item.wrong];
    // зачем: метки «A:» / «B:» — не слова курса, в сверку словаря не идут
    case 'dialogue_order': return item.lines.map((line) => line.replace(/^[AB]:\s*/u, ''));
    case 'reply_pairs': return item.pairs.flat();
    case 'classify_function': return item.items.map(([text]) => text);
    case 'evidence_choice': return [...item.passage, item.question];
  }
}

export type AuthoredExamDraft = Readonly<{
  format: AuthoredFormat;
  instruction: string;
  prompt: string;
  context: string;
  exercise: ExpandedExercise;
}>;

/** Задание из авторской записи: порядок вариантов — по сиду попытки. `null` — запись не прошла проверку формы. */
export function buildAuthoredExamDraft(item: AuthoredExamItem, seedKey: string, sourceLocale: string, studyTarget: string = 'en'): AuthoredExamDraft | null {
  const rng = (salt: string) => createLevelExamRng(`${seedKey}:${item.id}:${salt}`);
  const copy = levelExamExpandedCopy(sourceLocale);
  const done = (raw: Record<string, unknown>, prompt: string): AuthoredExamDraft | null => {
    const parsed = parseExpandedExercise(item.format, raw, studyTarget);
    return parsed.ok ? { format: item.format, instruction: copy.instruction[item.format], prompt, context: '', exercise: parsed.exercise } : null;
  };

  switch (item.format) {
    case 'context_choice': {
      const options = shuffled([item.right, ...item.wrong], rng('options'));
      return done({ options, key: options.indexOf(item.right) }, item.line);
    }
    case 'dialogue_order': {
      const bank = shuffled(item.lines.map((text, index) => ({ text, index })), rng('bank'));
      return done({ bank: bank.map((line) => line.text), key: item.lines.map((_line, index) => bank.findIndex((line) => line.index === index)) }, copy.prompt.dialogue_order);
    }
    case 'reply_pairs': {
      const replies = shuffled(item.pairs.map(([, reply], index) => ({ reply, index })), rng('replies'));
      return done({
        questions: item.pairs.map(([question]) => question),
        replies: replies.map((entry) => entry.reply),
        key: item.pairs.map((_pair, index) => replies.findIndex((entry) => entry.index === index)),
      }, copy.prompt.reply_pairs);
    }
    case 'classify_function': {
      const items = shuffled(item.items, rng('items'));
      const group = copy.groups[item.kind];
      return done({ items: items.map(([text]) => text), groups: [...group.labels], key: items.map(([, at]) => at) }, group.prompt);
    }
    case 'evidence_choice':
      // зачем: предложения текста не перемешиваются — текст должен читаться связно; варианты идут в порядке текста
      return done({ passage: item.passage.join(' '), options: [...item.passage], key: item.answer }, item.question);
  }
}

// зачем: файл лежит в app/ — expo-router ждёт экспорт по умолчанию у каждого файла (как у level_exam_gap_rules)
export default function __RouteShim() { return null; }
