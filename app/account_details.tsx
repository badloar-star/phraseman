// ════════════════════════════════════════════════════════════════════════════
// account_details.tsx — экран «Аккаунт», модальный лист (выезд снизу).
//
// зачем: владелец попросил раздел аккаунта «как в Bevel» — аватар-инициалы
// с крупным именем, карточка данных со значениями справа (имя, email с
// копированием, способ входа, «с нами с …») и две кнопки внизу: «Выйти» и
// красная «Удалить аккаунт». Открывается из настроек по ряду «Аккаунт».
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
import {
  DeviceEventEmitter,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlowText } from '../components/text-integrity/FlowText';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';

import ScreenGradient from '../components/ScreenGradient';
import BouncyScrollView from '../components/BouncyScrollView';
import ContentWrap from '../components/ContentWrap';
import SectionSheetHeader from '../components/SectionSheetHeader';
import {
  SettingsGroup,
  SettingsRow,
  SETTINGS_GROUP_MARGIN,
  SETTINGS_GROUP_RADIUS,
} from '../components/settings/SettingsGroup';
import { SETTINGS_SURFACES } from '../components/settings/settingsSurfaces';
import NicknameEditModal from '../components/account/NicknameEditModal';
import AccountLogoutFlow, { type LogoutStage } from '../components/account/AccountLogoutFlow';
import DeleteAccountConfirmModal from '../components/DeleteAccountConfirmModal';
import RegistrationPromptModal from '../components/RegistrationPromptModal';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { isLightThemeMode } from '../constants/theme';
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
    const raw = d.toLocaleDateString(DATE_LOCALE_BY_LANG[lang], { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  } catch {
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }
}

/** До двух инициалов: первое слово + последнее («Максим Бабиев» → «МБ»). */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = [...parts[0]][0] ?? '';
  const last = parts.length > 1 ? ([...parts[parts.length - 1]][0] ?? '') : '';
  return (first + last).toUpperCase();
}

const AVATAR_SIZE = 84;
const COPY_FEEDBACK_MS = 1400;

