import React, { memo, useMemo } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { FlowText } from '../text-integrity/FlowText';
import type { Theme } from '../../constants/theme';
import {
  FLASHCARD_STATUS_COLOR,
  type FlashcardStatus,
  type FlashcardStatusMap,
} from '../../app/flashcards/cardStatus';

/**
 * Чипы фильтра по статусу изучения (макет flashcards-screens.html B1,
 * блок `.fchips`: «Все · Учу · Повторяю · Освоены»).
 *
 * зачем: в коллекции нельзя было отобрать проблемные карточки — список шёл
 * одной кучей. Ровно те, что проваливаются, и надо тренировать в первую
 * очередь; теперь до них один тап.
 *
 * Чип рисуется ТОЛЬКО если в наборе есть такие карточки: пустой фильтр,
 * который ничего не находит — обман, а не выбор. Из-за этого «Слабые»
 * появляются лишь когда они действительно есть.
 *
 * Обводок нет (§0.D): активный чип держится плотной заливкой цвета статуса,
 * неактивный — тоном подложки. Тап-зона ≥44px по высоте строки (§4.6).
 */

const ORDER: FlashcardStatus[] = ['learning', 'review', 'mastered', 'weak'];

interface StatusFilterChipsProps {
  /** Текущий фильтр: 'all' | `status:<id>` | что-то ещё (тогда все чипы неактивны). */
  activeFilter: string;
  onChange: (filter: string) => void;
  /** id карточек текущего набора — по ним считаем, какие чипы показывать. */
  cardIds: string[];
  statuses: FlashcardStatusMap;
  labels: Record<FlashcardStatus | 'all', string>;
  t: Theme;
}

function StatusFilterChipsBase({
  activeFilter,
  onChange,
  cardIds,
  statuses,
  labels,
  t,
}: StatusFilterChipsProps) {
  // Какие статусы реально присутствуют — пустых фильтров не предлагаем.
  const present = useMemo(() => {
    const set = new Set<FlashcardStatus>();
    for (const id of cardIds) {
      const s = (statuses[id] ?? 'new') as FlashcardStatus;
      set.add(s);
    }
    return ORDER.filter((s) => set.has(s));
  }, [cardIds, statuses]);

  // Меньше двух вариантов — выбирать не из чего, полоса только съедала бы место.
  if (present.length < 2) return null;

  const renderChip = (key: string, label: string, color: string | null) => {
    const active = activeFilter === key;
    return (
      <TouchableOpacity
        key={key}
        onPress={() => onChange(key)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={{
          minHeight: 32,
          justifyContent: 'center',
          paddingHorizontal: 13,
          borderRadius: 999,
          // §0.D — никаких кромок: активность читается плотностью заливки.
          backgroundColor: active ? (color ? `${color}33` : `${t.accent}33`) : t.bgSurface,
        }}
      >
        {/* зачем: text-integrity — чип в горизонтальном скролле, ширина не
            ограничена: длинный лейбл делает чип шире, усечение не нужно. */}
        <FlowText
          testID={`flashcards-status-chip-${key}`}
          provenance="authored"
          style={{
            color: active ? (color ?? t.accent) : t.textSecond,
            fontSize: 12.5,
            fontWeight: '800',
          }}
        >
          {label}
        </FlowText>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      // зачем: горизонтальный ScrollView без flexGrow:0 забирает ВСЮ свободную
      // высоту родителя — чипы растягивались в вертикальные «столбы» на пол-экрана
      // (видно на скриншоте владельца). Прижимаем полосу к высоте содержимого.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{
        gap: 7,
        paddingHorizontal: 16,
        paddingBottom: 10,
        // Чипы по центру полосы, а не растянуты по её высоте.
        alignItems: 'center',
      }}
    >
      {/* guard-ok: чипов максимум 5 (Все + 4 статуса) — список фиксированный
          и короткий, виртуализация здесь дала бы только overhead. */}
      {renderChip('all', labels.all, null)}
      {present.map((s) => renderChip(`status:${s}`, labels[s], FLASHCARD_STATUS_COLOR[s]))}
    </ScrollView>
  );
}

export default memo(StatusFilterChipsBase);
