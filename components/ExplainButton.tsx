/**
 * ExplainButton — маленький переиспользуемый триггер шторки «Объясни как для 5-летнего».
 *
 * Флаг-гейт: если isExplainEnabled() === false — рендерим null (фича полностью скрыта,
 * это и есть когортный rollout; клиент НИКОГДА не решает качество — флаг лишь
 * показывает/прячет кнопку). Когда включено — по тапу открывает ExplainSheet для
 * {phraseEn, phraseMeaning, lang}.
 *
 * Проп называется phraseMeaning (НЕ phraseRu): это родной перевод/смысл фразы на
 * языке поверхности (например phrase.meaning), который сервер использует для fallback.
 *
 * Аналитика: explain_button_shown при показе, explain_sheet_opened по тапу.
 */
import React, { memo, useEffect, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { trackEvent } from '../app/analytics';
import { isExplainEnabled } from '../app/explain_phrase_flags';
import { asLang } from '../app/explain_phrase_request';
import ExplainSheet from './ExplainSheet';

interface Props {
  /** Английская фраза, как показана пользователю. */
  phraseEn: string;
  /** Родной перевод/смысл фразы (phrase.meaning), НЕ «phraseRu». */
  phraseMeaning: string;
  /** Язык интерфейса пользователя. */
  lang: string;
  /** Доп. стиль для контейнера кнопки (выравнивание под поверхность). */
  style?: object;
}

function ExplainButton({ phraseEn, phraseMeaning, lang, style }: Props) {
  const enabled = isExplainEnabled();
  const { theme: t, f } = useTheme();
  const { lang: ctxLang } = useLang();
  const effLang = lang || ctxLang;
  const uiLang = asLang(effLang);
  const [open, setOpen] = useState(false);

  // Показ кнопки = единица спроса (для adoption/cohort-метрик README).
  useEffect(() => {
    if (!enabled) return;
    void trackEvent('explain_button_shown', { lang: effLang });
  }, [enabled, effLang]);

  // Флаг OFF → фича полностью скрыта.
  if (!enabled) return null;

  const handleOpen = () => {
    hapticTap();
    void trackEvent('explain_sheet_opened', { lang: effLang });
    setOpen(true);
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.8}
        style={[styles.trigger, { backgroundColor: t.bgSurface2, borderColor: t.border }, style]}
        accessibilityRole="button"
        accessibilityLabel={triLang(uiLang, {
          ru: 'Объяснить простыми словами',
          uk: 'Пояснити простими словами',
          es: 'Explicar en palabras simples',
          'pt-BR': 'Explicar em palavras simples',
          vi: 'Giải thích bằng lời đơn giản',
          id: 'Jelaskan dengan kata sederhana',
          tr: 'Basit kelimelerle açıkla',
          pl: 'Wyjaśnij prościej',
        })}
      >
        <Ionicons name="bulb-outline" size={18} color={t.accent} />
        <Text style={[styles.label, { color: t.textPrimary, fontSize: f.sub }]} numberOfLines={1}>
          {triLang(uiLang, {
            ru: 'Объяснить просто',
            uk: 'Пояснити просто',
            es: 'Explicar simple',
            'pt-BR': 'Explicar simples',
            vi: 'Giải thích đơn giản',
            id: 'Jelaskan sederhana',
            tr: 'Basitçe açıkla',
            pl: 'Wyjaśnij prosto',
          })}
        </Text>
      </TouchableOpacity>

      <ExplainSheet
        visible={open}
        onClose={() => setOpen(false)}
        phraseEn={phraseEn}
        phraseMeaning={phraseMeaning}
        lang={effLang}
      />
    </>
  );
}

export default memo(ExplainButton);

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 0,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  label: {
    fontWeight: '800',
  },
});
