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
import { switchOffTrackTone, switchOnTone } from '../components/settings/switch_chrome';
import React, { useCallback, useRef, useState } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import BouncyScrollView from '../components/BouncyScrollView';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import PressableHybrid from '../components/PressableHybrid';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';
import DeleteAccountConfirmModal from '../components/DeleteAccountConfirmModal';
import { FONT_SCALE, useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { getAnalyticsConsentState, setAnalyticsConsent } from './analytics_consent';
import { recordConsentToCloud } from './age_consent_cloud';
import { getAiExplainConsentState, setAiExplainConsent, recordAiExplainConsentToCloud } from './ai_explain_consent';
import { getAiDialogConsentState, setAiDialogConsent, recordAiDialogConsentToCloud } from './ai_dialog_consent';
import { scheduleConsentCloudRecord } from './consent_cloud_coalescer';
import { isDevRobotNoCloud, noteRobotNoCloudSkip } from './dev_robot_no_cloud';
import { emitAppEvent } from './events';

/** Строка на 9 UI-языках (форма triLang). */
interface Text8 {
  ru: string;
  uk: string;
  /** зачем (координатор 12.10): подготовка к английскому интерфейсу — ключ есть заранее, флаг не трогаем. */
  en: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}

type Glass = ReturnType<typeof liquidGlassTokens>;

interface LocalSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  glass: Glass;
  /** зачем (координатор 12.10, робот съёмки settings-gap-017): по тексту робот попадал в подпись строки, а не в переключатель. */
  testID?: string;
}

function LocalSwitch({ value, onValueChange, accessibilityLabel, glass, testID }: LocalSwitchProps) {
  const offTone = switchOffTrackTone(glass);
  // зачем (координатор 13.10, Темы 4801981d8; образец settings-gap-013/014/015/034 `.gs-sw.on`): включённый — дорожка цвета акцента
  // и «чернильный» бегунок из общего токена switchOnTone, а не тёмная дорожка glass.selected с белым бегунком.
  const onTone = switchOnTone(glass);
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      withHaptic={false}
      withSound={false}
      variant="chip"
      style={{ width: 48, minWidth: 48, minHeight: 48, alignSelf: 'center' }}
      contentStyle={{ width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
    >
      {/* зачем (координатор 12.10, стиль «Тень»): без обводки — дорожка выключенного отделяется тоном, как в «Настройках обучения» */}
      <View style={{ width: 48, height: 29, borderRadius: 16, padding: 3, justifyContent: 'center', backgroundColor: value ? onTone.track : offTone.track }}>
        <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: value ? onTone.knob : offTone.knob, transform: [{ translateX: value ? 19 : 0 }] }} />
      </View>
    </PressableHybrid>
  );
}

interface PrivacyRowProps {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  glass: Glass;
  titleColor: string;
  /** Цвет текста заголовка; по умолчанию glass.text (паритет profile.html PRF-07: заголовок строки — `--text`, значок — акцент). */
  labelColor?: string;
  scaled: (value: number) => number;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}

function PrivacyRow({ testID, icon, label, glass, titleColor, labelColor, scaled, sub, right, onPress, accessibilityLabel }: PrivacyRowProps) {
  const rowStyle: ViewStyle = {
    minHeight: 64,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 14,
    flexDirection: 'row',
    alignItems: 'center',
    // зачем (стиль «Тень», владелец 12.10): строка — плашка с тенью, без кромки; overflow: hidden убран, он резал бы тень
    backgroundColor: glass.plateFillFrom,
    boxShadow: plateBoxShadow(glass),
  };
  const content = (
    <>
      <PlateFill g={glass} radius={14} />
      <View style={{ width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.dividerTone, boxShadow: nestedBoxShadow(glass) }}>
        <Ionicons name={icon} size={20} color={titleColor} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: labelColor ?? glass.text, fontSize: scaled(16), lineHeight: scaled(21), fontWeight: '700', flexShrink: 1 }}>
          {label}
        </Text>
        {sub ? (
          <Text style={{ color: glass.secondary, fontSize: scaled(13), lineHeight: scaled(18), fontWeight: '400', marginTop: 3, flexShrink: 1 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={20} color={glass.secondary} /> : null}
    </>
  );

  if (!onPress) return <View testID={testID} style={rowStyle}>{content}</View>;
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      withHaptic={false}
      withSound={false}
      variant="card"
      contentStyle={rowStyle}
    >
      {content}
    </PressableHybrid>
  );
}

