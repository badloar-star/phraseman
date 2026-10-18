/**
 * DialogPhraseReview — полный разбор реплик ученика после диалога + оценка.
 *
 * зачем (владелец 2026-09-14): «разбор фраз полноценный должен быть каждой
 * фразы, фулл разбор ошибок и всего вообще» и «обязательно надо чтобы оценка
 * диалога была». Раньше показывались только ошибки (corrections), а верные
 * реплики исчезали — человек не видел, что он сказал хорошо.
 *
 * Free видит первую фразу целиком, остальные под вуалью с одной кнопкой Plus
 * (владелец: «1 только фраза фри, остальные плюс да»). Обрезку делает СЕРВЕР
 * (premium_dialog_review.ts) — сюда приходит уже урезанный список, клиент лишь
 * рисует замок. Это защищает от снятия замка правкой клиента.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural'; // зачем (проход по склейке «число + слово», 12.10): число и существительное согласуются через общий помощник
import type { PremiumDialogReviewPhrase } from '../../app/ai_dialog_client';

interface DialogPhraseReviewProps {
  lang: Lang;
  phrases: PremiumDialogReviewPhrase[];
  /** Сколько фраз сервер скрыл за Plus (0 — скрытых нет). */
  lockedCount: number;
  onOpenPlus: () => void;
  testID?: string;
}

/** Цвет и значок по виду разбора: верно · естественнее · ошибка. */
function kindVisual(kind: PremiumDialogReviewPhrase['kind'], t: ReturnType<typeof useTheme>['theme']) {
  if (kind === 'fix') return { icon: 'create-outline' as const, color: t.accentText };
  if (kind === 'polish') return { icon: 'sparkles-outline' as const, color: t.accentText };
  return { icon: 'checkmark-circle' as const, color: t.correct };
}

export default function DialogPhraseReview({
  lang,
  phrases,
  lockedCount,
  onOpenPlus,
  testID,
}: DialogPhraseReviewProps) {
  const { theme: t, f } = useTheme();
  if (phrases.length === 0 && lockedCount <= 0) return null;

  return (
    <View testID={testID}>
      {phrases.map((phrase, index) => {
        const visual = kindVisual(phrase.kind, t);
        // Верную реплику НЕ зачёркиваем: зачёркнутая правильная фраза читается
        // как ошибка и обесценивает похвалу.
        const changed = phrase.kind !== 'ok' && phrase.corrected !== phrase.original;
        return (
          <View
            key={`${index}:${phrase.original}`}
            style={[styles.item, index > 0 && { marginTop: 14 }]}
          >
            <View style={styles.head}>
              <Ionicons name={visual.icon} size={16} color={visual.color} />
              <Text
                style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flex: 1 }}
                maxFontSizeMultiplier={1.2}
              >
                {changed ? phrase.corrected : phrase.original}
              </Text>
            </View>
            {changed ? (
              <Text
                style={{
                  color: t.textMuted,
                  fontSize: f.sub,
                  marginTop: 3,
                  marginLeft: 23,
                  textDecorationLine: 'line-through',
                }}
                maxFontSizeMultiplier={1.2}
              >
                {phrase.original}
              </Text>
            ) : null}
            {phrase.note ? (
              <Text
                style={{
                  color: t.accentText,
                  fontSize: f.sub,
                  marginTop: 4,
                  marginLeft: 23,
                  lineHeight: Math.round(f.sub * 1.42),
                }}
                maxFontSizeMultiplier={1.2}
              >
                {phrase.note}
              </Text>
            ) : null}
          </View>
        );
      })}

      {lockedCount > 0 ? (
        <Pressable
          onPress={() => {
            hapticTap();
            onOpenPlus();
          }}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            ru: `Открыть разбор ещё\u00A0${lockedCount} ${pluralWord('ru', lockedCount, { one: 'фразы', few: 'фраз', many: 'фраз' })} в Plus`,
            uk: `Відкрити розбір ще\u00A0${lockedCount} ${pluralWord('uk', lockedCount, { one: 'фрази', few: 'фраз', many: 'фраз' })} у Plus`,
            en: `Unlock\u00A0${lockedCount}\u00A0more ${pluralWord('en', lockedCount, { one: 'phrase', few: 'phrases', many: 'phrases' })} in Plus`,
            es: `Desbloquear\u00A0${lockedCount} ${pluralWord('es', lockedCount, { one: 'frase', few: 'frases', many: 'frases' })} más en Plus`,
            'pt-BR': `Desbloquear mais\u00A0${lockedCount} ${pluralWord('pt-BR', lockedCount, { one: 'frase', few: 'frases', many: 'frases' })} no Plus`,
            vi: `Mở thêm\u00A0${lockedCount}\u00A0câu trong Plus`,
            id: `Buka\u00A0${lockedCount}\u00A0kalimat lagi di Plus`,
            tr: `Plus ile\u00A0${lockedCount}\u00A0cümle daha aç`,
            pl: `Odblokuj jeszcze\u00A0${lockedCount} ${pluralWord('pl', lockedCount, { one: 'zdanie', few: 'zdania', many: 'zdań' })} w Plus`,
          })}
          style={({ pressed }) => [
            styles.locked,
            { backgroundColor: t.goldBg, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          testID={testID ? `${testID}-locked` : undefined}
        >
          <Ionicons name="sparkles" size={18} color={t.accentText} />
          <Text
            style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', flex: 1 }}
            maxFontSizeMultiplier={1.2}
          >
            {triLang(lang, {
              ru: `Ещё\u00A0${lockedCount} ${pluralWord('ru', lockedCount, { one: 'фраза', few: 'фразы', many: 'фраз' })} в Plus`,
              uk: `Ще\u00A0${lockedCount} ${pluralWord('uk', lockedCount, { one: 'фраза', few: 'фрази', many: 'фраз' })} у Plus`,
              en: `${lockedCount}\u00A0more ${pluralWord('en', lockedCount, { one: 'phrase', few: 'phrases', many: 'phrases' })} in Plus`,
              es: `${lockedCount} ${pluralWord('es', lockedCount, { one: 'frase', few: 'frases', many: 'frases' })} más en Plus`,
              'pt-BR': `Mais\u00A0${lockedCount} ${pluralWord('pt-BR', lockedCount, { one: 'frase', few: 'frases', many: 'frases' })} no Plus`,
              vi: `Thêm\u00A0${lockedCount}\u00A0câu trong Plus`,
              id: `${lockedCount}\u00A0kalimat lagi di Plus`,
              tr: `Plus’ta\u00A0${lockedCount}\u00A0cümle daha`,
              pl: `Jeszcze\u00A0${lockedCount} ${pluralWord('pl', lockedCount, { one: 'zdanie', few: 'zdania', many: 'zdań' })} w Plus`,
            })}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={t.accentText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {},
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 52,
    marginTop: 14,
  },
});
