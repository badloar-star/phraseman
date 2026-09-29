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
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { signOutAndWipeForAccountSwitch } from '../../app/auth_provider';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';
import { DebugLogger } from '../../app/debug-logger';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';

export type LogoutStage = 'idle' | 'confirm' | 'wiping' | 'failed';

interface AccountLogoutFlowProps {
  stage: LogoutStage;
  onStageChange: (stage: LogoutStage) => void;
  /** Выход завершён: локальные данные вычищены, можно предлагать вход. */
  onSignedOut: (result: { synced: boolean }) => void;
}

export default function AccountLogoutFlow({ stage, onStageChange, onSignedOut }: AccountLogoutFlowProps) {
  const { theme: t, liquidGlassThemeId, f } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { lang } = useLang();
  const L = (
    ru: string, uk: string, en: string, es: string, ptBr: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });

  // зачем (владелец, 2026-09-22): отказ показываем ВНУТРИ уже открытого модала,
  // а не отдельным нативным алертом поверх него.
  //
  // Раньше отказ делал onStageChange('idle') (закрывает этот <Modal>) и через
  // 360 мс презентовал ThemedBlockingAlertHost — второй нативный <Modal>. Это
  // ровно тот present-during-dismiss, от которого на iOS ломается стек
  // презентаций: окно не появлялось, а экран настроек намертво переставал
  // принимать тапы и скролл. Владелец видел это как «выход не происходит, а
  // если закрыть раздел — всё зависает». Лог с телефона:
  //   reason=backup_failed detail=account_switch_backup_other_owner_pending
  //   context=AccountLogoutFlow:wipe_failed
  // Зазор в 360 мс проблему не решал — он лечил симптом, а не второй present.
  // Теперь нативный модал ОДИН на весь флоу, меняется только его содержимое.
  const [failureText, setFailureText] = useState<string | null>(null);

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
    setFailureText(null);
    const res = await signOutAndWipeForAccountSwitch();
    // guard-ok: этот отказ пришёл с БОЕВОГО телефона (Telegram-алерт), под
    // __DEV__ его бы не было видно вообще — а именно его невидимость и стоила
    // владельцу кругов работы. Одна строка на нажатие «Выйти», не в кадре.
    console.log('[ACC-MUT] ui:logout_attempt_1', JSON.stringify({
      ok: res.ok,
      reason: res.ok ? null : res.reason,
      detail: !res.ok && 'detail' in res ? String(res.detail ?? '') : null,
    }));
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
    // guard-ok: см. причину выше — отказ виден только на боевом телефоне.
    console.log('[ACC-MUT] ui:logout_attempt_2_forced', JSON.stringify({
      ok: forced.ok,
      reason: forced.ok ? null : forced.reason,
      detail: !forced.ok && 'detail' in forced ? String(forced.detail ?? '') : null,
    }));
    if (forced.ok) {
      onStageChange('idle');
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
    // зачем (владелец, 2026-09-22): модал НЕ закрываем. Раньше здесь стоял
    // onStageChange('idle') ВЫШЕ этой проверки — он закрывал окно даже при
    // отказе, а сообщение пыталось презентоваться отдельным нативным модалом
    // поверх закрывающегося. Отсюда «ничего не происходит, а потом всё висит».
    // Теперь сообщение живёт в том же окне: показываем причину и даём выход.
    setFailureText(L(
      'Не удалось выйти. Перезапусти приложение и попробуй снова.',
      'Не вдалося вийти. Перезапусти застосунок і спробуй знову.',
      "Couldn't sign out. Restart the app and try again.",
      'No se pudo salir. Reinicia la aplicación e inténtalo de nuevo.',
      'Não foi possível sair. Reinicie o app e tente novamente.',
      'Không thể đăng xuất. Hãy khởi động lại ứng dụng và thử lại.',
      'Tidak bisa keluar. Mulai ulang aplikasi lalu coba lagi.',
      'Çıkış yapılamadı. Uygulamayı yeniden başlatıp tekrar dene.',
      'Nie udało się wylogować. Uruchom aplikację ponownie i spróbuj jeszcze raz.',
    ));
    onStageChange('failed');
  };

  // зачем: окно выхода — Liquid Glass по макету PRF-20: непрозрачная основа темы, нейтральный CTA,
  // «Отмена» тоном темы; красный — только у иконки отказа (семантика ошибки). Один нативный
  // <Modal> на три стадии сохранён (см. комментарий ниже) — меняется лишь содержимое.
  const cardStyle = {
    width: '100%' as const,
    maxWidth: 380,
    backgroundColor: glass.opaqueSheet,
    borderRadius: 28,
    padding: 22,
  };
  const buttonStyle = {
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
        visible={stage === 'confirm' || stage === 'wiping' || stage === 'failed'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          // Из отказа выпускаем по системному жесту — тупика быть не должно.
          if (stage === 'confirm' || stage === 'failed') onStageChange('idle');
        }}
      >
        {/* зачем 2026-08-02 (владелец: «на маленьких экранах кнопки нет»): карточка
            центрируется внутри прокрутки — на низком экране кнопки не уходят за границу.
            Прокрутка теперь общая для всех трёх стадий (крупный шрифт тоже переполняет). */}
        <ScrollView
          decelerationRate="fast"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {stage === 'failed' ? (
            <View style={[cardStyle, { alignItems: 'center' }]}>
              <View
                style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.selected }}
              >
                <Ionicons name="alert-circle" size={28} color={t.wrong} />
              </View>
              <Text accessibilityRole="header" style={{ color: glass.text, fontSize: f.h2, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
                {L('Не удалось выйти', 'Не вдалося вийти', "Couldn't sign out", 'No se pudo salir', 'Não foi possível sair', 'Không thể đăng xuất', 'Tidak bisa keluar', 'Çıkış yapılamadı', 'Nie udało się wylogować')}
              </Text>
              <Text style={{ color: glass.secondary, fontSize: f.body, lineHeight: f.body * 1.45, marginTop: 8, textAlign: 'center' }}>
                {failureText ?? ''}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                testID="account-logout-failed-close"
                onPress={() => { doHaptic(); onStageChange('idle'); }}
                style={[buttonStyle, { alignSelf: 'stretch', marginTop: 22, backgroundColor: glass.cta }]}
              >
                <Text style={{ color: glass.ctaInk, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {L('Понятно', 'Зрозуміло', 'OK', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Tamam', 'Rozumiem')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : stage === 'wiping' ? (
            <View
              accessibilityLiveRegion="polite"
              style={[cardStyle, { maxWidth: 320, paddingVertical: 28, alignItems: 'center' }]}
            >
              <ActivityIndicator size="large" color={glass.text} />
              <Text accessibilityRole="header" style={{ color: glass.text, fontSize: f.body, fontWeight: '700', marginTop: 18, textAlign: 'center' }}>
                {L('Сохраняем прогресс', 'Зберігаємо прогрес', 'Saving progress', 'Guardando progreso', 'Salvando progresso', 'Đang lưu tiến độ', 'Menyimpan progres', 'İlerleme kaydediliyor', 'Zapisywanie postępu')}
              </Text>
              <Text style={{ color: glass.secondary, fontSize: f.sub, marginTop: 6, textAlign: 'center' }}>
                {L('Не закрывай приложение', 'Не закривай застосунок', 'Don\'t close the app', 'No cierres la app', 'Não feche o app', 'Đừng đóng ứng dụng', 'Jangan tutup aplikasi', 'Uygulamayı kapatma', 'Nie zamykaj aplikacji')}
              </Text>
            </View>
          ) : (
            <View style={cardStyle}>
              <Text accessibilityRole="header" style={{ color: glass.text, fontSize: f.h2, fontWeight: '700', marginBottom: 12 }}>
                {L('Выйти из аккаунта?', 'Вийти з акаунту?', 'Sign out?', '¿Cerrar sesión?', 'Sair da conta?', 'Đăng xuất?', 'Keluar dari akun?', 'Hesaptan çıkılsın mı?', 'Wylogować się?')}
              </Text>
              <Text style={{ color: glass.secondary, fontSize: f.body, lineHeight: f.body * 1.45, marginBottom: 10 }}>
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
              <Text style={{ color: glass.secondary, fontSize: f.sub, lineHeight: f.sub * 1.45 }}>
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

              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                testID="account-logout-confirm"
                onPress={() => { void runLogout(); }}
                style={[buttonStyle, { marginTop: 22, backgroundColor: glass.cta }]}
              >
                <Text style={{ color: glass.ctaInk, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {L('Выйти', 'Вийти', 'Sign out', 'Salir', 'Sair', 'Đăng xuất', 'Keluar', 'Çıkış yap', 'Wyloguj')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                testID="account-logout-cancel"
                onPress={() => onStageChange('idle')}
                style={[buttonStyle, { marginTop: 10, backgroundColor: glass.selected }]}
              >
                <Text style={{ color: glass.text, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
                  {L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </Modal>
    </>
  );
}
