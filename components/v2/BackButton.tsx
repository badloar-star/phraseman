import React, { memo, useCallback, useMemo } from 'react';
import { backOnSceneTokens } from './back_on_scene';
import { triLang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import PressableHybrid from '../PressableHybrid';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import { noteBackTap } from '../../app/back_tap_probe';
import { nestedBoxShadow } from './ShadowSurface';
import BackGlyph, { CloseGlyph } from './BackGlyph';

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
  /** Знак: стрелка «назад» или ✕ «закрыть» (владелец 22.10, вариант В: круг и место те же, меняется только знак). */
  glyph?: 'back' | 'close';
  /**
   * Верхний цвет сцены под кнопкой (#rrggbb): Главная, «Диалоги», обложка Сезона. Есть — круг и значок по яркости сцены (back_on_scene.ts);
   * нет — прежний buttonFill страницы.
   */
  sceneTop?: string;
}>;

const CLOSE_LABELS = { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' } as const;

function BackButtonBase({ onPress, screen, accessibilityLabel, testID, size = 44, glyph = 'back', sceneTop }: Props) {
  const { lang } = useLang();
  const g = useLv2Glass();
  // зачем (🟡 координатор 22.10, g.backOnScene): на сцене фон другой, чем у страницы, — заливка buttonFill там сливалась; цвет считается от верха сцены, место и размер те же
  const onScene = useMemo(() => (sceneTop ? backOnSceneTokens({ sceneTop, mediaInk: g.mediaInk, text: g.text }) : null), [sceneTop, g.mediaInk, g.text]);
  const fill = onScene?.fill ?? g.buttonFill;
  const ink = onScene?.ink ?? g.text;
  const handlePress = useCallback(() => {
    noteBackTap(screen, 'BackButton');
    onPress();
  }, [onPress, screen]);
  return (
    <PressableHybrid
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? triLang(lang, glyph === 'close' ? CLOSE_LABELS : BACK_LABELS)}
      onPress={handlePress}
      variant="icon"
      hitSlop={6}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentStyle={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: size / 2,
        backgroundColor: fill,
        boxShadow: nestedBoxShadow(g),
      }}
    >
      {glyph === 'close' ? <CloseGlyph size={22} color={ink} /> : <BackGlyph size={22} color={ink} />}
    </PressableHybrid>
  );
}

const BackButton = memo(BackButtonBase);
export default BackButton;
