const WORD_JOINER = '⁠';
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * зачем (EN-проход 13.10, profile-011/012): Android переносил адрес после «support» — «.phraseman@gmail.com» уходил на
 * следующую строку. Склеиваем адрес невидимым WORD JOINER (U+2060) вокруг «.» и «@» только при показе; текст документа
 * (legal/*.json) не меняется, переносы между словами — как раньше.
 */
export function keepEmailsUnbroken(text: string): string {
  return text.replace(EMAIL_RE, (email) => email.replace(/([.@])/g, `${WORD_JOINER}$1${WORD_JOINER}`));
}
