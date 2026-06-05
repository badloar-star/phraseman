#!/usr/bin/env python3
"""Generate a diverse 800-phrase Chains selection pack.

This is the phrase-selection stage only: no CapCut draft mutation and no audio.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any


OUT = Path("exports/chains/phrase_packs/chains_800_unique_v2_20260604")


THEMES: list[dict[str, Any]] = [
    {
        "slug": "home",
        "name_ru": "Дом и быт",
        "places": [
            ("kitchen", "на кухне"),
            ("hallway", "в коридоре"),
            ("bedroom", "в спальне"),
            ("bathroom", "в ванной"),
            ("living room", "в гостиной"),
        ],
        "things": [
            ("window", "окно"),
            ("hallway light", "свет в коридоре"),
            ("towel", "полотенце"),
            ("fridge door", "дверца холодильника"),
            ("sink", "раковина"),
        ],
        "actions": [
            ("close the door quietly", "тихо закрыть дверь"),
            ("turn off the light", "выключить свет"),
            ("move the chair closer", "подвинуть стул ближе"),
            ("wipe the table", "протереть стол"),
            ("check the oven", "проверить духовку"),
        ],
        "states": [
            ("still open", "всё ещё открыто"),
            ("too dark", "слишком темно"),
            ("wet again", "снова мокрое"),
            ("not closed properly", "закрыта неплотно"),
            ("much cleaner now", "теперь намного чище"),
        ],
        "objects": [
            ("keys", "ключи"),
            ("clean plates", "чистые тарелки"),
            ("groceries", "продукты"),
            ("old receipt", "старый чек"),
            ("glass of water", "стакан воды"),
        ],
    },
    {
        "slug": "morning_evening",
        "name_ru": "Утро и вечер",
        "places": [
            ("bathroom", "в ванной"),
            ("kitchen", "на кухне"),
            ("bedroom", "в спальне"),
            ("bus stop", "на остановке"),
            ("office entrance", "у входа в офис"),
        ],
        "things": [
            ("alarm", "будильник"),
            ("coffee", "кофе"),
            ("shirt", "рубашка"),
            ("bag", "сумка"),
            ("calendar", "календарь"),
        ],
        "actions": [
            ("set the alarm for seven", "поставить будильник на семь"),
            ("make coffee before leaving", "сделать кофе перед выходом"),
            ("choose a clean shirt", "выбрать чистую рубашку"),
            ("pack the bag at night", "собрать сумку вечером"),
            ("check tomorrow's plan", "проверить план на завтра"),
        ],
        "states": [
            ("too early", "слишком рано"),
            ("almost ready", "почти готово"),
            ("running late", "опаздываем"),
            ("quiet tonight", "сегодня тихо"),
            ("better after a shower", "лучше после душа"),
        ],
        "objects": [
            ("breakfast", "завтрак"),
            ("fresh socks", "чистые носки"),
            ("work badge", "рабочий пропуск"),
            ("evening tea", "вечерний чай"),
            ("phone charger", "зарядка для телефона"),
        ],
    },
    {
        "slug": "work",
        "name_ru": "Работа",
        "places": [
            ("office", "в офисе"),
            ("meeting room", "в переговорке"),
            ("shared chat", "в общем чате"),
            ("desk", "за столом"),
            ("lobby", "в холле"),
        ],
        "things": [
            ("report", "отчёт"),
            ("request", "запрос"),
            ("meeting", "встреча"),
            ("client message", "сообщение клиента"),
            ("task", "задача"),
        ],
        "actions": [
            ("send the report before lunch", "отправить отчёт до обеда"),
            ("join the call on time", "подключиться к звонку вовремя"),
            ("write a short update", "написать короткое обновление"),
            ("check the numbers again", "ещё раз проверить цифры"),
            ("ask for a clear deadline", "попросить чёткий дедлайн"),
        ],
        "states": [
            ("almost finished", "почти закончено"),
            ("too vague", "слишком расплывчато"),
            ("on the calendar", "в календаре"),
            ("marked as urgent", "помечено как срочное"),
            ("ready for review", "готово к проверке"),
        ],
        "objects": [
            ("new task", "новая задача"),
            ("quick note", "короткая заметка"),
            ("project folder", "папка проекта"),
            ("client file", "файл клиента"),
            ("team decision", "решение команды"),
        ],
    },
    {
        "slug": "study",
        "name_ru": "Учёба",
        "places": [
            ("classroom", "в аудитории"),
            ("library", "в библиотеке"),
            ("study desk", "за учебным столом"),
            ("online lesson", "на онлайн-уроке"),
            ("notebook", "в тетради"),
        ],
        "things": [
            ("new word", "новое слово"),
            ("grammar rule", "правило грамматики"),
            ("homework", "домашнее задание"),
            ("example sentence", "пример предложения"),
            ("test result", "результат теста"),
        ],
        "actions": [
            ("write the sentence again", "написать предложение ещё раз"),
            ("repeat the phrase out loud", "повторить фразу вслух"),
            ("underline the main word", "подчеркнуть главное слово"),
            ("ask one simple question", "задать один простой вопрос"),
            ("review the notes tonight", "повторить записи вечером"),
        ],
        "states": [
            ("easy to remember", "легко запомнить"),
            ("hard to pronounce", "трудно произнести"),
            ("clear after practice", "понятно после практики"),
            ("not in the textbook", "не в учебнике"),
            ("useful in real life", "полезно в жизни"),
        ],
        "objects": [
            ("short definition", "короткое определение"),
            ("audio example", "аудиопример"),
            ("practice page", "страница практики"),
            ("teacher's comment", "комментарий учителя"),
            ("word list", "список слов"),
        ],
    },
    {
        "slug": "transport",
        "name_ru": "Дорога и транспорт",
        "places": [
            ("bus stop", "на остановке"),
            ("train station", "на станции"),
            ("airport gate", "у выхода на посадку"),
            ("taxi", "в такси"),
            ("parking lot", "на парковке"),
        ],
        "things": [
            ("bus", "автобус"),
            ("platform", "платформа"),
            ("train", "поезд"),
            ("route", "маршрут"),
            ("taxi", "такси"),
        ],
        "actions": [
            ("check the route again", "ещё раз проверить маршрут"),
            ("buy a ticket online", "купить билет онлайн"),
            ("wait near the entrance", "подождать у входа"),
            ("change trains at the next stop", "пересесть на следующей остановке"),
            ("call a taxi after work", "вызвать такси после работы"),
        ],
        "states": [
            ("ten minutes late", "на десять минут позже"),
            ("too crowded", "слишком людно"),
            ("on the wrong platform", "не на той платформе"),
            ("close to the station", "близко к станции"),
            ("faster than walking", "быстрее, чем пешком"),
        ],
        "objects": [
            ("travel card", "проездной"),
            ("small suitcase", "маленький чемодан"),
            ("window seat", "место у окна"),
            ("bus number", "номер автобуса"),
            ("driver's message", "сообщение водителя"),
        ],
    },
    {
        "slug": "shopping",
        "name_ru": "Покупки",
        "places": [
            ("supermarket", "в супермаркете"),
            ("checkout", "на кассе"),
            ("pharmacy", "в аптеке"),
            ("clothes shop", "в магазине одежды"),
            ("market", "на рынке"),
        ],
        "things": [
            ("price", "цена"),
            ("receipt", "чек"),
            ("discount", "скидка"),
            ("size", "размер"),
            ("item", "товар"),
        ],
        "actions": [
            ("compare the prices", "сравнить цены"),
            ("pay by card", "заплатить картой"),
            ("ask for a smaller size", "попросить размер поменьше"),
            ("return the item tomorrow", "вернуть товар завтра"),
            ("take a fresh bag", "взять новый пакет"),
        ],
        "states": [
            ("too expensive", "слишком дорого"),
            ("on sale today", "сегодня со скидкой"),
            ("out of stock", "нет в наличии"),
            ("cheaper online", "дешевле онлайн"),
            ("worth the price", "стоит своих денег"),
        ],
        "objects": [
            ("shopping list", "список покупок"),
            ("fresh bread", "свежий хлеб"),
            ("new shoes", "новая обувь"),
            ("medicine box", "коробка лекарства"),
            ("paper bag", "бумажный пакет"),
        ],
    },
    {
        "slug": "food",
        "name_ru": "Еда и кафе",
        "places": [
            ("cafe", "в кафе"),
            ("restaurant", "в ресторане"),
            ("kitchen counter", "на кухонной стойке"),
            ("coffee shop", "в кофейне"),
            ("table by the window", "за столом у окна"),
        ],
        "things": [
            ("coffee", "кофе"),
            ("soup", "суп"),
            ("bread", "хлеб"),
            ("order", "заказ"),
            ("tea", "чай"),
        ],
        "actions": [
            ("order without onions", "заказать без лука"),
            ("ask for the bill", "попросить счёт"),
            ("save a table for two", "оставить столик на двоих"),
            ("try the soup first", "сначала попробовать суп"),
            ("pack the food to go", "упаковать еду с собой"),
        ],
        "states": [
            ("too hot to drink", "слишком горячее, чтобы пить"),
            ("not spicy at all", "совсем не острое"),
            ("fresh and warm", "свежее и тёплое"),
            ("ready in five minutes", "будет готово через пять минут"),
            ("better with lemon", "лучше с лимоном"),
        ],
        "objects": [
            ("small salad", "небольшой салат"),
            ("extra napkin", "дополнительная салфетка"),
            ("bottle of water", "бутылка воды"),
            ("daily special", "блюдо дня"),
            ("takeaway box", "коробка с собой"),
        ],
    },
    {
        "slug": "communication",
        "name_ru": "Общение",
        "places": [
            ("phone call", "в телефонном разговоре"),
            ("group chat", "в групповом чате"),
            ("voice message", "в голосовом сообщении"),
            ("hallway conversation", "в разговоре в коридоре"),
            ("video meeting", "на видеовстрече"),
        ],
        "things": [
            ("message", "сообщение"),
            ("answer", "ответ"),
            ("question", "вопрос"),
            ("joke", "шутка"),
            ("invitation", "приглашение"),
        ],
        "actions": [
            ("answer politely", "ответить вежливо"),
            ("send a short message", "отправить короткое сообщение"),
            ("repeat the last part", "повторить последнюю часть"),
            ("explain the idea simply", "объяснить идею просто"),
            ("invite them for coffee", "пригласить их на кофе"),
        ],
        "states": [
            ("hard to hear", "плохо слышно"),
            ("easy to explain", "легко объяснить"),
            ("not the right time", "неподходящее время"),
            ("a little awkward", "немного неловко"),
            ("clear enough now", "теперь достаточно понятно"),
        ],
        "objects": [
            ("quick reply", "быстрый ответ"),
            ("friendly reminder", "дружеское напоминание"),
            ("clear example", "понятный пример"),
            ("honest opinion", "честное мнение"),
            ("new contact", "новый контакт"),
        ],
    },
    {
        "slug": "requests_help",
        "name_ru": "Просьбы и помощь",
        "places": [
            ("front desk", "на стойке"),
            ("neighbor's door", "у двери соседа"),
            ("office kitchen", "на офисной кухне"),
            ("hotel lobby", "в холле отеля"),
            ("support chat", "в чате поддержки"),
        ],
        "things": [
            ("small favor", "маленькая услуга"),
            ("answer", "ответ"),
            ("box", "коробка"),
            ("instruction", "инструкция"),
            ("request", "просьба"),
        ],
        "actions": [
            ("help me carry this box", "помочь мне донести эту коробку"),
            ("show me where to sign", "показать мне, где подписать"),
            ("send the address again", "отправить адрес ещё раз"),
            ("hold the door for a second", "подержать дверь секунду"),
            ("explain it one more time", "объяснить это ещё раз"),
        ],
        "states": [
            ("not a big problem", "не большая проблема"),
            ("really helpful", "очень полезно"),
            ("too heavy for one person", "слишком тяжело для одного человека"),
            ("simple enough", "достаточно просто"),
            ("urgent but small", "срочно, но мелочь"),
        ],
        "objects": [
            ("heavy box", "тяжёлая коробка"),
            ("missing form", "недостающая форма"),
            ("phone number", "номер телефона"),
            ("door code", "код от двери"),
            ("short explanation", "короткое объяснение"),
        ],
    },
    {
        "slug": "plans",
        "name_ru": "Планы",
        "places": [
            ("calendar", "в календаре"),
            ("weekend plan", "в плане на выходные"),
            ("team schedule", "в расписании команды"),
            ("family chat", "в семейном чате"),
            ("travel plan", "в плане поездки"),
        ],
        "things": [
            ("plan", "план"),
            ("schedule", "расписание"),
            ("evening", "вечер"),
            ("next step", "следующий шаг"),
            ("backup option", "запасной вариант"),
        ],
        "actions": [
            ("move the meeting to Friday", "перенести встречу на пятницу"),
            ("make a plan for tomorrow", "составить план на завтра"),
            ("leave earlier than usual", "выйти раньше обычного"),
            ("cancel the trip if it rains", "отменить поездку, если пойдёт дождь"),
            ("choose a better time", "выбрать время получше"),
        ],
        "states": [
            ("still possible", "всё ещё возможно"),
            ("too late to change", "слишком поздно менять"),
            ("better next week", "лучше на следующей неделе"),
            ("not confirmed yet", "ещё не подтверждено"),
            ("clear for now", "пока понятно"),
        ],
        "objects": [
            ("morning appointment", "утренняя встреча"),
            ("evening walk", "вечерняя прогулка"),
            ("backup plan", "запасной план"),
            ("short break", "короткий перерыв"),
            ("new deadline", "новый дедлайн"),
        ],
    },
    {
        "slug": "problems",
        "name_ru": "Проблемы и ошибки",
        "places": [
            ("computer screen", "на экране компьютера"),
            ("wrong address", "по неправильному адресу"),
            ("busy street", "на оживлённой улице"),
            ("checkout line", "в очереди на кассе"),
            ("email thread", "в переписке"),
        ],
        "things": [
            ("mistake", "ошибка"),
            ("broken link", "битая ссылка"),
            ("wrong file", "не тот файл"),
            ("late reply", "поздний ответ"),
            ("missing detail", "недостающая деталь"),
        ],
        "actions": [
            ("fix the mistake quickly", "быстро исправить ошибку"),
            ("send the right file", "отправить правильный файл"),
            ("ask what went wrong", "спросить, что пошло не так"),
            ("try again in a minute", "попробовать ещё раз через минуту"),
            ("explain the problem clearly", "понятно объяснить проблему"),
        ],
        "states": [
            ("not working again", "снова не работает"),
            ("easy to miss", "легко пропустить"),
            ("worse than before", "хуже, чем раньше"),
            ("fixed for now", "пока исправлено"),
            ("not your fault", "не твоя вина"),
        ],
        "objects": [
            ("error message", "сообщение об ошибке"),
            ("wrong password", "неправильный пароль"),
            ("missing receipt", "потерянный чек"),
            ("empty folder", "пустая папка"),
            ("old version", "старая версия"),
        ],
    },
    {
        "slug": "health",
        "name_ru": "Здоровье",
        "places": [
            ("pharmacy", "в аптеке"),
            ("doctor's office", "у врача"),
            ("waiting room", "в зале ожидания"),
            ("gym", "в спортзале"),
            ("home", "дома"),
        ],
        "things": [
            ("headache", "головная боль"),
            ("medicine", "лекарство"),
            ("appointment", "приём"),
            ("temperature", "температура"),
            ("rest", "отдых"),
        ],
        "actions": [
            ("drink more water today", "сегодня пить больше воды"),
            ("call the doctor in the morning", "позвонить врачу утром"),
            ("take the medicine after food", "принять лекарство после еды"),
            ("rest for another hour", "отдохнуть ещё час"),
            ("check your temperature again", "ещё раз измерить температуру"),
        ],
        "states": [
            ("a little better now", "сейчас немного лучше"),
            ("too tired to go out", "слишком устал, чтобы выходить"),
            ("not serious", "не серьёзно"),
            ("hard to breathe", "трудно дышать"),
            ("better after sleep", "лучше после сна"),
        ],
        "objects": [
            ("warm tea", "тёплый чай"),
            ("doctor's note", "справка от врача"),
            ("small bandage", "маленький бинт"),
            ("vitamin box", "коробка витаминов"),
            ("health card", "медицинская карта"),
        ],
    },
    {
        "slug": "money_documents",
        "name_ru": "Деньги и документы",
        "places": [
            ("bank app", "в банковском приложении"),
            ("passport office", "в паспортном столе"),
            ("cash machine", "у банкомата"),
            ("front desk", "на стойке"),
            ("email inbox", "во входящих письмах"),
        ],
        "things": [
            ("payment", "платёж"),
            ("passport", "паспорт"),
            ("form", "форма"),
            ("document", "документ"),
            ("bill", "счёт"),
        ],
        "actions": [
            ("check the payment status", "проверить статус платежа"),
            ("sign the form here", "подписать форму здесь"),
            ("scan the document again", "ещё раз отсканировать документ"),
            ("save the receipt", "сохранить чек"),
            ("change the card limit", "изменить лимит карты"),
        ],
        "states": [
            ("already paid", "уже оплачено"),
            ("not valid anymore", "больше недействительно"),
            ("missing one signature", "не хватает одной подписи"),
            ("safe in the folder", "в безопасности в папке"),
            ("too expensive this month", "слишком дорого в этом месяце"),
        ],
        "objects": [
            ("monthly bill", "ежемесячный счёт"),
            ("tax number", "налоговый номер"),
            ("printed copy", "распечатанная копия"),
            ("online receipt", "онлайн-чек"),
            ("new password", "новый пароль"),
        ],
    },
    {
        "slug": "technology",
        "name_ru": "Телефон и технологии",
        "places": [
            ("phone screen", "на экране телефона"),
            ("laptop", "на ноутбуке"),
            ("settings menu", "в меню настроек"),
            ("video call", "на видеозвонке"),
            ("cloud folder", "в облачной папке"),
        ],
        "things": [
            ("battery", "батарея"),
            ("password", "пароль"),
            ("update", "обновление"),
            ("file", "файл"),
            ("internet connection", "интернет-соединение"),
        ],
        "actions": [
            ("charge the phone before bed", "зарядить телефон перед сном"),
            ("restart the laptop", "перезагрузить ноутбук"),
            ("share the file with me", "поделиться файлом со мной"),
            ("turn on the camera", "включить камеру"),
            ("save the password somewhere safe", "сохранить пароль в безопасном месте"),
        ],
        "states": [
            ("almost dead", "почти разряжена"),
            ("too slow today", "сегодня слишком медленно"),
            ("not connected", "не подключено"),
            ("ready to download", "готово к скачиванию"),
            ("clear on my screen", "на моём экране всё видно"),
        ],
        "objects": [
            ("charging cable", "кабель зарядки"),
            ("shared folder", "общая папка"),
            ("voice note", "голосовая заметка"),
            ("backup file", "резервный файл"),
            ("new notification", "новое уведомление"),
        ],
    },
    {
        "slug": "travel",
        "name_ru": "Путешествия",
        "places": [
            ("hotel room", "в номере отеля"),
            ("airport", "в аэропорту"),
            ("train platform", "на платформе"),
            ("city center", "в центре города"),
            ("information desk", "на стойке информации"),
        ],
        "things": [
            ("hotel", "отель"),
            ("station", "станция"),
            ("breakfast", "завтрак"),
            ("street", "улица"),
            ("restaurant", "ресторан"),
        ],
        "actions": [
            ("book a room for two nights", "забронировать номер на две ночи"),
            ("ask for directions", "спросить дорогу"),
            ("check in before noon", "заселиться до полудня"),
            ("leave the bags at the hotel", "оставить сумки в отеле"),
            ("find a quiet street nearby", "найти тихую улицу рядом"),
        ],
        "states": [
            ("far from the center", "далеко от центра"),
            ("close to the station", "близко к станции"),
            ("included in the price", "включено в цену"),
            ("safe to walk there", "туда безопасно идти пешком"),
            ("busy in the evening", "вечером там многолюдно"),
        ],
        "objects": [
            ("small suitcase", "маленький чемодан"),
            ("city map", "карта города"),
            ("return ticket", "обратный билет"),
            ("room number", "номер комнаты"),
            ("local SIM card", "местная SIM-карта"),
        ],
    },
    {
        "slug": "urgent",
        "name_ru": "Срочные ситуации",
        "places": [
            ("street corner", "на углу улицы"),
            ("hospital entrance", "у входа в больницу"),
            ("lost and found desk", "в бюро находок"),
            ("police station", "в полицейском участке"),
            ("hotel reception", "на ресепшене отеля"),
        ],
        "things": [
            ("place", "место"),
            ("call", "звонок"),
            ("situation", "ситуация"),
            ("problem", "проблема"),
            ("waiting area", "зона ожидания"),
        ],
        "actions": [
            ("call an ambulance now", "сейчас вызвать скорую"),
            ("stay where you are", "оставаться там, где ты есть"),
            ("send me your location", "отправить мне свою локацию"),
            ("ask someone for help", "попросить кого-нибудь о помощи"),
            ("keep the door open", "держать дверь открытой"),
        ],
        "states": [
            ("not safe here", "здесь небезопасно"),
            ("very urgent", "очень срочно"),
            ("hard to explain", "трудно объяснить"),
            ("under control now", "теперь под контролем"),
            ("better to wait inside", "лучше подождать внутри"),
        ],
        "objects": [
            ("emergency number", "номер экстренной службы"),
            ("missing bag", "пропавшая сумка"),
            ("nearest exit", "ближайший выход"),
            ("clear photo", "чёткая фотография"),
            ("short warning", "короткое предупреждение"),
        ],
    },
]


STRUCTURES = [
    ("state", "The {thing_en} is {state_en}.", "{thing_ru_cap} {state_ru}."),
    ("can_question", "Can you {action_en}?", "Можешь {action_ru}?"),
    ("i_past", "I left the {object_en} in the {place_en}.", "Я оставил {object_ru} {place_ru}."),
    ("there", "There is a {object_en} in the {place_en}.", "{place_ru_cap} есть {object_ru}."),
    ("dont", "Don't forget to {action_en}.", "Не забудь {action_ru}."),
    ("we_need", "We need to {action_en} before we leave.", "Нам нужно {action_ru} перед уходом."),
    ("where", "Where can I find the {thing_en} near the {place_en}?", "Где рядом с местом: {place_ru} можно найти {thing_ru}?"),
    ("it_feels", "Something feels different around the {thing_en}.", "Что-то ощущается иначе вокруг темы: {thing_ru}."),
    ("please", "Please {action_en} when you have a minute.", "Пожалуйста, {action_ru}, когда будет минута."),
    ("cant", "I can't find the {object_en} anywhere.", "Я нигде не могу найти {object_ru}."),
    ("is_question", "Is the {thing_en} {state_en} right now?", "{thing_ru_cap} {state_ru} прямо сейчас?"),
    ("needs", "The {thing_en} in the {place_en} needs attention today.", "{thing_ru_cap} {place_ru} сегодня требует внимания."),
    ("you_can", "You can keep the {object_en} in the {place_en}.", "Можешь держать {object_ru} {place_ru}."),
    ("too", "It's too {state_en} in the {place_en}.", "{place_ru_cap} слишком {state_ru}."),
    ("lets", "Let's {action_en} first.", "Давай сначала {action_ru}."),
    ("again", "The {thing_en} is {state_en} again.", "{thing_ru_cap} снова {state_ru}."),
    ("could", "Could you {action_en} before lunch?", "Можешь {action_ru} до обеда?"),
    ("i_did", "I found the {object_en} in the {place_en}.", "Я нашёл {object_ru} {place_ru}."),
    ("there_are", "There are two useful details about the {thing_en}.", "Есть две полезные детали про {thing_ru}."),
    ("negative_command", "Don't leave the {object_en} in the {place_en}.", "Не оставляй {object_ru} {place_ru}."),
    ("simple_state", "Things look better in the {place_en} now.", "{place_ru_cap} теперь всё выглядит лучше."),
    ("should", "We should {action_en} today.", "Нам стоит {action_ru} сегодня."),
    ("did_question", "Did you notice the {thing_en}?", "Ты заметил {thing_ru}?"),
    ("belongs", "This {object_en} belongs in the {place_en}.", "Этот предмет, {object_ru}, должен быть {place_ru}."),
    ("under", "The {object_en} is under the {thing_en}.", "{object_ru_cap} под предметом: {thing_ru}."),
    ("going_to", "I'm going to {action_en}.", "Я собираюсь {action_ru}."),
    ("after", "Please {action_en} after that.", "Пожалуйста, {action_ru} после этого."),
    ("strange", "There is something strange near the {thing_en}.", "Рядом с {thing_ru} есть что-то странное."),
    ("you_should", "You should {action_en} before it gets late.", "Тебе стоит {action_ru}, пока не стало поздно."),
    ("not_properly", "The {thing_en} in the {place_en} is not ready yet.", "{thing_ru_cap} {place_ru} ещё не готово."),
    ("can_we", "Can we {action_en} now?", "Можем сейчас {action_ru}?"),
    ("pocket", "I found the {object_en} in my pocket.", "Я нашёл {object_ru} в кармане."),
    ("already", "The {thing_en} is already {state_en}.", "{thing_ru_cap} уже {state_ru}."),
    ("wet_shoes", "Don't bring the {object_en} into the {place_en}.", "Не заноси {object_ru} {place_ru}."),
    ("warmer", "It feels better in the {place_en} now.", "{place_ru_cap} теперь лучше."),
    ("where_is", "Where can I find the {object_en}?", "Где можно найти {object_ru}?"),
    ("have_to", "We have to {action_en} before tonight.", "Нам нужно {action_ru} до вечера."),
    ("goes_back", "The {object_en} goes back near the {thing_en}.", "{object_ru_cap} нужно вернуть к {thing_ru}."),
    ("could_open", "Could you {action_en} for me?", "Можешь {action_ru} для меня?"),
    ("enough_space", "There isn't enough space in the {place_en}.", "{place_ru_cap} недостаточно места."),
    ("i_need", "I need the {object_en} right now.", "Мне сейчас нужно: {object_ru}."),
    ("plugged", "The {thing_en} is connected to the {place_en}.", "{thing_ru_cap} связан с местом: {place_ru}."),
    ("check_before", "Let's {action_en} before going out.", "Давай {action_ru} перед выходом."),
    ("why", "Why is the {thing_en} still {state_en}?", "Почему {thing_ru} всё ещё {state_ru}?"),
    ("looks_clean", "The {thing_en} looks {state_en} now.", "{thing_ru_cap} теперь выглядит так: {state_ru}."),
    ("put_groceries", "You can keep the {object_en} with you.", "Можешь держать {object_ru} при себе."),
    ("dont_wake", "I don't want to bother anyone in the {place_en}.", "Я не хочу никого беспокоить {place_ru}."),
    ("leave_note", "Please leave the {object_en} near the {thing_en}.", "Пожалуйста, оставь {object_ru} рядом с {thing_ru}."),
    ("much_better", "The {place_en} feels much better now.", "{place_ru_cap} теперь ощущается намного лучше."),
    ("ready_leave", "Are we ready to {action_en}?", "Мы готовы {action_ru}?"),
]


def cap_first(text: str) -> str:
    return text[:1].upper() + text[1:] if text else text


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s']", "", text.casefold())).strip()


def make_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for block_index, theme in enumerate(THEMES, start=1):
        for local_index, (kind, en_template, ru_template) in enumerate(STRUCTURES, start=1):
            slot = (local_index - 1) % 5
            place_en, place_ru = theme["places"][slot]
            thing_en, thing_ru = theme["things"][slot]
            action_en, action_ru = theme["actions"][slot]
            state_en, state_ru = theme["states"][slot]
            object_en, object_ru = theme["objects"][slot]
            data = {
                "place_en": place_en,
                "place_ru": place_ru,
                "place_ru_cap": cap_first(place_ru),
                "thing_en": thing_en,
                "thing_ru": thing_ru,
                "thing_ru_cap": cap_first(thing_ru),
                "action_en": action_en,
                "action_ru": action_ru,
                "state_en": state_en,
                "state_ru": state_ru,
                "object_en": object_en,
                "object_ru": object_ru,
                "object_ru_cap": cap_first(object_ru),
            }
            index = (block_index - 1) * 50 + local_index
            rows.append(
                {
                    "index": index,
                    "id": f"CHU2-{index:03d}",
                    "block_index": block_index,
                    "block": theme["name_ru"],
                    "theme": theme["slug"],
                    "type": kind,
                    "english": en_template.format(**data),
                    "russian": ru_template.format(**data),
                }
            )
    return rows


def audit(rows: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[str] = []
    duplicate_examples: dict[str, list[dict[str, Any]]] = {}
    for key in ("english", "russian"):
        seen: dict[str, int] = {}
        duplicates = []
        for row in rows:
            norm = normalize(str(row[key]))
            if norm in seen:
                duplicates.append({"first": seen[norm], "duplicate": row["index"], "value": row[key]})
            else:
                seen[norm] = row["index"]
        duplicate_examples[key] = duplicates[:10]
        if duplicates:
            errors.append(f"{key} duplicates: {len(duplicates)}")

    by_type: dict[str, int] = {}
    by_block: dict[str, int] = {}
    starts_i = 0
    question_count = 0
    imperative_count = 0
    for row in rows:
        by_type[row["type"]] = by_type.get(row["type"], 0) + 1
        by_block[row["block"]] = by_block.get(row["block"], 0) + 1
        english = row["english"]
        if english.startswith("I "):
            starts_i += 1
        if english.endswith("?"):
            question_count += 1
        if english.startswith(("Don't ", "Please ", "Let's ")):
            imperative_count += 1

    if len(rows) != 800:
        errors.append(f"expected 800 rows, got {len(rows)}")
    bad_blocks = {block: count for block, count in by_block.items() if count != 50}
    if bad_blocks:
        errors.append(f"blocks not 50 rows: {bad_blocks}")
    if starts_i > 240:
        errors.append(f"too many I-start rows: {starts_i}")
    if question_count < 160:
        errors.append(f"too few questions: {question_count}")
    if imperative_count < 90:
        errors.append(f"too few command/request rows: {imperative_count}")

    return {
        "ok": not errors,
        "errors": errors,
        "row_count": len(rows),
        "unique_english": len({normalize(row["english"]) for row in rows}),
        "unique_russian": len({normalize(row["russian"]) for row in rows}),
        "starts_with_i": starts_i,
        "question_count": question_count,
        "request_or_command_count": imperative_count,
        "by_block": by_block,
        "duplicate_examples": duplicate_examples,
    }


def write_outputs(rows: list[dict[str, Any]], report: dict[str, Any]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chains_800_unique_phrases.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    with (OUT / "chains_800_unique_phrases.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["index", "id", "block_index", "block", "theme", "type", "english", "russian"])
        writer.writeheader()
        writer.writerows(rows)
    lines = ["# Chains 800 Unique V2 Phrase Selection", ""]
    for row in rows:
        if (row["index"] - 1) % 50 == 0:
            lines.extend(["", f"## {row['block_index']:02d}. {row['block']}", ""])
        lines.append(f"{row['index']:03d}. {row['english']} — {row['russian']}")
    (OUT / "chains_800_unique_phrases.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (OUT / "chains_800_unique_gate_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    rows = make_rows()
    report = audit(rows)
    write_outputs(rows, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
