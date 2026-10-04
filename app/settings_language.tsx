import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { coerceInterfaceLang, getVisibleInterfaceLanguageOptions, triLang, type Lang } from '../constants/i18n';
import { IS_STORE_RELEASE } from './config';
import { safeRouterBack } from './navigation_back';
import PressableHybrid from '../components/PressableHybrid';
import SafeLinearGradient from '../components/SafeLinearGradient';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { Image } from 'expo-image';
import { getStoredStudyTarget, type StudyTarget } from './study_target';
import { SettingsGlassEyebrow, SettingsGlassRow } from '../components/settings/SettingsGlassRows';

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
  const [studyTarget, rememberShownStudyTarget] = useState<StudyTarget>('en');
  useEffect(() => {
    let alive = true;
    getStoredStudyTarget(lang as Lang)
      .then((v) => { if (alive) rememberShownStudyTarget(v); })
      .catch((error: unknown) => { console.warn(`[SETTINGS-LANG] study_target_load_failed reason=${error instanceof Error ? error.message : String(error)}`); });
    return () => { alive = false; };
  }, [lang]);
  const closeLabel = triLang(lang as Lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  const subtitle = triLang(lang as Lang, {
    ru: 'Язык меню и подсказок приложения', uk: 'Мова меню та підказок застосунку', en: 'Language for the app menus and hints', es: 'Idioma de los menús y las pistas de la app',
    'pt-BR': 'Idioma dos menus e dicas do aplicativo', vi: 'Ngôn ngữ cho menu và gợi ý của ứng dụng', id: 'Bahasa untuk menu dan petunjuk aplikasi', tr: 'Uygulama menüleri ve ipuçlarının dili', pl: 'Język menu i wskazówek aplikacji',
  });
  const rowStyle = { minHeight: 64, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 14, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: glass.opaqueCard, borderWidth: 1, borderColor: glass.glassEdge, overflow: 'hidden' as const };

  return (
    <ScreenGradient>
      <View testID="settings-language-screen" style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <BouncyScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }} scrollEventThrottle={16}>
            <PressableHybrid
              testID="settings-language-back"
              accessibilityLabel={closeLabel}
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)}
              withHaptic={true}
              withSound={false}
              variant="icon"
              style={{ width: 48, height: 48, alignSelf: 'flex-start', marginTop: 4 }}
              contentStyle={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, borderWidth: 1, borderColor: glass.glassEdge }}
            >
              <Ionicons name="close" size={20} color={glass.lightTint} />
            </PressableHybrid>
            <Text style={{ color: t.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '700', marginTop: 10 }}>{s.settings.lang}</Text>
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
                  style={{ opacity: enabled ? 1 : 0.42 }}
                  contentStyle={rowStyle}
                >
                  <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
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
            <SettingsGlassEyebrow glass={glass} title={triLang(lang as Lang, { ru: 'ЯЗЫК ИЗУЧЕНИЯ', uk: 'МОВА НАВЧАННЯ', en: 'LEARNING LANGUAGE', es: 'IDIOMA DE ESTUDIO', 'pt-BR': 'IDIOMA DE ESTUDO', vi: 'NGÔN NGỮ HỌC', id: 'BAHASA BELAJAR', tr: 'ÖĞRENİLEN DİL', pl: 'JĘZYK NAUKI' })} />
            <SettingsGlassRow
              glass={glass}
              testID="settings-language-study-row"
              leading={<Image source={STUDY_FLAG[studyTarget]} accessible={false} style={{ width: 54, height: 38, borderRadius: 10 }} contentFit="cover" />}
              title={STUDY_NAME[studyTarget]}
              sub={triLang(lang as Lang, { ru: 'Сейчас изучаете', uk: 'Зараз вивчаєте', en: 'Currently learning', es: 'Estudias ahora', 'pt-BR': 'Estudando agora', vi: 'Đang học', id: 'Sedang dipelajari', tr: 'Şu an öğreniyorsun', pl: 'Teraz się uczysz' })}
            />
          </BouncyScrollView>
        </ContentWrap>
      </View>
    </ScreenGradient>
  );
}
