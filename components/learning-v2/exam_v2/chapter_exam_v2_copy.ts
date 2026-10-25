// chapter_exam_v2_copy.ts — тексты экрана экзамена главы v2, дословно по прототипу docs/design/v2-app/chapter-exam-v2-prototype.html.
// зачем (владелец утвердил прототип 25.10): одобренный экран = макет дословно. Курс Learning V2 идёт на русском и украинском — у банков
// только ru/uk, поэтому и тексты экрана ru/uk; прочие языки интерфейса получают русский, как ситуации банка.
// Общие строки итога («Экзамен сдан», «Глава N открыта», «Начнём с эпизода…», «К главе N», «Вопрос N», «Твой ответ:») — из
// learning_v2_chapter_exam_result_copy, чтобы не расходиться с прежним экзаменом.

const COPY = {
  progress: { ru: 'Экзамен · {i} / {n}', uk: 'Іспит · {i} / {n}' },
  close: { ru: 'Закрыть', uk: 'Закрити' },
  titleSituation: { ru: 'Скажи по-английски', uk: 'Скажи англійською' },
  titleDialogue: { ru: 'Ответь собеседнику', uk: 'Дай відповідь співрозмовнику' },
  titleFix: { ru: 'Найди и исправь ошибку', uk: 'Знайди й виправ помилку' },
  situation: { ru: 'Ситуация', uk: 'Ситуація' },
  fixAsk: { ru: 'Перепиши фразу без ошибки:', uk: 'Перепиши фразу без помилки:' },
  micHint: { ru: 'Зажми кнопку и говори, отпусти — проверю', uk: 'Затисни кнопку й говори, відпусти — перевірю' },
  micLabel: { ru: 'Удерживай и говори', uk: 'Утримуй і говори' },
  micListening: { ru: 'Слушаю…', uk: 'Слухаю…' },
  micUnavailable: { ru: 'Микрофон недоступен — напиши ответ', uk: 'Мікрофон недоступний — напиши відповідь' },
  micDenied: { ru: 'Нет доступа к микрофону — напиши ответ', uk: 'Немає доступу до мікрофона — напиши відповідь' },
  micNothing: { ru: 'Не расслышал — скажи ещё раз или напиши', uk: 'Не розчув — скажи ще раз або напиши' },
  writeInstead: { ru: 'или напиши', uk: 'або напиши' },
  placeholder: { ru: 'Напиши по-английски', uk: 'Напиши англійською' },
  check: { ru: 'Проверить', uk: 'Перевірити' },
  next: { ru: 'Дальше', uk: 'Далі' },
  correct: { ru: 'Верно.', uk: 'Правильно.' },
  typo: { ru: 'Опечатка — пишется:', uk: 'Помилка в написанні — пишеться:' },
  wrong: { ru: 'Неверно.', uk: 'Неправильно.' },
  rightIs: { ru: 'Правильно:', uk: 'Правильно:' },
  scoreOf: { ru: '{c} из {t}', uk: '{c} з {t}' },
  whereStumbled: { ru: 'Где споткнулся', uk: 'Де спіткнувся' },
  episodeOne: { ru: 'Эпизод {e}', uk: 'Епізод {e}' },
  episodesMany: { ru: 'Эпизоды {list} и {last}', uk: 'Епізоди {list} і {last}' },
  mistakesLink: { ru: 'Разбор ошибок · {k}', uk: 'Розбір помилок · {k}' },
  mistakeOneLink: { ru: 'Разбор ошибки · {k}', uk: 'Розбір помилки · {k}' },
  reviewTopics: { ru: 'Повторить эти темы', uk: 'Повторити ці теми' },
  retryIn: { ru: 'Пересдать через {m} мин', uk: 'Перескласти за {m} хв' },
  reviewTitle: { ru: 'Повтори эти темы', uk: 'Повтори ці теми' },
  noEpisodes: { ru: 'Эпизодов для повторения нет', uk: 'Епізодів для повторення немає' },
  retake: { ru: 'Пересдать экзамен', uk: 'Перескласти іспит' },
  toResult: { ru: 'К итогу', uk: 'До підсумку' },
  mistakesTitle: { ru: 'Разбор ошибок', uk: 'Розбір помилок' },
  fixPrompt: { ru: 'Исправь: {w}', uk: 'Виправ: {w}' },
} as const;

export type ChapterExamV2CopyKey = keyof typeof COPY;

export function chapterExamV2Copy(lang: string, key: ChapterExamV2CopyKey, vars: Readonly<Record<string, string | number>> = {}): string {
  const entry = COPY[key];
  const text: string = lang === 'uk' ? entry.uk : entry.ru;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

/** «1 ошибка», «2 ошибки», «5 ошибок» (uk: «1 помилка», «2 помилки», «5 помилок»). */
export function chapterExamV2ErrorsWord(lang: string, n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const form = mod10 === 1 && mod100 !== 11 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 1 : 2;
  const forms = lang === 'uk' ? ['помилка', 'помилки', 'помилок'] : ['ошибка', 'ошибки', 'ошибок'];
  return `${n} ${forms[form]}`;
}

/** «Эпизод 9» / «Эпизоды 9 и 16» / «Эпизоды 11, 12 и 15». */
export function chapterExamV2EpisodesWord(lang: string, episodes: readonly number[]): string {
  if (episodes.length === 1) return chapterExamV2Copy(lang, 'episodeOne', { e: episodes[0] });
  return chapterExamV2Copy(lang, 'episodesMany', { list: episodes.slice(0, -1).join(', '), last: episodes[episodes.length - 1] });
}
