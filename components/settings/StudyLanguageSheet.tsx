// ═══════════════════════════════════════════════════════════════════════════
// StudyLanguageSheet — шторка «Язык изучения» (макет profile.html PRF-23
// «выбор языка изучения · шторка», функция studyPicker()).
//
// зачем (баг владельца 11.10, TG-A30B81C181C4): пилюля языка в шапке вкладки
// «Видео» вела на /settings_language — экран языка ИНТЕРФЕЙСА. Канал Видео
// задаётся языком ОБУЧЕНИЯ, поэтому пилюля обязана открывать выбор изучаемого
// языка. Логика выбора — общий хук useStudyLanguageSelection (тот же путь, что
// в StudyLanguagePicker: applyStudyLanguageSelection → STUDY_TARGET_CHANGED).
//
// Вид (kit.css .sheet + extension.css .list/.list-row): каркас — FriendsAddSheetShell
// с шапкой `.flex` макета (по центру, зазор 10, подзаголовок +7), строки —
// SettingsGlassRow (`.card.list-row` 64/r14/10·14), флаг 58×40 r10, значок кита
// check s20 (kit.js), выбранный язык первым.
//
// D188 (владелец 14.10): все пять языков видны и открыты при любом интерфейсе — без замка, без серого
// флага; у неначатого языка подписи нет вовсе (координатор: минимум элементов). Английский — обычная строка
// наравне с остальными при ЛЮБОМ языке интерфейса («это языки изучения, а не интерфейса»). Тап по любому
// языку сразу переключает обучение (общий хук, switchNewLanguagesDirectly) — без экрана приветствия.
// ═══════════════════════════════════════════════════════════════════════════

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import FriendsAddSheetShell from '../friends/FriendsAddSheetShell';
import { SettingsGlassRow } from './SettingsGlassRows';
import { STUDY_TARGET_NATIVE_NAME, languageFlagAssetFor, useStudyLanguageSelection } from './StudyLanguagePicker';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';
import type { StudyTarget } from '../../app/study_target';
import { orderStudyLanguageSheetOptions } from './study_language_sheet_order';
import { hapticTap } from '../../hooks/use-haptics';

export { orderStudyLanguageSheetOptions };

interface StudyLanguageSheetProps {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  activeTarget: StudyTarget;
  /** Префикс логов вызывающего экрана, например `[VIDEO-LANG-PILL]`. */
  logTag?: string;
  /**
   * зачем (владелец 15.10): пилюля раздела выбирает язык ТОЛЬКО для раздела — глобальный язык изучения меняется лишь в Настройках.
   * Задан — выбор уходит сюда, глобальное переключение и переходы не вызываются.
   */
  onSelectLocal?: (code: StudyTarget) => void;
}

export default function StudyLanguageSheet({ visible, onClose, lang, activeTarget, logTag = '[STUDY-LANG-SHEET]', onSelectLocal }: StudyLanguageSheetProps) {
  const copy = useMemo(() => ({
    title: triLang(lang, { ru: 'Язык изучения', uk: 'Мова навчання', en: 'Learning language', es: 'Idioma de estudio', 'pt-BR': 'Idioma de estudo', vi: 'Ngôn ngữ học', id: 'Bahasa belajar', tr: 'Öğrenilen dil', pl: 'Język nauki' }),
    subtitle: triLang(lang, { ru: 'Прогресс каждого языка хранится отдельно', uk: 'Прогрес кожної мови зберігається окремо', en: 'Each language keeps its own progress', es: 'Cada idioma guarda su propio progreso', 'pt-BR': 'Cada idioma guarda seu próprio progresso', vi: 'Mỗi ngôn ngữ có tiến độ riêng', id: 'Setiap bahasa punya progresnya sendiri', tr: 'Her dilin ilerlemesi ayrı tutulur', pl: 'Każdy język ma osobny postęp' }),
    close: triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' }),
  }), [lang]);

  return (
    <FriendsAddSheetShell visible={visible} onClose={onClose} title={copy.title} subtitle={copy.subtitle} closeLabel={copy.close} testID="study-language-sheet" headerLayout="kit">
      {({ requestDismiss }) => (
        <StudyLanguageSheetList lang={lang} activeTarget={activeTarget} logTag={logTag} onCloseNow={onClose} requestDismiss={requestDismiss} onSelectLocal={onSelectLocal} />
      )}
    </FriendsAddSheetShell>
  );
}

/** kit.js `check` (s20): контур 1.8, скруглённые концы. */
function KitCheckIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

