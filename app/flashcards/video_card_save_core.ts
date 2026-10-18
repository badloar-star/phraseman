// video_card_save_core.ts — чистые части «Сохранить на карточке из видео» (без React и хранилища): ключ «та же фраза» и подписи кнопки на 9 языках.
import { triLang, type Lang } from '../../constants/i18n';

/** Ключ «та же фраза»: тот же, что у проверки дубля в addFlashcard (английский текст без регистра и пробелов по краям). */
export const videoCardSaveKey = (en: string): string => en.trim().toLowerCase();

/** Подписи кнопки-закладки на карточке (9 языков). */
export function videoCardSaveLabels(lang: Lang): { save: string; saved: string } {
  return triLang(lang, {
    ru: { save: 'Сохранить', saved: 'Сохранено' },
    uk: { save: 'Зберегти', saved: 'Збережено' },
    en: { save: 'Save', saved: 'Saved' },
    es: { save: 'Guardar', saved: 'Guardada' },
    'pt-BR': { save: 'Salvar', saved: 'Salvo' },
    vi: { save: 'Lưu', saved: 'Đã lưu' },
    id: { save: 'Simpan', saved: 'Tersimpan' },
    tr: { save: 'Kaydet', saved: 'Kaydedildi' },
    pl: { save: 'Zapisz', saved: 'Zapisano' },
  });
}

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __VideoCardSaveCoreRouteShim() {
  return null;
}
