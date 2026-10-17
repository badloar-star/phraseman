import React, { memo, useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import { beginAccountDeletion, peekLinkedAuthFromCurrentUser } from '../app/auth_provider';
import { enqueueThemedBlockingChoiceAlert } from '../app/themed_blocking_alert_queue';
import { emitAppEvent } from '../app/events';
import {
  finishAccountDeleteUiTrace,
  startAccountDeleteUiTrace,
  traceAccountDeleteUi,
} from '../app/account_delete_ui_trace';
import { soundDirector } from '../modules/audio/sound_director';
import HybridAlertShell from './modal_fx/HybridAlertShell';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { nestedBoxShadow } from './v2/ShadowSurface';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { TOAST } from '../constants/motionHybrid';
import { isDevAccountLinkedDemo, isDevDeleteConfirmBypass } from '../app/dev_account_state';
import { reportAccountDeleteHandoffFailed, reportAccountDeleteHandoffThrew } from '../app/auth_release_reasons';

const EXEMPT_COLOR_1 = '#000000'; // theme-exempt: тень и затемнение окна — чёрные в любой теме
// зачем (аудит 11.10): запасной toUpperCase в рендере — причину пишем один раз за процесс, а не на каждую букву.
let localeUpperFallbackLogged = false;

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
  // зачем (релизный пол 10.10, security-ревью M-1): восстановить в 14 дней можно только тем же
  // входом Google/Apple. Гостю (анонимный вход) после стирания вернуться нечем — ему без обещания.
  // зачем (EN-проход 13.10, auth-gap-009): dev `account=linked` (только память, в сторе всегда false; действия аккаунта при нём
  // отказывают первой строкой) показывает вариант «удалится через 14 дней» без настоящего входа — иначе кадр снимается только с Google.
  const hasProviderSignIn = useMemo(() => visible && (peekLinkedAuthFromCurrentUser() !== null || isDevAccountLinkedDemo()), [visible]);
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
    uk: 'ВИДАЛИТИ', en: "DELETE",
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
  // зачем (65б, макет OR-ACCOUNT-DELETE-PRECOMMIT-REJECTED): «Повторить» в окне отказа запускает удаление снова без
  // повторного ввода слова — его уже ввели, а поле сброшено закрытием окна. Флаг одноразовый: сгорает на первом вызове.
  const retryApprovedRef = useRef(false);
  const confirmDeleteRef = useRef<(() => Promise<void>) | null>(null);
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
      } catch (error) {
        if (!localeUpperFallbackLogged) {
          localeUpperFallbackLogged = true;
          console.warn(`[ACCOUNT-DELETE-UI] locale_upper_fallback lang=${String(lang).slice(0, 16)} reason=${error instanceof Error ? error.name : typeof error}`); // guard-ok: catch пишет причину
        }
        return base.toUpperCase();
      }
    },
    [lang],
  );
  // зачем (координатор 12.10, auth-gap-011): робот не вводит кириллицу — без ввода слова кнопка доступна ТОЛЬКО при dev-флаге удаления
  // (delete=fail|throw, настоящее удаление недостижимо). В стор-сборке геттер — заглушка false: ввод обязателен всегда.
  const deleteConfirmMatches = isDevDeleteConfirmBypass() || normalizeConfirm(deleteConfirmInput) === normalizeConfirm(deleteConfirmWord);

  // зачем (живой прогон 10.10, 21:35): шаг «закрыть хранилище телефона» в удалении грузит модуль
  // phone_state_bootstrap; холодная загрузка заняла 1923 мс против 163 мс тёплой — и весь полёт
  // стирания не уложился в 5 с (отказ local_wipe_unverified). Прогреваем модуль, пока человек вводит
  // слово подтверждения, чтобы нажатие «Удалить» шло уже по тёплому пути.
  useEffect(() => {
    if (!visible) return;
    const startedAt = Date.now();
    // зачем (координатор 14.10): пока человек вводит слово, поднимаем серверную функцию постановки удаления — ack без
    // холодного старта ≈9,5 с. Тело прогрева без ключа удаления: поставить удаление им нельзя (app/cloud_sync.ts).
    void import('../app/cloud_sync').then(
      ({ warmAccountDeleteEnqueue }) => warmAccountDeleteEnqueue('delete_confirm_modal'),
      (error: unknown) => console.warn(`[ACCOUNT-DELETE-WARM] import_failed reason=${error instanceof Error ? error.message.slice(0, 80) : typeof error}`), // guard-ok: сбой пишет причину
    );
    void import('../app/phone_state_bootstrap').then(
      () => console.log(`[ACCOUNT-DELETE-UI] phone_state_prewarm ok ms=${Date.now() - startedAt}`), // guard-ok: разовый лог при открытии окна удаления
      (error: unknown) => console.warn(`[ACCOUNT-DELETE-UI] phone_state_prewarm failed reason=${error instanceof Error ? error.message.slice(0, 80) : typeof error}`), // guard-ok: сбой пишет причину всегда (правило владельца)
    );
  }, [visible]);

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
      void enqueueThemedBlockingChoiceAlert(title || L({
        ru: 'Сообщение',
        uk: 'Повідомлення', en: "Message",
        es: 'Message',
        'pt-BR': 'Mensagem',
        vi: 'Thông báo',
        id: 'Pesan',
        tr: 'Mesaj',
        pl: 'Wiadomość',
        // зачем (Сверка overlays-runtime 039–041): стадии удаления — плитка с замком, как в макете.
      }), message, [
        { value: 'close', ghost: true, label: L({ ru: 'Закрыть', uk: 'Закрити', en: "Close", es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }) },
        { value: 'retry', label: L({ ru: 'Повторить', uk: 'Повторити', en: "Try again", es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Ponów' }) },
      ], { icon: 'lock-closed' }).then((choice) => {
        // Оба окна отказа — до точки невозврата (аккаунт не изменён), поэтому повтор разрешён макетом.
        console.warn('[ACCOUNT-DELETE-UI] reject_alert:choice', JSON.stringify({ choice })); // guard-ok: выбор логируется
        if (choice !== 'retry') return;
        retryApprovedRef.current = true;
        void confirmDeleteRef.current?.();
      });
    },
    [L],
  );

  // зачем: алерт об ошибке — тоже нативный <Modal> (GlassAlertDialog через очередь). Показывать его,
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
    const retryApproved = retryApprovedRef.current;
    retryApprovedRef.current = false;
    if (deleteInFlightRef.current || deleting || (!deleteConfirmMatches && !retryApproved)) {
      if (retryApproved) {
        console.warn('[ACCOUNT-DELETE-UI] retry:skipped', JSON.stringify({ inFlight: deleteInFlightRef.current, deleting })); // guard-ok: ранний выход логируется
      } else {
        // зачем (аудит двойного тапа 11.10): отбитый повторный тап «Удалить» был немым — пишем причину.
        console.log(`[ACCOUNT-DELETE-UI] confirm ignored reason=${deleteInFlightRef.current || deleting ? 'in_flight' : 'word_mismatch'}`); // guard-ok: ранний выход логируется
      }
      return;
    }
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
        reportAccountDeleteHandoffFailed(res.reason);
        finishAccountDeleteUiTrace('handoff_failed');
        showInfoAlert(
          L({
            ru: 'Не получилось',
            uk: 'Не вийшло', en: "Something went wrong",
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
            uk: 'Не вдалося підготувати видалення. Акаунт і дані не змінено. Звільни місце на телефоні й спробуй знову.', en: "Couldn't prepare the deletion. Your account and data weren't changed. Free up some space on your phone and try again.",
            es: 'No se pudo preparar la eliminación. Tu cuenta y tus datos no cambiaron. Libera espacio en el teléfono e inténtalo de nuevo.',
            'pt-BR': 'Não deu para preparar a exclusão. Sua conta e seus dados não mudaram. Libere espaço no celular e tente de novo.',
            vi: 'Chưa chuẩn bị xóa được. Tài khoản và dữ liệu vẫn giữ nguyên. Hãy giải phóng dung lượng điện thoại rồi thử lại.',
            id: 'Penghapusan belum bisa disiapkan. Akun dan datamu tidak berubah. Kosongkan ruang di ponsel lalu coba lagi.',
            tr: 'Silme hazırlanamadı. Hesabın ve verilerin değişmedi. Telefonda yer aç ve tekrar dene.',
            pl: 'Nie udało się przygotować usunięcia. Konto i dane się nie zmieniły. Zwolnij miejsce w telefonie i spróbuj ponownie.',
          })
            : L({
            ru: 'Выход не завершился. Аккаунт под защитой — перезапусти приложение и попробуй снова.',
            uk: 'Вихід не завершився. Акаунт під захистом — перезапусти застосунок і спробуй знову.', en: "Sign-out didn't finish. Your account is protected — restart the app and try again.",
            es: 'No se pudo cerrar la sesión. Tu cuenta está protegida: reinicia la app e inténtalo de nuevo.',
            'pt-BR': 'A saída não terminou. Sua conta está protegida — reinicie o app e tente de novo.',
            vi: 'Chưa đăng xuất xong. Tài khoản vẫn được bảo vệ — hãy mở lại ứng dụng rồi thử lại.',
            id: 'Keluar akun belum selesai. Akunmu tetap aman — mulai ulang aplikasi lalu coba lagi.',
            tr: 'Çıkış tamamlanmadı. Hesabın korunuyor — uygulamayı yeniden başlat ve tekrar dene.',
            pl: 'Wylogowanie nie dobiegło końca. Konto pozostaje chronione — uruchom aplikację ponownie i spróbuj jeszcze raz.',
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
      // зачем (правило владельца 22.09 «уведомлений об удалении не показывать НИКОГДА»; координатор 12.10,
      // аудит COVERAGE_AUDIT_R1 §C): плашку «Ты удалил(а) все свои данные» на онбординге больше не ставим.
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
    } catch (error: unknown) {
      traceAccountDeleteUi('local_delete_threw');
      reportAccountDeleteHandoffThrew();
      // зачем (Дизайн 05.10, 041: в макете три разных окна отказа, у нас одно): причина отказа — чтобы выбрать окно.
      // Без uid и данных аккаунта.
      console.warn('[ACCOUNT-DELETE-UI] local_delete_threw', JSON.stringify({
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200),
        code: (error as { code?: unknown } | null)?.code ?? null,
      })); // guard-ok: catch логирует причину
      finishAccountDeleteUiTrace('handoff_failed');
      showInfoAlert(
        L({
          ru: 'Не получилось',
          uk: 'Не вийшло', en: "Something went wrong",
          es: 'No salió',
          'pt-BR': 'Não deu certo',
          vi: 'Chưa được',
          id: 'Belum berhasil',
          tr: 'Olmadı',
          pl: 'Nie udało się',
        }),
        L({
          ru: 'Удаление не завершилось. Проверь интернет и попробуй ещё раз.',
          uk: 'Видалення не завершилося. Перевір інтернет і спробуй ще раз.', en: "Deletion didn't finish. Check your internet connection and try again.",
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
  confirmDeleteRef.current = handleConfirmDelete;

  const handleCancel = useCallback(() => {
    if (deleting) {
      console.log('[ACCOUNT-DELETE-UI] cancel ignored reason=in_flight'); // guard-ok: ранний выход логируется
      return;
    }
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
            {/* зачем (релизный пол 10.10, решение координатора): прежний текст «периода
                восстановления нет» был ложью — сервер держит аккаунт 14 дней
                (functions/src/account_delete_grace.ts), политика конфиденциальности это
                обещает, а при повторном входе приложение предлагает восстановить. */}
            {hasProviderSignIn ? L({
              ru: 'Аккаунт удалится через 14 дней. Если передумаешь — просто войди снова тем же способом. Подписка в App Store или Google Play не отменится автоматически.',
              uk: 'Акаунт видалиться через 14 днів. Якщо передумаєш — просто увійди знову тим самим способом. Підписка в App Store або Google Play не скасується автоматично.',
              en: 'Your account will be deleted in 14 days. If you change your mind, just sign in again the same way. Your App Store or Google Play subscription will not be canceled automatically.',
              es: 'La cuenta se eliminará en 14 días. Si cambias de opinión, solo vuelve a entrar del mismo modo. La suscripción de App Store o Google Play no se cancela automáticamente.',
              'pt-BR': 'A conta será excluída em 14 dias. Se mudar de ideia, é só entrar de novo do mesmo jeito. A assinatura da App Store ou do Google Play não é cancelada automaticamente.',
              vi: 'Tài khoản sẽ bị xóa sau 14 ngày. Nếu đổi ý, chỉ cần đăng nhập lại bằng cách cũ. Gói đăng ký trên App Store hoặc Google Play sẽ không tự động bị hủy.',
              id: 'Akun akan dihapus dalam 14 hari. Jika berubah pikiran, cukup masuk lagi dengan cara yang sama. Langganan di App Store atau Google Play tidak dibatalkan otomatis.',
              tr: 'Hesap 14 gün içinde silinecek. Fikrini değiştirirsen aynı yöntemle yeniden giriş yapman yeterli. App Store veya Google Play aboneliği otomatik olarak iptal edilmez.',
              pl: 'Konto zostanie usunięte za 14 dni. Jeśli zmienisz zdanie, po prostu zaloguj się ponownie w ten sam sposób. Subskrypcja w App Store lub Google Play nie zostanie anulowana automatycznie.',
            }) : L({
              ru: 'Прогресс удалится безвозвратно. Подписка в App Store или Google Play не отменится автоматически.',
              uk: 'Прогрес видалиться безповоротно. Підписка в App Store або Google Play не скасується автоматично.',
              en: 'Your progress will be deleted permanently. Your App Store or Google Play subscription will not be canceled automatically.',
              es: 'Tu progreso se eliminará para siempre. La suscripción de App Store o Google Play no se cancela automáticamente.',
              'pt-BR': 'Seu progresso será excluído para sempre. A assinatura da App Store ou do Google Play não é cancelada automaticamente.',
              vi: 'Tiến trình của bạn sẽ bị xóa vĩnh viễn. Gói đăng ký trên App Store hoặc Google Play sẽ không tự động bị hủy.',
              id: 'Progresmu akan dihapus permanen. Langganan di App Store atau Google Play tidak dibatalkan otomatis.',
              tr: 'İlerlemen kalıcı olarak silinecek. App Store veya Google Play aboneliği otomatik olarak iptal edilmez.',
              pl: 'Twój postęp zostanie trwale usunięty. Subskrypcja w App Store lub Google Play nie zostanie anulowana automatycznie.',
            })}
          </Text>
          <Text style={{ color: glass.secondary, fontSize: f.caption, fontWeight: '600', marginBottom: 8 }}>
            {L({
              ru: 'Введи «УДАЛИТЬ» для подтверждения:',
              uk: 'Введи «ВИДАЛИТИ» для підтвердження:', en: "Type “DELETE” to confirm:",
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
              // зачем (стиль «Тень», Темы ae3bf2a7e, координатор 12.10): поле — плашка контрола темы с малой тенью, без кромки;
              // так же, как поле имени в NicknameEditModal.
              backgroundColor: glass.opaqueControl,
              boxShadow: nestedBoxShadow(glass) as unknown as string /* типы RN для стиля TextInput знают boxShadow только строкой, массив работает */,
              color: glass.text,
              fontSize: f.body,
              minHeight: 52,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 16,
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
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 22 }}>
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
                uk: 'Скасувати', en: "Cancel",
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
                uk: 'Видалити', en: "Delete",
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
                backgroundColor: deleteConfirmMatches ? t.wrongBg : glass.buttonFill,
                overflow: 'hidden',
                opacity: deleting ? 0.78 : deleteConfirmMatches ? (pressed ? 0.82 : 1) : 0.45,
              })}
              onPress={handleConfirmDelete}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {deleting ? <ActivityIndicator size="small" color={t.wrong} /> : null}
                <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {L({ ru: 'Удалить', uk: 'Видалити', en: "Delete", es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń' })}
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
        shadowColor={EXEMPT_COLOR_1}
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
    backgroundColor: 'rgba(0,0,0,0.7)', // theme-exempt: тень и затемнение окна — чёрные в любой теме
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
