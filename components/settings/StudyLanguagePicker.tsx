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
import { Ionicons } from '@expo/vector-icons';
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
const LANGUAGE_FLAG_ASSETS: Partial<Record<StudyTargetLang, ImageSourcePropType>> = {
  en: require('../../assets/images/flow_clean_202607/language_en.png'),
  fr: require('../../assets/images/flow_clean_202607/language_fr.png'),
};

/** Эмодзи-фолбэк для языков без отрисованной иконки (dev-испанский). */
const LANGUAGE_FLAG_EMOJI: Record<StudyTargetLang, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
};

const CARD_WIDTH = 92;
const CARD_GAP = 10;

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
        const flagAsset = LANGUAGE_FLAG_ASSETS[code];
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
              alignItems: 'center',
              paddingVertical: 10,
              paddingHorizontal: 6,
              borderRadius: 16,
              borderWidth: active ? 2 : 0.5,
              borderColor: active ? palette.borderOn : palette.borderOff,
              backgroundColor: active ? palette.surfaceOn : palette.surfaceOff,
            }}
          >
            <View style={{ width: 44, height: 44, marginBottom: 6, alignItems: 'center', justifyContent: 'center' }}>
              {flagAsset ? (
                <Image source={flagAsset} style={{ width: 44, height: 44 }} resizeMode="contain" />
              ) : (
                <Text style={{ fontSize: 32 }}>{LANGUAGE_FLAG_EMOJI[code]}</Text>
              )}
              {learning && !active ? (
                <View
                  style={{
                    position: 'absolute',
                    right: -4,
                    bottom: -2,
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
                    right: -4,
                    bottom: -2,
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
            <Text
              numberOfLines={1}
              style={{
                color: active ? palette.textOn : palette.textOff,
                fontSize: labelFontSize,
                fontWeight: active ? '800' : '600',
              }}
            >
              {studyTargetLabelForSourceUiLang(code, lang)}
            </Text>
            {active ? (
              <Ionicons name="checkmark-circle" size={14} color={palette.textOn} style={{ marginTop: 3 }} />
            ) : (
              <View style={{ height: 14, marginTop: 3 }} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
