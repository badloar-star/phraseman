/**
 * Блок навыков на визитке: звезда с подписями лучей и шесть строк «название — полоска — уровень».
 * Эталон — утверждённый макет docs/design/v2-app/elevate-real4.js (функция `card`, `.pskills`) и его стили
 * в elevate-light.css (`.pcd .starbox`, `.prows`, `.prow`, `.pbar`): звезда 190, подписи 11 на радиусе 1,28,
 * строки с шагом 7, колонки 92 · полоска · 24.
 *
 * зачем «глупый» блок: показывать его или нет, решает skillsBlockVisible (modules/skills/skill_visibility.ts) — сюда
 * приходят уже разрешённые уровни. Блок ничего не читает сам: первый кадр имеет конечную высоту, сети и диска здесь нет.
 * У чужого человека известны только уровни, поэтому доля внутри уровня (`ratios`) есть лишь на своей визитке.
 */
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ProfileCardLook } from '../../app/profile_card_styles';
import type { Lang } from '../../constants/i18n';
import { triLang } from '../../constants/i18n';
import { SKILL_NAME } from '../../modules/skills/skill_copy';
import { SKILL_IDS, type SkillId } from '../../modules/skills/skill_points_table';
import { skillAxisValue, type SkillLevels } from '../../modules/skills/skill_visibility';
import { useProfileCardArtInk } from '../profile-card/profile_card_art_ink';
import { colorWithAlpha } from '../v2/plateAlpha';
import SkillLevelBar from './SkillLevelBar';
import SkillsStar from './SkillsStar';
import { profileCardSkillAccent } from './profile_card_skill_accent';

const STAR_SIZE = 190;
const STAR_RADIUS_K = 0.36; // тот же радиус, что у SkillsStar (elevate-core.js, `geo`)
const LABEL_RADIUS_K = 1.28;
const LABEL_WIDTH = 84;
const LABEL_HEIGHT = 16;
const ROW_STAGGER_MS = 80;

type Props = Readonly<{
  look: ProfileCardLook;
  lang: Lang;
  levels: SkillLevels;
  /** Доля 0…1 внутри текущего уровня — только для своей визитки. */
  ratios?: Readonly<Partial<Record<SkillId, number>>>;
  starSize?: number;
  /** Задержка старта движения звезды и полосок (макет: звезда через 100 мс после появления карточки). */
  delayMs?: number;
  testID?: string;
}>;

function ProfileCardSkills({ look, lang, levels, ratios, starSize = STAR_SIZE, delayMs = 100, testID = 'profile-card-skills' }: Props) {
  // зачем (закон владельца 22.10): белое поверх арта визитки — mediaInk темы с плотностями макета, а не свои литералы
  const art = useProfileCardArtInk();
  const accent = profileCardSkillAccent(look);
  const paint = useMemo(() => ({
    grid: colorWithAlpha(art.ink, 0.18),
    axis: colorWithAlpha(art.ink, 0.12),
    track: colorWithAlpha(art.ink, 0.14),
    label: { color: colorWithAlpha(art.ink, 0.72) },
    name: { color: colorWithAlpha(art.ink, 0.75) },
    level: { color: art.ink },
    shapeFill: colorWithAlpha(accent, 0.28),
  }), [accent, art.ink]);

  const rows = useMemo(() => SKILL_IDS.map((id) => ({
    id,
    name: triLang(lang, SKILL_NAME[id]),
    level: levels[id],
    value: skillAxisValue(levels[id], ratios?.[id] ?? 0),
  })), [lang, levels, ratios]);
  const starValues = useMemo(() => rows.map((row) => row.value), [rows]);

  const labels = useMemo(() => {
    const c = starSize / 2;
    const r = starSize * STAR_RADIUS_K * LABEL_RADIUS_K;
    return rows.map((row, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / rows.length;
      return { id: row.id, name: row.name, left: c + Math.cos(a) * r - LABEL_WIDTH / 2, top: c + Math.sin(a) * r - LABEL_HEIGHT / 2 };
    });
  }, [rows, starSize]);

  const a11y = rows.map((row) => `${row.name} ${row.level}`).join(', ');

  return (
    <View testID={testID} style={styles.block} accessible accessibilityLabel={a11y}>
      <View style={[styles.starBox, { width: starSize, height: starSize }]} importantForAccessibility="no-hide-descendants">
        <SkillsStar
          size={starSize}
          values={starValues}
          delayMs={delayMs}
          gridColor={paint.grid}
          axisColor={paint.axis}
          shapeFill={paint.shapeFill}
          shapeStroke={accent}
        />
        {labels.map((label) => (
          <Text key={label.id} style={[styles.label, paint.label, { left: label.left, top: label.top }]}>{label.name}</Text>
        ))}
      </View>
      <View style={styles.rows} importantForAccessibility="no-hide-descendants">
        {rows.map((row, i) => (
          <View key={row.id} style={styles.row}>
            <Text style={[styles.name, paint.name]}>{row.name}</Text>
            <SkillLevelBar ratio={row.value} delayMs={delayMs + i * ROW_STAGGER_MS} trackColor={paint.track} fillColor={accent} />
            <Text testID={`${testID}-level-${row.id}`} style={[styles.level, paint.level]}>{row.level}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch' },
  // макет `.pcd .starbox`: отступ 20 сверху и 16 снизу, по центру
  starBox: { alignSelf: 'center', marginTop: 20, marginBottom: 16 },
  label: { position: 'absolute', width: LABEL_WIDTH, height: LABEL_HEIGHT, fontSize: 11, lineHeight: LABEL_HEIGHT, fontWeight: '600', textAlign: 'center' },
  rows: { gap: 7 },
  // макет `.prow`: колонки 92 · полоска · 24, шаг 10
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 20 },
  name: { width: 92, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  level: { width: 24, textAlign: 'right', fontSize: 15, lineHeight: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export default memo(ProfileCardSkills);
