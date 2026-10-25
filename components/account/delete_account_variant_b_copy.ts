// delete_account_variant_b_copy.ts — тексты окон удаления по макету docs/design/v2-app/account-delete-variant-b.html.
// зачем (владелец 25.10 «Да, так»; строки — 10 · ПЕРЕВОДЧИК 8cd112000): дословно по макету, на «ты», глагол как в «Удалить аккаунт?».
// Строки с жирным — тремя частями «до | жирное | после»; склейка: до + пробел + жирное + после (у tr after начинается с глагола).
import { triLang, type Lang } from '../../constants/i18n';

type Copy = Readonly<Record<'ru' | 'uk' | 'en' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl', string>>;

const pick = (lang: Lang, copy: Copy): string => triLang(lang, copy);

export type DeleteVariantBCopy = Readonly<{
  w1BodyBefore: string;
  w1BodyBold: string;
  w1BodyAfter: string;
  w1Subscription: string;
  w1Cta: string;
  w1DeleteNowLink: string;
  w2Title: string;
  w2BodyBefore: string;
  w2BodyBold: string;
  w2BodyAfter: string;
  w2Cta: string;
  w2Back: string;
  handoffFailed: string;
}>;

export function deleteAccountVariantBCopy(lang: Lang): DeleteVariantBCopy {
  return Object.freeze({
    w1BodyBefore: pick(lang, { ru: 'Аккаунт и данные удалятся', uk: 'Акаунт і дані видаляться', en: 'Your account and data will be deleted', es: 'Tu cuenta y tus datos se eliminarán', 'pt-BR': 'Sua conta e seus dados serão excluídos', vi: 'Tài khoản và dữ liệu sẽ bị xóa', id: 'Akun dan data akan dihapus', tr: 'Hesabın ve verilerin', pl: 'Konto i dane zostaną usunięte' }),
    w1BodyBold: pick(lang, { ru: 'через 14 дней', uk: 'через 14 днів', en: 'in 14 days', es: 'en 14 días', 'pt-BR': 'em 14 dias', vi: 'sau 14 ngày', id: 'dalam 14 hari', tr: '14 gün sonra', pl: 'za 14 dni' }),
    w1BodyAfter: pick(lang, { ru: '. Передумаешь — войди снова тем же способом, и всё вернётся.', uk: '. Передумаєш — увійди знову тим самим способом, і все повернеться.', en: '. Change your mind? Sign in again the same way and everything comes back.', es: '. Si cambias de idea, vuelve a entrar del mismo modo y todo volverá.', 'pt-BR': '. Se mudar de ideia, entre de novo do mesmo jeito e tudo volta.', vi: '. Đổi ý thì đăng nhập lại bằng cách cũ, mọi thứ sẽ trở lại.', id: '. Berubah pikiran? Masuk lagi dengan cara yang sama, dan semuanya kembali.', tr: ' silinecek. Fikrini değiştirirsen aynı yolla tekrar giriş yap, her şey geri gelir.', pl: '. Jeśli zmienisz zdanie, zaloguj się ponownie w ten sam sposób, a wszystko wróci.' }),
    w1Subscription: pick(lang, { ru: 'Подписка в App Store или Google Play сама не отменится.', uk: 'Підписка в App Store чи Google Play сама не скасується.', en: 'Your App Store or Google Play subscription won’t cancel on its own.', es: 'La suscripción de App Store o Google Play no se cancelará sola.', 'pt-BR': 'A assinatura na App Store ou no Google Play não será cancelada sozinha.', vi: 'Gói đăng ký trên App Store hoặc Google Play sẽ không tự hủy.', id: 'Langganan di App Store atau Google Play tidak akan batal sendiri.', tr: 'App Store veya Google Play aboneliğin kendiliğinden iptal olmaz.', pl: 'Subskrypcja w App Store lub Google Play nie anuluje się sama.' }),
    w1Cta: pick(lang, { ru: 'Удалить через 14 дней', uk: 'Видалити через 14 днів', en: 'Delete in 14 days', es: 'Eliminar en 14 días', 'pt-BR': 'Excluir em 14 dias', vi: 'Xóa sau 14 ngày', id: 'Hapus dalam 14 hari', tr: '14 gün sonra sil', pl: 'Usuń za 14 dni' }),
    w1DeleteNowLink: pick(lang, { ru: 'Удалить навсегда сейчас', uk: 'Видалити назавжди зараз', en: 'Delete permanently now', es: 'Eliminar para siempre ahora', 'pt-BR': 'Excluir para sempre agora', vi: 'Xóa vĩnh viễn ngay', id: 'Hapus permanen sekarang', tr: 'Şimdi kalıcı olarak sil', pl: 'Usuń na zawsze teraz' }),
    w2Title: pick(lang, { ru: 'Удалить навсегда?', uk: 'Видалити назавжди?', en: 'Delete permanently?', es: '¿Eliminar para siempre?', 'pt-BR': 'Excluir para sempre?', vi: 'Xóa vĩnh viễn?', id: 'Hapus permanen?', tr: 'Kalıcı olarak silinsin mi?', pl: 'Usunąć na zawsze?' }),
    w2BodyBefore: pick(lang, { ru: 'Аккаунт, прогресс, фразы и серия удалятся', uk: 'Акаунт, прогрес, вислови й серія видаляться', en: 'Your account, progress, phrases and streak will be deleted', es: 'La cuenta, el progreso, las frases y la racha se eliminarán', 'pt-BR': 'A conta, o progresso, as frases e a sequência serão excluídos', vi: 'Tài khoản, tiến độ, câu và chuỗi sẽ bị xóa', id: 'Akun, progres, frasa, dan rangkaian akan dihapus', tr: 'Hesap, ilerleme, ifadeler ve seri', pl: 'Konto, postępy, zwroty i seria zostaną usunięte' }),
    w2BodyBold: pick(lang, { ru: 'сразу', uk: 'одразу', en: 'right away', es: 'al instante', 'pt-BR': 'na hora', vi: 'ngay lập tức', id: 'seketika', tr: 'hemen', pl: 'od razu' }),
    w2BodyAfter: pick(lang, { ru: '. Вернуть их будет нельзя.', uk: '. Повернути їх буде неможливо.', en: '. You won’t be able to get them back.', es: '. No podrás recuperarlos.', 'pt-BR': '. Não será possível recuperá-los.', vi: '. Không thể khôi phục lại.', id: '. Semuanya tidak bisa dikembalikan.', tr: ' silinecek. Geri getirmek mümkün olmayacak.', pl: '. Nie da się ich przywrócić.' }),
    w2Cta: pick(lang, { ru: 'Удалить навсегда', uk: 'Видалити назавжди', en: 'Delete permanently', es: 'Eliminar para siempre', 'pt-BR': 'Excluir para sempre', vi: 'Xóa vĩnh viễn', id: 'Hapus permanen', tr: 'Kalıcı olarak sil', pl: 'Usuń na zawsze' }),
    w2Back: pick(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    // зачем (координатор 25.10): строка в окне после 3 тихих повторов — тепло и честно, без шуток. ru/en — черновик координатора,
    // остальные 7 — черновик 5 · ВХОД, на вычитку Переводчику.
    handoffFailed: pick(lang, {
      ru: 'Не получилось. Проверь интернет и нажми ещё раз.',
      uk: 'Не вийшло. Перевір інтернет і натисни ще раз.',
      en: "That didn't work. Check your connection and tap again.",
      es: 'No salió. Revisa tu conexión y vuelve a tocar.',
      'pt-BR': 'Não deu certo. Verifique a conexão e toque de novo.',
      vi: 'Chưa được. Hãy kiểm tra kết nối rồi nhấn lại.',
      id: 'Belum berhasil. Periksa koneksi lalu ketuk lagi.',
      tr: 'Olmadı. Bağlantını kontrol et ve tekrar dokun.',
      pl: 'Nie udało się. Sprawdź połączenie i naciśnij jeszcze raz.',
    }),
  });
}
