// ═══════════════════════════════════════════════════════════════════════════
// story_disc.tsx — диск с числом в цветах темы: медаль места у истории победителю (кадр 28), «+500 монет» и «14 дней Plus» у истории лесенки.
//
// зачем (вынесено 29.10 из кадра победителю для лесенки; координатор: «по образцу истории победителю»): один и тот же диск 168 с ореолом
// и бликом — две истории выглядят одной семьёй. Число — крупно (место 76/76, сумма 58/62), слово под ним — заглавными по правилам языка
// интерфейса (tr «sıra» → «SIRA», Переводчик 29.10). Всплывает пружиной через 120 мс, ореол проявляется через 300 мс — от часов кадра.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import type { Lang } from '../../../constants/i18n';
import { mixHex } from '../../../constants/v2Style';
import { splitAlpha } from './story_template_layout';
import { Enter } from './story_template_motion';
import { mix, useStoryTemplatePalette } from './story_template_palette';

/** Диск макета (.medal): 168; ореол выходит за диск на 26 со всех сторон (.halo { inset: -26px }) — коробка 220. */
const DISC = 168;
const DISC_R = DISC / 2;
const HALO = 26;
const BOX = DISC + HALO * 2;
/** radial-gradient(circle at 35% 28%) диска: центр (58,8; 47,04), радиус — до дальнего угла (farthest-corner, как в CSS) ≈ 163. */
const GRAD_CX = DISC * 0.35;
const GRAD_CY = DISC * 0.28;
const GRAD_R = Math.hypot(DISC - GRAD_CX, DISC - GRAD_CY);
/** radial-gradient(circle, accGlow 0 %, transparent 70 %) ореола: радиус до угла коробки 110·√2, прозрачно с 70 % (≈ 109 — её край). */
const HALO_R = (BOX / 2) * Math.SQRT2;
/** Блик «inset 0 2px 0»: круг диска минус тот же круг на 2 dp ниже (чётно-нечётная заливка, обрезано диском) — как у круга темы. */
const HIGHLIGHT = [DISC_R, DISC_R + 2].map((y) => `M0,${y} a${DISC_R},${DISC_R} 0 1,0 ${DISC},0 a${DISC_R},${DISC_R} 0 1,0 -${DISC},0 Z`).join(' ');

/** place — одна-две цифры места (76/76); amount — сумма со знаком, «+500» (58/62: четыре знака влезают в диск 168). */
export type StoryDiscSize = 'place' | 'amount';

type StoryDiscProps = Readonly<{
  /** Крупное число на диске: «1», «+500», «14». */
  big: string;
  /** Слово под числом — показывается заглавными по языку интерфейса. */
  word: string;
  /** Подпись для экранного диктора: «1 место», «500 монет». */
  label: string;
  lang: Lang;
  size?: StoryDiscSize;
}>;

export const StoryDisc = memo(function StoryDisc({ big, word, label, lang, size = 'place' }: StoryDiscProps) {
  const pal = useStoryTemplatePalette();
  const glow = splitAlpha(pal.accGlow);
  return (
    <Enter kind="pop" d={120} style={s.root}>
      <Enter kind="fade" d={300} dur={900} style={s.halo}>
        <Svg width={BOX} height={BOX}>
          <Defs>
            <RadialGradient id="tplMedalHalo" cx={BOX / 2} cy={BOX / 2} r={HALO_R} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={glow.solid} stopOpacity={glow.alpha} />
              <Stop offset="0.7" stopColor={glow.solid} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={BOX / 2} cy={BOX / 2} r={BOX / 2} fill="url(#tplMedalHalo)" />
        </Svg>
      </Enter>
      <View style={[s.disc, { boxShadow: `0 20px 50px -20px ${mix(pal.shTint, 0.6)}` }]} accessible accessibilityLabel={label}>
        <Svg width={DISC} height={DISC} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="tplMedalDisc" cx={GRAD_CX} cy={GRAD_CY} fx={GRAD_CX} fy={GRAD_CY} r={GRAD_R} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={pal.accB} />
              <Stop offset="0.58" stopColor={pal.accG} />
              {/* color-mix(in srgb, acc-g 55 %, bg-mid) — край диска уходит в тон фона */}
              <Stop offset="1" stopColor={mixHex(pal.accG, pal.bgMid, 0.45)} />
            </RadialGradient>
            <ClipPath id="tplMedalClip"><Circle cx={DISC_R} cy={DISC_R} r={DISC_R} /></ClipPath>
          </Defs>
          <Circle cx={DISC_R} cy={DISC_R} r={DISC_R} fill="url(#tplMedalDisc)" />
          <G clipPath="url(#tplMedalClip)">
            <Path d={HIGHLIGHT} fill={mix(pal.tx, 0.35)} fillRule="evenodd" />
          </G>
        </Svg>
        <Text style={[size === 'amount' ? s.amount : s.place, { color: pal.accInk }]}>{big}</Text>
        {/* зачем (Переводчик 29.10): заглавные — по правилам языка интерфейса (tr «sıra» → «SIRA»), а не языка телефона, как у textTransform */}
        <Text style={[s.word, { color: pal.accInk }]}>{word.toLocaleUpperCase(lang)}</Text>
      </View>
    </Enter>
  );
});

const s = StyleSheet.create({
  // диск 168 (+4 к отступу арта 18 = 22 макета), ореол 220 по центру; число 76/76 800 −2 (сумма 58/62 800 −1,5), слово 14/18 700 +1, прозрачность ,8
  root: { width: DISC, height: DISC, marginBottom: 4 },
  halo: { position: 'absolute', left: -HALO, top: -HALO, width: BOX, height: BOX },
  disc: { ...StyleSheet.absoluteFillObject, borderRadius: DISC_R, alignItems: 'center', justifyContent: 'center' },
  place: { fontSize: 76, lineHeight: 76, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  amount: { fontSize: 58, lineHeight: 62, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  word: { fontSize: 14, lineHeight: 18, fontWeight: '700', letterSpacing: 1, opacity: 0.8 },
});
