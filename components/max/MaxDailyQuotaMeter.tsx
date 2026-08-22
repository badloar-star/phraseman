import React, { memo, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { dailyQuotaRemainingAt, dailyQuotaView } from '../../app/max_call_daily_quota';
import { triLang, type Lang } from '../../constants/i18n';
import { useTheme } from '../ThemeContext';

type Props = {
  startRemainingSec: number;
  maxSec: number;
  runningSinceMs: number | null;
  variant: 'hero' | 'compact';
  lang: Lang;
};

function MaxDailyQuotaMeter({ startRemainingSec, maxSec, runningSinceMs, variant, lang }: Props) {
  const { theme: t, f } = useTheme();
  const [remainingSec, setRemainingSec] = useState(startRemainingSec);

  useEffect(() => {
    const tick = () => setRemainingSec(
      runningSinceMs === null
        ? startRemainingSec
        : dailyQuotaRemainingAt(startRemainingSec, runningSinceMs, Date.now()),
    );
    tick();
    if (runningSinceMs === null) return undefined;
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [runningSinceMs, startRemainingSec]);

  const model = dailyQuotaView(remainingSec, maxSec);
  const totalMinutes = Math.floor(Math.max(0, maxSec) / 60);
  const color = model.tone === 'red' ? t.wrong : model.tone === 'amber' ? t.gold : t.accent;
  const minutesValue = triLang(lang, {
    ru: `${model.minutes} мин`, uk: `${model.minutes} хв`, es: `${model.minutes} min`,
    'pt-BR': `${model.minutes} min`, vi: `${model.minutes} phút`, id: `${model.minutes} mnt`,
    tr: `${model.minutes} dk`, pl: `${model.minutes} min`,
  });
  const label = triLang(lang, {
    ru: `Осталось ${model.minutes} минут MAX сегодня из ${totalMinutes}`,
    uk: `Залишилося ${model.minutes} хвилин MAX сьогодні з ${totalMinutes}`,
    es: `Quedan ${model.minutes} minutos de MAX hoy de ${totalMinutes}`,
    'pt-BR': `Restam ${model.minutes} minutos de MAX hoje de ${totalMinutes}`,
    vi: `Hôm nay còn ${model.minutes} phút MAX trên ${totalMinutes}`,
    id: `Sisa ${model.minutes} menit MAX hari ini dari ${totalMinutes}`,
    tr: `Bugün ${totalMinutes} dakikadan ${model.minutes} MAX dakikası kaldı`,
    pl: `Zostało dziś ${model.minutes} z ${totalMinutes} minut MAX`,
  });

  return (
    <View testID={`max-daily-quota-${variant}`} accessible accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Text
          style={{ color: t.textMuted, fontSize: variant === 'hero' ? f.sub : f.label, fontWeight: '800' }}
          maxFontSizeMultiplier={2}
        >
          {triLang(lang, {
            ru: 'Дневной запас MAX', uk: 'Денний запас MAX', es: 'Minutos MAX de hoy',
            'pt-BR': 'Minutos MAX de hoje', vi: 'Số phút MAX hôm nay', id: 'Menit MAX hari ini',
            tr: 'Bugünkü MAX süresi', pl: 'Dzisiejsze minuty MAX',
          })}
        </Text>
        <Text
          style={{ color: t.textPrimary, fontSize: variant === 'hero' ? f.numMd + 2 : f.sub, fontWeight: '900', fontVariant: ['tabular-nums'] }}
          maxFontSizeMultiplier={2}
        >
          {minutesValue}
        </Text>
      </View>
      <View style={{ height: variant === 'hero' ? 10 : 6, borderRadius: 99, overflow: 'hidden', backgroundColor: t.bgSurface2, marginTop: variant === 'hero' ? 10 : 7 }}>
        <View style={{ width: `${model.fraction * 100}%`, height: '100%', borderRadius: 99, backgroundColor: color }} />
      </View>
    </View>
  );
}

export default memo(MaxDailyQuotaMeter);
