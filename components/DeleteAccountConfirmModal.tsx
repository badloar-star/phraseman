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
  type GestureResponderEvent,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type PlannedInterfaceLang } from '../constants/i18n';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { beginAccountDeletion } from '../app/auth_provider';
import { enqueueThemedBlockingInfoAlert } from '../app/themed_blocking_alert_queue';
import { router } from 'expo-router';
import { emitAppEvent } from '../app/events';
import { markAccountDeletedNoticePending } from '../app/account_deleted_notice';
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

/**
 * Зазор на докрытие нативной модалки перед показом следующей (см. showInfoAlert).
 * Нужен только на путях ОШИБКИ: там следом презентуется алерт, и два present
 * подряд на iOS ломают стек презентаций.
 */
const ACCOUNT_DELETE_DISMISS_SETTLE_MS = 360;

/**
 * Единое окно подтверждения удаления аккаунта (Настройки, FAQ и т.д.).
 */
function DeleteAccountConfirmModal({ visible, onRequestClose }: Props) {
  const { theme: t, f } = useTheme();
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
  // зачем: toLocaleUpperCase(String(lang)) бросал RangeError, когда lang не был
  // валидным языковым тегом (undefined/null из контекста до гидрации, служебное
  // значение). Исключение летело прямо из рендера модалки — экран настроек
  // вставал намертво: шторку свернуть можно, а раздел уже мёртв, и ввод слова
  // «УДАЛИТЬ» ни к чему не приводил. Локаль тут нужна только ради турецкого i,
  // поэтому берём её best-effort и при любой ошибке падаем на обычный
  // toUpperCase — сравнение подтверждения важнее локальных тонкостей регистра.
  const normalizeConfirm = useCallback(
    (value: string) => {
      const base = value.trim().normalize('NFC');
      try {
        return typeof lang === 'string' && lang.length > 0
          ? base.toLocaleUpperCase(lang)
          : base.toUpperCase();
      } catch {
        return base.toUpperCase();
      }
    },
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

  const enqueueInfoAlert = useCallback(
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

  // зачем: алерт об ошибке — тоже нативный <Modal> (ThemedChoiceModal). Показывать его,
  // пока окно удаления ещё открыто, нельзя: два present подряд на iOS ломают стек
  // презентаций (тот же фриз, что и на успешном пути) — алерт оказывается под окном и
  // не виден, а тапы перестают работать. Сначала закрываем окно, ждём кадр докрытия,
  // и только потом ставим алерт в очередь.
  const showInfoAlert = useCallback(
    (title: string, message: string) => {
      onRequestClose();
      setTimeout(() => enqueueInfoAlert(title, message), ACCOUNT_DELETE_DISMISS_SETTLE_MS);
    },
    [enqueueInfoAlert, onRequestClose],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deleteInFlightRef.current || deleting || !deleteConfirmMatches) return;
    deleteInFlightRef.current = true;
    doHaptic();
    setDeleting(true);
    try {
      // зачем: ждём ТОЛЬКО быструю фазу — запись замка в SecureStore. После неё
      // точка невозврата пройдена (старая почта/Apple ID уже не пускают в старый
      // аккаунт), поэтому UI имеет право закрыться немедленно. Сеть — Cloud
      // Function, signOut, новый анонимный аккаунт — доезжает фоном; если её
      // оборвёт, следующий старт дочистит всё через
      // resumePendingAccountDeleteLocalExit(). Раньше здесь ждали ВСЮ цепочку
      // целиком, и на плохой сети настройки висели заблокированными десятки
      // секунд — ровно то «зависает намертво», которое чиним.
      const res = await beginAccountDeletion();
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
          res.reason === 'pending_guard_persist_failed'
            ? L({
            ru: 'Не удалось безопасно подготовить удаление. Аккаунт и данные не изменены. Освободи место на устройстве или перезапусти телефон и попробуй снова.',
            uk: 'Не вдалося безпечно підготувати видалення. Акаунт і дані не змінено. Звільніть місце на пристрої або перезапустіть телефон і спробуйте знову.',
            es: 'No pudimos preparar la eliminación de forma segura. La cuenta y los datos no cambiaron. Libera espacio o reinicia el teléfono e inténtalo de nuevo.',
            'pt-BR': 'Não foi possível preparar a exclusão com segurança. A conta e os dados não foram alterados. Libere espaço ou reinicie o telefone e tente novamente.',
            vi: 'Không thể chuẩn bị xóa một cách an toàn. Tài khoản và dữ liệu chưa thay đổi. Hãy giải phóng dung lượng hoặc khởi động lại điện thoại rồi thử lại.',
            id: 'Penghapusan belum dapat disiapkan dengan aman. Akun dan data tidak berubah. Kosongkan ruang atau mulai ulang ponsel lalu coba lagi.',
            tr: 'Silme işlemi güvenli biçimde hazırlanamadı. Hesap ve veriler değişmedi. Yer aç veya telefonu yeniden başlatıp tekrar dene.',
            pl: 'Nie udało się bezpiecznie przygotować usunięcia. Konto i dane nie zostały zmienione. Zwolnij miejsce lub uruchom telefon ponownie i spróbuj jeszcze raz.',
          })
            : L({
            ru: 'Безопасный локальный выход не завершён. Аккаунт остаётся в режиме защиты; перезапусти приложение и повтори попытку.',
            uk: 'Безпечний локальний вихід не завершено. Акаунт залишається в захищеному режимі; перезапустіть застосунок і повторіть спробу.',
            es: 'La salida local segura no terminó. La cuenta permanece protegida; reinicia la aplicación e inténtalo de nuevo.',
            'pt-BR': 'A saída local segura não foi concluída. A conta permanece protegida; reinicie o aplicativo e tente novamente.',
            vi: 'Quá trình thoát an toàn trên thiết bị chưa hoàn tất. Tài khoản vẫn được bảo vệ; hãy khởi động lại ứng dụng và thử lại.',
            id: 'Proses keluar lokal yang aman belum selesai. Akun tetap dilindungi; mulai ulang aplikasi lalu coba lagi.',
            tr: 'Güvenli yerel çıkış tamamlanmadı. Hesap korumalı durumda; uygulamayı yeniden başlatıp tekrar dene.',
            pl: 'Bezpieczne lokalne wyjście nie zostało ukończone. Konto pozostaje chronione; uruchom aplikację ponownie i spróbuj jeszcze raz.',
          }),
        );
        deleteInFlightRef.current = false;
        return;
      }
      // зачем: подтверждение пользователю — короткая плашка на первом экране
      // онбординга, а НЕ алерт. Второй нативный <Modal> в том же тике, в котором
      // закрывается этот, на iOS ломает стек презентаций (экран настроек остаётся
      // на месте, тапы мертвы). Плашка живёт внутри уже смонтированного
      // онбординга — никакого present/dismiss.
      markAccountDeletedNoticePending();
      onRequestClose();
      // зачем: удаление вызывают и с ВЛОЖЕННЫХ экранов-маршрутов («Приватность и
      // данные», «Аккаунт»), а не только из вкладки настроек. Оверлей онбординга
      // рисуется поверх, но сам экран остаётся в стеке навигации под ним — и
      // после онбординга пользователь возвращался на мёртвый экран удалённого
      // аккаунта. Владелец потребовал: закрыться должно ВСЁ. Сбрасываем стек в
      // корень до показа онбординга; ошибку глушим — навигация не должна
      // отменять само удаление.
      try { router.dismissAll?.(); } catch { /* стек мог быть уже корневым */ }
      try { router.replace('/(tabs)/home' as never); } catch { /* ignore */ }
      // Событие само монтирует чистый онбординг — перезапуск приложения не нужен
      // и раньше только добавлял задержку поверх ожидания сети.
      emitAppEvent('account_deleted');
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
          {/* зачем: у футера стоял onStartShouldSetResponderCapture={() => true} —
              он ПЕРЕХВАТЫВАЛ касание на фазе capture, до кнопок, и подменял его
              вычислением половины по locationX. При изменившейся вёрстке (gap,
              padding, RTL, узкий экран) точка попадала не в ту половину, и
              нажатие «Удалить» уходило в «Отмена» либо терялось вовсе — кнопка
              выглядела мёртвой. Убираем перехват целиком: пусть каждая кнопка
              получает своё касание сама, как и положено. */}
          <View
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
              // зачем: здесь висело ПЯТЬ обработчиков разом — onStartShouldSetResponder
              // + onResponderRelease + onTouchEnd + onPress + onPressIn. Responder-пара
              // забирала касание у Pressable, поэтому onPress мог не сработать вовсе,
              // а onPressIn/onTouchEnd дублировали запуск. Оставляем ОДИН onPress:
              // повторный вход всё равно закрыт deleteInFlightRef.
              disabled={!deleteConfirmMatches || deleting}
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
