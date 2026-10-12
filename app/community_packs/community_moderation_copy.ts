// зачем (координатор 13.10, аудит Авторизации a62d6bb0d): окно решения модерации выбирало текст только для ru/uk/es, а en/pt-BR/vi/id/tr/pl видели русский.
// Тексты вынесены в чистый модуль без побочных импортов — тест проверяет все 9 языков без Firebase и AsyncStorage. Язык определяет вызывающий (resolveNotificationLang).
import { triLang, type Lang } from '../../constants/i18n';

export type ModerationResult = 'approved' | 'rejected' | 'revision_requested' | 'pack_removed' | string;

export function moderationTitle(result: ModerationResult, lang: Lang): string {
  switch (result) {
    case 'approved':
      return triLang(lang, {
        ru: 'Твой набор одобрен', uk: 'Твій набір схвалено', en: 'Your pack was approved', es: 'Tu pack fue aprobado',
        'pt-BR': 'Seu pacote foi aprovado', vi: 'Gói của bạn đã được duyệt', id: 'Paketmu disetujui', tr: 'Paketin onaylandı', pl: 'Twój pakiet został zatwierdzony',
      });
    case 'rejected':
      return triLang(lang, {
        ru: 'Твой набор отклонён', uk: 'Твій набір відхилено', en: 'Your pack was rejected', es: 'Tu pack fue rechazado',
        'pt-BR': 'Seu pacote foi recusado', vi: 'Gói của bạn bị từ chối', id: 'Paketmu ditolak', tr: 'Paketin reddedildi', pl: 'Twój pakiet został odrzucony',
      });
    case 'revision_requested':
      return triLang(lang, {
        ru: 'Нужна доработка', uk: 'Потрібні правки', en: 'Changes needed', es: 'Se necesitan cambios',
        'pt-BR': 'Precisa de ajustes', vi: 'Cần chỉnh sửa', id: 'Perlu revisi', tr: 'Düzeltme gerekiyor', pl: 'Potrzebne poprawki',
      });
    case 'pack_removed':
      return triLang(lang, {
        ru: 'Набор снят с продажи', uk: 'Набір знято з продажу', en: 'Pack taken off sale', es: 'Pack retirado de la venta',
        'pt-BR': 'Pacote retirado da venda', vi: 'Gói đã được gỡ khỏi cửa hàng', id: 'Paket diturunkan dari penjualan', tr: 'Paket satıştan kaldırıldı', pl: 'Pakiet wycofany ze sprzedaży',
      });
    default:
      return triLang(lang, {
        ru: 'Модерация', uk: 'Модерація', en: 'Moderation', es: 'Moderación',
        'pt-BR': 'Moderação', vi: 'Kiểm duyệt', id: 'Moderasi', tr: 'Moderasyon', pl: 'Moderacja',
      });
  }
}

// зачем (аудит по Библии, 2026-08-26): «Понятно» — реакция, а не действие (Правило 1: глагол в кнопке). Алерт модерации просто закрывается.
export function moderationOkLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar',
    'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });
}

/** Название набора для окна: язык человека → его вариант названия, затем остальные (в событии лежат только ru/uk/es). */
function pickPackTitle(ev: Record<string, unknown>, lang: Lang): string {
  const titleRu = String(ev.titleRu || '').trim();
  const titleUk = String(ev.titleUk || '').trim();
  const titleEs = String(ev.titleEs || '').trim();
  if (lang === 'es') return titleEs || titleUk || titleRu;
  if (lang === 'uk') return titleUk || titleRu || titleEs;
  return titleRu || titleUk || titleEs;
}

export function moderationBody(ev: Record<string, unknown>, lang: Lang): string {
  const result = String(ev.result || '');
  const packTitle = pickPackTitle(ev, lang);
  const lines: string[] = [];
  if (packTitle) lines.push(packTitle);
  const sid = String(ev.submissionId || '').trim();
  const pid = String(ev.packId || '').trim();
  if (sid) {
    const label = triLang(lang, {
      ru: 'Заявка', uk: 'Заявка', en: 'Request', es: 'Solicitud',
      'pt-BR': 'Solicitação', vi: 'Yêu cầu', id: 'Permintaan', tr: 'Başvuru', pl: 'Zgłoszenie',
    });
    lines.push(`${label}: ${sid}`);
  } else if (pid && !packTitle) {
    // Немає title в inbox і не вдалось підвантажити з Firestore — не показуємо сирий id.
    lines.push(triLang(lang, {
      ru: 'Открой «Карточки» — в списке своих наборов найдёшь этот.',
      uk: 'Відкрий «Картки» — у списку своїх наборів знайдеш цей.',
      en: 'Open Cards — you will find it in the list of your packs.',
      es: 'Abre Tarjetas: lo encontrarás en la lista de tus packs.',
      'pt-BR': 'Abra Cartões — você vai encontrá-lo na lista dos seus pacotes.',
      vi: 'Mở Thẻ — bạn sẽ thấy gói này trong danh sách gói của mình.',
      id: 'Buka Kartu — kamu akan menemukannya di daftar paketmu.',
      tr: 'Kartlar’ı aç — paketini kendi paketlerinin listesinde bulacaksın.',
      pl: 'Otwórz Fiszki — znajdziesz ten pakiet na liście swoich pakietów.',
    }));
  }
  const msg = ev.message != null ? String(ev.message).trim() : '';
  if (msg) {
    const label = triLang(lang, {
      ru: 'Комментарий', uk: 'Коментар', en: 'Comment', es: 'Comentario',
      'pt-BR': 'Comentário', vi: 'Nhận xét', id: 'Komentar', tr: 'Yorum', pl: 'Komentarz',
    });
    lines.push(`${label}:\n${msg}`);
  } else if (result === 'revision_requested') {
    lines.push(triLang(lang, {
      ru: 'Доработай набор и отправь снова.', uk: 'Онови набір і надішли знову.', en: 'Update the pack and send it again.', es: 'Actualiza el pack y envíalo de nuevo.',
      'pt-BR': 'Atualize o pacote e envie de novo.', vi: 'Hãy chỉnh sửa gói rồi gửi lại.', id: 'Perbarui paket lalu kirim lagi.', tr: 'Paketi güncelle ve yeniden gönder.', pl: 'Zaktualizuj pakiet i wyślij ponownie.',
    }));
  } else if (result === 'approved') {
    lines.push(triLang(lang, {
      ru: 'Без дополнительного комментария.', uk: 'Без додаткового коментаря.', en: 'No additional comment.', es: 'Sin comentario adicional.',
      'pt-BR': 'Sem comentário adicional.', vi: 'Không có nhận xét thêm.', id: 'Tidak ada komentar tambahan.', tr: 'Ek yorum yok.', pl: 'Bez dodatkowego komentarza.',
    }));
  } else if (result === 'rejected') {
    lines.push(triLang(lang, {
      ru: 'Без пояснения от модератора.', uk: 'Без пояснення від модератора.', en: 'No explanation from the moderator.', es: 'Sin explicación del moderador.',
      'pt-BR': 'Sem explicação do moderador.', vi: 'Người kiểm duyệt không nêu lý do.', id: 'Tanpa penjelasan dari moderator.', tr: 'Moderatörden açıklama yok.', pl: 'Bez wyjaśnienia od moderatora.',
    }));
  }
  return lines.join('\n\n');
}
