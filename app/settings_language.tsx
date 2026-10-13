import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { coerceInterfaceLang, getVisibleInterfaceLanguageOptions, triLang, type Lang } from '../constants/i18n';
import { IS_STORE_RELEASE } from './config';
import { safeRouterBack } from './navigation_back';
import PressableHybrid from '../components/PressableHybrid';
import { nestedBoxShadow, PlateFill, plateBoxShadow, raisedBoxShadow, RAISED_LIFT } from '../components/v2/ShadowSurface';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Image } from 'expo-image';
import { isStudyTargetAllowedForUi, type StudyTarget } from './study_target';
import { useStudyTarget } from '../components/StudyTargetContext';
import { SettingsGlassEyebrow, SettingsGlassRow } from '../components/settings/SettingsGlassRows';
import StudyLanguageSheet from '../components/settings/StudyLanguageSheet';

// зачем: паритет с макетом profile.html PRF-03 — внизу экрана языков блок «Язык изучения» с флагом текущего языка.
const STUDY_NAME: Record<StudyTarget, string> = { en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano' };
const STUDY_FLAG: Record<StudyTarget, number> = {
  en: require('../assets/images/language_flags/language_en.webp'),
  es: require('../assets/images/language_flags/language_es_dev.webp'),
  fr: require('../assets/images/language_flags/language_fr_dev.webp'),
  de: require('../assets/images/language_flags/language_de.webp'),
  it: require('../assets/images/language_flags/language_it.webp'),
};

export default function SettingsLanguage() {
  const router = useRouter();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const { lang, setLang, s } = useLang();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  // зачем (ревью 11.10): язык изучения — из общего StudyTargetContext: первый кадр сразу с последним известным
  // языком (снимок peek), смена языка приходит событием STUDY_TARGET_CHANGED — без своего второго источника правды.
  const { studyTarget } = useStudyTarget();
  // зачем: паритет profile.html PRF-03 (13.10): строка «Язык изучения» — кнопка с шевроном, открывает ту же шторку, что и в Настройках.
  // зачем (вариант А): пара «интерфейс en + изучаю en» → шторка выбора языка изучения открыта сразу (миграция и смена интерфейса на English).
  const { chooseStudy } = useLocalSearchParams<{ chooseStudy?: string }>();
  const [studySheetVisible, setStudySheetVisible] = useState(chooseStudy === '1');
  useEffect(() => {
    if (isStudyTargetAllowedForUi(studyTarget, lang as Lang)) return;
    console.log(`[EN-UI-STUDY-TARGET] settings_language: ui=${lang} target=${studyTarget} не разрешена — открываю шторку языка изучения`);
    setStudySheetVisible(true);
  }, [lang, studyTarget]);
  const closeLabel = triLang(lang as Lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  const subtitle = triLang(lang as Lang, {
    ru: 'Язык меню и подсказок приложения', uk: 'Мова меню та підказок застосунку', en: 'Language for the app menus and hints', es: 'Idioma de los menús y las pistas de la app',
    'pt-BR': 'Idioma dos menus e dicas do aplicativo', vi: 'Ngôn ngữ cho menu và gợi ý của ứng dụng', id: 'Bahasa untuk menu dan petunjuk aplikasi', tr: 'Uygulama menüleri ve ipuçlarının dili', pl: 'Język menu i wskazówek aplikacji',
  });
  // зачем (стиль «Тень», владелец 12.10): строка — плашка с тенью без кромки; выбранный язык приподнят (RAISED_LIFT на внешней обёртке), overflow не ставим — клип резал бы тень.
  const rowStyle = { minHeight: 64, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 14, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) };
  const activeRowStyle = { ...rowStyle, boxShadow: raisedBoxShadow(glass) };
  // зачем (координатор 12.10, profile-004/005 роняют qemu c0000005): строки [PROFILE-RENDER] — вход экрана и каждый тяжёлый слой
  // (фон V2Backdrop: SVG-радиальный + линейный градиент на весь экран; тени boxShadow с размытием на каждой строке; флаги).
  // Последняя строка перед падением укажет слой. Сперва логи, без починки.
  // Ленивый инициализатор useState вызывается один раз — строка входа без лишнего хука.
  useState(() => {
    console.log('[PROFILE-RENDER] settings_language render_start', JSON.stringify({
      themeId: liquidGlassThemeId, studyTarget, interfaceRows: getVisibleInterfaceLanguageOptions(IS_STORE_RELEASE).length,
      rowShadow: rowStyle.boxShadow, activeShadow: activeRowStyle.boxShadow, backdrop: 'ScreenGradient→V2Backdrop(svg radial + linear)',
    }));
    return true;
  });
  useEffect(() => {
    console.log('[PROFILE-RENDER] settings_language mounted');
  }, []);
  useEffect(() => {
    if (studySheetVisible) console.log('[PROFILE-RENDER] settings_language study_sheet open (profile-005)');
  }, [studySheetVisible]);

  return (
    <ScreenGradient>
      <View
        testID="settings-language-screen"
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          console.log('[PROFILE-RENDER] settings_language layout', JSON.stringify({ width: Math.round(width), height: Math.round(height) }));
        }}
      >
        <ContentWrap>
          {/* зачем: паритет profile.html PRF-03 (13.10): поля экрана 20, круг «Закрыть» 42 со значком 21, разрядка заголовка −0.5 */}
          <BouncyScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} scrollEventThrottle={16}>
            <PressableHybrid
              testID="settings-language-back"
              accessibilityLabel={closeLabel}
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)}
              withHaptic={true}
              withSound={false}
              variant="icon"
              hitSlop={{ top: 3, right: 3, bottom: 3, left: 3 }}
              style={{ width: 42, height: 42, alignSelf: 'flex-start', marginTop: 3 }}
              contentStyle={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, boxShadow: nestedBoxShadow(glass) }}
            >
              <Ionicons name="close" size={21} color={glass.lightTint} />
            </PressableHybrid>
            <Text maxFontSizeMultiplier={1.15} style={{ color: t.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 10 }}>{s.settings.lang}</Text>
            <Text style={{ color: t.textMuted, fontSize: 16, lineHeight: 22, marginTop: 7 }}>{subtitle}</Text>
            <View style={{ marginTop: 22, gap: 10 }}>
            {getVisibleInterfaceLanguageOptions(IS_STORE_RELEASE).map((item) => {
              const interfaceCode = coerceInterfaceLang(item.code);
              const enabled = interfaceCode === item.code;
              const active = lang === item.code;
              return (
                <PressableHybrid
                  key={item.code}
                  testID={`settings-language-row-${item.code}`}
                  accessibilityLabel={item.native}
                  accessibilityState={{ selected: active, disabled: !enabled }}
                  disabled={!enabled}
                  onPress={() => {
                    if (!interfaceCode) return;
                    // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
                    void setLang(interfaceCode);
                  }}
                  withHaptic={false}
                  withSound={false}
                  variant="card"
                  // зачем (координатор 12.10, 🔴 краш смены языка): ключ transform со значением undefined у бывшей активной строки Fabric превращал в null →
                  // processTransform(null) в dev падал на null.forEach. Ключ transform — всегда массив; [] = «без сдвига». Сторож: transform_never_undefined_contract.
                  style={{ opacity: enabled ? 1 : 0.42, transform: active ? [{ translateY: RAISED_LIFT }] : [] }}
                  contentStyle={active ? activeRowStyle : rowStyle}
                >
                  <PlateFill g={glass} radius={14} raised={active} />
                  <Text style={{ flex: 1, minWidth: 0, color: t.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>
                    {item.native}
                  </Text>
                  {active ? (
                    <Ionicons name="checkmark" size={20} color={glass.lightTint} />
                  ) : !enabled ? (
                    <Ionicons name="lock-closed" size={18} color={glass.secondary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={glass.secondary} />
                  )}
                </PressableHybrid>
              );
            })}
            </View>
            {/* зачем: паритет profile.html PRF-03 (13.10): над «ЯЗЫК ИЗУЧЕНИЯ» отступ 26 (в макете .eyebrow margin 26px 4px 10px) */}
            <View style={{ marginTop: 2 }}>
              <SettingsGlassEyebrow glass={glass} title={triLang(lang as Lang, { ru: 'ЯЗЫК ИЗУЧЕНИЯ', uk: 'МОВА НАВЧАННЯ', en: 'LEARNING LANGUAGE', es: 'IDIOMA DE ESTUDIO', 'pt-BR': 'IDIOMA DE ESTUDO', vi: 'NGÔN NGỮ HỌC', id: 'BAHASA BELAJAR', tr: 'ÖĞRENİLEN DİL', pl: 'JĘZYK NAUKI' })} />
            </View>
            <SettingsGlassRow
              glass={glass}
              testID="settings-language-study-row"
              leading={(
                <Image
                  source={STUDY_FLAG[studyTarget]}
                  accessible={false}
                  style={{ width: 54, height: 38, borderRadius: 10 }}
                  contentFit="cover"
                  onLoad={(event) => console.log('[PROFILE-RENDER] settings_language flag loaded', JSON.stringify({ studyTarget, w: event.source.width, h: event.source.height }))}
                  onError={(event) => console.warn('[PROFILE-RENDER] settings_language flag error', JSON.stringify({ studyTarget, error: String(event.error).slice(0, 120) }))}
                />
              )}
              title={STUDY_NAME[studyTarget]}
              sub={triLang(lang as Lang, { ru: 'Сейчас изучаешь', uk: 'Зараз вивчаєш', en: 'Currently learning', es: 'Estudias ahora', 'pt-BR': 'Estudando agora', vi: 'Đang học', id: 'Sedang dipelajari', tr: 'Şu an öğreniyorsun', pl: 'Teraz się uczysz' })}
              onPress={() => setStudySheetVisible(true)}
            />
          </BouncyScrollView>
        </ContentWrap>
      </View>
      <StudyLanguageSheet
        visible={studySheetVisible}
        onClose={() => setStudySheetVisible(false)}
        lang={lang as Lang}
        activeTarget={studyTarget}
        logTag="[SETTINGS-LANG-STUDY]"
      />
    </ScreenGradient>
  );
}
