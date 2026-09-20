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
import { openPremiumPaywall } from '../../app/paywall_navigation';
import { usePremium } from '../PremiumContext';
import { studyTargetsForSourceLocale, type StudyTarget } from '../../app/study_target';
import { LEARNING_LANGUAGE_CONTOURS } from '../../app/learning_language_contour';
import type { Lang } from '../../constants/i18n';
import {
  applyStudyLanguageSelection,
  getStartedStudyLanguages,
  shouldGateExtraLanguage,
} from '../../app/study_languages';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';
import { actionToastTri, emitAppEvent } from '../../app/events';

// Собственные имена языков узнаваемы при любом языке интерфейса.
const STUDY_TARGET_NATIVE_NAME: Record<StudyTarget, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

function switchedLanguageToastCopy(target: StudyTarget) {
  const name = STUDY_TARGET_NATIVE_NAME[target];
  return {
    ru: `Теперь учишь ${name}`,
    uk: `Тепер вчиш ${name}`,
    es: `Ahora estás aprendiendo ${name}`,
    'pt-BR': `Agora você está aprendendo ${name}`,
    vi: `Bây giờ bạn đang học ${name}`,
    id: `Sekarang kamu belajar ${name}`,
    tr: `Artık ${name} öğreniyorsun`,
    pl: `Teraz uczysz się: ${name}`,
  } as const;
}

/** Качественные иконки языков (512×512, те же, что в онбординге). */
const RELEASE_LANGUAGE_FLAG_ASSETS: Record<'en', ImageSourcePropType> = {
  en: require('../../assets/images/language_flags/language_en.webp'),
};

function languageFlagAssetFor(code: StudyTarget): ImageSourcePropType | undefined {
  if (code === 'en') return RELEASE_LANGUAGE_FLAG_ASSETS.en;
  return undefined;
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
  lang: Lang;
  activeTarget: StudyTarget;
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
  const [startedLanguages, setStartedLanguages] = useState<readonly StudyTarget[]>([activeTarget]);
  const [startedLanguagesResolved, setStartedLanguagesResolved] = useState(false);
  const [busy, setBusy] = useState(false);

  const reloadStarted = useCallback(async () => {
    const started = await getStartedStudyLanguages(activeTarget);
    setStartedLanguages(started);
    setStartedLanguagesResolved(true);
  }, [activeTarget]);

  useEffect(() => {
    void reloadStarted();
  }, [reloadStarted]);

  const options = studyTargetsForSourceLocale(lang);

  const onSelect = useCallback((code: StudyTarget) => {
    if (busy || code === activeTarget) return;
    doHaptic();
    if (!startedLanguagesResolved) {
      // Open an opaque resolver route in this frame. It performs the storage
      // decision after navigation, so a cold tap is both immediate and correct.
      router.push({
        pathname: '/language_welcome',
        params: { target: code, resolveStarted: '1' },
      } as any);
      return;
    }
    const started = startedLanguages;
    if (started.includes(code)) {
    void (async () => {
      // Уже начатый язык — свободное переключение, прогресс сохранён за языком.
      setBusy(true);
      try {
        await applyStudyLanguageSelection(code, lang);
        // зачем (аудит 2026-08-22): переключение раньше было полностью молчаливым —
        // весь контент приложения менялся без единого подтверждения пользователю.
        emitAppEvent('action_toast', actionToastTri('success', switchedLanguageToastCopy(code)));
        await onSwitched();
        await reloadStarted();
      } finally {
        setBusy(false);
      }
    })();
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
  }, [busy, activeTarget, startedLanguages, startedLanguagesResolved, lang, hasPremiumAccess, router, onSwitched, reloadStarted]);

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
            accessibilityLabel={STUDY_TARGET_NATIVE_NAME[code]}
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
                <Text style={{ fontSize: 27 }}>{LEARNING_LANGUAGE_CONTOURS[code].flagGlyph}</Text>
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
              {STUDY_TARGET_NATIVE_NAME[code]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
