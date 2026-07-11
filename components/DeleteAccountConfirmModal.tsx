import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type PlannedInterfaceLang } from '../constants/i18n';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { deleteAccountAndWipe } from '../app/auth_provider';
import { enqueueThemedBlockingInfoAlert } from '../app/themed_blocking_alert_queue';
import { emitAppEvent } from '../app/events';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
};

type DeleteAccountCopy = {
  ru: string;
  uk: string;
  es: string;
} & Record<PlannedInterfaceLang, string>;

async function reloadAfterAccountDelete(): Promise<void> {
  try {
    const Updates = await import('expo-updates');
    if (typeof Updates.reloadAsync === 'function') {
      await Updates.reloadAsync();
      return;
    }
  } catch {
    // Fallback below covers dev clients where expo-updates reload is unavailable.
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DevSettings } = require('react-native');
    DevSettings?.reload?.();
  } catch {
    // If reload is unavailable, account_deleted still forces onboarding in-root.
  }
}

/**
 * Единое окно подтверждения удаления аккаунта (Настройки, FAQ и т.д.).
 */
function DeleteAccountConfirmModal({ visible, onRequestClose }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const isCompassTheme = false;
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
  const [footerWidth, setFooterWidth] = useState(0);
  const deleteInFlightRef = useRef(false);
  const normalizeConfirm = useCallback(
    (value: string) => value.trim().normalize('NFC').toLocaleUpperCase(String(lang)),
    [lang],
  );
  const deleteConfirmMatches = normalizeConfirm(deleteConfirmInput) === normalizeConfirm(deleteConfirmWord);

  useEffect(() => {
    if (visible && !deleting && deleteConfirmMatches) {
      Keyboard.dismiss();
    }
  }, [deleteConfirmMatches, deleting, visible]);

  useEffect(() => {
    if (visible) {
      setDeleteConfirmInput('');
      setDeleting(false);
      deleteInFlightRef.current = false;
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

  const handleConfirmDelete = useCallback(async () => {
    if (deleteInFlightRef.current || deleting || !deleteConfirmMatches) return;
    deleteInFlightRef.current = true;
    doHaptic();
    setDeleting(true);
    onRequestClose();
    emitAppEvent('account_deleted');
    void enqueueThemedBlockingInfoAlert(
      L({
        ru: 'Аккаунт удаляется',
        uk: 'Акаунт видаляється',
        es: 'Eliminando cuenta',
        'pt-BR': 'Excluindo conta',
        vi: 'Đang xóa tài khoản',
        id: 'Menghapus akun',
        tr: 'Hesap siliniyor',
        pl: 'Usuwanie konta',
      }),
      L({
        ru: 'Ты вышел из старого аккаунта. Серверная очистка продолжится в фоне.',
        uk: 'Ви вийшли зі старого акаунта. Серверне очищення продовжиться у фоні.',
        es: 'Saliste de la cuenta anterior. La limpieza del servidor continuará en segundo plano.',
        'pt-BR': 'Você saiu da conta antiga. A limpeza do servidor continuará em segundo plano.',
        vi: 'Bạn đã thoát tài khoản cũ. Việc dọn dữ liệu máy chủ sẽ tiếp tục trong nền.',
        id: 'Kamu telah keluar dari akun lama. Pembersihan server akan berlanjut di latar belakang.',
        tr: 'Eski hesaptan çıktın. Sunucu temizliği arka planda devam edecek.',
        pl: 'Wylogowano stare konto. Czyszczenie serwera będzie kontynuowane w tle.',
      }),
      'OK',
    );
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
            ru: 'Аккаунт не удалился на сервере. Проверь интернет и попробуй ещё раз.',
            uk: 'Не вдалося видалити акаунт на сервері. Перевірте інтернет і спробуйте ще раз.',
            es: 'No se pudo eliminar la cuenta en el servidor. Revisa Internet e inténtalo de nuevo.',
            'pt-BR': 'Não foi possível excluir a conta no servidor. Verifique a Internet e tente novamente.',
            vi: 'Không thể xóa tài khoản trên máy chủ. Hãy kiểm tra Internet và thử lại.',
            id: 'Akun tidak dapat dihapus di server. Periksa internet dan coba lagi.',
            tr: 'Hesap sunucuda silinemedi. İnterneti kontrol edip tekrar dene.',
            pl: 'Nie udało się usunąć konta na serwerze. Sprawdź internet i spróbuj ponownie.',
          }),
        );
        deleteInFlightRef.current = false;
        return;
      }
      void reloadAfterAccountDelete();
    } catch {
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
          ru: 'Удаление прервалось до подтверждения сервера. Проверь интернет и попробуй ещё раз.',
          uk: 'Видалення перервалося до підтвердження сервера. Перевірте інтернет і спробуйте ще раз.',
          es: 'La eliminación se interrumpió antes de la confirmación del servidor. Revisa Internet e inténtalo de nuevo.',
          'pt-BR': 'A exclusão foi interrompida antes da confirmação do servidor. Verifique a Internet e tente novamente.',
          vi: 'Quá trình xóa bị gián đoạn trước khi máy chủ xác nhận. Hãy kiểm tra Internet và thử lại.',
          id: 'Penghapusan terhenti sebelum konfirmasi server. Periksa internet dan coba lagi.',
          tr: 'Silme işlemi sunucu onayından önce kesildi. İnterneti kontrol edip tekrar dene.',
          pl: 'Usuwanie przerwało się przed potwierdzeniem serwera. Sprawdź internet i spróbuj ponownie.',
        }),
      );
      deleteInFlightRef.current = false;
    } finally {
      setDeleting(false);
    }
  }, [L, deleteConfirmMatches, deleting, onRequestClose, showInfoAlert]);

  const handleCancel = useCallback(() => {
    if (deleting) return;
    doHaptic();
    onRequestClose();
  }, [deleting, onRequestClose]);

  const handleFooterRelease = useCallback((event: GestureResponderEvent) => {
    const width = footerWidth || 1;
    if (event.nativeEvent.locationX >= width / 2) {
      void handleConfirmDelete();
      return;
    }
    handleCancel();
  }, [footerWidth, handleCancel, handleConfirmDelete]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {
      if (!deleting) onRequestClose();
    }}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ width: '88%', maxWidth: 420, maxHeight: '90%', backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderRadius: isCompassTheme ? 14 : 16, overflow: 'hidden', borderWidth: 0, borderColor: isCompassTheme ? COMPASS_RICH.copper : 'transparent', ...(isCompassTheme ? compassShadow(3) : null) }}>
          {isCompassTheme && <CompassDepthSurface radius={14} selected />}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 24 }}
          >
          <Text style={{ color: isCompassTheme ? COMPASS_RICH.peach : t.wrong, fontSize: f.h2, fontWeight: '700', marginBottom: 8 }}>
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
              ru: '📚 Твой путь по всем урокам',
              uk: '📚 Твій шлях по всіх уроках',
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
          <Text style={{ color: isCompassTheme ? COMPASS_RICH.peach : t.wrong, fontSize: f.caption, fontWeight: '600', marginTop: 10, marginBottom: 16, lineHeight: 20 }}>
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
              ru: 'После подтверждения приложение начнёт серверную очистку и сразу выведет тебя из старого аккаунта.',
              uk: 'Після підтвердження застосунок почне серверне очищення і одразу виведе вас зі старого акаунта.',
              es: 'Después de confirmar, la app iniciará la limpieza del servidor y saldrá de la cuenta anterior de inmediato.',
              'pt-BR': 'Depois de confirmar, o app iniciará a limpeza no servidor e sairá da conta antiga imediatamente.',
              vi: 'Sau khi xác nhận, ứng dụng sẽ bắt đầu dọn dữ liệu máy chủ và thoát tài khoản cũ ngay.',
              id: 'Setelah dikonfirmasi, aplikasi akan memulai pembersihan server dan langsung keluar dari akun lama.',
              tr: 'Onayladıktan sonra uygulama sunucu temizliğini başlatır ve eski hesaptan hemen çıkar.',
              pl: 'Po potwierdzeniu aplikacja rozpocznie czyszczenie serwera i od razu wyloguje stare konto.',
            })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.caption, marginBottom: 8 }}>
            {L({
              ru: 'Введи "УДАЛИТЬ" для подтверждения:',
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
            testID="delete-account-confirm-input"
            style={{
              backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : t.bgPrimary,
              color: t.textPrimary,
              fontSize: f.body,
              padding: 12,
              borderRadius: isCompassTheme ? 9 : 10,
              borderWidth: 0,
              borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
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
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
            maxLength={16}
            editable={!deleting}
          />
          {deleting && (
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 14, lineHeight: 19 }}>
              {L({
                ru: 'Удаляем аккаунт и выходим из старой сессии...',
                uk: 'Видаляємо акаунт і виходимо зі старої сесії...',
                es: 'Eliminando la cuenta y cerrando la sesión anterior...',
                'pt-BR': 'Excluindo a conta e saindo da sessão antiga...',
                vi: 'Đang xóa tài khoản và thoát phiên cũ...',
                id: 'Menghapus akun dan keluar dari sesi lama...',
                tr: 'Hesap siliniyor ve eski oturum kapatılıyor...',
                pl: 'Usuwamy konto i wylogowujemy starą sesję...',
              })}
            </Text>
          )}
          </ScrollView>
          <View
            onLayout={event => setFooterWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponderCapture={() => true}
            onStartShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderRelease={handleFooterRelease}
            style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border, backgroundColor: isCompassTheme ? COMPASS_RICH.charcoal : 'transparent' }}
          >
            <Pressable
              testID="delete-account-cancel"
              disabled={deleting}
              hitSlop={8}
              style={({ pressed }) => ({
                flex: 1,
                padding: 12,
                borderRadius: isCompassTheme ? 9 : 10,
                borderWidth: 0,
                borderColor: isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                alignItems: 'center',
                backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : 'transparent',
                overflow: 'hidden',
                ...(isCompassTheme ? compassShadow(1) : null),
                opacity: deleting ? 0.45 : pressed ? 0.75 : 1,
              })}
              onPress={handleCancel}
            >
              {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
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
            </Pressable>
            <Pressable
              testID="delete-account-confirm"
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={L({
                ru: 'Удалить',
                uk: 'Видалити',
                es: 'Eliminar',
                'pt-BR': 'Excluir',
                vi: 'Xóa',
                id: 'Hapus',
                tr: 'Sil',
                pl: 'Usuń',
              })}
              onStartShouldSetResponder={() => deleteConfirmMatches && !deleting}
              onResponderRelease={handleConfirmDelete}
              onTouchEnd={handleConfirmDelete}
              style={({ pressed }) => ({
                flex: 1,
                padding: 12,
                borderRadius: isCompassTheme ? 9 : 10,
                alignItems: 'center',
                backgroundColor: isCompassTheme
                  ? deleteConfirmMatches
                    ? COMPASS_RICH.copper
                    : COMPASS_RICH.charcoalSoft
                  : deleteConfirmMatches ? t.wrong : t.bgSurface,
                borderWidth: 0,
                borderColor: isCompassTheme ? (deleteConfirmMatches ? COMPASS_RICH.copper : COMPASS_RICH.hairlineQuiet) : 'transparent',
                overflow: 'hidden',
                ...(isCompassTheme ? compassShadow(deleteConfirmMatches ? 2 : 1) : null),
                opacity: deleting ? 0.78 : deleteConfirmMatches ? (pressed ? 0.82 : 1) : 0.35,
              })}
              onPress={handleConfirmDelete}
              onPressIn={handleConfirmDelete}
            >
              {isCompassTheme && <CompassDepthSurface radius={9} selected={deleteConfirmMatches} quiet={!deleteConfirmMatches} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700', opacity: deleting ? 0.72 : 1 }}>
                  {deleting
                    ? L({
                        ru: 'Удаляем...',
                        uk: 'Видаляємо...',
                        es: 'Eliminando...',
                        'pt-BR': 'Excluindo...',
                        vi: 'Đang xóa...',
                        id: 'Menghapus...',
                        tr: 'Siliniyor...',
                        pl: 'Usuwamy...',
                      })
                    : L({
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
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(DeleteAccountConfirmModal);
