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
    drainBody: 'Новые приглашения закрыты. Уже начатые приглашения и прокруты сохраняются до указанного срока.',
    pendingDeadline: 'Первый урок нужно закончить до',
    spinExpiry: 'Ближайший прокрут действует до',
    emergencyUnavailable: 'Рулетка временно остановлена.',
  },
  uk: {
    drainTitle: 'Заверши розпочаті запрошення',
    drainBody: 'Нові запрошення закриті. Уже розпочаті запрошення та прокрути зберігаються до вказаного строку.',
    pendingDeadline: 'Перший урок потрібно завершити до',
    spinExpiry: 'Найближчий прокрут діє до',
    emergencyUnavailable: 'Рулетку тимчасово зупинено.',
  },
  es: {
    drainTitle: 'Completa tus invitaciones pendientes',
    drainBody: 'Las invitaciones nuevas están cerradas. Las invitaciones y giros ya obtenidos siguen disponibles hasta la fecha indicada.',
    pendingDeadline: 'La primera lección debe completarse antes del',
    spinExpiry: 'El giro más próximo caduca el',
    emergencyUnavailable: 'La ruleta está detenida temporalmente.',
  },
  'pt-BR': {
    drainTitle: 'Conclua seus convites pendentes',
    drainBody: 'Novos convites estão encerrados. Convites iniciados e giros já ganhos continuam válidos até a data indicada.',
    pendingDeadline: 'A primeira lição deve ser concluída até',
    spinExpiry: 'O giro mais próximo expira em',
    emergencyUnavailable: 'A roleta está temporariamente pausada.',
  },
  vi: {
    drainTitle: 'Hoàn tất lời mời đang chờ',
    drainBody: 'Lời mời mới đã đóng. Lời mời đang thực hiện và lượt quay đã nhận vẫn còn hiệu lực đến thời hạn hiển thị.',
    pendingDeadline: 'Cần hoàn thành bài học đầu tiên trước',
    spinExpiry: 'Lượt quay gần hết hạn nhất có hiệu lực đến',
    emergencyUnavailable: 'Vòng quay đang tạm dừng.',
  },
  id: {
    drainTitle: 'Selesaikan undangan yang tertunda',
    drainBody: 'Undangan baru sudah ditutup. Undangan yang sedang berjalan dan putaran yang sudah didapat tetap berlaku sampai batas waktu.',
    pendingDeadline: 'Pelajaran pertama harus selesai sebelum',
    spinExpiry: 'Putaran terdekat berlaku sampai',
    emergencyUnavailable: 'Roulette sedang dihentikan sementara.',
  },
  tr: {
    drainTitle: 'Bekleyen davetlerini tamamla',
    drainBody: 'Yeni davetler kapatıldı. Başlamış davetler ve kazanılmış çevirmeler gösterilen tarihe kadar geçerli.',
    pendingDeadline: 'İlk ders şu tarihe kadar tamamlanmalı',
    spinExpiry: 'En yakın çevirmenin son kullanım tarihi',
    emergencyUnavailable: 'Rulet geçici olarak durduruldu.',
  },
  pl: {
    drainTitle: 'Dokończ rozpoczęte zaproszenia',
    drainBody: 'Nowe zaproszenia są zamknięte. Rozpoczęte zaproszenia i zdobyte losy pozostają ważne do podanego terminu.',
    pendingDeadline: 'Pierwszą lekcję trzeba ukończyć do',
    spinExpiry: 'Najbliższy los jest ważny do',
    emergencyUnavailable: 'Ruletka jest tymczasowo zatrzymana.',
  },
};

const DATE_LOCALE: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
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