export default function AccountDetailsScreen() {
  const router = useRouter();
  const { theme: t, themeMode, f } = useTheme();
  const { lang } = useLang();
  const L = (
    ru: string, uk: string, es: string, ptBr: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
  const surface = SETTINGS_SURFACES[themeMode];
  const isLightTheme = isLightThemeMode(themeMode);

  // ── Синхронная гидрация (нулевой сетевой трафик на первый кадр) ────────────
  const snapshotName = useAppSnapshotSelector((s) => s.profile?.name ?? '', (a, b) => a === b);
  const [userName, setUserName] = useState(() => snapshotName);
  useEffect(() => {
    // Снапшот — источник истины между экранами (настройки тоже пишут в него).
    setUserName(snapshotName);
  }, [snapshotName]);

  const [linkedAuth, setLinkedAuth] = useState<LinkedAuth | null>(() => peekLinkedAuthFromCurrentUser());
  const linkedAuthRef = useRef(linkedAuth);
  const [memberSinceMs] = useState<number | null>(() => peekAccountCreatedAtMs());

  /** Тихая ревалидация: setState только при реальном изменении; смена
   *  «не привязан ↔ привязан» (меняет состав рядов) — через layout-анимацию. */
  const refreshLinkedAuth = useCallback(async () => {
    const info = await getLinkedAuthInfo().catch(() => undefined);
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
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
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
    } catch {
      setCopied(false);
    }
  }, []);

  const initials = initialsFromName(userName);
  const providerLabel = linkedAuth?.provider === 'apple' ? 'Apple' : 'Google';
  const namePlaceholder = L('Не задано', 'Не задано', 'No indicado', 'Não definido', 'Chưa đặt', 'Belum diatur', 'Ayarlanmadı', 'Nie ustawiono');
  const logoutActionLabel = L(
    'Выйти и войти под другим аккаунтом',
    'Вийти й увійти під іншим акаунтом',
    'Salir e iniciar sesión con otra cuenta',
    'Sair e entrar com outra conta',
    'Đăng xuất và đăng nhập bằng tài khoản khác',
    'Keluar dan masuk dengan akun lain',
    'Çıkış yapıp başka bir hesapla giriş yap',
    'Wyloguj się i zaloguj na inne konto',
  );

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* зачем: стандарт «шторки раздела» — модал с выездом снизу, шапка
              с центрированным заголовком и крестиком вместо стрелки «назад». */}
          <SectionSheetHeader
            title={L('Аккаунт', 'Акаунт', 'Cuenta', 'Conta', 'Tài khoản', 'Akun', 'Hesap', 'Konto')}
            onClose={() => safeRouterBack(router, '/(tabs)/settings' as never)}
            closeTestID="account-sheet-close"
          />

          <BouncyScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
        {/* ── Герой: инициалы + крупное имя (тап — изменить имя) ── */}
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={L('Изменить имя', 'Змінити ім\'я', 'Cambiar nombre', 'Alterar nome', 'Đổi tên', 'Ubah nama', 'Adı değiştir', 'Zmień nazwę')}
          onPress={openNameModal}
          style={{ alignItems: 'center', marginTop: 22 }}
          testID="account-hero"
        >
          <View
            style={{
              width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
              backgroundColor: surface.chipOn,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {initials ? (
              <Text style={{ color: surface.accent, fontSize: 30, fontWeight: '800', letterSpacing: 1 }}>
                {initials}
              </Text>
            ) : (
              <Ionicons name="person" size={34} color={surface.accent} />
            )}
          </View>
          {/* Высота имени зарезервирована и при пустом нике — геометрия не прыгает.
              зачем: text-integrity — длинный ник переносится (контент юзера),
              шапка-колонка растёт; усечение запрещено. */}
          <FlowText
            testID="account-name"
            provenance="user"
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginTop: 14, maxWidth: '86%', textAlign: 'center' }}
          >
            {userName || namePlaceholder}
          </FlowText>
          <Text style={{ color: surface.accent, fontSize: f.caption, fontWeight: '700', marginTop: 5 }}>
            {L('Изменить имя', 'Змінити ім\'я', 'Cambiar nombre', 'Alterar nome', 'Đổi tên', 'Ubah nama', 'Adı değiştir', 'Zmień nazwę')}
          </Text>
        </TouchableOpacity>

        {/* Инлайн-плашка отката смены ника (некритичная, вместо блокирующего Alert). */}
        {nameNotice ? (
          <View
            testID="account-nickname-inline-notice"
            style={{
              marginHorizontal: SETTINGS_GROUP_MARGIN, marginTop: 18, marginBottom: -6,
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: surface.notice,
              borderRadius: 12, padding: 12,
            }}
          >
            <Ionicons name="alert-circle-outline" size={20} color={t.wrong} />
            <Text style={{ flex: 1, color: t.textSecond, fontSize: f.caption, lineHeight: 18 }}>
              {nameNotice}
            </Text>
          </View>
        ) : null}

        {/* ── Карточка данных: значения справа, по референсу Bevel ── */}
        <SettingsGroup
          marginTop={24}
          surfaceColor={surface.panel}
          borderColor={surface.border}
          dividerColor={surface.divider}
        >
          <SettingsRow
            testID="account-name-row"
            icon="person"
            color="blue"
            label={L('Имя', 'Ім\'я', 'Nombre', 'Nome', 'Tên', 'Nama', 'Ad', 'Imię')}
            value={userName || namePlaceholder}
            onPress={openNameModal}
          />
          {linkedAuth ? (
            <SettingsRow
              testID="account-email-row"
              icon="mail"
              color="teal"
              label="Email"
              value={linkedAuth.email || '—'}
              onPress={linkedAuth.email ? () => { void copyEmail(linkedAuth.email!); } : undefined}
              right={linkedAuth.email ? (
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={17}
                  color={copied ? surface.accent : t.textGhost}
                />
              ) : null}
            />
          ) : (
            <SettingsRow
              testID="account-link-row"
              icon="link"
              color="green"
              label={L('Привязать аккаунт', "Прив\'язати акаунт", 'Vincular cuenta', 'Vincular conta', 'Liên kết tài khoản', 'Tautkan akun', 'Hesabı bağla', 'Połącz konto')}
              onPress={() => { doHaptic(); setAuthPromptVisible(true); }}
            />
          )}
          {linkedAuth ? (
            <SettingsRow
              icon={linkedAuth.provider === 'apple' ? 'logo-apple' : 'logo-google'}
              color="gray"
              label={L('Способ входа', 'Спосіб входу', 'Método de acceso', 'Método de login', 'Cách đăng nhập', 'Metode masuk', 'Giriş yöntemi', 'Metoda logowania')}
              value={providerLabel}
              hideChevron
            />
          ) : null}
          {memberSinceMs ? (
            <SettingsRow
              icon="calendar-clear"
              color="orange"
              label={L('С нами с', 'З нами з', 'Con nosotros desde', 'Conosco desde', 'Cùng chúng tôi từ', 'Bersama kami sejak', 'Bizimle şu tarihten beri', 'Z nami od')}
              value={formatMemberSince(memberSinceMs, lang)}
              hideChevron
            />
          ) : null}
        </SettingsGroup>

        {/* ── Кнопки: «Выйти» (только при привязке) и «Удалить аккаунт» ── */}
        <View style={{ marginTop: 28, marginHorizontal: SETTINGS_GROUP_MARGIN, gap: 12 }}>
          {linkedAuth ? (
            <TouchableOpacity
              testID="account-logout-button"
              accessibilityRole="button"
              accessibilityLabel={logoutActionLabel}
              activeOpacity={0.7}
              onPress={() => { doHaptic(); setLogoutStage('confirm'); }}
              style={{
                height: 52, borderRadius: SETTINGS_GROUP_RADIUS,
                backgroundColor: surface.panel,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                {logoutActionLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            testID="account-delete-button"
            accessibilityRole="button"
            activeOpacity={0.7}
            onPress={() => { doHaptic(); setDeleteVisible(true); }}
            style={{
              height: 52, borderRadius: SETTINGS_GROUP_RADIUS,
              // Тональная «опасная» заливка (без обводки) — красный читается тоном.
              backgroundColor: isLightTheme ? 'rgba(200,55,55,0.10)' : 'rgba(255,99,92,0.14)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '700' }}>
              {L('Удалить аккаунт', 'Видалити акаунт', 'Eliminar cuenta', 'Excluir conta', 'Xóa tài khoản', 'Hapus akun', 'Hesabı sil', 'Usuń konto')}
            </Text>
          </TouchableOpacity>
        </View>

            {/* Нижний отступ прокрутки (SafeAreaView уже учёл системную зону). */}
            <View style={{ height: 28 }} />
          </BouncyScrollView>
        </ContentWrap>
      </SafeAreaView>

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

      <RegistrationPromptModal
        visible={authPromptVisible}
        context="settings"
        onClose={() => setAuthPromptVisible(false)}
        onSignedIn={() => {
          setAuthPromptVisible(false);
          void refreshLinkedAuth();
        }}
      />
    </ScreenGradient>
  );
}
