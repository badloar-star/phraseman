// ════════════════════════════════════════════════════════════════════════════
// account_details.tsx — экран «Аккаунт» (Liquid Glass, макет profile.html#PRF-02).
//
// зачем: владелец попросил раздел аккаунта «как в Bevel» — аватар-инициалы
// с крупным именем, карточка данных со значениями справа (имя, email с
// копированием, способ входа, «с нами с …») и две кнопки внизу: «Выйти» и
// красная «Удалить аккаунт». Открывается из настроек по ряду «Аккаунт».
//
// зачем (владелец 2026-09-29): перенос 1 в 1 по макету — монета ранга + имя + «Изменить имя»,
// секции «Данные» и «Аккаунт» плотными стеклянными строками. Только вид: логика привязки,
// копирования, выхода и удаления не менялась.
//
// Первый кадр = финальная геометрия (Performance Bible):
//   • имя — синхронно из app-снапшота;
//   • привязка (провайдер/email) — синхронно из auth.currentUser
//     (peekLinkedAuthFromCurrentUser), Firestore-уточнение фоном и «тихо»;
//   • «с нами с» — синхронно из metadata.creationTime (0 сетевых запросов).
// Смена состава рядов после привязки аккаунта — только как реакция на действие
// юзера и через animateNextLayoutTransition.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, InteractionManager, Text, View } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';

import ScreenGradient from '../components/ScreenGradient';
import BouncyScrollView from '../components/BouncyScrollView';
import ContentWrap from '../components/ContentWrap';
import PressableHybrid from '../components/PressableHybrid';
import {
  SettingsGlassEyebrow,
  SettingsGlassList,
  SettingsGlassRow,
} from '../components/settings/SettingsGlassRows';
import NicknameEditModal from '../components/account/NicknameEditModal';
import AccountLogoutFlow, { type LogoutStage } from '../components/account/AccountLogoutFlow';
import DeleteAccountConfirmModal from '../components/DeleteAccountConfirmModal';
import RegistrationPromptModal from '../components/RegistrationPromptModal';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { nestedBoxShadow, plateBoxShadow } from '../components/v2/ShadowSurface';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { coinRankRowForDisplay, isValidCoinRank } from './coin_rank_table_v1';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import {
  getLinkedAuthInfo,
  peekAccountCreatedAtMs,
  peekLinkedAuthFromCurrentUser,
  type LinkedAuth,
} from './auth_provider';
import { useAppSnapshotSelector } from './app_snapshot_store';
import { animateNextLayoutTransition } from './smooth_layout';
import { safeRouterBack } from './navigation_back';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { traceAccountDeleteUi } from './account_delete_ui_trace';
import { DebugLogger } from './debug-logger';
import { prewarmAccountWipeModules } from './cloud_sync';

const DATE_LOCALE_BY_LANG: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
  en: 'en-US',
};

