// ════════════════════════════════════════════════════════════════════════════
// AccountLogoutFlow.tsx — подтверждение и выполнение выхода из аккаунта
// для экрана «Аккаунт» (кнопка «Выйти»).
//
// Тот же безопасный флоу, что «Сменить аккаунт» в настройках (Variant 2):
//   confirm → wiping (forced sync + signOut + wipe) → onSignedOut.
// Прогресс перед выходом надёжно сохраняется; при любой блокировке
// (незавершённое списание монет, карантин очереди, нет сети) выход отменяется,
// данные остаются на месте, и юзеру предлагается явный «Выйти без сохранения»
// (аварийная копия пишется внутри signOutAndWipeForAccountSwitch).
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useCallback } from 'react';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { signOutAndWipeForAccountSwitch } from '../../app/auth_provider';
import { enqueueThemedBlockingInfoAlert } from '../../app/themed_blocking_alert_queue';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';
import { DebugLogger } from '../../app/debug-logger';

export type LogoutStage = 'idle' | 'confirm' | 'wiping';

/** Зазор на докрытие нативной модалки перед показом следующей (см. showInfoAlert). */
const LOGOUT_MODAL_DISMISS_SETTLE_MS = 360;

interface AccountLogoutFlowProps {
  stage: LogoutStage;
  onStageChange: (stage: LogoutStage) => void;
  /** Выход завершён: локальные данные вычищены, можно предлагать вход. */
  onSignedOut: (result: { synced: boolean }) => void;
}