function StudyLanguageSheetList({ lang, activeTarget, logTag, onCloseNow, requestDismiss, onSelectLocal }: {
  onSelectLocal?: (code: StudyTarget) => void;
  lang: Lang;
  activeTarget: StudyTarget;
  logTag: string;
  onCloseNow: () => void;
  requestDismiss: () => void;
}) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  // зачем (Optimistic UI): галочка переезжает на выбранный язык в кадре тапа, не дожидаясь записи и контекста.
  const [shownTarget, setShownTarget] = useState<StudyTarget>(activeTarget);
  // зачем (ревью R3): после выбора шторка уезжает 440 мс — второй тап в это время не должен запустить второй выбор.
  const dismissingRef = useRef(false);
  const sub = useMemo(() => ({
    selected: triLang(lang, { ru: 'Учу · выбран', uk: 'Вчу · обрано', en: 'Learning · selected', es: 'Aprendiendo · elegido', 'pt-BR': 'Aprendendo · escolhido', vi: 'Đang học · đã chọn', id: 'Dipelajari · dipilih', tr: 'Öğreniyorum · seçili', pl: 'Uczę się · wybrany' }),
    learning: triLang(lang, { ru: 'Учу', uk: 'Вчу', en: 'Learning', es: 'Aprendiendo', 'pt-BR': 'Aprendendo', vi: 'Đang học', id: 'Dipelajari', tr: 'Öğreniyorum', pl: 'Uczę się' }),
  }), [lang]);

  const closeAnimated = useCallback((reason: string) => {
    dismissingRef.current = true;
    if (__DEV__) console.log(`${logTag} sheet_dismiss reason=${reason}`);
    requestDismiss();
  }, [logTag, requestDismiss]);
  const onSwitchStart = useCallback((code: StudyTarget) => {
    if (__DEV__) console.log(`${logTag} sheet_optimistic shown=${code}`);
    setShownTarget(code);
    closeAnimated('switched');
  }, [closeAnimated, logTag]);
  const onBeforeNavigate = useCallback(() => {
    // зачем: нативный Modal закрываем до перехода, иначе на iOS он может удержать касания (safe_modal_navigation).
    if (__DEV__) console.log(`${logTag} sheet_close_before_navigate`);
    dismissingRef.current = true;
    onCloseNow();
  }, [logTag, onCloseNow]);

  const { options, startedLanguages, startedLanguagesResolved, select } = useStudyLanguageSelection({
    lang, activeTarget, logTag, onSwitchStart, onBeforeNavigate, switchNewLanguagesDirectly: true,
  });
  const ordered = useMemo(() => orderStudyLanguageSheetOptions(options, activeTarget), [options, activeTarget]);
  const orderedKey = ordered.join(',');
  const startedKey = startedLanguages.join(',');
  useEffect(() => {
    // зачем (D188, координатор): по одной строке видно, какой интерфейс и какой итоговый список увидел человек.
    console.log(`[LEARN-LANG] sheet ui=${lang} list=${orderedKey} count=${orderedKey.split(',').length} active=${activeTarget} started=${startedKey} resolved=${startedLanguagesResolved} from=${logTag}`);
  }, [lang, orderedKey, activeTarget, startedKey, startedLanguagesResolved, logTag]);

  const onRowPress = useCallback((code: StudyTarget, learning: boolean) => {
    if (dismissingRef.current) {
      if (__DEV__) console.log(`${logTag} select_ignored reason=sheet_dismissing code=${code}`);
      return;
    }
    if (code === shownTarget) {
      // зачем (ревью R6): тап по уже выбранному языку — закрыть шторку, а не молча ничего не делать.
      hapticTap();
      closeAnimated('already_selected');
      return;
    }
    // зачем (владелец 15.10): локальный выбор раздела — галочка и закрытие в кадре тапа, глобальный язык не трогаем.
    if (onSelectLocal) {
      hapticTap();
      setShownTarget(code);
      onSelectLocal(code);
      closeAnimated('local_select');
      console.log(`[LEARN-LANG] select_local ui=${lang} lang=${code} from=${logTag}`); // guard-ok: локальный выбор
      return;
    }
    // зачем (D188): любой язык открыт — общий select сразу переключает обучение (галочка и закрытие в кадре тапа).
    const route = select(code);
    console.log(`[LEARN-LANG] select ui=${lang} lang=${code} started=${learning} resolved=${startedLanguagesResolved} route=${route} from=${logTag}`);
  }, [closeAnimated, lang, logTag, onSelectLocal, select, shownTarget, startedLanguagesResolved]);

  return (
    <View style={styles.list}>
      {ordered.map((code) => {
        const active = code === shownTarget;
        const learning = startedLanguages.includes(code) || code === activeTarget;
        const flag = languageFlagAssetFor(code);
        return (
          <SettingsGlassRow
            key={code}
            glass={glass}
            testID={`study-language-option-${code}`}
            haptic={false}
            leading={flag ? (
              <View style={styles.flagWrap}>
                <Image source={flag} accessible={false} style={styles.flag} contentFit="cover" />
              </View>
            ) : undefined}
            title={STUDY_TARGET_NATIVE_NAME[code]}
            sub={active ? sub.selected : learning ? sub.learning : undefined}
            onPress={() => onRowPress(code, learning)}
            right={active ? <KitCheckIcon color={glass.text} /> : <View style={styles.rightSpacer} />}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // extension.css `.list`: колонка, зазор 10; `margin-top:20px` у списка в макете даёт content.paddingTop шторки.
  list: { gap: 10 },
  // макет PRF-23: флаг 58×40, радиус 10.
  flagWrap: { width: 58, height: 40, borderRadius: 10, overflow: 'hidden' },
  flag: { width: 58, height: 40, borderRadius: 10 },
  rightSpacer: { width: 20 },
});
