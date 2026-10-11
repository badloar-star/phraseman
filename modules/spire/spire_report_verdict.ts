/**
 * Итог отправки жалобы на задание Шпиля для кнопки + тост «отправим позже» (обзор R1 п.3).
 * Отдельный модуль без React: кнопку и тест не связывает с вёрсткой и иконками.
 */
import { actionToastTri, emitAppEvent } from '../../app/events';

// зачем (обзор R1 п.3, координатор 12.10): жалоба легла в локальную очередь, задание снято, а сервер отказал.
// Кнопка к этому моменту часто уже размонтирована (задание сменилось / ступень закончилась) — поэтому сообщение
// идёт общим тостом, а не текстом в окне кнопки. Очередь сама дошлёт жалобу позже.
export const SPIRE_REPORT_QUEUED_TOAST = actionToastTri('info', {
  ru: 'Жалоба сохранена — отправим, когда будет связь',
  uk: 'Скаргу збережено — надішлемо, коли буде зв’язок',
  en: 'Report saved — we’ll send it when you’re back online',
  es: 'Reporte guardado: lo enviaremos cuando haya conexión',
  'pt-BR': 'Relato salvo — enviaremos quando houver conexão',
  vi: 'Đã lưu báo cáo — sẽ gửi khi có mạng',
  id: 'Laporan disimpan — dikirim saat ada koneksi',
  tr: 'Bildirim kaydedildi — bağlantı gelince göndereceğiz',
  pl: 'Zgłoszenie zapisane — wyślemy, gdy będzie połączenie',
});

/** Итог отправки жалобы для кнопки + тост «отправим позже». Чистая логика, без React. */
export function spireReportSubmitVerdict(input: Readonly<{ serverConfirmed: boolean; queuedAndRemoved: boolean; taskId: string }>): 'sent' | 'failed' {
  if (input.serverConfirmed) {
    console.log('[SPIRE-REPORT]', JSON.stringify({ step: 'server_confirmed', taskId: input.taskId }));
    return 'sent';
  }
  if (input.queuedAndRemoved) {
    console.warn('[SPIRE-REPORT]', JSON.stringify({ step: 'server_failed_queued', taskId: input.taskId, shown: 'toast_send_later' }));
    emitAppEvent('action_toast', SPIRE_REPORT_QUEUED_TOAST);
    return 'sent';
  }
  console.warn('[SPIRE-REPORT]', JSON.stringify({ step: 'not_queued_not_sent', taskId: input.taskId, shown: 'button_failed' }));
  return 'failed';
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
