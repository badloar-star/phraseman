import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import SectionSheetHeader from '../components/SectionSheetHeader';
import PressableHybrid from '../components/PressableHybrid';
import FeatureIntroModal from '../components/FeatureIntroModal';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useRuntimeActive } from '../hooks/use_runtime_active';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { safeRouterBack } from './navigation_back';
import { FEATURE_INTRO_REGISTRY, type FeatureIntroDef } from './feature_intro_registry';
import { featureGuideTitle, featureIntroClose } from './feature_intro_copy';
import { triLang } from '../constants/i18n';

/** Manual preview only: no seen-state reset, consent, navigation into a paid flow or network work. */
export default function FeatureGuideScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const active = useRuntimeActive();
  const [selected, setSelected] = useState<FeatureIntroDef | null>(null);
  useEffect(() => { if (!active) setSelected(null); }, [active]);
  const close = () => setSelected(null);
  return <ScreenGradient>
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ContentWrap>
        <SectionSheetHeader title={featureGuideTitle(lang)} onClose={() => safeRouterBack(router, '/(tabs)/settings')} motionVariant="hybrid" />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.5, marginBottom: 12 }}>{triLang(lang, {
            ru: 'Выбери то, с чем хочешь разобраться. Объяснение откроется здесь и не запустит занятие.',
            uk: 'Вибери, з чим хочеш розібратися. Пояснення відкриється тут і не почне заняття.',
            en: 'Choose what you want to explore. The explanation opens here without starting a session.',
            es: 'Elige qué quieres conocer. La explicación se abre aquí sin iniciar una sesión.',
            'pt-BR': 'Escolha o que quer conhecer. A explicação abre aqui sem iniciar uma sessão.',
            vi: 'Chọn điều bạn muốn tìm hiểu. Phần giải thích mở tại đây mà không bắt đầu buổi học.',
            id: 'Pilih yang ingin kamu pahami. Penjelasan terbuka di sini tanpa memulai sesi.',
            tr: 'Öğrenmek istediğin bölümü seç. Açıklama burada açılır, çalışma başlamaz.',
            pl: 'Wybierz, co chcesz poznać. Wyjaśnienie otworzy się tutaj bez rozpoczynania ćwiczenia.',
          })}</Text>
          {FEATURE_INTRO_REGISTRY.map(def => <PressableHybrid key={def.id} variant="card" testID={`guide-${def.id}`} accessibilityLabel={def.title(lang)} onPress={() => setSelected(def)} style={{ backgroundColor: t.bgSurface, borderRadius: 20 }} contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, minHeight: 72 }}>
            <Ionicons name={def.icon} size={25} color={t.accent} />
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{def.title(lang)}</Text>
            <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
          </PressableHybrid>)}
        </ScrollView>
      </ContentWrap>
      {selected ? <FeatureIntroModal visible={active} family={selected.family} art={selected.art} icon={selected.icon} title={selected.title(lang)} body={selected.body(lang)} ctaLabel={featureIntroClose(lang)} laterLabel={featureIntroClose(lang)} hideSecondary onDone={close} onLater={close} testIdPrefix={`guide-intro-${selected.id}`} /> : null}
    </View>
  </ScreenGradient>;
}
