import React, { memo } from 'react';
import { Text, View } from 'react-native';
import type { Theme } from '../../constants/theme';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';

/**
 * Шапка коллекции: заголовок + счётчик «N / 50» + полоса заполнения
 * (макет flashcards-screens.html, экран B1, блоки `.col-head` / `.col-bar`).
 *
 * зачем (аудит §2.2): лимит бесплатных карточек раньше был НЕВИДИМ до упора —
 * юзер спокойно сохранял карточки и внезапно получал стену пейвола на 21-й.
 * Макет требует показывать «12 / 50» ЗАРАНЕЕ: остаток виден с первого захода,
 * упор перестаёт быть неожиданностью.
 *
 * Счётчик tabular-nums (цифры не пляшут), полоса 24% при 12/50.
 * Цвет полосы меняется на подходе к лимиту — предупреждение тоном, без
 * навязчивого текста-подписи (подписи под заголовком запрещены).
 * Обводок нет (§0.D) — разделение тоном подложки.
 */

// зачем (НАЙДЕНО АУДИТОМ 2026-07-25): лимит был объявлен ЗДЕСЬ ЖЕ отдельной
// константой, дублируя FREE_FLASHCARD_LIMIT из hooks/use-flashcards.ts — того
// самого места, где гейт реально отказывает в сохранении. Лимит утверждён как 50.
// Берём единый источник истины.
import { FREE_FLASHCARD_LIMIT } from '../../hooks/use-flashcards';

export { FREE_FLASHCARD_LIMIT };

interface CollectionLimitHeaderProps {
  /** Сколько своих карточек сохранено. */
  saved: number;
  /** У Plus лимита нет — блок не рисуется вовсе. */
  isPremium: boolean;
  t: Theme;
}

function CollectionLimitHeaderBase({ saved, isPremium, t }: CollectionLimitHeaderProps) {
  const { lang } = useLang();
  // У Plus лимита нет — не занимаем место и не пугаем счётчиком.
  if (isPremium) return null;

  const ratio = Math.max(0, Math.min(1, saved / FREE_FLASHCARD_LIMIT));
  // Тон предупреждения: спокойный → жёлтый с 75% → красный на упоре.
  const barColor = ratio >= 1 ? t.wrong : ratio >= 0.75 ? t.gold : t.accent;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
      {/* Только счётчик, без подписи-расшифровки: «12 / 50» рядом с полосой
          читается однозначно, пояснять словами нечего. */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 7 }}>
        <Text
          accessibilityLabel={triLang(lang, {
            ru: `Сохранено: ${saved} / ${FREE_FLASHCARD_LIMIT}`,
            uk: `Збережено: ${saved} / ${FREE_FLASHCARD_LIMIT}`,
            en: `Saved: ${saved} / ${FREE_FLASHCARD_LIMIT}`,
            es: `Guardadas: ${saved} / ${FREE_FLASHCARD_LIMIT}`,
            'pt-BR': `Salvas: ${saved} / ${FREE_FLASHCARD_LIMIT}`,
            vi: `Đã lưu: ${saved} / ${FREE_FLASHCARD_LIMIT}`,
            id: `Tersimpan: ${saved} / ${FREE_FLASHCARD_LIMIT}`,
            tr: `Kaydedilenler: ${saved} / ${FREE_FLASHCARD_LIMIT}`,
            pl: `Zapisane: ${saved} / ${FREE_FLASHCARD_LIMIT}`,
          })}
          style={{
            color: ratio >= 1 ? t.wrong : t.textSecond,
            fontSize: 14,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
          }}
        >
          {saved} / {FREE_FLASHCARD_LIMIT}
        </Text>
      </View>
      {/* Полоса заполнения: та же информация формой, а не только цифрой —
          остаток виден боковым зрением, без чтения. */}
      <View style={{ height: 4, borderRadius: 999, backgroundColor: t.bgSurface, overflow: 'hidden' }}>
        <View
          style={{
            width: `${ratio * 100}%`,
            height: '100%',
            borderRadius: 999,
            backgroundColor: barColor,
          }}
        />
      </View>
    </View>
  );
}

export default memo(CollectionLimitHeaderBase);
