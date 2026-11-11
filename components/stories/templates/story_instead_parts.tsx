// ═══════════════════════════════════════════════════════════════════════════
// story_instead_parts.tsx — общие детали кадров «истории вместо окон»: знак в круге, строки с отметкой или замком,
// большой знак Plus (горит / погас), реплики.
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»; макет
// docs/design/v2-app/stories-instead-of-modals.html): размеры и задержки — из CSS и `render()` макета:
// .icn 124, фон accent·18 %, значок 58 (accentBright, в светлом — accent), свечение 0 0 70 −14;
// .list.rws: строки как у «Ошибки разобраны» (frames_cards), отступ сверху 18, строка входит в d0 + 90·i, отметка — ещё через 260 мс;
// .pmark.inl.pbig 112 (значок 50); погасший — заливка текст·16 %, значок вторичным цветом, без свечения.
// ФАЙЛ ПОКА НИКЕМ НЕ ПОДКЛЮЧЁН — см. frames_instead_a.tsx.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Polygon } from 'react-native-svg';
import { PlusMark } from './frames_plus';
import { Enter } from './story_template_motion';
import { CheckFill } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryBubble } from './story_template_registry';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** .icn — знак в круге цвета темы; появляется пружиной на 120 мс. */
export const IconDisc = memo(function IconDisc({ icon, d = 120 }: Readonly<{ icon: IconName; d?: number }>) {
  const pal = useStoryTemplatePalette();
  return (
    <Enter kind="pop" d={d}>
      <View style={[s.icn, { backgroundColor: mix(pal.accG, 0.18), boxShadow: `0 0 70px -14px ${pal.accGlow}` }]}>
        <Ionicons name={icon} size={58} color={pal.isLight ? pal.accG : pal.accB} style={s.icnGlyph} />
      </View>
    </Enter>
  );
});

/** Строки возможностей: `locked` — отметка-замок (возможность закрыта), иначе галочка в акценте. */
export const PerkRows = memo(function PerkRows({ items, locked = false, d0 }: Readonly<{ items: readonly string[]; locked?: boolean; d0: number }>) {
  const pal = useStoryTemplatePalette();
  return (
    <View style={s.list}>
      {items.map((text, i) => {
        const d = d0 + i * 90;
        return (
          <Enter key={`r${i}:${text}`} d={d} style={[s.row, { backgroundColor: mix(pal.tx, 0.09) }]}>
            <Text style={[s.rowText, { color: pal.tx }]} numberOfLines={1}>{text}</Text>
            <View style={[s.ck, { backgroundColor: mix(pal.tx, 0.14) }]}>
              <CheckFill d={d + 260}>
                <View style={[s.ckOn, { backgroundColor: locked ? mix(pal.tx, 0.22) : pal.accG }]}>
                  <Ionicons name={locked ? 'lock-closed' : 'checkmark'} size={15} color={locked ? pal.tx : pal.accInk} style={s.ckIcon} />
                </View>
              </CheckFill>
            </View>
          </Enter>
        );
      })}
    </View>
  );
});

/** Шестиугольник макета (.pmark i) в поле 100 × 100 — тот же, что у знака Plus. */
const HEX_POINTS = '50,0 93,25 93,75 50,100 7,75 7,25';

/** Большой знак Plus 112: горит (градиент уровня) или погас (Plus закончился). */
export const BigPlusMark = memo(function BigPlusMark({ off = false, id, d = 160 }: Readonly<{ off?: boolean; id: string; d?: number }>) {
  const pal = useStoryTemplatePalette();
  return (
    <Enter kind="pop" d={d}>
      {off ? (
        <View style={s.bigMark}>
          <Svg width={112} height={112} viewBox="0 0 100 100"><Polygon points={HEX_POINTS} fill={mix(pal.tx, 0.16)} /></Svg>
          <Text style={[s.bigGlyph, { color: pal.sec }]}>✦</Text>
        </View>
      ) : <PlusMark id={id} size={112} />}
    </Enter>
  );
});

/** Реплики диалога: как у кадра «Диалог пройден» (.bubs), `wide` — одна реплика на всю ширину (личное сообщение). */
export const Bubbles = memo(function Bubbles({ bubbles, d0 = 200, step = 400, wide = false }: Readonly<{ bubbles: readonly StoryBubble[]; d0?: number; step?: number; wide?: boolean }>) {
  const pal = useStoryTemplatePalette();
  return (
    <View style={s.bubs}>
      {bubbles.map((b, i) => (
        <Enter key={`b${i}:${b.text}`} d={d0 + i * step} style={[s.bub, wide ? s.bubWide : null, b.me ? [s.bubMe, { backgroundColor: pal.accG }] : [s.bubThem, { backgroundColor: mix(pal.tx, 0.11) }]]}>
          <Text style={[s.bubText, { color: b.me ? pal.accInk : pal.tx }]}>{b.text}</Text>
        </Enter>
      ))}
    </View>
  );
});

const s = StyleSheet.create({
  icn: { width: 124, height: 124, borderRadius: 62, alignItems: 'center', justifyContent: 'center' },
  icnGlyph: { lineHeight: 58 },
  // .list.rws: до 300, зазор 8, отступ сверху 18; строка: зазор 12, поля 10 12 10 14, радиус 14, 15/20
  list: { width: '100%', maxWidth: 300, gap: 8, marginTop: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, paddingBottom: 10, paddingRight: 12, paddingLeft: 14, borderRadius: 14 },
  rowText: { flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20, textAlign: 'left' },
  ck: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden' },
  ckOn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ckIcon: { lineHeight: 15 },
  bigMark: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  bigGlyph: { position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', fontWeight: '700', fontSize: 50, lineHeight: 112 },
  // .bubs: до 300, зазор 8, отступ снизу 20; реплика до 82 %, поля 10 14, радиус 18 (угол у говорящего 6), 15/20
  bubs: { width: '100%', maxWidth: 300, gap: 8, marginBottom: 20 },
  bub: { maxWidth: '82%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubWide: { maxWidth: '100%' },
  bubThem: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubMe: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  bubText: { fontSize: 15, lineHeight: 20, textAlign: 'left' },
});
