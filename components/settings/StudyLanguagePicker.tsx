// ═══════════════════════════════════════════════════════════════════════════
// StudyLanguagePicker — выбор изучаемого языка в настройках.
//
// Горизонтальная лента карточек: иконка-флаг + подпись языка. Языки, которые
// пользователь уже начал учить, помечены галочкой «учу» — их можно переключать
// свободно (прогресс каждого языка живёт в своём namespace). Новый язык →
// экран приветствия /language_welcome (пара вопросов для плана). Plus не нужен:
// владелец 2026-09-30 «языки обучения все фри без плюс».
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow, raisedBoxShadow } from '../v2/ShadowSurface';
import { studyTargetsForSourceLocale, type StudyTarget } from '../../app/study_target';
import { LEARNING_LANGUAGE_CONTOURS } from '../../app/learning_language_contour';
import type { Lang } from '../../constants/i18n';
import {
  applyStudyLanguageSelection,
  getStartedStudyLanguages,
  peekStartedStudyLanguages,
} from '../../app/study_languages';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';
import { actionToastTri, emitAppEvent } from '../../app/events';

// Собственные имена языков узнаваемы при любом языке интерфейса.
export const STUDY_TARGET_NATIVE_NAME: Record<StudyTarget, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};

function switchedLanguageToastCopy(target: StudyTarget) {
  const name = STUDY_TARGET_NATIVE_NAME[target];
  return {
    ru: `Теперь учишь ${name}`,
    uk: `Тепер вчиш ${name}`,
    es: `Ahora estás aprendiendo ${name}`, en: `Now learning ${name}`,
    'pt-BR': `Agora você está aprendendo ${name}`,
    vi: `Bây giờ bạn đang học ${name}`,
    id: `Sekarang kamu belajar ${name}`,
    tr: `Artık ${name} öğreniyorsun`,
    pl: `Teraz uczysz się: ${name}`,
  } as const;
}

/** Флаги языков (512×320, те же, что в онбординге). зачем D129/D130: флаг есть у всех пяти. */
const RELEASE_LANGUAGE_FLAG_ASSETS: Record<StudyTarget, ImageSourcePropType> = {
  en: require('../../assets/images/language_flags/language_en.webp'),
  es: require('../../assets/images/language_flags/language_es_dev.webp'),
  fr: require('../../assets/images/language_flags/language_fr_dev.webp'),
  de: require('../../assets/images/language_flags/language_de.webp'),
  it: require('../../assets/images/language_flags/language_it.webp'),
};

export function languageFlagAssetFor(code: StudyTarget): ImageSourcePropType | undefined {
  return RELEASE_LANGUAGE_FLAG_ASSETS[code];
}

