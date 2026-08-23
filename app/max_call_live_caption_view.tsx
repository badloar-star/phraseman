import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Text, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../components/ThemeContext';
import { FlowText } from '../components/text-integrity/FlowText';
import { triLang, type Lang } from '../constants/i18n';

type Props = {
  /** Уже прозвучавшая часть текущей реплики — подсвечивается акцентом. */
  visibleAssistantText: string;
  /** Вся реплика целиком (включая ещё не прозвучавший хвост). */
  fullAssistantText?: string;
  completedAssistantText: string;
  /**
   * Последняя распознанная реплика ученика.
   *
   * зачем (владелец 2026-08-23): «надо чтобы у него был такт субтитров и чтобы
   * видно было что я говорю». Раньше строка показывала ТОЛЬКО речь MAX — своих
   * слов ученик не видел вовсе и не понимал, расслышали ли его.
   */
  userText?: string;
  /** Ученик говорит прямо сейчас — показываем это ожиданием, а не пустотой. */
  userSpeaking?: boolean;
  lang: Lang;
};

/**
 * Хвост реплики, если она длиннее читаемого окна.
 *
 * зачем окно вообще: субтитры не должны превращаться в растущую ленту, которую
 * невозможно догнать глазами. Но окно считается по ВСЕЙ реплике, а не по уже
 * сказанному — иначе текст уезжает влево на каждом новом куске (жалоба
 * владельца 2026-08-23: «реплики так быстро скроллятся, что не успеть ничего»).
 */
export function captionRailTail(text: string, wordLimit = 10): string {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (words.length <= wordLimit) return text.trim();
  return `… ${words.slice(-wordLimit).join(' ')}`;
}

/**
 * Делит показанную строку на «уже сказано» и «ещё прозвучит».
 *
 * зачем (владелец 2026-08-23): вместо уезжающего окна человек видит фразу
 * целиком, а акцентным цветом подсвечено то, что MAX произносит сейчас —
 * глаз держит контекст и успевает читать.
 */
export function splitSpokenTail(rail: string, spokenText: string): { spoken: string; ahead: string } {
  const spokenWords = spokenText.trim().split(/\s+/u).filter(Boolean);
  if (spokenWords.length === 0) return { spoken: '', ahead: rail };
  const lastSpoken = spokenWords[spokenWords.length - 1];
  // Ищем конец последнего произнесённого слова в показанной строке: сравнение
  // по словам, а не по длине — начало строки могло быть срезано многоточием.
  const index = rail.lastIndexOf(lastSpoken);
  if (index < 0) return { spoken: rail, ahead: '' };
  const boundary = index + lastSpoken.length;
  return { spoken: rail.slice(0, boundary), ahead: rail.slice(boundary) };
}

export function MaxCallLiveCaptionView({
  visibleAssistantText,
  fullAssistantText,
  completedAssistantText,
  userText = '',
  userSpeaking = false,
  lang,
}: Props) {
  const { theme: t, f } = useTheme();
  const { fontScale } = useWindowDimensions();
  // Окно шире прежнего: показываем реплику, а не последние пять слов. При
  // крупном системном шрифте сужаем, чтобы текст не выпирал за пределы блока.
  const wordLimit = fontScale >= 1.6 ? 12 : fontScale >= 1.3 ? 16 : 22;
  const source = (fullAssistantText ?? '').trim() !== '' ? fullAssistantText! : visibleAssistantText;
  const rail = captionRailTail(source, wordLimit);
  const { spoken, ahead } = splitSpokenTail(rail, visibleAssistantText);
  // Свою реплику держим короче, чем реплику учителя: она нужна как
  // подтверждение «тебя услышали вот так», а не как второй экран текста.
  const userRail = captionRailTail(userText, Math.max(6, Math.round(wordLimit * 0.6)));
  const youLabel = triLang(lang, {
    ru: 'ВЫ', uk: 'ВИ', es: 'TÚ', 'pt-BR': 'VOCÊ',
    vi: 'BẠN', id: 'ANDA', tr: 'SEN', pl: 'TY',
  });
  const announcedRef = useRef('');

  useEffect(() => {
    const value = completedAssistantText.trim();
    if (!value || announcedRef.current === value) return;
    announcedRef.current = value;
    void AccessibilityInfo.announceForAccessibility(`MAX: ${value}`);
  }, [completedAssistantText]);

  return (
    <>
      <View
        testID="max-call-live-caption"
        accessible={false}
        style={{ minHeight: 132, marginHorizontal: 22, marginBottom: 8, justifyContent: 'center' }}
      >
        {/* Реплика ученика — над репликой учителя, тоном тише и прижата вправо:
            две стороны читаются как диалог, без рамок и подложек. */}
        {userRail !== '' || userSpeaking ? (
          <View style={{ alignSelf: 'flex-end', maxWidth: '92%', marginBottom: rail !== '' ? 12 : 0 }}>
            <Text
              style={{ color: t.textMuted, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8, textAlign: 'right' }}
              maxFontSizeMultiplier={2}
            >
              {youLabel}
            </Text>
            <Text
              testID="max-call-live-caption-user-text"
              maxFontSizeMultiplier={2}
              style={{
                color: userRail !== '' ? t.textSecond : t.textGhost,
                fontSize: f.body,
                fontWeight: '700',
                lineHeight: Math.round(f.body * 1.35),
                marginTop: 4,
                textAlign: 'right',
              }}
            >
              {userRail !== '' ? userRail : '…'}
            </Text>
          </View>
        ) : null}
        {rail !== '' ? (
          <>
          <Text
            style={{ color: t.accent, fontSize: f.label, fontWeight: '900', letterSpacing: 0.8 }}
            maxFontSizeMultiplier={2}
          >
            MAX
          </Text>
          <FlowText
            testID="max-call-live-caption-text"
            provenance="external"
            integrityText={rail}
            maxFontSizeMultiplier={2}
            style={{
              // Базовый цвет — «ещё не прозвучало»: тон тише, чем у сказанного,
              // разделяем тоном, без рамок и подложек.
              color: t.textSecond,
              fontSize: f.bodyLg,
              fontWeight: '800',
              lineHeight: Math.round(f.bodyLg * 1.35),
              marginTop: 6,
            }}
          >
            {spoken !== '' ? (
              <Text testID="max-call-caption-spoken" style={{ color: t.textPrimary }}>{spoken}</Text>
            ) : null}
            {ahead}
          </FlowText>
          </>
        ) : null}
      </View>
    </>
  );
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function MaxCallLiveCaptionRouteShim() { return null; }
