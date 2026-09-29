import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
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
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type PlannedInterfaceLang } from '../constants/i18n';
import { hapticTap as doHaptic, hapticWarning } from '../hooks/use-haptics';
import { beginAccountDeletion } from '../app/auth_provider';
import { enqueueThemedBlockingInfoAlert } from '../app/themed_blocking_alert_queue';
import { emitAppEvent } from '../app/events';
import { markAccountDeletedNoticePending } from '../app/account_deleted_notice';
import {
  finishAccountDeleteUiTrace,
  startAccountDeleteUiTrace,
  traceAccountDeleteUi,
} from '../app/account_delete_ui_trace';
import { soundDirector } from '../modules/audio/sound_director';
import HybridAlertShell from './modal_fx/HybridAlertShell';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { TOAST } from '../constants/motionHybrid';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path.
   * зачем: логика удаления (beginAccountDeletion и весь handleConfirmDelete) не тронута —
   * проп меняет только визуальную оболочку и CTA-компоненты. */
  motionVariant?: 'classic' | 'hybrid';
};

type DeleteAccountCopy = {
  /** Необязательный английский; без него en повторяет ru (как было). */
  en?: string;
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
function DeleteAccountConfirmModal({ visible, onRequestClose, motionVariant = 'hybrid' }: Props) {
  const { theme: t, liquidGlassThemeId, f } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReduceMotion();
  // зачем: приглушённый тон CTA «Удалить» + одна дрожь на подтверждении —
  // деструктивный паттерн из ThemedConfirmModal (destructive), но здесь кнопка
  // недоступна пока слово не совпало, поэтому дрожь играет только на реальном
  // подтверждении (handleConfirmDelete), не на каждом тапе по disabled-кнопке.
  const shakeX = useSharedValue(0);
  useEffect(() => {
    return () => cancelAnimation(shakeX);
  }, [shakeX]);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  const runDangerShake = useCallback(() => {
    if (!isHybrid || reduceMotion) return;
    const [a, b, c, d, e] = TOAST.errorShakePx;
    shakeX.value = withSequence(
      withTiming(a, { duration: TOAST.errorShakeStepMs }),
      withTiming(b, { duration: TOAST.errorShakeStepMs }),
      withTiming(c, { duration: TOAST.errorShakeStepMs }),
      withTiming(d, { duration: TOAST.errorShakeStepMs }),
      withTiming(e, { duration: TOAST.errorShakeStepMs }),
    );
  }, [isHybrid, reduceMotion, shakeX]);
  const L = useCallback((copy: DeleteAccountCopy) => triLang(lang, {
    ru: copy.ru,
    uk: copy.uk,
    en: copy.en ?? copy.ru,
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
    startAccountDeleteUiTrace();
    if (isHybrid) {
      void hapticWarning();
      runDangerShake();
    } else {
      doHaptic();
    }
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
        traceAccountDeleteUi(`local_delete_rejected:${res.reason}`);
        finishAccountDeleteUiTrace('handoff_failed');
        showInfoAlert(
          L({
            ru: 'Не получилось',
            uk: 'Не вийшло',
            es: 'No salió',
            'pt-BR': 'Não deu certo',
            vi: 'Chưa được',
            id: 'Belum berhasil',
            tr: 'Olmadı',
            pl: 'Nie udało się',
          }),
          res.reason === 'pending_guard_persist_failed'
            ? L({
            ru: 'Не удалось подготовить удаление. Аккаунт и данные не изменены. Освободи место на телефоне и попробуй снова.',
            uk: 'Не вдалося підготувати видалення. Акаунт і дані не змінено. Звільни місце на пристрої або перезапусти телефон і спробуй знову.',
            es: 'No pudimos preparar la eliminación de forma segura. La cuenta y los datos no cambiaron. Libera espacio o reinicia el teléfono e inténtalo de nuevo.',
            'pt-BR': 'Não foi possível preparar a exclusão com segurança. A conta e os dados não foram alterados. Libere espaço ou reinicie o telefone e tente novamente.',
            vi: 'Không thể chuẩn bị xóa một cách an toàn. Tài khoản và dữ liệu chưa thay đổi. Hãy giải phóng dung lượng hoặc khởi động lại điện thoại rồi thử lại.',
            id: 'Penghapusan belum dapat disiapkan dengan aman. Akun dan data tidak berubah. Kosongkan ruang atau mulai ulang ponsel lalu coba lagi.',
            tr: 'Silme işlemi güvenli biçimde hazırlanamadı. Hesap ve veriler değişmedi. Yer aç veya telefonu yeniden başlatıp tekrar dene.',
            pl: 'Nie udało się bezpiecznie przygotować usunięcia. Konto i dane nie zostały zmienione. Zwolnij miejsce lub uruchom telefon ponownie i spróbuj jeszcze raz.',
          })
            : L({
            ru: 'Выход не завершился. Аккаунт под защитой — перезапусти приложение и попробуй снова.',
            uk: 'Вихід не завершився. Акаунт під захистом — перезапусти застосунок і спробуй знову.',
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
      traceAccountDeleteUi('local_delete_committed');
      // зачем: подтверждение пользователю — короткая плашка на первом экране
      // онбординга, а НЕ алерт. Второй нативный <Modal> в том же тике, в котором
      // закрывается этот, на iOS ломает стек презентаций (экран настроек остаётся
      // на месте, тапы мертвы). Плашка живёт внутри уже смонтированного
      // онбординга — никакого present/dismiss.
      // зачем: точка невозврата пройдена (локальный замок записан) — именно это
      // подтверждаем звуком, а не тап по кнопке. Ставим ДО onRequestClose():
      // дальше экран размонтируется и уезжает онбординг, там звучать уже некому.
      // Сеть при этом ещё доезжает фоном — звук привязан к необратимости, а не
      // к ответу сервера.
      soundDirector.request('pm.system.destructive_done', {
        scope: 'account-delete',
        dedupeKey: 'account-deleted',
      });
      markAccountDeletedNoticePending();
      // Release every blocking control before dismissing the native Modal. The
      // Settings screen may unmount in the same render as the root onboarding
      // overlay, so waiting for finally leaves iOS presenting a disabled modal
      // over the new clean profile for a frame (or indefinitely on a broken
      // presentation stack).
      setDeleting(false);
      deleteInFlightRef.current = false;
      onRequestClose();
      traceAccountDeleteUi('inner_modal_close_requested');
      // Mount the first clean onboarding screen in the same UI handoff. The
      // returned completion is intentionally ignored: server deletion, provider
      // sign-out and anonymous-auth creation remain background-only.
      traceAccountDeleteUi('root_event_emitting');
      emitAppEvent('account_deleted');
      traceAccountDeleteUi('root_event_dispatch_complete');
    } catch {
      traceAccountDeleteUi('local_delete_threw');
      finishAccountDeleteUiTrace('handoff_failed');
      showInfoAlert(
        L({
          ru: 'Не получилось',
          uk: 'Не вийшло',
          es: 'No salió',
          'pt-BR': 'Não deu certo',
          vi: 'Chưa được',
          id: 'Belum berhasil',
          tr: 'Olmadı',
          pl: 'Nie udało się',
        }),
        L({
          ru: 'Удаление не завершилось. Проверь интернет и попробуй ещё раз.',
          uk: 'Видалення не завершилося. Перевір інтернет і спробуй ще раз.',
          es: 'La eliminación no se completó. Revisa Internet e inténtalo de nuevo.',
          'pt-BR': 'A exclusão não foi concluída. Verifique a Internet e tente novamente.',
          vi: 'Quá trình xóa chưa hoàn tất. Hãy kiểm tra Internet và thử lại.',
          id: 'Penghapusan belum selesai. Periksa internet dan coba lagi.',
          tr: 'Silme işlemi tamamlanmadı. İnterneti kontrol edip tekrar dene.',
          pl: 'Usuwanie nie zostało ukończone. Sprawdź internet i spróbuj ponownie.',
        }),
      );
      deleteInFlightRef.current = false;
    } finally {
      setDeleting(false);
    }
  }, [L, deleteConfirmMatches, deleting, isHybrid, onRequestClose, runDangerShake, showInfoAlert]);

  const handleCancel = useCallback(() => {
    if (deleting) return;
    doHaptic();
    onRequestClose();
  }, [deleting, onRequestClose]);

  // зачем: окно удаления аккаунта — Liquid Glass по макету PRF-21 (confirm/pending): заголовок,
  // короткое предупреждение, слово-подтверждение, «Отмена» (тон темы) и «Удалить» (семантика
  // ошибки — единственный красный элемент). Зелёных поверхностей нет, обводок нет.
  const dialogBody = (
    <View style={[styles.dialog, isHybrid ? styles.hybridDialog : styles.classicDialog, { backgroundColor: glass.opaqueSheet }]}>
          <ScrollView
            style={isHybrid ? styles.hybridScrollViewport : undefined}
            decelerationRate="fast"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 8 }}
          >
          <Text accessibilityRole="header" style={{ color: glass.text, fontSize: f.h2, fontWeight: '700', marginBottom: 10 }}>
            {L({
              ru: 'Удалить аккаунт?',
              uk: 'Видалити акаунт?',
              en: 'Delete account?',
              es: '¿Eliminar la cuenta?',
              'pt-BR': 'Excluir a conta?',
              vi: 'Xóa tài khoản?',
              id: 'Hapus akun?',
              tr: 'Hesap silinsin mi?',
              pl: 'Usunąć konto?',
            })}
          </Text>
          <Text style={{ color: glass.secondary, fontSize: f.body, lineHeight: f.body * 1.45, marginBottom: 18 }}>
            {L({
              ru: 'Это необратимо: периода восстановления нет. Подписка в App Store или Google Play не отменится автоматически.',
              uk: 'Це незворотно: періоду відновлення немає. Підписка в App Store або Google Play не скасується автоматично.',
              en: 'This cannot be undone: there is no recovery period. Your App Store or Google Play subscription will not be canceled automatically.',
              es: 'Es irreversible: no hay periodo de recuperación. La suscripción de App Store o Google Play no se cancela automáticamente.',
              'pt-BR': 'É irreversível: não há período de recuperação. A assinatura da App Store ou do Google Play não é cancelada automaticamente.',
              vi: 'Không thể hoàn tác: không có thời gian khôi phục. Gói đăng ký trên App Store hoặc Google Play sẽ không tự động bị hủy.',
              id: 'Tidak bisa dibatalkan: tidak ada masa pemulihan. Langganan di App Store atau Google Play tidak dibatalkan otomatis.',
              tr: 'Bu geri alınamaz: kurtarma süresi yok. App Store veya Google Play aboneliği otomatik olarak iptal edilmez.',
              pl: 'Tego nie da się cofnąć: nie ma okresu przywracania. Subskrypcja w App Store lub Google Play nie zostanie anulowana automatycznie.',
            })}
          </Text>
          <Text style={{ color: glass.secondary, fontSize: f.caption, fontWeight: '600', marginBottom: 8 }}>
            {L({
              ru: 'Введите «УДАЛИТЬ» для подтверждения:',
              uk: 'Введіть «ВИДАЛИТИ» для підтвердження:',
              es: 'Escribe «ELIMINAR» para confirmar:',
              'pt-BR': 'Digite «EXCLUIR» para confirmar:',
              vi: 'Nhập "XÓA" để xác nhận:',
              id: 'Ketik "HAPUS" untuk mengonfirmasi:',
              tr: '"SİL" yazarak onayla:',
              pl: 'Wpisz "USUŃ", aby potwierdzić:',
            })}
          </Text>
          <TextInput
            testID="delete-account-confirm-input"
            accessibilityLabel={deleteConfirmWord}
            style={{
              // Поле — плашка контрола темы + тонкая полупрозрачная кромка (как .field в макете).
              backgroundColor: glass.opaqueControl,
              color: glass.text,
              fontSize: f.body,
              minHeight: 52,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 16,
              borderWidth: 1, // guard-ok: тонкая (1px) полупрозрачная кромка — разрешена для PhraseMan 2.0
              borderColor: glass.line,
              marginBottom: 16,
            }}
            value={deleteConfirmInput}
            onChangeText={setDeleteConfirmInput}
            placeholder={deleteConfirmWord}
            placeholderTextColor={glass.mutedText}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={false}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
            maxLength={16}
            editable={!deleting}
          />
          </ScrollView>
          {/* зачем: у футера стоял onStartShouldSetResponderCapture={() => true} —
              он ПЕРЕХВАТЫВАЛ касание на фазе capture, до кнопок, и подменял его
              вычислением половины по locationX. При изменившейся вёрстке (gap,
              padding, RTL, узкий экран) точка попадала не в ту половину, и
              нажатие «Удалить» уходило в «Отмена» либо терялось вовсе — кнопка
              выглядела мёртвой. Убираем перехват целиком: пусть каждая кнопка
              получает своё касание сама, как и положено. */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 22 }}>
            <Pressable
              testID="delete-account-cancel"
              disabled={deleting}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ disabled: deleting }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: glass.selected,
                overflow: 'hidden',
                opacity: deleting ? 0.45 : pressed ? 0.75 : 1,
              })}
              onPress={handleCancel}
            >
              <Text style={{ color: glass.text, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>{L({
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
            {/* зачем: приглушённый деструктивный тон ThemedConfirmModal (t.wrongBg + t.wrong);
                вес удара несёт дрожь на реальном подтверждении (runDangerShake), а не кричащая
                заливка. До совпадения слова кнопка недоступна. Одна onPress — повторный вход
                закрыт deleteInFlightRef. */}
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
              accessibilityState={{ disabled: !deleteConfirmMatches || deleting, busy: deleting }}
              disabled={!deleteConfirmMatches || deleting}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                paddingHorizontal: 12,
                paddingVertical: 12,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: deleteConfirmMatches ? t.wrongBg : glass.opaqueControl,
                overflow: 'hidden',
                opacity: deleting ? 0.78 : deleteConfirmMatches ? (pressed ? 0.82 : 1) : 0.45,
              })}
              onPress={handleConfirmDelete}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {deleting ? <ActivityIndicator size="small" color={t.wrong} /> : null}
                <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {L({ ru: 'Удалить', uk: 'Видалити', es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń' })}
                </Text>
              </View>
            </Pressable>
          </View>
    </View>
  );

  const panel = isHybrid ? (
    // Дрожь на подтверждении живёт на самой панели; растяжки нет — высота по
    // содержимому, центрирование и клавиатурный отступ берёт на себя шелл.
    <Reanimated.View style={[styles.hybridPanelViewport, shakeStyle]}>{dialogBody}</Reanimated.View>
  ) : (
    <KeyboardAvoidingView
      style={styles.classicModalViewport}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {dialogBody}
    </KeyboardAvoidingView>
  );

  if (isHybrid) {
    return (
      <HybridAlertShell
        visible={visible}
        onRequestClose={() => {
          if (!deleting) onRequestClose();
        }}
        shadowColor="#000000"
        testID="delete-account-modal-hybrid"
        scrollContent={false}
        avoidKeyboard
      >
        {panel}
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {
      if (!deleting) onRequestClose();
    }}>
      {panel}
    </Modal>
  );
}

export default memo(DeleteAccountConfirmModal);

const styles = StyleSheet.create({
  // зачем: владелец 2026-09-22 — «модал на весь экран, должен быть маленький
  // аккуратный». Раньше здесь стоял flex:1 (шелл получал опт-ин на растяжку)
  // ради длинного списка удаляемых данных; этот блок давно отключён
  // ({false && …}), внутри остались заголовок, поле ввода и две кнопки. flex:1
  // растягивал пустое окно на весь экран. Теперь высота по содержимому,
  // потолок — экран (maxHeight:'100%'), скролл включается только при
  // переполнении.
  hybridPanelViewport: {
    width: '100%',
    minHeight: 0,
  },
  hybridDialog: {
    width: '100%',
    maxHeight: '100%',
  },
  hybridScrollViewport: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  classicModalViewport: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    maxWidth: 420,
    borderRadius: 28,
    overflow: 'hidden',
  },
  classicDialog: {
    width: '88%',
    maxHeight: '90%',
  },
});
