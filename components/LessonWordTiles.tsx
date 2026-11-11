// Governance-ID: TG-2AFE53C8C4CE
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import DuoPressable from './DuoPressable';
import { FlowText } from './text-integrity/FlowText';
import { plateBoxShadow } from './v2/ShadowSurface';
import type { GlassTokens } from '../constants/liquidGlassThemePalette';

// зачем (аудит микрофризов, владелец 11.11): вспышка плитки и блокировка двойного тапа раньше жили в
// большом блоке урока — каждый тап перерисовывал ~1400 строк разметки трижды (тап, снятие блокировки
// через 90 мс, гашение вспышки через 260 мс). Теперь оба состояния живут здесь, и два «поздних»
// обновления перерисовывают только сами плитки.

const WORD_DISPATCH_LOCK_MS = 90;
const WORD_FLASH_MS = 260;

export interface LessonWordTileItem {
  /** Полная смысловая личность цели нажатия: фраза + шаг + место + слово. */
  optionKey: string;
  /** Стабильный слот раскладки: место плитки в сетке. */
  presentationSlotKey: React.Key;
  word: string;
  index: number;
  isCorrectOption: boolean;
  displayText: string;
}

interface LessonWordTilesProps {
  wordOptionItems: readonly LessonWordTileItem[];
  /** Номера плиток, приглушённых подсказкой «50 на 50»; null — подсказка не активна. */
  dimmedIndexes: ReadonlySet<number> | null;
  glass: GlassTokens;
  fontSize: number;
  tileGap: number;
  tilePaddingVertical: number;
  /** Выбор слова. Вызывается в том же кадре, что и вспышка. */
  onWordPress: (word: string) => void;
}

function LessonWordTiles({
  wordOptionItems,
  dimmedIndexes,
  glass,
  fontSize,
  tileGap,
  tilePaddingVertical,
  onWordPress,
}: LessonWordTilesProps) {
  // Вспышка плитки при тапе слова привязана к конкретной опции и шагу фразы.
  const [flashWord, setFlashWord] = useState<{ optionKey: string; correct: boolean } | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerWordFlash = useCallback((optionKey: string, correct: boolean) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashWord({ optionKey, correct });
    flashTimerRef.current = setTimeout(() => setFlashWord(null), WORD_FLASH_MS);
  }, []);
  useEffect(() => () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); }, []);
  // Ответ применяется сразу; короткий lock нужен только против двойного тапа,
  // чтобы второй нативный press не успел выбрать соседнюю плитку в том же жесте.
  const [wordDispatchPending, setWordDispatchPending] = useState(false);
  const wordDispatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (wordDispatchTimerRef.current) clearTimeout(wordDispatchTimerRef.current); }, []);

  // зачем (координатор 12.10, съёмка R1 energy-modes-002…005/016): робот не знает, какой номер неверный —
  // в dev первый неверный вариант помечен `lesson1-word-option-wrong` (ошибка по шагу). В стор-сборке __DEV__ = false.
  const firstWrongIndex = __DEV__ ? wordOptionItems.find((o) => !o.isCorrectOption)?.index : undefined;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }} pointerEvents="box-none">
      {wordOptionItems.map(({ optionKey, presentationSlotKey, word, index: i, isCorrectOption, displayText }) => {
        // Плитка вспыхивает АКЦЕНТНЫМ цветом темы при нажатии (единый
        // фирменный цвет на любой тап). Объём — через DuoPressable (3D-кромка).
        const isFlashing = flashWord?.optionKey === optionKey;
        return (
          <Animated.View
            key={presentationSlotKey}
            style={{
              width: '48%',
              marginBottom: tileGap,
              // зачем: владелец убрал подсказку-пульсацию правильного слова на первых
              // фразах урока 1 — осталось только приглушение от «50 на 50».
              opacity: dimmedIndexes?.has(i) ? 0.22 : 1,
            }}
          >
            <DuoPressable
              pressTargetKey={optionKey}
              // зачем (координатор 05.11, Maestro-проход урока до итога): помеченные плитки нужны роботу ТОЛЬКО в dev; в релизе плитки
              // без testID — ничего не подсказывает, какой вариант верный (владелец: «в релизе — ничего»)
              testID={__DEV__ ? (isCorrectOption ? 'lesson1-word-option-correct' : (firstWrongIndex === i ? 'lesson1-word-option-wrong' : `lesson1-word-option-${i}`)) : undefined}
              pressedExternally={isFlashing}
              // зачем (аудит микрофризов 11.11): вибрация срабатывает в момент касания, внутри кнопки,
              // а не после обработки слова — раньше она ждала конца тяжёлого onPress и запаздывала.
              withHaptic
              disabled={wordDispatchPending}
              style={{
                width: '100%',
                backgroundColor: isFlashing ? glass.cta : glass.plateFillFrom,
                paddingVertical: tilePaddingVertical,
                minHeight: 52,
                borderRadius: 18,
                boxShadow: plateBoxShadow(glass), // зачем («Тень» 12.10): кнопка-слово — плашка без кромки
              }}
              onPress={() => {
                // Вспышка плитки начинается сразу, но сам ответ тоже обязан
                // примениться в этот же кадр. Прежняя задержка 170 мс ради
                // вспышки делала каждую кнопку ощутимо «тормозной».
                if (wordDispatchTimerRef.current) return;
                setWordDispatchPending(true);
                triggerWordFlash(optionKey, isCorrectOption);
                wordDispatchTimerRef.current = setTimeout(() => {
                  wordDispatchTimerRef.current = null;
                  setWordDispatchPending(false);
                }, WORD_DISPATCH_LOCK_MS);
                onWordPress(word);
                // [FeedbackKit] Решение владельца: плитки слов — БЕЗ клик-звука
                // (звук только на управляющих кнопках). Родная вибрация — на касании (withHaptic выше).
              }}
            >
              {/* зачем: 3 юзера писали, что длинные слова в плитках обрезаны
                  («understands», «documents») и приходится угадывать. Плитка — 48%
                  ширины, при штатном «среднем» шрифте влезает ~10 знаков, а в данных
                  уроков есть слова до 15-16 знаков. Шрифт НЕ ужимаем (правило
                  владельца) — разрешаем вторую строку: фиксированной высоты у плитки
                  нет (DuoPressable: только minHeight), поэтому обрезки не будет. */}
              <FlowText testID="lesson-word-tile" provenance="authored" style={{ color: isFlashing ? glass.ctaInk : glass.text, fontSize, fontWeight: isFlashing ? '700' : '500' }}>{displayText}</FlowText>
            </DuoPressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

export default memo(LessonWordTiles);