export default function AccountLogoutFlow({ stage, onStageChange, onSignedOut }: AccountLogoutFlowProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = (
    ru: string, uk: string, en: string, es: string, ptBr: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });

  // зачем: тот же класс бага, что чинили в удалении аккаунта (present-during-dismiss).
  // ThemedBlockingAlertHost — нативный <Modal>. Если поставить алерт в очередь в том же
  // тике, в котором onStageChange('idle') закрывает модалку этого флоу, на iOS present
  // накладывается на идущий dismiss: стек презентаций ломается, алерт не виден, а экран
  // перестаёт принимать тапы. Ждём кадр докрытия — как NATIVE_MODAL_HANDOFF_GAP_MS
  // в OverlayArbiter (сюда он не достаёт: этот флоу живёт мимо арбитра).
  const showInfoAlert = useCallback((title: string, message: string) => {
    setTimeout(
      () => { void enqueueThemedBlockingInfoAlert(title, message, 'OK'); },
      LOGOUT_MODAL_DISMISS_SETTLE_MS,
    );
  }, []);

  // зачем (владелец, 2026-08-31): экран ставит стадию 'wiping' сразу по тапу,
  // без окна подтверждения — здесь ловим её и запускаем выход один раз.
  const logoutStartedRef = useRef(false);
  useEffect(() => {
    if (stage !== 'wiping' || logoutStartedRef.current) return;
    logoutStartedRef.current = true;
    void runLogout().finally(() => { logoutStartedRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const runLogout = async () => {
    doHaptic();
    // зачем (владелец, 2026-08-31): «никаких модалов, выход мгновенный».
    // Раньше здесь было четыре окна-блокировки: несинхронизированная покупка,
    // карантин очереди, упавшая синхронизация, общий отказ — каждое требовало
    // выбора и держало человека внутри аккаунта. Теперь путь один: пробуем
    // сохранить, при любой заминке выходим ФОРСИРОВАННО и дописываем остаток
    // фоном — аварийная копия (включая очередь монет) пишется внутри
    // signOutAndWipeForAccountSwitch, поэтому прогресс не теряется и
    // восстановится при следующем входе в этот аккаунт.
    onStageChange('wiping');
    const res = await signOutAndWipeForAccountSwitch();
    if (res.ok) {
      onStageChange('idle');
      onSignedOut({ synced: res.synced });
      return;
    }
    // Синхронизация не успела (нет сети / очередь занята) — это НЕ повод
    // держать человека в аккаунте: локальная аварийная копия уже записана.
    const forced = await signOutAndWipeForAccountSwitch({
      allowWipeWithoutSync: true,
      allowPendingShardSpendDiscard: true,
    });
    onStageChange('idle');
    if (forced.ok) {
      onSignedOut({ synced: forced.synced });
      return;
    }
    // Сюда попадаем, только если не удалось стереть ЛОКАЛЬНЫЕ данные —
    // выпускать нельзя, иначе следующий аккаунт увидит чужой прогресс.
    DebugLogger.error(
      'AccountLogoutFlow:wipe_failed',
      new Error(`reason=${forced.reason ?? 'unknown'} detail=${'detail' in forced ? String(forced.detail ?? '') : ''}`),
      'critical',
    );
    showInfoAlert(
      L('Не вышло выйти', 'Не вдалося вийти', "Couldn't sign out", 'No se pudo salir', 'Não foi possível sair', 'Không thể đăng xuất', 'Tidak bisa keluar', 'Çıkış yapılamadı', 'Nie udało się wylogować'),
      L(
        'Данные на телефоне не удалось очистить, поэтому выход отменён. Перезапусти приложение и попробуй снова.',
        'Дані на телефоні не вдалося очистити, тому вихід скасовано. Перезапусти застосунок і спробуй знову.',
        "Local data couldn't be cleared, so the sign-out was cancelled. Restart the app and try again.",
        'No se pudieron borrar los datos locales, así que se canceló la salida. Reinicia la aplicación e inténtalo de nuevo.',
        'Não foi possível limpar os dados locais, então a saída foi cancelada. Reinicie o app e tente novamente.',
        'Không xóa được dữ liệu trên máy nên đã hủy đăng xuất. Hãy khởi động lại ứng dụng và thử lại.',
        'Data lokal tidak bisa dibersihkan, jadi keluar dibatalkan. Mulai ulang aplikasi lalu coba lagi.',
        'Yerel veriler temizlenemedi, bu yüzden çıkış iptal edildi. Uygulamayı yeniden başlatıp tekrar dene.',
        'Nie udało się wyczyścić danych lokalnych, więc wylogowanie anulowano. Uruchom aplikację ponownie i spróbuj jeszcze raz.',
      ),
    );
  };

  return (
    <>
      {/* ── Подтверждение выхода + лоадер: ОДИН нативный <Modal> ──
          зачем: раньше это были ДВА <Modal> (confirm и wiping). Переход confirm→wiping
          закрывал первый и презентовал второй в одном кадре — present-during-dismiss,
          от которого на iOS ломается стек презентаций (тот же баг, что ловили в удалении
          аккаунта: окно пропадает, экран перестаёт реагировать). Теперь модал один, а
          стадия меняет только его СОДЕРЖИМОЕ — нативного present/dismiss между стадиями
          больше нет. */}
      <Modal
        visible={stage === 'confirm' || stage === 'wiping'}
        transparent
        animationType="fade"
        onRequestClose={() => { if (stage === 'confirm') onStageChange('idle'); }}
      >
        {stage === 'wiping' ? (
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
            <View
              style={{
                width: '100%',
                maxWidth: 280,
                backgroundColor: t.bgCard,
                borderRadius: 16,
                padding: 28,
                alignItems: 'center',
              }}
            >
              <Ionicons name="shield-checkmark" size={28} color={t.correct} />
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
                {L('Сохраняем прогресс', 'Зберігаємо прогрес', 'Saving progress', 'Guardando progreso', 'Salvando progresso', 'Đang lưu tiến độ', 'Menyimpan progres', 'İlerleme kaydediliyor', 'Zapisywanie postępu')}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 6, textAlign: 'center' }}>
                {L('Не закрывай приложение', 'Не закривай застосунок', 'Don\'t close the app', 'No cierres la app', 'Não feche o app', 'Đừng đóng ứng dụng', 'Jangan tutup aplikasi', 'Uygulamayı kapatma', 'Nie zamykaj aplikacji')}
              </Text>
            </View>
          </View>
        ) : (
        /* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»):
           карточка подтверждения выхода центрировалась без прокрутки — на
           низком экране кнопки «Выйти»/«Отмена» уходили за границу. */
        <ScrollView decelerationRate="fast"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: t.bgCard,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 12 }}>
              {L('Выйти из аккаунта?', 'Вийти з акаунту?', 'Sign out?', '¿Cerrar sesión?', 'Sair da conta?', 'Đăng xuất?', 'Keluar dari akun?', 'Hesaptan çıkılsın mı?', 'Wylogować się?')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22, marginBottom: 8 }}>
              {L(
                'Текущий прогресс останется привязан к аккаунту, под которым ты сейчас вошёл. Чтобы вернуться — войди под ним снова.',
                "Поточний прогрес залишиться прив\'язаним до акаунту, під яким ти зараз увійшов. Щоб повернутися до нього — увійди тим самим акаунтом знову.",
                'Your current progress will stay linked to the account you\'re signed in with now. To come back, sign in with it again.',
                'Tu progreso quedará vinculado a la cuenta con la que iniciaste sesión. Para recuperarlo, vuelve a entrar con la misma cuenta.',
                'Seu progresso atual ficará vinculado à conta em que você está conectado agora. Para voltar, entre nela novamente.',
                'Tiến độ hiện tại sẽ gắn với tài khoản bạn đang đăng nhập. Muốn quay lại, hãy đăng nhập lại bằng tài khoản đó.',
                'Progres saat ini akan tetap terhubung ke akun yang sedang kamu pakai. Untuk kembali, masuk lagi dengan akun yang sama.',
                'Mevcut ilerlemen şu anda giriş yaptığın hesaba bağlı kalacak. Geri dönmek için aynı hesapla tekrar giriş yap.',
                'Obecny postęp pozostanie przypisany do konta, na którym jesteś teraz zalogowany. Aby wrócić, zaloguj się na nie ponownie.',
              )}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, lineHeight: 20 }}>
              {L(
                'Перед выходом надёжно сохраним прогресс. Если соединение не ответит — отменим выход, чтобы ничего не потерялось.',
                'Перед виходом надійно збережемо прогрес. Якщо з’єднання не відповість — скасуємо вихід, щоб нічого не загубилося.',
                'Before signing out we\'ll safely save your progress. If the connection doesn\'t respond, we\'ll cancel the sign-out so nothing is lost.',
                'Antes de cerrar sesión guardaremos tu progreso de forma segura. Si la conexión no responde, cancelaremos la salida para que no pierdas nada.',
                'Antes de sair, salvaremos seu progresso com segurança. Se a conexão não responder, cancelaremos a saída para que nada se perca.',
                'Trước khi đăng xuất, chúng tôi sẽ lưu tiến độ của bạn an toàn. Nếu kết nối không phản hồi, việc đăng xuất sẽ bị hủy để không mất gì.',
                'Sebelum keluar, progresmu akan disimpan dengan aman. Jika koneksi tidak merespons, keluar dibatalkan agar tidak ada yang hilang.',
                'Çıkmadan önce ilerlemeni güvenle kaydedeceğiz. Bağlantı yanıt vermezse hiçbir şey kaybolmasın diye çıkışı iptal edeceğiz.',
                'Przed wylogowaniem bezpiecznie zapiszemy Twój postęp. Jeśli połączenie nie odpowie, anulujemy wylogowanie, aby nic nie przepadło.',
              )}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                onPress={() => onStageChange('idle')}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>
                  {L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                testID="account-logout-confirm"
                onPress={() => { void runLogout(); }}
                style={{ paddingHorizontal: 10, paddingVertical: 8 }}
              >
                <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '800' }}>
                  {L('Выйти', 'Вийти', 'Sign out', 'Salir', 'Sair', 'Đăng xuất', 'Keluar', 'Çıkış yap', 'Wyloguj')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        )}
      </Modal>
    </>
  );
}
