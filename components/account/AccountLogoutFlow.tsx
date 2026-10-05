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
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { signOutAndWipeForAccountSwitch } from '../../app/auth_provider';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';
import { DebugLogger } from '../../app/debug-logger';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { KitGlassLayer } from '../v2/KitLiquidGlass';
import { ThemeAccentFill } from '../v2/ThemeAccentFill';

export type LogoutStage = 'idle' | 'confirm' | 'wiping' | 'failed';

interface AccountLogoutFlowProps {
  stage: LogoutStage;
  onStageChange: (stage: LogoutStage) => void;
  /** Выход завершён: локальные данные вычищены, можно предлагать вход. */
  onSignedOut: (result: { synced: boolean }) => void;
}

export default function AccountLogoutFlow({ stage, onStageChange, onSignedOut }: AccountLogoutFlowProps) {
  const { liquidGlassThemeId } = useTheme();
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
  // зачем (макет overlays-runtime.html OR-ACCOUNT-SWITCH-*): два разных отказа.
  // 'precommit' — защита остановила смену ДО маркера: ничего не изменено, повтор безопасен.
  // 'recovery' — маркер уже мог быть записан: слепой повтор запрещён, только перезапуск.
  const [failureKind, setFailureKind] = useState<'precommit' | 'recovery'>('precommit');

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
    const recovery = forced.reason === 'recovery_required' || forced.reason === 'wipe_failed';
    console.warn('[ACC-MUT] ui:logout_failed_kind', { reason: forced.reason, kind: recovery ? 'recovery' : 'precommit' });
    setFailureKind(recovery ? 'recovery' : 'precommit');
    setFailureText(recovery
      ? L(
        'Защитный маркер уже мог быть записан. Перезапусти приложение, чтобы продолжить восстановление состояния.',
        'Захисний маркер уже міг бути записаний. Перезапусти застосунок, щоб продовжити відновлення стану.',
        'A safety marker may already have been written. Restart the app to continue restoring the state.',
        'Puede que ya se haya guardado un marcador de seguridad. Reinicia la app para continuar la recuperación.',
        'Um marcador de segurança pode já ter sido gravado. Reinicie o app para continuar a recuperação.',
        'Dấu an toàn có thể đã được ghi. Hãy khởi động lại ứng dụng để tiếp tục khôi phục.',
        'Penanda pengaman mungkin sudah tertulis. Mulai ulang aplikasi untuk melanjutkan pemulihan.',
        'Güvenlik işareti yazılmış olabilir. Kurtarmaya devam etmek için uygulamayı yeniden başlat.',
        'Znacznik bezpieczeństwa mógł już zostać zapisany. Uruchom aplikację ponownie, aby dokończyć przywracanie.',
      )
      : L(
        'Защитная проверка остановила смену до записи маркера. Аккаунт и локальные данные не изменены.',
        'Захисна перевірка зупинила зміну до запису маркера. Акаунт і локальні дані не змінено.',
        'A safety check stopped the switch before the marker was written. Your account and local data are unchanged.',
        'Una comprobación de seguridad detuvo el cambio antes de guardar el marcador. Tu cuenta y tus datos no cambiaron.',
        'Uma verificação de segurança parou a troca antes de gravar o marcador. Sua conta e seus dados não mudaram.',
        'Kiểm tra an toàn đã dừng việc đổi trước khi ghi dấu. Tài khoản và dữ liệu trên máy không thay đổi.',
        'Pemeriksaan keamanan menghentikan pergantian sebelum penanda ditulis. Akun dan data lokal tidak berubah.',
        'Güvenlik kontrolü değişimi işaret yazılmadan durdurdu. Hesabın ve yerel verilerin değişmedi.',
        'Kontrola bezpieczeństwa zatrzymała zmianę przed zapisaniem znacznika. Konto i dane lokalne są bez zmian.',
      ));
    onStageChange('failed');
  };

  // зачем: окно выхода — Liquid Glass по макету PRF-20: непрозрачная основа темы, нейтральный CTA,
  // «Отмена» тоном темы; красный — только у иконки отказа (семантика ошибки). Один нативный
  // <Modal> на три стадии сохранён (см. комментарий ниже) — меняется лишь содержимое.
  // зачем (Сверка overlays-runtime 017/018/036/037, 05.10): карточка = `.or-alert` — поля 20, r25, кромка --line-2,
  // стекло; плитка 68 (r23) со значком; заголовок 23/29 по центру; текст 16/22 (D145) через 9; кнопки в ряд 44 через 18,
  // прозрачная «Отмена» (`.cta.gh`) слева, действие справа. Было: r28, поля 22, круг 56, кнопки 48 столбиком.
  const cardStyle = {
    width: '100%' as const,
    maxWidth: 360,
    backgroundColor: glass.opaqueSheet,
    borderRadius: 25,
    borderWidth: 1, // guard-ok: 1 px кромка .or-alert
    borderColor: glass.glassEdge,
    padding: 20,
    overflow: 'hidden' as const,
  };
  const buttonStyle = {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };
  const ghostButton = { borderWidth: 1, borderColor: glass.text.length === 7 ? `${glass.text}4D` : glass.glassEdge, backgroundColor: 'transparent' }; // guard-ok: .cta.gh
  const stageStyle = { width: 68, height: 68, borderRadius: 23, alignSelf: 'center' as const, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 15, backgroundColor: glass.opaqueControl };
  const titleStyle = { color: glass.text, fontSize: 23, lineHeight: 29, fontWeight: '800' as const, textAlign: 'center' as const };
  const bodyStyle = { color: glass.secondary, fontSize: 16, lineHeight: 22, marginTop: 9, textAlign: 'center' as const };
  const ctaText = { fontSize: 16, fontWeight: '700' as const, textAlign: 'center' as const };

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
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {stage === 'failed' ? (
            <View style={cardStyle}>
              <KitGlassLayer radius={25} />
              <View style={stageStyle}>
                <Ionicons name="lock-closed" size={26} color={glass.text} />
              </View>
              <Text accessibilityRole="header" style={titleStyle}>
                {failureKind === 'recovery'
                  ? L('Нужно завершить смену аккаунта', 'Потрібно завершити зміну акаунту', 'Finish the account switch', 'Hay que terminar el cambio de cuenta', 'É preciso concluir a troca de conta', 'Cần hoàn tất việc đổi tài khoản', 'Selesaikan pergantian akun', 'Hesap değişimini tamamlaman gerekiyor', 'Trzeba dokończyć zmianę konta')
                  : L('Смена аккаунта не началась', 'Зміна акаунту не почалася', "The account switch didn't start", 'El cambio de cuenta no empezó', 'A troca de conta não começou', 'Việc đổi tài khoản chưa bắt đầu', 'Pergantian akun belum dimulai', 'Hesap değişimi başlamadı', 'Zmiana konta się nie rozpoczęła')}
              </Text>
              <Text style={bodyStyle}>
                {failureText ?? ''}
              </Text>
              <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: 9, marginTop: 18 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  testID="account-logout-failed-close"
                  onPress={() => { doHaptic(); onStageChange('idle'); }}
                  style={[buttonStyle, failureKind === 'recovery' ? { backgroundColor: glass.accent } : ghostButton]}
                >
                  {failureKind === 'recovery' ? <ThemeAccentFill glass={glass} radius={22} /> : null}
                  <Text style={[ctaText, { color: failureKind === 'recovery' ? glass.accentInk : glass.text }]}>
                    {L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
                  </Text>
                </TouchableOpacity>
                {failureKind === 'precommit' ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    testID="account-logout-failed-retry"
                    onPress={() => { void runLogout(); }}
                    style={[buttonStyle, { backgroundColor: glass.accent }]}
                  >
                    <ThemeAccentFill glass={glass} radius={22} />
                    <Text style={[ctaText, { color: glass.accentInk }]}>
                      {L('Повторить', 'Повторити', 'Retry', 'Reintentar', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Ponów')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : stage === 'wiping' ? (
            <View
              accessibilityLiveRegion="polite"
              style={cardStyle}
            >
              <KitGlassLayer radius={25} />
              <View style={stageStyle}>
                <Ionicons name="lock-closed" size={26} color={glass.text} />
              </View>
              <Text accessibilityRole="header" style={titleStyle}>
                {L('Сохраняем прогресс', 'Зберігаємо прогрес', 'Saving progress', 'Guardando progreso', 'Salvando progresso', 'Đang lưu tiến độ', 'Menyimpan progres', 'İlerleme kaydediliyor', 'Zapisywanie postępu')}
              </Text>
              <Text style={bodyStyle}>
                {L('Не закрывай приложение', 'Не закривай застосунок', 'Don\'t close the app', 'No cierres la app', 'Não feche o app', 'Đừng đóng ứng dụng', 'Jangan tutup aplikasi', 'Uygulamayı kapatma', 'Nie zamykaj aplikacji')}
              </Text>
            </View>
          ) : (
            <View style={cardStyle}>
              <KitGlassLayer radius={25} />
              <Text accessibilityRole="header" style={titleStyle}>
                {L('Выйти из аккаунта?', 'Вийти з акаунту?', 'Sign out?', '¿Cerrar sesión?', 'Sair da conta?', 'Đăng xuất?', 'Keluar dari akun?', 'Hesaptan çıkılsın mı?', 'Wylogować się?')}
              </Text>
              <Text style={bodyStyle}>
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
              {/* `.or-next`: второй абзац тем же стилем через 9 */}
              <Text style={bodyStyle}>
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

              <View style={{ flexDirection: 'row', gap: 9, marginTop: 18 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  testID="account-logout-cancel"
                  onPress={() => onStageChange('idle')}
                  style={[buttonStyle, ghostButton]}
                >
                  <Text style={[ctaText, { color: glass.text }]}>
                    {L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  testID="account-logout-confirm"
                  onPress={() => { void runLogout(); }}
                  style={[buttonStyle, { backgroundColor: glass.accent }]}
                >
                  <ThemeAccentFill glass={glass} radius={22} />
                  <Text style={[ctaText, { color: glass.accentInk }]}>
                    {L('Выйти', 'Вийти', 'Sign out', 'Salir', 'Sair', 'Đăng xuất', 'Keluar', 'Çıkış yap', 'Wyloguj')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </Modal>
    </>
  );
}
