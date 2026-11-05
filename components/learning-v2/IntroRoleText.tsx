// ═══════════════════════════════════════════════════════════════════════════
// IntroRoleText.tsx — текст вступления и «Скажи так» в цветах ролей: изучаемый язык одним цветом / перевод / формула.
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

type Look = Readonly<{ color: string; fontWeight: '400' | '700' }>;

function IntroRoleText({ text, glass, testID }: Readonly<{ text: string; glass: Lv2Glass; testID?: string }>) {
  const { liquidGlassThemeId } = useTheme();
  const roles = introTextRolesForTokens(liquidGlassThemeId, glass);
  const segments = splitIntroTextRoles(text);
  const looks = useMemo<Readonly<Record<IntroTextRole, Look>>>(() => ({
    // зачем (решение владельца 05.11): все слова изучаемого языка — один жирный цвет lang из оттенка темы; частицы и подложки нет
    lang: { color: roles.lang, fontWeight: '700' },
    gloss: { color: roles.gloss, fontWeight: '400' },
    formula: { color: glass.mutedText, fontWeight: '700' },
    plain: { color: roles.gloss, fontWeight: '400' },
  }), [roles, glass.mutedText]);
  return (
    <>
      {segments.map((seg, i) => (
        <Text key={i /* guard-ok: сегменты строки неизменны для одного текста */} testID={testID ? `${testID}-${seg.role}-${i}` : undefined} style={looks[seg.role]}>{seg.text}</Text>
      ))}
    </>
  );
}

export default memo(IntroRoleText);
