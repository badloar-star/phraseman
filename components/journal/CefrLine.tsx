import React from 'react';
import { View, Text } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme, ThemeMode } from '../../constants/theme';
import type { Fonts } from '../ThemeContext';
import { statsAccent, statsSoftBg } from '../../constants/statsThemeChrome';
import { GOLD_RICH } from '../../constants/goldTheme';
import { phraseProgressStatusForCount, type PhraseProgressStatus } from './progress_status';

export interface CefrLineProps {
  t: Theme;
  f: Fonts;
  lang: Lang;
  themeMode: ThemeMode;
  isGoldTheme: boolean;
  /** Phrases retained through spaced repetition. */
  masteredPhraseCount: number;
  onPress?: () => void;
}

function pluralPhrasesRu(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'фраза';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'фразы';
  return 'фраз';
}

function pluralPhrasesUk(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'фраза';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'фрази';
  return 'фраз';
}

function progressStatusLabel(lang: Lang, status: PhraseProgressStatus): string {
  // зачем: `ReturnType<typeof triLang>` у дженерика без аргументов резолвится в
  // `unknown` — возврат labels[status] переставал быть string. Тип строк выводится
  // из самих литералов, отдельная аннотация не нужна.
  const labels: Record<PhraseProgressStatus, string> = {
    start: triLang(lang, { ru: 'Начало', uk: 'Початок', es: 'Inicio', 'pt-BR': 'Começo', vi: 'Khởi đầu', id: 'Awal', tr: 'Başlangıç', pl: 'Początek' }),
    moving: triLang(lang, { ru: 'В движении', uk: 'У русі', es: 'En marcha', 'pt-BR': 'Em movimento', vi: 'Đang tiến lên', id: 'Terus maju', tr: 'İlerliyorsun', pl: 'W ruchu' }),
    confident: triLang(lang, { ru: 'Уверенно', uk: 'Впевнено', es: 'Con seguridad', 'pt-BR': 'Com confiança', vi: 'Tự tin', id: 'Percaya diri', tr: 'Kendinden emin', pl: 'Pewnie' }),
    strong: triLang(lang, { ru: 'Сильно', uk: 'Сильно', es: 'Sólido', 'pt-BR': 'Forte', vi: 'Vững vàng', id: 'Kuat', tr: 'Güçlü', pl: 'Mocno' }),
    impressive: triLang(lang, { ru: 'Впечатляюще', uk: 'Вражаюче', es: 'Impresionante', 'pt-BR': 'Impressionante', vi: 'Ấn tượng', id: 'Mengesankan', tr: 'Etkileyici', pl: 'Imponująco' }),
    expert: triLang(lang, { ru: 'Экспертно', uk: 'Експертно', es: 'Experto', 'pt-BR': 'Especialista', vi: 'Chuyên nghiệp', id: 'Ahli', tr: 'Uzman', pl: 'Ekspercko' }),
    outstanding: triLang(lang, { ru: 'Выдающийся результат', uk: 'Видатний результат', es: 'Resultado excepcional', 'pt-BR': 'Resultado excepcional', vi: 'Kết quả xuất sắc', id: 'Hasil luar biasa', tr: 'Olağanüstü sonuç', pl: 'Wybitny wynik' }),
  };
  return labels[status];
}

function CefrLine({ t, f, lang, themeMode, isGoldTheme, masteredPhraseCount, onPress }: CefrLineProps) {
  const safeCount = Math.max(0, Math.floor(masteredPhraseCount));
  const status = phraseProgressStatusForCount(safeCount);
  const accent = isGoldTheme ? GOLD_RICH.metalGold : statsAccent(themeMode, 'archiveMap');
  const chipBg = isGoldTheme ? GOLD_RICH.wash : statsSoftBg(themeMode, 'archiveMap');
  const phraseCountLabel = triLang(lang, {
    ru: `${safeCount} закреплённых ${pluralPhrasesRu(safeCount)}`,
    uk: `${safeCount} закріплених ${pluralPhrasesUk(safeCount)}`,
    es: `${safeCount} frases reforzadas`,
    'pt-BR': `${safeCount} frases consolidadas`,
    vi: `${safeCount} cụm từ đã củng cố`,
    id: `${safeCount} frasa yang dikuasai`,
    tr: `${safeCount} pekiştirilmiş ifade`,
    pl: `${safeCount} utrwalonych fraz`,
  });

  return (
    <View accessibilityRole={onPress ? 'button' : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: isGoldTheme ? GOLD_RICH.blackPiano : t.bgSurface }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: chipBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: accent, fontSize: f.caption, fontWeight: '900' }}>{safeCount}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{progressStatusLabel(lang, status)}</Text>
        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600', marginTop: 2 }}>{phraseCountLabel}</Text>
      </View>
    </View>
  );
}

export default React.memo(CefrLine);