function switchFailedToastCopy() {
  // зачем одной строкой: словарь локалей в строку храповик переводов (scan_untranslated_ui) узнаёт как перевод.
  return { ru: 'Не получилось сменить язык. Попробуй ещё раз.', uk: 'Не вдалося змінити мову. Спробуй ще раз.', en: 'Couldn’t switch the language. Try again.', es: 'No se pudo cambiar el idioma. Inténtalo de nuevo.', 'pt-BR': 'Não foi possível trocar o idioma. Tente de novo.', vi: 'Không đổi được ngôn ngữ. Thử lại nhé.', id: 'Bahasa gagal diganti. Coba lagi.', tr: 'Dil değiştirilemedi. Tekrar dene.', pl: 'Nie udało się zmienić języka. Spróbuj ponownie.' } as const;
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

export type StudyLanguageSelectOutcome = 'ignored_busy' | 'ignored_same' | 'resolver' | 'switch' | 'welcome';

export interface UseStudyLanguageSelectionArgs {
  lang: Lang;
  activeTarget: StudyTarget;
  /** Префикс логов вызывающего экрана (правило «сперва логи»), например `[VIDEO-LANG-PILL]`. */
  logTag?: string;
  /** Синхронно перед переходом на /language_welcome — закрыть шторку до навигации. */
  onBeforeNavigate?: () => void;
  /** Синхронно в момент тапа по уже начатому языку — оптимистичный отклик (галочка, закрытие шторки). */
  onSwitchStart?: (code: StudyTarget) => void;
  /** После успешного переключения на уже начатый язык. */
  onSwitched?: () => void | Promise<void>;
  /** Запись не удалась и язык НЕ сменился — откатить оптимистичную отметку (тост об ошибке хук показывает сам). */
  onSwitchFailed?: (code: StudyTarget) => void;
  /**
   * D188 (владелец 14.10: «И ВСЕ РАЗБЛОКИРОВАНЫ», тап по любому языку сразу переключает обучение): неначатый язык
   * включается тем же путём, что начатый (applyStudyLanguageSelection сам отмечает его начатым), без экрана приветствия.
   */
  switchNewLanguagesDirectly?: boolean;
}

/**
 * Общая логика выбора изучаемого языка (PRF-23): лента в настройках и шторка «Язык изучения» с пилюли Видео.
 * зачем (баг владельца 11.10): пилюля языка на вкладке «Видео» вела в язык ИНТЕРФЕЙСА; выбор изучаемого
 * языка жил только внутри этого компонента без живого вызова. Логика вынесена в хук, чтобы шторка Видео
 * переключала язык тем же путём (applyStudyLanguageSelection → STUDY_TARGET_CHANGED), а не своим.
 */
export function useStudyLanguageSelection({
  lang,
  activeTarget,
  logTag = '[STUDY-LANG-PICK]',
  onBeforeNavigate,
  onSwitchStart,
  onSwitched,
  onSwitchFailed,
  switchNewLanguagesDirectly = false,
}: UseStudyLanguageSelectionArgs) {
  const router = useRouter();
  // зачем (аудит «мгновенное открытие», 04.10): если список начатых языков уже известен в памяти (по аккаунту) — берём его первым кадром и считаем
  // «разрешённым»: ранний тап больше не уходит в резолвер-роут со спиннером. Чтение хранилища всё равно идёт фоном и заменяет значение.
  const [startedLanguages, setStartedLanguages] = useState<readonly StudyTarget[]>(() => peekStartedStudyLanguages() ?? [activeTarget]);
  const [startedLanguagesResolved, setStartedLanguagesResolved] = useState(() => peekStartedStudyLanguages() !== null);
  const [busy, setBusy] = useState(false);
  // зачем: защита от двойного тапа в одном кадре — setBusy ещё не применился, а второй тап уже пришёл.
  const busyRef = useRef(false);

  const reloadStarted = useCallback(async () => {
    try {
      const started = await getStartedStudyLanguages(activeTarget);
      setStartedLanguages(started);
      setStartedLanguagesResolved(true);
      if (__DEV__) console.log(`${logTag} started_loaded source=storage active=${activeTarget} started=${started.join(',')}`);
    } catch (error: unknown) {
      console.warn(`${logTag} started_load_failed active=${activeTarget} reason=${error instanceof Error ? error.message : String(error)}`);
    }
  }, [activeTarget, logTag]);

  useEffect(() => {
    void reloadStarted();
  }, [reloadStarted]);

  const options = studyTargetsForSourceLocale(lang);

  const select = useCallback((code: StudyTarget): StudyLanguageSelectOutcome => {
    if (__DEV__) console.log(`${logTag} select code=${code} active=${activeTarget} busy=${busyRef.current} resolved=${startedLanguagesResolved} started=${startedLanguages.join(',')}`);
    if (busyRef.current) {
      console.warn(`${logTag} select_ignored reason=busy code=${code}`);
      return 'ignored_busy';
    }
    if (code === activeTarget) {
      if (__DEV__) console.log(`${logTag} select_ignored reason=already_active code=${code}`);
      return 'ignored_same';
    }
    doHaptic();
    if (!startedLanguagesResolved && !switchNewLanguagesDirectly) {
      // Open an opaque resolver route in this frame. It performs the storage
      // decision after navigation, so a cold tap is both immediate and correct.
      if (__DEV__) console.log(`${logTag} branch=resolver route=/language_welcome target=${code} resolveStarted=1`);
      onBeforeNavigate?.();
      router.push({
        pathname: '/language_welcome',
        params: { target: code, resolveStarted: '1' },
      } as any);
      return 'resolver';
    }
    const alreadyStarted = startedLanguages.includes(code);
    if (alreadyStarted || switchNewLanguagesDirectly) {
      // Уже начатый язык — свободное переключение, прогресс сохранён за языком; D188 — так же и новый язык.
      if (__DEV__) console.log(`${logTag} branch=switch from=${activeTarget} to=${code} started=${alreadyStarted} direct=${switchNewLanguagesDirectly} resolved=${startedLanguagesResolved}`);
      busyRef.current = true;
      setBusy(true);
      onSwitchStart?.(code);
      void (async () => {
        const startedAt = Date.now();
        try {
          await applyStudyLanguageSelection(code, lang);
          if (__DEV__) console.log(`${logTag} switch_applied to=${code} ms=${Date.now() - startedAt}`);
          // зачем (аудит 2026-08-22): переключение раньше было полностью молчаливым —
          // весь контент приложения менялся без единого подтверждения пользователю.
          emitAppEvent('action_toast', actionToastTri('success', switchedLanguageToastCopy(code)));
          await onSwitched?.();
          await reloadStarted();
        } catch (error: unknown) {
          const step = (error as { step?: unknown } | null)?.step;
          const reason = error instanceof Error ? error.message : String(error);
          if (step === 'mark_started') {
            // зачем (ревью R4): язык уже сменён (target записан, событие ушло) — не сообщать «не получилось»;
            // не записалась только отметка «начат». Подтверждаем факт смены и логируем шаг.
            console.warn(`${logTag} switch_partial to=${code} step=mark_started reason=${reason} → язык сменён, тост успеха`);
            emitAppEvent('action_toast', actionToastTri('success', switchedLanguageToastCopy(code)));
            return;
          }
          // зачем: раньше здесь был try/finally без catch — отказ записи уходил в немой unhandled rejection.
          // Язык не сменился (контекст читает хранилище), поэтому откат — только честное сообщение.
          console.warn(`${logTag} switch_failed to=${code} step=${typeof step === 'string' ? step : 'unknown'} reason=${reason}`);
          onSwitchFailed?.(code); // отметка «активный» возвращается на прежний язык
          emitAppEvent('action_toast', actionToastTri('error', switchFailedToastCopy()));
        } finally {
          busyRef.current = false;
          setBusy(false);
        }
      })();
      return 'switch';
    }
    // Новый язык — приветствие и пара вопросов для будущего плана.
    if (__DEV__) console.log(`${logTag} branch=welcome route=/language_welcome target=${code}`);
    onBeforeNavigate?.();
    router.push({ pathname: '/language_welcome', params: { target: code } } as any);
    return 'welcome';
  }, [activeTarget, startedLanguages, startedLanguagesResolved, lang, router, onSwitched, onSwitchStart, onSwitchFailed, onBeforeNavigate, reloadStarted, logTag, switchNewLanguagesDirectly]);

  return { options, startedLanguages, startedLanguagesResolved, busy, select };
}

export default function StudyLanguagePicker({
  lang,
  activeTarget,
  palette,
  labelFontSize,
  onSwitched,
}: StudyLanguagePickerProps) {
  // зачем (profile.html «выбор языка изучения · шторка», владелец 2026-09-30): плитки языков на токенах
  // стекла темы — выбранная светлее и с тонкой кромкой, остальные плоским тоном; palette из настроек
  // остаётся в пропсах для совместимости вызова, цвета берём из темы. Логика выбора — общий хук ниже.
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
// зачем (координатор 12.10, Optimistic UI R1): отметка «активный» переезжает на выбранный язык в кадре тапа (как в шторке языка), не дожидаясь записи и контекста; отказ записи — откат (тост ошибки показывает хук).
  const [pendingTarget, setPendingTarget] = useState<StudyTarget | null>(null);
  const shownTarget = pendingTarget ?? activeTarget;
  const { options, startedLanguages, busy, select: onSelect } = useStudyLanguageSelection({
    lang, activeTarget, onSwitched,
    onSwitchStart: (code) => { console.log(`[STUDY-LANG-PICK] strip_optimistic shown=${code} was=${activeTarget}`); setPendingTarget(code); }, // guard-ok: оптимистичная отметка
    onSwitchFailed: (code) => { console.warn(`[STUDY-LANG-PICK] strip_rollback failed=${code} back_to=${activeTarget}`); setPendingTarget(null); }, // guard-ok: откат называет причину
  });
  // Контекст догнал (activeTarget стал выбранным) — отметка берётся из него; страховка: если не догнал за 3 с и запись уже не идёт — снимаем, чтобы метка не залипла.
  useEffect(() => {
    if (pendingTarget === null) return undefined;
    if (pendingTarget === activeTarget) { setPendingTarget(null); return undefined; }
    if (busy) return undefined;
    const timer = setTimeout(() => {
      console.warn(`[STUDY-LANG-PICK] strip_pending_cleared target=${pendingTarget} active=${activeTarget} reason=context_did_not_catch_up`); // guard-ok: страховка называет причину
      setPendingTarget(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [pendingTarget, activeTarget, busy]);
  // зачем (координатор 12.10, profile-005 роняет qemu c0000005): вход шторки и тяжёлые слои — плитки с тенью boxShadow и флаги.
  const pickerLoggedRef = useRef(false);
  if (!pickerLoggedRef.current) {
    pickerLoggedRef.current = true;
    console.log('[PROFILE-RENDER] study_picker render_start', JSON.stringify({
      themeId: liquidGlassThemeId, tiles: options.length, activeTarget, plateShadow: plateBoxShadow(glass), raisedShadow: raisedBoxShadow(glass),
      flagSize: `${FLAG_WIDTH}x${FLAG_HEIGHT}`,
    }));
  }
  useEffect(() => {
    console.log('[PROFILE-RENDER] study_picker mounted');
  }, []);

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
        const active = code === shownTarget;
        const learning = startedLanguages.includes(code);
        const flagAsset = languageFlagAssetFor(code);
        return (
          <TouchableOpacity
            key={code}
            activeOpacity={0.85}
            // зачем (координатор 12.10, R1_OPTIMISTIC_UI_REST п.3): занятой во время смены остаётся только тапнутая строка; остальные не блокируются целиком —
            // второй тап отсекает busyRef в select() с журналом select_ignored reason=busy
            disabled={busy && code === pendingTarget}
            onPress={() => onSelect(code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active, busy: busy && code === pendingTarget }}
            accessibilityLabel={STUDY_TARGET_NATIVE_NAME[code]}
            testID={`study-lang-row-${code}`} // зачем (робот съёмки, 12.10): строка языка находится без привязки к языку интерфейса
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 7,
              paddingHorizontal: 6,
              borderRadius: 16,
              // зачем (стиль «Тень», владелец 12.10): кромка выбранной плитки снята — выбранная плашка «приподнята» заливкой и тенью поглубже
              backgroundColor: active ? glass.raisedFillFrom : glass.plateFillFrom,
              boxShadow: active ? raisedBoxShadow(glass) : plateBoxShadow(glass),
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
                backgroundColor: glass.line,
                marginBottom: 6,
              }}
            >
              {flagAsset ? (
                <Image
                  source={flagAsset}
                  style={{ width: FLAG_WIDTH, height: FLAG_HEIGHT }}
                  resizeMode="cover"
                  onLoad={() => console.log(`[PROFILE-RENDER] study_picker flag loaded code=${code}`)}
                  onError={(event) => console.warn(`[PROFILE-RENDER] study_picker flag error code=${code} error=${String(event.nativeEvent?.error ?? 'unknown').slice(0, 120)}`)}
                />
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
                    backgroundColor: glass.accent, // light-accent-ok: значок-галочка onAccent на accent читается по галочке; accentGraphic дал бы тёмное на тёмном
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" size={12} color={glass.ctaInk} />
                </View>
              ) : null}
            </View>
            {/* зачем: раньше здесь было динамическое сжатие шрифта (запрещённый
                паттерн — ужимает короткие варианты на iOS). Длина названия языка
                сильно варьируется по локалям («Español» vs «日本語»); вместо
                сжатия — перенос на 2 строки, tile под ним уже с запасом. */}
            <Text
              style={{
                color: active ? glass.text : glass.secondary,
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