export default function PrivacySettings() {
  const router = useRouter();
  const { theme: t, fontSize, uiScale, liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const designScale = FONT_SCALE[fontSize] / FONT_SCALE.medium * uiScale;
  const scaled = useCallback((value: number) => Math.round(value * designScale), [designScale]);
  const L = (text: Text8): string => triLang(lang, text);
  const [analyticsOn, setAnalyticsOn] = useState(getAnalyticsConsentState() === 'granted');
  const [aiExplainOn, setAiExplainOn] = useState(getAiExplainConsentState() === 'granted');
  const [aiDialogOn, setAiDialogOn] = useState(getAiDialogConsentState() === 'granted');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Отзыв/выдача согласия применяется сразу (тумблер — это и есть выбор): локально
  // (источник правды + гейт сбора) и в облако (accountability/GDPR). Облако — best-effort.
  // зачем (FINAL_PHASE п.7, Optimistic UI): тумблер щёлкает мгновенно; если локальная
  // запись не удалась — возвращаем прежнее положение, а поздний ответ старого тапа
  // не затирает более свежий выбор (счётчик тапов на каждый тумблер).
  const consentSeqRef = useRef<Record<string, number>>({});
  const applyConsentToggle = useCallback((
    key: 'analytics' | 'ai_explain' | 'ai_dialog',
    val: boolean,
    setOn: (v: boolean) => void,
    save: (state: 'granted' | 'denied') => Promise<unknown>,
    recordToCloud: () => Promise<unknown>,
  ) => {
    void hapticTap();
    setOn(val);
    const seq = (consentSeqRef.current[key] ?? 0) + 1;
    consentSeqRef.current[key] = seq;
    if (__DEV__) console.log(`[PRIVACY-CONSENT] ${key}: тап → ${val ? 'granted' : 'denied'} seq=${seq}`);
    // зачем (координатор 12.10: «записи в облако с робота — НЕТ»): dev robot_no_cloud=1 — меняется только экран; ни локального
    // сохранения, ни отметки «не доставлено», ни облака — досылать потом нечего. Вне dev / в стор-сборке флаг всегда false.
    if (isDevRobotNoCloud()) {
      noteRobotNoCloudSkip(`consent:${key}=${val ? 'granted' : 'denied'} (локальное сохранение + запись в облако)`); // i18n-ok: заметка для робота Сверки в журнал, не текст экрана
      return;
    }
    void (async () => {
      try {
        // зачем (аудит Optimistic UI 13.10): ИИ-согласия сообщают сбой записи значением false (не броском) — это тоже откат
        const persisted = await save(val ? 'granted' : 'denied');
        if (persisted === false) throw new Error('consent_persist_failed');
      } catch (error) {
        const superseded = consentSeqRef.current[key] !== seq;
        console.warn(`[PRIVACY-CONSENT] ${key}: локальная запись ${val} не удалась seq=${seq} — ${superseded ? `уже пришёл тап seq=${consentSeqRef.current[key]}, откат не нужен` : 'откат тумблера + тост'}`, error); // guard-ok: catch и ранний выход логируются всегда (правило «сперва логи»)
        if (superseded) return;
        setOn(!val);
        // зачем (Дизайн через координатора 12.10, R1 E-2): откат шёл молча — тумблер «сам» прыгал обратно без объяснения.
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не удалось сохранить настройку. Попробуй ещё раз.',
          messageUk: 'Не вдалося зберегти налаштування. Спробуй ще раз.',
          messageEn: "Couldn't save the setting. Try again.",
          messageEs: 'No se pudo guardar el ajuste. Inténtalo de nuevo.',
          messagePtBr: 'Não foi possível salvar a configuração. Tente de novo.',
          messageVi: 'Không lưu được cài đặt. Hãy thử lại.',
          messageId: 'Pengaturan gagal disimpan. Coba lagi.',
          messageTr: 'Ayar kaydedilemedi. Tekrar dene.',
          messagePl: 'Nie udało się zapisać ustawienia. Spróbuj ponownie.',
        });
        return;
      }
      // зачем (Дизайн через координатора 12.10, R1 E-2, Firebase-экономия): серия быстрых тапов — ОДНА запись в облако с последним
      // положением, через 1,5 с после последнего тапа или сразу при уходе в фон. Недоставленное досылается при входе (у владельцев записи).
      scheduleConsentCloudRecord(key, recordToCloud);
    })();
  }, []);

  const toggleAnalytics = useCallback((val: boolean) => {
    applyConsentToggle('analytics', val, setAnalyticsOn, setAnalyticsConsent, recordConsentToCloud);
  }, [applyConsentToggle]);

  // Тот же паттерн для согласия на AI-разбор ошибок в уроках (app/ai_explain_consent.ts):
  // тумблер — источник правды, gate в use_mistake_explain.ts читает его синхронно.
  const toggleAiExplain = useCallback((val: boolean) => {
    applyConsentToggle('ai_explain', val, setAiExplainOn, setAiExplainConsent, recordAiExplainConsentToCloud);
  }, [applyConsentToggle]);

  // Тот же паттерн для AI-диалогов (app/ai_dialog_consent.ts) — отдельный флаг,
  // т.к. это отдельная фича со своим согласием, не общий выключатель «всё AI».
  const toggleAiDialog = useCallback((val: boolean) => {
    applyConsentToggle('ai_dialog', val, setAiDialogOn, setAiDialogConsent, recordAiDialogConsentToCloud);
  }, [applyConsentToggle]);

  const analyticsLabel = L({ ru: 'Отправлять данные об использовании', uk: 'Надсилати дані про використання', en: "Send usage data", es: 'Enviar datos de uso', 'pt-BR': 'Enviar dados de uso', vi: 'Gửi dữ liệu sử dụng', id: 'Kirim data penggunaan', tr: 'Kullanım verisi gönder', pl: 'Wysyłać dane o użytkowaniu' });
  // зачем: паритет profile.html PRF-07 (13.10): название строки как в макете — «AI-разбор ошибок»
  const aiExplainLabel = L({ ru: 'AI-разбор ошибок', uk: 'AI-розбір помилок', en: "AI mistake explanations", es: 'Análisis de errores con IA', 'pt-BR': 'Análise de erros com IA', vi: 'Phân tích lỗi bằng AI', id: 'Analisis kesalahan AI', tr: 'Yapay zeka hata analizi', pl: 'Analiza błędów AI' });
  const aiDialogLabel = L({ ru: 'AI-диалоги', uk: 'AI-діалоги', en: "AI dialogs", es: 'Diálogos con IA', 'pt-BR': 'Diálogos com IA', vi: 'Hội thoại AI', id: 'Dialog AI', tr: 'Yapay zeka diyalogları', pl: 'Dialogi AI' });
  const sectionTitleStyle = {
    color: glass.secondary,
    fontSize: scaled(11),
    lineHeight: scaled(16),
    fontWeight: '700' as const,
    letterSpacing: 1.7,
    textTransform: 'uppercase' as const,
    marginTop: 24,
    marginBottom: 10,
    marginHorizontal: 4,
  };
  const noteStyle: ViewStyle = {
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    backgroundColor: glass.plateFillFrom,
    boxShadow: plateBoxShadow(glass), // зачем (стиль «Тень»): плашка-примечание с тенью, без кромки
  };

  return (
    <ScreenGradient artBackdrop="settings">
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <BouncyScrollView
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 /* зачем: паритет profile.html (13.10): поля экрана 20 */, paddingBottom: 40 }}
            scrollEventThrottle={16}
          >
            <PressableHybrid
              testID="privacy-settings-close"
              accessibilityLabel={L({ ru: 'Закрыть', uk: 'Закрити', en: "Close", es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
              accessibilityRole="button"
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as never)}
              withHaptic={true}
              withSound={false}
              variant="icon"
              style={{ width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 }}
              // зачем (profile.html `.rb.bare`): «назад» — голый шеврон слева, без круга и кромки; область нажатия 48×44.
              contentStyle={{ width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
            >
              {/* зачем: паритет с макетом profile.html PRF-07 — в шапке «назад» (шеврон), не крестик */}
              <Ionicons name="chevron-back" size={21} color={glass.text} />
            </PressableHybrid>
            {/* зачем (координатор 12.10, кадр settings-gap-016): «Приватность и данные» в Inter Bold 34 = 384 dp, vi = 402 dp — больше места на
                Pixel 8 (372 dp между полями 20), заголовок переносился. Вёрсткой не решается (он уже на всю ширину), сжимать шрифт нельзя
                (правило владельца) — короткий заголовок на 9 языках (vi 240 dp, запас и на 360 dp). «Данные» несёт подпись ниже. */}
            <Text testID="privacy-settings-title" style={{ color: t.textPrimary, fontSize: scaled(34), lineHeight: scaled(40), fontWeight: '700', letterSpacing: -0.5, marginTop: 10, flexShrink: 1 }}>
              {L({ ru: 'Приватность', uk: 'Приватність', en: 'Privacy', es: 'Privacidad', 'pt-BR': 'Privacidade', vi: 'Quyền riêng tư', id: 'Privasi', tr: 'Gizlilik', pl: 'Prywatność' })}
            </Text>
            <Text style={{ color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(20), fontWeight: '400', marginTop: 7, flexShrink: 1 }}>
              {L({ ru: 'Необязательные данные и документы', uk: 'Необов’язкові дані та документи', en: "Optional data and documents", es: 'Datos y documentos opcionales', 'pt-BR': 'Dados e documentos opcionais', vi: 'Dữ liệu và tài liệu không bắt buộc', id: 'Data dan dokumen opsional', tr: 'İsteğe bağlı veriler ve belgeler', pl: 'Opcjonalne dane i dokumenty' })}
            </Text>

            {/* Согласие на сбор данных об использовании (тумблер = мгновенный выбор). */}
            <Text style={sectionTitleStyle}>{L({ ru: 'Данные об использовании', uk: 'Дані про використання', en: "Usage data", es: 'Datos de uso', 'pt-BR': 'Dados de uso', vi: 'Dữ liệu sử dụng', id: 'Data penggunaan', tr: 'Kullanım verileri', pl: 'Dane o użytkowaniu' })}</Text>
            <View style={{ gap: 10 }}>
              <PrivacyRow
                testID="privacy-analytics-consent"
                icon="trending-up-outline"
                label={analyticsLabel}
                // зачем: паритет profile.html PRF-07 (13.10): подпись постоянная, состояние показывает переключатель и примечание ниже
                sub={L({ ru: 'Приложение работает и без этого', uk: 'Застосунок працює і без цього', en: "The app works without it", es: 'La app funciona sin esto', 'pt-BR': 'O app funciona sem isso', vi: 'Ứng dụng vẫn chạy khi tắt', id: 'Aplikasi tetap jalan tanpa ini', tr: 'Uygulama bunsuz da çalışır', pl: 'Aplikacja działa i bez tego' })}
                right={<LocalSwitch testID="privacy-analytics-consent-switch" value={analyticsOn} onValueChange={toggleAnalytics} accessibilityLabel={analyticsLabel} glass={glass} />}
                glass={glass}
                titleColor={glass.lightTint}
                scaled={scaled}
              />
            </View>
            <View style={noteStyle}>
              <PlateFill g={glass} radius={14} />
              <Text style={{ color: glass.secondary, fontSize: scaled(14), lineHeight: scaled(20), fontWeight: '400', flexShrink: 1 }}>
                {/* зачем: паритет profile.html PRF-07 (13.10): при выключенном согласии — текст макета; включённое состояние в макете не нарисовано, там прежний текст */}
                {!analyticsOn ? L({
                  ru: 'Сейчас данные об использовании не отправляются. Сбор технических сбоев для стабильности продолжается.',
                  uk: 'Зараз дані про використання не надсилаються. Збір технічних збоїв для стабільності триває.', en: "Usage data isn't being sent right now. Crash reports for stability are still collected.",
                  es: 'Ahora no se envían datos de uso. La recolección de fallos técnicos para la estabilidad continúa.',
                  'pt-BR': 'Agora os dados de uso não são enviados. A coleta de falhas técnicas para estabilidade continua.',
                  vi: 'Hiện không gửi dữ liệu sử dụng. Việc thu thập sự cố kỹ thuật để ổn định vẫn tiếp tục.',
                  id: 'Data penggunaan sekarang tidak dikirim. Pengumpulan crash teknis untuk stabilitas tetap berjalan.',
                  tr: 'Şu an kullanım verisi gönderilmiyor. Kararlılık için teknik çökme toplama sürüyor.',
                  pl: 'Teraz dane o użytkowaniu nie są wysyłane. Zbieranie awarii technicznych dla stabilności trwa.',
                }) : L({
                  ru: 'Обезличенные данные о том, как проходит обучение. Не обязательно — приложение работает и без этого. Сбор сбоев для стабильности продолжается всегда.',
                  uk: 'Знеособлені дані про те, як проходить навчання. Не обов’язково — застосунок працює і без цього. Збір збоїв для стабільності триває завжди.', en: "Anonymous data about how your learning goes. Optional — the app works without it. Crash reports for stability are always collected.",
                  es: 'Datos despersonalizados sobre cómo avanza el aprendizaje. No es obligatorio: la app funciona sin esto. La recolección de fallos para la estabilidad continúa siempre.',
                  'pt-BR': 'Dados despersonalizados sobre como o aprendizado avança. Não é obrigatório: o app funciona sem isso. A coleta de falhas para estabilidade continua sempre.',
                  vi: 'Dữ liệu ẩn danh về việc học diễn ra thế nào. Không bắt buộc — ứng dụng vẫn chạy. Việc thu thập sự cố để ổn định luôn tiếp tục.',
                  id: 'Data anonim tentang bagaimana proses belajar. Tidak wajib — aplikasi tetap jalan. Pengumpulan crash untuk stabilitas selalu berjalan.',
                  tr: 'Öğrenmenin nasıl ilerlediğine dair kimliksiz veriler. Zorunlu değil — uygulama bunsuz da çalışır. Kararlılık için çökme toplama her zaman sürer.',
                  pl: 'Zanonimizowane dane o przebiegu nauki. Nie jest to wymagane — aplikacja działa bez tego. Zbieranie awarii dla stabilności trwa zawsze.',
                })}
              </Text>
            </View>

            {/* Согласие на AI-разбор ошибок в уроках (отдельная фича, не аналитика — текст
                ответа уходит стороннему провайдеру ИИ, требует отдельного opt-in). */}
            <Text style={sectionTitleStyle}>{L({ ru: 'ИИ-функции', uk: 'ІІ-функції', en: "AI features", es: 'Funciones de IA', 'pt-BR': 'Funções de IA', vi: 'Tính năng AI', id: 'Fitur AI', tr: 'Yapay zeka özellikleri', pl: 'Funkcje AI' })}</Text>
            <View style={{ gap: 10 }}>
              <PrivacyRow
                testID="privacy-ai-explain-consent"
                icon="create-outline"
                label={aiExplainLabel}
                sub={aiExplainOn
                  ? L({ ru: 'При ошибке ИИ объясняет, что не так, и может упростить объяснение', uk: 'При помилці ІІ пояснює, що не так, і може спростити пояснення', en: "When you make a mistake, AI explains what went wrong and can simplify the explanation", es: 'Al fallar, la IA explica qué salió mal y puede simplificarlo', 'pt-BR': 'No erro, a IA explica o que houve e pode simplificar', vi: 'Khi sai, AI giải thích lỗi và có thể đơn giản hoá', id: 'Saat salah, AI menjelaskan dan bisa menyederhanakan', tr: 'Hatada yapay zeka açıklar ve basitleştirebilir', pl: 'Przy błędzie AI wyjaśnia i może uprościć wyjaśnienie' })
                  : L({ ru: 'Сейчас не используется', uk: 'Зараз не використовується', en: "Not in use right now", es: 'Ahora no se usa', 'pt-BR': 'Agora não é usada', vi: 'Hiện không dùng', id: 'Sekarang tidak digunakan', tr: 'Şu an kullanılmıyor', pl: 'Teraz nieużywana' })}
                right={<LocalSwitch testID="privacy-ai-explain-consent-switch" value={aiExplainOn} onValueChange={toggleAiExplain} accessibilityLabel={aiExplainLabel} glass={glass} />}
                glass={glass}
                titleColor={glass.lightTint}
                scaled={scaled}
              />
              <PrivacyRow
                testID="privacy-ai-dialog-consent"
                icon="chatbubble-outline"
                label={aiDialogLabel}
                sub={aiDialogOn
                  ? L({ ru: 'Можно общаться с ИИ-собеседником', uk: 'Можна спілкуватися з ІІ-співрозмовником', en: "You can chat with an AI conversation partner", es: 'Puedes hablar con el interlocutor de IA', 'pt-BR': 'Você pode conversar com o interlocutor de IA', vi: 'Có thể trò chuyện với bạn đồng hành AI', id: 'Bisa mengobrol dengan teman bicara AI', tr: 'Yapay zeka konuşma partneriyle sohbet edebilirsin', pl: 'Możesz rozmawiać z rozmówcą AI' })
                  : L({ ru: 'Сейчас не используются', uk: 'Зараз не використовуються', en: "Not in use right now", es: 'Ahora no se usan', 'pt-BR': 'Agora não são usados', vi: 'Hiện không dùng', id: 'Sekarang tidak digunakan', tr: 'Şu an kullanılmıyor', pl: 'Teraz nieużywane' })}
                right={<LocalSwitch testID="privacy-ai-dialog-consent-switch" value={aiDialogOn} onValueChange={toggleAiDialog} accessibilityLabel={aiDialogLabel} glass={glass} />}
                glass={glass}
                titleColor={glass.lightTint}
                scaled={scaled}
              />
              {/* зачем (приказ владельца 11.10): «Память диалогов» — контроль данных (что сохранено / очистить),
                  поэтому живёт здесь, рядом с согласием на AI-диалоги, а не в самом разделе «Диалоги». */}
              <PrivacyRow
                testID="privacy-dialogue-memory"
                icon="layers-outline" // зачем: паритет profile.html PRF-07 (13.10): значок «layers» макета
                label={L({ ru: 'Память диалогов', uk: 'Пам’ять діалогів', en: "Dialog memory", es: 'Memoria de diálogos', 'pt-BR': 'Memória dos diálogos', vi: 'Bộ nhớ hội thoại', id: 'Memori dialog', tr: 'Diyalog hafızası', pl: 'Pamięć dialogów' })}
                onPress={() => {
                  void hapticTap();
                  console.log('[PRIVACY] open dialogue_memory'); // guard-ok: вход в экран контроля данных
                  router.push('/dialogue_v2_memory' as any);
                }}
                glass={glass}
                titleColor={glass.lightTint}
                scaled={scaled}
              />
            </View>
            <View style={noteStyle}>
              <PlateFill g={glass} radius={14} />
              <Text style={{ color: glass.secondary, fontSize: scaled(14), lineHeight: scaled(20), fontWeight: '400', flexShrink: 1 }}>
                {L({
                  ru: 'Каждая функция работает только после отдельного согласия. В зависимости от функции в OpenAI отправляется текст или речь. Выключено — новые запросы не отправляются.',
                  uk: 'Кожна функція працює лише після окремої згоди. Залежно від функції до OpenAI надсилається текст або мовлення. Вимкнено — нові запити не надсилаються.', en: "Each feature works only after separate consent. Depending on the feature, text or speech is sent to OpenAI. Turned off — no new requests are sent.",
                  es: 'Cada función requiere un consentimiento separado. Según la función, se envía texto o voz a OpenAI. Al desactivarla, no se envían solicitudes nuevas.',
                  'pt-BR': 'Cada função exige um consentimento separado. Conforme a função, texto ou voz é enviado à OpenAI. Desativada, nenhuma nova solicitação é enviada.',
                  vi: 'Mỗi tính năng cần sự đồng ý riêng. Tùy tính năng, văn bản hoặc giọng nói được gửi tới OpenAI. Khi tắt, không có yêu cầu mới nào được gửi.',
                  id: 'Setiap fitur memerlukan persetujuan terpisah. Tergantung fiturnya, teks atau suara dikirim ke OpenAI. Saat dimatikan, tidak ada permintaan baru yang dikirim.',
                  tr: 'Her özellik ayrı onay gerektirir. Özelliğe göre OpenAI\'ye metin veya konuşma gönderilir. Kapatıldığında yeni istek gönderilmez.',
                  pl: 'Każda funkcja wymaga osobnej zgody. Zależnie od funkcji do OpenAI trafia tekst lub mowa. Po wyłączeniu nowe żądania nie są wysyłane.',
                })}
              </Text>
            </View>

            {/* Юридические документы. */}
            <Text style={sectionTitleStyle}>{L({ ru: 'Документы', uk: 'Документи', en: "Documents", es: 'Documentos', 'pt-BR': 'Documentos', vi: 'Tài liệu', id: 'Dokumen', tr: 'Belgeler', pl: 'Dokumenty' })}</Text>
            <View style={{ gap: 10 }}>
              {/* зачем: владелец (референс Bevel) — документы открываются ВНУТРИ
                  приложения как шторка с текстом (privacy_screen/terms_screen),
                  а не уводят в браузер на сайт. Раньше здесь стоял Linking.openURL
                  на knowlyapps.com — пункт вёл наружу, шторки были недостижимы. */}
              <PrivacyRow
                testID="privacy-policy-row"
                icon="document-text"
                label={L({ ru: 'Политика конфиденциальности', uk: 'Політика конфіденційності', en: "Privacy Policy", es: 'Política de privacidad', 'pt-BR': 'Política de privacidade', vi: 'Chính sách bảo mật', id: 'Kebijakan privasi', tr: 'Gizlilik politikası', pl: 'Polityka prywatności' })}
                onPress={() => {
                  void hapticTap();
                  router.push('/privacy_screen' as any);
                }}
                glass={glass}
                titleColor={glass.lightTint}
                scaled={scaled}
              />
              <PrivacyRow
                testID="privacy-terms-row"
                icon="document-text"
                label={L({ ru: 'Условия использования', uk: 'Умови використання', en: "Terms of Use", es: 'Términos de uso', 'pt-BR': 'Termos de uso', vi: 'Điều khoản sử dụng', id: 'Ketentuan penggunaan', tr: 'Kullanım koşulları', pl: 'Warunki użytkowania' })}
                onPress={() => {
                  void hapticTap();
                  router.push('/terms_screen' as any);
                }}
                glass={glass}
                titleColor={glass.lightTint}
                scaled={scaled}
              />
            </View>

            {/* Удаление аккаунта. */}
            <Text style={sectionTitleStyle}>{L({ ru: 'Аккаунт', uk: 'Акаунт', en: "Account", es: 'Cuenta', 'pt-BR': 'Conta', vi: 'Tài khoản', id: 'Akun', tr: 'Hesap', pl: 'Konto' })}</Text>
            <View style={{ gap: 10 }}>
              <PrivacyRow
                testID="privacy-delete-account"
                icon="trash"
                label={L({ ru: 'Удалить аккаунт и данные', uk: 'Видалити акаунт і дані', en: "Delete account and data", es: 'Eliminar cuenta y datos', 'pt-BR': 'Excluir conta e dados', vi: 'Xóa tài khoản và dữ liệu', id: 'Hapus akun dan data', tr: 'Hesabı ve verileri sil', pl: 'Usuń konto i dane' })}
                onPress={() => {
                  void hapticTap();
                  setDeleteModalVisible(true);
                }}
                glass={glass}
                titleColor={t.wrong}
                labelColor={t.wrong}
                scaled={scaled}
              />
            </View>
          </BouncyScrollView>
        </ContentWrap>
      </View>

      <DeleteAccountConfirmModal
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      />
    </ScreenGradient>
  );
}
