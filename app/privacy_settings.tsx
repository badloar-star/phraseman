/**
 * Настройки → Приватность и данные (отдельный экран).
 *
 * Всё, что касается данных пользователя, в одном месте: тумблер согласия на
 * аналитику (отзыв в любой момент — GDPR ст.7(3)), юридические документы
 * (Политика конфиденциальности, Условия использования) и удаление аккаунта.
 *
 * Раньше это было размазано по экрану настроек: галочка терялась в «Профиле»,
 * документы — мелким шрифтом в подвале, удаление — голой серой строкой. Теперь
 * общий экран настроек показывает один ряд «Приватность и данные» → сюда.
 */
import React, { useCallback, useState } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import BouncyScrollView from '../components/BouncyScrollView';
import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
import ContentWrap from '../components/ContentWrap';
import CustomSwitch from '../components/CustomSwitch';
import DeleteAccountConfirmModal from '../components/DeleteAccountConfirmModal';
import {
  SettingsGroup,
  SettingsRow,
  SettingsSectionTitle,
} from '../components/settings/SettingsGroup';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import { getAnalyticsConsentState, setAnalyticsConsent } from './analytics_consent';
import { recordConsentToCloud } from './age_consent_cloud';
import { KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from './config';

/** Строка на 8 UI-языках (форма triLang). */
interface Text8 {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}

export default function PrivacySettings() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const L = (text: Text8): string => triLang(lang, text);

  const [analyticsOn, setAnalyticsOn] = useState(getAnalyticsConsentState() === 'granted');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Отзыв/выдача согласия применяется сразу (тумблер — это и есть выбор): локально
  // (источник правды + гейт сбора) и в облако (accountability/GDPR). Best-effort.
  const toggleAnalytics = useCallback((val: boolean) => {
    void hapticTap();
    setAnalyticsOn(val);
    void (async () => {
      await setAnalyticsConsent(val ? 'granted' : 'denied');
      void recordConsentToCloud();
    })();
  }, []);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* зачем: стандарт «шторки раздела» — модал с выездом снизу, шапка
              с центрированным заголовком и крестиком вместо стрелки «назад». */}
          <SectionSheetHeader
            title={L({ ru: 'Приватность и данные', uk: 'Приватність і дані', es: 'Privacidad y datos', 'pt-BR': 'Privacidade e dados', vi: 'Quyền riêng tư và dữ liệu', id: 'Privasi dan data', tr: 'Gizlilik ve veriler', pl: 'Prywatność i dane' })}
            onClose={() => safeRouterBack(router, '/(tabs)/settings' as never)}
          />

          <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ paddingTop: 12, paddingBottom: 36 }} scrollEventThrottle={16}>
            {/* Согласие на сбор данных об использовании (тумблер = мгновенный выбор). */}
            <SettingsSectionTitle title={L({ ru: 'Данные об использовании', uk: 'Дані про використання', es: 'Datos de uso', 'pt-BR': 'Dados de uso', vi: 'Dữ liệu sử dụng', id: 'Data penggunaan', tr: 'Kullanım verileri', pl: 'Dane o użytkowaniu' })} />
            <SettingsGroup surfaceColor={t.bgCard} borderColor={t.border} dividerColor={t.border}>
              <SettingsRow
                testID="privacy-analytics-consent"
                icon="stats-chart"
                color="teal"
                label={L({ ru: 'Отправлять данные об использовании', uk: 'Надсилати дані про використання', es: 'Enviar datos de uso', 'pt-BR': 'Enviar dados de uso', vi: 'Gửi dữ liệu sử dụng', id: 'Kirim data penggunaan', tr: 'Kullanım verisi gönder', pl: 'Wysyłać dane o użytkowaniu' })}
                sub={analyticsOn
                  ? L({ ru: 'Помогают понять, что улучшать', uk: 'Допомагають зрозуміти, що покращувати', es: 'Ayudan a saber qué mejorar', 'pt-BR': 'Ajudam a saber o que melhorar', vi: 'Giúp biết cần cải thiện gì', id: 'Membantu tahu apa yang diperbaiki', tr: 'Neyi geliştireceğimizi anlarız', pl: 'Pomagają wiedzieć, co ulepszać' })
                  : L({ ru: 'Сейчас не отправляются', uk: 'Зараз не надсилаються', es: 'Ahora no se envían', 'pt-BR': 'Agora não são enviados', vi: 'Hiện không gửi', id: 'Sekarang tidak dikirim', tr: 'Şu an gönderilmiyor', pl: 'Teraz nie są wysyłane' })}
                hideChevron
                right={<CustomSwitch value={analyticsOn} onValueChange={toggleAnalytics} />}
              />
            </SettingsGroup>
            <Text style={{ color: t.textMuted, fontSize: 12, lineHeight: 17, fontWeight: '600', marginHorizontal: 20, marginTop: 8 }}>
              {L({
                ru: 'Обезличенные данные о том, как проходит обучение. Не обязательно — приложение работает и без этого. Сбор сбоев для стабильности продолжается всегда.',
                uk: 'Знеособлені дані про те, як проходить навчання. Не обов’язково — застосунок працює і без цього. Збір збоїв для стабільності триває завжди.',
                es: 'Datos despersonalizados sobre cómo avanza el aprendizaje. No es obligatorio: la app funciona sin esto. La recolección de fallos para la estabilidad continúa siempre.',
                'pt-BR': 'Dados despersonalizados sobre como o aprendizado avança. Não é obrigatório: o app funciona sem isso. A coleta de falhas para estabilidade continua sempre.',
                vi: 'Dữ liệu ẩn danh về việc học diễn ra thế nào. Không bắt buộc — ứng dụng vẫn chạy. Việc thu thập sự cố để ổn định luôn tiếp tục.',
                id: 'Data anonim tentang bagaimana proses belajar. Tidak wajib — aplikasi tetap jalan. Pengumpulan crash untuk stabilitas selalu berjalan.',
                tr: 'Öğrenmenin nasıl ilerlediğine dair kimliksiz veriler. Zorunlu değil — uygulama bunsuz da çalışır. Kararlılık için çökme toplama her zaman sürer.',
                pl: 'Zanonimizowane dane o przebiegu nauki. Nie jest to wymagane — aplikacja działa bez tego. Zbieranie awarii dla stabilności trwa zawsze.',
              })}
            </Text>

            {/* Юридические документы. */}
            <SettingsSectionTitle title={L({ ru: 'Документы', uk: 'Документи', es: 'Documentos', 'pt-BR': 'Documentos', vi: 'Tài liệu', id: 'Dokumen', tr: 'Belgeler', pl: 'Dokumenty' })} />
            <SettingsGroup surfaceColor={t.bgCard} borderColor={t.border} dividerColor={t.border}>
              <SettingsRow
                testID="privacy-policy-row"
                icon="lock-closed"
                color="gray"
                label={L({ ru: 'Политика конфиденциальности', uk: 'Політика конфіденційності', es: 'Política de privacidad', 'pt-BR': 'Política de privacidade', vi: 'Chính sách bảo mật', id: 'Kebijakan privasi', tr: 'Gizlilik politikası', pl: 'Polityka prywatności' })}
                right={<Ionicons name="open-outline" size={18} color={t.textGhost} />}
                onPress={() => {
                  void hapticTap();
                  void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL);
                }}
              />
              <SettingsRow
                testID="privacy-terms-row"
                icon="document-text"
                color="gray"
                label={L({ ru: 'Условия использования', uk: 'Умови використання', es: 'Términos de uso', 'pt-BR': 'Termos de uso', vi: 'Điều khoản sử dụng', id: 'Ketentuan penggunaan', tr: 'Kullanım koşulları', pl: 'Warunki użytkowania' })}
                right={<Ionicons name="open-outline" size={18} color={t.textGhost} />}
                onPress={() => {
                  void hapticTap();
                  void Linking.openURL(KNOWLY_LEGAL_TERMS_URL);
                }}
              />
            </SettingsGroup>

            {/* Удаление аккаунта. */}
            <SettingsSectionTitle title={L({ ru: 'Аккаунт', uk: 'Акаунт', es: 'Cuenta', 'pt-BR': 'Conta', vi: 'Tài khoản', id: 'Akun', tr: 'Hesap', pl: 'Konto' })} />
            <SettingsGroup surfaceColor={t.bgCard} borderColor={t.border} dividerColor={t.border}>
              <SettingsRow
                testID="privacy-delete-account"
                icon="trash"
                color="red"
                danger
                label={L({ ru: 'Удалить аккаунт и данные', uk: 'Видалити акаунт і дані', es: 'Eliminar cuenta y datos', 'pt-BR': 'Excluir conta e dados', vi: 'Xóa tài khoản và dữ liệu', id: 'Hapus akun dan data', tr: 'Hesabı ve verileri sil', pl: 'Usuń konto i dane' })}
                onPress={() => {
                  void hapticTap();
                  setDeleteModalVisible(true);
                }}
              />
            </SettingsGroup>
          </BouncyScrollView>
        </ContentWrap>
      </SafeAreaView>

      <DeleteAccountConfirmModal
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      />
    </ScreenGradient>
  );
}