/** «январь 2026» из ms; при недоступном Intl — «01.2026». */
function formatMemberSince(ms: number, lang: Lang): string {
  const d = new Date(ms);
  try {
    // зачем (Сверка profile-002, макет «С нами с 12.08.2025»): полная дата числами, а не «Сентябрь 2026 г.».
    return d.toLocaleDateString(DATE_LOCALE_BY_LANG[lang], { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (error) {
    DebugLogger.error('AccountDetails:formatMemberSince', error, 'warning');
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }
}

const COIN_SIZE = 102;
const COPY_FEEDBACK_MS = 1400;

export default function AccountDetailsScreen() {
  const router = useRouter();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  // зачем: монета текущего ранга вместо инициалов (макет PRF-02) — из кэша в памяти, без сети.
  const myCoinRank = useMyCoinRank();
  const coinRow = isValidCoinRank(myCoinRank) ? coinRankRowForDisplay(myCoinRank) : null;
  const { lang } = useLang();
  const L = (
    ru: string, uk: string, en: string, es: string, ptBr: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });

  // ── Синхронная гидрация (нулевой сетевой трафик на первый кадр) ────────────
  const snapshotName = useAppSnapshotSelector((s) => s.profile?.name ?? '', (a, b) => a === b);
  const [userName, setUserName] = useState(() => snapshotName);
  useEffect(() => {
    // Снапшот — источник истины между экранами (настройки тоже пишут в него).
    setUserName(snapshotName);
  }, [snapshotName]);
  // зачем (прогон Сверки 11.10): модули стирания подгружены до тапа «Выйти» — выход не зависит от ленивой подгрузки.
  useEffect(() => { prewarmAccountWipeModules('account_details'); }, []);

  const [linkedAuth, setLinkedAuth] = useState<LinkedAuth | null>(() => peekLinkedAuthFromCurrentUser());
  const linkedAuthRef = useRef(linkedAuth);
  const [memberSinceMs] = useState<number | null>(() => peekAccountCreatedAtMs());

  /** Тихая ревалидация: setState только при реальном изменении; смена
   *  «не привязан ↔ привязан» (меняет состав рядов) — через layout-анимацию. */
  const refreshLinkedAuth = useCallback(async () => {
    const info = await getLinkedAuthInfo().catch((error) => {
      DebugLogger.error('AccountDetails:refreshLinkedAuth', error, 'warning');
      return undefined;
    });
    if (info === undefined) return; // сеть не ответила — остаёмся на peek-значении
    const prev = linkedAuthRef.current;
    const same = !!prev === !!info
      && prev?.provider === info?.provider
      && prev?.email === info?.email;
    if (same) return;
    if (!!prev !== !!info) animateNextLayoutTransition();
    linkedAuthRef.current = info;
    setLinkedAuth(info);
  }, []);

  useEffect(() => {
    void refreshLinkedAuth();
    const sub = DeviceEventEmitter.addListener('auth_provider_linked', () => { void refreshLinkedAuth(); });
    return () => sub.remove();
  }, [refreshLinkedAuth]);

  // ── Локальные UI-состояния ─────────────────────────────────────────────────
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameNotice, setNameNotice] = useState<string | null>(null);
  const [logoutStage, setLogoutStage] = useState<LogoutStage>('idle');
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  // зачем (PM-214 «мгновенное открытие», №16): окно входа (2507 строк, 86 хуков, без раннего выхода при visible=false) входило в первый
  // кадр экрана аккаунта. Монтируем его скрытым после кадра и взаимодействий; «Войти» / выход раньше этого монтируют его сразу по visible.
  const [authPromptMounted, setAuthPromptMounted] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setAuthPromptMounted(true));
    return () => task.cancel();
  }, []);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    traceAccountDeleteUi('account_details_unmounted');
  }, []);

  const openNameModal = useCallback(() => {
    doHaptic();
    setNameNotice(null);
    setNameModalVisible(true);
  }, []);

  const handleNotice = useCallback((text: string | null) => {
    // Плашка вставляется в поток → мягкий сдвиг вместо телепорта.
    animateNextLayoutTransition();
    setNameNotice(text);
  }, []);

  const copyEmail = useCallback(async (email: string) => {
    doHaptic();
    setCopied(true); // мгновенный отклик, копирование догоняет фоном
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    try {
      await Clipboard.setStringAsync(email);
    } catch (error) {
      DebugLogger.error('AccountDetails:copyEmail', error, 'warning');
      setCopied(false);
    }
  }, []);

  const providerLabel = linkedAuth?.provider === 'apple' ? 'Apple' : 'Google';
  const namePlaceholder = L('Не задано', 'Не задано', 'Not set', 'No indicado', 'Não definido', 'Chưa đặt', 'Belum diatur', 'Ayarlanmadı', 'Nie ustawiono');
  const logoutActionLabel = L(
    'Выйти и войти под другим аккаунтом',
    'Вийти й увійти під іншим акаунтом',
    'Sign out and sign in with another account',
    'Salir e iniciar sesión con otra cuenta',
    'Sair e entrar com outra conta',
    'Đăng xuất và đăng nhập bằng tài khoản khác',
    'Keluar dan masuk dengan akun lain',
    'Çıkış yapıp başka bir hesapla giriş yap',
    'Wyloguj się i zaloguj na inne konto',
  );

  const nameLabel = L('Изменить имя', 'Змінити ім\'я', 'Change name', 'Cambiar nombre', 'Alterar nome', 'Đổi tên', 'Ubah nama', 'Adı değiştir', 'Zmień nazwę');
  const copyLabel = copied
    ? L('Скопировано', 'Скопійовано', 'Copied', 'Copiado', 'Copiado', 'Đã sao chép', 'Disalin', 'Kopyalandı', 'Skopiowano')
    : L('Скопировать', 'Скопіювати', 'Copy', 'Copiar', 'Copiar', 'Sao chép', 'Salin', 'Kopyala', 'Kopiuj');
  const backLabel = L('Назад', 'Назад', 'Back', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz');

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <BouncyScrollView
            contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 28 }}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            <PressableHybrid
              testID="account-sheet-close"
              accessibilityLabel={backLabel}
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as never)}
              variant="icon"
              withHaptic={false}
              withSound={false}
              style={{ width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 }}
              // зачем (profile.html `.rb.bare`): «назад» — голый шеврон слева, без круга и кромки; область нажатия 48×44.
              contentStyle={{ width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-back" size={21} color={glass.text} />
            </PressableHybrid>
            <Text maxFontSizeMultiplier={1.15} accessibilityRole="header" style={{ color: glass.text, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 10 }}>
              {L('Аккаунт', 'Акаунт', 'Account', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
            </Text>

            {/* Герой: монета ранга + имя + «Изменить имя». */}
            <View testID="account-hero" style={{ alignItems: 'center', marginTop: 26 }}>
              {coinRow ? (
                <Image testID="account-coin" accessible={false} source={coinRow.source} style={{ width: COIN_SIZE, height: COIN_SIZE }} contentFit="contain" />
              ) : (
                <View testID="account-coin-loading" style={{ width: COIN_SIZE, height: COIN_SIZE, borderRadius: COIN_SIZE / 2, backgroundColor: glass.opaqueControl }} />
              )}
              {/* Высота имени зарезервирована и при пустом нике — геометрия не прыгает.
                  зачем: text-integrity — длинный ник переносится (контент юзера), усечение запрещено. */}
              <FlowText
                testID="account-name"
                provenance="user"
                // зачем (profile.html `.section-title`): имя 19/24 жирным под монетой.
                style={{ color: glass.text, fontSize: 19, lineHeight: 24, fontWeight: '700', marginTop: 10, maxWidth: '86%', textAlign: 'center' }}
              >
                {userName || namePlaceholder}
              </FlowText>
              <PressableHybrid
                testID="account-change-name"
                accessibilityLabel={nameLabel}
                onPress={openNameModal}
                withHaptic={false}
                withSound={false}
                variant="chip"
                // зачем (profile.html `.chipbtn`): пилюля 32 (поля 12, r16, без кромки) в области нажатия 44 — 6 сверху и снизу.
                // зачем (Сверка profile-002): пилюля по тексту по центру, а не во всю ширину.
                style={{ marginTop: 4, paddingVertical: 6, alignSelf: 'center' }}
                contentStyle={{ height: 32, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl }}
              >
                <Text style={{ color: glass.text, fontSize: 13, lineHeight: 18, fontWeight: '600' }}>{nameLabel}</Text>
              </PressableHybrid>
            </View>

            {/* Инлайн-плашка отката смены ника (некритичная, вместо блокирующего Alert). */}
            {nameNotice ? (
              // зачем (overlays-runtime.html .or-rollback): плашка отката — причина 13/19 и строка-итог «Прежнее имя
              // восстановлено.» 12 вторичным цветом; радиус 16, поля 13/14, отступ сверху 16; без значка (в макете его нет).
              <View
                testID="account-nickname-inline-notice"
                accessibilityRole="alert"
                style={{ marginTop: 16, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) /* зачем (стиль «Тень»): плашка отката — тень вместо кромки */ }}
              >
                <Text style={{ color: glass.text, fontSize: 13, lineHeight: 19 }}>{nameNotice}</Text>
                <Text testID="account-nickname-restored" style={{ marginTop: 4, color: glass.secondary, fontSize: 13, lineHeight: 17 }}>
                  {L('Прежнее имя восстановлено.', 'Попереднє імʼя відновлено.', 'Your previous name has been restored.', 'Se restauró el nombre anterior.', 'O nome anterior foi restaurado.', 'Đã khôi phục tên cũ.', 'Nama sebelumnya dipulihkan.', 'Önceki ad geri yüklendi.', 'Przywrócono poprzednią nazwę.')}
                </Text>
              </View>
            ) : null}

            <SettingsGlassEyebrow glass={glass} title={L('ДАННЫЕ', 'ДАНІ', 'DETAILS', 'DATOS', 'DADOS', 'THÔNG TIN', 'DATA', 'BİLGİLER', 'DANE')} />
            <SettingsGlassList>
              <SettingsGlassRow
                glass={glass}
                testID="account-name-row"
                icon="person-outline"
                title={L('Имя', 'Ім\'я', 'Name', 'Nombre', 'Nome', 'Tên', 'Nama', 'Ad', 'Imię')}
                sub={L('Показывается друзьям', 'Показується друзям', 'Shown to friends', 'Se muestra a tus amigos', 'Mostrado aos amigos', 'Hiển thị cho bạn bè', 'Ditampilkan ke teman', 'Arkadaşlarına gösterilir', 'Widoczne dla znajomych')}
                value={userName || namePlaceholder}
                onPress={openNameModal}
              />
              {linkedAuth ? (
                <SettingsGlassRow
                  glass={glass}
                  testID="account-email-row"
                  icon="mail-outline"
                  title={triLang(lang, { ru: 'Почта', uk: 'Пошта', en: 'Email', es: 'Correo', 'pt-BR': 'E-mail', vi: 'Email', id: 'Email', tr: 'E-posta', pl: 'E-mail' })}
                  sub={linkedAuth.email || '—'}
                  right={linkedAuth.email ? (
                    <PressableHybrid
                      testID="account-email-copy"
                      accessibilityLabel={copyLabel}
                      onPress={() => { void copyEmail(linkedAuth.email!); }}
                      withHaptic={false}
                      withSound={false}
                      variant="chip"
                      style={{ minHeight: 44, alignSelf: 'center' }}
                      contentStyle={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) /* зачем (стиль «Тень»): чип «Скопировать» — малая тень */ }}
                    >
                      <Text style={{ color: glass.text, fontSize: 13, lineHeight: 18, fontWeight: '700' }}>{copyLabel}</Text>
                    </PressableHybrid>
                  ) : <View />}
                />
              ) : (
                <SettingsGlassRow
                  glass={glass}
                  testID="account-link-row"
                  icon="link-outline"
                  title={L('Привязать аккаунт', "Прив'язати акаунт", 'Link account', 'Vincular cuenta', 'Vincular conta', 'Liên kết tài khoản', 'Tautkan akun', 'Hesabı bağla', 'Połącz konto')}
                  onPress={() => { doHaptic(); setAuthPromptVisible(true); }}
                />
              )}
              {linkedAuth ? (
                <SettingsGlassRow
                  glass={glass}
                  icon="checkmark-circle-outline"
                  title={L('Способ входа', 'Спосіб входу', 'Sign-in method', 'Método de acceso', 'Método de login', 'Cách đăng nhập', 'Metode masuk', 'Giriş yöntemi', 'Metoda logowania')}
                  value={providerLabel}
                />
              ) : null}
              {memberSinceMs ? (
                <SettingsGlassRow
                  glass={glass}
                  icon="trending-up-outline"
                  title={L('С нами с', 'З нами з', 'With us since', 'Con nosotros desde', 'Conosco desde', 'Cùng chúng tôi từ', 'Bersama kami sejak', 'Bizimle şu tarihten beri', 'Z nami od')}
                  value={formatMemberSince(memberSinceMs, lang)}
                />
              ) : null}
            </SettingsGlassList>

            <SettingsGlassEyebrow glass={glass} title={L('АККАУНТ', 'АКАУНТ', 'ACCOUNT', 'CUENTA', 'CONTA', 'TÀI KHOẢN', 'AKUN', 'HESAP', 'KONTO')} />
            <SettingsGlassList>
              {linkedAuth ? (
                <SettingsGlassRow
                  glass={glass}
                  testID="account-logout-button"
                  icon="arrow-forward-outline"
                  title={logoutActionLabel}
                  accessibilityLabel={logoutActionLabel}
                  haptic={false}
                  // зачем (владелец 31.08 «никаких модалов, просто мгновенный выход», подтверждено 21.09 —
                  // docs/work/tasks/2026-09-21_approved_ui_round2_finish.md:32; координатор 12.10 снял окно
                  // подтверждения): выход стартует сразу, эффект стадии 'wiping' в AccountLogoutFlow запускает его один раз.
                  onPress={() => { doHaptic(); setLogoutStage('wiping'); }}
                />
              ) : null}
              <SettingsGlassRow
                glass={glass}
                testID="account-delete-button"
                icon="trash-outline"
                title={L('Удалить аккаунт', 'Видалити акаунт', 'Delete account', 'Eliminar cuenta', 'Excluir conta', 'Xóa tài khoản', 'Hapus akun', 'Hesabı sil', 'Usuń konto')}
                sub={L('Требует отдельного подтверждения', 'Потребує окремого підтвердження', 'Needs separate confirmation', 'Requiere confirmación aparte', 'Exige confirmação separada', 'Cần xác nhận riêng', 'Perlu konfirmasi terpisah', 'Ayrı onay gerektirir', 'Wymaga osobnego potwierdzenia')}
                titleColor={t.wrong}
                haptic={false}
                onPress={() => { doHaptic(); setDeleteVisible(true); }}
              />
            </SettingsGlassList>
          </BouncyScrollView>
        </ContentWrap>
      </View>

      <NicknameEditModal
        visible={nameModalVisible}
        currentName={userName}
        onRequestClose={() => setNameModalVisible(false)}
        onOptimisticApply={setUserName}
        onRollback={setUserName}
        onNotice={handleNotice}
      />

      <AccountLogoutFlow
        stage={logoutStage}
        onStageChange={setLogoutStage}
        onSignedOut={() => {
          animateNextLayoutTransition();
          linkedAuthRef.current = null;
          setLinkedAuth(null);
          setAuthPromptVisible(true);
        }}
      />

      <DeleteAccountConfirmModal
        visible={deleteVisible}
        onRequestClose={() => setDeleteVisible(false)}
      />

      {authPromptMounted || authPromptVisible ? (
      <RegistrationPromptModal
        visible={authPromptVisible}
        context="settings"
        onClose={() => setAuthPromptVisible(false)}
        onSignedIn={() => {
          setAuthPromptVisible(false);
          void refreshLinkedAuth();
        }}
      />
      ) : null}
    </ScreenGradient>
  );
}
