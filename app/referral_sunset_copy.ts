import type { Lang } from '../constants/i18n';

type SunsetCopy = Readonly<{
  drainTitle: string;
  drainBody: string;
  pendingDeadline: string;
  spinExpiry: string;
  emergencyUnavailable: string;
}>;

export const referralSunsetCopy: Record<Lang, SunsetCopy> = {
  ru: {
    drainTitle: 'Заверши начатые приглашения',
    drainBody: 'Новые приглашения закрыты. Уже начатые приглашения и ключи сохраняются до указанного срока.',
    pendingDeadline: 'Оформить Plus или Pro нужно до',
    spinExpiry: 'Ближайший ключ действует до',
    emergencyUnavailable: 'Награды временно недоступны.',
  },
  uk: {
    drainTitle: 'Заверши розпочаті запрошення',
    drainBody: 'Нові запрошення закриті. Уже розпочаті запрошення та ключі зберігаються до вказаного строку.',
    pendingDeadline: 'Оформити Plus або Pro потрібно до',
    spinExpiry: 'Найближчий ключ діє до',
    emergencyUnavailable: 'Нагороди тимчасово недоступні.',
  },
  en: {
    drainTitle: 'Finish your pending invites',
    drainBody: 'New invites are closed. Invites already in progress and keys already earned stay valid until the date shown.',
    pendingDeadline: 'Plus or Pro must be purchased by',
    spinExpiry: 'The nearest key expires on',
    emergencyUnavailable: 'Rewards are temporarily unavailable.',
  },
  es: {
    drainTitle: 'Completa tus invitaciones pendientes',
    drainBody: 'Las invitaciones nuevas están cerradas. Las invitaciones y llaves ya obtenidas siguen disponibles hasta la fecha indicada.',
    pendingDeadline: 'La compra de Plus o Pro debe hacerse antes del',
    spinExpiry: 'La llave más próxima caduca el',
    emergencyUnavailable: 'Las recompensas no están disponibles temporalmente.',
  },
  'pt-BR': {
    drainTitle: 'Conclua seus convites pendentes',
    drainBody: 'Novos convites estão encerrados. Convites iniciados e chaves já ganhas continuam válidos até a data indicada.',
    pendingDeadline: 'A assinatura Plus ou Pro deve ser feita até',
    spinExpiry: 'A chave mais próxima expira em',
    emergencyUnavailable: 'As recompensas estão temporariamente indisponíveis.',
  },
  vi: {
    drainTitle: 'Hoàn tất lời mời đang chờ',
    drainBody: 'Lời mời mới đã đóng. Lời mời đang thực hiện và chìa khóa đã nhận vẫn còn hiệu lực đến thời hạn hiển thị.',
    pendingDeadline: 'Cần mua Plus hoặc Pro trước',
    spinExpiry: 'Chìa khóa gần hết hạn nhất có hiệu lực đến',
    emergencyUnavailable: 'Phần thưởng tạm thời không khả dụng.',
  },
  id: {
    drainTitle: 'Selesaikan undangan yang tertunda',
    drainBody: 'Undangan baru sudah ditutup. Undangan yang sedang berjalan dan kunci yang sudah didapat tetap berlaku sampai batas waktu.',
    pendingDeadline: 'Pembelian Plus atau Pro harus sebelum',
    spinExpiry: 'Kunci terdekat berlaku sampai',
    emergencyUnavailable: 'Hadiah sementara tidak tersedia.',
  },
  tr: {
    drainTitle: 'Bekleyen davetlerini tamamla',
    drainBody: 'Yeni davetler kapatıldı. Başlamış davetler ve kazanılmış anahtarlar gösterilen tarihe kadar geçerli.',
    pendingDeadline: 'Plus veya Pro şu tarihe kadar satın alınmalı',
    spinExpiry: 'En yakın anahtarın son kullanım tarihi',
    emergencyUnavailable: 'Ödüller geçici olarak kullanılamıyor.',
  },
  pl: {
    drainTitle: 'Dokończ rozpoczęte zaproszenia',
    drainBody: 'Nowe zaproszenia są zamknięte. Rozpoczęte zaproszenia i zdobyte klucze pozostają ważne do podanego terminu.',
    pendingDeadline: 'Plus lub Pro trzeba kupić do',
    spinExpiry: 'Najbliższy klucz jest ważny do',
    emergencyUnavailable: 'Nagrody są tymczasowo niedostępne.',
  },
};

const DATE_LOCALE: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  en: 'en-US',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

export function formatReferralSunsetDate(serverTimestampMs: number, lang: Lang): string {
  if (!Number.isFinite(serverTimestampMs) || serverTimestampMs <= 0) return '';
  return new Intl.DateTimeFormat(DATE_LOCALE[lang] ?? 'ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(serverTimestampMs));
}
