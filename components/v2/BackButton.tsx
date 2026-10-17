import React, { memo, useCallback } from 'react';
import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import PressableHybrid from '../PressableHybrid';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import { noteBackTap } from '../../app/back_tap_probe';
import { nestedBoxShadow } from './ShadowSurface';
import BackGlyph from './BackGlyph';

/**
 * Кнопка «назад» приложения — одна на экраны, где нужна круглая плашка.
 *
 * зачем (слово владельца 17.10 через координатора: «один общий компонент кнопки назад: зона нажатия 44, нажатие отзывается сразу, по всем темам не сливается с фоном»;
 * Темы 17.10: круг на opaqueControl сливался со страницей — 1,00 на светлых и 1,25 на тёмных при пороге 1,5): круг — заливка buttonFill (≥ 1,71 ко всем фонам во всех 23 темах × свет/тьма,
 * значок text на ней ≥ 5,73) с малой тенью «Тень», без обводки; значок — общий BackGlyph (контур макета kit.js). Зона нажатия 44 (+6 по краям), вжатие и вибрация PressableHybrid
 * срабатывают на нажатие, ДО навигации; каждый тап пишет строку [BACK-BTN] (экран, время) — видно, не съеден ли тап и сколько прошло до смены экрана.
 */
const BACK_LABELS = { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' } as const;

type Props = Readonly<{
  onPress: () => void;
  /** Короткий ключ экрана для журнала [BACK-BTN] (например `today_tasks`). */
  screen: string;
  accessibilityLabel?: string;
  testID?: string;
  size?: number;
}>;

function BackButtonBase({ onPress, screen, accessibilityLabel, testID, size = 44 }: Props) {
  const { lang } = useLang();
  const g = useLv2Glass();
  const handlePress = useCallback(() => {
    noteBackTap(screen, 'BackButton');
    onPress();
  }, [onPress, screen]);
  return (
    <PressableHybrid
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? triLang(lang, BACK_LABELS)}
      onPress={handlePress}
      variant="icon"
      hitSlop={6}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentStyle={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: size / 2,
        backgroundColor: g.buttonFill,
        boxShadow: nestedBoxShadow(g),
      }}
    >
      <BackGlyph size={22} color={g.text} />
    </PressableHybrid>
  );
}

const BackButton = memo(BackButtonBase);
export default BackButton;
