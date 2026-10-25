// ═══════════════════════════════════════════════════════════════════════════
// IntroRoleText.tsx — текст вступления и «Скажи так» в цветах ролей: английский / частица с подложкой / перевод / формула.
//
// зачем (владелец 25.10 утвердил «МАКСИМУМ И ПОДЛОЖКА»): частица — оттенок темы с «Максимума» на подложке accentSoft, жирная;
// английский — langText жирный; русский — gloss; «+ →» — mutedText. Цвета ролей — только из активной темы (introTextRolesForTokens),
// разбор строки — splitIntroTextRoles (кэш по строке). Вложенные Text внутри родительского абзаца: перенос строк общий.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { Text } from 'react-native';
import { splitIntroTextRoles, type IntroTextRole } from '../../app/learning_v2_intro_text_roles';
import { introTextRolesForTokens } from '../../constants/liquidGlassIntroTextRoles';
import { useTheme } from '../ThemeContext';
import type { Lv2Glass } from './LearningV2Glass';

type Look = Readonly<{ color: string; fontWeight: '400' | '700'; backgroundColor?: string }>;

function IntroRoleText({ text, glass, particles = true, testID }: Readonly<{ text: string; glass: Lv2Glass; particles?: boolean; testID?: string }>) {
  const { liquidGlassThemeId } = useTheme();
  const roles = introTextRolesForTokens(liquidGlassThemeId, glass);
  const segments = splitIntroTextRoles(text);
  const looks = useMemo<Readonly<Record<IntroTextRole, Look>>>(() => ({
    lang: { color: roles.langText, fontWeight: '700' },
    // «Проверь себя» и подобные места — без подсветки частиц: частица там просто английское слово
    particle: particles ? { color: roles.particle, fontWeight: '700', backgroundColor: glass.accentSoft } : { color: roles.langText, fontWeight: '700' },
    gloss: { color: roles.gloss, fontWeight: '400' },
    formula: { color: glass.mutedText, fontWeight: '700' },
    plain: { color: roles.gloss, fontWeight: '400' },
  }), [roles, particles, glass.accentSoft, glass.mutedText]);
  return (
    <>
      {segments.map((seg, i) => (
        <Text key={i /* guard-ok: сегменты строки неизменны для одного текста */} testID={testID ? `${testID}-${seg.role}-${i}` : undefined} style={looks[seg.role]}>{seg.text}</Text>
      ))}
    </>
  );
}

export default memo(IntroRoleText);
