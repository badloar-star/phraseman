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
import { actionBoxShadow, nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import { ThemeAccentFill } from '../v2/ThemeAccentFill';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,0.6)'; // theme-exempt: затемнение под окном — тёмный скрим в любой теме

export type LogoutStage = 'idle' | 'confirm' | 'wiping' | 'failed';

/** Потолок ожидания облака при выходе (вариант Б): дальше — локальная аварийная копия и стирание. */
export const LOGOUT_SYNC_DEADLINE_MS = 3000;

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

  // зачем: стадию 'wiping' ставит экран аккаунта сразу по тапу «Выйти» (выход мгновенный, решение владельца 31.08)
  // или requestLogout («Повторить» после отказа) — здесь ловим её и запускаем выход ровно один раз.
  const logoutStartedRef = useRef(false);
  useEffect(() => {
    if (stage !== 'wiping' || logoutStartedRef.current) return;
    logoutStartedRef.current = true;
    void runLogout().finally(() => { logoutStartedRef.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // зачем: единая точка «начать выход» для кнопок подтверждения и повтора — защита от двойного тапа
  // и от двойного запуска (кнопка + эффект стадии 'wiping').
  const requestLogout = (source: 'confirm' | 'failed_retry') => {
    if (logoutStartedRef.current || stage === 'wiping') {
      console.warn(`[ACC-MUT] ui:logout_request_ignored source=${source} reason=${logoutStartedRef.current ? 'already_running' : 'stage_wiping'}`);
      return;
    }
    console.log(`[ACC-MUT] ui:logout_requested source=${source}`); // guard-ok: одна строка на нажатие, боевой след
    onStageChange('wiping');
  };

  const runLogout = async () => {
    doHaptic();
    // зачем (координатор 18.10 04:52, R131): [AUTH-LOGOUT] — тап, обе попытки с длительностью и что увидел человек.
    const tapAtMs = Date.now();
    console.log('[AUTH-LOGOUT]', JSON.stringify({ stage: 'ui_tap', userSees: 'button_saving_progress' })); // guard-ok: одна строка на тап
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
    // зачем (вариант Б, координатор 12.10; владелец 31.08 «выход мгновенный»): сеть ждём не дольше LOGOUT_SYNC_DEADLINE_MS,
    // дальше — аварийная копия на телефоне и стирание; облако догонит при следующем входе этим аккаунтом здесь.
    const res = await signOutAndWipeForAccountSwitch({ syncDeadlineMs: LOGOUT_SYNC_DEADLINE_MS, allowWipeWithoutSync: true });
    // guard-ok: этот отказ пришёл с БОЕВОГО телефона (Telegram-алерт), под
    // __DEV__ его бы не было видно вообще — а именно его невидимость и стоила
    // владельцу кругов работы. Одна строка на нажатие «Выйти», не в кадре.
    console.log('[ACC-MUT] ui:logout_attempt_1', JSON.stringify({
      ok: res.ok,
      reason: res.ok ? null : res.reason,
      detail: !res.ok && 'detail' in res ? String(res.detail ?? '') : null,
    }));
    console.log('[AUTH-LOGOUT]', JSON.stringify({ stage: 'ui_attempt_1', ok: res.ok, reason: res.ok ? null : res.reason, ms: Date.now() - tapAtMs })); // guard-ok: итог попытки
    if (res.ok) {
      console.log('[AUTH-LOGOUT]', JSON.stringify({ stage: 'ui_done', userSees: 'sign_in_sheet', synced: res.synced, totalMs: Date.now() - tapAtMs })); // guard-ok: итог
      onStageChange('idle');
      onSignedOut({ synced: res.synced });
      return;
    }
    // Синхронизация не успела (нет сети / очередь занята) — это НЕ повод
    // держать человека в аккаунте: локальная аварийная копия уже записана.
    const forced = await signOutAndWipeForAccountSwitch({
      syncDeadlineMs: LOGOUT_SYNC_DEADLINE_MS,
      allowWipeWithoutSync: true,
      allowPendingShardSpendDiscard: true,
    });
    // guard-ok: см. причину выше — отказ виден только на боевом телефоне.
    console.log('[ACC-MUT] ui:logout_attempt_2_forced', JSON.stringify({
      ok: forced.ok,
      reason: forced.ok ? null : forced.reason,
      detail: !forced.ok && 'detail' in forced ? String(forced.detail ?? '') : null,
    }));
    console.log('[AUTH-LOGOUT]', JSON.stringify({ stage: 'ui_attempt_2_forced', ok: forced.ok, reason: forced.ok ? null : forced.reason, ms: Date.now() - tapAtMs })); // guard-ok: итог попытки
    if (forced.ok) {
      console.log('[AUTH-LOGOUT]', JSON.stringify({ stage: 'ui_done', userSees: 'sign_in_sheet', synced: forced.synced, forced: true, totalMs: Date.now() - tapAtMs })); // guard-ok: итог
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
    console.warn('[AUTH-LOGOUT]', JSON.stringify({ stage: 'ui_failed', userSees: recovery ? 'failed_restart' : 'failed_retry', reason: forced.reason, totalMs: Date.now() - tapAtMs })); // guard-ok: что увидел человек
    setFailureKind(recovery ? 'recovery' : 'precommit');
    setFailureText(recovery
      // зачем: паритет profile.html PRF-20-ATTENTION (13.10): это ВЫХОД, а не «смена аккаунта» — тексты про выход, на «ты».
      ? L(
        'Старый аккаунт не считается закрытым. Перезапусти приложение и попробуй снова.',
        'Старий акаунт не вважається закритим. Перезапусти застосунок і спробуй ще раз.',
        "The old account isn't considered closed. Restart the app and try again.",
        'La cuenta anterior no se considera cerrada. Reinicia la app e inténtalo de nuevo.',
        'A conta anterior não é considerada encerrada. Reinicie o app e tente de novo.',
        'Tài khoản cũ chưa được coi là đã đóng. Hãy khởi động lại ứng dụng và thử lại.',
        'Akun lama belum dianggap tertutup. Mulai ulang aplikasi dan coba lagi.',
        'Eski hesap kapatılmış sayılmıyor. Uygulamayı yeniden başlat ve tekrar dene.',
        'Poprzednie konto wciąż jest otwarte. Uruchom aplikację ponownie i spróbuj jeszcze raz.',
      )
      : L(
        'Аккаунт и данные на телефоне не изменены. Попробуй ещё раз.',
        'Акаунт і дані на телефоні не змінено. Спробуй ще раз.',
        'Your account and the data on this phone are unchanged. Try again.',
        'Tu cuenta y los datos del teléfono no cambiaron. Inténtalo de nuevo.',
        'Sua conta e os dados do telefone não mudaram. Tente de novo.',
        'Tài khoản và dữ liệu trên điện thoại không thay đổi. Hãy thử lại.',
        'Akun dan data di ponsel tidak berubah. Coba lagi.',
        'Hesabın ve telefondaki veriler değişmedi. Tekrar dene.',
        'Konto i dane na telefonie są bez zmian. Spróbuj jeszcze raz.',
      ));
    onStageChange('failed');
  };

  // зачем: окно выхода — Liquid Glass по макету PRF-20: непрозрачная основа темы, нейтральный CTA,
  // «Отмена» тоном темы; красный — только у иконки отказа (семантика ошибки). Один нативный
  // <Modal> на три стадии сохранён (см. комментарий ниже) — меняется лишь содержимое.
  // зачем (координатор 05.10, вывод по 017/018): это «Выйти» с экрана аккаунта — эталон profile.html logout (PRF-20),
  // а не «Сменить аккаунт?» из overlays-runtime (другой сценарий). `.modal`: поля 24/20/20, r26, кромка --line-2, края 20;
  // заголовок 22/28; текст 16/22 (D145) через 8; подтверждение — кнопки столбиком 48: главная сверху, `.cta.gh` под ней;
  // выход — крутилка. Отказ (overlays-runtime 036/037, стадии аккаунта): плитка с замком 68 и кнопки в ряд 44.
  const cardStyle = {
    width: '100%' as const,
    maxWidth: 360,
    backgroundColor: glass.opaqueSheet,
    borderRadius: 26,
    // зачем (стиль «Тень», владелец 12.10): окно по центру — тень вместо кромки; overflow: hidden убран, он резал бы тень (заливку со скруглением даёт KitGlassLayer)
    boxShadow: plateBoxShadow(glass),
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  };
  const buttonStyle = {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  // зачем (стиль «Тень»): `.cta.gh` — плашка тоном с малой тенью вместо контура; главная — цвет темы и цветная тень (клип overflow убран: ThemeAccentFill сам со скруглением)
  // зачем ([BLEND-AUTH] 18.10): «Отмена» opaqueControl сливалась со шторкой (1,00), главная на сыром accent — в светлых градиентных темах;
  // buttonFill держит тон ≥ 1,5, ctaFill/ctaFillInk — ≥ 3 / 4,5
  const ghostButton = { backgroundColor: glass.buttonFill, boxShadow: nestedBoxShadow(glass) };
  const accentButton = { backgroundColor: glass.ctaFill, boxShadow: actionBoxShadow(glass) };
  const stageStyle = { width: 68, height: 68, borderRadius: 23, alignSelf: 'center' as const, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 15, backgroundColor: glass.opaqueControl };
  const titleStyle = { color: glass.text, fontSize: 22, lineHeight: 28, fontWeight: '800' as const, textAlign: 'center' as const };
  const bodyStyle = { color: glass.secondary, fontSize: 16, lineHeight: 22, marginTop: 8, textAlign: 'center' as const };
  // `.cta` в столбик (подтверждение выхода): 48, r24, на всю ширину.
  const stackButton = { minHeight: 48, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' as const, justifyContent: 'center' as const };
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
      {/* зачем (координатор 18.10, Optimistic UI выхода): в стадии 'wiping' окна нет — «Сохраняем прогресс…» с маленьким
          индикатором показывает сама строка «Выйти» на экране «Аккаунт» (account_details.tsx), уход с экрана там же
          заблокирован. confirm→wiping только закрывает окно, idle→failed только открывает — present-during-dismiss нет. */}
      <Modal
        visible={stage === 'confirm' || stage === 'failed'}
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
          style={{ flex: 1, backgroundColor: EXEMPT_COLOR_1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {stage === 'failed' ? (
            <View style={cardStyle}>
              <KitGlassLayer radius={26} />
              <View style={stageStyle}>
                <Ionicons name="lock-closed" size={26} color={glass.text} />
              </View>
              <Text accessibilityRole="header" style={titleStyle}>
                {/* зачем: паритет profile.html PRF-20-ATTENTION (13.10): заголовок отказа — «Не удалось выйти» для обоих видов */}
                {L('Не удалось выйти', 'Не вдалося вийти', "Couldn't sign out", 'No se pudo cerrar sesión', 'Não foi possível sair', 'Không thể đăng xuất', 'Gagal keluar', 'Çıkış yapılamadı', 'Nie udało się wylogować')}
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
                  style={[buttonStyle, failureKind === 'recovery' ? accentButton : ghostButton]}
                >
                  {failureKind === 'recovery' ? <ThemeAccentFill glass={glass} radius={22} /> : null}
                  <Text style={[ctaText, { color: failureKind === 'recovery' ? glass.accentInk : glass.text }]}>
                    {failureKind === 'recovery'
                      // зачем: паритет PRF-20-ATTENTION — единственная кнопка «Понятно» (повтор до перезапуска запрещён)
                      ? L('Понятно', 'Зрозуміло', 'Got it', 'Entendido', 'Entendi', 'Đã hiểu', 'Mengerti', 'Anladım', 'Rozumiem')
                      : L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
                  </Text>
                </TouchableOpacity>
                {failureKind === 'precommit' ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    testID="account-logout-failed-retry"
                    // зачем: только смена стадии — выход запускает эффект ровно один раз (прямой runLogout()
                    // тут же переводил стадию в 'wiping', и эффект запускал ВТОРОЙ выход параллельно).
                    onPress={() => { requestLogout('failed_retry'); }}
                    style={[buttonStyle, accentButton]}
                  >
                    <ThemeAccentFill glass={glass} radius={22} />
                    <Text style={[ctaText, { color: glass.ctaFillInk }]}>
                      {L('Повторить', 'Повторити', 'Retry', 'Reintentar', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Ponów')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={cardStyle}>
              <KitGlassLayer radius={26} />
              <Text accessibilityRole="header" style={titleStyle}>
                {L('Выйти из аккаунта?', 'Вийти з акаунта?', 'Sign out?', '¿Cerrar sesión?', 'Sair da conta?', 'Đăng xuất?', 'Keluar dari akun?', 'Hesaptan çıkılsın mı?', 'Wylogować się?')}
              </Text>
              <Text style={bodyStyle}>
                {L(
                  'Текущий прогресс останется привязан к аккаунту, под которым ты сейчас вошёл. Чтобы вернуться — войди под ним снова.',
                  "Поточний прогрес залишиться прив\'язаним до акаунта, під яким ти зараз увійшов. Щоб повернутися до нього — увійди тим самим акаунтом знову.",
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
                  // зачем: текст обязан совпадать с поведением — без сети выход НЕ отменяется (решение владельца 31.08),
                  // прогресс остаётся аварийной копией на телефоне и возвращается при следующем входе в этот аккаунт.
                  'Перед выходом сохраним прогресс. Если сети нет, он останется на телефоне и вернётся, когда ты снова войдёшь в этот аккаунт.',
                  'Перед виходом збережемо прогрес. Якщо мережі немає, він залишиться на телефоні й повернеться, коли ти знову увійдеш у цей акаунт.',
                  "We'll save your progress before signing out. If you're offline, it stays on this phone and comes back when you sign in to this account again.",
                  'Guardaremos tu progreso antes de salir. Si no hay conexión, se queda en el teléfono y vuelve cuando entres de nuevo en esta cuenta.',
                  'Vamos salvar seu progresso antes de sair. Sem conexão, ele fica no telefone e volta quando você entrar de novo nesta conta.',
                  'Tiến độ sẽ được lưu trước khi đăng xuất. Nếu không có mạng, nó ở lại trên điện thoại và quay lại khi bạn đăng nhập lại tài khoản này.',
                  'Progresmu disimpan sebelum keluar. Jika tidak ada koneksi, progres tetap di ponsel dan kembali saat kamu masuk lagi ke akun ini.',
                  'Çıkmadan önce ilerlemeni kaydedeceğiz. İnternet yoksa telefonda kalır ve bu hesaba tekrar girdiğinde geri gelir.',
                  'Przed wylogowaniem zapiszemy postęp. Bez sieci zostanie w telefonie i wróci, gdy znów zalogujesz się na to konto.',
                )}
              </Text>

              <View style={{ marginTop: 18, gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  testID="account-logout-confirm"
                  onPress={() => { requestLogout('confirm'); }}
                  style={[stackButton, accentButton]}
                >
                  <ThemeAccentFill glass={glass} radius={24} />
                  <Text style={[ctaText, { color: glass.ctaFillInk }]}>
                    {L('Выйти', 'Вийти', 'Sign out', 'Salir', 'Sair', 'Đăng xuất', 'Keluar', 'Çıkış yap', 'Wyloguj')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  testID="account-logout-cancel"
                  onPress={() => onStageChange('idle')}
                  style={[stackButton, ghostButton]}
                >
                  <Text style={[ctaText, { color: glass.text }]}>
                    {L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
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
