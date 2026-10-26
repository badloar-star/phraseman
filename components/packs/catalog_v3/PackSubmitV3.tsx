// ═══════════════════════════════════════════════════════════════════════════
// PackSubmitV3.tsx — подача набора на «Сцене»: язык, название, карточки, проверка ИИ «что поправить» ПРЯМО НА КАРТОЧКЕ, «Опубликовать и участвовать».
//
// зачем (слово владельца через координатора 26.10: «подача набора: язык, карточки, проверка ИИ — „что поправить“ прямо на карточке, „Опубликовать и участвовать“»;
// «минимум кнопок, без мелких подписей»): один экран, одна закреплённая кнопка. Язык набора — одна стеклянная таблетка справа вверху. Проверка ИИ не отдельный экран:
// её итог — значок рядом с заголовком «Карточки» (идёт проверка / замечания с числом / всё хорошо), а замечание стоит под самой карточкой строкой «что поправить + Исправить» —
// тап по строке применяет правку (мгновенно, откат — у хозяина). Пока ИИ проверяет, кнопка приглушена; при замечаниях публикация остаётся доступной (решение автора) — вопрос владельцу.
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { SPIRE_SCENE_INK } from '../../spire/scene/spire_scene_palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import V2Pressable from '../../v2/V2Pressable';
import PackSceneFrameV3 from './PackSceneFrameV3';
import { packScreensText } from './packs_catalog_v3_screens_copy';
import type { PacksCatalogColors } from './packs_catalog_v3_tokens';

const TEXT_MAX_SCALE = 1.3;

export type PackSubmitCard = Readonly<{ front: string; back: string; /** Что поправить (подсказка ИИ); нет — карточка в порядке. */ fix?: string }>;
export type PackSubmitPhase = 'checking' | 'issues' | 'clean';

type Props = Readonly<{
  lang: Lang;
  colors: PacksCatalogColors;
  phase: PackSubmitPhase;
  /** Язык набора словами («Английский»). */
  languageName: string;
  name: string;
  cards: readonly PackSubmitCard[];
  topInset: number;
  bottomInset: number;
  onBack: () => void;
  onApplyFix: (index: number) => void;
  onPublish: () => void;
}>;

const GLASS = colorWithAlpha(SPIRE_SCENE_INK.text, 0.12);
const GLASS_SOFT = colorWithAlpha(SPIRE_SCENE_INK.text, 0.08);
const GLASS_FIX = colorWithAlpha(SPIRE_SCENE_INK.text, 0.18);

function PackSubmitV3({ lang, colors, phase, languageName, name, cards, topInset, bottomInset, onBack, onApplyFix, onPublish }: Props) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const issues = cards.filter((card) => !!card.fix).length;
  const langPill = (
    <View style={s.langPill} testID="packs-v3-submit-language">
      <Ionicons name="globe-outline" size={16} color={SPIRE_SCENE_INK.text} />
      <Text style={ts.pillText} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{languageName}</Text>
    </View>
  );
  return (
    <PackSceneFrameV3
      testID="packs-v3-submit"
      colors={colors}
      topInset={topInset}
      bottomInset={bottomInset}
      onBack={onBack}
      backLabel={packScreensText(lang, 'back')}
      trailing={langPill}
      cta={{ label: packScreensText(lang, 'publish'), onPress: onPublish, disabled: phase === 'checking', icon: 'trophy' }}
    >
      <Text style={ts.title} maxFontSizeMultiplier={TEXT_MAX_SCALE} accessibilityRole="header">{packScreensText(lang, 'submitTitle')}</Text>
      <View style={s.field} testID="packs-v3-submit-name">
        <Text style={ts.fieldText} numberOfLines={2} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{name}</Text>
      </View>

      <View style={s.listHead}>
        <Text style={ts.listTitle} maxFontSizeMultiplier={TEXT_MAX_SCALE} accessibilityRole="header">{packScreensText(lang, 'cards')}</Text>
        <View style={s.status} testID="packs-v3-submit-status" accessibilityLabel={phase}>
          {phase === 'checking' ? <ActivityIndicator size="small" color={SPIRE_SCENE_INK.text} /> : null}
          {phase === 'issues' ? <Ionicons name="sparkles" size={16} color={SPIRE_SCENE_INK.text} /> : null}
          {phase === 'clean' ? <Ionicons name="checkmark-circle" size={18} color={SPIRE_SCENE_INK.text} /> : null}
          <Text style={ts.pillText} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{phase === 'checking' ? packScreensText(lang, 'aiChecking') : phase === 'issues' ? String(issues) : String(cards.length)}</Text>
        </View>
      </View>

      <View style={s.list}>
        {cards.map((card, i) => (
          <View key={`${i}-${card.front}`} style={[s.card, phase === 'checking' ? s.cardChecking : null]} testID={`packs-v3-submit-card-${i}`}>
            <Text style={ts.front} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{card.front}</Text>
            <Text style={ts.back} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{card.back}</Text>
            {phase === 'issues' && card.fix ? (
              <V2Pressable
                testID={`packs-v3-submit-fix-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`${packScreensText(lang, 'aiApply')}: ${card.fix}`}
                withHaptic={false}
                scaleTo={0.97}
                onPress={() => onApplyFix(i)}
                style={s.fix}
              >
                <Ionicons name="sparkles" size={16} color={SPIRE_SCENE_INK.text} />
                <Text style={[ts.fixText, s.fixGrow]} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{card.fix}</Text>
                <Text style={ts.fixAction} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{packScreensText(lang, 'aiApply')}</Text>
              </V2Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </PackSceneFrameV3>
  );
}

export default memo(PackSubmitV3);

const s = StyleSheet.create({
  title: { marginTop: 16, fontSize: 26, lineHeight: 32, fontWeight: '800', color: SPIRE_SCENE_INK.text, letterSpacing: -0.3 },
  langPill: { minHeight: 44, maxWidth: 200, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GLASS },
  pillText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  field: { marginTop: 14, minHeight: 56, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', backgroundColor: GLASS },
  fieldText: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  listHead: { marginTop: 24, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  status: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GLASS },
  list: { marginTop: 8, gap: 8 },
  card: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: GLASS },
  cardChecking: { backgroundColor: GLASS_SOFT },
  front: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  back: { marginTop: 2, fontSize: 13, lineHeight: 18, color: SPIRE_SCENE_INK.muted }, // guard-ok: перевод карточки — данные набора
  fix: { marginTop: 10, minHeight: 44, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: GLASS_FIX },
  fixGrow: { flex: 1 },
  fixText: { fontSize: 13, lineHeight: 18, color: SPIRE_SCENE_INK.text },
  fixAction: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: SPIRE_SCENE_INK.text },
});
