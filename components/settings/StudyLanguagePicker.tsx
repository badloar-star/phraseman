// ═══════════════════════════════════════════════════════════════════════════
// StudyLanguagePicker — выбор изучаемого языка в настройках.
//
// Горизонтальная лента карточек: иконка-флаг + подпись языка. Языки, которые
// пользователь уже начал учить, помечены галочкой «учу» — их можно переключать
// свободно (прогресс каждого языка живёт в своём namespace). Новый язык:
//   • фри-аккаунт с ≥1 начатым языком → пейвол context='language_add';
//   • иначе → экран приветствия /language_welcome (пара вопросов для плана).
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ENABLE_DEV_STUDY_TARGET_LANG } from '../../app/config';
import { openPremiumPaywall } from '../../app/paywall_navigation';
import { usePremium } from '../PremiumContext';
import { studyTargetsForSourceLocale } from '../../app/study_target';
import {
  devStudyTargetsForUiLang,
  studyTargetLabelForSourceUiLang,
  type StudyTargetLang,
  type StudyTargetSourceUiLang,
} from '../../app/study_target_lang_dev';
import {
  applyStudyLanguageSelection,
  getStartedStudyLanguages,
  shouldGateExtraLanguage,
} from '../../app/study_languages';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';

/** Качественные иконки языков (512×512, те же, что в онбординге). */
const RELEASE_LANGUAGE_FLAG_ASSETS: Record<'en', ImageSourcePropType> = {
  en: require('../../assets/images/language_flags/language_en.webp'),
};

const DEV_LANGUAGE_FLAG_ASSETS: Partial<Record<StudyTargetLang, ImageSourcePropType>> = {
  es: require('../../assets/images/language_flags/language_es_dev.webp'),
};

function languageFlagAssetFor(code: StudyTargetLang): ImageSourcePropType | undefined {
  if (code === 'en') return RELEASE_LANGUAGE_FLAG_ASSETS.en;
  if (!ENABLE_DEV_STUDY_TARGET_LANG) return undefined;
  return DEV_LANGUAGE_FLAG_ASSETS[code];
}

const CARD_WIDTH = 90;
const CARD_HEIGHT = 82;
const CARD_GAP = 10;
const FLAG_WIDTH = 66;
const FLAG_HEIGHT = 42;

export interface StudyLanguagePickerPalette {
  surfaceOn: string;
  surfaceOff: string;
  borderOn: string;
  borderOff: string;
  textOn: string;
  textOff: string;
  badge: string;
}

interface StudyLanguagePickerProps {
  lang: StudyTargetSourceUiLang;
  activeTarget: StudyTargetLang;
  palette: StudyLanguagePickerPalette;
  labelFontSize: number;
  /** Вызывается после успешного переключения на уже начатый язык. */
  onSwitched: () => void | Promise<void>;
}

export default function StudyLanguagePicker({
  lang,
  activeTarget,
  palette,
  labelFontSize,
  onSwitched,
}: StudyLanguagePickerProps) {
  const router = useRouter();
  const { hasPremiumAccess } = usePremium();
  const [startedLanguages, setStartedLanguages] = useState<readonly StudyTargetLang[]>([]);
  const [busy, setBusy] = useState(false);

  const reloadStarted = useCallback(async () => {
    const started = await getStartedStudyLanguages(activeTarget);
    setStartedLanguages(started);
  }, [activeTarget]);

  useEffect(() => {
    void reloadStarted();
  }, [reloadStarted]);

  const options: readonly StudyTargetLang[] = ENABLE_DEV_STUDY_TARGET_LANG
    ? devStudyTargetsForUiLang(lang)
    : studyTargetsForSourceLocale(lang);

  const onSelect = useCallback((code: StudyTargetLang) => {
    if (busy || code === activeTarget) return;
    doHaptic();
    void (async () => {
      const started = await getStartedStudyLanguages(activeTarget);
      if (started.includes(code)) {
        // Уже начатый язык — свободное переключение, прогресс сохранён за языком.
        setBusy(true);
        try {
          await applyStudyLanguageSelection(code, lang);
          await onSwitched();
          await reloadStarted();
        } finally {
          setBusy(false);
        }
        return;
      }
      if (shouldGateExtraLanguage({ target: code, startedLanguages: started, hasPremiumAccess })) {
        openPremiumPaywall(router, {
          context: 'language_add',
          source: 'settings_language_picker',
          language: code,
        });
        return;
      }
      // Новый язык разрешён — приветствие и пара вопросов для будущего плана.
      router.push({ pathname: '/language_welcome', params: { target: code } } as any);
    })();
  }, [busy, activeTarget, lang, hasPremiumAccess, router, onSwitched, reloadStarted]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={CARD_WIDTH + CARD_GAP}
      snapToAlignment="start"
      contentContainerStyle={{ gap: CARD_GAP, paddingVertical: 2, paddingRight: 20 }}
    >
      {options.map((code) => {
        const active = code === activeTarget;
        const learning = startedLanguages.includes(code);
        const flagAsset = languageFlagAssetFor(code);
        const locked = !learning && !hasPremiumAccess && startedLanguages.length > 0;
        return (
          <TouchableOpacity
            key={code}
            activeOpacity={0.85}
            disabled={busy}
            onPress={() => onSelect(code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={studyTargetLabelForSourceUiLang(code, lang)}
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 7,
              paddingHorizontal: 6,
              borderRadius: 16,
              borderWidth: 0,
              borderColor: active ? palette.borderOn : palette.borderOff,
              backgroundColor: active ? palette.surfaceOn : palette.surfaceOff,
            }}
          >
            <View
              style={{
                width: FLAG_WIDTH,
                height: FLAG_HEIGHT,
                borderRadius: 9,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.10)',
                marginBottom: 6,
              }}
            >
              {flagAsset ? (
                <Image source={flagAsset} style={{ width: FLAG_WIDTH, height: FLAG_HEIGHT }} resizeMode="cover" />
              ) : (
                <Ionicons name="flag-outline" size={24} color={active ? palette.textOn : palette.textOff} />
              )}
              {learning && !active ? (
                <View
                  style={{
                    position: 'absolute',
                    right: 3,
                    bottom: 3,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: palette.badge,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" size={12} color="#07111F" />
                </View>
              ) : null}
              {locked ? (
                <View
                  style={{
                    position: 'absolute',
                    right: 3,
                    bottom: 3,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: palette.surfaceOn,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="lock-closed" size={11} color={palette.textOn} />
                </View>
              ) : null}
            </View>
            {/* зачем: раньше здесь было динамическое сжатие шрифта (запрещённый
                паттерн — ужимает короткие варианты на iOS). Длина названия языка
                сильно варьируется по локалям («Español» vs «日本語»); вместо
                сжатия — перенос на 2 строки, tile под ним уже с запасом. */}
            <Text
              numberOfLines={2}
              style={{
                color: active ? palette.textOn : palette.textOff,
                width: '100%',
                fontSize: Math.max(9, labelFontSize - 2),
                lineHeight: Math.max(11, labelFontSize + 1),
                fontWeight: active ? '800' : '700',
                textAlign: 'center',
              }}
            >
              {studyTargetLabelForSourceUiLang(code, lang)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
