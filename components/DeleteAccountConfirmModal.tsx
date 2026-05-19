import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type PlannedInterfaceLang } from '../constants/i18n';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { deleteAccountAndWipe } from '../app/auth_provider';
import { enqueueThemedBlockingInfoAlert } from '../app/themed_blocking_alert_queue';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
};

type DeleteAccountCopy = {
  ru: string;
  uk: string;
  es: string;
} & Record<PlannedInterfaceLang, string>;

/**
 * Единое окно подтверждения удаления аккаунта (Настройки, FAQ и т.д.).
 */
export default function DeleteAccountConfirmModal({ visible, onRequestClose }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = useCallback((copy: DeleteAccountCopy) => triLang(lang, {
    ru: copy.ru,
    uk: copy.uk,
    es: copy.es,
    'pt-BR': copy['pt-BR'],
    vi: copy.vi,
    id: copy.id,
    tr: copy.tr,
    pl: copy.pl,
  }), [lang]);
  const deleteConfirmWord = L({
    ru: 'УДАЛИТЬ',
    uk: 'ВИДАЛИТИ',
    es: 'ELIMINAR',
    'pt-BR': 'EXCLUIR',
    vi: 'XÓA',
    id: 'HAPUS',
    tr: 'SİL',
    pl: 'USUŃ',
  });
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      setDeleteConfirmInput('');
      setDeleting(false);
    }
  }, [visible]);

  const showInfoAlert = useCallback(
    (title: string, message: string) => {
      void enqueueThemedBlockingInfoAlert(title || L({
        ru: 'Сообщение',
        uk: 'Повідомлення',
        es: 'Message',
        'pt-BR': 'Mensagem',
        vi: 'Thông báo',
        id: 'Pesan',
        tr: 'Mesaj',
        pl: 'Wiadomość',
      }), message, 'OK');
    },
    [L],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {
      if (!deleting) onRequestClose();
    }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ width: '85%', backgroundColor: t.bgCard, borderRadius: 16, padding: 24 }}>
          <Text style={{ color: t.wrong, fontSize: f.h2, fontWeight: '700', marginBottom: 8 }}>
            {L({
              ru: 'Удалить аккаунт?',
              uk: 'Видалити акаунт?',
              es: '¿Eliminar cuenta?',
              'pt-BR': 'Excluir conta?',
              vi: 'Xóa tài khoản?',
              id: 'Hapus akun?',
              tr: 'Hesabı sil?',
              pl: 'Usunąć konto?',
            })}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginBottom: 12, lineHeight: 20 }}>
            {L({
              ru: 'Активные данные аккаунта будут удалены или обезличены:',
              uk: 'Активні дані акаунта буде видалено або знеособлено:',
              es: 'Los datos activos de la cuenta se eliminarán o se desidentificarán:',
              'pt-BR': 'Os dados ativos da conta serão excluídos ou anonimizados:',
              vi: 'Dữ liệu tài khoản đang hoạt động sẽ được xóa hoặc ẩn danh hóa:',
              id: 'Data aktif akun akan dihapus atau dianonimkan:',
              tr: 'Aktif hesap verileri silinecek veya anonim hale getirilecek:',
              pl: 'Aktywne dane konta zostaną usunięte lub zanonimizowane:',
            })}
          </Text>
          {[
            L({
              ru: '📊 Весь XP и уровень',
              uk: '📊 Весь XP та рівень',
              es: '📊 Todo el XP y el nivel',
              'pt-BR': '📊 Todo o XP e nível',
              vi: '📊 Toàn bộ XP và cấp độ',
              id: '📊 Semua XP dan level',
              tr: '📊 Tüm XP ve seviye',
              pl: '📊 Cały XP i poziom',
            }),
            L({
              ru: '🔥 Цепочка и серия',
              uk: '🔥 Серія днів поспіль',
              es: '🔥 Racha y días seguidos',
              'pt-BR': '🔥 Sequência e dias seguidos',
              vi: '🔥 Chuỗi ngày và số ngày liên tiếp',
              id: '🔥 Rangkaian dan hari berturut-turut',
              tr: '🔥 Seri ve aralıksız günler',
              pl: '🔥 Passa i dni z rzędu',
            }),
            L({
              ru: '📚 Прогресс по всем урокам',
              uk: '📚 Прогрес по всіх уроках',
              es: '📚 Progreso en todas las lecciones',
              'pt-BR': '📚 Progresso em todas as aulas',
              vi: '📚 Tiến độ trong tất cả bài học',
              id: '📚 Progres di semua pelajaran',
              tr: '📚 Tüm derslerde ilerleme',
              pl: '📚 Postęp we wszystkich lekcjach',
            }),
            L({
              ru: '🃏 Сохранённые карточки',
              uk: '🃏 Збережені картки',
              es: '🃏 Tarjetas guardadas',
              'pt-BR': '🃏 Cartões salvos',
              vi: '🃏 Thẻ đã lưu',
              id: '🃏 Kartu tersimpan',
              tr: '🃏 Kaydedilen kartlar',
              pl: '🃏 Zapisane karty',
            }),
            L({
              ru: '🏆 Все достижения и медали',
              uk: '🏆 Всі досягнення та медалі',
              es: '🏆 Logros y medallas',
              'pt-BR': '🏆 Todas as conquistas e medalhas',
              vi: '🏆 Tất cả thành tích và huy chương',
              id: '🏆 Semua pencapaian dan medali',
              tr: '🏆 Tüm başarılar ve madalyalar',
              pl: '🏆 Wszystkie osiągnięcia i medale',
            }),
            L({
              ru: '🌍 Позиция в лиге и клубе',
              uk: '🌍 Позиція у лізі та клубі',
              es: '🌍 Puesto en la liga y en el club',
              'pt-BR': '🌍 Posição na liga e no clube',
              vi: '🌍 Vị trí trong giải đấu và câu lạc bộ',
              id: '🌍 Posisi di liga dan klub',
              tr: '🌍 Lig ve kulüpteki konum',
              pl: '🌍 Pozycja w lidze i klubie',
            }),
            L({
              ru: '⚙️ Все настройки',
              uk: '⚙️ Всі налаштування',
              es: '⚙️ Todos los ajustes',
              'pt-BR': '⚙️ Todas as configurações',
              vi: '⚙️ Tất cả cài đặt',
              id: '⚙️ Semua pengaturan',
              tr: '⚙️ Tüm ayarlar',
              pl: '⚙️ Wszystkie ustawienia',
            }),
          ].map((item, i) => (
            <Text key={i} style={{ color: t.textSecond, fontSize: f.caption, marginBottom: 4, lineHeight: 20 }}>
              {item}
            </Text>
          ))}
          <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '600', marginTop: 10, marginBottom: 16, lineHeight: 20 }}>
            {L({
              ru: '⚠️ Удаление аккаунта не отменяет подписку автоматически. Подписку нужно отменить в App Store или Google Play.',
              uk: '⚠️ Видалення акаунта не скасовує підписку автоматично. Підписку потрібно скасувати в App Store або Google Play.',
              es: '⚠️ Eliminar la cuenta no cancela la suscripción automáticamente. Debes cancelarla en App Store o Google Play.',
              'pt-BR': '⚠️ Excluir a conta não cancela a assinatura automaticamente. Você precisa cancelá-la na App Store ou no Google Play.',
              vi: '⚠️ Xóa tài khoản không tự động hủy gói đăng ký. Bạn cần hủy gói trong App Store hoặc Google Play.',
              id: '⚠️ Menghapus akun tidak otomatis membatalkan langganan. Kamu harus membatalkannya di App Store atau Google Play.',
              tr: '⚠️ Hesabı silmek aboneliği otomatik olarak iptal etmez. Aboneliği App Store veya Google Play üzerinden iptal etmen gerekir.',
              pl: '⚠️ Usunięcie konta nie anuluje automatycznie subskrypcji. Subskrypcję trzeba anulować w App Store albo Google Play.',
            })}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 12, lineHeight: 19 }}>
            {L({
              ru: 'После подтверждения приложение дождётся ответа сервера и только потом очистит данные на устройстве.',
              uk: 'Після підтвердження застосунок дочекається відповіді сервера і лише потім очистить дані на пристрої.',
              es: 'Después de confirmar, la app esperará la respuesta del servidor antes de borrar los datos del dispositivo.',
              'pt-BR': 'Depois de confirmar, o app aguardará a resposta do servidor antes de apagar os dados do dispositivo.',
              vi: 'Sau khi xác nhận, ứng dụng sẽ chờ phản hồi từ máy chủ rồi mới xóa dữ liệu trên thiết bị.',
              id: 'Setelah dikonfirmasi, aplikasi akan menunggu respons server sebelum menghapus data di perangkat.',
              tr: 'Onayladıktan sonra uygulama, cihazdaki verileri temizlemeden önce sunucu yanıtını bekleyecek.',
              pl: 'Po potwierdzeniu aplikacja poczeka na odpowiedź serwera i dopiero potem wyczyści dane na urządzeniu.',
            })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.caption, marginBottom: 8 }}>
            {L({
              ru: 'Введите "УДАЛИТЬ" для подтверждения:',
              uk: 'Введіть "ВИДАЛИТИ" для підтвердження:',
              es: 'Escribe «ELIMINAR» para confirmar:',
              'pt-BR': 'Digite "EXCLUIR" para confirmar:',
              vi: 'Nhập "XÓA" để xác nhận:',
              id: 'Ketik "HAPUS" untuk mengonfirmasi:',
              tr: '"SİL" yazarak onayla:',
              pl: 'Wpisz "USUŃ", aby potwierdzić:',
            })}
          </Text>
          <TextInput
            style={{
              backgroundColor: t.bgPrimary,
              color: t.textPrimary,
              fontSize: f.body,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: t.border,
              marginBottom: 20,
              outlineStyle: 'none' as any,
            }}
            value={deleteConfirmInput}
            onChangeText={setDeleteConfirmInput}
            placeholder={deleteConfirmWord}
            placeholderTextColor={t.textGhost}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={false}
            maxLength={12}
            editable={!deleting}
          />
          {deleting && (
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 14, lineHeight: 19 }}>
              {L({
                ru: 'Удаляем аккаунт и очищаем облачные данные. Это может занять несколько минут.',
                uk: 'Видаляємо акаунт і очищаємо хмарні дані. Це може зайняти кілька хвилин.',
                es: 'Eliminando la cuenta y limpiando los datos en la nube. Puede tardar unos minutos.',
                'pt-BR': 'Excluindo a conta e limpando os dados na nuvem. Isso pode levar alguns minutos.',
                vi: 'Đang xóa tài khoản và dọn dữ liệu đám mây. Quá trình này có thể mất vài phút.',
                id: 'Menghapus akun dan membersihkan data cloud. Ini mungkin memerlukan beberapa menit.',
                tr: 'Hesap siliniyor ve bulut verileri temizleniyor. Bu birkaç dakika sürebilir.',
                pl: 'Usuwamy konto i czyścimy dane w chmurze. Może to potrwać kilka minut.',
              })}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              disabled={deleting}
              activeOpacity={0.7}
              style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center', opacity: deleting ? 0.45 : 1 }}
              onPress={() => {
                doHaptic();
                onRequestClose();
              }}
            >
              <Text style={{ color: t.textMuted, fontSize: f.body }}>{L({
                ru: 'Отмена',
                uk: 'Скасувати',
                es: 'Cancelar',
                'pt-BR': 'Cancelar',
                vi: 'Hủy',
                id: 'Batal',
                tr: 'Vazgeç',
                pl: 'Anuluj',
              })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={deleting || deleteConfirmInput !== deleteConfirmWord}
              activeOpacity={0.7}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: deleteConfirmInput === deleteConfirmWord ? t.wrong : t.bgSurface,
                opacity: deleting ? 0.78 : deleteConfirmInput === deleteConfirmWord ? 1 : 0.35,
              }}
              onPress={async () => {
                if (deleting) return;
                doHaptic();
                setDeleting(true);
                try {
                  const res = await deleteAccountAndWipe();
                  if (!res.ok) {
                    showInfoAlert(
                      L({
                        ru: 'Ошибка',
                        uk: 'Помилка',
                        es: 'Error',
                        'pt-BR': 'Erro',
                        vi: 'Lỗi',
                        id: 'Kesalahan',
                        tr: 'Hata',
                        pl: 'Błąd',
                      }),
                      L({
                        ru: 'Не удалось удалить аккаунт на сервере. Проверьте интернет и попробуйте ещё раз.',
                        uk: 'Не вдалося видалити акаунт на сервері. Перевірте інтернет і спробуйте ще раз.',
                        es: 'No se pudo eliminar la cuenta en el servidor. Revisa Internet e inténtalo de nuevo.',
                        'pt-BR': 'Não foi possível excluir a conta no servidor. Verifique a Internet e tente novamente.',
                        vi: 'Không thể xóa tài khoản trên máy chủ. Hãy kiểm tra Internet và thử lại.',
                        id: 'Akun tidak dapat dihapus di server. Periksa internet dan coba lagi.',
                        tr: 'Hesap sunucuda silinemedi. İnterneti kontrol edip tekrar dene.',
                        pl: 'Nie udało się usunąć konta na serwerze. Sprawdź internet i spróbuj ponownie.',
                      }),
                    );
                    return;
                  }
                  onRequestClose();
                  await enqueueThemedBlockingInfoAlert(
                    L({
                      ru: 'Аккаунт удалён',
                      uk: 'Акаунт видалено',
                      es: 'Cuenta eliminada',
                      'pt-BR': 'Conta excluída',
                      vi: 'Tài khoản đã bị xóa',
                      id: 'Akun dihapus',
                      tr: 'Hesap silindi',
                      pl: 'Konto usunięte',
                    }),
                    L({
                      ru: 'Активные данные аккаунта удалены или обезличены. Некоторые записи могут сохраняться, если это требуется для платежей, безопасности или закона.',
                      uk: 'Активні дані акаунта видалено або знеособлено. Деякі записи можуть зберігатися, якщо це потрібно для платежів, безпеки або закону.',
                      es: 'Los datos activos de la cuenta se eliminaron o desidentificaron. Algunos registros pueden conservarse por pagos, seguridad o requisitos legales.',
                      'pt-BR': 'Os dados ativos da conta foram excluídos ou anonimizados. Alguns registros podem ser mantidos por pagamentos, segurança ou exigências legais.',
                      vi: 'Dữ liệu tài khoản đang hoạt động đã được xóa hoặc ẩn danh hóa. Một số bản ghi có thể được giữ lại vì thanh toán, bảo mật hoặc yêu cầu pháp lý.',
                      id: 'Data aktif akun telah dihapus atau dianonimkan. Beberapa catatan dapat tetap disimpan untuk pembayaran, keamanan, atau persyaratan hukum.',
                      tr: 'Aktif hesap verileri silindi veya anonim hale getirildi. Bazı kayıtlar ödeme, güvenlik veya yasal gereklilikler için saklanabilir.',
                      pl: 'Aktywne dane konta zostały usunięte lub zanonimizowane. Niektóre zapisy mogą zostać zachowane na potrzeby płatności, bezpieczeństwa lub wymogów prawnych.',
                    }),
                    'OK',
                  );
                  DeviceEventEmitter.emit('account_deleted');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {deleting && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700', opacity: deleting ? 0.72 : 1 }}>
                  {L({
                    ru: 'Удалить',
                    uk: 'Видалити',
                    es: 'Eliminar',
                    'pt-BR': 'Excluir',
                    vi: 'Xóa',
                    id: 'Hapus',
                    tr: 'Sil',
                    pl: 'Usuń',
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
