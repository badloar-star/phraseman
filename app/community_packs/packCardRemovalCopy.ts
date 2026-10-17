/**
 * Тексты отказа при удалении карточки из ОПУБЛИКОВАННОГО набора — на 9 языках.
 *
 * зачем (координатор 12.10, перевод экранов первого выпуска): экран набора показывал эти отказы по-русски на любом языке
 * (одна и та же русская строка подставлялась во все девять полей). Теперь причина отказа переводится вместе с языком интерфейса.
 * Порядок кортежа: ru, uk, en, es, pt-BR, vi, id, tr, pl. {min} — COMMUNITY_PACK_CARD_COUNT_MIN, число не пишем словами.
 */
import type { Lang } from '../../constants/i18n';
import { COMMUNITY_PACK_CARD_COUNT_MIN } from './schema';

type Tuple9 = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const REFUSALS: Readonly<Record<string, Tuple9>> = {
  card_count: [
    'В наборе должно остаться минимум {min} карточек.', 'У наборі має лишитися щонайменше {min} карток.',
    'At least {min} cards must stay in the pack.', 'En el pack deben quedar al menos {min} tarjetas.',
    'No pacote devem ficar pelo menos {min} cartões.', 'Bộ thẻ phải còn ít nhất {min} thẻ.',
    'Paket harus menyisakan minimal {min} kartu.', 'Pakette en az {min} kart kalmalı.', 'W zestawie musi zostać co najmniej {min} kart.',
  ],
  update_pending: [
    'Набор на проверке — удалить сейчас нельзя.', 'Набір на перевірці — зараз видалити не можна.',
    'The pack is under review — you can’t delete right now.', 'El pack está en revisión: ahora no se puede eliminar.',
    'O pacote está em revisão — não dá para excluir agora.', 'Bộ thẻ đang được duyệt — hiện chưa thể xóa.',
    'Paket sedang ditinjau — saat ini tidak bisa dihapus.', 'Paket inceleniyor — şu an silinemez.', 'Zestaw jest w trakcie sprawdzania — teraz nie można usunąć.',
  ],
  pack_removed: [
    'Набор уже удалён.', 'Набір уже видалено.', 'The pack is already deleted.', 'El pack ya se eliminó.', 'O pacote já foi excluído.',
    'Bộ thẻ đã bị xóa.', 'Paket sudah dihapus.', 'Paket zaten silinmiş.', 'Zestaw został już usunięty.',
  ],
  not_author: [
    'Удалять карточки может только автор.', 'Видаляти картки може лише автор.', 'Only the author can delete cards.',
    'Solo el autor puede eliminar tarjetas.', 'Só o autor pode excluir cartões.', 'Chỉ tác giả mới xóa được thẻ.',
    'Hanya penulis yang bisa menghapus kartu.', 'Kartları yalnızca yazar silebilir.', 'Karty może usuwać tylko autor.',
  ],
  pack_not_found: [
    'Набор не найден.', 'Набір не знайдено.', 'Pack not found.', 'No se encontró el pack.', 'Pacote não encontrado.',
    'Không tìm thấy bộ thẻ.', 'Paket tidak ditemukan.', 'Paket bulunamadı.', 'Nie znaleziono zestawu.',
  ],
  not_published: [
    'Набор не опубликован.', 'Набір не опубліковано.', 'The pack isn’t published.', 'El pack no está publicado.', 'O pacote não está publicado.',
    'Bộ thẻ chưa được xuất bản.', 'Paket belum dipublikasikan.', 'Paket yayınlanmadı.', 'Zestaw nie jest opublikowany.',
  ],
  network: [
    'Нет связи — карточку не удалось удалить.', 'Немає зв’язку — картку не вдалося видалити.',
    'No connection — the card couldn’t be deleted.', 'Sin conexión: no se pudo eliminar la tarjeta.',
    'Sem conexão — não foi possível excluir o cartão.', 'Không có kết nối — không xóa được thẻ.',
    'Tidak ada koneksi — kartu tidak bisa dihapus.', 'Bağlantı yok — kart silinemedi.', 'Brak połączenia — nie udało się usunąć karty.',
  ],
};

const FALLBACK: Tuple9 = [
  'Не удалось удалить карточку.', 'Не вдалося видалити картку.', 'Couldn’t delete the card.', 'No se pudo eliminar la tarjeta.',
  'Não foi possível excluir o cartão.', 'Không xóa được thẻ.', 'Kartu gagal dihapus.', 'Kart silinemedi.', 'Nie udało się usunąć karty.',
];

export function packCardRemovalRefusalText(reason: string, lang: Lang | string): string {
  const index = LANG_INDEX[lang] ?? LANG_INDEX.en!;
  const tuple = REFUSALS[reason] ?? FALLBACK;
  return tuple[index]!.replace('{min}', String(COMMUNITY_PACK_CARD_COUNT_MIN));
}
