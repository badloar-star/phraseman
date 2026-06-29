// ════════════════════════════════════════════════════════════════════════════
// paywall_urgency.ts — urgency система для пейвола
//
// Логика:
//  1. При первом открытии пейвола → activateUrgencyIfNeeded() пишет timestamp
//  2. getUrgencyState() → читает timestamp, считает оставшееся время
//  3. После 77ч → isActive: false (новый цикл при следующем открытии)
//  4. getDoubledPrice() — только для display, никогда не передаётся в стор
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';

export const URGENCY_SHOWN_AT_KEY = 'paywall_urgency_shown_at_v1';
const URGENCY_EXPIRED_AT_KEY = 'paywall_urgency_expired_at_v1';
const URGENCY_DURATION_MS = 77 * 60 * 60 * 1000; // 77 часов — окно «старой цены»
const URGENCY_GRACE_MS = 14 * 24 * 60 * 60 * 1000; // 14 дней после истечения — показываем "цена сохранена ещё ~2 недели"

export interface UrgencyState {
  isActive: boolean;
  remainingMs: number;
  remainingFormatted: string;
}

/** Записывает timestamp первого открытия (идемпотентно — не перезаписывает). */
export async function activateUrgencyIfNeeded(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(URGENCY_SHOWN_AT_KEY);
    if (existing !== null) return; // уже активирован
    await AsyncStorage.setItem(URGENCY_SHOWN_AT_KEY, String(Date.now()));
  } catch (error) {
    DebugLogger.error('paywall_urgency:activate', error, 'warning');
  }
}

/** Возвращает состояние urgency. Если истёк — сбрасывает для нового цикла. */
export async function getUrgencyState(): Promise<UrgencyState> {
  try {
    const raw = await AsyncStorage.getItem(URGENCY_SHOWN_AT_KEY);
    if (raw === null) {
      return { isActive: false, remainingMs: 0, remainingFormatted: '00:00:00' };
    }

    const shownAt = parseInt(raw, 10);
    if (isNaN(shownAt)) {
      return { isActive: false, remainingMs: 0, remainingFormatted: '00:00:00' };
    }

    const elapsed = Date.now() - shownAt;
    const remaining = URGENCY_DURATION_MS - elapsed;

    if (remaining <= 0) {
      // Истёк — запоминаем когда истёк (для grace-периода "зафиксировали цену")
      const alreadyExpired = await AsyncStorage.getItem(URGENCY_EXPIRED_AT_KEY);
      if (alreadyExpired === null) {
        await AsyncStorage.setItem(URGENCY_EXPIRED_AT_KEY, String(Date.now()));
      }
      await AsyncStorage.removeItem(URGENCY_SHOWN_AT_KEY);

      const expiredAt = parseInt(alreadyExpired ?? String(Date.now()), 10);
      const graceRemaining = URGENCY_GRACE_MS - (Date.now() - expiredAt);
      if (graceRemaining > 0) {
        // В grace-периоде: isActive=false, remainingMs>0 → показываем "зафиксировали цену"
        return { isActive: false, remainingMs: graceRemaining, remainingFormatted: '00:00:00' };
      }
      // Grace тоже истёк — полный сброс
      await AsyncStorage.removeItem(URGENCY_EXPIRED_AT_KEY);
      return { isActive: false, remainingMs: 0, remainingFormatted: '00:00:00' };
    }

    return {
      isActive: true,
      remainingMs: remaining,
      remainingFormatted: formatCountdown(remaining),
    };
  } catch (error) {
    DebugLogger.error('paywall_urgency:getState', error, 'warning');
    return { isActive: false, remainingMs: 0, remainingFormatted: '00:00:00' };
  }
}

/** Форматирует миллисекунды в "HH:MM:SS". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Вычисляет удвоенную цену из строки стора — ТОЛЬКО для отображения urgency.
 * НИКОГДА не передавать в RevenueCat или Purchases API.
 *
 * Поддерживает форматы: "$4.99", "₽299", "€9,99", "R$19,90", "Rp 79.000"
 * Возвращает null если не удалось распарсить.
 */
export function getDoubledPrice(originalPrice: string): string | null {
  if (!originalPrice || typeof originalPrice !== 'string') return null;

  const trimmed = originalPrice.trim();
  if (!trimmed) return null;

  // Извлекаем числовое значение: заменяем запятую-разделитель на точку
  // Убираем пробелы между цифрами (Rp 79.000 → 79000)
  const numericMatch = trimmed.replace(/\s/g, '').match(/[\d.,]+/);
  if (!numericMatch) return null;

  const numericStr = numericMatch[0];

  // Определяем формат числа:
  // Если последний разделитель — запятая с 2 знаками ("9,99") → десятичная
  // Если последний разделитель — точка с 2 знаками ("9.99") → десятичная
  // Если точка/запятая с 3 знаками ("79.000") → тысячный разделитель
  let value: number;

  const lastComma = numericStr.lastIndexOf(',');
  const lastDot = numericStr.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Запятая правее точки: "1.234,56" → десятичная запятая
    const normalized = numericStr.replace(/\./g, '').replace(',', '.');
    value = parseFloat(normalized);
  } else if (lastDot > lastComma) {
    // Точка правее запятой: "1,234.56" или "9.99"
    const afterDot = numericStr.substring(lastDot + 1);
    if (afterDot.length === 3) {
      // "79.000" — тысячный разделитель
      value = parseFloat(numericStr.replace(/[.,]/g, ''));
    } else {
      // "9.99" — десятичная точка
      const normalized = numericStr.replace(/,/g, '');
      value = parseFloat(normalized);
    }
  } else {
    // Нет разделителей
    value = parseFloat(numericStr);
  }

  if (!isFinite(value) || value <= 0) return null;

  const doubled = value * 2;

  // Восстанавливаем строку в исходном формате
  const prefix = trimmed.match(/^[^0-9]+/)?.[0] ?? '';
  const suffix = trimmed.match(/[^0-9]+$/)?.[0] ?? '';

  // Форматируем с тем же количеством десятичных знаков
  const decimalPlaces = getDecimalPlaces(numericStr);
  const doubledStr = formatNumber(doubled, decimalPlaces, numericStr);

  return `${prefix}${doubledStr}${suffix}`;
}

function getDecimalPlaces(numericStr: string): number {
  const lastComma = numericStr.lastIndexOf(',');
  const lastDot = numericStr.lastIndexOf('.');

  if (lastComma > lastDot) {
    return numericStr.length - lastComma - 1;
  }
  if (lastDot > lastComma) {
    const afterDot = numericStr.substring(lastDot + 1);
    if (afterDot.length === 3) return 0; // тысячный разделитель
    return afterDot.length;
  }
  return 0;
}

function formatNumber(value: number, decimalPlaces: number, originalNumeric: string): string {
  if (decimalPlaces === 0) {
    return String(Math.round(value));
  }

  // Используем исходный разделитель
  const lastComma = originalNumeric.lastIndexOf(',');
  const lastDot = originalNumeric.lastIndexOf('.');
  const useCommaDecimal = lastComma > lastDot;

  const fixed = value.toFixed(decimalPlaces);
  if (useCommaDecimal) {
    return fixed.replace('.', ',');
  }
  return fixed;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
