/** Сообщения, если пользователь ввёл свой же код друга — показываем случайную фразу (RU/UK/ES). */
const SELF_FRIEND_CODE_MESSAGES = [
  {
    ru: 'Сам с собой в друзья? Философски красиво, но технически нет. Другой код, пожалуйста.',
    uk: 'Сам із собою в друзі? Філософськи гарно, але технічно ні. Інший код, будь ласка.',
    es: '¿Amigo de ti mismo? Filosóficamente bonito, pero técnicamente no. Otro código, por favor.',
  },
  {
    ru: 'Сюрприз: этот код твой. Добавить себя не выйдет — пригласи кого-нибудь настоящего.',
    uk: 'Сюрприз: це твій код. Додати себе не вийде — запроси когось справжнього.',
    es: 'Sorpresa: ese código es tuyo. No puedes añadirte — invita a alguien de verdad.',
  },
  {
    ru: 'Поймал себя в ловушку. Отличный код, но он твой — введи код того, кого хочешь в друзья.',
    uk: 'Піймав себе в пастці. Чудовий код, але він твій — введи код того, кого хочеш у друзі.',
    es: 'Te pillaste a ti mismo. Buen código, pero es el tuyo — pon el de quien quieras tener de amigo.',
  },
] as const;

export function randomSelfFriendCodeMessage(L: (ru: string, uk: string, es: string) => string): string {
  const i = Math.floor(Math.random() * SELF_FRIEND_CODE_MESSAGES.length);
  const row = SELF_FRIEND_CODE_MESSAGES[i];
  return L(row.ru, row.uk, row.es);
}
