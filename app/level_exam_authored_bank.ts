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
 * Готово: английский, все четыре уровня (A1 — уроки 1–8, A2 — до 18, B1 — до 28, B2 — до 32). Остальные языки
 * пополняются отдельными партиями; пока банка для языка нет, экзамен берёт вместо этих заданий механики из фраз уроков.
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

const BANK: Readonly<Record<string, Readonly<Partial<Record<CourseLevel, readonly AuthoredExamItem[]>>>>> = {
  en: { A1: EN_A1, A2: EN_A2, B1: EN_B1, B2: EN_B2 },
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
export function buildAuthoredExamDraft(item: AuthoredExamItem, seedKey: string, sourceLocale: string): AuthoredExamDraft | null {
  const rng = (salt: string) => createLevelExamRng(`${seedKey}:${item.id}:${salt}`);
  const copy = levelExamExpandedCopy(sourceLocale);
  const done = (raw: Record<string, unknown>, prompt: string): AuthoredExamDraft | null => {
    const parsed = parseExpandedExercise(item.format, raw, 'en');
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
