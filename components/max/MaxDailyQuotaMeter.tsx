import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';

import { dailyQuotaRemainingAt, dailyQuotaView, type MaxDailyQuotaTone } from '../../app/max_call_daily_quota';
import { triLang, type Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';

type Props = {
  startRemainingSec: number;
  maxSec: number;
  runningSinceMs: number | null;
  variant: 'hero' | 'compact';
  lang: Lang;
};

/**
 * Один пульс прогресс-бара на смену тона (normal→amber, amber→red), не
 * бесконечный цикл: владелец 2026-08-24 просил «чёткий индикатор», а
 * зацикленная анимация на компактной пилюле в шапке звонка укачивала бы.
 *
 * guard-ok: useNativeDriver:false умышленно — анимируется width полосы
 * (layout-свойство, не transform/opacity), нативный драйвер его не поддерживает.
 */
function useTonePulse(tone: MaxDailyQuotaTone, reduceMotion: boolean): Animated.Value {
  const pulse = useRef(new Animated.Value(1)).current;
  const prevTone = useRef(tone);
  useEffect(() => {
    if (prevTone.current === tone) return;
    prevTone.current = tone;
    if (reduceMotion || tone === 'normal') return;
    pulse.setValue(1);
    const anim = Animated.sequence([
      Animated.timing(pulse, { toValue: 1.35, duration: 160, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 1, duration: 220, useNativeDriver: false }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [pulse, reduceMotion, tone]);
  return pulse;
}

function MaxDailyQuotaMeter({ startRemainingSec, maxSec, runningSinceMs, variant, lang }: Props) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
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
  const barPulse = useTonePulse(model.tone, reduceMotion);
  const minutesValue = triLang(lang, {
    ru: `${model.minutes} мин`, uk: `${model.minutes} хв`, es: `${model.minutes} min`,
    'pt-BR': `${model.minutes} min`, vi: `${model.minutes} phút`, id: `${model.minutes} mnt`,
    tr: `${model.minutes} dk`, pl: `${model.minutes} min`,
  });
  // Один источник заголовка для обоих вариантов: hero ставит его слева от
  // числа, compact — тише под числом.
  const quotaTitle = triLang(lang, {
    ru: 'Дневной запас MAX', uk: 'Денний запас MAX', es: 'Minutos MAX de hoy',
    'pt-BR': 'Minutos MAX de hoje', vi: 'Số phút MAX hôm nay', id: 'Menit MAX hari ini',
    tr: 'Bugünkü MAX süresi', pl: 'Dzisiejsze minuty MAX',
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
      {/* зачем (владелец 2026-08-24, «цифра справа вылазит»): в компактной
          пилюле шапки звонка заголовок и число стояли в ОДИН ряд через
          space-between внутри жёстких 132pt. Русское «Дневной запас MAX»
          переносится на две строки, забирает всю ширину, и число выдавливалось
          за правый край карточки — на скриншоте от «12 мин» видна только «1».
          Компактный вариант теперь колонка: число ведёт (оно и есть ответ на
          вопрос «сколько осталось»), заголовок тише под ним и переносится
          свободно. Лечение именно вёрсткой: кегли остались прежние, сжатие
          шрифта запрещено правилами владельца. Hero-вариант — прежний ряд:
          там ширина карточки полная и переполнения не было. */}
      <View
        style={variant === 'hero'
          ? { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }
          : { flexDirection: 'column', alignItems: 'flex-start' }}
      >
        {variant === 'hero' ? (
          <Text
            style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '800' }}
            maxFontSizeMultiplier={2}
          >
            {quotaTitle}
          </Text>
        ) : null}
        <Text
          style={{ color, fontSize: variant === 'hero' ? f.numMd + 2 : f.sub, fontWeight: '900', fontVariant: ['tabular-nums'] }}
          maxFontSizeMultiplier={2}
        >
          {minutesValue}
        </Text>
        {variant === 'hero' ? null : (
          <Text
            style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', marginTop: 1 }}
            maxFontSizeMultiplier={2}
          >
            {quotaTitle}
          </Text>
        )}
      </View>
      {/* зачем (аудит 2026-08-24): scaleY пульса растягивает бар из его
          собственного центра — если рамка трека держит overflow:'hidden' по
          высоте, ровно совпадающей с баром, прирост среза́лся и пульс был
          не виден. Overflow снят с трека; вертикальный запас (paddingVertical
          на внешнем View) даёт пульсу физическое место, куда расти. */}
      <View style={{ paddingVertical: 3, marginTop: variant === 'hero' ? 7 : 4 }}>
        <View style={{ height: variant === 'hero' ? 10 : 6, borderRadius: 99, backgroundColor: t.bgSurface2 }}>
          <Animated.View
            style={{
              width: `${model.fraction * 100}%`,
              height: '100%',
              borderRadius: 99,
              backgroundColor: color,
              transform: [{ scaleY: barPulse }],
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default memo(MaxDailyQuotaMeter);
