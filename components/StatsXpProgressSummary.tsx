import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { triLang, type Lang } from '../constants/i18n';

type Props = {
  theme: any;
  fonts: any;
  lang: Lang;
  totalXP: number;
  weekXP: number;
  level: number;
  levelStartXP: number;
  nextLevelXP: number;
  accent: string;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function ProgressBar({ value, accent, background }: { value: number; accent: string; background: string }) {
  return (
    <View style={{ height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: background }}>
      <View style={{ width: `${Math.round(clamp(value) * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: accent }} />
    </View>
  );
}

export default function StatsXpProgressSummary({
  theme: t,
  fonts: f,
  lang,
  totalXP,
  weekXP,
  level,
  levelStartXP,
  nextLevelXP,
  accent,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const safeTotal = Math.max(0, Math.floor(totalXP));
  const safeWeek = Math.max(0, Math.floor(weekXP));
  const needed = Math.max(1, nextLevelXP - levelStartXP);
  const inLevel = Math.max(0, safeTotal - levelStartXP);
  const remaining = Math.max(0, nextLevelXP - safeTotal);
  const neutral = t.bgSurface2;
  const weekReference = Math.max(safeWeek, Math.ceil(safeWeek / 100) * 100, 100);

  return (
    <Pressable
      testID="stats-xp-progress-expand"
      accessibilityRole="button"
      accessibilityLabel={triLang(lang, { ru: 'Показать детали опыта', uk: 'Показати деталі досвіду', es: 'Mostrar detalles de XP', 'pt-BR': 'Mostrar detalhes de XP', vi: 'Hiện chi tiết XP', id: 'Tampilkan detail XP', tr: 'XP ayrıntılarını göster', pl: 'Pokaż szczegóły XP' })}
      accessibilityState={{ expanded }}
      onPress={() => setExpanded((value) => !value)}
      style={{ minHeight: 44, borderRadius: 16, padding: 14, gap: 10, backgroundColor: t.bgSurface2 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
            {triLang(lang, { ru: `УРОВЕНЬ ${level} · ОПЫТ`, uk: `РІВЕНЬ ${level} · ДОСВІД`, es: `NIVEL ${level} · XP`, 'pt-BR': `NÍVEL ${level} · XP`, vi: `CẤP ${level} · XP`, id: `LEVEL ${level} · XP`, tr: `SEVİYE ${level} · XP`, pl: `POZIOM ${level} · XP` })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', marginTop: 2 }}>
            {safeTotal.toLocaleString('ru-RU')} XP
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={accent} />
      </View>

      <Text style={{ color: t.textSecond, fontSize: f.sub, fontWeight: '700' }}>
        {triLang(lang, { ru: `+${safeWeek} XP за неделю · ${remaining} XP до уровня ${level + 1}`, uk: `+${safeWeek} XP за тиждень · ${remaining} XP до рівня ${level + 1}`, es: `+${safeWeek} XP esta semana · ${remaining} XP hasta el nivel ${level + 1}`, 'pt-BR': `+${safeWeek} XP na semana · ${remaining} XP até o nível ${level + 1}`, vi: `+${safeWeek} XP tuần này · còn ${remaining} XP đến cấp ${level + 1}`, id: `+${safeWeek} XP minggu ini · ${remaining} XP ke level ${level + 1}`, tr: `Bu hafta +${safeWeek} XP · ${level + 1}. seviye için ${remaining} XP`, pl: `+${safeWeek} XP w tym tygodniu · ${remaining} XP do poziomu ${level + 1}` })}
      </Text>
      <ProgressBar value={inLevel / needed} accent={accent} background={neutral} />

      {expanded ? (
        <View testID="stats-xp-progress-details" style={{ gap: 11, paddingTop: 2 }}>
          <View style={{ gap: 5 }}>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>{triLang(lang, { ru: 'Текущий уровень', uk: 'Поточний рівень', es: 'Nivel actual', 'pt-BR': 'Nível atual', vi: 'Cấp hiện tại', id: 'Level saat ini', tr: 'Mevcut seviye', pl: 'Bieżący poziom' })}</Text>
            <ProgressBar value={inLevel / needed} accent={accent} background={neutral} />
          </View>
          <View style={{ gap: 5 }}>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>{triLang(lang, { ru: 'Опыт за неделю', uk: 'Досвід за тиждень', es: 'XP semanal', 'pt-BR': 'XP da semana', vi: 'XP trong tuần', id: 'XP mingguan', tr: 'Haftalık XP', pl: 'XP w tygodniu' })}</Text>
            <ProgressBar value={safeWeek / weekReference} accent={accent} background={neutral} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>{triLang(lang, { ru: 'Всего накоплено', uk: 'Усього накопичено', es: 'Total acumulado', 'pt-BR': 'Total acumulado', vi: 'Tổng đã tích lũy', id: 'Total terkumpul', tr: 'Toplam biriken', pl: 'Łącznie zebrano' })}</Text>
            <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '900' }}>{safeTotal.toLocaleString('ru-RU')} XP</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}
