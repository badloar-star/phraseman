/**
 * Разбивка комбинированного урока по темам.
 *
 * зачем (владелец 2026-09-17): ради этого блока человек и шёл в комбо. Просьба
 * пользователя: «в конце на экране завершения руны опыт и плюс должно показать
 * какие темы сколько правильных ответов». Общий балл не отвечает на вопрос
 * «какая тема выпадает при переключении» — отвечает только разбивка.
 *
 * Законы владельца: без обводок контейнера (отделяем тоном), без подписей-
 * расшифровок мелким шрифтом, без adjustsFontSizeToFit (длинное имя режем
 * многоточием). Строки фиксированной высоты — список не прыгает.
 */

import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { triLang, type Lang } from '../constants/i18n';
import { lessonNamesForLang } from '../constants/lessons';
import type { CombinedLessonTopicResult } from '../app/combined_lesson_pool';

export interface CombinedLessonBreakdownProps {
  rows: readonly CombinedLessonTopicResult[];
  lang: Lang;
  theme: {
    bgCard: string;
    bgSurface: string;
    textPrimary: string;
    textSecond: string;
    textMuted: string;
    accent: string;
    wrong: string;
  };
  fonts: { body: number; label: number };
}

/** Доля верных, ниже которой тема считается отстающей и красится тревожно. */
const WEAK_TOPIC_RATIO = 0.75;

export default function CombinedLessonBreakdown({
  rows,
  lang,
  theme: t,
  fonts: f,
}: CombinedLessonBreakdownProps) {
  const names = useMemo(() => lessonNamesForLang(lang), [lang]);

  // Пустая разбивка — не рисуем пустую карточку: лучше ничего, чем рамка с воздухом.
  if (rows.length === 0) return null;

  return (
    <View style={{ width: '100%', borderRadius: 22, padding: 16, backgroundColor: t.bgCard, gap: 4 }}>
      <Text
        maxFontSizeMultiplier={1.3}
        style={{
          color: t.textMuted,
          fontSize: f.label,
          fontWeight: '800',
          letterSpacing: 0.4,
          marginBottom: 6,
        }}
      >
        {triLang(lang, {
          ru: 'ПО ТЕМАМ', en: 'BY TOPIC', uk: 'ЗА ТЕМАМИ', es: 'POR TEMA',
          'pt-BR': 'POR TEMA', vi: 'THEO CHỦ ĐỀ', id: 'PER TOPIK', tr: 'KONULARA GÖRE', pl: 'WEDŁUG TEMATÓW',
        })}
      </Text>

      {rows.map((row) => {
        const ratio = row.total > 0 ? row.correct / row.total : 0;
        const weak = ratio < WEAK_TOPIC_RATIO;
        const name = names[row.lessonId - 1] ?? String(row.lessonId);
        return (
          <View
            key={row.lessonId}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.3}
                style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}
              >
                {name}
              </Text>
              {/* Полоса доли: та же информация, что и счёт, но читается мгновенно. */}
              <View style={{ height: 8, borderRadius: 4, backgroundColor: t.bgSurface, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${Math.round(ratio * 100)}%`,
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: weak ? t.wrong : t.accent,
                  }}
                />
              </View>
            </View>
            <Text
              maxFontSizeMultiplier={1.3}
              style={{
                color: weak ? t.wrong : t.textPrimary,
                fontSize: f.body,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}
            >
              {row.correct}/{row.total}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
