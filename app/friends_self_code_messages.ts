/** Сообщения, если пользователь ввёл свой же код друга — показываем случайную фразу. */
export type FriendCodeLocalizer = (
  ru: string,
  uk: string,
  es: string,
  ptBr: string,
  vi: string,
  id: string,
  tr: string,
  pl: string,
) => string;

const SELF_FRIEND_CODE_MESSAGES = [
  {
    ru: 'Сам с собой в друзья? Философски красиво, но технически нет. Другой код, пожалуйста.',
    uk: 'Сам із собою в друзі? Філософськи гарно, але технічно ні. Інший код, будь ласка.',
    es: '¿Amigo de ti mismo? Filosóficamente bonito, pero técnicamente no. Otro código, por favor.',
    'pt-BR': 'Amigo de si mesmo? Filosoficamente bonito, mas tecnicamente não. Outro código, por favor.',
    ptBr: 'Amigo de si mesmo? Filosoficamente bonito, mas tecnicamente não. Outro código, por favor.',
    vi: 'Tự kết bạn với chính mình? Nghe rất triết học, nhưng kỹ thuật thì không. Vui lòng dùng mã khác.',
    id: 'Berteman dengan diri sendiri? Secara filosofis indah, tapi secara teknis tidak. Pakai kode lain, ya.',
    tr: 'Kendinle arkadaş olmak mı? Felsefi olarak hoş, teknik olarak olmaz. Lütfen başka bir kod gir.',
    pl: 'Znajomy sam ze sobą? Filozoficznie ładnie, technicznie nie. Wpisz inny kod.',
  },
  {
    ru: 'Сюрприз: этот код твой. Добавить себя не выйдет — пригласи кого-нибудь настоящего.',
    uk: 'Сюрприз: це твій код. Додати себе не вийде — запроси когось справжнього.',
    es: 'Sorpresa: ese código es tuyo. No puedes añadirte — invita a alguien de verdad.',
    'pt-BR': 'Surpresa: esse código é seu. Não dá para adicionar você mesmo — convide alguém de verdade.',
    ptBr: 'Surpresa: esse código é seu. Não dá para adicionar você mesmo — convide alguém de verdade.',
    vi: 'Bất ngờ nhé: đây là mã của bạn. Bạn không thể tự thêm mình — hãy mời một người thật.',
    id: 'Kejutan: itu kodemu sendiri. Kamu tidak bisa menambahkan diri sendiri — undang orang sungguhan.',
    tr: 'Sürpriz: bu kod senin. Kendini ekleyemezsin — gerçek birini davet et.',
    pl: 'Niespodzianka: to twój kod. Nie da się dodać siebie — zaproś kogoś prawdziwego.',
  },
  {
    ru: 'Поймал себя в ловушку. Отличный код, но он твой — введи код того, кого хочешь в друзья.',
    uk: 'Піймав себе в пастці. Чудовий код, але він твій — введи код того, кого хочеш у друзі.',
    es: 'Te pillaste a ti mismo. Buen código, pero es el tuyo — pon el de quien quieras tener de amigo.',
    'pt-BR': 'Você caiu na própria armadilha. Ótimo código, mas ele é seu — digite o código de quem você quer adicionar.',
    ptBr: 'Você caiu na própria armadilha. Ótimo código, mas ele é seu — digite o código de quem você quer adicionar.',
    vi: 'Bạn tự mắc bẫy rồi. Mã rất ổn, nhưng đó là mã của bạn — hãy nhập mã của người bạn muốn kết bạn.',
    id: 'Kamu menjebak diri sendiri. Kodenya bagus, tapi itu kodemu — masukkan kode orang yang ingin kamu jadikan teman.',
    tr: 'Kendi tuzağına düştün. Kod güzel, ama senin kodun — arkadaş eklemek istediğin kişinin kodunu gir.',
    pl: 'Wpadłeś we własną pułapkę. Kod świetny, ale twój — wpisz kod osoby, którą chcesz dodać.',
  },
] as const;

export function randomSelfFriendCodeMessage(L: FriendCodeLocalizer): string {
  const i = Math.floor(Math.random() * SELF_FRIEND_CODE_MESSAGES.length);
  const row = SELF_FRIEND_CODE_MESSAGES[i];
  return L(row.ru, row.uk, row.es, row.ptBr, row.vi, row.id, row.tr, row.pl);
}
