/**
 * SpeakingQuotaDots — остаток дневных голосовых попыток точками, без слов.
 *
 * зачем (владелец, 2026-09-13): «ТРИ ТОЧКИ НА МИКРОФОНЕ ВООБЩЕ ВО ВСЕХ МЕСТАХ
 * ГДЕ ЕСТЬ МИКРОФОН — УРОКИ, КАРТОЧКИ, ДИАЛОГИ». До этого остаток не был виден
 * нигде: человек узнавал о дневном лимите, только упёршись в него, и отказ
 * выглядел как поломка, а не как понятное правило.
 *
 * Почему точки, а не «2 из 3»: цифра требует чтения и занимает переменную
 * ширину (в диалоге микрофон — круг 44px, там текста просто нет места). Точки
 * читаются периферийным зрением за долю секунды и одинаково работают во всех
 * девяти локалях без перевода.
 *
 * ГЕОМЕТРИЯ ПОСТОЯННА — прямое требование владельца «без сдвинутых текстов
 * кнопок, всё ровно». Компонент ВСЕГДА занимает одну и ту же высоту: когда
 * точек быть не должно (Plus, неизвестный статус), он рисует прозрачную
 * распорку того же размера. Поэтому появление/исчезновение остатка не двигает
 * ни иконку, ни подпись, ни соседей в транспортном ряду, а первый кадр экрана
 * сразу равен финальному (перф-контракт layout_stability).
 *
 * Данных сам не запрашивает: `quota` приходит от уже смонтированного
 * `useSpeakingAttemptGate` хоста — ни одного лишнего чтения и ре-рендера.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { RevenueDailyQuotaResult } from '../app/revenue_daily_quota';

/**
 * Минимум, который нужен точкам от любой дневной квоты.
 *
 * зачем (владелец 2026-09-14: точки на карточках и Арене): у карточной квоты
 * (`revenue_quota_access.ts`) нет поля `extra` — дневного пропуска там не
 * существует. Вместо копии компонента расширяем вход: `extra` необязателен и
 * по умолчанию 0. Ряд точек в приложении обязан быть ОДИН — три похожих
 * индикатора с разной геометрией выглядели бы как три разных правила.
 */
export type QuotaDotsSource = Readonly<{
  status: RevenueDailyQuotaResult['status'];
  used: number;
  limit: number | null;
  extra?: number;
}>;

/** Размер точки и зазор для каждой поверхности. */
export type SpeakingQuotaDotsSize = 'sm' | 'md';

const SIZES: Record<SpeakingQuotaDotsSize, { dot: number; gap: number; height: number }> = {
  // Диалог: точки живут ВНУТРИ круглой кнопки 44px под иконкой — самые мелкие.
  sm: { dot: 4, gap: 3, height: 4 },
  // Урок и карточки: точки под иконкой/кругом в общем потоке.
  md: { dot: 5, gap: 4, height: 5 },
};

export type SpeakingQuotaDotsProps = {
  quota: QuotaDotsSource;
  /** Цвет израсходованных попыток (тусклый тон, не обводка). */
  spentColor: string;
  /** Цвет оставшихся попыток. */
  remainingColor: string;
  size?: SpeakingQuotaDotsSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Сколько точек рисовать и сколько из них «горят».
 *
 * Вынесено отдельно и экспортируется: то же правило проверяет контрактный тест,
 * и при изменении политики лимитов не придётся повторять арифметику в трёх
 * местах. `extra` — купленный дневной пропуск, он расширяет ряд, а не заменяет
 * его: человек должен видеть, что попыток стало больше именно сегодня.
 */
export function speakingQuotaDotsModel(quota: QuotaDotsSource): { total: number; remaining: number } | null {
  // Plus/VIP/«Фри»-флаг: лимита нет — показывать нечего, ряд точек был бы ложью.
  if (quota.limit === null) return null;
  // Квота ещё не прочитана или недоступна (нет PhoneState): честнее ничего не
  // показать, чем нарисовать неверный остаток. Место при этом резервируется.
  if (quota.status === 'waiting' || quota.status === 'unavailable' || quota.status === 'stale_account') return null;
  const total = quota.limit + (quota.extra ?? 0);
  if (!Number.isFinite(total) || total <= 0) return null;
  const remaining = Math.max(0, Math.min(total, total - quota.used));
  return { total, remaining };
}

function SpeakingQuotaDotsImpl({
  quota,
  spentColor,
  remainingColor,
  size = 'md',
  style,
  testID = 'speaking-quota-dots',
}: SpeakingQuotaDotsProps) {
  const metrics = SIZES[size];
  const model = useMemo(() => speakingQuotaDotsModel(quota), [quota]);

  // Распорка той же высоты вместо «ничего»: геометрия хоста не меняется никогда.
  if (model === null) {
    return <View testID={`${testID}-spacer`} pointerEvents="none" style={[{ height: metrics.height }, style]} />;
  }

  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, { gap: metrics.gap, height: metrics.height }, style]}
    >
      {Array.from({ length: model.total }, (_, index) => (
        <View
          // Вставок, удалений и сортировки нет: ряд целиком пересобирается при
          // смене квоты, у точек нет ни состояния, ни анимации.
          key={index} // guard-ok: индекс здесь и есть сущность точки — позиция в ряду
          style={{
            width: metrics.dot,
            height: metrics.dot,
            borderRadius: metrics.dot / 2,
            backgroundColor: index < model.remaining ? remainingColor : spentColor,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

/**
 * memo: хосты — кнопки внутри часто перерисовывающихся экранов (сессия урока,
 * чат диалога). Точки зависят только от квоты и цветов, поэтому пересчитывать
 * их на каждый кадр ввода не нужно.
 */
export const SpeakingQuotaDots = React.memo(SpeakingQuotaDotsImpl);

export default SpeakingQuotaDots;
