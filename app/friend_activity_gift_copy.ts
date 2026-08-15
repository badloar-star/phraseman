import { triLang, type Lang } from '../constants/i18n';

type GiftEventType = 'friend_gift_sent' | 'friend_gift_received';

export function friendActivityGiftCopy(input: {
  type: GiftEventType;
  friendName: string;
  giftLabel: string;
  viewerUid: string;
  payload: Record<string, string | number>;
  lang: string;
}): string {
  const { type, friendName: name, giftLabel: gift, viewerUid, payload } = input;
  const lang = input.lang as Lang;
  const viewerSentThisGift =
    type === 'friend_gift_received'
    && !!viewerUid
    && String(payload.fromUid ?? '') === viewerUid;
  if (viewerSentThisGift) {
    return triLang(lang, {
      ru: `Вы отправили подарок: ${gift} → ${name}`,
      uk: `Ви надіслали подарунок: ${gift} → ${name}`,
      es: `Enviaste un regalo: ${gift} → ${name}`,
      'pt-BR': `Você enviou um presente: ${gift} → ${name}`,
      vi: `Bạn đã gửi quà: ${gift} → ${name}`,
      id: `Kamu mengirim hadiah: ${gift} → ${name}`,
      tr: `Bir hediye gönderdin: ${gift} → ${name}`,
      pl: `Wysłano prezent: ${gift} → ${name}`,
    });
  }

  const viewerReceivedThisGift =
    type === 'friend_gift_sent'
    && !!viewerUid
    && String(payload.targetUid ?? '') === viewerUid;
  if (viewerReceivedThisGift) {
    return triLang(lang, {
      ru: `${name} отправил(а) вам подарок: ${gift}`,
      uk: `${name} надіслав(ла) вам подарунок: ${gift}`,
      es: `${name} te envió un regalo: ${gift}`,
      'pt-BR': `${name} enviou um presente para você: ${gift}`,
      vi: `${name} đã gửi quà cho bạn: ${gift}`,
      id: `${name} mengirim hadiah untukmu: ${gift}`,
      tr: `${name} sana bir hediye gönderdi: ${gift}`,
      pl: `${name} wysłał(a) ci prezent: ${gift}`,
    });
  }

  if (type === 'friend_gift_sent') {
    return triLang(lang, {
      ru: `${name} отправил(а) подарок: ${gift}`,
      uk: `${name} надіслав(ла) подарунок: ${gift}`,
      es: `${name} envió un regalo: ${gift}`,
      'pt-BR': `${name} enviou um presente: ${gift}`,
      vi: `${name} đã gửi quà: ${gift}`,
      id: `${name} mengirim hadiah: ${gift}`,
      tr: `${name} hediye gönderdi: ${gift}`,
      pl: `${name} wysłał(a) prezent: ${gift}`,
    });
  }
  return triLang(lang, {
    ru: `${name} получил(а) подарок: ${gift}`,
    uk: `${name} отримав(ла) подарунок: ${gift}`,
    es: `${name} recibió un regalo: ${gift}`,
    'pt-BR': `${name} recebeu um presente: ${gift}`,
    vi: `${name} đã nhận quà: ${gift}`,
    id: `${name} menerima hadiah: ${gift}`,
    tr: `${name} hediye aldı: ${gift}`,
    pl: `${name} otrzymał(a) prezent: ${gift}`,
  });
}

/* expo-router route shim: utility module, not a screen */
export default function __RouteShim() { return null; }
