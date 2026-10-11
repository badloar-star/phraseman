/**
 * Честные тексты отказа «+» (добавить набор себе) и «Не показывать мне» в каталоге наборов.
 *
 * зачем (баг владельца 11.10, коммит 8e8fe95a8; ревью 11.10, п.1 и п.9): добавление набора — ЛОКАЛЬНАЯ запись,
 * сеть не нужна. Текст «Проверь связь» отправлял человека чинить интернет зря. Отказы бывают двух видов:
 *   • `unavailable` — этот набор добавить нельзя (тот же текст, что у CommunityPackSocialBar);
 *   • `throw:*` — не удалась запись на устройство: честно говорим про телефон, без слова «связь».
 */
import { actionToastTri, type AppEventMap } from '../events';

export type PackAddFailure = 'unavailable' | `throw:${string}` | string;

export function packAddFailureToast(result: PackAddFailure): AppEventMap['action_toast'] {
  if (result === 'unavailable') {
    return actionToastTri('error', {
      ru: 'Этот набор пока нельзя добавить себе.',
      uk: 'Цей набір поки не можна додати собі.',
      en: "This pack can't be added yet.",
      es: 'Este pack todavía no se puede añadir.',
      'pt-BR': 'Este pacote ainda não pode ser adicionado.',
      vi: 'Chưa thể thêm bộ thẻ này.',
      id: 'Paket ini belum bisa ditambahkan.',
      tr: 'Bu paket henüz eklenemiyor.',
      pl: 'Tego zestawu nie można jeszcze dodać.',
    });
  }
  return actionToastTri('error', {
    ru: 'Не получилось сохранить набор на телефоне. Попробуй ещё раз.',
    uk: 'Не вдалося зберегти набір на телефоні. Спробуй ще раз.',
    en: "Couldn't save the pack on your phone. Try again.",
    es: 'No se pudo guardar el pack en el teléfono. Inténtalo de nuevo.',
    'pt-BR': 'Não foi possível salvar o pacote no celular. Tente de novo.',
    vi: 'Không lưu được bộ thẻ trên điện thoại. Hãy thử lại.',
    id: 'Gagal menyimpan paket di ponsel. Coba lagi.',
    tr: 'Paket telefona kaydedilemedi. Tekrar dene.',
    pl: 'Nie udało się zapisać zestawu w telefonie. Spróbuj ponownie.',
  });
}

/** «Не показывать мне» не записалось на устройство — набор вернулся в список, говорим об этом прямо. */
export function packHideFailureToast(): AppEventMap['action_toast'] {
  return actionToastTri('error', {
    ru: 'Не получилось скрыть набор. Попробуй ещё раз.',
    uk: 'Не вдалося приховати набір. Спробуй ще раз.',
    en: "Couldn't hide the pack. Try again.",
    es: 'No se pudo ocultar el pack. Inténtalo de nuevo.',
    'pt-BR': 'Não foi possível ocultar o pacote. Tente de novo.',
    vi: 'Không ẩn được bộ thẻ. Hãy thử lại.',
    id: 'Gagal menyembunyikan paket. Coba lagi.',
    tr: 'Paket gizlenemedi. Tekrar dene.',
    pl: 'Nie udało się ukryć zestawu. Spróbuj ponownie.',
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
