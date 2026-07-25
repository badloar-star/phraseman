import React, { memo } from 'react';
import { Text, View } from 'react-native';
import type { Theme } from '../../constants/theme';

/**
 * Шапка коллекции: заголовок + счётчик «N / 20» + полоса заполнения
 * (макет flashcards-screens.html, экран B1, блоки `.col-head` / `.col-bar`).
 *
 * зачем (аудит §2.2): лимит бесплатных карточек раньше был НЕВИДИМ до упора —
 * юзер спокойно сохранял карточки и внезапно получал стену пейвола на 21-й.
 * Макет требует показывать «12 / 20» ЗАРАНЕЕ: остаток виден с первого захода,
 * упор перестаёт быть неожиданностью.
 *
 * Из макета: счётчик tabular-nums (цифры не пляшут), полоса 60% при 12/20.
 * Цвет полосы меняется на подходе к лимиту — предупреждение тоном, без
 * навязчивого текста-подписи (подписи под заголовком запрещены).
 * Обводок нет (§0.D) — разделение тоном подложки.
 */

/** Лимит карточек на бесплатном тарифе (зеркалит гейт в AddToFlashcard). */
export const FREE_FLASHCARD_LIMIT = 20;

interface CollectionLimitHeaderProps {
  /** Сколько своих карточек сохранено. */
  saved: number;
  /** У Plus лимита нет — блок не рисуется вовсе. */
  isPremium: boolean;
  t: Theme;
}

function CollectionLimitHeaderBase({ saved, isPremium, t }: CollectionLimitHeaderProps) {
  // У Plus лимита нет — не занимаем место и не пугаем счётчиком.
  if (isPremium) return null;

  const ratio = Math.max(0, Math.min(1, saved / FREE_FLASHCARD_LIMIT));
  // Тон предупреждения: спокойный → жёлтый с 15/20 → красный на упоре.
  // Пороги совпадают с «нуджем на 15/20» из хендофа (Шаг 2).
  const barColor = ratio >= 1 ? t.wrong : ratio >= 0.75 ? t.gold : t.accent;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
      {/* Только счётчик, без подписи-расшифровки: «12 / 20» рядом с полосой
          читается однозначно, пояснять словами нечего. */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 7 }}>
        <Text
          accessibilityLabel={`Сохранено ${saved} из ${FREE_FLASHCARD_LIMIT}`}
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
