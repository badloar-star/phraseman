import fs from 'node:fs';
import path from 'node:path';

const attachment = 'C:/Users/badlo/.codex/attachments/e6fcebe2-e7ac-4d31-8739-ce1f57d17609/pasted-text.txt';
const source = fs.readFileSync(attachment, 'utf8');
const starts = [...source.matchAll(/^#(\d+) \/ 48\s*$/gm)];

const audit = {
  1: { verdict: 'duplicate', group: 'personal-plan-pronunciation', reward: 0, title: 'Проверяем упражнение на повторение речи', evidence: 'impuls_day_1 is present in the runtime registry. This repeats the earlier signal №7; the current Android recording behavior still needs device reproduction.', action: 'Дубликат более раннего сигнала №7; отдельная награда 0.' },
  2: { verdict: 'duplicate', group: 'personal-plan-recall', reward: 0, title: 'Спасибо за повторный сигнал о поле ответа', evidence: 'impuls_day_2_fallback is still present in the runtime recall registry. This repeats the earlier signal №3; the current Android keyboard/focus behavior still needs device reproduction.', action: 'Дубликат: ответ нужен, награда 0.' },
  3: { verdict: 'confirmed_investigating', group: 'personal-plan-recall', reward: 1, title: 'Проверяем поле для ввода ответа', evidence: 'The reported recall item is present in the current runtime registry and the current screen has a TextInput. The missing keyboard/focus behavior needs device reproduction.', action: 'Оставляем в device-аудите; за подтверждённый сигнал 1 shard.' },
  4: { verdict: 'confirmed_investigating', group: 'lesson9-input-freeze', reward: 1, title: 'Подтверждаем отдельную проверку зависания поля ввода', evidence: 'Фраза lesson9_phrase_9 и TextInput существуют. Зависание зависит от состояния focus/submit и устройства; безопасный фикс без device-repro нельзя считать готовым.', action: 'Оставляем в device-аудите; за подтверждённый сигнал 1 shard.' },
  5: { verdict: 'confirmed_fixed', group: 'trainer-check-button', reward: 1, title: 'Кнопка проверки тренера больше не выглядит активной раньше времени', evidence: 'Кнопка визуально активировалась после первого слова, но check() требовал полную фразу. Добавлены canCheck, корректный disabled и сниженная opacity.', action: 'Исправлено в клиенте; награда 1 shard после следующего обновления приложения.' },
  6: { verdict: 'confirmed_investigating', group: 'lesson-result-audio', reward: 1, title: 'Проверяем озвучку результата', evidence: 'The normal lesson has result autoplay and replay paths, but the report describes the pronunciation disappearing after the first phrases on Android. The device-specific audio state needs reproduction.', action: 'Оставляем в device-аудите; за подтверждённый сигнал 1 shard.' },
  7: { verdict: 'confirmed_investigating', group: 'personal-plan-pronunciation', reward: 1, title: 'Проверяем упражнение на повторение речи', evidence: 'impuls_day_1 is present in the runtime registry and the current personal-plan flow has recording watchdog and escape paths. The reported Android symptom needs device reproduction.', action: 'Первичный сигнал группы; за подтверждённый device-сигнал 1 shard.' },
  8: { verdict: 'duplicate', group: 'personal-plan-gavan', reward: 0, title: 'Спасибо за повторный сигнал о записи ответа', evidence: 'gavan_day_6 is present in the runtime registry. This repeats the earlier signal №15; the current recording behavior still needs device reproduction.', action: 'Дубликат: ответ отправляем, награда 0.' },
  9: { verdict: 'confirmed_fixed', group: 'lesson8-birthday-content', reward: 1, title: 'Исправили естественность фразы про день рождения', evidence: 'The lesson now uses “His birthday is in October”, which matches the natural American-English wording requested in the report.', action: 'Контент исправлен; награда 1 shard после следующего обновления приложения.' },
  10: { verdict: 'confirmed_fixed', group: 'lesson-task-instruction', reward: 1, title: 'Добавили явное описание задания перед фразой', evidence: 'В lesson1 добавлены инструкции “Собери фразу:” и “Напечатай фразу:” для режимов сборки и ввода.', action: 'Исправлено в клиенте; награда 1 shard после следующего обновления приложения.' },
  11: { verdict: 'by_design', group: 'english-grammar-choice', reward: 0, title: 'Проверили вариант Can I ask a question?', evidence: 'Can I ask a question? — естественная фраза. May I ask a question? тоже возможна, но это более формальный вариант, а не обязательная замена.', action: 'Ошибка не подтверждена; награды нет.' },
  12: { verdict: 'duplicate', group: 'lesson31-phrase31-extra-words', reward: 0, title: 'Спасибо за повторный сигнал по фразе lesson 31', evidence: 'Текущий источник phrase 31 содержит that, stray и busy. Сигнал совпадает с более ранним №32; первичный по времени — №32.', action: 'Дубликат; ответ отправляем, награда 0.' },
  13: { verdict: 'duplicate', group: 'personal-plan-gavan', reward: 0, title: 'Спасибо за повторный сигнал о записи ответа', evidence: 'gavan_day_6 is present in the runtime registry. This repeats the earlier signal №15; the current recording behavior still needs device reproduction.', action: 'Дубликат: ответ отправляем, награда 0.' },
  14: { verdict: 'not_reproduced', group: 'flashcards-audio', reward: 0, title: 'Проверили исчезновение английской озвучки карточек', evidence: 'Текущий аудиодек требует английскую и локализованную стороны, передаёт target locale для английской стороны и имеет fallback TTS.', action: 'В текущем коде ошибка не подтверждена; награды нет.' },
  15: { verdict: 'confirmed_investigating', group: 'personal-plan-gavan', reward: 1, title: 'Проверяем запись и распознавание ответа', evidence: 'gavan_day_6 is present in the runtime registry and the current pronunciation session has reset and escape paths. The reported recognition stop still needs device reproduction.', action: 'Первичный сигнал группы; за подтверждённый device-сигнал 1 shard.' },
  16: { verdict: 'duplicate', group: 'trainer-first-tile-capitalization', reward: 0, title: 'Спасибо за повторный сигнал о первой заглавной букве', evidence: 'Сигнал входит в группу trainer-case: текущий тренер нормализует первую плитку, первичный по времени — №41.', action: 'Дубликат исправленного сигнала; награда 0.' },
  17: { verdict: 'confirmed_fixed', group: 'trainer-word-order', reward: 1, title: 'Стартовый порядок слов в тренере перемешивается корректно', evidence: 'Заменили biased sort на Fisher–Yates и исключили identity permutation, когда слова случайно оставались в исходном порядке.', action: 'Исправлено в клиенте; награда 1 shard после следующего обновления приложения.' },
  18: { verdict: 'confirmed_fixed', group: 'level-exam-ambiguous-question', reward: 1, title: 'Вопрос уровня A1 больше не допускает два смысла', evidence: 'Неоднозначное “___ are you?” заменено на “___ is your name?” с однозначным ответом What.', action: 'Исправлено в клиенте; награда 1 shard после следующего обновления приложения.' },
  19: { verdict: 'not_reproduced', group: 'lesson16-phrase-rendering', reward: 0, title: 'Проверили отображение полной фразы урока 16', evidence: 'В источнике и payload есть полный текст “She took off shoes yesterday”; исчезновения части фразы по данным репорта не подтверждено.', action: 'Нужен точный скриншот или шаг воспроизведения; награды нет.' },
  20: { verdict: 'user_error', group: 'lesson3-tense', reward: 0, title: 'В этой фразе нужен work, а не worked', evidence: 'Текущий источник lesson3_phrase_35: “They work here”. Вариант worked меняет Present Simple на Past Simple.', action: 'Приложение работает по заданию; награды нет.' },
  21: { verdict: 'content_review', group: 'lesson31-vocabulary-sequencing', reward: 0, title: 'Проверяем порядок введения новых слов в уроке 31', evidence: 'Слово mural есть в phrase 38 и в словаре урока, но текущая структура не доказывает, что оно было введено до этого упражнения.', action: 'Это контентная задача для отдельной редакторской правки; сейчас не заявляем её исправленной, награда 0.' },
  22: { verdict: 'confirmed_investigating', group: 'lesson31-mistake-explanation', reward: 1, title: 'Проверяем случаи, когда объяснение ошибки не появляется', evidence: 'AiMistakeCard и подсветка ошибки есть, но при offline/AI error хук может скрыть карточку. Нужен отдельный сценарий неправильного ответа и решение по offline fallback.', action: 'Оставляем в работе без ложного “исправлено”; за подтверждённый сигнал 1 shard.' },
  23: { verdict: 'confirmed_investigating', group: 'lesson31-audio', reward: 1, title: 'Проверяем отсутствие озвучки ответа на устройстве', evidence: 'Для phrase 29 есть точный аудиофайл, а обычный урок вызывает autoplay результата. Симптом может быть OEM/TTS или гонкой аудиосессии, поэтому нужен device-repro.', action: 'Оставляем в аудио-аудите; за подтверждённый сигнал 1 shard.' },
  24: { verdict: 'confirmed_fixed', group: 'lesson31-read-pronunciation', reward: 1, title: 'Для read добавили правильное произношение', evidence: 'The visible word stays read, while speech-only text now guides the system voice to the reported present pronunciation /ri:d/.', action: 'Исправлено без изменения текста задания; награда 1 shard после следующего обновления приложения.' },
  25: { verdict: 'duplicate', group: 'trainer-first-tile-capitalization', reward: 0, title: 'Спасибо за повторный сигнал о первой заглавной букве', evidence: 'Тот же trainer-case сигнал, что в №41 и других репортах группы; первичный по времени — №41.', action: 'Дубликат исправленного сигнала; награда 0.' },
  26: { verdict: 'duplicate', group: 'trainer-first-tile-capitalization', reward: 0, title: 'Спасибо за повторный сигнал о первой заглавной букве', evidence: 'Тот же trainer-case сигнал, что в №41; первичный по времени — №41.', action: 'Дубликат исправленного сигнала; награда 0.' },
  27: { verdict: 'duplicate', group: 'trainer-first-tile-capitalization', reward: 0, title: 'Спасибо за повторный сигнал о первой заглавной букве', evidence: 'Тот же trainer-case сигнал, что в №41; первичный по времени — №41.', action: 'Дубликат исправленного сигнала; награда 0.' },
  28: { verdict: 'duplicate', group: 'trainer-first-tile-capitalization', reward: 0, title: 'Спасибо за повторный сигнал о первой заглавной букве', evidence: 'Тот же trainer-case сигнал, что в №41; первичный по времени — №41.', action: 'Дубликат исправленного сигнала; награда 0.' },
  29: { verdict: 'by_design', group: 'lesson31-demonstrative-meaning', reward: 0, title: 'That ancient map — это намеренный смысловой выбор', evidence: 'Русское “ту древнюю карту” требует demonstrative that. Вариант an ancient map грамматичен, но убирает указательное значение и меняет фразу.', action: 'Ошибка не подтверждена; награды нет.' },
  30: { verdict: 'by_design', group: 'lesson25-answer-alternatives', reward: 0, title: 'Проверили варианты the problem и this problem', evidence: 'Канонический ответ — “the problem”, а “this problem” также принимается как смысловой вариант в текущей проверке.', action: 'Ошибка не подтверждена; награды нет.' },
  31: { verdict: 'confirmed_fixed', group: 'daily-words-reroll', reward: 2, title: 'Reroll больше не должен списывать shards за невыполнимое задание', evidence: 'Reroll теперь считает незавершённые слова до списания, исключает недоступные words_learned-кандидаты и заменяет невыполнимую задачу безопасным fallback.', action: 'Исправлено в клиенте; серьёзный сигнал получает 2 shards после следующего обновления приложения.' },
  32: { verdict: 'confirmed_fixed', group: 'lesson31-phrase31-extra-words', reward: 1, title: 'Исправили перевод фразы урока', evidence: 'The Russian translation now includes the demonstrative «ту» before the busy street, matching the English that and the reported meaning.', action: 'Исправлено в контенте; награда 1 shard после следующего обновления приложения.' },
  33: { verdict: 'content_review', group: 'lesson31-vocabulary-sequencing', reward: 1, title: 'Подтверждаем проверку порядка введения слова complex', evidence: 'Слово complex есть в phrase 2 и в словаре урока, однако исходники не доказывают, что оно было показано в обучении до проверки.', action: 'Нужна отдельная редакторская правка порядка слов; сейчас не заявляем её исправленной. За полезный подтверждённый контентный сигнал 1 shard.' },
  34: { verdict: 'not_reproduced', group: 'lesson31-demonstratives', reward: 0, title: 'Проверили demonstrative в phrase 35', evidence: 'В текущем русском тексте phrase 35 есть “тот”, “ту” и “тому”; отсутствия семейства указательных слов не подтверждено.', action: 'Ошибка не воспроизводится в текущем источнике; награды нет.' },
  35: { verdict: 'not_reproduced', group: 'lesson31-demonstratives', reward: 0, title: 'Проверили demonstrative в phrase 42', evidence: 'В текущем русском тексте phrase 42 есть “тот” перед old man и “тот” перед metal key; отсутствие that не подтверждено.', action: 'Ошибка не воспроизводится в текущем источнике; награды нет.' },
  36: { verdict: 'no_issue_details', group: 'test-report', reward: 0, title: 'Репорт получен, но описание проблемы отсутствует', evidence: 'В записи указано только test functionality без конкретного шага, ожидаемого результата или симптома.', action: 'Нужны подробности для проверки; награды нет.' },
  37: { verdict: 'content_review', group: 'lesson21-layout-and-variants', reward: 0, title: 'Проверяем отображение длинного варианта Everybody', evidence: 'В источнике есть Everybody understands me и допустимая альтернатива Everyone understands me. Нужен визуальный repro на указанном размере экрана, чтобы отделить layout от контента.', action: 'Оставляем на визуальную проверку; награды пока нет.' },
  38: { verdict: 'duplicate', group: 'trainer-first-tile-capitalization', reward: 0, title: 'Спасибо за повторный сигнал о первой заглавной букве', evidence: 'Тот же trainer-case сигнал, что в №41; первичный по времени — №41.', action: 'Дубликат исправленного сигнала; награда 0.' },
  39: { verdict: 'duplicate', group: 'trainer-first-tile-capitalization', reward: 0, title: 'Спасибо за повторный сигнал о первой заглавной букве', evidence: 'Тот же trainer-case сигнал, что в №41; первичный по времени — №41.', action: 'Дубликат исправленного сигнала; награда 0.' },
  40: { verdict: 'confirmed_fixed', group: 'trainer-legacy-mojibake', reward: 1, title: 'Исправили распознавание испорченного перевода в тренере', evidence: 'Sanitizer теперь распознаёт реальные последовательности Ð.../Ñ... и replacement characters, очищая испорченную запись вместо показа кракозябр.', action: 'Исправлено в клиенте; награда 1 shard после следующего обновления приложения.' },
  41: { verdict: 'confirmed_fixed', group: 'trainer-first-tile-capitalization', reward: 1, title: 'Первая плитка тренера теперь показывается без лишней заглавной буквы', evidence: 'Текущий shuffleWordBankTiles нормализует первое слово предложения с сохранением I и имён собственных; этот репорт первичный в группе.', action: 'Исправлено в клиенте; награда 1 shard после следующего обновления приложения.' },
  42: { verdict: 'user_error', group: 'lesson27-would-base-form', reward: 0, title: 'После would нужен базовый глагол check', evidence: 'Текущий ответ — “You said that you would check the documents”. Форма would checked грамматически неверна: после would не ставится прошедшая форма checked.', action: 'Приложение показывает корректную форму; награды нет.' },
  43: { verdict: 'confirmed_fixed', group: 'lesson25-theory-highlight', reward: 1, title: 'Подсветка Were в теории теперь совпадает с текстом', evidence: 'Highlight был задан как разорванный фрагмент “Were watching”, хотя renderer поддерживает непрерывную подстроку. Значение заменено на “Were”.', action: 'Исправлено в клиенте; награда 1 shard после следующего обновления приложения.' },
  44: { verdict: 'no_issue_details', group: 'lesson1-no-described-error', reward: 0, title: 'Репорт получен, но ошибка не описана', evidence: 'В текущем phrase 22 канонический текст — “We are inside”; комментарий не содержит конкретного симптома или ожидаемого исправления.', action: 'Нужны подробности для проверки; награды нет.' },
  45: { verdict: 'confirmed_fixed', group: 'lesson21-translation', reward: 1, title: 'Перевод Nothing is right заменён на естественный вариант', evidence: 'В текущем источнике используется естественное “Всё в порядке” вместо буквального “Ничего не так?”.', action: 'Контент исправлен; награда 1 shard после следующего обновления приложения.' },
  46: { verdict: 'confirmed_fixed', group: 'lesson8-preposition-options', reward: 1, title: 'В упражнении на предлоги остаются варианты для выбора', evidence: 'Генератор подбирает false-preposition distractors, а контракт проверяет минимум два варианта и наличие правильного ответа.', action: 'Исправлено в клиенте; награда 1 shard после следующего обновления приложения.' },
  47: { verdict: 'by_design', group: 'lesson31-translation-word-choice', reward: 0, title: 'Слова complex и difficult не противоречат друг другу', evidence: 'Оба слова могут переводиться как “сложный”; в текущем phrase 32 выбран естественный для контекста вариант “трудный”.', action: 'Ошибка не подтверждена; награды нет.' },
  48: { verdict: 'no_issue_details', group: 'accidental-tap', reward: 0, title: 'Случайный тап не содержит ошибки приложения', evidence: 'В репорте указано, что отправка произошла случайно; описания сбоя или неверного результата нет.', action: 'Ошибка не подтверждена; награды нет.' },
};

function field(part, name) {
  return part.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

function comment(part) {
  return part.match(/^comment:[^\S\r\n]*(.*?)(?=\r?\n(?:={8,}|---))/ms)?.[1]?.trim() ?? '';
}

function md(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

const rows = starts.map((match, index) => {
  const number = Number(match[1]);
  const part = source.slice(match.index, starts[index + 1]?.index ?? source.length);
  const meta = audit[number];
  if (!meta) throw new Error(`Missing audit row ${number}`);
  return {
    reportNo: number,
    reportId: field(part, 'id'),
    createdAt: field(part, 'createdAt'),
    uid: field(part, 'uid'),
    screen: field(part, 'screen'),
    category: field(part, 'category'),
    dataId: field(part, 'dataId'),
    userLanguage: field(part, 'lang') || 'ru',
    comment: comment(part),
    ...meta,
  };
});

const publicSummaries = {
  1: 'упражнение на повторение речи не переходило дальше после ответа',
  2: 'поле для ввода ответа не открывало клавиатуру',
  3: 'поле для ввода ответа не открывало клавиатуру',
  4: 'поле ответа зависало после ввода',
  5: 'кнопка проверки выглядела доступной до полной сборки фразы',
  6: 'озвучка результата пропадала после первых фраз',
  7: 'упражнение на повторение речи не переходило дальше после ответа',
  8: 'запись ответа не запускалась',
  9: 'формулировка фразы про день рождения была неестественной',
  10: 'на экране не хватало явной инструкции к заданию',
  11: 'возник вопрос о выборе Can или May',
  12: 'в условии фразы были неясны отдельные слова',
  13: 'запись ответа не запускалась',
  14: 'пропадала английская озвучка карточек',
  15: 'распознавание речи не завершалось',
  16: 'первая плитка показывалась с лишней заглавной буквой',
  17: 'слова иногда оставались в исходном порядке',
  18: 'формулировка вопроса допускала два смысла',
  19: 'часть фразы не отображалась на экране',
  20: 'возник вопрос о форме времени в предложении',
  21: 'новое слово могло появиться без предварительного введения',
  22: 'объяснение неправильного ответа иногда не появлялось',
  23: 'озвучка ответа иногда отсутствовала',
  24: 'слово read звучало не так, как ожидалось в этом контексте',
  25: 'первая плитка показывалась с лишней заглавной буквой',
  26: 'первая плитка показывалась с лишней заглавной буквой',
  27: 'первая плитка показывалась с лишней заглавной буквой',
  28: 'первая плитка показывалась с лишней заглавной буквой',
  29: 'возник вопрос об артикле перед словосочетанием ancient map',
  30: 'возник вопрос о вариантах the problem и this problem',
  31: 'замена ежедневного задания могла списать осколки без выполнимого результата',
  32: 'в переводе фразы не хватало указательного слова',
  33: 'новое слово могло появиться без предварительного введения',
  34: 'возник вопрос об указательном слове в переводе',
  35: 'возник вопрос об указательном слове в переводе',
  36: 'в сообщении не хватило подробностей для проверки',
  37: 'длинный вариант ответа мог быть неудобен на маленьком экране',
  38: 'первая плитка показывалась с лишней заглавной буквой',
  39: 'первая плитка показывалась с лишней заглавной буквой',
  40: 'в переводе отображались искажённые символы',
  41: 'первая плитка показывалась с лишней заглавной буквой',
  42: 'возник вопрос о форме глагола после would',
  43: 'подсветка слова в теории не совпадала с предложением',
  44: 'в сообщении не было описания конкретной ошибки',
  45: 'перевод звучал неестественно',
  46: 'возник вопрос о количестве вариантов в упражнении',
  47: 'возник вопрос о переводе слов complex и difficult',
  48: 'репорт был отправлен случайно',
};

const publicTitles = {
  4: 'Проверяем зависание поля ответа',
  12: 'Спасибо за повторный сигнал о фразе урока',
  21: 'Проверяем порядок новых слов',
  31: 'Проверяем замену ежедневного задания',
  32: 'Исправили перевод фразы урока',
  33: 'Проверяем порядок введения нового слова',
  34: 'Проверили указательное слово в переводе',
  35: 'Проверили указательное слово в переводе',
  37: 'Проверяем отображение длинного ответа',
};

for (const row of rows) {
  row.publicSummary = publicSummaries[row.reportNo] || 'описанный в сообщении пользовательский сценарий';
  if (publicTitles[row.reportNo]) row.title = publicTitles[row.reportNo];
}

if (rows.length !== 48) throw new Error(`Expected 48 rows, got ${rows.length}`);

const rewardText = (count) => `${count} ${count === 1 ? 'осколок' : count < 5 ? 'осколка' : 'осколков'}`;

const replies = rows.map(({ reportNo, reportId, uid, title, reward, verdict, group, publicSummary }) => {
  const rewardSentence = reward > 0
    ? `За этот сигнал тебя ждёт награда: забери ${rewardText(reward)}.`
    : 'Отдельная награда за этот сигнал не начисляется.';
  let body;
  if (verdict === 'confirmed_fixed') {
    body = `Спасибо за репорт! Мы подтвердили проблему и исправили её: ${publicSummary}. Изменения вступят в силу со следующим обновлением приложения. ${rewardSentence}`;
  } else if (verdict === 'confirmed_investigating' || verdict === 'content_review') {
    body = `Спасибо за подробный репорт! Мы подтвердили сигнал: ${publicSummary}. Безопасно объявлять его полностью исправленным пока нельзя, поэтому оставили его на отдельной проверке. ${rewardSentence}`;
  } else if (verdict === 'duplicate') {
    body = `Спасибо, что сообщил об этом! Мы уже получили такой же сигнал и объединили его с общей проверкой: ${publicSummary}. Твой репорт помог подтвердить картину, но по правилу дублей отдельная награда не начисляется.`;
  } else {
    body = `Спасибо за репорт! Мы проверили ситуацию: ${publicSummary}. По текущим данным отдельная ошибка приложения не подтверждается, поэтому награда за этот сигнал не начисляется.`;
  }
  return { reportId, uid, title, body, shards: reward, resolution: verdict, rewardGroup: group };
});

const outDir = path.resolve('docs/reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync('replies_batch_2026-07-10_final.json', JSON.stringify(replies, null, 2) + '\n', 'utf8');
fs.writeFileSync('replies_batch_2026-07-10.json', JSON.stringify(replies, null, 2) + '\n', 'utf8');
fs.writeFileSync('docs/reports/user_error_reports_audit_2026-07-10.json', JSON.stringify(rows, null, 2) + '\n', 'utf8');

const counts = rows.reduce((acc, row) => { acc[row.verdict] = (acc[row.verdict] ?? 0) + 1; return acc; }, {});
const fixed = rows.filter((row) => row.verdict === 'confirmed_fixed').length;
const rewardTotal = rows.reduce((sum, row) => sum + row.reward, 0);
let markdown = '# Phraseman user error reports audit\n\n';
markdown += `Generated from the 48-report export on 2026-07-10. No live replies, rewards, OTA, or deploy were executed.\n\n`;
markdown += `Summary: ${fixed} code/content fixes recorded, ${rows.filter((row) => row.verdict === 'not_reproduced' || row.verdict === 'user_error' || row.verdict === 'by_design' || row.verdict === 'no_issue_details' || row.verdict === 'stale_content_not_reproduced').length} reports not confirmed in the current source, ${rows.filter((row) => row.verdict === 'confirmed_investigating' || row.verdict === 'content_review').length} reports remain for device/content review, ${rows.filter((row) => row.verdict === 'duplicate').length} duplicates, planned rewards ${rewardTotal} shards.\n\n`;
markdown += 'Verdict counts: ' + Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ') + '.\n\n';
markdown += '## Per-report audit\n\n';
for (const row of rows) {
  markdown += `### #${row.reportNo} ${row.reportId}\n`;
  markdown += `- Created: ${row.createdAt}\n`;
  markdown += `- User: ${row.uid}; language: ${row.userLanguage}; screen: ${row.screen}; category: ${row.category}; dataId: ${row.dataId}\n`;
  markdown += `- Report comment: ${md(row.comment)}\n`;
  markdown += `- Verdict: **${row.verdict}**; duplicate group: ${row.group}; planned shards: ${row.reward}\n`;
  markdown += `- Evidence: ${row.evidence}\n`;
  markdown += `- Action: ${row.action}\n`;
  const reply = replies.find((item) => item.reportId === row.reportId);
  markdown += `- Draft reply: ${reply.body}\n\n`;
}
markdown += '## Code changes covered by this audit\n\n';
markdown += '- Trainer check state now exposes only a complete selection as actionable.\n';
markdown += '- Trainer word-bank shuffle uses Fisher-Yates and avoids the unchanged order.\n';
markdown += '- Lesson 1 has an explicit task instruction for build and hard-mode input.\n';
markdown += '- Level exam ambiguity, theory highlight, lesson 21 translation, lesson 8 distractors, and trainer first-tile casing are covered by current contracts.\n';
markdown += '- Daily vocabulary reroll checks available words before charging shards and falls back when the task is impossible.\n';
markdown += '- Legacy trainer mojibake detection now covers Cyrillic byte-pair corruption.\n';
markdown += '- The lesson 31 `read` phrase has a pronunciation-only TTS override while keeping visible text unchanged.\n\n';
markdown += '## Explicitly not declared fixed\n\n';
markdown += '- Device-dependent personal-plan recording, lesson 9 input freeze, and audio OEM/TTS failures require real device reproduction.\n';
markdown += '- Lesson 31 vocabulary sequencing and lesson 21 layout need content/visual review rather than an unsafe source patch.\n';
markdown += '- AI mistake explanation availability needs an offline/server fallback decision and a behavioral test.\n';
fs.writeFileSync('docs/reports/user_error_reports_audit_2026-07-10.md', markdown, 'utf8');

console.log(JSON.stringify({ reports: rows.length, fixed, plannedRewards: rewardTotal, verdicts: counts }));

// Preserve the original attachment parser, then normalize every generated artifact
// through the canonical UTF-8-safe final audit and support-copy synchronizer.
await import('./sync_user_report_support_copy.mjs');
