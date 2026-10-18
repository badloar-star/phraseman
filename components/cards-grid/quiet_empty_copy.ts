// quiet_empty_copy.ts — тексты спокойного пустого состояния вместо экрана-ошибки (правило владельца «экранов-ошибок нигде»).
//
// зачем (координатор 18.10 08:00): без слов «ошибка / недоступно / не удалось / нет сети»; заголовок — существующее «Пока пусто» (то же, что у пустого списка «Сохранённых»),
// подпись — мягкая строка «Обновим, как появится связь». Строка новая: черновик на 9 языках, проверка — Переводчик.
import { triLang, type Lang } from '../../constants/i18n';

export function quietEmptyTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Пока пусто', uk: 'Поки порожньо', en: 'Nothing here yet', es: 'Todavía no hay nada',
    'pt-BR': 'Ainda está vazio', vi: 'Chưa có gì', id: 'Masih kosong', tr: 'Henüz boş', pl: 'Na razie pusto',
  });
}

export function quietEmptyDetail(lang: Lang): string {
  return triLang(lang, {
    ru: 'Обновим, как появится связь', uk: 'Оновимо, щойно з’явиться зв’язок', en: "We'll refresh as soon as you're back online", es: 'Actualizaremos en cuanto vuelva la conexión',
    'pt-BR': 'Atualizaremos assim que a conexão voltar', vi: 'Chúng tôi sẽ cập nhật khi có mạng trở lại', id: 'Akan kami perbarui saat koneksi kembali', tr: 'Bağlantı gelince güncelleriz', pl: 'Odświeżymy, gdy wróci połączenie',
  });
}
