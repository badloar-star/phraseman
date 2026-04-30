import type { ShareCardLang } from './streakCardCopy';

/** Главная строка карточки: смысл, а не CTA — «пригласи» остаётся в тексте шаринга. */
export function getInviteCardSub(lang: ShareCardLang): string {
  if (lang === 'uk') return 'Англійська разом у Phraseman';
  if (lang === 'es') return 'Inglés juntos en Phraseman';
  return 'Английский вместе в Phraseman';
}
