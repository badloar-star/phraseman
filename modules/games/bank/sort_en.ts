/**
 * Банк игры «Сортировка» — английский классический курс, уроки 1–8 (D207). Одна колода из 8 карт на урок.
 * зачем: владелец 11.11.2026 — «фразы должны корректно подбираться для режимов игры, без багов».
 * Правила вычитки: противопоставление корзин реально есть в уроке; каждая карта подходит ровно к одной
 * корзине; текст карты — только слова урока. Пропуск в карте пишется `___` (уроки 3, 4, 5, 8):
 * игрок выбирает, чем его заполнить. В колоде урока 2 вопросы без «?» — узнать вопрос надо по порядку слов.
 * Проверка: tests/game_task_bank_en.test.ts.
 */
import type { SortBin, SortDeck, SortSide } from '../sort_core';

type Card = readonly [text: string, side: SortSide, hint: string];

function deck(lesson: number, left: SortBin, right: SortBin, cards: readonly Card[]): SortDeck {
  const id = `sort-en-l${String(lesson).padStart(2, '0')}`;
  return { id, left, right, tasks: cards.map(([text, side, hint], i) => ({ id: `${id}-${i + 1}`, text, side, hint })) };
}

export const SORT_BANK_EN: Readonly<Record<number, SortDeck>> = {
  1: deck(1, { title: 'Один', example: 'she, it, the door' }, { title: 'Несколько', example: 'we, they, the doors' }, [
    ['The door is open', 'left', 'door — дверь одна, поэтому is'],
    ['The doors are closed', 'right', 'doors — дверей несколько, поэтому are'],
    ['She is busy', 'left', 'she — она одна'],
    ['They are here', 'right', 'they — их несколько'],
    ['My phone is on', 'left', 'phone — телефон один'],
    ['Your keys are here', 'right', 'keys — ключей несколько'],
    ['The bus is late', 'left', 'bus — автобус один'],
    ['We are at home', 'right', 'we — нас несколько'],
  ]),
  2: deck(2, { title: 'Спрашивают', example: 'Is she…  Are you…' }, { title: 'Утверждают', example: 'Yes…  No…  She is not…' }, [
    ['Is she ready', 'left', 'is стоит первым — это вопрос'],
    ['She is not ready', 'right', 'she стоит первой — это не вопрос'],
    ['Are they at home', 'left', 'are стоит первым — это вопрос'],
    ['Yes, they are', 'right', 'yes — так отвечают'],
    ['Is the bus here', 'left', 'is стоит первым — это вопрос'],
    ['The lift is not here', 'right', 'the lift стоит первым — это не вопрос'],
    ['Are these seats free', 'left', 'are стоит первым — это вопрос'],
    ['No, it is not', 'right', 'no — так отвечают'],
  ]),
  3: deck(3, { title: 'He · She', example: 'works, lives' }, { title: 'I · You · We · They', example: 'work, live' }, [
    ['___ works nearby', 'left', 'works с -s — это про него или про неё'],
    ['___ live alone', 'right', 'live без -s — это я, мы или они'],
    ['___ starts early', 'left', 'starts с -s — это про него или про неё'],
    ['___ finish late', 'right', 'finish без -es — это я, мы или они'],
    ['___ needs help', 'left', 'needs с -s — это про него или про неё'],
    ['___ want coffee', 'right', 'want без -s — это я, мы или они'],
    ['___ takes the train', 'left', 'takes с -s — это про него или про неё'],
    ['___ share a kitchen', 'right', 'share без -s — это я, мы или они'],
  ]),
  4: deck(4, { title: 'do not', example: 'I, we, they' }, { title: 'does not', example: 'he, she, it' }, [
    ['I ___ drive', 'left', 'с I идёт do not'],
    ['He ___ drive', 'right', 'с he идёт does not'],
    ['The lights ___ work', 'left', 'lights — их несколько, как they'],
    ['The tap ___ work', 'right', 'tap — кран один, как it'],
    ['My shoes ___ fit', 'left', 'shoes — их несколько, как they'],
    ['This key ___ fit', 'right', 'key — ключ один, как it'],
    ['They ___ accept cards', 'left', 'с they идёт do not'],
    ['This machine ___ accept coins', 'right', 'machine — автомат один, как it'],
  ]),
  5: deck(5, { title: 'Do', example: 'we, they, the windows' }, { title: 'Does', example: 'he, she, the door' }, [
    ['___ these windows open?', 'left', 'windows — окон несколько, как they'],
    ['___ the key fit?', 'right', 'key — ключ один, как it'],
    ['___ the buses run on Sundays?', 'left', 'buses — автобусов несколько, как they'],
    ['___ the door lock?', 'right', 'door — дверь одна, как it'],
    ['___ the rooms have heating?', 'left', 'rooms — комнат несколько, как they'],
    ['___ the lift go down?', 'right', 'lift — лифт один, как it'],
    ['___ we need tickets?', 'left', 'с we идёт do'],
    ['___ the oven work?', 'right', 'oven — духовка одна, как it'],
  ]),
  6: deck(6, { title: 'Про место', example: 'Where…?' }, { title: 'Про время', example: 'When…?  What time…?' }, [
    ['Where do you work?', 'left', 'where — «где»'],
    ['When do we start?', 'right', 'when — «когда»'],
    ['Where does she live?', 'left', 'where — «где»'],
    ['What time does the bus leave?', 'right', 'what time — «во сколько»'],
    ['Where do I get off?', 'left', 'where — «где»'],
    ['When does the sale end?', 'right', 'when — «когда»'],
    ['Where do you keep the batteries?', 'left', 'where — «где»'],
    ['What time do you finish work?', 'right', 'what time — «во сколько»'],
  ]),
  7: deck(7, { title: 'Самочувствие', example: 'a cough, a cold' }, { title: 'Вещи', example: 'a car, a key' }, [
    ['I have a sore throat', 'left', 'sore throat — болит горло'],
    ['They have a car', 'right', 'car — машина'],
    ['He has a cough', 'left', 'cough — кашель'],
    ['He has a bicycle', 'right', 'bicycle — велосипед'],
    ['She has a headache', 'left', 'headache — болит голова'],
    ['We have a spare key', 'right', 'spare key — запасной ключ'],
    ['My daughter has a cold', 'left', 'cold — простуда'],
    ['I have a ticket', 'right', 'ticket — билет'],
  ]),
  8: deck(8, { title: 'at', example: 'время на часах' }, { title: 'on', example: 'день недели' }, [
    ['I start ___ seven', 'left', 'seven — время на часах, значит at'],
    ['We meet ___ Tuesday', 'right', 'Tuesday — день недели, значит on'],
    ['We finish ___ midnight', 'left', 'midnight — время на часах, значит at'],
    ['He works ___ Fridays', 'right', 'Fridays — день недели, значит on'],
    ['The alarm rings ___ six thirty', 'left', 'six thirty — время на часах, значит at'],
    ['They arrive ___ Monday', 'right', 'Monday — день недели, значит on'],
    ['The bell rings ___ midday', 'left', 'midday — время на часах, значит at'],
    ['The market opens ___ Saturdays', 'right', 'Saturdays — день недели, значит on'],
  ]),
  // зачем (сессия макетов 12.11): уроки 9–12; каждая карта подходит ровно к одной корзине
  9: deck(9, { title: 'is', example: 'один: a lift, milk' }, { title: 'are', example: 'несколько: stairs, eggs' }, [
    ['There ___ a lift', 'left', 'a lift — лифт один'],
    ['There ___ stairs', 'right', 'stairs — ступеней много'],
    ['There ___ a queue', 'left', 'a queue — очередь одна'],
    ['There ___ two queues', 'right', 'two queues — их две'],
    ['There ___ milk in the fridge', 'left', 'milk не считают штуками — is'],
    ['There ___ eggs in the fridge', 'right', 'eggs — яиц несколько'],
    ['There ___ soup on the stove', 'left', 'soup не считают штуками — is'],
    ['There ___ spoons in the drawer', 'right', 'spoons — ложек несколько'],
  ]),
  10: deck(10, { title: 'Можно мне?', example: 'Can I…? Can we…?' }, { title: 'Сделаете?', example: 'Can you…?' }, [
    ['Can I sit here?', 'left', 'can I — прошу разрешения'],
    ['Can you say that again?', 'right', 'can you — прошу сделать'],
    ['Can I pay by card?', 'left', 'can I — прошу разрешения'],
    ['Can you hold the door?', 'right', 'can you — прошу сделать'],
    ['Can we book a table?', 'left', 'can we — просим разрешения'],
    ['Can you check the price?', 'right', 'can you — прошу сделать'],
    ['Can I bring a friend?', 'left', 'can I — прошу разрешения'],
    ['Can you write it down?', 'right', 'can you — прошу сделать'],
  ]),
  11: deck(11, { title: 'Сделал', example: 'checked, cancelled' }, { title: 'Не сделал', example: 'did not check' }, [
    ['I checked the address', 'left', 'checked — проверил'],
    ['I did not check the label', 'right', 'did not check — не проверил'],
    ['She cancelled the appointment', 'left', 'cancelled — отменила'],
    ['She did not cancel the booking', 'right', 'did not cancel — не отменила'],
    ['He missed the last train', 'left', 'missed — опоздал'],
    ['They did not miss the flight', 'right', 'did not miss — не опоздали'],
    ['We changed our booking', 'left', 'changed — изменили'],
    ['We did not stay long', 'right', 'did not stay — не остались'],
  ]),
  12: deck(12, { title: 'Сделал', example: 'found, took, broke' }, { title: 'Не сделал', example: 'did not find' }, [
    ['We found a quiet cafe', 'left', 'found — нашли'],
    ['We did not find a parking space', 'right', 'did not find — не нашли'],
    ['She took my coat', 'left', 'took — взяла'],
    ['She did not take my coat', 'right', 'did not take — не взяла'],
    ['He broke his glasses', 'left', 'broke — разбил'],
    ['He did not break the lock', 'right', 'did not break — не сломал'],
    ['I forgot my password', 'left', 'forgot — забыл'],
    ['I did not forget your name', 'right', 'did not forget — не забыл'],
  ]),
};
